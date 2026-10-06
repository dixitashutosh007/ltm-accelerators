import defaultKb from './knowledge-base.json' with { type: 'json' };

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
  stageScores: Record<string, { score: number | null; answered: number; total: number }>;
  stageCriticals: Record<string, { pass: number; total: number; failing: any[] }>;
  stageStatuses: Record<string, 'unanswered' | 'in-progress' | 'passed' | 'failed'>;
  domainScores: Record<string, number>;
  checkpointCoverage: Record<string, { status: string; pct: number; checkpoint: any }>;
  valueAtStake: {
    annualSpend: number;
    minSavings: number;
    maxSavings: number;
    minPct: number;
    maxPct: number;
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
    if (a === undefined || a === null || a === '__NA__') return null;
    if (typeof a === 'number' && q.options && q.options[a]) return q.options[a].score;
    return null;
  }

  function stageQuestions(stageId: string) {
    return KB.questions.filter((q: any) => q.stage === stageId);
  }

  function stageScore(stageId: string) {
    const qs = stageQuestions(stageId);
    let t = 0, w = 0, answered = 0;
    qs.forEach((q: any) => {
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
      answered: answered,
      total: qs.length
    };
  }

  function stageCriticals(stageId: string) {
    const qs = stageQuestions(stageId).filter((q: any) => q.critical);
    const st = KB.meta.stages.find((s: any) => s.id === stageId);
    const critMin = st ? st.crit_min : 70;
    let pass = 0;
    const failing: any[] = [];
    qs.forEach((q: any) => {
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

  function domainScores(): Record<string, number> {
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
    const out: Record<string, number> = {};
    Object.keys(acc).forEach((k) => {
      out[k] = acc[k].w ? Math.round(acc[k].t / acc[k].w) : 0;
    });
    return out;
  }

  function checkpointCoverage(): Record<string, { status: string; pct: number; checkpoint: any }> {
    const checkpoints = KB.meta.checkpoints || [];
    const res: Record<string, { status: string; pct: number; checkpoint: any }> = {};
    checkpoints.forEach((c: any) => {
      const matchingQs = KB.questions.filter((q: any) => q.checkpoint_id === c.id);
      if (!matchingQs.length) {
        res[c.id] = { status: 'met', pct: 100, checkpoint: c };
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

  function calculateValueAtStake() {
    const spend = annualSpend || 0;
    const mIdx = maturity();
    let minPct = 0.25, maxPct = 0.35;
    if (mIdx === 0) { minPct = 0.25; maxPct = 0.35; }
    else if (mIdx === 1) { minPct = 0.18; maxPct = 0.28; }
    else if (mIdx === 2) { minPct = 0.10; maxPct = 0.18; }
    else if (mIdx === 3) { minPct = 0.05; maxPct = 0.09; }
    else if (mIdx === 4) { minPct = 0.02; maxPct = 0.04; }

    return {
      annualSpend: spend,
      minSavings: Math.round(spend * minPct),
      maxSavings: Math.round(spend * maxPct),
      minPct: Math.round(minPct * 100),
      maxPct: Math.round(maxPct * 100)
    };
  }

  function buildRoadmap() {
    const stages = KB.meta.stages;
    const mIdx = maturity();
    const nextIdx = Math.min(mIdx + 1, stages.length - 1);
    const gaps: any[] = [];

    stages.forEach((st: any, si: number) => {
      stageQuestions(st.id).forEach((q: any) => {
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
            gapSize: s === null ? 100 : (target - s)
          });
        }
      });
    });

    const rank = (a: any, b: any) =>
      (b.q.critical ? 1 : 0) - (a.q.critical ? 1 : 0) ||
      (b.q.weight || 1) - (a.q.weight || 1) ||
      b.gapSize - a.gapSize;

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

  return {
    maturity: matIdx,
    maturityStage: matIdx >= 0 ? KB.meta.stages[matIdx] : null,
    overallScore: overallScore(),
    stageScores,
    stageCriticals: stageCriticalsMap,
    stageStatuses,
    domainScores: domainScores(),
    checkpointCoverage: checkpointCoverage(),
    valueAtStake: calculateValueAtStake(),
    roadmap: buildRoadmap(),
    timestamp: new Date().toISOString()
  };
}
