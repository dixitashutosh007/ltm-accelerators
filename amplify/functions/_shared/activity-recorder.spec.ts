/**
 * The activity recorder (platform workstream P2): best effort. A missing or failing table never stops a sign-in or a save.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { recordLogin, recordAssessment, removeAssessmentActivity, setActivityStore } from './activity-recorder.mjs';

const store = (over: Record<string, unknown> = {}) => ({ recordLogin: vi.fn(async () => {}), recordAssessment: vi.fn(async () => {}), removeAssessment: vi.fn(async () => {}), ...over }) as any;
beforeEach(() => { delete process.env.ACTIVITY_TABLE; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => setActivityStore(null));

describe('activity recorder', () => {
  it('does nothing, without error, when no table is configured (local development, tests)', async () => {
    setActivityStore(null);
    await expect(recordLogin('a@x.com')).resolves.toBeUndefined();
    await expect(recordAssessment('a@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'draft' })).resolves.toBeUndefined();
    await expect(removeAssessmentActivity('a@x.com', 'finops-iq', 'F1')).resolves.toBeUndefined();
  });
  it('passes the facts to the store', async () => {
    const s = store(); setActivityStore(s);
    await recordLogin('a@x.com');
    await recordAssessment('a@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'draft' });
    await removeAssessmentActivity('a@x.com', 'finops-iq', 'F1');
    expect(s.recordLogin).toHaveBeenCalledWith('a@x.com');
    expect(s.recordAssessment).toHaveBeenCalledWith('a@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'draft' });
    expect(s.removeAssessment).toHaveBeenCalledWith('a@x.com', 'finops-iq', 'F1');
  });
  it('swallows a store failure and logs it without the person\'s address', async () => {
    setActivityStore(store({ recordLogin: async () => { throw new Error('table down'); }, recordAssessment: async () => { throw new Error('table down'); } }));
    await expect(recordLogin('secret@x.com')).resolves.toBeUndefined();
    await expect(recordAssessment('secret@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'draft' })).resolves.toBeUndefined();
    expect(JSON.stringify((console.error as any).mock.calls)).not.toContain('secret@x.com');
    expect((console.error as any).mock.calls.length).toBe(2);
  });
});
