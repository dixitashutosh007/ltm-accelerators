/**
 * The FinOps IQ summary for Cost IQ (CQ3b task 8 and 10): built from the client view, ranges only, versioned, one owner per
 * lever ID, and the figures it carries are the same figures the report shows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsIqV3, type AnswerLevel, type FinOpsIqV3Input } from '../src/accelerators/finops-iq/v3/evaluate';
import { CLIENT_REMOVED_FIELDS } from '../src/accelerators/finops-iq/v3/client-view';
import { COST_IQ_SUMMARY_SCHEMA, FINOPS_IQ_LEVER_IDS, costIqSummary } from '../src/accelerators/finops-iq/v3/cost-iq-summary';

const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
function input(s: any): FinOpsIqV3Input {
  const answers = Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
  return { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: '2026-10-14' };
}
const runs = SCENARIOS.map(s => ({ id: s.id as string, result: evaluateFinOpsIqV3(input(s)) }));

describe('FinOps IQ summary for Cost IQ', () => {
  it('has a schema version and the versions it was built from', () => {
    for (const { result } of runs) {
      const s = costIqSummary(result);
      expect(s.schema).toBe(COST_IQ_SUMMARY_SCHEMA);
      expect(s.versions.engine).toBe(result.versions.engine);
      expect(s.versions.leverLibrary).toBe(result.versions.leverLibrary);
    }
  });

  it('carries the same figures the report shows, as ranges, and none when FinOps IQ shows no money', () => {
    let quantified = 0;
    for (const { id, result } of runs) {
      const s = costIqSummary(result);
      if (!result.value.moneyShown || result.value.status !== 'quantified') {
        expect(s.status, id).toBe('not_quantified');
        expect(s.cases, id).toBeNull();
        expect(s.cloudSpend, id).toBeNull();
        continue;
      }
      quantified++;
      expect(s.status, id).toBe('quantified');
      for (const c of ['conservative', 'expected', 'upper'] as const) {
        const t = result.value.totals![c];
        expect(s.cases![c].grossRunRate.value, `${id} ${c}`).toBe(t.grossRunRate.value);
        expect(s.cases![c].net3Year.value, `${id} ${c}`).toBe(t.net3Year.value);
        expect(s.cases![c].grossRunRate.claimIds.length, `${id} ${c}`).toBeGreaterThan(0);
      }
      // A range: conservative never above expected, expected never above upper.
      expect(s.cases!.conservative.grossRunRate.value).toBeLessThanOrEqual(s.cases!.expected.grossRunRate.value);
      expect(s.cases!.expected.grossRunRate.value).toBeLessThanOrEqual(s.cases!.upper.grossRunRate.value);
    }
    expect(quantified, 'at least one reference scenario shows money').toBeGreaterThan(0);
  });

  it('carries nothing the client edition removes, and never the client\'s own waste guess', () => {
    for (const { id, result } of runs) {
      const json = JSON.stringify(costIqSummary(result));
      for (const f of CLIENT_REMOVED_FIELDS) expect(json.includes(`"${f}":`), `${id}: ${f}`).toBe(false);
      expect(json.includes('"hypothesis"'), id).toBe(false);
    }
  });

  it('names the levers this tool owns, so Cost IQ can refuse to compute them', () => {
    expect(FINOPS_IQ_LEVER_IDS).toEqual(['LEV-01', 'LEV-02', 'LEV-03', 'LEV-04', 'LEV-05', 'LEV-06', 'LEV-07', 'LEV-08', 'LEV-09', 'LEV-10']);
    for (const { id, result } of runs) {
      const s = costIqSummary(result);
      for (const l of s.levers) expect(FINOPS_IQ_LEVER_IDS, `${id} ${l.id}`).toContain(l.id);
    }
  });

  it('states the cap with its source, year and sample, and the boundary wording', () => {
    const s = costIqSummary(runs[0].result);
    expect(s.globalCap.source.claimId).toMatch(/^CLM-/);
    expect(s.globalCap.source.year).toBeTruthy();
    expect(s.globalCap.source.sample).toBeTruthy();
    expect(s.boundaryStatement).toContain('FinOps IQ');
  });
});
