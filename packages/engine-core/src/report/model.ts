/**
 * Shared report model (CIO-readiness workstream WS-S4, built with FinOps IQ in execution phase M4).
 *
 * An accelerator turns its engine result into a ReportDocument on the server. The PDF (pdf.ts) is a pure rendering
 * of it, and the backlog CSV (csv.ts) comes from the same result, so screen, PDF and backlog cannot drift apart.
 * Every number in a document is a traced segment: it names the engine field it shows, the value read from that field,
 * and the claim and assumption IDs behind it. Tests resolve each field against the engine result (area 13(a)).
 */

export type Unit = 'currency' | 'share' | 'percent' | 'count' | 'index' | 'months' | 'fte_months' | 'fte' | 'tier' | 'level';

export interface Trace {
  /** Path into the engine result, e.g. value.totals.expected.netRunRate or capabilities[ALLOCATION].gap. */
  field: string;
  /**
   * For a number the report derives from engine fields (a workstream's value, start or effort; a sensitivity swing):
   * how it was derived. `field` is then a report path ("report:...") and tests recompute the value from `of`.
   */
  derived?: { op: 'sum' | 'min' | 'max' | 'effort' | 'sensitivity'; of: string[]; detail?: Record<string, unknown> };
  value: number;
  unit: Unit;
  claimIds: string[];
  assumptionIds: string[];
}

/**
 * Text, or a run of text that shows one traced number. A number never appears in plain text, except in text quoted
 * from the engine or a register, which names its claims (`cite`), and in identifiers, dates and versions (`ref`).
 */
export type Seg = string | { text: string; trace?: Trace; cite?: string[]; ref?: true; strong?: boolean; italic?: boolean };

export type Block =
  | { kind: 'paragraph'; segs: Seg[]; style?: 'lead' | 'small' | 'note' }
  | { kind: 'subheading'; text: string }
  | { kind: 'list'; items: Seg[][]; small?: boolean }
  | { kind: 'table'; head: string[]; rows: Seg[][][]; widths?: Array<number | '*' | 'auto'>; small?: boolean }
  | { kind: 'kpis'; items: Array<{ label: string; value: Seg[]; note?: Seg[] }> }
  | { kind: 'callout'; title?: string; segs: Seg[]; tone?: 'info' | 'warn' };

export interface ReportSection {
  id: string;
  title: string;
  blocks: Block[];
  /** Appendices start on a new page and are numbered A, B, C. */
  appendix?: boolean;
}

export interface ReportMeta {
  /** Platform lockup and accelerator, e.g. "LTM Vantage · Responsible Advisory" and "FinOps IQ". */
  platform: string;
  product: string;
  title: string;
  subtitle: string;
  client: string;
  preparedBy: string;
  dataProvidedBy: string;
  /** Assessment date, YYYY-MM-DD. */
  date: string;
  version: string;
  view: 'client' | 'consultant';
  /** Footer on every page: "LTM Vantage · Responsible Advisory · <product> · Confidential". */
  footer: string;
  status?: string;
}

export interface ReportDocument { meta: ReportMeta; sections: ReportSection[] }

export interface Backlog { header: string[]; rows: Array<Array<string | number>> }

/** The plain text of a segment run. */
export const text = (segs: Seg[]) => segs.map(s => (typeof s === 'string' ? s : s.text)).join('');

/** Visits every segment in the document, with the section it sits in. */
export function walkSegments(doc: ReportDocument, visit: (seg: Seg, section: ReportSection) => void) {
  for (const section of doc.sections) {
    for (const b of section.blocks) {
      const runs: Seg[][] =
        b.kind === 'paragraph' || b.kind === 'callout' ? [b.segs]
        : b.kind === 'list' ? b.items
        : b.kind === 'table' ? b.rows.flat()
        : b.kind === 'kpis' ? b.items.flatMap(i => [i.value, ...(i.note ? [i.note] : [])])
        : [];
      for (const run of runs) for (const seg of run) visit(seg, section);
    }
  }
}

/* --------------------------------- Formats --------------------------------- */

const group = (n: number, digits = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Rounds towards zero, so a shown figure is never larger than the computed one (no inflation by rounding). */
const down = (n: number, digits: number) => Math.floor(n * 10 ** digits + 1e-9) / 10 ** digits;

/** "USD 1.47m", "EUR 820k", "USD 950": three significant figures at most, never rounded up to look bigger. */
export function money(value: number, currency: string): string {
  const a = Math.abs(value), sign = value < 0 ? '−' : '';
  const show = (n: number, d: number, suffix: string) => `${currency} ${sign}${group(down(n, d), d)}${suffix}`;
  if (a >= 1e9) return show(a / 1e9, a >= 1e10 ? 1 : 2, 'bn');
  if (a >= 1e6) return show(a / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2, 'm');
  if (a >= 1e3) return show(a / 1e3, 0, 'k');
  return show(a, 0, '');
}

/** The text a traced number is shown as. Tests re-format the engine value with this and compare. */
export function format(value: number, unit: Unit, currency = 'USD'): string {
  switch (unit) {
    case 'currency': return money(value, currency);
    case 'share': { const d = Math.abs(value * 100) < 10 && (value * 100) % 1 !== 0 ? 1 : 0; return `${group(down(value * 100, d), d)}%`; }
    case 'percent': { const d = value % 1 === 0 ? 0 : 1; return `${group(down(value, d), d)}%`; }
    case 'index': return group(value, value % 1 === 0 ? 0 : 1);
    case 'months': return `${group(value, 0)} ${value === 1 ? 'month' : 'months'}`;
    case 'fte_months': return `${group(value, value % 1 === 0 ? 0 : 1)} FTE-months`;
    case 'fte': return `${group(value, value % 1 === 0 ? 0 : 1)} FTE`;
    case 'tier': return `Tier ${value}`;
    case 'level': return `${value} ${value === 1 ? 'level' : 'levels'}`;
    default: return group(value, 0);
  }
}

/** A traced segment for an engine figure ({ field, value, unit, claimIds, assumptionIds }). */
export function figure(f: { field: string; value: number; unit: string; claimIds?: string[]; assumptionIds?: string[] }, currency: string, unit?: Unit): Seg {
  const u = (unit ?? (f.unit === 'currency' || f.unit === 'share' || f.unit === 'percent' || f.unit === 'fte_months' || f.unit === 'fte' ? f.unit : 'count')) as Unit;
  return { text: format(f.value, u, currency), trace: { field: f.field, value: f.value, unit: u, claimIds: [...(f.claimIds ?? [])], assumptionIds: [...(f.assumptionIds ?? [])] } };
}

/** A traced segment for a number that is not an engine Figure (a rating gap, the need index, the tier). */
export function traced(field: string, value: number, unit: Unit, claimIds: string[], assumptionIds: string[] = [], currency = 'USD'): Seg {
  return { text: format(value, unit, currency), trace: { field, value, unit, claimIds: [...claimIds], assumptionIds: [...assumptionIds] } };
}
