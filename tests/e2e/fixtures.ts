/**
 * Test fixtures: every page runs against mocks of the outside world.
 * - CDN libraries are served from node_modules (same pinned versions as the pages load).
 * - Cognito is a fake that issues unsigned test tokens and records each call.
 * - The Advisory API is a fake; tests can override routes with `api.on(...)`.
 * - Third-party AI endpoints always fail, so no test ever sends data to them.
 * - Any Content-Security-Policy violation or uncaught page error is collected for assertions.
 */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { join } from 'node:path';

// Plain paths: these packages' "exports" maps do not expose their UMD bundles.
const lib = (rel: string) => join(process.cwd(), 'node_modules', rel);
const CDN_FILES: [RegExp, string][] = [
  [/chart\.js/, lib('chart.js/dist/chart.umd.js')],
  [/jspdf-autotable|jspdf\.plugin\.autotable/, lib('jspdf-autotable/dist/jspdf.plugin.autotable.min.js')],
  [/jspdf/, lib('jspdf/dist/jspdf.umd.min.js')],
  [/html2pdf/, lib('html2pdf.js/dist/html2pdf.bundle.min.js')]
];

export const TEST_API = 'https://test-api.execute-api.ap-south-1.amazonaws.com';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function makeIdToken(email: string, expiresInSeconds = 3600, extra: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64url({ alg: 'RS256', kid: 'test' })}.${b64url({ email, sub: 'sub-' + email, token_use: 'id', exp, ...extra })}.test-signature`;
}

export type Session = { email: string; token: string; refreshToken?: string; role?: string; permissions?: Record<string, unknown> };
type ApiHandler = (req: { method: string; path: string; body: any; auth: string }) => { status?: number; body: unknown } | undefined;

export class MockWorld {
  calls: string[] = [];
  cspViolations: string[] = [];
  pageErrors: string[] = [];
  /** Same-site requests that failed (missing assets such as fonts or images). */
  missingFiles: string[] = [];
  private handlers: { method: string; path: string | RegExp; fn: ApiHandler }[] = [];
  /** Email -> password accepted by the fake Cognito. */
  users: Record<string, string> = { 'consultant@ltm.com': 'Passw0rd!', 'admin@ltm.com': 'Passw0rd!' };
  refreshCount = 0;
  refreshShouldFail = false;
  me: Record<string, { role: string; permissions: Record<string, unknown> }> = {
    'admin@ltm.com': { role: 'super_admin', permissions: { view: ['reports'], edit: ['reports'] } },
    'consultant@ltm.com': { role: 'advisor_viewer', permissions: { take: ['sovereign-iq', 'cloud-iq'], view: ['sovereign-iq', 'cloud-iq'] } }
  };

  on(method: string, path: string | RegExp, fn: ApiHandler) { this.handlers.unshift({ method, path, fn }); }

  async install(context: BrowserContext) {
    await context.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, route => {
      const url = route.request().url();
      const hit = CDN_FILES.find(([re]) => re.test(url));
      return hit ? route.fulfill({ path: hit[1], contentType: 'application/javascript' }) : route.fulfill({ status: 404, body: '' });
    });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await context.route(/api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/, route => {
      this.calls.push('BLOCKED-AI ' + route.request().url());
      return route.fulfill({ status: 503, body: '{}' });
    });
    await context.route(/cognito-idp\.[a-z0-9-]+\.amazonaws\.com/, route => this.cognito(route));
    await context.route(/execute-api\.[a-z0-9-]+\.amazonaws\.com/, route => this.api(route));
    // Point the frontend at the fake API regardless of the committed runtime config.
    await context.route(/\/assets\/runtime-config\.js$/, route => route.fulfill({
      contentType: 'application/javascript',
      body: `window.LTM_CONFIG=${JSON.stringify({ apiBase: TEST_API, cognito: { region: 'ap-south-1', userPoolId: 'ap-south-1_test', clientId: 'test-client' } })};`
    }));
  }

  watch(page: Page) {
    page.on('console', msg => {
      if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) this.cspViolations.push(msg.text());
    });
    page.on('pageerror', err => this.pageErrors.push(err.message));
    page.on('response', res => {
      if (res.status() >= 400 && new URL(res.url()).host === new URL(page.url() || res.url()).host) this.missingFiles.push(`${res.status()} ${res.url()}`);
    });
    page.on('dialog', dialog => dialog.accept().catch(() => {}));
  }

  private async cognito(route: any) {
    const target = String(route.request().headers()['x-amz-target'] || '').split('.').pop();
    const body = JSON.parse(route.request().postData() || '{}');
    this.calls.push(`COGNITO ${target}`);
    const ok = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/x-amz-json-1.1', body: JSON.stringify(data) });
    const fail = (type: string, message: string) => route.fulfill({ status: 400, contentType: 'application/x-amz-json-1.1', body: JSON.stringify({ __type: type, message }) });
    if (target === 'InitiateAuth' && body.AuthFlow === 'USER_PASSWORD_AUTH') {
      const { USERNAME, PASSWORD } = body.AuthParameters || {};
      if (this.users[USERNAME] !== PASSWORD) return fail('NotAuthorizedException', 'Incorrect username or password.');
      return ok({ AuthenticationResult: { IdToken: makeIdToken(USERNAME), RefreshToken: 'refresh-' + USERNAME } });
    }
    if (target === 'InitiateAuth' && body.AuthFlow === 'REFRESH_TOKEN_AUTH') {
      this.refreshCount++;
      if (this.refreshShouldFail) return fail('NotAuthorizedException', 'Refresh Token has expired');
      const email = String(body.AuthParameters?.REFRESH_TOKEN || '').replace(/^refresh-/, '');
      return ok({ AuthenticationResult: { IdToken: makeIdToken(email) } });
    }
    if (target === 'ForgotPassword' || target === 'ConfirmForgotPassword' || target === 'RevokeToken') return ok({});
    return fail('InvalidParameterException', 'Unsupported in mock: ' + target);
  }

  private async api(route: any) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const auth = req.headers()['authorization'] || '';
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    this.calls.push(`${method} ${url.pathname} auth=${auth.startsWith('Bearer ') ? 'bearer' : 'none'}`);
    const reply = (status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });

    // Like API Gateway's JWT authorizer: reject missing or expired tokens.
    const claims = auth.startsWith('Bearer ') ? JSON.parse(Buffer.from(auth.slice(7).split('.')[1] || '', 'base64url').toString() || '{}') : null;
    if (!claims || !claims.exp || claims.exp * 1000 <= Date.now()) return reply(401, { message: 'Unauthorized' });

    let body: any = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch { /* not JSON */ }
    for (const h of this.handlers) {
      const pathOk = typeof h.path === 'string' ? h.path === url.pathname : h.path.test(url.pathname);
      if (h.method === method && pathOk) {
        const out = h.fn({ method, path: url.pathname, body, auth });
        if (out) return reply(out.status ?? 200, out.body);
      }
    }
    if (url.pathname === '/api/me') {
      const me = this.me[claims.email] || { role: 'advisor_viewer', permissions: {} };
      return reply(200, { ok: true, email: claims.email, ...me });
    }
    if (url.pathname === '/api/users') return reply(200, { ok: true, users: [{ email: 'consultant@ltm.com', name: 'Consultant', role: 'advisor_viewer', status: 'CONFIRMED', enabled: true, permissions: {} }] });
    if (url.pathname === '/api/reports/list') return reply(200, { ok: true, count: 0, reports: [] });
    return reply(404, { message: 'Not Found' });
  }
}

/** Store a signed-in session before the page loads. */
export async function signedIn(context: BrowserContext, session: Session) {
  await context.addInitScript(s => sessionStorage.setItem('ltm_auth_user', JSON.stringify(s)), session);
}

export const test = base.extend<{ world: MockWorld }>({
  // auto: every test runs against the mocks, even if it never references `world`.
  world: [async ({ context, page }, use) => {
    const world = new MockWorld();
    await world.install(context);
    world.watch(page);
    await context.addInitScript(() => sessionStorage.setItem('ltm_portal_splash_seen', '1'));
    await use(world);
  }, { auto: true }]
});

export { expect };
