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
      expect(r.debtDragPct, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      expect(r.debtDragPct, `seed ${seed}`).toBeLessThanOrEqual(45);
      for (const v of [r.alignmentIndex, r.resilienceScore]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
      expect(r.completeness.answered, `seed ${seed}`).toBe(Object.values(r.sectionAnswered).reduce((a, b) => a + b, 0));
      expect(r.completeness.answered, `seed ${seed}`).toBeLessThanOrEqual(r.completeness.total);
    }
  });

  it('the band always matches the unrounded overall score, and each section band its section score', () => {
    const expected = (o: number) => (o < 2 ? 'band-nascent' : o < 3 ? 'band-emerging' : o < 4 ? 'band-established' : o < 4.6 ? 'band-advanced' : 'band-leading');
    const short = (o: number) => ({ 'band-nascent': 'Nascent', 'band-emerging': 'Emerging', 'band-established': 'Established', 'band-advanced': 'Advanced', 'band-leading': 'Leading' })[expected(o)];
    for (const { seed, r } of runs) {
      const scores = Object.values(r.sectionScores);
      expect(r.bandClass, `seed ${seed}`).toBe(expected(scores.reduce((a, b) => a + b, 0) / scores.length));
      for (const [id, v] of Object.entries(r.sectionScores)) expect(r.sectionBands[id], `seed ${seed} ${id}`).toBe(short(v));
    }
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

  it('an answered slider is scored on the 1-5 scale (was the raw value, e.g. 65)', () => {
    for (const q of Q.filter(q => q.type === 'slider')) {
      const v = computeQuestionScore(q, q.sliderConfig.defaultVal)!;
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

/** Extracts `function NAME(...) {...}` from the page source. */
function pageFunctionSource(name: string) {
  const start = page.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('No function ' + name + ' on the page');
  let depth = 0, end = page.indexOf('{', start);
  for (; end < page.length; end++) { if (page[end] === '{') depth++; else if (page[end] === '}' && --depth === 0) break; }
  return page.slice(start, end + 1);
}

/** Runs a page function with the given globals in scope. */
function pageFunction(name: string, globals: Record<string, unknown>) {
  const keys = Object.keys(globals);
  return new Function(...keys, pageFunctionSource(name) + '\nreturn ' + name + ';')(...keys.map(k => globals[k]));
}

/** Least (or most) mature answer to every scored question. */
function extremeAnswers(best: boolean, section?: string) {
  const answers: Record<string, unknown> = {};
  for (const q of Q.filter(q => !section || q.section === section)) {
    if (q.type === 'single_select') {
      const scores = q.opts.map((o: any) => o.score);
      answers[q.id] = scores.indexOf(best ? Math.max(...scores) : Math.min(...scores));
    } else if (q.type === 'multi_select') answers[q.id] = best ? q.opts.map((_: any, i: number) => i) : [];
    else if (q.type === 'slider') answers[q.id] = best ? q.sliderConfig.max : q.sliderConfig.min;
    else if (q.type === 'rating_matrix') answers[q.id] = Object.fromEntries(q.subItems.map((s: any) => [s.id, best ? 5 : 1]));
  }
  return answers;
}

describe('Strategy IQ regressions fixed in Phase 3', () => {
  it('an unanswered question no longer flatters: skipping reads the same as an honest "none" (was 3.0 vs 1.0)', () => {
    const honest = evaluateStrategyIq({ answers: extremeAnswers(false, 'S1') });
    const { ['S1.4']: _none, ...skipped } = extremeAnswers(false, 'S1');
    const skippedR = evaluateStrategyIq({ answers: skipped });
    expect(honest.sectionScores.S1).toBe(1);
    expect(skippedR.sectionScores.S1).toBe(1);
    expect(computeQuestionScore(byId('S1.2'), undefined)).toBeNull();
    expect(computeQuestionScore(byId('S2.2'), {})).toBeNull();
    expect(honest.sectionAnswered.S1).toBe(4);
    expect(skippedR.sectionAnswered.S1).toBe(3);
  });

  it('reports completeness over scored questions; a section with no answers stays at a neutral 3.0', () => {
    const scored = Q.filter(q => q.type !== 'drag_rank');
    const none = evaluateStrategyIq({ answers: {} });
    expect(none.completeness).toEqual({ answered: 0, total: scored.length });
    for (const sec of (kb as any).sections) {
      expect(none.sectionScores[sec.id]).toBe(3);
      expect(none.sectionAnswered[sec.id]).toBe(0);
    }
    const all = evaluateStrategyIq({ answers: extremeAnswers(true) });
    expect(all.completeness).toEqual({ answered: scored.length, total: scored.length });
  });

  it('the page offers "None of these are in place", stored as [] and counted as answered', () => {
    const STATE: any = { answers: {} };
    const noop = () => {};
    const selectNone = pageFunction('selectNoneMultiChoice', { STATE, renderCurrentSectionQuestions: noop, renderSectionNavRail: noop });
    const toggle = pageFunction('toggleMultiChoice', { STATE, renderCurrentSectionQuestions: noop, renderSectionNavRail: noop });
    const isAnswered = pageFunction('isQuestionAnswered', { STATE, STRATEGY_QUESTIONS: pageLiteral('STRATEGY_QUESTIONS', '[') });
    expect(page).toContain('None of these are in place');
    expect(isAnswered('S1.4')).toBe(false);
    selectNone('S1.4');
    expect(STATE.answers['S1.4']).toEqual([]);
    expect(isAnswered('S1.4')).toBe(true);
    toggle('S1.4', 0);
    toggle('S1.4', 0); // unticking the last practice is not the same as choosing "None"
    expect(isAnswered('S1.4')).toBe(false);
  });

  it('untouched sliders and rating matrices are not stored or counted as answered (were pre-filled)', () => {
    const questions = pageLiteral('STRATEGY_QUESTIONS', '[');
    const STATE: any = { answers: {} };
    pageFunction('initializeDefaultAnswers', { STATE, STRATEGY_QUESTIONS: questions })();
    const isAnswered = pageFunction('isQuestionAnswered', { STATE, STRATEGY_QUESTIONS: questions });
    for (const q of questions.filter((q: any) => q.type === 'slider' || q.type === 'rating_matrix')) {
      expect(STATE.answers[q.id], q.id).toBeUndefined();
      expect(isAnswered(q.id), q.id).toBe(false);
    }
    STATE.answers['S2.2'] = { p1: 4 };
    expect(isAnswered('S2.2'), 'a partly rated matrix').toBe(false);
    STATE.answers['S2.2'] = { p1: 4, p2: 4, p3: 4, p4: 4 };
    expect(isAnswered('S2.2')).toBe(true);
    STATE.answers['S1.2'] = 3;
    expect(isAnswered('S1.2')).toBe(true);
    // Demo archetypes carry explicit values and are complete.
    for (const [k, a] of Object.entries<any>(pageLiteral('ARCHETYPES', '{'))) {
      const S: any = { answers: a.scores };
      const answered = pageFunction('isQuestionAnswered', { STATE: S, STRATEGY_QUESTIONS: questions });
      expect(questions.filter((q: any) => !answered(q.id)).map((q: any) => q.id), k).toEqual([]);
    }
  });

  it('alignment and resilience map 1-5 onto 0-100% (the worst client read 20%)', () => {
    const worst = evaluateStrategyIq({ answers: extremeAnswers(false) });
    const best = evaluateStrategyIq({ answers: extremeAnswers(true) });
    expect([worst.alignmentIndex, worst.resilienceScore]).toEqual([0, 0]);
    expect([best.alignmentIndex, best.resilienceScore]).toEqual([100, 100]);
    expect(page).toContain('const pct = Math.round(((s - 1) / 4) * 100);');
  });

  it('tech-debt drag has no 8% floor, keeps the 45% cap, and is labelled a heuristic', () => {
    expect(evaluateStrategyIq({ answers: extremeAnswers(true) }).debtDragPct).toBe(2);
    expect(evaluateStrategyIq({ answers: extremeAnswers(false) }).debtDragPct).toBe(36);
    expect(page).toContain('Indicative tech-debt drag (LTM heuristic)');
    expect(page).toMatch(/Illustrative split/);
    expect(page).not.toMatch(/unhedged/i);
  });

  it('no unsourced peer-benchmark claims; the top band is plain "Leading"', () => {
    expect(evaluateStrategyIq({ answers: extremeAnswers(true) }).band).toBe('Leading');
    expect(page).toContain('Illustrative target profile (LTM practice heuristic, not peer data)');
    expect(page).not.toMatch(/Top-Quartile Industry Benchmark|Industry Benchmark|statistically sound peer benchmarks|peer benchmark percentiles/);
  });

  it('narrative claims depend on the scores behind them', () => {
    const brief = pageFunction('generateDeterministicBrief', {
      STATE: { intake: { orgName: 'Client', itSpend: 60_000_000 } },
      STRATEGY_SECTIONS: (kb as any).sections,
      escapeHtml: (x: string) => x
    });
    const strong = evaluateStrategyIq({ answers: extremeAnswers(true) });
    const weak = evaluateStrategyIq({ answers: extremeAnswers(false) });
    const strongText = brief(strong), weakText = brief(weak);
    expect(strongText).not.toMatch(/ring-fenced refactoring capacity|single points of human dependency|rarely reconciled/);
    expect(weakText).toMatch(/ring-fenced refactoring capacity and single points of human dependency/);
    expect(weakText).toMatch(/rarely reconciled/);
    for (const t of [strongText, weakText]) {
      expect(t).not.toMatch(/most direct way to lift operating-model maturity/);
      expect(t).toMatch(/release change capacity/);
    }
    // Only S6 weak: the value-tracking claim appears, the S4/S5 sentence does not.
    const onlyS6 = evaluateStrategyIq({ answers: { ...extremeAnswers(true), ...extremeAnswers(false, 'S6') } });
    expect(brief(onlyS6)).toMatch(/rarely reconciled/);
    expect(brief(onlyS6)).not.toMatch(/ring-fenced refactoring capacity/);
  });

  it('the S4.2 slider no longer labels 20% as "Recommended" (the level descriptions rate >35% as Level 5)', () => {
    expect(byId('S4.2').sliderConfig.ticks.join(' ')).not.toMatch(/Recommended/);
    const pageQ = pageLiteral('STRATEGY_QUESTIONS', '[').find((q: any) => q.id === 'S4.2');
    expect(pageQ.sliderConfig.ticks.join(' ')).not.toMatch(/Recommended/);
  });

  it('PDF section labels use the engine\'s bands (were their own 3.0/4.0 thresholds)', () => {
    const r = evaluateStrategyIq({ answers: { ...extremeAnswers(true), ...extremeAnswers(false, 'S4') } });
    expect(r.sectionBands).toMatchObject({ S1: 'Leading', S4: 'Nascent' });
    const pdf = pageFunctionSource('downloadStrategyPDF');
    expect(pdf).toContain('R.sectionBands[s.id]');
    expect(pdf).not.toMatch(/"High Risk"/);
  });

  it('the band comes from the unrounded score (3.96 shows as 4.0 but is Established)', () => {
    const customKb = {
      sections: [{ id: 'S1' }],
      questions: [{ id: 'X', section: 'S1', type: 'single_select', opts: [{ score: 3.96 }, { score: 4.6 }] }]
    };
    const r = evaluateStrategyIq({ answers: { X: 0 } }, customKb);
    expect(r.overall).toBe(4);
    expect(r.band).toBe('Established (Operational)');
    expect(evaluateStrategyIq({ answers: { X: 1 } }, customKb).band).toBe('Leading');
  });
});
