/**
 * Sovereign IQ v4 request contract (PLAN S3): one shape for both modes. Checks every answer against the question bank
 * (known question, the right shape for its type, option values that exist) and returns the cleaned input or the
 * reasons it was rejected. Answers to questions the mode does not ask are accepted and ignored by the engine.
 */
import { QUESTIONS, type SovereignIqV4Input } from './evaluate';
import { DATA_CLASSES } from './facts';

const Q = new Map<string, any>(QUESTIONS.map(q => [q.id, q]));
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TURNOVER = 1e13;

/** The option values of a question or field, following optionsFrom. */
function optionValues(x: any): string[] {
  if (x.options) return x.options.map((o: any) => o.value);
  if (x.optionsFrom) return optionValues(Q.get(x.optionsFrom));
  return [];
}

function checkSingle(v: unknown, allowed: string[], at: string, errors: string[]) {
  if (typeof v !== 'string' || !allowed.includes(v)) errors.push(`${at}: must be one of ${allowed.join(', ')}`);
}
function checkMulti(v: unknown, allowed: string[], at: string, errors: string[]) {
  if (!Array.isArray(v) || v.some(x => typeof x !== 'string' || !allowed.includes(x)) || new Set(v).size !== v.length) errors.push(`${at}: must be a list of distinct values from ${allowed.join(', ')}`);
}
function checkField(f: any, v: unknown, at: string, errors: string[]) {
  if (v === undefined) return;
  if (f.type === 'single') checkSingle(v, optionValues(f), at, errors);
  else if (f.type === 'multi') checkMulti(v, optionValues(f), at, errors);
  else if (f.type === 'number_with_currency') {
    const m = v as { amount?: unknown; currency?: unknown };
    if (!m || typeof m !== 'object' || typeof m.amount !== 'number' || !(m.amount > 0) || m.amount > MAX_TURNOVER || typeof m.currency !== 'string' || !/^[A-Z]{3}$/.test(m.currency)) {
      errors.push(`${at}: must be { amount: a positive number, currency: an ISO 4217 code }`);
    }
  }
}

export function parseSovereignIqV4Input(body: unknown): { ok: true; input: SovereignIqV4Input } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.mode !== 'executive' && b.mode !== 'workshop') errors.push('mode: must be executive or workshop');
  if (typeof b.assessmentDate !== 'string' || !DATE.test(b.assessmentDate)) errors.push('assessmentDate: must be YYYY-MM-DD');
  const answers = b.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) errors.push('answers: must be an object keyed by question ID');
  const out: Record<string, unknown> = {};
  for (const [id, v] of Object.entries((answers ?? {}) as Record<string, unknown>)) {
    const q = Q.get(id);
    if (!q) { errors.push(`${id}: unknown question`); continue; }
    if (v === null || v === undefined) continue;
    const before = errors.length;
    if (q.type === 'single') checkSingle(v, optionValues(q), id, errors);
    else if (q.type === 'multi') checkMulti(v, optionValues(q), id, errors);
    else if (q.type === 'compound') {
      if (typeof v !== 'object' || Array.isArray(v)) errors.push(`${id}: must be an object of fields`);
      else for (const [k, fv] of Object.entries(v as object)) {
        const f = q.fields.find((x: any) => x.key === k);
        if (!f) errors.push(`${id}.${k}: unknown field`); else checkField(f, fv, `${id}.${k}`, errors);
      }
    } else if (q.type === 'matrix') {
      if (typeof v !== 'object' || Array.isArray(v)) { errors.push(`${id}: must be an object`); continue; }
      const cols = new Map<string, any>(q.matrix.columns.map((c: any) => [c.key, c]));
      if (q.matrix.rowsFrom === 'A1') {
        // Keyed by column (A2): each column a list of zones.
        for (const [k, cv] of Object.entries(v as object)) {
          const c = cols.get(k);
          if (!c) errors.push(`${id}.${k}: unknown column`);
          else checkMulti(cv, [...optionValues(c), ...(k === 'people' ? ['unknown'] : [])], `${id}.${k}`, errors);
        }
      } else {
        // Keyed by data class (D3, L2): each row an object of columns.
        for (const [row, rv] of Object.entries(v as object)) {
          if (!DATA_CLASSES.includes(row as any)) { errors.push(`${id}.${row}: unknown data class`); continue; }
          if (!rv || typeof rv !== 'object' || Array.isArray(rv)) { errors.push(`${id}.${row}: must be an object`); continue; }
          for (const [k, cv] of Object.entries(rv as object)) {
            const c = cols.get(k);
            const extra = id === 'D3' ? ['unknown'] : [];
            if (!c) errors.push(`${id}.${row}.${k}: unknown column`);
            else if (c.type === 'single') checkSingle(cv, optionValues(c), `${id}.${row}.${k}`, errors);
            else checkMulti(cv, [...optionValues(c), ...extra], `${id}.${row}.${k}`, errors);
          }
        }
      }
    }
    if (errors.length === before) out[id] = v;
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, input: { mode: b.mode as SovereignIqV4Input['mode'], assessmentDate: b.assessmentDate as string, answers: out } };
}
