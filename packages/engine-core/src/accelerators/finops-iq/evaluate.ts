import defaultKb from './knowledge-base.json' with { type: 'json' };

const NOT_APPLICABLE = '__NA__';

export interface FinOpsIqInput {
  answers: Record<string, number | string>;
  annualSpend?: number;
  org?: {
    name?: string;
    industry?: string;
    currency?: string;
  };
}

export interface FinOpsIqEvaluation {
  maturity: number;
  maturityStage: any;
  overallScore: number | null;
  /** answered includes questions marked "not applicable"; the score uses only scored answers. */
  stageScores: Record<string, { score: number | null; answered: number; total: number; notApplicable: number }>;
  /** A critical question marked "not applicable" is out of scope and counts as passing its gate. */
  stageCriticals: Record<string, { pass: number; total: number; failing: any[] }>;
  stageStatuses: Record<string, 'unanswered' | 'in-progress' | 'passed' | 'failed'>;
  /** null when no question in the domain has a scored answer ("not assessed"). */
  domainScores: Record<string, number | null>;
  /** status: met | partial | blocker | na (every mapped question marked "not applicable"). */
  checkpointCoverage: Record<string, { status: string; pct: number; checkpoint: any }>;
  coverage: { answered: number; total: number; notApplicable: number };
  valueAtStake: {
    annualSpend: number;
    minSavings: number;
    maxSavings: number;
    minPct: number;
    maxPct: number;
    /** client-estimate: the client's own waste range from T6. maturity-stage: LTM's band for the assessed stage. */
    basis: 'client-estimate' | 'maturity-stage';
  };
  roadmap: {
    horizons: Array<{
      name: string;
      when: string;
      color: string;
      aim: string;
      items: any[];
    }>;
  };
  timestamp: string;
}

export function evaluateFinOpsIq(
  input: FinOpsIqInput,
  customKb?: any
): FinOpsIqEvaluation {
  const KB = customKb || defaultKb;
  const answers = input.answers || {};
  const annualSpend = input.annualSpend || 0;

  function qScore(q: any, a: any): number | null {
    if (a === undefined || a === null || a === NOT_APPLICABLE) return null;
    if (typeof a === 'number' && q.options && q.options[a]) return q.options[a].score;
    return null;
  }

  // "Not applicable": answered (for completeness) but out of scope (left out of every score).
  const isNA = (q: any) => answers[q.id] === NOT_APPLICABLE;

  function stageQuestions(stageId: string) {
    return KB.questions.filter((q: any) => q.stage === stageId);
  }

  function stageScore(stageId: string) {
    const qs = stageQuestions(stageId);
    let t = 0, w = 0, answered = 0, notApplicable = 0;
    qs.forEach((q: any) => {
      if (isNA(q)) { answered++; notApplicable++; return; }
      const s = qScore(q, answers[q.id]);
      if (s !== null) {
        const ww = q.weight || 1;
        t += s * ww;
        w += ww;
        answered++;
      }
    });
    return {
      score: w ? Math.round(t / w) : null,
      answered,
      total: qs.length,
      notApplicable
    };
  }

  function stageCriticals(stageId: string) {
    const qs = stageQuestions(stageId).filter((q: any) => q.critical);
    const st = KB.meta.stages.find((s: any) => s.id === stageId);
    const critMin = st ? st.crit_min : 70;
    let pass = 0;
    const failing: any[] = [];
    qs.forEach((q: any) => {
      if (isNA(q)) { pass++; return; }
      const s = qScore(q, answers[q.id]);
      if (s !== null && s >= critMin) pass++;
      else failing.push({ q: { id: q.id, text: q.text, critical: q.critical }, score: s, target: critMin });
    });
    return { pass, total: qs.length, failing };
  }

  function stageStatus(stageId: string): 'unanswered' | 'in-progress' | 'passed' | 'failed' {
    const sc = stageScore(stageId);
    if (sc.answered === 0) return 'unanswered';
    const st = KB.meta.stages.find((s: any) => s.id === stageId);
    const cr = stageCriticals(stageId);
    if (sc.score !== null && st && sc.score >= st.threshold && cr.failing.length === 0 && sc.answered === sc.total) {
      return 'passed';
    }
    if (sc.answered < sc.total) return 'in-progress';
    return 'failed';
  }

  function maturity(): number {
    const stages = KB.meta.stages;
    let highest = -1;
    for (let i = 0; i < stages.length; i++) {
      if (stageStatus(stages[i].id) === 'passed') {
        highest = i;
      } else {
        break; // strict prerequisite gating
      }
    }
    return highest;
  }

  function overallScore(): number | null {
    let t = 0, w = 0;
    KB.questions.forEach((q: any) => {
      const s = qScore(q, answers[q.id]);
      if (s !== null) {
        const ww = q.weight || 1;
        t += s * ww;
        w += ww;
      }
    });
    return w ? Math.round(t / w) : null;
  }

  function domainScores(): Record<string, number | null> {
    const acc: Record<string, { t: number; w: number }> = {};
    KB.meta.domains.forEach((d: any) => (acc[d.id] = { t: 0, w: 0 }));
    KB.questions.forEach((q: any) => {
      const s = qScore(q, answers[q.id]);
      if (s !== null && acc[q.domain]) {
        const ww = q.weight || 1;
        acc[q.domain].t += s * ww;
        acc[q.domain].w += ww;
      }
    });
    const out: Record<string, number | null> = {};
    Object.keys(acc).forEach((k) => {
      out[k] = acc[k].w ? Math.round(acc[k].t / acc[k].w) : null; // null = not assessed, not a score of 0
    });
    return out;
  }

  function checkpointCoverage(): Record<string, { status: string; pct: number; checkpoint: any }> {
    const checkpoints = KB.meta.checkpoints || [];
    const res: Record<string, { status: string; pct: number; checkpoint: any }> = {};
    checkpoints.forEach((c: any) => {
      const mapped = KB.questions.filter((q: any) => q.checkpoint_id === c.id);
      if (!mapped.length) {
        res[c.id] = { status: 'met', pct: 100, checkpoint: c };
        return;
      }
      // Questions marked "not applicable" are out of scope for the checkpoint.
      const matchingQs = mapped.filter((q: any) => !isNA(q));
      if (!matchingQs.length) {
        res[c.id] = { status: 'na', pct: 0, checkpoint: c };
        return;
      }
      let totalScore = 0, count = 0, hasCriticalFailure = false;
      matchingQs.forEach((q: any) => {
        const s = qScore(q, answers[q.id]);
        if (s !== null) {
          totalScore += s;
          count++;
          // Same bar as the stage gate: the question's stage minimum (70-80), not a flat 70.
          const critMin = KB.meta.stages.find((st: any) => st.id === q.stage)?.crit_min ?? 70;
          if (q.critical && s < critMin) hasCriticalFailure = true;
        }
      });
      const avg = count ? Math.round(totalScore / count) : 0;
      let st = 'blocker';
      if (count === matchingQs.length && avg >= 75 && !hasCriticalFailure) st = 'met';
      else if (count > 0 && avg >= 40) st = 'partial';
      res[c.id] = { status: st, pct: avg, checkpoint: c };
    });
    return res;
  }

  // The client's own estimate of waste (T6), as a % range of spend, when they gave one.
  function clientWasteEstimate(): [number, number] | null {
    const q = KB.questions.find((x: any) => x.id === 'T6');
    const a = q ? answers[q.id] : undefined;
    const range = typeof a === 'number' ? q.options?.[a]?.waste_pct_range : undefined;
    return Array.isArray(range) && range.length === 2 ? [range[0], range[1]] : null;
  }

  function calculateValueAtStake(): FinOpsIqEvaluation['valueAtStake'] {
    const spend = annualSpend || 0;
    const estimate = clientWasteEstimate();
    let minPct = 25, maxPct = 35;
    let basis: 'client-estimate' | 'maturity-stage' = 'maturity-stage';
    if (estimate) {
      [minPct, maxPct] = estimate;
      basis = 'client-estimate';
    } else {
      // LTM heuristic band per assessed stage. "Below Stage 1" (-1) and Stage 1 (0) share 25-35%.
      const mIdx = maturity();
      if (mIdx === 1) { minPct = 18; maxPct = 28; }
      else if (mIdx === 2) { minPct = 10; maxPct = 18; }
      else if (mIdx === 3) { minPct = 5; maxPct = 9; }
      else if (mIdx === 4) { minPct = 2; maxPct = 4; }
    }

    return {
      annualSpend: spend,
      minSavings: Math.round((spend * minPct) / 100),
      maxSavings: Math.round((spend * maxPct) / 100),
      minPct,
      maxPct,
      basis
    };
  }

  function buildRoadmap() {
    const stages = KB.meta.stages;
    const mIdx = maturity();
    const nextIdx = Math.min(mIdx + 1, stages.length - 1);
    const gaps: any[] = [];

    stages.forEach((st: any, si: number) => {
      stageQuestions(st.id).forEach((q: any) => {
        if (isNA(q)) return; // out of scope: not a gap
        const s = qScore(q, answers[q.id]);
        const target = q.critical ? st.crit_min : st.threshold;
        if (s === null || s < target) {
          gaps.push({
            q: {
              id: q.id,
              text: q.text,
              critical: q.critical,
              weight: q.weight,
              domain: q.domain,
              finops_capability: q.finops_capability,
              remediation: q.remediation
            },
            stage: st,
            stageIdx: si,
            score: s,
            target,
            // Unanswered: the gap is unknown, so it is marked "to assess" rather than ranked as the worst answer.
            gapSize: s === null ? null : (target - s),
            toAssess: s === null
          });
        }
      });
    });

    // Known gaps first, then critical, weight and size of the gap.
    const rank = (a: any, b: any) =>
      (a.toAssess ? 1 : 0) - (b.toAssess ? 1 : 0) ||
      (b.q.critical ? 1 : 0) - (a.q.critical ? 1 : 0) ||
      (b.q.weight || 1) - (a.q.weight || 1) ||
      (b.gapSize ?? 0) - (a.gapSize ?? 0);

    const short = gaps.filter((g) => g.stageIdx <= nextIdx && g.q.critical).sort(rank);
    const mid = gaps
      .filter((g) => (g.stageIdx <= nextIdx && !g.q.critical) || (g.stageIdx === nextIdx + 1 && g.q.critical))
      .sort(rank);
    const long = gaps
      .filter((g) => g.stageIdx > nextIdx && !(g.stageIdx === nextIdx + 1 && g.q.critical))
      .sort(rank);

    return {
      horizons: [
        {
          name: 'Short Term',
          when: '0–3 Months',
          color: '#FF5E4F',
          aim:
            mIdx < stages.length - 1
              ? 'Unblock prerequisite gates for ' + stages[nextIdx].name + ' & capture immediate waste savings.'
              : 'Protect baseline posture against control drift.',
          items: short
        },
        {
          name: 'Mid Term',
          when: '3–9 Months',
          color: '#B26A00',
          aim: 'Deploy policy-as-code guardrails, container allocation, and embed monthly engineering review cadences.',
          items: mid
        },
        {
          name: 'Long Term',
          when: '9–24 Months',
          color: '#226882',
          aim: 'Achieve real-time unit economics, multi-tenant chargeback, and direct product margin integration.',
          items: long
        }
      ]
    };
  }

  // Pre-calculate per-stage data
  const stageScores: Record<string, any> = {};
  const stageCriticalsMap: Record<string, any> = {};
  const stageStatuses: Record<string, any> = {};

  KB.meta.stages.forEach((st: any) => {
    stageScores[st.id] = stageScore(st.id);
    stageCriticalsMap[st.id] = stageCriticals(st.id);
    stageStatuses[st.id] = stageStatus(st.id);
  });

  const matIdx = maturity();
  const coverage = Object.values(stageScores).reduce(
    (c: any, s: any) => ({ answered: c.answered + s.answered, total: c.total + s.total, notApplicable: c.notApplicable + s.notApplicable }),
    { answered: 0, total: 0, notApplicable: 0 }
  );

  return {
    maturity: matIdx,
    maturityStage: matIdx >= 0 ? KB.meta.stages[matIdx] : null,
    overallScore: overallScore(),
    stageScores,
    stageCriticals: stageCriticalsMap,
    stageStatuses,
    domainScores: domainScores(),
    checkpointCoverage: checkpointCoverage(),
    coverage,
    valueAtStake: calculateValueAtStake(),
    roadmap: buildRoadmap(),
    timestamp: new Date().toISOString()
  };
}
