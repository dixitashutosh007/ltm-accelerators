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
  /** Operating-model (S2) maturity on the 1-5 scale. Replaces the former "velocity multiple", which was S2 x 0.85 shown as "1.7x". */
  deliveryMaturity: number;
  resilienceScore: number;
  timestamp: string;
}

/** Neutral score for an unanswered question on the 1-5 scale. */
const NEUTRAL = 3.0;
const toScale = (value: number, min: number, max: number) =>
  max > min ? 1.0 + (Math.max(min, Math.min(max, value)) - min) / (max - min) * 4.0 : NEUTRAL;

/**
 * Maturity score (1-5) for one answer, or null when the question does not measure maturity.
 * Single-select answers are option indexes; the score comes from the knowledge base.
 */
export function computeQuestionScore(q: any, val: any): number | null {
  // Ranking questions capture priorities for the narrative; they are not maturity measures.
  if (q.type === 'drag_rank') return null;
  if (val === undefined || val === null) {
    if (q.type === 'slider' && q.sliderConfig) {
      const cfg = q.sliderConfig;
      return toScale(cfg.defaultVal ?? (cfg.min + cfg.max) / 2, cfg.min, cfg.max);
    }
    return NEUTRAL;
  }
  if (q.type === 'single_select') {
    const opt = Number.isInteger(val) ? q.opts?.[val] : undefined;
    return typeof opt?.score === 'number' ? opt.score : NEUTRAL;
  }
  if (q.type === 'multi_select') {
    // Each question lists good practices: every practice in place adds maturity, capped at 5.
    const picked = Array.isArray(val) ? new Set(val.filter((i: unknown) => Number.isInteger(i) && q.opts?.[i as number])) : new Set();
    return Math.min(1 + picked.size * 0.8, 5.0);
  }
  if (q.type === 'slider') {
    const cfg = q.sliderConfig || { min: 1, max: 5 };
    return typeof val === 'number' && Number.isFinite(val) ? toScale(val, cfg.min, cfg.max) : NEUTRAL;
  }
  if (q.type === 'rating_matrix') {
    if (typeof val === 'object') {
      const vals = Object.values(val).filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 5);
      if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return NEUTRAL;
  }
  return NEUTRAL;
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
    const scores = qList.map((q: any) => computeQuestionScore(q, A[q.id])).filter((v: number | null): v is number => v !== null);
    sectionScores[sec.id] = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : NEUTRAL;
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

  const s4Score = sectionScores["S4"] || NEUTRAL;
  const debtDragPct = Math.max(8, Math.min(45, Math.round((5.2 - s4Score) * 8.5)));
  const debtDollarWaste = Math.round(itSpend * (debtDragPct / 100));

  const s1Score = sectionScores["S1"] || NEUTRAL;
  const alignmentIndex = Math.round((s1Score / 5) * 100);

  const deliveryMaturity = Math.round((sectionScores["S2"] || NEUTRAL) * 10) / 10;

  const s5Score = sectionScores["S5"] || NEUTRAL;
  const resilienceScore = Math.round((s5Score / 5) * 100);

  return {
    sectionScores,
    overall,
    band,
    bandClass,
    alignmentIndex,
    debtDragPct,
    debtDollarWaste,
    deliveryMaturity,
    resilienceScore,
    timestamp: new Date().toISOString()
  };
}
