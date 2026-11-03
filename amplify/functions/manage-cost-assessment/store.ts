/**
 * Where Cost IQ assessments are kept: the CostIqAssessment model in Amplify Data in production; the local dev server and
 * the tests use the in-memory store behind the same interface. Only this service reads or writes the model (CQ1): the
 * browser no longer calls the Data API, so ownership is enforced here, not by group rules.
 */
import { graphql } from '../_shared/resilience-data';

export interface CostIqAssessmentRecord {
  assessmentId: string;
  acceleratorId: string;
  releaseId: string;
  methodologyVersion: string;
  status: string;
  /** From the caller's token. Records saved before CQ1 have none and are visible to Admins only. */
  respondentEmail?: string | null;
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
  /** Epoch seconds 24 months after the last change; DynamoDB time to live deletes the record then. */
  expiresAt?: number | null;
}

export interface CostIqAssessmentStore {
  get(assessmentId: string): Promise<CostIqAssessmentRecord | null>;
  /** Newest first, without answers and result. */
  listByRespondent(email: string): Promise<CostIqAssessmentRecord[]>;
  create(record: CostIqAssessmentRecord): Promise<CostIqAssessmentRecord>;
  update(record: Partial<CostIqAssessmentRecord> & { assessmentId: string }): Promise<CostIqAssessmentRecord>;
  delete(assessmentId: string): Promise<void>;
}

export const SUMMARY_FIELDS = 'assessmentId acceleratorId releaseId methodologyVersion status respondentEmail clientName clientSector clientCurrency startedAt updatedAt completedAt expiresAt resultJson';
export const FIELDS = `${SUMMARY_FIELDS} selectedAreasJson answersJson subjectiveJson`;
const PAGE_SIZE = 200, MAX_PAGES = 50;

/** TTL deletes within days, not at once: a record past expiresAt counts as already deleted. */
export const isLive = (r: CostIqAssessmentRecord | null | undefined, now = Date.now()): r is CostIqAssessmentRecord =>
  !!r && (r.expiresAt == null || r.expiresAt * 1000 > now);
export const newestFirst = (items: CostIqAssessmentRecord[]) =>
  [...items].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

export const appSyncStore: CostIqAssessmentStore = {
  async get(assessmentId) {
    const data = await graphql(`query GetCostIqAssessment($assessmentId: String!) { getCostIqAssessment(assessmentId:$assessmentId) { ${FIELDS} } }`, { assessmentId });
    return isLive(data.getCostIqAssessment) ? data.getCostIqAssessment : null;
  },
  async listByRespondent(email) {
    const items: CostIqAssessmentRecord[] = [];
    let nextToken: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: any = await graphql(`query ListCostIqAssessments($filter: ModelCostIqAssessmentFilterInput, $limit: Int, $nextToken: String) {
        listCostIqAssessments(filter:$filter, limit:$limit, nextToken:$nextToken) { items { ${SUMMARY_FIELDS} } nextToken }
      }`, { filter: { respondentEmail: { eq: email } }, limit: PAGE_SIZE, nextToken });
      items.push(...(data.listCostIqAssessments.items || []));
      nextToken = data.listCostIqAssessments.nextToken || null;
      if (!nextToken) break;
    }
    return newestFirst(items.filter(r => isLive(r)));
  },
  async create(record) {
    const data = await graphql(`mutation CreateCostIqAssessment($input: CreateCostIqAssessmentInput!) { createCostIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.createCostIqAssessment;
  },
  async update(record) {
    const data = await graphql(`mutation UpdateCostIqAssessment($input: UpdateCostIqAssessmentInput!) { updateCostIqAssessment(input:$input) { ${FIELDS} } }`, { input: record });
    return data.updateCostIqAssessment;
  },
  async delete(assessmentId) {
    await graphql(`mutation DeleteCostIqAssessment($input: DeleteCostIqAssessmentInput!) { deleteCostIqAssessment(input:$input) { assessmentId } }`, { input: { assessmentId } });
  }
};

/** An in-memory store for tests and the local dev server, optionally backed by a JSON file. */
export function memoryStore(persist?: { load: () => CostIqAssessmentRecord[]; save: (items: CostIqAssessmentRecord[]) => void }): CostIqAssessmentStore {
  const items = new Map<string, CostIqAssessmentRecord>((persist?.load() ?? []).map(r => [r.assessmentId, r]));
  const save = () => persist?.save([...items.values()]);
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    async get(id) { const r = items.get(id); return isLive(r) ? copy(r) : null; },
    async listByRespondent(email) {
      return newestFirst([...items.values()].filter(r => r.respondentEmail === email && isLive(r)))
        .map(({ answersJson, selectedAreasJson, subjectiveJson, ...rest }) => copy(rest) as CostIqAssessmentRecord);
    },
    async create(record) {
      if (items.has(record.assessmentId)) throw new Error('conditional check failed: record exists');
      items.set(record.assessmentId, copy(record)); save(); return copy(record);
    },
    async update(record) {
      const existing = items.get(record.assessmentId);
      if (!existing) throw new Error('conditional check failed: no record');
      const r = { ...existing, ...record };
      items.set(r.assessmentId, r); save(); return copy(r);
    },
    async delete(id) {
      if (!items.delete(id)) throw new Error('conditional check failed: no record');
      save();
    }
  };
}
