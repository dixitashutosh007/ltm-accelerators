import knowledgeBase from "./knowledge-base.json";

export interface ModernizationIqOrg {
  clientName?: string;
  industry?: string;
  workloadCount?: string;
  dcCount?: string;
  annualDcSpend?: string;
  targetExitHorizon?: string;
}

export interface ModernizationIqInput {
  org?: ModernizationIqOrg;
  answers: Record<string, any>;
  subjectiveNotes?: Record<string, string>;
  clarificationAnswers?: Record<string, string>;
}

export interface TriggeredProbe {
  id: string;
  name: string;
  badge: string;
  finding: string;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  desc: string;
}

export interface ModernizationIqResult {
  dimScores: Record<string, number>;
  overall: number;
  band: string;
  peerMedian: number;
  peerDelta: number;
  primaryFriction: string;
  frictionDetail: string;
  triggeredProbes: TriggeredProbe[];
  roadmapPhases: RoadmapPhase[];
}

export function computeQuestionScore(qId: string, val: any): number {
  const qDef = (knowledgeBase.questions as any[]).find(q => q.id === qId);
  if (!qDef || val === undefined || val === null) {
    return 3.0;
  }

  const type = qDef.type;
  if (type === "single" || type === "rating") {
    const num = Number(val);
    return isNaN(num) ? 3.0 : Math.min(5, Math.max(1, num + 1));
  } else if (type === "slider") {
    const num = Number(val);
    return isNaN(num) ? 3.0 : Math.min(5, Math.max(1, (num / 100) * 4 + 1));
  } else if (type === "multi") {
    const ct = Array.isArray(val) ? val.length : 0;
    return Math.min(5, Math.max(1, ct + 1));
  } else if (type === "matrix") {
    if (typeof val === "object" && val !== null) {
      let dcColo = 0;
      Object.keys(val).forEach(k => {
        if (val[k] === "colo" || val[k] === "cloud") dcColo++;
      });
      return Math.min(5, Math.max(1, dcColo + 1));
    }
    return 3.0;
  } else if (type === "drag") {
    return 3.5;
  }

  return 3.0;
}

export function evaluateModernizationIq(input: ModernizationIqInput): ModernizationIqResult {
  const answers = input.answers || {};
  const dimScores: Record<string, number> = {};

  const dimensions = knowledgeBase.dimensions as Array<{ id: string; weight: number }>;

  dimensions.forEach(d => {
    const questionsInDim = (knowledgeBase.questions as any[]).filter(q => q.dimension === d.id);
    let sum = 0;
    let count = 0;

    questionsInDim.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined && val !== null) {
        sum += computeQuestionScore(q.id, val);
        count++;
      }
    });

    dimScores[d.id] = count > 0 ? Number((sum / count).toFixed(2)) : 3.0;
  });

  const dimValues = Object.values(dimScores);
  const rawOverall = dimValues.reduce((a, b) => a + b, 0) / dimensions.length;
  const overall = Number(rawOverall.toFixed(2));

  let band = "Emerging";
  if (overall < 2.0) band = "Nascent";
  else if (overall < 2.9) band = "Emerging";
  else if (overall < 3.8) band = "Established";
  else if (overall < 4.5) band = "Advanced";
  else band = "Leading";

  const peerMedian = 3.1;
  const peerDelta = Number((overall - peerMedian).toFixed(2));

  let primaryFriction = "Data Centre Power & Siting Ceiling";
  let frictionDetail = "Utility grid or rack cooling constraints inhibit AI compute expansion.";
  if (dimScores["D5"] <= 2.2) {
    primaryFriction = "Migration Factory Throughput Drag";
    frictionDetail = "Workload migration duration (>6m) threatens facility exit deadlines.";
  } else if (dimScores["D1"] <= 2.0) {
    primaryFriction = "Facility Lease Cliff & Contract Exposure";
    frictionDetail = "Contract renewals force hasty decisions without mapped dependencies.";
  } else if (dimScores["D4"] <= 2.2) {
    primaryFriction = "Monolithic Dependency Debt";
    frictionDetail = "Unmapped 6R dispositions result in uncontrolled IaaS rehost sprawl.";
  }

  // Triggered Anomaly Probes
  const triggeredProbes: TriggeredProbe[] = [];

  // Probe 1: PROBE_POWER_GPU
  const q31 = answers["Q3.1"] !== undefined ? Number(answers["Q3.1"]) : 0;
  const q21 = answers["Q2.1"] !== undefined ? Number(answers["Q2.1"]) : 65;
  const q22 = answers["Q2.2"] !== undefined ? Number(answers["Q2.2"]) : 0;
  if (q31 >= 2 && (q21 >= 80 || q22 <= 1)) {
    const probe = (knowledgeBase.anomalyProbes as any[]).find(p => p.id === "PROBE_POWER_GPU");
    if (probe) {
      triggeredProbes.push({
        id: probe.id,
        name: probe.name,
        badge: probe.badge,
        finding: probe.finding
      });
    }
  }

  // Probe 2: PROBE_CLIFF_VELOCITY
  const q13 = answers["Q1.3"] !== undefined ? Number(answers["Q1.3"]) : 2;
  const q52 = answers["Q5.2"] !== undefined ? Number(answers["Q5.2"]) : 2;
  const q51 = answers["Q5.1"] !== undefined ? Number(answers["Q5.1"]) : 0;
  if (q13 <= 1 && (q52 <= 1 || q51 <= 1)) {
    const probe = (knowledgeBase.anomalyProbes as any[]).find(p => p.id === "PROBE_CLIFF_VELOCITY");
    if (probe) {
      triggeredProbes.push({
        id: probe.id,
        name: probe.name,
        badge: probe.badge,
        finding: probe.finding
      });
    }
  }

  // Probe 3: PROBE_UNMAPPED_SCALE
  const q41 = answers["Q4.1"] !== undefined ? Number(answers["Q4.1"]) : 35;
  if (q41 <= 20) {
    const probe = (knowledgeBase.anomalyProbes as any[]).find(p => p.id === "PROBE_UNMAPPED_SCALE");
    if (probe) {
      triggeredProbes.push({
        id: probe.id,
        name: probe.name,
        badge: probe.badge,
        finding: probe.finding
      });
    }
  }

  // Probe 4: PROBE_SOVEREIGN_AI
  const q33 = answers["Q3.3"] !== undefined ? Number(answers["Q3.3"]) : 0;
  if (q33 <= 1 && q31 >= 1) {
    const probe = (knowledgeBase.anomalyProbes as any[]).find(p => p.id === "PROBE_SOVEREIGN_AI");
    if (probe) {
      triggeredProbes.push({
        id: probe.id,
        name: probe.name,
        badge: probe.badge,
        finding: probe.finding
      });
    }
  }

  const roadmapPhases: RoadmapPhase[] = [
    {
      phase: "Phase 1 (Weeks 1–6)",
      title: "Facility & Power Audit",
      desc: "Map thermal breaker thresholds, lease expirations, and establish shadow-DC discovery."
    },
    {
      phase: "Phase 2 (Weeks 7–16)",
      title: "6R Wave Orchestration",
      desc: "Mobilize LTM Migration Factory, decouple monoliths, and validate AI siting topologies."
    },
    {
      phase: "Phase 3 (Months 4–9)",
      title: "Cutover & Decommission",
      desc: "Execute wave cutovers, release colocation cages, and retire stranded hardware."
    },
    {
      phase: "Phase 4 (Continuous)",
      title: "FinOps & AI Governance",
      desc: "Establish dynamic unit economics, ongoing PUE efficiency, and zero-trust compliance."
    }
  ];

  return {
    dimScores,
    overall,
    band,
    peerMedian,
    peerDelta,
    primaryFriction,
    frictionDetail,
    triggeredProbes,
    roadmapPhases
  };
}
