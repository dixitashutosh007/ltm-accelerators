'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const adapter = require('./evaluate.cjs');

function answerFor(question) {
  const ids = (question.options || []).map(option => option.id ?? option.value ?? option);
  switch (question.interaction) {
    case 'multi-select': return ids.slice(0, 2);
    case 'multi-select-ranking':
    case 'ranking': return ids.slice(0, 3);
    case 'single-select': return ids[0];
    case 'stars': return question.control?.min ?? 1;
    case 'range':
    case 'slider': return question.control?.min ?? ids[0] ?? 1;
    default: return question.interaction === 'text' || question.interaction === 'textarea' ? 'Test evidence' : 1;
  }
}

const html = fs.readFileSync('Accelerators/cost-iq-v10.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length, 'Cost IQ page has its application script');
const script = scripts.at(-1)[1].replace(/\nboot\(\);\s*$/, '\n');
const app = { innerHTML: '' };
const context = {
  document: { getElementById: id => id === 'app' ? app : null },
  window: {},
  console
};
vm.runInNewContext(script, context, { filename: 'cost-iq-v10.html:inline-script' });

const bank = adapter.questions();
const answers = Object.fromEntries(bank.questions.map(question => [question.id, answerFor(question)]));
const deterministic = adapter.evaluateCostIq({ answers });
context.__setAssessment = vm.runInContext('value => { assessment = value; }', context);
context.__setAssessment(deterministic);
vm.runInContext(`renderReport({
  executiveSummary: 'AI unavailable during this assessment.',
  priorityAreas: [], opportunities: [], roadmap: [], consultingRecommendations: []
})`, context);

for (const section of [
  'CONCENTRATION HEAT MAP',
  'DIMENSION RADAR',
  'VALUE AREAS',
  'What leadership should know',
  'Potential value levers',
  'Recommended action path',
  'Deterministic findings'
]) assert.ok(app.innerHTML.includes(section), `report includes ${section} without AI content`);
assert.ok(app.innerHTML.includes('0-30 days'), 'deterministic roadmap fallback is present');
assert.ok(app.innerHTML.includes(String(deterministic.headlines.costIQ)), 'deterministic Cost IQ score is shown');
assert.ok(app.innerHTML.includes('AI unavailable during this assessment.'), 'available deterministic report narrative is retained');

console.log('Cost IQ deterministic report fallback: PASS');
