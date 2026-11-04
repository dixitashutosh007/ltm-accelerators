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
}

export interface Figure { field: string; value: number; unit: 'currency'; claimIds: string[]; assumptionIds: string[] }
export interface LeverCase { runRate: Figure; year1: Figure; year2: Figure; year3: Figure; oneOffCost: Figure; ongoingCost: Figure; netRunRate: Figure; net3Year: Figure }
export interface LeverLine { id: string; name: string; findingId: string; label: string; base: Figure; cases: Record<Case, LeverCase> }
export interface TotalCase { netRunRate: Figure; net3Year: Figure }
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
        netRunRate: fig(`${k}.netRunRate`, run - money(ongoing)), net3Year: fig(`${k}.net3Year`, y1 + y2 + y3 - money(oneOff) - 3 * money(ongoing))
      };
    }
    out.lines.push({ id: lever.id, name: lever.name, findingId: lever.findingId, label: lever.label, base: fig(`${p}.base`, e.unusedAnnualCost), cases });
  }
  if (!out.lines.length) return out;
  out.status = 'quantified';
  const cloud = finops?.status === 'quantified' && finops.cases && finops.currency === out.currency ? finops : null;
  const totals = {} as Record<Case, TotalCase>;
  for (const c of CASES) {
    const nr = out.lines.reduce((t, l) => t + l.cases[c].netRunRate.value, 0) + (cloud ? cloud.cases![c].netRunRate.value : 0);
    const n3 = out.lines.reduce((t, l) => t + l.cases[c].net3Year.value, 0) + (cloud ? cloud.cases![c].net3Year.value : 0);
    totals[c] = { netRunRate: fig(`total.cases.${c}.netRunRate`, nr), net3Year: fig(`total.cases.${c}.net3Year`, n3) };
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
  return { ok: true, value: { currency: o.currency, ...(o.internalRatePerFteMonth !== undefined ? { internalRatePerFteMonth: o.internalRatePerFteMonth } : {}), ...(o.effortTier !== undefined ? { effortTier: o.effortTier } : {}), levers } };
}

/** The assessment's reporting currency: the one saved with it, else the answer to the currency question (CTX-01). */
export function reportingCurrency(item: { clientCurrency?: string | null; answersJson?: string | null }): string | undefined {
  if (item.clientCurrency) return item.clientCurrency;
  try { const v = JSON.parse(item.answersJson ?? '{}')['CTX-01']; return typeof v === 'string' && CURRENCY.test(v) ? v : undefined; } catch { return undefined; }
}
