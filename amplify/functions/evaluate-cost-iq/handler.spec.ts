/**
 * Cost IQ scoring service access (CQ1): the routes were open to anyone. Now a caller must be signed in, allowed by the
 * domain rules and permitted to use Cost IQ; the CORS header echoes only allowed origins.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from './handler';
import { setPermissionSource, setDomainStore } from '../_shared/access';

process.env.ALLOWED_ORIGINS = 'https://app.example.com';
let permitted = true;
setPermissionSource(async () => (permitted ? { take: ['cost-iq'] } : { take: ['strategy-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

const event = (method: string, path: string, opts: { body?: unknown; claims?: Record<string, unknown> | null; origin?: string } = {}): any => ({
  rawPath: path,
  headers: opts.origin ? { origin: opts.origin } : {},
  requestContext: { requestId: 'req-1', http: { method, path }, ...(opts.claims === null ? {} : { authorizer: { jwt: { claims: opts.claims ?? { email: 'a@example.com', sub: 's' } } } }) },
  body: opts.body === undefined ? undefined : JSON.stringify(opts.body), isBase64Encoded: false
});
const call = async (e: any) => { const r = (await handler(e)) as APIGatewayProxyStructuredResultV2; return { status: r.statusCode, headers: r.headers ?? {}, body: JSON.parse(String(r.body || '{}')) }; };

beforeEach(() => { permitted = true; });

describe('Cost IQ scoring service access', () => {
  it('refuses a request with no signed-in identity, for scoring, questions and both AI routes', async () => {
    for (const [m, p] of [['POST', '/api/evaluate/cost-iq'], ['GET', '/api/evaluate/cost-iq/questions'], ['POST', '/api/evaluate/cost-iq/ai-review'], ['POST', '/api/evaluate/cost-iq/ai-report']]) {
      expect((await call(event(m, p, { claims: null, body: { answers: {} } }))).status, `${m} ${p}`).toBe(401);
    }
  });

  it('refuses a signed-in caller who has no Cost IQ access', async () => {
    permitted = false;
    expect((await call(event('GET', '/api/evaluate/cost-iq/questions'))).status).toBe(403);
    expect((await call(event('POST', '/api/evaluate/cost-iq', { body: { answers: {} } }))).status).toBe(403);
  });

  it('serves a permitted caller, and the questions carry the release manifest', async () => {
    const q = await call(event('GET', '/api/evaluate/cost-iq/questions'));
    expect(q.status).toBe(200);
    expect(q.body.questions.length).toBeGreaterThan(90);
    expect(q.body.questions.some((x: any) => /^FIN-/.test(x.id))).toBe(false);
    const m = await call(event('GET', '/api/evaluate/cost-iq/metadata'));
    expect(m.body.release.product).toBe('Cost IQ');
  });

  it('returns the answers to confirm with the result (A4), and they leave the scores unchanged', async () => {
    const answers = { 'CORE-01': ['ON_PREM'], 'CORE-03': 'GT25B', 'CORE-04': 'LT5M', 'CORE-34': 95 };
    const r = await call(event('POST', '/api/evaluate/cost-iq', { body: { answers } }));
    expect(r.status).toBe(200);
    expect(r.body.plausibility.map((p: any) => p.id)).toEqual(['P-02', 'P-03:CORE-34']);
    const plain = await call(event('POST', '/api/evaluate/cost-iq', { body: { answers: { ...answers, 'CORE-03': '100M_500M', 'CORE-34': 40 } } }));
    expect(plain.body.plausibility).toEqual([]);
    // The checks are added beside the engine result and change nothing in it.
    const { evaluateCostIq } = await import('../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs');
    const direct = await evaluateCostIq({ answers, scope: null, evidence: {}, feasibilityEvidence: {}, options: {} });
    const { plausibility, ...rest } = r.body;
    expect(rest.headlines).toEqual(JSON.parse(JSON.stringify(direct)).headlines);
    expect(rest.findings).toEqual(JSON.parse(JSON.stringify(direct)).findings);
  });

  it('echoes an allowed origin and no other', async () => {
    const ok = await call(event('GET', '/api/evaluate/cost-iq/metadata', { origin: 'https://app.example.com' }));
    expect(ok.headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    const other = await call(event('GET', '/api/evaluate/cost-iq/metadata', { origin: 'https://evil.example' }));
    expect(other.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('answers the preflight without a token', async () => {
    const r = await call(event('OPTIONS', '/api/evaluate/cost-iq', { claims: null, origin: 'https://app.example.com' }));
    expect(r.status).toBe(200);
    expect(r.headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
  });
});

describe('Cost IQ scoring service holds no AI (CQ8)', () => {
  it('has no AI routes and no AI flag: the narrative is the shared Bedrock service', async () => {
    for (const p of ['/api/evaluate/cost-iq/ai-review', '/api/evaluate/cost-iq/ai-report']) {
      const r = await call(event('POST', p, { body: { answers: {} } }));
      expect(r.status, p).toBe(404);
    }
    const meta = (await call(event('GET', '/api/evaluate/cost-iq/metadata'))).body;
    expect(meta.ai).toBeUndefined();
    expect(meta.notices.data).toMatch(/Mumbai region/);
  });
});
