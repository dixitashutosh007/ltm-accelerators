/**
 * Client mode (D7; execution phase M3): the server removes consultant-only fields before the result leaves it.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFinOpsIqV3, clientView, CLIENT_REMOVED_FIELDS, QUESTIONS, type Facts, type Mode } from '../src/accelerators/finops-iq/v3';

const FACTS: Facts = {
  org: { currency: 'USD', consumingUnits: '20+' },
  footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'kubernetes', 'ai_api', 'saas'] },
  spend: { byScope: { aws: { exact: 40_000_000 }, azure: { exact: 20_000_000 } }, growth12m: 25 },
  base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.65 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.3 } },
  cost: { internalRate: { exact: 12_000 } }
} as Facts;
const LEVELS = ['run', 'walk', 'crawl', 'not_yet', 'unknown'];
function rng(seed: number) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const results = (['executive', 'workshop'] as Mode[]).flatMap(mode => Array.from({ length: 40 }, (_, i) => {
  const r = rng(300 + i);
  const answers = Object.fromEntries(QUESTIONS.filter(q => q.kind === 'maturity' && q.modes.includes(mode) && q.id !== 'UN-08' && r() > 0.1).map(q => [q.id, LEVELS[Math.floor(r() * 5)]]));
  // CP-1: allocation claimed at Run while increases cannot be explained, so a conflict probe is raised.
  if (i % 4 === 0) Object.assign(answers, { 'UN-04': 'run', 'UN-11': 'crawl' });
  return evaluateFinOpsIqV3({ mode, facts: FACTS, answers, assessmentDate: '2026-10-20' });
}));

function keysIn(v: any, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach(x => keysIn(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); keysIn(x, out); }
  return out;
}

describe('FinOps IQ v3 client view', () => {
  it('the sample raises conflict probes, so their removal is tested', () => {
    expect(results.some(r => r.conflicts.length > 0)).toBe(true);
  });

  it('removes every consultant-only field and every conflict probe', () => {
    for (const r of results) {
      const c = clientView(r);
      expect(c.view).toBe('client');
      expect(c.conflicts).toEqual([]);
      expect(JSON.stringify(c)).not.toMatch(/consultantOnly|"probe"/);
      expect([...keysIn(c)].filter(k => CLIENT_REMOVED_FIELDS.includes(k as any))).toEqual([]);
    }
  });

  it('keeps what the client report needs: ratings, findings, headline, need verdict, value and versions', () => {
    for (const r of results) {
      const c = clientView(r);
      expect(c.capabilities.map(x => [x.capability, x.rating, x.ratingLabel, x.gap])).toEqual(r.capabilities.map(x => [x.capability, x.rating, x.ratingLabel, x.gap]));
      expect(c.findings.map(f => [f.id, f.severity, f.title, f.decisionOrAction])).toEqual(r.findings.map(f => [f.id, f.severity, f.title, f.decisionOrAction]));
      expect(c.headline).toEqual(r.headline);
      expect(c.versions).toEqual(r.versions);
      expect(c.value.totals).toEqual(r.value.totals);
      if (r.needVerdict) expect([c.needVerdict!.needIndex, c.needVerdict!.bandLabel, c.needVerdict!.confidence]).toEqual([r.needVerdict.needIndex, r.needVerdict.bandLabel, r.needVerdict.confidence]);
    }
  });

  it('does not change the result it is given', () => {
    const r = results[0];
    const before = JSON.stringify(r);
    clientView(r);
    expect(JSON.stringify(r)).toBe(before);
  });
});
