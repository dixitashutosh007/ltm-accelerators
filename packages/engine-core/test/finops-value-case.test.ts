/**
 * FinOps Value Case: the Phase 2 reference test suite.
 * - Contract: what the API accepts, and that the page's question bank matches the engine's.
 * - Golden master: approved outputs for four client archetypes (test/golden/finops-value-case.json).
 * - Invariants: outputs stay sane for any valid answers (seeded random questionnaires).
 * - Regressions: one test per bug fixed in Phase 2.
 *
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run finops-value-case,
 * then have the FinOps lead review the golden file diff in the pull request.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsValueCase, qScore, type EvaluationResult } from '../src/accelerators/finops-value-case/evaluate';
import { parseFinOpsValueCaseRequest, DONT_KNOW } from '../src/accelerators/finops-value-case/contract';
import kb from '../src/accelerators/finops-value-case/knowledge-base.json' with { type: 'json' };
import publicSchema from '../src/accelerators/finops-value-case/public-schema.json' with { type: 'json' };
import { finopsValueCaseAnswers, finopsValueCaseOrg } from './sample-inputs';

const Q: any[] = (kb as any).questions;
const byId = (id: string) => Q.find(q => q.id === id);
const scored = (q: any) => (q.options || []).map((o: any, i: number) => ({ i, s: o.score })).filter((x: any) => typeof x.s === 'number');

/** Deterministic pseudo-random numbers, so failures reproduce. */
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** A random answer that the API contract accepts, for any question type. */
function randomAnswer(q: any, r: () => number): unknown {
  if (q.allow_dk && r() < 0.1) return DONT_KNOW;
  const n = (q.options || []).length;
  const pick = () => Math.floor(r() * n);
  switch (q.answer_type) {
    case 'single_select': case 'card_select': return pick();
    case 'multi_select': case 'multi_select_logo': return [...new Set([pick(), pick()])];
    case 'boolean_dk': return ['yes', 'no', 'dk'][Math.floor(r() * 3)];
    case 'rating_1_5': return 1 + Math.floor(r() * 5);
    case 'slider_percent': case 'slider_signed': case 'slider_currency': {
      const { min, max } = q.slider; return Math.round(min + r() * (max - min));
    }
    case 'allocation_100': {
      const a = Math.round(r() * 100); const b = Math.round(r() * (100 - a)); const c = Math.round(r() * (100 - a - b));
      return { engineering: a, finance: b, central_it: c, nobody: 100 - a - b - c };
    }
    case 'drag_order': return [...(q.items || q.options || [])].map((o: any) => (typeof o === 'string' ? o : o.label)).sort(() => r() - 0.5);
    case 'open_text': return 'Notes';
    default: throw new Error('No generator for ' + q.answer_type);
  }
}

function randomQuestionnaire(seed: number) {
  const r = rng(seed);
  const answers: Record<string, unknown> = {};
  for (const q of Q) if (r() < 0.85) answers[q.id] = randomAnswer(q, r);
  const org = { name: 'Client ' + seed, sector: 'Sector', sector_class: r() < 0.5 ? 'bfsi' : 'other', currency: ['gbp', 'usd', 'eur', 'inr'][Math.floor(r() * 4)] };
  return { answers, org };
}

/** Answers every scored single-select question with its worst (or best) option. */
function extremeAnswers(which: 'worst' | 'best') {
  const answers: Record<string, unknown> = {};
  for (const q of Q) {
    if (q.answer_type !== 'single_select') continue;
    const opts = scored(q);
    if (!opts.length) continue;
    const pickBest = which === 'best';
    answers[q.id] = opts.reduce((m: any, o: any) => ((pickBest ? o.s > m.s : o.s < m.s) ? o : m)).i;
  }
  return answers;
}

const ARCHETYPES: Record<string, { answers: Record<string, unknown>; org: Record<string, string> }> = {
  'sample-investment-bank': { answers: finopsValueCaseAnswers, org: finopsValueCaseOrg },
  'immature-bfsi-inr': { answers: { ...extremeAnswers('worst'), E3: 20_000_000, E5: 60, E6: 70 }, org: { name: 'Immature bank', sector: 'Banking', sector_class: 'bfsi', currency: 'inr' } },
  'mature-general-usd': { answers: { ...extremeAnswers('best'), E3: 5_000_000, E5: 10, E6: 10 }, org: { name: 'Mature retailer', sector: 'Retail', sector_class: 'other', currency: 'usd' } },
  'all-unknown': {
    answers: Object.fromEntries(Q.filter(q => q.allow_dk).map(q => [q.id, DONT_KNOW])),
    org: { name: 'Unknown estate', sector: 'Public sector', sector_class: 'other', currency: 'gbp' }
  }
};

/** The parts of a result a consultant would defend in front of a CIO. */
function goldenView(r: EvaluationResult) {
  const round = (p: [number, number] | null) => (p ? p.map(v => Math.round(v)) : null);
  return {
    signals: r.signals,
    gapIndex: r.gapIndex,
    urgencyIndex: r.urgencyIndex,
    needIndex: r.needIndex,
    wasteBand: { low: r.wasteBand.low, high: Number(r.wasteBand.high.toFixed(4)), label: r.wasteBand.label, isBfsi: r.wasteBand.isBfsi },
    exposureY1: round(r.exposure.y1),
    exposureY3: round(r.exposure.y3),
    verdict: r.verdict?.label ?? r.verdict?.title ?? null,
    confidence: r.confidence.label,
    blindSpots: r.blindSpots.length,
    streams: r.streams.map(s => `${s.id} ${s.score} ${s.priority} ${s.savingsRange}`)
  };
}

describe('FinOps Value Case contract', () => {
  it('accepts the sample request', () => {
    expect(parseFinOpsValueCaseRequest({ answers: finopsValueCaseAnswers, org: finopsValueCaseOrg }).ok).toBe(true);
  });

  it('accepts any questionnaire the page can produce', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parseFinOpsValueCaseRequest(randomQuestionnaire(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
  });

  it('rejects unknown questions, malformed answers and unknown currencies with readable reasons', () => {
    const res = parseFinOpsValueCaseRequest({
      answers: { ZZ9: 1, C3: 99, E3: 'lots', B1: 'maybe' },
      org: { currency: 'xyz', sector_class: 'bank' }
    });
    expect(res.ok).toBe(false);
    const errors = res.ok ? [] : res.errors.join('\n');
    expect(errors).toContain('answers.ZZ9: unknown question');
    expect(errors).toContain('answers.C3: expected an option index');
    expect(errors).toContain('answers.E3: expected a number');
    expect(errors).toContain('org.currency');
    expect(errors).toContain('org.sector_class');
  });

  it('rejects a missing answers object', () => {
    expect(parseFinOpsValueCaseRequest({}).ok).toBe(false);
    expect(parseFinOpsValueCaseRequest(null).ok).toBe(false);
  });

  it('maps the pre-Phase-2 page payload (top-level currency, org.industry)', () => {
    const res = parseFinOpsValueCaseRequest({ answers: {}, currency: 'USD', org: { name: 'Old page', industry: 'Banking' } });
    expect(res.ok && res.value.org).toEqual({ name: 'Old page', sector: 'Banking', currency: 'usd' });
  });

  it("the page's public question bank has the same questions and options as the engine's", () => {
    const shape = (bank: any) => bank.questions.map((q: any) => `${q.id}:${q.answer_type}:${(q.options || []).length}`);
    expect(shape(publicSchema)).toEqual(shape(kb));
    const html = readFileSync(join(__dirname, '../../../Accelerators/finops-value-case.html'), 'utf8');
    const start = html.indexOf('{', html.indexOf('const DEFAULT_KB'));
    let depth = 0, end = start;
    for (; end < html.length; end++) { if (html[end] === '{') depth++; else if (html[end] === '}' && --depth === 0) break; }
    const pageBank = new Function('return ' + html.slice(start, end + 1))();
    expect(shape(pageBank)).toEqual(shape(kb));
    expect(JSON.stringify(pageBank), 'the page must not ship scoring weights').not.toContain('"score"');
  });
});

describe('FinOps Value Case golden master (approved outputs)', () => {
  const file = join(__dirname, 'golden/finops-value-case.json');
  const actual = Object.fromEntries(Object.entries(ARCHETYPES).map(([k, a]) => [k, goldenView(evaluateFinOpsValueCase(a.answers, a.org))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));

  for (const name of Object.keys(ARCHETYPES)) {
    it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
  }
});

describe('FinOps Value Case invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => {
    const input = randomQuestionnaire(1000 + i);
    return { seed: 1000 + i, input, r: evaluateFinOpsValueCase(input.answers, input.org) };
  });
  const cap = (kb as any).meta.benchmarks.bfsi_modifiers.cap;
  const symbols: Record<string, string> = Object.fromEntries((kb as any).meta.currencies.map((c: any) => [c.id, c.symbol]));

  it('never returns NaN, Infinity or undefined anywhere in the result', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
      expect(JSON.stringify(r), `seed ${seed}`).not.toMatch(/undefined|NaN/);
    }
  });

  it('keeps every index and score within 0-100', () => {
    for (const { seed, r } of runs) {
      const values = [r.gapIndex, r.urgencyIndex, r.needIndex, ...Object.values(r.signals), ...r.streams.map(s => s.score)];
      for (const v of values) if (v !== null) expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(0), expect(v, `seed ${seed}`).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the waste band ordered and under the published cap', () => {
    for (const { seed, r } of runs) {
      expect(r.wasteBand.low, `seed ${seed}`).toBeLessThanOrEqual(r.wasteBand.high);
      expect(r.wasteBand.high, `seed ${seed}`).toBeLessThanOrEqual(cap);
    }
  });

  it('never shows exposure above spend x cap, and 3-year exposure is at least year 1', () => {
    for (const { seed, r } of runs) {
      if (!r.exposure.y1 || r.annualSpend === null) continue;
      expect(r.exposure.y1[1], `seed ${seed}`).toBeLessThanOrEqual(r.annualSpend * cap + 1e-6);
      expect(r.exposure.y3![0], `seed ${seed}`).toBeGreaterThanOrEqual(r.exposure.y1[0]);
      expect(r.exposure.y3![1], `seed ${seed}`).toBeGreaterThanOrEqual(r.exposure.y1[1]);
    }
  });

  it("quotes money in the client's chosen currency", () => {
    for (const { seed, input, r } of runs) {
      for (const s of r.streams) if (s.savingsRange !== '—') expect(s.savingsRange.startsWith(symbols[input.org.currency]), `seed ${seed}: ${s.savingsRange}`).toBe(true);
    }
  });

  it('a more mature answer never lowers a signal or a stream score, nor raises the need index', () => {
    const base = randomQuestionnaire(7).answers;
    for (const q of Q.filter(q => q.answer_type === 'single_select' && scored(q).length > 1)) {
      const opts = scored(q).sort((a: any, b: any) => a.s - b.s);
      for (let k = 1; k < opts.length; k++) {
        const worse = evaluateFinOpsValueCase({ ...base, [q.id]: opts[k - 1].i }, { sector_class: 'other' });
        const better = evaluateFinOpsValueCase({ ...base, [q.id]: opts[k].i }, { sector_class: 'other' });
        for (const sig of Object.keys(better.signals)) {
          if (better.signals[sig] !== null && worse.signals[sig] !== null) expect(better.signals[sig]!, `${q.id} ${sig}`).toBeGreaterThanOrEqual(worse.signals[sig]!);
        }
        for (const s of better.streams) expect(s.score, `${q.id} ${s.id}`).toBeGreaterThanOrEqual(worse.streams.find(w => w.id === s.id)!.score);
        if (better.needIndex !== null && worse.needIndex !== null) expect(better.needIndex, q.id).toBeLessThanOrEqual(worse.needIndex);
      }
    }
  });
});

describe('FinOps Value Case regressions fixed in Phase 2', () => {
  const stream = (r: EvaluationResult, id: string) => r.streams.find(s => s.id === id)!.score;

  it("the worst answer to C3, C5 and V1 scores below the second-worst (was rescored as 25-30)", () => {
    for (const [id, streamId] of [['C3', 'hygiene'], ['C5', 'architecture'], ['V1', 'attribution']] as const) {
      const opts = scored(byId(id)).sort((a: any, b: any) => a.s - b.s);
      const worst = evaluateFinOpsValueCase({ [id]: opts[0].i });
      const second = evaluateFinOpsValueCase({ [id]: opts[1].i });
      expect(stream(worst, streamId), id).toBeLessThan(stream(second, streamId));
    }
  });

  it('a signal that genuinely scores 0 is not treated as a neutral 50 in the roadmap', () => {
    const r = evaluateFinOpsValueCase(extremeAnswers('worst'));
    expect(r.signals.control).toBe(0);
    const neutral = evaluateFinOpsValueCase({});
    expect(stream(r, 'rate')).toBeLessThan(stream(neutral, 'rate'));
  });

  it('applies the BFSI uplift when the page classifies the client as BFSI (was never applied)', () => {
    const answers = extremeAnswers('worst');
    const bank = evaluateFinOpsValueCase(answers, { sector: 'Banking / Financial Services', sector_class: 'bfsi' });
    const other = evaluateFinOpsValueCase(answers, { sector: 'Banking / Financial Services', sector_class: 'other' });
    expect(bank.wasteBand.isBfsi).toBe(true);
    expect(other.wasteBand.isBfsi).toBe(false);
    expect(bank.wasteBand.high).toBeGreaterThan(other.wasteBand.high);
  });

  it('roadmap savings use the selected currency, in any letter case (were always in £)', () => {
    const r = evaluateFinOpsValueCase({ E3: 1_000_000 }, { currency: 'USD' });
    expect(r.streams[0].savingsRange.startsWith('$')).toBe(true);
  });

  it('answer scores come from the knowledge base, not a hard-coded copy', () => {
    for (const id of ['C3', 'C5', 'V1']) {
      const q = byId(id);
      q.options.forEach((_: any, i: number) => expect(qScore(q, i)).toBe(q.options[i].score));
    }
  });
});
