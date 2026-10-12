/**
 * Request contract for POST /api/evaluate/resilience-iq.
 *
 * Shared by the Lambda (to reject malformed requests with a clear 400) and the tests (to prove the page
 * sends what the engine reads). The rules come from the question bank, so adding a question there needs
 * no change here. Answers are option labels, never indexes: the engine matches on the label text.
 */
import { resilienceKnowledge } from './knowledge';
import type { ResilienceAnswers } from './runtime';

export const MAX_ANSWER_KEYS = 180;
export const MAX_TEXT_LENGTH = 4000;

export interface ResilienceIqRequest {
  answers: ResilienceAnswers;
}

export type ParseResult =
  | { ok: true; value: ResilienceIqRequest }
  | { ok: false; errors: string[] };

const SINGLE = ['single_select', 'slider_choice', 'scenario', 'yes_no'];
const MULTI = ['multi_select', 'ranking', 'evidence_select'];

/** Returns a reason the answer is invalid for the question, or null if it is valid. */
function answerError(q: any, key: string, value: unknown): string | null {
  if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) return `Answer ${key} exceeds the maximum text length.`;
  if (typeof value === 'number' && !Number.isFinite(value)) return `Answer ${key} must contain a finite number.`;
  if (value !== null && typeof value === 'object' && JSON.stringify(value).length > MAX_TEXT_LENGTH) return `Answer ${key} is too large.`;

  // The UI interaction can override the stored question type (for example a single_select shown as a scale).
  const type = q.ui?.interaction || q.type;
  const allowed = new Set((Array.isArray(q.options) ? q.options : []).map(String));
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  if (SINGLE.includes(type)) {
    if (Array.isArray(value) || values.length !== 1 || !allowed.has(values[0])) return `Invalid value for answer ${key}.`;
  } else if (MULTI.includes(type)) {
    if (!Array.isArray(value) || values.some(v => !allowed.has(v)) || new Set(values).size !== values.length) {
      return `Invalid selection for answer ${key}.`;
    }
  } else if (type === 'matrix') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `Invalid matrix answer for ${key}.`;
    const rows = (q.ui?.rows ?? []).map(String);
    const columns = (q.ui?.columns ?? []).map(String);
    const matrix = value as Record<string, unknown>;
    if (Object.keys(matrix).length !== rows.length || rows.some((row: string) => !Object.prototype.hasOwnProperty.call(matrix, row))) {
      return `Incomplete matrix answer for ${key}.`;
    }
    for (const [row, column] of Object.entries(matrix)) {
      if (!rows.includes(row) || typeof column !== 'string' || !columns.includes(column)) return `Invalid matrix value for answer ${key}.`;
    }
  } else if (type === 'number') {
    if ((typeof value !== 'number' && typeof value !== 'string') || !Number.isFinite(Number(value))) return `Invalid numeric answer for ${key}.`;
  } else if (type === 'text') {
    if (typeof value !== 'string') return `Invalid text answer for ${key}.`;
  }
  return null;
}

/** Validates the request body and returns every problem found, so a caller can fix them all at once. */
export function parseResilienceIqRequest(body: unknown, knowledge = resilienceKnowledge): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['Request body must be a JSON object.'] };
  const answers = (body as Record<string, unknown>).answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return { ok: false, errors: ['Missing or invalid "answers" payload.'] };

  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.length > MAX_ANSWER_KEYS) return { ok: false, errors: [`Too many answer fields. Maximum supported is ${MAX_ANSWER_KEYS}.`] };

  const bank = [
    ...(knowledge.questionBank.executive_questions as any[]),
    ...(knowledge.questionBank.advisory_questions as any[])
  ];
  const byId = new Map(bank.map(q => [q.id, q]));
  const errors: string[] = [];
  for (const [key, value] of entries) {
    const q = byId.get(key);
    if (!q) { errors.push(`Unknown answer field: ${key}.`); continue; }
    const err = answerError(q, key, value);
    if (err) errors.push(err);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: { answers: answers as ResilienceAnswers } };
}
