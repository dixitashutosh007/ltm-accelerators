import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import crypto from 'node:crypto';
import {
  assertAssessmentStatusTransition,
  type ResilienceAssessmentStatus,
  isAssessmentFinal
} from '@ltm/engine-core';
import { evaluateResilienceIq } from '@ltm/engine-core';
import { buildResilienceAssessmentSnapshot } from '@ltm/engine-core';

const json = (statusCode: number, body: unknown, requestId: string): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  body: JSON.stringify(body)
});

type Assessment = {
  assessmentId: string;
  clientName: string;
  clientSector?: string;
  respondentEmail: string;
  status: ResilienceAssessmentStatus;
  answers: Record<string, unknown>;
  result?: ReturnType<typeof evaluateResilienceIq>;
  startedAt: string;
  completedAt?: string;
  finalizedAt?: string;
};

export type AssessmentRepository = {
  get(assessmentId: string): Promise<Assessment | null>;
  put(assessment: Assessment): Promise<Assessment>;
};

export function requireAssessmentRepository(): AssessmentRepository {
  throw new Error('Resilience assessment repository is not configured.');
}

function parseBody(event: APIGatewayProxyEventV2): any {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : event.body ?? '';
  return JSON.parse(raw);
}

function validStatus(value: unknown): value is ResilienceAssessmentStatus {
  return ['draft', 'in_progress', 'completed', 'archived'].includes(String(value));
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId || crypto.randomUUID();
  if (event.requestContext.http.method === 'OPTIONS') return json(200, { ok: true }, requestId);
  if (event.requestContext.http.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, requestId);

  let body: any;
  try { body = parseBody(event); } catch {
    return json(400, { ok: false, error: 'invalid_json' }, requestId);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, error: 'Request body must be a JSON object.' }, requestId);
  }

  const action = String(body.action ?? '');
  const repo = requireAssessmentRepository();

  try {
    if (action === 'create') {
      const assessmentId = String(body.assessmentId ?? `RIQ-${crypto.randomUUID()}`);
      const now = new Date().toISOString();
      const assessment: Assessment = {
        assessmentId,
        clientName: String(body.clientName ?? ''),
        clientSector: body.clientSector ? String(body.clientSector) : undefined,
        respondentEmail: String(body.respondentEmail ?? ''),
        status: 'draft',
        answers: {},
        startedAt: now
      };
      if (!assessment.clientName || !assessment.respondentEmail) {
        return json(400, { ok: false, error: 'clientName and respondentEmail are required' }, requestId);
      }
      return json(201, { ok: true, data: await repo.put(assessment) }, requestId);
    }

    const assessmentId = String(body.assessmentId ?? '');
    if (!assessmentId) return json(400, { ok: false, error: 'assessmentId is required' }, requestId);
    const current = await repo.get(assessmentId);
    if (!current) return json(404, { ok: false, error: 'assessment_not_found' }, requestId);

    if (action === 'save') {
      if (isAssessmentFinal(current.status)) return json(409, { ok: false, error: 'assessment_finalized' }, requestId);
      const nextStatus = validStatus(body.status) ? body.status : 'in_progress';
      assertAssessmentStatusTransition(current.status, nextStatus);
      const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : current.answers;
      const updated = { ...current, answers, status: nextStatus };
      return json(200, { ok: true, data: await repo.put(updated) }, requestId);
    }

    if (action === 'complete') {
      if (isAssessmentFinal(current.status)) return json(409, { ok: false, error: 'assessment_finalized' }, requestId);
      const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : current.answers;
      const result = evaluateResilienceIq(answers);
      if (result.status !== 'ready') return json(422, { ok: false, error: 'assessment_incomplete', data: result }, requestId);
      const now = new Date().toISOString();
      const snapshot = buildResilienceAssessmentSnapshot({
        ...current,
        status: 'completed',
        answers,
        result,
        completedAt: now,
        finalizedAt: now
      });
      return json(200, { ok: true, data: await repo.put(snapshot as Assessment) }, requestId);
    }

    if (action === 'archive') {
      assertAssessmentStatusTransition(current.status, 'archived');
      return json(200, { ok: true, data: await repo.put({ ...current, status: 'archived' }) }, requestId);
    }

    if (action === 'get') return json(200, { ok: true, data: current }, requestId);

    return json(400, { ok: false, error: 'unsupported_action' }, requestId);
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: error instanceof Error ? error.message : String(error) }));
    return json(501, { ok: false, error: 'assessment_persistence_not_configured', requestId }, requestId);
  }
}
