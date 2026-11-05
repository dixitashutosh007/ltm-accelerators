/**
 * Cost IQ save and resume (CQ1): ownership taken from the token, no cross-user access, server-computed result, immutable
 * completion, delete with the activity pointer, 24-month expiry. Runs against the in-memory store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHandler } from './handler';
import { memoryStore, type CostIqAssessmentStore } from './store';
import { memoryStore as finopsMemoryStore, type FinOpsAssessmentStore } from '../manage-finops-assessment/store';
import { evaluateFinOpsIqV3 } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/evaluate';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setActivityStore } from '../_shared/activity-recorder.mjs';
import { setPermissionSource, setDomainStore } from '../_shared/access';

const ME = 'consultant@example.com';
const NOW = new Date('2026-11-04T10:00:00Z');
const OTHER = { email: 'other@example.com', sub: 's2' };
const ADMIN = { email: 'admin@example.com', sub: 's3', 'cognito:groups': ['Admin'] };
let store: CostIqAssessmentStore;
let finopsStore: FinOpsAssessmentStore;
let handler: ReturnType<typeof createHandler>;
let activity: { recordAssessment: ReturnType<typeof vi.fn>; removeAssessment: ReturnType<typeof vi.fn> };
let scored: any[];

const NO_FINOPS = 'nofinops@example.com';
setPermissionSource(async email => (email === NO_FINOPS ? { take: ['cost-iq'] } : { take: ['cost-iq', 'finops-iq'] }));
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
  finopsStore = finopsMemoryStore() as any;
  handler = createHandler(store, () => NOW, args => { scored.push(args); return { headlines: { costIQ: 61 } }; }, finopsStore);
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

describe('Cost IQ links a FinOps IQ result as its cloud line (shared value model, stage 2)', () => {
  const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
  const CODE: Record<string, string> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
  const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
  const UN08: Record<string, any> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
  const run = () => {
    for (const sc of SCENARIOS) {
      const answers = Object.fromEntries(Object.entries<string>(sc.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
      const r = evaluateFinOpsIqV3({ mode: sc.mode, facts: sc.inputs.facts, answers: answers as any, assessmentDate: '2026-10-14' });
      if (r.value.moneyShown && r.value.status === 'quantified') return r;
    }
    throw new Error('no reference scenario shows money');
  };
  const finopsRecord = (over: Record<string, unknown> = {}) => ({
    assessmentId: 'FIQ-0001-done', clientName: 'Example Bank', respondentEmail: ME, status: 'completed', mode: 'workshop', engineVersion: 'x',
    requestJson: '{}', startedAt: '2026-10-14T00:00:00Z', completedAt: '2026-10-14T01:00:00Z', resultJson: JSON.stringify(run()), ...over
  }) as any;
  const link = (claims?: Record<string, unknown>, ids: { a?: string; f?: string } = {}) =>
    call(event('POST', { body: { action: 'link_finops', assessmentId: ids.a ?? 'CIQ-0001-abcd', finopsAssessmentId: ids.f ?? 'FIQ-0001-done' }, claims }));

  it("lists the caller's completed FinOps IQ assessments, and only theirs", async () => {
    await finopsStore.create(finopsRecord());
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0002-draft', status: 'in_progress', resultJson: null }));
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0003-other', respondentEmail: OTHER.email }));
    const list = await call(event('GET', { query: { finopsSessions: '1' } }));
    expect(list.body.data.map((x: any) => x.assessmentId)).toEqual(['FIQ-0001-done']);
    expect(list.body.data[0].resultJson).toBeUndefined();
  });

  it("stores FinOps IQ's own figures as the summary, and never recomputes them", async () => {
    await save();
    await finopsStore.create(finopsRecord());
    const r = await link();
    expect(r.status).toBe(200);
    const one = await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }));
    expect(one.body.data.finopsAssessmentId).toBe('FIQ-0001-done');
    const summary = JSON.parse(one.body.data.finopsSummaryJson);
    const engine = run();
    expect(summary.schema).toBe('finops-iq-cost-summary/1');
    expect(summary.status).toBe('quantified');
    expect(summary.cases.expected.grossRunRate.value).toBe(engine.value.totals!.expected.grossRunRate.value);
    expect(scored).toEqual([]);
  });

  it('refuses another user\'s FinOps IQ assessment, an unfinished one, and a caller with no FinOps IQ access', async () => {
    await save();
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0003-other', respondentEmail: OTHER.email }));
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0002-draft', status: 'in_progress', resultJson: null }));
    expect((await link(undefined, { f: 'FIQ-0003-other' })).status).toBe(403);
    expect((await link(undefined, { f: 'FIQ-0002-draft' })).status).toBe(409);
    expect((await link(undefined, { f: 'FIQ-9999-none' })).status).toBe(404);
    const noFinops = { email: NO_FINOPS, sub: 's9' };
    await call(event('POST', { body: { action: 'save', snapshot: snapshot({ assessmentId: 'CIQ-0009-nofin' }) }, claims: noFinops }));
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0009-nofin', respondentEmail: NO_FINOPS }));
    expect((await link(noFinops, { a: 'CIQ-0009-nofin', f: 'FIQ-0009-nofin' })).status).toBe(403);
    expect((await call(event('GET', { query: { finopsSessions: '1' }, claims: noFinops }))).status).toBe(403);
    expect(JSON.parse((await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data.finopsSummaryJson ?? 'null')).toBeNull();
  });

  it("does not let a user link into someone else's Cost IQ assessment", async () => {
    await save();
    await finopsStore.create(finopsRecord());
    await finopsStore.create(finopsRecord({ assessmentId: 'FIQ-0004-oth2', respondentEmail: OTHER.email }));
    expect((await link(OTHER, { f: 'FIQ-0004-oth2' })).status).toBe(403);
  });

  it('links after completion without touching the answers or the Cost IQ result', async () => {
    await save({}, 'complete');
    await finopsStore.create(finopsRecord());
    const before = (await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data;
    expect((await link()).status).toBe(200);
    const after = (await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data;
    expect(after.status).toBe('completed');
    expect(after.answersJson).toBe(before.answersJson);
    expect(after.resultJson).toBe(before.resultJson);
    expect(after.finopsAssessmentId).toBe('FIQ-0001-done');
    expect((await save({ answersJson: JSON.stringify({ A1: 'z' }) })).status).toBe(409);
  });

  it('lets the owner unlink, which removes the summary', async () => {
    await save();
    await finopsStore.create(finopsRecord());
    await link();
    expect((await call(event('POST', { body: { action: 'unlink_finops', assessmentId: 'CIQ-0001-abcd' } }))).status).toBe(200);
    const one = await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }));
    expect(one.body.data.finopsAssessmentId ?? null).toBeNull();
    expect(one.body.data.finopsSummaryJson ?? null).toBeNull();
  });

  describe('non-cloud lever evidence', () => {
    const evidence = (over: Record<string, unknown> = {}) => ({ currency: 'GBP', internalRatePerFteMonth: 9000, levers: { 'LEV-11': { unusedAnnualCost: 800000, addressableSpend: 2000000 } }, ...over });
    const setEv = (e: unknown, claims?: Record<string, unknown>) => call(event('POST', { body: { action: 'set_lever_evidence', assessmentId: 'CIQ-0001-abcd', evidence: e }, claims }));

    it('stores the measured figures for the owner without touching answers or result, keeps them across a save, and clears them', async () => {
      await save({ clientCurrency: 'GBP' });
      const before = (await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data;
      expect((await setEv(evidence())).status).toBe(200);
      const after = (await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data;
      expect(JSON.parse(after.leverEvidenceJson).levers['LEV-11'].unusedAnnualCost).toBe(800000);
      expect(after.answersJson).toBe(before.answersJson);
      await save({ clientCurrency: 'GBP', answersJson: JSON.stringify({ A1: 'q' }) });
      expect(JSON.parse((await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data.leverEvidenceJson).currency).toBe('GBP');
      expect((await setEv(null)).status).toBe(200);
      expect((await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }))).body.data.leverEvidenceJson ?? null).toBeNull();
    });

    it('refuses unknown levers, negative or non-numeric money, a share above one, and a currency other than the assessment\'s', async () => {
      await save({ clientCurrency: 'GBP' });
      for (const bad of [evidence({ levers: { 'LEV-09': { unusedAnnualCost: 1 } } }), evidence({ levers: { 'LEV-11': { unusedAnnualCost: -1 } } }), evidence({ levers: { 'LEV-11': { unusedAnnualCost: '9' } } }),
        evidence({ levers: { 'LEV-11': { unusedAnnualCost: 1, renewingYear1Share: 1.5 } } }), evidence({ internalRatePerFteMonth: -3 }), evidence({ currency: 'USD' }), 'x'])
        expect((await setEv(bad)).status, JSON.stringify(bad)).toBe(400);
    });

    it('refuses someone else\'s assessment', async () => {
      await save({ clientCurrency: 'GBP' });
      expect((await setEv(evidence(), OTHER)).status).toBe(403);
    });
  });

  it('keeps the linked summary when the assessment is saved again, and carries nothing consultant-only', async () => {
    await save();
    await finopsStore.create(finopsRecord());
    await link();
    await save({ answersJson: JSON.stringify({ A1: 'y' }) });
    const one = await call(event('GET', { query: { assessmentId: 'CIQ-0001-abcd' } }));
    expect(one.body.data.finopsAssessmentId).toBe('FIQ-0001-done');
    expect(one.body.data.finopsSummaryJson).not.toContain('"hypothesis"');
  });
});

