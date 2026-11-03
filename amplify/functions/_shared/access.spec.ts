/**
 * Accelerator access on the server (24 Oct 2026): who reaches an accelerator's handler, under the page guard's rule.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { withAcceleratorAccess, setPermissionSource, setDomainStore, grants } from './access';

const reached: string[] = [];
const handler = withAcceleratorAccess('cloud-iq', async () => { reached.push('cloud-iq'); return { statusCode: 200, body: '{"ok":true}' }; });
const finops = withAcceleratorAccess('finops-iq', async () => ({ statusCode: 200, body: '{"ok":true}' }));
const call = async (h: typeof handler, claims?: Record<string, unknown>, method = 'POST') =>
  (await h({ requestContext: { http: { method }, ...(claims ? { authorizer: { jwt: { claims } } } : {}) }, headers: {} } as any)) as APIGatewayProxyStructuredResultV2;

const SAVED: Record<string, any> = {
  'taker@ltm.com': { take: ['cloud-iq'] },
  'flag@ltm.com': { accelerators: { 'cloud-iq': { take: true } } },
  'viewer@ltm.com': { view: ['cloud-iq'] },
  'wildcard@ltm.com': { take: ['*'] },
  'editor@ltm.com': { edit: ['cloud-iq'], accelerators: { 'cloud-iq': { edit: true, archive: true } } },
  'other@ltm.com': { take: ['strategy-iq'] },
  'fvc@ltm.com': { take: ['finops-value-case'] }
};

beforeEach(() => {
  reached.length = 0;
  process.env.SUPER_ADMIN_EMAILS = 'owner@ltm.com';
  setPermissionSource(async email => SAVED[email] ?? null);
  setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });
});
afterAll(() => { setPermissionSource(null); setDomainStore(null); });

describe('accelerator access on the server', () => {
  it('a request with no verified identity is refused (old routes without the Cognito authorizer)', async () => {
    expect((await call(handler)).statusCode).toBe(401);
    expect(reached).toEqual([]);
  });

  it('the CORS preflight passes without identity', async () => {
    expect((await call(handler, undefined, 'OPTIONS')).statusCode).toBe(200);
  });

  it('grants access under the page guard rule: take list, take flag, view list or the wildcard', async () => {
    for (const email of ['taker@ltm.com', 'flag@ltm.com', 'viewer@ltm.com', 'wildcard@ltm.com']) expect((await call(handler, { email })).statusCode, email).toBe(200);
  });

  it('refuses users without the accelerator, users with only edit or archive rights, and users with no saved permissions', async () => {
    for (const email of ['other@ltm.com', 'editor@ltm.com', 'new.user@ey.com']) {
      const res = await call(handler, { email });
      expect(res.statusCode, email).toBe(403);
      expect(JSON.parse(String(res.body)).error).toBe('accelerator_access_denied');
    }
    expect(reached).toEqual([]);
  });

  it('administrators pass: the Admin group (as an array or as HTTP API\'s "[Admin ...]" string) or a bootstrap address', async () => {
    expect((await call(handler, { email: 'boss@ltm.com', 'cognito:groups': ['Admin'] })).statusCode).toBe(200);
    expect((await call(handler, { email: 'boss@ltm.com', 'cognito:groups': '[Admin Consultant]' })).statusCode).toBe(200);
    expect((await call(handler, { email: 'OWNER@ltm.com' })).statusCode).toBe(200);
    expect((await call(handler, { email: 'boss@ltm.com', 'cognito:groups': '[Consultant]' })).statusCode).toBe(403);
  });

  it('a FinOps Value Case permission opens FinOps IQ', async () => {
    expect((await call(finops, { email: 'fvc@ltm.com' })).statusCode).toBe(200);
    expect(grants({ take: ['finops-value-case'] }, 'cloud-iq')).toBe(false);
  });

  it('a Posture IQ permission opens the merged Sovereign IQ', async () => {
    expect(grants({ take: ['posture-iq'] }, 'sovereign-iq')).toBe(true);
    expect(grants({ take: ['sovereign-iq'] }, 'posture-iq')).toBe(false);
  });

  it('fails closed when the permissions cannot be read', async () => {
    setPermissionSource(async () => { throw new Error('S3 unavailable'); });
    const res = await call(handler, { email: 'taker@ltm.com' });
    expect(res.statusCode).toBe(503);
    expect(reached).toEqual([]);
  });

  // ---- Domain access (platform workstream P1): the rules are checked on every request ----

  it('a blocked address is refused with 403 even when its token is valid and its permissions grant the accelerator', async () => {
    setDomainStore({ check: async e => (e === 'taker@ltm.com' ? { allowed: false, reason: 'domain_blocked' } : { allowed: true, reason: 'baseline_domain' }) });
    const res = await call(handler, { email: 'taker@ltm.com' });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body as string).error).toBe('account_blocked');
    expect(reached).toEqual([]);
    expect((await call(handler, { email: 'flag@ltm.com' })).statusCode).toBe(200);
  });

  it('a blocked administrator is refused too, unless protected', async () => {
    setDomainStore({ check: async () => ({ allowed: false, reason: 'email_blocked' }) });
    expect((await call(handler, { email: 'someone@ltm.com', 'cognito:groups': '[Admin]' })).statusCode).toBe(403);
    setDomainStore({ check: async () => ({ allowed: true, reason: 'protected_email' }) });
    expect((await call(handler, { email: 'owner@ltm.com' })).statusCode).toBe(200);
  });

  it('fails closed when the domain rules cannot be read, and does not reach the accelerator', async () => {
    setDomainStore({ check: async () => ({ allowed: false, reason: 'rules_unavailable' }) });
    const res = await call(handler, { email: 'taker@ltm.com' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body as string).error).toBe('access_check_unavailable');
    expect(reached).toEqual([]);
  });

  it('the preflight and identity checks come first: no rules are read for a request with no identity', async () => {
    let asked = 0;
    setDomainStore({ check: async () => { asked++; return { allowed: true, reason: 'baseline_domain' }; } });
    await call(handler);
    await call(handler, undefined, 'OPTIONS');
    expect(asked).toBe(0);
  });
});
