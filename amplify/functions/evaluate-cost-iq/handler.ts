import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { evaluateCostIq } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Request-Id',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const id = makeRequestId(event);
  const method = event.requestContext?.http?.method || (event as any).httpMethod;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: '' };
  }

  try {
    let body: any = {};
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }

    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'X-Request-Id': id },
        body: JSON.stringify({ error: 'answers_object_required', requestId: id })
      };
    }

    const result = await evaluateCostIq({
      answers: body.answers,
      scope: body.scope || null,
      capabilityScores: body.capabilityScores || {},
      evidence: body.evidence || body.options?.evidence || {},
      feasibilityEvidence: body.feasibilityEvidence || body.options?.feasibilityEvidence || {},
      options: body.options || {}
    });

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'X-Request-Id': id },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('[EvaluateCostIq] Evaluation failed', { requestId: id });
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'X-Request-Id': id },
      body: JSON.stringify({
        error: 'internal_evaluation_error',
        message: 'An internal error occurred while calculating Cost IQ results.',
        requestId: id
      })
    };
  }
};
