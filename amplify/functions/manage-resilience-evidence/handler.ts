import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  assertEvidenceStatusTransition,
  type ResilienceEvidenceStatus
} from '../../../packages/engine-core/src/accelerators/resilience-iq/evidence-lifecycle';
import { corsHeaders } from '../_shared/http';

// Lambdas run one request at a time per container, so the current request's headers are kept here for
// response() to echo an allowed origin (see _shared/http.ts). Origins not in ALLOWED_ORIGINS get no CORS header.
let requestHeaders: Record<string, string | undefined> | undefined;

const statuses = new Set<ResilienceEvidenceStatus>([
  'not_requested', 'requested', 'provided', 'validated', 'rejected'
]);

function response(statusCode: number, body: unknown, requestId: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...corsHeaders({ headers: requestHeaders }, 'OPTIONS,POST', 'X-Request-Id'), 'X-Request-Id': requestId },
    body: JSON.stringify(body)
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  requestHeaders = event.headers;
  const requestId = event.requestContext?.requestId || crypto.randomUUID();
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'POST';

  if (method === 'OPTIONS') return response(200, {}, requestId);
  if (method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed', requestId }, requestId);

  try {
    if (!event.body) return response(400, { ok: false, error: 'Request body is required.', requestId }, requestId);

    let body: any;
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    } catch {
      return response(400, { ok: false, error: 'Request body must contain valid JSON.', requestId }, requestId);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response(400, { ok: false, error: 'Request body must be a JSON object.', requestId }, requestId);
    }

    const { assessmentId, evidenceId, fromStatus, toStatus, validationOutcome, evidenceLocation } = body;

    if (typeof assessmentId !== 'string' || !assessmentId.trim() ||
        typeof evidenceId !== 'string' || !evidenceId.trim()) {
      return response(400, { ok: false, error: 'assessmentId and evidenceId are required.', requestId }, requestId);
    }

    if (!statuses.has(fromStatus) || !statuses.has(toStatus)) {
      return response(400, { ok: false, error: 'Invalid evidence lifecycle status.', requestId }, requestId);
    }

    try {
      assertEvidenceStatusTransition(fromStatus, toStatus);
    } catch (error: any) {
      return response(409, {
        ok: false,
        error: 'invalid_evidence_status_transition',
        message: error.message,
        requestId
      }, requestId);
    }

    if (toStatus === 'validated' && (typeof validationOutcome !== 'string' || !validationOutcome.trim())) {
      return response(400, {
        ok: false,
        error: 'validationOutcome is required when evidence is validated.',
        requestId
      }, requestId);
    }

    if (evidenceLocation !== undefined && typeof evidenceLocation !== 'string') {
      return response(400, { ok: false, error: 'evidenceLocation must be a string.', requestId }, requestId);
    }

    // Stub until roadmap R10 (docs/resilience-iq/ROADMAP.md): it validates the status change and saves nothing.
    // It does not check that the caller owns assessmentId; R10 must add that check before adding storage.
    return response(501, {
      ok: false,
      error: 'evidence_persistence_not_configured',
      message: 'Evidence lifecycle validation succeeded, but persistence is not configured.',
      assessmentId,
      evidenceId,
      fromStatus,
      toStatus,
      requestId
    }, requestId);
  } catch (error) {
    console.error('[ManageResilienceEvidence] Error', { requestId, error });
    return response(500, {
      ok: false,
      error: 'internal_evidence_error',
      requestId
    }, requestId);
  }
};
