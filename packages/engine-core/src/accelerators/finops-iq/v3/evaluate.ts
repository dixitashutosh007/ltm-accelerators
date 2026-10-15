/**
 * FinOps IQ v3 engine (plan phase F3; design: docs/cio-readiness/finops-iq/design/DESIGN.md).
 * One engine for both modes: the mode selects questions, never scoring.
 * Output: capability profile against tier targets, findings from gaps, levers and unknown value inputs, executive
 * need verdict, coverage, and the value model (F4, value-model.ts): lever-based ranges, net and phased, capped.
 */
import bank from './question-bank.json' with { type: 'json' };
import rules from './engine-rules.json' with { type: 'json' };
import capabilityModel from '../registry/capabilities.json' with { type: 'json' };
import leverLibrary from '../registry/levers.json' with { type: 'json' };
import thresholds from '../registry/thresholds.json' with { type: 'json' };
import claimsRegister from '../../../claims/claims-register.json' with { type: 'json' };
import valueRules from './value-rules.json' with { type: 'json' };
import { buildValueModel, findingValue, inputInfo, VALUE_MODEL_VERSION, type Figure, type ValueBlock, type ValueModelOutput } from './value-model';

export const ENGINE_VERSION = '3.5.0';
export { VALUE_MODEL_VERSION };

export type Mode = 'executive' | 'workshop';
export type Level = 'not_yet' | 'crawl' | 'walk' | 'run';
export type AnswerLevel = Level | 'unknown';
export type Rating = AnswerLevel | 'not_in_scope' | 'not_assessed';
export type Amount = { exact: number } | { band: [number, number] } | { unknown: true };
export type AnswerValue = string | number | string[] | Record<string, number>;

export interface Facts {
  org: { currency: string; sector?: string; markets?: string[]; consumingUnits?: string; tierFxRate?: number };
  footprint: {
    publicCloudProviders: string[];
    scopes: string[];
    infrastructureMix?: string;
    gpuInsideKubernetes?: boolean;
    migration?: { stage?: string; remainingShare24m?: Amount };
  };
  spend: { byScope: Record<string, Amount>; growth12m?: number | 'unknown' };
  base?: Record<string, Amount | string | Record<string, string>>;
  evidence?: Record<string, any>;
  cost?: { internalRate?: Amount; tooling?: Amount };
  consultant?: { complexityTierOverride?: 1 | 2 | 3; overrideReason?: string };
}

export interface TargetOverride { capability: string; level: Level; reason: string }

export interface FinOpsIqV3Input {
  mode: Mode;
  facts: Facts;
  /** Question ID -> option value (maturity: run / walk / crawl / not_yet / unknown). Missing keys are blanks. */
  answers: Record<string, AnswerValue>;
  assessmentDate?: string;
  targetOverrides?: TargetOverride[];
  /** Answers suggested by Cost IQ; scored only once listed in prefillConfirmed (DESIGN.md 2.3). */
  prefilled?: string[];
  prefillConfirmed?: string[];
}

export interface Basis { claimId?: string; assumptionId?: string; citation: string; status: string }

export interface CapabilityProfile {
  capability: string;
  domain: string;
  displayName: string;
  rating: Rating;
  ratingLabel: string;
  coreRating: Rating;
  loweredByDepth: boolean;
  target: { level: Level | null; source: 'tier_default' | 'consultant_override'; reason?: string };
  gap: number | null;
  /** False without a target (never counted); null when out of scope or (executive mode) assessed in the workshop. */
  atOrAboveTarget: boolean | null;
  unconfirmed: boolean;
  /** Every asked question answered (a blank never flatters the headline). */
  complete: boolean;
  /** Asked questions left blank; they are rated like "Don't know" (shown as "Not answered"). */
  notAnswered: string[];
  asked: number;
  answered: number;
  blank: number;
  questionIds: string[];
  assessedIn?: 'workshop';
  note?: string;
  claimIds: string[];
}

/** A finding's value: the sum of the quantified levers it owns (value sits on the lever, counted once). */
export interface FindingValue { leverIds: string[]; conservative: Figure; expected: Figure; upper: Figure }

export interface Finding {
  id: string;
  type: 'capability_gap' | 'lever_opportunity' | 'scope_confirmation' | 'decision';
  capability: string;
  scopes: string[];
  current?: Rating;
  target?: Level;
  targetSource?: 'tier_default' | 'consultant_override';
  gap?: number;
  unconfirmed: boolean;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  severityTrace: string[];
  title: string;
  businessConsequence: string;
  decisionOrAction: string;
  ownerRole: string;
  /** The owner as shown; differs from ownerRole when the FinOps lead is still to be appointed. */
  ownerLabel: string;
  interimOwnerRole?: string;
  /** Asked questions behind this finding left blank (rated like "Don't know"). */
  notAnsweredCount: number;
  /** Earliest start: the wave window, never before every finding in dependsOn has reached its first milestone. */
  start: { month: number; label: string };
  /** Time to complete once started, from severity. */
  targetDuration: { months: number; label: string };
  wave: 1 | 2 | 3;
  dependsOn: string[];
  leverIds: string[];
  evidenceToConfirm: string;
  offeringIds: string[];
  basis: Basis[];
  mode: Mode[];
  /** Value of the levers this finding owns; null when it owns none or no money figure is shown (Q4). */
  value: FindingValue | null;
  /** Severity before the value uplift (DESIGN.md 5.3 steps 1, 2, 4, 5): monotone in the answers. */
  severityBeforeValue: 'Critical' | 'High' | 'Medium' | 'Low';
  /** With value_uplift: the shown figures it rests on (F4 review H3). */
  valueBasis: { fields: string[]; thresholdField: string } | null;
  /** Levers whose value sits on this gap finding, with their own action, evidence and zero-value advice (F4 review M2). */
  leverActions: Array<{ leverId: string; title: string; action: string; evidence: string; zeroValue: boolean; inHeadline: boolean; claimIds: string[] }>;
}

export interface NeedVerdict {
  needIndex: number;
  baseIndex: number;
  modifiers: Array<{ id: string; points: number; reason?: string }>;
  /** Modifiers the design defines that cannot be applied yet. */
  pending: Array<{ id: string; reason: string }>;
  /** The shown figure behind the value modifier (F4 review H3). */
  valueBasis: { field: string; thresholdField: string } | null;
  band: string;
  bandLabel: string;
  confidence: 'Medium' | 'Low';
  blindSpots: Array<{ questionId?: string; fact?: string; capability?: string; reason: 'unknown' | 'blank' }>;
  basisLine: string;
  claimIds: string[];
}

export interface Coverage {
  asked: number;
  answered: number;
  unknown: number;
  blank: number;
  blankQuestions: string[];
  unknownQuestions: string[];
  /** Answers to questions not asked for this client (scope or trigger not met); never scored. */
  ignoredAnswers: string[];
  unconfirmedPrefill: string[];
  unconfirmedCapabilities: string[];
  claimIds: string[];
}

export interface FinOpsIqV3Result {
  versions: {
    engine: string;
    kb: string;
    questionSet: string;
    capabilityModel: string;
    leverLibrary: string;
    thresholds: string;
    engineRules: string;
    valueRules: string;
    valueModel: string;
    claimsRegister: string;
  };
  mode: Mode;
  assessmentDate?: string;
  /**
   * provisional (F5 review H2): annual spend is unknown (or unconverted) and a stated spend could put the estate in a
   * higher tier, so the targets are provisional and the executive need verdict is withheld.
   */
  tier: { tier: 1 | 2 | 3; points: number; trace: string[]; override: boolean; provisional: boolean; claimIds: string[] };
  questions: { asked: string[] };
  capabilities: CapabilityProfile[];
  headline: { atOrAboveTarget: number; inScope: number; assessed: number; statement: string; claimIds: string[] };
  findings: Finding[];
  topFindingIds: string[];
  needVerdict: NeedVerdict | null;
  /** Executive mode only (F5 review H2): the verdict is withheld while annual spend is unknown and could change the tier. */
  needVerdictWithheld: { reason: 'spend_unknown'; statement: string; claimIds: string[] } | null;
  coverage: Coverage;
  /** Consultant-only conflict probes (DESIGN.md 7.6); they never change a rating. */
  conflicts: Array<{ id: string; probe: string; consultantOnly: true }>;
  /** Hypothesis answers, never scored and never a value input (D4). HY-07 free text is not echoed. */
  hypotheses: { answers: Record<string, AnswerValue>; scored: false; claimIds: string[] };
  /** Value model (DESIGN.md 10): indicative ranges, never a savings commitment. Every number is a traceable Figure. */
  value: ValueBlock;
}

/* ------------------------------ Reference data ------------------------------ */

const BANK: any = bank;
const RULES: any = rules;
const VR: any = valueRules;
const CAPS: any = capabilityModel;
const LEVERS: any = leverLibrary;
const REGISTER: any = claimsRegister;

export const LEVELS: Level[] = ['not_yet', 'crawl', 'walk', 'run'];
const levelIndex = (l: AnswerLevel): number => (l === 'unknown' ? 0 : LEVELS.indexOf(l));
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const QUESTIONS: any[] = BANK.questions;
const QUESTION = new Map<string, any>(QUESTIONS.map(q => [q.id, q]));
const CAPABILITIES: any[] = CAPS.capabilities;
const CAPABILITY_INDEX = new Map<string, number>(CAPABILITIES.map((c, i) => [c.id, i]));
const EXECUTIVE_SET = new Set<string>(BANK.executiveSet);
export const EXECUTIVE_CAPABILITIES = new Set<string>(
  QUESTIONS.filter(q => q.kind === 'maturity' && EXECUTIVE_SET.has(q.id)).map(q => q.capability)
);
const CLAIMS = new Map<string, any>(REGISTER.claims.map((c: any) => [c.id, c]));

export const inMode = (q: any, mode: Mode) => q.modes.includes(mode);

function citation(claimId: string): Basis {
  const c = CLAIMS.get(claimId);
  const first = String(c?.statement ?? claimId).split(/(?<=[a-z)%])[.;] /)[0];
  return { claimId, citation: `${first} [${claimId}]`, status: c?.kind === 'heuristic' ? 'LTM_heuristic' : c?.verification ?? 'V' };
}

/* --------------------------------- Facts ---------------------------------- */

/** Numeric value of an amount or share: exact, or the band midpoint. Undefined when unknown or absent. */
export function amountValue(a: unknown): number | undefined {
  if (typeof a === 'number') return a;
  if (!a || typeof a !== 'object') return undefined;
  const v: any = a;
  if (typeof v.exact === 'number') return v.exact;
  if (Array.isArray(v.band) && v.band.length === 2) return (v.band[0] + v.band[1]) / 2;
  return undefined;
}

function factAt(facts: Facts, path: string): unknown {
  return path.split('.').reduce<any>((o, k) => (o && typeof o === 'object' ? o[k] : undefined), facts);
}

const hasPublicCloud = (f: Facts) => f.footprint.publicCloudProviders.length > 0 || f.footprint.scopes.includes('public_cloud');
const publicCloudSpend = (f: Facts) =>
  f.footprint.publicCloudProviders.reduce<number | undefined>((t, p) => {
    const v = amountValue(f.spend.byScope[p]);
    return v === undefined ? t : (t ?? 0) + v;
  }, undefined);
const totalSpend = (f: Facts) =>
  Object.values(f.spend.byScope).reduce<number | undefined>((t, a) => {
    const v = amountValue(a);
    return v === undefined ? t : (t ?? 0) + v;
  }, undefined);

/* ------------------------------- Conditions -------------------------------- */

interface Context { facts: Facts; levels: Map<string, AnswerLevel>; values: Map<string, AnswerValue> }

/** Evaluates the condition language of question.schema.json (facts, answers, all / any / not). */
export function testCondition(cond: any, ctx: Context): boolean {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c: any) => testCondition(c, ctx));
  if (cond.any) return cond.any.some((c: any) => testCondition(c, ctx));
  if (cond.not) return !testCondition(cond.not, ctx);
  if (cond.fact) {
    const v = factAt(ctx.facts, cond.fact);
    if ('contains' in cond) return Array.isArray(v) && v.includes(cond.contains);
    if ('countAtLeast' in cond) return Array.isArray(v) && v.length >= cond.countAtLeast;
    if ('in' in cond) return cond.in.includes(v);
    if ('isUnknown' in cond) return (amountValue(v) === undefined) === cond.isUnknown;
    const n = amountValue(v);
    if ('lt' in cond) return n !== undefined && n < cond.lt;
    if ('gte' in cond) return n !== undefined && n >= cond.gte;
    return false;
  }
  if (cond.answer) {
    const level = ctx.levels.get(cond.answer);
    const value = ctx.values.get(cond.answer);
    if ('answered' in cond) return (value !== undefined) === cond.answered;
    if ('isUnknown' in cond) return (level === 'unknown') === cond.isUnknown;
    if ('in' in cond) return typeof value === 'string' && cond.in.includes(value);
    // Unknown counts as the lowest level (D5): it meets "at most" and never meets "at least".
    if ('levelAtMost' in cond) return level !== undefined && levelIndex(level) <= LEVELS.indexOf(cond.levelAtMost);
    if ('levelAtLeast' in cond) return level !== undefined && level !== 'unknown' && levelIndex(level) >= LEVELS.indexOf(cond.levelAtLeast);
  }
  return false;
}

/** The level an answer sets, or undefined for non-maturity questions and invalid values. */
export function answerLevel(q: any, a: AnswerValue | undefined): AnswerLevel | undefined {
  if (q.kind !== 'maturity' || a === undefined) return undefined;
  if (q.answerType === 'multi_select') {
    if (a === 'unknown') return 'unknown';
    if (!Array.isArray(a)) return undefined;
    const valid = new Set(a.filter(v => q.options.some((o: any) => o.value === v && !o.level)));
    return q.multiSelectLevelRule.find((r: any) => valid.size >= r.minCount)?.level;
  }
  return q.options.find((o: any) => o.value === a)?.level;
}

/* ---------------------------------- Tier ----------------------------------- */

function material(id: string, f: Facts): boolean {
  // THR-FIN-12: apply the materiality tests when the inputs exist; otherwise a selected scope counts as material.
  if (id === 'kubernetes_material') {
    const k8s = amountValue(f.base?.kubernetesSpend);
    const p = publicCloudSpend(f);
    const share = amountValue(f.base?.computeShare);
    if (k8s === undefined || p === undefined || share === undefined || p * share <= 0) return true;
    return k8s / (p * share) >= CAPS.tiers.materiality.kubernetesShareOfCompute;
  }
  if (id === 'ai_material') {
    if (f.footprint.scopes.includes('ai_platform_gpu')) return amountValue(f.evidence?.aiGpu?.gpuSpend) !== 0;
    const api = amountValue(f.spend.byScope.ai_api) ?? amountValue(f.evidence?.aiGpu?.aiApiSpend);
    const total = totalSpend(f);
    if (api === undefined || !total) return true;
    return api / total >= CAPS.tiers.materiality.aiApiShareOfSpend;
  }
  return true;
}

export function complexityTier(f: Facts): FinOpsIqV3Result['tier'] {
  const t = CAPS.tiers;
  const ctx: Context = { facts: f, levels: new Map(), values: new Map() };
  const trace: string[] = [];
  let points = 0;
  const local = totalSpend(f);
  const rate = f.org.tierFxRate ?? (f.org.currency === 'USD' ? 1 : undefined);
  let spendPoints = 0;
  const rows = Object.values(f.spend.byScope);
  const spendUnknown = !rows.length || rows.some(a => amountValue(a) === undefined) || rate === undefined;
  if (local === undefined) trace.push('spend unknown -> 0');
  else if (rate === undefined) trace.push(`spend ${f.org.currency} not converted (no tier FX rate) -> 0`);
  else {
    const usd = local * rate;
    const band = t.spendBandsUsd.find((b: any) => usd >= b.min && (b.max === undefined || usd < b.max));
    points += band.points;
    spendPoints = band.points;
    trace.push(`spend about USD ${(usd / 1e6).toFixed(1)}M -> ${band.points}`);
  }
  for (const p of t.points) {
    if (testCondition(p.when, ctx) && material(p.id, f)) {
      points += p.points;
      trace.push(`${p.id} -> +${p.points}`);
    }
  }
  const bandOf = (n: number) => t.bands.find((b: any) => n >= b.minPoints && (b.maxPoints === undefined || n <= b.maxPoints));
  const band = bandOf(points);
  const override = f.consultant?.complexityTierOverride;
  if (override) trace.push(`consultant override -> Tier ${override}${f.consultant?.overrideReason ? ': ' + f.consultant.overrideReason : ''}`);
  // F5 review H2: with any spend row unknown, a stated spend could earn up to the top spend band's points.
  const maxSpendPoints = Math.max(...t.spendBandsUsd.map((b: any) => b.points));
  const provisional = !override && spendUnknown && bandOf(points - spendPoints + maxSpendPoints).tier !== band.tier;
  if (provisional) trace.push(`provisional: a stated annual spend could raise the tier to ${bandOf(points - spendPoints + maxSpendPoints).tier}`);
  return { tier: override ?? band.tier, points, trace, override: !!override, provisional, claimIds: provisional ? ['CLM-FIN-120', 'CLM-FIN-178'] : ['CLM-FIN-120'] };
}

/* --------------------------------- Rating ---------------------------------- */

export interface RatedCapability { rating: Rating; coreRating: Rating; loweredByDepth: boolean; unconfirmed: boolean }

/**
 * DESIGN.md 3.3 as amended by the F3 review (H1, M1): the weakest answered core question, lowered by at most one
 * level when a depth question (scope-conditional or follow-up) is lower. Pass blanks as 'unknown'.
 * A depth Unknown counts as Not yet for the one-level rule and flags the rating unconfirmed.
 * A core Unknown makes the capability Unknown, unless the known answers already rate it Not yet.
 */
export function rateCapability(answers: Array<{ level: AnswerLevel; core: boolean }>): RatedCapability {
  const core = answers.filter(a => a.core);
  if (!core.length) return { rating: 'not_assessed', coreRating: 'not_assessed', loweredByDepth: false, unconfirmed: false };
  const knownCore = core.filter(a => a.level !== 'unknown').map(a => levelIndex(a.level));
  const coreUnknown = knownCore.length < core.length;
  const depth = answers.filter(a => !a.core);
  const depthUnknown = depth.some(a => a.level === 'unknown');
  if (!knownCore.length) return { rating: 'unknown', coreRating: 'unknown', loweredByDepth: false, unconfirmed: true };
  const c = Math.min(...knownCore);
  const lowered = depth.length > 0 && Math.min(...depth.map(a => levelIndex(a.level))) < c;
  const known = LEVELS[lowered ? c - 1 : c];
  if (coreUnknown) return { rating: known === 'not_yet' ? 'not_yet' : 'unknown', coreRating: LEVELS[c], loweredByDepth: lowered, unconfirmed: true };
  return { rating: known, coreRating: LEVELS[c], loweredByDepth: lowered, unconfirmed: depthUnknown };
}

/* ------------------------------ Asked questions ----------------------------- */

interface AnswerState { asked: Set<string>; values: Map<string, AnswerValue>; levels: Map<string, AnswerLevel>; ignored: string[]; unconfirmedPrefill: string[] }

/**
 * Which questions this client is asked (mode, scope facts, answer triggers), and the answers that count.
 * Triggers depend on other answers, so this repeats until the asked set is stable.
 */
function resolveAnswers(input: FinOpsIqV3Input): AnswerState {
  const confirmed = new Set(input.prefillConfirmed ?? []);
  const unconfirmedPrefill = (input.prefilled ?? []).filter(id => input.answers[id] !== undefined && !confirmed.has(id));
  const raw = new Map<string, AnswerValue>();
  for (const [id, a] of Object.entries(input.answers ?? {})) {
    const q = QUESTION.get(id);
    if (q && inMode(q, input.mode) && a !== undefined && a !== null && !unconfirmedPrefill.includes(id)) raw.set(id, a);
  }
  const levelsOf = (values: Map<string, AnswerValue>) => {
    const levels = new Map<string, AnswerLevel>();
    for (const [id, a] of values) { const l = answerLevel(QUESTION.get(id), a); if (l) levels.set(id, l); }
    return levels;
  };
  let asked = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const values = new Map([...raw].filter(([id]) => i === 0 || asked.has(id)));
    const ctx: Context = { facts: input.facts, levels: levelsOf(values), values };
    const next = new Set(QUESTIONS.filter(q => inMode(q, input.mode) && testCondition(q.askWhen, ctx)).map(q => q.id));
    const stable = next.size === asked.size && [...next].every(id => asked.has(id));
    asked = next;
    if (stable) break;
  }
  const values = new Map([...raw].filter(([id]) => asked.has(id)));
  const ignored = Object.keys(input.answers ?? {}).filter(id => QUESTION.has(id) && !values.has(id) && !unconfirmedPrefill.includes(id) && input.answers[id] !== undefined);
  return { asked, values, levels: levelsOf(values), ignored, unconfirmedPrefill };
}

/* ------------------------------- Capabilities ------------------------------- */

const label = (r: Rating | 'not_answered') => RULES.ratingLabels[r].label as string;

function capabilityProfile(cap: any, input: FinOpsIqV3Input, tier: number, state: AnswerState): CapabilityProfile {
  const ctx: Context = { facts: input.facts, levels: state.levels, values: state.values };
  const override = (input.targetOverrides ?? []).find(o => o.capability === cap.id);
  const target: CapabilityProfile['target'] = override
    ? { level: override.level, source: 'consultant_override', reason: override.reason }
    : { level: cap.defaultTargets[`tier${tier}`] ?? null, source: 'tier_default' };
  const qs = QUESTIONS.filter(q => q.kind === 'maturity' && q.capability === cap.id);
  const askedQs = qs.filter(q => state.asked.has(q.id));
  const notAnswered = askedQs.filter(q => !state.levels.has(q.id)).map(q => q.id);
  const base = {
    capability: cap.id, domain: cap.domain, displayName: cap.displayName, target,
    asked: askedQs.length, answered: askedQs.length - notAnswered.length, blank: notAnswered.length,
    questionIds: askedQs.map(q => q.id), claimIds: [...cap.claimIds]
  };
  const inScope = cap.relevance === 'always' || testCondition(cap.scopeTrigger, ctx);
  const workshopOnly = input.mode === 'executive' && !EXECUTIVE_CAPABILITIES.has(cap.id);
  // N/A only from scope (D5): out of scope by the capability trigger, or because every question's scope is absent.
  if (!inScope || (!workshopOnly && askedQs.length === 0)) {
    return { ...base, rating: 'not_in_scope', ratingLabel: label('not_in_scope'), coreRating: 'not_in_scope', loweredByDepth: false,
      target: { ...target, level: null }, gap: null, atOrAboveTarget: null, unconfirmed: false, complete: true, notAnswered: [],
      claimIds: [...base.claimIds, ...RULES.ratingLabels.not_in_scope.claimIds] };
  }
  if (workshopOnly) {
    return { ...base, rating: 'not_assessed', ratingLabel: label('not_assessed'), coreRating: 'not_assessed', loweredByDepth: false,
      gap: null, atOrAboveTarget: null, unconfirmed: false, complete: true, notAnswered: [], assessedIn: 'workshop', note: RULES.workshopOnly.label,
      claimIds: [...base.claimIds, ...RULES.workshopOnly.claimIds] };
  }
  // A blank is rated like "Don't know" (F3 review H1). A question that is core only in some estates (UN-03) is core
  // whenever it is asked; with no core question asked, all count as core.
  const hasCore = askedQs.some(q => q.role === 'core');
  const rated = rateCapability(askedQs.map(q => ({ level: state.levels.get(q.id) ?? 'unknown', core: !hasCore || q.role === 'core' })));
  const realUnknown = askedQs.some(q => state.levels.get(q.id) === 'unknown');
  const labelKey = rated.rating === 'unknown' && !realUnknown ? 'not_answered' : rated.rating;
  const gap = target.level === null ? null : LEVELS.indexOf(target.level) - levelIndex(rated.rating as AnswerLevel);
  const complete = notAnswered.length === 0;
  const knownLevel = (LEVELS as string[]).includes(rated.rating);
  return {
    ...base, ...rated, ratingLabel: label(labelKey), gap, complete, notAnswered,
    atOrAboveTarget: target.level !== null && knownLevel && complete && !rated.unconfirmed && gap !== null && gap <= 0,
    claimIds: [...base.claimIds, ...RULES.ratingLabels[labelKey].claimIds]
  };
}

/* --------------------------------- Findings --------------------------------- */

function guidance(cap: any, level: Level): string {
  return cap.maturityGuidance[level === 'not_yet' ? 'notYet' : level];
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));

function findingScopes(cap: any, f: Facts): string[] {
  const scopes = f.footprint.scopes.filter(s => s !== 'public_cloud');
  if (cap.scopeTrigger) return scopes.filter(s => testCondition(cap.scopeTrigger, { facts: { ...f, footprint: { ...f.footprint, scopes: [s] } }, levels: new Map(), values: new Map() }));
  return [...f.footprint.publicCloudProviders.map(p => `public_cloud:${p}`), ...scopes];
}

function severityOf(cap: any, p: CapabilityProfile, tier: number, leverIds: string[], vm: ValueModelOutput): { severity: Finding['severity']; trace: string[]; before: Finding['severity']; basis: Finding['valueBasis'] } {
  const s = RULES.severity;
  const raised = (sev: Finding['severity'], trace: string[]) => valueUplift(sev, trace, leverIds, vm);
  if (p.target.source === 'consultant_override' && cap.defaultTargets[`tier${tier}`] == null) return raised('Low', ['scope_low']);
  const gap = Math.min(3, p.gap!);
  let rank = SEVERITIES.indexOf(s.byGap[String(gap)]);
  const trace = [`gap_${gap}`];
  if (s.foundationUplift.capabilities.includes(cap.id) && tier >= s.foundationUplift.minTier && rank < 3) { rank++; trace.push('foundation_uplift'); }
  return raised(SEVERITIES[rank], trace);
}

/**
 * DESIGN.md 5.3 step 3: at least High when a linked lever's expected net run-rate value is 2% or more of its base
 * (THR-FIN-13). F4 review H3: only on a figure the report shows, at the client's own answers; the figure is named.
 */
function valueUplift(severity: Finding['severity'], trace: string[], leverIds: string[], vm: ValueModelOutput) {
  const hits = leverIds.map(id => vm.scoring.byLever.get(id)).filter(x => x?.reached).map(x => x!.field);
  if (hits.length && SEVERITIES.indexOf(severity) < SEVERITIES.indexOf('High')) {
    return { severity: 'High' as const, trace: [...trace, 'value_uplift'], before: severity, basis: { fields: hits, thresholdField: vm.scoring.upliftThresholdField } };
  }
  return { severity, trace, before: severity, basis: null };
}

function leverLinks(cap: any, f: Facts): string[] {
  const ctx: Context = { facts: f, levels: new Map(), values: new Map() };
  return (cap.leverIds ?? []).filter((id: string) => testCondition(LEVERS.levers.find((l: any) => l.id === id)?.scopeWhen, ctx));
}

/** How one asked question was answered, quoting the client's own option (F3 review H2). */
function describeAnswer(q: any, state: AnswerState): string {
  const t = RULES.findingText;
  const level = state.levels.get(q.id);
  if (level === undefined) return fill(t.answerBlank, { question: q.id });
  if (level === 'unknown') return fill(t.answerUnknown, { question: q.id });
  const v = state.values.get(q.id);
  const optionLabel = Array.isArray(v) ? `${v.length} of ${q.options.filter((o: any) => !o.level).length} report types` : q.options.find((o: any) => o.value === v)?.label;
  return fill(t.answer, { label: optionLabel, question: q.id });
}

/** The answers that set the rating: the weakest known core answer, every unknown or blank core answer, and the depth answer that lowered it. */
function ratingAnswers(p: CapabilityProfile, state: AnswerState): any[] {
  const qs = p.questionIds.map(id => QUESTION.get(id));
  const hasCore = qs.some(q => q.role === 'core');
  const isCore = (q: any) => !hasCore || q.role === 'core';
  const idx = (q: any) => { const l = state.levels.get(q.id); return l === undefined || l === 'unknown' ? -1 : levelIndex(l); };
  const core = qs.filter(isCore);
  const knownCore = core.filter(q => idx(q) >= 0).sort((a, b) => idx(a) - idx(b));
  const out = [...knownCore.slice(0, 1), ...core.filter(q => idx(q) < 0)];
  if (p.loweredByDepth) out.push(qs.filter(q => !isCore(q)).sort((a, b) => idx(a) - idx(b))[0]);
  return out;
}

function ownerFor(role: string, mp01: string | undefined) {
  const t = RULES.ownerRoles.toBeAppointed;
  if (role === t.role && mp01 !== undefined && t.levels.includes(mp01)) return { ownerRole: role, ownerLabel: t.label, interimOwnerRole: t.interimRole };
  return { ownerRole: role, ownerLabel: role };
}

/** MP-01 as asked: its level, 'not_answered' when blank, undefined when not asked. */
function mp01Status(state: AnswerState): string | undefined {
  if (!state.asked.has('MP-01')) return undefined;
  return state.levels.get('MP-01') ?? 'not_answered';
}

function buildFindings(input: FinOpsIqV3Input, tier: number, profile: CapabilityProfile[], state: AnswerState, vm: ValueModelOutput): Finding[] {
  const text = RULES.findingText;
  const ruleBasis = [...new Set<string>([...text.claimIds, ...RULES.severity.claimIds, ...RULES.ownerRoles.claimIds, ...RULES.schedule.claimIds])].map(citation);
  const mp01 = mp01Status(state);
  const findings: Finding[] = [];
  const questionBasis = (qs: any[]) => qs.flatMap(q => q.basis).filter((b: any, i: number, all: any[]) => all.findIndex(x => x.claimId === b.claimId) === i);
  for (const p of profile) {
    if (p.gap === null || p.gap < 1 || p.target.level === null) continue;
    const cap = CAPABILITIES[CAPABILITY_INDEX.get(p.capability)!];
    const leverIds = leverLinks(cap, input.facts);
    const { severity, trace, before, basis } = severityOf(cap, p, tier, leverIds, vm);
    const ct = RULES.capabilityText.byCapability[cap.id];
    const contributing = ratingAnswers(p, state);
    const values = {
      capability: cap.displayName, current: p.ratingLabel, target: label(p.target.level),
      targetGuidance: guidance(cap, p.target.level), questions: p.notAnswered.join(', '),
      answers: contributing.map(q => describeAnswer(q, state)).join('; ')
    };
    const action = p.notAnswered.length ? text.actionNotAnswered : p.unconfirmed ? text.actionUnconfirmed : text.action;
    findings.push({
      id: `F-FIN-${cap.id}`, type: 'capability_gap', capability: cap.id, scopes: findingScopes(cap, input.facts),
      current: p.rating, target: p.target.level, targetSource: p.target.source, gap: p.gap, unconfirmed: p.unconfirmed || p.notAnswered.length > 0,
      notAnsweredCount: p.notAnswered.length,
      severity, severityTrace: trace,
      title: fill(p.unconfirmed && p.rating !== 'unknown' ? text.titleUnconfirmed : text.title, values),
      businessConsequence: `${fill(text.today, values)} ${ct.consequence}`,
      decisionOrAction: fill(action, values),
      ...ownerFor(RULES.ownerRoles.byCapability[cap.id], mp01),
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: cap.wave, dependsOn: [], leverIds,
      evidenceToConfirm: ct.evidence,
      offeringIds: [...cap.offeringIds],
      basis: [...cap.basis, ...cap.maturityGuidance.claimIds.filter((id: string) => !cap.claimIds.includes(id)).map(citation),
        ...questionBasis(contributing).filter((b: any) => !cap.claimIds.includes(b.claimId)), ...ruleBasis,
        ...(trace.includes('value_uplift') ? VR.scoring.claimIds.map(citation) : [])],
      mode: [input.mode], value: null, severityBeforeValue: before, valueBasis: basis, leverActions: leverActions(leverIds, vm)
    });
  }
  findings.push(...leverFindings(input, findings, vm, mp01), ...scopeConfirmations(input, vm, mp01));
  // DECISION-01 (F3 review M4): no accountable owner for cloud spend.
  for (const d of RULES.decisions) {
    if (mp01 === undefined || !d.levels.includes(mp01)) continue;
    const up = tier >= d.tierUplift.minTier;
    const severity = SEVERITIES[Math.min(3, SEVERITIES.indexOf(d.severity) + (up ? 1 : 0))];
    const q = QUESTION.get(d.question);
    const unconfirmed = mp01 === 'unknown' || mp01 === 'not_answered';
    findings.push({
      id: d.id, type: 'decision', capability: d.capability, scopes: [], unconfirmed, notAnsweredCount: mp01 === 'not_answered' ? 1 : 0, severity,
      severityTrace: up ? ['decision_rule', 'foundation_uplift'] : ['decision_rule'],
      title: d.title, businessConsequence: `${fill(text.today, { answers: describeAnswer(q, state) })} ${d.consequence}`,
      decisionOrAction: unconfirmed ? d.actionUnconfirmed : d.action,
      ownerRole: d.ownerRole, ownerLabel: d.ownerRole,
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: d.wave, dependsOn: [], leverIds: [], evidenceToConfirm: d.evidence, offeringIds: [...d.offeringIds],
      basis: [...d.claimIds.map(citation), ...questionBasis([q]), ...ruleBasis.filter(b => b.claimId !== 'CLM-FIN-141')],
      mode: [input.mode], value: null, severityBeforeValue: severity, valueBasis: null, leverActions: []
    });
  }
  // DECISION-02 (F4): commitments now would lock in usage that the scheduling and Spot moves remove.
  if (vm.decision02) {
    const d = VR.decision02;
    findings.push({
      id: d.id, type: 'decision', capability: d.capability, scopes: input.facts.footprint.publicCloudProviders.map(p => `public_cloud:${p}`),
      unconfirmed: false, notAnsweredCount: 0, severity: d.severity, severityTrace: ['decision_rule'],
      title: d.title, businessConsequence: d.consequence, decisionOrAction: d.action, ...ownerFor(d.ownerRole, mp01),
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: d.wave, dependsOn: [], leverIds: ['LEV-01', ...(vm.quantified.includes('LEV-06') ? ['LEV-06'] : []), ...(vm.quantified.includes('LEV-04') ? ['LEV-04'] : [])],
      evidenceToConfirm: d.evidence, offeringIds: [...d.offeringIds],
      basis: [...d.claimIds.map(citation), ...ruleBasis.filter(b => b.claimId !== 'CLM-FIN-141')], mode: [input.mode], value: null,
      severityBeforeValue: d.severity, valueBasis: null, leverActions: []
    });
  }
  // Waves by dependency (DESIGN.md 5.4), then the schedule: a finding starts at its wave window and never before
  // every finding it depends on has reached its first milestone (F3 review H3, re-review R1).
  const byCap = new Map(findings.filter(f => f.type === 'capability_gap').map(f => [f.capability, f]));
  const sch = RULES.schedule;
  const scheduled = new Set<string>();
  const schedule = (f: Finding) => {
    if (scheduled.has(f.id)) return;
    let month = sch.waveStartMonth[String(f.wave)];
    const quickWin = f.type === 'lever_opportunity' && VR.leverFindings.waveByLever[f.leverIds[0]] !== undefined;
    if (f.type === 'capability_gap' || (f.type === 'lever_opportunity' && !quickWin)) {
      for (const dep of CAPABILITIES[CAPABILITY_INDEX.get(f.capability)!].dependsOn ?? []) {
        const d = byCap.get(dep);
        if (!d) continue;
        schedule(d);
        f.dependsOn.push(d.id);
        f.wave = Math.max(f.wave, d.wave) as Finding['wave'];
        month = Math.max(month, sch.waveStartMonth[String(f.wave)], d.start.month + Math.min(sch.firstMilestoneMonths, d.targetDuration.months));
      }
    }
    const months = f.type === 'scope_confirmation' ? VR.scopeConfirmation.targetDurationMonths : sch.durationMonths[f.severity];
    f.start = { month, label: fill(sch.startLabel, { month }) };
    f.targetDuration = { months, label: fill(sch.durationLabel, { months }) };
    scheduled.add(f.id);
  };
  findings.forEach(schedule);
  // Findings from real answers come before "not answered" ones of the same severity (F3 review H1).
  const blankDriven = (f: Finding) => (f.notAnsweredCount > 0 ? 1 : 0);
  const TYPE_ORDER = ['capability_gap', 'lever_opportunity', 'decision', 'scope_confirmation'];
  findings.sort((a, b) =>
    SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity) || blankDriven(a) - blankDriven(b) || a.wave - b.wave ||
    (b.gap ?? 0) - (a.gap ?? 0) || CAPABILITY_INDEX.get(a.capability)! - CAPABILITY_INDEX.get(b.capability)! ||
    TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.id.localeCompare(b.id));
  // Value sits on the lever; each finding shows the quantified levers it owns, so finding values sum to the headline.
  if (vm.value.moneyShown) for (const f of findings) {
    if (f.type === 'capability_gap' || f.type === 'lever_opportunity') f.value = findingValue(f.id, f.leverIds, vm.value);
  }
  return findings;
}

/** Lever texts for a lever: its own, the zero-value ones, or the not-worth-pursuing ones (M1). */
function leverText(id: string, vm: ValueModelOutput) {
  const lf = VR.leverFindings;
  const lever = LEVERS.levers.find((l: any) => l.id === id);
  const t = lf.byLever[id];
  const excluded = vm.excluded.includes(id);
  const zero = vm.zero.includes(id);
  if (excluded) return { title: fill(lf.excluded.title, { lever: lever.name }), consequence: VR.headline.excludedText, action: lf.excluded.action, evidence: t.evidence, zero: true, excluded };
  if (zero && id === 'LEV-01' && vm.overCoverage) return { title: lf.overCoverageTitle, consequence: `${t.zeroConsequence} ${t.overCoverage}`, action: t.zeroAction, evidence: t.evidence, zero, excluded };
  if (zero) return { title: t.zeroTitle ?? fill(lf.zero.title, { lever: lever.name }), consequence: t.zeroConsequence ?? lf.zero.consequence, action: t.zeroAction ?? lf.zero.action, evidence: t.evidence, zero, excluded };
  return { title: t.title, consequence: t.consequence, action: t.action, evidence: t.evidence, zero, excluded };
}

/** M2: the quantified levers a gap finding owns keep their own action, evidence and zero-value advice. */
function leverActions(leverIds: string[], vm: ValueModelOutput): Finding['leverActions'] {
  return leverIds.filter(id => vm.quantified.includes(id)).map(id => {
    const t = leverText(id, vm);
    const lever = LEVERS.levers.find((l: any) => l.id === id);
    return { leverId: id, title: t.title, action: t.action, evidence: t.evidence, zeroValue: t.zero, inHeadline: !t.excluded, claimIds: [...VR.leverFindings.claimIds, lever.claimIds[0]] };
  });
}

/**
 * Lever findings (DESIGN.md 5.1, CLM-FIN-167): a quantified lever (also at zero, or not worth pursuing) whose
 * capability has no gap finding. Otherwise the lever sits on its capability's gap finding (with its actions, M2).
 * Severity Medium, Low at zero or when not worth pursuing, value uplift to High on its shown figure.
 */
function leverFindings(input: FinOpsIqV3Input, findings: Finding[], vm: ValueModelOutput, mp01: string | undefined): Finding[] {
  const lf = VR.leverFindings;
  const withGap = new Set(findings.filter(f => f.type === 'capability_gap').map(f => f.capability));
  const out: Finding[] = [];
  for (const id of vm.quantified) {
    const lever = LEVERS.levers.find((l: any) => l.id === id);
    if (withGap.has(lever.capability)) continue;
    const cap = CAPABILITIES[CAPABILITY_INDEX.get(lever.capability)!];
    const t = leverText(id, vm);
    const { severity, trace, before, basis } = t.zero
      ? { severity: lf.severity.zero as Finding['severity'], trace: [t.excluded ? 'lever_excluded' : 'lever_zero'], before: lf.severity.base as Finding['severity'], basis: null }
      : valueUplift(lf.severity.base, ['lever_base'], [id], vm);
    out.push({
      id: `F-FIN-${id}`, type: 'lever_opportunity', capability: cap.id, scopes: findingScopes(cap, input.facts),
      unconfirmed: false, notAnsweredCount: 0, severity, severityTrace: trace,
      title: t.title, businessConsequence: t.consequence, decisionOrAction: t.action,
      ...ownerFor(RULES.ownerRoles.byCapability[cap.id], mp01),
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: lf.waveByLever[id] ?? cap.wave, dependsOn: [], leverIds: [id], evidenceToConfirm: t.evidence,
      offeringIds: [...lever.offeringIds],
      basis: [...new Set<string>([...lf.claimIds, ...lever.claimIds.slice(0, 2), ...(trace.includes('value_uplift') ? VR.scoring.claimIds : [])])].map(citation),
      mode: [input.mode], value: null, severityBeforeValue: before, valueBasis: basis, leverActions: []
    });
  }
  return out;
}

/** Scope-confirmation findings: one per unknown value base or scope fact that blocks a lever this mode quantifies. */
function scopeConfirmations(input: FinOpsIqV3Input, vm: ValueModelOutput, mp01: string | undefined): Finding[] {
  const sc = VR.scopeConfirmation;
  const out: Finding[] = [];
  for (const [path, leverIds] of vm.blocking) {
    const info = inputInfo(path);
    const levers = leverIds.map(id => LEVERS.levers.find((l: any) => l.id === id));
    const material = leverIds.some(id => sc.materialLevers.includes(id));
    const question = input.mode === 'executive' && info.executiveQuestion ? info.executiveQuestion : info.question;
    const label = info.label;
    const names = levers.map((l: any) => `${l.name.toLowerCase()} (${l.id})`).join(', ');
    out.push({
      id: `F-FIN-SCOPE-${info.id}`, type: 'scope_confirmation', capability: levers[0].capability, scopes: [],
      unconfirmed: true, notAnsweredCount: 0, severity: material ? sc.severity.material : sc.severity.other, severityTrace: [material ? 'scope_material' : 'scope_low'],
      title: fill(sc.title, { input: label }), businessConsequence: fill(sc.consequence, { input: label, levers: names, them: leverIds.length > 1 ? 'them' : 'it' }),
      decisionOrAction: fill(sc.action, { input: label, question }),
      ...ownerFor(sc.ownerRole, mp01),
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: sc.wave, dependsOn: [], leverIds: [...leverIds], evidenceToConfirm: fill(sc.evidence, { input: label[0].toUpperCase() + label.slice(1) }),
      offeringIds: [...sc.offeringIds],
      basis: [...new Set<string>([...sc.claimIds, ...levers.map((l: any) => l.claimIds[0])])].map(citation),
      mode: [input.mode], value: null, severityBeforeValue: material ? sc.severity.material : sc.severity.other, valueBasis: null, leverActions: []
    });
  }
  return out;
}

/**
 * The roadmap start month of the finding that will own each lever (F4 review M3), from waves and dependencies only,
 * so the ramp can start there before findings exist. It mirrors the schedule in buildFindings: a dependency's first
 * milestone is min(3 months, its duration) and every duration is at least 3 months, so severity does not enter.
 */
function leverStartMonths(profile: CapabilityProfile[]): Record<string, number> {
  const sch = RULES.schedule;
  const milestone = Math.min(sch.firstMilestoneMonths, ...Object.values<number>(sch.durationMonths));
  const gap = new Set(profile.filter(p => p.gap !== null && p.gap >= 1 && p.target.level !== null).map(p => p.capability));
  const memo = new Map<string, { wave: number; month: number }>();
  const capStart = (id: string, wave0: number): { wave: number; month: number } => {
    let wave = wave0;
    let month = sch.waveStartMonth[String(wave)];
    for (const dep of CAPABILITIES[CAPABILITY_INDEX.get(id)!].dependsOn ?? []) {
      if (!gap.has(dep)) continue;
      const d = memo.get(dep) ?? capStart(dep, CAPABILITIES[CAPABILITY_INDEX.get(dep)!].wave);
      memo.set(dep, d);
      wave = Math.max(wave, d.wave);
      month = Math.max(month, sch.waveStartMonth[String(wave)], d.month + milestone);
    }
    return { wave, month };
  };
  const out: Record<string, number> = {};
  for (const l of LEVERS.levers) {
    const cap = l.capability;
    const quick = VR.leverFindings.waveByLever[l.id];
    out[l.id] = !gap.has(cap) && quick !== undefined ? sch.waveStartMonth[String(quick)] : capStart(cap, CAPABILITIES[CAPABILITY_INDEX.get(cap)!].wave).month;
  }
  return out;
}

/* ------------------------------- Need verdict ------------------------------- */

/** A scope or value-base question counts as answered when every fact it sets is given. */
function factsGiven(q: any, f: Facts): boolean {
  return (q.sets ?? []).every((path: string) => {
    const v = factAt(f, path);
    if (v === undefined || v === 'unknown') return false;
    if (Array.isArray(v) || typeof v !== 'object') return true;
    if ('exact' in (v as any) || 'band' in (v as any) || 'unknown' in (v as any)) return amountValue(v) !== undefined;
    return Object.values(v as any).some(x => amountValue(x) !== undefined || (typeof x === 'string'));
  });
}

function needVerdict(input: FinOpsIqV3Input, tier: number, profile: CapabilityProfile[], state: AnswerState, vm: ValueModelOutput, unansweredValueInput: boolean): NeedVerdict {
  const nv = RULES.needVerdict;
  const f = input.facts;
  // Blank (any asked question left blank) counts as the maximum gap, so a blank never lowers need.
  const targeted = profile.filter(p => EXECUTIVE_CAPABILITIES.has(p.capability) && p.target.level !== null && p.rating !== 'not_in_scope');
  const gaps = targeted.map(p => {
    const max = LEVELS.indexOf(p.target.level!);
    return p.rating === 'not_assessed' || !p.complete ? max : Math.max(0, p.gap ?? max);
  });
  const baseIndex = gaps.length ? (gaps.reduce((t, g) => t + g, 0) / gaps.length / 3) * 100 : 0;
  const modifiers: NeedVerdict['modifiers'] = [];
  const points = (id: string) => nv.modifiers.find((m: any) => m.id === id);
  if (tier === 2) modifiers.push({ id: 'tier_2', points: points('tier_2').points });
  if (tier === 3) modifiers.push({ id: 'tier_3', points: points('tier_3').points });
  // +10 when the shown expected public cloud value is 5% or more of P (F4; review H3: only a shown figure, at the
  // client's own answers; the verdict names the figure, never the money).
  const vmod = VR.scoring.needModifierId;
  const need = vm.scoring.need;
  const valueKnown = need !== null;
  const pending: NeedVerdict['pending'] = [];
  if (need?.reached) modifiers.push({ id: vmod, points: points(vmod).points });
  // F5 (ASM-FIN-086, CLM-FIN-177): a blank or Unknown answer that feeds the value range never lowers need. It replaces
  // the pending value entry (F5 review M1): the modifier is applied, with its reason, not both pending and applied.
  else if (unansweredValueInput) modifiers.push({ id: UNANSWERED_VALUE_INPUT, points: points(UNANSWERED_VALUE_INPUT).points, reason: points(UNANSWERED_VALUE_INPUT).reason });
  else if (!valueKnown) pending.push({ id: vmod, reason: nv.pendingText.valueNotShown });
  else if (vm.blocking.size) pending.push({ id: vmod, reason: fill(nv.pendingText.valueIncomplete, { points: points(vmod).points }) });
  const growth = f.spend.growth12m;
  const gm = points('growth_ge_20pct');
  if (typeof growth === 'number' && growth >= gm.threshold) modifiers.push({ id: 'growth_ge_20pct', points: gm.points });
  // F5 review D4: unknown growth adds no points, but the verdict says what it would be at 20% growth or more.
  const growthUnknown = typeof growth !== 'number';
  // Executive mode: AI scope only; the migration share comes from SC-06, a workshop question (F3 review L6).
  if (f.footprint.scopes.includes('ai_api') || f.footprint.scopes.includes('ai_platform_gpu')) modifiers.push({ id: 'ai_in_scope', points: points('ai_in_scope').points });
  const round1 = (x: number) => Math.round(x * 10) / 10;
  const needIndex = round1(Math.min(nv.cap, baseIndex + modifiers.reduce((t, m) => t + m.points, 0)));
  const bandFor = (x: number) => nv.bands.find((b: any) => x <= b.max) ?? nv.bands[nv.bands.length - 1];
  const band = bandFor(needIndex);
  if (growthUnknown) {
    const alt = bandFor(round1(Math.min(nv.cap, needIndex + gm.points)));
    pending.push({ id: 'growth_ge_20pct', reason: fill(nv.pendingText.growthUnknown, { points: gm.points, threshold: gm.threshold }) + (alt.id !== band.id ? fill(nv.pendingText.altBand, { band: alt.label }) : '') });
  }

  const blindSpots: NeedVerdict['blindSpots'] = [];
  for (const id of [...state.asked].filter(x => QUESTION.get(x).kind === 'maturity')) {
    const l = state.levels.get(id);
    if (l === undefined) blindSpots.push({ questionId: id, capability: QUESTION.get(id).capability, reason: 'blank' });
    else if (l === 'unknown') blindSpots.push({ questionId: id, capability: QUESTION.get(id).capability, reason: 'unknown' });
  }
  for (const [scope, a] of Object.entries(f.spend.byScope)) if (amountValue(a) === undefined) blindSpots.push({ fact: `spend.byScope.${scope}`, reason: 'unknown' });
  // F5 review D4: SC-05 "don't know" is a question blind spot, so confidence is Low.
  if (growthUnknown) blindSpots.push({ questionId: 'SC-05', fact: 'spend.growth12m', reason: 'unknown' });
  if (hasPublicCloud(f)) {
    for (const q of QUESTIONS.filter(x => x.kind === 'value_base' && state.asked.has(x.id))) {
      for (const path of q.sets ?? []) if (amountValue(factAt(f, path)) === undefined) blindSpots.push({ fact: path, reason: 'unknown' });
    }
  }
  const scored = [...state.asked].map(id => QUESTION.get(id)).filter(q => q.kind !== 'hypothesis');
  const answered = scored.filter(q => (q.kind === 'maturity' ? state.levels.has(q.id) : factsGiven(q, f))).length;
  return {
    needIndex, baseIndex: round1(baseIndex), modifiers,
    pending,
    valueBasis: need?.reached ? { field: need.field, thresholdField: need.thresholdField } : null,
    band: band.id, bandLabel: band.label,
    confidence: blindSpots.some(b => b.questionId) ? 'Low' : 'Medium', blindSpots,
    basisLine: fill(nv.basisLine, { answered, questions: scored.length, tier }),
    claimIds: [...nv.claimIds, ...nv.basisClaimIds.filter((id: string) => !nv.claimIds.includes(id)), ...nv.confidenceClaimIds, ...(modifiers.some(m => m.id === vmod) ? ['CLM-FIN-172'] : []), ...(modifiers.some(m => m.id === UNANSWERED_VALUE_INPUT) ? points(UNANSWERED_VALUE_INPUT).claimIds : [])]
  };
}

/**
 * F5 scoring audit (ASM-FIN-086, CLM-FIN-177): in executive mode OP-06 sets the scheduled share the value range uses
 * (ASM-FIN-052). Left blank or Unknown, LEV-04 is not quantified, so the value need modifier could be lost and the
 * blank would lower need. The verdict then takes the modifier's points if any answered option of that question would
 * reach it (no figure is shown for it), so a blank or Unknown never lowers need below an answered option.
 */
const UNANSWERED_VALUE_INPUT = 'value_input_unanswered';
function valueInputUnanswered(input: FinOpsIqV3Input, state: AnswerState, vm: ValueModelOutput): boolean {
  if (input.mode !== 'executive' || vm.scoring.need?.reached || complexityTier(input.facts).provisional) return false;
  const rule = RULES.needVerdict.modifiers.find((m: any) => m.id === UNANSWERED_VALUE_INPUT);
  return (rule.questions as string[]).some(id => {
    const level = state.levels.get(id);
    if (!state.asked.has(id) || (level !== undefined && level !== 'unknown')) return false;
    return LEVELS.some(l => evaluateFinOpsIqV3({
      ...input, answers: { ...input.answers, [id]: l }, prefilled: (input.prefilled ?? []).filter(x => x !== id)
    }).needVerdict!.modifiers.some(m => m.id === VR.scoring.needModifierId));
  });
}

/* --------------------------------- Evaluate --------------------------------- */

export function evaluateFinOpsIqV3(input: FinOpsIqV3Input): FinOpsIqV3Result {
  const f = input.facts;
  const tier = complexityTier(f);
  const state = resolveAnswers(input);
  const ctx: Context = { facts: f, levels: state.levels, values: state.values };

  const capabilities = CAPABILITIES.map(c => capabilityProfile(c, input, tier.tier, state));
  const counted = capabilities.filter(p => p.rating !== 'not_in_scope' && !p.assessedIn);
  const withTarget = counted.filter(p => p.target.level !== null);
  const atOrAbove = withTarget.filter(p => p.atOrAboveTarget).length;
  const assessed = counted.filter(p => p.answered > 0).length;
  const overrides = withTarget.filter(p => p.target.source === 'consultant_override').length;
  const h = RULES.headline;
  const statement = fill(h.statement, { atOrAbove, inScope: withTarget.length, tier: tier.tier }) +
    (overrides ? fill(h.overrideSuffix, { overrides: overrides === 1 ? '1 target' : `${overrides} targets` }) : '') +
    (input.mode === 'executive' ? fill(h.executiveSuffix, { assessed }) : '') +
    (tier.provisional ? h.provisionalSuffix : '');

  const mp01 = mp01Status(state);
  const vm = buildValueModel({
    mode: input.mode, tier: tier.tier, facts: f, assessmentDate: input.assessmentDate,
    leversInScope: LEVERS.levers.filter((l: any) => testCondition(l.scopeWhen, { facts: f, levels: new Map(), values: new Map() })).map((l: any) => l.id),
    op06: { asked: state.asked.has('OP-06'), level: state.levels.get('OP-06') },
    hypothesis: typeof state.values.get('HY-01') === 'string' ? state.values.get('HY-01') as string : undefined,
    decision01Raised: mp01 !== undefined && RULES.decisions[0].levels.includes(mp01),
    leverStartMonth: leverStartMonths(capabilities)
  });
  const findings = buildFindings(input, tier.tier, capabilities, state, vm);

  const maturityAsked = QUESTIONS.filter(q => q.kind === 'maturity' && state.asked.has(q.id)).map(q => q.id);
  const answeredIds = maturityAsked.filter(id => state.levels.has(id));
  const coverage: Coverage = {
    asked: maturityAsked.length,
    answered: answeredIds.length,
    unknown: answeredIds.filter(id => state.levels.get(id) === 'unknown').length,
    blank: maturityAsked.length - answeredIds.length,
    blankQuestions: maturityAsked.filter(id => !state.levels.has(id)),
    unknownQuestions: answeredIds.filter(id => state.levels.get(id) === 'unknown'),
    ignoredAnswers: state.ignored,
    unconfirmedPrefill: state.unconfirmedPrefill,
    unconfirmedCapabilities: capabilities.filter(p => p.unconfirmed).map(p => p.capability),
    claimIds: ['CLM-FIN-163', 'CLM-FIN-141']
  };

  const conflicts = (BANK.conflictProbes as any[])
    .filter(p => testCondition(p.when, ctx))
    .map(p => ({ id: p.id as string, probe: p.probe as string, consultantOnly: true as const }));

  const hypotheses: Record<string, AnswerValue> = {};
  for (const [id, a] of state.values) if (QUESTION.get(id).kind === 'hypothesis' && id !== 'HY-07') hypotheses[id] = a;

  const versions = {
    questionSet: BANK.questionSetVersion as string,
    capabilityModel: CAPS.modelVersion as string,
    leverLibrary: LEVERS.libraryVersion as string,
    thresholds: (thresholds as any).registryVersion as string,
    engineRules: RULES.rulesVersion as string,
    valueRules: VR.rulesVersion as string
  };
  return {
    versions: {
      engine: ENGINE_VERSION,
      kb: `questions ${versions.questionSet}; capabilities ${versions.capabilityModel}; levers ${versions.leverLibrary}; thresholds ${versions.thresholds}; rules ${versions.engineRules}; value rules ${versions.valueRules}`,
      ...versions,
      valueModel: VALUE_MODEL_VERSION,
      claimsRegister: REGISTER.version
    },
    mode: input.mode,
    ...(input.assessmentDate ? { assessmentDate: input.assessmentDate } : {}),
    tier,
    questions: { asked: QUESTIONS.filter(q => state.asked.has(q.id)).map(q => q.id) },
    capabilities,
    headline: { atOrAboveTarget: atOrAbove, inScope: withTarget.length, assessed, statement, claimIds: [...h.claimIds, ...(tier.provisional ? ['CLM-FIN-178'] : [])] },
    findings,
    topFindingIds: findings.slice(0, 5).map(x => x.id),
    needVerdict: input.mode === 'executive' && !tier.provisional ? needVerdict(input, tier.tier, capabilities, state, vm, valueInputUnanswered(input, state, vm)) : null,
    needVerdictWithheld: input.mode === 'executive' && tier.provisional ? { reason: 'spend_unknown', statement: RULES.needVerdict.withheld.statement, claimIds: [...RULES.needVerdict.withheld.claimIds] } : null,
    coverage,
    conflicts,
    hypotheses: { answers: hypotheses, scored: false, claimIds: ['CLM-FIN-144', 'CLM-FIN-164'] },
    value: vm.value
  };
}
