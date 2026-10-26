/**
 * How LTM can help for Sovereign IQ (PLAN S8; WS-S5), from the shared offering catalogue (src/offerings). Selected
 * from the findings alone, so the engine result, the page and the report show the same thing:
 *   - the offerings a finding names (controls.json `offering`, or the offering a scope, conflict or decision finding
 *     carries);
 *   - from the placement matrix (S7): a row that needs a sovereign offering calls for migration, a gap at R1 or R2 for
 *     a sovereign landing zone;
 *   - a finding referred to Resilience IQ routes there (consultant SOW draft only: a client does not know the product).
 * The client sees type, purpose and outline; indicative scope stays in the consultant's SOW draft (D7).
 */
import offeringData from '../../../offerings/sovereign-iq.json' with { type: 'json' };
import { clientOffering, sowDraft, type ClientOffering, type OfferingCatalogue, type SowLine } from '../../../offerings/catalogue';
import type { PlacementRow } from './advisory';

export const OFFERINGS = offeringData as unknown as OfferingCatalogue;

/** The part of a finding the selection needs (the engine's Finding satisfies it). */
export interface HelpFindingRef {
  id: string; control?: string; offeringRefs: string[]; referral?: string;
  regimes: Array<{ regime: string }>;
}
type Placement = Pick<PlacementRow, 'findingIds' | 'status' | 'minimumRung' | 'platform'>;

export interface HelpItem { offering: ClientOffering; findingIds: string[]; claimIds: string[] }

const rowsOf = (f: HelpFindingRef, placement: Placement[]) => placement.filter(p => p.findingIds.includes(f.id));

/** Every offering or route a finding calls for, in a stable order. */
export function offeringIdsOf(f: HelpFindingRef, placement: Placement[]): string[] {
  const rows = rowsOf(f, placement);
  return [...new Set([
    ...f.offeringRefs,
    ...(rows.some(p => p.status === 'move') ? ['OFF.SOV.MIGRATION'] : []),
    ...(rows.some(p => p.status === 'gap' && (p.minimumRung === 'R1' || p.minimumRung === 'R2')) ? ['OFF.SOV.LZ'] : []),
    ...(f.referral === 'Resilience IQ' ? ['REF.RESILIENCE_IQ'] : [])
  ])];
}

/** What outline items can key on: the finding's regulations and control, and its placement rungs and platforms. */
export function scopesOf(f: HelpFindingRef, placement: Placement[]): string[] {
  const rows = rowsOf(f, placement);
  return [...new Set([...f.regimes.map(r => r.regime), ...(f.control ? [f.control] : []), ...rows.map(p => p.minimumRung), ...rows.map(p => p.platform)])];
}

export function howLtmCanHelp(findings: HelpFindingRef[], placement: Placement[], cat: OfferingCatalogue = OFFERINGS): HelpItem[] {
  return cat.offerings
    .filter(o => o.type !== 'Route')
    .map(o => {
      const serves = findings.filter(f => offeringIdsOf(f, placement).includes(o.id));
      const scopes = new Set(serves.flatMap(f => scopesOf(f, placement)));
      return { offering: clientOffering(o, scopes), findingIds: serves.map(f => f.id), claimIds: [...cat.claimIds] };
    })
    .filter(h => h.findingIds.length);
}

/** The consultant-only SOW draft: offerings with indicative scope and their findings; routes listed apart. */
export function sovereignSow(findings: HelpFindingRef[], placement: Placement[], cat: OfferingCatalogue = OFFERINGS): { lines: SowLine[]; routes: SowLine[] } {
  return sowDraft(cat, findings.map(f => ({ id: f.id, offeringIds: offeringIdsOf(f, placement) })));
}
