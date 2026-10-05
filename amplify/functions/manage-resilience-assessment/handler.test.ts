import { handler, assertAssessmentAccess } from './handler';

const ownedAssessment = { assessmentId: 'RIQ-1', clientName: 'Client', respondentEmail: 'consultant@example.com', status: 'in_progress', answers: {}, startedAt: '2026-10-05T00:00:00.000Z' } as any;
assertAssessmentAccess(ownedAssessment, { email: 'consultant@example.com' }, ['Consultant']);
try { assertAssessmentAccess(ownedAssessment, { email: 'other@example.com' }, ['Consultant']); throw new Error('Consultant ownership guard failed'); } catch (e) { if (e instanceof Error && e.message === 'Consultant ownership guard failed') throw e; }
assertAssessmentAccess(ownedAssessment, { email: 'other@example.com' }, ['Admin']);

const base = {
  requestContext: { requestId: 'test-request', http: { method: 'POST' }, authorizer: { jwt: { claims: { 'cognito:groups': 'Consultant', email: 'test@example.com' } } } },
  body: ''
} as any;

const response = async (body: unknown) => handler({ ...base, body: JSON.stringify(body) });

const invalid = await handler({ ...base, body: '{' });
if (invalid.statusCode !== 400) throw new Error('Malformed JSON must return 400');

const forbidden = await handler({ ...base, requestContext: { requestId: 'forbidden', http: { method: 'POST' }, authorizer: { jwt: { claims: { 'cognito:groups': 'User' } } } }, body: JSON.stringify({ action: 'get', assessmentId: 'RIQ-1' }) });
if (forbidden.statusCode !== 403) throw new Error('Non-Consultant/Admin users must be rejected');

const missing = await response({ action: 'get' });
if (missing.statusCode !== 400) throw new Error('Missing assessmentId must return 400');

const unsupported = await response({ action: 'wat', assessmentId: 'RIQ-1' });
if (unsupported.statusCode !== 501 && unsupported.statusCode !== 404) {
  throw new Error('Repository boundary must prevent false success before persistence is configured');
}

const options = await handler({ ...base, requestContext: { requestId: 'options', http: { method: 'OPTIONS' }, authorizer: { jwt: { claims: { 'cognito:groups': 'Consultant' } } } } });
if (options.statusCode !== 200) throw new Error('OPTIONS must return 200');

console.log('Resilience IQ assessment API contract tests passed');
