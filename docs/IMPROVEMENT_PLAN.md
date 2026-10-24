# LTM Advisory Accelerators: Improvement Plan (revised 6 Oct 2026)

**Goal:** secure, accurate and defensible accelerators that can be put in front of CIOs: consultant-led first, client-facing later.
**In scope:** FinOps Value Case, Strategy IQ, Cloud IQ, FinOps IQ, Posture IQ, Sovereign IQ (Modernization IQ and AI Readiness IQ join later).
**Out of scope:** Cost IQ and Resilience IQ, which are maintained separately. Exception: Resilience IQ joins the shared platform playbook (5.1) as a pilot.

**What changed in this revision:**
- A new **Phase 3, Scoring model audit & recalibration**, checks that every engine's scoring system works as intended and fixes the engines and reports where it doesn't.
- The former Phases 3–7 become Phases 4–8.
- Status reflects work merged and deployed up to Amplify build 100.

## Phases and status

| # | Phase | Status | Outcome so far |
|---|---|---|---|
| 0 | Containment | ✅ Done | Unauthenticated user, password and report routes closed. Cognito self sign-up disabled. The old open API (`zvnmwxa9sf`) and orphaned stacks deleted |
| 1 | Platform foundation | ✅ Done (owner actions open) | One authenticated API in code; Cognito JWT on every route; CI (typecheck, tests, backend assertions, browser tests, secret scan); site-wide security headers |
| 2 | Engine consolidation & correctness | ✅ Done | All six accelerators score only on the server, through validated request contracts. Golden, invariant, contract, regression and browser tests for each. 20+ scoring and report bugs fixed (see `docs/phase2/ACCELERATOR_TEMPLATE.md`) |
| 3 | **Scoring model audit & recalibration** (new) | ✅ Engine work done (lead review open) | Automated audit of all six engines (`npm run audit:engines`). About 70 findings fixed with regression tests: FinOps IQ stages reachable, blank answers no longer flatter Strategy IQ, Posture IQ matrix and probes work, Sovereign IQ double counting and regime scope fixed, FinOps Value Case blind-spot crash fixed. 15 decisions for practice and legal leads (`docs/phase3/SCORING_AUDIT.md`) |
| 4 | Fact-check & methodology | ⏭ Next (groundwork done) | 323 candidate claims extracted (`docs/claims-register/`); several unsupported claims already removed in Phase 2 |
| 5 | Functional upgrades | Not started (scope added 13 Oct) | Adds 5.1 Platform playbook: platform-specific technical actions (on-premises, AWS, Azure, GCP) for every finding, piloted on Posture IQ and Resilience IQ |
| 6 | UI/UX & design system | Not started (partial) | Standard error states added to every accelerator in Phase 2 |
| 7 | Validation & pilot | Not started | — |
| 8 | Operate & scale | Partly in place | CI on every PR, API access logs, rate limits; monitoring and versioning to come |

**Open owner actions (Phase 1):**
- GitHub branch protection on `main`.
- Cognito `Admin` group, then `LTM_SUPER_ADMIN_EMAILS=none`.
- Move users from the sandbox-owned user pool (`ap-south-1_91amN2bz4`) to the production pool. The sandbox stack can be deleted only after that. **In progress (23 Oct 2026):** the portal, APIs and reports service now use the backend's own pool (administrator-created accounts only, deletion protection on, allowlist `ltm.com`, `ey.com` and the owner's personal address); the existing accounts are recreated there after deployment. The sandbox pool stays untouched until everyone has signed in to the new one.

## Decisions taken (product owner, 6 Oct 2026)

| Decision | Applied |
|---|---|
| The Phase 2 golden outputs are the **approved baseline**. Subject-matter review happens in Phase 3 (scoring) and Phase 4 (sources); any change goes through the golden-file diff | Yes |
| Posture IQ assesses **critical ICT third-party providers (CTPPs)**. A new entity type in question A2 applies DORA Art. 35 periodic penalties (1% of average daily worldwide turnover, up to six months) and the Art. 31–35 oversight finding. The SaaS demo is now a CTPP | Yes |
| The "Advisory Hedge Ratio" is reworded as an **illustrative comparison** ("an indicative engagement is about X% of the largest single statutory ceiling; not a measure of risk reduction"). Labels that called the largest single fine an "aggregate" now say "largest single statutory ceiling (not a sum)" | Yes |

---

## Phase 3: Scoring model audit & recalibration (new)

**Objective:** prove that each engine's scoring system behaves sensibly and says what it means; fix the engines and reports where it doesn't.

Phase 2 proved the engines are *consistent*: one engine, no crashes, no NaN, bugs fixed. Phase 3 asks whether they are *right*. Do the scores separate a weak client from a strong one? Does each question carry sensible weight? Does every headline number mean what its label says?

### 3.1 Automated audit (per engine, run in CI)

| Check | What it detects | Example from Phase 2 |
|---|---|---|
| **Scale & range** | Outputs outside their declared scale; one concept shown on different scales | An unanswered slider scored 65 on a 1–5 scale (Strategy IQ) |
| **Monotonicity** | A better answer that makes the result look worse | The worst answer outscored the second-worst (FinOps Value Case) |
| **Sensitivity** | Headline metrics that swing too much on one answer, and "dead" questions that change nothing | Tech-debt drag moves 8.5 points per 1.0 of section score |
| **Discrimination & saturation** | Bands that can never be reached, or almost everyone landing in one band | — |
| **Missing data** | Unanswered and "don't know" treated inconsistently, or silently flattering the result | A fixed 3.2 for ranking questions pulled extremes to the middle |
| **Weights** | Weights that don't add up, double counting, a pillar dominated by one question | — |
| **Formula sanity** | Heuristic formulas without bounds or labels | Leakage split 40/28/18/14; value at stake 25–35% of spend |
| **Label truth** | A label that describes something other than what is computed | "Aggregate exposure" that was really the largest single fine; "velocity multiple" that was a maturity score |

### 3.2 Expert review (per engine)
- **Archetype plausibility:** for each demo client, does the result match what an experienced consultant would conclude? Practice leads review the golden outputs and the sensitivity report.
- **Rubric review:** scoring tables, thresholds and weights.
- **Back-testing:** run 5–10 past LTM engagements (anonymized) through each engine and compare with what was actually concluded.

### 3.3 Report audit
- Every number on every output traces to an engine field: screen, PDF, deck, SOW, emails and AI briefing.
- Ranges and confidence wherever an input is estimated.
- No section shows a number the engine did not compute.

### 3.4 Known items already queued for the audit

| Accelerator | Item |
|---|---|
| FinOps Value Case | Defaults for unanswered questions (30/100, neutral 50); "don't know" on C2 and P1 uses defaults while elsewhere it scores 0 |
| Strategy IQ | Whether to score S6.1 (what drives funding); basis and sensitivity of the tech-debt drag formula; alignment and resilience = section score ÷ 5 |
| Cloud IQ | Leakage model (waste rate × spend × (1 − 0.45 × commitment coverage)) and its fixed split; unsourced roadmap impact lines ("5x", "+40%", "2.5–3.5x") |
| FinOps IQ | Domains with no answers shown as 0; value-at-stake percentages by stage |
| Posture IQ | Severity-to-score mapping (100/75/50/25/0), multi-select and matrix heuristics, pillar weights; inline per-question findings cannot show (the public bank has no findings) |
| Sovereign IQ | Peer percentile withheld until there is a sourced benchmark; pillar weighting; regime applicability rules |

### Deliverables
- An **engine audit report** per accelerator: findings ranked Critical / High / Medium, each with evidence.
- Fixes to engines and reports, each with a regression test. Golden-file diffs reviewed by the practice lead.
- The audit checks (3.1) added to CI, so a future question-bank or weight change cannot reintroduce the problems.

**Gate 3:**
- No Critical or High audit findings open.
- Every band reachable; no headline metric moves more than an agreed limit on a single answer, unless the lead signs it off.
- Every report label matches its computation.
- Practice-lead sign-off on each engine's golden outputs.

---

## Phase 4: Fact-check, methodology & accuracy

**Objective:** every number a CIO sees can be explained and defended.

### 4.1 Claims Register (single source of truth)
A versioned file (`knowledge/claims-register.json` plus a reviewed spreadsheet view) with one row per claim:

| Field | Example |
|---|---|
| `id` | `POSTURE.AIACT.CAP.ART10` |
| Claim / constant | "AI Act Art. 10 breaches: up to €15M or 3% of global turnover" |
| Used in | `posture-iq/evaluate.ts`, Posture report §4 |
| Type | Regulation / benchmark / heuristic / assumption |
| Source | Regulation (EU) 2024/1689 Art. 99(4), with URL |
| Owner / reviewer | Legal SME / Sovereignty practice lead |
| Last reviewed / next review | 2026-10-20 / 2027-04-20 |
| Confidence | High / Medium / Low |

Engines reference claims by `id`, so nothing is hard-coded without a source. CI fails if a claim passes its review date.

### 4.2 Reviews by domain

| Domain | Reviewer | Scope |
|---|---|---|
| Regulatory (Posture, Sovereign) | Legal / regulatory SME (EU, UK, GCC, APAC) | Regime applicability rules, penalty caps, citations, effective dates (DORA, NIS2, AI Act phasing, KSA PDPL, SAMA, MAS TRM, APRA CPS 230, India DPDP rules) |
| FinOps (Value Case, FinOps IQ, Cost IQ) | FinOps practice lead (FinOps Foundation framework alignment) | Waste and savings percentages, maturity stage definitions, unit-economics guidance |
| Cloud & strategy (Cloud IQ, Strategy IQ) | Cloud and strategy practice leads | D1–D8 rubrics, TIME model, tech-debt and velocity formulas |
| Benchmarks (all) | Practice analytics | Replace hard-coded "peer medians" with real anonymized LTM engagement data (state n= and date), or label them clearly as "LTM practice heuristic" |

### 4.3 Model accuracy and calibration
- **Sensitivity analysis:** for each headline metric, show how far it moves per input. Flag over-sensitive formulas, for example tech-debt drag jumping 8.5% per 1.0 score.
- **Back-testing:** run 5–10 past LTM engagements, anonymized, through each engine. Compare against what consultants actually concluded, and tune the weights.
- **Ranges, not points:** every monetary output becomes low–high with a stated confidence.
- **Re-define or rename indices that sound like measurements.** Done for Strategy IQ in Phase 2 ("Operating Velocity Multiple 1.7x" is now operating-model maturity out of 5); the Phase 3 audit lists the rest.

### 4.4 Language and claims policy
- Banned unless justified: "evidence-based", "statistically reliable", "production-grade", "regulator-aware", "eliminate 100%", "flawless".
- Required on every report: **Methodology & assumptions** panel (sources, formula summary, confidence), **data provided by** (respondent and date), and for Posture and Sovereign a **"Not legal advice"** disclaimer.
- AI-generated text must be labelled, and may only reference numbers that came from the engine (enforced in Phase 5).

**Gate 4:**
- 100% of numeric constants and claims are in the register with a source and reviewer.
- Legal sign-off on Posture and Sovereign regime logic.
- Practice sign-off on FinOps, Cloud and Strategy formulas.
- Back-test report published internally.
- Language policy is lint-checked (banned-phrase scan in CI).

---

---

## Phase 5: Functional upgrades

**Objective:** make the tools genuinely useful in a CIO engagement, beyond the questionnaire.

1. **Consultant mode vs client mode**
   - *Consultant mode:* probes, scoring internals, notes, and skipping the email gate.
   - *Client mode:* clean, masked and branded. Replaces today's mix of BYOK buttons and lead-gen gates.
2. **Engagement workspace:** one client engagement can run several accelerators. A combined **executive summary** pulls the top findings across Strategy, Cloud, FinOps and Sovereignty into one CIO narrative.
3. **Server-side AI (replace browser BYOK)**
   - One backend AI service, either Amazon Bedrock (in-region, ap-south-1 or the EU) or an enterprise OpenAI deployment under an LTM-owned key and DPA.
   - Current, supported models, set by config rather than hard-coded. Remove the Gemini 1.5, GPT-4o and Claude 3.5 options.
   - PII and client-name redaction before the prompt, audit log of prompts and outputs, per-user rate limits.
   - **Grounding guardrail:** the LLM receives engine outputs only. A post-check rejects any number in the AI text that isn't in the engine output.
   - **LLM eval suite:** a fixed set of archetype prompts, scored for grounding, tone, hallucinated facts and length. It runs in CI when the prompts or model change.
4. **Evidence capture:** attach client evidence (documents, notes) per question. Confidence rises when answers are backed by evidence and is shown in the report.
5. **Exports:**
   - Branded PDF that renders server-side (consistent fidelity), PPTX board deck export, SOW in DOCX.
   - Every export carries the methodology panel and version stamp (engine version plus claims-register version).
6. **Question Bank Studio:** versioned question banks with draft → review → publish states and an audit trail. Publishing needs Practice Lead approval and re-runs the golden tests.
7. **Re-assessment and trends:** compare a client's current assessment against a previous one (progress tracking). This is a strong reason for repeat engagements.
8. **Platform playbook and technical action plan:** every finding comes with the actions to take on each platform the client runs. See 5.1.

### 5.1 Platform playbook (added 13 Oct 2026)

**Objective:** LTM is a technology company, so a report should end with concrete technical actions on the client's own platforms, not only findings. The actions must be accurate, vendor-neutral and traceable to the finding that justifies them.

**Approach: one shared layer, not a new questionnaire.** The diagnostic accelerators stay executive-length. A shared catalogue turns their findings into platform actions. A separate technical-discovery accelerator is considered later (Layer 3), only if engagements need application-level plans.

| Layer | Where it lives | What it does |
|---|---|---|
| **1. Diagnosis** | Each accelerator, same length as today | Findings carry a stable control ID. One question records the platforms in scope: on-premises, AWS, Azure, GCP, SaaS. Resilience IQ already asks this (EX-18) |
| **2. Platform playbook** | One versioned catalogue in `packages/engine-core`, read by every engine | Maps control × platform × level to actions. The engine selects the entries for the client's findings and platforms. The report shows them as a "Technical action plan", and they export as a backlog |
| **3. Technical discovery** (later, separate) | A consultant-only accelerator | Reads real estate data (AWS Config, Azure Resource Graph, GCP Cloud Asset Inventory, CMDB or IaC exports) to produce application-level execution and wave plans. Built only when engagements ask for it |

**Levels:**
- **Platform / cloud:** landing zone, organisation policies, identity, network, region controls.
- **Tech stack:** databases, middleware, backup, observability, CI/CD, infrastructure as code.
- **Application:** per-workload changes. From questionnaire answers the playbook can only give patterns at this level; specific application plans need Layer 3 data, and the report says so.

**Catalogue entry (one per control × platform × level):**

| Field | Example |
|---|---|
| `control` | `POSTURE.RESIDENCY.NON_EU_PERSONAL_DATA` |
| `platform` | `aws` / `azure` / `gcp` / `on_prem` / `any` |
| `level` | `platform` / `stack` / `application` |
| Action | "Restrict personal-data workloads to EU regions and block other regions by policy" |
| Approach first, then options | Region guardrail policy. AWS: Organizations SCP region restriction. Azure: Policy "allowed locations" and the EU Data Boundary. GCP: resource-locations organisation policy and Assured Workloads |
| Effort, owner role | M · cloud platform team |
| Verification | Policy compliance report shows zero non-EU resources holding personal data |
| Source, owner, last reviewed, next review | Provider documentation URL · cloud practice SME · 2026-10-20 / 2027-01-20 |
| Confidence | High / Medium / Low; "confirm regional availability" where needed |

**Rules:**
- **Traceable:** every action names the finding and control it comes from. An action without a finding is not shown.
- **Vendor-neutral:** the approach first, then the native option for each provider in scope, plus on-premises and third-party options where relevant. Every platform the client selected gets its options (the rule applied in Resilience IQ R5).
- **Reviewed like a claim:** every entry has a source, an owner and a review date, and is held in the claims register (Phase 4). CI fails when an entry passes its review date.
- **Indicative:** the report says that options must be validated per engagement against current availability, pricing and licensing.
- **Engine-produced:** AI text may summarise the plan but may not add actions or services that are not in the catalogue (the Phase 5 grounding guardrail).

**Pilot: Posture IQ and Resilience IQ.** Both produce findings that map directly to platforms. Resilience IQ's `implementation-mappings.json` becomes the first part of the shared catalogue, and Resilience IQ reads it from there (see `docs/resilience-iq/ROADMAP.md`, R10). Posture IQ adds residency, transfer, encryption, supplier and concentration controls (sections C–H), plus the platform-in-scope question. The other accelerators follow once the pilot passes its gate: Cloud IQ, Modernization IQ and Sovereign IQ first, because their findings are the most technical.

**Steps:**
1. Agree the catalogue schema and the control-ID scheme with the cloud and security practice leads.
2. Move Resilience IQ's mappings into the catalogue with no change to its output (golden outputs unchanged).
3. Write the Posture IQ entries for AWS, Azure, GCP and on-premises; SME review of each entry.
4. Engine: select entries by finding and platform; report section "Technical action plan"; CSV backlog export (Jira later).
5. Pilot with two consultant-led engagements; collect which actions consultants kept, changed or removed.
6. Extend to the other accelerators.

**Gate 5.1:**
- Every pilot finding that has a technical remedy has catalogue entries for each platform in scope, or an explicit "no platform action" note.
- 100% of entries have a source, an owner and a review date, and pass SME review.
- Golden outputs for both pilot accelerators include the action plan, and the practice leads sign off on them.
- A test confirms that no report shows an action without a finding, or misses a platform the client selected.

**Gate 5:**
- Each feature has E2E coverage.
- The AI grounding check passes on 100% of the eval set.
- No client data reaches the browser-side AI (CSP `connect-src` excludes LLM vendors).
- PDF and PPTX exports pass visual review for all 7 tools.
- Gate 5.1 (platform playbook) passed for the pilot accelerators.

---

---

## Phase 6: UI/UX & design system

**Objective:** a consistent, accessible, responsive experience across all tools.

1. **Shared design system:** extract tokens (LTM colours, type, spacing) and components (question card, option, stepper, KPI tile, chart, heatmap, findings table, method panel, modals) into one package. Today each 120–540 KB HTML file restyles everything independently.
2. **Architecture:** move from single-file HTML to a small build (for example Vite with shared modules). Inline scripts become modules, which enables a strict CSP without `'unsafe-inline'`, plus caching and code splitting.
3. **Responsive:** fix horizontal overflow (portal 667px, Sovereign 760px, FinOps IQ 589px, Studio 915px, sample reports) and target 360–1440px. Reports must read well on a phone, since CIOs open shared links there.
4. **Accessibility (WCAG 2.2 AA):** keyboard navigation for all option selection, focus states, contrast, ARIA for custom controls, and charts with table alternatives. Automated `axe` checks in CI.
5. **Information design for executives:**
   - Every report opens with one page: "What we found / What it costs / What to do next", in that order.
   - Consistent scales: pick one (0–100 *or* 1–5) per concept, consistently across tools.
   - Ranges with confidence markers, plus "how this was calculated" tooltips linking to the methodology panel.
   - Fewer, larger KPIs. Remove decorative animation that delays numbers (KPI counters, cinematic loaders over 1s).
6. **Consistency:** shared header and navigation, one naming style ("Strategy IQ", not a mix of IQ and IQ™), consistent CTA wording, one portal look across tools.
7. **Usability testing:** 5 consultants plus 2–3 friendly client executives run tasks ("complete an assessment and explain the top finding to me"). Fix the top issues.
8. **Performance:** Lighthouse ≥ 90 for Performance and Accessibility, with self-hosted fonts and libraries (no runtime CDN dependency for Chart.js or jsPDF).

**Gate 6:**
- `axe` shows 0 serious or critical issues.
- No horizontal scroll at 360px on any page.
- Lighthouse ≥ 90.
- Usability-test findings above "minor" are fixed.
- The design-system components are used by all 7 tools.

---

---

## Phase 7: Validation & pilot

**Objective:** independent proof that the tools are secure, accurate and land well with CIOs.

| Activity | Detail |
|---|---|
| **Security** | External pen test (OWASP ASVS L2) on the portal, APIs, auth and reports. Run a ZAP baseline in CI. Threat model documented. Data retention and deletion policy defined. Confirm DPA and data residency for AI and S3. |
| **UAT** | A UAT matrix per accelerator (extend the existing `cost-iq/v9_1/uat/UAT_MATRIX.md` pattern to all 7), executed by practice consultants and signed off. |
| **Accuracy sign-off** | Final SME and legal review of rendered reports (not just code) for each archetype. |
| **CIO dry-runs** | 2–3 internal senior partners play the CIO, plus "hostile" questioning: *Where is this number from? Why is my peer median 3.2? Is this legal advice?* Every question must have an answer in the tool. |
| **Pilot** | 2–3 friendly clients, consultant-led. Collect structured feedback (extend `PILOT_FEEDBACK_TEMPLATE.md`): accuracy, usefulness, "would you share this with your board?" |
| **Go/no-go** | Per accelerator, using the readiness criteria below. |

**Readiness criteria per accelerator (all must be true to present to CIOs):**
- [ ] Pen test: no high or critical findings open
- [ ] All tests green: golden, invariant, contract, E2E, visual, a11y
- [ ] 100% of claims sourced and in review date; SME and legal sign-off
- [ ] Methodology panel and disclaimers present on every output
- [ ] UAT signed off; pilot feedback average ≥ 4/5 on accuracy and usefulness
- [ ] Works on mobile; Lighthouse ≥ 90

**Suggested release order:** FinOps Value Case → Cloud IQ → Strategy IQ → FinOps IQ → Cost IQ → Posture IQ → Sovereign IQ. The regulatory tools go last because they need the deepest legal review.

---

---

## Phase 8: Operate & scale (ongoing)

- **Observability:** CloudWatch dashboards and alarms (errors, latency, 4xx/5xx spikes, auth failures), structured logs with request IDs, and AI cost tracking.
- **Versioning:** semantic versions for engines, question banks and the claims register, stamped on every report so a past report can be reproduced exactly.
- **Regulatory watch:** a quarterly review cycle for the claims register, with automatic CI failure when review dates lapse. Owners are assigned for new regulations (for example AI Act phase-ins and DORA RTS updates).
- **Feedback loop:** in-tool feedback, a usage analytics dashboard (completion rates, drop-off questions, time per section) and a quarterly roadmap review.
- **Benchmark growth:** each completed engagement (anonymized, with consent) feeds the benchmark dataset, so "peer median" becomes real data over time.
- **Next accelerators:** bring Modernization IQ and AI Readiness IQ through the same Phase 1–7 pipeline before linking them in the portal.

---
