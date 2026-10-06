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
  /** Annual spend growth stated by the client (E5), or the default when not given as a number. */
  growthRate: number;
  /** The growth used for the 3-year projection: growthRate capped to the knowledge base's range. */
  projectionGrowthRate: number;
  wasteBand: {
    /** False when neither visibility nor control was answered: waste is then not quantified. */
    assessed: boolean;
    low: number | null;
    high: number | null;
    label: string;
    anchor: string;
    /** The BFSI uplift actually applied to the upper bound (after the cap). */
    uplift: number;
    /** The BFSI uplift before the cap. */
    upliftUncapped: number;
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

/** "We don't know": '__DK__' for any question, or 'dk' on a yes / no / don't-know question. */
export function isDontKnow(q: any, a: any): boolean {
  return a === '__DK__' || (q?.answer_type === 'boolean_dk' && a === 'dk');
}

/**
 * Scales an allocation to whole numbers that total exactly 100 (largest remainder).
 * Returns null when nothing was allocated. The page sends the same normalised values.
 */
export function normaliseAllocation(a: any): Record<string, number> | null {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const keys = Object.keys(a).filter(k => typeof a[k] === 'number' && Number.isFinite(a[k]) && a[k] >= 0);
  const total = keys.reduce((t, k) => t + a[k], 0);
  if (!keys.length || total <= 0) return null;
  const raw = keys.map(k => ({ k, v: (a[k] / total) * 100 }));
  const out: Record<string, number> = {};
  raw.forEach(r => (out[r.k] = Math.floor(r.v)));
  let left = 100 - raw.reduce((t, r) => t + out[r.k], 0);
  [...raw]
    .sort((x, y) => y.v - Math.floor(y.v) - (x.v - Math.floor(x.v)))
    .forEach(r => {
      if (left > 0) {
        out[r.k]++;
        left--;
      }
    });
  return out;
}

export function qScore(q: any, a: any): number | null {
  if (a === undefined || a === null) return null;
  if (isDontKnow(q, a)) return 0;

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
      // A split that does not total 100 is scaled to 100 rather than ignored.
      const al = normaliseAllocation(a);
      if (!al) return null;
      const vals: number[] = Object.values(al);
      const nb = al.nobody || 0;
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
  const id = String(currencyId || '').toLowerCase();
  const c = currencies.find((cur: any) => cur.id === id);
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
  const DEFAULT_GROWTH = 25;
  const rawGrowth = answers['E5'];
  const growth: number = typeof rawGrowth === 'number' && Number.isFinite(rawGrowth) ? rawGrowth : DEFAULT_GROWTH;
  const pg = kb.meta.waste_model.projection_growth || {};
  const growthMin = typeof pg.min === 'number' ? pg.min : -25;
  const growthMax = typeof pg.max === 'number' ? pg.max : 60;
  const projectionGrowth = Math.max(growthMin, Math.min(growthMax, growth));

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
  // Waste is only quantified when something feeding visibility or control was answered.
  const assessed = parts.length > 0;
  const cap = assessed ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  const band =
    kb.meta.waste_model.bands.find((b: any) => cap <= b.max_capability) ||
    kb.meta.waste_model.bands[kb.meta.waste_model.bands.length - 1];
  const mods = kb.meta.benchmarks.bfsi_modifiers;
  // The explicit classification wins; the free-text sector is only a fallback when none was given.
  const sectorText = String(org.sector || '').toLowerCase();
  const isBfsi = org.sector_class
    ? org.sector_class === 'bfsi'
    : sectorText.includes('banking') || sectorText.includes('financial');
  const full = mods.factors.reduce((a: number, f: any) => a + f.pts, 0);
  const upliftUncapped = isBfsi && assessed ? full * (1 - cap / 100) : 0;
  const high = Math.min(mods.cap, band.high + upliftUncapped);

  const wasteBandResult: EvaluationResult['wasteBand'] = assessed
    ? {
        assessed: true,
        low: band.low,
        high,
        label: band.label,
        anchor: band.anchor,
        // The uplift actually applied, so the page quotes what was used.
        uplift: Math.max(0, high - band.high),
        upliftUncapped,
        cap: Math.round(cap),
        isBfsi
      }
    : {
        assessed: false,
        low: null,
        high: null,
        label: 'Not assessed',
        anchor: 'No visibility or control questions were answered, so the waste band cannot be estimated.',
        uplift: 0,
        upliftUncapped: 0,
        cap: 0,
        isBfsi
      };

  let exposureResult: { band: any; y1: [number, number] | null; y3: [number, number] | null } = {
    band: wasteBandResult,
    y1: null,
    y3: null
  };

  const wasteLow = wasteBandResult.low;
  const wasteHigh = wasteBandResult.high;
  if (spend !== null && wasteLow !== null && wasteHigh !== null) {
    // Assumes today's waste rates persist and spend grows at the capped rate (which can be negative).
    const gRate = projectionGrowth / 100;
    const y1: [number, number] = [spend * wasteLow, spend * wasteHigh];
    let cl = 0;
    let ch = 0;
    let s = spend;
    for (let i = 0; i < 3; i++) {
      cl += s * wasteLow;
      ch += s * wasteHigh;
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
    if (q.dk_blind && isDontKnow(q, answers[q.id])) {
      blindSpotsList.push({ questionId: q.id, text: q.dk_blind });
    }
  });
  const alloc = normaliseAllocation(answers['O2']);
  if (alloc && alloc.nobody > 20) {
    blindSpotsList.push({
      questionId: 'O2',
      text: `A meaningful share of cloud cost responsibility is unassigned by the organisation's own account (${alloc.nobody} of 100 points).`
    });
  }

  // 9. Confidence: the share of scored questions (those that feed a signal) answered with something other
  // than "don't know". Unscored context questions and don't-knows do not count.
  const bsCount = blindSpotsList.length;
  const scoredQuestions = kb.questions.filter((q: any) => q.signals && q.signals.length);
  const answeredScored = scoredQuestions.filter(
    (q: any) => !isDontKnow(q, answers[q.id]) && qScore(q, answers[q.id]) !== null
  ).length;
  const answeredShare = scoredQuestions.length ? answeredScored / scoredQuestions.length : 0;
  let confidenceResult: { label: string; color: string; note: string };
  if (bsCount >= 6 || answeredShare < 0.4) {
    confidenceResult = {
      label: 'Low confidence',
      color: '#FF5E4F',
      note: 'A high number of unknowns means these figures are directional only. A billing-data baseline is required before they can be relied upon.'
    };
  } else if (bsCount >= 3 || answeredShare < 0.7) {
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
  // A signal with no answers counts as neutral (50); a genuine score of 0 stays 0.
  const sigV = signals.visibility ?? 50;
  const sigP = signals.predictability ?? 50;
  const sigO = signals.ownership ?? 50;
  const sigC = signals.control ?? 50;
  const sigVal = signals.value ?? 50;

  // Answer scores come from the knowledge base (an unknown answer scores 0); unanswered uses the default.
  const answerScore = (id: string, unanswered: number): number => {
    const q = kb.questions.find((x: any) => x.id === id);
    const sc = q ? qScore(q, answers[id]) : null;
    return sc ?? unanswered;
  };
  const commitCov = typeof answers['C2'] === 'number' ? answers['C2'] : 20;
  const decommission = answerScore('C3', 30);
  const netGovernance = answerScore('C5', 30);
  const costAttr = answerScore('V1', 30);
  // Forecast variance scored on the P1 question's own scale (0-60%, inverted). Unanswered or "don't know"
  // uses the question's default variance, as before.
  const qP1 = kb.questions.find((x: any) => x.id === 'P1');
  const p1Answer = typeof answers['P1'] === 'number' ? answers['P1'] : (qP1?.slider?.default ?? 15);
  const varianceScore = (qP1 ? qScore(qP1, p1Answer) : null) ?? 0;

  const rateScore = Math.round(0.6 * commitCov + 0.4 * sigC);
  const hygieneScore = Math.round(0.5 * decommission + 0.5 * sigC);
  const archScore = Math.round(0.5 * netGovernance + 0.3 * sigC + 0.2 * sigV);
  const attrScore = Math.round(0.5 * costAttr + 0.3 * sigV + 0.2 * sigO);
  const govScore = Math.round(0.4 * varianceScore + 0.3 * sigP + 0.3 * sigVal);

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

  // Each stream's share of the waste range is its benchmark weight scaled by its gap, renormalised so the
  // shares still sum to the whole range. A stream with no gap has no addressable value.
  const weightedGap = rawStreams.reduce((t, st) => t + st.weight * Math.max(0, 100 - st.score), 0);
  const streams = rawStreams
    .map(st => {
      const gap = 100 - st.score;
      const valueShare = weightedGap > 0 ? (st.weight * Math.max(0, gap)) / weightedGap : 0;
      let priority = 'Foundational';
      let priorityClass = 'p-found';
      let priorityOrder = 3;
      // Scores are whole numbers, so these equal the former "score < 45 || gap >= 55" and "score < 68 || gap >= 32".
      if (st.score <= 45) {
        priority = 'Critical (P1)';
        priorityClass = 'p-crit';
        priorityOrder = 1;
      } else if (st.score <= 68) {
        priority = 'High (P2)';
        priorityClass = 'p-high';
        priorityOrder = 2;
      }

      let savingsShareLow: number | null = null;
      let savingsShareHigh: number | null = null;
      if (spend !== null && wasteLow !== null && wasteHigh !== null && valueShare > 0) {
        savingsShareLow = Math.round(spend * wasteLow * valueShare);
        savingsShareHigh = Math.round(spend * wasteHigh * valueShare);
      }

      return {
        ...st,
        gap,
        valueShare,
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
    projectionGrowthRate: projectionGrowth,
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
