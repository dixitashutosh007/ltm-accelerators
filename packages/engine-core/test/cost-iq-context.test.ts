/**
 * CQ12 slice 2: every question the client is asked is used. Context, priority and hotspot answers reach the result through
 * cio-context.cjs (no score moves) and the report shows them: the client's situation and priorities, their own view of the
 * opportunities against the findings raised, and each hotspot beside the finding it qualifies.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { costIqReport, costIqBacklog, uk, spendShareOfRevenue, type CostIqReportInput, type CostIqResult } from '../src/accelerators/cost-iq/report';
import refs from '../src/accelerators/cost-iq/published-references.json' with { type: 'json' };
import { checkCostIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const require = createRequire(import.meta.url);
const adapter = require('../src/accelerators/cost-iq/evaluate.cjs');
const engine = require('../src/accelerators/cost-iq/canon/costiq-engine-v10.cjs');
const cfg = require('../src/accelerators/cost-iq/canon/config/master-v6.6.json');
const calibration = require('../src/accelerators/cost-iq/canon/config/finding-activation-calibration-v7.1.1.json').findingActivation;
const { cioContext, CONTEXT_QUESTIONS } = require('../src/accelerators/cost-iq/cio-context.cjs');
const MAP = require('../src/accelerators/cost-iq/cio-context.json');

const AREAS: string[] = cfg.settings.selection.defaultAreas;
const FOOTPRINT = ['ON_PREM', 'PUBLIC_CLOUD', 'SAAS', 'SOFTWARE', 'EXTERNAL', 'VMWARE'];
const text = (doc: ReportDocument) => { const out: string[] = []; walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text)); for (const s of doc.sections) { out.push(s.title); for (const b of s.blocks) if (b.kind === 'subheading') out.push(b.text); } return out.join('').replace(/\s+/g, ' '); };

describe('Cost IQ: every question is used', () => {
  it('each question is scored, raises a finding, routes the questions shown, or is read by the context module', () => {
    const probes = (q: any) => ((q.options || []).length ? q.options.map((o: any) => o.id) : [1, 3, 5, 50]);
    const used = new Set<string>([
      ...cfg.questions.filter((q: any) => probes(q).some((v: any) => engine.scoreQuestion(q, v, {}) !== null)).map((q: any) => q.id),
      ...Object.values(calibration).flat().map((t: any) => t.questionId),
      ...CONTEXT_QUESTIONS,
      ...cfg.questions.flatMap((q: any) => [q.applicableWhen?.questionId, q.labelCurrencyQuestion, q.adaptiveTrigger?.questionId].filter(Boolean))
    ]);
    expect(cfg.questions.filter((q: any) => !used.has(q.id)).map((q: any) => q.id)).toEqual([]);
  });

  it('the mapping names only real questions, options, findings and recommendations', () => {
    const qs = new Map(cfg.questions.map((q: any) => [q.id, q]));
    const fs = new Set(cfg.findings.map((f: any) => f.id)), rs = new Set(cfg.recommendations.map((r: any) => r.id));
    for (const id of CONTEXT_QUESTIONS) expect(qs.has(id), id).toBe(true);
    for (const [qid, map] of [['CORE-09', MAP.expectedOpportunityFindings.map], ['ADP-55', MAP.costHypothesisFindings.map]] as const) {
      const opts = (qs.get(qid) as any).options.map((o: any) => o.id);
      expect(Object.keys(map).sort(), qid).toEqual([...opts].sort());
      for (const f of Object.values(map).flat() as string[]) expect(fs.has(f), f).toBe(true);
    }
    const funding = (qs.get('CORE-10') as any).options.map((o: any) => o.id);
    expect(Object.keys(MAP.fundingChangeRecommendation.map).sort()).toEqual([...funding].sort());
    for (const r of Object.values(MAP.fundingChangeRecommendation.map)) if (r) expect(rs.has(r as string), r as string).toBe(true);
    for (const q of MAP.findingContext.questions) {
      if (q.findingId) expect(fs.has(q.findingId), q.questionId).toBe(true);
      const opts = ((qs.get(q.questionId) as any).options || []).map((o: any) => o.id);
      for (const n of q.none) expect(opts, `${q.questionId} none`).toContain(n);
    }
  });
});

describe('Cost IQ: the client’s view against the findings', () => {
  const F = (id: string, severity = 'high') => ({ id, severity, recommendationIds: cfg.findings.find((f: any) => f.id === id).recommendationIds });

  it('marks each expected area confirmed, not confirmed or not assessed, ranks the first three, and names blind spots', () => {
    const x = cioContext({ 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION', 'DATA_AI', 'PRODUCT_DELIVERY', 'AUTOMATION'] }, [F('F-012'), F('F-001'), F('F-009', 'medium')]);
    expect(x.expectations.map((e: any) => [e.area, e.rank, e.status])).toEqual([
      ['ARCHITECTURE_SIMPLIFICATION', 1, 'confirmed'], ['DATA_AI', 2, 'not-confirmed'], ['PRODUCT_DELIVERY', 3, 'not-assessed'], ['AUTOMATION', null, 'not-confirmed']
    ]);
    // F-001 is high and outside every area named; F-009 is medium, so it is not called a blind spot.
    expect(x.blindSpots).toEqual(['F-001']);
    // No view given: no blind spots claimed.
    expect(cioContext({}, [F('F-001')]).blindSpots).toEqual([]);
  });

  it('attaches hotspots to a raised finding, lists them for validation when it is not raised, and drops "none" answers', () => {
    const a = { 'CORE-32': ['COMPUTE', 'STORAGE'], 'CORE-14': ['NONE'], 'ADP-24': ['STORAGE_GROWTH'], 'CORE-39': ['LEGACY'] };
    const raised = cioContext(a, [F('F-009', 'medium')]);
    expect(raised.findingContext['F-009'].map((c: any) => c.questionId)).toEqual(['CORE-32']);
    expect(raised.unconfirmedHotspots.map((c: any) => [c.questionId, c.findingId])).toEqual([['CORE-39', 'F-013'], ['ADP-24', null]]);
    expect(JSON.stringify(raised)).not.toContain('CORE-14');
  });

  it('maps the funding change to its step and says whether the findings raise it', () => {
    expect(cioContext({ 'CORE-10': 'TRANSPARENCY' }, [F('F-001')])).toMatchObject({ fundingRecommendation: 'R-001', fundingRecommendationRaised: true });
    expect(cioContext({ 'CORE-10': 'OUTCOMES' }, [F('F-001')])).toMatchObject({ fundingRecommendation: 'R-009', fundingRecommendationRaised: false });
    expect(cioContext({ 'CORE-10': 'NO_MAJOR_CHANGE' }, [])).toMatchObject({ fundingRecommendation: null, fundingRecommendationRaised: false });
  });

  it('moves no score: headlines and dimensions are the same with or without every context answer', () => {
    const base: Record<string, unknown> = { 'CORE-01': FOOTPRINT, 'CORE-12': 'C', 'CORE-33': 'D', 'CORE-41': cfg.questions.find((q: any) => q.id === 'CORE-41').options[3].id };
    const withContext = { ...base, 'CORE-02': 'MANUFACTURING', 'CORE-07': ['LOWER_RUN_COST'], 'CORE-09': ['AUTOMATION'], 'CORE-32': ['COMPUTE'], 'ADP-21': 40, 'CTX-04': '30_60' };
    const a = adapter.evaluateCostIq({ answers: base, scope: { selectedAreas: AREAS } }), b = adapter.evaluateCostIq({ answers: withContext, scope: { selectedAreas: AREAS } });
    expect(b.headlines).toEqual(a.headlines);
    expect(b.dimensions).toEqual(a.dimensions);
    expect(b.findings.map((f: any) => f.id)).toEqual(a.findings.map((f: any) => f.id));
  });
});

describe('Cost IQ report: priorities and the client’s view', () => {
  const answers: Record<string, unknown> = {
    'CORE-01': FOOTPRINT, 'CORE-16': 'TRUE', 'CTX-01': 'EUR', 'CORE-02': 'BANKING_FINANCIAL_SERVICES', 'CORE-03': '1B_5B', 'CORE-04': '50M_100M',
    'CORE-05': ['INFRA', 'CLOUD', 'SAAS', 'SOFTWARE'], 'CTX-03': ['EU', 'UK', 'INDIA'], 'CTX-05': '6_20', 'CTX-04': '30_60', 'CTX-02': '15_30',
    'CORE-07': ['LOWER_RUN_COST', 'IMPROVE_RESILIENCE', 'SIMPLIFY_ESTATE'], 'CORE-08': 'PRIORITY', 'CORE-09': ['ARCHITECTURE_SIMPLIFICATION', 'DATA_AI', 'PRODUCT_DELIVERY'],
    'CORE-10': 'TRANSPARENCY', 'CORE-12': 'D', 'CORE-15': cfg.questions.find((q: any) => q.id === 'CORE-15').options[3].id, 'CORE-40': 4, 'CORE-33': 'E',
    'CORE-32': ['COMPUTE', 'STORAGE'], 'ADP-21': 40, 'ADP-20': 2, 'ADP-24': ['RETENTION'], 'ADP-55': ['INFRA', 'APPS']
  };
  const scope = { selectedAreas: AREAS };
  const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-08', currency: 'EUR', finops: null, finopsLinkedAt: null };
  const docs = (['client', 'consultant'] as const).map(view => ({ view, doc: costIqReport(i, { client: 'Example Bank', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Bank', view }) }));

  it('shows the situation in the reporting currency, the priorities, the view against the evidence, and passes the report checks', () => {
    for (const { view, doc } of docs) {
      expect(checkCostIqReport(doc, i, view, '2026-11-08').failures, view).toEqual([]);
      const t = text(doc);
      expect(doc.sections[1].title).toBe('Priorities and the client\'s view');
      expect(t).toContain('As described by the client: Banking / Financial Services');
      expect(t).toContain('EUR 890M to 4.5bn');
      expect(t).toContain('It does not include:');
      expect(t).toContain('Outcomes to protect');
      expect(t).toContain('1. Reduce recurring run cost');
      expect(t).toContain('The matching step, Establish an Enterprise Technology Spend Baseline, is in the roadmap.');
      // A star answer reads as stars, not as a percentage.
      expect(t).not.toMatch(/Answer: \d% /);
      expect(t).toContain('left blank');
      expect(t).toContain('Outside what Cost IQ\'s findings assess');
      expect(t).toContain('Where the client sees it');
      expect(t).toContain('No Cost IQ finding covers this area');
      // No internal question, option or finding ID reaches a reader.
      expect(t.match(/\b(CORE|ADP|CTX)-\d+|\bF-0\d\d\b|\bR-0\d\d\b|_[A-Z]{3,}|\bUNKNOWN\b/g) ?? [], view).toEqual(view === 'client' ? [] : expect.any(Array));
    }
  });

  it('lists findings in the areas the client expected first within a rating, in the report and the backlog alike', () => {
    const doc = docs[0].doc;
    const order = doc.sections.find(s => s.id === 'findings')!.blocks.filter(b => b.kind === 'subheading').map((b: any) => b.text.replace(/^Finding \d+: /, ''));
    const backlog = costIqBacklog(i, 'client').rows.map(r => uk(String(r[1])));
    expect(backlog).toEqual(order);
    const f012 = i.result.findings.find(f => f.id === 'F-012');
    if (f012) {
      const sameSeverity = i.result.findings.filter(f => f.severity === f012.severity).map(f => f.title);
      expect(order.filter(t => sameSeverity.map(uk).includes(t))[0]).toBe(uk(f012.title));
    }
  });
});

describe('Cost IQ report: technology spend as a share of revenue (CQ12 slice 5)', () => {

  it('bounds the ratio from the two bands, open bands give one bound, unknown gives none', () => {
    expect(spendShareOfRevenue({ 'CORE-03': '1B_5B', 'CORE-04': '50M_100M' })).toEqual({ low: 1, high: 10 });
    expect(spendShareOfRevenue({ 'CORE-03': 'GT25B', 'CORE-04': '100M_500M' })).toEqual({ low: null, high: 2 });
    expect(spendShareOfRevenue({ 'CORE-03': 'LT100M', 'CORE-04': '5M_25M' })).toEqual({ low: 5, high: null });
    expect(spendShareOfRevenue({ 'CORE-03': 'UNKNOWN', 'CORE-04': '5M_25M' })).toBeNull();
    expect(spendShareOfRevenue({ 'CORE-03': 'GT25B', 'CORE-04': 'LT5M' })).toEqual({ low: null, high: 0.1 });
    // Neither bound: revenue below the first edge and spend below the first edge.
    expect(spendShareOfRevenue({ 'CORE-03': 'LT100M', 'CORE-04': 'LT5M' })).toBeNull();
  });

  const build = (answers: Record<string, unknown>) => {
    const scope = { selectedAreas: AREAS };
    const i: CostIqReportInput = { result: adapter.evaluateCostIq({ answers, scope }) as CostIqResult, answers, selectedAreas: AREAS, scope: adapter.scopeCounts({ answers, scope }), assessmentDate: '2026-11-10', currency: 'USD', finops: null, finopsLinkedAt: null };
    return { i, doc: costIqReport(i, { client: 'Example', preparedBy: 'LTM consultant', dataProvidedBy: 'Example', view: 'client' }) };
  };
  const base = { 'CORE-01': FOOTPRINT, 'CORE-02': 'MANUFACTURING', 'CORE-03': '5B_25B', 'CORE-04': '25M_50M' };

  it('on by owner decision (10 Nov 2026): places the range against the cited average and passes the checks', () => {
    expect(refs.spendToRevenue.enabled).toBe(true);
    const { i, doc } = build(base);
    const t = text(doc);
    expect(t).toContain('From the size bands given, technology spend in scope is between 0.1% and 1% of revenue');
    expect(t).toContain('Deloitte, 2026 Global Technology Leadership Study reports technology investment at about 6% of revenue');
    expect(t).toContain('The client\'s range sits below that average.');
    expect(checkCostIqReport(doc, i, 'client', '2026-11-10').failures).toEqual([]);
  });

  it('switched off, shows the client’s own ratio, names no source, and passes the checks', () => {
    (refs as any).spendToRevenue.enabled = false;
    try {
      const { i, doc } = build(base);
      const t = text(doc);
      expect(t).toContain('No published average is set beside this figure');
      expect(t).not.toMatch(/Deloitte|Flexera, State of Tech/);
      expect(checkCostIqReport(doc, i, 'client', '2026-11-10').failures).toEqual([]);
    } finally { (refs as any).spendToRevenue.enabled = true; }
  });

  it('the lint still refuses Deloitte outside a dated citation', () => {
    const { i, doc } = build(base);
    const s = doc.sections.find(x => x.id === 'your-view') ?? doc.sections[1];
    s.blocks.push({ kind: 'paragraph', segs: ['Advice to Deloitte standard.'] });
    expect(checkCostIqReport(doc, i, 'client', '2026-11-10').failures.map(f => f.check)).toContain('R5');
  });
});
