# Sovereign IQ (merged with Posture IQ): plan

**Date:** 13 Oct 2026  **Author:** `sovereignty-compliance-lead` (advises; the product owner approves).  **Starting point:** the [validation report](VALIDATION.md). Sovereign IQ scores 0 Pass / 6 Partial / 6 Fail and Posture IQ 0 / 7 / 5 on the 12-area scorecard. 34 incorrect, 5 outdated and 16 unsourced regulatory and provider statements.  **Goal:** one accelerator, Sovereign IQ, that passes all 12 areas, with "posture" as its compliance-exposure view.

**Naming:** phases are **S0–S11**. To avoid a clash, the shared workstreams from [FRAMEWORK.md](../FRAMEWORK.md) are written **WS-S1 to WS-S8** here (WS-S1 Bedrock AI, WS-S2 claims register, WS-S3 platform playbook, WS-S4 outputs, WS-S5 How LTM can help, WS-S6 client-data protection, WS-S7 modes, WS-S8 practice-lead agents).

**How each phase lands:** a PR with full CI, golden-file diffs and this agent's review of the diff. Scoring changes show the golden diff. Regulatory content stays consultant-only until the counsel gate (S10).

## Summary

| # | Phase | Depends on | Exit gate |
|---|---|---|---|
| S0 | Containment of both current tools | — | No browser AI, no invented benchmarks or vendor scores, no legal clauses; Critical statements corrected; disclaimer and "internal use only" banner on both |
| S1 | Merge design: one engine, one regulation model, one page | S0; owner decisions D1–D6 | Owner approves design pack: control IDs, fact model, regime registry schema, question map, modes, headline model |
| S2 | Regulatory content and claims register | S1; WS-S2 | Every regime, date, threshold and penalty sourced in the register with owner and review date; CI fails on overdue review |
| S3 | Engine build (Sovereign IQ v4) | S1, S2 | One engine and contract; applicability, two headlines, findings with control IDs; Posture route aliased |
| S4 | Scoring audit and recalibration | S3 | Audit invariants pass in CI; reference scenarios agree; golden outputs approved |
| S5 | One page: executive, workshop and client modes | S3; WS-S7 | Every question renders and can be answered; save and resume on the server; client mode hides internals |
| S6 | Outputs: PDF and technical backlog | S3; WS-S4 | Server-rendered PDF with methodology and sources; backlog CSV; every number traces to an engine field |
| S7 | Platform playbook entries | S3; WS-S3 | Every finding with a technical remedy has entries for each platform the client selected, each with a verification step |
| S8 | How LTM can help and SOW | S7; WS-S5 | Every finding mapped to a typed offering with scope range and execution outline; consultant-only SOW export |
| S9 | AI on Bedrock with toggle | S6; WS-S1 | Off by default; per-engagement toggle; grounding check passes 100% of the eval set; prompts and outputs logged |
| S10 | Client-data protection and legal counsel gate | S2–S9; WS-S6 | Transfer basis, TIA, privacy notice, retention live; counsel sign-off for EU/UK, US and APAC |
| S11 | Re-score against all 12 areas | S0–S10 | Validation report re-issued with all 12 Pass, or Partials accepted in writing |

S0 starts now and does not wait for any decision. S2 content research can run beside S1. S5–S8 can run in parallel once S3's contract is fixed. S9 needs WS-S1; S10 needs WS-S6.

---

## S0: Containment of both current tools

**Objective:** stop the current pages from saying wrong things or sending client data out, before any redesign. Small, safe PRs.

| # | Item | Detail |
|---|---|---|
| 1 | Remove browser AI from both pages | Delete provider selectors, key fields, `localStorage` key storage, all `fetch` calls to Gemini, OpenAI and Anthropic, and "Copy Prompt Pack" (`sovereign-iq.html:2713-2722, 4551-4600, 5623-5740`; `posture-iq.html:6351-6580`). Rule-based memo stays. Remove the three vendor domains from `connect-src` in `customHttp.yml` |
| 2 | Hide unsourced modules in the Sovereign page | Peer percentile banner, vendor RFP scorecard, legal covenant pack, conflict-of-laws simulator, supervisory exam challenges, geopolitical war game, PQC horizon cards, CBOM. Hidden behind a consultant flag now; deleted in S5 |
| 3 | Correct the Critical statements in place | Rows 6, 7, 21, 25, 26, 31, 32, 34–36, 38, 40–43, 45, 51, 62 of the validation table: AI Act dates (Regulation (EU) 2026/1744), Data Act Art. 29 dates, DPF and UK data bridge, SS1/21 vs SS2/21, CTPs designated 13 Jul 2026, DUAA in force 5 Feb 2026, FISA 702 lapse status, DPDP phase-in to 13 May 2027 |
| 4 | Disclaimer and banner | "Not legal advice" on screen and in the PDF of both tools; banner "Internal consultant use only, content under review" |
| 5 | Remove sales and personal data from client views | Fees, "hedge ratio", "Big 4", named partner and email, "attorney-drafted" |
| 6 | Generic 500 errors | Both handlers stop returning `error.message` |
| 7 | Retire the Posture playbook | Mark `POSTURE_IQ_CONSULTANT_PLAYBOOK.md` superseded; it contradicts the engine (H8) |

**Dependencies:** none (AI removal does not wait for WS-S1; AI is simply unavailable until S9).

**Gate S0:** a test asserts no LLM vendor hostname appears in either page or the CSP; golden outputs unchanged except for corrected text fields; the owner confirms the banner.

**Status (13 Oct 2026): done, pending merge.**

| # | Result |
|---|---|
| 1 | Browser AI removed from both pages; Posture IQ also clears any key a browser stored earlier. `check:repo` fails if either page references an LLM vendor API host. **The CSP still lists the three vendor hosts**, because Cloud IQ and Strategy IQ still use browser AI; they come out of the CSP when WS-S1 replaces browser AI on every page |
| 2 | Hidden from Sovereign IQ: conflict-of-laws and severance simulators, supervisory exam, war game, CBOM/PQC horizon, vendor RFP scorecard, TCO model and target-state delta (both invented figures), legal TIA and covenants, SOW, slides, the forensic dossier flyout and the peer percentile. The CBOM page is removed from the PDF. The public sample report repeated the incorrect statements and is replaced by a notice |
| 3 | Corrected in the knowledge bases and engine text: AI Act (2026/1744 dates), Data Act (Art. 29 charges to 12 Jan 2027; Art. 32 scope), CLOUD Act and GDPR Art. 48, FISA 702 status and the Data Privacy Framework and UK data bridge, PRA SS1/21 vs SS2/21, the UK critical third parties designated from 13 Jul 2026, the DUAA in force 5 Feb 2026, and the India DPDP phase-in to 13 May 2027. Statements left only in hidden modules are deleted in S5 |
| 4 | Review banner on both pages; disclaimer on every page of both Sovereign IQ PDFs (Posture IQ's PDF already had one) |
| 5 | Removed from client views: Posture IQ fees, hedge ratio, investment sizing and the Big 4 claim; Sovereign IQ's sprint sizing and '7.3x protection ratio', and 'attorney-drafted'. The briefing buttons say 'Schedule a briefing with LTM'. The practice-lead name and address are kept as the owner's contact |
| 6 | Both handlers return a generic 500; details go to the logs |
| 7 | `POSTURE_IQ_CONSULTANT_PLAYBOOK.md` marked superseded |

---

## S1: Merge design

**Objective:** decide the shape of the single accelerator before building it.

### Decision, buyer, edge

- **Decision:** where each class of data and workload may run, what regulatory exposure follows, and what sovereign architecture and migration path to fund.
- **Buyer:** CIO; co-owners CISO, DPO/General Counsel, CRO (in financial services, head of operational resilience).
- **Edge:** vendor-neutral, multi-jurisdiction (EU/UK, US, APAC), requirement-first, ending in a platform-specific backlog and typed next engagements (validation report section 4). Sovereignty levels use the EU Cloud Sovereignty Framework's SEAL objectives as vocabulary, so outputs line up with EU public procurement.

### Model

| Element | Design |
|---|---|
| **Fact model** | One set of facts: footprint (where entities, customers and data subjects are), entity classes (NIS2 essential/important, DORA financial entity or ICT provider, AI Act role, payment system operator, CI asset, APRA/MAS/FCA-PRA regulated), data classes, platforms in scope (on-premises, AWS, Azure, GCP, Oracle, sovereign providers, SaaS), provider jurisdictions, controls |
| **Regime registry** (one regulation model) | One record per regime: id, jurisdiction, citation, applicability rule (as data, not code), entity classes, obligations with article, dates (in force, phased, deferred) with "status as of", penalty model (cap type: fixed/turnover/periodic/national/not quantified; currency; who it applies to), claim IDs. Replaces Sovereign's `regimes` and Posture's `regulations` |
| **Sovereignty requirement level** | Derived per data class from regimes and client choice: L0 none, L1 residency, L2 residency plus access control and key custody, L3 operational sovereignty (EU/national personnel, local entity), L4 jurisdictional immunity or disconnected. Mapped to SEAL objectives |
| **Controls** | Stable control IDs, e.g. `SOV.KEY.CUSTODY`, `SOV.RES.REGION_LOCK`, `SOV.XFER.BASIS`, `SOV.OPS.ADMIN_ACCESS`, `SOV.EXIT.TESTED`, `SOV.SAAS.SUBPROCESSOR`, `SOV.AI.DATA_LOCATION`. Every question maps to a control; every finding names a control |
| **Two headlines** (D2) | **Sovereignty control maturity** 0–100, scored against the required level; **Compliance exposure** (the posture view): regimes in scope with grade (applies / likely – confirm / advisory), RAG per regime, obligations, largest single statutory maximum labelled "cap, not expected fine", never summed |
| **Findings** | Gap = required level minus control state, per data class. Each finding: control, regime and article, severity, business consequence, owner role, time frame, remedy, playbook entries, offering |

### Question map (Sovereign Q → Posture Q → merged)

| Theme | Sovereign | Posture | Merged |
|---|---|---|---|
| Sector, footprint, turnover | Q1.1–Q1.3 | A3, org fields | Keep; split combined country options (Japan, Hong Kong, Australia, NZ separate); add US states of operation; turnover band optional |
| Entity classification | — | A1, A2 | Keep Posture's; add AI Act role, payment operator, CI asset, APRA/MAS/PRA-FCA regulated |
| Data classes and volume | Q3.1 | B1, B2 | Keep Posture's B1 categories; scope only |
| Platforms in scope | Q2.1 | C1 | One multi-select of platforms (drives playbook) |
| Data location per class | Q3.2, Q3.3 | C2, F1 | Posture's matrix (C2) with backups as a column; EEA treated as one zone |
| Residency enforcement | — | C3 | Keep |
| Transfers and TIA | Q4.3 | D1, D2 | Merge; options name DPF, UK data bridge, SCCs/IDTA, derogations |
| Provider jurisdiction and contract | Q4.1, Q4.2 | H1 | Fact, not maturity |
| Admin and support access | Q5.1, Q5.3 | E3, E4 | Merge |
| On-prem out-of-band | Q5.2 | probe 5 | Workshop follow-up, only if on-prem selected |
| Key custody and revocation | Q6.1, Q6.3 | F2, H3 | Merge; one key-custody effect only |
| Confidential computing | Q6.2 | — | Workshop follow-up for L3+ |
| Processors and sub-processors | — | E1, E2 | Keep |
| Concentration and exit | Q7.1, Q7.2 | F4, I3 | Merge; deep exit testing referred to Resilience IQ |
| Hardware provenance | Q7.3 | — | Workshop, only if US federal or CI scope |
| AI | Q2.3 | G1–G4 | Posture's G1–G4 plus AI data location |
| Certification | — | H2 | Keep, without EUCS until adopted |
| Governance, incident readiness | — | I1, I2, J1 | Keep |
| Outcome preferences | — | K1–K3 | Workshop only, not scored |

Every maturity question gets "Unknown", scored as risk and shown as "unconfirmed". Every question carries its basis (regime article or framework clause) by claim ID.

### Modes (WS-S7)

| Mode | Content | Time |
|---|---|---|
| Executive | About 16–18 questions: footprint, entity class, data classes, platforms, location matrix, transfers, key custody, admin access, exit, AI | 15–20 min |
| Workshop | Executive plus follow-ups triggered by answers (OOB if on-prem, confidential computing if L3+, DORA register if financial entity, CTP dependency if UK financial, US bulk data if US data to countries of concern) | 60–90 min |
| Client mode | Either depth; hides scoring internals, probes, consultant notes, fees | — |

**Items:** design pack (above), JSON schemas for facts, regimes, questions and findings; five reference archetypes replacing the demos: EU bank (DORA), UK insurer (UK OpRes, CTP), US health-tech with EU customers, Singapore/Australia financial group, India-headquartered services firm with EU clients.

**Dependencies:** S0; owner decisions D1–D6; WS-S8 (this agent) for review.

**Gate S1:** owner approves the design pack in writing; Resilience IQ and Cloud IQ owners confirm the boundary (exit testing, Q8.2 flag).

**Status (14 Oct 2026): approved.** The design pack is [design/DESIGN.md](design/DESIGN.md) with JSON Schemas and `archetypes.json`: 47 questions (17 executive, 15 workshop, 15 triggered follow-ups), 28 controls, 42 regimes (EU/UK, US, APAC). The owner approved it with the recommended defaults for Q1–Q11. As owner of all accelerators, the product owner also confirms the Resilience IQ and Cloud IQ boundary in section 11.

---

## S2: Regulatory content and claims register

**Objective:** a regime registry that is correct for EU/UK, US and APAC on the review date, every item sourced.

| # | Item | Detail |
|---|---|---|
| 1 | EU | GDPR (Ch. V, Art. 83), EDPB Recs 01/2020, DPF (2023/1795, appeal C-703/25 P), NIS2 with size-cap rule and transposition status, DORA (Art. 19, 26, 28–30, 35, 50–51; RTS 2025/301 and 2025/532), AI Act with Regulation (EU) 2026/1744 dates, Data Act (Art. 23–31, 32; Art. 29 dates), CRA for product vendors, SecNumCloud and C5 as national requirements, EUCS as "not adopted", EU Cloud Sovereignty Framework (SEAL) for public buyers |
| 2 | UK | UK GDPR and DPA 2018 as amended by DUAA (in force 5 Feb 2026), UK data bridges incl. US extension (SI 2023/1028), IDTA/Addendum, PRA SS1/21 and SS2/21, FCA PS21/3, CTP regime with the four designated CTPs, NIS Regulations 2018 (and the Cyber Security and Resilience Bill once its status is verified) |
| 3 | US | CLOUD Act (§ 2713, § 2703(h), § 2523 agreements incl. UK–US), FISA 702 with live status, EO 14086, DOJ 28 CFR Part 202, CCPA/CPRA and other state laws as applicability flags, HIPAA, GLBA, SEC cyber disclosure, NYDFS Part 500, FedRAMP |
| 4 | APAC | Singapore PDPA (s.26D, s.48J), MAS TRM Notices by licence type and TRM and Outsourcing Guidelines, APRA CPS 230 and CPS 234, Australian Privacy Act incl. 2024 amendments, SOCI, NZ Privacy Act 2020, India DPDP Act and Rules with phase-in, RBI payment data, CERT-In, SEBI/IRDAI cloud rules, Japan APPI, Hong Kong PDPO and HKMA, South Korea PIPA, China PIPL Art. 38–40 and 2024 provisions (only where mainland China is in the footprint) |
| 5 | GCC | Per D1: moved to a design folder, not shown |
| 6 | Claims register (WS-S2) | Every regime field, penalty, date, threshold and provider statement gets a claim ID with source URL, article, owner, last and next review. Volatile items (FISA 702, DPF appeal, AI Act omnibus, DPDP phase-in, CTP list, NIS2 transposition) on a 90-day review (D8). Exchange rates from a dated reference set. The page holds no regulatory text of its own, so the register covers everything a client sees |
| 7 | Language lint | Banned phrases: "legally void", "unenforceable", "injunction", "zero legal immunity", "guarantees", "100% compliant", "attorney-drafted" |

**Dependencies:** S1 schema; WS-S2 register and CI check.

**Gate S2:** 100% of registry fields have a claim ID with source; this agent's review recorded per regime; CI fails on an overdue review date; no row of the validation table remains Incorrect, Outdated or Unsourced (each is corrected, sourced or removed).

---

## S3: Engine build (Sovereign IQ v4)

**Objective:** one engine and one request contract for both modes.

| # | Item | Detail |
|---|---|---|
| 1 | Package | `packages/engine-core/src/accelerators/sovereign-iq/` v4; Posture IQ engine retired after S11. `evaluate-posture-iq` route returns the merged result for one release, then is removed (D10) |
| 2 | Applicability engine | Evaluates registry rules against facts; grades applies / likely – confirm / advisory / not applicable with the rule that fired |
| 3 | Requirement level and gaps | Per data class; maturity scored against the requirement (D3) |
| 4 | Exposure view (posture) | Regimes, RAG, obligations, penalty model per registry; "not quantified" when turnover missing (D4) or cap is national |
| 5 | Findings and roadmap | From gaps only; no fixed actions for every client; owner role and time frame per finding; waves by dependency |
| 6 | Unknown handling | "Unknown" counts as risk and is flagged unconfirmed; blank answers excluded and shown as coverage |
| 7 | Version stamp | Engine, registry and claims-register versions on every result |
| 8 | Remove | Static archetypes and offerings, peer benchmarks, default turnover |

**Dependencies:** S1, S2.

**Gate S3:** contract tests; unit tests for each applicability rule (positive and negative); golden outputs for the five archetypes; no Sovereign or Posture behaviour lost without a recorded reason.

---

## S4: Scoring audit and recalibration

**Objective:** prove the merged engine behaves sensibly and that every label means what it says.

| # | Item | Detail |
|---|---|---|
| 1 | Audit adapter | Add merged engine to `packages/engine-core/audit/`; headlines: maturity, exposure count, largest single statutory maximum |
| 2 | CI thresholds | Monotonicity (a better control never lowers maturity), no dead maturity questions, every band reachable, missing-data shift ≤ +1 point, no single answer moves maturity more than an agreed limit (proposal 20) |
| 3 | Specific checks | Provider nationality alone never lowers maturity; one effect per answer (key custody once); EEA replication not a cross-border finding; scope answers never scored |
| 4 | Reference scenarios | 8–10 scenarios built from public material: EDPB and national DPA transfer decisions, DORA and CPS 230 published expectations, the Commission's SEAL tender outcome. Expected regimes and top gaps written first, then compared |
| 5 | Practice-lead review | This agent reviews the golden diffs and the scenario results; the owner approves |
| 6 | Open Phase 3 decisions | Close `SCORING_AUDIT.md` items 11–15 (exchange rates, Japan/HK option, SME rule, Australian 30% limb, default turnover) through the new model |

**Dependencies:** S3.

**Gate S4:** audit passes in CI; no unexplained disagreement in the reference scenarios; golden outputs approved in writing.

---

## S5: One page with executive, workshop and client modes

**Objective:** a single, clean page that only renders engine output.

| # | Item | Detail |
|---|---|---|
| 1 | New page | `Accelerators/sovereign-iq.html` rebuilt on the shared design system; reads the public schema only (no copied KB); `posture-iq.html` redirects |
| 2 | Delete retired modules | All modules hidden in S0 (D5) |
| 3 | Save and resume | Server persistence with ownership checks, following the Resilience IQ assessment API pattern; no state in the URL; `localStorage` only for UI preferences |
| 4 | Modes | Executive, workshop, client (WS-S7) |
| 5 | Hosting notice | Validation report section 6 wording on the start screen (with S10) |
| 6 | Accessibility and mobile | WCAG 2.2 AA, no horizontal scroll at 360px |

**Dependencies:** S3; WS-S7.

**Gate S5:** browser tests: every question in both modes renders and can be answered; full journey sign-in → answer → save → resume → report; client mode shows no internals; no console errors.

---

## S6: Outputs: executive PDF and technical backlog

**Objective:** the two deliverables a CIO keeps.

| # | Item | Detail |
|---|---|---|
| 1 | Executive PDF (WS-S4) | Server-rendered, LTM Vantage brand. Structure: executive summary (decision, exposure, top five actions), findings, roadmap, How LTM can help, technical execution, methodology and sources (claim IDs, versions, "data provided by", disclaimer, hosting statement) |
| 2 | Backlog CSV | One row per playbook action: finding, control, platform, level, action, verification, owner role, effort, source; Jira later |
| 3 | Trace test | Every number in the PDF maps to an engine field |
| 4 | Retire | jsPDF client generation, markdown "MARP" deck, TIA markdown export, RoI CSV (a sourced DORA register template can return later from the engine) |

**Dependencies:** S3; WS-S4; S7 and S8 for their sections.

**Gate S6:** visual review of PDFs for the five archetypes; trace test passes; backlog imports cleanly into a spreadsheet.

---

## S7: Platform playbook entries (WS-S3)

**Objective:** each finding ends in concrete, verifiable actions on the platforms the client selected. Providers appear as options driven by the client's requirement, with alternatives.

| Control | Platform level | Approach, then options (examples to be sourced in WS-S3) | Verification |
|---|---|---|---|
| `SOV.RES.REGION_LOCK` | Platform | Region guardrail policy. AWS: Organizations SCP region restriction. Azure: Policy allowed locations, EU Data Boundary. GCP: resource-locations org policy, Assured Workloads. On-prem: data-centre location register. Sovereign providers (e.g. OVHcloud, S3NS, STACKIT, Scaleway, national clouds): region choice by contract | Policy compliance report shows no regulated data outside allowed regions |
| `SOV.KEY.CUSTODY` | Platform, stack | Keys held outside the provider for L2+. AWS: KMS External Key Store. Azure: options per service, confirm with Microsoft documentation. GCP: Cloud External Key Manager. On-prem/sovereign: customer HSMs or third-party key managers | Key ownership attestation; revocation test makes test data unreadable |
| `SOV.XFER.BASIS` | Application | Transfer register per flow: adequacy (incl. DPF/UK bridge), SCCs/IDTA with TIA, derogation | Every flow in the register has a basis and review date |
| `SOV.OPS.ADMIN_ACCESS` | Platform, SaaS | Provider access approval and logging (e.g. Customer Lockbox, Access Approval, Access Transparency); sovereign operating models for L3 | Access logs reviewed monthly; zero unapproved access |
| `SOV.BACKUP.LOCATION` | Stack | Backup and replica regions inside the allowed zone; independent keys | Restore test from in-zone copy; location report |
| `SOV.SAAS.SUBPROCESSOR` | Application | Sub-processor register, notification and objection rights | Register complete for critical SaaS |
| `SOV.EXIT.TESTED` | Platform, application | Portability (containers, open formats), exit plan per critical service; referral to Resilience IQ for testing | Exit plan reviewed; partial migration rehearsal |
| `SOV.AI.DATA_LOCATION` | Stack | In-zone model hosting or provider data-zone options; no training on client data | Inference endpoints and logs located in zone |
| `SOV.OOB.MGMT` | On-prem | Isolated management network, vendor call-home controlled | Network scan shows no unmanaged outbound management traffic |
| `SOV.PLATFORM.TARGET` | Platform | Sovereign landing zone on the selected target: hyperscaler sovereign offering, partner cloud, sovereign provider, or private cloud | Landing zone conformance report |

**Rules:** application level states that specific plans need technical discovery data (Layer 3) beyond the questionnaire. Each entry has a source, owner role, review date and "confirm regional availability" where needed.

**Dependencies:** S3; WS-S3 catalogue schema (shared with Resilience IQ R10 item 7).

**Gate S7:** a test confirms no action without a finding and no selected platform without options; 100% of entries sourced and reviewed.

---

## S8: How LTM can help (WS-S5)

**Objective:** every finding appears as advice on what to do next and who could do it, typed and scoped, without selling.

| Offering (generic practice) | Type | Typical trigger | Execution outline | Indicative scope |
|---|---|---|---|---|
| Sovereignty and transfer assessment (Sovereign Cloud) | Advisory | Exposure unclear, transfers without TIA | Data-flow mapping, transfer register, TIA support with client counsel | 4–6 weeks |
| Regulatory programme support: DORA, NIS2, CPS 230 (Resilience Engineering) | Advisory | Entity in scope with gaps | Gap assessment, register of information, third-party policy, exit plans | 6–12 weeks |
| Sovereign landing zone (Cloud Transformation) | Implementation | L2–L3 requirement on a hyperscaler | Region guardrails, external keys, access approval, logging, policy as code on the chosen platform | 8–12 weeks |
| Data residency remediation (Data and AI) | Implementation | Data or backups outside the allowed zone | Re-platform storage and replicas, key separation, verification | 6–16 weeks |
| Migration to a sovereign platform (Cloud Transformation) | Transformation | L3–L4 requirement not met on current platform | Target selection from requirements, wave plan, migration, decommission, e.g. to a sovereign provider such as OVHcloud or a hyperscaler sovereign offering, shown with alternatives | 6–18 months |
| Sovereign AI enablement (Data and AI) | Implementation | AI data location or AI Act role gap | In-zone model hosting, data governance, AI Act role assessment with counsel | 6–10 weeks |

Scope ranges appear only in the consultant SOW draft (D7). The client sees type, purpose and execution outline.

**Dependencies:** S7; WS-S5 catalogue.

**Gate S8:** test: every finding maps to at least one offering; SOW export is consultant-only; language lint passes.

---

## S9: AI on Bedrock with toggle (WS-S1)

**Objective:** optional narrative that never adds facts.

| # | Item |
|---|---|
| 1 | Shared Bedrock service in ap-south-1; model set by config; no cross-region processing unless the owner approves it (confirm Bedrock inference-profile routing in AWS documentation) |
| 2 | Off by default; consultant switches it on per engagement; the state is shown on the report |
| 3 | Input is the engine result only, with client name and personal data redacted |
| 4 | Grounding check rejects any number, regime, date or provider not in the engine output |
| 5 | Prompt and output log with retention per S10 |
| 6 | Eval set: the five archetypes plus adversarial cases (asking for legal conclusions, asking to name a "best" provider) |

**Dependencies:** WS-S1; S6.

**Gate S9:** grounding check passes 100% of the eval set; AI text labelled; no browser AI (already enforced since S0).

---

## S10: Client-data protection and legal counsel gate (WS-S6)

**Objective:** handle client data lawfully while hosted in Mumbai, and get regulatory content reviewed by counsel.

| # | Item | Detail |
|---|---|---|
| 1 | Data collected (D11 decided) | All data the assessment needs is collected and kept, client name included. The privacy notice lists what is held and why |
| 2 | Transfer basis | EU SCCs (Decision (EU) 2021/914) and UK IDTA or Addendum between the LTM contracting entity and the India hosting entity as counsel advises; transfer impact assessment covering Indian law-enforcement access |
| 3 | ~~No-store option~~ | Not offered (D11 decided) |
| 4 | Privacy notice and hosting statement | Validation report section 6 wording, approved by counsel |
| 5 | Retention and deletion | Assessments and logs deleted after an agreed period (proposal: 24 months, or at client request) |
| 6 | Counsel review | EU/UK, US and APAC (SG, AU, IN) counsel review the registry, the findings text and the disclaimer (D9). Their comments go into the claims register |

**Dependencies:** WS-S6; S2–S9 content frozen for review.

**Gate S10:** written counsel sign-off per market; TIA and privacy notice published; retention job tested.

---

## S11: Re-score against all 12 areas

**Objective:** re-issue the validation report for the merged accelerator.

| # | Item |
|---|---|
| 1 | Re-run this agent's review against the 12 areas with fresh evidence (tests, audit, register, PDFs, counsel sign-off) |
| 2 | Re-verify every volatile claim (90-day items) on the re-score date |
| 3 | Consultant dry run with two internal "hostile CIO" sessions: "where is this number from?", "is this legal advice?", "why should I trust a tool hosted in India?" |
| 4 | Owner decision on CIO pilots (booked after all accelerators improve, per FRAMEWORK.md) |

**Gate S11:** all 12 areas Pass, or each Partial accepted in writing by the owner.

| # | Area | Target evidence |
|---|---|---|
| 1 | Purpose and distinctness | Decision, buyer and edge written; Posture IQ retired |
| 2 | Functionality | Journey and save/resume tests; backlog export |
| 3 | Questions and answers | Unknown everywhere; every question cites its basis |
| 4 | Depth | Executive 15–20 min; workshop follow-ups |
| 5 | Scoring engine | Audit in CI; golden approved |
| 6 | CIO alignment | Each finding has owner role and time frame |
| 7 | Output | PDF structure and trace test; backlog |
| 8 | Sources | Register complete; CI review dates |
| 9 | Legal validity | Counsel sign-off; disclaimer; S6 documented |
| 10 | AI scope and toggle | Bedrock only; eval 100% |
| 11 | Technical execution | Playbook per selected platform with verification |
| 12 | Commercial pull-through | Every finding in How LTM can help; SOW consultant-only |

---

## Decisions (taken by the product owner, 13 Oct 2026)

All recommended defaults are **accepted**, with one change: **D11**. The owner decided to collect and keep all the data the assessment needs, including the client name, rather than minimise and pseudonymise it. There is no no-store session. The transfer basis for Mumbai hosting (S10 items 2, 4–6) still applies.


| # | Decision | Recommended default | Needed by |
|---|---|---|---|
| D1 | GCC content (KSA, UAE, Qatar) | Remove from the client view in v1; keep data in a design folder | S1 |
| D2 | Headline numbers | Two headlines: control maturity against required level, and compliance exposure | S1 |
| D3 | Scoring of provider choice | Score controls against the required sovereignty level; provider jurisdiction is a fact | S1 |
| D4 | Turnover not given | Do not quantify statutory maxima | S1 |
| D5 | Sovereign page modules | Retire all from the client view | S0 (hide), S5 (delete) |
| D6 | Peer benchmarks | Remove until published data exists | S0 |
| D7 | Fees | Consultant SOW only, as ranges | S0 |
| D8 | Volatile claims | 90-day review with "status as of" on screen | S2 |
| D9 | Counsel | EU/UK, US and APAC counsel before external use; internal consultant use until then | S10 |
| D10 | Posture IQ URL and API | Redirect the page; alias the API for one release, then remove | S3 |
| D11 | EU/UK client data while hosted in Mumbai | ~~Minimise, pseudonymise client name, offer a no-store session~~ **Decided: collect and keep all required data, client name included; no no-store session.** Transfer basis, privacy notice and retention still required | S5, S10 |
| D12 | Sovereignty level vocabulary | Align with EU Cloud Sovereignty Framework SEAL objectives, with LTM wording | S1 |
| D13 | Boundary with Resilience IQ | Sovereign IQ flags exit and concentration; Resilience IQ owns exit testing | S1 |
| D14 | Bedrock region | ap-south-1 only, no cross-region inference without approval | S9 |
