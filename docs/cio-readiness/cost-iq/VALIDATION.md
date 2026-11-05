# Cost IQ: validation report (CQ0)

**Date:** 3 Nov 2026  **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves.

**Scope:** Cost IQ scored on all 13 scorecard areas. The FinOps IQ boundary is mapped line by line (section 9); global coverage is section 12. Section numbers are not contiguous with reading order (findings are section 3, after the scorecard).

**State reviewed.** Content, engine, page and tests were read at commit `737490c` (before CQ1). CQ1 (`2a8142d`, sign-in and owner-only saved assessments) landed during the review; area 2 and the security observations are re-scored against it (section 2 notes, finding C2). Line references to `Accelerators/cost-iq-v10.html` are to `737490c`; CQ1 shifted later lines by about 11.

**Method**
- Read the page, engine (`packages/engine-core/src/accelerators/cost-iq/evaluate.cjs`, `canon/costiq-engine-v10.cjs`, `canon/costiq-orchestrator-v10.2.cjs`), master config 6.6, FinOps overlay 7.1.0, calibration 7.1.1, opportunity gates 7.1.0, handler and tests.
- Ran all 12 Cost IQ npm scripts at `737490c` in a clean export: all exit 0 (section 8).
- Wrote my own audit probes, because `npm run audit:engines` does not include Cost IQ (`packages/engine-core/audit/adapters.ts` has no Cost IQ entry).
- Generated reports for 5 illustrative reference clients with the real engine, replaying the page's question selection, then rendered the page in Chromium at 360, 768, 1280 and 1920 px (scratchpad, outside the repo).
- Checked content against primary sources. Source access: finops.org capability pages did not render in the fetch tool; where a primary page was not readable I say so.

---

## 1. Verdict

**Cost IQ is not CIO ready. It is a sound questionnaire shell with a thin, partly inert scoring engine, no money figure, and a report that is mostly a score chart.**

Strengths: it has no invented savings percentages, no benchmark claims and no "guaranteed" language in its content. Its engine refuses to quantify opportunity without evidence (`opportunity-recommendation-gates-v7.1.0.json`, `numericCalibration: pending`). Scores never fall when an answer improves (0 violations in 12,793 single-answer improvements). All 12 Cost IQ test scripts pass at `737490c`.

Six problems stop it passing:
1. **Most questions change nothing.** Of the 105 questions, 22 are scored and 2 more activate a finding. 81 (77%) affect no score and no finding; they reach only the AI prompt. Three of them (ADP-09, ADP-10, ADP-28) and the 12 FinOps questions (FIN-01 to FIN-12) are never shown, because their section names are in no focus-area list (`cost-iq-v10.html:48-68`).
2. **The FinOps overlay (4 domains, 22 capabilities) is not in the live product.** The page sends no FinOps scope and no capability scores, so `finopsHeatmap` returns `enabled:false` (`costiq-engine-v10.cjs:31`). The Cloud Economics dimension rests on one question (CORE-24).
3. **There is no value figure at all.** The report shows two maturity indices (0 to 100) and findings. Opportunity text comes from Gemini or from fixed recommendation text with a hard-coded "Confidence: Medium" (`cost-iq-v10.html:357`). A CFO gets no basis, range, ramp or cost.
4. **The report loses content.** Finding descriptions never print (the page reads `f.detail`; the engine field is `description`; lines 371 and 419). "Priority value levers" shows the first four dimensions, not the weakest (line 312).
5. **AI is on by default, server-side Gemini, ungrounded, and receives free-text context.** No toggle, no grounding check (`handler.ts:100-151`).
6. **Content is unsourced and the claims register has no Cost IQ entries.** No question cites a basis. Option text has copy errors (seven FIN questions share the worst option "No material unit-economics use case is currently needed").

Recommendation: keep Cost IQ as the whole-estate technology cost and value diagnostic (it is distinct from FinOps IQ in scope, section 9), but rebuild its scoring so every shown question counts, wire or remove the FinOps overlay, and add a lever-based value model shared with FinOps IQ.

---

## 2. Scorecard

Pass / Partial / Fail, with evidence. **Totals: 0 Pass, 3 Partial (1, 2, 4), 10 Fail.**

| # | Area | Result | Evidence |
|---|---|---|---|
| 1 | Purpose and distinctness | **Partial** | The page names a purpose ("Technology Cost & Value Diagnostic", `cost-iq-v10.html:6,122`) but no CIO decision, buyer or edge over free alternatives is written down. Scope is genuinely wider than FinOps IQ (whole estate: SaaS, licensing, infrastructure, workforce, vendors, applications). Overlap with FinOps IQ in the FinOps sections (section 9). Free alternatives that cover whole-estate cost (TBM Council taxonomy, FinOps Foundation assessment, provider tools) are not discussed |
| 2 | Functionality | **Partial** | At `737490c`: 12 test scripts pass; engine returns for all 5 reference clients; no page error in Chromium at 4 widths. Defects: finding descriptions never print (`:371`, `:419`); slider "Unknown" configured on 12 sliders but not rendered (`control.unknown`, page `:243`); options are `div`s with no tabindex or role (0 of 52 focusable); PDF is browser-built jsPDF, with no backlog export; at 360 px the page scrolls sideways (section 11). **After CQ1 (`2a8142d`):** routes are behind the authorizer and access check, saves go through `manage-cost-assessment`; I did not re-run the new service tests or browser e2e against it. `test:costiq:persistence` fails in a working tree with CQ1 edits uncommitted and passes at `737490c`; re-run at `2a8142d` before CQ1 sign-off (UNVERIFIED). No browser test renders every question |
| 3 | Questions and answers | **Fail** | No question cites a basis. 12 FIN questions and 3 ADP questions never shown. Seven FIN questions reuse "No material unit-economics use case is currently needed" as the worst option (FIN-03, 04, 06, 08, 09, 10, 12). FIN-02 asks "which units" but offers intensity options. ADP-57 and ADP-58 labels are auto-cased ("Data Ai", "Saas Overlap"). CORE-26 is a star question that also carries an option list; its finding trigger (`SELECTIVE`, `COUNT`, `UNKNOWN`) can never match a star number. "Unknown" is offered inconsistently (CORE-03/04/36, 5 FinOps-style options, none on 12 sliders). ADP-21 to ADP-60 use generic guidance ("Choose the option that best reflects the current enterprise reality"); the manifest says review stopped at ADP-20 |
| 4 | Depth | **Partial** | Baseline plus 19 focus areas gives 35 questions by default and up to 102. There is no timed executive mode and no follow-up triggered by an answer: the 38 trigger rules (`master-v6.6.json` `rules`) are not executed by the page, which selects questions from a hand-made area map (`cost-iq-v10.html:48-68`). The orchestrator (`costiq-orchestrator-v10.2.cjs`) is exposed at `/orchestrate` but never called |
| 5 | Scoring engine | **Fail** | Not in `audit:engines`. My probes: monotonic (pass); 78 of 102 shown questions inert (fail); Cloud Economics from one question; headlines average only answered dimensions, so unanswered weak areas are ignored; "Confidence" is the share of 45 CORE questions answered, including sections not selected (RC2: 64%, "low", with every shown question answered); config says the score is "not a simple average" (`master-v6.6.json` settings) but it is an unweighted mean of dimension means (`costiq-engine-v10.cjs:22`); capability bands CRAWL 0-59 / WALK 60-84 / RUN 85-100 are "provisional, not production-approved" (overlay `capabilityMaturityCalibration`); no goldens, no practice-lead approval |
| 6 | CIO alignment | **Fail** | Leads with two indices and a radar. No money, no decision, no owner or time frame per finding; finding text is blank (above). Jargon: "Concentration heat map", "Value IQ" |
| 7 | Output | **Fail** | Browser PDF only (`cost-iq-v10.html:375-452`): no methodology panel, no sources, no version or date of method, no disclaimer beyond "Confidential", no How LTM can help, no technical execution, no backlog |
| 8 | Sources | **Fail** | 0 Cost IQ claims in `docs/claims-register/` (no Cost IQ rows in `claims-inventory.csv`). Constants are unsourced (section 5). No question cites a source |
| 9 | Legal validity | **Fail** | No data notice, hosting statement, retention statement or "not advice" disclaimer in page or PDF. Free-text context goes to Gemini (US vendor) with no notice. The archive button stores the assessment in S3 (`:453-457`) |
| 10 | AI scope and toggle | **Fail** | Server-side Gemini (`evaluate-cost-iq/handler.ts:100-155`), not Bedrock; always on (the page calls ai-review and ai-report on every run, `:279`, `:344`); no per-engagement toggle; no grounding check (the prompt says "do not invent", nothing checks); the consultant's free-text "additional context" is sent verbatim (`:249`, `:344`); default model name `gemini-3.8-flash` is not verified to exist (UNVERIFIED). CQ1 removed the key log line and put the route behind sign-in |
| 11 | Technical execution | **Fail** | The questions contain no provider, tool or platform content (0 mentions of AWS, Azure, GCP, Oracle, IBM or Kubernetes in the 117 questions). No playbook entries, no verification steps. Recommendations R-001 to R-010 are one service label each |
| 12 | Commercial pull-through | **Fail** | `ltmService` labels only (`master-v6.6.json` recommendations); the report heading is "LTM Infrastructure Tech Advisory" (`:371`); a mailto to one named person (`:337`); no typing as advisory/implementation/transformation; no scope; no SOW draft |
| 13 | Report defensibility | **Fail** | Section 7. 0 of 10 CIO challenge questions answered fully |

---

## 3. Findings

### Critical

| # | Finding | Evidence | Consequence | Recommended fix |
|---|---|---|---|---|
| C1 | **Most questions change nothing.** 81 of 105 inert; 78 of the 102 shown. A client answers 60+ questions whose answers do not alter any score or finding | Section 6 and 8 | A CIO who finds out loses trust in the whole diagnostic; the report cannot trace a finding to most inputs | CQ3/CQ4: score every shown question or mark it context and hide it; ADP questions get semantic option maps; add the audit adapter |
| C2 | **AI is on by default, ungrounded, and receives free text.** Gemini server-side, no toggle, no grounding check, consultant's free-text context sent verbatim and AI text printed in the PDF. (CQ1 put the routes behind sign-in and removed the key log line; the AI design itself is unchanged.) At `737490c` the routes were unauthenticated with CORS `*`, so anyone could spend the Gemini quota | `handler.ts:100-151`; `cost-iq-v10.html:249,279,344`; `backend.ts:369-372` at `737490c` | Client text reaches a US vendor with no notice; an AI sentence can state a saving no one computed | CQ8: Bedrock, off by default, toggle, redaction, grounding check, log. Until then, switch AI off for client use |
| C3 | **No value figure, so the CFO question cannot be answered; and the label promises one.** | Section 7.4; gates `numericCalibration: pending` | The report is a score chart; "illustrative opportunity range" has no range | One shared lever-based value model with FinOps IQ (CQ4); until then remove the label |
| C4 | **The report drops content and misstates it.** Finding descriptions never print; "Priority value levers" is not prioritised; "Confidence: Medium" is hard-coded; "Confidence" is completeness | `cost-iq-v10.html:312,357,371,419` | The deliverable reads empty and the labels do not match what is computed | CQ5 server-rendered report from engine fields; fix labels |
| C5 | **The FinOps overlay (4 domains, 22 capabilities) and 12 FIN questions are not in the live product**, yet the release, the plan and FinOps IQ describe them as shipped. F-017 and F-019 are unreachable | Section 1, 6 | Claims about FinOps Framework alignment cannot be demonstrated | Decide per D1: remove from Cost IQ and use FinOps IQ's model, or wire the orchestrator |
| C6 | **No Cost IQ claim is in the register; no data notice or disclaimer.** | Section 2, areas 8 and 9 | Fails areas 8 and 9; client text flow undisclosed | CQ3, CQ9 |

### High

| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | No applicability routing: cloud findings fire for clients without cloud | 7.1 (RC3, RC4) | Use CORE-01/23 to skip and suppress findings |
| H2 | Dimension scores rest on one answer in 7 of 16 dimensions; headline ignores unanswered dimensions | Section 6, 8 | Minimum answers per dimension; show "not assessed" and lower the headline's confidence |
| H3 | Confidence is completeness over unselected sections (RC2 "low" with all questions answered) | `costiq-engine-v10.cjs:23-27` | Measure completeness over shown questions; separate evidence confidence |
| H4 | Dead pages publicly served, including the Configuration Studio that can mark a release "approved" in the browser | Section 4 | CQ2: remove from `Accelerators/` or gate |
| H5 | Question defects: shared worst option across seven FIN questions, auto-cased labels, star question with option list, no "Unknown" on sliders, no source per question | Section 3 area 3 | CQ3 rewrite with basis per question |
| H6 | No technical execution content: no provider, tool or platform text | Area 11 | CQ6 playbook entries (shared S3) |
| H7 | Cost IQ is not in `audit:engines`; no goldens; no browser e2e at `737490c` | Section 8 | CQ4 |
| H8 | Keyboard users cannot answer any question (0 of 52 options focusable); contrast fails | Section 11 | CQ7 |
| H9 | `persistence-contract` test no longer matches the CQ1 schema | Section 8 | CQ1 follow-up |

### Medium

| # | Finding | Fix |
|---|---|---|
| M1 | Release says 105 questions; API and validator say 117; status string `COSTIQ-0.7.8-DRAFT` not shown in report | One count and one version (CQ2) |
| M2 | 360 px horizontal overflow from chart cards; malformed CSS after the media query | CQ7 |
| M3 | Developer test buttons shown to customers; mailto to a named person | Remove; engagement lead from session |
| M4 | A dimension score of exactly 1 is shown as 100 (`:300`) | Fix scaling |
| M5 | Free-text ("Additional context") is sent to AI and stored without a stated retention (24 months set by CQ1) | CQ9 notice |
| M6 | Static severity per finding; no ranking by size | Rank by dimension gap and, later, value |
| M7 | Framework attribution (CC BY 4.0) missing; technology categories and capability set differ from the Foundation's without being labelled LTM's | CQ3 |
| M8 | FOCUS-aligned wording is fine; add version note "FOCUS 1.4 latest" on review | Review each 90 days |
| M9 | Global coverage gaps (section 12) | CQ3 |

## 14. Recommendation: re-cut of CQ2 to CQ11

CQ0 shows the work is mostly **content and scoring**, not platform. Proposed changes to PLAN.md (for the owner to accept or change):

1. **Bring forward AI containment.** Before any client use: switch Gemini off for client engagements now (one config change), and keep CQ8 as the proper fix. It is Critical (C2), not a late phase.
2. **Merge CQ3 and CQ4 into two ordered steps:** CQ3a decide the D1 boundary and delete or hand off the FinOps overlay content (so no work is spent sourcing questions that will move); CQ3b rewrite the retained questions with a basis each and scoring for every shown question; CQ4 then adds the audit adapter, goldens and the value model. Dependency: D1 first.
3. **Add to CQ4:** applicability routing (H1), minimum answers per dimension (H2), completeness over shown questions (H3), and the reference-client goldens (the five illustrative clients here are a starting set).
4. **Move the "global coverage" changes (section 12) into CQ3b**, since they change questions and bands, and into CQ4 for the applicability rule.
5. **CQ2 is small:** delete or gate the dead pages (H4) and reconcile counts and version (M1). It can run now beside CQ3a. The Configuration Studio gate matters more than the version string.
6. **CQ5 and CQ6 stay as written** but CQ5's gate should include the trace test and the inflation guard for the new value model, and CQ6 should reuse FinOps IQ's playbook and offerings catalogue (S3, S5) instead of building new ones.
7. **CQ7 first task:** keyboard access and the 360 px overflow, then the shared shell.
8. **CQ1 follow-up (small):** update `persistence-contract.test.cjs` to the service model and re-run all 12 scripts and the browser spec at `2a8142d`.
9. **CQ9, CQ10, CQ11 unchanged.**

## 15. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| CD1 | Persistence route | as PLAN | Done in CQ1; confirm after the follow-up test |
| CD3 | Which page is live | `cost-iq-v10.html` only | Confirmed; retire or gate the others |
| CD4 | FinOps boundary | D1 | Cost IQ keeps whole-estate; FIN questions and cloud practice depth move to FinOps IQ (section 9) |
| CD6 | Inert questions | Delete / score / keep as context | Score or delete; keep a few explicit context questions, hidden from the scored count |
| CD7 | AI for client use | Leave on / switch off until CQ8 | **Switch off now** |
| CD8 | Currency and global changes (section 12) | None / as listed | Adopt the currency, FX, geography and delivery-mix questions |
| CD9 | Dimensions | Keep 16 as LTM constructs / map to TBM towers | Keep and label as LTM's; add a TBM mapping |

## 16. Sources (checked 3 Nov 2026 unless stated)

- FinOps Framework 2026 update (19 Mar 2026; CC BY 4.0; new Executive Strategy Alignment; renames; technology categories; scopes): https://www.finops.org/insights/2026-finops-framework/
- FinOps maturity model (Crawl/Walk/Run per capability): https://www.finops.org/framework/maturity-model/
- FinOps capabilities (Microsoft Learn summary, updated page): https://learn.microsoft.com/en-us/cloud-computing/finops/framework/capabilities . finops.org capabilities page did not render in the fetch tool; an Onboarding Workloads page URL returned 404 on direct fetch.
- FOCUS specification (v1.4 latest; CC BY 4.0): https://focus.finops.org/focus-specification/
- State of FinOps 2026 (19 Feb 2026, n=1,192): https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1
- Flexera 2026 State of the Cloud press release (18 Mar 2026): https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows
- TBM Council taxonomy (5.0.1 listed): https://www.tbmcouncil.org/taxonomy/ (search result summary only; full taxonomy document not opened)
- UN ISIC Rev. 5 (22 sections): https://unstats.un.org/unsd/classifications/Family/Detail/2095
- Provider commitment terms (carried from the 14 Oct FinOps IQ review, not re-fetched): https://aws.amazon.com/economics/learn-more/ ; https://azure.microsoft.com/en-us/reservations/ ; https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Repository evidence: commit `737490c` (read and tested), `2a8142d` (CQ1, noted not re-tested); scratchpad scripts for probes, sample reports and Chromium renders (not committed).

## 4. File tree and what is live

| Path | Status | Evidence |
|---|---|---|
| `Accelerators/cost-iq-v10.html` (461 lines at `737490c`) | **Live.** The only customer page. Launched from `Accelerators/index.html:646` as `/cost-iq-v10`; guarded client-side by `rbac-guard.js` (`:11`) | |
| `Accelerators/cost-iq-runtime-config.js`, `assets/cost-iq-persistence.js` | Live support files (API URL; browser persistence, replaced by the API call in CQ1) | `scripts/generate-cost-iq-runtime-config.cjs` |
| `Accelerators/cost-iq/runtime/CostIQ.html` (8 KB) | **Dead but publicly served.** Old configuration-driven demo; no `rbac-guard`; reads `../config/current/config.json` | `amplify.yml` publishes all of `Accelerators/` |
| `Accelerators/cost-iq/master/CostIQ_Master.html` + `master-config.json` | **Dead but publicly served.** The Configuration Studio: no `rbac-guard`; its "Build Release Package" button sets the status to `approved` in the browser. It edits a 5-question-era slice (4.8 KB config), not the 6.6.0 master | file content |
| `Accelerators/cost-iq/config/current/config.json`, `releases/0.1.0/config.json`, `schemas/master.schema.json` | Dead, served | |
| `Accelerators/cost-iq/v9_1/` | Empty apart from an untracked `.DS_Store`; not in git | `git archive` of `737490c` has no such folder |
| `archive/cost-iq/{v5_1,v5_5,v6_draft,v9_1}` | Dead; not deployed (`archive/README.md`: Amplify publishes only `Accelerators/`) | |
| `packages/engine-core/src/accelerators/cost-iq/evaluate.cjs` | **Engine adapter.** Loads the canon files and calls `canon.evaluate` | |
| `canon/config/master-v6.6.json` (272 KB) | **Master content:** 105 questions, 16 dimensions, 20 findings, 10 recommendations, 38 rules | |
| `canon/config/finops-overlay-v7.1.0.json` | FinOps overlay: 12 FIN questions, 22 capability mappings, 4 domains, scope model. Not used by the live page | |
| `canon/config/finding-activation-calibration-v7.1.1.json`, `opportunity-recommendation-gates-v7.1.0.json`, `v10.1-routing-evidence-contract.json` | Finding triggers; evidence gates (no numeric calibration); routing contract | |
| `canon/RELEASE_MANIFEST.json` | `COSTIQ-0.7.8-DRAFT` / `ENGINEERING_INTEGRATION_BASELINE`; says 105 questions while the live API returns 117 (`metadata().baseline.questions`) and `scripts/validate-cost-iq.cjs` asserts 117 | |
| `amplify/functions/evaluate-cost-iq/` | Scoring and AI service. At `737490c` served on the pre-Phase-1 API with **no authorizer and CORS `*`** (`backend.ts:369-372`, `handler.ts:7`); behind Cognito and the access check since CQ1 | |
| `amplify/functions/manage-cost-assessment/` | CQ1 save/resume service (not reviewed in depth) | `2a8142d` |

**What the router serves.** There is no rewrite file in the repository. The launcher links `/cost-iq-v10` and the local static server maps extensionless paths to `.html` (`tests/support/static-server.mjs`). Whether Amplify Hosting console rewrite rules exist is **UNVERIFIED** (console not accessible). Any file under `Accelerators/` is reachable by its direct URL, including the two dead pages above.

## 5. Content verification (constants, framework statements, benchmarks)

**Verdicts:** Correct / Incorrect / Outdated / Unsourced. Checked 3 Nov 2026 unless stated. "Master" = `canon/config/master-v6.6.json`; "overlay" = `finops-overlay-v7.1.0.json`.

**Finding that frames this section:** Cost IQ contains no savings percentages, no waste benchmarks and no peer comparisons in any question, finding, recommendation or the report. That removes the FinOps IQ class of inflation risk. The cost is that its own constants (thresholds, scores, modifiers) are all unsourced.

| # | Statement | Where | Verdict | Correct statement / what settles it | Source |
|---|---|---|---|---|---|
| 1 | Release counts 105 questions, 16 dimensions, 20 findings, 10 recommendations, 22 capabilities, 4 domains | `RELEASE_MANIFEST.json` baseline | Correct as counted; inconsistent | Counted in config: 45 CORE + 60 ADP = 105; the API and `validate-cost-iq.cjs` use 117 (105 + 12 FIN). Pick one number and explain | engine `metadata()` |
| 2 | Four domains: Understand Usage & Cost, Quantify Business Value, Optimize Usage & Cost, Manage the FinOps Practice | overlay `frameworkDomains` | Correct | Same four domains | https://learn.microsoft.com/en-us/cloud-computing/finops/framework/capabilities ; https://www.finops.org/insights/2026-finops-framework/ |
| 3 | "FinOps Framework 2026" as the framework | overlay `framework` | Correct, attribution missing | Published 19 Mar 2026 under CC BY 4.0. No page or PDF text carries the attribution or an indication of changes | https://www.finops.org/insights/2026-finops-framework/ |
| 4 | Six renamed capabilities use 2026 names (Usage Optimization; Governance, Policy & Risk; Automation, Tools & Services; KPIs & Benchmarking; Architecting & Workload Placement; Sustainability) and Executive Strategy Alignment is included | overlay `frameworkDomains` | Correct | 2026 renames and the new capability are as listed | same finops.org page |
| 5 | "22 capabilities" | manifest, overlay | Unsourced | Microsoft Learn's (2025) page lists 22 including "Onboarding workloads". The overlay drops Onboarding Workloads and adds Executive Strategy Alignment. The 2026 official total and the fate of Onboarding Workloads could not be confirmed: the finops.org insight names no merge or removal; one secondary source says it was merged. Settle from the finops.org capabilities page when it renders | Microsoft Learn (above); finops.org page (above) |
| 6 | Maturity is Crawl / Walk / Run | overlay `frameworkMaturity` | Correct | Foundation: each capability can be at a different level; the goal is not Run everywhere | https://www.finops.org/framework/maturity-model/ |
| 7 | Bands CRAWL 0-59, WALK 60-84, RUN 85-100 | overlay `capabilityMaturityCalibration` | Unsourced | The Foundation defines the stages qualitatively. The file itself says "provisional thresholds ... not production-approved" | maturity-model page |
| 8 | Five bands "Reactive, Visible, Managed, Optimized, Intelligent" | master settings `maturityBands` | Unsourced (LTM label) | Not a Foundation model; unused by the page. Mark as LTM's or remove | maturity-model page |
| 9 | Six principles (P1 to P6) | overlay `principles` | Unsourced in this review | Only "Business value drives technology decisions" was confirmed on the 2026 page. Check the other five against finops.org/framework/principles | https://www.finops.org/insights/2026-finops-framework/ |
| 10 | Twelve technology categories (adds Private Cloud, Licenses, Managed Services, Colocation, Network, Security, Other) | overlay `technologyCategories` | Incorrect as a Framework statement | The 2026 Framework lists Public Cloud, SaaS, Data Center, Data Cloud Platforms and AI. The extra seven are LTM's; label them so | same finops.org page |
| 11 | Personas (6 core, 5 allied) | overlay `personas` | Unsourced in this review | Not fetched. Check against finops.org/framework/personas | — |
| 12 | Scope definition and constructs | overlay `scopeModel` | Correct in concept | 2026: a scope is a segment of spending across technology categories aligned to business constructs, started by business questions | finops.org 2026 page |
| 13 | FOCUS-aligned model (FIN-01 option) | overlay FIN-01 | Correct | FOCUS 1.4 is the latest listed version (1.3, 1.2, 1.1, 1.0 also listed); CC BY 4.0. The question names no version, which is safe | https://focus.finops.org/focus-specification/ |
| 14 | Confidence modifiers high 1 / medium 0.8 / low 0.6 | master settings | Unsourced; unused | No code uses them (`costiq-engine-v10.cjs`). Either register as LTM heuristic with reasoning or remove | — |
| 15 | Confidence: completeness >= 90 "high", >= 70 "medium", else "low" | `costiq-engine-v10.cjs:23-27` | Unsourced | LTM heuristic; and it measures answered CORE questions, not evidence quality, while the config says confidence is "independent from score" | — |
| 16 | Capability adaptive threshold 70 | `costiq-engine-v10.cjs:30,34` (`threshold=70`) | Unsourced | LTM heuristic | — |
| 17 | Finding triggers: CORE-17 < 50, CORE-34 > 50, ADP-50 > 20, option sets D/E/F | calibration 7.1.1 | Unsourced | LTM calibration; keep, but register with reasoning | — |
| 18 | Answer scores (e.g. 100/82/64/46/28/15; A to L in steps of 7.3) | master `scoring.defaultMap` | Unsourced | LTM scale; unequal spacing between questions makes dimensions not comparable without a statement | — |
| 19 | Label "Illustrative opportunity range — requires evidence validation" | master settings; engine `opportunity()` | Incorrect (label vs computation) | The engine returns a status only; no range is computed anywhere. The label promises a range that does not exist | `costiq-engine-v10.cjs:29` |
| 20 | "Deterministic weighted diagnostic index; not a simple average of questions" | master settings `executiveScorePresentation` | Incorrect | Unweighted mean of question scores within a dimension, then mean of dimensions (all weights 1) | `costiq-engine-v10.cjs:15-22` |
| 21 | Sixteen dimensions (10 cost, 6 value) | master `dimensions` | Unsourced (LTM construct) | Not from FinOps or TBM; state that they are LTM's. For whole-estate cost, TBM Council's taxonomy (version 5.0.1 listed) is the recognised public reference and should be mapped | https://www.tbmcouncil.org/taxonomy/ |
| 22 | Findings F-001 to F-020 use hedged wording ("may contain") and static severity | master `findings` | Correct (wording); severity unsourced | Severity is fixed per finding, not derived from answers or spend | — |
| 23 | Recommendation R-003 "validate ... before sizing any savings opportunity" | master `recommendations` | Correct | Consistent with the evidence gate | — |
| 24 | Terms "Savings Plan", "reservation", "committed-use discount" in CORE-25/31, ADP-03 | master | Correct | Terms match provider products | https://aws.amazon.com/economics/learn-more/ ; https://azure.microsoft.com/en-us/reservations/ ; https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview (carried from the 14 Oct FinOps IQ review; not re-fetched) |
| 25 | CORE-45 "redirect approximately 10%" | master | Not a claim | Scenario parameter; label it as such | — |

For context (Cost IQ cites none of these; they bear on scope): State of FinOps 2026 (released 19 Feb 2026, n=1,192): 98% manage AI spend, 90% SaaS, 64% licensing, 48% data centre. This supports a whole-estate scope. Fielding dates were not stated on the page. https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1. Flexera 2026 State of the Cloud (press release 18 Mar 2026): 29% wasted cloud spend, more than 750 respondents, fielding date not stated. https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows

**Count:** 25 statements: Correct 8 (rows 2, 3, 4, 6, 12, 13, 23, 24); Incorrect 3 (10, 19, 20); Unsourced 12 (5, 7, 8, 9, 11, 14 to 18, 21, plus severity in 22); Outdated 0; not a claim 1 (25); and 1 inconsistent count (1).

## 6. The 105 questions, 20 findings, 10 recommendations, 16 dimensions

**Questions by role** (computed from the config; scored means the engine returns a number for some answer):

| Group | Count | Scored | Notes |
|---|---|---|---|
| CORE-01 to CORE-45 | 45 | 21 (CORE-03/04 numeric bands carry no dimension) | Context, hypothesis and trade-off questions are signal-only by design (CORE-36, 38, 39, 42, 45): acceptable if the report uses them. It does not (CORE-09 hypothesis comparison is configured but not shown; CORE-45 trade-off profile not shown) |
| ADP-01 to ADP-60 | 60 | 0 | Assigned to dimensions but with no scoring map. Only ADP-49 and ADP-50 can activate a finding (F-020). ADP-09, ADP-10, ADP-28 are never shown |
| FIN-01 to FIN-12 (overlay) | 12 | 11 | Never shown on the live page (sections not in any area list) |

Result: 22 scored in the 105; 2 more drive a finding; 81 inert. Of the 102 questions the page can show, 78 are inert.

**Question quality defects** (evidence in `scratchpad` dump of the master; line numbers are in the JSON, which is minified, so cited by ID):
- No question has a `source` or `basis` field. All 105 are Unsourced as content. 65 of 105 (and the 12 FIN) are mapped to Framework capabilities in `capabilityMappings`; the mapping is not shown to the user.
- Answer options overlap or mix scope and maturity: CORE-13 puts "MIXED" (score 55) after six ordered options; CORE-26 mixes a star control with a five-option list.
- Copy errors: seven FIN questions share one worst option unrelated to the question; FIN-05 and FIN-07 have one-word options ("Linked", "Controlled").
- "Unknown" is a first-class answer only in some questions (CORE-05, 26, 31 and the "UNKNOWN" option of about 20 ADP questions) and is not scored as risk; for 12 sliders the config sets `unknown:true` but the page cannot show it, so a required slider forces a number (`cost-iq-v10.html:243`, `:254-259`).
- Coverage of cloud practice is a single multi-select (CORE-25) that scores nothing. Tagging, rightsizing, commitments, storage tiering and anomaly detection each appear only as option text.

**Findings (F-001 to F-020).** 18 are activated by calibration rules on 21 scored questions; F-020 by ADP-49/50; F-017 and F-019 can be activated only through FIN questions (`findingActivationRules`) that the page never asks, so **F-017 (business-led spend) and F-019 (AI economics) are unreachable in the live product.** F-007's first trigger (CORE-26 options) is unreachable. Severity is static.

**Recommendations (R-001 to R-010).** Each is a title, a description and an `ltmService` label; none has scope, owner, duration or value. R-003 is the FinOps hand-off (decision D1).

**Dimensions.** Scored questions per dimension (shown on the live page): COST-03 Cloud Economics 1, COST-05 Infrastructure 1, COST-06 Workforce 1, COST-08 Operations 1, COST-09 Architecture 1, COST-10 Applications 1, VALUE-01 Business Alignment 0, VALUE-06 Business Satisfaction 1. A dimension score rests on one answer in 7 of 16 dimensions and on none in one (VALUE-01); the report prints each as a 0 to 100 score without saying so.

## 7. Report defensibility (area 13)

**Method.** Five illustrative reference clients (no LTM client data; profiles written before running, labelled illustrative, not benchmarks). For each I replayed the page's question selection (`cost-iq-v10.html:46-68,102-108,216-220`), answered every shown question to the profile, ran the real engine (`evaluateCostIq`), and for RC1 rendered the report screen and PDF in Chromium. The AI step was not run (no key); the report uses the page's own fallback (`normalizeAI`, `:351-363`), which is what a client sees when AI fails. What Gemini adds could not be verified.

### 7.1 Sample reports

| Client (illustrative) | Focus areas | Questions shown | Cost IQ / Value IQ | "Confidence" (completeness) | Findings | Recommendations |
|---|---|---|---|---|---|---|
| RC1 EU regional bank: Germany/EU, banking, revenue US$5-25B, tech spend US$100-500M, on-prem + VMware + Azure/AWS | 6 | 64 | 52 / 51 | medium (80%) | 6: F-004, F-018, F-005, F-006, F-011, F-009 | R-009, R-003, R-007, R-005 |
| RC2 US cloud-native software scale-up: tech, revenue US$100-500M, spend US$25-50M, AWS only | 5 | 45 | 63 / 53 | **low (64%)** although every shown question was answered | 5: F-003, F-015, F-007, F-013, F-008 | R-002, R-010, R-004, R-008 |
| RC3 APAC manufacturer, data-centre heavy: India/Japan, revenue US$1-5B, spend US$50-100M | 6 | 68 | 39 / 38 | medium (89%) | 15 of 20 | 10 of 10 |
| RC4 UK public-sector health body, outsourced: spend US$25-50M, managed services + SaaS | 5 | 61 | 40 / 38 | medium (80%) | 14 of 20 | 9 of 10 |
| RC5 global retailer, multi-cloud, 3 acquisitions: revenue above US$25B, spend US$500M-1B | 8 | 67 | 57 / 55 | medium (82%) | 7: F-003, F-015, F-007, F-013, F-006, F-011, F-020 | R-002, R-010, R-004, R-008, R-003, R-007 |

Observations:
- **Cloud findings fire for clients with no public cloud.** RC3 and RC4 said (CORE-23) that public cloud is not material, yet CORE-24 is asked in the "Cloud & SaaS Economics" section and F-005 and F-006 activate. There is no "not applicable" route; CORE-23 is not used by the page.
- **Weak clients get nearly every finding and every recommendation** (RC3: 15 findings, all 10 recommendations), with no ranking by size, so the report cannot say which three matter.
- **The headline differs little between very different estates** (RC1 52, RC5 57) because 7 of 16 dimensions rest on one answer.
- RC2's "low" confidence is an artefact of the focus-area choice: completeness counts the 45 CORE questions, including sections not selected (`costiq-engine-v10.cjs:23-24`).
- RC1 screen text (1280 px): executive summary "The deterministic diagnostic completed successfully. AI narrative generation was unavailable for this run."; each finding shows only "high" or "medium", no description; "Priority value levers" lists Spend Transparency 57, Cost Governance 63, Cloud Economics 46, SaaS 58 (the first four dimensions in config order); every opportunity reads "Confidence: Medium"; roadmap is three fixed horizons (0-30, 30-90, 90-180+ days) identical for every client (`:358`).
- Skipping the weakest answers raises the headline by 2 to 4 points and removes findings (RC3 15 to 9, RC4 14 to 10), and drops confidence to "low". The page blocks skipped required questions, but the API accepts partial answers.

### 7.2 Number trace (RC1)

| Number or label on the report | Engine field | Inputs and formula | Basis | Traceable? |
|---|---|---|---|---|
| Cost IQ 52, Value IQ 51 | `headlines.costIQ/valueIQ` | Mean of non-null dimension scores of that type, weights 1 (`:22`) | Dimension scores; LTM weights | Formula yes; constants unsourced |
| 16 dimension scores (e.g. Cloud Economics 46) | `dimensions[].score` | Mean of scored answers in the dimension (`:15-21`); 46 = CORE-24 answer D | Option score 46, unsourced | Formula yes; basis no; the "1 answer" is not disclosed |
| "Confidence: medium", "Completeness 80%" | `evidence.confidence/assessmentCompleteness` | Answered CORE questions / 45 (`:23-27`) | 90/70 cut-offs unsourced | Formula yes; label misleading |
| "Findings 6" | `findings.length` | Calibration rules | LTM calibration | Yes |
| Finding severity "high" | `findings[].severity` | Static per finding | None | **No** (not derived) |
| Opportunity "Confidence: Medium" | none | Hard-coded string (`cost-iq-v10.html:357`) | None | **No** |
| Roadmap horizons "0-30 / 30-90 / 90-180+ days" | none | Hard-coded (`:358`) | None | **No** |
| Service names under "Next steps" | `recommendations[].ltmService` | Finding to recommendation map | LTM | Yes |
| Heat-map colours (75/55/35) | none | Page thresholds (`:304-309`) | None | **No** |
| Any AI sentence or number | none | Gemini output, ungrounded | None | **No** |

Of 10 number or label types, 4 have no trace and 3 have formula without source.

### 7.3 Assumption register (stated or hidden)

| # | Assumption | Value | Basis today | Confidence | If wrong |
|---|---|---|---|---|---|
| A1 | Option scores | 100/82/64... per question | None | Low | Every dimension moves |
| A2 | Equal dimension weights | 1 | None | Low | Headline moves with mix of answered dimensions |
| A3 | Unanswered dimensions are excluded, not penalised | Code | None | Low | Headline flatters sparse inputs |
| A4 | Completeness = share of CORE questions answered | 45 | None | Low | "Confidence" mislabels |
| A5 | Confidence cut-offs | 90 / 70 | None | Low | Label only |
| A6 | Finding thresholds | e.g. CORE-17 < 50 | LTM calibration | Low | Findings appear or vanish |
| A7 | Finding severity | static | None | Low | Misleads priority |
| A8 | Heat-map colour bands | 75/55/35 | None | Low | Label only |
| A9 | Roadmap horizons and actions | fixed text | None | Low | Not client-specific |
| A10 | Opportunity confidence | "Medium" | None | None | Invented |
| A11 | Capability bands | 60 / 85 | "provisional" | Low | Unused today |
| A12 | Client currency, revenue and spend bands | US$ only | None | Low | Section 12 |

12 assumptions; **12 have no stated ground.** None rests on published data.

### 7.4 Inflation check

| Test | Result |
|---|---|
| Value or saving given? | **No.** Nothing is quantified (`opportunity-recommendation-gates-v7.1.0.json` `numericCalibration: pending`). There is no inflation risk in the engine today |
| Range, confidence, net of cost, ramp, lever caps, double counting, reconciliation | Not applicable now; **all missing** for when a value model is added. The gates say "Addressable Spend x Opportunity Factor x Confidence Modifier" with no factor or base defined, and `avoidDoubleCounting: true` with no mechanism |
| Can a number still reach the client? | **Yes, through the AI.** The report prompt forbids invented savings but nothing checks the output (`handler.ts:140-151`); `opportunities[].description` is printed unchecked (`cost-iq-v10.html:369`) |
| Does the label match? | No: "Illustrative opportunity range" is a label with no range (section 5 row 19); the report heading "Potential value levers" lists recommendation text |
| Reconciles? | Findings to recommendations to services: yes. Findings to value: not applicable |

Verdict: not inflated, because there is no value. That is also why it cannot answer the CFO.

### 7.5 Roadmap and action plan

Three fixed horizons with two actions each, the same for every client ("Validate priority dimensions and evidence gaps", "Build quantified opportunity cases"). No workstreams, owner roles, durations, dependencies, effort, milestones, KPIs, prerequisites or risks, and no link from a finding to an action. A delivery team could not start from it.

### 7.6 Presentation

Missing: situation / issue / recommendation / value summary; methodology and sources; version and date of method (the release string `COSTIQ-0.7.8-DRAFT` is not printed); "data provided by"; disclaimer. Language that reads as sales or hype: "LTM Infrastructure Tech Advisory" next-steps heading; "Concentration heat map: Where management attention is concentrated" over a plain score grid; "Potential value levers"; the mailto "Executive Briefing Request" to a named person (`:331-338`). Developer controls "Load Healthy / Typical / Cost Challenge" are shown on the customer start screen (`:122`). Not a consulting deliverable.

### 7.7 CIO challenge test

| # | Question a CIO or CFO would ask | Answered from the report's pages? |
|---|---|---|
| 1 | "What is the money at stake, and on what basis?" | **No**: no figure exists |
| 2 | "Is Cost IQ 52 good? Compared with what?" | **No**: no benchmark, no scale description, no peer data |
| 3 | "Why is my cloud score 46 when I said cloud is not material?" | **No**: cloud findings fire without applicability |
| 4 | "Which three findings matter most and why?" | **No**: unranked; severity is static; no descriptions |
| 5 | "Who owns each action, by when, at what effort?" | **No** |
| 6 | "What happens to the score if one of my answers is wrong?" | **No**: no sensitivity, and a dimension may be one answer |
| 7 | "Why is this not done by our provider tools, TBM tool or FinOps assessment?" | **No** |
| 8 | "What data of ours did you keep, where, and did an AI see it?" | **No** (free text goes to Gemini; no notice) |
| 9 | "Are these the FinOps Foundation's capabilities and maturity?" | **No** (the overlay is not shown; the 16 dimensions are LTM's and unlabelled) |
| 10 | "How confident are you, and what would raise it?" | **Partly**: "Confidence: medium" and "Completeness" are shown, but they measure questions answered, not evidence |

**Result: 0 answered, 1 partly, 9 not answered. Area 13: Fail.**

## 8. Tests and engine probes

**Existing tests (commit `737490c`, clean export, Node 24):**

| Script | Result |
|---|---|
| `validate:costiq` | pass (117 questions, 16 dimensions, 20 findings, 10 recommendations, 22 capabilities, 4 domains; empty input gives null headlines) |
| `test:costiq`, `test:costiq:hardening` | pass |
| `test:costiq:persistence`, `:lifecycle`, `:adapter`, `:api`, `:service`, `:http`, `:amplify`, `:browser` | pass (8) |
| `test:costiq:report-fallback` | pass |

All 12 pass at `737490c`. In the working tree while CQ1 was uncommitted, `test:costiq:persistence` failed on the schema assertion (`allow.owner()...` no longer present, because CQ1 moved writes to the service). I did not re-run at `2a8142d`: the test must be updated by CQ1 (UNVERIFIED). There is no committed Cost IQ browser e2e at `737490c`; none checks that every question renders. **`npm run audit:engines` does not include Cost IQ** (`packages/engine-core/audit/adapters.ts`), so area 5 cannot pass until it does.

**My probes** (script in scratchpad, not committed):

| Audit property | Result |
|---|---|
| Better answers never score worse | **Pass**: 12,793 single-answer improvements over 300 random questionnaires, 0 violations |
| No dead questions | **Fail**: 81 of 105 (77%) inert; 78 of the 102 shown |
| Every band reachable | Cost IQ ranges 27 to 87 (my all-best answer set gave Cost IQ 87; I did not establish why it is below 100, possibly my choice of star and slider values), Value IQ 15 to 100; random questionnaires give Cost IQ 27 to 75, median 52. Extremes are barely reachable; the page's bands (75/55/35) are not engine bands |
| Missing answers never flatter | **Fail** for the headline: it averages answered dimensions only. Three best answers alone give Cost IQ 100, Value IQ null, completeness 7% "low" |
| Labels match computation | **Fail**: rows 19 and 20 of section 5; "Value areas / priority" shows the first four dimensions; "Confidence" is completeness |
| Findings reachable | **Fail**: F-017, F-019 and one F-007 trigger unreachable on the live page |

## 9. Overlap with FinOps IQ (decision D1)

FinOps IQ v3 (`packages/engine-core/src/accelerators/finops-iq/v3/question-bank.json`, 69 questions, executive and workshop modes, lever-based value model) is now the FinOps accelerator. Cost IQ questions below overlap it; the recommended owner is the one shown.

| FinOps IQ v3 theme (question IDs) | Cost IQ equivalent | Owner under D1 |
|---|---|---|
| Billing data ingestion, normalisation, FOCUS (UN-01, UN-03) | FIN-01 (never shown) | FinOps IQ |
| Private/data-centre cost in the same model (UN-02) | ADP-09..13, CORE-33 (infrastructure) | **Cost IQ** (whole estate) |
| Allocation to owners by cost, policy (UN-04, UN-05, UN-09) | CORE-12, 13, 17, 14; ADP-01, ADP-04 | Split: enterprise allocation in Cost IQ; cloud tags and containers in FinOps IQ |
| Self-service visibility, reports (UN-07, UN-08) | CORE-15; ADP-01 | Cost IQ (executive view); detail FinOps IQ |
| Anomaly detection and explanation (UN-10, UN-11) | CORE-24; ADP-43 | FinOps IQ |
| Forecast, budgets, estimating (QV-01 to QV-04) | CORE-21; FIN-05 | Cost IQ (funding model) and FinOps IQ (cloud forecast accuracy) |
| Unit economics and KPIs (QV-05 to QV-08) | FIN-02, FIN-04, CORE-44 | FinOps IQ for cloud; Cost IQ for technology value |
| Commitments, Spot, enterprise agreements (OP-01 to OP-03, OP-08) | CORE-28; ADP-03; FIN-12; CORE-31 | FinOps IQ (cloud); Cost IQ (all vendor contracts, CORE-37, ADP-44, 47, 48) |
| Rightsizing, idle, non-prod, storage, egress, containers, GPU (OP-04 to OP-07, OP-09, OP-11, OP-12) | ADP-02; FIN-11; CORE-25 (option list) | FinOps IQ |
| Cost in architecture decisions (OP-10) | ADP-05, ADP-45 | FinOps IQ |
| SaaS and licence inventory, BYOL (OP-13, OP-14) | CORE-26, 27, 30; ADP-06, 07, 15, 16 | **Cost IQ** (SaaS and software are whole-estate; FinOps IQ keeps cloud licences) |
| Sustainability (OP-15) | FIN-03 | FinOps IQ |
| Accountable owner, review cadence, backlog (MP-01 to MP-03) | FIN-06; ADP-42 | FinOps IQ |
| Executive alignment, objectives (MP-04, MP-05) | CORE-07, 09, 11, 45; FIN-09 | **Cost IQ** |
| Policy as code, separation of environments (MP-06, MP-07) | FIN-08 | FinOps IQ |
| Education, assessment, tooling (MP-08, MP-11, MP-12) | ADP-42, 43 | FinOps IQ |
| Chargeback and invoice reconciliation (MP-09, MP-10) | CORE-13; FIN-07 | Split |
| Intersecting disciplines (MP-13) | FIN-10; CORE-35..37 | Cost IQ |
| Client's waste guess (HY-01) | CORE-09 hypothesis | Both treat it as a hypothesis |
| Value model | none (Cost IQ has no figure) | One shared lever-based model, FinOps IQ's; Cost IQ imports cloud lines and adds SaaS, licence, vendor, infrastructure and application levers |
| **Cost IQ only** (no FinOps IQ question) | Workforce and sourcing mix (CORE-35, 36; ADP-17, 18), vendor governance (CORE-37, ADP-35, 36), application rationalisation (CORE-39..42; ADP-21..23), investment governance and benefits (CORE-18..22, 44), M&A duplication (ADP-49, 50), data centres, colocation, DR (ADP-11..13, 37, 38), network, security, AI spend visibility (ADP-31, 32) | Cost IQ |

Recommended boundary: Cost IQ keeps whole-estate decisions (what to cut, redirect or protect across SaaS, software, infrastructure, workforce, vendors, applications, investment governance). It asks **one** cloud gate question set (CORE-23, 24, 28 plus a hand-off flag) and routes cloud and FinOps findings to FinOps IQ (R-003, F-005, F-006). Remove FIN-01 to FIN-12 and ADP-01 to 05, 42, 43 from Cost IQ, or keep them as a read-only import of FinOps IQ results. This removes about 20 duplicate questions and gives one waste figure per estate.

## 10. Coverage matrix (draft)

**Dimension x questions** (live page; scored means the answer changes a score):

| Dimension | Assigned | Shown | Scored and shown | In the default 2-area selection (35 questions) |
|---|---|---|---|---|
| COST-01 Spend Transparency | 9 | 7 | 3 | 3 |
| COST-02 Cost Governance | 11 | 6 | 5 | 5 |
| COST-03 Cloud Economics | 9 | 7 | **1** | 1 |
| COST-04 SaaS & Software | 8 | 8 | 3 | 2 |
| COST-05 Infrastructure | 10 | 8 | **1** | 0 |
| COST-06 Workforce | 2 | 2 | **1** | 0 |
| COST-07 Vendor & Commercial | 11 | 10 | 2 | 1 |
| COST-08 Operations | 7 | 7 | **1** | 0 |
| COST-09 Architecture | 5 | 5 | **1** | 0 |
| COST-10 Applications | 6 | 6 | **1** | 0 |
| VALUE-01 Business Alignment | 2 | 1 | **0** | 0 |
| VALUE-02 Investment Effectiveness | 12 | 10 | 3 | 2 |
| VALUE-03 Benefits Realization | 7 | 6 | 2 | 1 |
| VALUE-04 Technology Productivity | 3 | 2 | 2 | 0 |
| VALUE-05 Strategic Agility | 8 | 5 | 2 | 2 |
| VALUE-06 Business Satisfaction | 2 | 2 | **1** | 0 |

Over-weighted: Cost Governance (5 scored of 11), Investment Effectiveness (12 assigned). Thin: seven dimensions on one scored answer, VALUE-01 on none, Workforce with 2 questions in total.

**Focus area x questions** (baseline excluded): Cloud 11 (4 scored); SaaS and Licensing 14 (5); Infrastructure 8 (2); Applications 8 (2); Workforce 6 (2); Vendors 12 (2); Cost Governance 7 (4); Technology Value 9 (2); Architecture 6 (2); **zero scored questions** in FinOps (2), Data (2), Network (1), Security (1), AI (2), Transformation (2), Business-led IT (2), M&A (2, drives F-020 only), Geography (2), Operations (4). Baseline: 22 questions, 9 scored.

**Customer profile coverage:**

| Profile attribute | Coverage today |
|---|---|
| Size | Revenue and spend bands (CORE-03/04), US$ only; not used by any score or finding |
| Industry | CORE-02 asked (12 options), not used; ADP-28 "Regulated Industry" never shown |
| Region | Two Geography questions (ADP-51/52), zero scored; no jurisdiction, currency or regional norm |
| Cloud mix | No provider or platform question; CORE-23 is not used; cloud depth is five questions, one scored |
| On-premises share | Presence only (CORE-01/23); no share or lifecycle question except ADP-11/12/37 (not scored) |
| Operating model | Workforce and sourcing: CORE-35/36 (one scored) |

The owner's aim (even coverage) is not met: for RC3 (on-prem) the report is driven by governance answers and one infrastructure answer; for RC2 (cloud-native) by one cloud answer. **Proposed target:** at least 4 scored questions per dimension, at least 2 per focus area, and every shown question either scored or explicitly flagged as context.

## 11. UI, layout and accessibility

Rendered at `737490c` in Chromium with the real engine behind mocked routes (scratchpad `shots/`, 16 screenshots; the CQ1 page was not rendered).

| Width | Home | Question | Results/report | Notes |
|---|---|---|---|---|
| 360 | no overflow | no overflow | **page scrolls sideways** (scroll width 379 vs 360): four `chart-card` boxes exceed the viewport; radar labels are clipped | single column; heat-map two columns |
| 768 | ok | ok | ok | |
| 1280 | ok | ok | ok | content column 1180 px |
| 1920 | ok | ok | ok | column fixed at 1180 px, centred (370 px margins); body does not stretch |

Observations:
- **Width:** a fixed maximum (1180 px) works at 768 to 1920. The 360 px overflow comes from chart containers that do not shrink (`.chart-card`, `cost-iq-v10.html:16`). A stray CSS block after the 850 px media query is malformed (`}{.assessment...`), harmless but sloppy.
- **Professionalism:** the page has its own red palette and gradient hero, not the shared Vantage work-page palette (only the top bar uses `vantage.css`). The assessment lists a question ID on every card ("CORE-12 · QUESTION 1 OF 4"); progress counters are inside a dark rail; sections render several questions per screen, which works but is long (up to 7,459 px tall at 360). Emoji appear in the platform's launcher, not on this page. The "Developer test data" panel is shown to customers.
- **Accessibility (axe, WCAG 2.0 A/AA, 1280 px):** colour contrast fails (1 node on home, 10 on the report; `serious`). Keyboard: **0 of 52 answer options are focusable** (they are `div`s with `onclick`, no role or tabindex), so a keyboard-only user cannot answer. Stars and ranking use buttons and divs inconsistently. Sliders have no visible "Unknown". Charts have no text alternative (canvas only; the heat map duplicates the data as text, which is good). Reduced-motion is not respected (splash and pulse animations).
- **Console:** no uncaught errors; only the mocked AI failure and blocked fonts in my harness.

## 12. Global coverage: what to add, remove or change (owner question, 3 Nov 2026)

**What I verified**
- Revenue and spend bands are US dollars only: CORE-03 and CORE-04 (`master-v6.6.json`, option labels "Below US$100M" and so on). Neither feeds any score, finding or the report.
- The persistence schema already has `clientCurrency` (`amplify/data/resource.ts:106`) but no question or page element sets it.
- CORE-02 has 12 industries (Banking/Financial Services, Insurance, Healthcare/Life Sciences, Manufacturing, Retail/Consumer, Energy/Utilities, Telecommunications, Technology, Travel/Transportation, Public Sector, Professional Services, Other). Nothing reads the answer. For reference, the UN's ISIC Rev. 5 has 22 sections; the 12 are a pragmatic buyer list, not a classification, and omit for example agriculture, mining, construction, education, media. Source: https://unstats.un.org/unsd/classifications/Family/Detail/2095 (checked 3 Nov 2026).
- Geography is two questions (ADP-51 regional cost variation; ADP-52 regional standardisation), neither scored, shown only if the "Geography" area is selected.
- No question mentions FX exposure, onshore/offshore/nearshore delivery, local labour cost, data-residency or sovereign cloud cost premium, local tax or regional pricing. `CORE-36` (external workforce share) and ADP-17, 18, 35, 36 cover sourcing mix but not location.
- There are no benchmarks or regional norms in the engine (section 5), so no regional benchmark needs correcting; none exists to be wrong.

**Recommended changes (judgement)**

| Area | Change | Type |
|---|---|---|
| Currency | Add a client reporting currency question (USD, EUR, GBP, INR, SGD, AUD, JPY, other). Show revenue and spend bands in that currency, or as ranges stored with the currency code; bands as percentages of revenue need no FX. Carry `clientCurrency` into the saved record and the report. No conversion unless the client asks, then with a dated reference rate in the assumption register | Change CORE-03/04, add 1 question |
| Spend as share of revenue | Derive "technology spend as % of revenue" from the bands only as a range and label it indicative; do not compare with a peer figure unless a sourced published figure is cited | New derived field |
| FX exposure | Add one question: share of technology spend contracted in a currency other than the reporting currency (cloud, SaaS, vendors, offshore labour), with Unknown | Add 1 question, feeds vendor and commercial dimension |
| Geography depth | Move Geography from an optional area to a baseline pair: countries or regions where technology spend is incurred (multi-select), and share outside the home region. Score ADP-51/52 or fold into an operating-model dimension. Add regional sourcing or data-residency constraints as a signal question for feasibility, not as legal statements | Promote and add 2 questions |
| Industry | Keep the list but use it: route regulated-industry questions (ADP-28) and set sector-specific finding wording. Replace "Other" with a short free text; align to a published classification (ISIC Rev. 5 sections, or NACE for EU use) in the question's basis | Use existing answer; add basis |
| Onshore/offshore | Add one question on the share of technology workforce capacity by delivery location (home region, nearshore, offshore) alongside CORE-36, and labour-rate dispersion as a signal | Add 1 question |
| Cloud and sovereign mix | Add a provider-neutral cloud footprint question (hyperscaler, regional/sovereign provider, private cloud, on-premises share bands) that routes to FinOps IQ and to Sovereign IQ where relevant; no named-provider options in scored answers | Add 1 question |
| Regional benchmarks | **Do not add** until a published source with method and sample exists for each region; show "no regional benchmark available" rather than a number | Remove risk |
| Wording | Replace US-centric terms where present (US$ only; "Public Sector" as one entry spanning very different regimes) with neutral wording | Change |
| Engine and scoring | (a) The engine is currency-agnostic today because it scores no money; keep it so. (b) Any future value model must take amounts in the client currency and apply percentage levers, so no engine change is needed for currency. (c) Applicability routing (section 7.1) is the one engine change that global clients need most: a client with no public cloud, no SaaS or no on-premises estate should not receive findings about it | Engine: add applicability |

**What I could not verify**
- Whether a global sample of clients answers the existing questions as intended: there is no client data (FRAMEWORK.md, "Data").
- Regional price or labour-cost norms: no trusted primary source was searched for, because the engine has none to correct.
- Whether Amplify hosting or the API restricts any region or currency (not in the repository).
- Whether Sovereign IQ or Cloud IQ already collect footprint and geography answers that Cost IQ could import (not reviewed here).
- Legal or tax treatment of cross-border technology spend: out of scope for this review and for CD5; it needs counsel before any statement is added.

## 13. Distinctness

**Decision it informs (proposed, for the owner to accept):** "Where should we cut, redirect or protect technology spend across the whole estate over the next 12 to 24 months?" Buyer: CIO with CFO.

| Alternative | What it gives | Cost IQ edge (to be built) |
|---|---|---|
| TBM Council taxonomy and TBM tools | Standard cost-pool, tower and solution model for whole-estate IT cost; version 5.0.1 listed as latest (https://www.tbmcouncil.org/taxonomy/, checked 3 Nov 2026) | A short, consultant-led diagnostic that maps answers to that taxonomy and finds where to look, without a model build; needs a mapping of the 16 dimensions to TBM towers |
| FinOps Foundation Framework and assessment (CC BY 4.0) | Per-capability Crawl/Walk/Run for cloud and other scopes | Whole-estate reach (State of FinOps 2026: 90% asked to manage SaaS, 64% licensing, 48% data centre); the FinOps depth belongs to FinOps IQ |
| Provider tools (AWS, Azure, Google recommendations) | Resource-level savings for one provider | Cross-estate prioritisation and decision rights; provider output becomes evidence |
| Analyst IT-spend benchmarks | Peer comparison | Not offered; Cost IQ must not present peer data as its own |

The edge is not written on the page today. It is only true once the scoring covers every shown question and a value model exists.

PENDING: sections 3, 14 and 15.

