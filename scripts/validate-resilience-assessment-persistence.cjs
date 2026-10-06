const fs = require("fs");
const path = require("path");

const root = path.resolve("resilience-iq/knowledge");
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
