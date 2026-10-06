export interface CostIqAssessmentRecord {
  assessmentId: string;
  acceleratorId: string;
  releaseId: string;
  methodologyVersion: string;
  status: string;
  clientName?: string | null;
  clientSector?: string | null;
  clientCurrency?: string | null;
  selectedAreasJson: string;
  answersJson: string;
  subjectiveJson?: string | null;
  resultJson?: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface CostIqAssessmentRepository {
  create(record: CostIqAssessmentRecord): Promise<CostIqAssessmentRecord>;
  update(record: CostIqAssessmentRecord): Promise<CostIqAssessmentRecord>;
  get(assessmentId: string): Promise<CostIqAssessmentRecord | null>;
  list(): Promise<CostIqAssessmentRecord[]>;
}

/**
 * Production wiring must provide an authenticated Amplify Data/AppSync
 * implementation. The API layer must not silently fall back to in-memory
 * persistence.
 */
export function requireCostIqAssessmentRepository(): CostIqAssessmentRepository {
  throw new Error('Cost IQ assessment repository is not configured.');
}
