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
// Real answers only: the option IDs, and numbers for the numeric interactions. Map keys that match no option must not count as scoring.
const probes = (q: any) => [...(q.options || []).map((o: any) => o.id), ...(['stars', 'slider', 'range'].includes(q.interaction) ? [1, 2, 3, 4, 5, 25, 50, 75, 100] : [])];
const scores = (q: any) => probes(q).some(v => engine.scoreQuestion(q, v, {}) !== null);
const triggers = new Set(Object.values(calibration).flat().map((t: any) => t.questionId));

// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one.
// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one. Held back from batch 1:
// ADP-15 (drop) and ADP-18 (rewrite) until the owner approves.
// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one. ADP-15 (drop) and ADP-18
// (rewrite) wait for the owner; ADP-44 to ADP-48 and ADP-51 to ADP-60 are in later batches.
const INERT = [
  'ADP-15', 'ADP-18', 'ADP-44', 'ADP-45', 'ADP-46', 'ADP-47', 'ADP-48', 'ADP-51', 'ADP-52',
  'ADP-53', 'ADP-54', 'ADP-55', 'ADP-56', 'ADP-57', 'ADP-58', 'ADP-59', 'ADP-60'
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
    expect(ids({ 'CORE-01': ['PUBLIC_CLOUD'], 'ADP-42': 'NONE' })).toContain('F-005');
    expect(ids({ 'CORE-01': ['PUBLIC_CLOUD'], 'ADP-42': 'INTELLIGENT' })).not.toContain('F-005');
    expect(ids({ 'CORE-26': 'COUNT' })).toContain('F-007');
  });

  it('has no more inert questions than the list, and the list only shrinks', () => {
    const inert = questions.filter((q: any) => !isContext(q) && !scores(q) && !triggers.has(q.id)).map((q: any) => q.id);
    const extra = inert.filter((id: string) => !INERT.includes(id));
    expect(extra, 'new inert questions').toEqual([]);
    expect(inert.length).toBeLessThanOrEqual(17);
  });

  it('returns no FinOps overlay fields', () => {
    const r = adapter.evaluateCostIq({ answers: {} });
    expect(r.finops).toBeUndefined();
    expect(r.adaptiveStopping).toBeUndefined();
    expect(r.methodology.overlay).toBeUndefined();
  });

  it('keeps every score map in the order of the options, with Unknown at the lowest level and every key a real option', () => {
    const problems: string[] = [];
    for (const q of questions) {
      const m: Record<string, number> | undefined = q.scoring?.defaultMap;
      if (!m || !(q.options || []).length) continue;
      const ids = q.options.map((o: any) => o.id);
      for (const k of Object.keys(m)) if (!ids.includes(k)) problems.push(`${q.id}: ${k} is not an option`);
      // "MIXED" (an approach that mixes models) sits in the middle by design, outside the better-to-worse order.
      const ordered = ids.filter((i: string) => i in m && i !== 'MIXED');
      for (let i = 1; i < ordered.length; i++) if (m[ordered[i]] > m[ordered[i - 1]]) { problems.push(`${q.id}: ${ordered[i]} scores above ${ordered[i - 1]}`); break; }
      const unknown = ids.find((i: string) => /^(UNKNOWN|UNCLEAR|UNRELIABLE|UNRECONCILED)$/.test(i));
      if (unknown && unknown in m && m[unknown] > Math.min(...Object.values(m))) problems.push(`${q.id}: Unknown is rated above the lowest level`);
    }
    expect(problems).toEqual([]);
  });

  it('applies batch 1: the SaaS maps score, the footprint and priority questions are context, a slider scores inverted', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(engine.scoreQuestion(q('ADP-06'), 'NONE', {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-06'), 'GT10', {}));
    expect(engine.scoreQuestion(q('ADP-06'), 'UNKNOWN', {})).toBe(engine.scoreQuestion(q('ADP-06'), 'GT10', {}));
    expect(engine.scoreQuestion(q('ADP-08'), 5, {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-08'), 60, {}));
    for (const id of ['CORE-01', 'CORE-05', 'CORE-07', 'CORE-09', 'ADP-10', 'ADP-12', 'ADP-17', 'ADP-19', 'ADP-20']) expect(isContext(q(id)), id).toBe(true);
    // Context never carries a dimension that could be scored from it.
    for (const id of ['CORE-01', 'ADP-20']) expect(q(id).scoring.dimensionIds).toBeUndefined();
  });

  it('merges CORE-23 into CORE-01, which now names virtualization and colocation', () => {
    expect(questions.find((q: any) => q.id === 'CORE-23')).toBeUndefined();
    const ids = questions.find((q: any) => q.id === 'CORE-01').options.map((o: any) => o.id);
    for (const id of ['VMWARE', 'COLO', 'EXTERNAL', 'ON_PREM', 'PUBLIC_CLOUD']) expect(ids).toContain(id);
  });

  it('asks, scores and counts an estate question only when the footprint names that estate', () => {
    const run = (answers: object) => adapter.evaluateCostIq({ answers });
    const cost05 = (r: any) => r.dimensions.find((d: any) => d.id === 'COST-05').score;
    // Colocation: scored when the footprint includes it, not scored when it does not or is unanswered.
    expect(cost05(run({ 'CORE-01': ['COLO'], 'ADP-13': 'CONTINUOUS' }))).toBe(100);
    expect(cost05(run({ 'CORE-01': ['PUBLIC_CLOUD'], 'ADP-13': 'UNCLEAR' }))).toBeNull();
    expect(cost05(run({ 'ADP-13': 'UNCLEAR' }))).toBeNull();
    // Their answers do not count towards completeness when hidden.
    const gated = ['ADP-09', 'ADP-11', 'ADP-13', 'ADP-14'].map(id => questions.find((q: any) => q.id === id));
    for (const q of gated) expect(q.applicableWhen.questionId).toBe('CORE-01');
  });

  it('raises the cloud findings only when public cloud is in the footprint', () => {
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'ADP-42': 'NONE' })).not.toContain('F-005');
    expect(ids({ 'CORE-01': ['ON_PREM'], 'ADP-42': 'NONE' })).not.toContain('F-005');
    expect(ids({ 'CORE-01': ['PUBLIC_CLOUD'], 'ADP-42': 'NONE' })).toContain('F-005');
  });

  it('applies batch 2: sliders score inverted, the stars map is keyed 1 to 5, estate questions are gated by the footprint', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(engine.scoreQuestion(q('ADP-22'), 10, {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-22'), 80, {}));
    expect(engine.scoreQuestion(q('ADP-26'), 5, {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-26'), 1, {}));
    for (const id of ['ADP-35', 'ADP-36']) expect(q(id).applicableWhen).toEqual({ questionId: 'CORE-01', anyOf: ['EXTERNAL'] });
    for (const id of ['ADP-21', 'ADP-24', 'ADP-28', 'ADP-40']) expect(isContext(q(id)), id).toBe(true);
  });

  it('can raise F-017 (business-led spend not governed) from ADP-33 and ADP-34, only when business-led spend is reported', () => {
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'CORE-16': 'TRUE', 'ADP-33': 'NONE' })).toContain('F-017');
    expect(ids({ 'CORE-16': 'UNSURE', 'ADP-34': 'NONE' })).toContain('F-017');
    expect(ids({ 'CORE-16': 'FALSE', 'ADP-33': 'NONE' })).not.toContain('F-017');
    expect(ids({ 'ADP-33': 'NONE' })).not.toContain('F-017');
    expect(ids({ 'CORE-16': 'TRUE', 'ADP-33': 'INFLUENCE' })).not.toContain('F-017');
  });
});
