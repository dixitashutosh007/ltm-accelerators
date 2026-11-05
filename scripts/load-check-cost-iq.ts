/**
 * Cost IQ load check (CQ10): the scoring call and the report at realistic input size, in process (no network), so the
 * numbers are the compute cost only. Realistic is a fully answered assessment over every focus area (the eval set's
 * answers); worst case adds a 256 KB body of answers. Writes docs/cio-readiness/cost-iq/CQ10-LOAD.md.
 *   npx tsx scripts/load-check-cost-iq.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { costIqReport, type CostIqReportInput, type CostIqResult } from '../packages/engine-core/src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../packages/engine-core/src/report-checks/accelerators';
import { renderPdf } from '../packages/engine-core/src/report/pdf';
import { evaluate } from '../amplify/functions/evaluate-cost-iq/handler';
import { EVAL_SET } from '../packages/engine-core/test/support/cost-iq-eval-set';

const require = createRequire(import.meta.url);
const adapter = require('../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../packages/engine-core/src/accelerators/cost-iq/canon/config/master-v6.6.json');
const AREAS: string[] = cfg.settings.selection.defaultAreas;
const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const ms = (n: number) => `${n.toFixed(1)} ms`;

const rows: string[] = [];

// 1. Scoring: 300 evaluations of the eval-set inputs (realistic size).
const t: number[] = [];
for (let i = 0; i < 300; i++) {
  const a = EVAL_SET[i % EVAL_SET.length].answers;
  const s = performance.now();
  await adapter.evaluateCostIq({ answers: a, scope: { selectedAreas: AREAS } });
  t.push(performance.now() - s);
}
rows.push(`| Score one fully answered assessment (300 runs, 15 inputs) | ${ms(pct(t, 0.5))} | ${ms(pct(t, 0.95))} | ${ms(Math.max(...t))} |`);

// 2. The scoring endpoint at the 256 KB body limit (handler, including validation and JSON parsing).
const bigAnswers: Record<string, string> = {};
for (let i = 0; i < 480; i++) bigAnswers[`X-${i}`] = 'x'.repeat(500);
const body = JSON.stringify({ answers: bigAnswers, scope: { selectedAreas: AREAS } });
const t2: number[] = [];
for (let i = 0; i < 50; i++) {
  const s = performance.now();
  const r: any = await evaluate({ body, isBase64Encoded: false, requestContext: { requestId: 'x', http: { method: 'POST', path: '/api/evaluate/cost-iq' } } } as any);
  t2.push(performance.now() - s);
  if (i === 0) rows.push(`| (body ${(body.length / 1024).toFixed(0)} KB, status ${r.statusCode}) | | | |`);
}
rows.push(`| Scoring endpoint at the body limit (50 runs) | ${ms(pct(t2, 0.5))} | ${ms(pct(t2, 0.95))} | ${ms(Math.max(...t2))} |`);

// 3. The report: build, check and render the consultant edition (the largest) for each eval-set case.
const t3: number[] = []; const mem: number[] = []; const sizes: number[] = [];
for (const c of EVAL_SET.slice(0, 10)) {
  const result = c.result;
  const input: CostIqReportInput = { result: result as CostIqResult, answers: c.answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers: c.answers, scope: { selectedAreas: AREAS } }), assessmentDate: '2026-11-05', currency: 'GBP', finops: null };
  const s = performance.now();
  const doc = costIqReport(input, { client: 'Example Bank', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Bank', view: 'consultant', notes: 'x' });
  checkCostIqReport(doc, input, 'consultant', '2026-11-05');
  const pdf = await renderPdf(doc);
  t3.push(performance.now() - s); sizes.push(pdf.length); mem.push(process.memoryUsage().rss / 1048576);
}
rows.push(`| Build, check and render the consultant PDF (10 cases) | ${ms(pct(t3, 0.5))} | ${ms(pct(t3, 0.95))} | ${ms(Math.max(...t3))} |`);

const md = [
  '# Cost IQ load check (CQ10)', '',
  `Run ${new Date().toISOString().slice(0, 10)}, in process on the development machine (compute only: no network, no database, no Lambda cold start).`, '',
  '| Step | Median | 95th percentile | Slowest |', '|---|---|---|---|', ...rows, '',
  `Report PDF size: ${(Math.min(...sizes) / 1024).toFixed(0)} to ${(Math.max(...sizes) / 1024).toFixed(0)} KB. Process memory after rendering: ${Math.max(...mem).toFixed(0)} MB (the report Lambda has 1,024 MB and a 30 s limit; scoring keeps the Amplify defaults of 3 s and 512 MB).`, ''
].join('\n');
writeFileSync(root('docs/cio-readiness/cost-iq/CQ10-LOAD.md'), md);
console.log(md);
