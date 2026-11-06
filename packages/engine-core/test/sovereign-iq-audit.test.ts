/**
 * Sovereign IQ in the shared scoring audit (S11 review, area 5): the engine has an adapter in packages/engine-core/audit,
 * so `npm run audit:engines` measures it with the others. Here the same checks run in CI: headlines stay on their scale
 * over random questionnaires, the best and worst possible control answers reach the top and bottom bands, leaving answers
 * blank never flatters the result, and the list of questions with no effect on any headline may only shrink.
 */
import { describe, it, expect } from 'vitest';
import { ADAPTERS, rng } from '../audit/adapters';

const a = ADAPTERS.find(x => x.id === 'sovereign-iq')!;
const results = (() => { const r = rng(4242); return Array.from({ length: 300 }, () => { const i = a.random(r); return { i, res: a.evaluate(i) }; }); })();

// Questions that move no headline number: they feed the placement view, the SEAL view, the help list or are workshop context.
const NO_HEADLINE_EFFECT = ['A6', 'P2', 'H1', 'W1', 'W2', 'W3'];

describe('Sovereign IQ in the scoring audit', () => {
  it('is registered with the audit, with three headlines and a band', () => {
    expect(a).toBeTruthy();
    expect(a.headlines.map(h => h.name)).toEqual(['Control maturity (0-100)', 'Regimes graded "applies" (count)', 'Largest statutory cap (EUR)']);
    expect(a.band!.all).toContain('Sovereign-ready');
  });

  it('every headline stays on its scale and is finite over 300 random questionnaires', () => {
    for (const { i, res } of results) for (const h of a.headlines) {
      const v = h.get(res, i);
      if (v === null) { expect(h.name).toBe('Control maturity (0-100)'); continue; }   // withheld when too few controls are answered
      expect(Number.isFinite(v), h.name).toBe(true);
      expect(v >= h.scale[0] && v <= h.scale[1], `${h.name} ${v}`).toBe(true);
    }
  });

  it('the best possible control answers reach Sovereign-ready and the worst reach Exposed', () => {
    expect(a.band!.get(a.evaluate(a.extremes.best()))).toBe('Sovereign-ready');
    expect(a.band!.get(a.evaluate(a.extremes.worst()))).toBe('Exposed');
    expect(a.headlines[0].get(a.evaluate(a.extremes.best()), null)!).toBeGreaterThan(a.headlines[0].get(a.evaluate(a.extremes.worst()), null)!);
  });

  it('every band is reached by the random draws or by the two extremes', () => {
    const seen = new Set(results.map(({ res }) => a.band!.get(res)));
    seen.add(a.band!.get(a.evaluate(a.extremes.best()))); seen.add(a.band!.get(a.evaluate(a.extremes.worst())));
    for (const b of a.band!.all) expect(seen.has(b), b).toBe(true);
  });

  it('leaving answers blank never flatters the control maturity', () => {
    const r = rng(77); let sum = 0, n = 0;
    for (const { i, res } of results.slice(0, 120)) {
      let thin = i;
      for (const qid of Object.keys(i.answers)) if (r() < 0.3) thin = a.withoutAnswer(thin, qid);
      const x0 = a.headlines[0].get(res, i), x1 = a.headlines[0].get(a.evaluate(thin), thin);
      if (typeof x0 === 'number' && typeof x1 === 'number') { sum += x1 - x0; n++; }
    }
    expect(sum / n).toBeLessThanOrEqual(0);
  });

  it('questions with no effect on any headline may only shrink', () => {
    const base = results.slice(0, 30).map(x => x.i);
    const touched = new Set<string>();
    for (const b of base) {
      const r0 = a.evaluate(b);
      for (const q of a.questions) {
        for (const v of [...a.variants(q.id), undefined]) {
          const inp = v === undefined ? a.withoutAnswer(b, q.id) : a.withAnswer(b, q.id, v);
          const res = a.evaluate(inp);
          if (a.headlines.some(h => h.get(res, inp) !== h.get(r0, b))) touched.add(q.id);
        }
      }
    }
    const dead = a.questions.map(q => q.id).filter(id => !touched.has(id));
    for (const id of dead) expect(NO_HEADLINE_EFFECT, `${id} has no effect on any headline and is not in the known list`).toContain(id);
  }, 120_000);
});
