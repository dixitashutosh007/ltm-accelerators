/**
 * The SEAL view for Sovereign IQ (PLAN S7b; DESIGN.md 3.4, D12, D15, D16). SEAL rates a provider's service per
 * sovereignty objective, so the view says what level of provider service each kind of data needs, never "you are
 * SEAL-x", and never rates a provider:
 *   - per kind of data: the minimum SEAL per mapped objective (SOV-2 to SOV-6) for its required level;
 *   - per objective: the client's required controls tagged to it (controls.json `seal`), in place or not;
 *   - tender minimums (L3): the lowest LTM level whose row meets every stated minimum raises the required level of
 *     the classes the tender covers; SOV-1, SOV-7 and SOV-8 minimums become provider-selection criteria (S7).
 */
import sealData from './seal.json' with { type: 'json' };
import catalogue from './controls.json' with { type: 'json' };
import { LEVELS, type DataClass, type Level } from './facts';

export interface SealData {
  sealVersion: string; statusAsOf: string; framework: string; claimIds: string[]; rule: string; intro: string; l4Note: string;
  tenderResults: { date: string; statement: string; claimIds: string[] };
  levels: Array<{ id: number; name: string; wording: string; plain: string; status: string; note?: string }>;
  objectives: Array<{ id: string; name: string; mapped: boolean }>;
  mapping: Record<Level, Record<string, number>>;
}
export const SEAL = sealData as unknown as SealData;
export const MAPPED = SEAL.objectives.filter(o => o.mapped).map(o => o.id);
const SEAL_TAGS = new Map<string, string[]>(((catalogue as any).controls as any[]).map(c => [c.id, c.seal ?? []]));

type State = 0 | 1 | 2 | 3 | 'unknown' | 'not_answered';

export interface TenderLevel {
  level: Level;
  /** Mapped objectives whose minimum is above the L4 row: no LTM level reaches them (shown, never hidden). */
  beyondMapping: string[];
  selectionCriteria: Array<{ objective: string; minimum: number }>;
}

/** DESIGN 3.4 reverse use: the lowest level whose row meets or exceeds every stated minimum on the mapped objectives. */
export function tenderLevel(minimums: Record<string, number>): TenderLevel {
  const mapped = Object.entries(minimums).filter(([o]) => MAPPED.includes(o));
  const meets = (l: Level) => mapped.every(([o, n]) => (SEAL.mapping[l][o] ?? 0) >= n);
  const level = LEVELS.find(meets) ?? 'L4';
  return {
    level,
    beyondMapping: mapped.filter(([o, n]) => (SEAL.mapping.L4[o] ?? 0) < n).map(([o]) => o),
    selectionCriteria: Object.entries(minimums).filter(([o]) => !MAPPED.includes(o)).map(([objective, minimum]) => ({ objective, minimum }))
  };
}

export interface SealView {
  sealVersion: string; framework: string; statusAsOf: string; claimIds: string[];
  /** Minimum SEAL per mapped objective for each kind of data at L1 or above (null: no minimum at its level). */
  byClass: Array<{ dataClass: DataClass; level: Level; minimums: Record<string, number | null> }>;
  /** The highest minimum across the kinds of data, per mapped objective. */
  organisation: Record<string, number | null>;
  objectives: Array<{ id: string; name: string; mapped: boolean; controls: Array<{ control: string; state: State }>; inPlace: number }>;
  tender: (TenderLevel & { minimums: Record<string, number>; classes: DataClass[]; raised: Array<{ dataClass: DataClass; from: Level; to: Level }> }) | null;
  /** Shown when a kind of data needs L4 (D22). */
  l4Note: string | null;
  /** The Commission's own published tender results: dated facts, consultant view only (D20). */
  commissionTenderResults: { date: string; statement: string; claimIds: string[] };
  statement: string;
}

export interface SealInput {
  facts: Record<string, unknown>;
  requirements: Array<{ dataClass: DataClass; required: Level; tender?: Level | null; choice?: Level | 'unknown' | null; floor?: { level: Level } | null }>;
  controls: Array<{ control: string; state: State }>;
}

export function sealView(r: SealInput): SealView {
  const byClass = r.requirements.filter(q => q.required !== 'L0').map(q => ({
    dataClass: q.dataClass, level: q.required,
    minimums: Object.fromEntries(MAPPED.map(o => [o, SEAL.mapping[q.required][o] ?? null]))
  }));
  const organisation = Object.fromEntries(MAPPED.map(o => {
    const ns = byClass.map(c => c.minimums[o]).filter((n): n is number => n != null);
    return [o, ns.length ? Math.max(...ns) : null];
  }));
  const objectives = SEAL.objectives.map(o => {
    const controls = r.controls.filter(c => SEAL_TAGS.get(c.control)?.includes(o.id)).map(c => ({ control: c.control, state: c.state }));
    return { id: o.id, name: o.name, mapped: o.mapped, controls, inPlace: controls.filter(c => c.state === 3).length };
  });
  const minimums = r.facts['data.tender_minimums'] as Record<string, number> | undefined;
  let tender: SealView['tender'] = null;
  if (minimums && Object.keys(minimums).length) {
    const t = tenderLevel(minimums);
    const classes = (r.facts['data.tender_classes'] as DataClass[] | undefined) ?? [];
    const raised = r.requirements.filter(q => q.tender && classes.includes(q.dataClass)).flatMap(q => {
      const without = [q.floor?.level, q.choice && q.choice !== 'unknown' ? q.choice : null].filter(Boolean) as Level[];
      const from = without.reduce<Level>((a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a), 'L0');
      return LEVELS.indexOf(q.required) > LEVELS.indexOf(from) ? [{ dataClass: q.dataClass, from, to: q.required }] : [];
    });
    tender = { ...t, minimums, classes, raised };
  }
  return {
    sealVersion: SEAL.sealVersion, framework: SEAL.framework, statusAsOf: SEAL.statusAsOf, claimIds: SEAL.claimIds,
    byClass, organisation, objectives, tender,
    l4Note: byClass.some(c => c.level === 'L4') ? SEAL.l4Note : null,
    commissionTenderResults: SEAL.tenderResults,
    statement: 'SEAL levels rate a provider\'s service, one sovereignty objective at a time. This view shows the minimum each kind of data needs from its providers, using an LTM mapping from the required level, not the Commission\'s. It is not a SEAL assessment or certification of you or of any provider.'
  };
}
