# FinOps IQ v3: practice-lead review of F4 (value model, trace, inflation guard)

**Date:** 14 Oct 2026. **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves at the F4 gate.
**Reviewed:** `git diff 0bd1f02..HEAD -- . ':!docs/phase3'` (commit dc7f4aa, engine 3.2.0, value model 1.0.0, value rules 1.0.0). No code was edited in this review.
**Run:** `npx vitest run packages/engine-core/test/finops-iq-v3-value.test.ts packages/engine-core/test/finops-iq-v3.test.ts` gives 139 of 139 passing (41 value and 98 engine tests). I also ran my own probes (scratchpad scripts, not committed): the five reference scenarios, plus the test file's 1,000 seeded random questionnaires per mode (seeds 70000 to 70999; 1,222 of 2,000 show money).

**Access limits.** As in F1 to F3, provider and Flexera pages are checked through web-search results that quote the official page. Direct fetches are blocked from this environment. Status V below means "verified from search results quoting the official page". I re-checked Azure Spot and the Azure reservation refund limit myself on 14 Oct 2026 (sources at the end). For every other provider figure I relied on the F2 claims register entries and did not re-fetch.

---

## 1. Verdict

**Approve with changes.** The model does what DESIGN.md section 10 specifies:
- the lever-based, uniform ½ / ¼ range rule;
- usage levers first, then Spot, then commitments;
- per-lever and global caps;
- net of cost, phased, and no money without an internal rate;
- a per-figure trace with claim and assumption IDs;
- an inflation guard over 2,005 runs that passes.

Each lever's maximum is backed by its source, with one exception: Azure Spot's base, not its rate (section 2).

No Critical finding. There are four High findings to fix before any figure goes to a client:
- **H1.** The cap's metadata contradicts what the code does.
- **H2.** Spot is valued on usage that is already covered by commitments. This is the main driver of RS2's +37%.
- **H3.** Executive-mode severity and need modifiers fire on values the report does not show (29 and 49 of 1,000 executive runs).
- **H4.** The headline "% of P" includes SaaS / licensing value and exceeds 29% in 39 runs, including RS4's upper case at 33.8%.

None of the four changes the architecture. Each is a local fix, with a test.

## 2. Per-lever source table

Status codes:
- **V:** verified, as defined above.
- **S:** secondary sources only.
- **P:** the primary source is known, but the wording or figure was not re-read.
- **H:** LTM heuristic, with its reasoning registered.

"Supports?" says whether the source supports the number as the engine uses it.

| Lever | Base (engine) | Published or arithmetic maximum and claim | Status | Cap applied | Ramp yr-1 | Order | Supports the number used? |
|---|---|---|---|---|---|---|---|
| LEV-01 Commitments | `P_c × max(0, S − C − n_u − t_u) × left`, per provider (value-model.ts:332-342) | AWS 72% (CLM-FIN-060); Azure 72% (CLM-FIN-062, example configuration; savings plan 65%, CLM-FIN-063); GCP 55% (CLM-FIN-065); OCI / IBM / Alibaba not quantified (CLM-FIN-069 UNSOURCED) | V (AWS, GCP); V, example-based (Azure) | Base × rate; global 29% | 0.5 | 9 | **Yes, as an upper.** These are "up to" maxima on covered usage, not bill-level savings, and the label says so. The expected rate of 36% (Azure and AWS) or 27.5% (GCP) sits below typical 3-year rates. Cross-check: GCP 1-year flexible CUD 28%, CLM-FIN-066. The engine applies 0.72 even where the client uses Compute Savings Plans (66%) or the Azure savings plan (65%). The instrument note exists, but there is no input to select it (L1) |
| LEV-02 Rightsizing | Provider-tool estimate (rightsizing and modernisation), reduced pro rata by LEV-03 and LEV-04 when not deduplicated; capped at `P_c` (value-model.ts:299-304) | 100% of evidence; tool claims CLM-FIN-082/083/092/101/107 | V (tools); H (100%) | `P_c`; global | 0.33 | 3 | **Yes.** Expected = ½ of the tool's own estimate is prudent: the tools state savings before engineering constraints |
| LEV-03 Idle | Tool estimate (idle), capped at P | 100% of evidence | V / H | P; global | 0.5 | 1 | **Yes** |
| LEV-04 Scheduling | `(P_c − k8s − gpu) × nonProd × (1 − scheduled)` | 1 − 50/168 = 70.2% (CLM-FIN-131, H); cross-checked by the AWS Instance Scheduler example of 168 to 50 hours, "up to 70%" (CLM-FIN-086, V) | H with a V cross-check | Base × rate; global | 0.5 | 2 | **Yes, as an arithmetic upper.** It assumes every unscheduled non-production resource is hourly-billed and can follow a 50-hour week. The expected case (35%) covers that. It is the largest lever in RS1, RS2 and RS4, so its Low / Medium confidence must stay visible |
| LEV-05 Storage | Tool estimate (storage) only; price-ratio route off until regional prices are read (CLM-FIN-070) | 100% of evidence | V / H; ratio UNSOURCED | P; global | 0.33 | 5 | **Yes.** Correctly evidence-only |
| LEV-06 Spot | `P_c × max(0, tol − spot) × left`, per provider (value-model.ts:326-331) | AWS 90% (CLM-FIN-061); Azure 90% (CLM-FIN-064); GCP 91% (CLM-FIN-067). OCI 50% is a P blog only, not used | V (all three) | Base × rate; global | 0.25 | 8 | **Rate: yes. Base: no** (H2). Microsoft's page says "up to 90%… actual discounts may vary based on region, VM type and capacity". The base, however, includes tolerant usage that commitments may already cover. Such usage is billed below on-demand, and its commitment cannot simply be released: Azure refunds are capped at USD 50,000 per rolling 12 months per billing scope |
| LEV-07 Kubernetes | `kubernetesSpend × max(0, 1 − r / 0.65)` | Formula, 65% target (CLM-FIN-132, H) | H | Base; global | 0.25 | 4 | **Yes, as a heuristic**, labelled Low confidence in ASM-FIN-044. No published target utilisation exists in my trusted sources (UNSOURCED as a market figure) |
| LEV-08 Data transfer | Not quantified (needs architecture discovery) | — | — | — | 0 | 10 | **Yes.** It is correctly identified only |
| LEV-09 SaaS / licensing | Measured unused licence cost | 100% of evidence; at renewal | H | Measured amount; outside the 29% cap | Renewal share, else 0.25 | 7 | **Yes.** But its value is set against public cloud spend for the uplift and for `pctOfP` (H4, M4) |
| LEV-10 AI / GPU | Idle endpoints + (GPU − idle) × max(0, 1 − u / 0.65) | 100% idle; 65% target (CLM-FIN-132, H) | H | Base; global | 0.33 | 6 | **Yes, as a heuristic.** No published GPU target utilisation was found (UNSOURCED as a market figure) |
| Global cap | 29% × P, all three cases, no evidence lift (value-model.ts:345-347) | Flexera 2026 State of the Cloud, n = 753, published 18 Mar 2026: respondents' **self-estimate** of wasted IaaS / PaaS spend (CLM-FIN-040) | V | — | — | — | **Yes, as a ceiling only.** It is a self-estimate, never a target, and the output says so. The metadata is inconsistent (H1) |

Interaction order (CLM-FIN-160) matches DESIGN 10.4: LEV-03, 04, 02, 07, 05, 10, 09, then 06, then 01. Commitments act on what remains, and `t_u` is applied only where LEV-06 is quantified. DESIGN 10.3's worked example is reproduced exactly (test at value test:514). The one gap: the test asserts 6.3% of P, while DESIGN 10.3 prints 6.4%. That is a rounding difference (L3).

## 3. Match with DESIGN 10 and FRAMEWORK area 13 (a) to (g)

| Area 13 | Assessment | Evidence |
|---|---|---|
| (a) Every number traces | **Partial.** Every value figure carries `field`, claim IDs and assumption IDs, and `resolveField` returns it (trace test). Two breaks: severity and need modifiers can rest on values that are not shown (H3), and nothing on the finding states the value behind `value_uplift`. Screen and PDF tracing are F7 | value test:373; my probe: 29 uplifts and 49 need modifiers come from hypothetical OP-06 values |
| (b) Assumption register | **Pass with one defect.** 43 entries, and the constants match the registries (test). ASM-FIN-050's text ("all three cases, no lift") contradicts its own constant `appliesTo: [expected, upper]` (H1). ASM-FIN-060 says "read from the provider pricing pages", but they were read through search results (M7) | assumptions.json:1473-1476, :1756 |
| (c) Ranges, conservative expected case, net, ramp, never guaranteed | **Pass with M2 and M3.** Every figure has three cases, is net of internal effort and tooling, and is ramped. The label is "Indicative value range: not a savings commitment". External support is excluded and the report says so (Q10). The ramp is not tied to the roadmap start (M3) | value-rules.json labels; RS4 LEV-09 |
| (d) No inflation | **Partial.** Guard passes: per-lever caps, the 29% cap, ordering, year 1 ≤ run-rate, net ≤ gross, and a blank never raises gross. Gaps: Spot overlaps with commitments (H2), and `pctOfP` exceeds 29% (H4) | value test:251-370 |
| (e) Delivery-grade roadmap | **Not in scope for F4** (F7). The value now sits on findings, and finding values sum to the headline | value test:180 |
| (f) Presentation | **Partial (F7).** The labels are clean and the language lint passes. Contradictory cap metadata would be visible in a methodology panel (H1) | — |
| (g) CIO challenge test | See section 6: 4 answered, 4 partly, 2 not | — |

DESIGN 10.1 to 10.12 are followed, with the departures in 10.15 (section 4). One deviation is not listed in 10.15: DESIGN 5.3 step 3 compares with "in-scope spend", but the engine compares LEV-09 with public cloud P (M4).

## 4. Departure positions (DESIGN 10.15 and PLAN F4)

| Departure | Position | Reasoning |
|---|---|---|
| **Cap on all three cases, no evidence lift** | **Endorse for v1.0**, with H1 fixed | The cap binds only on RS3 and RS5 upper cases (7.08 to 5.22M; 2.23 to 1.45M). A CFO is better served by a ceiling that is never lifted than by one lifted on evidence that has not yet been back-tested. On conservative it never binds in practice: it would need an upper of 116% of P. Revisit the evidence lift after the F5 back-test, and only for levers with High confidence (provider-tool evidence ≤ 90 days). **But** levers.json:16-20 (`appliesTo: [expected, upper]`, `liftedBy: evidence…`), CLM-FIN-138 (text "unless provider-tool or billing evidence supports every capped lever") and the output `value.globalCap.appliesTo` all still describe the F1 rule. The output therefore contradicts its own `statement` ("in every case") |
| **Blank rule enforced on gross only (net can rise)** | **Endorse with a change** (M1) | My probe: in 54 of about 300 sampled runs, a blank fact raised expected 3-year net, by up to 244k (3.0%; workshop seed 70464, blank `interruptionTolerantShare`, gross unchanged). Net rose only because a lever's effort left with the lever. A CFO will accept that gross (the opportunity) never rises. They will not accept "answering a question lowered my net" without an explanation. Root cause: effort is charged for every lever with a **positive upper** value (value-model.ts:493), even where the expected value is zero or below the lever's own cost. That happened in 134 runs (example: executive seed 70029, LEV-01 with 0 gross charged 4 FTE-months). Fix: (a) mark a lever whose expected 3-year net is negative as "not worth pursuing at this scale", and show it but exclude it from the headline net in that case; (b) add a test that net rises on a blank only by the negative net of the levers the blank removes |
| **Lever findings only where the capability has no gap finding; F3 invariant change** | **Endorse the rule and the test change**, with M2 | One finding per lever is required so that finding values sum to the headline (value test:180). The amended invariant in finops-iq-v3.test.ts is sound: an absorbed lever must appear on the gap finding at the same or higher severity. **But** absorption drops the lever's own action, evidence and zero-value message. This happened in 572 of 1,222 money runs. Example: RS2's LEV-01 is zero with coverage 75% above steady usage 70%, yet no finding tells the bank to stop buying commitments |
| **Executive scoring at the highest value reachable at OP-06 or better** | **Do not endorse as built** (H3) | It keeps scoring monotone. But a severity of "High (value ≥ 2% of spend)" can rest on a value the report never shows. Example: seed 70012, F-FIN-LEV-01 shown 170k against a 2% threshold of 776k, with OP-06 Walk. Recommended fix: drop the `value_uplift` trace and the need modifier when the uplift is not reached at the client's own answer; take monotonicity from the capability gap, which is already monotone. Alternative: keep the rule but publish the value used (field `scoring.byLever[...]`), with the wording "at a more mature scheduling answer". I recommend the first |
| Phasing safeguard (lower case year 1 ≤ upper case year 1) | Endorse | Lowers figures only; does not bind in the reference scenarios |
| Band search capped at 8 inputs; midpoint is a candidate | Endorse | Bounded, documented and listed in `fixedAtMidpoint` |
| LEV-04 not quantified when Kubernetes or GPU spend is unknown | Endorse | Avoids counting the same spend in LEV-07 and LEV-10 |
| Provider-tool evidence needs an assessment date | Endorse | Without one, the 90-day rule cannot be checked |
| 2% and 5% thresholds compare with P | Endorse for cloud levers. For LEV-09, compare with SaaS plus licensing spend, or total in-scope spend (M4) | — |
| Team cost 0.5 / 1 / 2 FTE, shown beside the value | Endorse | Not netted, per Q12. LTM heuristic, Low confidence |

## 5. Findings, by severity

### High

**H1. The cap's metadata contradicts the cap the code applies.**
- **Evidence.** The code caps all three cases with no lift (value-model.ts:345-347), and the statement says so (value-model.ts:672). Against that:
  - `appliesTo` is read from levers.json:16 (`["expected","upper"]`) and output at value-model.ts:671;
  - levers.json:20 has `liftedBy: evidence_for_every_capped_lever`;
  - CLM-FIN-138 (claims-register.json:7165) says the cap applies "unless provider-tool or billing evidence supports every capped lever";
  - ASM-FIN-050's constant records `["expected","upper"]` (assumptions.json:1473).
- **CIO consequence.** "Your methodology says my evidence lifts the cap; why didn't it?"
- **Fix.** Set `appliesTo` to `["conservative","expected","upper"]` and `liftedBy` to `"none (v1.0)"`. Reword CLM-FIN-138 (and CLM-FIN-040's note) and set it to P pending the owner. Add a test that `appliesTo` covers every case in which the code scales.

**H2. Spot is valued on tolerant usage that commitments may already cover (RS2 +37%).**
- **Evidence.** value-model.ts:326-331: the LEV-06 base is `P_c × (tol − spot)`, independent of coverage C.
- **RS2.** C = 75% is above S = 70%, so the bank is already over-committed and its tolerant workloads are very likely under reservations. Moving them to Spot either strands the reservation or saves only the gap between the reserved rate and the Spot rate. Azure refunds are capped at USD 50,000 of cancelled commitment per rolling 12 months per billing scope. Exchanges are possible, but they move the commitment; they do not remove it.
- **Effect.** RS2 shows EUR 2.56M expected (2.3% of P), which lifts Rate Optimization to High.
- **Fix.** Base = `P_c × (tol − spot) × (1 − C)`, an independence assumption registered as an LTM heuristic. Stranded commitments are noted in the lever's label.
- **Result** (probe): RS2 LEV-06 becomes 0.33 / 0.64 / 1.21M and the expected total EUR 7.50M (6.8% of P). That is within 10% of F1's 6.86M and at the midpoint of the client's own 5-9% estimate (7.7M). RS4 is unchanged (coverage 20%).
- **Question (4) of the brief, my position:** the 90% published maximum is defensible as Spot's **upper rate**. Expected = 45% is not aggressive on rate; a third-party guide puts typical Azure Spot discounts at 60-90%. What is not defensible for RS2's profile is the **base**.

**H3. Executive scoring rests on values the report does not show.**
- **Evidence.** value-model.ts:734-764 (`scoringValues` takes the per-lever maximum over OP-06 levels at or above the answer). evaluate.ts:469-471 uses it for the uplift.
- **Probe.** 29 executive runs had `value_uplift` with no shown lever at 2% of P, and 49 had the need modifier with the shown expected value below 5% of P. Example: seed 70023 shows value 0 with OP-06 Unknown.
- **Consequence.** The answer to "why is this High?" points to a number that is not in the report. That is an area 13(a) break.
- **Fix.** See section 4. Add a test that every `value_uplift` and every need modifier is reachable from shown figures.

**H4. The headline "% of P" includes LEV-09 and exceeds the 29% cap.**
- **Evidence.** value-model.ts:601: `pct(gross, raw.P)`, where gross includes LEV-09 but P is public cloud only.
- **Effect.** RS4's upper case shows 33.8% (cloud only: 27.7%), and its expected case 17.6% (cloud only: 14.5%). 39 of 1,222 random money runs show more than 29%.
- **Consequence.** A CFO reads "33.8% of spend" next to "capped at 29%".
- **Fix.** Show `pctOfP` for public cloud levers only, and show LEV-09 as its own line with its own base. Add a guard that `pctOfP ≤ 29%`.

### Medium

**M1. Blank raises net; effort is charged on zero-value levers.** See section 4. Location: value-model.ts:493 (`active` uses the upper case). Fix as in section 4.

**M2. Absorbed levers lose their actions and their zero-value advice.**
- **Location.** evaluate.ts `leverFindings` skips them, and the gap finding keeps only the capability text.
- **Fix.** Add `leverActions[]` to the capability gap finding: for each owned lever, its title, action, evidence and (at zero) the zero message. Optionally add an over-coverage note when C > S. RS2 needs one.

**M3. The ramp is not tied to the roadmap start.**
- RS4's F-FIN-LEV-09 starts in month 9 (wave 3), yet year 1 counts 40% of its run-rate (0.28M).
- Every wave 2 lever starts in month 3 or later, while its year-1 share assumes an immediate start.
- **Fix.** year-1 share = min(ramp, (12 − start month) / 12 × ramp profile). Alternatively, use a test that year-1 is 0 for any lever whose finding starts in month 12 or later. Note: RS4's year-1 renewal share of 0.4 is a client input, and it applies only after the wave 3 start.

**M4. LEV-09 is compared with public cloud P** for the 2% uplift and the 5% need modifier (CLM-FIN-172). This happened 34 times in the random runs (F-FIN-LEV-09 raised to High). **Fix.** Compare with SaaS plus licensing spend where known, else total in-scope spend, and say which.

**M5. P differs by case when spend is banded** (RS5: 1.0 / 3.0 / 5.0M). This is correct under the corner rule, but a CFO sees three "in-scope spend" figures. **Fix.** Show P as a band once, with "% of P" per case at the case's own P, and label it.

**M6. The commitment instrument is not selectable.** LEV-01 uses 0.72 for AWS and Azure even when the client relies on Compute Savings Plans (66%) or the Azure savings plan (65%). The registry describes the alternative, but no input selects it. **Fix.** Add a VB-02 sub-answer "main commitment instrument" and use the lower rate when it is unknown. This is conservative and changes no reference scenario materially, because LEV-01 is zero or small in all five.

**M7. ASM-FIN-060's reasoning overstates the verification** ("Read from the provider pricing pages", assumptions.json:1756). The claims register says the figures came through search results. **Fix.** Match the claims register wording.

### Low

- **L1.** Per-lever upper below expected (RS3 LEV-06 0.78 vs 0.79M). This is documented. Add one line under the lever table so a reader does not take it for an error.
- **L2.** RS2's hypothesis panel reads `estimate_at_or_below_model`: the model's expected 9.42M is above the bank's own 5-9% estimate. With H2 fixed it becomes 7.50M, roughly at the estimate's midpoint.
- **L3.** DESIGN 10.3 prints 6.4% of P; the engine and the test give 6.3%. Correct DESIGN.

## 6. CIO / CFO challenge test (sample: RS2, EUR, workshop, as built)

The sample report shows:
- P = EUR 110.0M;
- gross run-rate 4.78 / 9.42 / 18.35M (4.3 / 8.6 / 16.7%);
- year 1 1.74 / 3.45 / 6.76M; net 3-year 9.54 / 20.54 / 41.71M;
- one-off cost 0.53M and run cost 0.41M a year;
- confidence Medium.

Its levers (expected) are LEV-04 3.32M, LEV-06 2.56M, LEV-07 1.54M, LEV-02 1.40M, LEV-03 0.60M, and LEV-01 0.

| # | Question | Answered from the result? |
|---|---|---|
| 1 | "On what basis is EUR 9.4M in front of my board?" | **Yes.** Lever table with base, rate, claim ID, formula and label. Provided the F7 appendix renders it |
| 2 | "Is that net, and when do I see it?" | **Yes.** Net year 1 2.51M, run-rate 9.02M, 3-year 20.54M; ramps per lever. **Partly** wrong in timing: the ramp ignores the roadmap start (M3) |
| 3 | "EUR 2.56M from Spot, when 75% of my compute is already reserved? Do I strand reservations?" | **No.** The base ignores coverage, and no stranded-commitment risk is stated (H2) |
| 4 | "Your figure is above my own team's 5-9% estimate. Why should I believe the higher one?" | **Partly.** The panel says the model rests on the given inputs, but RS2's excess is mostly the Spot base (H2, L2) |
| 5 | "My coverage is 75% and my steady usage 70%. Am I over-committed, and what do I do?" | **No.** LEV-01 is zero and absorbed into Rate Optimization; the zero advice is lost (M2) |
| 6 | "What if the 50-hour schedule or the 65% Kubernetes target is wrong?" | **Partly.** ASM-FIN-043 and 044 state the sensitivity in words; there is no sensitivity table yet (F7) |
| 7 | "Why is Rate Optimization High?" | **Yes** for RS2 (value_uplift from LEV-06 2.3% of P, shown). In executive runs the value can be hidden (H3) |
| 8 | "Does this include your fees or external help?" | **Yes.** "External support is not included" (Q10) |
| 9 | "What does the cap mean, and does my Advisor evidence lift it?" | **Partly, and contradictory.** The statement says "every case"; `appliesTo` and CLM-FIN-138 say otherwise (H1) |
| 10 | "Which of this could Azure Advisor tell me for free?" | **Partly.** LEV-02 and LEV-03 are Advisor evidence, labelled High. The edge statement (operating model, allocation, sequencing) is the F7 narrative. The value block does not separate "provider-tool evidence" from "LTM-modelled" value, which would make the answer explicit: RS2 has 2.0M evidence-based against 7.4M modelled |

Result: 4 answered, 4 partly, 2 not. With H1 to H4 and M2 fixed, I expect 8 answered and 2 partly (6 and 10 depend on F7).

## 7. Defaults the owner must approve, with my recommendation

| Default | Recommendation |
|---|---|
| Global cap 29% of P on all three cases, LEV-09 outside, no evidence lift (ASM-FIN-050) | **Approve**, after H1 is fixed. Revisit the evidence lift after F5, High-confidence levers only |
| Ramp: LEV-01, 03, 04 0.5; LEV-02, 05, 10 0.33; LEV-06, 07 0.25; LEV-09 the renewal share, else 0.25; years 2 and 3 1.0 (ASM-FIN-045) | **Approve the shares**, conditional on M3 (the ramp starts at the finding's start month) |
| Phasing safeguard (ASM-FIN-042) | Approve |
| One-off effort per lever by tier (ASM-FIN-046) | **Approve, changed:** count effort only for levers with a positive **expected** value, and flag levers whose expected 3-year net is negative (M1) |
| Ongoing effort 20% of one-off (ASM-FIN-047) | Approve (Low confidence, labelled) |
| Tooling as a client input; net says when it is excluded (ASM-FIN-081) | Approve |
| Banded internal rate: high end in the conservative case (ASM-FIN-059) | Approve |
| External support excluded until WS-S5 (Q10) | Approve |
| FinOps team cost 0.5 / 1 / 2 FTE beside the value (ASM-FIN-054) | Approve |
| F4 finding rules (ASM-FIN-055, CLM-FIN-167) | **Approve, with M2** (lever actions carried onto the gap finding) |
| Value thresholds in scoring (ASM-FIN-056) | **Approve 2% and 5%; reject** the "highest value at OP-06 or better" rule (H3), and change the LEV-09 denominator (M4) |
| Azure and Google Spot quantified at 90% / 91% (ASM-FIN-060, CLM-FIN-064 and 067) | **Approve the rates; approve quantification only with the H2 base change** |

## 8. Sources (checked 14 Oct 2026)

- Microsoft, Azure Spot Virtual Machines pricing: "up to 90 percent compared to pay-as-you-go… actual discounts may vary based on region, VM type and capacity". https://azure.microsoft.com/en-us/pricing/spot/ (quoted via search results; mirrors at https://azure-int.microsoft.com/en-us/pricing/spot). V.
- Microsoft Learn, Spot eviction guidance (evictions on price or capacity, 30-second notice through scheduled events). https://learn.microsoft.com/en-au/azure/architecture/guide/spot/spot-eviction. V (search results).
- Microsoft Learn, Self-service exchanges and refunds for Azure Reservations. https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations. The USD 50,000 cancelled commitment per rolling 12-month window is quoted in search results from Microsoft Learn: https://learn.microsoft.com/en-au/training/modules/save-money-with-azure-reserved-instances/6-monitor-optimize-reservations and https://learn.microsoft.com/sr-cyrl-rs/azure/cost-management-billing/reservations/fabric-capacity. **P:** the exact wording was not seen on the primary exchange-and-refund page. F4 fix H2 should register it as a claim after re-reading that page.
- Third-party, not trusted, context only: Azure Spot typical discounts of 60-90% (https://www.prosperops.com/blog/azure-spot-vms/). Not used for any number.
- Claims register entries relied on, unchanged from F2: CLM-FIN-040 (Flexera 2026, n = 753), 060, 061, 062, 063, 064, 065, 066, 067, 068, 069, 086, 131 to 140, 150, 155, 160, 161, 166 to 173 (`packages/engine-core/src/claims/claims-register.json`).
