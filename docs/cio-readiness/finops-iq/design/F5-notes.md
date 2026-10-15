# FinOps IQ v3: F5 scoring audit notes

**Date:** 15 Oct 2026. **Phase:** F5 (scoring audit and recalibration). **Engine:** 3.5.0 (rules 1.5.0, value model 1.2.0, lever library 1.2.0, question set 3.2.0) after the practice-lead review ([F5-review.md](F5-review.md)); first built as 3.4.0. **For review by:** the practice lead (`finops-cost-lead`); the product owner approves.

The audit is in CI in two places:
- `packages/engine-core/test/finops-iq-v3-audit.test.ts`, part of `npm test`;
- `npm run audit:engines`, which now exits non-zero when a FinOps IQ v3 threshold breaks (`packages/engine-core/audit/core.ts`, `thresholdBreaches`).

Both run over seeded random questionnaires in both modes. The test also runs the nine reference scenarios: RS1 to RS5 from F1, and RS6 to RS9 from [reference-scenarios-f5.json](reference-scenarios-f5.json).

## 1. Value monotonicity: which way each lever moves

DESIGN 10.9 defines value monotonicity per lever: "a more mature answer (higher coverage, more scheduling, more Spot) never raises the opportunity for that lever". A better answer can therefore legitimately lower the value. It does so only where the answer sets a lever's base, so the test asserts the direction lever by lever:

| Answer | Mode | Effect on value | Asserted |
|---|---|---|---|
| OP-06 (non-production scheduling), between answered options | executive | Sets the scheduled share (ASM-FIN-052). LEV-04's base shrinks. The same usage returns to LEV-01's steady pool, because n_u falls | LEV-04 never rises. Every other lever never falls. Net run-rate falls by no more than LEV-04 falls |
| OP-06: Don't know → any answer | executive | LEV-04 becomes quantified | Net value never falls |
| Every other maturity answer, and OP-06 in the workshop | both | Sets no base. It moves value only through the roadmap start month (ramp, M3) and the "not worth pursuing" test (M1). A better answer can only start a lever earlier | Net run-rate and net 3-year value never fall. With the same headline levers, no lever's run-rate moves |

**Corrected after the review (H1).** The F5 build said here that the total rises with better scheduling only when a 72% instrument is stated. That was wrong for Kubernetes estates.

**The cause.** LEV-01's `n_u` removed *all* unscheduled non-production from the steady pool, including cluster non-production, which LEV-04 does not schedule. Better scheduling therefore returned usage to LEV-01 that no lever had removed. In RS7 v1.0 the need index rose from 49.2 to 59.2 when OP-06 went from Not yet to Run.

**The fix (value model 1.2.0).** `n_u` now covers only the non-production LEV-04 acts on:

`n_u = nonProd × (1 − scheduled) × (P_c − kubernetesSpend − gpuSpend) ÷ P_c`

**After the fix.** The value total falls with better scheduling whenever LEV-01's rate is at or below LEV-04's 70.2%. That covers every default instrument and Google Cloud's 70% memory-optimised CUDs.

**The one remaining rise** comes when the stated instrument is above 70.2%: AWS EC2 Instance Savings Plans or Standard RIs, or Azure reservations, both 72%. Each point of scheduling then adds 1.8% of LEV-04's move to LEV-01, so the total rises slightly and can cross the 5% value modifier. Over 6,000 OP-06 steps in 1,500 random executive estates, this happened once.

It is the **one named exception** to need-index monotonicity. It is tested: the need index can rise only through the value modifier, only on OP-06, and only with one of those two instruments stated.

In the workshop, the value bases are facts (VB-03), so no maturity answer sets a base.

**Commitments and Spot (M3).** In the workshop, LEV-01's steady share is capped at the compute not on Spot, so LEV-01's base is at most `P_c × max(0, 1 − spotShare − coverage)`. That makes `spotShare` required for LEV-01 in the workshop, so a blank cannot raise it. DESIGN, the VB-03 question text and the formula now all define `spotShare` as a share of compute. Executive mode has no Spot input, so the cap does not apply there.

## 2. Single-answer limit (PLAN F5 item 2)

**Chosen limit:** one answer moves only its own capability. One step on the answer scale (Don't know < Not yet < Crawl < Walk < Run) moves that capability by **one level at most**. A depth answer moves it by one level at most whatever its value, as DESIGN 3.3 requires.

For the summary, a single answer (any value, or blank) moves:
- **the gap count** (the number of capability-gap findings) by at most **1**;
- **the at-target count** by at most **1**;
- **the total gap** by at most **3 levels** (one capability's whole range);
- **the need index** by at most **one capability's share of it**: 100 / n, where n is the number of executive capabilities with a target. That is 12.5 points for n = 8 and 14.3 for n = 7 (Tier 1, where Unit Economics has no target), plus 0.1 for rounding. One step on the answer scale moves the base index by at most 100 / (3n), which is 4.2 points for n = 8;
- **only for OP-06**, which also feeds the executive value, an extra 10 points for the value need modifier.

**Why this limit:**
- It is the strongest limit the approved model allows. A core answer must be able to move its capability across the whole scale: with one core question, Not yet → Run is three levels by design.
- The audit observed exactly these maxima (gap count 1, need 12.5, one step 4.2), so the limit is tight.
- A smaller limit on the need index would mean dampening single answers, which DESIGN 9 does not do.
- The value modifier is a separate, named step (F4 review H3), so it is counted separately and only for the one answer that feeds value.

A capability with no core question for the client (Licensing & SaaS, Sustainability) rates every asked question as core (DESIGN 3.3). Its questions therefore follow the core limit, not the depth limit.

**Additions after the review (D3):**
- **Need-index monotonicity** is its own CI threshold. A better answer never makes the verdict more urgent, apart from the named exception in section 1. It is checked in `finops-iq-v3-audit.test.ts` and gated by `audit/core.ts` (`monotonicity`).
- **The band property is tested:** 100 / n + 10 + 0.1 ≤ 24.4 < 25, the band width, so one answer moves the verdict across at most one band boundary.
- **The value limit** the tests imply: outside OP-06, a maturity answer changes value only through the ramp start and M1 inclusion, so by at most one lever's expected run-rate.
- **A clarification:** a step that switches on a follow-up of the same capability (OP-02 when OP-01 drops to Crawl) which the client left blank adds that blank's own effect (rated Unknown, one level at most). It is measured separately, as RS8 v1.1 showed.

## 3. Engine change: a blank or Unknown OP-06 lowered need (fixed)

**Found by the new "missing data never helps" threshold.** In executive mode, a blank or "Don't know" on OP-06 leaves LEV-04 unquantified and removes all non-production from LEV-01 (ASM-FIN-052). The expected value can then fall below 5% of P, so the value need modifier (+10) is lost. The blank already counts Usage Optimization at its maximum gap, but that adds at most 100 / (3 × 8) × 2 ≈ 8.3 points.

The result: the need index with OP-06 blank could sit up to 10 points **below** the index with an answer. Audit example: 98.3 blank against 100 at OP-06 = Not yet. That was 350 cases of blank and 384 of Unknown in 6,864 probes, against DESIGN 9 ("a blank never lowers need") and F5 item 3 ("Unknown never scores better than the lowest answered option").

The F4 test did not catch it. It checked the need index before the value step (`needBeforeValue`) and the value step against shown figures, but not the two together.

**Fix (engine 3.4.0, rules 1.4.0; ASM-FIN-086, CLM-FIN-177, both pending owner approval):** a new need modifier, `value_input_unanswered`, applies when all of these hold:
- the mode is executive;
- OP-06 is blank or Don't know;
- the value modifier is not reached on the shown figures;
- at least one answered OP-06 option would reach the value modifier (the engine evaluates them).

When it applies:
- it adds the same 10 points;
- it is never applied together with the value modifier;
- it names no figure (`valueBasis` stays null), so F4 review H3 still holds: no value figure the report does not show is used or claimed.

The test `F5 fix: a blank or Unknown OP-06 keeps the value need modifier's points` covers it. The test "a blank or Unknown never scores better than any answered option" now includes the need index with the value step and the net value. Reverting the fix makes both fail.

**Effect on scenarios and goldens:** none of RS1 to RS9 leaves OP-06 blank or Unknown, and no golden output changes other than the version stamp (section 6).

**After the review (D2, M1).**
- With H1 fixed, the need index is monotone in OP-06, so "the highest need an answer could imply" is the least mature answer's. The named 72% exception is the only case where it is not.
- The applied modifier carries the client wording "Scheduling answer missing: counted at the highest need an answer could imply".
- It replaces the pending value entry. A modifier is never both applied and pending (tested).

## 3a. Missing facts (review H2, D4)

- **Unknown spend.** It scored 0 tier points, so RS7 with GCP spend unknown fell from 49.2 to 19.5, two bands. Now, when any spend row is unknown and a stated spend could raise the tier:
  - the executive need verdict is withheld (`needVerdict` null, `needVerdictWithheld`: "Not available: annual spend is needed to set the tier, the targets and the verdict");
  - the targets are labelled provisional (`tier.provisional`, a headline suffix).

  An unknown row that cannot change the tier keeps the verdict. RS1's data-centre row is an example: RS1 stays at 36.7. (ASM-FIN-087, CLM-FIN-178, pending owner.)
- **Unknown growth (D4).** It adds 0 points. The verdict now:
  - lists a pending entry: "Growth not known: the index would be 10 points higher at 20% growth or more", naming the alternative band when it differs;
  - treats SC-05 "don't know" as a question blind spot, so confidence is Low.
- **Other missing value inputs.** When part of the value range is not quantified, the value modifier is listed as pending with its 10 points.
- **The test.** A blank fact (each spend row, growth, compute, steady, coverage, non-production and cluster spend) does one of three things:
  - withholds the verdict;
  - never lowers the need index;
  - lowers it by no more than the points disclosed as pending.

## 4. No dead questions, every rating reachable

- **Liveness** follows the F3 re-review R4 approach. Core questions are tested from an all-Run baseline, and depth questions from an all-Walk baseline, with every scope in play. Every one of the 46 maturity questions moves its own capability's rating in each mode where it is asked.
- **The audit** adds the same all-at-one-level questionnaires to its sensitivity bases (`livenessBases` in `audit/adapters.ts`). The workshop report no longer lists OP-05 to OP-12 as dead. Only the hypothesis questions are dead, and they are never scored by design (D4). The threshold allows only those.
- **Reachability:** every capability reaches Not yet, Crawl, Walk, Run, Unknown and "Not answered" in each mode where it is assessed. "Not in scope" comes only from scope facts. "Not assessed" applies only to capabilities outside the executive set. All four need-verdict bands are reached.

## 5. Specific checks (PLAN F5 item 3)

| Check | Result |
|---|---|
| N/A only from scope | "Not in scope" is the same for a given set of facts with no answers, with every answer at any level, and with the client's own answers. No option means "not applicable" |
| Unknown never better than the lowest answered option | Holds on the rating, at-target, gap count, need index (now including the value step, section 3) and net value. Unknown always flags the rating unconfirmed |
| Labels match thresholds (M10) | The UN-04 and QV-01 option ranges are parsed and compared with THR-FIN-01 and THR-FIN-05 and their claims (CLM-FIN-124, CLM-FIN-126). Measured allocation below 70% is Crawl and "not measured" is Not yet, as the owner decided on 15 Oct 2026. Also checked against their rules: the UN-08 count rule and help text (THR-FIN-08); the need bands and labels (THR-FIN-14); the 2% and 5% value shares (THR-FIN-13 and 14); the 50-hour schedule and LEV-04's 70.2% (THR-FIN-15); the OP-02 trigger at 50% (THR-FIN-03). Finding "Today" text quotes the label of the option the client chose; "Not answered" appears only for a blank. No mismatch found |
| Band to exact (DESIGN 10.9, left from F4) | Replacing a band with an exact value inside it keeps the expected value inside the banded conservative-to-upper range: one band at a time and all at once, at the low end, midpoint, high end and an inner point |
| Scope answers never scored | SC and VB answers passed as answers change no rating. Spend, growth, sector, compute and non-production shares move no rating while the asked question set is the same |

## 6. Golden diff for the practice lead and owner

`packages/engine-core/test/golden/finops-iq-v3.json`, after the review fixes. The comparison is with the F5 build (4406f13):

| Golden | Change | Why |
|---|---|---|
| RS1, RS2, RS4, RS5, `all-run-workshop` | Version stamp only: engine 3.5.0, rules 1.5.0, value model 1.2.0, lever library 1.2.0, question set 3.2.0 | No cluster non-production, no Spot cap binding, spend known |
| RS3 | LEV-01 is now quantified (USD 79k / 135k / 137k); DECISION-02 is removed; expected gross USD 3.53M → 3.66M; the capped upper case is unchanged | H1: cluster and GPU non-production stays in the steady pool (V13) |
| `unanswered-executive` | Pending wording only: "No value figure is shown ..., so the value modifier is not assessed" | M1 wording |
| `unanswered-workshop` | `F-FIN-SCOPE-SPOT_SHARE` is now Medium and also blocks LEV-01 | M3: the Spot share is required for LEV-01 in the workshop |
| RS6 to RS9 | Re-baselined on scenario version 1.1.0-f5 | H3, M2, M3 (F5-scenario-diffs.md) |

**To approve:**
- the corrected goldens;
- `value_input_unanswered` (ASM-FIN-086, CLM-FIN-177);
- the withheld verdict and the growth disclosure (ASM-FIN-087, CLM-FIN-178);
- the single-answer limit with the D3 additions;
- the named 72% exception.

**For the owner, not changed here:**
- **H4:** the VB-02 coverage denominator behind RS6's DECISION-02.
- **M5:** a separate plausibility back-test.

## 7. Audit numbers (seeded; `docs/phase3/AUTOMATED_AUDIT.md`, after the review fixes)

- **Executive mode** (three estates, including a Kubernetes estate with a stated Azure reservation):
  - need index 28.3 to 100;
  - all four bands reached (Lightweight by the best answers);
  - largest single-answer swing: gap count 1, need index 12.5;
  - **need-index monotonicity: 0 violations**;
  - dead questions: HY-01 and HY-07 only;
  - missing-data shift: never positive.
- **Workshop mode:**
  - largest swing: gap count 1;
  - monotonicity: 0 violations;
  - dead questions: hypothesis questions only;
  - missing-data shift: never positive.
  - The fixed estate's expected gross rose from USD 6.8M to 7.4M with H1, because cluster non-production now stays in LEV-01's steady pool.
- **All CI thresholds pass.**
