/**
 * FinOps IQ v3 (plan phases F3 and F4): contract, rating rule, scope triggers, invariants, golden outputs for the five
 * reference scenarios (docs/cio-readiness/finops-iq/design/reference-scenarios.json) and legacy question coverage.
 * The value model's own tests (reconciliation, inflation guard, trace, assumption register) are in finops-iq-v3-value.test.ts.
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run finops-iq-v3, then have the FinOps lead
 * review the golden diff. Differences from the scenarios' hand-written expectations are recorded in
 * docs/cio-readiness/finops-iq/design/F3-scenario-diffs.md and F4-scenario-diffs.md, and mirrored in RECORDED below.
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
import valueRules from '../src/accelerators/finops-iq/v3/value-rules.json' with { type: 'json' };
import capabilityModel from '../src/accelerators/finops-iq/registry/capabilities.json' with { type: 'json' };
import register from '../src/claims/claims-register.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs');
const DESIGN_DIR = join(__dirname, '../../../docs/cio-readiness/finops-iq/design');
const SCENARIOS: any[] = JSON.parse(readFileSync(join(DESIGN_DIR, 'reference-scenarios.json'), 'utf8')).scenarios;
const DESIGN = readFileSync(join(DESIGN_DIR, 'DESIGN.md'), 'utf8');
const B: any = bank;
const R: any = rules;
const VR: any = valueRules;
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
  // The scenarios were written on 14 Oct 2026; provider-tool exports are checked for age against that date (THR-FIN-11).
  return { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: '2026-10-14' };
}

const facts = (over: Partial<Facts['footprint']> = {}, extra: Partial<Facts> = {}): Facts => ({
  org: { currency: 'USD', consumingUnits: '2-4' },
  footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'], ...over },
  spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 },
  ...extra
});
/** Value bases and an internal rate that quantify LEV-01 and LEV-04 at almost no value: nothing left open (D-B). */
const VALUED: Partial<Facts> = {
  base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.6 }, eligibleCoverage: { exact: 0.9 }, nonProdShare: { exact: 0.1 }, nonProdScheduledShare: { exact: 0.9 } },
  cost: { internalRate: { exact: 12_000 } }
};
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
    expect(errors).toContain('answers.UN-04: expected one of run, walk, crawl, below_70, not_yet, unknown');
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
      targetOverrides: [{ capability: 'CLOUD', level: 'sprint', reason: 'short' }, { capability: 'ALLOCATION', level: 'walk', reason: 'Board asked for it' }, { capability: 'ALLOCATION', level: 'run', reason: 'Board asked for it' }], prefilled: ['ZZ-01']
    });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('targetOverrides[0].capability: unknown capability');
    expect(errors).toContain('targetOverrides[0].level: expected one of not_yet, crawl, walk, run');
    expect(errors).toContain('targetOverrides[0].reason: expected a recorded reason');
    expect(errors).toContain('prefilled: expected a list of question ids');
    expect(errors).toContain('targetOverrides[2].capability: ALLOCATION already has a target override');
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

  it('uses the F2 thresholds in the UN-04 and QV-01 options without gaps or overlaps (THR-FIN-01, THR-FIN-05; review M5)', () => {
    expect(Q.get('UN-04').options.map((o: any) => o.label).slice(0, 5)).toEqual(['More than 90%', '85% to 90%', '70% to under 85%', 'Below 70% (allocation is measured)', 'Not measured']);
    expect(Q.get('QV-01').options.map((o: any) => o.label).slice(0, 4)).toEqual(['Within \u00b15%', 'More than \u00b15%, up to \u00b110%', 'More than \u00b110%, up to \u00b120%', 'More than \u00b120%, or no forecast']);
    expect(Q.get('UN-11').options[2].label).toBe('A week or more, or the explanation is disputed');
    expect(Q.get('MP-01').options[1].label).toBe('A named owner (full- or part-time) without a written mandate or sponsor');
  });

  it('tells the respondent on every single-choice maturity question to choose the highest option that fully applies (review M5)', () => {
    for (const q of MATURITY.filter(x => x.answerType === 'single_select')) expect(q.help, q.id).toMatch(/^Choose the highest option that fully describes you today\./);
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

  it('a core Unknown makes the capability Unknown and unconfirmed', () => {
    expect(rateCapability([a('crawl'), a('unknown')])).toMatchObject({ rating: 'unknown', unconfirmed: true });
    expect(rateCapability([a('unknown')])).toMatchObject({ rating: 'unknown', unconfirmed: true });
  });

  it('a depth Unknown counts as Not yet for the one-level rule and flags the rating unconfirmed (review M1)', () => {
    expect(rateCapability([a('run'), a('unknown', false)])).toMatchObject({ rating: 'walk', loweredByDepth: true, unconfirmed: true });
    expect(rateCapability([a('not_yet'), a('unknown', false)])).toMatchObject({ rating: 'not_yet', loweredByDepth: false, unconfirmed: true });
    // Tier 2, commitments at Run, Spot not known: Walk (at target level, but unconfirmed), not a High finding.
    const r = run(facts({}, { org: { currency: 'USD', consumingUnits: '5-19' } }), { 'OP-01': 'run', 'OP-03': 'run', 'OP-08': 'unknown' });
    expect(cap(r, 'RATE_OPTIMIZATION')).toMatchObject({ rating: 'walk', gap: 0, unconfirmed: true, atOrAboveTarget: false });
    expect(r.findings.find(f => f.type === 'capability_gap' && f.capability === 'RATE_OPTIMIZATION')).toBeUndefined();
  });

  it('unless the known answers already rate it Not yet (then Not yet, partly unconfirmed)', () => {
    expect(rateCapability([a('not_yet'), a('unknown')])).toMatchObject({ rating: 'not_yet', unconfirmed: true });
    expect(rateCapability([a('crawl'), a('not_yet', false), a('unknown', false)])).toMatchObject({ rating: 'not_yet', unconfirmed: true });
  });

  it('a capability is never rated from depth answers alone: a blank core reads "Not answered" (review H1)', () => {
    expect(rateCapability([]).rating).toBe('not_assessed');
    expect(rateCapability([a('run', false)]).rating).toBe('not_assessed');
    const r = run(facts(), { 'OP-05': 'run', 'OP-06': 'run' });
    expect(cap(r, 'USAGE_OPTIMIZATION')).toMatchObject({ rating: 'unknown', ratingLabel: 'Not answered', notAnswered: ['OP-04', 'OP-07', 'OP-09'], complete: false });
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

  it('the finding quotes the client\'s own weakest answers and states a business consequence (review H2)', () => {
    const r = run(facts(), { 'UN-10': 'not_yet', 'UN-11': 'run' });
    const f = r.findings.find(x => x.type === 'capability_gap' && x.capability === 'ANOMALY_MANAGEMENT')!;
    expect(f.businessConsequence).toBe(`Today: \u201cFound on the invoice\u201d (UN-10). ${R.capabilityText.byCapability.ANOMALY_MANAGEMENT.consequence}`);
    expect(f.businessConsequence).not.toMatch(/weeks|same day/i);
    const lowered = run(facts(), { 'OP-04': 'run', 'OP-05': 'run', 'OP-06': 'not_yet', 'OP-07': 'run', 'OP-08': 'run', 'OP-09': 'run' }, 'workshop', { targetOverrides: [{ capability: 'USAGE_OPTIMIZATION', level: 'run', reason: 'Largest lever base for this client' }] });
    expect(lowered.findings.find(x => x.type === 'capability_gap' && x.capability === 'USAGE_OPTIMIZATION')!.businessConsequence).toMatch(/^Today: \u201cAt least monthly[^\u201d]*\u201d \(OP-04\); \u201cRun 24\/7\u201d \(OP-06\)\./);
    expect(f.evidenceToConfirm).toBe(R.capabilityText.byCapability.ANOMALY_MANAGEMENT.evidence);
    expect(f.evidenceToConfirm).not.toMatch(/[A-Z]{2}-\d{2}/);
  });

  it('Unknown counts as risk: gap as if Not yet, finding unconfirmed with "confirm" as its first action', () => {
    const r = run(facts(), { 'UN-10': 'crawl', 'UN-11': 'unknown' });
    expect(cap(r, 'ANOMALY_MANAGEMENT')).toMatchObject({ rating: 'unknown', gap: 1, unconfirmed: true, atOrAboveTarget: false });
    const f = r.findings.find(x => x.type === 'capability_gap' && x.capability === 'ANOMALY_MANAGEMENT')!;
    expect(f).toMatchObject({ unconfirmed: true, current: 'unknown', gap: 1 });
    expect(f.decisionOrAction).toMatch(/^Confirm the current practice/);
  });

  it('a blank is rated like "Don\'t know", shown as "Not answered", and creates an unconfirmed finding (review H1)', () => {
    const r = run(facts(), { 'UN-04': 'run' });
    expect(cap(r, 'ALLOCATION')).toMatchObject({ rating: 'unknown', ratingLabel: 'Not answered', complete: false, blank: 1, notAnswered: ['UN-05'], atOrAboveTarget: false, gap: 1 });
    expect(r.coverage.blankQuestions).toContain('UN-05');
    expect(r.coverage.unknownQuestions).not.toContain('UN-05');
    const f = r.findings.find(x => x.type === 'capability_gap' && x.capability === 'ALLOCATION')!;
    expect(f).toMatchObject({ unconfirmed: true, current: 'unknown', title: 'Allocation: Not answered, target Crawl' });
    expect(f.decisionOrAction).toMatch(/^Answer and evidence: UN-05; then move Allocation to Crawl/);
    expect(f.businessConsequence).toMatch(/^Today: \u201cMore than 90%\u201d \(UN-04\); not answered \(UN-05\)\./);
    // A blank depth question lowers by one level like "Don't know".
    const depth = run(facts(), { 'OP-04': 'walk', 'OP-05': 'walk', 'OP-06': 'walk', 'OP-07': 'walk' });
    expect(cap(depth, 'USAGE_OPTIMIZATION')).toMatchObject({ rating: 'crawl', loweredByDepth: true, unconfirmed: true, notAnswered: ['OP-09'] });
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
    expect(on.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toEqual(['LEV-02', 'LEV-03', 'LEV-04', 'LEV-05', 'LEV-08']);
    const off = run(none, { 'OP-04': 'not_yet' });
    for (const id of ['OP-03', 'OP-05', 'OP-06', 'OP-07', 'OP-08', 'OP-09', 'VB-01', 'VB-02']) expect(asked(off, id), id).toBe(false);
    expect(off.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toEqual([]);
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
    expect(on.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!.leverIds).toContain('LEV-07');
    const off = run(facts(), { 'OP-04': 'not_yet' });
    for (const id of ['UN-09', 'OP-11', 'VB-06']) expect(asked(off, id), id).toBe(false);
    expect(off.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!.leverIds).not.toContain('LEV-07');
  });

  it('AI APIs or AI platforms switch on OP-12 and QV-07; only GPU platforms switch on VB-07 and LEV-10 (F5 review M5, D-E)', () => {
    for (const scope of ['ai_api', 'ai_platform_gpu']) {
      const on = run(facts({ scopes: ['public_cloud', scope] }), { 'OP-04': 'not_yet' });
      for (const id of ['OP-12', 'QV-07']) expect(asked(on, id), `${scope} ${id}`).toBe(true);
      const gpu = scope === 'ai_platform_gpu';
      expect(asked(on, 'VB-07'), `${scope} VB-07`).toBe(gpu);
      expect(on.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!.leverIds.includes('LEV-10'), `${scope} LEV-10`).toBe(gpu);
      // An API-only estate is never asked to confirm GPU figures it does not have.
      if (!gpu) expect(on.findings.filter(f => /GPU/.test(f.id)).map(f => f.id)).toEqual([]);
    }
    const off = run(facts());
    for (const id of ['OP-12', 'QV-07', 'VB-07']) expect(asked(off, id), id).toBe(false);
  });

  it('SaaS or licensing puts Licensing & SaaS in scope with OP-13 and LEV-09; OP-14 needs licensing', () => {
    const saas = run(facts({ scopes: ['public_cloud', 'saas'] }), { 'OP-13': 'not_yet' });
    expect(cap(saas, 'LICENSING_SAAS').rating).toBe('not_yet');
    expect([asked(saas, 'OP-13'), asked(saas, 'OP-14'), asked(saas, 'VB-08')]).toEqual([true, false, true]);
    expect(saas.findings.find(f => f.type === 'capability_gap' && f.capability === 'LICENSING_SAAS')!.leverIds).toEqual(['LEV-09']);
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

  it('QV-06 follows its own capability\'s core answer, QV-05 at Crawl or better (review M2)', () => {
    expect(asked(run(facts(), { 'QV-05': 'crawl' }), 'QV-06')).toBe(true);
    expect(asked(run(facts(), { 'QV-05': 'run' }), 'QV-06')).toBe(true);
    expect(asked(run(facts(), { 'QV-05': 'not_yet' }), 'QV-06')).toBe(false);
    expect(asked(run(facts(), { 'QV-05': 'unknown' }), 'QV-06')).toBe(false);
    expect(asked(run(facts(), { 'UN-04': 'run' }), 'QV-06')).toBe(false);
    // An answer to a follow-up that did not fire is ignored, not scored.
    const r = run(facts(), { 'QV-05': 'not_yet', 'QV-06': 'run' });
    expect(cap(r, 'UNIT_ECONOMICS').rating).toBe('not_yet');
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
    const big = facts({ publicCloudProviders: ['aws', 'azure', 'gcp'] }, { org: { currency: 'EUR', tierFxRate: 1.1, consumingUnits: '20+' },
      spend: { byScope: { aws: { exact: 10_000_000 }, azure: { exact: 6_000_000 }, gcp: { exact: 4_000_000 } }, growth12m: 10 } });
    expect(complexityTier(big)).toMatchObject({ tier: 2, points: 2 + 2 + 1, assumed: [] }); // EUR 20M = USD 22M, three providers, 20+ units
    expect(complexityTier({ ...big, org: { currency: 'EUR' } }).trace[0]).toMatch(/not converted/);
    const over = complexityTier({ ...facts(), consultant: { complexityTierOverride: 3, overrideReason: 'Regulated, many entities' } });
    expect(over).toMatchObject({ tier: 3, override: true });
  });

  it('counts unknown spend, consuming units and growth as risk until confirmed, and labels them assumed (F5 review H1, D-A)', () => {
    // A provider without a spend figure, or a row marked unknown, counts at the top spend band.
    const missingRow = complexityTier(facts({ publicCloudProviders: ['aws', 'azure'] }));
    expect(missingRow).toMatchObject({ assumed: ['spend'] });
    expect(missingRow.trace[0]).toMatch(/spend unknown \(azure\) -> 3, assumed until confirmed/);
    const unknownRow = complexityTier(facts({}, { spend: { byScope: { aws: { unknown: true } }, growth12m: 10 } }));
    expect(unknownRow.points).toBe(3);
    const units = complexityTier(facts({}, { org: { currency: 'USD', consumingUnits: 'unknown' } }));
    expect(units).toMatchObject({ points: 2 + 1, assumed: ['consumingUnits'] });
    // Kubernetes and GPU rows are inside the provider bills, so they are not added (F5 review M1).
    const ofWhich = complexityTier(facts({ scopes: ['public_cloud', 'kubernetes'] }, { spend: { byScope: { aws: { exact: 9_000_000 }, kubernetes: { exact: 3_000_000 } }, growth12m: 10 } }));
    expect(ofWhich.trace[0]).toMatch(/spend about USD 9.0M -> 1/);
    // Unknown growth counts as 20% or more in the need verdict, labelled assumed; confidence is Low.
    const runAll = Object.fromEntries(MATURITY.filter(q => B.executiveSet.includes(q.id)).map(q => [q.id, 'run']));
    const v = run(facts({}, { spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 'unknown' }, ...VALUED }), runAll, 'executive').needVerdict!;
    expect(v.modifiers).toContainEqual({ id: 'growth_ge_20pct', points: 10, assumed: true });
    expect(v.confidence).toBe('Low');
  });

  it('a consultant target override is used and recorded; with no default target the finding is Low', () => {
    const tier1 = facts({}, { spend: { byScope: { aws: { exact: 500_000 } } } });
    const r = run(tier1, { 'QV-05': 'not_yet', 'MP-09': 'not_yet', 'MP-10': 'not_yet' }, 'workshop', {
      targetOverrides: [{ capability: 'UNIT_ECONOMICS', level: 'walk', reason: 'Board asked for cost per customer' }]
    });
    expect(cap(r, 'UNIT_ECONOMICS').target).toEqual({ level: 'walk', source: 'consultant_override', reason: 'Board asked for cost per customer' });
    expect(r.findings.find(f => f.type === 'capability_gap' && f.capability === 'UNIT_ECONOMICS')).toMatchObject({ severity: 'Low', severityTrace: ['scope_low'], targetDuration: { months: 24 }, targetSource: 'consultant_override' });
    expect(cap(r, 'INVOICING_CHARGEBACK')).toMatchObject({ target: { level: null }, gap: null, atOrAboveTarget: false });
    expect(r.findings.find(f => f.type === 'capability_gap' && f.capability === 'INVOICING_CHARGEBACK')).toBeUndefined();
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
    expect(r.findings.filter(f => f.type === 'capability_gap').map(f => f.capability).sort()).toEqual(r.capabilities.filter(c => (c.gap ?? 0) >= 1).map(c => c.capability).sort());
    for (const f of r.findings) expect(valid(f), `${f.id}: ${JSON.stringify(valid.errors)}`).toBe(true);
    // All Run: no gap or decision findings; only scope confirmations for the value bases this estate leaves unknown (F4).
    const best = run(big, Object.fromEntries(MATURITY.map(q => [q.id, answerFor(q.id, 'run')])));
    expect(best.findings.filter(f => f.type !== 'scope_confirmation')).toEqual([]);
    expect(best.findings.length).toBeGreaterThan(0);
  });

  it('sets severity from the gap with the foundation uplift at Tier 2 and 3, and the target duration from severity', () => {
    expect(r.tier.tier).toBe(3);
    const di = r.findings.find(f => f.type === 'capability_gap' && f.capability === 'DATA_INGESTION')!;
    expect(di).toMatchObject({ gap: 3, severity: 'Critical', severityTrace: ['gap_3'], targetDuration: { months: 3 }, ownerRole: 'Head of Cloud / CCoE' });
    const kpi = r.findings.find(f => f.type === 'capability_gap' && f.capability === 'KPIS_BENCHMARKING')!;
    expect(kpi).toMatchObject({ gap: 2, severity: 'High', severityTrace: ['gap_2'], targetDuration: { months: 6 } });
    const t2Facts = facts({}, { org: { currency: 'USD', consumingUnits: '5-19' }, spend: { byScope: { aws: { exact: 20_000_000 } } }, ...VALUED });
    const t2Answers = { 'UN-04': 'crawl', 'UN-05': 'crawl', 'OP-04': 'crawl', 'OP-05': 'crawl', 'OP-06': 'crawl', 'OP-07': 'crawl', 'OP-09': 'crawl' };
    const t2 = run(t2Facts, t2Answers);
    expect(t2.tier.tier).toBe(2);
    expect(t2.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')).toMatchObject({ severity: 'High', severityTrace: ['gap_1', 'foundation_uplift'] });
    expect(t2.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')).toMatchObject({ severity: 'Medium', severityTrace: ['gap_1'] });
    // A blank measured scheduled share (VB-03) leaves LEV-04 open in the workshop: High until confirmed (D-B).
    const { nonProdScheduledShare: _, ...openBase } = t2Facts.base as any;
    const open = run({ ...t2Facts, base: openBase }, t2Answers);
    expect(open.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')).toMatchObject({ severity: 'High', severityTrace: ['gap_1', 'value_unconfirmed'] });
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

  it('never starts a finding before its wave window or before the findings it depends on are due to complete (review H3)', () => {
    const waveStart = R.schedule.waveStartMonth;
    const all = [r, ...SCENARIOS.map(s => evaluateFinOpsIqV3(scenarioInput(s)))];
    for (const res of all) {
      for (const f of res.findings) {
        expect(f.start.month, f.id).toBeGreaterThanOrEqual(waveStart[String(f.wave)]);
        // Scope confirmations are due within their own window (CLM-FIN-167); everything else from severity.
        expect(f.targetDuration.months, f.id).toBe(f.type === 'scope_confirmation' ? VR.scopeConfirmation.targetDurationMonths : R.schedule.durationMonths[f.severity]);
        for (const d of f.dependsOn) {
          const dep = res.findings.find(x => x.id === d)!;
          expect(f.start.month, `${f.id} after ${d}`).toBeGreaterThanOrEqual(dep.start.month + Math.min(3, dep.targetDuration.months));
        }
        // No start beyond its wave window's end (wave 1 month 6, wave 2 month 12, wave 3 month 24) unless it waits on
        // a Critical or High dependency still in progress (re-review R1).
        const waitsOnUrgent = f.dependsOn.some(d => ['Critical', 'High'].includes(res.findings.find(x => x.id === d)!.severity));
        if (!waitsOnUrgent) expect(f.start.month, `${f.id} within wave ${f.wave}`).toBeLessThanOrEqual({ 1: 6, 2: 12, 3: 24 }[f.wave]);
      }
    }
    // Critical work is spread by dependency: in RS4 the seven Critical findings do not all start at once.
    const rs4 = all[4].findings.filter(f => f.severity === 'Critical');
    expect(rs4.length).toBeGreaterThanOrEqual(7);
    expect(new Set(rs4.map(f => f.start.month)).size).toBeGreaterThan(1);
    expect(rs4.filter(f => f.start.month === 0).length).toBeLessThan(rs4.length);
  });

  it('let a finding start after its dependency\'s first milestone, not its completion (re-review R1)', () => {
    // RS5 (Tier 1): Allocation is Medium (12 months); Usage Optimization (idle, scheduling) still starts at month 3.
    const rs5 = evaluateFinOpsIqV3(scenarioInput(SCENARIOS[4]));
    const al = rs5.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')!;
    const usage = rs5.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!;
    expect(al).toMatchObject({ start: { month: 0 }, targetDuration: { months: 12 } });
    expect(usage.dependsOn).toEqual(['F-FIN-ALLOCATION']);
    expect(usage.start.month).toBeGreaterThanOrEqual(0);
    expect(usage.start.month).toBeLessThanOrEqual(3);
    // A short dependency (Critical, 3 months) gives the same month-3 start: the milestone is capped at its duration.
    const di = r.findings.find(f => f.type === 'capability_gap' && f.capability === 'ANOMALY_MANAGEMENT')!;
    expect(di.start.month).toBe(3);
  });

  it('show the FinOps lead as "to be appointed" with an interim owner when MP-01 shows no accountable owner (review M3)', () => {
    const al = r.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')!;
    expect(al).toMatchObject({ ownerRole: 'FinOps lead', ownerLabel: 'FinOps lead (to be appointed; interim: Head of Cloud / CCoE)', interimOwnerRole: 'Head of Cloud / CCoE' });
    expect(r.findings.find(f => f.type === 'capability_gap' && f.capability === 'DATA_INGESTION')!.ownerLabel).toBe('Head of Cloud / CCoE');
    const named = run(big, { ...allNotYet, 'MP-01': 'walk' });
    expect(named.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')).toMatchObject({ ownerLabel: 'FinOps lead' });
    expect(named.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')!.interimOwnerRole).toBeUndefined();
  });

  it('raise DECISION-01 when MP-01 shows no accountable owner: High, one level higher at Tier 2 or 3 (review M4)', () => {
    const tier1 = facts();
    for (const level of ['not_yet', 'crawl', 'unknown']) {
      const d = run(tier1, { 'MP-01': level }, 'executive').findings.find(f => f.id === 'F-FIN-DECISION-01')!;
      expect(d, level).toMatchObject({ type: 'decision', severity: 'High', ownerRole: 'CIO', wave: 1, unconfirmed: level === 'unknown' });
    }
    expect(run(tier1, {}, 'executive').findings.find(f => f.id === 'F-FIN-DECISION-01')).toMatchObject({ unconfirmed: true });
    for (const level of ['walk', 'run']) expect(run(tier1, { 'MP-01': level }).findings.find(f => f.id === 'F-FIN-DECISION-01'), level).toBeUndefined();
    expect(r.findings.find(f => f.id === 'F-FIN-DECISION-01')).toMatchObject({ severity: 'Critical', severityTrace: ['decision_rule', 'foundation_uplift'] });
  });

  it('link levers in scope and carry offerings, owner role and claim IDs', () => {
    const usage = r.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!;
    expect(usage.leverIds).toEqual(['LEV-02', 'LEV-03', 'LEV-04', 'LEV-05', 'LEV-07', 'LEV-08']);
    expect(r.findings.find(f => f.type === 'capability_gap' && f.capability === 'RATE_OPTIMIZATION')!.leverIds).toEqual(['LEV-01', 'LEV-06']);
    for (const f of r.findings) {
      expect(f.offeringIds.length, f.id).toBeGreaterThan(0);
      if (f.type === 'capability_gap' || f.type === 'lever_opportunity') expect(f.ownerRole, f.id).toBe(R.ownerRoles.byCapability[f.capability]);
    }
  });

  it('are sorted by severity, wave and gap, and the executive view shows the top five', () => {
    const sev = ['Critical', 'High', 'Medium', 'Low'];
    for (let i = 1; i < r.findings.length; i++) {
      const [a, b] = [r.findings[i - 1], r.findings[i]];
      expect(sev.indexOf(a.severity) < sev.indexOf(b.severity) || (a.severity === b.severity && (a.wave < b.wave || (a.wave === b.wave && (a.gap ?? 0) >= (b.gap ?? 0))))).toBe(true);
    }
    expect(r.topFindingIds).toEqual(r.findings.slice(0, 5).map(f => f.id));
  });

  it('sort findings from real answers before "not answered" ones of the same severity, by the blank count (re-review R5)', () => {
    const res = run(facts(), { 'UN-04': 'not_yet', 'UN-05': 'not_yet', 'UN-10': 'not_yet' });
    const al = res.findings.find(f => f.type === 'capability_gap' && f.capability === 'ALLOCATION')!;
    const am = res.findings.find(f => f.type === 'capability_gap' && f.capability === 'ANOMALY_MANAGEMENT')!;
    expect([al.notAnsweredCount, am.notAnsweredCount]).toEqual([0, 1]);
    expect(al.severity).toBe(am.severity);
    expect(res.findings.indexOf(al)).toBeLessThan(res.findings.indexOf(am));
    for (let i = 1; i < res.findings.length; i++) {
      const [a, b] = [res.findings[i - 1], res.findings[i]];
      if (a.severity === b.severity) expect(a.notAnsweredCount > 0 && b.notAnsweredCount === 0, `${a.id} before ${b.id}`).toBe(false);
    }
  });

  it('every Usage Optimization depth question can lower the rating from an all-at-core baseline (re-review R4)', () => {
    const scope = facts({ scopes: ['public_cloud', 'kubernetes', 'ai_api'] });
    const usage = QUESTIONS.filter(q => q.kind === 'maturity' && q.capability === 'USAGE_OPTIMIZATION');
    const baseline = Object.fromEntries(usage.map(q => [q.id, 'walk']));
    expect(cap(run(scope, baseline), 'USAGE_OPTIMIZATION')).toMatchObject({ rating: 'walk', loweredByDepth: false, complete: true });
    const depth = usage.filter(q => q.role !== 'core').map(q => q.id);
    expect(depth).toEqual(['OP-05', 'OP-06', 'OP-07', 'OP-09', 'OP-11', 'OP-12']);
    for (const id of depth) {
      for (const level of ['crawl', 'not_yet', 'unknown']) {
        expect(cap(run(scope, { ...baseline, [id]: level }), 'USAGE_OPTIMIZATION'), `${id}=${level}`).toMatchObject({ rating: 'crawl', loweredByDepth: true });
      }
    }
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
    expect(exec(allExec('run'), facts({}, VALUED))).toMatchObject({ baseIndex: 0, needIndex: 0, band: 'lightweight', confidence: 'Medium' });
  });

  it('a blank value input that leaves LEV-01 or LEV-04 open counts as material until confirmed (F5 review H2, D-B)', () => {
    const open = exec(allExec('run'));
    expect(open.modifiers).toEqual([{ id: 'expected_value_ge_5pct_of_P', points: 10, assumed: true }]);
    expect(open.confidence).toBe('Low');
    expect(open.blindSpots.map(b => b.fact)).toEqual(expect.arrayContaining(['base.computeShare', 'base.nonProdShare']));
    // Unknown on OP-06 leaves LEV-04 open in executive mode, so the verdict is never milder than at the lowest answer.
    const unknown = run(facts({}, VALUED), { ...allExec('crawl'), 'OP-06': 'unknown' }, 'executive');
    const lowest = run(facts({}, VALUED), { ...allExec('crawl'), 'OP-06': 'not_yet' }, 'executive');
    expect(unknown.needVerdict!.needIndex).toBeGreaterThanOrEqual(lowest.needVerdict!.needIndex);
    const uo = unknown.findings.find(f => f.type === 'capability_gap' && f.capability === 'USAGE_OPTIMIZATION')!;
    expect(uo).toMatchObject({ severity: 'High', valueBasis: { fields: [], unconfirmedInputs: ['base.nonProdScheduledShare'] } });
    expect(uo.severityTrace).toContain('value_unconfirmed');
    // With no internal cost rate, the levers are quantified but no money is shown: also open until confirmed.
    const noRate = exec(allExec('run'), facts({}, { base: VALUED.base }));
    expect(noRate.modifiers).toContainEqual({ id: 'expected_value_ge_5pct_of_P', points: 10, assumed: true });
  });

  it('adds the urgency modifiers: tier, growth of 20% or more, AI in scope (executive mode: no migration share, review L6)', () => {
    const f = facts({ scopes: ['public_cloud', 'ai_api'] }, { org: { currency: 'USD', consumingUnits: '20+' }, spend: { byScope: { aws: { exact: 60_000_000 } }, growth12m: 25 }, ...VALUED });
    const v = exec(allExec('run'), f);
    expect(v.modifiers.map(m => m.id)).toEqual(['tier_2', 'growth_ge_20pct', 'ai_in_scope']);
    expect(v.needIndex).toBe(30);
    // The value bases are given and the value is below 5% of P, so the value modifier does not apply.
    expect(v.pending).toEqual([]);
    const moving = exec(allExec('run'), facts({ migration: { remainingShare24m: { exact: 0.3 } } }, VALUED));
    expect(moving.modifiers.map(m => m.id)).toEqual([]);
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

  it('lists unknown growth as a blind spot and counts answered questions in the basis line (review L1, L2)', () => {
    const v = exec({}, facts({}, { spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 'unknown' } }));
    expect(v.blindSpots).toContainEqual({ fact: 'spend.growth12m', reason: 'unknown' });
    expect(v.basisLine).toMatch(/^Based on 3 of 18 questions answered;/);
    expect(exec(allExec('run')).basisLine).toMatch(/^Based on 15 of 18 questions answered;/);
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
/**
 * F4 review H3: the value steps (severity uplift, need modifier) use only figures the report shows at the client's
 * own answers, so a blank (value not quantified) can remove them. The answer invariants hold on the scores before the
 * value step, which are monotone; finops-iq-v3-value.test.ts checks that every value step rests on a shown figure.
 */
const VALUE_MODIFIER = 'expected_value_ge_5pct_of_P';
const needBeforeValue = (r: FinOpsIqV3Result) => {
  const v = r.needVerdict!;
  return Math.round(Math.min(100, v.baseIndex + v.modifiers.filter(m => m.id !== VALUE_MODIFIER).reduce((t, m) => t + m.points, 0)) * 10) / 10;
};

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

  it('a better answer never scores worse: no capability, headline or need index (before the value step) moves the wrong way (Unknown ranks lowest)', () => {
    for (const { mode, seed, input, r } of runs.slice(0, 40).concat(runs.slice(150, 190))) {
      for (const id of r.questions.asked.filter(x => Q.get(x).kind === 'maturity')) {
        const results = ORDER.map(level => evaluateFinOpsIqV3({ ...input, answers: { ...input.answers, [id]: answerFor(id, level) } }));
        for (let i = 1; i < results.length; i++) {
          const [lo, hi] = [results[i - 1], results[i]];
          const msg = `${mode} seed ${seed} ${id}: ${ORDER[i - 1]} -> ${ORDER[i]}`;
          for (const c of hi.capabilities) expect(ratingIndex(c.rating), `${msg} ${c.capability}`).toBeGreaterThanOrEqual(ratingIndex(cap(lo, c.capability).rating));
          expect(hi.headline.atOrAboveTarget, msg).toBeGreaterThanOrEqual(lo.headline.atOrAboveTarget);
          if (mode === 'executive') expect(needBeforeValue(hi), msg).toBeLessThanOrEqual(needBeforeValue(lo));
        }
      }
    }
  }, 300_000);

  it('a blank never scores better than any answered option: capability, headline, need index and finding severity before the value step (review H1, F4 review H3)', () => {
    for (const { mode, seed, input, r } of runs.slice(0, 40).concat(runs.slice(150, 190))) {
      for (const id of r.questions.asked.filter(x => Q.get(x).kind === 'maturity')) {
        const c = Q.get(id).capability;
        const { [id]: _, ...rest } = input.answers;
        const blank = evaluateFinOpsIqV3({ ...input, answers: rest });
        for (const level of ORDER) {
          const a = evaluateFinOpsIqV3({ ...input, answers: { ...rest, [id]: answerFor(id, level) } });
          const msg = `${mode} seed ${seed} ${id}=${level}`;
          expect(effective(blank, c), msg).toBeLessThanOrEqual(effective(a, c));
          expect(blank.headline.atOrAboveTarget, msg).toBeLessThanOrEqual(a.headline.atOrAboveTarget);
          if (mode === 'executive') expect(needBeforeValue(blank), msg).toBeGreaterThanOrEqual(needBeforeValue(a));
          // Never fewer or less severe findings. A lever finding (F4) may instead sit on its capability's gap finding,
          // which the blank creates: the lever then appears there, at a severity at least as high (CLM-FIN-167).
          for (const f of a.findings) {
            const b = blank.findings.find(x => x.id === f.id) ??
              (f.type === 'lever_opportunity' ? blank.findings.find(x => x.type === 'capability_gap' && x.capability === f.capability && f.leverIds.every(l => x.leverIds.includes(l))) : undefined);
            expect(b, `${msg} ${f.id}`).toBeDefined();
            expect(SEV.indexOf(b!.severityBeforeValue), `${msg} ${f.id}`).toBeGreaterThanOrEqual(SEV.indexOf(f.severityBeforeValue));
          }
          const absorbed = a.findings.filter(f => f.type === 'lever_opportunity' && !blank.findings.some(x => x.id === f.id)).length;
          expect(blank.findings.length + absorbed, msg).toBeGreaterThanOrEqual(a.findings.length);
        }
      }
    }
  }, 300_000);

  it('every client-visible string carries claim IDs that exist in the register and are client-visible', () => {
    const TEXT = ['title', 'businessConsequence', 'decisionOrAction', 'statement', 'bandLabel', 'basisLine', 'ratingLabel', 'displayName', 'note', 'evidenceToConfirm', 'ownerLabel'];
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
        // HY-01 appears only in its own echo and the hypothesis panel beside the value range (D4).
        const strip = (x: FinOpsIqV3Result) => ({ ...x, hypotheses: null, value: { ...x.value, hypothesis: null } });
        expect(strip(other), `${mode} seed ${seed} HY-01=${band}`).toEqual(strip(r));
      }
    }
  });
});

/* --------------------------- Reference scenarios ---------------------------- */

/**
 * Differences between the engine and the scenarios' hand-written expectations, each justified in
 * docs/cio-readiness/finops-iq/design/F3-scenario-diffs.md (D4-D6) and F4-scenario-diffs.md (V1-V9). Everything not
 * listed must match exactly. D1-D3 (lever findings, value uplift, value need modifier) were closed in F4.
 */
const RECORDED = {
  /** V1: a lever whose capability has a gap finding carries its value on that finding, not a separate lever finding. */
  absorbed: { RS1: ['F-FIN-LEV-04'] } as Record<string, string[]>,
  /** V2: findings the scenario does not count (RS3 SaaS confirmation, RS4 LEV-09). RS2's one unitemised finding is its SaaS confirmation. */
  extra: { RS3: 1, RS4: 1 } as Record<string, number>,
  /** V3: lever findings carry the value uplift (CLM-FIN-167): RS5 LEV-01 is High, written as Medium. */
  severity: { RS5: { 'F-FIN-LEV-01': 'High' } } as Record<string, Record<string, string>>,
  /** V3: top-finding order changes with V3 (RS5). V4 (RS2) is resolved by the F4 review's Spot base (H2): RS2's order matches again. */
  orderDiffers: ['RS5'],
  /** D4: Q14 rewording adopted in F2 (THR-FIN-14, CLM-FIN-127) after the scenarios were written; the foundations band only (F5 X2). */
  bandLabel: { from: 'Establish foundations now', to: 'Targeted improvements needed now' },
  /** F5 D-A: RS1's data centre spend is unknown, so it counts at the top spend band until confirmed (+1 point, still Tier 2). */
  tierPoints: { RS1: 5 } as Record<string, number>,
  /** F5 D-A: an assumed input makes the need verdict's confidence Low. */
  confidence: { RS1: 'Low' } as Record<string, string>,
  /** F5 D-D: executive mode reads SC-04's Kubernetes row, so RS7 no longer asks to confirm cluster spend (H4). */
  removed: { RS7: ['F-FIN-SCOPE-KUBERNETES_SPEND'] } as Record<string, string[]>
};
const SEV = ['Low', 'Medium', 'High', 'Critical'];

function goldenView(r: FinOpsIqV3Result) {
  return {
    versions: r.versions,
    tier: { tier: r.tier.tier, points: r.tier.points, trace: r.tier.trace },
    asked: r.questions.asked.length,
    profile: Object.fromEntries(r.capabilities.map(c => [c.capability,
      `${c.rating}${c.loweredByDepth ? ' (lowered)' : ''} / ${c.target.level ?? '-'} / ${c.gap ?? '-'}${c.atOrAboveTarget ? ' / at target' : ''}${c.unconfirmed ? ' / unconfirmed' : ''}${c.complete ? '' : ' / incomplete'}${c.assessedIn ? ' / workshop' : ''}`])),
    headline: { atOrAboveTarget: r.headline.atOrAboveTarget, inScope: r.headline.inScope, assessed: r.headline.assessed, statement: r.headline.statement },
    findings: r.findings.map(f => `${f.id} ${f.severity} [${f.severityTrace}] wave ${f.wave}${f.dependsOn.length ? ` after ${f.dependsOn}` : ''} | ${f.ownerLabel} | from month ${f.start.month}, within ${f.targetDuration.months} months | levers ${f.leverIds.join(',') || '-'} | offerings ${f.offeringIds.join(',')}${f.unconfirmed ? ' | unconfirmed' : ''}`),
    topFindingIds: r.topFindingIds,
    needVerdict: r.needVerdict && { ...r.needVerdict, claimIds: undefined },
    coverage: { ...r.coverage, claimIds: undefined },
    conflicts: r.conflicts.map(c => c.id),
    value: valueView(r)
  };
}

/** The value block in brief: per lever and case the run-rate value, and the totals (F4). */
function valueView(r: FinOpsIqV3Result) {
  const v = r.value;
  const cases = ['conservative', 'expected', 'upper'] as const;
  return {
    status: v.status, moneyShown: v.moneyShown, confidence: v.confidence.overall,
    levers: Object.fromEntries(v.levers.map(l => [l.id, l.cases ? cases.map(c => l.cases![c].runRate.value).join(' / ') : `${l.reason}${l.blockedBy.length ? ` (${l.blockedBy.join(', ')})` : ''}`])),
    totals: v.totals && Object.fromEntries(cases.map(c => {
      const t = v.totals![c];
      return [c, `gross ${t.grossRunRate.value} (${t.pctOfP.value}% of ${t.P.value}), year 1 ${t.grossYear1.value}, one-off ${t.oneOffCost.value}, run ${t.annualRunCost.value}, net year 1 ${t.netYear1.value}, net run-rate ${t.netRunRate.value}, net 3-year ${t.net3Year.value}${t.capBinding ? `, capped from ${t.cloudBeforeCap.value}` : ''}`];
    })),
    finopsTeam: v.finopsTeam.annualCost?.value ?? null,
    hypothesis: v.hypothesis.position
  };
}

describe('FinOps IQ v3 reference scenarios against their written expectations', () => {
  for (const s of SCENARIOS) {
    describe(s.id, () => {
      const r = evaluateFinOpsIqV3(scenarioInput(s));
      const e = s.expected;

      it('tier, capability profile and headline match exactly', () => {
        expect({ tier: r.tier.tier, points: r.tier.points }).toEqual({ tier: e.tier.tier, points: RECORDED.tierPoints[s.id] ?? e.tier.points });
        for (const [id, x] of Object.entries<any>(e.capabilityProfile)) {
          const c = cap(r, id);
          expect(c.rating, id).toBe(x.rating);
          if ('target' in x) expect(c.target.level, id).toBe(x.target);
          if ('gap' in x) expect(c.gap, id).toBe(x.gap);
          if ('atOrAboveTarget' in x) expect(c.atOrAboveTarget, id).toBe(x.atOrAboveTarget);
        }
        expect(r.headline).toMatchObject({ atOrAboveTarget: e.headline.atOrAboveTarget, inScope: e.headline.inScope, assessed: e.headline.assessed, statement: e.headline.statement });
      });

      it('findings match, apart from the recorded differences', () => {
        const absorbed = RECORDED.absorbed[s.id] ?? [];
        const removed = RECORDED.removed[s.id] ?? [];
        for (const x of e.topFindings) {
          const f = r.findings.find(y => y.id === x.id);
          if (removed.includes(x.id)) { expect(f, `${x.id} is no longer raised`).toBeUndefined(); continue; }
          if (absorbed.includes(x.id)) {
            // V1: the lever's value sits on its capability's gap finding.
            expect(f, `${x.id} sits on its capability's gap finding`).toBeUndefined();
            const owner = r.findings.find(y => y.type === 'capability_gap' && y.capability === x.capability)!;
            for (const l of x.leverIds) expect(owner.value?.leverIds, `${owner.id} carries ${l}`).toContain(l);
            continue;
          }
          expect(f, x.id).toBeDefined();
          expect(f!.type, x.id).toBe(x.type);
          const severity = RECORDED.severity[s.id]?.[x.id] ?? x.severity;
          if (x.type === 'capability_gap') {
            // D6: timeFrame is replaced by start and targetDuration (review H3), so it is not compared.
            expect(f, x.id).toMatchObject({ capability: x.capability, current: x.current, target: x.target, gap: x.gap, ownerRole: x.ownerRole, wave: x.wave, severity, severityTrace: x.severityTrace, ...(x.unconfirmed ? { unconfirmed: true } : {}) });
          } else {
            expect(f, x.id).toMatchObject({ capability: x.capability, severity, ownerRole: x.ownerRole, wave: x.wave });
          }
          for (const o of x.offeringIds) expect(f!.offeringIds, `${x.id} offering ${o}`).toContain(o);
          for (const l of x.leverIds ?? []) expect(f!.leverIds, `${x.id} lever ${l}`).toContain(l);
        }
        expect(r.findings.length).toBe(e.findingCount - absorbed.length - removed.length + (RECORDED.extra[s.id] ?? 0));
      });

      it('top findings keep the written order where no recorded difference applies', () => {
        if (RECORDED.orderDiffers.includes(s.id)) return;
        const expectedIds = e.topFindings.map((x: any) => x.id).filter((id: string) => !(RECORDED.absorbed[s.id] ?? []).includes(id) && !(RECORDED.removed[s.id] ?? []).includes(id));
        expect(r.findings.slice(0, expectedIds.length).map(f => f.id)).toEqual(expectedIds);
      });

      if (e.needVerdict) it('need verdict matches, including the value modifier (F4), apart from the reworded band', () => {
        const v = r.needVerdict!;
        expect(v.baseIndex).toBe(e.needVerdict.baseIndex);
        expect(v.modifiers).toEqual(e.needVerdict.modifiers);
        expect(v.pending).toEqual([]);
        expect(v.needIndex).toBeCloseTo(e.needVerdict.needIndex, 5);
        expect(v.band).toBe(e.needVerdict.band);
        if (e.needVerdict.band === 'foundations') {
          expect(e.needVerdict.bandLabel).toBe(RECORDED.bandLabel.from);
          expect(v.bandLabel).toBe(RECORDED.bandLabel.to);
        } else expect(v.bandLabel).toBe(e.needVerdict.bandLabel);
        expect(v.confidence).toBe(RECORDED.confidence[s.id] ?? e.needVerdict.confidence);
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

  it('the workshop asks 65 questions (42 maturity) for the Tier 2 reference estate RS3', () => {
    const r = evaluateFinOpsIqV3(inputs.RS3);
    expect([r.questions.asked.length, r.coverage.asked]).toEqual([65, 42]);
    expect(r.coverage.blankQuestions).toEqual(['QV-06']); // asked since review M2 (QV-05 at Crawl); the scenario predates it
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
