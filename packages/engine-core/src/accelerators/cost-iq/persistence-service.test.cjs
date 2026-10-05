'use strict';

const assert = require('node:assert/strict');
const { LIFECYCLE } = require('./persistence.cjs');
const { createCostIqPersistenceService } = require('./persistence-service.cjs');

async function main() {
const db = new Map();
const store = {
  async create(record) { db.set(record.assessmentId, { ...record }); return db.get(record.assessmentId); },
  async update(record) { db.set(record.assessmentId, { ...record }); return db.get(record.assessmentId); },
  async get(id) { return db.get(id) || null; },
  async list() { return [...db.values()]; }
};
const clock = () => '2026-10-05T00:00:00.000Z';
const service = createCostIqPersistenceService(store, clock);

const draft = await service.createDraft({
  assessmentId: 'A1',
  releaseId: 'COSTIQ-0.7.8-DRAFT',
  methodologyVersion: '6.6.0',
  selectedAreas: ['Cloud Economics'],
  answers: { 'CORE-06': 5 }
});
assert.equal(draft.status, LIFECYCLE.DRAFT);

const resumed = await service.resume('A1');
assert.equal(resumed.assessmentId, 'A1');
assert.deepEqual(resumed.answers, { 'CORE-06': 5 });

const progressed = await service.saveProgress({
  ...draft,
  status: LIFECYCLE.IN_PROGRESS,
  answersJson: JSON.stringify({ 'CORE-06': 4 })
});
assert.equal(progressed.status, LIFECYCLE.IN_PROGRESS);

const history = await service.history();
assert.equal(history.length, 1);
assert.equal(history[0].methodologyVersion, '6.6.0');

const completed = await service.complete(
  progressed,
  { headlines: { costIQ: 80 } }
);
assert.equal(completed.status, LIFECYCLE.COMPLETED);
assert.ok(completed.completedAt);
assert.ok(completed.resultJson);

const final = await service.resume('A1');
assert.equal(final.status, LIFECYCLE.COMPLETED);
assert.deepEqual(final.result, { headlines: { costIQ: 80 } });

console.log('Cost IQ Phase 5 persistence service: PASS');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
