# FinOps IQ v3: F4 value model against the reference scenarios

**Date:** 14 Oct 2026, updated after the practice-lead review ([F4-review.md](F4-review.md)). **Phase:** F4 (value model, trace and inflation guard). **Compared:** the v3 engine 3.3.0 with value model 1.1.0 (`packages/engine-core/src/accelerators/finops-iq/v3/value-model.ts`) against the value expectations in [`reference-scenarios.json`](reference-scenarios.json), which were written by hand in F1 before any engine existed.

`reference-scenarios.json` is unchanged. Two test files assert everything below:
- `packages/engine-core/test/finops-iq-v3-value.test.ts` ("reference scenarios against the ranges written in F1") checks every lever's run-rate figure, the gross run-rate, one-off and run costs within the scenarios' stated 1% tolerance. Its `VALUE_DIFFS` constant mirrors V5 and V10 to V12. Year-1 and 3-year figures are not compared because of V9.
- `packages/engine-core/test/finops-iq-v3.test.ts` ("reference scenarios against their written expectations") checks the findings and the need verdict. Its `RECORDED` constant mirrors V1 to V3.

This file replaces items D1 to D3 of [F3-scenario-diffs.md](F3-scenario-diffs.md) (lever findings, the severity value uplift and the need modifier), which F4 has closed.

## Value figures: written in F1 against the engine

Values are annual gross run-rate unless marked net, in millions of the scenario's currency. Each cell reads **written / engine**. Since the review, the "% of P" headline is public cloud only (H4); RS4's SaaS and licensing value is shown on its own base.

| Scenario | Figure | Conservative | Expected | Upper |
|---|---|---|---|---|
| RS1 (USD) | Gross run-rate | 0.55 / 0.55 | 2.01 / 2.01 | 6.37 / 6.37 |
| | Gross year 1 | 0.27 / **0.21** | 1.01 / **0.76** | 3.18 / **2.39** |
| | Net 3-year | 1.30 / **1.23** | 4.96 / **4.71** | 15.85 / **15.05** |
| RS2 (EUR) | Gross run-rate | 3.45 / **3.78** | 6.86 / **7.50** | 13.53 / **14.73** |
| | Gross year 1 | 1.41 / **1.12** | 2.81 / **2.23** | 5.55 / **4.39** |
| | Net 3-year | 6.75 / **6.94** | 14.96 / **15.48** | 31.03 / **32.10** |
| RS3 (USD) | Gross run-rate | 1.97 / **1.81** | 3.81 / **3.53** | 5.22 / 5.22 (capped from 6.72) |
| | Gross year 1 | 0.57 / **0.40** | 1.11 / **0.78** | 1.54 / **1.17** |
| | Net 3-year | 3.59 / **3.09** | 7.80 / **6.92** | 11.06 / **10.68** |
| RS4 (EUR) | Gross run-rate | 2.04 / 1.99 | 4.01 / **3.90** | 7.71 / **7.51** |
| | Gross year 1 | 0.90 / **0.60** | 1.78 / **1.17** | 3.44 / **2.26** |
| | Net 3-year | 3.77 / **3.51** | 8.57 / **7.91** | 17.65 / **16.21** |
| RS5 (GBP) | Gross run-rate | 0.03 / 0.03 | 0.38 / 0.38 | 1.45 / 1.45 (capped from 2.23) |
| | Gross year 1 | 0.01 / 0.01 | 0.19 / **0.14** | 0.72 / **0.54** |
| | Net 3-year | 0.04 / 0.03 | 0.93 / **0.88** | 3.60 / **3.41** |

Expected public cloud % of P (engine / written): RS1 8.1 / 8.1; RS2 6.8 / 6.2; RS3 19.6 / 21.1; RS4 13.9 (SaaS and licensing 3.5% of their own EUR 20M) / 17.4 (which included SaaS against cloud spend); RS5 12.7 / 12.7. No headline % exceeds 29% (RS4's upper case was 33.8% before H4 and is now 26.6%).

The following match the written values in every scenario:
- **Run-rate:** every lever in RS1 and RS5, and every lever other than Spot in RS2 and RS3. In RS4 every lever other than Spot matches; LEV-01 matches within 1%.
- **Costs and caps:** one-off and run costs in RS1, RS3 and RS5. The cap binds on the upper case of RS3 and RS5 only.
- **Confidence:** Low, Medium, Medium, Medium and Low.
- **The need verdicts:** RS1 36.7 and RS5 39.0, including the "expected value at least 5% of P" modifier on a shown figure.
- **Rounding:** values are rounded down and costs up (ASM-FIN-057), so a figure can sit a few currency units below the hand calculation.

## Differences and which side is right

| # | Scenarios | Written in F1 | Engine | Decision | Reason |
|---|---|---|---|---|---|
| V1 | RS1 | A separate lever finding `F-FIN-LEV-04` (High, wave 1) beside `F-FIN-USAGE_OPTIMIZATION`. Finding count 6 | LEV-04's value sits on the Usage Optimization gap finding, which is High through the value uplift and carries LEV-04's own action and evidence (`leverActions`, review M2). Count 5 | Expectation inconsistent | RS5 has the same situation and is written without a lever finding. One rule (CLM-FIN-167): a lever gets its own finding only when its capability has no gap finding, so each lever sits on exactly one finding and finding values sum to the headline. |
| V2 | RS3, RS4 | RS3 count 15; RS4 count 19 | RS3 16, with `F-FIN-SCOPE-SAAS_LICENCE` (Low). RS4 20, with `F-FIN-LEV-09` (High on its own base: 3.5% of EUR 20M SaaS and licensing spend) | Expectation inconsistent | RS3: SaaS in scope with no measured unused licence cost, as in RS2, whose count of 15 includes this finding. RS4: Licensing & SaaS is at target, so LEV-09's value needs a finding to sit on. |
| V3 | RS5 | `F-FIN-LEV-01` Medium | High (`lever_base`, `value_uplift`, resting on its shown net share of P), so it sorts before Allocation | Expectation inconsistent | LEV-01's expected net run-rate is 8.8% of P, above the 2% uplift (DESIGN 5.3 step 3); RS1's written lever finding applies the uplift, RS5's does not. |
| V4 | RS2 | Rate Optimization Medium; order as written | **Resolved by review H2.** Spot is now 0.6% of P, so Rate Optimization stays Medium and the order matches | — | — |
| V5 | RS2, RS4 | LEV-06 not quantified for Azure | Quantified at Azure's published 90% maximum (CLM-FIN-064, sourced in F2) | Expectation outdated | F2 read the Azure Spot maximum after F1 wrote the scenarios. |
| V6 | RS2, RS3 | Hypothesis explanations chosen case by case | Rule CLM-FIN-168 against the public cloud range | Engine rule | RS2's 5-9% estimate (EUR 7.7M at its midpoint) is now just above the expected EUR 7.50M, so the panel gives `levers_not_quantified` and `expected_is_half_of_maximum` (review L2). |
| V7 | RS1, RS2, RS3, RS5 | "Not quantified" reasons | More exact reason codes (`executive_mode`, `no_estimate_of_type`; LEV-01 quantified at zero) | Wording only | Same meaning. |
| V8 | RS4, RS5 | No FinOps team cost | Shown beside the value: RS4 EUR 288k a year, RS5 GBP 54k | New in F4 (Q12) | Never netted (ASM-FIN-054). |
| V9 | All | Year 1 from month 0 | Year 1 from the start month of the finding that owns each lever (review M3): every lever here starts in month 3 (wave 2, or a wave 1 quick win behind a gap finding), so year 1 is 9/12 of the F1 share; RS4's LEV-09 starts in month 9 (wave 3), so 3/12 of its 40% renewal share | Expectation outdated | Value cannot arrive before the work starts (CLM-FIN-175). Run-rate figures are unchanged. |
| V10 | RS2, RS3, RS4 | LEV-06 on all tolerant usage | Only tolerant usage not covered by commitments: × (1 − coverage) (review H2, CLM-FIN-155, ASM-FIN-061). RS2 (coverage 75%): LEV-06 EUR 0.64M expected, total **EUR 7.50M** (6.8% of P), as the review computed. RS3 (35%): LEV-06 USD 0.51M, total USD 3.53M; the capped upper case keeps 5.22M with a different pro-rata scale per lever | Expectation outdated | Covered usage is billed below on-demand and its commitment cannot simply be released (Azure limits reservation refunds, CLM-FIN-174, P). |
| V11 | RS4 | LEV-01 at 72% (AWS and Azure) | The instrument is not stated, so the lower published maximum applies: AWS 66% (Compute Savings Plans), Azure 65% (savings plan) (review M6, CLM-FIN-176). With V12, LEV-01 is EUR 0.84M expected (written 0.84M) | Expectation outdated | The higher maxima apply only to specific instruments. |
| V12 | RS4 | LEV-06 EUR 0.11M expected, with 8 FTE-months of effort | **Not worth pursuing at this scale** (review M1): at the margin it mostly displaces LEV-01, and its 3-year net is −EUR 46k. It is shown with its figures and left out of the headline, with its effort. One-off cost EUR 384k (written 480k), run cost EUR 227k (written 246k) | Engine rule (CLM-FIN-170, ASM-FIN-063) | A CFO should not see effort spent on a lever that does not pay back. |

No engine bug was found in the comparison. Every difference is one of three kinds:
- a design rule applied uniformly: V1 to V3, V6, V7 and V12;
- a source that F2 settled after F1: V5;
- a change from the practice-lead review (V9 to V11) or a new F4 element (V8).

## Not differences, but worth knowing

- **Per-lever upper below expected.** In a capped upper case the cap scales every lever, and the upper case removes more compute before Spot applies (DESIGN 10.1 item 5). A lever's upper figure can therefore sit below its expected figure. Totals keep conservative ≤ expected ≤ upper, and the tests assert this on the totals.
- **Phasing safeguard.** A lower case's year 1 is lowered pro rata so that it never exceeds the year 1 of the case above, and is never raised (ASM-FIN-042). It does not bind in any reference scenario.
- **Evidence dates.** Provider-tool exports are checked for age against the assessment date. The scenario tests use 14 Oct 2026, the date the scenarios were written.
