import type { ActivityStore, AssessmentActivity } from './activity-store.mjs';
export function setActivityStore(store: Pick<ActivityStore, 'recordLogin' | 'recordAssessment' | 'removeAssessment'> | null): void;
export function recordLogin(email: string): Promise<void>;
export function recordAssessment(email: string, activity: AssessmentActivity): Promise<void>;
export function removeAssessmentActivity(email: string, accelerator: string, assessmentId: string): Promise<void>;
