# Cost IQ CQ11: re-score against the 13-area scorecard

**Date:** 5 Nov 2026. **Reviewer:** finops-cost-lead (AI practice-lead agent). I advise; I do not sign off. The product owner decides. Counsel reviews regulatory and data-protection wording before external use.
**Build reviewed:** branch `platform-p3a-session-progress`, commit c543b18, Cost IQ 6.6.0, release label `COSTIQ-0.7.8-DRAFT` (unchanged; the consultant cover prints it, the client cover does not).
**Baseline:** `VALIDATION.md` (CQ0, 3 Nov 2026): 3 Partial (areas 1, 2, 4) and 10 Fail. Scale and area list: `FRAMEWORK.md` lines 35-51.
**Gate (PLAN.md, CQ11):** CIO ready when all 13 areas pass, or the owner accepts any Partial in writing.

## Result

**1 Pass, 12 Partial, 0 Fail.** Cost IQ is **not** CIO ready under the gate as written. Ten areas moved from Fail to Partial or Pass. No area got worse.

## Evidence I ran myself (5 Nov 2026)

- `npx vitest run`: **50 files, 1,286 tests, all passed** (17.7 s).
- `npm run typecheck` (= `tsc --noEmit -p tsconfig.typecheck.json`, the CI command, `package.json:17`, `ci.yml:32`): **0 errors**. `npx tsc --noEmit -p .` (the root `tsconfig.json`, as you asked): **10 errors**, all in `amplify/functions/evaluate-cost-iq/persistence-handler.ts` (3, missing declaration files for three `.cjs` modules) and its test (7, `statusCode` on `APIGatewayProxyResultV2`). CI does not use that config; I did not check whether they pre-date Cost IQ work.
- `npm run audit:engines`: runs, but `packages/engine-core/audit/adapters.ts` has **no Cost IQ entry** (searched), so the engine audit does not cover Cost IQ.
- Re-rendered with a throwaway script (scratchpad, not in the repo) and read through the PDF text layer: mixed estate client (29 pp.) and consultant (38 pp.), cloud-heavy client (28 pp.), on-premises-heavy client (14 pp.). Page images not viewed.
- Read tests, not names: `cost-iq-bank.test.ts` (map order, Unknown lowest, footprint gating, completeness, 10-of-16 floor), `cost-iq-report.test.ts` (section list, notice text, traces, single figure), `cost-iq-non-cloud.test.ts` (reconciliation, refusals), amplify specs `cost-iq-security.spec.ts`, `cost-iq-report/handler.spec.ts`; `tests/e2e/cost-iq.spec.ts` exists (not run by me).

## Scorecard

| # | Area | CQ0 | Now | Evidence |
|---|---|---|---|---|
| 1 | Purpose and distinctness | Partial | **Partial** | Boundary with FinOps IQ settled and enforced: FIN-01 to 12 moved out, one cloud line, no second figure (`BOUNDARY.md:5`; `cost-iq-single-figure.test.ts`; report p. 4 "does not estimate it again"). Still not found: a written CIO decision, named buyer and edge over free alternatives (FinOps Foundation maturity, hyperscaler assessments). |
| 2 | Functionality | Partial | **Partial** | Full-flow browser test (start, save, resume, complete, report, delete, no console errors: PLAN CQ10) and 1,286 passing tests; the one-page-served check `served-cost-iq.test.ts`. Not verified in a real account: the Amplify data deploy for `leverEvidenceJson` and the narrative fields (PLAN CQ4 slice 2: "not verified here"). CI was green at `dbaf4ec`; I did not see CI for c543b18. |
| 3 | Questions and answers | Fail | **Partial** | `question-bases.json`: a basis for each of 99 questions (PLAN CQ3b slice 8: 32 framework, 2 standard, 65 LTM heuristic; 77 opened, 22 not). Unknown scored lowest and map order tested (`cost-iq-bank.test.ts` "keeps every score map in the order of the options"). 65% heuristic bases and 22 unopened sources keep it short of Pass; the page does not show a question's basis. |
| 4 | Depth | Partial | **Partial** | Default run 33-46 questions by estate, at least 10 of 16 dimensions scored (test "gives an executive run ... a score for at least 10 of 16"), footprint gates, M&A and geography follow-ups. No separate timed executive/workshop mode: PLAN CQ7 says none was built. |
| 5 | Scoring engine | Fail | **Partial** | Real tests: monotonic maps, Unknown lowest, inert-question list that only shrinks, completeness over shown questions, report recomputation. **Not met:** `audit:engines` does not include Cost IQ (CQ4 gate says it must); no approved golden outputs; minimum answers per dimension (S5) still open, so one answer can score a dimension (the report works around it for "where to look first" only); every dimension weighted equally (A-02). |
| 6 | CIO alignment | Fail | **Partial** | Summary leads with scores, a year-by-year value range, a decision ("name an owner ... within 30 days") and "Recommended first steps" with elapsed time (mixed p. 3-4). Open: the findings themselves end in "Needed before it is sized" not an action, owner and time frame (the roadmap does that per package); estates without cloud get a zero-money report (M10). |
| 7 | Output | Fail | **Partial** | Server-rendered client and consultant PDFs with every section the scorecard names (contents p. 2: summary, findings, roadmap, How LTM can help, technical execution, appendices A to D; consultant adds E draft SOW and F). Backlog CSV. Gap: the CSV is one row per finding with service names that differ from the report's (M11), not the platform-specific actions FRAMEWORK describes. |
| 8 | Sources | Fail | **Partial** | Sources table with URL and year in every report; Flexera 29% matches Flexera's 18 Mar 2026 release (checked 5 Nov, see CQ10-CIO-CHALLENGE.md). **Not met:** no Cost IQ rows in the claims register (`docs/claims-register/` has no Cost IQ file; CQ0 finding unchanged), so no CI review-date check for Cost IQ constants; weak sources M6 (ServiceNow community article, SAP 7.3 help set) still printed; the Year column mixes published and checked years. |
| 9 | Legal validity | Fail | **Partial** | One-source disclaimer and data notice (`notices.ts`), in both editions (`cost-iq-report.test.ts` "carries the disclaimer and the data notice"); owner approved 5 Nov; consistent with 24-month TTL (`backend.ts:119`), one-year logs (`backend.ts:317`). Open: counsel review ("before the first external client"), hosting is still a personal development account (PLAN CQ9), font-host sentence awaits owner confirmation, EU/UK transfer paperwork (S6) not seen by me. No regulatory content to verify. |
| 10 | AI scope and toggle | Fail | **Partial** | Shared Bedrock service, India profile, off at service and engagement, no browser AI, Gemini words guarded by a test, grounding check and 15-case offline eval, prompt and output log (PLAN CQ8). **Verified only by tests or synthesis:** the live Bedrock eval (`scripts/eval-cost-narrative.ts`) has not been run; the asynchronous worker, its IAM and timing are unconfirmed in a real account. |
| 11 | Technical execution | Fail | **Partial** | Ten platform-specific playbook entries with verification and sources (M365/Entra, Okta, Oracle, SAP, IBM, VMware, ServiceNow); I opened the Microsoft page and the steps match; the other sources I did not re-open. Platform coverage is narrow (cloud-provider steps stay in FinOps IQ by decision); application-level discovery is stated per package. |
| 12 | Commercial pull-through | Fail | **Pass** | Every finding has a row in "How LTM can help" with offering, type (advisory, implementation, transformation), what LTM does and does not do, outcome; per-package workstreams, owners, durations (heuristic, A-11), prerequisites, risks (mixed pp. 10-19); consultant-only draft SOW (Appendix E, "not a quote or an offer"). Language checked: no hype. Note: durations are unsupported planning ranges, honestly labelled. |
| 13 | Report defensibility | Fail | **Partial** | (a) traces: report check re-reads every traced number, tests pass; (b) 11 assumptions with value, basis, confidence, "if wrong"; (c) money as three cases with confidence beside each range, year-by-year (mixed p. 3: Year 1 GBP 790k, Year 2 and 3 GBP 2.49m, total GBP 5.78m), year-one rule stated, internal-effort-only costs; (d) lever capped at its base, totals reconcile (I recomputed), random-input test; the cloud line's own caps are FinOps IQ's; (f) executive summary with decision and first steps; (g) CIO challenge: Critical none, High none open after the re-run (`CQ10-CIO-CHALLENGE.md`), Mediums M6, M8 role check, M10, M11 open. Not Pass because of open Mediums and because the cloud line cannot be tested here (no spend base when FinOps IQ held none). |

## Remaining open items, ranked

**Blockers for "all 13 Pass"** (each needs work, or the owner's written acceptance):
1. **Area 5: Cost IQ is not in `audit:engines` and has no approved golden outputs.** The CQ4 gate says it must be. Fix: add an adapter in `packages/engine-core/audit/adapters.ts` and approve goldens for the reference clients; decide the minimum scored answers per dimension (S5).
2. **Area 8: no Cost IQ entries in the claims register.** Fix: register the Flexera cap, the question-basis claims, the playbook sources and the lever assumptions, with review dates, so CI can fail on overdue ones; replace or drop the ServiceNow community page and the SAP 7.3 help set (M6).
3. **Areas 9 and 10: unconfirmed outside tests.** Counsel review of the notice; the live Bedrock eval and the asynchronous worker in the LTM account; hosting statement update at the move.
4. **Area 1: write the edge.** One page: the CIO decision Cost IQ informs, the buyer, and the comparison with free alternatives.

**Mediums still open (from CQ10):** M6 weak sources and Year column; M8 role check for the consultant edition; M10 wording for estates with no cloud; M11 shared-trigger findings and CSV names. **Lows:** L2 UK spelling, L4 orphan headings (text layer only), L5 repeats, L6 page polish (raw status, `alert()`), L7 "(unassigned)" fallback and consultant email on the cover, L8.
**Other:** the root `tsconfig.json` type check shows 10 errors in the legacy `evaluate-cost-iq` persistence handler (CI uses the other config); question bases: 22 sources unopened; Mumbai-hosted personal development account.

## What the owner would have to accept in writing to move the label from DRAFT

I do not change the label; this is what a decision would rest on. The owner would be accepting:
1. Area 5 Partial: Cost IQ is outside `audit:engines`, no goldens, no minimum-answers rule (or the work done first).
2. Area 8 Partial: constants and sources are cited in the report and `question-bases.json` but not in the claims register, with two weak sources printed.
3. Areas 9 and 10 Partial: data notice and disclaimer not yet read by counsel; AI narrative, its worker and IAM, DynamoDB TTL deletion and the new data fields **verified only by tests or synthesis**, not in a real account; AI stays off by default until the live eval is run and the AI sentence re-approved.
4. Area 1, 2, 3, 4, 6, 7, 11, 13 Partials as listed above, including M8 (any user with access can download the consultant edition) and M10.
5. Duration and effort ranges are LTM heuristics with no delivery history (A-11), and the upper licence case equals 100% of the client's measured figure (A-08).
6. That the release label is a separate decision from these acceptances: the consultant edition still prints `COSTIQ-0.7.8-DRAFT`.

## What I could not verify

- Anything in a real AWS account: Bedrock narrative and live eval, the asynchronous worker and its permissions, DynamoDB TTL timing and backups against the 24-month notice, the Amplify data deploy for the new fields, IAM, API Gateway behaviour and load. Verified only by tests or synthesis (CI at `dbaf4ec`: type check, tests, guards, secret scan, browser tests, backend synthesis; not checked for c543b18).
- Page images (layout, page breaks, colours, charts); the Cost IQ page in a browser; the Playwright suite (not run by me; vitest was).
- Okta, Oracle, SAP, IBM, ServiceNow, GAO, TBM and ECB sources; 22 question bases flagged unopened in CQ3b.
- Why FinOps IQ holds no spend for the sampled quantified result.
- Whether non-LTM users can hold Cost IQ access (M8); counsel's view on the font-host disclosure.
- S6 transfer paperwork (SCCs, IDTA, transfer impact assessment, privacy notice).
