import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  canTransitionEvidenceStatus,
  type ResilienceEvidenceStatus
} from '../../../packages/engine-core/src/accelerators/resilience-iq/evidence-lifecycle';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import type { EvidenceRegisterItem } from '../../../packages/engine-core/src/accelerators/resilience-iq/runtime';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess, getAssessment, graphql, listWhere, parseBody, userEmail } from '../_shared/resilience-data';
import { ALLOWED_TYPES, DOWNLOAD_URL_SECONDS, EVIDENCE_PREFIX, MAX_FILE_BYTES, s3EvidenceStorage, type EvidenceStorage } from './storage';
import { createHash, randomUUID } from 'node:crypto';
import { withAcceleratorAccess } from '../_shared/access';

/** Replaceable in tests. */
export const deps: { storage: EvidenceStorage } = { storage: s3EvidenceStorage };

// Lambdas run one request at a time per container, so the current request's headers are kept here for
// response() to echo an allowed origin (see _shared/http.ts). Origins not in ALLOWED_ORIGINS get no CORS header.
let requestHeaders: Record<string, string | undefined> | undefined;

const statuses = new Set<ResilienceEvidenceStatus>([
  'not_requested', 'requested', 'provided', 'validated', 'rejected'
]);
const MAX_TEXT = 2000;

const EVIDENCE_FIELDS = `id assessmentId evidenceId evidence type status purpose validationCriteriaJson affectedGapsJson affectsRecommendation evidenceLocation evidenceChecksum evidenceFileKey evidenceFileName validationOutcome submittedBy validatedBy validatedAt rejectedReason createdAt updatedAt`;

function response(statusCode: number, body: unknown, requestId: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...corsHeaders({ headers: requestHeaders }, 'OPTIONS,GET,POST', 'X-Request-Id'), 'X-Request-Id': requestId },
    body: JSON.stringify(body)
  };
}

const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXT;

/** A file name safe to store and to offer back as a download name. */
function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() || 'evidence';
  return base.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/^\.+/, '').slice(0, 120) || 'evidence';
}

type UploadedFile = { name: string; contentType: string; bytes: Buffer };

/** Checks an uploaded file (type, size, base64). Returns the decoded file or an error message. */
function readFile(file: any): UploadedFile | string {
  if (!file || typeof file !== 'object' || Array.isArray(file)) return 'file must be an object with name, contentType and contentBase64.';
  if (typeof file.name !== 'string' || !file.name.trim() || file.name.length > 255) return 'file.name is required.';
  if (typeof file.contentType !== 'string' || !ALLOWED_TYPES[file.contentType]) {
    return `file.contentType must be one of: ${Object.keys(ALLOWED_TYPES).join(', ')}.`;
  }
  if (typeof file.contentBase64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.contentBase64)) return 'file.contentBase64 must be base64.';
  const bytes = Buffer.from(file.contentBase64, 'base64');
  if (!bytes.length) return 'The file is empty.';
  if (bytes.length > MAX_FILE_BYTES) return `The file is larger than ${MAX_FILE_BYTES / (1024 * 1024)} MB.`;
  return { name: safeFileName(file.name), contentType: file.contentType, bytes };
}

/**
 * The evidence the engine asks for on this assessment. The stored result is used once the assessment is
 * completed; before that the register is computed from the saved answers. Evidence details always come from
 * here, never from the browser.
 */
function evidenceRegister(assessment: any): EvidenceRegisterItem[] {
  if (assessment.resultJson) return JSON.parse(assessment.resultJson).evidenceRegister || [];
  return evaluateResilienceIq(JSON.parse(assessment.answersJson || '{}')).evidenceRegister;
}

async function listEvidence(assessmentId: string) {
  return listWhere('ResilienceEvidence', EVIDENCE_FIELDS, { assessmentId: { eq: assessmentId } });
}

const serve = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  requestHeaders = event.headers;
  const requestId = event.requestContext?.requestId || randomUUID();
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'POST';

  if (method === 'OPTIONS') return response(200, {}, requestId);
  if (method !== 'GET' && method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed', requestId }, requestId);
  if (!authorized(event)) return response(403, { ok: false, error: 'forbidden', requestId }, requestId);

  try {
    let body: any = {};
    if (method === 'POST') {
      if (!event.body) return response(400, { ok: false, error: 'Request body is required.', requestId }, requestId);
      try { body = parseBody(event); } catch {
        return response(400, { ok: false, error: 'Request body must contain valid JSON.', requestId }, requestId);
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return response(400, { ok: false, error: 'Request body must be a JSON object.', requestId }, requestId);
      }
    }

    const assessmentId = method === 'GET' ? event.queryStringParameters?.assessmentId : body.assessmentId;
    if (typeof assessmentId !== 'string' || !assessmentId.trim()) {
      return response(400, { ok: false, error: 'assessmentId is required.', requestId }, requestId);
    }

    // Evidence belongs to the assessment's respondent; Admins may act on any assessment.
    const assessment = await getAssessment(assessmentId);
    if (!assessment) return response(404, { ok: false, error: 'assessment_not_found', requestId }, requestId);
    if (!canAccess(event, assessment.respondentEmail)) {
      return response(403, { ok: false, error: 'assessment_access_denied', requestId }, requestId);
    }

    const register = evidenceRegister(assessment);
    const stored = await listEvidence(assessmentId);

    if (method === 'GET' && event.queryStringParameters?.download) {
      // A short-lived link to an uploaded file, for the respondent or an Admin only (checked above).
      const record = stored.find(r => r.evidenceId === event.queryStringParameters?.evidenceId);
      if (!record?.evidenceFileKey) return response(404, { ok: false, error: 'evidence_file_not_found', requestId }, requestId);
      const url = await deps.storage.downloadUrl(record.evidenceFileKey, record.evidenceFileName || 'evidence');
      return response(200, { ok: true, data: { url, fileName: record.evidenceFileName, expiresInSeconds: DOWNLOAD_URL_SECONDS }, requestId }, requestId);
    }

    if (method === 'GET') {
      // Every requested item with its current status; items never touched are "requested".
      const data = register.map(item => {
        const record = stored.find(r => r.evidenceId === item.id);
        return {
          ...item,
          status: (record?.status || 'requested') as ResilienceEvidenceStatus,
          evidenceLocation: record?.evidenceLocation ?? null,
          evidenceFileName: record?.evidenceFileName ?? null,
          evidenceChecksum: record?.evidenceChecksum ?? null,
          validationOutcome: record?.validationOutcome ?? null,
          rejectedReason: record?.rejectedReason ?? null,
          submittedBy: record?.submittedBy ?? null,
          validatedBy: record?.validatedBy ?? null,
          validatedAt: record?.validatedAt ?? null
        };
      });
      return response(200, { ok: true, data, requestId }, requestId);
    }

    const { evidenceId, fromStatus, toStatus, evidenceLocation, validationOutcome, rejectedReason } = body;
    let file: UploadedFile | undefined;
    if (body.file !== undefined) {
      if (toStatus !== 'provided') return response(400, { ok: false, error: 'A file can only be uploaded when evidence is provided.', requestId }, requestId);
      const read = readFile(body.file);
      if (typeof read === 'string') return response(400, { ok: false, error: read, requestId }, requestId);
      file = read;
    }
    if (typeof evidenceId !== 'string' || !evidenceId.trim()) {
      return response(400, { ok: false, error: 'evidenceId is required.', requestId }, requestId);
    }
    if (!statuses.has(toStatus) || (fromStatus !== undefined && !statuses.has(fromStatus))) {
      return response(400, { ok: false, error: 'Invalid evidence lifecycle status.', requestId }, requestId);
    }
    if (assessment.status === 'archived') {
      return response(409, { ok: false, error: 'assessment_immutable', requestId }, requestId);
    }

    const item = register.find(x => x.id === evidenceId);
    if (!item) return response(400, { ok: false, error: 'evidence_not_requested', message: `${evidenceId} is not in this assessment's evidence register.`, requestId }, requestId);

    // The current status is the stored one. A client that sends fromStatus is told when it is out of date.
    const record = stored.find(r => r.evidenceId === evidenceId);
    const current = (record?.status || 'requested') as ResilienceEvidenceStatus;
    if (fromStatus !== undefined && fromStatus !== current) {
      return response(409, { ok: false, error: 'evidence_status_changed', message: `Evidence is ${current}, not ${fromStatus}.`, status: current, requestId }, requestId);
    }
    if (!canTransitionEvidenceStatus(current, toStatus)) {
      return response(409, { ok: false, error: 'invalid_evidence_status_transition', message: `Invalid evidence status transition: ${current} -> ${toStatus}`, requestId }, requestId);
    }

    if (toStatus === 'provided' && !file && !text(evidenceLocation)) {
      return response(400, { ok: false, error: 'A file or an evidenceLocation is required when evidence is provided.', requestId }, requestId);
    }
    if (evidenceLocation !== undefined && evidenceLocation !== null && !text(evidenceLocation)) {
      return response(400, { ok: false, error: 'evidenceLocation must be text of up to 2000 characters.', requestId }, requestId);
    }
    if (toStatus === 'validated' && !text(validationOutcome)) {
      return response(400, { ok: false, error: 'validationOutcome is required when evidence is validated.', requestId }, requestId);
    }
    if (toStatus === 'rejected' && !text(rejectedReason)) {
      return response(400, { ok: false, error: 'rejectedReason is required when evidence is rejected.', requestId }, requestId);
    }

    const actor = userEmail(event);
    const now = new Date().toISOString();

    // Every check has passed: store the file before recording it.
    let uploaded: { key: string; name: string; checksum: string } | undefined;
    if (file) {
      const checksum = createHash('sha256').update(file.bytes).digest('hex');
      const key = `${EVIDENCE_PREFIX}${encodeURIComponent(assessmentId)}/${encodeURIComponent(evidenceId)}/${randomUUID()}-${file.name}`;
      await deps.storage.put(key, file.bytes, file.contentType, { assessmentid: assessmentId, evidenceid: evidenceId, uploadedby: actor, sha256: checksum });
      uploaded = { key, name: file.name, checksum };
    }
    const input: Record<string, unknown> = {
      ...(record?.id ? { id: record.id } : {}),
      assessmentId,
      evidenceId,
      evidence: item.evidence,
      type: item.type,
      status: toStatus,
      purpose: item.purpose,
      validationCriteriaJson: JSON.stringify(item.validationCriteria || []),
      affectedGapsJson: JSON.stringify(item.affectedGaps || []),
      affectsRecommendation: Boolean(item.affectsRecommendation),
      ...(toStatus === 'provided' ? {
        evidenceLocation: text(evidenceLocation) ? String(evidenceLocation).trim() : `Uploaded file: ${uploaded!.name}`,
        evidenceFileKey: uploaded?.key ?? null,
        evidenceFileName: uploaded?.name ?? null,
        evidenceChecksum: uploaded?.checksum ?? null,
        submittedBy: actor, validationOutcome: null, rejectedReason: null, validatedBy: null, validatedAt: null
      } : {}),
      ...(toStatus === 'validated' ? { validationOutcome: String(validationOutcome).trim(), validatedBy: actor, validatedAt: now } : {}),
      ...(toStatus === 'rejected' ? { rejectedReason: String(rejectedReason).trim(), validatedBy: actor, validatedAt: now } : {})
    };
    const mutation = record
      ? `mutation UpdateResilienceEvidence($input: UpdateResilienceEvidenceInput!) { updateResilienceEvidence(input:$input) { ${EVIDENCE_FIELDS} } }`
      : `mutation CreateResilienceEvidence($input: CreateResilienceEvidenceInput!) { createResilienceEvidence(input:$input) { ${EVIDENCE_FIELDS} } }`;
    const data = await graphql(mutation, { input });
    return response(200, { ok: true, data: record ? data.updateResilienceEvidence : data.createResilienceEvidence, requestId }, requestId);
  } catch (error) {
    console.error('[ManageResilienceEvidence] Error', { requestId, error });
    // Details stay in the logs: database errors are not returned to the browser.
    return response(500, { ok: false, error: 'internal_evidence_error', message: 'The evidence could not be saved. Please try again.', requestId }, requestId);
  }
};

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('resilience-iq', serve);
