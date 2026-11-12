/**
 * Cost IQ's non-cloud levers (CQ4, stage 3 of the shared value model) and the total.
 *
 * A lever is the client's own measured base times a case share (a quarter, a half, all of it), phased over three years
 * and net of the cost to deliver it, as FinOps IQ's levers are. Nothing is estimated from questionnaire answers and no
 * published percentage is applied: no public source gives a range for these levers (non-cloud-lever-sources.md).
 *
 * One cloud figure per estate: the cloud line is FinOps IQ's summary, added to the total as it stands and never
 * recomputed. The lever library holds no FinOps IQ lever ID (the single-figure guard test checks this). A lever whose
 * base exceeds the spend it draws from is refused, so a lever can never be larger than its addressable base.
 */
import library from './non-cloud-levers.json' with { type: 'json' };
import type { CostIqSummary } from '../finops-iq/v3/cost-iq-summary';

export const NON_CLOUD_SCHEMA = 'cost-iq-non-cloud/1';
export const CASES = ['conservative', 'expected', 'upper'] as const;
export type Case = typeof CASES[number];

/** What the consultant records per lever, from the client's own data. */
export interface LeverEvidence {
  /** The client's measured base: annual cost, in the reporting currency, of what the lever would remove. */
  unusedAnnualCost: number;
  /** The annual spend the base is drawn from; when given, the base may not exceed it. */
  addressableSpend?: number;
  /** The share of the contracts that renew in year one (0 to 1); 0.25 when not given, as FinOps IQ does for licences. */
  renewingYear1Share?: number;
}
export interface NonCloudEvidence {
  currency: string;
  /** The client's own cost of one FTE-month. An assumed salary would be unsourced, so without it no net figure is shown. */
  internalRatePerFteMonth?: number;
  /** Delivery effort tier 1, 2 or 3 (the FinOps IQ tiers); 2 when not given. */
  effortTier?: 1 | 2 | 3;
  levers: Record<string, LeverEvidence>;
  /** The client's own spend baseline (product-grade plan C1), recorded by the consultant; it narrows the indicative ranges. */
  baseline?: SpendBaseline;
}

/**
 * The exact annual technology spend in scope, in the evidence currency, and its split by Cost IQ category in percent (summing
 * to 100). Either replaces what the questionnaire gave: the band, and the typical shares.
 */
export interface SpendBaseline { exactAnnualSpend?: number; splitPercent?: Record<string, number>; units?: UnitCounts }
/** C2: headcount and estate counts, for unit costs (spend per employee, user, server, application) and plausibility checks. */
export interface UnitCounts { employees?: number; users?: number; servers?: number; applications?: number }
export const UNIT_KEYS = ['employees', 'users', 'servers', 'applications'] as const;
export const BASELINE_CATEGORIES = ['INFRA', 'CLOUD', 'SAAS', 'SOFTWARE', 'APPS', 'NETWORK', 'DATA', 'SECURITY', 'PEOPLE', 'EXTERNAL', 'END_USER', 'OTHER'];

function parseBaseline(b: any): { ok: true; value: SpendBaseline } | { ok: false; error: string } {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'baseline must be an object' };
  const out: SpendBaseline = {};
  if (b.exactAnnualSpend !== undefined) {
    if (!valid(b.exactAnnualSpend) || b.exactAnnualSpend <= 0) return { ok: false, error: 'baseline.exactAnnualSpend: expected a positive number' };
    out.exactAnnualSpend = b.exactAnnualSpend;
  }
  if (b.splitPercent !== undefined) {
    const sp = b.splitPercent;
    if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return { ok: false, error: 'baseline.splitPercent must be an object' };
    const split: Record<string, number> = {};
    for (const [k, v] of Object.entries<any>(sp)) {
      if (!BASELINE_CATEGORIES.includes(k)) return { ok: false, error: `baseline.splitPercent.${k}: unknown category` };
      if (!valid(v) || v > 100) return { ok: false, error: `baseline.splitPercent.${k}: expected a percentage from 0 to 100` };
      if (v > 0) split[k] = v;
    }
    const sum = Object.values(split).reduce((t, v) => t + v, 0);
    if (Math.abs(sum - 100) > 1) return { ok: false, error: `baseline.splitPercent: the shares add up to ${Math.round(sum * 10) / 10}%, not 100%` };
    out.splitPercent = split;
  }
  if (b.units !== undefined) {
    const u = b.units;
    if (!u || typeof u !== 'object' || Array.isArray(u)) return { ok: false, error: 'baseline.units must be an object' };
    const units: UnitCounts = {};
    for (const [k, v] of Object.entries<any>(u)) {
      if (!(UNIT_KEYS as readonly string[]).includes(k)) return { ok: false, error: `baseline.units.${k}: unknown measure` };
      if (!(typeof v === 'number' && Number.isInteger(v) && v > 0)) return { ok: false, error: `baseline.units.${k}: expected a whole number above zero` };
      units[k as keyof UnitCounts] = v;
    }
    if (Object.keys(units).length) out.units = units;
  }
  return { ok: true, value: out };
}

export interface Figure { field: string; value: number; unit: 'currency'; claimIds: string[]; assumptionIds: string[] }
/** year1 to year3 are gross earnings; netYear1 to netYear3 take off the one-off cost (year one) and the running cost (every year), and sum to net3Year. */
export interface LeverCase { runRate: Figure; year1: Figure; year2: Figure; year3: Figure; oneOffCost: Figure; ongoingCost: Figure; netRunRate: Figure; netYear1: Figure; netYear2: Figure; netYear3: Figure; net3Year: Figure }
/** `year1Basis` says which year-one rule applied, in words (no digits, so the report's number check stays strict). */
export interface LeverLine { id: string; name: string; findingId: string; label: string; base: Figure; year1Basis: string; cases: Record<Case, LeverCase> }
export interface TotalCase { netRunRate: Figure; netYear1: Figure; netYear2: Figure; netYear3: Figure; net3Year: Figure }
export interface NonCloudResult {
  schema: typeof NON_CLOUD_SCHEMA;
  libraryVersion: string;
  currency: string;
  status: 'quantified' | 'not_quantified';
  lines: LeverLine[];
  /** Why a lever with evidence was not sized, or what it still needs. */
  notSized: Array<{ id: string; name: string; reason: string }>;
  /** Present when at least one non-cloud lever is sized. */
  total: { cloudIncluded: boolean; cloudNote: string; cases: Record<Case, TotalCase> } | null;
}

const FACTOR: Record<Case, number> = { conservative: library.rangeRule.conservativeFactor, expected: library.rangeRule.expectedFactor, upper: library.rangeRule.upperFactor };
const ASM = ['A-08', 'A-09', 'A-10'];
const money = (n: number) => Math.round(n);
const fig = (field: string, value: number): Figure => ({ field, value: money(value), unit: 'currency', claimIds: [], assumptionIds: ASM });
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function evaluateNonCloud(evidence: NonCloudEvidence | null | undefined, raisedFindingIds: string[], finops: CostIqSummary | null): NonCloudResult {
  const out: NonCloudResult = { schema: NON_CLOUD_SCHEMA, libraryVersion: library.libraryVersion, currency: evidence?.currency ?? '', status: 'not_quantified', lines: [], notSized: [], total: null };
  if (!evidence) return out;
  const rate = evidence.internalRatePerFteMonth;
  const tier = String(evidence.effortTier ?? 2) as '1' | '2' | '3';
  for (const lever of library.levers) {
    const e = evidence.levers?.[lever.id];
    if (!e) continue;
    const refuse = (reason: string) => out.notSized.push({ id: lever.id, name: lever.name, reason });
    if (!raisedFindingIds.includes(lever.findingId)) { refuse(`Finding ${lever.findingId} is not raised on the answers given, so the lever is not sized.`); continue; }
    if (!valid(e.unusedAnnualCost) || e.unusedAnnualCost === 0) { refuse('The measured base is missing or zero.'); continue; }
    if (e.addressableSpend !== undefined && (!valid(e.addressableSpend) || e.unusedAnnualCost > e.addressableSpend)) { refuse('The measured base is larger than the spend it is drawn from, so it is not used.'); continue; }
    if (!valid(rate) || rate === 0) { refuse('The client\'s own cost of an FTE-month is needed for a net figure; an assumed salary would be unsourced.'); continue; }
    const share = e.renewingYear1Share !== undefined && e.renewingYear1Share >= 0 && e.renewingYear1Share <= 1 ? e.renewingYear1Share : lever.ramp.year1ShareWithoutRenewalData;
    const oneOff = (lever.effortFteMonths as Record<string, number>)[tier] * rate;
    const ongoing = oneOff * lever.ongoingShareOfOneOff;
    const p = `levers[${lever.id}]`;
    const cases = {} as Record<Case, LeverCase>;
    for (const c of CASES) {
      const run = money(e.unusedAnnualCost * FACTOR[c]);
      const y1 = money(run * share), y2 = money(run * lever.ramp.year2Share), y3 = money(run * lever.ramp.year3Share);
      const k = `${p}.cases.${c}`;
      cases[c] = {
        runRate: fig(`${k}.runRate`, run), year1: fig(`${k}.year1`, y1), year2: fig(`${k}.year2`, y2), year3: fig(`${k}.year3`, y3),
        oneOffCost: fig(`${k}.oneOffCost`, oneOff), ongoingCost: fig(`${k}.ongoingCost`, ongoing),
        netRunRate: fig(`${k}.netRunRate`, run - money(ongoing)),
        netYear1: fig(`${k}.netYear1`, y1 - money(oneOff) - money(ongoing)), netYear2: fig(`${k}.netYear2`, y2 - money(ongoing)), netYear3: fig(`${k}.netYear3`, y3 - money(ongoing)),
        net3Year: fig(`${k}.net3Year`, y1 + y2 + y3 - money(oneOff) - 3 * money(ongoing))
      };
    }
    out.lines.push({ id: lever.id, name: lever.name, findingId: lever.findingId, label: lever.label, base: fig(`${p}.base`, e.unusedAnnualCost), year1Basis: e.renewingYear1Share !== undefined && share === e.renewingYear1Share ? 'the client\'s own share of contracts renewing in year one' : 'a quarter, the default, because no renewal share was given', cases });
  }
  if (!out.lines.length) return out;
  out.status = 'quantified';
  const cloud = finops?.status === 'quantified' && finops.cases && finops.currency === out.currency ? finops : null;
  const totals = {} as Record<Case, TotalCase>;
  for (const c of CASES) {
    const nr = out.lines.reduce((t, l) => t + l.cases[c].netRunRate.value, 0) + (cloud ? cloud.cases![c].netRunRate.value : 0);
    const n3 = out.lines.reduce((t, l) => t + l.cases[c].net3Year.value, 0) + (cloud ? cloud.cases![c].net3Year.value : 0);
    const yr = (m: 'netYear1' | 'netYear2' | 'netYear3') => out.lines.reduce((t, l) => t + l.cases[c][m].value, 0) + (cloud ? cloud.cases![c][m].value : 0);
    totals[c] = { netRunRate: fig(`total.cases.${c}.netRunRate`, nr), netYear1: fig(`total.cases.${c}.netYear1`, yr('netYear1')), netYear2: fig(`total.cases.${c}.netYear2`, yr('netYear2')), netYear3: fig(`total.cases.${c}.netYear3`, yr('netYear3')), net3Year: fig(`total.cases.${c}.net3Year`, n3) };
  }
  out.total = {
    cloudIncluded: !!cloud,
    cloudNote: cloud ? 'The total is the non-cloud levers above plus the FinOps IQ cloud line, each as its own assessment produced it.'
      : finops?.status === 'quantified' && finops.currency !== out.currency ? `The total excludes the cloud line: it is in ${finops.currency} and the reporting currency is ${out.currency}, and no conversion is applied.`
      : 'The total excludes cloud: no FinOps IQ result is linked to this assessment.',
    cases: totals
  };
  return out;
}

export const NON_CLOUD_LEVER_IDS: string[] = library.levers.map(l => l.id);

const CURRENCY = /^(?:[A-Z]{3}|OTHER)$/;
/** The only fields a request may carry, checked the same way wherever the evidence is stored. Money fields must be finite and not negative. */
export function parseNonCloudEvidence(raw: unknown): { ok: true; value: NonCloudEvidence } | { ok: false; error: string } {
  const o = raw as any;
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, error: 'evidence must be an object' };
  if (typeof o.currency !== 'string' || !CURRENCY.test(o.currency)) return { ok: false, error: 'currency: expected a three-letter code or OTHER' };
  if (o.internalRatePerFteMonth !== undefined && !valid(o.internalRatePerFteMonth)) return { ok: false, error: 'internalRatePerFteMonth: expected a number, not negative' };
  if (o.effortTier !== undefined && ![1, 2, 3].includes(o.effortTier)) return { ok: false, error: 'effortTier: expected 1, 2 or 3' };
  if (!o.levers || typeof o.levers !== 'object' || Array.isArray(o.levers)) return { ok: false, error: 'levers must be an object' };
  const levers: Record<string, LeverEvidence> = {};
  for (const [id, e] of Object.entries<any>(o.levers)) {
    if (!NON_CLOUD_LEVER_IDS.includes(id)) return { ok: false, error: `levers.${id}: unknown lever` };
    if (!e || typeof e !== 'object' || !valid(e.unusedAnnualCost)) return { ok: false, error: `levers.${id}.unusedAnnualCost: expected a number, not negative` };
    if (e.addressableSpend !== undefined && !valid(e.addressableSpend)) return { ok: false, error: `levers.${id}.addressableSpend: expected a number, not negative` };
    if (e.renewingYear1Share !== undefined && !(valid(e.renewingYear1Share) && e.renewingYear1Share <= 1)) return { ok: false, error: `levers.${id}.renewingYear1Share: expected a share between 0 and 1` };
    levers[id] = { unusedAnnualCost: e.unusedAnnualCost, ...(e.addressableSpend !== undefined ? { addressableSpend: e.addressableSpend } : {}), ...(e.renewingYear1Share !== undefined ? { renewingYear1Share: e.renewingYear1Share } : {}) };
  }
  let baseline: SpendBaseline | undefined;
  if (o.baseline !== undefined && o.baseline !== null) {
    const b = parseBaseline(o.baseline);
    if (!b.ok) return b;
    if (b.value.exactAnnualSpend !== undefined || b.value.splitPercent || b.value.units) baseline = b.value;
  }
  return { ok: true, value: { currency: o.currency, ...(o.internalRatePerFteMonth !== undefined ? { internalRatePerFteMonth: o.internalRatePerFteMonth } : {}), ...(o.effortTier !== undefined ? { effortTier: o.effortTier } : {}), levers, ...(baseline ? { baseline } : {}) } };
}

/** The assessment's reporting currency: the one saved with it, else the answer to the currency question (CTX-01). */
export function reportingCurrency(item: { clientCurrency?: string | null; answersJson?: string | null }): string | undefined {
  if (item.clientCurrency) return item.clientCurrency;
  try { const v = JSON.parse(item.answersJson ?? '{}')['CTX-01']; return typeof v === 'string' && CURRENCY.test(v) ? v : undefined; } catch { return undefined; }
}
