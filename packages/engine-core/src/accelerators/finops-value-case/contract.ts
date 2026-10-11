/**
 * Request contract for POST /api/evaluate/finops-value-case.
 *
 * Shared by the Lambda (to reject malformed requests with a clear 400) and the tests (to prove the
 * page sends what the engine reads). The rules come from the knowledge base, so adding a question
 * there needs no change here.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { AssessmentAnswers, AssessmentOrg } from './evaluate';

export const DONT_KNOW = '__DK__';
export const SECTOR_CLASSES = ['bfsi', 'other'] as const;

export interface FinOpsValueCaseRequest {
  answers: AssessmentAnswers;
  org: AssessmentOrg;
}

export type ParseResult =
  | { ok: true; value: FinOpsValueCaseRequest }
  | { ok: false; errors: string[] };

const isIndex = (v: unknown, options: unknown[] | undefined) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < (options?.length ?? 0);
const isFiniteNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

/** Returns a reason the answer is invalid for the question, or null if it is valid. */
function answerError(q: any, a: unknown): string | null {
  if (a === DONT_KNOW) return null;
  switch (q.answer_type) {
    case 'single_select':
    case 'card_select':
      return isIndex(a, q.options) ? null : `expected an option index 0-${(q.options?.length ?? 1) - 1}`;
    case 'multi_select':
    case 'multi_select_logo':
      return Array.isArray(a) && a.every(i => isIndex(i, q.options)) ? null : 'expected a list of option indexes';
    case 'boolean_dk':
      return a === 'yes' || a === 'no' || a === 'dk' ? null : 'expected "yes", "no" or "dk"';
    case 'rating_1_5':
      return Number.isInteger(a) && (a as number) >= 1 && (a as number) <= 5 ? null : 'expected a rating 1-5';
    case 'slider_percent':
    case 'slider_signed':
    case 'slider_currency': {
      const sl = q.slider || {};
      return isFiniteNumber(a) && (a as number) >= sl.min && (a as number) <= sl.max ? null : `expected a number ${sl.min}-${sl.max}`;
    }
    case 'allocation_100': {
      // Deliberately lenient on the total: the page's sliders can sum to anything, so the page scales the
      // split to 100 before sending and the engine scales any other total too. Rejecting would 400 real users.
      if (!a || typeof a !== 'object' || Array.isArray(a)) return 'expected an allocation object';
      const vals = Object.values(a as Record<string, unknown>);
      return vals.every(v => isFiniteNumber(v) && (v as number) >= 0 && (v as number) <= 100) ? null : 'expected allocation values 0-100';
    }
    case 'drag_order':
      return Array.isArray(a) && a.every(v => shortText(v, 200)) ? null : 'expected an ordered list of labels';
    case 'open_text':
      return shortText(a, 5000) ? null : 'expected text up to 5000 characters';
    default:
      return `unsupported answer type ${q.answer_type}`;
  }
}

/**
 * Validates and normalises a request body.
 * Also accepts the pre-Phase-2 page payload ({ currency, org: { industry } }) so a cached page keeps working.
 */
export function parseFinOpsValueCaseRequest(body: unknown, kb: any = defaultKb): ParseResult {
  const errors: string[] = [];
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;

  const answers = b.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, errors: ['"answers" must be an object keyed by question id'] };
  }
  const questions = new Map<string, any>(kb.questions.map((q: any) => [q.id, q]));
  for (const [id, a] of Object.entries(answers)) {
    const q = questions.get(id);
    if (!q) { errors.push(`answers.${id}: unknown question`); continue; }
    const err = answerError(q, a);
    if (err) errors.push(`answers.${id}: ${err}`);
  }

  const rawOrg = b.org && typeof b.org === 'object' ? b.org : {};
  const org: AssessmentOrg = {};
  const name = rawOrg.name;
  const sector = rawOrg.sector ?? rawOrg.industry;
  const currency = rawOrg.currency ?? b.currency;
  if (name !== undefined) { if (shortText(name, 200)) org.name = name; else errors.push('org.name: expected text up to 200 characters'); }
  if (sector !== undefined) { if (shortText(sector, 200)) org.sector = sector; else errors.push('org.sector: expected text up to 200 characters'); }
  if (rawOrg.sector_class !== undefined) {
    if ((SECTOR_CLASSES as readonly string[]).includes(rawOrg.sector_class)) org.sector_class = rawOrg.sector_class;
    else errors.push(`org.sector_class: expected one of ${SECTOR_CLASSES.join(', ')}`);
  }
  if (currency !== undefined) {
    const id = String(currency).toLowerCase();
    if (kb.meta.currencies.some((c: any) => c.id === id)) org.currency = id;
    else errors.push(`org.currency: expected one of ${kb.meta.currencies.map((c: any) => c.id).join(', ')}`);
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, org } };
}
