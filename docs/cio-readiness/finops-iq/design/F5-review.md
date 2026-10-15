# FinOps IQ v3: F5 practice-lead review (PLAN F5 item 5)

**Date:** 15 Oct 2026. **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves.
**Scope:** `git diff 81566b5..HEAD`, excluding `docs/phase3/AUTOMATED_AUDIT.md` and `docs/phase3/audit-summary.json` (commit 4406f13, engine 3.4.0, rules 1.4.0). I read F5-notes.md, F5-scenario-diffs.md, reference-scenarios-f5.json, `test/finops-iq-v3-audit.test.ts`, the RS6 to RS9 goldens and the SCORING_AUDIT.md resolution notes.
**What I ran:**
- `vitest run` on `finops-iq-v3-audit.test.ts` and `finops-iq-v3.test.ts`: 177 of 177 pass.
- `npm run audit:engines`: exit 0. The generated files were restored to HEAD afterwards.
- Throwaway sensitivity scripts that vary the RS6 to RS9 inputs, plus 1,500 random executive estates. They lived in the session scratchpad and are not in the repository.

## Verdict

**Changes required. The scope is narrow. Most of F5 is sound.** The audit is a real CI gate. The new tests are strong and they pass. The `value_input_unanswered` fix closes the gap it was built for. The single-answer limit is well argued.

Three things stop me recommending approval of the gate as it stands.

1. **The need index can rise when the OP-06 answer improves (H1).** This affects Kubernetes estates in executive mode. In RS7, moving OP-06 from Not yet to Run moves the verdict from 49.2 "Targeted improvements needed now" to 59.2 "Material exposure: act this year". No CI check covers this. The new rule then copies that 59.2 onto a blank or Unknown OP-06.
2. **An unknown spend lowers the need verdict by about 30 points (H2).** "Missing data never flatters" is tested on maturity answers only. Unknown spend drops the tier and loses the tier points. RS7 falls from 49.2 to 19.5, two bands lower. So SCORING_AUDIT item 2 is not genuinely closed.
3. **Two of the four case-study scenarios contradict their own sources on the answers that drive their headline results (H3).** I opened the Google Cloud pages; F5 had read them through search results only. Banco BV uses Cloud Scheduler to switch off test instances, yet RS7 sets OP-06 = Not yet, and LEV-04 is 81% of RS7's value. Generali already runs Spot VM node pools, yet RS8 sets OP-08 = Not yet, and that drives RS8's "value uplift raises Rate Optimization to High".

H4 is a pre-existing F4 issue that F5 made visible. The LEV-01 formula subtracts coverage of *eligible* usage from steady share of *compute*. That alone produces RS6's High DECISION-02. The owner should decide it before F7, but it does not need to block F5.

## Findings (ranked)

### High

**H1. The need index is not monotone in OP-06 for Kubernetes estates, and CI does not check need-index monotonicity.**
- **Evidence.**
  - In `value-model.ts:363`, `n_u = np × (1 − sched)` removes *all* unscheduled non-production from LEV-01's steady pool.
  - LEV-04's base excludes Kubernetes cluster spend (DESIGN 10.2). Cluster non-production is therefore removed from LEV-01 but scheduled by no lever.
  - Better scheduling returns that usage to LEV-01, so the total rises, here with Google Cloud's 55% maximum. F5-notes.md:21 says a rise happens only with a 72% instrument.
  - RS7 (BRL 150M, cluster BRL 30M), expected gross by OP-06 answer:

    | OP-06 | Expected gross | Share of P | Need index |
    |---|---|---|---|
    | Not yet | 6.51M | 4.3% | 49.2 |
    | Walk | 6.97M | 4.6% | 49.2 |
    | Run | 7.43M | 4.95% | 59.2 (value modifier reached) |

  - With the cluster spend set to 0, the total falls as scheduling improves (9.14M, 8.28M, 7.43M), as F5-notes section 1 expects.
  - Over 1,500 random executive estates, the need index rose on a better OP-06 step in 76 cases. Every one had Kubernetes in scope, and 18 changed band.
  - The monotonicity tests (`finops-iq-v3-audit.test.ts:173-235`) check ratings, gaps, gap count, at-target count and value, but not the need index. `audit/core.ts:108-129` has no monotonicity threshold either.
- **Interaction with F5.** `valueInputUnanswered` (`evaluate.ts:828-839`) takes the *maximum* over answered options. For RS7 that is the Run option, so a blank OP-06 reads 59.2 "Material exposure: act this year", one band above the client's likely true answer.
- **Consequence for a CIO.** "We switched on scheduling everywhere and your verdict says our exposure went up." This fails scorecard area 5: better answers never score worse.
- **Fix.**
  - (a) In `value-model.ts:363`, remove from LEV-01 only the unscheduled non-production that LEV-04 acts on. That is non-production outside cluster spend, the same base LEV-04 uses. Cluster non-production stays in the steady pool, or goes to LEV-07 in workshop mode.
  - (b) Add a need-index monotonicity threshold to `finops-iq-v3-audit.test.ts` and `audit/core.ts`: a better answer never raises the need index. Include estates with Kubernetes and with a stated 72% instrument. If a 72%-instrument residual can still flip the value modifier, document it as a named exception, as is done for value.
  - (c) Correct F5-notes.md:21.
  - (d) Re-run RS1 to RS9. RS7 and RS8 have cluster spend, so their LEV-01 figures will move.

**H2. Unknown spend lowers the need verdict by up to about 30 points. The missing-data audit does not cover scope facts.**
- **Evidence.** `evaluate.ts:323` gives "spend unknown → 0" tier points.
  - RS7 with GCP spend unknown: tier 2 → 1, which lowers most targets one level (DESIGN 3.4) and drops `tier_2` (+10). The need index goes from 49.2 "Targeted improvements needed now" to 19.5 "Lightweight practices sufficient at current scale", with confidence still Low.
  - A banded spend keeps 49.2, so only "don't know" flatters.
  - The missing-data checks (`finops-iq-v3-audit.test.ts:298-341`, `audit/core.ts:116-119`) blank maturity answers only.
- **Consequence.** In self-serve mode, a CIO who does not know the annual cloud bill is told practices are sufficient. This is the same class of defect as the OP-06 fix, but three times larger. It is also SCORING_AUDIT item 2 ("leaving the driver blank lowers urgency"): tier is now a driver.
- **Fix (recommended default).** With spend unknown, withhold the need verdict ("Annual spend is needed to set targets and the verdict"). Show the profile against the tier the other points give, labelled "provisional". The alternative is to tier on the band the client can give and not accept "don't know" for SC-02 in executive mode.
- **Test.** Add a facts-level missing-data check: unknown spend, growth and AI scope never lower the need index below any stated value. Growth is the exception recommended under decision D4 below, and it must be disclosed.

**H3. RS7 and RS8 contradict their sources on the inputs that drive their results.** I opened both pages on 15 Oct 2026 (V for shape).

- **RS7 (Banco BV)**, `reference-scenarios-f5.json:508-509`:
  - **What the source says.**
    - "Cloud Scheduler" is used to turn off test-environment instances when not in use.
    - Teams use "GKE features to resize excess or idle assets" and the Recommender.
    - The FinOps department was created "right after" early 2021.
  - **What RS7 sets.**
    - OP-06 = Not yet ("Run 24/7") and OP-05 = Not yet.
    - Growth 25% because the "migration [is] still running". That is an assumption the source does not support five years later.
  - **Effect.** LEV-04 is BRL 5.27M of 6.51M expected gross (81%). F5-scenario-diffs.md:57 reads RS7 as "weak on usage hygiene", which is the opposite of the source. With OP-06 = Walk and OP-05 = Crawl, expected gross is 6.97M, LEV-01 becomes High and Usage Optimization falls to Medium.
- **RS8 (Generali)**, `reference-scenarios-f5.json:954, 988`:
  - **What the source says.** Generali used "GKE Standard with various node pools, including Spot VMs".
  - **What RS8 sets.** OP-08 = Not yet and `spotShare` 0.
  - **Effect.** LEV-06 is CHF 72k and the value uplift makes Rate Optimization High. Both are listed as "notable behaviour tested" (F5-scenario-diffs.md:32). With OP-08 = Walk and spotShare 0.10, LEV-06 is no longer quantified, Rate Optimization is no longer a High finding, the profile is 14 of 20 at target and expected gross is CHF 339k.
- **RS8: an outcome figure is used as an input.** `kubernetesSpend` CHF 620k (`:957`) matches the case's EUR 260k ÷ 41% ≈ EUR 634k. The file says (`:21-29` note, `usedFor`) that no outcome figure is used as an input. Either disclose the derivation or choose an independent value.
- **Fix.** Re-write the RS7 and RS8 expectations *first*, as the F5 method requires, with source-faithful answers. Suggested: RS7 OP-06 Crawl or Walk, OP-05 Crawl, growth ≤ 15% or labelled; RS8 OP-08 Walk with a stated Spot share. Then re-run and re-approve the goldens. Upgrade the source status from S to V for the three pages now read (sources below).

### High (pre-existing, F4-approved; owner decision before F7, not blocking F5)

**H4. LEV-01 mixes denominators. That alone produces RS6's High DECISION-02.**
- **The mismatch.** DESIGN 10.2 (`DESIGN.md:684`) and `value-model.ts:367` use `S − C`:
  - S is a share of *compute* (`DESIGN.md:256`);
  - C is "share of commitment-eligible usage covered" (`DESIGN.md:257`; VB-02 wording).
- **How the industry defines coverage.** The FinOps convention, as in the FOCUS 1.4 coverage use case, is covered eligible spend ÷ eligible spend (S; see sources). For a client who answers VB-02 that way, uncovered steady compute is S × (1 − C), not S − C.
- **RS6 as built** (S 0.60, C 0.55): LEV-01 = 0 and DECISION-02 is High ("commitments bought now would lock in usage the plan removes").
- **RS6 with C read as a share of eligible usage** (effective C = 0.33): LEV-01 is USD 1.82M expected (High), DECISION-02 disappears and the value modifier is reached.
- **Consequence.** A client covering 55% of eligible usage is told to hold off on commitments. A cloud-literate CFO will dispute this. The error runs conservative on value but gives the wrong direction of advice.
- **Fix (owner choice).**
  - (a) Re-word VB-02 to "share of *steady compute* covered by commitments". This keeps the formula.
  - (b) Keep the wording and use `S × (1 − C)` with an inflation-guard check.
  - I recommend (a), because it matches the existing worked example. Approve the RS6 golden with this caveat recorded, and re-baseline after the decision.

### Medium

**M1. The need verdict says the value modifier is both pending and applied.**
- **Evidence.** Executive, AWS USD 20M, coverage unknown, OP-06 blank. The verdict has `value_input_unanswered` (+10) *and* `pending: expected_value_ge_5pct_of_P, "no value figure shown"` (`evaluate.ts:786` and `:812`).
- **Fix.** When the new modifier applies, replace the pending entry with an explicit reason, for example: "OP-06 not answered: counted at the highest need an answer could imply".

**M2. RS6 reads the source generously.**
- **What the source says.** BP "encourages" staff to stop VMs at weekends and to delete orphan storage, which is a manual practice.
- **What RS6 sets.** OP-06 = Walk ("for some teams") and OP-05 = Walk (`reference-scenarios-f5.json:104-105`).
- **A closer reading.** Crawl ("manual requests to engineers") is closer. With OP-06 = Crawl, Usage Optimization falls below target (6 of 8), LEV-04 doubles to USD 2.32M (3.9% of P) and Usage Optimization becomes a High finding. The band does not change.
- **Also.** The story is from October 2019. Label it as a 2019 profile assessed as if in 2026.
- **Fix.** Use Crawl, or keep Walk with the reason recorded in `scenarioAssumptions`.

**M3. RS9: commitments may be counted on usage that runs on Spot.**
- **Evidence.**
  - LEV-01's base (`value-model.ts:367`) is not limited to the usage that is not on Spot. RS9 holds S 0.50 alongside 58% of compute on Spot, so LEV-01 sees 0.331 of compute as steady and uncommitted, out of only 0.42 not on Spot.
  - The source (search-result text, S) says Savings Plans cover under 5% of EC2 *by design*, because the workers run 100% on Spot.
  - LEV-01 is RS9's largest lever (EUR 446k expected, High). Expected gross is EUR 678k at S 0.35 and EUR 550k at S 0.25.
  - Separately, DESIGN defines `spotShare` as a share of *tolerant* compute (`DESIGN.md:261`). The question label (VB-03) and the formula (`levers.json:511`) treat it as a share of *compute*.
  - That Savings Plans do not apply to Spot usage is UNSOURCED against primary documentation; I found third-party pages only. The AWS Savings Plans User Guide would settle it.
- **Fix.**
  - Add the invariant LEV-01 base ≤ P_c × max(0, 1 − spotShare − C) to the inflation guard.
  - Align the DESIGN definition of `spotShare` with the question and the formula.
  - Lower RS9's S, or record why 0.50 is plausible for a Spot-first estate.

**M4. The SCORING_AUDIT closures hold for v3 only, but the legacy engines are still live.**
- **Evidence.** `amplify/functions/evaluate-finops/handler.ts` still serves the legacy engine, and nothing outside tests and audit imports `evaluateFinOpsIqV3`. `SCORING_AUDIT.md:142-147` says "Closed".
- **Fix.** Say "Closed in v3; open in the legacy engine until it is retired (F12)". Item 2 stays open until H2 is fixed and D4 is decided. Item 1 closes on approval of the corrected goldens.

**M5. The back-test proves that the engine matches its specification, not that its figures are plausible.**
- **What F5 does.** The expectations were hand-calculated from the same DESIGN rules, and outcome figures were excluded from use as inputs. That is the right design for a conformance test, but a CIO will ask "how do you know the numbers are right?"
- **Fix.** Add a separate, labelled post-hoc plausibility line per scenario, with outcomes used for comparison only and never as inputs. For example:
  - RS8: the engine's LEV-07 range is CHF 107k / 215k / 429k (17% / 35% / 69% of cluster spend). The case identified about 41% of GKE spend, which sits inside the range and above the expected case.
  - RS7: the source says 30% was saved on the monthly bill through reservations. That matches OP-01 = Walk at target with little LEV-01 left.
- **Also note selection bias.** All four sources are provider success stories.

### Low

- **L1. CLM-FIN-127 is not updated.** The need-verdict statement (`claims-register.json:6907`) still lists five modifiers. Add `value_input_unanswered` or cross-reference CLM-FIN-177.
- **L2. Stale band label.** DESIGN 9 (`DESIGN.md:654`), the row F5 just amended next to, still says "Establish foundations now". Q14 changed it to "Targeted improvements needed now".
- **L3. Stale date.** `engine-rules.json:3` `statusAsOf` is still 2026-10-14 after the 1.4.0 bump.
- **L4. Claim URL.** CLM-FIN-177's source URL points to `main`, where the amendment is not yet merged. Fix this on merge.
- **L5. Customer names.** The scenario files name real customers (BP, Banco BV, Generali, Bedrock Streaming) in internal documents. Keep the names out of any client-facing methodology text; "reference scenarios built from public provider case studies" is enough. Customer stories and provider blogs are vendor marketing. They are acceptable here only because FRAMEWORK allows "public case studies" for back-test shape.
- **L6. Two different question counts.** The basis line says "18 of 18 questions answered" while coverage shows 11 of 11 maturity questions. Make sure the F7 report explains both numbers.

## Owner decisions: my recommendations

| # | Decision | Recommendation (default) | Reasoning |
|---|---|---|---|
| D1 | The four new goldens and the version-only change to the eight existing ones | **Approve the eight version-only changes now.** Do **not** approve RS7 and RS8 until H3 is fixed. Approve RS6 and RS9 with the M2, M3 and H4 caveats recorded, then re-baseline after H1 (a), which moves LEV-01 in cluster estates | The existing goldens change only in the version stamp, which I checked. RS7 and RS8 encode readings their sources contradict |
| D2 | `value_input_unanswered` (ASM-FIN-086, CLM-FIN-177) | **Endorse, with changes.** (1) Fix the root cause first (H1 (a)). After that, "any answered option" in practice means the least mature option, and the rule stops importing a non-monotone maximum. Keep "any" as the guard. (2) Fix M1. (3) Add the client wording: "Scheduling answer missing: counted at the highest need an answer could imply (+10)". (4) Keep confidence Medium and `ltm_heuristic` as the basis | It applies the existing DESIGN 9 principle (a blank counts at the maximum gap) to the value step. It shows no unshown figure (F4 H3 holds, and the test checks `valueBasis` is null). It is narrow: executive mode, OP-06 only. Without it, leaving OP-06 blank could lower need by 10 |
| D3 | Single-answer limit (F5-notes section 2) | **Endorse, with three additions.** (1) Add the band property: 100/n + 10 ≤ 24.4 < 25 (the band width), so a single answer crosses at most one band boundary; test it. (2) Record the value limit the tests already imply: outside OP-06, a maturity answer changes value only through ramp start and M1 inclusion, so by at most one lever's expected run-rate. (3) Make need-index monotonicity a separate threshold (H1 (b)). The limit is descriptive, matching the observed maxima; that is acceptable because it is the tightest the approved model allows | The PLAN proposal ("one capability level") is honoured for ratings. For the summary, 100/n is exactly one capability's whole range, and the OP-06 +10 is a named, separate step |
| D4 | DESIGN 9 open question: "don't know" on growth adds no urgency points | **Keep 0 points. Do not treat it like OP-06. Disclose it instead:** (1) add a `pending` entry: "growth_ge_20pct not assessed (growth unknown): the index would be 10 points higher at 20% growth or more", and show the alternative band if it differs; (2) treat SC-05 "don't know" as a question blind spot, so confidence becomes Low; (3) handle unknown *spend* separately (H2: withhold the verdict) | (a) Even under the literal OP-06 framing ("at least the lowest answered option's points"), growth already complies: the answer that adds the fewest points (< 20%) adds 0. Only the stronger rule F5 actually built, "the maximum over answers", would add +10. (b) Growth is an external fact, not a maturity claim. Adding urgency for a forecast the client does not have is the inflation area 13 forbids, and a CIO would challenge it ("you raised my need because I don't know next year's budget"). (c) The incentive to game is low: a lower need index buys the client nothing. (d) The OP-06 rule is different: it stops a *maturity* blank, already counted at the maximum gap, from being undone by the value step. (e) In RS7 the effect is 10 points (49.2 to 39.2) with no band change; disclosure makes it visible whenever a band would change |
| D5 | SCORING_AUDIT items 1 to 6 closed for FinOps IQ and FinOps Value Case | Items **3, 4, 5 and 6: closed in v3**. Items 3 and 4 are verified by the passing reachability and N/A tests; item 5 by HY-01 moving no number; item 6 by growth not being applied to value and confidence being rule-based. One note on item 6: the engine never gives "High" confidence although DESIGN 9 lists it, so align the two. **Item 1:** closes on approval of the corrected goldens (D1). **Item 2: not closed**, because of H2 and D4. Re-word all six as "closed in v3; legacy open until F12" (M4) | See H2 and M4 |

## What a sceptical CIO or CFO would challenge

1. **"I said we schedule everything off and your verdict got worse."** Yes, today, for Kubernetes estates (H1). The report cannot answer this until H1 is fixed.
2. **"I didn't know our annual cloud spend and you said 'lightweight practices sufficient'."** Today this is not answered (H2). After the fix, the verdict is withheld.
3. **"You tell me to hold off on commitments, but we cover 55% of eligible usage."** This depends on how VB-02 is read (H4). It must be resolved before the report states DECISION-02.
4. **"You recommend Savings Plans to a company that runs on Spot by design."** Partly answered (M3). It needs the Spot invariant.
5. **"Your scenarios were built from vendor success stories, and you got your own numbers back."** Partly answered (M5). Add the post-hoc plausibility line and state the selection bias.
6. **"Why did my need go up 10 points for a scheduling value you don't show?"** Answered once M1 and the client wording in D2 are in place.
7. **"Your Banco BV-shaped example says they run test environments 24/7, but their own story says they don't."** H3. Fix before anyone outside the team sees the scenarios.

## Sources

All checked on 15 Oct 2026.

- **Microsoft customer story: BP, governance and cost management on Azure** (published 9 Oct 2019). https://www.microsoft.com/customers/story/729853-bp-governance-energy-azure. Page opened, **V** for shape. It says: Azure Cost Management and Advisor; Azure Policy across 250 subscriptions; staff are "encouraged" to stop VMs at weekends and delete orphan storage; costs down 40% while usage almost doubled, which is not used as an input.
- **Google Cloud customer story: Banco BV.** https://cloud.google.com/customers/banco-bv. Page opened, **V** for shape. It says: FinOps department created right after early 2021; Fórum FinOps; reservation and pricing-model management (30% saving on the monthly bill); BigQuery used for chargeback; GKE resizing of idle assets; Cloud Scheduler switches off test instances.
- **Google Cloud blog: "GKE's golden signals help identify potential cost savings"** (Generali Switzerland, July to September 2023; published 31 May 2024). https://cloud.google.com/blog/topics/cost-management/gkes-golden-signals-help-identify-potential-cost-savings. Page opened, **V** for shape. It says: utilisation below 20% of requests; autoscaling that would not scale down; node pools including Spot VMs; bin packing over 60%; N2 to E2 migration; existing CUDs, with new purchases paused; EUR 260k, 41% of GKE spend.
- **AWS blog: "How Bedrock Streaming optimizes its AWS costs"**, and the French version: https://aws.amazon.com/blogs/media/how-bedrock-streaming-optimizes-its-aws-costs/ and https://aws.amazon.com/fr/blogs/france/comment-bedrock-streaming-optimise-ses-couts-aws. The proxy blocks the site, so this is **S** (search-result text only). It says: 100% of Kubernetes workers on Spot; Savings Plans under 5% of EC2; reservations on managed databases and caches; a budget of several million a year.
- **FOCUS 1.4 use case: "Calculate commitment discount coverage rate with eligibility-adjusted denominator".** https://focus.finops.org/docs/use-cases/v1-4/calculate-commitment-discount-coverage-rate-with-eligibility-adjusted-denominator/. The fetch failed (DNS), so this is **S** (search-result text). Coverage = covered eligible ÷ eligible.
- **Savings Plans do not apply to Spot usage: UNSOURCED** against primary documentation (third-party pages only). The AWS Savings Plans User Guide would settle it.

---

**Summary.** Changes required, narrow scope. The F5 audit, tests and the `value_input_unanswered` fix are sound; 177 tests and `npm run audit:engines` pass. Three issues block the gate:
- the need index rises with better scheduling in Kubernetes estates, and CI does not check need-index monotonicity (H1);
- unknown spend drops the need verdict by about 30 points and two bands, so SCORING_AUDIT item 2 is still open (H2);
- RS7 and RS8 contradict their now-verified sources on the inputs that drive their results (H3).

H4 (the LEV-01 coverage denominator behind RS6's DECISION-02) is pre-existing and needs an owner decision before F7.

Recommendations:
- approve the eight version-only goldens;
- hold RS7 and RS8;
- endorse `value_input_unanswered` and the single-answer limit, each with amendments;
- keep 0 points for unknown growth, with disclosure (a pending entry and Low confidence), and withhold the verdict when spend is unknown.
