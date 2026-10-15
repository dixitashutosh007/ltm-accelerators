# FinOps IQ v3: F5 provider case-study scenarios against the engine

**Date:** 15 Oct 2026. **Phase:** F5 (scoring audit and recalibration). **Compared:** engine 3.4.0 (rules 1.4.0, value model 1.1.0) against [`reference-scenarios-f5.json`](reference-scenarios-f5.json).

**How the expectations were written.** The expected profiles, findings, need verdicts and value ranges were written **before** the engine was run on these inputs, by applying DESIGN.md sections 3, 5, 9 and 10 by hand. The value arithmetic used a throwaway calculation sheet outside the repository, independent of `value-model.ts`. Inputs are exact so each figure can be checked by hand.

**Sources.** The sources are official provider customer stories and case studies:
- a Microsoft customer story;
- a Google Cloud customer story;
- a Google Cloud blog case;
- an AWS blog post.

They were found by web search and read through search-result text only, because the proxy blocks the provider sites, so each is labelled S. They give each scenario its shape. No outcome figure from a source (BP's 40%, Banco BV's 30%, Generali's EUR 260k or 41%) is used as an input or benchmark.

**Test.** `packages/engine-core/test/finops-iq-v3-audit.test.ts` ("F5 reference scenarios against the expectations written first") asserts the following:
- tier and points;
- every capability's rating, target, gap and at-target flag;
- the headline;
- the finding count and order, with each finding's type, severity and its trace, owner role, wave, dependencies, levers and offerings;
- the need verdict;
- per case (conservative, expected, upper), every lever's run-rate and the gross run-rate, gross year 1, one-off cost, run cost, net year 1, net run-rate, net 3-year and % of P, within the stated 1%;
- the cap flags, the levers left out of the headline, value confidence and the "not quantified" reasons.

Its `F5_RECORDED` constant mirrors E1 below. Golden outputs for RS6 to RS9 are in `test/golden/finops-iq-v3.json`.

## Version 1.1.0-f5 (after the practice-lead review, F5-review.md)

**What changed and why.** The review found two problems in the v1.0 scenarios:
- RS7 and RS8 contradicted their sources on the answers that drove their results (H3);
- RS6 read BP's "encourages" generously (M2), and RS9's steady share counted usage on Spot (M3).

The engine also changed:
- LEV-01 removes only the non-production that LEV-04 acts on (H1);
- in the workshop, LEV-01 is capped at the compute not on Spot (M3).

The expectations were **re-written before re-running the engine**, as version 1.1.0-f5 of [`reference-scenarios-f5.json`](reference-scenarios-f5.json). Its `changelog` gives each input change and its reason; `previousVersions` keeps 1.0.0-f5. The calculation sheet was updated for the two engine rules from the review text, not from the code.

**Source status.**
- BP, Banco BV and Generali: **V**. The practice lead opened these pages on 15 Oct 2026.
- Bedrock Streaming: stays **S**, because the proxy blocks the AWS site.

| ID | Inputs changed (v1.1) | Tier | At or above target | Need verdict | Findings (top) | Gross run-rate C / E / U | Expected net 3-year |
|---|---|---|---|---|---|---|---|
| RS6 | OP-05, OP-06 Walk → Crawl (M2); a 2019 profile assessed as if in 2026 | 2 | 6 of 8 | 18.3, Lightweight practices sufficient at current scale | Usage Optimization High (value uplift); DECISION-02 High; Executive Strategy Alignment Medium; LEV-01 Low (zero) | USD 1.16M / 2.32M (3.9% of P) / 4.64M | USD 5.44M |
| RS7 | OP-06 Not yet → Walk (Cloud Scheduler); OP-05 Not yet → Crawl (GKE idle resizing); growth 25% → 10% (H3) | 2 | 3 of 8 | 45.0, Targeted improvements needed now (value modifier reached) | Anomaly Management High; Allocation High; LEV-01 High (value uplift); Forecasting, Usage Optimization, Unit Economics Medium | BRL 4.00M / 8.00M (5.3% of P) / 15.99M | BRL 18.51M |
| RS8 | OP-08 Not yet → Walk with Spot 10% of compute, tolerant 25% (Spot VM node pools); cluster spend CHF 620k → 900k, chosen independently of the case's outcome figures (H3) | 2 | 14 of 20 | n/a | Allocation, Practice Operations, Usage Optimization, DECISION-02 High; Rate Optimization at target, so LEV-06 is a Medium lever finding; LEV-01 Low (zero); upper case capped | CHF 0.23M / 0.46M (15.2% of P) / 0.87M (capped at 29%) | CHF 0.79M |
| RS9 | Steady share 50% → 35% (M3) | 1 | 16 of 18 | n/a | LEV-07 High; LEV-01 High; LEV-03, 04, 02, 05 Medium; LEV-06 left out of the headline (M1) | EUR 0.39M / 0.77M (12.8% of P) / 1.48M | EUR 1.49M |

**Comparison: written (v1.1) against engine 3.5.0.** All four scenarios match exactly on:
- tier and points;
- every capability rating, target, gap and at-target flag;
- the headline;
- the finding count and order, with each finding's severity and its trace, owner, wave, dependencies, levers and offerings;
- the need verdict;
- every lever and total in all three cases, to the currency unit.

E1 from v1.0 is corrected in the expectations, so no recorded difference remains (`F5_RECORDED` is empty).

**Post-hoc plausibility (comparison only, never an input; review M5).**
- **RS8:** the engine's LEV-07 range is about 17% / 35% / 67% of cluster spend before the cap. The case identified about 41% of GKE spend, which is inside the range and above the expected case.
- **RS7:** the story reports reservations and pricing models saving 30% of the monthly bill. That is consistent with OP-01 at target, but the model still finds commitment headroom: GKE-heavy usage stays in the steady pool after H1.
- **Selection bias:** all four sources are provider success stories, so the set leans towards organisations with a story to tell.

**F1 scenarios after the review fixes (V13).** The H1 rule changes only RS3. RS3's non-production is mostly in clusters (USD 7M of 11.7M compute) or on GPUs, which LEV-04 does not schedule. That usage now stays in LEV-01's steady pool, so:
- LEV-01 is quantified: USD 79k / 135k / 137k, against zero as written in F1;
- DECISION-02 no longer applies;
- expected gross is USD 3.66M, against 3.53M before;
- the capped upper case is unchanged at USD 5.22M.

The finding count is 15. The tests record this as V13 (`RECORDED.withdrawn` in `finops-iq-v3.test.ts`, and `VALUE_DIFFS` in `finops-iq-v3-value.test.ts`). RS1, RS2, RS4 and RS5 are unchanged apart from the version stamp. `reference-scenarios.json` is not edited.

---

# Version 1.0.0-f5 (superseded; kept for the record)

## Scenarios

| ID | Shape from | Provider, mode | Tier | At or above target | Need verdict | Gross run-rate C / E / U | Expected net 3-year | Notable behaviour tested |
|---|---|---|---|---|---|---|---|---|
| RS6 | [Microsoft customer story: BP](https://www.microsoft.com/customers/story/729853-bp-governance-energy-azure) (S) | Azure, executive | 2 | 7 of 8 | 14.2, Lightweight practices sufficient at current scale | USD 0.58M / 1.16M (1.9% of P) / 2.32M | USD 2.83M | Mature profile; LEV-04 just under the 2% uplift (Medium); LEV-01 zero and DECISION-02 |
| RS7 | [Google Cloud customer story: Banco BV](https://cloud.google.com/customers/banco-bv) (S) | Google Cloud with GKE, executive | 2 | 3 of 8 | 49.2, Targeted improvements needed now | BRL 3.25M / 6.51M (4.3% of P) / 13.01M | BRL 14.97M | Core Unknown (UN-11) counted as gap 2; LEV-04 excluding cluster spend; non-USD tier FX; growth urgency |
| RS8 | [Google Cloud blog: Generali Switzerland, GKE golden signals](https://cloud.google.com/blog/topics/cost-management/gkes-golden-signals-help-identify-potential-cost-savings) (S) | Google Cloud with GKE, workshop | 2 | 13 of 20 | n/a | CHF 0.21M / 0.41M (13.7% of P) / 0.80M | CHF 0.69M | LEV-07 as the largest lever; the value uplift raising Rate Optimization to High; DECISION-02 matching the case's paused CUD purchases; a provider-tool scope confirmation; negative year-1 net |
| RS9 | [AWS blog: Bedrock Streaming](https://aws.amazon.com/blogs/media/how-bedrock-streaming-optimizes-its-aws-costs/) (S) | AWS with Kubernetes on Spot, workshop | 1 | 16 of 18 | n/a | EUR 0.44M / 0.87M (14.5% of P) / 1.66M | EUR 1.72M | Tier 1 (no target for Unit Economics or Invoicing); every lever on its own lever finding; deduplicated provider-tool evidence; LEV-06 left out of the headline (M1); upper case 27.7% of P, just under the cap |

## Comparison: written against engine

Everything listed in "Test" above matches in all four scenarios. The money figures agree to the currency unit, inside the 1% tolerance.

| Scenario | Profile and headline | Findings (count, order, severity, owner, wave) | Need verdict | Value (every lever and total, three cases) |
|---|---|---|---|---|
| RS6 | Match, apart from E1 | 4 of 4, in order | 14.2 = 14.2 | Match. For example expected gross 1,158,928 = 1,158,928; net 3-year 2,830,120 = 2,830,120 |
| RS7 | Match, apart from E1 | 6 of 6, in order | 49.2 = 49.2 | Match. Expected gross 6,505,357 = 6,505,357; net 3-year 14,970,222 = 14,970,222 |
| RS8 | Match | 9 of 9, in order | — | Match. Expected gross 411,071 = 411,071; LEV-06 net share of P 2.06% (uplift reached), as written |
| RS9 | Match | 9 of 9, in order | — | Match. LEV-06 excluded, as written; expected gross 869,229 = 869,229 |

## Differences and which side is right

| # | Scenarios | Written | Engine | Decision | Reason |
|---|---|---|---|---|---|
| E1 | RS6, RS7 | Licensing & SaaS and Sustainability as `not_assessed` ("assessed in the workshop") | `not_in_scope` | Expectation wrong; the engine is right | The client selected no SaaS, licensing, private cloud, data centre or colocation scope, so both capabilities are out of scope by the scope facts (D5). That is checked before the executive "assessed in the workshop" rule, as RS1 writes for Licensing & SaaS. The calculation sheet applied the executive rule to every capability outside the executive set without the scope check first. The expectation file is left as written; the test records the difference (`F5_RECORDED`) |

No engine bug was found in the scenario comparison. The one engine defect F5 found came from the audit thresholds, not from these scenarios: a blank or Unknown OP-06 could lower the need index ([F5-notes.md](F5-notes.md) section 3). None of RS1 to RS9 leaves OP-06 blank or Unknown, so the fix changes no scenario result.

## Plausibility against the sources (shape only)

- **RS6:** a long-running cost-governance practice on Azure reads mostly at target. Little value is left, mainly scheduling, with no case for more commitments. This is consistent with an organisation that has worked on cost monitoring for years.
- **RS7:** a bank with a new FinOps department reads strong on practice and commitments. It reads weak on usage hygiene and has an open data question (Unknown), which fits a migration still under way.
- **RS8:** the model's largest lever is Kubernetes efficiency, and it advises pausing commitment purchases until the usage work lands (DECISION-02). This is what the case did.
- **RS9:** with workers already on Spot, the Spot lever is worth too little to pursue. With Savings Plans covering little, commitments are the main open lever.
