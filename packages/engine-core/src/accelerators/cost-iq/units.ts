/**
 * Cost IQ unit costs (PRODUCT-GRADE-PLAN.md, C2): technology spend per employee and per user, and, where the client's own
 * split by category is recorded, infrastructure spend per server and application spend per application. They divide the
 * spend the indicative value rests on (the band, or the client's exact figure) by counts the consultant records, so a band
 * gives a range and an exact figure a single value. No peer comparison is made: no verified per-unit benchmark is used.
 */
import type { IndicativeResult } from './indicative';
import type { SpendBaseline } from './non-cloud-levers';

export interface UnitCost { key: 'perEmployee' | 'perUser' | 'perServer' | 'perApplication'; count: 'employees' | 'users' | 'servers' | 'applications'; of: 'all' | 'INFRA' | 'APPS'; low: number; high: number | null }

export function unitCosts(ind: IndicativeResult, baseline: SpendBaseline | null | undefined): UnitCost[] {
  const u = baseline?.units, s = ind.spend;
  if (!u || !s) return [];
  const split = baseline?.splitPercent;
  const part = (of: UnitCost['of']) => (of === 'all' ? 1 : split?.[of] ? split[of] / 100 : null);
  const defs: Array<Pick<UnitCost, 'key' | 'count' | 'of'>> = [
    { key: 'perEmployee', count: 'employees', of: 'all' }, { key: 'perUser', count: 'users', of: 'all' },
    { key: 'perServer', count: 'servers', of: 'INFRA' }, { key: 'perApplication', count: 'applications', of: 'APPS' }
  ];
  return defs.flatMap(d => {
    const n = u[d.count], share = part(d.of);
    if (!n || share == null) return [];
    return [{ ...d, low: Math.round((s.low * share) / n), high: s.high == null ? null : Math.round((s.high * share) / n) }];
  });
}

/** The traced fields: units.employees and unitCost.perEmployee.low / .high. */
export function unitFigures(ind: IndicativeResult, baseline: SpendBaseline | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(baseline?.units ?? {})) m.set(`units.${k}`, v as number);
  for (const c of unitCosts(ind, baseline)) { m.set(`unitCost.${c.key}.low`, c.low); if (c.high != null) m.set(`unitCost.${c.key}.high`, c.high); }
  return m;
}
