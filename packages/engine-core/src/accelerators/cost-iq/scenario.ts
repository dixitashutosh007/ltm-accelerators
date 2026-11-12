/**
 * Cost IQ scenario panel (PRODUCT-GRADE-PLAN.md, B5), for the consultant: can a target reduction, as a share of the technology
 * spend in scope, be reached from the levers the indicative value sizes, once the capabilities the client protects are left
 * out? It reads the indicative result and adds nothing to it: the levers are its counted lines (one per category), taken
 * largest first, and every figure is a sum of their traced shares. A scenario is a planning view, never a commitment, and is
 * shown only in the consultant edition and to consultants on screen.
 *
 * Protected capabilities (ADP-57) take spend categories out of play through `protects` in indicative-ranges.json, an LTM
 * mapping the consultant can override on screen.
 */
import library from './indicative-ranges.json' with { type: 'json' };
import type { IndicativeLine, IndicativeResult } from './indicative';

export const SCENARIO_TARGETS = [0.05, 0.1, 0.15, 0.2];
const PROTECTS = library.protects as unknown as Record<string, string[]>;

export type ScenarioOutcome = 'low' | 'high' | 'short';
export interface ScenarioResult {
  target: number;
  /** Capabilities protected, and the categories they take out. */
  protectedCapabilities: string[];
  protectedCategories: string[];
  /** Levers set aside because their category is protected. */
  excluded: IndicativeLine[];
  /** The levers needed, largest first: the shortest run whose upper ends reach the target, or every lever when none does. */
  needed: IndicativeLine[];
  /** The share of spend in scope the needed levers remove, at their low and high ends. */
  low: number; high: number;
  /** 'low': reached even at the low ends; 'high': reached only towards the high ends; 'short': not reached. */
  outcome: ScenarioOutcome;
}

/** The protected capabilities the client named (ADP-57), as option ids. */
export function protectedFromAnswers(answers: Record<string, unknown>): string[] {
  const a = answers['ADP-57'];
  return Array.isArray(a) ? a.map(String).filter(x => x in PROTECTS && x !== 'note') : [];
}

export function evaluateScenario(ind: IndicativeResult, target: number, protectedCapabilities: string[]): ScenarioResult {
  const cats = new Set(protectedCapabilities.flatMap(c => PROTECTS[c] ?? []));
  const counted = ind.lines.filter(l => l.counted).sort((a, b) => b.shareHigh - a.shareHigh);
  const excluded = counted.filter(l => cats.has(l.category));
  const eligible = counted.filter(l => !cats.has(l.category));
  const needed: IndicativeLine[] = [];
  let low = 0, high = 0;
  for (const l of eligible) {
    needed.push(l); low += l.shareLow; high += l.shareHigh;
    if (high >= target) break;
  }
  const outcome: ScenarioOutcome = low >= target ? 'low' : high >= target ? 'high' : 'short';
  return { target, protectedCapabilities, protectedCategories: [...cats], excluded, needed, low, high, outcome };
}

/** The traced fields of the standard scenarios, by target in whole percent: scenario[10].low and scenario[10].high. */
export function scenarioFigures(ind: IndicativeResult, answers: Record<string, unknown>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of SCENARIO_TARGETS) {
    const s = evaluateScenario(ind, t, protectedFromAnswers(answers));
    const k = Math.round(t * 100);
    m.set(`scenario[${k}].target`, t); m.set(`scenario[${k}].low`, s.low); m.set(`scenario[${k}].high`, s.high);
  }
  return m;
}
