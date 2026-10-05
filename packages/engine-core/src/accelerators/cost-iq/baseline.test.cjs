'use strict';

const assert = require('node:assert/strict');
const adapter = require('./evaluate.cjs');

// Phase 1 baseline contract: these assertions deliberately lock the current
// deterministic Cost IQ release surface before production hardening begins.
const metadata = adapter.metadata();
const questionSet = adapter.questions();

assert.equal(metadata.product, 'Cost IQ');
assert.equal(metadata.baseline.questions, 117);
assert.equal(metadata.baseline.dimensions, 16);
assert.equal(metadata.baseline.findings, 20);
assert.equal(metadata.baseline.recommendations, 10);
assert.equal(metadata.baseline.rules, 0);
assert.equal(metadata.finops.version, '7.1.0');
assert.equal(metadata.finops.capabilities, 22);
assert.equal(metadata.finops.domains, 4);
assert.equal(questionSet.questions.length, 117);
assert.equal(questionSet.dimensions.length, 16);

const empty = adapter.evaluateCostIq({ answers: {} });
assert.equal(empty.headlines.costIQ, null);
assert.equal(empty.headlines.valueIQ, null);
assert.equal(empty.evidence.assessmentCompleteness, 0);
assert.equal(empty.evidence.confidence, 'low');
assert.equal(empty.findings.length, 0);
assert.equal(empty.recommendations.length, 0);
assert.equal(empty.safeguards.signalOnlyExcluded, true);
assert.equal(empty.safeguards.hypothesisExcluded, true);
assert.equal(empty.safeguards.genericThresholdFindingActivation, false);
assert.equal(empty.safeguards.economicPracticalSeparated, true);

// Determinism contract: identical input must produce identical output.
const sample = { answers: {}};
assert.deepEqual(adapter.evaluateCostIq(sample), adapter.evaluateCostIq(sample));

const high = adapter.evaluateCostIq({ answers: { 'CORE-06': 5 } });
assert.equal(high.headlines.costIQ, 100);
assert.equal(high.headlines.valueIQ, null);
assert.equal(high.dimensions.find(d => d.id === 'COST-01').score, 100);
assert.deepEqual(high.findings, []);

const low = adapter.evaluateCostIq({ answers: { 'CORE-06': 1 } });
assert.equal(low.headlines.costIQ, 0);
assert.equal(low.headlines.valueIQ, null);
assert.equal(low.dimensions.find(d => d.id === 'COST-01').score, 0);
assert.deepEqual(low.findings, []);

const calibrated = adapter.evaluateCostIq({ answers: { 'CORE-17': 49 } });
assert.ok(calibrated.findings.some(f => f.id === 'F-002'));

console.log('Cost IQ Phase 1 baseline contract: PASS');
console.log(JSON.stringify({
  questions: questionSet.questions.length,
  dimensions: questionSet.dimensions.length,
  findings: metadata.baseline.findings,
  recommendations: metadata.baseline.recommendations,
  finopsCapabilities: metadata.finops.capabilities,
  finopsDomains: metadata.finops.domains
}, null, 2));
