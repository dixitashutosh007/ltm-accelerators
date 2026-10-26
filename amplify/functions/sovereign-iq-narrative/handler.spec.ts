/**
 * Sovereign IQ AI narrative service (PLAN S9): off by default (service and engagement switches), completed
 * assessments only, ownership, the client name removed from the focus, grounded text stored and shown, rejected
 * drafts never stored as text, client mode and the report showing only grounded text, and the AI state on the report.
 * Runs against the in-memory store and a stub model; Bedrock is exercised by the live eval and on deployment.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHandler } from './handler';
import { createHandler as createAssessmentHandler } from '../manage-sovereign-assessment/handler';
import { memoryStore, type SovereignAssessmentStore } from '../manage-sovereign-assessment/store';
import { setPermissionSource } from '../_shared/access';
import { sovereignBrief } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4/narrative';
import { sovereignIqReport } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4/report';
import type { NarrativeModel, NarrativeOutput } from '../../../packages/engine-core/src/ai/narrative';

const ARC1 = (JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design/archetypes.json'), 'utf8')).archetypes as any[]).find(a => a.id === 'ARC1_EU_BANK_DORA')!.answers;
const ME = 'consultant@example.com';
setPermissionSource(async () => ({ take: ['sovereign-iq'] }));

const event = (method: string, body?: unknown, claims: Record<string, unknown> = { email: ME, sub: 'sub-1' }, query?: Record<string, string>): any => ({
  rawPath: '/api/sovereign-iq/narrative', requestContext: { requestId: 'req-1', http: { method }, authorizer: { jwt: { claims } } },
  headers: {}, body: body === undefined ? undefined : JSON.stringify(body), isBase64Encoded: false, queryStringParameters: query
});
const call = async (h: (e: any) => Promise<any>, e: any) => { const r = (await h(e)) as APIGatewayProxyStructuredResultV2; return { status: r.statusCode, body: JSON.parse(String(r.body)) }; };

/** A stub model that records what it was sent and returns the outputs in order. */
function stub(outputs: NarrativeOutput[]) {
  const sent: string[] = [];
  const model: NarrativeModel = { id: 'stub-model', async generate(req) { sent.push(req.user); return { output: outputs[Math.min(sent.length - 1, outputs.length - 1)], stopReason: 'end_turn', modelId: 'stub-model' }; } };
  return { model, sent };
}

let store: SovereignAssessmentStore;
let assessments: ReturnType<typeof createAssessmentHandler>;

async function completed(id = 'SIQ-0001-test') {
  const snapshot = { assessmentId: id, clientName: 'Example Bank', respondentEmail: ME, status: 'completed', startedAt: '2026-10-26T09:00:00Z', request: { mode: 'workshop', answers: ARC1 } };
  const res = await call(assessments, { ...event('POST', { action: 'complete', snapshot }), rawPath: '/api/sovereign-iq/assessment' });
  expect(res.status).toBe(200);
  return res.body.data;
}
const grounded = (r: any): NarrativeOutput => {
  const b = sovereignBrief(r);
  return { summary: `${b.maturity.meaning}.\n\n${b.exposureSummary}`, priorities: b.findings.slice(0, 3).map(f => `${f.title}.`), nextSteps: b.findings.slice(0, 3).map(f => `${f.owner}: ${f.title}.`) };
};

beforeEach(() => {
  store = memoryStore();
  assessments = createAssessmentHandler(store, () => new Date('2026-10-26T10:00:00Z'));
});

describe('Sovereign IQ narrative service', () => {
  it('is off by default: the service switch and the engagement switch both block generation', async () => {
    const a = await completed();
    const off = createHandler(store, { enabled: () => false, model: () => stub([]).model });
    expect((await call(off, event('POST', { action: 'generate', assessmentId: a.assessmentId }))).body.error).toBe('ai_service_off');
    const on = createHandler(store, { enabled: () => true, model: () => stub([]).model });
    expect((await call(on, event('POST', { action: 'generate', assessmentId: a.assessmentId }))).body.error).toBe('ai_off_for_engagement');
    expect(a.aiEnabled).toBe(false);
  });

  it('writes a grounded narrative once switched on, with the client name removed from the focus, and shows it in both views', async () => {
    const a = await completed();
    const s = stub([grounded(a.result)]);
    const h = createHandler(store, { enabled: () => true, model: () => s.model, now: () => new Date('2026-10-26T11:00:00Z') });
    expect((await call(h, event('POST', { action: 'enable', assessmentId: a.assessmentId }))).body.data.aiEnabled).toBe(true);
    const res = await call(h, event('POST', { action: 'generate', assessmentId: a.assessmentId, focus: 'For Example Bank, emphasise DORA' }));
    expect(res.status).toBe(200);
    expect(res.body.data.narrative.summary.length).toBeGreaterThan(10);
    expect(s.sent[0]).toContain('[client], emphasise DORA');
    expect(s.sent[0]).not.toContain('Example Bank');
    const view = async (q: Record<string, string>) => (await call(assessments, { ...event('GET', undefined, undefined, q), rawPath: '/api/sovereign-iq/assessment' })).body.data;
    expect((await view({ assessmentId: a.assessmentId })).narrative.status).toBe('ok');
    const client = await view({ assessmentId: a.assessmentId, view: 'client' });
    expect(client.narrative.narrative.priorities.length).toBeGreaterThan(0);
    expect(client.aiEnabled).toBeUndefined();
  });

  it('never stores or shows a rejected draft', async () => {
    const a = await completed();
    const bad: NarrativeOutput = { summary: 'You are fully compliant, scoring 999.', priorities: ['We recommend AWS.'], nextSteps: ['Done.'] };
    const h = createHandler(store, { enabled: () => true, model: () => stub([bad]).model });
    await call(h, event('POST', { action: 'enable', assessmentId: a.assessmentId }));
    const res = await call(h, event('POST', { action: 'generate', assessmentId: a.assessmentId }));
    expect([res.status, res.body.error]).toEqual([422, 'narrative_rejected']);
    const stored = JSON.parse((await store.get(a.assessmentId))!.narrativeJson!);
    expect([stored.status, stored.narrative]).toEqual(['rejected', null]);
    const client = (await call(assessments, { ...event('GET', undefined, undefined, { assessmentId: a.assessmentId, view: 'client' }), rawPath: '/api/sovereign-iq/assessment' })).body.data;
    expect(client.narrative).toBeNull();
  });

  it('rejects drafts, other people\'s assessments and long focus text', async () => {
    const h = createHandler(store, { enabled: () => true, model: () => stub([]).model });
    const a = await completed();
    expect((await call(h, event('POST', { action: 'enable', assessmentId: a.assessmentId }, { email: 'someone@example.com', sub: 's2' }))).status).toBe(403);
    expect((await call(h, event('POST', { action: 'generate', assessmentId: a.assessmentId, focus: 'x'.repeat(301) }))).status).toBe(400);
    const draft = { assessmentId: 'SIQ-0002-test', clientName: 'Example Bank', respondentEmail: ME, status: 'in_progress', startedAt: '2026-10-26T09:00:00Z', request: { mode: 'workshop', answers: ARC1 } };
    await call(assessments, { ...event('POST', { action: 'save', snapshot: draft }), rawPath: '/api/sovereign-iq/assessment' });
    await call(h, event('POST', { action: 'enable', assessmentId: 'SIQ-0002-test' }));
    expect((await call(h, event('POST', { action: 'generate', assessmentId: 'SIQ-0002-test' }))).body.error).toBe('assessment_not_completed');
  });

  it('the report shows the AI state, and the narrative only when grounded, labelled', async () => {
    const a = await completed();
    const opts = { client: 'X', preparedBy: 'LTM', dataProvidedBy: 'X', view: 'client' as const };
    expect(sovereignIqReport(a.result, opts).meta.status).toMatch(/AI narrative: off/);
    const n = { narrative: grounded(a.result), modelId: 'stub-model', generatedAt: '2026-10-26T11:00:00Z' };
    const doc = sovereignIqReport(a.result, { ...opts, aiEnabled: true, narrative: n });
    expect(doc.meta.status).toMatch(/AI narrative: included, labelled/);
    expect(doc.sections[1].id).toBe('narrative');
    expect(doc.sections[1].title).toMatch(/AI-written/);
  });
});
