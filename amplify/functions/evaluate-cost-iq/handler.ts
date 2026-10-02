import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { evaluateCostIq, metadata, questions } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Request-Id',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};

function response(statusCode: number, body: unknown, id: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: JSON.stringify(body) };
}
function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const id = makeRequestId(event);
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'GET';
  const path = event.requestContext?.http?.path || (event as any).path || '';

  if (method === 'OPTIONS') return { statusCode: 200, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: '' };

  try {
    if (method === 'GET' && path.endsWith('/metadata')) return response(200, metadata(), id);
    if (method === 'GET' && path.endsWith('/questions')) return response(200, questions(), id);

    if (method !== 'POST') return response(405, { error: 'method_not_allowed', requestId: id }, id);

    let body: any = {};
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }
    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return response(400, { error: 'answers_object_required', requestId: id }, id);
    }

    const result = await evaluateCostIq({
      answers: body.answers,
      scope: body.scope || null,
      capabilityScores: body.capabilityScores || {},
      evidence: body.evidence || body.options?.evidence || {},
      feasibilityEvidence: body.feasibilityEvidence || body.options?.feasibilityEvidence || {},
      options: body.options || {}
    });
    return response(200, result, id);
  } catch (error) {
    console.error('[EvaluateCostIq] Request failed', { requestId: id });
    return response(500, {
      error: 'internal_evaluation_error',
      message: 'An internal error occurred while processing the Cost IQ request.',
      requestId: id
    }, id);
  }
};
