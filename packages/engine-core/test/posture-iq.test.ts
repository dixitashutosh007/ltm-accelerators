/**
 * Posture IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run posture-iq, then have the legal /
 * regulatory reviewer approve the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluatePostureIq, evaluateQuestionScore, PROBE_CONDITIONS, GBP_TO_USD, type PostureIqEvaluation } from '../src/accelerators/posture-iq/evaluate';
import { parsePostureIqRequest } from '../src/accelerators/posture-iq/contract';
import kb from '../src/accelerators/posture-iq/knowledge-base.json' with { type: 'json' };

const K: any = kb;
const Q: any[] = K.questions;
const REGS: string[] = K.regulations.map((r: any) => r.id);
const page = readFileSync(join(__dirname, '../../../Accelerators/posture-iq.html'), 'utf8');
const EUR_TO_USD = 1.08;

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomInput(seed: number) {
  const r = rng(seed);
  const pick = (a: any[]) => a[Math.floor(r() * a.length)];
  const answers: Record<string, unknown> = {};
  for (const q of Q) {
    if (r() < 0.15) continue;
    if (q.type === 'single' || q.type === 'boolean') answers[q.id] = pick(q.options).value;
    else if (q.type === 'multi') answers[q.id] = [...new Set([pick(q.options).value, pick(q.options).value])];
    else if (q.type === 'scale') answers[q.id] = pick(q.scale).v;
    else if (q.type === 'matrix') answers[q.id] = Object.fromEntries(q.rows.map((row: any) => [row.id, pick(q.cols).id]));
  }
  const regulations = REGS.filter(() => r() < 0.4);
  return { answers, org: { name: 'Client ' + seed, turnover: Math.round(r() * 20e9) + 1e6 }, regulations, sectors: [pick(K.sectors).id], mode: 'workshop' as const };
}

function goldenView(r: PostureIqEvaluation) {
  return {
    overallScore: r.overallScore, label: r.label.t,
    coverage: `${r.coverage.answered}/${r.coverage.total}${r.lowConfidence ? ' low-confidence' : ''}`,
    pillars: r.pillarScores.pillars.map(p => `${p.id} ${p.score} ${p.status}`),
    counts: r.counts,
    findings: r.findings.map((f: any) => `${f.qid} ${f.severity} ${f.reg}${f.row ? ' ' + f.row : ''}`),
    obligations: r.obligations.map((f: any) => `${f.qid} ${f.baseSeverity} ${f.reg}`),
    fines: r.penalties.fines.map((f: any) => `${f.regId} ${f.capUSD} ${f.status}`),
    totalValueAtStake: r.penalties.totalValueAtStake, riskHedgeRatio: r.penalties.riskHedgeRatio,
    probes: (r.triggeredProbes || []).map((p: any) => p.id)
  };
}

describe('Posture IQ contract', () => {
  it('accepts any questionnaire the page can produce, and every demo archetype', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parsePostureIqRequest(randomInput(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
    for (const a of Object.values<any>(K.demoArchetypes)) {
      const res = parsePostureIqRequest({ answers: a.answers, org: { name: a.name, turnover: a.turnover }, regulations: a.regulations, sectors: a.sectors });
      expect(res.ok ? [] : res.errors, a.key).toEqual([]);
    }
  });

  it('rejects unknown questions, malformed answers and unknown regulations with readable reasons', () => {
    const res = parsePostureIqRequest({ answers: { ZZ: 1, A2: 'bank', C2: { pii: 'mars' } }, regulations: ['gdpr', 'ccpa'], org: { turnover: -1 } });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('answers.ZZ: unknown question');
    expect(errors).toContain('answers.A2: expected one of');
    expect(errors).toContain('answers.C2: unknown column for pii');
    expect(errors).toContain('regulations');
    expect(errors).toContain('org.turnover');
  });

  it('the page no longer scores locally, and its question bank carries no findings or severities', () => {
    expect(page).not.toMatch(/function (computePillarScores|evaluateQuestionScore|calculateStatutoryPenalties|getTriggeredProbes|collectAllFindings)\(/);
    expect(page).not.toMatch(/"sev":|"cellFindings"/);
  });
});

describe('Posture IQ golden master (approved outputs)', () => {
  const inputs: Record<string, any> = Object.fromEntries(Object.values<any>(K.demoArchetypes).map(a => [
    `demo-${a.key}`, { answers: a.answers, org: { turnover: a.turnover }, regulations: a.regulations, sectors: a.sectors }
  ]));
  inputs['unanswered-default-scope'] = { answers: {} };
  const file = join(__dirname, 'golden/posture-iq.json');
  const actual = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, goldenView(evaluatePostureIq(i))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(inputs)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
});

describe('Posture IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 5000 + i, input: randomInput(5000 + i) }))
    .map(x => ({ ...x, r: evaluatePostureIq(x.input) }));

  it('never returns NaN, Infinity or undefined', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
    }
  });

  it('keeps scores within 0-100 and the label consistent with the score', () => {
    const label = (s: number) => (s >= 85 ? 'Defensible' : s >= 65 ? 'Improving / Managed' : s >= 40 ? 'Material Exposure' : 'Critical Non-Compliance');
    for (const { seed, r } of runs) {
      for (const v of [r.overallScore, ...r.pillarScores.pillars.map(p => p.score).filter((s): s is number => s !== null)]) expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
      // With no answered scored question there is no score to label (Phase 3: missing data is not scored).
      expect(r.label.t, `seed ${seed}`).toBe(r.coverage.answered ? label(r.overallScore) : 'Not assessed');
    }
  });

  it('total exposure is the largest single quantified cap, never a sum', () => {
    for (const { seed, r } of runs) {
      const caps = r.penalties.fines.map((f: any) => f.capUSD).filter((c: any): c is number => typeof c === 'number');
      expect(r.penalties.totalValueAtStake, `seed ${seed}`).toBe(caps.length ? Math.max(...caps) : 0);
    }
  });

  it('no fine exceeds its statutory formula', () => {
    for (const { seed, input, r } of runs) {
      const tEUR = input.org.turnover / EUR_TO_USD;
      const ceiling: Record<string, number> = {
        gdpr: Math.max(20e6, tEUR * 0.04) * EUR_TO_USD,
        ukgdpr: Math.max(17.5e6, (input.org.turnover / GBP_TO_USD) * 0.04) * GBP_TO_USD,
        nis2: Math.max(10e6, tEUR * 0.02) * EUR_TO_USD,
        aiact: Math.max(15e6, tEUR * 0.03) * EUR_TO_USD,
        dora: (input.org.turnover / 365) * 0.01 * 180
      };
      for (const f of r.penalties.fines as any[]) {
        if (f.capUSD === null) continue;
        expect(f.capUSD, `seed ${seed} ${f.regId}`).toBeLessThanOrEqual(Math.round(ceiling[f.regId]) + 1);
      }
    }
  });

  it('findings come only from answered questions', () => {
    for (const { seed, input, r } of runs) {
      for (const f of r.findings as any[]) expect(input.answers[f.qid], `seed ${seed} ${f.qid}`).not.toBeUndefined();
    }
  });
});

describe('Posture IQ regressions fixed in Phase 2', () => {
  it('DORA shows no turnover-based cap for financial entities (Art. 35 periodic penalties apply only to critical ICT providers)', () => {
    const r = evaluatePostureIq({ answers: { A2: 'credit' }, org: { turnover: 10e9 }, regulations: ['dora'] });
    const dora = r.penalties.fines.find((f: any) => f.regId === 'dora') as any;
    expect(dora.capUSD).toBeNull();
    expect(dora.capFormatted).toBe('Set under national law');
    expect(r.penalties.totalValueAtStake).toBe(0);
    expect(r.penalties.riskHedgeRatio).toBe('n/a');
  });

  it('a critical ICT third-party provider gets the DORA Art. 35 periodic-penalty ceiling (1% of daily turnover x 180 days)', () => {
    const r = evaluatePostureIq({ answers: { A2: 'ict-ctpp' }, org: { turnover: 10e9 }, regulations: ['dora'] });
    const dora = r.penalties.fines.find((f: any) => f.regId === 'dora') as any;
    expect(dora.capUSD).toBe(Math.round((10e9 / 365) * 0.01 * 180));
    expect(r.penalties.totalValueAtStake).toBe(dora.capUSD);
    // Phase 3: A2 describes scope, so its finding is now listed as an obligation rather than a scored finding.
    expect(r.obligations.some((f: any) => f.qid === 'A2' && /critical ICT third-party/.test(f.title))).toBe(true);
  });

  it('the page no longer calls the largest single fine an "aggregate" or the fee comparison a "hedge ratio"', () => {
    expect(page).not.toMatch(/Aggregate (Exposure|Statutory)|Hedge Ratio/i);
  });

  it('with DORA and GDPR in scope, exposure is the GDPR cap (DORA no longer contributes 1% x 180 days of turnover)', () => {
    const r = evaluatePostureIq({ answers: {}, org: { turnover: 10e9 }, regulations: ['dora', 'gdpr'] });
    const gdpr = r.penalties.fines.find((f: any) => f.regId === 'gdpr') as any;
    expect(r.penalties.totalValueAtStake).toBe(gdpr.capUSD);
  });

  it('every report view on the page reads the server result (the browser engine produced zero findings)', () => {
    for (const fn of ['renderSlide', 'copyMarpDeck', 'openSOWModal', 'downloadPostureExecutivePDF', 'submitBookingRequest', 'sendTeaserEmail', 'toggleAINarrative']) {
      const start = page.indexOf(`function ${fn}(`);
      expect(start, fn).toBeGreaterThan(0);
      expect(page.slice(start, start + 400), fn).toContain('if(!STATE.evaluation){ showScoringError(); return; }');
    }
  });

  it('every probe carries the text the report shows (the safeguard read "undefined" on the live results page)', () => {
    for (const p of [].concat(K.dynamicProbes) as any[]) {
      for (const field of ['name', 'badge', 'clientAssertion', 'statutoryConflict', 'interrogationScript', 'technicalSafeguard']) {
        expect(typeof p[field] === 'string' && p[field].length > 0, `${p.id}.${field}`).toBe(true);
      }
    }
  });

  it('high-risk AI with no control gaps shows that AI Act obligations apply, not "Governance Aligned"', () => {
    const r = evaluatePostureIq({ answers: { G1: 'highrisk' }, org: { turnover: 1e9 }, regulations: ['aiact'] });
    const ai = r.penalties.fines.find((f: any) => f.regId === 'aiact') as any;
    expect(ai.status).toBe('High-Risk Obligations Apply');
  });

  it('the page sends only the client name and turnover', () => {
    expect(page).toContain("org: { name: STATE.org.name || '', turnover: STATE.org.turnover }");
  });
});

describe('Posture IQ regressions fixed in Phase 3 (scoring audit)', () => {
  const q = (id: string) => Q.find(x => x.id === id);
  const optionValues = (id: string) => new Set<string>((q(id).options || []).map((o: any) => o.value));

  it('the C2 location matrix scores and produces findings (cell findings are keyed by column, not row:column)', () => {
    const r = evaluatePostureIq({ answers: { C2: { special: 'us-cloud' } }, regulations: ['gdpr'] });
    const f = r.findings.find(x => x.qid === 'C2') as any;
    expect(f).toBeTruthy();
    expect(['critical', 'high']).toContain(f.severity);
    expect(f.row).toBe('special');
    expect(f.title).toBe('Special-category data located in a non-EU jurisdiction');
    expect(r.overallScore).toBeLessThan(100);
  });

  it("the page's per-question helper looks matrix findings up by column", () => {
    const start = page.indexOf('function collectFindingsForQuestion(');
    const body = page.slice(start, start + 1400);
    expect(body).not.toContain('`${row}:${col}`');
    expect(body).toContain('const key=col;');
  });

  it('no probe references a question or option value that does not exist', () => {
    for (const [id, conds] of Object.entries(PROBE_CONDITIONS)) {
      expect(K.dynamicProbes.some((p: any) => p.id === id), id).toBe(true);
      for (const c of conds as any[]) {
        if (c.reg) { expect(REGS, id).toContain(c.reg); continue; }
        expect(q(c.q), `${id} ${c.q}`).toBeTruthy();
        for (const v of c.any || c.none) expect([...optionValues(c.q)], `${id} ${c.q}`).toContain(v);
      }
    }
    for (const p of K.dynamicProbes as any[]) expect(PROBE_CONDITIONS[p.id], p.id).toBeTruthy();
  });

  it('the page uses the same probe conditions as the engine', () => {
    expect(page).toContain(`var PROBE_CONDITIONS = ${JSON.stringify(PROBE_CONDITIONS)};`);
    expect(page).not.toMatch(/"byok-cloud"|includes\("saas"\)|"embedded"|answers\["F3"\]/);
  });

  const fires = (answers: Record<string, unknown>, regulations = ['gdpr', 'dora', 'aiact', 'nis2']) =>
    evaluatePostureIq({ answers, regulations }).triggeredProbes.map((p: any) => p.id);

  it('PROBE_1 (residency illusion) can fire', () => {
    expect(fires({ C1: ['aws-eu'], H1: 'us', F2: 'provider' })).toContain('PROBE_1_RESIDENCY_ILLUSION');
  });
  it('PROBE_2 (SaaS blindspot) can fire on a real SaaS option', () => {
    expect(fires({ C1: ['salesforce'], B1: ['pii'], F2: 'provider' })).toContain('PROBE_2_SAAS_BLINDSPOT');
    expect(fires({ C1: ['salesforce'], B1: ['pii'], F2: 'cmk-eu' })).not.toContain('PROBE_2_SAAS_BLINDSPOT');
  });
  it('PROBE_3 (DORA exit) reads F4 exit testing, not F3 TLS', () => {
    expect(fires({ F4: 'planned' })).toContain('PROBE_3_DORA_EXIT');
    expect(fires({ F3: 'no', F4: 'yes' })).not.toContain('PROBE_3_DORA_EXIT');
    expect(fires({ F4: 'no' }, ['gdpr'])).not.toContain('PROBE_3_DORA_EXIT');
  });
  it('PROBE_4 (AI drift) fires for US compute', () => {
    expect(fires({ G1: 'internal', G2: 'us' })).toContain('PROBE_4_AI_DRIFT');
    expect(fires({ G1: 'none', G2: 'us' })).not.toContain('PROBE_4_AI_DRIFT');
  });
  it('PROBE_5 (on-prem backdoor) can fire', () => {
    expect(fires({ C1: ['onprem'], H1: 'other' })).toContain('PROBE_5_ONPREM_BACKDOOR');
  });
  it('PROBE_6 (BYOK illusion) fires on cloud-held keys with a US operator, and not with HYOK', () => {
    expect(fires({ F2: 'cmk-eu', H1: 'us' })).toContain('PROBE_6_KMS_BYOK_ILLUSION');
    expect(fires({ F2: 'cmk-eu', H1: 'us', H3: ['hyok'] })).not.toContain('PROBE_6_KMS_BYOK_ILLUSION');
  });

  it('scope questions (A1, A2, B1, B2, G1) are not scored; their findings are info-level obligations', () => {
    const scoped = { A1: 'essential', A2: 'credit', B1: ['special', 'financial'], B2: 5, G1: 'highrisk' };
    const r = evaluatePostureIq({ answers: { ...scoped, E1: 'all' }, org: { turnover: 1e9 }, regulations: ['gdpr', 'nis2', 'dora', 'aiact'] });
    expect(r.overallScore).toBe(100);
    expect(r.coverage.answered).toBe(1);
    expect(r.findings.filter(f => ['A1', 'A2', 'B1', 'B2', 'G1'].includes(f.qid))).toEqual([]);
    expect(r.counts).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(r.obligations.map(o => o.qid).sort()).toEqual(['A1', 'A2', 'B1', 'B1', 'B2', 'G1']);
    expect(r.obligations.every(o => o.severity === 'info')).toBe(true);
    for (const reg of ['gdpr', 'nis2', 'dora', 'aiact']) expect(r.rag[reg].rag, reg).not.toBe('red');
    expect((r.penalties.fines.find(f => f.regId === 'gdpr') as any).status).toBe('Defensible / Managed');
    expect((r.penalties.fines.find(f => f.regId === 'nis2') as any).status).toBe('Baseline Met');
  });

  it('outcome questions (K1-K3) feed no pillar', () => {
    expect(K.pillarConfig.some((p: any) => p.sections.includes('outcomes'))).toBe(false);
    const r = evaluatePostureIq({ answers: { K1: 'zero', K2: 'high', K3: ['cost'] } });
    expect(r.coverage.answered).toBe(0);
    expect(r.pillarScores.pillars.every(p => p.score === null)).toBe(true);
  });

  it('a pillar with no answers is excluded and the weights renormalised (it used to count as 55)', () => {
    const r = evaluatePostureIq({ answers: { E1: 'all' }, regulations: ['gdpr'] });
    const p3 = r.pillarScores.pillars.find(p => p.id === 'P3')!;
    expect(p3.score).toBe(100);
    expect(r.pillarScores.pillars.filter(p => p.id !== 'P3').every(p => p.score === null && !p.included)).toBe(true);
    expect(r.overallScore).toBe(100);
    expect(r.lowConfidence).toBe(true);
    expect(r.coverage.total).toBeGreaterThan(1);
    expect(page).toContain('scored questions answered');
  });

  it('findings tagged with an out-of-scope regulation are dropped; B1 financial (DORA) is gone when A2 = na', () => {
    const r = evaluatePostureIq({ answers: { E2: 'no', H2: 'none', E1: 'none' }, regulations: ['gdpr', 'eucs'] });
    expect(r.findings.map(f => f.reg)).toEqual(['gdpr', 'eucs']);
    const noEucs = evaluatePostureIq({ answers: { H3: ['none'], E1: 'none' }, regulations: ['gdpr'] });
    expect(noEucs.findings.map(f => f.reg)).toEqual(['gdpr']);
    const na = evaluatePostureIq({ answers: { A2: 'na', B1: ['financial'], I1: 'none' }, regulations: ['dora', 'gdpr'] });
    expect([...na.findings, ...na.obligations].some(f => f.reg === 'dora')).toBe(false);
  });

  it('GDPR card: Art. 28 duties sit in the 2% tier, and status follows the worst GDPR finding', () => {
    const card = (answers: any) => (evaluatePostureIq({ answers, regulations: ['gdpr'] }).penalties.fines.find(f => f.regId === 'gdpr') as any);
    expect(card({}).statuteBasis).toMatch(/Art\. 83\(5\)/);
    expect(card({}).statuteBasis).toMatch(/Art\. 28[^.]*€10M or 2%[^.]*Art\. 83\(4\)\(a\)/);
    expect(card({}).status).toBe('Defensible / Managed');
    expect(card({ C3: 'enforced', D1: 'adequate' }).status).toBe('Defensible / Managed'); // low only
    expect(card({ C3: 'partial' }).status).toBe('Regulatory Exposure');
    expect(card({ C3: 'convention' }).status).toBe('High Regulatory Exposure');
    expect(card({ D1: 'nomech' }).status).toBe('Critical Breach Exposure');
  });

  it('UK-only scope uses UK GDPR: the higher of £17.5M or 4%', () => {
    const r = evaluatePostureIq({ answers: {}, org: { turnover: 100e6 }, regulations: ['ukgdpr'] });
    const f = r.penalties.fines.find(x => x.regId === 'ukgdpr') as any;
    expect(f.regName).toMatch(/^UK GDPR/);
    expect(f.capUSD).toBe(Math.round(17.5e6 * GBP_TO_USD));
    expect(r.penalties.fines.some(x => x.regId === 'gdpr')).toBe(false);
  });

  it('UK AI principles alone produce no EU AI Act card; no AI in use means no AI Act ceiling', () => {
    expect(evaluatePostureIq({ answers: {}, regulations: ['ukai', 'gdpr'] }).penalties.fines.some(f => f.regId === 'aiact')).toBe(false);
    const r = evaluatePostureIq({ answers: { G1: 'none' }, org: { turnover: 1e9 }, regulations: ['aiact'] });
    const ai = r.penalties.fines.find(f => f.regId === 'aiact') as any;
    expect(ai.status).toBe('No AI systems in scope');
    expect(ai.capUSD).toBeNull();
    expect(r.penalties.totalValueAtStake).toBe(0);
  });

  it('NIS2 without a confirmed classification shows "Classification pending" instead of assuming Important', () => {
    for (const A1 of [undefined, 'unsure', 'na']) {
      const nis2 = evaluatePostureIq({ answers: A1 ? { A1 } : {}, regulations: ['nis2'] }).penalties.fines.find(f => f.regId === 'nis2') as any;
      expect(nis2.status, String(A1)).toBe('Classification pending');
      expect(nis2.capUSD, String(A1)).toBeNull();
    }
    const imp = evaluatePostureIq({ answers: { A1: 'important' }, org: { turnover: 1e9 }, regulations: ['nis2'] }).penalties.fines[0] as any;
    expect(imp.capUSD).toBe(Math.round(Math.max(7e6, (1e9 / EUR_TO_USD) * 0.014) * EUR_TO_USD));
  });

  it('one severity-to-score table for every question type; empty multi is unanswered; matrix is the worst cell', () => {
    expect(evaluateQuestionScore(q('E1'), 'none')).toBe(0);
    expect(evaluateQuestionScore(q('H2'), 'substantial')).toBe(75);
    expect(evaluateQuestionScore(q('C1'), ['aws-eu', 'aws-global'])).toBe(25); // worst selected option (high)
    expect(evaluateQuestionScore(q('C1'), ['aws-eu'])).toBe(100);
    expect(evaluateQuestionScore(q('C1'), [])).toBeNull();
    expect(evaluateQuestionScore(q('C2'), { pii: 'eu-only', special: 'us-cloud' })).toBe(0);
    expect(evaluateQuestionScore(q('C2'), { pii: 'eu-backup' })).toBe(75);
  });

  it('at most one finding per (question, title)', () => {
    // A knowledge-base edit that gives two options of one question the same finding must not double-count it.
    const kb2 = JSON.parse(JSON.stringify(K));
    const c1 = kb2.questions.find((x: any) => x.id === 'C1');
    const shared = c1.options.find((o: any) => o.value === 'aws-global').findings[0];
    c1.options.find((o: any) => o.value === 'azure-global').findings = [shared];
    const dup = evaluatePostureIq({ answers: { C1: ['aws-global', 'azure-global'] }, regulations: ['gdpr'] }, kb2);
    expect(dup.findings.filter(f => f.qid === 'C1')).toHaveLength(1);
    expect(dup.counts.high).toBe(1);
    // Matrix findings carry the row in their title, so each row stays a separate finding.
    const rows = evaluatePostureIq({ answers: { C2: { pii: 'multi', financial: 'multi' } }, regulations: ['gdpr'] });
    expect(rows.findings.filter(f => f.qid === 'C2')).toHaveLength(2);
    for (let seed = 1; seed <= 200; seed++) {
      const r = evaluatePostureIq(randomInput(seed));
      const keys = r.findings.map(f => f.qid + '|' + f.title);
      expect(new Set(keys).size, `seed ${seed}`).toBe(keys.length);
    }
  });

  it('turnover not provided is flagged as assumed, and the page says so', () => {
    expect(evaluatePostureIq({ answers: {} }).penalties.turnoverAssumed).toBe(true);
    expect(evaluatePostureIq({ answers: {}, org: { turnover: 5e8 } }).penalties.turnoverAssumed).toBe(false);
    expect(page).toContain("penalties.turnoverAssumed ? 'an assumed turnover' : 'declared enterprise turnover'");
  });

  it('the page makes no peer-benchmark claims, hides the cap tag on unquantified cards, and narrates by score band', () => {
    expect(page).not.toMatch(/peer radar benchmark|peer benchmarks across your sector/i);
    expect(page).toContain(`\${f.capUSD === null ? '' : '<span class="mono" style="font-size:10px;color:var(--ink3)">Statutory Cap</span>'}`);
    const start = page.indexOf('function execSummary(');
    const body = page.slice(start, page.indexOf('const hasAI', start));
    expect(body).not.toMatch(/if\(counts\.(critical|high|medium)>0\)/);
    expect(body).toMatch(/if\(score<40\)/);
  });

  it('the page lists obligations in scope separately', () => {
    expect(page).toContain('obligationsBlock(STATE.evaluation.obligations || [])');
    expect(page).toContain('Obligations in Scope');
  });
});
