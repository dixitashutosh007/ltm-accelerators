/**
 * Saved sessions (platform workstream P3): ownership, accelerator separation, access check, delete removing the
 * activity pointer, resume restoring the stage. Runs against the in-memory store; AppSync is exercised on deployment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHandler, ACCELERATORS } from './handler';
import { memoryStore, type SavedSessionStore } from './store';
import { setActivityStore } from '../_shared/activity-recorder.mjs';
import { setPermissionSource, setDomainStore } from '../_shared/access';

const ME = 'consultant@example.com';
const OTHER = 'other@example.com';
const NOW = new Date('2026-11-03T10:00:00Z');
let store: SavedSessionStore;
let handler: ReturnType<typeof createHandler>;
let activity: { recordAssessment: ReturnType<typeof vi.fn>; removeAssessment: ReturnType<typeof vi.fn> };

setPermissionSource(async () => ({ take: ['cost-iq', 'strategy-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

function event(method: 'GET' | 'POST', opts: { body?: unknown; query?: Record<string, string>; claims?: Record<string, unknown> } = {}): any {
  return {
    rawPath: '/api/sessions',
    requestContext: { requestId: 'req-1', http: { method }, authorizer: { jwt: { claims: opts.claims ?? { email: ME, sub: 'sub-1' } } } },
    headers: {}, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), isBase64Encoded: false, queryStringParameters: opts.query
  };
}
async function call(e: any) {
  const res = (await handler(e)) as APIGatewayProxyStructuredResultV2;
  return { status: res.statusCode, body: JSON.parse(String(res.body)) };
}
const session = (over: Record<string, unknown> = {}) => ({ sessionId: 'sess-0001-abc', title: 'Example Bank', status: 'in_progress', payload: { answers: { q1: 'a' } }, ...over });
const save = (over: Record<string, unknown> = {}, accelerator = 'cost-iq', claims?: Record<string, unknown>, progress?: unknown) =>
  call(event('POST', { body: { accelerator, action: 'save', session: session(over), progress }, claims }));
const OTHER_CLAIMS = { email: OTHER, sub: 'sub-2' };
const ADMIN_CLAIMS = { email: 'admin@example.com', sub: 'sub-3', 'cognito:groups': ['Admin'] };

beforeEach(() => {
  store = memoryStore();
  handler = createHandler(store, () => NOW);
  activity = { recordAssessment: vi.fn(async () => {}), removeAssessment: vi.fn(async () => {}) };
  setActivityStore(activity as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('saved sessions API', () => {
  it('saves, lists without the payload, and resumes with the payload and the stage reached', async () => {
    const saved = await save({}, 'cost-iq', undefined, { stage: 'Spend by service', percent: 40 });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ sessionId: 'sess-0001-abc', accelerator: 'cost-iq', ownerEmail: ME, stage: 'Spend by service', percent: 40 });
    expect(saved.body.data.payloadJson).toBeUndefined();
    const list = await call(event('GET', { query: { accelerator: 'cost-iq' } }));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].payload).toBeUndefined();
    const one = await call(event('GET', { query: { accelerator: 'cost-iq', sessionId: 'sess-0001-abc' } }));
    expect(one.body.data).toMatchObject({ stage: 'Spend by service', percent: 40, payload: { answers: { q1: 'a' } } });
    expect(activity.recordAssessment).toHaveBeenCalledWith(ME, expect.objectContaining({ accelerator: 'cost-iq', assessmentId: 'sess-0001-abc', stage: 'Spend by service', percent: 40 }));
  });

  it('sets expiry 90 days after the save and a second save updates the same session', async () => {
    await save();
    const again = await save({ title: 'Renamed' });
    expect(again.status).toBe(200);
    const one = await call(event('GET', { query: { accelerator: 'cost-iq', sessionId: 'sess-0001-abc' } }));
    expect(one.body.data.title).toBe('Renamed');
    expect(one.body.data.expiresAt).toBe(Math.floor(NOW.getTime() / 1000) + 90 * 86400);
  });

  it('records a completed session at 100 percent whatever the page sent', async () => {
    await save({ status: 'completed' }, 'cost-iq', undefined, { stage: 'x', percent: 3 });
    expect(activity.recordAssessment).toHaveBeenCalledWith(ME, expect.objectContaining({ status: 'completed', stage: 'Completed', percent: 100 }));
  });

  it("does not let another user read, overwrite, list or delete a session", async () => {
    await save();
    const read = await call(event('GET', { query: { accelerator: 'cost-iq', sessionId: 'sess-0001-abc' }, claims: OTHER_CLAIMS }));
    expect(read.status).toBe(403);
    const overwrite = await save({ title: 'Hijacked' }, 'cost-iq', OTHER_CLAIMS);
    expect(overwrite.status).toBe(403);
    const list = await call(event('GET', { query: { accelerator: 'cost-iq' }, claims: OTHER_CLAIMS }));
    expect(list.body.data).toEqual([]);
    const del = await call(event('POST', { body: { accelerator: 'cost-iq', action: 'delete', sessionId: 'sess-0001-abc' }, claims: OTHER_CLAIMS }));
    expect(del.status).toBe(403);
    expect(await store.get('sess-0001-abc')).not.toBeNull();
    expect(activity.removeAssessment).not.toHaveBeenCalled();
  });

  it('lets an Admin read and delete any session', async () => {
    await save();
    const read = await call(event('GET', { query: { accelerator: 'cost-iq', sessionId: 'sess-0001-abc' }, claims: ADMIN_CLAIMS }));
    expect(read.status).toBe(200);
    const del = await call(event('POST', { body: { accelerator: 'cost-iq', action: 'delete', sessionId: 'sess-0001-abc' }, claims: ADMIN_CLAIMS }));
    expect(del.status).toBe(200);
    expect(await store.get('sess-0001-abc')).toBeNull();
  });

  it("delete removes the record and the owner's activity pointer", async () => {
    await save();
    const del = await call(event('POST', { body: { accelerator: 'cost-iq', action: 'delete', sessionId: 'sess-0001-abc' } }));
    expect(del.body.data).toEqual({ sessionId: 'sess-0001-abc', deleted: true });
    expect(await store.get('sess-0001-abc')).toBeNull();
    expect(activity.removeAssessment).toHaveBeenCalledWith(ME, 'cost-iq', 'sess-0001-abc');
    expect((await call(event('GET', { query: { accelerator: 'cost-iq', sessionId: 'sess-0001-abc' } }))).status).toBe(404);
  });

  it('keeps accelerators apart: a session id is not found under another accelerator', async () => {
    await save();
    expect((await call(event('GET', { query: { accelerator: 'strategy-iq', sessionId: 'sess-0001-abc' } }))).status).toBe(404);
    expect((await save({ title: 'Other' }, 'strategy-iq')).status).toBe(403);
    expect((await call(event('POST', { body: { accelerator: 'strategy-iq', action: 'delete', sessionId: 'sess-0001-abc' } }))).status).toBe(404);
  });

  it('refuses an unknown accelerator, a missing identity, and a caller without access to the accelerator', async () => {
    expect((await save({}, 'finops-iq')).status).toBe(400);
    expect((await save({}, 'cloud-iq')).status).toBe(403); // permissions above grant only cost-iq and strategy-iq
    const anon = await call({ ...event('POST', { body: { accelerator: 'cost-iq', session: session() } }), requestContext: { requestId: 'r', http: { method: 'POST' } } });
    expect(anon.status).toBe(401);
  });

  it('validates the session and caps its size', async () => {
    expect((await save({ sessionId: 'x' })).status).toBe(400);
    expect((await save({ title: '  ' })).status).toBe(400);
    expect((await save({ payload: 'text' })).status).toBe(400);
    expect((await save({ payload: { blob: 'x'.repeat(310_000) } })).status).toBe(413);
  });

  it('serves the five accelerators that had no server-side save', () => {
    expect([...ACCELERATORS].sort()).toEqual(['ai-readiness-iq', 'cloud-iq', 'cost-iq', 'modernization-iq', 'strategy-iq']);
  });
});
