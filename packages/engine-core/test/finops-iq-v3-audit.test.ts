/**
 * FinOps IQ v3 scoring audit invariants (plan phase F5, run as M1 of the execution sequence). The random audit in
 * packages/engine-core/audit/ reports how the engine behaves; these tests fail CI when it breaks a rule:
 *   - no dead questions: every maturity question can change its capability's rating;
 *   - every rating is reachable for every capability in scope, every need band is reachable, and the headline spans
 *     its full range;
 *   - one answer moves at most its own capability, so the summary moves at most one capability (and three levels);
 *   - Unknown never rates better than the lowest answered option;
 *   - N/A comes only from scope, and value-base facts never move a rating;
 *   - labels say what is computed (validation finding M10).
 * Monotonicity and the blank invariant over random questionnaires are in finops-iq-v3.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateFinOpsIqV3, answerLevel, QUESTIONS, EXECUTIVE_CAPABILITIES, LEVELS,
  type FinOpsIqV3Input, type FinOpsIqV3Result, type Facts, type Mode, type AnswerLevel
} from '../src/accelerators/finops-iq/v3';
import rules from '../src/accelerators/finops-iq/v3/engine-rules.json' with { type: 'json' };

const R: any = rules;
const MATURITY = QUESTIONS.filter(q => q.kind === 'maturity');
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const answerFor = (id: string, level: AnswerLevel) => (id === 'UN-08' ? UN08[level] : level);
const ORDER: AnswerLevel[] = ['unknown', 'not_yet', 'crawl', 'walk', 'run'];
const VALUE_MODIFIER = 'expected_value_ge_5pct_of_P';

/** Every scope in, with value bases but no measured evidence, so every maturity question can be asked. */
const FULL: Facts = {
  org: { currency: 'USD', consumingUnits: '20+' },
  footprint: { publicCloudProviders: ['aws', 'azure'], scopes: ['public_cloud', 'data_centre', 'kubernetes', 'ai_api', 'saas', 'licensing'] },
  spend: { byScope: { aws: { exact: 40_000_000 }, azure: { exact: 20_000_000 } }, growth12m: 10 },
  base: { computeShare: { exact: 0.6 }, steadyStateShare: { exact: 0.65 }, eligibleCoverage: { exact: 0.3 }, nonProdShare: { exact: 0.3 } },
  cost: { internalRate: { exact: 12_000 } }
} as Facts;
const SMALL: Facts = {
  org: { currency: 'USD', consumingUnits: '1' },
  footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] },
  spend: { byScope: { aws: { exact: 500_000 } }, growth12m: 0 },
  base: FULL.base, cost: FULL.cost
} as Facts;
const MODES: Mode[] = ['executive', 'workshop'];

const inMode = (mode: Mode) => MATURITY.filter(q => q.modes.includes(mode));
const allAt = (mode: Mode, level: AnswerLevel) => Object.fromEntries(inMode(mode).map(q => [q.id, answerFor(q.id, level)]));
const run = (mode: Mode, answers: Record<string, any>, facts: Facts = FULL, more: Partial<FinOpsIqV3Input> = {}) =>
  evaluateFinOpsIqV3({ mode, facts, answers, assessmentDate: '2026-10-14', ...more });
const cap = (r: FinOpsIqV3Result, id: string) => r.capabilities.find(c => c.capability === id)!;
const rated = (r: FinOpsIqV3Result) => r.capabilities.filter(c => c.rating !== 'not_in_scope' && c.rating !== 'not_assessed');
/** Unknown and Not yet both count as the bottom of the scale; Unknown is then flagged unconfirmed. */
const ratingIndex = (rating: string) => (rating === 'unknown' ? -1 : LEVELS.indexOf(rating as any));
const totalGap = (r: FinOpsIqV3Result) => r.capabilities.reduce((t, c) => t + Math.max(0, c.gap ?? 0), 0);
const needBeforeValue = (r: FinOpsIqV3Result) => {
  const v = r.needVerdict!;
  return Math.min(100, v.baseIndex + v.modifiers.filter(m => m.id !== VALUE_MODIFIER).reduce((t, m) => t + m.points, 0));
};

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
function randomAnswers(seed: number, mode: Mode): Record<string, any> {
  const r = rng(seed);
  return Object.fromEntries(inMode(mode).filter(() => r() >= 0.15).map(q => [q.id, answerFor(q.id, pick(r, ORDER))]));
}

/* ------------------------------ Dead questions ------------------------------ */

describe('FinOps IQ v3 audit: no dead questions', () => {
  for (const mode of MODES) {
    it(`${mode}: every maturity question can change its capability's rating`, () => {
      // From a uniform baseline the question is asked at, Not yet on that one question must move the rating.
      // Follow-up questions are asked only after a weak answer, so the baselines run from Run down to Crawl.
      const dead: string[] = [];
      for (const q of inMode(mode)) {
        const moved = (['run', 'walk', 'crawl'] as AnswerLevel[]).some(level => {
          const base = run(mode, allAt(mode, level));
          if (!base.questions.asked.includes(q.id)) return false;
          const changed = run(mode, { ...allAt(mode, level), [q.id]: answerFor(q.id, 'not_yet') });
          return cap(changed, q.capability).rating !== cap(base, q.capability).rating;
        });
        if (!moved) dead.push(q.id);
      }
      expect(dead).toEqual([]);
    });
  }

  it('hypothesis questions are the only questions that move no rating, by design (D4)', () => {
    const hypotheses = QUESTIONS.filter(q => q.kind === 'hypothesis').map(q => q.id);
    expect(hypotheses).toEqual(['HY-01', 'HY-02', 'HY-03', 'HY-04', 'HY-05', 'HY-06', 'HY-07']);
    for (const q of QUESTIONS.filter(x => x.kind !== 'maturity')) {
      for (const o of q.options ?? []) expect(answerLevel(q, o.value), `${q.id}=${o.value}`).toBeUndefined();
    }
  });
});

/* -------------------------------- Reachability ------------------------------ */

describe('FinOps IQ v3 audit: every rating, band and headline value is reachable', () => {
  for (const mode of MODES) {
    it(`${mode}: every capability in scope reaches Run, Walk, Crawl, Not yet and Unknown`, () => {
      for (const level of ORDER) {
        const r = run(mode, allAt(mode, level));
        const caps = rated(r);
        expect(caps.length, `${mode} ${level}`).toBe(mode === 'executive' ? EXECUTIVE_CAPABILITIES.size : r.capabilities.filter(c => c.rating !== 'not_in_scope').length);
        for (const c of caps) expect(c.rating, `${mode} ${level} ${c.capability}`).toBe(level);
      }
    });

    it(`${mode}: a capability left blank reads "Not answered", not a level`, () => {
      const r = run(mode, {});
      for (const c of rated(r)) {
        expect(c.rating, c.capability).toBe('unknown');
        expect(c.ratingLabel, c.capability).toBe(R.ratingLabels.not_answered.label);
      }
    });

    it(`${mode}: capabilities at or above target spans 0 to every rated capability with a target`, () => {
      const best = run(mode, allAt(mode, 'run'));
      const withTarget = rated(best).filter(c => c.target.level !== null).length;
      expect(withTarget).toBeGreaterThan(0);
      expect(best.headline.atOrAboveTarget).toBe(withTarget);
      expect(run(mode, allAt(mode, 'not_yet')).headline.atOrAboveTarget).toBe(0);
    });
  }

  it('executive: every need band is reached, from Lightweight to Act now', () => {
    const seen = new Set<string>();
    seen.add(run('executive', allAt('executive', 'run'), SMALL).needVerdict!.bandLabel);
    seen.add(run('executive', allAt('executive', 'not_yet')).needVerdict!.bandLabel);
    for (let seed = 1; seed <= 400 && seen.size < R.needVerdict.bands.length; seed++) {
      seen.add(run('executive', randomAnswers(seed, 'executive'), seed % 2 ? SMALL : FULL).needVerdict!.bandLabel);
    }
    expect([...seen].sort()).toEqual(R.needVerdict.bands.map((b: any) => b.label).sort());
  });
});

/* ----------------------------- Single-answer limit -------------------------- */

describe('FinOps IQ v3 audit: one answer moves at most its own capability', () => {
  for (const mode of MODES) {
    it(`${mode}: over random questionnaires, changing one answer changes only its capability's rating, the headline by at most 1 and the gap by at most 3 levels`, () => {
      const breaches: string[] = [];
      for (let seed = 100; seed < 130; seed++) {
        const answers = randomAnswers(seed, mode);
        const base = run(mode, answers);
        for (const q of inMode(mode)) {
          if (!base.questions.asked.includes(q.id)) continue;
          for (const level of ORDER) {
            const r = run(mode, { ...answers, [q.id]: answerFor(q.id, level) });
            const others = r.capabilities.filter(c => c.capability !== q.capability && c.rating !== cap(base, c.capability).rating);
            const tag = `seed ${seed} ${q.id}=${level}`;
            if (others.length) breaches.push(`${tag}: also moved ${others.map(c => c.capability).join(', ')}`);
            if (Math.abs(r.headline.atOrAboveTarget - base.headline.atOrAboveTarget) > 1) breaches.push(`${tag}: headline moved more than 1`);
            if (Math.abs(totalGap(r) - totalGap(base)) > 3) breaches.push(`${tag}: gap moved more than 3 levels`);
          }
        }
      }
      expect(breaches).toEqual([]);
    }, 120_000);
  }
});

/* -------------------------- Unknown, N/A and scope -------------------------- */

describe('FinOps IQ v3 audit: Unknown, N/A and scope', () => {
  for (const mode of MODES) {
    it(`${mode}: Unknown never rates better, closes a gap or lowers need compared with the lowest answered option`, () => {
      for (const level of ['run', 'walk', 'crawl'] as AnswerLevel[]) {
        for (const q of inMode(mode)) {
          const answers = allAt(mode, level);
          const lowest = run(mode, { ...answers, [q.id]: answerFor(q.id, 'not_yet') });
          if (!lowest.questions.asked.includes(q.id)) continue;
          const unknown = run(mode, { ...answers, [q.id]: answerFor(q.id, 'unknown') });
          const tag = `${level} baseline, ${q.id}`;
          expect(ratingIndex(cap(unknown, q.capability).rating), tag).toBeLessThanOrEqual(ratingIndex(cap(lowest, q.capability).rating));
          expect(totalGap(unknown), tag).toBeGreaterThanOrEqual(totalGap(lowest));
          expect(unknown.headline.atOrAboveTarget, tag).toBeLessThanOrEqual(lowest.headline.atOrAboveTarget);
          if (mode === 'executive') expect(needBeforeValue(unknown), tag).toBeGreaterThanOrEqual(needBeforeValue(lowest));
        }
      }
    });

    it(`${mode}: no answer makes a capability "not in scope"; only scope facts do`, () => {
      for (const level of ORDER) {
        const full = run(mode, allAt(mode, level));
        expect(full.capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability), level).toEqual([]);
      }
      const narrow = run(mode, allAt(mode, 'run'), SMALL);
      const out = narrow.capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability);
      expect(out.length).toBeGreaterThan(0);
      for (const level of ORDER) {
        expect(run(mode, allAt(mode, level), SMALL).capabilities.filter(c => c.rating === 'not_in_scope').map(c => c.capability), level).toEqual(out);
      }
    });

    it(`${mode}: value-base facts never move a rating, a gap or the headline`, () => {
      const shares = [{ exact: 0.1 }, { exact: 0.9 }, { unknown: true }];
      for (const level of ['walk', 'crawl'] as AnswerLevel[]) {
        const base = run(mode, allAt(mode, level));
        for (const key of Object.keys(FULL.base!)) {
          for (const v of shares) {
            const r = run(mode, allAt(mode, level), { ...FULL, base: { ...FULL.base, [key]: v } } as Facts);
            const tag = `${level} ${key}=${JSON.stringify(v)}`;
            expect(r.capabilities.map(c => [c.capability, c.rating, c.gap]), tag).toEqual(base.capabilities.map(c => [c.capability, c.rating, c.gap]));
            expect(r.headline.atOrAboveTarget, tag).toBe(base.headline.atOrAboveTarget);
          }
        }
      }
    });
  }
});

/* -------------------------------- Label truth ------------------------------- */

describe('FinOps IQ v3 audit: labels say what is computed (validation M10)', () => {
  const results = MODES.flatMap(mode => Array.from({ length: 60 }, (_, i) => run(mode, randomAnswers(500 + i, mode), i % 3 ? FULL : SMALL)));

  it('every rating label is the register label for the rating computed', () => {
    for (const r of results) {
      for (const c of r.capabilities) {
        const key = c.rating === 'unknown' && c.answered === 0 ? 'not_answered' : c.rating;
        const allowed = [R.ratingLabels[key]?.label, c.rating === 'unknown' ? R.ratingLabels.not_answered.label : undefined].filter(Boolean);
        expect(allowed, `${c.capability} ${c.rating}`).toContain(c.ratingLabel);
      }
    }
  });

  it('"at or above target" is true only for a complete, confirmed rating with no gap', () => {
    for (const r of results) {
      for (const c of r.capabilities) {
        if (c.atOrAboveTarget) expect([c.complete, c.unconfirmed, (c.gap ?? 1) <= 0], c.capability).toEqual([true, false, true]);
      }
      expect(r.headline.atOrAboveTarget).toBe(r.capabilities.filter(c => c.atOrAboveTarget).length);
    }
  });

  it('a capability gap finding exists exactly where a rated capability is below its target', () => {
    for (const r of results) {
      const gaps = r.capabilities.filter(c => (c.gap ?? 0) > 0).map(c => c.capability).sort();
      const findings = r.findings.filter(f => f.type === 'capability_gap').map(f => f.capability).sort();
      expect(findings).toEqual(gaps);
    }
  });

  it('the need band label is the band that holds the need index', () => {
    for (const r of results.filter(x => x.needVerdict)) {
      const band = R.needVerdict.bands.find((b: any) => r.needVerdict!.needIndex <= b.max);
      expect(r.needVerdict!.bandLabel).toBe(band.label);
    }
  });
});
