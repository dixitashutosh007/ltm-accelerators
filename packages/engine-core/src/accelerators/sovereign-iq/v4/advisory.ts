/**
 * Sovereign Cloud Advisory and technical execution for Sovereign IQ (PLAN S7, D17, D19), from the placement ladder
 * (placement-ladder.json) and the shared platform playbook (src/playbook, WS-S3). Both read the engine result only,
 * so the page, the report and the backlog show the same thing:
 *   - placement: for each kind of data at L1 or above on AWS, Azure or Google Cloud, the minimum rung its level needs,
 *     the state of that rung's controls, the options at the rung in its allowed zone, and the actions that close the gap;
 *   - technical: for each control gap, the playbook entries on every platform that holds the affected data.
 * An action is never shown without the finding that calls for it (5.1). The ladder changes the advice, never the
 * maturity score (D3).
 */
import ladderData from './placement-ladder.json' with { type: 'json' };
import register from '../../../claims/claims-register.json' with { type: 'json' };
import playbookData from '../../../playbook/sovereign-iq.json' with { type: 'json' };
import { selectActions, type Platform, type PlaybookCatalogue, type PlaybookEntry } from '../../../playbook/catalogue';
import type { DataClass, Facts, Level } from './facts';

export const PLAYBOOK = playbookData as unknown as PlaybookCatalogue;

export type Rung = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';
export type Hyperscaler = 'aws' | 'azure' | 'gcp';
export const HYPERSCALERS: Hyperscaler[] = ['aws', 'azure', 'gcp'];
type State = 0 | 1 | 2 | 3 | 'unknown' | 'not_answered';

export interface LadderOption {
  id: string; provider: Hyperscaler; rung: Rung; name: string; kind: 'native' | 'partner';
  /** Zones where it is offered; 'any' for a feature available in every region. */
  zones: string[];
  /** Only 'ga' meets a rung (D24); the others are shown, labelled. 'per_engagement' needs the provider's written confirmation. */
  availability: 'ga' | 'preview' | 'announced' | 'per_engagement'; detail: string;
  /** Shown with the option, e.g. eligibility for government clouds (D27). */
  caveat?: string;
  claimIds: string[]; confirmRegionalAvailability: boolean;
}
/** R4 is never claimed for an offering: the facts a counsel needs, and the fixed line (D26). */
export interface R4Fact {
  id: string; name: string; owner: string; operator: string; operatorLaw: string; technologySupplier: string;
  zones: string[]; claimIds: string[];
}
export const COUNSEL_NOTE = 'Whether this meets R4 is for your counsel. Your own organisation, or a parent or subsidiary, can still be compelled by a foreign law to produce data it controls, whatever the provider.';
export interface LadderAlternative {
  id: string; rung: Rung; name: string; kind: 'partner_operated' | 'sovereign_provider' | 'private_cloud' | 'disconnected';
  zones: string[]; detail: string; claimIds: string[];
}
export interface Ladder {
  ladderVersion: string; statusAsOf: string; rule: string;
  rungs: Array<{ id: Rung; level: Level; label: string; means: string; controls: string[]; platformMove?: boolean }>;
  providers: Record<Hyperscaler, { label: string; parent: string }>;
  options: LadderOption[]; alternatives: LadderAlternative[]; r4Facts: R4Fact[];
}
export const LADDER = ladderData as unknown as Ladder;

const HIDDEN_CLAIMS = new Set<string>(((register as any).claims as any[]).filter(c => c.clientVisible === false).map(c => c.id));
/** True when an option, alternative or action rests only on claims cleared for clients (client edition, PLAN S7). */
export const clientCleared = (x: { claimIds: string[] }) => !x.claimIds.some(id => HIDDEN_CLAIMS.has(id));

/** The part of the engine result the advisory reads (SovereignIqV4Result satisfies it). */
export interface AdvisoryInput {
  facts: Facts;
  requirements: Array<{ dataClass: DataClass; required: Level; allowedZone: string[] }>;
  controls: Array<{ control: string; state: State; byClass?: Partial<Record<DataClass, State>> }>;
  findings: Array<{ id: string; type: string; control?: string; dataClasses: DataClass[] }>;
  /** Regime grades, for options shown only where a regime is in scope (e.g. Data Act switching rights). */
  regimes?: Array<{ regime: string; grade: string }>;
}

export type PlacementStatus = 'meets' | 'gap' | 'unconfirmed' | 'move';

export interface PlacementRow {
  dataClass: DataClass; platform: Hyperscaler; requiredLevel: Level; allowedZone: string[];
  minimumRung: Rung;
  /** meets: every control up to the rung is in place; gap: one is below full; unconfirmed: unknown or not asked;
   *  move: the rung needs an offering the provider's standard regions cannot give for this zone. */
  status: PlacementStatus;
  rungControls: Array<{ rung: Rung; control: string; state: State }>;
  /** O2 says in-zone operations, but the data sits in standard regions of a provider whose parent is outside the zone. */
  confirmOperatingModel: boolean;
  services: string[];
  options: LadderOption[];
  /** Allowed zones with no option from this provider at the rung (the matrix says so and shows alternatives). */
  noOfferingZones: string[];
  alternatives: Array<LadderOption | LadderAlternative>;
  /** At R4 only: facts about offerings in the zone, for counsel; never presented as meeting R4 (D26). */
  r4Facts: R4Fact[];
  actions: AdvisoryAction[];
  findingIds: string[];
}

export type AdvisoryAction = Omit<PlaybookEntry, 'id' | 'owner' | 'lastReviewed' | 'nextReview'> & { entryId: string; findingId: string; reviewedOn: string };

export interface Advisory {
  ladderVersion: string; catalogueVersion: string; statusAsOf: string;
  placement: PlacementRow[];
  /** Every control gap's playbook entries on the platforms that hold its data. */
  technical: AdvisoryAction[];
  /** Technical controls with no entry for a platform in scope (the Gate S7 test requires none). */
  gaps: Array<{ findingId: string; control: string; platforms: Platform[] }>;
  statement: string;
  claimIds: string[];
}

const RUNGS: Rung[] = ['R0', 'R1', 'R2', 'R3', 'R4'];
const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** P1 platforms as playbook platforms; 'unknown' has none. */
const PLAYBOOK_PLATFORM: Record<string, Platform> = {
  aws: 'aws', azure: 'azure', gcp: 'gcp', oci: 'oci', ibm: 'ibm', onprem: 'on_prem', colo: 'on_prem',
  hyperscaler_sovereign_offering: 'sovereign_cloud', partner_operated_cloud: 'sovereign_cloud', eu_sovereign_provider: 'sovereign_cloud',
  apac_national_cloud: 'sovereign_cloud', cn_cloud: 'other_public', other: 'other_public', saas_major: 'saas', ai_api_provider: 'ai_api'
};
export const playbookPlatforms = (p1: string[]): Platform[] => [...new Set(p1.map(p => PLAYBOOK_PLATFORM[p]).filter(Boolean))];

/** Platforms holding a class: its L2 platforms, or every P1 platform when L2 is not given (never flatters). */
function classPlatforms(facts: Facts, c: DataClass): string[] {
  const perClass = (facts['data.class_platforms'] as Record<string, string[]> | undefined)?.[c];
  return perClass?.length ? perClass : list(facts['plat.in_scope']);
}

const covers = (zones: string[], z: string) => zones.includes('any') || zones.includes(z);
const forServices = (entries: PlaybookEntry[], services: string[]) =>
  services.length ? entries.filter(e => !e.serviceFamilies?.length || e.serviceFamilies.some(s => services.includes(s))) : entries;
/** The entry as an action, keeping only the options that serve the data's allowed zones and whose regime is in scope (S6 challenge D5, D10). */
const toAction = ({ id, owner, lastReviewed, nextReview, ...e }: PlaybookEntry, findingId: string, zones: string[], regimes: Set<string>): AdvisoryAction => ({
  ...e, entryId: id, findingId, reviewedOn: lastReviewed,
  options: e.options.filter(o => (!o.zones?.length || !zones.length || o.zones.some(z => zones.includes(z))) && (!o.requiresRegime || regimes.has(o.requiresRegime)))
});

export function advisory(r: AdvisoryInput, ladder: Ladder = LADDER, cat: PlaybookCatalogue = PLAYBOOK): Advisory {
  const control = new Map(r.controls.map(c => [c.control, c]));
  const stateOf = (id: string, c: DataClass): State => {
    const x = control.get(id);
    if (!x) return 'not_answered';
    return x.byClass ? (x.byClass[c] ?? 'not_answered') : x.state;
  };
  const findingOf = (id: string) => r.findings.find(f => f.type === 'control_gap' && f.control === id);
  const services = (r.facts['data.class_services'] ?? {}) as Record<string, Record<string, string[]>>;
  const inScope = new Set((r.regimes ?? []).filter(g => g.grade === 'applies' || g.grade === 'likely_confirm').map(g => g.regime));
  const zonesOf = (classes: DataClass[]) => [...new Set(r.requirements.filter(q => !classes.length || classes.includes(q.dataClass)).flatMap(q => q.allowedZone))];

  const placement: PlacementRow[] = [];
  for (const req of r.requirements) {
    if (req.required === 'L0') continue;
    const minimumRung = ladder.rungs.find(x => x.level === req.required)!.id;
    const upTo = ladder.rungs.slice(1, RUNGS.indexOf(minimumRung) + 1);
    const rung = upTo[upTo.length - 1];
    for (const platform of HYPERSCALERS.filter(p => classPlatforms(r.facts, req.dataClass).includes(p))) {
      const rungControls = upTo.flatMap(x => x.controls.map(cid => ({ rung: x.id, control: cid, state: stateOf(cid, req.dataClass) })));
      const outsideParent = !req.allowedZone.includes(ladder.providers[platform].parent);
      const move = !!rung.platformMove && outsideParent;
      const personnel = rungControls.find(x => x.control === 'SOV.OPS.PERSONNEL_ZONE');
      // O2 answered "in place" for standard regions run from outside the zone: ask the consultant to confirm rather
      // than overrule the answer (R3 only; at R4 the parent jurisdiction decides).
      const confirmOperatingModel = move && minimumRung === 'R3' && personnel?.state === 3;
      const below = rungControls.filter(x => typeof x.state === 'number' && x.state < 3);
      const open = rungControls.filter(x => typeof x.state !== 'number');
      const status: PlacementStatus = confirmOperatingModel ? 'unconfirmed' : move ? 'move' : below.length ? 'gap' : open.length ? 'unconfirmed' : 'meets';

      const zones = req.allowedZone;
      const atRung = ladder.options.filter(o => o.rung === minimumRung);
      const options = atRung.filter(o => o.provider === platform && zones.some(z => covers(o.zones, z)));
      // Only generally available options meet the rung (D24); at R4 none does, by rule (D26).
      const meetsIn = (z: string) => minimumRung !== 'R4' && options.some(o => o.availability === 'ga' && covers(o.zones, z));
      const noOfferingZones = minimumRung === 'R1' ? [] : zones.filter(z => !meetsIn(z));
      // Alternatives only where this provider has nothing for a zone: other providers' options at the rung, then the
      // non-hyperscaler routes, each in catalogue order (no ranking).
      const alternatives = noOfferingZones.length ? [
        ...atRung.filter(o => o.provider !== platform && o.availability === 'ga' && noOfferingZones.some(z => covers(o.zones, z))),
        ...ladder.alternatives.filter(a => a.rung === minimumRung && noOfferingZones.some(z => covers(a.zones, z)))
      ] : [];

      // Actions: playbook entries for the controls up to the rung that have a finding for this class (5.1).
      const svc = services[req.dataClass]?.[platform] ?? [];
      const actions: AdvisoryAction[] = [];
      const findingIds: string[] = [];
      const gapControls = [...new Set([...below, ...open].map(x => x.control).concat(move && minimumRung === 'R4' ? ['SOV.JUR.IMMUNITY'] : []))];
      for (const cid of gapControls) {
        const f = findingOf(cid);
        if (!f || (f.dataClasses.length && !f.dataClasses.includes(req.dataClass))) continue;
        findingIds.push(f.id);
        for (const sel of selectActions(cat, [cid], [platform])) for (const e of forServices(sel.entries, svc)) actions.push(toAction(e, f.id, zones, inScope));
      }
      placement.push({
        dataClass: req.dataClass, platform, requiredLevel: req.required, allowedZone: zones, minimumRung, status,
        rungControls, confirmOperatingModel, services: svc, options, noOfferingZones, alternatives,
        r4Facts: minimumRung === 'R4' ? ladder.r4Facts.filter(f => zones.some(z => covers(f.zones, z))) : [], actions, findingIds
      });
    }
  }

  // Technical execution across every platform (S7 item 6): each control gap on the platforms holding its data.
  const technical: AdvisoryAction[] = [];
  const gaps: Advisory['gaps'] = [];
  const technicalControls = new Set(cat.technicalControls);
  for (const f of r.findings.filter(x => x.type === 'control_gap' && x.control)) {
    const holding = f.dataClasses.length ? [...new Set(f.dataClasses.flatMap(c => classPlatforms(r.facts, c)))] : list(r.facts['plat.in_scope']);
    const platforms = playbookPlatforms(holding);
    const sel = selectActions(cat, [f.control!], platforms);
    const zones = zonesOf(f.dataClasses);
    for (const s of sel) for (const e of s.entries) technical.push(toAction(e, f.id, zones, inScope));
    if (!technicalControls.has(f.control!)) continue;
    const missing = sel.length ? sel[0].missingPlatforms : platforms;
    if (missing.length) gaps.push({ findingId: f.id, control: f.control!, platforms: missing });
  }

  const claimIds = [...new Set([
    ...placement.flatMap(p => [...p.options, ...p.alternatives, ...p.r4Facts].flatMap(o => o.claimIds)),
    ...placement.flatMap(p => p.actions.flatMap(a => a.claimIds)),
    ...technical.flatMap(a => a.claimIds)
  ])];
  return {
    ladderVersion: ladder.ladderVersion, catalogueVersion: cat.catalogueVersion, statusAsOf: ladder.statusAsOf,
    placement, technical, gaps,
    statement: 'Provider options are examples, not recommendations of one provider over another. Confirm availability in your regions, and the terms and pricing, before relying on any option. Application-level plans need technical discovery beyond this assessment.',
    claimIds
  };
}
