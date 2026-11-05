/**
 * Cost IQ non-cloud levers and the total (CQ4), then the report that carries them.
 *
 * Cost IQ report (CQ5): both editions across five profiles, with and without a linked FinOps IQ result. The report
 * checks pass (every traced number equals its engine field), the client edition carries no internal IDs, the cloud line
 * is the FinOps IQ summary unchanged, no total is stated beyond it, and the PDF renders.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateNonCloud, NON_CLOUD_LEVER_IDS, type NonCloudEvidence } from '../src/accelerators/cost-iq/non-cloud-levers';
import { FINOPS_IQ_LEVER_IDS } from '../src/accelerators/finops-iq/v3/cost-iq-summary';
import { costIqReport, costIqBacklog, resolveCostIqField, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { renderPdf } from '../src/report/pdf';
import { toCsv } from '../src/report/csv';
import { text, walkSegments, type ReportDocument } from '../src/report/model';
import { evaluateFinOpsIqV3, type AnswerLevel } from '../src/accelerators/finops-iq/v3/evaluate';
import { costIqSummary } from '../src/accelerators/finops-iq/v3/cost-iq-summary';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const TODAY = '2026-11-04';

const PROFILES: Record<string, string[]> = {
  'on-premises-heavy': ['ON_PREM', 'VMWARE', 'COLO', 'EXTERNAL', 'NETWORK'], 'cloud-heavy': ['PUBLIC_CLOUD', 'SAAS', 'AI', 'DATA'],
  'SaaS-heavy': ['SAAS', 'END_USER', 'SOFTWARE'], outsourced: ['EXTERNAL', 'SOFTWARE', 'NETWORK'], mixed: ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL', 'AI']
};
const AREAS: string[] = cfg.settings.selection.defaultAreas;

/** Answers every shown question, choosing options in a repeatable pattern so findings and mid scores both occur. */
function answersFor(footprint: string[], salt: number): Record<string, unknown> {
  const answers: Record<string, unknown> = { 'CORE-01': footprint, 'CORE-16': 'TRUE' };
  const shown: Set<string> = require('../src/accelerators/cost-iq/canon/costiq-engine-v10.cjs').shownQuestionIds(cfg, AREAS, answers);
  let seed = salt; const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const q of cfg.questions) {
    if (!shown.has(q.id) || q.id === 'CORE-01') continue;
    const opts = (q.options || []).map((o: any) => o.id);
    if (opts.length) answers[q.id] = q.interaction === 'multi-select' ? [opts[0]] : opts[Math.floor(next() * opts.length)];
    else if (q.interaction === 'stars') answers[q.id] = 3; else if (['slider', 'range'].includes(q.interaction)) answers[q.id] = Math.floor(next() * 100);
  }
  return answers;
}

const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const summaries = SCENARIOS.map(sc => costIqSummary(evaluateFinOpsIqV3({ mode: sc.mode, facts: sc.inputs.facts, answers: Object.fromEntries(Object.entries<string>(sc.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]])), assessmentDate: '2026-10-14' } as any)));
const SUMMARY = summaries.find(x => x.status === 'quantified') ?? null;

function input(footprint: string[], salt: number, finops: ReturnType<typeof costIqSummary> | null): CostIqReportInput {
  const answers = answersFor(footprint, salt);
  const scope = { selectedAreas: AREAS };
  return { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-03', currency: 'GBP', finops, finopsLinkedAt: finops ? '2026-11-03' : null };
}


const everything = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); for (const s of doc.sections) { out.push(s.title); for (const b of s.blocks) if (b.kind === 'subheading') out.push(b.text); } return out.join(' '); };

const EV = (over: Partial<NonCloudEvidence['levers']['LEV-11']> = {}, top: Partial<NonCloudEvidence> = {}): NonCloudEvidence => ({ currency: 'GBP', internalRatePerFteMonth: 10_000, levers: { 'LEV-11': { unusedAnnualCost: 1_000_000, ...over } }, ...top });
const RAISED = ['F-008'];
const GBP_SUMMARY = SUMMARY ? { ...SUMMARY, currency: 'GBP' } : null;

describe('non-cloud levers (CQ4)', () => {
  it('sizes the lever from the client\'s own base: a quarter, a half and all of it, phased and net of delivery cost', () => {
    const r = evaluateNonCloud(EV(), RAISED, null);
    expect(r.status).toBe('quantified');
    const c = r.lines[0].cases;
    // Tier 2 effort is 3 FTE-months at 10,000: 30,000 once and 6,000 a year; year one earns a quarter (no renewal data).
    expect([c.conservative.runRate.value, c.expected.runRate.value, c.upper.runRate.value]).toEqual([250_000, 500_000, 1_000_000]);
    expect([c.expected.year1.value, c.expected.year2.value, c.expected.year3.value]).toEqual([125_000, 500_000, 500_000]);
    expect(c.expected.oneOffCost.value).toBe(30_000);
    expect(c.expected.netRunRate.value).toBe(494_000);
    expect(c.expected.net3Year.value).toBe(125_000 + 500_000 + 500_000 - 30_000 - 18_000);
  });

  it('uses the client\'s renewal share for year one when given', () => {
    const c = evaluateNonCloud(EV({ renewingYear1Share: 0.6 }), RAISED, null).lines[0].cases;
    expect(c.expected.year1.value).toBe(300_000);
  });

  it('refuses to size what it cannot support, and says why', () => {
    const why = (r: ReturnType<typeof evaluateNonCloud>) => r.notSized[0]?.reason ?? '';
    expect(why(evaluateNonCloud(EV({ addressableSpend: 900_000 }), RAISED, null))).toMatch(/larger than the spend/);
    expect(why(evaluateNonCloud(EV({}, { internalRatePerFteMonth: undefined }), RAISED, null))).toMatch(/FTE-month/);
    expect(why(evaluateNonCloud(EV(), [], null))).toMatch(/not raised/);
    expect(why(evaluateNonCloud(EV({ unusedAnnualCost: 0 }), RAISED, null))).toMatch(/missing or zero/);
    expect(why(evaluateNonCloud(EV({ unusedAnnualCost: -5 }), RAISED, null))).toMatch(/missing or zero/);
    for (const bad of [evaluateNonCloud(EV({ addressableSpend: 900_000 }), RAISED, null), evaluateNonCloud(EV(), [], null)]) { expect(bad.status).toBe('not_quantified'); expect(bad.total).toBeNull(); }
  });

  it('adds the cloud line to the total as FinOps IQ gave it, case by case, or says it is excluded and why', () => {
    const own = evaluateNonCloud(EV(), RAISED, null);
    expect(own.total!.cloudIncluded).toBe(false);
    expect(own.total!.cloudNote).toMatch(/excludes cloud/);
    expect(own.total!.cases.expected.netRunRate.value).toBe(own.lines[0].cases.expected.netRunRate.value);
    const usd = evaluateNonCloud(EV(), RAISED, SUMMARY);
    expect(usd.total!.cloudIncluded).toBe(false);
    expect(usd.total!.cloudNote).toMatch(/no conversion is applied/);
    const both = evaluateNonCloud(EV(), RAISED, GBP_SUMMARY);
    expect(both.total!.cloudIncluded).toBe(true);
    for (const k of ['conservative', 'expected', 'upper'] as const) {
      expect(both.total!.cases[k].netRunRate.value).toBe(both.lines[0].cases[k].netRunRate.value + GBP_SUMMARY!.cases![k].netRunRate.value);
      expect(both.total!.cases[k].net3Year.value).toBe(both.lines[0].cases[k].net3Year.value + GBP_SUMMARY!.cases![k].net3Year.value);
    }
  });

  it('inflation guard: on 500 random inputs no lever exceeds its base, cases never fall, the total reconciles, and a lever is never a FinOps IQ lever', () => {
    let seed = 99; const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let n = 0; n < 500; n++) {
      const base = Math.round(next() * 5e7), spend = base + Math.round(next() * 5e7);
      const ev = EV({ unusedAnnualCost: base, addressableSpend: spend, renewingYear1Share: next() < 0.5 ? undefined : next() }, { internalRatePerFteMonth: Math.round(1 + next() * 3e4), effortTier: ([1, 2, 3] as const)[Math.floor(next() * 3)] });
      const r = evaluateNonCloud(ev, RAISED, next() < 0.5 ? GBP_SUMMARY : null);
      if (!r.lines.length) continue;
      for (const l of r.lines) {
        expect(l.cases.upper.runRate.value).toBeLessThanOrEqual(base);
        expect(l.cases.conservative.runRate.value).toBeLessThanOrEqual(l.cases.expected.runRate.value);
        expect(l.cases.expected.runRate.value).toBeLessThanOrEqual(l.cases.upper.runRate.value);
        expect(l.cases.expected.year1.value).toBeLessThanOrEqual(l.cases.expected.runRate.value);
      }
      for (const k of ['conservative', 'expected', 'upper'] as const) {
        const cloud = r.total!.cloudIncluded ? GBP_SUMMARY!.cases![k].net3Year.value : 0;
        expect(r.total!.cases[k].net3Year.value).toBe(r.lines.reduce((t, l) => t + l.cases[k].net3Year.value, 0) + cloud);
      }
    }
    for (const id of NON_CLOUD_LEVER_IDS) expect(FINOPS_IQ_LEVER_IDS).not.toContain(id);
  });
});

describe('Cost IQ report with a sized non-cloud lever (CQ4)', () => {
  const base = (() => {
    for (let salt = 1; salt < 200; salt++) { const i = input(PROFILES['mixed'], salt, GBP_SUMMARY); if (i.result.findings.some(f => f.id === 'F-008')) return i; }
    throw new Error('no profile raises F-008');
  })();
  const withLever = (finops: typeof GBP_SUMMARY | null) => { const i = { ...base, finops, finopsLinkedAt: finops ? '2026-11-03' : null, currency: 'GBP' }; return { ...i, nonCloud: evaluateNonCloud(EV(), i.result.findings.map(f => f.id), finops) }; };

  for (const finops of [GBP_SUMMARY, SUMMARY, null] as const) for (const view of ['client', 'consultant'] as const) {
    it(`passes the report checks, ${view}, ${finops ? finops.currency + ' cloud line' : 'no cloud line'}`, () => {
      const i = withLever(finops);
      const doc = costIqReport(i, { ...OPTS, view });
      const t = everything(doc);
      expect(doc.sections.map(s => s.id)).toContain('levers');
      expect(t).toContain('Non-SaaS software licence true-down');
      expect(t).toMatch(/Value range: total (excluding cloud|across the estate)/);
      expect(t).toContain('A-08');
      expect(checkCostIqReport(doc, i, view, TODAY).failures).toEqual([]);
    });
  }

  it('reconciliation test: a total that does not equal the levers plus the cloud line fails the report checks', () => {
    const i = withLever(GBP_SUMMARY);
    const tampered = JSON.parse(JSON.stringify(i));
    tampered.nonCloud.total.cases.expected.net3Year.value += 1000;
    const c = checkCostIqReport(costIqReport(i, { ...OPTS, view: 'client' }), tampered, 'client', TODAY);
    expect(JSON.stringify(c.failures)).toMatch(/total expected net3Year/);
  });

  it('states no non-cloud amount when no lever is sized', () => {
    const t = everything(costIqReport({ ...base, nonCloud: evaluateNonCloud(null, [], null) }, { ...OPTS, view: 'client' }));
    expect(t).not.toContain('Non-cloud levers and total');
    expect(t).not.toMatch(/Value range/);
  });
});

describe('report fixes from the CIO challenge (CQ10)', () => {
  const edition = (fp: string[], salt: number, finops: typeof GBP_SUMMARY, lever: boolean, view: 'client' | 'consultant' = 'client') => {
    const i = input(fp, salt, finops);
    if (lever) i.nonCloud = evaluateNonCloud(EV(), ['F-008'], finops);
    return { i, doc: costIqReport(i, { ...OPTS, view }) };
  };
  const cases = [
    ...Object.entries(PROFILES).flatMap(([n, fp], k) => [null, GBP_SUMMARY].flatMap(f => [false, true].map(l => ({ label: `${n} ${f ? 'linked' : 'unlinked'} ${l ? 'lever' : 'no lever'}`, ...edition(fp, k + 7, f, l) }))))
  ];

  it('H1: the summary never says no saving is stated when an amount is shown, and says what the amounts are', () => {
    for (const x of cases) {
      const t = everything(x.doc);
      const amounts = x.i.finops?.status === 'quantified' || x.i.nonCloud?.status === 'quantified';
      if (amounts) expect(t, x.label).not.toContain('no saving is stated');
      if (amounts && x.i.result.findings.length) expect(t, x.label).toMatch(/the only amounts? in this report (is|are) /);
    }
    expect(cases.some(x => x.i.nonCloud?.status === 'quantified')).toBe(true);
  });

  it('H2: when FinOps IQ held no spend figure, the cap is not described as a share "of that spend"; the lever and cloud confidence sit beside the range', () => {
    for (const x of cases) {
      const t = everything(x.doc);
      if (x.i.finops?.status === 'quantified' && !(x.i.finops.cloudSpend?.low && x.i.finops.cloudSpend.high)) { expect(t, x.label).not.toContain('of that spend'); expect(t, x.label).toContain('recorded no in-scope spend figure'); }
      if (x.i.nonCloud?.status === 'quantified') expect(t, x.label).toContain('Confidence in the licence lever is Low');
    }
  });

  it('H3: every "Evidence for" in the delivery plan names a finding the same edition raises', () => {
    for (const x of cases) {
      const t = everything(x.doc);
      const titles = new Set(x.i.result.findings.map(f => f.title));
      for (const m of t.matchAll(/Evidence for "([^"]+)"/g)) expect(titles.has(m[1]), `${x.label}: ${m[1]}`).toBe(true);
    }
  });

  it('H4: with a FinOps IQ result linked, the report does not ask the client to scope a FinOps IQ assessment', () => {
    const linked = cases.filter(x => x.i.finops?.status === 'quantified' && x.i.result.recommendations.some(r => r.id === 'R-003'));
    expect(linked.length).toBeGreaterThan(0);
    for (const x of linked) { const t = everything(x.doc); expect(t, x.label).not.toMatch(/Cloud Cost Management Scoping|Plan the FinOps IQ assessment/); expect(t, x.label).toContain('Review of the Linked FinOps IQ Result'); }
    const unlinked = cases.filter(x => !x.i.finops && x.i.result.recommendations.some(r => r.id === 'R-003'));
    for (const x of unlinked) expect(everything(x.doc), x.label).toContain('Cloud Cost Management Scoping');
  });

  it('M1 and L1: the cost to deliver says it is internal effort only, and one week is not "1 weeks"', () => {
    for (const x of cases) {
      const t = everything(x.doc);
      expect(t, x.label).not.toMatch(/\b1 weeks\b/);
      if (x.i.nonCloud?.status === 'quantified') expect(t, x.label).toContain('internal effort only');
    }
  });

  it('the edited reports still pass the report checks', () => {
    for (const x of cases) for (const view of ['client', 'consultant'] as const) {
      const d = costIqReport(x.i, { ...OPTS, view });
      expect(checkCostIqReport(d, x.i, view, TODAY).failures, `${x.label} ${view}`).toEqual([]);
    }
  });
});

describe('assumptions print in ID order (CQ10 challenge L3)', () => {
  it('A-01 before A-02 and so on, in every edition', () => {
    for (const fp of Object.values(PROFILES)) {
      const i = input(fp, 5, GBP_SUMMARY); i.nonCloud = evaluateNonCloud(EV(), ['F-008'], GBP_SUMMARY);
      const sec = costIqReport(i, { ...OPTS, view: 'consultant' }).sections.find(x => x.id === 'assumptions')!;
      const table: any = sec.blocks.find(b => b.kind === 'table');
      const ids = table.rows.map((r: any[]) => /A-\d{2}/.exec(r[0].map((x: any) => (typeof x === 'string' ? x : x.text)).join(''))![0]);
      expect(ids.length).toBeGreaterThan(5);
      expect(ids).toEqual([...ids].sort());
    }
  });
});

describe('"Where to look first" (CQ10 challenge M4)', () => {
  it('never lists a dimension scored from a single answer, and says how many were left out', () => {
    let sawSingle = false;
    for (const [n, fp] of Object.entries(PROFILES)) for (const salt of [3, 7, 11]) {
      const i = input(fp, salt, null);
      const doc = costIqReport(i, { ...OPTS, view: 'client' });
      const sec = doc.sections.find(x => x.id === 'summary')!;
      const idx = sec.blocks.findIndex(b => b.kind === 'subheading' && (b as any).text === 'Where to look first');
      const singles = i.result.dimensions.filter(d => d.score != null && d.answered < 2);
      if (singles.length) sawSingle = true;
      if (idx < 0) continue;
      const table: any = sec.blocks.slice(idx).find(b => b.kind === 'table');
      const listed = table.rows.map((r: any[]) => r[0].map((x: any) => (typeof x === 'string' ? x : x.text)).join('')).join('|');
      for (const d of singles) expect(listed, `${n} ${salt}`).not.toContain(d.name);
      if (singles.length) expect(JSON.stringify(sec.blocks[idx + 1])).toContain('on a single answer');
    }
    expect(sawSingle).toBe(true);
  });
});
