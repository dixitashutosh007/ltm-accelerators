import defaultKb from './knowledge-base.json' with { type: 'json' };

export interface StrategyIqInput {
  answers: Record<string, any>;
  intake?: {
    orgName?: string;
    sector?: string;
    itSpend?: number;
    execRole?: string;
  };
}

export interface StrategyIqEvaluation {
  sectionScores: Record<string, number>;
  overall: number;
  band: string;
  bandClass: string;
  alignmentIndex: number;
  debtDragPct: number;
  debtDollarWaste: number;
  deliveryVelocity: string;
  resilienceScore: number;
  timestamp: string;
}

export function computeQuestionScore(q: any, val: any): number {
  if (val === undefined || val === null) {
    if (q.type === 'slider' && q.sliderConfig) return q.sliderConfig.defaultVal || 3.0;
    return 3.0;
  }
  if (q.type === 'single_select') {
    if (q.opts && typeof val === 'number' && q.opts[val]) return q.opts[val].score || 3.0;
    return 3.0;
  }
  if (q.type === 'slider') {
    const cfg = q.sliderConfig || { min: 1, max: 5 };
    const norm = (val - cfg.min) / (cfg.max - cfg.min);
    return 1.0 + (norm * 4.0);
  }
  if (q.type === 'rating_matrix') {
    if (typeof val === 'object' && val !== null) {
      const vals = Object.values(val) as number[];
      if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return 3.0;
  }
  if (q.type === 'drag_rank') return 3.2;
  return 3.0;
}

export function evaluateStrategyIq(
  input: StrategyIqInput,
  customKb?: any
): StrategyIqEvaluation {
  const KB = customKb || defaultKb;
  const A = input.answers || {};
  const intake = input.intake || {};
  const itSpend = intake.itSpend || 60000000;

  const sectionScores: Record<string, number> = {};
  KB.sections.forEach((sec: any) => {
    const qList = KB.questions.filter((q: any) => q.section === sec.id);
    let sum = 0;
    qList.forEach((q: any) => {
      sum += computeQuestionScore(q, A[q.id]);
    });
    sectionScores[sec.id] = qList.length > 0 ? sum / qList.length : 3.0;
  });

  const overallRaw =
    Object.values(sectionScores).reduce((a, b) => a + b, 0) / (KB.sections.length || 1);
  const overall = Math.round(overallRaw * 10) / 10;

  let band = "Emerging";
  let bandClass = "band-emerging";
  if (overall < 2.0) {
    band = "Nascent (At Severe Risk)";
    bandClass = "band-nascent";
  } else if (overall < 3.0) {
    band = "Emerging (Friction & Drift)";
    bandClass = "band-emerging";
  } else if (overall < 4.0) {
    band = "Established (Operational)";
    bandClass = "band-established";
  } else if (overall < 4.6) {
    band = "Advanced (Product-Led)";
    bandClass = "band-advanced";
  } else {
    band = "Leading (Industry Benchmark)";
    bandClass = "band-leading";
  }

  const s4Score = sectionScores["S4"] || 3.0;
  const debtDragPct = Math.max(8, Math.min(45, Math.round((5.2 - s4Score) * 8.5)));
  const debtDollarWaste = Math.round(itSpend * (debtDragPct / 100));

  const s1Score = sectionScores["S1"] || 3.0;
  const alignmentIndex = Math.round((s1Score / 5) * 100);

  const s2Score = sectionScores["S2"] || 3.0;
  const deliveryVelocity = (s2Score * 0.85).toFixed(1);

  const s5Score = sectionScores["S5"] || 3.0;
  const resilienceScore = Math.round((s5Score / 5) * 100);

  return {
    sectionScores,
    overall,
    band,
    bandClass,
    alignmentIndex,
    debtDragPct,
    debtDollarWaste,
    deliveryVelocity,
    resilienceScore,
    timestamp: new Date().toISOString()
  };
}
