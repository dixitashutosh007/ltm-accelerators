# FinOps IQ v3: F5 scoring audit notes

**Date:** 15 Oct 2026. **Phase:** F5 (scoring audit and recalibration). **Engine:** 3.4.0 (rules 1.4.0; value model 1.1.0, unchanged). **For review by:** the practice lead (`finops-cost-lead`); the product owner approves.

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

The total can fall when scheduling improves, because LEV-04's arithmetic maximum (70.2%) is close to LEV-01's maximum (65–72%). With an AWS EC2 Instance Savings Plan or an Azure reservation stated (72%), the total can also rise slightly. Both are the documented interaction (DESIGN 10.4), not a breach. In the workshop, the value bases are facts (VB-03), so no maturity answer sets a base.

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

`packages/engine-core/test/golden/finops-iq-v3.json`:

| Golden | Change | Why |
|---|---|---|
| RS1 to RS5, `unanswered-executive`, `unanswered-workshop`, `all-run-workshop` | Version stamp only: `engine` 3.3.0 → 3.4.0, `engineRules` 1.3.0 → 1.4.0, and the `kb` string. No rating, finding, need index or value figure changes | The section 3 fix applies only when OP-06 is blank or Unknown and value is shown. No existing golden has both: `unanswered-executive` has no value bases |
| RS6 to RS9 (new) | Added | The four F5 provider case-study scenarios; each matches the expectations written before the engine was run (see [F5-scenario-diffs.md](F5-scenario-diffs.md)) |

**To approve:** the four new goldens and the version-only change to the eight existing ones; the `value_input_unanswered` rule (ASM-FIN-086, CLM-FIN-177); the single-answer limit in section 2.

## 7. Audit numbers (seeded; `docs/phase3/AUTOMATED_AUDIT.md`)

- **Executive mode:**
  - need index 18.3 to 100;
  - all four bands reached;
  - largest single-answer swing: gap count 1 and need index 12.5;
  - dead questions: HY-01 and HY-07 only;
  - missing-data mean shift: negative on every headline, and 0 on the worst profile.
- **Workshop mode:**
  - gap count 13 to 22 over random answers;
  - largest swing: gap count 1;
  - dead questions: HY-01 to HY-07 only;
  - missing-data shift: never positive.
- **All CI thresholds pass.**
