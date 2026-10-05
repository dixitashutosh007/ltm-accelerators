import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import crypto from 'node:crypto';
import { assertAssessmentStatusTransition, type ResilienceAssessmentStatus, isAssessmentFinal } from '../../../packages/engine-core/src/accelerators/resilience-iq/assessment-lifecycle';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/runtime';
import { buildResilienceAssessmentSnapshot } from '../../../packages/engine-core/src/accelerators/resilience-iq/assessment-persistence';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

const ALLOWED_ORIGIN = process.env.RESILIENCE_IQ_ALLOWED_ORIGIN || '*';
const json = (statusCode: number, body: unknown, requestId: string): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'x-request-id': requestId, 'access-control-allow-origin': ALLOWED_ORIGIN, 'access-control-allow-headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Request-Id', 'access-control-allow-methods': 'OPTIONS,POST' },
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

let clientPromise: ReturnType<typeof initializeClient> | undefined;
async function initializeClient() {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(process.env as Record<string, string>);
  Amplify.configure(resourceConfig, libraryOptions);
  return generateClient<Schema>();
}
function getClient() {
  clientPromise ??= initializeClient();
  return clientPromise;
}

export function getAssessmentRepository(): AssessmentRepository {
  return {

    async get(assessmentId) {
      const client = await getClient();
      const { data, errors } = await client.models.ResilienceAssessment.get({ assessmentId });
      if (errors?.length) throw new Error(errors.map(error => error.message).join('; '));
      if (!data) return null;
      return {
        assessmentId: data.assessmentId,
        clientName: data.clientName,
        clientSector: data.clientSector ?? undefined,
        respondentEmail: data.respondentEmail,
        status: data.status as ResilienceAssessmentStatus,
        answers: JSON.parse(data.answersJson),
        result: data.resultJson ? JSON.parse(data.resultJson) : undefined,
        startedAt: data.startedAt,
        completedAt: data.completedAt ?? undefined,
        finalizedAt: data.finalizedAt ?? undefined
      };
    },
    async put(assessment) {
      const version = assessment.result?.version;
      const input = {
        assessmentId: assessment.assessmentId,
        clientName: assessment.clientName,
        clientSector: assessment.clientSector,
        respondentEmail: assessment.respondentEmail,
        status: assessment.status,
        questionBankVersion: version?.questionBank ?? '1.0',
        scoringModelVersion: version?.scoringModel ?? '1.0',
        decisionTreeVersion: version?.decisionTree ?? '1.0',
        blueprintEngineVersion: version?.blueprintEngine ?? '1.0',
        executiveReportVersion: version?.executiveReport ?? '1.0',
        engineVersion: version?.engine ?? '1.0.0',
        answersJson: JSON.stringify(assessment.answers),
        resultJson: assessment.result ? JSON.stringify(assessment.result) : undefined,
        decisionLogJson: assessment.result ? JSON.stringify(assessment.result.decisionLog) : undefined,
        recommendationSensitivityJson: assessment.result ? JSON.stringify(assessment.result.recommendationSensitivity) : undefined,
        startedAt: assessment.startedAt,
        completedAt: assessment.completedAt,
        finalizedAt: assessment.finalizedAt
      };
      const client = await getClient();
      const { data, errors } = await client.models.ResilienceAssessment.upsert(input);
      if (errors?.length) throw new Error(errors.map(error => error.message).join('; '));
      if (!data) throw new Error('Resilience assessment persistence returned no record.');
      return assessment;
    }
  };
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
  const claims = event.requestContext.authorizer?.jwt?.claims as Record<string, unknown> | undefined;
  const rawGroups = claims?.['cognito:groups'];
  const groups = Array.isArray(rawGroups) ? rawGroups.map(String) : typeof rawGroups === 'string' ? rawGroups.split(',').map(x => x.trim()) : [];
  if (!groups.some(group => group === 'Admin' || group === 'Consultant')) return json(403, { ok: false, error: 'forbidden' }, requestId);
  if (event.requestContext.http.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, requestId);

  let body: any;
  try { body = parseBody(event); } catch {
    return json(400, { ok: false, error: 'invalid_json' }, requestId);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, error: 'Request body must be a JSON object.' }, requestId);
  }

  const action = String(body.action ?? '');
  const repo = getAssessmentRepository();

  try {
    if (action === 'create') {
      const assessmentId = String(body.assessmentId ?? `RIQ-${crypto.randomUUID()}`);
      const now = new Date().toISOString();
      const assessment: Assessment = {
        assessmentId,
        clientName: String(body.clientName ?? ''),
        clientSector: body.clientSector ? String(body.clientSector) : undefined,
        respondentEmail: String(claims?.email ?? claims?.['cognito:username'] ?? claims?.username ?? ''),
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
