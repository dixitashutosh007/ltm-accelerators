/**
 * CQ12 slice 1: "Don't know" on every scored question, and a blank never flatters (scorecard areas 3 and 5).
 * Every scored question offers "Don't know" (an option on choice questions; a button the page sends as 'UNKNOWN' on stars and sliders),
 * which scores at the question's lowest level. A question the client was shown and left blank counts the same, but is not counted as answered.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const engine = require('../src/accelerators/cost-iq/canon/costiq-engine-v10.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const { questions } = adapter.questions();

const CONTEXT_METHODS = ['signal-only', 'hypothesis-signal', 'tradeoff-signal', 'constraint-signal'];
const scored = questions.filter((q: any) => !(q.signalOnly || CONTEXT_METHODS.includes(q.scoring?.method)) && engine.lowestScore(q) !== null);
const AREAS = cfg.settings.selection.defaultAreas;
const FOOTPRINT = { 'CORE-01': ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL', 'AI', 'VMWARE', 'COLO', 'END_USER', 'NETWORK', 'DATA'], 'CORE-16': 'TRUE' };
const probes = (q: any) => (q.options || []).length ? q.options.map((o: any) => o.id) : [1, 2, 3, 4, 5, 0, 25, 50, 75, 100];

describe('Cost IQ: Don’t know, and blanks', () => {
  it('every scored question offers Don’t know', () => {
    const missing = scored.filter((q: any) => (q.options || []).length && !q.options.some((o: any) => /^(UNKNOWN|UNCLEAR|UNRELIABLE|UNRECONCILED)$/.test(o.id)));
    expect(missing.map((q: any) => q.id)).toEqual([]);
    expect(scored.length).toBeGreaterThan(60);
  });

  it('Don’t know scores at the question’s lowest level, for every interaction', () => {
    for (const q of scored) {
      const all = probes(q).map((v: any) => engine.scoreQuestion(q, v, {})).filter((s: any) => s !== null);
      const lowest = Math.min(...all);
      expect(engine.scoreQuestion(q, 'UNKNOWN', {}), q.id).toBe(engine.lowestScore(q));
      expect(engine.lowestScore(q), q.id).toBeLessThanOrEqual(lowest);
    }
  });

  it('a shown question left blank scores like Don’t know and is not counted as answered', () => {
    const shown: Set<string> = engine.shownQuestionIds(cfg, AREAS, FOOTPRINT);
    const q = scored.find((x: any) => shown.has(x.id) && x.id.startsWith('ADP-'));
    const others = Object.fromEntries(scored.filter((x: any) => shown.has(x.id) && x.id !== q.id).map((x: any) => [x.id, probes(x)[0]]));
    const blank = adapter.evaluateCostIq({ answers: { ...FOOTPRINT, ...others }, scope: { selectedAreas: AREAS } });
    const unknown = adapter.evaluateCostIq({ answers: { ...FOOTPRINT, ...others, [q.id]: 'UNKNOWN' }, scope: { selectedAreas: AREAS } });
    expect(blank.headlines).toEqual(unknown.headlines);
    const d = q.scoring.dimensionIds[0];
    const bd = blank.dimensions.find((x: any) => x.id === d), ud = unknown.dimensions.find((x: any) => x.id === d);
    expect(bd.score).toBe(ud.score);
    expect(bd.answered).toBe(ud.answered - 1);
    expect(bd.unanswered).toBe(1);
  });

  it('no blank flatters: removing any shown answer never raises a headline (every question, best answers)', () => {
    const shown: Set<string> = engine.shownQuestionIds(cfg, AREAS, FOOTPRINT);
    const best = Object.fromEntries(scored.filter((x: any) => shown.has(x.id)).map((x: any) => {
      const vs = probes(x).map((v: any) => [v, engine.scoreQuestion(x, v, {})]).filter(([, s]: any) => s !== null);
      return [x.id, vs.reduce((a: any, b: any) => (b[1] > a[1] ? b : a))[0]];
    }));
    for (const profile of [best, Object.fromEntries(Object.keys(best).map(k => [k, 'UNKNOWN']))]) {
      const base = adapter.evaluateCostIq({ answers: { ...FOOTPRINT, ...profile }, scope: { selectedAreas: AREAS } }).headlines;
      for (const id of Object.keys(profile)) {
        const { [id]: _, ...rest } = profile;
        const h = adapter.evaluateCostIq({ answers: { ...FOOTPRINT, ...rest }, scope: { selectedAreas: AREAS } }).headlines;
        expect(h.costIQ ?? 0, id).toBeLessThanOrEqual(base.costIQ ?? 0);
        expect(h.valueIQ ?? 0, id).toBeLessThanOrEqual(base.valueIQ ?? 0);
      }
    }
  });

  it('without focus areas the engine cannot tell what was asked, and skips blanks as before', () => {
    const r = adapter.evaluateCostIq({ answers: { 'CORE-12': 'A' } });
    const d = r.dimensions.find((x: any) => x.id === 'COST-01');
    expect(d.answered).toBe(1);
    expect(d.unanswered).toBe(0);
    expect(d.score).toBe(100);
  });
});
