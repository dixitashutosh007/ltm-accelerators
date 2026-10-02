// Amplify/Lambda-facing Cost IQ adapter.
// The executable methodology remains maintained in the canonical Cost IQ
// reconstruction repo; this adapter is intentionally thin and should not
// duplicate scoring or finding logic.

export type CostIqEvaluationInput = {
  answers?: Record<string, unknown>;
  scope?: Record<string, unknown> | null;
  capabilityScores?: Record<string, number>;
  evidence?: Record<string, unknown>;
  feasibilityEvidence?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

export type CostIqEvaluationResult = Record<string, unknown>;

export async function evaluateCostIq(input: CostIqEvaluationInput = {}): Promise<CostIqEvaluationResult> {
  // Build artifact placeholder. The Amplify deployment pipeline must replace
  // this adapter with the compiled Cost IQ v10 engine bundle from the
  // approved ltm-core commit before production deployment.
  throw new Error('cost_iq_engine_bundle_not_attached');
}
