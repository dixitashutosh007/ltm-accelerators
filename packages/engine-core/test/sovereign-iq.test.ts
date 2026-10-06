/**
 * Sovereign IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run sovereign-iq, then have the legal /
 * sovereignty reviewer approve the golden file diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSovereignIq } from '../src/accelerators/sovereign-iq/evaluate';
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
    maturity: { score: r.maturity.score, stage: r.maturity.stage?.label },
    pillars: Object.fromEntries(Object.entries(r.pillarScores).map(([k, v]: any) => [k, v.score ?? v])),
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
      for (const v of [r.maturity.score, ...Object.values<any>(r.pillarScores).map(p => p.score ?? p)]) {
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
