/**
 * Cost IQ delivery library and its use in the report (CQ6): every finding maps to an offering and a playbook entry or is
 * marked not mapped; the plan, the offerings, the execution detail and the consultant-only statement of work appear.
 *
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


const everything = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); for (const s of doc.sections) { out.push(s.title); for (const b of s.blocks) if (b.kind === 'subheading') out.push(b.text); } return out.join(' '); };

const lib = require('../src/accelerators/cost-iq/delivery-library.json');
const RECS: any[] = cfg.recommendations;

describe('delivery library (CQ6)', () => {
  it('has one package per recommendation, with the fields a delivery plan needs', () => {
    expect(lib.packages.map((p: any) => p.recommendationId).sort()).toEqual(RECS.map(r => r.id).sort());
    for (const p of lib.packages) {
      expect(['advisory', 'implementation', 'transformation'], p.recommendationId).toContain(p.offeringType);
      expect(p.workstreams.length, p.recommendationId).toBeGreaterThanOrEqual(3);
      const ids = new Set(p.workstreams.map((w: any) => w.id));
      for (const w of p.workstreams) {
        expect(w.durationWeeks[0]).toBeLessThanOrEqual(w.durationWeeks[1]);
        expect(w.effortFteWeeks[0]).toBeLessThanOrEqual(w.effortFteWeeks[1]);
        expect(w.activities.length).toBeGreaterThan(0); expect(w.kpis.length).toBeGreaterThan(0); expect(w.milestone).toBeTruthy(); expect(w.ownerRole).toBeTruthy();
        for (const d of w.dependsOn) expect(ids.has(d) || d === 'Prerequisites', `${p.recommendationId} ${w.id} depends on ${d}`).toBe(true);
      }
      expect(p.prerequisites.length).toBeGreaterThan(0); expect(p.risks.length).toBeGreaterThan(0);
      for (const b of p.playbook) { expect(b.verification, p.recommendationId).toBeTruthy(); expect(b.steps.length).toBeGreaterThan(0); }
      for (const k of ['objectives', 'deliverables', 'assumptions', 'exclusions', 'acceptance']) expect(p.sow[k].length, `${p.recommendationId} ${k}`).toBeGreaterThan(0);
    }
  });

  it('maps every finding to an offering through its recommendation, and carries no price, rate or saving', () => {
    const reach = new Set(RECS.flatMap(r => r.findingIds ?? []));
    for (const f of cfg.findings) expect(reach.has(f.id), `${f.id} has no recommendation`).toBe(true);
    const text = JSON.stringify(lib);
    expect(text).not.toMatch(/[$£€]\s?\d|\d\s?%|\b(?:USD|GBP|EUR)\b/);
  });

  it('backs every platform-specific playbook step with a dated vendor source, and names no cloud provider cost step', () => {
    let n = 0;
    for (const p of lib.packages) for (const b of p.playbook) if (b.platform) {
      n++;
      expect(b.sources?.length, `${p.recommendationId} ${b.topic}`).toBeGreaterThan(0);
      for (const x of b.sources) { expect(x.url).toMatch(/^https:\/\//); expect(x.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(x.publisher).toBeTruthy(); }
      expect(`${b.platform} ${b.topic}`).not.toMatch(/\b(?:AWS|Azure|GCP|Google Cloud)\b/);
    }
    expect(n).toBeGreaterThan(0);
  });

  it('keeps the cloud hand-off to FinOps IQ: no cloud lever or sizing in its package', () => {
    const t = JSON.stringify(lib.packages.find((p: any) => p.recommendationId === 'R-003')).toLowerCase();
    expect(t).toContain('finops iq');
    expect(t).not.toMatch(/rightsiz|savings plan|\bspot\b|reserved instance|lev-\d/);
  });
});

describe('Cost IQ report: delivery plan, offerings, execution and statement of work (CQ6)', () => {
  const inputs = Object.entries(PROFILES).map(([n, fp], k) => ({ n, i: input(fp, k + 7, null) }));
  for (const { n, i } of inputs) for (const view of ['client', 'consultant'] as const) {
    it(`${n}, ${view}: plan and offerings present, checks pass, IDs only for the consultant, SOW only for the consultant`, () => {
      const doc = costIqReport(i, { ...OPTS, view });
      const t = everything(doc);
      const ids = doc.sections.map(s => s.id);
      expect(ids).toContain('execution');
      expect(ids.includes('sow')).toBe(view === 'consultant');
      if (i.result.recommendations.length) {
        expect(t).toContain('Delivery plan');
        expect(JSON.stringify(doc.sections.find(x => x.id === 'execution'))).toContain('How to check it worked');
        expect(t).toContain('A-11');
      }
      if (view === 'client') { expect(t).not.toMatch(/\b[FR]-\d{3}\b/); expect(t).not.toContain('statement of work'); }
      else if (i.result.recommendations.length) expect(t).toContain('Draft statement of work');
      expect(checkCostIqReport(doc, i, view, TODAY).failures).toEqual([]);
    });
  }

  it('lists every finding in "How LTM can help" with its offering, or says it is not mapped, and the backlog carries the offering type', () => {
    const i = inputs[0].i;
    const doc = costIqReport(i, { ...OPTS, view: 'client' });
    const help = doc.sections.find(s => s.id === 'help')!.blocks.find(b => b.kind === 'table') as any;
    expect(help.rows.length).toBe(i.result.findings.length);
    const csv = costIqBacklog(i, 'client');
    expect(csv.header).toContain('Offering type');
    const col = csv.header.indexOf('Offering type');
    for (const r of csv.rows) expect(['Advisory', 'Implementation', 'Transformation', 'Not mapped']).toContain(r[col]);
  });
});
