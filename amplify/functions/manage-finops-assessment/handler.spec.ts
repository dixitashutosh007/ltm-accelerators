/**
 * FinOps IQ save and resume (execution phase M2): ownership, lifecycle, contract checks and the server-computed
 * result. Runs in Vitest against the in-memory store; the AppSync store is exercised on deployment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHandler } from './handler';
import { memoryStore, type FinOpsAssessmentStore } from './store';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CODE: Record<string, string> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
function scenarioRequest(id: string) {
  const s = SCENARIOS.find(x => x.id === id)!;
  const answers = Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
  return { mode: s.mode, facts: s.inputs.facts, answers };
}

const ME = 'consultant@example.com';
const COMPLETED_AT = new Date('2026-10-20T10:00:00Z');
let store: FinOpsAssessmentStore;
let handler: ReturnType<typeof createHandler>;

function event(method: 'GET' | 'POST', opts: { body?: unknown; query?: Record<string, string>; claims?: Record<string, unknown>; raw?: string } = {}): any {
  return {
    requestContext: { requestId: 'req-1', http: { method }, authorizer: { jwt: { claims: opts.claims ?? { email: ME, sub: 'sub-1' } } } },
    headers: {},
    body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    isBase64Encoded: false,
    queryStringParameters: opts.query
  };
}
async function call(e: any) {
  const res = (await handler(e)) as APIGatewayProxyStructuredResultV2;
  return { status: res.statusCode, body: JSON.parse(String(res.body)) };
}
const snapshot = (over: Record<string, unknown> = {}) => ({
  assessmentId: 'FIQ-0001-test', clientName: 'Example Bank', respondentEmail: ME, status: 'in_progress',
  startedAt: '2026-10-20T09:00:00Z', request: scenarioRequest('RS1'), ...over
});
const save = (over: Record<string, unknown> = {}, action = 'save', claims?: Record<string, unknown>) =>
  call(event('POST', { body: { action, snapshot: snapshot(over) }, claims }));

beforeEach(() => {
  store = memoryStore();
  handler = createHandler(store, () => COMPLETED_AT);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('FinOps IQ assessment API: save and resume', () => {
  it('saves a draft with incomplete facts, then lists and resumes it', async () => {
    const draft = await save({ status: 'draft', request: { mode: 'executive', facts: {}, answers: { 'MP-01': 'walk' } } });
    expect(draft.status).toBe(200);
    expect(draft.body.data).toMatchObject({ assessmentId: 'FIQ-0001-test', status: 'draft', mode: 'executive', engineVersion: '3.4.0' });
    expect(draft.body.data.result).toBeUndefined();

    const list = await call(event('GET'));
    expect(list.body.data.map((x: any) => x.assessmentId)).toEqual(['FIQ-0001-test']);
    expect(list.body.data[0].request).toBeUndefined();

    const one = await call(event('GET', { query: { assessmentId: 'FIQ-0001-test' } }));
    expect(one.body.data.request.answers).toEqual({ 'MP-01': 'walk' });
  });

  it('rejects invalid answers even in a draft, with readable reasons', async () => {
    const res = await save({ status: 'draft', request: { mode: 'executive', facts: {}, answers: { 'MP-01': 'sometimes', 'XX-99': 'run' } } });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringMatching(/^request\.answers\.MP-01/), 'request.answers.XX-99: unknown question']));
  });

  it('rejects a malformed snapshot and a body that is not JSON', async () => {
    expect((await save({ assessmentId: 'x', clientName: '' })).body.details).toEqual(expect.arrayContaining([expect.stringMatching(/^assessmentId/), expect.stringMatching(/^clientName/)]));
    expect((await call(event('POST', { raw: '{not json' }))).status).toBe(400);
    expect((await call(event('POST', { body: { action: 'delete', snapshot: snapshot() } }))).status).toBe(400);
  });

  it('computes and stores the result on completion, from the stored request only, dated on the server', async () => {
    await save();
    const done = await save({ status: 'completed', result: { forged: true } }, 'complete');
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('completed');
    expect(done.body.data.completedAt).toBe(COMPLETED_AT.toISOString());
    expect(done.body.data.result.forged).toBeUndefined();
    expect(done.body.data.result.assessmentDate).toBe('2026-10-20');
    expect(done.body.data.result.versions.engine).toBe('3.4.0');
    expect(done.body.data.request.assessmentDate).toBe('2026-10-20');
  });

  it('completion needs complete facts', async () => {
    const res = await save({ status: 'completed', request: { mode: 'executive', facts: {}, answers: {} } }, 'complete');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/^request\.facts/);
  });

  it('a completed assessment is immutable: no save, no second completion; it can be archived once', async () => {
    await save({ status: 'completed' }, 'complete');
    expect((await save({ status: 'in_progress' })).body.error).toBe('assessment_immutable');
    expect((await save({ status: 'completed' }, 'complete')).body.error).toBe('assessment_immutable');
    const archived = await save({ status: 'archived' }, 'archive');
    expect(archived.body.data).toMatchObject({ status: 'archived', archivedAt: COMPLETED_AT.toISOString() });
    expect(archived.body.data.result).toBeDefined();
    expect((await save({ status: 'archived' }, 'archive')).body.error).toBe('assessment_immutable');
  });

  it('the action and the status must agree, and save cannot complete', async () => {
    expect((await save({ status: 'in_progress' }, 'complete')).status).toBe(400);
    expect((await save({ status: 'completed' }, 'save')).status).toBe(400);
  });

  it('moves forward only: in progress cannot go back to draft, and the mode cannot change', async () => {
    await save();
    expect((await save({ status: 'draft' })).body.error).toBe('invalid_assessment_status_transition');
    expect((await save({ request: scenarioRequest('RS3') })).body.error).toBe('mode_change_not_allowed');
  });
});

describe('FinOps IQ assessment API: client mode', () => {
  it('?view=client returns no consultant notes and a client-mode result', async () => {
    await save({ status: 'completed', consultantNotes: 'Client CFO sceptical about tagging numbers' }, 'complete');
    const full = await call(event('GET', { query: { assessmentId: 'FIQ-0001-test' } }));
    expect(full.body.data.consultantNotes).toMatch(/sceptical/);
    expect(full.body.data.result.tier.trace).toBeDefined();
    const client = await call(event('GET', { query: { assessmentId: 'FIQ-0001-test', view: 'client' } }));
    expect(JSON.stringify(client.body)).not.toMatch(/sceptical|consultantNotes/);
    expect(client.body.data.result.view).toBe('client');
    expect(client.body.data.result.tier.trace).toBeUndefined();
  });
});

describe('FinOps IQ assessment API: ownership', () => {
  const OTHER = { email: 'someone.else@example.com', sub: 'sub-2' };
  const ADMIN = { email: 'admin@example.com', sub: 'sub-9', 'cognito:groups': ['Admin'] };

  it('refuses callers without identity claims', async () => {
    expect((await call(event('GET', { claims: {} }))).status).toBe(403);
  });

  it('a consultant cannot save as someone else', async () => {
    expect((await save({ respondentEmail: 'someone.else@example.com' })).body.error).toBe('respondent_email_mismatch');
  });

  it('a consultant cannot read, overwrite, complete or archive another consultant\'s assessment, nor see it listed', async () => {
    await save();
    expect((await call(event('GET', { query: { assessmentId: 'FIQ-0001-test' }, claims: OTHER }))).status).toBe(403);
    expect((await save({ respondentEmail: OTHER.email }, 'save', OTHER)).body.error).toBe('assessment_access_denied');
    expect((await save({ respondentEmail: OTHER.email, status: 'completed' }, 'complete', OTHER)).body.error).toBe('assessment_access_denied');
    expect((await call(event('GET', { claims: OTHER }))).body.data).toEqual([]);
  });

  it('an Admin can read and act on any assessment; the respondent stays the original one', async () => {
    await save();
    expect((await call(event('GET', { query: { assessmentId: 'FIQ-0001-test' }, claims: ADMIN }))).status).toBe(200);
    const done = await save({ status: 'completed', respondentEmail: ADMIN.email }, 'complete', ADMIN);
    expect(done.body.data.respondentEmail).toBe(ME);
  });

  it('returns 404 for an unknown assessment', async () => {
    expect((await call(event('GET', { query: { assessmentId: 'FIQ-none-0000' } }))).status).toBe(404);
  });
});

describe('FinOps IQ assessment API: errors', () => {
  it('a store failure returns a generic 500 and keeps the details in the log', async () => {
    handler = createHandler({ ...memoryStore(), get: async () => { throw new Error('DynamoDB:ConditionalCheckFailed table=FinOpsIqAssessment-internal'); } });
    const res = await save();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/DynamoDB|table=/);
    expect(res.body.requestId).toBe('req-1');
  });
});
