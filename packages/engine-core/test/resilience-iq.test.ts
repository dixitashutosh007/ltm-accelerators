/**
 * Resilience IQ: Phase 2 test suite (same pattern as the other accelerators; see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run resilience-iq, then have the BCP/DR
 * practice lead review the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateResilienceIq, type ResilienceResult } from '../src/accelerators/resilience-iq/evaluate';
import { parseResilienceIqRequest, MAX_ANSWER_KEYS } from '../src/accelerators/resilience-iq/contract';
import { resilienceKnowledge } from '../src/accelerators/resilience-iq/knowledge';
import { ARCHETYPES } from './resilience-iq-samples';

const BANK: any = resilienceKnowledge.questionBank;
const EXEC: any[] = BANK.executive_questions;
const ADVISORY: any[] = BANK.advisory_questions;
const ALL = [...EXEC, ...ADVISORY];
const RATINGS: Array<[number, string]> = [[90, 'Adaptive'], [75, 'Resilient'], [60, 'Managed'], [40, 'Fragile'], [0, 'Critical Exposure']];

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
/** A valid answer for any question, as the page sends it (option labels; EX-05 as its matrix). */
function randomAnswer(q: any, r: () => number): unknown {
  const type = q.ui?.interaction || q.type;
  const pick = (xs: any[]) => xs[Math.floor(r() * xs.length)];
  if (type === 'matrix') return Object.fromEntries(q.ui.rows.map((row: string) => [row, pick(q.ui.columns)]));
  if (type === 'multi_select' || type === 'ranking' || type === 'evidence_select') {
    const chosen = q.options.filter(() => r() < 0.4);
    return chosen.length ? chosen : [pick(q.options)];
  }
  return pick(q.options);
}
function randomQuestionnaire(seed: number) {
  const r = rng(seed);
  const answers: Record<string, unknown> = {};
  for (const q of EXEC) if (r() < 0.93) answers[q.id] = randomAnswer(q, r);
  for (const q of ADVISORY) if (r() < 0.3) answers[q.id] = randomAnswer(q, r);
  return answers;
}
/** Answers every triggered advisory question (they cascade) with its first option, until none remain. */
function completeAdvisory(answers: Record<string, unknown>) {
  const out = { ...answers };
  for (let round = 0; round < 10; round++) {
    const open = evaluateResilienceIq(out as any).nextQuestions.filter(q => q.id.startsWith('AF-') && out[q.id] === undefined);
    if (!open.length) break;
    for (const { id } of open) {
      const q = ADVISORY.find(x => x.id === id);
      out[id] = q.type === 'multi_select' ? [q.options[0]] : q.options[0];
    }
  }
  return out;
}
const walk = (v: unknown, path: string, out: string[]) => {
  if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) out.push(path);
  else if (typeof v === 'function') out.push(path + ' (function)');
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, out);
};

ARCHETYPES['retailer-advisory-complete'] = completeAdvisory(ARCHETYPES['retailer-untested-gated']);
ARCHETYPES['saas-cloud-native'] = {
  ...ARCHETYPES['regulated-bank-tested'],
  'EX-01': ['Customer-facing services'], 'EX-03': '15-60 minutes', 'EX-04': '<15 minutes', 'EX-08': 'No, recovery is isolated', 'EX-11': 'High concentration',
  'EX-18': ['AWS', 'SaaS'], 'EX-20': 'High — tested'
};

function goldenView(r: ResilienceResult) {
  return {
    status: r.status, score: r.score, postureScore: r.postureScore, rating: r.rating, maturity: r.maturity,
    evidenceConfidence: r.evidenceConfidence, criticalExposure: r.criticalExposure, domainScores: r.domainScores,
    preferredPattern: r.preferredPattern, alternatives: r.alternatives, eliminatedPatterns: r.eliminatedPatterns,
    patternRanking: r.patternRanking.map(p => `${p.id}:${p.score}`), mandatoryControls: r.mandatoryControls,
    gaps: r.gapRegister.map(g => g.id), nextQuestions: r.nextQuestions.map(q => q.id), evidenceRequests: r.evidenceRequests,
    roadmap: r.roadmap, recommendationConfidence: r.recommendationConfidence, executiveSummary: r.executiveSummary
  };
}

describe('Resilience IQ golden master (approved outputs)', () => {
  const file = join(__dirname, 'golden/resilience-iq.json');
  const actual = Object.fromEntries(Object.entries(ARCHETYPES).map(([k, a]) => [k, goldenView(evaluateResilienceIq(a as any))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(ARCHETYPES)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));

  it('the sample clients cover ready, gated, objectives-missing and empty assessments', () => {
    expect(actual['regulated-bank-tested'].status).toBe('ready');
    expect(actual['retailer-untested-gated'].status).toBe('requirements_incomplete');
    expect(actual['retailer-advisory-complete'].status).toBe('ready');
    expect(actual['objectives-unknown'].status).toBe('requirements_incomplete');
    expect(actual['empty'].status).toBe('requirements_incomplete');
  });

  it('every sample client is a valid request under the contract', () => {
    for (const [name, answers] of Object.entries(ARCHETYPES)) expect(parseResilienceIqRequest({ answers }), name).toEqual({ ok: true, value: { answers } });
  });
});

describe('Resilience IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 9000 + i, answers: randomQuestionnaire(9000 + i) }))
    .map(x => ({ ...x, r: evaluateResilienceIq(x.answers as any) }));

  it('every generated questionnaire passes the request contract', () => {
    for (const { seed, answers } of runs) expect(parseResilienceIqRequest({ answers }).ok, `seed ${seed}`).toBe(true);
  });

  it('never returns NaN, Infinity, undefined or a function anywhere in the result', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      walk(JSON.parse(JSON.stringify(r)), 'result', bad);
      walk(r.executiveReport, 'executiveReport', bad);
      expect(bad, `seed ${seed}`).toEqual([]);
    }
  });

  it('a ready result has integer scores in 0-100, a rating = posture band capped by critical exposure, and a strategy', () => {
    const order = ['Critical Exposure', 'Fragile', 'Managed', 'Resilient', 'Adaptive'];
    const cap: Record<string, number> = { Severe: 1, High: 2, Moderate: 4, Low: 4 };
    for (const { seed, r } of runs.filter(x => x.r.status === 'ready')) {
      for (const v of [r.score, r.postureScore]) expect(Number.isInteger(v) && v! >= 0 && v! <= 100, `seed ${seed}`).toBe(true);
      const band = RATINGS.find(([min]) => r.postureScore! >= min)![1];
      expect(r.rating, `seed ${seed}`).toBe(order[Math.min(order.indexOf(band), cap[r.criticalExposure!])]);
      expect(r.preferredPattern, `seed ${seed}`).toMatch(/^DR-0[1-5]$/);
      expect(r.eliminatedPatterns, `seed ${seed}`).not.toContain(r.preferredPattern);
      expect(r.blueprint, `seed ${seed}`).not.toBeNull();
    }
  });

  it('an incomplete result issues no score, strategy or blueprint, and says what is missing', () => {
    for (const { seed, r } of runs.filter(x => x.r.status !== 'ready')) {
      expect([r.score, r.postureScore, r.preferredPattern, r.blueprint], `seed ${seed}`).toEqual([null, null, null, null]);
      expect(r.nextQuestions.length + (r.evidenceRequests.length ? 1 : 0), `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('maturity "Tested" or above only with recent, scenario-based recovery testing', () => {
    for (const { seed, answers, r } of runs.filter(x => x.r.status === 'ready' && x.r.maturity!.level >= 4)) {
      expect(['Within 3 months', '3-12 months ago'], `seed ${seed}`).toContain(answers['EX-07']);
      expect(['Yes, regularly', 'Yes, occasionally'], `seed ${seed}`).toContain(answers['EX-16']);
    }
  });

  it('asks at most 8 follow-up questions at a time and never one already answered', () => {
    for (const { seed, answers, r } of runs) {
      expect(r.nextQuestions.length, `seed ${seed}`).toBeLessThanOrEqual(8);
      for (const q of r.nextQuestions) expect(answers[q.id], `seed ${seed} ${q.id}`).toBeUndefined();
    }
  });

  it('the executive report repeats the runtime result rather than computing its own', () => {
    for (const { seed, r } of runs) {
      expect(r.executiveReport.roadmap, `seed ${seed}`).toEqual(r.roadmap);
      expect(r.executiveReport.recommendationConfidence, `seed ${seed}`).toEqual(r.recommendationConfidence);
      expect(r.executiveReport.recoveryStrategy.preferred, `seed ${seed}`).toBe(r.preferredPattern);
      expect(r.executiveReport.targetState, `seed ${seed}`).toBe(r.blueprint);
    }
  });

  it('a result is deterministic', () => {
    for (const { answers, r } of runs.slice(0, 50)) expect(evaluateResilienceIq(answers as any)).toEqual(r);
  });
});

describe('Resilience IQ request contract', () => {
  const baseline = ARCHETYPES['regulated-bank-tested'];

  it('rejects a body that is not an object, missing answers, or too many fields', () => {
    expect(parseResilienceIqRequest(null)).toEqual({ ok: false, errors: ['Request body must be a JSON object.'] });
    expect(parseResilienceIqRequest({})).toEqual({ ok: false, errors: ['Missing or invalid "answers" payload.'] });
    const many = Object.fromEntries(Array.from({ length: MAX_ANSWER_KEYS + 1 }, (_, i) => [`X-${i}`, 'x']));
    expect(parseResilienceIqRequest({ answers: many }).ok).toBe(false);
  });

  it('rejects option indexes, retired labels and unknown questions, reporting every problem', () => {
    const res = parseResilienceIqRequest({ answers: { ...baseline, 'EX-06': 2, 'EX-20': 'Low — uncertain', 'EX-99': 'x' } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toEqual(['Invalid value for answer EX-06.', 'Invalid value for answer EX-20.', 'Unknown answer field: EX-99.']);
  });

  it('requires a full EX-05 dependency matrix with known rows and columns', () => {
    const partial = parseResilienceIqRequest({ answers: { ...baseline, 'EX-05': { Applications: 'Validated' } } });
    expect(partial.ok).toBe(false);
    const wrong = parseResilienceIqRequest({ answers: { ...baseline, 'EX-05': { ...(baseline['EX-05'] as object), Data: 'Mostly' } } });
    expect(wrong.ok).toBe(false);
  });

  it('accepts EX-01 as a selection of critical services, and rejects duplicates or unknown services', () => {
    expect(parseResilienceIqRequest({ answers: { ...baseline, 'EX-01': ['Other'] } }).ok).toBe(true);
    expect(parseResilienceIqRequest({ answers: { ...baseline, 'EX-01': ['Other', 'Other'] } }).ok).toBe(false);
    expect(parseResilienceIqRequest({ answers: { ...baseline, 'EX-01': ['Everything'] } }).ok).toBe(false);
  });
});

describe('Resilience IQ regression tests', () => {
  it('EX-01 is a multi-select of critical services, not a ranking of every option (always "very high")', () => {
    const ex01 = EXEC.find(q => q.id === 'EX-01');
    expect(ex01.ui.interaction).toBe('multi_select');
    const workforceOnly = evaluateResilienceIq({ ...ARCHETYPES['regulated-bank-tested'], 'EX-01': ['Workforce-critical services'] } as any);
    expect(workforceOnly.executiveReport.businessRequirements.recoveryPriority).toBe('high');
  });

  it('untested cyber recovery registers the cyber recovery gap even when ransomware was not declared in scope', () => {
    const r = evaluateResilienceIq({ ...ARCHETYPES['saas-cloud-native'], 'AF-CY-04': 'No' } as any);
    expect(r.gapRegister.map(g => g.id)).toContain('G-05');
    expect(r.mandatoryControls).toContain('CYBER-01');
  });

  it('the executive report carries the roadmap waves and recommendation sensitivity (were a function and missing)', () => {
    const r = evaluateResilienceIq(ARCHETYPES['regulated-bank-tested'] as any);
    expect(Array.isArray(r.executiveReport.roadmap) && r.executiveReport.roadmap.length).toBe(4);
    expect(r.executiveReport.recommendationSensitivity.map(s => s.id)).toContain('SENS-01');
    expect(r.recommendationConfidence).toBeDefined();
  });
});

describe('Resilience IQ scoring audit fixes (R3)', () => {
  const bank = ARCHETYPES['regulated-bank-tested'];
  const run = (extra: Record<string, unknown>) => evaluateResilienceIq({ ...bank, ...extra } as any);
  const gaps = (r: ResilienceResult) => r.gapRegister.map(g => g.id);

  it('AF-DR-04: recovery that fails with production ("Yes") is the gap; independent recovery ("No") is not penalised', () => {
    const independent = run({ 'AF-DR-04': 'No' }), correlated = run({ 'AF-DR-04': 'Yes' });
    expect(gaps(correlated)).toContain('G-04');
    expect(correlated.score!).toBeLessThan(independent.score!);
    expect(independent.score).toBe(run({}).score);
  });

  it('AF-CL-01: separating failure domains is not penalised; "None" is', () => {
    expect(run({ 'AF-CL-01': ['Identity plane', 'Cloud provider'] }).score).toBe(run({}).score);
    expect(run({ 'AF-CL-01': ['None'] }).score!).toBeLessThan(run({}).score!);
  });

  it('AF-CY-03: no isolated identity recovery path is an identity gap (G-06), not "unrecoverable data" (G-03)', () => {
    const r = run({ 'AF-CY-03': 'No' });
    expect(gaps(r)).toContain('G-06');
    expect(gaps(r)).not.toContain('G-03');
  });

  it('AF-CY-01: backups that production credentials can destroy are a backup gap (was never read)', () => {
    expect(gaps(run({ 'AF-CY-01': 'Yes' }))).toContain('G-03');
    expect(gaps(run({ 'AF-CY-01': 'No' }))).not.toContain('G-03');
  });

  it('AF-TP-04 options match the question bank ("Provider test evidence" was never recognised)', () => {
    expect(run({ 'AF-TP-04': 'Provider test evidence' }).score!).toBeLessThan(run({ 'AF-TP-04': 'Independent validation' }).score!);
  });

  it('EX-20 "Medium — documented but not fully tested" is "documented" evidence, not "tested"', () => {
    expect(run({ 'EX-20': 'Medium — documented but not fully tested' }).evidenceConfidence).toBe('documented');
  });

  it('EX-08 "Unknown" is treated like "Potentially": cyber gap, cyber controls and the advisory gate apply', () => {
    const unknown = run({ 'EX-08': 'Unknown', 'EX-06': 'Likely, but not recently tested' });
    const potentially = run({ 'EX-08': 'Potentially', 'EX-06': 'Likely, but not recently tested' });
    expect(unknown.status).toBe(potentially.status);
    const ready = run({ 'EX-08': 'Unknown' });
    expect(gaps(ready)).toContain('G-05');
    expect(ready.mandatoryControls).toContain('CYBER-01');
  });

  it('a critical gap caps the headline: no "Resilient" or "Adaptive" rating with high or severe critical exposure', () => {
    const r = run({ 'EX-09': 'No' }); // no recoverable backup
    expect(['High', 'Severe']).toContain(r.criticalExposure);
    expect(['Resilient', 'Adaptive']).not.toContain(r.rating);
  });

  it('maturity "Tested" needs recent scenario testing: a never-tested estate claiming independent validation is at most "Defined"', () => {
    const r = run({ 'EX-07': 'Never', 'EX-16': 'No', 'EX-20': 'High — independently validated' });
    expect(r.maturity!.level).toBeLessThanOrEqual(3);
  });

  it('scope inputs (critical services, environments) do not move the posture score; governance (EX-15) does', () => {
    expect(run({ 'EX-18': ['On-premises'] }).postureScore).toBe(run({ 'EX-18': ['AWS', 'SaaS', 'Azure'] }).postureScore);
    expect(run({ 'EX-01': ['Other'] }).postureScore).toBe(run({}).postureScore);
    expect(run({ 'EX-15': 'No' }).postureScore!).toBeLessThan(run({}).postureScore!);
  });

  it('demanding recovery objectives are requirements, not capability: they do not raise the posture score', () => {
    expect(run({ 'EX-03': '4-24 hours', 'EX-04': '1-4 hours' }).postureScore).toBe(run({}).postureScore);
  });

  it('a withheld result does not leak the posture score in its decision log', () => {
    const r = evaluateResilienceIq(ARCHETYPES['retailer-untested-gated'] as any);
    expect(r.status).toBe('requirements_incomplete');
    expect(r.decisionLog.join(' ')).not.toMatch(/posture score: \d/);
  });
});
