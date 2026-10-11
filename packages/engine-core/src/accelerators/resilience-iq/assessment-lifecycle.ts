export type ResilienceAssessmentStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "archived";

const transitions: Record<ResilienceAssessmentStatus, readonly ResilienceAssessmentStatus[]> = {
  draft: ["draft", "in_progress", "archived"],
  in_progress: ["in_progress", "completed", "archived"],
  completed: ["completed", "archived"],
  archived: ["archived"]
};

export function canTransitionAssessmentStatus(
  from: ResilienceAssessmentStatus,
  to: ResilienceAssessmentStatus
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertAssessmentStatusTransition(
  from: ResilienceAssessmentStatus,
  to: ResilienceAssessmentStatus
): void {
  if (!canTransitionAssessmentStatus(from, to)) {
    throw new Error(`Invalid assessment status transition: ${from} -> ${to}`);
  }
}

export function isAssessmentFinal(status: ResilienceAssessmentStatus): boolean {
  return status === "completed" || status === "archived";
}

export function assessmentStatusTransitions(): Record<ResilienceAssessmentStatus, readonly ResilienceAssessmentStatus[]> {
  return Object.fromEntries(
    Object.entries(transitions).map(([status, next]) => [status, [...next]])
  ) as unknown as Record<ResilienceAssessmentStatus, readonly ResilienceAssessmentStatus[]>;
}
