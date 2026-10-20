# FinOps IQ v3: practice-lead review of F5 (M1: scoring audit and recalibration)

**Date:** 20 Oct 2026. **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves at the F5 gate.

**Reviewed:** commit `e129980` ("FinOps IQ M1"):
- `packages/engine-core/test/finops-iq-v3-audit.test.ts` (new, 22 tests);
- `packages/engine-core/audit/adapters.ts` and `run.ts` (uniform baselines; a workshop estate without measured evidence);
- the regenerated `docs/phase3/AUTOMATED_AUDIT.md`.

Commit `255a090` (M2) landed while I worked. It adds `v3/assessment.ts` and touches no scoring code, so it does not affect this review. The engine is 3.3.0 with value model 1.1.0, unchanged in M1.

**My own additions (uncommitted, as asked):**
- RS6 to RS9 appended to [reference-scenarios.json](reference-scenarios.json);
- [F5-scenario-diffs.md](F5-scenario-diffs.md);
- this file.

No code or test was edited.

**What I ran:**
- `npx vitest run packages/engine-core/test/finops-iq-v3`. With RS6 to RS9 added, 191 of 198 pass (198 of 205 on the current working tree, where concurrent M3 work adds two test files). The 7 failures are explained in F5-scenario-diffs.md: 3 scenario disagreements and 4 goldens not yet approved. Before the additions, all tests passed.
- Probe scripts in the session scratchpad that call `evaluateFinOpsIqV3` directly (outputs quoted in section 7).
- I did not re-run `npm run audit:engines`: the engine and the audit are unchanged since `e129980` regenerated it.

**Access.** Unlike F1 to F4, direct fetches of provider, FinOps Foundation and Flexera pages worked this session. Status V below means I read the page itself on 20 Oct 2026. Two pages did not load: Google Cloud Spot pricing (too large) and the Gerdau session video. Both are marked P.

---

## 1. Verdict

**Changes required before the F5 gate. The M1 diff itself is sound and should stay.**

The new invariants are the right ones for the rules they cover, and they pass. The adapter change is correct: weakest-link ratings need uniform baselines, otherwise depth questions read as dead. The four new scenarios agree with the engine almost everywhere:
- every rating, gap, headline, top-finding order, severity trace and need verdict;
- every money figure within 0.02%.

The three disagreements are two expectation errors of mine and one design rule I recommend changing (M5).

Area 5's pass criteria include "missing answers never flatter the result". The scenarios and probes show that this does not hold yet for the **client-visible** need verdict and profile. Today's invariants test maturity answers, and the need index **before** the value step, only. Two paths escape them:
- **H1, scope facts.** With spend, growth and consuming units left as "don't know", an all-Crawl executive client reads "Lightweight practices sufficient" (need 0). With them given, the same client reads "Act now" (88.3). Confidence stays Medium in both.
- **H2, value-base facts and OP-06.** A "don't know" VB-01 share lowers the shown need index in 272 of 800 probe checks, and moves the band to a more lenient one in 90.

Two further High items:
- **H3.** The client-visible threshold register still contradicts the code on the cap, retired urgency rules and the uplift base. This is the F4 H1 defect, in a register the fix missed.
- **H4.** Executive mode can never quantify LEV-04 for a client with Kubernetes or GPUs in scope, and its scope-confirmation action points to a workshop-only question.

None needs an architecture change. Each is a local rule change with a test (section 6).

## 2. F5 gate and scorecard area 5

| Gate / criterion | Status | Evidence |
|---|---|---|
| Audit invariants on v3 in CI | **Partial** | `finops-iq-v3-audit.test.ts` runs in `npm run test:engine` (CI `ci.yml`). Gaps: H1 and H2, plus the value monotonicity and band-to-exact checks deferred from F4 (M2). `npm run audit:engines` is a report, not a gate (M4) |
| Better answers never score worse | **Pass** on ratings, headline and need before value (`finops-iq-v3.test.ts` › "a better answer never scores worse"). **Partial** on findings: OP-06 moves Rate Optimization's severity, and the High count goes 1 → 2 → 1 as OP-06 improves (M3) |
| No dead questions | **Pass.** HY-01 to HY-07 only, by design D4 (audit test "no dead questions"; AUTOMATED_AUDIT.md) |
| Every band reachable | **Pass.** Ratings, need bands and the headline range (audit tests "every rating, band and headline value is reachable") |
| Missing answers never flatter | **Fail** on the shown need verdict and profile (H1, H2). **Pass** on maturity answers before the value step, and on value (`finops-iq-v3-value.test.ts` › "a blank fact never gives a higher value…", "a blank answer never gives a higher value…") |
| Labels match what is computed (M10) | **Partial.** Engine labels pass (audit "labels say what is computed"). The threshold register contradicts the code (H3) |
| Reference scenarios agree with profiles written in advance | **Pass with recorded differences:** RS1 to RS5 as at F4; RS6 to RS9 in F5-scenario-diffs.md (X1 to X6). CI is red until the owner records X1 to X3 and approves the goldens |
| Golden outputs approved in writing | **Open.** RS6 to RS9 have no approved golden (4 failing tests). RS9's changes again if M5 is adopted |
| Practice-lead review recorded | This file |

## 3. Review of the M1 changes

### 3.1 The invariants in `finops-iq-v3-audit.test.ts`

They match F5 items 2 and 3 as written, and I agree with each:

| Invariant | Right one? | Comment |
|---|---|---|
| No dead maturity questions (uniform Run, Walk and Crawl baselines; Not yet on one question must move its capability) | Yes | Correct for a weakest-link rule. The Walk and Crawl baselines are needed because follow-ups are asked only after weak answers. The companion test pins the hypothesis IDs, so a new HY question cannot hide |
| Every rating reachable per capability, "Not answered" for blanks, headline 0 to max | Yes | Strong form (every capability, every level) |
| Every need band reachable | Yes | Random search with two estates |
| One answer moves only its own capability; headline ≤ 1; total gap ≤ 3 | Yes, but **ratings only** | The gap ≤ 3 limit follows from "one capability, at most 3 levels", so it adds little. Missing: findings of other capabilities and the need index (M3) |
| Unknown never better than Not yet (rating, gap, headline, need before value) | Yes, but **before the value step** | `needBeforeValue` (audit test:53) removes the value modifier. The shown need can be lower with Unknown (H2). The F4 gate accepted leaving the value uplift out of the blank invariant; section 7 quantifies what that does to the band |
| N/A only from scope | Yes | Also covers the narrow estate |
| Value-base facts never move a rating, gap or headline | Yes | Missing the converse that matters to a CIO: a blank value-base fact must not **lower the need** (H2) |
| Label truth: rating labels, at-or-above, gap ↔ finding, need band | Yes | Missing: register text ↔ code (H3), and severity ↔ trace |

**Missing invariants** (each with the finding that motivates it):

1. **Scope facts never flatter.** SC-04 spend, SC-05 growth and SC-07 consuming units unknown never lower the tier, the need or the severities compared with any answered value (H1).
2. **Shown need and severity never flatter.** A blank or Unknown answer, or a blank value-base fact, never gives a lower **final** need index or band, or a lower final severity, than any answered option (H2).
3. **Register text matches the constants.** The text of `thresholds.json` agrees with `levers.json` (`globalCap`), `engine-rules.json` (`needVerdict.modifiers`) and `value-rules.json` (`scoring`) (H3).
4. **Value monotonicity per lever and band-to-exact** (DESIGN 10.9; PLAN F4 "For F5"). Both pass in my probe: 0 breaches in 1,500 one-step improvements, 0 of 1,200 exact values outside the band range. They should run in CI (M2).
5. **The single-answer limit, extended to findings.** The test should allow other findings to change only through `value_uplift` resting on a shown figure, and assert the need index before value moves by at most 12.5 per answer (M3).
6. **Small guards.**
   - Executive value confidence never exceeds Medium (DESIGN 10.7).
   - Growth never changes a value figure (ASM-FIN-051).
   - Both hold today by construction (no reference to `growth12m` in `value-model.ts`), but nothing tests them (L3).

### 3.2 The audit adapter and the regenerated audit

- **Uniform baselines (`sensitivityBases`, adapters.ts:208-249).** Correct. Dead questions drop from 13 to the 7 hypotheses, which is the truth.
- **The workshop estate without measured evidence (`FIQ3_WORKSHOP_UNMEASURED`, adapters.ts:213-214).** It widens the workshop value range (591k to 6.8M). But its comment says it makes the value headlines "move with the answers", and they do not. In the workshop no maturity answer moves value; AUTOMATED_AUDIT.md shows a value sensitivity of 0.00. The comment is wrong (L4).
- **Fact-driven behaviour is invisible.** The adapter varies maturity and hypothesis answers only, on fixed estates. So the audit cannot see H1, H2 or H4, which are all fact-driven. Add pseudo-questions for SC-04 (provider row unknown), SC-05, SC-07 units and each VB-01 part (M4).
- **Executive value dominance is not noted.** OP-06 carries 0.90 of the value range (AUTOMATED_AUDIT.md, executive sensitivity). That is above the audit's own "about 0.5 means one answer dominates". It is by design: executive mode quantifies only LEV-01 and LEV-04, and OP-06 sets LEV-04's base through ASM-FIN-052. Nothing records this. F7's sensitivity table should show it (M4).

## 4. Decision: workshop LEV-04 when VB-03 is blank

**Observation (confirmed).** RS9 reproduces it:
- In the workshop, LEV-04 needs the measured scheduled share (VB-03). With it blank, LEV-04 is "not quantified" and a Medium scope confirmation is raised.
- In executive mode, OP-06 maps to a scheduled share (ASM-FIN-052: Run 1.0, Walk 0.5, Crawl or Not yet 0) at Low confidence.
- So the same client can see LEV-04 in the executive view and lose it in the workshop.

**What the fallback would do** (probe, RS9 with OP-06 Walk):
- LEV-04 would add JPY 10.0M expected;
- LEV-01 would rise from JPY 19.3M to 57.9M, because `n_u` halves;
- the total would rise by 22%, mostly through LEV-01, not LEV-04.

**Recommendation: keep the rule. Do not fall back silently. Add a pre-fill instead.**

1. **The fallback breaks a CI invariant.** The F4 inflation guard "a blank fact never gives a higher value than the answered one" (`finops-iq-v3-value.test.ts`) would fail. With VB-03 blank and OP-06 Walk, the fallback's 0.5 gives more value than an answered 0.9. The executive mode escapes this only because VB-03 is not asked there.
2. **The workshop is the evidence-grade mode.** PLAN F4 says "no default share without a published source". ASM-FIN-052 is an LTM answer mapping, accepted for executive mode only, at Low confidence.
3. **The fallback is mostly not about LEV-04.** It moves LEV-01 three times as much as it adds LEV-04.
4. **The real defect is the mode transition.** DESIGN 6 says an executive answer set becomes the workshop's starting point.

**The fix.** When the workshop starts from an executive answer set, show VB-03's scheduled share as a **pre-fill suggestion** ("from OP-06: about 50%, confirm or change"). It works the way DESIGN 2.3 treats Cost IQ pre-fills: an unconfirmed pre-fill counts as blank, so the invariant holds. Add one line to the LEV-04 entry: "Quantified in the executive view from OP-06 (Low confidence); confirm the measured share to quantify it here." One click by the consultant restores LEV-04 with a client-confirmed figure.

**Also (L2).** If a client sends `nonProdScheduledShareSource: "derived_from_OP-06"` in workshop facts, LEV-04's confidence reads Medium (probe). DESIGN 10.7 says answer mappings are Low in any mode.

## 5. Phase 3 decisions (`docs/phase3/SCORING_AUDIT.md`)

| # | Decision (default applied in Phase 3) | Superseded by v3? | Design decision and test | What remains open |
|---|---|---|---|---|
| FIQ 1 | Review the golden diffs | Partly | F3/F4 goldens approved (`finops-iq-v3.test.ts` › "FinOps IQ v3 golden outputs (approved)") | RS6 to RS9 goldens await approval (F5 gate) |
| FIQ 3 | Gate minimum 65 ("mostly in place"); random answers below Stage 1 98% of the time | **Yes** | D2: per-capability Crawl / Walk / Run, weakest link, no stages or gates (DESIGN 3.2 to 3.3). Tests: `finops-iq-v3.test.ts` › "removed v2 behaviour stays removed: no stages, stage value bands, archetypes or money, and HY-01 moves nothing". `finops-iq-v3-audit.test.ts` › "every capability in scope reaches Run, Walk, Crawl, Not yet and Unknown": uniform Crawl answers give Crawl everywhere, the v3 analogue of "partly in place everywhere". AUTOMATED_AUDIT.md: random workshop results span 0 to 9 at target, with no floor | v2 stays live until M8 (D18), so the old behaviour remains on the current page. Close at cutover |
| FIQ 4 | "Not applicable" passes its gate; overuse risk | **Yes** | D5: no N/A option; N/A only from scope facts. Tests: `finops-iq-v3.test.ts` › "has no 'not applicable' answer: N/A comes only from scope facts"; `finops-iq-v3-audit.test.ts` › "no answer makes a capability 'not in scope'; only scope facts do" | The analogue risk now sits in **scope facts**. Deselecting a scope removes its capabilities and questions, and blank scope facts flatter the result (H1). Add the H1 invariant. Coverage is shown |
| FIQ 5 | Value at stake from the client's T6 range, else the stage table | **Yes** | D3 (lever model) and D4 (T6 becomes HY-01, a hypothesis only). Tests: `finops-iq-v3-value.test.ts` › "shows HY-01 beside the range with the gap explained, and it changes no number (D4)"; `finops-iq-v3.test.ts` › "removed v2 behaviour stays removed…"; `finops-iq-v3-audit.test.ts` › "hypothesis questions are the only questions that move no rating, by design (D4)" | v2 until M8 |
| FVC 2 | Blank urgency drivers lower urgency; keep, with a confidence label | **Partly** | DESIGN 9: blank maturity answers count as the maximum gap. HY-03 and HY-05 are retired from scoring (D4). Tests: `finops-iq-v3.test.ts` › "counts blanks as the maximum gap, so a blank never lowers need, and lowers confidence", "a blank never scores better than any answered option…"; audit › "Unknown never rates better, closes a gap or lowers need…" | **Open for scope and value drivers:** a blank SC-04 spend or SC-07 units lowers the tier and the need; a blank SC-05 growth adds no points (owner-approved in F3); blank value bases remove the value modifier (H1, H2). Recommended default in section 8, D-A and D-B |
| FVC 6 | Growth cap −25% to +60% a year; confidence at 70% answered and fewer than 3 blind spots | **Yes** | Growth is never applied to value (ASM-FIN-051, DESIGN 10.6; no reference in `value-model.ts`). SC-05 accepts −25 to +200 and is used only for the ≥ 20% urgency modifier (`finops-iq-v3.test.ts` › "adds the urgency modifiers: tier, growth of 20% or more, AI in scope…"). Confidence: executive need confidence Medium / Low (CLM-FIN-163; test "counts blanks as the maximum gap…, and lowers confidence"); value confidence (DESIGN 10.7; `finops-iq-v3-value.test.ts` › "OP-06 Unknown…" asserts Low for derived shares) | No test that growth never moves value, or that executive value confidence stays ≤ Medium (L3). Need confidence ignores unknown spend (H1) |

## 6. Findings, ranked

### High

**H1. Blank scope facts flatter the tier, the need verdict and the severities.**
- **Evidence.**
  - `evaluate.ts:243-247`: `totalSpend` skips unknown rows, so they count as 0.
  - `evaluate.ts:323`: "spend unknown -> 0".
  - `consumingUnits: 'unknown'` scores no point.
  - Probe P3, executive, all answers Crawl, AWS + Azure with Kubernetes:

    | Facts | Tier | Need | Band | High or Critical findings |
    |---|---|---|---|---|
    | Spend, growth and units given | 3 | 88.3 | Act now | 7 |
    | Spend unknown | 2 | 49.2 | Targeted improvements needed now | 3 |
    | Spend, growth and units unknown | 1 | 0 | Lightweight practices sufficient at current scale | 1 |

  - Need confidence stays **Medium** in all three, and the blind spots are listed but change nothing.
- **CIO consequence.** A CIO who skips the spend question is told no action is needed. That is the exact failure area 5 forbids, and the reason for FVC decision 2.
- **Fix (recommended default).** Treat unknown scope facts as risk, as D5 does for maturity:
  - unknown provider spend counts at the top spend band (3 points);
  - unknown units count +1;
  - unknown growth counts as ≥ 20% (+10);
  - each is labelled "assumed until confirmed";
  - need confidence is Low;
  - the consultant can override the tier with a reason, as today.

  Alternative: withhold the verdict until every provider row has at least a band.
- **Test.** Scope facts never lower the tier, the need or the severity compared with any answered value.

**H2. Blank value bases, and "Don't know" on OP-06, lower the shown need band.**
- **Evidence.**
  - `evaluate.ts:781-784`: the +10 value modifier applies only when a shown figure reaches 5% of P. When no value is shown, the verdict lists it as `pending` (`evaluate.ts:810`) but still computes the band without it.
  - Probe `probe_need.ts`, 200 executive estates:
    - a "don't know" VB-01 share lowers the final need in **272 of 800** checks and moves the band to a more lenient one in **90**;
    - a blank or "Don't know" maturity answer, almost always OP-06, gives a lower final need than every answered option in **74 of 4,400** checks (23 band moves). Example: seed 7, OP-06 Unknown gives 47.5 against 53.3 at the lowest answer.
  - The same mechanism removes the severity value uplift.
  - The CI invariants miss it because they test `needBeforeValue` (audit test:53; `finops-iq-v3.test.ts:731`).
- **CIO consequence.** "We don't know our non-production share" makes the verdict milder.
- **Fix (recommended default).**
  - When LEV-01 or LEV-04 (the executive's material levers) is not quantified because of a blank or Unknown input, count the value modifier as **"value not determined: counted as material until confirmed"**. Show it as a blind spot, with confidence Low. No hypothetical money figure is shown, so the F4 H3 rule (scoring rests on what the report shows) still holds: what is shown is the blind spot.
  - Apply the same rule to the severity uplift, with trace `value_unconfirmed`.
  - Alternative: drop the value modifier from the need index altogether.
- **Test.** The final need band and severities, not only those before the value step, never improve on a blank.

**H3. The client-visible threshold register contradicts the code.**
- **Evidence** (`registry/thresholds.json`, all `clientVisible: true`):
  - **THR-FIN-10** (lines 237-250) says the cap applies to "expected and upper" and is "lifted by provider-tool or billing evidence". The code, `levers.json` `globalCap` and CLM-FIN-138 say all three cases and "none (v1.0)". This is the F4 H1 defect, surviving in a register the fix did not touch.
  - **THR-FIN-14** (line 326) still lists "25% or more of estate still to move" as an urgency rule. DESIGN 9 (F3, amended) retired it.
  - **THR-FIN-13** (line 307) says "2% or more of in-scope spend". The engine compares each lever with its own base: P for public cloud levers, SaaS and licensing spend for LEV-09 (CLM-FIN-172).
- **Consequence.** The F7 methodology appendix will be built from these registers.
- **Fix.** Correct the three texts, then add the H3 label-truth test (section 3.1, item 3).

**H4. Executive mode cannot quantify LEV-04 when Kubernetes or GPUs are in scope, and its action is a dead end.**
- **Evidence.**
  - `value-model.ts:264-267`: LEV-04 needs `base.kubernetesSpend` (and `evidence.aiGpu.gpuSpend`) when those scopes are selected.
  - Both come from VB-06 and VB-07, which are workshop-only (question bank `modes: ["workshop"]`).
  - RS7: LEV-04 is "missing_input (base.kubernetesSpend)", and `F-FIN-SCOPE-KUBERNETES_SPEND` says "Confirm … (VB-06)", a question the executive respondent is never shown.
  - Yet SC-04, which is asked in executive mode, already collects a Kubernetes row and a GPU row.
- **Consequence.** For every Kubernetes or GPU estate, the executive door-opener loses its largest lever (LEV-04 is RS1's whole value) and ends on an action the respondent cannot take (areas 2 and 6).
- **Fix (recommended default).** In executive mode, read the SC-04 `kubernetes` and `ai_platform_gpu` rows as the cluster and GPU spend for LEV-04's exclusion, at Low confidence. When they are missing, the action points to SC-04, not to VB-06 or VB-07.
- **Test.** No scope-confirmation action names a question outside the mode's question set.

### Medium

**M1. The tier counts Kubernetes (and GPU) spend twice.**
- **Evidence.** `totalSpend` sums every SC-04 row, including `kubernetes`, which sits inside the provider bills.
  - Probe P2: AWS USD 9M plus a Kubernetes row of USD 3M becomes USD 12M, which moves the estate from **Tier 1 to Tier 2**.
  - RS7's tier spend is USD 28.8M with the row and 25.2M without it.
  - Higher tiers raise targets and add 10 or 20 need points.
- **Fix.** Treat `kubernetes` and `ai_platform_gpu` as "of which" rows: excluded from the tier spend, used as LEV-04's exclusion (H4). SC-04's help text should say so.
- **Watch item.** Bedrock-style AI APIs billed by the provider are the same issue for `ai_api`. Ask "billed outside your cloud provider?"

**M2. Value monotonicity and band-to-exact are not in CI.**
- **Evidence.** DESIGN 10.9 requires both, and PLAN F4 status defers them to F5. No test exists (grep finds none).
- **Probe P5.** It found:
  - 0 per-lever breaches in 1,500 improvements: higher coverage, scheduled share, Spot share, Kubernetes utilisation and GPU utilisation;
  - 0 of 1,200 exact values outside their band range;
  - a higher scheduled share raising the **total** in 89 of 300 runs, through LEV-01 (DESIGN 10.4). This is by design and should be stated in the test.
- **Fix.** Add both tests, as in the probe.

**M3. One answer moves another capability's finding.**
- **Evidence.** Probe P4, executive, OP-01 Crawl:
  - OP-06 at Walk or Run raises Rate Optimization from Medium to High, through LEV-01's value uplift (`n_u` shrinks).
  - The High or Critical count moves 1 → 2 → 1 as OP-06 improves from Not yet to Walk to Run.
  - AUTOMATED_AUDIT.md shows OP-06 with a swing of 2 on "Critical + high findings".
- **Assessment.** The logic is sound: better scheduling leaves more steady usage to commit. But the invariant does not cover it, and the reason is not stated.
- **Fix.** Keep the behaviour. Extend the single-answer test (section 3.1, item 5). Have F7 print the finding's `valueBasis` as "raised because the steady usage left after scheduling is worth more than 2% of spend".

**M4. The audit cannot see fact-driven behaviour and is not a gate.**
- **Evidence.**
  - `npm run audit:engines` is not in `ci.yml`, and nothing reads `audit-summary.json`.
  - The adapter varies answers only (section 3.2).
  - OP-06's 0.90 dominance of the executive value range is not recorded.
- **Fix.**
  - Add fact pseudo-questions to the adapter.
  - Add a small CI check on the FinOps v3 sections: dead questions are HY only, out of scale is 0, and the worst missing-data shift is ≤ 0, including need after the value step.
  - Note OP-06's dominance in DESIGN 10.2 and the F7 sensitivity table.

**M5. An AI-API-only estate is asked about GPUs.**
- **Evidence.**
  - DESIGN 4.4 switches LEV-10, VB-07, OP-12 and QV-07 on for `ai_api` or `ai_platform_gpu`.
  - RS9 (Bedrock, no GPUs) gets two Low findings: "Confirm annual GPU and model-serving spend" and "Confirm measured average GPU utilisation" (F5-scenario-diffs.md X3). VB-07 is also asked.
- **Fix (recommended default).**
  - LEV-10 and VB-07 are switched on by `ai_platform_gpu` only.
  - `ai_api` keeps OP-12 and QV-07.
  - Token spend is listed as "no v1 lever".

**M6. VB-03's question text and its field disagree on the Spot share.**
- **Evidence.**
  - The question text (question bank, VB-03) asks "how much of that [tolerant compute] already runs on Spot". DESIGN 4.3 also says "share of that tolerant compute".
  - The field label, `facts.schema.json:73` and the LEV-06 formula use "share of **compute**".
  - A client who answers as worded (for example 80% of tolerant compute) is read as 80% of all compute, so LEV-06 and `t_u` go to 0. That is conservative, but wrong.
- **Fix.** Reword the question and DESIGN 4.3 to "what share of all compute already runs on Spot".

### Low

- **L1. Lower-cased lever name in client text.** The scope-confirmation consequence renders "ai and gpu (LEV-10) cannot be quantified" (RS9). Use the lever's display name.
- **L2. Derived share in the workshop.** A workshop LEV-04 with `nonProdScheduledShareSource: "derived_from_OP-06"` reads Medium confidence; DESIGN 10.7 says Low (section 4).
- **L3. Two untested guards.** Growth never moves value (ASM-FIN-051), and executive value confidence is never above Medium (DESIGN 10.7). Both hold by construction; add the tests.
- **L4. Adapter comment.** The comment on `FIQ3_WORKSHOP_UNMEASURED` (adapters.ts:213) says the value headlines move with the answers; they do not in the workshop.
- **L5. Test harness.** These gaps produced three of the seven failures; the tests themselves were not edited:
  - the scenario test hard-codes the foundations band label (X2);
  - the value test needs `cases` on excluded levers (X1);
  - two test titles still say "five reference scenarios".
- **L6. SageMaker GPU and LEV-01.** GPU spend on SageMaker is not eligible for Compute Savings Plans. The AWS FAQ says Compute Savings Plans "apply to usage across Amazon EC2, AWS Lambda, and AWS Fargate", and SageMaker Savings Plans ("up to 64%") cover only SageMaker ML instance usage. LEV-01 applies the EC2 maximum to all compute, including SageMaker GPU. There is no effect in RS8 (LEV-01 is 0), but it can overstate the rate by 2 points. Exclude SageMaker GPU spend from LEV-01's base, or register 64% for it.
- **L7. The cap's "self-estimate" wording.** The Flexera 2026 press release (read 20 Oct 2026) confirms 29%, "more than 750" respondents and 18 Mar 2026. Its wording is "an increase in wasted cloud spend (29%)", and it does not itself say "self-estimate", as CLM-FIN-040 and ASM-FIN-050 do. The characterisation is likely right, since the survey asks respondents, but it is UNSOURCED from this page. The report itself settles it.
- **L8. The LEV-04 maximum in the register.** `levers.json` stores 0.702 while the engine uses 1 − 50/168 = 0.70238. The difference is 0.05%. Store the formula's value, so the register equals the code.

## 7. Evidence (probes, 20 Oct 2026, session scratchpad)

- **P1. Workshop fallback (section 4).** RS9 as written: LEV-04 not quantified, expected JPY 218.3M. With OP-06 Walk mapped to 0.5: LEV-04 5.0 / 10.0 / 20.0M, LEV-01 19.3 → 57.9M, expected 266.8M, LEV-04 confidence Medium. The same estate in executive mode: LEV-04 blocked by `base.kubernetesSpend`.
- **P2. Tier double count (M1).** USD 9M plus a USD 3M Kubernetes row moves Tier 1 (2 points) to Tier 2 (3 points).
- **P3. Blank scope facts (H1).** See H1.
- **P4. OP-06 (M3).**

  | OP-06 | Rate Optimization | High or Critical findings | Need |
  |---|---|---|---|
  | Unknown | Medium | 0 | 18.3 |
  | Not yet | Medium | 1 | 28.3 |
  | Crawl | Medium | 1 | 28.3 |
  | Walk | High (value_uplift) | 2 | 24.2 |
  | Run | High (value_uplift) | 1 | 24.2 |

  Unknown at 18.3 against Not yet at 28.3 is H2.
- **P5. Value monotonicity and band-to-exact (M2).** See M2.
- **`probe_need.ts` (H2).** See H2.

## 8. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D-A | Unknown scope facts (H1; closes FVC 2) | (a) count as risk: top spend band, units +1, growth ≥ 20%, labelled assumed, confidence Low; (b) withhold the verdict until spend is banded; (c) keep | **(a)**, with the consultant tier override kept |
| D-B | Value modifier and uplift when a material lever is blocked by a blank (H2) | (a) count as material until confirmed, shown as a blind spot; (b) drop the value modifier from need; (c) keep (accepted at F4) | **(a)** |
| D-C | Workshop LEV-04 with VB-03 blank (section 4) | (a) keep and add the OP-06 pre-fill suggestion; (b) fall back to ASM-FIN-052 at Low confidence; (c) keep as is | **(a)** |
| D-D | Executive LEV-04 with Kubernetes or GPU in scope (H4) and the tier double count (M1) | (a) SC-04 rows are "of which" rows: used for LEV-04's exclusion, excluded from tier spend; (b) ask VB-06 in executive mode; (c) keep | **(a)** |
| D-E | LEV-10 scope (M5) | (a) `ai_platform_gpu` only; (b) keep `ai_api` too | **(a)** |
| D-F | RS6 to RS9 in the CI scenario set | (a) record X1 and X2 in the tests, fix M5 for X3, then approve goldens; (b) record all three as accepted differences now | **(a)**. Approve the four goldens after H1 to H4 and M5 land, as those change RS7 and RS9 |
| D-G | Evidence lift of the 29% cap (PLAN F4: "revisit after F5") | (a) keep no lift in v1; (b) lift for High-confidence levers | **(a)**. No back-test is possible yet (no engagement history; the reference scenarios are not outcomes), and no scenario's expected case comes near the cap (highest RS8, 19.7%) |
| D-H | OP-06 cross-capability severity (M3) | (a) keep, with the test and wording; (b) cap uplift to the answer's own capability | **(a)** |

## 9. Sources (checked 20 Oct 2026)

**Provider and FinOps Foundation pages:**
- **Google Cloud Blog, DZ BANK.** "How DZ BANK uses a Cloud Run-first approach to unlock big savings", 7 Mar 2024. https://cloud.google.com/blog/products/serverless/how-dz-bank-uses-a-cloud-run-first-approach-to-unlock-big-savings. V (shape of RS6).
- **Google Cloud, Committed use discounts overview.** "up to 70% for memory-optimized machine series and … up to 55% for all other machine series"; GPUs covered by resource-based commitments. https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview. V.
- **Google Cloud Spot VMs pricing (up to 91%, CLM-FIN-067).** https://cloud.google.com/spot-vms/pricing. P: the page did not load in this session.
- **FinOps Foundation, FinOps Scopes topic page.** It lists "How Gerdau FinOps Unified Multi-Cloud and SaaS Allocation and Unit Economics at Scale", 24 Aug 2026. https://www.finops.org/topic/scopes/. V for the listing text. The session itself (https://www.finops.org/assets/how-gerdau-finops-unified-multi-cloud-and-saas-allocation-and-unit-economics-at-scale/, which redirects to YouTube) was not watched: P (shape of RS7).
- **AWS case study, Forethought Technologies.** https://aws.amazon.com/solutions/case-studies/forethought-technologies-case-study/. V (shape of RS8).
- **AWS case study, SmartNews.** https://aws.amazon.com/solutions/case-studies/smartnews-graviton-case-study/. V (shape of RS9).
- **AWS Savings Plans FAQs.**
  - Compute Savings Plans "up to 66%"; EC2 Instance Savings Plans "up to 72%".
  - Compute Savings Plans "apply to usage across Amazon EC2, AWS Lambda, and AWS Fargate".
  - "SageMaker Savings Plans is only applicable to SageMaker ML Instance usage", "up to 64%".

  https://aws.amazon.com/savingsplans/faq/. V.
- **AWS Machine Learning Savings Plans pricing.** "Amazon SageMaker Savings Plans … reduce your costs by up to 64%". https://aws.amazon.com/savingsplans/ml-pricing/. V.
- **Azure reservations and savings plan maxima (CLM-FIN-062, CLM-FIN-063).** https://azure.microsoft.com/en-us/pricing/offers/reservations/. P: not re-read in this session.

**Published research:**
- **Flexera, "Flexera finds cloud value is rising while AI waste grows".** Press release, Itasca, IL, 18 Mar 2026: "wasted cloud spend (29%)"; "more than 750 cloud decision-makers and users"; "63% having established FinOps teams". https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows. V (see L7 on the "self-estimate" wording).

**Repository evidence:**
- **Claims register entries relied on, unchanged since F4:** CLM-FIN-040, 060 to 069, 120 to 122, 127, 131, 138, 140, 155, 160, 163, 167, 168, 170, 172, 174 to 176 (`packages/engine-core/src/claims/claims-register.json`).
- **Engine and tests read:** `v3/evaluate.ts` (lines 243-247, 316-340, 770-812), `v3/value-model.ts` (lines 255-275), `registry/thresholds.json` (lines 237-330), `registry/levers.json`, `v3/value-rules.json`, `v3/question-bank.json` (VB-03, VB-06, VB-07, SC-04), `audit/adapters.ts` (lines 160-250), `docs/phase3/AUTOMATED_AUDIT.md`, `docs/phase3/SCORING_AUDIT.md`.
