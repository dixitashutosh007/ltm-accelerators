# Resilience IQ: plan

**Date:** 27 Oct 2026  **Author:** `resilience-lead` (advises; the product owner approves).

**Starting point:** the [validation report](VALIDATION.md):
- 1 Pass, 4 Partial and 8 Fail on the 13-area scorecard;
- of 34 statements checked, 8 are incorrect, 3 outdated and 3 unsourced;
- 24 report assumptions, none with a source in the register;
- CIO challenge: 0 of 10 answered, 3 partly.

Three Critical findings:
- C1: the advisory deep dive dead-ends since PR #55;
- C2: the strategy recommendation is non-monotonic;
- C3: the report claims a practice review that has not happened.

**Goal:** Resilience IQ passes all 13 areas. It keeps its strategy-first engine and evidence register, and gains:
- a written strategy ladder;
- a regulatory-obligation layer for the four markets;
- the shared outputs, playbook and offerings already built for FinOps IQ and Sovereign IQ.

**Naming:**
- Phases are **RQ0–RQ12**, so they do not clash with the earlier R0–R12.
- The shared workstreams from [FRAMEWORK.md](../FRAMEWORK.md) are written **WS-S1 to WS-S8**, as in the other plans.
- Where an earlier roadmap item ([ROADMAP.md](../../resilience-iq/ROADMAP.md)) still applies it is folded in and named, for example "(R10.4)".

**Reuse, not rebuild:**

| Need | Existing shared asset |
|---|---|
| Server PDF and backlog CSV | `packages/engine-core/src/report/pdf.ts`, `csv.ts`, as used by `amplify/functions/sovereign-iq-report` and `finops-iq-report` |
| Platform playbook | `packages/engine-core/src/playbook/catalogue.ts`, with `finops-iq.json` and `sovereign-iq.json` as models |
| Claims register | `packages/engine-core/src/claims/claims-register.json`, schema `claim.schema.json` |
| AI and grounding | `packages/engine-core/src/ai/` (`narrative.ts`, `grounding.ts`) |
| Offerings | Sovereign IQ v4 `advisory.ts` and `delivery.json` pattern |
| Persistence | Resilience IQ's own (`_shared/resilience-data.ts`), already the model the others copied |

**How each phase lands:** a PR with full CI and golden-file diffs, and this agent's review of the diff. Any change to the strategy rule also shows the grid report (section 4.2 of the validation). Regulatory content waits for the counsel gate (RQ11) before external use.

## Summary

| # | Phase | Depends on | Exit gate |
|---|---|---|---|
| RQ0 | Containment and hotfix | — | A gated assessment completes in the browser (new e2e test); review claim reworded; provider-mapping errors fixed; studio guarded; minimal notice and disclaimer on screen |
| RQ1 | Design pack | RQ0; owner decisions D1–D15 | Owner approves: decision and buyer, modes, strategy ladder, single headline, regulatory obligation model and boundary with Sovereign IQ, impact model, question map with citations, five reference scenarios with expected outcomes |
| RQ2 | Content and claims register | RQ1; WS-S2 | Every question, constant, pattern band, provider option and regulatory statement has a CLM-RES ID with source or "LTM heuristic + reasoning"; 90-day review on volatile items; language lint in CI |
| RQ3 | Engine v2 | RQ1, RQ2 | Ladder implemented; R9 decisions applied; obligation findings; findings with control ID, owner role and time frame; BIA branch; evidence changes confidence; versions recorded; Sovereign referral |
| RQ4 | Defensibility tests | RQ3; WS-S2 | Trace, reconciliation, monotonicity-grid, blank-never-better and assumption-register tests pass in CI |
| RQ5 | Audit, reference scenarios and recalibration | RQ3, RQ4 | Audit invariants in CI (missing-data shift ≤ 0, every band reachable, no unintended dead questions); scenarios match the outcomes written in RQ1; golden outputs approved in writing |
| RQ6 | One page: executive, workshop and client modes | RQ3; WS-S7 | Every question in both modes renders and can be answered; journey and gated-path tests; client view built on the server; evidence validation consultant-only |
| RQ7 | Outputs: executive PDF, "How we calculated this", backlog | RQ4; WS-S4 | Server PDF with the full structure; backlog CSV; every number traces; CIO challenge ≥ 9/10 |
| RQ8 | Platform playbook entries | RQ3; WS-S3 | Every technical control has entries for every platform the client selected, each with a verification step and claim IDs |
| RQ9 | How LTM can help and SOW | RQ8; WS-S5 | Every finding maps to a typed offering with an execution outline; consultant-only SOW |
| RQ10 | AI (optional) on the shared Bedrock service | RQ7; WS-S1 | Either "no AI" recorded, or off by default on the India profile, grounding 100% on the eval set, prompts and outputs logged |
| RQ11 | Client data, counsel review and operations | RQ6–RQ9; WS-S6 | Notice, transfer basis and retention live; counsel comments on regulatory content recorded; monitoring and alarms tested; dev separated from production |
| RQ12 | Re-score against all 13 areas | RQ0–RQ11 | All 13 Pass, or Partials accepted in writing; self-service decision recorded |

RQ0 starts now and waits for no decision. RQ2 research can run beside RQ1. RQ6, RQ8 and RQ9 can run in parallel once RQ3's contract is fixed. The critical path for area 13 is RQ3 → RQ4 → RQ7.

---

## RQ0: Containment and hotfix

**Objective:** stop the dead end and stop saying anything untrue, today.

| # | Item | Detail |
|---|---|---|
| 1 | **Fix the advisory dead end (C1)** | `loadAdvisoryQuestions` labels the mode through a null-safe lookup of the shared top bar's badge (`.vt-badge`), or not at all. `mapAnswers` omits unanswered questions instead of sending `[]` |
| 2 | **Browser test for the gated path** | Drive `retailer-untested-gated` through the executive scan, every advisory round and the final report. Assert no page error, that the answers sent equal the plan, and that the report is "ready". Add the same smoke step to every page that uses the shared top bar, so a shell change cannot break a flow again |
| 3 | **Reword the method claim (C3)** | Page and `scoring-model.json` `basis`: "LTM heuristics, pending practice-lead review; not an industry benchmark". Update `resilience-iq.spec.ts:162` |
| 4 | **Correct the provider mappings (H4; validation rows 20–24, 26)** | AWS: remove Elastic Disaster Recovery from DR-01 and DR-04; rename to "Amazon Application Recovery Controller (ARC)". Azure: remove Site Recovery from DR-01; drop "confirm regional availability" from the immutable vault (R11.4 closed). Google Cloud: replace "Fault Injection Service" with "Fault Injection Testing (preview; confirm availability)". The golden diff shows only `technologyOptions` |
| 5 | **Guard the studio** | `rbac-guard` with `data-tool="resilience-iq"` and an edit permission; production edits only through PRs (D9) |
| 6 | **Minimal notice** | A "not legal or regulatory advice" disclaimer and a one-line hosting statement on the start screen and report, until RQ11 replaces them with the approved wording |
| 7 | **Evidence uploads** | For EU/UK clients, record the evidence location rather than uploading, until the S6 basis is in place (D11). A page message is enough for now |
| 8 | **Owner close-out (R7.1–4)** | The live journey on production now includes a gated assessment. Branch protection, Admin group and the sandbox pool remain owner actions |
| 9 | Housekeeping | Correct the stale `check-repo.cjs` comment (M7) |

**Status (28 Oct 2026): built; item 8 production check done by the owner** (the one-click recovery objectives and the advisory questions work on production). Branch protection, the Admin group and the sandbox pool (R7) remain owner actions.
- Item 1: the crash is fixed in #65 (`#scanMode`, null-safe); `mapAnswers` now leaves unanswered questions out (no `[]`, `{}` or default ranking is sent).
- Item 2: the gated-path browser test runs `retailer-untested-gated` through the executive scan, every advisory round and the report (`ready`), and checks the answers sent pass the contract with no empty placeholders. Not done: a smoke step on every shared-top-bar page; all other pages' scripts were checked by hand for removed header elements (none).
- Item 3: page and `scoring-model.json` now say "LTM heuristics, pending practice-lead review; not an industry benchmark"; the test asserts the old claim is gone.
- Item 4: mappings corrected (rows 20–24, 26); no golden output records them.
- Item 5: the studio loads `rbac-guard` with `data-permission="edit"` (super admin, `accelerators[id].edit|full`, or `edit` list, as the home page's Edit button); three browser tests (signed out, assess-only, edit).
- Item 6: one notice on the setup screen and the report: not legal or regulatory advice, inputs not audited, held in AWS Mumbai.
- Item 7: the evidence section tells EU and UK clients to record where evidence is held rather than upload it.
- Item 9: `check-repo.cjs` comment corrected.

**Gate RQ0:**
- the new gated-path test passes;
- full CI green;
- golden diffs limited to item 4;
- the owner confirms the production check.

---

## RQ1: Design pack

**Objective:** fix the decisions before code. Output: `docs/cio-readiness/resilience-iq/design/DESIGN.md`, in the form of the Sovereign IQ design pack.

### Decision, buyer, edge

As validation section 6 (D1). The edge is written into the report's methodology panel and the consultant guide.

### Model

| Element | Design |
|---|---|
| Unit of assessment | The critical business service, not the enterprise. Executive mode assesses the most critical service; workshop mode adds up to five services, each with its own tolerance and strategy |
| Requirement | Impact tolerance as time, **maximum data loss and minimum service level** (CPS 230 para 38; MAS SRTO; SS1/21 impact tolerance), plus required RTO and RPO |
| Strategy ladder (D3) | rung(RTO): > 4 h → DR-01; 1–4 h → DR-02; 15–60 min → DR-03; < 15 min → DR-04. rung(RPO): ≥ 1 h → DR-01; 15–60 min → DR-02; < 15 min or near-zero → DR-03, plus DATA-03. Strategy = max of the two. DR-05 only when RTO < 15 min and RPO near-zero, shown beside DR-04 as a business choice. Bands sourced to AWS REL13-BP02 with the Azure and Google equivalents. `design/decision-matrix.json` becomes the knowledge file the engine reads |
| Modifiers | Cyber exposure, concentration and dependency add controls (CYBER-01/02/03, DATA-01/02, TP-03/05, INF-04, DR-07/08), never a higher rung. A rung is raised only where an obligation requires it, with the article recorded |
| Headline (D4) | One: Resilience posture 0–100, its exposure cap shown and explained, and critical exposure beside it. The risk-adjusted `score` is retired; flat penalties become gap severity |
| Obligation layer (D6) | Regime facts are reused from Sovereign IQ's applicability model where both tools run; otherwise asked here with the same fact IDs. Each obligation maps to capability checks with an article citation, for example: DORA Art. 11(6) yearly test → EX-07; Art. 12(3) segregated restore → EX-08/AF-CY-01; CPS 230 para 43 annual exercise → EX-16; MAS 8.2 three-yearly audit → new question; NYDFS 500.16(d)(2) restore test → EX-09. The output is an obligation table ("met / partly / not evidenced / not assessed"), never a compliance verdict |
| Impact (D5) | Optional client input: cost per hour of disruption for each service, as a low/high range. Impact = cost × hours between proven and required recovery time, shown as a range with the input named. No default; published data (IBM, Uptime, ENISA) as context only, with source, year and sample |
| Findings | Each finding: control ID (RES.*), severity, evidence status, owner role, time frame, decision or action, obligation references, playbook entries, offering |
| Modes (D7) | Executive (20 questions; 15–20 minutes, timed in RQ6), workshop (every advisory family on demand plus the triggered ones), client view (no scoring internals, probes or consultant notes) |

### Question map

Each of the 52 questions is kept, reworded or retired, with a citation and an "Unknown" option (scored as risk). New questions:
- regime facts (or a prefill from Sovereign IQ);
- tolerance for data loss and minimum service;
- SaaS data backup;
- data-corruption recovery (point in time);
- BCM audit cycle;
- exit test for critical third parties (owned here, per the Sovereign boundary).

AF-CL-03 becomes a referral to Sovereign IQ, not a score.

### Reference scenarios (D13)

Five scenarios built from public material, each with its URLs and the expected outcome written first (ladder rung, top gaps, obligations):
1. UK bank under SS1/21;
2. EU insurer under DORA;
3. Australian superannuation fund under CPS 230;
4. US state-chartered bank under NYDFS Part 500;
5. Singapore payments firm under MAS BCM, on-premises with one hyperscaler and a sovereign provider.

**Status (28 Oct 2026): approved by the owner, with every recommended default in DESIGN.md section 16 (Q1–Q15).** RQ2 and RQ3 can start. The pack is in [design/](design/DESIGN.md):
- `DESIGN.md`;
- `decision-matrix.json` and its schema (the ladder grid is checked for monotonicity);
- `reference-scenarios.json` and its schema (five scenarios, expected outcomes written before any engine run);
- `obligation.schema.json`, `finding.schema.json` and `question.schema.json`.

Both data files validate against their schemas. Open questions Q1–Q15 carry recommended defaults (DESIGN.md section 16). Q1, Q2, Q3, Q6 and Q11 are needed before RQ3. Q5 and Q14 also need the Sovereign IQ owner. Items not verified are handed to RQ2 (DESIGN.md section 17).

**Gate RQ1:**
- owner approval of the design pack and D1–D15;
- the Sovereign IQ boundary confirmed by both owners (it is also a Sovereign gate S1 condition).

---

## RQ2: Content and claims register (WS-S2)

| # | Item | Detail |
|---|---|---|
| 1 | Claims | CLM-RES-* for every client-visible statement: question basis, pattern bands, ladder rules, provider options, regulatory obligations, published data. Owner `resilience-lead`; approver product owner |
| 2 | Assumption register | `registry/assumptions.json` for Resilience IQ: the 24 assumptions in validation 4.4 with value, basis, confidence and sensitivity. A9 is cited to DORA Art. 11(6), CPS 230 para 43 and NYDFS 500.16(d) |
| 3 | Regulatory content | DORA Art. 11, 12, 24–26 and 28(8); SS1/21 and SYSC 15A; PS26/2 and PS7/26 (from 18 Mar 2027); CPS 230 paras 33–45; MAS BCM Guidelines 3, 4, 6.7, 7 and 8; NYDFS 500.16; FFIEC BCM. Each obligation has its article, applicability condition and date state (applies now / applies later, with the date) |
| 4 | Volatile items | 90-day review: provider features and names, UK reporting rules, Google Fault Injection Testing status. 12 months: standards (ISO 22301 revision, NIST SP 800-34) |
| 5 | Language lint | Banned phrases: "guaranteed", "compliant with", "certified", "zero downtime", "unbreakable", "immutable" without its mechanism, and codes as headings |
| 6 | CI | Review dates enforced by the existing register check |

**Gate RQ2:** every rendered statement resolves to a claim ID; no claim UNSOURCED in client view; this agent's source review recorded.

**Status (28 Oct 2026): approved by the owner, with every recommended default for the six decisions below.** RQ3 can start. Sources re-read on 28 Oct 2026 unless stated. Not legal advice; counsel review before external use (RQ11).
- **Item 1, claims:** 119 entries `CLM-RES-001` to `CLM-RES-119` in `packages/engine-core/src/claims/claims-register.json`. Status: V 115, S 1 (IBM 2025, quoted in search results), P 2 (ISO 22301 and ISO/IEC 27031, paid texts), UNSOURCED 1 (`CLM-RES-097`, FFIEC booklet passages; consultant view only, the only claim with `clientVisible: false`). Kinds: obligation 49, heuristic 28, provider 20, regulation 8, framework 6, market data 4, date 4. Review dates per D14: provider features, UK reporting dates, the MAS consultation and published data at 90 days (12 volatile claims plus the UNSOURCED FFIEC item; next review 26 Jan 2027); standards, regulation and provider DR frameworks at 12 months (28 Oct 2027); LTM heuristics at 6 months (28 Apr 2027, recalibrated in RQ5). The six `CLM-RES-TBD` entries in `design/decision-matrix.json` are filled.
- **Primary sources read (section 17 retried):** DORA Art. 3(60), 11, 12, 16, 24–26, 28(8) and 64, and Delegated Regulation 2024/1774 Art. 24–26, in the Official Journal text from the EU Publications Office (EUR-Lex itself still returns an empty page). NYDFS 500.16, 500.19(a) and 500.22(d)(2) in DFS's text of the Second Amendment. PRA PS7/26 (published 18 Mar 2026; implementation 18 Mar 2027) and FCA PS26/2. All eleven MAS TRM Notices (FSM-N03 to FSM-N25) and the MAS FAQ; FSM-N15 was cancelled from 8 May 2026. NIST CSF 2.0, SP 800-34 Rev. 1 and SP 800-209. IBM 2026, Uptime 2026 and ENISA 2025 publishers' pages. Every provider page in the ladder and cyber-recovery tables. **Not readable:** the FFIEC BCM booklet (HTTP 403 to every fetch); its themes are taken from SR 19-13, FIL-71-2019 and OCC 2019-57, and the BIA, third-party and cyber passages stay UNSOURCED.
- **Item 2, assumption register:** `packages/engine-core/src/accelerators/resilience-iq/registry/assumptions.json`, 38 entries: A1–A24 (as `legacyId`) with status kept, changed or retired in v2, plus 14 design heuristics (band edges, ladder rule, active-active choice, consistency rule, severity, time frames, uplift, three-year audit line, five-service limit, provider term mapping, client cost input, MAS floor, obligation status). A9 is `published_source`, cited to DORA Art. 11(6), CPS 230 paras 43–44 and 500.16(d).
- **Item 3, regulatory content:** `packages/engine-core/src/accelerators/resilience-iq/registry/obligations.json`, 47 obligations in seven regime records, valid against `design/obligation.schema.json`. `SG_MAS_BCM` and `US_FFIEC_BCM` are Resilience-owned records in Sovereign IQ's condition language (Q14); the other five read Sovereign IQ's registry. The file is in `registry/` beside the other content files, not `knowledge/` as DESIGN.md 7.5 says, because the repository-root `resilience-iq/knowledge/` is packaged to the hosted page. Each question's basis is in `registry/question-basis.json` (58 questions, framework mappings; settles validation row 3).
- **Items 4–6:** shared `banned-phrases.json` gains "compliant with", certification claims, "zero downtime", "unbreakable", "ransomware-proof", "immutable" without a lock, retention, WORM, offline or air-gap mechanism in the sentence, and `headingPatterns` (codes as headings, checked in report check R5). "Guaranteed" was already covered. Plain "certified" is not banned, because Sovereign IQ uses it correctly ("DPF-certified recipients"). The existing "recoverable" ban now skips dotted control codes. All FinOps IQ and Sovereign IQ reference reports still pass. The three registry files and the decision matrix are now checked by `check-claims.cjs`. Tests: `test/resilience-iq-content.test.ts` and a heading defect in `report-checks.test.ts`.
- **Design statements corrected by the primary text:**
  - DORA Art. 16(1): Art. 11–12 do not apply at all to small and non-interconnected investment firms and certain exempted payment, e-money and credit institutions and IORPs. These entities follow a simplified framework.
  - DORA Art. 11(3) internal audit and the cyber-attack and switchover scenarios in Art. 11(6) do not apply to microenterprises.
  - Art. 12(3) applies "when restoring backup data using own systems".
  - Art. 12(5) (secondary site at a distance) applies to central securities depositories only, so it is no longer a basis for AF-OP-01.
  - The MAS four-hour RTO is in every current TRM Notice, not only FSM-N09. Q6 is settled: the floor can be client-visible for every licence type.
  - SYSC 15A.7.1R is about approving the self-assessment, not leadership metrics. EX-15 now rests on SS1/21 7.1–7.2.
  - Uptime's current figures are 57% above USD 100,000 and one in five above USD 1m (2026 report; 2025 survey, n=94). These replace 54%/20%.
  - Google Fault Injection Testing is still Preview on its product page.
  - The design missed RTS 2024/1774 Art. 24(3)–(4): CSDs must keep RTO at 2 hours or less; trading venues must resume within or close to 2 hours with data loss close to zero. MAS TRM para 5 (4 hours of unscheduled downtime in 12 months) was also missing, and MAS has proposed an immutable or offline backup requirement (CP P012-2026, not final).
- **Owner decisions (accepted 28 Oct 2026, recommended defaults):**
  1. Add a REG-02 option "DORA simplified ICT risk management framework (Art. 16)". Recommended: add it. When it is set, Art. 11–12 obligations do not apply.
  2. Apply the RTS 2-hour floors for CSDs and trading venues in v1, or keep them for v2 under Q12. Recommended: v2, recorded as claims now.
  3. Reword the EX-09 options as "Yes, retention-locked (immutable) and restore tested in the last 12 months" / "Retention-locked (immutable), restore not tested" / "Usable backups, retention not locked" / "No usable backups" / "Unknown". Recommended: accept. The design wording fails the shared lint ("recoverable" is banned; "immutable" names no mechanism).
  4. The `us_federal_banking_supervised` B1 value (Q5) is used by `US_FFIEC_BCM.1` but not yet added to Sovereign IQ's question bank. This needs the Sovereign IQ owner and is built in RQ3.
  5. Review heuristics at 6 months. D14 names only 90 days and 12 months.

---

## RQ3: Engine v2

| # | Item | Detail |
|---|---|---|
| 1 | Strategy ladder | Replaces the DR bonuses (`runtime.ts:586-591`) and eliminations with the RQ1 ladder read from the knowledge file. Decision log states the rung for RTO, the rung for RPO and any recorded raise |
| 2 | R9 decisions (D2) | 1: blank asked advisory = Unknown; the gate requires only gate-relevant questions. 2: one effect per answer. 3: "Immutable but restore not proven" → high "Unproven Recovery". 5: D1–D6 confirmed. 6: moderate concentration → G-08 only |
| 3 | Single headline | `postureScore` with `capReason`; the risk-adjusted `score` is removed (contract version bump; stored results keep their version) |
| 4 | Obligations | `obligations[]` with regime, article, status, the questions behind it and evidence; never "compliant" |
| 5 | BIA branch (R10.5) | `critical_service_identified` adds the AF-BIA questions; tolerance for data loss and minimum service |
| 6 | Evidence changes confidence (R10.4) | Validated evidence raises confidence for the gaps it covers; rejected or missing evidence keeps them self-reported; the report shows which findings are evidenced |
| 7 | Findings model | RES.* control ID, owner role (from RA-01 to RA-10), time frame, decision, obligation refs |
| 8 | Modes in the contract | `mode: executive | workshop`; the client view is a server projection (RQ6) |
| 9 | Versions (R12.3) | Engine and knowledge versions from `version.ts`, not the page; a reopened report shows the version it was scored with and is never silently re-scored |
| 10 | Sovereign hand-off | AF-CL-03 = constrained → a referral finding to Sovereign IQ; X1/X2 prefill is offered to Sovereign IQ only with the consultant's confirmation |

**Gate RQ3:**
- unit tests per item;
- golden diffs explained and sent to this agent;
- the ladder grid (5 RTO × 6 RPO × criticality × cyber) is monotonic.

---

## RQ4: Defensibility tests (area 13)

| Test | Asserts |
|---|---|
| **Trace test** | Every number on screen, PDF and backlog carries a `data-field` (engine path) and a claim or assumption ID, and equals the engine value |
| **Reconciliation** | Screen = PDF = backlog = engine; obligation counts equal the findings that cite them; the impact range equals input × hours gap |
| **Monotonicity grid** | A stricter RTO or RPO never yields a lower rung; a better answer never lowers posture or raises a gap's severity |
| **Blank never better** | Over the reference scenarios and 1,000 random questionnaires per mode, a blank never scores better than the lowest answered option; missing-data shift ≤ 0 |
| **No invented money** | No money figure without the client's cost input; market data never multiplied by client values |
| **Assumption register** | Every constant the engine reads is in the register; the "How we calculated this" appendix lists them |
| **Language lint** | As RQ2 item 5, on every rendered output |

**Gate RQ4:** all tests in CI; the owner approves the impact model wording.

---

## RQ5: Audit, reference scenarios and recalibration (R9 sign-off, R11)

| # | Item | Detail |
|---|---|---|
| 1 | Audit adapter | Update `packages/engine-core/audit/adapters.ts` for v2 headlines: posture, exposure, rung, obligations not evidenced |
| 2 | CI thresholds | Every rating band reachable, including Resilient; dead questions only where intended and listed; no single answer moves posture by more than an agreed limit (proposal: 12) |
| 3 | Reference scenarios | Run the five RQ1 scenarios; explain or fix each disagreement (replaces the R11 back-test until engagement data exists) |
| 4 | Practice-lead review | This agent reviews the golden diffs and scenario results and writes the method note. The owner approves. Only then may the report name the review and its date (C3) |

**Gate RQ5:** no unexplained scenario disagreement; golden outputs approved in writing.

---

## RQ6: One page with executive, workshop and client modes (WS-S7)

| # | Item | Detail |
|---|---|---|
| 1 | Page | Reads the bank only (no embedded fallback, M2); mode chooser for consultants; executive timing measured with three internal users (target 15–20 minutes) |
| 2 | Client view | Built on the server, like Sovereign IQ's `client-view.ts`: no pattern scores, probes, consultant notes or fees in the response |
| 3 | Evidence (D8) | Validation by consultant or Admin only; the role is checked on the server (Cognito group or the access service). The respondent may provide, not validate (R10.3) |
| 4 | Notices | Hosting and data notice (validation section 8); disclaimer; obligation wording "not a compliance opinion" |
| 5 | Plain language | Pattern names, not codes; metrics and layers in words (H8); the cap reason shown (M3) |
| 6 | Accessibility | WCAG 2.2 AA; no horizontal scroll at 360 px; the matrix question usable by keyboard |

**Gate RQ6:**
- browser tests: every question in both modes renders and can be answered;
- sign-in → answer → save → resume → gated advisory → report journey;
- the client-view DOM has no consultant-only field;
- no console errors.

---

## RQ7: Outputs (WS-S4)

| # | Item | Detail |
|---|---|---|
| 1 | Executive PDF | Server-rendered with the shared template (`resilience-iq-report` Lambda, as `sovereign-iq-report`). The executive summary gives situation, issue, recommendation and impact range with its basis. Then: requirement baseline per service; strategy with the ladder reason and the alternative; gaps and obligations; roadmap; How LTM can help; technical execution; methodology and sources (version, date, "data provided by", disclaimer, hosting statement) |
| 2 | "How we calculated this" | Every number with inputs, formula and claim or assumption ID; the full assumption register; a sensitivity table (what changes the rung, what changes the rating) |
| 3 | Delivery-grade roadmap | Workstreams, each with activities, owner role, duration, dependencies, effort band, milestones, KPIs, prerequisites and risks:<br>• Business impact and tolerances;<br>• Recovery strategy build;<br>• Cyber recovery vault and clean room;<br>• Identity recovery;<br>• Dependency mapping and orchestration;<br>• Third-party resilience and exit;<br>• Testing programme;<br>• Governance and metrics.<br>KPIs come from `governance_and_metrics` in words: RTO attainment, restore success rate, immutable backup coverage and others. Every item traces to a finding |
| 4 | Backlog CSV | One row per playbook action: finding, control, service, platform, level, action, verification, owner role, effort, obligation refs, claim IDs |
| 5 | Retire | `window.print()` as the deliverable |

**Gate RQ7:**
- visual review of the five scenario PDFs;
- trace and reconciliation tests run on the PDF;
- the backlog imports cleanly;
- this agent re-runs the CIO challenge (validation 4.8): at least 9 of 10 answered from the report's own pages.

---

## RQ8: Platform playbook entries (WS-S3; R10.7)

**Objective:** each technical gap ends in verifiable actions on every platform the client selected:
- on-premises;
- AWS, Azure and Google Cloud;
- OCI, IBM Cloud and other public clouds;
- sovereign providers;
- SaaS and Kubernetes.

Options are named with alternatives. Approach first, then options.

| Control | Level | Approach, then options (to be sourced in RQ2) | Verification |
|---|---|---|---|
| RES.BACKUP.IMMUTABLE | Platform | WORM retention that a compromised administrator cannot shorten:<br>• AWS Backup Vault Lock (compliance mode), S3 Object Lock;<br>• Azure Backup immutable vault, enabled and locked;<br>• Google Cloud Backup and DR backup vault with enforced retention;<br>• on-premises: WORM-capable repository or object lock;<br>• OCI and sovereign providers: provider retention-lock features, found in discovery | A deletion attempt with an administrator credential is refused; retention cannot be reduced |
| RES.CYBER.ISOLATION | Platform | Backups and recovery tooling in a separate trust boundary with separate credentials and multi-party control:<br>• AWS: logically air-gapped vault in a separate account, multi-party approval;<br>• Azure: separate subscription and tenant controls (multi-user authorisation to be sourced);<br>• Google Cloud: backup vault in a separate project;<br>• on-premises: segmented backup management plane or offline copy | Production administrator credentials cannot reach the vault (tested); DORA Art. 12(3) segregation evidenced |
| RES.CYBER.CLEANROOM | Stack | Restore into an isolated environment, scan and validate, then promote. Replication is excluded (it copies a compromised state) | A timed clean-room restore of a critical service, with the malware-scan record |
| RES.IDENTITY.RECOVERY | Platform | Break-glass identities outside the primary identity provider; recovery of the directory and keys:<br>• AWS IAM emergency access;<br>• Microsoft Entra emergency accounts;<br>• Google Cloud break-glass;<br>• on-premises directory forest recovery | Break-glass login tested quarterly; directory restore exercised |
| RES.DR.STRATEGY.<rung> | Stack | The ladder rung's pattern per platform:<br>• AWS: Backup / Elastic Disaster Recovery (pilot light) / warm or hot standby / multi-Region;<br>• Azure: Backup / Site Recovery / standby regions;<br>• Google Cloud: cold / warm / hot patterns;<br>• on-premises: secondary site or cloud DR target | Measured RTO and RPO in a failover test are within requirement |
| RES.DR.ORCHESTRATION | Stack | Runbook automation and infrastructure as code:<br>• Amazon ARC, CloudFormation;<br>• Azure Site Recovery recovery plans, Bicep;<br>• Google Cloud Infrastructure Manager;<br>• Terraform and Ansible as alternatives | Recovery run without manual steps beyond approval |
| RES.TEST.CONTINUOUS | Stack | Scheduled restore tests and fault injection:<br>• AWS Resilience Hub, AWS Fault Injection Service;<br>• Azure Chaos Studio;<br>• Google Cloud Fault Injection Testing (preview);<br>• on-premises sandbox restores | Restore success rate and RTO attainment reported monthly |
| RES.DEPENDENCY.MAP | Application | Service-to-component mapping from the CMDB and observability; **needs discovery** (architecture review, traffic data) | A validated map for each critical service, reviewed annually (MAS 6.7) |
| RES.TP.EXIT | Application | Exit plan and partial migration rehearsal for each critical provider; **needs discovery** (contracts, data formats) | Rehearsal record; time to exit within tolerance |
| RES.SAAS.BACKUP | Platform | Independent backup of SaaS data: provider-native or third-party, with alternatives | Restore of a sample object set tested |

**Gate RQ8:**
- a test shows no action without a finding and no selected platform without an entry (or an explicit "no platform action");
- 100% of entries carry claim IDs and review dates;
- this agent's review recorded.

---

## RQ9: How LTM can help (WS-S5)

Generic practice names; providers appear only as options from the playbook.

| Offering | Type | Typical trigger | Execution outline | Indicative scope (SOW only) |
|---|---|---|---|---|
| DR assessment and strategy validation (Resilience Engineering) | Advisory | Executive scan complete; confidence Low or Moderate; ladder rung differs from the current pattern | BIA and tolerance workshops for each critical service, validation of the evidence register, ladder decision per service, cost of each rung | 4–8 weeks |
| Operational resilience regulatory readiness: DORA, SS1/21, CPS 230, MAS, NYDFS | Advisory | Obligations "not evidenced" | Important business services and tolerances, mapping, scenario testing plan, self-assessment pack. Counsel engaged by the client | 6–12 weeks |
| Cyber recovery vault and clean room build (Resilience Engineering with Cloud Transformation) | Implementation | G-03, G-05, G-06 | Isolated account, subscription or project; immutable vault; identity recovery; clean-room runbook; first exercise | 8–16 weeks |
| DR build to the target rung | Implementation | Strategy rung above current capability | Landing-zone recovery Region or site, replication, orchestration as code, failover test | 8–20 weeks per service group |
| Third-party exit and concentration programme (with Sovereign Cloud where the driver is sovereignty) | Advisory, then implementation | G-08, AF-TP-02/03, Sovereign IQ referral | Exit plans, portability, partial migration rehearsal | 6–12 weeks |
| Resilience engineering programme | Transformation | Several high gaps; maturity ≤ Defined | Multi-wave programme: governance, testing calendar, continuous validation, investment prioritisation | 12–24 months |
| Managed recovery testing | Transformation (run) | Testing gaps; obligations needing annual tests | Scheduled restore and failover tests, reporting against tolerances | 12 months+ |

The client sees type, purpose and execution outline. Scope ranges and fees appear only in the consultant SOW.

**Gate RQ9:** a test confirms every finding maps to at least one offering; the SOW export is consultant-only; the language lint passes.

---

## RQ10: AI on the shared Bedrock service (WS-S1, optional)

Recommended default (D10): **no AI in v1.** The report is clear without generated narrative. If the owner wants narrative later:

| # | Item |
|---|---|
| 1 | The shared WS-S1 service only: Claude Opus 5 on the Bedrock India geographic profile (`in.anthropic.claude-opus-5`), called from ap-south-1, with inference in Mumbai and Hyderabad only (owner decision D29, 27 Oct 2026). No cross-region inference outside India |
| 2 | Off by default; per-engagement toggle by the consultant; the state is printed on the report |
| 3 | Input is the engine result only; client name, evidence content and consultant notes are never sent |
| 4 | The grounding check (`src/ai/grounding.ts`) rejects any number, regulation, provider claim or pattern not in the engine output |
| 5 | Eval set: five scenarios plus adversarial prompts (asking for "compliant", "zero downtime" or a named "best" provider) |

**Gate RQ10:** either "no AI" recorded in the methodology panel, or grounding 100% on the eval set with prompts and outputs logged.

---

## RQ11: Client data, counsel review and operations (WS-S6; R12.1–2)

| # | Item | Detail |
|---|---|---|
| 1 | Data inventory | Client name, sector, respondent email, answers, results, evidence files and locations, consultant identity |
| 2 | Transfer basis | EU SCCs and UK IDTA or Addendum with a transfer risk assessment, as for Sovereign IQ; evidence upload for EU/UK clients reopened only after this (D11) |
| 3 | Notice | Validation section 8 wording on the start screen, PDF and privacy notice |
| 4 | Retention | Assessments, evidence and logs deleted after 24 months or on request; tested job |
| 5 | Counsel review | Every regulatory obligation statement (EU/UK, US, APAC counsel as for Sovereign IQ D9); comments recorded in the register as `COUNSEL` |
| 6 | Monitoring (R12.1) | CloudWatch alarms on the three Lambdas (errors, 5xx, latency), a dashboard, alerts to the owner; tested by forcing an error on dev |
| 7 | Dev separated from production (R12.2) | Own user pool and reports bucket for dev (reverses the earlier owner decision; needs agreement) |

**Gate RQ11:** notice published; retention job tested; counsel comments recorded; alarms tested.

---

## RQ12: Re-score against all 13 areas

| # | Item |
|---|---|
| 1 | Re-run this agent's review with fresh evidence: tests, audit, grid report, register, PDFs, playbook coverage |
| 2 | Re-verify volatile claims on the re-score date (provider features, UK reporting dates, standard editions, latest IBM, Uptime and ENISA editions) |
| 3 | Two internal "hostile CIO" sessions with the ten questions from validation 4.8 |
| 4 | Consultant pilot on 2–3 internal or friendly engagements (R11.2); CIO pilots are booked only after all accelerators improve (FRAMEWORK.md) |
| 5 | Self-service decision (R12.5), with owner and practice-lead reasons recorded |

**Gate RQ12:** all 13 areas Pass, or each Partial accepted in writing by the owner.

| # | Area | Target evidence |
|---|---|---|
| 1 | Purpose and distinctness | Decision, buyer and edge written; Sovereign boundary implemented; Cloud IQ and Strategy IQ overlaps resolved |
| 2 | Functionality | Journey, gated-path and save/resume tests; PDF and backlog |
| 3 | Questions and answers | Citation per question; Unknown everywhere; tolerance in three dimensions; regime facts |
| 4 | Depth | Executive 15–20 minutes measured; workshop on demand; one engine and contract |
| 5 | Scoring engine | Audit in CI; monotonic grid; every band reachable; golden approved |
| 6 | CIO alignment | Each finding has decision, owner role and time frame; impact range from client input |
| 7 | Output | PDF structure; trace test; backlog |
| 8 | Sources | Register complete; review dates in CI |
| 9 | Legal validity | Obligations cited by article and dated; disclaimer; notice; counsel reviewed |
| 10 | AI scope and toggle | No AI recorded, or WS-S1 on the India profile with eval 100% |
| 11 | Technical execution | Playbook entries for each selected platform with verification |
| 12 | Commercial pull-through | Every finding in How LTM can help; SOW consultant-only |
| 13 | Report defensibility | Trace, reconciliation, monotonicity and blank tests green; assumption register complete; CIO challenge ≥ 9/10 |

---

## Decisions needed from the owner

**Decided 27 Oct 2026: the owner accepted every recommended default below (D1–D15).** RQ1 can start.

Full options are in [VALIDATION.md](VALIDATION.md) section 9. Recommended defaults in short:

| # | Decision | Recommended default | Needed by |
|---|---|---|---|
| D1 | Decision and buyer | "Which recovery strategy and cyber-recovery capability to fund for each critical service, and can we stay within impact tolerance"; CIO with CRO or head of operational resilience, CISO and BCM lead **(accepted 27 Oct 2026)** | RQ1 |
| D2 | R9 decisions 1–6 | Accept 1, 2, 3, 5 and 6 as recommended; 4 superseded by D3 **(accepted 27 Oct 2026)** | RQ1 |
| D3 | Strategy rule | Written ladder, max of the RTO and RPO rungs; DR-05 only for RTO < 15 min with near-zero RPO; modifiers add controls, not rungs **(accepted 27 Oct 2026)** | RQ1 |
| D4 | Headline | One posture score with its cap explained; retire the hidden risk-adjusted score **(accepted 27 Oct 2026)** | RQ1 |
| D5 | Money | Client-input cost per hour as a range; no market default; published data as context only **(accepted 27 Oct 2026)** | RQ1 |
| D6 | Regulatory scope v1 | DORA, SS1/21 and SYSC 15A (PS26/2 and PS7/26 dated), CPS 230, MAS BCM, NYDFS 500.16, FFIEC BCM; applicability shared with Sovereign IQ **(accepted 27 Oct 2026)** | RQ1 |
| D7 | Modes | Executive, workshop and server-side client view **(accepted 27 Oct 2026)** | RQ1 |
| D8 | Evidence validation | Consultant or Admin only, with a server-checkable role **(accepted 27 Oct 2026)** | RQ6 |
| D9 | Question bank studio | Admin only; production edits by PR **(accepted 27 Oct 2026)** | RQ0 |
| D10 | AI | None in v1; if added, WS-S1 on `in.anthropic.claude-opus-5` from ap-south-1 (D29) **(accepted 27 Oct 2026)** | RQ10 |
| D11 | Evidence uploads for EU/UK clients | Reference-only until the S6 basis; 24-month retention **(accepted 27 Oct 2026)** | RQ0, RQ11 |
| D12 | Overlaps | Cloud IQ routes DR here; Strategy IQ renames "Resilience (%)"; Sovereign boundary confirmed **(accepted 27 Oct 2026)** | RQ1 |
| D13 | Back-testing | Five public-source reference scenarios with outcomes written first **(accepted 27 Oct 2026)** | RQ1 |
| D14 | Volatile items | 90-day review for providers and UK reporting; 12 months for standards **(accepted 27 Oct 2026)** | RQ2 |
| D15 | Use until re-score | Consultant-led only, once the RQ0 hotfix ships; no client self-service before RQ12 **(accepted 27 Oct 2026)** | RQ0 |
