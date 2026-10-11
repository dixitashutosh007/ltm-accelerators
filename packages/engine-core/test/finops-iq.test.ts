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
    domainScores: r.domainScores, coverage: r.coverage,
    checkpoints: Object.fromEntries(Object.entries(r.checkpointCoverage).map(([k, v]) => [k, `${v.status} ${v.pct}`])),
    valueAtStake: r.valueAtStake,
    roadmap: r.roadmap.horizons.map(h => h.items.map((i: any) => i.q.id + (i.toAssess ? ' (to assess)' : '')))
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

  it('value at stake is a share of spend: the client estimate when given, else a band that shrinks as maturity rises', () => {
    const t6 = Q.find(q => q.id === 'T6');
    for (const { seed, input, r } of runs) {
      const v = r.valueAtStake;
      expect(v.minSavings, `seed ${seed}`).toBeLessThanOrEqual(v.maxSavings);
      expect(v.maxSavings, `seed ${seed}`).toBeLessThanOrEqual((input.annualSpend || 0) * 0.35 + 1);
      const a = input.answers.T6;
      if (typeof a === 'number') {
        expect(v.basis, `seed ${seed}`).toBe('client-estimate');
        expect([v.minPct, v.maxPct], `seed ${seed}`).toEqual(t6.options[a].waste_pct_range);
      } else expect(v.basis, `seed ${seed}`).toBe('maturity-stage');
    }
    const pct = (m: number) => runs.find(x => x.r.maturity === m && x.r.valueAtStake.basis === 'maturity-stage')?.r.valueAtStake.maxPct;
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

describe('FinOps IQ regressions fixed in Phase 3 (scoring audit)', () => {
  const stageIds = (id: string) => Q.filter(q => q.stage === id);
  const bestFor = (id: string) => Object.fromEntries(stageIds(id).map(q => [q.id, best(q)]));

  it('"not applicable" counts as answered, is left out of every score, and a critical N/A passes its gate', () => {
    // Old code: one N/A left the stage "in-progress" forever, and a critical N/A failed its gate.
    const answers: Record<string, number | string> = { ...bestFor('chaos'), C3: NOT_APPLICABLE, C1: NOT_APPLICABLE };
    const r = evaluateFinOpsIq({ answers });
    expect(r.stageScores.chaos).toMatchObject({ score: 100, answered: 8, total: 8 });
    expect(r.stageCriticals.chaos.failing).toEqual([]);
    expect(r.stageStatuses.chaos).toBe('passed');
    expect(r.maturity).toBe(0);
    expect(r.overallScore).toBe(100);
    expect(r.domainScores.business_value).toBeNull(); // C3 was the only business_value answer
    expect(r.checkpointCoverage['chk-c3'].status).toBe('na');
    const ids = r.roadmap.horizons.flatMap(h => h.items.map((i: any) => i.q.id));
    expect(ids).not.toContain('C3');
    expect(ids).not.toContain('C1');
  });

  it("value at stake uses the client's own waste estimate (T6) when given, else the maturity benchmark", () => {
    const banking = K.archetypes.find((a: any) => a.id === 'banking');
    const withEstimate = evaluateFinOpsIq({ answers: { ...banking.sample_answers, T6: 2 }, annualSpend: 1_000_000 });
    expect(withEstimate.valueAtStake).toMatchObject({ basis: 'client-estimate', minPct: 10, maxPct: 20, minSavings: 100_000, maxSavings: 200_000 });
    const lean = evaluateFinOpsIq({ answers: { T6: 0 }, annualSpend: 1_000_000 });
    expect(lean.valueAtStake).toMatchObject({ basis: 'client-estimate', minPct: 2, maxPct: 4 });
    const heavy = evaluateFinOpsIq({ answers: { T6: 3 }, annualSpend: 1_000_000 });
    expect(heavy.valueAtStake).toMatchObject({ basis: 'client-estimate', minPct: 20, maxPct: 35 });
    const noEstimate = evaluateFinOpsIq({ answers: { ...banking.sample_answers, T6: NOT_APPLICABLE }, annualSpend: 1_000_000 });
    expect(noEstimate.valueAtStake.basis).toBe('maturity-stage');
    // The ranges follow the option labels, not their position.
    const t6 = Q.find(q => q.id === 'T6');
    expect(t6.options.map((o: any) => o.label.slice(0, 9))).toEqual(['< 4% of t', '4% – 9% w', '10% – 20%', '> 20% was']);
  });

  it('"mostly in place" (65) passes the critical gates of the first two stages', () => {
    // Options score 100/65/30/0, so a minimum of 70 meant only the top option ever passed.
    const answers = Object.fromEntries(stageIds('chaos').map(q => [q.id, q.critical ? 1 : best(q)]));
    const r = evaluateFinOpsIq({ answers });
    expect(r.stageCriticals.chaos.failing).toEqual([]);
    expect(r.stageStatuses.chaos).toBe('passed');
    const informed = K.meta.stages.find((s: any) => s.id === 'informed');
    expect(informed.crit_min).toBe(65);
  });

  it('every checkpoint a question points at exists, in the engine and on the page (chk-o5 was missing)', () => {
    for (const bank of [K, pageKb()]) {
      const ids = new Set(bank.meta.checkpoints.map((c: any) => c.id));
      for (const q of bank.questions) expect(ids.has(q.checkpoint_id), `${q.id} -> ${q.checkpoint_id}`).toBe(true);
    }
    const r = evaluateFinOpsIq({ answers: { O5: 3, O8: 3 } });
    expect(r.checkpointCoverage['chk-o5'].status).toBe('blocker');
  });

  it('the page counts unanswered critical gates as blockers (no answers no longer reads "all cleared")', () => {
    const src = page.slice(page.indexOf('function criticalBlockers()'));
    let depth = 0, end = src.indexOf('{');
    for (; end < src.length; end++) { if (src[end] === '{') depth++; else if (src[end] === '}' && --depth === 0) break; }
    const fn = new Function('STATE', src.slice(0, end + 1) + '; return criticalBlockers();');
    const blockers = fn({ evaluation: evaluateFinOpsIq({ answers: {} }) });
    expect(blockers.length).toBe(Q.filter(q => q.critical).length);
  });

  it('a domain with no answers is null ("not assessed"), and the evaluation reports its coverage', () => {
    const r: any = evaluateFinOpsIq({ answers: { C1: 0, C3: NOT_APPLICABLE } });
    expect(r.domainScores.managing_practice).toBe(100);
    for (const d of ['understanding_usage', 'business_value', 'optimizing_cost', 'modern_workloads']) expect(r.domainScores[d], d).toBeNull();
    expect(r.coverage).toEqual({ answered: 2, total: Q.length, notApplicable: 1 });
  });

  it('roadmap ranks known weak answers before unanswered ones, which are marked "to assess"', () => {
    // Old code gave an unanswered question a gap of 100, ranking it above a known worst answer.
    const r = evaluateFinOpsIq({ answers: { C1: 3 } });
    const short = r.roadmap.horizons[0].items;
    expect(short[0].q.id).toBe('C1');
    expect(short[0].toAssess).toBeFalsy();
    expect(short.slice(1).every((i: any) => i.toAssess === true)).toBe(true);
  });

  it('page labels: no invented benchmark, a savings range, self-reported checkpoints, no hidden zero', () => {
    expect(page).not.toContain('Normalized Benchmark');
    expect(page).not.toContain('22 FinOps Foundation maturity checkpoints');
    expect(page).not.toMatch(/\(sc \|\| "—"\)|\(overallScore\(\) \|\| "—"\)/);
    expect(page).not.toContain('doc.text("Stage " + (mIdx + 1)');
    expect(page).not.toContain('"The organization currently sits at Stage " + (mIdx + 1)');
    expect(page).toContain("formatCurrency(vas.minSavings) + ' – ' + formatCurrency(vas.maxSavings)");
    expect(page).toContain('Based on your estimate of waste');
    expect(page).toContain('Based on maturity stage benchmark (LTM heuristic)');
  });
});
