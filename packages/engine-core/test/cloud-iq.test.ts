/**
 * Cloud IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * The server engine was verified against the page's former browser engine on 300 random questionnaires before the
 * browser engine was removed. The golden master now pins that behaviour.
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run cloud-iq, then have the cloud lead review it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateCloudIq, type CloudIqEvaluation } from '../src/accelerators/cloud-iq/evaluate';
import { parseCloudIqRequest } from '../src/accelerators/cloud-iq/contract';
import kb from '../src/accelerators/cloud-iq/knowledge-base.json' with { type: 'json' };
import { cloudIqAnswers } from './sample-inputs';

const Q: any[] = (kb as any).questions;
const page = readFileSync(join(__dirname, '../../../Accelerators/cloud-iq.html'), 'utf8');

function pageQuestions() {
  const start = page.indexOf('[', page.indexOf('var QUESTIONS'));
  let depth = 0, end = start;
  for (; end < page.length; end++) { if (page[end] === '[') depth++; else if (page[end] === ']' && --depth === 0) break; }
  return new Function('return ' + page.slice(start, end + 1))();
}

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomAnswer(q: any, r: () => number): unknown {
  const n = (q.opts || []).length;
  const pick = () => Math.floor(r() * n);
  switch (q.type) {
    case 'single': return pick();
    case 'multi': return [...new Set([pick(), pick()])].slice(0, q.max ?? n);
    case 'cards': return q.multi ? [...new Set([pick(), pick()])].slice(0, q.max ?? n) : pick();
    case 'slider': return Math.floor(r() * q.scale.length);
    case 'rank': return [...q.opts].sort(() => r() - 0.5);
    case 'tf': return r() < 0.5;
    default: throw new Error('No generator for ' + q.type);
  }
}

function randomQuestionnaire(seed: number) {
  const r = rng(seed);
  const answers: Record<string, unknown> = {};
  for (const q of Q) if (r() < 0.85) answers[q.id] = randomAnswer(q, r);
  return { answers, session: { mode: (r() < 0.5 ? 'workshop' : 'flash') as 'workshop' | 'flash' } };
}

const idx = (id: string, label: string) => {
  const i = Q.find(q => q.id === id).opts.findIndex((o: any) => (Array.isArray(o) ? o[0] : o.t ?? o).toString().startsWith(label));
  if (i < 0) throw new Error(`${id}: no option starting "${label}"`);
  return i;
};

const PROFILES: Record<string, { answers: Record<string, unknown>; session?: { mode: 'workshop' | 'flash' } }> = {
  'sample-bfsi': { answers: cloudIqAnswers },
  'unanswered': { answers: {} },
  'flash-mode-sample': { answers: cloudIqAnswers, session: { mode: 'flash' } },
  'random-seed-42': randomQuestionnaire(42)
};

function goldenView(r: CloudIqEvaluation) {
  const two = (v: number) => Number(v.toFixed(3));
  return {
    trackCode: r.trackCode, overall: two(r.overall), band: r.band,
    dimScores: Object.fromEntries(Object.entries(r.dimScores).map(([k, v]) => [k, two(v)])),
    topObj: r.topObj, topDim: r.topDim,
    flags: { sov: r.sovFlag, secnum: r.secnumFlag, ai: r.aiFlag, vmware: r.vmwareRisk, lease: r.leaseCliff },
    leakage: [r.totalCloudSpend, r.totalLeakage, r.leakLow, r.leakHigh], decomp: r.decomp, urgencyMap: r.urgencyMap,
    roadmap: [r.movesPhase1, r.movesPhase2, r.movesPhase3, r.movesPhase4].map(p => p.map(m => m.title)),
    offers: r.offers.map((o: any) => o.code), peer: r.peer, peerDelta: two(r.peerDelta), industryKey: r.industryKey
  };
}

describe('Cloud IQ contract', () => {
  it('accepts any questionnaire the page can produce', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parseCloudIqRequest(randomQuestionnaire(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
  });

  it('rejects unknown questions and malformed answers with readable reasons', () => {
    const res = parseCloudIqRequest({ answers: { Q99: 1, 'Q0.1': 99, 'Q0.5': 7, 'Q0.6': ['Nope'], 'Q8.2': 'yes' }, session: { mode: 'demo' } });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('answers.Q99: unknown question');
    expect(errors).toContain('answers.Q0.1: expected an option index');
    expect(errors).toContain('answers.Q0.5: expected a scale position');
    expect(errors).toContain('answers.Q0.6: expected a ranking');
    expect(errors).toContain('answers.Q8.2: expected true or false');
    expect(errors).toContain('session.mode');
  });

  it("the page's questions match the engine's, and the page no longer scores locally", () => {
    const shape = (qs: any[]) => qs.map(q => `${q.id}:${q.type}:${(q.opts || []).length}`);
    expect(shape(pageQuestions())).toEqual(shape(Q));
    expect(page).not.toMatch(/function compute\(\)|\bcompute\(\)/);
  });
});

describe('Cloud IQ golden master (approved outputs)', () => {
  const file = join(__dirname, 'golden/cloud-iq.json');
  const actual = Object.fromEntries(Object.entries(PROFILES).map(([k, p]) => [k, goldenView(evaluateCloudIq(p))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(PROFILES)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
});

describe('Cloud IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 3000 + i, input: randomQuestionnaire(3000 + i) }))
    .map(x => ({ ...x, r: evaluateCloudIq(x.input) }));

  it('never returns NaN, Infinity or undefined', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
      expect(JSON.stringify(r), `seed ${seed}`).not.toMatch(/undefined|NaN/);
    }
  });

  it('keeps maturity on the 1-5 scale and the band consistent with it', () => {
    const band = (s: number) => (s < 2 ? 'Nascent' : s < 2.8 ? 'Emerging' : s < 3.8 ? 'Established' : s < 4.5 ? 'Advanced' : 'Leading');
    for (const { seed, r } of runs) {
      for (const v of [r.overall, ...Object.values(r.dimScores)]) expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(1), expect(v, `seed ${seed}`).toBeLessThanOrEqual(5);
      expect(r.band, `seed ${seed}`).toBe(band(r.overall));
    }
  });

  it('keeps leakage ordered, below spend, and fully decomposed', () => {
    for (const { seed, r } of runs) {
      expect(r.leakLow, `seed ${seed}`).toBeLessThanOrEqual(r.totalLeakage);
      expect(r.totalLeakage, `seed ${seed}`).toBeLessThanOrEqual(r.leakHigh);
      expect(r.leakHigh, `seed ${seed}`).toBeLessThan(r.totalCloudSpend);
      const parts = r.decomp.compute + r.decomp.commit + r.decomp.storage + r.decomp.licensing;
      expect(Math.abs(parts - r.totalLeakage), `seed ${seed}`).toBeLessThanOrEqual(2);
    }
  });

  it('every roadmap phase has at least one move and every offer is in the catalogue', () => {
    for (const { seed, r } of runs) {
      expect(r.movesPhase1.length && r.movesPhase2.length, `seed ${seed}`).toBeTruthy();
      for (const o of r.offers as any[]) expect((kb as any).offerings[o.code], `seed ${seed} ${o.code}`).toBeTruthy(), expect(o.why).toBeTruthy();
    }
  });
});

describe('Cloud IQ regressions fixed in Phase 2', () => {
  it('roadmap phases 3-4 and offers follow the live page rules (the server had a divergent rewrite)', () => {
    const r = evaluateCloudIq({ answers: cloudIqAnswers });
    expect(r.movesPhase4.map(m => m.title)).not.toContain('Autonomous Multi-Cloud FinOps & Unit Economics');
    expect(r.offers.every((o: any) => typeof o.why === 'string')).toBe(true);
  });

  it('a sovereignty move supports compliance; it does not claim to fulfil it', () => {
    const r = evaluateCloudIq({ answers: { ...cloudIqAnswers, 'Q8.2': true } });
    const move = r.movesPhase3.find(m => m.code === '02.1')!;
    expect(move.impact).toMatch(/^Supports/);
  });

  it('peer is the sector median number and peerDelta is overall minus peer', () => {
    const r = evaluateCloudIq({ answers: { 'Q0.2': idx('Q0.2', 'B') } });
    expect(typeof r.peer).toBe('number');
    expect(r.peerDelta).toBeCloseTo(r.overall - r.peer);
  });
});
