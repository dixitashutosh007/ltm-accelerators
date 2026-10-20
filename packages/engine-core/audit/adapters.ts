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
import { evaluateFinOpsIqV3, QUESTIONS as FIQ3_QUESTIONS, type Facts as Fiq3Facts, type Mode as Fiq3Mode } from '../src/accelerators/finops-iq/v3';
import finopsIqKb from '../src/accelerators/finops-iq/knowledge-base.json' with { type: 'json' };
import { evaluatePostureIq } from '../src/accelerators/posture-iq/evaluate';
import postureKb from '../src/accelerators/posture-iq/knowledge-base.json' with { type: 'json' };
import { evaluateSovereignIq } from '../src/accelerators/sovereign-iq/evaluate';
import sovereignKb from '../src/accelerators/sovereign-iq/knowledge-base.json' with { type: 'json' };
import { evaluateResilienceIq } from '../src/accelerators/resilience-iq/evaluate';
import { resilienceKnowledge } from '../src/accelerators/resilience-iq/knowledge';

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
  /**
   * Extra questionnaires to vary one answer from, besides the random ones. An engine that rates by the weakest answer
   * needs uniform baselines: from a random base one answer rarely moves the minimum, so it would read as dead.
   */
  sensitivityBases?: () => any[];
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
    // Urgency comes from drivers (growth, migration ahead), not maturity: the worst case has the strongest drivers.
    const drive = (q.options || []).map((o: any, i: number) => ({ i, u: (o.urgency || 0) + (o.migration_ahead || 0) * 18 }));
    if (drive.some((x: any) => x.u > 0)) answers[q.id] = drive.reduce((m: any, x: any) => ((worst ? x.u > m.u : x.u < m.u) ? x : m)).i;
  }
  for (const q of FVC.questions) if (worst && String(q.answer_type).startsWith('slider') && q.id !== 'E3') answers[q.id] = q.slider.max;
  return { answers: { ...answers, E3: 5_000_000 }, org: { sector_class: worst ? 'bfsi' : 'other', currency: 'usd' } };
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

/* ------------------------------ FinOps IQ v3 ------------------------------- */
// Facts are fixed per mode so the audit varies answers only. The workshop estate selects every scope, and leaves
// commitment coverage unknown, so every maturity question (including scope-conditional and follow-up ones) can be asked.
// Executive mode also uses a Tier 3 estate with AI in scope and fast growth (F3 review M9), so every verdict band,
// including "Act now", is reachable; random questionnaires draw from both executive estates.
// Value bases (F4) are exact and fixed too, so the value headlines vary with the answers only (OP-06 in executive mode).
const FIQ3_BASE = { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.65 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.3 } };
const FIQ3_COST = { internalRate: { exact: 12_000 } };
const FIQ3_EXEC_TIER3: Fiq3Facts = {
  org: { currency: 'USD', consumingUnits: '20+' },
  footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'ai_api', 'saas'] },
  spend: { byScope: { aws: { exact: 60_000_000 }, azure: { exact: 20_000_000 } }, growth12m: 30 },
  base: FIQ3_BASE, cost: FIQ3_COST
};
const FIQ3_FACTS: Record<Fiq3Mode, Fiq3Facts> = {
  executive: {
    org: { currency: 'USD', consumingUnits: '5-19' },
    footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] },
    spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 },
    base: FIQ3_BASE, cost: FIQ3_COST
  },
  workshop: {
    org: { currency: 'USD', consumingUnits: '20+' },
    footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'data_centre', 'kubernetes', 'ai_api', 'saas', 'licensing'] },
    spend: { byScope: { aws: { exact: 40_000_000 }, azure: { exact: 20_000_000 } }, growth12m: 10 },
    base: { ...FIQ3_BASE, nonProdScheduledShare: { exact: 0.2 }, interruptionTolerantShare: { exact: 0.2 }, spotShare: { exact: 0.05 }, kubernetesSpend: { exact: 8_000_000 }, kubernetesRequestUtilisation: { exact: 0.4 } },
    evidence: {
      providerRecommendations: [
        { type: 'rightsizing', provider: 'aws', tool: 'AWS Cost Optimization Hub', deduplicated: true, annualEstimate: 1_200_000, exportDate: '2026-09-30' },
        { type: 'idle', provider: 'aws', tool: 'AWS Cost Optimization Hub', deduplicated: true, annualEstimate: 500_000, exportDate: '2026-09-30' }
      ],
      saasLicence: { unusedAnnualCost: 900_000, source: 'SaaS management report', measuredOn: '2026-09-30' }
    },
    cost: { ...FIQ3_COST, tooling: { exact: 200_000 } }
  }
};
/** Provider-tool exports are checked for age against the assessment date (THR-FIN-11). */
const FIQ3_DATE = '2026-10-14';
const FIQ3_REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const fiq3Questions = (mode: Fiq3Mode) => FIQ3_QUESTIONS.filter((q: any) => q.modes.includes(mode) && (q.kind === 'maturity' || q.kind === 'hypothesis'));
function fiq3Variants(q: any): unknown[] {
  if (q.id === 'UN-08') return [[], FIQ3_REPORTS.slice(0, 1), FIQ3_REPORTS.slice(0, 3), FIQ3_REPORTS, 'unknown'];
  const values = (q.options || []).map((o: any) => o.value);
  switch (q.answerType) {
    case 'single_select': return values;
    case 'multi_select': return [[], values.slice(0, 1), values];
    case 'rank': return [values, values.slice().reverse()];
    case 'allocation_100': return [{ engineering: 100 }, { nobody: 100 }];
    case 'open_text': return ['Notes'];
    default: return [];
  }
}
const fiq3Uniform = (mode: Fiq3Mode, level: string, facts: Fiq3Facts = FIQ3_FACTS[mode]) => ({
  mode, assessmentDate: FIQ3_DATE, facts,
  answers: Object.fromEntries(fiq3Questions(mode).filter((q: any) => q.kind === 'maturity')
    .map((q: any) => [q.id, q.id === 'UN-08' ? ({ run: FIQ3_REPORTS, walk: FIQ3_REPORTS.slice(0, 3), crawl: FIQ3_REPORTS.slice(0, 1) } as any)[level] : level]))
});
/**
 * The workshop estate without measured evidence or measured shares. It widens the workshop value range; no maturity
 * answer moves workshop value (value comes from measured inputs there), which the fact pseudo-questions below show.
 */
const FIQ3_WORKSHOP_UNMEASURED: Fiq3Facts = { ...FIQ3_FACTS.workshop, base: FIQ3_BASE, evidence: undefined, cost: FIQ3_COST };
const fiq3Extreme = (mode: Fiq3Mode, level: 'run' | 'not_yet') => ({
  mode, assessmentDate: FIQ3_DATE, facts: mode === 'executive' && level === 'not_yet' ? FIQ3_EXEC_TIER3 : FIQ3_FACTS[mode],
  answers: Object.fromEntries(fiq3Questions(mode).filter((q: any) => q.kind === 'maturity')
    .map((q: any) => [q.id, q.id === 'UN-08' ? (level === 'run' ? FIQ3_REPORTS : []) : level]))
});
/**
 * Fact pseudo-questions (F5 review M4): the audit varies scope and value-base facts as well as answers, so fact-driven
 * behaviour (unknown spend, units or growth; unknown value shares) shows in sensitivity and missing data. "Unanswered"
 * for a fact means unknown.
 */
const SHARE_VARIANTS = [{ band: [0, 0.25] }, { band: [0.25, 0.49] }, { band: [0.5, 0.74] }, { band: [0.75, 1] }, { unknown: true }];
const FIQ3_FACT_QUESTIONS: Record<string, { label: string; path: string; variants: unknown[]; unknown: unknown }> = {
  'fact:SC-04 aws': { label: 'SC-04 AWS annual spend', path: 'spend.byScope.aws', variants: [{ exact: 5e6 }, { exact: 3e7 }, { exact: 1e8 }], unknown: { unknown: true } },
  'fact:SC-05': { label: 'SC-05 spend growth', path: 'spend.growth12m', variants: [-10, 10, 30], unknown: 'unknown' },
  'fact:SC-07 units': { label: 'SC-07 consuming units', path: 'org.consumingUnits', variants: ['1', '2-4', '5-19', '20+'], unknown: 'unknown' },
  'fact:VB-01 compute': { label: 'VB-01 compute share', path: 'base.computeShare', variants: SHARE_VARIANTS.slice(0, 4), unknown: { unknown: true } },
  'fact:VB-01 non-production': { label: 'VB-01 non-production share', path: 'base.nonProdShare', variants: SHARE_VARIANTS.slice(0, 4), unknown: { unknown: true } },
  'fact:VB-02 coverage': { label: 'VB-02 eligible coverage', path: 'base.eligibleCoverage', variants: SHARE_VARIANTS.slice(0, 4), unknown: { unknown: true } }
};
function setFact(input: any, qid: string, value: unknown) {
  const q = FIQ3_FACT_QUESTIONS[qid];
  const facts = JSON.parse(JSON.stringify(input.facts));
  const keys = q.path.split('.');
  const parent = keys.slice(0, -1).reduce((o: any, k) => (o[k] ??= {}), facts);
  parent[keys[keys.length - 1]] = value;
  return { ...input, facts };
}
const fiq3WithAnswer = (input: any, qid: string, value: unknown) => (qid in FIQ3_FACT_QUESTIONS ? setFact(input, qid, value) : setAnswer(input, qid, value));
const fiq3WithoutAnswer = (input: any, qid: string) => (qid in FIQ3_FACT_QUESTIONS ? setFact(input, qid, FIQ3_FACT_QUESTIONS[qid].unknown) : dropAnswer(input, qid));

function fiq3Adapter(mode: Fiq3Mode): Adapter {
  const qs = fiq3Questions(mode);
  const byId = new Map(qs.map((q: any) => [q.id, q]));
  const capabilities = mode === 'executive' ? 8 : 22;
  const gapFindings = (r: any, severities: string[]) => r.findings.filter((f: any) => severities.includes(f.severity)).length;
  const headlines: Headline[] = [
    { name: `Capabilities at or above target (0-${capabilities})`, scale: [0, capabilities], higherIsBetter: true, get: r => r.headline.atOrAboveTarget },
    { name: 'Total capability gap (levels)', scale: [0, 3 * capabilities], higherIsBetter: false, get: r => r.capabilities.reduce((t: number, c: any) => t + Math.max(0, c.gap ?? 0), 0) },
    // Findings: one per capability gap, DECISION-01 and -02, and (F4) lever and scope-confirmation findings.
    { name: 'Critical + high findings', scale: [0, capabilities + 12], higherIsBetter: false, get: r => gapFindings(r, ['Critical', 'High']) },
    { name: 'Findings', scale: [0, capabilities + 12], higherIsBetter: false, get: r => r.findings.length },
    // Value (F4), on a scale of the 29% global cap on the largest estate's spend. Marked higher-is-better only so the
    // missing-data check flags any blank that raises the value (a blank must never flatter the value, DESIGN.md 10.9).
    { name: 'Value expected (gross run-rate)', scale: [0, 0.29 * 80_000_000], higherIsBetter: true, get: r => (r.value.moneyShown ? r.value.totals.expected.grossRunRate.value : null) },
    { name: 'Value upper (gross run-rate)', scale: [0, 0.29 * 80_000_000], higherIsBetter: true, get: r => (r.value.moneyShown ? r.value.totals.upper.grossRunRate.value : null) }
  ];
  if (mode === 'executive') headlines.unshift({ name: 'Need index (0-100)', scale: [0, 100], higherIsBetter: false, get: r => r.needVerdict.needIndex });
  return {
    id: `finops-iq-v3-${mode}`, name: `FinOps IQ v3 (${mode} mode)`,
    questions: [...qs.map((q: any) => ({ id: q.id, label: q.text })), ...Object.entries(FIQ3_FACT_QUESTIONS).map(([id, q]) => ({ id, label: q.label }))],
    random: r => ({ mode, assessmentDate: FIQ3_DATE, facts: r() < 0.5 ? (mode === 'executive' ? FIQ3_EXEC_TIER3 : FIQ3_WORKSHOP_UNMEASURED) : FIQ3_FACTS[mode], answers: Object.fromEntries(qs.filter(() => r() < 0.85).map((q: any) => [q.id, pick(r, fiq3Variants(q))])) }),
    variants: id => (id in FIQ3_FACT_QUESTIONS ? FIQ3_FACT_QUESTIONS[id].variants : fiq3Variants(byId.get(id))),
    withAnswer: fiq3WithAnswer, withoutAnswer: fiq3WithoutAnswer,
    evaluate: i => evaluateFinOpsIqV3(i),
    headlines,
    ...(mode === 'executive' ? { band: { get: (r: any) => r.needVerdict.bandLabel, all: ['Lightweight practices sufficient at current scale', 'Targeted improvements needed now', 'Material exposure: act this year', 'Act now'] } } : {}),
    extremes: { best: () => fiq3Extreme(mode, 'run'), worst: () => fiq3Extreme(mode, 'not_yet') },
    // Uniform baselines (follow-ups are asked only after a weak answer, hence Walk and Crawl too), on each estate.
    sensitivityBases: () => (['run', 'walk', 'crawl'] as const).flatMap(level =>
      [FIQ3_FACTS[mode], mode === 'executive' ? FIQ3_EXEC_TIER3 : FIQ3_WORKSHOP_UNMEASURED].map(f => fiq3Uniform(mode, level, f)))
  };
}

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

/* ------------------------------ Resilience IQ ------------------------------ */
// A completed assessment: every executive question answered (as the page requires) and, because the engine
// withholds a result until triggered follow-ups are answered, each advisory question answered with probability 0.8.
const RIQ_BANK: any = resilienceKnowledge.questionBank;
const RIQ_SCORES: any = (resilienceKnowledge.scoringModel as any).question_scoring;
const RIQ_QUESTIONS: any[] = [...RIQ_BANK.executive_questions, ...RIQ_BANK.advisory_questions];
function riqVariants(q: any): unknown[] {
  const type = q.ui?.interaction || q.type;
  if (type === 'matrix') return q.ui.columns.map((c: string) => Object.fromEntries(q.ui.rows.map((row: string) => [row, c])));
  if (type === 'multi_select') return [...q.options.map((o: string) => [o]), q.options.slice()];
  return q.options.slice();
}
function riqRandom(r: Rng) {
  const answers: Record<string, unknown> = {};
  for (const q of RIQ_BANK.executive_questions) answers[q.id] = pick(r, riqVariants(q));
  for (const q of RIQ_BANK.advisory_questions) if (r() < 0.8) answers[q.id] = pick(r, riqVariants(q));
  return { answers };
}
function riqExtreme(best: boolean) {
  const answers: Record<string, unknown> = {};
  for (const q of RIQ_BANK.executive_questions) {
    const table = RIQ_SCORES[q.id]?.scores;
    const opts: string[] = q.options.filter((o: string) => o !== 'Unknown' || !/EX-0[234]/.test(q.id));
    if ((q.ui?.interaction || q.type) === 'matrix') answers[q.id] = Object.fromEntries(q.ui.rows.map((row: string) => [row, best ? 'Validated' : 'No mapping']));
    else if (q.type === 'multi_select') answers[q.id] = [q.options[0]];
    else if (table) answers[q.id] = opts.reduce((m, o) => ((best ? (table[o] ?? 0) > (table[m] ?? 0) : (table[o] ?? 100) < (table[m] ?? 100)) ? o : m));
    else answers[q.id] = opts[0];
  }
  return { answers };
}

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
    band: { get: r => r.band, all: ['Nascent (At Severe Risk)', 'Emerging (Friction & Drift)', 'Established (Operational)', 'Advanced (Product-Led)', 'Leading'] },
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
      { name: 'Value at stake high ($)', scale: [0, Infinity], higherIsBetter: null, get: r => r.valueAtStake.maxSavings ?? 0 }
    ],
    band: { get: r => (r.maturity >= 0 ? FIQ.meta.stages[r.maturity].name : 'Below Stage 1'), all: ['Below Stage 1', ...FIQ.meta.stages.map((s: any) => s.name)] },
    extremes: { best: () => fiqExtreme(true), worst: () => fiqExtreme(false) }
  },
  fiq3Adapter('executive'),
  fiq3Adapter('workshop'),
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
  },
  {
    id: 'resilience-iq', name: 'Resilience IQ',
    questions: RIQ_QUESTIONS.map((q: any) => ({ id: q.id, label: q.text })),
    random: riqRandom,
    variants: id => riqVariants(RIQ_QUESTIONS.find((q: any) => q.id === id)),
    withAnswer: setAnswer, withoutAnswer: dropAnswer,
    evaluate: i => evaluateResilienceIq(i.answers),
    headlines: [
      { name: 'Resilience posture (0-100)', scale: [0, 100], higherIsBetter: true, get: r => r.postureScore },
      { name: 'Risk-adjusted score (0-100)', scale: [0, 100], higherIsBetter: true, get: r => r.score }
    ],
    band: { get: r => r.rating ?? 'Withheld (incomplete)', all: ['Withheld (incomplete)', 'Critical Exposure', 'Fragile', 'Managed', 'Resilient', 'Adaptive'] },
    extremes: { best: () => riqExtreme(true), worst: () => riqExtreme(false) }
  }
];
