'use strict';

const assert = require('node:assert/strict');
const adapter = require('./evaluate.cjs');

const bank = adapter.questions();
const qs = bank.questions;

assert.ok(qs.length > 0, 'Question bank must not be empty');
assert.equal(new Set(qs.map(q => q.id)).size, qs.length, 'Question IDs must be unique');

const optionInteractions = new Set(['single-select', 'multi-select', 'multi-select-ranking', 'ranking']);
const controlInteractions = new Set(['stars', 'range', 'slider']);

for (const q of qs) {
  assert.ok(q.id, 'Every question must have an id');
  assert.ok(q.section, `Question ${q.id} must have a section`);
  assert.ok(q.prompt, `Question ${q.id} must have a prompt`);
  assert.ok(q.interaction, `Question ${q.id} must declare interaction`);
  if (q.required) assert.equal(q.required, true, `Required question ${q.id} must explicitly be true`);
  if (optionInteractions.has(q.interaction)) {
    assert.ok(Array.isArray(q.options) && q.options.length > 0, `Option question ${q.id} must have options`);
  }
  if (controlInteractions.has(q.interaction)) {
    assert.ok(q.control || q.scoring, `Controlled question ${q.id} must expose control/scoring metadata`);
  }
  if (q.interaction === 'stars') {
    assert.equal(q.control?.min, 1, `Stars question ${q.id} must start at 1`);
    assert.equal(q.control?.max, 5, `Stars question ${q.id} must end at 5`);
  }
}

function answerFor(q) {
  const opts = q.options || [];
  const ids = opts.map(x => x.id ?? x.value ?? x);
  switch (q.interaction) {
    case 'multi-select':
      return ids.slice(0, Math.min(2, ids.length));
    case 'multi-select-ranking':
    case 'ranking':
      return ids.slice(0, Math.min(3, ids.length));
    case 'single-select':
      return ids[0];
    case 'stars':
      return q.control?.min ?? 1;
    case 'range':
      return ids[0] ?? q.control?.min ?? 1;
    case 'slider':
      return q.control?.min ?? 1;
    default:
      return q.interaction === 'text' || q.interaction === 'textarea' ? 'Test evidence' : 1;
  }
}

const answers = Object.fromEntries(qs.map(q => [q.id, answerFor(q)]));
let result;
assert.doesNotThrow(() => {
  result = adapter.evaluateCostIq({ answers });
}, 'A structurally valid full answer set must evaluate without throwing');

assert.ok(result && result.headlines, 'Evaluation must return headlines');
assert.ok(result.evidence, 'Evaluation must return evidence');
assert.ok(Array.isArray(result.dimensions), 'Evaluation must return dimensions');
assert.equal(result.dimensions.length, bank.dimensions.length, 'All configured dimensions must be returned');

const repeat = adapter.evaluateCostIq({ answers });
assert.deepEqual(result, repeat, 'Full valid answer set must be deterministic');

const missingOne = { ...answers };
delete missingOne[qs[0].id];
const partial = adapter.evaluateCostIq({ answers: missingOne });
assert.ok(partial && partial.evidence, 'Partial assessment must still return evidence metadata');
assert.ok(Number(partial.evidence.assessmentCompleteness) < 100, 'Removing one answer must reduce completeness');

console.log('Cost IQ Phase 2 assessment/scoring hardening: PASS');
console.log(JSON.stringify({
  questions: qs.length,
  interactions: [...new Set(qs.map(q => q.interaction))],
  dimensions: bank.dimensions.length,
  completenessFull: result.evidence.assessmentCompleteness,
  completenessPartial: partial.evidence.assessmentCompleteness
}, null, 2));
