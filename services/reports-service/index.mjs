import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
  AdminCreateUserCommand,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

/* ------------------------------------------------------------------
 * Configuration (override via Lambda environment variables)
 * ------------------------------------------------------------------ */
const BUCKET_NAME = process.env.REPORTS_BUCKET || 'ltm-advisory-reports-223833501993';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_REGION = process.env.COGNITO_REGION || REGION;
const USER_POOL_ID = process.env.USER_POOL_ID || 'ap-south-1_91amN2bz4';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '4iiqcsgvsm0b4ngpps94ho4c67';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOL_ID}`;

// Bootstrap admins: comma-separated emails, set by amplify/config.ts ("none" or unset = Cognito admin group only).
// Members of the Cognito ADMIN_GROUP are always admins.
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(e => e && e !== 'none');
const ADMIN_GROUP = process.env.ADMIN_GROUP || 'Admin';

// Browser origins allowed to call this API (comma-separated). 'https://*.domain' allows sub-domains (branch previews).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://main.d199dq940iqyj2.amplifyapp.com,https://*.d199dq940iqyj2.amplifyapp.com')
  .split(',').map(o => o.trim()).filter(Boolean);

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://main.d199dq940iqyj2.amplifyapp.com';
const DOWNLOAD_URL_TTL_SECONDS = 900; // 15 minutes
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const REPORT_KEY_PATTERN = /^reports\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.pdf$/;

const ALL_ACCELERATORS = ['strategy-iq', 'modernization-iq', 'finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq', 'cost-iq', 'resilience-iq'];

const s3Client = new S3Client({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

/* ------------------------------------------------------------------
 * CORS
 * ------------------------------------------------------------------ */
function originAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => {
    if (allowed === origin) return true;
    if (allowed.startsWith('https://*.')) {
      const suffix = allowed.slice('https://*'.length); // ".domain"
      return origin.startsWith('https://') && origin.endsWith(suffix);
    }
    return false;
  });
}

function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Vary': 'Origin'
  };
  if (originAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/* ------------------------------------------------------------------
 * Cognito ID token verification (RS256 against the user pool JWKS)
 * ------------------------------------------------------------------ */
let jwksCache = null;
let jwksFetchedAt = 0;

async function getSigningKey(kid) {
  const stale = !jwksCache || (Date.now() - jwksFetchedAt) > 6 * 60 * 60 * 1000;
  if (stale || !jwksCache.find(k => k.kid === kid)) {
    const resp = await fetch(`${COGNITO_ISSUER}/.well-known/jwks.json`);
    if (!resp.ok) throw new Error(`JWKS fetch failed (${resp.status})`);
    jwksCache = (await resp.json()).keys || [];
    jwksFetchedAt = Date.now();
  }
  const jwk = jwksCache.find(k => k.kid === kid);
  if (!jwk) throw new Error('Unknown signing key');
  return createPublicKey({ key: jwk, format: 'jwk' });
}

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
}

export async function verifyIdToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeSegment(headerB64);
  if (header.alg !== 'RS256') throw new Error('Unsupported token algorithm');

  const key = await getSigningKey(header.kid);
  const valid = cryptoVerify('RSA-SHA256', Buffer.from(`${headerB64}.${payloadB64}`), key, Buffer.from(signatureB64, 'base64url'));
  if (!valid) throw new Error('Invalid token signature');

  const claims = decodeSegment(payloadB64);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== COGNITO_ISSUER) throw new Error('Invalid token issuer');
  if (claims.token_use !== 'id') throw new Error('ID token required');
  if (claims.aud !== COGNITO_CLIENT_ID) throw new Error('Invalid token audience');
  if (typeof claims.exp !== 'number' || claims.exp <= now) throw new Error('Token expired');
  if (!claims.email) throw new Error('Token has no email claim');
  return claims;
}

async function authenticate(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const claims = await verifyIdToken(match[1].trim());
    const email = String(claims.email).toLowerCase();
    const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
    return {
      email,
      sub: claims.sub,
      isAdmin: SUPER_ADMIN_EMAILS.includes(email) || groups.includes(ADMIN_GROUP)
    };
  } catch (err) {
    console.warn('[ReportsService] Token rejected:', err.message);
    return null;
  }
}

/* ------------------------------------------------------------------
 * Permissions
 * ------------------------------------------------------------------ */
function fullAccessPermissions() {
  const accelerators = {};
  ALL_ACCELERATORS.forEach(id => { accelerators[id] = { full: true, take: true, edit: true, archive: true }; });
  return {
    view: [...ALL_ACCELERATORS, 'reports'],
    edit: [...ALL_ACCELERATORS, 'reports'],
    take: [...ALL_ACCELERATORS],
    archive: [...ALL_ACCELERATORS, 'reports'],
    accelerators
  };
}

function emptyPermissions() {
  return { view: [], edit: [], take: [], archive: [], accelerators: {} };
}

async function getPermissionsConfig() {
  try {
    const resp = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'config/rbac-permissions.json'
    }));
    return JSON.parse(await resp.Body.transformToString());
  } catch (err) {
    return { users: {} };
  }
}

async function savePermissionsConfig(config) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: 'config/rbac-permissions.json',
    Body: Buffer.from(JSON.stringify(config, null, 2)),
    ContentType: 'application/json'
  }));
}

function resolveAccess(caller, permConfig) {
  if (caller.isAdmin) return { role: 'super_admin', permissions: fullAccessPermissions() };
  const custom = permConfig.users?.[caller.email] || {};
  return { role: custom.role || 'advisor_viewer', permissions: custom.permissions || emptyPermissions() };
}

function includesAny(list, ...values) {
  return Array.isArray(list) && values.some(v => list.includes(v));
}

function canAccessAccelerator(perms, acceleratorId) {
  const acc = perms.accelerators?.[acceleratorId];
  return !!(acc && (acc.full || acc.take || acc.edit)) ||
    includesAny(perms.take, acceleratorId, '*') ||
    includesAny(perms.view, acceleratorId, '*') ||
    includesAny(perms.edit, acceleratorId, '*');
}

function canViewReports(perms) {
  return includesAny(perms.view, 'reports', '*') || includesAny(perms.edit, 'reports', '*');
}

function canEditReports(perms) {
  return includesAny(perms.edit, 'reports', '*');
}

/* ------------------------------------------------------------------
 * Handler
 * ------------------------------------------------------------------ */
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = (event.rawPath || event.path || '').replace(/\/+$/, '');
  const CORS_HEADERS = corsHeaders(event);
  const reply = (statusCode, payload) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(payload) });

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  let body = {};
  if (event.body) {
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    } catch (e) {
      return reply(400, { ok: false, error: 'Request body must be valid JSON.' });
    }
  }

  // The unauthenticated admin password reset has been removed. Users reset their own
  // password through the Cognito "Forgot password" flow (emailed verification code).
  if (path.endsWith('/api/auth/reset-password')) {
    return reply(410, { ok: false, error: 'This endpoint has been removed. Use "Forgot password" on the sign-in screen.' });
  }

  // Every remaining route requires a valid Cognito ID token.
  const caller = await authenticate(event);
  if (!caller) {
    return reply(401, { ok: false, error: 'Authentication required. Please sign in again.' });
  }

  try {
    const permConfig = await getPermissionsConfig();
    const access = resolveAccess(caller, permConfig);

    // -------------------------------------------------------------
    // GET /api/me — the caller's own role and permissions
    // -------------------------------------------------------------
    if (method === 'GET' && path.endsWith('/api/me')) {
      return reply(200, { ok: true, email: caller.email, role: access.role, permissions: access.permissions });
    }

    // -------------------------------------------------------------
    // GET /api/users — list all users with roles (admin only)
    // -------------------------------------------------------------
    if (method === 'GET' && path.endsWith('/api/users')) {
      if (!caller.isAdmin) return reply(403, { ok: false, error: 'Only administrators can list users.' });

      const cognitoUsersResp = await cognitoClient.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 }));
      const users = (cognitoUsersResp.Users || []).map(u => {
        const emailAttr = (u.Attributes || []).find(a => a.Name === 'email');
        const nameAttr = (u.Attributes || []).find(a => a.Name === 'name');
        const email = (emailAttr ? emailAttr.Value : u.Username).toLowerCase();
        const isSuper = SUPER_ADMIN_EMAILS.includes(email);
        const custom = permConfig.users?.[email] || {};
        return {
          username: u.Username,
          email,
          name: custom.name || (nameAttr ? nameAttr.Value : email.split('@')[0]),
          status: u.UserStatus,
          enabled: u.Enabled,
          created: u.UserCreateDate,
          role: isSuper ? 'super_admin' : (custom.role || 'advisor_viewer'),
          permissions: isSuper ? fullAccessPermissions() : (custom.permissions || emptyPermissions())
        };
      });

      return reply(200, { ok: true, users, superAdminEmail: SUPER_ADMIN_EMAILS[0] });
    }

    // -------------------------------------------------------------
    // POST /api/users/create — create a Cognito user + RBAC entry (admin only)
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/users/create')) {
      if (!caller.isAdmin) return reply(403, { ok: false, error: 'Only administrators can provision new users.' });

      const { email, password, name, role, permissions } = body;
      if (!email || !password) return reply(400, { ok: false, error: 'Email and password are required.' });

      const cleanEmail = String(email).trim().toLowerCase();

      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cleanEmail,
        UserAttributes: [
          { Name: 'email', Value: cleanEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: name || cleanEmail }
        ],
        MessageAction: 'SUPPRESS'
      }));

      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: cleanEmail,
        Password: password,
        Permanent: true
      }));

      if (!permConfig.users) permConfig.users = {};
      permConfig.users[cleanEmail] = {
        role: role || 'advisor_viewer',
        name: name || cleanEmail,
        permissions: permissions || {
          view: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq'],
          edit: role === 'practice_finops'
            ? ['finops-value-case', 'finops-iq']
            : role === 'practice_sovereignty'
            ? ['sovereign-iq', 'posture-iq']
            : []
        },
        createdAt: new Date().toISOString(),
        createdBy: caller.email
      };
      await savePermissionsConfig(permConfig);

      return reply(200, {
        ok: true,
        message: `User ${cleanEmail} created successfully with role ${role || 'advisor_viewer'}.`,
        user: { email: cleanEmail, role: role || 'advisor_viewer', permissions: permConfig.users[cleanEmail].permissions }
      });
    }

    // -------------------------------------------------------------
    // POST /api/users/set-password — admin sets another user's password
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/users/set-password')) {
      if (!caller.isAdmin) {
        return reply(403, { ok: false, error: 'Only administrators can set passwords. Use "Forgot password" on the sign-in screen to reset your own.' });
      }

      const { email, newPassword } = body;
      if (!email || !newPassword) return reply(400, { ok: false, error: 'Email and newPassword are required.' });
      if (String(newPassword).length < 8) return reply(400, { ok: false, error: 'Password must be at least 8 characters long.' });

      const cleanEmail = String(email).trim().toLowerCase();
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: cleanEmail,
        Password: newPassword,
        Permanent: true
      }));

      return reply(200, {
        ok: true,
        message: `Password updated successfully for ${cleanEmail}`,
        resetLink: `${APP_BASE_URL}/?portal_user=${encodeURIComponent(cleanEmail)}`,
        email: cleanEmail
      });
    }

    // -------------------------------------------------------------
    // POST /api/users/permissions — update a user's role and access (admin only)
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/users/permissions')) {
      if (!caller.isAdmin) return reply(403, { ok: false, error: 'Only administrators can update user permissions.' });

      const { email, role, permissions } = body;
      if (!email || !permissions) return reply(400, { ok: false, error: 'Email and permissions are required.' });

      const cleanEmail = String(email).trim().toLowerCase();
      if (!permConfig.users) permConfig.users = {};
      permConfig.users[cleanEmail] = {
        ...(permConfig.users[cleanEmail] || {}),
        role: role || permConfig.users[cleanEmail]?.role || 'custom',
        permissions,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.email
      };
      await savePermissionsConfig(permConfig);

      return reply(200, {
        ok: true,
        message: `Permissions updated for ${cleanEmail}`,
        permissions: permConfig.users[cleanEmail].permissions,
        role: permConfig.users[cleanEmail].role
      });
    }

    // -------------------------------------------------------------
    // POST /api/reports/save — archive a PDF report
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/reports/save')) {
      const { acceleratorId, clientName, pdfBase64, metadata } = body;
      if (!acceleratorId || !pdfBase64) {
        return reply(400, { ok: false, error: 'Missing required fields: "acceleratorId" and "pdfBase64" are mandatory.' });
      }

      const safeAccId = String(acceleratorId).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!caller.isAdmin && !canAccessAccelerator(access.permissions, safeAccId)) {
        return reply(403, { ok: false, error: 'You do not have access to archive reports for this accelerator.' });
      }

      let cleanBase64 = String(pdfBase64).trim();
      if (cleanBase64.includes(';base64,')) cleanBase64 = cleanBase64.split(';base64,')[1];
      else if (cleanBase64.startsWith('data:')) cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '');
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');

      if (pdfBuffer.length < 50 || pdfBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
        return reply(400, { ok: false, error: 'Generated PDF binary is invalid or empty.' });
      }
      if (pdfBuffer.length > MAX_PDF_BYTES) {
        return reply(413, { ok: false, error: 'PDF exceeds the 5 MB archive limit.' });
      }

      const cleanClient = (clientName || 'Enterprise_Client')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_')
        .substring(0, 50);
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const randomTag = Math.random().toString(36).substring(2, 7);
      const pdfKey = `reports/${safeAccId}/${cleanClient}_${timestamp}_${randomTag}.pdf`;
      const metaKey = pdfKey.replace(/\.pdf$/, '.meta.json');

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          'accelerator-id': safeAccId,
          'client-name': encodeURIComponent(clientName || 'Enterprise Client'),
          'created-at': now.toISOString(),
          'saved-by': encodeURIComponent(caller.email)
        }
      }));

      const reportMeta = {
        acceleratorId: safeAccId,
        clientName: clientName || 'Enterprise Client',
        pdfKey,
        sizeBytes: pdfBuffer.length,
        createdAt: now.toISOString(),
        savedBy: caller.email,
        metadata: metadata || {}
      };
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metaKey,
        Body: Buffer.from(JSON.stringify(reportMeta, null, 2)),
        ContentType: 'application/json'
      }));

      const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `inline; filename="${cleanClient}_${safeAccId}_Report.pdf"`
      }), { expiresIn: DOWNLOAD_URL_TTL_SECONDS });

      return reply(200, {
        ok: true,
        message: 'Report PDF successfully archived',
        key: pdfKey,
        downloadUrl,
        clientName: clientName || 'Enterprise Client',
        acceleratorId: safeAccId,
        sizeBytes: pdfBuffer.length,
        savedAt: now.toISOString()
      });
    }

    // -------------------------------------------------------------
    // GET /api/reports/list — list archived reports (reports access required)
    // -------------------------------------------------------------
    if (method === 'GET' && path.endsWith('/api/reports/list')) {
      if (!caller.isAdmin && !canViewReports(access.permissions)) {
        return reply(403, { ok: false, error: 'You do not have access to the reports archive.' });
      }

      const qParams = event.queryStringParameters || {};
      const filterAcc = qParams.acceleratorId ? qParams.acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
      const prefix = filterAcc ? `reports/${filterAcc}/` : 'reports/';

      const listResp = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix, MaxKeys: 150 }));
      const pdfItems = (listResp.Contents || []).filter(item => item.Key && item.Key.endsWith('.pdf'));

      const reports = await Promise.all(pdfItems.map(async (item) => {
        const parts = item.Key.split('/');
        const accId = parts[1] || 'general';
        const filename = parts[parts.length - 1] || item.Key;

        let clientName = '';
        try {
          const metaResp = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: item.Key.replace(/\.pdf$/, '.meta.json') }));
          clientName = JSON.parse(await metaResp.Body.transformToString()).clientName || '';
        } catch (e) {}

        let downloadUrl = '';
        try {
          downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: item.Key,
            ResponseContentType: 'application/pdf',
            ResponseContentDisposition: `inline; filename="${filename}"`
          }), { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
        } catch (e) {}

        return {
          key: item.Key,
          filename,
          clientName,
          acceleratorId: accId,
          size: item.Size,
          lastModified: item.LastModified,
          downloadUrl
        };
      }));

      reports.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      return reply(200, { ok: true, count: reports.length, reports });
    }

    // -------------------------------------------------------------
    // POST /api/reports/delete — delete an archived report (reports edit required)
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/reports/delete')) {
      if (!caller.isAdmin && !canEditReports(access.permissions)) {
        return reply(403, { ok: false, error: 'Report deletion requires administrator or reports edit rights.' });
      }

      const { key } = body;
      if (!key || !REPORT_KEY_PATTERN.test(key)) return reply(400, { ok: false, error: 'A valid report key is required.' });

      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key.replace(/\.pdf$/, '.meta.json') }));
      } catch (e) {}

      console.info(`[ReportsService] Report deleted by ${caller.email}: ${key}`);
      return reply(200, { ok: true, message: 'Report deleted successfully', key });
    }

    // -------------------------------------------------------------
    // POST /api/reports/rename — rename a report's client label (reports edit required)
    // -------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/api/reports/rename')) {
      if (!caller.isAdmin && !canEditReports(access.permissions)) {
        return reply(403, { ok: false, error: 'Renaming reports requires administrator or reports edit rights.' });
      }

      const { key, newClientName } = body;
      if (!key || !REPORT_KEY_PATTERN.test(key) || !newClientName) {
        return reply(400, { ok: false, error: 'A valid report key and newClientName are required.' });
      }

      const metaKey = key.replace(/\.pdf$/, '.meta.json');
      let currentMeta = {};
      try {
        const metaResp = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: metaKey }));
        currentMeta = JSON.parse(await metaResp.Body.transformToString());
      } catch (e) {}

      currentMeta.clientName = String(newClientName).trim();
      currentMeta.updatedAt = new Date().toISOString();
      currentMeta.updatedBy = caller.email;

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metaKey,
        Body: Buffer.from(JSON.stringify(currentMeta, null, 2)),
        ContentType: 'application/json'
      }));

      return reply(200, { ok: true, message: 'Report renamed successfully', key, clientName: currentMeta.clientName });
    }

    return reply(404, { ok: false, error: 'Endpoint not found.' });
  } catch (err) {
    console.error('[ReportsService] Error handling request:', err);
    return reply(500, { ok: false, error: 'Reports service internal error.' });
  }
};
