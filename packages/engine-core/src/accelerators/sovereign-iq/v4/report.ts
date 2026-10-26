/**
 * The Sovereign IQ executive report (PLAN S6), in the FinOps IQ report format (shared model and PDF renderer,
 * src/report): cover and contents, executive summary with the two headlines, required level by kind of data,
 * control maturity (bars by area, heatmap by level, the controls), compliance exposure (heatmap by market, the
 * regulations with their statutory maximums), findings, the sovereign cloud advisory (S7), roadmap, methodology, sources,
 * and the consultant appendix.
 *
 * Built on the server from the stored result. The client edition leaves out what client mode leaves out (DESIGN 9):
 * rule IDs, regulations that do not apply (count only), consultant-only items, requirements pending a source and
 * consultant notes. Every number is a traced segment; text quoted from the registry cites its claims.
 */
import type { Backlog, Block, ReportDocument, ReportSection, Seg, Tone } from '../../../report/model';
import { traced } from '../../../report/model';
import registerData from '../../../claims/claims-register.json' with { type: 'json' };
import { CONTROLS, type Finding, type SovereignIqV4Result, type State } from './evaluate';
import { DATA_CLASS_LABELS, LEVEL_LABELS, PLATFORM_LABELS, ZONE_LABELS } from './public-schema';
import { SEAL } from './seal';
import { OFFERINGS, sovereignSow } from './help';
import { LADDER, COUNSEL_NOTE, clientCleared, type AdvisoryAction, type LadderOption, type PlacementStatus } from './advisory';

const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'Sovereign IQ';
const CLAIM = new Map<string, any>((registerData as any).claims.map((c: any) => [c.id, c]));
const CONTROL = new Map<string, any>(CONTROLS.map(c => [c.id, c]));
const WORD: Record<string, string> = { 3: 'In place', 2: 'Largely in place', 1: 'Partly in place', 0: 'Not in place', unknown: 'Unconfirmed', not_answered: 'Not answered' };
const GRADE: Record<string, string> = { applies: 'Applies', likely_confirm: 'Likely – confirm', advisory: 'Advisory', not_applicable: 'Not applicable' };
const RAG: Record<string, string> = { red: 'Red', amber: 'Amber', green: 'Green', not_rated: 'Not rated' };
const MARKET: Record<string, string> = { eu_uk: 'EU and UK', us: 'United States', apac: 'Asia-Pacific' };

export interface SovereignReportOptions {
  client: string; preparedBy: string; dataProvidedBy: string; view: 'client' | 'consultant'; notes?: string;
  /** PLAN S9: the engagement's AI switch, and a narrative that passed the grounding check (null otherwise). */
  aiEnabled?: boolean;
  narrative?: { narrative: { summary: string; priorities: string[]; nextSteps: string[] }; modelId: string; generatedAt: string } | null;
}

const strip = (t: string) => String(t ?? '').replace(/\s*\[CLM-[A-Z]+-\d+\]/g, '');
const claimsIn = (t: string) => [...new Set(String(t ?? '').match(/CLM-[A-Z]+-\d+/g) ?? [])];
/** Text quoted from the engine or the registry: shown as is, citing its claims (digits allowed). */
const quote = (t: string, cite: string[] = []): Seg => ({ text: strip(t), cite: [...new Set([...cite, ...claimsIn(t)])] });
const ref = (t: string): Seg => ({ text: t, ref: true });
const strong = (t: string): Seg => ({ text: t, strong: true });
const word = (s: State | undefined) => WORD[String(s)] ?? 'Not answered';
const tone = (s: State | undefined): Tone => (s === 3 ? 'good' : s === 2 ? 'partial' : s === 1 ? 'weak' : s === 0 ? 'bad' : 'unknown');
const className = (c: string) => DATA_CLASS_LABELS[c] ?? c;
const zone = (z: string) => ZONE_LABELS[z] ?? z;
const count = (field: string, n: number): Seg => traced(field, n, 'count', []);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

interface Ctx { r: SovereignIqV4Result; client: boolean; opts: SovereignReportOptions; shownRegimes: Set<string>; findings: Finding[] }

/** The cap as shown: exact amount, a range from the turnover band, or "at least". */
function capSegs(cap: NonNullable<SovereignIqV4Result['exposure']['largestCap']>, field: string): Seg[] {
  const claims = cap.claims ?? [];
  if (cap.amount != null) return [traced(`${field}.amount`, cap.amount, 'currency', claims, [], cap.currency)];
  if (cap.range && cap.range[1] != null) return [traced(`${field}.range[0]`, cap.range[0], 'currency', claims, [], cap.currency), ' to ', traced(`${field}.range[1]`, cap.range[1], 'currency', claims, [], cap.currency)];
  if (cap.range) return ['at least ', traced(`${field}.range[0]`, cap.range[0], 'currency', claims, [], cap.currency)];
  return ['not quantified'];
}

/* ------------------------------- Sections -------------------------------- */

function summary(c: Ctx): ReportSection {
  const { r } = c;
  const regs = r.regimes.filter(g => c.shownRegimes.has(g.regime));
  const n = (g: string) => regs.filter(x => x.grade === g).length;
  const exp = r.exposure.regimes.filter(e => c.shownRegimes.has(e.regime));
  const rag = (k: string) => exp.filter(e => e.rag === k).length;
  const sev = (k: string) => c.findings.filter(f => f.severity === k).length;
  const m = r.maturity, cap = r.exposure.largestCap && c.shownRegimes.has(r.exposure.largestCap.regime) ? r.exposure.largestCap : null;
  const blocks: Block[] = [];
  blocks.push({ kind: 'paragraph', style: 'lead', segs: [
    'On your answers, ', count('regimes[applies]', n('applies')), ` ${plural(n('applies'), 'regulation applies', 'regulations apply')}, `,
    count('regimes[likely_confirm]', n('likely_confirm')), ' likely ', plural(n('likely_confirm'), 'applies', 'apply'), ' and should be confirmed, and ',
    count('regimes[advisory]', n('advisory')), ' ', plural(n('advisory'), 'is', 'are'), ' advisory. ',
    m.score != null ? ['Your controls score ', traced('maturity.score', m.score, 'index', []), ' out of 100 against the level your data requires: ', m.band!.toLowerCase(), '.'] as any : [m.wording, '.'],
    ' Two headlines are reported and never blended: how well your controls meet the sovereignty level your data needs, and how exposed you are under each regulation.'
  ].flat() });
  blocks.push({ kind: 'kpis', items: [
    { label: 'Control maturity', value: m.score != null ? [traced('maturity.score', m.score, 'index', []), ' / 100'] : ['No score'], note: [m.score != null ? m.band! : 'Too few controls required for a reliable number'] },
    { label: 'Regulations in scope', value: [count('regimes[in_scope]', n('applies') + n('likely_confirm') + n('advisory'))], note: [count('regimes[applies]', n('applies')), ' apply · ', count('regimes[likely_confirm]', n('likely_confirm')), ' to confirm'] },
    { label: 'Exposure rating', value: [count('exposure[red]', rag('red')), ' red'], note: [count('exposure[amber]', rag('amber')), ' amber · ', count('exposure[green]', rag('green')), ' green'] },
    { label: 'Largest statutory cap', value: cap ? capSegs(cap, 'exposure.largestCap') : ['Not quantified'], note: cap ? [quote(`${regimeName(r, cap.regime)} ${cap.article}${cap.grade === 'likely_confirm' ? ' (likely – confirm)' : ''}`), '; cap, not expected fine'] : [r.exposure.capNote] },
    { label: 'Findings', value: [count('findings', c.findings.length)], note: [count('findings[Critical]', sev('Critical')), ' critical · ', count('findings[High]', sev('High')), ' high'] }
  ] });
  const top = r.topGaps.filter(f => !c.client || !f.consultantOnly);
  if (top.length) {
    blocks.push({ kind: 'subheading', text: 'Where to start' });
    blocks.push({ kind: 'table', head: ['Severity', 'Action', 'Owner', 'Time frame'], widths: [50, '*', 100, 70], rows: top.map(f => [[f.severity], [strong(strip(f.title)), '\n', quote(f.businessConsequence, f.sources)], [f.ownerRole], [quote(f.timeFrame)]]) });
  }
  const confirm = c.findings.filter(f => f.type === 'scope_confirmation' || f.type === 'decision' || f.type === 'conflict');
  if (confirm.length) {
    blocks.push({ kind: 'subheading', text: 'Decisions and confirmations' });
    blocks.push({ kind: 'list', items: confirm.map(f => [strong(strip(f.title) + ': '), quote(f.businessConsequence, f.sources)]) });
  }
  blocks.push({ kind: 'callout', tone: 'warn', title: 'Not legal advice', segs: ['An indicative assessment from self-reported answers. Confirm applicability and obligations with counsel before acting. Statutory maximums are caps, not expected fines, and are never added together.'] });
  return { id: 'summary', title: 'Executive summary', blocks };
}

const regimeName = (r: SovereignIqV4Result, id: string) => r.regimes.find(g => g.regime === id)?.name ?? id;

/** PLAN S9: the AI narrative, labelled, only when one passed the grounding check. Never replaces the engine's sections. */
function narrativeSection(c: Ctx): ReportSection | null {
  const n = c.opts.narrative;
  if (!n) return null;
  return { id: 'narrative', title: 'Narrative summary (AI-written)', blocks: [
    { kind: 'callout', tone: 'info', segs: [`Written by an AI model (${n.modelId}) on ${n.generatedAt.slice(0, 10)} from this report's results only, and checked automatically: every number, date, regulation and provider in it appears in the results. The sections that follow are the assessment of record.`] },
    ...n.narrative.summary.split(/\n\s*\n/).filter(p => p.trim()).map(p => ({ kind: 'paragraph', segs: [p.trim()] }) as Block),
    { kind: 'subheading', text: 'Priorities' },
    { kind: 'list', items: n.narrative.priorities.map(p => [p]) },
    { kind: 'subheading', text: 'Next steps' },
    { kind: 'list', items: n.narrative.nextSteps.map(p => [p]) }
  ] };
}

function requirement(c: Ctx): ReportSection {
  const { r } = c;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Each kind of data gets a required sovereignty level: the higher of what the law requires and what the board chose. The level decides which controls are needed.'] }];
  blocks.push({ kind: 'table', head: ['Data', 'Required level', 'Allowed regions', 'Set by'], widths: [100, 150, '*', 110], rows: r.requirements.map(q => [
    [className(q.dataClass)], [ref(LEVEL_LABELS[q.required] ?? q.required)],
    [q.allowedZone.length ? q.allowedZone.map(zone).join(', ') : 'No restriction'],
    [q.floor && !(c.client && q.floor.consultantOnly) ? quote(`Law: ${regimeName(r, q.floor.regime)}${q.floor.provisional ? ' (provisional – confirm)' : ''}`) : q.choice && q.choice !== 'unknown' ? 'Board choice' : 'Legal minimum only']
  ]) });
  blocks.push({ kind: 'list', small: true, items: Object.entries(LEVEL_LABELS).map(([k, v]) => [ref(v)]) });
  return { id: 'requirement', title: 'Required sovereignty level', blocks };
}

const sealName = (n: number | null | undefined) => (n == null ? '—' : `SEAL-${n}`);

/** PLAN S7b: the minimum provider SEAL per objective for each kind of data, the controls behind each objective. */
function sealSection(c: Ctx): ReportSection {
  const v = c.r.seal;
  const mapped = SEAL.objectives.filter(o => o.mapped);
  const short = (name: string) => name.replace(/ sovereignty$/, '');
  const blocks: Block[] = [{ kind: 'paragraph', segs: [{ text: SEAL.intro, cite: SEAL.claimIds }, ' This view uses an LTM mapping from the required level, not the Commission\'s, and is not a SEAL assessment or certification.'] }];
  blocks.push({ kind: 'list', small: true, items: SEAL.levels.map(l => [strong(`SEAL-${l.id} ${l.name}: `), { text: l.plain, cite: SEAL.claimIds }, ...(l.note ? [` (${l.note})`] : [])]) });
  if (v.byClass.length) {
    blocks.push({ kind: 'subheading', text: 'Provider SEAL your data needs, by objective' });
    blocks.push({ kind: 'steps', steps: ['SEAL-1', 'SEAL-2', 'SEAL-3', 'SEAL-4'],
      rows: mapped.map(o => {
        const n = v.organisation[o.id];
        const drivers = v.byClass.filter(x => n != null && x.minimums[o.id] === n).map(x => className(x.dataClass));
        return { label: `${o.id} ${short(o.name)}`, value: n, marker: v.tender?.minimums[o.id] ?? null, shown: [n == null ? 'None needed' : `${sealName(n)}${drivers.length ? ` (${drivers.join(', ')})` : ''}`] };
      }),
      legend: `Filled: the highest SEAL any kind of data needs from its providers.${v.tender ? ' Outlined: the tender minimum.' : ''}` });
    blocks.push({ kind: 'subheading', text: 'Minimum provider SEAL by kind of data' });
    blocks.push({ kind: 'table', small: true, head: ['Data', 'Level', ...mapped.map(o => `${o.id} ${short(o.name)}`)], widths: [80, 30, ...mapped.map(() => '*' as const)], rows: [
      ...v.byClass.map(x => [[className(x.dataClass)], [x.level], ...mapped.map(o => [sealName(x.minimums[o.id])])]),
      [[strong('Highest needed')], [''], ...mapped.map(o => [strong(sealName(v.organisation[o.id]))])]
    ] });
  } else blocks.push({ kind: 'paragraph', style: 'note', segs: ['No kind of data needs more than L0, so no minimum SEAL applies.'] });
  if (v.l4Note) blocks.push({ kind: 'paragraph', style: 'note', segs: [{ text: v.l4Note, cite: ['CLM-SOV-227'] }] });
  const measured = v.objectives.filter(o => o.controls.length);
  if (measured.length) {
    blocks.push({ kind: 'subheading', text: 'Your controls by sovereignty objective' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['The share of the required controls tagged to each objective that are in place: a count of your controls, not a SEAL rating.'] });
    blocks.push({ kind: 'bars', max: 100, items: measured.map(o => {
      const pct = Math.round((100 * o.inPlace) / o.controls.length);
      return { label: `${o.id} ${short(o.name)}${o.mapped ? '' : ' (provider selection)'}`, value: pct, shown: [count(`seal.objectives[${o.id}].inPlace`, o.inPlace), ` of ${o.controls.length} in place`], tone: (pct >= 80 ? 'good' : pct >= 50 ? 'partial' : pct > 0 ? 'weak' : 'bad') as Tone };
    }) });
    const gaps = measured.filter(o => o.inPlace < o.controls.length);
    if (gaps.length) blocks.push({ kind: 'list', small: true, items: gaps.map(o => [strong(`${o.id}: `), o.controls.filter(x => x.state !== 3).map(x => `${CONTROL.get(x.control)?.name ?? x.control} (${word(x.state).toLowerCase()})`).join('; ')]) });
  }
  const t = v.tender;
  if (t) {
    blocks.push({ kind: 'subheading', text: 'EU tender minimums' });
    blocks.push({ kind: 'list', small: true, items: [
      [`Minimums: ${Object.entries(t.minimums).map(([o, n]) => `${o} ${sealName(n)}`).join('; ')}. These need at least ${t.level} for ${t.classes.map(className).join(', ')}.`],
      ...(t.raised.length ? [[`Raised the required level of ${t.raised.map(x => `${className(x.dataClass)} from ${x.from} to ${x.to}`).join('; ')}.`]] : []),
      ...(t.beyondMapping.length ? [[`No level in the mapping reaches the minimum for ${t.beyondMapping.join(', ')}.`]] : []),
      ...(t.selectionCriteria.length ? [[`Provider-selection criteria: ${t.selectionCriteria.map(x => `${x.objective} ${sealName(x.minimum)}`).join('; ')}.`]] : [])
    ] });
  }
  if (!c.client) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Consultant edition: ', { text: v.commissionTenderResults.statement, cite: v.commissionTenderResults.claimIds }] });
  blocks.push({ kind: 'callout', tone: 'info', segs: [v.statement] });
  return { id: 'seal', title: 'EU sovereignty levels (SEAL)', blocks };
}

function maturity(c: Ctx): ReportSection {
  const { r } = c, m = r.maturity;
  const blocks: Block[] = [];
  blocks.push({ kind: 'paragraph', segs: m.score != null
    ? [count('maturity.controlsAssessed', m.controlsAssessed), ' controls are required. Together they score ', traced('maturity.score', m.score, 'index', []), ' out of 100: ', m.wording.toLowerCase(), '.', m.provisional ? ' Provisional: fewer than three in five required controls were answered.' : '',
       m.unconfirmed.length ? [' ', count('maturity.unconfirmed', m.unconfirmed.length), ' ', plural(m.unconfirmed.length, 'is', 'are'), ' unconfirmed (answered "Unknown") and count as not in place.'] as any : '']
    : [m.wording, '.'] });
  if (m.byDomain.length) {
    blocks.push({ kind: 'subheading', text: 'Maturity by area' });
    blocks.push({ kind: 'bars', max: 100, items: m.byDomain.map(d => ({ label: d.label, value: d.score, shown: [traced(`maturity.byDomain[${d.domain}].score`, d.score, 'index', [])], tone: d.score >= 80 ? 'good' : d.score >= 60 ? 'partial' : d.score >= 40 ? 'weak' : 'bad' })) });
  }
  const rows: Array<[string | null, string]> = [['L1', 'Residency (L1)'], ['L2', 'Access and keys (L2)'], ['L3', 'Operational (L3)'], ['L4', 'Jurisdictional (L4)'], [null, 'Required by regulations']];
  const heat = rows.map(([lv, label]) => ({ label, cells: r.controls.filter(x => (CONTROL.get(x.control)?.level ?? null) === lv).map(x => ({ label: x.name, note: word(x.state).toLowerCase(), tone: tone(x.state) })) })).filter(x => x.cells.length);
  if (heat.length) {
    blocks.push({ kind: 'subheading', text: 'Control heatmap' });
    blocks.push({ kind: 'heatmap', rows: heat, legend: [{ tone: 'good', label: 'In place' }, { tone: 'partial', label: 'Largely' }, { tone: 'weak', label: 'Partly' }, { tone: 'bad', label: 'Not in place' }, { tone: 'unknown', label: 'Unconfirmed or not answered' }] });
  }
  blocks.push({ kind: 'subheading', text: 'Required controls' });
  blocks.push({ kind: 'table', small: true, head: ['Control', 'State', 'Required by', 'Owner'], widths: ['*', 70, 150, 90], rows: r.controls.map(x => {
    const info = CONTROL.get(x.control);
    const byClass = x.byClass ? Object.entries(x.byClass).map(([k, s]) => `${className(k)}: ${word(s as State).toLowerCase()}`).join('; ') : '';
    const lv = (k: string) => r.requirements.find(q => q.dataClass === k)?.required ?? '';
    const by = [...(x.requiredBy.levels.length ? [`Level: ${x.requiredBy.levels.map(k => `${className(k)} (${lv(k)})`).join(', ')}`] : []), ...x.requiredBy.regimes.filter(g => c.shownRegimes.has(g.regime)).map(g => regimeName(r, g.regime))];
    return [[strong(x.name), '\n', { text: info?.means ?? '', italic: true }], [word(x.state), ...(byClass ? ['\n', byClass] : [])], [quote(by.join('; '))], [info?.ownerRole ?? '']];
  }) });
  return { id: 'maturity', title: 'Sovereignty control maturity', blocks };
}

function exposure(c: Ctx): ReportSection {
  const { r } = c;
  const exp = r.exposure.regimes.filter(e => c.shownRegimes.has(e.regime));
  const blocks: Block[] = [{ kind: 'paragraph', segs: [quote(r.exposure.summary), ' A regulation is red when a critical or high-weight control it requires is absent, unconfirmed or not answered; amber when any is below full; green when all are in place. Regulations that place no duty on you (foreign-access laws, schemes, pending bills) are not rated.'] }];
  const byMarket = Object.keys(MARKET).map(mk => ({ label: MARKET[mk], cells: exp.filter(e => r.regimes.find(g => g.regime === e.regime)?.market === mk).map(e => {
    const g = r.regimes.find(x => x.regime === e.regime)!;
    return { label: g.name, note: `${GRADE[g.grade].toLowerCase()} · ${RAG[e.rag].toLowerCase()}`, tone: (e.rag === 'red' ? 'bad' : e.rag === 'amber' ? 'partial' : e.rag === 'green' ? 'good' : 'unknown') as Tone };
  }) })).filter(x => x.cells.length);
  if (byMarket.length) {
    blocks.push({ kind: 'subheading', text: 'Exposure by market' });
    blocks.push({ kind: 'heatmap', rows: byMarket, legend: [{ tone: 'bad', label: 'Red' }, { tone: 'partial', label: 'Amber' }, { tone: 'good', label: 'Green' }, { tone: 'unknown', label: 'Not rated' }] });
  }
  const order: Record<string, number> = { applies: 0, likely_confirm: 1, advisory: 2 };
  blocks.push({ kind: 'subheading', text: 'Regulations in scope' });
  blocks.push({ kind: 'table', small: true, head: ['Regulation', 'Grade', 'Why', 'Rating', 'Statutory maximum'], widths: [90, 55, '*', 45, 110], rows: [...exp].sort((a, b) => order[a.grade] - order[b.grade]).map(e => {
    const g = r.regimes.find(x => x.regime === e.regime)!;
    const cap: Seg[] = e.cap ? [...capSegs(e.cap, `exposure.regimes[${e.regime}].cap`), ' ', quote(`(${e.cap.article})`)] : [quote(e.penaltyModel === 'not_applicable_to_client' ? 'No penalty on you' : e.penaltyModel === 'national' ? 'Set by national law' : e.penaltyModel === 'per_violation' ? 'Per violation' : 'Not quantified')];
    return [[strong(g.name), ...(g.volatile ? [' ', quote(`(status as of ${g.statusAsOf})`)] : [])], [GRADE[g.grade]], [quote(g.reason, g.claims), ...(!c.client && g.rule ? [' ', ref(`[${g.rule}]`)] : [])], [RAG[e.rag]], cap];
  }) });
  const fa = r.foreignAccess;
  if (fa.length) {
    blocks.push({ kind: 'subheading', text: 'Foreign-access exposure' });
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['These kinds of data sit with providers whose parent company is outside the allowed region. Keys held outside the provider and approved, logged access limit what such a provider can technically produce; they do not remove its legal duty under a foreign order.'] });
    blocks.push({ kind: 'table', small: true, head: ['Data', 'Provider parents outside the region', 'Limiting controls'], widths: [100, 110, '*'], rows: fa.map(f => [[className(f.dataClass)], [f.parents.map(zone).join(', ')], [f.controls.map(x => `${CONTROL.get(x.control)?.name ?? x.control}: ${word(x.state).toLowerCase()}`).join('; ')]]) });
  }
  if (c.client) {
    const others = r.regimes.length - c.shownRegimes.size;
    if (others) blocks.push({ kind: 'paragraph', style: 'note', segs: [count('regimes[not_shown]', others), ' other regulations were checked and do not apply on your answers; your consultant holds the list.'] });
  }
  return { id: 'exposure', title: 'Compliance exposure', blocks };
}

function findingsSection(c: Ctx): ReportSection {
  const blocks: Block[] = [];
  if (!c.findings.length) return { id: 'findings', title: 'Findings', blocks: [{ kind: 'paragraph', segs: ['No findings: every required control is in place.'] }] };
  blocks.push({ kind: 'paragraph', segs: ['Findings come from gaps only: a required control below full, unconfirmed or not answered; a regulation to confirm; contradictory answers; or a decision for the board. None is raised for provider nationality alone.'] });
  blocks.push({ kind: 'table', small: true, head: ['Severity', 'Finding', 'Owner', 'Time frame'], widths: [48, '*', 95, 65], rows: c.findings.map(f => [
    [f.severity], [strong(strip(f.title)), '\n', quote(f.businessConsequence, f.sources), ...(f.referral ? [' Verify in ', f.referral, '.'] : [])], [f.ownerRole], [quote(f.timeFrame)]
  ]) });
  return { id: 'findings', title: 'Findings', blocks };
}

const PLACEMENT: Record<PlacementStatus, [string, Tone]> = { meets: ['Meets the level', 'good'], gap: ['Gap to close', 'weak'], unconfirmed: ['To confirm', 'unknown'], move: ['Needs a sovereign offering', 'bad'] };
const platformName = (p: string) => PLATFORM_LABELS[p] ?? p;
const AVAILABILITY: Record<string, string> = { preview: 'preview', announced: 'announced, not yet available', per_engagement: 'per engagement' };
const optionText = (o: LadderOption) => o.name + (AVAILABILITY[o.availability] ? ` (${AVAILABILITY[o.availability]})` : '') + (o.caveat ? `: ${o.caveat}` : '');
const rungName = (id: string) => `${id} ${LADDER.rungs.find(x => x.id === id)?.label ?? ''}`.trim();
const actionSegs = (a: AdvisoryAction): Seg[] => [strong(`${a.action}.`), ' ', { text: a.approach, cite: a.claimIds }, '.',
  ...(a.options.length ? ['\nOptions: ', { text: a.options.map(o => o.name).join('; '), cite: a.claimIds }, a.confirmRegionalAvailability ? ' (confirm availability in your regions)' : ''] : []),
  '\nCheck: ', a.verification];

/**
 * PLAN S7: where each kind of data should sit on AWS, Azure or Google Cloud, then the actions by platform. Only when it
 * applies (owner, 26 Oct 2026): "Sovereign cloud advisory" when data at L1 or above sits on a hyperscaler, "Platform
 * actions" when only other platforms have actions, and no section otherwise.
 */
function advisorySection(c: Ctx): ReportSection | null {
  const a = c.r.advisory;
  const ids = new Set(c.findings.map(f => f.id));
  const keep = <T extends { claimIds: string[] }>(xs: T[]) => (c.client ? xs.filter(clientCleared) : xs);
  const actions = (xs: AdvisoryAction[]) => keep(xs).filter(x => ids.has(x.findingId));
  if (!a.placement.length && !actions(a.technical).length) return null;
  const blocks: Block[] = [];
  if (a.placement.length) {
    blocks.push({ kind: 'paragraph', segs: ['For each kind of data held on AWS, Microsoft Azure or Google Cloud, the placement ladder gives the lowest rung its required level needs. Each rung adds controls to the one below; R3 and R4 need an offering run in the allowed region when the provider is based outside it. The ladder changes the advice, not the maturity score.'] });
    const n = (s: PlacementStatus) => a.placement.filter(p => p.status === s).length;
    blocks.push({ kind: 'kpis', items: (['meets', 'gap', 'unconfirmed', 'move'] as PlacementStatus[]).map(s => ({ label: PLACEMENT[s][0], value: [count(`advisory.placement[${s}]`, n(s))], note: [`of ${a.placement.length} placements`] })) });
    blocks.push({ kind: 'list', small: true, items: LADDER.rungs.map(r => [strong(`${r.id} ${r.label} (${r.level}): `), r.means]) });
    blocks.push({ kind: 'subheading', text: 'Placement matrix' });
    blocks.push({ kind: 'heatmap', rows: a.placement.map(p => ({ label: `${className(p.dataClass)} · ${platformName(p.platform)}`, cells: [{ label: rungName(p.minimumRung), note: PLACEMENT[p.status][0].toLowerCase(), tone: PLACEMENT[p.status][1] }] })),
      legend: (Object.keys(PLACEMENT) as PlacementStatus[]).map(k => ({ tone: PLACEMENT[k][1], label: PLACEMENT[k][0] })) });
    const open = a.placement.filter(p => p.status !== 'meets');
    if (open.length) {
      blocks.push({ kind: 'subheading', text: 'What to do' });
      blocks.push({ kind: 'table', small: true, head: ['Data and platform', 'Next move', 'Actions'], widths: [95, 150, '*'], rows: open.map(p => {
        const options = keep(p.options), alts = keep(p.alternatives);
        const move: Seg[] = [`Needs ${rungName(p.minimumRung)} for ${p.allowedZone.length ? p.allowedZone.map(zone).join(', ') : 'any region'}.`,
          ...(p.confirmOperatingModel ? [' Confirm who operates and supports these services: standard regions of a provider based outside the region.'] : []),
          ...(options.length ? ['\nOptions:', { text: options.map(o => `\n• ${optionText(o)}`).join(''), cite: options.flatMap(o => o.claimIds) }] : []),
          ...(keep(p.r4Facts).length ? ['\nFacts for counsel: ', { text: keep(p.r4Facts).map(f => `${f.name}: owner ${f.owner}; operator ${f.operator}; law ${f.operatorLaw}; technology ${f.technologySupplier}`).join(' | '), cite: keep(p.r4Facts).flatMap(f => f.claimIds) }, ` ${COUNSEL_NOTE}`] : []),
          ...(p.noOfferingZones.length ? [`\nNo option at ${p.minimumRung} listed for ${p.noOfferingZones.map(zone).join(', ')}.`, ...(alts.length ? [' Alternatives:', { text: alts.map(x => `\n• ${'provider' in x ? `${platformName(x.provider)}: ` : ''}${x.name}`).join(''), cite: alts.flatMap(x => x.claimIds) }] : [])] : [])];
        const acts = actions(p.actions);
        return [[strong(className(p.dataClass)), '\n', platformName(p.platform), '\n', PLACEMENT[p.status][0]], move, acts.length ? acts.flatMap((x, i) => [...(i ? ['\n\n'] : []), ...actionSegs(x)]) : ['See the findings.']];
      }) });
    }
  }
  const tech = actions(a.technical);
  const platforms = [...new Set(tech.map(x => x.platform))];
  if (platforms.length) {
    if (!a.placement.length) blocks.push({ kind: 'paragraph', segs: ['Every gap with a technical remedy, on each platform that holds the affected data.'] });
    else blocks.push({ kind: 'subheading', text: 'Actions by platform' });
    blocks.push({ kind: 'table', small: true, head: ['Platform', 'Action', 'Owner'], widths: [90, '*', 90], rows: platforms.flatMap(pl => tech.filter(x => x.platform === pl).map(x => [[platformName(pl)], actionSegs(x), [x.ownerRole]])) });
  }
  if (!c.client && a.gaps.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Playbook gaps (consultant edition): ', a.gaps.map(g => `${CONTROL.get(g.control)?.name ?? g.control} on ${g.platforms.map(platformName).join(', ')}`).join('; '), '.'] });
  blocks.push({ kind: 'callout', tone: 'info', segs: [a.statement] });
  return { id: 'advisory', title: a.placement.length ? 'Sovereign cloud advisory' : 'Platform actions', blocks };
}

function roadmap(c: Ctx): ReportSection {
  const ids = new Set(c.findings.map(f => f.id));
  const names: Record<number, string> = { 1: 'Wave 1: decide, confirm and close critical gaps', 2: 'Wave 2: high-severity gaps', 3: 'Wave 3: medium-severity gaps', 4: 'Wave 4: lower-severity gaps and upcoming obligations' };
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Waves follow severity, then dependencies: what a control needs is scheduled in the same wave or earlier (a data map before transfers and location, key custody before key revocation, region enforcement before moving data).'] }];
  for (const w of c.r.roadmap) {
    const fs = w.findings.filter(id => ids.has(id)).map(id => c.findings.find(f => f.id === id)!);
    if (!fs.length) continue;
    blocks.push({ kind: 'subheading', text: names[w.wave] ?? `Wave ${w.wave}` });
    blocks.push({ kind: 'table', small: true, head: ['Action', 'Severity', 'Owner', 'Time frame'], widths: ['*', 50, 100, 70], rows: fs.map(f => [[strip(f.title)], [f.severity], [f.ownerRole], [quote(f.timeFrame)]]) });
  }
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

/** PLAN S8: advice on what to do next and who could do it; type, purpose and outline only (no scope, no price). */
function helpSection(c: Ctx): ReportSection {
  const ids = new Set(c.findings.map(f => f.id));
  const help = c.r.help.map(h => ({ ...h, findingIds: h.findingIds.filter(id => ids.has(id)) })).filter(h => h.findingIds.length);
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['What could help with the findings, and the kind of work each is. Providers are chosen from your requirements, with alternatives (see the sovereign cloud advisory).'] }];
  if (!help.length) blocks.push({ kind: 'paragraph', segs: ['No finding calls for further work.'] });
  for (const h of help) {
    blocks.push({ kind: 'subheading', text: `${h.offering.name} (${h.offering.typeLabel})` });
    blocks.push({ kind: 'paragraph', segs: [{ text: h.offering.purpose, cite: h.claimIds }, ' ', { text: `Delivered by: ${h.offering.practice}.`, cite: h.claimIds, italic: true }] });
    if (h.offering.outline.length) blocks.push({ kind: 'list', small: true, items: h.offering.outline.map(o => [{ text: o, cite: h.claimIds }]) });
    blocks.push({ kind: 'paragraph', style: 'small', segs: [strong('For: '), h.findingIds.map(id => strip(c.findings.find(f => f.id === id)!.title)).join('; '), '.'] });
  }
  return { id: 'help', title: 'How LTM can help', blocks };
}

/** Consultant-only SOW draft (S8): offerings with indicative scope and the findings behind each. Never in the client edition. */
function sowAppendix(c: Ctx): ReportSection {
  const { lines, routes } = sovereignSow(c.findings, c.r.advisory.placement);
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Draft for discussion, subject to contract: not an offer or a quotation. Indicative scope is an LTM heuristic to be agreed per engagement.'] }];
  blocks.push({ kind: 'table', small: true, head: ['Offering', 'Type', 'Indicative scope', 'Findings'], widths: ['*', 90, 70, 150],
    rows: lines.map(l => [[l.offering.name], [l.offering.type], [{ text: l.offering.indicativeScope ?? '—', cite: OFFERINGS.claimIds }], [ref(l.findingIds.join(', '))]]) });
  if (routes.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Routed to other accelerators: ', routes.map(r => `${r.offering.name} (${r.findingIds.join(', ')})`).join('; '), '.'] });
  return { id: 'sow', title: 'Statement of work draft', appendix: true, blocks };
}

function methodology(c: Ctx): ReportSection {
  const v = c.r.versions;
  return { id: 'methodology', title: 'Methodology', blocks: [
    { kind: 'paragraph', segs: ['Scope answers (footprint, entities, data, platforms) decide which regulations apply, through rules held as data in a sourced regulation registry: the first rule that matches grades each regulation applies, likely – confirm, advisory or not applicable. Scope answers are never scored.'] },
    { kind: 'paragraph', segs: ['Each kind of data gets a required level, L0 to L4: the higher of any legal localisation minimum and the board\'s choice. Every control that level needs, plus every control a regulation in scope requires, is rated from the maturity answers. Maturity is the weighted share of those controls in place, shown only when at least five controls are required. "Unknown" counts as not in place; an unanswered control counts as not in place and is listed as not answered. Provider nationality matters only at L4.'] },
    { kind: 'paragraph', segs: ['Statutory maximums come from the cited articles: computed from the worldwide turnover given, as a range from the turnover band otherwise, or not quantified without it. Currency conversions use the dated ECB reference rates in the claims register. Caps are never added together.'] },
    { kind: 'paragraph', style: 'small', segs: ['Versions: ', ref(`engine ${v.engine} · questions ${v.questionSet} · controls ${v.controls} · regulation registry ${v.registry} (status as of ${v.registryStatusAsOf}) · claims register ${v.claimsRegister}`)] }
  ] };
}

function sourcesAppendix(ids: string[], c: Ctx): Block[] {
  const rows = ids.map(id => CLAIM.get(id)).filter(Boolean).filter(cl => !c.client || cl.clientVisible !== false);
  if (!rows.length) return [{ kind: 'paragraph', segs: ['No sources are cited.'] }];
  return [
    { kind: 'paragraph', style: 'small', segs: ['Every regulatory statement in this report cites the sources below, from the LTM claims register. Each is reviewed by its review date; volatile items (pending laws, status changes) every 90 days.'] },
    { kind: 'table', small: true, head: c.client ? ['Source', 'Publisher', 'Checked'] : ['ID', 'Source', 'Publisher', 'Grade', 'Checked'], widths: c.client ? ['*', 110, 55] : [55, '*', 95, 35, 55], rows: rows.map(cl => c.client
      ? [[quote(cl.source?.title ?? cl.statement?.slice(0, 120) ?? '')], [cl.source?.publisher ?? ''], [ref(cl.checkedOn ?? '')]]
      : [[ref(cl.id)], [quote(cl.source?.title ?? ''), ' ', ref(cl.source?.url ?? '')], [cl.source?.publisher ?? ''], [ref(cl.verification ?? '')], [ref(cl.checkedOn ?? '')]]) }
  ];
}

function consultantAppendix(c: Ctx): ReportSection {
  const { r } = c;
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Not part of the client edition.'] }];
  const na = r.regimes.filter(g => g.grade === 'not_applicable');
  blocks.push({ kind: 'subheading', text: 'Regulations checked that do not apply' });
  blocks.push({ kind: 'table', small: true, head: ['Regulation', 'Rule', 'Why'], widths: [110, 75, '*'], rows: na.map(g => [[g.name], [ref(g.rule ?? 'default')], [quote(g.reason, g.claims)]]) });
  const hidden = r.regimes.filter(g => g.consultantOnly && g.grade !== 'not_applicable');
  if (hidden.length || r.pendingSource.length) {
    blocks.push({ kind: 'subheading', text: 'Pending a source (hidden from the client)' });
    blocks.push({ kind: 'list', small: true, items: [
      ...hidden.map(g => [strong(g.name), ': ', quote(g.reason, g.claims), ' ', ref(`[${g.rule}]`)]),
      ...r.pendingSource.map(p => [strong(regimeName(r, p.regime)), ': requirement for ', CONTROL.get(p.control)?.name ?? p.control, ' pending a source; not scored'])
    ] });
  }
  if (r.notes.length) { blocks.push({ kind: 'subheading', text: 'Engine notes' }); blocks.push({ kind: 'list', small: true, items: r.notes.map(n => [quote(n)]) }); }
  if (r.ignoredAnswers.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Answers not asked in this mode (kept, not scored): ', ref(r.ignoredAnswers.join(', ')), '.'] });
  if (c.opts.notes) { blocks.push({ kind: 'subheading', text: 'Consultant notes' }); blocks.push({ kind: 'paragraph', style: 'small', segs: [quote(c.opts.notes)] }); }
  return { id: 'consultant', title: 'Consultant checks', appendix: true, blocks };
}

/* -------------------------------- Document -------------------------------- */

export function sovereignIqReport(result: SovereignIqV4Result, opts: SovereignReportOptions): ReportDocument {
  const client = opts.view === 'client';
  const shownRegimes = new Set(result.regimes.filter(g => g.grade !== 'not_applicable' && !(client && g.consultantOnly)).map(g => g.regime));
  const findings = result.findings.filter(f => !client || !f.consultantOnly);
  const c: Ctx = { r: result, client, opts, shownRegimes, findings };
  const doc: ReportDocument = {
    meta: {
      platform: PLATFORM, product: PRODUCT, title: 'Data sovereignty and compliance exposure report',
      subtitle: result.mode === 'executive' ? 'Executive assessment: which regulations apply, how exposed are we, and do our controls meet the level our data needs?' : 'Workshop assessment: requirement per kind of data, every control, and a ranked roadmap',
      client: opts.client, preparedBy: opts.preparedBy, dataProvidedBy: opts.dataProvidedBy, date: result.assessmentDate,
      version: `Sovereign IQ engine ${result.versions.engine} · regulation registry ${result.versions.registry}`, view: opts.view,
      footer: `${PLATFORM} · ${PRODUCT} · Confidential`,
      status: `Internal consultant use until the legal review. Not legal advice. AI narrative: ${opts.narrative ? `included, labelled (${opts.narrative.modelId})` : opts.aiEnabled ? 'on, none included' : 'off'}.`
    },
    sections: [summary(c), ...[narrativeSection(c)].filter((s): s is ReportSection => !!s), requirement(c), sealSection(c), maturity(c), exposure(c), findingsSection(c), ...[advisorySection(c)].filter((s): s is ReportSection => !!s), roadmap(c), helpSection(c), methodology(c)]
  };
  const claims = new Set<string>();
  for (const s of doc.sections) for (const b of s.blocks) {
    const runs: Seg[][] = b.kind === 'paragraph' || b.kind === 'callout' ? [b.segs] : b.kind === 'list' ? b.items : b.kind === 'table' ? b.rows.flat() : b.kind === 'kpis' ? b.items.flatMap(i => [i.value, ...(i.note ? [i.note] : [])]) : b.kind === 'steps' ? b.rows.map(i => i.shown) : b.kind === 'bars' ? b.items.map(i => i.shown) : [];
    for (const run of runs) for (const seg of run) if (typeof seg !== 'string') { seg.cite?.forEach(id => claims.add(id)); seg.trace?.claimIds.forEach(id => claims.add(id)); }
  }
  doc.sections.push({ id: 'sources', title: 'Sources', appendix: true, blocks: sourcesAppendix([...claims].sort(), c) });
  if (!client) doc.sections.push(sowAppendix(c), consultantAppendix(c));
  return doc;
}

/** The backlog CSV: one row per finding, in roadmap order, with its platforms, placement rung and checks (S7). */
export function sovereignIqBacklog(result: SovereignIqV4Result, view: 'client' | 'consultant' = 'consultant'): Backlog {
  const fs = result.findings.filter(f => view === 'consultant' || !f.consultantOnly);
  const order = new Map(result.roadmap.flatMap(w => w.findings).map((id, i) => [id, i]));
  const a = result.advisory;
  const acts = (id: string) => a.technical.filter(x => x.findingId === id && (view === 'consultant' || clientCleared(x)));
  const rungs = (id: string) => [...new Set(a.placement.filter(p => p.findingIds.includes(id)).map(p => p.minimumRung))].sort();
  const join = (xs: string[]) => [...new Set(xs)].join('; ');
  return {
    header: ['ID', 'Wave', 'Severity', 'Type', 'Action', 'Why', 'Control', 'Data', 'Regulations', 'Owner', 'Time frame', 'Platforms', 'Placement rung', 'Service families', 'Verification'],
    rows: [...fs].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).map(f => [
      f.id, f.wave, f.severity, f.type, strip(f.title), strip(f.businessConsequence), f.control ?? '', f.dataClasses.map(className).join('; '),
      f.regimes.map(x => regimeName(result, x.regime)).join('; '), f.ownerRole, f.timeFrame,
      join(acts(f.id).map(x => platformName(x.platform))), rungs(f.id).join('; '), join(acts(f.id).flatMap(x => x.serviceFamilies ?? []).map(s => s.replace(/_/g, ' '))),
      join(acts(f.id).map(x => `${platformName(x.platform)}: ${x.verification}`))
    ])
  };
}
