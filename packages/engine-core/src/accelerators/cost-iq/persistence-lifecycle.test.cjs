'use strict';

const assert = require('node:assert/strict');
const {
  LIFECYCLE,
  createAssessmentSnapshot,
  transitionAssessment,
  toPersistenceRecord,
  fromPersistenceRecord
} = require('./persistence.cjs');

const clock = () => '2026-10-05T00:00:00.000Z';
const base = createAssessmentSnapshot({
  assessmentId: 'cost-001',
  releaseId: 'COSTIQ-0.7.8-DRAFT',
  methodologyVersion: '6.6.0',
  selectedAreas: ['Cloud Economics'],
  answers: { 'CORE-06': 5 }
}, clock);

assert.equal(base.status, LIFECYCLE.DRAFT);
assert.equal(base.result, null);

const started = transitionAssessment(base, LIFECYCLE.IN_PROGRESS, undefined, clock);
assert.equal(started.status, LIFECYCLE.IN_PROGRESS);

assert.throws(
  () => transitionAssessment(started, LIFECYCLE.COMPLETED, undefined, clock),
  /completed_result_required/
);

const result = { headlines: { costIQ: 100, valueIQ: null } };
const completed = transitionAssessment(started, LIFECYCLE.COMPLETED, result, clock);
assert.equal(completed.status, LIFECYCLE.COMPLETED);
assert.deepEqual(completed.result, result);
assert.equal(completed.completedAt, clock());

assert.throws(
  () => transitionAssessment(completed, LIFECYCLE.IN_PROGRESS, undefined, clock),
  /completed_assessment_immutable/
);

const record = toPersistenceRecord(completed);
assert.equal(record.acceleratorId, 'cost-iq');
assert.equal(record.releaseId, base.releaseId);
assert.equal(record.methodologyVersion, base.methodologyVersion);
assert.equal(record.resultJson, JSON.stringify(result));

const restored = fromPersistenceRecord(record);
assert.deepEqual(restored, completed);

assert.throws(
  () => createAssessmentSnapshot({ assessmentId: 'x' }, clock),
  /releaseId_required/
);

console.log('Cost IQ Phase 4 persistence lifecycle: PASS');
console.log(JSON.stringify({
  save: true,
  resume: true,
  complete: true,
  immutableCompleted: true,
  serializeRoundTrip: true,
  methodologyVersioned: true
}, null, 2));
