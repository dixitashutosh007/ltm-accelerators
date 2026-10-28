'use strict';
/**
 * Claims register checks (workstream WS-S2, docs/cio-readiness/FRAMEWORK.md).
 * Run from check-repo.cjs. Returns a list of failure strings.
 *
 *  1. Every claim has the required fields in the right form (claim.schema.json).
 *  2. Claim ids are unique.
 *  3. A claim relied on as sourced (V, S, P, COUNSEL) has a source URL and a checked date.
 *  4. An UNSOURCED claim is never client-visible (design Q7) and says what would settle it.
 *  5. No claim is past its review date; volatile claims are reviewed at least every 90 days (D8).
 *  6. Every claim id referenced from a registered knowledge file exists in the register.
 *  7. Banned overclaiming phrases do not appear in registered client-facing files.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const REGISTER = 'packages/engine-core/src/claims/claims-register.json';
const SCHEMA = 'packages/engine-core/src/claims/claim.schema.json';
// Knowledge files whose claim references must resolve. Add each accelerator's registry as it is sourced.
const FINOPS_REGISTRY = [
  'capabilities.json', 'levers.json', 'thresholds.json', 'market-data.json', 'provider-statements.json', 'assumptions.json', 'workstreams.json'
].map(f => `packages/engine-core/src/accelerators/finops-iq/registry/${f}`);
// FinOps IQ v3 engine content (plans F3 and F4): the merged question bank, the engine's and the value model's wording and rules.
const FINOPS_V3 = ['question-bank.json', 'engine-rules.json', 'value-rules.json'].map(f => `packages/engine-core/src/accelerators/finops-iq/v3/${f}`);
// Shared catalogues (WS-S3 platform playbook, WS-S5 offerings), FinOps IQ the first consumer (execution phase M5).
const SHARED_CATALOGUES = [
  'packages/engine-core/src/playbook/finops-iq.json', 'packages/engine-core/src/offerings/finops-iq.json',
  // Sovereign IQ S7 and S8 (placement ladder, SEAL view, platform playbook, offerings).
  'packages/engine-core/src/playbook/sovereign-iq.json', 'packages/engine-core/src/offerings/sovereign-iq.json',
  'packages/engine-core/src/accelerators/sovereign-iq/v4/placement-ladder.json', 'packages/engine-core/src/accelerators/sovereign-iq/v4/seal.json'
];
const REFERENCING_FILES = [
  'packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json',
  ...FINOPS_REGISTRY,
  ...FINOPS_V3,
  ...SHARED_CATALOGUES
];
// Client-facing files checked for banned phrases (decision D8 / plan S2 item 7). Add pages as they are rebuilt.
const LANGUAGE_CHECKED = [
  'packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json',
  ...FINOPS_REGISTRY,
  ...FINOPS_V3,
  ...SHARED_CATALOGUES
];
// One list, shared with the report checks at report time (packages/engine-core/src/report-checks, R5).
const BANNED = require('../packages/engine-core/src/report-checks/banned-phrases.json').phrases.map(p => new RegExp(p.pattern, p.flags));

function checkClaims({ today = new Date().toISOString().slice(0, 10), register: registerOverride, files } = {}) {
  const failures = [];
  const fail = (rule, detail) => failures.push(`[claims-${rule}] ${detail}`);
  const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const schema = read(SCHEMA);
  const register = registerOverride || read(REGISTER);
  const fileText = f => (files && f in files) ? files[f] : (fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : null);
  const props = schema.properties;
  const required = schema.required;
  const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
  const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

  const ids = new Set();
  for (const c of register.claims || []) {
    const id = c.id || '(no id)';
    for (const k of required) if (c[k] === undefined || c[k] === '') fail('field', `${id}: missing ${k}`);
    for (const k of Object.keys(c)) if (!props[k]) fail('field', `${id}: unknown field ${k}`);
    if (c.id && !new RegExp(props.id.pattern).test(c.id)) fail('field', `${id}: id must match ${props.id.pattern}`);
    if (c.kind && !props.kind.enum.includes(c.kind)) fail('field', `${id}: unknown kind ${c.kind}`);
    if (c.verification && !props.verification.enum.includes(c.verification)) fail('field', `${id}: unknown verification ${c.verification}`);
    for (const k of ['checkedOn', 'lastReviewed', 'nextReview']) if (c[k] !== undefined && !isDate(c[k])) fail('field', `${id}: ${k} must be YYYY-MM-DD`);
    if (ids.has(c.id)) fail('duplicate', `${id} appears more than once`);
    ids.add(c.id);

    if (c.verification && c.verification !== 'UNSOURCED') {
      if (!c.source || !/^https:\/\//.test(c.source.url || '') || !c.source.title) fail('source', `${id}: verification ${c.verification} needs source.url (https) and source.title`);
      if (!isDate(c.checkedOn)) fail('source', `${id}: verification ${c.verification} needs checkedOn`);
    } else if (c.verification === 'UNSOURCED') {
      if (c.clientVisible !== false) fail('unsourced', `${id}: UNSOURCED claims must set clientVisible: false`);
      if (!c.basisNote) fail('unsourced', `${id}: UNSOURCED claims need basisNote saying what would settle them`);
    }
    if (isDate(c.nextReview) && c.nextReview < today) fail('overdue', `${id}: review was due ${c.nextReview}`);
    if (c.volatile && isDate(c.lastReviewed) && isDate(c.nextReview) && days(c.lastReviewed, c.nextReview) > 90) fail('volatile', `${id}: volatile claims are reviewed at least every 90 days`);
  }

  const refRe = /CLM-[A-Z]{2,5}-[0-9]{3,}/g;
  for (const f of REFERENCING_FILES) {
    const text = fileText(f);
    if (text === null) continue;
    for (const ref of new Set(text.match(refRe) || [])) if (!ids.has(ref)) fail('missing', `${f} refers to ${ref}, which is not in the register`);
  }
  for (const f of LANGUAGE_CHECKED) {
    const text = fileText(f);
    if (text === null) continue;
    for (const re of BANNED) { const m = text.match(re); if (m) fail('language', `${f}: banned phrase "${m[0]}"`); }
  }
  return failures;
}

module.exports = { checkClaims, BANNED, REFERENCING_FILES, LANGUAGE_CHECKED };
if (require.main === module) {
  const f = checkClaims();
  if (f.length) { console.error('Claims checks failed:\n' + f.map(x => '  - ' + x).join('\n')); process.exit(1); }
  console.log('Claims checks passed.');
}
