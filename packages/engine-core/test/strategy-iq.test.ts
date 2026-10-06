/**
 * Strategy IQ: Phase 2 test suite (same pattern as finops-value-case.test.ts; see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run strategy-iq, then have the strategy lead
 * review the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateStrategyIq, computeQuestionScore, type StrategyIqEvaluation } from '../src/accelerators/strategy-iq/evaluate';
import { parseStrategyIqRequest } from '../src/accelerators/strategy-iq/contract';
import kb from '../src/accelerators/strategy-iq/knowledge-base.json' with { type: 'json' };

const Q: any[] = (kb as any).questions;
const byId = (id: string) => Q.find(q => q.id === id);
const page = readFileSync(join(__dirname, '../../../Accelerators/strategy-iq.html'), 'utf8');

/** Evaluates a `const NAME = [...]` or `{...}` literal from the page source. */
function pageLiteral(name: string, open: '[' | '{') {
  const close = open === '[' ? ']' : '}';
  const start = page.indexOf(open, page.indexOf('const ' + name));
  let depth = 0, end = start;
  for (; end < page.length; end++) { if (page[end] === open) depth++; else if (page[end] === close && --depth === 0) break; }
  return new Function('return ' + page.slice(start, end + 1))();
}

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomAnswer(q: any, r: () => number): unknown {
  const pick = (n: number) => Math.floor(r() * n);
  switch (q.type) {
    case 'single_select': return pick(q.opts.length);
    case 'multi_select': return [...new Set(Array.from({ length: pick(q.opts.length + 1) }, () => pick(q.opts.length)))];
    case 'slider': { const { min, max, step } = q.sliderConfig; return Math.min(max, min + Math.round((r() * (max - min)) / step) * step); }
    case 'rating_matrix': return Object.fromEntries(q.subItems.map((s: any) => [s.id, 1 + pick(5)]));
    case 'drag_rank': return q.rankItems.map((i: any) => i.id).sort(() => r() - 0.5);
    default: throw new Error('No generator for ' + q.type);
  }
}

function randomQuestionnaire(seed: number) {
  const r = rng(seed);
  const answers: Record<string, unknown> = {};
  for (const q of Q) if (r() < 0.85) answers[q.id] = randomAnswer(q, r);
  return { answers, intake: { orgName: 'Client ' + seed, sector: 'finserv', itSpend: 10_000_000 + Math.round(r() * 500_000_000) } };
}

function goldenView(r: StrategyIqEvaluation) {
  const { timestamp, ...rest } = r;
  return { ...rest, sectionScores: Object.fromEntries(Object.entries(r.sectionScores).map(([k, v]) => [k, Number(v.toFixed(3))])) };
}

describe('Strategy IQ contract', () => {
  it('accepts any questionnaire the page can produce', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parseStrategyIqRequest(randomQuestionnaire(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
  });

  it('accepts every demo archetype on the page', () => {
    const archetypes = pageLiteral('ARCHETYPES', '{');
    for (const [k, a] of Object.entries<any>(archetypes)) {
      const res = parseStrategyIqRequest({ answers: a.scores, intake: { itSpend: a.itSpend } });
      expect(res.ok ? [] : res.errors, k).toEqual([]);
    }
  });

  it('rejects unknown questions and malformed answers with readable reasons', () => {
    const res = parseStrategyIqRequest({
      answers: { 'S9.9': 1, 'S1.1': 5, 'S1.2': 9, 'S2.2': { p1: 7 }, 'S2.3': ['r1', 'r1'] },
      intake: { itSpend: -5 }
    });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('answers.S9.9: unknown question');
    expect(errors).toContain('answers.S1.1: expected an option index 0-4');
    expect(errors).toContain('answers.S1.2: expected a number 1-5');
    expect(errors).toContain('answers.S2.2: rating for p1 must be 1-5');
    expect(errors).toContain('answers.S2.3: expected a ranking');
    expect(errors).toContain('intake.itSpend');
  });

  it("the page's questions match the engine's, and the page carries no scores", () => {
    const shape = (qs: any[]) => qs.map(q => [q.id, q.type, (q.opts || q.rankItems || q.subItems || []).length].join(':'));
    const pageQuestions = pageLiteral('STRATEGY_QUESTIONS', '[');
    expect(shape(pageQuestions)).toEqual(shape(Q));
    expect(JSON.stringify(pageQuestions)).not.toMatch(/"score"/);
    expect(page).not.toMatch(/function computeStrategyScores|function computeQuestionScore/);
  });
});

describe('Strategy IQ golden master (approved outputs)', () => {
  const archetypes = pageLiteral('ARCHETYPES', '{');
  const inputs: Record<string, any> = Object.fromEntries(
    Object.entries<any>(archetypes).map(([k, a]) => [`demo-${k}`, { answers: a.scores, intake: { itSpend: a.itSpend } }])
  );
  inputs['unanswered'] = { answers: {}, intake: {} };
  const file = join(__dirname, 'golden/strategy-iq.json');
  const actual = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, goldenView(evaluateStrategyIq(i))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(inputs)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
});

describe('Strategy IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 2000 + i, input: randomQuestionnaire(2000 + i) }))
    .map(x => ({ ...x, r: evaluateStrategyIq(x.input) }));

  it('never returns NaN, Infinity or undefined', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
    }
  });

  it('keeps maturity on the 1-5 scale and derived metrics in range', () => {
    for (const { seed, r } of runs) {
      for (const v of [r.overall, r.deliveryMaturity, ...Object.values(r.sectionScores)]) {
        expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(v, `seed ${seed}`).toBeLessThanOrEqual(5);
      }
      expect(r.debtDragPct, `seed ${seed}`).toBeGreaterThanOrEqual(8);
      expect(r.debtDragPct, `seed ${seed}`).toBeLessThanOrEqual(45);
      for (const v of [r.alignmentIndex, r.resilienceScore]) expect(v).toBeGreaterThanOrEqual(20), expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('the band always matches the overall score', () => {
    const expected = (o: number) => (o < 2 ? 'band-nascent' : o < 3 ? 'band-emerging' : o < 4 ? 'band-established' : o < 4.6 ? 'band-advanced' : 'band-leading');
    for (const { seed, r } of runs) expect(r.bandClass, `seed ${seed}`).toBe(expected(r.overall));
  });

  it('a more mature option never lowers its section score; rankings never change any score', () => {
    const base = randomQuestionnaire(9).answers;
    for (const q of Q.filter(q => q.type === 'single_select')) {
      for (let i = 1; i < q.opts.length; i++) {
        const lower = evaluateStrategyIq({ answers: { ...base, [q.id]: i - 1 } });
        const higher = evaluateStrategyIq({ answers: { ...base, [q.id]: i } });
        expect(higher.sectionScores[q.section], `${q.id} option ${i}`).toBeGreaterThanOrEqual(lower.sectionScores[q.section]);
      }
    }
    for (const q of Q.filter(q => q.type === 'drag_rank')) {
      const a = evaluateStrategyIq({ answers: { ...base, [q.id]: q.rankItems.map((x: any) => x.id) } });
      const b = evaluateStrategyIq({ answers: { ...base, [q.id]: q.rankItems.map((x: any) => x.id).reverse() } });
      expect(b.sectionScores, q.id).toEqual(a.sectionScores);
    }
  });
});

describe('Strategy IQ regressions fixed in Phase 2', () => {
  it('single-select answers are option indexes scored from the knowledge base (the page used to send the score itself)', () => {
    const q = byId('S1.1');
    expect(computeQuestionScore(q, 0)).toBe(1);
    expect(computeQuestionScore(q, 4)).toBe(5);
  });

  it('an unanswered slider scores its default on the 1-5 scale (was the raw value, e.g. 65)', () => {
    for (const q of Q.filter(q => q.type === 'slider')) {
      const v = computeQuestionScore(q, undefined)!;
      expect(v, q.id).toBeGreaterThanOrEqual(1);
      expect(v, q.id).toBeLessThanOrEqual(5);
    }
  });

  it('multi-select practices count toward maturity (the server scored them as a flat 3.0)', () => {
    const q = byId('S1.4');
    expect(computeQuestionScore(q, [])).toBe(1);
    expect(computeQuestionScore(q, [0, 1])).toBeCloseTo(2.6);
    expect(computeQuestionScore(q, [0, 1, 2, 3, 4])).toBe(5);
  });

  it('ranking questions are not scored (were a fixed 3.2)', () => {
    for (const q of Q.filter(q => q.type === 'drag_rank')) expect(computeQuestionScore(q, q.rankItems.map((x: any) => x.id))).toBeNull();
  });

  it('reports operating-model maturity on the 1-5 scale, not an invented "velocity multiple"', () => {
    const r = evaluateStrategyIq({ answers: {} }) as any;
    expect(r.deliveryVelocity).toBeUndefined();
    expect(r.deliveryMaturity).toBe(Math.round(r.sectionScores.S2 * 10) / 10);
    expect(page).not.toMatch(/Velocity Multiple|x acceleration/);
  });
});
