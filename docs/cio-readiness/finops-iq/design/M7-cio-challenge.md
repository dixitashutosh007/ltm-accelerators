# FinOps IQ M7: CIO challenge test (production-readiness review)

**Date:** 22 Oct 2026. **Reviewer:** finops-cost-lead (AI practice-lead agent). This is advice; the product owner decides.
**Build:** branch `finops-iq-merge`, commit 625e4d9, engine 3.6.0, value model 1.2.0, playbook 1.0.0.
**Gate:** the report answers at least 9 of the 10 questions from its own pages (PLAN F7; reused for M7). The questions and method are the same as [M4-cio-challenge.md](M4-cio-challenge.md). The designed answers are in DESIGN.md 10.13.
**Evidence:** the rendered PDFs only, read as a CIO would read them. Each PDF was rendered to page images and a text layer with macOS PDFKit, in the session scratchpad (`m7/RS*-client`, `m7/RS*-consultant`).
- RS4 (workshop, 51 pages) and RS5 (executive, 29 pages), client edition: read in full.
- RS1, RS2, RS3 and RS6 to RS9, client edition: executive summary, How LTM can help, technical execution and methodology spot-checked. All nine were also scanned for leaked internal text and for table headers left at the bottom of a page.
- Consultant editions: compared with the client editions for RS4 and RS5.
- New since M4, and reviewed here: "How LTM can help", technical execution by platform, the roadmap milestones for each level (M5), and the revised data notice and disclaimer (M6).

## Verdict

**Score: 10 of 10 Pass. The gate (9 of 10) is met.**

All the M4 answers are still in place. M5 makes two of them stronger:
- **Q8:** the roadmap now shows one milestone for each maturity level. The 3-month "Not yet to Run" milestones from M4 are gone. For example, RS4 p11 now reads "Month 3: Data Ingestion at Crawl … Month 9 … at Walk … Month 15 … at Run".
- **Q9:** the data notice now covers retention, deletion and log retention.

The score does not mean the report is ready for a client. M5 and M6 add new defects a sceptical reader would find, and four of them are High (table below):
- **D1:** the report's logic for the FinOps owner and the FinOps team contradicts itself.
- **D2:** the Google Cloud commitment rate does not follow the report's own rule. It inflates the headline in Google scenarios by about a sixth.
- **D3:** the report tells the client both "do not start Spot" and "move workloads to Spot".
- **D4:** the notice names no safeguard for the transfer to India, and draft markers are still in the report. This is the M6 action list (A1, A3), not a build fault.

I recommend fixing D1 to D3, plus the visible text defects D5 to D7, before M7 closes.

## Status of the defects (22 Oct 2026)

| # | Status | What changed |
|---|---|---|
| D1, D3, D5, D6, D7 | Fixed in M7 (engine 3.6.1) | See M7-readiness.md |
| D2 | Owner kept 55% | The report no longer calls the Google Cloud rate "the lower published maximum": Appendix A says the resource-based maximum is used, higher than the flexible CUD maximum, and asks the consultant to confirm the instrument. ASM-FIN-062, the LEV-01 rule and its claim say the same |
| D4 | A3 done; A1 open | Draft markers removed in M8; the transfer instrument waits for LTM's privacy office |
| D8 | Fixed | Technical execution names the findings it leaves out: platform work still being added to the playbook (none since playbook 1.1.0, 23 Oct 2026, which adds Governance, Policy & Risk and Reporting & Analytics on every platform), and operating-model work covered in the roadmap |
| D9 | Fixed | Lever milestones state an outcome (workstream library 1.2.0, `leverMilestones`); a lever at zero or not worth pursuing keeps its own title |
| D10 | Fixed | Section 4 and ASM-FIN-045 state that lever value comes from the lever actions, not from reaching the capability target |
| D11 | Fixed | One block per control: the approach sentences all platforms share are stated once, a platform keeps only its own; a shared discovery need is stated once; rows are grouped and labelled by lever; not-applicable platforms collapse into one line. Per-platform wording for allocation hierarchies, data centre rightsizing and data centre scheduling verification |
| D12 | Fixed | LTM claims show "Available on request" in both editions; the secondary Finout source and its figure (57% private cloud, CLM-FIN-046) are dropped; status column widened |
| D13 | Fixed | Flexera figures checked against Flexera's release of 18 March 2026 (29%, 85%, 63%); caveats rewritten for the client; the 2025 figure (27%, secondary sources only, conflicting) is no longer shown |
| D14 | Fixed | "See Cost IQ" replaced by a typed offering, SaaS portfolio and vendor strategy (advisory); routes to other accelerators stay in the consultant SOW draft only |
| D15 | Fixed | Type reads "transformation: managed run service"; the managed service is no longer offered for the accountable-owner decision |
| D16 | Fixed | Client appendices drop design references, finding-rule IDs and fact paths |
| D17 | Fixed | "Need index 39 out of 100", whole numbers |
| D18 | Fixed | The situation line names the rest of the estate in scope |
| D19 | Fixed | Appendix A notes that shown figures are rounded and the arithmetic runs unrounded |
| D20 | Fixed | Singular verb and "its exports" for one tool; the Kubernetes bullet appears only with Kubernetes in scope; "your identity provider's group-based licensing (for example Microsoft 365)" |
| D21 | Fixed | LTM claims show status "LTM", not "V" |

Engine 3.6.2, workstream library 1.2.0. Each fix has a test in `finops-iq-v3-report.test.ts` ("M7 CIO challenge backlog"). Golden outputs changed only in the offering mappings (D14, D15); no value figure moved.

## Results by question

| # | Question | Result | Where it is answered (scenario, page) |
|---|---|---|---|
| 1 | On what basis is this figure in front of my board? | **Pass** (defect D2) | Section 4 lever table; Appendix A formula, inputs, provider maximum and arithmetic; Appendix C source (RS5 p6, p14, p27; RS4 p10, p26) |
| 2 | Is that net, and in which year do I see it? | **Pass** (defects D1, D10) | Executive summary value tiles and range; section 4 totals by case and costs (RS5 p3, p6; RS4 p3, p9–10) |
| 3 | Which levers, and how much each? | **Pass** | Section 4 levers, "Identified, not quantified"; lever not worth pursuing (RS4 p7, p10; RS5 p6) |
| 4 | Why is a peer's score higher but their stage lower? | **Pass** (defect D17) | Section 1 Issue; section 2 introduction; section 9 (RS5 p3, p12; RS4 p3) |
| 5 | Are these the FinOps Foundation's domains and capabilities? | **Pass** | Section 9 attribution, changes, non-endorsement and links (RS5 p12; RS4 p24) |
| 6 | What if our waste guess is wrong, or I leave a question blank? | **Pass** | Section 9 question counts, blanks named, waste-estimate sentence (RS5 p12; RS4 p25) |
| 7 | Why isn't this already done by our provider's tools? | **Pass** (defect D20) | Section 9 "Why provider tools are not enough" (RS5 p12; RS4 p24–25) |
| 8 | Who owns each action, how much effort, what depends on what? | **Pass** (defects D3, D9) | Findings table and detail; section 5 roadmap with a milestone per level (RS5 p4–9; RS4 p4–13) |
| 9 | What data did you take, where is it stored, did AI see it? | **Pass** (defect D4) | Section 9 "How your data is handled" (RS5 p12; RS4 p25) |
| 10 | How do we compare with published data? | **Pass** (defect D13) | Section 8 published market data (RS5 p11–12; RS4 p24) |

### Q1. On what basis is this figure in front of my board? Pass

- RS5 p6, lever table: "Commitment discounts GBP 971k · 55% · GBP 25k · GBP 267k · GBP 877k · Low". Below it: "the expected case takes half of it and the conservative case a quarter".
- RS5 p14, Appendix A: the formula, every input with its band, the provider row "Google Cloud 55% Resource-based committed use discounts (not stated; the lower published maximum is used)", and "base GBP 971k × rate 55% × factor 50% = GBP 267k". Sensitivity follows on p15.
- RS5 p27: CLM-FIN-065 links to Google's committed use discounts page, checked 2026-10-14.

**Weakness (D2).** The basis is shown, but it does not follow the report's own rule. "The lower published maximum" is the flexible instrument for AWS (66%) and Azure (65%). For Google Cloud the flexible instrument, compute flexible CUDs, is 46% for three years on general-purpose series (source 1). The report applies 55%, the resource-based maximum. A CFO who checks the Google page will find the gap.

### Q2. Is that net, and in which year do I see it? Pass

- RS5 p3 shows net at full run-rate (GBP 378k), net in year 1 (GBP 121k) and net over three years (GBP 879k). It also shows the range ("from GBP 32k (conservative) to GBP 3.41m (upper)") and the negative conservative first year ("GBP −11k").
- RS5 p6: net by year for each case.
- The "Not netted" line reconciles, and the arithmetic checks:
  - RS4 p10: "32 FTE-months … This is the effort netted above", plus 96 not netted. That makes 128, the roadmap total of 36 + 39 + 10 + 25 + 18.
  - RS5: 2 + 3 = 5, the roadmap total.

**Weaknesses.**
- **D1:** the team-cost part of the "Not netted" line is wrong in RS3 and RS6.
- **D10:** full run-rate from year 2 is not reconciled with capability milestones that run to month 18.

### Q3. Which levers, and how much each? Pass

- RS4 p10: five quantified levers. The expected values add up to the gross figure: 843 + 751 + 150 + 1,450 + 700 = EUR 3.89m.
- RS4 p10 also gives "Identified, not quantified" with the evidence needed. RS4 p7 shows the Spot lever "not worth pursuing at this scale".
- RS5 p6 lists the levers executive mode does not quantify and the evidence that would quantify them.

### Q4. Why is a peer's score higher but their stage lower? Pass

- RS5 p3: "Need index 39 on a scale to 100: how urgently to act, not a maturity score." Section 2 says: "There is no overall score or stage: targets differ by estate, so a score would not compare across organisations."
- Small defect (D17): the precision is still uneven (RS1 "36.7", RS7 "63.3"), and "on a scale to 100" is not idiomatic.

### Q5. Are these the FinOps Foundation's domains and capabilities? Pass

- RS5 p12: "adapted from the FinOps Framework by the FinOps Foundation under CC BY 4.0. Changes by LTM: …". It is "not endorsed by the FinOps Foundation and is not a FinOps Foundation assessment or certification."
- The M6 links to the Framework, the Foundation and the licence are now shown.

### Q6. What if our waste guess is wrong, or I leave a question blank? Pass

- RS4 p25: "Questions asked: 62, of which 41 rate a capability … answered: 40; 'Don't know': 1; left blank: 1. A blank or 'Don't know' is rated as unconfirmed and never raises a value. If you gave your own estimate of waste, it is not used in any figure". The blank and the "Don't know" are then named by their question wording.
- The executive summary no longer carries a separate question count, so the M4 R1 contradiction is gone.

### Q7. Why isn't this already done by our provider's tools? Pass

- RS4 p24–25: "AWS Cost Optimization Hub and Compute Optimizer and Azure Advisor give resource-level recommendations, each for its own platform. This assessment uses their exports as evidence … It also covers what those tools do not assess".
- RS5 p12 now uses the singular verb ("Google Cloud Recommender gives"), but the next sentence still says "their exports" (D20).

### Q8. Who owns each action, how much effort, what depends on what? Pass

- Every finding has an owner, a start month, a duration and the evidence to confirm (RS4 p4–9).
- Every workstream has months, effort, owners, activities, a milestone per level, KPIs, prerequisites, risks and "Depends on" (RS4 p10–13).
- Durations now grow with the gap: RS4 Data Ingestion, Not yet to Run, takes 15 months; Allocation, Crawl to Run, takes 9 months. This matches the FinOps Foundation's description of maturity as iterative, one level at a time (source 2).
- The overlap rule is stated (RS4 p11) and consistent: RS5 Usage Optimization starts in month 3, "After the first milestone of: Allocation", whose first milestone is "Month 3: Allocation at Crawl".

**Weaknesses.**
- **D3:** Spot is advised against and also scheduled.
- **D9:** some milestones are finding titles, not outcomes.

### Q9. What data did you take, where is it stored, did AI see it? Pass

- RS5 p12: LTM is named as responsible, the hosting is AWS Mumbai, and the notice says plainly that EU and UK data goes to a country without adequacy. It lists what is held and why, says "We keep each assessment for two years after its last change and then delete it automatically; ask your consultant to delete it sooner", gives one-year log retention, says "This version uses no AI features", and points to LTM's privacy notice.
- **Not answered (D4):** what safeguard covers the transfer. Procurement in the EU or UK will ask this first. The notice is correct to stay silent until LTM confirms the instrument (M6 action A1).

### Q10. How do we compare with published data? Pass

- RS5 p11: "It is not an LTM peer benchmark, not your position and not a target: LTM has no engagement history to benchmark against."
- Rows give source, year and sample, for example "29% · Flexera, 2026 State of the Cloud Report · n = 753" and "98% · FinOps Foundation (Linux Foundation), State of FinOps 2026 · n = 1,192".
- Internal working notes are still shown as caveats (D13).

## Defects found on the pages

Ranked by how much a CIO, CFO or procurement lead would hold them against the report.

| # | Severity | Defect (scenario, page) | Suggested fix |
|---|---|---|---|
| D1 | High | **The FinOps owner and team logic contradicts itself.**<br>- RS6 p3 and p9: "no FinOps team cost, as your answers show an accountable owner for cloud spend already". But RS6 p5 rates FinOps Practice Operations "Crawl, target Run" (Critical), explains it with "Without an accountable owner and a regular review …", and p9 lists the activity "Appoint an accountable FinOps owner with a written mandate".<br>- RS3 p3, p5, p9 and p11: the same pattern ("High · FinOps Practice Operations: Crawl, target Walk"; no team cost; roadmap activity "Appoint an accountable FinOps owner").<br>- The reverse in RS5: p4 rates Practice Operations "Crawl, target Crawl, at or above target", yet the top finding (p3) is "High: Appoint an accountable FinOps owner with a mandate".<br>A CFO reads this as "you recommend a team, then cost it at zero", or "you say we meet target, then say no one is accountable". | Use one rule for the decision finding, the team-cost line and the operating-model activities.<br>- When Practice Operations is below target, cost the team at the target size minus what exists. Otherwise say: "Team size to be confirmed in the operating-model work: your answers show an owner, but the practice is below target."<br>- Show "Appoint an accountable FinOps owner" as an activity only when the decision finding is raised.<br>- When the decision finding is raised and Practice Operations meets its target, explain it: "the practice runs, but no single person is accountable for cloud spend". |
| D2 | High | **The Google Cloud commitment rate breaks the report's own rule.**<br>- RS5 p14 and RS6 p22 apply 55% under "not stated; the lower published maximum is used". For AWS and Azure the same rule (ASM-FIN-062, RS5 p25) picks the flexible instrument (Compute Savings Plans 66%, savings plan for compute 65%).<br>- Google's flexible instrument, compute flexible CUDs, gives 46% for three years on general-purpose series (source 1). The claims register already records this in CLM-FIN-066.<br>- The technical execution tells the same client to "prefer flexible instruments first" (RS5 p11).<br>- At 46%, RS5 LEV-01 expected falls from GBP 267k to about GBP 223k, and expected net run-rate from GBP 378k to about GBP 334k. RS6 LEV-01 falls from EUR 465k to about EUR 389k. | Owner decision; recommended default: use 46% for Google Cloud when the instrument is not stated, and update ASM-FIN-060/062, DESIGN 10.15 and the golden outputs. The alternative is to keep 55% and relabel it "resource-based maximum (higher than the flexible maximum)", but then the "lower maximum" rule no longer holds and the flexible-first advice contradicts the value. |
| D3 | High | **Spot is advised against and scheduled in the same report.**<br>- RS4 p7: "Spot and preemptible capacity: not worth pursuing at this scale: Do not start this lever now".<br>- RS4 p12, Commitment portfolio activities: "Plan purchases alongside the scheduling, rightsizing and Spot changes" and "Move interruption-tolerant workloads not covered by commitments to Spot or preemptible capacity". The Rate Optimization target text on p7 adds "Spot the default for tolerant workloads".<br>- RS5 p8 (executive mode, Spot not quantified) also schedules the Spot move. | Filter Spot activities and wording by the Spot lever's status:<br>- not worth pursuing: drop the activity and say "Spot: re-check when spend or inputs change";<br>- not quantified: "Assess interruption-tolerant workloads for Spot";<br>- quantified: keep as now. |
| D4 | High (external use) | **No transfer safeguard is named, and draft markers remain.**<br>- The notice (RS5 p12) says EU and UK data goes to India but names no safeguard.<br>- The cover says "Status Review draft." (p1), and p13 says "The data notice and the disclaimer are draft wording, pending approval." | M6 actions A1 (confirm the SCCs and UK Addendum or IDTA, then add the sentence already drafted in M6 section 4) and A3 (owner approval). Then remove both markers. Blocks external EU and UK use; does not block internal pilots. |
| D5 | Medium | **Duplicated text in technical execution.** "act on them through SaaS and licensing SaaS and licensing at renewal" and "removed through SaaS and licensing SaaS and licensing" appear in every scenario with SaaS in scope: RS4 p19, p20, p21 and p22; also RS2, RS3 and RS7. Cause: the playbook says "through LEV-09 SaaS and licensing", and the client edition replaces "LEV-09" with its name (`packages/engine-core/src/playbook/finops-iq.json` lines 1319, 1628, 1943, 2255 and 2886). | Change the playbook text to "through the SaaS and licensing lever", without the ID. Add a renderer test for repeated adjacent phrases. |
| D6 | Medium | **Raw platform key in the client edition.** "data_platform" is shown as the platform name in RS7 p12–13 (three rows), and in the RS7 backlog CSV. | Map it to a display name ("Data platform"), as is done for the other platforms. Add the key to the client-edition leak test. |
| D7 | Medium | **Table headers left alone at the bottom of a page.** 15 cases in all nine scenarios:<br>- the capability profile header on p3 (RS1, RS2, RS4, RS5, RS6);<br>- the technical execution header after a section heading (RS1 p11, RS2 p18 and p19, RS4 p23, RS5 p10, RS8 p12, RS9 p14);<br>- the Appendix A inputs header (RS2 p23, RS3 p21, RS6 p22).<br>RS5 p10 and RS4 p23 leave a third of the page blank under a heading and an empty header. | Keep a heading and table header with at least the first row (break-inside and keep-with-next rules in the shared renderer). Add a layout check that fails when a page ends on a table header. |
| D8 | Medium | **Technical execution says nothing about the findings it leaves out.**<br>- RS4 has Critical findings for Governance, Policy & Risk and Reporting & Analytics, and High or Medium findings for Forecasting, Invoicing & Chargeback and FinOps Tools & Services. None has a technical execution entry, and the section does not say why.<br>- The playbook covers only Data Ingestion, Allocation, Anomaly Management, Unit Economics and the levers (123 entries).<br>- Governance policy enforcement is platform work (tag and region policies), so a CIO will expect it here. | Now: add one sentence to the section 7 introduction, built from the result: "Not listed here, because they are operating-model work covered in the roadmap: {findings}." Next playbook version: add Governance, Policy & Risk and Reporting & Analytics entries. |
| D9 | Medium | **Some milestones are finding titles, not outcomes.** RS5 p8: "Month 9: Commitment discounts: indicative value on steady compute not yet covered". RS4 p12: "Month 15: SaaS and licensing: indicative value from measured unused licences and seats". A delivery lead cannot tell when either is done. | Give each lever finding an outcome milestone, for example "Month 9: first commitment tranche bought; coverage and utilisation reported monthly" and "Month 15: unused licences removed at each renewal that falls due". |
| D10 | Medium | **Value ramp not reconciled with the milestones.** RS4 p9 earns full run-rate from year 2 (EUR 3.67m net in year 2), while the roadmap reaches Usage Optimization at Walk in month 12 and at Run in month 18, and Rate Optimization at Run in month 18 (p12–13). A CFO will ask how full value arrives before the capability does. | State the basis in section 4 and in ASM-FIN-045: "Lever value comes from the lever actions in the roadmap, which land in year 1; it does not wait for the capability to reach its target level." The alternative, tying the ramp to milestones, would change approved value figures. |
| D11 | Medium | **Technical execution reads as machine-assembled.**<br>(a) The platform action and the generic approach run together in one cell, and the approach sentence repeats in every row.<br>(b) The generic text does not fit every platform: data centre rightsizing says "account for existing commitments before moving across families" (RS4 p19); data centre scheduling is verified "from billing usage" (RS4 p20); the GCP-only RS5 is told "An account, subscription or project hierarchy" (p11).<br>(c) In the RS4 Usage Optimization table, the rightsizing, idle and scheduling rows are not labelled, so AWS appears three times without saying which lever each row is for (p18–21).<br>(d) "Not applicable" rows fill space and put the reason in the Verification column. | (a) Show the approach once per control, above its table.<br>(b) Allow per-platform wording for approach and verification in the playbook.<br>(c) Label rows by lever, or split the table by lever.<br>(d) Collapse not-applicable rows into one line under the table, for example "Not applicable: SaaS and licensing (contract terms, handled at renewal)". |
| D12 | Medium | **Consultant edition: private links and a blog source.** RS5 consultant Appendix C still links LTM claims to `github.com/dixitashutosh007/…/DESIGN.md`. It cites "Finout (secondary): State of FinOps 2026 report key trends", a vendor blog the trusted-source policy excludes. "UNSOURCED" for CLM-FIN-069 breaks across lines ("UNSOURC / ED"). Consultants forward PDFs. | Use the client-edition treatment ("Available on request") in both editions. Replace the Finout source with the primary State of FinOps release, or drop the claim. Widen the status column. |
| D13 | Medium | **Market data caveats are still internal working notes** (M4 R5, open): "2025 sample not re-checked", "Question wording not read", "Release says 'nine of 10'; show as about nine in ten" (RS5 p11–12, RS4 p24). | Check the figures against the primary reports and write caveats for the client, or drop rows that cannot be checked. |
| D14 | Medium | **"See Cost IQ" in the client edition** (RS4 p15) points the client to an internal product name with no explanation. DESIGN.md (line 95) has Cost IQ point to FinOps IQ, not the other way round. | Replace it with a typed offering under a practice name, for example "SaaS portfolio and vendor strategy (advisory). Delivered by: FinOps", or drop the line. |
| D15 | Low | **Managed FinOps service:** the type reads "(transformation (run))" in every scenario, and the service is mapped to "Appoint an accountable FinOps owner", which cannot be outsourced. | "(transformation: managed run service)". Remove the decision finding from its "For" list, or say "supports the owner you appoint". |
| D16 | Low | **Internal references in client appendices:** "(D4)" in ASM-FIN-026; "(Q4)", "(Q10)" and "WS-S5" in ASM-FIN-058; "execution phase M4" in CLM-FIN-177 and 178; "evidence.saasLicence.renewingYear1Share" (RS4 p27); question IDs in assumption text (UN-04, VB-02). | Strip them in the client edition, as was done for the body text. |
| D17 | Low | **Need index:** uneven precision (RS1 36.7, RS7 63.3, RS5 39) and the phrase "on a scale to 100". | Round to a whole number: "Need index 39 out of 100". |
| D18 | Low | **The situation line omits non-public-cloud scope.** RS4 p3 gives only "public cloud spend of EUR 23.0m on AWS and Azure", but SaaS (EUR 20.0m) and the data centre are in scope and have technical execution rows. RS1 shows data centre rows with no data centre in its situation line. | Add the other scopes: "…; SaaS and licensing EUR 20.0m and the data centre also in scope". |
| D19 | Low | **Lever arithmetic residual** (M4 R7): RS4 p26 "EUR 2.57m × 65.3% × 50% = EUR 843k" multiplies out to EUR 839k; rightsizing "EUR 1.50m × 100% × 50% = EUR 751k". | Show bases to three significant figures where the product does not reproduce, or footnote "inputs rounded". |
| D20 | Low | **Wording:** RS5 p12 "Google Cloud Recommender gives … uses their exports" (singular, then plural). The Optimisation sprints offering lists "Kubernetes requests" for estates without Kubernetes (RS4, RS5). SaaS options name "Microsoft 365 group-based licensing" without the client having stated Microsoft 365. | "its exports" when one tool is named. Filter offering bullets by scope. Show Microsoft 365 only when the client names it, otherwise "your identity provider's group-based licensing". |
| D21 | Low | **Appendix C status:** about 45 LTM design-pack claims show "V verified against the source" with "Available on request". To a CFO this reads as LTM verifying itself. | Show status "LTM" for these, as the legend already implies. |

## Review of the new M5 sections

**How LTM can help.**
- Every finding appears under at least one typed offering. I checked RS4 (20 findings) and RS5 (6).
- The tone is advisory: "What could help with the findings … Providers and tools are chosen from your requirements, with alternatives."
- Indicative scope (weeks) is consultant-only, by owner decision D7 (DESIGN 11). Without it, the client cannot judge size from the client edition. That is acceptable for advice, but expect the question "how big is this?" in the room.
- Defects: D14 and D15, and the scope filter in D20.

**Technical execution.**
- The platform content is specific and well chosen. Examples: AWS Data Exports FOCUS 1.2, Azure Cost Management FOCUS export, Instance Scheduler on AWS, Start/Stop VMs v2, Compute Engine instance schedules, and the CUD analysis report.
- Each row has a verification step and an owner. Application-level rows state the discovery they need ("Needs: Product telemetry …").
- On-premises gets honest wording: "On owned capacity the gain is freed capacity and deferred hardware or licence purchases, not a lower bill."
- The weaknesses are presentation and coverage (D5, D6, D8, D11). In RS4 they make the section nine pages long.
- I did not re-verify the 123 playbook entries against provider documentation. I checked only the Google CUD rates behind D2.

**Roadmap milestones (D4 of M4).**
- Fixed and credible. RS4 p11–13 shows a milestone for every level, and durations grow with the gap (3, 9 and 15 months).
- Remaining defects: D9 (milestone wording) and D10 (ramp basis).

## Review of the M6 wording

| # | Text (RS5 p12–13) | Challenge a procurement lead or CFO would raise | Suggestion |
|---|---|---|---|
| W1 | Notice: no transfer safeguard named | "What protects our data in India?" | D4 / M6 action A1 |
| W2 | "We hold your answers, your spend figures and your organisation's name, used only to produce this assessment and its report, and the consultant's email address." | The purpose sits in the middle of the list, so it is unclear whether the email is limited to that purpose. It is also used for sign-in and access logs. | "We hold your answers, your spend figures and your organisation's name, and use them only to produce this assessment and its report. We also hold the consultant's email address, for sign-in and access records." For counsel to confirm. |
| W3 | Disclaimer: "any reliance on it is governed by your agreement with LTM, if there is one" | "If there is one" reads as hedging. Procurement will ask what governs when there is no agreement. | Leave to counsel (M6 6.3). One option: the consultant records the engagement reference at setup and the report names it. |
| W4 | Cover "Status Review draft."; p13 "draft wording, pending approval" | Signals the deliverable is not final | Remove after A3 (D4) |

The disclaimer otherwise does its job for a CFO. It says plainly that inputs are "not audited or verified", that value is "not a savings commitment", and that this is "not financial, accounting, tax or legal advice". The value label sits next to every headline figure.

## Recommended changes, ranked (advice)

1. **D1:** one rule for the FinOps owner finding, the team-cost line and the operating-model activities.
2. **D2:** the Google Cloud rate when the instrument is not stated (owner decision; recommended 46%). Regenerate the golden outputs.
3. **D3:** filter Spot activities by the Spot lever's status.
4. **D5, D6, D7:** duplicated text, the raw platform key and orphaned table headers. All are small, visible, and can be guarded by tests.
5. **D8 to D11:** the coverage sentence for technical execution, outcome milestones, the ramp basis sentence, and the technical execution layout.
6. **D12 to D14:** consultant-edition links and source, market data caveats, "See Cost IQ".
7. **D4 / W1 to W4:** M6 actions A1 and A3 before any external EU or UK use; counsel to look at W2 and W3.
8. **D15 to D21:** minor presentation fixes.

Items 1 to 4 are what I would want fixed before M7 closes. None of them changes the challenge score, which is already 10 of 10. They are what would cost credibility in front of a CFO.

## What I could not check

- **The live page, the API route and the backlog import.** I did not check them beyond scanning the RS4 and RS7 CSVs.
- **The WCAG audit** that M7 also requires.
- **The 123 playbook entries against provider documentation.** I checked only Google Cloud CUD rates, for D2.
- **Every page of RS1 to RS3 and RS6 to RS9.** They were spot-checked and scanned for patterns.
- **The consultant SOW appendix.** I read it only for RS5.
- **A real consultant name on the cover.** All samples say "Prepared by LTM consultant", so I could not tell whether a real consultant name reaches the cover in production.
- **The legal points W2 and W3.** These are for qualified counsel. M6 recorded an AI review, not a lawyer's.

## Sources

1. Google Cloud, "Committed use discounts overview", https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview (checked 22 Oct 2026). Resource-based CUDs: "a discount of up to 55% for all other machine series" and up to 70% for memory-optimized. Compute flexible CUDs: 28% for one year and 46% for three years for "vCPUs and memory of C2, C2D, C3, C3D, C4, C4A, C4D, E2, N1, N2, N2D, N4, N4D, and N4A machine series"; up to 63% for three years on M-series.
2. FinOps Foundation, FinOps Maturity Model, https://www.finops.org/framework/maturity-model/ (quoted in M4 on 22 Oct 2026, not re-fetched): "The practice of FinOps is inherently iterative"; a capability moving "from Crawl to Walk, or Walk to Run".
3. Internal, read 22 Oct 2026: DESIGN.md 10.13, 10.15 and 11; PLAN.md M4 to M6 status; design/M6-data-protection.md; `packages/engine-core/src/playbook/finops-iq.json`; `packages/engine-core/src/claims/claims-register.json` (CLM-FIN-065, CLM-FIN-066).
4. Rendered reports for RS1 to RS9, client and consultant editions, from `m4-samples/` (commit 625e4d9), as page images and text in the session scratchpad `m7/`, read 22 Oct 2026.

No other external facts are asserted in this note. Survey figures and the other provider maxima are quoted as the report states them; I did not re-verify them in this test.
