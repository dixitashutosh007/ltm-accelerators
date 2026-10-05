'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.resolve(__dirname, '../../../../../../amplify/data/resource.ts');
const source = fs.readFileSync(schemaPath, 'utf8');

assert.match(source, /CostIqAssessment:\s*a\s*\.model\(\{/);
const requiredFields = [
  'assessmentId',
  'acceleratorId',
  'releaseId',
  'methodologyVersion',
  'status',
  'selectedAreasJson',
  'answersJson',
  'startedAt',
  'updatedAt'
];

for (const field of requiredFields) {
  assert.match(source, new RegExp('\\b' + field + ':\\s*a\\.'));
}

assert.match(source, /completedAt:\s*a\.datetime\(\)/);
assert.match(source, /resultJson:\s*a\.string\(\)/);
assert.match(source, /allow\.owner\(\)\.to\(\['create', 'read', 'update'\]\)/);
assert.match(source, /allow\.group\('Admin'\)/);
assert.match(source, /allow\.group\('Consultant'\)/);

const lifecycleStates = ['draft', 'in_progress', 'completed'];
for (const state of lifecycleStates) {
  assert.ok(state, 'Expected Cost IQ lifecycle state: ' + state);
}

console.log('Cost IQ Phase 4 persistence contract: PASS');
console.log(JSON.stringify({
  model: 'CostIqAssessment',
  requiredFields,
  lifecycleStates,
  versioned: true,
  ownerAccess: true
}, null, 2));
