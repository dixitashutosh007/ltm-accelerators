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
import { NOTICES } from './notices';
import type { CostIqSummary } from '../finops-iq/v3/cost-iq-summary';
import type { NonCloudResult } from './non-cloud-levers';
import config from './canon/config/master-v6.6.json' with { type: 'json' };
import delivery from './delivery-library.json' with { type: 'json' };
import finopsRegistry from '../finops-iq/registry/capabilities.json' with { type: 'json' };

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
  /** Non-cloud levers sized from the client's own measured figures, and the total (CQ4); null when none is sized. */
  nonCloud?: NonCloudResult | null;
}

export interface CostIqReportOptions {
  client: string; preparedBy: string; dataProvidedBy: string; view: 'client' | 'consultant'; notes?: string;
  /** CQ8: a narrative that passed the grounding check, shown only when the engagement's AI switch is on (null otherwise). */
  /** The engagement's AI switch: the data notice says so. */
  aiEnabled?: boolean;
  narrative?: { narrative: { summary: string; priorities: string[]; nextSteps: string[] }; modelId: string; generatedAt: string } | null;
}

/** Claim references belong to the register, not to a reader. */
const clean = (t: string) => String(t ?? '').replace(/\s*\[CLM-[A-Z]+-\d+(?:,\s*CLM-[A-Z]+-\d+)*\]/g, '');
/** A catalogue key (DATA_INGESTION, not_assessed) as a reader's label. */
const label = (k: string) => { const t = String(k ?? '').replace(/[_-]+/g, ' ').trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const FINOPS_DOMAIN = new Map<string, string>((finopsRegistry as any).domains.map((d: any) => [d.id, d.name]));
const FINOPS_CAPABILITY = new Map<string, string>((finopsRegistry as any).capabilities.map((k: any) => [k.id, k.displayName]));
const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
/** Findings in the order the report lists them; the position is the number a reader uses to cross-refer. */
const orderedFindings = (fs: Finding[]) => [...fs].sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3));
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

interface Workstream { id: string; name: string; activities: string[]; ownerRole: string; ltmRole: string; durationWeeks: [number, number]; effortFteWeeks: [number, number]; dependsOn: string[]; milestone: string; kpis: string[] }
interface Package {
  recommendationId: string; offeringType: 'advisory' | 'implementation' | 'transformation'; offeringName: string; scope: string; outcome: string; prerequisites: string[];
  workstreams: Workstream[]; risks: Array<{ risk: string; mitigation: string }>; playbook: Array<{ topic: string; platform?: string; steps: string[]; verification: string; options: string[]; sources?: Array<{ title: string; publisher: string; url: string; checked: string }> }>;
  sow: { objectives: string[]; deliverables: string[]; assumptions: string[]; exclusions: string[]; acceptance: string[] };
}
/** The delivery library (draft, owner review): one package per recommendation. Durations and effort are LTM planning ranges. */
const PACKAGES = new Map<string, Package>(((delivery as any).packages as Package[]).map(p => [p.recommendationId, p]));
const TYPE_LABEL: Record<string, string> = { advisory: 'Advisory', implementation: 'Implementation', transformation: 'Transformation' };
const weeks = (r: [number, number]) => (r[0] === r[1] ? `${r[0]} weeks` : `${r[0]} to ${r[1]} weeks`);
/** The elapsed weeks of a package: each workstream starts when those it depends on have ended; prerequisites start at zero. */
function elapsed(p: Package): [number, number] {
  const end = new Map<string, [number, number]>();
  for (const w of p.workstreams) {
    const start = w.dependsOn.reduce<[number, number]>((m, d) => { const e = end.get(d); return e ? [Math.max(m[0], e[0]), Math.max(m[1], e[1])] : m; }, [0, 0]);
    end.set(w.id, [start[0] + w.durationWeeks[0], start[1] + w.durationWeeks[1]]);
  }
  return [...end.values()].reduce<[number, number]>((m, e) => [Math.max(m[0], e[0]), Math.max(m[1], e[1])], [0, 0]);
}

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
  if (i.nonCloud && /^(levers\[|total\.)/.test(field)) return nonCloudFigures(i.nonCloud).get(field);
  const f = /^finops\.(.+)$/.exec(field);
  if (f && i.finops) {
    let o: any = i.finops;
    for (const part of f[1].split('.')) o = o?.[part];
    return typeof o?.value === 'number' ? o.value : undefined;
  }
  return undefined;
}

/** Every figure the non-cloud result carries, by its field name. */
function nonCloudFigures(n: NonCloudResult): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of n.lines) {
    m.set(l.base.field, l.base.value);
    for (const k of CASES) for (const f of Object.values(l.cases[k])) m.set(f.field, f.value);
  }
  if (n.total) for (const k of CASES) { m.set(n.total.cases[k].netRunRate.field, n.total.cases[k].netRunRate.value); m.set(n.total.cases[k].net3Year.field, n.total.cases[k].net3Year.value); }
  return m;
}
const sized = (c: Ctx) => (c.i.nonCloud?.status === 'quantified' ? c.i.nonCloud : null);

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
  blocks.push({ kind: 'paragraph', style: 'small', segs: ([
    `From the FinOps IQ assessment dated `, ref(s.assessmentDate ?? 'not stated'), c.i.finopsLinkedAt ? ', linked to this report on ' : '', c.i.finopsLinkedAt ? ref(c.i.finopsLinkedAt) : '', `, engine `, ref(s.versions.engine), `; confidence ${s.confidence ?? 'not stated'}. `,
    s.cloudSpend?.low && s.cloudSpend.high ? ['In-scope public cloud spend ', figure(s.cloudSpend.low, cur), ' to ', figure(s.cloudSpend.high, cur), '. '] : [],
    ['The range is capped at ', figure(s.globalCap.share, cur, 'share'), ' of that spend. '],
    quoted(clean(s.globalCap.source.citation)), ' (', quoted(clean(s.globalCap.source.sample)), '). ',
    'Net of the cost to implement and phased over the first three years, as FinOps IQ models it. Cost IQ shows this line as FinOps IQ computed it and does not estimate it again.'
  ] as Array<Seg | Seg[]>).flat() });
  if (c.i.currency && c.i.currency !== cur) blocks.push({ kind: 'paragraph', style: 'small', segs: [`This line is in ${cur}, as FinOps IQ produced it; the reporting currency for this assessment is ${c.i.currency}. No conversion has been applied.`] });
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
    { label: 'Questions answered', value: [traced('evidence.assessmentCompleteness', i.result.evidence.assessmentCompleteness, 'percent', [])], note: ['Of the questions asked for the areas chosen; not confidence in a saving'] },
    { label: 'Dimensions scored', value: [count('dimensions.scored', c.scored.length), ' of ', count('dimensions.total', i.result.dimensions.length)], note: ['A dimension with no answer is not scored'] },
    { label: 'Findings', value: [count('findings.count', i.result.findings.length)], note: [count('findings[high]', i.result.findings.filter(f => f.severity === 'high').length), ' high'] }
  ] });
  if (weakest.length) {
    blocks.push({ kind: 'subheading', text: 'Where to look first' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['These are the lowest-scoring areas on the answers given. A low score is a reason to look, not a finding: a finding is raised only where named answers meet LTM\'s rules, so a low-scoring area may have none yet.'] });
    blocks.push({ kind: 'table', head: ['Area', 'Score', 'Questions answered'], widths: ['*', 70, 110], rows: weakest.map(d => [[strong(d.name), '\n', quoted(d.definition)], [traced(`dimensions[${d.id}].score`, d.score as number, 'index', [])], [count(`dimensions[${d.id}].answered`, d.answered)]]) });
  }
  const nc = sized(c);
  if (nc?.total) {
    blocks.push({ kind: 'subheading', text: nc.total.cloudIncluded ? 'Value range: total across the estate' : 'Value range: total excluding cloud' });
    blocks.push({ kind: 'table', head: ['Case', 'Net run rate a year', 'Net, first three years'], widths: ['*', 130, 130], rows: CASES.map(k => [
      [strong(CASE_LABEL[k])], [figure(nc.total!.cases[k].netRunRate, nc.currency)], [figure(nc.total!.cases[k].net3Year, nc.currency)]
    ]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [nc.total.cloudNote, ' Each case is net of the cost to deliver, phased as the lever sections explain. The range is indicative and depends on the client-measured figures set out under "Non-cloud levers and total".'] });
  }
  blocks.push({ kind: 'callout', tone: 'info', title: 'Decision requested', segs: [
    i.result.findings.length
      ? ['The CIO, or the head of technology finance, is asked to name an owner for each finding and to release the evidence listed against it, within ', ref('30 days'), ' of receiving this report. Sizing starts when the evidence arrives; until then no saving is stated. The ', ref('30 days'), ' is a default to adjust to the organisation\'s own planning cycle.'] as Seg[]
      : ['No finding is raised on the answers given. The CIO, or the head of technology finance, is asked to confirm the owner of the lowest-scoring areas above and to complete the unanswered questions within ', ref('30 days'), ' of receiving this report, so that findings can be tested. The ', ref('30 days'), ' is a default to adjust to the organisation\'s own planning cycle.'] as Seg[]
  ].flat() });
  blocks.push({ kind: 'subheading', text: 'Cloud line (from FinOps IQ)' });
  blocks.push(...cloudLine(c));
  blocks.push({ kind: 'callout', tone: 'info', title: 'What this report sizes', segs: [
    nc
      ? 'The amounts in this report are the non-cloud lever or levers sized from figures the client measured, and the cloud line taken from FinOps IQ where one is linked. Nothing is sized from questionnaire answers alone: every other finding lists the evidence needed first. '
      : c.i.finops?.status === 'quantified'
      ? 'The only amount in this report is the cloud line above, taken from FinOps IQ. Cost IQ does not size any non-cloud saving here, so no total across the estate is stated: each finding lists the evidence needed first. '
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
  const ctxNote = 'Questions answered counts every question asked, including context questions that are recorded but not scored; the scores below use the scored answers only, and one question can feed two dimensions.';
  blocks.push({ kind: 'paragraph', style: 'small', segs: [ctxNote] });
  if (footprint.length) blocks.push({ kind: 'paragraph', segs: ['Estate described: ', footprint.map(f => optionLabel('CORE-01', f)).join('; '), '. Questions about an estate the client did not describe are not asked and do not lower any score.'] });
  blocks.push({ kind: 'paragraph', segs: ['Focus areas assessed: ', i.selectedAreas.join('; ') || 'none', '.'] });
  blocks.push({ kind: 'paragraph', style: 'small', segs: ['Every client is also asked the baseline questions on enterprise context, priorities, spend visibility, cost governance and investment, so some dimensions are scored from those alone, whichever focus areas were chosen.'] });
  if (notChosen.length) blocks.push({ kind: 'paragraph', style: 'small', segs: [`Focus areas not chosen, so without their deeper questions: ${notChosen.join('; ')}. Findings and scores in this report reflect the questions asked, and say nothing further about these areas.`] });
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
  blocks.push({ kind: 'paragraph', style: 'small', segs: ['Bar colours: ', ref('80 or more'), ' strong, ', ref('60 to 79'), ' partial, ', ref('40 to 59'), ' weak, below ', ref('40'), ' low. These bands are LTM\'s. The report makes no comparison with other organisations: no published peer data exists for these dimensions.'] });
  const single = i.result.dimensions.filter(d => d.answered === 1 && d.score != null);
  if (single.length) blocks.push({ kind: 'list', small: true, items: single.map(d => {
    const qid = Object.keys(i.answers).find(k => { const q = questionsById.get(k); return q?.scoring?.dimensionIds?.includes(d.id) && has(i.answers, k); });
    return [strong(d.name), ' rests on one question: ', quoted(qid ? questionsById.get(qid).prompt : 'one answered question'), ' Treat the score as a prompt for discussion.'];
  }) });
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
  blocks.push({ kind: 'paragraph', style: 'small', segs: ['A finding is raised when the answers named under "Raised by" match one of LTM\'s activation rules, for example an answer describing no process, or unknown. The rating is LTM\'s view of how much the issue could affect cost or value if it is real; it is not a measured amount. Findings are numbered in the order listed, and the roadmap and backlog use the same numbers.'] });
  orderedFindings(c.findings).forEach((f, k) => {
    const o = opp.get(f.id);
    blocks.push({ kind: 'subheading', text: `Finding ${k + 1}: ${f.title}` });
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
  });
  return { id: 'findings', title: 'Findings', blocks };
}

function cloudSection(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Value from public cloud and the other FinOps IQ levers is worked out once, by FinOps IQ, for each estate. Cost IQ shows that figure as its cloud line and does not estimate it again, to avoid counting the same saving twice. ', sized(c) ? 'Cost IQ\'s non-cloud lever, set out in its own section, covers licences outside SaaS and is added to the total separately.' : 'Cost IQ\'s own findings on software and SaaS licensing are separate and are not sized here.'] }, ...cloudLine(c)];
  if (c.i.finops) {
    blocks.push({ kind: 'subheading', text: 'Cloud practice, side by side' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['FinOps IQ rates cloud cost-management capabilities on its own scale. They are shown next to, and never merged with, the Cost IQ scores.'] });
    const caps = c.i.finops.capabilities, rated = caps.filter(k => k.rating !== 'not_assessed');
    if (rated.length) blocks.push({ kind: 'table', head: ['Capability', 'Domain', 'Rating'], widths: ['*', 140, 80], small: true, rows: rated.map(k => [[FINOPS_CAPABILITY.get(k.capability) ?? label(k.capability)], [FINOPS_DOMAIN.get(k.domain) ?? label(k.domain)], [label(k.rating)]]) });
    if (caps.length > rated.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['FinOps IQ rated the capabilities above. Others in its framework were outside the scope of that assessment and are not rated.'] });
  }
  return { id: 'cloud', title: 'Cloud and FinOps', blocks };
}

function leversSection(c: Ctx): ReportSection | null {
  const nc = sized(c);
  if (!nc) return null;
  const cur = nc.currency;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['A non-cloud lever is sized only from a figure the client measured, never from questionnaire answers. Each case is a share of that figure, net of the cost to deliver, and phased over three years. No published percentage is applied, because no public source gives a range for these levers.'] }];
  for (const l of nc.lines) {
    blocks.push({ kind: 'subheading', text: l.name });
    blocks.push({ kind: 'paragraph', segs: ['Measured base: ', figure(l.base, cur), ' a year, supplied by the client. ', quoted(l.label), ' Raised by the finding "', quoted(c.findings.find(f => f.id === l.findingId)?.title ?? l.findingId), '".'] });
    blocks.push({ kind: 'table', head: ['Case', 'Gross run rate a year', 'Net run rate a year', 'Net, first three years'], widths: ['*', 100, 100, 110], rows: CASES.map(k => [
      [strong(CASE_LABEL[k])], [figure(l.cases[k].runRate, cur)], [figure(l.cases[k].netRunRate, cur)], [figure(l.cases[k].net3Year, cur)]
    ]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['One-off cost to deliver, from the client\'s own cost of an FTE-month: ', figure(l.cases.expected.oneOffCost, cur), '; yearly running cost ', figure(l.cases.expected.ongoingCost, cur), '. Software already counted in the FinOps IQ cloud line (SaaS and marketplace) is outside this base, so the same saving is not counted twice.'] });
  }
  for (const n of nc.notSized) blocks.push({ kind: 'paragraph', style: 'small', segs: [`${n.name}: not sized. ${n.reason}`] });
  if (nc.total) {
    blocks.push({ kind: 'subheading', text: 'Total' });
    blocks.push({ kind: 'table', head: ['Case', 'Net run rate a year', 'Net, first three years'], widths: ['*', 130, 130], rows: CASES.map(k => [
      [strong(CASE_LABEL[k])], [figure(nc.total!.cases[k].netRunRate, cur)], [figure(nc.total!.cases[k].net3Year, cur)]
    ]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [nc.total.cloudNote] });
  }
  return { id: 'levers', title: 'Non-cloud levers and total', blocks };
}

/** Library text for the reader: the client edition carries no finding or recommendation IDs. */
const lib = (c: Ctx, t: string) => (c.client ? t.replace(/\b[FR]-\d{3}\s\((.*?)\)/g, '"$1"').replace(/\s?\b[FR]-\d{3}\b/g, '') : t);
const bullets = (c: Ctx, items: string[]): Seg[] => items.flatMap((t, k) => [k ? '\n' : '', ref('• ' + lib(c, t))] as Seg[]);
const activePackages = (c: Ctx) => c.i.result.recommendations.map(r => ({ r, p: PACKAGES.get(r.id) })).filter((x): x is { r: Recommendation; p: Package } => !!x.p);

function deliveryPlan(c: Ctx): Block[] {
  const blocks: Block[] = [];
  const act = activePackages(c);
  if (!act.length) return blocks;
  blocks.push({ kind: 'subheading', text: 'Delivery plan' });
  blocks.push({ kind: 'paragraph', segs: ['One plan for each recommended step. Durations and effort are LTM planning ranges, not commitments (see the assumptions); sizing and the final plan are agreed once the evidence is in. Owners are roles at the client; names are agreed at mobilisation.'] });
  for (const { r, p } of act) {
    const [lo, hi] = elapsed(p);
    blocks.push({ kind: 'subheading', text: `${p.offeringName}` });
    blocks.push({ kind: 'paragraph', segs: [strong(TYPE_LABEL[p.offeringType]), ', indicative elapsed time ', ref(weeks([lo, hi])), '. ', quoted(lib(c, p.outcome))] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Before work starts, the client supplies:')] });
    blocks.push({ kind: 'list', small: true, items: p.prerequisites.map(t => [ref(lib(c, t))]) });
    blocks.push({ kind: 'table', head: ['Workstream', 'Activities', 'Owner and LTM role', 'Duration', 'After', 'Milestone and measures'], widths: [58, '*', 66, 46, 56, 86], small: true, rows: p.workstreams.map(w => [
      [strong(w.name)], bullets(c, w.activities), [ref(w.ownerRole), '\n', ref(w.ltmRole)], [ref(weeks(w.durationWeeks))], [ref(w.dependsOn.join(', ') || 'Start')], [ref(w.milestone), '\n', ...bullets(c, w.kpis)]
    ]) });
    blocks.push({ kind: 'table', head: ['Risk', 'How it is managed'], widths: ['*', '*'], small: true, rows: p.risks.map(k => [[ref(lib(c, k.risk))], [ref(lib(c, k.mitigation))]]) });
  }
  return blocks;
}

function roadmap(c: Ctx): ReportSection {
  const recs = c.i.result.recommendations;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['The route from a finding to a saving has three steps, and no step is skipped. First, supply the evidence each finding names. Then size the opportunity from that evidence and agree what is feasible with the owners. Finally, plan delivery and track the result against the baseline.'] }];
  if (recs.length) {
    blocks.push({ kind: 'subheading', text: 'Recommended next steps' });
    blocks.push({ kind: 'table', head: ['Step', 'What it covers', 'Findings addressed'], widths: [140, '*', 90], small: true, rows: recs.map(r => [[strong(r.title)], [quoted(r.description)], [ref(orderedFindings(c.findings).map((f, k) => (r.findingIds.includes(f.id) ? `Finding ${k + 1}` : '')).filter(Boolean).join('; ') || 'None raised')]]) });
  } else blocks.push({ kind: 'paragraph', segs: ['No step is recommended on the answers given.'] });
  blocks.push(...deliveryPlan(c));
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

function help(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['LTM offers these services for the findings above. Scope, effort and price are agreed after the evidence is in; none is assumed here.'] }];
  const recs = new Map(c.i.result.recommendations.map(r => [r.id, r]));
  const fs = orderedFindings(c.findings);
  if (fs.length) {
    blocks.push({ kind: 'table', head: ['Finding', 'LTM offering', 'What LTM does', 'What the client has at the end'], widths: [110, 100, '*', '*'], small: true, rows: fs.map((f, k) => {
      const p = f.recommendationIds.map(id => recs.has(id) ? PACKAGES.get(id) : undefined).find(Boolean);
      const lead: Seg[] = [strong(`Finding ${k + 1}`), '\n', quoted(f.title)];
      return p ? [lead, [strong(p.offeringName), '\n', TYPE_LABEL[p.offeringType]], [ref(lib(c, p.scope))], [ref(lib(c, p.outcome))]]
        : [lead, ['Not mapped'], ['No LTM offering is defined for this finding yet. It can still be raised with the consultant.'], ['Not applicable']];
    }) });
  } else blocks.push({ kind: 'paragraph', segs: ['No finding is raised, so no offering is proposed.'] });
  return { id: 'help', title: 'How LTM can help', blocks };
}

function execution(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['The practice steps below are how the work is carried out, each with the check that shows it worked. They are generic practice; where a step depends on a particular provider or tool, the options are listed and the provider\'s own documentation is used at the time.'] }];
  const act = activePackages(c);
  if (!act.length) blocks.push({ kind: 'paragraph', segs: ['No step is recommended on the answers given, so no execution detail applies.'] });
  for (const { p } of act) {
    blocks.push({ kind: 'subheading', text: p.offeringName });
    blocks.push({ kind: 'table', head: ['Practice', 'Steps', 'How to check it worked', 'Options'], widths: [70, '*', 100, 80], small: true, rows: p.playbook.map(b => [[strong(lib(c, b.topic)), ...(b.platform ? ['\n', ref(b.platform)] as Seg[] : [])], [...bullets(c, b.steps), ...(b.sources?.length ? ['\n', ref('Source: ' + b.sources.map(x => `${x.publisher}, ${x.title}`).join('; '))] as Seg[] : [])], [ref(lib(c, b.verification))], [ref(b.options.join('; '))]]) });
  }
  return { id: 'execution', title: 'Technical execution', blocks };
}

function sow(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', title: 'Draft for the consultant', segs: ['An outline to start a statement of work. It is not a quote or an offer: scope, price, timing and terms are agreed with the client, and the client\'s legal and procurement teams review any contract.'] }];
  const act = activePackages(c);
  if (!act.length) blocks.push({ kind: 'paragraph', segs: ['No step is recommended on the answers given, so there is nothing to scope.'] });
  for (const { r, p } of act) {
    blocks.push({ kind: 'subheading', text: `${p.offeringName} (${r.id})` });
    blocks.push({ kind: 'table', head: ['Section', 'Draft content'], widths: [80, '*'], small: true, rows: [
      ['Objectives', bullets(c, p.sow.objectives)], ['Deliverables', bullets(c, p.sow.deliverables)], ['Assumptions', bullets(c, p.sow.assumptions)], ['Exclusions', bullets(c, p.sow.exclusions)], ['Acceptance', bullets(c, p.sow.acceptance)]
    ].map(([k, v]) => [[strong(k as string)], v as Seg[]]) });
  }
  return { id: 'sow', title: 'Draft statement of work', appendix: true, blocks };
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
    { id: 'A-02', what: 'How questions combine into a score', value: 'A dimension is the mean of its scored answers; each counts equally; headlines are the mean of dimension scores, each dimension counting equally whatever the number of questions behind it', basis: 'LTM heuristic: no published weighting for these dimensions exists', confidence: 'Medium', ifWrong: 'Weighting dimensions by the number of questions answered, or giving some dimensions more weight, would change the headline scores, by several points where dimensions rest on very different numbers of questions; findings and the evidence needed would not change' },
    { id: 'A-03', what: 'Answers are accurate', value: 'Answers are self-reported and have not been audited or verified by LTM', basis: 'Client input', confidence: 'Varies by question', ifWrong: 'A score reflects what the respondent believed; evidence supplied later can raise or lower it' },
    { id: 'A-04', what: 'Which questions count', value: `${c.i.scope.shown} questions were asked, from the focus areas chosen and the estate described; questions about an estate not described are not asked`, basis: 'Client input: the focus areas chosen and the estate described', confidence: 'High', ifWrong: 'Areas not chosen would add questions and could add findings; scores for the areas assessed would not change' },
    { id: 'A-05', what: 'When a finding is raised', value: 'A finding is raised when named answers meet LTM\'s activation rules', basis: 'LTM heuristic: thresholds come from LTM calibration and are not published benchmarks', confidence: 'Medium', ifWrong: 'A finding may be raised that evidence later clears, or missed that evidence would raise' },
    { id: 'A-06', what: 'Cloud figure', value: c.i.finops?.status === 'quantified' ? `The cloud line is the FinOps IQ result dated ${c.i.finops.assessmentDate ?? 'not stated'}, as it stood when linked. It covers the levers FinOps IQ quantified for the in-scope spend, capped at a published share of that spend, and is in ${c.i.finops.currency}` : 'No cloud figure is included', basis: 'Another LTM assessment (FinOps IQ), not recomputed here', confidence: c.i.finops?.confidence ?? 'Not applicable', ifWrong: 'Refreshing FinOps IQ and linking it again replaces the line; nothing else in this report moves' }
  ];
  if (activePackages(c).length) list.push({ id: 'A-11', what: 'Delivery durations and effort', value: 'Each workstream has a range of weeks and of FTE-weeks. A workstream starts when those it depends on end, and elapsed time is the longest path', basis: 'LTM planning heuristic: not from a published source or from LTM delivery history', confidence: 'Low', ifWrong: 'Plans lengthen or shorten and effort changes in proportion; no saving figure depends on them' });
  if (sized(c)) list.push(
    { id: 'A-08', what: 'Lever cases', value: 'Conservative is a quarter, expected a half and upper all of the client\'s measured base', basis: 'LTM heuristic, the same rule FinOps IQ applies to licence levers. No published range exists for this lever', confidence: 'Low', ifWrong: 'Every case scales with the share; the base itself does not change' },
    { id: 'A-09', what: 'Phasing and cost to deliver', value: 'Year one earns the share of contracts renewing that year, or a quarter when the client gave none; years two and three earn the whole run rate. Delivery effort is a fixed number of FTE-months for the chosen tier, costed at the client\'s own rate, with a fifth of that cost recurring each year', basis: 'LTM heuristic, copied from the FinOps IQ licence lever pending calibration on delivered work', confidence: 'Low', ifWrong: 'Year-one and three-year figures move; the gross run rate does not' },
    { id: 'A-10', what: 'The measured base', value: 'The unused or over-entitled licence cost is a figure the client supplied from its own reconciliation; LTM has not audited it. It excludes SaaS and marketplace software', basis: 'Client input', confidence: 'Varies', ifWrong: 'Every figure in this section scales with the base; an overstated base overstates the range in proportion' }
  );
  if (c.i.currency && !['USD', 'AED', 'SAR', 'OTHER'].includes(c.i.currency)) {
    const a = bands.assumptions[0];
    list.push({ id: 'A-07', what: 'Currency conversion of size bands', value: a.value, basis: a.basis, confidence: a.confidence.charAt(0).toUpperCase() + a.confidence.slice(1), ifWrong: a.ifWrong });
  }
  return { id: 'assumptions', title: 'Assumptions', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Every assumption behind the scores is listed, with its basis and what changes if it is wrong.'] },
    { kind: 'table', head: ['Assumption', 'Value', 'Basis', 'Confidence', 'If wrong'], widths: [90, '*', '*', 55, '*'], small: true, rows: list.map(a => [[ref(a.id + '  '), strong(a.what)], [quoted(a.value)], [quoted(a.basis)], [a.confidence], [quoted(a.ifWrong)]]) }
  ] };
}

function methodology(c: Ctx): ReportSection {
  return { id: 'methodology', title: 'Methodology', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Cost IQ asks about cost and value management across the whole technology estate, scores the answers on fixed ladders, and raises findings where named answers meet LTM\'s activation rules. Cost IQ itself sizes no saving from self-reported answers; the cloud line comes from FinOps IQ, which sizes from its own inputs. Each finding states the evidence that must be shown first.'] },
    { kind: 'paragraph', segs: ['The ', count('dimensions.total', c.i.result.dimensions.length), ' dimensions are LTM\'s own constructs. Each has a closest published reference, named in the sources; none is a claim of alignment to, or endorsement by, the body that publishes it.'] },
    { kind: 'subheading', text: 'Limits' },
    { kind: 'list', items: [
      ['The assessment rests on answers the respondent gave. LTM has not audited them.'],
      ['A dimension fed by few questions is a weaker signal than one fed by many.'],
      ['Scores describe how well cost and value are managed. They are not a prediction of savings.'],
      ['Some answers are the respondent\'s own estimate, such as confidence in the spend baseline, or are marked unsure. They are scored as given, and the consultant appendix shows them.'],
      ['The report covers the focus areas chosen and the estate described. Anything outside them is not assessed.']
    ] },
    noRegulatoryCoverage('Cost IQ'),
    { kind: 'paragraph', segs: [strong('How your data is handled. '), NOTICES.dataWith(!!c.opts.aiEnabled)] },
    { kind: 'callout', tone: 'info', title: 'Status', segs: [`${NOTICES.disclaimer} Prepared by ${c.opts.preparedBy}; data provided by ${c.opts.dataProvidedBy}.`] }
  ] };
}

/** CQ8: the AI narrative, labelled, only when one passed the grounding check. It never replaces the engine's sections and holds no figure of its own. */
function narrativeSection(c: Ctx): ReportSection | null {
  const n = c.opts.narrative;
  if (!n) return null;
  return { id: 'narrative', title: 'Narrative summary (AI-written)', blocks: [
    { kind: 'callout', tone: 'info', segs: [`Written by an AI model (${n.modelId}) on ${n.generatedAt.slice(0, 10)} from this report's scores, findings and recommendations only, and checked automatically: every number and vendor name in it appears in them, and it states no savings. The sections that follow are the assessment of record.`] },
    ...n.narrative.summary.split(/\n\s*\n/).filter(p => p.trim()).map(p => ({ kind: 'paragraph', segs: [p.trim()] }) as Block),
    { kind: 'subheading', text: 'Priorities' },
    { kind: 'list', items: n.narrative.priorities.map(p => [p]) },
    { kind: 'subheading', text: 'Next steps' },
    { kind: 'list', items: n.narrative.nextSteps.map(p => [p]) }
  ] };
}

/** Vendor documentation the platform playbook steps rest on, for the packages shown in this report. */
function playbookSources(c: Ctx): Seg[][][] {
  const seen = new Map<string, Seg[][]>();
  for (const { p } of activePackages(c)) for (const b of p.playbook) for (const x of b.sources ?? []) if (!seen.has(x.url)) seen.set(x.url, [[ref(`${x.publisher}, ${x.title} (${x.url})`)], ['Platform-specific steps in the technical execution section'], [ref(String(x.checked).slice(0, 4))]]);
  return [...seen.values()];
}

function sources(c: Ctx): ReportSection {
  return { id: 'sources', title: 'Sources', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['The published sources the questions and mappings draw on. Published sources are global or sector references and are not benchmarks of the client\'s peers.'] },
    { kind: 'table', head: ['Source', 'Used for', 'Year'], widths: ['*', '*', 50], small: true, rows: [
      [[ref('FinOps Foundation, FinOps Framework (https://www.finops.org/framework/). Licensed under the Creative Commons Attribution licence (https://creativecommons.org/licenses/by/4.0/)')], ['Practice stages and the closest reference for governance, allocation and value dimensions'], [ref('2026')]],
      [[ref('TBM Council, TBM Taxonomy (https://www.tbmcouncil.org/taxonomy/)')], ['Closest reference for cost pools and towers behind the cost dimensions; reference only, not an endorsement'], [ref('2025')]],
      [[ref('US Government Accountability Office, Information Technology Investment Management (GAO-04-394G, https://www.gao.gov/products/gao-04-394g)')], ['Closest reference for investment selection, control and benefits review'], [ref('2004')]],
      ...(c.i.finops?.status === 'quantified' ? [[[ref(clean(c.i.finops.globalCap.source.citation))], ['Ceiling on the cloud line, applied by FinOps IQ'], [ref(c.i.finops.globalCap.source.year)]] as Seg[][], [[ref(`LTM FinOps IQ assessment dated ${c.i.finops.assessmentDate ?? 'not stated'}`)], ['The cloud line shown in this report'], [ref((c.i.finops.assessmentDate ?? '').slice(0, 4) || 'n/a')]] as Seg[][]] : []),
      ...playbookSources(c),
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
      version: client ? `Cost IQ methodology ${(config as any).manifest.masterVersion}` : `Cost IQ ${(config as any).manifest.masterVersion} · release ${(config as any).manifest.releaseId}`, view: opts.view,
      footer: `${PLATFORM} · ${PRODUCT} · Confidential`,
      status: 'Indicative assessment from self-reported answers. Not a savings commitment.'
    },
    sections: [summary(c), ...(narrativeSection(c) ? [narrativeSection(c)!] : []), profile(c), scores(c), findingsSection(c), cloudSection(c), ...(leversSection(c) ? [leversSection(c)!] : []), roadmap(c), help(c), execution(c), calculation(c), assumptions(c), methodology(c), sources(c), ...(client ? [] : [sow(c), consultant(c)])]
  };
}

/** The backlog CSV: one row per finding, with the evidence it needs and the service that follows. */
export function costIqBacklog(input: CostIqReportInput, view: 'client' | 'consultant'): Backlog {
  const opp = new Map(input.result.opportunities.map(o => [o.findingId, o]));
  const rec = new Map(input.result.recommendations.map(r => [r.id, r]));
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const header = [...(view === 'consultant' ? ['Finding ID'] : []), 'Finding number', 'Finding', 'Dimension', 'Severity', 'Why it matters', 'Evidence needed before sizing', 'Recommended step', 'LTM service', 'Offering type', 'Status'];
  const rows = orderedFindings(input.result.findings).map((f, k) => {
    const r = rec.get(f.recommendationIds[0]);
    return [...(view === 'consultant' ? [f.id] : []), k + 1, f.title, f.dimension, SEVERITY[f.severity] ?? f.severity, f.description, (opp.get(f.id)?.economic.missingEvidence ?? []).join('; '), r?.title ?? '', r?.ltmService ?? '', r && PACKAGES.get(r.id) ? TYPE_LABEL[PACKAGES.get(r.id)!.offeringType] : 'Not mapped', 'Open'];
  });
  return { header, rows };
}
