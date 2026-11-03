/**
 * Cost IQ question bank after the FinOps boundary (CQ3a, CQ3b slice 1). The gate for CQ3b is that every shown question scores
 * or is labelled context; today 55 do neither. The list below may only shrink: a new inert question fails the test.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const engine = require('../src/accelerators/cost-iq/canon/costiq-engine-v10.cjs');
const calibration = require('../src/accelerators/cost-iq/canon/config/finding-activation-calibration-v7.1.1.json').findingActivation;
const { questions, dimensions } = adapter.questions();

const CONTEXT_METHODS = ['signal-only', 'hypothesis-signal', 'tradeoff-signal', 'constraint-signal'];
const isContext = (q: any) => q.signalOnly || q.scoring?.signalOnly || CONTEXT_METHODS.includes(q.scoring?.method);
const probes = (q: any) => [...(q.options || []).map((o: any) => o.id), 0, 1, 2, 3, 4, 5, 25, 50, 75, 100, ...Object.keys(q.scoring?.defaultMap || {})];
const scores = (q: any) => probes(q).some(v => engine.scoreQuestion(q, v, {}) !== null);
const triggers = new Set(Object.values(calibration).flat().map((t: any) => t.questionId));

// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one.
const INERT = [
  'CORE-01', 'CORE-05', 'CORE-07', 'CORE-09', 'ADP-06', 'ADP-07', 'ADP-08', 'ADP-09',
  'ADP-10', 'ADP-11', 'ADP-12', 'ADP-13', 'ADP-14', 'ADP-15', 'ADP-16', 'ADP-17',
  'ADP-18', 'ADP-19', 'ADP-20', 'ADP-21', 'ADP-22', 'ADP-23', 'ADP-24', 'ADP-25',
  'ADP-26', 'ADP-27', 'ADP-28', 'ADP-29', 'ADP-30', 'ADP-31', 'ADP-32', 'ADP-33',
  'ADP-34', 'ADP-35', 'ADP-36', 'ADP-37', 'ADP-38', 'ADP-39', 'ADP-40', 'ADP-41',
  'ADP-44', 'ADP-45', 'ADP-46', 'ADP-47', 'ADP-48', 'ADP-51', 'ADP-52', 'ADP-53',
  'ADP-54', 'ADP-55', 'ADP-56', 'ADP-57', 'ADP-58', 'ADP-59', 'ADP-60'
];

describe('Cost IQ question bank', () => {
  it('has one count: the API, the metadata and the release manifest agree, and no FIN question remains', () => {
    expect(questions.length).toBe(adapter.metadata().baseline.questions);
    expect(questions.length).toBe(adapter.RELEASE_MANIFEST.baseline.questions);
    expect(questions.filter((q: any) => /^FIN-/.test(q.id))).toEqual([]);
    expect(dimensions.length).toBe(16);
  });

  it('keeps cloud practice out: ADP-42 is the one cloud and FinOps summary question', () => {
    for (const id of ['ADP-01', 'ADP-02', 'ADP-03', 'ADP-04', 'ADP-05', 'ADP-43', 'CORE-24', 'CORE-25']) {
      expect(questions.find((q: any) => q.id === id), id).toBeUndefined();
    }
    const q = questions.find((q: any) => q.id === 'ADP-42');
    expect(q.options.map((o: any) => o.id)).toContain('UNKNOWN');
    expect(engine.scoreQuestion(q, 'UNKNOWN', {})).toBe(engine.scoreQuestion(q, 'NONE', {}));
    expect(engine.scoreQuestion(q, 'INTELLIGENT', {})).toBeGreaterThan(engine.scoreQuestion(q, 'MANAGED', {}));
  });

  it('scores the questions that looked scored and were not', () => {
    const q11 = questions.find((q: any) => q.id === 'CORE-11');
    const order = ['FAST', 'QUARTER', 'SLOW', 'COMMITTED', 'VERY_HARD'].map(id => engine.scoreQuestion(q11, id, {}));
    expect(order).toEqual([...order].sort((a, b) => b - a));
    expect(order[0]).toBeGreaterThan(order[4]);
    const q26 = questions.find((q: any) => q.id === 'CORE-26');
    expect(q26.interaction).toBe('single-select');
    expect(engine.scoreQuestion(q26, 'CONTINUOUS', {})).toBeGreaterThan(engine.scoreQuestion(q26, 'UNKNOWN', {}));
    expect(isContext(questions.find((q: any) => q.id === 'CORE-10'))).toBe(true);
  });

  it('keeps technical-debt scoring inverted (higher debt cost is worse), now in the master itself', () => {
    const q = questions.find((q: any) => q.id === 'CORE-40');
    expect(engine.scoreQuestion(q, 5, {})).toBeLessThan(engine.scoreQuestion(q, 1, {}));
  });

  it('can raise the findings whose triggers moved: F-005 from ADP-42 and F-007 from CORE-26', () => {
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'ADP-42': 'NONE' })).toContain('F-005');
    expect(ids({ 'ADP-42': 'INTELLIGENT' })).not.toContain('F-005');
    expect(ids({ 'CORE-26': 'COUNT' })).toContain('F-007');
  });

  it('has no more inert questions than the list, and the list only shrinks', () => {
    const inert = questions.filter((q: any) => !isContext(q) && !scores(q) && !triggers.has(q.id)).map((q: any) => q.id);
    const extra = inert.filter((id: string) => !INERT.includes(id));
    expect(extra, 'new inert questions').toEqual([]);
    expect(inert.length).toBeLessThanOrEqual(55);
  });

  it('returns no FinOps overlay fields', () => {
    const r = adapter.evaluateCostIq({ answers: {} });
    expect(r.finops).toBeUndefined();
    expect(r.adaptiveStopping).toBeUndefined();
    expect(r.methodology.overlay).toBeUndefined();
  });
});
