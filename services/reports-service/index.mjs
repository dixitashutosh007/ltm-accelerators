import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  CognitoIdentityProviderClient, 
  AdminSetUserPasswordCommand,
  AdminCreateUserCommand,
  AdminResetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand 
} from '@aws-sdk/client-cognito-identity-provider';

const BUCKET_NAME = process.env.REPORTS_BUCKET || 'ltm-advisory-reports-223833501993';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const USER_POOL_ID = 'ap-south-1_91amN2bz4';
const SUPER_ADMIN_EMAIL = 'dixitashutosh007@gmail.com';

const s3Client = new S3Client({ region: REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

async function getPermissionsConfig() {
  try {
    const resp = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'config/rbac-permissions.json'
    }));
    const text = await resp.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    return {
      users: {
        [SUPER_ADMIN_EMAIL.toLowerCase()]: {
          role: 'super_admin',
          name: 'Ashutosh Dixit (Super Admin)',
          permissions: {
            view: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq', 'reports'],
            edit: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq']
          }
        }
      }
    };
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

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || '';

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  let body = {};
  if (event.body) {
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    } catch(e) {}
  }

  try {
    // -------------------------------------------------------------
    // Route 1: GET /api/users (List all users + roles + permissions)
    // -------------------------------------------------------------
    if (path === '/api/users' || (method === 'GET' && path.includes('/api/users') && !path.includes('/list'))) {
      const cognitoUsersResp = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60
      }));

      const permConfig = await getPermissionsConfig();

      const userList = (cognitoUsersResp.Users || []).map(u => {
        const emailAttr = (u.Attributes || []).find(a => a.Name === 'email');
        const nameAttr = (u.Attributes || []).find(a => a.Name === 'name');
        const email = (emailAttr ? emailAttr.Value : u.Username).toLowerCase();
        const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();

        const custom = permConfig.users?.[email] || {};

        return {
          username: u.Username,
          email: email,
          name: custom.name || (nameAttr ? nameAttr.Value : email.split('@')[0]),
          status: u.UserStatus,
          enabled: u.Enabled,
          created: u.UserCreateDate,
          role: isSuper ? 'super_admin' : (custom.role || 'advisor_viewer'),
          permissions: isSuper 
            ? {
                view: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq', 'reports'],
                edit: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq', 'reports'],
                take: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq'],
                archive: ['finops-value-case', 'finops-iq', 'sovereign-iq', 'posture-iq', 'cloud-iq', 'reports'],
                accelerators: {
                  'finops-value-case': { full: true, take: true, edit: true, archive: true },
                  'finops-iq': { full: true, take: true, edit: true, archive: true },
                  'sovereign-iq': { full: true, take: true, edit: true, archive: true },
                  'posture-iq': { full: true, take: true, edit: true, archive: true },
                  'cloud-iq': { full: true, take: true, edit: true, archive: true }
                }
              }
            : (custom.permissions || {
                view: [],
                edit: [],
                take: [],
                archive: [],
                accelerators: {}
              })
        };
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          users: userList,
          superAdminEmail: SUPER_ADMIN_EMAIL
        })
      };
    }

    // -------------------------------------------------------------
    // Route 2: POST /api/users/create (Create App User in Cognito + RBAC)
    // -------------------------------------------------------------
    if (path.includes('/api/users/create')) {
      const { email, password, name, role, permissions, requesterEmail } = body;
      if (!email || !password) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Email and password are required.' })
        };
      }

      if ((requesterEmail || '').trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Only Super Admin can provision new users.' })
        };
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Create in Cognito
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

      // 2. Set permanent password
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: cleanEmail,
        Password: password,
        Permanent: true
      }));

      // 3. Save permissions to S3
      const permConfig = await getPermissionsConfig();
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
        createdAt: new Date().toISOString()
      };
      await savePermissionsConfig(permConfig);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: `User ${cleanEmail} created successfully with role ${role || 'advisor_viewer'}.`,
          user: {
            email: cleanEmail,
            role: role || 'advisor_viewer',
            permissions: permConfig.users[cleanEmail].permissions
          }
        })
      };
    }

    // -------------------------------------------------------------
    // Route 3: POST /api/users/set-password & /api/auth/reset-password
    // -------------------------------------------------------------
    if (path.includes('/set-password') || path.includes('/reset-password')) {
      const { email, newPassword, requesterEmail } = body;
      if (!email || !newPassword) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Email and newPassword are required.' })
        };
      }

      const cleanEmail = email.trim().toLowerCase();
      const reqEmail = (requesterEmail || cleanEmail).trim().toLowerCase();

      // Only Super Admin OR the user themselves can change password
      if (reqEmail !== SUPER_ADMIN_EMAIL.toLowerCase() && reqEmail !== cleanEmail) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Unauthorized to reset password for this user.' })
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Password must be at least 8 characters long.' })
        };
      }

      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: cleanEmail,
        Password: newPassword,
        Permanent: true
      }));

      // Generate a one-click direct access reset link for the user
      const resetLink = `https://main.d1xnevzszm0ehs.amplifyapp.com/?portal_user=${encodeURIComponent(cleanEmail)}`;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: `Password updated successfully for ${cleanEmail}`,
          resetLink: resetLink,
          email: cleanEmail
        })
      };
    }

    // -------------------------------------------------------------
    // Route 4: POST /api/users/permissions (Update User Role & Access)
    // -------------------------------------------------------------
    if (path.includes('/api/users/permissions')) {
      const { email, role, permissions, requesterEmail } = body;
      if (!email || !permissions) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Email and permissions are required.' })
        };
      }

      if ((requesterEmail || '').trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Only Super Admin can update user permissions.' })
        };
      }

      const cleanEmail = email.trim().toLowerCase();
      const permConfig = await getPermissionsConfig();
      if (!permConfig.users) permConfig.users = {};

      permConfig.users[cleanEmail] = {
        ...(permConfig.users[cleanEmail] || {}),
        role: role || permConfig.users[cleanEmail]?.role || 'custom',
        permissions: permissions,
        updatedAt: new Date().toISOString()
      };

      await savePermissionsConfig(permConfig);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: `Permissions updated for ${cleanEmail}`,
          permissions: permConfig.users[cleanEmail].permissions,
          role: permConfig.users[cleanEmail].role
        })
      };
    }

    // -------------------------------------------------------------
    // Route 5: POST /api/reports/save (Store PDF Report in S3)
    // -------------------------------------------------------------
    if (path.includes('/reports/save') || (method === 'POST' && path.includes('/reports/save'))) {
      const { acceleratorId, clientName, pdfBase64, metadata } = body;

      if (!acceleratorId || !pdfBase64) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            ok: false,
            error: 'Missing required fields: "acceleratorId" and "pdfBase64" are mandatory.'
          })
        };
      }

      const cleanClient = (clientName || 'Enterprise_Client')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_')
        .substring(0, 50);

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const randomTag = Math.random().toString(36).substring(2, 7);
      const safeAccId = acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '');

      const pdfKey = `reports/${safeAccId}/${cleanClient}_${timestamp}_${randomTag}.pdf`;
      const metaKey = `reports/${safeAccId}/${cleanClient}_${timestamp}_${randomTag}.meta.json`;

      let cleanBase64 = (pdfBase64 || '').trim();
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1];
      } else if (cleanBase64.startsWith('data:')) {
        cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '');
      }
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');

      if (!pdfBuffer || pdfBuffer.length < 50) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            ok: false,
            error: 'Generated PDF binary is invalid or empty.'
          })
        };
      }

      // 1. Upload PDF file to S3
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          'accelerator-id': safeAccId,
          'client-name': encodeURIComponent(clientName || 'Enterprise Client'),
          'created-at': now.toISOString()
        }
      }));

      // 2. Upload structured metadata
      const reportMeta = {
        acceleratorId: safeAccId,
        clientName: clientName || 'Enterprise Client',
        pdfKey,
        sizeBytes: pdfBuffer.length,
        createdAt: now.toISOString(),
        metadata: metadata || {}
      };

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metaKey,
        Body: Buffer.from(JSON.stringify(reportMeta, null, 2)),
        ContentType: 'application/json'
      }));

      // 3. Generate a secure pre-signed GET URL valid for 7 days
      const downloadCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `inline; filename="${cleanClient}_${safeAccId}_Report.pdf"`
      });

      const downloadUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 604800 });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: 'Report PDF successfully archived to S3',
          bucket: BUCKET_NAME,
          key: pdfKey,
          s3Uri: `s3://${BUCKET_NAME}/${pdfKey}`,
          downloadUrl: downloadUrl,
          clientName: clientName || 'Enterprise Client',
          acceleratorId: safeAccId,
          sizeBytes: pdfBuffer.length,
          savedAt: now.toISOString()
        })
      };
    }

    // -------------------------------------------------------------
    // Route 6: GET /api/reports/list (List Saved Reports from S3)
    // -------------------------------------------------------------
    if (path.includes('/reports/list') || (method === 'GET' && path.includes('/list'))) {
      const qParams = event.queryStringParameters || {};
      const filterAcc = qParams.acceleratorId ? qParams.acceleratorId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
      const prefix = filterAcc ? `reports/${filterAcc}/` : 'reports/';

      const listResp = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 150
      }));

      const pdfItems = (listResp.Contents || []).filter(item => item.Key && item.Key.endsWith('.pdf'));

      const reports = await Promise.all(pdfItems.map(async (item) => {
        const parts = item.Key.split('/');
        const accId = parts[1] || 'general';
        const filename = parts[parts.length - 1] || item.Key;

        const metaKey = item.Key.replace(/\.pdf$/, '.meta.json');
        let clientName = '';
        try {
          const metaResp = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: metaKey
          }));
          const metaData = JSON.parse(await metaResp.Body.transformToString());
          clientName = metaData.clientName || '';
        } catch (e) {}

        const downloadCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.Key,
          ResponseContentType: 'application/pdf',
          ResponseContentDisposition: `inline; filename="${filename}"`
        });

        let downloadUrl = '';
        try {
          downloadUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 604800 });
        } catch (e) {}

        return {
          key: item.Key,
          filename: filename,
          clientName: clientName,
          acceleratorId: accId,
          size: item.Size,
          lastModified: item.LastModified,
          downloadUrl: downloadUrl,
          s3Uri: `s3://${BUCKET_NAME}/${item.Key}`
        };
      }));

      reports.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          count: reports.length,
          bucket: BUCKET_NAME,
          reports: reports
        })
      };
    }

    // -------------------------------------------------------------
    // Route 7: POST /api/reports/delete (Delete Report from S3)
    // -------------------------------------------------------------
    if (path.includes('/reports/delete') || (method === 'POST' && path.includes('/reports/delete'))) {
      const { key, requesterEmail } = body;
      if (!key) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Report key is required.' })
        };
      }

      const cleanRequester = (requesterEmail || '').trim().toLowerCase();
      const permConfig = await getPermissionsConfig();
      const isSuper = cleanRequester === SUPER_ADMIN_EMAIL.toLowerCase();
      const userPerms = permConfig.users?.[cleanRequester]?.permissions;
      const canEditReports = isSuper || (userPerms?.edit || []).includes('reports') || (userPerms?.edit || []).includes('*');

      if (!canEditReports) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Unauthorized: Report deletion requires Super Admin or reports edit rights.' })
        };
      }

      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      }));

      const metaKey = key.replace(/\.pdf$/, '.meta.json');
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metaKey
        }));
      } catch(e) {}

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, message: 'Report deleted successfully', key })
      };
    }

    // -------------------------------------------------------------
    // Route 8: POST /api/reports/rename (Rename Report Client Name)
    // -------------------------------------------------------------
    if (path.includes('/reports/rename') || (method === 'POST' && path.includes('/reports/rename'))) {
      const { key, newClientName, requesterEmail } = body;
      if (!key || !newClientName) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Report key and newClientName are required.' })
        };
      }

      const cleanRequester = (requesterEmail || '').trim().toLowerCase();
      const permConfig = await getPermissionsConfig();
      const isSuper = cleanRequester === SUPER_ADMIN_EMAIL.toLowerCase();
      const userPerms = permConfig.users?.[cleanRequester]?.permissions;
      const canEditReports = isSuper || (userPerms?.edit || []).includes('reports') || (userPerms?.edit || []).includes('*');

      if (!canEditReports) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: 'Unauthorized: Renaming reports requires Super Admin or reports edit rights.' })
        };
      }

      const metaKey = key.replace(/\.pdf$/, '.meta.json');
      let currentMeta = {};
      try {
        const metaResp = await s3Client.send(new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metaKey
        }));
        currentMeta = JSON.parse(await metaResp.Body.transformToString());
      } catch(e) {}

      currentMeta.clientName = newClientName.trim();
      currentMeta.updatedAt = new Date().toISOString();

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metaKey,
        Body: Buffer.from(JSON.stringify(currentMeta, null, 2)),
        ContentType: 'application/json'
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          message: 'Report renamed successfully',
          key,
          clientName: newClientName.trim()
        })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Endpoint not found: ' + path })
    };
  } catch (err) {
    console.error('[ReportsService] Error handling request:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Reports service internal error: ' + (err.message || String(err))
      })
    };
  }
};
