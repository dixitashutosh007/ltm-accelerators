/**
 * FinOps IQ report (execution phase M4; plan F7, WS-S4): the engine result as a ReportDocument for the PDF, and the
 * backlog CSV, both built on the server from the stored result. Every number is a traced segment (report/model.ts):
 * an engine field, or a report figure derived from engine fields (roadmap start, end, effort and value; the
 * sensitivity swings), so the test can resolve each one against the result (area 13(a)). Screen = PDF = backlog.
 *
 * The roadmap groups findings into the workstreams of registry/workstreams.json (CLM-FIN-177): a lever finding by its
 * lever, every other finding by its capability. Effort is the value model's lever effort, plus a per-level heuristic
 * for gap findings without a quantified lever (ASM-FIN-086, CLM-FIN-178). How LTM can help and the platform
 * playbook (F8, F9) are added in M5.
 */
import workstreamRegistry from '../registry/workstreams.json' with { type: 'json' };
import assumptionRegister from '../registry/assumptions.json' with { type: 'json' };
import marketData from '../registry/market-data.json' with { type: 'json' };
import claimsRegister from '../../../claims/claims-register.json' with { type: 'json' };
import { evaluateFinOpsIqV3, type Finding, type FinOpsIqV3Input, type FinOpsIqV3Result, type Level } from './evaluate';
import { inputInfo, resolveField, type Figure, type LeverValue } from './value-model';
import { clientView } from './client-view';
import { NOTICES } from './public-schema';
import { OFFERINGS } from './execution';
import { sowDraft } from '../../../offerings/catalogue';
import questionBank from './question-bank.json' with { type: 'json' };
import leverLibrary from '../registry/levers.json' with { type: 'json' };
import { figure, traced, walkSegments, type Backlog, type Block, type ReportDocument, type ReportSection, type Seg, type Trace } from '../../../report/model';

const WS: any = workstreamRegistry;
const ASM: any[] = (assumptionRegister as any).assumptions;
const BASIS_LABEL: Record<string, string> = (assumptionRegister as any).basisValues;
const CLAIM = new Map<string, any>((claimsRegister as any).claims.map((c: any) => [c.id, c]));
const CASES = ['conservative', 'expected', 'upper'] as const;
const LEVEL_LABEL: Record<Level, string> = { not_yet: 'Not yet', crawl: 'Crawl', walk: 'Walk', run: 'Run' };
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'FinOps IQ';

/** Factors applied to an exact value input for the sensitivity table (a band input uses its own corners). */
export const SENSITIVITY_FACTORS = { low: 0.8, high: 1.2 } as const;

export interface ReportOptions {
  client: string;
  preparedBy: string;
  dataProvidedBy: string;
  view: 'client' | 'consultant';
  /** The scoring request the result came from; needed for the sensitivity table, which re-runs the engine. */
  input?: FinOpsIqV3Input;
}

/* --------------------------------- Helpers ---------------------------------- */

const uniq = <T>(a: T[]) => [...new Set(a.filter(Boolean))];
const ref = (text: string): Seg => ({ text, ref: true });
const cite = (text: string, ids: string[]): Seg => ({ text, cite: uniq(ids) });
const strong = (text: string): Seg => ({ text, strong: true });
const findingClaims = (f: Finding) => uniq(f.basis.map(b => b.claimId!).filter(Boolean));
const bySeverity = (a: Finding, b: Finding) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
/** The need verdict's basis without its question count, which section 7 states once for the whole report. */
const withoutCount = (line: string) => { const t = line.replace(/^Based on \d+ of \d+ questions answered;\s*/, ''); return t[0].toUpperCase() + t.slice(1); };
/** Items run together after a semicolon: "An executive sponsor; agreement on who decides" (acronyms keep their case). */
const joinItems = (items: string[]) => items.map((x, i) => (i && /^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x)).join('; ');

const PROVIDER_NAME: Record<string, string> = { aws: 'AWS', azure: 'Azure', gcp: 'Google Cloud', oci: 'OCI', ibm: 'IBM Cloud', alibaba: 'Alibaba Cloud', other_public: 'other public cloud' };
const providerName = (p: string) => PROVIDER_NAME[p] ?? p;
const listOf = (a: string[]) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/** The client's estate: from the request when the report has it, otherwise from the scopes its findings name. */
export interface Estate { scopes: string[]; providers: string[] }
export function estateOf(r: FinOpsIqV3Result, input?: FinOpsIqV3Input): Estate {
  if (input?.facts?.footprint) return { scopes: [...input.facts.footprint.scopes], providers: [...input.facts.footprint.publicCloudProviders] };
  const all = r.findings.flatMap(f => f.scopes);
  return { scopes: uniq(all.map(x => x.split(':')[0])), providers: uniq(all.filter(x => x.startsWith('public_cloud:')).map(x => x.split(':')[1])) };
}

/** A registry item (activity, KPI, prerequisite, risk): plain text, or text shown only for some scopes or capabilities. */
type Item = string | { text?: string; name?: string; scopes?: string[]; capabilities?: string[] };
const applies = (i: Item, scopes: string[], caps: Set<string>) =>
  typeof i === 'string' || ((!i.scopes || i.scopes.some(x => scopes.includes(x))) && (!i.capabilities || i.capabilities.some(x => caps.has(x))));
const itemText = (i: Item) => (typeof i === 'string' ? i : (i.text ?? i.name ?? ''));

/** A Figure as a traced segment; `ratio` figures (rates, factors) are shown as shares. */
const fig = (f: Figure, currency: string): Seg => figure(f, currency, f.unit === 'ratio' ? 'share' : undefined);

/** Gross run-rate of the levers a finding owns (value sits on the lever, counted once). */
const ownedLevers = (f: Finding, r: FinOpsIqV3Result): LeverValue[] =>
  (f.value?.leverIds ?? []).map(id => r.value.levers.find(l => l.id === id)!).filter(Boolean);

/* --------------------------------- Roadmap ---------------------------------- */

export interface FindingEffort { fteMonths: number; leverFields: string[]; gapField: string | null; perLevel: number }

/**
 * A finding's effort: the value model's effort for the headline levers it owns, or, for a capability gap without
 * one, the gap times the per-level heuristic for the tier (ASM-FIN-086). Decisions and scope confirmations carry none.
 */
export function findingEffort(f: Finding, r: FinOpsIqV3Result): FindingEffort {
  const perLevel = Number(WS.effort.fteMonthsPerLevelByTier[String(r.tier.tier)]);
  const levers = ownedLevers(f, r).filter(l => l.inHeadline && l.effortFteMonths);
  const leverMonths = levers.reduce((t, l) => t + l.effortFteMonths!.value, 0);
  if (leverMonths > 0) return { fteMonths: leverMonths, leverFields: levers.map(l => l.effortFteMonths!.field), gapField: null, perLevel };
  if (f.type === 'capability_gap' && (f.gap ?? 0) > 0) return { fteMonths: f.gap! * perLevel, leverFields: [], gapField: `findings[${f.id}].gap`, perLevel };
  return { fteMonths: 0, leverFields: [], gapField: null, perLevel };
}

export const effortBand = (fteMonths: number): string =>
  (WS.effort.bands as Array<{ maxFteMonths?: number; label: string }>).find(b => b.maxFteMonths === undefined || fteMonths <= b.maxFteMonths)!.label;

export interface RoadmapWorkstream {
  id: string; name: string; objective: string; activities: string[];
  kpis: Array<{ name: string; claimIds: string[] }>; prerequisites: string[]; risks: string[];
  findings: Finding[];
  /** Earliest finding start, latest finding completion (start + target duration), in months from the start. */
  start: number; end: number;
  /** One per finding, or one per maturity level for a capability gap (its levelMilestones), in month order. */
  milestones: Array<{ finding: Finding; month: number; level?: Level }>;
  effort: { fteMonths: number; band: string; leverFields: string[]; gapFields: string[]; perLevel: number };
  /** Expected gross run-rate of the levers its findings own; null when none is quantified or money is not shown. */
  value: { expected: number; fields: string[] } | null;
  owners: string[];
  dependsOn: string[];
}

const workstreamOf = (f: Finding): string | undefined => {
  const all: any[] = WS.workstreams;
  if (f.type === 'lever_opportunity' && f.leverIds.length === 1) {
    const byLever = all.find(w => w.levers.includes(f.leverIds[0]));
    if (byLever) return byLever.id;
  }
  return all.find(w => w.capabilities.includes(f.capability))?.id;
};

/** The delivery-grade roadmap (F7 item 3): workstreams that have at least one finding, in start order. */
export function finopsIqRoadmap(r: FinOpsIqV3Result, estate: Estate = estateOf(r)): RoadmapWorkstream[] {
  const home = new Map(r.findings.map(f => [f.id, workstreamOf(f)]));
  const out: RoadmapWorkstream[] = [];
  for (const w of WS.workstreams as any[]) {
    const findings = r.findings.filter(f => home.get(f.id) === w.id).sort((a, b) => a.start.month - b.start.month || bySeverity(a, b));
    if (!findings.length) continue;
    const milestones = findings.flatMap(f => (f.levelMilestones
      ? (Object.entries(f.levelMilestones) as Array<[Level, number]>).map(([level, month]) => ({ finding: f, month, level }))
      : [{ finding: f, month: f.start.month + f.targetDuration.months }])).sort((a, b) => a.month - b.month);
    const efforts = findings.map(f => findingEffort(f, r));
    const fteMonths = efforts.reduce((t, e) => t + e.fteMonths, 0);
    const valued = r.value.moneyShown ? findings.filter(f => f.value) : [];
    // Only what applies: items tagged with scopes the client does not have, or capabilities no finding here names, are left out.
    const caps = new Set(findings.map(f => f.capability));
    const pick = (items: Item[]) => items.filter(i => applies(i, estate.scopes, caps));
    const renamed = w.nameWithoutScopes && !w.nameWithoutScopes.scopes.some((x: string) => estate.scopes.includes(x));
    out.push({
      id: w.id, name: renamed ? w.nameWithoutScopes.name : w.name, objective: renamed ? w.nameWithoutScopes.objective : w.objective,
      activities: pick(w.activities).map(itemText), kpis: pick(w.kpis).map((k: any) => ({ name: k.name, claimIds: k.claimIds })),
      prerequisites: pick(w.prerequisites).map(itemText), risks: pick(w.risks).map(itemText),
      findings,
      start: Math.min(...findings.map(f => f.start.month)),
      end: Math.max(...milestones.map(m => m.month)),
      milestones,
      effort: { fteMonths, band: effortBand(fteMonths), leverFields: efforts.flatMap(e => e.leverFields), gapFields: efforts.map(e => e.gapField!).filter(Boolean), perLevel: efforts[0].perLevel },
      value: valued.length ? { expected: valued.reduce((t, f) => t + f.value!.expected.value, 0), fields: valued.map(f => f.value!.expected.field) } : null,
      owners: uniq([...findings].sort(bySeverity).map(f => f.ownerLabel)),
      dependsOn: uniq(findings.flatMap(f => f.dependsOn.map(d => home.get(d)!)).filter(id => id && id !== w.id))
    });
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

/* ------------------------------- Sensitivity -------------------------------- */

export interface SensitivityRow {
  fact: string; label: string; kind: 'exact' | 'band';
  lowInput: number; highInput: number;
  base: number; low: number; high: number; swing: number;
  assumptionIds: string[]; claimIds: string[];
}

const getPath = (o: any, path: string) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o: any, path: string, value: unknown) {
  const keys = path.split('.');
  let x = o;
  for (const k of keys.slice(0, -1)) x = x[k] ??= {};
  x[keys[keys.length - 1]] = value;
}

/**
 * The three client inputs the expected net run-rate is most sensitive to (F7 item 2). Each exact input is moved by
 * SENSITIVITY_FACTORS (shares kept within 0 to 1), each band to its own corners, and the engine is run again.
 */
export function finopsIqSensitivity(input: FinOpsIqV3Input, r: FinOpsIqV3Result, top = 3): SensitivityRow[] {
  if (!r.value.moneyShown || !r.value.totals) return [];
  const base = r.value.totals.expected.netRunRate.value;
  const candidates = new Map<string, { assumptionIds: string[]; claimIds: string[] }>();
  for (const l of r.value.levers.filter(x => x.inHeadline)) {
    for (const i of l.inputs.filter(x => x.kind === 'exact' || x.kind === 'band')) {
      const c = candidates.get(i.fact) ?? { assumptionIds: [], claimIds: [] };
      candidates.set(i.fact, { assumptionIds: uniq([...c.assumptionIds, ...i.value.assumptionIds]), claimIds: uniq([...c.claimIds, ...i.value.claimIds]) });
    }
  }
  const rows: SensitivityRow[] = [];
  for (const [fact, ids] of candidates) {
    const given = getPath(input.facts, fact);
    if (!given || typeof given !== 'object') continue;
    const isShare = !fact.startsWith('spend.') && !/Spend$/.test(fact);
    let kind: 'exact' | 'band', lo: number, hi: number;
    if (typeof given.exact === 'number') {
      kind = 'exact';
      lo = given.exact * SENSITIVITY_FACTORS.low;
      hi = isShare ? Math.min(1, given.exact * SENSITIVITY_FACTORS.high) : given.exact * SENSITIVITY_FACTORS.high;
    } else if (Array.isArray(given.band)) {
      kind = 'band'; [lo, hi] = given.band;
    } else continue;
    const run = (v: number) => {
      const facts = structuredClone(input.facts);
      setPath(facts, fact, { exact: v });
      return evaluateFinOpsIqV3({ ...input, facts, assessmentDate: r.assessmentDate ?? input.assessmentDate }).value.totals?.expected.netRunRate.value ?? 0;
    };
    const low = run(lo), high = run(hi);
    rows.push({ fact, label: inputInfo(fact).label, kind, lowInput: lo, highInput: hi, base, low, high, swing: Math.abs(high - low), ...ids });
  }
  return rows.filter(x => x.swing > 0).sort((a, b) => b.swing - a.swing || a.fact.localeCompare(b.fact)).slice(0, top);
}

/* --------------------------------- Backlog ---------------------------------- */

export const BACKLOG_HEADER = [
  'Finding ID', 'Workstream', 'Severity', 'Capability', 'Lever', 'Platform', 'Current level', 'Target level', 'Action',
  'Verification', 'Owner role', 'Start month', 'Duration (months)', 'Effort (FTE-months)', 'Expected value per year (gross)',
  'Currency', 'Claim IDs', 'Assumption IDs', 'Platform level', 'Options', 'Effort band'
];

/**
 * Backlog CSV rows (F7 item 4): one per finding action, and one per lever action on a finding. Effort and value
 * come from the same engine fields as the PDF. The platform playbook adds rows per platform action in M5.
 */
export function finopsIqBacklog(result: FinOpsIqV3Result, view: 'client' | 'consultant' = 'consultant'): Backlog {
  const r = view === 'client' ? (clientView(result) as unknown as FinOpsIqV3Result) : result;
  const names = new Map<string, string>((WS.workstreams as any[]).map(w => [w.id, w.name]));
  const cap = new Map(r.capabilities.map(c => [c.capability, c.displayName]));
  const cur = r.value.currency;
  const rows: Backlog['rows'] = [];
  for (const f of [...r.findings].sort((a, b) => a.start.month - b.start.month || bySeverity(a, b))) {
    const e = findingEffort(f, r);
    const common = [names.get(workstreamOf(f) ?? '') ?? '', f.severity, cap.get(f.capability) ?? f.capability];
    const current = f.current ? (LEVEL_LABEL[f.current as Level] ?? r.capabilities.find(c => c.capability === f.capability)?.ratingLabel ?? '') : '';
    rows.push([
      f.id, ...common, f.leverIds.join(' '), f.scopes.join(' '), current, f.target ? LEVEL_LABEL[f.target] : '', f.decisionOrAction,
      f.evidenceToConfirm, f.ownerLabel, f.start.month, f.targetDuration.months, e.fteMonths,
      r.value.moneyShown && f.value ? f.value.expected.value : '', cur, findingClaims(f).join(' '), uniq(f.value?.expected.assumptionIds ?? []).join(' '), '', '', ''
    ]);
    for (const a of f.leverActions) {
      const l = r.value.levers.find(x => x.id === a.leverId);
      const valued = r.value.moneyShown && l?.cases && f.value?.leverIds.includes(a.leverId);
      rows.push([
        f.id, ...common, a.leverId, f.scopes.join(' '), '', '', a.action, a.evidence, f.ownerLabel, f.start.month, f.targetDuration.months,
        l?.inHeadline && l.effortFteMonths ? l.effortFteMonths.value : '', valued ? l!.cases!.expected.runRate.value : '', cur,
        uniq(a.claimIds).join(' '), valued ? uniq(l!.cases!.expected.runRate.assumptionIds).join(' ') : '', '', '', ''
      ]);
    }
    // One row per platform action from the playbook (F7 item 4, F8), on the finding's schedule.
    for (const t of (r.technicalPlan?.actions ?? []).filter(x => x.findingId === f.id && !x.noPlatformAction)) {
      rows.push([
        f.id, ...common, t.control.startsWith('FIN.LEV-') ? t.control.slice(4) : '', t.platform, '', '', `${t.action} ${t.approach}`, t.verification, t.ownerRole,
        f.start.month, f.targetDuration.months, '', '', cur, uniq(t.claimIds).join(' '), '', t.level, t.options.map(o => o.name).join('; '), t.effort
      ]);
    }
  }
  return { header: BACKLOG_HEADER, rows };
}

/* --------------------------------- Sections --------------------------------- */

interface Ctx { r: FinOpsIqV3Result; cur: string; client: boolean; opts: ReportOptions; estate: Estate; roadmap: RoadmapWorkstream[]; sensitivity: SensitivityRow[] }

const capName = (c: Ctx, id: string) => c.r.capabilities.find(x => x.capability === id)?.displayName ?? id;
/** A finding named in plain words: its capability for a gap, otherwise its title. */
const dependencyName = (c: Ctx, id: string) => {
  const f = c.r.findings.find(x => x.id === id);
  return !f ? id : f.type === 'capability_gap' ? capName(c, f.capability) : f.title;
};
const month = (field: string, value: number, claimIds: string[]): Seg => traced(field, value, 'count', claimIds);
const findingStart = (f: Finding) => month(`findings[${f.id}].start.month`, f.start.month, findingClaims(f));
const findingDuration = (f: Finding) => traced(`findings[${f.id}].targetDuration.months`, f.targetDuration.months, 'months', findingClaims(f));

function derivedSeg(field: string, value: number, unit: Trace['unit'], derived: NonNullable<Trace['derived']>, claimIds: string[], assumptionIds: string[], c: Ctx, text?: string): Seg {
  const s = traced(field, value, unit, claimIds, assumptionIds, c.cur) as Exclude<Seg, string>;
  return { ...s, text: text ?? s.text, trace: { ...s.trace!, derived } };
}

function executiveSummary(c: Ctx): ReportSection {
  const { r, cur } = c;
  const blocks: Block[] = [];
  const h = r.headline;
  blocks.push({ kind: 'subheading', text: 'Situation' });
  blocks.push({ kind: 'paragraph', style: 'lead', segs: [
    `${c.opts.client} was assessed in ${r.mode === 'executive' ? 'executive' : 'workshop'} mode as a `,
    traced('tier.tier', r.tier.tier, 'tier', r.tier.claimIds), ' estate (LTM complexity tier)',
    ...(r.value.spend ? [', with in-scope public cloud spend of ', fig(r.value.spend.P, cur), ...(r.value.spend.banded && r.value.spend.low && r.value.spend.high ? [' (band ', fig(r.value.spend.low, cur), ' to ', fig(r.value.spend.high, cur), ')'] : [])] : []),
    ...(c.estate.providers.length ? [` on ${listOf(c.estate.providers.map(providerName))}`] : []), '. ',
    traced('headline.atOrAboveTarget', h.atOrAboveTarget, 'count', h.claimIds), ' of ', traced('headline.inScope', h.inScope, 'count', h.claimIds),
    ' in-scope capabilities are at or above LTM\'s default target for the tier.'
  ] });
  blocks.push({ kind: 'subheading', text: 'Issue' });
  if (r.needVerdict) {
    const nv = r.needVerdict;
    blocks.push({ kind: 'paragraph', segs: [strong(`${nv.bandLabel}. `), 'Need index ', traced('needVerdict.needIndex', nv.needIndex, 'index', nv.claimIds), ' on a scale to ',
      { text: '100', ref: true }, ': how urgently to act, not a maturity score. Confidence ', nv.confidence.toLowerCase(), '. ', cite(sentence(withoutCount(nv.basisLine)), nv.claimIds)] });
  }
  const top = (r.topFindingIds.length ? r.topFindingIds : r.findings.map(f => f.id)).map(id => r.findings.find(f => f.id === id)!).filter(Boolean).slice(0, 5);
  if (top.length) {
    blocks.push({ kind: 'paragraph', segs: ['The most important findings:'] });
    blocks.push({ kind: 'list', items: top.map(f => [strong(`${f.severity}: `), cite(f.title, findingClaims(f))]) });
  } else blocks.push({ kind: 'paragraph', segs: ['No capability is below its target for this estate.'] });
  blocks.push({ kind: 'subheading', text: 'Recommendation' });
  if (top.length) {
    blocks.push({ kind: 'list', items: top.slice(0, 3).map(f => [cite(sentence(f.decisionOrAction), findingClaims(f)), ` Owner: ${f.ownerLabel}; from month `, findingStart(f), '.']) });
  }
  blocks.push({ kind: 'subheading', text: 'Value' });
  blocks.push(...valueHeadline(c));
  if (r.value.moneyShown && r.value.totals) {
    const t = r.value.totals;
    blocks.push({ kind: 'paragraph', style: 'small', segs: [
      'Net over three years ranges from ', fig(t.conservative.net3Year, cur), ' (conservative) to ', fig(t.upper.net3Year, cur),
      ' (upper). In the conservative case the first year is ', fig(t.conservative.netYear1, cur), '. Value confidence: ',
      cite(r.value.confidence.reason, r.value.confidence.claimIds), '. ', cite(r.value.detail, r.value.claimIds)
    ] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: notNetted(c) });
  }
  return { id: 'summary', title: 'Executive summary', blocks };
}

/**
 * What "net" leaves out (CIO challenge Q2): the roadmap's capability-building effort (gap findings without a quantified
 * lever, ASM-FIN-086) and the FinOps team, both shown for the client's decision.
 */
function notNetted(c: Ctx): Seg[] {
  const { r, cur } = c;
  const gapFields = c.roadmap.flatMap(w => w.effort.gapFields);
  const perLevel = c.roadmap[0]?.effort.perLevel ?? 0;
  const months = gapFields.reduce((t, f) => t + (resolveTraceField(r, f) ?? 0), 0) * perLevel;
  const team = r.value.finopsTeam;
  return [
    'Not netted, and shown for your decision: ',
    ...(months > 0 ? ['capability-building effort in the roadmap of ', derivedSeg('report:notNetted.capabilityEffort', months, 'fte_months',
      { op: 'effort', of: gapFields, detail: { perLevel, gapFields } }, WS.effort.claimIds, [WS.effort.assumptionId], c), ', beyond the lever effort above'] : ['no capability-building effort beyond the levers']),
    // The FinOps team is always accounted for: its cost, or why it is not shown (M4 re-test, lead note).
    ...(team.shown && team.fte && team.annualCost ? ['; an accountable FinOps lead or team of ', fig(team.fte, cur), ', about ', fig(team.annualCost, cur), ' a year']
      : team.fte ? ['; an accountable FinOps lead or team of ', fig(team.fte, cur), ', ', cite('not costed without your internal cost rate', team.claimIds)]
      : ['; ', cite('no FinOps team cost, as your answers show an accountable owner for cloud spend already', team.claimIds)]),
    '.'
  ];
}

/** The value headline: KPIs when a money figure is shown, otherwise the reason it is not. */
function valueHeadline(c: Ctx): Block[] {
  const v = c.r.value;
  if (!v.moneyShown || !v.totals) {
    return [{ kind: 'callout', tone: 'info', title: v.label, segs: [cite(v.notice ?? 'No money figure is shown until the inputs it needs are given.', v.claimIds)] }];
  }
  const e = v.totals.expected;
  return [
    { kind: 'kpis', items: [
      { label: 'Expected net per year at full run-rate', value: [fig(e.netRunRate, c.cur)] },
      { label: 'Expected net in the first year', value: [fig(e.netYear1, c.cur)] },
      { label: 'Expected net over three years', value: [fig(e.net3Year, c.cur)] }
    ] },
    { kind: 'callout', tone: 'warn', segs: [strong(v.label)] }
  ];
}

const STATUS_TEXT = (cp: FinOpsIqV3Result['capabilities'][number]) =>
  !cp.target.level ? 'No target at this tier' : cp.atOrAboveTarget ? 'At or above target' : cp.gap != null && cp.gap > 0 ? 'Below target' : '—';

function capabilityProfile(c: Ctx): ReportSection {
  const { r } = c;
  // As on the screen: capabilities assessed only in the workshop are named in a note, not listed as rows.
  const inScope = r.capabilities.filter(x => x.rating !== 'not_in_scope' && x.rating !== 'not_assessed');
  const workshopOnly = r.capabilities.filter(x => x.rating === 'not_assessed');
  const rows: Seg[][][] = inScope.map(cp => [
    [cp.displayName],
    [cp.ratingLabel + (cp.unconfirmed && cp.ratingLabel !== 'Not answered' ? ' (unconfirmed)' : '')],
    [cp.target.level ? LEVEL_LABEL[cp.target.level] + (cp.target.source === 'consultant_override' ? ' (set by the consultant)' : '') : '—'],
    cp.gap != null && cp.gap > 0 ? [traced(`capabilities[${cp.capability}].gap`, cp.gap, 'level', cp.claimIds)] : ['—'],
    [STATUS_TEXT(cp)]
  ]);
  const outOfScope = r.capabilities.filter(x => x.rating === 'not_in_scope');
  return {
    id: 'profile', title: 'Capability profile',
    blocks: [
      { kind: 'paragraph', segs: ['Each capability of the FinOps Framework in scope is rated against the default target for a ',
        traced('tier.tier', r.tier.tier, 'tier', r.tier.claimIds), ' estate. There is no overall score or stage: targets differ by estate, so a score would not compare across organisations.'] },
      { kind: 'table', head: ['Capability', 'Today', 'Target', 'Gap', 'Status'], rows, widths: ['*', 80, 90, 45, 90] },
      ...(workshopOnly.length ? [{ kind: 'paragraph', style: 'note', segs: [`Assessed in the workshop: ${workshopOnly.map(x => x.displayName).join(', ')}.`] } as Block] : []),
      ...(outOfScope.length ? [{ kind: 'paragraph', style: 'note', segs: [`Not in scope for this estate: ${outOfScope.map(x => x.displayName).join(', ')}.`] } as Block] : [])
    ]
  };
}

function findingsSection(c: Ctx): ReportSection {
  const { r, cur } = c;
  const all = [...r.findings].sort((a, b) => bySeverity(a, b) || a.start.month - b.start.month);
  const money = c.r.value.moneyShown;
  const rows: Seg[][][] = all.map(f => [
    [f.severity], [cite(f.title, findingClaims(f))], [f.ownerLabel], ['Month ', findingStart(f)], [findingDuration(f)],
    money && f.value ? [fig(f.value.expected, cur)] : ['—']
  ]);
  const blocks: Block[] = [
    { kind: 'paragraph', segs: ['Findings come from capability gaps, value levers and facts that need confirming. Value is the expected gross run-rate of the levers a finding owns; each lever is counted once.'] },
    { kind: 'table', head: ['Severity', 'Finding', 'Owner', 'Start', 'Duration', 'Expected value per year'], rows, widths: [50, '*', 95, 50, 55, 70], small: true }
  ];
  for (const f of all) {
    const ids = findingClaims(f);
    blocks.push({ kind: 'subheading', text: `${f.severity} · ${f.title}` });
    blocks.push({ kind: 'paragraph', segs: [strong('Why it matters. '), cite(sentence(f.businessConsequence), ids)] });
    blocks.push({ kind: 'paragraph', segs: [strong('What to do. '), cite(sentence(f.decisionOrAction), ids)] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [
      strong('Owner: '), f.ownerLabel, '. ', strong('Start: '), 'month ', findingStart(f), '; ', cite(f.targetDuration.label.toLowerCase(), ids), '.',
      ...(f.dependsOn.length ? [' ', strong('After the first milestone of: '), f.dependsOn.map(d => dependencyName(c, d)).join('; '), '.'] : []),
      ...(f.notAnsweredCount ? [' Questions left unanswered: ', traced(`findings[${f.id}].notAnsweredCount`, f.notAnsweredCount, 'count', ids), '.'] : [])
    ] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Evidence to confirm. '), cite(sentence(f.evidenceToConfirm), ids)] });
    if (f.leverActions.length) {
      blocks.push({ kind: 'list', small: true, items: f.leverActions.map(a => [strong(`${a.title}: `), cite(sentence(a.action), a.claimIds), ' ', { text: sentence(a.evidence), cite: a.claimIds, italic: true }]) });
    }
  }
  return { id: 'findings', title: 'Findings', blocks };
}

function valueSection(c: Ctx): ReportSection {
  const { r, cur } = c;
  const v = r.value;
  const blocks: Block[] = [{ kind: 'paragraph', segs: [strong(v.label + '. '), cite(v.detail, v.claimIds)] }];
  if (v.spend) {
    blocks.push({ kind: 'paragraph', segs: ['In-scope public cloud spend: ', fig(v.spend.P, cur),
      ...(v.spend.banded && v.spend.low && v.spend.high ? [' (band ', fig(v.spend.low, cur), ' to ', fig(v.spend.high, cur), ')'] : []), '. ', cite(v.spend.statement, v.spend.claimIds)] });
  }
  if (!v.moneyShown || !v.totals) {
    blocks.push(...valueHeadline(c));
  } else {
    const t = v.totals;
    const row = (label: string, pick: (x: typeof t.expected) => Figure | null): Seg[][] => [[label], ...CASES.map(k => { const f = pick(t[k]); return f ? [fig(f, cur)] : ['—']; })];
    blocks.push({ kind: 'subheading', text: 'Totals by case' });
    blocks.push({ kind: 'table', head: ['', 'Conservative', 'Expected', 'Upper'], widths: ['*', 85, 85, 85], rows: [
      row('Gross per year at full run-rate', x => x.grossRunRate),
      row('Public cloud levers, % of in-scope public cloud spend', x => x.pctOfP),
      row('One-off internal effort', x => x.oneOffCost),
      row('Annual running cost (levers and tooling)', x => x.annualRunCost),
      row('Net in the first year', x => x.netYear1), row('Net in the second year', x => x.netYear2), row('Net in the third year', x => x.netYear3),
      row('Net per year at full run-rate', x => x.netRunRate),
      row('Net over three years', x => x.net3Year)
    ] });
    if (t.expected.saasLicensing) {
      const s = t.expected.saasLicensing;
      blocks.push({ kind: 'paragraph', style: 'small', segs: ['SaaS and licensing are counted on their own base: expected ', fig(s.runRate, cur), ' per year',
        ...(s.base ? [' against ', fig(s.base, cur), ` of ${s.baseLabel[0].toLowerCase()}${s.baseLabel.slice(1)}`] : []), ...(s.pctOfBase ? [' (', fig(s.pctOfBase, cur), ')'] : []), '.'] });
    }
    blocks.push({ kind: 'paragraph', style: 'small', segs: [cite(sentence(v.globalCap.statement), v.globalCap.claimIds),
      ...(t.expected.capBinding ? [' The cap binds in the expected case: levers are scaled to ', fig(t.expected.cap, cur), '.'] : [])] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [cite(v.headlineRule, v.claimIds)] });

    const q = v.levers.filter(l => l.status === 'quantified' && l.cases);
    blocks.push({ kind: 'subheading', text: 'Levers' });
    blocks.push({ kind: 'table', small: true, head: ['Lever', 'Base (expected)', 'Maximum rate', 'Conservative', 'Expected', 'Upper', 'Confidence'],
      widths: ['*', 60, 50, 60, 60, 60, 50],
      rows: q.map(l => [
        [l.name, ...(c.client ? [] : [' ', ref(`(${l.id})`)]), ...(l.inHeadline ? [] : [' not in the headline'])],
        [fig(l.cases!.expected.base, cur)],
        // No base (for example coverage already meets steady usage): the rate would read 0%, so it is not shown.
        l.cases!.expected.base.value > 0 ? [fig(l.cases!.expected.rate, cur), ...(l.maxRate.length > 1 ? [' (blended)'] : [])] : ['no base'],
        ...CASES.map(k => [fig(l.cases![k].runRate, cur)]),
        [l.confidence ?? '—']
      ]) });
    blocks.push({ kind: 'paragraph', style: 'note', segs: [
      'Gross per year at full run-rate. The maximum rate is the published or arithmetic maximum, blended across providers by their share of the base where there is more than one (Appendix A gives each provider\'s rate); the expected case takes half of it and the conservative case a quarter.',
      ...(CASES.some(k => t[k].capBinding) ? [' The global cap binds in the ', CASES.filter(k => t[k].capBinding).join(' and '), ' case, so those figures are scaled down from base × rate (Appendix A shows each lever before the cap).'] : [])
    ] });
    for (const l of q.filter(x => x.exclusion)) {
      const x = l.exclusion!;
      blocks.push({ kind: 'paragraph', style: 'small', segs: [strong(`${l.name}: `), cite(sentence(x.statement), l.claimIds), ' Expected ', fig(x.expectedRunRate, cur),
        ' per year for a one-off effort of ', fig(x.oneOffCost, cur), '; net over three years at the margin ', fig(x.marginalNet3Year, cur), '.'] });
    }
    blocks.push({ kind: 'subheading', text: 'Costs' });
    blocks.push({ kind: 'list', small: true, items: [
      ...(v.costs.effortFteMonths ? [['Internal implementation effort for the levers: ', fig(v.costs.effortFteMonths, cur), ', at the internal cost rate you gave. This is the effort netted above.'] as Seg[]] : []),
      notNetted(c),
      [cite(v.costs.toolingNote, v.costs.claimIds)],
      [cite(v.costs.externalSupportNote, v.costs.claimIds)]
    ] });
  }
  if (v.finopsTeam.shown) {
    blocks.push({ kind: 'paragraph', style: 'small', segs: [cite(v.finopsTeam.statement, v.finopsTeam.claimIds),
      ...(v.finopsTeam.fte && v.finopsTeam.annualCost ? [' Indicative size ', fig(v.finopsTeam.fte, cur), ', about ', fig(v.finopsTeam.annualCost, cur), ' a year.'] : [])] });
  }
  if (v.notQuantified.length) {
    blocks.push({ kind: 'subheading', text: 'Identified, not quantified' });
    blocks.push({ kind: 'list', small: true, items: v.notQuantified.map(n => [strong(`${n.name}. `), cite(sentence(n.reasonText), n.claimIds), ' ', { text: `Would be quantified by: ${sentence(n.evidenceNeeded)}`, cite: n.claimIds, italic: true }]) });
  }
  if (v.hypothesis.answered) {
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Your own estimate. '), cite(v.hypothesis.statement, v.hypothesis.claimIds),
      ...v.hypothesis.explanations.flatMap(e => [' ', cite(e.text, v.hypothesis.claimIds)])] });
  }
  return { id: 'value', title: 'Indicative value', blocks };
}

function roadmapSection(c: Ctx): ReportSection {
  const claims = WS.claimIds as string[];
  const effortIds = { claimIds: WS.effort.claimIds as string[], assumptionIds: [WS.effort.assumptionId as string] };
  const blocks: Block[] = [{ kind: 'paragraph', segs: [
    'The findings grouped into delivery workstreams. Start and end are months from the start of the programme, from each finding\'s wave and dependencies. Effort is the value model\'s implementation effort for the levers in the workstream, plus a per-level estimate for capability gaps without a quantified lever; the band is S, M or L. Activities, KPIs, prerequisites and risks are LTM heuristics unless a source is cited.'
  ] }];
  const name = new Map(c.roadmap.map(w => [w.id, w.name]));
  const startSeg = (w: RoadmapWorkstream) => derivedSeg(`report:roadmap[${w.id}].start`, w.start, 'count', { op: 'min', of: w.findings.map(f => `findings[${f.id}].start.month`) }, claims, [], c);
  const milestoneField = (w: RoadmapWorkstream, m: RoadmapWorkstream['milestones'][number]) => (m.level ? `findings[${m.finding.id}].levelMilestones.${m.level}` : `report:roadmap[${w.id}].milestone[${m.finding.id}]`);
  const endSeg = (w: RoadmapWorkstream) => derivedSeg(`report:roadmap[${w.id}].end`, w.end, 'count', { op: 'max', of: w.milestones.map(m => milestoneField(w, m)) }, claims, [], c);
  const effortSeg = (w: RoadmapWorkstream) => derivedSeg(`report:roadmap[${w.id}].effort`, w.effort.fteMonths, 'fte_months',
    { op: 'effort', of: [...w.effort.leverFields, ...w.effort.gapFields], detail: { perLevel: w.effort.perLevel, gapFields: w.effort.gapFields } }, effortIds.claimIds, effortIds.assumptionIds, c);
  const valueSeg = (w: RoadmapWorkstream): Seg[] => (w.value
    ? [derivedSeg(`report:roadmap[${w.id}].value`, w.value.expected, 'currency', { op: 'sum', of: w.value.fields }, uniq(w.findings.flatMap(f => f.value?.expected.claimIds ?? [])), uniq(w.findings.flatMap(f => f.value?.expected.assumptionIds ?? [])), c)]
    : ['—']);
  blocks.push({ kind: 'table', small: true, head: ['Workstream', 'Months', 'Effort', 'Expected value per year (gross)', 'Lead owner'], widths: ['*', 55, 75, 75, 100],
    rows: c.roadmap.map(w => [[w.name], [startSeg(w), ' to ', endSeg(w)], [w.effort.band, ' (', effortSeg(w), ')'], valueSeg(w), [w.owners[0]]]) });
  blocks.push({ kind: 'paragraph', style: 'note', segs: ['A capability moves one maturity level at a time, with a milestone for each level, so a larger gap takes longer; severity sets the order of the work, not its pace. A finding that depends on another starts once that one has reached its first milestone, so dependent work can overlap.'] });
  for (const w of c.roadmap) {
    blocks.push({ kind: 'subheading', text: w.name });
    blocks.push({ kind: 'paragraph', segs: [cite(w.objective, claims)] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [
      strong('When: '), 'month ', startSeg(w), ' to month ', endSeg(w), '. ', strong('Effort: '), w.effort.band, ', ', effortSeg(w), '. ',
      strong('Owners: '), w.owners.join('; '), '.',
      ...(w.dependsOn.length ? [' ', strong('Depends on: '), w.dependsOn.map(d => name.get(d) ?? d).join('; '), '.'] : [])
    ] });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Activities')] });
    if (w.activities.length) blocks.push({ kind: 'list', small: true, items: w.activities.map(a => [cite(a, claims)]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Milestones')] });
    blocks.push({ kind: 'list', small: true, items: w.milestones.map(m => {
      const f = m.finding;
      const done = m.level ? `${capName(c, f.capability)} at ${LEVEL_LABEL[m.level]}` : f.title;
      const at = m.level ? month(`findings[${f.id}].levelMilestones.${m.level}`, m.month, findingClaims(f))
        : derivedSeg(`report:roadmap[${w.id}].milestone[${f.id}]`, m.month, 'count', { op: 'sum', of: [`findings[${f.id}].start.month`, `findings[${f.id}].targetDuration.months`] }, findingClaims(f), [], c);
      return ['Month ', at,
        ': ', cite(done, findingClaims(f)), ...(c.client ? [] : [' ', ref(`(${f.id})`)])];
    }) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('KPIs')] });
    if (w.kpis.length) blocks.push({ kind: 'list', small: true, items: w.kpis.map(k => [cite(k.name, k.claimIds)]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [
      ...(w.prerequisites.length ? [strong('Prerequisites: '), cite(joinItems(w.prerequisites), claims), '. '] : []),
      ...(w.risks.length ? [strong('Risks: '), cite(joinItems(w.risks), claims), '.'] : [])
    ] });
  }
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

function marketSection(): ReportSection {
  const md: any = marketData;
  const rows: Seg[][][] = [];
  for (const s of md.surveys as any[]) {
    for (const f of (s.figures as any[]).filter(x => x.clientVisible && x.use.includes('market_panel') && typeof x.value === 'number')) {
      const shown = f.unit === 'share' ? `${Math.round(f.value * 1000) / 10}%` : String(f.value);
      rows.push([[cite(f.label, [f.claimId])], [cite(shown, [f.claimId])], [cite(`${s.publisher}, ${s.title}`, s.claimIds)], [cite(`n = ${s.sample.toLocaleString('en-GB')}`, s.claimIds)], [cite(f.caveat, [f.claimId])]]);
    }
  }
  return {
    id: 'market', title: 'Published market data',
    blocks: [
      { kind: 'paragraph', segs: ['Published survey data, with source, year and sample. It is not an LTM peer benchmark, not your position and not a target: LTM has no engagement history to benchmark against.'] },
      { kind: 'table', small: true, head: ['Figure', 'Value', 'Source', 'Sample', 'Caveat'], widths: ['*', 40, 110, 55, 110], rows }
    ]
  };
}

/** Provider recommendation tools, by provider, with the claims that describe them. */
const PROVIDER_TOOLS: Record<string, { tools: string; claimIds: string[] }> = {
  aws: { tools: 'AWS Cost Optimization Hub and Compute Optimizer', claimIds: ['CLM-FIN-082', 'CLM-FIN-083'] },
  azure: { tools: 'Azure Advisor', claimIds: ['CLM-FIN-092'] },
  gcp: { tools: 'Google Cloud Recommender', claimIds: ['CLM-FIN-101'] }
};

/** Why this is not what provider tools already do (CIO challenge Q7; DESIGN.md section 1, edge). */
function edge(c: Ctx): Seg[] {
  const known = c.estate.providers.filter(p => PROVIDER_TOOLS[p]);
  const tools = known.length ? listOf(known.map(p => PROVIDER_TOOLS[p].tools)) : 'Provider tools';
  return [
    strong('Why provider tools are not enough. '),
    cite(`${tools} ${known.length === 1 && !tools.includes(' and ') ? 'gives' : 'give'} resource-level recommendations${c.estate.providers.length > 1 ? ', each for its own platform' : ''}. This assessment uses their exports as evidence for the rightsizing and idle-resource levers. It also covers what those tools do not assess: who owns the spend and decides, allocation and chargeback ${c.estate.providers.length > 1 ? 'across providers' : 'across owners'}${c.estate.scopes.some(x => ['data_centre', 'private_cloud', 'colocation'].includes(x)) ? ' and the data centre' : ''}, forecasting and budgets, unit economics, and the order in which to act, for example usage changes before new commitments.`,
      known.flatMap(p => PROVIDER_TOOLS[p].claimIds))
  ];
}

/** Questions by ID in the consultant edition, by their wording in the client edition. */
const questionList = (c: Ctx, ids: string[]): Seg =>
  (c.client
    ? cite(ids.map(id => `"${(QUESTION_TEXT.get(id) ?? id).replace(/[?.]$/, '')}"`).join('; '), ids.flatMap(id => QUESTION_CLAIMS.get(id) ?? []))
    : ref(ids.join(', ')));

function methodologySection(c: Ctx): ReportSection {
  const { r } = c;
  const v = r.versions;
  const cov = r.coverage;
  const covIds = cov.claimIds;
  return {
    id: 'methodology', title: 'Methodology and sources',
    blocks: [
      { kind: 'paragraph', segs: [cite(NOTICES.attribution, ['CLM-FIN-033'])] },
      { kind: 'paragraph', segs: edge(c) },
      { kind: 'paragraph', segs: [NOTICES.disclaimer] },
      { kind: 'paragraph', segs: [strong('How your data is handled. '), NOTICES.data] },
      { kind: 'paragraph', style: 'small', segs: [
        'Questions asked: ', traced('questions.asked.length', r.questions.asked.length, 'count', covIds), ', of which ', traced('coverage.asked', cov.asked, 'count', covIds),
        ' rate a capability (the rest record your estate, spend and value inputs). Of the capability questions, answered: ', traced('coverage.answered', cov.answered, 'count', covIds),
        '; "Don\'t know": ', traced('coverage.unknown', cov.unknown, 'count', covIds), '; left blank: ', traced('coverage.blank', cov.blank, 'count', covIds),
        '. A blank or "Don\'t know" is rated as unconfirmed and never raises a value. If you gave your own estimate of waste, it is not used in any figure: the value comes only from the lever formulas and your spend and evidence inputs.',
        ...(cov.blankQuestions.length ? [' Left blank: ', questionList(c, cov.blankQuestions), '.'] : []),
        ...(cov.unknownQuestions.length ? [' "Don\'t know": ', questionList(c, cov.unknownQuestions), '.'] : [])
      ] },
      { kind: 'table', small: true, head: ['Item', 'Version or date'], widths: [160, '*'], rows: [
        [['Assessment date'], [ref(r.assessmentDate ?? '')]],
        [['Data provided by'], [c.opts.dataProvidedBy]],
        [['FinOps IQ engine'], [ref(v.engine)]], [['Value model'], [ref(v.valueModel)]],
        [['Question set, capability model, levers, thresholds, rules'], [ref(v.kb)]],
        [['Claims register'], [ref(v.claimsRegister)]],
        [['Workstream library'], [ref(String(WS.libraryVersion))]],
        [['Assumption register'], [ref(String((assumptionRegister as any).registryVersion))]]
      ] },
      { kind: 'paragraph', style: 'note', segs: [c.client ? 'The data notice and the disclaimer are draft wording, pending approval.' : ref(NOTICES.status)] }
    ]
  };
}

/* -------------------------------- Appendices -------------------------------- */

function leverFormulas(c: Ctx): Block[] {
  const { r, cur } = c;
  const blocks: Block[] = [];
  for (const l of r.value.levers.filter(x => x.status === 'quantified' && x.cases)) {
    blocks.push({ kind: 'subheading', text: l.name });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('Base: '), cite(l.formula, l.claimIds), '. ', strong('Maximum rate: '), cite(l.rateFormula, l.claimIds), '. ', cite(l.basisLine, l.claimIds)] });
    blocks.push({ kind: 'table', small: true, head: ['Input', 'Kind', 'Value', 'Low', 'High'], widths: ['*', 50, 70, 70, 70],
      rows: l.inputs.map(i => [[cite(inputInfo(i.fact).label, i.value.claimIds)], [i.kind], [fig(i.value, cur)], i.low ? [fig(i.low, cur)] : ['—'], i.high ? [fig(i.high, cur)] : ['—']]) });
    if (l.maxRate.length) {
      blocks.push({ kind: 'table', small: true, head: ['Provider', 'Maximum rate', 'Instrument'], widths: [80, 70, '*'],
        rows: l.maxRate.map(m => [[providerName(m.provider)], [fig(m.rate, cur)], [m.instrument ? cite(m.instrument + (m.instrumentStated === false ? ' (not stated; the lower published maximum is used)' : ''), m.rate.claimIds) : '—']]) });
    }
    const e = l.cases!.expected;
    blocks.push({ kind: 'paragraph', style: 'small', segs: [
      'Expected case: base ', fig(e.base, cur), ' × rate ', fig(e.rate, cur), ' × factor ', fig(e.factor, cur), ' = ', fig(e.beforeGlobalCap, cur),
      ' before the global cap; after it ', fig(e.runRate, cur), ' per year. First-year share ', fig(e.year1Share, cur), ', so the first year earns ', fig(e.year1, cur), '.'
    ] });
  }
  return blocks;
}

/** One row per traced number in the document (deduplicated by field), with where it comes from. */
function traceTable(doc: ReportDocument, c: Ctx): Block {
  const seen = new Map<string, Exclude<Seg, string>>();
  walkSegments(doc, s => { if (typeof s !== 'string' && s.trace && !seen.has(s.trace.field)) seen.set(s.trace.field, s); });
  const visible = (ids: string[]) => (c.client ? ids.filter(id => CLAIM.get(id)?.clientVisible !== false) : ids);
  // Paths have no spaces: a zero-width space after each separator lets the PDF wrap them. IDs drop their prefix.
  const wrap = (path: string) => path.replace(/([.\]])/g, '$1\u200B');
  const short = (ids: string[], prefix: string) => ids.map(id => id.replace(prefix, '')).join(', ') || '—';
  const rows: Seg[][][] = [...seen.values()].map(s => {
    const t = s.trace!;
    const where = t.derived ? `${t.derived.op} of ${t.derived.of.join(', ')}` : t.field;
    return [[{ text: s.text, trace: t }], [ref(wrap(where))], [ref(short(visible(t.claimIds), 'CLM-FIN-'))], [ref(short(t.assumptionIds, 'ASM-FIN-'))]];
  });
  return { kind: 'table', small: true, head: ['Shown as', 'Engine field, or how it is derived', 'Claims (CLM-FIN-)', 'Assumptions (ASM-FIN-)'], widths: [55, '*', 95, 65], rows };
}

function assumptionAppendix(used: Set<string>): Block[] {
  return [
    { kind: 'paragraph', segs: ['Every constant the value model and scoring use, and the client inputs they rest on. "Used" marks those behind a number in this report.'] },
    { kind: 'table', small: true, head: ['ID', 'Assumption and value', 'Basis', 'Confidence', 'If it is wrong', 'Used'], widths: [50, '*', 60, 45, 110, 25],
      rows: ASM.map(a => {
        const ids = [a.id, ...(a.claimIds ?? [])];
        return [[ref(a.id)], [{ text: a.title, cite: ids, strong: true }, '. ', cite(String(a.value), ids)],
          [BASIS_LABEL[a.basis] ?? a.basis], [a.confidence], [cite(a.sensitivity, ids)], [used.has(a.id) ? 'Yes' : '']];
      }) }
  ];
}

function sensitivityAppendix(c: Ctx): Block[] {
  if (!c.sensitivity.length) {
    return [{ kind: 'paragraph', segs: [c.r.value.moneyShown ? 'No client input moves the expected net run-rate.' : 'Not shown: no money figure is shown for this assessment.'] }];
  }
  const t = c.r.value.totals!.expected.netRunRate;
  const row = (s: SensitivityRow): Seg[][] => {
    const unit = s.fact.startsWith('spend.') || /Spend$/.test(s.fact) ? 'currency' : 'share';
    const det = (side: 'low' | 'high') => ({ op: 'sensitivity' as const, of: [s.fact], detail: { side, input: side === 'low' ? s.lowInput : s.highInput, kind: s.kind } });
    return [
      [cite(s.label, s.claimIds)],
      [traced(`report:sensitivity[${s.fact}].lowInput`, s.lowInput, unit, s.claimIds, s.assumptionIds, c.cur), ' to ', traced(`report:sensitivity[${s.fact}].highInput`, s.highInput, unit, s.claimIds, s.assumptionIds, c.cur)],
      [derivedSeg(`report:sensitivity[${s.fact}].low`, s.low, 'currency', det('low'), t.claimIds, s.assumptionIds, c)],
      [derivedSeg(`report:sensitivity[${s.fact}].high`, s.high, 'currency', det('high'), t.claimIds, s.assumptionIds, c)]
    ];
  };
  return [
    { kind: 'paragraph', segs: ['The three inputs the expected net run-rate (', fig(t, c.cur), ') depends on most. An exact input is moved down and up by a fifth; a band input to its own ends. The engine is run again for each.'] },
    { kind: 'table', small: true, head: ['Input', 'Tested between', 'Expected net per year, low', 'Expected net per year, high'], widths: ['*', 110, 90, 90], rows: c.sensitivity.map(row) }
  ];
}

function sourcesAppendix(ids: string[], c: Ctx): Block[] {
  const source = (x: any) => {
    const pub = x.source?.publisher ?? '', title = x.source?.title ?? '';
    return title.startsWith(pub) ? title : `${pub}: ${title}`;
  };
  // LTM's own design pack is not public: the client edition names it without an address.
  const address = (x: any) => (x.source?.publisher === 'LTM' ? (c.client ? 'Available on request' : x.source?.url ?? '') : x.source?.url ?? '');
  const rows: Seg[][][] = ids.map(id => CLAIM.get(id)).filter(x => x && (!c.client || x.clientVisible !== false)).map((x: any) => [
    [ref(x.id)], [cite(source(x), [x.id])], [ref(x.verification ?? '')], [ref(x.checkedOn ?? '')], [ref(address(x))]
  ]);
  return [
    { kind: 'paragraph', segs: ['Every claim behind a number or statement in this report. Status: V verified against the source; P the primary source is given but the passage was not re-read; S read through a secondary source. LTM heuristics are marked as LTM in the source.'] },
    { kind: 'table', small: true, head: ['Claim', 'Source', 'Status', 'Checked', 'Address'], widths: [55, '*', 35, 55, 150], rows }
  ];
}

/** How LTM can help (F9, WS-S5): advice on what to do next and who could do it; type, purpose and outline only. */
function helpSection(c: Ctx): ReportSection {
  const help = c.r.help ?? [];
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['What could help with the findings, and the kind of work each is. Providers and tools are chosen from your requirements, with alternatives.'] }];
  if (!help.length) blocks.push({ kind: 'paragraph', segs: ['No finding calls for further work.'] });
  for (const h of help) {
    const route = h.offering.type === 'Route';
    blocks.push({ kind: 'subheading', text: route ? `See ${h.offering.name}` : `${h.offering.name} (${h.offering.type.toLowerCase()})` });
    blocks.push({ kind: 'paragraph', segs: [cite(h.offering.purpose, h.claimIds), ...(route ? [] : [' ', { text: `Delivered by: ${h.offering.practice}.`, cite: h.claimIds, italic: true }])] });
    if (h.offering.outline.length) blocks.push({ kind: 'list', small: true, items: h.offering.outline.map(o => [cite(o, h.claimIds)]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('For: '), h.findingIds.map(id => dependencyName(c, id)).join('; '), '.'] });
  }
  return { id: 'help', title: 'How LTM can help', blocks };
}

const LEVEL_TEXT: Record<string, string> = { platform: 'Platform', stack: 'Tech stack', application: 'Application' };

/** Technical execution (F8, WS-S3): the playbook's actions for each finding on the platforms it names. */
function technicalSection(c: Ctx): ReportSection {
  const plan = c.r.technicalPlan;
  const blocks: Block[] = [];
  if (!plan || !plan.actions.length) {
    blocks.push({ kind: 'paragraph', segs: ['No platform actions are listed for these findings yet: the platform playbook entries are still being sourced and reviewed. The findings and roadmap above state what to do; the actions per platform follow in a later edition.'] });
    return { id: 'technical', title: 'Technical execution', blocks };
  }
  blocks.push({ kind: 'paragraph', segs: [cite(plan.statement, plan.claimIds)] });
  const byFinding = new Map<string, typeof plan.actions>();
  for (const a of plan.actions) byFinding.set(a.findingId, [...(byFinding.get(a.findingId) ?? []), a]);
  for (const [id, actions] of byFinding) {
    blocks.push({ kind: 'subheading', text: dependencyName(c, id) });
    blocks.push({ kind: 'table', small: true, head: ['Platform', 'Level', 'Action and approach', 'Options', 'Verification', 'Owner'], widths: [55, 45, '*', 100, 90, 60],
      rows: actions.map(a => [
        [a.platform === 'any' ? 'Any' : a.platform === 'on_prem' ? 'Data centre and private cloud' : a.platform === 'saas' ? 'SaaS and licensing' : a.platform === 'kubernetes' ? 'Kubernetes' : providerName(a.platform)],
        [LEVEL_TEXT[a.level]],
        [cite(a.noPlatformAction ? a.action : `${sentence(a.action)} ${sentence(a.approach)}`, a.claimIds), ...(a.discoveryNeeded ? [' ', { text: `Needs: ${sentence(a.discoveryNeeded)}`, cite: a.claimIds, italic: true }] : []),
          ...(a.confirmRegionalAvailability ? [' Confirm regional availability.'] : [])],
        a.options.length ? [cite(a.options.map(o => o.name + (o.kind === 'native' ? '' : ` (${o.kind.replace('_', ' ')})`)).join('; '), a.claimIds)] : ['—'],
        [cite(a.verification, a.claimIds)],
        [a.ownerRole]
      ]) });
  }
  return { id: 'technical', title: 'Technical execution', blocks };
}

/** Consultant-only SOW draft (F9): offerings with indicative scope and the findings behind each. Never in the client edition. */
function sowAppendix(c: Ctx): ReportSection {
  const { lines, routes } = sowDraft(OFFERINGS, c.r.findings);
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Indicative scope is an LTM heuristic to be agreed per engagement, not a quotation.'] }];
  blocks.push({ kind: 'table', small: true, head: ['Offering', 'Type', 'Indicative scope', 'Findings'], widths: ['*', 80, 70, 150],
    rows: lines.map(l => [[l.offering.name], [l.offering.type], [cite(l.offering.indicativeScope ?? '—', OFFERINGS.claimIds)], [ref(l.findingIds.join(', '))]]) });
  if (routes.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Routed to other accelerators: ', routes.map(r => r.offering.name).join(', '), '.'] });
  return { id: 'sow', title: 'Statement of work draft', appendix: true, blocks };
}

function consultantAppendix(c: Ctx): ReportSection {
  const { r } = c;
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Not part of the client edition.'] }];
  blocks.push({ kind: 'subheading', text: 'Complexity tier' });
  blocks.push({ kind: 'list', small: true, items: (r.tier.trace ?? []).map(t => [cite(t, r.tier.claimIds)]) });
  if (r.needVerdict?.modifiers?.length) {
    blocks.push({ kind: 'subheading', text: 'Need index modifiers' });
    blocks.push({ kind: 'list', small: true, items: r.needVerdict.modifiers.map(m => [ref(m.id), ': ', traced(`needVerdict.modifiers[${m.id}].points`, m.points, 'index', r.needVerdict!.claimIds), ' points', m.assumed ? ' (assumed until confirmed)' : '']) });
  }
  if (r.conflicts.length) {
    blocks.push({ kind: 'subheading', text: 'Conflict probes' });
    blocks.push({ kind: 'list', small: true, items: r.conflicts.map(x => [ref(x.id), ': ', x.probe]) });
  }
  if (r.coverage.ignoredAnswers?.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Answers no longer asked (kept, not scored): ', ref(r.coverage.ignoredAnswers.join(', ')), '.'] });
  return { id: 'consultant', title: 'Consultant checks', appendix: true, blocks };
}

/* --------------------------------- Document --------------------------------- */

/** The FinOps IQ report for a completed assessment. In the client edition the result goes through clientView() first. */
export function finopsIqReport(result: FinOpsIqV3Result, opts: ReportOptions): ReportDocument {
  if (!result.assessmentDate) throw new Error('report: the result has no assessment date (complete the assessment first)');
  const client = opts.view === 'client';
  const r = client ? (clientView(result) as unknown as FinOpsIqV3Result) : result;
  const estate = estateOf(r, opts.input);
  const c: Ctx = {
    r, cur: r.value.currency, client, opts, estate, roadmap: finopsIqRoadmap(r, estate),
    sensitivity: opts.input ? finopsIqSensitivity(opts.input, result) : []
  };
  const doc: ReportDocument = {
    meta: {
      platform: PLATFORM, product: PRODUCT, title: 'FinOps assessment report',
      subtitle: r.mode === 'executive' ? 'Executive assessment: do we need to act, and what is at stake?' : 'Workshop assessment: what to do, by when, owned by whom, and what it is worth',
      client: opts.client, preparedBy: opts.preparedBy, dataProvidedBy: opts.dataProvidedBy, date: r.assessmentDate!,
      version: `FinOps IQ engine ${r.versions.engine} · value model ${r.versions.valueModel}`, view: opts.view,
      footer: `${PLATFORM} · ${PRODUCT} · Confidential`,
      status: r.technicalPlan?.actions.length ? 'Review draft.' : 'Review draft. Platform actions are added as the playbook entries are reviewed.'
    },
    sections: [executiveSummary(c), capabilityProfile(c), findingsSection(c), valueSection(c), roadmapSection(c), helpSection(c), technicalSection(c), marketSection(), methodologySection(c)]
  };
  // "How we calculated this" lists every number shown before it, then the lever formulas, register and sensitivity.
  const sensitivity = sensitivityAppendix(c);
  doc.sections.push({ id: 'calculation', title: 'How we calculated this', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['The lever formulas and inputs, the sensitivity of the headline to the three most influential inputs, and then every number in this report: what it shows, the engine field it is read from (or how it is derived from engine fields), and the claims and assumptions behind it.'] },
    ...(r.value.moneyShown ? leverFormulas(c) : []),
    { kind: 'subheading', text: 'Sensitivity' }, ...sensitivity
  ] });
  doc.sections[doc.sections.length - 1].blocks.push({ kind: 'subheading', text: 'Every number' }, traceTable(doc, c));
  const used = new Set<string>();
  const claims = new Set<string>();
  walkSegments(doc, s => {
    if (typeof s === 'string') return;
    s.trace?.assumptionIds.forEach(id => used.add(id));
    s.trace?.claimIds.forEach(id => claims.add(id));
    s.cite?.forEach(id => (id.startsWith('ASM-') ? used.add(id) : claims.add(id)));
  });
  doc.sections.push({ id: 'assumptions', title: 'Assumption register', appendix: true, blocks: assumptionAppendix(used) });
  doc.sections.push({ id: 'sources', title: 'Sources', appendix: true, blocks: sourcesAppendix([...claims].sort(), c) });
  if (client) clientWords(doc);
  else doc.sections.push(sowAppendix(c), consultantAppendix(c));
  return doc;
}

const QUESTION_TEXT = new Map<string, string>((questionBank as any).questions.map((q: any) => [q.id, q.text]));
const LEVER_NAME = new Map<string, string>((leverLibrary as any).levers.map((l: any) => [l.id, l.name]));
const QUESTION_CLAIMS = new Map<string, string[]>((questionBank as any).questions.map((q: any) => [q.id, (q.basis ?? []).map((b: any) => b.claimId).filter(Boolean)]));
/** Sections where identifiers belong: the calculation, the registers and the consultant checks. */
const KEEPS_IDS = new Set(['calculation', 'assumptions', 'sources', 'sow', 'consultant']);

/**
 * Client edition: text quoted from the engine and registers in plain words (CIO challenge D8). Question IDs after a
 * quoted answer are dropped, other question IDs become the question itself, and design references such as "(Q10)",
 * "(D4)" or "(DECISION-01)" are removed. Traced numbers are not touched.
 */
export function plainWords(text: string): string {
  return text
    .replace(/\s*\((?:[A-Z]{2}-\d{2}(?:,\s*)?)+\)/g, '')
    .replace(/\s*\((?:[QDHML]\d+|DECISION-\d+|WS-S\d+)(?:[,;]\s*(?:[QDHML]\d+|DECISION-\d+|WS-S\d+))*\)/g, '')
    .replace(/\b[A-Z]{2}-\d{2}\b/g, id => (QUESTION_TEXT.has(id) ? `the question "${QUESTION_TEXT.get(id)!.replace(/[?.]$/, '')}"` : id))
    .replace(/\s*\((LEV-\d{2})\)/g, '')
    .replace(/\bLEV-\d{2}\b/g, id => LEVER_NAME.get(id) ?? id);
}

/** Client edition, every section: LTM's internal files are named as the design pack, which the client cannot open. */
export const noFileRefs = (text: string) => text
  .replace(/\s*\([^()]*\.(?:json|ts|cjs)\b[^()]*\)/g, '')
  .replace(/\bDESIGN\.md\s+(?=\d)/g, 'the LTM design pack, section ')
  .replace(/\b[\w-]+\.(?:md|json)\b/g, 'the LTM design pack')
  .replace(/\b(AZURE|GCP|OCI)\b/g, p => providerName(p.toLowerCase()));
function clientWords(doc: ReportDocument) {
  for (const section of doc.sections) {
    const words = (t: string) => noFileRefs(KEEPS_IDS.has(section.id) ? t : plainWords(t));
    const fix = (run: Seg[]) => run.forEach((s, i) => {
      if (typeof s === 'string') run[i] = words(s);
      else if (!s.trace && !s.ref) run[i] = { ...s, text: words(s.text) };
    });
    for (const b of section.blocks) {
      if (b.kind === 'paragraph' || b.kind === 'callout') fix(b.segs);
      else if (b.kind === 'list') b.items.forEach(fix);
      else if (b.kind === 'table') b.rows.forEach(r => r.forEach(fix));
      else if (b.kind === 'kpis') b.items.forEach(i => { fix(i.value); if (i.note) fix(i.note); });
      else if (b.kind === 'subheading') b.text = words(b.text);
    }
  }
}

/** Resolves a traced field against the result: an engine path, or a Figure at that path (its value). */
export function resolveTraceField(r: FinOpsIqV3Result, field: string): number | undefined {
  const v = resolveField(r, field);
  return typeof v === 'number' ? v : v && typeof v === 'object' && typeof v.value === 'number' ? v.value : undefined;
}
