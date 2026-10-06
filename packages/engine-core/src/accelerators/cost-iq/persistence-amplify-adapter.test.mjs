import assert from 'node:assert/strict';
import { createCostIqAmplifyAdapter } from './persistence-amplify-adapter.js';

const calls = [];
const record = {
  assessmentId: 'A-100',
  acceleratorId: 'cost-iq-v10',
  releaseId: 'COSTIQ-0.7.8-DRAFT',
  methodologyVersion: 'master-v6.6.0',
  status: 'draft',
  selectedAreasJson: '[\"Cloud Economics\"]',
  answersJson: '{}',
  startedAt: '2026-10-05T12:00:00.000Z',
  updatedAt: '2026-10-05T12:00:00.000Z'
};

const client = {
  models: {
    CostIqAssessment: {
      async create(input) {
        calls.push(['create', input]);
        return { data: input };
      },
      async update(input) {
        calls.push(['update', input]);
        return { data: input };
      },
      async get(input) {
        calls.push(['get', input]);
        return { data: record };
      },
      async list() {
        calls.push(['list']);
        return { data: [record] };
      }
    }
  }
};

const adapter = createCostIqAmplifyAdapter(client);

assert.deepEqual(await adapter.create(record), record);
assert.deepEqual(await adapter.update({ ...record, status: 'in_progress' }), { ...record, status: 'in_progress' });
assert.deepEqual(await adapter.get('A-100'), record);
assert.deepEqual(await adapter.list(), [record]);

assert.deepEqual(calls, [
  ['create', record],
  ['update', { ...record, status: 'in_progress' }],
  ['get', { assessmentId: 'A-100' }],
  ['list']
]);

await assert.rejects(
  () => createCostIqAmplifyAdapter({}).get('A-100'),
  /not configured/
);

const failingClient = {
  models: {
    CostIqAssessment: {
      async create() {
        return { data: null, errors: [{ message: 'owner authorization denied' }] };
      },
      async update() { return { data: null }; },
      async get() { return { data: null }; },
      async list() { return { data: [] }; }
    }
  }
};

await assert.rejects(
  () => createCostIqAmplifyAdapter(failingClient).create(record),
  /owner authorization denied/
);

console.log('Cost IQ Amplify adapter contract: PASS');
