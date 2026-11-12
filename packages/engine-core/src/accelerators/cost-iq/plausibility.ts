/**
 * Cost IQ plausibility checks (PRODUCT-GRADE-PLAN.md, A4): answers that are unlikely on their own or that contradict each
 * other. They change no score, finding or range. The consultant sees them on screen after scoring, and the report lists them
 * as answers to confirm, so a doubtful answer is checked before evidence is gathered against it.
 *
 * Every threshold is an LTM heuristic, stated in the check's own words; none is a published benchmark.
 */
import references from './published-references.json' with { type: 'json' };
import type { UnitCounts } from './non-cloud-levers';

export const PLAUSIBILITY_SCHEMA = 'cost-iq-plausibility/1';

export interface PlausibilityCheck {
  /** Stable rule id, for the consultant edition and tests. */
  id: string;
  /** What looks unlikely, in words. */
  title: string;
  /** What to confirm, and why it matters. */
  confirm: string;
  /** The answers involved, in the order they are shown. */
  questionIds: string[];
}

/**
 * Technology spend in scope as a share of revenue, in percent, from the two size bands: the smallest spend over the largest
 * revenue, and the largest spend over the smallest revenue. An open band gives no bound on that side; null when either
 * band is missing or unknown.
 */
export function spendShareOfRevenue(answers: Record<string, unknown>): { low: number | null; high: number | null } | null {
  const r = (references as any).bandsUsd.revenue[String(answers['CORE-03'])], sp = (references as any).bandsUsd.spend[String(answers['CORE-04'])];
  if (!r || !sp) return null;
  const low = r[1] == null || sp[0] === 0 ? null : Math.floor((sp[0] / r[1]) * 1000) / 10;
  const high = r[0] === 0 || sp[1] == null ? null : Math.ceil((sp[1] / r[0]) * 1000) / 10;
  return low == null && high == null ? null : { low, high };
}

/** Sliders where a value above 80% describes most of the estate as waste: possible, but worth confirming. */
const WASTE_SLIDERS: Record<string, string> = {
  'ADP-37': 'data-centre capacity structurally underused',
  'CORE-34': 'operations effort still manual',
  'ADP-22': 'applications with unclear ownership, value or use',
  'ADP-29': 'transformation spend committed without a measurable outcome',
  'ADP-46': 'run cost attributable to legacy platforms or technical debt',
  'ADP-50': 'technology capability duplicated after mergers or acquisitions'
};
const EXTREME = 80;
const num = (a: Record<string, unknown>, id: string) => (typeof a[id] === 'number' && Number.isFinite(a[id]) ? (a[id] as number) : null);

export function plausibilityChecks(answers: Record<string, unknown>, units?: UnitCounts | null): PlausibilityCheck[] {
  const out: PlausibilityCheck[] = [];
  const s = spendShareOfRevenue(answers);
  if (s?.low != null && s.low > 25) out.push({ id: 'P-01', title: 'Technology spend is more than a quarter of revenue', confirm: 'Confirm both size bands and the scope of the spend figure. Spend above 25% of revenue is rare outside technology companies, and every indicative range scales with the spend band.', questionIds: ['CORE-03', 'CORE-04'] });
  if (s?.high != null && s.high < 0.5) out.push({ id: 'P-02', title: 'Technology spend is less than half a percent of revenue', confirm: 'Confirm both size bands and whether the spend figure covers the whole estate or one part of it. Spend below 0.5% of revenue is rare, and every indicative range scales with the spend band.', questionIds: ['CORE-03', 'CORE-04'] });
  for (const [id, what] of Object.entries(WASTE_SLIDERS)) {
    const v = num(answers, id);
    if (v != null && v > EXTREME) out.push({ id: `P-03:${id}`, title: `More than ${EXTREME}% of ${what}`, confirm: 'Confirm the figure and how it was estimated. A value this high is possible but unusual, and findings built on it inherit any error.', questionIds: [id] });
  }
  const conf = num(answers, 'CORE-06');
  if (conf != null && conf >= 4 && ['D', 'E'].includes(String(answers['CORE-12']))) out.push({ id: 'P-04', title: 'High confidence in a spend baseline that is described as weak', confirm: 'The respondent is confident the baseline supports executive decisions, but says there is no reliable enterprise picture of spend. Confirm which is right before sizing anything against the baseline.', questionIds: ['CORE-06', 'CORE-12'] });
  const traced = num(answers, 'CORE-17');
  if (traced != null && traced >= EXTREME && ['VENDORS', 'PROJECTS', 'GL'].includes(String(answers['CORE-13']))) out.push({ id: 'P-05', title: 'Most spend traced to owners, but cost is understood only by vendor, project or ledger', confirm: 'Spend traced to clear owners and services would normally be understood by service. Confirm how the traced share was estimated.', questionIds: ['CORE-17', 'CORE-13'] });
  if (traced != null && traced < 50 && String(answers['CORE-12']) === 'A') out.push({ id: 'P-06', title: 'Full reconciliation of spend, but less than half of it traced to owners', confirm: 'Spend reconciled to owners and services would normally be mostly traceable to them. Confirm which answer describes the estate.', questionIds: ['CORE-12', 'CORE-17'] });
  const critical = num(answers, 'ADP-21'), unclear = num(answers, 'ADP-22');
  if (critical != null && unclear != null && critical + unclear > 100) out.push({ id: 'P-07', title: 'Business-critical applications and applications of unclear value overlap', confirm: 'Together the two shares exceed the whole portfolio, so some applications are counted as both business-critical and of unclear ownership or value. Confirm both shares.', questionIds: ['ADP-21', 'ADP-22'] });
  // C2: the counts the consultant records. Technology users are normally close to the workforce; an estate with more
  // applications than employees is rare. LTM heuristics, like the rest.
  if (units?.employees && units.users && (units.users < units.employees * 0.5 || units.users > units.employees * 3)) out.push({ id: 'P-08', title: 'Technology users and employees differ widely', confirm: 'Technology users are normally close to the number of employees, contractors included. Confirm both counts and whether users includes customers or partners.', questionIds: [] });
  if (units?.employees && units.applications && units.applications > units.employees) out.push({ id: 'P-09', title: 'More applications than employees', confirm: 'Confirm what was counted as an application: an inventory that counts components, instances or versions overstates the portfolio and lowers the cost per application.', questionIds: [] });
  return out;
}
