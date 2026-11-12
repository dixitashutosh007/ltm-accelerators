import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { withAcceleratorAccess } from '../_shared/access';
import { NOTICES } from '../../../packages/engine-core/src/accelerators/cost-iq/notices';
import { evaluateCostIq, metadata, questions } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';
import { plausibilityChecks } from '../../../packages/engine-core/src/accelerators/cost-iq/plausibility';

// CORS echoes only the origins in ALLOWED_ORIGINS (_shared/http.ts); the routes sit behind the Cognito authorizer and the
// accelerator access check, so a request without a signed-in, permitted caller never reaches the handler.
// A Lambda container serves one request at a time, so the current request is kept here for response() to read its origin.
let current: APIGatewayProxyEventV2 | undefined;
function response(statusCode: number, body: unknown, id: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: { ...corsHeaders(current, 'OPTIONS,GET,POST', 'X-Request-Id'), 'X-Request-Id': id }, body: JSON.stringify(body) };
}
function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

export const evaluate = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  current = event;
  const id = makeRequestId(event);
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'GET';
  const path = event.requestContext?.http?.path || (event as any).path || '';

  if (method === 'OPTIONS') return { statusCode: 200, headers: { ...corsHeaders(event, 'OPTIONS,GET,POST', 'X-Request-Id'), 'X-Request-Id': id }, body: '' };

  try {
    if (method === 'GET' && path.endsWith('/metadata')) return response(200, { ...metadata(), notices: NOTICES }, id);
    if (method === 'GET' && path.endsWith('/questions')) return response(200, questions(), id);

    if (method !== 'POST') return response(405, { error: 'method_not_allowed', requestId: id }, id);

    let body: any = {};
    if (event.body) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
      if (rawBody.length > 256 * 1024) {
        return response(413, { error: 'payload_too_large', requestId: id }, id);
      }
      try {
        body = JSON.parse(rawBody);
      } catch {
        return response(400, { error: 'invalid_json', requestId: id }, id);
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response(400, { error: 'json_object_required', requestId: id }, id);
    }
    // The AI routes of the earlier build are gone: the AI narrative is the shared Bedrock service at /api/cost-iq/narrative (CQ8).
    if (path.endsWith('/ai-review') || path.endsWith('/ai-report')) return response(404, { error: 'not_found', requestId: id }, id);

    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return response(400, { error: 'answers_object_required', requestId: id }, id);
    }
    if (Object.keys(body.answers).length > 500) {
      return response(400, { error: 'too_many_answers', requestId: id }, id);
    }
    for (const [key, value] of Object.entries(body.answers)) {
      if (key.length > 128) {
        return response(400, { error: 'invalid_answer_key', requestId: id }, id);
      }
      if (Array.isArray(value)) {
        if (value.length > 100 || value.some(v => typeof v === 'object' && v !== null)) {
          return response(400, { error: 'invalid_answer_value', requestId: id }, id);
        }
      } else if (value !== null && typeof value === 'object') {
        return response(400, { error: 'invalid_answer_value', requestId: id }, id);
      }
    }

    const result = await evaluateCostIq({
      answers: body.answers,
      scope: body.scope && Array.isArray(body.scope.selectedAreas) ? { selectedAreas: body.scope.selectedAreas.filter((a: unknown) => typeof a === 'string').slice(0, 40) } : null,
      evidence: body.evidence || body.options?.evidence || {},
      feasibilityEvidence: body.feasibilityEvidence || body.options?.feasibilityEvidence || {},
      options: body.options || {}
    });
    // A4: answers to confirm, shown to the consultant after scoring. They change nothing in the result.
    return response(200, { ...result, plausibility: plausibilityChecks(body.answers) }, id);
  } catch (error) {
    console.error('[EvaluateCostIq] Request failed', {
      requestId: id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return response(500, {
      error: 'internal_evaluation_error',
      message: 'An internal error occurred while processing the Cost IQ request.',
      requestId: id
    }, id);
  }
};

// Only signed-in callers with access to Cost IQ reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('cost-iq', evaluate);
