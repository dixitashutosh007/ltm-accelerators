/**
 * The FinOps IQ consultant playbook (execution phase M8) is generated from the engine and its knowledge base by
 * `npm run build:finops-iq-playbook`. It must match the sources it is built from, and keep to the language rules.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildPlaybook, PLAYBOOK_FILE } from '../../../scripts/build-finops-iq-playbook';
import { QUESTIONS } from '../src/accelerators/finops-iq/v3';
import levers from '../src/accelerators/finops-iq/registry/levers.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs');

describe('FinOps IQ consultant playbook', () => {
  const built = buildPlaybook();

  it('is up to date with the engine and knowledge base (run npm run build:finops-iq-playbook)', () => {
    expect(readFileSync(PLAYBOOK_FILE, 'utf8')).toBe(built);
  });

  it('covers every question and every lever', () => {
    for (const q of QUESTIONS) expect(built, q.id).toContain(`**${q.id}**`);
    for (const l of (levers as any).levers) expect(built, l.id).toContain(`### ${l.id} ${l.name}`);
  });

  it('uses none of the banned phrases and shows no raw values', () => {
    for (const re of BANNED) expect(built.match(re)?.[0], String(re)).toBeUndefined();
    expect(built).not.toMatch(/undefined|NaN|\[object Object\]/);
  });
});
