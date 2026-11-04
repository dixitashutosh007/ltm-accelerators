/**
 * Cost IQ report (CQ5): both editions across five profiles, with and without a linked FinOps IQ result. The report
 * checks pass (every traced number equals its engine field), the client edition carries no internal IDs, the cloud line
 * is the FinOps IQ summary unchanged, no total is stated beyond it, and the PDF renders.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { costIqReport, costIqBacklog, resolveCostIqField, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { renderPdf } from '../src/report/pdf';
import { toCsv } from '../src/report/csv';
import { text, walkSegments, type ReportDocument } from '../src/report/model';
import { evaluateFinOpsIqV3, type AnswerLevel } from '../src/accelerators/finops-iq/v3/evaluate';
import { costIqSummary } from '../src/accelerators/finops-iq/v3/cost-iq-summary';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const TODAY = '2026-11-04';

const PROFILES: Record<string, string[]> = {
  'on-premises-heavy': ['ON_PREM', 'VMWARE', 'COLO', 'EXTERNAL', 'NETWORK'], 'cloud-heavy': ['PUBLIC_CLOUD', 'SAAS', 'AI', 'DATA'],
  'SaaS-heavy': ['SAAS', 'END_USER', 'SOFTWARE'], outsourced: ['EXTERNAL', 'SOFTWARE', 'NETWORK'], mixed: ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL', 'AI']
};
const AREAS: string[] = cfg.settings.selection.defaultAreas;

/** Answers every shown question, choosing options in a repeatable pattern so findings and mid scores both occur. */
function answersFor(footprint: string[], salt: number): Record<string, unknown> {
  const answers: Record<string, unknown> = { 'CORE-01': footprint, 'CORE-16': 'TRUE' };
  const shown: Set<string> = require('../src/accelerators/cost-iq/canon/costiq-engine-v10.cjs').shownQuestionIds(cfg, AREAS, answers);
  let seed = salt; const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const q of cfg.questions) {
    if (!shown.has(q.id) || q.id === 'CORE-01') continue;
    const opts = (q.options || []).map((o: any) => o.id);
    if (opts.length) answers[q.id] = q.interaction === 'multi-select' ? [opts[0]] : opts[Math.floor(next() * opts.length)];
    else if (q.interaction === 'stars') answers[q.id] = 3; else if (['slider', 'range'].includes(q.interaction)) answers[q.id] = Math.floor(next() * 100);
  }
  return answers;
}

const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const summaries = SCENARIOS.map(sc => costIqSummary(evaluateFinOpsIqV3({ mode: sc.mode, facts: sc.inputs.facts, answers: Object.fromEntries(Object.entries<string>(sc.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]])), assessmentDate: '2026-10-14' } as any)));
const SUMMARY = summaries.find(x => x.status === 'quantified') ?? null;

function input(footprint: string[], salt: number, finops: ReturnType<typeof costIqSummary> | null): CostIqReportInput {
  const answers = answersFor(footprint, salt);
  const scope = { selectedAreas: AREAS };
  return { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-03', currency: 'GBP', finops, finopsLinkedAt: finops ? '2026-11-03' : null };
}

const runs = Object.entries(PROFILES).flatMap(([name, fp], k) => [null, SUMMARY].flatMap(f =>
  (['consultant', 'client'] as const).map(view => {
    const i = input(fp, k + 7, f);
    return { label: `${name} ${f ? 'linked' : 'unlinked'} ${view}`, view, i, doc: costIqReport(i, { ...OPTS, view, notes: 'Note for the team' }) };
  })));

const everything = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); for (const s of doc.sections) { out.push(s.title); for (const b of s.blocks) if (b.kind === 'subheading') out.push(b.text); } return out.join(' '); };

describe('Cost IQ report', () => {
  it('builds both editions for every profile, linked and unlinked', () => { expect(runs.length).toBe(20); });

  it('passes the shared report checks: every traced number equals its engine field', () => {
    for (const r of runs) { const c = checkCostIqReport(r.doc, r.i, r.view, TODAY); expect(c.failures, r.label).toEqual([]); }
  });

  it('has the required sections, and the consultant appendix only in the consultant edition', () => {
    for (const r of runs) {
      const ids = r.doc.sections.map(s => s.id);
      for (const id of ['summary', 'profile', 'scores', 'findings', 'cloud', 'roadmap', 'help', 'calculation', 'assumptions', 'methodology', 'sources']) expect(ids, r.label).toContain(id);
      expect(ids.includes('consultant'), r.label).toBe(r.view === 'consultant');
    }
  });

  it('keeps question, finding and dimension IDs and consultant notes out of the client edition', () => {
    for (const r of runs.filter(x => x.view === 'client')) {
      const t = everything(r.doc);
      expect(t, r.label).not.toMatch(/\b(?:CORE|ADP|CTX)-\d{2}\b|\b[FR]-\d{3}\b|\b(?:COST|VALUE)-\d{2}\b/);
      expect(t, r.label).not.toContain('Note for the team');
    }
  });

  it('shows the cloud line exactly as FinOps IQ gave it, or says it is not quantified, and states no other total', () => {
    expect(SUMMARY?.status).toBe('quantified');
    for (const r of runs) {
      const t = everything(r.doc);
      if (!r.i.finops) { expect(t.toLowerCase(), r.label).toContain('not quantified'); continue; }
      const f = r.i.finops;
      expect(resolveCostIqField(r.i, 'finops.cases.expected.netRunRate.value')).toBeUndefined();
      expect(resolveCostIqField(r.i, 'finops.cases.expected.netRunRate')).toBe(f.cases!.expected.netRunRate.value);
      expect(t, r.label).toContain('does not estimate it again');
      expect(t.toLowerCase(), r.label).not.toMatch(/total (?:saving|opportunity)/);
    }
  });

  it('is deterministic and does not change the scores (the report reads the result, it does not recompute it)', () => {
    const a = costIqReport(runs[0].i, { ...OPTS, view: 'client' }), b = costIqReport(runs[0].i, { ...OPTS, view: 'client' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const h = runs[0].i.result.headlines;
    expect(text(a.sections[0].blocks.flatMap(bl => (bl.kind === 'paragraph' ? bl.segs : [])))).toContain(String(Math.round(h.costIQ as number)));
  });

  it('lists each assumption with its basis and what changes if it is wrong, and every source with a year', () => {
    const doc = runs[0].doc;
    const a = doc.sections.find(s => s.id === 'assumptions')!.blocks.find(b => b.kind === 'table') as any;
    expect(a.head).toEqual(['Assumption', 'Value', 'Basis', 'Confidence', 'If wrong']);
    expect(a.rows.length).toBeGreaterThanOrEqual(6);
    for (const row of a.rows) for (const cell of row) expect(text(cell).length).toBeGreaterThan(0);
    const s = doc.sections.find(x => x.id === 'sources')!.blocks.find(b => b.kind === 'table') as any;
    for (const row of s.rows) expect(text(row[2])).toMatch(/^\d{4}$/);
  });

  it('gives a backlog with one row per finding, internal IDs only in the consultant edition', () => {
    const r = runs[0];
    const client = costIqBacklog(r.i, 'client'), consultant = costIqBacklog(r.i, 'consultant');
    expect(client.rows.length).toBe(r.i.result.findings.length);
    expect(client.header).not.toContain('Finding ID');
    expect(consultant.header[0]).toBe('Finding ID');
    expect(toCsv(client)).toContain('Evidence needed before sizing');
  });

  it('renders a PDF for every edition', async () => {
    for (const r of [runs[0], runs[1], runs[11]]) {
      const pdf = await renderPdf(r.doc);
      expect(pdf.subarray(0, 4).toString(), r.label).toBe('%PDF');
      expect(pdf.length, r.label).toBeGreaterThan(5000);
    }
  }, 60000);
});

