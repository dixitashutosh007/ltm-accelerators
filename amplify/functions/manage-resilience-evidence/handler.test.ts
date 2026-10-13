import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler as rawHandler, deps } from './handler';
import { createHash } from 'node:crypto';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import { ARCHETYPES } from '../../../packages/engine-core/test/resilience-iq-samples';

const handler = async (e: any) => (await rawHandler(e)) as APIGatewayProxyStructuredResultV2;

process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.AWS_SESSION_TOKEN = 'test-session';
process.env.AWS_REGION = 'ap-south-1';
process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = 'https://example.appsync-api.ap-south-1.amazonaws.com/graphql';

const OWNER = 'consultant@example.com';
const answers = ARCHETYPES['regulated-bank-tested'];
const register = evaluateResilienceIq(answers as any).evidenceRegister;
if (!register.length) throw new Error('Test setup: the sample assessment must request evidence');
const EVIDENCE_ID = register[0].id;

function event(method: 'GET' | 'POST' | 'OPTIONS' | 'PUT', body?: unknown, claims: Record<string, unknown> = { email: OWNER }): any {
  return {
    requestContext: { requestId: 'test-request', http: { method }, authorizer: { jwt: { claims } } },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    queryStringParameters: method === 'GET' ? { assessmentId: 'RIQ-001' } : undefined
  };
}
const post = (body: Record<string, unknown>, claims?: Record<string, unknown>) =>
  handler(event('POST', { assessmentId: 'RIQ-001', evidenceId: EVIDENCE_ID, ...body }, claims));
const json = (r: any) => JSON.parse(String(r.body));

// Fake Amplify Data: one assessment and the evidence records stored so far.
let assessment: any;
let evidence: any[];
let failDatabase = false;
const mutations: any[] = [];
function reset(over: Record<string, unknown> = {}) {
  assessment = { id: 'db-1', assessmentId: 'RIQ-001', status: 'in_progress', respondentEmail: OWNER, answersJson: JSON.stringify(answers), resultJson: null, ...over };
  evidence = [];
  failDatabase = false;
  mutations.length = 0;
}
globalThis.fetch = async (_input: any, init: any) => {
  const request = JSON.parse(init.body);
  const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
  if (failDatabase) return new Response(JSON.stringify({ errors: [{ message: 'DynamoDB:ConditionalCheckFailed table=ResilienceEvidence-internal' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  if (request.query.includes('listResilienceAssessments')) return ok({ listResilienceAssessments: { items: assessment ? [assessment] : [], nextToken: null } });
  if (request.query.includes('listResilienceEvidences')) return ok({ listResilienceEvidences: { items: evidence, nextToken: null } });
  const input = request.variables.input;
  mutations.push(input);
  if (request.query.includes('createResilienceEvidence')) {
    const record = { id: `ev-${evidence.length + 1}`, ...input };
    evidence.push(record);
    return ok({ createResilienceEvidence: record });
  }
  if (request.query.includes('updateResilienceEvidence')) {
    const record = evidence.find(r => r.id === input.id);
    Object.assign(record, input);
    return ok({ updateResilienceEvidence: record });
  }
  throw new Error(`Unexpected GraphQL request: ${request.query}`);
};

function expect(condition: unknown, message: string) { if (!condition) throw new Error(message); }

// The full lifecycle: requested -> provided -> validated, with details taken from the server's register.
reset();
let r = await post({ toStatus: 'provided', evidenceLocation: 'SharePoint: DR test report Q3' });
expect(r.statusCode === 200 && json(r).data.status === 'provided', 'The owner can provide requested evidence');
expect(mutations[0].submittedBy === OWNER && mutations[0].evidence === register[0].evidence && mutations[0].type === register[0].type,
  'Evidence details come from the server register, and the submitter is recorded');
r = await post({ fromStatus: 'provided', toStatus: 'validated', validationOutcome: 'Restore met the RTO.' });
expect(r.statusCode === 200 && json(r).data.status === 'validated' && json(r).data.validatedBy === OWNER, 'Provided evidence can be validated, recording who validated it');

// Browser-supplied evidence details are ignored.
reset();
await post({ toStatus: 'provided', evidenceLocation: 'ref', type: 'forged', purpose: 'forged', affectsRecommendation: false });
expect(mutations[0].type === register[0].type && mutations[0].purpose === register[0].purpose && mutations[0].affectsRecommendation === register[0].affectsRecommendation,
  'Type, purpose and recommendation impact cannot be set by the browser');

// Ownership.
reset({ respondentEmail: 'someone.else@example.com' });
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 403 && json(r).error === 'assessment_access_denied' && mutations.length === 0, "A user cannot change evidence on another user's assessment");
r = await handler(event('GET'));
expect(r.statusCode === 403, "A user cannot list evidence on another user's assessment");
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' }, { email: 'admin@example.com', 'cognito:groups': ['Admin'] });
expect(r.statusCode === 200, "An Admin can act on any assessment's evidence");

// Unknown assessment, unknown evidence, archived assessment.
reset(); assessment = null;
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 404 && json(r).error === 'assessment_not_found', 'Unknown assessment returns 404');
reset();
r = await post({ evidenceId: 'ER-NOT-ASKED', toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 400 && json(r).error === 'evidence_not_requested', 'Evidence the register does not ask for is refused');
reset({ status: 'archived' });
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 409 && json(r).error === 'assessment_immutable', 'Archived assessments are immutable');

// A completed assessment uses its stored result's register, and evidence is stored beside it (the result is not rewritten).
reset({ status: 'completed', resultJson: JSON.stringify(evaluateResilienceIq(answers as any)) });
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 200 && mutations.every(m => !('resultJson' in m)), 'Evidence on a completed assessment does not change its stored result');

// The stored status is the truth; illegal and stale transitions are refused.
reset();
r = await post({ toStatus: 'validated', validationOutcome: 'ok' });
expect(r.statusCode === 409 && json(r).error === 'invalid_evidence_status_transition', 'Requested evidence cannot jump to validated');
await post({ toStatus: 'provided', evidenceLocation: 'ref' });
r = await post({ fromStatus: 'requested', toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 409 && json(r).error === 'evidence_status_changed' && json(r).status === 'provided', 'A stale fromStatus is reported with the current status');

// Required fields per transition.
reset();
r = await post({ toStatus: 'provided' });
expect(r.statusCode === 400, 'Providing evidence needs a location or reference');
await post({ toStatus: 'provided', evidenceLocation: 'ref' });
r = await post({ toStatus: 'validated' });
expect(r.statusCode === 400, 'Validation needs an outcome');
r = await post({ toStatus: 'rejected' });
expect(r.statusCode === 400, 'Rejection needs a reason');
reset();
r = await post({ toStatus: 'provided', evidenceLocation: 'x'.repeat(2001) });
expect(r.statusCode === 400 && mutations.length === 0, 'Over-long text is refused');

// GET lists every requested item with its current status.
reset();
await post({ toStatus: 'provided', evidenceLocation: 'ref' });
r = await handler(event('GET'));
const listed = json(r).data;
expect(r.statusCode === 200 && listed.length === register.length, 'GET lists the whole register');
expect(listed.find((x: any) => x.id === EVIDENCE_ID).status === 'provided' && listed.filter((x: any) => x.id !== EVIDENCE_ID).every((x: any) => x.status === 'requested'),
  'Stored statuses are merged into the register; untouched items are requested');

// File upload: checked on the server, stored under the evidence prefix, linked to the record.
const puts: Array<{ key: string; body: Buffer; contentType: string; metadata: Record<string, string> }> = [];
deps.storage = {
  async put(key, body, contentType, metadata) { puts.push({ key, body, contentType, metadata }); },
  async downloadUrl(key, fileName) { return `https://signed.example/${encodeURIComponent(key)}?name=${encodeURIComponent(fileName)}`; }
};
const pdf = Buffer.from('%PDF-1.7 restore test report');
const upload = (file: Record<string, unknown>, extra: Record<string, unknown> = {}, claims?: Record<string, unknown>) =>
  post({ toStatus: 'provided', file: { name: 'DR test/../report "Q3".pdf', contentType: 'application/pdf', contentBase64: pdf.toString('base64'), ...file }, ...extra }, claims);

reset(); puts.length = 0;
r = await upload({});
expect(r.statusCode === 200 && json(r).data.status === 'provided', 'Evidence can be provided by uploading a file');
expect(puts.length === 1 && puts[0].key.startsWith(`resilience-iq/evidence/RIQ-001/${encodeURIComponent(EVIDENCE_ID)}/`) && puts[0].body.equals(pdf), 'The file is stored under the assessment and evidence prefix');
expect(!puts[0].key.includes('..') && !puts[0].key.includes('"') && puts[0].key.endsWith('report _Q3_.pdf'), 'The stored file name is sanitised (no path segments or quotes)');
const sha = createHash('sha256').update(pdf).digest('hex');
expect(mutations[0].evidenceChecksum === sha && puts[0].metadata.sha256 === sha && mutations[0].evidenceFileKey === puts[0].key, 'The SHA-256 checksum and file key are recorded');
expect(mutations[0].evidenceLocation === 'Uploaded file: report _Q3_.pdf' && mutations[0].evidenceFileName === 'report _Q3_.pdf', 'The location names the uploaded file');

// Download: a short-lived link, only for the owner or an Admin.
r = await handler({ ...event('GET'), queryStringParameters: { assessmentId: 'RIQ-001', evidenceId: EVIDENCE_ID, download: '1' } });
expect(r.statusCode === 200 && json(r).data.url.startsWith('https://signed.example/') && json(r).data.expiresInSeconds === 300, 'The owner gets a short-lived download link');
r = await handler({ ...event('GET'), queryStringParameters: { assessmentId: 'RIQ-001', evidenceId: register[1]?.id ?? 'none', download: '1' } });
expect(r.statusCode === 404 && json(r).error === 'evidence_file_not_found', 'An item without a file has no download');
assessment.respondentEmail = 'someone.else@example.com';
r = await handler({ ...event('GET'), queryStringParameters: { assessmentId: 'RIQ-001', evidenceId: EVIDENCE_ID, download: '1' } });
expect(r.statusCode === 403, "A user cannot download another user's evidence");

// Refused uploads store nothing.
for (const [label, file, extra] of [
  ['an executable type', { contentType: 'application/x-msdownload' }, {}],
  ['an empty file', { contentBase64: '' }, {}],
  ['a file over 4 MB', { contentBase64: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }, {}],
  ['content that is not base64', { contentBase64: 'not base64!' }, {}],
  ['a file with a status other than provided', {}, { toStatus: 'rejected', rejectedReason: 'x' }]
] as const) {
  reset(); puts.length = 0;
  r = await upload(file, extra);
  expect(r.statusCode === 400 && puts.length === 0 && mutations.length === 0, `Upload of ${label} is refused and nothing is stored`);
}
reset({ respondentEmail: 'someone.else@example.com' }); puts.length = 0;
r = await upload({});
expect(r.statusCode === 403 && puts.length === 0, "Nothing is stored for another user's assessment");
reset(); puts.length = 0;
r = await upload({}, { fromStatus: 'provided' });
expect(r.statusCode === 409 && puts.length === 0, 'Nothing is stored when the status has changed');

// Providing again with a reference clears the earlier file link.
reset(); await upload({});
await post({ fromStatus: 'provided', toStatus: 'rejected', rejectedReason: 'Wrong period' });
await post({ fromStatus: 'rejected', toStatus: 'requested' });
r = await post({ fromStatus: 'requested', toStatus: 'provided', evidenceLocation: 'SharePoint: DR test Q4' });
expect(r.statusCode === 200 && json(r).data.evidenceFileKey === null && json(r).data.evidenceLocation === 'SharePoint: DR test Q4', 'A reference replaces the earlier file');

// Errors and malformed requests.
reset(); failDatabase = true;
r = await post({ toStatus: 'provided', evidenceLocation: 'ref' });
expect(r.statusCode === 500 && !String(r.body).includes('DynamoDB'), 'Database errors are not returned to the browser');
reset();
expect((await handler(event('POST', null))).statusCode === 400, 'A body that is not an object returns 400');
expect((await post({ toStatus: 'done' })).statusCode === 400, 'An unknown status returns 400');
expect((await handler(event('POST', { assessmentId: 'RIQ-001', toStatus: 'provided' }))).statusCode === 400, 'evidenceId is required');
expect((await handler(event('POST', { toStatus: 'provided' }, {}))).statusCode === 403, 'A request with no identity is refused');
expect((await handler(event('OPTIONS'))).statusCode === 200, 'OPTIONS returns 200');
expect((await handler(event('PUT', {}))).statusCode === 405, 'Unsupported methods return 405');

console.log('Resilience IQ evidence API tests passed');
