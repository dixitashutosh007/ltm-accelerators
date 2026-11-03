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
// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one. 
// Still to score or label in CQ3b (BOUNDARY.md task 6). Remove an ID when it is fixed; never add one. All six wait for an owner
// decision (scoring-batch-3.md): ADP-47 (option order), ADP-51 and 52 (a gate on the new countries question), ADP-55, 57 and 58
// (comparison with CORE-09 and CORE-45, option labels, drop).
const INERT: string[] = [];

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
    expect(inert.length).toBeLessThanOrEqual(0);
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

  it('applies the owner decisions of 4 Nov 2026: ADP-15 dropped, ADP-18 rewritten and scored, AI in the footprint, ADP-28 asked of everyone', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(q('ADP-15')).toBeUndefined();
    expect(q('ADP-18').options.map((o: any) => o.id)).toEqual(['ECONOMICS_LED', 'POLICY_LED', 'CAPACITY_LED', 'LOCKED_IN', 'UNMEASURED']);
    expect(engine.scoreQuestion(q('ADP-18'), 'ECONOMICS_LED', {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-18'), 'UNMEASURED', {}));
    expect(q('CORE-01').options.map((o: any) => o.id)).toContain('AI');
    expect(q('ADP-28').applicableWhen).toBeUndefined();
  });

  it('can raise F-019 (AI investment economics) only when AI is in the footprint', () => {
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'CORE-01': ['AI'], 'ADP-31': 'NONE' })).toContain('F-019');
    expect(ids({ 'CORE-01': ['AI'], 'ADP-32': 'EXPERIMENTAL' })).toContain('F-019');
    expect(ids({ 'CORE-01': ['PUBLIC_CLOUD'], 'ADP-31': 'NONE' })).not.toContain('F-019');
    expect(ids({ 'ADP-31': 'NONE' })).not.toContain('F-019');
  });

  it('raises F-017 when more than 30 percent of SaaS spend sits outside central governance (an LTM heuristic threshold)', () => {
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'ADP-08': 31 })).toContain('F-017');
    expect(ids({ 'ADP-08': 30 })).not.toContain('F-017');
  });

  it('applies batch 3: sliders score inverted, the rest by option order, and the remaining questions are context', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(engine.scoreQuestion(q('ADP-46'), 5, {})).toBeGreaterThan(engine.scoreQuestion(q('ADP-46'), 80, {}));
    for (const id of ['ADP-53', 'ADP-56']) expect(isContext(q(id)), id).toBe(true);
    for (const id of ['ADP-44', 'ADP-45', 'ADP-48', 'ADP-54', 'ADP-59', 'ADP-60']) {
      const ids = q(id).options.map((o: any) => o.id);
      expect(engine.scoreQuestion(q(id), ids[0], {}), id).toBeGreaterThan(engine.scoreQuestion(q(id), ids[ids.length - 1], {}));
    }
  });

  it('applies the owner decisions on batch 3 (4 Nov 2026): every question scores, is context, or triggers a finding', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(q('ADP-58')).toBeUndefined();
    expect(engine.scoreQuestion(q('ADP-47'), 'LATE', {})).toBe(engine.scoreQuestion(q('ADP-47'), 'RENEWAL', {}));
    expect(q('ADP-57').options.map((o: any) => o.label)).toContain('Data and AI');
    expect(q('CORE-02').options.map((o: any) => o.id)).toEqual(expect.arrayContaining(['EDUCATION', 'MEDIA_ENTERTAINMENT', 'NATURAL_RESOURCES']));
    for (const id of ['ADP-55', 'ADP-57']) expect(isContext(q(id)), id).toBe(true);
  });

  it('adds the five global-coverage context questions, none of which can score', () => {
    for (const id of ['CTX-01', 'CTX-02', 'CTX-03', 'CTX-04', 'CTX-05']) {
      const x = questions.find((q: any) => q.id === id);
      expect(x, id).toBeDefined();
      expect(isContext(x), id).toBe(true);
      expect(x.scoring.dimensionIds, id).toBeUndefined();
    }
    const a = adapter.evaluateCostIq({ answers: { 'CTX-01': 'EUR', 'CTX-02': 'GT50', 'CTX-03': ['EU', 'INDIA'], 'CTX-04': 'LT30', 'CTX-05': 'GT20' } });
    const b = adapter.evaluateCostIq({ answers: {} });
    expect(a.headlines).toEqual(b.headlines);
    expect(a.dimensions.map((d: any) => d.score)).toEqual(b.dimensions.map((d: any) => d.score));
  });

  it('shows the Geography questions only to a multi-country client, and M&A follow-ups only after a transaction', () => {
    const q = (id: string) => questions.find((x: any) => x.id === id);
    expect(q('ADP-51').applicableWhen).toEqual({ questionId: 'CTX-05', anyOf: ['2_5', '6_20', 'GT20'] });
    const score = (answers: object, dim: string) => adapter.evaluateCostIq({ answers }).dimensions.find((d: any) => d.id === dim).score;
    expect(score({ 'CTX-05': 'ONE', 'ADP-51': 'LOW' }, 'COST-01')).toBeNull();
    // A client with no transaction: the slider cannot lift COST-10 and F-020 stays quiet.
    const ids = (answers: object) => adapter.evaluateCostIq({ answers }).findings.map((f: any) => f.id);
    expect(ids({ 'ADP-49': 'NOT_APPLICABLE', 'ADP-50': 40 })).not.toContain('F-020');
    expect(ids({ 'ADP-49': 'NONE' })).toContain('F-020');
    expect(engine.scoreQuestion(q('ADP-49'), 'NOT_APPLICABLE', {})).toBeNull();
  });

  it('labels the size classes in the reporting currency from the ECB table, keeps the option IDs, and falls back to US dollars', () => {
    const q3 = questions.find((x: any) => x.id === 'CORE-03');
    const q4 = questions.find((x: any) => x.id === 'CORE-04');
    expect(q3.options.map((o: any) => o.id)).toEqual(['LT100M', '100M_500M', '500M_1B', '1B_5B', '5B_25B', 'GT25B', 'UNKNOWN']);
    expect(q3.labelCurrencyQuestion).toBe('CTX-01');
    expect(Object.keys(q3.labelsByCurrency).sort()).toEqual(['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'INR', 'JPY', 'SGD', 'ZAR']);
    expect(q3.labelsByCurrency.EUR.LT100M).toBe('Below EUR 89M');
    expect(q4.labelsByCurrency.GBP['5M_25M']).toBe('GBP 3.7M to 19M');
    for (const cur of Object.keys(q3.labelsByCurrency)) {
      expect(Object.keys(q3.labelsByCurrency[cur].CORE_03 ?? q3.labelsByCurrency[cur]).length).toBe(6);
      expect(Object.keys(q4.labelsByCurrency[cur]).length).toBe(7);
    }
    const s = (adapter.questions() as any).questions;
    expect(s.find((x: any) => x.id === 'CORE-03').labelsRateDate).toBe('2026-11-02');
    // The rate table says where it came from and that nothing is converted at run time.
    const { currencyBands } = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json').settings;
    expect(currencyBands.rateSource).toContain('ECB euro foreign exchange reference rates');
    expect(currencyBands.usdFallback).toEqual(['USD', 'AED', 'SAR', 'OTHER']);
  });
});
