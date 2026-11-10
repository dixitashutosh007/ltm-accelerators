export const RETENTION_DAYS: number;
export const USER_COLUMNS: string[];
export const ASSESSMENT_COLUMNS: string[];
export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string;
export interface AssessmentActivity { accelerator: string; assessmentId: string; status: string; clientName?: string | null; stage?: string | null; percent?: number | null; startedAt?: string | null; completedAt?: string | null }
export interface AssessmentActivityRecord extends AssessmentActivity { clientName: string | null; lastSavedAt: string; stage: string | null; percent: number | null; startedAt: string; completedAt: string | null }
export interface UserActivitySummary {
  email: string; firstLoginAt: string | null; lastLoginAt: string | null; loginCount: number;
  assessments: { total: number; completed: number; inProgress: number; archived: number }; lastAssessmentAt: string | null;
}
export interface UserActivityDetail { email: string; firstLoginAt: string | null; lastLoginAt: string | null; loginCount: number; logins: string[]; assessments: AssessmentActivityRecord[] }
export interface ActivityStore {
  recordLogin(email: string): Promise<void>;
  recordAssessment(email: string, activity: AssessmentActivity): Promise<void>;
  removeAssessment(email: string, accelerator: string, assessmentId: string): Promise<void>;
  backfillAssessment(email: string, activity: AssessmentActivity & { lastSavedAt?: string | null }): Promise<boolean>;
  listAssessments(): Promise<Array<AssessmentActivityRecord & { email: string }>>;
  listUsers(): Promise<UserActivitySummary[]>;
  userDetail(email: string): Promise<UserActivityDetail>;
}
export function createActivityStore(deps: { table: string; ddb: { send(command: unknown): Promise<any> }; now?: () => number }): ActivityStore;
