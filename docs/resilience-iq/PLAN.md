# Resilience IQ: plan to fix and productionise

**Branch:** work happens on `resilience-iq-dev`, deployed by Amplify to the `resilience-iq-dev` environment. Main is untouched until R6.

**How each phase lands:** a PR into `resilience-iq-dev` with full CI (the same checks as main, plus the Resilience IQ runtime suite), then a green Amplify build.

## Phases and status

| # | Phase | Status | Outcome |
|---|---|---|---|
| R0 | Stabilise the dev build | ✅ Done (PRs #24, #25; Amplify jobs 53–54) | The build failed on invalid YAML in `amplify.yml`. Persistence was never the cause; job 49 had deployed it. Every Resilience IQ test now runs before the backend deploys. Three engine bugs that the stale tests had hidden are fixed |
| R1 | Security baseline | ✅ Done (PRs #26, #27; Amplify jobs 55–56) | Main merged in: authenticated Advisory API, CI and guard rails. Every Resilience IQ route except the CORS preflight needs the Cognito JWT, checked live (401 without a token). CORS is limited to allowed origins. Assessment takeover is closed. The page uses the shared session client and renews tokens |
| R2 | Engine and correctness (the Phase 2 template) | ✅ Done (PR #28; Amplify job 57) | Details below |
| R3 | Scoring audit and recalibration | 🔄 In review | Engine and knowledge-base fixes below; lead decisions logged |
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

## R3: scoring audit and recalibration

Resilience IQ is now in the automated audit (`npm run audit:engines`, `packages/engine-core/audit/adapters.ts`). The adapter models a completed assessment: every executive question is answered, and each advisory question is answered with probability 0.8.

### Fixed: the engine said something false

| # | Finding | Fix |
|---|---|---|
| 1 | **AF-DR-04 was read backwards.** "Does recovery depend on services that fail with production?" "No" (independent) was penalised; "Yes" was not | "Yes", "Partially" or "Unknown" raises a recovery-production correlation gap (G-04). The decision tree's BR-A01 is corrected the same way |
| 2 | **AF-CL-01 was read backwards.** Separating identity or cloud-provider failure domains added concentration risk | Only "None" raises concentration risk |
| 3 | **AF-CY-03 (isolated identity recovery path) raised an "unrecoverable data" gap** | It raises the identity recovery gap (G-06) with control CYBER-02 (BR-A03 too) |
| 4 | **Some questions were never read:** AF-CY-01 (production credentials can destroy backups), AF-CY-02, AF-DR-01/02 "Not proven" and AF-GV-01/02 | Each now raises its gap |
| 5 | **AF-OP-01 to AF-OP-03 raised the wrong gaps** (people continuity, crisis management) | They raise recovery capability, concentration and recovery automation respectively |
| 6 | **AF-TP-04's options never matched** the engine's text | The engine uses the question bank's labels |
| 7 | **"Medium — documented but not fully tested" was labelled "tested" evidence** (a text match) | An explicit option-to-label table |
| 8 | **"Unknown" was treated as safer than "Potentially"** for ransomware exposure (no cyber gap, no controls, no gate) and for concentration | Unknown is treated like Potentially and like Moderate. BR-10 and BR-13 conditions include Unknown |
| 9 | **The cyber deep-dive questions ranked last** under the 8-question cap | BR-10 is flagged, and cyber questions rank just below recovery capability |
| 10 | **The roadmap ignored advisory cyber findings** | It includes the cyber recovery action when they are present |
| 11 | **A withheld result's decision log printed the withheld posture score** | It says the score is withheld |

### Recalibrated: default applied, BCP/DR lead to confirm

| # | Decision | Default applied |
|---|---|---|
| D1 | Should a critical gap cap the headline? Before, the rating and maturity ignored every gap: "Resilient" with no recoverable backup | **Critical exposure caps the rating and maturity.** High exposure: at most "Managed" / "Defined". Severe: at most "Fragile" / "Documented". The posture score itself is unchanged |
| D2 | Do maturity labels need evidence? "Tested" (level 4) and "Adaptive" (level 5) are claims about testing | They need a recovery test within 12 months (EX-07) **and** scenario-based testing (EX-16); otherwise maturity is at most "Defined" |
| D3 | Should strict recovery objectives (EX-02 to EX-04) raise the score? | No. Objectives are requirements, not capability: any defined value scores 85 and Unknown scores 20. They still drive the strategy |
| D4 | Should scope inputs (EX-01 critical services, EX-18 environments) be scored? They scored a constant 70 / 80 | Not scored. They still drive criticality, the strategy and the technology mapping |
| D5 | Governance (EX-15) sat in the "GOV" domain, which has weight 0 | Moved to BCP, where it is scored |
| D6 | Correlated recovery (G-04) penalty | The same flat −8 that the inverted reading took, plus DR −12 / INFRA −5 adjustments |

### Before and after (800 random completed assessments, golden outputs)

| Measure | Before | After |
|---|---|---|
| Dead questions | 21 | 18. EX-15, AF-DR-01/02, AF-CY-01/02 and AF-GV-01/02 now count. EX-03/04 are intentionally unscored (D3). AF-CL-04 and AF-TS-02 still look dead because other answers usually set the same "low test evidence" flag first |
| Largest single answer (posture) | EX-20 evidence claim: 9 points | EX-12 single points of failure: 12 points |
| Withheld by the advisory gate | 441 | 537. "Unknown" ransomware exposure now triggers the gate |
| Bank sample (golden) | 85 "Resilient", "Tested", High exposure | 86 "Managed", "Defined" |
| SaaS sample (golden) | 86 "Resilient", "Tested" | 87 "Managed", "Defined" |
| Recommended strategy, every sample | — | Unchanged |

### Still open for the lead (not changed)

1. **Advisory gate scope:** the gate requires every branch-added question; only the gate-relevant DR/CY questions could be required instead. Leaving advisory answers blank also avoids their penalties: the mean posture is +6 when 30% are blank.
2. **Double counting:** an answer feeds both its question score and a flat penalty (EX-09, EX-12, EX-19 and others). "Immutable but restore not proven" is reported as G-03 "Unrecoverable Data" (critical).
3. **Strategy selection:**
   - Near-zero RPO with a relaxed RTO selects DR-05 Active-Active.
   - Ties are broken by candidate order.
   - `recommendation-model.json` and `decision-matrix.json` are not used.
   - BR-01 (`critical_service_identified`) is unimplemented, so the BIA questions are never added.
4. **Unanswered domains count as 50** inside the engine. Blanks block the result, so this is not shown.
5. **Rewriting the older `evaluate.test.ts` fixtures** on real option labels.
6. **R5 content:**
   - multi-cloud estates see one provider's mappings;
   - CYBER-01 maps to replication services, which are not an isolated clean room;
   - GCP lists Terraform;
   - framework links;
   - all scoring constants need a source or an "LTM heuristic" label.

## Decisions taken (product owner)

| Decision | Applied |
|---|---|
| The dev environment shares the production reports bucket and user pool | Yes. Only `LTM_ALLOWED_ORIGINS` and `LTM_APP_BASE_URL` are set on the dev branch |
