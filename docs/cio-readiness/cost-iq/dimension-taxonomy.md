# Cost IQ: dimension taxonomy (CQ3b task 11)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Status:** proposal for owner decision CD9. No code or configuration was changed.
**Companion files:** [question-bases.json](question-bases.json) (a cited basis for each of the 99 questions) and [COVERAGE-MATRIX.md](COVERAGE-MATRIX.md).

## 1. Verdict

The 16 dimensions are LTM's own constructs. They are not a published taxonomy and today nothing in the page or report says so. An honest mapping exists for 14 of the 16 against the TBM Taxonomy 5.0.1, the FinOps Framework 2026 domains and the GAO investment framework: strong for six cost dimensions (COST-03, 04, 05, 06, 07, 10), partial for eight (COST-01, 02, 08, 09, VALUE-01, 02, 03, 05), and absent for VALUE-04 and VALUE-06. No dimension should be described as "aligned to TBM" or "aligned to FinOps": at most it has a **closest published reference** that the report can name. The six value dimensions have no TBM element at all, because the taxonomy page as read models cost, resources, solutions and consumers and names no tower or solution for value or benefits.

Recommended: keep the 16 (they are usable and the scores already exist), label them as "LTM dimension" everywhere a client sees them, and show the closest published reference in the method panel. Do not rename dimensions to TBM or FinOps terms.

## 2. What was read, and what was not (checked 3 Nov 2026)

| Source | What I read | Status |
|---|---|---|
| TBM Taxonomy 5.0.1 page, https://www.tbmcouncil.org/taxonomy/ | Four layers (Technology Cost Pools, Technology Resource Towers, Technology Solutions, Technology Consumers). Cost pools: Staffing, Outside Services, Cloud Services, Hardware, Software & SaaS, Data Center Facilities, Telecom, Misc Costs, Cross Charges. Towers: Data Center, Compute, Storage, Network, Application, Data, Delivery, Tech Management, Security, Risk & Compliance, Smart Devices, End User (Output and Platform retired). Sub-towers, for example Tech Management: Enterprise Architecture, Tech Finance, Tech Human Capital Management, Tech Management & Strategy, Tech Vendor Management. Released 18 Jul 2025 (5.0 on 6 Jun 2025) | **Names VERIFIED** for 5.0.1. Read through a summarising fetch tool, so the exact wording should be checked on the page before it is quoted to a client. Definitions of each element, the whitepaper and the CSV data tables sit on community.tbmcouncil.org and **were not opened (UNVERIFIED)**. No licence or reuse terms were visible in the text I read: **UNVERIFIED, check with TBM Council before client use** |
| TBM Taxonomy 4.1 page, https://www.tbmcouncil.org/learn-tbm/tbm-taxonomy/ | Said the full document is members-only and named no towers | The earlier "towers are members-only" finding is **superseded for tower and cost-pool names** by the 5.0.1 page. It still holds for the full document. Earlier notes cited 4.1; the current version is 5.0.1 |
| FinOps Framework domains, https://www.finops.org/framework/domains/ | Four domains and 22 capabilities: Understand Usage & Cost (Data Ingestion, Allocation, Reporting & Analytics, Anomaly Management); Quantify Business Value (Planning & Estimating, Forecasting, Budgeting, KPIs & Benchmarking, Unit Economics); Optimize Usage & Cost (Architecting & Workload Placement, Rate Optimization, Usage Optimization, Sustainability, Licensing & SaaS); Manage the FinOps Practice (FinOps Practice Operations, Governance, Policy & Risk, FinOps Assessment, Automation, Tools & Services, FinOps Education & Enablement, Invoicing & Chargeback, Intersecting Disciplines, Executive Strategy Alignment) | **VERIFIED** (opened). The 2026 edition was published 19 Mar 2026 under CC BY 4.0 (https://www.finops.org/insights/2026-finops-framework/) |
| GAO-04-394G IT Investment Management framework, https://www.gao.gov/products/gao-04-394g | Five maturity stages; portfolio approach and de-selection at Stage 3 and 4; post-implementation review | **VERIFIED** from the PDF text. US federal, 2004 |
| COBIT 2019, ITIL 4, ISO/IEC 20000-1, ISO/IEC 38500 | Not opened: ISACA and AXELOS content is paywalled, iso.org returned HTTP 403 | **UNVERIFIED**; not used for any mapping below |

The mapping judgements below are mine. TBM Council and the FinOps Foundation have not reviewed or endorsed them.

## 3. Two axes mixed in one list

The 10 cost dimensions mix two axes, which explains why some map to TBM and others do not.

- **By what the money buys (resource view):** COST-03 Cloud, COST-04 SaaS & Software, COST-05 Infrastructure, COST-06 Workforce, COST-07 Vendor & Commercial. These line up closely with TBM **cost pools** (Cloud Services, Software & SaaS, Hardware and Data Center Facilities and Telecom, Staffing, Outside Services).
- **By management discipline (capability view):** COST-01 Spend Transparency, COST-02 Cost Governance, COST-08 Operations, COST-09 Architecture, COST-10 Applications. COST-08, 09 and 10 line up with TBM **towers** (Delivery, the Enterprise Architecture sub-tower, Application). COST-01 and COST-02 describe how well spend is seen and governed, which TBM models only as a function that costs money (Tech Management tower), not as a maturity construct.

The six value dimensions are capability-view constructs about investment decisions and outcomes. TBM has no counterpart; the FinOps Framework's Quantify Business Value domain and the GAO investment framework are the nearest published references.

## 4. The 16 dimensions

Counts are **scored questions that feed the dimension in the engine** (from `scoring.dimensionIds`), as of the 99-question bank (63 score, 36 context). The engine ignores the master's `valueDimensionIds`; 61 distinct questions feed 68 dimension links, because 7 questions feed one cost and one value dimension. "Always asked" counts the baseline questions every client answers. Full conditions are in [COVERAGE-MATRIX.md](COVERAGE-MATRIX.md).

| ID | Dimension (LTM) | What it measures (master definition) | Scored questions (count, IDs) | Always asked | Closest published reference | Mapping |
|---|---|---|---|---|---|---|
| COST-01 | Spend Transparency | Visibility of total technology spend, allocation, ownership and data quality | **6**: CORE-06, CORE-12, CORE-17, ADP-08, ADP-33, ADP-51 | 3 | FinOps domain **Understand Usage & Cost** (Allocation, Reporting & Analytics, Data Ingestion). TBM: the whole chain cost pool, tower, solution, consumer; no single element | **Partial.** Strong on FinOps. ADP-33 (IT influence on business-led buying), ADP-51 (regional cost variation) and ADP-08 (SaaS outside governance) sit here by LTM choice and are not what Allocation or TBM describe |
| COST-02 | Cost Governance | Budgeting, forecasting, challenge mechanisms, decision rights | **5**: CORE-13, CORE-15, CORE-18, CORE-21, CORE-22 | 5 | FinOps **Budgeting**, **Forecasting** (Quantify Business Value) and **Governance, Policy & Risk** (Manage the FinOps Practice); GAO ITIM Stage 2 and 3 control processes. TBM: Tech Management tower (Tech Finance), which prices the function but does not measure its maturity | **Partial** (FinOps and GAO yes; TBM no) |
| COST-03 | Cloud Economics | Cloud consumption, allocation, optimisation and commitments | **1**: ADP-42 | 0 (needs the Cloud Economics area, which is the default) | TBM **Cloud Services** cost pool; FinOps Optimize Usage & Cost (Rate Optimization, Usage Optimization) | **Strong in concept, but only one question.** ADP-42 is a self-rated FinOps maturity, not a consumption or commitment measure. Cloud depth belongs to FinOps IQ under the boundary decision (BOUNDARY.md), so this dimension is thin by design |
| COST-04 | SaaS & Software Economics | SaaS and software usage, licensing, overlap, renewal | **7**: CORE-26, CORE-27, CORE-30, ADP-06, ADP-07, ADP-16, ADP-34 | 0 | TBM **Software & SaaS** cost pool (Licensing, Maintenance & Support, SaaS) and the Application tower's Licensing sub-tower; FinOps **Licensing & SaaS**; ISO/IEC 19770-1 (IT asset management systems) | **Strong** |
| COST-05 | Infrastructure Economics | Capacity, assets, facilities, network, lifecycle | **7**: CORE-33, ADP-09, ADP-11, ADP-13, ADP-26, ADP-37, ADP-38 (6 reachable; ADP-09 is never shown) | 0 | TBM towers **Data Center, Compute, Storage, Network** (and the Disaster Recovery sub-tower under Security) with cost pools Hardware, Data Center Facilities, Telecom; FinOps Usage Optimization (covers on-premises) | **Strong** |
| COST-06 | Workforce Economics | Internal and external capacity, skills mix, productivity | **2**: CORE-35, ADP-18 | 0 | TBM **Staffing** cost pool (Internal Labor, Staff Augmentation) and the Tech Human Capital Management sub-tower | **Strong in concept, thin in questions** |
| COST-07 | Vendor & Commercial Economics | Contracts, vendor leverage, sourcing, commercial optimisation | **8**: CORE-28, CORE-37, ADP-14, ADP-35, ADP-36, ADP-44, ADP-47, ADP-48 | 0 | TBM **Outside Services** cost pool and the **Tech Vendor Management** sub-tower; FinOps Rate Optimization and Intersecting Disciplines (procurement) | **Strong** |
| COST-08 | Operations Economics | IT operations, automation, service management, productivity | **5**: CORE-34, ADP-39, ADP-52, ADP-59, ADP-60 | 0 | TBM **Delivery** tower (Operations Center, Service Management) and the Operations solutions; FinOps Usage Optimization (automation) | **Partial.** ADP-52 (regional standardisation) and ADP-59 (demand prioritisation) are not operations delivery |
| COST-09 | Architecture & Technology Economics | Architecture, technical debt, complexity, technology choices | **4**: CORE-40, ADP-25, ADP-45, ADP-46 | 0 | TBM **Enterprise Architecture** sub-tower (Tech Management); FinOps **Architecting & Workload Placement** (modernisation, consolidation, avoiding built-in tech debt) | **Partial.** TBM has no technical-debt element; ADP-25 (data retention) belongs under the Data tower |
| COST-10 | Application Economics | Application portfolio, lifecycle, ownership, total cost | **5**: CORE-41, ADP-22, ADP-23, ADP-41, ADP-50 | 0 | TBM **Application** tower (in 5.0.1 applications are modelled in the Resource Towers layer, not as solutions); FinOps Architecting & Workload Placement (retirement, consolidation) | **Strong** |
| VALUE-01 | Business Alignment | Alignment of technology investment with enterprise strategy | **0** (tagged only: CORE-07, CORE-14, CORE-17) | 0 | FinOps **Executive Strategy Alignment** (new in 2026): links technology spend to business strategy; GAO ITIM Stage 3 (portfolio evaluated by support for mission and goals) | **Honest mapping exists, no scored question.** The report cannot show a VALUE-01 score and the page must say so |
| VALUE-02 | Investment Effectiveness | Quality of investment choices and capital allocation | **6**: CORE-18, CORE-22, CORE-41, ADP-27, ADP-31, ADP-49 | 2 | FinOps **Planning & Estimating** (business case before prioritising demand); GAO ITIM select and control phases. **No TBM element** (the taxonomy as read has no tower or solution for value or benefits) | **Partial** (FinOps and GAO only) |
| VALUE-03 | Benefits Realization | Measurement and realisation of expected outcomes | **5**: CORE-20, CORE-44, ADP-29, ADP-30, ADP-32 | 1 | FinOps **Planning & Estimating** (projected versus actual) and **Unit Economics**; GAO ITIM post-implementation review | **Partial** (FinOps and GAO; no TBM) |
| VALUE-04 | Technology Productivity | Technology's contribution to business and workforce productivity | **2**: CORE-34, CORE-35 | 0 | None. FinOps Unit Economics (cost per unit of output) is the nearest idea but no question asks for output per cost; the two scored questions measure manual-effort share and workforce alignment, which are operations and workforce matters | **No honest mapping.** Both feeding questions also feed a cost dimension (COST-08, COST-06), so VALUE-04 is not independent evidence |
| VALUE-05 | Strategic Agility | Ability to redirect investment and respond to change | **3**: CORE-11, CORE-21, CORE-28 | 2 | FinOps **Budgeting** (rolling cycles), **Rate Optimization** (commitment flexibility) and **Executive Strategy Alignment** (holds through change events). No TBM element | **Partial** (FinOps only) |
| VALUE-06 | Business Satisfaction | Business perception of technology value relative to cost | **2**: CORE-43, ADP-54 | 0 | None found. TBM "Technology Consumers" names who uses solutions, not their satisfaction; ITIL and COBIT relationship and satisfaction practices were not opened | **No honest mapping** |

**Dimensions with no honest mapping:** VALUE-04 and VALUE-06 (none to any published taxonomy read). **Mapping to FinOps or GAO only, none to TBM:** VALUE-02, VALUE-03, VALUE-05, and VALUE-01 (which also has no scored question). **Partial mappings:** COST-01, COST-02, COST-08, COST-09.

## 5. Where support is thin

Dimension scores are the unweighted mean of the scored answers feeding them (the master's phrase "deterministic weighted index" is wrong; weights are all 1), and the engine scores a dimension from a single answer. Until the CQ4 minimum-answers rule exists, a thin dimension looks as firm as a well-supported one.

| Support | Dimensions | Why it matters |
|---|---|---|
| **None** | VALUE-01 | No score can be shown. The headline Value IQ is a mean of five dimensions, not six |
| **One scored question** | COST-03 | One self-rated maturity answer carries the whole dimension; plan is to feed it from a FinOps IQ result (BOUNDARY.md, shared value model stage 2) |
| **Two** | COST-06, VALUE-04, VALUE-06 | COST-06 is a whole technology-spend pool (TBM Staffing) with two questions. VALUE-04 is wholly double-fed |
| **Three or four** | VALUE-05 (3), COST-09 (4) | Acceptable only with the minimum-answers rule |
| **Five to eight** | COST-01, 02, 04, 05, 07, 08, 10, VALUE-02, 03 | COST-07 (8) and COST-04, COST-05 (7 each) are the most heavily weighted by question count; COST-02 (5) is wholly baseline, so all five of its questions are asked of every client |

The earlier target in VALIDATION.md section 10 was at least four scored questions per dimension. Today five dimensions miss it (COST-03, COST-06, VALUE-01, VALUE-04, VALUE-06) and VALUE-05 is one short. Recommended additions are in COVERAGE-MATRIX.md section 8.

**Double counting.** Seven questions feed one cost and one value dimension (CORE-18, CORE-21, CORE-22, CORE-28, CORE-34, CORE-35, CORE-41), so 7 of the 18 value links come from questions already counted in Cost IQ. Value IQ and Cost IQ are therefore not independent indices. This is a labelling issue the report should disclose, or the value links should be removed.

## 6. What the TBM comparison shows about gaps

Comparing the footprint list (CORE-01) and the 16 dimensions with the TBM towers and cost pools shows where the bank asks little or nothing. These are observations, not claims that TBM requires coverage.

| TBM element | Cost IQ coverage | Observation |
|---|---|---|
| End User tower (Workspace, Help Desk, Mobile Devices) | CORE-01 has an END_USER option and CORE-05 lists it; **no question** asks about workplace cost | Gap for SaaS-heavy and outsourced clients, whose spend is mostly end-user and SaaS |
| Security tower, Risk & Compliance tower | One scored question (ADP-27, in VALUE-02) and one context (ADP-28) | Thin; security spend is a material pool for regulated clients |
| Data tower | ADP-24 (context) and ADP-25 (scored, COST-09) | Thin for data-platform-heavy clients |
| Network tower and Telecom cost pool | ADP-26 only | One question |
| Smart Devices tower (operational technology, IoT) | None | Relevant to manufacturing and utilities; not in CORE-01 |
| Compute tower: Mainframe, AI Compute | ADP-31 and ADP-32 cover AI cost tracking only; nothing on mainframe | Gap for large on-premises estates |
| Cross Charges and Misc Costs pools | None | Internal recharges are an allocation topic (COST-01) with no question |

## 7. Recommended labels

Wording that says plainly these are LTM's own. Use in the page, the report method panel and the sources list.

1. **Section heading in the report:** "LTM Cost and Value dimensions. These 16 dimensions are LTM's own framework. Each shows the closest published reference where one exists; none is a TBM Council or FinOps Foundation model, and neither body has reviewed it."
2. **Per-dimension caption (example, COST-04):** "SaaS and Software Economics (LTM dimension). Closest published reference: TBM Taxonomy 5.0.1 cost pool Software & SaaS; FinOps Framework capability Licensing & SaaS."
3. **Per-dimension caption where there is none (VALUE-04, VALUE-06):** "No published taxonomy covers this dimension. It is LTM's construct and rests on LTM judgement (see the question basis)."
4. **For VALUE-01:** "No score is shown: this edition has no scored question for Business Alignment."
5. **Headlines:** "Cost IQ and Value IQ are LTM indices: the unweighted mean of dimension scores, each dimension the mean of its answered scored questions. They are not benchmarks and are not comparable with any other organisation's score."
6. **Never use:** "aligned to TBM", "TBM-certified", "FinOps-compliant", "industry standard dimensions".
7. **Attribution:** FinOps Framework text is CC BY 4.0, so attribute and indicate changes if wording is reused. TBM reuse terms are UNVERIFIED; name TBM elements only as a reference after Council terms are checked.

## 8. Decisions for the owner

| # | Decision | Recommended default |
|---|---|---|
| T1 | Confirm CD9: keep the 16 dimensions as LTM's constructs with the labels in section 7 | Yes |
| T2 | Show the closest published reference per dimension in the method panel | Yes, after T3 |
| T3 | Check TBM Council reuse terms before naming TBM elements to clients (or name only FinOps and GAO) | Check before CQ5; until then name FinOps and GAO only |
| T4 | Decide what to do with VALUE-04 and VALUE-06 (no honest mapping) and VALUE-01 (no scored question) | Keep VALUE-06 with its disclosure, add a scored VALUE-01 question, and fold VALUE-04 into COST-08 and COST-06 or add one output-based question |
| T5 | Remove the seven shared value links, or disclose that Value IQ overlaps Cost IQ | Disclose now; remove in CQ4 if the audit finds the headlines move together |

## 9. Sources (checked 3 Nov 2026)

- TBM Council, Technology Business Management Taxonomy 5.0.1 (released 18 Jul 2025): https://www.tbmcouncil.org/taxonomy/ (read through a summarising fetch tool; first 200,000 of 204,029 characters).
- TBM Council, TBM Taxonomy 4.1 page: https://www.tbmcouncil.org/learn-tbm/tbm-taxonomy/
- FinOps Foundation, FinOps Framework domains: https://www.finops.org/framework/domains/ ; 2026 Framework: https://www.finops.org/insights/2026-finops-framework/ ; capability pages quoted in question-bases.json.
- US GAO, GAO-04-394G, Information Technology Investment Management (March 2004): https://www.gao.gov/products/gao-04-394g
- ISO/IEC 19770-1:2017, JTC 1/SC 7 page: https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiec-19770-12017.html
- Per-question sources: [question-bases.json](question-bases.json).
