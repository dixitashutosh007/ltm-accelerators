/**
 * Each accelerator's report rules for the shared checks (REPORT-VALIDATION.md, RV1). Input-consistency rules (R6)
 * arrive with each accelerator's review pack (RV2).
 */
import type { ReportDocument } from '../report/model';
import type { FinOpsIqV3Result } from '../accelerators/finops-iq/v3/evaluate';
import { clientView as finopsClientView } from '../accelerators/finops-iq/v3/client-view';
import { resolveTraceField } from '../accelerators/finops-iq/v3/report';
import type { SovereignIqV4Result } from '../accelerators/sovereign-iq/v4';
import { runReportChecks, type CheckResult, type View } from './index';

const CASES = ['conservative', 'expected', 'upper'] as const;

/** FinOps IQ: sections from the report builder; every number traced; levers and findings reconcile to the headline. */
export function checkFinOpsIqReport(doc: ReportDocument, result: FinOpsIqV3Result, view: View, today: string): CheckResult {
  const shown = view === 'client' ? (finopsClientView(result) as unknown as FinOpsIqV3Result) : result;
  const money = !!result.value?.moneyShown;
  return runReportChecks(doc, view, {
    requiredSections: ['summary', 'profile', 'findings', 'roadmap', 'help', 'methodology', 'sources',
      ...(money ? ['value', 'calculation'] : []), ...(view === 'consultant' ? ['sow', 'consultant'] : [])],
    requiredNotices: ['not a savings commitment', 'FinOps Framework', 'creativecommons.org/licenses/by/4.0'],
    currency: result.value?.currency,
    resolve: field => resolveTraceField(shown, field),
    strictNumbers: true,
    numbersAllowedIn: ['consultant'],
    clientForbidden: [/FRAMEWORK\.md/, /DESIGN\.md/],
    // As the D8 report test: question, finding and design IDs stay out of the client edition's body.
    ids: { pattern: /\b(?:[A-Z]{2}-\d{2}|F-FIN-[A-Z0-9_-]+|LEV-\d{2})\b|\((?:Q|D)\d+\)|WS-S\d/, clientBannedIn: ['summary', 'profile', 'findings', 'value', 'roadmap', 'market', 'methodology'] },
    reconcile: () => {
      if (!money || !result.value.totals) return [];
      const out: string[] = [];
      const levers = result.value.levers.filter(l => l.cases);
      for (const c of CASES) {
        const t = result.value.totals[c];
        const sum = levers.reduce((a, l) => a + l.cases![c].runRate.value, 0);
        if (sum !== t.grossRunRate.value) out.push(`${c}: lever values ${sum} do not sum to the headline ${t.grossRunRate.value}`);
        const findings = result.findings.reduce((a, f) => a + (f.value ? f.value[c].value : 0), 0);
        if (findings !== t.grossRunRate.value) out.push(`${c}: finding values ${findings} do not sum to the headline ${t.grossRunRate.value}`);
        if (t.netYear1.value + t.netYear2.value + t.netYear3.value !== t.net3Year.value) out.push(`${c}: net years 1 to 3 do not sum to the 3-year figure`);
        if (t.grossYear1.value + t.grossYear2.value + t.grossYear3.value !== t.gross3Year.value) out.push(`${c}: gross years 1 to 3 do not sum to the 3-year figure`);
      }
      return out;
    }
  }, today);
}

/** The value a Sovereign IQ traced field names (as the report tests resolve it). */
function resolveSovereign(r: SovereignIqV4Result, field: string): number | undefined {
  const m = /^maturity\.byDomain\[(\w+)\]\.score$/.exec(field);
  if (m) return r.maturity.byDomain.find(d => d.domain === m[1])?.score;
  if (field === 'maturity.score') return r.maturity.score ?? undefined;
  if (field === 'maturity.controlsAssessed') return r.maturity.controlsAssessed;
  if (field === 'maturity.unconfirmed') return r.maturity.unconfirmed.length;
  const cap = /^(exposure\.largestCap|exposure\.regimes\[(\w+)\]\.cap)\.(amount|range\[(\d)\])$/.exec(field);
  if (cap) {
    const c = cap[2] ? r.exposure.regimes.find(e => e.regime === cap[2])?.cap : r.exposure.largestCap;
    return cap[3] === 'amount' ? c?.amount ?? undefined : c?.range?.[Number(cap[4])] ?? undefined;
  }
  const obj = /^seal\.objectives\[(SOV-\d)\]\.inPlace$/.exec(field);
  if (obj) return r.seal.objectives.find(o => o.id === obj[1])?.inPlace;
  const place = /^advisory\.placement\[(\w+)\]$/.exec(field);
  if (place) return r.advisory.placement.filter(p => p.status === place[1]).length;
  return undefined;
}

/** Sovereign IQ: sections from the report builder; traced numbers match the engine; the legal notices are present. */
export function checkSovereignIqReport(doc: ReportDocument, result: SovereignIqV4Result, view: View, today: string): CheckResult {
  return runReportChecks(doc, view, {
    requiredSections: ['summary', 'requirement', 'seal', 'maturity', 'exposure', 'findings', 'roadmap', 'help', 'methodology', 'sources',
      ...(view === 'consultant' ? ['sow', 'consultant'] : [])],
    requiredNotices: ['not legal advice', 'qualified lawyer', 'Statutory maximums'],
    resolve: field => resolveSovereign(result, field)
  }, today);
}
