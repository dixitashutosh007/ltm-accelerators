import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { clientView, evaluateFinOpsIqV3, parseFinOpsIqV3Request } from '../../../packages/engine-core/src/accelerators/finops-iq/v3';
import { withAcceleratorAccess } from '../_shared/access';

function score<I, R>(parsed: { ok: true; value: I } | { ok: false; errors: string[] }, evaluate: (input: I) => R) {
  return parsed.ok ? { ok: true as const, result: evaluate(parsed.value) } : parsed;
}

// Per-request CORS headers (origin allowlist). Lambda handles one request at a time,
// so this module-level value is safe.
let CORS_HEADERS: Record<string, string> = corsHeaders();

const serve = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  CORS_HEADERS = corsHeaders(event, 'OPTIONS,POST');
  const method = event.requestContext?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    let body: any = {};
    try {
      if (event.body) {
        body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body);
      }
    } catch {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Request body is not valid JSON.' }) };
    }

    // POST /api/evaluate/finops-iq/v3 scores FinOps IQ (both modes). The v2 engine and its route were retired at
    // cutover (execution phase M8, 22 Oct 2026).
    const evaluated = score(parseFinOpsIqV3Request(body), evaluateFinOpsIqV3);
    if (!evaluated.ok) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Invalid assessment payload.', details: evaluated.errors.slice(0, 20) })
      };
    }

    // ?view=client returns the client-mode result: consultant-only fields are removed here, not hidden in the page.
    const client = event.queryStringParameters?.view === 'client';
    const result = client ? clientView(evaluated.result as ReturnType<typeof evaluateFinOpsIqV3>) : evaluated.result;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: result
      })
    };
  } catch (error: any) {
    console.error('[EvaluateFinOpsIq] Error evaluating assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'An internal error occurred while calculating FinOps IQ results.'
      })
    };
  }
};

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('finops-iq', serve);
