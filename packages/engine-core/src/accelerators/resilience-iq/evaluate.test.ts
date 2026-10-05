import { evaluateResilienceIq } from "./evaluate";

const incomplete = evaluateResilienceIq({
  "EX-01": ["Revenue-generating services"],
  "EX-03": "Unknown",
  "EX-04": "Unknown"
});
if (incomplete.status !== "requirements_incomplete") throw new Error("Missing objectives must block recommendation");
if (incomplete.preferredPattern !== null) throw new Error("Incomplete requirements must not produce a preferred pattern");
if (!incomplete.evidenceRequests.includes("BIA")) throw new Error("Missing objectives should request BIA evidence");

const result = evaluateResilienceIq({
  "EX-01": ["Customer-facing services", "Revenue-generating services"],
  "EX-02": "15-60 minutes",
  "EX-03": "15-60 minutes",
  "EX-04": "<15 minutes",
  "EX-05": "No",
  "EX-06": "Likely, but not recently tested",
  "EX-07": ">2 years ago",
  "EX-08": "Potentially",
  "EX-09": "Immutable but restore not proven",
  "EX-10": "Yes, but alternatives exist",
  "EX-11": "High concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Partially",
  "EX-14": "Partially",
  "EX-15": "Yes, periodic review",
  "EX-16": "Technical tests only",
  "EX-17": "No",
  "EX-18": ["AWS", "SaaS"],
  "EX-19": "Partially",
  "EX-20": "Medium — documented but not fully tested"
});
if (result.status !== "ready") throw new Error("Expected complete executive baseline to be ready");
if (!result.eliminatedPatterns.includes("DR-01")) throw new Error("DR-01 should be eliminated");
if (!result.nextQuestions.some(q => q.id.startsWith("AF-"))) throw new Error("Decision tree should produce advisory questions");
if (!result.mandatoryControls.includes("DATA-01")) throw new Error("Cyber exposure should require protected recovery");
if (!result.technologyOptions["DR-03:aws"]) throw new Error("Preferred/alternative strategy should map to AWS implementation options");
if (result.gapRegister.length === 0) throw new Error("Expected evidence/risk gaps");
if (result.roadmap.length !== 4) throw new Error("Expected four roadmap waves");
if (!result.mandatoryControls.includes("TP-05")) throw new Error("High concentration should require concentration-risk control");
if (!result.mandatoryControls.includes("DR-07")) throw new Error("High dependency risk should require dependency-aware recovery");
if (!result.evidenceRequests.length) throw new Error("Risk-driven assessment should request evidence");


const nearZero = evaluateResilienceIq({
  "EX-01": ["Revenue-generating services"],
  "EX-02": "<15 minutes",
  "EX-03": "<15 minutes",
  "EX-04": "Near-zero",
  "EX-05": "Yes, current",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Immutable and restore proven",
  "EX-10": "No",
  "EX-11": "Low concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Yes, current",
  "EX-14": "Yes, current",
  "EX-15": "Yes, periodic review",
  "EX-16": "Scenario-based tests",
  "EX-17": "Yes",
  "EX-18": ["AWS"],
  "EX-19": "Yes, current",
  "EX-20": "High — tested"
});
if (nearZero.preferredPattern !== "DR-05") throw new Error("Near-zero RTO/RPO should prefer active-active recovery");

const lowCriticality = evaluateResilienceIq({
  "EX-01": ["Internal workforce services"],
  "EX-02": ">24 hours",
  "EX-03": ">24 hours",
  "EX-04": ">24 hours",
  "EX-05": "Yes, current",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Immutable and restore proven",
  "EX-10": "No",
  "EX-11": "Low concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Yes, current",
  "EX-14": "Yes, current",
  "EX-15": "Yes, periodic review",
  "EX-16": "Scenario-based tests",
  "EX-17": "No",
  "EX-18": ["On-premises"],
  "EX-19": "Yes, current",
  "EX-20": "High — tested"
});
if (lowCriticality.preferredPattern !== "DR-01") throw new Error("Low-criticality, relaxed objectives should prefer backup and restore");

const cyberCase = evaluateResilienceIq({
  "EX-01": ["Customer-facing services", "Revenue-generating services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes",
  "EX-05": "Yes, current",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "Yes",
  "EX-09": "Immutable but restore not proven",
  "EX-10": "Yes, with no viable alternative",
  "EX-11": "High concentration",
  "EX-12": "Critical SPOFs exist",
  "EX-13": "Partially",
  "EX-14": "Partially",
  "EX-15": "Yes, periodic review",
  "EX-16": "Technical tests only",
  "EX-17": "No",
  "EX-18": ["Azure"],
  "EX-19": "Partially",
  "EX-20": "Medium — documented but not fully tested"
});
if (!cyberCase.preferredPattern) throw new Error("Cyber case should still select a primary recovery strategy");
if (!cyberCase.technologyOptions["CYBER-01:azure"]) throw new Error("Destructive cyber risk should map the cyber recovery overlay");
if (!cyberCase.mandatoryControls.includes("CYBER-02")) throw new Error("Destructive cyber risk should require identity recovery isolation");


const onPremCase = evaluateResilienceIq({
  "EX-01": ["Customer-facing services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes",
  "EX-05": "Yes, current",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Immutable and restore proven",
  "EX-10": "No",
  "EX-11": "Low concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Partially",
  "EX-14": "Yes, current",
  "EX-15": "Yes, periodic review",
  "EX-16": "Scenario-based tests",
  "EX-17": "Yes",
  "EX-18": ["On-premises"],
  "EX-19": "Partially",
  "EX-20": "High — tested"
});
if (!onPremCase.technologyOptions["DR-03:on_prem"]) throw new Error("On-premises scenario should map the selected recovery strategy to on-prem implementation");

const cloudConcentration = evaluateResilienceIq({
  "EX-01": ["Customer-facing services", "Revenue-generating services"],
  "EX-02": "15-60 minutes",
  "EX-03": "15-60 minutes",
  "EX-04": "15-60 minutes",
  "EX-05": "Yes, current",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Immutable and restore proven",
  "EX-10": "Yes, but alternatives exist",
  "EX-11": "High concentration",
  "EX-12": "Critical SPOFs exist",
  "EX-13": "Partially",
  "EX-14": "Partially",
  "EX-15": "Yes, periodic review",
  "EX-16": "Scenario-based tests",
  "EX-17": "No",
  "EX-18": ["AWS"],
  "EX-19": "Partially",
  "EX-20": "Medium — documented but not fully tested"
});
if (!cloudConcentration.mandatoryControls.includes("TP-05")) throw new Error("Cloud concentration should require concentration-risk mitigation");
if (!cloudConcentration.mandatoryControls.includes("INF-04")) throw new Error("Cloud concentration should require multi-region resilience");

const matrixCase = evaluateResilienceIq({
  "EX-01": ["Customer-facing services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes",
  "EX-05": {
    "Applications": "Validated",
    "Data": "Validated",
    "Infrastructure": "Partial",
    "People": "Validated",
    "Third parties": "Stale"
  },
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Yes, tested",
  "EX-10": "No",
  "EX-11": "No material concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Yes, proven",
  "EX-14": "Yes, exercised",
  "EX-15": "Yes, with metrics and actions",
  "EX-16": "Yes, regularly",
  "EX-17": "Yes, tested",
  "EX-18": ["AWS"],
  "EX-19": "Yes, isolated alternate path exists",
  "EX-20": "High — tested"
});
if (matrixCase.status !== "ready") throw new Error("Matrix answers should satisfy the executive baseline");
if (!matrixCase.mandatoryControls.includes("DR-07")) throw new Error("Partial/stale matrix dependency state should require dependency-aware recovery");
if (!matrixCase.gapRegister.some(g => g.id === "G-07")) throw new Error("Matrix dependency state should register a dependency mapping gap");


const advisoryGateCase = evaluateResilienceIq({
  "EX-01": ["Customer-facing services", "Revenue-generating services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes",
  "EX-05": "Yes, current and validated",
  "EX-06": "Likely, but not recently tested",
  "EX-07": "1-2 years ago",
  "EX-08": "Potentially",
  "EX-09": "Immutable but restore not proven",
  "EX-10": "Yes, with no viable alternative",
  "EX-11": "High concentration",
  "EX-12": "Critical SPOFs exist",
  "EX-13": "Partially",
  "EX-14": "Partially",
  "EX-15": "Yes, periodic review",
  "EX-16": "Technical tests only",
  "EX-17": "No",
  "EX-18": ["AWS"],
  "EX-19": "Unknown",
  "EX-20": "Medium — documented but not fully tested"
});
if (advisoryGateCase.status !== "requirements_incomplete") throw new Error("Critical cyber exposure with unproven recovery should require advisory depth");
if (advisoryGateCase.preferredPattern !== null) throw new Error("Advisory depth gate should block the final recovery strategy");
if (!advisoryGateCase.nextQuestions.some(q => q.id === "AF-CY-01")) throw new Error("Advisory gate should surface cyber deep-dive questions");


const advisorySignalCase = evaluateResilienceIq({
  "EX-01": ["Revenue-generating services"],
  "EX-02": "<15 minutes",
  "EX-03": "<15 minutes",
  "EX-04": "<15 minutes",
  "EX-05": "Yes, current and validated",
  "EX-06": "Yes, proven by testing",
  "EX-07": "Within 3 months",
  "EX-08": "No",
  "EX-09": "Immutable and restore proven",
  "EX-10": "No",
  "EX-11": "Low concentration",
  "EX-12": "No known SPOFs",
  "EX-13": "Yes, current",
  "EX-14": "Yes, current",
  "EX-15": "Yes, periodic review",
  "EX-16": "Scenario-based tests",
  "EX-17": "Yes",
  "EX-18": ["AWS"],
  "EX-19": "Yes, current",
  "EX-20": "High — tested",
  "AF-DR-04": "No",
  "AF-DR-05": "Manual runbook",
  "AF-CY-03": "No",
  "AF-CY-04": "No",
  "AF-CY-05": "No defined method",
  "AF-CL-04": "No"
});
if (!advisorySignalCase.gapRegister.some(g => g.id === "G-02")) throw new Error("Advisory recovery evidence should create a recovery capability gap");
if (!advisorySignalCase.gapRegister.some(g => g.id === "G-05")) throw new Error("Advisory cyber evidence should create a cyber recovery gap");
if (!advisorySignalCase.mandatoryControls.includes("CYBER-01")) throw new Error("Advisory cyber evidence should require isolated cyber recovery");
if (!advisorySignalCase.mandatoryControls.includes("DATA-01")) throw new Error("Advisory cyber evidence should require protected backup");
if (!advisorySignalCase.roadmap.some(w => w.actions.some(a => /cyber recovery/i.test(a)))) throw new Error("Advisory cyber evidence should affect the roadmap");

if (advisorySignalCase.domainScores.CYBER >= 70) throw new Error("Advisory cyber weakness should reduce CYBER posture");
if (advisorySignalCase.domainScores.DR >= 70) throw new Error("Advisory recovery weakness should reduce DR posture");
const advisoryBranchCase = evaluateResilienceIq({
  "EX-01":["Revenue-generating services"],"EX-02":"1-4 hours","EX-03":"1-4 hours","EX-04":"15-60 minutes",
  "EX-05":"Yes, current and validated","EX-06":"Yes, proven by testing","EX-07":"Within 3 months","EX-08":"Yes",
  "EX-09":"Immutable and restore proven","EX-10":"Yes, with alternatives","EX-11":"Low concentration","EX-12":"No known SPOFs",
  "EX-13":"Yes, current","EX-14":"Yes, current","EX-15":"Yes, periodic review","EX-16":"Scenario-based tests","EX-17":"Yes",
  "EX-18":["AWS"],"EX-19":"Yes, current","EX-20":"High — tested",
  "AF-DR-04":"No","AF-DR-05":"Manual runbook","AF-CY-03":"No","AF-CY-04":"No","AF-TS-02":"No"
});
if (!advisoryBranchCase.evidenceRequests.includes("cyber recovery exercise evidence")) throw new Error("Advisory cyber branch should request cyber exercise evidence");
if (!advisoryBranchCase.evidenceRequests.includes("recovery orchestration evidence")) throw new Error("Advisory recovery automation branch should request orchestration evidence");
if (!advisoryBranchCase.mandatoryControls.includes("DATA-01")) throw new Error("Advisory backup weakness should require protected backup");
const advisoryRanking = evaluateResilienceIq({
  "EX-01":["Revenue-generating services"],"EX-02":"1-4 hours","EX-03":"1-4 hours","EX-04":"15-60 minutes",
  "EX-05":"Yes, current and validated","EX-06":"Yes, proven by testing","EX-07":"Within 3 months","EX-08":"Yes",
  "EX-09":"Immutable and restore proven","EX-10":"Yes, with alternatives","EX-11":"Low concentration","EX-12":"No known SPOFs",
  "EX-13":"Yes, current","EX-14":"Yes, current","EX-15":"Yes, periodic review","EX-16":"Scenario-based tests","EX-17":"Yes",
  "EX-18":["AWS"],"EX-19":"Yes, current","EX-20":"High — tested",
  "AF-DR-04":"No","AF-DR-05":"Manual runbook","AF-CY-03":"No","AF-CY-04":"No","AF-CY-05":"No defined method",
  "AF-TS-02":"No"
});
if (!advisoryRanking.patternRanking.some(p => p.id === "CYBER-01" && p.score >= 70)) throw new Error("Cyber advisory weakness should materially rank isolated cyber recovery");
if (!advisoryRanking.patternRanking.some(p => p.id === "DR-08" && p.score >= 60)) throw new Error("Recovery weakness should elevate orchestration");

const advisoryPriorityCase = evaluateResilienceIq({
  "EX-01":["Revenue-generating services"],"EX-02":"<15 minutes","EX-03":"<15 minutes","EX-04":"<15 minutes",
  "EX-05":"Yes, current and validated","EX-06":"No, recovery capability is not proven","EX-07":"Never",
  "EX-08":"Yes","EX-09":"No","EX-10":"Yes, with no viable alternative","EX-11":"High concentration",
  "EX-12":"Critical SPOFs exist","EX-13":"Partially","EX-14":"No","EX-15":"No","EX-16":"Technical tests only",
  "EX-17":"No","EX-18":["AWS"],"EX-19":"Unknown","EX-20":"Low — uncertain",
  "AF-DR-04":"No","AF-DR-05":"Manual runbook","AF-CY-03":"No","AF-CY-04":"No",
  "AF-CY-05":"No defined method","AF-TP-02":"High — no practical alternative","AF-TP-03":"No viable exit",
  "AF-TS-02":"No","AF-TS-03":"Never"
});
if (advisoryPriorityCase.nextQuestions.length > 8) throw new Error("Advisory rounds should be capped at 8 questions");
if (advisoryPriorityCase.nextQuestions[0]?.id !== "AF-DR-04") throw new Error("Highest-impact recovery validation question should be prioritized first");

if (!advisoryPriorityCase.recommendationSensitivity.some(s => s.id === "SENS-01" && s.affectedDecision)) throw new Error("Recommendation sensitivity should identify the affected decision");
if (!advisoryPriorityCase.recommendationSensitivity.some(s => s.id === "SENS-03")) throw new Error("Cyber recovery sensitivity should be explicit");

const advisoryLifecycleAnswers: any = {
  "EX-01": advisoryGateCase ? ["Customer-facing services", "Revenue-generating services"] : [],
  "EX-02": "1-4 hours", "EX-03": "1-4 hours", "EX-04": "15-60 minutes",
  "EX-05": "Yes, current and validated", "EX-06": "Likely, but not recently tested", "EX-07": "1-2 years ago",
  "EX-08": "Potentially", "EX-09": "Immutable but restore not proven", "EX-10": "Yes, with no viable alternative",
  "EX-11": "High concentration", "EX-12": "Critical SPOFs exist", "EX-13": "Partially", "EX-14": "Partially",
  "EX-15": "Yes, periodic review", "EX-16": "Technical tests only", "EX-17": "No", "EX-18": ["AWS"],
  "EX-19": "Unknown", "EX-20": "Medium — documented but not fully tested",
  "AF-BIA-01": "1-4 hours",
  "AF-BIA-02": ["People", "Process", "Application", "Data"],
  "AF-BIA-03": ["Revenue loss", "Customer harm"],
  "AF-BIA-04": ["Identity", "Network"],
  "AF-DR-01": "1-4 hours", "AF-DR-02": "15-60 minutes",
  "AF-DR-03": ["Application failover", "Database recovery", "Data restore", "Business validation"],
  "AF-DR-04": "No", "AF-DR-05": "Fully orchestrated", "AF-DR-06": ["None known"],
  "AF-CY-01": "No", "AF-CY-02": "Automated validation", "AF-CY-03": "Yes, tested",
  "AF-CY-04": "Yes, successfully", "AF-CY-05": "Known-good immutable points with validation",
  "AF-TP-01": ["RTO", "RPO", "Availability", "Incident notification"],
  "AF-TP-02": "Low — viable alternative", "AF-TP-03": "Within impact tolerance", "AF-TP-04": "Independent validation",
  "AF-CL-01": ["Availability Zone", "Region"], "AF-CL-02": ["None known"], "AF-CL-03": "No", "AF-CL-04": "Yes, tested",
  "AF-OP-01": "Yes, tested", "AF-OP-02": "Yes, tested", "AF-OP-03": "Yes, automated",
  "AF-TS-01": ["No blocker"], "AF-TS-02": "Yes", "AF-TS-03": "Automatically/continuously",
  "AF-GV-01": "Named business owner with technology counterpart", "AF-GV-02": "Formal approval and expiry",
  "AF-GV-03": ["Business impact and risk reduction"]
};
const advisoryLifecycle = evaluateResilienceIq(advisoryLifecycleAnswers);
if (advisoryLifecycle.status !== "ready") throw new Error("Completing triggered advisory questions should release the advisory-depth gate");
if (!advisoryLifecycle.preferredPattern) throw new Error("Completed advisory lifecycle should produce a preferred recovery strategy");
if (!advisoryLifecycle.blueprint) throw new Error("Completed advisory lifecycle should produce a target-state blueprint");

if (advisoryLifecycle.executiveReport.postureScore !== advisoryLifecycle.postureScore) throw new Error("Executive report posture score must match runtime posture score");
if (advisoryLifecycle.executiveReport.preferredPattern !== undefined && advisoryLifecycle.executiveReport.recoveryStrategy.preferred !== advisoryLifecycle.preferredPattern) throw new Error("Executive report preferred strategy must match runtime");
if (advisoryLifecycle.executiveReport.recoveryStrategy.preferred !== advisoryLifecycle.preferredPattern) throw new Error("Recovery strategy report must match runtime preferred pattern");
if (advisoryLifecycle.executiveReport.targetState !== advisoryLifecycle.blueprint) throw new Error("Executive report target state must match runtime blueprint");
if (advisoryLifecycle.executiveReport.recommendationConfidence.level !== advisoryLifecycle.recommendationConfidence.level) throw new Error("Executive report recommendation confidence must match runtime");
if (advisoryLifecycle.executiveReport.evidenceRegister.length !== advisoryLifecycle.evidenceRegister.length) throw new Error("Executive report evidence register must match runtime evidence register");
if (advisoryLifecycle.evidenceRegister.some(x => !x.id || !x.type || !x.validationCriteria?.length)) throw new Error("Evidence register items must include typed validation criteria");
if (new Set(advisoryLifecycle.evidenceRegister.map(x => x.id)).size !== advisoryLifecycle.evidenceRegister.length) throw new Error("Evidence register IDs must be unique");
if (advisoryLifecycle.executiveReport.roadmap.length !== advisoryLifecycle.roadmap.length) throw new Error("Executive report roadmap must match runtime roadmap");
if (advisoryLifecycle.executiveReport.recoveryStrategy.alternatives.map(x => x.id).join(",") !== advisoryLifecycle.alternatives.map(x => x.id).join(",")) throw new Error("Executive report alternatives must match runtime alternatives");

if (advisoryGateCase.executiveReport.recoveryStrategy.preferred !== null) throw new Error("Blocked assessment report must not expose a recovery strategy");
if (advisoryGateCase.executiveReport.targetState !== null) throw new Error("Blocked assessment report must not expose target state");
if (advisoryGateCase.executiveReport.advisoryStatus !== "requirements_incomplete") throw new Error("Blocked assessment report must expose incomplete advisory status");
if (advisoryGateCase.executiveReport.recommendationConfidence.level !== "Blocked") throw new Error("Blocked assessment must expose blocked recommendation confidence");

if (advisoryGateCase.executiveReport.postureScore !== null) throw new Error("Blocked assessment report should not expose a final posture score");
if (advisoryGateCase.executiveReport.rating !== null) throw new Error("Blocked assessment report should not expose a final rating");
if (advisoryGateCase.executiveReport.criticalExposure !== null) throw new Error("Blocked assessment report should not expose final critical exposure");
if (advisoryLifecycle.executiveReport.postureScore !== advisoryLifecycle.postureScore) throw new Error("Completed report posture score must match runtime");




console.log("Resilience IQ knowledge-driven runtime tests passed");


// Posture score 53 must map to maturity level 2 (Documented), not Reactive.
