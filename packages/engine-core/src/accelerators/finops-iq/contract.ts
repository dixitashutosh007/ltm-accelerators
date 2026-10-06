/**
 * Request contract for POST /api/evaluate/finops-iq, shared by the Lambda and the tests.
 * Answers are option indexes, or "__NA__" for "not applicable". Rules come from the knowledge base.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { FinOpsIqInput } from './evaluate';

export const NOT_APPLICABLE = '__NA__';

export type FinOpsIqParseResult =
  | { ok: true; value: FinOpsIqInput }
  | { ok: false; errors: string[] };

const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

export function parseFinOpsIqRequest(body: unknown, kb: any = defaultKb): FinOpsIqParseResult {
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
    const n = (q.options || []).length;
    if (a !== NOT_APPLICABLE && !(Number.isInteger(a) && (a as number) >= 0 && (a as number) < n)) {
      errors.push(`answers.${id}: expected an option index 0-${n - 1} or "${NOT_APPLICABLE}"`);
    }
  }

  let annualSpend: number | undefined;
  if (b.annualSpend !== undefined) {
    if (typeof b.annualSpend === 'number' && Number.isFinite(b.annualSpend) && b.annualSpend >= 0 && b.annualSpend <= 1e12) annualSpend = b.annualSpend;
    else errors.push('annualSpend: expected an amount from 0 to 1e12');
  }

  const raw = b.org && typeof b.org === 'object' ? b.org : {};
  const org: NonNullable<FinOpsIqInput['org']> = {};
  for (const [key, target] of [['name', 'name'], ['sector', 'industry'], ['industry', 'industry']] as const) {
    if (raw[key] === undefined) continue;
    if (shortText(raw[key], 200)) org[target] = raw[key];
    else errors.push(`org.${key}: expected text up to 200 characters`);
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, annualSpend, org } };
}
