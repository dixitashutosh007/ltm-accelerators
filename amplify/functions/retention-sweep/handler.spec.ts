import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sweep, type SweepDeps } from './handler';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';

const NOW = new Date('2026-11-04T00:00:00Z');
let calls: string[];
let live: Set<string>;
let deps: SweepDeps;

beforeEach(() => {
  calls = [];
  live = new Set(['A-live']);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  deps = {
    withoutExpiry: async () => [{ id: 'db-old' }],
    setExpiry: async (id, at) => { calls.push(`expiry ${id} ${at}`); },
    allEvidence: async () => [
      { id: 'ev-1', assessmentId: 'A-live', evidenceFileKey: 'resilience-iq/evidence/A-live/E1/f.pdf' },
      { id: 'ev-2', assessmentId: 'A-gone', evidenceFileKey: 'resilience-iq/evidence/A-gone/E1/f.pdf' },
      { id: 'ev-3', assessmentId: 'A-gone', evidenceFileKey: null }
    ],
    assessmentExists: async id => live.has(id),
    files: { remove: async key => { calls.push(`file ${key}`); } },
    deleteEvidence: async id => { calls.push(`record ${id}`); }
  };
});

describe('retention sweep', () => {
  it('gives an assessment with no expiry a full period from today, not from its last change', async () => {
    await sweep(deps, NOW);
    expect(calls).toContain(`expiry db-old ${expiresAt(NOW)}`);
  });

  it('deletes evidence whose assessment is gone, the file before the record, and keeps evidence of a live assessment', async () => {
    const r = await sweep(deps, NOW);
    expect(calls.filter(c => !c.startsWith('expiry'))).toEqual(['file resilience-iq/evidence/A-gone/E1/f.pdf', 'record ev-2', 'record ev-3']);
    expect(r).toMatchObject({ backfilled: 1, evidenceDeleted: 2, filesDeleted: 1, failed: 0 });
  });

  it('leaves the record in place when its file cannot be removed, and carries on with the rest', async () => {
    deps.files = { remove: async () => { throw new Error('s3 down'); } };
    const r = await sweep(deps, NOW);
    expect(calls).not.toContain('record ev-2');
    expect(calls).toContain('record ev-3');
    expect(r.failed).toBe(1);
  });

  it('does not delete evidence when the assessment lookup fails: an error is not "gone"', async () => {
    deps.assessmentExists = async () => { throw new Error('appsync down'); };
    const r = await sweep(deps, NOW);
    expect(calls.filter(c => c.startsWith('record') || c.startsWith('file'))).toEqual([]);
    expect(r.failed).toBe(3);
  });

  it('looks each assessment up once', async () => {
    const lookups: string[] = [];
    deps.assessmentExists = async id => { lookups.push(id); return live.has(id); };
    await sweep(deps, NOW);
    expect(lookups).toEqual(['A-live', 'A-gone']);
  });
});
