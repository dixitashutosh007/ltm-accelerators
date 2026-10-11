'use strict';

const assert = require('node:assert/strict');
const { ROUTES, validateCreate, validateUpdate, validateComplete } = require('./persistence-api-contract.cjs');

assert.equal(ROUTES.CREATE, 'POST /assessment');
assert.equal(ROUTES.UPDATE, 'PUT /assessment/{id}');
assert.equal(ROUTES.GET, 'GET /assessment/{id}');
assert.equal(ROUTES.HISTORY, 'GET /assessment/history');
assert.equal(ROUTES.COMPLETE, 'POST /assessment/{id}/complete');

assert.deepEqual(
  validateCreate({ releaseId: 'R1', methodologyVersion: '6.6.0', selectedAreas: [], answers: {}, assessmentId: 'A1' }),
  { valid: true }
);
assert.equal(validateCreate({ assessmentId: 'A1' }).error, 'missing_required_fields');
assert.equal(validateCreate({ assessmentId: 'A1', releaseId: 'R1', methodologyVersion: '6.6.0', selectedAreas: {}, answers: {} }).error, 'selectedAreas_array_required');
assert.equal(validateCreate({ assessmentId: 'A1', releaseId: 'R1', methodologyVersion: '6.6.0', selectedAreas: [], answers: [] }).error, 'answers_object_required');

assert.deepEqual(validateUpdate({ assessmentId: 'A1', status: 'in_progress' }), { valid: true });
assert.equal(validateUpdate({ status: 'in_progress' }).error, 'assessmentId_required');

assert.deepEqual(validateComplete({ assessmentId: 'A1', result: { headlines: {} } }), { valid: true });
assert.equal(validateComplete({ assessmentId: 'A1' }).error, 'result_required');

console.log('Cost IQ Phase 5 persistence API contract: PASS');
