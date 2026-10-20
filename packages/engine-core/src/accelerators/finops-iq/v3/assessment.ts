/**
 * Saved FinOps IQ assessments (execution phase M2): the snapshot the page saves and resumes, and its lifecycle.
 * The stored request is checked with the scoring contract. A draft may have incomplete facts while the consultant
 * is still collecting them; its answers must still be valid. The result is computed on the server, and only when
 * the assessment is completed: it is never taken from the browser.
 */
import { parseFinOpsIqV3Request } from './contract';
import { evaluateFinOpsIqV3, type FinOpsIqV3Input, type FinOpsIqV3Result, type Mode } from './evaluate';

export const ASSESSMENT_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const;
export type FinOpsAssessmentStatus = typeof ASSESSMENT_STATUSES[number];

/** A completed assessment is immutable; archiving is the only change left. */
const TRANSITIONS: Record<FinOpsAssessmentStatus, readonly FinOpsAssessmentStatus[]> = {
  draft: ['draft', 'in_progress', 'completed', 'archived'],
  in_progress: ['in_progress', 'completed', 'archived'],
  completed: ['archived'],
  archived: []
};
export const canTransition = (from: FinOpsAssessmentStatus, to: FinOpsAssessmentStatus) => TRANSITIONS[from].includes(to);

export const LIMITS = { idLength: 80, clientNameLength: 200, sectorLength: 80, notesLength: 20_000, requestBytes: 256_000 };
const ID = /^[A-Za-z0-9_-]{8,80}$/;

export interface FinOpsAssessmentSnapshot {
  assessmentId: string;
  clientName: string;
  clientSector?: string;
  respondentEmail: string;
  status: FinOpsAssessmentStatus;
  startedAt: string;
  /** The scoring request: mode, facts, answers and any target overrides or Cost IQ pre-fill. */
  request: Record<string, any>;
  /** Consultant-only notes; never shown in client mode (M3). */
  consultantNotes?: string;
}

export type SnapshotParse = { ok: true; value: FinOpsAssessmentSnapshot } | { ok: false; errors: string[] };

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
  if (!isObject(s.request)) errors.push('request: expected the scoring request (mode, facts, answers)');
  else if (JSON.stringify(s.request).length > LIMITS.requestBytes) errors.push(`request: larger than ${LIMITS.requestBytes} bytes`);
  else {
    const parsed = parseFinOpsIqV3Request(s.request);
    // Facts may be incomplete until the assessment is completed; every other error counts at any status.
    const blocking = parsed.ok ? [] : parsed.errors.filter(e => s.status === 'completed' || !/^facts\b/.test(e));
    errors.push(...blocking.map(e => `request.${e}`));
  }
  if (errors.length) return { ok: false, errors };
  const value: FinOpsAssessmentSnapshot = {
    assessmentId: s.assessmentId, clientName: s.clientName.trim(), respondentEmail: s.respondentEmail.trim().toLowerCase(),
    status: s.status, startedAt: s.startedAt, request: s.request
  };
  if (s.clientSector !== undefined) value.clientSector = s.clientSector.trim();
  if (s.consultantNotes !== undefined) value.consultantNotes = s.consultantNotes;
  return { ok: true, value };
}

/**
 * Scores a completed snapshot. The assessment date is the completion date, set here, so the evidence-age check
 * (THR-FIN-11) cannot be moved by the browser.
 */
export function evaluateSnapshot(snapshot: FinOpsAssessmentSnapshot, completedAt: Date): FinOpsIqV3Result {
  const parsed = parseFinOpsIqV3Request({ ...snapshot.request, assessmentDate: completedAt.toISOString().slice(0, 10) });
  if (!parsed.ok) throw new Error(`completed snapshot does not satisfy the contract: ${parsed.errors[0]}`);
  return evaluateFinOpsIqV3(parsed.value as FinOpsIqV3Input);
}

export const snapshotMode = (s: FinOpsAssessmentSnapshot) => s.request.mode as Mode;
