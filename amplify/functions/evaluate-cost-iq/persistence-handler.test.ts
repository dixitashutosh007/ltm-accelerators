import assert from 'node:assert/strict';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handlePersistence } from './persistence-handler';
import type { CostIqAssessmentRepository } from './repository';

const records = new Map<string, any>();
const repo: CostIqAssessmentRepository = {
  async create(record) { records.set(record.assessmentId, record); return record; },
  async update(record) { records.set(record.assessmentId, record); return record; },
  async get(id) { return records.get(id) || null; },
  async list() { return [...records.values()]; }
};

function event(method: string, path: string, body?: unknown): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: {},
    requestContext: { accountId: 'test', apiId: 'test', domainName: 'test', domainPrefix: 'test', http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'test' }, requestId: 'test', routeKey: '$default', stage: '$default', time: '', timeEpoch: 0 },
    isBase64Encoded: false,
    stageVariables: undefined,
    body: body === undefined ? undefined : JSON.stringify(body)
  } as APIGatewayProxyEventV2;
}

const create = await handlePersistence(event('POST', '/api/evaluate/cost-iq/assessment', {
  assessmentId: 'A1',
  releaseId: 'COSTIQ-0.7.8-DRAFT',
  methodologyVersion: '6.6.0',
  selectedAreas: ['Cloud Economics'],
  answers: { 'CORE-06': 5 }
}), repo);
assert.equal(create.statusCode, 201);

const get = await handlePersistence(event('GET', '/api/evaluate/cost-iq/assessment/A1'), repo);
assert.equal(get.statusCode, 200);

const update = await handlePersistence(event('PUT', '/api/evaluate/cost-iq/assessment/A1', {
  status: 'in_progress',
  answersJson: JSON.stringify({ 'CORE-06': 4 })
}), repo);
assert.equal(update.statusCode, 200);

const history = await handlePersistence(event('GET', '/api/evaluate/cost-iq/assessment/history'), repo);
assert.equal(history.statusCode, 200);

const complete = await handlePersistence(event('POST', '/api/evaluate/cost-iq/assessment/A1/complete', {
  result: { headlines: { costIQ: 80 } }
}), repo);
assert.equal(complete.statusCode, 200);

const missing = await handlePersistence(event('GET', '/api/evaluate/cost-iq/assessment/missing'), repo);
assert.equal(missing.statusCode, 404);

console.log('Cost IQ Phase 5 persistence HTTP handler: PASS');
