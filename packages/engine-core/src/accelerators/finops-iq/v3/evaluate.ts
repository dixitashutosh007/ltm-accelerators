/**
 * FinOps IQ v3 engine (plan phase F3; design: docs/cio-readiness/finops-iq/design/DESIGN.md).
 * One engine for both modes: the mode selects questions, never scoring.
 * Output: capability profile against tier targets, findings from gaps, executive need verdict, coverage.
 * No money figure: the value model is phase F4. Levers appear only as links from findings.
 */
import bank from './question-bank.json' with { type: 'json' };
import rules from './engine-rules.json' with { type: 'json' };
import capabilityModel from '../registry/capabilities.json' with { type: 'json' };
import leverLibrary from '../registry/levers.json' with { type: 'json' };
import thresholds from '../registry/thresholds.json' with { type: 'json' };
import claimsRegister from '../../../claims/claims-register.json' with { type: 'json' };

export const ENGINE_VERSION = '3.1.0';
export const VALUE_MODEL_VERSION = 'not-built (F4)';

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
  base?: Record<string, Amount | string>;
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

export interface Finding {
  id: string;
  type: 'capability_gap' | 'decision';
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
  /** Earliest start: the wave window, never before every finding in dependsOn is due to complete. */
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
}

export interface NeedVerdict {
  needIndex: number;
  baseIndex: number;
  modifiers: Array<{ id: string; points: number }>;
  /** Modifiers the design defines that cannot be applied yet. */
  pending: Array<{ id: string; reason: string }>;
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
    valueModel: string;
    claimsRegister: string;
  };
  mode: Mode;
  assessmentDate?: string;
  tier: { tier: 1 | 2 | 3; points: number; trace: string[]; override: boolean; claimIds: string[] };
  questions: { asked: string[] };
  capabilities: CapabilityProfile[];
  headline: { atOrAboveTarget: number; inScope: number; assessed: number; statement: string; claimIds: string[] };
  findings: Finding[];
  topFindingIds: string[];
  needVerdict: NeedVerdict | null;
  coverage: Coverage;
  /** Consultant-only conflict probes (DESIGN.md 7.6); they never change a rating. */
  conflicts: Array<{ id: string; probe: string; consultantOnly: true }>;
  /** Hypothesis answers, never scored and never a value input (D4). HY-07 free text is not echoed. */
  hypotheses: { answers: Record<string, AnswerValue>; scored: false; claimIds: string[] };
}

/* ------------------------------ Reference data ------------------------------ */

const BANK: any = bank;
const RULES: any = rules;
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
    return k8s / (p * share) >= 0.1;
  }
  if (id === 'ai_material') {
    if (f.footprint.scopes.includes('ai_platform_gpu')) return amountValue(f.evidence?.aiGpu?.gpuSpend) !== 0;
    const api = amountValue(f.spend.byScope.ai_api) ?? amountValue(f.evidence?.aiGpu?.aiApiSpend);
    const total = totalSpend(f);
    if (api === undefined || !total) return true;
    return api / total >= 0.05;
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
  if (local === undefined) trace.push('spend unknown -> 0');
  else if (rate === undefined) trace.push(`spend ${f.org.currency} not converted (no tier FX rate) -> 0`);
  else {
    const usd = local * rate;
    const band = t.spendBandsUsd.find((b: any) => usd >= b.min && (b.max === undefined || usd < b.max));
    points += band.points;
    trace.push(`spend about USD ${(usd / 1e6).toFixed(1)}M -> ${band.points}`);
  }
  for (const p of t.points) {
    if (testCondition(p.when, ctx) && material(p.id, f)) {
      points += p.points;
      trace.push(`${p.id} -> +${p.points}`);
    }
  }
  const band = t.bands.find((b: any) => points >= b.minPoints && (b.maxPoints === undefined || points <= b.maxPoints));
  const override = f.consultant?.complexityTierOverride;
  if (override) trace.push(`consultant override -> Tier ${override}${f.consultant?.overrideReason ? ': ' + f.consultant.overrideReason : ''}`);
  return { tier: override ?? band.tier, points, trace, override: !!override, claimIds: ['CLM-FIN-120'] };
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

function severityOf(cap: any, p: CapabilityProfile, tier: number): { severity: Finding['severity']; trace: string[] } {
  const s = RULES.severity;
  if (p.target.source === 'consultant_override' && cap.defaultTargets[`tier${tier}`] == null) return { severity: 'Low', trace: ['scope_low'] };
  const gap = Math.min(3, p.gap!);
  let rank = SEVERITIES.indexOf(s.byGap[String(gap)]);
  const trace = [`gap_${gap}`];
  if (s.foundationUplift.capabilities.includes(cap.id) && tier >= s.foundationUplift.minTier && rank < 3) { rank++; trace.push('foundation_uplift'); }
  return { severity: SEVERITIES[rank], trace };
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

function buildFindings(input: FinOpsIqV3Input, tier: number, profile: CapabilityProfile[], state: AnswerState): Finding[] {
  const text = RULES.findingText;
  const ruleBasis = [...new Set<string>([...text.claimIds, ...RULES.severity.claimIds, ...RULES.ownerRoles.claimIds, ...RULES.schedule.claimIds])].map(citation);
  const mp01 = mp01Status(state);
  const findings: Finding[] = [];
  const questionBasis = (qs: any[]) => qs.flatMap(q => q.basis).filter((b: any, i: number, all: any[]) => all.findIndex(x => x.claimId === b.claimId) === i);
  for (const p of profile) {
    if (p.gap === null || p.gap < 1 || p.target.level === null) continue;
    const cap = CAPABILITIES[CAPABILITY_INDEX.get(p.capability)!];
    const { severity, trace } = severityOf(cap, p, tier);
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
      severity, severityTrace: trace,
      title: fill(p.unconfirmed && p.rating !== 'unknown' ? text.titleUnconfirmed : text.title, values),
      businessConsequence: `${fill(text.today, values)} ${ct.consequence}`,
      decisionOrAction: fill(action, values),
      ...ownerFor(RULES.ownerRoles.byCapability[cap.id], mp01),
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: cap.wave, dependsOn: [], leverIds: leverLinks(cap, input.facts),
      evidenceToConfirm: ct.evidence,
      offeringIds: [...cap.offeringIds],
      basis: [...cap.basis, ...cap.maturityGuidance.claimIds.filter((id: string) => !cap.claimIds.includes(id)).map(citation),
        ...questionBasis(contributing).filter((b: any) => !cap.claimIds.includes(b.claimId)), ...ruleBasis],
      mode: [input.mode]
    });
  }
  // DECISION-01 (F3 review M4): no accountable owner for cloud spend.
  for (const d of RULES.decisions) {
    if (mp01 === undefined || !d.levels.includes(mp01)) continue;
    const up = tier >= d.tierUplift.minTier;
    const severity = SEVERITIES[Math.min(3, SEVERITIES.indexOf(d.severity) + (up ? 1 : 0))];
    const q = QUESTION.get(d.question);
    const unconfirmed = mp01 === 'unknown' || mp01 === 'not_answered';
    findings.push({
      id: d.id, type: 'decision', capability: d.capability, scopes: [], unconfirmed, severity,
      severityTrace: up ? ['decision_rule', 'foundation_uplift'] : ['decision_rule'],
      title: d.title, businessConsequence: `${fill(text.today, { answers: describeAnswer(q, state) })} ${d.consequence}`,
      decisionOrAction: unconfirmed ? d.actionUnconfirmed : d.action,
      ownerRole: d.ownerRole, ownerLabel: d.ownerRole,
      start: { month: 0, label: '' }, targetDuration: { months: 0, label: '' },
      wave: d.wave, dependsOn: [], leverIds: [], evidenceToConfirm: d.evidence, offeringIds: [...d.offeringIds],
      basis: [...d.claimIds.map(citation), ...questionBasis([q]), ...ruleBasis.filter(b => b.claimId !== 'CLM-FIN-141')],
      mode: [input.mode]
    });
  }
  // Waves by dependency (DESIGN.md 5.4), then the schedule: a finding starts at its wave window and never before
  // every finding it depends on is due to complete (F3 review H3).
  const byCap = new Map(findings.filter(f => f.type === 'capability_gap').map(f => [f.capability, f]));
  const sch = RULES.schedule;
  const scheduled = new Set<string>();
  const schedule = (f: Finding) => {
    if (scheduled.has(f.id)) return;
    let month = sch.waveStartMonth[String(f.wave)];
    if (f.type === 'capability_gap') {
      for (const dep of CAPABILITIES[CAPABILITY_INDEX.get(f.capability)!].dependsOn ?? []) {
        const d = byCap.get(dep);
        if (!d) continue;
        schedule(d);
        f.dependsOn.push(d.id);
        f.wave = Math.max(f.wave, d.wave) as Finding['wave'];
        month = Math.max(month, sch.waveStartMonth[String(f.wave)], d.start.month + d.targetDuration.months);
      }
    }
    const months = sch.durationMonths[f.severity];
    f.start = { month, label: fill(sch.startLabel, { month }) };
    f.targetDuration = { months, label: fill(sch.durationLabel, { months }) };
    scheduled.add(f.id);
  };
  findings.forEach(schedule);
  // Findings from real answers come before "not answered" ones of the same severity (F3 review H1).
  const blankDriven = (f: Finding) => (f.decisionOrAction.startsWith('Answer and evidence') ? 1 : 0);
  return findings.sort((a, b) =>
    SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity) || blankDriven(a) - blankDriven(b) || a.wave - b.wave ||
    (b.gap ?? 0) - (a.gap ?? 0) || CAPABILITY_INDEX.get(a.capability)! - CAPABILITY_INDEX.get(b.capability)! || (a.type === 'decision' ? 1 : -1));
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

function needVerdict(input: FinOpsIqV3Input, tier: number, profile: CapabilityProfile[], state: AnswerState): NeedVerdict {
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
  const growth = f.spend.growth12m;
  if (typeof growth === 'number' && growth >= points('growth_ge_20pct').threshold) modifiers.push({ id: 'growth_ge_20pct', points: points('growth_ge_20pct').points });
  // Executive mode: AI scope only; the migration share comes from SC-06, a workshop question (F3 review L6).
  if (f.footprint.scopes.includes('ai_api') || f.footprint.scopes.includes('ai_platform_gpu')) modifiers.push({ id: 'ai_in_scope', points: points('ai_in_scope').points });
  const round1 = (x: number) => Math.round(x * 10) / 10;
  const needIndex = round1(Math.min(nv.cap, baseIndex + modifiers.reduce((t, m) => t + m.points, 0)));
  const band = nv.bands.find((b: any) => needIndex <= b.max) ?? nv.bands[nv.bands.length - 1];

  const blindSpots: NeedVerdict['blindSpots'] = [];
  for (const id of [...state.asked].filter(x => QUESTION.get(x).kind === 'maturity')) {
    const l = state.levels.get(id);
    if (l === undefined) blindSpots.push({ questionId: id, capability: QUESTION.get(id).capability, reason: 'blank' });
    else if (l === 'unknown') blindSpots.push({ questionId: id, capability: QUESTION.get(id).capability, reason: 'unknown' });
  }
  for (const [scope, a] of Object.entries(f.spend.byScope)) if (amountValue(a) === undefined) blindSpots.push({ fact: `spend.byScope.${scope}`, reason: 'unknown' });
  if (typeof growth !== 'number') blindSpots.push({ fact: 'spend.growth12m', reason: 'unknown' });
  if (hasPublicCloud(f)) {
    for (const q of QUESTIONS.filter(x => x.kind === 'value_base' && state.asked.has(x.id))) {
      for (const path of q.sets ?? []) if (amountValue(factAt(f, path)) === undefined) blindSpots.push({ fact: path, reason: 'unknown' });
    }
  }
  const scored = [...state.asked].map(id => QUESTION.get(id)).filter(q => q.kind !== 'hypothesis');
  const answered = scored.filter(q => (q.kind === 'maturity' ? state.levels.has(q.id) : factsGiven(q, f))).length;
  return {
    needIndex, baseIndex: round1(baseIndex), modifiers,
    pending: [{ id: 'expected_value_ge_5pct_of_P', reason: 'needs the value model (F4)' }],
    band: band.id, bandLabel: band.label,
    confidence: blindSpots.some(b => b.questionId) ? 'Low' : 'Medium', blindSpots,
    basisLine: fill(nv.basisLine, { answered, questions: scored.length, tier }),
    claimIds: [...nv.claimIds, ...nv.basisClaimIds.filter((id: string) => !nv.claimIds.includes(id)), ...nv.confidenceClaimIds]
  };
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
    (input.mode === 'executive' ? fill(h.executiveSuffix, { assessed }) : '');

  const findings = buildFindings(input, tier.tier, capabilities, state);

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
    engineRules: RULES.rulesVersion as string
  };
  return {
    versions: {
      engine: ENGINE_VERSION,
      kb: `questions ${versions.questionSet}; capabilities ${versions.capabilityModel}; levers ${versions.leverLibrary}; thresholds ${versions.thresholds}; rules ${versions.engineRules}`,
      ...versions,
      valueModel: VALUE_MODEL_VERSION,
      claimsRegister: REGISTER.version
    },
    mode: input.mode,
    ...(input.assessmentDate ? { assessmentDate: input.assessmentDate } : {}),
    tier,
    questions: { asked: QUESTIONS.filter(q => state.asked.has(q.id)).map(q => q.id) },
    capabilities,
    headline: { atOrAboveTarget: atOrAbove, inScope: withTarget.length, assessed, statement, claimIds: [...h.claimIds] },
    findings,
    topFindingIds: findings.slice(0, 5).map(x => x.id),
    needVerdict: input.mode === 'executive' ? needVerdict(input, tier.tier, capabilities, state) : null,
    coverage,
    conflicts,
    hypotheses: { answers: hypotheses, scored: false, claimIds: ['CLM-FIN-144', 'CLM-FIN-164'] }
  };
}
