/**
 * Portfolio review 2026-11-08, Phase 0.4: the client edition's "Every number" table reads in words. Engine paths such
 * as findings[F-FIN-ALLOCATION].levelMilestones.run stay in the consultant edition only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsIqV3, type AnswerLevel } from '../src/accelerators/finops-iq/v3/evaluate';
import { finopsIqReport, fieldWords } from '../src/accelerators/finops-iq/v3/report';
import { checkFinOpsIqReport } from '../src/report-checks/accelerators';
import type { ReportDocument } from '../src/report/model';

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const runs = SCENARIOS.map(s => {
  const answers = Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
  const input = { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: '2026-10-14' };
  const r = evaluateFinOpsIqV3(input as any);
  return { id: s.id, r, client: finopsIqReport(r, { ...OPTS, view: 'client', input } as any), consultant: finopsIqReport(r, { ...OPTS, view: 'consultant', input } as any) };
});
const everyNumber = (doc: ReportDocument) => {
  const t: any = doc.sections.find(s => s.id === 'calculation')!.blocks.at(-1);
  expect(t.kind).toBe('table');
  return { head: t.head as string[], cells: (t.rows as any[]).map(row => row[1].map((g: any) => (typeof g === 'string' ? g : g.text)).join('')) };
};
const ENGINE_PATH = /\w\[[^\]]+\]|\b(?:findings|value|report|coverage|headline|tier|needVerdict|questions|capabilities)\.\w|levelMilestones|effortFteMonths|\b(?:max|min|sum) of /;

describe('FinOps IQ client appendix in words', () => {
  it.each(runs.map(x => [x.id, x]))('%s: the client edition names no engine path and passes the report checks', (_, x: any) => {
    const { head, cells } = everyNumber(x.client);
    expect(head[1]).toBe('What it is and how it is worked out');
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c, c).not.toMatch(ENGINE_PATH);
      expect(c, c).not.toMatch(/Engine figure/);
      expect(c[0], c).toMatch(/[A-Z]/);
    }
    expect(checkFinOpsIqReport(x.client, x.r, 'client', '2026-10-27').failures).toEqual([]);
  });

  it('the consultant edition keeps the engine paths', () => {
    const { head, cells } = everyNumber(runs[0].consultant);
    expect(head[1]).toBe('Engine field, or how it is derived');
    expect(cells.some(c => /value\.totals\.expected\./.test(c.replace(/​/g, '')))).toBe(true);
  });

  it('reads fields and derived numbers as a CIO would', () => {
    const r = runs.find(x => x.r.findings.some(f => f.capability === 'ALLOCATION'))!.r;
    expect(fieldWords('value.totals.expected.netYear1', r)).toBe('Value: net saving in year one, expected case');
    expect(fieldWords('findings[F-FIN-ALLOCATION].levelMilestones.walk', r)).toBe('Allocation: months to reach Walk');
    expect(fieldWords('min of findings[F-FIN-ALLOCATION].start.month', r)).toBe('Start month of Allocation');
    expect(fieldWords('max of findings[F-FIN-ALLOCATION].levelMilestones.crawl, findings[F-FIN-ALLOCATION].levelMilestones.walk', r)).toBe('Latest milestone of Allocation');
    expect(fieldWords('value.levers[LEV-06].maxRate[gcp].rate', r)).toMatch(/: maximum rate for Google Cloud$/);
    expect(fieldWords('sensitivity of spend.byScope.gcp', r)).toBe('Change in the expected net saving when annual spend with GCP moves across its range');
    expect(fieldWords('something.unexpected', r)).toBe('Engine figure (consultant edition gives the field)');
  });
});
