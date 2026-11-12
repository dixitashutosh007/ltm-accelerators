/**
 * Cost IQ indicative value (PRODUCT-GRADE-PLAN.md, A1; owner decision of 12 Nov 2026): each raised cost finding gets an LTM
 * planning range from its category's share of the spend in scope, a planning rate and the spend band as the client saw it.
 * Cloud and SaaS stay with FinOps IQ; a measured figure replaces a range; overlapping findings count once.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { bandEdges, spendBand, evaluateIndicative, indicativeFigures } from '../src/accelerators/cost-iq/indicative';
import library from '../src/accelerators/cost-iq/indicative-ranges.json' with { type: 'json' };
import { costIqReport, costIqBrief, costIqDeck, costIqBacklog, indicativeFor, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const calibration = require('../src/accelerators/cost-iq/canon/config/finding-activation-calibration-v7.1.1.json').findingActivation;

const AREAS: string[] = Object.keys(cfg.settings.selection.areas);
const text = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); return out.join('').replace(/\s+/g, ' '); };
const shares = library.categoryShares as unknown as Record<string, number>;

describe('band edges and the spend band', () => {
  it('reads the labels the client saw', () => {
    expect(bandEdges('EUR 4.5M to 22M')).toEqual({ low: 4.5e6, high: 22e6 });
    expect(bandEdges('INR 470M to 2.4bn')).toEqual({ low: 470e6, high: 2.4e9 });
    expect(bandEdges('Below GBP 3.7M')).toEqual({ low: 0, high: 3.7e6 });
    expect(bandEdges('Above JPY 160bn')).toEqual({ low: 160e9, high: null });
    expect(bandEdges('nonsense')).toBeNull();
  });

  it('every labelled band in every currency parses', () => {
    const q = cfg.questions.find((x: any) => x.id === 'CORE-04');
    for (const [cur, labels] of Object.entries<Record<string, string>>(q.labelsByCurrency)) for (const [id, l] of Object.entries(labels)) expect(bandEdges(l), `${cur} ${id}`).not.toBeNull();
  });

  it('uses the reporting currency where it has labels, US dollars where it has none, and nothing without a band', () => {
    expect(spendBand({ 'CORE-04': '25M_50M' }, 'GBP')).toEqual({ currency: 'GBP', low: 19e6, high: 37e6 });
    expect(spendBand({ 'CORE-04': '25M_50M' }, 'AED')).toEqual({ currency: 'USD', low: 25e6, high: 50e6 });
    expect(spendBand({ 'CORE-04': 'UNKNOWN' }, 'GBP')).toBeNull();
    expect(spendBand({}, 'GBP')).toBeNull();
  });
});

describe('evaluateIndicative', () => {
  const all = { 'CORE-04': '50M_100M', 'CORE-05': Object.keys(shares).filter(k => k !== 'note') };

  it('sizes a finding as its category share times the planning rate, at both ends of the band', () => {
    const r = evaluateIndicative(all, ['F-008'], 'USD');
    const l = r.lines[0];
    expect(l.shareLow).toBeCloseTo(0.09 * 0.05, 10);
    expect(l.shareHigh).toBeCloseTo(0.09 * 0.15, 10);
    expect(l.low).toBe(Math.round(50e6 * 0.09 * 0.05));
    expect(l.high).toBe(Math.round(100e6 * 0.09 * 0.15));
    expect(r.total).toMatchObject({ low: l.low, high: l.high });
  });

  it('rescales shares to the categories the spend figure includes, and sizes nothing outside them', () => {
    const r = evaluateIndicative({ 'CORE-04': '5M_25M', 'CORE-05': ['INFRA'] }, ['F-009', 'F-008'], 'USD');
    expect(r.lines.map(l => l.findingId)).toEqual(['F-009']);
    expect(r.lines[0].shareLow).toBeCloseTo(0.05, 10);
    expect(r.lines[0].shareHigh).toBeCloseTo(0.15, 10);
    expect(r.notSized).toContainEqual({ findingId: 'F-008', reason: 'excluded' });
    expect(r.categoriesAssumed).toBe(false);
  });

  it('assumes every category when the client did not say, and says so', () => {
    for (const a of [{ 'CORE-04': '5M_25M' }, { 'CORE-04': '5M_25M', 'CORE-05': ['UNKNOWN'] }]) {
      const r = evaluateIndicative(a, ['F-008'], 'USD');
      expect(r.categoriesAssumed).toBe(true);
      expect(r.lines[0].shareHigh).toBeCloseTo(0.09 * 0.15, 10);
    }
  });

  it('counts a category once, at its largest range', () => {
    const r = evaluateIndicative(all, ['F-012', 'F-013', 'F-020', 'F-010', 'F-016'], 'USD');
    expect(r.lines.filter(l => l.counted).map(l => l.findingId).sort()).toEqual(['F-016', 'F-020']);
    const counted = r.lines.filter(l => l.counted);
    expect(r.total!.shareHigh).toBeCloseTo(counted.reduce((t, l) => t + l.shareHigh, 0), 10);
    expect(r.total!.high).toBe(Math.round(100e6 * r.total!.shareHigh));
  });

  it('never sizes cloud or SaaS (FinOps IQ), and a measured figure replaces the range', () => {
    const r = evaluateIndicative(all, ['F-005', 'F-006', 'F-007', 'F-008', 'F-001'], 'USD', ['F-008']);
    expect(r.lines).toEqual([]);
    expect(r.total).toBeNull();
    expect(r.notSized).toEqual([{ findingId: 'F-005', reason: 'cloud' }, { findingId: 'F-006', reason: 'cloud' }, { findingId: 'F-007', reason: 'cloud' }, { findingId: 'F-008', reason: 'measured' }, { findingId: 'F-001', reason: 'enabler' }]);
  });

  it('every sized finding is a real finding, and every lever together stays well below the spend in scope', () => {
    const ids = new Set(cfg.findings.map((f: any) => f.id));
    for (const id of [...Object.keys(library.findings), ...Object.keys(library.elsewhere)]) expect(ids.has(id), id).toBe(true);
    const r = evaluateIndicative(all, Object.keys(library.findings), 'USD');
    expect(r.total!.shareHigh).toBeLessThan(0.25);
    // Even when the spend figure is a single category, no range exceeds that category's spend.
    for (const c of Object.keys(shares).filter(k => k !== 'note')) {
      const one = evaluateIndicative({ 'CORE-04': '5M_25M', 'CORE-05': [c] }, Object.keys(library.findings), 'USD');
      if (one.total) expect(one.total.shareHigh, c).toBeLessThanOrEqual(1);
    }
  });

  it('an open band gives an open range; no band gives shares only', () => {
    const top = evaluateIndicative({ ...all, 'CORE-04': 'GT1B' }, ['F-009'], 'USD');
    expect(top.lines[0].high).toBeNull();
    expect(top.lines[0].low).toBeGreaterThan(0);
    const none = evaluateIndicative({ 'CORE-05': all['CORE-05'] }, ['F-009'], 'USD');
    expect(none.lines[0]).toMatchObject({ low: null, high: null });
    expect(indicativeFigures(none).has('indicative.total.shareHigh')).toBe(true);
  });
});

describe('the report', () => {
  // Answers that raise each sized finding through its first option trigger, plus a spend band and categories.
  const answers: Record<string, unknown> = {
    'CORE-01': ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M',
    'CORE-05': ['INFRA', 'SOFTWARE', 'APPS', 'PEOPLE', 'EXTERNAL', 'SAAS'], 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION']
  };
  for (const id of Object.keys(library.findings)) {
    const t = (calibration[id] ?? []).find((x: any) => x.type === 'option' && !x.applicableWhen && !answers[x.questionId]);
    if (t) answers[t.questionId] = cfg.questions.find((q: any) => q.id === t.questionId)?.interaction?.startsWith('multi') ? [t.triggerOptions[0]] : t.triggerOptions[0];
  }
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const ind = indicativeFor(i);
  const docs = (['client', 'consultant'] as const).map(view => ({ view, doc: costIqReport(i, { client: 'Example Insurer', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Insurer', view }) }));

  it('the fixture raises several sized findings with money', () => {
    expect(ind.lines.length).toBeGreaterThanOrEqual(4);
    expect(ind.total!.low).toBeGreaterThan(0);
    expect(ind.currency).toBe('GBP');
  });

  it('leads with the indicative value, shows each range, and passes the report checks in both editions', () => {
    for (const { view, doc } of docs) {
      expect(checkCostIqReport(doc, i, view, '2026-11-12').failures, view).toEqual([]);
      const summary = doc.sections[0];
      expect(summary.blocks[0].kind === 'paragraph' && (summary.blocks[0] as any).style === 'lead').toBe(true);
      expect(text({ meta: doc.meta, sections: [summary] })).toMatch(/^Indicative value: GBP [\d.]+[km]? to GBP [\d.]+[km]? a year, [\d.]+% to [\d.]+% of the technology spend in scope\./);
      expect(doc.sections[1].id).toBe('value');
      const t = text(doc);
      expect(t).toContain('LTM planning estimate');
      expect(t).toContain('not a savings commitment');
      expect(t).not.toContain('No amount is stated');
      expect(t).toContain('Shares are rescaled to the categories the client said the spend figure includes');
    }
  });

  it('a tampered range fails the trace check', () => {
    const doc = JSON.parse(JSON.stringify(docs[0].doc)) as ReportDocument;
    let done = false;
    walkSegments(doc, s => { if (!done && typeof s !== 'string' && s.trace?.field === 'indicative.total.high') { s.trace.value += 1000; done = true; } });
    expect(done).toBe(true);
    expect(checkCostIqReport(doc, i, 'client', '2026-11-12').failures.some(f => f.check === 'R2' && /indicative\.total\.high/.test(f.detail))).toBe(true);
  });

  it('lists the assumptions behind the ranges and puts them in the backlog', () => {
    const t = text(docs[0].doc);
    for (const a of ['A-12', 'A-13', 'A-14']) expect(t).toContain(a);
    const b = costIqBacklog(i, 'client');
    const lo = b.header.indexOf('Indicative low a year'), cur = b.header.indexOf('Indicative currency');
    expect(lo).toBeGreaterThan(0);
    expect(b.rows.filter(r => r[lo] !== '').length).toBe(ind.lines.length);
    expect(b.rows.filter(r => r[lo] !== '').every(r => r[cur] === 'GBP')).toBe(true);
  });

  it('keeps an acronym capitalised when a title starts a clause', () => {
    const t = text(docs[0].doc);
    expect(t).not.toMatch(/saaS/);
  });

  it('A2: page 3 of the client PDF is the one-page answer: the amount, the moves, the decision and the first 100 days', async () => {
    const { renderPdf } = await import('../src/report/pdf');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await renderPdf(docs[0].doc)), verbosity: 0 }).promise;
    const page = (n: number) => pdf.getPage(n).then(p => p.getTextContent()).then(t => (t.items as any[]).map(x => x.str).join(' ').replace(/\s+/g, ' '));
    const p3 = await page(3);
    expect(p3).toMatch(/Indicative value: GBP [\d.]+[km]? to GBP [\d.]+[km]? a year/);
    expect(p3).toMatch(/Most of it sits in three moves/);
    expect(p3).toContain('Decision requested');
    expect(p3).toContain('The first 100 days');
    expect(p3).toContain('Day 100');
    // The scores are supporting evidence: the areas to look at first are in the scores section, not the summary.
    expect(p3).not.toContain('Where to look first');
  }, 60_000);

  it('A3: each sized finding shows its addressable base, the rate applied and a Low confidence, and the numbers agree', () => {
    for (const { doc } of docs) {
      const sec = doc.sections.find(x => x.id === 'findings')!;
      const rows = sec.blocks.filter(b => b.kind === 'table').map((b: any) => b.rows.map((r: any) => r[0].join('')));
      expect(rows.filter((r: string[]) => r.includes('Addressable base') && r.includes('Confidence')).length).toBe(ind.lines.length);
    }
    for (const l of ind.lines) {
      const rate = (library.findings as any)[l.findingId].rate;
      expect(l.shareLow).toBeCloseTo(l.baseShare * rate[0], 12);
      expect(l.shareHigh).toBeCloseTo(l.baseShare * rate[1], 12);
      expect(l.baseHigh! * rate[1]).toBeCloseTo(l.high!, -1);
    }
    expect(text(docs[0].doc)).toContain('Low. The rate and the split by category are LTM planning assumptions');
  });

  it('A3: the indicative value says what it leaves out', () => {
    expect(text({ meta: docs[0].doc.meta, sections: [docs[0].doc.sections[0]] })).toContain('It excludes cloud and SaaS, which FinOps IQ sizes.');
  });
});

describe('value charts (B1)', () => {
  const answers: Record<string, unknown> = {
    'CORE-01': ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M',
    'CORE-05': ['INFRA', 'SOFTWARE', 'APPS', 'PEOPLE', 'EXTERNAL', 'SAAS'], 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION']
  };
  for (const id of Object.keys(library.findings)) {
    const t = (calibration[id] ?? []).find((x: any) => x.type === 'option' && !x.applicableWhen && !answers[x.questionId]);
    if (t) answers[t.questionId] = cfg.questions.find((q: any) => q.id === t.questionId)?.interaction?.startsWith('multi') ? [t.triggerOptions[0]] : t.triggerOptions[0];
  }
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const ind = indicativeFor(i);
  const doc = costIqReport(i, { client: 'Example Insurer', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Insurer', view: 'client' });
  const value = doc.sections.find(s => s.id === 'value')!;
  const chart = value.blocks.find(b => b.kind === 'ranges') as Extract<ReportDocument['sections'][number]['blocks'][number], { kind: 'ranges' }>;
  const matrix = value.blocks.find(b => b.kind === 'matrix') as Extract<ReportDocument['sections'][number]['blocks'][number], { kind: 'matrix' }>;

  it('draws one range per counted category and the total, from the traced figures, largest first', () => {
    const counted = ind.lines.filter(l => l.counted);
    expect(chart.items.length).toBe(counted.length + 1);
    expect(chart.items.at(-1)).toMatchObject({ total: true, low: { trace: { field: 'indicative.total.low', value: ind.total!.low } }, high: { trace: { field: 'indicative.total.high', value: ind.total!.high } } });
    const highs = chart.items.filter(x => !x.total).map(x => x.high!.trace.value);
    expect(highs).toEqual([...highs].sort((a, b) => b - a));
  });

  it('places every sized finding with a step on the matrix, by its traced upper share', () => {
    expect(matrix.points.length).toBeGreaterThan(1);
    for (const p of matrix.points) {
      const l = ind.lines.find(x => x.findingId === /\[(F-\d{3})\]/.exec(p.y.trace.field)![1])!;
      expect(p.y.trace.value).toBe(l.shareHigh);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThanOrEqual(matrix.x.max);
    }
    expect(matrix.key.length).toBe(matrix.points.length);
  });

  it('a chart figure that does not match the engine fails the trace check', () => {
    const bad = JSON.parse(JSON.stringify(doc)) as ReportDocument;
    const r = bad.sections.find(s => s.id === 'value')!.blocks.find(b => b.kind === 'ranges') as any;
    r.items[0].high.trace.value *= 2;
    expect(checkCostIqReport(bad, i, 'client', '2026-11-12').failures.some(f => f.check === 'R2')).toBe(true);
    expect(checkCostIqReport(doc, i, 'client', '2026-11-12').failures).toEqual([]);
  });

  it('renders to PDF with both charts', async () => {
    const { renderPdf } = await import('../src/report/pdf');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await renderPdf(doc)), verbosity: 0 }).promise;
    let all = '';
    for (let n = 1; n <= pdf.numPages; n++) all += ((await (await pdf.getPage(n)).getTextContent()).items as any[]).map(x => x.str).join(' ') + ' ';
    expect(all).toContain('Where the value sits');
    expect(all).toContain('More value, sooner');
  }, 60_000);
});

describe('the CIO brief (B2)', () => {
  const answers: Record<string, unknown> = {
    'CORE-01': ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M',
    'CORE-05': ['INFRA', 'SOFTWARE', 'APPS', 'PEOPLE', 'EXTERNAL', 'SAAS'], 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION']
  };
  for (const id of Object.keys(library.findings)) {
    const t = (calibration[id] ?? []).find((x: any) => x.type === 'option' && !x.applicableWhen && !answers[x.questionId]);
    if (t) answers[t.questionId] = cfg.questions.find((q: any) => q.id === t.questionId)?.interaction?.startsWith('multi') ? [t.triggerOptions[0]] : t.triggerOptions[0];
  }
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const opts = { client: 'Example Insurer', preparedBy: 'LTM', dataProvidedBy: 'Example Insurer' };
  const brief = costIqBrief(i, opts);
  const full = costIqReport(i, { ...opts, view: 'client' });
  const traces = (doc: ReportDocument) => { const m = new Map<string, number>(); walkSegments(doc, s => { if (typeof s !== 'string' && s.trace) m.set(s.trace.field, s.trace.value); }); return m; };

  it('passes the same report checks as the full report, as a brief', () => {
    expect(checkCostIqReport(brief, i, 'client', '2026-11-12', 'brief').failures).toEqual([]);
    expect(brief.meta.layout).toBe('brief');
    expect(brief.sections.map(s => s.id)).toEqual(['brief-answer', 'brief-plan', 'brief-basis']);
  });

  it('shows the same figures as the full report: every traced field in the brief has the same value there', () => {
    const b = traces(brief), f = traces(full);
    expect(b.size).toBeGreaterThan(10);
    for (const [field, v] of b) expect(f.get(field), field).toBe(v);
  });

  it('renders to two pages: the answer and where the value sits, then priorities, the first 100 days and the basis', async () => {
    const { renderPdf } = await import('../src/report/pdf');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await renderPdf(brief)), verbosity: 0 }).promise;
    expect(pdf.numPages).toBe(2);
    const page = async (n: number) => ((await (await pdf.getPage(n)).getTextContent()).items as any[]).map(x => x.str).join(' ').replace(/\s+/g, ' ');
    const [p1, p2] = [await page(1), await page(2)];
    expect(p1).toContain('CIO brief: technology cost and value');
    expect(p1).toMatch(/Indicative value: GBP [\d.]+[km]? to GBP [\d.]+[km]? a year/);
    expect(p1).toContain('Decision requested');
    expect(p1).toContain('Where the value sits');
    expect(p2).toContain('Value against time to deliver');
    expect(p2).toContain('The first 100 days');
    expect(p2).not.toContain('see the assumptions');
    expect(p2).toContain('does not assess legal, tax or regulatory obligations');
  }, 60_000);
});

describe('the slide deck (B3)', () => {
  const answers: Record<string, unknown> = {
    'CORE-01': ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL'], 'CTX-01': 'GBP', 'CORE-04': '25M_50M',
    'CORE-05': ['INFRA', 'SOFTWARE', 'APPS', 'PEOPLE', 'EXTERNAL', 'SAAS'], 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION']
  };
  for (const id of Object.keys(library.findings)) {
    const t = (calibration[id] ?? []).find((x: any) => x.type === 'option' && !x.applicableWhen && !answers[x.questionId]);
    if (t) answers[t.questionId] = cfg.questions.find((q: any) => q.id === t.questionId)?.interaction?.startsWith('multi') ? [t.triggerOptions[0]] : t.triggerOptions[0];
  }
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-12', currency: 'GBP', finops: null, finopsLinkedAt: null };
  const opts = { client: 'Example Insurer', preparedBy: 'LTM', dataProvidedBy: 'Example Insurer' };
  const deck = costIqDeck(i, opts);
  const full = costIqReport(i, { ...opts, view: 'client' });
  const traces = (doc: ReportDocument) => { const m = new Map<string, number>(); walkSegments(doc, s => { if (typeof s !== 'string' && s.trace) m.set(s.trace.field, s.trace.value); }); return m; };

  it('passes the report checks as a deck, and every figure equals the full report', () => {
    expect(checkCostIqReport(deck, i, 'client', '2026-11-12', 'deck').failures).toEqual([]);
    const d = traces(deck), f = traces(full);
    expect(d.size).toBeGreaterThan(10);
    for (const [field, v] of d) expect(f.get(field), field).toBe(v);
    expect(deck.sections.map(s => s.id)).toEqual(expect.arrayContaining(['deck-answer', 'deck-value', 'deck-priorities', 'deck-findings', 'deck-100', 'deck-roadmap', 'deck-asks', 'deck-basis']));
  });

  it('renders a .pptx in the LTM master: a title slide and one slide per section, with the figures as text', async () => {
    const { renderPptx } = await import('../src/report/pptx');
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await renderPptx(deck));
    const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides.length).toBeGreaterThanOrEqual(deck.sections.length + 1);
    expect(slides.length).toBeLessThanOrEqual(12);
    const masters = Object.keys(zip.files).filter(n => /^ppt\/slideLayouts\/.*\.xml$/.test(n));
    const layouts = (await Promise.all(masters.map(n => zip.file(n)!.async('string')))).join('');
    expect(layouts).toContain('name="LTM"');
    const xml = (await Promise.all(slides.map(n => zip.file(n)!.async('string')))).join('');
    expect(xml).toContain('Indicative value: ');
    expect(xml).toContain(`GBP ${(Math.floor(indicativeFor(i).total!.high! / 1e4) / 100).toFixed(2)}m`);
    expect(xml).toContain('The first 100 days');
    expect(xml).toContain('qualified professional');
  }, 60_000);
});

describe('finding catalogue lint (A3)', () => {
  it('titles are stated, not hedged, and "Why it matters" carries no "may"', () => {
    for (const f of cfg.findings) {
      expect(f.title, f.id).not.toMatch(/\bmay\b|\bmight\b|\bcould\b|\bpotentially\b/i);
      expect(f.description, f.id).not.toMatch(/\bmay\b|\bmight\b|\bpotentially\b/i);
      expect(f.title.length, f.id).toBeLessThanOrEqual(70);
    }
  });

  it('every "Evidence for" line in the delivery library names its finding by the current title', () => {
    const titles = new Map(cfg.findings.map((f: any) => [f.id, f.title]));
    const lib = require('../src/accelerators/cost-iq/delivery-library.json');
    for (const p of lib.packages) for (const t of p.prerequisites) {
      const m = /^Evidence for (F-\d{3}) \(([^)]+)\)/.exec(t);
      if (m) expect(m[2], `${p.recommendationId} ${m[1]}`).toBe(titles.get(m[1]));
    }
    expect(JSON.stringify(lib)).toBe(JSON.stringify(require('../../../docs/cio-readiness/cost-iq/delivery-library.json')));
  });
});

