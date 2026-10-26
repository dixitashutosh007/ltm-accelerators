/**
 * Answers to facts (DESIGN.md section 2). Scope questions set facts; maturity questions set control states (ctl.*);
 * derived facts are computed here and never answered. Facts are flat, keyed by their dotted path.
 */
import { isUnknown } from './conditions';

export type Zone = 'eea' | 'uk' | 'ch' | 'us' | 'ca' | 'in' | 'sg' | 'au' | 'nz' | 'jp' | 'hk' | 'kr' | 'cn' | 'other';
export type DataClass = 'personal' | 'special' | 'financial' | 'ai_training' | 'proprietary' | 'government' | 'ot_ci';
export type Level = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
export type Answers = Record<string, unknown>;
export type Facts = Record<string, unknown>;

export const ZONES: Zone[] = ['eea', 'uk', 'ch', 'us', 'ca', 'in', 'sg', 'au', 'nz', 'jp', 'hk', 'kr', 'cn', 'other'];
export const DATA_CLASSES: DataClass[] = ['personal', 'special', 'financial', 'ai_training', 'proprietary', 'government', 'ot_ci'];
export const LEVELS: Level[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
/** Classes whose allowed zone defaults to where their people are; the others default to where the group has entities. */
export const PEOPLE_CLASSES: DataClass[] = ['personal', 'special', 'financial'];

/**
 * Default parent jurisdiction of each platform (DESIGN.md 2.4). 'hq' is the client's own headquarters; 'asked'
 * platforms take the zones given in P2, or unknown until P2 is answered. A fact, never a maturity score (D3).
 */
const PARENT: Record<string, Zone | 'hq' | 'asked'> = {
  onprem: 'hq', colo: 'hq', aws: 'us', azure: 'us', gcp: 'us', oci: 'us', ibm: 'us', hyperscaler_sovereign_offering: 'us', ai_api_provider: 'us',
  eu_sovereign_provider: 'eea', cn_cloud: 'cn',
  partner_operated_cloud: 'asked', saas_major: 'asked', apac_national_cloud: 'asked', other: 'asked', unknown: 'asked'
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter(x => typeof x === 'string') as string[] : []);
const known = (v: string[]) => v.filter(x => x !== 'unknown');
const level = (v: unknown): Level | 'unknown' | undefined => (LEVELS.includes(v as Level) ? (v as Level) : v === 'unknown' ? 'unknown' : undefined);

/** Parent zones of one platform: its default, the client's HQ, or the P2 answer ('unknown' when not known). */
export function platformParents(platform: string, facts: Facts): string[] {
  const p = PARENT[platform];
  if (!p) return ['unknown'];
  if (p === 'hq') return isUnknown(facts['org.hq']) ? ['unknown'] : [facts['org.hq'] as string];
  if (p === 'asked') { const given = known(list(facts['prov.p2'])); return given.length ? given : ['unknown']; }
  return [p];
}

/** The scope facts from the answers (mode filtering happens before: only questions asked in the mode are passed). */
export function scopeFacts(a: Answers, mode: 'executive' | 'workshop'): Facts {
  const f: Facts = {};
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== null) f[k] = v; };
  set('org.hq', a.A1);
  const a2 = (a.A2 ?? {}) as { entity?: unknown; people?: unknown };
  // The headquarters is an establishment, whether or not the A2 row was ticked.
  const est = list(a2.entity);
  set('org.establishments', a.A1 && !isUnknown(a.A1) ? [...new Set([a.A1 as string, ...est])] : a2.entity !== undefined ? est : undefined);
  set('data.subject_regions', a2.people !== undefined ? list(a2.people) : undefined);
  set('org.sector', a.A3);
  const a4 = (a.A4 ?? {}) as Record<string, unknown>;
  set('org.staff_band', a4.staff_band);
  set('org.turnover_band_eur', a4.turnover_band_eur);
  const a5 = (a.A5 ?? {}) as Record<string, unknown>;
  set('org.turnover_amount', a5.turnover_amount);
  set('org.balance_sheet_band_eur', a5.balance_sheet_band_eur);
  set('org.eea_member_states', a.A6);
  set('org.us_states', a.A7);
  set('ent.flags', a.B1);
  const b2 = (a.B2 ?? {}) as Record<string, unknown>;
  set('ent.nis2_self_class', b2.self_class);
  set('ent.nis2_special_type', b2.special_type);
  set('ent.ci_regimes', a.B3);
  set('ent.ai_roles', a.B4);
  set('data.classes', a.D1 !== undefined ? known(list(a.D1)) : undefined);
  set('data.personal_volume', a.D2);
  const t3 = (a.T3 ?? {}) as Record<string, unknown>;
  set('data.us_sensitive_categories', t3.categories);
  set('plat.in_scope', a.P1);
  set('prov.p2', a.P2);
  set('xfer.mechanisms', a.T1);
  set('pref.risk_appetite', a.W1);
  set('pref.investment_appetite', a.W2);
  set('pref.outcomes', a.W3);

  // Location, choice level, allowed zones and platforms per class (D3, L1, L2). Executive mode sets one level for all.
  const classes = list(f['data.classes']) as DataClass[];
  const d3 = (a.D3 ?? {}) as Record<string, { primary?: unknown; backup?: unknown }>;
  const l2 = (mode === 'workshop' ? a.L2 ?? {} : {}) as Record<string, { level?: unknown; zones?: unknown; platforms?: unknown }>;
  const location: Record<string, { primary?: string[]; backup?: string[] }> = {};
  const choice: Record<string, Level | 'unknown'> = {};
  const zones: Record<string, string[]> = {};
  const platforms: Record<string, string[]> = {};
  for (const c of classes) {
    if (d3[c]) location[c] = { primary: d3[c].primary !== undefined ? list(d3[c].primary) : undefined, backup: d3[c].backup !== undefined ? list(d3[c].backup) : undefined };
    const lv = level(l2[c]?.level) ?? level(a.L1);
    if (lv) choice[c] = lv;
    if (list(l2[c]?.zones).length) zones[c] = known(list(l2[c]?.zones));
    if (list(l2[c]?.platforms).length) platforms[c] = list(l2[c]?.platforms);
  }
  f['data.location'] = location;
  f['data.choice_level'] = choice;
  f['data.allowed_zone_given'] = zones;
  f['data.class_platforms'] = platforms;

  // Provider parents (2.4), the union of every location zone (S2 design change 1), the size class and the transfer test.
  f['prov.parent_jurisdictions'] = [...new Set(list(f['plat.in_scope']).flatMap(p => platformParents(p, f)))];
  f['derived.all_location_zones'] = [...new Set(Object.values(location).flatMap(l => [...(l.primary ?? []), ...(l.backup ?? [])]))];
  f['derived.size_class_eu'] = sizeClass(f);
  return f;
}

const rank = (order: string[], v: unknown) => order.indexOf(v as string);

/** DESIGN.md 2.6: first match; the engine never guesses, so an unsettled size is 'uncertain'. */
export function sizeClass(f: Facts): string {
  const staff = f['org.staff_band'], bal = f['org.balance_sheet_band_eur'];
  const t = rank(['lt10m', '10m_50m', '50m_250m', '250m_1bn', '1bn_10bn', 'gt10bn'], f['org.turnover_band_eur']);
  if (staff === '250plus' || (t >= 2 && bal === 'gt43m')) return 'large';
  if (t >= 2 && (bal === undefined || bal === 'unknown') && staff === '50_249') return 'medium_or_large';
  if (staff === '50_249' || (t >= 1 && (bal === '10m_43m' || bal === 'gt43m'))) return 'medium';
  if (staff === 'lt50' && (t === 0 || bal === 'le10m')) return 'small_or_micro';
  return 'uncertain';
}

/**
 * Zones where personal data of each subject region may sit without a transfer: the region itself, plus regions with
 * adequacy from it. Intra-EEA replication is never a transfer (the EEA is one zone). The adequacy lists are the ones
 * the transfer test needs; the transfer basis itself is scored from T1.
 */
const NO_TRANSFER_ZONES: Partial<Record<Zone, Zone[]>> = {
  // Sourced in S4 (25 Oct 2026). Canada counts for private-sector (PIPEDA) recipients, Japan for APPI business operators
  // under the Supplementary Rules, Korea without credit information held by FSC-supervised institutions [CLM-SOV-201 to 206].
  eea: ['eea', 'uk', 'ch', 'ca', 'jp', 'kr', 'nz'],
  uk: ['uk', 'eea', 'ch', 'ca', 'jp', 'kr', 'nz'],
  ch: ['ch', 'eea', 'uk', 'nz', 'ca'], // Swiss FDPIC Annex 1: New Zealand in full, Canada private sector [CLM-SOV-207]
  // Conservative: storage on a foreign cloud whose provider does not handle the data is not an Art. 28 provision, but
  // the engine cannot tell; the result notes it [CLM-SOV-208, 209].
  jp: ['jp', 'eea', 'uk'],
  kr: ['kr', 'eea'], // UK recognition under review since 1 Oct 2026 [CLM-SOV-210, 211]
  // Conservative: storage-only cloud under the client's effective control is a "use", not a disclosure (OAIC 8.14);
  // the engine cannot tell; the result notes it [CLM-SOV-214].
  au: ['au'],
  sg: ['sg'], // storage abroad through a cloud provider is a transfer (PDPC 8.3) [CLM-SOV-215]
  cn: ['cn'] // storage and remote access from abroad are exports; Hong Kong is outside [CLM-SOV-216]
};
// Regions without an entry place no restriction on where their people's data is stored, so storage never makes a
// transfer: US, India until s.16 notifications, Hong Kong (s.33 not in operation), other, New Zealand (storage by an
// agent is not a disclosure, s.11 [CLM-SOV-212]) and Canada (except Quebec's s.17 assessment [CLM-SOV-219]).
// Disclosures and remote access from abroad still need a route in T1 [CLM-SOV-217].

/** DESIGN.md 2.6 derived.personal_transfer: personal data outside its subjects' zone, or any named transfer route. */
export function personalTransfer(f: Facts): boolean {
  const classes = list(f['data.classes']);
  if (!classes.some(c => PEOPLE_CLASSES.includes(c as DataClass))) return false;
  const mech = known(list(f['xfer.mechanisms']));
  if (mech.some(m => m !== 'no_transfer')) return true;
  return personalOutsideSubjects(f);
}

/** True when D3 places personal, special or financial data outside every zone its people's regimes allow. */
export function personalOutsideSubjects(f: Facts): boolean {
  const people = (known(list(f['data.subject_regions'])) as Zone[]).filter(p => NO_TRANSFER_ZONES[p]);
  if (!people.length) return false;
  const loc = f['data.location'] as Record<string, { primary?: string[]; backup?: string[] }>;
  for (const c of PEOPLE_CLASSES) {
    const zs = known([...(loc[c]?.primary ?? []), ...(loc[c]?.backup ?? [])]);
    for (const z of zs) {
      // Data of people in a region is "outside" when the location is not in that region's no-transfer set.
      if (people.some(p => !NO_TRANSFER_ZONES[p]!.includes(z as Zone))) return true;
    }
  }
  return false;
}
