/**
 * FinOps IQ report route (execution phase M4): PDF and backlog CSV only for a completed assessment, built from the
 * stored result; ownership as for save and resume; the client edition carries no consultant-only content.
 * Runs in Vitest against the in-memory store, with assessments completed through the save and resume handler.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHandler } from './handler';
import { createHandler as createAssessmentHandler } from '../manage-finops-assessment/handler';
import { memoryStore, type FinOpsAssessmentStore } from '../manage-finops-assessment/store';
import { BACKLOG_HEADER } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/report';

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
const OTHER = { email: 'someone.else@example.com', sub: 'sub-2' };
const ADMIN = { email: 'admin@example.com', sub: 'sub-9', 'cognito:groups': ['Admin'] };
const ID = 'FIQ-0001-test';
let store: FinOpsAssessmentStore;
let handler: ReturnType<typeof createHandler>;

function event(method: string, query?: Record<string, string>, claims: Record<string, unknown> = { email: ME, sub: 'sub-1' }): any {
  return { requestContext: { requestId: 'req-1', http: { method }, authorizer: { jwt: { claims } } }, headers: {}, isBase64Encoded: false, queryStringParameters: query };
}
const call = async (e: any) => (await handler(e)) as APIGatewayProxyStructuredResultV2;
const json = (res: APIGatewayProxyStructuredResultV2) => JSON.parse(String(res.body));

async function saveAs(status: 'in_progress' | 'completed', over: Record<string, unknown> = {}) {
  const assess = createAssessmentHandler(store, () => new Date('2026-10-20T10:00:00Z'));
  const snapshot = { assessmentId: ID, clientName: 'Example Bank, "Group" plc', respondentEmail: ME, status, startedAt: '2026-10-20T09:00:00Z', request: scenarioRequest('RS4'), ...over };
  const res = (await assess({ requestContext: { requestId: 'r', http: { method: 'POST' }, authorizer: { jwt: { claims: { email: ME, sub: 'sub-1' } } } }, headers: {}, body: JSON.stringify({ action: status === 'completed' ? 'complete' : 'save', snapshot }) } as any)) as APIGatewayProxyStructuredResultV2;
  expect(res.statusCode).toBe(200);
}

beforeEach(() => {
  store = memoryStore();
  handler = createHandler(store);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('FinOps IQ report API', () => {
  it('returns the report PDF of a completed assessment, as a base64 attachment with a safe file name', async () => {
    await saveAs('completed');
    const res = await call(event('GET', { assessmentId: ID }));
    expect(res.statusCode).toBe(200);
    expect(res.isBase64Encoded).toBe(true);
    expect(res.headers!['Content-Type']).toBe('application/pdf');
    expect(res.headers!['Content-Disposition']).toBe('attachment; filename="finops-iq-example-bank-group-plc-2026-10-20.pdf"');
    expect(res.headers!['Cache-Control']).toBe('no-store');
    expect(Buffer.from(String(res.body), 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  }, 30_000);

  it('marks a report that passed the automated checks (REPORT-VALIDATION.md, Layer 1)', async () => {
    await saveAs('completed');
    const res = await call(event('GET', { assessmentId: ID }));
    expect(res.statusCode).toBe(200);
    expect(res.headers!['X-Report-Checks']).toMatch(/^pass R1 R2 R3 R4 R5 R7$/);
  }, 30_000);

  it('does not issue a report that fails an automated check: 422 with the reason, details in the log', async () => {
    await saveAs('completed');
    // A stored result whose levers no longer sum to the headline (R3).
    const item = (await store.get(ID))!;
    const result = JSON.parse(item.resultJson!);
    result.value.totals.expected.grossRunRate.value += 1000;
    await store.update({ assessmentId: ID, resultJson: JSON.stringify(result) });
    const res = await call(event('GET', { assessmentId: ID }));
    expect(res.statusCode).toBe(422);
    const body = json(res);
    expect(body.error).toBe('report_checks_failed');
    expect(body.message).toMatch(/^The report was not issued: \d+ automated checks? failed \(.*R3.*\)/);
    expect(console.error).toHaveBeenCalledWith('[FinOpsIqReport] report checks failed', expect.objectContaining({ assessmentId: ID }));
  }, 30_000);

  it('returns the backlog CSV, client edition marked in the file name', async () => {
    await saveAs('completed');
    const res = await call(event('GET', { assessmentId: ID, format: 'csv', view: 'client' }));
    expect(res.statusCode).toBe(200);
    expect(res.headers!['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(res.headers!['Content-Disposition']).toMatch(/-client\.csv"$/);
    expect(String(res.body).startsWith('﻿' + BACKLOG_HEADER.map(h => (/[",]/.test(h) ? `"${h}"` : h)).join(','))).toBe(true);
  });

  it('the client edition PDF differs from the consultant edition (no consultant checks)', async () => {
    await saveAs('completed');
    const consultant = Buffer.from(String((await call(event('GET', { assessmentId: ID }))).body), 'base64');
    const client = Buffer.from(String((await call(event('GET', { assessmentId: ID, view: 'client' }))).body), 'base64');
    expect(client.length).toBeLessThan(consultant.length);
  }, 30_000);

  it('a draft or in-progress assessment has no report', async () => {
    await saveAs('in_progress');
    const res = await call(event('GET', { assessmentId: ID }));
    expect(res.statusCode).toBe(409);
    expect(json(res).error).toBe('assessment_not_completed');
  });

  it('gives no report for an assessment past its retention date (M6)', async () => {
    await saveAs('completed');
    await store.update({ assessmentId: ID, expiresAt: Math.floor(Date.now() / 1000) - 1 });
    expect((await call(event('GET', { assessmentId: ID }))).statusCode).toBe(404);
  });

  it('checks the request: assessment ID, format and method', async () => {
    expect((await call(event('GET', {}))).statusCode).toBe(400);
    expect((await call(event('GET', { assessmentId: ID, format: 'docx' }))).statusCode).toBe(400);
    expect((await call(event('POST', { assessmentId: ID }))).statusCode).toBe(405);
    expect((await call(event('GET', { assessmentId: 'FIQ-none-0000' }))).statusCode).toBe(404);
  });

  it('only the respondent or an Admin can download; callers without identity are refused', async () => {
    await saveAs('completed');
    expect((await call(event('GET', { assessmentId: ID, format: 'csv' }, OTHER))).statusCode).toBe(403);
    expect((await call(event('GET', { assessmentId: ID, format: 'csv' }, ADMIN))).statusCode).toBe(200);
    expect((await call(event('GET', { assessmentId: ID }, {}))).statusCode).toBe(403);
  });

  it('a store failure returns a generic 500 and keeps the details in the log', async () => {
    handler = createHandler({ ...memoryStore(), get: async () => { throw new Error('DynamoDB:Throttled table=FinOpsIqAssessment-internal'); } });
    const res = await call(event('GET', { assessmentId: ID }));
    expect(res.statusCode).toBe(500);
    expect(String(res.body)).not.toMatch(/DynamoDB|table=/);
  });
});
