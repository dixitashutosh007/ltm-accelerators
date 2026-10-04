import { resilienceKnowledge as k } from "./knowledge";

export type ResilienceAnswers = Record<string, unknown>;

export interface NextQuestion {
  id: string;
  reason: string;
  evidence: string[];
  priority: "required" | "recommended";
}

export interface PatternDecision {
  id: string;
  name: string;
  score: number;
  fit: string;
  rationale: string;
  whyNot?: string;
  decisionFactors?: string[];
}

export interface ResilienceResult {
  status: "ready" | "requirements_incomplete";
  score: number | null;
  rating: string | null;
  maturity: { level: number; label: string } | null;
  evidenceConfidence: string;
  postureScore: number | null;
  criticalExposure: "Low" | "Moderate" | "High" | "Severe" | null;
  domainScores: Record<string, number>;
  preferredPattern: string | null;
  alternatives: PatternDecision[];
  patternRanking: PatternDecision[];
  eliminatedPatterns: string[];
  mandatoryControls: string[];
  gaps: string[];
  gapRegister: Array<{ id: string; name: string; severity: string; action: string }>;
  nextQuestions: NextQuestion[];
  evidenceRequests: string[];
  technologyOptions: Record<string, string[]>;
  blueprint: {
    targetPrinciples: string[];
    architectureLayers: string[];
    blueprintIds: string[];
  } | null;
  roadmap: Array<{ wave: string; window: string; actions: string[] }>;
  decisionLog: string[];
  executiveSummary: string;
}

const rtoMinutes: Record<string, number | null> = {
  "Near-zero": 0,
  "<15 minutes": 10,
  "15-60 minutes": 45,
  "1-4 hours": 120,
  "4-24 hours": 720,
  ">24 hours": 1440,
  "Unknown": null
};

const rpoMinutes: Record<string, number | null> = {
  "Near-zero": 0,
  "<15 minutes": 10,
  "15-60 minutes": 45,
  "1-4 hours": 120,
  "4-24 hours": 720,
  ">24 hours": 1440,
  "Unknown": null
};

const str = (v: unknown) => typeof v === "string" ? v : "";
const arr = (v: unknown) => Array.isArray(v) ? v.map(String) : [];

function criticality(a: ResilienceAnswers): string {
  const services = arr(a["EX-01"]);
  if (services.length === 0) return "unknown";
  if (services.some(x => /revenue|regulatory|customer/i.test(x))) return "very_high";
  if (services.some(x => /supply|workforce/i.test(x))) return "high";
  return "medium";
}

function cyberRisk(a: ResilienceAnswers): string {
  const v = str(a["EX-08"]);
  if (v === "Yes") return "destructive";
  if (v === "Potentially") return "high";
  if (v === "Unknown") return "unknown";
  return "low";
}

function concentrationRisk(a: ResilienceAnswers): string {
  const v = str(a["EX-11"]);
  if (v === "High concentration") return "high";
  if (v === "Moderate concentration") return "medium";
  if (v === "Unknown") return "unknown";
  return "low";
}

function dependencyRisk(a: ResilienceAnswers): string {
  const v = str(a["EX-05"]);
  if (v === "No" || v === "Documented but stale") return "high";
  if (v === "Partially") return "medium";
  if (v === "Unknown") return "unknown";
  return "low";
}

function environment(a: ResilienceAnswers): string {
  const e = arr(a["EX-18"]);
  if (e.includes("AWS")) return "aws";
  if (e.includes("Azure")) return "azure";
  if (e.includes("GCP")) return "gcp";
  if (e.includes("On-premises")) return "on_prem";
  if (e.includes("SaaS")) return "saas";
  return "unknown";
}

function evidenceConfidence(a: ResilienceAnswers): string {
  const v = str(a["EX-20"]);
  if (/independently/i.test(v)) return "independently_validated";
  if (/tested/i.test(v)) return "tested";
  if (/documented/i.test(v)) return "documented";
  if (v === "Low") return "self_declared";
  const test = str(a["EX-07"]);
  if (test === "Within 3 months") return "tested";
  if (test === "3-12 months ago") return "documented";
  return "self_declared";
}

function requiredQuestions(): string[] {
  return (k.questionBank.executive_questions as any[]).filter(q => q.required).map(q => q.id);
}

function ruleMatches(rule: any, a: ResilienceAnswers): boolean {
  const id = rule.when?.question;
  const condition = rule.when?.condition;
  if (rule.when?.multiple) {
    return rule.when.multiple.every((x: string) => {
      if (x === "critical_service") return criticality(a) !== "unknown";
      if (x === "ransomware_in_scope") return ["Yes", "Potentially"].includes(str(a["EX-08"]));
      if (x === "no_proven_recovery") return ["No", "Unknown", "Likely, but not recently tested"].includes(str(a["EX-06"]));
      return false;
    });
  }
  if (!id || !condition) return false;
  const v = str(a[id]);
  if (condition === "unknown") return v === "Unknown";
  if (condition === "RTO_<15m") return rtoMinutes[v] !== null && (rtoMinutes[v] as number) < 15;
  if (condition === "RTO_15m_to_1h") return rtoMinutes[v] !== null && (rtoMinutes[v] as number) >= 15 && (rtoMinutes[v] as number) <= 60;
  if (condition === "RTO_1h_to_4h") return rtoMinutes[v] !== null && (rtoMinutes[v] as number) > 60 && (rtoMinutes[v] as number) <= 240;
  if (condition === "RTO_gt_4h") return rtoMinutes[v] !== null && (rtoMinutes[v] as number) > 240;
  if (condition === "RPO_near_zero") return v === "Near-zero";
  if (condition === "not_proven_or_no") return ["No", "Unknown", "Likely, but not recently tested"].includes(v);
  if (condition === "never_or_gt_2y") return ["Never", ">2 years ago", "Unknown"].includes(v);
  if (condition === "yes_or_potentially") return ["Yes", "Potentially"].includes(v);
  if (condition === "not_immutable_or_not_recoverable") return ["Immutable but restore not proven", "Recoverable but not immutable", "No", "Unknown"].includes(v);
  if (condition === "critical_third_party") return ["Yes, with no viable alternative", "Yes, but alternatives exist"].includes(v);
  if (condition === "moderate_or_high_concentration") return ["Moderate concentration", "High concentration"].includes(v);
  if (condition === "critical_spof") return v === "Critical SPOFs exist";
  if (condition === "cloud_selected") return arr(a[id]).some(x => /AWS|Azure|GCP|public cloud/i.test(x));
  if (condition === "on_prem_selected") return arr(a[id]).includes("On-premises");
  if (condition === "no_or_unknown") return ["No", "Unknown"].includes(v);
  if (condition === "partial_or_stale") return ["Partially", "Documented but stale"].includes(v);
  if (condition === "low_or_unknown") return ["Low", "Unknown"].includes(v);
  if (condition === "no_or_technical_only") return ["No", "Technical tests only", "Unknown"].includes(v);
  if (condition === "partial_or_no") return ["Partially", "No", "Unknown"].includes(v);
  return false;
}

function dynamicBranch(a: ResilienceAnswers) {
  const questions = new Set<string>();
  const evidence = new Set<string>();
  const eliminate = new Set<string>();
  const candidates = new Set<string>();
  const flags = new Set<string>();

  for (const rule of k.decisionTree.branching_rules as any[]) {
    if (!ruleMatches(rule, a)) continue;
    for (const q of rule.then?.add_questions ?? []) questions.add(q);
    for (const e of rule.then?.require_evidence ?? []) evidence.add(e);
    for (const p of rule.then?.eliminate_patterns ?? []) eliminate.add(p);
    for (const p of rule.then?.candidate_patterns ?? []) candidates.add(p);
    if (rule.then?.flag) flags.add(rule.then.flag);
  }
  return { questions, evidence, eliminate, candidates, flags };
}

function scoreDomains(a: ResilienceAnswers, confidence: number): Record<string, number> {
  const q = k.questionBank.executive_questions as any[];
  const scoring = (k.scoringModel as any).question_scoring ?? {};
  const scores: Record<string, { sum: number; n: number }> = {};

  for (const x of q) {
    const v = a[x.id];
    if (v === undefined || v === null || v === "") continue;
    const rule = scoring[x.id];
    let s: number;

    if (rule?.scores && typeof v === "string" && typeof rule.scores[v] === "number") {
      s = rule.scores[v];
    } else if (rule?.type === "criticality_presence" || rule?.type === "environment_presence") {
      s = Number(rule.default ?? 60);
    } else if (rule?.scores && Array.isArray(v)) {
      const values = v.map(String).map((item: string) => Number(rule.scores[item])).filter(Number.isFinite);
      s = values.length ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length : Number(rule.default ?? 60);
    } else {
      s = Number(rule?.default ?? 60);
    }

    const d = x.domain;
    scores[d] ??= { sum: 0, n: 0 };
    scores[d].sum += Math.max(0, Math.min(100, s));
    scores[d].n++;
  }

  const result: Record<string, number> = {};
  for (const d of Object.keys(k.scoringModel.domain_weights)) {
    const raw = scores[d] ? scores[d].sum / scores[d].n : 50;
    result[d] = Math.round(Math.max(0, Math.min(100, raw * (0.7 + confidence * 0.3))));
  }
  return result;
}
function criticalExposure(gaps: Array<{ severity: string }>): "Low" | "Moderate" | "High" | "Severe" {
  const critical = gaps.filter(g => g.severity.toLowerCase() === "critical").length;
  const high = gaps.filter(g => g.severity.toLowerCase() === "high").length;
  if (critical >= 3) return "Severe";
  if (critical >= 1 || high >= 4) return "High";
  if (high >= 1) return "Moderate";
  return "Low";
}

function rating(score: number): string {
  const band = (k.scoringModel.rating_bands as any[]).find(x => score >= x.min && score <= x.max);
  return band?.label ?? "Unknown";
}

function maturity(score: number) {
  const level = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  const labels: Record<number, string> = {
    1: "Reactive", 2: "Documented", 3: "Defined", 4: "Tested", 5: "Adaptive"
  };
  return { level, label: labels[level] };
}

function currentCapability(a: ResilienceAnswers) {
  const currentRto = rtoMinutes[str(a["AF-DR-01"])] ?? null;
  const currentRpo = rpoMinutes[str(a["AF-DR-02"])] ?? null;
  const recoveryTested = str(a["EX-06"]) === "Yes, proven by testing" || str(a["EX-20"]) === "High — tested" || str(a["EX-20"]) === "High — independently validated";
  return { currentRto, currentRpo, recoveryTested };
}

function gapRegister(a: ResilienceAnswers, flags: Set<string>, score: number) {
  const gaps: Array<{ id: string; name: string; severity: string; action: string }> = [];
  const add = (id: string) => {
    const g = (k.blueprintEngine.gap_taxonomy as any[]).find(x => x.id === id);
    if (g && !gaps.some(x => x.id === id)) gaps.push(g);
  };
  if (str(a["EX-03"]) === "Unknown" || str(a["EX-04"]) === "Unknown" || !a["EX-03"] || !a["EX-04"]) add("G-01");
  if (flags.has("recovery_capability_gap") || ["Never", ">2 years ago", "Unknown"].includes(str(a["EX-07"]))) add("G-02");
  if (flags.has("backup_resilience_gap")) add("G-03");
  if (flags.has("concentration_risk") || str(a["EX-12"]) === "Critical SPOFs exist") add("G-04");
  if (["Yes", "Potentially"].includes(str(a["EX-08"]))) add("G-05");
  if (flags.has("identity_recovery_gap")) add("G-06");
  if (flags.has("dependency_mapping_gap") || ["No", "Documented but stale"].includes(str(a["EX-05"]))) add("G-07");
  if (str(a["EX-10"]) === "Yes, with no viable alternative" || flags.has("concentration_risk")) add("G-08");
  const capability = currentCapability(a);
  if (str(a["EX-06"]) === "No" || str(a["EX-20"]) === "Low") add("G-09");
  if (capability.currentRto !== null && rtoMinutes[str(a["EX-03"])] !== null && capability.currentRto > (rtoMinutes[str(a["EX-03"])] as number)) add("G-02");
  if (capability.currentRpo !== null && rpoMinutes[str(a["EX-04"])] !== null && capability.currentRpo > (rpoMinutes[str(a["EX-04"])] as number)) add("G-02");
  if (["No", "Technical tests only", "Unknown"].includes(str(a["EX-16"]))) add("G-10");
  if (score < 60 && gaps.length === 0) add("G-02");
  return gaps;
}

function patternScore(id: string, a: ResilienceAnswers, eliminated: Set<string>): PatternDecision | null {
  if (eliminated.has(id)) return null;
  const p = (k.patterns.patterns as any[]).find(x => x.id === id);
  if (!p) return null;
  const rto = rtoMinutes[str(a["EX-03"])] ?? null;
  const rpo = rpoMinutes[str(a["EX-04"])] ?? null;
  const crit = criticality(a);
  const cyber = cyberRisk(a);
  const concentration = concentrationRisk(a);
  const dependency = dependencyRisk(a);
  let score = 55;

  if (id === "DR-01") score += (rto !== null && rto >= 1440 ? 22 : 0) + (rpo !== null && rpo >= 1440 ? 15 : 0) - (crit === "very_high" ? 10 : 0);
  if (id === "DR-02") score += (rto !== null && rto >= 240 && rto < 1440 ? 18 : 0);
  if (id === "DR-03") score += (rto !== null && rto <= 240 ? 15 : 0) + (rpo !== null && rpo <= 60 ? 10 : 0);
  if (id === "DR-04") score += (rto !== null && rto <= 60 ? 18 : 0) + (crit === "very_high" ? 8 : 0);
  if (id === "DR-05") score += (rto !== null && rto <= 15 ? 24 : 0) + (rpo === 0 ? 16 : 0);

  if (cyber === "destructive") {
    if (id === "CYBER-01") score += 24;
    else if (id === "CYBER-04") score += 16;
    else if (id === "CYBER-03") score += 12;
    else if (id === "CYBER-02") score += 10;
    else if (id === "DATA-01") score += 8;
    else if (p.decision_role === "recovery_strategy") score -= 4;
  } else if (cyber === "high") {
    if (id === "CYBER-01") score += 18;
    else if (id === "CYBER-04") score += 12;
    else if (id === "CYBER-03") score += 10;
    else if (id === "CYBER-02") score += 8;
    else if (id === "DATA-01") score += 6;
  }

  if (concentration === "high" && /INF-03|INF-04|TP-03|TP-05/.test(id)) score += 20;
  if (dependency === "high" && /DR-07|APP-04|DR-08/.test(id)) score += 18;

  const env = environment(a);
  if (env !== "unknown" && Array.isArray(p[env === "on_prem" ? "on_prem_mapping" : env + "_mapping"])) score += 3;
  score = Math.max(0, Math.min(100, score));
  const decisionFactors: string[] = [];
  if (rto !== null) decisionFactors.push(`Required RTO: ${str(a["EX-03"])}`);
  if (rpo !== null) decisionFactors.push(`Required RPO: ${str(a["EX-04"])}`);
  if (crit !== "unknown") decisionFactors.push(`Business criticality: ${crit}`);
  if (cyber !== "low" && cyber !== "unknown") decisionFactors.push(`Cyber risk: ${cyber}`);
  if (concentration !== "low" && concentration !== "unknown") decisionFactors.push(`Concentration risk: ${concentration}`);
  if (dependency !== "low" && dependency !== "unknown") decisionFactors.push(`Dependency risk: ${dependency}`);
  if (id === "DR-02" && rto !== null && rto <= 240) decisionFactors.push("Pilot Light provides a faster recovery path than backup/rebuild without assuming active-active complexity.");
  if (id === "DR-03" && rto !== null && rto <= 240) decisionFactors.push("Warm Standby improves recovery speed and readiness, but carries greater continuous operating cost.");
  if (id === "DR-04" && rto !== null && rto <= 60) decisionFactors.push("Hot Standby becomes justified when recovery objectives demand near-continuous readiness.");
  if (id === "DR-05" && rto !== null && rto <= 15 && rpo === 0) decisionFactors.push("Active-Active is primarily justified by near-zero recovery objectives and tolerance for materially higher complexity.");
  return {
    id,
    name: p.name,
    score,
    fit: score >= 85 ? "Strong fit" : score >= 70 ? "Good fit" : score >= 55 ? "Conditional fit" : "Weak fit",
    rationale: p.decision_role === "cyber_strategy"
      ? p.name + " is a cyber-recovery strategy and is evaluated separately from the primary DR recovery strategy."
      : p.decision_role === "cyber_control"
        ? p.name + " is a supporting cyber control rather than a replacement for the primary recovery strategy."
        : p.name + " is ranked against the stated recovery objectives, business criticality and operating constraints.",
    whyNot: p.when_not_to_use,
    decisionFactors
  };
}

function technologyOptions(patternIds: string[], a: ResilienceAnswers): Record<string, string[]> {
  const provider = environment(a);
  const source = k.implementationMappings as any;
  const result: Record<string, string[]> = {};
  const providers = provider === "unknown" ? ["aws", "azure", "gcp", "on_prem"] : [provider];
  for (const p of patternIds) {
    for (const x of providers) {
      const values = source[x]?.[p];
      if (Array.isArray(values) && values.length) result[`${p}:${x}`] = values;
    }
  }
  return result;
}

function roadmap(gaps: ReturnType<typeof gapRegister>, preferred: string | null, cyberRiskLevel: string) {
  const templates = k.blueprintEngine.roadmap_action_templates as any[];
  const byGap = gaps.map(g => templates.find(t => t.trigger === g.id)).filter(Boolean) as any[];
  const immediate = byGap.filter(x => ["G-01","G-02","G-03","G-04","G-05","G-06"].includes(x.trigger)).map(x => x.action);
  const enablement = byGap.filter(x => ["G-07","G-08","G-09","G-10"].includes(x.trigger)).map(x => x.action);
  const strategy = preferred ? [`Validate and implement ${preferred} against measured RTO/RPO`] : [];
  if (cyberRiskLevel === "destructive" || cyberRiskLevel === "high") strategy.unshift("Validate cyber recovery isolation and clean restore before production recovery migration");
  return [
    { wave: "W0", window: "0-30 days", actions: [...new Set(immediate)].slice(0, 4) },
    { wave: "W1", window: "31-90 days", actions: [...new Set([...immediate.slice(4), ...enablement, ...strategy])].slice(0, 4) },
    { wave: "W2", window: "3-6 months", actions: strategy.length ? strategy : ["Engineer target-state recovery capability"] },
    { wave: "W3", window: "6-18 months", actions: ["Scale testing, dependency resilience and continuous validation"] }
  ];
}

export function evaluateResilienceIq(a: ResilienceAnswers): ResilienceResult {
  const rto = rtoMinutes[str(a["EX-03"])] ?? null;
  const rpo = rpoMinutes[str(a["EX-04"])] ?? null;
  const branch = dynamicBranch(a);
  const required = requiredQuestions();
  const missing = required.filter(id => a[id] === undefined || a[id] === null || a[id] === "");
  const requirementsIncomplete = rto === null || rpo === null;
  const confidenceLabel = evidenceConfidence(a);
  const confidence = Number((k.scoringModel.evidence_confidence as any)[confidenceLabel] ?? 0.7);
  const domains = scoreDomains(a, confidence);
  const postureScore = Math.round(Object.entries(domains).reduce((s, [d, v]) => s + v * Number((k.scoringModel.domain_weights as any)[d] ?? 0), 0));
  let score = postureScore;

  if (branch.flags.has("critical_spof")) score -= 10;
  if (branch.flags.has("backup_resilience_gap")) score -= 15;
  if (branch.flags.has("identity_recovery_gap")) score -= 8;
  if (branch.flags.has("concentration_risk")) score -= 6;
  if (branch.flags.has("recovery_capability_gap")) score -= 8;
  score = Math.max(0, Math.min(100, score));

  const gaps = gapRegister(a, branch.flags, score);
  const eliminated = new Set<string>(branch.eliminate);
  if (rto !== null && rto < 60) eliminated.add("DR-01");
  if (rto !== null && rto < 15) eliminated.add("DR-02");
  if (rpo !== null && rpo <= 15) eliminated.add("DR-01");

  const candidateIds = ["DR-01","DR-02","DR-03","DR-04","DR-05","CYBER-01","CYBER-02","CYBER-03","CYBER-04","DATA-01",...branch.candidates];
  const unique = [...new Set(candidateIds)];
  const ranking = unique.map(id => patternScore(id, a, eliminated)).filter(Boolean) as PatternDecision[];
  ranking.sort((x, y) => y.score - x.score);
  const recoveryRanking = ranking.filter(x => ["DR-01","DR-02","DR-03","DR-04","DR-05"].includes(x.id));
  const preferred = requirementsIncomplete || missing.length > 0 ? null : recoveryRanking[0]?.id ?? null;

  const nextQuestions: NextQuestion[] = [];
  for (const id of branch.questions) {
    const existing = a[id];
    if (existing !== undefined) continue;
    const q = (k.questionBank.advisory_questions as any[]).find(x => x.id === id);
    if (q) nextQuestions.push({ id, reason: "Triggered by assessed resilience risk/decision branch.", evidence: q.evidence ?? [], priority: "required" });
  }
  for (const id of missing) {
    const q = (k.questionBank.executive_questions as any[]).find(x => x.id === id);
    if (q) nextQuestions.push({ id, reason: "Required executive baseline question.", evidence: q.evidence ?? [], priority: "required" });
  }

  const evidenceRequests = [...new Set([
    ...branch.evidence,
    ...(requirementsIncomplete ? ["BIA", "RTO/RPO register"] : []),
    ...(branch.flags.has("low_test_evidence") ? ["failover test evidence", "restore test evidence"] : [])
  ])];

  const mandatoryControls = [
    ...(cyberRisk(a) === "destructive" || cyberRisk(a) === "high" ? ["DATA-01", "DATA-02", "CYBER-01", "CYBER-02"] : []),
    ...(concentrationRisk(a) === "high" ? ["TP-03", "TP-05"] : []),
    ...(dependencyRisk(a) === "high" ? ["DR-07", "APP-04", "DR-08"] : [])
  ];

  const blueprintIds = preferred
    ? ((k.blueprintEngine.recommendation_to_blueprint_mapping as any)[preferred] ?? [])
    : ["BP-02", "BP-12"];

  const blueprint = requirementsIncomplete || missing.length > 0 ? null : {
    targetPrinciples: ["business_service_first","failure_domain_separation","cyber_recovery","dependency_awareness","evidence_driven_testing","tiered_investment"],
    architectureLayers: ["business_service","people_process","application","data","infrastructure","network","identity","cyber_recovery","third_party","observability_governance"],
    blueprintIds
  };

  const executiveSummary = requirementsIncomplete || missing.length > 0
    ? "Resilience assessment requires defined recovery objectives before a final target-state recommendation can be issued."
    : `The assessment indicates a ${rating(postureScore).toLowerCase()} resilience posture with ${criticalExposure(gaps).toLowerCase()} critical exposure. ${preferred ? preferred + " is the preferred primary recovery strategy based on the stated recovery objectives and risk profile." : "A primary recovery strategy remains undefined."}`;

  return {
    status: requirementsIncomplete || missing.length > 0 ? "requirements_incomplete" : "ready",
    score: requirementsIncomplete ? null : score,
    postureScore: requirementsIncomplete ? null : postureScore,
    criticalExposure: requirementsIncomplete ? null : criticalExposure(gaps),
    rating: requirementsIncomplete ? null : rating(postureScore),
    maturity: requirementsIncomplete ? null : maturity(postureScore),
    evidenceConfidence: confidenceLabel,
    domainScores: domains,
    preferredPattern: preferred,
    alternatives: recoveryRanking.slice(1, 3),
    patternRanking: ranking.slice(0, 8),
    eliminatedPatterns: [...eliminated],
    mandatoryControls,
    gaps: gaps.map(g => g.name),
    gapRegister: gaps,
    nextQuestions,
    evidenceRequests,
    technologyOptions: preferred ? technologyOptions([preferred, ...recoveryRanking.slice(1,3).map(x => x.id), ...(cyberRisk(a) === "destructive" || cyberRisk(a) === "high" ? ["CYBER-01"] : [])], a) : {},
    blueprint,
    roadmap: roadmap(gaps, preferred, cyberRisk(a)),
    executiveSummary,
    decisionLog: [
      "Vendor-neutral strategy is selected before provider implementation mapping.",
      "RTO/RPO are treated as business requirements and are never inferred from technology.",
      requirementsIncomplete ? "Final recommendation blocked until required RTO/RPO are defined." : "Final recommendation permitted because required executive baseline is complete.",
      `Resilience posture score: ${postureScore}; critical exposure: ${requirementsIncomplete ? "not assessed" : criticalExposure(gaps)}.`,
      `Evidence confidence: ${confidenceLabel}.`
    ]
  };
}
