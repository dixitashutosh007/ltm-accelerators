/**
 * Cost IQ AI narrative live eval (CQ8 gate). Runs the real model on Amazon Bedrock over the eval set (five estate
 * profiles in three answer patterns, plus adversarial focus notes on two cases: a promise of savings, a vendor pick, an
 * invented payback, a prompt injection). The gate passes when every case returns a narrative that passes the grounding
 * check (status ok); a rejected or failed case fails it, even though nothing ungrounded is shown.
 *
 * Costs money and needs AWS credentials with Bedrock access, so it is not part of CI (the stub-model tests are):
 *   AI_REGION=ap-south-1 AI_MODEL_ID=in.anthropic.claude-opus-5 npx tsx scripts/eval-cost-narrative.ts
 * Writes docs/cio-readiness/cost-iq/CQ8-EVAL.md with each case's status, attempts and violations.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allowForCostBrief, costBrief, COST_LEXICON, COST_SYSTEM } from '../packages/engine-core/src/accelerators/cost-iq/narrative';
import { runNarrative } from '../packages/engine-core/src/ai/narrative';
import { aiConfig, bedrockNarrativeModel } from '../amplify/functions/_shared/bedrock-narrative';
import { ADVERSARIAL_FOCUS, EVAL_SET } from '../packages/engine-core/test/support/cost-iq-eval-set';

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const cases = [
  ...EVAL_SET.map(c => ({ ...c, focus: undefined as string | undefined })),
  ...EVAL_SET.slice(0, 2).flatMap(c => ADVERSARIAL_FOCUS.map((focus, i) => ({ id: `${c.id} adversarial ${i + 1}`, result: c.result, focus })))
];

const cfg = aiConfig({ ...process.env, AI_ENABLED: 'true' });
const model = bedrockNarrativeModel(cfg);
const rows: string[] = [];
let pass = 0;
for (const c of cases) {
  const brief = costBrief(c.result);
  const out = await runNarrative({ system: COST_SYSTEM, input: brief, focus: c.focus, allow: allowForCostBrief(brief), lexicon: COST_LEXICON, model });
  if (out.status === 'ok') pass++;
  rows.push(`| ${c.id} | ${out.status} | ${out.attempts} | ${out.violations.map(v => `${v.kind}: ${v.text}`).join('; ').replace(/\|/g, '/') || '—'} |`);
  console.log(`${out.status.padEnd(8)} ${out.attempts} ${c.id}`);
}
const md = [
  '# Cost IQ AI narrative: live eval (CQ8)', '',
  `Run ${new Date().toISOString().slice(0, 10)} on ${cfg.modelId} in ${cfg.region}. ${pass} of ${cases.length} cases passed the grounding check (the gate needs all).`, '',
  '| Case | Status | Attempts | Violations in the final draft |', '|---|---|---|---|', ...rows, ''
].join('\n');
writeFileSync(root('docs/cio-readiness/cost-iq/CQ8-EVAL.md'), md);
console.log(`\n${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
