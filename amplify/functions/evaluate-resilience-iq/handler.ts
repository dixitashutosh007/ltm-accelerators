import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import { resilienceKnowledge } from '../../../packages/engine-core/src/accelerators/resilience-iq/knowledge';

// Read per request so a configured origin always applies. The '*' fallback is kept for now because the
// deployed API and page rely on it; restricting origins is part of the move onto the authenticated API.
const corsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.RESILIENCE_IQ_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Request-Id',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
});

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


const MAX_ANSWER_KEYS = 180;
const MAX_TEXT_LENGTH = 4000;

function validateAnswersPayload(answers: unknown): { ok: true } | { ok: false; error: string } {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Missing or invalid "answers" payload.' };
  }
  const bank = [
    ...(resilienceKnowledge.questionBank.executive_questions as any[]),
    ...(resilienceKnowledge.questionBank.advisory_questions as any[])
  ];
  const byId = new Map(bank.map(q => [q.id, q]));
  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.length > MAX_ANSWER_KEYS) return { ok: false, error: `Too many answer fields. Maximum supported is ${MAX_ANSWER_KEYS}.` };

  for (const [key, value] of entries) {
    const q = byId.get(key);
    if (!q) return { ok: false, error: `Unknown answer field: ${key}.` };
    if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) return { ok: false, error: `Answer ${key} exceeds the maximum text length.` };
    if (typeof value === 'number' && !Number.isFinite(value)) return { ok: false, error: `Answer ${key} must contain a finite number.` };
    if (value !== null && typeof value === 'object' && JSON.stringify(value).length > MAX_TEXT_LENGTH) return { ok: false, error: `Answer ${key} is too large.` };

    // The UI interaction contract can override the legacy question type (for example EX-05 is stored as single_select but rendered as a matrix).
    const type = q.ui?.interaction || q.type;
    const options = Array.isArray(q.options) ? q.options.map(String) : [];
    const allowed = new Set(options);
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    if (['single_select','slider_choice','scenario','yes_no'].includes(type)) {
      if (values.length !== 1 || !allowed.has(values[0])) return { ok: false, error: `Invalid value for answer ${key}.` };
    } else if (['multi_select','ranking','evidence_select'].includes(type)) {
      if (!Array.isArray(value) || values.some(v => !allowed.has(v)) || new Set(values).size !== values.length) {
        return { ok: false, error: `Invalid selection for answer ${key}.` };
      }
    } else if (type === 'matrix') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: `Invalid matrix answer for ${key}.` };
      const rows = (q.ui?.rows ?? []).map(String);
      const columns = (q.ui?.columns ?? []).map(String);
      const matrix = value as Record<string, unknown>;
      if (Object.keys(matrix).length !== rows.length || rows.some(row => !Object.prototype.hasOwnProperty.call(matrix, row))) {
        return { ok: false, error: `Incomplete matrix answer for ${key}.` };
      }
      for (const [row, column] of Object.entries(matrix)) {
        if (!rows.includes(row) || typeof column !== 'string' || !columns.includes(column)) return { ok: false, error: `Invalid matrix value for answer ${key}.` };
      }
    } else if (type === 'number') {
      if (typeof value !== 'number' && typeof value !== 'string') return { ok: false, error: `Invalid numeric answer for ${key}.` };
      if (!Number.isFinite(Number(value))) return { ok: false, error: `Invalid numeric answer for ${key}.` };
    } else if (type === 'text') {
      if (typeof value !== 'string') return { ok: false, error: `Invalid text answer for ${key}.` };
    }
  }
  return { ok: true };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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

    const { answers } = body;
    const validation = validateAnswersPayload(answers);
    if (!validation.ok) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(), 'X-Request-Id': requestId },
        body: JSON.stringify({ ok: false, error: validation.error, requestId })
      };
    }

    const result = evaluateResilienceIq(answers);
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
