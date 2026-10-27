# Resilience IQ: validation report

**Date:** 27 Oct 2026  **Reviewer:** `resilience-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves, and qualified counsel reviews every regulatory statement before external use.

**Scope:** Resilience IQ as on `main` on 27 Oct 2026, including PR #55 (light LTM Vantage palette and shared top bar). Scored on all 13 areas of the CIO-readiness scorecard ([FRAMEWORK.md](../FRAMEWORK.md)). This review reconciles with, and does not repeat, the earlier [validation of 12 Oct 2026](../../resilience-iq/VALIDATION.md), the [roadmap R7–R12](../../resilience-iq/ROADMAP.md) and the [R9 review pack](../../resilience-iq/R9_REVIEW_PACK.md) (section 7).

| | Resilience IQ (today) |
|---|---|
| Page | `Accelerators/resilience-iq.html` (510 lines; embeds a fallback copy of the 20 executive questions at lines 77–98) |
| Question bank studio | `Accelerators/resilience-iq-question-bank.html` (81 lines; no `rbac-guard`) |
| Engine | `packages/engine-core/src/accelerators/resilience-iq/` (engine 1.0.0, `runtime.ts` 957 lines) reading `resilience-iq/knowledge/*.json` (20 executive and 32 advisory questions, 6 domains, 52 patterns, 10 gap types) |
| API | `amplify/functions/evaluate-resilience-iq/`, `manage-resilience-assessment/`, `manage-resilience-evidence/` (Cognito JWT authorizer and accelerator access check) |
| Tests | `evaluate.test.ts` and the other `test:resilience-all` suites; `packages/engine-core/test/resilience-iq.test.ts` with golden `test/golden/resilience-iq.json`; `tests/e2e/resilience-iq.spec.ts` (12) |

**Method:**
- Read the page, studio, engine, contract, three handlers, the knowledge base, the design references in `resilience-iq/design/`, the earlier validation, roadmap and R9 pack, and the Sovereign IQ boundary (`docs/cio-readiness/sovereign-iq/design/DESIGN.md` section 11).
- Ran `npm test`: typecheck, 906 unit tests in 25 files, reports-service tests and `check:repo`, all pass.
- Ran `npm run test:resilience-all`: bank, deployment and persistence validators and all engine and handler suites pass.
- Ran `npx playwright test tests/e2e/resilience-iq.spec.ts`: 12 passed.
- Ran `npm run audit:engines`: the Resilience IQ results match `docs/phase3/AUTOMATED_AUDIT.md` exactly.
- Ran my own probes, throwaway scripts outside the repo (nothing in the repo changed):
  - the recommended strategy over the full RTO × RPO grid, for two client profiles;
  - the four sample archetypes through the engine;
  - a browser run of a gated executive scan into the advisory deep dive;
  - the question bank studio without a session.
- Web verification of every provider, standard and regulatory statement. Direct fetches worked this time for AWS, Microsoft Learn, the FCA, MAS and APRA documents (the APRA and MAS PDFs were read with pdfjs). EUR-Lex returned an empty page, so DORA text is from the Springlex reproduction of the OJ text. All sources were checked on 27 Oct 2026.

**Repository note:** the review ran on branch `sovereign-iq-c20-group-turnover`. It is one Sovereign IQ commit ahead of `main` and touches no Resilience IQ file. PRs #57 and #58, merged to `main` since, also touch no Resilience IQ file.

---

## 1. Verdict

**Resilience IQ is not CIO ready. Since this morning it also cannot finish most assessments, so the advisory-path fix (RQ0 item 1) should ship before any client session.**

The idea is the strongest in the portfolio for this domain:
- business requirements first, strategy before provider;
- evidence-aware gaps;
- a clear refusal to issue a recommendation when RTO or RPO is unknown.

The plumbing is sound. Sign-in, server save and resume, ownership checks, evidence upload and the request contract all work and are tested. But four things stand between it and a CIO.

1. **The advisory deep dive is broken in production.** PR #55 (commit `726dad8`, 27 Oct 2026) replaced the header element the page writes to. When the engine asks for advisory questions, `document.querySelector('.badge').textContent` (`resilience-iq.html:268`) throws. The page shows "Advisory questions unavailable" and Retry loops back to the same error.
   - In the 800-run audit, 67% of completed executive scans are withheld pending advisory questions. The `retailer-untested-gated` archetype hits the error in a browser run.
   - No browser test drives the page into that path, so CI stayed green.
2. **The recommended recovery strategy is not monotonic, and it contradicts the knowledge base's own pattern bands and AWS's published guidance.** R9 decision 4 found one case. The full grid shows more:
   - relaxing the RPO can raise the recommendation to Active-Active;
   - RTO 15–60 minutes always gets Hot Standby;
   - RTO 4–24 hours always gets Pilot Light.
3. **Every report says its scoring is "reviewed by the BCP/DR practice".** No review has been recorded: R9 is waiting on the practice lead, and I cannot sign off. The browser test asserts the sentence (`resilience-iq.spec.ts:162`).
4. **There is nothing a CIO can take away.** There is no server PDF (only `window.print()`), no backlog, and no "How LTM can help". There is no regulatory content for any of the four markets. The provider options the engine computes have not been shown on the report since 6 Oct (`e3d7d8c` removed the section). The claims register has no Resilience IQ entry.

**Claims:** of 34 statements checked, 20 are correct (one of them incomplete), 8 incorrect, 3 outdated and 3 unsourced (section 5).

**What still holds from 12 Oct:** security, persistence, the request contract, error handling and the honesty of "LTM heuristic, not a benchmark". What no longer holds: "missing answers never flatter" (still Partial), the practice-review claim, and Azure immutable vault availability, which is now settled (section 7).

My recommendation is to keep the engine and its strategy-first model and rebuild around them, in this order:
- containment now;
- the R9 decisions, plus a written strategy ladder;
- a regulatory-obligation layer that reuses Sovereign IQ's applicability model;
- the shared outputs, playbook and offerings already built for FinOps IQ and Sovereign IQ.

---

## 2. Scorecard

Pass / Partial / Fail per area, with the target. Evidence is file and line, test, probe or source.

| # | Area | Current | Target | Evidence |
|---|---|---|---|---|
| 1 | Purpose and distinctness | Partial | Pass | No named CIO decision or buyer anywhere. The page says only "Assess the enterprise ability to sustain critical business services through disruption — before technology choices are made" (`resilience-iq.html:120`). No written edge over free alternatives such as AWS Resilience Hub, the Azure and Google DR guidance, the FFIEC BCM booklet or ISO 22301 self-assessment. Overlap is limited and the Sovereign IQ boundary is written (Sovereign DESIGN section 11), but Resilience IQ does not implement its side: AF-CL-03 is a dead question and nothing refers to Sovereign IQ. Light overlap with Cloud IQ's DR question (D4) and Strategy IQ's "Resilience (%)" headline (section 6) |
| 2 | Functionality | **Fail** | Pass | **Works:** sign-in (`requireAppLogin`, rbac-guard), server save and resume with ownership (`manage-resilience-assessment`), evidence upload and download, 12/12 browser tests.<br>**Fails:**<br>• the advisory deep dive dead-ends (`resilience-iq.html:268`; probe, finding C1);<br>• no PDF: "Print / Save Executive Report" calls `window.print()` (`:299`);<br>• no backlog export;<br>• no browser test drives the gated path or answers every advisory question;<br>• an unanswered multi-select is sent as `[]` and counts as answered (`mapAnswers`, `:273`) |
| 3 | Questions and answers | Partial | Pass | **Good:** the domain coverage (BCP, DR, cyber recovery, operational resilience, third parties, infrastructure) follows ISO 22301 and NIST SP 800-34 structure, in wording a CIO recognises.<br>**Gaps:**<br>• no question cites its basis: no `framework_mappings` on any of the 52 questions; `design/frameworks.json` is not loaded;<br>• "Unknown" is missing on EX-14, EX-15, AF-TS-01, AF-TS-03, AF-TP-04 and AF-GV-01 to AF-GV-03, and on the EX-05 matrix;<br>• overlapping options: EX-08 "Potentially" vs "Unknown"; EX-17 "Documented only" vs "Contractual only";<br>• impact tolerance asks only for time (EX-02). APRA CPS 230 para 38 also requires maximum data loss and minimum service levels during disruption;<br>• no regulatory-applicability, SaaS-backup or data-corruption questions |
| 4 | Depth | Partial | Pass | One engine and one contract. A 20-question executive scan (about 15–20 minutes, not timed) adds up to 8 advisory questions per round when a gate triggers (`runtime.ts:806-813`). There is no workshop mode a consultant can choose (all advisory families on demand), no client mode, and the follow-up path is broken (area 2) |
| 5 | Scoring engine | **Fail** | Pass | Audit:<br>• missing-data shift +6 (posture) and +7 (risk-adjusted);<br>• 18 dead questions (3 intentional);<br>• "Resilient" is never reached;<br>• 67.1% withheld.<br>Strategy selection is non-monotonic in RTO and in RPO (section 4.2, C2). The labels do not match: the pattern scores "/100" (`resilience-iq.html:324`) are base 55 plus bonuses (`runtime.ts:586-640`). Two scores exist, but only the posture is shown; the risk-adjusted `score` is stored and never displayed. Golden outputs are not lead-approved; R9 decisions 1–6 are open |
| 6 | CIO alignment | Partial | Pass | It leads with risk exposure, a recommended strategy and blocked-until-known objectives, which is good. But:<br>• no money at all: no impact of downtime and no investment range;<br>• the headline decision is a code ("DR-05", `:308`);<br>• raw identifiers appear on the report (`critical_service_RTO_attainment`, `observability_governance`, `BP-07`, `TP-03/TP-05/INF-03/INF-04/DR-07`);<br>• the roadmap drops the owner role that `blueprint-engine.json` carries (RA-01 to RA-10) and returns action strings only (`runtime.ts:714-726`) |
| 7 | Output | **Fail** | Pass | Browser print only.<br>**Missing:**<br>• executive summary in situation / issue / recommendation form;<br>• How LTM can help;<br>• technical execution (removed in `e3d7d8c`);<br>• sources list, version, "data provided by", disclaimer and hosting statement.<br>"About this assessment" is one paragraph (`:347`). The page is on-brand (light Vantage, PR #55) |
| 8 | Sources | **Fail** | Pass | 0 Resilience IQ claims in `packages/engine-core/src/claims/claims-register.json` (507 claims, Sovereign IQ and FinOps IQ only); 0 rows in `docs/claims-register/claims-inventory.csv`. The knowledge files carry `last_reviewed: 2026-10-04` but no owner, source or next review |
| 9 | Legal validity | **Fail** | Pass | Few regulatory statements, so few errors, but:<br>• no regulatory content for EU/UK, US or APAC, although Sovereign IQ hands UK operational resilience maturity to Resilience IQ;<br>• no "not legal advice" disclaimer;<br>• client name, sector, respondent email and evidence files (DR test reports, architecture documents) are stored in AWS Mumbai with no notice, no transfer basis and no retention rule;<br>• no counsel review |
| 10 | AI scope and toggle | Pass | Pass | No AI of any kind: no BYOK code, no keys, no vendor calls in the page (grep for openai/anthropic/gemini/bedrock/apiKey: none). If narrative is added it must use WS-S1 on the Bedrock India profile (owner decision D29, 27 Oct 2026) |
| 11 | Technical execution | **Fail** | Pass | The engine maps patterns to AWS, Azure, GCP and on-premises options per selected environment (`runtime.ts:643-660`), but:<br>• the report does not show them;<br>• no verification step, owner role or level (platform / stack / application);<br>• nothing for "Other public cloud", SaaS or sovereign providers;<br>• four mapping errors (section 5, rows 20–23, 26);<br>• not in the shared playbook (`packages/engine-core/src/playbook/`), which R10 item 7 planned |
| 12 | Commercial pull-through | **Fail** | Pass | No offerings, no typing, no SOW. There is also no sales language, which is good |
| 13 | Report defensibility | **Fail** | Pass | Section 4: 24 assumptions, none with a stated source; no "How we calculated this"; the roadmap is not delivery-grade; the rating cap is unexplained. CIO challenge: 0 answered, 3 partly, 7 not |

**Totals:** 1 Pass (10), 4 Partial (1, 3, 4, 6), 8 Fail.

---

## 3. Findings

Ranked Critical, High, Medium. "Consequence" is for a CIO or for LTM.

### Critical

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| C1 | **The advisory deep dive dead-ends, in production since PR #55.**<br>• `loadAdvisoryQuestions` sets `document.querySelector('.badge').textContent`. The shared top bar now uses `.vt-badge`, so the call throws "Cannot set properties of null".<br>• The error panel's Retry re-evaluates, sends `[]` for the unanswered multi-selects (which then count as answered), receives new advisory IDs and throws again | `resilience-iq.html:268, 271, 273`; commit `726dad8`; browser probe on `retailer-untested-gated` ("Advisory questions unavailable / Cannot set properties of null (setting 'textContent') / Retry", twice); audit: 67.1% of random scans withheld pending advisory answers | Any client with untested recovery, ransomware exposure or a critical-service gate cannot finish. The consultant is stuck in front of the client | Hotfix now: target `.vt-badge` or skip the label when absent; send nothing, not `[]`, for unanswered multi-selects. Add a browser test that drives a gated archetype through every advisory question to a ready report | Probe (section 4.1) |
| C2 | **Strategy selection is non-monotonic and contradicts the pattern bands and AWS guidance.**<br>• RPO near-zero: RTO < 15 min → Active-Active; 15–60 min → Hot Standby; 1–4 h → Warm Standby; 4–24 h and > 24 h → **Active-Active**.<br>• Workforce-only client, RTO < 15 min: RPO < 15 min → **Warm Standby**, RPO 1–4 h → **Active-Active**, so a looser data-loss tolerance buys a dearer pattern.<br>• RTO 15–60 min → Hot Standby at every RPO (bank profile), although AWS states pilot light gives RTO "in tens of minutes" and warm standby "in minutes".<br>• RTO 4–24 h → Pilot Light at every RPO, although backup and restore gives "RTO in 24 hours or less".<br>• `patterns.json` and `design/decision-matrix.json` carry sensible bands; the engine ignores them | `runtime.ts:586-591` (bonuses), `:739-741` (eliminations); `patterns.json` DR-01–05 `rto_band`/`rpo_band`; grid in section 4.2 | "Why does relaxing our RTO make you recommend Active-Active?" has no answer. Over-specified patterns cost the client money and LTM credibility | Replace the bonuses with a written ladder: rung = max(rung for RTO, rung for RPO), the lowest-cost pattern that meets both; raise a rung only for a named, recorded reason (D3). Grid monotonicity test in CI. Supersedes R9 decision 4 | AWS REL13-BP02; AWS DR whitepaper (rows 9–16) |
| C3 | **A false method claim on every report.** "Question scores, domain weights, penalties and rating bands are LTM heuristics reviewed by the BCP/DR practice". No review has been recorded: R9 is "waiting on the practice lead" and its review pack is unsigned. The browser test asserts the sentence | `resilience-iq.html:347`; `scoring-model.json` `basis`; `resilience-iq.spec.ts:162`; `R9_REVIEW_PACK.md` (all boxes unticked) | A CIO who asks "who reviewed this, when?" gets no answer. It overstates the review this agent can give (advice, not sign-off) | Now: "LTM heuristics, pending practice-lead review; not an industry benchmark". After RQ5: name the review and its date, with the owner's approval | FRAMEWORK.md "Practice lead" decision |

### High

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| H1 | **No deliverable a CIO can keep.**<br>• Browser print only; no backlog.<br>• No methodology, sources, version, "data provided by", disclaimer or hosting statement.<br>• Engine fields not shown: `technologyOptions`, `supportingControls`, `decisionLog`, `domainScores` | `resilience-iq.html:294-348`; `e3d7d8c` (6 Oct) removed "Technology Options" | Fails areas 7, 11 and 13; the report cannot be sent after the session | Reuse the WS-S4 server PDF and CSV (`src/report/pdf.ts`, `csv.ts`, as `sovereign-iq-report`) (RQ7) | FRAMEWORK.md area 7 |
| H2 | **No regulatory content for the four markets.**<br>• The KB cites no regulation; `design/frameworks.json` lists DORA and the FCA but is not loaded.<br>• Sovereign IQ grades whether DORA, UK operational resilience and CPS 230 apply, and hands "impact tolerances, mapping, scenario testing and recovery" to Resilience IQ, which does not assess them.<br>• EX-02 captures only time; CPS 230 para 38 also needs data-loss and minimum-service tolerances | KB grep (no regulation strings); Sovereign DESIGN section 11 | The regulated buyer (bank, insurer) is the natural buyer and gets nothing on DORA Art. 11–12, SS1/21, SYSC 15A, CPS 230, MAS BCM or NYDFS 500.16 | Obligation layer reusing Sovereign IQ's applicability facts: each obligation becomes a capability check with an article citation (RQ1–RQ3). Counsel gate | Rows 27–33 |
| H3 | **Scoring faults still open from 12 Oct.**<br>• Blanks flatter (+6/+7).<br>• "Resilient" is unreachable.<br>• Double counting (EX-09, EX-12, EX-19).<br>• "Immutable but restore not proven" = critical G-03.<br>• Moderate concentration = critical G-04, which is what keeps the bank at "Managed".<br>• Two scores, one hidden | Audit; R9 pack decisions 1–6 (all reproduced on today's engine) | Unstable, partly unexplainable headline | My recommendations on R9 decisions 1–6 in section 9 (D2) and PLAN RQ3 | — |
| H4 | **Provider mappings contain errors and no verification.**<br>• AWS Elastic Disaster Recovery and Azure Site Recovery appear under DR-01 Backup and Restore.<br>• Elastic Disaster Recovery appears under DR-04 Hot Standby.<br>• GCP "Fault Injection Service" (an AWS product name).<br>• "AWS Application Recovery Controller" (renamed).<br>• The Azure immutable vault "confirm regional availability" note is outdated.<br>• No sovereign, other-cloud or SaaS options | `implementation-mappings.json` | A cloud architect in the room corrects LTM | Fix now (RQ0); move to the shared playbook with a verification step and claim IDs (RQ8) | Rows 20–26 |
| H5 | **No claims register entries.** Every constant, band, pattern statement and provider option is unsourced in the register | Register and inventory counts above | Area 8 cannot pass | CLM-RES-* entries for every client-visible statement and constant (RQ2) | — |
| H6 | **No commercial pull-through.** Gaps end in roadmap strings; nothing maps to advisory, implementation or transformation work | `runtime.ts:714-726` | The tool opens no next engagement | WS-S5 offerings by control ID (RQ9) | FRAMEWORK.md area 12 |
| H7 | **Client-data handling undocumented and too open.**<br>• Client name, sector, respondent email and evidence files (up to 4 MB: DR test reports, architecture) are stored in ap-south-1 with no notice or retention rule.<br>• The respondent can validate their own evidence (ROADMAP R10 item 3).<br>• The question bank studio has no `rbac-guard`; the probe opened it without a session | `resilience-iq.html:131-135, 336`; `manage-resilience-evidence/handler.ts`; `resilience-iq-question-bank.html:1-40` | EU/UK client data reaches India unannounced. Self-validated evidence is self-assessment, not evidence | Notice and S6 basis; validation by consultant or Admin only, with a server-checkable role; guard the studio (RQ0, RQ6, RQ11) | FRAMEWORK.md "Hosting", S6 |
| H8 | **Jargon instead of a decision.**<br>• "Executive decision: DR-05".<br>• Snake-case metrics and layers on the report.<br>• Loading text "Applying decision branches, evidence confidence, hard constraints, pattern ranking and blueprint logic" (`:229`).<br>• The roadmap owner is dropped | `resilience-iq.html:229, 308, 328, 344` | Reads as a tool dump, not advice | Plain names; each finding ends in a decision or action with owner role and time frame (RQ3, RQ7) | FRAMEWORK.md area 6 |

### Medium

| # | Finding | Evidence | Fix |
|---|---|---|---|
| M1 | "Unknown" missing on 9 questions and the EX-05 matrix; EX-08 "Potentially" overlaps "Unknown"; AF-DR-04 options in odd order (No / Yes / Partially / Unknown) | `question-bank.json` | Rewrite in RQ2 with citations |
| M2 | The page embeds a fallback question list whose wording has drifted (EX-08 "How confident are you that recovery assets remain usable?" with answers to a different question) | `resilience-iq.html:85` vs bank EX-08 | Read the bank only; fail clearly if it is unavailable |
| M3 | The rating cap is not explained: the bank shows posture 86 (the "Resilient" band) and rating "Managed" | `runtime.ts:448-455`; report `:302-305` | Show "capped at Managed by High critical exposure (G-04, G-05)" |
| M4 | Sovereign IQ boundary not implemented on this side: AF-CL-03 (dead) should refer to Sovereign IQ; X1/X2 prefill from AF-TP-02/03 not offered | Sovereign DESIGN 11; audit dead list | RQ3 |
| M5 | Cloud IQ's DR question ranks "Active-active multi-region" as more mature than active-passive, against requirement-first selection; Strategy IQ calls a sourcing and talent score "Resilience (%)" | `cloud-iq/knowledge-base.json:1126-1143`; `strategy-iq` S5.1–S5.4 | D12 |
| M6 | Version recorded by the page is hard-coded (`ASSESSMENT_VERSIONS`, `:100`); reopened reports are not checked against the scoring version (ROADMAP R12 item 3) | | RQ3 |
| M7 | `scripts/check-repo.cjs:16-17` says Resilience IQ is exempt from repository rules, but the list only exempts Cost IQ (stale comment) | | Correct the comment |

---

## 4. Report defensibility (area 13)

**Method:** there are no reference clients, so I ran the four sample archetypes (`packages/engine-core/test/resilience-iq-samples.ts`) through the engine. I rendered the gated archetype in the browser. I then audited the bank report as a sceptical CIO and CFO would.

### 4.1 The sample reports' numbers

| Archetype | Status | Posture (shown) | Risk-adjusted score (stored, not shown) | Rating | Maturity | Critical exposure | Strategy | Confidence | Gaps |
|---|---|---|---|---|---|---|---|---|---|
| `regulated-bank-tested` | ready | 86 | 80 | Managed (band: Resilient, capped) | Defined | High | DR-05 Active-Active (94/100; DR-04 80, DR-03 79) | High (85) | G-04 critical, G-05 critical, G-07, G-08 |
| `retailer-untested-gated` | withheld; **page dead-ends** (C1) | — | — | — | — | — | — | Blocked | 7 (3 critical) |
| `objectives-unknown` | withheld | — | — | — | — | — | — | Blocked | 9 (5 critical) |
| `empty` | withheld | — | — | — | — | — | — | Blocked | G-01 |

The bank's roadmap:

| Wave | Actions |
|---|---|
| W0 (0–30 days) | "Remove critical shared failure domain"; "Build cyber recovery vault/clean recovery capability" |
| W1 (31–90 days) | Four actions, including "Validate and implement DR-05 against measured RTO/RPO" |
| W2 (3–6 months) | The same two strategy actions repeated |
| W3 (6–18 months) | "Scale testing, dependency resilience and continuous validation" |

### 4.2 Strategy grid (probe)

Recommended strategy by RPO (rows) and RTO (columns). Bank profile (very high criticality, ransomware could reach recovery, moderate concentration):

| RPO \ RTO | < 15 min | 15–60 min | 1–4 h | 4–24 h | > 24 h |
|---|---|---|---|---|---|
| Near-zero | DR-05 | DR-04 | DR-03 | **DR-05** | **DR-05** |
| < 15 min | DR-04 | DR-04 | DR-03 | DR-02 | **DR-03** |
| 15–60 min | DR-04 | DR-04 | DR-03 | DR-02 | DR-01 |
| 1–4 h | DR-04 | DR-04 | DR-03 | DR-02 | DR-01 |
| 4–24 h | DR-04 | DR-04 | DR-03 | DR-02 | DR-01 |
| > 24 h | DR-04 | DR-04 | DR-03 | **DR-02** | DR-01 |

Workforce-only criticality, recovery isolated, no concentration. Column RTO < 15 min, from near-zero RPO down to > 24 h:

| RPO | Near-zero | < 15 min | 15–60 min | 1–4 h | 4–24 h | > 24 h |
|---|---|---|---|---|---|---|
| Strategy | DR-05 | DR-03 | DR-03 | **DR-05** | **DR-05** | **DR-05** |

**Against AWS REL13-BP02:**

| Strategy | RPO | RTO |
|---|---|---|
| Backup and restore | Hours | 24 hours or less |
| Pilot light | Minutes | Tens of minutes |
| Warm standby | Seconds | Minutes |
| Active-active | Near zero | Potentially zero |

On that basis these cells over-specify:
- RTO 15–60 min with RPO ≥ 15 min (pilot light or warm standby would meet it);
- RTO 4–24 h with RPO ≥ 4 h (backup and restore would meet it);
- RPO < 15 min with RTO > 24 h (pilot light would meet it).

The knowledge base's own ladder (`design/decision-matrix.json` S1–S5) agrees with AWS; the engine does not.

### 4.3 Number trace (bank archetype)

| Number on the report | Engine field | Inputs and formula | Source or assumption | Traceable? |
|---|---|---|---|---|
| Resilience Posture 86 | `postureScore` | Σ domain score × weight; domain = mean option score × (0.7 + 0.3 × confidence), minus advisory domain penalties | A1–A5 (no source) | Formula in code only; no appendix |
| Rating "Managed" | `rating` | Band of posture (75–89 Resilient), capped at Managed by High exposure | A6, A7 | **No** (cap not shown) |
| Maturity "Defined" | `maturity` | Thresholds 40/60/75/90; capped by exposure; level 4+ needs test ≤ 12 months and scenario exercise | A8, A9 | **No** |
| Critical exposure "High" | `criticalExposure` | ≥ 1 critical or ≥ 4 high gaps | A10 | Partly (gaps listed) |
| DR-05 94/100, DR-04 80, DR-03 79 | `patternRanking[].score` | 55 + RTO/RPO/criticality bonuses + 3 for environment | A11–A13 | **No** |
| Confidence "High" | `recommendationConfidence` | 95 (independently validated) − 10 (critical gaps) = 85; High ≥ 80 | A14 | **No** |
| "0–30 days", "31–90 days", "3–6 months", "6–18 months" | `roadmap[].window` | Constants; gaps G-01–G-06 → W0, others → W1, max 4 per wave | A15, A16 | **No** |
| Required RTO / RPO | `businessRequirements` | Client input | Client | Yes |
| History list "Posture 86" | `postureScore` | As above | | Partly |
| Risk-adjusted score 80 | `score` | Posture − flat penalties (10, 15, 8, 8, 6, 8) − advisory overall penalty (max 20) | A17, A18 | Stored, never shown |

Of 10 number types, 7 have no trace a CIO can see. None carries a claim or assumption ID.

### 4.4 Assumption register

| # | Assumption | Value | Basis today | Confidence | Sensitivity |
|---|---|---|---|---|---|
| A1 | Domain weights | BCP .18, DR .20, CYBER .18, OPS .16, TP .12, INFRA .16 | None | Low | ±3–4 posture per 0.05 shift |
| A2 | Option scores per question | `scoring-model.json` `question_scoring` | None | Low | EX-12 alone moves posture 12 |
| A3 | Evidence confidence multiplier | 0.7 + 0.3 × (0.5 / 0.7 / 0.85 / 0.95 / 1.0) | None | Low | Up to −15% on every domain |
| A4 | Unanswered domain scores 0 | R8 | Product decision | Medium | Blocks flattering |
| A5 | Advisory domain penalties; overall cap 20 | `advisory_adjustments` | None | Low | Up to −20 |
| A6 | Rating bands | 40 / 60 / 75 / 90 | None | Low | Label |
| A7 | Exposure caps (R3 D1) | High → Managed; Severe → Fragile | R3 default, unconfirmed (R9 D5) | Medium | Bank 86 → Managed |
| A8 | Maturity thresholds | 40 / 60 / 75 / 90 | None | Low | Label |
| A9 | "Tested" needs a test ≤ 12 months and scenario exercise | `runtime.ts:458-466` | None stated; **groundable**: DORA Art. 11(6), CPS 230 para 43, NYDFS 500.16(d) all require at least annual testing | Medium | Maturity ≤ 3 |
| A10 | Exposure: ≥ 3 critical = Severe; ≥ 1 critical or ≥ 4 high = High | Code | None | Low | Caps |
| A11 | Pattern base 55 and bonuses (+22, +15, +18, +10, +24, +16, −10) | `runtime.ts:586-591` | None; conflicts with KB bands and AWS (C2) | Low | Changes the recommended strategy |
| A12 | Cyber, concentration, dependency and advisory pattern bonuses | `runtime.ts:593-628` | None | Low | Supporting-control order |
| A13 | Environment priority AWS > Azure > GCP > on-premises (+3) | `runtime.ts:200-208` | None | Low | Tie-breaks |
| A14 | Confidence base by evidence label and deductions | `runtime.ts:357-375` | None | Low | High / Moderate / Low |
| A15 | Roadmap windows | 0–30 d, 31–90 d, 3–6 m, 6–18 m | None | Low | Timing |
| A16 | Wave allocation by gap ID; max 4 actions per wave | Code | None | Low | Actions dropped silently |
| A17 | Flat penalties | 10 / 15 / 8 / 8 / 6 / 8 | `critical_gap_penalties` (values differ from code: e.g. "restore not proven" 8 in KB) | Low | Hidden score |
| A18 | Gap severities (G-01–G-10) | `blueprint-engine.json` | None | Low | Exposure |
| A19 | "Unknown" treated as "Potentially" (cyber) and as moderate (concentration) | Code comments | Conservative design choice | Medium | Gaps |
| A20 | Moderate concentration raises critical G-04 | Decision tree | None (R9 D6) | Low | Bank kept at Managed |
| A21 | "Immutable but restore not proven" = G-03 critical | Decision tree | None (R9 D3) | Low | −17 score |
| A22 | Answer-band to minutes mapping (< 15 min = 10; 4–24 h = 720; > 24 h = 1440) | `runtime.ts:127-145` | None | Medium | Gap G-02 comparisons |
| A23 | At most 8 advisory questions per round | `runtime.ts:813` | None | Medium | Depth |
| A24 | Pattern cost and complexity labels | `patterns.json` | Order matches AWS's "increasing order of cost and complexity" | Medium | Tie-breaks |

**Count:** 24 assumptions. None has a source in the register. A4, A7 and A19 rest on product decisions; A9 and A24 can be grounded in published sources now.

### 4.5 Inflation check

| Test | Result |
|---|---|
| Money figures | None. There is no value, saving or cost of downtime to inflate, but also none to inform the investment decision (area 6) |
| Missing data flatters? | **Yes:** +6 posture, +7 risk-adjusted at 30% blank advisory answers (audit) |
| Monotonic? | Scores: yes in the audit. **Strategy: no** (section 4.2) |
| Labels match computation? | No: "/100" pattern scores read as fit percentages; "reviewed by the BCP/DR practice" (C3) |
| Totals reconcile? | Two scores (86 shown, 80 hidden) with no reconciliation on the page |

### 4.6 Roadmap and action plan

- **Structure:** four time windows of one-line actions. The KB has owner and evidence per action (RA-01 to RA-10), but the output drops both.
- **Missing:** workstreams, activities, duration, dependencies, effort, milestones, KPIs, prerequisites, risks. The governance metrics exist only as identifiers.
- **Specificity:** one action per gap type, the same for every client and platform. "Validate cyber recovery isolation…" appears in W1 and W2 for the bank.

A delivery team could not start from it.

### 4.7 Presentation

**Present:** a client name and date, and an honest "LTM heuristics, not an industry benchmark" (apart from the review claim).

**Missing:** situation / issue / recommendation / value, methodology, sources, version, "data provided by", disclaimer.

**Language to change:**

| Where | Text |
|---|---|
| Splash | "Resilience under pressure." |
| Loading | "Applying decision branches, evidence confidence, hard constraints, pattern ranking and blueprint logic." |
| Report | "Executive decision" with the heading "DR-05" |
| Report | Raw identifiers: `critical_service_RTO_attainment`, `business_service`, `BP-07` |
| Report | "Transformation Roadmap" for a four-window list |

### 4.8 CIO challenge test

| # | Question a CIO or CFO would ask | Answered from the report? |
|---|---|---|
| 1 | "Why Active-Active for us, and what would warm standby cost or risk instead?" | **Partly:** generic rationale; alternatives listed; no cost |
| 2 | "86 is in your 'Resilient' band; why does the report say Managed?" | **No** |
| 3 | "What is DR-05 94/100 a score of, and who set the weights?" | **No:** one sentence ("LTM heuristics …") |
| 4 | "If our RTO relaxes from 1–4 hours to 4–24 hours, why does the recommendation jump to Active-Active?" | **No:** the logic does not support it (C2) |
| 5 | "Does this tell me where we stand on DORA / SS1/21 / CPS 230?" | **No** |
| 6 | "What does an hour of outage on this service cost us, and what is the investment case?" | **No** |
| 7 | "Who owns each roadmap action, how long, how much effort, what depends on what?" | **Partly:** time window only |
| 8 | "Which of this is evidenced, and which is our own say-so?" | **Partly:** evidence register and confidence label; validated evidence does not change the result |
| 9 | "How do we implement the cyber recovery vault on Azure and on our on-premises estate, and how do we verify it?" | **No:** options computed but not shown, no verification |
| 10 | "Where is our data held, and who has seen it?" | **No** |

**Result:** 0 answered, 3 partly, 7 not.

**Area 13 rating: Fail.** The worst items are:
1. The non-monotonic strategy recommendation.
2. The unexplained rating cap.
3. The unsourced pattern scores shown as "/100".
4. The false review claim.

---

## 5. Claims verification

**Verdicts:** Correct; Incorrect (wrong or materially overstated); Outdated (was right, no longer); Unsourced (not settled in this review; what would settle it is given).

**Status of each source** (as in the claims register): V = checked against text quoting the official source; S = secondary only; P = primary URL, article not re-read.

**Abbreviations:**
- "page" = `Accelerators/resilience-iq.html`
- "KB" = `resilience-iq/knowledge/`
- "design" = `resilience-iq/design/`
- "rt" = `runtime.ts`

**Date checked:** 27 Oct 2026 for every row.

### Method, standards and frameworks

| # | Statement | Where | Verdict | Correct statement | Source (status) |
|---|---|---|---|---|---|
| 1 | Scores and weights are "LTM heuristics … not an industry benchmark" | page:347; KB `scoring-model.json` basis | Correct | As stated | Code review |
| 2 | They are "reviewed by the BCP/DR practice" | as row 1 | **Incorrect** | No review recorded; R9 unsigned | `R9_REVIEW_PACK.md` |
| 3 | "The questions draw on ISO 22301, ISO/IEC 27031, NIST SP 800-34 and the cloud providers' DR guidance" | page:347 | **Unsourced** | Plausible from the structure, but no question carries a mapping. Settle: `framework_mappings` per question (RQ2) | — |
| 4 | ISO 22301:2019 is the current edition | design `frameworks.json` | **Outdated** | ISO 22301:2019 with Amd 1:2024 (climate action changes, Feb 2024) | https://www.iso.org/standard/88412.html (P) |
| 5 | ISO/IEC 27031:2025, second edition, May 2025 | design | Correct | As stated | https://www.iso.org/standard/27031 (P) |
| 6 | NIST SP 800-34 Rev. 1 is the contingency planning reference | design | Correct | No Rev. 2 found on the review date | https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final (P) |
| 7 | NIST CSF 2.0 Recover outcomes | design | Correct | Recover has two categories: RC.RP (incident recovery plan execution) and RC.CO (communication) | https://www.nist.gov/document/nist-csf-20-core-withdrawn-csf-11-elements (S) |

### Recovery strategies

| # | Statement | Where | Verdict | Correct statement | Source (status) |
|---|---|---|---|---|---|
| 8 | Backup and restore: RTO and RPO hours–days | KB `patterns.json` DR-01 | Correct | AWS: RPO in hours, RTO 24 hours or less; PITR "can lower RPO to as low as 5 minutes in some cases" | https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html (V) |
| 9 | Pilot light: RTO tens of minutes to hours, RPO minutes to hours | DR-02 | Correct | AWS: RPO in minutes, RTO in tens of minutes | as row 8 (V) |
| 10 | Warm standby: RTO minutes to hours, RPO minutes | DR-03 | Correct | AWS: RPO in seconds, RTO in minutes (the KB is conservative) | as row 8 (V) |
| 11 | Hot standby / active-passive: RTO minutes, RPO near-zero to minutes | DR-04 | Correct | AWS: hot standby is warm standby at full capacity, active/passive | as row 8; https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html (V) |
| 12 | Active-active: RTO and RPO near-zero | DR-05 | Correct | AWS adds: data corruption still needs backups, so a "non-zero recovery point" | as row 11 (V) |
| 13 | Engine: RTO 15–60 min → Hot Standby | rt:589 | **Incorrect** | Pilot light (tens of minutes) or warm standby (minutes) meets it; hot standby only below that | as row 8 (V) |
| 14 | Engine: Pilot Light preferred only when RTO is 4–24 h | rt:588 | **Incorrect** | Backup and restore meets ≤ 24 h; pilot light suits RTO in tens of minutes to a few hours | as row 8 (V) |
| 15 | Engine: near-zero RPO with RTO > 4 h → Active-Active | rt:590 | **Incorrect** | Near-zero RPO needs continuous replication (pilot light or warm standby with replication), not a second live site | as row 11 (V); R9 D4 |
| 16 | Clean-room options exclude replication "because they copy a compromised state" | KB `implementation-mappings.json` note | Correct | AWS: continuous replication "may not protect against … data corruption or malicious attack" | as row 11 (V) |

### Provider options

| # | Statement | Where | Verdict | Correct statement | Source (status) |
|---|---|---|---|---|---|
| 17 | AWS Backup Vault Lock and S3 Object Lock for immutable backup (DATA-01) | KB mappings | Correct | As stated | https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html (P) |
| 18 | AWS Backup logically air-gapped vault for clean-room recovery (CYBER-01) | KB mappings | Correct | GA 7 Aug 2024; Vault Lock compliance mode; recovery through multi-party approval if the owning account is inaccessible; Regions extended July 2026. Isolation is logical, not physical | https://aws.amazon.com/about-aws/whats-new/2024/08/general-availability-aws-backup-logically-air-gapped-vault/ (P); docs as row 17 (S) |
| 19 | AWS Resilience Hub for continuous validation (TEST-04) | KB mappings | Correct | Named in the AWS DR whitepaper for tracking whether RTO and RPO targets are likely to be met | as row 11 (V) |
| 20 | AWS Elastic Disaster Recovery for DR-01 Backup and Restore | KB mappings `aws.DR-01` | **Incorrect** | "Elastic Disaster Recovery uses the Pilot Light strategy" | as row 11 (V) |
| 21 | AWS Elastic Disaster Recovery for DR-04 Hot Standby | `aws.DR-04` | **Incorrect** | Pilot-light approach with warm-standby-like RPO and RTO; not a full-capacity hot standby. Fine under DR-02 and DR-03 | as row 8 (V) |
| 22 | "AWS Application Recovery Controller" | `aws.DR-05` | **Outdated** | Amazon Application Recovery Controller (ARC) | as row 11 (V) |
| 23 | Azure Site Recovery for DR-01 Backup and Restore | `azure.DR-01` | **Incorrect** | Site Recovery is continuous replication, failover and failback; backup and restore is Azure Backup | https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview (V, updated 23 Sep 2026) |
| 24 | "Azure Backup immutable vault (confirm regional availability)" | `azure.CYBER-01` | **Outdated** | Immutability (enabled and locked) is GA in all Azure public and US government regions; WORM storage is being rolled out by region, with locked immutability enforced by the service meanwhile | https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept (V, updated 26 Oct 2026) |
| 25 | Google Cloud Backup and DR Service backup vault (DATA-01, CYBER-01) | `gcp.*` | Correct | Backups are immutable and indelible until the enforced retention ends (up to 99 years) | https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backup-vault (P) |
| 26 | Google Cloud "Fault Injection Service where available" | `gcp.TEST-04` | **Incorrect** | "Fault Injection Service" is AWS's product. Google's fault-injection offering is reported as "Fault Injection Testing", in preview | https://itbrief.co.uk/story/google-cloud-launches-fault-injection-testing-preview (S); settle on Google release notes |
| 27 | Azure Chaos Studio, GCP Infrastructure Manager, Azure Compute Gallery and other named options | KB mappings | **Unsourced** | Not checked in this review. Settle when entries move to the playbook with claim IDs (RQ8) | — |
| 28 | Google Cloud DR patterns cold / warm / hot, chosen from a BIA's RTO and RPO | design `frameworks.json` GCP-DR | Correct | As stated | https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide (P) |

### Regulatory terms the tool uses

| # | Statement | Where | Verdict | Correct statement | Source (status) |
|---|---|---|---|---|---|
| 29 | "Severe-but-plausible scenarios" as the test standard | EX-16; OPS-02; G-10 | Correct | UK: SS1/21 and SYSC 15A. Australia: CPS 230 para 43 ("a range of severe but plausible scenarios"). Singapore: MAS BCM Guidelines 7.2 | https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss (P; register CLM-SOV-085 V); APRA (V); MAS (V) |
| 30 | "Impact tolerance" for the most critical service, asked as a time (EX-02) | EX-02; G-01 | Correct but **incomplete** | CPS 230 para 38 sets tolerance levels for maximum disruption time, **maximum data loss** and **minimum service levels** during disruption. MAS 3.1 sets a Service Recovery Time Objective per critical business service. The UK impact tolerance is per important business service. The tool asks for one service only | https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf (V); https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulatory-and-supervisory-framework/risk-management/bcm-guidelines/guidelines-on-bcm-june-2022.pdf (V) |
| 31 | Maturity "Tested" needs a recovery test within 12 months (heuristic) | rt:458-466 | Correct (as a heuristic) | Consistent with:<br>• DORA Art. 11(6): test ICT BC and response and recovery plans "at least yearly";<br>• CPS 230 para 43: "an annual business continuity exercise";<br>• NYDFS 23 NYCRR 500.16(d): test plans and "the ability to restore critical data and systems from backups" at least annually.<br>MAS 7.3 sets frequency by criticality | https://www.springlex.eu/en/packages/dora/dora-regulation/article-11/ (S, OJ text); APRA (V); https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.16 (S) |
| 32 | Cyber recovery must be isolated from the production trust boundary | KB evidence criteria; rt:272-275 | Correct | DORA Art. 12(3): restore on ICT systems "physically and logically segregated from the source ICT system". NYDFS 500.16(e): backups "adequately protected from unauthorized alterations or destruction" | https://www.springlex.eu/en/packages/dora/dora-regulation/article-12/ (S, OJ text); as row 31 |
| 33 | RTO and RPO are business requirements, never inferred from technology | rt decision log; KB rules | Correct | DORA Art. 12(6) ties recovery objectives to criticality and requires that "in extreme scenarios, the agreed service levels are met". CPS 230 para 38; MAS 3.1 | as rows 30, 32 |
| 34 | Clients "Recovery Strategy Ranking … /100" | page:324 | **Unsourced** | Pattern scores are LTM constants (A11). Show the ladder reason instead, or label "LTM fit points" | — |

**Count:** 34 statements. Correct 20 (row 30 correct but incomplete), Incorrect 8, Outdated 3, Unsourced 3.

### Missing content for the owner's markets

| Market | Missing | Why it matters |
|---|---|---|
| EU | DORA Art. 11 (ICT business continuity; yearly testing), Art. 12 (backup, segregated restoration, RTO/RPO), Art. 24–26 (testing; TLPT only for designated entities), Art. 28(8) (exit strategies); NIS2 Art. 21(2)(c) business continuity and crisis management for in-scope entities | The EU buyer's first question |
| UK | PRA SS1/21 and FCA SYSC 15A (important business services, impact tolerances, mapping, scenario testing; within tolerance from 31 Mar 2025); FCA PS26/2 and PRA PS7/26 operational incident and third-party reporting (published 18 Mar 2026, apply from 18 Mar 2027) | UK OpRes maturity is handed to this tool by Sovereign IQ |
| US | NYDFS 23 NYCRR 500.16 (BCDR plans, protected backups, annual tests of restore); FFIEC Business Continuity Management booklet (2019) for US banks (not verified in this review) | US clients get nothing today |
| APAC | APRA CPS 230 (from 1 Jul 2025: critical operations, tolerance levels, annual exercise, 24 h notice of disruption outside tolerance, 72 h for material incidents); MAS BCM Guidelines June 2022 (SRTO, end-to-end dependencies, annual review, audit at least every three years); MAS TRM Notices (RTO 4 h for critical systems, see Sovereign IQ row 53) | Two of the most prescriptive resilience regimes |
| Published data (context only, never as LTM benchmarks) | IBM Cost of a Data Breach 2026: global average USD 4.99M (S; 2025: USD 4.44M, 600 organisations). Uptime Institute Annual Outage Analysis 2025: 54% of respondents put their last significant outage above USD 100,000, 20% above USD 1M (S). ENISA Threat Landscape 2025: 4,875 incidents, Jul 2024–Jun 2025, ransomware the most impactful threat (P) | Gives a CFO context without inventing a figure for the client |

---

## 6. Distinctness and overlap

### Decision, buyer and edge (recommendation)

- **Decision it informs:** *For each critical business service, which recovery strategy and cyber-recovery capability should we fund, and can we stay within impact tolerance (and prove it to our regulator) today?*
- **Buyer:** the CIO, with the Chief Risk Officer or head of operational resilience, the CISO and the BCM lead as co-owners. In financial services, the SMF24 (UK) or equivalent.

| Alternative | What it gives | Resilience IQ edge (to be built) |
|---|---|---|
| AWS Resilience Hub; Azure reliability and Site Recovery guidance; Google Cloud DR planning guide | Workload-level RTO/RPO assessment on one provider | Business-service first, across on-premises, every cloud, SaaS and sovereign providers; strategy before provider; cyber recovery and third parties in the same view |
| ISO 22301 gap checklists; BCI Good Practice Guidelines; FFIEC BCM booklet | Management-system conformity | Ends in a strategy per service, a platform backlog and typed next engagements, each traced to a finding and a source |
| Regulator self-assessments (SS1/21 self-assessment documents, CPS 230 readiness) | Compliance narrative for one regime | Multi-regime view (DORA, UK, CPS 230, MAS, NYDFS) on one capability model, with evidence and the technical route to close each gap |
| Backup-vendor ransomware readiness scans | Vendor-product posture | Vendor-neutral; isolation, immutability and clean-room patterns stated per provider with alternatives |

### Overlap with other LTM accelerators

| Accelerator | Overlap | Recommendation |
|---|---|---|
| Sovereign IQ | Exit and concentration; operational resilience regimes. Boundary written in Sovereign DESIGN section 11: Sovereign flags and grades applicability; Resilience IQ owns exit testing, concentration as a recovery risk, and impact tolerances | Confirm the boundary (it is a Sovereign gate S1 condition). Implement this side: AF-CL-03 = Yes refers to Sovereign IQ; offer X1/X2 prefill from AF-TP-02/03 with the consultant's confirmation; reuse Sovereign's regime applicability facts instead of asking again |
| Cloud IQ | Q "Disaster Recovery (DR) and business continuity posture?" (D4, workshop) scores active-active as more mature than active-passive | Cloud IQ keeps a DR maturity signal but routes DR findings to Resilience IQ, and stops ranking patterns as maturity |
| Strategy IQ | Headline "Resilience (%)" from sourcing and talent questions (S5.1–S5.4) | Rename it (for example "Sourcing resilience"), to avoid two "resilience" scores for one client |

---

## 7. Reconciliation with the 12 Oct validation and ROADMAP R7–R12

| 12 Oct gate | Then | Now | Note |
|---|---|---|---|
| 1 Builds and deploys | Pass | Holds | `test:resilience-all` in the Amplify build |
| 2 Signed-in users only | Pass | Holds for the API. **Exception:** the question bank studio page has no guard (H7) | |
| 3 No reading or forging others' work | Pass | Holds; evidence API now has ownership checks (R10 part 1) | |
| 4 Bad input rejected | Pass | Holds | The page can send `[]` for unanswered multi-selects (C1) |
| 5 Errors do not leak | Pass | Holds | |
| 6 Page sends what the engine reads | Pass | Holds for the executive path; the advisory path now fails before sending | |
| 7 Stable, explainable scores | Pass | **Partial:** stable, but the strategy is non-monotonic and the cap is unexplained (C2, M3) | |
| 8 Missing answers never flatter | Partial | Unchanged: +6 / +7 | R9 D1 |
| 9 Ratings match evidence | Pass | Holds | |
| 10 Content accurate and vendor-neutral | Pass, SME note | **Partial:** four provider-mapping errors, one outdated name. The Azure note is now settled (row 24) | |
| 11 Method claims honest | Pass | **Fail:** "reviewed by the BCP/DR practice" (C3) | |
| 12 Platform unaffected | Pass | Other accelerators unaffected; **Resilience IQ itself was broken by the shared shell (C1)** | |

| Roadmap item | Status on 27 Oct 2026 | In this plan |
|---|---|---|
| R7 items 1–4 (live journey, branch protection, Admin group, sandbox pool) | Owner items; not verifiable from here | RQ0 item 8; the live journey must now include a gated assessment |
| R7 item 5, R8 | Done | Hold |
| R9 decisions 1–6 | Open; all six reproduce on today's engine | D2 (my recommendations); D3 replaces decision 4 with the ladder; implemented in RQ3 |
| R10 items 1–3, 6 | Done (evidence storage, ownership, lifecycle, immutability) | Hold; validation becomes consultant-only (RQ6) |
| R10 items 4, 5, 7 | Not started | RQ3 (evidence changes confidence; BR-01 BIA), RQ8 (shared playbook) |
| R11 back-test, pilot, method note | Not started; there is no engagement history | RQ5 reference scenarios from public cases; consultant pilot in RQ12 |
| R11 item 4 Azure immutable vault | **Settled:** GA in all public and US government regions | RQ0 (remove the note) |
| R12 monitoring, dev/prod split, versions, client mode, self-service | Not started | RQ11 (operate), RQ3 (versions), RQ6 (client mode), RQ12 (decision) |

---

## 8. Client data and hosting (S6)

What Resilience IQ stores in AWS Mumbai (ap-south-1):
- the client name and sector (free text);
- the respondent email;
- answers and results;
- evidence files up to 4 MB in the reports bucket under `resilience-iq/evidence/` (DR test reports, architecture diagrams, supplier contracts; these may hold personal data and are security-sensitive).

Nothing on screen says so.

Recommended wording for the start screen, report methodology panel and privacy notice (owner and counsel to approve), as for Sovereign IQ:

> "LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter, and any evidence you upload, is transferred to India, which does not have an EU adequacy decision or a UK data bridge. LTM relies on [EU Standard Contractual Clauses / the UK IDTA or Addendum] and a transfer risk assessment. Upload evidence only if your organisation permits it; otherwise record where it is held. We keep assessments and evidence for [24 months] unless you ask us to delete them sooner. This assessment uses no AI unless your consultant switches it on; any AI processing runs in India on Amazon Bedrock."

---

## 9. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | Decision and buyer | As section 6 / other | Accept section 6 |
| D2 | R9 decisions 1–6 (my advice as practice lead; your approval) | Accept / change each | 1 Accept (blank asked advisory = Unknown; gate requires only gate-relevant questions). 2 Accept, and make the posture the single headline (D4). 3 Accept (high "Unproven Recovery"). 4 Superseded by D3. 5 Accept D1–D6, with D2's 12-month rule now cited to DORA Art. 11(6), CPS 230 para 43 and NYDFS 500.16(d). 6 Accept (moderate = G-08 high only) |
| D3 | Strategy rule | Keep bonuses / written ladder | Ladder: rung(RTO) = DR-01 for > 4 h, DR-02 for 1–4 h, DR-03 for 15–60 min, DR-04 for < 15 min; rung(RPO) = DR-01 for ≥ 1 h, DR-02 for 15–60 min, DR-03 for < 15 min or near-zero (plus DATA-03 continuous replication). Strategy = the higher rung; DR-05 only when RTO < 15 min **and** RPO near-zero, shown as a business choice beside DR-04. Cyber, concentration and dependency findings add controls (CYBER-01, DATA-01/02, TP-05, DR-07), never a higher rung, unless a regulation requires it, with the reason recorded. Grid monotonicity test |
| D4 | Headline | Posture shown, risk-adjusted hidden (today) / one headline | One: "Resilience posture" with its exposure cap shown and explained; flat penalties fold into gap severity; drop the hidden score |
| D5 | Money | None (today) / client-input impact / market default | Optional client input: cost per hour of disruption of each critical service (range). Show impact over the gap between proven and required RTO as a range. No default from market data; IBM, Uptime and ENISA figures as context only, with source, year and sample. Investment ranges only in the consultant SOW |
| D6 | Regulatory scope v1 | None / FS regimes in four markets | DORA, UK OpRes (SS1/21, SYSC 15A; PS26/2 and PS7/26 dated), APRA CPS 230, MAS BCM Guidelines, NYDFS 500.16, FFIEC BCM. Applicability taken from Sovereign IQ's regime facts where both run; obligations assessed here as capability checks with article citations. Counsel gate |
| D7 | Modes | Executive only / executive, workshop, client | Executive (20 questions, 15–20 min); workshop (all advisory families on demand, plus triggered ones); client view server-side |
| D8 | Who validates evidence | Respondent or Admin (today) / consultant or Admin | Consultant or Admin only, with a server-checkable role, before any client self-service |
| D9 | Question bank studio | Open page (today) / Admin only, read-only in production | Admin only; edits through PRs, not the browser |
| D10 | AI | None / narrative via WS-S1 | None in v1. If added, the shared WS-S1 service: Claude Opus 5 on the Bedrock India geographic profile (`in.anthropic.claude-opus-5`) from ap-south-1, inference in Mumbai and Hyderabad only (D29), off by default, grounded on engine output |
| D11 | Evidence uploads for EU/UK clients | Allowed (today) / reference-only until S6 | Reference-only until the S6 transfer basis is in place; 24-month retention |
| D12 | Overlaps | As today / route | Cloud IQ D4 routes DR findings here and stops ranking patterns as maturity; Strategy IQ renames its "Resilience (%)"; Sovereign boundary confirmed with AF-CL-03 referral and X1/X2 prefill on confirmation |
| D13 | Back-testing without engagement history | Wait / reference scenarios | Five reference scenarios from public incident reports and regulator examples, each with URL, expected outcomes written first |
| D14 | Volatile items | 6-month / 90-day review | 90-day review for provider features and UK reporting dates; 12 months for standards |
| D15 | Use until re-score | Consultant-led (today) / pause | Consultant-led only once the RQ0 hotfix ships; no client self-service until RQ12 |

---

## 10. Sources

All checked 27 Oct 2026.

**AWS**
- Well-Architected REL13-BP02: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html
- Disaster Recovery of Workloads on AWS, DR options: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- AWS Backup logically air-gapped vault:
  - https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html
  - https://aws.amazon.com/about-aws/whats-new/2024/08/general-availability-aws-backup-logically-air-gapped-vault/
  - https://aws.amazon.com/about-aws/whats-new/2026/07/aws-backup-logically-air-gapped-vault-regions/

**Microsoft**
- Azure Site Recovery overview: https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview
- Azure Backup immutable vault: https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept

**Google**
- Google Cloud DR planning guide: https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide
- DR cookbook: https://docs.cloud.google.com/solutions/disaster-recovery-cookbook
- Backup vault: https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backup-vault
- Fault Injection Testing (secondary): https://itbrief.co.uk/story/google-cloud-launches-fault-injection-testing-preview

**Standards**
- ISO 22301 Amd 1:2024: https://www.iso.org/standard/88412.html
- ISO/IEC 27031:2025: https://www.iso.org/standard/27031
- NIST SP 800-34 Rev. 1: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final
- NIST SP 800-209: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-209.pdf
- NIST CSF 2.0 core: https://www.nist.gov/document/nist-csf-20-core-withdrawn-csf-11-elements

**EU**
- DORA Art. 11 and 12 (OJ text reproduced):
  - https://www.springlex.eu/en/packages/dora/dora-regulation/article-11/
  - https://www.springlex.eu/en/packages/dora/dora-regulation/article-12/
- EUR-Lex record (fetch returned empty): https://eur-lex.europa.eu/eli/reg/2022/2554/oj

**UK**
- PRA SS1/21: https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss
- FCA SYSC TP 10: https://handbook.fca.org.uk/handbook/sysctp10
- FCA PS26/2: https://www.fca.org.uk/publications/policy-statements/ps26-2-operational-incident-third-party-reporting

**APAC and US**
- APRA CPS 230: https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf
- MAS BCM Guidelines (June 2022): https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulatory-and-supervisory-framework/risk-management/bcm-guidelines/guidelines-on-bcm-june-2022.pdf
- NYDFS 23 NYCRR 500.16: https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.16

**Published research**
- IBM Cost of a Data Breach:
  - 2026 (secondary): https://www.bakerdonelson.com/ten-takeaways-from-ibms-2026-cost-of-a-data-breach-report
  - 2025 (secondary): https://www.bakerdonelson.com/ten-key-insights-from-ibms-cost-of-a-data-breach-report-2025
- Uptime Institute Annual Outage Analysis:
  - 2025 (secondary): https://www.datacenterknowledge.com/outages/data-center-outages-decline-for-fourth-straight-year-but-issues-persist
  - 2026 release: https://www.businesswire.com/news/home/20260513289344/en
- ENISA Threat Landscape 2025: https://www.enisa.europa.eu/news/eu-consistently-targeted-by-diverse-yet-convergent-threat-groups

**Repository evidence**
- `npm test`: 906 passed.
- `npm run test:resilience-all`: pass.
- `npx playwright test tests/e2e/resilience-iq.spec.ts`: 12 passed.
- `npm run audit:engines`: Resilience IQ unchanged from `docs/phase3/AUTOMATED_AUDIT.md`.
- Probes: strategy grid, archetypes, gated browser run, studio without a session.
