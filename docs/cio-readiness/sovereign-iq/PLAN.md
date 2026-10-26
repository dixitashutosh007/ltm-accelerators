# Sovereign IQ (merged with Posture IQ): plan

**Date:** 13 Oct 2026  **Author:** `sovereignty-compliance-lead` (advises; the product owner approves).  **Starting point:** the [validation report](VALIDATION.md). Sovereign IQ scores 0 Pass / 6 Partial / 6 Fail and Posture IQ 0 / 7 / 5 on the 12-area scorecard. 34 incorrect, 5 outdated and 16 unsourced regulatory and provider statements.  **Goal:** one accelerator, Sovereign IQ, that passes all 13 areas (area 13, report defensibility, added 14 Oct 2026), with "posture" as its compliance-exposure view.

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
| S7 | Sovereign Cloud Advisory and platform playbook (revised 26 Oct 2026) | S3, S6; WS-S3 | Placement matrix for AWS, Azure and Google Cloud: each kind of data has a required level, minimum rung, gap and actions; every finding with a technical remedy has entries for each platform the client selected, each with a verification step |
| S7b | SEAL view (added 26 Oct 2026) | S3, S6; S7 for tender criteria | SEAL wording verified; per-class minimum SEAL per objective, objective support and tender check on a SEAL tab and in the report; no provider SEAL rating |
| S8 | How LTM can help and SOW | S7, S7b; WS-S5 | Every finding mapped to a typed offering with scope range and execution outline; consultant-only SOW export |
| S9 | AI on Bedrock with toggle | S6; WS-S1 | Off by default; per-engagement toggle; grounding check passes 100% of the eval set; prompts and outputs logged |
| S10 | Client-data protection and legal counsel gate | S2–S9 (incl. S7b); WS-S6 | Transfer basis, TIA, privacy notice, retention live; counsel sign-off for EU/UK, US and APAC |
| S11 | Re-score against all 13 areas | S0–S10 | Validation report re-issued with all 13 Pass, or Partials accepted in writing |

S0 starts now and does not wait for any decision. S2 content research can run beside S1. S5–S8 can run in parallel once S3's contract is fixed. **Order from 26 Oct 2026 (D18):** owner review of Gate S6, then S7, with S7b beside it once the SEAL wording is verified; then S8. S9 needs WS-S1; S10 needs WS-S6.

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

**Status (14 Oct 2026): content complete, for the owner's review.** Prepared by `sovereignty-compliance-lead` (advises; the owner approves; counsel reviews before external use, S10). Not legal advice.

| Measure | Result |
|---|---|
| Regime registry | [`regimes.json`](../../../packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json): **42 regimes** (15 EU and UK, 10 US, 17 APAC; no GCC), 94 applicability rules, 76 regime-required control rows, 3 legal level floors, version 1.0.0, status as of 14 Oct 2026. Validates against `design/regime.schema.json` (with `facts.schema.json`). Every rule, required control, floor, obligation, date and penalty tier carries claim IDs, and each has a computed verification status. The five archetypes in `archetypes.json` give the same 52 expected regime grades and rule IDs, and no rule fires that is not expected |
| Claims register | [`claims-register.json`](../../../packages/engine-core/src/claims/claims-register.json): **200 claims, CLM-SOV-001 to 200**: **V 67, S 92, P 28, UNSOURCED 13**. Of these, 26 are volatile with review by 12 Jan 2027: FISA 702, the DPF appeal, AI Act Omnibus dates, NIS2 transposition, the UK CTP list, DPDP phase-in, the CSR Bill, MAS consultations, US state laws and the 10 ECB rates. The CCPA amounts are also reviewed by 12 Jan 2027, because the CPPA adjusts them in January 2027. All other claims are reviewed by 14 Oct 2027. `node scripts/check-claims.cjs` and `npm run check:repo` pass |
| Verification by regime | Worst status across the citation and the sourced applicability rules: V 7, S 24, P 11. Three rules are UNSOURCED and are consultant-only: `FR_SECNUMCLOUD.3` (OIV), `DE_C5.2` (public sector) and `KR_PIPA.2` (foreign businesses). One required-control row is pending a source: `US_NYDFS_500` / `SOV.GOV.OWNER`. One floor is provisional: the `CN_PIPL` volume floor |
| Exchange rates (Q10) | ECB reference rates of 12 Oct 2026 for USD, GBP, JPY, AUD, CNY, HKD, INR, KRW, NZD and SGD. Each non-EUR penalty note cites its rate |
| Method | EUR-Lex, legislation.gov.uk, eCFR, gov.uk and regulator sites refuse direct fetches from this environment (proxy policy). Verification therefore uses web-search results that quote or link the official text, and each claim's notes say so |

**Corrections against S1 or the old knowledge bases (most important):**
- The UK CSR Bill is at **Lords report stage (26 Oct 2026)**, after Lords committee stage ended on 7 Sep 2026. It is not law. S1 had it at Commons third reading.
- The UK CTP regime is in **FSMA 2000 ss.312L–312Z**, inserted by FSMA 2023. It is not "FSMA 2023 Part 9" (row 44).
- The UK NIS fines are **£1M / £8.5M / £17M** (reg. 18(6)). The £3.4M tier is not in the current text and has been removed.
- Post-DUAA, UK transfers rest on a new **Art. 44A and the "data protection test"** (DUAA Sch. 7). The 4.3 reference "Art. 44–49" is out of date for the UK.
- NIS2 Art. 4 and DORA as lex specialis (DORA Art. 1(2), recital 16) are sourced at S. NIS2 registration and national provisions can still reach DORA entities. Q6 (advisory) stands.
- NIS2 Art. 6(30) and recital 33 cover SaaS as a cloud computing service (S), which supports Q9. Cloud providers stay subject to the size cap.
- NIS2 transposition: the Commission referred IE, ES, FR and NL to the Court of Justice on 8 Jul 2026. About 21–24 of 27 member states have a law in force (trackers conflict).
- The **SecNumCloud trigger** is SREN Art. 31 for State bodies and listed public interest groupings, plus the "cloud au centre" circular, plus a 5 Feb 2026 circular on health data. The **C5 trigger** is SGB V § 393 for German healthcare providers, insurers and their processors (Type 2 attestation from 1 Jul 2025). OIV and German public-sector triggers stay UNSOURCED.
- The **CRA** is now sourced (S): reporting from 11 Sep 2026, full application from 11 Dec 2027, fines €15M/2.5%, €10M/2% and €5M/1%.
- AI Act GPAI duties applied from 2 Aug 2025 and Art. 101 GPAI fines from 2 Aug 2026. Two new Art. 5 prohibitions apply from 2 Dec 2026.
- FISA 702: still no reauthorisation as of 14 Oct 2026. The House passed a bill in April 2026. Existing certifications are reportedly valid to about Mar 2027.
- The DPF appeal C-703/25 P is pending, with no hearing date reported. The decision stays in force.
- The **DOJ DSP penalty** is the greater of $368,136 or twice the transaction, and wilful violations are criminal (28 CFR 202.1301). It is now modelled as per-violation.
- **CCPA, GLBA and NYDFS** required controls are now sourced (S) and will score: § 1798.100(d)–(e) and § 1798.150; 16 CFR 314.4(c)(3), (f) and (j); 23 NYCRR 500.11, 500.15 and 500.17. NYDFS 500.4 stays pending.
- **MAS**: Notice 658 and the Guidelines on Outsourcing (Banks) took effect on 11 Dec 2024 (V). Their content is sourced at S. The amended TRM Notices (consulted 10 Jun 2026) and the TPRM Guidelines (consulted Mar 2026) are not final.
- **HKMA** (row 67): the relevant modules are SPM TM-G-1, SA-2 and OR-2 plus the cloud guidance of 31 Aug 2022. TM-E-1 is e-banking.
- **Singapore Cybersecurity Act**: amendment provisions came into force on 31 Oct 2025. The new penalty regime is not yet in force.
- PIPL Art. 66: RMB 50M or 5% of prior-year turnover (row 69, now S). The law does not say whether turnover means worldwide or China-only.
- **CAC 2024 Provisions**: a security assessment is needed above 1M individuals, or 10k individuals for sensitive data. Below 100k non-sensitive, no mechanism is needed. These thresholds are not the Art. 40 storage threshold, which stays UNSOURCED.
- **India SEBI**: the 2023 cloud framework requires data, logs and DC/DR copies to stay in India (S). The CSCRF localisation standard is in abeyance. CERT-In requires logs to be kept 180 days within Indian jurisdiction (P).
- **India DPDP**: Rules notified 13 Nov 2025. The main duties apply from 13 May 2027 (14 May on the later reading). There is a ₹200 crore tier for failing to notify a breach.

**Validation table (section 7) disposition, as far as the registry is concerned.**
- **Corrected in the registry:** rows 4–7, 11, 13, 19, 21, 23, 25–28, 31, 32, 34, 36, 38, 40–45, 47, 49, 51, 53, 56, 57, 62–64, 67, 70, 71 and 82.
- **Sourced:** rows 44 and 69 (at S).
- **Removed, not in the registry:** rows 15 (CER), 22, 35, 46 (SS1/23), 50 and 83 (default turnover, D4).
- **Kept as UNSOURCED and consultant-only:**
  - row 52 (NDAA § 889, a candidate basis for `SOV.HW.PROVENANCE`, which stays unscored);
  - row 54 (MAS penalties).
- **Outside the registry:**
  - rows 73–74 (GCC, D1);
  - rows 75–81 (cryptography and provider statements). S0 hid or removed them; any reuse is sourced in S7.

**UNSOURCED (13 claims, consultant-only, each with what settles it):**

| Claim | What it says | Why it is unsourced |
|---|---|---|
| CLM-SOV-046 | No localisation in DORA, NIS2, CPS 230/234 or MAS TRM | A negative statement, for counsel to confirm |
| CLM-SOV-073 | French OIV must use SecNumCloud | No legal text found |
| CLM-SOV-075 | German public sector must use C5 | No legal text found |
| CLM-SOV-087 | No statutory maximum for PRA breaches | FSMA penalty provisions not retrieved |
| CLM-SOV-124 | NYDFS 500.4 | Text not retrieved |
| CLM-SOV-125 | NYDFS penalty basis | Text not retrieved |
| CLM-SOV-129 | NDAA § 889 | Not verified |
| CLM-SOV-140 | MAS penalties | Not verified |
| CLM-SOV-142 | Singapore CII reporting window | Not verified |
| CLM-SOV-156 | SOCI penalties | Sources conflict |
| CLM-SOV-171 | CERT-In fine amount | Possible Jan Vishwas amendment |
| CLM-SOV-183 | Korea PIPA extraterritorial reach | Not verified |
| CLM-SOV-189 | PIPL Art. 40 volume threshold | Not verified |

The 28 P claims cite a primary URL whose article text was not re-read. They are mainly GDPR Art. 28/30/32, NIS2 Art. 20/21 and 2(2)(f), the AI Act operator articles, DORA Art. 31–35, UK GDPR articles post-DUAA, UK NIS reg. 11, SS2/21 chapters, HIPAA Part 164 and 102.3, GLBA, SEC Item 106, EO 14086, the MAS TRM Guidelines, the Australian NDB scheme, CPS 230 service-provider paragraphs, DPDP s.8, CERT-In scope and PIPL Art. 3. The 92 S claims rest on secondary sources. All of them need counsel review at S10.

**Changes to the approved design (DESIGN.md not edited; each needs the owner's decision):**
1. **New derived fact `derived.all_location_zones`.** This is the union of primary and backup zones across classes. The `us_coc_link` predicate needs it, because the condition language cannot iterate the `data.location` map. It is to be added to `facts.schema.json` in S3. New named predicates: `nis2_sector`, `us_coc_link_possible` (a location of `other`) and `non_us_people`.
2. **Rule-level and floor-level UNSOURCED guard.** DESIGN 4.3 says unsourced required-control rows do not score. S2 extends this: an UNSOURCED rule (`FR_SECNUMCLOUD.3`, `DE_C5.2`, `KR_PIPA.2`) or floor (the `CN_PIPL` volume floor) is consultant-only and hidden in client mode, and the floor is shown as provisional. Recommended: accept.
3. **Possible new legal floor for `IN_SEBI_IRDAI`.** The SEBI 2023 cloud framework requires data to stay in India (S). The regime stays advisory in v1 with no floor, because the CSCRF localisation standard is in abeyance and the IRDAI wording is unclear. Recommended: keep advisory until counsel confirms.
4. **Rule shape changes:**
   - `FR_SECNUMCLOUD` is split into three rules (public sector, health, OIV), each advisory.
   - `DE_C5` is split into two (health, public sector).
   - `SG_CYBERSECURITY_ACT.1` is raised from advisory to **applies** for designated CII owners, with `SOV.IR.REPORTING` required. The reporting window is pending.
   - `US_DOJ_DSP.1` also covers genomic, biometric and precise-geolocation data at ≥10k volume.
   - No archetype outcome changes.
5. **Required-control changes against 4.3:**
   - Rows that now score: US_CCPA, US_GLBA, US_NYDFS_500 (except GOV.OWNER) and the MAS outsourcing rows. They were UNSOURCED in 4.3 and are sourced now.
   - New rows: IN_DPDP `SOV.ENC.BASELINE` and `SOV.IR.REPORTING` from 13 May 2027 (s.8(5)–(6)); SG_CYBERSECURITY_ACT `SOV.IR.REPORTING`.
6. **Penalty model changes against 5.4:**

   | Regime | Change |
   |---|---|
   | UK_NIS | Tiers revised (see corrections) |
   | HK_PDPO | `fixed` HK$50,000 (s.50A criminal fine) instead of not quantified |
   | US_DOJ_DSP | `per_violation` instead of not quantified |
   | EU_CRA | `turnover_greater_of` (advisory, never used in the headline) |
   | IN_DPDP | ₹200 crore tier added |
   | UK_CTP | One `not_quantified` model with an "applies to CTPs only" note (the schema allows one model) |
   | EU_DORA | `national`, with the CTPP periodic tier listed |

7. **Schema gaps for S3.**
   - `requiredControl`, `levelFloor` and `penalty` have no `claims` array, so their claim IDs sit in the `basis` and `note` text. Recommended: add `claims` arrays.
   - Claim IDs also appear in square brackets in `citation.text` and `basis`. The page should strip them when rendering.
   - The registry file uses the schema's top-level fields (`registryVersion`, `statusAsOf`, `predicates`), not a `version` / `asOf` shape.
8. **Review cadence.** Regimes keep `reviewDays` 90/180 as the schema requires. Claims follow the 90-day / 12-month cycle given for S2. CI enforces the claim dates.

**Gate S2 check.**
- Every registry field has a claim ID: yes.
- A per-regime review is recorded in each `verification` block: yes.
- CI fails on an overdue review: yes (`check-claims.cjs`).
- No validation row is left Incorrect, Outdated or Unsourced: rows 52 and 54 stay UNSOURCED and consultant-only. Rows 75–81 belong to S7, not the registry. **The owner decides whether that meets the gate.**

---

> **Paused here (14 Oct 2026).** The owner prioritised FinOps IQ. Sovereign IQ resumes at S3; the S2 design changes listed above are decided when it resumes.

**Owner decisions on S2 (23 Oct 2026), all as recommended:**
- Design changes 1 to 8 above: accepted, including the rule-level and floor-level UNSOURCED guard (consultant-only, hidden in client mode; the floor shown as provisional).
- `IN_SEBI_IRDAI`: stays advisory with no legal floor until counsel confirms (S10).
- Gate S2: **passed**, with rows 52 (NDAA § 889) and 54 (MAS penalties) left UNSOURCED and consultant-only; counsel settles them at S10.
- Before S3: `sovereignty-compliance-lead` re-verifies the volatile claims as of 23 Oct 2026 (the ECB rates stay a dated reference set).

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

**Status (23 Oct 2026): built, for the owner's approval.** Engine 4.0.0 in `packages/engine-core/src/accelerators/sovereign-iq/v4/`:
- `question-bank.json` (47 questions: 17 executive, 15 workshop, 15 follow-ups; valid against `question.schema.json`), `controls.json` (28 controls, 10 measured in executive mode), `exchange-rates.json` (the ECB rates of 12 Oct 2026, from the claims register), `conditions.ts` (the condition language), `facts.ts` (answers to facts and derived facts), `evaluate.ts` (applicability, requirement levels, control states, maturity, exposure, findings, roadmap) and `contract.ts` (request validation).
- Tests: `packages/engine-core/test/sovereign-iq-v4.test.ts`, 159 tests. Data files against their schemas; contract; **all 94 applicability rules, each positive and negative**; the five archetypes in both modes; golden outputs (`test/golden/sovereign-iq-v4.json`); invariants over 300 random questionnaires (no NaN, maturity 0-100, monotonic, unknown and blanks never score above the lowest answer, provider nationality never changes maturity below L4, scope answers never scored, every required control's question is asked, executive results hold only executive controls, findings from gaps only, roadmap dependencies respected). Full suite 784 tests pass; type check, claims and repository checks pass.
- The current Sovereign IQ and Posture IQ pages and engines are unchanged. The `evaluate-posture-iq` route switch (item 1) moves to S5, with the new page.

**Archetypes against the outcomes written before the engine (DESIGN.md section 10).** Required levels, maturity (score, band and controls assessed, both modes), regime grades and rules, exposure RAG, largest cap and the top five gaps match for all five archetypes, with two differences:

| Archetype | Expected | Engine | Why |
|---|---|---|---|
| ARC3, ARC5 | US_CCPA not RAG-rated | Amber | S2 sourced the CCPA required controls, so they score (S2 design change 5, approved 23 Oct 2026). Maturity is unchanged: GDPR already requires the same controls |
| ARC3 | Largest cap EU_GDPR EUR 20M | UK_GDPR GBP 17.5M (about EUR 20.7M) | DESIGN 7.2 takes the highest computable cap among regimes that apply **or likely apply**; UK_GDPR is likely_confirm for ARC3. The cap now carries its regime's grade, so the report can say "likely – confirm". **Owner decision (23 Oct 2026): keep the rule as written**, with the cap labelled by its regime's grade |

**Gate S3: approved by the owner on 23 Oct 2026.**

**Choices made while building (for the compliance lead's review in S4):**
1. **Personal transfer test.** Storage counts as a transfer only for people in regions that restrict transfers. The engine's no-transfer zones are: EEA and UK (each other, Switzerland, Canada, Japan, South Korea, New Zealand), Switzerland, Japan and New Zealand (each with the EEA and UK), South Korea (with the EEA), Singapore, Australia and China (own region only). US, Canada, India (until s.16 notifications), Hong Kong (s.33 not in operation) and "other" restrict nothing. These adequacy pairings are LTM's working list and need sourcing in S4.
2. **B5 (ICT register) trigger** extended to "any regime requiring the register is applies or likely_confirm" (DORA, PRA SS2/21, CPS 230, MAS). The random-questionnaire test found that a likely_confirm DORA or CPS 230 required the register while B5 was not asked.
3. **Location controls** (`SOV.RES.LOCATION`, `SOV.BACKUP.LOCATION`) are derived: D3 (scope) against the allowed zone. They are scored controls, but no scope answer is scored by itself.
4. **Combined control** (`SOV.CONC.PROVIDER`, lower of X2 and B6): a question the mode did not ask is left out; one asked and left blank counts as not answered (scored 0). The invariant test found that the first version let a blank B6 raise maturity.
5. **Caps from the turnover band** (Q2) are shown as a range in euros. A band where the fixed limb wins at both ends is shown as one figure. Limbs on a turnover the assessment never collects (Singapore turnover, Australian adjusted turnover, Korean related revenue) are not computed; the fixed limb is shown alone.
6. **Executive "n of N required controls assessed":** N is the number of controls the executive requirement (one level for all classes) would need in a workshop.

**No Sovereign or Posture behaviour lost without a reason:** the old-to-new question map and the list of retired behaviours are DESIGN.md sections 6.7 and 12 (approved at S1). The engine implements them; nothing else from the old engines is carried.

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

**Status (25 Oct 2026): done, for the owner's approval.** Engine 4.1.0, registry 1.1.0.

- **Reference scenarios (item 4).** `sovereignty-compliance-lead` wrote ten from public material, with expectations written from the sources and the DESIGN rules before the engine ran (`design/reference-scenarios-s4.json`): Meta 2023 (Irish DPC / EDPB 1/2023), Uber 2024 (Dutch DPA), the Austrian and French Google Analytics decisions, an EU investment firm under DORA, an Indian ICT provider designated a DORA CTPP, an Australian insurer under CPS 230/234, an EU body in the Commission's 2026 SEAL tender, a UK building society using designated CTPs, a US health company under the DOJ Data Security Program, and Mastercard under RBI localisation (2021). The engine reproduced every rule-derived expectation (grades, levels, gaps, severities, RAG). The scenarios are now tests.
- **Where the design disagreed with the regulators** (26 points), the owner decided on 25 Oct 2026:
  - *Applied:* DORA's financial-entity duties no longer bind a designated CTPP (S4REF05: false High and DORA red removed); a legal localisation floor beats the workshop regions, with a conflict finding; the B3 trigger matches AU_SOCI.2's sectors; contractual clauses, the IDTA or Addendum, and BCRs are capped by the transfer assessment (T2 complete 3, partial or none 1, new answer "risks not closed" 0: Meta and Google Analytics now give no basis or a partial one, as the regulators found); the transfer-country pairings are sourced (CLM-SOV-201 to 219): Switzerland adds New Zealand and Canada; New Zealand and Canada restrict nothing for storage; Japan and Australia stay conservative, with a note on the result. The DOJ penalty was already modelled per violation (no change).
  - *Backlog (after S5 and S6):* EU institutions under Regulation 2018/1725 and outside NIS2 (new regime and B1 option); CTPP's own obligations (Art. 31(12) subsidiary, Lead Overseer); a control for notifying the regulator before offshoring (CPS 230 para 61, SS2/21 ch. 5); regulator access rights in V4; DORA Art. 30(2)(b) data-location terms (SOV.TP.VISIBILITY as a DORA control) and audit-right weight; an "as at" assessment date; FISA 702 linked to the transfer test; non-EU controllers collecting directly (EDPB 05/2021 Example 1); DOJ DSP prohibited vs restricted transactions and the CISA security requirements; RBI floor covering customer personal data and FAQ-permitted transient processing; Quebec s.17; finer NIS2 transport sectors; NIS2 transposition status per state; UK_OPRES cross-reference to Resilience IQ; the tender's minimum SEALs (not published).
- **Calibration (items 2-3).** Every band is reachable and no maturity question is dead, in both modes. Workshop: over at least 5 required controls, no single answer moves maturity by more than 20 points except T2 (up to about 28, by design: it records the assessment and caps clauses as a transfer basis). Executive: below 5 measured controls one answer moved the score by 23 to 100 points, so **executive maturity is shown only over at least 5 controls** (owner decision); below that the result lists the controls and findings and says the workshop gives the score. Monotonicity, unknown and blank answers never scoring above the lowest answer, and provider nationality never changing maturity below L4 are tested since S3.
- **Phase 3 decisions (item 6), closed by the v4 model:** 11 exchange rates are dated ECB reference rates in the claims register; 12 Japan and Hong Kong are separate zones, the AI Act SME rule takes the lower limb, DESC left with the GCC content (D1); 13 the Australian 30% limb is never computed (fixed limb shown, stated); 14 no default turnover (D4); 15 Posture IQ's severity-to-score table and pillar weights are retired.
- **Archetype outputs that changed (approved in the golden diff):** ARC5 executive 67 → 52, workshop 45 → 40, SOV.XFER.BASIS High added (SCCs with a partial assessment); ARC2 is asked B3; ARC4 carries the Japan/Australia storage note. ARC1 to ARC4 maturity unchanged.
- Tests: `sovereign-iq-v4.test.ts` 218 tests; full suite 850 pass; claims and repository checks pass.

**Owner decisions (26 Oct 2026):** (a) T2 keeps its weight (up to about 28 points from one answer): a transfer without a valid basis is critical, as regulators judge it. (b) The 5-control minimum applies in both modes: about 3% of workshop results rest on fewer than 5 required controls and show each control's state instead of a number. **Gate S4: approved by the owner on 26 Oct 2026.**

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

**Gate S5: approved by the owner on 26 Oct 2026.** **Status (26 Oct 2026): built beside the current pages.** The merged page is served at `/sovereign-iq-v4` (`Accelerators/sovereign-iq-v4.html`, `assets/sovereign-iq/app.js` and `app.css`, sharing FinOps IQ's design system and charts); the current Sovereign IQ and Posture IQ pages stay live until the owner approves the switch-over.
- **Server:** `POST /api/evaluate/sovereign-iq/v4` (live scoring, dated today on the server; `?view=client`), `GET/POST /api/sovereign-iq/assessment` (save, resume, complete, archive, delete; FinOps IQ's ownership and lifecycle rules; result computed and dated on completion; completed records immutable; 24-month time to live), a `SovereignIqAssessment` model, both behind the Cognito authorizer and the server-side accelerator access check. A Posture IQ permission opens Sovereign IQ (page guard, services and reports archive).
- **Page:** seven question steps from the public schema (no scoring data in the browser; follow-ups from the engine's `asked` list), matrices for regions (A2), data location (D3) and per-class requirement (L2), Review and complete, and a dashboard with the two headlines never blended (maturity, or "no score" under five controls; regulations in scope, exposure RAG, largest cap labelled with its grade) and tabs for overview (required level by data class, control heatmap, top gaps), regulations, controls, findings (severity by wave matrix), roadmap and method. Client mode shows the server's client view: no notes, rule IDs, numeric states, consultant-only items or list of regimes that do not apply. Claim IDs are stripped from displayed registry text.
- **Tests:** `tests/e2e/sovereign-iq-v4.spec.ts` (7): every question asked in both modes answered, follow-ups (T2, I1, B5) appear, complete, both headlines, resume; per-class rows follow D1; client view; Posture IQ permission opens the page; WCAG 2.2 AA on start, steps, review and every result tab; 360px; every control named. Service tests in `manage-sovereign-assessment/handler.spec.ts` (10). Full suites: 863 unit tests and 82 browser tests pass.
- **Left for the switch-over (owner's go-ahead):** `/sovereign-iq` serves the new page and `/posture-iq` forwards to it; the old pages, engines and modules (D5) are removed; the portal tile and Reports filter point to the merged tool. The hosting notice (item 5) is added with S10.

---

## S6: Outputs: executive PDF and technical backlog

**Objective:** the two deliverables a CIO keeps.

| # | Item | Detail |
|---|---|---|
| 1 | Executive PDF (WS-S4) | Server-rendered, LTM Vantage brand. Structure: executive summary (decision, exposure, top five actions), findings, roadmap, How LTM can help, technical execution, methodology and sources (claim IDs, versions, "data provided by", disclaimer, hosting statement) |
| 2 | Backlog CSV | One row per playbook action: finding, control, platform, level, action, verification, owner role, effort, source; Jira later |
| 3 | Trace test | Every number in the PDF maps to an engine field and to a claim or assumption ID |
| 3a | Report defensibility (area 13, added 14 Oct 2026) | "How we calculated this" appendix and assumption register in the PDF; statutory caps shown as caps with their basis, never summed; roadmap with activities, owner role, duration, dependencies, effort, milestones, KPIs and risks; the practice-lead agent's CIO challenge test (ten hardest questions) answered from the report for the five archetypes |
| 4 | Retire | jsPDF client generation, markdown "MARP" deck, TIA markdown export, RoI CSV (a sourced DORA register template can return later from the engine) |

**Dependencies:** S3; WS-S4; S7 and S8 for their sections.

**Gate S6:** visual review of PDFs for the five archetypes; trace test passes; backlog imports cleanly into a spreadsheet.


**Status (26 Oct 2026): built, for the owner's review.** Engine 4.2.0 adds maturity by control area (ten areas in `controls.json`; empty when no headline number is shown).
- **Report** (`v4/report.ts`) in the FinOps IQ format, on the shared report model and PDF renderer: cover and contents; executive summary (lead, five headline figures, "Where to start", decisions and confirmations, the not-legal-advice callout); required level by kind of data; control maturity (bars by area, heatmap by level, the controls); compliance exposure (heatmap by market, the regulations with grade, reason, rating and statutory maximum, foreign-access exposure); findings; roadmap by wave; methodology; sources; consultant checks (consultant edition only: regulations that do not apply with their rule, items pending a source, engine notes, consultant notes). Every number is a traced segment matched to the engine result; registry text cites its claims and no claim ID is shown. The shared renderer gains two chart blocks, `heatmap` and `bars`, available to every accelerator.
- **Backlog CSV:** one row per finding in roadmap order.
- **Service:** `GET /api/sovereign-iq/report?assessmentId=&format=pdf|csv&view=client` (`sovereign-iq-report`), completed assessments only, ownership checked, behind the authorizer and the access check.
- **Page:** Download report (PDF) and backlog (CSV) in the result header; the overview adds a radar of maturity by area, findings by severity and a regulation heatmap by market.
- **Tests:** `sovereign-iq-v4-report.test.ts` (sections, traced numbers, charts, client edition, backlog, PDF renders), report service tests, and a browser test that downloads both files. Full suites: 911 unit tests and 83 browser tests pass.
---

## S7: Sovereign Cloud Advisory and platform playbook (WS-S3)

**Revised 26 Oct 2026 (D15, D17, D19).** S7 was "platform playbook entries". It now also gives clients already on AWS, Azure or Google Cloud a placement plan: for each kind of data, where it should sit and on which kind of provider service. Other platforms get the playbook entries only.

**Objective:** a client already on AWS, Azure or Google Cloud learns, for each kind of data, the level it needs, where it sits today, where it should sit, which kind of provider service fits, and the actions that close the gap. Every finding ends in concrete actions you can check on the platforms the client selected. Providers appear as options driven by the client's requirement, always with alternatives.

### What is built

| # | Item | Detail |
|---|---|---|
| 1 | Catalogue schema (WS-S3) | `platform-playbook.json` with a schema shared with Resilience IQ R10 item 7. One entry per control and platform: approach, service families, verification, owner role, minimum level, source with status (V/S/UNSOURCED), review date, and a "confirm regional availability" flag |
| 2 | Placement ladder | For AWS, Azure and Google Cloud, five rungs from the lightest change to the heaviest (table below). Each LTM level has a minimum rung. The provider offerings named at each rung are sourced from the providers' own documentation by `sovereignty-compliance-lead` |
| 3 | Zone coverage | The ladder is defined for each allowed zone in scope (EU, UK, US, SG, AU, IN, JP and others in A2). Where a provider has no sovereign offering in a zone, the matrix says so and shows the alternatives: another rung, another provider, or private cloud |
| 4 | New question C1 (workshop follow-up) | "For each kind of data on AWS, Azure or Google Cloud, which kinds of service hold it?" Service families: storage and backup, databases, analytics, AI and machine learning, compute and containers, identity and keys, collaboration SaaS (for example Microsoft 365 or Google Workspace). Asked only when P1 includes `aws`, `azure` or `gcp`. A scope question, never scored |
| 5 | Placement matrix (engine) | One row per kind of data and selected hyperscaler: where it sits today (D3, L2), required level, minimum rung, current rung, gap, actions (playbook entries for the failed controls of that class), verification, alternatives. A pure function of the engine result; engine 4.3.0 with a golden diff |
| 6 | Playbook entries for every platform | Every finding with a technical remedy has an entry for each platform in P1. AWS, Azure and Google Cloud get service-level entries; on-premises, colocation, Oracle, IBM, sovereign providers, partner-operated clouds and SaaS get approach-level entries (D17). Initial entries are in the table below |
| 7 | Page | New **Cloud advisory** tab: placement matrix, then actions by platform. Shown in client mode, without notes or source status |
| 8 | Report and backlog | New report section "Sovereign cloud advisory" after Findings. The backlog CSV gains platform, service family, rung and verification columns |
| 9 | Review cadence | Provider offerings change fast. Each offering in the ladder gets a 90-day review (D8) and a named review owner; CI fails on an overdue review |

### Placement ladder (AWS, Azure, Google Cloud)

| Rung | What it means | Minimum for | Examples to be sourced in WS-S3 (provider documentation only) |
|---|---|---|---|
| R0 | Standard region, no sovereignty controls | L0 | Any standard region |
| R1 | Standard region inside the allowed zone, with region guardrails | L1 | AWS Organizations SCP region restriction; Azure Policy allowed locations; Google Cloud resource-locations org policy |
| R2 | R1, plus customer-held keys, provider access approval and the provider's data boundary where one exists | L2 | AWS KMS External Key Store; Azure customer-managed keys with Managed HSM and Customer Lockbox, EU Data Boundary; Google Cloud External Key Manager, Access Approval, Access Transparency, Assured Workloads |
| R3 | The provider's sovereign offering, run by staff in the zone through a local entity | L3 | AWS European Sovereign Cloud (EU), AWS GovCloud (US); Microsoft National Partner Clouds Bleu and Delos (EU), Azure Government (US); Google Cloud Dedicated PREMI3NS by S3NS (France), Google US regulatory packages. Supervised-access offerings (Microsoft Sovereign Public Cloud, Google partner data boundaries) are R2 (D25). Sourced in [S7-SOURCES.md](design/S7-SOURCES.md) |
| R4 | No provider in the chain can be compelled by a law from outside the zone, or the system is disconnected | L4 | Partner-operated cloud with no foreign-parent control, a sovereign provider, private cloud, or a disconnected deployment. **Whether any hyperscaler-linked offering meets R4 is an LTM judgement that counsel must confirm (S10)** |

### Initial playbook entries

| Control | Platform level | Approach, then options (examples to be sourced in WS-S3) | Verification |
|---|---|---|---|
| `SOV.RES.REGION_LOCK` | Platform | Region guardrail policy. AWS: Organizations SCP region restriction. Azure: Policy allowed locations, EU Data Boundary. GCP: resource-locations org policy, Assured Workloads. On-prem: data-centre location register. Sovereign providers (e.g. OVHcloud, S3NS, STACKIT, Scaleway, national clouds): region choice by contract | Policy compliance report shows no regulated data outside allowed regions |
| `SOV.RES.LOCATION` | Stack | Move primary storage and processing of the class into the allowed zone, on the rung its level needs | Location report per class shows only allowed regions |
| `SOV.KEY.CUSTODY` | Platform, stack | Keys held outside the provider for L2+. AWS: KMS External Key Store. Azure: options per service, confirm with Microsoft documentation. GCP: Cloud External Key Manager. On-prem/sovereign: customer HSMs or third-party key managers | Key ownership attestation; revocation test makes test data unreadable |
| `SOV.XFER.BASIS` | Application | Transfer register per flow: adequacy (incl. DPF/UK bridge), SCCs/IDTA with TIA, derogation | Every flow in the register has a basis and review date |
| `SOV.OPS.ADMIN_ACCESS` | Platform, SaaS | Provider access approval and logging (e.g. Customer Lockbox, Access Approval, Access Transparency); sovereign operating models for L3 | Access logs reviewed monthly; zero unapproved access |
| `SOV.OPS.PERSONNEL_ZONE` | Platform | Move the class to rung R3 or above on the current provider, or to a provider operated in the zone | Provider attestation of in-zone personnel and local entity |
| `SOV.BACKUP.LOCATION` | Stack | Backup and replica regions inside the allowed zone; independent keys | Restore test from in-zone copy; location report |
| `SOV.SAAS.SUBPROCESSOR` | Application | Sub-processor register, notification and objection rights | Register complete for critical SaaS |
| `SOV.EXIT.PLAN` | Platform, application | Portability (containers, open formats), exit plan per critical service; referral to Resilience IQ for testing | Exit plan reviewed; partial migration rehearsal |
| `SOV.AI.DATA_LOCATION` | Stack | In-zone model hosting or provider data-zone options; no training on client data | Inference endpoints and logs located in zone |
| `SOV.OPS.OOB_MGMT` | On-prem | Isolated management network, vendor call-home controlled | Network scan shows no unmanaged outbound management traffic |
| `SOV.JUR.IMMUNITY` | Platform | Sovereign landing zone on rung R4: partner cloud with no foreign-parent control, sovereign provider, or private cloud | Landing zone conformance report; counsel view on jurisdiction |

The earlier draft used `SOV.EXIT.TESTED`, `SOV.OOB.MGMT` and `SOV.PLATFORM.TARGET`. These are replaced by the catalogue IDs `SOV.EXIT.PLAN`, `SOV.OPS.OOB_MGMT` and the placement ladder.

**Rules:**
- No "best provider". The matrix shows the minimum rung and every option that meets it, in a fixed order that does not rank providers.
- Provider nationality is a fact, never a score below L4 (D3). The ladder changes the advice, not the maturity score.
- Service families, not individual products (D19). A named product appears only as an example under a family, with its source and review date.
- Application-level plans state that specific designs need technical discovery data (Layer 3) beyond the questionnaire.
- Each entry has a source, owner role, review date and "confirm regional availability" where needed.

**Dependencies:** S3; S6 (report and backlog); WS-S3 catalogue schema (shared with Resilience IQ R10 item 7).

**Status (26 Oct 2026): built, for the owner's review.** Owner feedback (26 Oct 2026) applied: the Cloud advisory appears only when it applies (data at L1 or above on AWS, Azure or Google Cloud); with platform actions only for other platforms it is shown as "Platform actions"; otherwise there is no tab and no report section. The page has a status summary, a placement grid by kind of data and platform, a card per placement not met (rung ladder, gaps, options with availability, alternatives, facts for counsel, collapsible actions) and actions grouped by platform; the report section adds the status summary. Engine 4.3.0 to 4.4.0; ladder 1.1.0 (24 provider options, 4 alternatives, 7 facts-only R4 entries) and playbook 1.1.0 (72 entries on 10 platforms), all from [S7-SOURCES.md](design/S7-SOURCES.md) (CLM-SOV-220 to 270) with decisions D20–D27. Question C1; Cloud advisory tab; "Sovereign cloud advisory" report section; four backlog columns; client mode keeps only content cleared for clients. Tests: `sovereign-iq-v4-advisory.test.ts` including both content gates (no technical gap on any archetype platform; R2 options in every zone, alternatives wherever R3 has none). Open: O1 (AWS per-request approval), O5 (Bleu and Delos status), O6 (local sovereign providers for UK and APAC alternatives), O7 (approach-level examples), O8 (government cloud eligibility).

**Gate S7:**
- Tests confirm: no action without a finding; no selected platform without options; every hyperscaler, zone and level in scope has a minimum rung; every rung option has a source and review date; C1 is never scored.
- 100% of entries sourced and reviewed by `sovereignty-compliance-lead`.
- The owner approves the R4 wording.
- A consultant reviews the placement matrix for the five archetypes.

---

## S7b: SEAL view (EU Cloud Sovereignty Framework)

**Added 26 Oct 2026 (D15, D16).** Puts the SEAL mapping already in the design (DESIGN.md 3.4, D12) in front of the client, as a simple way to explain sovereignty. It uses answers the client has already given; there is no separate questionnaire.

**Objective:** the client sees, in the EU Commission's SEAL 0–4 vocabulary, what level of provider service each kind of data needs, and which of its own controls support each sovereignty objective. SEAL rates a provider's service per objective, not the client, so the view never says "you are SEAL-x".

| # | Item | Detail |
|---|---|---|
| 1 | Verify the source first | `sovereignty-compliance-lead` checks against the Commission's *Cloud Sovereignty Framework* PDF (v1.2.1 or later): SEAL-4 wording and SEAL-3 label (now status S), the eight objectives and the objective weights. Claims register updated; anything not verified is labelled on screen |
| 2 | Explainer | A plain-language SEAL 0–4 ladder beside question L1, also in the report's methodology. Each L1 option shows the SEAL objectives it implies |
| 3 | Engine `seal` block | For each kind of data: the minimum SEAL per objective SOV-2 to SOV-6 from the DESIGN.md 3.4 mapping. An organisation row takes the highest across classes. Engine 4.4.0 with a golden diff |
| 4 | Objective support | For each objective: the client's controls tagged to it (catalogue `seal` field), in place and gaps. Labelled "controls that support this objective", not a rating |
| 5 | Tender minimums (new question L3, workshop follow-up) | "Must you meet minimum SEALs per objective in an EU tender?" Asked when A2 includes the EU and the entity is a public body or supplies EU public bodies. Minimums for SOV-2 to SOV-6 raise the required level by the reverse mapping (3.4); SOV-1, SOV-7 and SOV-8 minimums become provider-selection criteria in the S7 placement matrix |
| 6 | Page | New **SEAL view** tab: the ladder, the per-class table, objective support and tender check. Shown in client mode |
| 7 | Report | New section "EU sovereignty levels (SEAL)" after the required level by kind of data |
| 8 | Wording | Fixed callouts: "LTM mapping, not the Commission's"; "SEAL rates provider services; this is not a SEAL assessment or certification" |

**Not in scope (D16, revised by D20):** LTM never rates any provider's service at a SEAL. The Commission's own published tender results (17 Apr 2026: three awarded bids at SEAL-3, the Proximus/S3NS-based bid at SEAL-2) are shown as dated, tender-specific facts in the consultant view only (CLM-SOV-226).

**Dependencies:** S3; S6; S7 for the provider-selection criteria in item 5 (the rest can run beside S7).

**Status (26 Oct 2026): built, for the owner's review.** Owner feedback (26 Oct 2026) applied: the SEAL view tab shows the SEAL scale with the highest level needed, stepped tracks per objective (tender minimum outlined), a graded grid by kind of data and support bars per objective; the report section carries the same visuals (a new shared `steps` block). SEAL wording verified (CLM-SOV-220 to 227); `seal.json` and `seal.ts`; question L3 with the reverse mapping; SEAL 0–4 explainer beside L1; SEAL view tab; report section "EU sovereignty levels (SEAL)"; the Commission's tender results in the consultant view only (D20). Tests: `sovereign-iq-v4-seal.test.ts` and the report lint.

**Gate S7b:**
- SEAL wording verified (status V), or labelled where not.
- Tests: every class at L1 or above has a SEAL row; the reverse mapping from tender minimums; the language lint rejects "you are SEAL", "SEAL-certified" and any provider SEAL rating.
- The owner reviews the tab and the report section.

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

**Dependencies:** S7 (offerings map to placement rungs: R1–R2 to the sovereign landing zone, R3–R4 to migration to a sovereign platform), S7b; WS-S5 catalogue.

**Status (26 Oct 2026): built, for the owner's review.** Engine 4.5.0. `offerings/sovereign-iq.json` (six offerings from the table above, typed; migration is "advisory, then transformation"; route to Resilience IQ for exit and concentration, consultant SOW only) with CLM-SOV-271; `help.ts` selects offerings from each finding's offering and from the placement matrix (R1–R2 gaps to the sovereign landing zone, rows needing a sovereign offering to migration); outline items keyed to the finding's regulations, controls, rungs and platforms. Page: "How LTM can help" under the roadmap. Report: section after the roadmap; "Statement of work draft" appendix in the consultant edition only. The claims checker now scans the Sovereign IQ catalogues. Tests: `sovereign-iq-v4-help.test.ts`.

**Gate S8:** test: every finding maps to at least one offering; SOW export is consultant-only; language lint passes.

---

## S9: AI on Bedrock with toggle (WS-S1)

**Objective:** optional narrative that never adds facts.

| # | Item |
|---|---|
| 1 | Shared Bedrock service; model set by config; inference in-region in eu-west-1 (D28, replacing D14: ap-south-1 offers only the Global endpoint) |
| 2 | Off by default; consultant switches it on per engagement; the state is shown on the report |
| 3 | Input is the engine result only, with client name and personal data redacted |
| 4 | Grounding check rejects any number, regime, date or provider not in the engine output |
| 5 | Prompt and output log with retention per S10 |
| 6 | Eval set: the five archetypes plus adversarial cases (asking for legal conclusions, asking to name a "best" provider) |

**Dependencies:** WS-S1; S6.

**Status (26 Oct 2026): built, off; region decided (D28: in-region eu-west-1).** Before switching on: enable model access in the Bedrock console (eu-west-1), run the live eval, then set `AI_ENABLED=true`. The shared service (WS-S1) is `packages/engine-core/src/ai/` (grounding check: every number, regulation and provider must be in the input; legal conclusions, provider recommendations, SEAL ratings of the client and sales phrases rejected; one retry with the violations listed, then fail closed) with Sovereign IQ's redacted, client-visible input, lexicon and instructions in `v4/narrative.ts`. Service `sovereign-iq-narrative` (`POST /api/sovereign-iq/narrative`: per-engagement switch and generate) on Claude in Amazon Bedrock (`@anthropic-ai/bedrock-sdk` 1.1.0, `anthropic.claude-opus-5-5`, structured output, client-side refusal fallback to `anthropic.claude-opus-4-8`), behind `AI_ENABLED=false`; prompt and output logged to CloudWatch (1 year until S10). Page: AI card on the Overview (switch, optional focus with the client name redacted, labelled narrative); clients see only grounded text. Report: labelled "Narrative summary (AI-written)" section when present, and the AI state on the cover status line. Tests: `sovereign-iq-v4-narrative.test.ts` (20) and the service spec (5), with a stub model; live eval `scripts/eval-sovereign-narrative.ts` (10 archetype runs plus 8 adversarial focus notes) not yet run.

**Region finding (26 Oct 2026, Anthropic documentation for Claude in Amazon Bedrock):** `ap-south-1` (Mumbai) serves the current Claude models on the **Global** endpoint only, which routes across all regions; it has no regional or in-region option. D14 ("ap-south-1 only, no cross-region inference without approval") cannot be met as written. Options for the owner: (a) Global from ap-south-1; (b) an in-region-only EU endpoint (`eu-west-1` or `eu-north-1`) so inference stays in one EU region; (c) a geography profile (EU, US, JP or AU). The input is the redacted engine result (no client name, answers or notes).

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

## S11: Re-score against all 13 areas

**Objective:** re-issue the validation report for the merged accelerator.

| # | Item |
|---|---|
| 1 | Re-run this agent's review against the 13 areas with fresh evidence (tests, audit, register, PDFs, counsel sign-off) |
| 2 | Re-verify every volatile claim (90-day items) on the re-score date |
| 3 | Consultant dry run with two internal "hostile CIO" sessions: "where is this number from?", "is this legal advice?", "why should I trust a tool hosted in India?" |
| 4 | Owner decision on CIO pilots (booked after all accelerators improve, per FRAMEWORK.md) |

**Gate S11:** all 13 areas Pass, or each Partial accepted in writing by the owner.

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
| 11 | Technical execution | Placement matrix for AWS, Azure and Google Cloud; playbook per selected platform with verification |
| 12 | Commercial pull-through | Every finding in How LTM can help; SOW consultant-only |
| 13 | Report defensibility | Number trace and assumption register complete; no inflated figure; delivery-grade roadmap; CIO challenge test passed for all five archetypes |

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
| D14 | Bedrock region | ~~ap-south-1 only, no cross-region inference without approval~~ **Replaced by D28 (26 Oct 2026): in-region eu-west-1**, as ap-south-1 offers only the Global endpoint | S9 |

### Decisions added 26 Oct 2026

Taken by the product owner on the recommendations in discussion (D15–D19), and on `sovereignty-compliance-lead`'s recommendations after the S7 sources pack (D20–D27).

| # | Decision | Taken | Needed by |
|---|---|---|---|
| D15 | SEAL in the output | A separate SEAL view tab and report section, with a SEAL 0–4 explainer beside L1; derived from existing answers, no separate questionnaire | S7b |
| D16 | Rating providers at a SEAL | Not shown. Revisit only if the Commission publishes provider scores, and then with counsel | S7b, S10 |
| D17 | Sovereign Cloud Advisory scope | Widen S7: placement matrix and service-level entries for AWS, Azure and Google Cloud; approach-level entries for every other platform | S7 |
| D18 | Order | Owner review of Gate S6, then S7, with S7b beside it once the SEAL wording is verified | — |
| D19 | Advisory granularity | Service families, not individual products; named products only as sourced examples with review dates | S7 |
| D20 | D16 after the Commission published its tender SEAL results | Show them as dated, tender-specific facts, consultant view only; LTM never rates a provider | S7b |
| D21 | SEAL-3 label | Framework v1.2.1 "Digital Resilience", with a footnote giving the later label ("Technological Sovereignty") | S7b |
| D22 | L4 mapping row asks for SEAL-4 | Keep it, with a note that the Commission says SEAL-4 is not relevant today; revisit when the framework is updated | S7b |
| D23 | Objective weights | Not shown in the client view; Sovereign IQ computes no Sovereignty Score | S7b |
| D24 | Announced or preview offerings | Shown, labelled; never count as meeting a rung until generally available | S7 |
| D25 | R3 test | R3 only when day-to-day operations and support run in the zone through a local entity; supervised or approved access stays R2 | S7 |
| D26 | R4 wording | Facts only (owner, operator, operator's law, technology supplier), with "Whether this meets R4 is for your counsel" | S7 |
| D27 | US government clouds | R3 for US data, with an eligibility caveat | S7 |
| D28 | Where AI inference runs (replaces D14) | In-region `eu-west-1` (Ireland): inference stays in one EU region, 10% regional premium. ap-south-1 serves current Claude models on the Global endpoint only | S9 |
