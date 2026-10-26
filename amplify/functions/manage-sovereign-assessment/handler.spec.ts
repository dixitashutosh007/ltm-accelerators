/**
 * Sovereign IQ save and resume (PLAN S5): ownership, lifecycle, contract checks, the server-computed result dated on
 * completion, client mode, and the v4 scoring route. Runs against the in-memory store; AppSync is exercised on
 * deployment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHandler } from './handler';
import { memoryStore, type SovereignAssessmentStore } from './store';
import { handler as scoreHandler } from '../evaluate-sovereign-iq/handler';
import { setPermissionSource } from '../_shared/access';

const ARCHETYPES: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design/archetypes.json'), 'utf8')).archetypes;
const ARC1 = ARCHETYPES.find(a => a.id === 'ARC1_EU_BANK_DORA')!.answers;
const ME = 'consultant@example.com';
const COMPLETED_AT = new Date('2026-10-26T10:00:00Z');
let store: SovereignAssessmentStore;
let handler: ReturnType<typeof createHandler>;

setPermissionSource(async () => ({ take: ['sovereign-iq'] }));

function event(method: 'GET' | 'POST', opts: { body?: unknown; query?: Record<string, string>; claims?: Record<string, unknown>; path?: string } = {}): any {
  return {
    rawPath: opts.path ?? '/api/sovereign-iq/assessment',
    requestContext: { requestId: 'req-1', http: { method }, authorizer: { jwt: { claims: opts.claims ?? { email: ME, sub: 'sub-1' } } } },
    headers: {}, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), isBase64Encoded: false, queryStringParameters: opts.query
  };
}
async function call(e: any, h: (e: any) => Promise<any> = handler) {
  const res = (await h(e)) as APIGatewayProxyStructuredResultV2;
  return { status: res.statusCode, body: JSON.parse(String(res.body)) };
}
const snapshot = (over: Record<string, unknown> = {}) => ({
  assessmentId: 'SIQ-0001-test', clientName: 'Example Bank', respondentEmail: ME, status: 'in_progress',
  startedAt: '2026-10-26T09:00:00Z', request: { mode: 'workshop', answers: ARC1 }, consultantNotes: 'Board wants L3 for payments', ...over
});
const save = (over: Record<string, unknown> = {}, action = 'save', claims?: Record<string, unknown>) =>
  call(event('POST', { body: { action, snapshot: snapshot(over) }, claims }));

beforeEach(() => {
  store = memoryStore();
  handler = createHandler(store, () => COMPLETED_AT);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Sovereign IQ assessment API', () => {
  it('saves a draft, lists it as a summary and resumes it with its answers', async () => {
    const draft = await save({ status: 'draft', request: { mode: 'executive', answers: { A1: 'eea' } } });
    expect(draft.status).toBe(200);
    expect(draft.body.data).toMatchObject({ assessmentId: 'SIQ-0001-test', status: 'draft', mode: 'executive' });
    expect(draft.body.data.result).toBeUndefined();
    const list = await call(event('GET'));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].request).toBeUndefined();
    const one = await call(event('GET', { query: { assessmentId: 'SIQ-0001-test' } }));
    expect(one.body.data.request.answers).toEqual({ A1: 'eea' });
  });

  it('computes the result on completion, dated that day, and never takes one from the browser', async () => {
    const done = await save({ status: 'completed', result: { maturity: { score: 100 } } }, 'complete');
    expect(done.status).toBe(200);
    expect(done.body.data.result.assessmentDate).toBe('2026-10-26');
    expect(done.body.data.result.maturity.score).toBe(55);
    expect(done.body.data.result.versions.engine).toBe('4.1.0');
  });

  it('a completed assessment is immutable: it can be archived or deleted, not changed', async () => {
    await save({ status: 'completed' }, 'complete');
    const change = await save({ status: 'in_progress' });
    expect(change.status).toBe(409);
    expect(change.body.error).toBe('assessment_immutable');
    expect((await save({ status: 'completed' }, 'complete')).status).toBe(409);
    expect((await call(event('POST', { body: { action: 'archive', snapshot: { assessmentId: 'SIQ-0001-test', status: 'archived' } } }))).body.data.status).toBe('archived');
  });

  it('client mode: no consultant notes, no rule IDs, no numeric states, no regimes that do not apply', async () => {
    await save({ status: 'completed' }, 'complete');
    const client = await call(event('GET', { query: { assessmentId: 'SIQ-0001-test', view: 'client' } }));
    const r = client.body.data.result;
    expect(client.body.data.consultantNotes).toBeUndefined();
    expect(r.view).toBe('client');
    expect(r.regimes.every((g: any) => g.rule === undefined && g.grade !== 'not_applicable')).toBe(true);
    expect(r.regimesNotApplicable).toBeGreaterThan(0);
    expect(r.controls.every((c: any) => typeof c.status === 'string' && c.weight === undefined && c.state === undefined && c.score === undefined)).toBe(true);
    expect(r.facts).toBeUndefined();
    expect(JSON.stringify(r)).not.toMatch(/"pendingSource"/);
  });

  it('a record belongs to its respondent: others cannot read, overwrite or delete it; an Admin can read it', async () => {
    await save();
    const other = { email: 'other@example.com', sub: 'sub-2' };
    expect((await call(event('GET', { query: { assessmentId: 'SIQ-0001-test' }, claims: other }))).status).toBe(403);
    expect((await save({ respondentEmail: 'other@example.com' }, 'save', other)).status).toBe(403);
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'SIQ-0001-test' }, claims: other }))).status).toBe(403);
    expect((await call(event('GET', { query: { assessmentId: 'SIQ-0001-test' }, claims: { email: 'boss@example.com', 'cognito:groups': ['Admin'] } }))).status).toBe(200);
    expect((await save({ respondentEmail: 'other@example.com' })).status).toBe(403);
  });

  it('rejects answers the contract refuses and a change of mode', async () => {
    expect((await save({ request: { mode: 'workshop', answers: { A1: 'mars' } } })).status).toBe(400);
    await save();
    expect((await save({ request: { mode: 'executive', answers: ARC1 } })).status).toBe(409);
  });

  it('deletes permanently at the respondent\'s request', async () => {
    await save({ status: 'completed' }, 'complete');
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'SIQ-0001-test' } }))).body.data.deleted).toBe(true);
    expect((await call(event('GET', { query: { assessmentId: 'SIQ-0001-test' } }))).status).toBe(404);
  });
});

describe('POST /api/evaluate/sovereign-iq/v4', () => {
  const score = (body: unknown, query?: Record<string, string>) => call(event('POST', { body, query, path: '/api/evaluate/sovereign-iq/v4' }), scoreHandler);
  it('scores with the v4 engine, dated today on the server, whatever date the browser sends', async () => {
    const res = await score({ mode: 'workshop', answers: ARC1, assessmentDate: '1999-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.data.versions.engine).toBe('4.1.0');
    expect(res.body.data.assessmentDate).toBe(new Date().toISOString().slice(0, 10));
    expect(res.body.data.asked).toContain('L2');
  });
  it('?view=client returns the client result; invalid answers are refused', async () => {
    expect((await score({ mode: 'executive', answers: ARC1 }, { view: 'client' })).body.data.view).toBe('client');
    expect((await score({ mode: 'workshop', answers: { Z9: 'x' } })).status).toBe(400);
  });
  it('the current page\'s plain route still scores with the current engine', async () => {
    const res = await call(event('POST', { body: {}, path: '/api/evaluate/sovereign-iq' }), scoreHandler);
    expect(res.body.data?.versions?.engine).not.toBe('4.1.0');
  });
});
