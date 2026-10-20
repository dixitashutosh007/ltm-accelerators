/**
 * Writes the FinOps IQ page's question file (Accelerators/assets/finops-iq/questions.json) from the v3 question
 * bank. Run after changing the bank: npm run build:finops-iq-questions. CI fails when the file is out of date.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publicQuestionSchema } from '../packages/engine-core/src/accelerators/finops-iq/v3/public-schema';

const out = fileURLToPath(new URL('../Accelerators/assets/finops-iq/questions.json', import.meta.url));
writeFileSync(out, JSON.stringify(publicQuestionSchema(), null, 2) + '\n');
console.log(`Wrote ${out}`);
