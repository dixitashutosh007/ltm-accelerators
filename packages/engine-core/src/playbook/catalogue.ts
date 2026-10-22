/**
 * Platform playbook (shared workstream WS-S3; docs/IMPROVEMENT_PLAN.md 5.1), built generic with FinOps IQ as its first
 * consumer (execution phase M5, D17). One versioned catalogue maps control × platform × level to an action: the
 * approach first, then options per platform, a verification step, an owner role and a review date. Engines select the
 * entries for a client's findings and platforms; the report shows them as "Technical execution" and the backlog
 * exports them. Entries are reviewed like claims: each cites claims in the claims register and has a review date.
 *
 * Rules (5.1, PLAN F8): an action is shown only for a finding that names its control; every platform the client
 * selected gets an entry (or an explicit "no platform action" entry) for each control that has a technical remedy;
 * application-level entries state the discovery they need; options are validated per engagement.
 */

/** Where an action applies. Providers match the FinOps contract's PROVIDERS; the rest are estate scopes. */
export const PLATFORMS = ['aws', 'azure', 'gcp', 'oci', 'ibm', 'alibaba', 'other_public', 'kubernetes', 'on_prem', 'saas', 'data_platform', 'any'] as const;
export type Platform = typeof PLATFORMS[number];
export const LEVELS = ['platform', 'stack', 'application'] as const;
export type PlaybookLevel = typeof LEVELS[number];
export const OPTION_KINDS = ['native', 'open_source', 'third_party', 'practice'] as const;

export interface PlaybookOption {
  /** Product or practice name as the provider writes it, e.g. "AWS Data Exports (FOCUS 1.2)". */
  name: string;
  kind: typeof OPTION_KINDS[number];
  detail?: string;
}

export interface PlaybookEntry {
  /** PB.<ACCELERATOR>.<control suffix>.<platform>.<level>, e.g. PB.FIN.ALLOCATION.aws.platform. */
  id: string;
  /** The finding's control, e.g. FIN.ALLOCATION (capability) or FIN.LEV-01 (lever). */
  control: string;
  platform: Platform;
  level: PlaybookLevel;
  /** What to do, imperative, one sentence. */
  action: string;
  /** The vendor-neutral approach, before any product. */
  approach: string;
  /** Options on this platform; empty only when noPlatformAction is true. */
  options: PlaybookOption[];
  /** How the client can tell it is done (measurable). */
  verification: string;
  effort: 'S' | 'M' | 'L';
  ownerRole: string;
  /** Required at application level: the discovery the action needs (billing data, telemetry, architecture review). */
  discoveryNeeded?: string;
  confirmRegionalAvailability: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  /** True when this platform needs no action for the control; `action` then says why. */
  noPlatformAction?: boolean;
  /** Claims in the claims register that source the options and verification. */
  claimIds: string[];
  /** Who reviewed the entry (role or practice lead agent), when, and when it is next due. */
  owner: string;
  lastReviewed: string;
  nextReview: string;
}

export interface PlaybookCatalogue {
  catalogueVersion: string;
  accelerator: string;
  statusAsOf: string;
  rule: string;
  /** Controls with a technical remedy: each needs an entry (or a noPlatformAction entry) on every platform. */
  technicalControls: string[];
  entries: PlaybookEntry[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^PB\.[A-Z]+\.[A-Za-z0-9_-]+\.[a-z_]+\.(platform|stack|application)$/;

/**
 * Checks a catalogue against the schema and the 5.1 rules that need no engine: field forms, unique IDs, the ID
 * matches control, platform and level, options present unless no platform action, discovery at application level,
 * claims exist, review date not passed. Returns failure strings.
 */
export function validateCatalogue(cat: PlaybookCatalogue, claimIds: Set<string>, today = new Date().toISOString().slice(0, 10)): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of cat.entries) {
    const at = e.id || '(no id)';
    if (!ID.test(e.id ?? '')) out.push(`${at}: id must be PB.<ACC>.<control>.<platform>.<level>`);
    if (seen.has(e.id)) out.push(`${at}: duplicate id`);
    seen.add(e.id);
    const suffix = (e.control ?? '').split('.').slice(1).join('.');
    if (e.id && !e.id.endsWith(`.${suffix}.${e.platform}.${e.level}`)) out.push(`${at}: id does not match control ${e.control}, platform and level`);
    if (!(PLATFORMS as readonly string[]).includes(e.platform)) out.push(`${at}: unknown platform ${e.platform}`);
    if (!(LEVELS as readonly string[]).includes(e.level)) out.push(`${at}: unknown level ${e.level}`);
    for (const k of ['action', 'approach', 'verification', 'ownerRole', 'owner'] as const) if (typeof e[k] !== 'string' || !e[k].trim()) out.push(`${at}: ${k} is required`);
    if (!['S', 'M', 'L'].includes(e.effort)) out.push(`${at}: effort must be S, M or L`);
    if (!['High', 'Medium', 'Low'].includes(e.confidence)) out.push(`${at}: confidence must be High, Medium or Low`);
    if (typeof e.confirmRegionalAvailability !== 'boolean') out.push(`${at}: confirmRegionalAvailability must be true or false`);
    if (!Array.isArray(e.options)) out.push(`${at}: options must be a list`);
    else {
      if (!e.noPlatformAction && !e.options.length) out.push(`${at}: an action needs at least one option`);
      for (const o of e.options) if (!o?.name || !(OPTION_KINDS as readonly string[]).includes(o.kind)) out.push(`${at}: option needs a name and a kind (${OPTION_KINDS.join(', ')})`);
    }
    if (e.level === 'application' && !e.discoveryNeeded?.trim()) out.push(`${at}: application-level entries state the discovery they need`);
    if (!Array.isArray(e.claimIds) || !e.claimIds.length) out.push(`${at}: at least one claim is required`);
    else for (const id of e.claimIds) if (!claimIds.has(id)) out.push(`${at}: unknown claim ${id}`);
    if (!DATE.test(e.lastReviewed ?? '') || !DATE.test(e.nextReview ?? '')) out.push(`${at}: lastReviewed and nextReview are YYYY-MM-DD`);
    else if (e.nextReview < today) out.push(`${at}: past its review date ${e.nextReview}`);
  }
  return out;
}

/** The platforms a client selected, as playbook platforms: providers, then estate scopes. */
export function platformsInScope(providers: string[], scopes: string[]): Platform[] {
  const out = new Set<Platform>(providers.filter(p => (PLATFORMS as readonly string[]).includes(p)) as Platform[]);
  if (scopes.includes('kubernetes')) out.add('kubernetes');
  if (scopes.some(s => s === 'private_cloud' || s === 'data_centre' || s === 'colocation')) out.add('on_prem');
  if (scopes.some(s => s === 'saas' || s === 'licensing')) out.add('saas');
  if (scopes.includes('data_cloud_platform')) out.add('data_platform');
  return [...out];
}

export interface SelectedActions {
  control: string;
  entries: PlaybookEntry[];
  /** Platforms in scope with no entry for this control (a catalogue gap the gate test reports). */
  missingPlatforms: Platform[];
}

/**
 * The entries for the given controls on the client's platforms. A control's `any` entries apply on every platform;
 * a platform counts as covered by its own entry or an `any` entry. Controls without any entry are not returned:
 * not every finding has a technical remedy (the accelerator's tests say which must have one).
 */
export function selectActions(cat: PlaybookCatalogue, controls: string[], platforms: Platform[]): SelectedActions[] {
  const out: SelectedActions[] = [];
  for (const control of [...new Set(controls)]) {
    const forControl = cat.entries.filter(e => e.control === control);
    if (!forControl.length) continue;
    const anyPlatform = forControl.some(e => e.platform === 'any');
    const entries = forControl.filter(e => e.platform === 'any' || platforms.includes(e.platform));
    const missingPlatforms = anyPlatform ? [] : platforms.filter(p => !forControl.some(e => e.platform === p));
    out.push({ control, entries, missingPlatforms });
  }
  return out;
}
