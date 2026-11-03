# Cost IQ non-cloud levers: public-source search

**Date checked:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner decides). **Scope:** research only; no code, registry or claim was changed.

## 0. Bottom line

- No lever has a public source that gives a **savings range achieved on a stated sample** for the lever as a proportion of its spend. The best public evidence is (a) vendor-run surveys of self-estimated waste in software spend, (b) US and UK audit-office figures that describe federal agencies, and (c) a few academic papers that do not measure savings.
- **No lever earns "USABLE AS A CEILING WITH CITATION" without the owner accepting a precedent.** The only candidate is software licence waste (lever 1): Flexera's self-estimate by category (State of ITAM 2023, n = 500). It is the same kind of figure FinOps IQ already uses as a cloud ceiling (Flexera 2026, n = 753). I rate it CONTEXT ONLY because it is three years old, I could not open the full report, and the newer Flexera releases I opened (2025, 2026) give no equivalent percentage. The owner can overrule this (decision A below).
- Verdict counts: **0 ceiling, 4 context only (levers 1, 3, 6, 7), 3 no public source found (levers 2, 4, 5).**
- Cost IQ's non-cloud levers therefore stay **evidence-based**: the client's measured addressable base times a share up to 100%, expected case half, as LEV-09 does. This confirms `BOUNDARY.md` 3.5 item 1.

Every URL below was opened or returned by search on 3 Nov 2026. Section 9 lists what I could not open. Nothing here is a recommendation to apply a figure; "context" means shown with citation and never fed into a calculation.

## 1. Existing FinOps IQ treatment (read from the repository)

| Item | What it says | File |
|---|---|---|
| LEV-09 SaaS and licensing | Base = client-measured unused licence cost (`evidence.saasLicence.unusedAnnualCost`); `maxRate` kind `evidence`, value 1 (up to 100% of the measured base); quantified in workshop mode only; year 1 share = renewal share, else 0.25; label "Your measured unused licence cost, up to 100%, realisable at renewal; expected case is half" | `packages/engine-core/src/accelerators/finops-iq/registry/levers.json` |
| Global cap | 29% of public-cloud spend on all three cases; `excludedLevers: ["LEV-09"]`; source Flexera 2026 State of the Cloud, respondents' average self-estimate of wasted IaaS/PaaS spend, n = 753, "used as a ceiling only" (CLM-FIN-040, ASM-FIN-050) | same file, `globalCap` |
| Flexera 2026 sample | 62% US, 23% Europe, 13% Asia-Pacific, self-reported | `registry/market-data.json` (MKT-FIN-FLEXERA-2026) |
| State of FinOps 2026 | n = 1,192; 90% manage or plan to manage SaaS, 64% licensing, 48% data centre. Scope shares only, no savings or waste percentage | `market-data.json` (MKT-FIN-SOF-2026) |
| Rejected figures | Several unsourced percentages are on the rejected list ("No source found; levers use client evidence instead") | `market-data.json` |
| Boundary rule | LEV-09 is the only shelfware lever. Cost IQ imports it, or computes it with the same formula, same client-measured input, same module. Cost IQ's non-cloud levers get new IDs after LEV-10; "Any Cost IQ cap, only if a published source with year and sample is found (UNSOURCED today)" | `docs/cio-readiness/cost-iq/BOUNDARY.md` 3.2, 3.3 item 4, 3.5 |

Consequence for this search: a published SaaS figure must not become a second, different SaaS number in Cost IQ (see section 8).

## 2. Lever 1: Software licence true-down and optimisation (enterprise software, ELAs, publisher audits)

**Sources**

1. *Flexera 2023 State of ITAM Report*, Flexera (software vendor), 2023. Press release: https://www.flexera.com/about-us/press-center/flexera-2023-state-of-itam-report-highlights-cost-savings-as-top-enterprise-priority . Says: survey of 500 ITAM, SAM and HAM professionals at organisations with 1,000 or more employees, "global" with no regional split. Respondents' **self-estimated** wasted or under-used spend: desktop software 36%, data-centre software 33%, SaaS 32%, IaaS/PaaS 32%. Also: 55% saved more than USD 1 million through SAM in the past year; 16% more than USD 10 million.
2. *Flexera 2023 Tech Spend Pulse*, Flexera, 2023. Via https://www.ciodive.com/press-release/20231025-flexera-2023-techspend-pulse-finds-it-teams-challenged-by-lack-of-it-visibi/ . n = 506, worldwide, no regional split. Same categories, lower self-estimates: desktop software 27%, data-centre software 23%, SaaS 21%, IaaS/PaaS 19%. Flexera itself cautions the fall may reflect optimistic views.
3. *Flexera 2026 State of ITAM*, Flexera, 2026. https://www.flexera.com/blog/it-asset-management/state-of-itam-2026/ . n = 512, "global", method not described. 48% audited in the past year; 44% spent over USD 1 million on vendor audits in three years; 64% of audited organisations reported Microsoft audits; licence reuse generates significant savings for 43%. **No savings percentage and no waste percentage.**
4. *Flexera 2025 State of ITAM*, press release, 18 Jun 2025. https://www.flexera.com/about-us/press-center/it-teams-losing-visibility-according-to-flexera-2025-state-of-itam-report . n = 506, "global", method not described. 45% spent over USD 1 million on audits in three years; audit shares by vendor (Microsoft 50%, IBM 37%, SAP 32%). No savings figure.

**Nature of the figures.** Self-reported survey; vendor-run (Flexera sells ITAM and cost tools, a commercial interest). Items 1 and 2 are a **proportion of spend the respondents believe is wasted**, not a saving achieved and not a recoverable share. The two 2023 surveys disagree by 9 to 12 points in the same year, which shows the sensitivity to who answers and when. Items 3 and 4 are audit exposure and are useful as a risk statement, not as a saving.

**Region.** Global, no split published, so applying it unlabelled to any one region is not supported. (Contrast Flexera 2026 State of the Cloud, which publishes a 62/23/13 split.)

**Ceiling?** Possible in kind: the same publisher and the same self-estimate construction as the cloud ceiling already accepted for FinOps IQ. Not recommended yet, because the data is 2023 and I could not read the full report. A ceiling in Cost IQ would be a cap of at most about a third of in-scope software spend, never a target.

**Verdict: USABLE AS CONTEXT ONLY (cite, never apply).** Decision A for the owner: accept Flexera ITAM 2023 as a software ceiling by the cloud precedent (needs a new market-data entry, claim ID and sample note), or wait for a current-year equivalent.

## 3. Lever 2: Vendor and contract reset or renegotiation (IT sourcing and managed services)

**Sources**

1. Domberger, Fernandez and Fiebig, "Modelling the price, performance and contract characteristics of IT outsourcing", *Journal of Information Technology* 15(2), 2000. https://aisel.aisnet.org/jit/vol15/iss2/3 . Says: 48 contracts for IT support and maintenance, two-equation regression. First-time contracts cost more than repeat contracts; **competitive tendering did not give lower prices than negotiated contracts**; it was linked to better performance. Region of sample not stated on the abstract page I opened. Peer reviewed, 26 years old, tiny sample.
2. Susarla, *Management Science* 2012, https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.1110.1493 . Reported through search results only: 141 IT outsourcing contracts; flexibility provisions associated with renegotiated amendments that benefit both parties. Measures amendments, not savings. Not opened.
3. GAO-14-63, *Networx transition*, US Government Accountability Office, Jan 2014, https://gao.gov/assets/670/660000.txt . A reset of a large telecom contract set: GSA's April 2010 analysis estimated agencies could save 28.4% of their FTS2001 spend by moving to Networx; GAO applied that rate to about USD 1.2 billion of spend and estimated about USD 329 million of forgone saving. Single dated GSA estimate, US federal only, GAO did not test GSA's cost accounting. This is also the best evidence for lever 6.
4. Deloitte *Global Outsourcing Survey* (2020, 2024): not usable. The 2020 edition is 40 interviews with no percentages; the 2024 edition's figures appeared only on third-party pages and I did not open Deloitte's own report.
5. A Gartner survey of about 200 European executives (55% of enterprises renegotiated within the contract life) reached me only through a law-firm news page with no date. Not cited.

**Nature.** Academic correlational evidence and one regulator-published one-off estimate. None gives a range of saving from resetting managed-service or software contracts. Vendor and consultancy case studies (for example a "13% term fee reduction" at one airline) are anecdotes and are excluded.

**Region.** Item 1 not stated; item 3 US federal; item 2 not stated.

**Verdict: NO PUBLIC SOURCE FOUND (stay evidence-based).** Domberger is worth citing as a caution in the methodology: published evidence does not show that re-tendering lowers price. Cost IQ should quantify this lever only from client contract data (current price, benchmark quote or rate card the client holds).

## 4. Lever 3: Infrastructure consolidation and lifecycle (data centre, hardware, colocation exit, virtualization platform change)

**Sources**

1. GAO-23-105946, *Data Center Optimization: Agencies Continue to Report Progress*, US GAO, 2023. https://gao.gov/products/gao-23-105946 . Says: 24 agencies; in FY2021, 58 data centres closed and USD 612.326 million of savings identified (22 of 24 agencies met their goals); FY2022 to Aug 2022, USD 334.324 million; **cumulative FY2012 to FY2021, USD 6.6 billion of "cost savings and avoidances"**. Agency-reported, savings and avoidance combined. I could not read the data-reliability section.
2. Earlier GAO reports on the same programme (GAO-17-448 and GAO-17-388) found inconsistent savings reporting across agencies; seen only as search excerpts, not opened.
3. Uptime Institute *Global Data Center Survey 2025*, 15th annual, n > 800 owners and operators, online survey April to May 2025. https://intelligence.uptimeinstitute.com/resource/2025-global-data-center-survey-results-and-crosstabs . It covers operations, power and resilience. I found no consolidation or exit saving percentage in what I could reach.
4. Virtualization platform change (for example after the Broadcom and VMware price changes): only Gartner predictions quoted by trade press (70% of customers moving at least half of workloads by 2028; a lower "more than a third") and a trade-press poll on price rises. The press figures disagree and I did not find the Gartner primary. **UNSOURCED** as a saving, and a prediction of migration is not a saving.

**Nature.** Item 1 is an audited public-sector programme result in dollars, with no denominator (no total data-centre spend), so it **cannot be turned into a proportion**. It is evidence that consolidation produces savings and that agencies find them hard to report consistently.

**Region.** US federal civilian agencies only. Uptime is global but gives no saving.

**Ceiling?** No: there is no percentage to cap with.

**Verdict: USABLE AS CONTEXT ONLY (cite, never apply)** for consolidation, with the line "US federal agencies reported USD 6.6 billion of savings and avoidance across FY2012 to FY2021 (GAO, 2023); this does not translate to a share of any one client's spend". **NO PUBLIC SOURCE FOUND** for colocation exit and virtualization platform change.

## 5. Lever 4: Application portfolio rationalisation (retire, consolidate)

**Sources**

1. GAO-14-65, *PortfolioStat*, US GAO, 2013. https://www.gao.gov/products/GAO-14-65 . 26 agencies; about 200 consolidation opportunities; "at least USD 5.8 billion in potential savings through fiscal year 2015" (OMB's own figure was USD 2.5 billion). **Projected, not realised**; four of five agencies reviewed in depth did not always support their estimates.
2. GAO-25-107604, annual duplication and overlap report, 13 May 2025 (read via https://www.nextgov.com/modernization/2025/05/consolidating-it-systems-can-lead-over-100m-cost-savings-gao-finds/405307/ ; GAO report itself not opened). Fully implementing annual IT portfolio reviews could save "USD 100 million or more". Potential, US federal.
3. GAO-25-107795, *legacy systems most in need of modernization*, 2026 public version. https://www.gao.gov/products/gao-25-107795 . 69 systems reviewed on 16 attributes; agencies typically report about 80% of more than USD 100 billion federal IT spend goes to operations and maintenance of existing IT. A share of budget, not a saving; selection is agency-submitted so not a full inventory.
4. NAO press release, *Modernising ageing digital services*, 6 Dec 2022. https://www.nao.org.uk/press-releases/modernising-ageing-digital-services/ . Defra's own estimate: 76% of its digital, data and technology spend maintains ageing systems; 30% of its legacy applications unsupported. One department, self-estimate; the release does not say how it was calculated or verified. The full report PDF would not decode.
5. Vendor and consultancy case studies (for example a 16% "identified" cost reduction and a 24% "IT cost reduction" at a named insurer) surfaced in search. Weak: vendor marketing, identified rather than realised, one client each. Excluded.

**Nature.** Public audit-office figures are potential savings on public portfolios or O&M shares. None is a realised saving range for retiring or merging applications in a private enterprise.

**Region.** US federal (items 1 to 3) and one UK department (item 4).

**Verdict: NO PUBLIC SOURCE FOUND (stay evidence-based)** for a range. The O&M shares (80% US federal, 76% Defra) may be shown as context about why the base is large, labelled public-sector.

## 6. Lever 5: Technology workforce and sourcing mix (contractor to employee, automation of manual operations)

**Sources**

1. DOE Inspector General audit of Sandia staff augmentation, 2000. https://www.energy.gov/sites/default/files/igprod/documents/CalendarYear2000/wrb0004.pdf . From search excerpt only: long-term staff augmentation not economical; contractor fringe, overhead and profit 34 to 49%. One laboratory, 26 years old. Not opened.
2. TVA Office of Inspector General, *Information Technology's Use of Contractors*, 2016. https://www.oversight.gov/report/tva/information-technologys-use-contractors . Recommends understanding total cost of contract versus employee workforce. Page returned HTTP 406; figures not read.
3. GAO-style fully-loaded cost method papers (GAO GGD-94-95, 1994) concern how comparisons are built, not an IT result.
4. Deloitte Global RPA surveys (2017 to 2018 editions): 81% of organisations that implemented or scaled RPA agree it reduced cost, and 59% reported cost reduction as a benefit. Share of respondents, not an amount; sample not stated in what I saw; old.
5. Advocacy and recruiter material (POGO, staffing blogs): excluded.

**Nature.** Old audits and perception surveys. No sampled study of IT contractor versus employee cost, and no public study of cost reduction from automating manual IT operations. A contractor-to-employee saving also depends on local labour law, benefits load and attrition, so a single cross-region number would be misleading even if one existed.

**Region.** US only (federal or federally owned bodies).

**Verdict: NO PUBLIC SOURCE FOUND (stay evidence-based).** Quantify only from client payroll and contractor rate data, with the client's fully loaded employee cost supplied by the client (the FinOps IQ design already refuses an assumed salary: `assumptions.json`, "a net figure needs a cost; an assumed salary would be unsourced").

## 7. Lever 6: Network and telecom cost optimisation

**Sources**

1. GAO-14-63 (Jan 2014), https://gao.gov/assets/670/660000.txt : the **28.4% saving** GSA estimated in April 2010 from moving federal telecom from FTS2001 to Networx, applied by GAO to about USD 1.2 billion of spend. Government-wide, US only, 16 years old, a rebid of a single large contract set, not a general proportion for enterprise network spend.
2. Vendor and TEM-provider material (Cass, Tangoe, Beroe and others): case-study savings of 15% to 36%, "23 to 26%" market estimates and "3 to 5% of spend in billing errors", with no method or sample. Weak, vendor-sourced; excluded. An IDC InfoBrief sponsored by Tangoe reports 89% adoption of TEM, with no savings figure. A Gartner "12 to 20% of charges in error" claim reached me only through a vendor blog and is not cited.
3. I found no Ofcom, regulator or TBM Council publication giving a network cost-reduction range. The TBM Council's published material (case-study pages; the 2016 federal USD 5.8 billion estimate that rests on a Forrester study) gives no sampled benchmark I could open.

**Region.** US federal for item 1.

**Verdict: USABLE AS CONTEXT ONLY (cite, never apply)** for item 1 as a worked example of what a contract rebid delivered once; **NO PUBLIC SOURCE FOUND** for a range. Treat as evidence-based (client invoice audit, circuit inventory, quotes).

## 8. Lever 7: SaaS licence reclamation, checked against FinOps IQ LEV-09

**Sources**

1. *2026 SaaS Management Index*, Zylo (SaaS-management vendor), 2026. Read through https://zylo.com/blog/how-much-wasted-on-saas-spend (updated 19 Mar 2026). Says: average licence utilisation 54%, so about 46% unused; USD 19.8 million average annual waste per organisation; by size: 1 to 500 staff USD 3.8m, 501 to 2,500 USD 9.5m, 2,501 to 10,000 USD 29.8m, over 10,000 USD 80.6m; leaders reach 90% or more utilisation. A search summary also quotes a "40M licences and USD 75B" dataset, but the page I opened gives **no dataset size, no method, no time window and no definition of unused**. A separate Zylo page puts enterprise unused licences at 43%; a third-party article quotes 36% against recommended utilisation. The three figures disagree and the report itself was not opened.
2. Flexera ITAM 2023 and Tech Spend Pulse 2023 (section 2): SaaS self-estimated waste 32% and 21%.
3. FinOps Foundation *State of FinOps 2026* (n = 1,192): 90% manage or plan to manage SaaS; no saving percentage (https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1).

**Nature.** Vendor data (Zylo sells the remedy), unspecified method, and **unused licences are not recoverable savings**: reclamation is realised only at renewal, subject to minimum commitments. Flexera is a survey self-estimate of waste. The published figures range from 21% to 46% for "unused or wasted", a spread that is itself the reason not to pick one.

**Region.** Zylo: not stated (UNSOURCED, likely customer base weighted to its own clients); Flexera: global, no split.

**Consistency with LEV-09.** LEV-09 deliberately takes **no published percentage**: base is the client's measured unused cost, up to 100%, expected half, excluded from the 29% cap. That is the correct treatment of the evidence found. Recommendation: Cost IQ must (a) use LEV-09 itself for SaaS shelfware, never a second SaaS figure; (b) put software true-down (lever 1) on **non-SaaS licences only** (on-premises, ELA, publisher-audit exposure) so that SaaS is not counted in both; (c) show Zylo and Flexera figures at most as labelled context in the market panel, never in a calculation; (d) record the 21 to 46% spread in the assumption register as the reason no cap is applied.

**Verdict: USABLE AS CONTEXT ONLY (cite, never apply).** Zylo is weaker than Flexera and should carry the label "vendor-reported, method not published".

## 9. Global-coverage rule applied

`docs/cio-readiness/GLOBAL-COVERAGE.md` ("Benchmarks and value caps carry the region of their published source"; Cost IQ currently has the FinOps IQ statement). Applied here:

| Source | Region of sample | Consequence |
|---|---|---|
| Flexera ITAM 2023, Tech Spend Pulse 2023, ITAM 2025 and 2026 | "Global", no split published | Label "global, no regional split; not a benchmark for your country" |
| Flexera Tech Spend 2020 (n = 303, found in passing) | North America and Europe, firms of 2,000+ staff | Not used; too old |
| Zylo 2026 | Not stated | Label region UNSOURCED |
| GAO (23-105946, 14-65, 14-63, 25-107795, 25-107604) | US federal agencies only | Never apply to a private-sector or non-US client; public sector context only |
| NAO / Defra | One UK department | Never generalise |
| Domberger 2000, Susarla 2012 | Not stated in what I read | Cite as method evidence only |
| Uptime 2025 | Global operators; regional crosstabs exist | No saving, so nothing to apply |

No source covers APAC, Switzerland, India or the Gulf. If any figure is shown in a report, the coverage statement must name the sample region and say it is not a benchmark for the client's country, and the assumption register must record that region.

## 10. What I could not open or verify

- **No PDF text tool in this environment.** I could not read the full GAO-23-105946 highlights PDF or the NAO *Modernising ageing digital services* report PDF; I used the GAO product pages and the NAO press release instead. Data-reliability sections are unread.
- GAO-25-107604 and GAO-17-448/388 were not opened; the first via Nextgov, the second from search excerpts.
- Zylo's report itself, its dataset and method: not opened. The Flexera ITAM and Tech Spend full reports (gated): only press releases and blog pages opened; those pages do not state fieldwork dates or margins.
- TVA OIG report page: HTTP 406. DOE IG report: search excerpt only.
- Deloitte Global Outsourcing Survey 2024, Gartner VMware material, Susarla 2012 full text, TBM Council benchmarks: not reached in primary form.
- The searches that produced several of these figures returned summaries written by a search tool; every figure in a verdict comes from a page I opened, except where this section says otherwise.

## 11. Summary table

| Lever | Verdict | Best source | Region of sample | Recommended Cost IQ treatment |
|---|---|---|---|---|
| 1 Software licence true-down (non-SaaS) | CONTEXT ONLY | Flexera 2023 State of ITAM (n = 500, self-estimate 33% to 36% of software spend wasted) | Global, no split | Context line; evidence-based quantification; owner decision A on a cap |
| 2 Vendor and contract reset | NO PUBLIC SOURCE FOUND | Domberger et al. 2000 (n = 48 contracts) shows tendering did not lower price; no range | Not stated | Evidence-based only |
| 3 Infrastructure consolidation and lifecycle | CONTEXT ONLY (consolidation); NO SOURCE (colocation exit, virtualization change) | GAO-23-105946: USD 6.6bn savings and avoidance FY2012 to FY2021, no percentage | US federal | Context line; evidence-based only |
| 4 Application rationalisation | NO PUBLIC SOURCE FOUND | GAO-14-65 (USD 5.8bn projected); O&M shares 80% (GAO) and 76% (NAO Defra) are context | US federal; one UK department | Evidence-based only; optional labelled O&M context line |
| 5 Workforce and sourcing mix | NO PUBLIC SOURCE FOUND | None (old DOE and TVA audits not read in full) | US only | Evidence-based only |
| 6 Network and telecom | CONTEXT ONLY | GAO-14-63: 28.4% GSA estimate on a federal rebid (2010 rate) | US federal | Context line; evidence-based only |
| 7 SaaS licence reclamation | CONTEXT ONLY | Zylo 2026 (vendor, method not published, 46% unused); Flexera 2023 (21% to 32%) | Zylo not stated; Flexera global | Use LEV-09 only; context line if shown; no cap |

Decisions for the owner (recommended default in brackets): **A** accept Flexera ITAM 2023 as a software ceiling by cloud precedent [no; wait for a current-year equivalent]; **B** show public-sector O&M shares as labelled context for lever 4 [yes, labelled US federal and one UK department]; **C** accept that most Cost IQ non-cloud levers stay evidence-based and give few figures in an executive run [yes, as `BOUNDARY.md` O4 already proposes].
