export function evaluateCostIq(input?: {
  answers?: Record<string, unknown>;
  scope?: Record<string, unknown> | null;
  capabilityScores?: Record<string, number>;
  evidence?: Record<string, unknown>;
  feasibilityEvidence?: Record<string, unknown>;
  options?: Record<string, unknown>;
}): Record<string, unknown>;
export function metadata(): Record<string, unknown>;
export function questions(): Record<string, unknown>;
export function orchestrate(input?: {
  answers?: Record<string, unknown>;
  options?: Record<string, unknown>;
}): Record<string, unknown>;
export const RELEASE_MANIFEST: Record<string, unknown>;
