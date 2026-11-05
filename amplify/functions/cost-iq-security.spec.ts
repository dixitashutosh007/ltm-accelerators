/**
 * Cost IQ security review (CQ10): the same record is reached through every Cost IQ route as its owner, as another
 * signed-in user, as an Admin and with no identity. Another user is refused on every route and changes nothing; no
 * identity reaches nothing; the ownerless (pre-CQ1) record is Admin-only and read-only; errors carry no stack or internals;
 * hostile keys and oversized bodies are refused or inert.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createRequire } from 'node:module';
import { createHandler as manage } from './manage-cost-assessment/handler';
import { createHandler as report } from './cost-iq-report/handler';
import { createHandler as narrative } from './cost-iq-narrative/handler';
import { memoryStore, type CostIqAssessmentStore } from './manage-cost-assessment/store';
import { setPermissionSource, setDomainStore } from './_shared/access';

const require = createRequire(import.meta.url);
const engine = require('../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs');
setPermissionSource(async () => ({ take: ['cost-iq', 'finops-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

const OWNER = { email: 'owner@example.com', sub: 's1' };
const OTHER = { email: 'other@example.com', sub: 's2' };
const ADMIN = { email: 'admin@example.com', sub: 's3', 'cognito:groups': ['Admin'] };
const NOW = new Date('2026-11-05T10:00:00Z');
let store: CostIqAssessmentStore;

const ev = (method: string, path: string, claims: Record<string, unknown> | null, body?: unknown, query?: Record<string, string>, headers: Record<string, string> = {}): any => ({
  rawPath: path, headers, queryStringParameters: query, body: body === undefined ? undefined : JSON.stringify(body), isBase64Encoded: false,
  requestContext: { requestId: 'r1', http: { method }, ...(claims ? { authorizer: { jwt: { claims } } } : {}) }
});
const run = async (h: (e: any) => Promise<any>, e: any) => { const r = (await h(e)) as APIGatewayProxyStructuredResultV2; return { status: r.statusCode ?? 0, body: String(r.body), headers: (r.headers ?? {}) as Record<string, any> }; };

async function seed(id: string, owner: string | null, status = 'completed') {
  const answers = { 'CORE-01': ['PUBLIC_CLOUD', 'ON_PREM'], 'CORE-16': 'TRUE' };
  const scope = { selectedAreas: ['Infrastructure'] };
  await store.create({
    assessmentId: id, acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: '6.6.0', status, respondentEmail: owner, clientName: 'Example Bank',
    selectedAreasJson: JSON.stringify(scope.selectedAreas), answersJson: JSON.stringify(answers), resultJson: JSON.stringify(await engine.evaluateCostIq({ answers, scope })),
    startedAt: '2026-11-03T09:00:00Z', updatedAt: '2026-11-03T10:00:00Z', completedAt: '2026-11-03T10:00:00Z'
  } as any);
}

let routes: Record<string, (claims: Record<string, unknown> | null) => Promise<{ status: number; body: string; headers: any }>>;
beforeEach(() => {
  store = memoryStore();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const m = manage(store, () => NOW), r = report(store, () => NOW);
  const n = narrative(store, { enabled: () => true, start: async () => { throw new Error('must not be called'); }, now: () => NOW });
  const A = (c: any, id: string) => (body: unknown) => run(m, ev('POST', '/api/cost-iq/assessment', c, body));
  routes = {
    'read one': c => run(m, ev('GET', '/api/cost-iq/assessment', c, undefined, { assessmentId: 'CIQ-0001-sec' })),
    'save over it': c => run(m, ev('POST', '/api/cost-iq/assessment', c, { action: 'save', snapshot: { assessmentId: 'CIQ-0001-sec', releaseId: 'r', methodologyVersion: 'm', selectedAreasJson: '[]', answersJson: '{}' } })),
    'complete it': c => run(m, ev('POST', '/api/cost-iq/assessment', c, { action: 'complete', snapshot: { assessmentId: 'CIQ-0001-sec', releaseId: 'r', methodologyVersion: 'm', selectedAreasJson: '[]', answersJson: '{}' } })),
    'record lever evidence': c => run(m, ev('POST', '/api/cost-iq/assessment', c, { action: 'set_lever_evidence', assessmentId: 'CIQ-0001-sec', evidence: null })),
    'unlink FinOps': c => run(m, ev('POST', '/api/cost-iq/assessment', c, { action: 'unlink_finops', assessmentId: 'CIQ-0001-sec' })),
    'delete': c => run(m, ev('POST', '/api/cost-iq/assessment', c, { action: 'delete', assessmentId: 'CIQ-0001-sec' })),
    'report PDF': c => run(r, ev('GET', '/api/cost-iq/report', c, undefined, { assessmentId: 'CIQ-0001-sec' })),
    'report CSV': c => run(r, ev('GET', '/api/cost-iq/report', c, undefined, { assessmentId: 'CIQ-0001-sec', format: 'csv' })),
    'AI switch on': c => run(n, ev('POST', '/api/cost-iq/narrative', c, { action: 'enable', assessmentId: 'CIQ-0001-sec' })),
    'AI generate': c => run(n, ev('POST', '/api/cost-iq/narrative', c, { action: 'generate', assessmentId: 'CIQ-0001-sec' }))
  };
  void A;
});

describe('Cost IQ routes: who can reach a record', () => {
  it('another signed-in user is refused on every route and nothing changes', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    const before = JSON.stringify(await store.get('CIQ-0001-sec'));
    for (const [name, go] of Object.entries(routes)) {
      const r = await go(OTHER);
      expect(r.status, name).toBe(403);
      expect(r.body, name).not.toContain('Example Bank');
    }
    expect(JSON.stringify(await store.get('CIQ-0001-sec'))).toBe(before);
  });

  it('with no identity nothing is reached', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    for (const [name, go] of Object.entries(routes)) expect((await go(null)).status, name).toBe(403);
    expect(await store.get('CIQ-0001-sec')).not.toBeNull();
  });

  it('the owner and an Admin reach the record on the read routes', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    for (const who of [OWNER, ADMIN]) {
      expect((await routes['read one'](who)).status).toBe(200);
      expect((await routes['report PDF'](who)).status).toBe(200);
      expect((await routes['report CSV'](who)).status).toBe(200);
    }
  });

  it('a record saved before owners were recorded is Admin-only, and read-only even for an Admin', async () => {
    await seed('CIQ-0001-sec', null);
    expect((await routes['read one'](OWNER)).status).toBe(403);
    expect((await routes['read one'](ADMIN)).status).toBe(200);
    for (const name of ['record lever evidence', 'unlink FinOps', 'AI switch on']) expect((await routes[name](ADMIN)).status, name).toBe(409);
    expect((await routes['AI switch on'](OWNER)).status).toBe(403);
    expect((await store.get('CIQ-0001-sec'))!.aiEnabled).toBeFalsy();
  });

  it('a completed assessment cannot be changed by its owner through save or complete', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    expect((await routes['save over it'](OWNER)).status).toBe(409);
    expect((await routes['complete it'](OWNER)).status).toBe(409);
  });

  it('the AI stays unreachable for an owner until the engagement switch is on: the model is never called', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    const r = await routes['AI generate'](OWNER);
    expect([r.status, JSON.parse(r.body).error]).toEqual([409, 'ai_off_for_engagement']);
  });

  it('the client cannot set the AI switch, the narrative, the retention or the owner through a save', async () => {
    const m = manage(store, () => NOW);
    const snapshot = { assessmentId: 'CIQ-2-new-x', releaseId: 'r', methodologyVersion: 'm', selectedAreasJson: '[]', answersJson: '{}', aiEnabled: true, narrativeJson: '{"status":"ok"}', expiresAt: 1, respondentEmail: 'someone@else.com', resultJson: '{"headlines":{"costIQ":100}}', leverEvidenceJson: '{}' };
    expect((await run(m, ev('POST', '/api/cost-iq/assessment', OWNER, { action: 'save', snapshot }))).status).toBe(200);
    const rec: any = await store.get('CIQ-2-new-x');
    expect([rec.aiEnabled ?? null, rec.narrativeJson ?? null, rec.leverEvidenceJson ?? null, rec.resultJson]).toEqual([null, null, null, null]);
    expect(rec.respondentEmail).toBe(OWNER.email);
    expect(rec.expiresAt).toBeGreaterThan(Math.floor(NOW.getTime() / 1000));
  });
});

describe('Cost IQ routes: hostile input and what comes back', () => {
  it('prototype-pollution keys, oversized bodies and bad JSON are refused or inert, and errors carry no stack', async () => {
    const m = manage(store, () => NOW);
    const hostile = { assessmentId: 'CIQ-3-hostile', releaseId: 'r', methodologyVersion: 'm', selectedAreasJson: '[]', answersJson: '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}' };
    const r = await run(m, ev('POST', '/api/cost-iq/assessment', OWNER, { action: 'complete', snapshot: hostile }));
    expect(r.status).toBeLessThan(500);
    expect(({} as any).polluted).toBeUndefined();
    const big = await run(m, ev('POST', '/api/cost-iq/assessment', OWNER, { action: 'save', snapshot: { ...hostile, answersJson: JSON.stringify({ a: 'x'.repeat(2_000_000) }) } }));
    expect(big.status).toBe(400);
    const bad = await run(m, { ...ev('POST', '/api/cost-iq/assessment', OWNER), body: '{not json' });
    expect(bad.status).toBe(400);
    for (const x of [r, big, bad]) expect(x.body).not.toMatch(/\bat \S+ \(|node_modules|\.ts:\d+|stack/);
  });

  it('an unexpected failure returns a generic message, not the cause', async () => {
    const broken: CostIqAssessmentStore = { ...store, async get() { throw new Error('SECRET-INTERNAL arn:aws:dynamodb:table/xyz'); } };
    const r = await run(manage(broken, () => NOW), ev('GET', '/api/cost-iq/assessment', OWNER, undefined, { assessmentId: 'CIQ-0001-sec' }));
    expect(r.status).toBe(500);
    expect(r.body).not.toMatch(/SECRET-INTERNAL|arn:aws/);
  });

  it('CORS answers only an allowed origin', async () => {
    await seed('CIQ-0001-sec', OWNER.email);
    const m = manage(store, () => NOW);
    const evil = await run(m, ev('GET', '/api/cost-iq/assessment', OWNER, undefined, { assessmentId: 'CIQ-0001-sec' }, { origin: 'https://evil.example.com' }));
    expect(String(evil.headers['Access-Control-Allow-Origin'] ?? '')).not.toBe('*');
    expect(String(evil.headers['Access-Control-Allow-Origin'] ?? '')).not.toContain('evil.example.com');
  });
});
