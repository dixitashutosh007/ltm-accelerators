import {
  assertAssessmentStatusTransition,
  assessmentStatusTransitions,
  canTransitionAssessmentStatus,
  isAssessmentFinal
} from "./assessment-lifecycle";

const expected: Record<string, string[]> = {
  draft: ["draft", "in_progress", "archived"],
  in_progress: ["in_progress", "completed", "archived"],
  completed: ["completed", "archived"],
  archived: ["archived"]
};

if (JSON.stringify(assessmentStatusTransitions()) !== JSON.stringify(expected)) {
  throw new Error("Assessment lifecycle must match the governed contract");
}

for (const [from, targets] of Object.entries(expected)) {
  for (const to of targets) {
    if (!canTransitionAssessmentStatus(from as any, to as any)) {
      throw new Error(`Expected allowed assessment transition: ${from} -> ${to}`);
    }
    assertAssessmentStatusTransition(from as any, to as any);
  }
}

for (const [from, to] of [
  ["draft", "completed"],
  ["completed", "in_progress"],
  ["completed", "draft"],
  ["archived", "completed"]
]) {
  if (canTransitionAssessmentStatus(from as any, to as any)) {
    throw new Error(`Forbidden assessment transition accepted: ${from} -> ${to}`);
  }
}

if (!isAssessmentFinal("completed") || !isAssessmentFinal("archived")) {
  throw new Error("Completed and archived assessments must be final");
}
if (isAssessmentFinal("draft") || isAssessmentFinal("in_progress")) {
  throw new Error("Draft and in-progress assessments must remain mutable");
}

console.log("Resilience IQ assessment lifecycle tests passed");
