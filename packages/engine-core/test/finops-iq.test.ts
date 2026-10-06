/**
 * FinOps IQ: Phase 2 test suite (see docs/phase2/ACCELERATOR_TEMPLATE.md).
 * To change an approved output on purpose: UPDATE_GOLDEN=1 npx vitest run finops-iq, then have the FinOps lead review it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsIq, type FinOpsIqEvaluation } from '../src/accelerators/finops-iq/evaluate';
import { parseFinOpsIqRequest, NOT_APPLICABLE } from '../src/accelerators/finops-iq/contract';
import kb from '../src/accelerators/finops-iq/knowledge-base.json' with { type: 'json' };

const K: any = kb;
const Q: any[] = K.questions;
const page = readFileSync(join(__dirname, '../../../Accelerators/finops-iq.html'), 'utf8');

function pageKb() {
  const start = page.indexOf('{', page.indexOf('const KB = {'));
  let depth = 0, end = start;
  for (; end < page.length; end++) { if (page[end] === '{') depth++; else if (page[end] === '}' && --depth === 0) break; }
  return new Function('return ' + page.slice(start, end + 1))();
}

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function randomQuestionnaire(seed: number) {
  const r = rng(seed);
  const answers: Record<string, number | string> = {};
  for (const q of Q) {
    if (r() < 0.1) continue;
    answers[q.id] = r() < 0.05 ? NOT_APPLICABLE : Math.floor(r() * q.options.length);
  }
  return { answers, annualSpend: Math.round(r() * 100_000_000), org: { name: 'Client ' + seed, sector: 'Retail' } };
}

const best = (q: any) => q.options.reduce((m: number, o: any, i: number, a: any[]) => (o.score > a[m].score ? i : m), 0);

function goldenView(r: FinOpsIqEvaluation) {
  return {
    maturity: r.maturity, overallScore: r.overallScore, stageScores: r.stageScores, stageStatuses: r.stageStatuses,
    failingCriticals: Object.fromEntries(Object.entries(r.stageCriticals).map(([k, v]) => [k, v.failing.map((f: any) => f.q.id)])),
    domainScores: r.domainScores,
    checkpoints: Object.fromEntries(Object.entries(r.checkpointCoverage).map(([k, v]) => [k, `${v.status} ${v.pct}`])),
    valueAtStake: r.valueAtStake,
    roadmap: r.roadmap.horizons.map(h => h.items.map((i: any) => i.q.id))
  };
}

describe('FinOps IQ contract', () => {
  it('accepts any questionnaire the page can produce, and every archetype', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const res = parseFinOpsIqRequest(randomQuestionnaire(seed));
      expect(res.ok ? [] : res.errors, `seed ${seed}`).toEqual([]);
    }
    for (const a of K.archetypes) {
      const res = parseFinOpsIqRequest({ answers: a.sample_answers, annualSpend: a.spend_numeric, org: { name: a.name, sector: a.sector } });
      expect(res.ok ? [] : res.errors, a.id).toEqual([]);
    }
  });

  it('rejects unknown questions and malformed answers with readable reasons', () => {
    const res = parseFinOpsIqRequest({ answers: { ZZ: 1, C1: 9, C2: 'yes' }, annualSpend: -1 });
    const errors = res.ok ? '' : res.errors.join('\n');
    expect(errors).toContain('answers.ZZ: unknown question');
    expect(errors).toContain('answers.C1: expected an option index');
    expect(errors).toContain('answers.C2: expected an option index');
    expect(errors).toContain('annualSpend');
  });

  it("the page's question bank matches the engine's and carries no scores", () => {
    const shape = (b: any) => b.questions.map((q: any) => `${q.id}:${q.stage}:${q.critical ? 'C' : ''}:${q.options.length}`);
    const p = pageKb();
    expect(shape(p)).toEqual(shape(K));
    expect(JSON.stringify(p.questions)).not.toMatch(/"score"/);
    expect(page).not.toMatch(/function qScore|opt\.score/);
  });
});

describe('FinOps IQ golden master (approved outputs)', () => {
  const inputs: Record<string, any> = Object.fromEntries(K.archetypes.map((a: any) => [`archetype-${a.id}`, { answers: a.sample_answers, annualSpend: a.spend_numeric }]));
  inputs['unanswered'] = { answers: {} };
  inputs['all-best'] = { answers: Object.fromEntries(Q.map(q => [q.id, best(q)])), annualSpend: 5_000_000 };
  const file = join(__dirname, 'golden/finops-iq.json');
  const actual = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, goldenView(evaluateFinOpsIq(i))]));
  if (process.env.UPDATE_GOLDEN) writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  const approved = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of Object.keys(inputs)) it(`${name} matches its approved output`, () => expect(actual[name]).toEqual(approved[name]));
});

describe('FinOps IQ invariants (500 random questionnaires)', () => {
  const runs = Array.from({ length: 500 }, (_, i) => ({ seed: 4000 + i, input: randomQuestionnaire(4000 + i) }))
    .map(x => ({ ...x, r: evaluateFinOpsIq(x.input) }));

  it('never returns NaN, Infinity or undefined', () => {
    for (const { seed, r } of runs) {
      const bad: string[] = [];
      JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k); return v; });
      expect(bad, `seed ${seed}`).toEqual([]);
    }
  });

  it('maturity is gated: every stage up to it passed, and the next did not', () => {
    for (const { seed, r } of runs) {
      K.meta.stages.forEach((st: any, i: number) => {
        if (i <= r.maturity) expect(r.stageStatuses[st.id], `seed ${seed} ${st.id}`).toBe('passed');
      });
      const next = K.meta.stages[r.maturity + 1];
      if (next) expect(r.stageStatuses[next.id], `seed ${seed}`).not.toBe('passed');
    }
  });

  it('a passed stage has no failing critical gate, and a met checkpoint has no critical below its stage minimum', () => {
    for (const { seed, r } of runs) {
      for (const st of K.meta.stages) if (r.stageStatuses[st.id] === 'passed') expect(r.stageCriticals[st.id].failing, `seed ${seed}`).toEqual([]);
      for (const [cid, cov] of Object.entries(r.checkpointCoverage)) {
        if (cov.status !== 'met') continue;
        for (const q of Q.filter(q => q.checkpoint_id === cid && q.critical)) {
          const failing = r.stageCriticals[q.stage].failing.some((f: any) => f.q.id === q.id);
          expect(failing, `seed ${seed}: checkpoint ${cid} met while ${q.id} fails its stage gate`).toBe(false);
        }
      }
    }
  });

  it('value at stake is a share of spend that shrinks as maturity rises', () => {
    for (const { seed, input, r } of runs) {
      const v = r.valueAtStake;
      expect(v.minSavings, `seed ${seed}`).toBeLessThanOrEqual(v.maxSavings);
      expect(v.maxSavings, `seed ${seed}`).toBeLessThanOrEqual((input.annualSpend || 0) * 0.35 + 1);
    }
    const pct = (m: number) => runs.find(x => x.r.maturity === m)?.r.valueAtStake.maxPct;
    const seen = [-1, 0, 1, 2, 3, 4].map(pct).filter((p): p is number => p !== undefined);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1]);
  });
});

describe('FinOps IQ regressions fixed in Phase 2', () => {
  it('a checkpoint is not "met" when a critical question misses its stage minimum of 75-80 (the check used a flat 70)', () => {
    // Latent with today's scores (none fall between 70 and 80); a Studio edit to 72 would have exposed it.
    const custom = JSON.parse(JSON.stringify(K));
    const stage = custom.meta.stages.find((s: any) => s.crit_min > 70);
    const q = custom.questions.find((x: any) => x.critical && x.stage === stage.id && x.checkpoint_id);
    const answers = Object.fromEntries(custom.questions.filter((x: any) => x.checkpoint_id === q.checkpoint_id).map((x: any) => [x.id, best(x)]));
    q.options[best(q)].score = 72;
    const r = evaluateFinOpsIq({ answers }, custom);
    expect(r.stageCriticals[stage.id].failing.map((f: any) => f.q.id)).toContain(q.id);
    expect(r.checkpointCoverage[q.checkpoint_id].status).not.toBe('met');
  });

  it('the page no longer shows per-option points (they read "undefined pts")', () => {
    expect(page).not.toContain("' pts</span>'");
  });

  it('the page sends only the client name and sector, not consultant details', () => {
    expect(page).toContain("org: { name: STATE.org.name || '', sector: STATE.org.sector || '' }");
  });
});
