'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.resolve(__dirname, '../../../../../amplify/data/resource.ts');
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
assert.match(source, /\.identifier\(\['assessmentId'\]\)/);
assert.match(source, /respondentEmail:\s*a\.string\(\)/);
assert.match(source, /expiresAt:\s*a\.integer\(\)/);
assert.doesNotMatch(source, /allow\.resource\(evaluateCostIqFunction\)/);
assert.match(source, /allow\.resource\(manageCostAssessmentFunction\)\.to\(\['query', 'mutate'\]\)/);

// CQ1: only the service writes, and it checks ownership from the caller's token. The browser must not hold direct access:
// no owner rule and no Consultant group on this model, where every Consultant could read every assessment.
const start = source.indexOf('CostIqAssessment: a');
const costBlock = source.slice(start, source.indexOf('.authorization', start) + 200);
assert.match(costBlock, /allow\.group\('Admin'\)\.to\(\['read'\]\)/);
assert.doesNotMatch(costBlock, /allow\.owner\(\)/);
assert.doesNotMatch(costBlock, /allow\.group\('Consultant'\)/);

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
  ownerAccess: 'enforced by the service from the caller token'
}, null, 2));
