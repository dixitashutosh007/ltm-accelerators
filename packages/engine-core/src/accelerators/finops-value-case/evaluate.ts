import defaultKb from './knowledge-base.json' with { type: 'json' };

export interface AssessmentAnswers {
  [questionId: string]: any;
}

export interface AssessmentOrg {
  name?: string;
  sector?: string;
  sector_class?: 'bfsi' | 'general' | string;
  currency?: string;
  details?: string;
}

export interface EvaluationResult {
  signals: Record<string, number | null>;
  gapIndex: number | null;
  urgencyIndex: number;
  needIndex: number | null;
  annualSpend: number | null;
  growthRate: number;
  wasteBand: {
    low: number;
    high: number;
    label: string;
    anchor: string;
    uplift: number;
    cap: number;
    isBfsi: boolean;
  };
  exposure: {
    band: any;
    y1: [number, number] | null;
    y3: [number, number] | null;
  };
  verdict: any | null;
  confidence: {
    label: string;
    color: string;
    note: string;
  };
  blindSpots: Array<{ questionId: string; text: string }>;
  recommendedServices: any[];
  relevantCaseStudies: any[];
  streams: any[];
  timestamp: string;
}

export function qScore(q: any, a: any): number | null {
  if (a === undefined || a === null) return null;
  if (a === '__DK__') return 0;

  switch (q.answer_type) {
    case 'single_select': {
      const o = q.options && q.options[a];
      return o && typeof o.score === 'number' ? o.score : null;
    }
    case 'multi_select': {
      if (!Array.isArray(a) || !a.length) return null;
      if (!q.options || !q.options.some((o: any) => typeof o.score === 'number')) return null;
      let t = 0;
      a.forEach((i: number) => {
        const o = q.options[i];
        if (o && typeof o.score === 'number') t += o.score;
      });
      return Math.max(0, Math.min(100, t));
    }
    case 'boolean_dk':
      return a === 'yes' ? q.scores.yes : a === 'no' ? q.scores.no : q.scores.dk;
    case 'rating_1_5':
      return ((a - 1) / 4) * 100;
    case 'slider_percent': {
      const sl = q.slider;
      let p = ((a - sl.min) / (sl.max - sl.min)) * 100;
      if (q.invert) p = 100 - p;
      return Math.max(0, Math.min(100, p));
    }
    case 'allocation_100': {
      const vals: number[] = Object.values(a || {});
      const total = vals.reduce((x, y) => x + y, 0);
      if (total !== 100) return null;
      const nb = (a && a.nobody) || 0;
      let sc = 100 - nb * 1.6;
      const mx = Math.max(...vals, 0);
      if (mx > 70) sc -= (mx - 70) * 0.6;
      return Math.max(0, Math.min(100, Math.round(sc)));
    }
    default:
      return null;
  }
}

export function getCurrencySymbol(currencyId: string = 'gbp', currencies: any[] = defaultKb.meta.currencies): string {
  const c = currencies.find((cur: any) => cur.id === currencyId);
  return c ? c.symbol : '£';
}

export function formatMoney(n: number | null, symbol: string = '£'): string {
  if (n == null || !isFinite(n)) return '—';
  if (n >= 1e9) return symbol + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
  if (n >= 1e6) return symbol + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1e3) return symbol + Math.round(n / 1e3) + 'k';
  return symbol + Math.round(n);
}

export function evaluateFinOpsValueCase(
  answers: AssessmentAnswers,
  org: AssessmentOrg = {},
  kb: any = defaultKb
): EvaluationResult {
  const currencySymbol = getCurrencySymbol(org.currency, kb.meta.currencies);

  // 1. Signal Scores
  const acc: Record<string, { t: number; w: number }> = {};
  kb.meta.signals.forEach((s: any) => {
    acc[s.id] = { t: 0, w: 0 };
  });

  kb.questions.forEach((q: any) => {
    if (!q.signals || !q.signals.length) return;
    const sc = qScore(q, answers[q.id]);
    if (sc === null) return;
    q.signals.forEach((sg: any) => {
      if (!acc[sg.id]) return;
      acc[sg.id].t += sc * sg.w;
      acc[sg.id].w += sg.w;
    });
  });

  const signals: Record<string, number | null> = {};
  kb.meta.signals.forEach((s: any) => {
    signals[s.id] = acc[s.id].w ? Math.round(acc[s.id].t / acc[s.id].w) : null;
  });

  // 2. Spend & Growth
  const rawSpend = answers['E3'];
  const spend = rawSpend === undefined || rawSpend === '__DK__' ? null : rawSpend;
  const growth = answers['E5'] === undefined ? 25 : answers['E5'];

  // 3. Urgency Index
  let urgency = 0;
  if (growth > 30) urgency += Math.min(28, (growth - 30) * 0.22);
  const mig = answers['E6'];
  if (typeof mig === 'number') urgency += mig * 0.22;
  const je = answers['E4'];
  if (typeof je === 'number') {
    const qE4 = kb.questions.find((q: any) => q.id === 'E4');
    const o = qE4 && qE4.options ? qE4.options[je] : null;
    urgency += (o?.migration_ahead || 0) * 18;
  }
  const p2 = answers['P2'];
  if (typeof p2 === 'number') {
    const qP2 = kb.questions.find((q: any) => q.id === 'P2');
    const o = qP2 && qP2.options ? qP2.options[p2] : null;
    urgency += o?.urgency || 0;
  }
  const pv = answers['P1'];
  if (typeof pv === 'number') urgency += Math.min(14, pv * 0.28);
  const plats = answers['E2'];
  if (Array.isArray(plats)) {
    const qE2 = kb.questions.find((x: any) => x.id === 'E2');
    const h = plats.filter((i: number) => qE2?.options[i]?.hyper).length;
    if (h >= 2) urgency += 8;
  }
  const urgencyIndex = Math.max(0, Math.min(100, Math.round(urgency)));

  // 4. Gap Index
  let totalGap = 0;
  let totalWeight = 0;
  kb.meta.signals.forEach((s: any) => {
    if (signals[s.id] === null) return;
    totalGap += (100 - (signals[s.id] as number)) * s.weight;
    totalWeight += s.weight;
  });
  const gapIndex = totalWeight ? Math.round(totalGap / totalWeight) : null;

  // 5. Need Index
  const needIndex = gapIndex === null ? null : Math.round(0.6 * gapIndex + 0.4 * urgencyIndex);

  // 6. Waste Band & Exposure
  const v = signals.visibility;
  const c = signals.control;
  const parts = [v, c].filter(x => x !== null) as number[];
  const cap = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  const band =
    kb.meta.waste_model.bands.find((b: any) => cap <= b.max_capability) ||
    kb.meta.waste_model.bands[kb.meta.waste_model.bands.length - 1];
  const mods = kb.meta.benchmarks.bfsi_modifiers;
  const isBfsi = org.sector_class === 'bfsi' || org.sector?.toLowerCase().includes('banking') || org.sector?.toLowerCase().includes('financial');
  const full = mods.factors.reduce((a: number, f: any) => a + f.pts, 0);
  const uplift = isBfsi ? full * (1 - cap / 100) : 0;

  const wasteBandResult = {
    low: band.low,
    high: Math.min(mods.cap, band.high + uplift),
    label: band.label,
    anchor: band.anchor,
    uplift,
    cap: Math.round(cap),
    isBfsi
  };

  let exposureResult: { band: any; y1: [number, number] | null; y3: [number, number] | null } = {
    band: wasteBandResult,
    y1: null,
    y3: null
  };

  if (spend !== null) {
    const gRate = Math.max(0, growth) / 100;
    const y1: [number, number] = [spend * wasteBandResult.low, spend * wasteBandResult.high];
    let cl = 0;
    let ch = 0;
    let s = spend;
    for (let i = 0; i < 3; i++) {
      cl += s * wasteBandResult.low;
      ch += s * wasteBandResult.high;
      s *= 1 + gRate;
    }
    exposureResult = {
      band: wasteBandResult,
      y1,
      y3: [cl, ch]
    };
  }

  // 7. Verdict
  const verdict =
    needIndex === null
      ? null
      : kb.meta.verdict_bands.find((vb: any) => needIndex >= vb.min && needIndex <= vb.max) ||
        kb.meta.verdict_bands[kb.meta.verdict_bands.length - 1];

  // 8. Blind Spots
  const blindSpotsList: Array<{ questionId: string; text: string }> = [];
  kb.questions.forEach((q: any) => {
    if (answers[q.id] === '__DK__' && q.dk_blind) {
      blindSpotsList.push({ questionId: q.id, text: q.dk_blind });
    }
  });
  const alloc = answers['O2'];
  if (alloc && alloc.nobody > 20) {
    blindSpotsList.push({
      questionId: 'O2',
      text: `A meaningful share of cloud cost responsibility is unassigned by the organisation's own account (${alloc.nobody} of 100 points).`
    });
  }

  // 9. Confidence
  const bsCount = blindSpotsList.length;
  const answeredCount = Object.keys(answers).length;
  let confidenceResult: { label: string; color: string; note: string };
  if (bsCount >= 6 || answeredCount < 12) {
    confidenceResult = {
      label: 'Low confidence',
      color: '#FF5E4F',
      note: 'A high number of unknowns means these figures are directional only. A billing-data baseline is required before they can be relied upon.'
    };
  } else if (bsCount >= 3) {
    confidenceResult = {
      label: 'Moderate confidence',
      color: '#B26A00',
      note: 'Some inputs were unknown. Figures indicate scale rather than a validated position.'
    };
  } else {
    confidenceResult = {
      label: 'Reasonable confidence',
      color: '#35754D',
      note: 'Inputs were largely complete. Figures still require validation against actual billing data before use in a business case.'
    };
  }

  // 10. Recommended Services
  let recommended = kb.meta.service_areas.filter((sa: any) =>
    sa.triggers.some((t: any) => {
      const val = signals[t.signal];
      return val !== null && val < t.below;
    })
  );
  const concernOrder = answers['C4'];
  if (Array.isArray(concernOrder)) {
    const qC4 = kb.questions.find((x: any) => x.id === 'C4');
    const map = qC4?.concern_map || {};
    const rank: Record<string, number> = {};
    concernOrder.forEach((label: string, i: number) => {
      const id = map[label];
      if (id) rank[id] = i;
    });
    recommended.sort((a: any, b: any) => (rank[a.id] !== undefined ? rank[a.id] : 99) - (rank[b.id] !== undefined ? rank[b.id] : 99));
  }

  // 11. Relevant Case Studies
  const weakest = Object.keys(signals)
    .filter(k => signals[k] !== null)
    .sort((a, b) => (signals[a] as number) - (signals[b] as number))
    .slice(0, 3);
  const scoredCaseStudies = kb.meta.case_studies.map((cs: any) => ({
    cs,
    hits: cs.relevance.filter((r: string) => weakest.includes(r)).length
  }));
  scoredCaseStudies.sort((a: any, b: any) => b.hits - a.hits);
  const relevantCaseStudies = scoredCaseStudies.map((x: any) => x.cs);

  // 12. FinOps Optimization Streams (Roadmap)
  const sigV = signals.visibility || 50;
  const sigP = signals.predictability || 50;
  const sigO = signals.ownership || 50;
  const sigC = signals.control || 50;
  const sigVal = signals.value || 50;

  const commitCov = typeof answers['C2'] === 'number' ? answers['C2'] : 20;
  const decommission = answers['C3'] !== undefined ? (answers['C3'] === '__DK__' ? 0 : [100, 80, 55, 20, 0][answers['C3']] || 30) : 30;
  const netGovernance = answers['C5'] !== undefined ? (answers['C5'] === '__DK__' ? 0 : [100, 65, 30, 0][answers['C5']] || 25) : 30;
  const costAttr = answers['V1'] !== undefined ? (answers['V1'] === '__DK__' ? 0 : [100, 70, 35, 0][answers['V1']] || 30) : 30;
  const variance = typeof answers['P1'] === 'number' ? answers['P1'] : 15;

  const rateScore = Math.round(0.6 * commitCov + 0.4 * sigC);
  const hygieneScore = Math.round(0.5 * decommission + 0.5 * sigC);
  const archScore = Math.round(0.5 * netGovernance + 0.3 * sigC + 0.2 * sigV);
  const attrScore = Math.round(0.5 * costAttr + 0.3 * sigV + 0.2 * sigO);
  const govScore = Math.round(Math.max(0, 100 - variance * 2.2) * 0.4 + 0.3 * sigP + 0.3 * sigVal);

  const rawStreams = [
    {
      id: 'rate',
      name: 'Rate & Commercial Optimization',
      icon: '⚡',
      score: rateScore,
      weight: 0.32,
      timeline: '30–60 Days',
      timeCategory: 'near_term',
      benchmarkShare: '25–35% of recoverable waste',
      objective: 'Eliminate on-demand pricing on predictable, steady-state baseline compute and databases.',
      quickWins: [
        'Purchase baseline 1-year Compute Savings Plans or CUDs for non-volatile compute footprints',
        'Audit existing cloud enterprise discount commitments against projected migration velocity',
        'Review and enforce Bring-Your-Own-License (BYOL) and Azure Hybrid Benefit mobility'
      ],
      deliverables: [
        'Commitment portfolio coverage strategy (RIs / Savings Plans / Committed Use)',
        'Provider contract & commercial tier review',
        'Commitment utilization and expiration monitoring cadence'
      ]
    },
    {
      id: 'hygiene',
      name: 'Workload & Resource Hygiene',
      icon: '🧹',
      score: hygieneScore,
      weight: 0.28,
      timeline: '0–30 Days (Immediate)',
      timeCategory: 'quick_win',
      benchmarkShare: '20–30% of recoverable waste',
      objective: 'Rapidly reclaim idle, oversized, or unattached cloud infrastructure.',
      quickWins: [
        'Decommission unattached EBS volumes, unassociated elastic IPs, and orphaned disk snapshots',
        'Implement automated stop/start schedules for non-production environments (nights and weekends)',
        'Rightsize idle instances exhibiting sub-5% CPU and memory utilization over 30 days'
      ],
      deliverables: [
        'Automated non-production environment parking schedule',
        'Prioritized compute & memory rightsizing backlog with estimated monthly savings',
        'Zombie asset cleanup policy and continuous reclamation automation'
      ]
    },
    {
      id: 'architecture',
      name: 'Architecture & Network Optimization',
      icon: '🌐',
      score: archScore,
      weight: 0.18,
      timeline: '60–90 Days',
      timeCategory: 'structural',
      benchmarkShare: '15–20% of recoverable waste',
      objective: 'Mitigate silent network egress leaks, optimize storage lifecycles, and leverage auto-tiering.',
      quickWins: [
        'Audit NAT Gateway traffic and cross-AZ traffic routing loops',
        'Configure automated S3 / Cloud Storage lifecycle rules to transition aged data to archive tiers',
        'Route high-volume internal traffic across private endpoints and direct interconnects'
      ],
      deliverables: [
        'Storage lifecycle and retention policy matrix across block, file, and object stores',
        'Network data transfer & egress optimization architecture standard',
        'Autoscaling and serverless tiering design review'
      ]
    },
    {
      id: 'attribution',
      name: 'Cost Attribution & Allocation',
      icon: '🏷️',
      score: attrScore,
      weight: 0.12,
      timeline: '30–60 Days',
      timeCategory: 'near_term',
      benchmarkShare: 'Foundational Enablement',
      objective: 'Enforce complete resource tagging and establish automated showback to product owners.',
      quickWins: [
        'Deploy automated CI/CD and deployment-gate tagging guardrails',
        'Deliver automated monthly cost breakdown reports directly to engineering and BU leads',
        'Define an initial shared-cost attribution model for platform services'
      ],
      deliverables: [
        'Enterprise cloud tagging and metadata taxonomy policy',
        'Executive and engineering team showback dashboards',
        'Shared platform cost distribution framework'
      ]
    },
    {
      id: 'governance',
      name: 'Forecasting, Anomaly Control & Unit Economics',
      icon: '📊',
      score: govScore,
      weight: 0.1,
      timeline: '60–90 Days',
      timeCategory: 'structural',
      benchmarkShare: 'Risk & Growth Control',
      objective: 'Prevent bill shocks through automated anomaly detection and link spend to business value.',
      quickWins: [
        'Configure automated spend anomaly alerts routed to Slack/Teams with $ thresholds',
        'Define 1–2 initial unit economics metrics (cost per customer, transaction, or workload)',
        'Establish a monthly FinOps review meeting with Technology and Finance leadership'
      ],
      deliverables: [
        'Anomaly detection and escalation protocol with designated operational owners',
        'Unit economics dashboard and transaction margin tracking',
        'FinOps RACI operating model and governance charter'
      ]
    }
  ];

  const streams = rawStreams
    .map(st => {
      const gap = 100 - st.score;
      let priority = 'Foundational';
      let priorityClass = 'p-found';
      let priorityOrder = 3;
      if (st.score < 45 || gap >= 55) {
        priority = 'Critical (P1)';
        priorityClass = 'p-crit';
        priorityOrder = 1;
      } else if (st.score < 68 || gap >= 32) {
        priority = 'High (P2)';
        priorityClass = 'p-high';
        priorityOrder = 2;
      }

      let savingsShareLow: number | null = null;
      let savingsShareHigh: number | null = null;
      if (spend !== null) {
        const lowTotal = spend * wasteBandResult.low;
        const highTotal = spend * wasteBandResult.high;
        savingsShareLow = Math.round(lowTotal * st.weight);
        savingsShareHigh = Math.round(highTotal * st.weight);
      }

      return {
        ...st,
        gap,
        priority,
        priorityClass,
        priorityOrder,
        savingsRange:
          savingsShareLow !== null
            ? `${formatMoney(savingsShareLow, currencySymbol)} – ${formatMoney(savingsShareHigh, currencySymbol)}`
            : '—'
      };
    })
    .sort((a, b) => a.priorityOrder - b.priorityOrder || a.score - b.score);

  return {
    signals,
    gapIndex,
    urgencyIndex,
    needIndex,
    annualSpend: spend,
    growthRate: growth,
    wasteBand: wasteBandResult,
    exposure: exposureResult,
    verdict,
    confidence: confidenceResult,
    blindSpots: blindSpotsList,
    recommendedServices: recommended,
    relevantCaseStudies,
    streams,
    timestamp: new Date().toISOString()
  };
}
