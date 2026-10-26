/**
 * Writes the Sovereign IQ page's question file (Accelerators/assets/sovereign-iq/questions.json) from the v4 question
 * bank, control catalogue and regime registry. Run after changing any of them: npm run build:sovereign-iq-questions.
 * CI fails when the file is out of date.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicQuestionSchema } from '../packages/engine-core/src/accelerators/sovereign-iq/v4/public-schema';

const out = fileURLToPath(new URL('../Accelerators/assets/sovereign-iq/questions.json', import.meta.url));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(publicQuestionSchema(), null, 2) + '\n');
console.log(`Wrote ${out}`);
