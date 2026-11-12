/**
 * Cost IQ plausibility checks (PRODUCT-GRADE-PLAN.md, A4): one test per rule, both sides of each threshold, and the report's
 * "Answers to confirm" in both editions with the report checks passing.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { plausibilityChecks } from '../src/accelerators/cost-iq/plausibility';
import { costIqReport, indicativeFor, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const ids = (a: Record<string, unknown>) => plausibilityChecks(a).map(k => k.id);
const text = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); return out.join('').replace(/\s+/g, ' '); };

describe('plausibility rules', () => {
  it('P-01 and P-02: spend against revenue, only when the bands rule it out', () => {
    expect(ids({ 'CORE-03': 'LT100M', 'CORE-04': '50M_100M' })).toEqual(['P-01']);   // at least 50%
    expect(ids({ 'CORE-03': '100M_500M', 'CORE-04': '50M_100M' })).toEqual([]);      // 10% to 100%: could be either
    expect(ids({ 'CORE-03': 'GT25B', 'CORE-04': 'LT5M' })).toEqual(['P-02']);        // at most 0.1%
    expect(ids({ 'CORE-03': '1B_5B', 'CORE-04': '25M_50M' })).toEqual([]);           // 0.5% to 5%
    expect(ids({ 'CORE-03': 'UNKNOWN', 'CORE-04': 'LT5M' })).toEqual([]);
  });

  it('P-03: a waste slider above 80%, not at it', () => {
    for (const q of ['ADP-37', 'CORE-34', 'ADP-22', 'ADP-29', 'ADP-46', 'ADP-50']) {
      expect(ids({ [q]: 81 }), q).toEqual([`P-03:${q}`]);
      expect(ids({ [q]: 80 }), q).toEqual([]);
    }
    expect(ids({ 'ADP-21': 95 })).toEqual([]);   // business-critical share is not waste
  });

  it('P-04: high confidence in a baseline described as weak', () => {
    expect(ids({ 'CORE-06': 5, 'CORE-12': 'E' })).toEqual(['P-04']);
    expect(ids({ 'CORE-06': 4, 'CORE-12': 'D' })).toEqual(['P-04']);
    expect(ids({ 'CORE-06': 3, 'CORE-12': 'E' })).toEqual([]);
    expect(ids({ 'CORE-06': 5, 'CORE-12': 'C' })).toEqual([]);
  });

  it('P-05 and P-06: traced share against how cost is understood', () => {
    expect(ids({ 'CORE-17': 85, 'CORE-13': 'GL' })).toEqual(['P-05']);
    expect(ids({ 'CORE-17': 85, 'CORE-13': 'SERVICES' })).toEqual([]);
    expect(ids({ 'CORE-17': 30, 'CORE-12': 'A' })).toEqual(['P-06']);
    expect(ids({ 'CORE-17': 60, 'CORE-12': 'A' })).toEqual([]);
  });

  it('P-07: business-critical and unclear applications exceed the whole portfolio', () => {
    expect(ids({ 'ADP-21': 70, 'ADP-22': 40 })).toEqual(['P-07']);
    expect(ids({ 'ADP-21': 60, 'ADP-22': 40 })).toEqual([]);
  });

  it('every rule names real questions, and nothing fires on an empty assessment', () => {
    const known = new Set(cfg.questions.map((q: any) => q.id));
    const all = plausibilityChecks({ 'CORE-03': 'LT100M', 'CORE-04': 'GT1B', 'ADP-37': 99, 'CORE-34': 99, 'ADP-22': 99, 'ADP-29': 99, 'ADP-46': 99, 'ADP-50': 99, 'CORE-06': 5, 'CORE-12': 'E', 'ADP-21': 90 });
    expect(all.length).toBeGreaterThan(8);
    for (const k of all) for (const q of k.questionIds) expect(known.has(q), `${k.id} ${q}`).toBe(true);
    expect(plausibilityChecks({})).toEqual([]);
  });
});

describe('the report lists the answers to confirm', () => {
  const AREAS: string[] = cfg.settings.selection.defaultAreas;
  const answers: Record<string, unknown> = { 'CORE-01': ['ON_PREM', 'SOFTWARE'], 'CTX-01': 'GBP', 'CORE-03': 'GT25B', 'CORE-04': 'LT5M', 'CORE-34': 92, 'CORE-06': 5, 'CORE-12': 'E' };
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };

  it('in both editions, with rule ids only for the consultant, and the checks pass', () => {
    for (const view of ['client', 'consultant'] as const) {
      const doc = costIqReport(i, { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client', view });
      expect(checkCostIqReport(doc, i, view, '2026-11-12').failures, view).toEqual([]);
      const profile = doc.sections.find(s => s.id === 'profile')!;
      const t = text({ meta: doc.meta, sections: [profile] });
      expect(JSON.stringify(profile)).toContain('"Answers to confirm"');
      expect(t).toContain('Technology spend is less than half a percent of revenue');
      expect(t).toContain('High confidence in a spend baseline that is described as weak');
      expect(t).toContain('More than 80% of operations effort still manual');
      expect(/P-0\d/.test(t), view).toBe(view === 'consultant');
      // The spend band carries every range, so a doubtful band is flagged on the summary too.
      if (doc.sections[0].id === 'summary' && indicativeFor(i).total) expect(text({ meta: doc.meta, sections: [doc.sections[0]] })).toContain('listed to confirm under "Scope and context"');
    }
  });

  it('says nothing when every answer is plausible', () => {
    const calm = { ...answers, 'CORE-03': '100M_500M', 'CORE-04': '5M_25M', 'CORE-34': 30, 'CORE-06': 2 };
    const j = { ...i, answers: calm, result: adapter.evaluateCostIq({ answers: calm, scope }) as CostIqResult };
    expect(JSON.stringify(costIqReport(j, { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client', view: 'client' }))).not.toContain('Answers to confirm');
  });
});
