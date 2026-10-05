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


console.log("Resilience IQ knowledge-driven runtime tests passed");


// Posture score 53 must map to maturity level 2 (Documented), not Reactive.
