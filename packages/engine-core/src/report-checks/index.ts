/**
 * Report checks (REPORT-VALIDATION.md, Layer 1): run on every report as it is built, and in CI. A report that fails
 * any check is not issued. The checks read the finished report document and the engine result it was built from;
 * each accelerator registers its own rules (sections, notices, field resolver, reconciliation) on the shared ones.
 */
import { format, walkSegments, type ReportDocument, type Seg, type Trace } from '../report/model';
import register from '../claims/claims-register.json' with { type: 'json' };
import banned from './banned-phrases.json' with { type: 'json' };

export type View = 'client' | 'consultant';
export interface Failure { check: string; detail: string }
export interface CheckResult { status: 'pass' | 'fail'; checks: string[]; failures: Failure[] }

export interface ReportRules {
  /** Section IDs the edition must contain, each with at least one block (R1). */
  requiredSections: string[];
  /** Phrases (case-insensitive) the edition must contain: disclaimer, attribution, data notice (R7). */
  requiredNotices: string[];
  /** The engine value a traced field names, from what the edition was built from (R2). Undefined when unknown. */
  resolve: (field: string) => number | undefined;
  /** Every number must be a traced segment (FinOps IQ); otherwise only traced numbers are checked. */
  strictNumbers?: boolean;
  /** With strictNumbers: sections whose plain text may quote numbers (appendices quoting engine probes verbatim). */
  numbersAllowedIn?: string[];
  /** Text the client edition must never contain, beyond the shared list (R5). */
  clientForbidden?: RegExp[];
  /** Internal IDs (questions, findings, design decisions): ignored as numbers in R2, and banned from the client
   * edition's body sections (R5). */
  ids?: { pattern: RegExp; clientBannedIn: string[] };
  /** The one currency the edition shows money in. When set, every traced number must also be shown with the shared
   * formatter (R2); reports that show amounts in several currencies (Sovereign IQ's statutory caps) leave it unset. */
  currency?: string;
  /** Accelerator-specific totals that must agree (R3). Each returns its failures. */
  reconcile?: () => string[];
}

interface Claim { id: string; verification?: string; clientVisible?: boolean; nextReview?: string }
const CLAIMS = new Map<string, Claim>((register as { claims: Claim[] }).claims.map(c => [c.id, c]));
const BANNED = (banned as { phrases: Array<{ pattern: string; flags: string }> }).phrases.map(p => new RegExp(p.pattern, p.flags));
/** Codes are never headings (Resilience IQ RQ2 item 5): checked against section titles and subheadings. */
const HEADINGS = ((banned as { headingPatterns?: Array<{ pattern: string; flags: string }> }).headingPatterns ?? []).map(p => new RegExp(p.pattern, p.flags));
type Traced = Exclude<Seg, string> & { trace: Trace };
/** The text around the first number, for the failure message. */
const around = (t: string) => { const i = t.search(/\d/); return (i > 40 ? '…' : '') + t.slice(Math.max(0, i - 40), i + 40) + (i + 40 < t.length ? '…' : ''); };

/** All the text a reader sees: segments, headings, table heads and chart labels. */
function documentText(doc: ReportDocument): string {
  const out: string[] = [doc.meta.title, doc.meta.subtitle, doc.meta.footer];
  walkSegments(doc, s => out.push(typeof s === 'string' ? s : s.text));
  for (const s of doc.sections) {
    out.push(s.title);
    for (const b of s.blocks) {
      if (b.kind === 'subheading') out.push(b.text);
      if (b.kind === 'table') out.push(...b.head);
      if (b.kind === 'kpis') out.push(...b.items.map(i => i.label));
      if (b.kind === 'bars') out.push(...b.items.map(i => i.label));
      if (b.kind === 'heatmap') for (const row of b.rows) out.push(row.label, ...row.cells.flatMap(c => [c.label, c.note ?? '']));
    }
  }
  return out.join(' \n ');
}

/** Runs every check on one edition of one report. `today` is the date the report is issued (YYYY-MM-DD). */
export function runReportChecks(doc: ReportDocument, view: View, rules: ReportRules, today: string): CheckResult {
  const failures: Failure[] = [];
  const fail = (check: string, detail: string) => failures.push({ check, detail });

  // R1 completeness: every required section is present and has content.
  for (const id of rules.requiredSections) {
    const s = doc.sections.find(x => x.id === id);
    if (!s) fail('R1', `section "${id}" is missing`);
    else if (!s.blocks.length) fail('R1', `section "${id}" is empty`);
  }

  // R2 trace: every traced number equals its engine field (derived figures are checked in CI) and is shown with the
  // shared formatter; no number appears in untraced text outside the allowed appendices.
  const allowed = new Set(rules.numbersAllowedIn ?? []);
  const currency = rules.currency ?? 'USD';
  walkSegments(doc, (s, section) => {
    const strict = rules.strictNumbers && !allowed.has(section.id);
    const idFree = (t: string) => (rules.ids ? t.replace(new RegExp(rules.ids.pattern.source, 'g'), '') : t);
    if (typeof s === 'string') { if (strict && /\d/.test(idFree(s))) fail('R2', `${section.id}: a number in untraced text: "${around(s)}"`); return; }
    if (!s.trace) { if (strict && !s.ref && !s.cite && /\d/.test(idFree(s.text))) fail('R2', `${section.id}: a number in untraced text: "${around(s.text)}"`); return; }
    const t = (s as Traced).trace;
    if (rules.currency && format(t.value, t.unit, currency) !== s.text) fail('R2', `${t.field}: shown as "${s.text}", formatted value is "${format(t.value, t.unit, currency)}"`);
    if (t.derived || t.field.startsWith('report:')) return;
    const want = rules.resolve(t.field);
    if (want !== undefined && Math.abs(want - t.value) > 1e-9) fail('R2', `${t.field}: report shows ${t.value}, engine has ${want}`);
  });

  // R3 reconciliation: the accelerator's totals agree.
  for (const d of rules.reconcile?.() ?? []) fail('R3', d);

  // R4 claims: every claim behind the edition exists and is not overdue; the citations a client reader sees are
  // client-visible and sourced (trace claim IDs are filtered by visibility when the report shows them).
  const behind = new Set<string>(), shown = new Set<string>();
  walkSegments(doc, s => {
    if (typeof s === 'string') return;
    for (const id of s.cite ?? []) if (id.startsWith('CLM-')) { behind.add(id); shown.add(id); }
    for (const id of s.trace?.claimIds ?? []) if (id.startsWith('CLM-')) behind.add(id);
  });
  for (const id of behind) {
    const c = CLAIMS.get(id);
    if (!c) { fail('R4', `${id}: not in the claims register`); continue; }
    if (c.nextReview && c.nextReview < today) fail('R4', `${id}: review was due on ${c.nextReview}`);
    if (view === 'client' && shown.has(id) && c.clientVisible === false) fail('R4', `${id}: consultant-only claim cited in the client edition`);
    if (view === 'client' && shown.has(id) && c.verification === 'UNSOURCED') fail('R4', `${id}: unsourced claim cited in the client edition`);
  }

  // R5 language: no banned phrase; the client edition holds no "null", "undefined" or internal file path.
  const text = documentText(doc);
  for (const re of BANNED) { const m = text.match(re); if (m) fail('R5', `banned phrase "${m[0]}"`); }
  for (const h of doc.sections.flatMap(x => [x.title, ...x.blocks.flatMap(bl => bl.kind === 'subheading' ? [bl.text] : [])])) {
    for (const re of HEADINGS) if (re.test(h)) fail('R5', `code used as a heading: "${h}"`);
  }
  if (view === 'client') {
    for (const re of [/\bnull\b/, /\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /(?:^|[\s(])(?:packages|amplify|scripts|docs\/cio-readiness)\/[\w./-]+/, /github\.com/, ...(rules.clientForbidden ?? [])]) { const m = text.match(re); if (m) fail('R5', `internal text in the client edition: "${m[0]}"`); }
  }

  if (view === 'client' && rules.ids) {
    const body: string[] = [];
    walkSegments({ meta: doc.meta, sections: doc.sections.filter(x => rules.ids!.clientBannedIn.includes(x.id)) }, seg => body.push(typeof seg === 'string' ? seg : seg.text));
    const m = body.join(' ').match(rules.ids.pattern);
    if (m) fail('R5', `internal ID in the client edition: "${m[0]}"`);
  }

  // R7 notices: the disclaimer, attribution and data notice the edition must carry.
  const lower = text.toLowerCase();
  for (const n of rules.requiredNotices) if (!lower.includes(n.toLowerCase())) fail('R7', `required notice missing: "${n}"`);

  return { status: failures.length ? 'fail' : 'pass', checks: ['R1', 'R2', ...(rules.reconcile ? ['R3'] : []), 'R4', 'R5', 'R7'], failures };
}

/** The message a consultant sees when a report is held back. */
export function failureMessage(r: CheckResult): string {
  const n = r.failures.length;
  return `The report was not issued: ${n} automated check${n === 1 ? '' : 's'} failed (${[...new Set(r.failures.map(f => f.check))].join(', ')}). LTM support has been notified with the details.`;
}
