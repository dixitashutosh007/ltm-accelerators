# Cost IQ and FinOps IQ: boundary (CQ3a)

**Date:** 3 Nov 2026  **Author:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves. Nothing in the code or any other file was changed to produce this.

**Owner decision applied (3 Nov 2026, PLAN.md CD4):** Cost IQ keeps the whole estate. FIN-01 to FIN-12 and cloud-practice depth move to FinOps IQ. Cost IQ shows one waste/value figure per estate, shared with FinOps IQ, never a second one.

**Short names used below.** `M` = `packages/engine-core/src/accelerators/cost-iq/canon/config/master-v6.6.json`. `O` = `.../canon/config/finops-overlay-v7.1.0.json`. `CAL` = `.../finding-activation-calibration-v7.1.1.json`. `GATES` = `.../opportunity-recommendation-gates-v7.1.0.json`. `PAGE` = `Accelerators/cost-iq-v10.html` (current line numbers, after CQ1). `QB` = `packages/engine-core/src/accelerators/finops-iq/v3/question-bank.json` (FinOps IQ question IDs are unique keys). `DESIGN` = `docs/cio-readiness/finops-iq/design/DESIGN.md`. `VAL` = `docs/cio-readiness/cost-iq/VALIDATION.md`.

**How I verified.** I read the files above and ran the real engine function `scoreQuestion` (in `canon/costiq-engine-v10.cjs`) over every question to see which ones can return a score. I did not run the page in a browser. Statements about external frameworks and published figures are carried from VAL section 16 (checked 3 Nov 2026) and not re-fetched; this document makes no new external claim.

---

## 0. Findings that change the plan

These came out of reading the code and are not in VAL or the PLAN. They affect how CQ3b is cut.

1. **The default run shows seven cloud/FinOps questions that change nothing.** The default focus areas are Cloud Economics and Cost Governance (`PAGE:48`). Cost Governance includes the `FinOps` section (`PAGE:56`), so ADP-01 to ADP-05, ADP-42 and ADP-43 are all in the default 35-question set. None of the seven scores. Of the 35, 13 score and 22 do not (my run of `scoreQuestion` over the 105; VAL section 6 gives the same 22 for the whole bank).
2. **Deleting the FinOps overlay file as a whole would break two non-FinOps questions.** `O` also holds `questionScoringOverrides` for CORE-40 and CORE-43 (`O` key `questionScoringOverrides`), and the engine reads it (`costiq-engine-v10.cjs:34`). Those two overrides, and the F-012/F-014 activation they feed, must move into `M` or `CAL` before the overlay is cut down. The engine also merges `O.supplementalQuestions` into the question list (`costiq-engine-v10.cjs:33`), which is the whole reason the API returns 117.
3. **FinOps IQ's pre-fill design points at questions that will no longer exist in Cost IQ.** 19 of 22 capabilities carry `costIqPrefill` (`packages/engine-core/src/accelerators/finops-iq/registry/capabilities.json`, for example `:169`), and 20 questions carry `prefillFrom` (`QB`, for example `:1703`), all naming `CIQ.FIN-01` to `CIQ.FIN-12`. No code or test reads these fields (searched `packages/engine-core/test`, `audit`, `v3/*.ts`, `scripts`); only the contract flags `prefilled`/`prefillConfirmed` exist (`v3/evaluate.ts:52-54`). The page route and the option-to-level table are listed as left for F6 (`finops-iq/PLAN.md:398`). Because FIN-xx were never shown, no client has ever produced a FIN answer, so nothing live is lost; the design needs re-pointing (section 2.3).
4. **There is no shared module yet.** `DESIGN` 2.2 says the capability model and lever library "become a shared module, for example `packages/engine-core/src/shared/...`". That folder does not exist (`packages/engine-core/src` has `accelerators`, `ai`, `claims`, `offerings`, `playbook`, `report`, `report-checks`). The two tools share only the 22 capability IDs, by convention: the IDs match (`O` `capabilityMappings` against `finops-iq/registry/capabilities.json`). FinOps IQ's registry is the maintained copy (2026 names, claim IDs, per-capability guidance); `O` is the stale one.
5. **Two more questions never score (not cloud-related, found in passing).** CORE-10 (`M:731`) and CORE-11 (`M:797`) carry a `defaultMap` keyed A to H and A to E, but their option IDs are words (`TRANSPARENCY`, `FAST` and so on), so `scoreQuestion` returns nothing for any answer. They look scored in the config and are inert in the engine. For CQ3b's "every shown question scores or is labelled context" rule. (Verified by running `scoreQuestion`; I did not check how the page would present them.)
6. **VAL section 9 and the owner's decision differ on FIN-09 and FIN-10.** VAL's overlap table names Cost IQ as the owner of executive alignment (it lists FIN-09) and of intersecting disciplines (FIN-10). The owner decision moves all twelve. I have followed the owner decision and flagged the two rows so the owner can see the difference (section 1, rows FIN-09 and FIN-10; decision O6).

---

## 1. Verdict table

**Verdicts.** KEEP (as a scored question, or as a context question that is shown, labelled and never scored). MOVE (the content belongs in FinOps IQ; "FinOps IQ adds" says what, if anything). HAND OFF (Cost IQ asks one summary question and routes to FinOps IQ). DELETE (with reason).

**"Today" key.** *Shown* = a respondent can be asked it on the live page. *Scored* = `scoreQuestion` returns a number for some answer and the question has a dimension. The page's area map is `PAGE:49-68`; the baseline sections are `PAGE:47`.

### 1.1 Questions that touch cloud or FinOps (26)

| ID | What it asks | Today (file:line) | FinOps IQ question | Verdict |
|---|---|---|---|---|
| FIN-01 | Readiness to normalise cost and usage data across providers (FOCUS) | Not shown: its section is in no area list (`PAGE:49-68`; `FIN-` filters `PAGE:118,188,238,249`). Scored if answered (`O:158`) | UN-03 (also UN-01) | **MOVE.** FinOps IQ adds: nothing |
| FIN-02 | Which business or product units justify a unit cost (multi-select) | Not shown. No scoring map, no finding (`O:222`) | Partial: QV-05, QV-06 ask whether unit cost is known and used; SC-07 asks the number of consuming units | **DELETE.** Unscored and never shown. Choosing the unit is a workshop conversation, not a question; QV-05/06 cover the capability |
| FIN-03 | Energy or carbon alongside cost in decisions | Not shown. Scored if answered; the only trigger for F-019 with FIN-04 and FIN-09 (`O:261`) | OP-15 | **MOVE.** Adds: nothing |
| FIN-04 | Unit costs, outcome metrics and benchmarks used together to judge value | Not shown. Scored (`O:327`); lists F-004, F-018, F-019 | QV-05, QV-06, QV-08 | **MOVE** for cloud. The whole-estate form stays in CORE-20, CORE-44, ADP-53, ADP-54 (section 1.2). Adds: nothing |
| FIN-05 | Forecasts, budgets and plans tied to usage and demand | Not shown. Scored (`O:401`); lists F-003, F-015 | QV-01 to QV-04 | **MOVE.** Cost IQ keeps the funding model in CORE-21. Adds: nothing |
| FIN-06 | FinOps operating model: ownership, cadence, education, decision support | Not shown. Scored (`O:475`); lists F-005, F-016 | MP-01, MP-02, MP-03, MP-08, MP-11 | **MOVE.** Adds: nothing |
| FIN-07 | Invoices, allocation, showback or chargeback, reconciliation | Not shown. Scored (`O:548`); lists F-001, F-002 | MP-09, MP-10, UN-05 | **MOVE.** Enterprise chargeback stays in CORE-13 and CORE-14. Adds: nothing |
| FIN-08 | Cost policies and guardrails made enforceable | Not shown. Scored (`O:620`); lists F-003, F-017 | MP-06, MP-07 | **MOVE.** Adds: nothing |
| FIN-09 | FinOps supports executive trade-offs among cost, speed, quality, resilience | Not shown. Scored (`O:691`); lists F-003, F-015, F-018, F-019 | MP-04, MP-05 | **MOVE** (owner decision). VAL section 9 had assigned it to Cost IQ; the whole-estate form is CORE-07, CORE-09, CORE-11, CORE-45 (decision O6). Adds: nothing |
| FIN-10 | FinOps joined with ITAM, ITFM, ITSM, security, architecture, procurement | Not shown. Scored (`O:767`); lists F-011, F-017, F-020 | MP-13 | **MOVE** (owner decision; VAL section 9 had said Cost IQ). Leaves a small gap in Cost IQ: ITFM/ITAM joint working across the estate is not asked anywhere else (section 4.2). Adds: nothing |
| FIN-11 | Consumption changes driven toward cost and outcome targets | Not shown. Scored (`O:838`); lists F-005, F-016 | OP-04, OP-05, OP-06, OP-11 | **MOVE.** Adds: nothing |
| FIN-12 | Pricing, commitment and contract levers optimised from forecasts and utilisation | Not shown. Scored (`O:910`); lists F-006, F-011 | OP-01, OP-02, OP-03, OP-08 | **MOVE.** Contract flexibility across all vendors stays in CORE-28, ADP-44. Adds: nothing |
| ADP-01 | How public-cloud spend is made visible to consuming teams | Shown (Cloud Economics, default). Not scored: dimension COST-03 but no map (`M:3082`) | UN-04, UN-07 | **MOVE.** Adds: nothing |
| ADP-02 | Non-production cloud environments controlled when not needed | Shown, not scored (`M:3133`) | OP-06 (workshop VB-03) | **MOVE.** Adds: nothing |
| ADP-03 | Discipline in sizing cloud commitments | Shown, not scored (`M:3183`) | OP-01, OP-02 | **MOVE.** Adds: nothing |
| ADP-04 | Share of cloud spend that cannot be traced to an owner (slider) | Shown, not scored (`M:3233`) | UN-04 (asks the allocated share, the inverse) | **MOVE.** Adds: nothing. Note the inverse wording if a pre-fill is ever built |
| ADP-05 | Cloud cost weighed in architecture decisions | Shown, not scored (`M:3269`) | OP-10 | **MOVE.** The whole-estate form stays as ADP-45 (section 1.2). Adds: nothing |
| ADP-42 | Maturity of FinOps in turning cloud cost data into action (five levels) | Shown (the `FinOps` section is in Cost Governance, `PAGE:56,58`). Not scored (`M:5092`) | Summary of the capability profile; MP-11 | **HAND OFF.** It becomes the one cloud summary question: scored in COST-03, with "Unknown" added, the only trigger of F-005 and the route flag to FinOps IQ (section 2) |
| ADP-43 | Speed of detecting, explaining and acting on cloud cost anomalies | Shown, not scored (`M:5142`) | UN-10, UN-11 | **MOVE.** Adds: nothing |
| CORE-23 | Which environments are material and in scope (multi-select) | Shown (Cloud area). Signal only. The page does not use it to route (VAL section 7.1) (`M:1552`) | SC-03 (scope), SC-02 (providers) | **KEEP, context.** It becomes the footprint question that routes: cloud, SaaS, private cloud and on-premises present or not. In CQ3b merge with CORE-01 (`M:142`), which asks nearly the same thing in the baseline, and make routing real |
| CORE-24 | What happens when cloud spend changes materially | Shown. Scored in COST-03; the only live trigger of F-005, options D/E/F (`M:1619`; `CAL` F-005) | UN-10, UN-11 | **DELETE.** Superseded by ADP-42 as the single summary question; anomaly handling is FinOps IQ's depth. This changes a live score and a live trigger (no goldens exist to break; VAL H7) |
| CORE-25 | Which cloud cost-management practices are used (multi-select, ten options) | Shown. Signal only; its `findingIds` list F-005 and F-006 but `CAL` has no rule for it (`M:1685`) | UN-04, UN-10, OP-01, OP-04 and others | **DELETE.** It is a practice checklist, the "cloud depth" the owner moved; it scores nothing and activates nothing |
| CORE-26 | Matching SaaS subscriptions to usage before renewal (stars) | Shown. Scored in COST-04 (`M:1758`). Its finding trigger (SELECTIVE, COUNT, UNKNOWN) cannot match a star answer (VAL section 3) | OP-13 | **KEEP, scored.** SaaS is whole-estate. Fix the star/option mismatch in CQ3b |
| CORE-27 | What happens when two SaaS products overlap | Shown. Scored; triggers F-007, F-013 (`M:1830`) | none (REF.COST_IQ, `DESIGN` 2.3) | **KEEP, scored.** Cost IQ only |
| CORE-28 | Flexibility to change cloud or SaaS commitments | Shown. Scored in COST-07; triggers F-006, F-011 (`M:1898`) | OP-02, OP-03 | **KEEP, scored** (vendor and commercial). Gate F-006 on cloud being in the footprint (section 2.2) |
| CORE-31 | Material cloud, SaaS or software commercial events in the next 12 to 24 months | Shown. Signal only (`M:2111`) | none | **KEEP, context.** Timing input for sequencing the roadmap |

**Counts for 1.1 (26):** KEEP 5 (3 scored: CORE-26, 27, 28; 2 context: CORE-23, CORE-31). MOVE 17 (11 FIN, 5 ADP, ADP-43). HAND OFF 1 (ADP-42). DELETE 3 (FIN-02, CORE-24, CORE-25).

**Where "MOVE, adds: nothing" comes from.** For every MOVE row the FinOps IQ question named exists in the bank (`QB`). FinOps IQ adds no question for this boundary; what it must add is engineering (section 2.3). Two caveats: several equivalents are workshop-only (for example UN-03, UN-05, MP-02), so an executive-mode client does not see them; the 20-item executive set is `QB` `executiveSet`.

### 1.2 Other Cost IQ questions found that mention cloud or overlap a FinOps IQ theme (33)

All KEEP. Cloud words here are answer options inside whole-estate questions, or whole-estate neighbours of a FinOps IQ theme (from VAL section 9). No move.

| IDs | What they are | Today | FinOps IQ neighbour | Verdict |
|---|---|---|---|---|
| CORE-01, CORE-05 | Material cost areas (public and private cloud options); categories in the spend figure (cloud option) | Shown (baseline). CORE-05 has a dimension but no map | SC-03, SC-04 | KEEP, context. CORE-01 is the footprint seed; merge with CORE-23 |
| CORE-09, CORE-45, ADP-55, ADP-58 | Where the client expects opportunity; 10% redirect; likely cost opportunity; reduction candidates. Each has a cloud option (`CLOUD_PLATFORM_EFFICIENCY`, `REDUCE_CLOUD`, `CLOUD`, `CLOUD_WASTE`) | Shown. Signal or hypothesis only | HY-01 (client's waste guess) | KEEP, context. **Rule:** these are hypotheses. They never become a Cost IQ cloud-waste number (section 3) |
| CORE-14, CORE-38, ADP-17 | Hard-to-attribute cost areas, supplier categories to examine, manual-work areas (each has a cloud option) | Shown. Signal only | UN-04, OP-03, MP-03 | KEEP, context |
| CORE-12, CORE-13, CORE-15, CORE-17, CORE-21 | Explaining spend; cost visibility level; speed of consolidated view; share traced to an owner; funding model | Shown. All scored | UN-04, UN-07, QV-01 to QV-04, MP-09 | KEEP, scored. Enterprise allocation, visibility and funding. Cloud detail is FinOps IQ's |
| CORE-30, ADP-06, ADP-07, ADP-08, ADP-15, ADP-16 | Licence entitlement reconciliation; SaaS overlap, leaver licence removal, business-bought SaaS; software renewal exposure and reconciliation | Shown. CORE-30 scored; the ADP ones are not | OP-13, OP-14, LEV-09 | KEEP. CORE-30 scored. The ADP ones must be scored or labelled context in CQ3b. Shelfware value is one lever (section 3.4) |
| CORE-37, ADP-44, ADP-47, ADP-48 | Vendor governance, contract flexibility, procurement involvement, aggregation | Shown. CORE-37 scored | OP-03 | KEEP. Whole-estate vendor and commercial |
| CORE-44, ADP-53, ADP-54, ADP-31, ADP-32 | Outcome measurement for investments; hard-to-quantify outcomes; business challenge on value; AI cost tracking; AI outcomes | Shown. CORE-44 scored | QV-05 to QV-08, QV-07, OP-12 | KEEP. Technology value and whole-estate AI economics. Cloud and GPU cost of AI is FinOps IQ's (OP-12, LEV-10) |
| ADP-33, ADP-34 | IT influence over business-initiated purchases; consolidation of business-led purchases | Shown. Not scored | MP-13 | KEEP. Become the triggers of F-017 (section 2.1) |
| ADP-39, ADP-45 | Observability and telemetry cost against value; architecture standards challenged on cost | Shown. Not scored | OP-10 | KEEP |

**Count by ID:** 6 + 3 + 5 + 6 + 4 + 5 + 2 + 2 = 33. All 33 are KEEP.

### 1.3 Totals

| Verdict | Count (1.1) | Count (1.2) | Total |
|---|---|---|---|
| KEEP | 5 | 33 | 38 |
| MOVE | 17 | 0 | 17 |
| HAND OFF | 1 | 0 | 1 |
| DELETE | 3 | 0 | 3 |
| **All** | **26** | **33** | **59** |

I searched `M` for any question whose prompt or option text mentions cloud, FinOps, reservation or commitment and listed each hit above. Not included: other whole-estate questions that never mention cloud or FinOps (for example workforce, applications, M&A). They are outside the boundary.

---

## 2. Findings and recommendations that overlap, and the hand-off

### 2.1 Findings

Triggers come from `CAL` (live) and from the `findingIds` of each FIN question (`O`, dead on the page). The FIN-based triggers are removed by the move; none was ever live.

| Finding | Live trigger today | After the boundary | Verdict |
|---|---|---|---|
| F-005 Cloud consumption may contain avoidable leakage (`M:6646`) | CORE-24 D/E/F. FIN-06, FIN-11 also list it (dead) | Trigger becomes ADP-42 at its two weakest options. Fires only when cloud is in the footprint (CORE-23). Text unchanged ("may contain ... subject to evidence validation"). No Cost IQ value. Its `GATES` entry stays "quantification not allowed" and now names FinOps IQ evidence as the way to lift it | **HAND OFF** (routing finding) |
| F-006 Cloud commercial commitments may not be optimized (`M:6658`) | CORE-28 D/E/F. FIN-12 also lists it (dead) | Trigger stays CORE-28, but fires as F-006 only when cloud is in the footprint (CORE-23); otherwise only F-011 applies, so a SaaS-only client does not get a cloud finding (VAL H1) | **HAND OFF** (routing finding) |
| F-011 Vendor economics may contain commercial leakage | CORE-28, CORE-37 (+ FIN-10, FIN-12 dead) | Unchanged | KEEP |
| F-001, F-002, F-003, F-004, F-015, F-016, F-018, F-020 | CORE and ADP triggers in `CAL`. FIN-01, 03 to 12 also list several (dead) | Unchanged. Removing FIN triggers removes no live path | KEEP |
| F-017 Business-led technology spend not fully governed | **None live.** Only FIN-08 and FIN-10 (never shown) | New triggers from ADP-33, ADP-34, ADP-08 (business-purchased SaaS), scored in CQ3b | KEEP, re-source |
| F-019 AI investment economics not defined | **None live.** Only FIN-03, FIN-04, FIN-09 (never shown) | New triggers from ADP-31, ADP-32, scored in CQ3b. When AI cloud or GPU spend is material, add the FinOps IQ route (`DESIGN` 2.3) | KEEP, re-source, with hand-off context |
| F-007, F-008 SaaS and software | CORE-26, 27, 30 | Unchanged. FinOps IQ routes SaaS portfolio work back here (`DESIGN` 2.3, `REF.COST_IQ`) | KEEP |

### 2.2 Recommendations

| Recommendation | Verdict | What changes |
|---|---|---|
| R-003 Run a Cloud Economics Diagnostic (`M:6867`) | **HAND OFF** | Its text and `ltmService` ("FinOps & Cloud Cost Optimization") stay. In "How LTM can help" it names FinOps IQ as the instrument, typed advisory, and does not describe FinOps IQ's offerings (`DESIGN` 2.3, first row). The description's "before sizing any savings opportunity" stays true |
| R-001 baseline | KEEP | FOCUS-style data normalisation is FinOps IQ's UN-01 to UN-03; the enterprise baseline (all categories, business-led spend) is Cost IQ's |
| R-004 SaaS rationalisation, R-007 vendor strategy | KEEP | They are the destination of FinOps IQ's `REF.COST_IQ` route |
| R-002, R-005, R-006, R-008, R-009, R-010 | KEEP | No cloud or FinOps content |

### 2.3 What the hand-off looks like for the user

**When Cost IQ routes to FinOps IQ.** Routing is a rule on the footprint, not a judgement. Cost IQ routes when CORE-23 shows public cloud, AI/GPU or SaaS spend as material **and** one of these holds: F-005 or F-006 fires; ADP-42 is answered at its two weakest options or "Unknown"; the client selects "cloud/FinOps is a priority" in CORE-07 or CORE-09. (The last trigger depends on CQ3b keeping those options; UNVERIFIED until the questions are rewritten.) If cloud is not in the footprint, the route is hidden and F-005/F-006 do not fire.

**What the user sees.** In the Cost IQ report, a "Cloud and FinOps" panel replaces the Cloud Economics detail: the screening answer, the routed findings, and one action: "Run FinOps IQ for this estate. Executive mode takes 15 to 20 minutes; workshop mode gives the full depth." In the consultant edition the panel also shows the pre-fill that will cross.

**What pre-fills across.** Only facts, never answers:

| Cost IQ field | FinOps IQ fact (`facts.schema.json`) | Source in Cost IQ | Note |
|---|---|---|---|
| Sector | `org.sector` | CORE-02 | Value lists differ (12 industries against the facts enum); needs a mapping table. UNVERIFIED mapping |
| Reporting currency | `org.currency` | New context question (GLOBAL-COVERAGE; PLAN CD8) | Same ISO 4217 code; no conversion |
| Countries or regions | `org.markets` | New context question | FinOps IQ markets are `eu, uk, us, apac, other`; Cost IQ will hold countries; a mapping is needed |
| Footprint scopes | `footprint.scopes`, `footprint.infrastructureMix`, `footprint.publicCloudProviders` | CORE-23 merged with CORE-01, plus the provider-neutral footprint question (GLOBAL-COVERAGE) | Providers are only options the client names |
| Technology spend band | `spend.byScope` (a band, not an exact figure) | CORE-04 | Exact figures entered in FinOps IQ override it (`DESIGN` 2.3, "Scope facts" row) |
| Routed findings F-005, F-006 (and F-019 where AI is in scope) | start-screen context "Cost IQ indicated ..." | `findings` | Not scored in FinOps IQ; FinOps IQ answers decide (`DESIGN` 2.3) |

**What does not pre-fill.** The FIN-to-question pre-fill table (`DESIGN` 7.8) has no source after the move and is withdrawn. I do not recommend inventing a replacement from ADP-42: one five-level answer cannot honestly set 22 capability levels. Answer pre-fills stay out until both teams approve an option-to-level mapping. The engine contract already treats any pre-fill as unconfirmed and blank until confirmed (`v3/evaluate.ts:52-54,406-407`).

**What comes back to Cost IQ.** The FinOps IQ result, picked by the consultant for the same client (section 3.3): the cloud value range and its date, the capability profile as an information panel, and the confidence. Shown as "per FinOps IQ of <date>".

**FinOps IQ side changes.** (a) Re-point or remove 19 `costIqPrefill` lists and 20 `prefillFrom` entries naming `CIQ.FIN-xx` (`capabilities.json`, `QB`). Keep the `legacy` lineage notes. (b) Build the start-screen "Cost IQ indicated" banner and the facts pre-fill (F6 work already listed, `finops-iq/PLAN.md:398`). (c) Publish a versioned summary object for Cost IQ to read (section 3.3). No FinOps IQ question needs adding for this boundary.

---

## 3. The single-figure rule

### 3.1 Where the risk is

- **Today there is no second figure.** Cost IQ prints no money (VAL section 7.4; `GATES` `numericCalibration: pending`; the engine returns a status, `costiq-engine-v10.cjs:29`). FinOps IQ prints lever ranges with a cap of 29% of public-cloud spend on all three cases (`finops-iq/registry/levers.json` `globalCap`, from Flexera 2026, n = 753, VAL section 16) and treats the client's own waste guess HY-01 as a hypothesis only.
- **The risk is prospective.** It appears if CQ4 builds Cost IQ's own "Addressable Spend x Opportunity Factor x Confidence Modifier" (`GATES` `economicOpportunityRule`) for cloud. It also appears through LEV-09 (SaaS and licensing), which exists in FinOps IQ's library today (`levers.json`, `excludedLevers: ["LEV-09"]` from the 29% cap) and would overlap Cost IQ's SaaS work.
- **A second route exists through AI.** VAL C2/C3: AI text can state a figure nobody computed. CQ8's grounding check is what closes that, and until then AI is off.

### 3.2 What is shared and what each tool owns

| | Shared (one source, read-only for the other) | FinOps IQ owns | Cost IQ owns |
|---|---|---|---|
| Capability model | The 22 capability IDs in FinOps IQ's `registry/capabilities.json` (maintained, 2026 names, CC BY 4.0 attribution with changes) | Per-capability Crawl/Walk/Run rating, per scope | None. Cost IQ shows the FinOps IQ profile when present and runs no capability scoring of its own |
| Lever library | `registry/levers.json` LEV-01 to LEV-10, with its caps, interaction order, ramp, claim IDs and assumptions | Quantifying LEV-01 to LEV-08 and LEV-10 (cloud and AI); LEV-09 only from client-measured evidence, as today | New non-cloud levers (software true-down, vendor reset, infrastructure consolidation or lifecycle, application rationalisation, workforce and sourcing). They are added to the same library with IDs after LEV-10, each with its own claim and assumption IDs |
| Market data and assumptions | One claims-register entry per figure (Flexera 2026, provider maxima) | Cloud caps | Any Cost IQ cap, only if a published source with year and sample is found (UNSOURCED today) |
| Estate facts | `org.*`, `footprint.*`, `spend.*` | Evidence inputs (provider-tool exports, measured shares) | Context facts (sector, currency, countries) |

**How to share without moving files (recommended).** Keep FinOps IQ's registry as the single source and have Cost IQ import it read-only. Do not copy it into a new `shared/` folder yet: that would change the paths FinOps IQ's tests, claims and golden outputs rely on, for no gain in CQ3b. If the owner prefers the `shared/` folder `DESIGN` 2.2 describes, it is a separate task with FinOps IQ's own tests as the gate (decision O5).

### 3.3 How a client sees one cloud number

1. **One cloud line per estate, computed once.** The cloud line in a Cost IQ report is FinOps IQ's expected, net, phased figure with its conservative/upper range, date and confidence. Cost IQ never computes it, restates it or applies its own percentage to cloud spend.
2. **Cost IQ's total is the sum of two named parts.** Total = Cost IQ non-cloud levers + FinOps IQ cloud line. This is the reconciliation test already written into the FinOps IQ design (`DESIGN` 2.3, 10.9; PLAN.md CQ4). Nothing is added twice: lever interaction order stays FinOps IQ's for cloud.
3. **No FinOps IQ result, no cloud number.** The line reads "Not quantified. Run FinOps IQ for this estate" and the total is labelled "excluding cloud". Cost IQ does not estimate cloud from its screening answer. This is the strict reading of the owner's rule; see decision O3.
4. **One SaaS lever.** LEV-09 is the only shelfware lever. If FinOps IQ ran with a SaaS scope, Cost IQ imports LEV-09 and does not recompute it. If it did not, Cost IQ may compute LEV-09 with the same formula and the same client-measured input, from the same module, so the two tools cannot disagree.
5. **The hypotheses stay hypotheses.** HY-01 (FinOps IQ) and CORE-09, CORE-45, ADP-55, ADP-58 (Cost IQ) record what the client believes. They are never added to, or compared silently with, a computed figure. A report may show the client's guess next to the computed range only if both are labelled.
6. **Link by consultant choice.** The two tools have no shared estate or engagement key today. Cost IQ stores `clientName` as free text in `CostIqAssessment` (`amplify/data/resource.ts:104`); FinOps IQ sessions are saved through the shared session service. I recommend the consultant selects the FinOps IQ session to import, restricted to the same owner (or Admin) as in CQ1. Whether `manage-cost-assessment` can read the shared session records is not verified (UNVERIFIED).

### 3.4 What changes in each tool

**FinOps IQ engine and report**
- Expose a versioned, read-only summary: scopes assessed, value range by case with net and year-1, as-of date, confidence, capability profile, finding IDs. Ranges, never one number.
- Reserve lever IDs for Cost IQ's non-cloud levers; add a rule that a lever ID has one owner tool.
- Start screen: "Cost IQ indicated ..." banner and facts pre-fill; unconfirmed pre-fills count as blank (already built in the engine).
- Report: one sentence where an estate also has a Cost IQ result: "Non-cloud technology cost is assessed in Cost IQ; this figure covers cloud, AI, SaaS licences measured by you, and private cloud scopes you selected." (wording is a proposal for owner review)
- No change to approved value figures or goldens is needed for this boundary.

**Cost IQ engine and report**
- Remove: the overlay's `supplementalQuestions` (and with them the API's 117), `capabilityMappings`, `capabilityFindingBridges` and the dead `finopsHeatmap` path. First move the CORE-40/CORE-43 overrides (section 0, item 2).
- Add: applicability routing from the footprint question (cloud findings fire only when cloud is in the footprint; VAL H1); the route flag; the import panel.
- Value model (CQ4): the shared lever library for cloud, plus evidence-based non-cloud levers (3.5). Cloud findings F-005 and F-006 keep `GATES` "quantification not allowed" inside Cost IQ.
- Report (CQ5): "Cloud and FinOps" panel; the coverage statement (GLOBAL-COVERAGE) states that cloud and FinOps depth is assessed in FinOps IQ.
- Keep COST-03 Cloud Economics as a screening indicator (decision O2).

### 3.5 What is not possible without owner input

1. **Published ranges for Cost IQ's non-cloud levers.** I have not found or checked a published source with method and sample for software true-down, vendor reset, infrastructure consolidation, application rationalisation or workforce sourcing. They are UNSOURCED. Until sourced, these levers can only be evidence-based: the client's measured addressable base times a share up to 100%, expected case half, as LEV-09 does today (`levers.json` LEV-09). That gives few figures in an executive run. This is a product limit, and it needs the owner's acceptance (decision O4).
2. **The link between a Cost IQ and a FinOps IQ assessment** (3.3, item 6).
3. **A mapping between Cost IQ's 0-to-100 dimension scores and FinOps IQ's Crawl/Walk/Run.** None exists and none is sourced. I recommend showing them side by side, never merged into one score.
4. **Sector and market mappings** between the two tools' value lists (section 2.3).
5. **Whether a client who has run only Cost IQ may see any cloud figure** (decision O3).

---

## 4. What stays whole-estate in Cost IQ, and the gaps

### 4.1 What stays

| Area | Questions that stay (counts are what exists in `M` today) | Notes |
|---|---|---|
| Software and licensing | CORE-26, 27, 29, 30, 31; ADP-06, 07, 08, 15, 16; ADP-14 (managed services) | F-007, F-008, R-004. Whole-estate SaaS and software are Cost IQ's (`DESIGN` 2.3). LEV-09 shared |
| Infrastructure and operations | CORE-32, 33, 34; ADP-09 to ADP-13, ADP-37, ADP-38; ADP-39 to ADP-41; ADP-26 (network) | F-009, F-016, R-005. ADP-09, ADP-10, ADP-28 are never shown today (VAL section 1) and need an area |
| People and vendors | CORE-35 to CORE-38; ADP-17, 18, 19, 20, 35, 36, 44, 47, 48 | F-010, F-011, R-006, R-007. Cost IQ only: no FinOps IQ question exists |
| Architecture and applications | CORE-39 to CORE-42; ADP-21 to ADP-23, ADP-45, ADP-46, ADP-24, ADP-25 | F-012, F-013, R-008. ADP-05 (cloud cost in architecture) moves; ADP-45 stays |
| Technology value and investment | CORE-07 to CORE-11, CORE-18 to CORE-22, CORE-43 to CORE-45; ADP-29 to ADP-34, ADP-53 to ADP-58 | F-003, F-004, F-014, F-015, F-018, F-019, R-002, R-009, R-010 |
| Spend baseline | CORE-01 to CORE-06, CORE-12 to CORE-17; ADP-08 | F-001, F-002, R-001 |
| M&A, geography, regulatory | ADP-49 to ADP-52, ADP-28 | F-020. Geography is the base for the global-coverage questions |

### 4.2 Gaps that remain after the cloud and FinOps content moves out

These are facts from the data, not new requirements.

1. **COST-03 Cloud Economics rests on one scored question** (ADP-42) after the move, as it rests on one today (CORE-24). It cannot meet VAL's target of 4 scored questions per dimension (VAL section 10). Default: label it a screening indicator and exclude it from the headline index (decision O2).
2. **No whole-estate question on ITFM, ITAM or ITSM joint working.** FIN-10 was the only one, never shown. Not urgent; the FinOps Foundation's intersecting-disciplines capability is a FinOps IQ item (MP-13). Possible CQ3b addition if the owner wants it.
3. **Private cloud and data-centre cost sit in both tools.** FinOps IQ treats them as scope-triggered (UN-02, `DESIGN` 2.1). Cost IQ owns whole-estate infrastructure (ADP-09 to ADP-13, 37, 38). No lever for private-cloud waste exists in the library. State this in the report so the client does not read "no figure" as "no waste".
4. **Seven dimensions rest on one scored answer and VALUE-01 on none** (VAL section 10). The boundary does not change this; CQ3b and CQ4 do.
5. **F-017 and F-019 have no live trigger** until re-sourced (section 2.1).
6. **No sector or country use.** CORE-02 and the geography questions are asked and not used (VAL section 12). The footprint and applicability work in CQ3b and CQ4 depends on them.
7. **Dead scoring maps** on CORE-10 and CORE-11 (section 0, item 5).

---

## 5. Effect on counts

### 5.1 The 105 / 117 mismatch

The manifest says 105 (`RELEASE_MANIFEST.json`, `baseline.questions`). `M` holds 105 questions (45 CORE and 60 ADP). The API metadata adds `O.supplementalQuestions` (12) and returns 117 (`evaluate.cjs:28`, `metadata()`), and `scripts/validate-cost-iq.cjs:12` asserts 117. So the mismatch is exactly the 12 FIN questions.

Removing `supplementalQuestions` from `O` makes the API return 105, equal to the manifest, and the `validate-cost-iq.cjs:12` assertion must change from 117 to 105. That is a consequence, not a fix: CQ3b will then add and remove questions, so the number will move again. **Recommendation:** derive the count in the manifest, API and test from `M` (and fail the build if they differ), rather than editing a literal each time. This belongs in CQ2's "one count and one version" item.

### 5.2 Counts through the stages

Method: I ran `scoreQuestion` (with the overlay's two overrides) over every question. "Scored" means it returns a number for some answer and the question has a dimension. This reproduces VAL section 6 (22 scored in the 105 and 11 in the FIN set).

| Stage | Questions in the bank | Scored | Not scored | Source |
|---|---|---|---|---|
| Today, API | 117 | 33 | 84 | 22 + 11 FIN; VAL section 6 |
| Today, manifest | 105 | 22 | 83 (of which 81 inert plus 2 that drive F-020 only, per VAL) | VAL section 6 |
| After the 12 FIN are removed | 105 | 22 | 83 | FIN-02 had no map; the 11 scored FIN are gone. No live score changes (the FIN questions were never shown) |
| After ADP-01 to 05, ADP-43, CORE-25 are removed (all inert) | 98 | 22 | 76 | 7 inert removed |
| After CORE-24 is deleted (scored) and ADP-42 is scored with a map (in CQ3b) | 97 | 22 | 75 | One scored question out, one in; the net is unchanged. If CQ3b does not score ADP-42, scored falls to 21 |
| After CORE-23 is merged into CORE-01 (if the owner agrees) | 96 | 22 | 74 | Both are context |

These are the CQ3a effects only. CQ3b then adds the global-coverage context questions (reporting currency, foreign-currency share, countries, delivery mix, the provider-neutral footprint question, three industries as options on CORE-02: about 5 new questions, UNVERIFIED until written) and scores or labels the 74-odd remaining unscored ones. The final shown count and the scored share are therefore CQ3b outputs.

### 5.3 The default 35-question run

| | Questions | Scored | Not scored |
|---|---|---|---|
| Today (Cloud Economics + Cost Governance) | 35 | 13 | 22 |
| After CQ3a (ADP-01 to 05, ADP-43, CORE-25 removed; ADP-42 kept; CORE-24 still present) | 28 | 13 | 15 |

(Removing CORE-24 and scoring ADP-42 leaves 27 shown and 13 scored.) Computed by running the page's selection rule (`PAGE:47-58`) over `M`. The default run gets shorter and the share that scores rises from 37% to 46% (13 of 28). The remaining 15 unscored in that run are context questions to label or inert ones to score in CQ3b.

---

## 6. Decisions for the owner, and the CQ3b task list

### 6.1 Decisions (each with my recommended default)

| # | Decision | Options | Recommended default |
|---|---|---|---|
| O1 | Confirm the line-by-line verdicts in section 1 | Accept / change rows | Accept as written. The rows that most need a look: FIN-02 (DELETE), CORE-24 (DELETE, superseded), FIN-09 and FIN-10 (MOVE, against VAL section 9) |
| O2 | How Cost IQ treats Cloud Economics (COST-03) | (a) Screening indicator from one summary question, outside the headline index; (b) Keep two questions (ADP-42 and CORE-24) in the index; (c) Drop the dimension | (a). It is honest about being one answer, and it does not let a self-report outweigh what FinOps IQ finds |
| O3 | A Cost IQ client with no FinOps IQ result | (a) Cloud line "not quantified; run FinOps IQ", total "excluding cloud"; (b) Cost IQ shows a range from the screening answer | (a). (b) would be a second cloud figure, which the rule forbids |
| O4 | Non-cloud levers with no published range | (a) Evidence-based only, as LEV-09; (b) Source ranges first and delay the value model; (c) No Cost IQ value model | (a), and ask `finops-cost-lead` to look for sourced ranges in parallel. Accept that executive-mode Cost IQ will often say "not quantified" |
| O5 | How the capability model and lever library are shared | (a) Cost IQ imports FinOps IQ's registry read-only; (b) Move both into a new `shared/` module (`DESIGN` 2.2) | (a) now; (b) later as its own task with FinOps IQ's tests as the gate |
| O6 | FIN-09 and FIN-10 | (a) Move (the owner decision as stated); (b) Keep one whole-estate question each in Cost IQ | (a). The whole-estate form of FIN-09 is CORE-07/09/11/45; for FIN-10, add one whole-estate ITFM/ITAM question in CQ3b only if you want it |
| O7 | How the two assessments are linked | (a) Consultant picks the FinOps IQ session to import, same owner or Admin; (b) a shared engagement ID; (c) free-text client name | (a) now. (b) is better and needs a data-model change across both tools |
| O8 | Withdraw the FIN-to-FinOps IQ pre-fill table (`DESIGN` 7.8) | Withdraw; keep and re-source | Withdraw. Keep facts pre-fill and the start-screen banner. Revisit answer pre-fills only with an approved option-to-level mapping |
| O9 | The route and the report text naming FinOps IQ (section 2.3) | Accept / reword | Accept. Wording is a proposal |

### 6.2 Proposed task list for CQ3b

Ordered. Each is a task for the build; none is done.

1. **Cut the overlay.** Move CORE-40 and CORE-43 `questionScoringOverrides` into `M` (and confirm F-012 and F-014 activation in `CAL`). Remove `supplementalQuestions`, `capabilityMappings`, `capabilityFindingBridges` and the `finopsHeatmap` path. Update `scripts/validate-cost-iq.cjs`, and add a test that API, manifest and `M` agree on the count.
2. **Remove from `M`:** ADP-01 to ADP-05, ADP-43, CORE-24, CORE-25. Remove the `FinOps` focus area and the `FinOps` section from `Cost Governance` in the page map (`PAGE:56,58,79`), and the four `FIN-` filters (`PAGE:118,188,238,249`). Reword the Cloud Economics area (`PAGE:71`) to "Cloud footprint and routing".
3. **ADP-42 as the summary question:** add "Unknown", a semantic option map scored into COST-03, the F-005 trigger, the route flag. Add the basis for each option.
4. **Footprint and applicability:** merge CORE-23 with CORE-01; add the provider-neutral footprint question; make routing real (cloud findings only when cloud is in the footprint; F-006 gated the same way).
5. **Re-source F-017 and F-019:** score ADP-08, ADP-33, ADP-34 (F-017) and ADP-31, ADP-32 (F-019) and add their triggers to `CAL`.
6. **Fix and score the kept questions:** CORE-26 star/option mismatch; the CORE-10/CORE-11 maps; a score map or a context label for every ADP question shown; ADP-09, ADP-10 and ADP-28 into an area.
7. **Global-coverage context questions:** reporting currency, foreign-currency share, countries, onshore/offshore delivery mix; three industries on CORE-02 (GLOBAL-COVERAGE). Context only, no re-weighting.
8. **Hand-off:** the route rule (2.3), the "Cloud and FinOps" report panel text, and the import of the FinOps IQ summary (reads only; needs O7).
9. **FinOps IQ side (with the FinOps IQ owner):** re-point or remove the 19 `costIqPrefill` lists and 20 `prefillFrom` entries; the "Cost IQ indicated" banner and facts pre-fill; the versioned summary object; the lever-ID ownership rule.
10. **Single-figure design for CQ4:** write the reconciliation (total = Cost IQ non-cloud + FinOps IQ cloud), the single-owner rule for lever IDs, and the guard that fails CI if Cost IQ computes any cloud lever.
11. **Claims and labels:** each kept question gets its basis; register the 16 dimensions as LTM constructs and map them to a published cost taxonomy (PLAN CD9, not yet confirmed by the owner).
12. **Re-run** `scoreQuestion` over the bank and publish the scored/unscored counts in the CQ3b gate, plus the coverage matrix from VAL section 10 with COST-03 marked as screening.

**CQ3b gate (proposed):** no FIN or cloud-practice question remains in `M` or `O`; the count is derived and agrees everywhere; every shown question scores or is labelled context; F-017 and F-019 are reachable; the route and pre-fill facts work end to end on sample clients; the owner reads the coverage matrix.

---

## 7. Sources and what I could not verify

**Repository evidence (read 3 Nov 2026):** the files named in the short-names list; `finops-iq/registry/capabilities.json`, `levers.json`; `packages/engine-core/src/accelerators/finops-iq/v3/evaluate.ts`; `amplify/data/resource.ts`; `scripts/validate-cost-iq.cjs`; `docs/cio-readiness/FRAMEWORK.md`, `PRACTICE_LEAD_METHOD.md`, `cost-iq/PLAN.md`, `cost-iq/VALIDATION.md`, `finops-iq/PLAN.md`, `finops-iq/design/DESIGN.md`, `GLOBAL-COVERAGE.md`. I used `graphify query` first, as the project rule asks; it located the FinOps IQ value-model and overlay nodes, and I read the raw files only for the lines it and VAL pointed to.

**External figures cited here are carried, not re-fetched** (from VAL section 16, checked 3 Nov 2026): Flexera 2026 State of the Cloud, 29% estimated waste, more than 750 respondents (https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows); the FinOps Framework 2026 and CC BY 4.0 attribution (https://www.finops.org/insights/2026-finops-framework/). `levers.json` records the Flexera sample as n = 753.

**Could not verify**
- Whether the page's behaviour matches my reading in a browser (not run; I traced `PAGE:47-58,118,188,238,249`).
- Whether `manage-cost-assessment` can read FinOps IQ session records (section 3.3).
- Any published range for Cost IQ's non-cloud levers (not searched; UNSOURCED).
- Whether the FinOps IQ capability list matches the Foundation's 2026 list (VAL section 5, row 5: not settled).
- The sector and market mapping between the two tools (section 2.3).
- Whether CQ3b will keep the CORE-07/CORE-09 options that one of the route triggers relies on.

