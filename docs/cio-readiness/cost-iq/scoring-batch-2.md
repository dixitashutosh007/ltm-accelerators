# Cost IQ scoring proposal, batch 2 (CQ3b)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Machine-readable:** [scoring-batch-2.json](scoring-batch-2.json) (21 objects; every map key, trigger option and gate option checked against the master; maps checked as monotonic in option order). No code was changed. Conventions as in [batch 1](scoring-batch-1.md).

**Gating is now available.** Since slice 3 the engine reads `applicableWhen` {questionId, anyOf} on questions and on finding triggers (`applies()` in `costiq-engine-v10.cjs`). The `gateWhen` field in the JSON maps onto it directly.

## Verdicts

| ID | Verdict | Dim | Map or label | Gate (`gateWhen`) | Basis |
|---|---|---|---|---|---|
| ADP-21 | Context | none | constraint-signal: criticality concentration | none | LTM heuristic |
| ADP-22 | Score | COST-10 | slider, `invert-0-100` | none | LTM heuristic |
| ADP-23 | Score | COST-10 | 100/80/60/40/20 (no Unknown option) | none | LTM heuristic |
| ADP-24 | Context | none | hypothesis-signal: data-cost hotspots | none | LTM heuristic |
| ADP-25 | Score | COST-09 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic |
| ADP-26 | Score | COST-05 | stars keyed 1..5 = 20..100 | none | LTM heuristic |
| ADP-27 | Score | VALUE-02 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic |
| ADP-28 | Context | none | constraint-signal: regulatory spend share | optional, CORE-02 | LTM heuristic |
| ADP-29 | Score | VALUE-03 | slider, `invert-0-100` | none | LTM heuristic |
| ADP-30 | Score | VALUE-03 | 100/80/60/40/20 (no Unknown option) | none | GAO re-baselining guidance (search summary only) |
| ADP-31 | Score | VALUE-02 | 100/80/60/40/20, UNKNOWN 20; F-019 | none (no setter) | FinOps for AI paper; map LTM heuristic |
| ADP-32 | Score | VALUE-03 | 100/80/60/40/20, UNKNOWN 20; F-019 | none (no setter) | FinOps for AI paper; map LTM heuristic |
| ADP-33 | Score | COST-01 | 100/80/60/40/20; F-017 | CORE-16 TRUE, UNSURE | FinOps Licensing and SaaS |
| ADP-34 | Score | COST-04 | 100/80/60/40/20; F-017 | CORE-16 TRUE, UNSURE | FinOps Licensing and SaaS |
| ADP-35 | Score | COST-07 | 100/80/60/40/20, UNKNOWN 20 | CORE-01 EXTERNAL | LTM heuristic |
| ADP-36 | Score | COST-07 | 100/80/60/40/20 (no Unknown option) | CORE-01 EXTERNAL | LTM heuristic |
| ADP-37 | Score | COST-05 | slider, `invert-0-100` | CORE-01 ON_PREM, PRIVATE_CLOUD, COLO | LTM heuristic |
| ADP-38 | Score | COST-05 | 100/60/40/20 (four options) | CORE-01 any non-SaaS estate | LTM heuristic |
| ADP-39 | Score | COST-08 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic |
| ADP-40 | Context | none | hypothesis-signal: ITSM effort driver | none | LTM heuristic |
| ADP-41 | Score | COST-10 | 100/80/60/40/20, UNKNOWN 20 | none (no setter) | FinOps Allocation; map LTM heuristic |

Counts: **17 score, 4 context, 0 rewrite, 0 drop.** All 21 leave the inert list once applied. Three scored questions are sliders (ADP-22, 29, 37, all `invert-0-100`), one is stars (ADP-26, keyed map), and 13 are option maps.

## Needs the owner

| ID | Why |
|---|---|
| ADP-28 | Never shown today (its section "Regulated Industry" is in no focus area). The owner chooses where it appears, and whether it is shown to all clients or only regulated sectors. The label is applied regardless but does nothing until it is shown |
| ADP-31, ADP-32 | No question records whether the client has material AI spend, so F-019 could fire for a client with no AI work. The owner chooses a "no material AI" option on both questions, or accepts the AI focus-area selection as the gate. The maps can be applied now; the F-019 trigger waits for this. ADP-32's prompt says "How confident are you" while its options describe practice |

Also carried from batch 1: the 30% threshold for F-017 on ADP-08.

Optional owner choices, none blocking: add an UNKNOWN option to ADP-23, 33, 34 and 36 (they have none; NONE is the lowest level meanwhile); a not-applicable option or routing question for ADP-41; collapse MIXED and NONE on ADP-31.

## F-017 (business-led spend not governed)

Any single hit fires a finding, so the triggers are additive.

| Question | Fires on | Justified? |
|---|---|---|
| ADP-08 (batch 1) | numeric `gt 30` | Threshold is an LTM heuristic, UNSOURCED, awaiting the owner |
| ADP-33 | LIMITED, NONE | **Yes.** IT has limited or no influence over business-led choices is a direct statement of ungoverned spend. LATE is left out as borderline |
| ADP-34 | NONE | **Yes for NONE only.** The boundary report listed CASE too; I recommend leaving it out because "inconsistent outcomes" shows a process exists, and F-017 is high severity. The owner may add CASE |

Both ADP-33 and ADP-34 carry `applicableWhen` CORE-16 TRUE or UNSURE on the trigger, so a client that says it has no business-led spend is not flagged. Without a CORE-16 answer the trigger does not fire. Add ADP-08 to the same gate only if the owner wants it (ADP-08 is SaaS spend, gated on CORE-01 SAAS in the batch 1 reading).

## F-019 (AI investment economics not defined)

The AI section holds two questions only (ADP-31, ADP-32); the earlier report named the same two. ADP-53 and ADP-58 are outside this batch.

| Question | Fires on | Justified? |
|---|---|---|
| ADP-31 | NONE, UNKNOWN | **Yes.** AI economics not visible, or cannot be isolated, matches the finding. MIXED omitted because it is close to NONE in wording |
| ADP-32 | EXPERIMENTAL, UNKNOWN | **Yes, only when AI spend is material.** The FinOps for AI paper treats pilots as acceptable at Crawl when cost and time limits are set; EXPERIMENTAL does not say whether limits exist. ACTIVITY is not triggered |

Blocker: no question captures AI scope (see owner table). Cloud and GPU cost of AI is FinOps IQ's; neither question quantifies it.

## Could not verify

- **GAO-08-925 and GAO-20-195G** (ADP-30): seen through a search summary only; the PDFs were not read in full. They support "re-baselining is a governance control and resets reported cost growth", not any score.
- **FinOps Decision and Accountability Structure** (ADP-41): the page read is under `previous-capabilities` and says it is a previous Framework version. The current capability page (`establish-finops-decision-accountability-structure`) returned 404. Treat as supporting colour only.
- **Licensing and SaaS and Maturity model** (ADP-33, 34): carried from batch 1, not re-fetched today.
- **No source found** for: share of ownerless or unused applications (ADP-22); share of transformation spend without outcomes (ADP-29); data-centre utilisation ranges (ADP-37); outsourced pricing-model maturity (ADP-35, 36); observability cost management (ADP-39); security-investment measurement (ADP-27); network contract fit (ADP-26); data retention balance (ADP-25). These maps rest on LTM heuristic and say so.
- **The 100/80/60/40/20 steps** are an LTM convention everywhere; the FinOps Framework gives three stages, not scores.

## Problems with the questions

1. **No Unknown option** on ADP-23, 33, 34, 36 (Framework area 3 asks for one). Sliders ADP-22, 29, 37 cannot record Unknown either.
2. **ADP-28 is never shown**, and ADP-31, 32, 41 have no setter question: the master's adaptive triggers ("AI=Yes", "ProductModel=Yes", "Transformation=Yes") are read by no code. The page's focus-area selection is the only gate.
3. **ADP-31:** MIXED and NONE overlap. **ADP-32:** the scale confuses discipline with stage (a limited pilot scores 40). **ADP-30:** the title asks "how often", the options describe how; ACTIVE can mask variance.
4. **ADP-38** has four options, so its map is 100/60/40/20; the answer is an opinion ("appears") and DR sizing depends on recovery objectives the question does not ask for.
5. **Overlaps to present carefully, not independent evidence:** ADP-22 with CORE-39; ADP-34 with ADP-06 and CORE-27; ADP-36 with CORE-37; ADP-40 with ADP-17 and CORE-34; ADP-29 with CORE-44 and CORE-19.
6. **ADP-24:** TRANSFER and PROCESSING on cloud belong to FinOps IQ; keep as hotspots, do not quantify in Cost IQ. NONE must be exclusive of the other options.
7. **ADP-27:** PARTIAL above CONTROL is a judgement; security spend is often mandated, so wording should read "not linked to outcomes", not "wasted".
8. **ADP-35:** demand-linked pricing is not always better; a stable service priced fixed is penalised.
9. **VALUE-01** still has no scored question after both batches.

## Sources (checked 3 Nov 2026)

- FinOps for AI Overview (read): https://www.finops.org/wg/finops-for-ai-overview/
- FinOps Framework, Allocation (read): https://www.finops.org/framework/capabilities/allocation/
- FinOps Framework, previous version, Decision and Accountability Structure (read): https://www.finops.org/framework/previous-capabilities/decision-accountability-structure/
- FinOps Framework, Licensing and SaaS; Maturity model (carried from batch 1): https://www.finops.org/framework/capabilities/licensing-saas/ , https://www.finops.org/framework/maturity-model/
- US GAO-08-925 and GAO-20-195G (search summary only): https://www.gao.gov/assets/gao-08-925.pdf , https://www.gao.gov/assets/gao-20-195g.pdf
