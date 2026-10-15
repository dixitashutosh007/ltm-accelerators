# FinOps IQ v3: F3 engine against the reference scenarios

**Date:** 14 Oct 2026, updated after the practice-lead review ([F3-review.md](F3-review.md)). **Phase:** F3 (engine build). **Compared:** the v3 engine (`packages/engine-core/src/accelerators/finops-iq/v3/`) with the expected outcomes in [`reference-scenarios.json`](reference-scenarios.json), which were written by hand before any engine existed.

`reference-scenarios.json` is unchanged. The test `packages/engine-core/test/finops-iq-v3.test.ts` ("reference scenarios against their written expectations") asserts every expectation below. Everything not listed here or in [F4-scenario-diffs.md](F4-scenario-diffs.md) must match exactly; the `RECORDED` constant in the test mirrors both files.

**Updated in F4 (14 Oct 2026).** Items D1 to D3 (lever and scope-confirmation findings and DECISION-02, the severity value uplift, and the "value at least 5% of P" need modifier) are built in F4 and removed from the table below. The need verdicts now match exactly (RS1 36.7, RS5 39.0), and so do the severities written with `value_uplift`. The differences F4 leaves are recorded as V1 to V8 in [F4-scenario-diffs.md](F4-scenario-diffs.md).

## What matches exactly (all five scenarios)

- Complexity tier and points.
- Every capability rating, target and gap. This covers the one-level depth rule (RS2 Rate Optimization reads Walk, not Crawl), Unknown as risk (RS4 Anomaly Management, RS5 Forecasting), scope-triggered capabilities, and "assessed in the workshop" in executive mode.
- Headline (at or above target, in scope, assessed) and its wording.
- For every capability-gap finding in the top findings: ID, current level, target, gap, owner role, wave and the unconfirmed flag. Severity and severity trace also match (since F4, which builds the value uplift).
- DECISION-01 (built after review M4): RS4 Critical and RS5 High, owner CIO, wave 1, as written.
- Need verdict base index, every modifier (since F4, including the value modifier), the need index, band and confidence.
- RS1 (without `F-FIN-LEV-04`, F4 V1), RS3 and RS4: the order of the top findings (RS4 including DECISION-01). RS2 matched in F3; in F4 its Rate Optimization finding moves up (F4-scenario-diffs.md V4).

## Differences and why the expectation, not the engine, differs

| # | Scenarios | Expected | F3 engine | Reason | Closes in |
|---|---|---|---|---|---|
| D4 | RS1, RS5 need verdict | Band label "Establish foundations now" | "Targeted improvements needed now" | Owner decision Q14, applied in F2 (THR-FIN-14, CLM-FIN-127) after the scenarios were written. Band ID `foundations` is unchanged | Done (expectation predates Q14) |
| D5 | All | `offeringIds` and `leverIds` on findings | A superset: the engine lists every offering in the capability's registry entry and every lever linked to the capability that is in scope | The F2 registry adds `OFF.FIN.ASSESS` (and others) to several capabilities; F9 finalises offerings. The scenarios list only the levers that carry value; F3 links every in-scope lever, as levers are "links from findings" until F4 quantifies them. The test asserts expected ⊆ engine | F4 (value-bearing levers), F9 (offerings) |
| D6 | All | `timeFrame` per finding (0-3, 3-6, 6-12 months) | `start` (wave window, never before each dependency's first milestone: 3 months, or its duration if shorter, re-review R1) and `targetDuration` (Critical 3, High 6, Medium 12, Low 24 months) | Review H3: the F1 time frame contradicted the wave (for example wave 3, from month 9, due in 3-6 months). The reviewer will amend DESIGN.md 5.3 and 5.4; `finding.schema.json` gains the two fields and `timeFrame` is no longer required. The test does not compare `timeFrame` | Done in F3; capacity smoothing of Critical work in F7 |

## Not differences, but worth knowing

- **Workshop question count.** RS3 (Tier 2) asks 65 questions: 42 maturity, 7 scope, 9 value-base and 7 hypothesis (58 without the hypothesis questions; DESIGN.md 6 says "about 45–60"). Since review M2, QV-06 follows QV-05 rather than UN-04, so RS3 (QV-05 Crawl) is now asked QV-06. The scenario does not answer it; as a blank it lowers Unit Economics by one level at most, which is already Not yet, so the rating is unchanged and the finding is flagged unconfirmed ("Answer and evidence: QV-06"). The F3 test fixes 65 / 42.
- **Blanks (review H1).** None of the five scenarios has a blank answer other than RS3's QV-06 above, so the H1 rule (a blank is rated like "Don't know") changes no scenario rating. Only the `unanswered-*` goldens change: they now carry one unconfirmed "Not answered" finding per capability with a target, plus DECISION-01.
- **HY-03 and HY-05 urgency modifiers** (DESIGN.md 9) are retired on the reviewer's recommendation (hypothesis answers are never scored, D4); CLM-FIN-127 is amended and marked pending the owner. The migration share is not used in executive mode (SC-06 is a workshop question).
- **Executive confidence.** RS1 (Medium) and RS5 (Low) are reproduced by the rule in CLM-FIN-163: Medium when every asked maturity question has a level, Low when any is blank or "Don't know", never High in executive mode.
- **Schedule after re-review R1.** A finding now waits only for its dependency's first milestone. RS5 Usage Optimization starts at month 3 (it was month 12 behind a 12-month Allocation finding). No rating, severity, owner or wave changes in any scenario.
