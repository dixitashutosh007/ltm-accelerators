/**
 * Request contract for POST /api/evaluate/sovereign-iq, shared by the Lambda and the tests.
 * Single- and multi-select answers are option indexes. Rules come from the knowledge base.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { SovereignIqInput } from './evaluate';

export type SovereignIqParseResult =
  | { ok: true; value: SovereignIqInput }
  | { ok: false; errors: string[] };

const isIndex = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;

function answerError(q: any, a: unknown): string | null {
  const n = (q.opts || []).length;
  switch (q.type) {
    case 'single':
      return isIndex(a, n) ? null : `expected an option index 0-${n - 1}`;
    case 'multi':
      return Array.isArray(a) && a.every(i => isIndex(i, n)) ? null : 'expected a list of option indexes';
    case 'slider':
      return typeof a === 'number' && Number.isFinite(a) && a >= q.min && a <= q.max ? null : `expected a number ${q.min}-${q.max}`;
    default:
      return `unsupported question type ${q.type}`;
  }
}

export function parseSovereignIqRequest(body: unknown, kb: any = defaultKb): SovereignIqParseResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  const answers = b.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, errors: ['"answers" must be an object keyed by question id'] };
  }
  const errors: string[] = [];
  const questions = new Map<string, any>(kb.questions.map((q: any) => [q.id, q]));
  for (const [id, a] of Object.entries(answers)) {
    const q = questions.get(id);
    if (!q) { errors.push(`answers.${id}: unknown question`); continue; }
    if (a === null) continue;
    const err = answerError(q, a);
    if (err) errors.push(`answers.${id}: ${err}`);
  }
  // The engine uses answers only; session details (client, consultant) are not needed and are not passed on.
  return errors.length ? { ok: false, errors } : { ok: true, value: { answers } };
}
