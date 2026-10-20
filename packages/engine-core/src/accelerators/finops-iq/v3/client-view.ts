/**
 * Client mode (D7, WS-S7; execution phase M3): the result as a client may see it. The server applies this before
 * sending, so nothing consultant-only reaches the browser: no conflict probes, no scoring internals (tier points
 * and trace, severity trace and pre-value severity, need-index components, the value model's scoring shares, each
 * lever's severity comparison base and the band-corner search, ignored answers). Consultant notes are never part
 * of a result. Fees will be added in M5 and stay consultant-only there.
 */
import type { FinOpsIqV3Result } from './evaluate';

export type ClientResult = Omit<FinOpsIqV3Result, 'conflicts'> & { view: 'client'; conflicts: [] };

/** Field names removed wherever they appear in these parts of the result. */
const REMOVED = {
  tier: ['points', 'trace', 'override'],
  capability: ['coreRating', 'loweredByDepth'],
  finding: ['severityTrace', 'severityBeforeValue', 'valueBasis'],
  needVerdict: ['baseIndex', 'modifiers', 'pending', 'valueBasis'],
  value: ['scoring', 'bands'],
  lever: ['scoring'],
  coverage: ['ignoredAnswers', 'unconfirmedPrefill']
} as const;

const omit = <T extends Record<string, any>>(o: T, keys: readonly string[]): T =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as T;

export function clientView(result: FinOpsIqV3Result): ClientResult {
  const r: FinOpsIqV3Result = JSON.parse(JSON.stringify(result));
  return {
    ...r,
    view: 'client',
    tier: omit(r.tier, REMOVED.tier),
    capabilities: r.capabilities.map(c => omit(c, REMOVED.capability)),
    findings: r.findings.filter(f => (f.type as string) !== 'conflict').map(f => omit(f, REMOVED.finding)),
    needVerdict: r.needVerdict ? omit(r.needVerdict, REMOVED.needVerdict) : null,
    value: { ...omit(r.value, REMOVED.value), levers: r.value.levers.map((l: any) => omit(l, REMOVED.lever)) },
    coverage: omit(r.coverage, REMOVED.coverage),
    conflicts: []
  };
}

/** Every field name client mode removes, for tests and the page's DOM check. */
export const CLIENT_REMOVED_FIELDS = [...new Set(Object.values(REMOVED).flat())];
