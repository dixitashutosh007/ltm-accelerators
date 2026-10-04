'use strict';
/**
 * Builds the first-pass Claims Register inventory (Phase 1 -> input to Phase 3 fact-checking).
 *
 * Scans each accelerator's knowledge base and scoring engine for statements a CIO could ask
 * "where does that come from?" about:
 *   - regulatory   : citations, penalty rules, statute references
 *   - statistic    : text containing percentages, money amounts or "x" multipliers
 *   - benchmark    : peer medians / percentiles / benchmark tables
 *   - formula      : numeric constants in engine code that drive scores or money figures
 *
 * Output: docs/claims-register/claims-inventory.csv (one row per candidate claim, status "unreviewed").
 * Re-run after content changes: npm run claims:extract
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const accRoot = path.join(root, 'packages/engine-core/src/accelerators');
const outFile = path.join(root, 'docs/claims-register/claims-inventory.csv');

const rows = [];
const add = (accelerator, type, file, location, text) => {
  const clean = String(text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  rows.push({ accelerator, type, file: path.relative(root, file), location, text: clean.slice(0, 400) });
};

const REG = /\b(Art\.?|Article|Regulation|Directive|GDPR|DORA|NIS2|AI Act|PDPL|SAMA|NCA|MAS|APRA|CPS ?230|DPDP|RBI|HKMA|APPI|CLOUD Act|FISA|PIPL|SOCI|PDPA|ISMAP|SecNumCloud|C5|EUCS|EBA|CRR)\b/;
const STAT = /(\d+(\.\d+)?\s?%|[$€£]\s?\d|\b\d+(\.\d+)?\s?x\b|\b\d+(\.\d+)?\s?(M|B|bn|million|billion)\b)/i;
const BENCH = /\b(median|percentile|benchmark|peer|industry average|top quartile|best-in-class)\b/i;

function walkKb(acc, file, node, jsonPath) {
  if (Array.isArray(node)) return node.forEach((v, i) => walkKb(acc, file, v, `${jsonPath}[${i}]`));
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const p = `${jsonPath}.${k}`;
      if (/^(benchmarks|peerBenchmarks|percentiles)$/i.test(k) && v && typeof v === 'object') {
        add(acc, 'benchmark', file, p, JSON.stringify(v).slice(0, 400));
        continue;
      }
      if (/^(citation|penalty_rule|statuteBasis|statutoryConflict)$/i.test(k) && typeof v === 'string') {
        add(acc, 'regulatory', file, p, v);
        continue;
      }
      walkKb(acc, file, v, p);
    }
    return;
  }
  if (typeof node === 'string' && node.length > 12) {
    if (REG.test(node) && /(fine|penalt|turnover|requires?|mandat|obligat|must|within|hours?|days?)/i.test(node)) add(acc, 'regulatory', file, jsonPath, node);
    else if (STAT.test(node)) add(acc, 'statistic', file, jsonPath, node);
    else if (BENCH.test(node)) add(acc, 'benchmark', file, jsonPath, node);
  }
}

function scanEngine(acc, file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    if (/^\s*(import|export (interface|type)|\*|\/\*)/.test(line) || /^\s*(case|return \{)/.test(line)) return;
    // Decimal multipliers (0.85, 8.5, 0.04), money-scale numbers (>= 1000) and percentage maths.
    const numbers = code.match(/(?<![\w.])(\d+\.\d+|\d{4,}(_\d{3})*)(?![\w.])/g) || [];
    const meaningful = numbers.filter(n => !/^(0\.5|1\.0|100\.0)$/.test(n));
    if (meaningful.length && /[*\/+-]|Math\.|:\s*\d/.test(code)) {
      add(acc, 'formula', file, `line ${i + 1}`, line.trim());
    } else if (/['"`][^'"`]*\b(Art\.|Article)\s*\d+/.test(code) || (/['"`]/.test(code) && STAT.test(code) && REG.test(code))) {
      add(acc, 'regulatory', file, `line ${i + 1}`, line.trim());
    }
  });
}

for (const acc of fs.readdirSync(accRoot).sort()) {
  const dir = path.join(accRoot, acc);
  const kbFile = path.join(dir, 'knowledge-base.json');
  if (fs.existsSync(kbFile)) walkKb(acc, kbFile, JSON.parse(fs.readFileSync(kbFile, 'utf8')), '$');
  for (const f of ['evaluate.ts', 'evaluate.cjs']) {
    const engine = path.join(dir, f);
    if (fs.existsSync(engine)) scanEngine(acc, engine);
  }
}

const header = ['id', 'accelerator', 'type', 'claim_or_constant', 'location', 'source_file', 'source_citation', 'owner', 'status', 'last_reviewed', 'next_review'];
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const counters = {};
const csv = [header.join(',')].concat(rows.map(r => {
  const prefix = r.accelerator.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  counters[prefix] = (counters[prefix] || 0) + 1;
  const id = `${prefix}-${String(counters[prefix]).padStart(4, '0')}`;
  return [id, r.accelerator, r.type, r.text, r.location, r.file, '', '', 'unreviewed', '', ''].map(esc).join(',');
}));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, csv.join('\n') + '\n');

const summary = {};
for (const r of rows) {
  summary[r.accelerator] = summary[r.accelerator] || { regulatory: 0, statistic: 0, benchmark: 0, formula: 0 };
  summary[r.accelerator][r.type]++;
}
console.log(`Wrote ${rows.length} candidate claims to ${path.relative(root, outFile)}`);
console.table(summary);
