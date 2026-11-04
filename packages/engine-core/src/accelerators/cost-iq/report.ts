/**
 * The Cost IQ report and backlog (CQ5), in the shared report model and PDF renderer used by FinOps IQ and Sovereign IQ.
 *
 * Built on the server from the result the server stored at completion, never from the browser. Every number is a traced
 * segment: it names the engine field it shows and the check re-reads that field. Text quoted from the question bank or
 * the finding catalogue is shown as quoted (`ref`), since it is LTM-authored wording and not a figure the report claims.
 *
 * One cloud figure per estate: the cloud line is FinOps IQ's summary exactly as it was when linked (boundary rule,
 * docs/cio-readiness/cost-iq/BOUNDARY.md). Cost IQ computes no cloud figure, and in this edition sizes no non-cloud
 * saving, so no total is stated: the report says so and lists the evidence each finding needs before it can be sized.
 */
import type { Backlog, Block, ReportDocument, ReportSection, Seg, Tone } from '../../report/model';
import { figure, traced } from '../../report/model';
import { noRegulatoryCoverage } from '../../report/coverage';
import type { CostIqSummary } from '../finops-iq/v3/cost-iq-summary';
import config from './canon/config/master-v6.6.json' with { type: 'json' };

const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'Cost IQ';
const CASES = ['conservative', 'expected', 'upper'] as const;
const CASE_LABEL: Record<string, string> = { conservative: 'Conservative', expected: 'Expected', upper: 'Upper' };
const SEVERITY: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

interface Dimension { id: string; name: string; definition: string; type: 'cost' | 'value'; weight: number; score: number | null; answered: number }
interface Finding { id: string; dimension: string; title: string; description: string; severity: string; recommendationIds: string[]; activation?: { evidenceSignals?: Array<{ questionId: string; triggerOptions?: string[]; operator?: string; value?: number }> } }
interface Recommendation { id: string; title: string; description: string; ltmService: string; findingIds: string[] }
interface Opportunity { findingId: string; economic: { status: string; missingEvidence?: string[] }; practical: { status: string; missingFactors?: string[] } }
export interface CostIqResult {
  dimensions: Dimension[];
  headlines: { costIQ: number | null; valueIQ: number | null };
  evidence: { assessmentCompleteness: number; confidence: string };
  findings: Finding[];
  recommendations: Recommendation[];
  opportunities: Opportunity[];
}

export interface CostIqReportInput {
  result: CostIqResult;
  answers: Record<string, unknown>;
  /** The focus areas the client chose; the questions shown follow from these and the footprint. */
  selectedAreas: string[];
  /** Questions asked and answered, from the engine's selection (see `scopeCounts`). */
  scope: { shown: number; answered: number };
  assessmentDate: string;
  /** The client's reporting currency (a context fact; the engine scores no money). */
  currency?: string;
  finops: CostIqSummary | null;
  finopsLinkedAt?: string | null;
}

export interface CostIqReportOptions { client: string; preparedBy: string; dataProvidedBy: string; view: 'client' | 'consultant'; notes?: string }

/** Claim references belong to the register, not to a reader. */
const clean = (t: string) => String(t ?? '').replace(/\s*\[CLM-[A-Z]+-\d+(?:,\s*CLM-[A-Z]+-\d+)*\]/g, '');
const questionsById = new Map<string, any>((config as any).questions.map((q: any) => [q.id, q]));
const ref = (t: string): Seg => ({ text: t, ref: true });
/** LTM-authored wording from the bank or catalogue: shown as written, digits allowed. */
const quoted = (t: string): Seg => ({ text: String(t ?? ''), ref: true });
/** The scale printed beside a score: a label, not a figure the report claims. */
const OF100 = ref(' / 100');
const OUT100 = ref(' out of 100');
/** A bold label from the catalogue or this builder (names, titles): wording, not a figure the report claims. */
const strong = (t: string): Seg => ({ text: t, strong: true, ref: true });
const count = (field: string, n: number): Seg => traced(field, n, 'count', []);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const tone = (score: number | null): Tone => (score == null ? 'unknown' : score >= 80 ? 'good' : score >= 60 ? 'partial' : score >= 40 ? 'weak' : 'bad');
const optionLabel = (qid: string, answer: unknown): string => {
  const q = questionsById.get(qid);
  const one = (a: unknown) => q?.options?.find((o: any) => o.id === String(a))?.label ?? String(a);
  return Array.isArray(answer) ? answer.map(one).join('; ') : one(answer);
};
const has = (answers: Record<string, unknown>, id: string) => answers[id] != null && answers[id] !== '' && !(Array.isArray(answers[id]) && (answers[id] as unknown[]).length === 0);

interface Ctx { i: CostIqReportInput; client: boolean; opts: CostIqReportOptions; scored: Dimension[]; findings: Finding[] }

/* ------------------------------ Field resolver ------------------------------ */

/** The value a traced field names, from the engine result, the answers, the scope or the linked FinOps IQ summary. */
export function resolveCostIqField(i: CostIqReportInput, field: string): number | undefined {
  const dim = /^dimensions\[([\w-]+)\]\.(score|answered)$/.exec(field);
  if (dim) { const d = i.result.dimensions.find(x => x.id === dim[1]); return d ? (d[dim[2] as 'score' | 'answered'] ?? undefined) : undefined; }
  if (field === 'headlines.costIQ') return i.result.headlines.costIQ ?? undefined;
  if (field === 'headlines.valueIQ') return i.result.headlines.valueIQ ?? undefined;
  if (field === 'evidence.assessmentCompleteness') return i.result.evidence.assessmentCompleteness;
  if (field === 'findings.count') return i.result.findings.length;
  const sev = /^findings\[(\w+)\]$/.exec(field);
  if (sev) return i.result.findings.filter(f => f.severity === sev[1]).length;
  if (field === 'dimensions.scored') return i.result.dimensions.filter(d => d.score != null).length;
  if (field === 'dimensions.total') return i.result.dimensions.length;
  if (field === 'scope.shown') return i.scope.shown;
  if (field === 'scope.answered') return i.scope.answered;
  if (field === 'scope.areas') return i.selectedAreas.length;
  if (field === 'scope.areasAvailable') return Object.keys((config as any).settings.selection.areas).length;
  const ans = /^answers\[([\w-]+)\]$/.exec(field);
  if (ans) { const v = Number(i.answers[ans[1]]); return Number.isFinite(v) ? v : undefined; }
  const f = /^finops\.(.+)$/.exec(field);
  if (f && i.finops) {
    let o: any = i.finops;
    for (const part of f[1].split('.')) o = o?.[part];
    return typeof o?.value === 'number' ? o.value : undefined;
  }
  return undefined;
}

/* --------------------------------- Sections --------------------------------- */

function cloudLine(c: Ctx): Block[] {
  const s = c.i.finops;
  if (!s || s.status !== 'quantified' || !s.cases) {
    return [{ kind: 'callout', tone: 'warn', title: 'Cloud line: not quantified', segs: [
      'The cloud line is not quantified. ',
      s ? `The linked FinOps IQ assessment does not show money for this estate (${s.label}). ` : 'No FinOps IQ assessment is linked to this report. ',
      'Run FinOps IQ and link it to this assessment to add the cloud, AI and measured SaaS licence line. Until then any total in this report is stated excluding cloud.'
    ] }];
  }
  const cur = s.currency;
  const blocks: Block[] = [{ kind: 'table', head: ['Case', 'Net run rate a year', 'Net, first three years'], widths: ['*', 130, 130], rows: CASES.map(k => [
    [strong(CASE_LABEL[k])], [figure(s.cases![k].netRunRate, cur)], [figure(s.cases![k].net3Year, cur)]
  ]) }];
  blocks.push({ kind: 'paragraph', style: 'small', segs: [
    `From the FinOps IQ assessment dated `, ref(s.assessmentDate ?? 'not stated'), `, engine `, ref(s.versions.engine), `; confidence ${s.confidence ?? 'not stated'}. `,
    quoted(clean(s.globalCap.source.citation)), ' (', quoted(clean(s.globalCap.source.sample)), '). ',
    'Net of the cost to implement and phased over a realistic ramp. Cost IQ shows this line as FinOps IQ computed it and does not estimate it again.'
  ] });
  return blocks;
}

function summary(c: Ctx): ReportSection {
  const { i } = c, h = i.result.headlines;
  const blocks: Block[] = [];
  const weakest = [...c.scored].sort((a, b) => (a.score as number) - (b.score as number)).slice(0, 4);
  blocks.push({ kind: 'paragraph', style: 'lead', segs: [
    h.costIQ != null ? ['On the answers given, technology cost management scores ', traced('headlines.costIQ', h.costIQ, 'index', []), OUT100] as Seg[] : ['Technology cost management could not be scored from the answers given'] as Seg[],
    h.valueIQ != null ? [' and technology value management scores ', traced('headlines.valueIQ', h.valueIQ, 'index', []), OUT100, '. '] as Seg[] : ['; value management could not be scored. '] as Seg[],
    [count('findings.count', i.result.findings.length), ` ${plural(i.result.findings.length, 'finding is', 'findings are')} raised, each listing the evidence needed before any saving is sized. `] as Seg[],
    ['The scores describe how well cost and value are managed; they are not a measure of how much could be saved.'] as Seg[]
  ].flat() });
  blocks.push({ kind: 'kpis', items: [
    { label: 'Cost management', value: h.costIQ != null ? [traced('headlines.costIQ', h.costIQ, 'index', []), OF100] : ['Not scored'], note: ['Spend visibility, governance, infrastructure, software, workforce and vendors'] },
    { label: 'Value management', value: h.valueIQ != null ? [traced('headlines.valueIQ', h.valueIQ, 'index', []), OF100] : ['Not scored'], note: ['Alignment, investment quality, benefits and agility'] },
    { label: 'Evidence completeness', value: [traced('evidence.assessmentCompleteness', i.result.evidence.assessmentCompleteness, 'percent', [])], note: ['Questions answered of those asked; not confidence in a saving'] },
    { label: 'Dimensions scored', value: [count('dimensions.scored', c.scored.length), ' of ', count('dimensions.total', i.result.dimensions.length)], note: ['A dimension with no answer is not scored'] },
    { label: 'Findings', value: [count('findings.count', i.result.findings.length)], note: [count('findings[high]', i.result.findings.filter(f => f.severity === 'high').length), ' high'] }
  ] });
  if (weakest.length) {
    blocks.push({ kind: 'subheading', text: 'Where to look first' });
    blocks.push({ kind: 'table', head: ['Area', 'Score', 'Questions answered'], widths: ['*', 70, 110], rows: weakest.map(d => [[strong(d.name), '\n', quoted(d.definition)], [traced(`dimensions[${d.id}].score`, d.score as number, 'index', [])], [count(`dimensions[${d.id}].answered`, d.answered)]]) });
  }
  blocks.push({ kind: 'subheading', text: 'Cloud, AI and measured SaaS licence line' });
  blocks.push(...cloudLine(c));
  blocks.push({ kind: 'callout', tone: 'info', title: 'What this report sizes', segs: [
    c.i.finops?.status === 'quantified'
      ? 'The only amount in this report is the cloud line above, taken from FinOps IQ. Cost IQ does not size any non-cloud saving in this edition: each finding lists the evidence needed first, so the total is the cloud line excluding anything else. '
      : 'No amount is stated. Cost IQ does not size a saving from self-reported answers: each finding lists the evidence needed first. ',
    'Figures that appear in later work are indicative ranges for planning. They are not a savings commitment and need validating against the organisation\'s own data.'
  ] });
  return { id: 'summary', title: 'Executive summary', blocks };
}

function profile(c: Ctx): ReportSection {
  const { i } = c;
  const sel = (config as any).settings.selection;
  const footprint = has(i.answers, 'CORE-01') ? (i.answers['CORE-01'] as string[]) : [];
  const notChosen = Object.keys(sel.areas).filter(a => !i.selectedAreas.includes(a));
  const blocks: Block[] = [
    { kind: 'paragraph', segs: ['Client: ', strong(c.opts.client), `. Data provided by ${c.opts.dataProvidedBy}. Assessed on `, ref(i.assessmentDate), i.currency ? `; reporting currency ${i.currency}.` : '.'] },
    { kind: 'kpis', items: [
      { label: 'Questions asked', value: [count('scope.shown', i.scope.shown)], note: ['From the focus areas chosen and the estate described'] },
      { label: 'Questions answered', value: [count('scope.answered', i.scope.answered)], note: [traced('evidence.assessmentCompleteness', i.result.evidence.assessmentCompleteness, 'percent', []), ' of those asked'] },
      { label: 'Focus areas assessed', value: [count('scope.areas', i.selectedAreas.length), ' of ', count('scope.areasAvailable', Object.keys(sel.areas).length)], note: ['The rest are outside this report'] }
    ] }
  ];
  if (footprint.length) blocks.push({ kind: 'paragraph', segs: ['Estate described: ', footprint.map(f => optionLabel('CORE-01', f)).join('; '), '. Questions about an estate the client did not describe are not asked and do not lower any score.'] });
  blocks.push({ kind: 'paragraph', segs: ['Focus areas assessed: ', i.selectedAreas.join('; ') || 'none', '.'] });
  if (notChosen.length) blocks.push({ kind: 'paragraph', style: 'small', segs: [`Focus areas not assessed in this edition: ${notChosen.join('; ')}. Nothing in this report describes them.`] });
  return { id: 'profile', title: 'Scope and context', blocks };
}

function scores(c: Ctx): ReportSection {
  const { i } = c;
  const row = (d: Dimension) => ({ label: d.name, value: d.score ?? 0, shown: d.score != null ? [traced(`dimensions[${d.id}].score`, d.score, 'index', []), OF100, '  ·  ', count(`dimensions[${d.id}].answered`, d.answered), plural(d.answered, ' question', ' questions')] as Seg[] : ['Not scored'] as Seg[], tone: tone(d.score) });
  const group = (type: 'cost' | 'value'): Block[] => {
    const ds = i.result.dimensions.filter(d => d.type === type);
    return [{ kind: 'bars', max: 100, items: ds.map(row) }];
  };
  const blocks: Block[] = [
    { kind: 'paragraph', segs: ['Each dimension is the mean of the scored answers that feed it, on a scale where a higher score is stronger practice. A dimension fed by few questions is a weaker signal than one fed by many; the number of questions is shown beside each score.'] },
    { kind: 'subheading', text: 'Cost management' }, ...group('cost'),
    { kind: 'subheading', text: 'Value management' }, ...group('value')
  ];
  const unscored = i.result.dimensions.filter(d => d.score == null);
  if (unscored.length) blocks.push({ kind: 'paragraph', style: 'small', segs: [`Not scored, because no scored question feeding it was asked or answered: ${unscored.map(d => d.name).join('; ')}.`] });
  blocks.push({ kind: 'paragraph', style: 'small', segs: ['The ', count('dimensions.total', i.result.dimensions.length), ' dimensions are LTM\'s own constructs. They are not a published taxonomy; the closest published references are named under Methodology.'] });
  return { id: 'scores', title: 'Scores by dimension', blocks };
}

function findingsSection(c: Ctx): ReportSection {
  const { i } = c;
  const opp = new Map(i.result.opportunities.map(o => [o.findingId, o]));
  const blocks: Block[] = [];
  if (!c.findings.length) {
    blocks.push({ kind: 'paragraph', segs: ['No finding was raised on the answers given. That is not evidence that no saving exists: it reflects only the focus areas assessed and the questions answered.'] });
    return { id: 'findings', title: 'Findings', blocks };
  }
  blocks.push({ kind: 'paragraph', segs: ['Each finding comes from named answers and states what must be shown before it is turned into a saving. A finding is a reason to look, not a measured amount.'] });
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  for (const f of [...c.findings].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))) {
    const o = opp.get(f.id);
    blocks.push({ kind: 'subheading', text: f.title });
    const signals = (f.activation?.evidenceSignals ?? []);
    const rows: Seg[][][] = [
      [['Why it matters'], [quoted(f.description)]],
      [['Rating'], [`${SEVERITY[f.severity] ?? f.severity}  ·  ${f.dimension}`]],
      [['Raised by'], signals.length ? signals.map((s, k) => {
        const q = questionsById.get(s.questionId);
        const a = i.answers[s.questionId];
        return [k ? '\n' : '', quoted(q?.prompt ?? 'a question in the assessment'), ' Answer: ', typeof a === 'number' || (s.operator && Number.isFinite(Number(a))) ? traced(`answers[${s.questionId}]`, Number(a), 'percent', []) : quoted(optionLabel(s.questionId, a))];
      }).flat() : ['The combination of answers given']],
      [['Needed before it is sized'], [o?.economic.missingEvidence?.length ? o.economic.missingEvidence.join('; ') : 'Evidence supplied; feasibility still to be agreed']]
    ];
    if (c.opts.view === 'consultant' && o?.practical.missingFactors?.length) rows.push([['Feasibility to agree'], [o.practical.missingFactors.join('; ')]]);
    blocks.push({ kind: 'table', head: ['Topic', 'Detail'], widths: [120, '*'], rows, small: true });
  }
  return { id: 'findings', title: 'Findings', blocks };
}

function cloudSection(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Cloud, AI and measured SaaS licence value for an estate is worked out once, by FinOps IQ. Cost IQ shows that figure as its cloud line and never re-estimates it, so the same saving cannot be counted twice.'] }, ...cloudLine(c)];
  if (c.i.finops) {
    blocks.push({ kind: 'subheading', text: 'Cloud practice, side by side' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['FinOps IQ rates cloud cost-management capabilities on its own scale. They are shown next to, and never merged with, the Cost IQ scores.'] });
    if (c.i.finops.capabilities.length) blocks.push({ kind: 'table', head: ['Capability', 'Domain', 'Rating'], widths: ['*', 140, 80], small: true, rows: c.i.finops.capabilities.map(k => [[quoted(k.capability)], [quoted(k.domain)], [k.rating]]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [c.i.finops.boundaryStatement] });
  }
  return { id: 'cloud', title: 'Cloud and FinOps', blocks };
}

function roadmap(c: Ctx): ReportSection {
  const recs = c.i.result.recommendations;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['The route from a finding to a saving has three steps, and no step is skipped. First, supply the evidence each finding names. Then size the opportunity from that evidence and agree what is feasible with the owners. Finally, plan delivery and track the result against the baseline.'] }];
  if (recs.length) {
    blocks.push({ kind: 'subheading', text: 'Recommended next steps' });
    blocks.push({ kind: 'table', head: ['Step', 'What it covers', 'Findings addressed'], widths: [140, '*', 90], small: true, rows: recs.map(r => [[strong(r.title)], [quoted(r.description)], [r.findingIds.filter(id => c.findings.some(f => f.id === id)).map(id => c.findings.find(f => f.id === id)!.title).join('; ')]]) });
  } else blocks.push({ kind: 'paragraph', segs: ['No step is recommended on the answers given.'] });
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

function help(c: Ctx): ReportSection {
  const recs = c.i.result.recommendations;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['LTM offers these services for the findings above. Scope, effort and price are agreed after the evidence is in; none is assumed here.'] }];
  if (recs.length) blocks.push({ kind: 'table', head: ['Service', 'What it does'], widths: [180, '*'], small: true, rows: recs.map(r => [[strong(r.ltmService)], [quoted(r.description)]]) });
  return { id: 'help', title: 'How LTM can help', blocks };
}

/* ------------------------------- Appendices ------------------------------- */

function calculation(c: Ctx): ReportSection {
  const rows = c.i.result.dimensions.map(d => [[strong(d.name)], [d.type], [d.score != null ? traced(`dimensions[${d.id}].score`, d.score, 'index', []) : 'Not scored'], [count(`dimensions[${d.id}].answered`, d.answered)]] as Seg[][]);
  return { id: 'calculation', title: 'How we calculated this', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Each scored question maps every answer to a fixed value on a scale where a higher value is stronger practice. A dimension score is the mean of the values of the scored questions answered for it, each counting equally. The cost headline and the value headline are the means of their dimension scores, each dimension counting equally; a dimension with no answer is left out, not counted as zero.'] },
    { kind: 'table', head: ['Dimension', 'Kind', 'Score', 'Questions answered'], widths: ['*', 60, 60, 110], small: true, rows },
    { kind: 'paragraph', style: 'small', segs: ['Answers marked "Unknown" take the lowest value on their question, so not knowing never scores better than knowing. A question left blank is not scored. Context questions and hypotheses are recorded but never scored.'] }
  ] };
}

function assumptions(c: Ctx): ReportSection {
  const bands = (config as any).settings.currencyBands;
  const list: Array<{ id: string; what: string; value: string; basis: string; confidence: string; ifWrong: string }> = [
    { id: 'A-01', what: 'The value given to each answer', value: 'A fixed ladder on each question, from 100 for the strongest practice down to the lowest value for Unknown', basis: 'LTM heuristic. The FinOps Framework describes maturity in stages (Crawl, Walk, Run) and does not give scores, so the steps are LTM\'s convention and not a benchmark', confidence: 'Medium', ifWrong: 'Scores move by the same step in every client; the order of practices on a question does not change' },
    { id: 'A-02', what: 'How questions combine into a score', value: 'A dimension is the mean of its scored answers; each counts equally; headlines are the mean of dimension scores', basis: 'LTM heuristic: no published weighting for these dimensions exists', confidence: 'Medium', ifWrong: 'A different weighting would change headline scores, not the findings or the evidence needed' },
    { id: 'A-03', what: 'Answers are accurate', value: 'Answers are self-reported and have not been audited or verified by LTM', basis: 'Client input', confidence: 'Varies by question', ifWrong: 'A score reflects what the respondent believed; evidence supplied later can raise or lower it' },
    { id: 'A-04', what: 'Which questions count', value: `${c.i.scope.shown} questions were asked, from the focus areas chosen and the estate described; questions about an estate not described are not asked`, basis: 'Client input: the focus areas chosen and the estate described', confidence: 'High', ifWrong: 'Areas not chosen would add questions and could add findings; scores for the areas assessed would not change' },
    { id: 'A-05', what: 'When a finding is raised', value: 'A finding is raised when named answers meet LTM\'s activation rules', basis: 'LTM heuristic: thresholds come from LTM calibration and are not published benchmarks', confidence: 'Medium', ifWrong: 'A finding may be raised that evidence later clears, or missed that evidence would raise' },
    { id: 'A-06', what: 'Cloud figure', value: c.i.finops?.status === 'quantified' ? `The cloud line is the FinOps IQ result dated ${c.i.finops.assessmentDate ?? 'not stated'}, as it stood when linked` : 'No cloud figure is included', basis: 'Another LTM assessment (FinOps IQ), not recomputed here', confidence: c.i.finops?.confidence ?? 'Not applicable', ifWrong: 'Refreshing FinOps IQ and linking it again replaces the line; nothing else in this report moves' }
  ];
  if (c.i.currency && !['USD', 'AED', 'SAR', 'OTHER'].includes(c.i.currency)) {
    const a = bands.assumptions[0];
    list.push({ id: 'A-07', what: 'Reporting currency band conversion for the organisation size and spend questions', value: a.value, basis: a.basis, confidence: a.confidence, ifWrong: a.ifWrong });
  }
  return { id: 'assumptions', title: 'Assumptions', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Every assumption behind the scores is listed, with its basis and what changes if it is wrong.'] },
    { kind: 'table', head: ['Assumption', 'Value', 'Basis', 'Confidence', 'If wrong'], widths: [90, '*', '*', 55, '*'], small: true, rows: list.map(a => [[strong(a.what)], [quoted(a.value)], [quoted(a.basis)], [a.confidence], [quoted(a.ifWrong)]]) }
  ] };
}

function methodology(c: Ctx): ReportSection {
  return { id: 'methodology', title: 'Methodology', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Cost IQ asks about cost and value management across the whole technology estate, scores the answers on fixed ladders, and raises findings where named answers meet LTM\'s activation rules. It sizes no saving from self-reported answers. Each finding states the evidence that must be shown first.'] },
    { kind: 'paragraph', segs: ['The ', count('dimensions.total', c.i.result.dimensions.length), ' dimensions are LTM\'s own constructs. Each has a closest published reference, named in the sources; none is a claim of alignment to, or endorsement by, the body that publishes it.'] },
    { kind: 'subheading', text: 'Limits' },
    { kind: 'list', items: [
      ['The assessment rests on answers the respondent gave. LTM has not audited them.'],
      ['A dimension fed by few questions is a weaker signal than one fed by many.'],
      ['Scores describe how well cost and value are managed. They are not a prediction of savings.'],
      ['The report covers the focus areas chosen and the estate described. Anything outside them is not assessed.']
    ] },
    noRegulatoryCoverage('Cost IQ'),
    { kind: 'callout', tone: 'info', title: 'Status', segs: [`An indicative assessment based on the answers and figures provided, which LTM has not audited or verified. Value figures are an indicative range, not a savings commitment, and need validating against the organisation's own data before any decision. This is not financial, accounting, tax or legal advice. Prepared by ${c.opts.preparedBy}; data provided by ${c.opts.dataProvidedBy}.`] }
  ] };
}

function sources(): ReportSection {
  return { id: 'sources', title: 'Sources', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['The published sources the questions and mappings draw on. Published sources are global or sector references and are not benchmarks of the client\'s peers.'] },
    { kind: 'table', head: ['Source', 'Used for', 'Year'], widths: ['*', '*', 50], small: true, rows: [
      [[ref('FinOps Foundation, FinOps Framework (https://www.finops.org/framework/). Licensed under the Creative Commons Attribution licence (https://creativecommons.org/licenses/by/4.0/)')], ['Practice stages and the closest reference for governance, allocation and value dimensions'], [ref('2026')]],
      [[ref('TBM Council, TBM Taxonomy (https://www.tbmcouncil.org/taxonomy/)')], ['Closest reference for cost pools and towers behind the cost dimensions; reference only, not an endorsement'], [ref('2025')]],
      [[ref('US Government Accountability Office, Information Technology Investment Management (GAO-04-394G, https://www.gao.gov/products/gao-04-394g)')], ['Closest reference for investment selection, control and benefits review'], [ref('2004')]],
      [[ref('European Central Bank, euro foreign exchange reference rates (https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)')], ['Converting size bands into the reporting currency; for information only'], [ref('2026')]]
    ] },
    { kind: 'paragraph', style: 'small', segs: ['Where a score ladder or an activation rule is LTM\'s own, the assumptions list says so. The FinOps Framework is used under its licence; LTM\'s scores and findings are LTM\'s and are not the FinOps Foundation\'s.'] }
  ] };
}

function consultant(c: Ctx): ReportSection {
  const { i } = c;
  const answered = Object.keys(i.answers).filter(k => questionsById.has(k) && has(i.answers, k));
  const rows = answered.map(id => { const q = questionsById.get(id); return [[ref(id)], [quoted(q.prompt)], [quoted(Array.isArray(i.answers[id]) || q.options ? optionLabel(id, i.answers[id]) : String(i.answers[id]))]] as Seg[][]; });
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['For the consultant only. Not part of the client edition.'] }];
  if (c.opts.notes) blocks.push({ kind: 'callout', title: 'Consultant notes', segs: [c.opts.notes] });
  blocks.push({ kind: 'subheading', text: 'Answers as given' });
  blocks.push({ kind: 'table', head: ['Question', 'Asked', 'Answer'], widths: [60, '*', 190], small: true, rows });
  return { id: 'consultant', title: 'Consultant appendix', appendix: true, blocks };
}

/* ----------------------------------- Report ----------------------------------- */

export function costIqReport(input: CostIqReportInput, opts: CostIqReportOptions): ReportDocument {
  const client = opts.view === 'client';
  const c: Ctx = { i: input, client, opts, scored: input.result.dimensions.filter(d => d.score != null), findings: input.result.findings };
  return {
    meta: {
      platform: PLATFORM, product: PRODUCT, title: 'Technology cost and value diagnostic report',
      subtitle: 'How well cost and value are managed across the technology estate, where to look first, and the evidence needed before any saving is sized',
      client: opts.client, preparedBy: opts.preparedBy, dataProvidedBy: opts.dataProvidedBy, date: input.assessmentDate,
      version: `Cost IQ ${(config as any).manifest.masterVersion} · release ${(config as any).manifest.releaseId}`, view: opts.view,
      footer: `${PLATFORM} · ${PRODUCT} · Confidential`,
      status: 'Indicative assessment from self-reported answers. Not a savings commitment.'
    },
    sections: [summary(c), profile(c), scores(c), findingsSection(c), cloudSection(c), roadmap(c), help(c), calculation(c), assumptions(c), methodology(c), sources(), ...(client ? [] : [consultant(c)])]
  };
}

/** The backlog CSV: one row per finding, with the evidence it needs and the service that follows. */
export function costIqBacklog(input: CostIqReportInput, view: 'client' | 'consultant'): Backlog {
  const opp = new Map(input.result.opportunities.map(o => [o.findingId, o]));
  const rec = new Map(input.result.recommendations.map(r => [r.id, r]));
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const header = [...(view === 'consultant' ? ['Finding ID'] : []), 'Priority', 'Finding', 'Dimension', 'Severity', 'Why it matters', 'Evidence needed before sizing', 'Recommended step', 'LTM service', 'Status'];
  const rows = [...input.result.findings].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3)).map((f, k) => {
    const r = rec.get(f.recommendationIds[0]);
    return [...(view === 'consultant' ? [f.id] : []), k + 1, f.title, f.dimension, SEVERITY[f.severity] ?? f.severity, f.description, (opp.get(f.id)?.economic.missingEvidence ?? []).join('; '), r?.title ?? '', r?.ltmService ?? '', 'Open'];
  });
  return { header, rows };
}
