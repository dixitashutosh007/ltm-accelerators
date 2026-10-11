'use strict';

const assert = require('node:assert/strict');
const { LIFECYCLE } = require('./persistence.cjs');
const { historySummary, sortHistory, createPersistenceAdapter } = require('./persistence-adapter.cjs');

const records = [
  {
    assessmentId: 'old', acceleratorId: 'cost-iq', releaseId: 'R1', methodologyVersion: '6.6.0',
    status: LIFECYCLE.COMPLETED, clientName: 'Old', startedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T01:00:00.000Z', completedAt: '2026-10-01T01:00:00.000Z', resultJson: '{}'
  },
  {
    assessmentId: 'new', acceleratorId: 'cost-iq', releaseId: 'R2', methodologyVersion: '6.7.0',
    status: LIFECYCLE.IN_PROGRESS, clientName: 'New', startedAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T02:00:00.000Z', completedAt: null
  }
];

assert.equal(historySummary(records[0]).assessmentId, 'old');
assert.deepEqual(sortHistory(records).map(x => x.assessmentId), ['new', 'old']);

const calls = [];
const store = {
  async create(x) { calls.push(['create', x.assessmentId]); return x; },
  async update(x) { calls.push(['update', x.assessmentId]); return x; },
  async get(id) { calls.push(['get', id]); return records.find(x => x.assessmentId === id); },
  async list() { calls.push(['list']); return records; }
};

const adapter = createPersistenceAdapter(store);
async function main() {
await adapter.createDraft({ ...records[0], status: LIFECYCLE.DRAFT });
await adapter.saveProgress({ ...records[1] });
assert.equal((await adapter.resume('new')).assessmentId, 'new');
assert.deepEqual((await adapter.history()).map(x => x.assessmentId), ['new', 'old']);
await adapter.complete(records[0]);

assert.deepEqual(calls.map(x => x[0]), ['create', 'update', 'get', 'list', 'update']);

assert.throws(
  () => createPersistenceAdapter({ create() {} }),
  /persistence_store_contract_invalid/
);

await assert.rejects(
  () => adapter.saveProgress({ ...records[0], status: LIFECYCLE.COMPLETED }),
  /active_assessment_required/
);

await assert.rejects(
  () => adapter.complete({ ...records[0], resultJson: null }),
  /completed_result_required/
);

console.log('Cost IQ Phase 4 persistence adapter/history: PASS');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
