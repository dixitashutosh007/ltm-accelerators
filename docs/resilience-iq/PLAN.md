# Resilience IQ: plan to fix and productionise

**Branch:** work happens on `resilience-iq-dev`, deployed by Amplify to the `resilience-iq-dev` environment. Main is untouched until R6.

**How each phase lands:** a PR into `resilience-iq-dev` with full CI (the same checks as main, plus the Resilience IQ runtime suite), then a green Amplify build.

## Phases and status

| # | Phase | Status | Outcome |
|---|---|---|---|
| R0 | Stabilise the dev build | ✅ Done (PRs #24, #25; Amplify jobs 53–54) | The build failed on invalid YAML in `amplify.yml`. Persistence was never the cause; job 49 had deployed it. Every Resilience IQ test now runs before the backend deploys. Three engine bugs that the stale tests had hidden are fixed |
| R1 | Security baseline | ✅ Done (PRs #26, #27; Amplify jobs 55–56) | Main merged in: authenticated Advisory API, CI and guard rails. Every Resilience IQ route except the CORS preflight needs the Cognito JWT, checked live (401 without a token). CORS is limited to allowed origins. Assessment takeover is closed. The page uses the shared session client and renews tokens |
| R2 | Engine and correctness (the Phase 2 template) | 🔄 In review | Details below |
| R3 | Scoring audit and recalibration | Next | Findings so far are listed below |
| R4 | Persistence and workspace | Not started | Server-computed result on completion; lookups past 100 records; history and resume |
| R5 | Content fact-check and brand | Not started (brand done in R1) | Source or label scoring constants. AWS/Azure/GCP mapping and neutrality fixes |
| R6 | Merge to main and production launch | Not started | Dev → main PR with full CI. Drop Cost IQ-style exemptions. Production smoke test |
| V | Validation report | After R6 | Written sign-off against these gates |

## R2: what changed

### Request contract
`packages/engine-core/src/accelerators/resilience-iq/contract.ts` (`parseResilienceIqRequest`):
- It is shared by the Lambda (which returns 400 with every problem, the first one as `error`), the unit tests, and the browser tests' fake API.
- It rejects option indexes, retired labels, unknown questions, and incomplete or unknown matrix answers.

### Page fixes (`Accelerators/resilience-iq.html`)
- **Recovery objective sliders (EX-02 to EX-04)** no longer record their starting position as an answer. They show "Not set", and the user must choose a value or Unknown.
- **EX-01 (critical services)** is a multi-select, as the question bank defines and the engine scores it. Before, it was a drag-to-rank list that always submitted all six services, so criticality was always "very high".
- **Report display fixes:**
  - Target-state principles now show; the page read `targetPrinciples`, but the engine sends `principles`.
  - Sensitivity items render as trigger, impact and action, instead of raw JSON.
  - The confidence explanation uses the engine's `reasons`.
  - A scoring failure shows an error (`role="alert"`) and no report.
- **Question Bank Studio (`resilience-iq-question-bank.html`):** a syntax error, a missing `+'`, stopped the whole page script from running.

### Engine types
`TargetStateBlueprint` now describes what the engine returns. The declared type had drifted from the real output, which is why the page read the wrong field.

### Tests
- **`packages/engine-core/test/resilience-iq.test.ts`, 22 tests:**
  - golden outputs for six sample clients: ready, gated, objectives unknown, empty, gated then completed, and cloud-native SaaS;
  - invariants over 500 seeded random questionnaires;
  - contract tests;
  - regression tests for each bug fixed in R0–R2.
- **`tests/e2e/resilience-iq.spec.ts`, 8 tests:**
  - the full 20-question journey through the page, where the request must equal exactly what was clicked and pass the contract;
  - an untouched slider is not an answer;
  - a scoring failure shows an error;
  - session renewal, permission check, and the Studio loading without errors.
- **Wider checks:**
  - Main's typecheck and repo checks now cover Resilience IQ; it is no longer "separately maintained".
  - Resilience IQ golden diffs go to the BCP/DR practice lead for review.

## R3: scoring findings carried forward

These come from the engine review and the golden outputs. Fixing them changes scores, so each needs a practice-lead decision.

1. **The headline rating ignores penalties.** The rating, maturity and report use `postureScore`, not the penalised `score`. For example, the golden `retailer-advisory-complete` scores 0 after penalties but is rated "Fragile" (posture 50), and the tested bank is "Resilient" with "High" critical exposure.
2. **Advisory answers are read backwards or wrongly:**
   - AF-DR-04 "No" (recovery is independent, the good answer) is penalised.
   - Separating failure domains in AF-CL-01 adds concentration risk.
   - AF-CY-03 is counted as a backup gap.
   - AF-OP-01 to AF-OP-03 map to the wrong gaps.
   - AF-TP-04 can never match.
   - AF-CY-01 is never read.
3. **The evidence-confidence label** matches "tested" inside "Medium — documented but not fully tested" (94 of 500 random cases).
4. **Answers are counted two or three times:** through the question score, a flat penalty and an advisory penalty. EX-20 alone is used three times.
5. **"Unknown" counts as less risky than "Potentially"** for cyber exposure and concentration, and answering "Unknown" avoids the advisory gate.
6. **Demanding recovery objectives raise the score**, although strict objectives are not capability.
7. **Dead questions:**
   - EX-15 (its domain GOV has weight 0);
   - EX-01 and EX-18, which have fixed scores.
8. **An empty domain counts as 50**, so an empty questionnaire scores higher than the worst answers inside the engine. Blanks block the result, so this is not shown.
9. **Unused models:** the strategy scores are hard-coded, and `recommendation-model.json` and `decision-matrix.json` are never used.
10. **The older engine test (`evaluate.test.ts`)** still uses some option labels that are not in the question bank ("Yes, current", "Scenario-based tests"). The engine silently accepts them, so those cases test less than they claim. They should be rewritten on the contract's labels.

## Decisions taken (product owner)

| Decision | Applied |
|---|---|
| The dev environment shares the production reports bucket and user pool | Yes. Only `LTM_ALLOWED_ORIGINS` and `LTM_APP_BASE_URL` are set on the dev branch |
