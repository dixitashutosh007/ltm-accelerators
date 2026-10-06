export type ResilienceEvidenceStatus =
  | "not_requested"
  | "requested"
  | "provided"
  | "validated"
  | "rejected";

const transitions: Record<ResilienceEvidenceStatus, readonly ResilienceEvidenceStatus[]> = {
  not_requested: ["requested"],
  requested: ["provided", "rejected"],
  provided: ["validated", "rejected"],
  validated: ["validated"],
  rejected: ["requested", "rejected"]
};

export function canTransitionEvidenceStatus(
  from: ResilienceEvidenceStatus,
  to: ResilienceEvidenceStatus
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertEvidenceStatusTransition(
  from: ResilienceEvidenceStatus,
  to: ResilienceEvidenceStatus
): void {
  if (!canTransitionEvidenceStatus(from, to)) {
    throw new Error(`Invalid evidence status transition: ${from} -> ${to}`);
  }
}

export function evidenceStatusTransitions(): Record<ResilienceEvidenceStatus, readonly ResilienceEvidenceStatus[]> {
  return Object.fromEntries(
    Object.entries(transitions).map(([status, next]) => [status, [...next]])
  ) as Record<ResilienceEvidenceStatus, readonly ResilienceEvidenceStatus[]>;
}
