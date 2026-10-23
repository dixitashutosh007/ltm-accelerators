/**
 * FinOps IQ report (execution phase M4; plan F7, WS-S4): every number in the PDF document resolves to the engine
 * result, or is recomputed from it when the report derives it (area 13(a)); screen = PDF = backlog = engine; the
 * client edition carries nothing consultant-only; the roadmap places every finding; the backlog CSV is safe to open.
 * Runs on the nine reference scenarios (docs/cio-readiness/finops-iq/design/reference-scenarios.json), both editions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { evaluateFinOpsIqV3, type AnswerLevel, type FinOpsIqV3Input, type FinOpsIqV3Result } from '../src/accelerators/finops-iq/v3/evaluate';
import { clientView } from '../src/accelerators/finops-iq/v3/client-view';
import {
  BACKLOG_HEADER, effortBand, findingEffort, finopsIqBacklog, finopsIqReport, finopsIqRoadmap, finopsIqSensitivity, resolveTraceField
} from '../src/accelerators/finops-iq/v3/report';
import { format, walkSegments, type ReportDocument, type Seg, type Trace } from '../src/report/model';
import { cell, toCsv } from '../src/report/csv';
import { renderPdf } from '../src/report/pdf';
import register from '../src/claims/claims-register.json' with { type: 'json' };
import assumptions from '../src/accelerators/finops-iq/registry/assumptions.json' with { type: 'json' };
import workstreams from '../src/accelerators/finops-iq/registry/workstreams.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs');
const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CLAIM = new Map<string, any>((register as any).claims.map((c: any) => [c.id, c]));
const ASM_IDS = new Set<string>((assumptions as any).assumptions.map((a: any) => a.id));
const ASSESSED = '2026-10-14';

const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
function scenarioInput(s: any): FinOpsIqV3Input {
  const answers = Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]));
  return { mode: s.mode, facts: s.inputs.facts, answers, assessmentDate: ASSESSED };
}

const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const runs = SCENARIOS.flatMap(s => {
  const input = scenarioInput(s);
  const r = evaluateFinOpsIqV3(input);
  return (['consultant', 'client'] as const).map(view => ({
    label: `${s.id} ${view}`, view, input, r,
    /** What the edition is built from: the client edition goes through clientView(). */
    shown: view === 'client' ? (clientView(r) as unknown as FinOpsIqV3Result) : r,
    doc: finopsIqReport(r, { ...OPTS, view, input })
  }));
});

type TracedSeg = Exclude<Seg, string> & { trace: Trace };
function traces(doc: ReportDocument): TracedSeg[] {
  const out: TracedSeg[] = [];
  walkSegments(doc, s => { if (typeof s !== 'string' && s.trace) out.push(s as TracedSeg); });
  return out;
}

/** The value a traced number must have: read from the engine, or recomputed as the report says it derived it. */
function expectedValue(t: Trace, x: (typeof runs)[number], byField: Map<string, number>): number | undefined {
  const field = (f: string) => (f.startsWith('report:') ? byField.get(f) : resolveTraceField(x.shown, f));
  const sensitivity = (fact: string) => finopsIqSensitivity(x.input, x.r).find(s => s.fact === fact);
  const tested = /^report:sensitivity\[(.+)\]\.(lowInput|highInput)$/.exec(t.field);
  if (tested) return sensitivity(tested[1])?.[tested[2] as 'lowInput' | 'highInput'];
  if (t.derived?.op === 'sensitivity') {
    const row = sensitivity(t.derived.of[0]);
    return row ? (t.derived.detail as any).side === 'low' ? row.low : row.high : undefined;
  }
  if (!t.derived) return t.field.startsWith('report:') ? byField.get(t.field) : resolveTraceField(x.shown, t.field);
  const vals = t.derived.of.map(field);
  if (vals.some(v => v === undefined)) return undefined;
  switch (t.derived.op) {
    case 'sum': return vals.reduce((a, b) => a! + b!, 0);
    case 'min': return Math.min(...(vals as number[]));
    case 'max': return Math.max(...(vals as number[]));
    case 'effort': {
      const gaps = new Set<string>((t.derived.detail as any).gapFields);
      return t.derived.of.reduce((sum, f, i) => sum + (gaps.has(f) ? vals[i]! * (t.derived!.detail as any).perLevel : vals[i]!), 0);
    }
    default: return undefined;
  }
}

describe('FinOps IQ report: every number traces to the engine (area 13(a))', () => {
  it.each(runs.map(x => [x.label, x]))('%s: each traced number equals its engine field or its stated derivation, and is shown with the shared formatter', (_, x) => {
    const all = traces(x.doc);
    expect(all.length).toBeGreaterThan(40);
    const byField = new Map(all.map(s => [s.trace.field, s.trace.value]));
    const bad: string[] = [];
    for (const s of all) {
      const want = expectedValue(s.trace, x, byField);
      if (want === undefined || Math.abs(want - s.trace.value) > 1e-9) bad.push(`${s.trace.field}: shown ${s.trace.value}, engine ${want}`);
      if (format(s.trace.value, s.trace.unit, x.r.value.currency) !== s.text) bad.push(`${s.trace.field}: text "${s.text}" is not the formatted value`);
      for (const id of s.trace.claimIds) if (!CLAIM.has(id)) bad.push(`${s.trace.field}: unknown claim ${id}`);
      for (const id of s.trace.assumptionIds) if (!ASM_IDS.has(id)) bad.push(`${s.trace.field}: unknown assumption ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it.each(runs.map(x => [x.label, x]))('%s: no number appears in plain text; quoted text names claims or assumptions that exist', (_, x) => {
    const bad: string[] = [];
    walkSegments(x.doc, (s, section) => {
      // Consultant checks quote engine probes and tier steps verbatim; that appendix is not in the client edition.
      if (section.id === 'consultant') return;
      if (typeof s === 'string') { if (/\d/.test(s)) bad.push(`${section.id}: "${s}"`); return; }
      if (!s.trace && !s.ref && !s.cite && /\d/.test(s.text)) bad.push(`${section.id}: "${s.text}"`);
      for (const id of s.cite ?? []) if (!CLAIM.has(id) && !ASM_IDS.has(id)) bad.push(`${section.id}: cites unknown ${id}`);
    });
    expect(bad).toEqual([]);
  });

  it('every engine figure the screen shows as a headline is in the report: net run-rate, first-year and 3-year net, each case', () => {
    for (const x of runs.filter(y => y.r.value.moneyShown)) {
      const fields = new Set(traces(x.doc).map(s => s.trace.field));
      for (const k of ['conservative', 'expected', 'upper']) {
        for (const f of ['netRunRate', 'netYear1', 'net3Year', 'grossRunRate']) expect(fields.has(`value.totals.${k}.${f}`), `${x.label} ${k}.${f}`).toBe(true);
      }
      for (const l of x.r.value.levers.filter(l => l.cases)) expect(fields.has(`value.levers[${l.id}].cases.expected.runRate`), `${x.label} ${l.id}`).toBe(true);
    }
  });

  it('no banned phrase appears anywhere in the document', () => {
    for (const x of runs) {
      const text = JSON.stringify(x.doc);
      for (const re of BANNED as RegExp[]) expect(re.test(text), `${x.label}: ${re}`).toBe(false);
    }
  });

  it('a result without an assessment date (not completed) has no report', () => {
    const { assessmentDate, ...rest } = runs[0].r;
    expect(() => finopsIqReport(rest as FinOpsIqV3Result, { ...OPTS, view: 'consultant' })).toThrow(/assessment date/);
  });
});

/** The plain text of the named sections. */
const sectionText = (doc: ReportDocument, ids: string[]) => {
  const parts: string[] = [];
  walkSegments({ meta: doc.meta, sections: doc.sections.filter(s => ids.includes(s.id)) }, s => parts.push(typeof s === 'string' ? s : s.text));
  for (const s of doc.sections.filter(x => ids.includes(x.id))) for (const b of s.blocks) if (b.kind === 'subheading') parts.push(b.text);
  return parts.join(' ');
};
const BODY = ['summary', 'profile', 'findings', 'value', 'roadmap', 'market', 'methodology'];

describe('FinOps IQ report: CIO challenge test fixes (M4-cio-challenge.md)', () => {
  it('Q2: net is reconciled with the roadmap: lever effort netted + capability effort not netted = roadmap effort; the conservative first year is in the summary', () => {
    for (const x of runs.filter(y => y.r.value.moneyShown && y.view === 'consultant')) {
      const shown = new Map(traces(x.doc).map(s => [s.trace.field, s.trace.value]));
      const roadmap = finopsIqRoadmap(x.r).reduce((t, w) => t + w.effort.fteMonths, 0);
      const notNetted = shown.get('report:notNetted.capabilityEffort') ?? 0;
      const netted = finopsIqRoadmap(x.r).flatMap(w => w.effort.leverFields).reduce((t, f) => t + resolveTraceField(x.r, f)!, 0);
      expect(netted + notNetted, x.label).toBe(roadmap);
      const summary = traces({ meta: x.doc.meta, sections: [x.doc.sections[0]] }).map(s => s.trace.field);
      expect(summary, x.label).toContain('value.totals.conservative.netYear1');
      expect(sectionText(x.doc, ['summary', 'value'])).toMatch(/Not netted, and shown for your decision/);
      // The FinOps team is always accounted for: its cost, or the reason it is not shown.
      expect(sectionText(x.doc, ['summary', 'value']), x.label).toMatch(/Not netted, and shown for your decision: [^.]*(FinOps lead or team of|no (separate )?FinOps team cost)/);
    }
  });

  it('Q7: the methodology says why provider tools are not enough, naming the tools for the client\'s providers', () => {
    for (const x of runs) {
      const text = sectionText(x.doc, ['methodology']);
      expect(text, x.label).toMatch(/Why provider tools are not enough/);
      const providers: string[] = x.input.facts.footprint.publicCloudProviders;
      if (providers.includes('aws')) expect(text).toMatch(/AWS Cost Optimization Hub/);
      if (providers.includes('azure')) expect(text).toMatch(/Azure Advisor/);
      if (providers.includes('gcp')) expect(text).toMatch(/Google Cloud Recommender/);
    }
  });

  it('Q6 and D2: the waste estimate is never an input, and one question count is used (all questions, of which capability questions)', () => {
    for (const x of runs) {
      const text = sectionText(x.doc, ['methodology']);
      expect(text).toMatch(/own estimate of waste, it is not used in any figure/);
      const fields = traces(x.doc).map(s => s.trace.field);
      expect(fields).toContain('questions.asked.length');
    }
  });

  it('D8: the client edition body has no question, finding or design IDs; the consultant edition keeps finding IDs on milestones', () => {
    for (const x of runs.filter(y => y.view === 'client')) {
      const text = sectionText(x.doc, BODY);
      expect(text.match(/\b(?:[A-Z]{2}-\d{2}|F-FIN-[A-Z0-9_-]+|LEV-\d{2})\b|\((?:Q|D)\d+\)|WS-S\d/g), x.label).toBeNull();
    }
    expect(sectionText(runs.find(y => y.label === 'RS4 consultant')!.doc, ['roadmap'])).toMatch(/F-FIN-DATA_INGESTION/);
  });

  it('D3 and D6: no private source address, "null" or internal file reference in the client edition', () => {
    for (const x of runs.filter(y => y.view === 'client')) {
      const text = sectionText(x.doc, x.doc.sections.map(s => s.id));
      expect(text).not.toMatch(/github\.com|\bnull\b|FRAMEWORK\.md|DESIGN\.md/);
    }
  });

  it('D7: a lever without a base shows no rate, and a blended rate says so', () => {
    for (const x of runs) {
      const value = x.doc.sections.find(s => s.id === 'value')!;
      for (const b of value.blocks.filter(b => b.kind === 'table' && b.head[0] === 'Lever') as any[]) {
        for (const row of b.rows) {
          const rate = row[2].map((s: Seg) => (typeof s === 'string' ? s : s.text)).join('');
          expect(rate, x.label).not.toBe('0%');
        }
      }
    }
  });

  it('D10: roadmap items follow the estate: no licence actions without SaaS or licensing in scope, and the workstream is renamed', () => {
    const rs5 = runs.find(y => y.label === 'RS5 client')!;
    expect(rs5.input.facts.footprint.scopes).not.toContain('saas');
    const text = sectionText(rs5.doc, ['roadmap']);
    expect(text).not.toMatch(/licences and seats/i);
    if (finopsIqRoadmap(rs5.r).some(w => w.id === 'WS-COMMITMENTS')) expect(text).toMatch(/Commitment portfolio/);
    const rs4 = runs.find(y => y.label === 'RS4 client')!;
    expect(sectionText(rs4.doc, ['roadmap'])).toMatch(/licences and seats/i);
  });
});

describe('FinOps IQ report: client edition', () => {
  const clientRuns = runs.filter(x => x.view === 'client');
  it.each(clientRuns.map(x => [x.label, x]))('%s: no consultant appendix, probe, tier trace or need modifier; sources are client-visible claims only', (_, x) => {
    expect(x.doc.meta.view).toBe('client');
    expect(x.doc.sections.map(s => s.id)).not.toContain('consultant');
    const text = JSON.stringify(x.doc);
    for (const c of x.r.conflicts) expect(text).not.toContain(c.probe);
    for (const t of x.r.tier.trace) expect(text).not.toContain(t);
    expect(text).not.toMatch(/needVerdict\.modifiers|severityTrace|valueBasis|value\.scoring|value\.bands/);
    const sources = x.doc.sections.find(s => s.id === 'sources')!;
    walkSegments({ meta: x.doc.meta, sections: [sources] }, s => {
      if (typeof s !== 'string' && s.ref && /^CLM-/.test(s.text)) expect(CLAIM.get(s.text)?.clientVisible, s.text).not.toBe(false);
    });
  });

  it('the consultant edition keeps the consultant checks', () => {
    for (const x of runs.filter(y => y.view === 'consultant')) expect(x.doc.sections.at(-1)!.id).toBe('consultant');
  });
});

describe('FinOps IQ report: roadmap (F7 item 3, area 13(e))', () => {
  const consultant = runs.filter(x => x.view === 'consultant');
  it.each(consultant.map(x => [x.label, x]))('%s: every finding sits in exactly one workstream; start, end, effort and value follow from its findings', (_, x) => {
    const roadmap = finopsIqRoadmap(x.r);
    const placed = roadmap.flatMap(w => w.findings.map(f => f.id));
    expect([...placed].sort()).toEqual(x.r.findings.map(f => f.id).sort());
    const ids = new Set(roadmap.map(w => w.id));
    for (const w of roadmap) {
      expect(w.start).toBe(Math.min(...w.findings.map(f => f.start.month)));
      expect(w.end).toBe(Math.max(...w.findings.map(f => f.start.month + f.targetDuration.months)));
      expect(w.end).toBeGreaterThan(w.start);
      expect(w.effort.fteMonths).toBe(w.findings.reduce((t, f) => t + findingEffort(f, x.r).fteMonths, 0));
      expect(w.effort.band).toBe(effortBand(w.effort.fteMonths));
      expect(w.value?.expected ?? 0).toBe(x.r.value.moneyShown ? w.findings.reduce((t, f) => t + (f.value?.expected.value ?? 0), 0) : 0);
      for (const d of w.dependsOn) expect(ids.has(d), `${w.id} depends on ${d}`).toBe(true);
      expect(w.owners.length).toBeGreaterThan(0);
      expect(w.activities.length && w.kpis.length && w.prerequisites.length && w.risks.length).toBeTruthy();
    }
  });

  it('the effort heuristic and bands come from the workstream registry (ASM-FIN-086)', () => {
    const bands = (workstreams as any).effort.bands;
    expect(effortBand(0)).toBe(bands[0].label);
    expect(effortBand(bands[0].maxFteMonths)).toBe(bands[0].label);
    expect(effortBand(bands[0].maxFteMonths + 0.5)).toBe(bands[1].label);
    expect(effortBand(bands[1].maxFteMonths + 0.5)).toBe(bands[2].label);
    expect((workstreams as any).effort.assumptionId).toBe('ASM-FIN-086');
  });

  it('a lever is counted once: workstream values add up to the finding values', () => {
    for (const x of consultant.filter(y => y.r.value.moneyShown)) {
      const total = finopsIqRoadmap(x.r).reduce((t, w) => t + (w.value?.expected ?? 0), 0);
      expect(total).toBe(x.r.findings.reduce((t, f) => t + (f.value?.expected.value ?? 0), 0));
    }
  });
});

describe('FinOps IQ report: sensitivity (F7 item 2)', () => {
  it('lists at most three inputs, largest swing first, each re-run through the engine', () => {
    for (const x of runs.filter(y => y.view === 'consultant')) {
      const rows = finopsIqSensitivity(x.input, x.r);
      expect(rows.length).toBeLessThanOrEqual(3);
      if (x.r.value.moneyShown) expect(rows.length, x.label).toBeGreaterThan(0);
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1].swing).toBeGreaterThanOrEqual(rows[i].swing);
      for (const s of rows) {
        expect(s.base).toBe(x.r.value.totals!.expected.netRunRate.value);
        expect(s.lowInput).toBeLessThan(s.highInput);
        if (s.kind === 'exact' && !s.fact.startsWith('spend.') && !/Spend$/.test(s.fact)) expect(s.highInput).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('FinOps IQ report: screen = PDF = backlog = engine (F7 item 4)', () => {
  it.each(runs.map(x => [x.label, x]))('%s: one row per finding, per lever action and per platform action, with the engine\'s start, duration, effort and value', (_, x) => {
    const b = finopsIqBacklog(x.r, x.view);
    expect(b.header).toEqual(BACKLOG_HEADER);
    const col = (name: string) => BACKLOG_HEADER.indexOf(name);
    const findingRows = b.rows.filter(row => row[col('Lever')] === '' || x.r.findings.find(f => f.id === row[0])!.leverIds.join(' ') === row[col('Lever')]);
    expect(b.rows.length).toBe(x.r.findings.reduce((t, f) => t + 1 + f.leverActions.length, 0) + x.r.technicalPlan.actions.filter(a => !a.noPlatformAction).length);
    for (const f of x.r.findings) {
      const row = b.rows.find(r => r[0] === f.id)!;
      expect(row[col('Start month')]).toBe(f.start.month);
      expect(row[col('Duration (months)')]).toBe(f.targetDuration.months);
      expect(row[col('Effort (FTE-months)')]).toBe(findingEffort(f, x.r).fteMonths);
      expect(row[col('Expected value per year (gross)')]).toBe(x.r.value.moneyShown && f.value ? f.value.expected.value : '');
      expect(row[col('Owner role')]).toBe(f.ownerLabel);
    }
    expect(findingRows.length).toBeGreaterThanOrEqual(x.r.findings.length);
    for (const row of b.rows) expect(row.length).toBe(BACKLOG_HEADER.length);
  });

  it('the PDF shows the same finding values as the backlog', () => {
    for (const x of runs.filter(y => y.r.value.moneyShown)) {
      const shown = new Map(traces(x.doc).map(s => [s.trace.field, s.trace.value]));
      for (const f of x.r.findings.filter(y => y.value)) expect(shown.get(f.value!.expected.field), `${x.label} ${f.id}`).toBe(f.value!.expected.value);
    }
  });
});

describe('FinOps IQ report: no money figure without the internal cost rate (Q4)', () => {
  const s = SCENARIOS.find(x => x.id === 'RS4')!;
  const input = scenarioInput(s);
  const { internalRate, ...cost } = (input.facts.cost ?? {}) as any;
  const noRate: FinOpsIqV3Input = { ...input, facts: { ...input.facts, cost } };
  const r = evaluateFinOpsIqV3(noRate);
  const doc = finopsIqReport(r, { ...OPTS, view: 'client', input: noRate });
  it('shows the reason instead of figures, with no sensitivity and no workstream value', () => {
    expect(r.value.moneyShown).toBe(false);
    const currency = traces(doc).filter(t => t.trace.unit === 'currency' && /netRunRate|net3Year|netYear1|runRate|report:roadmap/.test(t.trace.field));
    expect(currency).toEqual([]);
    expect(finopsIqSensitivity(noRate, r)).toEqual([]);
    expect(finopsIqRoadmap(r).every(w => w.value === null)).toBe(true);
    expect(finopsIqBacklog(r).rows.every(row => row[BACKLOG_HEADER.indexOf('Expected value per year (gross)')] === '')).toBe(true);
  });
});

describe('Backlog CSV and PDF rendering (WS-S4)', () => {
  it('quotes RFC 4180 fields, starts with a byte-order mark, ends rows with CRLF, and defuses formulas', () => {
    expect(cell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(cell('+44 20')).toBe("'+44 20");
    expect(cell('-1')).toBe("'-1");
    expect(cell('@cmd')).toBe("'@cmd");
    expect(cell(-1)).toBe('-1');
    expect(cell('a, "b"')).toBe('"a, ""b"""');
    expect(cell(Number.NaN)).toBe('');
    const csv = toCsv({ header: ['A', 'B'], rows: [['x', 1], ['line\nbreak', '=1']] });
    expect(csv.startsWith('﻿A,B\r\n')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain('"line\nbreak",\'=1');
  });

  it('every backlog has the same number of fields on every line once parsed', () => {
    for (const x of runs) {
      const csv = toCsv(finopsIqBacklog(x.r, x.view)).slice(1);
      const rows: string[][] = [];
      let row: string[] = [], field = '', quoted = false;
      for (let i = 0; i < csv.length; i++) {
        const ch = csv[i];
        if (quoted) { if (ch === '"' && csv[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch; }
        else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\r' && csv[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
        else field += ch;
      }
      expect(rows.length).toBe(finopsIqBacklog(x.r, x.view).rows.length + 1);
      for (const r of rows) expect(r.length, x.label).toBe(BACKLOG_HEADER.length);
    }
  });

  it('renders a PDF, the same bytes for the same document', async () => {
    const x = runs.find(y => y.label === 'RS5 client')!;
    const [a, b] = await Promise.all([renderPdf(x.doc), renderPdf(x.doc)]);
    expect(a.subarray(0, 5).toString()).toBe('%PDF-');
    expect(a.length).toBeGreaterThan(50_000);
    expect(a.equals(b)).toBe(true);
  }, 30_000);
});

describe('FinOps IQ report: M7 CIO challenge fixes (M7-cio-challenge.md)', () => {
  const allText = (doc: ReportDocument) => sectionText(doc, doc.sections.map(s => s.id));
  const practiceGap = (r: FinOpsIqV3Result) => r.findings.some(f => f.type === 'capability_gap' && f.capability === 'FINOPS_PRACTICE_OPERATIONS');

  it('D1: one rule on the accountable owner drives the roadmap activity, the team-cost line and the decision finding', () => {
    const seen = { owner: 0, noOwner: 0 };
    for (const x of runs) {
      const decision = x.r.findings.find(f => f.id === 'F-FIN-DECISION-01');
      const roadmap = sectionText(x.doc, ['roadmap']);
      if (decision) {
        seen.noOwner++;
        expect(sectionText(x.doc, ['summary', 'value']), x.label).not.toMatch(/accountable owner for cloud spend already/);
        const met = x.r.capabilities.some(p => p.capability === 'FINOPS_PRACTICE_OPERATIONS' && p.gap !== null && p.gap < 1 && p.target.level !== null);
        expect(decision.businessConsequence.includes('rest on individual effort until someone is accountable'), x.label).toBe(met);
      } else {
        seen.owner++;
        expect(roadmap, x.label).not.toMatch(/Appoint an accountable FinOps owner/);
        if (practiceGap(x.r) && x.r.value.moneyShown) {
          expect(sectionText(x.doc, ['value']), x.label).toMatch(/no separate FinOps team cost[^.]*the work to bring the practice to its target is in the capability-building effort/);
        }
      }
    }
    expect(seen.owner && seen.noOwner).toBeGreaterThan(0);
  });

  it('D3: a roadmap never schedules a lever the value section advises against or leaves out', () => {
    let filtered = 0;
    for (const x of runs) {
      const spot = x.r.value.levers.find(l => l.id === 'LEV-06');
      const roadmap = sectionText(x.doc, ['roadmap']);
      if (!spot || spot.exclusion) { filtered++; expect(roadmap, x.label).not.toMatch(/to Spot or preemptible capacity/); }
    }
    expect(filtered).toBeGreaterThan(0);
  });

  it('D5: no lever or platform name is repeated back to back in either edition', () => {
    const names = [...new Set(runs.flatMap(x => x.r.value.levers.map(l => l.name)))].concat(['Data platform', 'SaaS and licensing']);
    for (const x of runs) {
      const text = allText(x.doc).replace(/\s+/g, ' ');
      for (const n of names) expect(text.includes(`${n} ${n}`), `${x.label}: "${n} ${n}"`).toBe(false);
    }
  });

  it('D6: no raw platform key reaches either edition or the backlog', () => {
    for (const x of runs) {
      expect(allText(x.doc), x.label).not.toMatch(/\b(data_platform|on_prem|other_public)\b/);
      const backlog = finopsIqBacklog(x.r, x.view);
      const col = BACKLOG_HEADER.indexOf('Platform');
      for (const row of backlog.rows) expect(String(row[col]), x.label).not.toMatch(/^[a-z_]+$/);
    }
  });

  it('D7: no page of the PDF ends on a heading or a table header row', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    for (const x of runs.filter(y => ['RS4 client', 'RS5 client', 'RS9 consultant'].includes(y.label))) {
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await renderPdf(x.doc)), verbosity: 0 }).promise;
      for (let p = 2; p <= pdf.numPages; p++) {
        // Body text only (the running header and footer sit in the top and bottom margins of the A4 page).
        const items = ((await (await pdf.getPage(p)).getTextContent()).items as any[]).filter(i => i.str.trim() && i.transform[5] > 60 && i.transform[5] < 800);
        if (!items.length) continue;
        const bottom = Math.min(...items.map(i => i.transform[5]));
        const size = Math.max(...items.filter(i => Math.abs(i.transform[5] - bottom) < 2).map(i => Math.hypot(i.transform[0], i.transform[1])));
        // Headings are set at 11pt or more and table headers at 8pt (pdf.ts styles); body text is neither.
        expect(size >= 10.9 || Math.abs(size - 8) < 0.05, `${x.label} page ${p} ends on a heading or table header`).toBe(false);
      }
    }
  }, 60_000);
});

describe('FinOps IQ report: client logo on the cover (carried over from FinOps Value Case)', () => {
  it('puts the logo on the cover when one is given, and renders either way', async () => {
    // A 1x1 PNG.
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const x = runs.find(y => y.label === 'RS5 client')!;
    const doc = finopsIqReport(x.r, { ...OPTS, view: 'client', input: x.input, clientLogo: PNG });
    expect(doc.meta.clientLogo).toBe(PNG);
    const withLogo = await renderPdf(doc);
    const without = await renderPdf(x.doc);
    expect(withLogo.subarray(0, 5).toString()).toBe('%PDF-');
    expect(withLogo.includes(Buffer.from('/Subtype /Image'))).toBe(true);
    expect(without.includes(Buffer.from('/Subtype /Image'))).toBe(false);
  }, 30_000);
});

describe('FinOps IQ report: M7 CIO challenge backlog (D8 to D21)', () => {
  const client = runs.filter(x => x.view === 'client');
  const allText = (doc: ReportDocument) => sectionText(doc, doc.sections.map(s => s.id));

  it('D8: technical execution says which findings it leaves out, and why', () => {
    for (const x of runs.filter(y => y.r.technicalPlan?.actions.length)) {
      const listed = new Set(x.r.technicalPlan!.actions.map(a => a.findingId));
      const text = sectionText(x.doc, ['technical']);
      if (x.r.findings.some(f => !listed.has(f.id))) expect(text, x.label).toMatch(/Not listed here, because they are operating-model work|Platform actions still being added to the playbook/);
      // Governance and Reporting have playbook entries since playbook 1.1.0: their findings are listed, never "still being added".
      for (const f of x.r.findings.filter(f => f.type === 'capability_gap' && ['GOVERNANCE_POLICY_RISK', 'REPORTING_ANALYTICS'].includes(f.capability))) {
        expect(listed.has(f.id), `${x.label} ${f.id}`).toBe(true);
        expect(text, x.label).not.toMatch(/Platform actions still being added to the playbook: [^.]*(Governance|Reporting)/);
      }
    }
  });

  it('D9: a lever milestone states an outcome, never the finding title', () => {
    for (const x of runs) expect(sectionText(x.doc, ['roadmap']), x.label).not.toMatch(/Month \d+: [^:]+: indicative value/);
  });

  it('D10: the value section states why full run-rate does not wait for the capability milestones', () => {
    for (const x of runs.filter(y => y.r.value.moneyShown)) expect(sectionText(x.doc, ['value']), x.label).toMatch(/does not wait for the capability to reach its target level/);
  });

  it('D11: technical execution states a shared approach once and collapses platforms with nothing to do', () => {
    for (const x of runs.filter(y => y.r.technicalPlan?.actions.length)) {
      const t = x.doc.sections.find(s => s.id === 'technical')!;
      for (const b of t.blocks.filter(b => b.kind === 'table') as any[]) {
        const cells = b.rows.map((r: Seg[][]) => r[2].map(s => (typeof s === 'string' ? s : s.text)).join(''));
        const sentences = cells.map((c: string) => c.split(/(?<=[.!?])\s+/));
        const everyRow = sentences.length > 1 ? sentences[0].filter((s: string) => s.length > 40 && sentences.every((y: string[]) => y.includes(s))) : [];
        expect(everyRow, x.label + ' ' + cells.join(' || ').slice(0, 600)).toEqual([]);
        expect(b.rows.some((r: Seg[][]) => r[2].some(s => /no platform action|not applicable/i.test(typeof s === 'string' ? s : s.text)) && r[3][0] === '—'), x.label).toBe(false);
      }
    }
  });

  it('D12, D21: the sources name LTM claims as LTM, without an address, in both editions; no vendor-blog source', () => {
    for (const x of runs) {
      const text = sectionText(x.doc, ['sources']);
      expect(text, x.label).not.toMatch(/github\.com|finout/i);
      if (/Available on request/.test(text)) expect(text, x.label).toMatch(/LTM an LTM heuristic or design decision/);
    }
  });

  it('D13: market data caveats are written for the client, not as working notes', () => {
    for (const x of runs) expect(sectionText(x.doc, ['market']), x.label).not.toMatch(/not re-checked|wording not read|show as|Secondary source only/i);
  });

  it('D14, D15: no internal product route or "(transformation (run))" in the client edition; the managed service is not offered for the owner decision', () => {
    for (const x of client) {
      const help = sectionText(x.doc, ['help']);
      expect(help, x.label).not.toMatch(/See Cost IQ|\(transformation \(run\)\)/);
      const managed = x.r.help?.find(h => h.offering.id === 'OFF.FIN.MANAGED');
      expect(managed?.findingIds ?? [], x.label).not.toContain('F-FIN-DECISION-01');
    }
  });

  it('D16: client appendices carry no design references, rule IDs or fact paths', () => {
    for (const x of client) {
      const text = sectionText(x.doc, ['calculation', 'assumptions', 'sources']).replace(/\S*\[[^\]]*\]\S*/g, '');
      expect(text, x.label).not.toMatch(/\((?:Q|D)\d+\)|\bWS-S\d+|execution phase M\d|\bDECISION-\d{2}\b|\bcost\.internalRate\b|\bevidence\.saasLicence\b/);
    }
  });

  it('D17: the need index is a whole number "out of 100"', () => {
    for (const x of runs.filter(y => y.r.needVerdict)) expect(sectionText(x.doc, ['summary']), x.label).toMatch(/Need index\s+\d+\s+out of\s+100\s*:/);
  });

  it('D18: the situation line names the rest of the estate in scope', () => {
    for (const x of runs) {
      const others = x.input.facts.footprint.scopes.filter((s: string) => s !== 'public_cloud');
      if (others.length) expect(sectionText(x.doc, ['summary']), x.label).toMatch(/also in scope/);
    }
  });

  it('D19: the lever arithmetic says the shown figures are rounded', () => {
    for (const x of runs.filter(y => y.r.value.moneyShown)) expect(sectionText(x.doc, ['calculation']), x.label).toMatch(/shown rounded/);
  });

  it('D20: one tool takes the singular; scope-tied offering bullets and Microsoft 365 appear only where they apply', () => {
    for (const x of runs) {
      const text = allText(x.doc);
      expect(text, x.label).not.toMatch(/Recommender gives[^.]*\. This assessment uses their exports/);
      expect(text, x.label).not.toMatch(/Microsoft 365 group-based licensing;/);
      if (!x.input.facts.footprint.scopes.includes('kubernetes')) expect(sectionText(x.doc, ['help']), x.label).not.toMatch(/Kubernetes requests/);
    }
  });
});
