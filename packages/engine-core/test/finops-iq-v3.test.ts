/**
 * FinOps IQ v3 (plan phase F3): contract, rating rule, scope triggers, invariants, golden outputs for the five
 * reference scenarios (docs/cio-readiness/finops-iq/design/reference-scenarios.json) and legacy question coverage.
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run finops-iq-v3, then have the FinOps lead
 * review the golden diff. Differences from the scenarios' hand-written expectations are recorded in
 * docs/cio-readiness/finops-iq/design/F3-scenario-diffs.md and mirrored in RECORDED below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import Ajv2020 from 'ajv/dist/2020';
import {
  evaluateFinOpsIqV3, rateCapability, complexityTier, parseFinOpsIqV3Request, QUESTIONS, EXECUTIVE_CAPABILITIES, LEVELS,
  type FinOpsIqV3Input, type FinOpsIqV3Result, type Facts, type Mode, type AnswerLevel
} from '../src/accelerators/finops-iq/v3';
import bank from '../src/accelerators/finops-iq/v3/question-bank.json' with { type: 'json' };
import rules from '../src/accelerators/finops-iq/v3/engine-rules.json' with { type: 'json' };
import capabilityModel from '../src/accelerators/finops-iq/registry/capabilities.json' with { type: 'json' };
import register from '../src/claims/claims-register.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs');
const DESIGN_DIR = join(__dirname, '../../../docs/cio-readiness/finops-iq/design');
const SCENARIOS: any[] = JSON.parse(readFileSync(join(DESIGN_DIR, 'reference-scenarios.json'), 'utf8')).scenarios;
const DESIGN = readFileSync(join(DESIGN_DIR, 'DESIGN.md'), 'utf8');
const B: any = bank;
const R: any = rules;
const CAPS: any[] = (capabilityModel as any).capabilities;
const CLAIMS = new Map<string, any>((register as any).claims.map((c: any) => [c.id, c]));
const Q = new Map<string, any>(QUESTIONS.map(q => [q.id, q]));
const MATURITY = QUESTIONS.filter(q => q.kind === 'maturity');

/* --------------------------------- Helpers --------------------------------- */

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
/** The answer value that sets a level on a question (UN-08 is a multi-select counted by ASM-FIN-021). */
const answerFor = (id: string, level: AnswerLevel) => (id === 'UN-08' ? UN08[level] : level);

function scenarioInput(s: any): FinOpsIqV3Input {
  const answers: Record<string, any> = {};
  for (const [id, code] of Object.entries<string>(s.inputs.answers)) answers[id] = answerFor(id, CODE[code]);
  return { mode: s.mode, facts: s.inputs.facts, answers };
}

const facts = (over: Partial<Facts['footprint']> = {}, extra: Partial<Facts> = {}): Facts => ({
  org: { currency: 'USD', consumingUnits: '2-4' },
  footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'], ...over },
  spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 },
  ...extra
});
const run = (f: Facts, answers: Record<string, any> = {}, mode: Mode = 'workshop', more: Partial<FinOpsIqV3Input> = {}) =>
  evaluateFinOpsIqV3({ mode, facts: f, answers, ...more });
const cap = (r: FinOpsIqV3Result, id: string) => r.capabilities.find(c => c.capability === id)!;
const asked = (r: FinOpsIqV3Result, id: string) => r.questions.asked.includes(id);
const ratingIndex = (rating: string) => (rating === 'unknown' || rating === 'not_assessed' ? 0 : LEVELS.indexOf(rating as any));

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const subset = <T>(r: () => number, a: T[], p = 0.5) => a.filter(() => r() < p);
const amount = (r: () => number, max: number) => {
  const x = r();
  if (x < 0.15) return { unknown: true as const };
  const v = Math.round(r() * max * 100) / 100;
  return x < 0.6 ? { exact: v } : { band: [v, Math.min(max, v + Math.round(r() * max * 50) / 100)] as [number, number] };
};

function randomFacts(r: () => number): Facts {
  const providers = subset(r, ['aws', 'azure', 'gcp', 'oci'], 0.4);
  const scopes = subset(r, ['private_cloud', 'data_centre', 'colocation', 'kubernetes', 'ai_api', 'ai_platform_gpu', 'saas', 'licensing'], 0.3);
  if (providers.length && r() < 0.8) scopes.unshift('public_cloud');
  const byScope: Record<string, any> = {};
  for (const p of providers) byScope[p] = amount(r, 80_000_000);
  for (const s of scopes) if (s !== 'public_cloud' && r() < 0.5) byScope[s] = amount(r, 20_000_000);
  const eur = r() < 0.3;
  const base: Record<string, any> = {};
  for (const k of ['computeShare', 'steadyStateShare', 'eligibleCoverage', 'nonProdShare']) if (r() < 0.8) base[k] = amount(r, 1);
  return {
    org: { currency: eur ? 'EUR' : 'USD', ...(eur ? { tierFxRate: 1.08 } : {}), consumingUnits: pick(r, ['1', '2-4', '5-19', '20+']) },
    footprint: { publicCloudProviders: providers, scopes, ...(r() < 0.3 ? { migration: { remainingShare24m: amount(r, 1) } } : {}) },
    spend: { byScope, growth12m: r() < 0.2 ? 'unknown' : Math.round(r() * 80) - 20 },
    base
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
    if (!q.modes.includes(mode) || q.kind === 'scope' || q.kind === 'value_base' || r() < 0.15) continue;
    answers[q.id] = randomAnswer(r, q);
  }
  return { mode, facts: randomFacts(r), answers };
}

function ajv() {
  const a = new Ajv2020({ strict: false, validateFormats: false, allErrors: true });
  for (const f of ['facts', 'capability', 'question', 'lever', 'finding']) a.addSchema(JSON.parse(readFileSync(join(DESIGN_DIR, `${f}.schema.json`), 'utf8')));
  return a;
}
const AJV = ajv();
const validator = (ref: string) => AJV.getSchema(ref)!;

/* --------------------------------- Contract -------------------------------- */

describe('FinOps IQ v3 contract', () => {
  it('accepts the five reference scenarios (executive and workshop)', () => {
    for (const s of SCENARIOS) {
      const res = parseFinOpsIqV3Request(scenarioInput(s));
      expect(res.ok ? [] : res.errors, s.id).toEqual([]);
    }
    expect(new Set(SCENARIOS.map(s => s.mode))).toEqual(new Set(['executive', 'workshop']));
  });

  it('accepts random questionnaires in both modes, and their facts satisfy facts.schema.json', () => {
    const factsValid = validator('urn:ltm:finops-iq:v3:facts');
    for (const mode of ['executive', 'workshop'] as Mode[]) {
      for (let seed = 1; seed <= 150; seed++) {
        const input = randomInput(seed, mode);
        const res = parseFinOpsIqV3Request(input);
        expect(res.ok ? [] : res.errors, `${mode} seed ${seed}`).toEqual([]);
        expect(factsValid(input.facts), `${mode} seed ${seed}: ${JSON.stringify(factsValid.errors)}`).toBe(true);
      }
    }
  });

  it('accepts a valid executive answer set as a partial workshop answer set', () => {
    const s = SCENARIOS.find(x => x.mode === 'executive');
    const res = parseFinOpsIqV3Request({ ...scenarioInput(s), mode: 'workshop' });
    expect(res.ok ? [] : res.errors).toEqual([]);
  });

  it('rejects a missing or unknown mode, missing facts and missing answers', () => {
    const res = parseFinOpsIqV3Request({ mode: 'self-serve' });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('mode: expected "executive" or "workshop"');
    expect(errors).toContain('facts: expected an object');
    expect(errors).toContain('"answers" must be an object');
  });

  it('rejects unknown questions and malformed answers with readable reasons', () => {
    const res = parseFinOpsIqV3Request({
      mode: 'workshop', facts: facts(),
      answers: { ZZ: 'run', 'UN-04': 'R', 'UN-08': ['forecast', 'forecast'], 'OP-01': 3, 'HY-02': ['skills', 'nope'], 'HY-04': { nobody: 120 }, 'HY-07': 7, 'SC-02': ['aws'], 'VB-02': { exact: 0.5 } }
    });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('answers.ZZ: unknown question');
    expect(errors).toContain('answers.UN-04: expected one of run, walk, crawl, not_yet, unknown');
    expect(errors).toContain('answers.UN-08: expected a list without repeats');
    expect(errors).toContain('answers.OP-01: expected one of');
    expect(errors).toContain('answers.HY-02: expected an ordered list');
    expect(errors).toContain('answers.HY-04: expected points from 0 to 100');
    expect(errors).toContain('answers.HY-07: expected text');
    expect(errors).toContain('answers.SC-02: answered through facts (footprint.publicCloudProviders)');
    expect(errors).toContain('answers.VB-02: answered through facts (base.eligibleCoverage)');
  });

  it('has no "not applicable" answer: N/A comes only from scope facts', () => {
    const res = parseFinOpsIqV3Request({ mode: 'workshop', facts: facts(), answers: { 'UN-01': '__NA__', 'QV-04': 'not_applicable' } });
    expect(res.ok ? '' : res.errors.join('\n')).toMatch(/UN-01: expected one of[\s\S]*QV-04: expected one of/);
    expect(JSON.stringify(B.questions)).not.toMatch(/not[ _]applicable/i);
  });

  it('rejects in executive mode a question that only the workshop asks', () => {
    const res = parseFinOpsIqV3Request({ mode: 'executive', facts: facts(), answers: { 'UN-01': 'run', 'UN-04': 'walk', 'HY-03': 'once' } });
    const errors = res.ok ? [] : res.errors;
    expect(errors).toEqual(['answers.UN-01: not part of the executive question set', 'answers.HY-03: not part of the executive question set']);
  });

  it('rejects malformed facts with readable reasons', () => {
    const bad: any = {
      org: { currency: 'euro', sector: 'mining', colour: 'red' },
      footprint: { publicCloudProviders: ['aws', 'aws', 'digitalocean'], scopes: ['moon'] },
      spend: { byScope: { aws: { band: [5, 1] }, mars: { exact: 1 }, saas: { exact: -1 } }, growth12m: 500 },
      base: { computeShare: { exact: 1.5 }, waste: { exact: 0.2 } },
      consultant: { complexityTierOverride: 4 }
    };
    const res = parseFinOpsIqV3Request({ mode: 'workshop', facts: bad, answers: {} });
    const errors = res.ok ? '' : res.errors.join('\n');
    for (const m of [
      'facts.org.currency: expected an ISO 4217 code', 'facts.org.sector: expected one of', 'facts.org.colour: unknown field',
      'facts.footprint.publicCloudProviders: expected a list without repeats', 'facts.footprint.scopes: expected a list',
      'facts.spend.byScope.aws.band: expected [low, high] with low <= high', 'facts.spend.byScope.mars: expected a provider',
      'facts.spend.byScope.saas.exact: expected an amount of 0 or more', 'facts.spend.growth12m: expected a percent from -25 to 200',
      'facts.base.computeShare.exact: expected a share from 0 to 1', 'facts.base.waste: unknown field',
      'facts.consultant.complexityTierOverride: expected 1, 2 or 3'
    ]) expect(errors).toContain(m);
  });

  it('requires a tier FX rate for spend in a currency other than USD (used only for the tier, D9)', () => {
    const f = facts({}, { org: { currency: 'GBP' }, spend: { byScope: { aws: { exact: 1_000_000 } } } });
    const res = parseFinOpsIqV3Request({ mode: 'executive', facts: f, answers: {} });
    expect(res.ok ? [] : res.errors).toEqual(['facts.org.tierFxRate: required when spend is given in a currency other than USD (used only for the complexity tier)']);
    expect(parseFinOpsIqV3Request({ mode: 'executive', facts: { ...f, org: { currency: 'GBP', tierFxRate: 1.27 } }, answers: {} }).ok).toBe(true);
    expect(parseFinOpsIqV3Request({ mode: 'executive', facts: { ...f, spend: { byScope: { aws: { unknown: true } } } }, answers: {} }).ok).toBe(true);
  });

  it('rejects target overrides without a capability, level or recorded reason, and unknown pre-fill ids', () => {
    const res = parseFinOpsIqV3Request({
      mode: 'workshop', facts: facts(), answers: {},
      targetOverrides: [{ capability: 'CLOUD', level: 'sprint', reason: 'short' }], prefilled: ['ZZ-01']
    });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('targetOverrides[0].capability: unknown capability');
    expect(errors).toContain('targetOverrides[0].level: expected one of not_yet, crawl, walk, run');
    expect(errors).toContain('targetOverrides[0].reason: expected a recorded reason');
    expect(errors).toContain('prefilled: expected a list of question ids');
  });
});

/* ------------------------------- Question bank ------------------------------ */

describe('FinOps IQ v3 question bank', () => {
  it('validates against question.schema.json', () => {
    const v = AJV.compile({ $ref: 'urn:ltm:finops-iq:v3:question' });
    expect(v(B), JSON.stringify(v.errors?.slice(0, 5))).toBe(true);
  });

  it('holds the merged set of DESIGN.md section 7: 7 scope, 9 value-base, 46 maturity and 7 hypothesis questions', () => {
    const count = (k: string) => QUESTIONS.filter(q => q.kind === k).length;
    expect([count('scope'), count('value_base'), count('maturity'), count('hypothesis')]).toEqual([7, 9, 46, 7]);
  });

  it('every question carries basis claim IDs that exist in the claims register', () => {
    for (const q of QUESTIONS) {
      const ids = q.basis.map((b: any) => b.claimId).filter(Boolean);
      expect(ids.length, q.id).toBeGreaterThan(0);
      for (const id of ids) {
        expect(CLAIMS.has(id), `${q.id} cites ${id}`).toBe(true);
        expect(CLAIMS.get(id).clientVisible, `${q.id} cites consultant-only ${id}`).toBe(true);
      }
    }
  });

  it('each maturity question rates exactly one capability with the role the F2 registry gives it, and offers "Don\'t know"', () => {
    for (const q of MATURITY) {
      const c = CAPS.find(x => x.id === q.capability);
      expect(c.questions.find((x: any) => x.id === q.id)?.role, q.id).toBe(q.role);
      expect(q.options.filter((o: any) => o.level === 'unknown').length, q.id).toBe(1);
    }
    for (const c of CAPS) for (const { id } of c.questions) expect(Q.get(id)?.capability, id).toBe(c.id);
  });

  it('the executive set is DESIGN.md 7.7: 18 questions plus optional HY-01 and HY-07, rating 8 capabilities', () => {
    expect(B.executiveSet.filter((id: string) => !id.startsWith('HY')).length).toBe(18);
    expect(B.executiveSet.filter((id: string) => id.startsWith('HY'))).toEqual(['HY-01', 'HY-07']);
    expect([...EXECUTIVE_CAPABILITIES].sort()).toEqual(['ALLOCATION', 'ANOMALY_MANAGEMENT', 'EXECUTIVE_STRATEGY_ALIGNMENT', 'FINOPS_PRACTICE_OPERATIONS',
      'FORECASTING', 'RATE_OPTIMIZATION', 'UNIT_ECONOMICS', 'USAGE_OPTIMIZATION']);
  });

  it('uses the F2 thresholds in the UN-04 and QV-01 options (THR-FIN-01, THR-FIN-05)', () => {
    expect(Q.get('UN-04').options.map((o: any) => o.label).slice(0, 4)).toEqual(['More than 90%', '85-90%', '70-84%', 'Below 70%, or not measured']);
    expect(Q.get('QV-01').options.map((o: any) => o.label).slice(0, 4)).toEqual(['Within plus or minus 5%', '5-10%', '10-20%', 'More than 20%, or no forecast']);
  });
});

/* -------------------------------- Rating rule ------------------------------- */

describe('FinOps IQ v3 rating rule (DESIGN.md 3.3)', () => {
  const a = (level: AnswerLevel, core = true) => ({ level, core });

  it('takes the weakest answered core question', () => {
    expect(rateCapability([a('run'), a('crawl'), a('walk')]).rating).toBe('crawl');
    expect(rateCapability([a('run'), a('run')]).rating).toBe('run');
  });

  it('a lower depth answer lowers the rating by one level only', () => {
    expect(rateCapability([a('run'), a('not_yet', false)])).toMatchObject({ rating: 'walk', coreRating: 'run', loweredByDepth: true });
    expect(rateCapability([a('walk'), a('crawl', false), a('not_yet', false)])).toMatchObject({ rating: 'crawl', loweredByDepth: true });
  });

  it('a depth answer at or above the core level never raises or lowers it', () => {
    expect(rateCapability([a('crawl'), a('run', false)])).toMatchObject({ rating: 'crawl', loweredByDepth: false });
    expect(rateCapability([a('walk'), a('walk', false)])).toMatchObject({ rating: 'walk', loweredByDepth: false });
  });

  it('an Unknown makes the capability Unknown and unconfirmed', () => {
    expect(rateCapability([a('crawl'), a('unknown')])).toMatchObject({ rating: 'unknown', unconfirmed: true });
    expect(rateCapability([a('run'), a('unknown', false)])).toMatchObject({ rating: 'unknown', unconfirmed: true });
    expect(rateCapability([a('unknown')])).toMatchObject({ rating: 'unknown', unconfirmed: true });
  });

  it('unless the known answers already rate it Not yet (then Not yet, partly unconfirmed)', () => {
    expect(rateCapability([a('not_yet'), a('unknown')])).toMatchObject({ rating: 'not_yet', unconfirmed: true });
    expect(rateCapability([a('crawl'), a('not_yet', false), a('unknown', false)])).toMatchObject({ rating: 'not_yet', unconfirmed: true });
  });

  it('no answered core question means not assessed, even with depth answers', () => {
    expect(rateCapability([]).rating).toBe('not_assessed');
    expect(rateCapability([a('run', false)]).rating).toBe('not_assessed');
  });

  it('a capability with no core question for the client rates all its asked questions as core (Licensing & SaaS)', () => {
    const r = run(facts({ scopes: ['public_cloud', 'licensing'] }), { 'OP-13': 'walk', 'OP-14': 'run' });
    expect(cap(r, 'LICENSING_SAAS')).toMatchObject({ rating: 'walk', loweredByDepth: false });
    const low = run(facts({ scopes: ['public_cloud', 'licensing'] }), { 'OP-13': 'run', 'OP-14': 'not_yet' });
    expect(cap(low, 'LICENSING_SAAS').rating).toBe('not_yet');
  });

  it('UN-03 is core for multi-source estates (not limited to one level)', () => {
    const r = run(facts({ publicCloudProviders: ['aws', 'azure'] }), { 'UN-01': 'run', 'UN-03': 'not_yet' });
    expect(cap(r, 'DATA_INGESTION').rating).toBe('not_yet');
  });

  it('Unknown counts as risk: gap as if Not yet, finding unconfirmed with "confirm" as its first action', () => {
    const r = run(facts(), { 'UN-10': 'crawl', 'UN-11': 'unknown' });
    expect(cap(r, 'ANOMALY_MANAGEMENT')).toMatchObject({ rating: 'unknown', gap: 1, unconfirmed: true, atOrAboveTarget: false });
    const f = r.findings.find(x => x.capability === 'ANOMALY_MANAGEMENT')!;
    expect(f).toMatchObject({ unconfirmed: true, current: 'unknown', gap: 1 });
    expect(f.decisionOrAction).toMatch(/^Confirm the current practice/);
  });

  it('a blank is excluded from the rating but keeps the capability from counting at target', () => {
    const r = run(facts(), { 'UN-04': 'run' });
    expect(cap(r, 'ALLOCATION')).toMatchObject({ rating: 'run', complete: false, blank: 1, atOrAboveTarget: false });
    expect(r.coverage.blankQuestions).toContain('UN-05');
    const full = run(facts(), { 'UN-04': 'run', 'UN-05': 'run' });
    expect(cap(full, 'ALLOCATION')).toMatchObject({ rating: 'run', complete: true, atOrAboveTarget: true });
  });
});

/* ------------------------------- Scope triggers ----------------------------- */

describe('FinOps IQ v3 scope triggers (DESIGN.md 4.4 and 7.5)', () => {
  const none = facts({ publicCloudProviders: [], scopes: ['saas'] }, { spend: { byScope: { saas: { exact: 5_000_000 } } } });

  it('public cloud switches on OP-03 and OP-05 to OP-09 and the public cloud levers', () => {
    const on = run(facts(), { 'OP-04': 'not_yet' });
    for (const id of ['OP-03', 'OP-05', 'OP-06', 'OP-07', 'OP-08', 'OP-09', 'VB-01', 'VB-02']) expect(asked(on, id), id).toBe(true);
    expect(on.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toEqual(['LEV-02', 'LEV-03', 'LEV-04', 'LEV-05', 'LEV-08']);
    const off = run(none, { 'OP-04': 'not_yet' });
    for (const id of ['OP-03', 'OP-05', 'OP-06', 'OP-07', 'OP-08', 'OP-09', 'VB-01', 'VB-02']) expect(asked(off, id), id).toBe(false);
    expect(off.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toEqual([]);
  });

  it('two or more providers, or public cloud with private cloud or a data centre, make UN-03 core', () => {
    expect(asked(run(facts({ publicCloudProviders: ['aws', 'gcp'] })), 'UN-03')).toBe(true);
    expect(asked(run(facts({ scopes: ['public_cloud', 'data_centre'] })), 'UN-03')).toBe(true);
    expect(asked(run(facts()), 'UN-03')).toBe(false);
    expect(asked(run(facts({ publicCloudProviders: [], scopes: ['data_centre'] })), 'UN-03')).toBe(false);
  });

  it('Kubernetes switches on UN-09, OP-11, VB-06 and LEV-07', () => {
    const on = run(facts({ scopes: ['public_cloud', 'kubernetes'] }), { 'OP-04': 'not_yet' });
    for (const id of ['UN-09', 'OP-11', 'VB-06']) expect(asked(on, id), id).toBe(true);
    expect(on.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toContain('LEV-07');
    const off = run(facts(), { 'OP-04': 'not_yet' });
    for (const id of ['UN-09', 'OP-11', 'VB-06']) expect(asked(off, id), id).toBe(false);
    expect(off.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!.leverIds).not.toContain('LEV-07');
  });

  it('AI APIs or AI platforms switch on OP-12, QV-07, VB-07 and LEV-10', () => {
    for (const scope of ['ai_api', 'ai_platform_gpu']) {
      const on = run(facts({ scopes: ['public_cloud', scope] }), { 'OP-04': 'not_yet' });
      for (const id of ['OP-12', 'QV-07', 'VB-07']) expect(asked(on, id), `${scope} ${id}`).toBe(true);
      expect(on.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toContain('LEV-10');
    }
    const off = run(facts());
    for (const id of ['OP-12', 'QV-07', 'VB-07']) expect(asked(off, id), id).toBe(false);
  });

  it('SaaS or licensing puts Licensing & SaaS in scope with OP-13 and LEV-09; OP-14 needs licensing', () => {
    const saas = run(facts({ scopes: ['public_cloud', 'saas'] }), { 'OP-13': 'not_yet' });
    expect(cap(saas, 'LICENSING_SAAS').rating).toBe('not_yet');
    expect([asked(saas, 'OP-13'), asked(saas, 'OP-14'), asked(saas, 'VB-08')]).toEqual([true, false, true]);
    expect(saas.findings.find(f => f.capability === 'LICENSING_SAAS')!.leverIds).toEqual(['LEV-09']);
    const lic = run(facts({ scopes: ['public_cloud', 'licensing'] }));
    expect([asked(lic, 'OP-13'), asked(lic, 'OP-14')]).toEqual([true, true]);
    const off = run(facts(), { 'OP-13': 'run' });
    expect(cap(off, 'LICENSING_SAAS').rating).toBe('not_in_scope');
    expect(off.coverage.ignoredAnswers).toEqual(['OP-13']);
  });

  it('private cloud, data centre or colocation put Sustainability in scope and ask UN-02 and OP-15', () => {
    for (const scope of ['private_cloud', 'data_centre', 'colocation']) {
      const on = run(facts({ scopes: ['public_cloud', scope] }), { 'OP-15': 'crawl' });
      expect(cap(on, 'SUSTAINABILITY').rating, scope).toBe('crawl');
      expect([asked(on, 'UN-02'), asked(on, 'OP-15')], scope).toEqual([true, true]);
    }
    const off = run(facts(), { 'OP-15': 'crawl', 'UN-02': 'not_yet', 'UN-01': 'run' });
    expect(cap(off, 'SUSTAINABILITY').rating).toBe('not_in_scope');
    expect(cap(off, 'DATA_INGESTION').rating).toBe('run');
    expect(off.coverage.ignoredAnswers.sort()).toEqual(['OP-15', 'UN-02']);
  });

  it('OP-02 follows unknown or low commitment coverage, or OP-01 at Crawl or below (THR-FIN-03)', () => {
    const withCoverage = (c: any) => facts({}, { base: { eligibleCoverage: c } });
    expect(asked(run(facts(), { 'OP-01': 'run' }), 'OP-02')).toBe(true); // coverage not given = unknown
    expect(asked(run(withCoverage({ unknown: true }), { 'OP-01': 'run' }), 'OP-02')).toBe(true);
    expect(asked(run(withCoverage({ band: [0.25, 0.49] }), { 'OP-01': 'run' }), 'OP-02')).toBe(true);
    expect(asked(run(withCoverage({ exact: 0.8 }), { 'OP-01': 'crawl' }), 'OP-02')).toBe(true);
    expect(asked(run(withCoverage({ exact: 0.8 }), { 'OP-01': 'unknown' }), 'OP-02')).toBe(true);
    expect(asked(run(withCoverage({ exact: 0.8 }), { 'OP-01': 'walk' }), 'OP-02')).toBe(false);
    expect(asked(run(withCoverage({ exact: 0.5 })), 'OP-02')).toBe(false);
  });

  it('QV-06 follows allocation at Walk or better', () => {
    expect(asked(run(facts(), { 'UN-04': 'walk' }), 'QV-06')).toBe(true);
    expect(asked(run(facts(), { 'UN-04': 'run' }), 'QV-06')).toBe(true);
    expect(asked(run(facts(), { 'UN-04': 'crawl' }), 'QV-06')).toBe(false);
    expect(asked(run(facts(), { 'UN-04': 'unknown' }), 'QV-06')).toBe(false);
    // An answer to a follow-up that did not fire is ignored, not scored.
    const r = run(facts(), { 'UN-04': 'crawl', 'QV-05': 'run', 'QV-06': 'not_yet' });
    expect(cap(r, 'UNIT_ECONOMICS').rating).toBe('run');
    expect(r.coverage.ignoredAnswers).toEqual(['QV-06']);
  });

  it('VB-05 follows OP-04 or OP-05 at Walk or below; VB-03 follows an OP-06 or OP-08 answer', () => {
    expect(asked(run(facts(), { 'OP-04': 'walk', 'OP-05': 'run' }), 'VB-05')).toBe(true);
    expect(asked(run(facts(), { 'OP-04': 'run', 'OP-05': 'run' }), 'VB-05')).toBe(false);
    expect(asked(run(facts(), { 'OP-06': 'run' }), 'VB-03')).toBe(true);
    expect(asked(run(facts(), {}), 'VB-03')).toBe(false);
  });

  it('the executive mode asks only the executive set and rates the other capabilities in the workshop', () => {
    const r = run(facts({ scopes: ['public_cloud', 'kubernetes', 'data_centre'] }), {}, 'executive');
    expect(r.questions.asked).toEqual(B.executiveSet);
    expect(cap(r, 'DATA_INGESTION')).toMatchObject({ rating: 'not_assessed', assessedIn: 'workshop', atOrAboveTarget: null });
    expect(cap(r, 'SUSTAINABILITY')).toMatchObject({ rating: 'not_assessed', assessedIn: 'workshop' });
    expect(cap(r, 'LICENSING_SAAS').rating).toBe('not_in_scope');
  });

  it('the complexity tier applies the materiality tests when the inputs exist (THR-FIN-12)', () => {
    const k8s = (spend: number) => complexityTier(facts({ scopes: ['public_cloud', 'kubernetes'] }, { base: { kubernetesSpend: { exact: spend }, computeShare: { exact: 0.5 } } }));
    expect(k8s(1_500_000).trace).toContain('kubernetes_material -> +1'); // 15% of compute
    expect(k8s(500_000).trace).not.toContain('kubernetes_material -> +1'); // 5% of compute
    expect(complexityTier(facts({ scopes: ['public_cloud', 'kubernetes'] })).trace).toContain('kubernetes_material -> +1'); // no inputs: material
    const api = (spend: number) => complexityTier(facts({ scopes: ['public_cloud', 'ai_api'] }, { spend: { byScope: { aws: { exact: 20_000_000 }, ai_api: { exact: spend } } } }));
    expect(api(2_000_000).trace).toContain('ai_material -> +1');
    expect(api(200_000).trace).not.toContain('ai_material -> +1');
  });

  it('places the tier by points, converts spend only with the tier FX rate, and honours a consultant override', () => {
    expect(complexityTier(facts()).tier).toBe(1); // USD 20M -> 2 points
    const big = facts({ publicCloudProviders: ['aws', 'azure', 'gcp'] }, { org: { currency: 'EUR', tierFxRate: 1.1, consumingUnits: '20+' } });
    expect(complexityTier(big)).toMatchObject({ tier: 2, points: 2 + 2 + 1 }); // EUR 20M = USD 22M, three providers, 20+ units
    expect(complexityTier({ ...big, org: { currency: 'EUR' } }).trace[0]).toMatch(/not converted/);
    const over = complexityTier({ ...facts(), consultant: { complexityTierOverride: 3, overrideReason: 'Regulated, many entities' } });
    expect(over).toMatchObject({ tier: 3, override: true });
  });

  it('a consultant target override is used and recorded; with no default target the finding is Low', () => {
    const tier1 = facts({}, { spend: { byScope: { aws: { exact: 500_000 } } } });
    const r = run(tier1, { 'QV-05': 'not_yet', 'MP-09': 'not_yet', 'MP-10': 'not_yet' }, 'workshop', {
      targetOverrides: [{ capability: 'UNIT_ECONOMICS', level: 'walk', reason: 'Board asked for cost per customer' }]
    });
    expect(cap(r, 'UNIT_ECONOMICS').target).toEqual({ level: 'walk', source: 'consultant_override', reason: 'Board asked for cost per customer' });
    expect(r.findings.find(f => f.capability === 'UNIT_ECONOMICS')).toMatchObject({ severity: 'Low', severityTrace: ['scope_low'], timeFrame: '12-24 months', targetSource: 'consultant_override' });
    expect(cap(r, 'INVOICING_CHARGEBACK')).toMatchObject({ target: { level: null }, gap: null, atOrAboveTarget: false });
    expect(r.findings.find(f => f.capability === 'INVOICING_CHARGEBACK')).toBeUndefined();
  });

  it('an unconfirmed Cost IQ pre-fill counts as blank until confirmed (DESIGN.md 2.3)', () => {
    const answers = { 'MP-01': 'run', 'MP-02': 'run', 'MP-03': 'run' };
    const pre = run(facts(), answers, 'workshop', { prefilled: ['MP-01'] });
    expect(pre.coverage.unconfirmedPrefill).toEqual(['MP-01']);
    expect(cap(pre, 'FINOPS_PRACTICE_OPERATIONS')).toMatchObject({ answered: 2, complete: false, atOrAboveTarget: false });
    const ok = run(facts(), answers, 'workshop', { prefilled: ['MP-01'], prefillConfirmed: ['MP-01'] });
    expect(cap(ok, 'FINOPS_PRACTICE_OPERATIONS')).toMatchObject({ answered: 3, complete: true });
  });
});

/* --------------------------------- Findings --------------------------------- */

describe('FinOps IQ v3 findings (DESIGN.md 5)', () => {
  const allNotYet = Object.fromEntries(MATURITY.map(q => [q.id, answerFor(q.id, 'not_yet')]));
  const big = facts({ publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'kubernetes', 'saas', 'data_centre'] },
    { org: { currency: 'USD', consumingUnits: '20+' }, spend: { byScope: { aws: { exact: 60_000_000 }, azure: { exact: 30_000_000 } } } });
  const r = run(big, allNotYet);

  it('come from gaps only, one per capability below target, and validate against finding.schema.json', () => {
    const valid = validator('urn:ltm:finops-iq:v3:finding');
    expect(r.findings.map(f => f.capability).sort()).toEqual(r.capabilities.filter(c => (c.gap ?? 0) >= 1).map(c => c.capability).sort());
    for (const f of r.findings) expect(valid(f), `${f.id}: ${JSON.stringify(valid.errors)}`).toBe(true);
    expect(run(big, Object.fromEntries(MATURITY.map(q => [q.id, answerFor(q.id, 'run')]))).findings).toEqual([]);
  });

  it('sets severity from the gap with the foundation uplift at Tier 2 and 3, and the time frame from severity', () => {
    expect(r.tier.tier).toBe(3);
    const di = r.findings.find(f => f.capability === 'DATA_INGESTION')!;
    expect(di).toMatchObject({ gap: 3, severity: 'Critical', severityTrace: ['gap_3'], timeFrame: '0-3 months', ownerRole: 'Head of Cloud / CCoE' });
    const kpi = r.findings.find(f => f.capability === 'KPIS_BENCHMARKING')!;
    expect(kpi).toMatchObject({ gap: 2, severity: 'High', severityTrace: ['gap_2'], timeFrame: '3-6 months' });
    const t2 = run(facts({}, { org: { currency: 'USD', consumingUnits: '5-19' }, spend: { byScope: { aws: { exact: 20_000_000 } } } }), { 'UN-04': 'crawl', 'UN-05': 'crawl', 'OP-04': 'crawl' });
    expect(t2.tier.tier).toBe(2);
    expect(t2.findings.find(f => f.capability === 'ALLOCATION')).toMatchObject({ severity: 'High', severityTrace: ['gap_1', 'foundation_uplift'] });
    expect(t2.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')).toMatchObject({ severity: 'Medium', severityTrace: ['gap_1'] });
  });

  it('orders waves by dependency: Data Ingestion before Anomaly Management, Allocation before Unit Economics', () => {
    const byCap = new Map(r.findings.map(f => [f.capability, f]));
    expect(byCap.get('ANOMALY_MANAGEMENT')!.dependsOn).toEqual(['F-FIN-DATA_INGESTION']);
    expect(byCap.get('UNIT_ECONOMICS')!.dependsOn).toEqual(['F-FIN-ALLOCATION']);
    expect(byCap.get('INVOICING_CHARGEBACK')!.dependsOn).toEqual(['F-FIN-ALLOCATION']);
    for (const f of r.findings) for (const d of f.dependsOn) expect(f.wave, `${f.id} after ${d}`).toBeGreaterThanOrEqual(r.findings.find(x => x.id === d)!.wave);
    expect(byCap.get('DATA_INGESTION')!.wave).toBe(1);
    expect(byCap.get('UNIT_ECONOMICS')!.wave).toBe(3);
  });

  it('link levers in scope and carry offerings, owner role and claim IDs', () => {
    const usage = r.findings.find(f => f.capability === 'USAGE_OPTIMIZATION')!;
    expect(usage.leverIds).toEqual(['LEV-02', 'LEV-03', 'LEV-04', 'LEV-05', 'LEV-07', 'LEV-08']);
    expect(r.findings.find(f => f.capability === 'RATE_OPTIMIZATION')!.leverIds).toEqual(['LEV-01', 'LEV-06']);
    for (const f of r.findings) {
      expect(f.offeringIds.length, f.id).toBeGreaterThan(0);
      expect(f.ownerRole, f.id).toBe(R.ownerRoles.byCapability[f.capability]);
    }
  });

  it('are sorted by severity, wave and gap, and the executive view shows the top five', () => {
    const sev = ['Critical', 'High', 'Medium', 'Low'];
    for (let i = 1; i < r.findings.length; i++) {
      const [a, b] = [r.findings[i - 1], r.findings[i]];
      expect(sev.indexOf(a.severity) < sev.indexOf(b.severity) || (a.severity === b.severity && (a.wave < b.wave || (a.wave === b.wave && a.gap >= b.gap)))).toBe(true);
    }
    expect(r.topFindingIds).toEqual(r.findings.slice(0, 5).map(f => f.id));
  });
});

/* ------------------------------- Need verdict ------------------------------- */

describe('FinOps IQ v3 need verdict (DESIGN.md 9, executive mode)', () => {
  const exec = (answers: Record<string, any>, f: Facts = facts()) => run(f, answers, 'executive').needVerdict!;
  const allExec = (level: AnswerLevel) => Object.fromEntries(MATURITY.filter(q => B.executiveSet.includes(q.id)).map(q => [q.id, level]));

  it('is computed in executive mode only', () => {
    expect(run(facts(), {}, 'workshop').needVerdict).toBeNull();
    expect(run(facts(), {}, 'executive').needVerdict).not.toBeNull();
  });

  it('counts blanks as the maximum gap, so a blank never lowers need, and lowers confidence', () => {
    const blank = exec({});
    expect(blank.baseIndex).toBeGreaterThan(exec(allExec('run')).baseIndex);
    expect(blank.confidence).toBe('Low');
    expect(exec(allExec('run'))).toMatchObject({ baseIndex: 0, needIndex: 0, band: 'lightweight', confidence: 'Medium' });
  });

  it('adds the urgency modifiers: tier, growth of 20% or more, AI in scope or 25% still to move', () => {
    const f = facts({ scopes: ['public_cloud', 'ai_api'] }, { org: { currency: 'USD', consumingUnits: '20+' }, spend: { byScope: { aws: { exact: 60_000_000 } }, growth12m: 25 } });
    const v = exec(allExec('run'), f);
    expect(v.modifiers.map(m => m.id)).toEqual(['tier_2', 'growth_ge_20pct', 'migration_or_ai']);
    expect(v.needIndex).toBe(30);
    expect(v.pending).toEqual([{ id: 'expected_value_ge_5pct_of_P', reason: 'needs the value model (F4)' }]);
    const moving = exec(allExec('run'), facts({ migration: { remainingShare24m: { exact: 0.3 } } }));
    expect(moving.modifiers.map(m => m.id)).toEqual(['migration_or_ai']);
  });

  it('uses the register bands with Q14\'s reworded 26-50 band, and never shows money', () => {
    expect(R.needVerdict.bands.map((b: any) => b.label)).toEqual(['Lightweight practices sufficient at current scale', 'Targeted improvements needed now', 'Material exposure: act this year', 'Act now']);
    expect(CLAIMS.get('CLM-FIN-127').statement).toContain("26-50 'Targeted improvements needed now'");
    const tier3 = facts({ publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'saas'] }, { org: { currency: 'USD', consumingUnits: '20+' }, spend: { byScope: { aws: { exact: 60_000_000 } } } });
    const worst = exec(allExec('not_yet'), tier3);
    expect(worst).toMatchObject({ baseIndex: 91.7, needIndex: 100, band: 'act_now', bandLabel: 'Act now' });
    expect(exec(allExec('not_yet'))).toMatchObject({ baseIndex: 33.3, band: 'foundations', bandLabel: 'Targeted improvements needed now' });
    expect(JSON.stringify(worst)).not.toMatch(/[$£€]|USD|EUR|GBP/);
  });

  it('Unknown counts as the maximum gap and is a blind spot', () => {
    const v = exec({ ...allExec('run'), 'QV-01': 'unknown' });
    expect(v.baseIndex).toBeCloseTo(100 / 3 / 7, 1); // Tier 1: Forecasting target Crawl, gap 1 of 3, over 7 capabilities with a target
    expect(v.blindSpots).toContainEqual({ questionId: 'QV-01', capability: 'FORECASTING', reason: 'unknown' });
    expect(v.confidence).toBe('Low');
  });
});

/* -------------------------------- Invariants -------------------------------- */

const ORDER: AnswerLevel[] = ['unknown', 'not_yet', 'crawl', 'walk', 'run'];
/** Questions whose answer can trigger another question (DESIGN.md 7.5): they may move a second capability by design. */
const TRIGGER_SOURCES = new Set<string>(JSON.stringify(QUESTIONS.map(q => q.askWhen ?? null)).match(/"answer":"[A-Z]{2}-\d{2}"/g)!.map(m => m.slice(10, 15)));

function walk(v: any, path: string, visit: (path: string, v: any) => void) {
  visit(path, v);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, visit));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, visit);
}
const effective = (r: FinOpsIqV3Result, id: string) => { const c = cap(r, id); return c.complete ? ratingIndex(c.rating) : 0; };

describe('FinOps IQ v3 invariants (random questionnaires, both modes)', () => {
  const runs = (['executive', 'workshop'] as Mode[]).flatMap(mode =>
    Array.from({ length: 150 }, (_, i) => ({ mode, seed: 9000 + i, input: randomInput(9000 + i, mode) })))
    .map(x => ({ ...x, r: evaluateFinOpsIqV3(x.input) }));

  it('never returns NaN, Infinity or undefined', () => {
    for (const { mode, seed, r } of runs) {
      const bad: string[] = [];
      walk(r, 'result', (p, v) => { if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) bad.push(p); });
      expect(bad, `${mode} seed ${seed}`).toEqual([]);
    }
  });

  it('a better answer never lowers its capability (Unknown ranks lowest)', () => {
    for (const { mode, seed, input, r } of runs.slice(0, 60).concat(runs.slice(150, 210))) {
      for (const id of r.questions.asked.filter(x => Q.get(x).kind === 'maturity')) {
        const c = Q.get(id).capability;
        const idx = ORDER.map(level => ratingIndex(cap(evaluateFinOpsIqV3({ ...input, answers: { ...input.answers, [id]: answerFor(id, level) } }), c).rating));
        for (let i = 1; i < idx.length; i++) expect(idx[i], `${mode} seed ${seed} ${id}: ${idx}`).toBeGreaterThanOrEqual(idx[i - 1]);
      }
    }
  }, 300_000);

  it('a blank never scores better than any answered option (capability, headline and need index)', () => {
    for (const { mode, seed, input, r } of runs.slice(0, 40).concat(runs.slice(150, 190))) {
      for (const id of r.questions.asked.filter(x => Q.get(x).kind === 'maturity')) {
        const c = Q.get(id).capability;
        const { [id]: _, ...rest } = input.answers;
        const blank = evaluateFinOpsIqV3({ ...input, answers: rest });
        for (const level of ORDER) {
          const a = evaluateFinOpsIqV3({ ...input, answers: { ...rest, [id]: answerFor(id, level) } });
          const msg = `${mode} seed ${seed} ${id}=${level}`;
          expect(effective(blank, c), msg).toBeLessThanOrEqual(effective(a, c));
          if (!TRIGGER_SOURCES.has(id)) expect(blank.headline.atOrAboveTarget, msg).toBeLessThanOrEqual(a.headline.atOrAboveTarget);
          if (mode === 'executive') expect(blank.needVerdict!.needIndex, msg).toBeGreaterThanOrEqual(a.needVerdict!.needIndex);
        }
      }
    }
  }, 300_000);

  it('every client-visible string carries claim IDs that exist in the register and are client-visible', () => {
    const TEXT = ['title', 'businessConsequence', 'decisionOrAction', 'statement', 'bandLabel', 'basisLine', 'ratingLabel', 'displayName', 'note', 'evidenceToConfirm'];
    for (const { mode, seed, r } of runs.slice(0, 50).concat(runs.slice(150, 200))) {
      walk({ ...r, conflicts: [] }, 'result', (p, v) => {
        if (!v || typeof v !== 'object' || Array.isArray(v) || !TEXT.some(k => typeof v[k] === 'string')) return;
        const ids: string[] = [...(v.claimIds ?? []), ...(v.basis ?? []).map((b: any) => b.claimId).filter(Boolean)];
        expect(ids.length, `${mode} seed ${seed} ${p}`).toBeGreaterThan(0);
        for (const id of ids) {
          expect(CLAIMS.has(id), `${p} cites ${id}`).toBe(true);
          expect(CLAIMS.get(id).clientVisible, `${p} cites consultant-only ${id}`).toBe(true);
        }
        for (const k of TEXT) if (typeof v[k] === 'string') for (const re of BANNED) expect(v[k], `${p}.${k}`).not.toMatch(re);
      });
      for (const c of r.conflicts) for (const id of c.probe.match(/CLM-FIN-\d{3}/g)!) expect(CLAIMS.has(id), c.id).toBe(true);
      for (const id of [...r.tier.claimIds, ...r.coverage.claimIds, ...r.hypotheses.claimIds]) expect(CLAIMS.has(id), id).toBe(true);
    }
 }, 120_000);

  it('profiles validate against capability.schema.json and coverage adds up', () => {
    const valid = AJV.compile({ $ref: 'urn:ltm:finops-iq:v3:capability#/$defs/capabilityResult' });
    for (const { mode, seed, r } of runs.slice(0, 30).concat(runs.slice(150, 180))) {
      for (const c of r.capabilities) {
        const { capability, rating, coreRating, loweredByDepth, target, gap, atOrAboveTarget, unconfirmed, asked: n, answered } = c;
        const view = { capability, rating, coreRating, loweredByDepth, target, gap, unconfirmed, asked: n, answered, mode, ...(atOrAboveTarget === null ? {} : { atOrAboveTarget }) };
        expect(valid(view), `${mode} seed ${seed} ${capability}: ${JSON.stringify(valid.errors)}`).toBe(true);
      }
      const cv = r.coverage;
      expect(cv.answered + cv.blank, `${mode} seed ${seed}`).toBe(cv.asked);
      expect(cv.blankQuestions.length).toBe(cv.blank);
      expect(cv.unknownQuestions.length).toBe(cv.unknown);
    }
  });

  it('removed v2 behaviour stays removed: no stages, stage value bands, archetypes or money, and HY-01 moves nothing', () => {
    for (const { mode, seed, input, r } of runs.slice(0, 40).concat(runs.slice(150, 190))) {
      expect(JSON.stringify(r), `${mode} seed ${seed}`).not.toMatch(/"(maturityStage|stageScores|stageStatuses|valueAtStake|archetype|wasteBand|exposure|savings\w*)"/);
      for (const band of ['lt_5', 'ge_30', 'dont_know']) {
        const other = evaluateFinOpsIqV3({ ...input, answers: { ...input.answers, 'HY-01': band } });
        expect({ ...other, hypotheses: null }, `${mode} seed ${seed} HY-01=${band}`).toEqual({ ...r, hypotheses: null });
      }
    }
  });
});

/* --------------------------- Reference scenarios ---------------------------- */

/**
 * Differences between the engine and the scenarios' hand-written expectations, each justified in
 * docs/cio-readiness/finops-iq/design/F3-scenario-diffs.md. Everything not listed must match exactly.
 */
const RECORDED = {
  /** D1: lever and decision findings carry or depend on value (F4); F3 builds capability-gap findings only. */
  deferredFindings: { RS1: ['F-FIN-LEV-04', 'F-FIN-LEV-01'], RS2: [], RS3: ['F-FIN-DECISION-02'], RS4: ['F-FIN-DECISION-01'], RS5: ['F-FIN-DECISION-01', 'F-FIN-LEV-01'] } as Record<string, string[]>,
  /** D1: findings counted in findingCount but not itemised in topFindings (RS2: one lever, scope or decision finding). */
  unlistedDeferred: { RS2: 1 } as Record<string, number>,
  /** D2: the value uplift (THR-FIN-13) needs the value model, so these read one severity lower in F3. */
  valueUplift: { RS1: ['F-FIN-USAGE_OPTIMIZATION'], RS3: ['F-FIN-USAGE_OPTIMIZATION', 'F-FIN-RATE_OPTIMIZATION'], RS5: ['F-FIN-USAGE_OPTIMIZATION'] } as Record<string, string[]>,
  /** D3: the need index's "expected value at least 5% of P" modifier needs the value model. */
  pendingModifier: 'expected_value_ge_5pct_of_P',
  /** D4: Q14 rewording adopted in F2 (THR-FIN-14, CLM-FIN-127) after the scenarios were written. */
  bandLabel: { from: 'Establish foundations now', to: 'Targeted improvements needed now' }
};
const SEV = ['Low', 'Medium', 'High', 'Critical'];
/** The severity the ASM-FIN-005 steps give without the value uplift (step 3). */
function withoutValueUplift(x: any) {
  const severityTrace = x.severityTrace.filter((t: string) => t !== 'value_uplift');
  let i = SEV.indexOf(R.severity.byGap[String(x.gap)]);
  if (severityTrace.includes('foundation_uplift')) i = Math.min(3, i + 1);
  return { severity: SEV[i], severityTrace, timeFrame: R.severity.timeFrames[SEV[i]] };
}

function goldenView(r: FinOpsIqV3Result) {
  return {
    versions: r.versions,
    tier: { tier: r.tier.tier, points: r.tier.points, trace: r.tier.trace },
    asked: r.questions.asked.length,
    profile: Object.fromEntries(r.capabilities.map(c => [c.capability,
      `${c.rating}${c.loweredByDepth ? ' (lowered)' : ''} / ${c.target.level ?? '-'} / ${c.gap ?? '-'}${c.atOrAboveTarget ? ' / at target' : ''}${c.unconfirmed ? ' / unconfirmed' : ''}${c.complete ? '' : ' / incomplete'}${c.assessedIn ? ' / workshop' : ''}`])),
    headline: { atOrAboveTarget: r.headline.atOrAboveTarget, inScope: r.headline.inScope, assessed: r.headline.assessed, statement: r.headline.statement },
    findings: r.findings.map(f => `${f.id} ${f.severity} [${f.severityTrace}] wave ${f.wave}${f.dependsOn.length ? ` after ${f.dependsOn}` : ''} | ${f.ownerRole} | ${f.timeFrame} | levers ${f.leverIds.join(',') || '-'} | offerings ${f.offeringIds.join(',')}${f.unconfirmed ? ' | unconfirmed' : ''}`),
    topFindingIds: r.topFindingIds,
    needVerdict: r.needVerdict && { ...r.needVerdict, claimIds: undefined },
    coverage: { ...r.coverage, claimIds: undefined },
    conflicts: r.conflicts.map(c => c.id)
  };
}

describe('FinOps IQ v3 reference scenarios against their written expectations', () => {
  for (const s of SCENARIOS) {
    describe(s.id, () => {
      const r = evaluateFinOpsIqV3(scenarioInput(s));
      const e = s.expected;

      it('tier, capability profile and headline match exactly', () => {
        expect({ tier: r.tier.tier, points: r.tier.points }).toEqual({ tier: e.tier.tier, points: e.tier.points });
        for (const [id, x] of Object.entries<any>(e.capabilityProfile)) {
          const c = cap(r, id);
          expect(c.rating, id).toBe(x.rating);
          if ('target' in x) expect(c.target.level, id).toBe(x.target);
          if ('gap' in x) expect(c.gap, id).toBe(x.gap);
          if ('atOrAboveTarget' in x) expect(c.atOrAboveTarget, id).toBe(x.atOrAboveTarget);
        }
        expect(r.headline).toMatchObject({ atOrAboveTarget: e.headline.atOrAboveTarget, inScope: e.headline.inScope, assessed: e.headline.assessed, statement: e.headline.statement });
      });

      it('capability-gap findings match, apart from the recorded differences', () => {
        const deferred = RECORDED.deferredFindings[s.id];
        const uplift = RECORDED.valueUplift[s.id] ?? [];
        for (const x of e.topFindings) {
          const f = r.findings.find(y => y.id === x.id);
          if (deferred.includes(x.id)) { expect(f, `${x.id} is deferred to F4`).toBeUndefined(); expect(['lever_opportunity', 'decision']).toContain(x.type); continue; }
          expect(f, x.id).toBeDefined();
          expect(x.type).toBe('capability_gap');
          const want = uplift.includes(x.id) ? withoutValueUplift(x) : { severity: x.severity, severityTrace: x.severityTrace, timeFrame: x.timeFrame };
          if (uplift.includes(x.id)) expect(x.severityTrace, x.id).toContain('value_uplift');
          expect(f, x.id).toMatchObject({ capability: x.capability, current: x.current, target: x.target, gap: x.gap, ownerRole: x.ownerRole, wave: x.wave, ...want, ...(x.unconfirmed ? { unconfirmed: true } : {}) });
          for (const o of x.offeringIds) expect(f!.offeringIds, `${x.id} offering ${o}`).toContain(o);
          for (const l of x.leverIds ?? []) expect(f!.leverIds, `${x.id} lever ${l}`).toContain(l);
        }
        expect(r.findings.length).toBe(e.findingCount - deferred.length - (RECORDED.unlistedDeferred[s.id] ?? 0));
      });

      it('top findings keep the written order where no value-dependent difference applies', () => {
        const expectedIds = e.topFindings.map((x: any) => x.id).filter((id: string) => !RECORDED.deferredFindings[s.id].includes(id));
        if (RECORDED.valueUplift[s.id]) return;
        expect(r.findings.slice(0, expectedIds.length).map(f => f.id)).toEqual(expectedIds);
      });

      if (e.needVerdict) it('need verdict matches, apart from the value modifier and the reworded band', () => {
        const v = r.needVerdict!;
        const pending = e.needVerdict.modifiers.find((m: any) => m.id === RECORDED.pendingModifier);
        expect(v.baseIndex).toBe(e.needVerdict.baseIndex);
        expect(v.modifiers).toEqual(e.needVerdict.modifiers.filter((m: any) => m.id !== RECORDED.pendingModifier));
        expect(v.needIndex).toBeCloseTo(e.needVerdict.needIndex - (pending?.points ?? 0), 5);
        expect(v.band).toBe(e.needVerdict.band);
        expect(e.needVerdict.bandLabel).toBe(RECORDED.bandLabel.from);
        expect(v.bandLabel).toBe(RECORDED.bandLabel.to);
        expect(v.confidence).toBe(e.needVerdict.confidence);
      });
      else it('has no need verdict (workshop)', () => expect(r.needVerdict).toBeNull());
    });
  }
});

describe('FinOps IQ v3 golden outputs (approved)', () => {
  const inputs: Record<string, FinOpsIqV3Input> = Object.fromEntries(SCENARIOS.map(s => [s.id, scenarioInput(s)]));
  inputs['unanswered-executive'] = { mode: 'executive', facts: facts(), answers: {} };
  inputs['unanswered-workshop'] = { mode: 'workshop', facts: facts({ scopes: ['public_cloud', 'kubernetes', 'saas'] }), answers: {} };
  inputs['all-run-workshop'] = { mode: 'workshop', facts: SCENARIOS[3].inputs.facts, answers: Object.fromEntries(MATURITY.map(q => [q.id, answerFor(q.id, 'run')])) };
  const file = join(__dirname, 'golden/finops-iq-v3.json');
  const actual = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, JSON.parse(JSON.stringify(goldenView(evaluateFinOpsIqV3(i))))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(inputs)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));

  it('the workshop asks 64 questions (41 maturity) for the Tier 2 reference estate RS3', () => {
    const r = evaluateFinOpsIqV3(inputs.RS3);
    expect([r.questions.asked.length, r.coverage.asked]).toEqual([64, 41]);
  });
});

/* ------------------------------ Legacy coverage ----------------------------- */

describe('FinOps IQ v3 keeps every legacy question (DESIGN.md section 8)', () => {
  const section8 = DESIGN.slice(DESIGN.indexOf('## 8. Old-to-new question map'), DESIGN.indexOf('## 9. Need verdict'));
  const legacyIds = (prefix: string) => [...section8.matchAll(new RegExp(`^\\| (${prefix}\\.[A-Z]\\d+) \\|`, 'gm'))].map(m => m[1]);
  const mapped = new Map<string, string[]>();
  for (const q of QUESTIONS) for (const l of q.legacy) mapped.set(l.id, [...(mapped.get(l.id) ?? []), q.id]);
  const retired = new Map<string, any>(R.retiredLegacy.map((x: any) => [x.id, x]));

  it('finds all 44 FinOps IQ and 29 FinOps Value Case questions in the map', () => {
    expect(legacyIds('FIQ').length).toBe(44);
    expect(legacyIds('FVC').length).toBe(29);
  });

  it('maps each to a v3 question named in DESIGN.md, or to a recorded moved/dropped reason', () => {
    for (const id of [...legacyIds('FIQ'), ...legacyIds('FVC')]) {
      const row = section8.split('\n').find(l => l.startsWith(`| ${id} |`))!;
      const named = (row.split('|')[4].match(/(SC|VB|UN|QV|OP|MP|HY)-\d{2}/g) ?? []);
      if (!named.length) {
        expect(retired.get(id)?.reason, `${id} has neither a v3 question nor a recorded reason`).toBeTruthy();
        continue;
      }
      expect(mapped.get(id)?.sort(), id).toEqual([...new Set(named)].sort());
    }
  });

  it('records the reason on every merged, split, rewritten or moved mapping', () => {
    for (const q of QUESTIONS) for (const l of q.legacy) if (l.disposition !== 'kept' && l.disposition !== 'merged') expect(l.note, `${q.id} ${l.id}`).toBeTruthy();
  });
});
