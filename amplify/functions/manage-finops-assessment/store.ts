/**
 * Where FinOps IQ assessments are kept. Production uses the FinOpsIqAssessment model in Amplify Data; the local
 * dev server (scripts/dev-server.ts) and the tests use their own stores behind the same interface.
 */
import { graphql } from '../_shared/resilience-data';

export interface FinOpsAssessmentRecord {
  assessmentId: string;
  clientName: string;
  clientSector?: string | null;
  respondentEmail: string;
  status: string;
  mode: string;
  engineVersion: string;
  requestJson: string;
  consultantNotes?: string | null;
  clientLogo?: string | null;
  resultJson?: string | null;
  startedAt: string;
  completedAt?: string | null;
  archivedAt?: string | null;
  /** Epoch seconds after which DynamoDB time to live deletes the record (retention, M6). */
  expiresAt?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinOpsAssessmentStore {
  get(assessmentId: string): Promise<FinOpsAssessmentRecord | null>;
  /** Newest first. */
  listByRespondent(email: string): Promise<FinOpsAssessmentRecord[]>;
  create(record: FinOpsAssessmentRecord): Promise<FinOpsAssessmentRecord>;
  update(record: Partial<FinOpsAssessmentRecord> & { assessmentId: string }): Promise<FinOpsAssessmentRecord>;
  /** Permanent deletion, at the client's request (M6). */
  delete(assessmentId: string): Promise<void>;
}

/** The list view leaves out the request, notes and result, which can be large. */
export const SUMMARY_FIELDS = 'assessmentId clientName clientSector respondentEmail status mode engineVersion startedAt completedAt archivedAt expiresAt createdAt updatedAt';
export const FIELDS = `${SUMMARY_FIELDS} requestJson consultantNotes clientLogo resultJson`;

/**
 * DynamoDB time to live deletes an expired record within days, not at once, and reads return it until then: the stores
 * treat a record past expiresAt as already deleted, so retention holds from the day it falls due.
 */
export const isLive = (r: FinOpsAssessmentRecord | null | undefined, now = Date.now()): r is FinOpsAssessmentRecord =>
  !!r && (r.expiresAt == null || r.expiresAt * 1000 > now);

// AppSync list queries filter after reading a page: follow nextToken. MAX_PAGES bounds the work per request.
const PAGE_SIZE = 200, MAX_PAGES = 50;

export const appSyncStore: FinOpsAssessmentStore = {
  async get(assessmentId) {
    const data = await graphql(`query GetFinOpsIqAssessment($assessmentId: String!) { getFinOpsIqAssessment(assessmentId:$assessmentId) { ${FIELDS} } }`, { assessmentId });
    return isLive(data.getFinOpsIqAssessment) ? data.getFinOpsIqAssessment : null;
  },
  async listByRespondent(email) {
    const items: FinOpsAssessmentRecord[] = [];
    let nextToken: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: any = await graphql(`query ListFinOpsIqAssessments($filter: ModelFinOpsIqAssessmentFilterInput, $limit: Int, $nextToken: String) {
        listFinOpsIqAssessments(filter:$filter, limit:$limit, nextToken:$nextToken) { items { ${SUMMARY_FIELDS} } nextToken }
      }`, { filter: { respondentEmail: { eq: email } }, limit: PAGE_SIZE, nextToken });
      items.push(...(data.listFinOpsIqAssessments.items || []));
      nextToken = data.listFinOpsIqAssessments.nextToken || null;
      if (!nextToken) break;
    }
    return newestFirst(items.filter(r => isLive(r)));
  },
  async create(record) {
    const data = await graphql(`mutation CreateFinOpsIqAssessment($input: CreateFinOpsIqAssessmentInput!) { createFinOpsIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.createFinOpsIqAssessment;
  },
  async update(record) {
    const data = await graphql(`mutation UpdateFinOpsIqAssessment($input: UpdateFinOpsIqAssessmentInput!) { updateFinOpsIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.updateFinOpsIqAssessment;
  },
  async delete(assessmentId) {
    await graphql(`mutation DeleteFinOpsIqAssessment($input: DeleteFinOpsIqAssessmentInput!) { deleteFinOpsIqAssessment(input:$input) { assessmentId } }`, { input: { assessmentId } });
  }
};

export const newestFirst = (items: FinOpsAssessmentRecord[]) =>
  [...items].sort((a, b) => String(b.updatedAt || b.startedAt || '').localeCompare(String(a.updatedAt || a.startedAt || '')));

/** An in-memory store for tests and the local dev server, optionally backed by a JSON file. */
export function memoryStore(persist?: { load: () => FinOpsAssessmentRecord[]; save: (items: FinOpsAssessmentRecord[]) => void }): FinOpsAssessmentStore {
  const items = new Map<string, FinOpsAssessmentRecord>((persist?.load() ?? []).map(r => [r.assessmentId, r]));
  const save = () => persist?.save([...items.values()]);
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    async get(id) { const r = items.get(id); return isLive(r) ? copy(r) : null; },
    async listByRespondent(email) { return newestFirst([...items.values()].filter(r => r.respondentEmail === email && isLive(r))).map(copy); },
    async create(record) {
      if (items.has(record.assessmentId)) throw new Error('conditional check failed: record exists');
      const now = new Date().toISOString();
      const r = { ...record, createdAt: now, updatedAt: now };
      items.set(r.assessmentId, r); save(); return copy(r);
    },
    async update(record) {
      const existing = items.get(record.assessmentId);
      if (!existing) throw new Error('conditional check failed: no record');
      const r = { ...existing, ...record, updatedAt: new Date().toISOString() };
      items.set(r.assessmentId, r); save(); return copy(r);
    },
    async delete(id) {
      if (!items.delete(id)) throw new Error('conditional check failed: no record');
      save();
    }
  };
}
