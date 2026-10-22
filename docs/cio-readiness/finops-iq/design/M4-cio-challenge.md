# FinOps IQ M4: CIO challenge test (PLAN F7 gate)

**Date:** 22 Oct 2026. **Reviewer:** finops-cost-lead (AI practice-lead agent). This is advice; the product owner decides.
**Build:** branch `finops-iq-merge`, commit a726e86, engine 3.4.0, value model 1.2.0.
**Gate:** "the report answers at least 9 of 10 from its own pages" (PLAN F7). The questions and designed answers are in DESIGN.md 10.13.
**Evidence:** only the rendered client-edition PDFs, read page by page from PNG images, as a CIO would read them.
- RS4 (workshop, 38 pages) and RS5 (executive, 27 pages): main sections and appendices read in full.
- RS1 (executive), RS2 and RS3 (workshop): spot-checked (executive summary, value, roadmap, methodology).
- Out of scope, as briefed: "How LTM can help" and technical execution by platform (M5).

## Verdict

**Score: 7 of 10 Pass, 3 Partial, 0 Fail. The F7 gate (9 of 10) is not met yet.**

The report is strong on the money questions. Every headline figure traces to a lever table, a formula, the inputs, a provider maximum with its check date, and a claim and assumption ID.

The three Partials each need one or two sentences, not new engine work:
- **Q2:** "net" leaves out effort the roadmap itself shows.
- **Q6:** what happens to the client's own waste estimate is said only in Appendix B, and refers to a panel the client never sees.
- **Q7:** nowhere does the report say why provider tools are not enough.

With those changes I expect 10 of 10. There are also defects listed below that a sceptical CIO or CFO would spot: one contradiction, a "null" value, private source links, and roadmap durations that are not credible. I recommend fixing them before any external use.

## Results by question

| # | Question | Result | Where it is answered (scenario, page) |
|---|---|---|---|
| 1 | On what basis is this figure in front of my board? | **Pass** | Section 4 lever table; Appendix A formulas, inputs and provider maxima; Appendix C sources (RS5 p6, p11; RS4 p10, p15–16) |
| 2 | Is that net, and in which year do I see it? | **Partial** | Executive summary value tiles; section 4 "Totals by case" (RS5 p3, p6; RS4 p3, p9) |
| 3 | Which levers, and how much each? | **Pass** | Section 4 "Levers" and "Identified, not quantified" (RS5 p6; RS4 p10; RS3 p9) |
| 4 | Why is a peer's score higher but their stage lower? | **Pass** (with a wording fix) | Section 2 introduction; section 7 (RS5 p3, p9; RS4 p3, p13) |
| 5 | Are these the FinOps Foundation's domains and capabilities? | **Pass** | Section 7, first paragraph (RS5 p9; RS4 p13) |
| 6 | What if our waste guess is wrong, or I leave a question blank? | **Partial** | Section 7 question counts (blanks); Appendix B ASM-FIN-026 (waste guess) (RS5 p10, p20; RS4 p14) |
| 7 | Why isn't this already done by our provider's tools? | **Partial** | Only implied, through lever wording "indicative value from your provider-tool estimate" (RS4 p6) |
| 8 | Who owns each action, how much effort, what depends on what? | **Pass** (quality defects D4, D11) | Findings table and detail; section 5 roadmap (RS5 p4–9; RS4 p4–13) |
| 9 | What data did you take, where is it stored, did AI see it? | **Pass** | Section 7 "How your data is handled" (RS5 p10; RS4 p14) |
| 10 | How do we compare with published data? | **Pass** (defect D6) | Section 6 "Published market data" (RS5 p9; RS4 p13) |

### Q1. On what basis is this figure in front of my board? Pass

- RS5 p6, lever table: "Commitment discounts (LEV-01) · Base (expected) GBP 971k · Maximum rate 55% · … Expected GBP 267k · Confidence Low". Note below the table: "The maximum rate is the published or arithmetic maximum; the expected case takes half of it and the conservative case a quarter."
- RS5 p11, Appendix A: "Steady compute not yet covered by commitments, after usage levers, x up to the provider's published maximum discount (checked 14 Oct 2026); expected case is half of the maximum." It lists every input with its value and band, and the instrument: "Resource-based committed use discounts (not stated; the lower published maximum is used)". It then shows the arithmetic: "base GBP 971k × rate 55% × factor 50% = GBP 267k".
- Appendix A "Sensitivity" names the three inputs the headline depends on most. Appendix C links CLM-FIN-065 to the Google Cloud CUD documentation, checked 2026-10-14.
- Weaknesses (defect D7):
  - RS4's multi-provider LEV-01 line does not multiply out.
  - RS1 and RS3 show "Maximum rate 0%".
  - Capped upper values cannot be reconciled from base × rate.

### Q2. Is that net, and in which year do I see it? Partial

**What answers it.**
- RS5 p3 tiles: "Expected net per year at full run-rate GBP 378k · Expected net in the first year GBP 121k · Expected net over three years GBP 879k". Below them: "net of estimated internal implementation effort and tooling. External support is not included."
- RS5 p6 gives net by year for every case, including "Net in the first year GBP −11k" in the conservative case.
- The FinOps team cost is shown separately and the report says why: "It is not netted against the levers, because it also enables levers that are not yet quantified. Indicative size 0.5 FTE, about GBP 54k a year."

**Why not Pass.** The roadmap's own effort figures do not match the effort that is netted, and the report does not explain the difference.
- RS4 p10, Costs: "Internal implementation effort: 32 FTE-months". The roadmap table on the same page adds up to 39 + 36 + 10 + 25 + 18 = **128 FTE-months**.
- So 96 FTE-months of capability-building effort are not in "net". At the rate the report implies (EUR 384k ÷ 32 = EUR 12k per FTE-month), that is about EUR 1.15m. The FinOps team adds EUR 288k a year on top.
- RS5: 2 FTE-months netted, 5 FTE-months in the roadmap.
- A CFO will add these up and ask whether the "net" figure is net at all.
- The executive summary also never shows that the conservative first year is negative: RS5 GBP −11k, RS4 EUR −12k, RS3 USD −142k.

**Minimal change.**
- **Section 1, Value**, after "External support is not included.", add:

  > "Not netted, and shown for your decision: capability-building effort in the roadmap of {roadmapEffort − leverEffort} FTE-months (about {amount} at your internal rate), and an accountable FinOps lead or team of {fte} FTE (about {teamCost} a year). In the conservative case the first year is {conservative netYear1}."

- **Section 4, Costs:** add the same reconciliation line, so that "32 FTE-months" and the roadmap's 128 FTE-months are explained on one page.

### Q3. Which levers, and how much each? Pass

- RS4 p10 lists five quantified levers with base, rate, three cases and confidence. The expected values add up exactly to the gross figure (843 + 751 + 150 + 1,450 + 700 = EUR 3.89m).
- "Identified, not quantified" names each remaining lever and the evidence that would quantify it, for example "Storage tiering and lifecycle … Would be quantified by: Provider storage analytics or provider-tool storage export no older than 90 days."
- RS4 p7 shows a lever judged not worth pursuing: "Spot and preemptible capacity: not worth pursuing at this scale: Do not start this lever now".

### Q4. Why is a peer's score higher but their stage lower? Pass, with a wording fix

- RS5 p3 and RS4 p3, section 2: "There is no overall score or stage: targets differ by estate, so a score would not compare across organisations."
- Section 7: "no organisation-level stage is computed."

**Risk.** The executive edition puts "Need index 39 of a possible 100" (RS5 p3) and "Need index 36.7 of a possible 100" (RS1 p3) directly above that sentence. A CIO will read it as a score and ask the question again.

**Recommended wording (section 1, Issue):** "Need index 39 of 100: how urgently this estate needs to act against its own targets. It is not a maturity score and does not compare across organisations."

### Q5. Are these the FinOps Foundation's domains and capabilities? Pass

RS5 p9 and RS4 p13: "FinOps IQ's capability model is adapted from the FinOps Framework by the FinOps Foundation under CC BY 4.0. Changes by LTM: capabilities rated per scope with LTM question sets; 'Not yet' and 'Unknown' ratings added; default targets by complexity tier are LTM heuristics; no organisation-level stage is computed. It is not endorsed by the FinOps Foundation and is not a FinOps Foundation assessment or certification."

### Q6. What if our waste guess is wrong, or I leave a question blank? Partial

**Blanks: answered.**
- RS4 p14: "Questions asked: 41; answered: 40; 'Don't know': 1; left blank: 1. A blank or 'Don't know' is rated as unconfirmed and never raises a value. Left blank: UN-08."
- The blank appears as risk, not value: "Reporting & Analytics: Not answered … 3 levels … Critical" (RS4 p4).

**Waste guess: only partly answered.**
- The only statement is Appendix B, ASM-FIN-026 (RS5 p20): "Client waste hypothesis bands … shown beside the model, never an input." Under "If it is wrong": "Only the hypothesis panel; no number changes (D4)".
- No hypothesis panel appears anywhere in the client edition. A CIO who gave an estimate cannot find it, and the appendix points to a panel that is not there.

**Minimal change (section 7, after the blank sentence):** "If you gave your own estimate of waste, it is not used in any figure in this report; the value comes only from the lever formulas and your spend and evidence inputs." Then either show the client's estimate beside the expected value in section 4, or remove "shown beside the model" and "(D4)" from ASM-FIN-026.

### Q7. Why isn't this already done by our provider's tools? Partial

**What is there.** Provider tools appear only as evidence, for example "Rightsizing and modernisation: indicative value from your provider-tool estimate" (RS4 p6), and as "Evidence to confirm. Provider-tool recommendation exports". The capability profile covers 22 capabilities, most of them outside resource recommendations, so the answer is implied.

**What is missing.** No sentence answers the question. The designed "Edge" statement (DESIGN 10.13, section 1) is absent from every scenario.

**Minimal change (one paragraph, section 7 or the end of section 2):**

> "Provider tools such as AWS Cost Optimization Hub and Compute Optimizer, Azure Advisor and Google Cloud recommenders give resource-level recommendations, each for its own platform. This assessment uses their exports as evidence for the rightsizing and idle levers. It also covers what those tools do not assess: who owns the spend and decides, allocation and chargeback across providers and data centre, forecasting and budgets, unit economics, and the order in which to act, for example usage changes before new commitments."

Provider names should follow the client's selected platforms.

### Q8. Who owns each action, how much effort, what depends on what? Pass, with quality defects

**What answers it.**
- Every finding has an owner, a start month, a duration and the evidence to confirm (RS4 p4–9).
- Every workstream has months, effort (S/M/L in FTE-months), owners, activities, milestones, KPIs, prerequisites, risks and "Depends on" (RS4 p10–13).

**Defects that weaken the answer:** D4 (durations not credible) and D11 (dependencies that look violated, raw finding IDs).

### Q9. What data did you take, where is it stored, did AI see it? Pass

RS5 p10 and RS4 p14: "LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which does not have an EU adequacy decision or a UK data bridge. We collect your answers, your spend figures, your organisation's name and the consultant's email address to produce the report. This version uses no AI features."

Two things are not covered, and neither is needed for Pass:
- retention and deletion (WS-S6);
- "Draft wording pending owner and counsel approval (execution phase M6)", which is correct for a review draft but must be resolved before external use.

### Q10. How do we compare with published data? Pass

- RS5 p9: "Published market data is shown with source, year and sample … It is never presented as an LTM peer benchmark, as the client's position or as a target."
- Rows include "Respondents' average estimate of wasted IaaS and PaaS spend 29% · Flexera, 2026 State of the Cloud Report · n = 753" and "FinOps teams managing AI spend 98% · FinOps Foundation (Linux Foundation), State of FinOps 2026 · n = 1,192".
- This matches the design. The panel's presentation defects are listed under D6.

## Defects found on the pages

Ranked by how much a CIO or CFO would hold them against the report.

| # | Severity | Defect (scenario, page) | Recommended change |
|---|---|---|---|
| D1 | High | **"Net" excludes effort the roadmap shows** (RS4 p10: 32 vs 128 FTE-months; RS5 p6–7: 2 vs 5). See Q2 | The Q2 reconciliation line in sections 1 and 4 |
| D2 | High | **Contradiction on question counts.** Executive summary: "Based on 18 of 18 questions answered" (RS5 p3, RS1 p3). Section 7: "Questions asked: 11; answered: 11" (RS5 p10, RS1 p9) | Use one count with one definition in both places, for example "18 questions (11 maturity, 7 spend and value inputs)" |
| D3 | High | **Private source links.** Every LTM claim in Appendix C links to `github.com/dixitashutosh007/ltm-accelerators/...DESIGN.md` (RS5 p24–27). A client cannot open it, and it shows a personal account | In the client edition, show "LTM design pack, version, date (available on request)" with no URL, or link a controlled LTM location |
| D4 | High | **Roadmap durations are not credible.** Critical findings get the shortest duration, so 2- and 3-level gaps close in 3 months. RS4 p11 milestones: "Month 3: Data Ingestion at Run" (from Not yet), "Month 3: Allocation at Run" (from Crawl), "Month 3: FinOps Practice Operations at Run" (from Not yet), "Month 6: Governance, Policy & Risk at Run" (from Not yet). RS2 does the same for Data Ingestion and Allocation (Crawl to Run). The FinOps Foundation describes maturity as iterative, moving "from Crawl to Walk, or Walk to Run", and says the goal "should never be simply to achieve a 'Run' maturity in every Capability" (source 1). | Set one milestone per level, with duration growing with the gap (for example: first level at 3 months, each further level 6 months later). Severity should change start order, not shorten duration. Change "Move Data Ingestion to Run" to "Move Data Ingestion to Crawl by month 3, then Walk, then Run" |
| D5 | High | **The Q7 edge statement is missing** in every scenario | The Q7 paragraph |
| D6 | Medium | **Published market data panel, client edition** (every scenario, section 6):<br>(a) the value column shows "**null**" for the State of FinOps priority row;<br>(b) internal working notes appear as caveats: "Question wording not read", "Wording from secondary summaries citing the report", "2025 sample not re-checked", "Release says 'nine of 10'; show as about nine in ten";<br>(c) "(FRAMEWORK.md, Data)" in the introduction | (a) Remove the row or give it a qualitative value label.<br>(b) Check the figures against the primary report and remove the notes, or drop rows that cannot be checked.<br>(c) Replace with "LTM has no engagement history to benchmark against." |
| D7 | Medium | **Lever table arithmetic and labels:**<br>(a) RS4 p10 and p15: "base EUR 2.57m × rate 65% × factor 50% = EUR 843k". 2.57m × 0.65 × 0.5 = EUR 835k. The figure blends AWS 66% and Azure 65% but shows only 65%;<br>(b) RS1 p6 and RS3 p9 show LEV-01 "Maximum rate 0%" when the base is zero. The provider maximum is not 0%;<br>(c) RS3 p9 upper values after the 29% cap cannot be derived from base × rate (for example Spot: expected USD 513k, upper USD 533k) | (a) One line per provider, or show the blended rate (65.6%).<br>(b) Show the provider maximum and "no base: coverage already meets steady usage".<br>(c) Add "Upper before cap" or a footnote with the cap scaling factor |
| D8 | Medium | **Internal identifiers and engine terms in the client edition:**<br>- question IDs (MP-01, UN-04, QV-01) and finding IDs ("After: F-FIN-ALLOCATION", milestones "(F-FIN-LEV-01)");<br>- RS2 p3 executive summary recommendation: "Answer and evidence: UN-08; then move…";<br>- "(Q10)", "(D4)", "WS-S5", "DESIGN.md 3.4 (capabilities.json defaultTargets)", "execution phase M6";<br>- Appendix A input "evidence.saasLicence.renewingYear1Share";<br>- provider codes "AZURE" and "GCP" | Client edition: replace IDs with plain names, for example "After: Allocation", "Answer the scheduled-reports question with evidence". Keep IDs in Appendix A only. Use "Azure" and "Google Cloud" |
| D9 | Medium | **Need index read as a score** in executive mode (RS5 p3, RS1 p3), with inconsistent precision (39 vs 36.7) | Q4 wording; round to a whole number |
| D10 | Medium | **Roadmap activities not tailored:**<br>- RS5 (Licensing & SaaS out of scope) still shows "Reclaim or re-harvest unused licences and seats at renewal" and the KPI "Unused licence and seat cost at each renewal" (p8);<br>- RS1 (Practice Operations at Run) still lists "Appoint an accountable FinOps owner…" (p8) | Filter activities and KPIs by scope and current level; rename the workstream "Commitment portfolio" when SaaS is out of scope |
| D11 | Medium | **Dependencies that look violated:**<br>- RS5 p4: Usage Optimization "Start: month 3 … After: F-FIN-ALLOCATION", while Allocation runs month 0 to 12. Roadmap p8: "Rightsizing … month 3 to month 9 … Depends on: Allocation, cost data and reporting" (0 to 12);<br>- RS5 p8 says "Sequence purchases after scheduling, rightsizing and Spot moves", yet both workstreams run months 3 to 9;<br>- RS3 p9: the commitment workstream starts month 0, before rightsizing (month 3) | Say what "After" means ("starts after the first Allocation milestone"), or schedule the dependent item after the predecessor's milestone. Stagger commitment purchases visibly after usage changes |
| D12 | Low | **Executive summary situation leaves out spend and profile**, against DESIGN 10.11(f) (RS5 p3, RS4 p3) | Add "in-scope public cloud spend GBP 3.0m (band 1–5m) on Google Cloud" |
| D13 | Low | **Rightsizing and idle levers** (RS4 p15–16): the inputs table lists spend and compute share but not the provider-tool estimate that is the actual base (EUR 1.50m, EUR 300k) | Add the evidence row, as the SaaS lever already does |
| D14 | Low | **Appendix C:** status "P" is used (CLM-FIN-007, 096, 105) but the legend defines only V, S and LTM. The publisher is repeated ("FinOps Foundation: FinOps Foundation: …", "Google Cloud: Google Cloud: …", "Flexera: Flexera: …") | Define P or map it to V or S; remove the repeated prefix |
| D15 | Low | **Wording and format:**<br>- "S (1 FTE-months)";<br>- "saas and licensing spend" (RS4 p9);<br>- "Confidence: Low: LEV-01 Low." (RS5 p3), which reads oddly;<br>- RS1 p4–6: a "do not buy" finding with "complete within 24 months", and a workstream "3 to 27 … S (0 FTE-months)" that runs past the 3-year value horizon | "1 FTE-month"; "SaaS"; "Value confidence: Low (commitment discounts: Low)"; give "hold" findings a review date instead of a duration |

## Recommended changes, ranked

1. **Q2 / D1:** reconcile "net" with roadmap effort and the FinOps team in sections 1 and 4. Show the conservative first year in the executive summary.
2. **Q7 / D5:** add the provider-tools edge paragraph.
3. **Q6:** one sentence in section 7 on the client's waste estimate. Correct ASM-FIN-026.
4. **D2:** fix the question-count contradiction.
5. **D4 and D11:** stepwise milestones and credible durations; consistent dependencies.
6. **D3 and D6:** remove private links, the "null" value and internal caveats from the client edition.
7. **D7:** lever table arithmetic, "0%" maximum rate, and upper before cap.
8. **D8, D9 and D10:** remove internal IDs, qualify the need index, tailor activities to scope.
9. **D12 to D15:** minor presentation fixes.

Items 1 to 3 are enough to meet the F7 gate; I expect them to bring the score to 10 of 10. Items 4 to 7 are what I would want fixed before a CIO sees the report.

## Sources

1. FinOps Foundation, FinOps Maturity Model, https://www.finops.org/framework/maturity-model/ (checked 22 Oct 2026). Quoted: "an organization's goal should never be simply to achieve a 'Run' maturity in every Capability"; "The practice of FinOps is inherently iterative"; a capability moving "from Crawl to Walk, or Walk to Run".
2. DESIGN.md 10.13 (designed answers), 10.11(f) (executive summary content), 10.12 (labels), and Q14 (verdict band renamed to "Targeted improvements needed now", so not a defect). Internal, read 22 Oct 2026.
3. Rendered client-edition reports RS1 to RS5, page images in the session scratchpad `cio/RS1` … `cio/RS5`, from `m4-samples/RS*-client.pdf` (commit a726e86), read 22 Oct 2026.

No other external facts are asserted in this note. Provider maxima and survey figures are quoted as the report states them; I did not re-verify them in this test.

---

## Re-test (22 Oct 2026)

**Evidence:** the client-edition page images re-rendered on 22 Oct 2026 (RS1 25 pages, RS2 37, RS3 39, RS4 37, RS5 26).
- RS5: sections 1 to 7 and parts of Appendices A to C read.
- RS4: sections 1, 4, 5 (part), 6 and 7, and the start of Appendix A read.
- RS1, RS2 and RS3: executive summary, levers, costs, roadmap header and section 7 spot-checked.

Same rules as before: judged only from the pages; the coordinator's change list was checked against them, not taken as given.

**Score: 10 of 10 Pass. The F7 gate (9 of 10) is met.** This is advice; the product owner decides.

### Questions that changed

| # | Before | Now | Evidence on the pages |
|---|---|---|---|
| 2 | Partial | **Pass** | Details below |
| 6 | Partial | **Pass** | Details below |
| 7 | Partial | **Pass** (one grammar defect, R3) | Details below |

**Q2 (Is that net, and in which year do I see it?)**
- The summary shows the conservative first year. RS5 p3: "In the conservative case the first year is GBP −11k." RS4 p3 shows EUR −12k and RS3 p3 shows USD −142k.
- The summary also states what is not netted. RS4 p3: "Not netted, and shown for your decision: capability-building effort in the roadmap of 96 FTE-months, beyond the lever effort above; an accountable FinOps lead or team of 2 FTE, about EUR 288k a year."
- Section 4 Costs reconciles. RS4 p10: "Internal implementation effort for the levers: 32 FTE-months … This is the effort netted above." 32 + 96 = 128 matches the roadmap total. RS5 is 2 + 3 = 5.

**Q6 (What if our waste guess is wrong, or I leave a question blank?)**
- Section 7 now says: "If you gave your own estimate of waste, it is not used in any figure: the value comes only from the lever formulas and your spend and evidence inputs." (RS5 p10, RS4 p14, RS1 p9.)
- Blanks and "Don't know" answers are now named by their question wording (RS4 p14).
- ASM-FIN-026 points to the "Your own estimate" line (RS5 p20).

**Q7 (Why isn't this already done by our provider's tools?)**
- A new paragraph in section 7, "Why provider tools are not enough", names the tools for the client's providers: RS4 p13–14 "AWS Cost Optimization Hub and Compute Optimizer and Azure Advisor"; RS5 p9 "Google Cloud Recommender"; RS1 p9 "Azure Advisor".
- It also lists what those tools do not assess.

### Q2: capability effort is not converted to money

**Judgement: Pass.** The question is whether the figure is net and which year the client sees it. The report now gives:
- net by year, including a negative conservative first year;
- exactly what is excluded, in FTE-months and FTE;
- that the excluded items are left for the client's decision.

A CFO can price the 96 FTE-months at their own rate. Section 4 lets them check that rate: 32 FTE-months against "One-off internal effort EUR 384k".

**Optional improvement, not needed for Pass.** Store the internal rate in the result and add "about EUR {x} at your internal rate". That keeps the trace rule and saves the CFO the division.

### Defects still open or new

Ranked by importance. "Fixed" items were checked on the pages: D3, D6(a, c), D9, D10 (RS1 activities filtered; RS5 workstream renamed "Commitment portfolio"), D12, and D14.

| # | Severity | Status | What the pages show | Recommended change |
|---|---|---|---|---|
| R1 | High | **D2 not fixed in the executive summary** | Section 7 now says "Questions asked: 20, of which 11 rate a capability … 'Don't know': 1". The executive summary still says "Based on 18 of 18 questions answered" (RS5 p3, RS1 p3). For RS5 this is a direct contradiction: a "Don't know" exists, yet the summary claims every question was answered. | Build the summary sentence from the same count: "Based on 11 capability questions (10 answered, 1 'Don't know') and 9 estate, spend and value inputs" |
| R2 | High | **D4 open** (owner decision) | RS4 p11: "Month 3: Data Ingestion at Run" (from Not yet), "Month 3: FinOps Practice Operations at Run" (from Not yet), "Month 3: Allocation at Run" (from Crawl). RS2 p3 still says "Move Data Ingestion to Run … from month 0" from Crawl. | As in D4: one milestone per level. This is the first thing a delivery lead will challenge. The FinOps Foundation describes maturity as iterative and says Run in every capability should never be the goal (Sources 1) |
| R3 | Medium | **New:** grammar in the Q7 paragraph | "Azure Advisor give resource-level recommendations, each for its own platform" (RS1 p9); "Google Cloud Recommender give …" (RS5 p9). With one tool, "give" and "each for its own platform" read as machine-assembled. RS1 (Azure only, no data centre in the situation line) also says "across providers and the data centre". | Use "gives … for its platform" when one tool is named. Add "and the data centre" only when the data centre is in scope |
| R4 | Medium | **D11 partly addressed** | The roadmap now states the overlap rule (RS5 p7, RS4 p11, RS3 p9), which explains "After: Allocation" with an earlier start. But two things contradict "Sequence purchases after scheduling, rightsizing and Spot moves": RS5 runs "Commitment portfolio" and "Rightsizing" both from month 3 to 9, and RS3 starts the commitment workstream at month 0, before rightsizing at month 3. | Start the commitment workstream at the first usage milestone, or change the activity to "Plan purchases alongside the usage changes; buy in tranches as each lands" |
| R5 | Medium | **D6(b) open** (registry content) | Internal working notes still appear as caveats in section 6 of every scenario: "Question wording not read", "2025 sample not re-checked", "Release says 'nine of 10'; show as about nine in ten". | Check the figures against the primary reports and replace the notes with client-facing caveats, or drop rows that cannot be checked |
| R6 | Low | **D15 partly fixed; new lower-case names** | "saas and licensing is outside this base" (RS1 p6, RS4 p10, RS5 p6); "EUR 20.0m of saas and licensing spend" (RS4 p9); "Value confidence: Medium: kubernetes efficiency Medium, ai and gpu Medium" (RS3 p3). | Use the lever display names ("SaaS and licensing", "Kubernetes efficiency", "AI and GPU") |
| R7 | Low | **D7 residual** | RS4 p15: "base EUR 2.57m × rate 65.3% × factor 50% = EUR 843k". The product shown is EUR 839k. Weighting by spend share (9 : 14) gives 65.4%. "No base", "(blended)" and the cap note are fixed and read well (RS1 p6, RS3 p9, RS5 p6). | Show the blend to the precision that reproduces the result, or footnote that inputs are rounded |
| R8 | Low | **D8 residual (appendices)** | Body text is clean of IDs (RS2 p3 now names the question). The appendices still show "annual spend with AZURE" (RS4 p15), "annual spend with GCP" (RS5 p11), and "(HY-01)" and "(D4)" in ASM-FIN-026 (RS5 p20). | Use provider display names in Appendix A inputs. Remove "(D4)", a design-decision reference, from client text |
| R9 | Low | **New:** FinOps team line not shown everywhere | The "Not netted" line names the FinOps team in RS4 and RS5 but not in RS2 or RS3, where FinOps Practice Operations is below target (RS2 "Walk, target Run"; RS3 "Crawl, target Walk"). A reader cannot tell whether the cost is zero or omitted. | When no team cost is shown, say why, for example "a FinOps lead is in place; no additional team cost is assumed" |

### Recommendation for the owner (advice)

The gate is met: 10 of 10.

**Before any client sees the report:**
- R1, the question-count contradiction in the executive summary. It is a one-line fix and the most visible remaining error.
- R2 (D4), the 3-month Not yet to Run milestones. They will cost credibility with a delivery-minded CIO even though the challenge questions pass.

**Before M6 external use:** R3 to R5.

**Can wait:** R6 to R9.
