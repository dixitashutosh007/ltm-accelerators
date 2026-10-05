import { resilienceKnowledge as k } from "./knowledge";
import { RESILIENCE_IQ_VERSION } from "./version";

export type ResilienceMatrixAnswer = Record<string, string>;
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

export interface RecommendationConfidence {
  level: "High" | "Moderate" | "Low" | "Blocked";
  score: number;
  reasons: string[];
  decisionSensitivity: string[];
}

export interface RecommendationSensitivity {
  id: string;
  trigger: string;
  currentAssumption: string;
  impact: string;
  affectedDecision: string;
  action: string;
}

export interface EvidenceRegisterItem {
  id: string;
  evidence: string;
  type: "business_requirement" | "architecture" | "recovery_test" | "backup_restore" | "cyber_recovery" | "third_party" | "dependency" | "governance" | "other";
  status: "not_requested" | "requested" | "provided" | "validated" | "rejected";
  purpose: string;
  validationCriteria: string[];
  affectedGaps: string[];
  affectsRecommendation: boolean;
}

export interface ResilienceExecutiveReport {
  assessmentType: "Executive Scan";
  advisoryStatus: "initial" | "requirements_incomplete";
  executiveSummary: string;
  assessmentScope: string;
  postureScore: number | null;
  rating: string | null;
  maturity: { level: number; label: string } | null;
  evidenceConfidence: string;
  criticalExposure: "Low" | "Moderate" | "High" | "Severe" | null;
  topRisks: Array<{ id: string; name: string; severity: string; action: string }>;
  businessRequirements: {
    criticalServices: string[];
    impactTolerance: string;
    requiredRto: string;
    requiredRpo: string;
    recoveryPriority: string;
  };
  recoveryStrategy: { preferred: string | null; alternatives: PatternDecision[]; rationale: string; sensitivity: string[] };
  supportingControls: PatternDecision[];
  technologyMapping: Record<string, string[]>;
  evidenceValidation: Array<{ evidence: string; purpose: string }>;
  evidenceRegister: EvidenceRegisterItem[];
  targetState: {
    environment: string;
    recoveryPattern: string;
    principles: string[];
    architectureLayers: string[];
    architectureDecisions: string[];
    blueprintIds: string[];
  } | null;
  roadmap: Array<{ wave: string; window: string; actions: string[] }>;
  governanceMetrics: string[];
  decisionPoints: string[];
  recommendationConfidence: RecommendationConfidence;
  recommendationSensitivity: RecommendationSensitivity[];
}

export interface ResilienceResult {
  version: typeof RESILIENCE_IQ_VERSION;
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
  evidenceRegister: EvidenceRegisterItem[];
  technologyOptions: Record<string, string[]>;
  blueprint: {
    targetPrinciples: string[];
    architectureLayers: string[];
    blueprintIds: string[];
  } | null;
  roadmap: Array<{ wave: string; window: string; actions: string[] }>;
  decisionLog: string[];
  executiveSummary: string;
  executiveReport: ResilienceExecutiveReport;
  recommendationConfidence: RecommendationConfidence;
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
  const raw = a["EX-05"];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const values = Object.values(raw as Record<string, unknown>).map(String);
    if (!values.length) return "unknown";
    if (values.some(v => v === "No mapping" || v === "Stale")) return "high";
    if (values.some(v => v === "Partial")) return "medium";
    if (values.every(v => v === "Validated")) return "low";
    return "unknown";
  }
  const v = str(raw);
  if (v === "No" || v === "Documented but stale") return "high";
  if (v === "Partially") return "medium";
  if (v === "Unknown") return "unknown";
  return "low";
}

function normalizedScoringValue(questionId: string, value: unknown): string | string[] | undefined {
  if (questionId !== "EX-05" || !value || typeof value !== "object" || Array.isArray(value)) {
    return typeof value === "string" || Array.isArray(value) ? value as string | string[] : undefined;
  }
  const values = Object.values(value as Record<string, unknown>).map(String);
  if (!values.length) return undefined;
  if (values.every(v => v === "Validated")) return "Yes, current and validated";
  if (values.some(v => v === "No mapping")) return "No";
  if (values.some(v => v === "Stale")) return "Documented but stale";
  if (values.some(v => v === "Partial")) return "Partially";
  return "Unknown";
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
  const raw = a[id];
  const v = str(normalizedScoringValue(id, raw));
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
  if (condition === "advisory_recovery_not_proven") return ["No", "Partially", "Unknown"].includes(v);
  if (condition === "advisory_automation_weak") return ["Manual runbook", "Partially automated", "Unknown"].includes(v);
  if (condition === "advisory_cyber_weak") return ["No", "Unknown", "Tabletop only"].includes(v);
  if (condition === "advisory_backup_weak") return ["No", "Unknown"].includes(v);
  if (condition === "advisory_exit_weak") return ["High — no practical alternative", "Unknown", "No viable exit"].includes(v);
  if (condition === "advisory_testing_weak") return ["No", "Partially", "Unknown", "Never", "Ad hoc"].includes(v);
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
    if (rule.then?.action) flags.add(rule.then.action);
  }
  return { questions, evidence, eliminate, candidates, flags };
}

function scoreDomains(a: ResilienceAnswers, confidence: number): Record<string, number> {
  const q = k.questionBank.executive_questions as any[];
  const scoring = (k.scoringModel as any).question_scoring ?? {};
  const scores: Record<string, { sum: number; n: number }> = {};

  for (const x of q) {
    const raw = a[x.id];
    if (raw === undefined || raw === null || raw === "") continue;
    const v = normalizedScoringValue(x.id, raw);
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
function applyAdvisoryPostureAdjustments(domains: Record<string, number>, flags: Set<string>) {
  const model = (k.scoringModel as any).advisory_adjustments ?? {};
  const adjusted = { ...domains };
  let overallPenalty = 0;
  for (const flag of flags) {
    const rule = model[flag];
    if (!rule) continue;
    overallPenalty += Number(rule.overall ?? 0);
    for (const [domain, penalty] of Object.entries(rule.domains ?? {})) {
      if (adjusted[domain] !== undefined) {
        adjusted[domain] = Math.max(0, adjusted[domain] + Number(penalty));
      }
    }
  }
  const cap = Number((k.scoringModel as any).advisory_adjustment_rules?.max_overall_penalty ?? 20);
  return { domains: adjusted, overallPenalty: Math.min(cap, Math.max(0, -overallPenalty)) };
}

function recommendationConfidence(
  a: ResilienceAnswers,
  preferred: string | null,
  ranking: PatternDecision[],
  gaps: Array<{ severity: string }>,
  confidenceLabel: string,
  assessmentIncomplete: boolean
): RecommendationConfidence {
  if (assessmentIncomplete || !preferred) {
    return { level: "Blocked", score: 0, reasons: ["Required business objectives or advisory validation are incomplete."], decisionSensitivity: ["Complete required questions and evidence validation before approving a target-state strategy."] };
  }
  let score = confidenceLabel === "independently_validated" ? 95 :
    confidenceLabel === "tested" ? 85 :
    confidenceLabel === "documented" ? 70 :
    confidenceLabel === "self_declared" ? 55 : 35;
  const reasons: string[] = [];
  const lead = ranking.find(x => x.id === preferred);
  const second = ranking.find(x => x.id !== preferred && /^DR-/.test(x.id));
  const margin = lead && second ? lead.score - second.score : 20;
  if (margin < 8) { score -= 15; reasons.push("Recovery strategy ranking is sensitive because the leading options are closely matched."); }
  if (gaps.some(g => ["critical","high"].includes(g.severity.toLowerCase()))) { score -= 10; reasons.push("Material resilience gaps remain unresolved."); }
  if (a["EX-06"] === "Likely, but not recently tested" || a["EX-07"] === ">2 years ago" || a["EX-07"] === "Never") {
    score -= 10; reasons.push("Recovery capability is not supported by recent successful testing.");
  }
  if (a["EX-03"] === "Unknown" || a["EX-04"] === "Unknown") {
    score = 0; reasons.push("Recovery objectives are undefined.");
  }
  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? "High" : score >= 60 ? "Moderate" : "Low";
  const sensitivity = [
    "Measured RTO/RPO results that miss the stated objectives.",
    "Material change to business impact tolerance or critical-service dependency topology.",
    "New evidence showing cyber recovery, identity recovery or third-party recovery is less isolated than assumed."
  ];
  return { level, score, reasons: reasons.length ? reasons : ["Recovery objectives, evidence confidence and strategy ranking provide a consistent basis for the current recommendation."], decisionSensitivity: sensitivity };
}

function buildEvidenceRegister(
  evidenceRequests: string[],
  gaps: Array<{ id: string; name: string; severity: string; action: string }>
): EvidenceRegisterItem[] {
  return evidenceRequests.map((evidence, index) => {
    const text = evidence.toLowerCase();
    const affectedGaps = gaps.filter(g => {
      if (text.includes("rto") || text.includes("rpo") || text.includes("bia")) return g.id === "G-01" || g.id === "G-02";
      if (text.includes("backup") || text.includes("restore")) return g.id === "G-03" || g.id === "G-05";
      if (text.includes("failover") || text.includes("recovery")) return ["G-02","G-04","G-06","G-09","G-10"].includes(g.id);
      if (text.includes("cyber")) return g.id === "G-05" || g.id === "G-06";
      if (text.includes("supplier") || text.includes("third-party") || text.includes("exit")) return g.id === "G-08";
      if (text.includes("dependency")) return g.id === "G-07" || g.id === "G-04";
      return false;
    }).map(g => g.id);
    const type =
      text.includes("rto") || text.includes("rpo") || text.includes("bia") ? "business_requirement" :
      text.includes("backup") || text.includes("restore") ? "backup_restore" :
      text.includes("cyber") ? "cyber_recovery" :
      text.includes("supplier") || text.includes("third-party") || text.includes("exit") ? "third_party" :
      text.includes("dependency") ? "dependency" :
      text.includes("test") || text.includes("failover") || text.includes("recovery") ? "recovery_test" :
      text.includes("architecture") || text.includes("diagram") ? "architecture" :
      "other";
    const validationCriteria =
      type === "business_requirement" ? ["Evidence identifies the critical service and approved impact tolerance/RTO/RPO.", "Values are owned by the business and consistent with the assessment scope."] :
      type === "backup_restore" ? ["Recovery points are protected from production compromise.", "A restore test demonstrates usable data and records achieved recovery time."] :
      type === "cyber_recovery" ? ["Recovery path is isolated from the compromised production trust boundary.", "A clean recovery exercise demonstrates usable recovery points and identity access."] :
      type === "third_party" ? ["Contract/SLA defines resilience obligations and notification/testing requirements.", "Alternative or exit capability is credible for the stated impact tolerance."] :
      type === "dependency" ? ["Dependencies are mapped to the critical service and recovery sequence.", "Shared failure domains and recovery blockers are explicitly identified."] :
      type === "recovery_test" ? ["Test covers the end-to-end service, not only infrastructure components.", "Observed RTO/RPO are recorded and compared with approved objectives."] :
      ["Evidence is current, attributable and relevant to the assessed control."];
    return {
      id: "ER-" + String(index + 1).padStart(2, "0"),
      evidence,
      type,
      status: "requested",
      purpose: evidence.toLowerCase().includes("test") ? "Validate that documented recovery capability achieves the stated business objective." :
        evidence.toLowerCase().includes("backup") || evidence.toLowerCase().includes("restore") ? "Validate data recoverability and clean restoration." :
        evidence.toLowerCase().includes("supplier") ? "Validate third-party resilience commitments, alternatives and exit capability." :
        "Validate the assessment assumption and supporting control.",
      validationCriteria,
      affectedGaps,
      affectsRecommendation: affectedGaps.some(id => ["G-01","G-02","G-03","G-04","G-05","G-06","G-07","G-08","G-09"].includes(id))
    };
  });
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

function advisorySignals(a: ResilienceAnswers): Set<string> {
  const flags = new Set<string>();
  const v = (id: string) => str(a[id]);
  const vals = (id: string) => arr(a[id]).map(String);

  // Advisory answers refine the executive branch rather than replacing it.
  if (["No", "Partially", "Unknown"].includes(v("AF-DR-04"))) flags.add("recovery_capability_gap");
  if (["Manual runbook", "Partially automated", "Unknown"].includes(v("AF-DR-05"))) flags.add("recovery_automation_gap");
  if (["No", "Unknown"].includes(v("AF-CY-03"))) flags.add("backup_resilience_gap");
  if (["No", "Unknown", "Tabletop only"].includes(v("AF-CY-04"))) flags.add("cyber_recovery_gap");
  if (["No defined method", "Unknown"].includes(v("AF-CY-05"))) flags.add("cyber_recovery_gap");
  if (["High — no practical alternative", "Unknown"].includes(v("AF-TP-02"))) flags.add("concentration_risk");
  if (["No viable exit", "Unknown"].includes(v("AF-TP-03"))) flags.add("third_party_exit_gap");
  if (["Provider test evidence only", "Contractual assertion only", "No evidence"].includes(v("AF-TP-04"))) flags.add("low_test_evidence");
  if (vals("AF-CL-01").some(x => ["Identity plane", "Cloud provider"].includes(x))) flags.add("concentration_risk");
  if (["No", "Unknown", "Partially"].includes(v("AF-CL-04"))) flags.add("low_test_evidence");
  if (["Limited capacity", "No", "Unknown"].includes(v("AF-OP-01"))) flags.add("people_continuity_gap");
  if (["Partially", "No", "Unknown"].includes(v("AF-OP-02"))) flags.add("crisis_management_gap");
  if (["Partially", "No", "Unknown"].includes(v("AF-OP-03"))) flags.add("governance_gap");
  if (["No", "Unknown"].includes(v("AF-TS-02")) || ["Never", "Ad hoc"].includes(v("AF-TS-03"))) flags.add("low_test_evidence");
  return flags;
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
  if (["Yes", "Potentially"].includes(str(a["EX-08"])) || flags.has("cyber_recovery_gap")) add("G-05");
  if (flags.has("identity_recovery_gap")) add("G-06");
  if (flags.has("dependency_mapping_gap") || ["No", "Documented but stale"].includes(str(normalizedScoringValue("EX-05", a["EX-05"])))) add("G-07");
  if (str(a["EX-10"]) === "Yes, with no viable alternative" || flags.has("concentration_risk")) add("G-08");
  const capability = currentCapability(a);
  if (str(a["EX-06"]) === "No" || str(a["EX-20"]) === "Low") add("G-09");
  if (capability.currentRto !== null && rtoMinutes[str(a["EX-03"])] !== null && capability.currentRto > (rtoMinutes[str(a["EX-03"])] as number)) add("G-02");
  if (capability.currentRpo !== null && rpoMinutes[str(a["EX-04"])] !== null && capability.currentRpo > (rpoMinutes[str(a["EX-04"])] as number)) add("G-02");
  if (["No", "Technical tests only", "Unknown"].includes(str(a["EX-16"]))) add("G-10");
  if (score < 60 && gaps.length === 0) add("G-02");
  return gaps;
}

function patternScore(id: string, a: ResilienceAnswers, eliminated: Set<string>, advisoryFlags: Set<string> = new Set()): PatternDecision | null {
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

  // Advisory findings refine pattern fit. They do not replace hard requirement elimination.
  if (advisoryFlags.has("recovery_capability_gap")) {
    if (/^DR-0[34]$/.test(id)) score -= 8;
    if (id === "DR-08" || id === "INF-06") score += 12;
  }
  if (advisoryFlags.has("recovery_automation_gap")) {
    if (id === "DR-08" || id === "INF-06") score += 14;
    if (/^DR-0[34]$/.test(id)) score -= 4;
  }
  if (advisoryFlags.has("cyber_recovery_gap")) {
    if (id === "CYBER-01") score += 22;
    if (id === "CYBER-02" || id === "CYBER-03") score += 12;
    if (/^DR-/.test(id)) score -= 3;
  }
  if (advisoryFlags.has("backup_resilience_gap") && /DATA-01|DATA-02|CYBER-03/.test(id)) score += 15;
  if (advisoryFlags.has("third_party_exit_gap") && /TP-02|TP-04|TP-05/.test(id)) score += 18;
  if (advisoryFlags.has("low_test_evidence") && /TEST-01|TEST-02|TEST-03|TEST-04/.test(id)) score += 16;

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

function targetStateBlueprint(
  a: ResilienceAnswers,
  preferred: string | null,
  gaps: ReturnType<typeof gapRegister>,
  mandatoryControls: string[]
) {
  if (!preferred) return null;

  const env = environment(a);
  const layers = new Set<string>([
    "business_service",
    "people_process",
    "application",
    "data",
    "infrastructure",
    "network",
    "identity",
    "observability_governance"
  ]);

  if (cyberRisk(a) === "destructive" || cyberRisk(a) === "high") layers.add("cyber_recovery");
  if (str(a["EX-10"]) !== "No" || concentrationRisk(a) !== "low") layers.add("third_party");

  const architectureDecisions: string[] = [
    "Design recovery around critical business services and validated impact tolerance/RTO/RPO.",
    "Separate recovery capability from the primary production failure domain.",
    "Sequence application, data, infrastructure, network and identity dependencies before service recovery.",
    "Use evidence-driven testing to prove recovery objectives rather than relying on design assumptions."
  ];

  if (preferred === "DR-02") architectureDecisions.push("Use a rebuild/pilot-light recovery foundation with automated provisioning and validated recovery sequencing.");
  if (preferred === "DR-03") architectureDecisions.push("Maintain continuously available warm recovery capacity sufficient to meet the measured RTO/RPO.");
  if (preferred === "DR-04") architectureDecisions.push("Maintain hot recovery capacity and automated failover for services requiring near-continuous readiness.");
  if (preferred === "DR-05") architectureDecisions.push("Use independently resilient failure domains with active traffic distribution and synchronized data where justified by business objectives.");
  if (preferred === "DR-01") architectureDecisions.push("Use protected backup and controlled rebuild/restore as the primary recovery pattern for relaxed objectives.");

  if (mandatoryControls.includes("CYBER-01")) architectureDecisions.push("Maintain an isolated cyber-recovery capability with clean restore validation.");
  if (mandatoryControls.includes("CYBER-02")) architectureDecisions.push("Provide an alternate privileged identity recovery path independent of the primary control plane.");
  if (mandatoryControls.includes("TP-05")) architectureDecisions.push("Reduce or explicitly govern concentration across providers, regions, networks and critical SaaS dependencies.");
  if (mandatoryControls.includes("DR-07")) architectureDecisions.push("Make dependency-aware recovery sequencing an explicit architectural control.");

  const blueprintIds = ((k.blueprintEngine.recommendation_to_blueprint_mapping as any)[preferred] ?? []).slice();
  for (const g of gaps) {
    if (g.id === "G-05" && !blueprintIds.includes("BP-07")) blueprintIds.push("BP-07");
    if (g.id === "G-08" && !blueprintIds.includes("BP-08")) blueprintIds.push("BP-08");
    if (g.id === "G-07" && !blueprintIds.includes("BP-03")) blueprintIds.push("BP-03");
  }

  return {
    environment: env,
    recoveryPattern: preferred,
    principles: ["business_service_first","failure_domain_separation","cyber_recovery","dependency_awareness","evidence_driven_testing","tiered_investment"],
    architectureLayers: [...layers],
    architectureDecisions,
    blueprintIds: [...new Set(blueprintIds)]
  };
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
  const advisory = advisorySignals(a);
  const effectiveFlags = new Set([...branch.flags, ...advisory]);
  const required = requiredQuestions();
  const missing = required.filter(id => a[id] === undefined || a[id] === null || a[id] === "");
  const requirementsIncomplete = rto === null || rpo === null;
  const advisoryMissing = [...branch.questions].filter(id => a[id] === undefined || a[id] === null || a[id] === "");
  const advisoryDepthRequired = effectiveFlags.has("force_advisory_depth");
  const assessmentIncomplete = requirementsIncomplete || missing.length > 0 || (advisoryDepthRequired && advisoryMissing.length > 0);
  const confidenceLabel = evidenceConfidence(a);
  const confidence = Number((k.scoringModel.evidence_confidence as any)[confidenceLabel] ?? 0.7);
  const baseDomains = scoreDomains(a, confidence);
  const advisoryPosture = applyAdvisoryPostureAdjustments(baseDomains, advisory);
  const domains = advisoryPosture.domains;
  const postureScore = Math.round(Object.entries(domains).reduce((s, [d, v]) => s + v * Number((k.scoringModel.domain_weights as any)[d] ?? 0), 0));
  let score = Math.max(0, postureScore - advisoryPosture.overallPenalty);

  if (effectiveFlags.has("critical_spof")) score -= 10;
  if (effectiveFlags.has("backup_resilience_gap")) score -= 15;
  if (effectiveFlags.has("identity_recovery_gap")) score -= 8;
  if (effectiveFlags.has("concentration_risk")) score -= 6;
  if (effectiveFlags.has("recovery_capability_gap")) score -= 8;
  score = Math.max(0, Math.min(100, score));

  const gaps = gapRegister(a, effectiveFlags, score);
  const eliminated = new Set<string>(branch.eliminate);
  if (rto !== null && rto < 60) eliminated.add("DR-01");
  if (rto !== null && rto < 15) eliminated.add("DR-02");
  if (rpo !== null && rpo <= 15) eliminated.add("DR-01");

  const candidateIds = ["DR-01","DR-02","DR-03","DR-04","DR-05","CYBER-01","CYBER-02","CYBER-03","CYBER-04","DATA-01",...branch.candidates];
  const unique = [...new Set(candidateIds)];
  const ranking = unique.map(id => patternScore(id, a, eliminated, advisory)).filter(Boolean) as PatternDecision[];
  ranking.sort((x, y) => y.score - x.score);
  const recoveryRanking = ranking.filter(x => ["DR-01","DR-02","DR-03","DR-04","DR-05"].includes(x.id));
  const preferred = assessmentIncomplete ? null : recoveryRanking[0]?.id ?? null;
  const recommendationConfidenceResult = recommendationConfidence(a, preferred, ranking, gaps, confidenceLabel, assessmentIncomplete);

  const nextQuestions: NextQuestion[] = [];
  const advisoryQuestions = k.questionBank.advisory_questions as any[];
  const decisionImpact: Record<string, number> = {
    recovery_capability_gap: 100,
    cyber_recovery_gap: 96,
    backup_resilience_gap: 94,
    third_party_exit_gap: 90,
    concentration_risk: 88,
    recovery_automation_gap: 84,
    low_test_evidence: 82,
    people_continuity_gap: 76,
    crisis_management_gap: 74,
    governance_gap: 72
  };
  const advisoryPriority = (q: any) => {
    const branches = k.decisionTree.branching_rules as any[];
    const triggers = branches
      .filter(rule => (rule.then?.add_questions ?? []).includes(q.id))
      .map(rule => rule.then?.flag ?? rule.then?.action)
      .filter(Boolean);
    let impact = Math.max(0, ...triggers.map((flag: string) => decisionImpact[flag] ?? 50));
    // Keep questions tied directly to a critical branch ahead of generic advisory questions.
    for (const rule of branches) {
      if (!(rule.then?.add_questions ?? []).includes(q.id)) continue;
      if (rule.when?.question === "EX-08" && rule.when?.condition === "yes_or_potentially") impact = Math.max(impact, 96);
      if (rule.when?.question === "EX-06" && rule.when?.condition === "not_proven_or_no") impact = Math.max(impact, 100);
    }
    const materialEvidence = (q.evidence ?? []).length ? 5 : 0;
    return impact + materialEvidence;
  };
  for (const id of branch.questions) {
    if (a[id] !== undefined && a[id] !== null && a[id] !== "") continue;
    const q = advisoryQuestions.find(x => x.id === id);
    if (q) nextQuestions.push({ id, reason: "Triggered by an active resilience risk or decision branch.", evidence: q.evidence ?? [], priority: "required" });
  }
  for (const id of missing) {
    const q = (k.questionBank.executive_questions as any[]).find(x => x.id === id);
    if (q) nextQuestions.push({ id, reason: "Required executive baseline question.", evidence: q.evidence ?? [], priority: "required" });
  }
  nextQuestions.sort((x, y) => advisoryPriority(advisoryQuestions.find(q => q.id === y.id) ?? {}) - advisoryPriority(advisoryQuestions.find(q => q.id === x.id) ?? {}));
  const prioritizedQuestions = nextQuestions.slice(0, 8);

  const evidenceRequests = [...new Set([
    ...branch.evidence,
    ...(requirementsIncomplete ? ["BIA", "RTO/RPO register"] : []),
    ...(effectiveFlags.has("low_test_evidence") ? ["failover test evidence", "restore test evidence"] : [])
  ])];

  const mandatoryControls = [
    ...(cyberRisk(a) === "destructive" || cyberRisk(a) === "high" || effectiveFlags.has("cyber_recovery_gap") ? ["DATA-01", "DATA-02", "CYBER-01", "CYBER-02"] : []),
    ...(concentrationRisk(a) === "high" ? ["TP-03", "TP-05"] : []),
    ...(concentrationRisk(a) === "high" && ["aws", "azure", "gcp"].includes(environment(a)) ? ["INF-04"] : []),
    ...(dependencyRisk(a) === "high" ? ["DR-07", "APP-04", "DR-08"] : [])
  ];

  const blueprint = assessmentIncomplete ? null : targetStateBlueprint(a, preferred, gaps, mandatoryControls);

  const executiveSummary = assessmentIncomplete
    ? advisoryDepthRequired && advisoryMissing.length > 0
      ? "Resilience assessment requires advisory-depth validation of the triggered critical-service, cyber-recovery and recovery-capability risks before a final target-state recommendation can be issued."
      : "Resilience assessment requires defined recovery objectives before a final target-state recommendation can be issued."
    : `The assessment indicates a ${rating(postureScore).toLowerCase()} resilience posture with ${criticalExposure(gaps).toLowerCase()} critical exposure. ${preferred ? preferred + " is the preferred primary recovery strategy based on the stated recovery objectives and risk profile." : "A primary recovery strategy remains undefined."}`;

  const topRisks = gaps.slice().sort((x, y) => {
    const rank: Record<string, number> = { critical: 4, "medium-high": 3, high: 3, medium: 2, low: 1 };
    return (rank[y.severity.toLowerCase()] ?? 0) - (rank[x.severity.toLowerCase()] ?? 0);
  }).slice(0, 5);

  const evidenceValidation = evidenceRequests.map(evidence => ({
    evidence,
    purpose: evidence.toLowerCase().includes("test") ? "Validate that documented recovery capability achieves the stated business objective." :
      evidence.toLowerCase().includes("dependency") ? "Validate recovery sequencing, shared dependencies and failure-domain exposure." :
      evidence.toLowerCase().includes("supplier") ? "Validate third-party resilience commitments, alternatives and exit capability." :
      evidence.toLowerCase().includes("backup") || evidence.toLowerCase().includes("restore") ? "Validate data recoverability and clean restoration." :
      "Validate the assessment assumption and supporting control."
  }));

  const evidenceRegister = buildEvidenceRegister(evidenceRequests, gaps);
  const recommendationSensitivity: RecommendationSensitivity[] = preferred ? [
    { id: "SENS-01", trigger: "Measured recovery misses the approved RTO/RPO.", currentAssumption: "Current recovery capability can meet the stated objectives.", impact: "The selected recovery tier may be insufficient.", affectedDecision: preferred, action: "Re-test the service and reassess the next higher credible recovery pattern." },
    { id: "SENS-02", trigger: "Business impact tolerance or recovery objectives change.", currentAssumption: "Current business requirements remain valid.", impact: "Pattern requirement fit changes.", affectedDecision: preferred, action: "Re-run the strategy decision using the revised business requirement." },
    { id: "SENS-03", trigger: "Cyber recovery cannot be isolated from the production trust boundary.", currentAssumption: "Recovery remains trustworthy after destructive compromise.", impact: "Production DR may not be a safe recovery path.", affectedDecision: "CYBER-01/CYBER-02", action: "Strengthen isolated cyber recovery before relying on production recovery." },
    { id: "SENS-04", trigger: "Critical concentration or dependency risk cannot be reduced.", currentAssumption: "Shared failure-domain risk is controllable.", impact: "Recovery can fail through a correlated dependency.", affectedDecision: "TP-03/TP-05/INF-03/INF-04/DR-07", action: "Reassess multi-provider, multi-region and dependency-aware controls." }
  ] : [
    { id: "SENS-00", trigger: "RTO/RPO are undefined.", currentAssumption: "No approved business recovery requirement exists.", impact: "A final recovery strategy cannot be safely selected.", affectedDecision: "Business requirement baseline", action: "Complete BIA and approve impact tolerance, RTO and RPO." }
  ];
  const sensitivity = recommendationSensitivity.map(x => x.action);

  const executiveReport: ResilienceExecutiveReport = {
    assessmentType: "Executive Scan",
    advisoryStatus: assessmentIncomplete ? "requirements_incomplete" : "initial",
    executiveSummary,
    assessmentScope: "20-question executive resilience scan covering business continuity, disaster recovery, cyber recovery, operational resilience, third-party resilience and infrastructure resilience.",
    postureScore: assessmentIncomplete ? null : postureScore,
    rating: assessmentIncomplete ? null : rating(postureScore),
    maturity: assessmentIncomplete ? null : maturity(postureScore),
    evidenceConfidence: confidenceLabel,
    criticalExposure: assessmentIncomplete ? null : criticalExposure(gaps),
    topRisks,
    businessRequirements: {
      criticalServices: arr(a["EX-01"]),
      impactTolerance: str(a["EX-02"]) || "Unknown",
      requiredRto: str(a["EX-03"]) || "Unknown",
      requiredRpo: str(a["EX-04"]) || "Unknown",
      recoveryPriority: criticality(a)
    },
    recoveryStrategy: {
      preferred,
      alternatives: recoveryRanking.slice(1, 3),
      rationale: preferred ? "The " + preferred + " strategy is selected from recovery objectives first, then adjusted for criticality, cyber risk, dependency risk and concentration." : "No final recovery strategy is issued until recovery objectives are defined.",
      sensitivity
    },
    supportingControls: ranking.filter(x => !/^DR-/.test(x.id)).slice(0, 5),
    technologyMapping: preferred ? technologyOptions([preferred, ...recoveryRanking.slice(1, 3).map(x => x.id), ...(cyberRisk(a) === "destructive" || cyberRisk(a) === "high" ? ["CYBER-01"] : [])], a) : {},
    evidenceValidation,
    evidenceRegister,
    targetState: blueprint,
    roadmap,
    governanceMetrics: (k.blueprintEngine.section_rules?.governance_and_metrics?.required_metrics ?? []) as string[],
    decisionPoints: (k.executiveReport.decision_points ?? []) as string[],
    recommendationConfidence: recommendationConfidenceResult
  };

  return {
    version: RESILIENCE_IQ_VERSION,
    status: assessmentIncomplete ? "requirements_incomplete" : "ready",
    score: assessmentIncomplete ? null : score,
    postureScore: assessmentIncomplete ? null : postureScore,
    criticalExposure: assessmentIncomplete ? null : criticalExposure(gaps),
    rating: assessmentIncomplete ? null : rating(postureScore),
    maturity: assessmentIncomplete ? null : maturity(postureScore),
    evidenceConfidence: confidenceLabel,
    domainScores: domains,
    preferredPattern: preferred,
    alternatives: recoveryRanking.slice(1, 3),
    patternRanking: ranking.slice(0, 8),
    eliminatedPatterns: [...eliminated],
    mandatoryControls,
    gaps: gaps.map(g => g.name),
    gapRegister: gaps,
    nextQuestions: prioritizedQuestions,
    evidenceRequests,
    evidenceRegister,
    technologyOptions: preferred ? technologyOptions([preferred, ...recoveryRanking.slice(1,3).map(x => x.id), ...(cyberRisk(a) === "destructive" || cyberRisk(a) === "high" ? ["CYBER-01"] : [])], a) : {},
    blueprint,
    roadmap: roadmap(gaps, preferred, cyberRisk(a)),
    executiveSummary,
    executiveReport,
    decisionLog: [
      "Vendor-neutral strategy is selected before provider implementation mapping.",
      "RTO/RPO are treated as business requirements and are never inferred from technology.",
      requirementsIncomplete ? "Final recommendation blocked until required RTO/RPO are defined." :
        advisoryDepthRequired && advisoryMissing.length > 0 ? "Final recommendation blocked until triggered advisory-depth questions are completed." :
        "Final recommendation permitted because required executive baseline is complete.",
      `Resilience posture score: ${postureScore}; critical exposure: ${requirementsIncomplete ? "not assessed" : criticalExposure(gaps)}.`,
      `Evidence confidence: ${confidenceLabel}.`,
      `Evidence register: ${evidenceRegister.length} requested item(s); validation is required before material evidence can affect recommendation confidence.`,
      evidenceRegister.some(x => x.affectsRecommendation)
        ? "Recommendation-affecting evidence requests are linked to material resilience gaps and must be validated before final investment approval."
        : "No recommendation-affecting evidence gaps are currently registered.",
      recommendationSensitivity.length
        ? `Recommendation sensitivity: ${recommendationSensitivity.map(x => x.id).join(", ")}.`
        : "No additional recommendation sensitivity triggers identified."
    ]
  };
}
