import { buildResilienceAssessmentSnapshot } from "./assessment-persistence";
import { evaluateResilienceIq } from "./runtime";

const answers: any = {
  "EX-01": ["Revenue-generating services"],
  "EX-02": "1-4 hours",
  "EX-03": "1-4 hours",
  "EX-04": "15-60 minutes",
  "EX-05": {
    Applications: "Validated",
    Data: "Validated",
    Infrastructure: "Validated",
    People: "Validated",
    "Third parties": "Validated"
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
  "EX-20": "High — independently validated"
};

const result = evaluateResilienceIq(answers);
const snapshot = buildResilienceAssessmentSnapshot({
  assessmentId: "RIQ-TEST-001",
  status: "completed",
  clientName: "Test Client",
  respondentEmail: "test@example.com",
  answers,
  result,
  startedAt: "2026-10-05T00:00:00.000Z",
  completedAt: "2026-10-05T00:10:00.000Z",
  finalizedAt: "2026-10-05T00:10:01.000Z"
});

if (snapshot.version.engine !== result.version.engine) throw new Error("Snapshot must preserve engine version");
if (snapshot.version.questionBank !== result.version.questionBank) throw new Error("Snapshot must preserve question-bank version");
if (snapshot.answers === answers) throw new Error("Snapshot answers must be cloned");
if (snapshot.result === result) throw new Error("Snapshot result must be cloned");
if (snapshot.status !== "completed") throw new Error("Snapshot status must be retained");

answers["EX-02"] = "Unknown";
if (snapshot.answers["EX-02"] !== "1-4 hours") throw new Error("Snapshot must be immutable from caller mutations");

console.log("Resilience IQ assessment snapshot tests passed");
