/**
 * FinOps IQ v3 value model (plan phase F4; design: docs/cio-readiness/finops-iq/design/DESIGN.md section 10).
 * Lever-based conservative / expected / upper ranges: no input, no number; upper = base x the published or
 * arithmetic maximum, expected = 1/2 upper, conservative = 1/4 upper; bands widen the range by their corners;
 * usage levers before Spot, then commitments on what remains; capped per lever and globally (29% of P, D15, Q11);
 * net of internal effort and tooling, ramped, with year-1, run-rate and 3-year figures. No value money figure
 * without the client's internal cost rate (Q4). The FinOps team cost is shown beside the value (Q12).
 *
 * Every number in the value block is a Figure: { field, value, unit, claimIds, assumptionIds }, where `field` is
 * the figure's own path in the result (resolveField(result, field) returns it), so reports can trace each number.
 * Every constant comes from the registries through K(), which records the read for the assumption-register test.
 */
import leverLibrary from '../registry/levers.json' with { type: 'json' };
import thresholds from '../registry/thresholds.json' with { type: 'json' };
import valueRules from './value-rules.json' with { type: 'json' };
import type { AnswerLevel, Facts, Mode } from './evaluate';

export const VALUE_MODEL_VERSION = '1.0.0';

/* --------------------------------- Constants -------------------------------- */

const SOURCES: Record<string, any> = { levers: leverLibrary, thresholds, valueRules };
const READS = new Map<string, unknown>();

/** Splits a path such as `levers[LEV-01].ramp.year1Share` into keys and [selector]s. */
function tokens(path: string): Array<{ key?: string; select?: string }> {
  return [...path.matchAll(/([^.[\]]+)|\[([^\]]+)\]/g)].map(m => (m[2] !== undefined ? { select: m[2] } : { key: m[1] }));
}
const SELECTOR_KEYS = ['id', 'fact', 'lever', 'provider', 'key'];
function pathGet(root: any, path: string): any {
  let o = root;
  for (const t of tokens(path)) {
    if (o == null) return undefined;
    o = t.key !== undefined ? o[t.key] : Array.isArray(o) ? o.find(x => x && SELECTOR_KEYS.some(k => x[k] === t.select)) : undefined;
  }
  return o;
}

/** Reads a registry constant and records the read (source:path), so the assumption-register test can check it. */
function K(source: 'levers' | 'thresholds' | 'valueRules', path: string): any {
  const v = pathGet(SOURCES[source], path);
  if (v === undefined) throw new Error(`value model constant ${source}:${path} is missing`);
  READS.set(`${source}:${path}`, v);
  return v;
}
/** Every registry constant the value model has read (source:path -> value). */
export const valueModelConstantReads = () => new Map(READS);

const VR: any = valueRules;
const LEVERS: any[] = (leverLibrary as any).levers;
const LEVER_IDS: string[] = LEVERS.map(l => l.id);
const CLOUD_EXCLUDED = new Set<string>(K('levers', 'globalCap.excludedLevers'));
const HOURS_IN_WEEK = 7 * 24;

const C = {
  expectedFactor: K('levers', 'rangeRule.expectedFactor') as number,
  conservativeFactor: K('levers', 'rangeRule.conservativeFactor') as number,
  capShare: K('levers', 'globalCap.shareOfPublicCloudSpend') as number,
  capSource: K('levers', 'globalCap.source'),
  freshnessDays: K('thresholds', 'thresholds[THR-FIN-11].rule.maxAgeDays') as number,
  scheduleHours: K('thresholds', 'thresholds[THR-FIN-15].rule.hoursPerWeek') as number,
  targetUtilisation: K('thresholds', 'thresholds[THR-FIN-16].rule.target') as number,
  maxBanded: K('valueRules', 'bandSearch.maxBandedInputs') as number,
  op06: K('valueRules', 'derivations.nonProdScheduledShareFromOp06.byLevel') as Record<string, number>,
  upliftShare: K('valueRules', 'scoring.severityUpliftShareOfP') as number,
  needShare: K('valueRules', 'scoring.needModifierShareOfP') as number,
  teamFte: K('valueRules', 'finopsTeam.fteByTier') as Record<string, number>,
  teamMonths: K('valueRules', 'finopsTeam.monthsPerYear') as number,
  hypothesisBands: K('valueRules', 'hypothesis.bands') as Record<string, [number, number | null]>
};
/** LEV-04 arithmetic maximum: 1 - on-schedule hours / hours in a week (THR-FIN-15, ASM-FIN-043). */
const SCHEDULE_RATE = 1 - C.scheduleHours / HOURS_IN_WEEK;

interface LeverConst {
  id: string; name: string; type: string; capability: string; quantifiedIn: string[]; label: string; formula: string; rateFormula: string;
  claimIds: string[]; offeringIds: string[]; ramp: { year1: number | 'renewal_share'; year2: number; year3: number };
  effort: Record<string, number>; ongoing: number; rateByProvider: Record<string, { rate: number; claimId: string; instrument: string } | null>;
  rate: number | null; rateClaimId: string | null; rampAssumption: string; effortAssumption: string;
}
const L = new Map<string, LeverConst>(LEVER_IDS.map(id => {
  const p = `levers[${id}]`;
  const kind = K('levers', `${p}.maxRate.kind`);
  const byProvider: LeverConst['rateByProvider'] = {};
  if (kind === 'published_by_provider') {
    for (const prov of Object.keys(K('levers', `${p}.maxRate.byProvider`))) {
      const q = K('levers', `${p}.maxRate.byProvider.${prov}.quantified`);
      byProvider[prov] = q ? { rate: K('levers', `${p}.maxRate.byProvider.${prov}.value`), claimId: K('levers', `${p}.maxRate.byProvider.${prov}.source.claimId`), instrument: K('levers', `${p}.maxRate.byProvider.${prov}.instrument`) } : null;
    }
  }
  const rate = kind === 'evidence' ? K('levers', `${p}.maxRate.value`) : kind === 'arithmetic' ? SCHEDULE_RATE : null;
  const rateClaimId = kind === 'arithmetic' || kind === 'ltm_heuristic_formula' ? K('levers', `${p}.maxRate.source.claimId`) : null;
  return [id, {
    id, name: K('levers', `${p}.name`), type: K('levers', `${p}.type`), capability: K('levers', `${p}.capability`),
    quantifiedIn: K('levers', `${p}.quantifiedIn`), label: K('levers', `${p}.label`),
    formula: K('levers', `${p}.addressableBase.formula`),
    rateFormula: kind === 'published_by_provider' ? 'provider published maximum' : kind === 'evidence' ? '100% of the evidenced amount' : kind === 'arithmetic' ? `1 - ${C.scheduleHours}/${HOURS_IN_WEEK}` : kind === 'ltm_heuristic_formula' ? K('levers', `${p}.maxRate.formula`) : 'not quantified',
    claimIds: K('levers', `${p}.claimIds`), offeringIds: K('levers', `${p}.offeringIds`),
    ramp: { year1: K('levers', `${p}.ramp.year1Share`), year2: K('levers', `${p}.ramp.year2Share`), year3: K('levers', `${p}.ramp.year3Share`) },
    effort: { 1: K('levers', `${p}.effortFteMonths.tier1`), 2: K('levers', `${p}.effortFteMonths.tier2`), 3: K('levers', `${p}.effortFteMonths.tier3`) },
    ongoing: K('levers', `${p}.effortFteMonths.ongoingShareOfOneOff`), rateByProvider: byProvider, rate, rateClaimId,
    rampAssumption: K('levers', `${p}.ramp.assumptionId`), effortAssumption: K('levers', `${p}.effortFteMonths.assumptionId`)
  }];
}));
/** LEV-09 year-1 share when the client gives no renewal share (CLM-FIN-133, ASM-FIN-045). */
const DEFAULT_RENEWAL_SHARE = K('levers', 'levers[LEV-09].ramp.year1ShareWithoutRenewalData') as number;

/* --------------------------------- Figures ---------------------------------- */

export type Unit = 'currency' | 'share' | 'percent' | 'fte_months' | 'fte' | 'ratio';
export interface Figure { field: string; value: number; unit: Unit; claimIds: string[]; assumptionIds: string[] }
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];
const fig = (field: string, value: number, unit: Unit, claimIds: string[], assumptionIds: string[] = []): Figure =>
  ({ field, value, unit, claimIds: uniq(claimIds), assumptionIds: uniq(assumptionIds) });
const money = (x: number) => Math.max(0, Math.floor(x + 1e-6));
const cost = (x: number) => Math.max(0, Math.ceil(x - 1e-6));
const share = (x: number) => Math.round(x * 10000) / 10000;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Returns the object at a figure's `field` path (array elements selected by id, fact, lever, provider or key). */
export function resolveField(root: unknown, field: string): any { return pathGet(root, field); }

/* ---------------------------------- Inputs ---------------------------------- */

type InputKind = 'exact' | 'band' | 'evidence' | 'derived';
interface In { path: string; low: number; mid: number; high: number; kind: InputKind }

const CASES = ['conservative', 'expected', 'upper'] as const;
type Case = typeof CASES[number];

function amount(a: unknown, path: string, kind: 'client' | 'evidence' = 'client'): In | undefined {
  if (typeof a === 'number' && Number.isFinite(a)) return { path, low: a, mid: a, high: a, kind: kind === 'evidence' ? 'evidence' : 'exact' };
  if (!a || typeof a !== 'object') return undefined;
  const v: any = a;
  if (typeof v.exact === 'number') return { path, low: v.exact, mid: v.exact, high: v.exact, kind: kind === 'evidence' ? 'evidence' : 'exact' };
  if (Array.isArray(v.band) && v.band.length === 2) return { path, low: v.band[0], mid: (v.band[0] + v.band[1]) / 2, high: v.band[1], kind: 'band' };
  return undefined;
}
const banded = (i: In) => i.high > i.low;

export interface ValueModelContext {
  mode: Mode;
  tier: 1 | 2 | 3;
  facts: Facts;
  assessmentDate?: string;
  /** Levers whose scope condition is met (from the lever library's scopeWhen). */
  leversInScope: string[];
  /** OP-06 as asked: its level, or undefined when blank; asked false when not asked. */
  op06: { asked: boolean; level: AnswerLevel | undefined };
  /** HY-01 answer (never an input). */
  hypothesis: string | undefined;
  /** DECISION-01 is raised: no accountable owner, so the team cost is shown beside the value (Q12). */
  decision01Raised: boolean;
}

type Status = { ok: true } | { ok: false; reason: string; blockedBy: string[]; detail?: string[] };

interface Prepared {
  ctx: ValueModelContext;
  providers: string[];
  inputs: Map<string, In>;
  status: Map<string, Status>;
  ratedProviders: Map<string, string[]>;
  unsourcedProviders: Map<string, string[]>;
  evidence: { rightsizingDedup: number; rightsizingOther: number; idle: number; storage: number };
  k8sInScope: boolean;
  gpuOutsideK8s: boolean;
  gpuInsideK8s: boolean;
  /** Inputs each quantified lever reads (for corners and confidence). */
  uses: Map<string, string[]>;
}

const RECOMMENDATION_GROUPS: Record<string, string[]> = { 'LEV-02': ['rightsizing', 'modernisation'], 'LEV-03': ['idle'], 'LEV-05': ['storage'] };
const DAY_MS = 24 * 60 * 60 * 1000;

function prepare(ctx: ValueModelContext, schedLevel?: AnswerLevel): Prepared {
  const f = ctx.facts;
  const providers = f.footprint.publicCloudProviders;
  const scopes = new Set(f.footprint.scopes);
  const inputs = new Map<string, In>();
  const put = (i: In | undefined) => { if (i) inputs.set(i.path, i); };
  for (const p of providers) put(amount(f.spend.byScope[p], `spend.byScope.${p}`));
  const base: any = f.base ?? {};
  for (const k of ['computeShare', 'steadyStateShare', 'eligibleCoverage', 'nonProdShare', 'interruptionTolerantShare', 'spotShare', 'kubernetesSpend', 'kubernetesRequestUtilisation']) put(amount(base[k], `base.${k}`));
  // Executive mode derives the scheduled share from OP-06 (ASM-FIN-052); the workshop asks for it (VB-03).
  const level = schedLevel ?? ctx.op06.level;
  if (ctx.mode === 'executive') {
    const v = level !== undefined && level !== 'unknown' ? C.op06[level] : undefined;
    if (v !== undefined) inputs.set('base.nonProdScheduledShare', { path: 'base.nonProdScheduledShare', low: v, mid: v, high: v, kind: 'derived' });
  } else put(amount(base.nonProdScheduledShare, 'base.nonProdScheduledShare'));
  const ai: any = f.evidence?.aiGpu ?? {};
  for (const k of ['gpuSpend', 'gpuUtilisation', 'idleEndpointSpend']) put(amount(ai[k], `evidence.aiGpu.${k}`, 'evidence'));
  const saas: any = f.evidence?.saasLicence;
  if (saas && typeof saas.unusedAnnualCost === 'number') put(amount(saas.unusedAnnualCost, 'evidence.saasLicence', 'evidence'));
  if (saas?.renewingYear1Share) put(amount(saas.renewingYear1Share, 'evidence.saasLicence.renewingYear1Share', 'evidence'));
  const rate = amount(f.cost?.internalRate, 'cost.internalRate');
  if (rate) inputs.set(rate.path, rate);
  const tooling = amount(f.cost?.tooling, 'cost.tooling');
  if (tooling) inputs.set(tooling.path, tooling);

  // Provider-tool estimates: only those no older than 90 days at the assessment date (THR-FIN-11), for a selected provider.
  const recs: any[] = (f.evidence?.providerRecommendations ?? []).filter((r: any) => !r.provider || providers.includes(r.provider));
  const assessed = ctx.assessmentDate ? Date.parse(ctx.assessmentDate) : NaN;
  const fresh = (r: any) => Number.isFinite(assessed) && (assessed - Date.parse(r.exportDate)) / DAY_MS <= C.freshnessDays && assessed >= Date.parse(r.exportDate);
  const sum = (rs: any[]) => rs.reduce((t, r) => t + r.annualEstimate, 0);
  const ofType = (types: string[]) => recs.filter(r => types.includes(r.type));
  const evidence = {
    rightsizingDedup: sum(ofType(RECOMMENDATION_GROUPS['LEV-02']).filter(r => fresh(r) && r.deduplicated === true)),
    rightsizingOther: sum(ofType(RECOMMENDATION_GROUPS['LEV-02']).filter(r => fresh(r) && r.deduplicated !== true)),
    idle: sum(ofType(RECOMMENDATION_GROUPS['LEV-03']).filter(fresh)),
    storage: sum(ofType(RECOMMENDATION_GROUPS['LEV-05']).filter(fresh))
  };

  const k8sInScope = scopes.has('kubernetes');
  const gpuInsideK8s = f.footprint.gpuInsideKubernetes === true && k8sInScope;
  const gpuOutsideK8s = scopes.has('ai_platform_gpu') && !gpuInsideK8s;
  const status = new Map<string, Status>();
  const ratedProviders = new Map<string, string[]>();
  const unsourcedProviders = new Map<string, string[]>();
  const uses = new Map<string, string[]>();
  const spendPaths = providers.map(p => `spend.byScope.${p}`);
  const missingSpend = spendPaths.filter(p => !inputs.has(p));

  for (const id of LEVER_IDS.filter(x => ctx.leversInScope.includes(x))) {
    const lc = L.get(id)!;
    const no = (reason: string, blockedBy: string[] = [], detail?: string[]) => status.set(id, { ok: false, reason, blockedBy, ...(detail ? { detail } : {}) });
    if (!lc.quantifiedIn.includes(ctx.mode)) { no(lc.quantifiedIn.includes('executive') || lc.quantifiedIn.includes('workshop') ? 'executive_mode' : 'not_quantified_in_v1'); continue; }
    if (lc.type === 'rate') {
      const rated = providers.filter(p => lc.rateByProvider[p]);
      ratedProviders.set(id, rated);
      unsourcedProviders.set(id, providers.filter(p => !lc.rateByProvider[p]));
      if (!rated.length) { no('rate_unsourced_for_provider', [], providers); continue; }
    }
    const isCloud = !CLOUD_EXCLUDED.has(id);
    if (isCloud && (missingSpend.length || !providers.length)) { no('public_cloud_spend_unknown', missingSpend); continue; }
    const need: string[] = [];
    const optional: string[] = [];
    const evidenceNeed = (lever: string) => {
      const all = ofType(RECOMMENDATION_GROUPS[lever]);
      if (!recs.length) return { reason: 'missing_input', blockedBy: ['evidence.providerRecommendations'] };
      if (!all.length) return { reason: 'no_estimate_of_type', blockedBy: [], detail: RECOMMENDATION_GROUPS[lever] };
      if (!Number.isFinite(assessed)) return { reason: 'evidence_needs_assessment_date', blockedBy: [] };
      if (!all.some(fresh)) return { reason: 'evidence_older_than_90_days', blockedBy: ['evidence.providerRecommendations'] };
      return null;
    };
    switch (id) {
      case 'LEV-01': need.push('base.computeShare', 'base.steadyStateShare', 'base.eligibleCoverage', 'base.nonProdShare'); optional.push('base.nonProdScheduledShare', 'base.interruptionTolerantShare', 'base.spotShare'); break;
      case 'LEV-04':
        need.push('base.computeShare', 'base.nonProdShare', 'base.nonProdScheduledShare');
        if (k8sInScope) need.push('base.kubernetesSpend');
        if (gpuOutsideK8s) need.push('evidence.aiGpu.gpuSpend');
        break;
      case 'LEV-02': need.push('base.computeShare'); break;
      case 'LEV-06': need.push('base.computeShare', 'base.interruptionTolerantShare', 'base.spotShare'); break;
      case 'LEV-07': need.push('base.kubernetesSpend', 'base.kubernetesRequestUtilisation'); break;
      case 'LEV-10':
        if (gpuInsideK8s) need.push('evidence.aiGpu.idleEndpointSpend');
        else { need.push('evidence.aiGpu.gpuSpend', 'evidence.aiGpu.gpuUtilisation'); optional.push('evidence.aiGpu.idleEndpointSpend'); }
        break;
      case 'LEV-09': need.push('evidence.saasLicence'); optional.push('evidence.saasLicence.renewingYear1Share'); break;
    }
    const missing = need.filter(p => !inputs.has(p));
    const e = RECOMMENDATION_GROUPS[id] ? evidenceNeed(id) : null;
    if (missing.length) { no('missing_input', [...missing, ...(e?.reason === 'missing_input' ? e.blockedBy : [])]); continue; }
    if (e) { no(e.reason, e.blockedBy, e.detail); continue; }
    status.set(id, { ok: true });
    uses.set(id, [...(isCloud ? spendPaths : []), ...need, ...optional.filter(p => inputs.has(p))]);
  }
  return { ctx, providers, inputs, status, ratedProviders, unsourcedProviders, evidence, k8sInScope, gpuOutsideK8s, gpuInsideK8s, uses };
}

/* -------------------------------- Calculation ------------------------------- */

interface LeverRaw { base: number; upper: number; value: number; rates: Array<{ provider: string | null; rate: number }> }
interface CaseRaw { factor: number; P: number; levers: Map<string, LeverRaw>; cloud: number; cap: number; scale: number; total: number; point: Record<string, number> }

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** One case at one point (DESIGN.md 10.4): usage levers, then Spot, then commitments on what remains. */
function compute(pp: Prepared, point: Record<string, number>, factor: number): CaseRaw {
  const q = (id: string) => pp.status.get(id)?.ok === true;
  const v = (path: string) => point[path];
  const levers = new Map<string, LeverRaw>();
  const P = pp.providers.reduce((t, p) => t + (v(`spend.byScope.${p}`) ?? 0), 0);
  const cs = v('base.computeShare') ?? 0;
  const Pc = P * cs;
  const set = (id: string, base: number, upper: number, rates: LeverRaw['rates']) => levers.set(id, { base, upper, value: upper * factor, rates });
  const val = (id: string) => levers.get(id)?.value ?? 0;
  const k8s = pp.k8sInScope ? v('base.kubernetesSpend') ?? 0 : 0;
  const gpu = pp.gpuOutsideK8s ? v('evidence.aiGpu.gpuSpend') ?? 0 : 0;
  const np = v('base.nonProdShare') ?? 0;
  const sched = v('base.nonProdScheduledShare');
  const target = C.targetUtilisation;

  if (q('LEV-03')) { const b = Math.min(pp.evidence.idle, P); set('LEV-03', b, b * L.get('LEV-03')!.rate!, [{ provider: null, rate: L.get('LEV-03')!.rate! }]); }
  if (q('LEV-04')) {
    const b = Math.max(0, Pc - k8s - gpu) * np * (1 - (sched ?? 0));
    set('LEV-04', b, b * SCHEDULE_RATE, [{ provider: null, rate: SCHEDULE_RATE }]);
  }
  if (q('LEV-02')) {
    // A tool estimate that is not deduplicated pre-dates idle clean-up and scheduling: reduce it pro rata (10.4 step 3).
    const reduce = Pc > 0 ? clamp01(1 - (val('LEV-03') + val('LEV-04')) / Pc) : 0;
    const b = Math.min(Pc, pp.evidence.rightsizingDedup + pp.evidence.rightsizingOther * reduce);
    set('LEV-02', b, b * L.get('LEV-02')!.rate!, [{ provider: null, rate: L.get('LEV-02')!.rate! }]);
  }
  if (q('LEV-07')) {
    const r = Math.max(0, 1 - v('base.kubernetesRequestUtilisation') / target);
    set('LEV-07', k8s, k8s * r, [{ provider: null, rate: r }]);
  }
  if (q('LEV-05')) { const b = Math.min(pp.evidence.storage, P); set('LEV-05', b, b * L.get('LEV-05')!.rate!, [{ provider: null, rate: L.get('LEV-05')!.rate! }]); }
  if (q('LEV-10')) {
    const idle = v('evidence.aiGpu.idleEndpointSpend') ?? 0;
    if (pp.gpuInsideK8s) set('LEV-10', idle, idle, [{ provider: null, rate: 1 }]);
    else {
      const g = v('evidence.aiGpu.gpuSpend');
      const i = Math.min(idle, g);
      const r = Math.max(0, 1 - v('evidence.aiGpu.gpuUtilisation') / target);
      const b = g;
      set('LEV-10', b, i + (g - i) * r, [{ provider: null, rate: b > 0 ? (i + (g - i) * r) / b : 0 }]);
    }
  }
  if (q('LEV-09')) { const b = v('evidence.saasLicence'); set('LEV-09', b, b * L.get('LEV-09')!.rate!, [{ provider: null, rate: L.get('LEV-09')!.rate! }]); }

  // Rate levers on compute left after the usage levers that remove compute (LEV-02, 03, 07, 10), spread pro rata to P_c.
  const removed = val('LEV-02') + val('LEV-03') + val('LEV-07') + val('LEV-10');
  const left = Pc > 0 ? clamp01(1 - removed / Pc) : 0;
  const tol = Math.max(0, (v('base.interruptionTolerantShare') ?? 0) - (v('base.spotShare') ?? 0));
  const spotFor = new Set(q('LEV-06') ? pp.ratedProviders.get('LEV-06') : []);
  if (q('LEV-06')) {
    const rates = pp.ratedProviders.get('LEV-06')!.map(p => ({ provider: p, rate: L.get('LEV-06')!.rateByProvider[p]!.rate, base: (v(`spend.byScope.${p}`) * cs) * tol * left }));
    set('LEV-06', rates.reduce((t, r) => t + r.base, 0), rates.reduce((t, r) => t + r.base * r.rate, 0), rates.map(r => ({ provider: r.provider, rate: r.rate })));
  }
  if (q('LEV-01')) {
    // n_u: all unscheduled non-production leaves the steady pool (all of it when the scheduled share is unknown);
    // t_u: Spot-movable usage, only where LEV-06 is quantified, so answering never lowers the total.
    const nu = np * (1 - (sched ?? 0));
    const S = v('base.steadyStateShare'), Cv = v('base.eligibleCoverage');
    const rates = pp.ratedProviders.get('LEV-01')!.map(p => ({
      provider: p, rate: L.get('LEV-01')!.rateByProvider[p]!.rate,
      base: (v(`spend.byScope.${p}`) * cs) * Math.max(0, S - Cv - nu - (spotFor.has(p) ? tol : 0)) * left
    }));
    set('LEV-01', rates.reduce((t, r) => t + r.base, 0), rates.reduce((t, r) => t + r.base * r.rate, 0), rates.map(r => ({ provider: r.provider, rate: r.rate })));
  }
  let cloud = 0, outside = 0;
  for (const [id, l] of levers) if (CLOUD_EXCLUDED.has(id)) outside += l.value; else cloud += l.value;
  const cap = C.capShare * P;
  const scale = cloud > cap && cloud > 0 ? cap / cloud : 1;
  return { factor, P, levers, cloud, cap, scale, total: cloud * scale + outside, point };
}

/** The banded inputs searched as corners: those used by a quantified lever, at most eight (the widest kept). */
function bandedInputs(pp: Prepared) {
  const used = new Set([...pp.uses.values()].flat());
  const all = [...pp.inputs.values()].filter(i => used.has(i.path) && banded(i) && !i.path.startsWith('cost.') && !i.path.endsWith('renewingYear1Share'));
  const width = (i: In) => (i.high - i.low) / (Math.abs(i.high) || 1);
  const sorted = [...all].sort((a, b) => width(b) - width(a) || a.path.localeCompare(b.path));
  return { searched: sorted.slice(0, C.maxBanded), fixed: sorted.slice(C.maxBanded).map(i => i.path) };
}

function midpoint(pp: Prepared): Record<string, number> {
  return Object.fromEntries([...pp.inputs.values()].map(i => [i.path, i.mid]));
}

/** Expected at the midpoints; conservative and upper the lowest and highest capped totals over the corners (10.1 item 4). */
function solve(pp: Prepared) {
  const mid = midpoint(pp);
  const expected = compute(pp, mid, C.expectedFactor);
  const { searched, fixed } = bandedInputs(pp);
  const candidates: Array<Record<string, number>> = [mid];
  for (let m = 0; m < 2 ** searched.length; m++) {
    const pt = { ...mid };
    searched.forEach((i, k) => { pt[i.path] = (m >> k) & 1 ? i.high : i.low; });
    candidates.push(pt);
  }
  let upper: CaseRaw | undefined, conservative: CaseRaw | undefined;
  for (const pt of candidates) {
    const u = compute(pp, pt, 1);
    if (!upper || u.total > upper.total + 1e-9 || (Math.abs(u.total - upper.total) <= 1e-9 && u.cloud > upper.cloud + 1e-9)) upper = u;
    const c = compute(pp, pt, C.conservativeFactor);
    if (!conservative || c.total < conservative.total - 1e-9 || (Math.abs(c.total - conservative.total) <= 1e-9 && c.cloud < conservative.cloud - 1e-9)) conservative = c;
  }
  return { conservative: conservative!, expected, upper: upper!, searched: searched.map(i => i.path), fixed };
}

/* ---------------------------------- Output ---------------------------------- */

export interface LeverCase {
  factor: Figure; base: Figure; rate: Figure; upperBeforeFactor: Figure; beforeGlobalCap: Figure; globalCapScale: Figure;
  runRate: Figure; year1Share: Figure; year1: Figure; year2: Figure; year3: Figure; threeYear: Figure;
  runCost: Figure | null; netRunRate: Figure | null;
}
export interface LeverValue {
  id: string; name: string; type: string; capability: string;
  status: 'quantified' | 'not_quantified'; reason: string | null; reasonText: string | null; blockedBy: string[];
  formula: string; rateFormula: string; basisLine: string;
  inputs: Array<{ fact: string; kind: InputKind; value: Figure; low: Figure | null; high: Figure | null }>;
  maxRate: Array<{ provider: string; rate: Figure; instrument: string | null }>;
  unsourcedProviders: string[];
  cases: Record<Case, LeverCase> | null;
  effortFteMonths: Figure | null;
  confidence: 'High' | 'Medium' | 'Low' | null; confidenceReason: string | null;
  claimIds: string[]; assumptionIds: string[]; offeringIds: string[];
}
export interface CaseTotals {
  P: Figure; grossRunRate: Figure; pctOfP: Figure; grossYear1: Figure; grossYear2: Figure; grossYear3: Figure; gross3Year: Figure;
  oneOffCost: Figure; leverRunCost: Figure; toolingCost: Figure; annualRunCost: Figure;
  netYear1: Figure; netYear2: Figure; netYear3: Figure; netRunRate: Figure; net3Year: Figure;
  cloudBeforeCap: Figure; cap: Figure; capBinding: boolean; capScale: Figure;
}
export interface ValueBlock {
  version: string;
  status: 'quantified' | 'not_quantified';
  moneyShown: boolean;
  label: string; detail: string; notice: string | null;
  currency: string;
  levers: LeverValue[];
  totals: Record<Case, CaseTotals> | null;
  globalCap: {
    share: Figure; appliesTo: string[]; excludedLevers: string[]; statement: string;
    source: { claimId: string; citation: string; url: string; year: string; sample: string; checked: string; assumptionId: string };
    claimIds: string[];
  };
  costs: { internalRateProvided: boolean; toolingProvided: boolean; toolingNote: string; externalSupportIncluded: false; externalSupportNote: string; effortFteMonths: Figure | null; claimIds: string[] };
  finopsTeam: { shown: boolean; statement: string; fte: Figure | null; annualCost: Figure | null; nettedAgainstValue: false; claimIds: string[] };
  confidence: { overall: 'High' | 'Medium' | 'Low' | null; reason: string; claimIds: string[] };
  hypothesis: {
    answered: boolean; band: string | null; amountLow: Figure | null; amountHigh: Figure | null;
    position: 'above_upper' | 'above_expected' | 'at_or_below_expected' | null;
    explanations: Array<{ id: string; text: string }>; statement: string; neverAnInput: true; claimIds: string[];
  };
  notQuantified: Array<{ lever: string; name: string; reason: string; reasonText: string; blockedBy: string[]; evidenceNeeded: string; claimIds: string[] }>;
  bands: { searched: string[]; fixedAtMidpoint: string[]; corners: Record<'conservative' | 'upper', Array<{ fact: string; value: Figure }>> | null; claimIds: string[] };
  scoring: { severityUpliftShareOfP: Figure; needModifierShareOfP: Figure; moreMatureOptions: boolean; claimIds: string[] };
  claimIds: string[];
}

export interface Scoring {
  /** In-scope public cloud spend at the midpoints (P), when known. */
  P: number | null;
  /** Expected run-rate value per lever after the cap, gross and net of the lever's run cost (gross without a rate). */
  byLever: Map<string, { gross: number; net: number }>;
  totalExpected: number | null;
  upliftShare: number;
  needShare: number;
}
export interface ValueModelOutput {
  value: ValueBlock;
  scoring: Scoring;
  /** DECISION-02: steady usage above today's coverage is all removed by the usage and Spot moves (10.4). */
  decision02: boolean;
  /** Levers blocked by an unknown input, keyed by the input (for scope-confirmation findings). */
  blocking: Map<string, string[]>;
  quantified: string[];
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
const inputLabel = (path: string) => {
  const key = path.startsWith('spend.byScope.') ? 'spend.byScope' : path;
  const d = VR.inputs[key];
  return d ? (key === 'spend.byScope' ? `annual spend with ${path.slice('spend.byScope.'.length).toUpperCase()}` : d.label) : path;
};
export const inputInfo = (path: string): { id: string; label: string; question: string; executiveQuestion?: string } => {
  const key = path.startsWith('spend.byScope.') ? 'spend.byScope' : path;
  const d = VR.inputs[key] ?? { id: path.replace(/\W+/g, '_').toUpperCase(), question: '' };
  return { ...d, id: key === 'spend.byScope' ? `${d.id}_${path.slice('spend.byScope.'.length).toUpperCase()}` : d.id, label: inputLabel(path) };
};

const CONF = ['Low', 'Medium', 'High'] as const;
function leverConfidence(pp: Prepared, id: string): { level: 'High' | 'Medium' | 'Low'; reason: string } {
  const r = VR.confidence.reasons;
  const EVIDENCE_ONLY = ['LEV-02', 'LEV-03', 'LEV-05', 'LEV-09'];
  const paths = EVIDENCE_ONLY.includes(id) ? [] : (pp.uses.get(id) ?? []).filter(p => !p.endsWith('renewingYear1Share'));
  const kinds = paths.map(p => pp.inputs.get(p)!.kind);
  let level: 'High' | 'Medium' | 'Low' = kinds.every(k => k === 'evidence') ? 'High' : kinds.every(k => k === 'evidence' || k === 'exact') ? 'Medium' : 'Low';
  let reason = level === 'High' ? r.evidence : level === 'Medium' ? r.exact : kinds.includes('derived') ? r.derived : r.band;
  if (pp.ctx.mode === 'executive' && level === 'High') { level = 'Medium'; reason = `${reason}. ${r.executiveCap}`; }
  return { level, reason };
}

/** Builds the value block, the scoring values and DECISION-02 (DESIGN.md 10). */
export function buildValueModel(ctx: ValueModelContext): ValueModelOutput {
  const pp = prepare(ctx);
  const f = ctx.facts;
  const quantified = LEVER_IDS.filter(id => pp.status.get(id)?.ok);
  const rate = pp.inputs.get('cost.internalRate');
  const tooling = pp.inputs.get('cost.tooling');
  const moneyShown = !!rate && quantified.length > 0;
  const solved = moneyShown ? solve(pp) : null;
  const mid = compute(pp, midpoint(pp), C.expectedFactor);
  const V = 'value';

  // Costs (10.6): effort for every lever with a positive upper value; banded rate: conservative high, upper low.
  const tier = String(ctx.tier);
  const active = solved ? quantified.filter(id => (solved.upper.levers.get(id)?.upper ?? 0) > 0) : [];
  const effortOf = (id: string) => L.get(id)!.effort[tier];
  const rateFor = (c: Case) => (!rate ? 0 : c === 'conservative' ? rate.high : c === 'upper' ? rate.low : rate.mid);
  const toolingFor = (c: Case) => (!tooling ? 0 : c === 'conservative' ? tooling.high : c === 'upper' ? tooling.low : tooling.mid);

  // Phasing safeguard (ASM-FIN-042): corners are chosen on run-rate, so a lower case could ramp faster than the case
  // above it. Its year-1 figures are then lowered pro rata to the year-1 of the case above, never raised.
  const ramp1 = (id: string, c: Case) => { const y = L.get(id)!.ramp.year1; return y === 'renewal_share' ? renewalShare(pp, c) : y; };
  const y1Scale: Record<Case, number> = { conservative: 1, expected: 1, upper: 1 };
  if (solved) {
    const y1Of = (c: Case, m: number) => quantified.reduce((t, id) => {
      const l = solved[c].levers.get(id)!;
      return t + money(money(l.value * (CLOUD_EXCLUDED.has(id) ? 1 : solved[c].scale)) * ramp1(id, c) * m);
    }, 0);
    const up = y1Of('upper', 1), ex = y1Of('expected', 1);
    if (ex > up && ex > 0) y1Scale.expected = up / ex;
    const ex2 = y1Of('expected', y1Scale.expected), co = y1Of('conservative', 1);
    if (co > ex2 && co > 0) y1Scale.conservative = ex2 / co;
  }

  const levers: LeverValue[] = LEVER_IDS.filter(id => ctx.leversInScope.includes(id)).map(id => {
    const lc = L.get(id)!;
    const st = pp.status.get(id)!;
    const path = `${V}.levers[${id}]`;
    const asm = uniq(['ASM-FIN-040', 'ASM-FIN-041', 'ASM-FIN-042', lc.rampAssumption, lc.effortAssumption, ...(id === 'LEV-04' ? ['ASM-FIN-043'] : []), ...(['LEV-07', 'LEV-10'].includes(id) ? ['ASM-FIN-044'] : []), ...(['LEV-02', 'LEV-03', 'LEV-05'].includes(id) ? ['ASM-FIN-048'] : []), ...(id === 'LEV-01' ? ['ASM-FIN-049'] : []), ...(id === 'LEV-01' || id === 'LEV-04' ? (ctx.mode === 'executive' ? ['ASM-FIN-052'] : []) : []), ...(CLOUD_EXCLUDED.has(id) ? [] : ['ASM-FIN-050'])]);
    const claims = uniq([...lc.claimIds, 'CLM-FIN-128', 'CLM-FIN-129', 'CLM-FIN-130', 'CLM-FIN-160', 'CLM-FIN-161']);
    // Published (rate levers, per provider), arithmetic (LEV-04) or evidence (100%) maxima; LEV-07 and LEV-10 use a
    // formula on measured utilisation, so their rate is shown per case.
    const maxRate: LeverValue['maxRate'] = lc.type === 'rate'
      ? (pp.ratedProviders.get(id) ?? []).map(p => ({ provider: p, rate: fig(`${path}.maxRate[${p}].rate`, lc.rateByProvider[p]!.rate, 'share', [lc.rateByProvider[p]!.claimId, ...claims], asm), instrument: lc.rateByProvider[p]!.instrument }))
      : lc.rate !== null ? [{ provider: 'all', rate: fig(`${path}.maxRate[all].rate`, share(lc.rate), 'share', [lc.rateClaimId ?? lc.claimIds[0], ...claims], asm), instrument: null }]
      : [];
    const out: LeverValue = {
      id, name: lc.name, type: lc.type, capability: lc.capability,
      status: st.ok ? 'quantified' : 'not_quantified', reason: st.ok ? null : st.reason, reasonText: st.ok ? null : reasonText(st, id),
      blockedBy: st.ok ? [] : st.blockedBy,
      formula: lc.formula, rateFormula: lc.rateFormula, basisLine: lc.label,
      inputs: [], maxRate,
      unsourcedProviders: pp.unsourcedProviders.get(id) ?? [],
      cases: null, effortFteMonths: null, confidence: null, confidenceReason: null,
      claimIds: claims, assumptionIds: asm, offeringIds: [...lc.offeringIds]
    };
    if (!st.ok) return out;
    const conf = leverConfidence(pp, id);
    out.confidence = conf.level; out.confidenceReason = conf.reason;
    out.inputs = (pp.uses.get(id) ?? []).filter(p => moneyShown || !p.startsWith('spend.') && !p.startsWith('evidence.') && p !== 'base.kubernetesSpend').map(p => {
      const i = pp.inputs.get(p)!;
      const unit: Unit = p.startsWith('spend.') || p === 'base.kubernetesSpend' || (p.startsWith('evidence.') && !p.endsWith('Utilisation') && !p.endsWith('Share')) ? 'currency' : 'share';
      const ip = `${path}.inputs[${p}]`;
      const ids = [...claims, ...(p.startsWith('base.') ? ['CLM-FIN-142'] : []), ...(i.kind === 'derived' ? ['CLM-FIN-140'] : [])];
      const r = (x: number) => (unit === 'currency' ? money(x) : share(x));
      return { fact: p, kind: i.kind, value: fig(`${ip}.value`, r(i.mid), unit, ids, ['ASM-FIN-042']),
        low: banded(i) ? fig(`${ip}.low`, r(i.low), unit, ids, ['ASM-FIN-042']) : null, high: banded(i) ? fig(`${ip}.high`, r(i.high), unit, ids, ['ASM-FIN-042']) : null };
    });
    if (!solved) return out;
    out.effortFteMonths = fig(`${path}.effortFteMonths`, active.includes(id) ? effortOf(id) : 0, 'fte_months', ['CLM-FIN-134', 'CLM-FIN-170'], [lc.effortAssumption]);
    const cases = {} as Record<Case, LeverCase>;
    for (const c of CASES) {
      const raw = solved[c];
      const l = raw.levers.get(id)!;
      const cp = `${path}.cases.${c}`;
      const scale = CLOUD_EXCLUDED.has(id) ? 1 : raw.scale;
      const runRate = money(l.value * scale);
      const y1 = ramp1(id, c) * y1Scale[c];
      const ramp = ['CLM-FIN-133', ...claims];
      const year1 = money(money(runRate * ramp1(id, c)) * y1Scale[c]), year2 = money(runRate * lc.ramp.year2), year3 = money(runRate * lc.ramp.year3);
      const runCost = rate && active.includes(id) ? cost(effortOf(id) * lc.ongoing * rateFor(c)) : 0;
      cases[c] = {
        factor: fig(`${cp}.factor`, raw.factor, 'ratio', ['CLM-FIN-128', 'CLM-FIN-129'], ['ASM-FIN-040', 'ASM-FIN-041']),
        base: fig(`${cp}.base`, money(l.base), 'currency', claims, asm),
        rate: fig(`${cp}.rate`, l.base > 0 ? Math.round((l.upper / l.base) * 1e6) / 1e6 : 0, 'ratio', claims, asm),
        upperBeforeFactor: fig(`${cp}.upperBeforeFactor`, money(l.upper), 'currency', claims, asm),
        beforeGlobalCap: fig(`${cp}.beforeGlobalCap`, money(l.value), 'currency', claims, asm),
        globalCapScale: fig(`${cp}.globalCapScale`, share(scale), 'ratio', ['CLM-FIN-138', 'CLM-FIN-040'], ['ASM-FIN-050']),
        runRate: fig(`${cp}.runRate`, runRate, 'currency', claims, asm),
        year1Share: fig(`${cp}.year1Share`, share(y1), 'share', ramp, [lc.rampAssumption, ...(y1Scale[c] < 1 ? ['ASM-FIN-042'] : [])]),
        year1: fig(`${cp}.year1`, year1, 'currency', ramp, [...asm, lc.rampAssumption]),
        year2: fig(`${cp}.year2`, year2, 'currency', ramp, [...asm, lc.rampAssumption]),
        year3: fig(`${cp}.year3`, year3, 'currency', ramp, [...asm, lc.rampAssumption]),
        threeYear: fig(`${cp}.threeYear`, year1 + year2 + year3, 'currency', ramp, [...asm, lc.rampAssumption, 'ASM-FIN-051']),
        runCost: fig(`${cp}.runCost`, runCost, 'currency', ['CLM-FIN-135', 'CLM-FIN-170'], ['ASM-FIN-047', lc.effortAssumption]),
        netRunRate: fig(`${cp}.netRunRate`, runRate - runCost, 'currency', ['CLM-FIN-135', 'CLM-FIN-170', ...claims], ['ASM-FIN-047', ...asm])
      };
    }
    out.cases = cases;
    return out;
  });

  // Totals per case, with the global cap shown with its source.
  let totals: ValueBlock['totals'] = null;
  if (solved) {
    totals = {} as Record<Case, CaseTotals>;
    const capClaims = ['CLM-FIN-138', 'CLM-FIN-040'];
    for (const c of CASES) {
      const tp = `${V}.totals.${c}`;
      const raw = solved[c];
      const sumOf = (k: keyof LeverCase) => levers.reduce((t, l) => t + (l.cases ? (l.cases[c][k] as Figure | null)?.value ?? 0 : 0), 0);
      const gross = sumOf('runRate'), y1 = sumOf('year1'), y2 = sumOf('year2'), y3 = sumOf('year3');
      const oneOff = active.reduce((t, id) => t + cost(effortOf(id) * rateFor(c)), 0);
      const leverRun = sumOf('runCost');
      const tool = cost(toolingFor(c));
      const run = leverRun + tool;
      const all = uniq(levers.flatMap(l => (l.cases ? l.claimIds : [])));
      const allAsm = uniq(levers.flatMap(l => (l.cases ? l.assumptionIds : [])));
      const costIds = ['CLM-FIN-134', 'CLM-FIN-135', 'CLM-FIN-170'];
      totals[c] = {
        P: fig(`${tp}.P`, money(raw.P), 'currency', ['CLM-FIN-150', 'CLM-FIN-130'], ['ASM-FIN-042']),
        grossRunRate: fig(`${tp}.grossRunRate`, gross, 'currency', all, allAsm),
        pctOfP: fig(`${tp}.pctOfP`, pct(gross, raw.P), 'percent', all, allAsm),
        grossYear1: fig(`${tp}.grossYear1`, y1, 'currency', ['CLM-FIN-133', ...all], ['ASM-FIN-045', ...allAsm]),
        grossYear2: fig(`${tp}.grossYear2`, y2, 'currency', ['CLM-FIN-133', ...all], ['ASM-FIN-045', ...allAsm]),
        grossYear3: fig(`${tp}.grossYear3`, y3, 'currency', ['CLM-FIN-133', ...all], ['ASM-FIN-045', ...allAsm]),
        gross3Year: fig(`${tp}.gross3Year`, y1 + y2 + y3, 'currency', ['CLM-FIN-133', 'CLM-FIN-139', ...all], ['ASM-FIN-045', 'ASM-FIN-051', ...allAsm]),
        oneOffCost: fig(`${tp}.oneOffCost`, oneOff, 'currency', costIds, ['ASM-FIN-046', 'ASM-FIN-059']),
        leverRunCost: fig(`${tp}.leverRunCost`, leverRun, 'currency', costIds, ['ASM-FIN-047', 'ASM-FIN-059']),
        toolingCost: fig(`${tp}.toolingCost`, tool, 'currency', costIds, ['ASM-FIN-081']),
        annualRunCost: fig(`${tp}.annualRunCost`, run, 'currency', costIds, ['ASM-FIN-047', 'ASM-FIN-081']),
        netYear1: fig(`${tp}.netYear1`, y1 - oneOff - run, 'currency', [...costIds, 'CLM-FIN-133'], ['ASM-FIN-045', 'ASM-FIN-046', 'ASM-FIN-047']),
        netYear2: fig(`${tp}.netYear2`, y2 - run, 'currency', [...costIds, 'CLM-FIN-133'], ['ASM-FIN-045', 'ASM-FIN-047']),
        netYear3: fig(`${tp}.netYear3`, y3 - run, 'currency', [...costIds, 'CLM-FIN-133'], ['ASM-FIN-045', 'ASM-FIN-047']),
        netRunRate: fig(`${tp}.netRunRate`, gross - run, 'currency', costIds, ['ASM-FIN-047']),
        net3Year: fig(`${tp}.net3Year`, y1 + y2 + y3 - oneOff - 3 * run, 'currency', [...costIds, 'CLM-FIN-133', 'CLM-FIN-139'], ['ASM-FIN-045', 'ASM-FIN-046', 'ASM-FIN-047', 'ASM-FIN-051']),
        cloudBeforeCap: fig(`${tp}.cloudBeforeCap`, money(raw.cloud), 'currency', capClaims, ['ASM-FIN-050']),
        cap: fig(`${tp}.cap`, money(raw.cap), 'currency', capClaims, ['ASM-FIN-050']),
        capBinding: raw.scale < 1,
        capScale: fig(`${tp}.capScale`, share(raw.scale), 'ratio', capClaims, ['ASM-FIN-050'])
      };
    }
  }

  // Confidence (10.7): the levers carrying more than half of the expected value.
  const confidence = overallConfidence(levers, ctx.mode);

  // Scoring values (5.3 step 3, 9): executive mode takes the highest value at the OP-06 answer or a more mature one.
  const scoring = scoringValues(pp, mid, rate, ctx);

  // DECISION-02 at the midpoints: steady usage above coverage exists, but n_u and t_u remove all of it for a provider.
  let decision02 = false;
  if (pp.status.get('LEV-01')?.ok) {
    const m = midpoint(pp);
    const S = m['base.steadyStateShare'], Cv = m['base.eligibleCoverage'];
    const nu = m['base.nonProdShare'] * (1 - (m['base.nonProdScheduledShare'] ?? 0));
    const tol = pp.status.get('LEV-06')?.ok ? Math.max(0, (m['base.interruptionTolerantShare'] ?? 0) - (m['base.spotShare'] ?? 0)) : 0;
    const spot = new Set(pp.status.get('LEV-06')?.ok ? pp.ratedProviders.get('LEV-06') : []);
    decision02 = S - Cv > 0 && pp.ratedProviders.get('LEV-01')!.some(p => S - Cv - nu - (spot.has(p) ? tol : 0) <= 0);
  }

  // Unknown inputs that block a lever this mode quantifies (scope-confirmation findings).
  const blocking = new Map<string, string[]>();
  for (const [id, st] of pp.status) if (!st.ok) for (const b of st.blockedBy) blocking.set(b, [...(blocking.get(b) ?? []), id]);

  const notQuantified = levers.filter(l => l.status === 'not_quantified').map(l => ({
    lever: l.id, name: l.name, reason: l.reason!, reasonText: l.reasonText!, blockedBy: l.blockedBy,
    evidenceNeeded: VR.leverFindings.byLever[l.id]?.evidence ?? '', claimIds: uniq([...VR.notQuantifiedReasons.claimIds, ...l.claimIds.slice(0, 1)])
  }));

  const corners = solved ? Object.fromEntries((['conservative', 'upper'] as const).map(c => [c, solved.searched.map(p => {
    const unit: Unit = p.startsWith('spend.') || p === 'base.kubernetesSpend' || (p.startsWith('evidence.') && !p.endsWith('Utilisation')) ? 'currency' : 'share';
    const x = solved[c].point[p];
    return { fact: p, value: fig(`${V}.bands.corners.${c}[${p}].value`, unit === 'currency' ? money(x) : share(x), unit, ['CLM-FIN-130', 'CLM-FIN-172'], ['ASM-FIN-042']) };
  })])) as ValueBlock['bands']['corners'] : null;

  const cap = C.capSource;
  const team = finopsTeam(ctx, rate);
  const hypothesis = hypothesisPanel(ctx, solved, totals, notQuantified.length > 0, moneyShown);
  const labels = VR.labels;
  return {
    value: {
      version: VALUE_MODEL_VERSION,
      status: quantified.length ? 'quantified' : 'not_quantified',
      moneyShown,
      label: labels.headline, detail: labels.detail,
      notice: !quantified.length ? labels.notQuantifiedAtAll : !rate ? labels.withheld : null,
      currency: f.org.currency,
      levers,
      totals,
      globalCap: {
        share: fig(`${V}.globalCap.share`, C.capShare, 'share', ['CLM-FIN-138', 'CLM-FIN-040'], ['ASM-FIN-050']),
        appliesTo: K('levers', 'globalCap.appliesTo'), excludedLevers: [...CLOUD_EXCLUDED],
        statement: 'Public cloud levers are capped at 29% of in-scope public cloud spend in every case, scaled pro rata when the cap binds; LEV-09 is outside this base',
        source: { claimId: cap.claimId, citation: cap.citation, url: cap.url, year: String(cap.year), sample: `n = ${cap.sample}`, checked: cap.checked, assumptionId: cap.assumptionId },
        claimIds: ['CLM-FIN-138', 'CLM-FIN-040']
      },
      costs: {
        internalRateProvided: !!rate, toolingProvided: !!tooling,
        toolingNote: tooling ? VR.costs.toolingProvided : VR.costs.toolingNotProvided,
        externalSupportIncluded: false, externalSupportNote: VR.costs.externalSupport,
        effortFteMonths: solved ? fig(`${V}.costs.effortFteMonths`, active.reduce((t, id) => t + effortOf(id), 0), 'fte_months', ['CLM-FIN-134', 'CLM-FIN-170'], ['ASM-FIN-046']) : null,
        claimIds: [...VR.costs.claimIds]
      },
      finopsTeam: team,
      confidence,
      hypothesis,
      notQuantified,
      bands: { searched: solved?.searched ?? [], fixedAtMidpoint: solved?.fixed ?? [], corners, claimIds: ['CLM-FIN-130', 'CLM-FIN-172'] },
      scoring: {
        severityUpliftShareOfP: fig(`${V}.scoring.severityUpliftShareOfP`, C.upliftShare, 'share', ['CLM-FIN-122', 'CLM-FIN-172'], ['ASM-FIN-005', 'ASM-FIN-056']),
        needModifierShareOfP: fig(`${V}.scoring.needModifierShareOfP`, C.needShare, 'share', ['CLM-FIN-127', 'CLM-FIN-172'], ['ASM-FIN-031', 'ASM-FIN-056']),
        moreMatureOptions: ctx.mode === 'executive' && ctx.op06.asked,
        claimIds: [...VR.scoring.claimIds]
      },
      claimIds: uniq([...labels.claimIds, 'CLM-FIN-128', 'CLM-FIN-129', 'CLM-FIN-130', 'CLM-FIN-138', 'CLM-FIN-160'])
    },
    scoring, decision02, blocking, quantified
  };
}

/* --------------------------------- Helpers ---------------------------------- */

function reasonText(st: Extract<Status, { ok: false }>, id: string): string {
  const t = VR.notQuantifiedReasons;
  if (st.reason === 'rate_unsourced_for_provider') return fill(t.rate_unsourced_for_provider, { providers: (st.detail ?? []).map(p => p.toUpperCase()).join(', ') || 'the selected providers' });
  if (st.reason === 'no_estimate_of_type') return fill(t.no_estimate_of_type, { types: (st.detail ?? []).join(' or ') });
  if (st.reason === 'missing_input') return fill(t.missing_input, { inputs: st.blockedBy.map(inputLabel).join(', ') });
  void id;
  return t[st.reason];
}

function renewalShare(pp: Prepared, c: Case): number {
  const r = pp.inputs.get('evidence.saasLicence.renewingYear1Share');
  if (!r) return DEFAULT_RENEWAL_SHARE;
  return c === 'conservative' ? r.low : c === 'upper' ? r.high : r.mid;
}

function overallConfidence(levers: LeverValue[], mode: Mode): ValueBlock['confidence'] {
  const t = VR.confidence;
  const q = levers.filter(l => l.status === 'quantified');
  if (!q.length) return { overall: null, reason: t.reasons.none, claimIds: [...t.claimIds] };
  const ev = (l: LeverValue) => l.cases?.expected.runRate.value ?? 0;
  const total = q.reduce((s, l) => s + ev(l), 0);
  const sorted = [...q].sort((a, b) => ev(b) - ev(a));
  const carrying: LeverValue[] = [];
  let acc = 0;
  for (const l of sorted) { carrying.push(l); acc += ev(l); if (acc > total / 2) break; }
  const pickFrom = total > 0 ? carrying : q;
  let overall = pickFrom.reduce<'High' | 'Medium' | 'Low'>((m, l) => (CONF.indexOf(l.confidence!) < CONF.indexOf(m) ? l.confidence! : m), 'High');
  if (mode === 'executive' && overall === 'High') overall = 'Medium';
  const reason = `${overall}: ${pickFrom.map(l => `${l.id} ${l.confidence}`).join(', ')}${mode === 'executive' ? `. ${t.reasons.executiveCap}` : ''}`;
  return { overall, reason, claimIds: [...t.claimIds] };
}

function scoringValues(pp: Prepared, mid: CaseRaw, rate: In | undefined, ctx: ValueModelContext): Scoring {
  const known = pp.providers.length > 0 && pp.providers.every(p => pp.inputs.has(`spend.byScope.${p}`));
  const P = known ? mid.P : null;
  const runCost = (id: string, gross: number) => (rate && gross > 0 ? L.get(id)!.effort[String(ctx.tier)] * L.get(id)!.ongoing * rate.mid : 0);
  const byLever = new Map<string, { gross: number; net: number }>();
  let totalExpected: number | null = null;
  const take = (raw: CaseRaw) => {
    for (const [id, l] of raw.levers) {
      const gross = l.value * (CLOUD_EXCLUDED.has(id) ? 1 : raw.scale);
      const prev = byLever.get(id);
      const net = gross - runCost(id, gross);
      if (!prev || gross > prev.gross) byLever.set(id, { gross, net });
    }
    totalExpected = Math.max(totalExpected ?? 0, raw.total);
  };
  const anyOk = (x: Prepared) => [...x.status.values()].some(st => st.ok);
  if (P !== null) {
    if (anyOk(pp)) take(mid);
    // Executive mode: the value at the OP-06 answer or any more mature one, so a better or blank answer never lowers the score.
    if (ctx.mode === 'executive' && ctx.op06.asked) {
      const order: AnswerLevel[] = ['not_yet', 'crawl', 'walk', 'run'];
      const from = ctx.op06.level === undefined || ctx.op06.level === 'unknown' ? 0 : order.indexOf(ctx.op06.level);
      for (const lvl of order.slice(from)) {
        if (lvl === ctx.op06.level) continue;
        const alt = prepare(ctx, lvl);
        if (anyOk(alt)) take(compute(alt, midpoint(alt), C.expectedFactor));
      }
    }
  }
  return { P, byLever, totalExpected, upliftShare: C.upliftShare, needShare: C.needShare };
}

function finopsTeam(ctx: ValueModelContext, rate: In | undefined): ValueBlock['finopsTeam'] {
  const t = VR.finopsTeam;
  const p = 'value.finopsTeam';
  const fte = C.teamFte[String(ctx.tier)];
  if (!ctx.decision01Raised) return { shown: false, statement: t.notRaised, fte: null, annualCost: null, nettedAgainstValue: false, claimIds: [...t.claimIds] };
  if (!rate) return { shown: false, statement: t.noRate, fte: fig(`${p}.fte`, fte, 'fte', t.claimIds, ['ASM-FIN-054']), annualCost: null, nettedAgainstValue: false, claimIds: [...t.claimIds] };
  return {
    shown: true, statement: t.statement,
    fte: fig(`${p}.fte`, fte, 'fte', t.claimIds, ['ASM-FIN-054']),
    annualCost: fig(`${p}.annualCost`, cost(fte * C.teamMonths * rate.mid), 'currency', t.claimIds, ['ASM-FIN-054', 'ASM-FIN-080']),
    nettedAgainstValue: false, claimIds: [...t.claimIds]
  };
}

function hypothesisPanel(ctx: ValueModelContext, solved: ReturnType<typeof solve> | null, totals: ValueBlock['totals'], anyNotQuantified: boolean, moneyShown: boolean): ValueBlock['hypothesis'] {
  const t = VR.hypothesis;
  const p = 'value.hypothesis';
  const band = ctx.hypothesis;
  const base = { statement: t.statement, neverAnInput: true as const, claimIds: [...t.claimIds] };
  const range = band ? C.hypothesisBands[band] : undefined;
  if (!band || !range || !moneyShown || !solved || !totals) return { answered: !!band, band: band ?? null, amountLow: null, amountHigh: null, position: null, explanations: [], ...base };
  const P = solved.expected.P;
  const low = P * range[0], high = range[1] === null ? null : P * range[1];
  const midH = high === null ? low : (low + high) / 2;
  const exp = totals.expected.grossRunRate.value, up = totals.upper.grossRunRate.value;
  const position = low > up ? 'above_upper' : midH > exp ? 'above_expected' : 'at_or_below_expected';
  const ids: string[] = position === 'at_or_below_expected' ? ['estimate_at_or_below_model']
    : [...(anyNotQuantified ? ['levers_not_quantified'] : []), 'expected_is_half_of_maximum', ...(position === 'above_upper' ? ['unallocated_not_waste'] : [])];
  return {
    answered: true, band,
    amountLow: fig(`${p}.amountLow`, money(low), 'currency', t.claimIds, ['ASM-FIN-026']),
    amountHigh: high === null ? null : fig(`${p}.amountHigh`, money(high), 'currency', t.claimIds, ['ASM-FIN-026']),
    position, explanations: ids.map(id => ({ id, text: t.explanations[id] })), ...base
  };
}

/** Sums lever case figures into a finding's value (value sits on the lever; the finding shows the levers it owns). */
export function findingValue(findingId: string, leverIds: string[], value: ValueBlock): { leverIds: string[]; conservative: Figure; expected: Figure; upper: Figure } | null {
  const owned = value.levers.filter(l => leverIds.includes(l.id) && l.cases);
  if (!owned.length) return null;
  const ids = uniq(owned.flatMap(l => l.claimIds));
  const asm = uniq(owned.flatMap(l => l.assumptionIds));
  const sum = (c: Case) => owned.reduce((t, l) => t + l.cases![c].runRate.value, 0);
  const p = `findings[${findingId}].value`;
  return {
    leverIds: owned.map(l => l.id),
    conservative: fig(`${p}.conservative`, sum('conservative'), 'currency', ids, asm),
    expected: fig(`${p}.expected`, sum('expected'), 'currency', ids, asm),
    upper: fig(`${p}.upper`, sum('upper'), 'currency', ids, asm)
  };
}
