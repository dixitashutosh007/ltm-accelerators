/**
 * Cost IQ reduction scenarios (PRODUCT-GRADE-PLAN.md, B5): the rule (largest levers first, protected categories set aside,
 * stop when the upper ends reach the target), the three outcomes, and the consultant-only section with traced figures.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { evaluateIndicative } from '../src/accelerators/cost-iq/indicative';
import { evaluateScenario, protectedFromAnswers, SCENARIO_TARGETS } from '../src/accelerators/cost-iq/scenario';
import library from '../src/accelerators/cost-iq/indicative-ranges.json' with { type: 'json' };
import { costIqReport, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const ALL = Object.keys(library.categoryShares).filter(k => k !== 'note');
const ind = evaluateIndicative({ 'CORE-04': '50M_100M', 'CORE-05': ALL }, ['F-008', 'F-009', 'F-010', 'F-011', 'F-013'], 'USD');

describe('the scenario rule', () => {
  it('takes the counted levers largest first and stops once their upper ends reach the target', () => {
    const order = ind.lines.filter(l => l.counted).sort((a, b) => b.shareHigh - a.shareHigh);
    const s = evaluateScenario(ind, order[0].shareHigh * 0.9, []);
    expect(s.needed.map(l => l.findingId)).toEqual([order[0].findingId]);
    const two = evaluateScenario(ind, order[0].shareHigh + order[1].shareHigh * 0.5, []);
    expect(two.needed.map(l => l.findingId)).toEqual([order[0].findingId, order[1].findingId]);
    expect(two.high).toBeCloseTo(order[0].shareHigh + order[1].shareHigh, 12);
  });

  it('has three outcomes: reached at the low ends, only towards the high ends, or not reached', () => {
    const total = ind.lines.filter(l => l.counted);
    const lowSum = total.reduce((t, l) => t + l.shareLow, 0), highSum = total.reduce((t, l) => t + l.shareHigh, 0);
    expect(evaluateScenario(ind, 0.001, []).outcome).toBe('low');
    expect(evaluateScenario(ind, (lowSum + highSum) / 2, []).outcome).toBe('high');
    const short = evaluateScenario(ind, highSum * 2, []);
    expect(short.outcome).toBe('short');
    expect(short.needed.length).toBe(total.length);
  });

  it('sets aside the categories a protected capability covers, and reads the protections from ADP-57', () => {
    const s = evaluateScenario(ind, 0.5, ['CORE_PLATFORM']);
    expect(s.protectedCategories).toEqual(['INFRA']);
    expect(s.excluded.map(l => l.category)).toEqual(['INFRA']);
    expect(s.needed.some(l => l.category === 'INFRA')).toBe(false);
    expect(protectedFromAnswers({ 'ADP-57': ['CORE_PLATFORM', 'NOPE', 'OTHER'] })).toEqual(['CORE_PLATFORM', 'OTHER']);
    expect(protectedFromAnswers({})).toEqual([]);
  });

  it('every protection maps to real ADP-57 options and real categories', () => {
    const opts = cfg.questions.find((q: any) => q.id === 'ADP-57').options.map((o: any) => o.id);
    const { note: _n, ...protects } = library.protects as Record<string, unknown>;
    expect(Object.keys(protects).sort()).toEqual([...opts].sort());
    for (const cats of Object.values(protects) as string[][]) for (const c of cats) expect(ALL).toContain(c);
  });
});

describe('the consultant-only scenario section', () => {
  const AREAS: string[] = cfg.settings.selection.areas ? Object.keys(cfg.settings.selection.areas) : [];
  const answers: Record<string, unknown> = { 'CORE-01': ['ON_PREM', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'SOFTWARE', 'APPS', 'PEOPLE', 'EXTERNAL'], 'CORE-34': 90, 'ADP-37': 70, 'ADP-22': 60, 'ADP-57': ['CORE_PLATFORM'] };
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const opts = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
  const consultant = costIqReport(i, { ...opts, view: 'consultant' }), client = costIqReport(i, { ...opts, view: 'client' });

  it('is in the consultant edition only, with a row per standard target, and both editions pass the checks', () => {
    expect(client.sections.some(s => s.id === 'scenario')).toBe(false);
    const sec = consultant.sections.find(s => s.id === 'scenario')!;
    expect(sec).toBeTruthy();
    expect((sec.blocks.find(b => b.kind === 'table') as any).rows.length).toBe(SCENARIO_TARGETS.length);
    expect(JSON.stringify(sec)).toContain('not a commitment');
    expect(JSON.stringify(sec)).toContain('Protected by the client: Core platforms');
    expect(checkCostIqReport(consultant, i, 'consultant', '2026-11-12').failures).toEqual([]);
    expect(checkCostIqReport(client, i, 'client', '2026-11-12').failures).toEqual([]);
  });

  it('a scenario figure that does not match fails the trace check', () => {
    const bad = JSON.parse(JSON.stringify(consultant)) as ReportDocument;
    let done = false;
    walkSegments(bad, s => { if (!done && typeof s !== 'string' && s.trace?.field === 'scenario[10].high') { s.trace.value += 0.01; done = true; } });
    expect(done).toBe(true);
    expect(checkCostIqReport(bad, i, 'consultant', '2026-11-12').failures.some(f => f.check === 'R2' && /scenario\[10\]/.test(f.detail))).toBe(true);
  });
});
