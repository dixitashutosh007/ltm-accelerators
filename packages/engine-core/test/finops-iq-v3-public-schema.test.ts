/**
 * The page's question file (execution phase M3) is generated from the bank and holds no scoring internals.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicQuestionSchema, QUESTIONS } from '../src/accelerators/finops-iq/v3';

const FILE = join(__dirname, '../../../Accelerators/assets/finops-iq/questions.json');

describe('FinOps IQ v3 public question file', () => {
  it('is up to date with the question bank (run npm run build:finops-iq-questions)', () => {
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(JSON.parse(JSON.stringify(publicQuestionSchema())));
  });

  it('holds every question, with no option levels, ask conditions or legacy map', () => {
    const text = readFileSync(FILE, 'utf8');
    const schema = JSON.parse(text);
    expect(schema.questions.map((q: any) => q.id)).toEqual(QUESTIONS.map(q => q.id));
    expect(text).not.toMatch(/"level"|"askWhen"|"legacy"|"role"|"conflictProbes"/);
  });

  it('every maturity question offers "Don\'t know" and cites its basis', () => {
    for (const q of JSON.parse(readFileSync(FILE, 'utf8')).questions.filter((x: any) => x.kind === 'maturity')) {
      expect(q.basis.length, q.id).toBeGreaterThan(0);
      if (q.id !== 'UN-08') expect(q.options.some((o: any) => o.value === 'unknown'), q.id).toBe(true);
    }
  });
});
