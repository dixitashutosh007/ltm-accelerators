/**
 * Cost IQ business case per lever (PRODUCT-GRADE-PLAN.md, E1): one-off cost from the delivery effort at the client's rate,
 * the run-rate saving, payback and the three-year net, phased as the measured lever; effort only without the client's rate.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { evaluateIndicative } from '../src/accelerators/cost-iq/indicative';
import { evaluateBusinessCase, YEAR_ONE_SHARE, RUNNING_SHARE, WEEKS_PER_MONTH } from '../src/accelerators/cost-iq/business-case';
import { costIqReport, businessCaseFor, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');

const ind = evaluateIndicative({ 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'EXTERNAL', 'APPS'] }, ['F-009', 'F-011', 'F-020'], 'GBP');
const steps: Record<string, any> = {
  'F-009': { recommendationId: 'R-005', offeringType: 'advisory', effortFteWeeks: [8, 15] },
  'F-011': { recommendationId: 'R-007', offeringType: 'advisory', effortFteWeeks: [9, 16] },
  'F-020': { recommendationId: 'R-007', offeringType: 'advisory', effortFteWeeks: [9, 16] }
};

describe('the business case rule', () => {
  const b = evaluateBusinessCase(ind, f => steps[f] ?? null, 9000);

  it('costs each step once at the client rate, and a step shared by two levers once only', () => {
    const weekly = 9000 / WEEKS_PER_MONTH;
    const infra = b.lines.find(l => l.findingId === 'F-009')!;
    expect(infra.oneOffLow).toBe(Math.round(8 * weekly));
    expect(infra.oneOffHigh).toBe(Math.round(15 * weekly));
    const r7 = b.lines.filter(l => l.recommendationId === 'R-007');
    expect(r7.length).toBe(2);
    expect(r7.filter(l => l.sharedWith).length).toBe(1);
    expect(r7.find(l => l.sharedWith)!.oneOffHigh).toBe(0);
  });

  it('nets three years phased as the measured lever: a quarter in year one, then all; a fifth of the one-off cost each year', () => {
    const l = b.lines.find(x => x.findingId === 'F-009')!;
    expect(l.net3High).toBe(Math.round(l.runHigh! * (YEAR_ONE_SHARE + 2) - l.oneOffLow! * (1 + 3 * RUNNING_SHARE)));
    expect(l.net3Low).toBe(Math.round(l.runLow! * (YEAR_ONE_SHARE + 2) - l.oneOffHigh! * (1 + 3 * RUNNING_SHARE)));
    expect(b.total.runLow).toBe(ind.total!.low);
    expect(b.total.net3High).toBe(b.lines.reduce((t, x) => t + x.net3High!, 0));
  });

  it('pays back in the first month whose earnings cover the cost, best case first', () => {
    for (const l of b.lines.filter(x => x.paybackBest != null)) {
      expect(l.paybackBest!).toBeGreaterThanOrEqual(1);
      if (l.paybackWorst != null) expect(l.paybackWorst).toBeGreaterThanOrEqual(l.paybackBest!);
      const m = l.paybackBest!, run = l.runHigh!, cost = l.oneOffLow!;
      const earned = (k: number) => Array.from({ length: k }, (_, i) => (run / 12) * (i < 12 ? YEAR_ONE_SHARE : 1)).reduce((t, v) => t + v, 0);
      const costTo = (k: number) => cost + RUNNING_SHARE * cost * Math.ceil(k / 12);
      expect(earned(m)).toBeGreaterThanOrEqual(costTo(m));
      if (m > 1) expect(earned(m - 1)).toBeLessThan(costTo(m - 1));
    }
  });

  it('shows effort only, and no money for cost, payback or net, without the client rate', () => {
    const none = evaluateBusinessCase(ind, f => steps[f] ?? null, null);
    expect(none.rated).toBe(false);
    for (const l of none.lines) expect([l.oneOffLow, l.paybackBest, l.net3Low]).toEqual([null, null, null]);
    expect(none.lines.find(l => l.findingId === 'F-009')!.effortFteWeeks).toEqual([8, 15]);
  });
});

describe('the business case in the report', () => {
  const AREAS: string[] = Object.keys(cfg.settings.selection.areas);
  const answers: Record<string, unknown> = { 'CORE-01': ['ON_PREM', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'APPS', 'PEOPLE', 'EXTERNAL'], 'CORE-34': 90, 'ADP-37': 70, 'ADP-22': 60 };
  const scope = { selectedAreas: AREAS };
  const base: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const rated: CostIqReportInput = { ...base, rate: { perFteMonth: 9000, currency: 'GBP' } };
  const opts = { client: 'Example Client', preparedBy: 'LTM', dataProvidedBy: 'Example Client' };

  it('with the client rate: cost, payback and net, traced, with A-15, passing the checks in both editions', () => {
    expect(businessCaseFor(rated).rated).toBe(true);
    for (const view of ['client', 'consultant'] as const) {
      const doc = costIqReport(rated, { ...opts, view });
      expect(checkCostIqReport(doc, rated, view, '2026-11-12').failures, view).toEqual([]);
      const value = JSON.stringify(doc.sections.find(s => s.id === 'value'));
      expect(value).toContain('"Business case by lever"');
      expect(value).toContain('case.total.net3');
      expect(JSON.stringify(doc.sections.find(s => s.id === 'assumptions'))).toContain('A-15');
    }
  });

  it('without the rate, or with a rate in another currency: effort only, and how to cost it', () => {
    for (const i of [base, { ...base, rate: { perFteMonth: 9000, currency: 'EUR' } }]) {
      const doc = costIqReport(i, { ...opts, view: 'client' });
      expect(checkCostIqReport(doc, i, 'client', '2026-11-12').failures).toEqual([]);
      const value = JSON.stringify(doc.sections.find(s => s.id === 'value'));
      expect(value).toContain('LTM does not assume a salary');
      expect(value).not.toContain('case.lines');
    }
  });

  it('a tampered business-case figure fails the trace check', () => {
    const doc = costIqReport(rated, { ...opts, view: 'client' });
    const bad = JSON.parse(JSON.stringify(doc)) as ReportDocument;
    let done = false;
    walkSegments(bad, s => { if (!done && typeof s !== 'string' && s.trace?.field.startsWith('case.total.')) { s.trace.value += 1000; done = true; } });
    expect(done).toBe(true);
    expect(checkCostIqReport(bad, rated, 'client', '2026-11-12').failures.some(f => f.check === 'R2')).toBe(true);
  });
});
