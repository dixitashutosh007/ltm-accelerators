import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateStrategyIq } from '../../../packages/engine-core/src/accelerators/strategy-iq/evaluate';
import { parseStrategyIqRequest } from '../../../packages/engine-core/src/accelerators/strategy-iq/contract';
import { withAcceleratorAccess } from '../_shared/access';

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

    const parsed = parseStrategyIqRequest(body);
    if (!parsed.ok) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Invalid assessment payload.', details: parsed.errors.slice(0, 20) })
      };
    }

    const result = evaluateStrategyIq(parsed.value);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: result
      })
    };
  } catch (error: any) {
    console.error('[EvaluateStrategyIq] Error evaluating strategy assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'An internal error occurred while calculating Strategy IQ results.'
      })
    };
  }
};

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('strategy-iq', serve);
