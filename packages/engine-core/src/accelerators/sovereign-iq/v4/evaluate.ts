/**
 * Sovereign IQ v4 engine (PLAN S3; DESIGN.md sections 2-8, owner-approved 14 Oct 2026, S2 decisions 23 Oct 2026).
 * One engine and one request contract for executive and workshop mode:
 *   1. answers to facts, with follow-up questions asked only when their trigger holds;
 *   2. regime applicability from the registry's rules (first matching rule wins);
 *   3. the required sovereignty level of each data class: max(legal floor, client choice);
 *   4. control states from the maturity answers (one effect per answer) and from D3 for location controls;
 *   5. the required control set, maturity against it, and the exposure view per regime;
 *   6. findings from gaps only, ranked, with time frames, and roadmap waves by severity and dependency.
 * Unknown counts as risk (scored 0, "unconfirmed"); a blank never flatters (scored 0, "not answered"). Scope answers
 * are never scored, and provider nationality matters only for jurisdictional immunity at L4 (D3).
 */
import bank from './question-bank.json' with { type: 'json' };
import catalogue from './controls.json' with { type: 'json' };
import fx from './exchange-rates.json' with { type: 'json' };
import registry from '../registry/regimes.json' with { type: 'json' };
import claimsRegister from '../../../claims/claims-register.json' with { type: 'json' };
import { evaluate as holds, isUnknown, type Condition, type ConditionContext } from './conditions';
import { advisory as cloudAdvisory, type Advisory } from './advisory';
import { sealView, tenderLevel, type SealView } from './seal';
import { howLtmCanHelp, type HelpItem } from './help';
import { DATA_CLASSES, DATA_CLASS_LABELS, LEVELS, PEOPLE_CLASSES, personalOutsideSubjects, personalTransfer, platformParents, scopeFacts, type Answers, type DataClass, type Facts, type Level } from './facts';

export const ENGINE_VERSION = '4.6.0';
/**
 * S4 calibration: the smallest required set over which one answer moves maturity by at most 20 points (T2 aside).
 * Below it no maturity number is shown, in either mode (owner decisions, 25 and 26 Oct 2026).
 */
export const MIN_SCORED_CONTROLS = 5;

export type Mode = 'executive' | 'workshop';
export type Grade = 'applies' | 'likely_confirm' | 'advisory' | 'not_applicable';
export type State = 0 | 1 | 2 | 3 | 'unknown' | 'not_answered';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SovereignIqV4Input {
  mode: Mode;
  answers: Answers;
  /** YYYY-MM-DD; obligations dated later do not score yet (DESIGN 4.3). */
  assessmentDate: string;
}

/* ------------------------------- Static data ------------------------------- */

export const QUESTIONS: any[] = (bank as any).questions;
export const CONTROLS: any[] = (catalogue as any).controls;
export const REGIMES: any[] = (registry as any).regimes;
const PREDICATES = (registry as any).predicates as Record<string, Condition>;
const WEIGHT: Record<string, number> = (catalogue as any).weights;
const CONTROL = new Map<string, any>(CONTROLS.map(c => [c.id, c]));
const QUESTION = new Map<string, any>(QUESTIONS.map(q => [q.id, q]));
const REGIME_NAME = new Map<string, string>(REGIMES.map(r => [r.id, r.name]));
const ZONE_NAME = new Map<string, string>((QUESTION.get('A1').options as any[]).map(o => [o.value, o.label]));
/** Display names in finding text (S6 challenge D11): the lower-case short name of a kind of data, a zone's name. */
const dataName = (c: string) => { const l = DATA_CLASS_LABELS[c] ?? c; return /^[A-Z][a-z]/.test(l) ? l[0].toLowerCase() + l.slice(1) : l; };
const zoneName = (z: string) => ZONE_NAME.get(z) ?? z;
const RATES = (fx as any).rates as Record<string, { rate: number; claim?: string }>;
const LEVEL_NUM = (l: Level) => LEVELS.indexOf(l);
const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const TIME_FRAME: Record<Severity, string> = { Critical: '0–3 months', High: '3–6 months', Medium: '6–12 months', Low: '12–24 months' };
/** Transfer routes each regime accepts for SOV.XFER.BASIS (DESIGN 4.2). */
const ROUTES: Record<string, string[]> = {
  EU_GDPR: ['adequacy', 'eu_us_dpf', 'sccs', 'bcr'],
  UK_GDPR: ['adequacy', 'uk_data_bridge', 'idta_or_addendum', 'bcr'],
  apac: ['apac_contract_or_consent', 'adequacy', 'bcr']
};
/** Roadmap dependencies (DESIGN 8.5): the prerequisite is never scheduled after the control that needs it. */
const PREREQUISITES: Record<string, string[]> = {
  'SOV.XFER.BASIS': ['SOV.DATA.MAP', 'SOV.TP.VISIBILITY'],
  'SOV.RES.LOCATION': ['SOV.DATA.MAP', 'SOV.TP.VISIBILITY', 'SOV.RES.REGION_LOCK'],
  'SOV.KEY.REVOCATION': ['SOV.KEY.CUSTODY']
};
const AI_ROLES = ['deployer_internal', 'deployer_high_impact', 'provider_ai_system', 'gpai_provider', 'integrator_own_name'];

/* --------------------------------- Results --------------------------------- */

export interface RegimeResult {
  regime: string; name: string; kind: string; market: string; grade: Grade;
  rule: string | null; reason: string; basis: string; claims: string[];
  /** The rule's verification status; an UNSOURCED rule is consultant-only and hidden in client mode (S2 change 2). */
  verification: string; consultantOnly: boolean;
  nis2Class?: 'essential' | 'important' | 'essential_or_important';
  status: string; statusAsOf: string; volatile: boolean;
}

export interface ClassRequirement {
  dataClass: DataClass; required: Level; choice: Level | 'unknown' | null;
  /** The level an EU tender's minimum SEALs need (L3, DESIGN 3.4 reverse use); null when no tender covers the class. */
  tender: Level | null;
  floor: { level: Level; regime: string; zone: string[]; provisional: boolean; consultantOnly: boolean } | null;
  allowedZone: string[]; allowedZoneSource: 'floor' | 'workshop' | 'default' | 'none';
  /** Workshop regions (L2) outside a legal floor's zone: the floor wins and a conflict finding is raised (S4). */
  zoneConflict?: string[];
}

export interface ControlResult {
  control: string; name: string; weight: number; scope: 'org' | 'class';
  /** Org controls: one state. Class controls: the state per class that needs it. */
  state: State; byClass?: Partial<Record<DataClass, State>>;
  score: number; unconfirmed: boolean; notAnswered: boolean;
  requiredBy: { levels: DataClass[]; regimes: Array<{ regime: string; grade: Grade; basis: string }> };
}

export interface ExposureResult {
  regime: string; grade: Grade; rag: 'red' | 'amber' | 'green' | 'not_rated';
  controls: Array<{ control: string; state: State }>;
  assessed: number; required: number; reason: string;
  upcoming: Array<{ control: string; appliesFrom: string }>; pendingSource: string[];
  cap: CapFigure | null; penaltyModel: string; penaltyNote: string;
}

export interface CapFigure {
  regime: string; grade: Grade; article: string; label: 'cap, not expected fine';
  /** Exact when the worldwide turnover is given (A5); a range from the A4 band otherwise (Q2); null when not computable. */
  amount: number | null; range: [number, number | null] | null; currency: string;
  eur: number; basis: string; rateDate: string | null; claims: string[];
}

export interface Finding {
  id: string; type: 'control_gap' | 'scope_confirmation' | 'conflict' | 'decision';
  control?: string; dataClasses: DataClass[]; requiredLevel: Level | null;
  state?: State; unconfirmed: boolean; upcoming?: string;
  regimes: Array<{ regime: string; grade: Grade; article: string }>;
  severity: Severity; title: string; businessConsequence: string; ownerRole: string; timeFrame: string; remedy: string;
  offeringRefs: string[]; referral?: string; sources: string[]; mode: Mode; consultantOnly: boolean;
  rank: number; wave: number;
}

export interface SovereignIqV4Result {
  mode: Mode; assessmentDate: string;
  versions: { engine: string; questionSet: string; controls: string; registry: string; registryStatusAsOf: string; claimsRegister: string };
  asked: string[]; ignoredAnswers: string[];
  facts: Facts;
  regimes: RegimeResult[];
  requirements: ClassRequirement[];
  maturity: {
    score: number | null; band: string | null; wording: string; withheld: boolean;
    controlsAssessed: number; requiredControls: number; coverage: number; provisional: boolean;
    unconfirmed: string[]; notAnswered: string[]; label: string | null;
    /** Maturity by control area (controls.json domains); empty when no headline number is shown. */
    byDomain: Array<{ domain: string; label: string; score: number; controls: number }>;
  };
  controls: ControlResult[];
  exposure: { regimes: ExposureResult[]; summary: string; largestCap: CapFigure | null; capNote: string };
  foreignAccess: Array<{ dataClass: DataClass; parents: string[]; controls: Array<{ control: string; state: State }> }>;
  findings: Finding[];
  topGaps: Finding[];
  roadmap: Array<{ wave: number; findings: string[] }>;
  pendingSource: Array<{ regime: string; control: string }>;
  notes: string[];
  /** Sovereign Cloud Advisory: placement on AWS, Azure and Google Cloud, and platform actions per finding (PLAN S7). */
  advisory: Advisory;
  /** The SEAL view: minimum provider SEAL per objective for each kind of data, and tender minimums (PLAN S7b). */
  seal: SealView;
  /** How LTM can help: the offerings the findings and the placement matrix call for, client-visible part only (PLAN S8). */
  help: HelpItem[];
}

/* ---------------------------------- Engine --------------------------------- */

const ctxOf = (facts: Facts): ConditionContext => ({ facts, predicates: PREDICATES });
const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const stateScore = (s: State) => (typeof s === 'number' ? s / 3 : 0);
const minState = (states: State[]): State => {
  if (!states.length) return 'not_answered';
  const nums = states.map(s => (typeof s === 'number' ? s : -1));
  const lowest = Math.min(...nums);
  if (lowest >= 0) return lowest as State;
  return states.includes('unknown') ? 'unknown' : 'not_answered';
};

/** Questions asked in the mode under the current facts. Executive questions with a trigger (T2, I1) ask only when it holds. */
function askedQuestions(mode: Mode, facts: Facts): string[] {
  const ctx = ctxOf(facts);
  return QUESTIONS.filter(q => {
    if (mode === 'executive' && q.mode !== 'executive') return false;
    return !q.trigger || holds(q.trigger, ctx);
  }).map(q => q.id);
}

function applicability(facts: Facts): RegimeResult[] {
  const ctx = ctxOf(facts);
  return REGIMES.map(r => {
    const rule = r.applicability.rules.find((x: any) => holds(x.when, ctx));
    const grade: Grade = rule ? rule.grade : r.applicability.default;
    const out: RegimeResult = {
      regime: r.id, name: r.name, kind: r.kind, market: r.market, grade,
      rule: rule ? rule.id : null, reason: rule ? rule.reason : 'No applicability rule matched your answers.',
      basis: rule?.basis ?? '', claims: rule?.claims ?? [], verification: rule?.verification?.status ?? 'V',
      consultantOnly: rule?.verification?.status === 'UNSOURCED' || grade === 'not_applicable',
      status: r.status, statusAsOf: r.statusAsOf, volatile: !!r.volatile
    };
    if (r.id === 'EU_NIS2' && grade === 'applies') out.nis2Class = nis2Class(facts, rule.id);
    return out;
  });
}

/**
 * NIS2 entity class from the rule that fired (DESIGN 5.4.1): special types by Art. 3(1)(b)-(c); sector and size by
 * Art. 3(1)(a) and 3(2). A self-classification (rule 3) takes the higher of the stated and the derived class.
 */
function nis2Class(facts: Facts, ruleId: string): 'essential' | 'important' | 'essential_or_important' {
  const ctx = ctxOf(facts);
  const size = facts['derived.size_class_eu'];
  const mediumUp = ['large', 'medium', 'medium_or_large'].includes(size as string);
  const special = facts['ent.nis2_special_type'];
  const derived = (): 'essential' | 'important' | 'essential_or_important' | null => {
    if (['qtsp', 'tld_registry', 'dns_provider'].includes(special as string)) return 'essential';
    if (['non_qualified_tsp', 'public_ecomms'].includes(special as string)) return mediumUp ? 'essential' : 'important';
    if (holds({ derived: 'nis2_annex_i' }, ctx) && size === 'large') return 'essential';
    if (holds({ derived: 'nis2_annex_i' }, ctx) && size === 'medium_or_large') return 'essential_or_important';
    if (holds({ derived: 'nis2_sector' }, ctx) && mediumUp) return 'important';
    return null;
  };
  const d = derived();
  if (ruleId === 'EU_NIS2.3') {
    const stated = facts['ent.nis2_self_class'] as 'essential' | 'important';
    return stated === 'essential' || d === 'essential' ? 'essential' : d === 'essential_or_important' ? 'essential_or_important' : 'important';
  }
  return d ?? 'important';
}

function requirements(facts: Facts, regimes: RegimeResult[]): ClassRequirement[] {
  const ctx = ctxOf(facts);
  const graded = new Map(regimes.map(r => [r.regime, r]));
  const classes = list(facts['data.classes']) as DataClass[];
  const choice = facts['data.choice_level'] as Record<string, Level | 'unknown'>;
  const given = facts['data.allowed_zone_given'] as Record<string, string[]>;
  const hq = isUnknown(facts['org.hq']) ? [] : [facts['org.hq'] as string];
  const people = list(facts['data.subject_regions']).filter(z => z !== 'unknown');
  const est = list(facts['org.establishments']).filter(z => z !== 'unknown' && z !== 'none_outside_hq');
  const minimums = facts['data.tender_minimums'] as Record<string, number> | undefined;
  const tenderFor = minimums ? tenderLevel(minimums).level : null;
  const tenderClasses = list(facts['data.tender_classes']);
  return classes.map(c => {
    // Legal floor: the highest floor of a regime graded applies or likely_confirm whose condition holds for the class.
    let floor: ClassRequirement['floor'] = null;
    for (const r of REGIMES) {
      const g = graded.get(r.id)!;
      if (g.grade !== 'applies' && g.grade !== 'likely_confirm') continue;
      for (const f of r.levelFloors ?? []) {
        if (!f.dataClasses.includes(c) || (f.when && !holds(f.when, ctx))) continue;
        if (!floor || LEVEL_NUM(f.level) > LEVEL_NUM(floor.level)) {
          const unsourced = f.verification?.status === 'UNSOURCED';
          floor = { level: f.level, regime: r.id, zone: f.zone, provisional: unsourced || g.grade === 'likely_confirm', consultantOnly: unsourced };
        }
      }
    }
    const ch = choice[c] ?? null;
    const chosen = ch && ch !== 'unknown' ? ch : null;
    // An UNSOURCED floor is consultant-only and provisional; it still sets the requirement the consultant sees.
    const tender = tenderFor && tenderClasses.includes(c) ? tenderFor : null;
    const required: Level = [floor?.level, chosen, tender].filter(Boolean).reduce<Level>((a, b) => (LEVEL_NUM(b as Level) > LEVEL_NUM(a) ? (b as Level) : a), 'L0');
    let allowedZone: string[] = [], source: ClassRequirement['allowedZoneSource'] = 'none';
    let zoneConflict: string[] | undefined;
    if (floor) { allowedZone = floor.zone; source = 'floor'; const outside = (given[c] ?? []).filter(z => !floor!.zone.includes(z)); if (outside.length) zoneConflict = outside; }
    else if (given[c]?.length) { allowedZone = given[c]; source = 'workshop'; }
    else if (LEVEL_NUM(required) >= 1) { allowedZone = [...new Set([...hq, ...(PEOPLE_CLASSES.includes(c) ? people : est)])]; source = 'default'; }
    return { dataClass: c, required, choice: ch, tender, floor, allowedZone, allowedZoneSource: source, ...(zoneConflict ? { zoneConflict } : {}) };
  });
}

/** Facts after applicability and levels: the grades and the highest required level, which follow-up triggers read. */
function withDerived(facts: Facts, regimes: RegimeResult[], reqs: ClassRequirement[]): Facts {
  const f: Facts = { ...facts };
  for (const r of regimes) f[`derived.grade.${r.regime.toLowerCase()}`] = r.grade;
  f['derived.max_required_level'] = reqs.reduce<Level>((a, r) => (LEVEL_NUM(r.required) > LEVEL_NUM(a) ? r.required : a), 'L0');
  f['derived.personal_transfer'] = personalTransfer(f);
  return f;
}

/** The state an answer sets, from the option's state (maturity questions only). */
function answerState(qid: string, answers: Answers, asked: Set<string>): State | 'ignored' {
  if (!asked.has(qid)) return 'not_answered';
  const q = QUESTION.get(qid);
  let v = answers[qid];
  if (q.type === 'compound' && v && typeof v === 'object') v = (v as Record<string, unknown>).screening;
  if (v === undefined || v === null || v === '') return 'not_answered';
  const opt = (q.options ?? []).find((o: any) => o.value === v);
  if (!opt || opt.state === undefined) return 'not_answered';
  return opt.state as State | 'ignored';
}

/** Location of a class against its allowed zone: any zone outside 0; otherwise any unknown cell unknown; all inside 3. */
function locationState(zones: string[] | undefined, allowed: string[]): State {
  if (!zones || !zones.length) return 'not_answered';
  if (zones.some(z => z !== 'unknown' && !allowed.includes(z))) return 0;
  return zones.includes('unknown') ? 'unknown' : 3;
}

/** SOV.JUR.IMMUNITY for a class (derived, DESIGN 4.2): every platform holding it has its parent in the allowed zone. */
function immunityState(c: DataClass, facts: Facts, allowed: string[]): State {
  const perClass = (facts['data.class_platforms'] as Record<string, string[]>)[c];
  const platforms = perClass?.length ? perClass : list(facts['plat.in_scope']);
  if (!platforms.length) return 'not_answered';
  const foreign: string[] = [];
  let unknown = false;
  for (const p of platforms) {
    const parents = platformParents(p, facts);
    if (parents.includes('unknown')) { unknown = true; continue; }
    if (parents.some(z => !allowed.includes(z))) foreign.push(p);
  }
  if (foreign.length && foreign.every(p => p === 'partner_operated_cloud')) return 2;
  if (foreign.length) return 0;
  return unknown ? 'unknown' : 3;
}

/** SOV.XFER.BASIS (DESIGN 4.2): the lowest state across the regimes that require a transfer basis. */
/** Art. 46 tools whose validity depends on a transfer impact (or risk) assessment of the destination's laws. */
const ASSESSED_ROUTES = ['sccs', 'idta_or_addendum', 'bcr'];

/**
 * SOV.XFER.BASIS (DESIGN 4.2, S4 owner decision 25 Oct 2026): the lowest state across the regimes that require a
 * transfer basis. A regime covered only by contractual clauses, the IDTA or Addendum, or BCRs is capped by the
 * transfer assessment (T2): complete 3; partial or none 1; destination risks not closed by the safeguards 0 (CJEU
 * C-311/18; EDPB Recommendations 01/2020; the Meta 2023 and Google Analytics decisions, S4 reference scenarios).
 */
function transferBasisState(facts: Facts, requiring: string[], asked: Set<string>, t2: unknown): { state: State; conflict: boolean; missing: Array<{ regime: string; routes: string[] }> } {
  if (!asked.has('T1') || isUnknown(facts['xfer.mechanisms']) && !list(facts['xfer.mechanisms']).length) return { state: 'not_answered', conflict: false, missing: [] };
  const mech = list(facts['xfer.mechanisms']);
  if (mech.includes('undocumented')) return { state: 0, conflict: false, missing: [] };
  if (mech.includes('unknown')) return { state: 'unknown', conflict: false, missing: [] };
  if (mech.includes('no_transfer') && personalOutsideSubjects(facts)) return { state: 'unknown', conflict: true, missing: [] };
  const missing: Array<{ regime: string; routes: string[] }> = [];
  let lowest: State = 3;
  const assessed: State = !asked.has('T2') ? 'not_answered' : t2 === 'complete' ? 3 : t2 === 'risks_open' ? 0 : t2 === 'partial' || t2 === 'none' ? 1 : t2 === 'unknown' ? 'unknown' : 'not_answered';
  const states: State[] = [];
  for (const r of requiring) {
    const routes = ROUTES[r] ?? ROUTES.apac;
    const covering = mech.filter(m => routes.includes(m));
    if (covering.length && covering.every(m => ASSESSED_ROUTES.includes(m))) { states.push(assessed); continue; }
    if (covering.length) continue;
    if (mech.includes('no_transfer') && !mech.some(m => m !== 'no_transfer')) continue;
    lowest = 1;
    if (!mech.includes('derogation')) missing.push({ regime: r, routes });
  }
  return { state: minState([lowest, ...states]), conflict: false, missing };
}

/* ------------------------------ Penalty caps ------------------------------- */

const BAND_LABEL: Record<string, string> = { lt10m: 'under EUR 10M', '10m_50m': 'EUR 10M-50M', '50m_250m': 'EUR 50M-250M', '250m_1bn': 'EUR 250M-1bn', '1bn_10bn': 'EUR 1bn-10bn', gt10bn: 'over EUR 10bn' };
const BAND_EUR: Record<string, [number, number | null]> = {
  lt10m: [0, 10e6], '10m_50m': [10e6, 50e6], '50m_250m': [50e6, 250e6], '250m_1bn': [250e6, 1e9], '1bn_10bn': [1e9, 10e9], gt10bn: [10e9, null]
};
const toEur = (amount: number, currency: string) => amount / (RATES[currency]?.rate ?? NaN);
const fromEur = (eur: number, currency: string) => eur * (RATES[currency]?.rate ?? NaN);
const rateClaims = (...currencies: string[]) => [...new Set(currencies.map(c => RATES[c]?.claim).filter(Boolean) as string[])];
const money = (n: number, cur: string) => `${cur} ${n >= 1e9 ? `${+(n / 1e9).toFixed(2)}bn` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n.toLocaleString('en-GB')}`;

/** The tiers that can set this regime's headline cap (DESIGN 7.2): the tier tied to the obligations in scope. */
function headlineTiers(r: any, g: RegimeResult, facts: Facts): any[] {
  const tiers: any[] = (r.penalty?.tiers ?? []).filter((t: any) => t.fixedAmount != null || t.turnoverPercent != null);
  if (r.id === 'EU_AI_ACT') return tiers.filter(t => t.article === 'Art. 99(4)');
  if (r.id === 'EU_NIS2') return tiers.filter(t => (g.nis2Class === 'important' ? /Important/ : /Essential/).test(t.label));
  if (r.id === 'EU_GDPR' || r.id === 'UK_GDPR') return tiers.slice(0, 1);
  if (r.id === 'CN_PIPL') return tiers;
  return tiers;
}

/**
 * The largest computable cap of one regime, or null. Worldwide-turnover limbs need the turnover (D4): exact from A5,
 * a range from the A4 band otherwise (Q2). Limbs on a turnover we never collect (national, adjusted, revenue
 * excluding unrelated) are not computed; the fixed limb is shown alone. Models that never become a single figure
 * (national, not_quantified, per_violation, periodic, not_applicable_to_client) return null.
 */
function regimeCap(r: any, g: RegimeResult, facts: Facts): CapFigure | null {
  const model = r.penalty?.model;
  if (!['turnover_greater_of', 'turnover_lower_of', 'national_minimum_maximum', 'turnover_percent', 'fixed', 'either_or'].includes(model)) return null;
  if (r.penalty.quantifyWhen && !holds(r.penalty.quantifyWhen, ctxOf(facts))) return null;
  const exact = facts['org.turnover_amount'] as { amount: number; currency: string } | undefined;
  const band = BAND_EUR[facts['org.turnover_band_eur'] as string];
  const turnover = exact && exact.amount > 0 && RATES[exact.currency] ? exact : null;
  const sme = r.id === 'EU_AI_ACT' && ['small_or_micro', 'medium'].includes(facts['derived.size_class_eu'] as string);
  let best: CapFigure | null = null;
  for (const t of headlineTiers(r, g, facts)) {
    const fixedEur = t.fixedAmount != null ? toEur(t.fixedAmount, t.currency) : null;
    const worldwide = t.turnoverPercent != null && t.turnoverBasis === 'worldwide_prior_year';
    const pct = (eurTurnover: number) => (eurTurnover * t.turnoverPercent) / 100;
    const combine = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : model === 'turnover_lower_of' || sme ? Math.min(a, b) : Math.max(a, b));
    let fig: CapFigure | null = null;
    const claims = [...new Set([...(t.claims ?? []), ...(r.penalty.claims ?? [])])];
    if (worldwide && turnover) {
      const tEur = toEur(turnover.amount, turnover.currency);
      const eur = combine(fixedEur, pct(tEur))!;
      const pctWins = fixedEur == null || (sme ? pct(tEur) <= fixedEur : pct(tEur) >= fixedEur);
      const currency = pctWins ? turnover.currency : t.currency;
      const amount = pctWins ? (turnover.amount * t.turnoverPercent) / 100 : t.fixedAmount;
      fig = {
        regime: r.id, grade: g.grade, article: t.article, label: 'cap, not expected fine', amount, range: null, currency, eur,
        basis: pctWins ? `${t.turnoverPercent}% of ${money(turnover.amount, turnover.currency)} worldwide turnover` : `${money(t.fixedAmount, t.currency)} fixed limb (${t.turnoverPercent}% of ${money(turnover.amount, turnover.currency)} is lower)`,
        rateDate: currency === 'EUR' && t.currency === 'EUR' && turnover.currency === 'EUR' ? null : (fx as any).date,
        claims: [...claims, ...rateClaims(turnover.currency, t.currency)]
      };
    } else if (worldwide && band) {
      const lo = combine(fixedEur, pct(band[0]))!, hi = band[1] == null ? null : combine(fixedEur, pct(band[1]));
      fig = {
        regime: r.id, grade: g.grade, article: t.article, label: 'cap, not expected fine', amount: null, range: [Math.round(lo), hi == null ? null : Math.round(hi)], currency: 'EUR', eur: hi ?? lo,
        basis: `From the turnover band (${BAND_LABEL[facts['org.turnover_band_eur'] as string]}): ${t.fixedAmount != null ? `${money(t.fixedAmount, t.currency)} or ` : ''}${t.turnoverPercent}% of turnover${t.fixedAmount != null ? (model === 'turnover_lower_of' || sme ? ', whichever is lower' : ', whichever is higher') : ''}`,
        rateDate: t.currency && t.currency !== 'EUR' ? (fx as any).date : null, claims: [...claims, ...rateClaims(t.currency)]
      };
    } else if (fixedEur != null && (!t.turnoverPercent || !worldwide)) {
      // A fixed maximum, or a fixed limb whose percentage limb rests on a turnover we never collect.
      fig = {
        regime: r.id, grade: g.grade, article: t.article, label: 'cap, not expected fine', amount: t.fixedAmount, range: null, currency: t.currency, eur: fixedEur,
        basis: t.turnoverPercent ? `${money(t.fixedAmount, t.currency)} fixed limb; the ${t.turnoverPercent}% limb is not computed (it rests on a turnover the assessment does not collect)` : `${money(t.fixedAmount, t.currency)} fixed maximum`,
        rateDate: t.currency !== 'EUR' ? (fx as any).date : null, claims: [...claims, ...rateClaims(t.currency)]
      };
    }
    // A band whose ends give the same cap (the fixed limb wins across it) is one figure, not a range.
    if (fig?.range && fig.range[1] != null && Math.abs(fig.range[1] - fig.range[0]) < 1) fig = { ...fig, amount: fig.range[0], range: null };
    if (fig && (!best || fig.eur > best.eur)) best = fig;
  }
  if (best && model === 'either_or') best = { ...best, basis: `${best.basis}; theoretical upper bound of two alternative ceilings (Art. 66)` };
  if (best && model === 'national_minimum_maximum') best = { ...best, basis: `At least ${best.basis} (national law may set higher)` };
  return best;
}

/* --------------------------------- Evaluate -------------------------------- */

export function evaluateSovereignIqV4(input: SovereignIqV4Input): SovereignIqV4Result {
  const { mode, answers, assessmentDate } = input;
  if (mode !== 'executive' && mode !== 'workshop') throw new Error('mode must be executive or workshop');

  // 1-3. Facts, applicability and levels, iterated because follow-up questions depend on grades and levels.
  let asked: string[] = [];
  let facts: Facts = {}, regimes: RegimeResult[] = [], reqs: ClassRequirement[] = [];
  for (let pass = 0; pass < 6; pass++) {
    const given = Object.fromEntries(Object.entries(answers).filter(([q]) => pass === 0 ? QUESTION.get(q)?.mode !== 'follow_up' && (mode === 'workshop' || QUESTION.get(q)?.mode === 'executive') : asked.includes(q)));
    facts = scopeFacts(given, mode);
    regimes = applicability(facts);
    reqs = requirements(facts, regimes);
    facts = withDerived(facts, regimes, reqs);
    const next = askedQuestions(mode, facts);
    if (pass > 0 && next.join() === asked.join()) break;
    asked = next;
  }
  const askedSet = new Set(asked);
  const ignoredAnswers = Object.keys(answers).filter(q => !askedSet.has(q)).sort();
  const graded = new Map(regimes.map(r => [r.regime, r]));
  const inScope = (g: Grade) => g === 'applies' || g === 'likely_confirm';
  const classes = reqs.map(r => r.dataClass);
  const reqOf = new Map(reqs.map(r => [r.dataClass, r]));
  const ctx = ctxOf(facts);
  const aiUsed = list(facts['ent.ai_roles']).some(r => AI_ROLES.includes(r) || r === 'unknown');
  const platforms = list(facts['plat.in_scope']);

  // Regime-required controls (DESIGN 4.3) with the two guards: UNSOURCED rows and future obligations do not score.
  const regimeRows: Array<{ regime: string; control: string; basis: string; dataClasses?: DataClass[] }> = [];
  const upcoming: Array<{ regime: string; control: string; appliesFrom: string }> = [];
  const pendingSource: Array<{ regime: string; control: string }> = [];
  for (const r of REGIMES) {
    if (!inScope(graded.get(r.id)!.grade)) continue;
    for (const rc of r.requiredControls ?? []) {
      if (rc.when && !holds(rc.when, ctx)) continue;
      if (rc.verification?.status === 'UNSOURCED') { pendingSource.push({ regime: r.id, control: rc.control }); continue; }
      if (rc.appliesFrom && rc.appliesFrom > assessmentDate) { upcoming.push({ regime: r.id, control: rc.control, appliesFrom: rc.appliesFrom }); continue; }
      regimeRows.push({ regime: r.id, control: rc.control, basis: rc.basis, dataClasses: rc.dataClasses });
    }
  }

  // 4. Control states.
  const transferRegimes = [...new Set(regimeRows.filter(x => x.control === 'SOV.XFER.BASIS').map(x => x.regime))];
  const transfer = transferBasisState(facts, transferRegimes, askedSet, answers.T2);
  const orgState = (c: any): State => {
    if (c.id === 'SOV.XFER.BASIS') return transfer.state;
    // The lower of the feeding questions that were asked; a question the mode did not ask is left out, but one asked
    // and left blank counts as not answered (a blank never flatters). 'ignored' (B6: no CTP dependency) is left out.
    const states = c.questions.filter((q: string) => askedSet.has(q)).map((q: string) => answerState(q, answers, askedSet)).filter((s: State | 'ignored') => s !== 'ignored') as State[];
    if (!states.length) return 'not_answered';
    return c.combine === 'lower' ? minState(states) : states[0];
  };
  const classState = (c: any, cls: DataClass): State => {
    const req = reqOf.get(cls)!;
    const loc = (facts['data.location'] as Record<string, { primary?: string[]; backup?: string[] }>)[cls];
    if (c.id === 'SOV.RES.LOCATION') return locationState(loc?.primary, req.allowedZone);
    if (c.id === 'SOV.BACKUP.LOCATION') return locationState(loc?.backup, req.allowedZone);
    return immunityState(cls, facts, req.allowedZone);
  };

  // 5. The required control set R (DESIGN 7.1), restricted to the controls measured in the mode.
  const results: ControlResult[] = [];
  for (const c of CONTROLS) {
    if (c.scored === false) continue;
    if (mode === 'executive' && !c.exec) continue;
    if (c.onlyIfPlatforms && !platforms.some(p => c.onlyIfPlatforms.includes(p))) continue;
    const levelClasses = c.level && !(c.onlyIfAi && !aiUsed)
      ? classes.filter(cls => LEVEL_NUM(reqOf.get(cls)!.required) >= LEVEL_NUM(c.level)) : [];
    const rows = regimeRows.filter(x => x.control === c.id);
    if (!levelClasses.length && !rows.length) continue;
    const requiredBy = {
      levels: levelClasses,
      regimes: [...new Map(rows.map(x => [x.regime, { regime: x.regime, grade: graded.get(x.regime)!.grade, basis: x.basis }])).values()]
    };
    let state: State, byClass: ControlResult['byClass'], score: number;
    if (c.scope === 'class') {
      const need = new Set<DataClass>(levelClasses);
      for (const x of rows) for (const cls of x.dataClasses ?? classes) if (classes.includes(cls)) need.add(cls);
      const ordered = DATA_CLASSES.filter(cls => need.has(cls));
      if (!ordered.length) continue;
      byClass = Object.fromEntries(ordered.map(cls => [cls, classState(c, cls)]));
      const states = Object.values(byClass) as State[];
      state = minState(states);
      score = states.reduce<number>((a, s) => a + stateScore(s), 0) / states.length;
    } else {
      state = orgState(c);
      score = stateScore(state);
    }
    const states = byClass ? (Object.values(byClass) as State[]) : [state];
    results.push({
      control: c.id, name: c.name, weight: WEIGHT[c.weight], scope: c.scope, state, byClass, score,
      unconfirmed: states.includes('unknown'), notAnswered: states.includes('not_answered'), requiredBy
    });
  }

  // Maturity (DESIGN 7.1): weighted mean of control scores; coverage below 60% makes the headline provisional.
  const wSum = results.reduce((a, r) => a + r.weight, 0);
  const answeredWeight = results.reduce((a, r) => a + (r.notAnswered && r.state === 'not_answered' ? 0 : r.weight), 0);
  // A number only over at least MIN_SCORED_CONTROLS controls: below that, one answer can move it by more than the
  // agreed 20 points (S4 calibration).
  const withheld = results.length > 0 && results.length < MIN_SCORED_CONTROLS;
  const score = wSum && !withheld ? Math.round((100 * results.reduce((a, r) => a + r.weight * r.score, 0)) / wSum) : null;
  let band = score == null ? null : score >= 80 ? 'Sovereign-ready' : score >= 60 ? 'Managed' : score >= 40 ? 'Developing' : 'Exposed';
  let wording = withheld ? (mode === 'executive'
    ? `Too few required controls are measured in executive mode for a reliable score (${results.length}); the workshop gives the score`
    : `Too few controls are required at the level you set for a reliable score (${results.length}); each control's state is shown instead`) : score == null ? 'Nothing required at the level you set' : {
    'Sovereign-ready': 'Controls meet the level your data requires', Managed: 'Most required controls in place; gaps are specific',
    Developing: 'Some required controls in place; material gaps remain', Exposed: 'Controls do not yet meet the level your data requires'
  }[band!]!;
  const coverage = wSum ? answeredWeight / wSum : 1;
  const byDomain = score == null ? [] : ((catalogue as any).domains as Array<{ id: string; label: string; controls: string[] }>).map(d => {
    const rs = results.filter(r => d.controls.includes(r.control));
    const w = rs.reduce((a, r) => a + r.weight, 0);
    return { domain: d.id, label: d.label, score: w ? Math.round((100 * rs.reduce((a, r) => a + r.weight * r.score, 0)) / w) : -1, controls: rs.length };
  }).filter(d => d.controls > 0);
  const totalRequiredControls = mode === 'executive' ? countRequired(classes, reqOf, regimeRows, aiUsed, platforms) : results.length;

  // Exposure view (DESIGN 7.2).
  const resultOf = new Map(results.map(r => [r.control, r]));
  const exposure: ExposureResult[] = [];
  for (const r of REGIMES) {
    const g = graded.get(r.id)!;
    if (g.grade === 'not_applicable') continue;
    const rows = regimeRows.filter(x => x.regime === r.id);
    const allControls = [...new Set(rows.map(x => x.control))];
    const measured = allControls.map(c => resultOf.get(c)).filter(Boolean) as ControlResult[];
    let rag: ExposureResult['rag'] = 'not_rated', reason = '';
    if (r.kind === 'obligation' && inScope(g.grade) && allControls.length) {
      if (!measured.length) { rag = 'not_rated'; reason = 'No required control is measured in this mode.'; }
      else {
        const red = measured.some(m => m.weight >= 2 && (m.state === 0 || m.state === 'unknown' || m.state === 'not_answered'));
        const amber = measured.some(m => m.state !== 3);
        rag = red ? 'red' : amber ? 'amber' : 'green';
        reason = red ? 'A critical or high-weight required control is absent, unconfirmed or not answered.' : amber ? 'Some required controls are below full.' : 'Every required control is in place.';
      }
    } else reason = r.kind === 'exposure' ? 'Foreign-access law: no duty on you; disclosure exposure.' : r.kind === 'obligation' && inScope(g.grade) ? 'No control in this assessment is required by this regime under your answers.' : g.grade === 'advisory' ? 'Advisory: relevant context with no settled duty for you.' : '';
    const cap = inScope(g.grade) ? regimeCap(r, g, facts) : null;
    exposure.push({
      regime: r.id, grade: g.grade, rag, controls: measured.map(m => ({ control: m.control, state: m.state })),
      assessed: measured.length, required: allControls.length, reason,
      upcoming: upcoming.filter(u => u.regime === r.id).map(u => ({ control: u.control, appliesFrom: u.appliesFrom })),
      pendingSource: pendingSource.filter(p => p.regime === r.id).map(p => p.control),
      cap, penaltyModel: r.penalty?.model ?? 'not_quantified', penaltyNote: r.penalty?.note ?? ''
    });
  }
  const count = (g: Grade) => regimes.filter(r => r.grade === g).length;
  const countRag = (x: string) => exposure.filter(e => e.rag === x).length;
  const caps = exposure.map(e => e.cap).filter(Boolean) as CapFigure[];
  const largestCap = caps.reduce<CapFigure | null>((a, c) => (!a || c.eur > a.eur ? c : a), null);
  const turnoverGiven = !!facts['org.turnover_amount'] || !!BAND_EUR[facts['org.turnover_band_eur'] as string];

  // Foreign-access exposure line (informational): classes held by providers whose parent is outside the class's zone.
  const foreignAccess = reqs.filter(r => r.allowedZone.length).map(r => {
    const perClass = (facts['data.class_platforms'] as Record<string, string[]>)[r.dataClass];
    const parents = [...new Set((perClass?.length ? perClass : platforms).flatMap(p => platformParents(p, facts)))].filter(z => z !== 'unknown' && !r.allowedZone.includes(z));
    return { dataClass: r.dataClass, parents, controls: ['SOV.KEY.CUSTODY', 'SOV.OPS.ADMIN_ACCESS', ...(r.required === 'L4' ? ['SOV.JUR.IMMUNITY'] : [])].map(c => ({ control: c, state: (resultOf.get(c)?.state ?? orgStateIfAsked(c)) as State })) };
  }).filter(x => x.parents.length);
  function orgStateIfAsked(id: string): State { const c = CONTROL.get(id); return c.scope === 'org' ? orgState(c) : 'not_answered'; }

  // 6. Findings (DESIGN 8).
  const findings: Finding[] = [];
  for (const r of results) {
    if (r.state === 3 && !r.unconfirmed && !r.notAnswered) continue;
    const c = CONTROL.get(r.control);
    const strongClasses = r.requiredBy.levels.filter(cls => LEVEL_NUM(reqOf.get(cls)!.required) >= 2);
    const appliesRegimes = r.requiredBy.regimes.filter(x => x.grade === 'applies');
    const strong = appliesRegimes.length > 0 || strongClasses.length > 0;
    const severity = severityOf(c.weight, strong, r.state);
    const affected = r.byClass ? (Object.entries(r.byClass).filter(([, s]) => s !== 3).map(([k]) => k) as DataClass[]) : r.requiredBy.levels;
    const reqLevel = affected.reduce<Level | null>((a, cls) => { const l = reqOf.get(cls)?.required; return l && (!a || LEVEL_NUM(l) > LEVEL_NUM(a)) ? l : a; }, null);
    findings.push({
      id: `F-${r.control}`, type: 'control_gap', control: r.control, dataClasses: affected, requiredLevel: reqLevel,
      state: r.state, unconfirmed: r.unconfirmed || r.notAnswered,
      regimes: r.requiredBy.regimes.map(x => ({ regime: x.regime, grade: x.grade, article: articleOf(x.basis) })),
      severity, title: c.remedy, businessConsequence: consequence(c, r, reqLevel, transfer.missing, askedSet.has('B6')),
      ownerRole: c.ownerRole, timeFrame: TIME_FRAME[severity], remedy: c.means,
      offeringRefs: c.offering ? [c.offering] : [], referral: c.referral, sources: claimsOf(r.requiredBy.regimes.map(x => x.basis)),
      mode, consultantOnly: false, rank: 0, wave: 0,
      _drivers: appliesRegimes.length + (strongClasses.length ? 1 : 0)
    } as Finding & { _drivers: number });
  }
  // Future obligations below full create "upcoming" gaps with a dated time frame (DESIGN 4.3).
  for (const u of upcoming) {
    if (findings.some(f => f.control === u.control) || (mode === 'executive' && !CONTROL.get(u.control).exec)) continue;
    const c = CONTROL.get(u.control);
    const state = c.scope === 'org' ? orgState(c) : 'not_answered';
    if (state === 3) continue;
    const severity = severityOf(c.weight, false, state);
    findings.push({
      id: `F-${u.control}`, type: 'control_gap', control: u.control, dataClasses: [], requiredLevel: null, state, unconfirmed: typeof state !== 'number',
      upcoming: u.appliesFrom, regimes: [{ regime: u.regime, grade: graded.get(u.regime)!.grade, article: '' }], severity,
      title: c.remedy, businessConsequence: `${graded.get(u.regime)!.name} requires this from ${u.appliesFrom}.`, ownerRole: c.ownerRole,
      timeFrame: `by ${u.appliesFrom}`, remedy: c.means, offeringRefs: c.offering ? [c.offering] : [], sources: [], mode, consultantOnly: false, rank: 0, wave: 0
    });
  }
  for (const g of regimes.filter(r => r.grade === 'likely_confirm')) {
    const r = REGIMES.find(x => x.id === g.regime);
    const quantifiable = !!regimeCap(r, { ...g, grade: 'applies' }, facts) || (r.levelFloors ?? []).length > 0;
    findings.push({
      id: `F-SCOPE-${g.regime}`, type: 'scope_confirmation', dataClasses: [], requiredLevel: null, unconfirmed: true,
      regimes: [{ regime: g.regime, grade: g.grade, article: g.basis }], severity: quantifiable ? 'High' : 'Medium',
      title: `Confirm whether ${g.name} applies`, businessConsequence: g.reason, ownerRole: 'General Counsel', timeFrame: TIME_FRAME[quantifiable ? 'High' : 'Medium'],
      remedy: 'Confirm the scope test with counsel; the requirement and exposure change with the answer.', offeringRefs: ['OFF.SOV.ASSESS'],
      sources: g.claims, mode, consultantOnly: g.consultantOnly, rank: 0, wave: 0
    });
  }
  if (transfer.conflict) findings.push({
    id: 'F-CONFLICT-1', type: 'conflict', control: 'SOV.XFER.BASIS', dataClasses: PEOPLE_CLASSES.filter(c => classes.includes(c)), requiredLevel: null, unconfirmed: true,
    regimes: transferRegimes.map(x => ({ regime: x, grade: graded.get(x)!.grade, article: '' })), severity: 'High',
    title: 'Resolve where personal data goes: the answers contradict each other',
    businessConsequence: 'You said personal data never leaves its region, but the data locations place it outside the region of the people it concerns. The transfer basis is unconfirmed until this is resolved.',
    ownerRole: 'DPO', timeFrame: TIME_FRAME.High, remedy: 'Reconcile the data locations with the transfer answer.', offeringRefs: ['OFF.SOV.ASSESS'], sources: [], mode, consultantOnly: false, rank: 0, wave: 0
  });
  let conflicts = transfer.conflict ? 1 : 0;
  for (const r of reqs.filter(x => x.zoneConflict)) findings.push({
    id: `F-CONFLICT-${++conflicts}`, type: 'conflict', control: 'SOV.RES.LOCATION', dataClasses: [r.dataClass], requiredLevel: r.required, unconfirmed: true,
    regimes: [{ regime: r.floor!.regime, grade: graded.get(r.floor!.regime)!.grade, article: '' }], severity: 'High',
    title: `Keep ${dataName(r.dataClass)} data in ${r.floor!.zone.map(zoneName).join(', ')}: the law requires it`,
    businessConsequence: `The regions chosen in the workshop (${r.zoneConflict!.map(zoneName).join(', ')}) are outside the zone ${graded.get(r.floor!.regime)!.name} requires for this data. The legal requirement is applied.`,
    ownerRole: 'CIO with General Counsel', timeFrame: TIME_FRAME.High, remedy: 'Align the allowed regions with the legal localisation requirement.',
    offeringRefs: ['OFF.DATA.RESIDENCY'], sources: [], mode, consultantOnly: false, rank: 0, wave: 0
  });
  let decisions = 0;
  if (reqs.some(r => r.choice === 'unknown' || r.choice === null) && classes.length) findings.push({
    id: `F-DECISION-${++decisions}`, type: 'decision', dataClasses: reqs.filter(r => r.choice === 'unknown' || r.choice === null).map(r => r.dataClass), requiredLevel: null, unconfirmed: true,
    regimes: [], severity: 'High', title: 'Set the board\'s sovereignty ambition',
    businessConsequence: 'Board sovereignty ambition not set: maturity is measured against the legal minimum only.', ownerRole: 'CIO', timeFrame: TIME_FRAME.High,
    remedy: 'Agree the level each kind of data needs (L0 to L4).', offeringRefs: ['OFF.SOV.ASSESS'], sources: [], mode, consultantOnly: false, rank: 0, wave: 0
  });
  for (const r of reqs.filter(x => x.required === 'L4')) {
    const perClass = (facts['data.class_platforms'] as Record<string, string[]>)[r.dataClass];
    const foreign = (perClass?.length ? perClass : platforms).filter(p => platformParents(p, facts).some(z => z !== 'unknown' && !r.allowedZone.includes(z)));
    if (foreign.length) findings.push({
      id: `F-DECISION-${++decisions}`, type: 'decision', dataClasses: [r.dataClass], requiredLevel: 'L4', unconfirmed: false, regimes: [], severity: 'High',
      title: `Decide the platform for ${dataName(r.dataClass)} data at L4`,
      businessConsequence: `L4 needs providers whose parent is in the allowed region, or disconnected systems; ${foreign.join(', ')} ${foreign.length === 1 ? 'has' : 'have'} a parent outside it.`,
      ownerRole: 'CIO with General Counsel', timeFrame: TIME_FRAME.High, remedy: 'Choose a sovereign platform or a disconnected design, or lower the level.', offeringRefs: ['OFF.SOV.MIGRATION'], sources: [], mode, consultantOnly: false, rank: 0, wave: 0
    });
  }

  // Ranking (DESIGN 8.3): severity, weight, drivers, state, ID. Waves (8.5): severity, then dependencies.
  const weightOf = (f: Finding) => (f.control ? WEIGHT[CONTROL.get(f.control).weight] ?? 0 : 0);
  const stateNum = (f: Finding) => (typeof f.state === 'number' ? f.state : -1);
  const drivers = (f: Finding) => (f as any)._drivers ?? 0;
  findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || weightOf(b) - weightOf(a) || drivers(b) - drivers(a) || stateNum(a) - stateNum(b) || a.id.localeCompare(b.id));
  findings.forEach((f, i) => { f.rank = i + 1; f.wave = f.type === 'control_gap' && !f.upcoming ? SEVERITY_ORDER.indexOf(f.severity) + 1 : f.upcoming ? 4 : 1; delete (f as any)._drivers; });
  for (const f of findings) for (const p of PREREQUISITES[f.control ?? ''] ?? []) {
    const pre = findings.find(x => x.control === p && x.type === 'control_gap');
    if (pre && pre.wave > f.wave) pre.wave = f.wave;
  }
  const waves = [...new Set(findings.map(f => f.wave))].sort();
  const roadmap = waves.map(w => ({ wave: w, findings: orderInWave(findings.filter(f => f.wave === w)).map(f => f.id) }));
  const topGaps = findings.filter(f => f.type === 'control_gap' && !f.upcoming).slice(0, 5);
  // S6 challenge D9: the top band is never shown beside a critical finding or a red regulation.
  if (band === 'Sovereign-ready' && (findings.some(f => f.severity === 'Critical') || exposure.some(e => e.rag === 'red'))) {
    band = 'Managed';
    wording = findings.some(f => f.severity === 'Critical') ? 'Most required controls in place, but a critical gap remains' : 'Most required controls in place, but a regulation in scope is rated red';
  }

  const notes: string[] = [];
  const zonesNoEntity = [...new Set((facts['derived.all_location_zones'] as string[]).filter(z => z !== 'unknown' && z !== 'other' && !list(facts['org.establishments']).includes(z)))];
  if (zonesNoEntity.length) notes.push(`Data is processed in ${zonesNoEntity.map(zoneName).join(', ')} without an entity there; this assessment does not treat processing location alone as bringing in that country's law. Confirm with counsel.`);
  if (mode === 'executive') notes.push('Requirement set at one level for all data classes; the workshop confirms it per class.');
  // S4 sourcing: Japan and Australia may not treat storage-only cloud as a transfer; the engine assumes it does.
  const cautious = list(facts['data.subject_regions']).filter(z => z === 'jp' || z === 'au');
  if (cautious.length && facts['derived.personal_transfer']) notes.push(`Storing data of people in ${cautious.map(z => (z === 'jp' ? 'Japan' : 'Australia')).join(' and ')} outside that country is treated as a transfer. Where the cloud provider only stores the data and does not handle it, ${cautious.length > 1 ? 'these laws' : 'the law'} may treat it as use rather than a transfer (APPI Art. 28; OAIC APP guidelines 8.14). Confirm with counsel.`);

  const advisory = cloudAdvisory({ facts, requirements: reqs, controls: results, findings, regimes });
  return {
    mode, assessmentDate,
    versions: {
      engine: ENGINE_VERSION, questionSet: (bank as any).questionSetVersion, controls: (catalogue as any).catalogueVersion,
      registry: (registry as any).registryVersion, registryStatusAsOf: (registry as any).statusAsOf, claimsRegister: (claimsRegister as any).version
    },
    asked, ignoredAnswers, facts, regimes, requirements: reqs,
    maturity: {
      score, band, wording, withheld, controlsAssessed: results.length, requiredControls: totalRequiredControls, coverage: Math.round(coverage * 100) / 100,
      provisional: coverage < 0.6, unconfirmed: results.filter(r => r.unconfirmed).map(r => r.control), notAnswered: results.filter(r => r.notAnswered).map(r => r.control),
      label: mode === 'executive' ? `Executive maturity, ${results.length} of ${totalRequiredControls} required controls assessed` : null,
      byDomain
    },
    controls: results,
    exposure: {
      regimes: exposure,
      summary: `${count('applies')} regimes apply, ${count('likely_confirm')} likely – confirm, ${count('advisory')} advisory; ${countRag('red')} red, ${countRag('amber')} amber, ${countRag('green')} green.`,
      largestCap,
      capNote: largestCap ? 'Largest single statutory maximum among regimes that apply or likely apply: a cap, not an expected fine, and never summed across regimes.' : turnoverGiven ? 'No regime in scope has a computable statutory maximum.' : 'Not quantified – turnover not given.'
    },
    foreignAccess, findings, topGaps, roadmap, pendingSource, notes,
    advisory, seal: sealView({ facts, requirements: reqs, controls: results }),
    help: howLtmCanHelp(findings, advisory.placement)
  };
}

/** Executive mode: the number of controls a workshop would require, for "n of N required controls assessed". */
function countRequired(classes: DataClass[], reqOf: Map<DataClass, ClassRequirement>, rows: Array<{ control: string }>, aiUsed: boolean, platforms: string[]): number {
  return CONTROLS.filter(c => c.scored !== false && !(c.onlyIfPlatforms && !platforms.some(p => c.onlyIfPlatforms.includes(p))) && (
    (c.level && !(c.onlyIfAi && !aiUsed) && classes.some(cls => LEVEL_NUM(reqOf.get(cls)!.required) >= LEVEL_NUM(c.level))) || rows.some(x => x.control === c.id)
  )).length;
}

/** DESIGN 8.3 severity table; class controls pass their lowest state. */
function severityOf(weight: string, strong: boolean, state: State | undefined): Severity {
  const s = typeof state === 'number' ? state : 0;
  if (s >= 3) return 'Low';
  const row: Record<string, Severity[]> = {
    'C,true': ['Critical', 'High', 'Medium'], 'C,false': ['High', 'Medium', 'Low'],
    'H,true': ['High', 'Medium', 'Low'], 'H,false': ['Medium', 'Low', 'Low'], 'S,true': ['Medium', 'Low', 'Low'], 'S,false': ['Medium', 'Low', 'Low']
  };
  return row[`${weight},${strong}`][s];
}

/** Within a wave, prerequisites come before the controls that need them; otherwise the ranking order holds. */
function orderInWave(fs: Finding[]): Finding[] {
  const out: Finding[] = [];
  const visit = (f: Finding) => {
    if (out.includes(f)) return;
    for (const p of PREREQUISITES[f.control ?? ''] ?? []) { const pre = fs.find(x => x.control === p); if (pre) visit(pre); }
    out.push(f);
  };
  fs.forEach(visit);
  return out;
}

const articleOf = (basis: string) => basis.replace(/\s*\[CLM-[^\]]+\]/g, '').split(';')[0].trim();
const claimsOf = (texts: string[]) => [...new Set(texts.flatMap(t => t.match(/CLM-[A-Z]+-\d+/g) ?? []))];
/** The same state words as the control table (S6 challenge D6: "largely" is never reported as "partly"). */
const STATE_WORD = (s: State) => (s === 3 ? 'in place' : s === 2 ? 'largely in place' : s === 1 ? 'partly in place' : s === 0 ? 'not in place' : s === 'unknown' ? 'unconfirmed' : 'not answered');

function consequence(c: any, r: ControlResult, level: Level | null, missing: Array<{ regime: string; routes: string[] }>, ukCtp: boolean): string {
  const below = r.byClass ? (Object.entries(r.byClass).filter(([, s]) => s !== 3) as Array<[string, State]>) : [];
  // Class controls: the state of each kind of data below full, so the sentence matches the table (D6).
  const parts = [r.byClass
    ? `${c.name} is ${[...new Set(below.map(([, s]) => s))].length === 1 ? `${STATE_WORD(below[0][1])} for ${below.map(([k]) => dataName(k)).join(', ')} data` : below.map(([k, s]) => `${STATE_WORD(s)} for ${dataName(k)} data`).join(', ')}.`
    : `${c.name} is ${STATE_WORD(r.state)}.`];
  if (c.id === 'SOV.CONC.PROVIDER' && ukCtp) parts.push('This includes dependence on the UK designated critical third parties.');
  if (level && r.requiredBy.levels.length) parts.push(`The ${level} level set for this data requires it.`);
  if (r.requiredBy.regimes.length) parts.push(`Required by ${r.requiredBy.regimes.map(x => `${REGIME_NAME.get(x.regime) ?? x.regime} (${articleOf(x.basis)})`).join('; ')}.`);
  if (c.id === 'SOV.XFER.BASIS' && missing.length) parts.push(`No transfer route recorded for ${missing.map(m => REGIME_NAME.get(m.regime) ?? m.regime).join(', ')}.`);
  return parts.join(' ');
}
