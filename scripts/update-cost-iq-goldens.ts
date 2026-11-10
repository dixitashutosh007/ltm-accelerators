/**
 * Writes the Cost IQ golden outputs (CQ11, area 5): reference clients with their answers and what the engine returns today.
 * The test (packages/engine-core/test/cost-iq-goldens.test.ts) fails when the engine's output for any of them changes, so a
 * scoring change is always a visible, reviewed edit to this file. Run only when a change is intended:
 *   npx tsx scripts/update-cost-iq-goldens.ts
 * The file records "status: proposed" until the owner and the practice lead approve it; this script never sets approval.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from '../packages/engine-core/audit/adapters';
import { EVAL_SET } from '../packages/engine-core/test/support/cost-iq-eval-set';

const path = fileURLToPath(new URL('../docs/cio-readiness/cost-iq/goldens.json', import.meta.url));
const a = ADAPTERS.find(x => x.id === 'cost-iq')!;
const summarise = (answers: Record<string, unknown>) => {
  const r = a.evaluate({ answers });
  return {
    headlines: r.headlines,
    completeness: r.evidence.assessmentCompleteness,
    dimensions: Object.fromEntries(r.dimensions.map((d: any) => [d.id, { score: d.score, answered: d.answered }])),
    findings: r.findings.map((f: any) => f.id),
    recommendations: r.recommendations.map((x: any) => x.id)
  };
};
let prior: any = {};
try { prior = JSON.parse(readFileSync(path, 'utf8')); } catch { /* first run */ }
// A reference client keeps the answers it was recorded with, so a diff of this file shows engine changes only (a change to the
// question bank's options would otherwise draw different answers from the evaluation set). Best and worst are recomputed: they are
// defined by the bank.
const recorded = (id: string) => (prior.clients ?? []).find((c: any) => c.id === id)?.answers;
const clients = [
  ...['on-premises-heavy', 'cloud-heavy', 'SaaS-heavy', 'outsourced', 'mixed'].map(p => { const id = `profile: ${p}`; return { id, answers: recorded(id) ?? EVAL_SET.find(x => x.id === `${p} #3`)!.answers }; }),
  { id: 'best possible answers', answers: a.extremes.best().answers },
  { id: 'worst possible answers', answers: a.extremes.worst().answers }
].map(c => ({ ...c, expected: summarise(c.answers) }));
writeFileSync(path, JSON.stringify({
  schema: 'cost-iq-goldens/1', engine: 'costiq-engine-v10, master-v6.6', status: prior.status ?? 'proposed',
  approval: prior.approval ?? { approvedBy: null, approvedOn: null, note: 'Awaiting owner and practice-lead approval' }, clients
}, null, 1) + '\n');
console.log(`wrote ${clients.length} reference clients to ${path}`);
