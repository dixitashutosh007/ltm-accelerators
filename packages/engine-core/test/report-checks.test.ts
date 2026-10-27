/**
 * Report checks (REPORT-VALIDATION.md, Layer 1, RV1): every reference-scenario report passes in both editions, and a
 * planted defect of each kind is caught by the check that covers it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsIqV3, type AnswerLevel, type FinOpsIqV3Result } from '../src/accelerators/finops-iq/v3/evaluate';
import { finopsIqReport } from '../src/accelerators/finops-iq/v3/report';
import { evaluateSovereignIqV4, sovereignIqReport } from '../src/accelerators/sovereign-iq/v4';
import { checkFinOpsIqReport, checkSovereignIqReport } from '../src/report-checks/accelerators';
import type { ReportDocument, Seg } from '../src/report/model';

const TODAY = '2026-10-27';
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const finops = SCENARIOS.flatMap(s => {
  const answers = Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
  const input = { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: '2026-10-14' };
  const r = evaluateFinOpsIqV3(input as any);
  return (['consultant', 'client'] as const).map(view => ({ label: `${s.id} ${view}`, view, r, doc: finopsIqReport(r, { ...OPTS, view, input } as any) }));
});
const ARCHETYPES: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design/archetypes.json'), 'utf8')).archetypes;
const sovereign = ARCHETYPES.flatMap(a => (['executive', 'workshop'] as const).flatMap(mode => {
  const r = evaluateSovereignIqV4({ mode, answers: a.answers, assessmentDate: '2026-10-26' } as any);
  return (['consultant', 'client'] as const).map(view => ({ label: `${a.id} ${mode} ${view}`, view, r, doc: sovereignIqReport(r, { ...OPTS, view } as any) }));
}));

/** The first traced segment in the document, to tamper with. */
function firstTraced(doc: ReportDocument): Exclude<Seg, string> {
  for (const s of doc.sections) for (const b of s.blocks as any[]) {
    const lists = b.kind === 'paragraph' || b.kind === 'callout' ? [b.segs] : b.kind === 'kpis' ? b.items.map((i: any) => i.value) : b.kind === 'table' ? b.rows.flat() : [];
    for (const segs of lists) for (const seg of segs) if (typeof seg !== 'string' && seg.trace && !seg.trace.derived && !seg.trace.field.startsWith('report:')) return seg;
  }
  throw new Error('no traced segment');
}

describe('report checks: every reference-scenario report passes', () => {
  it.each(finops.map(x => [x.label, x]))('FinOps IQ %s', (_, x: any) => {
    expect(checkFinOpsIqReport(x.doc, x.r, x.view, TODAY).failures).toEqual([]);
  });
  it.each(sovereign.map(x => [x.label, x]))('Sovereign IQ %s', (_, x: any) => {
    expect(checkSovereignIqReport(x.doc, x.r, x.view, TODAY).failures).toEqual([]);
  });
});

describe('report checks: planted defects are caught', () => {
  const base = finops.find(x => x.view === 'client' && x.r.value.moneyShown)!;
  const checks = (doc: ReportDocument, r: FinOpsIqV3Result = base.r, view: 'client' | 'consultant' = 'client', today = TODAY) =>
    checkFinOpsIqReport(doc, r, view, today).failures.map(f => f.check);

  it('R1: a missing section', () => {
    const doc = clone(base.doc); doc.sections = doc.sections.filter(s => s.id !== 'roadmap');
    expect(checks(doc)).toContain('R1');
  });

  it('R2: a number that no longer matches the engine', () => {
    const doc = clone(base.doc); const seg = firstTraced(doc);
    seg.trace!.value = seg.trace!.value + 1;
    expect(checks(doc)).toContain('R2');
  });

  it('R2: an untraced number in plain text (FinOps IQ)', () => {
    const doc = clone(base.doc);
    (doc.sections.find(s => s.id === 'summary')!.blocks as any[]).push({ kind: 'paragraph', segs: ['Savings of 40% are typical.'] });
    expect(checks(doc)).toContain('R2');
  });

  it('R3: levers that no longer sum to the headline', () => {
    const r = clone(base.r); r.value.totals!.expected.grossRunRate.value += 1000;
    expect(checks(base.doc, r)).toContain('R3');
  });

  it('R4: a claim past its review date', () => {
    expect(checks(base.doc, base.r, 'client', '2099-01-01')).toContain('R4');
  });

  it('R5: a banned phrase', () => {
    const doc = clone(base.doc);
    (doc.sections.find(s => s.id === 'summary')!.blocks as any[]).push({ kind: 'paragraph', segs: ['These savings are guaranteed.'] });
    expect(checks(doc)).toContain('R5');
  });

  it('R5: internal text in the client edition', () => {
    const doc = clone(base.doc);
    (doc.sections.find(s => s.id === 'methodology')!.blocks as any[]).push({ kind: 'paragraph', segs: ['See docs/cio-readiness/finops-iq/DESIGN.md for null values.'] });
    expect(checks(doc)).toContain('R5');
  });

  it('R5: a question ID in the client edition body; the same ID is not a figure in the consultant edition', () => {
    const doc = clone(base.doc);
    (doc.sections.find(s => s.id === 'summary')!.blocks as any[]).push({ kind: 'paragraph', segs: ['Confirm the SC-04 row.'] });
    expect(checks(doc)).toContain('R5');
    const consultant = finops.find(x => x.view === 'consultant' && x.r === base.r)!;
    const cdoc = clone(consultant.doc);
    (cdoc.sections.find(s => s.id === 'help')!.blocks as any[]).push({ kind: 'paragraph', segs: ['Confirm the SC-04 row.'] });
    expect(checkFinOpsIqReport(cdoc, base.r, 'consultant', TODAY).failures).toEqual([]);
  });

  it('R7: a missing disclaimer (Sovereign IQ: "not legal advice")', () => {
    const x = sovereign.find(y => y.view === 'client')!;
    const doc = JSON.parse(JSON.stringify(x.doc).replace(/not legal advice/gi, 'general guidance'));
    expect(checkSovereignIqReport(doc, x.r, 'client', TODAY).failures.map(f => f.check)).toContain('R7');
  });
});
