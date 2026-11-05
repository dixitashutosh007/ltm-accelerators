/**
 * Cost IQ AI narrative service (CQ8): off by default (service and engagement switches), completed assessments only,
 * ownership, the client name removed from the focus, grounded text stored, rejected drafts never stored as text, and the
 * report showing the narrative only when it passed the grounding check. Runs against the in-memory store and a stub
 * model; Bedrock is exercised by the live eval and on deployment.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createRequire } from 'node:module';
import { createHandler } from './handler';
import { memoryStore, type CostIqAssessmentStore } from '../manage-cost-assessment/store';
import { setPermissionSource, setDomainStore } from '../_shared/access';
import { costBrief } from '../../../packages/engine-core/src/accelerators/cost-iq/narrative';
import { costIqReport } from '../../../packages/engine-core/src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../../../packages/engine-core/src/report-checks/accelerators';
import type { NarrativeModel, NarrativeOutput } from '../../../packages/engine-core/src/ai/narrative';

const require = createRequire(import.meta.url);
const engine = require('../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs');
const ME = 'consultant@example.com';
setPermissionSource(async () => ({ take: ['cost-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

const event = (body: unknown, claims: Record<string, unknown> = { email: ME, sub: 's1' }): any => ({
  rawPath: '/api/cost-iq/narrative', requestContext: { requestId: 'r1', http: { method: 'POST' }, authorizer: { jwt: { claims } } },
  headers: {}, body: JSON.stringify(body), isBase64Encoded: false
});
const call = async (h: (e: any) => Promise<any>, e: any) => { const r = (await h(e)) as APIGatewayProxyStructuredResultV2; return { status: r.statusCode, body: JSON.parse(String(r.body)) }; };
function stub(outputs: NarrativeOutput[]) {
  const sent: string[] = [];
  const model: NarrativeModel = { id: 'stub-model', async generate(req) { sent.push(req.user); return { output: outputs[Math.min(sent.length - 1, outputs.length - 1)], stopReason: 'end_turn', modelId: 'stub-model' }; } };
  return { model, sent };
}

let store: CostIqAssessmentStore;
let result: any;
const NOW = new Date('2026-11-05T11:00:00Z');

async function seed(id = 'CIQ-1', status = 'completed') {
  const answers = { 'CORE-01': ['PUBLIC_CLOUD', 'ON_PREM'], 'CORE-16': 'TRUE', 'ADP-61': 'THEMES_ONLY', 'ADP-42': 'UNKNOWN' };
  const selectedAreas = ['Infrastructure', 'Applications'];
  result = await engine.evaluateCostIq({ answers, scope: { selectedAreas } });
  await store.create({
    assessmentId: id, acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: '6.6.0', status, respondentEmail: ME, clientName: 'Example Bank',
    selectedAreasJson: JSON.stringify(selectedAreas), answersJson: JSON.stringify(answers), resultJson: JSON.stringify(result),
    startedAt: '2026-11-03T09:00:00Z', updatedAt: '2026-11-03T10:00:00Z'
  } as any);
}
const grounded = (): NarrativeOutput => {
  const b = costBrief(result);
  return {
    summary: `The Cost IQ score is ${b.scores.costIQ}. ${b.findings[0]?.title ?? 'No finding was raised'}.`,
    priorities: b.findings.slice(0, 3).map(f => `${f.title}.`),
    nextSteps: b.recommendations.slice(0, 3).map(x => `The CIO to review: ${x.title}.`)
  };
};
const handler = (model: NarrativeModel, enabled = true) => createHandler(store, { enabled: () => enabled, model: () => model, now: () => NOW });

beforeEach(() => { store = memoryStore(); });

describe('Cost IQ narrative service', () => {
  it('is off by default: the service switch and the engagement switch both block generation', async () => {
    await seed();
    expect((await call(handler(stub([]).model, false), event({ action: 'generate', assessmentId: 'CIQ-1' }))).body.error).toBe('ai_service_off');
    expect((await call(handler(stub([]).model), event({ action: 'generate', assessmentId: 'CIQ-1' }))).body.error).toBe('ai_off_for_engagement');
    expect((await store.get('CIQ-1'))!.aiEnabled).toBeFalsy();
  });

  it('writes a grounded narrative once switched on, removes the client name from the focus, and moves the retention', async () => {
    await seed();
    const s = stub([grounded()]);
    const h = handler(s.model);
    expect((await call(h, event({ action: 'enable', assessmentId: 'CIQ-1' }))).body.data.aiEnabled).toBe(true);
    const res = await call(h, event({ action: 'generate', assessmentId: 'CIQ-1', focus: 'For Example Bank, stress governance' }));
    expect(res.status).toBe(200);
    expect(res.body.data.narrative.summary.length).toBeGreaterThan(10);
    expect(s.sent[0]).toContain('[client], stress governance');
    expect(s.sent[0]).not.toContain('Example Bank');
    const rec = (await store.get('CIQ-1'))!;
    expect(JSON.parse(rec.narrativeJson!).status).toBe('ok');
    expect(rec.expiresAt).toBeGreaterThan(Math.floor(NOW.getTime() / 1000) + 23 * 30 * 86400);
  });

  it('never stores a rejected draft as text: an invented figure, vendor or promise fails closed', async () => {
    await seed();
    const bad: NarrativeOutput = { summary: 'The organisation will save 40% with Broadcom pricing.', priorities: ['Cut costs by 999.'], nextSteps: ['Done.'] };
    const h = handler(stub([bad]).model);
    await call(h, event({ action: 'enable', assessmentId: 'CIQ-1' }));
    const res = await call(h, event({ action: 'generate', assessmentId: 'CIQ-1' }));
    expect([res.status, res.body.error]).toEqual([422, 'narrative_rejected']);
    const stored = JSON.parse((await store.get('CIQ-1'))!.narrativeJson!);
    expect([stored.status, stored.narrative]).toEqual(['rejected', null]);
  });

  it('refuses other people\'s assessments, long focus text and assessments that are not completed', async () => {
    await seed(); await seed('CIQ-2', 'draft');
    const h = handler(stub([]).model);
    expect((await call(h, event({ action: 'enable', assessmentId: 'CIQ-1' }, { email: 'someone@example.com', sub: 's2' }))).status).toBe(403);
    expect((await call(h, event({ action: 'generate', assessmentId: 'CIQ-1', focus: 'x'.repeat(301) }))).status).toBe(400);
    await call(h, event({ action: 'enable', assessmentId: 'CIQ-2' }));
    expect((await call(h, event({ action: 'generate', assessmentId: 'CIQ-2' }))).body.error).toBe('assessment_not_completed');
  });

  it('the brief holds no answers, notes, client name or money figure', async () => {
    await seed();
    const json = JSON.stringify(costBrief(result));
    expect(json).not.toMatch(/Example Bank|answers|consultantNotes|CORE-\d+|ADP-\d+|CLM-/);
  });

  it('the report shows the narrative, labelled, only when one passed the grounding check, and still passes the report checks', async () => {
    await seed();
    const answers = JSON.parse((await store.get('CIQ-1'))!.answersJson);
    const input = { result, answers, selectedAreas: ['Infrastructure', 'Applications'], scope: engine.scopeCounts({ answers, scope: { selectedAreas: ['Infrastructure', 'Applications'] } }), assessmentDate: '2026-11-05', finops: null };
    const opts = { client: 'X', preparedBy: 'LTM', dataProvidedBy: 'X', view: 'client' as const };
    expect(costIqReport(input as any, opts).sections.some(s => s.id === 'narrative')).toBe(false);
    const n = { narrative: grounded(), modelId: 'stub-model', generatedAt: '2026-11-05T11:00:00Z' };
    const doc = costIqReport(input as any, { ...opts, aiEnabled: true, narrative: n });
    expect(doc.sections[1].id).toBe('narrative');
    expect(doc.sections[1].title).toMatch(/AI-written/);
    expect(JSON.stringify(doc)).toContain('Amazon Bedrock in India');
    expect(checkCostIqReport(doc, input as any, 'client', '2026-11-05').failures).toEqual([]);
  });
});
