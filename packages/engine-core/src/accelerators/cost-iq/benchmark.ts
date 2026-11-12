/**
 * The LTM benchmark dataset (PRODUCT-GRADE-PLAN.md, C4; owner decision of 12 Nov 2026: build LTM's own dataset). Each
 * engagement may contribute, with the client's recorded consent, a small set of ratios and scores with nothing that names or
 * sizes the client: no name, no money, no answers, no dates finer than the year. Peer figures are shown only for a group of
 * at least `minContributors` contributions (k-anonymity), labelled with the number behind them.
 *
 * Off by default (benchmark-config.json): until counsel approves the consent text and the owner switches it on, no
 * contribution is built and no peer figure is returned, whatever is passed in.
 */
import config from './benchmark-config.json' with { type: 'json' };
import type { SpendBaseline } from './non-cloud-levers';

export const BENCHMARK = config as { enabled: boolean; consentVersion: string | null; minContributors: number };

export interface BenchmarkConsent { granted: boolean; version: string; recordedAt: string }
/** The group a contribution belongs to: coarse, so no client can be picked out by it. */
export interface BenchmarkCell { industry: string; revenueBand: string }
export type BenchmarkMetric = 'costScore' | 'valueScore' | 'usersPerEmployee' | 'applicationsPer1000Employees' | 'serversPer1000Employees' | `sharePercent.${string}`;
export interface BenchmarkContribution { schema: 'cost-iq-benchmark/1'; year: number; methodology: string; cell: BenchmarkCell; metrics: Partial<Record<BenchmarkMetric, number>> }

const BANDS = new Set(['LT100M', '100M_500M', '500M_1B', '1B_5B', '5B_25B', 'GT25B']);
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * The contribution for one completed assessment, or null: when the dataset is off, consent is missing or for another version
 * of the text, or the industry or revenue band is unknown (the cell would mean nothing).
 */
export function buildContribution(
  x: { answers: Record<string, unknown>; headlines: { costIQ: number | null; valueIQ: number | null }; baseline?: SpendBaseline | null; assessmentDate: string; methodology: string },
  consent: BenchmarkConsent | null | undefined,
  cfg = BENCHMARK
): BenchmarkContribution | null {
  if (!cfg.enabled || !cfg.consentVersion || !consent?.granted || consent.version !== cfg.consentVersion) return null;
  const industry = String(x.answers['CORE-02'] ?? ''), revenueBand = String(x.answers['CORE-03'] ?? '');
  if (!industry || industry === 'OTHER' || !BANDS.has(revenueBand)) return null;
  const m: BenchmarkContribution['metrics'] = {};
  if (x.headlines.costIQ != null) m.costScore = Math.round(x.headlines.costIQ);
  if (x.headlines.valueIQ != null) m.valueScore = Math.round(x.headlines.valueIQ);
  const u = x.baseline?.units;
  if (u?.employees) {
    if (u.users) m.usersPerEmployee = round(u.users / u.employees, 2);
    if (u.applications) m.applicationsPer1000Employees = round((u.applications * 1000) / u.employees);
    if (u.servers) m.serversPer1000Employees = round((u.servers * 1000) / u.employees);
  }
  for (const [k, v] of Object.entries(x.baseline?.splitPercent ?? {})) m[`sharePercent.${k}`] = round(v);
  return { schema: 'cost-iq-benchmark/1', year: Number(x.assessmentDate.slice(0, 4)), methodology: x.methodology, cell: { industry, revenueBand }, metrics: m };
}

export interface PeerFigure { metric: BenchmarkMetric; n: number; p25: number; median: number; p75: number }

/** The value at quantile q of sorted values, by linear interpolation. */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Peer figures for one cell: for each metric, the quartiles across the cell's contributions, only where at least
 * `minContributors` contributions carry it. A metric below the threshold is left out, not shown with a warning.
 */
export function peerFigures(contributions: BenchmarkContribution[], cell: BenchmarkCell, cfg = BENCHMARK): PeerFigure[] {
  if (!cfg.enabled) return [];
  const k = Math.max(10, cfg.minContributors);   // never below ten, whatever the configuration says
  const inCell = contributions.filter(c => c.cell.industry === cell.industry && c.cell.revenueBand === cell.revenueBand);
  const metrics = new Set(inCell.flatMap(c => Object.keys(c.metrics) as BenchmarkMetric[]));
  const out: PeerFigure[] = [];
  for (const metric of [...metrics].sort()) {
    const vals = inCell.map(c => c.metrics[metric]).filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
    if (vals.length < k) continue;
    out.push({ metric, n: vals.length, p25: round(quantile(vals, 0.25), 2), median: round(quantile(vals, 0.5), 2), p75: round(quantile(vals, 0.75), 2) });
  }
  return out;
}
