import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import { parseResilienceIqRequest } from '../../../packages/engine-core/src/accelerators/resilience-iq/contract';
import { corsHeaders as sharedCors } from '../_shared/http';
import { withAcceleratorAccess } from '../_shared/access';

// Lambdas run one request at a time per container, so the current request's headers are kept here for
// response() to echo an allowed origin (see _shared/http.ts). Origins not in ALLOWED_ORIGINS get no CORS header.
let requestHeaders: Record<string, string | undefined> | undefined;
const corsHeaders = () => sharedCors({ headers: requestHeaders }, 'OPTIONS,POST', 'X-Request-Id');

function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

function response(statusCode: number, body: unknown, requestId: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'X-Request-Id': requestId },
    body: JSON.stringify(body)
  };
}


const serve = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  requestHeaders = event.headers;
  const requestId = makeRequestId(event);
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'POST';
  if (method === 'OPTIONS') return { statusCode: 200, headers: { ...corsHeaders(), 'X-Request-Id': requestId }, body: '' };
  if (method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed', requestId }, requestId);

  try {
    let body: any = {};
    if (event.body) {
      try {
        body = event.isBase64Encoded
          ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
          : JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: { ...corsHeaders(), 'X-Request-Id': requestId },
          body: JSON.stringify({ ok: false, error: 'Request body must contain valid JSON.', requestId })
        };
      }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response(400, {
        ok: false,
        error: 'Request body must be a JSON object.',
        requestId
      }, requestId);
    }

    // Same contract the page and the tests use: every invalid answer is reported, the first as `error`.
    const parsed = parseResilienceIqRequest(body);
    if (!parsed.ok) {
      return response(400, { ok: false, error: parsed.errors[0], details: parsed.errors, requestId }, requestId);
    }

    const result = evaluateResilienceIq(parsed.value.answers);
    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'X-Request-Id': requestId },
      body: JSON.stringify({ ok: true, data: result })
    };
  } catch (error: any) {
    console.error('[EvaluateResilienceIq] Error evaluating assessment', { requestId, error });
    return response(500, {
      ok: false,
      error: 'internal_evaluation_error',
      message: 'An internal error occurred while evaluating Resilience IQ.',
      requestId
    }, requestId);
  }
};

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('resilience-iq', serve);
