/**
 * Request contract for POST /api/evaluate/strategy-iq, shared by the Lambda and the tests.
 * Rules come from the knowledge base. Single-select answers are option indexes.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { StrategyIqInput } from './evaluate';

export type StrategyIqParseResult =
  | { ok: true; value: StrategyIqInput }
  | { ok: false; errors: string[] };

const isIndex = (v: unknown, list: unknown[] | undefined) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < (list?.length ?? 0);
const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

function answerError(q: any, a: unknown): string | null {
  switch (q.type) {
    case 'single_select':
      return isIndex(a, q.opts) ? null : `expected an option index 0-${q.opts.length - 1}`;
    case 'multi_select':
      return Array.isArray(a) && a.every(i => isIndex(i, q.opts)) ? null : 'expected a list of option indexes';
    case 'slider': {
      const { min, max } = q.sliderConfig;
      return typeof a === 'number' && Number.isFinite(a) && a >= min && a <= max ? null : `expected a number ${min}-${max}`;
    }
    case 'rating_matrix': {
      if (!a || typeof a !== 'object' || Array.isArray(a)) return 'expected ratings keyed by item id';
      const ids = new Set(q.subItems.map((s: any) => s.id));
      for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
        if (!ids.has(k)) return `unknown item ${k}`;
        if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 5) return `rating for ${k} must be 1-5`;
      }
      return null;
    }
    case 'drag_rank': {
      const ids = new Set(q.rankItems.map((r: any) => r.id));
      return Array.isArray(a) && a.every(v => ids.has(v)) && new Set(a).size === a.length ? null : 'expected a ranking of item ids';
    }
    default:
      return `unsupported question type ${q.type}`;
  }
}

export function parseStrategyIqRequest(body: unknown, kb: any = defaultKb): StrategyIqParseResult {
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

  const raw = b.intake && typeof b.intake === 'object' ? b.intake : {};
  const intake: NonNullable<StrategyIqInput['intake']> = {};
  for (const key of ['orgName', 'sector', 'execRole'] as const) {
    if (raw[key] === undefined) continue;
    if (shortText(raw[key], 200)) intake[key] = raw[key];
    else errors.push(`intake.${key}: expected text up to 200 characters`);
  }
  if (raw.itSpend !== undefined) {
    if (typeof raw.itSpend === 'number' && Number.isFinite(raw.itSpend) && raw.itSpend > 0 && raw.itSpend <= 1e12) intake.itSpend = raw.itSpend;
    else errors.push('intake.itSpend: expected a positive amount');
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, intake } };
}
