# Cost IQ: coverage matrix (CQ3b task 12)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Replaces:** the draft in [VALIDATION.md](VALIDATION.md) section 10, which describes the 105-question bank. **Status:** research only; no code or configuration was changed.
**Companions:** [dimension-taxonomy.md](dimension-taxonomy.md), [question-bases.json](question-bases.json).

## 1. Verdict

The bank is now complete in one sense (99 questions, 63 score, 36 context, none inert) and uneven in another: **what a client is asked depends almost entirely on the footprint question and the focus areas picked, and not at all on size, industry or region.** Measured with the real engine on seven reference profiles:

| Finding | Evidence |
|---|---|
| **Size, industry and region change nothing.** I ran the P1 profile with two size classes, four industries and three region sets and got the identical question list, dimension counts and reachable findings; no rule in the engine or the page reads size, industry or region. The only region-related effect is the country count (CTX-05), which gates two questions | Section 5 |
| **The default run (Cloud Economics plus Cost Governance) is the same 32 questions for every client**, scores 14, and leaves **8 of 16 dimensions with no score** (COST-05 to COST-10, VALUE-01, VALUE-04, VALUE-06). "Cost Governance" adds nothing because its section is already in the baseline | Section 4, 5 |
| **Four of the 14 scored questions in the default run are cloud or SaaS questions asked of clients with no cloud or SaaS** (CORE-26, 27, 28, ADP-42). F-007 (SaaS overlap) is reachable for an on-premises client | Section 7, 8 |
| **ADP-09 and ADP-10 are never shown** to anyone, whatever the footprint (their section "VMware" belongs to no focus area). Maximum any client can be asked is 97 of 99 | Section 6 |
| **VALUE-01 has no scored question; COST-03, COST-06, VALUE-04, VALUE-06 have one or two.** Five dimensions miss the earlier target of four scored questions | Section 3 |
| **Completeness reads 61 percent ("low") on the default run** for every profile although every shown question was answered, because the engine counts required questions the client was never shown | Section 5 |
| **Two questions the bank counts as scoring (CORE-03, CORE-04) score nothing**: they feed no dimension and the answer is a band ID string. 61 distinct questions feed the dimensions, not 63 | Section 3 |

Recommended: fix the four structural items first (VMware area, footprint gates, footprint-based default areas, completeness over shown questions), then add the questions in section 11. Both need the owner's approval; nothing here is applied.

## 2. How this was measured

- **Engine:** `packages/engine-core/src/accelerators/cost-iq/evaluate.cjs` (`evaluateCostIq`) on `canon/config/master-v6.6.json` with the calibration file, unchanged. Scored means the engine's `scoreQuestion` returns a number for a real answer **and** the question has a dimension; the totals match the bank (63 score, 36 context; 61 feed a dimension).
- **What a client is asked:** baseline sections plus the sections of the selected focus areas (the page's `BASELINE` and `AREAS` lists in `Accelerators/cost-iq-v10.html`), then the engine's `applicableWhen` rule. The engine itself does not know about focus areas; the page applies them.
- **Dimension counts:** I answered every asked question with a scoring answer and read `dimensions[].answered` from the engine. **Findings reachable:** for each trigger on a question the client is asked, I set the triggering answer on top of the profile and ran the engine; "reachable" means the finding appeared. Fixed facts (footprint, CORE-16, CTX-05, ADP-49 "no transaction") were not overridden.
- **Three area selections:** *default* (the page's two pre-selected areas), *fitted* (my judgement of the areas a consultant would pick for that estate; labelled below and not a product rule) and *all* 18 areas (workshop depth). Thin cells are bold.
- **Not measured:** the reports, score values (answers were mid-scale, so scores carry no information), run time, or any real client. There is no client data (FRAMEWORK.md).

### Reference profiles (invented for measurement; not LTM client data)

| ID | Profile | Size | Industry | Regions | Footprint (CORE-01) | Countries | CORE-16 | M&A |
|---|---|---|---|---|---|---|---|---|
| P1 | Large EU bank, on-premises-heavy | over 25B | Banking and financial services | EU, UK | On-prem, VMware, colocation, network, security, workforce, software, end user, data | 6 to 20 | Unsure | Governed |
| P2 | Mid-size US software company, cloud-heavy | 500M to 1B | Technology | North America | Public cloud, SaaS, data, AI, security, workforce, network | One | Yes | None |
| P3 | Mid-size UK professional-services firm, SaaS-heavy | 100M to 500M | Professional services | UK | SaaS, software, end user, workforce, network | One | Yes | None |
| P4 | Indian manufacturer, outsourced | 1B to 5B | Manufacturing | India | External services, SaaS, network, end user, software | 2 to 5 | No | None |
| P5 | Global retailer, hybrid | 5B to 25B | Retail and consumer | EU, North America, APAC | On-prem, private cloud, public cloud, SaaS, network, workforce, external, software | Over 20 | Yes | Late |
| P6 | Small UK public-sector body, outsourced | under 100M | Public sector | UK | External services, SaaS, network, end user, software | One | No | None |
| P7 | APAC telecom, on-premises and private cloud | 1B to 5B | Telecom | APAC, India | Same as P1 | 6 to 20 | No | None |

P1 and P7 differ only in the facts that gate questions (CORE-16, M&A, country count), which is the point: it shows what each gate does.

## 3. Dimension by question counts

"Scored" is the number of scored questions that feed the dimension in the engine (a question feeding two dimensions is counted in each; 61 distinct questions give 68 links). "Context" is the number of context questions tagged to the dimension in the master (a label only; context questions score nothing). "Always asked" is the number of scored questions in the baseline that every client answers. "Reachable" removes questions the page can never show.

| Dimension | Scored | Context (tagged) | Always asked | Reachable scored | Note |
|---|---|---|---|---|---|
| COST-01 Spend Transparency | 6 | 2 | 3 | 6 | ADP-33 needs CORE-16, ADP-51 needs multi-country, ADP-08 is not SaaS-gated |
| COST-02 Cost Governance | 5 | 2 | 5 | 5 | All baseline. Over-weighted in every default run |
| COST-03 Cloud Economics | **1** | 0 | 0 | 1 | Self-rated FinOps maturity only (ADP-42); not gated on cloud |
| COST-04 SaaS & Software | 7 | 1 | 0 | 7 | Opt-in area; CORE-26, 27 sit in the default area |
| COST-05 Infrastructure | 7 | 4 | 0 | **6** | ADP-09 never shown; ADP-11, 13, 37, 38 gated on footprint |
| COST-06 Workforce | **2** | 1 | 0 | 2 | Opt-in area only |
| COST-07 Vendor & Commercial | 8 | 3 | 0 | 8 | Most questions of any dimension; ADP-14, 35, 36 need managed services |
| COST-08 Operations | 5 | 2 | 0 | 5 | ADP-52 needs multi-country |
| COST-09 Architecture | 4 | 0 | 0 | 4 | Opt-in area only |
| COST-10 Applications | 5 | 3 | 0 | 5 | ADP-50 needs a transaction |
| VALUE-01 Business Alignment | **0** | 2 | 0 | 0 | No score can be shown |
| VALUE-02 Investment Effectiveness | 6 | 6 | 2 | 6 | ADP-31 needs AI; 3 questions are shared with cost dimensions |
| VALUE-03 Benefits Realization | 5 | 2 | 1 | 5 | ADP-32 needs AI |
| VALUE-04 Technology Productivity | **2** | 1 | 0 | 2 | Both questions shared with COST-08 and COST-06 |
| VALUE-05 Strategic Agility | 3 | 9 | 2 | 3 | CORE-21 and CORE-28 shared with cost dimensions |
| VALUE-06 Business Satisfaction | **2** | 0 | 0 | 2 | Opt-in area only |

Untagged questions (no dimension at all): CORE-01, 02, 03, 04, 08, 16 and CTX-01 to CTX-05 (11 questions).

**Two flags on counts.** (1) CORE-03 and CORE-04 are counted as scoring by the bank test (a `range-band` rule with numeric probes) but have no dimension and their answer is a band ID string, which `range-band` rejects; they score nothing and should be treated as context (the bank would then be 61 score, 38 context). (2) Seven questions feed both a cost and a value dimension (CORE-18, 21, 22, 28, 34, 35, 41), so 7 of the 18 value links duplicate Cost IQ evidence.

## 4. Focus area by question counts

A question can sit in more than one area (shared sections), so rows do not add up. Baseline (always asked): 28 questions, 10 scored.

| Area | Questions | Scored | Thin? |
|---|---|---|---|
| Cloud Economics (default) | 4 | 4 | Small by design (FinOps IQ owns depth) |
| Cost Governance (default) | 5 | 4 | **Adds 0 beyond baseline**: its section is in the baseline |
| SaaS & Licensing | 11 | 9 | Heaviest |
| Vendors & Commercials | 12 | 8 | Heaviest |
| Infrastructure | 8 | 6 | Four of the eight are gated on footprint |
| Applications | 8 | 5 | |
| Technology Value | 8 | 3 | Two of its four sections (Investment Redirection, Cost Reduction) hold only context questions |
| Architecture & Technical Debt | 6 | 4 | |
| Workforce | 6 | 3 | |
| Operations & Service Management | 4 | 3 | |
| Data | 2 | 1 | **Thin** |
| Network | 1 | 1 | **Thin** |
| Security | 1 | 1 | **Thin** |
| AI & Emerging Technology | 2 | 2 | Needs AI in the footprint |
| Transformation | 2 | 2 | |
| Business-led IT | 2 | 2 | Needs CORE-16 |
| M&A | 2 | 2 | Needs a transaction |
| Geography | 2 | 2 | Needs two or more countries |
| (no area) VMware section | 2 | 1 | **Never shown** |

The earlier proposal of at least two scored questions per area is met by 15 of 18 areas; Data, Network and Security each have one, and Cost Governance adds no question beyond the baseline.

## 5. Dimension by customer profile

Numbers are scored answers feeding each dimension in the engine. **Bold = one or none.** The three tables use the same column order: C01 to C10 are COST-01 to COST-10, V01 to V06 are VALUE-01 to VALUE-06.

### 5.1 Default run (all seven profiles are identical)

| Profile | Asked | Scored | Completeness | C01 | C02 | C03 | C04 | C05 | C06 | C07 | C08 | C09 | C10 | V01 | V02 | V03 | V04 | V05 | V06 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 to P7 | 32 | 14 | 61% (low) | 3 | 5 | **1** | 2 | **0** | **0** | **1** | **0** | **0** | **0** | **0** | 2 | **1** | **0** | 3 | **0** |

The headline Cost IQ is the mean of five dimension scores (COST-01, 02, 03, 04, 07) and Value IQ of three (VALUE-02, 03, 05). COST-02 alone is 5 of the 14 scored answers (36 percent). Findings reachable: 9 for P1, P3, P4, P6, P7; 11 for P2 and P5 (the two with public cloud).

### 5.2 Fitted areas (my selection per estate; see the list under the table)

| Profile | Asked | Scored | Completeness | C01 | C02 | C03 | C04 | C05 | C06 | C07 | C08 | C09 | C10 | V01 | V02 | V03 | V04 | V05 | V06 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1, P7 (on-prem) | 59 | 31 | 80% | 3 | 5 | **0** | **0** | 6 | 2 | 4 | **1** | 3 | 4 | **0** | 4 | **1** | 2 | 2 | **0** |
| P2 (cloud) | 52 | 28 | 77% | 4 | 5 | **1** | 6 | **0** | **0** | **1** | **0** | 2 | 4 | **0** | 5 | 2 | **0** | 3 | **0** |
| P3 (SaaS) | 58 | 29 | 84% | 5 | 5 | **1** | 7 | **0** | **1** | 5 | **0** | **0** | **0** | **0** | 2 | 2 | **1** | 3 | 2 |
| P4, P6 (outsourced) | 56 | 27 | 70% | 3 | 5 | **0** | **0** | **0** | 2 | 7 | 3 | **0** | **0** | **0** | 2 | 4 | **1** | 2 | 2 |
| P5 (hybrid) | 94 | 57 | 100% | 6 | 5 | **1** | 7 | 5 | 2 | 8 | 5 | 4 | 5 | **0** | 5 | 4 | 2 | 3 | 2 |

Areas assumed. On-prem: Infrastructure, Vendors & Commercials, Cost Governance, Workforce, Architecture & Technical Debt, Applications, Network, Security. Cloud: Cloud Economics, SaaS & Licensing, Cost Governance, Data, AI & Emerging Technology, Security, Applications. SaaS: SaaS & Licensing, Business-led IT, Cost Governance, Vendors & Commercials, Technology Value. Outsourced: Vendors & Commercials, Workforce, Operations & Service Management, Cost Governance, Technology Value, Transformation. Hybrid: all areas. A consultant would choose differently; the point is that even a sensible pick leaves 4 to 6 dimensions empty or single-answer.

### 5.3 All 18 areas (workshop depth)

| Profile | Asked | Scored | C01 | C02 | C03 | C04 | C05 | C06 | C07 | C08 | C09 | C10 | V01 | V02 | V03 | V04 | V05 | V06 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 92 | 55 | 6 | 5 | **1** | 7 | 6 | 2 | 5 | 5 | 4 | 5 | **0** | 5 | 4 | 2 | 3 | 2 |
| P2 | 88 | 51 | 5 | 5 | **1** | 7 | 3 | 2 | 5 | 4 | 4 | 4 | **0** | 5 | 5 | 2 | 3 | 2 |
| P3 | 85 | 48 | 5 | 5 | **1** | 7 | 2 | 2 | 5 | 4 | 4 | 4 | **0** | 4 | 4 | 2 | 3 | 2 |
| P4 | 88 | 51 | 5 | 5 | **1** | 6 | 2 | 2 | 8 | 5 | 4 | 4 | **0** | 4 | 4 | 2 | 3 | 2 |
| P5 | 94 | 57 | 6 | 5 | **1** | 7 | 5 | 2 | 8 | 5 | 4 | 5 | **0** | 5 | 4 | 2 | 3 | 2 |
| P6 | 86 | 49 | 4 | 5 | **1** | 6 | 2 | 2 | 8 | 4 | 4 | 4 | **0** | 4 | 4 | 2 | 3 | 2 |
| P7 | 89 | 52 | 5 | 5 | **1** | 6 | 6 | 2 | 5 | 5 | 4 | 4 | **0** | 4 | 4 | 2 | 3 | 2 |

Even at full depth, VALUE-01 is empty and COST-03 has one answer for everyone, while COST-05 (Infrastructure) is 2 for the SaaS-heavy and outsourced clients (P3, P4, P6) and 6 for the on-premises ones. COST-07 reaches 8 for outsourced clients. **Per-profile imbalance is real but mild at full depth; it is the default and fitted runs that leave half the dimensions unscored.**

### 5.4 Thin cells by kind of client

| Cell | Who is affected | Why |
|---|---|---|
| COST-05 Infrastructure at 0 in the default run, 2 at full depth | SaaS-heavy and outsourced clients (P3, P4, P6) | Only CORE-33 and ADP-26 apply; every other infrastructure question is gated on a data-centre, colocation or private-cloud footprint |
| COST-06 Workforce at 0 (default) or 2 (best case) | Every client | Two questions; opt-in area |
| COST-03 Cloud at 1 | Every client, including cloud-heavy P2 and P5 | One self-rated maturity question; also asked of clients with no cloud |
| COST-08, 09, 10 at 0 in the default run | Every client | Opt-in areas only |
| VALUE-01 at 0, VALUE-04 and VALUE-06 at 2 | Every client | No question or two |
| COST-01 at 4 (P6) | Small single-country outsourced clients | ADP-33, 34 (CORE-16 FALSE) and ADP-51 (one country) hidden |

## 6. Customer attributes against the bank

| Attribute (question) | Levels | Questions or findings it gates | Result |
|---|---|---|---|
| **Size class** (CORE-03 revenue, CORE-04 spend) | 6 bands plus Unknown | None. Only the labels change with the reporting currency (CTX-01) | **Empty.** A 60M public body and a 30B bank see the same questions |
| **Industry** (CORE-02) | 15 | None. ADP-28 (regulated spend) is asked of every client | **Empty.** No sector-specific question or wording. Nothing tests whether the 15-option list fits (it omits, for example, agriculture, construction, a separate water category) |
| **Region** (CTX-03) | 9 | None by itself. CTX-05 (countries) gates ADP-51 and ADP-52 | **Empty** except the country count. The coverage statement that CTX-03 feeds is built with the report (CQ5) |
| **Estate mix** (CORE-01) | 15 options, multi-select | 11 questions (ADP-09, 10, 11, 13, 14, 31, 32, 35, 36, 37, 38) and findings F-005, F-006, F-019 | The one attribute that tailors the run. ADP-09 and ADP-10 are never shown |
| **Business-led spend** (CORE-16) | Yes, No, Unsure | ADP-33, ADP-34 and their F-017 triggers | Works as designed |
| **Transaction history** (ADP-49) | six options | ADP-50 and both F-020 triggers | Works as designed |
| **Delivery mix** (CTX-04), **FX share** (CTX-02) | bands | Nothing yet | Context only; their consumers arrive with the report |

**Industry groups and what is missing (my judgement, not sourced).** Financial services and public sector: one regulated-spend question only; no question on sector-specific outsourcing governance. Industrial and utilities: no operational-technology question (TBM has a Smart Devices tower; CORE-01 has no matching option). Technology and software firms: cost of revenue (cloud as cost of goods sold) is FinOps IQ territory, so this is a hand-off, not a gap. Education, media and natural resources were added to CORE-02 on 4 Nov 2026 and have no further wording.

**Regions.** All nine CTX-03 regions get identical questions. This is by design (GLOBAL-COVERAGE: context facts never re-weight a score) and is safe while no benchmark exists. The risk sits in published figures: the non-cloud-lever search found only US federal and one UK department figures, so any figure shown must carry its region (see non-cloud-lever-sources.md section 9).

## 7. Applicability gates: which questions each profile is asked (all areas, section 5.3 runs)

Y = asked; dash = hidden from that profile.

| Question | Gate | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
|---|---|---|---|---|---|---|---|---|
| ADP-09 | VMWARE | - | - | - | - | - | - | - |
| ADP-10 | VMWARE, ON_PREM, PRIVATE_CLOUD | - | - | - | - | - | - | - |
| ADP-11 | ON_PREM, PRIVATE_CLOUD | Y | - | - | - | Y | - | Y |
| ADP-13 | COLO | Y | - | - | - | - | - | Y |
| ADP-14, 35, 36 | EXTERNAL | - | - | - | Y | Y | Y | - |
| ADP-31, 32 | AI | - | Y | - | - | - | - | - |
| ADP-33, 34 | CORE-16 yes or unsure | Y | Y | Y | - | Y | - | - |
| ADP-37 | ON_PREM, PRIVATE_CLOUD, COLO | Y | - | - | - | Y | - | Y |
| ADP-38 | any estate with DR capacity | Y | Y | - | - | Y | - | Y |
| ADP-50 | ADP-49 names a transaction | Y | - | - | - | Y | - | - |
| ADP-51, 52 | CTX-05 two or more countries | Y | - | - | Y | Y | - | Y |

ADP-09 and ADP-10 are hidden from everyone because the section "VMware" is in no focus area, so the footprint answer cannot reveal them. This leaves VMware and virtualisation platform cost (a live commercial topic) with no reachable question.

**Estate-specific questions with no gate.** These are asked of every client who selects their area, whatever the footprint:

| Question | Concerns | Needs in CORE-01 | Clients asked without it (default run) | (all areas) |
|---|---|---|---|---|
| CORE-26, CORE-27, ADP-06, ADP-07, ADP-08 | SaaS | SAAS | P1, P7 (CORE-26 and 27 in the default run) | P1, P7 |
| CORE-28 | Cloud or SaaS commitments | PUBLIC_CLOUD or SAAS | P1, P7 | P1, P7 |
| ADP-42 | Cloud FinOps maturity | PUBLIC_CLOUD | P1, P3, P4, P6, P7 | P1, P3, P4, P6, P7 |
| CORE-30, ADP-16 | Software licensing | SOFTWARE | none | P2 |

CORE-01 asks the client to select only areas that "materially contribute" to cost, so the existing gates already treat an unselected area as not applicable; extending the rule to these questions is consistent. A client with no SaaS is currently scored low on SaaS questions or answers Unknown, which the engine rates lowest.

**Simulation of gating these nine questions on the footprint, and adding the VMware section to the Infrastructure area** (read-only: the master was changed in memory only for this run):

| Profile | Default asked, scored (now) | Default asked, scored (gated) | Dimensions with no score, default (now, gated) | F-007 reachable (now, gated) | F-017 reachable (now, gated) |
|---|---|---|---|---|---|
| P1 | 32, 14 | 28, 10 | 8, 11 | yes, no | yes, yes |
| P2 | 32, 14 | 32, 14 | 8, 8 | yes, yes | yes, yes |
| P3 | 32, 14 | 31, 13 | 8, 9 | yes, yes | yes, yes |
| P4 | 32, 14 | 31, 13 | 8, 9 | yes, yes | yes, yes |
| P5 | 32, 14 | 32, 14 | 8, 8 | yes, yes | yes, yes |
| P6 | 32, 14 | 31, 13 | 8, 9 | yes, yes | yes, yes |
| P7 | 32, 14 | 28, 10 | 8, 11 | yes, no | yes, no |

Gating is correct but it exposes the weakness of the default areas: an on-premises client would then answer 28 questions, score 10 and have 11 of 16 dimensions unscored. **The default areas must follow the footprint** (section 11, item S3), or gating makes the default run worse for clients who are not cloud-centric.

## 8. Companion questions CTX-01 to CTX-05 (global coverage)

All five are context only. A test shows headlines and dimensions are identical with and without them.

| Question | Intended effect | Live today | Reaches which profiles | Thin or empty |
|---|---|---|---|---|
| CTX-01 Reporting currency | Labels CORE-03 and CORE-04 bands in the client's currency (ECB rates, 2 Nov 2026) | Yes: band labels change; AED, SAR and Other fall back to US dollar | All; but those two questions feed nothing | The `clientCurrency` field is not set by anything I could find in the page; bands matter only as a label |
| CTX-02 Foreign-currency share | A caveat on figures and ranges at 15 percent or more | No consumer until the report (CQ5) | All | Empty effect today |
| CTX-03 Regions of operation | Coverage statement and region caveat | No consumer until CQ5 | All | Empty effect today; gates nothing |
| CTX-04 Onshore share | Narrative and Sovereign IQ routing | No consumer | All | Empty effect today |
| CTX-05 Number of countries | Gate for ADP-51 and ADP-52 | **Yes** | One country (P2, P3, P6): both questions hidden. Two or more (P1, P4, P5, P7): shown | A single-country client has no geography question, correctly. A multi-country client has two |

Only CTX-01 and CTX-05 do anything today. The other three collect facts that no report reads yet; that is acceptable until CQ5 but is a promise the report must keep.

## 9. Findings reachable by profile

D = reachable in the default run; A = reachable only when an opt-in area is added; dash = not reachable for that profile. "Reachable" means a trigger question is asked and the triggering answer fires the finding in the engine.

| Finding | Trigger questions and area | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Why a dash |
|---|---|---|---|---|---|---|---|---|---|
| F-001 Baseline | CORE-12, CORE-15 (baseline) | D | D | D | D | D | D | D | |
| F-002 Allocation | CORE-13, CORE-17 (baseline) | D | D | D | D | D | D | D | |
| F-003 Challenge | CORE-18, CORE-22 (baseline) | D | D | D | D | D | D | D | |
| F-004 Benefits | CORE-20 (baseline) | D | D | D | D | D | D | D | Same trigger as F-018 |
| F-005 Cloud leakage | ADP-42, needs PUBLIC_CLOUD | - | D | - | - | D | - | - | No public cloud |
| F-006 Cloud commitments | CORE-28, needs PUBLIC_CLOUD | - | D | - | - | D | - | - | No public cloud |
| F-007 SaaS overlap | CORE-26, 27 (default area, not gated) | D | D | D | D | D | D | D | Reachable even with no SaaS (P1, P7): gating gap |
| F-008 Licensing | CORE-30 (SaaS & Licensing area) | A | A | A | A | A | A | A | |
| F-009 Infrastructure | CORE-33 (Infrastructure area) | A | A | A | A | A | A | A | |
| F-010 Workforce | CORE-35 (Workforce or Vendors area) | A | A | A | A | A | A | A | |
| F-011 Vendor economics | CORE-28 (default), CORE-37 | D | D | D | D | D | D | D | CORE-28 not gated |
| F-012 Complexity | CORE-40 (Applications or Architecture) | A | A | A | A | A | A | A | |
| F-013 Application portfolio | CORE-27 (default), CORE-41 | D | D | D | D | D | D | D | |
| F-014 Perception | CORE-43 (Technology Value area) | A | A | A | A | A | A | A | |
| F-015 Redirection | CORE-21 (baseline) | D | D | D | D | D | D | D | |
| F-016 Manual operations | CORE-34 (Infrastructure & Operations) | A | A | A | A | A | A | A | |
| F-017 Business-led spend | ADP-08 (SaaS area, not gated); ADP-33, 34 (Business-led IT area, need CORE-16) | A | A | A | A | A | A | A | P4, P6, P7 reach it only through ADP-08 |
| F-018 Transformation outcomes | CORE-20 (baseline), CORE-44 | D | D | D | D | D | D | D | Same CORE-20 trigger as F-004 |
| F-019 AI economics | ADP-31, 32, need AI | - | A | - | - | - | - | - | No AI in footprint |
| F-020 M&A duplication | ADP-49, 50, need a transaction | A | - | - | - | A | - | - | No transaction |

**Counts.** Reachable in the default run: 9 findings for P1, P3, P4, P6, P7; 11 for P2 and P5. At full depth: 17 (P1), 19 (P2), 16 (P3, P4, P6, P7), 19 (P5). None of the seven profiles reaches all 20: F-019 needs AI in the footprint and F-020 needs a transaction (P2 reaches 19 without F-020, P5 19 without F-019). A client with both could reach 20.

**Issues.**
- F-004 and F-018 fire together whenever CORE-20 is answered USAGE or NONE (the same trigger); they differ only when CORE-44 fires F-018 alone.
- F-007, F-011 and F-013 each fire from questions asked in the default run, so an on-premises client is told it may have SaaS overlap.

## 10. Over-weighted areas and gaps

| Item | Evidence | Direction |
|---|---|---|
| **Cost governance and spend visibility** | COST-01 and COST-02 supply 8 of the 10 scored baseline answers; COST-02 is 5 of the 14 scored answers in the default run | Over-weighted in the headline for every client |
| **Vendors and commercials, SaaS and licensing** | COST-07 has 8 scored, COST-04 has 7; the two areas are the largest (12 and 11 questions) | Over-weighted against Workforce (6 questions, 3 scored), Data, Network, Security |
| **Equal weights** | All dimension weights are 1; a dimension with one answer counts as much as one with eight | Distorts the headline; the CQ4 minimum-answers rule is needed |
| **Value IQ independence** | 7 of 18 value links come from questions already in Cost IQ | Over-weights shared questions |
| **Cloud questions in the default run** | 4 of the 14 scored answers are cloud or SaaS questions, asked of clients without either | Over-weighted for non-cloud clients |
| **Thin or empty** | VALUE-01 (0); COST-03, COST-06, VALUE-04, VALUE-06 (1 to 2); Data, Network, Security areas (1 each); the End User and Smart Devices parts of the estate (0 questions) | Gap |
| **Never reachable** | ADP-09, ADP-10 | Defect |

## 11. Recommendations

Recommendations are judgement. Each has the reason; owner approval is needed for any change a client sees.

### Fixes that need no new question

| # | Change | Reason | Effect |
|---|---|---|---|
| S1 | Add the "VMware" section to the Infrastructure focus area | ADP-09 and ADP-10 are never shown | Restores two questions; COST-05 reachable scored 6 to 7 |
| S2 | Gate CORE-26, 27, ADP-06, 07, 08 on SAAS; CORE-28 on PUBLIC_CLOUD or SAAS; ADP-42 on PUBLIC_CLOUD; CORE-30 and ADP-16 on SOFTWARE | A client without the estate should not be scored low or fire F-007 or F-017 on it | Simulated above; removes F-007 for P1 and P7 |
| S3 | Choose the default focus areas from CORE-01 instead of fixed Cloud Economics plus Cost Governance (for example on-premises: Infrastructure and Vendors & Commercials; SaaS: SaaS & Licensing and Business-led IT; outsourced: Vendors & Commercials and Workforce) | The default run is the same for everyone, "Cost Governance" adds nothing, and with S2 an on-premises client would be left with 10 scored answers | Makes the default run fit the client |
| S4 | Compute completeness over the questions shown only (already planned in CQ4) | The default run reads 61 percent "low" for every client | Confidence reads true |
| S5 | Minimum scored answers per dimension before a score is shown (CQ4) | Dimensions rest on one answer | Stops a one-answer dimension looking firm |
| S6 | Relabel CORE-03 and CORE-04 as context | They count as scoring and score nothing | Count becomes 61 score, 38 context |
| S7 | Remove the seven shared value links or disclose them | Value IQ overlaps Cost IQ | See dimension-taxonomy.md T5 |
| S8 | Give F-004 and F-018 distinct triggers | Identical CORE-20 trigger | One fewer duplicated finding |

### Questions to add (proposals; wording to be written and sourced when approved)

| # | Add | Dimension | Reason | Basis available |
|---|---|---|---|---|
| Q1 | 1 scored question: how technology investments are traced to named strategy objectives (ladder with Unknown) | VALUE-01 | The dimension has no scored question, so no score can be shown | FinOps Executive Strategy Alignment; GAO ITIM Stage 3 (published-framework) |
| Q2 | 2 scored questions: whether fully loaded internal and contractor costs are known and used; how contractor demand is governed (approval, rate cards, conversion) | COST-06 | Two questions for a whole TBM cost pool (Staffing); no evidence-based workforce lever exists without client payroll data | TBM Staffing pool (partial); no published scale, so LTM heuristic |
| Q3 | 2 questions: end-user device and workplace-software cost per user, lifecycle and refresh governance | COST-05 or a new workplace item | CORE-01 offers END_USER and CORE-05 lists it, yet no question asks about it; it is the main infrastructure cost for SaaS-heavy and outsourced clients, whose COST-05 reaches only 2 | TBM End User tower (partial); LTM heuristic |
| Q4 | 1 scored question: whether the unit cost of internal infrastructure (VM, terabyte, rack) is known, charged back and compared with alternatives | COST-05 and COST-01 | On-premises-heavy clients need a unit-economics question; FinOps Unit Economics Walk extends to data centres, and Architecting & Workload Placement compares placement options | FinOps Unit Economics, Architecting & Workload Placement (published-framework) |
| Q5 | 1 scored question: whether technology cost per unit of business output (per transaction, per employee, per revenue unit) is tracked | VALUE-04 | VALUE-04 has no honest meaning today (it holds manual-effort share and workforce alignment) | FinOps Unit Economics (published-framework) |
| Q6 | 1 to 2 questions on data-platform sprawl and security-tool overlap | COST-09 or COST-04 | Data and Security areas have one scored question each; both are TBM towers | TBM towers (partial); LTM heuristic |
| Q7 | 1 context question on mainframe and specialist platforms; an option for operational technology in CORE-01 | COST-05 | Large on-premises and industrial estates have no matching option | TBM Compute (Mainframe) and Smart Devices; LTM heuristic |

Net effect if Q1 to Q6 were added at the low end: 8 scored questions, dimension counts COST-06 4, VALUE-01 1, VALUE-04 3. VALUE-01 would still be thin; two questions there would be better if the owner wants a score shown.

**Not recommended:** regional benchmarks (no published source per region; VALIDATION section 12); more cloud questions in Cost IQ (FinOps IQ owns cloud depth, and COST-03 should be fed from the imported FinOps IQ result); size-specific gating (no evidence that any question is wrong for a size class; UNSOURCED, so test with the first real clients before gating).

## 12. Decisions for the owner

| # | Decision | Recommended default |
|---|---|---|
| M1 | Approve S1 to S4 (VMware area, footprint gates on nine questions, footprint-based default areas, completeness over shown questions) as one change with new golden outputs | Yes, together (S2 without S3 worsens the default run) |
| M2 | Approve S6 (relabel CORE-03 and CORE-04) and S8 (distinct F-004 and F-018 triggers) | Yes |
| M3 | Approve questions Q1 to Q6 for drafting and sourcing by `finops-cost-lead` | Q1, Q2, Q3, Q4, Q5 now; Q6 and Q7 after the first client runs |
| M4 | Treat the default area selection as the executive-mode question set (32 questions today) | Redefine after S3; an executive run must give a score for at least 10 of 16 dimensions |

## 13. What I could not verify, and limits

- No client data: the profiles are invented. Numbers describe the bank, not clients.
- The page's focus-area lists were read from `cost-iq-v10.html`; I did not run the page in a browser. The page and engine apply the same applicability rule (slice 3), but I did not diff them.
- "Fitted" area choices are my judgement.
- `clientCurrency` not being set by the page rests on a text search of `Accelerators/`, `packages/` and `amplify/`; I did not trace the persistence layer.
- No timing: the 15 to 20 minute target for executive mode (FRAMEWORK.md area 4) could not be tested because no per-question time is published or measured.
- The reports (CQ5) do not exist yet, so section 8's "no consumer" is a statement about today.

## 14. Reproduction

The measurement ran in the session scratchpad (not part of the repository): it loads `master-v6.6.json`, the calibration file and `evaluate.cjs`, builds the seven profiles, selects questions by the page's `BASELINE` and `AREAS` lists and `applicableWhen`, answers each with a scoring answer, runs `evaluateCostIq`, and for each trigger sets the triggering answer and checks the finding. It can be turned into a test in `packages/engine-core/test/` on request; the existing `cost-iq-bank.test.ts` is the natural place for the invariants (no question unreachable; size, industry and region leave the question list unchanged).

Sources and the per-question bases are in [question-bases.json](question-bases.json); the taxonomy references are in [dimension-taxonomy.md](dimension-taxonomy.md).
