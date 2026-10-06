import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateFinOpsValueCase } from '../../../packages/engine-core/src/accelerators/finops-value-case/evaluate';

// Per-request CORS headers (origin allowlist). Lambda handles one request at a time,
// so this module-level value is safe.
let CORS_HEADERS: Record<string, string> = corsHeaders();

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  CORS_HEADERS = corsHeaders(event, 'OPTIONS,POST');
  // Handle CORS preflight
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
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }

    const { answers, org } = body;
    if (!answers || typeof answers !== 'object') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: false,
          error: 'Missing or invalid "answers" payload in request body.'
        })
      };
    }

    // Execute private proprietary calculation engine securely on AWS
    const result = evaluateFinOpsValueCase(answers, org || {});

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: result
      })
    };
  } catch (error: any) {
    console.error('[EvaluateFinOps] Error evaluating assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'An internal error occurred while calculating assessment results.'
      })
    };
  }
};
