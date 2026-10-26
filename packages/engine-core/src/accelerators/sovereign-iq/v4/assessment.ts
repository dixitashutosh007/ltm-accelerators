/**
 * Saved Sovereign IQ assessments (PLAN S5 item 3): the snapshot the page saves and resumes, and its lifecycle. The
 * same shape and rules as FinOps IQ (finops-iq/v3/assessment.ts). The answers are checked with the scoring contract;
 * the result is computed on the server when the assessment is completed, never taken from the browser, and dated
 * that day so obligations dated later than completion do not score.
 */
import { parseSovereignIqV4Input } from './contract';
import { evaluateSovereignIqV4, type Mode, type SovereignIqV4Result } from './evaluate';

export const ASSESSMENT_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const;
export type SovereignAssessmentStatus = typeof ASSESSMENT_STATUSES[number];

/** A completed assessment is immutable; archiving is the only change left. */
const TRANSITIONS: Record<SovereignAssessmentStatus, readonly SovereignAssessmentStatus[]> = {
  draft: ['draft', 'in_progress', 'completed', 'archived'],
  in_progress: ['in_progress', 'completed', 'archived'],
  completed: ['archived'],
  archived: []
};
export const canTransition = (from: SovereignAssessmentStatus, to: SovereignAssessmentStatus) => TRANSITIONS[from].includes(to);

export const LIMITS = { idLength: 80, clientNameLength: 200, sectorLength: 80, notesLength: 20_000, requestBytes: 256_000 };
const ID = /^[A-Za-z0-9_-]{8,80}$/;

export interface SovereignAssessmentSnapshot {
  assessmentId: string;
  clientName: string;
  clientSector?: string;
  respondentEmail: string;
  status: SovereignAssessmentStatus;
  startedAt: string;
  /** The scoring request without its date: mode and answers. */
  request: { mode: Mode; answers: Record<string, unknown> };
  /** Consultant-only notes; never shown in client mode. */
  consultantNotes?: string;
}

export type SnapshotParse = { ok: true; value: SovereignAssessmentSnapshot } | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isTimestamp = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v);

export function parseSnapshot(body: unknown): SnapshotParse {
  const s = (isObject(body) ? body : {}) as Record<string, any>;
  const errors: string[] = [];
  if (typeof s.assessmentId !== 'string' || !ID.test(s.assessmentId)) errors.push(`assessmentId: expected 8 to ${LIMITS.idLength} letters, digits, "-" or "_"`);
  if (!text(s.clientName, LIMITS.clientNameLength)) errors.push(`clientName: expected text up to ${LIMITS.clientNameLength} characters`);
  if (s.clientSector !== undefined && !text(s.clientSector, LIMITS.sectorLength)) errors.push(`clientSector: expected text up to ${LIMITS.sectorLength} characters`);
  if (!text(s.respondentEmail, 254) || !/^[^@\s]+@[^@\s]+$/.test(s.respondentEmail)) errors.push('respondentEmail: expected an email address');
  if (!(ASSESSMENT_STATUSES as readonly string[]).includes(s.status)) errors.push(`status: expected one of ${ASSESSMENT_STATUSES.join(', ')}`);
  if (!isTimestamp(s.startedAt)) errors.push('startedAt: expected an ISO timestamp');
  if (s.consultantNotes !== undefined && (typeof s.consultantNotes !== 'string' || s.consultantNotes.length > LIMITS.notesLength)) errors.push(`consultantNotes: expected text up to ${LIMITS.notesLength} characters`);
  if (!isObject(s.request)) errors.push('request: expected the scoring request (mode, answers)');
  else if (JSON.stringify(s.request).length > LIMITS.requestBytes) errors.push(`request: larger than ${LIMITS.requestBytes} bytes`);
  else {
    // The date is set on completion, here; the browser's date is never used.
    const parsed = parseSovereignIqV4Input({ mode: s.request.mode, answers: s.request.answers, assessmentDate: '2000-01-01' });
    if (!parsed.ok) errors.push(...parsed.errors.map(e => `request.${e}`));
  }
  if (errors.length) return { ok: false, errors };
  const value: SovereignAssessmentSnapshot = {
    assessmentId: s.assessmentId, clientName: s.clientName.trim(), respondentEmail: s.respondentEmail.trim().toLowerCase(),
    status: s.status, startedAt: s.startedAt, request: { mode: s.request.mode, answers: s.request.answers ?? {} }
  };
  if (s.clientSector !== undefined) value.clientSector = s.clientSector.trim();
  if (s.consultantNotes !== undefined) value.consultantNotes = s.consultantNotes;
  return { ok: true, value };
}

/** Scores a completed snapshot, dated the completion day. */
export function evaluateSnapshot(snapshot: SovereignAssessmentSnapshot, completedAt: Date): SovereignIqV4Result {
  const parsed = parseSovereignIqV4Input({ ...snapshot.request, assessmentDate: completedAt.toISOString().slice(0, 10) });
  if (!parsed.ok) throw new Error(`completed snapshot does not satisfy the contract: ${parsed.errors[0]}`);
  return evaluateSovereignIqV4(parsed.input);
}

export const snapshotMode = (s: SovereignAssessmentSnapshot) => s.request.mode;
