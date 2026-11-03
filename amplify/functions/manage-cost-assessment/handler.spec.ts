/**
 * Cost IQ save and resume (CQ1): ownership taken from the token, no cross-user access, server-computed result, immutable
 * completion, delete with the activity pointer, 24-month expiry. Runs against the in-memory store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHandler } from './handler';
import { memoryStore, type CostIqAssessmentStore } from './store';
import { setActivityStore } from '../_shared/activity-recorder.mjs';
import { setPermissionSource, setDomainStore } from '../_shared/access';

const ME = 'consultant@example.com';
const NOW = new Date('2026-11-04T10:00:00Z');
const OTHER = { email: 'other@example.com', sub: 's2' };
const ADMIN = { email: 'admin@example.com', sub: 's3', 'cognito:groups': ['Admin'] };
let store: CostIqAssessmentStore;
let handler: ReturnType<typeof createHandler>;
let activity: { recordAssessment: ReturnType<typeof vi.fn>; removeAssessment: ReturnType<typeof vi.fn> };
let scored: any[];

setPermissionSource(async () => ({ take: ['cost-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

const event = (method: 'GET' | 'POST', opts: { body?: unknown; query?: Record<string, string>; claims?: Record<string, unknown> } = {}): any => ({
  rawPath: '/api/cost-iq/assessment', headers: {},
  requestContext: { requestId: 'r1', http: { method }, authorizer: { jwt: { claims: opts.claims ?? { email: ME, sub: 's1' } } } },
  body: opts.body === undefined ? undefined : JSON.stringify(opts.body), isBase64Encoded: false, queryStringParameters: opts.query
});
const call = async (e: any) => { const r = (await handler(e)) as APIGatewayProxyStructuredResultV2; return { status: r.statusCode, body: JSON.parse(String(r.body)) }; };
const snapshot = (over: Record<string, unknown> = {}) => ({
  assessmentId: 'CIQ-0001-abcd', releaseId: 'COSTIQ-0.7.8', methodologyVersion: '6.6.0', status: 'in_progress', clientName: 'Example Bank',
  selectedAreasJson: JSON.stringify(['Cloud']), answersJson: JSON.stringify({ A1: 'x' }), subjectiveJson: '{}', startedAt: '2026-11-04T09:00:00Z', ...over
});
const save = (over: Record<string, unknown> = {}, action = 'save', claims?: Record<string, unknown>, progress?: unknown) =>
  call(event('POST', { body: { action, snapshot: snapshot(over), progress }, claims }));

beforeEach(() => {
  store = memoryStore();
  scored = [];
  handler = createHandler(store, () => NOW, args => { scored.push(args); return { headlines: { costIQ: 61 } }; });
  activity = { recordAssessment: vi.fn(async () => {}), removeAssessment: vi.fn(async () => {}) };
  setActivityStore(activity as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('Cost IQ assessment API', () => {
  it('saves a draft, lists it without answers, and resumes it with answers', async () => {
    const saved = await save({}, 'save', undefined, { stage: 'Cloud', percent: 30 });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ assessmentId: 'CIQ-0001-abcd', respondentEmail: ME, status: 'in_progress' });
    const list = await call(event('GET'));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].answersJson).toBeUndefined();
    const one = await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }));
    expect(JSON.parse(one.body.data.answersJson)).toEqual({ A1: 'x' });
    expect(activity.recordAssessment).toHaveBeenCalledWith(ME, expect.objectContaining({ accelerator: 'cost-iq', stage: 'Cloud', percent: 30 }));
  });

  it('takes the owner from the token, not the body', async () => {
    const r = await save({ respondentEmail: 'victim@example.com' });
    expect(r.body.data.respondentEmail).toBe(ME);
  });

  it('computes the result on completion from the saved answers and ignores any result the browser sends', async () => {
    const done = await save({ resultJson: JSON.stringify({ headlines: { costIQ: 100 } }) }, 'complete');
    expect(done.status).toBe(200);
    expect(scored).toEqual([{ answers: { A1: 'x' }, scope: { selectedAreas: ['Cloud'] } }]);
    const one = await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }));
    expect(JSON.parse(one.body.data.resultJson).headlines.costIQ).toBe(61);
    expect(one.body.data).toMatchObject({ status: 'completed', completedAt: NOW.toISOString() });
    expect(activity.recordAssessment).toHaveBeenLastCalledWith(ME, expect.objectContaining({ status: 'completed', stage: 'Completed', percent: 100 }));
  });

  it('keeps a completed assessment immutable', async () => {
    await save({}, 'complete');
    expect((await save({ answersJson: '{"A1":"y"}' })).status).toBe(409);
  });

  it('sets expiry 24 months after the change', async () => {
    const r = await save();
    expect(r.body.data.expiresAt).toBe(Math.floor(new Date('2028-11-04T10:00:00Z').getTime() / 1000));
  });

  it("does not let another user read, overwrite, list or delete an assessment", async () => {
    await save();
    expect((await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' }, claims: OTHER }))).status).toBe(403);
    expect((await save({ clientName: 'Hijack' }, 'save', OTHER)).status).toBe(403);
    expect((await call(event('GET', { claims: OTHER }))).body.data).toEqual([]);
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'CIQ-0001-abcd' }, claims: OTHER }))).status).toBe(403);
    expect(await store.get('CIQ-0001-abcd')).not.toBeNull();
  });

  it('refuses a normal user records saved before CQ1, which have no owner', async () => {
    await store.create({ assessmentId: 'CIQ-legacy-01', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: 'm', status: 'in_progress', selectedAreasJson: '[]', answersJson: '{}', startedAt: 'x', updatedAt: 'x' });
    expect((await call(event('GET', { query: { assessmentId: 'CIQ-legacy-01' } }))).status).toBe(403);
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'CIQ-legacy-01' } }))).status).toBe(403);
    // An Admin can read and delete it, but not save it: there is no owner to save it under.
    expect((await call(event('GET', { query: { assessmentId: 'CIQ-legacy-01' }, claims: ADMIN }))).status).toBe(200);
    expect((await save({ assessmentId: 'CIQ-legacy-01' }, 'save', ADMIN)).status).toBe(409);
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'CIQ-legacy-01' }, claims: ADMIN }))).status).toBe(200);
    expect(activity.removeAssessment).not.toHaveBeenCalled();
  });

  it('lets an Admin read and delete any assessment', async () => {
    await save();
    expect((await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' }, claims: ADMIN }))).status).toBe(200);
    expect((await call(event('POST', { body: { action: 'delete', assessmentId: 'CIQ-0001-abcd' }, claims: ADMIN }))).status).toBe(200);
  });

  it("delete removes the record and the owner's activity pointer", async () => {
    await save();
    const del = await call(event('POST', { body: { action: 'delete', assessmentId: 'CIQ-0001-abcd' } }));
    expect(del.body.data).toEqual({ assessmentId: 'CIQ-0001-abcd', deleted: true });
    expect(await store.get('CIQ-0001-abcd')).toBeNull();
    expect(activity.removeAssessment).toHaveBeenCalledWith(ME, 'cost-iq', 'CIQ-0001-abcd');
  });

  it('treats an expired record as deleted', async () => {
    await store.create({ assessmentId: 'CIQ-expired-1', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: 'm', status: 'in_progress', respondentEmail: ME, selectedAreasJson: '[]', answersJson: '{}', startedAt: 'x', updatedAt: 'x', expiresAt: 1 });
    expect((await call(event('GET', { query: { assessmentId: 'CIQ-expired-1' } }))).status).toBe(404);
    expect((await call(event('GET'))).body.data).toEqual([]);
  });

  it('validates the snapshot', async () => {
    expect((await save({ assessmentId: 'x' })).status).toBe(400);
    expect((await save({ releaseId: '' })).status).toBe(400);
    expect((await save({ selectedAreasJson: '{}' })).status).toBe(400);
    expect((await save({ answersJson: '[1]' })).status).toBe(400);
    expect((await save({ answersJson: 'not json' })).status).toBe(400);
    expect((await save({ answersJson: JSON.stringify({ blob: 'x'.repeat(210_000) }) })).status).toBe(400);
  });
});
