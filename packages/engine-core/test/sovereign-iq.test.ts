/**
 * Sovereign IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run sovereign-iq, then have the legal /
 * sovereignty reviewer approve the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSovereignIq, EUR_TO_USD, GBP_TO_USD, AUD_TO_USD, INR_TO_USD } from '../src/accelerators/sovereign-iq/evaluate';
import { parseSovereignIqRequest } from '../src/accelerators/sovereign-iq/contract';
import kb from '../src/accelerators/sovereign-iq/knowledge-base.json' with { type: 'json' };

const K: any = kb;
const Q: any[] = K.questions;
const page = readFileSync(join(__dirname, '../../../Accelerators/sovereign-iq.html'), 'utf8');

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomAnswers(seed: number) {
  const r = rng(seed);
  const answers: Record<string, unknown> = {};
  for (const q of Q) {
    if (r() < 0.1) continue;
    const n = (q.opts || []).length;
    if (q.type === 'single') answers[q.id] = Math.floor(r() * n);
    else if (q.type === 'multi') answers[q.id] = [...new Set([Math.floor(r() * n), Math.floor(r() * n)])];
    else if (q.type === 'slider') answers[q.id] = q.min + Math.round((r() * (q.max - q.min)) / q.step) * q.step;
  }
  return { answers };
}

function goldenView(r: any) {
  return {
    regimes: r.inScopeRegimes.map((x: any) => `${x.regime.id ?? x.regime.code ?? x.regime.name} ${x.grade}`),
    maturity: { score: r.maturity.score, stage: r.maturity.stage?.label ?? null },
    completeness: r.completeness, lowConfidence: r.lowConfidence, turnoverAssumed: r.fin.turnoverAssumed,
    pillars: Object.fromEntries(Object.entries(r.pillarScores).map(([k, v]: any) => [k, v?.score ?? v])),
    statutoryCeiling: Math.round(r.fin.statutoryCeiling), fines: r.fin.components.map((c: any) => `${c.law} ${Math.round(c.amt)}`),
    probes: (r.probes || []).map((p: any) => p.id)
  };
}

describe('Sovereign IQ contract', () => {
  it('accepts any questionnaire the page can produce, and every demo client', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parseSovereignIqRequest(randomAnswers(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
    for (const a of Object.values<any>(K.demoArchetypes)) {
      const res = parseSovereignIqRequest({ answers: a.answers });
      expect(res.ok ? [] : res.errors, a.id).toEqual([]);
    }
  });

  it('rejects unknown questions and malformed answers, and drops session details', () => {
    const bad = parseSovereignIqRequest({ answers: { Q99: 1, 'Q1.1': 99, 'Q2.2': 500 } });
    const errors = bad.ok ? '' : bad.errors.join('\n');
    expect(errors).toContain('answers.Q99: unknown question');
    expect(errors).toContain('answers.Q1.1: expected an option index');
    expect(errors).toContain('answers.Q2.2: expected a number');
    const good = parseSovereignIqRequest({ answers: {}, session: { clientName: 'Acme', leadConsultant: 'X' } });
    expect(good.ok && good.value).toEqual({ answers: {} });
  });

  it('the page no longer scores locally', () => {
    expect(page).not.toMatch(/function (computeFacts|evaluateRegimes|computePillarScores|computeOverallMaturity|calculateFinancialExposure|generateRoadmap|analyzeEstateAnomalies)\(/);
  });
});

describe('Sovereign IQ golden master (approved outputs)', () => {
  const inputs: Record<string, any> = Object.fromEntries(Object.values<any>(K.demoArchetypes).map(a => [`demo-${a.id}`, { answers: a.answers }]));
  inputs['unanswered'] = { answers: {} };
  const file = join(__dirname, 'golden/sovereign-iq.json');
  const actual = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, goldenView(evaluateSovereignIq(i))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(inputs)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
});

describe('Sovereign IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 6000 + i, input: randomAnswers(6000 + i) }))
    .map(x => ({ ...x, r: evaluateSovereignIq(x.input) as any }));

  it('never returns NaN, Infinity or undefined in scores or fines', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify({ m: r.maturity, p: r.pillarScores, f: r.fin }, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
    }
  });

  it('keeps maturity and pillar scores within 0-100', () => {
    for (const { seed, r } of runs) {
      // A pillar with no answered questions is null ("not assessed"); every assessed score is within 0-100.
      for (const v of [r.maturity.score, ...Object.values<any>(r.pillarScores).filter(p => p !== null)]) {
        expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(0);
        expect(v, `seed ${seed}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('the statutory ceiling is the largest single fine, never a sum', () => {
    for (const { seed, r } of runs) {
      const amts = r.fin.components.map((c: any) => c.amt);
      if (amts.length) expect(Math.round(r.fin.statutoryCeiling), `seed ${seed}`).toBe(Math.round(Math.max(...amts)));
    }
  });
});

describe('Sovereign IQ regressions fixed in Phase 2', () => {
  it('every report view on the page reads the server result (the browser engine found no regimes and no fines)', () => {
    for (const fn of ['buildSovereignPromptPayload', 'generateRuleBasedSovereignMemo', 'openEmailModal', 'renderSlide', 'generateMarpMarkdown',
      'openTIAModal', 'downloadSovereignExecutivePDF', 'openSOWModal', 'openRFPModal', 'openExamModal', 'downloadSupervisoryDefenseBinder']) {
      const start = page.indexOf(`function ${fn}(`);
      expect(start, fn).toBeGreaterThan(0);
      expect(page.slice(start, start + 300), fn).toContain("if (!STATE.evaluation) { showSovereignScoringError(); return ''; }");
    }
  });

  it('the page sends answers only (no client or consultant details)', () => {
    expect(page).toContain('const payload = { answers: STATE.answers };');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Phase 3 scoring audit. Each test fails on the Phase 2 code.
// ---------------------------------------------------------------------------------------------------------------
const run = (answers: Record<string, unknown>) => evaluateSovereignIq({ answers }) as any;
const ids = (r: any) => r.inScopeRegimes.map((x: any) => x.regime.id);
const grade = (r: any, id: string) => r.inScopeRegimes.find((x: any) => x.regime.id === id)?.grade;
const opt = (qid: string, i: number) => Q.find(q => q.id === qid).opts[i];
const fine = (r: any, law: string) => r.fin.components.find((c: any) => c.law.startsWith(law));

/** The page's clause register, evaluated as the browser would run it. */
function pageClauses() {
  const start = page.indexOf('function NOT_ASSESSED(');
  const end = page.indexOf('var CURRENT_CLAUSE_FILTER');
  expect(start, 'NOT_ASSESSED helper').toBeGreaterThan(0);
  return new Function(page.slice(start, end) + '\nreturn CLAUSE_DATASET;')() as any[];
}

describe('Sovereign IQ Phase 3: audit register', () => {
  it('uses fact names the engine produces (conc_critical, oob_connected)', () => {
    expect(page).not.toMatch(/ctpp_critical|onprem_oob_connected/);
    const facts = new Set(Q.flatMap(q => (q.opts || []).flatMap((o: any) => Object.keys(o.fact || {}))));
    const register = page.slice(page.indexOf('var CLAUSE_DATASET = ['), page.indexOf('var CURRENT_CLAUSE_FILTER'));
    const used = [...register.matchAll(/facts\.([a-z0-9_]+)/g)].map(m => m[1]);
    for (const f of ['conc_critical', 'oob_connected']) expect(used).toContain(f);
    for (const f of used) expect(facts.has(f), `facts.${f}`).toBe(true);
  });

  it('shows "Not assessed" (never "Compliant") when the underlying answer is missing', () => {
    for (const c of pageClauses()) expect(c.eval({}, {}).status, c.id).toBe('Not assessed');
  });

  it('never judges the DORA Register of Information from the hardware-provenance question', () => {
    const roi = pageClauses().find(c => c.id === 'DORA_28_1');
    for (const a of [0, 1, 2]) expect(roi.eval({}, { 'Q7.3': a }).status).toBe('Not assessed');
  });

  it('judges concentration clauses from Q7.1 and KSA telemetry from Q5.2', () => {
    const c = Object.fromEntries(pageClauses().map(x => [x.id, x]));
    expect(c.NIS2_21_2D.eval({ conc_critical: true }, { 'Q7.1': 0 }).status).toBe('Critical Gap');
    expect(c.APRA_CPS230.eval({ conc_critical: true }, { 'Q7.1': 0 }).status).toBe('Critical Gap');
    expect(c.KSA_PDPL_29.eval({ oob_connected: true }, { 'Q3.3': 0, 'Q5.2': 1 }).status).toBe('Partial Deficiency');
  });

  it('lists only clauses of in-scope regimes, keyed by real regime ids', () => {
    const regimeIds = new Set(K.regimes.map((r: any) => r.id));
    for (const c of pageClauses()) expect(regimeIds.has(c.regimeId), c.regimeId).toBe(true);
    const fn = page.slice(page.indexOf('function renderClauseAuditRegister('), page.indexOf('function filterClauseRegister('));
    expect(fn).toContain('inScopeIds.indexOf(item.regimeId) >= 0');
  });
});

describe('Sovereign IQ Phase 3: each answer counts once', () => {
  it('a pillar score is the mean of its answered options (no duplicate fact pushes)', () => {
    expect(run({ 'Q7.1': 2, 'Q7.2': 0 }).pillarScores.P5).toBe(Math.round((90 + 95) / 2));
    expect(run({ 'Q7.1': 2, 'Q7.2': 2 }).pillarScores.P5).toBe(Math.round((90 + 15) / 2));
    expect(run({ 'Q6.1': 0, 'Q6.3': 2 }).pillarScores.P4).toBe(Math.round((100 + 10) / 2));
    expect(run({ 'Q5.1': 0, 'Q5.2': 1, 'Q5.3': 2 }).pillarScores.P3).toBe(Math.round((95 + 35 + 15) / 3));
    expect(run({ 'Q3.2': 0, 'Q3.3': 2 }).pillarScores.P1).toBe(Math.round((90 + 10) / 2));
    expect(run({ 'Q4.3': 0, 'Q4.2': 2 }).pillarScores.P2).toBe(Math.round((100 + 10) / 2));
  });

  it('holds over random questionnaires for P1, P3, P4 and P5', () => {
    const groups: Record<string, string[]> = { P1: ['Q3.2', 'Q3.3'], P3: ['Q5.1', 'Q5.2', 'Q5.3'], P4: ['Q6.1', 'Q6.2', 'Q6.3'], P5: ['Q7.1', 'Q7.2', 'Q7.3'] };
    for (let seed = 1; seed <= 200; seed++) {
      const { answers } = randomAnswers(seed) as any;
      const r = run(answers);
      for (const [p, qs] of Object.entries(groups)) {
        const s = qs.filter(q => answers[q] != null).map(q => opt(q, answers[q]).score);
        expect(r.pillarScores[p], `seed ${seed} ${p}`).toBe(s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null);
      }
    }
  });

  it('holding national-security data does not lower P1', () => {
    expect(run({ 'Q3.1': [2], 'Q3.2': 0 }).pillarScores.P1).toBe(90);
  });
});

describe('Sovereign IQ Phase 3: missing data', () => {
  it('an empty assessment is not scored "Structured" from defaults', () => {
    const r = run({});
    expect(r.maturity.score).toBe(0);
    expect(r.maturity.stage).toBeNull();
    expect(r.pillarScores).toEqual({ P1: null, P2: null, P3: null, P4: null, P5: null });
    expect(r.pillarAssessed).toEqual({ P1: false, P2: false, P3: false, P4: false, P5: false });
    expect(r.completeness).toEqual({ answered: 0, total: Q.length });
    expect(r.lowConfidence).toBe(true);
  });

  it('unanswered pillars are left out of maturity, and a thin assessment is flagged', () => {
    const r = run({ 'Q3.2': 2, 'Q3.3': 2 });
    expect(r.pillarAssessed).toEqual({ P1: true, P2: false, P3: false, P4: false, P5: false });
    expect(r.maturity.score).toBe(r.pillarScores.P1);
    expect(r.lowConfidence).toBe(true);
    const full = run(K.demoArchetypes.saudi_bank.answers);
    expect(full.lowConfidence).toBe(false);
    expect(full.completeness).toEqual({ answered: Q.length, total: Q.length });
  });

  it('the page shows a placeholder stage and "Not assessed" pillars instead of crashing or printing null', () => {
    expect(page).toContain('function normalizeSovereignEvaluation(');
    expect(page).toContain('STATE.evaluation = normalizeSovereignEvaluation(json.data);');
    expect(page).not.toMatch(/pillarScores\.P[1-5] \+ "\/100|\$\{pillarScores\.P[1-5]\}\s*\/\s*100/);
  });

  it('flags an assumed turnover and shows it next to the ceiling', () => {
    expect(run({ 'Q1.2': [0] }).fin.turnoverAssumed).toBe(true);
    expect(run({ 'Q1.2': [0], 'Q1.3': 2 }).fin.turnoverAssumed).toBe(false);
    expect(page).toContain('" (assumes $" + (fin.turnover / 1000000000).toFixed(0) + "B turnover)"');
    expect(page).toMatch(/displayFineDesc = .*turnoverNote\(fin\)/);
  });
});

describe('Sovereign IQ Phase 3: regime scope', () => {
  const retailWithFinancialData = (geo: number) => run({ 'Q1.1': 6, 'Q1.2': [geo], 'Q3.1': [0] });
  it('MAS TRM, APRA CPS 230, SAMA and CBUAE/DESC need the BFSI sector, not just financial data', () => {
    expect(ids(retailWithFinancialData(5))).not.toContain('SG_MAS_TRM');
    expect(ids(retailWithFinancialData(6))).not.toContain('AU_APRA_CPS230');
    expect(ids(retailWithFinancialData(2))).not.toContain('KSA_SAMA_CITC');
    expect(ids(retailWithFinancialData(3))).not.toContain('UAE_DESC_CBUAE');
    expect(ids(run({ 'Q1.1': 0, 'Q1.2': [5] }))).toContain('SG_MAS_TRM');
  });

  it('DORA applies only with EU presence (a UK-only bank is advisory)', () => {
    expect(grade(run({ 'Q1.1': 0, 'Q1.2': [1] }), 'DORA')).toBe('advisory');
    expect(grade(run({ 'Q1.1': 0, 'Q1.2': [0] }), 'DORA')).toBe('applies');
  });

  it('CLOUD Act and FISA 702 key to a US-headquartered provider, not any cloud use', () => {
    const sovereign = run({ 'Q1.2': [0], 'Q2.1': [0, 2], 'Q4.1': 1 });
    expect(ids(sovereign)).not.toContain('US_CLOUD_ACT');
    expect(ids(sovereign)).not.toContain('US_FISA_702');
    const us = run({ 'Q1.2': [0], 'Q4.1': 0 });
    expect(ids(us)).toEqual(expect.arrayContaining(['US_CLOUD_ACT', 'US_FISA_702']));
  });
});

describe('Sovereign IQ Phase 3: exposure', () => {
  it('a UK-only firm gets UK GDPR (GBP 17.5M floor in USD), not EU GDPR', () => {
    const r = run({ 'Q1.2': [1], 'Q1.3': 3 });
    expect(fine(r, 'EU GDPR')).toBeUndefined();
    expect(fine(r, 'UK GDPR').amt).toBeCloseTo(17500000 * GBP_TO_USD);
  });

  it('EUR floors are converted to USD', () => {
    const r = run({ 'Q1.2': [0], 'Q1.3': 3, 'Q2.3': 0 });
    expect(EUR_TO_USD).not.toBe(1);
    expect(fine(r, 'EU GDPR').amt).toBeCloseTo(20000000 * EUR_TO_USD);
    expect(fine(r, 'EU AI Act').amt).toBeCloseTo(15000000 * EUR_TO_USD);
  });

  it('Australia: Privacy Act 1988 (as amended 2022), greater of AUD 50M or 30% of turnover, no "APRA"', () => {
    const small = run({ 'Q1.2': [6], 'Q1.3': 3 });
    expect(fine(small, 'Privacy Act 1988 (as amended 2022)').amt).toBeCloseTo(Math.max(50000000 * AUD_TO_USD, 100000000 * 0.3));
    const big = run({ 'Q1.2': [6], 'Q1.3': 0 });
    expect(fine(big, 'Privacy Act 1988').amt).toBeCloseTo(10000000000 * 0.3);
    expect(big.fin.components.map((c: any) => c.law).join()).not.toContain('APRA');
  });

  it('India DPDP is quantified at INR 250 crore when it applies', () => {
    expect(fine(run({ 'Q1.2': [7] }), 'India DPDP').amt).toBeCloseTo(2500000000 * INR_TO_USD);
  });

  it('DORA penalty text: national penalties for financial entities, Art. 35 only for critical ICT providers', () => {
    const dora = K.regimes.find((r: any) => r.id === 'DORA').penalty_rule;
    expect(dora).toMatch(/national law/);
    expect(dora).toMatch(/Critical ICT third-party providers only/);
    expect(page).not.toContain('Periodic penalty payments up to 1% daily global turnover for CTPPs; severe supervisory sanctions.');
  });
});

describe('Sovereign IQ Phase 3: page labels', () => {
  it('target mode computes its stage label from the score', () => {
    expect(page).not.toContain('Stage 4 &middot; Sovereign-by-Design');
    expect(page).toContain('var targetStage = stageForScore(TARGET_SCORE);');
  });

  it('the 24h figure is labelled as an illustrative outage cost', () => {
    expect(page).not.toContain('Operational disruption under cloud subpoena');
    expect(page).toContain('Illustrative cost of a 24-hour outage (turnover-based)');
  });

  it('the turnover hint names the AI Act 3% tier and drops "APRA 30%"', () => {
    const hint = Q.find(q => q.id === 'Q1.3').hint;
    expect(hint).toContain('AI Act 3%');
    expect(hint).not.toContain('APRA');
    expect(page).not.toContain('APRA 30%');
  });

  it('absolute claims are softened', () => {
    for (const claim of ['cleartext disclosure impossible', 'provably immune', 'Total immunity', '100% immune']) {
      expect(page, claim).not.toContain(claim);
      expect(JSON.stringify(K), claim).not.toContain(claim);
    }
  });
});
