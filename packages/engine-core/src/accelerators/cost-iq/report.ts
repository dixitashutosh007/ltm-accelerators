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
import type { Backlog, Block, ReportDocument, ReportSection, Seg, Tone, TracedSeg } from '../../report/model';
import { figure, traced } from '../../report/model';
import { noRegulatoryCoverage } from '../../report/coverage';
import { NOTICES } from './notices';
import type { CostIqSummary } from '../finops-iq/v3/cost-iq-summary';
import type { NonCloudResult } from './non-cloud-levers';
import config from './canon/config/master-v6.6.json' with { type: 'json' };
import delivery from './delivery-library.json' with { type: 'json' };
import finopsRegistry from '../finops-iq/registry/capabilities.json' with { type: 'json' };
import references from './published-references.json' with { type: 'json' };
import { evaluateIndicative, indicativeFigures, INDICATIVE_LIBRARY, type IndicativeResult } from './indicative';
import { plausibilityChecks, spendShareOfRevenue } from './plausibility';

const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'Cost IQ';
const CASES = ['conservative', 'expected', 'upper'] as const;
const CASE_LABEL: Record<string, string> = { conservative: 'Conservative', expected: 'Expected', upper: 'Upper' };
const SEVERITY: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

interface Dimension { id: string; name: string; definition: string; type: 'cost' | 'value'; weight: number; score: number | null; answered: number; unanswered?: number }
/** CQ12 slice 2: what the client said about context, priorities and hotspots (cio-context.cjs). Moves no score. */
interface CioItem { questionId: string; kind: string; label: string; answer: unknown; findingId?: string | null }
interface CioCompare { area: string; rank: number | null; findingIds: string[]; raised: string[]; status: 'confirmed' | 'not-confirmed' | 'not-assessed' }
export interface CioContext {
  profile: Record<string, unknown>; protect: string[]; pressure: string | null; fundingChange: string | null; fundingRecommendation: string | null; fundingRecommendationRaised: boolean;
  redirect: string[]; barriers: string[]; protectCapabilities: string[]; expectations: CioCompare[]; costHypotheses: CioCompare[]; blindSpots: string[];
  findingContext: Record<string, CioItem[]>; unconfirmedHotspots: CioItem[];
}
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
  cio?: CioContext;
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
/**
 * The findings with those in the areas the client expected first, by the client's rank (CQ12 slice 2). `orderedFindings` sorts
 * by severity and the sort is stable, so within one severity this order holds; report and backlog both start from it.
 */
function byClientPriority(r: CostIqResult): Finding[] {
  const rank = new Map<string, number>();
  for (const e of [...(r.cio?.expectations ?? []), ...(r.cio?.costHypotheses ?? [])]) for (const f of e.findingIds) rank.set(f, Math.min(rank.get(f) ?? 9, e.rank ?? 4));
  return [...r.findings].sort((a, b) => (rank.get(a.id) ?? 9) - (rank.get(b.id) ?? 9));
}
/** Recommended steps in one order everywhere: by the highest-severity finding each addresses (the order findings are numbered in). */
const orderedRecs = (c: { findings: Finding[]; i: CostIqReportInput }): Recommendation[] => {
  const rank = new Map(orderedFindings(c.findings).map((f, k) => [f.id, k]));
  const first = (r: Recommendation) => Math.min(...r.findingIds.map(id => rank.get(id) ?? 99), 99);
  return [...c.i.result.recommendations].sort((a, b) => first(a) - first(b));
};
const questionsById = new Map<string, any>((config as any).questions.map((q: any) => [q.id, q]));
const ref = (t: string): Seg => ({ text: uk(t), ref: true });
/** LTM-authored wording from the bank or catalogue: shown as written, digits allowed. */
/**
 * British spelling for LTM-authored catalogue text (CQ10 challenge L2): the catalogues mix US and UK forms. Text with a web
 * address, and the names of AWS's Cost Optimization Hub and pillar, are left as written.
 */
const IZE = /\b\w*(?:optimi|reali|rationali|utili|organi|prioriti|standardi|centrali|categori|minimi|maximi|customi|normali|visuali|moneti|capitali|amorti|formali|harmoni|synchroni|operationali|institutionali|analy|summari)z\w*\b/gi;
export function uk(t: string): string {
  const s = String(t ?? '');
  if (/https?:/.test(s)) return s;
  const keep: string[] = [];
  const guarded = s.replace(/\b(?:Cost )?Optimization (?:Hub|pillar)\b/g, m => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  const out = guarded
    .replace(IZE, w => w.replace(/z/i, z => (z === 'Z' ? 'S' : 's')))
    .replace(/\blicen[sc]e(s?)\b/g, (m, pl, off, whole) => (/\bto $/i.test(whole.slice(Math.max(0, off - 3), off)) ? m : `licence${pl}`))
    .replace(/\bLicen[sc]e(s?)\b/g, 'Licence$1')
    .replace(/\bcenter(s?)\b/g, 'centre$1').replace(/\bCenter(s?)\b/g, 'Centre$1')
    .replace(/\bbehavior(s?)\b/g, 'behaviour$1').replace(/\bcatalog(s?)\b/g, 'catalogue$1');
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => keep[Number(i)]);
}
const quoted = (t: string): Seg => ({ text: uk(String(t ?? '')), ref: true });
/** The scale printed beside a score: a label, not a figure the report claims. */
const OF100 = ref(' / 100');
const OUT100 = ref(' out of 100');
/** A bold label from the catalogue or this builder (names, titles): wording, not a figure the report claims. */
const strong = (t: string): Seg => ({ text: uk(t), strong: true, ref: true });
const count = (field: string, n: number): Seg => traced(field, n, 'count', []);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const tone = (score: number | null): Tone => (score == null ? 'unknown' : score >= 80 ? 'good' : score >= 60 ? 'partial' : score >= 40 ? 'weak' : 'bad');
const optionLabel = (qid: string, answer: unknown): string => {
  const q = questionsById.get(qid);
  const one = (a: unknown) => q?.options?.find((o: any) => o.id === String(a))?.label ?? (a === 'UNKNOWN' ? 'We do not know.' : String(a));
  return Array.isArray(answer) ? answer.map(one).join('; ') : one(answer);
};
const has = (answers: Record<string, unknown>, id: string) => answers[id] != null && answers[id] !== '' && !(Array.isArray(answers[id]) && (answers[id] as unknown[]).length === 0);
const REF = (references as any).spendToRevenue;
/** Technology spend in scope as a share of revenue (CQ12 slice 5): computed in plausibility.ts, exported here as before. */
export { spendShareOfRevenue };
/** An answer in words: option labels (size bands in the reporting currency), a slider as a percentage, stars out of 5. */
function answerSegs(i: CostIqReportInput, qid: string, a: unknown): Seg[] {
  const q = questionsById.get(qid);
  if (typeof a === 'number') return q?.interaction === 'stars' ? [traced(`answers[${qid}]`, a, 'count', []), ref(' of 5')] : [traced(`answers[${qid}]`, a, 'percent', [])];
  const cur = String(i.currency ?? i.answers['CTX-01'] ?? '');
  const bands: Record<string, string> | undefined = q?.labelsByCurrency?.[cur];
  const one = (v: unknown) => bands?.[String(v)] ?? optionLabel(qid, v);
  return [quoted(Array.isArray(a) ? a.map(one).join('; ') : one(a))];
}

interface Workstream { id: string; name: string; activities: string[]; ownerRole: string; ltmRole: string; durationWeeks: [number, number]; effortFteWeeks: [number, number]; dependsOn: string[]; milestone: string; kpis: string[] }
interface Package {
  recommendationId: string; offeringType: 'advisory' | 'implementation' | 'transformation'; offeringName: string; scope: string; outcome: string; prerequisites: string[];
  workstreams: Workstream[]; risks: Array<{ risk: string; mitigation: string }>; playbook: Array<{ topic: string; platform?: string; steps: string[]; verification: string; options: string[]; sources?: Array<{ title: string; publisher: string; url: string; checked: string }> }>;
  sow: { objectives: string[]; deliverables: string[]; assumptions: string[]; exclusions: string[]; acceptance: string[] };
}
/** The delivery library (draft, owner review): one package per recommendation. Durations and effort are LTM planning ranges. */
const PACKAGES = new Map<string, Package>(((delivery as any).packages as Package[]).map(p => [p.recommendationId, p]));
const TYPE_LABEL: Record<string, string> = { advisory: 'Advisory', implementation: 'Implementation', transformation: 'Transformation' };
const weeks = (r: [number, number]) => (r[0] === r[1] ? `${r[0]} ${r[0] === 1 ? 'week' : 'weeks'}` : `${r[0]} to ${r[1]} weeks`);
const andList = (xs: Array<string | number>) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : String(xs[0] ?? ''));
/** The elapsed weeks of a package: each workstream starts when those it depends on have ended; prerequisites start at zero. */
function elapsed(p: Package): [number, number] {
  const end = new Map<string, [number, number]>();
  for (const w of p.workstreams) {
    const start = w.dependsOn.reduce<[number, number]>((m, d) => { const e = end.get(d); return e ? [Math.max(m[0], e[0]), Math.max(m[1], e[1])] : m; }, [0, 0]);
    end.set(w.id, [start[0] + w.durationWeeks[0], start[1] + w.durationWeeks[1]]);
  }
  return [...end.values()].reduce<[number, number]>((m, e) => [Math.max(m[0], e[0]), Math.max(m[1], e[1])], [0, 0]);
}

interface Ctx { i: CostIqReportInput; client: boolean; opts: CostIqReportOptions; scored: Dimension[]; findings: Finding[]; ind: IndicativeResult }

/** The indicative ranges for this input (A1): measured levers replace the range for their finding. */
export function indicativeFor(i: CostIqReportInput): IndicativeResult {
  const measured = i.nonCloud?.status === 'quantified' ? i.nonCloud.lines.map(l => l.findingId) : [];
  return evaluateIndicative(i.answers, i.result.findings.map(f => f.id), i.currency, measured);
}

/* ------------------------------ Field resolver ------------------------------ */

/** The value a traced field names, from the engine result, the answers, the scope or the linked FinOps IQ summary. */
export function resolveCostIqField(i: CostIqReportInput, field: string): number | undefined {
  const dim = /^dimensions\[([\w-]+)\]\.(score|answered|unanswered)$/.exec(field);
  if (dim) { const d = i.result.dimensions.find(x => x.id === dim[1]); return d ? (d[dim[2] as 'score' | 'answered' | 'unanswered'] ?? undefined) : undefined; }
  if (field === 'benchmark.average') return REF.averagePercent;
  if (field === 'benchmark.low' || field === 'benchmark.high') { const b = spendShareOfRevenue(i.answers); return b ? (b[field === 'benchmark.low' ? 'low' : 'high'] ?? undefined) : undefined; }
  if (field.startsWith('cio.')) {
    const x = i.result.cio; if (!x) return undefined;
    const named = [...x.expectations, ...x.costHypotheses];
    return field === 'cio.named' ? named.length : field === 'cio.confirmed' ? named.filter(e => e.status === 'confirmed').length : field === 'cio.blindSpots' ? x.blindSpots.length : undefined;
  }
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
  if (field.startsWith('indicative.')) return indicativeFigures(indicativeFor(i)).get(field);
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
  if (n.total) for (const k of CASES) for (const f of Object.values(n.total.cases[k])) m.set(f.field, f.value);
  return m;
}
const sized = (c: Ctx) => (c.i.nonCloud?.status === 'quantified' ? c.i.nonCloud : null);

/* ----------------------------- Indicative value ----------------------------- */

const IND_ASM = ['A-12', 'A-13', 'A-14'];
const share = (field: string, v: number): Seg => traced(field, v, 'share', [], IND_ASM);
/** A money range in words: "GBP 120k to GBP 380k", "up to …" from a band that starts at zero, "at least …" from an open band. */
function moneyRange(c: Ctx, base: string, low: number | null, high: number | null): Seg[] {
  const m = (f: string, v: number) => traced(f, v, 'currency', [], IND_ASM, c.ind.currency);
  if (low == null && high == null) return [];
  if (high == null) return ['at least ', m(`${base}.low`, low!)];
  if (!low) return ['up to ', m(`${base}.high`, high)];
  return [m(`${base}.low`, low), ' to ', m(`${base}.high`, high)];
}
const shareRange = (base: string, lo: number, hi: number): Seg[] => [share(`${base}.shareLow`, lo), ' to ', share(`${base}.shareHigh`, hi)];
const hasMoney = (c: Ctx) => !!c.ind.total && (c.ind.total.low != null || c.ind.total.high != null);
/** The number a reader uses for a finding (its position in the report). */
const findingNo = (c: Ctx, id: string) => orderedFindings(c.findings).findIndex(f => f.id === id) + 1;
/** Sentence case for a catalogue title, keeping an acronym's capitals ("SaaS usage", not "saaS usage"). */
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const lowerFirst = (t: string) => (/^[A-Z][A-Z]/.test(t) || /^[A-Z][a-z]+[A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
const IND_REASON: Record<string, string> = { ...(INDICATIVE_LIBRARY.notSizedReason as Record<string, string>), measured: 'Sized from the client\'s own measured figures instead (see "Non-cloud levers and total").' };

/** The lead of the summary when at least one finding has an indicative range (A2): the value, the share and the largest moves. */
function valueLead(c: Ctx): Block[] {
  const t = c.ind.total;
  if (!t) return [];
  const counted = c.ind.lines.filter(l => l.counted).sort((a, b) => b.shareHigh - a.shareHigh).slice(0, 3);
  const segs: Seg[] = hasMoney(c)
    ? ['Indicative value: ', ...moneyRange(c, 'indicative.total', t.low, t.high), ' a year, ', ...shareRange('indicative.total', t.shareLow, t.shareHigh), ' of the technology spend in scope. ']
    : ['Indicative value: ', ...shareRange('indicative.total', t.shareLow, t.shareHigh), ' of the technology spend in scope a year; no spend band was given, so no amount is shown. '];
  segs.push(counted.length > 1 ? 'Most of it sits in three moves: ' : 'It sits in one move: ', ...counted.flatMap((l, k) => [k ? '; ' : '', quoted(l.lever.charAt(0).toLowerCase() + l.lever.slice(1)), ' (', ref(`Finding ${findingNo(c, l.findingId)}`), ')']), '.');
  return [
    { kind: 'paragraph', style: 'lead', segs },
    { kind: 'paragraph', style: 'small', segs: ['An LTM planning estimate, not a published benchmark and not a savings commitment: the annual run rate once delivered, before the cost to deliver it. ', ref('Section 2'), ' shows each range and how it is worked out; a measured figure replaces a range when the client supplies the evidence. ', scopeNote(c), ...(plausibilityChecks(c.i.answers).some(k => k.id === 'P-01' || k.id === 'P-02') ? [' The spend band is unusual against revenue and is listed to confirm under "Scope and context"; every range scales with it.'] : [])] }
  ];
}

/**
 * What the indicative value leaves out (A3): cloud and SaaS (FinOps IQ) and any lever measured from the client's figures.
 * Where those carry amounts they are shown separately and not added, because one is a planning estimate and the other is not.
 */
function scopeNote(c: Ctx): string {
  const cloud = c.i.finops?.status === 'quantified', nc = !!sized(c)?.total;
  if (!cloud && !nc) return 'It excludes cloud and SaaS, which FinOps IQ sizes.';
  const parts = [cloud ? 'the cloud line from FinOps IQ' : 'cloud and SaaS, which FinOps IQ sizes', ...(nc ? ['the levers sized from the client\'s measured figures'] : [])];
  const shown = [...(nc ? ['the value range from measured figures'] : []), ...(cloud ? ['the cloud line'] : [])];
  return `It excludes ${parts.join(' and ')}. ${shown.join(' and ').replace(/^t/, 'T')} ${shown.length > 1 ? 'are' : 'is'} shown separately below and not added to it, because ${shown.length > 1 ? 'they rest' : 'it rests'} on measured or modelled figures and the indicative value on planning rates.`;
}

/**
 * B1 charts, drawn only from the traced figures in the table above: where the value sits (one range per counted category and
 * the total) and value against time to deliver (each sized finding by the upper end of its range and of its first step).
 */
function valueCharts(c: Ctx): Block[] {
  const r = c.ind, t = r.total;
  if (!t) return [];
  const money = hasMoney(c);
  const counted = r.lines.filter(l => l.counted).sort((a, b) => b.shareHigh - a.shareHigh);
  const cur = (f: string, v: number) => traced(f, v, 'currency', [], IND_ASM, c.ind.currency);
  const end = (base: string, low: number | null, high: number | null, sl: number, sh: number) => money
    ? { low: cur(`${base}.low`, low ?? 0) as TracedSeg, high: high == null ? null : cur(`${base}.high`, high) as TracedSeg, shown: moneyRange(c, base, low, high) }
    : { low: share(`${base}.shareLow`, sl) as TracedSeg, high: share(`${base}.shareHigh`, sh) as TracedSeg, shown: shareRange(base, sl, sh) };
  const label = (cat: string) => upperFirst((INDICATIVE_LIBRARY.categoryLabels as Record<string, string>)[cat]);
  const blocks: Block[] = [];
  if (counted.length > 1) {
    blocks.push({ kind: 'subheading', text: 'Where the value sits' });
    blocks.push({ kind: 'ranges', items: [
      ...counted.map(l => ({ label: `${label(l.category)} (Finding ${findingNo(c, l.findingId)})`, ...end(`indicative.findings[${l.findingId}]`, l.low, l.high, l.shareLow, l.shareHigh) })),
      { label: 'Total, each category counted once', total: true, ...end('indicative.total', t.low, t.high, t.shareLow, t.shareHigh) }
    ] });
  }
  // Time to deliver: the upper end of LTM's planning range for the first recommended step that addresses the finding.
  const recs = orderedRecs(c);
  const pts = r.lines.flatMap(l => {
    const rec = recs.find(x => x.findingIds.includes(l.findingId));
    const p = rec ? pkg(c, rec.id) : undefined;
    return p ? [{ l, weeks: elapsed(p)[1], p }] : [];
  });
  if (pts.length > 1) {
    const xmax = Math.ceil((Math.max(...pts.map(x => x.weeks)) * 1.1) / 4) * 4;
    blocks.push({ kind: 'subheading', text: 'Value against time to deliver' });
    blocks.push({ kind: 'matrix',
      x: { label: 'Across: time to deliver the first step, upper end of LTM\'s planning range', max: xmax, low: 'Sooner', high: 'Later' },
      y: { label: 'Up: indicative value, upper end, as a share of spend in scope', low: 'Less', high: 'More' },
      quadrant: 'More value, sooner',
      points: pts.map(x => ({ label: String(findingNo(c, x.l.findingId)), x: x.weeks, y: share(`indicative.findings[${x.l.findingId}].shareHigh`, x.l.shareHigh) as TracedSeg })),
      key: pts.sort((a, b) => findingNo(c, a.l.findingId) - findingNo(c, b.l.findingId)).map(x => [strong(`${findingNo(c, x.l.findingId)}  `), quoted(lowerFirst(x.l.lever).replace(/^./, m => m.toUpperCase())), ': up to ', share(`indicative.findings[${x.l.findingId}].shareHigh`, x.l.shareHigh), ', ', ref(weeks([elapsed(x.p)[0], x.weeks]))])
    });
  }
  return blocks;
}

function valueSection(c: Ctx): ReportSection | null {
  const r = c.ind;
  if (!r.lines.length && !r.notSized.some(n => n.reason !== 'enabler')) return null;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Each cost finding is given an indicative range: the share of the technology spend in scope that sits in its category, times an LTM planning rate for what that kind of work typically removes, applied to both ends of the spend band chosen. The ranges are LTM planning estimates for prioritising the work. They are not published benchmarks and not a savings commitment, and each is replaced by a measured figure once the evidence the finding lists is in.'] }];
  if (r.lines.length) {
    const rows: Seg[][][] = orderedFindings(c.findings).flatMap(f => {
      const l = r.lines.find(x => x.findingId === f.id);
      if (!l) return [];
      const top = r.lines.find(x => x.category === l.category && x.counted)!;
      return [[[strong(`Finding ${findingNo(c, f.id)}`), '\n', quoted(f.title)], [quoted(l.lever)], shareRange(`indicative.findings[${f.id}]`, l.shareLow, l.shareHigh),
        [...(hasMoney(c) ? moneyRange(c, `indicative.findings[${f.id}]`, l.low, l.high) : ['No spend band given']), ...(l.counted ? [] : ['\n', ref(`Overlaps Finding ${findingNo(c, top.findingId)}; counted once, at the larger range.`)])]]];
    });
    if (r.total) rows.push([[strong('Total, each category counted once')], [''], shareRange('indicative.total', r.total.shareLow, r.total.shareHigh), hasMoney(c) ? moneyRange(c, 'indicative.total', r.total.low, r.total.high) : ['No spend band given']]);
    blocks.push({ kind: 'table', head: ['Finding', 'Lever', 'Share of spend in scope', 'Indicative range a year'], widths: ['*', 130, 80, 110], small: true, rows });
  }
  blocks.push(...valueCharts(c));
  const notes: Seg[] = [];
  if (r.spend && r.lines.length) notes.push('Spend band used: ', ...(r.spend.high == null ? ['above ', traced('indicative.spend.low', r.spend.low, 'currency', [], IND_ASM, r.currency)] : r.spend.low ? [traced('indicative.spend.low', r.spend.low, 'currency', [], IND_ASM, r.currency), ' to ', traced('indicative.spend.high', r.spend.high, 'currency', [], IND_ASM, r.currency)] : ['below ', traced('indicative.spend.high', r.spend.high, 'currency', [], IND_ASM, r.currency)]), ', as shown to the client when the band was chosen. ');
  if (r.spend && r.lines.length && c.i.currency && c.i.currency !== r.currency) notes.push(`The bands were shown in ${r.currency} for this reporting currency, so the ranges are in ${r.currency}. `);
  if (r.spend && r.lines.length && (r.spend.high == null || !r.spend.low)) notes.push('The band is open at one end, so the range is open at that end too. ');
  if (r.lines.length) {
    notes.push(r.categoriesAssumed ? 'The client did not say which categories the spend figure includes, so every category is assumed to be in it; the shares are less certain. ' : 'Shares are rescaled to the categories the client said the spend figure includes. ');
    notes.push('A narrower band, or the exact spend, narrows every range in proportion.');
    blocks.push({ kind: 'paragraph', style: 'small', segs: notes });
  }
  const out = r.notSized.filter(n => n.reason !== 'enabler');
  if (out.length) {
    blocks.push({ kind: 'subheading', text: 'Findings without an indicative range' });
    blocks.push({ kind: 'list', small: true, items: out.map(n => [ref(`Finding ${findingNo(c, n.findingId)}`), ': ', IND_REASON[n.reason]]) });
  }
  const en = r.notSized.filter(n => n.reason === 'enabler');
  if (en.length) {
    const nos = en.map(n => findingNo(c, n.findingId)).sort((a, b) => a - b);
    const list = `${nos.length === 1 ? 'Finding' : 'Findings'} ${andList(nos)}`;
    blocks.push({ kind: 'paragraph', style: 'small', segs: [ref(list), nos.length === 1 ? ' concerns governance or the value of spend: it makes the other savings measurable and lasting, or raises the value of what is spent, and is not sized as a saving on its own.' : ' concern governance or the value of spend: they make the other savings measurable and lasting, or raise the value of what is spent, and are not sized as savings on their own.'] });
  }
  return { id: 'value', title: 'Indicative value', blocks };
}

/* --------------------------------- Sections --------------------------------- */

/** The total, case by case: the run rate, each of the three years and the three-year sum. */
function totalTable(t: NonNullable<NonCloudResult['total']>, cur: string): Block {
  return { kind: 'table', small: true, head: ['Case', 'Net run rate a year', 'Year 1', 'Year 2', 'Year 3', 'First three years'], widths: ['*', 74, 66, 66, 66, 74], rows: CASES.map(k => [
    [strong(CASE_LABEL[k])], [figure(t.cases[k].netRunRate, cur)], [figure(t.cases[k].netYear1, cur)], [figure(t.cases[k].netYear2, cur)], [figure(t.cases[k].netYear3, cur)], [figure(t.cases[k].net3Year, cur)]
  ]) };
}

/** What the reader needs next to any money range: the lever's confidence, and the cloud line's where one is included (CQ10 challenge H2, M3). */
function confidenceNote(c: Ctx): string {
  const cloud = c.i.finops?.status === 'quantified' && sized(c)?.total?.cloudIncluded ? ` Confidence in the cloud line is ${c.i.finops.confidence ?? 'not stated'}.` : '';
  return `Confidence in the licence lever is Low: its cases are LTM planning shares of the client's measured figure, with no published range, and the upper case is all of it.${cloud}`;
}

/** An estate that described no public cloud, SaaS or AI has no cloud line to take from FinOps IQ (CQ10 challenge M10). */
export function cloudless(i: CostIqReportInput): boolean {
  const fp = i.answers['CORE-01'];
  return Array.isArray(fp) && fp.length > 0 && !fp.some(x => ['PUBLIC_CLOUD', 'SAAS', 'AI'].includes(String(x)));
}

function cloudLine(c: Ctx): Block[] {
  const s = c.i.finops;
  if ((!s || s.status !== 'quantified') && cloudless(c.i)) {
    const lever = c.findings.some(f => f.id === 'F-008') && !sized(c) ? ' A non-cloud amount for software licences can be added when the consultant records the measured unused licence cost.' : '';
    return [{ kind: 'callout', tone: 'info', title: 'Cloud line: not applicable', segs: ['No public cloud, SaaS or AI estate was described, so there is no cloud line to take from FinOps IQ. If that changes, run FinOps IQ and link it to this assessment.' + lever] }];
  }
  if (!s || s.status !== 'quantified' || !s.cases) {
    return [{ kind: 'callout', tone: 'warn', title: 'Cloud line: not quantified', segs: [
      'The cloud line is not quantified. ',
      s ? `The linked FinOps IQ assessment does not show money for this estate (${s.label}). ` : 'No FinOps IQ assessment is linked to this report. ',
      'Run FinOps IQ and link it to this assessment to add the cloud, AI and measured SaaS licence line. Until then any total in this report is stated excluding cloud.'
    ] }];
  }
  const cur = s.currency;
  const blocks: Block[] = [{ kind: 'table', small: true, head: ['Case', 'Net run rate a year', 'Year 1', 'Year 2', 'Year 3', 'First three years'], widths: ['*', 74, 66, 66, 66, 74], rows: CASES.map(k => [
    [strong(CASE_LABEL[k])], [figure(s.cases![k].netRunRate, cur)], [figure(s.cases![k].netYear1, cur)], [figure(s.cases![k].netYear2, cur)], [figure(s.cases![k].netYear3, cur)], [figure(s.cases![k].net3Year, cur)]
  ]) }];
  blocks.push({ kind: 'paragraph', style: 'small', segs: ([
    `From the FinOps IQ assessment dated `, ref(s.assessmentDate ?? 'not stated'), c.i.finopsLinkedAt ? ', linked to this report on ' : '', c.i.finopsLinkedAt ? ref(c.i.finopsLinkedAt) : '', `, engine `, ref(s.versions.engine), `; confidence ${s.confidence ?? 'not stated'}. `,
    s.cloudSpend?.low && s.cloudSpend.high ? ['In-scope public cloud spend ', figure(s.cloudSpend.low, cur), ' to ', figure(s.cloudSpend.high, cur), '. '] : [],
    s.cloudSpend?.low && s.cloudSpend.high
      ? ['The range is capped at ', figure(s.globalCap.share, cur, 'share'), ' of that spend. ']
      : ['FinOps IQ recorded no in-scope spend figure for this line, so the cap of ', figure(s.globalCap.share, cur, 'share'), ' of spend cannot be shown as an amount. '],
    quoted(clean(s.globalCap.source.citation)), ' (', quoted(clean(s.globalCap.source.sample)), '). ',
    'Net of the cost to implement and phased over the first three years, as FinOps IQ models it. Cost IQ shows this line as FinOps IQ computed it and does not estimate it again.'
  ] as Array<Seg | Seg[]>).flat() });
  if (c.i.currency && c.i.currency !== cur) blocks.push({ kind: 'paragraph', style: 'small', segs: [`This line is in ${cur}, as FinOps IQ produced it; the reporting currency for this assessment is ${c.i.currency}. No conversion has been applied.`] });
  return blocks;
}

/** The sentence after the evidence request: it must agree with whether the report shows any amount (CQ10 challenge H1). */
function sizing(c: Ctx): string {
  const cloud = c.i.finops?.status === 'quantified', nc = !!sized(c);
  if (c.ind.total) return 'Each indicative range is replaced by a measured figure when its evidence arrives.';
  if (!cloud && !nc) return 'Sizing starts when the evidence arrives; until then no saving is stated.';
  const parts = [...(cloud ? ['the cloud line from FinOps IQ'] : []), ...(nc ? ['the licence lever sized from the client\'s measured figures'] : [])];
  return `Sizing of the findings starts when the evidence arrives; until then the only ${parts.length > 1 ? 'amounts' : 'amount'} in this report ${parts.length > 1 ? 'are' : 'is'} ${parts.join(' and ')}.`;
}

/** "Finding 3" or "Findings 1, 7 and 8", in report order. */
const findingsNamed = (c: Ctx, ids: string[]) => {
  const nos = [...new Set(ids.map(id => findingNo(c, id)).filter(n => n > 0))].sort((a, b) => a - b);
  return nos.length ? `${nos.length === 1 ? 'Finding' : 'Findings'} ${andList(nos)}` : '';
};

/** The answer at a glance (product-grade plan A2): value, share, findings and the two scores, in one row. */
function answerTiles(c: Ctx): Block {
  const h = c.i.result.headlines, t = c.ind.total;
  const nHigh = c.i.result.findings.filter(f => f.severity === 'high').length;
  return { kind: 'kpis', items: [
    ...(t ? [
      { label: 'Indicative value a year', value: hasMoney(c) ? moneyRange(c, 'indicative.total', t.low, t.high) : ['No spend band'], note: ['LTM planning estimate'] },
      { label: 'Share of spend in scope', value: shareRange('indicative.total', t.shareLow, t.shareHigh), note: ['Each category counted once'] }
    ] : []),
    { label: 'Findings', value: [count('findings.count', c.i.result.findings.length)], note: [count('findings[high]', nHigh), ' high'] },
    { label: 'Cost management', value: h.costIQ != null ? [traced('headlines.costIQ', h.costIQ, 'index', []), OF100] : ['Not scored'], note: ['How well cost is managed, not a saving'] },
    { label: 'Value management', value: h.valueIQ != null ? [traced('headlines.valueIQ', h.valueIQ, 'index', []), OF100] : ['Not scored'], note: [traced('evidence.assessmentCompleteness', c.i.result.evidence.assessmentCompleteness, 'percent', []), ' of questions answered'] }
  ] };
}

/**
 * The first 100 days (A2), counted from receipt of the report: the decision in the first 30, the first steps from day 31 on
 * LTM's planning ranges, and a review at day 100. Days are LTM-authored planning text, not engine figures.
 */
function first100(c: Ctx): Block[] {
  if (!c.findings.length) return [];
  const first = activePackages(c).slice(0, 3);
  const rows: Seg[][][] = [[[strong('Days 1 to 30')], [ref(`Name an owner for each finding and release the evidence it lists${first.length ? ', starting with the findings the first steps address' : ''}. Agree the scope of the first steps with LTM.`)], ['CIO or head of technology finance']]];
  for (const { r, p } of first) {
    const [lo, hi] = elapsed(p);
    const end = (w: number) => 30 + w * 7;
    rows.push([[strong('From day 31')], [strong(p.offeringName), ', ', TYPE_LABEL[p.offeringType].toLowerCase(), ', ', ref(weeks([lo, hi])), '. ', ref(end(hi) <= 100 ? 'Ends by day 100' : end(lo) <= 100 ? `Ends between day ${end(lo)} and day ${end(hi)}` : `Runs past day 100, to between day ${end(lo)} and day ${end(hi)}`), '. ', ref(`Addresses ${findingsNamed(c, r.findingIds.filter(id => c.findings.some(f => f.id === id)))}.`)], [ref(p.workstreams[0]?.ownerRole ?? 'To be agreed')]]);
  }
  rows.push([[strong('Day 100')], [ref(`Review with LTM: the evidence received, the measured figures that ${c.ind.total ? 'replace the indicative ranges' : 'size the findings'}, and the next steps from the roadmap.`)], ['CIO']]);
  return [
    { kind: 'subheading', text: 'The first 100 days' },
    { kind: 'table', head: ['When', 'What happens', 'Client owner'], widths: [62, '*', 110], small: true, rows },
    { kind: 'paragraph', style: 'small', segs: ['Days run from receipt of this report. ', ...(first.length ? ['The steps shown are those for the most severe findings, in order; the roadmap lists every step. ', 'Durations are LTM planning ranges, not commitments (see the assumptions).'] : ['No delivery step is recommended yet; the roadmap explains why.'])] }
  ];
}

function summary(c: Ctx): ReportSection {
  const { i } = c;
  const blocks: Block[] = [];
  // CIO-first (CQ12 slice 4; product-grade plan A2): one page with the value, the decision and the first 100 days. The
  // scores and the areas to look at first are supporting evidence in the scores section.
  const top = orderedFindings(c.findings).slice(0, 3);
  const nHigh = i.result.findings.filter(f => f.severity === 'high').length;
  blocks.push(...valueLead(c));
  blocks.push(answerTiles(c));
  blocks.push({ kind: 'paragraph', style: c.ind.total ? undefined : 'lead', segs: i.result.findings.length
    ? [count('findings.count', i.result.findings.length), ` ${plural(i.result.findings.length, 'finding is', 'findings are')} raised, `, count('findings[high]', nHigh), ` ${plural(nHigh, 'of them', 'of them')} high. The most important: `,
       ...top.flatMap((f, k) => [k ? '; ' : '', ref(`Finding ${k + 1}`), ', ', quoted(lowerFirst(f.title))]), c.ind.total ? '. Each lists the evidence that turns its range into a measured figure.' : '. Each lists the evidence needed before any saving is sized.']
    : ['No finding is raised on the answers given. That reflects the areas assessed and the questions answered; it is not evidence that no saving exists.'] });
  const x = i.result.cio;
  const named = x ? [...x.expectations, ...x.costHypotheses] : [];
  if (named.length) blocks.push({ kind: 'paragraph', segs: [
    'Of the ', count('cio.named', named.length), ` opportunity ${plural(named.length, 'area', 'areas')} the client named before seeing the findings, `, count('cio.confirmed', named.filter(e => e.status === 'confirmed').length), ' ',
    plural(named.filter(e => e.status === 'confirmed').length, 'is', 'are'), ' confirmed by a finding',
    ...(x!.blindSpots.length ? ['; ', count('cio.blindSpots', x!.blindSpots.length), ` high ${plural(x!.blindSpots.length, 'finding sits', 'findings sit')} outside them`] : []),
    '. ', ref(valueSection(c) ? 'Section 3' : 'Section 2'), ' sets the client\'s view against the evidence.'
  ] });
  blocks.push({ kind: 'callout', tone: 'info', title: 'Decision requested', segs: [
    i.result.findings.length
      ? ['The CIO, or the head of technology finance, is asked to name an owner for each finding and to release the evidence listed against it, within ', ref('30 days'), ' of receiving this report. ', ref(sizing(c)), ' The ', ref('30 days'), ' is a default to adjust to the organisation\'s own planning cycle.'] as Seg[]
      : ['The CIO, or the head of technology finance, is asked to confirm the owner of the lowest-scoring areas in the scores section and to complete the unanswered questions within ', ref('30 days'), ' of receiving this report, so that findings can be tested. The ', ref('30 days'), ' is a default to adjust to the organisation\'s own planning cycle.'] as Seg[]
  ].flat() });
  blocks.push(...first100(c));
  const nc = sized(c);
  if (nc?.total) {
    blocks.push({ kind: 'subheading', text: nc.total.cloudIncluded ? 'Value range: total across the estate' : 'Value range: total excluding cloud' });
    blocks.push(totalTable(nc.total, nc.currency));
    blocks.push({ kind: 'paragraph', style: 'small', segs: [...(c.ind.total ? ['Separate from the indicative value above, which covers the other cost findings. '] : []), nc.total.cloudNote, ' Each case is net of the client\'s own internal cost to deliver (external fees, tools and contract penalties are not included and are agreed separately), phased as the lever sections explain. The range is indicative and depends on the client-measured figures set out under "Non-cloud levers and total". ', confidenceNote(c)] });
  }
  // A quantified cloud line is money and keeps its table; otherwise its status is one sentence in the note on what is sized.
  const cloud = cloudLine(c);
  const cloudQuantified = c.i.finops?.status === 'quantified' && !!c.i.finops.cases;
  if (cloudQuantified) { blocks.push({ kind: 'subheading', text: 'Cloud line (from FinOps IQ)' }); blocks.push(...cloud); }
  blocks.push({ kind: 'callout', tone: 'info', title: 'What this report sizes', segs: [
    c.ind.total
      ? `The indicative ranges are LTM planning estimates from the answers and the spend band, for prioritising the work.${nc ? ' The non-cloud lever or levers sized from figures the client measured replace the range for their finding.' : ''}${c.i.finops?.status === 'quantified' ? ' The cloud line comes from FinOps IQ and is not estimated again.' : ' Cloud and SaaS are sized by FinOps IQ, not here.'} `
      : nc
      ? 'The amounts in this report are the non-cloud lever or levers sized from figures the client measured, and the cloud line taken from FinOps IQ where one is linked. Nothing is sized from questionnaire answers alone: every other finding lists the evidence needed first. '
      : c.i.finops?.status === 'quantified'
      ? 'The only amount in this report is the cloud line above, taken from FinOps IQ. Cost IQ does not size any non-cloud saving here, so no total across the estate is stated: each finding lists the evidence needed first. '
      : 'No amount is stated. Cost IQ does not size a saving from self-reported answers: each finding lists the evidence needed first. ',
    ...(cloudQuantified ? [] : cloud.flatMap(b => (b.kind === 'callout' ? [...b.segs, ' '] : []))),
    'Indicative figures are for planning. They are not a savings commitment and need validating against the organisation\'s own data.'
  ] });
  return { id: 'summary', title: 'Executive summary', blocks };
}

/** A4: answers that are unlikely on their own or contradict each other. They change nothing in the scoring; they are checked first. */
function toConfirm(c: Ctx): Block[] {
  const checks = plausibilityChecks(c.i.answers);
  if (!checks.length) return [];
  return [
    { kind: 'subheading', text: 'Answers to confirm' },
    { kind: 'paragraph', style: 'small', segs: ['These answers are unlikely on their own or do not fit together. They are scored as given and change no score, finding or range here; LTM confirms them with the respondent before evidence is gathered against them. The thresholds are LTM\'s, not published benchmarks.'] },
    { kind: 'table', head: ['What to confirm', 'Answers given', 'Why'], widths: [130, '*', 150], small: true, rows: checks.map(k => [
      [strong(k.title), ...(c.client ? [] : ['\n', ref(k.id)] as Seg[])],
      k.questionIds.flatMap((q, n) => [n ? '\n' : '', quoted(questionsById.get(q)?.prompt ?? q), ' Answer: ', ...answerSegs(c.i, q, c.i.answers[q])]),
      [ref(k.confirm)]
    ]) }
  ];
}

function profile(c: Ctx): ReportSection {
  const { i } = c;
  const sel = (config as any).settings.selection;
  const footprint = has(i.answers, 'CORE-01') ? (i.answers['CORE-01'] as string[]) : [];
  const notChosen = Object.keys(sel.areas).filter(a => !i.selectedAreas.includes(a));
  const blocks: Block[] = [
    { kind: 'paragraph', segs: ['Client: ', { text: c.opts.client, strong: true, ref: true } as Seg, `. Data provided by ${c.opts.dataProvidedBy}. Assessed on `, ref(i.assessmentDate), i.currency ? `; reporting currency ${i.currency}.` : '.'] },
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
  blocks.push(...toConfirm(c));
  return { id: 'profile', title: 'Scope and context', blocks };
}

/**
 * CQ12 slice 2: the client's situation and priorities, and their own view of where the opportunities are, set against what the
 * scored answers raised. Built only from answers and the engine's `cio` block; it sizes nothing and moves no score.
 */
function yourView(c: Ctx): ReportSection | null {
  const { i } = c, x = i.result.cio;
  if (!x) return null;
  const P = (key: string, qid: string) => (x.profile[key] != null ? answerSegs(i, qid, x.profile[key]) : null);
  const num = (fid: string) => orderedFindings(c.findings).findIndex(f => f.id === fid) + 1;
  const title = (fid: string) => c.findings.find(f => f.id === fid)?.title ?? fid;
  const blocks: Block[] = [];

  const situation: Seg[] = [];
  const add = (lead: string, segs: Seg[] | null, tail = '') => { if (segs) situation.push(situation.length ? '; ' : '', lead, ...segs, tail); };
  if (x.profile.industry != null) situation.push(quoted(optionLabel('CORE-02', x.profile.industry)));
  add('annual revenue ', P('revenue', 'CORE-03'));
  add('technology spend in scope ', P('spend', 'CORE-04'));
  add('technology operations in ', P('countries', 'CTX-05'));
  add('regions ', P('regions', 'CTX-03'));
  add('operations delivered onshore: ', P('onshoreShare', 'CTX-04'));
  add('spend priced in another currency: ', P('foreignPricedShare', 'CTX-02'));
  if (situation.length) blocks.push({ kind: 'paragraph', segs: ['As described by the client: ', ...situation, '.'] });
  const inc = x.profile.spendIncludes;
  if (Array.isArray(inc) && inc.length) {
    const q = questionsById.get('CORE-05');
    const missing = (q?.options ?? []).map((o: any) => o.id).filter((id: string) => !['OTHER', 'UNKNOWN'].includes(id) && !inc.includes(id));
    blocks.push({ kind: 'paragraph', style: 'small', segs: inc.includes('UNKNOWN')
      ? ['The client could not confidently say which categories the technology-spend figure includes, so any comparison with it is approximate.']
      : ['The technology-spend figure includes: ', quoted(optionLabel('CORE-05', inc)), '.', ...(missing.length ? [' It does not include: ', quoted(optionLabel('CORE-05', missing)), '.'] : [])] });
  }

  // Spend against a published average (CQ12 slice 5): a cross-industry reference, placed only when the bands allow it.
  const b = spendShareOfRevenue(i.answers);
  if (b) {
    const avg = REF.averagePercent as number;
    const pct = (f: string, v: number) => traced(f, v, 'percent', REF.enabled ? [REF.claimId] : []);
    const range: Seg[] = b.low != null && b.high != null ? ['between ', pct('benchmark.low', b.low), ' and ', pct('benchmark.high', b.high)] : b.low != null ? ['at least ', pct('benchmark.low', b.low)] : ['no more than ', pct('benchmark.high', b.high!)];
    const partial = Array.isArray(inc) && !inc.includes('UNKNOWN') && (questionsById.get('CORE-05')?.options ?? []).some((o: any) => !['OTHER', 'UNKNOWN'].includes(o.id) && !inc.includes(o.id));
    blocks.push({ kind: 'subheading', text: REF.enabled ? 'Technology spend against a published average' : 'Technology spend as a share of revenue' });
    if (REF.enabled) {
      const place = b.high != null && b.high < avg ? 'below' : b.low != null && b.low > avg ? 'above' : null;
      blocks.push({ kind: 'paragraph', segs: ['From the size bands given, technology spend in scope is ', ...range, ' of revenue. ', ref(REF.source), ' reports technology investment at about ', pct('benchmark.average', avg), ' of revenue on average (', ref(REF.sample), ', surveyed ', ref(REF.fieldwork), '). ',
        place ? `The client's range sits ${place} that average.` : 'The bands are too wide to place the client above or below it; exact figures would.'] });
      blocks.push({ kind: 'paragraph', style: 'small', segs: [REF.caveat, partial ? ' The spend figure here leaves out some categories (above), so the comparison understates the full technology spend.' : ''] });
    } else {
      blocks.push({ kind: 'paragraph', segs: ['From the size bands given, technology spend in scope is ', ...range, ' of revenue', partial ? ', for the categories included above' : '', '. Exact revenue and spend figures would narrow the range.'] });
      blocks.push({ kind: 'paragraph', style: 'small', segs: ['No published average is set beside this figure: the free published surveys differ widely in who answers and in what they count as technology spend, and none gives a verified split by industry.'] });
    }
  }

  const rows: Seg[][][] = [];
  const row = (k: string, v: Seg[]) => rows.push([[k], v]);
  if (x.protect.length) row('Outcomes to protect', [quoted(x.protect.map((o, n) => `${n + 1}. ${optionLabel('CORE-07', o)}`).join('  '))]);
  if (x.pressure != null) row('Cost pressure', answerSegs(i, 'CORE-08', x.pressure));
  if (x.protectCapabilities.length) row('Capabilities to protect from broad cuts', answerSegs(i, 'ADP-57', x.protectCapabilities));
  if (x.redirect.length) row('Where 10% of spend would be redirected', answerSegs(i, 'CORE-45', x.redirect));
  if (x.barriers.length) row('Barriers to realising savings', answerSegs(i, 'ADP-56', x.barriers));
  if (x.fundingChange != null) {
    const r = x.fundingRecommendation ? i.result.recommendations.find(y => y.id === x.fundingRecommendation) ?? (config as any).recommendations.find((y: any) => y.id === x.fundingRecommendation) : null;
    row('Funding change that would help most', [...answerSegs(i, 'CORE-10', x.fundingChange), ...(r ? [' The matching step, ', quoted(uk(r.title)), x.fundingRecommendationRaised ? ', is in the roadmap.' : ', is not raised by the findings; it can be added to the roadmap at the client\'s request.'] : [])]);
  }
  if (rows.length) {
    blocks.push({ kind: 'subheading', text: 'Priorities the client set' });
    blocks.push({ kind: 'table', head: ['Topic', 'As answered'], widths: [170, '*'], rows, small: true });
  }

  const compare = [...x.expectations.map(e => ({ e, qid: 'CORE-09', as: 'Value opportunity' })), ...x.costHypotheses.map(e => ({ e, qid: 'ADP-55', as: 'Cost opportunity' }))];
  if (compare.length) {
    blocks.push({ kind: 'subheading', text: 'The client\'s view and the evidence' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['Before seeing any finding, the client named where it expected the largest opportunities. Each is set against the findings the scored answers raised. A finding confirms an area; an area not confirmed is worth testing with evidence, not dismissing. Within one rating, findings in the areas the client expected are listed first.'] });
    blocks.push({ kind: 'table', small: true, head: ['Area named', 'Asked as', 'Rank', 'What the scored answers show'], widths: ['*', 90, 40, 190], rows: compare.map(({ e, qid, as }) => [
      [quoted(optionLabel(qid, e.area))], [as], [e.rank ? ref(String(e.rank)) : '—'],
      e.status === 'confirmed' ? [ref(`Confirmed: ${e.raised.map(f => `Finding ${num(f)}`).join(', ')}`)] : e.status === 'not-confirmed' ? ['Not confirmed by the scored answers'] : ['Outside what Cost IQ\'s findings assess']
    ]) });
  }
  if (x.blindSpots.length) {
    blocks.push({ kind: 'subheading', text: 'Raised, but not where the client expected' });
    blocks.push({ kind: 'list', items: x.blindSpots.map(f => [ref(`Finding ${num(f)}`), ': ', quoted(title(f))]) });
  }
  if (x.unconfirmedHotspots.length) {
    blocks.push({ kind: 'subheading', text: 'Issues named that the scored answers did not confirm' });
    blocks.push({ kind: 'list', small: true, items: x.unconfirmedHotspots.map(h => [strong(h.label), ': ', ...answerSegs(i, h.questionId, h.answer), '. ', h.findingId ? 'Listed for validation: no finding is raised on the scored answers.' : 'No Cost IQ finding covers this area; listed for the consultant to follow up.']) });
  }
  return blocks.length ? { id: 'your-view', title: 'Priorities and the client\'s view', blocks } : null;
}

/** The lowest-scoring areas. A dimension scored from one answer is a weak signal and is never listed (CQ10 challenge M4). */
function lookFirst(c: Ctx): Block[] {
  const MIN_ANSWERS = 2;
  const weakest = c.scored.filter(d => d.answered >= MIN_ANSWERS).sort((a, b) => (a.score as number) - (b.score as number)).slice(0, 4);
  const singles = c.scored.filter(d => d.answered < MIN_ANSWERS).length;
  if (!weakest.length) return [];
  return [
    { kind: 'subheading', text: 'Where to look first' },
    { kind: 'paragraph', style: 'small', segs: ['These are the lowest-scoring areas that two or more answers support. A low score is a reason to look, not a finding: a finding is raised only where named answers meet LTM\'s rules, so a low-scoring area may have none yet.' + (singles ? ' Areas that rest on a single answer are left out here as too weak a signal; the bars below show them.' : '')] },
    { kind: 'table', head: ['Area', 'Score', 'Questions answered'], widths: ['*', 70, 110], small: true, rows: weakest.map(d => [[strong(d.name), '\n', quoted(d.definition)], [traced(`dimensions[${d.id}].score`, d.score as number, 'index', [])], [count(`dimensions[${d.id}].answered`, d.answered)]]) }
  ];
}

function scores(c: Ctx): ReportSection {
  const { i } = c;
  const row = (d: Dimension) => ({ label: d.name, value: d.score ?? 0, shown: d.score != null ? [traced(`dimensions[${d.id}].score`, d.score, 'index', []), OF100, '  ·  ', count(`dimensions[${d.id}].answered`, d.answered), ' answered', ...(d.unanswered ? [', ', count(`dimensions[${d.id}].unanswered`, d.unanswered), ' left blank'] : [])] as Seg[] : ['Not scored'] as Seg[], tone: tone(d.score) });
  const group = (type: 'cost' | 'value'): Block[] => {
    const ds = i.result.dimensions.filter(d => d.type === type);
    return [{ kind: 'bars', max: 100, items: ds.map(row) }];
  };
  const blocks: Block[] = [
    { kind: 'paragraph', segs: ['Each dimension is the mean of the scored answers that feed it, on a scale where a higher score is stronger practice. A dimension fed by few questions is a weaker signal than one fed by many; the number of questions is shown beside each score. The scores describe how well cost and value are managed; they are not a measure of how much could be saved.'] },
    ...lookFirst(c),
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
  if (unscored.length) blocks.push({ kind: 'paragraph', style: 'small', segs: [`Not scored, because no scored question feeding it was asked: ${unscored.map(d => d.name).join('; ')}.`] });
  blocks.push({ kind: 'paragraph', style: 'small', segs: ['The ', count('dimensions.total', i.result.dimensions.length), ' dimensions are LTM\'s own constructs. They are not a published taxonomy; the closest published references are named under Methodology.'] });
  return { id: 'scores', title: 'Scores by dimension', blocks };
}

/** Earlier-numbered findings raised by one of the same answers, so a reader does not take two findings for two pieces of evidence. */
function sharedWith(c: Ctx, f: Finding, k: number): number[] {
  const mine = new Set((f.activation?.evidenceSignals ?? []).map(s => s.questionId));
  return orderedFindings(c.findings).slice(0, k).flatMap((g, n) => ((g.activation?.evidenceSignals ?? []).some(s => mine.has(s.questionId)) ? [n + 1] : []));
}

/** A finding's indicative range, or why it has none, as a row of its table. */
function indicativeRow(c: Ctx, f: Finding): Seg[][][] {
  const l = c.ind.lines.find(x => x.findingId === f.id);
  // A3: the numbers behind the range, so a reader can check it: the category spend it applies to, the rate and how sure it is.
  if (l) {
    const p = `indicative.findings[${f.id}]`;
    const m = (k: 'baseLow' | 'baseHigh', v: number) => traced(`${p}.${k}`, v, 'currency', [], IND_ASM, c.ind.currency);
    const base: Seg[] = hasMoney(c) && (l.baseLow != null || l.baseHigh != null)
      ? [...(l.baseHigh == null ? ['at least ', m('baseLow', l.baseLow!)] : !l.baseLow ? ['up to ', m('baseHigh', l.baseHigh)] : [m('baseLow', l.baseLow), ' to ', m('baseHigh', l.baseHigh)]), ' a year, ']
      : [];
    const rate = (INDICATIVE_LIBRARY.findings as unknown as Record<string, { rate: [number, number] }>)[f.id].rate;
    return [
      [['Addressable base'], [quoted(upperFirst((INDICATIVE_LIBRARY.categoryLabels as Record<string, string>)[l.category])), ': ', ...base, ...(l.baseShare >= 1 ? ['all of the spend in scope, which the client said is this category only.'] : [share(`${p}.baseShare`, l.baseShare), ' of spend in scope, on a typical split by category.'])]],
      [['Indicative value'], [...(hasMoney(c) ? [...moneyRange(c, p, l.low, l.high), ' a year, '] : []), ...shareRange(p, l.shareLow, l.shareHigh), ' of spend in scope: ', ref(`an LTM planning rate of ${Math.round(rate[0] * 100)}% to ${Math.round(rate[1] * 100)}%`), ' of the base.', ...(l.counted ? [] : [' Overlaps another finding in the same category, so it is counted once in the total.'])]],
      [['Confidence'], [ref(`Low. The rate and the split by category are LTM planning assumptions (A-12, A-13), not measured.${c.ind.categoriesAssumed ? ' The client did not say which categories the spend includes, so every category is assumed.' : ''} The evidence below replaces the range with a measured figure.`)]]
    ];
  }
  const n = c.ind.notSized.find(x => x.findingId === f.id);
  return n && n.reason !== 'enabler' ? [[['Indicative value'], [IND_REASON[n.reason]]]] : [];
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
        return [k ? '\n' : '', quoted(q?.prompt ?? 'a question in the assessment'), ' Answer: ', ...(typeof a !== 'number' && s.operator && Number.isFinite(Number(a)) ? [traced(`answers[${s.questionId}]`, Number(a), 'percent', [])] : answerSegs(i, s.questionId, a))];
      }).flat() : ['The combination of answers given']],
      ...(sharedWith(c, f, k).length ? [[['Shares its trigger'], [ref(`The same answer also raises ${sharedWith(c, f, k).map(n => `Finding ${n}`).join(' and ')}.`)]]] as Seg[][][] : []),
      ...((i.result.cio?.findingContext[f.id] ?? []).length ? [[['Where the client sees it'], (i.result.cio!.findingContext[f.id]).flatMap((x, n) => [n ? '\n' : '', strong(x.label), ': ', ...answerSegs(i, x.questionId, x.answer)])]] as Seg[][][] : []),
      ...indicativeRow(c, f),
      [[c.ind.lines.some(l => l.findingId === f.id) ? 'Needed to measure it' : 'Needed before it is sized'], [o?.economic.missingEvidence?.length ? upperFirst(o.economic.missingEvidence.join('; ')) : 'Evidence supplied; feasibility still to be agreed']]
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
    blocks.push({ kind: 'table', small: true, head: ['Case', 'Gross run rate a year', 'Net run rate a year', 'Year 1', 'Year 2', 'Year 3', 'First three years'], widths: ['*', 62, 62, 58, 58, 58, 66], rows: CASES.map(k => [
      [strong(CASE_LABEL[k])], [figure(l.cases[k].runRate, cur)], [figure(l.cases[k].netRunRate, cur)], [figure(l.cases[k].netYear1, cur)], [figure(l.cases[k].netYear2, cur)], [figure(l.cases[k].netYear3, cur)], [figure(l.cases[k].net3Year, cur)]
    ]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [confidenceNote(c)] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['Year one earns ', ref(l.year1Basis), '; years two and three earn the whole run rate. The years are net of the delivery cost: the one-off cost falls in year one and the running cost in every year.'] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['One-off cost to deliver, from the client\'s own cost of an FTE-month (internal effort only; external fees, tools and contract penalties are excluded and agreed separately): ', figure(l.cases.expected.oneOffCost, cur), '; yearly running cost ', figure(l.cases.expected.ongoingCost, cur), '. Software already counted in the FinOps IQ cloud line (SaaS and marketplace) is outside this base, so the same saving is not counted twice.'] });
  }
  for (const n of nc.notSized) blocks.push({ kind: 'paragraph', style: 'small', segs: [`${n.name}: not sized. ${n.reason}`] });
  if (nc.total) {
    blocks.push({ kind: 'subheading', text: 'Total' });
    blocks.push(totalTable(nc.total, cur));
    blocks.push({ kind: 'paragraph', style: 'small', segs: [nc.total.cloudNote, ' ', confidenceNote(c)] });
  }
  return { id: 'levers', title: 'Non-cloud levers and total', blocks };
}

/** Library text for the reader: the client edition carries no finding or recommendation IDs. */
const lib = (c: Ctx, t: string) => uk(c.client ? t.replace(/\b[FR]-\d{3}\s\((.*?)\)/g, '"$1"').replace(/\s?\b[FR]-\d{3}\b/g, '') : t);
const bullets = (c: Ctx, items: string[]): Seg[] => items.flatMap((t, k) => [k ? '\n' : '', ref('• ' + lib(c, t))] as Seg[]);
/**
 * The package for a recommendation, as this report needs it. Evidence lines name their finding, so a line is kept only for a
 * finding the report raised (CQ10 challenge H3). With a FinOps IQ result already linked, the cloud scoping package becomes a
 * short review of that result, so the report never asks the client to scope what it says is done (H4).
 */
function pkg(c: Ctx, id: string): Package | undefined {
  const found = PACKAGES.get(id);
  if (!found) return undefined;
  const base = { ...found, offeringName: uk(found.offeringName) };
  const raised = new Set(c.findings.map(f => f.id));
  const prerequisites = base.prerequisites.filter(t => { const m = /^Evidence for (F-\d{3})\b/.exec(t); return !m || raised.has(m[1]); });
  if (id !== 'R-003' || c.i.finops?.status !== 'quantified') return { ...base, prerequisites };
  return {
    ...base,
    offeringName: 'Review of the Linked FinOps IQ Result',
    scope: 'A short advisory review of the FinOps IQ assessment already linked to this report: whether its cloud line and capability ratings explain this finding, which evidence is still missing and who holds it. No new FinOps IQ assessment is needed unless the review finds the linked one out of date or out of scope. This package does not size opportunities or recommend cloud changes.',
    outcome: 'A short review note stating what the linked FinOps IQ assessment already explains, which evidence is still missing and who holds it.',
    prerequisites,
    risks: [{ risk: 'Evidence holders are not identified', mitigation: 'Do not start the review until each evidence item has a named holder' }],
    workstreams: [{
      id: 'WS1', name: 'Review the linked result',
      activities: ['Read the linked FinOps IQ result against this finding with the cloud platform and finance owners', 'Confirm the linked assessment still covers the in-scope accounts and the right period', 'List any evidence still missing and name its holder'],
      ownerRole: 'Head of cloud platform', ltmRole: 'FinOps consultant', durationWeeks: [1, 1], effortFteWeeks: [0.5, 1], dependsOn: ['Prerequisites'],
      milestone: 'Review note drafted', kpis: ['Evidence gaps with a named holder']
    }],
    playbook: [{ topic: 'Review of the linked result', steps: ['Compare the finding with the linked cloud line and capability ratings', 'Record what is explained and what is not', 'Name the owner of each missing evidence item'], verification: 'The review note lists each gap with a holder and a date.', options: [] }],
    sow: { ...base.sow, objectives: ['Review the linked FinOps IQ result against the finding', 'Name evidence holders for any gap', 'Give the CIO a documented basis for the next decision'], deliverables: ['Review note'], assumptions: ['The linked FinOps IQ assessment is current and covers the in-scope cloud estate', 'Client owners are available for validation sessions', 'Durations and effort are planning heuristics and are confirmed in the statement of work'], exclusions: ['A new FinOps IQ assessment', 'Sizing of opportunities', 'Technical changes to any cloud environment'] }
  };
}
const activePackages = (c: Ctx) => orderedRecs(c).map(r => ({ r, p: pkg(c, r.id) })).filter((x): x is { r: Recommendation; p: Package } => !!x.p);

function deliveryPlan(c: Ctx): Block[] {
  const blocks: Block[] = [];
  const act = activePackages(c);
  if (!act.length) return blocks;
  blocks.push({ kind: 'subheading', text: 'Delivery plan' });
  // Product-grade plan A5 (owner decision of 12 Nov 2026): the client edition carries a one-table summary; the workstreams,
  // risks and technical practice steps are in the consultant edition and walked through with the client at mobilisation.
  if (c.client) {
    // The evidence lines repeat the findings section, so they are named by finding number; the sponsor line is common to all.
    const numbered = orderedFindings(c.findings);
    const supplies = (p: Package): Seg[] => {
      const nums = p.prerequisites.map(t => /^Evidence for (F-\d{3})\b/.exec(t)?.[1]).filter((x): x is string => !!x).map(id => numbered.findIndex(f => f.id === id) + 1).filter(n => n > 0);
      const rest = p.prerequisites.filter(t => !/^Evidence for F-\d{3}\b/.test(t) && !/^Named client sponsor\b/.test(t));
      return bullets(c, [...(nums.length ? [`The evidence listed for ${nums.length === 1 ? 'Finding' : 'Findings'} ${andList(nums)}`] : []), ...rest]);
    };
    blocks.push({ kind: 'paragraph', segs: ['One line for each recommended step. Elapsed times are LTM planning ranges, not commitments (see the assumptions); sizing and the final plan are agreed once the evidence is in. Owners are roles at the client; names are agreed at mobilisation. Every step needs a named client sponsor and a data owner for each evidence item. LTM walks through the workstreams, their risks and the practice steps at mobilisation.'] });
    blocks.push({ kind: 'table', head: ['Step', 'LTM offering', 'Elapsed time', 'Client owners', 'Before work starts, the client supplies'], widths: [100, 100, 55, 95, '*'], small: true, rows: act.map(({ r, p }) => [
      [strong(r.title)], [ref(p.offeringName), '\n', TYPE_LABEL[p.offeringType]], [ref(weeks(elapsed(p)))], [ref([...new Set(p.workstreams.map(w => w.ownerRole))].join('\n'))], supplies(p)
    ]) });
    return blocks;
  }
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
  const recs = orderedRecs(c);
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['The route from a finding to a saving has three steps, and no step is skipped. First, supply the evidence each finding names. Then size the opportunity from that evidence and agree what is feasible with the owners. Finally, plan delivery and track the result against the baseline.'] }];
  if (recs.length) {
    blocks.push({ kind: 'subheading', text: 'Recommended next steps' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['In order: each step is placed by the highest-severity finding it addresses, the order in which the findings are numbered.'] });
    blocks.push({ kind: 'table', head: ['Step', 'What it covers', 'Findings addressed'], widths: [140, '*', 90], small: true, rows: recs.map(r => [[strong(r.title)], [quoted(r.description)], [ref(orderedFindings(c.findings).map((f, k) => (r.findingIds.includes(f.id) ? `Finding ${k + 1}` : '')).filter(Boolean).join('; ') || 'None raised')]]) });
  } else blocks.push({ kind: 'paragraph', segs: ['No step is recommended on the answers given.'] });
  blocks.push(...deliveryPlan(c));
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

function help(c: Ctx): ReportSection {
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['LTM offers these services for the findings above. Scope, effort and price are agreed after the evidence is in; none is assumed here.'] }];
  const recs = new Map(c.i.result.recommendations.map(r => [r.id, r]));
  const fs = orderedFindings(c.findings);
  const shown = new Map<string, number>();
  if (fs.length) {
    blocks.push({ kind: 'table', head: ['Finding', 'LTM offering', 'What LTM does', 'What the client has at the end'], widths: [110, 100, '*', '*'], small: true, rows: fs.map((f, k) => {
      const p = f.recommendationIds.map(id => recs.has(id) ? pkg(c, id) : undefined).find(Boolean);
      const lead: Seg[] = [strong(`Finding ${k + 1}`), '\n', quoted(f.title)];
      const again = p ? shown.get(p.offeringName) : undefined;
      if (p && again === undefined) shown.set(p.offeringName, k + 1);
      return p && again !== undefined ? [lead, [strong(p.offeringName), '\n', TYPE_LABEL[p.offeringType]], [ref(`As for Finding ${again}: the same offering.`)], [ref(`As for Finding ${again}.`)]]
        : p ? [lead, [strong(p.offeringName), '\n', TYPE_LABEL[p.offeringType]], [ref(lib(c, p.scope))], [ref(lib(c, p.outcome))]]
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
  const rows = c.i.result.dimensions.map(d => [[strong(d.name)], [d.type], [d.score != null ? traced(`dimensions[${d.id}].score`, d.score, 'index', []) : 'Not scored'], [count(`dimensions[${d.id}].answered`, d.answered)], [count(`dimensions[${d.id}].unanswered`, d.unanswered ?? 0)]] as Seg[][]);
  return { id: 'calculation', title: 'How we calculated this', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Each scored question maps every answer to a fixed value on a scale where a higher value is stronger practice. A dimension score is the mean of the values of the scored questions asked for it, each counting equally; a question asked and left blank counts as "We do not know". The cost headline and the value headline are the means of their dimension scores, each dimension counting equally; a dimension with no question asked is left out, not counted as zero.'] },
    { kind: 'table', head: ['Dimension', 'Kind', 'Score', 'Answered', 'Left blank'], widths: ['*', 50, 50, 60, 60], small: true, rows },
    { kind: 'paragraph', style: 'small', segs: ['An answer of "We do not know" takes the lowest value on its question, and so does a question that was asked and left blank, so not knowing or skipping never scores better than answering. Context questions and hypotheses are recorded but never scored.'] }
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
    { id: 'A-06', what: 'Cloud figure', value: c.i.finops?.status === 'quantified' ? `The cloud line is the FinOps IQ result dated ${c.i.finops.assessmentDate ?? 'not stated'}, as it stood when linked. It covers the levers FinOps IQ quantified for the in-scope spend, capped at a published share of the in-scope spend, and is in ${c.i.finops.currency}` : 'No cloud figure is included', basis: 'Another LTM assessment (FinOps IQ), not recomputed here', confidence: c.i.finops?.confidence ?? 'Not applicable', ifWrong: 'Refreshing FinOps IQ and linking it again replaces the line; nothing else in this report moves' }
  ];
  if (activePackages(c).length) list.push({ id: 'A-11', what: 'Delivery durations and effort', value: 'Each workstream has a range of weeks and of FTE-weeks. A workstream starts when those it depends on end, and elapsed time is the longest path', basis: 'LTM planning heuristic: not from a published source or from LTM delivery history', confidence: 'Low', ifWrong: 'Plans lengthen or shorten and effort changes in proportion; no saving figure depends on them' });
  if (sized(c)) list.push(
    { id: 'A-08', what: 'Lever cases', value: 'Conservative is a quarter, expected a half and upper all of the client\'s measured base', basis: 'LTM heuristic, the same rule FinOps IQ applies to licence levers. No published range exists for this lever', confidence: 'Low', ifWrong: 'Every case scales with the share; the base itself does not change' },
    { id: 'A-09', what: 'Phasing and cost to deliver', value: 'Year one earns the share of contracts renewing that year, or a quarter when the client gave none; years two and three earn the whole run rate. Delivery effort is a fixed number of FTE-months for the chosen tier, costed at the client\'s own rate, with a fifth of that cost recurring each year. It is the client\'s internal effort only: external fees, tools and contract penalties are excluded and agreed separately', basis: 'LTM heuristic, copied from the FinOps IQ licence lever pending calibration on delivered work', confidence: 'Low', ifWrong: 'Year-one and three-year figures move; the gross run rate does not' },
    { id: 'A-10', what: 'The measured base', value: 'The unused or over-entitled licence cost is a figure the client supplied from its own reconciliation; LTM has not audited it. It excludes SaaS and marketplace software', basis: 'Client input', confidence: 'Varies', ifWrong: 'Every figure in this section scales with the base; an overstated base overstates the range in proportion' }
  );
  if (c.ind.lines.length) list.push(
    { id: 'A-12', what: 'Share of spend by category', value: `Typical shares of technology spend, rescaled to the categories the spend figure includes: ${Object.entries(INDICATIVE_LIBRARY.categoryShares).filter(([k]) => k !== 'note').map(([k, v]) => `${(INDICATIVE_LIBRARY.categoryLabels as Record<string, string>)[k]} ${v}%`).join('; ')}`, basis: 'LTM heuristic for rescaling, not a benchmark of the client; to be calibrated by LTM\'s practice lead', confidence: 'Low', ifWrong: 'A category\'s range moves in proportion to its share; the client\'s own split by category replaces it' },
    { id: 'A-13', what: 'Planning rates', value: Object.entries(INDICATIVE_LIBRARY.findings).map(([, f]) => `${f.lever}: ${Math.round(f.rate[0] * 100)}% to ${Math.round(f.rate[1] * 100)}% of its category`).join('; '), basis: 'LTM heuristic: no public source gives a savings range for these levers (searched 3 Nov 2026); to be calibrated by LTM\'s practice lead against delivered work', confidence: 'Low', ifWrong: 'Each range scales with its rate; the evidence each finding lists replaces the rate with a measured figure' },
    { id: 'A-14', what: 'Overlap, band and timing', value: 'Findings in one category overlap, so a category counts once, at its largest range. Money is the share times both ends of the spend band as it was shown to the client. Ranges are the annual run rate once delivered, before the cost to deliver and before phasing', basis: 'Design rule', confidence: 'High', ifWrong: 'Adding overlapping findings would count the same spend twice' }
  );
  if (c.i.currency && !['USD', 'AED', 'SAR', 'OTHER'].includes(c.i.currency)) {
    const a = bands.assumptions[0];
    list.push({ id: 'A-07', what: 'Currency conversion of size bands', value: a.value, basis: a.basis, confidence: a.confidence.charAt(0).toUpperCase() + a.confidence.slice(1), ifWrong: a.ifWrong });
  }
  return { id: 'assumptions', title: 'Assumptions', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Every assumption behind the scores is listed, with its basis and what changes if it is wrong.'] },
    { kind: 'table', head: ['Assumption', 'Value', 'Basis', 'Confidence', 'If wrong'], widths: [90, '*', '*', 55, '*'], small: true, rows: [...list].sort((x, y) => x.id.localeCompare(y.id)).map(a => [[ref(a.id + '  '), strong(a.what)], [quoted(a.value)], [quoted(a.basis)], [a.confidence], [quoted(a.ifWrong)]]) }
  ] };
}

function methodology(c: Ctx): ReportSection {
  return { id: 'methodology', title: 'Methodology', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Cost IQ asks about cost and value management across the whole technology estate, scores the answers on fixed ladders, and raises findings where named answers meet LTM\'s activation rules. Each cost finding is given an indicative range from LTM planning rates and the spend band; it is an estimate for planning, and a measured figure replaces it. The cloud line comes from FinOps IQ, which sizes from its own inputs. Each finding states the evidence that must be shown to measure it.'] },
    { kind: 'paragraph', segs: ['The ', count('dimensions.total', c.i.result.dimensions.length), ' dimensions are LTM\'s own constructs. Each has a closest published reference, named in the sources; none is a claim of alignment to, or endorsement by, the body that publishes it.'] },
    { kind: 'subheading', text: 'Limits' },
    { kind: 'list', items: [
      ['The assessment rests on answers the respondent gave. LTM has not audited them.'],
      ['A dimension fed by few questions is a weaker signal than one fed by many.'],
      ['Scores describe how well cost and value are managed. They are not a prediction of savings.'],
      ['Indicative ranges are LTM planning estimates, not benchmarks: no public source gives a savings range for these levers. LTM\'s practice lead calibrates them against delivered work.'],
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
      ...(REF.enabled ? [[[ref(`${REF.source} (${REF.url})`)], ['Published average of technology spend as a share of revenue; a cross-industry reference, not a peer benchmark'], [ref(REF.year)]] as Seg[][]] : []),
      ...(c.client ? [] : playbookSources(c)),
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

/** The engine result with its catalogue wording in British spelling (L2); ids, scores and counts are untouched. */
function britishResult(r: CostIqResult): CostIqResult {
  return {
    ...r,
    dimensions: r.dimensions.map(d => ({ ...d, name: uk(d.name), definition: uk(d.definition) })),
    findings: r.findings.map(f => ({ ...f, title: uk(f.title), description: uk(f.description), dimension: uk(f.dimension) })),
    recommendations: r.recommendations.map(x => ({ ...x, title: uk(x.title), description: uk(x.description), ltmService: uk(x.ltmService) })),
    opportunities: r.opportunities.map(o => ({ ...o, economic: { ...o.economic, missingEvidence: o.economic.missingEvidence?.map(uk) }, practical: { ...o.practical, missingFactors: o.practical.missingFactors?.map(uk) } }))
  };
}

export function costIqReport(rawInput: CostIqReportInput, opts: CostIqReportOptions): ReportDocument {
  const input: CostIqReportInput = { ...rawInput, result: britishResult(rawInput.result) };
  const client = opts.view === 'client';
  const c: Ctx = { i: input, client, opts, scored: input.result.dimensions.filter(d => d.score != null), findings: byClientPriority(input.result), ind: indicativeFor(input) };
  const doc: ReportDocument = {
    meta: {
      platform: PLATFORM, product: PRODUCT, title: 'Technology cost and value diagnostic report',
      subtitle: 'How well cost and value are managed across the technology estate, where to look first, and the evidence needed before any saving is sized',
      client: opts.client, preparedBy: opts.preparedBy, dataProvidedBy: opts.dataProvidedBy, date: input.assessmentDate,
      version: client ? `Cost IQ methodology ${(config as any).manifest.masterVersion}` : `Cost IQ ${(config as any).manifest.masterVersion} · release ${(config as any).manifest.releaseId}`, view: opts.view,
      footer: `${PLATFORM} · ${PRODUCT} · Confidential`,
      status: 'Indicative assessment from self-reported answers. Not a savings commitment.'
    },
    sections: [summary(c), ...(valueSection(c) ? [valueSection(c)!] : []), ...(yourView(c) ? [yourView(c)!] : []), ...(narrativeSection(c) ? [narrativeSection(c)!] : []), profile(c), scores(c), findingsSection(c), cloudSection(c), ...(leversSection(c) ? [leversSection(c)!] : []), roadmap(c), help(c), ...(client ? [] : [execution(c)]), calculation(c), assumptions(c), methodology(c), sources(c), ...(client ? [] : [sow(c), consultant(c)])]
  };
  // Last pass: every string in the sections in British spelling, the client's own name aside (L2).
  const name = opts.client.trim();
  const protect = (t: string) => (name.length >= 2 ? t.split(name).map(uk).join(name) : uk(t));
  return { ...doc, sections: JSON.parse(JSON.stringify(doc.sections), (_k, v) => (typeof v === 'string' ? protect(v) : v)) };
}

/** The backlog CSV: one row per finding, with the evidence it needs and the service that follows. */
export function costIqBacklog(input: CostIqReportInput, view: 'client' | 'consultant'): Backlog {
  const opp = new Map(input.result.opportunities.map(o => [o.findingId, o]));
  const rec = new Map(input.result.recommendations.map(r => [r.id, r]));
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const header = [...(view === 'consultant' ? ['Finding ID'] : []), 'Finding number', 'Finding', 'Dimension', 'Severity', 'Why it matters', 'Evidence needed before sizing', 'Recommended step', 'LTM service', 'Offering type', 'Indicative low a year', 'Indicative high a year', 'Indicative currency', 'Status'];
  const ind = indicativeFor(input);
  const rows = orderedFindings(byClientPriority(input.result)).map((f, k) => {
    const r = rec.get(f.recommendationIds[0]);
    return [...(view === 'consultant' ? [f.id] : []), k + 1, f.title, f.dimension, SEVERITY[f.severity] ?? f.severity, f.description, (opp.get(f.id)?.economic.missingEvidence ?? []).join('; '), r?.title ?? '', (r && pkg({ i: input, findings: input.result.findings } as Ctx, r.id)?.offeringName) || r?.ltmService || '', r && PACKAGES.get(r.id) ? TYPE_LABEL[PACKAGES.get(r.id)!.offeringType] : 'Not mapped', ...((l => [l?.low ?? '', l?.high ?? '', l && (l.low != null || l.high != null) ? ind.currency : ''])(ind.lines.find(x => x.findingId === f.id))), 'Open'];
  });
  return { header, rows };
}
