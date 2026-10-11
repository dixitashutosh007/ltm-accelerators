import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateModernizationIq } from '../../../packages/engine-core/src/accelerators/modernization-iq/evaluate';

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
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }

    const { answers, org, subjectiveNotes, clarificationAnswers } = body;
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

    const result = evaluateModernizationIq({
      answers,
      org: org || {},
      subjectiveNotes: subjectiveNotes || {},
      clarificationAnswers: clarificationAnswers || {}
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: result
      })
    };
  } catch (error: any) {
    console.error('[EvaluateModernizationIq] Error evaluating modernization assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'An internal error occurred while calculating Modernize IQ results.'
      })
    };
  }
};
