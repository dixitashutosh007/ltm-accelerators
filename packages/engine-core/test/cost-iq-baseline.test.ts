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
import { plausibilityChecks } from '../src/accelerators/cost-iq/plausibility';
import { unitCosts } from '../src/accelerators/cost-iq/units';
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

describe('unit measures (C2)', () => {
  const answers: Record<string, unknown> = { 'CORE-01': ['ON_PREM', 'SOFTWARE'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M', 'CORE-05': ['INFRA', 'APPS', 'PEOPLE'], 'CORE-34': 90, 'ADP-37': 70 };
  const AREAS: string[] = Object.keys(cfg.settings.selection.areas);
  const scope = { selectedAreas: AREAS };
  const result = adapter.evaluateCostIq({ answers, scope }) as CostIqResult;
  const mk = (baseline: CostIqReportInput['baseline']): CostIqReportInput => ({ result, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null, baseline });

  it('validates the counts', () => {
    expect(parseNonCloudEvidence({ currency: 'GBP', levers: {}, baseline: { units: { employees: 4200, servers: 900 } } })).toMatchObject({ ok: true, value: { baseline: { units: { employees: 4200, servers: 900 } } } });
    expect(parseNonCloudEvidence({ currency: 'GBP', levers: {}, baseline: { units: { employees: 4200.5 } } }).ok).toBe(false);
    expect(parseNonCloudEvidence({ currency: 'GBP', levers: {}, baseline: { units: { desks: 10 } } }).ok).toBe(false);
  });

  it('divides the band, or the exact spend, by the counts; per server and per application need the client split', () => {
    const band = mk({ currency: 'GBP', units: { employees: 5000, servers: 800 } });
    const c1 = unitCosts(indicativeFor(band), band.baseline);
    expect(c1.map(c => c.key)).toEqual(['perEmployee']);
    expect(c1[0]).toMatchObject({ low: Math.round(19e6 / 5000), high: Math.round(37e6 / 5000) });
    const exact = mk({ currency: 'GBP', exactAnnualSpend: 30e6, splitPercent: { INFRA: 40, APPS: 35, PEOPLE: 25 }, units: { employees: 5000, servers: 800, applications: 350 } });
    const c2 = unitCosts(indicativeFor(exact), exact.baseline);
    expect(c2.find(c => c.key === 'perServer')).toMatchObject({ low: 15000, high: 15000 });
    expect(c2.find(c => c.key === 'perApplication')).toMatchObject({ low: 30000, high: 30000 });
  });

  it('shows the unit measures in Scope and context, traced, and passes the checks in both editions', () => {
    const i = mk({ currency: 'GBP', exactAnnualSpend: 30e6, splitPercent: { INFRA: 40, APPS: 35, PEOPLE: 25 }, units: { employees: 5000, users: 5200, servers: 800, applications: 350 } });
    for (const view of ['client', 'consultant'] as const) {
      const doc = costIqReport(i, { client: 'Example Client', preparedBy: 'LTM', dataProvidedBy: 'Example Client', view });
      expect(checkCostIqReport(doc, i, view, '2026-11-12').failures, view).toEqual([]);
      const profile = JSON.stringify(doc.sections.find(s => s.id === 'profile'));
      expect(profile).toContain('"Unit measures"');
      expect(profile).toContain('Infrastructure spend per server');
      expect(profile).toContain('No peer comparison is made');
    }
  });

  it('flags counts that do not fit together', () => {
    expect(plausibilityChecks({}, { employees: 5000, users: 20000 }).map(k => k.id)).toEqual(['P-08']);
    expect(plausibilityChecks({}, { employees: 5000, users: 5500, applications: 6000 }).map(k => k.id)).toEqual(['P-09']);
    expect(plausibilityChecks({}, { employees: 5000, users: 5500, applications: 400 })).toEqual([]);
    const i = mk({ currency: 'GBP', units: { employees: 500, users: 5200 } });
    const doc = costIqReport(i, { client: 'Example Client', preparedBy: 'LTM', dataProvidedBy: 'Example Client', view: 'client' });
    expect(checkCostIqReport(doc, i, 'client', '2026-11-12').failures).toEqual([]);
    expect(JSON.stringify(doc.sections.find(s => s.id === 'profile'))).toContain('Technology users and employees differ widely');
  });
});

describe('industry references (C3)', () => {
  const refs = require('../src/accelerators/cost-iq/published-references.json');
  const AREAS: string[] = Object.keys(cfg.settings.selection.areas);
  const scope = { selectedAreas: AREAS };
  const mk = (answers: Record<string, unknown>): CostIqReportInput => ({ result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null });

  it('records the search: no free, verifiable industry figure qualifies yet', () => {
    expect(refs.byIndustry.verified).toEqual({});
    expect(refs.byIndustry.examined.length).toBeGreaterThan(2);
    expect(refs.byIndustry.searched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('names the client industry and says the comparison is cross-industry only, without naming a peer figure', () => {
    const i = mk({ 'CORE-01': ['ON_PREM'], 'CTX-01': 'GBP', 'CORE-02': 'BANKING_FINANCIAL_SERVICES', 'CORE-03': '1B_5B', 'CORE-04': '50M_100M' });
    for (const view of ['client', 'consultant'] as const) {
      const doc = costIqReport(i, { client: 'Example Bank', preparedBy: 'LTM', dataProvidedBy: 'Example Bank', view });
      expect(checkCostIqReport(doc, i, view, '2026-11-12').failures, view).toEqual([]);
      const t = text(doc);
      expect(t).toContain('No free, verifiable published figure for banking and financial services is available, so this comparison is cross-industry only.');
      expect(t).not.toMatch(/Gartner|Avasant|Flexera/);
    }
    const other = mk({ 'CORE-01': ['ON_PREM'], 'CORE-02': 'OTHER', 'CORE-03': '1B_5B', 'CORE-04': '50M_100M' });
    expect(text(costIqReport(other, { client: 'X', preparedBy: 'LTM', dataProvidedBy: 'X', view: 'client' }))).not.toContain('No free, verifiable published figure for');
  });
});
