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

export interface PostureIqEvaluation {
  overallScore: number;
  label: { t: string; c: string; grade: string };
  pillarScores: {
    pillars: Array<{
      id: string;
      num: string;
      name: string;
      desc: string;
      weight: number;
      score: number;
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
    fines: Array<{
      regId: string;
      regName: string;
      statuteBasis: string;
      capUSD: number | null; // null when the statute sets no quantified cap (e.g. DORA for financial entities)
      capFormatted: string;
      status: string;
      statusColor: string;
    }>;
    totalValueAtStake: number;
    advisoryFeeEstimate: number;
    riskHedgeRatio: string;
  };
  findings: Array<{
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
  }>;
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

export function evaluateQuestionScore(q: any, ans: any): number | null {
  if (ans === undefined || ans === null) return null;
  if (q.type === 'single' || q.type === 'boolean') {
    const opt = (q.options || []).find((o: any) => o.value === ans);
    if (!opt) return null;
    if (opt.sev === 'positive') return 100;
    if (opt.sev === 'low') return 75;
    if (opt.sev === 'medium') return 50;
    if (opt.sev === 'high') return 25;
    if (opt.sev === 'critical') return 0;
    return 60;
  }
  if (q.type === 'scale') {
    const sOpt = (q.scale || []).find((s: any) => s.v === ans);
    if (!sOpt) return null;
    if (sOpt.sev === 'positive') return 100;
    if (sOpt.sev === 'low') return 75;
    if (sOpt.sev === 'medium') return 50;
    if (sOpt.sev === 'high') return 25;
    if (sOpt.sev === 'critical') return 0;
    return 60;
  }
  if (q.type === 'multi') {
    const arr = Array.isArray(ans) ? ans : [];
    if (!arr.length) return 80;
    let tFindings: any[] = [];
    (q.options || []).forEach((o: any) => {
      if (arr.includes(o.value) && o.findings) {
        tFindings = tFindings.concat(o.findings);
      }
    });
    if (tFindings.some((f: any) => f.severity === 'critical')) return 15;
    if (tFindings.some((f: any) => f.severity === 'high')) return 35;
    if (tFindings.some((f: any) => f.severity === 'medium')) return 60;
    if (tFindings.some((f: any) => f.severity === 'low')) return 80;
    return 95;
  }
  if (q.type === 'matrix') {
    if (typeof ans !== 'object' || !ans) return null;
    const entries = Object.entries(ans);
    if (!entries.length) return null;
    let worst = 100;
    entries.forEach((pair: [string, any]) => {
      const k = pair[0] + ':' + pair[1];
      const f = q.cellFindings ? q.cellFindings[k] : null;
      if (f) {
        if (f.severity === 'critical') worst = Math.min(worst, 10);
        else if (f.severity === 'high') worst = Math.min(worst, 30);
        else if (f.severity === 'medium') worst = Math.min(worst, 55);
        else if (f.severity === 'low') worst = Math.min(worst, 75);
      }
    });
    return worst;
  }
  return 70;
}

export function evaluatePostureIq(
  input: PostureIqInput,
  customKb?: any
): PostureIqEvaluation {
  const KB = customKb || defaultKb;
  const answers = input.answers || {};
  const org = input.org || {};
  const turnover = org.turnover || 250000000;
  const inScopeRegs = (input.regulations && input.regulations.length > 0)
    ? input.regulations
    : ['dora', 'gdpr', 'nis2', 'aiact'];
  const mode = input.mode || 'workshop';

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

  // Collect findings for active questions
  const allFindings: any[] = [];
  activeQuestions.forEach((q: any) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === null) return;

    if (q.type === 'single' || q.type === 'boolean') {
      const opt = (q.options || []).find((o: any) => o.value === ans);
      if (opt && opt.findings) {
        opt.findings.forEach((f: any) => allFindings.push(Object.assign({ qid: q.id }, f)));
      }
    } else if (q.type === 'scale') {
      const s = (q.scale || []).find((x: any) => x.v === ans);
      if (s && s.findings) {
        s.findings.forEach((f: any) => allFindings.push(Object.assign({ qid: q.id }, f)));
      }
    } else if (q.type === 'multi') {
      const arr = Array.isArray(ans) ? ans : [];
      arr.forEach((val: any) => {
        const opt = (q.options || []).find((o: any) => o.value === val);
        if (opt && opt.findings) {
          opt.findings.forEach((f: any) => allFindings.push(Object.assign({ qid: q.id }, f)));
        }
      });
    } else if (q.type === 'matrix') {
      const cur = ans || {};
      Object.entries(cur).forEach(([row, col]) => {
        const key = `${row}:${col}`;
        if (q.cellFindings && q.cellFindings[key]) {
          const f = q.cellFindings[key];
          allFindings.push(Object.assign({ qid: q.id, row, col }, f));
        }
      });
    }
  });

  const findings = allFindings.filter((f: any) => f.severity !== 'positive');
  findings.sort((a: any, b: any) => ((SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0)) || (a.phase - b.phase));

  // Compute Pillar Scores
  const pillarConfigs = KB.pillarConfig || [];
  const pillars = pillarConfigs.map((p: any) => {
    const qList = activeQuestions.filter((q: any) => p.sections.includes(q.section));
    let total = 0;
    let scored = 0;
    qList.forEach((q: any) => {
      const s = evaluateQuestionScore(q, answers[q.id]);
      if (s !== null) {
        total += s;
        scored++;
      }
    });
    const score = scored > 0 ? Math.round(total / scored) : 55;
    let status = 'Managed';
    let color = '#226882';
    let bg = '#EDF5F8';
    if (score >= 85) { status = 'Defensible'; color = '#1B5B34'; bg = '#EDF7F1'; }
    else if (score >= 65) { status = 'Managed'; color = '#226882'; bg = '#EDF5F8'; }
    else if (score >= 40) { status = 'Exposed'; color = '#E39A2E'; bg = '#FFF9E6'; }
    else { status = 'Critical Risk'; color = '#B93829'; bg = '#FFEBEE'; }

    return {
      id: p.id,
      num: p.num,
      name: p.name,
      desc: p.desc,
      weight: p.weight,
      score: score,
      status: status,
      color: color,
      bg: bg,
      qCount: qList.length,
      answeredCount: scored
    };
  });

  let weightedSum = 0;
  let weightSum = 0;
  pillars.forEach((p: any) => {
    weightedSum += p.score * p.weight;
    weightSum += p.weight;
  });
  const overallScore = Math.round(weightedSum / (weightSum || 1));
  const label = postureLabel(overallScore);

  // Compute statutory penalties
  const EUR_TO_USD = 1.08;
  const tUSD = turnover;
  const tEUR = tUSD / EUR_TO_USD;
  const fines: any[] = [];
  let maxSinglePenalty = 0;

  if (inScopeRegs.includes('gdpr') || inScopeRegs.includes('ukgdpr')) {
    const capEUR = Math.max(20000000, tEUR * 0.04);
    const capUSD = Math.round(capEUR * EUR_TO_USD);
    const hasGap = findings.some((f: any) => f.reg === 'gdpr' || f.reg === 'ukgdpr');
    const isCrit = findings.some((f: any) => (f.reg === 'gdpr' || f.reg === 'ukgdpr') && f.severity === 'critical');
    fines.push({
      regId: 'gdpr',
      regName: 'GDPR / UK GDPR (Art. 83 Statutory Cap)',
      statuteBasis: 'Up to €20M / £17.5M or 4% worldwide annual turnover, whichever is higher (Chapter V transfers & processor duties).',
      capUSD: capUSD,
      capFormatted: formatCurrency(capUSD),
      status: hasGap ? (isCrit ? 'Critical Breach Exposure' : 'High Regulatory Exposure') : 'Defensible / Managed',
      statusColor: hasGap ? (isCrit ? '#B93829' : '#E39A2E') : '#1B5B34'
    });
    maxSinglePenalty = Math.max(maxSinglePenalty, capUSD);
  }

  if (inScopeRegs.includes('nis2')) {
    const isEssential = answers['A1'] === 'essential';
    const rate = isEssential ? 0.02 : 0.014;
    const baseEUR = isEssential ? 10000000 : 7000000;
    const capEUR = Math.max(baseEUR, tEUR * rate);
    const capUSD = Math.round(capEUR * EUR_TO_USD);
    const hasGap = findings.some((f: any) => f.reg === 'nis2');
    fines.push({
      regId: 'nis2',
      regName: isEssential ? 'NIS2 Directive (Essential Entity · Art. 34)' : 'NIS2 Directive (Important Entity · Art. 34)',
      statuteBasis: isEssential 
        ? 'Up to €10M or 2% worldwide annual turnover + direct management liability and operational bans.' 
        : 'Up to €7M or 1.4% worldwide annual turnover (ex-post supervisory enforcement).',
      capUSD: capUSD,
      capFormatted: formatCurrency(capUSD),
      status: hasGap ? 'Direct Enforcement Risk' : 'Baseline Met',
      statusColor: hasGap ? '#B93829' : '#1B5B34'
    });
    maxSinglePenalty = Math.max(maxSinglePenalty, capUSD);
  }

  if (inScopeRegs.includes('aiact') || inScopeRegs.includes('ukai')) {
    // EU AI Act Art. 99(4): EUR 15M or 3% (whichever is higher) for high-risk / Art. 10 data-governance breaches.
    // The EUR 35M / 7% tier (Art. 99(3)) applies only to prohibited practices, which this diagnostic does not assess.
    const capEUR = Math.max(15000000, tEUR * 0.03);
    const capUSD = Math.round(capEUR * EUR_TO_USD);
    const hasGap = findings.some((f: any) => f.reg === 'aiact');
    fines.push({
      regId: 'aiact',
      regName: 'EU AI Act (Art. 99 Statutory Ceiling)',
      statuteBasis: 'Up to €15M or 3% of worldwide turnover, whichever is higher, for high-risk system and Art. 10 data-governance obligations (Art. 99(4)).',
      capUSD: capUSD,
      capFormatted: formatCurrency(capUSD),
      status: hasGap ? 'Severe Non-Compliance' : 'Governance Aligned',
      statusColor: hasGap ? '#B93829' : '#1B5B34'
    });
    maxSinglePenalty = Math.max(maxSinglePenalty, capUSD);
  }

  if (inScopeRegs.includes('dora')) {
    const hasGap = findings.some((f: any) => f.reg === 'dora');
    if (answers['A2'] === 'ict-ctpp') {
      // Critical ICT third-party providers: Art. 35(6)-(8) periodic penalty payments of up to 1% of average daily
      // worldwide turnover, imposed daily for up to six months.
      const capUSD = Math.round((tUSD / 365) * 0.01 * 180);
      fines.push({
        regId: 'dora',
        regName: 'DORA (Art. 35 Periodic Penalty Payments · Critical ICT Third-Party Provider)',
        statuteBasis: 'Up to 1% of average daily worldwide turnover per day, for up to six months, imposed by the Lead Overseer (Art. 35(6)–(8)).',
        capUSD,
        capFormatted: formatCurrency(capUSD),
        status: hasGap ? 'Oversight Sanction Exposure' : 'Oversight Ready',
        statusColor: hasGap ? '#B93829' : '#1B5B34'
      });
      maxSinglePenalty = Math.max(maxSinglePenalty, capUSD);
    } else {
      // Financial entities face penalties set under national law (Art. 50-51), with no EU-wide turnover cap.
      fines.push({
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
    fines.push({
      regId: 'gdpr',
      regName: 'Statutory Compliance Baseline (GDPR Art. 83)',
      statuteBasis: 'Up to €20M or 4% global turnover baseline.',
      capUSD: defaultCapUSD,
      capFormatted: formatCurrency(defaultCapUSD),
      status: 'In Scope',
      statusColor: '#E39A2E'
    });
    maxSinglePenalty = defaultCapUSD;
  }

  const advisoryFeeEstimate = 185000;
  // Only meaningful against a quantified statutory cap.
  const riskHedgeRatio = maxSinglePenalty > 0 ? ((advisoryFeeEstimate / maxSinglePenalty) * 100).toFixed(2) : 'n/a';

  // Counts of findings
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f: any) => {
    if (f.severity in counts) {
      (counts as any)[f.severity] = ((counts as any)[f.severity] || 0) + 1;
    }
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
      rag[regId] = { rag: 'green', status: 'No material gaps found', count: 0 };
    } else {
      rag[regId] = { rag: 'grey', status: 'Not assessed', count: 0 };
    }
  });

  // Evaluate dynamic probes
  const triggeredProbes: any[] = [];
  (KB.dynamicProbes || []).forEach((p: any) => {
    let triggered = false;
    if (p.id === 'PROBE_1_RESIDENCY_ILLUSION') {
      const c1 = answers['C1'] || [];
      const h1 = answers['H1'];
      const f2 = answers['F2'];
      const usesEUCloud = Array.isArray(c1) && c1.some((x: string) => ['aws-eu', 'azure-eu', 'gcp-eu'].includes(x));
      const usParent = ['us', 'us-eubound'].includes(h1);
      const noHYOK = f2 !== 'cmk-eu';
      triggered = !!(usesEUCloud && usParent && noHYOK);
    } else if (p.id === 'PROBE_2_SAAS_BLINDSPOT') {
      const c1 = answers['C1'] || [];
      const b1 = answers['B1'] || [];
      const f2 = answers['F2'];
      const usesSaaS = Array.isArray(c1) && c1.includes('saas');
      const hasSensitive = Array.isArray(b1) && b1.some((x: string) => ['special', 'financial', 'pii'].includes(x));
      const noTenantKey = f2 !== 'cmk-eu';
      triggered = !!(usesSaaS && hasSensitive && noTenantKey);
    } else if (p.id === 'PROBE_3_DORA_EXIT') {
      const f3 = answers['F3'];
      const hasDora = inScopeRegs.includes('dora');
      triggered = !!((f3 === 'no' || f3 === 'partial') && hasDora);
    } else if (p.id === 'PROBE_4_AI_DRIFT') {
      const g1 = answers['G1'];
      const g2 = answers['G2'];
      const usesAI = ['highrisk', 'internal', 'embedded'].includes(g1);
      const mixedData = ['mixed', 'us-dpf', 'unknown'].includes(g2);
      triggered = !!(usesAI && mixedData);
    } else if (p.id === 'PROBE_5_ONPREM_BACKDOOR') {
      const c1 = answers['C1'] || [];
      const h1 = answers['H1'];
      const usesOnPrem = Array.isArray(c1) && c1.includes('onprem');
      const foreignTech = ['us', 'us-eubound', 'other'].includes(h1);
      triggered = !!(usesOnPrem && foreignTech);
    } else if (p.id === 'PROBE_6_KMS_BYOK_ILLUSION') {
      const f2 = answers['F2'];
      const h1 = answers['H1'];
      const hasCloudKms = f2 === 'byok-cloud';
      const usParent = ['us', 'us-eubound'].includes(h1);
      triggered = !!(hasCloudKms && usParent);
    }
    if (triggered) {
      triggeredProbes.push(p);
    }
  });

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
    pillarScores: {
      pillars,
      overallScore,
      label
    },
    penalties: {
      turnover: tUSD,
      fines,
      totalValueAtStake: maxSinglePenalty,
      advisoryFeeEstimate,
      riskHedgeRatio
    },
    findings,
    counts,
    rag,
    triggeredProbes,
    businessImpactBand: impactBand,
    timestamp: new Date().toISOString()
  };
}
