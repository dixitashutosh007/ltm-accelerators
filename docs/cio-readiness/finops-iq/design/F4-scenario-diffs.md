# FinOps IQ v3: F4 value model against the reference scenarios

**Date:** 14 Oct 2026. **Phase:** F4 (value model, trace and inflation guard). **Compared:** the v3 engine 3.2.0 with value model 1.0.0 (`packages/engine-core/src/accelerators/finops-iq/v3/value-model.ts`) against the value expectations in [`reference-scenarios.json`](reference-scenarios.json), which were written by hand in F1 before any engine existed.

`reference-scenarios.json` is unchanged. Two test files assert everything below:
- `packages/engine-core/test/finops-iq-v3-value.test.ts` ("reference scenarios against the ranges written in F1") checks every lever and total figure within the scenarios' stated 1% tolerance. Its `VALUE_DIFFS` constant mirrors V5.
- `packages/engine-core/test/finops-iq-v3.test.ts` ("reference scenarios against their written expectations") checks the findings and the need verdict. Its `RECORDED` constant mirrors V1 to V4.

This file replaces items D1 to D3 of [F3-scenario-diffs.md](F3-scenario-diffs.md) (lever findings, the severity value uplift and the need modifier), which F4 has closed.

## Value figures: written in F1 against the engine

Values are annual gross run-rate unless marked net, in millions of the scenario's currency. Each cell reads **written / engine**.

| Scenario | Figure | Conservative | Expected | Upper |
|---|---|---|---|---|
| RS1 (USD) | Gross run-rate | 0.55 / 0.55 | 2.01 / 2.01 | 6.37 / 6.37 |
| | Gross year 1 | 0.27 / 0.27 | 1.01 / 1.01 | 3.18 / 3.18 |
| | Net 3-year | 1.30 / 1.30 | 4.96 / 4.96 | 15.85 / 15.85 |
| RS2 (EUR) | Gross run-rate | 3.45 / **4.78** | 6.86 / **9.42** | 13.53 / **18.35** |
| | Gross year 1 | 1.41 / **1.74** | 2.81 / **3.45** | 5.55 / **6.76** |
| | Net 3-year | 6.75 / **9.54** | 14.96 / **20.54** | 31.03 / **41.71** |
| RS3 (USD) | Gross run-rate | 1.97 / 1.97 | 3.81 / 3.81 | 5.22 / 5.22 (capped from 7.08) |
| | Gross year 1 | 0.57 / 0.57 | 1.11 / 1.11 | 1.54 / 1.54 |
| | Net 3-year | 3.59 / 3.59 | 7.80 / 7.80 | 11.06 / 11.06 |
| RS4 (EUR) | Gross run-rate | 2.04 / 2.06 | 4.01 / 4.04 | 7.71 / 7.78 |
| | Gross year 1 | 0.90 / 0.89 | 1.78 / 1.75 | 3.44 / 3.39 |
| | Net 3-year | 3.77 / 3.80 | 8.57 / 8.62 | 17.65 / 17.73 |
| RS5 (GBP) | Gross run-rate | 0.03 / 0.03 | 0.38 / 0.38 | 1.45 / 1.45 (capped from 2.23) |
| | Gross year 1 | 0.01 / 0.01 | 0.19 / 0.19 | 0.72 / 0.72 |
| | Net 3-year | 0.04 / 0.04 | 0.93 / 0.93 | 3.60 / 3.60 |

The following match the written values in every scenario:
- **RS1, RS3 and RS5**: every lever in every case, one-off and run costs, the cap (binding on the upper case in RS3 and RS5), and confidence (Low, Medium and Low).
- **The need verdicts**: RS1 36.7 and RS5 39.0, now including the "expected value at least 5% of P" modifier.
- **RS2 and RS4**: every lever other than LEV-01 and LEV-06, and confidence (Medium).
- **Rounding**: values are rounded down and costs up (ASM-FIN-057), so a figure can sit up to a few currency units below the hand calculation.

## Differences and which side is right

| # | Scenarios | Written in F1 | Engine | Decision | Reason |
|---|---|---|---|---|---|
| V1 | RS1 | A separate lever finding `F-FIN-LEV-04` (High, wave 1) beside `F-FIN-USAGE_OPTIMIZATION`. Finding count 6 | LEV-04's value sits on the Usage Optimization gap finding, which is High through the value uplift. Count 5 | Expectation inconsistent | RS5 has the same situation (LEV-04 under a Usage Optimization gap) and is written without a lever finding. The engine applies one rule, CLM-FIN-167: a lever gets its own finding only when its capability has no gap finding. Each lever then sits on exactly one finding, so finding values sum to the headline (reconciliation test). Two roadmap items for one action would double the work shown. |
| V2 | RS3, RS4 | RS3 count 15; RS4 count 19 | RS3 16, with `F-FIN-SCOPE-SAAS_LICENCE` (Low). RS4 20, with `F-FIN-LEV-09` (High, wave 3) | Expectation inconsistent | RS3: SaaS is in scope with no measured unused licence cost. That is the same as RS2, whose written count of 15 includes this finding unitemised. RS4: Licensing & SaaS is at target, so LEV-09's EUR 0.7M expected value needs a finding to sit on; without one, the roadmap would not reconcile to the headline. |
| V3 | RS5 | `F-FIN-LEV-01` Medium | High (`lever_base`, `value_uplift`), so it sorts before Allocation | Expectation inconsistent | LEV-01's expected net run-rate value is 8.9% of P, above the 2% uplift (DESIGN 5.3 step 3). RS1's written lever finding applies the uplift; RS5's does not. The engine applies it to every finding. |
| V4 | RS2 | Rate Optimization Medium; it is not in the top six | High (`gap_1`, `value_uplift`), so it sorts before Anomaly Management | Engine right (follows V5) | LEV-06 for Azure is EUR 2.56M expected, 2.3% of P. |
| V5 | RS2, RS4 | LEV-06 not quantified for Azure ("rate_unsourced_for_provider (Azure Spot)") | Quantified at Azure's published 90% maximum (CLM-FIN-064, V, sourced in F2). RS2: +EUR 2.56M expected, so 6.2% of P becomes 8.6%. One-off cost +EUR 112k (8 FTE-months), run cost +EUR 22.4k. RS4: the Spot-movable 5% leaves LEV-01 (t_u, DESIGN 10.4), so LEV-01 is 0.70M (written 0.84M) and LEV-06 0.29M (written 0.11M); expected total +0.9%; year 1 −1.5%, because LEV-06 ramps at 0.25 | Expectation outdated | F2 read the Azure Spot maximum after F1 wrote the scenarios (DESIGN 10.2 said "not quantified until F2 confirms"). With the Azure Spot share set to zero, RS2 reproduces every written total within 1%, and a test checks this. RS2 stays far below the cap (8.6% against 29%), as does RS4 (17.6%). |
| V6 | RS2, RS3 | Hypothesis explanations: RS2 `levers_not_quantified`; RS3 `expected_is_half_of_maximum` | RS2 `estimate_at_or_below_model`; RS3 `levers_not_quantified` and `expected_is_half_of_maximum` | Engine rule (CLM-FIN-168) | The written lists were chosen case by case. The engine compares the estimate's midpoint with the model's expected case, and its low end with the upper case. RS2's 5-9% estimate (EUR 7.7M at its midpoint) is now below the expected EUR 9.4M (V5). RS3 has levers not quantified (LEV-05, LEV-09), so it says so. |
| V7 | RS1, RS2, RS3, RS5 | "Not quantified" reasons: LEV-06 `rate_unsourced_for_provider` (RS1, RS5); LEV-05 `missing_input` (RS2, RS3); LEV-01 listed as "quantified at zero" | LEV-06 `executive_mode` (Q7: executive mode never quantifies LEV-06); LEV-05 `no_estimate_of_type` (the export is there but has no storage type); LEV-01 is quantified with value 0 | Wording only | Same meaning, with more exact reason codes. |
| V8 | RS4, RS5 | No FinOps team cost | Shown beside the value: RS4 EUR 288k a year (2 FTE at Tier 3); RS5 GBP 54k (0.5 FTE at Tier 1) | New in F4 (Q12) | DECISION-01 is raised in both. The cost is never netted (ASM-FIN-054, pending the owner). |

No engine bug was found in the comparison: every difference is a design rule applied uniformly (V1 to V3, V6, V7), a source that F2 settled after F1 (V4, V5), or a new F4 element (V8).

## Not differences, but worth knowing

- **Per-lever upper below expected.** RS3's LEV-06 upper (0.78M after the cap) is below its expected value (0.79M). The upper case removes more compute before Spot applies, and the cap scales the result (DESIGN 10.1 item 5). Totals keep conservative ≤ expected ≤ upper, and the tests assert this on the totals.
- **Phasing safeguard.** Corners are chosen on run-rate, so a lower case could ramp faster than the case above it. A lower case's year 1 is then lowered pro rata to the year 1 of the case above, never raised (ASM-FIN-042). It does not bind in any reference scenario. It binds in a few of the random questionnaires, where the lower case's corner holds more of the fast-ramping levers; there it keeps the year-1 and 3-year figures in order.
- **Evidence dates.** Provider-tool exports are checked for age against the assessment date. The scenario tests use 14 Oct 2026, the date the scenarios were written. The RS2, RS3 and RS4 exports are 30 to 60 days old, so all are used.
