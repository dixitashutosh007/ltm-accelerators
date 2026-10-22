/**
 * Local dev server: the whole platform on one machine, with nothing deployed.
 *   npm run dev            -> http://localhost:4300
 *
 * - Pages: Accelerators/ with the customHttp.yml headers (same as the browser tests).
 * - API: the Advisory API's Lambda handlers run in this process, behind a local check of the sign-in token that
 *   stands in for API Gateway's Cognito JWT authorizer.
 * - Sign-in: a local stand-in for Cognito with the users below. Tokens are signed with a key made at start-up,
 *   so they work only against this server.
 * - Data: FinOps IQ assessments are kept in .local-data/ (git-ignored). The reports archive keeps metadata in
 *   memory only. No AWS account, Cognito pool or S3 bucket is used.
 *
 * Binds to 127.0.0.1 only. Not for deployment.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from '../tests/support/static-server.mjs';
import { handler as finopsIq } from '../amplify/functions/evaluate-finops-iq/handler';
import { handler as finopsValueCase } from '../amplify/functions/evaluate-finops/handler';
import { handler as postureIq } from '../amplify/functions/evaluate-posture-iq/handler';
import { handler as sovereignIq } from '../amplify/functions/evaluate-sovereign-iq/handler';
import { handler as cloudIq } from '../amplify/functions/evaluate-cloud-iq/handler';
import { handler as strategyIq } from '../amplify/functions/evaluate-strategy-iq/handler';
import { handler as modernizationIq } from '../amplify/functions/evaluate-modernization-iq/handler';
import { createHandler as finopsAssessment } from '../amplify/functions/manage-finops-assessment/handler';
import { memoryStore, type FinOpsAssessmentRecord } from '../amplify/functions/manage-finops-assessment/store';
import { createHandler as finopsReport } from '../amplify/functions/finops-iq-report/handler';

const PORT = Number(process.env.PORT || 4300);
const ORIGIN = `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA_DIR = join(ROOT, '.local-data');
const PASSWORD = process.env.LTM_DEV_PASSWORD || 'local-dev';
const USERS: Record<string, { role: string; groups: string[] }> = {
  'consultant@ltm.local': { role: 'super_admin', groups: ['Consultant'] },
  'admin@ltm.local': { role: 'super_admin', groups: ['Admin'] }
};
const PERMISSIONS = { take: ['*'], view: ['*', 'reports'], edit: ['reports'] };
const KEY = randomBytes(32);
const TOKEN_SECONDS = 3600;

/* ------------------------------ Local sign-in ------------------------------- */

const b64url = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const sign = (data: string) => createHmac('sha256', KEY).update(data).digest('base64url');
function token(email: string, use: 'id' | 'refresh') {
  const exp = Math.floor(Date.now() / 1000) + (use === 'id' ? TOKEN_SECONDS : 30 * 24 * 3600);
  const body = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ email, sub: `local-${email}`, token_use: use, 'cognito:groups': USERS[email].groups, exp })}`;
  return `${body}.${sign(body)}`;
}
function verify(jwt: string | undefined, use: 'id' | 'refresh'): Record<string, any> | null {
  const [h, p, s] = String(jwt || '').split('.');
  if (!h || !p || !s) return null;
  const expected = Buffer.from(sign(`${h}.${p}`)), got = Buffer.from(s);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  return claims.token_use === use && claims.exp * 1000 > Date.now() && USERS[claims.email] ? claims : null;
}

function cognito(target: string, body: any) {
  if (target.endsWith('.InitiateAuth') && body.AuthFlow === 'USER_PASSWORD_AUTH') {
    const email = String(body.AuthParameters?.USERNAME || '').trim().toLowerCase();
    if (!USERS[email] || body.AuthParameters?.PASSWORD !== PASSWORD) return { status: 400, body: { __type: 'NotAuthorizedException', message: 'Incorrect username or password.' } };
    return { status: 200, body: { AuthenticationResult: { IdToken: token(email, 'id'), RefreshToken: token(email, 'refresh'), ExpiresIn: TOKEN_SECONDS } } };
  }
  if (target.endsWith('.InitiateAuth') && body.AuthFlow === 'REFRESH_TOKEN_AUTH') {
    const claims = verify(body.AuthParameters?.REFRESH_TOKEN, 'refresh');
    if (!claims) return { status: 400, body: { __type: 'NotAuthorizedException', message: 'Refresh token is not valid.' } };
    return { status: 200, body: { AuthenticationResult: { IdToken: token(claims.email, 'id'), ExpiresIn: TOKEN_SECONDS } } };
  }
  if (target.endsWith('.RevokeToken')) return { status: 200, body: {} };
  return { status: 400, body: { __type: 'InvalidParameterException', message: `${target} is not supported by the local sign-in.` } };
}

/* --------------------------------- The API ---------------------------------- */

type LambdaHandler = (event: any) => Promise<any>;

const assessments = memoryStore({
  load: () => { const f = join(DATA_DIR, 'finops-assessments.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as FinOpsAssessmentRecord[] : []; },
  save: items => { mkdirSync(DATA_DIR, { recursive: true }); writeFileSync(join(DATA_DIR, 'finops-assessments.json'), JSON.stringify(items, null, 2)); }
});
const ROUTES: Record<string, LambdaHandler> = {
  'POST /api/evaluate/finops-iq': finopsIq,
  'POST /api/evaluate/finops-iq/v3': finopsIq,
  'POST /api/evaluate/finops-value-case': finopsValueCase,
  'POST /api/evaluate/posture-iq': postureIq,
  'POST /api/evaluate/sovereign-iq': sovereignIq,
  'POST /api/evaluate/cloud-iq': cloudIq,
  'POST /api/evaluate/strategy-iq': strategyIq,
  'POST /api/evaluate/modernization-iq': modernizationIq,
  'GET /api/finops-iq/assessment': finopsAssessment(assessments),
  'POST /api/finops-iq/assessment': finopsAssessment(assessments),
  'GET /api/finops-iq/report': finopsReport(assessments)
};

/** The reports archive needs S3; locally it keeps report metadata in memory and discards the PDF. */
const reports: Array<{ key: string; acceleratorId: string; clientName: string; lastModified: string; size: number; metadata: unknown }> = [];
function local(method: string, path: string, claims: Record<string, any>, body: any) {
  if (method === 'GET' && path === '/api/me') return { ok: true, email: claims.email, role: USERS[claims.email].role, permissions: PERMISSIONS };
  if (method === 'GET' && path === '/api/reports/list') return { ok: true, count: reports.length, reports };
  if (method === 'POST' && path === '/api/reports/save') {
    const key = `reports/${body.acceleratorId}/${Date.now()}-local.pdf`;
    reports.unshift({ key, acceleratorId: String(body.acceleratorId), clientName: String(body.clientName || ''), lastModified: new Date().toISOString(), size: String(body.pdfBase64 || '').length, metadata: body.metadata || {} });
    return { ok: true, key, message: 'Saved locally (metadata only).' };
  }
  if (method === 'POST' && path === '/api/reports/delete') { const i = reports.findIndex(r => r.key === body.key); if (i >= 0) reports.splice(i, 1); return { ok: true }; }
  if (method === 'POST' && path === '/api/reports/rename') { const r = reports.find(x => x.key === body.key); if (r) r.clientName = String(body.newClientName); return { ok: true }; }
  return undefined;
}

/* --------------------------------- Server ----------------------------------- */

const readBody = (req: IncomingMessage) => new Promise<string>((ok, fail) => {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 2_000_000) { fail(new Error('body too large')); req.destroy(); } });
  req.on('end', () => ok(data));
  req.on('error', fail);
});
function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  const method = req.method || 'GET';
  const raw = await readBody(req);
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  // Stands in for API Gateway's JWT authorizer: no valid token, no handler.
  const claims = verify(auth, 'id');
  if (!claims) return json(res, 401, { message: 'Unauthorized' });
  let parsed: any = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* the handler reports invalid JSON */ }
  const stub = local(method, url.pathname, claims, parsed);
  if (stub) return json(res, 200, stub);
  const fn = ROUTES[`${method} ${url.pathname}`];
  if (!fn) return json(res, 404, { message: 'Not Found' });
  const event = {
    version: '2.0', rawPath: url.pathname, rawQueryString: url.search.slice(1),
    headers: { ...req.headers, origin: ORIGIN } as Record<string, string>,
    queryStringParameters: url.searchParams.size ? Object.fromEntries(url.searchParams) : undefined,
    requestContext: { requestId: randomUUID(), http: { method, path: url.pathname }, authorizer: { jwt: { claims } } },
    body: raw || undefined, isBase64Encoded: false
  };
  const out = await fn(event);
  res.writeHead(out.statusCode ?? 200, { 'Content-Type': 'application/json', ...(out.headers || {}) });
  // API Gateway decodes base64 bodies (the report PDF) before they reach the browser; so does this stand-in.
  res.end(out.isBase64Encoded ? Buffer.from(out.body ?? '', 'base64') : out.body ?? '');
}

// Same-origin addresses, so the pages work at http://localhost:PORT and http://127.0.0.1:PORT alike (the security
// policy allows only 'self'; an absolute localhost address from a 127.0.0.1 page would be blocked).
const RUNTIME_CONFIG = `window.LTM_CONFIG = ${JSON.stringify({
  apiBase: '',
  cognito: { region: 'ap-south-1', userPoolId: 'local', clientId: 'local', endpoint: '/__dev/cognito' },
  local: true
})};\n`;

const app = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || '/', ORIGIN);
    if (url.pathname === '/assets/runtime-config.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(RUNTIME_CONFIG);
    }
    if (url.pathname === '/__dev/cognito' && req.method === 'POST') {
      const out = cognito(String(req.headers['x-amz-target'] || ''), JSON.parse((await readBody(req)) || '{}'));
      return json(res, out.status, out.body);
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    serveSite(req, res);
  } catch (error) {
    console.error('[dev-server]', error);
    if (!res.headersSent) json(res, 500, { ok: false, error: 'dev server error (see the terminal)' });
  }
};

// Loopback only, on IPv4 and IPv6: browsers may resolve "localhost" to either.
createServer(app).listen(PORT, '127.0.0.1', () => {
  console.log(`LTM accelerators running locally on ${ORIGIN} (or http://127.0.0.1:${PORT})`);
  console.log(`Sign in with ${Object.keys(USERS).join(' or ')}, password "${PASSWORD}".`);
  console.log(`FinOps IQ assessments are saved in ${DATA_DIR}.`);
});
createServer(app).listen(PORT, '::1').on('error', () => { /* no IPv6 loopback on this machine: IPv4 is enough */ });
