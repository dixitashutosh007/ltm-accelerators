/**
 * Cost IQ client baseline and the TBM Taxonomy (PRODUCT-GRADE-PLAN.md, C1): the consultant records the client's exact spend
 * and its split by category; they replace the band and the typical shares, the report says so, and the categories map to the
 * published TBM towers and cost pools.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { parseNonCloudEvidence, BASELINE_CATEGORIES } from '../src/accelerators/cost-iq/non-cloud-levers';
import { evaluateIndicative } from '../src/accelerators/cost-iq/indicative';
import library from '../src/accelerators/cost-iq/indicative-ranges.json' with { type: 'json' };
import tbm from '../src/accelerators/cost-iq/tbm-mapping.json' with { type: 'json' };
import { costIqReport, indicativeFor, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const text = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); return out.join('').replace(/\s+/g, ' '); };

describe('recording the baseline', () => {
  const ev = (baseline: unknown) => parseNonCloudEvidence({ currency: 'GBP', levers: {}, baseline });

  it('accepts an exact spend, a split adding up to 100%, or both', () => {
    expect(ev({ exactAnnualSpend: 42e6 })).toMatchObject({ ok: true, value: { baseline: { exactAnnualSpend: 42e6 } } });
    expect(ev({ splitPercent: { INFRA: 40, APPS: 35, PEOPLE: 25 } })).toMatchObject({ ok: true, value: { baseline: { splitPercent: { INFRA: 40, APPS: 35, PEOPLE: 25 } } } });
    expect(ev({ splitPercent: { INFRA: 50, APPS: 50.6 } }).ok).toBe(true);      // within a point of 100
    expect(ev(null)).toMatchObject({ ok: true });
    expect((ev(null) as any).value.baseline).toBeUndefined();
  });

  it('refuses a split that does not add up, an unknown category, or a spend that is not positive', () => {
    expect(ev({ splitPercent: { INFRA: 40, APPS: 40 } })).toMatchObject({ ok: false, error: expect.stringContaining('80%, not 100%') });
    expect(ev({ splitPercent: { MAINFRAME: 100 } })).toMatchObject({ ok: false, error: expect.stringContaining('unknown category') });
    expect(ev({ exactAnnualSpend: 0 }).ok).toBe(false);
    expect(ev({ splitPercent: { INFRA: -5, APPS: 105 } }).ok).toBe(false);
  });
});

describe('the baseline narrows the ranges', () => {
  const answers = { 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'APPS', 'PEOPLE'] };

  it('an exact spend is a one-point band: low and high rest on the same spend', () => {
    const r = evaluateIndicative(answers, ['F-009'], 'GBP', [], { exactAnnualSpend: 30e6, currency: 'GBP' });
    expect(r.basis).toEqual({ spend: 'exact', shares: 'typical' });
    expect(r.spend).toEqual({ low: 30e6, high: 30e6 });
    const l = r.lines[0];
    expect(l.low).toBe(Math.round(30e6 * l.shareLow));
    expect(l.high).toBe(Math.round(30e6 * l.shareHigh));
  });

  it('a split replaces the typical shares and the categories the client named', () => {
    const r = evaluateIndicative(answers, ['F-009', 'F-008'], 'GBP', [], { splitPercent: { INFRA: 50, SOFTWARE: 20, PEOPLE: 30 }, currency: 'GBP' });
    expect(r.basis.shares).toBe('split');
    expect(r.categoriesAssumed).toBe(false);
    const infra = r.lines.find(l => l.findingId === 'F-009')!;
    expect(infra.baseShare).toBeCloseTo(0.5, 12);
    // SOFTWARE was not in CORE-05, but the client's split includes it, so the licence finding is sized.
    expect(r.lines.some(l => l.findingId === 'F-008')).toBe(true);
  });
});

describe('the report with a baseline', () => {
  const AREAS: string[] = Object.keys(cfg.settings.selection.areas);
  const answers: Record<string, unknown> = { 'CORE-01': ['ON_PREM', 'SOFTWARE'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'APPS', 'PEOPLE'], 'CORE-34': 90, 'ADP-37': 70 };
  const scope = { selectedAreas: AREAS };
  const base: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const i: CostIqReportInput = { ...base, baseline: { exactAnnualSpend: 31.5e6, splitPercent: { INFRA: 45, APPS: 30, PEOPLE: 25 }, currency: 'GBP' } };

  it('says what it rests on, lists the client split as the assumption, and passes the checks in both editions', () => {
    expect(indicativeFor(i).basis).toEqual({ spend: 'exact', shares: 'split' });
    for (const view of ['client', 'consultant'] as const) {
      const doc = costIqReport(i, { client: 'Example Client', preparedBy: 'LTM', dataProvidedBy: 'Example Client', view });
      expect(checkCostIqReport(doc, i, view, '2026-11-12').failures, view).toEqual([]);
      const t = text(doc);
      expect(t).toContain("the client's own figure for the technology spend in scope");
      expect(t).toContain("Shares are the client's own split of spend by category");
      expect(t).toContain("The client's own split of the technology spend in scope by category, recorded by the consultant");
      expect(t).not.toContain('Spend band used');
    }
  });

  it('narrows the total compared with the band', () => {
    const band = indicativeFor(base).total!, exact = indicativeFor(i).total!;
    expect(exact.high! - exact.low!).toBeLessThan(band.high! - band.low!);
  });
});

describe('the TBM Taxonomy mapping', () => {
  // TBM Taxonomy 5.0.1 (released 18 July 2025), checked at tbmcouncil.org/taxonomy on 12 Nov 2026.
  const TOWERS = ['Data Center', 'Compute', 'Storage', 'Network', 'Application', 'Data', 'Delivery', 'Tech Management', 'Security', 'Risk & Compliance', 'Smart Devices', 'End User'];
  const POOLS = ['Staffing', 'Outside Services', 'Cloud Services', 'Hardware', 'Software & SaaS', 'Data Center Facilities', 'Telecom', 'Misc Costs', 'Cross Charges'];

  it('maps every spend category, only to towers and cost pools the taxonomy publishes', () => {
    const cats = Object.keys(library.categoryShares).filter(k => k !== 'note');
    expect(Object.keys(tbm.categories).sort()).toEqual([...cats].sort());
    expect([...BASELINE_CATEGORIES].sort()).toEqual([...cats].sort());
    for (const [k, v] of Object.entries(tbm.categories)) {
      expect(v.towers.length + v.costPools.length, k).toBeGreaterThan(0);
      for (const t of v.towers) expect(TOWERS, `${k} ${t}`).toContain(t);
      for (const p of v.costPools) expect(POOLS, `${k} ${p}`).toContain(p);
    }
  });

  it('the methodology carries the mapping and the source names the version', () => {
    const doc = costIqReport({ result: adapter.evaluateCostIq({ answers: {}, scope: { selectedAreas: [] } }) as CostIqResult, answers: {}, selectedAreas: [], scope: { shown: 0, answered: 0 }, assessmentDate: '2026-11-12', finops: null }, { client: 'X', preparedBy: 'LTM', dataProvidedBy: 'X', view: 'client' });
    const json = JSON.stringify(doc);
    expect(json).toContain('Spend categories and the TBM Taxonomy');
    expect(json).toContain('TBM Taxonomy 5.0.1 (https://www.tbmcouncil.org/taxonomy/)');
  });
});
