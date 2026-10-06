/**
 * Cloud IQ: Phase 2 test suite, with the Phase 3 scoring-audit regressions at the end (see docs/phase2/ACCELERATOR_TEMPLATE.md).
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
    dimScores: Object.fromEntries(Object.entries(r.dimScores).map(([k, v]) => [k, two(v)])), dimAssessed: r.dimAssessed,
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

/** Pulls one or more top-level functions out of the page (from `from` up to `to`) and returns `name` built from them. */
function pageFunction(from: string, to: string, name: string, deps: Record<string, unknown>) {
  const start = page.indexOf(from), end = page.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`page: cannot find ${from}`);
  return new Function(...Object.keys(deps), `${page.slice(start, end)}; return ${name};`)(...Object.values(deps));
}

describe('Cloud IQ regressions fixed in Phase 3 (scoring audit)', () => {
  it('returns the full sector benchmark, and the page draws peer bars and radar from it', () => {
    const r = evaluateCloudIq({ answers: { 'Q0.2': idx('Q0.2', 'Public') } });
    expect(r.peerBenchmark).toEqual((kb as any).benchmarks['Public Sector & Government']);
    expect(r.peerBenchmark.D7).toBe(3.5);
    expect(page).not.toMatch(/R\.peer\.overall|R\.peer\[/);
    expect(page).toContain('R.peerBenchmark[d]');
  });

  it('an unanswered industry falls back to Other, not BFSI', () => {
    const r = evaluateCloudIq({ answers: {} });
    expect(r.industryKey).toBe('Other');
    expect(r.peer).toBe((kb as any).benchmarks.Other.overall);
  });

  it('AI ambitions on a weak data platform escalate D8 urgency to high', () => {
    const r = evaluateCloudIq({ answers: { 'Q9.1': 0, 'Q9.2': [1], 'Q0.6': ['Speed / agility / time-to-market'] } });
    expect(r.aiFlag).toBe(true);
    expect(r.dimScores.D8).toBeLessThan(2.5);
    expect(r.urgencyMap.D8).toBe(3);
  });

  it('routes clients one routing signal apart to the hybrid track', () => {
    const speed = ['Speed / agility / time-to-market'];
    const oneApart = evaluateCloudIq({ answers: { 'Q0.4': idx('Q0.4', 'Mostly cloud'), 'Q0.6': speed } });
    expect(oneApart.trackCode).toBe('Hybrid');
    const twoApart = evaluateCloudIq({ answers: { 'Q0.4': idx('Q0.4', 'Mostly cloud'), 'Q0.6': speed, 'Q1.1': [0] } });
    expect(twoApart.trackCode).toBe('A');
  });

  it('Q8.2 (binding residency mandate) sets the sovereignty flag but is not scored as governance maturity', () => {
    const yes = evaluateCloudIq({ answers: { 'Q8.1': 1, 'Q8.2': true } });
    const no = evaluateCloudIq({ answers: { 'Q8.1': 1, 'Q8.2': false } });
    expect(yes.dimScores.D7).toBe(2);
    expect(no.dimScores.D7).toBe(2);
    expect(yes.sovFlag).toBe(true);
    const kbQ = Q.find(q => q.id === 'Q8.2');
    const pageQ = pageQuestions().find((q: any) => q.id === 'Q8.2');
    for (const q of [kbQ, pageQ]) expect(q.maturityTF).toBeUndefined(), expect(q.sovFlagTF).toBe(true), expect(q.dim).toBeUndefined();
  });

  it('the commitment share of leakage shrinks as commitment coverage rises, and the parts still sum to the total', () => {
    const share = (q09: number) => {
      const r = evaluateCloudIq({ answers: { 'Q0.9': q09, 'Q4.3': 3, 'Q0.8': 3 } });
      expect(r.decomp.compute + r.decomp.commit + r.decomp.storage + r.decomp.licensing).toBe(r.totalLeakage);
      return r.decomp.commit / r.totalLeakage;
    };
    expect(share(idx('Q0.9', '20–40%'))).toBeCloseTo(0.28, 3); // the 30% reference coverage keeps the old split
    expect(share(idx('Q0.9', '80%+'))).toBeCloseTo(0.04 / 0.76, 3);
    expect(share(idx('Q0.9', '80%+'))).toBeLessThan(share(idx('Q0.9', '40–60%')));
  });

  it('flags which dimensions were assessed; unassessed dimensions trigger no roadmap moves or offers', () => {
    const none = evaluateCloudIq({ answers: {} });
    expect(Object.values(none.dimAssessed).every(v => v === false)).toBe(true);
    const titles = [none.movesPhase1, none.movesPhase2, none.movesPhase3, none.movesPhase4].flat().map(m => m.title);
    expect(titles).not.toContain('Cloud Landing Zone MFA & IAM Hardening');
    expect(titles).not.toContain('Internal Developer Platform (IDP) & Golden Paths');
    expect(none.offers.map((o: any) => o.code)).toEqual(['03.3']); // waste default only

    const some = evaluateCloudIq({ answers: { 'Q8.1': 0, 'Q0.12': idx('Q0.12', 'Imminent') } });
    expect(some.dimAssessed.D7).toBe(true);
    expect(some.movesPhase1.map(m => m.title)).toContain('Cloud Landing Zone MFA & IAM Hardening');
    // Flag-triggered moves and offers are unchanged.
    expect(some.movesPhase4.map(m => m.title)).toContain('Full Data Centre Decommissioning & Facility Handback');
    expect(some.offers.map((o: any) => o.code)).toContain('03.5');
  });

  it('unanswered waste and commitment give the same result as "Don\'t know"', () => {
    const unanswered = evaluateCloudIq({ answers: {} });
    const dontKnow = evaluateCloudIq({ answers: { 'Q4.3': idx('Q4.3', "Don't know"), 'Q0.9': idx('Q0.9', "Don't know") } });
    expect(unanswered.totalLeakage).toBe(dontKnow.totalLeakage);
    expect(unanswered.decomp).toEqual(dontKnow.decomp);
  });

  it('the slider stores no answer until the user moves it', () => {
    const A: Record<string, unknown> = {};
    const renderSlider = pageFunction('function renderSlider', 'function setSlider', 'renderSlider', { A });
    const html = renderSlider(Q.find(q => q.id === 'Q3.2'));
    expect(A).toEqual({});
    expect(html).toContain('Not answered yet');
  });

  it('the 25% quality gate counts maturity-scored questions only', () => {
    const alerts: string[] = [];
    const gate = (A: Record<string, unknown>) => pageFunction('function isMaturityScored', 'async function computeAndShow', 'checkCloudAnswerThreshold', {
      QUESTIONS: pageQuestions(), A, shouldSkip: () => false, alert: (m: string) => alerts.push(m)
    })();
    // Every context question answered, no maturity question: blocked.
    const context = Object.fromEntries(Q.filter(q => !(q.maturity || q.maturityCount || q.maturityTF)).map(q => [q.id, q.type === 'tf' ? true : q.type === 'multi' || q.type === 'rank' || q.multi ? [] : 0]));
    expect(gate(context)).toBe(false);
    expect(alerts[0]).toContain('maturity questions');
    const scored = Q.filter(q => q.maturity || q.maturityCount || q.maturityTF);
    const quarter = Object.fromEntries(scored.slice(0, Math.ceil(scored.length / 4)).map(q => [q.id, q.maturityCount ? [0] : q.type === 'tf' ? true : 1]));
    expect(gate(quarter)).toBe(true);
  });

  it('the rule-based memo states only what the answers support, as estimates', () => {
    for (const phrase of ['hovering at low levels', 'will permanently eliminate', 'reclaimable leakage', 'Value-at-Stake', 'Value at Stake', '2.5x–3.5x', 'will be reclaimed']) {
      expect(page, phrase).not.toContain(phrase);
    }
    expect(page).toContain('Estimated annual cost leakage (indicative)');
    const memo = (answers: Record<string, unknown>) => {
      const RESULT = evaluateCloudIq({ answers });
      const fmt = (n: number) => '$' + Number(n).toLocaleString();
      return pageFunction('function generateRuleBasedMemo', 'function copyMemoText', 'generateRuleBasedMemo', {
        RESULT, A: answers, QUESTIONS: pageQuestions(), fmt, showScoringError: () => {},
        SESSION: { clientName: 'Acme', anonymize: false, consultingProbes: {} }
      })() as string;
    };
    const committed = memo({ 'Q0.9': idx('Q0.9', '80%+'), 'Q4.1': 4, 'Q4.4': 4, 'Q0.11': 0, 'Q0.12': 0 });
    expect(committed).not.toMatch(/under 40%|VMware|lease overhead/i);
    expect(committed).toContain('estimated, up to');
    expect(committed).not.toMatch(/\bwill\b/);
    const exposed = memo({ ...cloudIqAnswers });
    expect(exposed).toMatch(/VMware/);
    expect(exposed).toContain('under 40%');
  });

  it('roadmap impact lines carry no invented multiples or percentages', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = evaluateCloudIq(randomQuestionnaire(seed));
      for (const m of [r.movesPhase1, r.movesPhase2, r.movesPhase3, r.movesPhase4].flat()) {
        expect(m.impact, `seed ${seed} ${m.title}`).not.toMatch(/\d(\.\d+)?x\b|\d+%/);
      }
    }
  });
});
