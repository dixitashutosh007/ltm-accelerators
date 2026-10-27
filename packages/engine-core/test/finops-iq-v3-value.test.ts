/**
 * FinOps IQ v3 value model (plan phase F4, area 13): reconciliation, inflation guard, trace data, language lint,
 * assumption register, and the reference scenarios' value figures against the ranges written in F1
 * (docs/cio-readiness/finops-iq/design/reference-scenarios.json). Justified differences are recorded in
 * docs/cio-readiness/finops-iq/design/F4-scenario-diffs.md and mirrored in VALUE_DIFFS below.
 * Every breach of the inflation guard is reported with the seed, mode and input that produced it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import {
  evaluateFinOpsIqV3, QUESTIONS, type FinOpsIqV3Input, type FinOpsIqV3Result, type Facts, type Mode, type AnswerLevel
} from '../src/accelerators/finops-iq/v3';
import { resolveField, valueModelConstantReads, type Figure } from '../src/accelerators/finops-iq/v3/value-model';
import { finopsIqReport } from '../src/accelerators/finops-iq/v3/report';
import levers from '../src/accelerators/finops-iq/registry/levers.json' with { type: 'json' };
import thresholds from '../src/accelerators/finops-iq/registry/thresholds.json' with { type: 'json' };
import marketData from '../src/accelerators/finops-iq/registry/market-data.json' with { type: 'json' };
import capabilities from '../src/accelerators/finops-iq/registry/capabilities.json' with { type: 'json' };
import assumptions from '../src/accelerators/finops-iq/registry/assumptions.json' with { type: 'json' };
import workstreams from '../src/accelerators/finops-iq/registry/workstreams.json' with { type: 'json' };
import valueRules from '../src/accelerators/finops-iq/v3/value-rules.json' with { type: 'json' };
import engineRules from '../src/accelerators/finops-iq/v3/engine-rules.json' with { type: 'json' };
import questionBank from '../src/accelerators/finops-iq/v3/question-bank.json' with { type: 'json' };
import register from '../src/claims/claims-register.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs');
const DESIGN_DIR = join(__dirname, '../../../docs/cio-readiness/finops-iq/design');
const SCENARIOS: any[] = JSON.parse(readFileSync(join(DESIGN_DIR, 'reference-scenarios.json'), 'utf8')).scenarios;
const CLAIMS = new Set<string>((register as any).claims.map((c: any) => c.id));
const ASM: any[] = (assumptions as any).assumptions;
const ASM_IDS = new Set<string>(ASM.map(a => a.id));
const LEVER_IDS: string[] = (levers as any).levers.map((l: any) => l.id);
const CAP_SHARE: number = (levers as any).globalCap.shareOfPublicCloudSpend;
const CASES = ['conservative', 'expected', 'upper'] as const;
const ASSESSED = '2026-10-14';

/* --------------------------------- Inputs ---------------------------------- */

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const answerFor = (id: string, level: AnswerLevel) => (id === 'UN-08' ? UN08[level] : level);
const HY01: Record<string, string> = { '5-9%': 'p5_9', '10-19%': 'p10_19', '20-29%': 'p20_29', "don't know": 'dont_know' };

/** The scenario as the client answered it, including HY-01 where the scenario records it (answersNote / hypothesis). */
function scenarioInput(s: any): FinOpsIqV3Input {
  const answers: Record<string, any> = {};
  for (const [id, code] of Object.entries<string>(s.inputs.answers)) answers[id] = answerFor(id, CODE[code]);
  const band = s.expected.value?.hypothesis?.band;
  if (band && HY01[band]) answers['HY-01'] = HY01[band];
  return { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: ASSESSED };
}

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const subset = <T>(r: () => number, a: T[], p = 0.5) => a.filter(() => r() < p);
const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
/** An amount or share: exact, band or unknown (blank). */
function amount(r: () => number, lo: number, hi: number, pUnknown = 0.1, pBand = 0.35, d = 4) {
  const x = r();
  if (x < pUnknown) return { unknown: true as const };
  const v = round(lo + r() * (hi - lo), d);
  if (x < pUnknown + pBand) return { band: [v, round(Math.min(hi, v + r() * (hi - lo) * 0.4), d)] as [number, number] };
  return { exact: v };
}
const daysBefore = (n: number) => new Date(Date.parse(ASSESSED) - n * 86400000).toISOString().slice(0, 10);

/** A value-rich random estate: every value base, evidence and cost input can be exact, banded or unknown. */
function randomFacts(r: () => number): Facts {
  const providers = subset(r, ['aws', 'azure', 'gcp', 'oci'], 0.45);
  if (!providers.length && r() < 0.9) providers.push(pick(r, ['aws', 'azure', 'gcp']));
  const scopes = ['public_cloud', ...subset(r, ['kubernetes', 'ai_platform_gpu', 'ai_api', 'saas', 'licensing', 'data_centre'], 0.35)];
  const byScope: Record<string, any> = {};
  for (const p of providers) byScope[p] = amount(r, 500_000, 60_000_000, 0.06, 0.3, 0);
  const P = 30_000_000;
  const base: Record<string, any> = {};
  const share = (k: string, lo = 0, hi = 1, pu = 0.12) => { if (r() < 0.9) base[k] = amount(r, lo, hi, pu); };
  share('computeShare', 0.2, 1); share('steadyStateShare'); share('eligibleCoverage'); share('nonProdShare', 0, 0.6);
  share('nonProdScheduledShare'); share('interruptionTolerantShare', 0, 0.5); share('spotShare', 0, 0.5);
  if (scopes.includes('kubernetes')) { base.kubernetesSpend = amount(r, 0, P * 0.4, 0.15, 0.3, 0); share('kubernetesRequestUtilisation', 0.1, 0.9); }
  const evidence: Record<string, any> = {};
  if (r() < 0.7) {
    evidence.providerRecommendations = Array.from({ length: 1 + Math.floor(r() * 4) }, () => ({
      type: pick(r, ['rightsizing', 'modernisation', 'idle', 'storage', 'commitments', 'other']), provider: pick(r, [...providers, undefined] as any[]) ?? undefined,
      tool: 'Provider tool', deduplicated: r() < 0.4, annualEstimate: Math.round(r() * P * 0.08), exportDate: daysBefore(Math.floor(r() * 150))
    })).map(x => (x.provider ? x : (({ provider, ...rest }) => rest)(x)));
  }
  if (scopes.includes('ai_platform_gpu') || scopes.includes('ai_api')) {
    const ai: Record<string, any> = {};
    for (const [k, lo, hi] of [['gpuSpend', 0, P * 0.2], ['gpuUtilisation', 0.05, 0.95], ['idleEndpointSpend', 0, P * 0.03]] as const) {
      const a = amount(r, lo, hi, 0.15, 0.3, k === 'gpuUtilisation' ? 4 : 0);
      if (!('unknown' in a)) ai[k] = a;
    }
    evidence.aiGpu = ai;
  }
  if ((scopes.includes('saas') || scopes.includes('licensing')) && r() < 0.6) {
    evidence.saasLicence = { unusedAnnualCost: Math.round(r() * 3_000_000), source: 'SaaS management report', measuredOn: daysBefore(10), ...(r() < 0.6 ? { renewingYear1Share: amount(r, 0, 1, 0) } : {}) };
  }
  const cost: Record<string, any> = {};
  if (r() < 0.9) cost.internalRate = r() < 0.75 ? { exact: Math.round(8000 + r() * 12000) } : { band: [9000, 15000] };
  if (r() < 0.6) cost.tooling = { exact: Math.round(r() * 400_000) };
  const eur = r() < 0.3;
  return {
    org: { currency: eur ? 'EUR' : 'USD', ...(eur ? { tierFxRate: 1.08 } : {}), consumingUnits: pick(r, ['1', '2-4', '5-19', '20+']) },
    footprint: { publicCloudProviders: providers, scopes, ...(scopes.includes('kubernetes') && r() < 0.3 ? { gpuInsideKubernetes: true } : {}) },
    spend: { byScope, growth12m: Math.round(r() * 60) - 10 },
    base, ...(Object.keys(evidence).length ? { evidence } : {}), cost
  };
}

function randomAnswer(r: () => number, q: any): any {
  const values = (q.options ?? []).map((o: any) => o.value);
  if (q.id === 'UN-08') return r() < 0.15 ? 'unknown' : subset(r, REPORTS);
  switch (q.answerType) {
    case 'single_select': return pick(r, values);
    case 'multi_select': return subset(r, values);
    case 'rank': return [...values].sort(() => r() - 0.5);
    case 'allocation_100': return { engineering: 40, finance: 20, central_it: 20, nobody: 20 };
    case 'open_text': return 'Notes';
    default: return undefined;
  }
}

function randomInput(seed: number, mode: Mode): FinOpsIqV3Input {
  const r = rng(seed);
  const answers: Record<string, any> = {};
  for (const q of QUESTIONS) {
    if (!q.modes.includes(mode) || q.kind === 'scope' || q.kind === 'value_base' || r() < 0.12) continue;
    answers[q.id] = randomAnswer(r, q);
  }
  return { mode, facts: randomFacts(r), answers, ...(r() < 0.92 ? { assessmentDate: ASSESSED } : {}) };
}

const N_RANDOM = 1000;
const scenarioRuns = SCENARIOS.map(s => ({ label: s.id, input: scenarioInput(s), r: evaluateFinOpsIqV3(scenarioInput(s)) }));
const randomRuns = (['executive', 'workshop'] as Mode[]).flatMap(mode => Array.from({ length: N_RANDOM }, (_, i) => {
  const input = randomInput(70_000 + i, mode);
  return { label: `${mode} seed ${70_000 + i}`, input, r: evaluateFinOpsIqV3(input) };
}));
const ALL = [...scenarioRuns, ...randomRuns];
const SHOWN = ALL.filter(x => x.r.value.moneyShown);

/** Collects breaches and fails with the first one in full, so CI prints the case. */
function guard(check: (x: typeof ALL[number], fail: (msg: string) => void) => void, runs = ALL) {
  const breaches: string[] = [];
  let first: any;
  for (const x of runs) check(x, msg => { breaches.push(`${x.label}: ${msg}`); first ??= x.input; });
  if (breaches.length) console.error(`${breaches.length} breach(es); first case:\n${breaches[0]}\n${JSON.stringify(first, null, 2)}`);
  expect(breaches.slice(0, 10)).toEqual([]);
}

const total = (r: FinOpsIqV3Result, c: typeof CASES[number]) => r.value.totals![c];
const leverCases = (r: FinOpsIqV3Result) => r.value.levers.filter(l => l.cases);

/* ------------------------------ Reconciliation ------------------------------ */

describe('FinOps IQ v3 value: reconciliation (PLAN F4)', () => {
  it('the random set exercises the model: most results show money, in both modes, with banded and capped cases', () => {
    expect(SHOWN.length).toBeGreaterThan(ALL.length * 0.5);
    for (const mode of ['executive', 'workshop']) expect(SHOWN.filter(x => x.r.mode === mode).length, mode).toBeGreaterThan(200);
    expect(SHOWN.some(x => x.r.value.bands.searched.length >= 3)).toBe(true);
    expect(SHOWN.some(x => total(x.r, 'upper').capBinding)).toBe(true);
    expect(SHOWN.some(x => total(x.r, 'expected').capBinding)).toBe(true);
  });

  it('levers sum to the headline in each case', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const sum = leverCases(x.r).reduce((t, l) => t + l.cases![c].runRate.value, 0);
      if (sum !== total(x.r, c).grossRunRate.value) fail(`${c}: levers ${sum} != headline ${total(x.r, c).grossRunRate.value}`);
      const y = (k: 'year1' | 'year2' | 'year3' | 'threeYear') => leverCases(x.r).reduce((t, l) => t + l.cases![c][k].value, 0);
      if (y('year1') !== total(x.r, c).grossYear1.value || y('threeYear') !== total(x.r, c).gross3Year.value) fail(`${c}: lever phasing does not sum to the totals`);
    }
  }));

  it('finding values sum to the headline: each quantified lever sits on exactly one finding', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    const owned = x.r.findings.flatMap(f => f.value?.leverIds ?? []);
    const quantified = leverCases(x.r).map(l => l.id);
    if (owned.length !== new Set(owned).size) fail(`a lever sits on two findings: ${owned}`);
    if ([...owned].sort().join() !== [...quantified].sort().join()) fail(`findings own ${owned}, quantified ${quantified}`);
    for (const c of CASES) {
      const sum = x.r.findings.reduce((t, f) => t + (f.value ? f.value[c].value : 0), 0);
      if (sum !== total(x.r, c).grossRunRate.value) fail(`${c}: findings ${sum} != headline ${total(x.r, c).grossRunRate.value}`);
    }
  }));

  it('year 1 + year 2 + year 3 = the 3-year figure, gross and net', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      if (t.grossYear1.value + t.grossYear2.value + t.grossYear3.value !== t.gross3Year.value) fail(`${c}: gross phasing`);
      if (t.netYear1.value + t.netYear2.value + t.netYear3.value !== t.net3Year.value) fail(`${c}: net phasing`);
      for (const l of leverCases(x.r)) {
        const k = l.cases![c];
        if (k.year1.value + k.year2.value + k.year3.value !== k.threeYear.value) fail(`${c} ${l.id}: lever phasing`);
      }
    }
  }));

  it('gross minus cost equals net', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      const leverRun = leverCases(x.r).reduce((s, l) => s + l.cases![c].runCost!.value, 0);
      if (leverRun !== t.leverRunCost.value) fail(`${c}: lever run costs ${leverRun} != ${t.leverRunCost.value}`);
      if (t.leverRunCost.value + t.toolingCost.value !== t.annualRunCost.value) fail(`${c}: run cost`);
      if (t.grossRunRate.value - t.annualRunCost.value !== t.netRunRate.value) fail(`${c}: net run-rate`);
      if (t.grossYear1.value - t.oneOffCost.value - t.annualRunCost.value !== t.netYear1.value) fail(`${c}: net year 1`);
      if (t.gross3Year.value - t.oneOffCost.value - 3 * t.annualRunCost.value !== t.net3Year.value) fail(`${c}: net 3-year`);
      for (const l of leverCases(x.r)) if (l.cases![c].runRate.value - l.cases![c].runCost!.value !== l.cases![c].netRunRate!.value) fail(`${c} ${l.id}: lever net`);
    }
  }));
});

/* ------------------------------ Inflation guard ----------------------------- */

const MARKET: any[] = (marketData as any).providerDiscountMaxima;
/** The highest published maximum for a provider and lever in the market-data register (any instrument). */
const publishedMax = (lever: string, provider: string) =>
  Math.max(...MARKET.filter(m => m.usedFor.includes(lever) && m.provider === provider && typeof m.maxDiscount === 'number').map(m => m.maxDiscount));
const SCHEDULE_MAX = 1 - (thresholds as any).thresholds.find((t: any) => t.id === 'THR-FIN-15').rule.hoursPerWeek / 168;
const EVIDENCE = ['LEV-02', 'LEV-03', 'LEV-05', 'LEV-09'];
/** Inputs each lever cannot be quantified without (DESIGN.md 10.2), checked independently of the engine. */
const REQUIRED: Record<string, (f: Facts, mode: Mode) => string[]> = {
  'LEV-01': () => ['base.computeShare', 'base.steadyStateShare', 'base.eligibleCoverage', 'base.nonProdShare'],
  'LEV-02': () => ['base.computeShare', 'evidence.providerRecommendations'],
  'LEV-03': () => ['evidence.providerRecommendations'],
  // Executive mode reads SC-04's Kubernetes row unless the measured cluster spend was given (F5 review H4, D-D).
  'LEV-04': (f, mode) => ['base.computeShare', 'base.nonProdShare', ...(f.footprint.scopes.includes('kubernetes') ? [mode === 'executive' && !given(f, 'base.kubernetesSpend') ? 'spend.byScope.kubernetes' : 'base.kubernetesSpend'] : [])],
  'LEV-05': () => ['evidence.providerRecommendations'],
  'LEV-06': () => ['base.computeShare', 'base.interruptionTolerantShare', 'base.spotShare', 'base.eligibleCoverage'],
  'LEV-07': () => ['base.kubernetesSpend', 'base.kubernetesRequestUtilisation'],
  'LEV-08': () => ['never'],
  'LEV-09': () => ['evidence.saasLicence'],
  'LEV-10': f => (f.footprint.gpuInsideKubernetes ? ['evidence.aiGpu.idleEndpointSpend'] : ['evidence.aiGpu.gpuSpend', 'evidence.aiGpu.gpuUtilisation'])
};
const given = (f: Facts, path: string) => {
  const v = path.split('.').reduce<any>((o, k) => (o && typeof o === 'object' ? o[k] : undefined), f);
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object' && ('unknown' in v)) return false;
  return true;
};
const tol = 1; // one currency unit of rounding
const sumTol = 10; // values are rounded down per lever, so a total with fewer levers can sit a few units higher

describe('FinOps IQ v3 value: inflation guard (5 reference scenarios and 1,000 random questionnaires per mode)', () => {
  it('each lever <= its base x its upper rate, in every case', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const l of leverCases(x.r)) for (const c of CASES) {
      const k = l.cases![c];
      if (k.upperBeforeFactor.value > k.base.value * k.rate.value + tol + 1e-6 * k.base.value) fail(`${l.id} ${c}: upper ${k.upperBeforeFactor.value} > base ${k.base.value} x rate ${k.rate.value}`);
      if (k.runRate.value > k.upperBeforeFactor.value * k.factor.value + tol) fail(`${l.id} ${c}: run-rate ${k.runRate.value} > upper x factor`);
      if (k.runRate.value > k.beforeGlobalCap.value + tol) fail(`${l.id} ${c}: the cap raised a lever`);
    }
  }));

  it('each lever\'s rate is at most the published or arithmetic maximum', () => guard((x, fail) => {
    for (const l of x.r.value.levers) {
      for (const m of l.maxRate) {
        const max = l.type === 'rate' ? publishedMax(l.id, m.provider) : l.id === 'LEV-04' ? SCHEDULE_MAX : 1;
        if (m.rate.value > max + 1e-4) fail(`${l.id} ${m.provider}: maximum rate ${m.rate.value} > published ${max}`);
      }
      if (!l.cases) continue;
      const max = l.type === 'rate' ? Math.max(...l.maxRate.map(m => publishedMax(l.id, m.provider))) : l.id === 'LEV-04' ? SCHEDULE_MAX : 1;
      for (const c of CASES) if (l.cases[c].rate.value > max + 1e-4) fail(`${l.id} ${c}: rate ${l.cases[c].rate.value} > maximum ${max}`);
      if (EVIDENCE.includes(l.id) && l.cases.upper.upperBeforeFactor.value > l.cases.upper.base.value + tol) fail(`${l.id}: above its evidence`);
    }
  }));

  it('total expected and upper (and conservative) <= the global cap x in-scope public cloud spend (D15, Q11)', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      const cloud = leverCases(x.r).filter(l => l.id !== 'LEV-09').reduce((s, l) => s + l.cases![c].runRate.value, 0);
      if (cloud > CAP_SHARE * t.P.value + tol) fail(`${c}: public cloud levers ${cloud} > ${CAP_SHARE} x ${t.P.value}`);
      if (t.cap.value > CAP_SHARE * t.P.value + tol) fail(`${c}: cap shown above 29% of P`);
    }
  }));

  it('conservative <= expected <= upper, gross and net', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const k of ['grossRunRate', 'grossYear1', 'gross3Year', 'netRunRate', 'netYear1', 'net3Year'] as const) {
      const [c, e, u] = CASES.map(c => total(x.r, c)[k].value);
      if (!(c <= e + sumTol && e <= u + sumTol)) fail(`${k}: ${c} / ${e} / ${u}`);
    }
  }));

  it('year-1 <= run-rate, and net <= gross', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      if (t.grossYear1.value > t.grossRunRate.value) fail(`${c}: gross year 1 > run-rate`);
      if (t.netYear1.value > t.netRunRate.value) fail(`${c}: net year 1 > net run-rate`);
      if (t.netRunRate.value > t.grossRunRate.value || t.netYear1.value > t.grossYear1.value || t.net3Year.value > t.gross3Year.value) fail(`${c}: net > gross`);
      for (const l of leverCases(x.r)) if (l.cases![c].year1.value > l.cases![c].runRate.value) fail(`${c} ${l.id}: year 1 > run-rate`);
    }
  }));

  it('no lever is quantified without its base, and no money is shown without an internal cost rate (Q4)', () => guard((x, fail) => {
    const f = x.input.facts;
    const spendKnown = f.footprint.publicCloudProviders.every(p => given(f, `spend.byScope.${p}`));
    for (const l of x.r.value.levers) {
      if (l.status !== 'quantified') { if (l.cases) fail(`${l.id}: not quantified but has figures`); continue; }
      for (const p of REQUIRED[l.id](f, x.input.mode)) if (!given(f, p)) fail(`${l.id} quantified without ${p}`);
      if (l.id !== 'LEV-09' && !spendKnown) fail(`${l.id} quantified without every provider's spend`);
      if (x.input.mode === 'executive' && !['LEV-01', 'LEV-04'].includes(l.id)) fail(`${l.id} quantified in executive mode (Q7)`);
      if (l.id === 'LEV-04' && x.input.mode === 'executive' && !['run', 'walk', 'crawl', 'not_yet'].includes(x.input.answers['OP-06'] as string)) fail('LEV-04 quantified without an OP-06 answer');
      if (l.id === 'LEV-04' && x.input.mode === 'workshop' && !given(f, 'base.nonProdScheduledShare')) fail('LEV-04 quantified without the scheduled share');
    }
    const hasRate = given(f, 'cost.internalRate');
    if (x.r.value.moneyShown !== (hasRate && x.r.value.levers.some(l => l.status === 'quantified'))) fail('money shown without a rate, or withheld with one');
    if (!x.r.value.moneyShown && (x.r.value.totals || x.r.findings.some(fd => fd.value))) fail('money figures present while withheld');
  }));

  // A blank (unknown) fact or answer never gives a higher value than any answered option. Bounded at eight banded
  // inputs: beyond that the corner search holds the narrowest bands at their midpoints (ASM-FIN-042).
  const FACTS = ['base.computeShare', 'base.steadyStateShare', 'base.eligibleCoverage', 'base.nonProdShare', 'base.nonProdScheduledShare', 'base.interruptionTolerantShare',
    'base.spotShare', 'base.kubernetesSpend', 'base.kubernetesRequestUtilisation', 'evidence.providerRecommendations', 'evidence.aiGpu.gpuSpend', 'evidence.aiGpu.gpuUtilisation',
    'evidence.aiGpu.idleEndpointSpend', 'evidence.saasLicence', 'cost.internalRate'];
  const without = (f: Facts, path: string): Facts => {
    const copy = JSON.parse(JSON.stringify(f));
    const keys = path.split('.');
    const parent = keys.slice(0, -1).reduce((o: any, k) => o?.[k], copy);
    if (parent && keys[keys.length - 1] in parent) delete parent[keys[keys.length - 1]];
    return copy;
  };
  const values = (r: FinOpsIqV3Result) => CASES.map(c => (r.value.moneyShown ? total(r, c).grossRunRate.value : 0));
  const sample = [...scenarioRuns, ...randomRuns.filter((_, i) => i % 8 === 0)].filter(x => !x.r.value.bands.fixedAtMidpoint.length);

  it('a blank fact never gives a higher value than the answered one', () => guard((x, fail) => {
    const f = x.input.facts;
    const answered = values(x.r);
    const paths = [...FACTS.filter(p => given(f, p)), ...f.footprint.publicCloudProviders.map(p => `spend.byScope.${p}`).filter(p => given(f, p))];
    for (const p of paths) {
      const b = evaluateFinOpsIqV3({ ...x.input, facts: without(f, p) });
      if (b.value.bands.fixedAtMidpoint.length) continue;
      values(b).forEach((v, i) => { if (v > answered[i] + sumTol) fail(`blank ${p}: ${CASES[i]} ${v} > ${answered[i]}`); });
    }
    if (x.input.assessmentDate) {
      const { assessmentDate: _, ...rest } = x.input;
      values(evaluateFinOpsIqV3(rest)).forEach((v, i) => { if (v > answered[i] + sumTol) fail(`no assessment date: ${CASES[i]} ${v} > ${answered[i]}`); });
    }
  }, sample), 300_000);

  it('a blank answer never gives a higher value than any answered option', () => guard((x, fail) => {
    const ids = x.r.questions.asked.filter(id => QUESTIONS.find(q => q.id === id)!.kind === 'maturity');
    for (const id of ids) {
      const { [id]: _, ...rest } = x.input.answers;
      const blank = values(evaluateFinOpsIqV3({ ...x.input, answers: rest }));
      for (const level of ['unknown', 'not_yet', 'crawl', 'walk', 'run'] as AnswerLevel[]) {
        const a = values(evaluateFinOpsIqV3({ ...x.input, answers: { ...rest, [id]: answerFor(id, level) } }));
        blank.forEach((v, i) => { if (v > a[i] + sumTol) fail(`blank ${id}: ${CASES[i]} ${v} > ${a[i]} at ${level}`); });
      }
    }
  }, sample.filter((_, i) => i % 3 === 0)), 300_000);
});

/* ------------------------------- Trace data -------------------------------- */

const isFigure = (o: any): o is Figure => o && typeof o === 'object' && typeof o.field === 'string' && typeof o.value === 'number' && typeof o.unit === 'string';
function walk(v: any, path: string, visit: (path: string, v: any, parent: any, key: string) => void, parent: any = null, key = '') {
  visit(path, v, parent, key);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, visit, v, String(i)));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, visit, v, k);
}

describe('FinOps IQ v3 value: trace data (engine level; F7 extends it to the screen and PDF)', () => {
  it('every number in the value block and on findings is a figure with a stable field path and claim or assumption IDs', () => guard((x, fail) => {
    const check = (root: any, base: string) => walk(root, base, (p, v, parent, key) => {
      if (typeof v !== 'number') return;
      if (key !== 'value' || !isFigure(parent)) { fail(`${p}: a number outside a figure`); return; }
      if (!(parent.claimIds.length + parent.assumptionIds.length)) fail(`${parent.field}: no claim or assumption ID`);
      if (!parent.claimIds.length) fail(`${parent.field}: no claim ID`);
      for (const id of parent.claimIds) if (!CLAIMS.has(id)) fail(`${parent.field}: unknown claim ${id}`);
      for (const id of parent.assumptionIds) if (!ASM_IDS.has(id)) fail(`${parent.field}: assumption ${id} not in the register`);
      if (resolveField(x.r, parent.field) !== parent) fail(`${parent.field} does not resolve to its own figure (found at ${p})`);
      if (!Number.isFinite(v)) fail(`${parent.field}: not finite`);
    });
    check(x.r.value, 'value');
    for (const f of x.r.findings) if (f.value) check(f.value, `findings[${f.id}].value`);
  }, [...scenarioRuns, ...randomRuns.filter((_, i) => i % 4 === 0)]));

  it('field paths are unique and stable across runs of the same input', () => {
    for (const x of scenarioRuns) {
      const fields: string[] = [];
      walk(x.r, 'result', (_, v) => { if (isFigure(v)) fields.push(v.field); });
      expect(new Set(fields).size, x.label).toBe(fields.length);
      const again: string[] = [];
      walk(evaluateFinOpsIqV3(x.input), 'result', (_, v) => { if (isFigure(v)) again.push(v.field); });
      expect(again).toEqual(fields);
    }
  });

  it('shows the cap with its source and year, the labels per PLAN F4, and a real value-model version', () => {
    for (const { r } of scenarioRuns) {
      expect(r.versions.valueModel).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.value.label).toBe('Indicative value range: not a savings commitment; evidence validation required');
      expect(r.value.globalCap.source).toMatchObject({ claimId: 'CLM-FIN-040', year: '2026', sample: 'n = 753', assumptionId: 'ASM-FIN-050' });
      expect(r.value.globalCap.share.value).toBe(0.29);
      for (const l of r.value.levers) expect(l.formula.length, l.id).toBeGreaterThan(5);
    }
  });
});

/* ------------------------------- Language lint ------------------------------ */

describe('FinOps IQ v3 value: language lint', () => {
  it('no banned phrase (scripts/check-claims.cjs BANNED) appears in any string in the result', () => guard((x, fail) => {
    walk(x.r, 'result', (p, v) => { if (typeof v === 'string') for (const re of BANNED) if (re.test(v)) fail(`${p}: "${v}" matches ${re}`); });
  }, [...scenarioRuns, ...randomRuns.filter((_, i) => i % 5 === 0)]));
});

/* --------------------------- Assumption register ---------------------------- */

const SOURCES: Record<string, any> = { levers, thresholds, capabilities, valueRules, engineRules, questionBank, workstreams };
function get(ref: string): any {
  const [source, path] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
  let o = SOURCES[source];
  for (const m of path.matchAll(/([^.[\]]+)|\[([^\]]+)\]/g)) {
    if (o == null) return undefined;
    o = m[2] !== undefined ? o.find((x: any) => x && ['id', 'fact', 'lever', 'provider', 'key'].some(k => x[k] === m[2])) : o[m[1]];
  }
  return o;
}
const hasNumber = (v: any): boolean => typeof v === 'number' || (v && typeof v === 'object' && Object.values(v).some(hasNumber));
const REFS: Array<{ ref: string; value: any; id: string }> = ASM.flatMap(a => a.constants.map((c: any) => ({ ...c, id: a.id })));
/** The register entry covering a constant: the same ref, or a ref the constant sits under. */
const coveredBy = (ref: string) => REFS.find(c => ref === c.ref || ref.startsWith(`${c.ref}.`) || ref.startsWith(`${c.ref}[`));
function numericLeaves(v: any, ref: string, out: string[] = []): string[] {
  if (typeof v === 'number') out.push(ref);
  else if (Array.isArray(v)) v.forEach((x, i) => numericLeaves(x, x && typeof x === 'object' && x.id ? `${ref}[${x.id}]` : `${ref}.${i}`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) numericLeaves(x, `${ref}.${k}`, out);
  return out;
}

describe('FinOps IQ v3 value: assumption register (area 13(b))', () => {
  it('every entry has a value, a basis, claim IDs, reasoning, confidence and sensitivity', () => {
    const bases = Object.keys((assumptions as any).basisValues);
    expect(ASM_IDS.size).toBe(ASM.length);
    for (const a of ASM) {
      expect(a.id, a.id).toMatch(/^ASM-FIN-\d{3}$/);
      for (const k of ['title', 'value', 'reasoning', 'confidence', 'sensitivity', 'ownerApproval']) expect(String(a[k] ?? '').length, `${a.id}.${k}`).toBeGreaterThan(1);
      expect(bases, a.id).toContain(a.basis);
      expect(a.claimIds.length, a.id).toBeGreaterThan(0);
      for (const id of a.claimIds) expect(CLAIMS.has(id), `${a.id} cites ${id}`).toBe(true);
      if (a.basis === 'published_source') expect(a.claimIds.some((id: string) => (register as any).claims.find((c: any) => c.id === id).kind !== 'heuristic'), a.id).toBe(true);
    }
  });

  it('every constant the value model reads appears in the register with the same value', () => {
    const reads = valueModelConstantReads();
    expect(reads.size).toBeGreaterThan(100);
    for (const [ref, value] of reads) {
      if (!hasNumber(value)) continue; // names, labels, formulas, claim IDs and flags are descriptive, not constants
      // An object read (for example a provider table) is covered leaf by leaf.
      for (const leaf of typeof value === 'number' ? [ref] : numericLeaves(value, ref)) {
        const c = coveredBy(leaf);
        expect(c, `${leaf} is read by the value model but is not in the assumption register`).toBeDefined();
        expect(get(leaf), leaf).toEqual(leaf === c!.ref ? c!.value : get(leaf));
      }
    }
  });

  it('every listed constant still matches its registry (no silent drift)', () => {
    for (const c of REFS) expect(get(c.ref), `${c.id} ${c.ref}`).toEqual(c.value);
  });

  it('every scoring constant (tiers, targets, severity, schedule, need verdict, thresholds, value rules) is covered', () => {
    const leaves = [
      ...numericLeaves((capabilities as any).tiers, 'capabilities:tiers'),
      ...(capabilities as any).capabilities.map((c: any) => `capabilities:capabilities[${c.id}].defaultTargets`),
      ...['severity', 'schedule', 'needVerdict'].flatMap(k => numericLeaves((engineRules as any)[k], `engineRules:${k}`)),
      ...numericLeaves((engineRules as any).decisions, 'engineRules:decisions'),
      ...(thresholds as any).thresholds.flatMap((t: any) => numericLeaves(t.rule, `thresholds:thresholds[${t.id}].rule`)),
      ...['derivations', 'bandSearch', 'scoring', 'finopsTeam', 'leverFindings', 'scopeConfirmation', 'decision02', 'hypothesis'].flatMap(k => numericLeaves((valueRules as any)[k], `valueRules:${k}`)),
      ...numericLeaves((levers as any).rangeRule, 'levers:rangeRule'), ...numericLeaves((levers as any).globalCap, 'levers:globalCap'),
      ...(levers as any).levers.flatMap((l: any) => ['ramp', 'effortFteMonths', 'maxRate', 'evidenceFreshnessDays'].flatMap(k => numericLeaves(l[k], `levers:levers[${l.id}].${k}`)))
    ].filter(ref => !/\.(year|sample)$/.test(ref) || !ref.includes('source'));
    const unlisted = leaves.filter(ref => !coveredBy(ref) && get(ref) !== undefined)
      // LEV-08 has no rate or effort (not quantified in v1); ongoing shares and unquantified providers carry no value.
      .filter(ref => !ref.startsWith('levers:levers[LEV-08]'));
    expect(unlisted).toEqual([]);
  });

  it('every assumption ID the result cites is in the register', () => {
    for (const { r } of [...scenarioRuns, ...randomRuns.slice(0, 200)]) {
      for (const l of r.value.levers) for (const id of l.assumptionIds) expect(ASM_IDS.has(id), `${l.id} cites ${id}`).toBe(true);
    }
  });

  it('the value model holds no unregistered numeric constant (only 0, 1, 2, 3, 7, 10, 12, 24, 60, 100, 1000 and rounding)', () => {
    const src = readFileSync(join(__dirname, '../src/accelerators/finops-iq/v3/value-model.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^'\n]*'|`[^`\n]*`|"[^"\n]*"/g, "''");
    const numbers = [...src.matchAll(/(?<![\w.$])(\d+(?:\.\d+)?(?:e-?\d+)?)(?![\w])/g)].map(m => m[1]);
    const allowed = new Set(['0', '1', '2', '3', '7', '10', '12', '24', '60', '100', '1000', '10000', '1e6', '1e-6', '1e-9']);
    expect([...new Set(numbers.filter(n => !allowed.has(n)))]).toEqual([]);
  });
});

/* -------------------------- Model rules (DESIGN 10) -------------------------- */

describe('FinOps IQ v3 value: model rules (DESIGN.md 10)', () => {
  const exec = (facts: Partial<Facts> & { base?: any }, answers: Record<string, any> = { 'OP-06': 'crawl' }) => evaluateFinOpsIqV3({
    mode: 'executive', assessmentDate: ASSESSED, answers,
    facts: { org: { currency: 'USD', consumingUnits: '2-4' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 10_000_000 } } }, cost: { internalRate: { exact: 10_000 } }, ...facts } as Facts
  });
  // DESIGN.md 10.3 uses AWS's 72% maximum, so the worked example states that instrument (F4 review M6).
  const worked = { base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.6 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.25 }, commitmentInstrument: { aws: 'ec2_instance_sp_or_ri' } } } as any;

  it('reproduces the DESIGN.md 10.3 worked example (AWS 10M, compute 60%, steady 60%, coverage 30%, non-production 25%, OP-06 Crawl)', () => {
    const r = exec(worked);
    const l = (id: string) => r.value.levers.find(x => x.id === id)!.cases!;
    expect(l('LEV-04').upper.base.value).toBe(1_500_000);
    expect(l('LEV-04').upper.runRate.value).toBe(1_053_571);
    expect(l('LEV-01').upper.base.value).toBe(300_000);
    expect(l('LEV-01').upper.runRate.value).toBe(216_000);
    expect(CASES.map(c => total(r, c).grossRunRate.value)).toEqual([317_392, 634_785, 1_269_571]);
    expect(total(r, 'expected').pctOfP.value).toBe(6.3);
    expect(r.value.confidence.overall).toBe('Low'); // scheduled share derived from OP-06
  });

  it('executive mode quantifies LEV-01 and LEV-04 only; the rest are listed as identified (Q7)', () => {
    const r = exec(worked);
    expect(r.value.levers.filter(l => l.status === 'quantified').map(l => l.id)).toEqual(['LEV-01', 'LEV-04']);
    expect(r.value.notQuantified.map(n => [n.lever, n.reason])).toEqual([['LEV-02', 'executive_mode'], ['LEV-03', 'executive_mode'], ['LEV-05', 'executive_mode'], ['LEV-06', 'executive_mode'], ['LEV-08', 'not_quantified_in_v1']]);
  });

  it('shows no money figure without an internal cost rate, but still lists the levers (Q4)', () => {
    const r = exec({ ...worked, cost: {} });
    expect(r.value).toMatchObject({ moneyShown: false, totals: null, status: 'quantified' });
    expect(r.value.notice).toMatch(/internal cost rate/);
    expect(r.value.levers.every(l => l.cases === null)).toBe(true);
    expect(r.findings.every(f => f.value === null)).toBe(true);
  });

  it('no input, no number: an unknown share leaves its levers unquantified and raises a scope confirmation', () => {
    const r = exec({ base: { ...worked.base, computeShare: { unknown: true } } });
    expect(r.value.status).toBe('not_quantified');
    const f = r.findings.find(x => x.id === 'F-FIN-SCOPE-COMPUTE_SHARE')!;
    expect(f).toMatchObject({ type: 'scope_confirmation', severity: 'Medium', leverIds: ['LEV-01', 'LEV-04'], offeringIds: ['OFF.FIN.ASSESS'], wave: 1, targetDuration: { months: 3 } });
    expect(exec({ ...worked }, {}).findings.find(x => x.id === 'F-FIN-SCOPE-NON_PROD_SCHEDULED_SHARE')!.decisionOrAction).toMatch(/OP-06/);
  });

  it('OP-06 Unknown: LEV-04 not quantified and all non-production removed from LEV-01 (ASM-FIN-052)', () => {
    const r = exec(worked, { 'OP-06': 'unknown' });
    expect(r.value.levers.find(l => l.id === 'LEV-04')!.status).toBe('not_quantified');
    expect(r.value.levers.find(l => l.id === 'LEV-01')!.cases!.upper.base.value).toBe(300_000);
    const run = exec(worked, { 'OP-06': 'run' });
    expect(run.value.levers.find(l => l.id === 'LEV-04')!.cases!.upper.runRate.value).toBe(0);
    expect(run.value.levers.find(l => l.id === 'LEV-01')!.cases!.upper.base.value).toBe(1_800_000);
  });

  it('scales every public cloud lever pro rata when the 29% cap binds, and says so', () => {
    const r = exec({ spend: { byScope: { aws: { band: [1_000_000, 5_000_000] } } }, base: { computeShare: { band: [0.75, 1] }, steadyStateShare: { band: [0.5, 0.74] }, nonProdShare: { band: [0, 0.25] }, eligibleCoverage: { band: [0, 0.25] } } }, { 'OP-06': 'not_yet' });
    const u = total(r, 'upper');
    expect(u.capBinding).toBe(true);
    expect(u.grossRunRate.value).toBeLessThanOrEqual(0.29 * u.P.value);
    expect(u.cloudBeforeCap.value).toBeGreaterThan(u.cap.value);
    for (const l of leverCases(r)) expect(l.cases!.upper.globalCapScale.value).toBe(u.capScale.value);
  });

  it('uses provider-tool estimates only when no older than 90 days at the assessment date (ASM-FIN-048)', () => {
    const wf = (exportDate: string, assessmentDate?: string) => evaluateFinOpsIqV3({
      mode: 'workshop', answers: {}, ...(assessmentDate ? { assessmentDate } : {}),
      facts: { org: { currency: 'USD' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 10_000_000 } } }, base: { computeShare: { exact: 0.6 } },
        evidence: { providerRecommendations: [{ type: 'idle', provider: 'aws', tool: 'AWS Cost Optimization Hub', deduplicated: true, annualEstimate: 200_000, exportDate }] }, cost: { internalRate: { exact: 10_000 } } }
    }).value.levers.find(l => l.id === 'LEV-03')!;
    expect(wf('2026-08-01', ASSESSED)).toMatchObject({ status: 'quantified', confidence: 'High' });
    expect(wf('2026-07-01', ASSESSED)).toMatchObject({ status: 'not_quantified', reason: 'evidence_older_than_90_days' });
    expect(wf('2026-08-01')).toMatchObject({ status: 'not_quantified', reason: 'evidence_needs_assessment_date' });
  });

  it('shows the FinOps team cost beside the value, never netted against it (Q12)', () => {
    const r = exec(worked, { 'OP-06': 'crawl', 'MP-01': 'not_yet' });
    expect(r.value.finopsTeam).toMatchObject({ shown: true, nettedAgainstValue: false, fte: { value: 0.5 }, annualCost: { value: 60_000 } });
    const n = exec(worked, { 'OP-06': 'crawl' });
    expect(total(r, 'expected').netRunRate.value).toBe(total(n, 'expected').netRunRate.value);
    expect(exec(worked, { 'OP-06': 'crawl', 'MP-01': 'run' }).value.finopsTeam.shown).toBe(false);
  });

  it('shows HY-01 beside the range with the gap explained, and it changes no number (D4)', () => {
    const base = exec(worked);
    const hi = exec(worked, { 'OP-06': 'crawl', 'HY-01': 'ge_30' });
    expect(hi.value.hypothesis).toMatchObject({ answered: true, band: 'ge_30', position: 'above_upper', amountLow: { value: 3_000_000 }, amountHigh: null, neverAnInput: true });
    expect(hi.value.hypothesis.explanations.map(e => e.id)).toEqual(['levers_not_quantified', 'expected_is_half_of_maximum', 'unallocated_not_waste']);
    expect(exec(worked, { 'OP-06': 'crawl', 'HY-01': 'lt_5' }).value.hypothesis.explanations.map(e => e.id)).toEqual(['estimate_at_or_below_model']);
    expect({ ...hi.value, hypothesis: null }).toEqual({ ...base.value, hypothesis: null });
  });

  it('raises the severity of a capability gap to High when a linked lever is 2% of P or more (DESIGN.md 5.3 step 3)', () => {
    const r = exec(worked, { 'OP-06': 'crawl', 'OP-04': 'not_yet', 'OP-05': 'crawl' });
    expect(r.findings.find(f => f.id === 'F-FIN-USAGE_OPTIMIZATION')).toMatchObject({ severity: 'High', severityTrace: ['gap_1', 'value_uplift'] });
    const small = exec({ base: { ...worked.base, nonProdShare: { exact: 0.02 } } }, { 'OP-06': 'crawl', 'OP-04': 'not_yet', 'OP-05': 'crawl' });
    expect(small.findings.find(f => f.id === 'F-FIN-USAGE_OPTIMIZATION')).toMatchObject({ severity: 'Medium', severityTrace: ['gap_1'] });
  });

  it('raises DECISION-02 when the usage and Spot moves remove all steady usage above coverage (RS3)', () => {
    const rs3 = scenarioRuns.find(x => x.label === 'RS3')!.r;
    expect(rs3.findings.find(f => f.id === 'F-FIN-DECISION-02')).toMatchObject({ type: 'decision', severity: 'High', wave: 2, capability: 'RATE_OPTIMIZATION' });
    for (const id of ['RS1', 'RS2', 'RS4', 'RS5']) expect(scenarioRuns.find(x => x.label === id)!.r.findings.some(f => f.id === 'F-FIN-DECISION-02'), id).toBe(false);
  });

  it('adds the need modifier when the expected gross value is 5% of P or more (DESIGN.md 9)', () => {
    expect(exec(worked).needVerdict!.modifiers.map(m => m.id)).toContain('expected_value_ge_5pct_of_P');
    expect(exec({ base: { ...worked.base, nonProdShare: { exact: 0.02 }, eligibleCoverage: { exact: 0.6 } } }).needVerdict!.modifiers.map(m => m.id)).not.toContain('expected_value_ge_5pct_of_P');
  });
});

/* -------------------- Reference scenarios: value figures -------------------- */

/**
 * Value differences from the F1 expectations, each justified in F4-scenario-diffs.md. Run-rate figures, one-off and
 * run costs must be within 1% (the scenarios' stated tolerance) apart from these. Year-1 and 3-year figures are not
 * compared: since the F4 review (M3, V9) the ramp starts at the owning finding's roadmap start month, which F1 did not
 * apply, so year-1 figures are lower by design.
 * V5: Azure Spot sourced in F2 (RS2, RS4). V10: Spot counts only usage not covered by commitments (H2: RS2, RS3, RS4).
 * V11: LEV-01 at the lower published maximum when the instrument is not stated (M6: RS4). V12: a lever whose marginal
 * net is not positive leaves the headline (M1: RS4 LEV-06, with its effort).
 */
const VALUE_DIFFS: Record<string, { levers: string[]; totals: boolean; cases?: string[] }> = {
  RS2: { levers: ['LEV-06'], totals: true },
  // RS3's upper case is capped: a smaller LEV-06 changes the pro-rata cap scale of every lever (the capped total is unchanged).
  RS3: { levers: ['LEV-06'], totals: true, cases: ['upper'] },
  RS4: { levers: ['LEV-01', 'LEV-06'], totals: true },
  // F5 (F5-scenario-diffs.md): RS7 was written before D-D, when executive mode could not value LEV-04 with Kubernetes in
  // scope; it now reads SC-04's Kubernetes row, so LEV-04 is quantified and the totals move. RS8: LEV-02 is not worth
  // pursuing at this scale, so it has no case figures, only the expected figure behind its exclusion (X1).
  RS7: { levers: ['LEV-01', 'LEV-04'], totals: true },
  RS8: { levers: ['LEV-02'], totals: false }
};
const within = (a: number, b: number, rel = 0.01) => Math.abs(a - b) <= Math.max(2, Math.abs(b) * rel);

describe('FinOps IQ v3 value: reference scenarios against the ranges written in F1', () => {
  for (const s of SCENARIOS) {
    const r = scenarioRuns.find(x => x.label === s.id)!.r;
    const e = s.expected.value;
    const diff = VALUE_DIFFS[s.id];
    it(`${s.id}: lever and total run-rate figures match within 1%, apart from the recorded differences`, () => {
      expect(r.value.moneyShown).toBe(true);
      for (const c of CASES) {
        const t = total(r, c);
        for (const [id, want] of Object.entries<number>(e[c].levers)) {
          const l = r.value.levers.find(x => x.id === id)!;
          const got = l.cases ? l.cases[c].runRate.value : 0;
          if (diff?.levers.includes(id) || diff?.cases?.includes(c)) continue;
          expect(within(got, want), `${s.id} ${c} ${id}: ${got} vs ${want}`).toBe(true);
        }
        for (const id of leverCases(r).map(l => l.id)) if (!(id in e[c].levers)) expect(diff?.levers, `${s.id} ${c}: ${id} not in the scenario`).toContain(id);
        if (diff?.totals) continue;
        for (const k of ['grossRunRate', 'oneOffCost', 'annualRunCost', 'netRunRate'] as const) {
          expect(within(t[k].value, e[c][k]), `${s.id} ${c} ${k}: ${t[k].value} vs ${e[c][k]}`).toBe(true);
        }
        expect(t.P.value).toBe(e[c].P ?? e.expected.P);
      }
      expect(total(r, 'upper').capBinding).toBe(e.globalCap.upperBinding);
      expect(total(r, 'expected').capBinding).toBe(e.globalCap.binding);
      expect(r.value.costs.toolingProvided).toBe(e.toolingProvided);
      expect(r.value.costs.externalSupportIncluded).toBe(e.externalSupportIncluded);
      expect(e.confidence).toContain(r.value.confidence.overall!);
    });
  }

  it('RS2: the recorded difference comes only from Spot (Azure sourced in F2, base net of coverage)', () => {
    // RS2 is Azure-only: with no Spot-movable usage the engine reproduces every F1 run-rate total within 1%.
    const s = SCENARIOS.find(x => x.id === 'RS2')!;
    const input = JSON.parse(JSON.stringify(scenarioInput(s)));
    input.facts.base.interruptionTolerantShare = { exact: 0 };
    const r = evaluateFinOpsIqV3(input);
    for (const c of CASES) for (const k of ['grossRunRate', 'oneOffCost', 'annualRunCost'] as const) {
      expect(within(total(r, c)[k].value, s.expected.value[c][k]), `RS2 ${c} ${k}: ${total(r, c)[k].value} vs ${s.expected.value[c][k]}`).toBe(true);
    }
    // With Spot net of coverage, the review's figure (H2): about EUR 7.50M expected, 6.8% of P.
    const rs2 = scenarioRuns.find(x => x.label === 'RS2')!.r;
    expect(within(total(rs2, 'expected').grossRunRate.value, 7_500_000, 0.005)).toBe(true);
    expect(total(rs2, 'expected').pctOfP.value).toBe(6.8);
  });
});

/* ----------------------------- F4 review fixes ------------------------------ */

const lever = (r: FinOpsIqV3Result, id: string) => r.value.levers.find(l => l.id === id)!;

describe('FinOps IQ v3 value: OCI, IBM and Alibaba maxima (owner decision, 27 Oct 2026)', () => {
  const s = SCENARIOS.find((x: any) => x.mode === 'workshop')!;
  const input = scenarioInput(s);
  const facts = JSON.parse(JSON.stringify(input.facts));
  facts.footprint.publicCloudProviders = ['ibm', 'alibaba', 'oci'];
  facts.spend.byScope = { ...facts.spend.byScope, ibm: { exact: 10_000_000 }, alibaba: { exact: 8_000_000 }, oci: { exact: 6_000_000 } };
  for (const p of ['aws', 'azure', 'gcp']) delete facts.spend.byScope[p];
  facts.base = { ...facts.base, computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.7 }, eligibleCoverage: { exact: 0.2 },
    nonProdShare: { exact: 0.2 }, nonProdScheduledShare: { exact: 0 }, interruptionTolerantShare: { exact: 0.3 }, spotShare: { exact: 0 } };
  const x = { ...input, facts };
  const r = evaluateFinOpsIqV3(x);
  const rates = (id: string) => Object.fromEntries(r.value.levers.find(l => l.id === id)!.maxRate.map(m => [m.provider, [m.rate.value, !!m.indicative]]));

  it('quantifies LEV-01 for IBM (60%) and Alibaba (76%), and LEV-06 for OCI (50%), each marked indicative', () => {
    expect(rates('LEV-01')).toEqual({ ibm: [0.6, true], alibaba: [0.76, true] });
    expect(rates('LEV-06')).toEqual({ oci: [0.5, true] });
  });

  it('leaves OCI commitments unquantified (no standard published rate)', () => {
    expect(Object.keys(rates('LEV-01'))).not.toContain('oci');
  });

  it('the report labels the rows indicative and states the caveat, in both views', () => {
    for (const view of ['client', 'consultant'] as const) {
      const text = JSON.stringify(finopsIqReport(r, { client: 'C', preparedBy: 'P', dataProvidedBy: 'C', view, input: x }));
      expect(text).toContain('(indicative)');
      expect(text).toContain("Indicative: the provider's published 'up to' rate");
    }
  });
});

describe('FinOps IQ v3 value: F4 review fixes', () => {
  it('H1: the cap metadata matches the code: all three cases, no evidence lift', () => guard((x, fail) => {
    const g = x.r.value.globalCap;
    if (g.appliesTo.join() !== CASES.join()) fail(`appliesTo ${g.appliesTo}`);
    if (!/^none/.test(g.liftedBy)) fail(`liftedBy ${g.liftedBy}`);
    for (const c of CASES) if (!g.statement.includes(c)) fail(`statement omits ${c}`);
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      const binds = t.cloudBeforeCap.value > t.cap.value + 1;
      if (binds && (!t.capBinding || t.capScale.value >= 1)) fail(`${c}: cap ${t.cap.value}, before ${t.cloudBeforeCap.value}, binding ${t.capBinding}`);
      if (t.capBinding && t.cloudBeforeCap.value < t.cap.value) fail(`${c}: binding below the cap`);
    }
  }));

  it('H1: the register and the claim say the same as the code', () => {
    expect((levers as any).globalCap).toMatchObject({ appliesTo: [...CASES], liftedBy: 'none (v1.0)' });
    expect(ASM.find(a => a.id === 'ASM-FIN-050').constants.find((c: any) => c.ref === 'levers:globalCap.appliesTo').value).toEqual([...CASES]);
    const c138 = (register as any).claims.find((c: any) => c.id === 'CLM-FIN-138');
    expect(c138.statement).toMatch(/conservative, expected and upper/);
    expect(c138.statement).toMatch(/not lifted by evidence/);
  });

  it('H2: Spot counts only tolerant usage not covered by commitments, and the same share leaves LEV-01', () => {
    const wf = (C: number) => evaluateFinOpsIqV3({
      mode: 'workshop', answers: {}, assessmentDate: ASSESSED,
      facts: { org: { currency: 'USD' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 10_000_000 } } },
        base: { computeShare: { exact: 0.5 }, steadyStateShare: { exact: 0.9 }, eligibleCoverage: { exact: C }, nonProdShare: { exact: 0 }, nonProdScheduledShare: { exact: 0 }, interruptionTolerantShare: { exact: 0.4 }, spotShare: { exact: 0 } },
        cost: { internalRate: { exact: 1000 } } } as Facts
    });
    expect(lever(wf(0), 'LEV-06').cases!.upper.base.value).toBe(2_000_000);
    expect(lever(wf(0.5), 'LEV-06').cases!.upper.base.value).toBe(1_000_000);
    // 5M x (0.9 - 0.5 - 0 - 0.4 x 0.5) = 1.0M.
    expect(lever(wf(0.5), 'LEV-01').cases!.upper.base.value).toBe(1_000_000);
  });

  // F5 review H2 (D-B): an uplift or need modifier rests either on a shown figure, or on named blank inputs that leave a
  // material lever (LEV-01, LEV-04) open; never on a hidden money figure.
  const openLevers = (r: FinOpsIqV3Result) => {
    const blocked = r.value.levers.filter(l => ['LEV-01', 'LEV-04'].includes(l.id) && l.status === 'not_quantified' && ['missing_input', 'public_cloud_spend_unknown'].includes(l.reason!));
    const blockedInputs = blocked.flatMap(l => l.blockedBy);
    return r.value.levers.filter(l => ['LEV-01', 'LEV-04'].includes(l.id) && (blocked.includes(l) || (l.status === 'quantified' &&
      (!r.value.moneyShown || (l.id === 'LEV-01' && blockedInputs.includes('base.nonProdScheduledShare')))))).map(l => l.id);
  };
  it('H3: every value uplift and value need modifier rests on a figure the report shows, at the client\'s own answers', () => guard((x, fail) => {
    const threshold = (field: string) => resolveField(x.r, field)?.value;
    const open = openLevers(x.r);
    for (const f of x.r.findings) {
      const up = f.severityTrace.includes('value_uplift');
      const unconfirmed = f.severityTrace.includes('value_unconfirmed');
      if ((up || unconfirmed) !== !!f.valueBasis) fail(`${f.id}: uplift ${up || unconfirmed} but valueBasis ${JSON.stringify(f.valueBasis)}`);
      if (unconfirmed) {
        if (!f.valueBasis!.unconfirmedInputs?.length || f.valueBasis!.fields.length) fail(`${f.id}: value_unconfirmed without named inputs, or with a figure`);
        if (!f.leverIds.some(id => open.includes(id))) fail(`${f.id}: value_unconfirmed without an open material lever`);
        continue;
      }
      if (!f.valueBasis) continue;
      if (!x.r.value.moneyShown) fail(`${f.id}: uplift without any value shown`);
      for (const field of f.valueBasis.fields) {
        const fg = resolveField(x.r, field);
        if (!fg || typeof fg.value !== 'number') fail(`${f.id}: ${field} is not a shown figure`);
        else if (fg.value < threshold(f.valueBasis.thresholdField)) fail(`${f.id}: ${field} ${fg.value} below the threshold`);
      }
    }
    // A finding that owns a lever at or above the threshold is at least High (unless it is a zero or excluded lever finding).
    for (const f of x.r.findings.filter(y => y.type === 'capability_gap' || y.type === 'lever_opportunity')) {
      const hit = f.leverIds.some(id => lever(x.r, id)?.scoring?.upliftReached);
      if (hit && !['High', 'Critical'].includes(f.severity)) fail(`${f.id}: a shown lever reaches the uplift but severity is ${f.severity}`);
    }
    const v = x.r.needVerdict;
    if (v) {
      const m = v.modifiers.find(y => y.id === 'expected_value_ge_5pct_of_P');
      const has = !!m && !m.assumed;
      if (has !== !!v.valueBasis) fail('need modifier without its valueBasis');
      const shown = x.r.value.moneyShown && total(x.r, 'expected').pctOfP.value >= 5;
      if (has !== shown) fail(`need modifier ${has}, shown value at 5% of P ${shown}`);
      if (!!m?.assumed !== (!shown && open.length > 0)) fail(`assumed need modifier ${!!m?.assumed}, open material levers ${open.join(', ')}`);
    }
  }));

  it('H4: the headline % of P and the cap are public cloud only; SaaS and licensing are shown on their own base', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const c of CASES) {
      const t = total(x.r, c);
      if (t.pctOfP.value > CAP_SHARE * 100 + 0.05) fail(`${c}: ${t.pctOfP.value}% of P above the cap`);
      const saas = lever(x.r, 'LEV-09')?.cases?.[c].runRate.value ?? 0;
      if (t.cloudRunRate.value + saas !== t.grossRunRate.value) fail(`${c}: cloud + SaaS != gross`);
      if (saas && t.saasLicensing?.runRate.value !== saas) fail(`${c}: SaaS line ${t.saasLicensing?.runRate.value} != ${saas}`);
    }
  }));

  it('M1: effort only for levers with a positive expected value; a lever not worth pursuing is shown but left out of the headline', () => {
    expect(SHOWN.some(x => x.r.value.levers.some(l => l.exclusion))).toBe(true);
    guard((x, fail) => {
      if (!x.r.value.moneyShown) return;
      for (const l of x.r.value.levers.filter(y => y.status === 'quantified')) {
        if (l.exclusion) {
          if (l.inHeadline || l.cases) fail(`${l.id}: excluded but in the headline`);
          if (l.exclusion.marginalNet3Year.value > 0) fail(`${l.id}: excluded with a positive marginal net`);
        } else if (l.cases && l.cases.expected.runRate.value === 0 && l.effortFteMonths!.value !== 0) fail(`${l.id}: effort on a lever with no expected value`);
      }
    });
  });

  it('M1: a blank fact never raises the expected net 3-year value', () => guard((x, fail) => {
    const f = x.input.facts;
    const net = (r: FinOpsIqV3Result) => (r.value.moneyShown ? total(r, 'expected').net3Year.value : -Infinity);
    const answered = net(x.r);
    const paths = ['base.computeShare', 'base.steadyStateShare', 'base.eligibleCoverage', 'base.nonProdShare', 'base.nonProdScheduledShare', 'base.interruptionTolerantShare', 'base.spotShare', 'base.kubernetesSpend', 'base.kubernetesRequestUtilisation', 'evidence.providerRecommendations', 'evidence.aiGpu.gpuSpend', 'evidence.aiGpu.gpuUtilisation', 'evidence.saasLicence'];
    for (const p of paths.filter(q => given(f, q))) {
      const copy = JSON.parse(JSON.stringify(f));
      const keys = p.split('.');
      delete keys.slice(0, -1).reduce((o: any, k) => o[k], copy)[keys[keys.length - 1]];
      const b = net(evaluateFinOpsIqV3({ ...x.input, facts: copy }));
      if (b > answered + sumTol) fail(`blank ${p}: net 3-year ${b} > ${answered}`);
    }
  }, [...scenarioRuns, ...randomRuns.filter((_, i) => i % 10 === 0)].filter(x => x.r.value.moneyShown)), 300_000);

  it('M2: a gap finding that owns levers carries their action, evidence and zero-value advice (RS2: stop buying commitments)', () => {
    const rs2 = scenarioRuns.find(x => x.label === 'RS2')!.r;
    const rate = rs2.findings.find(f => f.id === 'F-FIN-RATE_OPTIMIZATION')!;
    const l01 = rate.leverActions.find(a => a.leverId === 'LEV-01')!;
    expect(l01).toMatchObject({ zeroValue: true });
    expect(l01.title).toMatch(/stop buying commitments/);
    expect(l01.action).toMatch(/Do not buy further commitments/);
    guard((x, fail) => {
      for (const f of x.r.findings.filter(y => y.type === 'capability_gap')) {
        const owned = f.leverIds.filter(id => lever(x.r, id)?.status === 'quantified');
        if (owned.join() !== f.leverActions.map(a => a.leverId).join()) fail(`${f.id}: leverActions ${f.leverActions.map(a => a.leverId)} != ${owned}`);
      }
    });
  });

  it('M3: the ramp starts at the start month of the finding that owns the lever', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    for (const l of leverCases(x.r)) {
      const owner = x.r.findings.find(f => f.value?.leverIds.includes(l.id));
      if (!owner) { fail(`${l.id}: no owning finding`); continue; }
      if (l.startMonth!.value !== owner.start.month) fail(`${l.id}: ramp from month ${l.startMonth!.value}, finding ${owner.id} starts ${owner.start.month}`);
      const left = Math.max(0, Math.min(1, (12 - owner.start.month) / 12));
      const ramp = (levers as any).levers.find((y: any) => y.id === l.id).ramp.year1Share;
      if (typeof ramp === 'number' && !l.cases!.expected.year1Share.assumptionIds.includes('ASM-FIN-042') && Math.abs(l.cases!.expected.year1Share.value - ramp * left) > 1e-4) fail(`${l.id}: year-1 share ${l.cases!.expected.year1Share.value} != ${ramp} x ${left}`);
      if (owner.start.month >= 12 && l.cases!.expected.year1.value !== 0) fail(`${l.id}: year 1 before its start`);
    }
  }));

  it('M4: LEV-09 is compared with its own base, not public cloud spend', () => {
    const rs4 = scenarioRuns.find(x => x.label === 'RS4')!.r;
    const l9 = lever(rs4, 'LEV-09');
    expect(l9.scoring).toMatchObject({ comparisonBaseLabel: 'SaaS and licensing spend in scope', comparisonBase: { value: 20_000_000 } });
    expect(total(rs4, 'expected').saasLicensing).toMatchObject({ runRate: { value: 700_000 }, base: { value: 20_000_000 }, pctOfBase: { value: 3.5 } });
  });

  it('M5: in-scope spend is shown once, as a band when banded, and each case\'s P is within it', () => guard((x, fail) => {
    if (!x.r.value.moneyShown) return;
    const sp = x.r.value.spend;
    if (!sp) return; // only SaaS and licensing quantified: no public cloud spend to show
    for (const c of CASES) {
      const P = total(x.r, c).P.value;
      if (sp.banded ? P < sp.low!.value - 1 || P > sp.high!.value + 1 : Math.abs(P - sp.P.value) > 1) fail(`${c}: P ${P} outside the spend shown`);
    }
    if (Math.abs(total(x.r, 'expected').P.value - sp.P.value) > 1) fail('expected case P is not the midpoint');
  }));

  it('M6: LEV-01 uses the stated commitment instrument, and the lower published maximum when it is not stated', () => {
    const r = (ci?: any) => evaluateFinOpsIqV3({
      mode: 'executive', answers: { 'OP-06': 'crawl' }, assessmentDate: ASSESSED,
      facts: { org: { currency: 'USD' }, footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 5_000_000 }, azure: { exact: 5_000_000 } } },
        base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.6 }, eligibleCoverage: { exact: 0.1 }, nonProdShare: { exact: 0.1 }, ...(ci ? { commitmentInstrument: ci } : {}) }, cost: { internalRate: { exact: 1000 } } } as Facts
    });
    const rates = (x: FinOpsIqV3Result) => Object.fromEntries(lever(x, 'LEV-01').maxRate.map(m => [m.provider, [m.rate.value, m.instrumentStated]]));
    expect(rates(r())).toEqual({ aws: [0.66, false], azure: [0.65, false] });
    expect(rates(r({ aws: 'ec2_instance_sp_or_ri', azure: 'reservations' }))).toEqual({ aws: [0.72, true], azure: [0.72, true] });
    expect(lever(r(), 'LEV-01').cases!.upper.runRate.value).toBeLessThan(lever(r({ aws: 'ec2_instance_sp_or_ri' }), 'LEV-01').cases!.upper.runRate.value);
  });

  it('M7: the provider maxima entry says they were read through search results', () => {
    expect(ASM.find(a => a.id === 'ASM-FIN-060').reasoning).toMatch(/search results/);
  });
});
