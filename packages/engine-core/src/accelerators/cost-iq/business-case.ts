/**
 * Cost IQ business case per lever (PRODUCT-GRADE-PLAN.md, E1). For each counted indicative lever (one per category): the
 * run-rate saving (its indicative range), the one-off cost of the recommended step that addresses it (the delivery library's
 * effort in FTE-weeks, costed at the client's own rate), the payback month and the net over three years.
 *
 * Phasing and running cost follow the rule the measured licence lever uses (A-09): year one earns a quarter of the run rate,
 * years two and three earn all of it, and a fifth of the one-off cost recurs each year. Without the client's own rate no money
 * is shown for cost, payback or net, only the effort: LTM does not assume a salary. An advisory step's effort is that step
 * only; the cost of making the change it recommends is agreed once the saving is measured, and the case says so.
 */
import type { IndicativeLine, IndicativeResult } from './indicative';

export const YEAR_ONE_SHARE = 0.25;
export const RUNNING_SHARE = 0.2;
export const WEEKS_PER_MONTH = 52 / 12;

export interface CasePackage { recommendationId: string; offeringType: 'advisory' | 'implementation' | 'transformation'; effortFteWeeks: [number, number] }
export interface CaseLine {
  findingId: string;
  /** The recommendation whose step is costed; null when no step addresses the finding. */
  recommendationId: string | null;
  offeringType: CasePackage['offeringType'] | null;
  /** True when the step was costed on an earlier line, so it is not costed twice. */
  sharedWith: string | null;
  effortFteWeeks: [number, number] | null;
  /** Annual run-rate saving, as the indicative range. */
  runLow: number | null; runHigh: number | null;
  /** In the client's currency, from the client's rate; null without it. */
  oneOffLow: number | null; oneOffHigh: number | null;
  /** Months to pay back the one-off cost: best case (high saving, low cost) and worst (low saving, high cost); null when not reached in three years or not computable. */
  paybackBest: number | null; paybackWorst: number | null;
  /** Net over three years: low (low saving, high cost) and high (high saving, low cost). */
  net3Low: number | null; net3High: number | null;
}
export interface BusinessCase { currency: string; rated: boolean; lines: CaseLine[]; total: { runLow: number | null; runHigh: number | null; oneOffLow: number | null; oneOffHigh: number | null; net3Low: number | null; net3High: number | null } }

const gross3 = (run: number) => run * (YEAR_ONE_SHARE + 2);
const net3 = (run: number, oneOff: number) => Math.round(gross3(run) - oneOff - 3 * RUNNING_SHARE * oneOff);
/** The first month in which the saving earned so far covers the one-off cost and the running cost; null beyond 36 months. */
function payback(run: number, oneOff: number): number | null {
  if (!(run > 0)) return null;
  let earned = 0, cost = oneOff;
  for (let m = 1; m <= 36; m++) {
    earned += (run / 12) * (m <= 12 ? YEAR_ONE_SHARE : 1);
    if (m % 12 === 1) cost += RUNNING_SHARE * oneOff;
    if (earned >= cost) return m;
  }
  return null;
}

/**
 * The business case. `stepFor` gives the recommended step for a finding (or null); `ratePerFteMonth` is the client's own
 * cost of one FTE-month, in the same currency as the indicative ranges, or null.
 */
export function evaluateBusinessCase(ind: IndicativeResult, stepFor: (findingId: string) => CasePackage | null, ratePerFteMonth: number | null | undefined): BusinessCase {
  const rated = !!ratePerFteMonth && ratePerFteMonth > 0;
  const weekly = rated ? ratePerFteMonth! / WEEKS_PER_MONTH : 0;
  const costed = new Map<string, string>();
  const lines: CaseLine[] = ind.lines.filter(l => l.counted).sort((a, b) => b.shareHigh - a.shareHigh).map((l: IndicativeLine) => {
    const p = stepFor(l.findingId);
    const shared = p ? costed.get(p.recommendationId) ?? null : null;
    if (p && !shared) costed.set(p.recommendationId, l.findingId);
    const effort = p && !shared ? p.effortFteWeeks : null;
    const oneOffLow = rated && effort ? Math.round(effort[0] * weekly) : rated && p ? 0 : null;
    const oneOffHigh = rated && effort ? Math.round(effort[1] * weekly) : rated && p ? 0 : null;
    const ok = rated && oneOffLow != null && oneOffHigh != null;
    return {
      findingId: l.findingId, recommendationId: p?.recommendationId ?? null, offeringType: p?.offeringType ?? null, sharedWith: shared, effortFteWeeks: effort,
      runLow: l.low, runHigh: l.high, oneOffLow, oneOffHigh,
      paybackBest: ok && l.high != null ? payback(l.high, oneOffLow!) : null,
      paybackWorst: ok && l.low != null ? payback(l.low, oneOffHigh!) : null,
      net3Low: ok && l.low != null ? net3(l.low, oneOffHigh!) : null,
      net3High: ok && l.high != null ? net3(l.high, oneOffLow!) : null
    };
  });
  const sum = (k: keyof CaseLine) => (lines.every(x => x[k] != null) && lines.length ? lines.reduce((t, x) => t + (x[k] as number), 0) : null);
  // The run-rate total is the indicative total itself (computed from the summed shares), not a sum of rounded lines.
  return { currency: ind.currency, rated, lines, total: { runLow: ind.total?.low ?? null, runHigh: ind.total?.high ?? null, oneOffLow: sum('oneOffLow'), oneOffHigh: sum('oneOffHigh'), net3Low: sum('net3Low'), net3High: sum('net3High') } };
}

/** The traced fields: case.lines[F-009].oneOffLow and so on, and case.total.*. */
export function businessCaseFigures(b: BusinessCase): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of b.lines) for (const k of ['oneOffLow', 'oneOffHigh', 'paybackBest', 'paybackWorst', 'net3Low', 'net3High'] as const) if (l[k] != null) m.set(`case.lines[${l.findingId}].${k}`, l[k] as number);
  for (const [k, v] of Object.entries(b.total)) if (v != null) m.set(`case.total.${k}`, v);
  return m;
}
