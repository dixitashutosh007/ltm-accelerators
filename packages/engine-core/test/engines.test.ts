import { describe, it, expect } from 'vitest';
import { evaluateCloudIq } from '../src/accelerators/cloud-iq/evaluate';
import { evaluateStrategyIq } from '../src/accelerators/strategy-iq/evaluate';
import { evaluateModernizationIq } from '../src/accelerators/modernization-iq/evaluate';
import {
  cloudIqAnswers,
  strategyIqAnswers, strategyIqIntake, modernizationIqAnswers, modernizationIqOrg
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

// One representative run per engine, with the score range each engine documents.
const ENGINES: { name: string; run: () => any; score: (r: any) => number; range: [number, number] }[] = [
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
    ['Cloud IQ', () => evaluateCloudIq({ answers: {}, session: { clientName: 'x', mode: 'workshop' } } as any)],
    ['Strategy IQ', () => evaluateStrategyIq({ answers: {}, intake: {} } as any)],
    ['Modernize IQ', () => evaluateModernizationIq({ answers: {}, org: {} } as any)]
  ])('%s does not throw and returns finite numbers', (_name, run) => {
    const result = run();
    expect(nonFiniteNumbers(result)).toEqual([]);
  });
});
