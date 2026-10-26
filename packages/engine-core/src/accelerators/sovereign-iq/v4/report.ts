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
import { traced, walkSegments } from '../../../report/model';
import assumptionData from './assumptions.json' with { type: 'json' };
import deliveryData from './delivery.json' with { type: 'json' };
import fx from './exchange-rates.json' with { type: 'json' };
import catalogue from './controls.json' with { type: 'json' };
import registerData from '../../../claims/claims-register.json' with { type: 'json' };
import { CONTROLS, REGIMES, type Finding, type SovereignIqV4Result, type State } from './evaluate';
const ASM: any[] = (assumptionData as any).assumptions;
const ASM_BASIS: Record<string, string> = (assumptionData as any).basisValues;
const EFFORT: Record<string, string> = (deliveryData as any).effortBands;
import { DATA_CLASS_LABELS, LEVEL_LABELS, NOTICES, PLATFORM_LABELS, ZONE_LABELS } from './public-schema';
import { SEAL } from './seal';
import { OFFERINGS, sovereignSow } from './help';
import { LADDER, COUNSEL_NOTE, clientCleared, type AdvisoryAction, type LadderOption, type PlacementStatus } from './advisory';

const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'Sovereign IQ';
const CLAIM = new Map<string, any>((registerData as any).claims.map((c: any) => [c.id, c]));
const CONTROL = new Map<string, any>(CONTROLS.map(c => [c.id, c]));
const WORD: Record<string, string> = { 3: 'In place', 2: 'Largely in place', 1: 'Partly in place', 0: 'Not in place', unknown: 'Unconfirmed', not_answered: 'Not answered' };
/** S10 W6 and W9: groups and ratings that state the scope test and the control gaps, not a legal conclusion. Internal IDs unchanged. */
const GRADE: Record<string, string> = { applies: 'Applies on your answers', likely_confirm: 'May apply – confirm', advisory: 'For awareness', not_applicable: 'Does not apply on your answers' };
const RAG: Record<string, string> = { red: 'Major gaps', amber: 'Some gaps', green: 'No gaps found', not_rated: 'Not rated' };
const MARKET: Record<string, string> = { eu_uk: 'EU and UK', us: 'United States', apac: 'Asia-Pacific' };
/** Backlog values a spreadsheet reader recognises (S6 challenge D11). */
const TYPE_LABEL: Record<string, string> = { control_gap: 'Control gap', scope_confirmation: 'Confirm scope', conflict: 'Resolve conflicting answers', decision: 'Board decision' };
const SERVICE_LABEL: Record<string, string> = {
  storage_backup: 'Storage and backup', databases: 'Databases', analytics: 'Analytics', ai_ml: 'AI and machine learning',
  compute_containers: 'Compute and containers', identity_keys: 'Identity and keys', collaboration_saas: 'Collaboration SaaS'
};
/** An option from the client's view: shown with its note; an option whose source is still being verified keeps its name with "status to confirm" (S6 challenge D5). */
const STATUS_TO_CONFIRM = 'status to confirm with the provider';

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
  if (cap.amount != null) return [...(cap.atLeast ? ['at least '] : []), traced(`${field}.amount`, cap.amount, 'currency', claims, [], cap.currency)];
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
    count('regimes[likely_confirm]', n('likely_confirm')), ' may ', 'apply and should be confirmed with counsel, and ',
    count('regimes[advisory]', n('advisory')), ' ', plural(n('advisory'), 'is', 'are'), ' for awareness. ',
    m.score != null ? ['Your controls score ', traced('maturity.score', m.score, 'index', []), ' out of 100 against the level your data requires: ', m.band!.toLowerCase(), '.', bandWithheld(c) ? ` ${bandWithheld(c)}` : ''] as any : [m.wording, '.'],
    ' Two headlines are reported and never blended: how well your controls meet the sovereignty level your data needs, and how exposed you are under each regulation.'
  ].flat() });
  blocks.push({ kind: 'kpis', items: [
    { label: 'Control maturity', value: m.score != null ? [traced('maturity.score', m.score, 'index', []), ' / 100'] : ['No score'], note: [m.score != null ? `${m.band!}${bandWithheld(c) ? ' (top band withheld)' : ''}` : 'Too few controls required for a reliable number'] },
    { label: 'Regulations in scope', value: [count('regimes[in_scope]', n('applies') + n('likely_confirm') + n('advisory'))], note: [count('regimes[applies]', n('applies')), ' apply · ', count('regimes[likely_confirm]', n('likely_confirm')), ' to confirm'] },
    { label: 'Control gaps by regulation', value: [count('exposure[red]', rag('red')), ' major'], note: [count('exposure[amber]', rag('amber')), ' some gaps · ', count('exposure[green]', rag('green')), ' none found'] },
    { label: 'Largest statutory cap', value: cap ? capSegs(cap, 'exposure.largestCap') : ['Not quantified'], note: cap ? [quote(`${regimeName(r, cap.regime)} ${cap.article}${cap.grade === 'likely_confirm' ? ' (may apply – confirm)' : ''}`), '; cap, not expected fine', ...(r.exposure.regimes.some(e => e.cap?.atLeast && c.shownRegimes.has(e.regime)) ? ['; largest of the amounts that can be computed: some maximums rest on a turnover not collected'] : [])] : [r.exposure.capNote] },
    { label: 'Findings', value: [count('findings', c.findings.length)], note: [count('findings[Critical]', sev('Critical')), ' critical · ', count('findings[High]', sev('High')), ' high'] }
  ] });
  const top = r.topGaps.filter(f => !c.client || !f.consultantOnly);
  if (top.length) {
    blocks.push({ kind: 'subheading', text: 'Where to start' });
    blocks.push({ kind: 'table', head: ['Severity', 'Action', 'Owner', 'Start and duration'], widths: [50, '*', 100, 80], rows: top.map(f => [[f.severity], [strong(strip(f.title)), '\n', quote(f.businessConsequence, f.sources)], [f.ownerRole], [quote(f.timeFrame)]]) });
  }
  const confirm = c.findings.filter(f => f.type === 'scope_confirmation' || f.type === 'decision' || f.type === 'conflict');
  if (confirm.length) {
    blocks.push({ kind: 'subheading', text: 'Decisions and confirmations' });
    blocks.push({ kind: 'list', items: confirm.map(f => [strong(strip(f.title) + ': '), quote(f.businessConsequence, f.sources)]) });
  }
  blocks.push({ kind: 'callout', tone: 'warn', title: 'Not legal advice', segs: [`An indicative assessment from self-reported answers, as at ${NOTICES.statedAt}. It is not legal advice and is not a substitute for advice from a qualified lawyer; confirm which laws apply and what they require with your counsel before acting. ${NOTICES.caps}`] });
  return { id: 'summary', title: 'Executive summary', blocks };
}

const regimeName = (r: SovereignIqV4Result, id: string) => r.regimes.find(g => g.regime === id)?.name ?? id;

/** S6 re-test N2: why a score of 80 or more reads Managed. */
function bandWithheld(c: Ctx): string {
  const m = c.r.maturity;
  if (m.score == null || m.score < 80 || m.band === 'Sovereign-ready') return '';
  return c.findings.some(f => f.severity === 'Critical')
    ? 'Sovereign-ready (80 and above) is withheld while a finding is critical.'
    : 'Sovereign-ready (80 and above) is withheld while a regulation in scope has major control gaps.';
}

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
  const floorShown = (q: SovereignIqV4Result['requirements'][number]) => !!q.floor && !(c.client && q.floor.consultantOnly);
  blocks.push({ kind: 'table', head: ['Data', 'Required level', 'Legal minimum', 'Allowed regions', 'Set by'], widths: [90, 130, 120, '*', 90], rows: r.requirements.map(q => [
    [className(q.dataClass)], [ref(LEVEL_LABELS[q.required] ?? q.required)],
    [floorShown(q) ? quote(`${q.floor!.level}: ${regimeName(r, q.floor!.regime)}${q.floor!.provisional ? ' (provisional – confirm)' : ''}`) : 'L0: the registry holds no localisation requirement for this data in your markets'],
    [q.allowedZone.length ? q.allowedZone.map(zone).join(', ') : 'No restriction'],
    [q.tender && q.tender === q.required ? 'EU tender minimums' : floorShown(q) && q.floor!.level === q.required ? 'Law' : q.choice && q.choice !== 'unknown' ? 'Board choice' : 'Legal minimum only']
  ]) });
  blocks.push({ kind: 'list', small: true, items: Object.entries(LEVEL_LABELS).map(([k, v]) => [ref(v)]) });
  // S6 challenge Q5: where the board's choice sets the level, what one level lower would leave out.
  const lower = r.requirements.filter(q => q.required !== 'L0' && q.choice === q.required && !(floorShown(q) && q.floor!.level === q.required) && q.tender !== q.required).map(q => {
    // A finding would not arise only if no regulation and no other kind of data still needs the control (S6 re-test N1).
    const only = c.findings.filter(f => {
      if (f.type !== 'control_gap' || !f.control || CONTROL.get(f.control)?.level !== q.required || !f.dataClasses.includes(q.dataClass)) return false;
      const x = r.controls.find(y => y.control === f.control);
      if (!x || x.requiredBy.regimes.some(g => c.shownRegimes.has(g.regime))) return false;
      const others = (x.scope === 'class' ? f.dataClasses : x.requiredBy.levels).filter(k => k !== q.dataClass);
      return !others.length;
    });
    return { q, only };
  }).filter(x => x.only.length);
  if (lower.length) {
    blocks.push({ kind: 'subheading', text: 'What a lower level would change' });
    blocks.push({ kind: 'list', small: true, items: lower.map(({ q, only }) => {
      const to = `L${Number(q.required.slice(1)) - 1}`;
      return [strong(`${className(q.dataClass)} at ${to} instead of ${q.required}: `), `these findings would not arise: ${only.map(f => strip(f.title).replace(/^\w/, ch => ch.toLowerCase())).join('; ')}.`];
    }) });
  }
  return { id: 'requirement', title: 'Required sovereignty level', blocks };
}

const sealName = (n: number | null | undefined) => (n == null ? '—' : `SEAL-${n}`);

/** PLAN S7b: the minimum provider SEAL per objective for each kind of data, the controls behind each objective. */
function sealSection(c: Ctx): ReportSection {
  const v = c.r.seal;
  const mapped = SEAL.objectives.filter(o => o.mapped);
  const short = (name: string) => name.replace(/ sovereignty$/, '');
  const blocks: Block[] = [{ kind: 'paragraph', segs: [{ text: SEAL.intro, cite: SEAL.claimIds }, ' This view uses an LTM mapping from the required level, not the Commission\'s, and is not a SEAL assessment or certification.'] }];
  // S6 challenge D10: say why an EU scale is shown to a client with no EU footprint.
  const f = c.r.facts, has = (k: string) => Array.isArray(f[k]) && (f[k] as string[]).includes('eea');
  if (!(f['org.hq'] === 'eea' || has('org.establishments') || has('data.subject_regions') || v.tender)) blocks.push({ kind: 'paragraph', style: 'note', segs: ['You have no EU establishment or EU customers on your answers. The scale is shown as a common vocabulary for comparing sovereign cloud offerings; it does not apply to you directly.'] });
  blocks.push({ kind: 'list', small: true, items: SEAL.levels.map(l => [strong(`SEAL-${l.id} ${l.name}: `), { text: l.plain, cite: SEAL.claimIds }, ...(l.note ? [` (${l.note})`] : [])]) });
  if (v.byClass.length) {
    blocks.push({ kind: 'subheading', text: 'Provider SEAL that matches the level you set, by objective (LTM mapping)' });
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
  const rows: Array<[string | null, string]> = [['L1', 'Residency (L1)'], ['L2', 'Access and keys (L2)'], ['L3', 'Operational (L3)'], ['L4', 'Jurisdictional (L4)'], [null, 'Linked to regulations']];
  const heat = rows.map(([lv, label]) => ({ label, cells: r.controls.filter(x => (CONTROL.get(x.control)?.level ?? null) === lv).map(x => ({ label: x.name, note: word(x.state).toLowerCase(), tone: tone(x.state) })) })).filter(x => x.cells.length);
  if (heat.length) {
    blocks.push({ kind: 'subheading', text: 'Control heatmap' });
    blocks.push({ kind: 'heatmap', rows: heat, legend: [{ tone: 'good', label: 'In place' }, { tone: 'partial', label: 'Largely' }, { tone: 'weak', label: 'Partly' }, { tone: 'bad', label: 'Not in place' }, { tone: 'unknown', label: 'Unconfirmed or not answered' }] });
  }
  blocks.push({ kind: 'subheading', text: 'Required controls' });
  blocks.push({ kind: 'table', small: true, head: ['Control', 'State', 'Why it is needed', 'Owner'], widths: ['*', 70, 150, 90], rows: r.controls.map(x => {
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
  const blocks: Block[] = [{ kind: 'paragraph', segs: [quote(r.exposure.summary), ' Each regulation\'s rating shows how the controls in this assessment that are linked to it stand: major gaps when a critical or high-weight linked control is absent, unconfirmed or not answered; some gaps when any is below full; no gaps found when all are in place. It is not a finding that you comply or do not comply with the regulation. Regulations that place no duty on you (foreign-access laws, schemes, pending bills) are not rated.'] }];
  const byMarket = Object.keys(MARKET).map(mk => ({ label: MARKET[mk], cells: exp.filter(e => r.regimes.find(g => g.regime === e.regime)?.market === mk).map(e => {
    const g = r.regimes.find(x => x.regime === e.regime)!;
    return { label: g.name, note: `${GRADE[g.grade].toLowerCase()} · ${RAG[e.rag].toLowerCase()}`, tone: (e.rag === 'red' ? 'bad' : e.rag === 'amber' ? 'partial' : e.rag === 'green' ? 'good' : 'unknown') as Tone };
  }) })).filter(x => x.cells.length);
  if (byMarket.length) {
    blocks.push({ kind: 'subheading', text: 'Exposure by market' });
    blocks.push({ kind: 'heatmap', rows: byMarket, legend: [{ tone: 'bad', label: 'Major gaps' }, { tone: 'partial', label: 'Some gaps' }, { tone: 'good', label: 'No gaps found' }, { tone: 'unknown', label: 'Not rated' }] });
  }
  const order: Record<string, number> = { applies: 0, likely_confirm: 1, advisory: 2 };
  blocks.push({ kind: 'subheading', text: 'Regulations in scope' });
  blocks.push({ kind: 'table', small: true, head: ['Regulation', 'Group', 'Why', 'Control gaps', 'Statutory maximum'], widths: [90, 55, '*', 45, 110], rows: [...exp].sort((a, b) => order[a.grade] - order[b.grade]).map(e => {
    const g = r.regimes.find(x => x.regime === e.regime)!;
    const cap: Seg[] = e.cap ? [...capSegs(e.cap, `exposure.regimes[${e.regime}].cap`), ' ', quote(`(${e.cap.article}${e.cap.qualifier ? `; ${e.cap.qualifier}` : ''})`)]
      : [quote(e.penaltyModel === 'not_applicable_to_client' ? 'No penalty on you' : g.grade === 'advisory' ? 'No direct penalty on you (advisory)' : e.penaltyModel === 'national' ? 'Set by national law' : e.penaltyModel === 'per_violation' ? 'Per violation' : 'Not quantified')];
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
    const na = r.regimes.filter(g => g.grade === 'not_applicable').length;
    if (na) blocks.push({ kind: 'paragraph', style: 'note', segs: [count('regimes[not_applicable]', na), ' other regulations were checked and do not apply on your answers; they are listed, with the reason, in the appendix "Regulations checked that do not apply".'] });
    if (others > na) blocks.push({ kind: 'paragraph', style: 'note', segs: [count('regimes[pending]', others - na), ` ${plural(others - na, 'regulation rests', 'regulations rest')} on a source still being verified and ${plural(others - na, 'is', 'are')} not shown in this edition.`] });
  }
  return { id: 'exposure', title: 'Compliance exposure', blocks };
}

function findingsSection(c: Ctx): ReportSection {
  const blocks: Block[] = [];
  if (!c.findings.length) return { id: 'findings', title: 'Findings', blocks: [{ kind: 'paragraph', segs: ['No findings: every required control is in place.'] }] };
  blocks.push({ kind: 'paragraph', segs: ['Findings come from gaps only: a required control below full, unconfirmed or not answered; a regulation to confirm; contradictory answers; or a decision for the board. None is raised for provider nationality alone.'] });
  blocks.push({ kind: 'table', small: true, head: ['Severity', 'Finding', 'Owner', 'Start and duration'], widths: [48, '*', 95, 75], rows: c.findings.map(f => [
    [f.severity], [strong(strip(f.title)), '\n', quote(f.businessConsequence, f.sources), ...(f.referral ? [' Verify in ', f.referral, '.'] : [])], [f.ownerRole], [quote(f.timeFrame)]
  ]) });
  return { id: 'findings', title: 'Findings', blocks };
}

const PLACEMENT: Record<PlacementStatus, [string, Tone]> = { meets: ['Meets the level', 'good'], gap: ['Gap to close', 'weak'], unconfirmed: ['To confirm', 'unknown'], move: ['Needs a sovereign offering', 'bad'] };
const platformName = (p: string) => PLATFORM_LABELS[p] ?? p;
const AVAILABILITY: Record<string, string> = { preview: 'preview', announced: 'announced, not yet available', per_engagement: 'per engagement' };
const optionText = (o: LadderOption) => o.name + (AVAILABILITY[o.availability] ? ` (${AVAILABILITY[o.availability]})` : '') + (o.caveat ? `: ${o.caveat}` : '');
const playbookOptionText = (o: AdvisoryAction['options'][number]) => o.name + (o.note ? ` (${o.note})` : '');
const rungName = (id: string) => `${id} ${LADDER.rungs.find(x => x.id === id)?.label ?? ''}`.trim();
const actionSegs = (a: AdvisoryAction): Seg[] => [strong(`${a.action}.`), ' ', { text: a.approach, cite: a.claimIds }, '.',
  ...(a.options.length ? ['\nOptions: ', { text: a.options.map(playbookOptionText).join('; '), cite: a.claimIds }, a.confirmRegionalAvailability ? ' (confirm availability in your regions)' : ''] : []),
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
        // Client edition: an option still being verified keeps its name with a status note, without the uncleared detail (D5).
        const options = c.client ? p.options.map(o => (clientCleared(o) ? o : { ...o, caveat: STATUS_TO_CONFIRM, claimIds: [] })) : p.options;
        const alts = keep(p.alternatives);
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

const WAVE_NAME: Record<string, string> = { decide: 'decide, confirm and close critical gaps', high: 'high-severity gaps', medium: 'medium-severity gaps', later: 'lower-severity gaps and upcoming obligations' };

/**
 * S6 challenge Q7 and D4: a delivery-grade roadmap. Waves are numbered over those the edition shows; each action has its
 * owner, start and duration, effort, what it waits for, its milestone and KPI; each wave lists its key risks.
 */
function roadmap(c: Ctx): ReportSection {
  const ids = new Set(c.findings.map(f => f.id));
  const byId = new Map(c.findings.map(f => [f.id, f]));
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Severity sets when each action starts; the type of work sets its effort and how long it takes. An action that depends on another starts once that one is expected to reach its milestone (the end of its duration). Month 1 is the first month of the programme. Effort: ', Object.entries(EFFORT).map(([k, v]) => `${k} ${v.toLowerCase()}`).join('; '), '. Durations and effort are LTM planning estimates (assumptions ASM-SOV-012 and 013) that discovery and a statement of work replace.'] }];
  let n = 0;
  for (const w of c.r.roadmap) {
    const fs = w.findings.filter(id => ids.has(id)).map(id => byId.get(id)!);
    if (!fs.length) continue;
    blocks.push({ kind: 'subheading', text: `Wave ${++n}: ${WAVE_NAME[w.theme] ?? ''}` });
    blocks.push({ kind: 'table', small: true, head: ['Action', 'Owner', 'Start and duration', 'Effort', 'Milestone and KPI'], widths: ['*', 80, 75, 32, 150], rows: fs.map(f => {
      const after = f.dependsOn.filter(id => ids.has(id)).map(id => strip(byId.get(id)!.title));
      return [[strong(strip(f.title)), ...(after.length ? ['\nAfter: ', after.join('; ')] : [])], [f.ownerRole], [quote(f.timeFrame)], [f.effort], [f.milestone, '\nKPI: ', f.kpi]];
    }) });
    const risks = [...new Set(fs.map(f => f.risk).filter(Boolean))];
    if (risks.length) blocks.push({ kind: 'list', small: true, items: [[strong('Key risks: '), risks.join('; '), '.']] });
  }
  return { id: 'roadmap', title: 'Roadmap', blocks };
}

/** PLAN S8: advice on what to do next and who could do it; type, purpose and outline only (no scope, no price). */
function helpSection(c: Ctx): ReportSection {
  const ids = new Set(c.findings.map(f => f.id));
  const help = c.r.help.map(h => ({ ...h, findingIds: h.findingIds.filter(id => ids.has(id)) })).filter(h => h.findingIds.length);
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['Each item below can be delivered by your own teams or by another firm; the findings and the roadmap do not depend on it. Where LTM could help, this is the kind of work and how it would be done. Providers are chosen from your requirements, with alternatives (see the sovereign cloud advisory).'] }];
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
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Draft for discussion, subject to contract: not an offer or a quotation. Indicative scope is an LTM heuristic to be agreed per engagement. LTM\'s work does not include legal advice; legal conclusions are for your counsel.'] }];
  blocks.push({ kind: 'table', small: true, head: ['Offering', 'Type', 'Indicative scope', 'Findings'], widths: ['*', 90, 70, 150],
    rows: lines.map(l => [[l.offering.name], [l.offering.type], [{ text: l.offering.indicativeScope ?? '—', cite: OFFERINGS.claimIds }], [ref(l.findingIds.join(', '))]]) });
  if (routes.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Routed to other accelerators: ', routes.map(r => `${r.offering.name} (${r.findingIds.join(', ')})`).join('; '), '.'] });
  return { id: 'sow', title: 'Statement of work draft', appendix: true, blocks };
}

function methodology(c: Ctx): ReportSection {
  const v = c.r.versions;
  return { id: 'methodology', title: 'Methodology', blocks: [
    { kind: 'paragraph', segs: ['Scope answers (footprint, entities, data, platforms) are read against rules held as data in a sourced regulation registry: the first rule that matches places each regulation in one of four groups: applies on your answers, may apply – confirm, for awareness, or does not apply on your answers. The groups are LTM\'s reading of each law\'s scope test against your answers, not a legal opinion. Scope answers are never scored.'] },
    { kind: 'paragraph', segs: ['Each kind of data gets a required level, L0 to L4: the higher of any legal localisation minimum and the board\'s choice. Every control that level needs, plus every control a regulation in scope requires, is rated from the maturity answers. Maturity is the weighted share of those controls in place, shown only when at least five controls are required. "Unknown" counts as not in place; an unanswered control counts as not in place and is listed as not answered. Provider nationality matters only at L4.'] },
    { kind: 'paragraph', segs: ['Statutory maximums come from the cited articles: computed from the worldwide turnover given, as a range from the turnover band otherwise, or not quantified without it. Currency conversions use the dated ECB reference rates in the claims register. Caps are never added together.'] },
    { kind: 'callout', tone: 'info', title: 'Scope and limitations', segs: [scopeAndLimitations(c)] },
    { kind: 'paragraph', segs: [strong('How your data is handled. '), dataNotice(c)] },
    { kind: 'paragraph', style: 'small', segs: [NOTICES.privilege] },
    { kind: 'paragraph', style: 'small', segs: ['Versions: ', ref(`engine ${v.engine} · questions ${v.questionSet} · controls ${v.controls} · regulation registry ${v.registry} (status as of ${v.registryStatusAsOf}) · claims register ${v.claimsRegister}`)] }
  ] };
}

/** S6 challenge Q8: what the assessment does not cover, and how many items this edition leaves out pending a source. */
function scopeAndLimitations(c: Ctx): string {
  const { r } = c;
  const hiddenRegimes = r.regimes.filter(g => g.consultantOnly && g.grade !== 'not_applicable').length;
  const hiddenActions = c.client ? r.advisory.technical.filter(x => !clientCleared(x)).length : 0;
  const pending = (c.client ? hiddenRegimes + hiddenActions : 0) + r.pendingSource.length;
  const upcoming = r.exposure.regimes.reduce((a, e) => a + e.upcoming.length, 0);
  return [
    'The answers are self-reported and have not been tested or audited.',
    'No technical discovery was done: application-level designs need architecture and configuration data beyond this assessment.',
    `Regulatory content comes from LTM's sourced regulation registry, stated as at ${NOTICES.statedAt}. Any review by counsel is for LTM, not advice to you; this report is not legal advice.`,
    upcoming ? `${upcoming} ${plural(upcoming, 'obligation applies', 'obligations apply')} from a later date: listed as upcoming and not yet scored.` : 'Obligations that apply from a later date are listed as upcoming and not yet scored.',
    pending ? `${pending} ${plural(pending, 'item rests', 'items rest')} on a source still being verified and ${plural(pending, 'is', 'are')} not shown or scored.` : ''
  ].filter(Boolean).join(' ');
}

/**
 * S6 challenge Q4: where the tool runs and what happens to the client's data, adapted from the FinOps IQ data notice
 * (M6). Draft until the S10 counsel gate.
 */
function dataNotice(c: Ctx): string {
  return NOTICES.dataWith(!!(c.opts.narrative || c.opts.aiEnabled));
}

const STATE_VALUE: Record<string, string> = { 3: '1', 2: '2/3', 1: '1/3', 0: '0', unknown: '0', not_answered: '0' };
const WEIGHT_NAME: Record<number, string> = { 3: 'Critical (3)', 2: 'High (2)', 1: 'Supporting (1)' };
const fmt = (n: number, d = 2) => String(+n.toFixed(d));

/**
 * S6 challenge Q1 and D2: the arithmetic behind every headline number. Maturity control by control (weight × score,
 * summed, over the sum of weights), the areas the same way, each statutory maximum with its rule, input, limb and
 * exchange rate, and a table of every traced number with the engine field it reads.
 */
function calculationAppendix(c: Ctx, doc: ReportDocument): ReportSection {
  const { r } = c, m = r.maturity;
  const blocks: Block[] = [{ kind: 'paragraph', segs: ['How each number in this report is calculated from your answers. The constants are in the assumption register that follows.'] }];
  blocks.push({ kind: 'subheading', text: 'Control maturity' });
  if (m.score != null) {
    const wSum = r.controls.reduce((a, x) => a + x.weight, 0);
    const ws = r.controls.reduce((a, x) => a + x.weight * x.score, 0);
    blocks.push({ kind: 'paragraph', style: 'small', segs: ['Each required control scores its state value (ASM-SOV-001; a control held per kind of data averages its kinds) and is multiplied by its weight (ASM-SOV-003). Maturity is the sum of weighted scores over the sum of weights: ', `${fmt(ws)} ÷ ${wSum} × 100 = `, traced('maturity.score', m.score, 'index', []), '.'] });
    blocks.push({ kind: 'table', small: true, head: ['Control', 'Weight', 'State', 'Score', 'Weighted'], widths: ['*', 70, 110, 40, 45], rows: r.controls.map(x => [
      [x.name], [WEIGHT_NAME[x.weight] ?? String(x.weight)],
      [x.byClass ? Object.entries(x.byClass).map(([k, s2]) => `${className(k)}: ${word(s2 as State).toLowerCase()} (${STATE_VALUE[String(s2)]})`).join('; ') : `${word(x.state)} (${STATE_VALUE[String(x.state)]})`],
      [fmt(x.score)], [fmt(x.weight * x.score)]
    ]) });
    if (m.byDomain.length) blocks.push({ kind: 'paragraph', style: 'small', segs: ['Areas use the same formula over their own controls: ', m.byDomain.map(d => {
      const xs = r.controls.filter(x => domainOf(x.control) === d.domain);
      const w = xs.reduce((a, x) => a + x.weight, 0), v = xs.reduce((a, x) => a + x.weight * x.score, 0);
      return `${d.label} ${fmt(v)} ÷ ${w} = ${d.score}`;
    }).join('; '), '.'] });
  } else blocks.push({ kind: 'paragraph', style: 'small', segs: [m.wording, ' (ASM-SOV-004).'] });
  const caps = r.exposure.regimes.filter(e => e.cap && c.shownRegimes.has(e.regime));
  blocks.push({ kind: 'subheading', text: 'Statutory maximums' });
  const turnover = r.facts['org.turnover_amount'] as { amount: number; currency: string } | undefined;
  blocks.push({ kind: 'paragraph', style: 'small', segs: [turnover ? `Turnover used: ${turnover.currency} ${turnover.amount.toLocaleString('en-GB')} worldwide, as you gave it.` : r.facts['org.turnover_band_eur'] ? 'Turnover used: both ends of the turnover band you chose, so each maximum is a range.' : 'No turnover given, so turnover-based maximums are not quantified.', ' Exchange rates: ECB reference rates of ', (fx as any).date, ' (ASM-SOV-010).'] });
  if (caps.length) blocks.push({ kind: 'table', small: true, head: ['Regulation', 'Rule', 'Calculation', 'Result'], widths: [90, 70, '*', 80], rows: caps.map(e => {
    const cap = e.cap!;
    const rate = cap.currency !== 'EUR' ? (fx as any).rates[cap.currency]?.rate : null;
    return [[regimeName(r, e.regime)], [quote(cap.article)], [quote(cap.basis, cap.claims), ...(rate ? [`; EUR 1 = ${cap.currency} ${rate}`] : [])], capSegs(cap, `exposure.regimes[${e.regime}].cap`)];
  }) });
  else blocks.push({ kind: 'paragraph', style: 'small', segs: ['No regulation in scope has a computable maximum.'] });
  blocks.push({ kind: 'subheading', text: 'Every number' });
  const seen = new Map<string, Exclude<Seg, string>>();
  walkSegments(doc, s2 => { if (typeof s2 !== 'string' && s2.trace && !seen.has(s2.trace.field)) seen.set(s2.trace.field, s2); });
  blocks.push({ kind: 'table', small: true, head: ['Shown as', 'Read from'], widths: [90, '*'], rows: [...seen.values()].map(s2 => [[s2.text], [FIELD_WORDS(s2.trace!.field, r)]]) });
  return { id: 'calculation', title: 'How we calculated this', appendix: true, blocks };
}

const DOMAIN_OF = new Map<string, string>(((catalogue as any).domains as any[]).flatMap(d => d.controls.map((id: string) => [id, d.id] as [string, string])));
const domainOf = (id: string) => DOMAIN_OF.get(id) ?? '';

/** Engine fields in words, for the "Every number" table. */
const FIELD_KEY: Record<string, string> = {
  applies: 'that apply', likely_confirm: 'to confirm', advisory: 'advisory', in_scope: 'in scope', not_applicable: 'that do not apply', pending: 'pending a source',
  red: 'with major control gaps', amber: 'with some control gaps', green: 'with no gaps found', Critical: 'critical', High: 'high', meets: 'that meet the level', gap: 'with a gap', unconfirmed: 'to confirm', move: 'needing a sovereign offering'
};
function FIELD_WORDS(field: string, r: SovereignIqV4Result): string {
  const key = (k: string) => FIELD_KEY[k] ?? k;
  const rules: Array<[RegExp, (m: RegExpExecArray) => string]> = [
    [/^maturity\.score$/, () => 'Control maturity (formula above)'],
    [/^maturity\.byDomain\[(\w+)\]\.score$/, m => `Maturity: ${r.maturity.byDomain.find(d => d.domain === m[1])?.label ?? m[1]}`],
    [/^maturity\.controlsAssessed$/, () => 'Required controls'], [/^maturity\.unconfirmed$/, () => 'Required controls answered "Unknown"'],
    [/^regimes\[(\w+)\]$/, m => `Regulations ${key(m[1])}`], [/^exposure\[(\w+)\]$/, m => `Regulations ${key(m[1])}`],
    [/^exposure\.largestCap/, () => 'Largest single statutory maximum (table above)'],
    [/^exposure\.regimes\[(\w+)\]\.cap/, m => `Statutory maximum: ${regimeName(r, m[1])}`],
    [/^findings\[(\w+)\]$/, m => `Findings, ${key(m[1])}`], [/^findings$/, () => 'Findings'],
    [/^seal\.objectives\[([\w-]+)\]\.inPlace$/, m => `Controls in place for ${m[1]}`],
    [/^advisory\.placement\[(\w+)\]$/, m => `Placements ${key(m[1])}`]
  ];
  for (const [re, f] of rules) { const m = re.exec(field); if (m) return f(m); }
  return field;
}

function assumptionAppendix(): ReportSection {
  return { id: 'assumptions', title: 'Assumption register', appendix: true, blocks: [
    { kind: 'paragraph', segs: ['Every constant the scoring, the statutory maximums and the roadmap use, with its basis and what changes if it is wrong.'] },
    { kind: 'table', small: true, head: ['ID', 'Assumption and value', 'Basis', 'Confidence', 'If it is wrong'], widths: [50, '*', 70, 45, 120],
      rows: ASM.map(a => [[ref(a.id)], [strong(`${a.title}. `), a.value, ...(a.reasoning ? ['\nReasoning: ', a.reasoning] : [])], [ASM_BASIS[a.basis] ?? a.basis], [a.confidence], [a.sensitivity]]) }
  ] };
}

/** S6 re-test N8: no rule matched, so say what the main scope test is. */
function naReason(id: string): Seg[] {
  const rule = (REGIMES as any[]).find(x => x.id === id)?.applicability.rules.find((x: any) => x.grade === 'applies');
  return rule ? ['It applies when this holds, which your answers do not show: ', quote(`"${rule.reason}"`, rule.claims ?? [])] : ['No scope test matches your answers.'];
}

/** Every regulation checked that does not apply, with the reason (S6 challenge Q8: shown to the client, without rule IDs). */
function notApplicableAppendix(c: Ctx): ReportSection {
  const na = c.r.regimes.filter(g => g.grade === 'not_applicable');
  return { id: 'not-applicable', title: 'Regulations checked that do not apply', appendix: true, blocks: na.length
    ? [{ kind: 'table', small: true, head: ['Regulation', 'Why it does not apply'], widths: [140, '*'], rows: na.map(g => [[g.name], g.rule ? [quote(g.reason, g.claims)] : naReason(g.regime)]) }]
    : [{ kind: 'paragraph', segs: ['Every regulation in the registry applies or may apply on your answers.'] }] };
}

/**
 * The sources behind the report. Client edition (S6 challenge D7): one row per source with its URL and the articles
 * cited, duplicates merged, and LTM's own method notes named as such, without an internal link.
 */
function sourcesAppendix(ids: string[], c: Ctx): Block[] {
  const rows = ids.map(id => CLAIM.get(id)).filter(Boolean).filter(cl => !c.client || cl.clientVisible !== false);
  if (!rows.length) return [{ kind: 'paragraph', segs: ['No sources are cited.'] }];
  const intro: Block = { kind: 'paragraph', style: 'small', segs: ['Every regulatory statement in this report cites the sources below, from the LTM claims register. Each is reviewed by its review date; volatile items (pending laws, status changes) every 90 days.'] };
  if (!c.client) return [intro,
    { kind: 'table', small: true, head: ['ID', 'Source', 'Publisher', 'Grade', 'Checked'], widths: [55, '*', 90, 58, 55], rows: rows.map(cl =>
      [[ref(cl.id)], [quote(cl.source?.title ?? ''), ' ', ref(cl.source?.url ?? '')], [cl.source?.publisher ?? ''], [ref(cl.verification ?? '')], [ref(cl.checkedOn ?? '')]]) }];
  const internal = (cl: any) => cl.source?.publisher === 'LTM';
  const groups = new Map<string, { title: string; url: string; publisher: string; articles: Set<string>; checked: string }>();
  for (const cl of rows) {
    const title = internal(cl) ? 'LTM method note (available on request)' : strip(cl.source?.title ?? cl.statement?.slice(0, 120) ?? '');
    const url = internal(cl) ? '' : cl.source?.url ?? '';
    const key = `${title}|${url}`;
    const g = groups.get(key) ?? { title, url, publisher: internal(cl) ? 'LTM' : cl.source?.publisher ?? '', articles: new Set<string>(), checked: '' };
    if (cl.source?.article && !internal(cl)) g.articles.add(cl.source.article);
    if ((cl.checkedOn ?? '') > g.checked) g.checked = cl.checkedOn ?? '';
    groups.set(key, g);
  }
  return [intro, { kind: 'table', small: true, head: ['Source', 'Publisher', 'Checked'], widths: ['*', 100, 55], rows: [...groups.values()].map(g => [
    [g.title, ...(g.articles.size ? [` (${[...g.articles].join('; ')})`] : []), ...(g.url ? ['\n', ref(g.url.replace(/([/.?&=#-])/g, '$1\u200B'))] : [])], [g.publisher], [ref(g.checked)]
  ]) }];
}

function consultantAppendix(c: Ctx): ReportSection {
  const { r } = c;
  const blocks: Block[] = [{ kind: 'callout', tone: 'warn', segs: ['Consultant edition only. Not part of the client edition.'] }];
  const na = r.regimes.filter(g => g.grade === 'not_applicable');
  blocks.push({ kind: 'subheading', text: 'Regulations checked that do not apply' });
  blocks.push({ kind: 'table', small: true, head: ['Regulation', 'Rule', 'Why'], widths: [110, 75, '*'], rows: na.map(g => [[g.name], [ref(g.rule ?? 'default')], [quote(g.reason, g.claims)]]) });
  const hidden = r.regimes.filter(g => g.consultantOnly && g.grade !== 'not_applicable');
  // S6 challenge D17: advisory content resting on a claim not cleared for clients is listed too.
  const unclearedActions = r.advisory.technical.filter(x => !clientCleared(x));
  const unclearedOptions = [...new Map(r.advisory.placement.flatMap(p => [...p.options, ...p.alternatives]).filter(o => !clientCleared(o)).map(o => [o.name, o])).values()];
  if (hidden.length || r.pendingSource.length || unclearedActions.length || unclearedOptions.length) {
    blocks.push({ kind: 'subheading', text: 'Pending a source (hidden from the client, or shown as "status to confirm")' });
    blocks.push({ kind: 'list', small: true, items: [
      ...hidden.map(g => [strong(g.name), ': ', quote(g.reason, g.claims), ' ', ref(`[${g.rule}]`)]),
      ...r.pendingSource.map(p => [strong(regimeName(r, p.regime)), ': requirement for ', CONTROL.get(p.control)?.name ?? p.control, ' pending a source; not scored']),
      ...unclearedOptions.map(o => [strong(o.name), ': placement option shown to the client as "status to confirm"; claims ', ref(o.claimIds.join(', '))]),
      ...unclearedActions.map(x => [strong(`${platformName(x.platform)}: ${x.action}`), ': action left out of the client edition; claims ', ref(x.claimIds.join(', '))])
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
  doc.sections.push(calculationAppendix(c, doc), assumptionAppendix());
  if (client) doc.sections.push(notApplicableAppendix(c));
  doc.sections.push({ id: 'sources', title: 'Sources', appendix: true, blocks: sourcesAppendix([...claims].sort(), c) });
  if (!client) doc.sections.push(sowAppendix(c), consultantAppendix(c));
  return doc;
}

/** S6 challenge D8: a finding no regulation requires says what set its level, instead of a blank column. */
function levelBasis(r: SovereignIqV4Result, f: Finding): string {
  if (f.type !== 'control_gap' || !f.requiredLevel) return '';
  const reqs = r.requirements.filter(q => f.dataClasses.includes(q.dataClass) && q.required === f.requiredLevel);
  const law = reqs.find(q => q.floor && q.floor.level === q.required && !q.floor.consultantOnly);
  if (law) return `Level ${f.requiredLevel} set by ${regimeName(r, law.floor!.regime)}`;
  // Every kind of data whose level needs the control (S6 re-test N7).
  const x = r.controls.find(y => y.control === f.control);
  const levels = r.requirements.filter(q => (x?.requiredBy.levels ?? []).includes(q.dataClass)).map(q => `${className(q.dataClass)} ${q.required}`);
  return `Levels set by the board (${levels.join(', ') || f.requiredLevel}); no regulation in scope requires this control`;
}

/** The backlog CSV: one row per finding, in roadmap order, with its platforms, placement rung and checks (S7). */
export function sovereignIqBacklog(result: SovereignIqV4Result, view: 'client' | 'consultant' = 'consultant'): Backlog {
  const fs = result.findings.filter(f => view === 'consultant' || !f.consultantOnly);
  const order = new Map(result.roadmap.flatMap(w => w.findings).map((id, i) => [id, i]));
  const a = result.advisory;
  const acts = (id: string) => a.technical.filter(x => x.findingId === id && (view === 'consultant' || clientCleared(x)));
  const rungs = (id: string) => [...new Set(a.placement.filter(p => p.findingIds.includes(id)).map(p => p.minimumRung))].sort();
  const join = (xs: string[]) => [...new Set(xs)].join('; ');
  const sources = (f: Finding) => join(f.sources.map(id => CLAIM.get(id)).filter(cl => cl && (view === 'consultant' || cl.clientVisible !== false)).map(cl => [cl.source?.title, cl.source?.url].filter(Boolean).join(' ')));
  // Waves the edition shows, numbered 1, 2, 3 (S6 challenge D4).
  const waveNo = new Map(result.roadmap.filter(w => w.findings.some(id => fs.some(f => f.id === id))).map((w, i) => [w.wave, i + 1]));
  return {
    header: ['ID', 'Wave', 'Severity', 'Type', 'Action', 'Why', 'Control', 'Data', 'Regulations', 'Owner', 'Start and duration', 'Effort', 'Start month', 'Duration (months)', 'Depends on', 'Milestone', 'KPI', 'Source', 'Platforms', 'Placement rung', 'Service families', 'Verification'],
    rows: [...fs].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).map(f => [
      f.id, waveNo.get(f.wave) ?? f.wave, f.severity, TYPE_LABEL[f.type] ?? f.type, strip(f.title), strip(f.businessConsequence), f.control ?? '', f.dataClasses.map(className).join('; '),
      f.regimes.length ? f.regimes.map(x => regimeName(result, x.regime)).join('; ') : levelBasis(result, f), f.ownerRole, f.timeFrame,
      f.effort, f.startMonth + 1, `${f.durationMonths[0]}–${f.durationMonths[1]}`, f.dependsOn.filter(id => fs.some(x => x.id === id)).join('; '), f.milestone, f.kpi, sources(f),
      join(acts(f.id).map(x => platformName(x.platform))), rungs(f.id).join('; '), join(acts(f.id).flatMap(x => x.serviceFamilies ?? []).map(s => SERVICE_LABEL[s] ?? s)),
      // Every row has a check (D12): the platform verification steps, or the milestone's KPI where no platform action applies.
      acts(f.id).length ? join(acts(f.id).map(x => `${platformName(x.platform)}: ${x.verification}`)) : f.kpi
    ])
  };
}
