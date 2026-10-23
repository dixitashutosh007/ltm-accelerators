/**
 * Sovereign IQ v4 engine (PLAN S3): data files against their schemas, the request contract, every applicability rule
 * (fires when its condition holds, not when it does not), the five reference archetypes against the outcomes written
 * before the engine (DESIGN.md section 10), golden outputs, and invariants over random questionnaires.
 *
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run sovereign-iq-v4, then have the
 * sovereignty-compliance lead review the golden diff. Differences from the archetypes' hand-written expectations are
 * listed in EXPECTED_DIFFERENCES with their reason, and recorded in PLAN.md S3 for the owner's approval.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import {
  evaluateSovereignIqV4, parseSovereignIqV4Input, evaluateCondition, QUESTIONS, CONTROLS, REGIMES, ENGINE_VERSION,
  type Condition, type SovereignIqV4Result
} from '../src/accelerators/sovereign-iq/v4';
import bank from '../src/accelerators/sovereign-iq/v4/question-bank.json' with { type: 'json' };
import registry from '../src/accelerators/sovereign-iq/registry/regimes.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const DESIGN = join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design');
const ARCHETYPES: any[] = JSON.parse(readFileSync(join(DESIGN, 'archetypes.json'), 'utf8')).archetypes;
const PREDICATES = (registry as any).predicates as Record<string, Condition>;
const DATE = '2026-10-23';
const run = (answers: any, mode: 'executive' | 'workshop' = 'workshop') => evaluateSovereignIqV4({ mode, answers, assessmentDate: DATE });

/**
 * Where the engine differs from an archetype's hand-written expectation, and why. Each is a consequence of an
 * owner-approved decision or of the design's own rule, not an engine fault.
 */
const EXPECTED_DIFFERENCES: Record<string, Record<string, string>> = {
  ARC3_US_HEALTHTECH_EU_CUSTOMERS: {
    'exposure.US_CCPA': 'amber, not not_rated: S2 sourced the CCPA required controls, so they score (S2 design change 5, approved 23 Oct 2026)',
    largestCap: 'UK_GDPR GBP 17.5M (about EUR 20.7M at the ECB rate of 12 Oct 2026), not EU_GDPR EUR 20M: DESIGN 7.2 takes the highest cap among regimes that apply or likely apply, and UK_GDPR is likely_confirm here'
  },
  ARC5_IN_SERVICES_EU_CLIENTS: {
    'exposure.US_CCPA': 'amber, not not_rated: S2 sourced the CCPA required controls, so they score (S2 design change 5, approved 23 Oct 2026)'
  }
};

/* --------------------------------- Schemas --------------------------------- */

describe('Sovereign IQ v4 data files', () => {
  const Ajv2020 = require('ajv/dist/2020').default;
  const ajv = new Ajv2020({ allErrors: true, strict: false, logger: false });
  for (const f of ['facts.schema.json', 'regime.schema.json']) ajv.addSchema(JSON.parse(readFileSync(join(DESIGN, f), 'utf8')));

  it('the question bank matches question.schema.json: 47 questions, 17 executive, 15 workshop, 15 follow-ups', () => {
    const v = ajv.compile(JSON.parse(readFileSync(join(DESIGN, 'question.schema.json'), 'utf8')));
    expect(v(bank), JSON.stringify(v.errors?.slice(0, 3))).toBe(true);
    const by = (m: string) => QUESTIONS.filter(q => q.mode === m).length;
    expect([QUESTIONS.length, by('executive'), by('workshop'), by('follow_up')]).toEqual([47, 17, 15, 15]);
  });

  it('every maturity question feeds a catalogued control, and every scored control is measured', () => {
    const ids = new Set(CONTROLS.map(c => c.id));
    for (const q of QUESTIONS.filter(q => q.kind === 'maturity')) expect(ids.has(q.feeds.controls[0]), q.id).toBe(true);
    for (const c of CONTROLS.filter(c => c.scored !== false && !c.derived)) {
      expect(QUESTIONS.some(q => q.feeds.controls?.includes(c.id)), c.id).toBe(true);
    }
    expect(CONTROLS).toHaveLength(28);
    expect(CONTROLS.filter(c => c.exec).map(c => c.id)).toHaveLength(10);
  });

  it('every control a regime requires and every predicate a condition names exists', () => {
    const ids = new Set(CONTROLS.map(c => c.id));
    const names = new Set<string>();
    const walk = (c: any) => { if (!c) return; if (c.derived) names.add(c.derived); (c.all ?? c.any ?? []).forEach(walk); if (c.not) walk(c.not); };
    for (const r of REGIMES) {
      for (const rc of r.requiredControls ?? []) expect(ids.has(rc.control), `${r.id} ${rc.control}`).toBe(true);
      for (const rule of r.applicability.rules) walk(rule.when);
    }
    for (const q of QUESTIONS) walk(q.trigger);
    for (const n of names) expect(PREDICATES[n], n).toBeDefined();
  });
});

/* -------------------------------- Contract --------------------------------- */

describe('Sovereign IQ v4 contract', () => {
  it('accepts every archetype in both modes', () => {
    for (const a of ARCHETYPES) for (const mode of ['executive', 'workshop']) expect(parseSovereignIqV4Input({ mode, assessmentDate: DATE, answers: a.answers }).ok, a.id).toBe(true);
  });

  it('rejects unknown questions, unknown options, malformed matrices and bad turnover', () => {
    const bad = parseSovereignIqV4Input({
      mode: 'workshop', assessmentDate: DATE,
      answers: { Z9: 'x', A1: 'mars', B1: ['eu_credit_institution', 'eu_credit_institution'], D3: { personal: { primary: ['moon'] } }, A5: { turnover_amount: { amount: -1, currency: 'EUR' } }, L2: { secret: {} } }
    });
    expect(bad.ok).toBe(false);
    const errors = (bad as any).errors.join(' | ');
    for (const m of ['Z9: unknown question', 'A1: must be one of', 'B1: must be a list of distinct', 'D3.personal.primary', 'A5.turnover_amount', 'L2.secret: unknown data class']) expect(errors).toContain(m);
    expect(parseSovereignIqV4Input({ mode: 'board', assessmentDate: '23/10/2026', answers: {} }).ok).toBe(false);
  });

  it('answers to questions the mode does not ask are accepted and ignored, never scored', () => {
    const a = ARCHETYPES[0].answers;
    const r = run({ ...a, K3: 'no' }, 'executive');
    expect(r.ignoredAnswers).toContain('K3');
    expect(r.controls.some(c => c.control === 'SOV.ENC.BASELINE')).toBe(false);
  });
});

/* ------------------------ Applicability, rule by rule ----------------------- */

/** Builds facts that make a condition true (or false), for the rule-by-rule tests. */
function satisfy(c: any, facts: Record<string, any>, want = true): void {
  if (c.all) { if (want) c.all.forEach((x: any) => satisfy(x, facts, true)); else satisfy(c.all[0], facts, false); return; }
  if (c.any) { if (want) satisfy(c.any[0], facts, true); else c.any.forEach((x: any) => satisfy(x, facts, false)); return; }
  if (c.not) { satisfy(c.not, facts, !want); return; }
  if (c.derived) { satisfy(PREDICATES[c.derived], facts, want); return; }
  const add = (vals: any[]) => { facts[c.fact] = [...new Set([...(Array.isArray(facts[c.fact]) ? facts[c.fact] : []), ...vals])]; };
  if (want) {
    switch (c.op) {
      case 'eq': case 'gte': case 'lte': facts[c.fact] = c.value; break;
      case 'in': facts[c.fact] = c.value[0]; break;
      case 'includes': add([c.value]); break;
      case 'includes_any': add([c.value[0]]); break;
      case 'includes_all': add(c.value); break;
      case 'is_unknown': delete facts[c.fact]; break;
      case 'is_answered': facts[c.fact] = facts[c.fact] ?? 'answered'; break;
    }
  } else {
    switch (c.op) {
      case 'includes': case 'includes_any': case 'includes_all':
        if (Array.isArray(facts[c.fact])) facts[c.fact] = facts[c.fact].filter((x: any) => !(Array.isArray(c.value) ? c.value : [c.value]).includes(x));
        break;
      case 'eq': case 'in': if ((Array.isArray(c.value) ? c.value : [c.value]).includes(facts[c.fact])) delete facts[c.fact]; break;
      case 'is_unknown': facts[c.fact] = facts[c.fact] ?? 'answered'; break;
      case 'is_answered': delete facts[c.fact]; break;
      default: delete facts[c.fact];
    }
  }
}

describe('Sovereign IQ v4 applicability: every rule fires when its condition holds and not otherwise', () => {
  const rules = REGIMES.flatMap(r => r.applicability.rules.map((rule: any) => ({ regime: r.id, rule })));
  it('covers all 94 rules of the registry', () => expect(rules).toHaveLength(94));
  it.each(rules.map(x => [x.rule.id, x]))('%s', (_, x: any) => {
    const ctx = (facts: any) => ({ facts, predicates: PREDICATES });
    const yes: Record<string, any> = {};
    satisfy(x.rule.when, yes, true);
    expect(evaluateCondition(x.rule.when, ctx(yes)), `positive facts ${JSON.stringify(yes)}`).toBe(true);
    const no: Record<string, any> = { ...yes };
    satisfy(x.rule.when, no, false);
    expect(evaluateCondition(x.rule.when, ctx(no)), `negative facts ${JSON.stringify(no)}`).toBe(false);
  });

  it('first matching rule wins, in the registry order', () => {
    // An EU bank: DORA rule 2 (financial entity in the EU) fires, not rule 4 (financial sector without a licence).
    const r = run({ A1: 'eea', A2: { entity: ['eea'], people: ['eea'] }, A3: 'banking', B1: ['eu_credit_institution'] });
    expect(r.regimes.find(g => g.regime === 'EU_DORA')!.rule).toBe('EU_DORA.2');
  });

  it('PIPL never fires for Hong Kong or Japan (validation row 71)', () => {
    const r = run({ A1: 'hk', A2: { entity: ['hk', 'jp'], people: ['hk', 'jp'] }, A3: 'retail_consumer', D1: ['personal'] });
    expect(r.regimes.find(g => g.regime === 'CN_PIPL')!.grade).toBe('not_applicable');
  });

  it('an UNSOURCED rule is consultant-only (S2 design change 2)', () => {
    const unsourced = REGIMES.flatMap(r => r.applicability.rules.filter((x: any) => x.verification?.status === 'UNSOURCED').map((x: any) => x.id));
    expect(unsourced).toEqual(expect.arrayContaining(['FR_SECNUMCLOUD.3', 'DE_C5.2', 'KR_PIPA.2']));
    const r = run({ A1: 'kr', A2: { entity: ['eea'], people: ['kr'] }, A3: 'retail_consumer', D1: ['personal'] });
    const kr = r.regimes.find(g => g.regime === 'KR_PIPA')!;
    if (kr.rule === 'KR_PIPA.2') expect(kr.consultantOnly).toBe(true);
  });
});

/* ------------------------------- Archetypes -------------------------------- */

describe('Sovereign IQ v4 reference archetypes (DESIGN.md section 10)', () => {
  for (const a of ARCHETYPES) {
    const e = a.expected;
    const diff = EXPECTED_DIFFERENCES[a.id] ?? {};
    describe(a.id, () => {
      for (const mode of ['executive', 'workshop'] as const) {
        const r = run(a.answers, mode);
        it(`${mode}: required levels and maturity as expected`, () => {
          expect(Object.fromEntries(r.requirements.map(x => [x.dataClass, x.required]))).toEqual(e.requiredLevels[mode]);
          expect({ score: r.maturity.score, band: r.maturity.band, controlsAssessed: r.maturity.controlsAssessed }).toEqual(e.maturity[mode]);
        });
      }
      const r = run(a.answers);
      it('regimes in scope, grade and rule as expected (no rule fires that is not expected)', () => {
        const got = r.regimes.filter(x => x.grade !== 'not_applicable').map(x => `${x.regime} ${x.grade} ${x.rule}`).sort();
        expect(got).toEqual(e.regimes.map((x: any) => `${x.regime} ${x.grade} ${x.rule}`).sort());
      });
      it('exposure RAG as expected', () => {
        for (const x of e.exposure) {
          const got = r.exposure.regimes.find(y => y.regime === x.regime)!.rag;
          if (diff[`exposure.${x.regime}`]) expect(got, diff[`exposure.${x.regime}`]).not.toBe(x.rag);
          else expect(got, x.regime).toBe(x.rag);
        }
      });
      it('largest single statutory cap as expected, labelled a cap, never summed', () => {
        const c = r.exposure.largestCap!;
        expect(c.label).toBe('cap, not expected fine');
        if (diff.largestCap) expect(c.regime, diff.largestCap).not.toBe(e.largestCap.regime);
        else expect({ regime: c.regime, amount: Math.round(c.amount!), currency: c.currency }).toEqual({ regime: e.largestCap.regime, amount: e.largestCap.amount, currency: e.largestCap.currency });
      });
      it('top five gaps, in order, with severity as expected', () => {
        expect(r.topGaps.map(f => `${f.control} ${f.severity}`)).toEqual(e.topGaps.map((x: any) => `${x.control} ${x.severity}`));
      });
      it('scope confirmations and decisions as expected', () => {
        expect(r.findings.filter(f => f.type === 'scope_confirmation').map(f => `${f.regimes[0].regime} ${f.severity}`)).toEqual((e.scopeConfirmations ?? []).map((x: any) => `${x.regime} ${x.severity}`));
        expect(r.findings.filter(f => f.type === 'decision').length).toBe((e.decisions ?? []).length);
      });
    });
  }
});

/* ------------------------------ Golden outputs ------------------------------ */

/** The parts of a result a reviewer approves: grades, levels, headlines, exposure, findings and roadmap. */
function approved(r: SovereignIqV4Result) {
  return {
    versions: r.versions, asked: r.asked,
    regimes: r.regimes.filter(x => x.grade !== 'not_applicable').map(x => ({ regime: x.regime, grade: x.grade, rule: x.rule, nis2Class: x.nis2Class })),
    requirements: r.requirements.map(x => ({ dataClass: x.dataClass, required: x.required, floor: x.floor?.regime ?? null, allowedZone: x.allowedZone })),
    maturity: r.maturity,
    controls: r.controls.map(c => ({ control: c.control, state: c.state, byClass: c.byClass, score: Math.round(c.score * 1000) / 1000 })),
    exposure: { summary: r.exposure.summary, largestCap: r.exposure.largestCap, regimes: r.exposure.regimes.map(x => ({ regime: x.regime, rag: x.rag, assessed: x.assessed, required: x.required, cap: x.cap && { amount: x.cap.amount, range: x.cap.range, currency: x.cap.currency } })) },
    findings: r.findings.map(f => ({ id: f.id, severity: f.severity, wave: f.wave, timeFrame: f.timeFrame, dataClasses: f.dataClasses })),
    roadmap: r.roadmap, pendingSource: r.pendingSource, notes: r.notes
  };
}

describe('Sovereign IQ v4 golden outputs (approved)', () => {
  const file = join(__dirname, 'golden', 'sovereign-iq-v4.json');
  const actual: Record<string, unknown> = {};
  for (const a of ARCHETYPES) for (const mode of ['executive', 'workshop'] as const) actual[`${a.id} ${mode}`] = approved(run(a.answers, mode));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const golden = JSON.parse(readFileSync(file, 'utf8'));
  for (const k of Object.keys(actual)) it(`${k} matches its approved output`, () => expect(actual[k]).toEqual(golden[k]));
});

/* -------------------------------- Invariants -------------------------------- */

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const ZONES = ['eea', 'uk', 'ch', 'us', 'ca', 'in', 'sg', 'au', 'nz', 'jp', 'hk', 'kr', 'cn', 'other'];
const optionValues = (x: any): string[] => (x.options ? x.options.map((o: any) => o.value) : x.optionsFrom ? optionValues(QUESTIONS.find(q => q.id === x.optionsFrom)) : []);

/** A random but well-formed questionnaire: every question answered, sometimes left blank. */
function randomAnswers(seed: number): Record<string, unknown> {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const some = <T,>(xs: T[], n = 3) => [...new Set(Array.from({ length: 1 + Math.floor(r() * n) }, () => pick(xs)))];
  const a: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    if (r() < 0.12) continue;
    if (q.type === 'single') a[q.id] = pick(optionValues(q));
    else if (q.type === 'multi') a[q.id] = some(optionValues(q).filter(v => v !== 'unknown' && v !== 'none'));
    else if (q.type === 'compound') a[q.id] = Object.fromEntries(q.fields.map((f: any) => [f.key, f.type === 'number_with_currency' ? { amount: Math.round(1e6 + r() * 5e9), currency: pick(['EUR', 'USD', 'GBP']) } : f.type === 'multi' ? some(optionValues(f)) : pick(optionValues(f))]));
  }
  a.A2 = { entity: some(ZONES), people: some(ZONES) };
  const classes = (a.D1 as string[] | undefined) ?? ['personal'];
  a.D1 = classes;
  a.D3 = Object.fromEntries(classes.map(c => [c, { primary: some([...ZONES, 'unknown'], 2), backup: some([...ZONES, 'unknown'], 2) }]));
  if (r() < 0.6) a.L2 = Object.fromEntries(classes.map(c => [c, { level: pick(['L0', 'L1', 'L2', 'L3', 'L4', 'unknown']), zones: some(ZONES, 2), platforms: some(optionValues(QUESTIONS.find(q => q.id === 'P1')), 2) }]));
  return a;
}

const SAMPLES = Array.from({ length: 300 }, (_, i) => randomAnswers(i + 1));
const maturityQuestions = QUESTIONS.filter(q => q.kind === 'maturity' && q.type === 'single' && q.options.some((o: any) => typeof o.state === 'number'));

describe('Sovereign IQ v4 invariants (300 random questionnaires)', () => {
  it('never returns NaN or Infinity; maturity is 0-100 or null; caps are finite and labelled', () => {
    for (const a of SAMPLES) for (const mode of ['executive', 'workshop'] as const) {
      const r = run(a, mode);
      if (r.maturity.score !== null) expect(r.maturity.score).toBeGreaterThanOrEqual(0), expect(r.maturity.score).toBeLessThanOrEqual(100);
      for (const c of r.controls) expect(Number.isFinite(c.score)).toBe(true);
      for (const e of r.exposure.regimes) if (e.cap) { expect(Number.isFinite(e.cap.eur)).toBe(true); expect(e.cap.label).toBe('cap, not expected fine'); }
    }
  });

  it('monotonic: a better answer to one maturity question never lowers maturity', () => {
    for (const a of SAMPLES.slice(0, 120)) {
      for (const q of maturityQuestions) {
        const states = q.options.filter((o: any) => typeof o.state === 'number').sort((x: any, y: any) => x.state - y.state);
        for (let i = 1; i < states.length; i++) {
          const lo = run({ ...a, [q.id]: states[i - 1].value }).maturity.score ?? 0;
          const hi = run({ ...a, [q.id]: states[i].value }).maturity.score ?? 0;
          expect(hi, `${q.id} ${states[i - 1].value} -> ${states[i].value}`).toBeGreaterThanOrEqual(lo);
        }
      }
    }
  });

  it('unknown counts as risk and a blank never flatters: neither scores above the lowest real answer', () => {
    for (const a of SAMPLES.slice(0, 120)) for (const q of maturityQuestions) {
      const lowest = q.options.filter((o: any) => typeof o.state === 'number').sort((x: any, y: any) => x.state - y.state)[0].value;
      const floor = run({ ...a, [q.id]: lowest }).maturity.score ?? 0;
      const { [q.id]: _, ...blank } = a;
      expect(run({ ...a, [q.id]: 'unknown' }).maturity.score ?? 0, q.id).toBeLessThanOrEqual(floor);
      expect(run(blank).maturity.score ?? 0, q.id).toBeLessThanOrEqual(floor);
    }
  });

  it('provider nationality alone never changes maturity below L4 (D3)', () => {
    for (const a of SAMPLES) {
      const r = run(a);
      if (r.requirements.some(x => x.required === 'L4')) continue;
      const swapped = run({ ...a, P1: ['eu_sovereign_provider'], P2: ['eea'], L2: undefined });
      const base = run({ ...a, P1: ['aws'], P2: ['us'], L2: undefined });
      if (base.requirements.some(x => x.required === 'L4')) continue;
      const onprem = (x: any) => x.controls.some((c: any) => c.control === 'SOV.OPS.OOB_MGMT');
      if (!onprem(base) && !onprem(swapped)) expect(swapped.maturity.score).toBe(base.maturity.score);
    }
  });

  it('scope answers are never scored: no control result comes from a scope question', () => {
    const scope = new Set(QUESTIONS.filter(q => q.kind !== 'maturity').map(q => q.id));
    for (const c of CONTROLS) for (const q of c.questions) expect(scope.has(q), `${c.id} ${q}`).toBe(false);
  });

  it('workshop: every required control measured by a question has that question asked (triggers cover the requirement)', () => {
    const missing = new Set<string>();
    for (const a of SAMPLES) {
      const r = run(a);
      for (const c of r.controls) {
        const qs = CONTROLS.find(x => x.id === c.control).questions;
        if (qs.length && !qs.some((q: string) => r.asked.includes(q))) missing.add(`${c.control} (${qs.join('/')})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('executive results never contain workshop-only controls or findings', () => {
    const exec = new Set(CONTROLS.filter(c => c.exec).map(c => c.id));
    for (const a of SAMPLES) {
      const r = run(a, 'executive');
      for (const c of r.controls) expect(exec.has(c.control), c.control).toBe(true);
      for (const f of r.findings.filter(f => f.type === 'control_gap')) expect(exec.has(f.control!), f.id).toBe(true);
    }
  });

  it('every result carries the engine, question set, catalogue, registry and claims-register versions', () => {
    const r = run(SAMPLES[0]);
    expect(r.versions.engine).toBe(ENGINE_VERSION);
    for (const k of ['questionSet', 'controls', 'registry', 'registryStatusAsOf', 'claimsRegister'] as const) expect(r.versions[k]).toBeTruthy();
  });

  it('findings come from gaps only: no finding for a control in place, none for provider nationality', () => {
    for (const a of SAMPLES.slice(0, 100)) {
      const r = run(a);
      for (const f of r.findings.filter(f => f.type === 'control_gap' && !f.upcoming)) {
        const c = r.controls.find(x => x.control === f.control)!;
        expect(c.state === 3 && !c.unconfirmed && !c.notAnswered, f.id).toBe(false);
      }
    }
  });

  it('the roadmap never schedules a prerequisite after the control that needs it', () => {
    const pre: Record<string, string[]> = { 'SOV.XFER.BASIS': ['SOV.DATA.MAP', 'SOV.TP.VISIBILITY'], 'SOV.RES.LOCATION': ['SOV.DATA.MAP', 'SOV.TP.VISIBILITY', 'SOV.RES.REGION_LOCK'], 'SOV.KEY.REVOCATION': ['SOV.KEY.CUSTODY'] };
    for (const a of SAMPLES) {
      const r = run(a);
      for (const f of r.findings) for (const p of pre[f.control ?? ''] ?? []) {
        const pf = r.findings.find(x => x.control === p && x.type === 'control_gap');
        if (pf) expect(pf.wave, `${p} before ${f.control}`).toBeLessThanOrEqual(f.wave);
      }
    }
  });
});
