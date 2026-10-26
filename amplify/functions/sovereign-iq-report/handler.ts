/**
 * Sovereign IQ report and backlog (PLAN S6), on the Advisory API behind the Cognito JWT authorizer and the accelerator
 * access check, as FinOps IQ's report service:
 *   GET /api/sovereign-iq/report?assessmentId=...&format=pdf     the report PDF
 *                               &format=csv                      the backlog CSV
 *                               &view=client                     client edition
 * Only a completed (or archived) assessment has a report, built from the result the server stored at completion. A
 * record belongs to its respondent (Admins may read any). Read-only.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess } from '../_shared/resilience-data';
import { withAcceleratorAccess } from '../_shared/access';
import type { SovereignIqV4Result } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4/evaluate';
import { sovereignIqBacklog, sovereignIqReport } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4/report';
import { renderPdf } from '../../../packages/engine-core/src/report/pdf';
import { toCsv } from '../../../packages/engine-core/src/report/csv';
import { appSyncStore, type SovereignAssessmentStore } from '../manage-sovereign-assessment/store';
import { narrativeView } from '../manage-sovereign-assessment/handler';

const FORMATS = new Set(['pdf', 'csv']);
const REPORTABLE = new Set(['completed', 'archived']);

const fileName = (client: string, date: string, view: string, ext: string) =>
  `sovereign-iq-${client.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'assessment'}-${date}${view === 'client' ? '-client' : ''}.${ext}`;

export function createHandler(store: SovereignAssessmentStore) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const requestId = event.requestContext?.requestId || randomUUID();
    const headers = { ...corsHeaders(event, 'OPTIONS,GET', 'X-Request-Id'), 'X-Request-Id': requestId, 'Access-Control-Expose-Headers': 'Content-Disposition,X-Request-Id' };
    const respond = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 => ({ statusCode, headers, body: JSON.stringify({ ...body, requestId }) });
    const method = event.requestContext?.http?.method || 'GET';
    if (method === 'OPTIONS') return respond(200, {});
    if (!authorized(event)) return respond(403, { ok: false, error: 'forbidden' });
    if (method !== 'GET') return respond(405, { ok: false, error: 'method_not_allowed' });

    const q = event.queryStringParameters ?? {};
    const format = q.format || 'pdf';
    const view = q.view === 'client' ? 'client' : 'consultant';
    if (!q.assessmentId) return respond(400, { ok: false, error: 'assessmentId is required' });
    if (!FORMATS.has(format)) return respond(400, { ok: false, error: 'format: expected pdf or csv' });
    try {
      const item = await store.get(q.assessmentId);
      if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
      if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
      if (!REPORTABLE.has(item.status) || !item.resultJson) return respond(409, { ok: false, error: 'assessment_not_completed', message: 'Complete the assessment to produce its report.' });

      const result = JSON.parse(item.resultJson) as SovereignIqV4Result;
      const date = result.assessmentDate ?? String(item.completedAt ?? '').slice(0, 10);
      if (format === 'csv') {
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName(item.clientName, date, view, 'csv')}"`, 'Cache-Control': 'no-store' },
          body: toCsv(sovereignIqBacklog(result, view))
        };
      }
      const doc = sovereignIqReport(result, { client: item.clientName, preparedBy: `LTM consultant (${item.respondentEmail})`, dataProvidedBy: item.clientName, view, notes: view === 'consultant' ? item.consultantNotes ?? undefined : undefined, aiEnabled: !!item.aiEnabled, narrative: narrativeView(item.narrativeJson, true) });
      const pdf = await renderPdf(doc);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName(item.clientName, date, view, 'pdf')}"`, 'Cache-Control': 'no-store' },
        body: pdf.toString('base64'),
        isBase64Encoded: true
      };
    } catch (error: any) {
      console.error('[SovereignIqReport]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_report_error', message: 'The report could not be produced. Please try again.' });
    }
  };
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('sovereign-iq', createHandler(appSyncStore));
