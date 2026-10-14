# FinOps IQ: validation report

**Date:** 14 Oct 2026  **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves.

**Scope:** FinOps IQ in depth, scored on all 13 areas of the scorecard (area 13, report defensibility, added 14 Oct 2026). Cost IQ and FinOps Value Case are mapped for overlap (section 6), not scored.

| | FinOps IQ (today) |
|---|---|
| Page | `Accelerators/finops-iq.html` (5,069 lines; embeds a score-free copy of the KB at line 1762) |
| Public sample | `Accelerators/finops-iq-sample-report.html` (647 lines, no `rbac-guard`, so reachable without sign-in) |
| Playbook | `Accelerators/FINOPS_IQ_CONSULTANT_PLAYBOOK.md` (v2.2, 214 lines) |
| Engine | `packages/engine-core/src/accelerators/finops-iq/` (KB schema 2.2.0, 44 questions, 5 stages, 5 domains, 23 checkpoints, 4 archetypes) |
| API | `amplify/functions/evaluate-finops-iq/` (stateless; JWT route `POST /api/evaluate/finops-iq`, plus an unauthenticated legacy route while `LTM_KEEP_LEGACY_API` defaults to `true`, `amplify/backend.ts:213-215`, `amplify/config.ts:55`) |
| Tests | `packages/engine-core/test/finops-iq.test.ts` (24), golden `test/golden/finops-iq.json` (6 cases), `tests/e2e/finops-iq.spec.ts` (4) |

**Method:**
- Read the page, engine, contract, handler, KB, public schema, playbook, sample report, the Phase 3 audit and the claims inventory.
- Ran `npm run audit:engines`: FinOps IQ results are unchanged from `docs/phase3/AUTOMATED_AUDIT.md`.
- Ran the unit tests: 104 passed (`finops-iq` 24, `finops-value-case` 34, `engines` 46).
- Ran the browser spec: 4 passed.
- Ran my own engine probes, a throwaway script outside the repo:
  - monotonicity over 13,314 single-answer improvements;
  - "not applicable" gaming;
  - the effect of leaving T6 blank;
  - the gating cliff.
- Generated the report (screen in client and consultant mode, checkpoints tab, PDF) for all four archetypes with the browser test harness. Throwaway spec outside the repo; no repo file changed.
- Web verification of every figure and claim.

**Source access note:** direct fetches of finops.org failed from this environment (DNS resolution blocked), as they did for the Sovereign IQ review. Every verdict below rests on web-search results that quote or link the primary source. The URL given is the primary source where one was returned; I say where only secondary sources were available. All sources were checked on 14 Oct 2026.

---

## 1. Verdict

**FinOps IQ is not CIO ready. Its headline dollar figure should not be shown to a client until the Critical findings are closed.**

The question bank is a reasonable practitioner checklist. The engine is technically sound: it never scores a better answer worse, it has no dead questions, and missing answers do not flatter the maturity stage. But four things undermine it.

1. **The maturity model is LTM's, presented as the FinOps Foundation's.** The five stages run "Chaos / Crawl" to "Automated / Run" to "Transparent", with strict org-level gating. The FinOps Foundation instead rates each capability Crawl, Walk or Run, and says reaching Run everywhere is not the goal.
   - One weak answer can drop an estate scoring 98/100 to "Below Stage 1".
2. **The headline "Estimated Waste Savings at Stake" is not defensible.** It is either the client's own one-click guess at waste (T6) or an unsourced stage band of 25–35% of spend. It is shown as "recoverable" and as "annual cloud bill recovery". It has no lever breakdown, no implementation cost and no ramp.
   - Leaving T6 blank raises the figure up to 4.5 times (retail archetype: $0.88M–$1.98M with T6, $3.96M–$6.16M without).
   - The public sample report's "$6.3M–$9.8M" is this stage band, presented as recoverable waste. Next to it are invented findings, a "~28x First-Year ROI" and "guaranteed-savings FinOps sprints".
3. **Client data goes out in ways the tool denies.**
   - Live browser AI sends the client name, spend, maturity, blockers and the consultant's free-text interview notes to Gemini, Anthropic or OpenAI, using a key stored in `localStorage`.
   - The playbook tells consultants to say that "no organizational financial data … [is] ever transmitted to external servers".
4. **FinOps IQ overlaps FinOps Value Case almost question for question, and Cost IQ's cloud and FinOps sections.** It fails the distinctness test.

**Totals:** of 53 claims checked, 18 are incorrect, 3 are outdated and 27 are unsourced (section 5). The playbook, page and sample report describe features that do not exist: a 10-minute flash mode, six triggered "contradiction probes", a passkey-protected client mode, a synthesised SOW and a unit-economics model.

My recommendation is to fold FinOps Value Case into FinOps IQ as its executive mode. FinOps IQ would then be rebuilt on the FinOps Foundation's per-capability Crawl/Walk/Run model, which Cost IQ already encodes, with a lever-based value model. Cost IQ stays as the enterprise technology-cost diagnostic that routes cloud findings to FinOps IQ (section 6).

---

## 2. Scorecard

Pass / Partial / Fail per area, with the target for the rebuilt accelerator. Evidence is file and line, test or source.

| # | Area | FinOps IQ | Target | Evidence |
|---|---|---|---|---|
| 1 | Purpose and distinctness | **Fail** | Pass | No named CIO decision or buyer anywhere in the page, KB or playbook. FinOps Value Case asks the same questions: tagging % (FVC V2 vs FIQ I2), commitment coverage (C2 vs O1), forecast variance (P1 vs A8), anomaly/bill variance (V3 vs I6/I8), accountable owner (O1 vs C7), engineer cost visibility (O3 vs I4), unit cost (V4 vs T2), decommissioning (C3 vs I7), egress (C5 vs O7), cost in objectives (O4 vs A6). Cost IQ has its own cloud and FinOps sections (ADP-01–05, ADP-42/43, FIN-01–12) on the FinOps Foundation's four domains. The edge over free tools is written only as playbook objection-handling (`FINOPS_IQ_CONSULTANT_PLAYBOOK.md:203-204`), which claims a "FinOps Foundation framework" the tool does not implement |
| 2 | Functionality | Partial | Pass | Server scoring works: 4/4 browser tests pass; no page errors or CSP violations when generating all four archetype reports. Gaps:<br>• Save and resume is `localStorage` plus JSON file import/export only (`finops-iq.html:3460-3545, 4702-4725`), not server-side.<br>• No backlog export.<br>• The PDF is client-side jsPDF from a CDN (`finops-iq.html:16-17`). It silently truncates the roadmap to 18 rows (`body: rows.slice(0, 18)`, line 4905): the saas archetype has 28 gaps. It prints "≥" as `"e` ("rightsizing compliance "e90%" in every PDF).<br>• No test that every question renders and can be answered.<br>• The archived PDF goes to S3 via `LTM_S3.saveReportToS3` with the client name and spend |
| 3 | Questions and answers | **Fail** | Pass | • **No "Unknown" option** on any of the 44 questions.<br>• **"Not Applicable / Out of Scope" is offered on every question, critical ones included, and a critical N/A passes its gate** (`evaluate.ts:99`). Marking all 17 critical questions N/A and answering "mostly" elsewhere gives Stage 2, the same as answering them.<br>• Overlapping or mixed options: A4 option 3 "No AI workloads in cloud, or AI spend completely unmanaged" scores 0 for both cases; I3 option 1 "Single-cloud estate, or partial normalization" mixes scope with maturity.<br>• O10 asks the client to "Rank these optimization levers" but offers four maturity statements.<br>• C1 and C5 ask the same thing (account owners), both critical, both mapped to chk-c1, so it counts twice.<br>• C8 (root MFA) is a security control filed under "Understanding usage".<br>• No question cites its basis.<br>• Coverage is public cloud only: no SaaS, licensing, private cloud or data-centre scope, although the FinOps Framework has had Scopes since 2025 and 90% of State of FinOps 2026 respondents manage SaaS spend |
| 4 | Depth | **Fail** | Pass | There is one mode: all 44 questions across 5 stages. There is no executive mode and no follow-up triggered by an answer: `grep` finds no flash or probe logic in the page or engine. The playbook sells a "10-minute C-suite flash readout" and "6 contradiction probes" with trigger conditions (`PLAYBOOK.md:25-32, 76-138`) that do not exist |
| 5 | Scoring engine | Partial | Pass | **Good:**<br>• Audit: no dead questions.<br>• Missing-data shift −0.02 (stage) and −0.35 (overall), so blanks do not flatter.<br>• My probe: 0 monotonicity violations in 13,314 single-answer improvements.<br>**Faults:**<br>• 97.9% of random questionnaires land "Below Stage 1"; Optimized, Automated and Transparent are never reached at random (`AUTOMATED_AUDIT.md`, FinOps IQ).<br>• Critical minimums of 75/80 on stages 3–5 against option scores of 100/65/30/0 mean only the top option ever passes them.<br>• **Gating cliff:** best answer everywhere except C4 = "finance sees the top-level invoice only" gives an overall 98/100 and "Below Stage 1".<br>• **Label truth:** "Waste Savings at Stake" is a waste estimate, not a saving.<br>• **Missing data inflates value:** leaving T6 blank lifts the low end from 20% to 25% for a weak client, and up to 4.5× for a strong one.<br>• Golden archetypes disagree with their own `baseline_stage`: saas is declared Stage 2 and the engine gives Stage 1; retail is declared Stage 3 and the engine gives Stage 2 (`knowledge-base.json` archetypes, `test/golden/finops-iq.json`).<br>• Golden outputs are not lead-approved (`SCORING_AUDIT.md` decisions 1, 3–5 open) |
| 6 | CIO alignment | Partial | Pass | It leads with money and a maturity stage, but the money is unsupported (area 13). Roadmap items carry a horizon (0–3, 3–9, 9–24 months) but no owner role, no decision and no effort (`evaluate.ts:282-308`). Jargon without business consequence: "FinOps Defensibility Score", "Chaos", "posture defense", "Maturity Elevation Blueprint" |
| 7 | Output | **Fail** | Pass | The PDF is two pages: cover with KPIs and an 18-row roadmap table (`finops-iq.html:4780-4950`).<br>• No disclaimer: the KB disclaimer at `knowledge-base.json:8` is never rendered.<br>• No methodology or sources panel and no version.<br>• No "How LTM can help".<br>• No technical execution and no backlog.<br>• Client mode does not change the PDF |
| 8 | Sources | **Fail** | Pass | The claims inventory has 61 `finops-iq` rows, all `unreviewed`, 0 with a citation, 0 with an owner (`docs/claims-register/claims-inventory.csv`). The structured register (`packages/engine-core/src/claims/claims-register.json`) holds Sovereign IQ claims only. The page, playbook and sample-report figures (section 5) are not extracted at all |
| 9 | Legal validity | **Fail** | Pass | Few regulatory statements, but:<br>• The disclaimer is not shown on screen or in the PDF.<br>• Client-data handling is undocumented and misdescribed. The playbook says data never leaves the browser (`PLAYBOOK.md:210`); in fact answers, spend and client name go to the LTM API in ap-south-1, BYOK AI sends notes and spend to US AI vendors, and archived PDFs go to S3.<br>• No hosting statement.<br>• The trademark sentence "'FinOps' is a trademark of the FinOps Foundation" is unverified (section 5, row 9).<br>• "FinOps IQ™" is claimed in the sample report with no evidence of registration |
| 10 | AI scope and toggle | **Fail** | Pass | Live BYOK:<br>• Provider and key modal, key kept in `localStorage` (`finops-iq.html:1592, 1694-1703, 3556-3627`).<br>• Direct `fetch` to Gemini (key in the URL query string), Anthropic (`anthropic-dangerous-direct-browser-access`) and OpenAI (`3650-3726`).<br>• The executive briefing prompt sends the client name, sector, spend, stage, score and blockers, "in McKinsey/Deloitte advisory style" (`3763-3799`).<br>• "Interpret with AI" sends the consultant's free-text notes and lets the AI suggest an answer that one click applies (`3728-3761, 4314`).<br>• AI output goes into the PDF unchecked (`4877-4882`).<br>• No grounding check, no log. The CSP allows all three vendor hosts (`customHttp.yml:14`) |
| 11 | Technical execution | **Fail** | Pass | The page captures clouds (AWS, Azure, GCP, OCI, Private Hybrid) and stack (`finops-iq.html:4019-4020`) but never sends them to the engine. Remediations are one string per question, AWS-first (Compute Optimizer, CUR, Graviton, NAT Gateway, SageMaker, Karpenter), with no Azure, GCP, OCI, on-premises or private-cloud variant and no verification step. The bank archetype (Azure + AWS) is told to use AWS Compute Optimizer |
| 12 | Commercial pull-through | **Fail** | Pass | • No typed offerings.<br>• Client mode is a frosted-glass "teaser" whose CTA is "Schedule Advisory Session with Ashutosh Dixit"; a mailto pre-filled with spend and "recover an estimated $X – $Y in cloud waste" (`finops-iq.html:4554-4562, 4732-4777`).<br>• The playbook carries fees ($120k–$380k) and a "Free Teaser to Paid Advisory SOW" conversion script (`PLAYBOOK.md:15, 142-197`).<br>• The sample report shows "Target SOW $250k" and "~28x First-Year ROI".<br>• Reads as sales |
| 13 | Report defensibility | **Fail** | Pass | Section 4:<br>• 20 of 23 assumptions have no stated ground.<br>• The headline is a self-estimate or an unsourced band, called "recoverable".<br>• No lever split, cost or ramp.<br>• Roadmap items are one-line remediations without owner, effort, KPI or dependency.<br>• CIO challenge: 0 answered, 2 partly, 8 not |

**Totals:** 0 Pass, 3 Partial (2, 5, 6), 10 Fail.

---

## 3. Findings

Ranked Critical, High, Medium. "Consequence" is for a CIO or for LTM.

### Critical

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| C1 | **Browser AI sends client data, including interview notes, to third-party AI vendors.**<br>• The BYOK modal stores a Gemini, Anthropic or OpenAI key in `localStorage`.<br>• "Synthesize with AI" sends the client name, sector, annual spend, stage, score and blockers.<br>• "Interpret with AI" sends the consultant's free-text notes; its suggested option can be applied in one click.<br>• AI text is printed in the PDF as the "Executive Diagnostic Synthesis" without any check | `finops-iq.html:1592, 1694-1703, 3556-3799, 4314, 4877-4882`; `customHttp.yml:14` | Client spend and workshop notes reach US AI vendors with no LTM contract, log or grounding. An AI-chosen answer changes the score. A CFO who learns this ends the engagement | Delete all BYOK code, UI, key storage and the "Interpret with AI" auto-answer. AI only via WS-S1 Bedrock, off by default, narrative from engine output only, never setting answers | FRAMEWORK.md decision "AI" |
| C2 | **The headline dollar figure is not defensible and can look inflated.**<br>• "Estimated Waste Savings at Stake … annual cloud bill recovery" (PDF: "RECOVERABLE WASTE") = spend × either the client's own T6 waste guess or an unsourced stage band (25–35%, 18–28%, 10–18%, 5–9%, 2–4%).<br>• T6 counts "unallocated" spend as waste, but unallocated spend is unattributed, not wasted.<br>• No lever split, no implementation cost, no ramp, no confidence level.<br>• A blank T6 lifts the figure: retail $0.88M–$1.98M → $3.96M–$6.16M; banking $3.5M–$7.0M → $6.3M–$9.8M | `evaluate.ts:206-231`; `knowledge-base.json:1532-1576`; `finops-iq.html:4470-4473, 4505, 4856-4866`; section 4 | "On what basis are you committing $7M?" has no answer. The low-maturity band starts at 25%, near Flexera's 29% *average self-estimated* waste (n=753), and is presented as recoverable | Replace with a lever-based value model (D3): addressable spend per lever × published range, conservative/expected/upper, net of cost, phased; "not quantified" without the inputs; inflation guard in CI (PLAN F4) | Flexera 2026; AWS, Azure, GCP discount pages (section 5) |
| C3 | **LTM's own maturity model is presented as the FinOps Foundation's.**<br>• Five org-level stages ("Chaos / Crawl Baseline" … "Automated / Run Practice", "Transparent / Unit Economics") with strict gating.<br>• A "FinOps Foundation Domain Performance" panel with five domains, one of them invented ("Modern Workloads (K8s & GenAI)").<br>• "Capability" names that are not FinOps Framework capabilities.<br>• The Foundation rates maturity per capability and says "the goal … is not to get to the 'Run' stage across all Capabilities" | `knowledge-base.json:9-118`; `finops-iq.html:4479, 4655` | Any FinOps-certified practitioner in the client's team spots it at once. LTM is seen to misuse the framework it claims to follow | Adopt the FinOps Framework 2026 structure (four domains, capabilities, Crawl/Walk/Run per capability, scopes) with CC BY 4.0 attribution. LTM's summary label is marked as LTM's. Reuse Cost IQ's overlay capability model (D2) | finops.org maturity model and 2026 framework; CC BY 4.0 notice (section 5, rows 1–7) |
| C4 | **False data-handling statement and undisclosed data flows.**<br>• The playbook script: "FinOps IQ executes 100% in-memory in your local web browser … No organizational financial data … [is] ever transmitted to external servers".<br>• In fact answers, annual spend and client name go to the LTM API in AWS Mumbai (ap-south-1); BYOK sends notes and spend to US AI vendors; "Archive Report" stores the PDF (client name, spend, score) in S3.<br>• An unauthenticated legacy route to the same Lambda stays on by default | `PLAYBOOK.md:209-210`; `finops-iq.html:3801-3826, 4916-4945`; `amplify/backend.ts:213-215`; `amplify/config.ts:55` | Consultants would mislead a client's CISO. EU and UK clients' data goes to India with no notice | Withdraw the statement now (F0). Hosting and data notice per section 7. Switch the legacy route off for FinOps IQ. S6 transfer basis | FRAMEWORK.md "Hosting"; GDPR Ch. V (as in the Sovereign IQ review) |
| C5 | **The public sample report is invented and promissory.** It is reachable without sign-in (no `rbac-guard`) and shows:<br>• "$6.3M – $9.8M Recoverable Waste at Stake" (the stage band, not a client estimate);<br>• "Target SOW $250k … ~28x First-Year ROI";<br>• "guaranteed-savings FinOps sprints";<br>• a "22-Point FinOps Foundation Checkpoint Audit" (the KB has 23 LTM checkpoints);<br>• three "contradiction probe" findings with figures the engine cannot compute ("$480,000/month in NAT Gateway traffic", "3.8x", "34% compute rate shock");<br>• a named partner | `Accelerators/finops-iq-sample-report.html` (whole file) | The first FinOps artefact a prospect sees promises guaranteed savings and implies FinOps Foundation endorsement | Take it down now (F0); later replace it with an engine-generated report for a reference client | Trusted sources policy; FRAMEWORK.md area 13(c) "never called guaranteed" |
| C6 | **Overlap with two other LTM accelerators.** FinOps Value Case asks about ten of the same practices, sizes waste and recommends services. Cost IQ diagnoses cloud leakage and commitments (F-005, F-006) on the FinOps Foundation's four domains and 22 capabilities | Section 6 | Fails area 1. Three tools give a client three different waste figures for the same estate | Owner decision D1 (recommended: FinOps Value Case becomes FinOps IQ's executive mode; Cost IQ routes to FinOps IQ) | FRAMEWORK.md area 1 |

### High

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| H1 | **Stage gating produces cliffs and unreachable stages.**<br>• One critical answer below its minimum caps the stage: best everywhere except C4 = 98/100 overall and "Below Stage 1".<br>• Critical minimums of 75/80 on stages 3–5 mean "mostly in place" (65) never passes.<br>• 97.9% of random questionnaires are below Stage 1 | `evaluate.ts:107-130`; `knowledge-base.json` stages; `AUTOMATED_AUDIT.md` FinOps IQ | The stage contradicts the score on the same page. The CIO dismisses both | Per-capability Crawl/Walk/Run profile (D2). If a summary is kept, show prerequisites as findings, not as a stage cap | finops.org maturity model |
| H2 | **No "Unknown", and "Not applicable" passes critical gates.** N/A on all 17 critical questions with "mostly" elsewhere gives Stage 2. N/A is offered even for billing export (C2) and finance access (C4), where it can never be true | `evaluate.ts:65, 99`; `finops-iq.html:4287-4289`; `SCORING_AUDIT.md` decision 4 | A client can pass gates by opting out; gaps are hidden | "Unknown" on every maturity question, scored as risk and shown as unconfirmed. N/A only where a scope fact makes it true (e.g. no Kubernetes) (D5) | Scorecard area 3 |
| H3 | **Features advertised that do not exist, and a fake client mode.**<br>• Not built: a 10-minute flash mode, six triggered "contradiction probes", a "Passkey Unlock" (it is a plain toggle), a "tailored consulting SOW" and a "unit-economics model".<br>• The "masked" client view is a CSS blur: the full roadmap is in the page text (11 "CRIT GATE" items in the banking client-mode text).<br>• Splash "LOADING FOCUS 1.0 SCHEMA ENGINE…" | `PLAYBOOK.md:25-32, 76-138, 144-146`; `finops-iq.html:4446-4447, 4554-4562, 4991` | Credibility. The "mask" protects nothing | Remove the claims now (F0). Build the real modes in WS-S7 | — |
| H4 | **Remediation text carries unsourced savings promises** that every report prints:<br>• O1 "yielding immediate 20-35% savings";<br>• O4 "cutting compute costs by up to 70%" (AWS states up to 90% for Spot);<br>• A2 "reclaiming 65% of non-prod cost";<br>• T6 "world-class <4% waste baseline";<br>• A8 "variance within ±5%" | `knowledge-base.json:816, 909, 1157, 1576, 1343` | Unreconciled numbers next to the headline, each a separate implied commitment | Remediations state the action and how to verify it; any figure comes from the value model with a claim ID | Section 5 rows 21–24, 31 |
| H5 | **No platform-specific execution, and cloud-only scope.**<br>• The footprint chips (AWS, Azure, GCP, OCI, Private Hybrid) and stack chips are collected but not sent to the engine.<br>• Remediations are AWS-first.<br>• No SaaS, licensing, data-centre/private-cloud or AI scope, although the Framework covers these scopes and State of FinOps 2026 reports 98% of respondents managing AI spend, 90% SaaS, 64% licensing and 48% data centre | `finops-iq.html:4019-4020, 3805-3810`; KB remediations | An Azure-first bank is told to use AWS Compute Optimizer. Half of the FinOps scope is missing | Platform playbook entries per lever × platform with verification (WS-S3); scope questions drive which capabilities are asked (D6) | finops.org 2026 framework; LF press release, State of FinOps 2026 |
| H6 | **The PDF is not a consulting deliverable.**<br>• No disclaimer, methodology, sources, version or "data provided by".<br>• The roadmap is silently capped at 18 rows.<br>• "≥" prints as `"e`.<br>• No How LTM can help, no backlog | `finops-iq.html:4780-4950`; generated PDFs (section 4) | Fails areas 7 and 13 | WS-S4 server-rendered PDF and backlog CSV (PLAN F6) | FRAMEWORK.md area 7 |
| H7 | **The claims register is empty for FinOps IQ.** 61 rows, all unreviewed, 0 sourced. Page, playbook and sample-report figures are not extracted | `docs/claims-register/claims-inventory.csv` | Area 8 cannot pass | Every figure by claim ID in the WS-S2 register; engine-only content | — |
| H8 | **"Empirical Data Verification" from a billing CSV is methodologically wrong and overwrites answers.**<br>• Tag coverage = share of *rows* with a non-empty tag column, not share of cost.<br>• Commitment coverage = share of *all* rows whose pricing term mentions reserved or savings, not share of eligible usage.<br>• The CSV is split on commas, which breaks on quoted fields such as tag JSON.<br>• "Apply" overwrites I2 and O1 | `finops-iq.html:4089-4163` | A wrong "verified" number replaces the client's answer and changes the stage | Remove it now. Later, a FOCUS-based import with cost-weighted measures (allocation % of `BilledCost`, commitment coverage from `CommitmentDiscount*` columns) as an optional workshop step | FOCUS 1.2/1.4 (section 5 row 8) |

### Medium

| # | Finding | Evidence | Fix |
|---|---|---|---|
| M1 | Question bank defects:<br>• C1 and C5 duplicate account ownership (both critical, both on chk-c1).<br>• C8 (root MFA) is a security control filed under "understanding usage".<br>• O10's text asks for a ranking; its options are maturity statements.<br>• A4 option 3 and I3 option 1 each combine two cases | `knowledge-base.json:261, 385, 478, 571, 1067, 1191` | Rewrite in F2 against FinOps Framework capabilities |
| M2 | Archetypes are labelled "empirical industry benchmarks" (`finops-iq.html:4024-4025`; toast "Loaded … benchmark!") but are invented demos. Two disagree with their own `baseline_stage` (saas 2 vs engine 1; retail 3 vs engine 2) | KB archetypes; golden file | Replace with reference scenarios labelled illustrative (D12) |
| M3 | FOCUS 1.0 cited throughout; the current version is 1.4 (ratified 4 Jun 2026), and AWS, Microsoft and Google export 1.2 | `knowledge-base.json:8, 16, 578`; `finops-iq.html:4071-4083, 4991` | Cite "FOCUS (current version 1.4; provider exports 1.2)" with a 90-day review |
| M4 | USD only.<br>• The spend dropdown maps "$75M – $150M+" to $100M, below the band midpoint.<br>• The minimum band is $2M | `finops-iq.html:4049, 4170-4173, 3961-3971` | Client currency; exact spend or band low/high carried through as a range |
| M5 | Org name inserted into `innerHTML` and attribute values without escaping, including from an imported session JSON | `finops-iq.html:4040, 4453, 4707-4725` | Escape all user text; validate imports |
| M6 | Hard-coded named partner and email in the CTA, mailto, placeholder and sample report | `finops-iq.html:4065, 4559, 4765-4773` | Engagement lead from the session (as decided for Sovereign IQ) |
| M7 | Playbook out of sync with the engine:<br>• critical minimums 70% (engine 65);<br>• "22-point" (23);<br>• Stage 2 tagging "≥80%" (I2 top option ≥85%) | `PLAYBOOK.md:58, 61, 30` | Retire; regenerate from the KB |
| M8 | The overall-score labels ("Healthy Optimization Posture" ≥75, "Developing Capabilities" ≥50, "Substantial Value Leakage") are computed on the page, not in the engine | `finops-iq.html:4468` | Engine field with sourced or labelled thresholds |
| M9 | The AI prompt lists option "score", which the page KB no longer carries ("score: undefined"). The system prompt asks for "McKinsey/Deloitte advisory style" (third-party marks) | `finops-iq.html:3745, 3778` | Removed with C1 |
| M10 | The checkpoint "Comprehensive Tagging Policy (≥80% coverage)" shows **MET** for the bank archetype, which answered I2 = "60% – 84%" | Generated banking report; `knowledge-base.json:152` | Checkpoint labels must match the scored threshold |

---

## 4. Report defensibility (area 13)

**Method:** I generated the report for each of the four archetype clients in the browser test harness: the screen in client and consultant mode, the checkpoints tab and the downloaded PDF. The harness uses the real contract and engine, as the Lambda does. There are no reference clients yet, so the archetypes stand in. I then checked each number against the engine output and the knowledge base.

### 4.1 The sample reports' numbers

| Archetype (input spend) | Stage shown | "Defensibility score" | "Estimated Waste Savings at Stake" (screen) / "RECOVERABLE WASTE" (PDF) | Basis line | Gate blockers | Roadmap gaps (engine / screen / PDF) |
|---|---|---|---|---|---|---|
| Cloud-Native B2B SaaS ($10M) | Stage 1 · Chaos / Crawl Baseline | 48/100 "Substantial Value Leakage" | $1,000,000 – $2,000,000 "Potential 10% – 20% annual cloud bill recovery" | "Based on your estimate of waste" | 11 | 28 / 10 / 18 |
| Tier-1 Enterprise Bank ($35M) | Stage 2 · Informed / Walk Foundation | 61/100 "Developing Capabilities" | $3,500,000 – $7,000,000, 10% – 20% | "Based on your estimate of waste" | 10 | 27 / 15 / 18 |
| Healthcare & Life Sciences ($14M) | Stage 1 · Chaos / Crawl Baseline | 33/100 | $1,400,000 – $2,800,000, 10% – 20% | "Based on your estimate of waste" | 12 | 35 / 14 / 18 |
| Global Retail ($22M) | Stage 2 · Informed / Walk Foundation | 81/100 "Healthy Optimization Posture" | $880,000 – $1,980,000, 4% – 9% | "Based on your estimate of waste" | 8 | 21 / 14 / 18 |
| Public sample "Meridian" ($35M) | Stage 2 | 68/100 | "$6.3M – $9.8M Recoverable Waste at Stake, 18% – 28%" | none | "5 Critical Blockers" | hand-written |

The public sample's $6.3M–$9.8M is what the engine returns for a $35M bank at Stage 2 **when T6 is left blank**: the stage band, 18–28%. The page labels this case "maturity stage benchmark (LTM heuristic)"; the sample labels it "Recoverable Waste" and adds "Target SOW $250k … ~28x First-Year ROI". Its 68/100 score and five blockers do not match the bank archetype's engine output (61/100, 10 blockers).

The bank's screen narrative reads: "the organization exhibits recoverable cost leakages between $3,500,000 and $7,000,000". The figure is the client's own answer to one question, re-presented as a finding.

### 4.2 Number trace (bank archetype)

| Number on the report | Engine field | Inputs and formula | Source or assumption | Traceable? |
|---|---|---|---|---|
| $35.0M / yr | `valueAtStake.annualSpend` (input) | Archetype `spend_numeric` | Invented demo value | Input only |
| Stage 2 · Informed / Walk Foundation | `maturity` (1) + 1 | Highest stage passed in sequence; a pass needs weighted score ≥ threshold, every critical ≥ `crit_min`, every question answered | Thresholds 60/65/70/75/80 and minimums 65/65/75/75/80: no source (A3, A4) | Partly: formula yes, constants no |
| 61/100 | `overallScore` | Weighted mean of option scores 100/65/30/0, weights 1–2 | Spacing and weights: no source (A1, A2) | Partly |
| "Developing Capabilities" | none (page) | Page thresholds 75/50 (`finops-iq.html:4468`) | No source (A19) | **No** |
| $3,500,000 – $7,000,000 | `valueAtStake.minSavings/maxSavings` | 35,000,000 × T6 range [10, 20] % | Client's own estimate of "unallocated waste, idle compute, or unattached storage" (A10, A11) | Formula yes; meaning no (waste ≠ saving) |
| 10% – 20% | `valueAtStake.minPct/maxPct` | T6 option 2 `waste_pct_range` | Option label | Yes |
| "Based on 44 of 44 questions" | `coverage` | Count | — | Yes |
| 10 gate blockers | `stageCriticals[*].failing` | Count of critical questions below `crit_min` or unanswered | A4, A5 | Yes |
| Domain scores 83 / 55 / 42 / 74 / 30 | `domainScores` | Weighted mean per LTM domain | LTM domains labelled "FinOps Foundation" (C3) | Formula yes; label false |
| "Scored 30 / 75" on roadmap items | `roadmap.horizons[].items[].score/target` | Option score vs `crit_min` or threshold | A3, A4 | Yes |
| "0–3 Months", "3–9 Months", "9–24 Months" | `roadmap.horizons[].when` | Constants in `evaluate.ts:286-306` | No source (A17) | **No** |
| "yielding immediate 20-35% savings" (O1), "up to 70%" (O4), "±5%" (A8), "<5% unallocated … ≥90%" (A6) | `roadmap…q.remediation` | KB text | Unsourced (section 5) | **No** |
| Advisory e-mail "elevation to Stage 3 … recover an estimated $3,500,000 – $7,000,000" | page | `maturity()+2`; value at stake | As above | Partly |

Of 13 number types on the bank report, 3 have no trace at all and 6 trace to a formula whose constants have no source.

### 4.3 Assumption register

| # | Assumption | Value | Basis today | Confidence | Sensitivity |
|---|---|---|---|---|---|
| A1 | Answer scores are evenly spaced | 100 / 65 / 30 / 0 | None stated | Low | Moves every score and gate |
| A2 | Question weights | 1 or 2 | None stated | Low | ±5 points overall per question (audit) |
| A3 | Stage thresholds | 60 / 65 / 70 / 75 / 80 | None stated | Low | Sets the stage |
| A4 | Critical minimums | 65 / 65 / 75 / 75 / 80 | 65 = product-owner default (`SCORING_AUDIT.md` decision 3); 75/80 none | Low | 75/80 make stages 3–5 reachable only with the top answer |
| A5 | Which 17 questions are critical | KB `critical` | None stated | Low | One answer can drop the stage from 4 to below 1 |
| A6 | Each practice belongs to one stage (e.g. waste T6 at Stage 5, forecasting A8 at Stage 4) | KB `stage` | None; contrary to FinOps Foundation per-capability maturity | Low | Determines gating |
| A7 | Stages are strictly sequential | Gating note | Stated, not grounded; contrary to the Foundation's guidance | Low | Cliff effects (H1) |
| A8 | N/A on a critical question passes its gate | Code | Product-owner default (decision 4) | Medium | N/A on all criticals = Stage 2 |
| A9 | Waste band by stage | 25–35 / 18–28 / 10–18 / 5–9 / 2–4 % | Labelled "LTM heuristic", no reasoning | Low | $35M bank: $6.3M–$9.8M vs $3.5M–$7.0M with T6 |
| A10 | T6 bands; "> 20%" means 20–35% | KB `waste_pct_range` | Option labels; the 35% cap has none | Low | Upper bound +75% over the label's floor |
| A11 | Waste share = savings available ("recovery") | Hidden | None | Low | Headline overstated by the share that cannot be removed (unallocated ≠ waste; removal costs) |
| A12 | All of the stated spend is addressable cloud spend; no split by lever or platform | Hidden | None | Low | Linear |
| A13 | Spend band midpoints | $3.5M, $10M, $22M, $45M, $100M for "$75M–$150M+" | None | Low | Linear (±50% within a band) |
| A14 | Currency is USD | Hidden | None | — | Presentation |
| A15 | No implementation or tooling cost | Hidden | None | Low | Gross, not net |
| A16 | Value is annual from year 1 (no ramp) | Hidden ("annual cloud bill recovery") | None | Low | Year-1 value overstated |
| A17 | Horizon lengths | 0–3 / 3–9 / 9–24 months | None | Low | Roadmap timing |
| A18 | Horizon assignment (criticals up to the next stage → short term, …) | `evaluate.ts:274-280` | None | Low | Sequencing |
| A19 | Overall-score labels | ≥75 "Healthy", ≥50 "Developing", else "Substantial Value Leakage" | None | Low | Label |
| A20 | Checkpoint met at ≥75 average and no failing critical; partial at ≥40 | `evaluate.ts:189-192` | None | Low | Checkpoint status |
| A21 | Archetype answers and spends are "empirical industry benchmarks" | KB archetypes | Invented | None | Demo results |
| A22 | Savings figures inside remediations | 20–35%, 70%, 65%, ±5%, <4% | None (section 5) | Low | Printed on every report |
| A23 | CSV mapping thresholds | Tags 85/60/30; commitments 75/50/25 | Mirror option labels; the measure itself is wrong (H8) | Low | Overwrites I2 and O1 |

**Count:** 23 assumptions. **20 have no stated ground.** A4 (in part), A8 and A23 rest on product-owner defaults or option labels, which are decisions, not evidence. None rests on published data.

### 4.4 Inflation check

| Test | Result |
|---|---|
| Range with confidence? | A min–max range, but no confidence level and no expected case |
| Expected case conservative? | No expected case. With T6 blank, the low end for "Below Stage 1"/Stage 1 is 25%. Flexera's 2026 figure is 29%, and that is the *average of respondents' own estimates* of wasted IaaS/PaaS spend (n=753, March 2026), not realised savings. So the "conservative" end sits near the industry's self-estimated waste. Not conservative |
| Net of implementation cost? | No |
| Phased over a realistic ramp? | No: shown as "annual cloud bill recovery" from year 1 |
| Each lever within addressable spend and the published range? | There are no levers, so no caps. The remediation figures imply levers (commitments "20–35%", Spot "up to 70%", parking "65%") with no addressable base. AWS's published maximums apply to *covered usage*, not the bill: up to 72% (Savings Plans/RIs), up to 90% (Spot). Azure: up to 72%. GCP: up to 55% (70% memory-optimised) |
| Double counting? | Not in the single headline, but the remediation figures, if read as additive, would overlap (Spot and commitments on the same compute) |
| Totals reconcile? | The headline does not reconcile to the roadmap: no roadmap item carries a value |
| Compared with published benchmarks? | None is shown. The KB's "State of FinOps 2026 Benchmark" source publishes no waste or maturity benchmark. State of FinOps 2026 (n=1,192) reports that many practitioners have already captured the large savings, which argues *against* 25–35% for mature estates and for diminishing returns |
| Missing data inflates? | **Yes.** T6 blank → stage band. A weak client: 20–35% → 25–35%. Retail: $0.88M–$1.98M → $3.96M–$6.16M |

**Verdict:** the headline cannot be defended as a saving and can be materially inflated by one blank answer.

### 4.5 Roadmap and action plan

- **Structure:** three horizons, each a list of question remediations ranked by critical, weight and gap. The screen shows up to 6 per horizon; the PDF up to 18 in total, silently cut.
- **Missing:** workstreams, activities, owner role, duration per item, dependencies, effort, milestones, KPIs, prerequisites, risks, and a value per item. Every element of area 13(e) is absent.
- **Specificity:** one generic sentence per question, often AWS-specific whatever the client's platforms. Examples: "Dedicate 10% of engineering sprint capacity to deploy Compute Optimizer…" for the Azure-and-AWS bank; "Launch an internal 'FinOps Champions' recognition award…".
- **Imbalance:** the saas archetype gets 1 short-term item, 3 mid-term and 24 long-term (engine output).

A delivery team could not start from it.

### 4.6 Presentation

**Missing:**
- Executive summary in situation / issue / recommendation / value form. The fallback narrative is two sentences; the alternative is unchecked AI text.
- Methodology, sources, version or date of method, "data provided by", and disclaimer (screen and PDF).
- Correct glyphs: the PDF prints "≥" as `"e`.

**Hype and sales language** (quoted):

| Where | Text |
|---|---|
| Page | "FinOps Defensibility Score" |
| Page | "recoverable cost leakages" |
| Page | "Unlock Complete FinOps Transformation Blueprint & Granular SOW" |
| Page | "Consultant / Advisory Partner Passkey Unlock" |
| Page | "Maturity Elevation Blueprint" |
| Page | "Download Boardroom PDF" |
| Page | "Pre-calibrate the assessment with empirical industry benchmarks" |
| Page | "Empirical Data Verified" |
| KB | "world-class <4% waste baseline" |
| KB | "Elite FinOps practitioners" |
| AI prompt | "McKinsey/Deloitte advisory style" |
| Sample | "guaranteed-savings FinOps sprints" |
| Sample | "~28x First-Year ROI" |
| Playbook | "Big 4-grade" |
| Playbook | "originates billable $120,000 – $380,000 USD advisory sprint engagements" |
| Playbook | "Free Teaser to Paid Advisory SOW" |

It would not pass as a professional consulting deliverable.

### 4.7 CIO challenge test

| # | Question a CIO or CFO would ask | Answered from the report? |
|---|---|---|
| 1 | "On what basis are you putting $3.5M–$7.0M of savings in front of my board?" | **Partly:** "Based on your estimate of waste", nothing more |
| 2 | "Is that net of what it costs to capture, and in which year do I see it?" | **No** |
| 3 | "Which levers make up the number (commitments, rightsizing, Spot, storage, waste), and how much each?" | **No** |
| 4 | "My score is 61, a peer's is 98, and the 98 is 'Below Stage 1'. How?" | **No** |
| 5 | "Are these the FinOps Foundation's stages and domains?" | **No:** the report says they are; they are not |
| 6 | "What if our waste guess is wrong, or I leave that question blank?" | **No:** a blank raises the figure |
| 7 | "Why isn't this already done by AWS Cost Optimization Hub, Azure Advisor or Google Recommender, which we already have?" | **No** |
| 8 | "Who owns each action, how much effort is it, and what depends on what?" | **Partly:** a horizon only |
| 9 | "What data did you take from us, where is it stored, and did any AI see it?" | **No** (and the playbook answer is false) |
| 10 | "How do we compare with published data such as State of FinOps or Flexera?" | **No** |

**Result:** 0 answered, 2 partly, 8 not answered.

**Area 13 rating: Fail.** The worst unsupported or inflated numbers:
1. The public sample's "$6.3M – $9.8M Recoverable Waste at Stake" with "~28x First-Year ROI" and "guaranteed-savings".
2. The stage band 25–35% applied whenever T6 is blank (retail $3.96M–$6.16M against its own estimate of $0.88M–$1.98M).
3. "Potential 10% – 20% annual cloud bill recovery", which re-presents the client's guess as recoverable.
4. The remediation promises "yielding immediate 20-35% savings" and "cutting compute costs by up to 70%".

---

## 5. Claims verification

**Verdicts:**
- **Correct.**
- **Incorrect:** wrong, misattributed or materially overstated.
- **Outdated:** was right, no longer.
- **Unsourced:** no trusted source found; what would settle it is in the "Correct statement" column.

**Abbreviations:** "KB" = `packages/engine-core/src/accelerators/finops-iq/knowledge-base.json` (the page embeds the same text from line 1762). "page" = `Accelerators/finops-iq.html`. "PB" = `Accelerators/FINOPS_IQ_CONSULTANT_PLAYBOOK.md`. "sample" = `Accelerators/finops-iq-sample-report.html`.

**Date checked:** 14 Oct 2026 for every row.

### FinOps Foundation framework, FOCUS, licence and trademarks

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 1 | "Aligned with FinOps Foundation Framework (Inform, Optimize, Operate)" | KB:8 | Correct | The Framework's phases are Inform, Optimize, Operate | https://www.finops.org/framework/ (via search; CC BY 4.0 page) |
| 2 | Five maturity stages "Chaos / Crawl Baseline", "Informed / Walk Foundation", "Optimized / Rate & Usage", "Automated / Run Practice", "Transparent / Unit Economics" | KB:28-76; PB:43-72 | Incorrect | The Foundation's maturity model is Crawl, Walk, Run, applied **per capability**. There is no "Chaos" or "Transparent" stage and no org-level five-stage ladder. Present any summary as LTM's | https://www.finops.org/framework/maturity-model/ ; https://www.finops.org/insights/finops-maturity-model/ |
| 3 | "Maturity is the highest stage passed with all preceding stages also passed" (strict org-level gating) | KB `gating_note`; `evaluate.ts:119-130` | Incorrect (as an application of the FinOps Foundation model) | "The goal for organizations is not to get to the 'Run' stage across all Capabilities … but to perform each Capability at the appropriate level of maturity for your environment." Capabilities can sit at different levels and may move back down | as row 2; https://www.finops.org/insights/no-runners |
| 4 | Domains "Understanding Cloud Usage & Cost", "Quantifying Business Value", "Optimizing Usage & Cost", "Managing the FinOps Practice" | KB:87-117 | Outdated | Current names: Understand Usage & Cost; Quantify Business Value; Optimize Usage & Cost; Manage the FinOps Practice | https://www.finops.org/framework/ ; https://learn.microsoft.com/en-us/cloud-computing/finops/framework/capabilities |
| 5 | "FinOps Foundation Domain Performance" panel and "5 FinOps Foundation domains", including "Modern Workloads (K8s & GenAI)" | page:4479, 4655; KB:113 | Incorrect | There are four domains. Kubernetes and AI are not domains: AI is a technology category / scope in the 2025–2026 Framework | as row 4; https://www.finops.org/insights/2026-finops-framework/ |
| 6 | `finops_capability` labels shown beside the domains, e.g. "Account & Identity Governance", "Waste Threshold & Posture Defense", "FinOps Culture & Gamification" | KB questions; page:4271-4272 | Incorrect | These are not Framework capabilities. The 2026 Framework's capabilities include Data Ingestion, Allocation, Reporting & Analytics, Anomaly Management, Planning & Estimating, Forecasting, Budgeting, KPIs & Benchmarking, Unit Economics, Architecting & Workload Placement, Usage Optimization, Rate Optimization, Licensing & SaaS, Sustainability, Executive Strategy Alignment (new in 2026), FinOps Practice Operations, Governance Policy & Risk, Education & Enablement, Invoicing & Chargeback, FinOps Assessment, Automation Tools & Services, and Intersecting Disciplines (as encoded in Cost IQ's overlay). Map questions to these | https://www.finops.org/insights/2026-finops-framework/ ; Cost IQ `finops-overlay-v7.1.0.json` |
| 7 | Source "FinOps Foundation — FinOps Framework 2026" | KB:12 | Correct | The 2026 Framework was published 19 Mar 2026. The engine does not reflect its changes (Executive Strategy Alignment, Scopes, technology categories) | https://www.finops.org/insights/2026-finops-framework/ |
| 8 | "FOCUS 1.0 specifications"; "Supports FOCUS 1.0"; question I3 | KB:8, 16, 578; page:4071-4083 | Outdated | FOCUS 1.4 was ratified 4 Jun 2026 (1.3 in Dec 2025). AWS Data Exports for FOCUS 1.2 has been GA since Nov 2025. Azure and Google FOCUS exports are at 1.2 (preview per secondary sources) | https://focus.finops.org/focus-specification/ ; https://aws.amazon.com/blogs/aws-cloud-financial-management/data-exports-for-focus-1-2-is-now-generally-available |
| 9 | "'FinOps' is a trademark of the FinOps Foundation" | KB:8 | Unsourced | The FinOps Foundation is a Linux Foundation project; marks are governed by the LF Projects trademark policy. FOCUS is shown with ™. Confirm on lfprojects.org whether "FinOps" is a claimed mark before keeping the sentence | https://focus.finops.org/about-focus/ ; https://focus.finops.org/faqs/ |
| 10 | Source "State of FinOps 2026 Benchmark" | KB:20 | Incorrect | State of FinOps 2026 is a practitioner survey (released 19 Feb 2026, n=1,192). It publishes priorities and scope (98% manage AI spend, 90% SaaS, 64% licensing, 48% data centre), not maturity or waste benchmarks. No engine figure uses it | https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1 |
| 11 | "22-Point FinOps Foundation Checkpoint Audit"; "22-Point Checkpoint Matrix" | sample; PB:30, 146 | Incorrect | The KB has 23 checkpoints, written by LTM. Not a FinOps Foundation audit; implies endorsement | KB `meta.checkpoints` |
| 12 | "FinOps IQ™" | sample (title, header) | Unsourced | No evidence of a trademark claim or registration; remove the ™ unless counsel confirms | — |

**Licence note.** The FinOps Framework pages and the FOCUS specification are published under Creative Commons Attribution 4.0, which allows reuse and adaptation with attribution. FinOps IQ carries no attribution, and it labels its own adapted model as the Foundation's. CC BY 4.0 requires attribution and an indication of changes; it gives no right to imply endorsement. The fix: "Adapted from the FinOps Framework by the FinOps Foundation, CC BY 4.0. Changes: …". The trademark question (row 9) is separate from the copyright licence.

### Value and savings figures

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 13 | Value at stake 25–35% of spend below Stage 1 and at Stage 1 | `evaluate.ts:209`; page:3933-3946 | Unsourced | No source. For comparison, Flexera 2026: respondents *estimate* 29% of IaaS/PaaS spend is wasted (n=753, Mar 2026; 27% in 2025). That is a self-estimate across all maturities, not a recoverable saving | https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows |
| 14 | 18–28% at Stage 2 | `evaluate.ts:217` | Unsourced | LTM heuristic with no reasoning recorded | — |
| 15 | 10–18% at Stage 3 | `evaluate.ts:218` | Unsourced | as row 14 | — |
| 16 | 5–9% at Stage 4 | `evaluate.ts:219` | Unsourced | as row 14 | — |
| 17 | 2–4% at Stage 5 | `evaluate.ts:220` | Unsourced | as row 14 | — |
| 18 | T6 "> 20% waste" means 20–35% | KB:1568-1574 | Unsourced | The 35% ceiling has no basis | — |
| 19 | "Best-in-class Stage 5 organizations hold waste strictly below 4%"; "world-class <4% waste baseline"; checkpoint "Near-Zero Waste Posture (<4% bill)" | KB:1540, 1576, 254 | Unsourced | No published source found | — |
| 20 | "Estimated Waste Savings at Stake … Potential X% – Y% annual cloud bill recovery"; PDF "RECOVERABLE WASTE"; "recoverable cost leakages" | page:4470-4473, 4505, 4860 | Incorrect | It is a waste estimate (client-reported or an LTM band), gross, not phased, not net of cost. T6 includes "unallocated" spend, which is unattributed, not wasted. Label: "Indicative waste range (not a savings commitment)" | Flexera 2026 (row 13) on what waste estimates measure |
| 21 | Commitments "yielding immediate 20-35% savings" | KB:816 | Unsourced | Providers publish maximum discounts on **covered** usage: AWS Savings Plans/RIs up to 72% (Compute Savings Plans up to 66%); Azure reservations up to 72%; GCP resource CUDs up to 55% (70% memory-optimised). Bill-level saving depends on coverage of eligible spend; it is not immediate in full | https://aws.amazon.com/economics/learn-more/ ; https://azure.microsoft.com/en-us/reservations/ ; https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview |
| 22 | Spot "cutting compute costs by up to 70%" | KB:909 | Incorrect | AWS: "up to 90%" off On-Demand for Spot, on the workloads moved, with interruption risk. Not a compute-bill saving | https://aws.amazon.com/economics/learn-more/ |
| 23 | "Elite FinOps practitioners maintain 75–85% coverage with >98% utilization" | KB:796 | Unsourced | No published source found; the right coverage depends on workload stability | — |
| 24 | Commitment coverage "≥ 70%" (checkpoint, leap guide, PB) vs "≥ 75% … >95% utilization" (O1 top option) | KB:47, 182-183, 800 | Unsourced | No source, and internally inconsistent | — |
| 25 | Tagging "≥80%" (stage, checkpoint, remediation, PB) vs "≥ 85% of total spend" (I2 top option) | KB:45, 152-153, 568, 549 | Unsourced | No source; inconsistent. Searches found no Foundation percentage ladder for allocation | finops.org maturity model (qualitative only) |
| 26 | "Many clients think they are at 90%, but … actual coverage below 50%" | KB:548 | Unsourced | — | — |
| 27 | Anomaly alerting "within 24 hours" as the Stage 2 standard | KB:43, 171 | Unsourced | Reasonable practice; label it an LTM heuristic | — |
| 28 | Forecast variance ladder ±5% / ±15% / ±30% | KB A8 (1315-1343) | Unsourced | No Foundation ladder found. Secondary sources cite ~20% at Crawl and <5% at Run without a primary reference | — |
| 29 | "10-25% of storage cost comes from abandoned snapshots and detached disks" | KB:703 | Unsourced | — | — |
| 30 | Inter-AZ traffic "15-25% of the total network bill" (KB) / "15% to 25% of the total AWS/Azure bill" (PB) | KB:982; PB:135 | Unsourced | Inconsistent bases (network bill vs total bill) | — |
| 31 | Automated parking "immediately cuts 65% of non-prod compute spend" | KB:1137, 1157; PB:184 | Unsourced | Arithmetic: a 50-hour week vs 168 hours is about 70% fewer hours, for hourly-billed resources only. Label "LTM heuristic" with the formula | — |
| 32 | "pods are provisioned for 4x their average memory/CPU need" | KB:1230; PB:97 | Unsourced | — | — |
| 33 | Idle GPU clusters "at $10k/day"; H100/A100/L40S nodes "$30 to $120+ per day per node" | KB:1199; PB:115 | Unsourced | Provider price pages not checked in this review; the PB range looks low for multi-GPU H100 instances. Use provider pricing with region and date | — |
| 34 | Commitment expiry makes spend "spike by 30% overnight" / "30% to 40%" | KB:951; PB:105 | Unsourced | — | — |

### Playbook, sample report and page statements

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 35 | Value at stake "typically 15% to 35% of annual cloud spend" | PB:14 | Unsourced | The engine produces 2–35% | — |
| 36 | "unallocated shared infrastructure routinely accounts for 30% to 50% of the gross cloud bill" | PB:85 | Unsourced | — | — |
| 37 | "tag coverage decays by 15% to 25% every quarter" | PB:87 | Unsourced | — | — |
| 38 | NAT Gateway data processing "$0.045/GB" | PB:135 | Correct | $0.045/GB in us-east-1, plus hourly and egress charges; varies by region. Confirmed by multiple secondary sources; AWS pricing page not fetched | https://aws.amazon.com/vpc/pricing/ (not fetched); https://cloudburn.io/blog/aws-nat-gateway-pricing |
| 39 | "FinOps IQ executes 100% in-memory in your local web browser session. No organizational financial data … [is] ever transmitted to external servers" | PB:210 | Incorrect | Answers, annual spend and client name are posted to the LTM API (AWS ap-south-1). BYOK AI sends notes, spend and name to Google, Anthropic or OpenAI. Archive stores the PDF in S3 | page:3801-3826, 3650-3726, 4916-4945 |
| 40 | Stage 1 and 2 critical minimum "70%" | PB:58, 61 | Outdated | 65 since Phase 3 | KB stages; `SCORING_AUDIT.md` |
| 41 | "10-minute C-suite flash readout" and "6 Contradiction Probes" with trigger conditions | PB:25-32, 76-138 | Incorrect | Neither exists in the page or the engine | code search |
| 42 | Advisory packages "$120k – $180k", "$200k – $280k", "$250k – $380k" | PB:15, 169-187 | Unsourced | Fees: consultant-only SOW per the owner's approach for Sovereign IQ (D7 there) | — |
| 43 | "guaranteed-savings FinOps sprints" | sample (CTA) | Incorrect | No guarantee exists. FinOps Value Case's own disclaimer says "not a guarantee of savings"; FRAMEWORK area 13(c) bans the term | FRAMEWORK.md |
| 44 | "Target SOW $250k USD … ~28x First-Year ROI" | sample (KPI card) | Unsourced | Not an engine output | — |
| 45 | "$480,000/month in NAT Gateway traffic … zero tags"; "Pod resource requests exceed actual utilization by 3.8x"; "$1.2M/month … 34% compute rate shock ($408k/mo)"; "$340,000/month idle"; "$2.4M in rate optimization"; "recovering $1.8M/yr" | sample | Incorrect | Presented as findings; the engine computes none of them. Illustrative at best and must be labelled | — |
| 46 | "$6.3M – $9.8M Recoverable Waste at Stake, 18% – 28%" | sample | Incorrect | The Stage 2 LTM heuristic band applied to $35M (T6 blank), not a recoverable amount | `evaluate.ts:217` |
| 47 | "Pre-calibrate the assessment with empirical industry benchmarks" (archetypes) | page:4024-4025, 4206 | Incorrect | The archetypes are invented demo profiles | KB archetypes |
| 48 | "✓ Empirical Data Verified … Tag Coverage … Commitment Coverage" from a billing CSV | page:4089-4163 | Incorrect | Counts rows, not cost; the commitment denominator is all line items, not eligible usage; naive comma split | FOCUS spec (row 8) for cost-weighted columns |
| 49 | CSV "Processing is 100% local in your browser" | page:4076 | Correct | FileReader only; only the derived answer index leaves the browser (with the other answers) | code |
| 50 | Splash "LOADING FOCUS 1.0 SCHEMA ENGINE…", "ARMING VALUE-AT-STAKE ENGINE…" | page:4991-4995 | Incorrect | No such components | code |
| 51 | Client mode "masked", "shielded", "Passkey Unlock" | page:4446-4447, 4561 | Incorrect | CSS blur; full text in the page; a toggle with no passkey | generated client-mode text (section 4) |
| 52 | "The detailed 3-horizon modernization roadmap, granular checkpoint audit trail, unit-economics model, and tailored consulting SOW have been synthesized for this engagement" | page:4557 | Incorrect | No unit-economics model or SOW is generated | code |
| 53 | Billing exports "AWS CUR 2.0, Azure Cost Export, GCP BigQuery Export" | KB:320 | Correct | These exist; add the FOCUS exports (AWS FOCUS 1.2 GA Nov 2025) | https://aws.amazon.com/blogs/aws-cloud-financial-management/data-exports-for-focus-1-2-is-now-generally-available |

**Count:** 53 statements checked. Correct 5. Incorrect 18. Outdated 3. Unsourced 27. (Incorrect, outdated or unsourced: 48.)

---

## 6. Distinctness, overlap map and consolidation recommendation

### 6.1 The three FinOps-family accelerators

| | **Cost IQ** | **FinOps IQ** | **FinOps Value Case** |
|---|---|---|---|
| Files | `Accelerators/cost-iq-v10.html`, `Accelerators/cost-iq/`, `packages/engine-core/src/accelerators/cost-iq/` (canon engine v10, master config 6.6.0, release "COSTIQ-0.7.8-DRAFT"), `amplify/functions/evaluate-cost-iq/` | as above | `Accelerators/finops-value-case.html`, `packages/engine-core/src/accelerators/finops-value-case/` (29 questions, 6 sections) |
| Decision it informs (as built) | Where total technology spend leaks value across the estate, and which cost and value levers to fund in the next 12–24 months | Not stated. In effect: "how mature is our cloud FinOps practice, and what should we fix first?" | "Do we need to invest in FinOps now, and what is the value case?" (verdict bands "Lightweight practices sufficient" … "Material exposure: act this year") |
| Buyer | CIO and CFO (enterprise technology cost) | Head of Cloud / CCoE / FinOps lead; the playbook adds CFO and CIO | CIO or CFO before a FinOps investment; the qualification stage of a sale |
| Scope | Whole technology estate, 16 dimensions: cloud, SaaS, software, infrastructure, workforce, vendors, applications, AI, M&A and others | Public cloud only (plus Kubernetes and GenAI questions) | Cloud estate |
| Inputs | 105 questions (45 core, adaptive by area) plus 12 FinOps supplemental (FIN-01–12); revenue and technology-spend bands; CIO hypothesis; optional evidence and feasibility | 44 maturity questions; annual cloud spend; client name and sector; clouds and stack (collected, unused) | 29 questions: spend slider, growth, migration pace, tagging %, commitment %, forecast variance, ownership allocation, controls, value questions; "don't know" everywhere |
| Engine model | FinOps Framework 2026 overlay: 4 domains, 22 capabilities, Crawl/Walk/Run, personas, technology categories. Opportunity = addressable spend × opportunity factor × confidence modifier, kept apart from feasibility-adjusted "practical opportunity"; "avoidDoubleCounting: true"; "Illustrative opportunity range — requires evidence validation" | 5 LTM stages with strict gating; value at stake = spend × T6 or stage band | Signals (visibility, predictability, ownership, control, value), gap, urgency and need indices; waste band from capability (30–40% … 8–14%) anchored to Flexera 2026 29% (n=753) with BFSI modifiers labelled "LTM directional adjustment"; 3-year projection capped at −25% to +60%/yr; confidence; blind spots |
| Outputs | Cost IQ and Value IQ scores with confidence; findings F-001–F-020; recommendations R-001–R-010 mapped to LTM services (e.g. R-003 "Run a Cloud Economics Diagnostic" → "FinOps & Cloud Cost Optimization"); 3-horizon roadmap; server-side AI review (Gemini today) | Stage, score, domain scores, value at stake, checkpoints, 3-horizon roadmap, 2-page PDF | Verdict, waste range (year 1 and 3 years), exposure, recommended service areas with deliverables, value streams with benchmark shares, case studies (all three files are placeholders) |
| AI | Server-side Gemini via `GEMINI_MODEL` (`evaluate-cost-iq/handler.ts:104-107`): not yet on Bedrock (WS-S1) | Browser BYOK (C1) | No AI vendor calls in the page |

### 6.2 Overlap with FinOps IQ

| FinOps IQ theme (questions) | FinOps Value Case | Cost IQ |
|---|---|---|
| Tag/allocation coverage (I1, I2) | V1, V2 | ADP-01, ADP-04, FIN-07 |
| Billing data and normalisation, FOCUS (C2, I3) | — | FIN-01 |
| Showback, self-service visibility (I4, I5, C4) | V5, O3 | ADP-01 |
| Anomaly and variance explanation (I6, I8) | V3, P2 | CORE-24, ADP-43 |
| Forecast accuracy (A8) | P1, P3 | FIN-05 |
| Ownership and FinOps team (C1, C5, C7) | O1, O2, P4 | FIN-06 |
| Commitments (O1, O6) | C2 | CORE-28, ADP-03, FIN-12 |
| Rightsizing, waste and idle cleanup (O2, I7, T6) | C1, C3 | ADP-02, FIN-11 |
| Non-prod scheduling (A2) | C1 | ADP-02 |
| Egress (O7) | C5 | — |
| Cost in architecture decisions (O5) | — | ADP-05 |
| Policy as code, guardrails (A1) | C1 | FIN-08 |
| Cost in objectives (A6, T7) | O4 | FIN-09 |
| Unit economics (T2, T4, T8) | V4, L1 | FIN-02, FIN-04 |
| Chargeback (T1) | — | FIN-07 |
| Waste-based value figure | Waste band × spend, 3-year projection | Addressable spend × factor × confidence |

About 30 of FinOps IQ's 44 questions have a FinOps Value Case or Cost IQ equivalent. Each tool adds something of its own:
- **FinOps IQ:** depth on engineering practice (Spot, Kubernetes allocation and autoscaling, CI/CD cost feedback, storage lifecycle, GenAI/GPU) and consultant probes.
- **FinOps Value Case:** "don't know" as a blind spot, confidence, a sourced waste anchor, need and urgency, and typed service areas.
- **Cost IQ:** the whole estate, the FinOps Foundation capability model, and an opportunity model that separates economic from practical opportunity.

**A client running all three today gets three waste figures for the same estate.** Bank example at $35M: FinOps IQ $3.5M–$7.0M (or $6.3M–$9.8M); FinOps Value Case a waste band from 8–14% to 30–40% depending on its capability index ($2.8M–$14M across the bands); Cost IQ an "illustrative opportunity range". Each comes from a different method.

### 6.3 Edge over free and commercial alternatives

| Alternative | What it gives | FinOps IQ edge (to be built, see PLAN.md) |
|---|---|---|
| FinOps Foundation Framework, FinOps Assessment Guide and Tool (CC BY 4.0); free third-party self-assessments built on it (e.g. a 15-question tool that states the Foundation does not endorse it) | Per-capability Crawl/Walk/Run self-assessment | The same model, plus a consultant-validated, scope-aware assessment (public cloud, AI, SaaS, licensing, private cloud and data centre), a sourced lever-based value range and a platform-specific backlog. Use the Foundation's model rather than compete with it |
| Provider tools: AWS Cost Optimization Hub (free; consolidates 18+ recommendation types including rightsizing, Graviton, idle resources and Savings Plans/RIs, net of existing discounts), Azure Advisor, Google Cloud Recommender | Resource-level recommendations for one provider | Operating model, ownership, governance and unit economics (which the tools do not assess); multi-provider and on-premises; sequencing and decisions. Recommendations from these tools become **evidence** for the lever model, not competitors |
| Commercial FinOps platforms | Continuous allocation, anomaly detection, commitment management | Vendor-neutral selection of tooling as an option, not a product |

**The USP worth writing down:** "In one consultant-led session, FinOps IQ turns the FinOps Foundation's capability model into a scope-aware maturity profile, a sourced and conservative value range by lever, and a platform-specific programme with owners. It uses your provider tools' own recommendations as evidence." This is only true after the rebuild.

### 6.4 Consolidate or differentiate (recommendation for the owner, D1)

| Option | What it means | For | Against |
|---|---|---|---|
| **A. Consolidate all three into one** | Cost IQ absorbs FinOps IQ and FinOps Value Case as its cloud module | One engine, one value model | Cost IQ is a whole-estate CIO/CFO tool with 105 questions; FinOps depth would be buried or would bloat it. Loses the FinOps-led door-opener |
| **B. Keep three, differentiate** | Sharpen each decision and remove shared questions | Least rework | Three waste figures remain unless all three share a value model; FinOps IQ and FinOps Value Case still assess the same practices for the same buyer |
| **C. Two accelerators (recommended default)** | **FinOps Value Case becomes the executive mode of FinOps IQ;** FinOps IQ's rebuilt workshop is the deep mode on one engine. **Cost IQ stays** as the enterprise technology cost and value diagnostic; its cloud and FinOps sections route to FinOps IQ (R-003 → FinOps IQ) | Matches the owner's two-mode design (FRAMEWORK "Audience"). Keeps FinOps Value Case's better value logic and FinOps IQ's engineering depth. One FinOps capability model, shared with Cost IQ's overlay. One value model, so one number per estate | Rework; the FinOps Value Case URL and API need a redirect and alias |

**Decision each would own under option C:**
- **Cost IQ:** "Where should we cut, redirect or protect technology spend across the whole estate over the next 12–24 months?" Buyer: CIO with CFO.
- **FinOps IQ (merged):** "What FinOps operating model and optimisation programme should we fund for our cloud, AI and SaaS spend, in what order, and what value can it credibly return?" Buyer: CIO, with CFO as co-owner; Head of Cloud/CCoE and FinOps lead as delivery owners. The executive mode (from FinOps Value Case) answers "do we need to act now?"; the workshop mode answers "what exactly, by when, and who?".

---

## 7. Client financial data and hosting (S6)

**What FinOps IQ collects today:**

| Data | Where it goes | Evidence |
|---|---|---|
| Answers (option indexes), annual cloud spend (USD), client name, sector | LTM Advisory API, AWS ap-south-1 (Mumbai), with the user's Cognito token. Not stored by the Lambda | `finops-iq.html:3801-3826`; `evaluate-finops-iq/handler.ts` |
| The same, via the unauthenticated legacy route while `LTM_KEEP_LEGACY_API` is true | Same Lambda | `amplify/backend.ts:213-215` |
| Full state: answers, notes, consultant name, footprint, stack, AI output | Browser `localStorage`; JSON export file | `finops-iq.html:3535-3545, 4702-4706` |
| Client name, sector, spend, stage, score, blockers; consultant notes per question | Google, Anthropic or OpenAI from the browser, with the user's key (C1) | `finops-iq.html:3650-3799` |
| PDF (client name, spend, stage, score, roadmap) and metadata | S3 report archive after a consent prompt | `finops-iq.html:4916-4945` |
| Billing CSV | Stays in the browser; only derived answers leave | `finops-iq.html:4089-4163` |

**Recommended wording** for the start screen, PDF methodology panel and privacy notice (owner and counsel to approve; aligned with the Sovereign IQ wording):

> "LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which does not have an EU adequacy decision or a UK data bridge. LTM relies on [EU Standard Contractual Clauses / the UK IDTA or Addendum] and a transfer risk assessment. We collect your answers, your cloud spend figure and your organisation's name to produce the report. Billing files you upload are read in your browser and are not sent to LTM. AI features are off unless your consultant switches them on; when on, processing uses Amazon Bedrock in the same region and never sees your consultant's notes."

Spend figures are commercially confidential, not personal data. The S6 work for FinOps IQ is therefore mainly the respondent's and consultant's identities, confidentiality, retention and the AI boundary. The owner's Sovereign IQ decision D11 (collect all required data, client name included) is assumed to apply here too.

---

## 8. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | Consolidate or differentiate the three FinOps accelerators | A: one tool (Cost IQ) / B: three, differentiated / C: FinOps Value Case becomes FinOps IQ's executive mode, Cost IQ stays and routes to FinOps IQ | **C** (section 6.4) |
| D2 | Maturity model | Keep LTM's five gated stages / FinOps Foundation Crawl/Walk/Run per capability | **Per capability**, using the 2026 Framework's domains and capabilities as encoded in Cost IQ's overlay, with CC BY 4.0 attribution. Any summary is an "LTM summary"; no "Chaos"/"Transparent" names; no org-level gating |
| D3 | Headline value | Keep the single waste band / lever-based range | **Lever-based**: addressable spend per lever (client input or band) × published or labelled range; conservative/expected/upper; net of indicative implementation cost; phased (e.g. 40/80/100% over three years, labelled LTM heuristic until evidence exists); "not quantified" when inputs are missing; never "recoverable" or "guaranteed" |
| D4 | Client's own waste estimate (T6) | Drives the value (today) / a hypothesis only | **Hypothesis**, compared with the model's range (as Cost IQ does with CORE-09); never a value input |
| D5 | "Unknown" and "Not applicable" | As today / Unknown everywhere, N/A only by scope | **Unknown on every maturity question, scored as risk and shown as unconfirmed; N/A only when a scope fact makes it true** (no Kubernetes, no AI, single cloud) |
| D6 | Scope | Public cloud only / FinOps Framework scopes | **Public cloud core, plus AI, SaaS, licensing and private cloud/data centre**, each switched on by a footprint question; capability questions shown per scope |
| D7 | Client mode | Blurred teaser (today) / real client mode | **Real client mode** (WS-S7): client sees the full findings and roadmap with internals hidden; no lock or CTA wall; fees only in the consultant SOW as ranges |
| D8 | Public sample report and playbook | Keep / fix / retire | **Retire now** (F0); regenerate both from the engine and KB after the rebuild |
| D9 | Currency | USD only / client currency | **Client currency** (USD, EUR, GBP, INR, SGD, AUD); percentages need no FX; no conversion unless the client asks, and then with a dated reference rate in the register |
| D10 | Framework and trademark wording | As today / attribution | **"Adapted from the FinOps Framework by the FinOps Foundation (CC BY 4.0); changes: …"**. Drop "'FinOps' is a trademark of the FinOps Foundation" and "FinOps IQ™" unless counsel confirms. Never "FinOps Foundation audit/checkpoints" |
| D11 | Unauthenticated legacy API route | Keep during cutover / switch off for FinOps IQ | **Switch off now** for FinOps IQ (and FinOps Value Case) |
| D12 | Demo clients | Invented archetypes / reference scenarios | **Five reference scenarios** from public case studies and provider documentation, labelled illustrative: AWS-native SaaS; Azure-and-AWS regulated bank; GCP data/AI platform; retail with Kubernetes and seasonal load; enterprise with private cloud and OCI. Expected profiles written before running |
| D13 | Billing-file import | Keep the CSV heuristic / remove / rebuild on FOCUS | **Remove now; rebuild later** as an optional workshop step reading FOCUS columns, cost-weighted, shown as evidence beside the answer, never overwriting it |
| D14 | Volatile items (FOCUS version, Framework revisions, provider discount maxima, State of FinOps and Flexera editions) | 6-month review / 90-day review | **90-day review** with "as of" dates; annual reports re-checked on publication |
| D15 | Global value cap and ramp | No cap (today) / cap at published average estimated waste / cap per lever only | **Both:** per-lever caps at addressable base × published maximum, and expected total ≤ Flexera 2026 average estimated waste (29%, n=753) unless client evidence is attached; ramp per lever labelled LTM heuristic |

---

## 9. Sources

All checked 14 Oct 2026 by web search; direct fetch of finops.org failed (DNS blocked).

- FinOps Framework (domains, phases, CC BY 4.0 notice): https://www.finops.org/framework/
- FinOps Framework 2026 update (19 Mar 2026; Executive Strategy Alignment, Scopes, technology categories): https://www.finops.org/insights/2026-finops-framework/
- FinOps maturity model, per-capability Crawl/Walk/Run: https://www.finops.org/framework/maturity-model/ ; https://www.finops.org/insights/finops-maturity-model/ ; https://www.finops.org/insights/no-runners
- FinOps Assessment capability (Assessment Guide and Tool): https://www.finops.org/framework/capabilities/finops-assessment/
- Microsoft Learn summary of the Framework's capabilities: https://learn.microsoft.com/en-us/cloud-computing/finops/framework/capabilities
- FOCUS specification (1.4 ratified 4 Jun 2026; 1.3 Dec 2025): https://focus.finops.org/focus-specification/ ; https://finops.org/insights/introducing-focus-1-3/ ; FAQ and governance: https://focus.finops.org/faqs/ ; https://focus.finops.org/about-focus/
- AWS Data Exports for FOCUS 1.2 GA (Nov 2025): https://aws.amazon.com/blogs/aws-cloud-financial-management/data-exports-for-focus-1-2-is-now-generally-available
- State of FinOps 2026 (19 Feb 2026, n=1,192): https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1 ; report hub: https://www.finops.org/insights/state-of-finops/
- Flexera 2026 State of the Cloud (18 Mar 2026, n=753, 29% estimated wasted IaaS/PaaS spend, up from 27%): https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows ; https://info.flexera.com/CM-REPORT-State-of-the-Cloud
- AWS cost optimisation (Savings Plans/RIs up to 72%, Spot up to 90%): https://aws.amazon.com/economics/learn-more/
- AWS Cost Optimization Hub: https://aws.amazon.com/aws-cost-management/cost-optimization-hub/
- Azure reservations (up to 72%): https://azure.microsoft.com/en-us/reservations/ ; https://azure.microsoft.com/en-us/blog/optimize-your-cloud-investment-with-azure-reservations/
- Google Cloud committed use discounts (up to 55%; 70% memory-optimised): https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- NAT Gateway pricing (secondary; AWS page not fetched): https://cloudburn.io/blog/aws-nat-gateway-pricing ; official: https://aws.amazon.com/vpc/pricing/
- Repository evidence (14 Oct 2026):
  - `npm run audit:engines`: FinOps IQ unchanged from `docs/phase3/AUTOMATED_AUDIT.md`.
  - `npx vitest run` on `finops-iq`, `finops-value-case` and `engines`: 104 passed.
  - `npx playwright test tests/e2e/finops-iq.spec.ts`: 4 passed.
  - Archetype reports generated with the browser harness, outside the repo.
