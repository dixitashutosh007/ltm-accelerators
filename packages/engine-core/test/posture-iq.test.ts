/**
 * Posture IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run posture-iq, then have the legal /
 * regulatory reviewer approve the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluatePostureIq, type PostureIqEvaluation } from '../src/accelerators/posture-iq/evaluate';
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
    pillars: r.pillarScores.pillars.map(p => `${p.id} ${p.score} ${p.status}`),
    counts: r.counts,
    findings: r.findings.map((f: any) => `${f.qid} ${f.severity} ${f.reg}`),
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
      for (const v of [r.overallScore, ...r.pillarScores.pillars.map(p => p.score)]) expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
      expect(r.label.t, `seed ${seed}`).toBe(label(r.overallScore));
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
        nis2: Math.max(10e6, tEUR * 0.02) * EUR_TO_USD,
        aiact: Math.max(15e6, tEUR * 0.03) * EUR_TO_USD
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

  it('the page sends only the client name and turnover', () => {
    expect(page).toContain("org: { name: STATE.org.name || '', turnover: STATE.org.turnover }");
  });
});
