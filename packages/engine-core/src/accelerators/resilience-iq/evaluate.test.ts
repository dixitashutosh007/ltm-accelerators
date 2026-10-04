import { evaluateResilienceIq } from "./evaluate";
const incomplete = evaluateResilienceIq({"EX-03":"Unknown","EX-04":"Unknown"});
if (incomplete.status !== "requirements_incomplete") throw new Error("Missing objectives must block recommendation");
const result = evaluateResilienceIq({"EX-03":"15-60 minutes","EX-04":"<15 minutes","EX-07":">2 years ago","EX-09":"Immutable but restore not proven"});
if (result.status !== "ready") throw new Error("Expected ready result");
if (!result.eliminatedPatterns.includes("DR-01")) throw new Error("DR-01 should be eliminated");
console.log("Resilience IQ runtime tests passed");
