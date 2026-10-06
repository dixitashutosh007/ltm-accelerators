import { RESILIENCE_IQ_VERSION, type ResilienceIqVersionManifest } from "./version";
import type { ResilienceAnswers, ResilienceResult } from "./runtime";

export interface ResilienceAssessmentSnapshot {
  assessmentId: string;
  status: "draft" | "in_progress" | "completed" | "archived";
  clientName: string;
  clientSector?: string;
  respondentEmail: string;
  version: ResilienceIqVersionManifest;
  answers: ResilienceAnswers;
  result?: ResilienceResult;
  startedAt: string;
  completedAt?: string;
  finalizedAt?: string;
}

export function buildResilienceAssessmentSnapshot(input: {
  assessmentId: string;
  status: ResilienceAssessmentSnapshot["status"];
  clientName: string;
  clientSector?: string;
  respondentEmail: string;
  answers: ResilienceAnswers;
  result?: ResilienceResult;
  startedAt: string;
  completedAt?: string;
  finalizedAt?: string;
}): ResilienceAssessmentSnapshot {
  return {
    ...input,
    version: input.result?.version ?? RESILIENCE_IQ_VERSION,
    answers: structuredClone(input.answers),
    result: input.result ? structuredClone(input.result) : undefined
  };
}
