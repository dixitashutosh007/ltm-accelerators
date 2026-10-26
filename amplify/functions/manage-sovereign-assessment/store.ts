/**
 * Where Sovereign IQ assessments are kept: the SovereignIqAssessment model in Amplify Data in production; the local
 * dev server and the tests use the in-memory store shared with FinOps IQ, behind the same interface.
 */
import { graphql } from '../_shared/resilience-data';
import { isLive, newestFirst, memoryStore as sharedMemoryStore, type FinOpsAssessmentRecord } from '../manage-finops-assessment/store';

export type SovereignAssessmentRecord = Omit<FinOpsAssessmentRecord, 'clientLogo'> & {
  /** The consultant's per-engagement AI narrative switch (PLAN S9); off when absent. */
  aiEnabled?: boolean | null;
  /** The last narrative run (NarrativeResult plus the redacted focus), JSON. */
  narrativeJson?: string | null;
};

export interface SovereignAssessmentStore {
  get(assessmentId: string): Promise<SovereignAssessmentRecord | null>;
  /** Newest first. */
  listByRespondent(email: string): Promise<SovereignAssessmentRecord[]>;
  create(record: SovereignAssessmentRecord): Promise<SovereignAssessmentRecord>;
  update(record: Partial<SovereignAssessmentRecord> & { assessmentId: string }): Promise<SovereignAssessmentRecord>;
  /** Permanent deletion, at the client's request. */
  delete(assessmentId: string): Promise<void>;
}

export const SUMMARY_FIELDS = 'assessmentId clientName clientSector respondentEmail status mode engineVersion startedAt completedAt archivedAt expiresAt createdAt updatedAt';
export const FIELDS = `${SUMMARY_FIELDS} requestJson consultantNotes resultJson aiEnabled narrativeJson`;
const PAGE_SIZE = 200, MAX_PAGES = 50;

export const appSyncStore: SovereignAssessmentStore = {
  async get(assessmentId) {
    const data = await graphql(`query GetSovereignIqAssessment($assessmentId: String!) { getSovereignIqAssessment(assessmentId:$assessmentId) { ${FIELDS} } }`, { assessmentId });
    return isLive(data.getSovereignIqAssessment) ? data.getSovereignIqAssessment : null;
  },
  async listByRespondent(email) {
    const items: SovereignAssessmentRecord[] = [];
    let nextToken: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: any = await graphql(`query ListSovereignIqAssessments($filter: ModelSovereignIqAssessmentFilterInput, $limit: Int, $nextToken: String) {
        listSovereignIqAssessments(filter:$filter, limit:$limit, nextToken:$nextToken) { items { ${SUMMARY_FIELDS} } nextToken }
      }`, { filter: { respondentEmail: { eq: email } }, limit: PAGE_SIZE, nextToken });
      items.push(...(data.listSovereignIqAssessments.items || []));
      nextToken = data.listSovereignIqAssessments.nextToken || null;
      if (!nextToken) break;
    }
    return newestFirst(items.filter(r => isLive(r)));
  },
  async create(record) {
    const data = await graphql(`mutation CreateSovereignIqAssessment($input: CreateSovereignIqAssessmentInput!) { createSovereignIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.createSovereignIqAssessment;
  },
  async update(record) {
    const data = await graphql(`mutation UpdateSovereignIqAssessment($input: UpdateSovereignIqAssessmentInput!) { updateSovereignIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.updateSovereignIqAssessment;
  },
  async delete(assessmentId) {
    await graphql(`mutation DeleteSovereignIqAssessment($input: DeleteSovereignIqAssessmentInput!) { deleteSovereignIqAssessment(input:$input) { assessmentId } }`, { input: { assessmentId } });
  }
};

export const memoryStore = sharedMemoryStore as unknown as (persist?: { load: () => SovereignAssessmentRecord[]; save: (items: SovereignAssessmentRecord[]) => void }) => SovereignAssessmentStore;
