/**
 * Client mode (DESIGN.md section 9): the result as a client may see it. The server applies this before sending, so
 * nothing consultant-only reaches the browser:
 *   - no control weights or numeric states: each control's state is a word (in place, partly, not in place,
 *     unconfirmed, not answered), and the maturity formula is explained in the methodology, not shown;
 *   - no rule IDs, no list of regimes that do not apply (their count only), nothing consultant-only (rules and
 *     floors pending a source, and their findings), no requirements pending a source, no consultant notes;
 *   - no raw facts or question bookkeeping.
 * Both headlines, every applicable regime with its reason, obligations' dates, findings, the roadmap, methodology
 * and the version stamps stay.
 */
import type { SovereignIqV4Result, State } from './evaluate';

export const STATE_WORD: Record<string, string> = { 3: 'in place', 2: 'largely in place', 1: 'partly in place', 0: 'not in place', unknown: 'unconfirmed', not_answered: 'not answered' };
const word = (s: State | undefined) => STATE_WORD[String(s)] ?? 'not answered';

export function clientView(result: SovereignIqV4Result) {
  const r: SovereignIqV4Result = JSON.parse(JSON.stringify(result));
  const shown = r.regimes.filter(g => g.grade !== 'not_applicable' && !g.consultantOnly);
  const shownIds = new Set(shown.map(g => g.regime));
  return {
    view: 'client' as const,
    mode: r.mode, assessmentDate: r.assessmentDate, versions: r.versions,
    // Which questions the page shows (follow-ups included); not a scoring internal.
    asked: r.asked,
    regimes: shown.map(({ rule, claims, verification, consultantOnly, ...g }) => g),
    regimesNotApplicable: r.regimes.length - shown.length,
    requirements: r.requirements.map(q => ({
      dataClass: q.dataClass, required: q.required, choice: q.choice, allowedZone: q.allowedZone,
      floor: q.floor && !q.floor.consultantOnly ? { level: q.floor.level, regime: q.floor.regime, zone: q.floor.zone, provisional: q.floor.provisional } : null
    })),
    maturity: {
      score: r.maturity.score, band: r.maturity.band, wording: r.maturity.wording, withheld: r.maturity.withheld,
      controlsAssessed: r.maturity.controlsAssessed, requiredControls: r.maturity.requiredControls,
      coverage: r.maturity.coverage, provisional: r.maturity.provisional, label: r.maturity.label,
      unconfirmed: r.maturity.unconfirmed.length, notAnswered: r.maturity.notAnswered.length, byDomain: r.maturity.byDomain
    },
    controls: r.controls.map(c => ({
      control: c.control, name: c.name, status: word(c.state),
      byClass: c.byClass ? Object.fromEntries(Object.entries(c.byClass).map(([k, s]) => [k, word(s as State)])) : undefined,
      requiredBy: { levels: c.requiredBy.levels, regimes: c.requiredBy.regimes.filter(x => shownIds.has(x.regime)).map(x => x.regime) }
    })),
    exposure: {
      summary: r.exposure.summary, largestCap: r.exposure.largestCap && shownIds.has(r.exposure.largestCap.regime) ? r.exposure.largestCap : null, capNote: r.exposure.capNote,
      regimes: r.exposure.regimes.filter(e => shownIds.has(e.regime)).map(({ pendingSource, controls, ...e }) => ({ ...e, controls: controls.map(c => ({ control: c.control, status: word(c.state) })) }))
    },
    foreignAccess: r.foreignAccess.map(f => ({ ...f, controls: f.controls.map(c => ({ control: c.control, status: word(c.state) })) })),
    findings: r.findings.filter(f => !f.consultantOnly).map(({ state, consultantOnly, ...f }) => ({ ...f, status: f.type === 'control_gap' ? word(state) : undefined, regimes: f.regimes.filter(x => shownIds.has(x.regime)) })),
    topGaps: r.topGaps.filter(f => !f.consultantOnly).map(f => f.id),
    roadmap: r.roadmap.map(w => ({ wave: w.wave, findings: w.findings.filter(id => r.findings.some(f => f.id === id && !f.consultantOnly)) })).filter(w => w.findings.length),
    notes: r.notes.filter(n => !/\(Q11\)/.test(n))
  };
}

export type SovereignIqV4ClientResult = ReturnType<typeof clientView>;
