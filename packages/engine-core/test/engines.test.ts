import { describe, it, expect } from 'vitest';
import { evaluateFinOpsValueCase } from '../src/accelerators/finops-value-case/evaluate';
import { evaluateFinOpsIq } from '../src/accelerators/finops-iq/evaluate';
import { evaluatePostureIq } from '../src/accelerators/posture-iq/evaluate';
import { evaluateSovereignIq } from '../src/accelerators/sovereign-iq/evaluate';
import { evaluateCloudIq } from '../src/accelerators/cloud-iq/evaluate';
import { evaluateStrategyIq } from '../src/accelerators/strategy-iq/evaluate';
import { evaluateModernizationIq } from '../src/accelerators/modernization-iq/evaluate';
import {
  finopsValueCaseAnswers, finopsValueCaseOrg, finopsIqAnswers, cloudIqAnswers,
  strategyIqAnswers, strategyIqIntake, modernizationIqAnswers, modernizationIqOrg,
  postureArchetypes, sovereignArchetypes
} from './sample-inputs';

/** Paths of every NaN / Infinity number in an object graph. */
function nonFiniteNumbers(value: unknown, path = '$', out: string[] = [], seen = new Set<unknown>()): string[] {
  if (typeof value === 'number' && !Number.isFinite(value)) out.push(path);
  else if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const [k, v] of Object.entries(value)) nonFiniteNumbers(v, `${path}.${k}`, out, seen);
  }
  return out;
}

/** Remove fields that legitimately change between runs. */
const stable = (result: unknown) => JSON.parse(JSON.stringify(result, (k, v) => (k === 'timestamp' || k === 'generatedAt' ? undefined : v)));

const runPosture = (key: string) => {
  const a = postureArchetypes[key];
  return evaluatePostureIq({
    answers: a.answers,
    org: { name: a.name, turnover: a.turnover, hq: a.hq, footprint: a.footprint, size: a.size },
    regulations: a.regulations,
    sectors: a.sectors
  });
};
const runSovereign = (key: string) => {
  const a = sovereignArchetypes[key];
  return evaluateSovereignIq({ answers: a.answers, session: { clientName: a.clientName, mode: 'workshop' } });
};

// One representative run per engine, with the score range each engine documents.
const ENGINES: { name: string; run: () => any; score: (r: any) => number; range: [number, number] }[] = [
  { name: 'FinOps Value Case', run: () => evaluateFinOpsValueCase(finopsValueCaseAnswers, finopsValueCaseOrg), score: r => r.needIndex, range: [0, 100] },
  { name: 'FinOps IQ', run: () => evaluateFinOpsIq({ answers: finopsIqAnswers, annualSpend: 4000000 }), score: r => r.overallScore, range: [0, 100] },
  { name: 'Posture IQ', run: () => runPosture('bank'), score: r => r.overallScore, range: [0, 100] },
  { name: 'Sovereign IQ', run: () => runSovereign('saudi_bank'), score: r => r.maturity.score, range: [0, 100] },
  { name: 'Cloud IQ', run: () => evaluateCloudIq({ answers: cloudIqAnswers, session: { clientName: 'Tier 1 Global Bank', mode: 'workshop' } }), score: r => r.overall, range: [0, 5] },
  { name: 'Strategy IQ', run: () => evaluateStrategyIq({ answers: strategyIqAnswers, intake: strategyIqIntake }), score: r => r.overall, range: [0, 5] },
  { name: 'Modernize IQ', run: () => evaluateModernizationIq({ answers: modernizationIqAnswers, org: modernizationIqOrg }), score: r => r.overall, range: [0, 5] }
];

describe.each(ENGINES)('$name engine', ({ run, score, range }) => {
  it('produces no NaN or Infinity anywhere in its result', () => {
    expect(nonFiniteNumbers(run())).toEqual([]);
  });

  it(`keeps its headline score within ${range[0]}–${range[1]}`, () => {
    const s = Number(score(run()));
    expect(s).toBeGreaterThanOrEqual(range[0]);
    expect(s).toBeLessThanOrEqual(range[1]);
  });

  it('is deterministic for the same answers', () => {
    expect(stable(run())).toEqual(stable(run()));
  });
});

describe('Engines tolerate an empty questionnaire', () => {
  it.each([
    ['FinOps Value Case', () => evaluateFinOpsValueCase({}, finopsValueCaseOrg)],
    ['FinOps IQ', () => evaluateFinOpsIq({ answers: {}, annualSpend: 0 })],
    ['Posture IQ', () => evaluatePostureIq({ answers: {}, org: {} } as any)],
    ['Sovereign IQ', () => evaluateSovereignIq({ answers: {}, session: { clientName: 'x', mode: 'workshop' } } as any)],
    ['Cloud IQ', () => evaluateCloudIq({ answers: {}, session: { clientName: 'x', mode: 'workshop' } } as any)],
    ['Strategy IQ', () => evaluateStrategyIq({ answers: {}, intake: {} } as any)],
    ['Modernize IQ', () => evaluateModernizationIq({ answers: {}, org: {} } as any)]
  ])('%s does not throw and returns finite numbers', (_name, run) => {
    const result = run();
    expect(nonFiniteNumbers(result)).toEqual([]);
  });
});

describe('Posture IQ statutory exposure', () => {
  it.each(Object.keys(postureArchetypes))('%s: headline is the largest single statutory cap, never a sum', key => {
    const r = runPosture(key);
    expect(r.penalties.totalValueAtStake).toBe(Math.max(...r.penalties.fines.map((f: any) => f.capUSD)));
  });

  it('EU AI Act high-risk cap uses Art. 99(4): the higher of EUR 15M or 3% of turnover', () => {
    const turnover = 1_000_000_000;
    const r = evaluatePostureIq({ answers: postureArchetypes.bank.answers, org: { turnover }, regulations: ['aiact'] } as any);
    const ai = r.penalties.fines.find((f: any) => f.regId === 'aiact');
    expect(ai).toBeTruthy();
    expect(ai!.capUSD).toBe(Math.round(Math.max(15_000_000, (turnover / 1.08) * 0.03) * 1.08));
  });

  it('GDPR cap is the higher of EUR 20M or 4% of turnover', () => {
    const small = evaluatePostureIq({ answers: {}, org: { turnover: 100_000_000 }, regulations: ['gdpr'] } as any);
    const large = evaluatePostureIq({ answers: {}, org: { turnover: 10_000_000_000 }, regulations: ['gdpr'] } as any);
    const cap = (r: any) => r.penalties.fines.find((f: any) => f.regId === 'gdpr').capUSD;
    expect(cap(small)).toBe(Math.round(20_000_000 * 1.08));
    expect(cap(large)).toBe(Math.round((10_000_000_000 / 1.08) * 0.04 * 1.08));
  });
});

describe('Sovereign IQ regulatory scope', () => {
  it('Saudi bank: KSA regimes in scope, no EU regimes', () => {
    const ids = runSovereign('saudi_bank').inScopeRegimes.map((r: any) => r.regime.id);
    expect(ids).toEqual(expect.arrayContaining(['KSA_PDPL', 'KSA_NCA', 'KSA_SAMA_CITC']));
    for (const eu of ['DORA', 'EU_GDPR', 'EU_AI_ACT']) expect(ids).not.toContain(eu);
  });

  it.each(Object.keys(sovereignArchetypes))('%s: ceiling equals the largest in-scope statutory maximum', key => {
    const r = runSovereign(key);
    const amounts = r.fin.components.map(c => c.amt);
    expect(r.fin.statutoryCeiling).toBe(Math.max(0, ...amounts));
  });

  it('EU archetype: GDPR cap is at least EUR 20M (the higher of EUR 20M or 4%)', () => {
    const gdpr = runSovereign('eu_pharma').fin.components.find(c => c.law.startsWith('GDPR'));
    expect(gdpr).toBeTruthy();
    expect(gdpr!.amt).toBeGreaterThanOrEqual(20_000_000);
  });

  it.each(Object.keys(sovereignArchetypes))('%s: every archetype has at least one regime in scope', key => {
    expect(runSovereign(key).inScopeRegimes.length).toBeGreaterThan(0);
  });
});
