# Sovereign IQ (merged with Posture IQ): validation report

**Date:** 13 Oct 2026  **Reviewer:** `sovereignty-compliance-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves, and qualified counsel reviews every regulatory statement before external use.

**Scope:** the two current accelerators, reviewed separately, and the target for the single merged accelerator (Sovereign IQ, with "posture" as its compliance-exposure view).

| | Sovereign IQ (today) | Posture IQ (today) |
|---|---|---|
| Page | `Accelerators/sovereign-iq.html` (10,721 lines) | `Accelerators/posture-iq.html` (7,094 lines) |
| Engine | `packages/engine-core/src/accelerators/sovereign-iq/` (v3.0.0, 21 questions, 26 regimes, 5 pillars) | `packages/engine-core/src/accelerators/posture-iq/` (v2.1.0, 35 questions, 10 regulations, 5 pillars) |
| API | `amplify/functions/evaluate-sovereign-iq/` | `amplify/functions/evaluate-posture-iq/` |
| Tests | `sovereign-iq.test.ts` (40), `tests/e2e/sovereign.spec.ts` (5) | `posture-iq.test.ts` (44), `tests/e2e/posture-iq.spec.ts` (3) |

**Method:** code reading of both pages, engines, contracts, handlers, knowledge bases and the Posture IQ playbook; unit tests (130 passed: `sovereign-iq`, `posture-iq`, `engines`); browser tests (8 passed); `npm run audit:engines` (800 runs per engine, results match `docs/phase3/AUTOMATED_AUDIT.md`); claims-register analysis; web verification of regulatory and provider statements.

**Source access note:** direct fetches of EUR-Lex, legislation.gov.uk, regulator and law-firm sites failed from this environment (DNS resolution blocked). Every verdict below rests on web-search results that quote or link the official source; the URL given is the official source where one was returned, and I say where only secondary sources were available. All sources were checked on 13 Oct 2026. Counsel should re-check the primary texts before external use.

---

## 1. Verdict

**Neither tool is CIO ready, and neither should be shown to a client outside a consultant-led session until the Critical findings are closed.** Sovereign IQ has the stronger idea (multi-jurisdiction applicability, sovereignty architecture options, migration waves) but its page carries a large amount of unsourced and incorrect content outside the engine: a conflict-of-laws simulator that says SCCs are "legally void", an invented peer percentile, a vendor scorecard with made-up scores and price premiums for named providers, contract clauses described as "attorney-drafted", and supervisory "injunction notices" that cite rules that do not exist. Posture IQ is more careful (per-question citations, a disclaimer, sensible penalty logic) but it covers only EU and UK law, sends client names and turnover to third-party AI vendors from the browser with a key stored in the browser, and its playbook contradicts its engine. The two tools overlap heavily (residency, transfers, CLOUD Act, key custody, concentration and exit, AI Act, DORA, NIS2, GDPR), which fails the distinctness test on its own. The merge is the right decision. The merged accelerator should keep Sovereign IQ's applicability model and architecture output, Posture IQ's cited question style and finding structure, and drop most of the Sovereign IQ page's extra modules. Of 85 regulatory and provider statements checked, 34 are incorrect, 5 outdated and 16 unsourced (section 7).

---

## 2. Scorecard

Pass / Partial / Fail per area, for each current tool, and the merged target. Evidence is file and line, test or source.

| # | Area | Sovereign IQ | Posture IQ | Merged target | Evidence |
|---|---|---|---|---|---|
| 1 | Purpose and distinctness | **Fail** | **Fail** | Pass | The two tools assess the same estate with the same probes: "Residency illusion", "SaaS blind spot", "DORA exit cliff", "AI provider reclassification", "on-prem OOB backdoor" exist in both (`sovereign-iq/evaluate.ts:670-693`, `posture-iq/evaluate.ts:110-138`). Neither names one CIO decision or a buyer. No written edge over free alternatives (section 4) |
| 2 | Functionality | Partial | Partial | Pass | Server scoring works and both browser suites pass (8/8). No server-side save and resume: state is in `localStorage` and, for Sovereign IQ, in a base64 share link in the URL (`sovereign-iq.html:2774, 8744-8762`). No backlog export. PDF is client-side jsPDF from CDN (`sovereign-iq.html:9-10`). Sovereign IQ has no "every question renders" test (Posture IQ does, `posture-iq.spec.ts:48`). Sovereign "exam challenges" read facts the engine never sets (`dora_critical`, `exit_strategy_tested`, `has_exit_plan`), so two of them always fail for real clients (`sovereign-iq.html:9819-9843`) |
| 3 | Questions and answers | **Fail** | Partial | Pass | Sovereign: no "Unknown" option on any of 21 questions (`knowledge-base.json` questions); no per-question citation; Japan and Hong Kong combined in one option, which then triggers China PIPL (`evaluate.ts:256`); Australia and New Zealand combined but NZ has no regime; options such as "OVHcloud, Hetzner" are labelled "domestic" for every client (`knowledge-base.json` Q4.1). Posture: every question has `refs`; "unknown/unsure" exists on A1, C2, F1, G2 only; EU/UK-only wording; no US or APAC questions |
| 4 | Depth | Partial | Partial | Pass | Both have flash/workshop modes on one engine. Sovereign flash still asks the scoring core with no follow-ups beyond six probes. Posture flash (A1, A2, B1, C1, D1, E1, G1, H1) is mostly scope questions, so a flash score rests on 4 scored answers (`posture-iq/knowledge-base.json` flashQuestions) |
| 5 | Scoring engine | Partial | Partial | Pass | Audit: Sovereign maturity 20–85, all bands reached, missing-data shift +0.36; Posture 35–82, missing-data shift −0.01 (`docs/phase3/AUTOMATED_AUDIT.md:165-231`). Design faults: Sovereign scores provider nationality as maturity (Q4.1 US provider = 30, national = 95) whatever the client's actual requirement; key custody (Q6.1) counts in both P2 and P4 (`evaluate.ts:316`); "pure cloud, no OOB" scores 70 (Q5.2). Posture P1 "Statutory scope" is unassessed in all four golden demos (`test/golden/posture-iq.json`) and scores a scope answer (A3 data-subject geography) as maturity. Golden outputs not lead-approved (`docs/phase3/SCORING_AUDIT.md` decisions 1, 11–15 open) |
| 6 | CIO alignment | Partial | Partial | Pass | Both lead with money and risk. Sovereign roadmap actions have owners and horizons but four Wave 1–4 actions are shown to every client regardless of answers (OOB audit, contract novation, SecNumCloud certification, annual TLPT; `evaluate.ts:628, 640, 659-662`). Heavy jargon without consequence ("hypervisor memory scraping", "INJUNCTION NOTICE") |
| 7 | Output | **Fail** | Partial | Pass | Sovereign PDF has no disclaimer, no methodology or sources panel, and shows a percentile the engine does not compute (`sovereign-iq.html:7442-7462, 8429-8770`). Posture PDF carries the disclaimer (`posture-iq.html:6262`) but no methodology or sources panel. Neither produces a backlog or a "How LTM can help" section typed advisory/implementation/transformation |
| 8 | Sources | **Fail** | **Fail** | Pass | Claims register: 104 Sovereign rows and 63 Posture rows, all `unreviewed`, 0 with a citation, 0 with an owner (`docs/claims-register/claims-inventory.csv`). The register reads only the engine and KB files, so the Sovereign page's own datasets (conflict simulator, dossiers, exam challenges, horizon events, vendor benchmarks, peer benchmarks, legal clauses) are not in it at all |
| 9 | Legal validity | **Fail** | **Fail** | Pass | 34 incorrect, 5 outdated and 16 unsourced statements (section 7). Sovereign page has no "not legal advice" disclaimer on screen or in the PDF (the KB has one at `knowledge-base.json` meta, but the page does not show it). No US regimes at all in either tool. Client-data handling (Mumbai hosting, S6) is not documented anywhere a client sees. No counsel review |
| 10 | AI scope and toggle | **Fail** | **Fail** | Pass | Sovereign: provider dropdown and API-key field still on the page; browser calls to Gemini, OpenAI and Anthropic remain in code, dormant because `INTERNAL_AI_CONFIG.apiKey` is empty (`sovereign-iq.html:2713-2722, 4551-4600, 5623-5740`); "Copy Prompt Pack" exports client data for pasting into an external model. Posture: live BYOK, key stored in `localStorage`, client name, sector and turnover sent to the vendor, no grounding check (`posture-iq.html:6351-6580`). CSP allows all three vendor domains (`customHttp.yml:14`) |
| 11 | Technical execution | **Fail** | **Fail** | Pass | No platform-in-scope question in Sovereign; Posture C1 records platforms but nothing maps findings to platform actions. Sovereign roadmap gives generic actions (HYOK, Customer Lockbox, confidential computing) with no per-platform options and no verification step. No shared playbook entries exist (`docs/IMPROVEMENT_PLAN.md` §5.1 not started) |
| 12 | Commercial pull-through | Partial | Partial | Pass | Sovereign: three fixed offerings for every client, not tied to findings (`evaluate.ts:497-518`); SOW export; PDF teaser names a partner and email and promises "attorney-drafted covenants" (`sovereign-iq.html:8590-8600`). Posture: SOW export, but prices ($160K–$380K) and an "advisory hedge ratio" against a hard-coded $185K fee are in the client view (`posture-iq/evaluate.ts:489-491`, `posture-iq.html:5037, 5281-5350`); "In Big 4 advisory workshops…" (`posture-iq.html:5076`). Reads as sales |

**Totals:** Sovereign IQ 0 Pass, 6 Partial, 6 Fail. Posture IQ 0 Pass, 7 Partial, 5 Fail.

---

## 3. Findings

Ranked Critical, High, Medium. "Consequence" is for a CIO or for LTM.

### Critical

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| C1 | **Incorrect transfer law on screen.** The conflict simulator says SCCs are "legally void under Schrems II unless paired with STM"; the FISA 702 regime "invalidates standard cross-border transfer mechanisms"; HYOK makes a US warrant "legally unenforceable"; GDPR Art. 48 is "breached" by using a US provider; the EU–US pair ignores the Data Privacy Framework and the UK–US pair ignores the UK data bridge | `sovereign-iq.html:5940-5958, 9807-9809`; `sovereign-iq/knowledge-base.json:474, 486` | A General Counsel will spot these in minutes. LTM loses the advisor seat and risks being accused of misleading advice | Remove the simulator and the exam challenges from the client view. Rebuild transfer logic as a sourced "transfer basis" check: adequacy (incl. DPF 2023/1795 and UK SI 2023/1028), SCCs/IDTA with TIA, derogations | Schrems II (C-311/18) summary; DPF decision; UK data bridge (section 7 rows 31–36, 47) |
| C2 | **Browser AI with client data.** Posture IQ sends client name, sector, turnover and findings to Gemini/OpenAI/Anthropic from the browser using a key kept in `localStorage`. Sovereign IQ keeps the same code and a visible key field | `posture-iq.html:6351-6580`; `sovereign-iq.html:2713-2722, 5623-5740`; `customHttp.yml:14` | Client data reaches third-party AI vendors with no LTM contract, no logging and no grounding. A sovereignty tool doing this undermines its own message | Delete all BYOK code, UI and the "Copy Prompt Pack"; remove vendor domains from CSP `connect-src`; AI only via shared S1 Bedrock service, off by default | FRAMEWORK.md decision "AI" |
| C3 | **Invented benchmarks and vendor scores.** The page computes a "Xth percentile vs peers" from hard-coded peer data although the engine deliberately withholds it; the "Sovereign Cloud RFP scorecard" scores AWS, Microsoft, Google, Oracle 82–88/100 with price premiums (+20% to +35%) and negative claims about named providers ("residual telemetry to Redmond parent") | `sovereign-iq.html:7389-7462, 9373-9460`; `knowledge-base.json:651` | Unsourced statements about named vendors are a defamation and neutrality risk; a CIO who asks "where is this from?" gets no answer | Remove peer percentile and vendor scorecard. Provider options appear only in the playbook, from the client's requirements, with alternatives and official documentation links | Trusted sources policy; FRAMEWORK.md "Data" |
| C4 | **Legal drafting and legal-sounding verdicts.** Four contract clauses ("Mandatory Motion to Quash", "liquidated damages 1.5% per week", "Pursuant to EU Data Act Article 32… zero egress fees") are exported as a pack; the PDF promises "attorney-drafted covenants"; exam challenges issue "INJUNCTION NOTICE (FAIL)" | `sovereign-iq.html:6730-6828, 8597, 9794-9870` | LTM is not acting as a law firm. Clause text cites the wrong article (Art. 32 is government access; switching charges are Art. 29) | Remove clauses and "injunction" language. Replace with "questions to take to counsel" | Data Act Art. 29 and 32 (rows 25–26) |
| C5 | **Outdated dates that change the advice.** AI Act high-risk "HARD STATUTORY CLIFF 2 Aug 2026" (deferred to 2 Dec 2027 by Regulation (EU) 2026/1744); India DPDP "ENFORCED · Active 2025" (most duties start 13 May 2027); UK CTP "may be designated" (four designated, effective 13 Jul 2026); FISA 702 shown as settled (statutory authority lapsed 12 Jun 2026); DUAA "phased reforms" (main data protection changes in force 5 Feb 2026) | `sovereign-iq/knowledge-base.json:595-598, 631, 192`; `sovereign-iq.html:9628-9631`; `posture-iq/knowledge-base.json:3645` | Wrong urgency in the roadmap; a CIO in a regulated firm will know the current dates | Correct now (phase S0), then hold every date in the claims register with a 90-day review for volatile items | Rows 6, 42, 45, 51, 62 |
| C6 | **Overlap between two LTM accelerators.** Same probes, same regimes, same buyer | Section 4 | Fails area 1 for both; confuses consultants and clients | Merge (owner decision taken). One engine, one regulation model | FRAMEWORK.md |
| C7 | **No regulatory content for the US**, one of the owner's four markets. Selecting "United States" sets `geo_us` but no regime reads it; Posture has no US content | `sovereign-iq/evaluate.ts:96-274` | The tool cannot serve US clients or US data flowing to EU/APAC | Add US regimes (section 7 "missing regulations") with applicability rules | DOJ 28 CFR Part 202; CCPA |

### High

| # | Finding | Evidence | Consequence | Recommended fix | Source |
|---|---|---|---|---|---|
| H1 | **Applicability rules too broad.** NIS2 "applies" to any EU firm in five sectors, with no size-cap rule; India DPDP and RBI payment localisation apply to any firm in India; SOCI applies to any Australian firm; China PIPL fires for Japan/Hong Kong | `sovereign-iq/evaluate.ts:119, 223-231, 256` | Overstated exposure; the CIO stops trusting the regime list | Entity classification questions per regime (size, sector/subsector, licence type, payment system operator, CI asset) and "likely – confirm" grades | NIS2 Art. 2–3; RBI FAQ; SOCI |
| H2 | **Scope scored as maturity.** Sovereign scores provider HQ (Q4.1) and "no on-prem" (Q5.2) as maturity; Posture scores data-subject geography (A3). A firm with no sensitive data on a US hyperscaler is marked weak | `knowledge-base.json` Q4.1, Q5.2; `posture-iq/knowledge-base.json` A3 | The score penalises legitimate choices and cannot be defended | Score controls against a **required sovereignty level** derived from data classes and regimes; report the gap, not provider nationality | LTM heuristic (needs lead decision) |
| H3 | **No "Unknown" in Sovereign IQ; missing key-custody answer creates a critical finding.** `!facts.crypto_hyok` is true when Q6.1 is blank, so "Residency illusion" (critical) fires on a missing answer | `evaluate.ts:524, 676` | Conservative, but unlabelled; contradicts the engine's own rule elsewhere (`evaluate.ts:316`) | Add "Unknown" to every maturity question, scored as risk and labelled "unconfirmed" | Scorecard area 3 |
| H4 | **Penalty overstatement.** Posture applies the AI Act €15M/3% ceiling to any internal AI use on personal data; the Posture playbook quotes €35M/7% for training-data residency | `posture-iq/evaluate.ts:408-433`; playbook lines 14, 74 | Inflated "value at stake" | Quantify only when high-risk or Art. 50 duties apply; 7% only for Art. 5 practices; show "cap, not expected fine" | AI Act Art. 99 |
| H5 | **Static commercial output.** Sovereign shows the same three offerings to every client; Posture shows fees and a "hedge ratio" | `sovereign-iq/evaluate.ts:497-518`; `posture-iq/evaluate.ts:489-491` | Reads as sales, fails area 12 | Map findings to the S5 offerings catalogue by control ID; fees only in the consultant SOW | FRAMEWORK.md area 12 |
| H6 | **Claims register empty for these tools and blind to the page.** 167 rows, 0 sourced; page datasets not extracted | `docs/claims-register/claims-inventory.csv` | Area 8 cannot pass | Engine-only content after the merge (no page datasets), every claim by ID (S2) | — |
| H7 | **No disclaimer and no hosting statement in Sovereign IQ.** Client data is stored in AWS Mumbai; India has no EU adequacy decision and no UK data bridge; nothing tells the client | `sovereign-iq.html` (no disclaimer string); FRAMEWORK.md hosting decision | A sovereignty advisor that silently moves EU client data to India loses credibility and may breach GDPR Chapter V | Disclaimer and hosting statement on screen and PDF; S6 transfer basis before external use (section 6 of PLAN.md) | GDPR Ch. V; UK GDPR Ch. V |
| H8 | **Playbook out of sync with engine.** Pillar names and weights differ; probe triggers cite `f3` and `byok-cloud`, which do not exist; BYOK set-up instructions | `Accelerators/POSTURE_IQ_CONSULTANT_PLAYBOOK.md:41-60, 105, 135, 29` | Consultants run the workshop on wrong assumptions | Retire it; write one merged playbook generated from the KB | — |

### Medium

| # | Finding | Evidence | Fix |
|---|---|---|---|
| M1 | PRA operational resilience cited as SS2/21 (it is SS1/21; SS2/21 is outsourcing) in both tools | `sovereign-iq/knowledge-base.json:201`; `posture-iq/knowledge-base.json:162`; `sovereign-iq.html:9599` | Correct citations |
| M2 | Unsourced constants: exchange rates (1.08, 1.27, 0.65, 0.012), default turnovers ($3B vs $250M), downtime ×1.5, remediation 0.04% of turnover | `sovereign-iq/evaluate.ts:62-68, 404-408`; `posture-iq/evaluate.ts:96-98` | Dated reference rates in the register; no assumed turnover (do not quantify) |
| M3 | Sovereign "DR leak" fires for intra-EU replication (Frankfurt→Dublin), which GDPR treats as one area | `knowledge-base.json` Q3.3; `evaluate.ts:592` | Treat EEA, and the UK when it has EU adequacy, as one zone for personal data |
| M4 | Sovereign page duplicates the KB (questions, regimes, probes); questions already drift from the KB | `sovereign-iq.html:2809-3600` vs KB (script comparison: questions differ, regimes identical) | Page reads the public schema only, as Posture does |
| M5 | Error handler returns `error.message` to the client | `evaluate-sovereign-iq/handler.ts:53-57` (same in Posture) | Generic 500 message |
| M6 | GCC content (KSA, UAE, Qatar) outside the owner's four markets; Saudi bank is the main demo and e2e case | `test/golden/sovereign-iq.json`; `sovereign.spec.ts:11` | Owner decision D1 |
| M7 | Hard-coded named partner and email in PDF and SOW | `sovereign-iq.html:8600`; `posture-iq.html:5776` | Engagement lead from the session |
| M8 | Posture default scope when no regulations are selected is EU (DORA, GDPR, NIS2, AI Act) regardless of footprint | `posture-iq/evaluate.ts:258-260` | Derive scope from facts; consultant may override |

---

## 4. Distinctness

### Overlap between the two current tools

| Theme | Sovereign IQ | Posture IQ |
|---|---|---|
| Residency and region | Q3.2, Q3.3 | C1, C2, C3, F1 |
| Transfers and TIAs | Q4.3 | D1, D2 |
| CLOUD Act / FISA, provider jurisdiction | Q4.1, regimes US_CLOUD_ACT, US_FISA_702 | H1, H3, probes 1 and 6 |
| Key custody | Q6.1, Q6.3 | F2, H3 |
| SaaS admin access | Q5.3 | E3, E4, probe 2 |
| Concentration and exit | Q7.1, Q7.2 | F4, I3, probe 3 |
| AI Act | Q2.3 | G1–G3 |
| DORA, NIS2, GDPR, UK OpRes, UK CTP, Data Act, EUCS | regimes | regulations |

About 70% of Posture IQ's scored questions have a Sovereign IQ equivalent. What each adds: Sovereign IQ adds multi-jurisdiction applicability (APAC, GCC), operational sovereignty (personnel, OOB), confidential computing, hardware provenance, architecture archetypes and migration waves. Posture IQ adds the per-category data-location matrix (C2), processor and sub-processor controls (E1, E4), backup encryption, incident-reporting readiness (J1), UK AI governance, entity classification for NIS2 and DORA, and cited findings with remedies.

### The merged accelerator: decision, buyer, USP (recommendation)

- **Decision it informs:** *Where may each class of our data and workloads run, what regulatory exposure follows, and what sovereign architecture and migration path should we fund?*
- **Buyer:** the CIO, with the CISO, DPO/General Counsel and Chief Risk Officer as co-owners of the outcome. In financial services, the head of operational resilience.
- **Other LTM accelerators:** Resilience IQ covers recovery and continuity (keep concentration and exit as a sovereignty finding but hand deep exit testing to Resilience IQ); Cloud IQ covers adoption maturity (its Q8.2 sovereignty flag should point to Sovereign IQ). No other overlap found.

| Alternative (free or provider-led) | What it gives | Sovereign IQ edge (to be built, see PLAN.md) |
|---|---|---|
| Provider sovereignty offerings and assessments: AWS European Sovereign Cloud (GA Jan 2026), Microsoft Sovereign Cloud (public, private, partner clouds), Google with S3NS (SecNumCloud 3.2, Dec 2025) | Each maps your needs to its own platform | Vendor-neutral across on-premises, all hyperscalers and sovereign providers; requirement first, provider second |
| EU Cloud Sovereignty Framework, SEAL-0 to SEAL-4, v1.2.1 Oct 2025, used in the Commission's own 2026 tender | Free procurement scoring of providers | Starts from the client's data and regimes, not from a tender; reuse SEAL objectives as the sovereignty-level vocabulary so outputs line up with EU procurement |
| Free compliance self-assessments: ICO small-organisation checklists, CNIL PIA software | Checklist for one law, one country | Multi-jurisdiction applicability across EU/UK, US and APAC in one pass, with technical actions per platform |
| Consultancy digital-sovereignty maturity models | A maturity stage | Ends in a sequenced roadmap, platform-specific backlog and typed next engagements, each traced to a finding and a source |

The USP worth writing down: **"From your data classes and footprint to a sourced, multi-jurisdiction exposure view and a platform-specific sovereign architecture plan, in one consultant-led session."** This is only true once the regulatory content is correct and the playbook exists.

---

## 5. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | GCC content (KSA, UAE, Qatar) is outside the four markets | Keep as is / keep, flagged "not verified" / remove from v1 | Remove from the client view in v1; keep the data in a design folder until a GCC market is chosen |
| D2 | Headline numbers | One blended score / two headlines | Two: **Sovereignty control maturity** (0–100, against the required level) and **Compliance exposure** (regimes in scope with RAG and the largest single statutory maximum, labelled "cap, not expected fine") |
| D3 | How provider choice is scored | Penalise US providers (today) / score controls against required level | Required level from data classes and regimes; provider jurisdiction is a fact that sets which controls are needed |
| D4 | Turnover when not given | Assume ($3B or $250M today) / do not quantify | Do not quantify; show "not quantified – turnover not given" |
| D5 | Sovereign page modules (conflict simulator, exam challenges, war game, vendor scorecard, legal clauses, CBOM, PQC horizon, RoI CSV) | Keep / rebuild / retire | Retire all from the client view; rebuild only the transfer-basis check and a DORA register of information template later, from the engine |
| D6 | Peer benchmarks | Keep / remove until published data exists | Remove |
| D7 | Fees in client view | Keep / consultant SOW only | Consultant SOW only, as ranges |
| D8 | Volatile items (FISA 702, DPF appeal C-703/25 P, AI Act omnibus, DPDP phase-in) | Normal 6-month review / 90-day review | 90-day review and a "status as of" date on screen |
| D9 | Counsel gate | One EU/UK counsel / per market | EU/UK, US and APAC (SG, AU, IN) counsel review before any external use; consultant-led internal use only until then |
| D10 | Posture IQ URL | Delete / redirect | Redirect `posture-iq.html` to the merged page; keep the old API route for one release, then remove |
| D11 | Client data for EU/UK clients while hosted in Mumbai | Store as today / minimise / no-persistence option | Minimise (respondent email only; client name optional, pseudonymised by default) and offer a "no-store" session for EU/UK clients |

---

## 6. What the accelerator must say about hosting (S6)

Recommended wording for the screen, PDF methodology panel and privacy notice (owner and counsel to approve):

> "LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which does not have an EU adequacy decision or a UK data bridge. LTM relies on [EU Standard Contractual Clauses (Decision (EU) 2021/914) / the UK IDTA or Addendum] and a transfer risk assessment. We collect the minimum personal data needed (your work email). You can run the assessment without saving it. AI features are off unless your consultant switches them on; when on, processing uses Amazon Bedrock in the same region."

The tool must not recommend residency controls to clients while hiding its own transfer. Stating it openly, with the basis, is the credible position.

---

## 7. Regulatory and provider statement verification

Verdicts: **Correct**, **Incorrect** (wrong or materially overstated), **Outdated** (was right, no longer), **Unsourced** (could not verify in this review; what would settle it is in the "Correct statement" column). Date checked: 13 Oct 2026 for every row. "SIQ" = `packages/engine-core/src/accelerators/sovereign-iq/`, "PIQ" = `packages/engine-core/src/accelerators/posture-iq/`, "page" = the HTML file named.

### EU

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 1 | GDPR maximum €20M or 4% of worldwide turnover, whichever higher (Art. 83(5)) | SIQ `evaluate.ts:378`; PIQ `evaluate.ts:357-361` | Correct | As stated; Art. 83(4) tier €10M/2% | https://eur-lex.europa.eu/eli/reg/2016/679/oj (via search results quoting Art. 83) |
| 2 | GDPR €20M/4% for Chapter V transfer breaches | SIQ `knowledge-base.json:172` | Correct | Art. 83(5)(c) | as row 1 |
| 3 | AI Act €35M/7% prohibited practices; €15M/3% high-risk and operator duties | SIQ `knowledge-base.json:141`, `evaluate.ts:374` | Correct | Art. 99(3), 99(4); SMEs: the lower of the two (Art. 99(6)), not modelled | https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-99 |
| 4 | AI Act €15M/3% ceiling applied whenever any AI runs on personal data (G1 = internal) | PIQ `evaluate.ts:408-433` | Incorrect | Ceiling relevant only where operator duties apply (high-risk, Art. 50 transparency from 2 Aug 2026); otherwise "not quantified" | as row 3 |
| 5 | "Compounding penalties up to €35M or 7%" for AI training residency | `POSTURE_IQ_CONSULTANT_PLAYBOOK.md:14, 74` | Incorrect | 7% applies only to Art. 5 prohibited practices | as row 3 |
| 6 | Annex III high-risk obligations apply 2 Aug 2026, "HARD STATUTORY CLIFF" | SIQ `knowledge-base.json:595-598`; `sovereign-iq.html:9622-9631` | Outdated | Regulation (EU) 2026/1744 (OJ L 24.7.2026) defers Annex III to 2 Dec 2027 and Annex I products to 2 Aug 2028; Art. 50 still 2 Aug 2026 | https://eur-lex.europa.eu/eli/reg/2024/1689 (EUR-Lex record lists OJ L 2026/1744); dates from law-firm summaries (Gibson Dunn, Cooley) |
| 7 | GPAI provider transparency obligations start 2 Aug 2026 | `sovereign-iq.html:9631` | Incorrect | GPAI obligations (Ch. V) applied from 2 Aug 2025; fines for GPAI from 2 Aug 2026 | AI Act Art. 113 (EUR-Lex, not fetched); Omnibus summaries confirm GPAI dates unchanged |
| 8 | Annex III items 1 (biometrics), 4 (employment), 5(b) creditworthiness, 5(c) life/health insurance | PIQ `knowledge-base.json:2970` | Correct | As stated | https://eur-lex.europa.eu/eli/reg/2024/1689/oj |
| 9 | GPAI provider duties in Art. 51–56 | PIQ `knowledge-base.json:3130` | Correct | Chapter V | as row 8 |
| 10 | Integrator "may be treated as provider" under Art. 25 | PIQ `knowledge-base.json:3176` | Correct | Art. 25(1): own name/trademark, substantial modification, or change of intended purpose to high-risk | as row 8 |
| 11 | Integrating a GPAI model into a high-risk workflow "can legally reclassify your organisation as an AI Provider with full conformity obligations" | SIQ `evaluate.ts:546` | Incorrect | Only on the Art. 25(1) triggers in row 10; integration alone does not reclassify | as row 8 |
| 12 | NIS2 maximum fines €10M/2% (essential), €7M/1.4% (important) | SIQ `knowledge-base.json:125`; PIQ `evaluate.ts:380`, `knowledge-base.json:888, 909` | Correct | Art. 34(4)–(5); these are minimum maxima, national law may set higher | https://eur-lex.europa.eu/eli/dir/2022/2555/oj (via springlex/presencis text of Art. 34) |
| 13 | NIS2 "applies" to any EU entity in energy, health, public, telco, manufacturing | SIQ `evaluate.ts:119-121` | Incorrect | Needs Annex I/II sector and subsector, medium-size or larger (Art. 2), essential = large Annex I (Art. 3), plus national transposition | as row 12 |
| 14 | NIS2 early warning within 24 hours | SIQ `knowledge-base.json` NIS2 duties; PIQ `knowledge-base.json` J1 help | Correct | Art. 23(4)(a); 72h notification; final report 1 month | as row 12 |
| 15 | Regime named "NIS2 Directive & CER" | SIQ `knowledge-base.json:119` | Incorrect | CER is a separate Directive (EU) 2022/2557, not assessed by the engine | EUR-Lex (not fetched) |
| 16 | DORA financial entities: penalties set under national law (Art. 50–51), no EU-wide cap | SIQ `knowledge-base.json` DORA; PIQ `evaluate.ts:463-471` | Correct | As stated | https://eur-lex.europa.eu/eli/reg/2022/2554/oj |
| 17 | DORA CTPP periodic penalty up to 1% of average daily worldwide turnover (Art. 35(8)), up to six months | SIQ `knowledge-base.json` DORA; PIQ `evaluate.ts:440-446` | Correct | 1% cap is Art. 35(8); six-month limit is Art. 35(7) | https://www.springlex.eu/en/packages/dora/dora-regulation/article-35/ (OJ text) |
| 18 | DORA major incident initial notification within 4 hours | SIQ `knowledge-base.json:111`; PIQ `knowledge-base.json:3732` | Correct | 4h from classification and ≤24h from awareness; intermediate 72h; final 1 month (Delegated Reg. (EU) 2025/301, OJ 20.2.2025) | https://www.springlex.eu/en/packages/dora/rts-ir-regulation/ |
| 19 | DORA TLPT at least every 3 years as a general duty; "annual" TLPT for every client | SIQ `knowledge-base.json:112`, `evaluate.ts:662` | Incorrect | TLPT only for financial entities identified by competent authorities (Art. 26), at least every 3 years | as row 16 |
| 20 | DORA applies from 17 Jan 2025 | SIQ `knowledge-base.json:559` | Correct | As stated | https://www.williamfry.com/knowledge/the-dora-train-pulls-into-the-station-dora-applies-from-17-january-2025/ ; EBA factsheet |
| 21 | DORA sub-contracting RTS "Q1 2025, active enforcement" | `sovereign-iq.html:9590` | Incorrect | Delegated Regulation (EU) 2025/532, OJ 2 Jul 2025, applicable from 22 Jul 2025 | https://www.jonesday.com/en/insights/2025/07/uniform-standards-for-ict-subcontracting-in-eu-financial-sector-new-obligations |
| 22 | "Violating DORA Art. 28(4)… supervisory mandate to novate contracts or cease use within 60 days under daily penalty" | `sovereign-iq.html:9827` | Unsourced | No such provision found; Art. 28(4) concerns pre-contract assessment | as row 16 |
| 23 | CLOUD Act orders "directly violate… DORA Article 28(8)" | `sovereign-iq.html:5940` | Incorrect | Art. 28(8) requires exit strategies for ICT services supporting critical or important functions | as row 16 |
| 24 | Data Act applies from 12 Sep 2025 | PIQ `knowledge-base.json:2194`; SIQ `knowledge-base.json` milestones | Correct | As stated | https://www.springlex.eu/en/packages/data-act/data-act-regulation/article-29/ |
| 25 | Data Act abolishes cloud switching/egress charges from 12 Sep 2025 | SIQ `knowledge-base.json:612`; `sovereign-iq.html:9617-9622` | Incorrect | Art. 29: reduced, cost-based charges allowed until 12 Jan 2027; abolished from 12 Jan 2027 | as row 24 |
| 26 | "Pursuant to EU Data Act Article 32… zero egress fees" | `sovereign-iq.html:6767` | Incorrect | Art. 32 = safeguards on third-country governmental access to non-personal data; charges are Art. 29 | as row 24 |
| 27 | Data Act: "users and providers… must meet switching" rules | SIQ `evaluate.ts:137` | Incorrect | Switching duties fall on providers of data processing services (Ch. VI); customers have rights | as row 24 |
| 28 | Public sector and critical infrastructure "mandate SecNumCloud, BSI C5 or EUCS High" | SIQ `evaluate.ts:162`, `knowledge-base.json:232-237` | Incorrect | No EUCS scheme adopted as of the review date; SecNumCloud and C5 are national schemes required only in specific national contexts | ENISA EUCS page (no adoption found); https://www.eurosmart.com/wp-content/uploads/2025/07/2025_06_19_Enhancing-the-Cybersecurity-Act-to-Finalise-a-Robust-EUCS-Scheme_Final.pdf |
| 29 | SecNumCloud version 3.2 | SIQ `knowledge-base.json:232` | Correct | S3NS qualified to SecNumCloud 3.2 on 17 Dec 2025 | https://www.thalesgroup.com/en/news-centre/press-releases/s3ns-announces-secnumcloud-qualification-premi3ns-its-trusted-cloud |
| 30 | EBA Outsourcing Guidelines EBA/GL/2019/02: register and prior notification for critical cloud outsourcing | SIQ `knowledge-base.json:247-253` | Correct | Still applies; DORA now governs ICT third-party risk for in-scope entities, note the overlap | EBA guidelines page (URL in KB, not fetched) |
| 31 | SCCs "legally void under Schrems II unless paired with supplementary measures" | `sovereign-iq.html:5941` | Incorrect | Schrems II upheld SCCs; exporters assess case by case and add measures where needed (EDPB Recs 01/2020) | https://www.dataguidance.com/resource/definitive-guide-schrems-ii ; EDPB Recs 01/2020 |
| 32 | FISA 702 "invalidates standard cross-border transfer mechanisms" | SIQ `knowledge-base.json:486` | Incorrect | DPF adequacy (Decision (EU) 2023/1795) covers certified US recipients; General Court upheld it on 3 Sep 2025 (T-553/23); appeal C-703/25 P pending | https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework |
| 33 | DPF adequacy, Decision (EU) 2023/1795 of 10 Jul 2023 | PIQ `knowledge-base.json:2087` | Correct | Add: appeal pending at the CJEU | as row 32 |
| 34 | CLOUD Act "directly conflicts with GDPR Art. 48"; provider-held keys trigger "statutory breach of GDPR Art. 48" | SIQ `knowledge-base.json:474`; `sovereign-iq.html:9809` | Incorrect | Art. 48: foreign orders are recognised only via an international agreement. Disclosure risk is assessed under Art. 6 and 44–49; holding data at a US provider is not itself a breach | as row 1 |
| 35 | CLOUD Act exposure means "immediate loss of European regulatory authorization" | `sovereign-iq.html:6401` | Incorrect | No such consequence in GDPR or DORA | as rows 1, 16 |
| 36 | With HYOK a US subpoena is "legally unenforceable against host infrastructure" | `sovereign-iq.html:9807` | Incorrect | The legal obligation remains; HYOK limits what the provider can technically produce | 18 U.S.C. § 2713 (row 46) |

### UK

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 37 | UK GDPR maximum £17.5M or 4%; lower tier £8.7M or 2% | SIQ `evaluate.ts:382`; PIQ `evaluate.ts:365-369` | Correct | Art. 83 UK GDPR and DPA 2018 s.157 | https://ico.org.uk/about-the-ico/our-information/policies-and-procedures/data-protection-fining-guidance/statutory-background/the-maximum-amount-of-a-fine-under-uk-gdpr-and-dpa-2018 |
| 38 | UK operational resilience cited as "FCA PS21/3; PRA SS2/21" | SIQ `knowledge-base.json:201`; PIQ `knowledge-base.json:162` (link labelled SS2/21 points to SS1/21) | Incorrect | PRA operational resilience is SS1/21 (PS6/21); SS2/21 is outsourcing and third-party risk management | https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss |
| 39 | Firms must remain within impact tolerances from 31 Mar 2025 | SIQ milestones; PIQ `knowledge-base.json:2849` | Correct | SS1/21 / PS21/3 deadline | as row 38 |
| 40 | "PRA SS2/21 final cutoff 31 Mar 2025, end of 3-year transitional relief" | `sovereign-iq.html:9599` | Incorrect | SS2/21 applied from 31 Mar 2022; 31 Mar 2025 is the SS1/21 deadline | https://www.bankofengland.co.uk/-/media/boe/files/prudential-regulation/supervisory-statement/2024/ss221-november-2024-update.pdf |
| 41 | "PRA SS2/21 4-hour severe-but-plausible impact tolerance" | `sovereign-iq.html:5958` | Incorrect | Firms set their own time-based tolerances; no 4-hour figure | as row 38 |
| 42 | UK CTP: firms rely on providers that "may be designated" | PIQ `knowledge-base.json:3645`; SIQ `evaluate.ts:154-158` | Outdated | HM Treasury designated Microsoft Ireland Operations Ltd, Google Cloud EMEA Ltd, Amazon Web Services EMEA SARL and Oracle Corporation UK Ltd on 10 Jul 2026, effective 13 Jul 2026 | https://www.gov.uk/government/news/uk-financial-system-strengthened-with-new-safeguards-for-major-technology-providers |
| 43 | Dependency on a CTP "engages HM Treasury oversight and statutory notification obligations" for the firm | SIQ `evaluate.ts:157` | Incorrect | Oversight and CTP rules bind the CTP; the firm keeps its own outsourcing and operational resilience duties | as row 42 |
| 44 | CTP regime is "FSMA 2023 Part 9" | PIQ `knowledge-base.json:813, 3650` | Unsourced | Regime is from FSMA 2023 (confirmed); the Part number was not confirmed | as row 42 |
| 45 | DUAA 2025: "monitoring phased reforms" | SIQ `knowledge-base.json:192` | Outdated | Main data protection provisions in force 5 Feb 2026 (Commencement No. 6 Regs 2026), incl. international transfers | https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-data-use-and-access-act-2025-commencement-dates-and-planned-guidance-for-2026 |
| 46 | PRA/BoE SS1/23 is "model risk management for AI/ML" and the reference for banks and insurers | PIQ `knowledge-base.json:195`, `posture-iq.html:2260`, question G4 | Incorrect | SS1/23 = model risk management principles for banks with internal model approval, effective 17 May 2024; not insurers; not AI-specific | https://www.bankofengland.co.uk/prudential-regulation/publication/2023/may/model-risk-management-principles-for-banks-ss |
| 47 | UK–US transfers need IDTA with "technical blinding"; no mention of the UK data bridge | `sovereign-iq.html:5948-5957` | Incorrect | UK Extension to the DPF in force 12 Oct 2023 (SI 2023/1028) for certified US recipients; otherwise IDTA/Addendum with a transfer risk assessment | https://assets.publishing.service.gov.uk/media/650801f6fc63f60014957399/analysis_of_the_uk_extension_to_the_eu-us_data_privacy_framework.pdf |

### US

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 48 | CLOUD Act § 2713 requires production of data in the provider's possession, custody or control regardless of location | SIQ `knowledge-base.json:473` | Correct | Test is the provider's control; "and subsidiaries" is an overstatement | https://www.justice.gov/criminal/criminal-oia/cloud-act (text via DOJ-hosted copy) |
| 49 | "Motion to quash under CLOUD Act § 2713(h)" | `sovereign-iq.html:9041` | Incorrect | Motion to quash is 18 U.S.C. § 2703(h), limited to qualifying foreign governments with an executive agreement | as row 48 |
| 50 | "Severe criminal penalties for US corporate parents refusing compliance" | SIQ `knowledge-base.json:471` | Unsourced | Contempt is possible; "severe criminal penalties" needs a source | — |
| 51 | FISA 702 permits warrantless targeting of non-US persons outside the US (status not stated) | SIQ `knowledge-base.json:486-488` | Outdated | Substance correct, but the statutory authority lapsed at the 12 Jun 2026 sunset; existing certifications continue for now; reauthorisation pending | https://www.npr.org/2026/06/12/nx-s1-5856291/fisa-702-surveillance-expiration-bill-pulte ; https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page |
| 52 | NDAA Section 889 as a hardware-provenance rule | SIQ `knowledge-base.json:1885` | Unsourced | Applies to US federal procurement; not verified in this review | — |

### APAC

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 53 | MAS: RTO ≤ 4 hours for critical systems; notify within 1 hour | SIQ `knowledge-base.json:364-366`, `evaluate.ts:210` | Incorrect | Figures correct but they are in the MAS Notices on Technology Risk Management (e.g. FSM-N09), not the TRM Guidelines the engine cites | https://www.mas.gov.sg/-/media/mas-media-library/regulation/notices/trpd/notice-fsm-n09/mas-notice-fsm-n09.pdf |
| 54 | MAS penalties "up to SGD 1M" | SIQ `knowledge-base.json:361` | Unsourced | Notice-specific penalties; needs the relevant Act | — |
| 55 | PDPA fines up to S$1M or 10% of Singapore turnover | SIQ `knowledge-base.json:377` | Correct | 10% applies only where Singapore turnover exceeds S$10M (s.48J, from 1 Oct 2022) | https://connections.nortonrosefulbright.com/post/102hyck/with-new-financial-penalties-in-force-pdpc-updates-advisory-guidelines-and-guide |
| 56 | Incident reporting "within 3 days to PDPC and CSA" | SIQ `knowledge-base.json:380` | Incorrect | PDPC: no later than 3 calendar days after assessing a breach as notifiable (s.26D). CSA CII reporting has its own, different timeline (unverified here) | https://sso.agc.gov.sg/Act/PDPA2012?ProvIds=P16A- |
| 57 | APRA CPS 230: material operational incidents notified within 24h | SIQ `knowledge-base.json:397` | Incorrect | 72h for material operational risk incidents; 24h for disruption of a critical operation outside tolerance | https://www.corrs.com.au/insights/apras-new-cps-230-key-requirements-for-regulated-entities-and-their-service-providers |
| 58 | CPS 230 in force 1 Jul 2025; pre-existing contracts by July 2026 | SIQ `knowledge-base.json:585-588` | Correct | Earlier of next renewal or 1 Jul 2026 (para 7) | https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf |
| 59 | Privacy Act s.13G: greater of AUD 50M, 3× benefit, or 30% of adjusted turnover | SIQ `knowledge-base.json:408`, `evaluate.ts:389-393` | Correct | From 13 Dec 2022. The 2024 amendments (new penalty tiers, infringement notices, statutory tort) are not reflected | https://www.allens.com.au/insights-news/insights/2022/11/Privacy-Act-changes-raise-the-bar/ ; https://www.hsfkramer.com/insights/2024-11/australian--privacy-reform-bill-tranche-1-passed-parliament--key-impacts-for-your-business |
| 60 | SOCI: 12-hour reporting for critical cyber incidents | SIQ `knowledge-base.json:412` | Correct | 12h for significant impact on availability; 72h for other relevant impacts; applies only to responsible entities for CI assets | https://www.cisc.gov.au/resources-subsite/Documents/ncsi-guidance.pdf |
| 61 | India DPDP penalty up to INR 250 crore | SIQ `evaluate.ts:396` | Correct | Maximum for failing security safeguards (s.8(5)); other bands lower | https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/ |
| 62 | India DPDP "ENFORCED · Active 2025 · Strict mandate" | SIQ `knowledge-base.json:631` | Incorrect | DPDP Rules notified 13 Nov 2025; most duties (notice, consent, rights, transfers) apply from 13 May 2027 | as row 61 |
| 63 | DPDP: DPO and independent data auditor mandatory | SIQ `knowledge-base.json:428` | Incorrect | Only for notified Significant Data Fiduciaries (s.10) | https://amlegals.com/penalties-under-the-digital-personal-data-protection-act2023/ |
| 64 | DPDP: government transfer "blacklists/whitelists" | SIQ `knowledge-base.json:426` | Incorrect | s.16 allows transfers except to countries restricted by notification (no whitelist); confirm with counsel | DPDP Act text (not fetched); secondary sources |
| 65 | RBI: payment data stored only in India | SIQ `knowledge-base.json:636`, `evaluate.ts:231` | Correct | Applies to authorised payment system operators and their ecosystem, not every firm in India (engine applies it to all) | https://rbi.org.in/scripts/FS_FAQs.aspx?Id=130 |
| 66 | CERT-In: report incidents within 6 hours | SIQ `knowledge-base.json:429` | Correct | Directions of 28 Apr 2022, in effect 27 Jun 2022 | https://trilegal.com/knowledge-repository/2022-cert-in-directions-on-reporting-cyber-incidents/ |
| 67 | HKMA "TM-E-1 (Cloud Computing)" | SIQ `knowledge-base.json:434-437` | Unsourced | TM-E-1 title and cloud coverage not confirmed; check HKMA SPM index | — |
| 68 | Japan APPI corporate fines up to ¥100M | SIQ `knowledge-base.json:456` | Correct | Corporate ceiling after the 2020 amendment (secondary sources) | https://www.morganlewis.com/ja/pubs/2022/08/how-japans-privacy-act-amendments-affect-global-healthcare-businesses |
| 69 | China PIPL fines up to RMB 50M or 5% of turnover | SIQ `knowledge-base.json:501` | Unsourced | 5% confirmed by secondary sources; RMB 50M not confirmed in this review | — |
| 70 | China: "important data and personal data generated in China must be stored domestically" | SIQ `knowledge-base.json:504` | Incorrect | Localisation applies to CII operators and processors above CAC volume thresholds (PIPL Art. 40) | https://www.fieldfisher.com/en/insights/china%E2%80%99s-personal-information-protection-law-what-d |
| 71 | China PIPL applies when the client selects "Japan & Hong Kong" | SIQ `evaluate.ts:256` | Incorrect | PIPL applies to processing in mainland China or targeting individuals there; Hong Kong has its own PDPO | as row 70 |

### GCC (outside the owner's four markets, see D1)

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 72 | KSA PDPL fines up to SAR 5M, doubling on repeat | SIQ `evaluate.ts:385`, `knowledge-base.json:266` | Correct | Art. 36; Art. 35 sensitive-data disclosure up to 2 years and/or SAR 3M | https://cms.law/en/int/expert-guides/cms-expert-guide-to-data-protection-and-cyber-security-laws/saudi-arabia |
| 73 | KSA PDPL "Royal Decree M/148" on the page vs "M/19" in the KB | `sovereign-iq.html:6424`; SIQ `knowledge-base.json` KSA_PDPL | Unsourced | Inconsistent; confirm enacting and amending decrees | — |
| 74 | Dubai DESC / CBUAE "fines up to AED 10M" | SIQ `knowledge-base.json:330` | Unsourced | Not verified | — |

### Cryptography and providers

| # | Statement | Where | Verdict | Correct statement | Source |
|---|---|---|---|---|---|
| 75 | "NIST FIPS PQC Phase 1, Q1 2027: mandatory transition across federal and BFSI partners" | `sovereign-iq.html:9644` | Unsourced | No such mandate found for BFSI; US national security system timelines (CNSA 2.0) are separate | — |
| 76 | "RSA-2048 deprecation 2028–2030" | `sovereign-iq.html:9653` | Unsourced | Check NIST IR 8547 (draft) before use | — |
| 77 | AWS European Sovereign Cloud entity "AWS EU Sovereign SARL (Luxembourg)" | `sovereign-iq.html:9388` | Incorrect | GA January 2026; first region in Brandenburg (eusc-de-east-1); operated by German-law entities | https://aws.amazon.com/blogs/aws/opening-the-aws-european-sovereign-cloud |
| 78 | "Microsoft Cloud for Sovereignty" as the current offer | `sovereign-iq.html:9402`; SIQ `evaluate.ts:473` | Outdated | Microsoft Sovereign Cloud (announced June 2025): Sovereign Public Cloud, Sovereign Private Cloud, national partner clouds (Bleu, Delos); EU Data Boundary completed | https://azure.microsoft.com/en-us/blog/microsoft-strengthens-sovereign-cloud-capabilities-with-new-services/ |
| 79 | Azure Key Vault Managed HSM listed as HYOK | `sovereign-iq.html:9407` | Unsourced | Needs Microsoft documentation on customer-held key options | — |
| 80 | Vendor sovereignty scores (82–94/100) and price premiums (0% to +55%) | `sovereign-iq.html:9384-9460` | Unsourced | No source; remove | — |
| 81 | Peer benchmark medians and percentiles by sector | SIQ `knowledge-base.json:651`; `sovereign-iq.html:7389-7462` | Unsourced | No source; remove | — |
| 82 | Exchange rates EUR 1.08, GBP 1.27, AUD 0.65, INR 0.012 | SIQ `evaluate.ts:62-66`; PIQ `evaluate.ts:96-97` | Unsourced | Use a dated ECB or central-bank reference rate held in the register | — |
| 83 | Default turnover $3B (Sovereign) / $250M (Posture) | SIQ `evaluate.ts:68`; PIQ `evaluate.ts:98` | Unsourced | Assumption; do not quantify without turnover (D4) | — |
| 84 | EU Data Act Art. 32 safeguards on third-country access to non-personal data | SIQ `knowledge-base.json:161` | Correct | As stated | as row 24 |
| 85 | DORA register of information (Art. 28(3)) required from 17 Jan 2025 | SIQ `knowledge-base.json` DORA duties | Correct | As stated | https://www.eba.europa.eu/sites/default/files/2024-04/f10e1b79-0448-4004-a23c-d594967cbbc0/Factsheet%20for%202024%20DORA%20dry%20run%20exercise.pdf |

**Count:** 85 statements checked. Correct 30. Incorrect 34. Outdated 5. Unsourced 16. (Incorrect, outdated or unsourced: 55.)

### Missing regulations for the owner's markets

| Market | Missing | Why it matters for this decision |
|---|---|---|
| EU | NIS2 national transposition status per member state; Cyber Resilience Act (Regulation (EU) 2024/2847) for product vendors; EU Cloud Sovereignty Framework (SEAL) for public buyers; EDPB Recommendations 01/2020 as the TIA method; DORA RTS on ICT third-party policy and sub-contracting | Applicability and procurement criteria |
| UK | NIS Regulations 2018 and the Cyber Security and Resilience Bill (status to verify); UK data bridges list; designated CTP names | Transfers and third-party exposure |
| US | DOJ Data Security Program (28 CFR Part 202, effective 8 Apr 2025) on bulk sensitive data and countries of concern; state privacy laws (CCPA/CPRA: up to $2,663 per violation, $7,988 intentional, from 1 Jan 2025) and others; HIPAA and GLBA as sector flags; SEC cyber incident disclosure; NYDFS Part 500; FedRAMP for public sector | US data leaving the US is now restricted for some destinations; US clients need US regimes |
| APAC | MAS Outsourcing Guidelines and TRM Notices by licence type; APRA CPS 234; NZ Privacy Act 2020 (option exists, no regime); Hong Kong PDPO; Japan APPI cross-border rules in detail; South Korea PIPA; Indonesia PDP Law; India SEBI and IRDAI cloud rules; China 2024 cross-border data provisions | Option coverage matches the page's own country list |

---

## 8. Sources

All checked 13 Oct 2026, by web search; direct fetch failed (DNS blocked).

- GDPR, Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- ICO, maximum fines under UK GDPR and DPA 2018: https://ico.org.uk/about-the-ico/our-information/policies-and-procedures/data-protection-fining-guidance/statutory-background/the-maximum-amount-of-a-fine-under-uk-gdpr-and-dpa-2018
- AI Act Art. 99, Commission AI Act Service Desk: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-99
- AI Act record listing OJ L 2026/1744: https://www.eur-lex.europa.eu/eli/reg/2024/1689
- AI Omnibus summaries: https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/ ; https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/
- NIS2 Art. 34 text: https://www.springlex.eu/en/packages/nis2/nis2-directive/article-34/
- DORA Art. 35 text: https://www.springlex.eu/en/packages/dora/dora-regulation/article-35/
- DORA incident RTS (EU) 2025/301: https://www.springlex.eu/en/packages/dora/rts-ir-regulation/
- DORA sub-contracting RTS (EU) 2025/532: https://www.jonesday.com/en/insights/2025/07/uniform-standards-for-ict-subcontracting-in-eu-financial-sector-new-obligations
- DORA application date: https://www.williamfry.com/knowledge/the-dora-train-pulls-into-the-station-dora-applies-from-17-january-2025/
- Data Act Art. 29: https://www.springlex.eu/en/packages/data-act/data-act-regulation/article-29/
- EUCS status: https://www.eurosmart.com/wp-content/uploads/2025/07/2025_06_19_Enhancing-the-Cybersecurity-Act-to-Finalise-a-Robust-EUCS-Scheme_Final.pdf
- Schrems II summary: https://www.dataguidance.com/resource/definitive-guide-schrems-ii
- DPF, Latombe: https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework ; https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework
- UK data bridge: https://assets.publishing.service.gov.uk/media/650801f6fc63f60014957399/analysis_of_the_uk_extension_to_the_eu-us_data_privacy_framework.pdf
- PRA SS1/21: https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss
- PRA SS2/21 (Nov 2024 update): https://www.bankofengland.co.uk/-/media/boe/files/prudential-regulation/supervisory-statement/2024/ss221-november-2024-update.pdf
- PRA SS1/23: https://www.bankofengland.co.uk/prudential-regulation/publication/2023/may/model-risk-management-principles-for-banks-ss
- UK CTP designations: https://www.gov.uk/government/news/uk-financial-system-strengthened-with-new-safeguards-for-major-technology-providers ; https://www.mofo.com/resources/insights/260716-uk-announces-list-of-first-critical-third-parties
- DUAA commencement: https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-data-use-and-access-act-2025-commencement-dates-and-planned-guidance-for-2026
- CLOUD Act text: https://www.justice.gov/criminal/criminal-oia/cloud-act ; https://www.usdoj.gov/d9/pages/attachments/2019/04/09/cloud_act.pdf
- FISA 702 lapse: https://www.npr.org/2026/06/12/nx-s1-5856291/fisa-702-surveillance-expiration-bill-pulte ; https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page ; https://www.cnbc.com/2026/04/30/fisa-section-702-congress-extension.html
- DOJ 28 CFR Part 202: https://www.debevoise.com/insights/publications/2025/05/maturing-compliance-with-the-bulk-sensitive-data
- CCPA 2025 amounts: https://infobytes.orrick.com/2024-12-20/california-privacy-protection-agency-increases-fines-and-penalties-for-2025/
- MAS TRM Notice FSM-N09: https://www.mas.gov.sg/-/media/mas-media-library/regulation/notices/trpd/notice-fsm-n09/mas-notice-fsm-n09.pdf
- PDPA s.26D: https://sso.agc.gov.sg/Act/PDPA2012?ProvIds=P16A- ; PDPC breach guide: https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/other-guides/guide-on-managing-and-notifying-data-breaches-under-the-pdpa-15-mar-2021.pdf
- PDPA penalties: https://connections.nortonrosefulbright.com/post/102hyck/with-new-financial-penalties-in-force-pdpc-updates-advisory-guidelines-and-guide
- APRA CPS 230: https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf ; https://www.corrs.com.au/insights/apras-new-cps-230-key-requirements-for-regulated-entities-and-their-service-providers
- Australia Privacy Act penalties: https://www.allens.com.au/insights-news/insights/2022/11/Privacy-Act-changes-raise-the-bar/ ; 2024 reforms: https://www.hsfkramer.com/insights/2024-11/australian--privacy-reform-bill-tranche-1-passed-parliament--key-impacts-for-your-business
- SOCI reporting: https://www.cisc.gov.au/resources-subsite/Documents/ncsi-guidance.pdf
- India DPDP Rules phase-in: https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/
- DPDP penalties: https://amlegals.com/penalties-under-the-digital-personal-data-protection-act2023/
- RBI payment data FAQ: https://rbi.org.in/scripts/FS_FAQs.aspx?Id=130
- CERT-In directions: https://trilegal.com/knowledge-repository/2022-cert-in-directions-on-reporting-cyber-incidents/
- Japan APPI: https://www.morganlewis.com/ja/pubs/2022/08/how-japans-privacy-act-amendments-affect-global-healthcare-businesses
- China PIPL: https://www.fieldfisher.com/en/insights/china%E2%80%99s-personal-information-protection-law-what-d
- KSA PDPL: https://cms.law/en/int/expert-guides/cms-expert-guide-to-data-protection-and-cyber-security-laws/saudi-arabia
- AWS European Sovereign Cloud: https://aws.amazon.com/blogs/aws/opening-the-aws-european-sovereign-cloud
- Microsoft Sovereign Cloud: https://azure.microsoft.com/en-us/blog/microsoft-strengthens-sovereign-cloud-capabilities-with-new-services/
- S3NS SecNumCloud: https://www.thalesgroup.com/en/news-centre/press-releases/s3ns-announces-secnumcloud-qualification-premi3ns-its-trusted-cloud
- EU Cloud Sovereignty Framework and tender: https://commission.europa.eu/news-and-media/news/commission-advances-cloud-sovereignty-through-strategic-procurement-2026-04-17_en
- ICO self-assessment: https://cy.ico.org.uk/for-organisations/advice-for-small-organisations/checklists/data-protection-self-assessment ; CNIL PIA software: https://cnil.fr/en/open-source-pia-software-helps-carry-out-data-protection-impact-assessment
- Repository evidence: `npm run audit:engines` (13 Oct 2026, unchanged from `docs/phase3/AUTOMATED_AUDIT.md`); `npx vitest run` on the three engine suites (130 passed); `npx playwright test tests/e2e/sovereign.spec.ts tests/e2e/posture-iq.spec.ts` (8 passed)
