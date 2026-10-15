/**
 * FinOps IQ v3 scoring audit in CI (plan phase F5; notes in docs/cio-readiness/finops-iq/design/F5-notes.md).
 *
 * Runs over seeded random questionnaires in both modes (the audit adapters' estates and a set with random facts) and
 * over the reference scenarios (F1 RS1-RS5 and the F5 provider case studies RS6-RS9):
 *   1. the audit adapters and their CI thresholds (the same check `npm run audit:engines` gates on);
 *   2. monotonicity: a better answer never lowers a rating, raises a gap or lowers net expected value, except the
 *      documented OP-06 case in executive mode, where a better answer shrinks LEV-04's base (asserted per lever);
 *   3. no dead questions (liveness from an all-at-core baseline, F3 re-review R4), every rating reachable;
 *   4. missing data never helps, on maturity and on value; Unknown never scores better than the lowest answered option;
 *   5. the single-answer limit;
 *   6. N/A only from scope, labels that match their thresholds (M10), scope answers never scored;
 *   7. the F5 reference scenarios against the expectations written before the engine was run.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evaluateFinOpsIqV3, QUESTIONS, LEVELS, EXECUTIVE_CAPABILITIES,
  type FinOpsIqV3Input, type FinOpsIqV3Result, type Facts, type Mode, type AnswerLevel
} from '../src/accelerators/finops-iq/v3';
import capabilityModel from '../src/accelerators/finops-iq/registry/capabilities.json' with { type: 'json' };
import thresholds from '../src/accelerators/finops-iq/registry/thresholds.json' with { type: 'json' };
import engineRules from '../src/accelerators/finops-iq/v3/engine-rules.json' with { type: 'json' };
import valueRules from '../src/accelerators/finops-iq/v3/value-rules.json' with { type: 'json' };
import levers from '../src/accelerators/finops-iq/registry/levers.json' with { type: 'json' };
import register from '../src/claims/claims-register.json' with { type: 'json' };
import { ADAPTERS, rng } from '../audit/adapters';
import { auditEngine, thresholdBreaches } from '../audit/core';

const DESIGN_DIR = join(__dirname, '../../../docs/cio-readiness/finops-iq/design');
const F1: any[] = JSON.parse(readFileSync(join(DESIGN_DIR, 'reference-scenarios.json'), 'utf8')).scenarios;
const F5: any[] = JSON.parse(readFileSync(join(DESIGN_DIR, 'reference-scenarios-f5.json'), 'utf8')).scenarios;
const CAPS: any[] = (capabilityModel as any).capabilities;
const THR = new Map<string, any>((thresholds as any).thresholds.map((t: any) => [t.id, t]));
const R: any = engineRules;
const VR: any = valueRules;
const CLAIMS = new Map<string, any>((register as any).claims.map((c: any) => [c.id, c]));
const Q = new Map<string, any>(QUESTIONS.map(q => [q.id, q]));
const MATURITY = QUESTIONS.filter(q => q.kind === 'maturity');

/* --------------------------------- Helpers --------------------------------- */

// The checks below are long synchronous loops. Yield to the event loop before each test, so the worker can answer the
// test runner's progress calls in time (otherwise vitest reports "Timeout calling onTaskUpdate").
beforeEach(() => new Promise<void>(resolve => setImmediate(resolve)));

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const answerFor = (id: string, level: AnswerLevel) => (id === 'UN-08' ? UN08[level] : level);
/** The answer scale, worst first: Unknown ranks lowest (D5). UN-04 has two Crawl options; "below 70%" ranks under "70% to 85%". */
const ORDER: AnswerLevel[] = ['unknown', 'not_yet', 'crawl', 'walk', 'run'];
const ladder = (id: string): unknown[] => (id === 'UN-04' ? ['unknown', 'not_yet', 'below_70', 'crawl', 'walk', 'run'] : ORDER.map(l => answerFor(id, l)));

function scenarioInput(s: any, date: string): FinOpsIqV3Input {
  const answers: Record<string, any> = {};
  for (const [id, code] of Object.entries<string>(s.inputs.answers)) answers[id] = answerFor(id, CODE[code]);
  return { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: date };
}

const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const subset = <T>(r: () => number, a: T[], p = 0.5) => a.filter(() => r() < p);
const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
function amount(r: () => number, lo: number, hi: number, pUnknown = 0.1, pBand = 0.3, d = 4) {
  const x = r();
  if (x < pUnknown) return { unknown: true as const };
  const v = round(lo + r() * (hi - lo), d);
  if (x < pUnknown + pBand) return { band: [v, round(Math.min(hi, v + r() * (hi - lo) * 0.4), d)] as [number, number] };
  return { exact: v };
}
/** Random estates with value inputs, so the value step varies with the facts as well as the answers. */
function randomFacts(r: () => number): Facts {
  const providers = subset(r, ['aws', 'azure', 'gcp'], 0.5);
  if (!providers.length) providers.push(pick(r, ['aws', 'azure', 'gcp']));
  const scopes = ['public_cloud', ...subset(r, ['kubernetes', 'ai_api', 'saas', 'licensing', 'data_centre'], 0.3)];
  const byScope: Record<string, any> = {};
  for (const p of providers) byScope[p] = amount(r, 1_000_000, 60_000_000, 0.05, 0.3, 0);
  const base: Record<string, any> = {};
  const share = (k: string, lo = 0, hi = 1) => { if (r() < 0.9) base[k] = amount(r, lo, hi); };
  share('computeShare', 0.3, 0.9); share('steadyStateShare'); share('eligibleCoverage'); share('nonProdShare', 0, 0.5);
  share('nonProdScheduledShare'); share('interruptionTolerantShare', 0, 0.4); share('spotShare', 0, 0.4);
  if (scopes.includes('kubernetes')) { base.kubernetesSpend = amount(r, 0, 8_000_000, 0.1, 0.2, 0); share('kubernetesRequestUtilisation', 0.1, 0.9); }
  return {
    org: { currency: 'USD', consumingUnits: pick(r, ['1', '2-4', '5-19', '20+']) },
    footprint: { publicCloudProviders: providers, scopes },
    spend: { byScope, growth12m: Math.round(r() * 60) - 10 },
    base, cost: r() < 0.9 ? { internalRate: { exact: Math.round(8000 + r() * 12000) } } : {}
  };
}
function randomInput(seed: number, mode: Mode): FinOpsIqV3Input {
  const r = rng(seed);
  const facts = randomFacts(r);
  const answers: Record<string, any> = {};
  for (const q of MATURITY) if (q.modes.includes(mode) && r() > 0.12) answers[q.id] = q.id === 'UN-08' ? (r() < 0.15 ? 'unknown' : subset(r, REPORTS)) : pick(r, q.options.map((o: any) => o.value));
  return { mode, facts, answers, assessmentDate: '2026-10-15' };
}

const MODES: Mode[] = ['executive', 'workshop'];
const ADAPTER = Object.fromEntries(MODES.map(m => [m, ADAPTERS.find(a => a.id === `finops-iq-v3-${m}`)!])) as Record<Mode, (typeof ADAPTERS)[number]>;
/** The seeded random set, both modes: the audit adapters' estates and random estates, plus every reference scenario. */
const CASES: Array<{ label: string; input: FinOpsIqV3Input }> = [
  ...MODES.flatMap(mode => { const r = rng(5_005); return Array.from({ length: 12 }, (_, i) => ({ label: `${mode} audit seed 5005#${i}`, input: ADAPTER[mode].random(r) })); }),
  ...MODES.flatMap(mode => Array.from({ length: 12 }, (_, i) => ({ label: `${mode} random seed ${6_000 + i}`, input: randomInput(6_000 + i, mode) }))),
  ...F1.map(s => ({ label: s.id, input: scenarioInput(s, '2026-10-14') })),
  ...F5.map(s => ({ label: s.id, input: scenarioInput(s, '2026-10-15') }))
];

const cap = (r: FinOpsIqV3Result, id: string) => r.capabilities.find(c => c.capability === id)!;
const ratingIndex = (rating: string) => (rating === 'unknown' || rating === 'not_assessed' ? 0 : LEVELS.indexOf(rating as any));
/** Capability-gap findings: the gap count (F5 headline). */
const gapCount = (r: FinOpsIqV3Result) => r.findings.filter(f => f.type === 'capability_gap').length;
const totalGap = (r: FinOpsIqV3Result) => r.capabilities.reduce((t, c) => t + Math.max(0, c.gap ?? 0), 0);
const net = (r: FinOpsIqV3Result, k: 'netRunRate' | 'net3Year') => (r.value.moneyShown ? r.value.totals!.expected[k].value : 0);
const leverRun = (r: FinOpsIqV3Result, id: string) => r.value.levers.find(l => l.id === id)?.cases?.expected.runRate.value ?? 0;
const quantifiedLevers = (r: FinOpsIqV3Result) => r.value.levers.filter(l => l.cases).map(l => l.id);
const asked = (r: FinOpsIqV3Result) => r.questions.asked.filter(id => Q.get(id).kind === 'maturity');
const withAnswer = (input: FinOpsIqV3Input, id: string, v: unknown) => ({ ...input, answers: { ...input.answers, [id]: v as any } });
const without = (input: FinOpsIqV3Input, id: string) => { const { [id]: _, ...rest } = input.answers; return { ...input, answers: rest }; };
/** Questions whose answer feeds the value range: OP-06 sets the executive scheduled share (ASM-FIN-052). */
const feedsValue = (mode: Mode, id: string) => mode === 'executive' && id === 'OP-06';

function guard(check: (x: typeof CASES[number], fail: (msg: string) => void) => void, cases = CASES) {
  const breaches: string[] = [];
  for (const x of cases) check(x, msg => breaches.push(`${x.label}: ${msg}`));
  if (breaches.length) console.error(`${breaches.length} breach(es):\n${breaches.slice(0, 5).join('\n')}`);
  expect(breaches.slice(0, 10)).toEqual([]);
}
/** One test per group of cases, so no single test blocks the worker for long; a breach names its case. */
const GROUPS = [
  ['executive, audit estates', (l: string) => l.startsWith('executive audit')], ['workshop, audit estates', (l: string) => l.startsWith('workshop audit')],
  ['executive, random estates', (l: string) => l.startsWith('executive random')], ['workshop, random estates', (l: string) => l.startsWith('workshop random')],
  ['reference scenarios RS1-RS9', (l: string) => /^RS\d$/.test(l)]
] as const;
function itCases(name: string, check: (x: typeof CASES[number], fail: (msg: string) => void) => void, timeout = 300_000) {
  describe(name, () => {
    for (const [g, match] of GROUPS) it(g, () => guard(check, CASES.filter(x => match(x.label))), timeout);
  });
}
const TOL = 2; // currency units of rounding (values floor, costs ceil)

/* -------------------------- 1. Audit adapter, CI ---------------------------- */

describe('FinOps IQ v3 audit: adapter headlines and CI thresholds (PLAN F5 items 1 and 2)', () => {
  it('reports capabilities at or above target, gap count, need index and net expected value, keeping the earlier headlines', () => {
    for (const mode of MODES) {
      const names = ADAPTER[mode].headlines.map(h => h.name);
      const n = mode === 'executive' ? 8 : 22;
      for (const h of [`Capabilities at or above target (0-${n})`, `Gap count (0-${n})`, 'Value expected (net run-rate)', 'Value expected (net 3-year)',
        'Total capability gap (levels)', 'Critical + high findings', 'Findings', 'Value expected (gross run-rate)', 'Value upper (gross run-rate)']) expect(names, mode).toContain(h);
      if (mode === 'executive') expect(names).toContain('Need index (0-100)');
      expect(ADAPTER[mode].thresholds, mode).toBeDefined();
    }
    const r = evaluateFinOpsIqV3(scenarioInput(F1[0], '2026-10-14'));
    const h = (name: string) => ADAPTER.executive.headlines.find(x => x.name === name)!.get(r, null);
    expect(h('Gap count (0-8)')).toBe(gapCount(r));
    expect(h('Value expected (net 3-year)')).toBe(r.value.totals!.expected.net3Year.value);
    expect(h('Need index (0-100)')).toBe(r.needVerdict!.needIndex);
  });

  for (const mode of MODES) {
    it(`${mode} mode passes every CI threshold of the audit (as npm run audit:engines does)`, () => {
      const e = auditEngine(ADAPTER[mode], { random: 120, bases: 6, missingBases: 60, seed: 4_242 });
      expect(thresholdBreaches(ADAPTER[mode], e)).toEqual([]);
      // Only the hypothesis questions are dead: they are never scored (D4).
      expect(e.dead.every(id => Q.get(id).kind === 'hypothesis'), e.dead.join(', ')).toBe(true);
    }, 300_000);
  }
});

/* ----------------------------- 2. Monotonicity ------------------------------ */

describe('FinOps IQ v3 audit: monotonicity (PLAN F5 item 2)', () => {
  itCases('a better answer never lowers a rating, never raises a gap or the gap count, never lowers the at-target count', (x, fail) => {
    const base = evaluateFinOpsIqV3(x.input);
    for (const id of asked(base)) {
      const rs = ladder(id).map(v => evaluateFinOpsIqV3(withAnswer(x.input, id, v)));
      for (let i = 1; i < rs.length; i++) {
        const [lo, hi] = [rs[i - 1], rs[i]];
        const step = `${id} ${JSON.stringify(ladder(id)[i - 1])} -> ${JSON.stringify(ladder(id)[i])}`;
        for (const c of hi.capabilities) {
          const l = cap(lo, c.capability);
          if (ratingIndex(c.rating) < ratingIndex(l.rating)) fail(`${step}: ${c.capability} rating ${l.rating} -> ${c.rating}`);
          if (c.gap !== null && l.gap !== null && c.gap > l.gap) fail(`${step}: ${c.capability} gap ${l.gap} -> ${c.gap}`);
        }
        if (gapCount(hi) > gapCount(lo)) fail(`${step}: gap count ${gapCount(lo)} -> ${gapCount(hi)}`);
        if (hi.headline.atOrAboveTarget < lo.headline.atOrAboveTarget) fail(`${step}: at target ${lo.headline.atOrAboveTarget} -> ${hi.headline.atOrAboveTarget}`);
      }
    }
  }, 600_000);

  itCases('a better answer never lowers net expected value, except where it shrinks a lever\'s base (OP-06, executive): there LEV-04 only falls and every other lever only rises', (x, fail) => {
    const base = evaluateFinOpsIqV3(x.input);
    for (const id of asked(base)) {
      const ladderIds = ladder(id);
      const rs = ladderIds.map(v => evaluateFinOpsIqV3(withAnswer(x.input, id, v)));
      for (let i = 1; i < rs.length; i++) {
        const [lo, hi] = [rs[i - 1], rs[i]];
        const step = `${id} ${JSON.stringify(ladderIds[i - 1])} -> ${JSON.stringify(ladderIds[i])}`;
        if (!feedsValue(x.input.mode, id)) {
          // Maturity answers feed no value base; they move value only through the roadmap start (ramp) and the
          // "not worth pursuing" test (M1), and an earlier start never lowers it.
          for (const k of ['netRunRate', 'net3Year'] as const) if (net(hi, k) < net(lo, k) - TOL) fail(`${step}: ${k} ${net(lo, k)} -> ${net(hi, k)}`);
          // With the same headline levers, no lever's run-rate moves at all.
          const headline = (r: FinOpsIqV3Result) => r.value.levers.filter(l => l.cases).map(l => l.id).join();
          if (headline(hi) === headline(lo)) for (const l of quantifiedLevers(hi)) if (Math.abs(leverRun(hi, l) - leverRun(lo, l)) > TOL) fail(`${step}: ${l} run-rate moved without a base change`);
          continue;
        }
        // OP-06 (ASM-FIN-052): Unknown -> an answered option quantifies LEV-04 and can only add value.
        if (ladderIds[i - 1] === 'unknown') {
          for (const k of ['netRunRate', 'net3Year'] as const) if (net(hi, k) < net(lo, k) - TOL) fail(`${step}: ${k} ${net(lo, k)} -> ${net(hi, k)}`);
          continue;
        }
        // Between answered options: more scheduling shrinks LEV-04's base (never raises it) and returns that usage to
        // LEV-01's steady pool (never lowers it). The total may fall: that is the documented case (F5-notes.md).
        if (leverRun(hi, 'LEV-04') > leverRun(lo, 'LEV-04') + TOL) fail(`${step}: LEV-04 ${leverRun(lo, 'LEV-04')} -> ${leverRun(hi, 'LEV-04')}`);
        for (const l of quantifiedLevers(hi).filter(l => l !== 'LEV-04')) if (leverRun(hi, l) < leverRun(lo, l) - TOL) fail(`${step}: ${l} ${leverRun(lo, l)} -> ${leverRun(hi, l)}`);
        const drop = net(lo, 'netRunRate') - net(hi, 'netRunRate');
        const lev04 = leverRun(lo, 'LEV-04') - leverRun(hi, 'LEV-04');
        if (drop > lev04 + TOL) fail(`${step}: net run-rate fell by ${drop}, more than LEV-04's fall of ${lev04}`);
      }
    }
  }, 600_000);
});

/* ---------------------- 3. Liveness and reachability ------------------------ */

const ALL_SCOPES: Facts = {
  org: { currency: 'USD', consumingUnits: '20+' },
  footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'data_centre', 'kubernetes', 'ai_api', 'saas', 'licensing'] },
  spend: { byScope: { aws: { exact: 40_000_000 }, azure: { exact: 20_000_000 } }, growth12m: 10 },
  base: { eligibleCoverage: { unknown: true } }
};
const allAt = (mode: Mode, level: AnswerLevel, facts = ALL_SCOPES) =>
  ({ mode, facts, answers: Object.fromEntries(MATURITY.filter(q => q.modes.includes(mode)).map(q => [q.id, answerFor(q.id, level)])) });

describe('FinOps IQ v3 audit: no dead questions, every rating reachable (PLAN F5 item 2)', () => {
  for (const mode of MODES) {
    it(`${mode}: every maturity question moves its own capability's rating from an all-at-core baseline (F3 re-review R4)`, () => {
      const ids = MATURITY.filter(q => q.modes.includes(mode)).map(q => q.id);
      const dead: string[] = [];
      for (const id of ids) {
        const q = Q.get(id);
        // Core questions from an all-Run baseline; depth questions from an all-Walk baseline (every answer at the core level).
        const live = (['run', 'walk'] as AnswerLevel[]).some(level => {
          const b = allAt(mode, level);
          const before = cap(evaluateFinOpsIqV3(b), q.capability);
          if (!before.questionIds.includes(id)) return false;
          return ['not_yet', 'crawl', 'unknown'].some(v => cap(evaluateFinOpsIqV3(withAnswer(b, id, answerFor(id, v as AnswerLevel))), q.capability).rating !== before.rating);
        });
        if (!live) dead.push(id);
      }
      expect(dead).toEqual([]);
    });
  }

  it('hypothesis questions are never scored: no rating, gap, finding or need index moves with them (D4)', () => {
    for (const mode of MODES) {
      const b = allAt(mode, 'walk');
      const strip = (r: FinOpsIqV3Result) => ({ caps: r.capabilities, f: r.findings.map(f => [f.id, f.severity]), need: r.needVerdict?.needIndex ?? null });
      const ref = strip(evaluateFinOpsIqV3(b));
      for (const q of QUESTIONS.filter(x => x.kind === 'hypothesis' && x.modes.includes(mode))) {
        for (const v of (q.options ?? [{ value: 'Notes' }]).map((o: any) => o.value)) {
          expect(strip(evaluateFinOpsIqV3(withAnswer(b, q.id, q.answerType === 'rank' ? [v] : q.answerType === 'allocation_100' ? { nobody: 100 } : v))), `${mode} ${q.id}=${v}`).toEqual(ref);
        }
      }
    }
  });

  it('every rating is reachable for every capability in each mode; Not in scope only by scope; Not assessed only outside the executive set', () => {
    const narrow: Facts = { org: { currency: 'USD', consumingUnits: '2-4' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 5_000_000 } } } };
    for (const mode of MODES) {
      for (const c of CAPS) {
        const seen = new Set<string>();
        for (const level of ORDER) seen.add(cap(evaluateFinOpsIqV3(allAt(mode, level)), c.id).rating);
        seen.add(cap(evaluateFinOpsIqV3({ mode, facts: ALL_SCOPES, answers: {} }), c.id).ratingLabel === 'Not answered' ? 'not_answered' : 'x');
        const inExec = EXECUTIVE_CAPABILITIES.has(c.id);
        if (mode === 'executive' && !inExec) expect([...seen], `${mode} ${c.id}`).toEqual(['not_assessed', 'x']);
        else {
          for (const r of [...LEVELS, 'unknown', 'not_answered']) expect(seen.has(r), `${mode} ${c.id} reaches ${r}`).toBe(true);
          const scoped = c.relevance !== 'always';
          if (scoped) expect(cap(evaluateFinOpsIqV3(allAt(mode, 'run', narrow)), c.id).rating, `${c.id} out of scope`).toBe('not_in_scope');
        }
      }
    }
  });

  it('every need verdict band is reachable in executive mode (best and worst answers included)', () => {
    const bands = new Set(CASES.filter(x => x.input.mode === 'executive').map(x => evaluateFinOpsIqV3(x.input).needVerdict!.band));
    for (const f of [ADAPTER.executive.extremes.best(), ADAPTER.executive.extremes.worst()]) bands.add(evaluateFinOpsIqV3(f).needVerdict!.band);
    for (const level of ORDER) bands.add(evaluateFinOpsIqV3(allAt('executive', level)).needVerdict!.band);
    expect([...bands].sort()).toEqual(R.needVerdict.bands.map((b: any) => b.id).sort());
  });
});

/* ------------------- 4. Missing data and Unknown never help ----------------- */

describe('FinOps IQ v3 audit: missing data never helps, Unknown never beats an answer (PLAN F5 items 2 and 3)', () => {
  itCases('a blank or Unknown never scores better than any answered option: rating, gap count, at-target count, need index (with the value step) and net value', (x, fail) => {
    const base = evaluateFinOpsIqV3(x.input);
    for (const id of asked(base)) {
      const c = Q.get(id).capability;
      const rest = without(x.input, id);
      const unanswered = [{ how: 'blank', r: evaluateFinOpsIqV3(rest) }, { how: 'Unknown', r: evaluateFinOpsIqV3(withAnswer(rest, id, answerFor(id, 'unknown'))) }];
      for (const v of ladder(id).slice(1)) {
        const a = evaluateFinOpsIqV3(withAnswer(rest, id, v));
        for (const { how, r: b } of unanswered) {
          const msg = `${how} ${id} vs ${JSON.stringify(v)}`;
          const eff = (r: FinOpsIqV3Result) => { const p = cap(r, c); return p.complete && !p.unconfirmed ? ratingIndex(p.rating) : 0; };
          if (eff(b) > eff(a)) fail(`${msg}: ${c} ${cap(b, c).rating} above ${cap(a, c).rating}`);
          if (gapCount(b) < gapCount(a)) fail(`${msg}: gap count ${gapCount(b)} < ${gapCount(a)}`);
          if (b.headline.atOrAboveTarget > a.headline.atOrAboveTarget) fail(`${msg}: at target ${b.headline.atOrAboveTarget} > ${a.headline.atOrAboveTarget}`);
          if (b.needVerdict && b.needVerdict.needIndex < a.needVerdict!.needIndex - 1e-9) fail(`${msg}: need ${b.needVerdict.needIndex} < ${a.needVerdict!.needIndex}`);
          for (const k of ['netRunRate', 'net3Year'] as const) if (net(b, k) > net(a, k) + TOL) fail(`${msg}: ${k} ${net(b, k)} > ${net(a, k)}`);
        }
      }
    }
  }, 600_000);

  it('F5 fix: a blank or Unknown OP-06 keeps the value need modifier\'s points when an answered option would reach it (ASM-FIN-086)', () => {
    const facts: Facts = { org: { currency: 'USD', consumingUnits: '5-19' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] }, spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 },
      base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.65 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.3 } }, cost: { internalRate: { exact: 12_000 } } };
    const answered = allAt('executive', 'run', facts);
    const a = evaluateFinOpsIqV3(withAnswer(answered, 'OP-06', 'not_yet'));
    expect(a.needVerdict!.modifiers.map(m => m.id)).toContain(VR.scoring.needModifierId);
    for (const r of [evaluateFinOpsIqV3(without(answered, 'OP-06')), evaluateFinOpsIqV3(withAnswer(answered, 'OP-06', 'unknown'))]) {
      const v = r.needVerdict!;
      expect(v.modifiers.map(m => m.id)).toContain('value_input_unanswered');
      expect(v.modifiers.map(m => m.id)).not.toContain(VR.scoring.needModifierId);
      expect(v.valueBasis).toBeNull(); // no figure is claimed for it
      expect(v.claimIds).toContain('CLM-FIN-177');
      expect(v.needIndex).toBeGreaterThanOrEqual(a.needVerdict!.needIndex);
    }
    // Not applied when no answered option would reach the modifier (no value base), nor in workshop mode.
    const noBase = { ...answered, facts: { ...facts, base: {} } };
    expect(evaluateFinOpsIqV3(without(noBase, 'OP-06')).needVerdict!.modifiers.map(m => m.id)).not.toContain('value_input_unanswered');
    expect(CLAIMS.get('CLM-FIN-177')?.clientVisible).toBe(true);
  });
});

/* ------------------------- 5. Single-answer limit --------------------------- */

describe('FinOps IQ v3 audit: single-answer limit (PLAN F5 item 2; F5-notes.md)', () => {
  itCases('one answer moves only its own capability; one step on the answer scale moves it one level at most; a depth answer moves it one level at most', (x, fail) => {
    const base = evaluateFinOpsIqV3(x.input);
    for (const id of asked(base)) {
      const q = Q.get(id);
      const rs = [evaluateFinOpsIqV3(without(x.input, id)), ...ladder(id).map(v => evaluateFinOpsIqV3(withAnswer(x.input, id, v)))];
      const own = (r: FinOpsIqV3Result) => ratingIndex(cap(r, q.capability).rating);
      const hasCore = cap(base, q.capability).questionIds.some(qid => Q.get(qid).role === 'core');
      for (const a of rs) for (const b of rs) {
        for (const c of a.capabilities) if (c.capability !== q.capability && (c.rating !== cap(b, c.capability).rating || c.gap !== cap(b, c.capability).gap)) fail(`${id} moves ${c.capability}`);
        if (q.role !== 'core' && hasCore && Math.abs(own(a) - own(b)) > 1) fail(`depth ${id} moves ${q.capability} ${Math.abs(own(a) - own(b))} levels`);
      }
      for (let i = 2; i < rs.length; i++) if (Math.abs(own(rs[i]) - own(rs[i - 1])) > 1) fail(`one step of ${id} moves ${q.capability} ${Math.abs(own(rs[i]) - own(rs[i - 1]))} levels`);
    }
  }, 600_000);

  itCases('summary limit: one answer moves the gap count and the at-target count by 1 at most, and the need index by one capability\'s share at most (plus the value modifier for OP-06)', (x, fail) => {
    const base = evaluateFinOpsIqV3(x.input);
    for (const id of asked(base)) {
      const rs = [evaluateFinOpsIqV3(without(x.input, id)), ...ladder(id).map(v => evaluateFinOpsIqV3(withAnswer(x.input, id, v)))];
      const swing = (f: (r: FinOpsIqV3Result) => number) => Math.max(...rs.map(f)) - Math.min(...rs.map(f));
      if (swing(gapCount) > 1) fail(`${id}: gap count swing ${swing(gapCount)}`);
      if (swing(r => r.headline.atOrAboveTarget) > 1) fail(`${id}: at-target swing ${swing(r => r.headline.atOrAboveTarget)}`);
      if (swing(totalGap) > 3) fail(`${id}: total gap swing ${swing(totalGap)}`);
      if (x.input.mode === 'executive') {
        const n = base.capabilities.filter(c => EXECUTIVE_CAPABILITIES.has(c.capability) && c.target.level !== null && c.rating !== 'not_in_scope').length;
        const limit = 100 / n + 0.1 + (feedsValue('executive', id) ? 10 : 0);
        const s = swing(r => r.needVerdict!.needIndex);
        if (s > limit) fail(`${id}: need index swing ${s} > ${limit}`);
        // One step on the answer scale: one level of one capability, 100 / (3n).
        for (let i = 2; i < rs.length; i++) {
          const d = Math.abs(rs[i].needVerdict!.baseIndex - rs[i - 1].needVerdict!.baseIndex);
          if (d > 100 / (3 * n) + 0.1) fail(`${id}: one step moves the base need index by ${d}`);
        }
      }
    }
  }, 600_000);
});

/* --------------------------- 6. Specific checks ----------------------------- */

describe('FinOps IQ v3 audit: specific checks (PLAN F5 item 3)', () => {
  itCases('N/A only from scope: Not in scope depends on the facts alone, never on an answer, and no option says "not applicable"', (x, fail) => {
    const ref = evaluateFinOpsIqV3({ ...x.input, answers: {} }).capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability);
    for (const level of ORDER) {
      const r = evaluateFinOpsIqV3(allAt(x.input.mode, level, x.input.facts));
      const nis = r.capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability);
      if (JSON.stringify(nis) !== JSON.stringify(ref)) fail(`all ${level}: not in scope ${nis} vs ${ref}`);
    }
    const nis = evaluateFinOpsIqV3(x.input).capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability);
    if (JSON.stringify(nis) !== JSON.stringify(ref)) fail(`own answers: not in scope ${nis} vs ${ref}`);
    for (const c of nis) {
      const def = CAPS.find(y => y.id === c)!;
      const anyAsked = MATURITY.some(q => q.capability === c && evaluateFinOpsIqV3(x.input).questions.asked.includes(q.id));
      if (def.relevance === 'always' && anyAsked) fail(`${c} not in scope although asked`);
    }
  }, 300_000);

  it('no answer option anywhere means "not applicable"', () => {
    for (const q of QUESTIONS) for (const o of q.options ?? []) {
      expect(`${o.value} ${o.label}`, q.id).not.toMatch(/not[ _]applicable|\bn\/a\b|__NA__/i);
      expect(o.level ?? 'none', q.id).not.toBe('not_in_scope');
    }
  });

  it('Unknown never scores better than the lowest answered option, on every question, from all-at-one-level baselines', () => {
    for (const mode of MODES) for (const level of ['run', 'walk', 'crawl'] as AnswerLevel[]) {
      const b = allAt(mode, level);
      for (const q of MATURITY.filter(y => y.modes.includes(mode))) {
        const u = evaluateFinOpsIqV3(withAnswer(b, q.id, answerFor(q.id, 'unknown')));
        const n = evaluateFinOpsIqV3(withAnswer(b, q.id, answerFor(q.id, 'not_yet')));
        const cu = cap(u, q.capability), cn = cap(n, q.capability);
        if (!cu.questionIds.includes(q.id)) continue;
        expect(ratingIndex(cu.rating), `${mode} ${level} ${q.id}`).toBeLessThanOrEqual(ratingIndex(cn.rating));
        expect(cu.atOrAboveTarget === true && cn.atOrAboveTarget !== true, `${mode} ${level} ${q.id} at target`).toBe(false);
        expect(gapCount(u), `${mode} ${level} ${q.id}`).toBeGreaterThanOrEqual(gapCount(n));
        if (mode === 'executive') expect(u.needVerdict!.needIndex, `${mode} ${level} ${q.id}`).toBeGreaterThanOrEqual(n.needVerdict!.needIndex);
        expect(cu.unconfirmed, `${mode} ${level} ${q.id}`).toBe(true);
      }
    }
  });

  /** Percentage ranges in a label: "more than 90%", "85% to 90%", "85-90%", "70% to under 85%", "below 70%", "within ±5%". */
  function bands(text: string): Array<[number, number]> {
    const t = text.toLowerCase().replace(/±/g, '').replace(/plus or minus /g, '');
    const out: Array<[number, number]> = [];
    let m: RegExpExecArray | null;
    const re = /(more than|above|over)\s+(\d+)%(?:,?\s*up to\s+(\d+)%)?|(\d+)%?\s*(?:-|to)\s*(?:under\s+)?(\d+)%|(below|under|within)\s+(\d+)%/g;
    while ((m = re.exec(t))) {
      if (m[1]) out.push([Number(m[2]), m[3] ? Number(m[3]) : 100]);
      else if (m[4]) out.push([Number(m[4]), Number(m[5])]);
      else out.push([0, Number(m[7])]);
    }
    return out;
  }
  const union = (bs: Array<[number, number]>) => [Math.min(...bs.map(b => b[0])), Math.max(...bs.map(b => b[1]))];

  it('finding and threshold labels match the thresholds behind them (M10): UN-04 and QV-01 options agree with THR-FIN-01 and THR-FIN-05 and their claims', () => {
    for (const [qid, thr, claim] of [['UN-04', 'THR-FIN-01', 'CLM-FIN-124'], ['QV-01', 'THR-FIN-05', 'CLM-FIN-126']] as const) {
      const q = Q.get(qid);
      const rule = THR.get(thr).rule;
      for (const level of LEVELS) {
        const opts = q.options.filter((o: any) => o.level === level);
        expect(opts.length, `${qid} ${level}`).toBeGreaterThan(0);
        const optBands = opts.flatMap((o: any) => bands(o.label));
        const ruleBands = bands(rule[level]);
        if (!optBands.length) {
          // Only "not measured" / "no forecast" options carry no range; the threshold says the same.
          expect(rule[level].toLowerCase(), `${thr} ${level}`).toMatch(/not measured|no forecast/);
          expect(opts.map((o: any) => o.label.toLowerCase()).join(' '), `${qid} ${level}`).toMatch(/not measured|no forecast/);
          continue;
        }
        expect(union(optBands), `${qid} ${level} options vs ${thr}: ${JSON.stringify(optBands)} / ${rule[level]}`).toEqual(union(ruleBands));
        const stmt = CLAIMS.get(claim).statement.toLowerCase();
        const label = level === 'not_yet' ? 'not yet' : level;
        expect(stmt, `${claim} names ${level}`).toContain(label);
      }
    }
    // Owner decision 15 Oct 2026 (M6): measured allocation below 70% reads as Crawl; only "not measured" reads as Not yet.
    const below70 = Q.get('UN-04').options.find((o: any) => o.value === 'below_70');
    expect(below70.level).toBe('crawl');
    expect(THR.get('THR-FIN-01').rule.crawl).toMatch(/below 70%/);
    expect(THR.get('THR-FIN-01').rule.not_yet).toBe('not measured');
    expect(CLAIMS.get('CLM-FIN-124').statement).toMatch(/below 70% where allocation is measured/);
    expect(CLAIMS.get('CLM-FIN-124').statement).toMatch(/Not yet = not measured/);
  });

  it('labels match thresholds elsewhere (M10): UN-08 count rule, need bands, severity and need value shares, schedule hours, follow-up trigger', () => {
    const un08 = Q.get('UN-08');
    const rule08 = THR.get('THR-FIN-08').rule;
    const count = (s: string) => (s.match(/(\d+|one|two|three|four|five|none)/g) ?? []).map(w => ({ none: 0, one: 1, two: 2, three: 3, four: 4, five: 5 } as any)[w] ?? Number(w));
    for (const r of un08.multiSelectLevelRule) expect(count(rule08[r.level] === 'none' ? 'none' : rule08[r.level]).includes(r.minCount) || (r.level === 'run' && rule08.run.includes('all five')), `UN-08 ${r.level}`).toBe(true);
    expect(un08.help).toMatch(/All five = Run, three or four = Walk, one or two = Crawl, none = Not yet/);
    // Need bands: THR-FIN-14 text = engine bands and labels.
    let lo = 0;
    for (const b of R.needVerdict.bands) {
      expect(THR.get('THR-FIN-14').rule.bands, b.id).toContain(`${lo === 0 ? 0 : lo}-${b.max} ${b.label}`);
      lo = b.max + 1;
    }
    expect(THR.get('THR-FIN-13').rule.rule).toContain(`${VR.scoring.severityUpliftShareOfP * 100}%`);
    expect(THR.get('THR-FIN-14').rule.urgency).toContain(`value ${VR.scoring.needModifierShareOfP * 100}% or more of P`);
    expect(THR.get('THR-FIN-15').rule.maxRate).toBeCloseTo(1 - THR.get('THR-FIN-15').rule.hoursPerWeek / 168, 3);
    expect((levers as any).levers.find((l: any) => l.id === 'LEV-04').maxRate.value).toBeCloseTo(THR.get('THR-FIN-15').rule.maxRate, 3);
    expect(JSON.stringify(Q.get('OP-02').askWhen)).toContain('"lt":0.5');
    expect(THR.get('THR-FIN-03').rule.askWhen).toMatch(/below 50%/);
  });

  itCases('finding labels state the level the engine rated: "Today" quotes the option the client chose, "Not answered" only for blanks', (x, fail) => {
    const r = evaluateFinOpsIqV3(x.input);
    for (const f of r.findings.filter(y => y.type === 'capability_gap')) {
      const c = cap(r, f.capability);
      if (f.current !== c.rating) fail(`${f.id}: current ${f.current} vs rating ${c.rating}`);
      if (c.ratingLabel === 'Not answered' && !c.notAnswered.length) fail(`${f.id}: "Not answered" without a blank`);
      for (const id of c.questionIds) {
        const v = x.input.answers[id];
        const o = Q.get(id).options.find((y: any) => y.value === v);
        if (o && o.level && !['unknown'].includes(o.level) && f.businessConsequence.includes(`(${id})`) && !f.businessConsequence.includes(o.label)) fail(`${f.id}: quotes ${id} without its label "${o.label}"`);
      }
    }
  }, 300_000);

  itCases('scope and value-base answers are never scored: passed as answers they are ignored, and facts move no rating while the asked set is the same', (x, fail) => {
    const r = evaluateFinOpsIqV3(x.input);
    const scopeQs = QUESTIONS.filter(q => q.kind === 'scope' || q.kind === 'value_base');
    const polluted = evaluateFinOpsIqV3({ ...x.input, answers: { ...x.input.answers, ...Object.fromEntries(scopeQs.map(q => [q.id, 'run'])) } });
    if (JSON.stringify(polluted.capabilities) !== JSON.stringify(r.capabilities)) fail('a scope answer changed the profile');
    for (const q of scopeQs) if (!polluted.coverage.ignoredAnswers.includes(q.id) && polluted.questions.asked.includes(q.id) === false && x.input.answers[q.id] === undefined) {
      // Not asked and not counted: listed as ignored.
      fail(`${q.id} not listed as ignored`);
    }
    // Spend, growth, sector and the value bases (other than coverage, which triggers OP-02) never move a rating.
    const f = x.input.facts;
    const moved: Facts = { ...f, org: { ...f.org, sector: 'other' }, spend: { ...f.spend, growth12m: 0 }, base: { ...(f.base ?? {}), computeShare: { exact: 0.5 }, nonProdShare: { exact: 0.1 } } };
    const m = evaluateFinOpsIqV3({ ...x.input, facts: moved });
    if (JSON.stringify(m.questions.asked) !== JSON.stringify(r.questions.asked)) return;
    for (const c of r.capabilities) if (cap(m, c.capability).rating !== c.rating) fail(`${c.capability}: a fact moved the rating`);
  }, 300_000);
});

/* ------------------- 7. F5 reference scenarios (provider cases) -------------- */

/**
 * Differences between the engine and the F5 scenarios' written expectations, each justified in
 * docs/cio-readiness/finops-iq/design/F5-scenario-diffs.md. Everything not listed must match.
 */
const F5_RECORDED: Record<string, { profile?: Record<string, string> }> = {
  /** E1: the executive expectations wrote Licensing & SaaS and Sustainability as "not_assessed"; with no SaaS, licensing or data centre in scope they are Not in scope (D5), as RS1 writes them. */
  RS6: { profile: { LICENSING_SAAS: 'not_in_scope', SUSTAINABILITY: 'not_in_scope' } },
  RS7: { profile: { LICENSING_SAAS: 'not_in_scope', SUSTAINABILITY: 'not_in_scope' } }
};
const within = (a: number, b: number, rel = 0.01) => Math.abs(a - b) <= Math.max(2, Math.abs(b) * rel);

describe('FinOps IQ v3 audit: F5 reference scenarios against the expectations written first (PLAN F5 item 4)', () => {
  it('each scenario cites official provider sources, labelled P or S, and is illustrative', () => {
    expect(F5.length).toBeGreaterThanOrEqual(3);
    expect(F5.length).toBeLessThanOrEqual(5);
    for (const s of F5) {
      expect(s.illustrative, s.id).toBe(true);
      const provider = s.sources.filter((x: any) => /^https:\/\/(aws\.amazon\.com|www\.microsoft\.com|azure\.microsoft\.com|learn\.microsoft\.com|cloud\.google\.com|docs\.cloud\.google\.com)\//.test(x.url));
      expect(provider.length, s.id).toBeGreaterThan(0);
      for (const x of s.sources) expect(['P', 'S'], `${s.id} ${x.url}`).toContain(x.status);
    }
  });

  for (const s of F5) {
    describe(s.id, () => {
      const r = evaluateFinOpsIqV3(scenarioInput(s, '2026-10-15'));
      const e = s.expected;
      const rec = F5_RECORDED[s.id] ?? {};
      it('tier, capability profile and headline match', () => {
        expect({ tier: r.tier.tier, points: r.tier.points }).toEqual({ tier: e.tier.tier, points: e.tier.points });
        for (const [id, x] of Object.entries<any>(e.capabilityProfile)) {
          const c = cap(r, id);
          expect(c.rating, id).toBe(rec.profile?.[id] ?? x.rating);
          if ('target' in x) expect(c.target.level, id).toBe(x.target);
          if ('gap' in x) expect(c.gap, id).toBe(x.gap);
          if ('atOrAboveTarget' in x) expect(c.atOrAboveTarget, id).toBe(x.atOrAboveTarget);
        }
        expect(r.headline).toMatchObject(e.headline);
      });
      it('findings match in order, type, severity and its trace, owner, wave, levers and offerings', () => {
        expect(r.findings.length).toBe(e.findingCount);
        expect(r.findings.slice(0, e.topFindings.length).map(f => f.id)).toEqual(e.topFindings.map((x: any) => x.id));
        for (const x of e.topFindings) {
          const f = r.findings.find(y => y.id === x.id)!;
          expect(f, x.id).toMatchObject({ type: x.type, capability: x.capability, severity: x.severity, severityTrace: x.severityTrace, ownerRole: x.ownerRole, wave: x.wave,
            ...(x.current ? { current: x.current, target: x.target, gap: x.gap } : {}), ...(x.unconfirmed ? { unconfirmed: true } : {}), ...(x.dependsOn ? { dependsOn: x.dependsOn } : {}) });
          for (const o of x.offeringIds ?? []) expect(f.offeringIds, `${x.id} ${o}`).toContain(o);
          for (const l of x.leverIds ?? []) expect(f.leverIds, `${x.id} ${l}`).toContain(l);
        }
      });
      if (e.needVerdict) it('need verdict matches', () => expect(r.needVerdict).toMatchObject(e.needVerdict));
      else it('has no need verdict (workshop)', () => expect(r.needVerdict).toBeNull());
      it('value figures match within 1%: every lever and total, per case, and the levers left out of the headline', () => {
        expect(r.value.moneyShown).toBe(true);
        for (const c of ['conservative', 'expected', 'upper'] as const) {
          const t: any = r.value.totals![c];
          for (const [id, want] of Object.entries<number>(e.value[c].levers)) expect(within(leverRun(r, id) && r.value.levers.find(l => l.id === id)!.cases![c].runRate.value, want), `${c} ${id}`).toBe(true);
          for (const k of ['grossRunRate', 'grossYear1', 'oneOffCost', 'annualRunCost', 'netYear1', 'netRunRate', 'net3Year']) expect(within(t[k].value, e.value[c][k]), `${c} ${k}: ${t[k].value} vs ${e.value[c][k]}`).toBe(true);
          expect(t.pctOfP.value, `${c} % of P`).toBeCloseTo(e.value[c].pctOfP, 0);
          expect(t.capBinding, c).toBe(c === 'upper' ? e.value.globalCap.upperBinding : e.value.globalCap.binding);
        }
        expect(r.value.levers.filter(l => l.status === 'quantified' && !l.inHeadline).map(l => l.id)).toEqual(e.value.excludedFromHeadline);
        expect(e.value.confidence.startsWith(r.value.confidence.overall!)).toBe(true);
        for (const n of e.value.notQuantified) expect(r.value.notQuantified.find(x => x.lever === n.lever)?.reason, `${n.lever}`).toBe(n.reason.split(' ')[0]);
        expect(r.value.costs.toolingProvided).toBe(e.value.toolingProvided);
      });
    });
  }
});

/* -------------- 7b. Band to exact (DESIGN.md 10.9; PLAN F4 "for F5") -------------- */

describe('FinOps IQ v3 audit: replacing a band with an exact value inside it never moves the expected value outside the band-based range (DESIGN.md 10.9)', () => {
  const bandedPaths = (f: Facts) => [
    ...f.footprint.publicCloudProviders.map(p => ['spend', 'byScope', p]),
    ...Object.keys(f.base ?? {}).map(k => ['base', k])
  ].filter(path => Array.isArray((path.reduce<any>((o, k) => o?.[k], f))?.band));
  const setAt = (f: Facts, path: string[], v: any): Facts => {
    const copy = JSON.parse(JSON.stringify(f));
    path.slice(0, -1).reduce<any>((o, k) => o[k], copy)[path[path.length - 1]] = v;
    return copy;
  };
  const randomBanded = Array.from({ length: 60 }, (_, i) => randomInput(8_000 + i, i % 2 ? 'workshop' : 'executive'))
    .map(input => ({ input, r: evaluateFinOpsIqV3(input) }))
    .filter(x => x.r.value.moneyShown && !x.r.value.bands.fixedAtMidpoint.length && bandedPaths(x.input.facts).length);
  it('the random set has banded estates with money shown', () => expect(randomBanded.length).toBeGreaterThan(15));
  it('one band at a time and all bands at once, at the low end, the midpoint, the high end and a point inside', () => {
    const breaches: string[] = [];
    for (const { input, r } of randomBanded) {
      const lo = r.value.totals!.conservative.grossRunRate.value, hi = r.value.totals!.upper.grossRunRate.value;
      const paths = bandedPaths(input.facts);
      const variants: Facts[] = [];
      for (const w of [0, 0.5, 1, 0.3]) {
        let all = input.facts;
        for (const path of paths) {
          const [a, b] = (path.reduce<any>((o, k) => o?.[k], input.facts)).band;
          const exact = { exact: a + (b - a) * w };
          variants.push(setAt(input.facts, path, exact));
          all = setAt(all, path, exact);
        }
        variants.push(all);
      }
      for (const f of variants) {
        const e = evaluateFinOpsIqV3({ ...input, facts: f });
        if (!e.value.moneyShown) continue;
        const v = e.value.totals!.expected.grossRunRate.value;
        if (v < lo - TOL || v > hi + TOL) breaches.push(`${input.mode} ${JSON.stringify(input.facts.spend)}: expected ${v} outside [${lo}, ${hi}]`);
      }
    }
    expect(breaches.slice(0, 5)).toEqual([]);
  }, 300_000);
});

/* -------------- 8. Phase 3 decisions closed through the v3 model -------------- */

describe('FinOps IQ v3 audit: Phase 3 SCORING_AUDIT.md decisions (PLAN F5 item 6)', () => {
  const execInput = (over: Partial<Facts['spend']> = {}, answers: Record<string, any> = { 'UN-04': 'walk', 'OP-06': 'crawl' }): FinOpsIqV3Input => ({
    mode: 'executive', assessmentDate: '2026-10-15', answers,
    facts: { org: { currency: 'USD', consumingUnits: '5-19' }, footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] },
      spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10, ...over },
      base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.65 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.3 } }, cost: { internalRate: { exact: 12_000 } } }
  });
  const exec = (over: Partial<Facts['spend']> = {}, answers?: Record<string, any>) => evaluateFinOpsIqV3(execInput(over, answers));
  const answered = Object.fromEntries(MATURITY.filter(q => q.modes.includes('executive')).map(q => [q.id, 'walk']));

  it('FVC item 2: urgency drivers are scope facts, not answers; a blank growth adds no points and is a listed blind spot; no hypothesis answer adds points (D4)', () => {
    const known = exec({ growth12m: 30 }), unknown = exec({ growth12m: 'unknown' });
    expect(known.needVerdict!.modifiers.map(m => m.id)).toContain('growth_ge_20pct');
    expect(unknown.needVerdict!.modifiers.map(m => m.id)).not.toContain('growth_ge_20pct');
    expect(unknown.needVerdict!.blindSpots).toContainEqual({ fact: 'spend.growth12m', reason: 'unknown' });
    // The FinOps Value Case urgency points for HY-03 and HY-05 are retired: the modifiers are tier, value, growth and AI only.
    expect(R.needVerdict.modifiers.map((m: any) => m.id)).toEqual(['tier_2', 'tier_3', 'expected_value_ge_5pct_of_P', 'value_input_unanswered', 'growth_ge_20pct', 'ai_in_scope']);
    const ref = exec({}, answered).needVerdict!.needIndex;
    for (const band of ['lt_5', 'p10_19', 'ge_30', 'dont_know']) expect(exec({}, { ...answered, 'HY-01': band }).needVerdict!.needIndex, band).toBe(ref);
  });

  it('FVC item 6: no growth is applied to value (ASM-FIN-051), growth adds urgency only at 20% or more; confidence is Low with any unanswered or Unknown question, else Medium', () => {
    expect(JSON.stringify(exec({ growth12m: -25 }, answered).value.totals)).toBe(JSON.stringify(exec({ growth12m: 200 }, answered).value.totals));
    expect(exec({}, answered).needVerdict!.confidence).toBe('Medium');
    expect(exec({}, { ...answered, 'UN-04': 'unknown' }).needVerdict!.confidence).toBe('Low');
    expect(exec({}, without({ ...execInput(), answers: answered }, 'UN-04').answers).needVerdict!.confidence).toBe('Low');
  });

  it('FinOps IQ items 3 to 5: no stages, gates or N/A option, and the client\'s waste estimate (HY-01, was T6) moves no number', () => {
    const r = exec({}, answered);
    expect(JSON.stringify(r)).not.toMatch(/"(maturityStage|stageScores|stageStatuses|gates?|valueAtStake|wasteBand|archetype)"/);
    for (const q of QUESTIONS) for (const o of q.options ?? []) expect(String(o.value), q.id).not.toBe('__NA__');
    const strip = (x: FinOpsIqV3Result) => ({ ...x, hypotheses: null, value: { ...x.value, hypothesis: null } });
    for (const band of ['lt_5', 'p10_19', 'ge_30', 'dont_know']) expect(strip(exec({}, { ...answered, 'HY-01': band })), band).toEqual(strip(r));
  });
});
