/**
 * Phase 3 scoring audit: one adapter per engine.
 * Each adapter knows how to generate a valid random questionnaire, how to vary one question across all of its
 * possible answers, and which headline numbers and bands a CIO actually sees.
 */
import { evaluateFinOpsValueCase } from '../src/accelerators/finops-value-case/evaluate';
import fvcKb from '../src/accelerators/finops-value-case/knowledge-base.json' with { type: 'json' };
import { evaluateStrategyIq } from '../src/accelerators/strategy-iq/evaluate';
import strategyKb from '../src/accelerators/strategy-iq/knowledge-base.json' with { type: 'json' };
import { evaluateCloudIq } from '../src/accelerators/cloud-iq/evaluate';
import cloudKb from '../src/accelerators/cloud-iq/knowledge-base.json' with { type: 'json' };
import { evaluateFinOpsIq } from '../src/accelerators/finops-iq/evaluate';
import finopsIqKb from '../src/accelerators/finops-iq/knowledge-base.json' with { type: 'json' };
import { evaluatePostureIq } from '../src/accelerators/posture-iq/evaluate';
import postureKb from '../src/accelerators/posture-iq/knowledge-base.json' with { type: 'json' };
import { evaluateSovereignIq } from '../src/accelerators/sovereign-iq/evaluate';
import sovereignKb from '../src/accelerators/sovereign-iq/knowledge-base.json' with { type: 'json' };

export type Rng = () => number;
export function rng(seed: number): Rng {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const pick = <T>(r: Rng, a: T[]) => a[Math.floor(r() * a.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export interface Headline {
  /** Shown to the client; the audit checks it against `scale`. */
  name: string;
  scale: [number, number];
  /** Higher = better posture/maturity (used for the missing-data bias check). Null for money or exposure. */
  higherIsBetter: boolean | null;
  get: (result: any, input: any) => number | null;
}

export interface Adapter {
  id: string;
  name: string;
  questions: Array<{ id: string; label: string }>;
  random: (r: Rng) => any;
  /** Every distinct answer this question can take (a manageable set for multi-selects). */
  variants: (qid: string) => unknown[];
  withAnswer: (input: any, qid: string, value: unknown) => any;
  withoutAnswer: (input: any, qid: string) => any;
  evaluate: (input: any) => any;
  headlines: Headline[];
  /** Band label shown with the main score, and every band the engine can produce. */
  band?: { get: (result: any) => string; all: string[] };
  /** The best and worst answers a client could give, to test band reachability. */
  extremes: { best: () => any; worst: () => any };
}

const setAnswer = (input: any, qid: string, value: unknown) => ({ ...input, answers: { ...input.answers, [qid]: value } });
const dropAnswer = (input: any, qid: string) => { const a = { ...input.answers }; delete a[qid]; return { ...input, answers: a }; };
const subsets = (n: number) => [[], ...range(n).map(i => [i]), range(n)];

/* ---------------------------- FinOps Value Case ---------------------------- */
const FVC: any = fvcKb;
function fvcVariants(q: any): unknown[] {
  const n = (q.options || []).length;
  switch (q.answer_type) {
    case 'single_select': case 'card_select': return [...range(n), '__DK__'];
    case 'multi_select': case 'multi_select_logo': return subsets(n);
    case 'boolean_dk': return ['yes', 'no', 'dk'];
    case 'rating_1_5': return [1, 2, 3, 4, 5];
    case 'slider_percent': case 'slider_signed': case 'slider_currency': {
      const { min, max } = q.slider; return [min, Math.round((min + max) / 2), max, '__DK__'];
    }
    case 'allocation_100': return [{ engineering: 100, finance: 0, central_it: 0, nobody: 0 }, { engineering: 0, finance: 0, central_it: 0, nobody: 100 }, { engineering: 25, finance: 25, central_it: 25, nobody: 25 }];
    case 'drag_order': return [q.options.slice(), q.options.slice().reverse()];
    case 'open_text': return ['', 'Notes'];
    default: return [];
  }
}
const fvcBest = (worst: boolean) => {
  const answers: Record<string, unknown> = {};
  for (const q of FVC.questions) {
    if (q.answer_type !== 'single_select' && q.answer_type !== 'card_select') continue;
    const scored = (q.options || []).map((o: any, i: number) => ({ i, s: o.score })).filter((x: any) => typeof x.s === 'number');
    if (scored.length) answers[q.id] = scored.reduce((m: any, x: any) => ((worst ? x.s < m.s : x.s > m.s) ? x : m)).i;
  }
  return { answers: { ...answers, E3: 5_000_000 }, org: { sector_class: 'other', currency: 'usd' } };
};

/* ------------------------------- Strategy IQ ------------------------------- */
const STR: any = strategyKb;
function strVariants(q: any): unknown[] {
  switch (q.type) {
    case 'single_select': return range(q.opts.length);
    case 'multi_select': return subsets(q.opts.length);
    case 'slider': { const { min, max } = q.sliderConfig; return [min, (min + max) / 2, max]; }
    case 'rating_matrix': return [1, 3, 5].map(v => Object.fromEntries(q.subItems.map((s: any) => [s.id, v])));
    case 'drag_rank': return [q.rankItems.map((x: any) => x.id), q.rankItems.map((x: any) => x.id).reverse()];
    default: return [];
  }
}
const strExtreme = (best: boolean) => ({
  answers: Object.fromEntries(STR.questions.map((q: any) => {
    switch (q.type) {
      case 'single_select': return [q.id, best ? q.opts.length - 1 : 0];
      case 'multi_select': return [q.id, best ? range(q.opts.length) : []];
      case 'slider': return [q.id, best ? q.sliderConfig.max : q.sliderConfig.min];
      case 'rating_matrix': return [q.id, Object.fromEntries(q.subItems.map((s: any) => [s.id, best ? 5 : 1]))];
      default: return [q.id, q.rankItems.map((x: any) => x.id)];
    }
  })),
  intake: { itSpend: 100_000_000 }
});

/* -------------------------------- Cloud IQ --------------------------------- */
const CLD: any = cloudKb;
function cldVariants(q: any): unknown[] {
  const n = (q.opts || []).length;
  switch (q.type) {
    case 'single': return range(n);
    case 'multi': return subsets(n).map(s => (q.max ? s.slice(0, q.max) : s));
    case 'cards': return q.multi ? [[], [0], [n - 1], range(Math.min(n, q.max ?? n))] : range(n);
    case 'slider': return range(q.scale.length);
    case 'rank': return [q.opts.slice(), q.opts.slice().reverse()];
    case 'tf': return [true, false];
    default: return [];
  }
}
const cldExtreme = (best: boolean) => ({
  answers: Object.fromEntries(CLD.questions.filter((q: any) => q.maturity || q.maturityCount || q.maturityTF).map((q: any) => {
    const n = (q.opts || q.scale || []).length;
    if (q.maturityTF) return [q.id, best];
    if (q.maturityCount) return [q.id, best ? range(n).slice(0, q.max ?? n) : []];
    return [q.id, best ? n - 1 : 0];
  })),
  session: { mode: 'workshop' }
});

/* -------------------------------- FinOps IQ -------------------------------- */
const FIQ: any = finopsIqKb;
const fiqExtreme = (best: boolean) => ({
  answers: Object.fromEntries(FIQ.questions.map((q: any) => {
    const idx = q.options.reduce((m: number, o: any, i: number, a: any[]) => ((best ? o.score > a[m].score : o.score < a[m].score) ? i : m), 0);
    return [q.id, idx];
  })),
  annualSpend: 10_000_000
});

/* ------------------------------- Posture IQ -------------------------------- */
const PST: any = postureKb;
function pstVariants(q: any): unknown[] {
  if (q.type === 'single' || q.type === 'boolean') return q.options.map((o: any) => o.value);
  if (q.type === 'multi') return [[], ...q.options.map((o: any) => [o.value]), q.options.map((o: any) => o.value)];
  if (q.type === 'scale') return q.scale.map((s: any) => s.v);
  if (q.type === 'matrix') return q.cols.map((c: any) => Object.fromEntries(q.rows.map((r: any) => [r.id, c.id])));
  return [];
}
const sevRank: Record<string, number> = { positive: 5, low: 4, medium: 3, high: 2, critical: 1 };
const pstExtreme = (best: boolean) => ({
  answers: Object.fromEntries(PST.questions.map((q: any) => {
    const by = (arr: any[], key: (x: any) => number) => arr.reduce((m, x) => ((best ? key(x) > key(m) : key(x) < key(m)) ? x : m));
    if (q.type === 'single' || q.type === 'boolean') return [q.id, by(q.options, (o: any) => sevRank[o.sev] ?? 3).value];
    if (q.type === 'scale') return [q.id, by(q.scale, (s: any) => sevRank[s.sev] ?? 3).v];
    if (q.type === 'multi') return [q.id, best ? q.options.filter((o: any) => !(o.findings || []).length).map((o: any) => o.value) : q.options.map((o: any) => o.value)];
    if (q.type === 'matrix') { const col = by(q.cols, (c: any) => sevRank[c.sev] ?? 3).id; return [q.id, Object.fromEntries(q.rows.map((r: any) => [r.id, col]))]; }
    return [q.id, undefined];
  })),
  org: { turnover: 1e9 }, regulations: ['gdpr', 'nis2', 'dora', 'aiact']
});

/* ------------------------------ Sovereign IQ ------------------------------- */
const SOV: any = sovereignKb;
function sovVariants(q: any): unknown[] {
  if (q.type === 'single') return range(q.opts.length);
  if (q.type === 'multi') return subsets(q.opts.length);
  if (q.type === 'slider') return [q.min, Math.round((q.min + q.max) / 2), q.max];
  return [];
}
const sovExtreme = (best: boolean) => ({
  answers: Object.fromEntries(SOV.questions.filter((q: any) => q.type === 'single').map((q: any) => {
    const scored = q.opts.map((o: any, i: number) => ({ i, s: typeof o.score === 'number' ? o.score : null })).filter((x: any) => x.s !== null);
    if (!scored.length) return [q.id, 0];
    return [q.id, scored.reduce((m: any, x: any) => ((best ? x.s > m.s : x.s < m.s) ? x : m)).i];
  }))
});

export const ADAPTERS: Adapter[] = [
  {
    id: 'finops-value-case', name: 'FinOps Value Case',
    questions: FVC.questions.map((q: any) => ({ id: q.id, label: q.text })),
    random: r => {
      const answers: Record<string, unknown> = {};
      for (const q of FVC.questions) if (r() < 0.85) { const v = fvcVariants(q); if (v.length) answers[q.id] = pick(r, v); }
      return { answers, org: { sector_class: r() < 0.5 ? 'bfsi' : 'other', currency: 'usd' } };
    },
    variants: id => fvcVariants(FVC.questions.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateFinOpsValueCase(i.answers, i.org),
    headlines: [
      { name: 'Need index', scale: [0, 100], higherIsBetter: false, get: r => r.needIndex },
      { name: 'Gap index', scale: [0, 100], higherIsBetter: false, get: r => r.gapIndex },
      { name: 'Urgency index', scale: [0, 100], higherIsBetter: false, get: r => r.urgencyIndex },
      { name: 'Waste band high (% of spend)', scale: [0, 100], higherIsBetter: false, get: r => r.wasteBand.high * 100 },
      { name: 'Year-1 exposure high ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.exposure.y1?.[1] ?? null }
    ],
    band: { get: r => r.verdict?.label ?? r.verdict?.title ?? '(none)', all: FVC.meta.verdict_bands.map((v: any) => v.label ?? v.title) },
    extremes: { best: () => fvcBest(false), worst: () => fvcBest(true) }
  },
  {
    id: 'strategy-iq', name: 'Strategy IQ',
    questions: STR.questions.map((q: any) => ({ id: q.id, label: q.q })),
    random: r => ({ answers: Object.fromEntries(STR.questions.filter(() => r() < 0.85).map((q: any) => [q.id, pick(r, strVariants(q))])), intake: { itSpend: 100_000_000 } }),
    variants: id => strVariants(STR.questions.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateStrategyIq(i),
    headlines: [
      { name: 'Overall maturity (1-5)', scale: [1, 5], higherIsBetter: true, get: r => r.overall },
      { name: 'Alignment index (%)', scale: [0, 100], higherIsBetter: true, get: r => r.alignmentIndex },
      { name: 'Tech-debt drag (% of IT spend)', scale: [0, 100], higherIsBetter: false, get: r => r.debtDragPct },
      { name: 'Operating model maturity (1-5)', scale: [1, 5], higherIsBetter: true, get: r => r.deliveryMaturity },
      { name: 'Resilience (%)', scale: [0, 100], higherIsBetter: true, get: r => r.resilienceScore }
    ],
    band: { get: r => r.band, all: ['Nascent (At Severe Risk)', 'Emerging (Friction & Drift)', 'Established (Operational)', 'Advanced (Product-Led)', 'Leading (Industry Benchmark)'] },
    extremes: { best: () => strExtreme(true), worst: () => strExtreme(false) }
  },
  {
    id: 'cloud-iq', name: 'Cloud IQ',
    questions: CLD.questions.map((q: any) => ({ id: q.id, label: q.q })),
    random: r => ({ answers: Object.fromEntries(CLD.questions.filter(() => r() < 0.85).map((q: any) => [q.id, pick(r, cldVariants(q))])), session: { mode: 'workshop' } }),
    variants: id => cldVariants(CLD.questions.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateCloudIq(i),
    headlines: [
      { name: 'Overall maturity (1-5)', scale: [1, 5], higherIsBetter: true, get: r => r.overall },
      { name: 'Annual cost leakage ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.totalLeakage },
      { name: 'Peer delta', scale: [-4, 4], higherIsBetter: true, get: r => r.peerDelta }
    ],
    band: { get: r => r.band, all: ['Nascent', 'Emerging', 'Established', 'Advanced', 'Leading'] },
    extremes: { best: () => cldExtreme(true), worst: () => cldExtreme(false) }
  },
  {
    id: 'finops-iq', name: 'FinOps IQ',
    questions: FIQ.questions.map((q: any) => ({ id: q.id, label: q.text })),
    random: r => ({ answers: Object.fromEntries(FIQ.questions.filter(() => r() < 0.9).map((q: any) => [q.id, r() < 0.05 ? '__NA__' : Math.floor(r() * q.options.length)])), annualSpend: 10_000_000 }),
    variants: id => { const q = FIQ.questions.find((x: any) => x.id === id); return [...range(q.options.length), '__NA__']; },
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateFinOpsIq(i),
    headlines: [
      { name: 'Maturity stage (-1..4)', scale: [-1, 4], higherIsBetter: true, get: r => r.maturity },
      { name: 'Overall score (0-100)', scale: [0, 100], higherIsBetter: true, get: r => r.overallScore },
      { name: 'Value at stake high ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.valueAtStake.maxSavings }
    ],
    band: { get: r => (r.maturity >= 0 ? FIQ.meta.stages[r.maturity].name : 'Below Stage 1'), all: ['Below Stage 1', ...FIQ.meta.stages.map((s: any) => s.name)] },
    extremes: { best: () => fiqExtreme(true), worst: () => fiqExtreme(false) }
  },
  {
    id: 'posture-iq', name: 'Posture IQ',
    questions: PST.questions.map((q: any) => ({ id: q.id, label: q.text })),
    random: r => ({
      answers: Object.fromEntries(PST.questions.filter(() => r() < 0.85).map((q: any) => [q.id, pick(r, pstVariants(q))])),
      org: { turnover: 1e9 }, regulations: ['gdpr', 'nis2', 'dora', 'aiact']
    }),
    variants: id => pstVariants(PST.questions.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluatePostureIq(i),
    headlines: [
      { name: 'Posture score (0-100)', scale: [0, 100], higherIsBetter: true, get: r => r.overallScore },
      { name: 'Critical + high findings', scale: [0, Infinity], higherIsBetter: false, get: r => r.counts.critical + r.counts.high },
      { name: 'Largest statutory ceiling ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.penalties.totalValueAtStake }
    ],
    band: { get: r => r.label.t, all: ['Defensible', 'Improving / Managed', 'Material Exposure', 'Critical Non-Compliance'] },
    extremes: { best: () => pstExtreme(true), worst: () => pstExtreme(false) }
  },
  {
    id: 'sovereign-iq', name: 'Sovereign IQ',
    questions: SOV.questions.map((q: any) => ({ id: q.id, label: q.q })),
    random: r => ({ answers: Object.fromEntries(SOV.questions.filter(() => r() < 0.9).map((q: any) => [q.id, pick(r, sovVariants(q))])) }),
    variants: id => sovVariants(SOV.questions.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateSovereignIq(i),
    headlines: [
      { name: 'Sovereignty maturity (0-100)', scale: [0, 100], higherIsBetter: true, get: r => r.maturity.score },
      { name: 'Regimes in scope (applies)', scale: [0, Infinity], higherIsBetter: null, get: r => r.inScopeRegimes.filter((x: any) => x.grade === 'applies').length },
      { name: 'Statutory ceiling ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.fin.statutoryCeiling }
    ],
    band: { get: r => r.maturity.stage?.label ?? '(none)', all: SOV.maturityStages.map((s: any) => s.label) },
    extremes: { best: () => sovExtreme(true), worst: () => sovExtreme(false) }
  }
];
