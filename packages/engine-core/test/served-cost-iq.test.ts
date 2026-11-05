/**
 * CQ2 gate: Amplify Hosting publishes everything under Accelerators/, so only the live Cost IQ page and its support files
 * may be there. Dead pages and old configuration live in archive/, which is not deployed.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = join(__dirname, '../../../Accelerators');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p.slice(SITE.length + 1));
  }
  return out;
}

describe('Cost IQ files served by the site', () => {
  const costFiles = walk(SITE).filter(f => /cost-?iq/i.test(f)).sort();

  it('is one page, its runtime configuration and its browser persistence file, nothing else', () => {
    expect(costFiles).toEqual(['assets/cost-iq-persistence.js', 'cost-iq-runtime-config.js', 'cost-iq-v10.html']);
  });

  it('has no leftover Cost IQ folder, including the Configuration Studio and the old runtime page', () => {
    expect(existsSync(join(SITE, 'cost-iq'))).toBe(false);
  });
});
