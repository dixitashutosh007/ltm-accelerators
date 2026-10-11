'use strict';
/**
 * Repository guard rails, run in CI on every pull request (npm run check:repo).
 * Each rule protects a Phase 0/1 fix from silently regressing.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const fail = (rule, file, detail) => failures.push(`[${rule}] ${file}${detail ? ': ' + detail : ''}`);

// Cost IQ and Resilience IQ are maintained separately (another toolchain) and are not held to
// these rules here. They are listed explicitly so any other file still gets checked.
const SEPARATELY_MAINTAINED = [
  /^Accelerators\/cost-iq/, /^Accelerators\/resilience-iq/, /^Accelerators\/assets\/cost-iq-/,
  /^amplify\/functions\/(evaluate-cost-iq|evaluate-resilience-iq|manage-resilience-evidence)\//,
  /^packages\/engine-core\/src\/accelerators\/(cost-iq|resilience-iq)\//,
  /^resilience-iq\//, /^scripts\/(generate-cost-iq|validate-cost-iq|validate-resilience)/
];
const separatelyMaintained = f => SEPARATELY_MAINTAINED.some(re => re.test(f));

const isText = f => /\.(html|js|cjs|mjs|ts|json|yml|yaml|md)$/.test(f) && !f.endsWith('package-lock.json') && !separatelyMaintained(f);
const textFiles = tracked.filter(isText);
const sitePages = tracked.filter(f => /^Accelerators\/[^/]+\.html$/.test(f) && !separatelyMaintained(f));
const siteScripts = tracked.filter(f => /^Accelerators\/.*\.js$/.test(f) && !separatelyMaintained(f));
const codeFiles = textFiles.filter(f => /^(Accelerators|amplify|services|packages|scripts)\//.test(f));

// 1. No hard-coded API Gateway hosts in the frontend: the address comes from runtime config.
for (const f of [...sitePages, ...siteScripts]) {
  if (f === 'Accelerators/assets/runtime-config.js') continue;
  const m = read(f).match(/https:\/\/[a-z0-9]{10}\.execute-api\.[a-z0-9-]+\.amazonaws\.com/);
  if (m) fail('hard-coded-api', f, m[0]);
}

// 2. Personal email addresses only in the central config (and docs/tests/archive).
const allowEmail = new Set(['amplify/config.ts']);
for (const f of codeFiles) {
  if (allowEmail.has(f)) continue;
  const m = read(f).match(/[a-z0-9._%+-]+@(gmail|yahoo|hotmail|outlook)\.com/i);
  if (m) fail('personal-email', f, m[0]);
}

// 3. No wildcard CORS in backend code.
for (const f of codeFiles.filter(f => /^(amplify|services)\//.test(f))) {
  if (/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/.test(read(f))) fail('wildcard-cors', f);
}

// 4. Identity never comes from the request body.
// (Test suites are exempt: they send a spoofed requesterEmail on purpose to prove it is ignored.)
for (const f of codeFiles.filter(f => /^(Accelerators|services|amplify)\//.test(f) && !/\/test\//.test(f))) {
  if (/requesterEmail/.test(read(f))) fail('client-asserted-identity', f, 'requesterEmail');
}

// 5. The security policy is defined once, in customHttp.yml.
for (const f of sitePages) {
  if (/http-equiv=["']Content-Security-Policy["']/i.test(read(f))) fail('meta-csp', f, 'use customHttp.yml');
}
if (!fs.existsSync(path.join(root, 'customHttp.yml')) || !/Content-Security-Policy/.test(read('customHttp.yml'))) {
  fail('csp-missing', 'customHttp.yml');
}

// 6. Guarded pages load the shared API client first.
for (const f of sitePages) {
  const s = read(f);
  const guard = s.indexOf('/assets/rbac-guard.js');
  if (guard === -1) continue;
  const client = s.indexOf('/assets/ltm-api.js');
  const config = s.indexOf('/assets/runtime-config.js');
  if (client === -1 || config === -1 || client > guard || config > client) {
    fail('script-order', f, 'needs runtime-config.js, then ltm-api.js, before rbac-guard.js');
  }
}

// 7. Every inline script in every page must at least parse.
for (const f of sitePages) {
  const s = read(f);
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(s))) {
    i++;
    if (/type=["'](?!text\/javascript|module)[^"']+["']/i.test(m[1])) continue; // JSON / templates
    try {
      new vm.Script(m[2], { filename: `${f}#script${i}` });
    } catch (e) {
      fail('inline-script-syntax', f, `script #${i}: ${e.message}`);
    }
  }
}

// 8. No obvious secrets committed.
const secretPatterns = [/AKIA[0-9A-Z]{16}/, /\bsk-(proj-)?[A-Za-z0-9_-]{20,}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/];
for (const f of textFiles) {
  const s = read(f);
  for (const re of secretPatterns) if (re.test(s)) fail('secret', f, re.source);
}

// 9. One platform brand: every page is titled "… LTM Vantage", and retired brand variants stay retired.
//    The practice that delivers the work is named "LTM Infrastructure Tech Advisory" (docs/BRAND.md).
for (const f of sitePages) {
  const s = read(f);
  const title = (s.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  if (!/LTM Vantage/.test(title)) fail('brand-title', f, `title "${title}" should name LTM Vantage`);
  const m = s.match(/LTM CIS\b|LTM · CIS|Infrastructure Tech Advisory \(CIS\)|Advisory Accelerators Platform/);
  if (m) fail('brand-retired', f, m[0]);
}

if (failures.length) {
  console.error(`Repository checks failed (${failures.length}):\n` + failures.map(x => '  - ' + x).join('\n'));
  process.exit(1);
}
console.log(`Repository checks passed (${sitePages.length} pages, ${codeFiles.length} code files).`);
