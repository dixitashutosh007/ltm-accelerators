/**
 * Cost IQ indicative value (PRODUCT-GRADE-PLAN.md, A1; owner decision of 12 Nov 2026).
 *
 * Each raised cost finding gets an LTM planning range: the share of in-scope technology spend in its category, times a
 * planning rate, times both ends of the spend band the client chose. It is an LTM heuristic, labelled as such, and is
 * replaced by a measured figure wherever the client supplies one (non-cloud-levers.ts). Cloud and SaaS stay with FinOps IQ,
 * so they are never sized here. Findings in one category overlap, so a category counts once in the total.
 *
 * The band edges are read from the labels the client saw when choosing the band, so the money matches what they picked.
 */
import library from './indicative-ranges.json' with { type: 'json' };
import config from './canon/config/master-v6.6.json' with { type: 'json' };
import references from './published-references.json' with { type: 'json' };

export const INDICATIVE_SCHEMA = 'cost-iq-indicative/1';
export const INDICATIVE_ASSUMPTIONS = ['A-12', 'A-13', 'A-14'];

export interface IndicativeLine {
  findingId: string;
  category: string;
  /** The finding's lever, in words. */
  lever: string;
  /** Share of in-scope spend, as fractions. */
  shareLow: number; shareHigh: number;
  /** Annual run rate in `currency`; null when no spend band was given, or (high) when the band is open. */
  low: number | null; high: number | null;
  /** False when another raised finding in the same category has the larger range, so this one is not added to the total. */
  counted: boolean;
}
export interface IndicativeResult {
  schema: typeof INDICATIVE_SCHEMA;
  libraryVersion: string;
  currency: string;
  /** The spend band's edges in `currency`; null when the client gave no band. */
  spend: { low: number; high: number | null } | null;
  /** True when the client did not say which categories the spend figure includes, so every category is assumed. */
  categoriesAssumed: boolean;
  lines: IndicativeLine[];
  notSized: Array<{ findingId: string; reason: 'cloud' | 'enabler' | 'excluded' | 'measured' }>;
  total: { shareLow: number; shareHigh: number; low: number | null; high: number | null } | null;
}

const SHARES = library.categoryShares as unknown as Record<string, number>;
const CATEGORIES = Object.keys(SHARES).filter(k => k !== 'note');
const FINDINGS = library.findings as unknown as Record<string, { category: string; rate: [number, number]; lever: string }>;
const ELSEWHERE = library.elsewhere as Record<string, string>;
const SPEND = (config as any).questions.find((q: any) => q.id === 'CORE-04');
const UNIT: Record<string, number> = { M: 1e6, bn: 1e9 };

/** The edges of a band label such as "EUR 4.5M to 22M", "Below GBP 3.7M" or "Above INR 95bn". */
export function bandEdges(label: string): { low: number; high: number | null } | null {
  const m = /^(Below|Above)?\s*[A-Z]{3}\s([\d.]+)(M|bn)(?:\s+to\s+([\d.]+)(M|bn))?$/.exec(String(label ?? '').trim());
  if (!m) return null;
  const a = Number(m[2]) * UNIT[m[3]];
  if (m[1] === 'Below') return { low: 0, high: a };
  if (m[1] === 'Above') return { low: a, high: null };
  return m[4] ? { low: a, high: Number(m[4]) * UNIT[m[5]] } : null;
}

/**
 * The spend band in the currency the client saw it in: the reporting currency's labels where they exist, otherwise the
 * US dollar band (the page shows US dollar bands for any currency without its own labels).
 */
export function spendBand(answers: Record<string, unknown>, reportingCurrency?: string): { currency: string; low: number; high: number | null } | null {
  const id = String(answers['CORE-04'] ?? '');
  const usd = (references as any).bandsUsd.spend[id] as [number, number | null] | undefined;
  if (!usd) return null;
  const cur = String(reportingCurrency ?? answers['CTX-01'] ?? '');
  const label = SPEND?.labelsByCurrency?.[cur]?.[id];
  const edges = label ? bandEdges(label) : null;
  return edges ? { currency: cur, ...edges } : { currency: 'USD', low: usd[0], high: usd[1] };
}

const round = (n: number) => Math.round(n);

/**
 * The indicative ranges for the raised findings. `measured` lists findings sized from the client's own figures, which
 * replace their range.
 */
export function evaluateIndicative(answers: Record<string, unknown>, raisedFindingIds: string[], reportingCurrency?: string, measured: string[] = []): IndicativeResult {
  const band = spendBand(answers, reportingCurrency);
  const inc = Array.isArray(answers['CORE-05']) ? (answers['CORE-05'] as unknown[]).map(String).filter(x => CATEGORIES.includes(x)) : [];
  const assumed = !inc.length || (Array.isArray(answers['CORE-05']) && (answers['CORE-05'] as unknown[]).includes('UNKNOWN'));
  const scope = assumed ? CATEGORIES : inc;
  const sum = scope.reduce((t, k) => t + SHARES[k], 0);
  const out: IndicativeResult = { schema: INDICATIVE_SCHEMA, libraryVersion: library.libraryVersion, currency: band?.currency ?? String(reportingCurrency ?? 'USD'), spend: band ? { low: band.low, high: band.high } : null, categoriesAssumed: assumed, lines: [], notSized: [], total: null };
  for (const id of raisedFindingIds) {
    if (ELSEWHERE[id]) { out.notSized.push({ findingId: id, reason: 'cloud' }); continue; }
    const f = FINDINGS[id];
    if (!f) { out.notSized.push({ findingId: id, reason: 'enabler' }); continue; }
    if (measured.includes(id)) { out.notSized.push({ findingId: id, reason: 'measured' }); continue; }
    if (!scope.includes(f.category)) { out.notSized.push({ findingId: id, reason: 'excluded' }); continue; }
    const share = Math.min(1, SHARES[f.category] / sum);
    const shareLow = share * f.rate[0], shareHigh = share * f.rate[1];
    out.lines.push({
      findingId: id, category: f.category, lever: f.lever, shareLow, shareHigh,
      low: band ? round(band.low * shareLow) : null,
      high: band && band.high != null ? round(band.high * shareHigh) : null,
      counted: false
    });
  }
  // One range per category: the finding with the largest upper share carries it (ties to the first raised).
  for (const cat of new Set(out.lines.map(l => l.category))) {
    const top = out.lines.filter(l => l.category === cat).reduce((m, l) => (l.shareHigh > m.shareHigh ? l : m));
    top.counted = true;
  }
  const counted = out.lines.filter(l => l.counted);
  if (counted.length) {
    const shareLow = counted.reduce((t, l) => t + l.shareLow, 0), shareHigh = counted.reduce((t, l) => t + l.shareHigh, 0);
    out.total = { shareLow, shareHigh, low: band ? round(band.low * shareLow) : null, high: band && band.high != null ? round(band.high * shareHigh) : null };
  }
  return out;
}

/** Every figure the result carries, by the field name the report traces. */
export function indicativeFigures(r: IndicativeResult): Map<string, number> {
  const m = new Map<string, number>();
  if (r.spend) { m.set('indicative.spend.low', r.spend.low); if (r.spend.high != null) m.set('indicative.spend.high', r.spend.high); }
  for (const l of r.lines) {
    const p = `indicative.findings[${l.findingId}]`;
    m.set(`${p}.shareLow`, l.shareLow); m.set(`${p}.shareHigh`, l.shareHigh);
    if (l.low != null) m.set(`${p}.low`, l.low);
    if (l.high != null) m.set(`${p}.high`, l.high);
  }
  if (r.total) {
    m.set('indicative.total.shareLow', r.total.shareLow); m.set('indicative.total.shareHigh', r.total.shareHigh);
    if (r.total.low != null) m.set('indicative.total.low', r.total.low);
    if (r.total.high != null) m.set('indicative.total.high', r.total.high);
  }
  return m;
}

export const INDICATIVE_LIBRARY = library;
