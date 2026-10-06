import type { ResilienceEvidenceStatus } from '../../../packages/engine-core/src/accelerators/resilience-iq/evidence-lifecycle';

export interface ResilienceEvidenceRecord {
  assessmentId: string;
  evidenceId: string;
  status: ResilienceEvidenceStatus;
  evidenceLocation?: string | null;
  validationOutcome?: string | null;
  submittedBy?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
}

export interface ResilienceEvidenceRepository {
  get(assessmentId: string, evidenceId: string): Promise<ResilienceEvidenceRecord | null>;
  transition(record: ResilienceEvidenceRecord, next: ResilienceEvidenceRecord): Promise<ResilienceEvidenceRecord>;
}

/**
 * Production wiring must provide an authenticated Amplify Data/AppSync
 * implementation. The HTTP handler deliberately does not invent persistence
 * when no repository has been configured.
 */
export function requireEvidenceRepository(): ResilienceEvidenceRepository {
  throw new Error('Resilience evidence repository is not configured.');
}
