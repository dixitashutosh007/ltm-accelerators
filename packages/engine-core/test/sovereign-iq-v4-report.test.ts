/**
 * Sovereign IQ executive report (PLAN S6): the FinOps IQ report format with the two headlines, charts (bars by area,
 * heatmaps by level and by market), both editions, and the backlog. Every traced number matches the engine result;
 * the client edition leaves out what client mode leaves out.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSovereignIqV4, sovereignIqReport, sovereignIqBacklog, type SovereignIqV4Result } from '../src/accelerators/sovereign-iq/v4';
import { renderPdf } from '../src/report/pdf';
import { walkSegments, text, type ReportDocument, type Seg } from '../src/report/model';

const ARCHETYPES: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design/archetypes.json'), 'utf8')).archetypes;
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const runs = ARCHETYPES.flatMap(a => (['executive', 'workshop'] as const).flatMap(mode => {
  const r = evaluateSovereignIqV4({ mode, answers: a.answers, assessmentDate: '2026-10-26' });
  return (['consultant', 'client'] as const).map(view => ({ label: `${a.id} ${mode} ${view}`, view, r, doc: sovereignIqReport(r, { ...OPTS, view, notes: 'Board wants L3 for payments' }) }));
}));

function allText(doc: ReportDocument) {
  const out: string[] = [];
  for (const s of doc.sections) for (const b of s.blocks) {
    if (b.kind === 'subheading') out.push(b.text);
    if (b.kind === 'heatmap') for (const row of b.rows) out.push(row.label, ...row.cells.flatMap(c => [c.label, c.note ?? '']));
    if (b.kind === 'bars') out.push(...b.items.map(i => i.label));
    if (b.kind === 'table') out.push(...b.head);
  }
  walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text));
  return out.join(' ');
}

/** The value a traced field names, read from the result. */
function resolve(r: SovereignIqV4Result, field: string): number | undefined {
  const regs = r.regimes;
  const m = /^maturity\.byDomain\[(\w+)\]\.score$/.exec(field);
  if (m) return r.maturity.byDomain.find(d => d.domain === m[1])?.score;
  if (field === 'maturity.score') return r.maturity.score ?? undefined;
  if (field === 'maturity.controlsAssessed') return r.maturity.controlsAssessed;
  if (field === 'maturity.unconfirmed') return r.maturity.unconfirmed.length;
  const cap = /^(exposure\.largestCap|exposure\.regimes\[(\w+)\]\.cap)\.(amount|range\[(\d)\])$/.exec(field);
  if (cap) {
    const c = cap[2] ? r.exposure.regimes.find(e => e.regime === cap[2])?.cap : r.exposure.largestCap;
    return cap[3] === 'amount' ? c?.amount ?? undefined : c?.range?.[Number(cap[4])] ?? undefined;
  }
  return undefined;
}

describe('Sovereign IQ report', () => {
  it.each(runs.map(x => [x.label, x]))('%s: the sections, in the FinOps IQ order and format', (_, x: any) => {
    const ids = x.doc.sections.map((s: any) => s.id);
    expect(ids.slice(0, 7)).toEqual(['summary', 'requirement', 'maturity', 'exposure', 'findings', 'roadmap', 'methodology']);
    expect(ids.includes('sources')).toBe(true);
    expect(ids.includes('consultant')).toBe(x.view === 'consultant');
    expect(x.doc.meta.product).toBe('Sovereign IQ');
    expect(x.doc.meta.footer).toBe('LTM Vantage · Responsible Advisory · Sovereign IQ · Confidential');
    expect(x.doc.sections[0].blocks.some((b: any) => b.kind === 'kpis' && b.items.length === 5)).toBe(true);
  });

  it.each(runs.map(x => [x.label, x]))('%s: every traced number in the report matches the engine result', (_, x: any) => {
    walkSegments(x.doc, (s: Seg) => {
      if (typeof s === 'string' || !s.trace) return;
      const want = resolve(x.r, s.trace.field);
      if (want !== undefined) expect(s.trace.value, s.trace.field).toBe(want);
    });
  });

  it('charts: maturity bars by area, a control heatmap and an exposure heatmap by market, when there is a score', () => {
    for (const x of runs.filter(y => y.r.maturity.score != null)) {
      const blocks = x.doc.sections.flatMap(s => s.blocks);
      expect(blocks.some(b => b.kind === 'bars'), x.label).toBe(true);
      expect(blocks.filter(b => b.kind === 'heatmap').length, x.label).toBeGreaterThanOrEqual(2);
    }
  });

  it('the client edition shows no rule IDs, claim IDs, consultant notes or list of regulations that do not apply', () => {
    for (const x of runs.filter(y => y.view === 'client')) {
      const t = allText(x.doc);
      expect(t, x.label).not.toMatch(/\[[A-Z]{2}_[A-Z0-9_]+\.\d+\]|CLM-[A-Z]+-\d+|Board wants L3/);
      for (const g of x.r.regimes.filter(g => g.grade === 'not_applicable')) {
        const tables = x.doc.sections.flatMap(s => s.blocks).filter(b => b.kind === 'table') as any[];
        expect(tables.some(tb => tb.rows.some((row: any) => text(row[0]) === g.name)), `${x.label} ${g.regime}`).toBe(false);
      }
    }
  });

  it('the consultant edition lists the regulations that do not apply, with their rule, and the consultant notes', () => {
    const x = runs.find(y => y.view === 'consultant')!;
    const t = allText(x.doc);
    expect(t).toMatch(/Regulations checked that do not apply/);
    expect(t).toMatch(/Board wants L3 for payments/);
  });

  it('no claim ID is shown in any edition (they are kept as citations)', () => {
    for (const x of runs) expect(allText(x.doc), x.label).not.toMatch(/\[CLM-/);
  });

  it('the backlog has one row per finding the edition shows, in roadmap order', () => {
    for (const x of runs) {
      const b = sovereignIqBacklog(x.r, x.view);
      expect(b.rows.length, x.label).toBe(x.r.findings.filter(f => x.view === 'consultant' || !f.consultantOnly).length);
      const waves = b.rows.map(r => Number(r[1]));
      expect([...waves].sort((p, q) => p - q), x.label).toEqual(waves);
    }
  });

  it('renders to a PDF in both editions', async () => {
    for (const x of runs.filter(y => y.label.includes('ARC1') && y.label.includes('workshop'))) {
      const pdf = await renderPdf(x.doc);
      expect(pdf.subarray(0, 5).toString(), x.label).toBe('%PDF-');
      expect(pdf.length, x.label).toBeGreaterThan(20_000);
    }
  }, 60_000);
});
