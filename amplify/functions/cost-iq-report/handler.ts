/**
 * Cost IQ report and backlog (CQ5), on the Advisory API behind the Cognito JWT authorizer and the accelerator access
 * check, as the FinOps IQ and Sovereign IQ report services:
 *   GET /api/cost-iq/report?assessmentId=...&format=pdf     the report PDF
 *                          &format=csv                      the backlog CSV
 *                          &format=brief                    the two-page CIO brief (PDF, always client edition)
 *                          &format=pptx                     the slide deck (PowerPoint, always client edition)
 *                          &view=client                     client edition
 * Only a completed assessment has a report, built from the result the server stored at completion and the FinOps IQ
 * summary as it was when linked. A record belongs to its respondent (Admins may read any). Read-only.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess } from '../_shared/resilience-data';
import { withAcceleratorAccess, isConsultant } from '../_shared/access';
import { checkCostIqReport } from '../../../packages/engine-core/src/report-checks/accelerators';
import { failureMessage } from '../../../packages/engine-core/src/report-checks';
import { costIqBacklog, costIqBrief, costIqDeck, costIqReport, type CostIqReportInput, type CostIqResult } from '../../../packages/engine-core/src/accelerators/cost-iq/report';
import { evaluateNonCloud, parseNonCloudEvidence, reportingCurrency } from '../../../packages/engine-core/src/accelerators/cost-iq/non-cloud-levers';
import { COST_IQ_SUMMARY_SCHEMA, type CostIqSummary } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/cost-iq-summary';
import { scopeCounts } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';
import { renderPdf } from '../../../packages/engine-core/src/report/pdf';
import { renderPptx } from '../../../packages/engine-core/src/report/pptx';
import { toCsv } from '../../../packages/engine-core/src/report/csv';
import { appSyncStore, type CostIqAssessmentStore } from '../manage-cost-assessment/store';

const FORMATS = new Set(['pdf', 'csv', 'brief', 'pptx']);

const fileName = (client: string, date: string, view: string, ext: string, kind = '') =>
  `cost-iq-${kind}${client.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'assessment'}-${date}${view === 'client' ? '-client' : ''}.${ext}`;

const parse = <T>(json: string | null | undefined, fallback: T): T => { try { return json ? (JSON.parse(json) as T) : fallback; } catch { return fallback; } };

export function createHandler(store: CostIqAssessmentStore, now: () => Date = () => new Date()) {
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
    // The consultant edition (statement-of-work draft, consultant notes, internal IDs) goes to LTM consultants only (M8); without a
    // view, each caller gets the edition for their role.
    const consultant = isConsultant(event);
    if (q.view === 'consultant' && !consultant && format !== 'brief' && format !== 'pptx') return respond(403, { ok: false, error: 'consultant_role_required', message: 'The consultant edition is for LTM consultants. Download the client edition instead.' });
    const view = q.view === 'client' || !consultant ? 'client' : 'consultant';
    if (!q.assessmentId) return respond(400, { ok: false, error: 'assessmentId is required' });
    if (!FORMATS.has(format)) return respond(400, { ok: false, error: 'format: expected pdf, brief, pptx or csv' });
    try {
      const item = await store.get(q.assessmentId);
      if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
      if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
      if (item.status !== 'completed' || !item.resultJson) return respond(409, { ok: false, error: 'assessment_not_completed', message: 'Complete the assessment to produce its report.' });

      const answers = parse<Record<string, unknown>>(item.answersJson, {});
      const selectedAreas = parse<string[]>(item.selectedAreasJson, []);
      const summary = parse<CostIqSummary | null>(item.finopsSummaryJson, null);
      const date = String(item.completedAt ?? now().toISOString()).slice(0, 10);
      const input: CostIqReportInput = {
        result: JSON.parse(item.resultJson) as CostIqResult,
        answers, selectedAreas,
        scope: scopeCounts({ answers, scope: { selectedAreas } }),
        assessmentDate: date,
        currency: reportingCurrency(item),
        // A summary this build does not know is left out, and the report says the cloud line is not quantified.
        finops: summary && summary.schema === COST_IQ_SUMMARY_SCHEMA ? summary : null
      };
      // Sized here, from the stored evidence and the findings raised, so a later link or unlink moves the total with it.
      const stored = parse<unknown>(item.leverEvidenceJson, null);
      const evidence = stored ? parseNonCloudEvidence(stored) : null;
      input.nonCloud = evidence?.ok ? evaluateNonCloud(evidence.value, input.result.findings.map(f => f.id), input.finops) : null;
      // C1: the client's own spend baseline, when the consultant recorded one, narrows the indicative ranges.
      input.baseline = evidence?.ok && evidence.value.baseline ? { ...evidence.value.baseline, currency: evidence.value.currency } : null;
      // E1: the client's own cost of one FTE-month costs the steps in the business case.
      input.rate = evidence?.ok && evidence.value.internalRatePerFteMonth ? { perFteMonth: evidence.value.internalRatePerFteMonth, currency: evidence.value.currency } : null;
      const client = item.clientName || 'the organisation';
      if (format === 'csv') {
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileName(client, date, view, 'csv')}"`, 'Cache-Control': 'no-store' },
          body: toCsv(costIqBacklog(input, view))
        };
      }
      // The narrative goes in only when the engagement's AI switch is on and the stored one passed the grounding check.
      const stored2 = item.aiEnabled ? parse<any>(item.narrativeJson, null) : null;
      const narrative = stored2?.status === 'ok' ? { narrative: stored2.narrative, modelId: stored2.modelId, generatedAt: stored2.generatedAt } : null;
      // The CIO brief (B2) and the deck (B3) are client documents whoever asks for them, built from the same traced figures and
      // checked the same way.
      const brief = format === 'brief', deck = format === 'pptx';
      const edition = brief || deck ? 'client' : view;
      const doc = brief ? costIqBrief(input, { client, preparedBy: 'LTM', dataProvidedBy: client, aiEnabled: !!item.aiEnabled })
        : deck ? costIqDeck(input, { client, preparedBy: 'LTM', dataProvidedBy: client, aiEnabled: !!item.aiEnabled })
        : costIqReport(input, { client, preparedBy: view === 'client' || !item.respondentEmail ? (view === 'client' ? 'LTM' : 'LTM consultant') : `LTM consultant (${item.respondentEmail})`, dataProvidedBy: client, view, aiEnabled: !!item.aiEnabled, narrative });
      // Layer 1 report checks (REPORT-VALIDATION.md): a report that fails any check is not issued.
      const checked = checkCostIqReport(doc, input, edition, now().toISOString().slice(0, 10), brief ? 'brief' : deck ? 'deck' : 'report');
      if (checked.status === 'fail') {
        console.error('[CostIqReport] report checks failed', { requestId, assessmentId: q.assessmentId, view: edition, format, failures: checked.failures });
        return respond(422, { ok: false, error: 'report_checks_failed', message: failureMessage(checked), failures: checked.failures });
      }
      if (deck) {
        const pptx = await renderPptx(doc);
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Disposition': `attachment; filename="${fileName(client, date, edition, 'pptx', 'slides-')}"`, 'Cache-Control': 'no-store', 'X-Report-Checks': `pass ${checked.checks.join(' ')}` },
          body: pptx.toString('base64'),
          isBase64Encoded: true
        };
      }
      const pdf = await renderPdf(doc);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName(client, date, edition, 'pdf', brief ? 'brief-' : '')}"`, 'Cache-Control': 'no-store', 'X-Report-Checks': `pass ${checked.checks.join(' ')}` },
        body: pdf.toString('base64'),
        isBase64Encoded: true
      };
    } catch (error: any) {
      console.error('[CostIqReport]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_report_error', message: 'The report could not be produced. Please try again.' });
    }
  };
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('cost-iq', createHandler(appSyncStore));
