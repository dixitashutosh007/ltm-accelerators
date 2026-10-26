/**
 * Sovereign IQ save and resume (PLAN S5 item 3), on the Advisory API behind the Cognito JWT authorizer and the
 * accelerator access check. The same rules as FinOps IQ (manage-finops-assessment):
 *   GET  /api/sovereign-iq/assessment                      the caller's assessments, newest first (summaries)
 *   GET  /api/sovereign-iq/assessment?assessmentId=...     one assessment, with its request and, once completed, result
 *        &view=client                                      client mode: no consultant notes, result through clientView()
 *   POST /api/sovereign-iq/assessment  { action, snapshot } save | complete | archive
 *   POST /api/sovereign-iq/assessment  { action: 'delete', assessmentId }   permanent deletion at the client's request
 * A record belongs to its respondent (Admins may act on any). The result is computed here on completion and dated
 * that day, never taken from the browser. A completed assessment is immutable; it can only be archived or deleted.
 * Every write sets expiresAt (24 months after the last change, as FinOps IQ; confirmed in the S10 data notice).
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess, isAdmin, parseBody, userEmail } from '../_shared/resilience-data';
import { withAcceleratorAccess } from '../_shared/access';
import { canTransition, clientView, evaluateSnapshot, parseSnapshot, snapshotMode, ENGINE_VERSION, type SovereignAssessmentStatus } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';
import { appSyncStore, type SovereignAssessmentRecord, type SovereignAssessmentStore } from './store';

const ACTIONS = new Set(['save', 'complete', 'archive', 'delete']);

function view(r: SovereignAssessmentRecord, client = false) {
  const { requestJson, resultJson, consultantNotes, ...rest } = r;
  const result = resultJson ? JSON.parse(resultJson) : undefined;
  return {
    ...rest,
    ...(client ? {} : { consultantNotes }),
    ...(requestJson ? { request: JSON.parse(requestJson) } : {}),
    ...(result ? { result: client ? clientView(result) : result } : {})
  };
}

function summary(r: SovereignAssessmentRecord) {
  const { requestJson, resultJson, consultantNotes, ...rest } = r;
  return rest;
}

export function createHandler(store: SovereignAssessmentStore, now: () => Date = () => new Date()) {
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
        const assessmentId = event.queryStringParameters?.assessmentId;
        if (!assessmentId) return respond(200, { ok: true, data: (await store.listByRespondent(userEmail(event))).map(summary) });
        const item = await store.get(assessmentId);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        return respond(200, { ok: true, data: view(item, event.queryStringParameters?.view === 'client') });
      }
      if (method !== 'POST') return respond(405, { ok: false, error: 'method_not_allowed' });

      let body: any;
      try { body = parseBody(event); } catch { return respond(400, { ok: false, error: 'Request body is not valid JSON.' }); }
      const action = String(body?.action || 'save');
      if (!ACTIONS.has(action)) return respond(400, { ok: false, error: `action: expected one of ${[...ACTIONS].join(', ')}` });
      if (action === 'delete') {
        const id = body?.assessmentId;
        if (typeof id !== 'string' || !id) return respond(400, { ok: false, error: 'delete action requires assessmentId.' });
        const item = await store.get(id);
        if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });
        await store.delete(id);
        console.info('[ManageSovereignAssessment] deleted', { requestId, assessmentId: id });
        return respond(200, { ok: true, data: { assessmentId: id, deleted: true } });
      }
      const expected: SovereignAssessmentStatus | undefined = action === 'complete' ? 'completed' : action === 'archive' ? 'archived' : undefined;
      if (expected && body?.snapshot?.status !== expected) return respond(400, { ok: false, error: `${action} action requires ${expected} status.` });
      if (action === 'save' && ['completed', 'archived'].includes(body?.snapshot?.status)) return respond(400, { ok: false, error: 'Use the complete or archive action.' });

      const existing = typeof body?.snapshot?.assessmentId === 'string' ? await store.get(body.snapshot.assessmentId) : null;
      if (existing && !canAccess(event, existing.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });

      if (action === 'archive') {
        if (!existing) return respond(404, { ok: false, error: 'assessment_not_found' });
        if (!canTransition(existing.status as SovereignAssessmentStatus, 'archived')) return respond(409, { ok: false, error: 'assessment_immutable' });
        const at = now();
        const data = await store.update({ assessmentId: existing.assessmentId, status: 'archived', archivedAt: at.toISOString(), expiresAt: expiresAt(at) });
        return respond(200, { ok: true, data: view(data) });
      }

      const parsed = parseSnapshot(body?.snapshot);
      if (!parsed.ok) return respond(400, { ok: false, error: parsed.errors[0], details: parsed.errors.slice(0, 20) });
      const s = parsed.value;
      if (!isAdmin(event) && s.respondentEmail !== userEmail(event)) return respond(403, { ok: false, error: 'respondent_email_mismatch' });
      if (existing && !canTransition(existing.status as SovereignAssessmentStatus, s.status)) {
        return respond(409, { ok: false, error: existing.status === 'completed' || existing.status === 'archived' ? 'assessment_immutable' : 'invalid_assessment_status_transition', message: `${existing.status} -> ${s.status}` });
      }
      if (existing && existing.mode !== snapshotMode(s)) return respond(409, { ok: false, error: 'mode_change_not_allowed', message: 'Start a new assessment to change mode.' });

      const completedAt = s.status === 'completed' ? now() : undefined;
      const result = completedAt ? evaluateSnapshot(s, completedAt) : undefined;
      const record: SovereignAssessmentRecord = {
        assessmentId: s.assessmentId,
        clientName: s.clientName,
        clientSector: s.clientSector ?? null,
        respondentEmail: existing?.respondentEmail ?? s.respondentEmail,
        status: s.status,
        mode: snapshotMode(s),
        engineVersion: result?.versions.engine ?? ENGINE_VERSION,
        requestJson: JSON.stringify(result ? { ...s.request, assessmentDate: result.assessmentDate } : s.request),
        consultantNotes: s.consultantNotes ?? null,
        resultJson: result ? JSON.stringify(result) : null,
        startedAt: existing?.startedAt ?? s.startedAt,
        completedAt: completedAt?.toISOString() ?? null,
        expiresAt: expiresAt(now())
      };
      const data = existing ? await store.update(record) : await store.create(record);
      return respond(200, { ok: true, data: view(data) });
    } catch (error: any) {
      console.error('[ManageSovereignAssessment]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_assessment_persistence_error', message: 'The assessment could not be saved. Please try again.' });
    }
  };
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('sovereign-iq', createHandler(appSyncStore));
