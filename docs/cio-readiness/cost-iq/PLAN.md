# Cost IQ: phased plan

**Date:** 3 Nov 2026  **Status:** proposed; the product owner approves each phase. `finops-cost-lead` advises and does not sign off.

**Starting point.** No validation report exists yet, so every statement about quality below is a hypothesis for CQ0 to confirm or reject. What is known from the repository:

| Fact | Where |
|---|---|
| Release `COSTIQ-0.7.8-DRAFT`, status `ENGINEERING_INTEGRATION_BASELINE`: 105 questions, 16 dimensions, 20 findings, 10 recommendations, FinOps overlay of 4 domains and 22 capabilities | `packages/engine-core/src/accelerators/cost-iq/canon/RELEASE_MANIFEST.json` |
| Methodology master 6.6.0, overlay 7.1.0, finding calibration 7.1.1, opportunity gates 7.1.0 | same |
| Several page generations in the tree: `cost-iq-v10.html`, `cost-iq/runtime/CostIQ.html`, `cost-iq/v9_1`, an archived v5.1 | `Accelerators/` |
| Report PDF is built in the browser (jsPDF); AI review and report call Gemini server-side | `cost-iq-v10.html`, `evaluate-cost-iq/handler.ts` |
| Own persistence (`CostIqAssessment` model, direct Data API from the browser) outside the shared save/activity/expiry service; the access wrapper is not applied | `assets/cost-iq-persistence.js`, `amplify/backend.ts` |
| `CostIQ_Master.html` is a configuration studio for the methodology JSON, not an assessment | `Accelerators/cost-iq/master/` |

**Goal.** Cost IQ passes all 13 scorecard areas ([FRAMEWORK.md](../FRAMEWORK.md)) and reads as a consulting-engagement accelerator, not a questionnaire.

**Boundary (owner decision D1, FinOps IQ plan).** Cost IQ is the whole-estate technology cost and value diagnostic. Its cloud and FinOps findings (FIN-01 to FIN-12, R-003) hand off to FinOps IQ, which uses the same capability model and lever library, so a client sees one waste figure per estate.

## Quality bar for every phase

These apply to every phase and are checked at its gate. They restate the owner's brief of 3 Nov 2026.

| Rule | How it is checked |
|---|---|
| **Facts and figures a reader can verify.** Every claim, constant, benchmark and range has a source in the claims register (source, year, sample, owner, review date). Published market data is never presented as LTM peer data | Claims-register CI; a number with no register ID fails the build |
| **Assumptions are stated.** Every assumption is in the report's assumption register with value, basis (client input, published source, or LTM heuristic with its reasoning), confidence and what changes if it is wrong | Area 13b; report test fails on an unregistered assumption |
| **Sources are in the report.** A methodology and sources section lists each source with year; each finding cites its basis | Report test |
| **Ranges, not promises.** Savings and value are conservative / expected / upper, net of implementation cost, phased over a realistic ramp, capped at addressable spend and at the published range for the lever, never "guaranteed" | Inflation guard in CI (area 13d) |
| **Technically and functionally validated.** Engine audit passes, golden outputs are approved, the page passes browser tests with no console errors, and `finops-cost-lead` has reviewed the diff | CI; review recorded in the PR |
| **Professional presentation.** One shared shell and type system, an even content width that holds from a 360 px phone to a wide desktop monitor, balanced spacing, consistent charts and tables, no hype language, no emoji, accessible contrast and keyboard use | Playwright at 360, 768, 1280 and 1920 px with screenshot review; accessibility check |
| **Even coverage across customers.** Questions and findings cover the domains evenly and work for different customer profiles (size, industry, region, cloud mix, on-premises share). No domain is thin and no finding depends on a single provider | Coverage matrix in CQ3; reference clients in CQ4 |

## Phases

### CQ0: Validate (no code change)
`finops-cost-lead` scores Cost IQ on the 13 areas with evidence and cites trusted sources only (policy in FRAMEWORK.md).
- Check each of the 105 questions, 20 findings and 10 recommendations against FinOps Foundation Framework 2026, FOCUS, cloud-provider pricing documentation and the published research named in the trusted-sources policy.
- Generate sample reports from at least four reference clients and audit them as a sceptical CIO; write the ten hardest CIO questions and mark which the report answers.
- Map the tree: which page is live, which are dead (v9_1, runtime copy, archive), what the router serves.
- Decide the boundary with FinOps IQ line by line (overlap table).

**Output:** `VALIDATION.md` (Pass / Partial / Fail per area, incorrect / outdated / unsourced statements, Critical findings). **Gate:** owner reads and approves the findings. The later phases are re-cut from it.

### CQ1: Platform parity (can run beside CQ0)
Bring Cost IQ onto the same platform footing as FinOps IQ, Sovereign IQ and Resilience IQ.
- Server-side access check on the Cost IQ routes (the wrapper is not applied today), including the P1 domain rules.
- Save, resume, list and delete through one server path with owner-or-Admin access; stage and percent recorded on every save; activity pointer written and removed; 24-month expiry with deletion on request.
- Decision needed first: keep `CostIqAssessment` and add the missing pieces (recommended: no migration of live data), or move to the shared `manage-session` service (needs a data migration).
- Remove the browser's direct Data API call if the route changes.
- Security tests from the P3 list: another user cannot read, overwrite or delete; delete removes the record and the activity pointer; resume restores the stage.

**Gate:** tests pass; no live Cost IQ record is lost or unreadable.

### CQ2: One live artefact and one version
- Retire the unused page generations and the duplicate runtime copy, or mark them clearly as archive and keep them out of the served site.
- One release number and one status in the page, the report and the API response. `ENGINEERING_INTEGRATION_BASELINE / DRAFT` must not reach a customer.
- The Configuration Studio stays internal, behind Admin access, and is not linked from the customer navigation.

**Gate:** a site check proves only one Cost IQ page is served and the version string matches everywhere.

### CQ3: Content integrity and sources
- Correct every incorrect or outdated statement CQ0 finds; label or remove anything unsourced.
- Put every constant, benchmark and range in the claims register (S2) and reference it by ID from the engine; CI fails on an overdue review.
- Replace invented capability or domain names with the FinOps Framework 2026 structure, with CC BY 4.0 attribution; mark LTM's own labels as LTM's.
- Build the **coverage matrix**: dimensions against question count, customer profile and region. Fill thin areas and trim over-weighted ones so coverage is even.
- Write the **assumption register** schema and populate it for every default the engine uses.
- Questions: wording a CIO recognises, non-overlapping options, "Unknown" offered and scored as risk, each question citing its basis.

**Gate:** zero unsourced claims in CI; coverage matrix reviewed by the owner.

### CQ4: Engine and scoring audit
- Run the engine audit: better answers never score worse, no dead questions, every band reachable, missing answers never flatter the result, labels match what is computed.
- Fix findings with the reference-client scenarios from public case studies, with approved golden outputs.
- Opportunity model: ranges (conservative / expected / upper), caps at addressable spend and published lever ranges, no double counting between levers, totals reconcile, phased ramp, net of implementation cost. Add the inflation guard to CI.
- One value model shared with FinOps IQ so a client never sees two different waste figures for the same estate.

**Gate:** `npm run audit:engines` passes with Cost IQ included; goldens approved; inflation guard green.

### CQ5: The report
Replace the browser-built PDF with the shared server-rendered report used by FinOps IQ and Sovereign IQ.
- Structure: executive summary (situation, issue, recommendation, value with its basis), findings, roadmap, How LTM can help, technical execution, methodology and sources, assumption register, "How we calculated this".
- Every number traces to an engine field; the register of sources and assumptions is part of the document, not a link.
- Client mode hides scoring internals, probes and consultant notes; consultant mode keeps them.
- Backlog CSV export.
- Version, date, "data provided by", and disclaimers on every report; no hype language.

**Gate:** the CIO challenge test (ten questions) is answered from the report's own pages; report tests pass.

### CQ6: Roadmap, offerings and technical execution
- Delivery-grade roadmap: workstreams with activities, owner role, duration, dependencies, effort, milestones, KPIs, prerequisites and risks.
- "How LTM can help" for every finding, typed advisory, implementation or transformation, with indicative scope. Generic practice names; providers only as options with alternatives.
- Platform playbook entries for the platforms the client selects, each with a verification step.
- A consultant-only SOW draft export.

**Gate:** every finding maps to an offering and a playbook entry, or is explicitly marked as not mapped.

### CQ7: Experience and layout
- Move the page fully onto the shared Vantage shell and work-page palette; one type pairing; no emoji; consistent cards, tables and charts.
- **Even width.** One content column with a fixed maximum width and consistent gutters; tables and charts scroll inside their own container; nothing forces the body to scroll sideways. Verified at 360, 768, 1280 and 1920 px.
- Executive mode (15–20 minutes) and workshop mode on one engine, with a visible step list. The step names are the stage values saved with each session.
- Accessibility: keyboard use, focus order, contrast, labels, reduced motion.

**Gate:** Playwright layout checks at four widths pass; screenshots reviewed by the owner.

### CQ8: AI scope
- Replace the Gemini calls with the shared Bedrock service: in-region, off by default, per-engagement toggle, redaction, grounding check, prompt and output log.
- No browser AI and no keys in the page.

**Gate:** grounding check passes on the eval set; Gemini removed from the handler and the page.

### CQ9: Data protection and legal
- Data notice that states hosting (Mumbai), retention (24 months) and deletion on request, consistent with the other accelerators.
- "Not financial or legal advice" disclaimer; statements about contracts, tax or regulation, if any, are cited and reviewed by counsel before external use.
- Any prices quoted are dated and linked to the provider's public page.

**Gate:** notice approved by the owner; counsel review recorded where a regulatory or tax statement remains.

### CQ10: Hardening
- End-to-end browser tests for the full flow, including save, resume and delete, with no console errors.
- Security review of the Cost IQ routes and the persistence path.
- Load check of the evaluate endpoint at realistic input size.
- Final CIO challenge test and accessibility run.

**Gate:** CI green; no open Critical or High finding.

### CQ11: Re-review and release
`finops-cost-lead` re-scores the 13 areas. Cost IQ is CIO ready when all 13 pass, or the owner accepts any Partial in writing. The release label changes from DRAFT to an approved number only here.

## Order and dependencies

| Phase | Depends on | Can start |
|---|---|---|
| CQ0 | none | now |
| CQ1 | owner decision on persistence route | now, beside CQ0 |
| CQ2 | CQ0 (what is live) | after CQ0 |
| CQ3, CQ4 | CQ0 findings | after CQ0 |
| CQ5 | CQ3, CQ4; shared report code | after CQ4 |
| CQ6 | CQ5 structure; shared playbook and offerings | beside CQ5 |
| CQ7 | CQ2; stage names from CQ7 feed CQ1's saved stage | after CQ2 |
| CQ8 | shared Bedrock service | any time after CQ0 |
| CQ9 | CQ5 | after CQ5 |
| CQ10, CQ11 | all above | last |

## Owner decisions needed

| # | Decision | Recommended |
|---|---|---|
| CD1 | Persistence route (CQ1): keep `CostIqAssessment` or move to the shared service | Keep it and add access check, activity, expiry and delete; no migration of live data |
| CD2 | Retention for Cost IQ assessments | 24 months after the last change, as the other accelerators |
| CD3 | Which of the page generations is the live one | CQ0 confirms; the owner approves retiring the rest |
| CD4 | Boundary with FinOps IQ, line by line | As D1: Cost IQ routes cloud and FinOps findings to FinOps IQ |
| CD5 | Markets for regulatory or tax statements | EU and UK, US and APAC, as FRAMEWORK.md |
