import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createCostIqPersistenceService } from '../../../packages/engine-core/src/accelerators/cost-iq/persistence-service.cjs';
import { LIFECYCLE } from '../../../packages/engine-core/src/accelerators/cost-iq/persistence.cjs';
import { validateCreate, validateUpdate, validateComplete } from '../../../packages/engine-core/src/accelerators/cost-iq/persistence-api-contract.cjs';
import type { CostIqAssessmentRepository } from './repository';

const HEADERS = { 'Content-Type': 'application/json' };

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function bodyOf(event: APIGatewayProxyEventV2): any {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw);
}

export async function handlePersistence(
  event: APIGatewayProxyEventV2,
  repository: CostIqAssessmentRepository
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.requestContext?.http?.path || '';
  const service = createCostIqPersistenceService(repository);

  try {
    const parts = path.split('/').filter(Boolean);
    const id = parts[parts.indexOf('assessment') + 1];
    const body = bodyOf(event);

    if (method === 'POST' && parts.at(-1) === 'assessment') {
      const validation = validateCreate(body);
      if (!validation.valid) return json(400, validation);
      return json(201, await service.createDraft(body));
    }

    if (method === 'GET' && parts.at(-1) === 'history') {
      return json(200, await service.history());
    }

    if (method === 'GET' && id) {
      const record = await service.resume(id);
      return record ? json(200, record) : json(404, { error: 'assessment_not_found' });
    }

    if (method === 'PUT' && id) {
      const validation = validateUpdate({ ...body, assessmentId: id });
      if (!validation.valid) return json(400, validation);
      const current = await repository.get(id);
      if (!current) return json(404, { error: 'assessment_not_found' });
      return json(200, await service.saveProgress({ ...current, ...body, assessmentId: id }));
    }

    if (method === 'POST' && id && parts.at(-1) === 'complete') {
      const validation = validateComplete({ ...body, assessmentId: id });
      if (!validation.valid) return json(400, validation);
      const current = await repository.get(id);
      if (!current) return json(404, { error: 'assessment_not_found' });
      return json(200, await service.complete(current, body.result));
    }

    return json(404, { error: 'persistence_route_not_found' });
  } catch {
    return json(500, { error: 'persistence_error' });
  }
}
