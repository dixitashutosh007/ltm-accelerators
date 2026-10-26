/**
 * The Sovereign IQ executive report (PLAN S6), in the FinOps IQ report format (shared model and PDF renderer,
 * src/report): cover and contents, executive summary with the two headlines, required level by kind of data,
 * control maturity (bars by area, heatmap by level, the controls), compliance exposure (heatmap by market, the
 * regulations with their statutory maximums), findings, roadmap, methodology, sources, and the consultant appendix.
 *
 * Built on the server from the stored result. The client edition leaves out what client mode leaves out (DESIGN 9):
 * rule IDs, regulations that do not apply (count only), consultant-only items, requirements pending a source and
 * consultant notes. Every number is a traced segment; text quoted from the registry cites its claims.
 */
import type { Backlog, Block, ReportDocument, ReportSection, Seg, Tone } from '../../../report/model';
import { traced } from '../../../report/model';
import registerData from '../../../claims/claims-register.json' with { type: 'json' };
import { CONTROLS, type Finding, type SovereignIqV4Result, type State } from './evaluate';
import { DATA_CLASS_LABELS, LEVEL_LABELS, ZONE_LABELS } from './public-schema';

const PLATFORM = 'LTM Vantage · Responsible Advisory';
const PRODUCT = 'Sovereign IQ';
const CLAIM = new Map<string, any>((registerData as any).claims.map((c: any) => [c.id, c]));
const CONTROL = new Map<string, any>(CONTROLS.map(c => [c.id, c]));
const WORD: Record<string, string> = { 3: 'In place', 2: 'Largely in place', 1: 'Partly in place', 0: 'Not in place', unknown: 'Unconfirmed', not_answered: 'Not answered' };
const GRADE: Record<string, string> = { applies: 'Applies', likely_confirm: 'Likely – confirm', advisory: 'Advisory', not_applicable: 'Not applicable' };
const RAG: Record<string, string> = { red: 'Red', amber: 'Amber', green: 'Green', not_rated: 'Not rated' };
const MARKET: Record<string, string> = { eu_uk: 'EU and UK', us: 'United States', apac: 'Asia-Pacific' };

export interface SovereignReportOptions { client: string; preparedBy: string; dataProvidedBy: string; view: 'client' | 'consultant'; notes?: string }

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
      status: 'Internal consultant use until the legal review. Not legal advice.'
    },
    sections: [summary(c), requirement(c), maturity(c), exposure(c), findingsSection(c), roadmap(c), methodology(c)]
  };
  const claims = new Set<string>();
  for (const s of doc.sections) for (const b of s.blocks) {
    const runs: Seg[][] = b.kind === 'paragraph' || b.kind === 'callout' ? [b.segs] : b.kind === 'list' ? b.items : b.kind === 'table' ? b.rows.flat() : b.kind === 'kpis' ? b.items.flatMap(i => [i.value, ...(i.note ? [i.note] : [])]) : [];
    for (const run of runs) for (const seg of run) if (typeof seg !== 'string') { seg.cite?.forEach(id => claims.add(id)); seg.trace?.claimIds.forEach(id => claims.add(id)); }
  }
  doc.sections.push({ id: 'sources', title: 'Sources', appendix: true, blocks: sourcesAppendix([...claims].sort(), c) });
  if (!client) doc.sections.push(consultantAppendix(c));
  return doc;
}

/** The backlog CSV: one row per finding, in roadmap order. */
export function sovereignIqBacklog(result: SovereignIqV4Result, view: 'client' | 'consultant' = 'consultant'): Backlog {
  const fs = result.findings.filter(f => view === 'consultant' || !f.consultantOnly);
  const order = new Map(result.roadmap.flatMap(w => w.findings).map((id, i) => [id, i]));
  return {
    header: ['ID', 'Wave', 'Severity', 'Type', 'Action', 'Why', 'Control', 'Data', 'Regulations', 'Owner', 'Time frame'],
    rows: [...fs].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).map(f => [
      f.id, f.wave, f.severity, f.type, strip(f.title), strip(f.businessConsequence), f.control ?? '', f.dataClasses.map(className).join('; '),
      f.regimes.map(x => regimeName(result, x.regime)).join('; '), f.ownerRole, f.timeFrame
    ])
  };
}
