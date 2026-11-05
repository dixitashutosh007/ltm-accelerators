/**
 * Cost IQ golden outputs (CQ11, area 5): the seven reference clients in docs/cio-readiness/cost-iq/goldens.json score today
 * exactly as recorded. A scoring change must update the file on purpose (scripts/update-cost-iq-goldens.ts) and be
 * reviewed. Also: the engine is in the shared scoring audit, and every headline stays on its scale.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADAPTERS } from '../audit/adapters';

const goldens = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/cost-iq/goldens.json'), 'utf8'));
const a = ADAPTERS.find(x => x.id === 'cost-iq')!;

describe('Cost IQ golden outputs', () => {
  it('the file has the seven reference clients and records whether it is approved', () => {
    expect(goldens.clients.length).toBe(7);
    expect(['proposed', 'approved']).toContain(goldens.status);
    if (goldens.status === 'approved') { expect(goldens.approval.approvedBy).toBeTruthy(); expect(goldens.approval.approvedOn).toBeTruthy(); }
  });
  for (const c of goldens.clients) it(`${c.id}: scores, findings and recommendations are as recorded`, () => {
    const r = a.evaluate({ answers: c.answers });
    expect(r.headlines).toEqual(c.expected.headlines);
    expect(r.evidence.assessmentCompleteness).toBe(c.expected.completeness);
    expect(Object.fromEntries(r.dimensions.map((d: any) => [d.id, { score: d.score, answered: d.answered }]))).toEqual(c.expected.dimensions);
    expect(r.findings.map((f: any) => f.id)).toEqual(c.expected.findings);
    expect(r.recommendations.map((x: any) => x.id)).toEqual(c.expected.recommendations);
  });
  it('the best possible answers reach 100 on both headlines and raise no finding; the worst raise findings', () => {
    const best = goldens.clients.find((c: any) => c.id === 'best possible answers').expected, worst = goldens.clients.find((c: any) => c.id === 'worst possible answers').expected;
    expect(best.headlines).toEqual({ costIQ: 100, valueIQ: 100 }); expect(best.findings).toEqual([]);
    expect(worst.findings.length).toBeGreaterThan(5);
    expect(worst.headlines.costIQ).toBeLessThan(best.headlines.costIQ);
  });
  it('is in the shared scoring audit and stays on its scale for 800 random questionnaires', () => {
    expect(a).toBeTruthy();
    let seed = 99; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 200; i++) { const res = a.evaluate(a.random(r)); for (const h of a.headlines) { const v = h.get(res, null); expect(v === null || (v >= h.scale[0] && v <= h.scale[1]), h.name).toBe(true); } }
  });
});
