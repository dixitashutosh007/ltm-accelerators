/**
 * Technical execution and How LTM can help for FinOps IQ (execution phase M5; PLAN F8 and F9), from the shared
 * platform playbook (src/playbook, WS-S3) and offering catalogue (src/offerings, WS-S5). Both are selected from the
 * findings alone, so the engine result, the page and the report show the same thing:
 *   - each finding's controls: FIN.<CAPABILITY> for a capability gap, FIN.<LEVER> for each lever it acts on;
 *   - each finding's platforms: the providers and estate scopes it names (public_cloud:aws -> aws, data_centre -> on_prem);
 *   - the offerings a finding names, with the client-visible part only; indicative scope stays in the SOW draft.
 */
import playbookData from '../../../playbook/finops-iq.json' with { type: 'json' };
import offeringData from '../../../offerings/finops-iq.json' with { type: 'json' };
import { platformsInScope, selectActions, type Platform, type PlaybookCatalogue, type PlaybookEntry } from '../../../playbook/catalogue';
import { clientOffering, type ClientOffering, type OfferingCatalogue } from '../../../offerings/catalogue';

export const PLAYBOOK = playbookData as unknown as PlaybookCatalogue;
export const OFFERINGS = offeringData as unknown as OfferingCatalogue;

/** The part of a finding the selection needs (the engine's Finding satisfies it). */
export interface FindingRef {
  id: string; type: string; capability: string; scopes: string[]; leverIds: string[]; offeringIds: string[];
  leverActions: Array<{ leverId: string; zeroValue: boolean }>;
}

export type TechnicalAction = Omit<PlaybookEntry, 'id' | 'owner' | 'lastReviewed' | 'nextReview'> & { entryId: string; findingId: string; reviewedOn: string };

export interface TechnicalPlan {
  catalogueVersion: string;
  /** One per finding, control and platform entry; an action is never shown without its finding (5.1). */
  actions: TechnicalAction[];
  /** Controls with a technical remedy whose catalogue has no entry for a platform the finding names. */
  gaps: Array<{ findingId: string; control: string; platforms: Platform[] }>;
  statement: string;
  claimIds: string[];
}

export interface HelpItem { offering: ClientOffering; findingIds: string[]; claimIds: string[] }

/** The controls a finding acts on: its capability for a gap, and each lever it carries a non-zero action for. */
export function controlsOf(f: FindingRef): string[] {
  const levers = f.type === 'lever_opportunity' ? f.leverIds : f.leverActions.filter(a => !a.zeroValue).map(a => a.leverId);
  return [...new Set([...(f.type === 'capability_gap' ? [`FIN.${f.capability}`] : []), ...levers.map(id => `FIN.${id}`)])];
}

/** The platforms a finding names: providers from public_cloud:<provider>, then estate scopes. */
export function platformsOf(f: FindingRef): Platform[] {
  const providers = f.scopes.filter(s => s.startsWith('public_cloud:')).map(s => s.split(':')[1]);
  return platformsInScope(providers, f.scopes.map(s => s.split(':')[0]));
}

export function technicalPlan(findings: FindingRef[], cat: PlaybookCatalogue = PLAYBOOK): TechnicalPlan {
  const actions: TechnicalAction[] = [];
  const gaps: TechnicalPlan['gaps'] = [];
  const technical = new Set(cat.technicalControls);
  for (const f of findings) {
    for (const sel of selectActions(cat, controlsOf(f), platformsOf(f))) {
      for (const { id, owner, lastReviewed, nextReview, ...e } of sel.entries) actions.push({ ...e, entryId: id, findingId: f.id, reviewedOn: lastReviewed });
      if (sel.missingPlatforms.length && technical.has(sel.control)) gaps.push({ findingId: f.id, control: sel.control, platforms: sel.missingPlatforms });
    }
    // A technical control with no entries at all is a gap on every platform the finding names.
    for (const control of controlsOf(f).filter(x => technical.has(x) && !cat.entries.some(e => e.control === x))) {
      gaps.push({ findingId: f.id, control, platforms: platformsOf(f) });
    }
  }
  return {
    catalogueVersion: cat.catalogueVersion,
    actions, gaps,
    statement: 'Platform actions are indicative: validate each option for your engagement against current regional availability, pricing and licensing. Application-level actions need the discovery they state.',
    claimIds: ['CLM-FIN-180', ...new Set(actions.flatMap(a => a.claimIds))]
  };
}

/**
 * How LTM can help: the offerings the findings name, in catalogue order, each with the findings that call for it.
 * Routes to other LTM accelerators stay in the consultant's SOW draft: a client does not know the product names (D14).
 * Outline items tied to a scope appear only when one of the offering's findings names that scope (D20).
 */
export function howLtmCanHelp(findings: FindingRef[], cat: OfferingCatalogue = OFFERINGS): HelpItem[] {
  return cat.offerings
    .filter(o => o.type !== 'Route')
    .map(o => {
      const serves = findings.filter(f => f.offeringIds.includes(o.id));
      const scopes = new Set(serves.flatMap(f => f.scopes.map(x => x.split(':')[0])));
      return { offering: clientOffering(o, scopes), findingIds: serves.map(f => f.id), claimIds: [...cat.claimIds] };
    })
    .filter(h => h.findingIds.length);
}
