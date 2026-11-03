# Cost IQ: phased plan

**Date:** 3 Nov 2026  **Status:** approved by the owner on 3 Nov 2026 and re-cut after the [validation report](VALIDATION.md) (CQ0). `finops-cost-lead` advises and does not sign off.

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


## Where it stands and the re-cut (3 Nov 2026)

CQ0 is done: Cost IQ scores 0 Pass, 3 Partial and 10 Fail, with six Critical findings ([VALIDATION.md](VALIDATION.md), section 1). The work is mostly **content and scoring**, not platform. The owner approved the re-cut below on 3 Nov 2026.

| Phase | State | Change from the first plan |
|---|---|---|
| CQ0 Validate | **Done** | none |
| CQ1 Platform parity | **Done in code** (`2a8142d`), not deployed | The older persistence tests now assert the new owner-only rules. The Configuration Studio and the old runtime page are behind the page guard with edit permission (CQ2, first step) |
| AI containment | **Done**: Gemini is off | Brought forward from CQ8: `COST_IQ_AI_ENABLED` defaults to off; both AI routes return `ai_disabled`; the page skips the AI check and the AI narrative and says so in the report. CQ8 remains the proper fix |
| CQ2 One live artefact | **Done except the count** (4 Nov 2026) | The Configuration Studio, the old runtime page and their configuration moved to `archive/cost-iq/` (not deployed); the empty `v9_1` folder is gone; a test fails if any other Cost IQ file appears under `Accelerators/`. Left: reconcile the question count (the manifest says 105, the API returns 117) and the version string. Both depend on what CQ3a decides about the FinOps overlay, so they are done in CQ3b |
| CQ3 Content | **Split; CQ3a done, CQ3b slice 1 done (4 Nov 2026)** | **CQ3a:** decide the boundary with FinOps IQ line by line (D1), then delete or hand off the FinOps overlay content (FIN-01 to FIN-12 and the capability model), so no effort goes into sourcing questions that will move. **CQ3b:** rewrite the retained questions with a cited basis each, so every shown question scores or is a labelled context question; add the global-coverage questions (below) |
| CQ4 Engine | Widened | Adds: applicability routing (which findings and benchmarks apply by footprint, currency and sector); a minimum number of answers per dimension before it scores; completeness measured over shown questions only; an audit adapter so `audit:engines` includes Cost IQ; reference-client goldens |
| CQ5, CQ6 | As written | CQ5's gate adds the number-trace test and the inflation guard for the new value model. CQ6 reuses FinOps IQ's playbook and offerings catalogue (S3, S5) instead of building new ones |
| CQ7 | As written | First tasks: keyboard access and the 360 px overflow, then the shared shell; remove the "Developer test data" block from the customer home page; ask for a client name |
| CQ8 AI scope | Later | The proper fix: the shared Bedrock service, off by default, with a grounding check |
| CQ9 to CQ11 | As written | none |

Global-coverage items that land in CQ3b and CQ4 are listed in [GLOBAL-COVERAGE.md](../GLOBAL-COVERAGE.md): reporting currency, foreign-currency share of spend, countries of operation, onshore/offshore delivery mix, and three more industries. They are context facts; they route applicability and never re-weight a score.

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

## Owner decisions

| # | Decision | Outcome |
|---|---|---|
| CD1 | Persistence route (CQ1) | **Decided 3 Nov 2026:** keep `CostIqAssessment` and add the access check, activity, expiry and delete through one service; no data migration. Saved before CQ1, records have no owner and only Admins can reach them: a list for review is offered |
| CD2 | Retention | **Decided:** 24 months after the last change, as the other accelerators |
| CD3 | Which page is live | **Decided:** `cost-iq-v10.html` only; the dead pages are guarded now and removed in CQ2 |
| CD4 | Boundary with FinOps IQ | **Decided:** Cost IQ keeps the whole estate; the FIN questions and cloud-practice depth move to FinOps IQ (confirmed line by line in CQ3a) |
| CD5 | Markets | **Decided:** EU and UK, US and APAC, plus Switzerland and India; see GLOBAL-COVERAGE.md |
| CD6 | Inert questions | **Decided 3 Nov 2026 (re-cut agreed):** score, delete or keep as a labelled context question, in CQ3b |
| CD7 | AI for client use | **Decided:** off now; CQ8 is the proper fix |
| CD8 | Currency and global changes | **Decided:** adopt the currency, foreign-currency, geography and delivery-mix questions as context facts; bands in the client's currency, any FX conversion a registered, dated assumption |
| CD9 | Dimensions | **Proposed default, not yet confirmed by the owner:** keep the 16 as LTM's own constructs, label them so, and add a mapping to a published cost taxonomy in CQ3b |

## CQ3b progress (4 Nov 2026)

Decisions O1 to O9 in [BOUNDARY.md](BOUNDARY.md) were accepted at their defaults. Done in slice 1 (tasks 1, 2, 3 in part, and 6 in part):

- **The FinOps overlay is gone.** The CORE-40 scoring override moved into the master; the overlay file, the orchestrator, the heatmap and the `/orchestrate` route are removed. FIN-01 to FIN-12 no longer exist in Cost IQ.
- **Eight questions removed:** ADP-01 to ADP-05, ADP-43, CORE-24, CORE-25. **ADP-42 is the one cloud and FinOps summary question**: it gained an "Unknown" option, a scored map into COST-03 (Unknown rated as the lowest level) and the F-005 trigger (it replaces CORE-24).
- **One count.** The API, the metadata and the release manifest all give 97; a test and the build check fail if they differ.
- **Questions that looked scored and were not:** CORE-11 now scores; CORE-26 became a single-select (it was a star scale with option IDs), which also makes finding F-007 reachable for the first time; CORE-10 is labelled context (a preference for one change, not a maturity scale).
- **Page:** the FinOps focus area and the FIN filters are gone; the Cloud Economics description points to FinOps IQ for cloud cost practice.

Effect on the reference answer sets: headline Cost IQ unchanged on all three; Value IQ 25 to 24 on the worst set; COST-03 and VALUE-05 move a few points; F-007 now appears on the middle set.

**Still to do for the CQ3b gate:** 55 questions score nothing and are not labelled as context (CORE-01, 05, 07, 09 and ADP-06 to ADP-41, 44 to 48, 51 to 60). Each needs a score map with a basis, or a context label; this is judgement work for `finops-cost-lead`. Also open: F-017 and F-019 triggers (task 5), the footprint and applicability questions (task 4), the global-coverage context questions (task 7), the hand-off (task 8), the FinOps IQ side (task 9), the single-figure design (task 10), claims and labels (task 11) and the coverage matrix (task 12). A test keeps the 55 from growing.

### CQ3b slice 2: scoring batch 1 (4 Nov 2026)

`finops-cost-lead` proposed maps and labels for 19 questions ([scoring-batch-1.md](scoring-batch-1.md), [scoring-batch-1.json](scoring-batch-1.json)). Applied now, because they need no owner decision and no gating: **score** ADP-06, 07, 08 (a slider, inverted), 16; **context** CORE-01, 05, 07, 09 and ADP-10, 12, 17, 19, 20. Also labelled context: CORE-02 (industry) and CORE-08 (cost pressure).

**A correction to the earlier count.** The first inert check treated a question as scoring when a probe matched a map key, even where no real option had that key. CORE-02 and CORE-08 had letter-keyed maps (A to L, A to E) that matched no option and scored nothing, so they were never scoring. The check now probes real answers only. The state is: 97 questions, **29 score, 24 are context, 2 only trigger a finding, 42 do neither.**

**Held back, and why:**

| Held | Reason | What releases it |
|---|---|---|
| ADP-09, 11, 13, 14 | They have no "not applicable" option; a client without a virtualised estate, data centre or colocation would be scored low | Footprint gating (task 4): merge CORE-23 into CORE-01, keeping its COLO, VMWARE and MANAGED options, then show and score these only when the footprint says so |
| ADP-15 (drop) | Duplicates CORE-29 and CORE-31; removes a question a client sees | Owner approval |
| ADP-18 (rewrite) | The options mix two scales, so no monotonic map is possible; replacement wording is in the JSON | Owner approval of the wording |
| F-017 trigger on ADP-08 | Fires above 30% of SaaS spend outside central governance; the 30% is an LTM heuristic with no published source | Owner confirms or changes the threshold (ADP-33 and ADP-34 should also trigger F-017; they are in batch 2) |

**Problems the agent found with the questions:** the engine ignores `valueDimensionIds`, so nine questions carry a value dimension that never receives a score (VALUE-01 has no scored question at all); sliders cannot record "Unknown", so a skipped slider leaves a gap instead of scoring low; ADP-06 counts are not normalised by estate size, so it is a screen, not a benchmark. Not verified: ISO/IEC 19770-1 clauses (iso.org returned 403), the TBM taxonomy towers (members only) and a published shadow-IT percentage.

A new test checks every score map against its options: keys are real options, order follows the options, and "Unknown" is never rated above the lowest level.

### CQ3b slice 3: footprint gating (4 Nov 2026)

- **CORE-23 merged into CORE-01.** The footprint question now names virtualization (VMWARE) and colocation (COLO) as well; managed services was already EXTERNAL. CORE-23 is gone; the count is 96 everywhere.
- **Applicability.** A question with `applicableWhen` is asked, scored and counted in completeness only when the CORE-01 answer names the estate, and an unanswered footprint means not applicable, so a client is never scored low for an estate they may not have. Gated: ADP-09 (VMWARE), ADP-10 (VMWARE, ON_PREM, PRIVATE_CLOUD), ADP-11 (ON_PREM, PRIVATE_CLOUD), ADP-13 (COLO), ADP-14 (EXTERNAL). The engine and the page both apply the rule; progress and the saved stage count only the questions shown.
- **Batch 1 maps for ADP-09, 11, 13, 14** are applied now that gating exists.
- **Cloud findings need cloud.** F-005 and F-006 can fire only when PUBLIC_CLOUD is in the footprint.
- **State:** 96 questions; 38 score nothing and are not labelled (ADP-15 and ADP-18 await the owner; ADP-21 to ADP-41 and ADP-44 to ADP-60 are in batch 2 and later). Note: the owner decisions on ADP-15, ADP-18 and the F-017 threshold are still open.

### CQ3b slice 4: scoring batch 2 (4 Nov 2026)

`finops-cost-lead` proposed ADP-21 to ADP-41 ([scoring-batch-2.md](scoring-batch-2.md), [scoring-batch-2.json](scoring-batch-2.json)): 17 score, 4 context (ADP-21, 24, 28, 40). All applied: three sliders score inverted (ADP-22, 29, 37), ADP-26 is a stars map keyed 1 to 5, the rest are option maps. Estate questions carry `applicableWhen` (ADP-35 and 36 need managed services; ADP-37 and 38 need the infrastructure footprint; ADP-33 and 34 need business-led spend reported in CORE-16).

- **F-017 (business-led spend not governed) is reachable for the first time.** ADP-33 (limited or none) and ADP-34 (none) raise it, only when CORE-16 reports business-led spend (yes or unsure). The ADP-08 trigger still waits for the owner's threshold.
- **F-019 (AI investment economics) is still unreachable.** ADP-31 and ADP-32 are scored, but no question records AI scope, so the F-019 triggers wait for the owner's gate decision. The two questions are shown only when the client picks the AI focus area.
- **ADP-28 is labelled context but never shown**: it has no focus area. The owner decides where it appears.
- **State:** 96 questions; **50 score, 27 are context, 2 only trigger a finding, 17 do neither** (ADP-15 and ADP-18 await the owner; ADP-44 to 48 and ADP-51 to 60 are batch 3). Most maps rest on an LTM heuristic; the FinOps Framework gives three stages, not scores. The agent saw GAO material (ADP-30) only through a search summary and the FinOps accountability page is from a previous Framework version.

Effect on the reference answer sets: Cost IQ 80 to 85, 57 to 58 and 36 to 31 (best, middle, worst); Value IQ 92 to 89, 58 to 57 and 24 to 26; F-017 appears on the worst set.

### CQ3b slice 5: owner decisions applied (4 Nov 2026)

The owner accepted the recommendations on the held items: **ADP-15 dropped** (it duplicated CORE-29 and CORE-31; rule TR-07 now names ADP-16 only); **ADP-18 rewritten** to one scale (how the internal and contractor mix is decided and reviewed) and scored; **AI added to the footprint** (a CORE-01 option, "AI platforms, models and AI-enabled services") and ADP-31 and ADP-32 gated on it, which makes **F-019 reachable**; **ADP-28 asked of every client** (its section joins the baseline); the **F-017 threshold on ADP-08 set at 30%**, recorded as an LTM heuristic with no published source.

State: **95 questions; 51 score, 27 are context, 2 only trigger a finding, 15 do neither** (ADP-44 to 48 and ADP-51 to 60, batch 3). All 20 findings now have a reachable trigger except those whose questions are in batch 3.

### Report fixes from CQ0 finding C4 (4 Nov 2026)

Four defects in the current page, fixed ahead of the server-rendered report (CQ5) because they made the deliverable read empty: finding descriptions never printed (the page read `f.detail`; the engine field is `description`), the "priority" panel listed the first four dimensions in configuration order (it now lists the four weakest), every recommendation showed a hard-coded "Confidence: Medium", and the "Confidence" label described answer completeness, not confidence in a result. The label now reads "Evidence completeness" and shows the engine's value; the hard-coded Medium is gone. A browser test checks the description and the label. Still open from C4: the value figure itself (C3), which needs the shared value model (CQ4).

## Shared value model: staged build (4 Nov 2026)

The rule (BOUNDARY.md section 3): one estate has **one cloud figure**, computed once by FinOps IQ; Cost IQ shows it as its cloud line and never computes, restates or adds to it. Cost IQ's total is its own non-cloud levers plus that line; with no FinOps IQ result the cloud line reads "Not quantified. Run FinOps IQ" and the total says "excluding cloud". Decisions O3, O4, O5 and O7 were accepted at their defaults (3 Nov 2026).

| Stage | What | State |
|---|---|---|
| 1 Contract | FinOps IQ gives a versioned, read-only summary built from its client view: ranges by case, net and years one to three, cap with source, year and sample, confidence, capability profile, the levers it owns, no money unless FinOps IQ shows money. No approved figure or golden output changes | **Done** (`cost-iq-summary.ts`; schema `finops-iq-cost-summary/1`; tested on the nine reference scenarios) |
| 2 Link | The consultant picks the FinOps IQ session to import (same owner or Admin); Cost IQ stores only the summary it imported | **Done in code** (4 Nov 2026): `manage-cost-assessment` lists the caller's completed FinOps IQ assessments, links one (needs access to both accelerators and both records) and stores the versioned summary; allowed after completion, answers and result stay immutable; the result screen has a "Cloud and FinOps" panel that says "Not quantified. Run FinOps IQ for this estate" until a result is linked. FinOps IQ's saved assessments are in its own model, not the shared session service as first assumed; the Cost IQ service reads them through the same data store and checks ownership itself |
| 3 Non-cloud levers | Evidence-based only unless a public source supports a ceiling: the client's measured base times a share up to 100%, expected case half, IDs after LEV-10 in the same library, each with claim and assumption entries | Sourcing search commissioned (`non-cloud-lever-sources.md`); build after it reports |
| 4 Guard | Total = non-cloud plus cloud; CI fails if Cost IQ computes any lever in `FINOPS_IQ_LEVER_IDS`, if a lever exceeds its addressable base, or if one dollar is counted twice | **Done for the cloud rule** (4 Nov 2026, `cost-iq-single-figure.test.ts`): the build fails if any Cost IQ file uses a FinOps IQ lever ID, if a cloud finding is ever quantified, or if the output carries a money-like field, checked on 300 random answer sets (a planted lever ID was caught). The reconciliation of total = non-cloud plus cloud and the base cap arrive with Cost IQ's first non-cloud lever (CQ4) |
| 5 Report | Cloud line, total "excluding cloud" where needed, trace and assumption appendix | CQ5 |

### CQ3b slice 6: scoring batch 3 (4 Nov 2026)

`finops-cost-lead` proposed ADP-44 to ADP-60 and the new global-coverage questions ([scoring-batch-3.md](scoring-batch-3.md), [scoring-batch-3.json](scoring-batch-3.json), [global-questions.json](global-questions.json)). Applied now (no owner decision needed): **score** ADP-44, 45, 46 (a slider, inverted), 48, 54, 59, 60; **context** ADP-53 and 56.

**State: 95 questions; 58 score, 29 are context, 2 only trigger a finding (ADP-49, 50), 6 do neither.** The agent's structural check finds a reachable trigger for all 20 findings; nine of them need an opt-in focus area, listed in the proposal. VALUE-01 still has no scored question.

**Held for the owner** (they change what a client sees, or add a gate):

| Item | Decision |
|---|---|
| ADP-49 and ADP-50 | A client with no acquisition or divestiture who picks the M&A area can only answer NONE (scores 20 and raises F-020) or leave the slider at 0 (scores 100). Proposed: a NOT_APPLICABLE option on ADP-49, a gate on ADP-50 and on both F-020 triggers; confirm the 20 percent threshold (LTM heuristic) |
| ADP-51 and ADP-52 (Geography) | Need a gate: the master rule says they apply to multi-country operations but nothing sets that. Proposed: the new CTX-05 (countries band). Without it a single-country client scores 100 |
| ADP-47 | LATE is rated above RENEWAL by option order; a tie is as defensible |
| ADP-55, ADP-57, ADP-58 | ADP-55 overlaps CORE-09; ADP-57's labels read as identifiers ("Data Ai"); ADP-58 duplicates CORE-45 and ADP-55 (drop) |
| New questions CTX-01 to CTX-05 | Reporting currency, foreign-currency share, regions of operation, onshore share, countries band; all context, no scoring effect |
| CORE-02 | Add EDUCATION, MEDIA_ENTERTAINMENT, NATURAL_RESOURCES (where upstream oil and gas sits is open) |
| CORE-03 and CORE-04 | Rewrite so the bands follow the chosen currency; the proposal has band tables for nine non-USD currencies from ECB rates dated 2 Nov 2026, which must be regenerated from the ECB XML before use (the agent read them through a summarising fetch) |

Not verified by the agent: FOCUS column text, IAS 21, ISO 4217, ISIC section titles and the AED and SAR pegs in primary form.

### CQ3b slice 7: batch 3 decisions and the global-coverage questions applied (4 Nov 2026)

The owner accepted the recommendations on everything held from batch 3 and on the sourcing search (decisions A to C).

- **Every question now scores or is labelled context.** 99 questions: **63 score, 36 are context, none does neither** (a test fails if one appears).
- **M&A:** ADP-49 gained "No acquisition, merger or divestiture in the last three years" (scores nothing); ADP-50 and both F-020 triggers apply only after a transaction. The 20 percent F-020 threshold stays, recorded as an LTM heuristic.
- **Geography:** ADP-51 and ADP-52 apply only to a multi-country client, set by the new countries question (CTX-05).
- **Five new context questions:** CTX-01 reporting currency, CTX-02 share billed in another currency, CTX-03 regions of operation, CTX-04 onshore share, CTX-05 number of countries. None can score; a test shows the headlines and every dimension are identical with and without them.
- **CORE-02** gained education, media and entertainment, and natural resources.
- **CORE-03 and CORE-04 (revenue and technology spend bands)** keep their option IDs and now show their labels in the reporting currency chosen in CTX-01, for EUR, GBP, CHF, CAD, AUD, JPY, CNY, INR, SGD, BRL and ZAR. AED, SAR and Other fall back to US dollar bands. **The tables were regenerated from the ECB daily XML (rates dated 2 Nov 2026) and match the agent's tables exactly.** Conversion happens only when the table is built; the engine scores no money. The rate source, date and rounding are in `settings.currencyBands`, which the report's assumption register (CQ5) will print; the page tells the client the bands are converted at the ECB rate of that date.
- **Label and wording changes:** ADP-47 rated LATE and RENEWAL equal; ADP-57's option labels read as words ("Data and AI"); ADP-55 kept as context; ADP-58 dropped (it duplicated CORE-45 and ADP-55).
- **The "hypothesis versus findings" comparison has no consumer in the code.** `settings.hypothesisComparison` names CORE-09 only and nothing reads it, so ADP-55's answer feeds nothing yet. It is built with the report (CQ5).
- **Sourcing search for non-cloud levers (decisions):** A, do not use Flexera ITAM 2023 as a software ceiling (show it as a cited context line at most, and wait for a current-year source); B, show public-sector operations-and-maintenance shares as labelled context for application rationalisation, labelled as US federal and one UK department; C, accept that most non-cloud levers stay evidence-based and give few figures in an executive run.

**CQ3b still open:** the hand-off to FinOps IQ and its import (tasks 8 and 9; stage 2 of the value model), the CI guard (task 10), a cited basis for each kept question and a mapping of the 16 dimensions to a published cost taxonomy (task 11; most maps rest on an LTM heuristic today), and the coverage matrix (task 12).

### FinOps IQ side of the hand-off (4 Nov 2026)

Decision O8 applied: FinOps IQ's pre-fill lists that named Cost IQ's deleted FIN questions are removed (19 `costIqPrefill` entries in the capability registry, 20 `prefillFrom` entries in the question bank, and the two schema properties). No code read them; FinOps IQ's own `prefilled` and `prefillConfirmed` contract flags are unchanged, and its tests and approved outputs are unchanged (all pass). **Not built yet:** the other direction of the hand-off, a "Cost IQ indicated" banner on FinOps IQ's start screen with facts pre-filled from a Cost IQ result (sector, currency, countries, footprint, spend band; facts only, never answers). FinOps IQ has no such banner today; it needs a Cost IQ read in FinOps IQ's save service, mirroring stage 2.

