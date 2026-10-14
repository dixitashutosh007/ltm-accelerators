# FinOps IQ: plan

**Date:** 14 Oct 2026  **Author:** `finops-cost-lead` (advises; the product owner approves).

**Starting point:** the [validation report](VALIDATION.md):
- FinOps IQ scores 0 Pass / 3 Partial / 10 Fail on the 13-area scorecard (area 13, report defensibility, added 14 Oct 2026);
- of 53 claims checked, 18 are incorrect, 3 outdated and 27 unsourced;
- 20 of 23 report assumptions have no stated ground;
- CIO challenge: 0 of 10 questions answered.

**Goal:** one FinOps accelerator that passes all 13 areas. The recommended shape (D1, option C) is FinOps IQ with FinOps Value Case as its executive mode, on the FinOps Foundation's per-capability model. Cost IQ routes cloud and FinOps findings to it. If the owner chooses option A or B instead, phases F1 and F3 change shape; F0, F2 and F4–F12 still apply.

**Naming:** phases are **F0–F12**. To avoid a clash, the shared workstreams from [FRAMEWORK.md](../FRAMEWORK.md) are written **WS-S1 to WS-S8**, as in the Sovereign IQ plan:
- WS-S1 Bedrock AI
- WS-S2 claims register and market data
- WS-S3 platform playbook
- WS-S4 outputs
- WS-S5 How LTM can help
- WS-S6 client-data protection
- WS-S7 modes
- WS-S8 practice-lead agents

**How each phase lands:** a PR with full CI, golden-file diffs and this agent's review of the diff. Value-model changes also show the inflation-guard report. Nothing with a dollar figure goes to a client before F4's gate.

## Summary

| # | Phase | Depends on | Exit gate |
|---|---|---|---|
| F0 | Containment | — | No browser AI; public sample and false statements withdrawn; no "recoverable", "guaranteed" or FinOps Foundation misattribution; no dollar headline from the stage band; legacy route off |
| F1 | Consolidation and model design | F0; owner decisions D1–D6 | Owner approves the design pack: decision and buyer, capability model, scope model, question map (FinOps IQ + FinOps Value Case → merged), value-model specification, reference scenarios |
| F2 | Content and claims register | F1; WS-S2 | Every question, threshold, range and provider statement has a claim ID with source or "LTM heuristic + reasoning"; language lint in CI |
| F3 | Engine build (FinOps IQ v3) | F1, F2 | One engine and contract for both modes; capability profile; findings with capability and lever IDs, owner role and time frame; FinOps Value Case route aliased |
| F4 | Value model, trace and inflation guard | F3; WS-S2 | Lever-based conservative / expected / upper ranges, net and phased; trace, reconciliation and inflation-guard tests pass in CI |
| F5 | Scoring audit and recalibration | F3, F4 | Audit invariants in CI; reference scenarios agree with the profiles written in advance; golden outputs approved |
| F6 | One page: executive, workshop and client modes | F3; WS-S7 | Every question renders and can be answered in both modes; server save and resume; client mode hides internals |
| F7 | Outputs: executive PDF, "How we calculated this" appendix, backlog | F4; WS-S4 | Server-rendered PDF with methodology, sources and assumption register; backlog CSV; every number traces |
| F8 | Platform playbook entries | F3; WS-S3 | Every lever and capability gap has entries for each platform the client selected, each with a verification step |
| F9 | How LTM can help and SOW | F8; WS-S5 | Every finding maps to a typed offering with indicative scope and an execution outline; consultant-only SOW |
| F10 | AI on Bedrock with toggle | F7; WS-S1 | Off by default; grounding check passes 100% of the eval set; prompts and outputs logged |
| F11 | Client-data protection and counsel review | F6–F10; WS-S6 | Hosting notice, transfer basis, retention live; counsel review of the notice, framework attribution and trademark wording |
| F12 | Re-score against all 13 areas | F0–F11 | Validation report re-issued with all 13 Pass, or Partials accepted in writing |

F0 starts now and does not wait for any decision. F2 research can run beside F1. F6, F8 and F9 can run in parallel once F3's contract is fixed. F4 is the critical path for area 13.

---

## F0: Containment

**Objective:** stop the current page, sample and playbook from saying wrong things, promising savings or sending client data out, before any redesign. Small, safe PRs.

| # | Item | Detail |
|---|---|---|
| 1 | Remove browser AI | Delete the BYOK modal, provider and model selectors, `localStorage` key storage, `executeAICall`, "Synthesize with AI", "Interpret with AI" and "Accept Recommendation", and AI text in the PDF (`finops-iq.html:1592, 1694-1703, 3556-3799, 4314, 4877-4882`). Clear any stored key on load. Extend the `check:repo` vendor-host check to this page. The CSP hosts go when WS-S1 replaces browser AI on every page |
| 2 | Take down the public sample report | Replace `finops-iq-sample-report.html` with a notice (as done for Sovereign IQ). Rows 11, 12, 43–46 of the claims table |
| 3 | Withdraw the playbook | Mark `FINOPS_IQ_CONSULTANT_PLAYBOOK.md` superseded. It contains the false data-handling script (row 39), fees, a "teaser to paid SOW" script and features that do not exist |
| 4 | Fix the headline label and its fallback | • Rename to "Indicative waste range (client estimate), not a savings commitment".<br>• When T6 is not answered, show "Not quantified", not the 25–35% stage band.<br>• Remove "recoverable", "annual cloud bill recovery" and "recoverable cost leakages" from screen, PDF and mailto.<br>The engine change is a golden diff: `unanswered` and any case without T6 lose their dollar range |
| 5 | Remove FinOps Foundation misattribution | Rename "FinOps Foundation Domain Performance" to "Practice areas (LTM)". Remove "5 FinOps Foundation domains". Add "Adapted in part from the FinOps Framework by the FinOps Foundation (CC BY 4.0)". Remove the trademark sentence and "™" pending D10 |
| 6 | Remove claims for features that do not exist | "Passkey Unlock", "tailored consulting SOW … unit-economics model … synthesized", the splash "FOCUS 1.0 SCHEMA ENGINE" and "VALUE-AT-STAKE ENGINE" lines, "empirical industry benchmarks" (archetypes become "demo profiles") |
| 7 | Remove the billing-CSV "verification" | Delete `handleEmpiricalCSV` and `applyEmpiricalData` (H8, D13) |
| 8 | Strip savings figures from remediations | KB remediation and probe text: remove "20-35%", "up to 70%", "65%", "world-class <4%", "Elite … 75–85%" and similar (rows 19, 21–23, 31). Keep the action |
| 9 | Disclaimer and banner | Show the KB disclaimer on screen and on every PDF page. Banner: "Internal consultant use only, content under review" |
| 10 | Sales and personal data out of client views | Remove the frosted-glass CTA wall, the named partner and email (CTA, mailto, placeholder) and "Advisory Partner Unlock". Keep a neutral "Discuss with LTM" link to the engagement lead from the session |
| 11 | Security hygiene | Escape all user text inserted into HTML (org name, imported session JSON). Switch off the unauthenticated legacy route for FinOps IQ and FinOps Value Case (D11) |
| 12 | PDF defects | Remove the 18-row cap or state "first 18 of N"; fix the "≥" glyph (font or ASCII) |

**Dependencies:** none. AI removal does not wait for WS-S1: AI is simply unavailable until F10.

**Status (14 Oct 2026): done (merged in PR #43; banner confirmed).** Items 1–12 done. Notes:
- Item 4: the engine's value-at-stake `basis` is now `client-estimate` or `not-quantified`; without T6 every amount is `null` and the page shows "Not quantified". The golden diff is the `unanswered` case only (the archetypes all answer T6).
- Item 10: client view no longer blurs the roadmap or audit trail; it hides consultant probes instead. "Discuss with LTM" names the engagement lead entered in the session; nothing is sent from the page.
- Item 11: the legacy routes are removed outright, and `check:backend` fails if either FinOps route reappears on the unauthenticated API.
- Item 12: no row cap; `≥`, `±` and dashes are converted to ASCII in PDF text.
- Gate: unit tests (`finops-iq.test.ts`, "containment") and browser tests (`finops-iq.spec.ts`) cover every gate item. The owner confirmed the banner text on 14 Oct 2026, so the F0 gate is closed. Banner text: "Internal consultant use only: content under review. Indicative figures from self-reported inputs, not a savings commitment."

**Gate F0:**
- a test asserts no LLM vendor host, "BYOK", "recoverable", "guaranteed", "FinOps Foundation Domain" or "Passkey" string in the page or sample;
- a test asserts value at stake is "not quantified" when T6 is blank;
- golden diff limited to the value-at-stake fallback and text fields;
- the owner confirms the banner.

---

## F1: Consolidation and model design

**Objective:** decide the shape before building it.

### Decision, buyer, edge (if D1 = C)

- **Decision:** what FinOps operating model and optimisation programme to fund for cloud, AI and SaaS spend, in what order, and what value it can credibly return. The executive mode answers "do we need to act now?".
- **Buyer:** CIO, with CFO as co-owner; Head of Cloud/CCoE and FinOps lead own delivery.
- **Edge:** validation report section 6.3. It uses the Foundation's own model, is scope-aware and gives a sourced lever range. Provider-tool recommendations count as evidence. The output is a platform-specific programme.
- **Boundary with Cost IQ:** Cost IQ covers the whole estate. Its R-003 "Run a Cloud Economics Diagnostic" and FIN-01–12 findings hand off to FinOps IQ. Both use one capability model (Cost IQ overlay v7.1.0: 4 domains, 22 capabilities, Crawl/Walk/Run, technology categories) and one lever and value library.

### Model

| Element | Design |
|---|---|
| **Capability model** (D2) | FinOps Framework 2026 domains and capabilities, rated Crawl / Walk / Run / Not yet / Unknown per capability **in scope**, with the Foundation's guidance that the target level depends on the client's complexity. Target level per capability set from scope and spend (LTM heuristic, labelled). No org-level stage; an optional "LTM summary" is derived from the profile and never caps it |
| **Scope model** (D6) | Footprint facts: providers (AWS, Azure, GCP, OCI, others), private cloud/data centre, Kubernetes, AI/GPU, SaaS, licensing; spend by scope (bands allowed). Scopes switch capability questions on |
| **Findings** | Gap = target level − current level per capability. Each finding: capability ID, scope, severity, business consequence, decision or action, owner role (FinOps lead, Head of Cloud, CFO/FP&A, engineering leads, procurement), time frame, lever link, playbook entries, offering |
| **Value model** (D3) | Specified in F4. Levers, addressable base, published range, interaction order, cost, ramp, confidence. T6 is a hypothesis only (D4) |
| **Modes** (WS-S7) | **Executive** (15–20 min, from FinOps Value Case): estate, spend by scope, growth, ownership, visibility, predictability, controls, value, about 16–18 questions, giving the need verdict, an indicative range and top gaps. **Workshop** (60–90 min): capability questions per scope plus follow-ups triggered by answers (Kubernetes allocation if Kubernetes; GPU idle and token attribution if AI; commitment portfolio if coverage is unknown or low; licensing if SaaS/licensing in scope) |

### Question map (FinOps IQ + FinOps Value Case → merged)

| Capability (Framework 2026) | FinOps IQ | FinOps Value Case | Merged |
|---|---|---|---|
| Data Ingestion | C2, I3 | — | Keep C2; I3 rewritten for FOCUS (current version) |
| Allocation | I1, I2 | V1, V2 | One question set; coverage as % of spend, with Unknown |
| Reporting & Analytics | I4, I5, C4 | V5, O3 | Merge |
| Anomaly Management | I6, C3 | V3, P2 | Merge |
| Forecasting, Budgeting | A8 | P1, P3 | Merge; variance bands labelled LTM heuristic |
| Unit Economics | T2, T4, T8 | V4, L1 | Merge |
| Usage Optimization | O2, I7, A2, A3, A5, O4, A7, O7 | C1, C3, C5 | Workshop; per platform |
| Rate Optimization | O1, O6 | C2 | Merge; coverage of **eligible** spend, utilisation, expiry ladder |
| Licensing & SaaS | — | — | New, scope-triggered |
| Architecting & Workload Placement | O5 | — | Keep |
| Governance, Policy & Risk | A1, C6, C8 | C1 | Keep A1, C6; C8 moves to Cloud IQ or security |
| FinOps Practice Operations, Education | C1/C5 (merged), C7, O8, O9 | O1, O2, P4 | Merge; drop the C1/C5 duplicate |
| Executive Strategy Alignment | A6, T5, T7 | O4, L2, L3 | Merge |
| Invoicing & Chargeback | T1, T3 | — | Keep |
| AI (scope) | A4 | — | Rewrite (split "no AI" from "unmanaged") |
| Hypothesis (not scored) | T6 | C4, L4 | Client's estimate of waste, concerns and outcomes |

Every maturity question gets "Unknown", scored as risk (D5). Every question carries its basis by claim ID.

**Items:**
- design pack;
- JSON Schemas (facts, capabilities, questions, levers, findings);
- five reference scenarios (D12) with expected profiles and value ranges written **before** running.

**Dependencies:** F0; owner decisions D1–D6; WS-S8 (this agent) for review; the Cost IQ owner confirms the shared capability and lever library.

**Gate F1:** owner approves the design pack in writing.

**Status (14 Oct 2026): approved.** The owner accepted every recommended default (Q1–Q14) and the flagged departures: T5 maps to KPIs & Benchmarking; Spot sits under Rate Optimization pending F2 confirmation; FIQ.C8 moves to Cloud IQ; ongoing cost is 20% of one-off effort per year (LTM heuristic); the FinOps team cost is shown beside the value, not netted; the 29% cap also applies to the upper case. [design/DESIGN.md](design/DESIGN.md), five JSON Schemas and five reference scenarios with expected outputs. Open questions Q1–Q14 are in DESIGN section 13, each with a recommended default. Sources that the agent could reach only through search results are labelled P or S, and listed in section 14 for F2.

---

## F2: Content and claims register

**Objective:** every statement a client can see has a source or a labelled heuristic.

| # | Item | Detail |
|---|---|---|
| 1 | Framework content | Domain and capability names and descriptions from the FinOps Framework 2026, attributed under CC BY 4.0 with changes stated; maturity guidance quoted with URL |
| 2 | Published market data (WS-S2) | Held with source, year and sample:<br>• Flexera State of the Cloud 2026 (n=753; 29% estimated waste; 27% in 2025);<br>• State of FinOps 2026 (n=1,192; scope shares, priorities);<br>• provider discount maxima (AWS SP/RI 72% and Compute SP 66%, Spot 90%; Azure reservations 72%; GCP CUD 55%/70%) with date checked.<br>Never shown as LTM peer benchmarks |
| 3 | Thresholds | Tagging, coverage, utilisation, forecast variance, anomaly latency, waste: each either sourced or "LTM heuristic: reasoning". Resolve the 70/75 and 80/85 inconsistencies |
| 4 | Provider statements | Every tool and service named in a remediation (CUR 2.0 and FOCUS exports, Cost Anomaly Detection, Azure cost alerts, GCP Recommender, Kubecost/OpenCost, Karpenter) checked against provider documentation with a date |
| 5 | Register | All of the above in the WS-S2 register with owner and review date. 90-day review for volatile items (D14). CI fails on an overdue review |
| 6 | Language lint | Banned in client-visible text: "guaranteed", "recoverable", "world-class", "elite", "Big 4", "McKinsey", "Deloitte", "passkey", "empirical benchmark", "FinOps Foundation audit/checkpoint", "™" (unless D10 confirms) |

**Dependencies:** F1 schema; WS-S2.

**Gate F2:** 100% of client-visible statements carry a claim ID. No row of the validation claims table remains Incorrect, Outdated or Unsourced: each is corrected, sourced, labelled as a heuristic or removed.

**F2 status (14 Oct 2026): built, awaiting owner review.** Not committed.
- **Registry** in `packages/engine-core/src/accelerators/finops-iq/registry/`: `capabilities.json` (4 domains, 22 capabilities, LTM descriptions, Not yet / Crawl / Walk / Run guidance, scope triggers, tiers, CC BY 4.0 attribution with changes), `levers.json` (LEV-01 to LEV-10), `thresholds.json` (17), `market-data.json`, `provider-statements.json` (32 tools and services, each with alternatives). Capabilities and levers validate against the F1 schemas; every client-visible item carries a claim ID and none cites a consultant-only claim.
- **Register:** 125 new `CLM-FIN` claims. 61 checked against external sources: V 61, S 18, P 8. 36 are LTM heuristics or design rules, sourced to the approved design pack. UNSOURCED 2, both consultant-only. 29 are volatile (90-day review). Verification is through search results only: finops.org, provider sites and flexera.com are blocked from this environment, and no workaround was tried.
- **Language lint:** the five files are in `scripts/check-claims.cjs`. BANNED now also covers the item 6 list plus "savings at stake" and "waste recovery". Sovereign's registry contains none of the new phrases, so one global list is enough. Pages join the lint in F6/F7.
- **Thresholds:** the Foundation's maturity page publishes sample goals per stage, and DESIGN 3.5 provided that these replace LTM's ladders.
  - Allocation becomes >90 / 85 / 70% (it was 40/70/90).
  - Forecast variance becomes <5 / <10 / <20% (it was 5/15/30).
  - Both are status S: the table itself could not be read.
  - The 80/85 and 70/75 inconsistencies came from mixing the earlier and current Foundation goals. Allocation now has one ladder. Coverage stays a value input, not a maturity rating.
  - Anomaly latency remains an LTM heuristic, cross-checked against the Foundation's descriptions.
- **Validation table (rows 1–53):**
  - Corrected and sourced: 2–8, 10, 21, 22, 53.
  - Labelled heuristic: 20, 24, 25, 27, 28, 31.
  - Removed (listed in `market-data.json` `notUsed`, or withdrawn by F0/D8/D10/D13): 9, 11–19, 23, 26, 29, 30, 32–37, 39–52.
  - Correct: 1, 38 (not used), 49.
- **Still UNSOURCED (consultant-only):** OCI, IBM and Alibaba commitment maxima (CLM-FIN-069); storage tier price ratios (CLM-FIN-070). OCI preemptible 50% (P, provider blog only) and private-cloud share 57% (S) are also consultant-only.
- **Departures from F1 for the owner:**
  1. Optional fields added to `capability.schema.json` (description, maturity guidance, claim IDs, maturity scale) and `lever.schema.json` (claim IDs).
  2. UN-04 and QV-01 bands changed as above. The reference scenarios record levels, so their outputs are unchanged.
  3. Azure (90%) and Google Cloud (91%) Spot maxima are now verified, so LEV-06 is quantifiable for them (Q8). RS2 and RS4 gain an Azure LEV-06 value when F3 builds golden outputs. For RS1 and RS5 (executive mode) only the not-quantified reason changes.
  4. Display name "FinOps Tools & Services" (Q2), status P.
  5. Waves set for four capabilities that DESIGN 5.4 left open: Planning & Estimating, Architecting & Workload Placement and Tools & Services in wave 2; FinOps Assessment in wave 3.

---

## F3: Engine build (FinOps IQ v3)

**Objective:** one engine and one request contract for both modes.

| # | Item | Detail |
|---|---|---|
| 1 | Package | `packages/engine-core/src/accelerators/finops-iq/` v3. FinOps Value Case engine retired after F12. Its route returns the merged executive result for one release, then is removed |
| 2 | Capability profile | Crawl/Walk/Run/Not yet/Unknown per capability in scope; target level; gap |
| 3 | Findings | From gaps only; owner role and time frame per finding; waves by dependency (e.g. Allocation before Unit Economics, Data Ingestion before Anomaly Management) |
| 4 | Unknown and N/A | Unknown counts as risk and is flagged unconfirmed. N/A only from scope facts. Blank answers are excluded and shown as coverage |
| 5 | Scope facts used | Providers, platforms and scopes reach the engine and drive questions, levers and playbook entries |
| 6 | Need verdict (executive mode) | Carried over from FinOps Value Case (need and urgency indices, confidence, blind spots) with its thresholds in the register |
| 7 | Version stamp | Engine, KB, value-model and claims-register versions on every result |
| 8 | Remove | Five-stage gating, stage value bands, T6 as a value driver, invented archetypes |

**Dependencies:** F1, F2.

**Gate F3:**
- contract tests for both modes;
- unit tests per capability rating and per trigger (positive and negative);
- golden outputs for the five reference scenarios;
- no FinOps IQ or FinOps Value Case behaviour lost without a recorded reason.

---

## F4: Value model, trace and inflation guard (area 13)

**Objective:** a value figure a CFO can challenge and get a written answer for.

### Value model

| Element | Rule |
|---|---|
| Levers | L1 commitments (rate); L2 rightsizing; L3 idle and orphaned resources; L4 non-production scheduling; L5 storage tiering and lifecycle; L6 Spot/preemptible; L7 Kubernetes efficiency; L8 data transfer; L9 SaaS and licensing (scope); L10 AI/GPU (scope) |
| Addressable base per lever | Defined share of spend: e.g. L1 = eligible steady-state compute **not yet covered**; L4 = non-production hourly compute. From client input (exact or band low/high) or, when missing, **not quantified** for that lever. No default share without a published source |
| Lever range | Conservative / expected / upper as % of the addressable base. Upper ≤ the provider's published maximum discount where one exists (AWS 72%/66%, Spot 90%, Azure 72%, GCP 55%/70%). Expected ≤ ½ of upper unless a sourced capture rate exists. Every value is a claim ID |
| Interaction order | Usage levers first (L3, L4, L2, L5, L7, L8), then rate levers (L1, L6) on the **reduced** base, so levers do not double count. L6 and L1 cannot both apply to the same usage |
| Global cap | Expected total ≤ the published average estimated-waste share for public cloud (Flexera 2026: 29%) unless client evidence is attached. Shown with source and year |
| Net and phased | Indicative implementation cost from the WS-S5 offering ranges, plus tooling as a client input. Ramp per lever (e.g. L1 within 1–3 months; L2/L7 over 6–12 months), labelled LTM heuristic until evidence exists. Shown: year-1 net, run-rate net, 3-year net |
| Confidence | High / medium / low from answer coverage, Unknowns and evidence (provider-tool recommendations or billing data attached) |
| Hypothesis | The client's T6 estimate is shown beside the model's range, with the gap explained; never an input |
| Labels | "Indicative value range: not a savings commitment; evidence validation required" (Cost IQ's existing wording). Never "recoverable" or "guaranteed" |

### Automated tests (CI)

| Test | Asserts |
|---|---|
| **Trace test** | Render the screen and PDF for every reference scenario. Every number carries a `data-field` (engine path) and a claim or assumption ID. The test fails on any number without both, or whose value differs from the engine field |
| **Reconciliation tests** | • Sum of lever values = headline (each of the three cases).<br>• Sum of roadmap item values = headline.<br>• Year-1 + year-2 + year-3 phasing = 3-year total.<br>• Gross − cost = net.<br>• Screen = PDF = backlog = engine |
| **Inflation guard** | Over the reference scenarios and 1,000 random questionnaires:<br>• each lever ≤ addressable base × its upper cap;<br>• each lever's upper ≤ the published maximum;<br>• total expected ≤ global cap × in-scope spend;<br>• conservative ≤ expected ≤ upper;<br>• year-1 ≤ run-rate;<br>• net ≤ gross;<br>• no lever quantified without its base;<br>• **a blank answer never yields a higher value than any answered option**.<br>CI fails on any breach and prints the case |
| **Language lint** | No banned phrase in any rendered output (F2 item 6) |
| **Assumption register test** | Every constant used by the value model and scoring appears in the register with value, basis, confidence and sensitivity. The report's "How we calculated this" appendix lists them all |

**Dependencies:** F3; WS-S2 (claim IDs); WS-S5 (cost ranges).

**Gate F4:**
- all five tests pass in CI;
- reference-scenario values fall inside the ranges written in F1, or the difference is explained;
- this agent's review of each lever's source recorded;
- owner approval of the global cap and ramp defaults.

---

## F5: Scoring audit and recalibration

**Objective:** prove the profile behaves sensibly and every label means what it says.

| # | Item | Detail |
|---|---|---|
| 1 | Audit adapter | Update `packages/engine-core/audit/` for v3. Headlines: capabilities at or above target, gap count, need index, value expected (net) |
| 2 | CI thresholds | • Monotonicity: a better answer never lowers a rating or raises a gap.<br>• No dead questions.<br>• Every rating reachable.<br>• Missing-data shift ≤ 0 on maturity and on value.<br>• No single answer moves the summary more than an agreed limit (proposal: one capability level) |
| 3 | Specific checks | • N/A only from scope.<br>• Unknown never scores better than the lowest answered option.<br>• Checkpoint and finding labels match the thresholds behind them (M10).<br>• Scope answers never scored |
| 4 | Reference scenarios | The five from F1, plus 3–5 built from published provider case studies (with URL). Expected profiles and ranges written first, then compared |
| 5 | Practice-lead review | This agent reviews the golden diffs and scenario results; the owner approves |
| 6 | Open Phase 3 decisions | Close `SCORING_AUDIT.md` items 1, 3–5 for FinOps IQ and 2, 6 for FinOps Value Case through the new model |

**Dependencies:** F3, F4.

**Gate F5:** audit in CI; no unexplained scenario disagreement; golden outputs approved in writing.

---

## F6: One page with executive, workshop and client modes (WS-S7)

| # | Item | Detail |
|---|---|---|
| 1 | New page | Rebuilt on the shared design system. Reads the public schema only. `finops-value-case.html` redirects to executive mode |
| 2 | Save and resume | Server persistence with ownership checks (Resilience IQ pattern). `localStorage` only for UI preferences |
| 3 | Client mode | Server-side: internals, probes, consultant notes and fees are not sent to the client view (no CSS blur) |
| 4 | Notices | Hosting and data notice (validation section 7); disclaimer; framework attribution |
| 5 | Accessibility | WCAG 2.2 AA; no horizontal scroll at 360px |

**Gate F6:**
- browser tests: every question in both modes renders and can be answered;
- sign-in → answer → save → resume → report journey;
- client mode DOM contains no consultant-only fields;
- no console errors.

---

## F7: Outputs: executive PDF, "How we calculated this", backlog (WS-S4)

| # | Item | Detail |
|---|---|---|
| 1 | Executive PDF | Server-rendered, LTM Vantage brand. **Executive summary:** situation, issue, recommendation, value (expected net, with range, confidence and basis). Then capability profile, findings, roadmap, How LTM can help, technical execution, and methodology and sources (version, date, "data provided by", disclaimer, attribution, hosting statement) |
| 2 | "How we calculated this" appendix | For every number: inputs, formula, source or assumption ID. The full assumption register (value, basis, confidence, sensitivity). A sensitivity table for the top three assumptions |
| 3 | Delivery-grade roadmap | Workstreams (e.g. Allocation and tagging; Commitment portfolio; Rightsizing and scheduling; Kubernetes cost allocation; Forecasting and unit economics; FinOps operating model). Each with activities, owner role, duration, dependencies, effort band, milestones, KPIs (e.g. % of spend allocated, eligible coverage and utilisation, forecast variance), prerequisites, risks, and lever value. Every item traces to a finding |
| 4 | Backlog CSV | One row per playbook action: finding, capability, lever, platform, level, action, verification, owner role, effort, value, claim ID. Jira later |
| 5 | Retire | jsPDF client generation, "Export Audit JSON" as a client deliverable, the AI briefing |

**Dependencies:** F4; WS-S4; F8 and F9 for their sections.

**Gate F7:**
- visual review of the five scenario PDFs;
- trace and reconciliation tests (F4) run on the PDF;
- backlog imports cleanly;
- this agent repeats the CIO challenge test and the report answers at least 9 of 10 from its own pages.

---

## F8: Platform playbook entries (WS-S3)

**Objective:** each lever and capability gap ends in concrete, verifiable actions on the platforms the client selected. Tools are named as options with alternatives.

| Lever / capability | Platform level | Approach, then options (to be sourced in WS-S3) | Verification |
|---|---|---|---|
| Data Ingestion | Platform | Central billing export in FOCUS format. AWS: Data Exports (CUR 2.0, FOCUS 1.2). Azure: Cost Management exports (FOCUS). GCP: Cloud Billing export to BigQuery (FOCUS view). OCI: cost reports. On-premises/private cloud: chargeback data from virtualisation and CMDB into the same model | All accounts and subscriptions present in the dataset; daily freshness |
| Allocation | Platform, stack | Tag/label policy plus account hierarchy; shared-cost rules. AWS: tag policies, cost categories. Azure: Policy, tag inheritance. GCP: labels, org policy. Kubernetes: namespace/label allocation (OpenCost or commercial options). On-premises: CMDB service mapping | % of spend allocated, measured by cost, monthly |
| L1 Commitments | Platform | Central portfolio, staggered terms, utilisation alerts. AWS SP/RI; Azure reservations and savings plan; GCP CUDs; OCI Universal Credits. Provider recommendations (Cost Optimization Hub, Advisor, Recommender) as input | Eligible coverage and utilisation within target; no unplanned expiry |
| L2 Rightsizing | Stack | Provider recommendations, then engineering change with performance guardrails. AWS Compute Optimizer; Azure Advisor; GCP Recommender; Kubernetes VPA. On-premises: VM right-sizing from hypervisor metrics | Utilisation after change; no SLO breach |
| L3 Idle and orphaned | Platform | Scheduled detection and quarantine policies per provider; on-premises zombie VM reclamation | Idle spend trend down; exceptions register |
| L4 Non-prod scheduling | Platform | Instance schedulers or policy (per provider); Kubernetes scale-to-zero for dev namespaces | Non-prod hours vs schedule |
| L5 Storage | Stack | Lifecycle and tiering policies (S3 tiers, Azure Blob tiers, GCS classes); snapshot TTL; on-premises tiering | % of storage in the right tier; snapshot age |
| L6 Spot | Stack | Interruption-tolerant workloads only, with drain handling (e.g. Karpenter, AKS spot pools, GKE Spot VMs) | Interruption handling tested; Spot share of eligible usage |
| L8 Data transfer | Application | Endpoints and private links, zonal routing, egress review; requires architecture discovery | Transfer cost per unit of traffic |
| L10 AI/GPU | Stack | GPU utilisation, idle endpoint shutdown, token attribution (Bedrock, Azure OpenAI, Vertex AI usage data) | GPU utilisation; cost per 1,000 inferences |
| Unit Economics | Application | Unit metric definitions joined to allocation data in BI; needs product telemetry discovery | Unit cost trended monthly |

**Rules:**
- Application-level entries state the discovery they need (billing data, telemetry, architecture review).
- Each entry has a source, owner role, review date and "confirm regional availability" where needed.

**Dependencies:** F3; WS-S3 catalogue schema (shared with Sovereign IQ S7 and Resilience IQ).

**Gate F8:** a test confirms no action without a finding and no selected platform without options; 100% of entries sourced and reviewed.

---

## F9: How LTM can help (WS-S5)

**Objective:** every finding appears as advice on what to do next and who could do it, typed and scoped, without selling.

| Offering (FinOps practice unless stated) | Type | Typical trigger | Execution outline | Indicative scope |
|---|---|---|---|---|
| FinOps assessment and value validation | Advisory | Executive mode shows need; value confidence low | Validate the capability profile with billing data and provider recommendations; baseline; validated lever ranges | 3–6 weeks |
| FinOps operating model and governance | Advisory | Practice Operations, Executive Strategy Alignment or Governance gaps | Charter, RACI, cadence, KPIs, policy set, education plan | 4–8 weeks |
| FinOps tooling and tagging implementation (with Cloud Transformation) | Implementation | Data Ingestion, Allocation, Anomaly or Reporting gaps | FOCUS data pipeline, allocation rules, dashboards, anomaly alerts, policy as code on the selected platforms; tool selection from requirements with alternatives | 6–12 weeks |
| Optimisation sprints | Implementation | L1–L8 with quantified value | Sprint backlog per lever and platform, change with guardrails, savings verification | 4–8 weeks per wave |
| Managed FinOps service | Transformation (run) | Need for sustained practice; limited internal capacity | Ongoing allocation, commitment management, anomaly response, monthly reviews, KPI reporting | 12 months+ |
| Unit economics and chargeback (with Data and AI) | Implementation | Unit Economics, Invoicing and Chargeback gaps | Unit metric design, BI integration, ERP chargeback | 8–12 weeks |

Scope ranges appear only in the consultant SOW draft. The client sees type, purpose and execution outline.

**Dependencies:** F8; WS-S5 catalogue.

**Gate F9:** test: every finding maps to at least one offering; the SOW export is consultant-only; language lint passes.

---

## F10: AI on Bedrock with toggle (WS-S1)

| # | Item |
|---|---|
| 1 | Shared Bedrock service in ap-south-1; no cross-region inference without owner approval |
| 2 | Off by default; per-engagement toggle; the state is shown on the report |
| 3 | Input is the engine result only. Consultant notes and the client name are never sent |
| 4 | AI never selects or changes an answer (it replaces today's "Interpret with AI") |
| 5 | Grounding check rejects any number, percentage, provider claim or benchmark not in the engine output |
| 6 | Eval set: five scenarios plus adversarial prompts (asking for a guaranteed saving, a "best" tool, peer rankings) |

**Gate F10:** grounding check passes 100% of the eval set; AI text labelled; prompts and outputs logged.

---

## F11: Client-data protection and counsel review (WS-S6)

| # | Item | Detail |
|---|---|---|
| 1 | Data inventory | Answers, spend by scope, client name, respondent and consultant identity, notes (consultant-only), uploaded evidence (if F2 brings a FOCUS import, processed per D13) |
| 2 | Transfer basis | EU SCCs and UK IDTA or Addendum with transfer risk assessment, as for Sovereign IQ |
| 3 | Notice | Validation section 7 wording on the start screen, PDF and privacy notice |
| 4 | Retention | Assessments, archives and logs deleted after an agreed period (proposal: 24 months, or at client request) |
| 5 | Counsel review | Privacy notice, CC BY 4.0 attribution, trademark wording (D10), and "not a savings commitment" language |

**Gate F11:** notice published; retention job tested; counsel comments recorded in the register.

---

## F12: Re-score against all 13 areas

| # | Item |
|---|---|
| 1 | Re-run this agent's review against the 13 areas with fresh evidence (tests, audit, register, PDFs, inflation-guard report) |
| 2 | Re-verify volatile claims (FOCUS version, Framework revision, provider maxima, latest State of FinOps and Flexera editions) on the re-score date |
| 3 | Two internal "hostile CFO" sessions with the ten questions from validation section 4.7 |
| 4 | Owner decision on CIO pilots (booked after all accelerators improve) |

**Gate F12:** all 13 areas Pass, or each Partial accepted in writing by the owner.

| # | Area | Target evidence |
|---|---|---|
| 1 | Purpose and distinctness | Decision, buyer and edge written; FinOps Value Case merged; Cost IQ boundary agreed |
| 2 | Functionality | Journey and save/resume tests; backlog export |
| 3 | Questions and answers | FinOps Framework capability mapping; Unknown everywhere; N/A by scope; basis per question |
| 4 | Depth | Executive 15–20 min; workshop with triggered follow-ups |
| 5 | Scoring engine | Audit in CI; golden approved |
| 6 | CIO alignment | Each finding has owner role and time frame |
| 7 | Output | PDF structure; trace test; backlog |
| 8 | Sources | Register complete; CI review dates |
| 9 | Legal validity | Notice, attribution and trademark wording reviewed; disclaimer shown |
| 10 | AI scope and toggle | Bedrock only; eval 100% |
| 11 | Technical execution | Playbook per selected platform with verification |
| 12 | Commercial pull-through | Every finding in How LTM can help; SOW consultant-only |
| 13 | Report defensibility | Trace, reconciliation and inflation-guard tests green; assumption register complete; CIO challenge ≥ 9/10 answered |

---

## Decisions (taken by the product owner, 14 Oct 2026)

All recommended defaults **accepted** (D1–D15). D1 = option C: FinOps Value Case is folded into FinOps IQ as its executive mode; Cost IQ stays as the whole-estate technology cost diagnostic and hands cloud findings to FinOps IQ.


| # | Decision | Recommended default | Needed by |
|---|---|---|---|
| D1 | Consolidate or differentiate | **C:** FinOps Value Case becomes FinOps IQ's executive mode; Cost IQ stays and routes cloud findings to FinOps IQ | F1 |
| D2 | Maturity model | FinOps Foundation Crawl/Walk/Run per capability (2026 Framework, shared with Cost IQ overlay); no gated org stages | F1 |
| D3 | Headline value | Lever-based conservative/expected/upper, net, phased, capped; "not quantified" without inputs | F1 (design), F4 (build) |
| D4 | Client's waste estimate (T6) | Hypothesis only, shown beside the model | F1 |
| D5 | Unknown and N/A | Unknown on every maturity question (risk); N/A only from scope | F1 |
| D6 | Scope | Public cloud core plus AI, SaaS, licensing, private cloud/data centre by footprint | F1 |
| D7 | Client mode | Real client mode; no teaser wall; fees in consultant SOW only | F0 (remove wall), F6 |
| D8 | Sample report and playbook | Retire now; regenerate from the engine and KB | F0 |
| D9 | Currency | Client currency; no FX unless asked | F3 |
| D10 | Framework and trademark wording | CC BY 4.0 attribution with changes; drop trademark sentence and "™" unless counsel confirms | F0, F11 |
| D11 | Legacy unauthenticated route | Switch off now for FinOps IQ and FinOps Value Case | F0 |
| D12 | Demo clients | Five reference scenarios, labelled illustrative | F1 |
| D13 | Billing-file import | Remove now; optional FOCUS-based evidence step later, never overwriting answers | F0, F3 |
| D14 | Volatile items | 90-day review with "as of" dates | F2 |
| D15 | Global value cap and ramp defaults | Expected ≤ Flexera 2026 average estimated waste (29%) without client evidence; ramp per lever labelled LTM heuristic | F4 |
