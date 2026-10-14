# FinOps IQ v3: F3 engine against the reference scenarios

**Date:** 14 Oct 2026. **Phase:** F3 (engine build). **Compared:** the v3 engine (`packages/engine-core/src/accelerators/finops-iq/v3/`) with the expected outcomes in [`reference-scenarios.json`](reference-scenarios.json), which were written by hand before any engine existed.

`reference-scenarios.json` is unchanged. The test `packages/engine-core/test/finops-iq-v3.test.ts` ("reference scenarios against their written expectations") asserts every expectation below. Everything not listed here must match exactly; the `RECORDED` constant in the test mirrors this file.

## What matches exactly (all five scenarios)

- Complexity tier and points.
- Every capability rating, target and gap. This covers the one-level depth rule (RS2 Rate Optimization reads Walk, not Crawl), Unknown as risk (RS4 Anomaly Management, RS5 Forecasting), scope-triggered capabilities, and "assessed in the workshop" in executive mode.
- Headline (at or above target, in scope, assessed) and its wording.
- For every capability-gap finding in the top findings: ID, current level, target, gap, owner role, wave and the unconfirmed flag. Severity, severity trace and time frame also match, except where D2 below applies.
- Need verdict base index, the tier and growth modifiers, band and confidence.
- RS2 and RS4: the order of the capability-gap findings.

## Differences and why the expectation, not the engine, differs

| # | Scenarios | Expected | F3 engine | Reason | Closes in |
|---|---|---|---|---|---|
| D1 | RS1, RS3, RS4, RS5 (and RS2's finding count) | Lever-opportunity findings (`F-FIN-LEV-04`, `F-FIN-LEV-01`) and decision findings (`F-FIN-DECISION-01`, `F-FIN-DECISION-02`) among the top findings. Finding counts 6 / 15 / 15 / 19 / 6 | Capability-gap findings only. Counts 4 / 14 / 14 / 18 / 4 | PLAN F3 item 3 limits F3 to findings "from gaps only", and the brief excludes any value figure. Lever findings carry value (DESIGN.md 5.1). DECISION-02 depends on the value sequence. DESIGN.md 5.3 gives no severity rule for DECISION-01: RS4 reads Critical, RS5 reads High while Practice Operations is at target. RS2's count of 15 includes one lever, scope-confirmation or decision finding that the scenario does not itemise | F4 (lever and scope-confirmation findings, DECISION-02); F4 or F7 (DECISION-01, once its severity rule is written) |
| D2 | RS1 and RS5 `F-FIN-USAGE_OPTIMIZATION`; RS3 `F-FIN-USAGE_OPTIMIZATION` and `F-FIN-RATE_OPTIMIZATION` | High, trace `gap_1, value_uplift`, 3-6 months | Medium, trace `gap_1`, 6-12 months | The value uplift (ASM-FIN-005 step 3, THR-FIN-13) needs a lever's expected net value, which is F4. The engine applies steps 1, 2, 4 and 5. Because of this, the RS1, RS3 and RS5 finding order differs from the written order | F4 |
| D3 | RS1, RS5 need verdict | Need index 36.7 and 39.0, including `expected_value_ge_5pct_of_P` (+10) | 26.7 and 29.0. The modifier is listed under `pending` with the reason "needs the value model (F4)" | The modifier needs the expected gross value. The band (26-50) does not change for either scenario | F4 |
| D4 | RS1, RS5 need verdict | Band label "Establish foundations now" | "Targeted improvements needed now" | Owner decision Q14, applied in F2 (THR-FIN-14, CLM-FIN-127) after the scenarios were written. Band ID `foundations` is unchanged | Done (expectation predates Q14) |
| D5 | All | `offeringIds` and `leverIds` on findings | A superset: the engine lists every offering in the capability's registry entry and every lever linked to the capability that is in scope | The F2 registry adds `OFF.FIN.ASSESS` (and others) to several capabilities; F9 finalises offerings. The scenarios list only the levers that carry value; F3 links every in-scope lever, as levers are "links from findings" until F4 quantifies them. The test asserts expected ⊆ engine | F4 (value-bearing levers), F9 (offerings) |

## Not differences, but worth knowing

- **Workshop question count.** RS3 (Tier 2) asks 64 questions: 41 maturity, 7 scope, 9 value-base and 7 hypothesis. That is 57 without the optional hypothesis questions. DESIGN.md 6 says "about 45–60"; the F3 test fixes 64 / 41.
- **HY-03 and HY-05 urgency modifiers** (DESIGN.md 9) apply "when answered in a workshop", but the verdict is executive-only and the executive set does not include those questions. They never fire in F3. If the owner wants a workshop verdict, it can be switched on without changing the rules.
- **Executive confidence.** RS1 (Medium) and RS5 (Low) are reproduced by the rule in CLM-FIN-163: Medium when every asked maturity question has a level, Low when any is blank or "Don't know", never High in executive mode.
