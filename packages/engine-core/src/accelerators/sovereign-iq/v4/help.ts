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
  id: string; control?: string; offeringRefs: string[]; referral?: string; type?: string;
  regimes: Array<{ regime: string }>;
}
type Placement = Pick<PlacementRow, 'findingIds' | 'status' | 'minimumRung' | 'platform'>;

export interface HelpItem { offering: ClientOffering; findingIds: string[]; claimIds: string[] }

const rowsOf = (f: HelpFindingRef, placement: Placement[]) => placement.filter(p => p.findingIds.includes(f.id));

/** Controls a move to a sovereign offering closes; other gaps on a row that needs a move are still closed in place. */
const MOVE_CONTROLS = new Set(['SOV.RES.LOCATION', 'SOV.OPS.PERSONNEL_ZONE', 'SOV.JUR.IMMUNITY']);

/**
 * The one offering a finding calls for (S6 challenge Q10: one primary offering, so one gap is never sold twice), then
 * any route. Migration when the placement matrix says the data must move and the control is one a move closes;
 * otherwise the control's own offering; otherwise a sovereign landing zone for an R1 or R2 gap.
 */
export function offeringIdsOf(f: HelpFindingRef, placement: Placement[]): string[] {
  const rows = rowsOf(f, placement);
  const move = rows.some(p => p.status === 'move') && MOVE_CONTROLS.has(f.control ?? '');
  const primary = move ? ['OFF.SOV.MIGRATION'] : f.offeringRefs.length ? f.offeringRefs.slice(0, 1)
    : rows.some(p => p.status === 'gap' && (p.minimumRung === 'R1' || p.minimumRung === 'R2')) ? ['OFF.SOV.LZ'] : [];
  return [...new Set([...primary, ...(f.referral === 'Resilience IQ' ? ['REF.RESILIENCE_IQ'] : [])])];
}

/** What outline items can key on: the finding's regulations and control, and its placement rungs and platforms. */
export function scopesOf(f: HelpFindingRef, placement: Placement[]): string[] {
  const rows = rowsOf(f, placement);
  // Finding types key the outline lines that only fit when a scope is to confirm or a board decision is open.
  const type = f.type === 'scope_confirmation' ? ['SCOPE_CONFIRMATION'] : f.type === 'decision' ? ['BOARD_DECISION'] : [];
  return [...new Set([...f.regimes.map(r => r.regime), ...(f.control ? [f.control] : []), ...rows.map(p => p.minimumRung), ...rows.map(p => p.platform), ...type])];
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
