/**
 * Where saved sessions of the browser-only accelerators are kept (platform workstream P3): the SavedSession model in
 * Amplify Data in production; the local dev server and the tests use the in-memory store behind the same interface.
 * One record per session, keyed by sessionId, with the accelerator beside it, so every accelerator shares the service.
 */
import { graphql } from '../_shared/resilience-data';

export interface SavedSessionRecord {
  sessionId: string;
  accelerator: string;
  ownerEmail: string;
  /** What the owner sees in "My sessions", for example the client name. */
  title: string;
  status: string;
  stage?: string | null;
  percent?: number | null;
  /** The accelerator's own snapshot, JSON. Opaque to the service. */
  payloadJson: string;
  /** Epoch seconds after which DynamoDB time to live deletes the record (24 months after the last save). */
  expiresAt?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedSessionStore {
  get(sessionId: string): Promise<SavedSessionRecord | null>;
  /** The owner's sessions for one accelerator, newest first, without the payload. */
  listByOwner(email: string, accelerator: string): Promise<SavedSessionRecord[]>;
  create(record: SavedSessionRecord): Promise<SavedSessionRecord>;
  update(record: Partial<SavedSessionRecord> & { sessionId: string }): Promise<SavedSessionRecord>;
  delete(sessionId: string): Promise<void>;
}

export const SUMMARY_FIELDS = 'sessionId accelerator ownerEmail title status stage percent expiresAt createdAt updatedAt';
export const FIELDS = `${SUMMARY_FIELDS} payloadJson`;
const PAGE_SIZE = 200, MAX_PAGES = 50;

/** TTL deletes within days, not at once: a record past expiresAt counts as already deleted. */
export const isLive = (r: SavedSessionRecord | null | undefined, now = Date.now()): r is SavedSessionRecord =>
  !!r && (r.expiresAt == null || r.expiresAt * 1000 > now);

export const newestFirst = (items: SavedSessionRecord[]) =>
  [...items].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

export const appSyncStore: SavedSessionStore = {
  async get(sessionId) {
    const data = await graphql(`query GetSavedSession($sessionId: String!) { getSavedSession(sessionId:$sessionId) { ${FIELDS} } }`, { sessionId });
    return isLive(data.getSavedSession) ? data.getSavedSession : null;
  },
  async listByOwner(email, accelerator) {
    const items: SavedSessionRecord[] = [];
    let nextToken: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: any = await graphql(`query ListSavedSessions($filter: ModelSavedSessionFilterInput, $limit: Int, $nextToken: String) {
        listSavedSessions(filter:$filter, limit:$limit, nextToken:$nextToken) { items { ${SUMMARY_FIELDS} } nextToken }
      }`, { filter: { ownerEmail: { eq: email }, accelerator: { eq: accelerator } }, limit: PAGE_SIZE, nextToken });
      items.push(...(data.listSavedSessions.items || []));
      nextToken = data.listSavedSessions.nextToken || null;
      if (!nextToken) break;
    }
    return newestFirst(items.filter(r => isLive(r)));
  },
  async create(record) {
    const data = await graphql(`mutation CreateSavedSession($input: CreateSavedSessionInput!) { createSavedSession(input:$input) { ${FIELDS} } }`, { input: record });
    return data.createSavedSession;
  },
  async update(record) {
    const data = await graphql(`mutation UpdateSavedSession($input: UpdateSavedSessionInput!) { updateSavedSession(input:$input) { ${FIELDS} } }`, { input: record });
    return data.updateSavedSession;
  },
  async delete(sessionId) {
    await graphql(`mutation DeleteSavedSession($input: DeleteSavedSessionInput!) { deleteSavedSession(input:$input) { sessionId } }`, { input: { sessionId } });
  }
};

/** An in-memory store for tests and the local dev server, optionally backed by a JSON file. */
export function memoryStore(persist?: { load: () => SavedSessionRecord[]; save: (items: SavedSessionRecord[]) => void }): SavedSessionStore {
  const items = new Map<string, SavedSessionRecord>((persist?.load() ?? []).map(r => [r.sessionId, r]));
  const save = () => persist?.save([...items.values()]);
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    async get(id) { const r = items.get(id); return isLive(r) ? copy(r) : null; },
    async listByOwner(email, accelerator) {
      return newestFirst([...items.values()].filter(r => r.ownerEmail === email && r.accelerator === accelerator && isLive(r)))
        .map(({ payloadJson, ...rest }) => copy(rest) as SavedSessionRecord);
    },
    async create(record) {
      if (items.has(record.sessionId)) throw new Error('conditional check failed: record exists');
      const now = new Date().toISOString();
      const r = { ...record, createdAt: now, updatedAt: now };
      items.set(r.sessionId, r); save(); return copy(r);
    },
    async update(record) {
      const existing = items.get(record.sessionId);
      if (!existing) throw new Error('conditional check failed: no record');
      const r = { ...existing, ...record, updatedAt: new Date().toISOString() };
      items.set(r.sessionId, r); save(); return copy(r);
    },
    async delete(id) {
      if (!items.delete(id)) throw new Error('conditional check failed: no record');
      save();
    }
  };
}
