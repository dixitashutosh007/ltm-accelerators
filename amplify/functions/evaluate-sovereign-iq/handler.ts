import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateSovereignIq } from '../../../packages/engine-core/src/accelerators/sovereign-iq/evaluate';
import { parseSovereignIqRequest } from '../../../packages/engine-core/src/accelerators/sovereign-iq/contract';

// Per-request CORS headers (origin allowlist). Lambda handles one request at a time,
// so this module-level value is safe.
let CORS_HEADERS: Record<string, string> = corsHeaders();

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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

    const parsed = parseSovereignIqRequest(body);
    if (!parsed.ok) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Invalid assessment payload.', details: parsed.errors.slice(0, 20) })
      };
    }

    const result = evaluateSovereignIq(parsed.value);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: result
      })
    };
  } catch (error: any) {
    console.error('[EvaluateSovereignIq] Error evaluating assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        // Details stay in the logs; internals are not returned to the browser.
        error: 'internal_evaluation_error',
        message: 'The assessment could not be scored. Please try again.'
      })
    };
  }
};
