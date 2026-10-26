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
  const obj = /^seal\.objectives\[(SOV-\d)\]\.inPlace$/.exec(field);
  if (obj) return r.seal.objectives.find(o => o.id === obj[1])?.inPlace;
  const place = /^advisory\.placement\[(\w+)\]$/.exec(field);
  if (place) return r.advisory.placement.filter(p => p.status === place[1]).length;
  return undefined;
}

describe('Sovereign IQ report', () => {
  it.each(runs.map(x => [x.label, x]))('%s: the sections, in the FinOps IQ order and format', (_, x: any) => {
    const ids = x.doc.sections.map((s: any) => s.id);
    const advisory = x.r.advisory.placement.length || x.r.advisory.technical.length ? ['advisory'] : [];
    expect(ids.slice(0, 9 + advisory.length)).toEqual(['summary', 'requirement', 'seal', 'maturity', 'exposure', 'findings', ...advisory, 'roadmap', 'help', 'methodology']);
    expect(ids.includes('sow')).toBe(x.view === 'consultant');
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

  it('the client edition shows no rule IDs, claim IDs or consultant notes, and lists the regulations that do not apply only in their appendix', () => {
    for (const x of runs.filter(y => y.view === 'client')) {
      const t = allText(x.doc);
      expect(t, x.label).not.toMatch(/\[[A-Z]{2}_[A-Z0-9_]+\.\d+\]|CLM-[A-Z]+-\d+|Board wants L3/);
      // S6 challenge Q8: the list is shown to the client, with the reason, in one appendix and nowhere else.
      const na = x.doc.sections.find(s => s.id === 'not-applicable')!;
      expect(na, x.label).toBeTruthy();
      for (const g of x.r.regimes.filter(g => g.grade === 'not_applicable')) {
        // The Sources appendix may cite a statute as a source (e.g. Data Act switching rights for an exit plan).
        const tables = x.doc.sections.filter(s => s.id !== 'sources' && s.id !== 'not-applicable').flatMap(s => s.blocks).filter(b => b.kind === 'table') as any[];
        expect(tables.some(tb => tb.rows.some((row: any) => text(row[0]) === g.name)), `${x.label} ${g.regime}`).toBe(false);
        expect((na.blocks[0] as any).rows.some((row: any) => text(row[0]) === g.name), `${x.label} ${g.regime} listed`).toBe(true);
      }
    }
  });

  it('the consultant edition lists the regulations that do not apply, with their rule, and the consultant notes', () => {
    const x = runs.find(y => y.view === 'consultant')!;
    const t = allText(x.doc);
    expect(t).toMatch(/Regulations checked that do not apply/);
    expect(t).toMatch(/Board wants L3 for payments/);
  });

  it('the roadmap never starts an action before its prerequisites reach their milestone (S6 challenge D4)', () => {
    for (const x of runs) for (const f of x.r.findings) for (const id of f.dependsOn) {
      const p = x.r.findings.find(y => y.id === id)!;
      expect(f.startMonth, `${x.label} ${f.id} after ${id}`).toBeGreaterThanOrEqual(p.startMonth + p.durationMonths[0]);
    }
  });

  it('every section number traces: "How we calculated this" shows the maturity arithmetic and every statutory maximum in scope', () => {
    for (const x of runs) {
      const calc = x.doc.sections.find(s => s.id === 'calculation')!;
      expect(calc, x.label).toBeTruthy();
      expect(x.doc.sections.some(s => s.id === 'assumptions'), x.label).toBe(true);
      const t: string[] = [];
      walkSegments({ ...x.doc, sections: [calc] }, (seg: Seg) => t.push(typeof seg === 'string' ? seg : seg.text));
      if (x.r.maturity.score != null) expect(t.join(' '), x.label).toMatch(new RegExp(`=\\s+${x.r.maturity.score}\\b`));
      const capRows = (calc.blocks.find(b => b.kind === 'table' && (b as any).head[0] === 'Regulation') as any)?.rows ?? [];
      expect(capRows.length, x.label).toBe(x.r.exposure.regimes.filter(e => e.cap && (x.view === 'consultant' || !x.r.regimes.find(g => g.regime === e.regime)!.consultantOnly)).length);
    }
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
      // S6 challenge D4: waves are numbered 1, 2, 3 with no gap, and every row has a check, an effort and a milestone.
      expect([...new Set(waves)], x.label).toEqual([...new Set(waves)].map((_, i) => i + 1));
      for (const row of b.rows) for (const col of ['Verification', 'Effort', 'Milestone', 'KPI']) expect(String(row[b.header.indexOf(col)]).trim(), `${x.label} ${row[0]} ${col}`).not.toBe('');
      expect(b.header.slice(-4), x.label).toEqual(['Platforms', 'Placement rung', 'Service families', 'Verification']);
      // A finding's placement rung is the one its placement rows need (PLAN S7).
      for (const row of b.rows) {
        const need = [...new Set(x.r.advisory.placement.filter(p => p.findingIds.includes(String(row[0]))).map(p => p.minimumRung))].sort().join('; ');
        expect(row[b.header.indexOf('Placement rung')], `${x.label} ${row[0]}`).toBe(need);
      }
    }
  });

  it('the SEAL section never rates the client or a provider, and keeps the Commission tender results to the consultant edition (D16, D20)', () => {
    for (const x of runs) {
      const shown: string[] = [];
      walkSegments(x.doc, (seg: Seg, sec: any) => { if (sec.id === 'seal') shown.push(typeof seg === 'string' ? seg : seg.text); });
      const t = shown.join(' ');
      expect(t, x.label).not.toMatch(/you are SEAL|SEAL-certified|certified at SEAL|your SEAL is/i);
      expect(/Post Telecom|STACKIT|Scaleway/.test(t), x.label).toBe(x.view === 'consultant');
    }
  });

  it('the advisory section appears only when it applies: cloud advisory on a hyperscaler, platform actions otherwise, none without actions', () => {
    const base = ARCHETYPES.find((a: any) => a.id === 'ARC1_EU_BANK_DORA')!.answers;
    const onprem = { ...base, P1: ['onprem'], L2: Object.fromEntries(Object.entries(base.L2 ?? {}).map(([k, v]: any) => [k, { ...v, platforms: ['onprem'] }])) };
    const r1 = evaluateSovereignIqV4({ mode: 'workshop', answers: onprem, assessmentDate: '2026-10-26' });
    expect(r1.advisory.placement).toEqual([]);
    const s1 = sovereignIqReport(r1, { client: 'X', preparedBy: 'L', dataProvidedBy: 'C', view: 'client' }).sections.find(s => s.id === 'advisory');
    expect(r1.advisory.technical.length > 0 ? s1?.title : s1).toBe(r1.advisory.technical.length > 0 ? 'Platform actions' : undefined);
    const none = { ...r1, advisory: { ...r1.advisory, placement: [], technical: [] } };
    expect(sovereignIqReport(none, { client: 'X', preparedBy: 'L', dataProvidedBy: 'C', view: 'client' }).sections.some(s => s.id === 'advisory')).toBe(false);
    const cloud = runs.find(y => y.r.advisory.placement.length)!;
    expect(cloud.doc.sections.find((s: any) => s.id === 'advisory')?.title).toBe('Sovereign cloud advisory');
  });

  it('the advisory section has a row for every placement and leaves catalogue gaps out of the client edition', () => {
    for (const x of runs) {
      const s: any = x.doc.sections.find((y: any) => y.id === 'advisory');
      const heat = s.blocks.find((b: any) => b.kind === 'heatmap');
      expect(heat ? heat.rows.length : 0, x.label).toBe(x.r.advisory.placement.length);
      const shown: string[] = [];
      walkSegments(x.doc, (seg: Seg, sec: any) => { if (sec.id === 'advisory') shown.push(typeof seg === 'string' ? seg : seg.text); });
      const text = shown.join(' ');
      if (x.view === 'client') expect(text, x.label).not.toContain('Playbook gaps');
      expect(text, x.label).not.toMatch(/CLM-[A-Z]+-\d+/);
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
