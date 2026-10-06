import defaultKb from './knowledge-base.json' with { type: 'json' };

export interface PostureIqInput {
  answers: Record<string, any>;
  org?: {
    name?: string;
    turnover?: number;
    hq?: string;
    footprint?: string;
    size?: string;
    resp?: string;
    role?: string;
  };
  regulations?: string[];
  sectors?: string[];
  mode?: 'workshop' | 'flash';
}

export interface PostureIqFinding {
  qid: string;
  reg: string;
  a: string;
  severity: string;
  title: string;
  detail: string;
  phase: number;
  remedy: string;
  steps: string[];
  row?: string;
  col?: string;
}

export interface PostureIqEvaluation {
  overallScore: number;
  label: { t: string; c: string; grade: string };
  /** Scored (maturity) questions in the active questionnaire, and how many were answered. */
  coverage: { answered: number; total: number };
  /** True when fewer than 60% of the scored questions were answered. */
  lowConfidence: boolean;
  pillarScores: {
    pillars: Array<{
      id: string;
      num: string;
      name: string;
      desc: string;
      weight: number;
      /** null when no scored question in the pillar was answered; the pillar is then left out of the overall score. */
      score: number | null;
      included: boolean;
      status: string;
      color: string;
      bg: string;
      qCount: number;
      answeredCount: number;
    }>;
    overallScore: number;
    label: { t: string; c: string; grade: string };
  };
  penalties: {
    turnover: number;
    /** True when the client gave no turnover and the engine used its default. */
    turnoverAssumed: boolean;
    fines: Array<{
      regId: string;
      regName: string;
      statuteBasis: string;
      capUSD: number | null; // null when no quantified cap applies (DORA for financial entities, NIS2 pending, no AI)
      capFormatted: string;
      status: string;
      statusColor: string;
    }>;
    totalValueAtStake: number;
    advisoryFeeEstimate: number;
    riskHedgeRatio: string;
  };
  findings: PostureIqFinding[];
  /** Obligations that follow from the client's scope answers (entity type, data held, AI use). Severity 'info'; not scored or counted. */
  obligations: Array<PostureIqFinding & { baseSeverity: string }>;
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  rag: Record<string, { rag: string; status: string; count: number }>;
  triggeredProbes: any[];
  businessImpactBand: number;
  timestamp: string;
}

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, positive: 0 };

/** One severity-to-score table for every question type. */
export const SEVERITY_SCORE: Record<string, number> = { positive: 100, low: 75, medium: 50, high: 25, critical: 0 };

export const EUR_TO_USD = 1.08;
export const GBP_TO_USD = 1.27;
export const DEFAULT_TURNOVER_USD = 250000000;
/** Below this share of answered scored questions the result is flagged as low confidence. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Dynamic probe triggers. Every condition must hold.
 *  { q, any }  : the answer (or one of the selected values) is in the list
 *  { q, none } : the answer is not in the list (an unanswered question passes)
 *  { reg }     : the regulation is in scope
 * The page embeds the same object (var PROBE_CONDITIONS) for its per-question prompts.
 */
export type ProbeCondition = { q: string; any: string[] } | { q: string; none: string[] } | { reg: string };
export const PROBE_CONDITIONS: Record<string, ProbeCondition[]> = {
  PROBE_1_RESIDENCY_ILLUSION: [
    { q: 'C1', any: ['aws-eu', 'azure-eu', 'gcp-eu'] },
    { q: 'H1', any: ['us', 'us-eubound'] },
    { q: 'F2', none: ['cmk-eu'] }
  ],
  PROBE_2_SAAS_BLINDSPOT: [
    { q: 'C1', any: ['salesforce', 'snowflake', 'databricks'] },
    { q: 'B1', any: ['special', 'financial', 'pii'] },
    { q: 'F2', none: ['cmk-eu'] }
  ],
  PROBE_3_DORA_EXIT: [
    { q: 'F4', any: ['no', 'planned'] },
    { reg: 'dora' }
  ],
  PROBE_4_AI_DRIFT: [
    { q: 'G1', any: ['internal', 'highrisk'] },
    { q: 'G2', any: ['mixed', 'us-dpf', 'us', 'unknown'] }
  ],
  PROBE_5_ONPREM_BACKDOOR: [
    { q: 'C1', any: ['onprem'] },
    { q: 'H1', any: ['us', 'us-eubound', 'other'] }
  ],
  PROBE_6_KMS_BYOK_ILLUSION: [
    { q: 'F2', any: ['cmk-eu', 'provider'] },
    { q: 'H1', any: ['us', 'us-eubound'] },
    { q: 'H3', none: ['hyok'] }
  ]
};

export function probeConditionsMet(conds: ProbeCondition[], answers: Record<string, any>, regs: string[]): boolean {
  return conds.every(c => {
    if ('reg' in c) return regs.includes(c.reg);
    const a = answers[c.q];
    const vals: unknown[] = Array.isArray(a) ? a : a === undefined || a === null ? [] : [a];
    if ('any' in c) return vals.some(v => c.any.includes(v as string));
    return !vals.some(v => c.none.includes(v as string));
  });
}

function formatCurrency(num: number): string {
  if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
  return '$' + num.toLocaleString();
}

export function postureLabel(s: number): { t: string; c: string; grade: string } {
  if (s >= 85) return { t: 'Defensible', c: '#1B5B34', grade: 'A' };
  if (s >= 65) return { t: 'Improving / Managed', c: '#226882', grade: 'B' };
  if (s >= 40) return { t: 'Material Exposure', c: '#E39A2E', grade: 'C' };
  return { t: 'Critical Non-Compliance', c: '#B93829', grade: 'D' };
}

export const NOT_ASSESSED_LABEL = { t: 'Not assessed', c: '#5B5B5B', grade: '—' };

/** Questions that describe exposure (scope) or preferences rather than maturity are not scored. */
export function isScoredQuestion(q: any): boolean {
  return !q.scoring;
}

const sevScore = (sev: unknown): number | null =>
  typeof sev === 'string' && sev in SEVERITY_SCORE ? SEVERITY_SCORE[sev] : null;

const worst = (scores: Array<number | null>): number | null => {
  const s = scores.filter((x): x is number => x !== null);
  return s.length ? Math.min(...s) : null;
};

/** Score of one answer (0-100), or null when unanswered. Multi and matrix take the worst selection. */
export function evaluateQuestionScore(q: any, ans: any): number | null {
  if (ans === undefined || ans === null) return null;
  if (q.type === 'single' || q.type === 'boolean') {
    return sevScore((q.options || []).find((o: any) => o.value === ans)?.sev);
  }
  if (q.type === 'scale') {
    return sevScore((q.scale || []).find((s: any) => s.v === ans)?.sev);
  }
  if (q.type === 'multi') {
    if (!Array.isArray(ans) || !ans.length) return null;
    return worst(ans.map(v => sevScore((q.options || []).find((o: any) => o.value === v)?.sev)));
  }
  if (q.type === 'matrix') {
    if (typeof ans !== 'object' || Array.isArray(ans)) return null;
    return worst(Object.values(ans).map(col => {
      const c = (q.cols || []).find((x: any) => x.id === col);
      return sevScore(c?.sev ?? (q.cellFindings && q.cellFindings[col as string]?.severity) ?? (c ? 'positive' : undefined));
    }));
  }
  return null;
}

/** Fill {row} / {rowlower} placeholders in a matrix cell finding. */
function fillRow(f: any, rowLabel: string): any {
  const sub = (t: unknown) => (typeof t === 'string' ? t.replace(/\{rowlower\}/g, rowLabel.toLowerCase()).replace(/\{row\}/g, rowLabel) : t);
  return { ...f, title: sub(f.title), detail: sub(f.detail), remedy: sub(f.remedy), steps: Array.isArray(f.steps) ? f.steps.map(sub) : f.steps };
}

/** Raw findings for one answered question (positive ones included). */
function questionFindings(q: any, ans: any): any[] {
  const out: any[] = [];
  if (ans === undefined || ans === null) return out;
  const push = (f: any, extra: any = {}) => out.push(Object.assign({ qid: q.id }, extra, f));
  if (q.type === 'single' || q.type === 'boolean') {
    const opt = (q.options || []).find((o: any) => o.value === ans);
    (opt?.findings || []).forEach((f: any) => push(f));
  } else if (q.type === 'scale') {
    const s = (q.scale || []).find((x: any) => x.v === ans);
    (s?.findings || []).forEach((f: any) => push(f));
  } else if (q.type === 'multi') {
    (Array.isArray(ans) ? ans : []).forEach((val: any) => {
      const opt = (q.options || []).find((o: any) => o.value === val);
      (opt?.findings || []).forEach((f: any) => push(f));
    });
  } else if (q.type === 'matrix' && typeof ans === 'object') {
    // Cell findings are keyed by column; the row is kept on the finding.
    Object.entries(ans).forEach(([row, col]) => {
      const f = q.cellFindings && q.cellFindings[col as string];
      if (!f) return;
      const rowLabel = (q.rows || []).find((r: any) => r.id === row)?.label || row;
      out.push(Object.assign({ qid: q.id, row, col }, fillRow(f, rowLabel)));
    });
  }
  return out;
}

const bySeverity = (a: any, b: any) => ((SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0)) || ((a.phase || 0) - (b.phase || 0));

/** At most one finding per (question, title); the list is already sorted worst-first. */
function dedupe<T extends { qid: string; title: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter(f => {
    const k = f.qid + '\u0000' + f.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function evaluatePostureIq(
  input: PostureIqInput,
  customKb?: any
): PostureIqEvaluation {
  const KB = customKb || defaultKb;
  const answers = input.answers || {};
  const org = input.org || {};
  const turnoverAssumed = !(typeof org.turnover === 'number' && org.turnover > 0);
  const turnover = turnoverAssumed ? DEFAULT_TURNOVER_USD : (org.turnover as number);
  const inScopeRegs = (input.regulations && input.regulations.length > 0)
    ? input.regulations
    : ['dora', 'gdpr', 'nis2', 'aiact'];
  const mode = input.mode || 'workshop';
  const knownRegs = new Set((KB.regulations || []).map((r: any) => r.id));

  // A finding tagged with a regulation is kept only if that regulation is in scope. UK GDPR mirrors EU GDPR, so the
  // two count as one family. A2 = 'na' (self-declared not a DORA entity) takes DORA findings out of scope.
  const notDoraEntity = answers['A2'] === 'na';
  const regInScope = (reg: unknown): boolean => {
    if (typeof reg !== 'string' || !knownRegs.has(reg)) return true; // regulation-agnostic
    if (reg === 'dora' && notDoraEntity) return false;
    if (reg === 'gdpr' || reg === 'ukgdpr') return inScopeRegs.includes('gdpr') || inScopeRegs.includes('ukgdpr');
    return inScopeRegs.includes(reg);
  };

  // Determine active questions
  const activeQuestions = (KB.questions || []).filter((q: any) => {
    if (mode === 'flash' && KB.flashQuestions && !KB.flashQuestions.includes(q.id)) {
      return false;
    }
    if (!q.appliesTo) return true;
    const a = q.appliesTo;
    if (a.regulations && a.regulations.length) {
      if (!a.regulations.some((r: string) => inScopeRegs.includes(r))) return false;
    }
    return true;
  });

  // Findings (maturity questions) and obligations (scope questions)
  const rawFindings: any[] = [];
  const rawObligations: any[] = [];
  activeQuestions.forEach((q: any) => {
    if (q.scoring === 'none') return;
    const list = questionFindings(q, answers[q.id]).filter(f => f.severity !== 'positive' && regInScope(f.reg));
    if (q.scoring === 'obligation') list.forEach(f => rawObligations.push({ ...f, baseSeverity: f.severity, severity: 'info' }));
    else rawFindings.push(...list);
  });
  const findings: PostureIqFinding[] = dedupe(rawFindings.sort(bySeverity));
  const obligations = dedupe(rawObligations.sort((a, b) => bySeverity({ ...a, severity: a.baseSeverity }, { ...b, severity: b.baseSeverity })));

  // Pillar scores: only scored questions; a pillar with no answers is left out and the weights renormalised.
  const scoredQuestions = activeQuestions.filter(isScoredQuestion);
  const scoreOf = new Map<string, number | null>(scoredQuestions.map((q: any) => [q.id, evaluateQuestionScore(q, answers[q.id])]));
  const coverage = { answered: [...scoreOf.values()].filter(s => s !== null).length, total: scoredQuestions.length };
  const lowConfidence = coverage.total === 0 || coverage.answered / coverage.total < LOW_CONFIDENCE_THRESHOLD;

  const pillarConfigs = KB.pillarConfig || [];
  const pillars = pillarConfigs.map((p: any) => {
    const qList = scoredQuestions.filter((q: any) => p.sections.includes(q.section));
    const scores = qList.map((q: any) => scoreOf.get(q.id)).filter((s: any): s is number => s !== null && s !== undefined);
    const score = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
    let status = 'Not assessed', color = '#5B5B5B', bg = '#F2F2F2';
    if (score === null) { /* not assessed */ }
    else if (score >= 85) { status = 'Defensible'; color = '#1B5B34'; bg = '#EDF7F1'; }
    else if (score >= 65) { status = 'Managed'; color = '#226882'; bg = '#EDF5F8'; }
    else if (score >= 40) { status = 'Exposed'; color = '#E39A2E'; bg = '#FFF9E6'; }
    else { status = 'Critical Risk'; color = '#B93829'; bg = '#FFEBEE'; }
    return {
      id: p.id, num: p.num, name: p.name, desc: p.desc, weight: p.weight,
      score, included: score !== null, status, color, bg,
      qCount: qList.length, answeredCount: scores.length
    };
  });

  let weightedSum = 0;
  let weightSum = 0;
  pillars.forEach((p: any) => {
    if (p.score === null) return;
    weightedSum += p.score * p.weight;
    weightSum += p.weight;
  });
  const overallScore = weightSum > 0 ? Math.round(weightedSum / weightSum) : 0;
  const label = weightSum > 0 ? postureLabel(overallScore) : NOT_ASSESSED_LABEL;

  // Statutory ceilings
  const tUSD = turnover;
  const tEUR = tUSD / EUR_TO_USD;
  const tGBP = tUSD / GBP_TO_USD;
  const fines: any[] = [];
  let maxSinglePenalty = 0;
  const worstSeverity = (regs: string[]): string | null => {
    const f = findings.find(x => regs.includes(x.reg)); // findings are sorted worst-first
    return f ? f.severity : null;
  };
  const pushFine = (fine: any) => {
    fines.push(fine);
    if (typeof fine.capUSD === 'number') maxSinglePenalty = Math.max(maxSinglePenalty, fine.capUSD);
  };

  const hasGdpr = inScopeRegs.includes('gdpr');
  if (hasGdpr || inScopeRegs.includes('ukgdpr')) {
    const sev = worstSeverity(['gdpr', 'ukgdpr']);
    const [status, statusColor] =
      sev === 'critical' ? ['Critical Breach Exposure', '#B93829']
        : sev === 'high' ? ['High Regulatory Exposure', '#E54536']
          : sev === 'medium' ? ['Regulatory Exposure', '#E39A2E']
            : ['Defensible / Managed', '#1B5B34'];
    if (hasGdpr) {
      const capUSD = Math.round(Math.max(20000000, tEUR * 0.04) * EUR_TO_USD);
      pushFine({
        regId: 'gdpr',
        regName: 'GDPR (Art. 83(5) Statutory Cap)',
        statuteBasis: 'Up to €20M or 4% of worldwide annual turnover, whichever is higher, for breaches of the processing principles, data-subject rights and Chapter V international transfers (Art. 83(5)). Controller and processor obligations such as Art. 28 processor duties fall under the lower tier of €10M or 2% (Art. 83(4)(a)).',
        capUSD, capFormatted: formatCurrency(capUSD), status, statusColor
      });
    } else {
      const capUSD = Math.round(Math.max(17500000, tGBP * 0.04) * GBP_TO_USD);
      pushFine({
        regId: 'ukgdpr',
        regName: 'UK GDPR (Art. 83 / DPA 2018 s.157 Statutory Cap)',
        statuteBasis: 'Up to £17.5M or 4% of worldwide annual turnover, whichever is higher, for breaches of the processing principles, data-subject rights and international transfers. Controller and processor obligations fall under the lower tier of £8.7M or 2%.',
        capUSD, capFormatted: formatCurrency(capUSD), status, statusColor
      });
    }
  }

  if (inScopeRegs.includes('nis2')) {
    const cls = answers['A1'];
    const hasGap = findings.some((f: any) => f.reg === 'nis2');
    if (cls === 'essential' || cls === 'important') {
      const isEssential = cls === 'essential';
      const capEUR = Math.max(isEssential ? 10000000 : 7000000, tEUR * (isEssential ? 0.02 : 0.014));
      const capUSD = Math.round(capEUR * EUR_TO_USD);
      pushFine({
        regId: 'nis2',
        regName: isEssential ? 'NIS2 Directive (Essential Entity · Art. 34)' : 'NIS2 Directive (Important Entity · Art. 34)',
        statuteBasis: isEssential
          ? 'Up to €10M or 2% worldwide annual turnover + direct management liability and operational bans.'
          : 'Up to €7M or 1.4% worldwide annual turnover (ex-post supervisory enforcement).',
        capUSD,
        capFormatted: formatCurrency(capUSD),
        status: hasGap ? 'Direct Enforcement Risk' : 'Baseline Met',
        statusColor: hasGap ? '#B93829' : '#1B5B34'
      });
    } else {
      pushFine({
        regId: 'nis2',
        regName: 'NIS2 Directive (Art. 34 · Classification Pending)',
        statuteBasis: cls === 'na'
          ? 'Self-assessed as outside NIS2 scope (question A1). No ceiling is applied until that determination is confirmed against the national transposition.'
          : 'The entity is not yet classified as essential (€10M / 2%) or important (€7M / 1.4%). No ceiling is applied until classification is confirmed.',
        capUSD: null,
        capFormatted: 'Pending classification',
        status: 'Classification pending',
        statusColor: '#5B5B5B'
      });
    }
  }

  if (inScopeRegs.includes('aiact')) {
    if (answers['G1'] === 'none') {
      pushFine({
        regId: 'aiact',
        regName: 'EU AI Act (Art. 99 Statutory Ceiling)',
        statuteBasis: 'No AI/ML systems on personal or sensitive data were reported (question G1), so no AI Act ceiling is applied.',
        capUSD: null,
        capFormatted: 'Not applicable',
        status: 'No AI systems in scope',
        statusColor: '#5B5B5B'
      });
    } else {
      // EU AI Act Art. 99(4): EUR 15M or 3% (whichever is higher) for high-risk / Art. 10 data-governance breaches.
      // The EUR 35M / 7% tier (Art. 99(3)) applies only to prohibited practices, which this diagnostic does not assess.
      const capUSD = Math.round(Math.max(15000000, tEUR * 0.03) * EUR_TO_USD);
      const hasGap = findings.some((f: any) => f.reg === 'aiact');
      pushFine({
        regId: 'aiact',
        regName: 'EU AI Act (Art. 99 Statutory Ceiling)',
        statuteBasis: 'Up to €15M or 3% of worldwide turnover, whichever is higher, for high-risk system and Art. 10 data-governance obligations (Art. 99(4)).',
        capUSD,
        capFormatted: formatCurrency(capUSD),
        status: hasGap ? 'Severe Non-Compliance' : 'Governance Aligned',
        statusColor: hasGap ? '#B93829' : '#1B5B34'
      });
    }
  }

  if (inScopeRegs.includes('dora')) {
    const hasGap = findings.some((f: any) => f.reg === 'dora');
    if (answers['A2'] === 'ict-ctpp') {
      // Critical ICT third-party providers: Art. 35(6)-(8) periodic penalty payments of up to 1% of average daily
      // worldwide turnover, imposed daily for up to six months.
      const capUSD = Math.round((tUSD / 365) * 0.01 * 180);
      pushFine({
        regId: 'dora',
        regName: 'DORA (Art. 35 Periodic Penalty Payments · Critical ICT Third-Party Provider)',
        statuteBasis: 'Up to 1% of average daily worldwide turnover per day, for up to six months, imposed by the Lead Overseer (Art. 35(6)–(8)).',
        capUSD,
        capFormatted: formatCurrency(capUSD),
        status: hasGap ? 'Oversight Sanction Exposure' : 'Oversight Ready',
        statusColor: hasGap ? '#B93829' : '#1B5B34'
      });
    } else if (notDoraEntity) {
      pushFine({
        regId: 'dora',
        regName: 'DORA (Art. 2 Scope)',
        statuteBasis: 'Self-declared as not a DORA financial entity or critical ICT third-party provider (question A2). Confirm against Art. 2.',
        capUSD: null,
        capFormatted: 'Not applicable',
        status: 'Not a DORA entity (self-declared)',
        statusColor: '#5B5B5B'
      });
    } else {
      // Financial entities face penalties set under national law (Art. 50-51), with no EU-wide turnover cap.
      pushFine({
        regId: 'dora',
        regName: 'DORA (Art. 50–51 National Administrative Penalties)',
        statuteBasis: 'Penalties for financial entities are set by each member state; DORA sets no EU-wide turnover cap. Art. 35 periodic penalties apply only to critical ICT third-party providers.',
        capUSD: null,
        capFormatted: 'Set under national law',
        status: hasGap ? 'Supervisory Sanction Exposure' : 'Compliant Architecture',
        statusColor: hasGap ? '#B93829' : '#1B5B34'
      });
    }
  }

  if (!fines.length) {
    const defaultCapUSD = Math.round(Math.max(20000000, tEUR * 0.04) * EUR_TO_USD);
    pushFine({
      regId: 'gdpr',
      regName: 'Statutory Compliance Baseline (GDPR Art. 83)',
      statuteBasis: 'Up to €20M or 4% global turnover baseline.',
      capUSD: defaultCapUSD,
      capFormatted: formatCurrency(defaultCapUSD),
      status: 'In Scope',
      statusColor: '#E39A2E'
    });
  }

  const advisoryFeeEstimate = 185000;
  // Only meaningful against a quantified statutory cap.
  const riskHedgeRatio = maxSinglePenalty > 0 ? ((advisoryFeeEstimate / maxSinglePenalty) * 100).toFixed(2) : 'n/a';

  // Counts of findings (obligations are not counted)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f: any) => {
    if (f.severity in counts) (counts as any)[f.severity]++;
  });

  // RAG rollup for each in-scope regulation
  const rag: Record<string, { rag: string; status: string; count: number }> = {};
  inScopeRegs.forEach((regId: string) => {
    const rf = findings.filter((f: any) => f.reg === regId);
    const answered = activeQuestions.some((q: any) => {
      const refs = (q.refs || []).some((r: any) => r.reg === regId) ||
        (q.appliesTo && (q.appliesTo.regulations || []).includes(regId));
      return refs && answers[q.id] !== undefined;
    });
    if (rf.some((f: any) => f.severity === 'critical' || f.severity === 'high')) {
      rag[regId] = { rag: 'red', status: 'Non-compliant', count: rf.length };
    } else if (rf.some((f: any) => f.severity === 'medium')) {
      rag[regId] = { rag: 'amber', status: 'Partial — action required', count: rf.length };
    } else if (answered) {
      rag[regId] = { rag: 'green', status: 'No material gaps found', count: rf.length };
    } else {
      rag[regId] = { rag: 'grey', status: 'Not assessed', count: 0 };
    }
  });

  // Dynamic probes
  const triggeredProbes = (KB.dynamicProbes || []).filter((p: any) =>
    PROBE_CONDITIONS[p.id] ? probeConditionsMet(PROBE_CONDITIONS[p.id], answers, inScopeRegs) : false);

  // Business impact band
  const cats = answers['B1'];
  const catSet = new Set(Array.isArray(cats) ? cats : []);
  let impactBand = 1;
  if (catSet.has('special') || catSet.has('financial') || catSet.has('government')) {
    impactBand = 3;
  } else if (catSet.has('pii') || catSet.has('behavioural') || catSet.has('aitraining')) {
    impactBand = 2;
  }

  return {
    overallScore,
    label,
    coverage,
    lowConfidence,
    pillarScores: {
      pillars,
      overallScore,
      label
    },
    penalties: {
      turnover: tUSD,
      turnoverAssumed,
      fines,
      totalValueAtStake: maxSinglePenalty,
      advisoryFeeEstimate,
      riskHedgeRatio
    },
    findings,
    obligations,
    counts,
    rag,
    triggeredProbes,
    businessImpactBand: impactBand,
    timestamp: new Date().toISOString()
  };
}
