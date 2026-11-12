/**
 * The LTM benchmark dataset (PRODUCT-GRADE-PLAN.md, C4): off by default, gated on recorded consent to the approved text,
 * anonymised (no name, no money, no answers), and no peer figure for fewer than ten contributions.
 */
import { describe, it, expect } from 'vitest';
import { buildContribution, peerFigures, BENCHMARK, type BenchmarkContribution } from '../src/accelerators/cost-iq/benchmark';

const ON = { enabled: true, consentVersion: 'BMK-1', minContributors: 10 };
const consent = { granted: true, version: 'BMK-1', recordedAt: '2026-11-12T10:00:00Z' };
const x = {
  answers: { 'CORE-02': 'INSURANCE', 'CORE-03': '1B_5B', 'CORE-04': '50M_100M', 'CTX-01': 'GBP', 'CORE-34': 60 },
  headlines: { costIQ: 58.4, valueIQ: 61.2 },
  baseline: { exactAnnualSpend: 72_500_000, splitPercent: { INFRA: 30, APPS: 45, PEOPLE: 25 }, units: { employees: 4200, users: 4600, applications: 380, servers: 950 } },
  assessmentDate: '2026-11-12', methodology: '6.7.1'
};

describe('contributing to the dataset', () => {
  it('is off as shipped: no contribution and no peer figure, whatever is passed in', () => {
    expect(BENCHMARK.enabled).toBe(false);
    expect(BENCHMARK.consentVersion).toBeNull();
    expect(buildContribution(x, consent)).toBeNull();
    expect(peerFigures([], { industry: 'INSURANCE', revenueBand: '1B_5B' })).toEqual([]);
  });

  it('needs consent to the current text', () => {
    expect(buildContribution(x, null, ON)).toBeNull();
    expect(buildContribution(x, { ...consent, granted: false }, ON)).toBeNull();
    expect(buildContribution(x, { ...consent, version: 'BMK-0' }, ON)).toBeNull();
    expect(buildContribution(x, consent, ON)).not.toBeNull();
  });

  it('carries ratios and scores only: nothing that names or sizes the client', () => {
    const c = buildContribution(x, consent, ON)!;
    expect(c).toEqual({
      schema: 'cost-iq-benchmark/1', year: 2026, methodology: '6.7.1', cell: { industry: 'INSURANCE', revenueBand: '1B_5B' },
      metrics: { costScore: 58, valueScore: 61, usersPerEmployee: 1.1, applicationsPer1000Employees: 90.5, serversPer1000Employees: 226.2, 'sharePercent.INFRA': 30, 'sharePercent.APPS': 45, 'sharePercent.PEOPLE': 25 }
    });
    const json = JSON.stringify(c);
    for (const leak of ['72500000', '4200', 'GBP', 'CORE-34', '2026-11-12', 'Example']) expect(json).not.toContain(leak);
  });

  it('is not built when the cell would mean nothing', () => {
    expect(buildContribution({ ...x, answers: { ...x.answers, 'CORE-02': 'OTHER' } }, consent, ON)).toBeNull();
    expect(buildContribution({ ...x, answers: { ...x.answers, 'CORE-03': 'UNKNOWN' } }, consent, ON)).toBeNull();
  });
});

describe('peer figures', () => {
  const cell = { industry: 'INSURANCE', revenueBand: '1B_5B' };
  const make = (n: number, metric = 'costScore'): BenchmarkContribution[] => Array.from({ length: n }, (_, k) => ({ schema: 'cost-iq-benchmark/1', year: 2026, methodology: '6.7.1', cell, metrics: { [metric]: 40 + k } }));

  it('shows nothing below ten contributions, and the quartiles from ten', () => {
    expect(peerFigures(make(9), cell, ON)).toEqual([]);
    expect(peerFigures(make(10), cell, ON)).toEqual([{ metric: 'costScore', n: 10, p25: 42.25, median: 44.5, p75: 46.75 }]);
  });

  it('never goes below ten, even if the configuration says fewer', () => {
    expect(peerFigures(make(5), cell, { ...ON, minContributors: 3 })).toEqual([]);
  });

  it('counts each metric on its own, and only within the cell', () => {
    const mixed = [...make(12), ...make(4, 'usersPerEmployee'), ...make(20).map(c => ({ ...c, cell: { industry: 'BANKING_FINANCIAL_SERVICES', revenueBand: '1B_5B' } }))];
    const got = peerFigures(mixed, cell, ON);
    expect(got.map(g => [g.metric, g.n])).toEqual([['costScore', 12]]);
  });
});
