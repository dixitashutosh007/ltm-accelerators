import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateSovereignIq } from '../../../packages/engine-core/src/accelerators/sovereign-iq/evaluate';
import { parseSovereignIqRequest } from '../../../packages/engine-core/src/accelerators/sovereign-iq/contract';
import { clientView, evaluateSovereignIqV4, parseSovereignIqV4Input } from '../../../packages/engine-core/src/accelerators/sovereign-iq/v4';
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

    // POST /api/evaluate/sovereign-iq/v4 scores the merged Sovereign IQ (PLAN S5), dated today on the server; the
    // current page keeps the plain route until the switch-over. ?view=client returns the client-mode result.
    if (String(event.rawPath || '').replace(/\/+$/, '').endsWith('/v4')) {
      const v4 = parseSovereignIqV4Input({ ...body, assessmentDate: new Date().toISOString().slice(0, 10) });
      if (!v4.ok) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok: false, error: 'Invalid assessment payload.', details: v4.errors.slice(0, 20) }) };
      const scored = evaluateSovereignIqV4(v4.input);
      const data = event.queryStringParameters?.view === 'client' ? clientView(scored) : scored;
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, data }) };
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

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('sovereign-iq', serve);
