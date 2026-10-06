const fs = require("fs");
const path = require("path");

const root = path.resolve("resilience-iq/knowledge");
const backendPath = path.resolve("amplify/backend.ts");
const handlerPath = path.resolve("amplify/functions/manage-resilience-assessment/handler.ts");
const file = path.join(root, "assessment-persistence.json");
const contract = JSON.parse(fs.readFileSync(file, "utf8"));

const statuses = new Set(contract.status_values);
for (const [from, targets] of Object.entries(contract.lifecycle)) {
  if (!statuses.has(from)) throw new Error(`Unknown assessment lifecycle status: ${from}`);
  if (!Array.isArray(targets) || targets.some(target => !statuses.has(target))) {
    throw new Error(`Invalid lifecycle transitions for ${from}`);
  }
}

for (const field of contract.required_snapshot_fields) {
  if (typeof field !== "string" || !field) throw new Error("Invalid required snapshot field");
}
for (const field of contract.final_snapshot_fields) {
  if (typeof field !== "string" || !field) throw new Error("Invalid final snapshot field");
}

if (contract.security.public_persistence !== false) {
  throw new Error("Resilience assessment persistence must never be public");
}
if (!Array.isArray(contract.security.allowed_groups) ||
    !contract.security.allowed_groups.includes("Admin") ||
    !contract.security.allowed_groups.includes("Consultant")) {
  throw new Error("Resilience assessment persistence must be restricted to Admin/Consultant groups");
}

console.log("Resilience IQ assessment persistence contract passed");

const backend = fs.readFileSync(backendPath, "utf8");
const handler = fs.readFileSync(handlerPath, "utf8");
if (!backend.includes("manageResilienceAssessmentFunction")) throw new Error("Assessment persistence function is not registered.");
if (!backend.includes("/api/resilience-iq/assessment")) throw new Error("Assessment persistence route is not registered.");
if (!backend.includes("HttpUserPoolAuthorizer")) throw new Error("Assessment persistence route must use Cognito authorization.");
if (!handler.includes("assessment_immutable")) throw new Error("Assessment persistence handler must enforce immutability.");
if (!handler.includes("respondent_email_mismatch")) throw new Error("Assessment persistence handler must enforce respondent ownership.");
if (!handler.includes("createResilienceAssessment") || !handler.includes("updateResilienceAssessment")) throw new Error("Assessment persistence handler must support create and update.");
console.log("Resilience IQ assessment persistence deployment contract passed.");
