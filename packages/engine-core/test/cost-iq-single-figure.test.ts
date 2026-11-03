/**
 * The single-figure guard (shared value model stage 4, BOUNDARY.md section 3): one estate has one cloud figure, computed by
 * FinOps IQ. Cost IQ must never compute, restate or quantify any cloud lever. This fails the build if Cost IQ uses a FinOps
 * IQ lever ID, quantifies a cloud finding, or returns any money-like field. Cost IQ's own non-cloud levers (CQ4) must use IDs
 * outside FINOPS_IQ_LEVER_IDS.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FINOPS_IQ_LEVER_IDS } from '../src/accelerators/finops-iq/v3/cost-iq-summary';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const gates = require('../src/accelerators/cost-iq/canon/config/opportunity-recommendation-gates-v7.1.0.json');
const { questions } = adapter.questions();

const ROOT = join(__dirname, '../../..');
const COST_IQ_FILES = ['packages/engine-core/src/accelerators/cost-iq', 'amplify/functions/evaluate-cost-iq', 'amplify/functions/manage-cost-assessment', 'Accelerators/cost-iq-v10.html', 'Accelerators/assets/cost-iq-persistence.js'];
function walk(path: string, out: string[] = []): string[] {
  const full = join(ROOT, path);
  if (statSync(full).isDirectory()) { for (const e of readdirSync(full)) walk(join(path, e), out); }
  else if (/\.(cjs|mjs|js|ts|json|html)$/.test(full) && !/\.(test|spec)\./.test(full)) out.push(path);
  return out;
}

// Deterministic pseudo-random answer sets over the live bank.
function rng(seed: number) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function randomAnswers(next: () => number): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const q of questions) {
    if (next() < 0.15) continue; // skipped
    const opts = (q.options || []).map((o: any) => o.id);
    if (opts.length) answers[q.id] = q.interaction === 'multi-select' ? opts.filter(() => next() < 0.4) : opts[Math.floor(next() * opts.length)];
    else if (q.interaction === 'stars') answers[q.id] = 1 + Math.floor(next() * 5);
    else if (['slider', 'range'].includes(q.interaction)) answers[q.id] = Math.floor(next() * 101);
  }
  // Make the cloud findings reachable often.
  answers['CORE-01'] = ['PUBLIC_CLOUD', 'AI', 'SAAS'];
  return answers;
}

describe('single-figure guard: Cost IQ never computes a FinOps IQ lever', () => {
  it('uses no FinOps IQ lever ID anywhere in Cost IQ code, configuration or page', () => {
    const offenders: string[] = [];
    for (const file of COST_IQ_FILES.flatMap(f => walk(f))) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      for (const id of FINOPS_IQ_LEVER_IDS) if (text.includes(id)) offenders.push(`${file}: ${id}`);
    }
    expect(offenders).toEqual([]);
  });

  it('never quantifies the cloud findings F-005 and F-006, whatever the answers', () => {
    const next = rng(20261104);
    for (let i = 0; i < 300; i++) {
      const r = adapter.evaluateCostIq({ answers: randomAnswers(next) });
      for (const o of r.opportunities) {
        expect(o.economic.quantificationAllowed, `${o.findingId} run ${i}`).not.toBe(true);
      }
    }
    for (const id of ['F-005', 'F-006']) expect(gates.findingGates?.[id]?.quantificationAllowed ?? false, id).toBe(false);
  });

  it('returns no money-like field and no number that looks like an amount, on 300 random answer sets', () => {
    const next = rng(7);
    const MONEY_KEY = /"[A-Za-z]*(runRate|saving|Saving|annualValue|amount|usd|USD|currency|netYear|net3Year|grossRunRate)[A-Za-z]*":/;
    for (let i = 0; i < 300; i++) {
      const json = JSON.stringify(adapter.evaluateCostIq({ answers: randomAnswers(next) }));
      expect(json.match(MONEY_KEY)?.[0] ?? null, `run ${i}`).toBeNull();
    }
  });

  it('keeps the FinOps IQ lever library to ten IDs, so any new Cost IQ lever has a free ID range', () => {
    expect(FINOPS_IQ_LEVER_IDS).toHaveLength(10);
    const own = 'LEV-11';
    expect(FINOPS_IQ_LEVER_IDS).not.toContain(own);
  });
});
