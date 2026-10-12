# Resilience IQ: validation report

**Date:** 12 Oct 2026  **Scope:** Resilience IQ as released to production by PR #32 (phases R0–R5).  **Method:** code review, automated tests, a randomised scoring audit, checks against the live AWS API (dev and production), and web-search verification of content claims. The Amplify-hosted site cannot be reached from the validation environment, so the page itself was validated through the browser tests rather than by hand on the live URL.

## Verdict

**Conditionally approved for consultant-led use.** Resilience IQ is secure, builds and deploys reliably, scores consistently, and no longer says anything we found to be false. It is fit for an LTM consultant to run with a client and present the report, with the consultant reviewing the output.

**Not yet approved for unattended client self-service or for quoting scores as a benchmark**, until the BCP/DR practice lead closes the items in "Open for the practice lead" below. These are judgement calls about the scoring model, not defects.

## Gates

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Builds and deploys from a clean commit | ✅ Pass | Dev Amplify jobs 53–60 succeeded; the build runs all Resilience IQ tests before the backend deploys. Production: see "Production release" |
| 2 | Only signed-in platform users can call the API | ✅ Pass | Every Resilience IQ route except the CORS preflight uses the Cognito JWT authorizer. Enforced by `check:backend` on every PR; checked live (401 without a token) on dev and production |
| 3 | Users cannot read, overwrite or forge each other's work | ✅ Pass | Ownership checks on read and save; the server computes the stored result; archives are immutable. Covered by the persistence handler tests, which fail against the previous handler |
| 4 | Bad input is rejected clearly | ✅ Pass | One request contract shared by the page, both Lambdas and the tests; 400 lists every problem. Size limits on keys and text |
| 5 | Errors do not leak internals | ✅ Pass | Generic 500 messages, details logged. Tested |
| 6 | The page sends exactly what the engine reads | ✅ Pass | Browser journey test runs the real contract and engine behind a fake API and compares the answers sent with the plan |
| 7 | Scores are stable and explainable | ✅ Pass | Golden outputs for six client archetypes; 500-run invariant tests (scores in range, rating never better than exposure allows, incomplete results withheld); decision log on every result |
| 8 | Missing answers never flatter the result | ⚠️ Partial | Executive "Unknown" answers now count as risk. Leaving *advisory* questions blank still avoids their penalties (mean +6 posture at 30% blank). Open item 1 |
| 9 | Ratings match the evidence | ✅ Pass | Rating and maturity are capped by critical exposure; maturity 4–5 needs a recovery test within 12 months. Golden archetypes and invariant tests confirm the caps. None of the 800 random audit assessments reached "Resilient" or "Adaptive", which is expected because random answers rarely combine low exposure with tested evidence |
| 10 | Content is accurate and vendor-neutral | ✅ Pass, with SME note | Mappings, citations and claims checked against sources (R5). Every selected cloud gets options. Azure immutable-vault regional availability to be confirmed per engagement |
| 11 | Claims about the method are honest | ✅ Pass | Scoring is labelled as LTM heuristics reviewed by the BCP/DR practice, not a benchmark, in the knowledge base and on the report |
| 12 | Existing platform unaffected | ✅ Pass | Full CI (typecheck, all engine tests, repository guards, backend synthesis, 63 browser tests, secret scan) green on every phase and on the release. Other accelerators' routes and the Advisory API unchanged |

## Scoring audit (800 random completed assessments)

| Measure | Before R3 | Now |
|---|---|---|
| Questions with no effect on any headline | 21 | 18 (3 intentional, 2 masked by overlapping flags) |
| Biggest single-answer swing (posture) | 9 points | 12 points (single points of failure) |
| Results withheld as incomplete | 441 | 537 |
| Rating bands reached | — | Critical Exposure 12.6%, Fragile 19.9%, Managed 0.4%; Resilient and Adaptive need tested evidence |

Full output: `docs/phase3/AUTOMATED_AUDIT.md`.

## Open for the practice lead

These do not block consultant-led use; each is a decision about the model.

1. **Advisory gate and blanks.** Require only the gate-relevant DR/cyber questions, and decide whether blank advisory answers should count as risk.
2. **Double counting.** Some answers feed both a question score and a flat penalty (EX-09, EX-12, EX-19). "Immutable but restore not proven" is reported as critical "Unrecoverable Data".
3. **Strategy selection.** Near-zero RPO with relaxed RTO selects Active-Active; ties break by list order; `recommendation-model.json` and `decision-matrix.json` are unused; BR-01 (critical-service BIA questions) is not implemented.
4. **Unanswered domains default to 50** inside the engine (not visible today because blanks block the result).
5. **Older engine-test fixtures** still use a few retired option labels; the newer suites cover the behaviour.
6. **Per-engagement SME review** of implementation mappings, especially Azure immutable vault availability.

## Known limits (accepted)

- Amplify Gen 2 grants a function data access to the whole schema; the assessment Lambda only touches `ResilienceAssessment`.
- The dev environment shares the production user pool and reports bucket (product-owner decision).

## Owner actions outside this accelerator

- Branch protection on `main`.
- Cognito `Admin` group, then set `LTM_SUPER_ADMIN_EMAILS=none`.
- Move remaining users off the sandbox user pool.

## Production release

Merged to `main` in PR #32 (commit `aa3cef2`) after 11 green checks. Amplify production job 104: build, deploy and verify succeeded.

Smoke test against the production API (`ltm-accelerators-api`, 12 Oct 2026):

| Check | Before release | After release |
|---|---|---|
| `POST /api/evaluate/resilience-iq` without a token | Open (no authorizer) | 401 |
| `POST /api/resilience-iq/evidence` without a token | Open (no authorizer) | 401 |
| `GET` / `POST /api/resilience-iq/assessment` without a token | Route absent | 401 |
| CORS preflight from the production site | — | 200, origin echoed, `Authorization` allowed |
| CORS preflight from an unlisted origin | — | No `Access-Control-Allow-Origin` header |
| Cost IQ route (not part of this release) | Open | Unchanged |
| `ResilienceAssessment` table | — | Present |

Not checked from here: the signed-in journey on the live site, because the validation environment cannot reach the Amplify-hosted domain. **One manual check remains for the owner:** sign in on production, complete a short Resilience IQ assessment, save it, reopen it from history and view the report.
