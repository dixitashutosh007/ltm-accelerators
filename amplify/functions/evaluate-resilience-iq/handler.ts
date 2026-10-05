import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
};


const MAX_ANSWER_KEYS = 180;
const MAX_TEXT_LENGTH = 4000;

function validateAnswersPayload(answers: unknown): { ok: true } | { ok: false; error: string } {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Missing or invalid "answers" payload.' };
  }
  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.length > MAX_ANSWER_KEYS) {
    return { ok: false, error: `Too many answer fields. Maximum supported is ${MAX_ANSWER_KEYS}.` };
  }
  for (const [key, value] of entries) {
    if (!/^[A-Z]{2,5}-[A-Z]{2,6}-?\d{2}$/.test(key)) {
      return { ok: false, error: `Invalid answer field: ${key}.` };
    }
    if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `Answer ${key} exceeds the maximum text length.` };
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return { ok: false, error: `Answer ${key} must contain a finite number.` };
    }
    if (value !== null && typeof value === 'object') {
      const serialized = JSON.stringify(value);
      if (serialized.length > MAX_TEXT_LENGTH) {
        return { ok: false, error: `Answer ${key} is too large.` };
      }
    }
  }
  return { ok: true };
}
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    let body: any = {};
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }

    const { answers } = body;
    const validation = validateAnswersPayload(answers);
    if (!validation.ok) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: validation.error })
      };
    }

    const result = evaluateResilienceIq(answers);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, data: result })
    };
  } catch (error: any) {
    console.error('[EvaluateResilienceIq] Error evaluating assessment:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: 'An internal error occurred while evaluating Resilience IQ.' })
    };
  }
};
