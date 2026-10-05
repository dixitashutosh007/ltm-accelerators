const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const bank = read('resilience-iq/knowledge/question-bank.json');
const scoring = read('resilience-iq/knowledge/scoring-model.json');
const tree = read('resilience-iq/knowledge/decision-tree.json');

const errors = [];
const warnings = [];
const allowedTypes = new Set(bank.answer_types || []);
const statuses = new Set(bank.editor_contract?.governance?.status_values || []);
const questions = [...(bank.executive_questions || []), ...(bank.advisory_questions || [])];
const byId = new Map();

for (const q of questions) {
  if (!q.id) errors.push('Question missing id');
  else if (byId.has(q.id)) errors.push('Duplicate question id: ' + q.id);
  else byId.set(q.id, q);
  if (!q.domain) errors.push((q.id || '?') + ': domain missing');
  if (!q.taxonomy) errors.push((q.id || '?') + ': taxonomy missing');
  if (!q.text) errors.push((q.id || '?') + ': text missing');
  if (!allowedTypes.has(q.type)) errors.push((q.id || '?') + ': unsupported type ' + q.type);
  if (q.required !== true && q.required !== false) warnings.push((q.id || '?') + ': required should be explicit boolean');
  if (q.status && !statuses.has(q.status)) errors.push(q.id + ': invalid status ' + q.status);
  if (q.options && !Array.isArray(q.options)) errors.push(q.id + ': options must be an array');
  if (q.type && ['single_select','multi_select','slider_choice','matrix','ranking','scenario','yes_no','evidence_select'].includes(q.type) && (!Array.isArray(q.options) || q.options.length === 0) && q.type !== 'matrix') errors.push(q.id + ': selectable question has no options');
  if (q.ui?.interaction && !['single_select','multi_select','slider_choice','matrix','ranking','scenario','number','text','yes_no','evidence_select'].includes(q.ui.interaction)) errors.push(q.id + ': unsupported UI interaction');
  if (['single_select','multi_select','slider_choice','matrix','ranking','scenario','number','text','yes_no','evidence_select'].includes(q.type)) {
    if (!q.ui?.interaction) errors.push(q.id + ': interactive question needs ui.interaction');
    if (!q.ui?.instruction) errors.push(q.id + ': interactive question needs ui.instruction');
  }
  if (['ranking','slider_choice','matrix','scenario'].includes(q.ui?.interaction) && !q.ui?.instruction) errors.push(q.id + ': interactive UI needs instruction');
  if (q.type === 'matrix') {
    if (!Array.isArray(q.ui?.rows) || !q.ui.rows.length) errors.push(q.id + ': matrix needs ui.rows');
    if (!Array.isArray(q.ui?.columns) || !q.ui.columns.length) errors.push(q.id + ': matrix needs ui.columns');
  }
}
for (const q of bank.executive_questions || []) {
  if (!scoring.question_scoring?.[q.id]) errors.push(q.id + ': required executive question has no question_scoring entry');
}
for (const [id, meta] of Object.entries(scoring.question_scoring || {})) {
  if (!byId.has(id)) errors.push('Scoring references unknown question: ' + id);
  if (meta.scores && !Object.keys(meta.scores).length) errors.push(id + ': scoring.scores is empty');
}
for (const id of tree.entry_sequence || []) if (!byId.has(id)) errors.push('Decision tree entry_sequence references unknown question: ' + id);
for (const rule of tree.branching_rules || []) {
  if (!rule.id) errors.push('Branching rule missing id');
  if (!rule.when || typeof rule.when !== 'object') errors.push((rule.id || '?') + ': when must be an object');
  if (!rule.then || typeof rule.then !== 'object') errors.push((rule.id || '?') + ': then must be an object');
  if (rule.when?.question && !rule.when?.condition) errors.push(rule.id + ': question-based rule needs when.condition');
  if (rule.when?.multiple && (!Array.isArray(rule.when.multiple) || !rule.when.multiple.length)) errors.push(rule.id + ': when.multiple must be a non-empty array');
  const qid = rule.when?.question;
  if (qid && !byId.has(qid)) errors.push(rule.id + ': when.question references unknown question ' + qid);
  for (const id of rule.then?.add_questions || []) if (!byId.has(id)) errors.push(rule.id + ': add_questions references unknown question ' + id);
  for (const id of rule.then?.require_questions || []) if (!byId.has(id)) errors.push(rule.id + ': require_questions references unknown question ' + id);
}
const contract = bank.editor_contract?.fields || [];
for (const f of ['id','domain','taxonomy','text','type','options','required','evidence','ui','scoring','branching','framework_mappings','version','status']) {
  if (!contract.includes(f)) errors.push('editor_contract missing field: ' + f);
}
if (bank.editor_contract?.governance?.id_immutable !== true) errors.push('editor_contract must make question IDs immutable');
if (errors.length) {
  console.error('Resilience IQ Question Bank validation FAILED');
  errors.forEach(e => console.error('ERROR:', e));
  process.exit(1);
}
console.log('Resilience IQ Question Bank validation PASSED');
console.log('Questions:', questions.length, '| Executive:', (bank.executive_questions || []).length, '| Advisory:', (bank.advisory_questions || []).length);
console.log('Branching rules:', (tree.branching_rules || []).length, '| Scored executive questions:', Object.keys(scoring.question_scoring || {}).length);
warnings.forEach(w => console.warn('WARN:', w));
