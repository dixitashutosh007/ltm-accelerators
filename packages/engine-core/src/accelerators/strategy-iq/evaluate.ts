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
  /** Mean of the answered scored questions in each section (1-5); 3.0 (neutral) when none is answered. */
  sectionScores: Record<string, number>;
  /** Short band name for each section ("Nascent" ... "Leading"), from the same thresholds as the overall band. */
  sectionBands: Record<string, string>;
  /** Answered scored questions per section. */
  sectionAnswered: Record<string, number>;
  /** Answered vs total scored questions (rankings are not scored and are not counted). */
  completeness: { answered: number; total: number };
  overall: number;
  band: string;
  bandClass: string;
  /** (S1 - 1) / 4 x 100: 0% for the least mature answers, 100% for the most. */
  alignmentIndex: number;
  /** Indicative tech-debt drag (LTM heuristic): (5.2 - S4) x 8.5% of IT spend, capped at 45%. */
  debtDragPct: number;
  debtDollarWaste: number;
  /** Operating-model (S2) maturity on the 1-5 scale. Replaces the former "velocity multiple", which was S2 x 0.85 shown as "1.7x". */
  deliveryMaturity: number;
  /** (S5 - 1) / 4 x 100. */
  resilienceScore: number;
  timestamp: string;
}

/** Neutral score for a section with no answered scored questions, on the 1-5 scale. */
const NEUTRAL = 3.0;
const toScale = (value: number, min: number, max: number) =>
  max > min ? 1.0 + (Math.max(min, Math.min(max, value)) - min) / (max - min) * 4.0 : NEUTRAL;
/** Maps a 1-5 score to 0-100%, so the least mature client reads 0%, not 20%. */
const toPercent = (score: number) => Math.round(((Math.max(1, Math.min(5, score)) - 1) / 4) * 100);

/** Band thresholds, applied to the unrounded 1-5 score. */
export const STRATEGY_IQ_BANDS = [
  { below: 2.0, band: 'Nascent (At Severe Risk)', short: 'Nascent', bandClass: 'band-nascent' },
  { below: 3.0, band: 'Emerging (Friction & Drift)', short: 'Emerging', bandClass: 'band-emerging' },
  { below: 4.0, band: 'Established (Operational)', short: 'Established', bandClass: 'band-established' },
  { below: 4.6, band: 'Advanced (Product-Led)', short: 'Advanced', bandClass: 'band-advanced' },
  { below: Infinity, band: 'Leading', short: 'Leading', bandClass: 'band-leading' }
] as const;
export const strategyIqBandFor = (score: number) =>
  STRATEGY_IQ_BANDS.find(b => score < b.below) ?? STRATEGY_IQ_BANDS[STRATEGY_IQ_BANDS.length - 1];

/**
 * Maturity score (1-5) for one answer, or null when the question is unanswered or does not measure maturity.
 * Unanswered questions are left out of section averages, so a skipped question never reads better than an honest
 * "none of these are in place".
 * Single-select answers are option indexes; the score comes from the knowledge base.
 */
export function computeQuestionScore(q: any, val: any): number | null {
  // Ranking questions capture priorities for the narrative; they are not maturity measures.
  if (q.type === 'drag_rank') return null;
  if (val === undefined || val === null) return null;
  if (q.type === 'single_select') {
    const opt = Number.isInteger(val) ? q.opts?.[val] : undefined;
    return typeof opt?.score === 'number' ? opt.score : null;
  }
  if (q.type === 'multi_select') {
    // Each question lists good practices: every practice in place adds maturity, capped at 5.
    // An explicit empty list ("None of these are in place") is an answer and scores 1.
    if (!Array.isArray(val)) return null;
    const picked = new Set(val.filter((i: unknown) => Number.isInteger(i) && q.opts?.[i as number]));
    return Math.min(1 + picked.size * 0.8, 5.0);
  }
  if (q.type === 'slider') {
    const cfg = q.sliderConfig || { min: 1, max: 5 };
    return typeof val === 'number' && Number.isFinite(val) ? toScale(val, cfg.min, cfg.max) : null;
  }
  if (q.type === 'rating_matrix') {
    if (typeof val === 'object') {
      const vals = Object.values(val).filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 5);
      if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return null;
  }
  return null;
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
  const sectionBands: Record<string, string> = {};
  const sectionAnswered: Record<string, number> = {};
  let answered = 0;
  let total = 0;
  KB.sections.forEach((sec: any) => {
    const scored = KB.questions.filter((q: any) => q.section === sec.id && q.type !== 'drag_rank');
    const scores = scored.map((q: any) => computeQuestionScore(q, A[q.id])).filter((v: number | null): v is number => v !== null);
    sectionScores[sec.id] = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : NEUTRAL;
    sectionBands[sec.id] = strategyIqBandFor(sectionScores[sec.id]).short;
    sectionAnswered[sec.id] = scores.length;
    answered += scores.length;
    total += scored.length;
  });

  const overallRaw =
    Object.values(sectionScores).reduce((a, b) => a + b, 0) / (KB.sections.length || 1);
  const overall = Math.round(overallRaw * 10) / 10;
  // The band comes from the unrounded score: 3.96 displays as "4.0" but is still Established.
  const { band, bandClass } = strategyIqBandFor(overallRaw);

  const s4Score = sectionScores["S4"] ?? NEUTRAL;
  // Indicative LTM heuristic, not a measured figure. No floor: a fully mature S4 reads about 2%.
  const debtDragPct = Math.max(0, Math.min(45, Math.round((5.2 - s4Score) * 8.5)));
  const debtDollarWaste = Math.round(itSpend * (debtDragPct / 100));

  const alignmentIndex = toPercent(sectionScores["S1"] ?? NEUTRAL);
  const deliveryMaturity = Math.round((sectionScores["S2"] ?? NEUTRAL) * 10) / 10;
  const resilienceScore = toPercent(sectionScores["S5"] ?? NEUTRAL);

  return {
    sectionScores,
    sectionBands,
    sectionAnswered,
    completeness: { answered, total },
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
