/**
 * Cost IQ save and resume (CQ1), on the Advisory API behind the Cognito JWT authorizer and the accelerator access check.
 * The browser used to call the Data API directly, where every Consultant could read every assessment; it now comes here.
 *   GET  /api/cost-iq/assessment                    the caller's assessments, newest first (no answers)
 *   GET  /api/cost-iq/assessment?assessmentId=...   one assessment, with answers and, once completed, its result
 *   POST /api/cost-iq/assessment  { action: 'save' | 'complete', snapshot, progress }
 *   POST /api/cost-iq/assessment  { action: 'delete', assessmentId }          permanent
 *   GET  /api/cost-iq/assessment?finopsSessions=1   the caller's completed FinOps IQ assessments, to pick one as the cloud line
 *   POST /api/cost-iq/assessment  { action: 'link_finops', assessmentId, finopsAssessmentId }   store FinOps IQ's versioned summary
 *   POST /api/cost-iq/assessment  { action: 'unlink_finops', assessmentId }
 *   POST /api/cost-iq/assessment  { action: 'set_lever_evidence', assessmentId, evidence | null }   the client's measured figures for the non-cloud levers
 * One estate has one cloud figure, computed by FinOps IQ: Cost IQ keeps only the summary it was given and never recomputes it.
 * Linking needs access to both accelerators and to both records (owner or Admin). It is allowed after completion: the cloud line is
 * an import, and the answers and Cost IQ's own result stay immutable.
 * A record belongs to the address in the caller's token, never one named in the body; Admins may read or delete any (records saved
 * before CQ1 have no owner and only Admins can reach them). The result is
 * computed here on completion from the saved answers, never taken from the browser. A completed assessment is immutable.
 * Every write sets expiresAt, 24 months after the change.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess, parseBody, userEmail } from '../_shared/resilience-data';
import { holdsPermission, withAcceleratorAccess } from '../_shared/access';
import { recordAssessment, removeAssessmentActivity } from '../_shared/activity-recorder.mjs';
import { progressFor } from '../_shared/progress';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';
import { evaluateCostIq } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';
import { parseNonCloudEvidence, reportingCurrency } from '../../../packages/engine-core/src/accelerators/cost-iq/non-cloud-levers';
import { costIqSummary } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/cost-iq-summary';
import { appSyncStore as finopsAppSyncStore, type FinOpsAssessmentStore } from '../manage-finops-assessment/store';
import { appSyncStore, type CostIqAssessmentRecord, type CostIqAssessmentStore } from './store';

const ID = /^[A-Za-z0-9_-]{8,80}$/;
const MAX_JSON = 200_000;
const MAX_ANSWERS = 500;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

/** Parses one of the JSON string fields; the browser keeps the shape it already had. */
function parseJson(raw: unknown, kind: 'array' | 'object', field: string): { ok: true; json: string; value: any } | { ok: false; error: string } {
  if (typeof raw !== 'string' || raw.length > MAX_JSON) return { ok: false, error: `${field}: expected a JSON string of at most ${MAX_JSON} characters.` };
  let value: any;
  try { value = JSON.parse(raw); } catch { return { ok: false, error: `${field}: not valid JSON.` }; }
  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
  if (kind === 'array' ? !Array.isArray(value) : !isObj) return { ok: false, error: `${field}: expected ${kind === 'array' ? 'an array' : 'an object'}.` };
  return { ok: true, json: raw, value };
}

export function createHandler(store: CostIqAssessmentStore, now: () => Date = () => new Date(), score: (args: any) => any = evaluateCostIq, finops: FinOpsAssessmentStore = finopsAppSyncStore) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const requestId = event.requestContext?.requestId || randomUUID();
    const respond = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 => ({
      statusCode,
      headers: { ...corsHeaders(event, 'OPTIONS,GET,POST', 'X-Request-Id'), 'X-Request-Id': requestId },
      body: JSON.stringify({ ...body, requestId })
    });
    const method = event.requestContext?.http?.method || 'POST';
    if (method === 'OPTIONS') return respond(200, {});
    if (!authorized(event)) return respond(403, { ok: false, error: 'forbidden' });
    try {
      if (method === 'GET') {
        if (event.queryStringParameters?.finopsSessions) {
          if (!(await holdsPermission(event, 'finops-iq'))) return respond(403, { ok: false, error: 'finops_access_denied' });
          const done = (await finops.listByRespondent(userEmail(event))).filter(f => f.status === 'completed');
          return respond(200, { ok: true, data: done.map(f => ({ assessmentId: f.assessmentId, clientName: f.clientName, mode: f.mode, completedAt: f.completedAt ?? null })) });
        }
        const assessmentId = event.queryStringParameters?.assessmentId;
        if (!assessmentId) return respond(200, { ok: true, data: await store.listByRespondent(userEmail(event)) });
        const item = await store.get(assessmentId);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        return respond(200, { ok: true, data: item });
      }
      if (method !== 'POST') return respond(405, { ok: false, error: 'method_not_allowed' });

      let body: any;
      try { body = parseBody(event); } catch { return respond(400, { ok: false, error: 'Request body is not valid JSON.' }); }
      const action = String(body?.action || 'save');

      if (action === 'delete') {
        const id = body?.assessmentId;
        if (typeof id !== 'string' || !id) return respond(400, { ok: false, error: 'delete action requires assessmentId.' });
        const item = await store.get(id);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        await store.delete(id);
        if (item.respondentEmail) await removeAssessmentActivity(item.respondentEmail, 'cost-iq', id);
        console.info('[ManageCostAssessment] deleted', { requestId, assessmentId: id });
        return respond(200, { ok: true, data: { assessmentId: id, deleted: true } });
      }
      if (action === 'set_lever_evidence') {
        const id = body?.assessmentId;
        if (typeof id !== 'string' || !id) return respond(400, { ok: false, error: 'set_lever_evidence requires assessmentId.' });
        const item = await store.get(id);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        if (!item.respondentEmail) return respond(409, { ok: false, error: 'legacy_assessment_read_only' });
        const at = now();
        if (body.evidence === null) return respond(200, { ok: true, data: await store.update({ assessmentId: id, leverEvidenceJson: null, updatedAt: at.toISOString(), expiresAt: expiresAt(at) }) });
        const parsed = parseNonCloudEvidence(body.evidence);
        if (!parsed.ok) return respond(400, { ok: false, error: parsed.error });
        // The figures are in the assessment's reporting currency; a different currency would be added to it unconverted.
        const reporting = reportingCurrency(item);
        if (reporting && reporting !== parsed.value.currency) return respond(400, { ok: false, error: `currency: the assessment reports in ${reporting}` });
        const data = await store.update({ assessmentId: id, leverEvidenceJson: JSON.stringify(parsed.value), updatedAt: at.toISOString(), expiresAt: expiresAt(at) });
        console.info('[ManageCostAssessment] recorded lever evidence', { requestId, assessmentId: id });
        return respond(200, { ok: true, data });
      }
      if (action === 'link_finops' || action === 'unlink_finops') {
        const id = body?.assessmentId;
        if (typeof id !== 'string' || !id) return respond(400, { ok: false, error: `${action} requires assessmentId.` });
        const item = await store.get(id);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        if (!item.respondentEmail) return respond(409, { ok: false, error: 'legacy_assessment_read_only' });
        const at = now();
        if (action === 'unlink_finops') {
          const data = await store.update({ assessmentId: id, finopsAssessmentId: null, finopsSummaryJson: null, updatedAt: at.toISOString(), expiresAt: expiresAt(at) });
          return respond(200, { ok: true, data });
        }
        const fid = body?.finopsAssessmentId;
        if (typeof fid !== 'string' || !fid) return respond(400, { ok: false, error: 'link_finops requires finopsAssessmentId.' });
        if (!(await holdsPermission(event, 'finops-iq'))) return respond(403, { ok: false, error: 'finops_access_denied' });
        const source = await finops.get(fid);
        if (!source) return respond(404, { ok: false, error: 'finops_assessment_not_found' });
        if (!canAccess(event, source.respondentEmail)) return respond(403, { ok: false, error: 'finops_assessment_access_denied' });
        if (source.status !== 'completed' || !source.resultJson) return respond(409, { ok: false, error: 'finops_assessment_not_completed' });
        const summary = costIqSummary(JSON.parse(source.resultJson));
        const data = await store.update({ assessmentId: id, finopsAssessmentId: fid, finopsSummaryJson: JSON.stringify(summary), updatedAt: at.toISOString(), expiresAt: expiresAt(at) });
        console.info('[ManageCostAssessment] linked FinOps IQ result', { requestId, assessmentId: id, finopsAssessmentId: fid });
        return respond(200, { ok: true, data });
      }
      if (action !== 'save' && action !== 'complete') return respond(400, { ok: false, error: 'action: expected save, complete, delete, link_finops, unlink_finops or set_lever_evidence' });

      const s = body?.snapshot;
      if (!s || typeof s !== 'object' || Array.isArray(s)) return respond(400, { ok: false, error: 'snapshot is required.' });
      if (typeof s.assessmentId !== 'string' || !ID.test(s.assessmentId)) return respond(400, { ok: false, error: 'snapshot.assessmentId: 8 to 80 letters, digits, - or _.' });
      for (const f of ['releaseId', 'methodologyVersion'] as const) if (!clean(s[f], 80)) return respond(400, { ok: false, error: `snapshot.${f} is required.` });
      const areas = parseJson(s.selectedAreasJson, 'array', 'selectedAreasJson');
      const answers = parseJson(s.answersJson ?? '{}', 'object', 'answersJson');
      const subjective = parseJson(s.subjectiveJson ?? '{}', 'object', 'subjectiveJson');
      for (const p of [areas, answers, subjective]) if (!p.ok) return respond(400, { ok: false, error: p.error });
      if (Object.keys((answers as any).value).length > MAX_ANSWERS) return respond(400, { ok: false, error: 'too_many_answers' });

      const existing = await store.get(s.assessmentId);
      if (existing && !canAccess(event, existing.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
      // Saved before owners were recorded: an Admin may read or delete it, but there is no owner to save it under.
      if (existing && !existing.respondentEmail) return respond(409, { ok: false, error: 'legacy_assessment_read_only' });
      if (existing?.status === 'completed') return respond(409, { ok: false, error: 'assessment_immutable' });

      const at = now();
      const completing = action === 'complete';
      const record: CostIqAssessmentRecord = {
        assessmentId: s.assessmentId,
        acceleratorId: 'cost-iq',
        releaseId: clean(s.releaseId, 80),
        methodologyVersion: clean(s.methodologyVersion, 80),
        status: completing ? 'completed' : (s.status === 'draft' ? 'draft' : 'in_progress'),
        respondentEmail: existing?.respondentEmail ?? userEmail(event),
        clientName: clean(s.clientName, 120) || null,
        clientSector: clean(s.clientSector, 80) || null,
        clientCurrency: clean(s.clientCurrency, 8) || null,
        selectedAreasJson: (areas as any).json,
        answersJson: (answers as any).json,
        subjectiveJson: (subjective as any).json,
        resultJson: completing ? JSON.stringify(await score({ answers: (answers as any).value, scope: { selectedAreas: (areas as any).value } })) : (existing?.resultJson ?? null),
        startedAt: existing?.startedAt ?? (clean(s.startedAt, 40) || at.toISOString()),
        updatedAt: at.toISOString(),
        completedAt: completing ? at.toISOString() : null,
        expiresAt: expiresAt(at)
      };
      const data = existing ? await store.update(record) : await store.create(record);
      await recordAssessment(record.respondentEmail!, { accelerator: 'cost-iq', assessmentId: record.assessmentId, clientName: record.clientName, status: record.status, ...progressFor(record.status, body?.progress), startedAt: record.startedAt, completedAt: record.completedAt });
      return respond(200, { ok: true, data: data });
    } catch (error: any) {
      console.error('[ManageCostAssessment]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_assessment_persistence_error', message: 'The assessment could not be saved. Please try again.' });
    }
  };
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('cost-iq', createHandler(appSyncStore));
