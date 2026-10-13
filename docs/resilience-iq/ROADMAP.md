# Resilience IQ: next phases (R7–R12)

**Date:** 13 Oct 2026  **Starting point:** R0–R6 are released to production and the [validation report](VALIDATION.md) approves Resilience IQ for consultant-led use.  **Goal:** approval for unattended client self-service, with scores we can defend in front of a CIO.

**How each phase lands:** as in [PLAN.md](PLAN.md). A PR into `resilience-iq-dev` with full CI and a green dev Amplify build. Any change to scoring goes through the golden-file diff and is reviewed by the BCP/DR practice lead. Phases merge to `main` in releases, not one at a time.

## Summary

| # | Phase | Depends on | Who | Exit gate |
|---|---|---|---|---|
| R7 | Release close-out (engineering item done; owner items open) | — | Owner, engineering | Live journey checked on production; owner actions closed; stale handover docs retired |
| R8 | Engine hygiene ✅ Done | — | Engineering | No silent defaults, deterministic strategy, every knowledge file used or removed; golden outputs unchanged or each diff explained |
| R9 | Practice-lead review and recalibration | R8 | Practice lead, engineering | Lead signs off the open model decisions and the golden outputs |
| R10 | Evidence workflow, BIA and platform playbook (part 1 done: evidence storage, ownership, page) | R8 (R9 for scoring effects) | Engineering, practice lead | Evidence can be requested, uploaded and validated, and changes confidence; BR-01 implemented; technology options served from the shared platform playbook |
| R11 | Back-testing and consultant pilot | R9, R10 | Practice lead, consultants | Back-test report published; pilot feedback closed |
| R12 | Operate and client self-service | R11 | Engineering, owner | Monitoring live; dev separated from production; self-service approved |

R7 and R8 can run in parallel. R10's engineering can start alongside R9, but its scoring effects wait for R9's decisions.

---

## R7: Release close-out

**Objective:** finish what R6 left open and stop old documents from misleading the next person.

| # | Item | Owner |
|---|---|---|
| 1 | **Live journey on production:** sign in, complete a short assessment, save, reopen from history, view the report. The validation environment cannot reach the Amplify domain, so this is the one gate not checked live | Owner |
| 2 | Branch protection on `main` | Owner |
| 3 | Cognito `Admin` group created, then `LTM_SUPER_ADMIN_EMAILS=none` | Owner |
| 4 | Move remaining users off the sandbox user pool (`ap-south-1_91amN2bz4`), then delete the sandbox stack | Owner |
| 5 | **Retire `RESILIENCE-IQ-HANDOVER.md` and the root `AGENT.md`.** Both still describe the 11 Oct deployment failures and a Git bisection plan. R0 found the cause (invalid YAML in `amplify.yml`), and dev and production have deployed cleanly since. Replace them with a short pointer to this roadmap, PLAN.md and VALIDATION.md | Engineering |

**Gate R7:** item 1 passes, or its failures become R7 fixes; items 2–5 done.

**Status (13 Oct 2026):** item 5 done. `RESILIENCE-IQ-HANDOVER.md` is removed (it stays in Git history) and `AGENT.md` is a short current guide pointing to this roadmap, PLAN.md and VALIDATION.md. Items 1–4 are owner actions and still open.

---

## R8: Engine hygiene

**Objective:** remove the remaining engine behaviour that is silent, accidental or misleading. None of it needs a practice-lead decision.

| # | Item | Today | Change |
|---|---|---|---|
| 1 | **Unanswered domains** (open item 4) | `runtime.ts` scores a domain with no answers as 50. Blanks block the result, so nobody sees it, but it is the "missing data flatters the result" pattern the audit exists to catch | A domain with no answers is reported as unassessed and cannot raise the score. Invariant test added |
| 2 | **Strategy ties** (part of open item 3) | Ties go to whichever candidate is listed first | An explicit tie-break rule (for example, the lower-cost pattern that meets the objectives), recorded in the decision log, with a test |
| 3 | **Unused knowledge files** (part of open item 3) | `recommendation-model.json` is loaded but never read; `decision-matrix.json` is not loaded at all | Each one is either wired into the engine or removed, so the knowledge base shows only what drives behaviour |
| 4 | **Old fixtures** (open item 5) | `evaluate.test.ts` still uses retired option labels | Rewritten with the question bank's labels, passing the request contract |
| 5 | **Masked questions** | AF-CL-04 and AF-TS-02 look dead in the audit because other answers usually set the same "low test evidence" flag first | Confirm with a targeted audit case; if they really cannot change any result, list them for R9 |
| 6 | **Evidence endpoint** | `POST /api/resilience-iq/evidence` validates the status change and then returns 501 `evidence_persistence_not_configured` | No change to behaviour yet. Document it as a stub until R10, so nobody mistakes it for a working feature |

**Gate R8:**
- `npm run audit:engines` shows no regression against the R3 numbers.
- The golden outputs are unchanged, or each diff is explained in the PR and goes into the R9 review pack.

**Result (13 Oct 2026):**

| # | Outcome |
|---|---|
| 1 | A domain with no scored answers scores 0, is listed in a new `unassessedDomains` field, and is named in the decision log. Golden diff: only the "empty" sample changes, from 45 in every domain to 0 |
| 2 | Equal scores are ranked by lower cost, then lower complexity, then id; the decision log says when a tie decided the recommendation. Golden diff: equally scored patterns are reordered in `patternRanking` for five samples. No recommended strategy, alternative or score changes |
| 3 | `recommendation-model.json`, `decision-matrix.json`, `assessment-model.json`, `frameworks.json` and `blueprints.json` were not read by the engine. They move to `resilience-iq/design/` as design references for R9. `knowledge/` now holds only files that drive behaviour |
| 4 | Every fixture in `evaluate.test.ts` now goes through the request contract and uses current labels (EX-05 as the dependency grid). All of the file's earlier assertions still hold |
| 5 | Not dead. Against a strong client, a weak AF-CL-04 or AF-TS-02 answer lowers the score (80 → 73) and adds failover and restore test evidence requests. The random audit misses this because other answers usually raise the same "low test evidence" flag first. A test records it. Nothing to list for R9 |
| 6 | The evidence handler is marked in code as a stub until R10, including the missing ownership check |

---

## R9: Practice-lead review and recalibration

**Objective:** get the BCP/DR practice lead's decision on every open scoring question, then implement them. This is what blocks client self-service.

**Review pack (engineering prepares it):** the six golden archetypes, the 800-run audit, the R8 diffs, and one page per decision below with the current behaviour, a worked example and a recommended default.

| # | Decision | Recommended default |
|---|---|---|
| 1 | **Advisory blanks.** Leaving 30% of advisory questions blank raises mean posture by about 6 points | A blank gate-relevant advisory answer counts as "Unknown" (risk). The gate requires only the gate-relevant DR and cyber questions, not every question the branch adds |
| 2 | **Double counting.** EX-09, EX-12 and EX-19 feed both their question score and a flat penalty | Keep one effect per answer, either the question score or the penalty, not both |
| 3 | **Severity of "immutable but restore not proven"** | Report as a high "Unproven Recovery" gap rather than critical "Unrecoverable Data" |
| 4 | **Near-zero RPO with relaxed RTO** selects Active-Active | Select by the stricter of the two objectives against cost, so near-zero RPO alone points to continuous replication with warm standby, not Active-Active |
| 5 | **Confirm R3 defaults D1–D6** (critical exposure caps, maturity needs tested evidence, objectives not scored, scope inputs not scored, governance moved to BCP, the G-04 penalty) | Keep as applied |
| 6 | **Masked questions** from R8 item 5 | Remove, reword or re-weight |

**Engineering:** implement each decision with a regression test, re-run the audit and present the golden-file diff for sign-off.

**Status (13 Oct 2026):** review pack ready: [R9_REVIEW_PACK.md](R9_REVIEW_PACK.md), with worked examples from the engine. It adds decision 6 (moderate concentration raising a critical gap) and refines decision 4: the strategy is not only Active-Active for near-zero RPO with a relaxed RTO, it is non-monotonic (RTO 1–4 hours gives Warm Standby, but 4–24 hours goes back to Active-Active). Waiting on the practice lead.

**Gate R9:**
- Written lead sign-off on decisions 1–6 and on the new golden outputs.
- Validation gate 8 ("missing answers never flatter the result") moves from Partial to Pass.

---

## R10: Evidence workflow, BIA and platform playbook

**Objective:** make the assessment rest on evidence, not only self-reported answers, and add the business-impact questions the decision tree already describes.

| # | Item | Detail |
|---|---|---|
| 1 | **Evidence storage** | A data model and upload to the reports bucket, under a per-assessment prefix. The endpoint's 501 stub becomes a real save |
| 2 | **Ownership on evidence** | The evidence Lambda applies the same ownership checks as the assessment Lambda before reading or changing anything. Today it takes `assessmentId` from the body without checking who owns it; that is harmless only because it saves nothing |
| 3 | **Lifecycle in the page** | Request → provided → validated or rejected, using the existing `evidence-lifecycle.ts` transitions. Only a consultant can validate |
| 4 | **Evidence changes the result** | Validated evidence raises evidence confidence for the gaps it covers. Rejected or missing evidence keeps them at self-reported. The report shows which findings are evidenced |
| 5 | **BR-01 BIA questions** | Implement `critical_service_identified`, so naming critical services adds the BIA questions to the advisory branch |
| 6 | **Completed assessments stay immutable** | Evidence added after completion is attached to a new version of the assessment, not written into the completed one |
| 7 | **Shared platform playbook** | `implementation-mappings.json` moves into the shared platform playbook ([IMPROVEMENT_PLAN.md](../IMPROVEMENT_PLAN.md) §5.1), and Resilience IQ reads its technology options from there. The move itself must not change any output. After it, each option gains a verification step, an owner role and a review date, and the report's options become a "Technical action plan" per platform in scope |

**Gate R10:**
- Handler and browser tests cover upload, ownership (including another user's assessment), every lifecycle transition, and the effect on confidence.
- `check:backend` asserts that the evidence route keeps its authorizer.
- Golden archetypes include an evidenced case; the lead reviews its diff.
- Golden outputs are unchanged by the move to the shared playbook.

**Status (13 Oct 2026): engineering part 1 done.**

| # | Status |
|---|---|
| 1 | **Done, as references.** Evidence is recorded as a location or reference (document, link or system record) on the existing `ResilienceEvidence` model, not as an uploaded file. File upload to the reports bucket is still to do |
| 2 | **Done.** The evidence API checks that the caller is the assessment's respondent or an Admin before reading or changing anything. Item details come from the server's evidence register, never from the browser. The stored status is authoritative, and a stale `fromStatus` is reported. Archived assessments are refused. A GET lists an assessment's evidence. The database client is shared with the assessment API (`amplify/functions/_shared/resilience-data.ts`) |
| 3 | **Done in the report.** The report's Evidence Traceability panel shows live statuses and lets the consultant mark items provided, validated, rejected or requested again. Validation is open to the respondent or an Admin: the platform's Consultant role is held in the app session, not in a Cognito claim, so the server cannot check it yet. This is acceptable for consultant-led use; client self-service (R12) needs a server-checkable role |
| 4 | **Not started; waits on R9.** Validated evidence does not change confidence or the score yet; the report says so |
| 5 | **Not started; waits on R9 decision 1.** BR-01 adds advisory questions, and how blank advisory answers count is decision 1 |
| 6 | **Done.** Evidence is stored beside the assessment; a completed assessment's stored result is never rewritten |
| 7 | **Not started; waits on Phase 5.1 step 1.** The catalogue format is to be agreed with the practice leads before the mappings move |

The evidence API tests had never run in CI. They are now in `test:resilience-all` (run by the Amplify build) and in the Resilience IQ workflow.

---

## R11: Back-testing and consultant pilot

**Objective:** find out whether the results match what experienced consultants concluded, before clients use it unattended.

| # | Item | Detail |
|---|---|---|
| 1 | **Back-test** | Run 3–5 past anonymised BCP/DR engagements through the engine. Compare rating, top gaps and recommended strategy with what was actually concluded. Explain or fix each disagreement |
| 2 | **Consultant pilot** | 2–3 live engagements, consultant-led. Record where consultants overrode or reworded the output, and why |
| 3 | **Method note** | Publish the back-test result internally. The report keeps "LTM heuristic, not a benchmark" until there is enough engagement data to state an n and a date |
| 4 | **Azure immutable vault** | Confirm regional availability from first-party documentation, or keep the "confirm per engagement" note |

**Gate R11:**
- Back-test report published.
- No unexplained disagreement on rating or strategy.
- Pilot feedback triaged, with each item fixed or deliberately accepted.

---

## R12: Operate and client self-service

**Objective:** run Resilience IQ as a monitored service and decide whether to open it to clients.

| # | Item | Detail |
|---|---|---|
| 1 | **Monitoring** | CloudWatch alarms on Resilience IQ Lambda errors, 5xx rates and latency; a dashboard; alerts to the owner |
| 2 | **Separate dev from production** | Dev gets its own user pool and reports bucket. This reverses the earlier product-owner decision, so it needs the owner's agreement |
| 3 | **Scoring-model versions** | Each stored assessment records the engine and knowledge versions it was scored with (`version.ts`). Reopening an old report shows those versions and does not silently re-score it |
| 4 | **Client mode** | Hide scoring internals and consultant notes, show plain-language guidance for "Unknown", and apply the report disclaimer |
| 5 | **Self-service decision** | Re-run the validation report against R7–R11, then owner and practice-lead approval |

**Gate R12:**
- Alarms tested by forcing an error on dev.
- Validation report re-issued with every gate passing.
- Self-service approved in writing, or the reasons recorded.

---

## Out of scope here

The other six accelerators follow [docs/IMPROVEMENT_PLAN.md](../IMPROVEMENT_PLAN.md), where Phase 4 (fact-check and the claims register) is next. Resilience IQ's own claims were checked in R5. They join the claims register when it is built, so that they get review dates too.
