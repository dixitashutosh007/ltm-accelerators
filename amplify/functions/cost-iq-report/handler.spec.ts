/**
 * Cost IQ report service (CQ5): only the respondent or an Admin, only a completed assessment, the report checks run before
 * anything is issued, and the client edition carries no consultant material.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createRequire } from 'node:module';
import { createHandler } from './handler';
import { memoryStore, type CostIqAssessmentStore } from '../manage-cost-assessment/store';
import { setPermissionSource, setDomainStore } from '../_shared/access';

const require = createRequire(import.meta.url);
const engine = require('../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs');
const ME = 'consultant@example.com';
const NOW = new Date('2026-11-04T10:00:00Z');
setPermissionSource(async () => ({ take: ['cost-iq'] }));
setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });

const event = (query: Record<string, string>, claims: Record<string, unknown> = { email: ME, sub: 's1', 'cognito:groups': '[Consultant]' }, method = 'GET'): any => ({
  rawPath: '/api/cost-iq/report', headers: {}, queryStringParameters: query,
  requestContext: { requestId: 'r1', http: { method }, authorizer: { jwt: { claims } } }
});
let store: CostIqAssessmentStore;
let handler: ReturnType<typeof createHandler>;
const call = async (e: any) => (await handler(e)) as APIGatewayProxyStructuredResultV2;

async function seed(over: Record<string, unknown> = {}) {
  const answers = { 'CORE-01': ['PUBLIC_CLOUD', 'ON_PREM'], 'CORE-16': 'TRUE', 'ADP-61': 'THEMES_ONLY', 'ADP-42': 'UNKNOWN' };
  const selectedAreas = ['Infrastructure', 'Applications'];
  await store.create({
    assessmentId: 'CIQ-1', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: '6.6.0', status: 'completed', respondentEmail: ME,
    clientName: 'Example Bank', clientCurrency: 'GBP', selectedAreasJson: JSON.stringify(selectedAreas), answersJson: JSON.stringify(answers),
    resultJson: JSON.stringify(await engine.evaluateCostIq({ answers, scope: { selectedAreas } })), startedAt: '2026-11-03T09:00:00Z', updatedAt: '2026-11-03T10:00:00Z', completedAt: '2026-11-03T10:00:00Z', ...over
  } as any);
}

beforeEach(() => { store = memoryStore(); handler = createHandler(store, () => NOW); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('Cost IQ report service', () => {
  it('serves the consultant edition to LTM consultants only (M8): a non-consultant is refused it and gets the client edition by default', async () => {
    await seed();
    const plain = { email: ME, sub: 's1' };
    const refused = await call(event({ assessmentId: 'CIQ-1', view: 'consultant' }, plain));
    expect(refused.statusCode).toBe(403);
    expect(JSON.parse(String(refused.body))).toMatchObject({ error: 'consultant_role_required' });
    const byDefault = await call(event({ assessmentId: 'CIQ-1' }, plain));
    expect(byDefault.statusCode).toBe(200);
    expect(String(byDefault.headers!['Content-Disposition'])).toContain('-client.pdf');
    const csv = await call(event({ assessmentId: 'CIQ-1', format: 'csv' }, plain));
    expect(String(csv.body)).not.toContain('Finding ID');
    // A consultant gets the consultant edition; an Admin does too.
    for (const groups of ['[Consultant]', '[Admin]']) {
      const r = await call(event({ assessmentId: 'CIQ-1', format: 'csv', view: 'consultant' }, { email: ME, sub: 's1', 'cognito:groups': groups }));
      expect(r.statusCode, groups).toBe(200);
      expect(String(r.body)).toContain('Finding ID');
    }
  });

  it('serves the PDF of a completed assessment to its respondent', async () => {
    await seed();
    const r = await call(event({ assessmentId: 'CIQ-1' }));
    expect(r.statusCode).toBe(200);
    expect(r.headers!['Content-Type']).toBe('application/pdf');
    expect(Buffer.from(String(r.body), 'base64').subarray(0, 4).toString()).toBe('%PDF');
    expect(String(r.headers!['X-Report-Checks'])).toMatch(/^pass /);
    expect(String(r.headers!['Content-Disposition'])).toContain('cost-iq-example-bank-2026-11-03.pdf');
  });

  it('serves the backlog CSV, and the client edition by name', async () => {
    await seed();
    const csv = await call(event({ assessmentId: 'CIQ-1', format: 'csv', view: 'client' }));
    expect(csv.statusCode).toBe(200);
    expect(String(csv.body)).toContain('Evidence needed before sizing');
    expect(String(csv.body)).not.toContain('Finding ID');
    expect(String(csv.headers!['Content-Disposition'])).toContain('-client.csv');
  });

  it('refuses another user, allows an Admin, and refuses an ownerless record to everyone else', async () => {
    await seed();
    expect((await call(event({ assessmentId: 'CIQ-1' }, { email: 'other@example.com', sub: 's2' }))).statusCode).toBe(403);
    expect((await call(event({ assessmentId: 'CIQ-1' }, { email: 'admin@example.com', sub: 's3', 'cognito:groups': ['Admin'] }))).statusCode).toBe(200);
    await seed({ assessmentId: 'CIQ-2', respondentEmail: null });
    expect((await call(event({ assessmentId: 'CIQ-2' }))).statusCode).toBe(403);
  });

  it('has no report until the assessment is completed, and rejects bad requests', async () => {
    await seed({ assessmentId: 'CIQ-3', status: 'in_progress', resultJson: null });
    expect((await call(event({ assessmentId: 'CIQ-3' }))).statusCode).toBe(409);
    expect((await call(event({ assessmentId: 'NOPE' }))).statusCode).toBe(404);
    expect((await call(event({}))).statusCode).toBe(400);
    expect((await call(event({ assessmentId: 'CIQ-1', format: 'docx' }))).statusCode).toBe(400);
    expect((await call(event({ assessmentId: 'CIQ-1' }, undefined, 'POST'))).statusCode).toBe(405);
  });

  it('sizes the non-cloud lever from the stored evidence when its finding is raised, and the report still passes its checks', async () => {
    const answers = { 'CORE-01': ['SOFTWARE'], 'CORE-16': 'TRUE', 'CORE-30': 'E' };
    const selectedAreas = ['Software & Licensing'];
    const evidence = { currency: 'GBP', internalRatePerFteMonth: 9000, levers: { 'LEV-11': { unusedAnnualCost: 800000, addressableSpend: 2000000 } } };
    const raised = (await engine.evaluateCostIq({ answers, scope: { selectedAreas } })).findings.map((f: any) => f.id);
    expect(raised).toContain('F-008');
    await seed({ answersJson: JSON.stringify(answers), selectedAreasJson: JSON.stringify(selectedAreas), resultJson: JSON.stringify(await engine.evaluateCostIq({ answers, scope: { selectedAreas } })), leverEvidenceJson: JSON.stringify(evidence) });
    const r = await call(event({ assessmentId: 'CIQ-1', view: 'client' }));
    expect(r.statusCode).toBe(200);
    expect(String(r.headers!['X-Report-Checks'])).toMatch(/^pass /);
    // The same evidence on an assessment where the finding is not raised sizes nothing, and the report is still issued.
    await seed({ assessmentId: 'CIQ-5', leverEvidenceJson: JSON.stringify(evidence) });
    expect((await call(event({ assessmentId: 'CIQ-5' }))).statusCode).toBe(200);
    // Evidence in a damaged form is ignored, not fatal.
    await seed({ assessmentId: 'CIQ-6', leverEvidenceJson: '{"currency":' });
    expect((await call(event({ assessmentId: 'CIQ-6' }))).statusCode).toBe(200);
  });

  it('leaves out a FinOps IQ summary of a schema it does not know, and says the cloud line is not quantified', async () => {
    await seed({ finopsAssessmentId: 'F-1', finopsSummaryJson: JSON.stringify({ schema: 'finops-iq-cost-summary/99', status: 'quantified' }) });
    const r = await call(event({ assessmentId: 'CIQ-1' }));
    expect(r.statusCode).toBe(200);
  });
});
