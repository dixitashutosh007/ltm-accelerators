export type ResilienceAnswers = Record<string, unknown>;
export interface ResilienceResult { status: "ready"|"requirements_incomplete"; score: number|null; preferredPattern: string|null; eliminatedPatterns: string[]; gaps: string[]; }
const minutes: Record<string, number|null> = {"Near-zero":0,"<15 minutes":10,"15-60 minutes":45,"1-4 hours":120,"4-24 hours":720,">24 hours":1440,"Unknown":null};
const value = (v: unknown) => typeof v === "string" ? v : null;
export function evaluateResilienceIq(a: ResilienceAnswers): ResilienceResult {
 const rto = minutes[value(a["EX-03"]) || "Unknown"] ?? null;
 const rpo = minutes[value(a["EX-04"]) || "Unknown"] ?? null;
 const gaps: string[] = [];
 if (rto === null || rpo === null) gaps.push("Undefined business recovery requirement");
 if (["Never",">2 years ago","Unknown"].includes(value(a["EX-07"]) || "")) gaps.push("Recovery not recently tested");
 if (["No","Unknown"].includes(value(a["EX-09"]) || "")) gaps.push("Critical backup/restore gap");
 const eliminated: string[] = [];
 if (rto !== null && rto < 60) eliminated.push("DR-01");
 if (rto !== null && rto < 15) eliminated.push("DR-02");
 if (rpo !== null && rpo <= 15 && !eliminated.includes("DR-01")) eliminated.push("DR-01");
 if (rto === null || rpo === null) return {status:"requirements_incomplete",score:null,preferredPattern:null,eliminatedPatterns:eliminated,gaps};
 const candidates = ["DR-01","DR-02","DR-03","DR-04","DR-05"].filter(x => !eliminated.includes(x));
 const preferred = candidates[0] || null;
 return {status:"ready",score:Math.max(0,70-gaps.length*5),preferredPattern:preferred,eliminatedPatterns:eliminated,gaps};
}
