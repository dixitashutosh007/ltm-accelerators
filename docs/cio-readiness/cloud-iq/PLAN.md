# Cloud IQ: phased plan

**Date:** 5 Nov 2026  **Status:** proposed by `cloud-modernization-lead` after the [validation report](VALIDATION.md) (CL0). Not yet approved. The product owner approves; I advise and do not sign off. Items marked **[OWNER]** need an owner decision or answer; items marked **[AWS]** need a real AWS account (the LTM account, or the current development account) to verify.

**Starting point (verified 5 Nov 2026, commit `99e6d90`).**

| Fact | Where |
|---|---|
| One page, 3,377 lines: 40 questions in 12 groups, 8 dimensions (D1 to D8), Executive Flash (32 questions) and Workshop (40) modes, 8 consultant probes, heatmap, radar, 4-phase roadmap, 6 offerings, rule-based memo, boardroom slides | `Accelerators/cloud-iq.html`, `knowledge-base.json` v2.2 |
| Scoring on the server behind the accelerator access check; the page does not score locally | `amplify/functions/evaluate-cloud-iq/handler.ts`, `cloud-iq.test.ts:96` |
| Progress saves to the account (shared component, owner or Admin, 90 days, My sessions, resume, delete) | `assets/saved-sessions.js`, `manage-session/handler.ts` |
| Money figure ("annual cost leakage") and sector "peer medians" computed in the engine from unsourced constants | `evaluate.ts:339-358`, `knowledge-base.json` `benchmarks` |
| Browser AI to OpenAI, Gemini and Anthropic with a key in `localStorage`; the site CSP allows the three hosts | `cloud-iq.html:2064-2152, 2739-2800`, `customHttp.yml:14` |
| Browser jsPDF report (3 to 4 pages), static sample report with promises and numbers the engine cannot produce | `cloud-iq.html:3145-3325`, `cloud-iq-sample-report.html` |
| Tests: 1,301 pass across 51 files; Cloud IQ has 26 unit tests, goldens (regression, not approved), the scoring audit adapter and 2 browser tests | `npx vitest run`, `npm run audit:engines`, `tests/e2e/cloud-iq.spec.ts` |
| Claims register: 32 Cloud IQ rows, all `unreviewed` | `docs/claims-register/claims-inventory.csv` |

**Goal.** Cloud IQ passes all 13 scorecard areas ([FRAMEWORK.md](../FRAMEWORK.md)) and reads as a consulting-engagement accelerator for the placement decision, not a questionnaire with a savings number.

**Proposed purpose (D1, owner to accept).** The decision it informs: "Where should each class of our workloads run (public cloud, sovereign or private cloud, on-premises) over the next 24 to 36 months, what must be true first, and in what order do we move?" Buyer: CIO with CTO and CFO.

**Proposed boundary (D1 to D3, owner to accept).**
- Cloud cost value belongs to FinOps IQ (one-figure rule, [cost-iq/BOUNDARY.md](../cost-iq/BOUNDARY.md) section 3). Cloud IQ shows FinOps IQ's cloud line when linked, or "Not quantified. Run FinOps IQ".
- Data-centre capacity, exit velocity and dispositions belong with Modernization IQ; the split waits for that accelerator's own review.
- Disaster recovery goes to Resilience IQ (decision D12 of 27 Oct 2026). Sovereignty obligations go to Sovereign IQ; Cloud IQ keeps landing-zone control maturity and a placement constraint.
- Cloud IQ keeps: placement and operating-landscape policy, migration and modernisation capability, hybrid and multi-cloud operations, platform engineering, landing-zone guardrails, data and AI platform readiness, and the pull-through chain.

## Pull-through (the engagement path)

| Stage | Practice (generic) | Type | What the finding leads to |
|---|---|---|---|
| Cloud strategy | Cloud Transformation (advisory) | Advisory | Placement policy, target landscape, business case, sequencing; follow-on sovereign or FinOps work through the matching IQ |
| Landing zone and platform engineering | Cloud Transformation / Platform Engineering | Implementation | Landing zone, guardrails as code, identity, network, golden paths |
| Migration factory and application modernisation | Cloud Transformation / Application Modernisation | Transformation | Wave planning, factory pipeline, dispositions across the seven Rs, DC exit hand-off |

Providers appear only as options chosen from the client's requirements, with alternatives (including sovereign and regional providers and on-premises platforms). No partner claims.

## Quality bar for every phase

Restated from the Cost IQ plan; checked at each gate.

| Rule | How it is checked |
|---|---|
| Every claim, constant and range has a claims-register ID with source, year, sample, owner and review date; published data is never presented as LTM peer data | Claims CI; a number with no ID fails the build |
| Assumptions are stated in the report's register with value, basis, confidence and what changes if wrong | Report test fails on an unregistered assumption |
| Sources and method are in the report | Report test |
| Money appears only as a ranged, netted, phased line imported from FinOps IQ, never computed here | Single-figure guard in CI (CL4) |
| No hype, no promise, no emoji; British spelling | Language lint (S2) |
| Engine audit, goldens, browser tests with no console errors; `cloud-modernization-lead` reviews the diff | CI; review recorded in the PR |
| One shared shell; an even content column from 360 to 1920 px; keyboard and contrast | Playwright at four widths, axe |
| Even coverage across customers: size, sector, region, cloud mix, on-premises share; no finding depends on one provider | Coverage matrix (CL3) and reference clients (CL4) |

## Phases

### CL0: Validate (this report; no code change)
- Scored on 13 areas: 0 Pass, 5 Partial, 8 Fail. Four Critical, ten High, eight Medium findings.
- Deliverables: `VALIDATION.md`, this plan.

**Gate:** the owner reads the findings and answers decisions D1 to D13 in `VALIDATION.md` section 10. The later phases are re-cut from the answers (as Cost IQ was after CQ0).

### CL1: Containment (small; start now, before any content work)
Objective: stop client data and promises leaving the platform while the rebuild is planned. Each item is small and independent.
- **Remove all browser AI** from `cloud-iq.html`: the provider selector, key boxes, `localStorage` keys (clear any stored `cloud_iq_openai_key` and model on load, as Posture IQ did), the three fetch calls, the "Prompt pack" copy, the "Configure ChatGPT / OpenAI Key" modals. Keep the rule-based memo for now. Add a `check:repo` rule that fails if a browser AI vendor host appears in the page. Remove the three vendor hosts from `customHttp.yml` only after Modernization IQ and Strategy IQ are done (they carry the same code); track that in the S1 plan.
- **Withdraw or neutralise the sample report** (D6): remove it from `Accelerators/` and from any link, or strip every promise and mark it "illustrative, not a forecast" until it is regenerated in CL5. Remove the "Posture IQ" reference.
- **Escape client-supplied text** in every `innerHTML` template (H6) and add a unit test with a hostile client name and imported .ciq file.
- **Hide the money line and the peer comparison** from the result screen, the memo, the PDF and the slides until CL4 settles them (D3, D4), or label them "LTM illustration, not data" if the owner chooses option (b) of D4.
- **Remove the lead-gen unlock** (D7) and the hard-coded author and e-mail (use the signed-in user).
- Remove the untracked `.bak` files from the working tree.

**Dependencies:** S1 (only for the later narrative, not for removal). **[OWNER]** D3, D4, D5, D6, D7.
**Gate:** a test proves the page contains no browser AI host, key storage or unescaped client text; the result screen shows no peer comparison and no leakage amount (or the owner-approved label); the sample is gone or neutral.

### CL2: Boundary, one live artefact, one version
Objective: decide what Cloud IQ is before any question is rewritten (the Cost IQ lesson: CQ3a before CQ3b).
- Write `BOUNDARY.md` in this folder: every Cloud IQ question, finding and move against FinOps IQ, Modernization IQ, Resilience IQ, Sovereign IQ, Cost IQ and AI Readiness IQ, with verdicts keep / move / hand off / delete and an owner decision per row. Needs the Modernization IQ practice-lead read for D6 and Q3.1 (joint, **[OWNER]** D2).
- Page reads the question bank from the engine (one source); delete the page copies of the questions, the probes and the unused benchmarks (H10). A test compares wording, not only `id:type:count`.
- One version and one date in the page, the API result and the report; KB `meta.updated` tied to a review.
- Hand-off design: Cloud IQ imports a read-only FinOps IQ summary (the Cost IQ contract `finops-iq-cost-summary/1`) and shows "Cloud and FinOps" as a panel; context facts (sector, currency, countries, footprint) are shared, never typed twice.

**Dependencies:** owner decisions D1, D2, D3, D11; S8. **[OWNER]**
**Gate:** owner approves `BOUNDARY.md`; a test fails if the question count in the page, the API and the KB differ.

### CL3: Content integrity and sources (S2)
Objective: every shown question is requirement-first, sourced and answerable by a CIO from any estate.
- Rewrite each retained question with a basis (AWS, Microsoft or Google framework, FinOps Foundation, or an LTM heuristic with reasoning), non-overlapping options, "Unknown" (rated as risk) and "Not applicable" where the estate can lack the thing; remove cloud-only ladders (D9, H1).
- Migration dispositions use the seven Rs with attribution; "Relocate" included (D10).
- Regulation becomes a context question by market (EU, UK, US, APAC, plus Switzerland and India), no pre-selection, no flag from a pre-ticked box; the sovereign move and probe depend on a stated placement constraint, not on a statute list (D11). Counsel reviews any statement (**[OWNER]** for counsel).
- Label D1 to D8 as LTM's and map them to the AWS CAF perspectives, the Microsoft CAF phases and the Well-Architected pillars; add the missing People and Business-value coverage (D12). Add context questions from GLOBAL-COVERAGE: reporting currency, countries, onshore/offshore mix, and the extra industries (software, education, media separate from telecom, natural resources).
- Register every constant and claim (spend midpoints if kept, thresholds, band cut-offs, track rule, weights) in the claims register by ID, with source or "LTM heuristic" and reasoning; remove the 72 benchmark constants (D4). Replace "6-R" titles, remove unsourced roadmap claims ("up to 60-70% coverage", "Typically raises...").
- Coverage matrix: dimensions against question count, customer profile and region; at least 4 scored questions per dimension in Workshop and 2 in Executive; every shown question scored or labelled context.

**Dependencies:** CL2; S2; S3 (for the Rs and platform wording). **[OWNER]** D8 to D12.
**Gate:** zero unsourced claims in CI; coverage matrix reviewed by the owner; the dimension map published.

### CL4: Engine and scoring audit
Objective: a score that means something, and no money computed here.
- Remove `totalLeakage`, `leakLow`, `leakHigh`, `decomp` and every "Locks in $" or "reclamation" impact line. Add the **single-figure guard** as in Cost IQ (`cost-iq-single-figure.test.ts`): the build fails if a Cloud IQ output carries a money-like field or a FinOps IQ lever ID, checked on 300 random answer sets.
- If the owner chooses to keep an estimate (D3 option b), it must be a FinOps IQ import: ranges by case, net of delivery cost, phased over years, capped at in-scope spend and at the published average, with confidence. No Cloud IQ formula.
- Replace the 2.5 placeholder with "not assessed"; a minimum number of scored answers per dimension before a dimension and the headline show; headline confidence from answers shown, not asked.
- Applicability routing from the footprint (public cloud present or not, on-premises present or not, sovereign provider in use or not): findings and moves for an estate that has none of the thing do not fire.
- Rework the track rule so it discriminates (62% hybrid on random answers today) or retire the track.
- Reference clients from public case studies and the four illustrative clients in `VALIDATION.md` section 6.1 as a starting set; goldens approved by the owner and `cloud-modernization-lead`.
- Audit: keep Cloud IQ in `audit:engines`; add the properties missing today (every question moves something or is context; every band reachable by random answers within a stated tolerance; blank answers never flatter, including the dimension placeholder; monotonic per dimension). Resolve the 13 headline-dead questions: score, route, or label as context.
- Sensitivity shown: for each headline, the three answers that move it most.

**Dependencies:** CL2, CL3; FinOps IQ summary contract (S2/S4 shared); S8. 
**Gate:** `npm run audit:engines` passes with the new properties; goldens approved; single-figure guard green; no unrouted finding for the four reference estates.

### CL5: The report (S4)
Objective: a consulting-grade, server-rendered report with a trace for every number.
- Shared renderer and model (the FinOps IQ / Cost IQ / Sovereign IQ report): executive summary (situation, issue, recommendation, value with its basis or "not quantified"), findings (with the answers that raised them and the evidence needed), placement view by workload class, roadmap, How LTM can help, technical execution, methodology, sources, assumption register, "How we calculated this", version and date, "data provided by", disclaimer, coverage statement (G3). Client edition and consultant edition (appendix: answers, probes, notes). Backlog CSV with the offering type column.
- Replace the browser jsPDF code and the CDN script tags; the page downloads from a report service (access check, owner or Admin, completed sessions only), as `cost-iq-report`.
- Report checks: required sections and notices, every traced number re-read from the engine result, no internal IDs in the client edition, no banned phrase.
- **Trace test:** every number maps to an engine field and an assumption or claim ID. **Reconciliation test:** totals equal parts where totals exist. **Inflation guard:** fails if a money figure appears that is not the imported FinOps IQ line, or the line exceeds its stated cap.
- Regenerate the sample report from the engine on a reference client (D6); it is a build artefact checked against the engine, not hand-written HTML.

**Dependencies:** CL3, CL4; S4; shared report code. 
**Gate:** the ten CIO challenge questions are answered from the report's own pages; report tests pass; the sample reproduces from its answer set byte for byte.

### CL6: Roadmap, offerings and technical execution (S3, S5)
Objective: a delivery team can start from the roadmap, and each finding leads to a typed engagement.
- Delivery-grade roadmap: workstreams (placement and strategy; landing zone and guardrails; platform engineering; migration factory and application modernisation; hybrid operations; data and AI platform), each with activities, client owner role, LTM role, duration and effort ranges, dependencies, milestones, KPIs, prerequisites and risks; every item traces to a finding. Durations and effort are stated planning heuristics until delivery actuals exist (as Cost IQ A-11).
- "How LTM can help" for every finding, typed advisory, implementation or transformation, with indicative scope; generic practice names; the pull-through chain above. Consultant-only draft statement of work, marked not a quote.
- Platform playbook entries (S3) per platform and level (platform, tech stack, application), each with a verification step and a vendor documentation page that was opened: AWS, Azure, Google Cloud, on-premises (VMware, Nutanix, OpenShift) and sovereign or regional providers, as options chosen from the client's requirements with alternatives. Application level states the extra discovery needed. Landing-zone entries cite the provider's own framework (AWS landing zone and CAF, Microsoft CAF "Ready", Google Cloud Well-Architected). Migration entries use the seven Rs. **[AWS]** The AWS verification steps (for example account structure and guardrail checks) need a real account to confirm they run as written.
- Cost steps stay in FinOps IQ; DC capacity and exit steps stay in Modernization IQ; recovery steps stay in Resilience IQ; obligations stay in Sovereign IQ. Cloud IQ points to them.

**Dependencies:** CL5 structure; S3, S5. **[OWNER]** D13 (platform scope), offering types, who confirms heuristic ranges.
**Gate:** every finding maps to an offering and a playbook entry, or is marked "not mapped" with the reason.

### CL7: Experience and layout (S7)
Objective: one shared Vantage shell and a 15 to 20 minute executive mode.
- Move onto the shared shell and work-page palette; remove the splash intro, "Kavach" styles, `alert()` and `prompt()` (inline messages and a session form), the boardroom slide mode unless it is built from the same report model.
- Modes on one engine: Executive (15 to 20 minutes, measured, not asserted; every dimension scored by at least 2 questions) and Workshop (full depth, follow-ups triggered by answers, probes feeding findings). Client mode hides scoring internals, probes and consultant notes. Step names are the stage values saved with each session.
- Accessibility: keyboard use for every answer type (cards, rank, slider, multi), focus order, contrast, labels, reduced motion; an axe run on start, question and result screens; layout at 360, 768, 1280 and 1920 px; screenshots for the owner.

**Dependencies:** CL2; S7. 
**Gate:** Playwright layout and axe checks pass at four widths; owner reviews screenshots.

### CL8: AI scope (S1)
Objective: the narrative, if wanted, is server-side, grounded and off by default.
- Reuse the Cost IQ pattern (`cost-iq-narrative` and worker, `ai/grounding.ts`): Bedrock only, off twice over (service flag and per-engagement switch), fed scores, findings and recommendations only (no answers, no client name, no figures, no notes), grounding check that rejects any number or vendor name not in the input and any promise, prompt and output log.
- Probe notes never reach the model.
- Eval set and adversarial cases in CI with a stub model. **[AWS]** The live eval on Bedrock needs the model enabled in the account and has not been run for any accelerator.
- Remove the three vendor hosts from `customHttp.yml` once the three pages are clean (shared with Strategy IQ and Modernization IQ).

**Dependencies:** S1; CL1 (browser AI already removed). **[AWS]** live eval and permissions. **[OWNER]** approve the data-notice AI sentence.
**Gate:** grounding passes on the eval set; the repo guard shows no browser AI host anywhere.

### CL9: Data protection and legal (S6)
- A Cloud IQ data notice from the shared notices source: hosting (Mumbai), transfer basis for EU and UK clients, what is held (client name, answers, probe notes, any AI narrative), retention (the rule decided in D8) and deletion on request, access logs, AI statement. The notice is shown before the first question and printed in the report.
- Remove or clearly label the .ciq export (sensitive file on disk); state the PDF archive retention.
- "Not legal, financial or procurement advice" disclaimer in page and report; coverage statement of jurisdictions assessed and not assessed (G3). Counsel reviews any regulatory statement before external use (**[OWNER]**).
- Prices quoted, if any, are dated and linked to the provider page.

**Dependencies:** CL5; S6. **[OWNER]** wording and counsel.
**Gate:** notice approved by the owner; counsel review recorded where a regulatory statement remains.

### CL10: Hardening
- Full-flow browser test against the real services with in-memory store: start, answer every question type, save, leave, resume, complete, download the report, delete; no page errors; render-every-question check; AI-absence check.
- Security review of the evaluate route, the saved-session path and the report route: access matrix test; the stored-XSS test from CL1 stays; CSP tightened; third-party scripts self-hosted or pinned with integrity attributes.
- Load check of the evaluate endpoint and the report build at realistic size. **[AWS]** Through API Gateway and Lambda is not measurable locally.
- Final CIO challenge test and accessibility run.

**Gate:** CI green; no open Critical or High finding.

### CL11: Re-review and release
`cloud-modernization-lead` re-scores all 13 areas against the scorecard with evidence, reruns the report defensibility audit on the reference clients, the ten CIO questions and the content verification table. Cloud IQ is CIO ready when all 13 pass, or the owner accepts any Partial in writing. The release label moves from draft to an approved number only here.

Target scorecard at CL11:

| # | Area | Today | Needed to pass |
|---|---|---|---|
| 1 | Purpose and distinctness | Partial | D1 accepted; edge written (EDGE.md as for Cost IQ); boundary implemented |
| 2 | Functionality | Partial | Server report and backlog; full-flow and render-all tests; no dialogs; console clean |
| 3 | Questions and answers | Fail | CL3 complete |
| 4 | Depth | Partial | CL7 modes; follow-ups feed findings |
| 5 | Scoring engine | Partial | CL4 audit properties; goldens approved |
| 6 | CIO alignment | Fail | Findings end in decision, owner, time frame |
| 7 | Output | Fail | CL5 |
| 8 | Sources | Fail | CL3 register, CI on review dates |
| 9 | Legal validity | Fail | CL9 |
| 10 | AI scope and toggle | Fail | CL1 and CL8 |
| 11 | Technical execution | Fail | CL6 |
| 12 | Commercial pull-through | Partial | CL6 |
| 13 | Report defensibility | Fail | CL5 trace, assumption register, ranges, ten questions answered |

## Order and dependencies

| Phase | Depends on | Shared workstreams | Can start |
|---|---|---|---|
| CL0 | none | S8 | done |
| CL1 | owner D3 to D7 | S1 (later) | now |
| CL2 | CL0 decisions D1, D2, D3, D11; Modernization IQ read | S8 | after CL0 gate, beside CL1 |
| CL3 | CL2 | S2, S3 | after CL2 |
| CL4 | CL2, CL3; FinOps IQ summary contract | S2, S4, S8 | after CL3 (guard can start with CL2) |
| CL5 | CL3, CL4 | S4 | after CL4 |
| CL6 | CL5 structure | S3, S5 | beside CL5 |
| CL7 | CL2 | S7 | after CL2 |
| CL8 | CL1 | S1 | any time after CL1 [AWS] |
| CL9 | CL5 | S6 | after CL5 |
| CL10, CL11 | all above | S8 | last |

## Owner decisions (proposed; answers are the owner's)

| # | Decision | Recommended default | Needed by |
|---|---|---|---|
| D1 | Purpose, buyer, edge | Placement and cloud-readiness diagnostic; CIO with CTO and CFO | CL2 |
| D2 | Modernization IQ boundary | Cloud IQ keeps placement and a footprint screen; confirm after the Modernization IQ review | CL2 |
| D3 | Leakage figure | Remove; FinOps IQ line or "Not quantified" | CL1 |
| D4 | Sector peer benchmarks | Remove | CL1 |
| D5 | Browser AI | Remove now; Bedrock narrative later | CL1 |
| D6 | Sample report | Withdraw now; regenerate from the engine | CL1 |
| D7 | Unlock gate | Remove | CL1 |
| D8 | Retention | One rule for all accelerators (owner to state) | CL9 |
| D9 | Question ladders | Requirement-first | CL3 |
| D10 | Migration framework | Seven Rs | CL3 |
| D11 | Regulatory content | Context by market; sovereignty to Sovereign IQ; counsel | CL3 |
| D12 | Dimensions | Keep as LTM constructs, labelled and mapped; add People and Business value | CL3 |
| D13 | Playbook platform scope | AWS, Azure, Google Cloud, on-premises, sovereign or regional | CL6 |

## What needs a real AWS account or the owner

| Item | Phase | Why |
|---|---|---|
| Live Bedrock narrative eval; model access; asynchronous worker timing | CL8, CL10 | Needs the model enabled and credentials; unrun for every accelerator |
| Data deploy for any new field, TTL / retention sweep, S3 report archive | CL5, CL9 | Behaviour in a real account is not verified here |
| Access check on the evaluate route and report route under a real authorizer | CL10 | Tests use fakes |
| Landing-zone and migration playbook verification commands | CL6 | Steps must be run against a real account to confirm they work as written |
| Owner decisions D1 to D13, wording approval, counsel review of regulatory text | CL1 to CL9 | Cannot be supplied by the practice lead |
| EDGE.md answers: named buyer, unaided CIO use, the engagement it opens | CL2, CL11 | The recommendation cannot supply them |


## Owner decisions (5 Nov 2026) and CL1 progress
- **Decisions:** the owner accepted the reviewer's defaults for D1 to D7 and D9 to D11: Cloud IQ is a placement and cloud-readiness diagnostic with a short footprint screen that hands off to Modernization IQ (D1, D2; Modernization IQ's review to confirm); the leakage figure is removed and cloud value comes from FinOps IQ (D3); sector peer benchmarks are removed (D4); browser AI is removed, narrative later on the shared Bedrock service (D5); the sample report is withdrawn and regenerated from the engine in CL5 (D6); the lead-generation unlock is removed (D7); requirement-first ladders, seven Rs, regulation as a context question by market (D9 to D11). **D8 (retention):** the reviewer asked for one rule for all accelerators; I applied **24 months** everywhere, matching Cost IQ and the other services, so saved sessions now expire 24 months after the last save (was 90 days). The owner can change it in one place (`finops-iq/v3/retention.ts`).
- **CL1 done (page):** all browser AI removed (selector, key boxes, three vendor calls, prompt pack, Studio drawer, key modal) and any key left in the browser is cleared on load; the rule-based memo stays; the sample report is deleted and its two links removed; the leakage figure and its breakdown, the peer comparison and the peer series on the radar are gone from the result screen, the memo, the boardroom slides and the PDF, replaced by "Cloud cost value: not quantified here, FinOps IQ works it out once"; the lead-generation gate, consultant unlock, hard-coded author and e-mail are gone; text typed by the client or consultant, or inside an imported session file, is escaped (a hostile name no longer runs script: found and fixed by the new test); `check:repo` now fails if Cloud IQ or Cost IQ contain a browser AI vendor host.
- **CL1 not done:** the three `.bak` files in `Accelerators/` (ignored by git, so not in the repository) are left for the owner to delete; the vendor hosts stay in `customHttp.yml` until Modernize IQ and Strategy IQ are cleaned the same way; the engine still computes leakage and peer figures (removed in CL4, until then the page does not show them).
