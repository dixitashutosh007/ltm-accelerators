/**
 * How LTM can help (shared workstream WS-S5; FRAMEWORK.md), built generic with FinOps IQ as its first consumer
 * (execution phase M5, D17). A catalogue of generic offerings, each typed advisory, implementation or transformation,
 * with a purpose and an execution outline the client sees, and an indicative scope that only the consultant's SOW
 * draft shows (D7). Findings map to offerings by ID; routes (REF.*) point to another accelerator instead.
 */

export const OFFERING_TYPES = ['Advisory', 'Implementation', 'Transformation (run)', 'Advisory, then transformation', 'Route'] as const;

export interface Offering {
  /** OFF.<PRACTICE>.<NAME> for an offering, REF.<ACCELERATOR> for a route to another accelerator. */
  id: string;
  name: string;
  /** Delivering practice(s), generic names only (no partner claims). */
  practice: string;
  type: typeof OFFERING_TYPES[number];
  /** Client-visible: what it is for and how it runs. */
  purpose: string;
  /** An item with scopes is shown only when one of the findings it serves names one of them (M7 CIO challenge D20). */
  outline: OutlineItem[];
  /** Consultant-only (SOW draft): indicative duration, an LTM heuristic until WS-S5 sets the catalogue. */
  indicativeScope: string | null;
}

export type OutlineItem = string | { text: string; scopes: string[] };

/** Outline items as text, keeping those whose scopes the findings name. */
export const outlineFor = (outline: OutlineItem[], scopes: Set<string>): string[] =>
  outline.filter(i => typeof i === 'string' || i.scopes.some(x => scopes.has(x))).map(i => (typeof i === 'string' ? i : i.text));

/** The offering type as a client reads it: "transformation: managed run service", not "transformation (run)" (D15). */
export const TYPE_LABEL: Record<typeof OFFERING_TYPES[number], string> = {
  Advisory: 'advisory', Implementation: 'implementation', 'Transformation (run)': 'transformation: managed run service',
  'Advisory, then transformation': 'advisory, then transformation', Route: 'route'
};

export interface OfferingCatalogue { catalogueVersion: string; statusAsOf: string; rule: string; claimIds: string[]; offerings: Offering[] }

/** The client-visible part of an offering: no indicative scope (D7). */
export type ClientOffering = Omit<Offering, 'indicativeScope' | 'outline'> & { outline: string[]; typeLabel: string };
export const clientOffering = ({ indicativeScope, outline, ...rest }: Offering, scopes: Set<string> = new Set()): ClientOffering =>
  ({ ...rest, outline: outlineFor(outline, scopes), typeLabel: TYPE_LABEL[rest.type] });

export function validateOfferings(cat: OfferingCatalogue, claimIds: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of cat.claimIds) if (!claimIds.has(id)) out.push(`catalogue: unknown claim ${id}`);
  for (const o of cat.offerings) {
    if (!/^(OFF\.[A-Z]+\.[A-Z_]+|REF\.[A-Z_]+)$/.test(o.id)) out.push(`${o.id}: id must be OFF.<PRACTICE>.<NAME> or REF.<ACCELERATOR>`);
    if (seen.has(o.id)) out.push(`${o.id}: duplicate id`);
    seen.add(o.id);
    if (!(OFFERING_TYPES as readonly string[]).includes(o.type)) out.push(`${o.id}: unknown type ${o.type}`);
    for (const k of ['name', 'practice', 'purpose'] as const) if (!o[k]?.trim()) out.push(`${o.id}: ${k} is required`);
    if (o.type !== 'Route' && (!o.outline.length || !o.indicativeScope)) out.push(`${o.id}: an offering needs an execution outline and an indicative scope`);
  }
  return out;
}

export interface SowLine { offering: Offering; findingIds: string[] }

/**
 * The consultant-only SOW draft (F9): the offerings the findings map to, each with the findings that call for it,
 * in catalogue order. Routes to other accelerators are listed separately, as they are not scoped here.
 */
export function sowDraft(cat: OfferingCatalogue, findings: Array<{ id: string; offeringIds: string[] }>): { lines: SowLine[]; routes: SowLine[] } {
  const by = new Map<string, string[]>();
  for (const f of findings) for (const id of f.offeringIds) by.set(id, [...(by.get(id) ?? []), f.id]);
  const lines = cat.offerings.filter(o => by.has(o.id)).map(o => ({ offering: o, findingIds: by.get(o.id)! }));
  return { lines: lines.filter(l => l.offering.type !== 'Route'), routes: lines.filter(l => l.offering.type === 'Route') };
}
