/**
 * Sovereign IQ v4 condition language (DESIGN.md 5.2): rules are data, evaluated against the fact model, with no free
 * code in the registry. Used for regime applicability, level floors, required controls and question triggers.
 *
 * A fact counts as unknown when it is missing, empty, or holds 'unknown', 'not_assessed' or 'not_given' (or a set
 * containing 'unknown'). Comparisons on an unknown fact are false; only `is_unknown` sees it.
 */

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { derived: string }
  | { fact: string; op: 'eq' | 'neq' | 'in' | 'includes' | 'includes_any' | 'includes_all' | 'gte' | 'lte'; value: unknown }
  | { fact: string; op: 'is_unknown' | 'is_answered' };

/** Ordered enums for gte and lte (facts.schema.json x-order). */
export const ORDER: Record<string, string[]> = {
  'derived.max_required_level': ['L0', 'L1', 'L2', 'L3', 'L4'],
  'org.staff_band': ['lt50', '50_249', '250plus'],
  'org.turnover_band_eur': ['lt10m', '10m_50m', '50m_250m', '250m_1bn', '1bn_10bn', 'gt10bn'],
  'org.balance_sheet_band_eur': ['le10m', '10m_43m', 'gt43m'],
  'data.personal_volume': ['lt10k', '10k_100k', '100k_1m', 'gt1m']
};

const UNKNOWN = new Set(['unknown', 'not_assessed', 'not_given']);

/** Reads a dotted path from the fact object (facts are stored flat, e.g. facts['org.hq']). */
export function factValue(facts: Record<string, unknown>, path: string): unknown {
  return facts[path];
}

export function isUnknown(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (typeof v === 'string') return UNKNOWN.has(v);
  if (Array.isArray(v)) return v.length === 0 || v.includes('unknown');
  return false;
}

export interface ConditionContext {
  facts: Record<string, unknown>;
  predicates: Record<string, Condition>;
}

export function evaluate(c: Condition, ctx: ConditionContext): boolean {
  if ('all' in c) return c.all.every(x => evaluate(x, ctx));
  if ('any' in c) return c.any.some(x => evaluate(x, ctx));
  if ('not' in c) return !evaluate(c.not, ctx);
  if ('derived' in c) {
    const p = ctx.predicates[c.derived];
    if (!p) throw new Error(`condition: unknown predicate ${c.derived}`);
    return evaluate(p, ctx);
  }
  const v = factValue(ctx.facts, c.fact);
  if (c.op === 'is_unknown') return isUnknown(v);
  if (c.op === 'is_answered') return !isUnknown(v);
  const value = (c as { value: unknown }).value;
  if (isUnknown(v) && !(Array.isArray(v) && v.length && c.op.startsWith('includes'))) return false;
  const set = Array.isArray(v) ? v : [v];
  switch (c.op) {
    case 'eq': return v === value;
    case 'neq': return v !== value;
    case 'in': return (value as unknown[]).includes(v);
    case 'includes': return set.includes(value);
    case 'includes_any': return (value as unknown[]).some(x => set.includes(x));
    case 'includes_all': return (value as unknown[]).every(x => set.includes(x));
    case 'gte':
    case 'lte': {
      const order = ORDER[c.fact];
      if (!order) throw new Error(`condition: ${c.fact} is not an ordered fact`);
      const a = order.indexOf(v as string), b = order.indexOf(value as string);
      if (a < 0 || b < 0) return false;
      return c.op === 'gte' ? a >= b : a <= b;
    }
  }
  throw new Error(`condition: unknown operator ${(c as { op: string }).op}`);
}
