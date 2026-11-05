/**
 * The daily retention sweep for Resilience IQ (platform workstream P3), after the 24-month expiry was added:
 *   1. Backfill. An assessment saved before expiry existed has no expiresAt and would never be deleted. It is given a full
 *      retention period from today, never one counted from its last change, so the first run deletes nothing.
 *   2. Orphaned evidence. Time to live deletes an expired assessment but not the evidence records and files under it. Evidence
 *      whose assessment no longer exists is deleted, file first, so a failed run leaves the record to retry.
 * Both steps are idempotent. The evidence list and the backfill read at most 10,000 records a run (the page limit in
 * resilience-data.ts) and a backlog clears over several days; the assessment scan reads the whole table or fails.
 */
import { graphql, listWhere } from '../_shared/resilience-data';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';
import { s3EvidenceFiles, type EvidenceFiles } from '../manage-resilience-assessment/evidence-files';

export interface SweepDeps {
  withoutExpiry(): Promise<{ id: string }[]>;
  setExpiry(id: string, at: number): Promise<void>;
  allEvidence(): Promise<{ id: string; assessmentId: string; evidenceFileKey?: string | null }[]>;
  /** False only when the assessment is certainly gone; a read error must throw. */
  assessmentExists(assessmentId: string): Promise<boolean>;
  files: EvidenceFiles;
  deleteEvidence(id: string): Promise<void>;
}

const PAGE_SIZE = 500, MAX_PAGES = 400;

/**
 * Every live assessment id. The shared helpers stop after 50 pages, which would make a live assessment look missing in a
 * large table and its evidence deletable; this scan reads on until the end and throws if it cannot, so it never guesses.
 */
async function liveAssessmentIds(now = Date.now()): Promise<Set<string>> {
  const ids = new Set<string>();
  let nextToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: any = await graphql(`query ListResilienceAssessments($limit: Int, $nextToken: String) {
      listResilienceAssessments(limit:$limit, nextToken:$nextToken) { items { assessmentId expiresAt } nextToken }
    }`, { limit: PAGE_SIZE, nextToken });
    for (const r of data.listResilienceAssessments.items || []) if (r.expiresAt == null || r.expiresAt * 1000 > now) ids.add(r.assessmentId);
    nextToken = data.listResilienceAssessments.nextToken || null;
    if (!nextToken) return ids;
  }
  throw new Error('Assessment table is larger than the sweep can scan; evidence cleanup refused.');
}

export function createAwsDeps(): SweepDeps {
  let ids: Promise<Set<string>> | undefined;
  return {
    withoutExpiry: () => listWhere('ResilienceAssessment', 'id', { expiresAt: { attributeExists: false } }),
    async setExpiry(id, at) {
      await graphql(`mutation UpdateResilienceAssessment($input: UpdateResilienceAssessmentInput!) { updateResilienceAssessment(input:$input) { id } }`, { input: { id, expiresAt: at } });
    },
    allEvidence: () => listWhere('ResilienceEvidence', 'id assessmentId evidenceFileKey', {}),
    async assessmentExists(assessmentId) { return (await (ids ??= liveAssessmentIds())).has(assessmentId); },
    files: s3EvidenceFiles,
    async deleteEvidence(id) {
      await graphql(`mutation DeleteResilienceEvidence($input: DeleteResilienceEvidenceInput!) { deleteResilienceEvidence(input:$input) { id } }`, { input: { id } });
    }
  };
}

export async function sweep(deps: SweepDeps, now: Date = new Date()) {
  const result = { backfilled: 0, evidenceDeleted: 0, filesDeleted: 0, failed: 0 };

  const at = expiresAt(now);
  for (const a of await deps.withoutExpiry()) {
    try { await deps.setExpiry(a.id, at); result.backfilled++; }
    catch (error) { result.failed++; console.error('[RetentionSweep] backfill failed', { id: a.id, error }); }
  }

  const exists = new Map<string, boolean>();
  for (const e of await deps.allEvidence()) {
    try {
      if (!exists.has(e.assessmentId)) exists.set(e.assessmentId, await deps.assessmentExists(e.assessmentId));
      if (exists.get(e.assessmentId)) continue;
      if (e.evidenceFileKey) { await deps.files.remove(e.evidenceFileKey); result.filesDeleted++; }
      await deps.deleteEvidence(e.id);
      result.evidenceDeleted++;
    } catch (error) { result.failed++; console.error('[RetentionSweep] evidence cleanup failed', { id: e.id, error }); }
  }
  console.info('[RetentionSweep] done', result);
  return result;
}

export const handler = async () => sweep(createAwsDeps());
