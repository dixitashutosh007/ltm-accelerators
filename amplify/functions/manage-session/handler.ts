/**
 * Saved sessions for the accelerators that had no server-side save (platform workstream P3), on the Advisory API behind
 * the Cognito JWT authorizer and the accelerator access check:
 *   GET  /api/sessions?accelerator=cost-iq                    the caller's sessions for that accelerator, newest first (no payload)
 *   GET  /api/sessions?accelerator=cost-iq&sessionId=...      one session, with its payload
 *   POST /api/sessions  { accelerator, action: 'save', session: { sessionId, title, status, payload }, progress }
 *   POST /api/sessions  { accelerator, action: 'delete', sessionId }     permanent
 * A session belongs to its owner; Admins may read and delete any. The accelerator is part of the key a caller names, so a
 * session id from another accelerator is "not found", and the caller needs access to the accelerator named. The payload
 * is the accelerator's own snapshot and is never interpreted here. Every save sets expiresAt, 24 months after the save: the one retention period of every accelerator (finops-iq/v3/retention.ts).
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess, parseBody, userEmail } from '../_shared/resilience-data';
import { withAcceleratorAccess } from '../_shared/access';
import { recordAssessment, removeAssessmentActivity } from '../_shared/activity-recorder.mjs';
import { progressFor } from '../_shared/progress';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';
import { appSyncStore, type SavedSessionRecord, type SavedSessionStore } from './store';

/** Accelerators served here. Those with their own save service (FinOps, Sovereign, Resilience IQ) are not. */
export const ACCELERATORS = new Set(['strategy-iq', 'cloud-iq', 'modernization-iq', 'ai-readiness-iq', 'cost-iq']);
const MAX_PAYLOAD_BYTES = 300_000; // DynamoDB items stop at 400 KB
const ID = /^[A-Za-z0-9_-]{8,80}$/;

const expiry = expiresAt;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function summary(r: SavedSessionRecord) {
  const { payloadJson, ...rest } = r;
  return rest;
}

export function createHandler(store: SavedSessionStore, now: () => Date = () => new Date()) {
  const inner = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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
        const accelerator = event.queryStringParameters?.accelerator || '';
        const sessionId = event.queryStringParameters?.sessionId;
        if (!sessionId) return respond(200, { ok: true, data: (await store.listByOwner(userEmail(event), accelerator)).map(summary) });
        const item = await store.get(sessionId);
        if (!item || item.accelerator !== accelerator) return respond(404, { ok: false, error: 'session_not_found' });
        if (!canAccess(event, item.ownerEmail)) return respond(403, { ok: false, error: 'session_access_denied' });
        const { payloadJson, ...rest } = item;
        return respond(200, { ok: true, data: { ...rest, payload: JSON.parse(payloadJson) } });
      }
      if (method !== 'POST') return respond(405, { ok: false, error: 'method_not_allowed' });

      let body: any;
      try { body = parseBody(event); } catch { return respond(400, { ok: false, error: 'Request body is not valid JSON.' }); }
      const accelerator = String(body?.accelerator || '');
      const action = String(body?.action || 'save');

      if (action === 'delete') {
        const id = body?.sessionId;
        if (typeof id !== 'string' || !id) return respond(400, { ok: false, error: 'delete action requires sessionId.' });
        const item = await store.get(id);
        if (!item || item.accelerator !== accelerator) return respond(404, { ok: false, error: 'session_not_found' });
        if (!canAccess(event, item.ownerEmail)) return respond(403, { ok: false, error: 'session_access_denied' });
        await store.delete(id);
        await removeAssessmentActivity(item.ownerEmail, accelerator, id);
        console.info('[ManageSession] deleted', { requestId, accelerator, sessionId: id });
        return respond(200, { ok: true, data: { sessionId: id, deleted: true } });
      }
      if (action !== 'save') return respond(400, { ok: false, error: 'action: expected save or delete' });

      const s = body?.session;
      if (!s || typeof s !== 'object' || Array.isArray(s)) return respond(400, { ok: false, error: 'session is required.' });
      if (typeof s.sessionId !== 'string' || !ID.test(s.sessionId)) return respond(400, { ok: false, error: 'session.sessionId: 8 to 80 letters, digits, - or _.' });
      const title = clean(s.title, 120);
      if (!title) return respond(400, { ok: false, error: 'session.title is required.' });
      if (s.payload === undefined || s.payload === null || typeof s.payload !== 'object') return respond(400, { ok: false, error: 'session.payload must be an object.' });
      const payloadJson = JSON.stringify(s.payload);
      if (Buffer.byteLength(payloadJson) > MAX_PAYLOAD_BYTES) return respond(413, { ok: false, error: 'session_too_large' });
      const status = s.status === 'completed' ? 'completed' : 'in_progress';

      const existing = await store.get(s.sessionId);
      // A session id from another owner or another accelerator is never overwritten.
      if (existing && (existing.accelerator !== accelerator || !canAccess(event, existing.ownerEmail))) return respond(403, { ok: false, error: 'session_access_denied' });

      const progress = progressFor(status, body?.progress);
      const record: SavedSessionRecord = {
        sessionId: s.sessionId, accelerator,
        ownerEmail: existing?.ownerEmail ?? userEmail(event),
        title, status, stage: progress.stage ?? null, percent: progress.percent ?? null,
        payloadJson, expiresAt: expiry(now())
      };
      const data = existing ? await store.update(record) : await store.create(record);
      await recordAssessment(record.ownerEmail, { accelerator, assessmentId: record.sessionId, status, ...progress, startedAt: data.createdAt, completedAt: status === 'completed' ? now().toISOString() : null });
      return respond(200, { ok: true, data: summary(data) });
    } catch (error: any) {
      console.error('[ManageSession]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_session_persistence_error', message: 'The session could not be saved. Please try again.' });
    }
  };

  // The accelerator is named by the caller, so the access check runs for that accelerator after it is validated.
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if ((event.requestContext?.http?.method || '') === 'OPTIONS') return inner(event);
    let accelerator = event.queryStringParameters?.accelerator || '';
    if (!accelerator) { try { accelerator = String(parseBody(event)?.accelerator || ''); } catch { /* inner reports the bad body */ } }
    if (!ACCELERATORS.has(accelerator)) {
      return { statusCode: 400, headers: corsHeaders(event, 'OPTIONS,GET,POST'), body: JSON.stringify({ ok: false, error: 'unknown_accelerator', message: `accelerator: expected one of ${[...ACCELERATORS].join(', ')}` }) };
    }
    return withAcceleratorAccess(accelerator, inner)(event);
  };
}

export const handler = createHandler(appSyncStore);
