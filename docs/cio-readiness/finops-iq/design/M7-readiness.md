# FinOps IQ M7: production-readiness review

Execution phase M7 (PLAN F12, expanded). Status at 22 Oct 2026, updated 23 Oct 2026. Branch `finops-iq-merge`, build after 625e4d9 (engine 3.6.1 after the M7 fixes; value model 1.2.0, playbook 1.0.0); now live on main at d83fd18 (engine 3.6.3, playbook 1.1.0). Prepared by the build; the owner decides.

**Status at 23 Oct 2026: every gate passes.** The owner ran a full assessment in production and approved the result and the report. Open before the first external client only: A1 (transfer instrument, deferred to the move to LTM's environment), A2 (trademark search), a lawyer's read, and the reports bucket expiry rule (deferred to the move to LTM's environment).

**Gate M7:** functional, legal, technical and security, UI, report, PDF and presentability each Pass with evidence; CIO challenge at least 9 of 10; live smoke test.

| Area | Result | Evidence |
|---|---|---|
| Functional | **Pass** | Section 1 |
| Legal | **Pass for internal use**; three owner actions before external use | Section 2 |
| Technical and security | **Pass** | Section 3 |
| UI and accessibility | **Pass** after fixes | Section 4 |
| Report, PDF and presentability | **Pass**: D2 decided by the owner (keep 55%); backlog D8 to D21 fixed (engine 3.6.2); Governance and Reporting platform entries added (playbook 1.1.0) | Section 5 |
| CIO challenge (at least 9 of 10) | **Pass: 10 of 10** | `M7-cio-challenge.md` |
| Live smoke test | **Pass** (22 and 23 Oct 2026, builds 125 to 127) | Section 6 |

---

## 1. Functional

- Unit and integration: 677 tests pass (`npm test`), including the M7 regression tests (D1, D3, D5, D6 and a PDF layout check for D7), the engine audit invariants, reference-scenario profiles, golden outputs, report trace checks (every number in the report traces to the engine) and the handler specs for save, resume, complete, archive, delete and retention.
- Browser: 81 end-to-end tests pass (`npx playwright test`), 10 of them for FinOps IQ. They cover every question answered in both modes; sign-in, save, resume, complete and report download; client view; retention and deletion; the attribution links; accessibility and keyboard use.
- Backend synth check passes: 15 templates, 21 functions, 2 HTTP APIs; time to live on `expiresAt`; one-year log retention on the three FinOps IQ functions.
- Claims register and repository checks pass.

## 2. Legal

From `M6-data-protection.md` (review register C1–C9, all applied or routed):
- Data notice, disclaimer, CC BY 4.0 attribution with links, SOW "subject to contract", retention and deletion: in place and tested.
- Owner actions before the first external client: A1 transfer mechanism confirmed by LTM's privacy office; A2 FINOPS trademark search; A3 approval of the notice and disclaimer wording. A qualified lawyer's sign-off is recommended at the same point.

## 3. Technical and security

Reviewed: the three FinOps IQ Lambda handlers, their routes in `amplify/backend.ts`, the shared authorization helpers, the page and `customHttp.yml`.

| Check | Result |
|---|---|
| Authentication | Every FinOps IQ route is on the Advisory API, whose default authorizer requires a Cognito ID token (audience = the portal client). Sign-up is limited by the pre-sign-up allowlist trigger. The handlers also reject a request with no identity claims |
| Authorization | A record belongs to its respondent; only the respondent or a Cognito `Admin` may read, report on, change, archive or delete it. Save cannot take over another user's record (checked against the stored owner, not the browser's claim). The list returns only the caller's records, as summaries |
| Server-side trust | Results are computed on the server at completion, never accepted from the browser; completed records are immutable; client view is filtered on the server (`clientView`) |
| Input limits | Snapshot validated (`parseSnapshot`): IDs, client name, sector, notes (20,000 characters) and request size (256 KB) bounded |
| Output safety | Page builds the DOM with text nodes only (no `innerHTML`, no inline scripts); report file names are sanitised; the backlog CSV guards against formula injection; reports are sent `Cache-Control: no-store` |
| Errors and logs | Errors return a generic message; logs carry the request ID and the error message, never request or response bodies; logs kept one year |
| Throttling | Stage-level rate and burst limits on the Advisory API |
| Dependencies | `npm audit --omit=dev`: 0 vulnerabilities (22 Oct 2026) |
| Retention | Time to live on `expiresAt`; expired records treated as deleted until removed |

Low-risk notes, no change made:
- **Existence signal:** a request for someone else's assessment returns 403, while a missing one returns 404. Assessment IDs are random UUIDs, so this reveals nothing practical.
- **Expired ID reuse:** saving a new assessment under the ID of an expired record that DynamoDB has not yet removed fails with a generic error. The page generates a fresh ID for every new assessment, so this cannot happen in normal use.
- **Platform CSP:** the site-wide policy in `customHttp.yml` still allows `'unsafe-inline'` and the "bring your own key" AI hosts for other pages (platform phases 4 and 5). The FinOps IQ page needs neither; tightening is a platform item.

## 4. UI and accessibility

- **Automated WCAG 2.2 AA scan** (axe-core, tags A and AA for WCAG 2.0, 2.1 and 2.2) on every screen: start, estate (empty and filled), every question step, results in consultant and client view, the assessment list and the delete confirmation. Now in the end-to-end suite with no exceptions allowed.
- **Keyboard test:** start, answer, open a step, and delete with the keyboard alone, checking tab order and that focus is visible at every stop.
- **Defects found and fixed:**
  - The primary red (#E5412F) gave 4.09:1 with white button text, below the 4.5:1 minimum (WCAG 1.4.3); the stylesheet comment claimed 4.6:1. Now #D33826: 4.8:1 on white, 4.5:1 on the selected-option tint. The PDF accent uses the same red.
  - The focus ring was a 45% transparent shadow, about 1.9:1 against white (below the 3:1 of WCAG 1.4.11), and disappears in Windows forced-colours mode. Now a solid 3px outline.
  - After Delete, keyboard focus fell to the page body (WCAG 2.4.3). Focus now moves to the confirm button, back to Delete on Cancel, and to a "deleted" announcement after the list reloads.
- No horizontal scroll at 360px (existing test); every control has an accessible name (existing test).
- **Not covered by automation:** a screen-reader pass (VoiceOver or NVDA) by a person. **Not required: the owner dropped it on 27 Oct 2026**, relying on the automated checks below; the structure (labelled fieldsets, live status regions, headings) is in place.
- **Screen-reader preparation (23 Oct 2026):** an automated read of the accessibility tree and live announcements on every screen found and fixed five issues (working screen read in full at each step, save status announced after every answer, focus lost after start and completion, skipped heading level on the results, generic heatmap name). The person-run pass follows `screen-reader-checklist.md` (18 checks, about 15 minutes).

## 5. Report, PDF and presentability

The CIO challenge re-run (`M7-cio-challenge.md`, finops-cost-lead, build 625e4d9) scored **10 of 10**. It found defects that do not change the score but would cost credibility with a CFO. Fixed in this phase:

| # | Defect | Fix | Test |
|---|---|---|---|
| D1 (High) | The FinOps owner contradicted itself: "no team cost, as you have an owner" beside "Appoint an accountable FinOps owner"; and the reverse | One rule, whether DECISION-01 is raised, drives the roadmap activity ("Give the accountable FinOps owner a written mandate…" when one exists), the team-cost line ("no separate FinOps team cost…; the work to bring the practice to its target is in the capability-building effort") and the decision finding, which now says when the other practice answers meet the target. The Practice Operations consequence no longer asserts that there is no owner | `finops-iq-v3-report.test.ts` D1 |
| D3 (High) | Spot advised against in the value section but scheduled in the roadmap | Roadmap items tagged with a lever appear only while the lever is in scope and not advised against | D3 |
| D5 (Medium) | "through SaaS and licensing SaaS and licensing" | Playbook text reworded to "through the SaaS and licensing lever (LEV-09)" (the client edition drops the ID) | D5 |
| D6 (Medium) | Raw keys ("data_platform", "data_centre", "public_cloud:aws") in the client edition, the backlog and the page | Platforms and scopes shown by name in the report, the backlog and the page, from one label map | D6; journey test |
| D7 (Medium) | Headings and table headers left at the foot of a page (15 cases) | Tables keep their header with the first row; a subheading before a table becomes the table's first header row (and repeats on continued pages); other headings move to the next page when nothing follows them | D7 renders three PDFs and checks every page; all 18 sample PDFs clean |

**D2 decided by the owner (22 Oct 2026): keep 55%.** Background: when the client does not state its Google Cloud instrument, the engine uses 55% (resource-based CUDs), while the rule "use the lower published maximum" and the advice "prefer flexible instruments first" point to 46% (flexible CUDs, CLM-FIN-066). Moving to 46% lowers Google-heavy value figures (RS5 net per year about GBP 378k to 334k; RS6 commitment value EUR 465k to 389k) and changes approved golden outputs, The owner kept 55%.

**D4 (High):** the owner approved the wording (A3, 22 Oct 2026) and the "Review draft" and "draft wording" markers are removed. The transfer instrument (A1) is still to be named by LTM's privacy office.

**Backlog (Medium and Low): fixed on 22 Oct 2026, see the status table in M7-cio-challenge.md.** Original list: D8 say which findings have no platform entry yet; D9 outcome wording for milestones; D10 explain that value comes from lever actions before the target level is reached; D11 technical-execution text (approach once per control, per-platform wording, lever labels, collapse not-applicable rows); D12 consultant appendix sources (private link, blog source); D13 market-data caveats in client language; D14 "See Cost IQ" in the client edition; D15–D21 wording and labelling items. Details and suggested fixes are in `M7-cio-challenge.md`.

## 6. Live smoke test

**Pass, 22 and 23 Oct 2026.** Production builds 125 (661bf5f), 126 (af3502a) and 127 (d83fd18) succeeded on main.
- The owner ran full executive and workshop assessments in production: answer, save, resume, complete, the results dashboard and the PDF download. Owner feedback (11 items) was fixed in 661bf5f and confirmed by the owner; the owner approved the final assessment and report on 23 Oct 2026.
- The report PDF failed in production at first ("Internal Error": the PDF library read a font data file from disk that the function bundle did not include). Fixed in 661bf5f; `npm run check:backend` now starts every function bundle from cold, so the same kind of fault fails the build.
- AWS, checked 23 Oct 2026: the `FinOpsIqAssessment` table has time to live on `expiresAt` (enabled); the three FinOps IQ functions write to their own log groups, each kept 365 days. An older default log group of the scoring function (`/aws/lambda/…evaluatefinopsiqlambda…`, last written 6 Oct 2026, before the dedicated groups) has no retention set; it can be given a retention period or deleted.

The script as planned: sign in; run an executive and a workshop assessment; save, resume, complete; download the client and consultant PDFs and the backlog CSV; delete one; confirm in AWS that the `FinOpsIqAssessment` table has time to live on `expiresAt` and the three log groups keep one year.
