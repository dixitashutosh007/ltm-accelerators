# Cost IQ: product-grade review and plan

**Date:** 12 Nov 2026. **Asked by:** the product owner: "deep review Cost IQ and create a phase-wise plan to make it a CIO-ready tool that looks product grade, of the kind generally available only to Big 4 type consulting firms."

**Read for this review:**
- The engine bank (`master-v6.6.json`, methodology 6.7.0, release `COSTIQ-1.1.0`).
- `report.ts` and `non-cloud-levers.ts`.
- The sample client report rendered on 12 Nov 2026 (28 pages, LTM brand).
- The on-screen flow (`cost-iq-v10.html`).
- `PLAN.md` (CQ0 to CQ12), `RELEASE-DECISION.md`, `non-cloud-lever-sources.md` and `PORTFOLIO-REVIEW-2026-11-08.md`.

This plan follows on from CQ12; it does not replace `PLAN.md`.

## 1. Verdict

Cost IQ is a careful, honest and well-governed structured diagnostic:
- every number in the report is re-checked;
- every source is registered;
- the cloud figure is never counted twice;
- the client and consultant editions are separated by role.

Those foundations are better than many commercial tools have.

It is **not yet something a CIO would recognise as a top-tier cost diagnostic**. A Big 4 or strategy-firm IT cost diagnostic sells three things in its first ten minutes, and Cost IQ gives none of them:

1. **A number.** What we spend, by category, and how much of it could come out, as a range.
2. **A comparison.** How we compare with our industry and size.
3. **A board story.** One page and a handful of charts the CIO can take to the CFO and the board.

Today the report opens with "10 findings are raised", two LTM scores and **"No amount is stated"**. A CIO reads that as "the tool doesn't know". The plan below keeps the governance and adds the number, the comparison and the story, in that order.

## 2. The bar: what a top-tier IT cost diagnostic delivers

| # | What the client gets | How top-tier firms usually do it |
|---|---|---|
| B1 | **Spend baseline** by a standard taxonomy | Ledger, payables, HR and asset extracts mapped to the TBM taxonomy (cost pools, towers, solutions) within 2 to 4 weeks |
| B2 | **Benchmarks** | IT spend as a share of revenue and per employee, by tower, against industry and size peers; unit costs (per server, per user, per ticket) |
| B3 | **Opportunity sizing** | A savings range per lever (licences, vendors, infrastructure, applications, workforce, demand), with a confidence level and a waterfall from the baseline to the target |
| B4 | **Prioritisation** | A value-against-ease matrix; quick wins against structural moves; a 100-day plan |
| B5 | **Business case** | One-off cost, run-rate saving, payback and three-year net figure per lever |
| B6 | **Board pack** | A two-page brief plus 10 to 15 slides, chart-led, with the firm's brand |
| B7 | **Scenarios** | "If we must take out 10%, where does it come from, and what do we protect?" |
| B8 | **Tracking** | Planned against realised savings, quarter by quarter; re-assessment |
| B9 | **Credibility** | A named method, sign-off by a senior practitioner, references and a dataset of past engagements behind the benchmarks |

## 3. Where Cost IQ stands against the bar

| Bar | Cost IQ today | Gap |
|---|---|---|
| B1 Baseline | A spend **band** (CORE-04) and a list of the categories it includes (CORE-05). No split by category and no data upload. | **High** |
| B2 Benchmarks | One cross-industry figure: Deloitte 2026, about 6% of revenue (CLM-COST-026). No industry, size or tower split, and no unit costs. | **High** |
| B3 Sizing | Money only where the consultant records a measured figure for one lever (LEV-11, non-SaaS licences). The cloud line comes from FinOps IQ when one is linked. Every other finding says "Needed before it is sized". | **High** (the user's "outcome is very weak") |
| B4 Prioritisation | Findings are ordered by severity and by the client's own priorities. There is a delivery plan per step, but no value-against-ease view and no 100-day plan. | Medium |
| B5 Business case | Net, phased figures exist for LEV-11 only. There is no payback and no per-lever case. | High |
| B6 Board pack | A 28-page PDF and a CSV backlog. The only chart is score bars. No brief and no slides. Pages 9 to 25 are generic delivery and technical-practice text, which reads as a proposal. | **High** |
| B7 Scenarios | CORE-45 (where 10% would be redirected) and ADP-57 (capabilities to protect) are collected and shown as text. There is no model. | Medium |
| B8 Tracking | None. A new assessment does not compare with the last one. | Medium |
| B9 Credibility | Release `APPROVED_WITH_ACCEPTED_PARTIALS`. No practice-lead sign-off and no pilot. 65 of 99 question bases are LTM heuristics. | High (process, not code) |

### What the sample report shows (12 Nov 2026, client edition, 28 pages)

1. **The opening paragraph lists problems, not an answer.**
   - It reads: "10 findings are raised, 6 of them high … Each lists the evidence needed before any saving is sized."
   - The scores come next, then "No amount is stated."
   - Nothing on page 3 tells the CIO what the opportunity is worth or what to do on Monday.
2. **Findings read as generic.**
   - Titles hedge ("may contain avoidable cost", "may be inefficient").
   - "Why it matters" is catalogue text, identical for every client.
   - The only client-specific content is the answer quoted back.
   - There is no number in a finding, such as an addressable base, an indicative range or a benchmark gap.
3. **Answers are taken at face value.** "93% of data-centre capacity structurally underutilised" and "spend below GBP 3.7M against revenue of GBP 370M to 750M" pass with no plausibility flag. A senior consultant would challenge both.
4. **The report is long for its substance.**
   - Ten pages of delivery plan and five of technical practice steps.
   - Neither section is tailored by the client's answers beyond which steps appear.
   - In a top-tier pack this material is an appendix or a separate proposal.
5. **There are almost no visuals.** The PDF has no waterfall, matrix, benchmark chart or heat map. The page has a radar and bars.
6. **Text defects:**
   - "Finding 3, saaS usage and licensing …": lower-casing the first letter breaks an acronym.
   - "Of the 1 opportunity areas … 1 is confirmed": the plural is wrong.
7. **The engine is coarse for a specialist claim.** 106 questions and 16 dimensions lead to only **10 recommendations**, so several findings share one generic step. Dimensions are weighted equally, and industry (CORE-02) is shown but tailors nothing.

### Strengths to keep

- **Traceability.** Every figure is a traced field re-read by the report checks.
- **The claims register** and banned-phrase lint.
- **One cloud figure per estate,** taken from FinOps IQ.
- **Editions by role.** The consultant edition is limited to the Cognito Consultant and Admin groups.
- **Server-built reports** and the async AI narrative, which is off until its evaluation runs.
- **The delivery library,** with workstreams, effort, statement-of-work drafts and platform playbooks. It is valuable material, even though it is in the wrong place in the client report.
- **The LTM brand** on every PDF (PR #117).

## 4. Phased plan

The durations are indicative, at the current pace of one owner with AI agents. Each phase ships as its own pull requests, under the existing quality bar:
- traced figures;
- claims registered;
- report checks;
- audit (missing data never flatters);
- unit and browser tests.

### Phase A: answer first (about 2 weeks)

The goal: page 1 answers "what is it worth, and what do we do first".

| # | Item | Exit check |
|---|---|---|
| A1 | **Indicative savings ranges** (owner decision, 12 Nov 2026: "LTM planning ranges"). For each cost finding: the addressable base is a share of in-scope spend for its category (zero when CORE-05 excludes the category); the range is that base × an LTM planning rate, from both ends of the spend band, or from the exact spend when given. Labelled "LTM planning estimate, not a published benchmark". Published context sits beside it where one exists (Flexera software waste; the GSA telecom rebid). Measured figures replace it. Cloud and SaaS stay with FinOps IQ. Overlapping findings in one category are not added together. Governance and value findings are shown as enablers, not sized. | Assumption entries with basis `ltm_heuristic`; traced and re-read by R2; the total never exceeds in-scope spend; tests per band, currency and excluded category |
| A2 | **A one-page answer** as the summary: the indicative value range, the three moves that carry most of it, the decision requested and the first 100 days. Scores move to supporting evidence. | The text layer of page 3 holds an amount, three moves and a decision |
| A3 | **Findings with numbers.** Each cost finding shows its addressable base, indicative range and confidence. Titles are stated, not hedged ("Software licences are not reconciled to use"). The "Why it matters" text uses the client's own answers. | Catalogue lint: no "may" in a title; tests |
| A4 | **Plausibility checks** on inputs: spend against revenue outside a plausible range; extreme sliders (above 80% idle capacity); contradictory answers. Shown to the consultant on screen and as "to confirm" in the report. | Rules registered; tests for each |
| A5 | **A shorter client report:** the delivery plan becomes a two-page summary; the per-workstream detail and technical execution move to the consultant edition and the backlog. Target 14 to 18 pages. | Page count for the sample clients; the consultant edition keeps everything |
| A6 | **Text defects:** acronym-safe sentence case; plurals on counts. | Unit tests |

### Phase B: board-grade outputs (about 3 to 4 weeks)

The goal: the CIO can forward it to the CFO unchanged.

| # | Item | Exit check |
|---|---|---|
| B1 | **Charts in the PDF**, as vector graphics through the shared renderer: an opportunity waterfall by lever (range bars); a value-against-ease matrix of findings; spend against the published reference; a dimension heat map. Shared with FinOps IQ and Sovereign IQ. | Charts drawn only from traced figures; the report checks read their labels |
| B2 | **A two-page CIO brief** as a separate download, from the same traced figures. | It passes the same report checks |
| B3 | **Slide export (PPTX)** in the LTM template: about 10 slides covering the answer, the baseline and benchmark, the opportunities, the priorities matrix, the 100-day plan, the roadmap and the asks. | Opens cleanly in PowerPoint and Keynote; figures match the PDF |
| B4 | **Answer-first results screen:** the value range and three moves lead; the scores and radar move below. | Browser test on the order |
| B5 | **Scenario panel** (consultant): a target reduction (for example 10%), with the protected capabilities from ADP-57 excluded. It shows which levers reach the target and how confident each one is. | Scenario figures traced; never shown as a commitment |

### Phase C: baseline and benchmarks (about 4 to 6 weeks)

The goal: "how do we compare" has an honest answer.

| # | Item | Exit check |
|---|---|---|
| C1 | **TBM taxonomy alignment:** map the CORE-05 categories and dimensions to the public TBM Council taxonomy (towers). An optional split of spend by tower, as percentages, replaces the band-only baseline. | Mapping documented; the split feeds A1 bases |
| C2 | **Headcount and unit measures:** employees, users, servers and applications (optional, with ranges allowed). These give spend per employee and per user. | Traced; included in plausibility checks |
| C3 | **Published references, by industry where they exist.** Only free, citable sources, with year, sample and region (the CLM rule). Where no verified industry split exists, the report says so; no invented peers. | Claims registered; R5 lint |
| C4 | **LTM benchmark dataset (the long-term edge).** Anonymised, opt-in contribution of baseline ratios from each engagement. Peer medians are shown only once a cell has at least 10 contributors, labelled with the sample size. Needs a consent clause and counsel. | Consent text approved; k-anonymity threshold enforced in code |

### Phase D: evidence from the client's data (about 6 to 8 weeks)

The goal: move from a questionnaire to a diagnostic.

| # | Item | Exit check |
|---|---|---|
| D1 | **Ledger and payables upload (CSV or XLSX).** Suppliers and accounts are mapped to towers by rules, with an AI-suggested mapping that the consultant confirms. Output: a baseline by tower, the top suppliers and their concentration. | Mapping saved per engagement; the totals reconcile with the upload |
| D2 | **Licence and contract register upload:** a renewal calendar, and spend coming up for renewal in the next 12 months (the realisable base for licence and vendor levers). | It feeds the year-one share (LEV-11 `renewingYear1Share`) |
| D3 | **Measured figures replace indicative ranges,** per lever, with confidence raised. The report shows which numbers are measured and which are indicative. | Each figure is labelled with its basis |
| D4 | **Data handling:** uploads are encrypted, deleted with the assessment (24 months), never sent to AI without the engagement switch, and covered in the data notice. | Security review; counsel |

### Phase E: business case and tracking (about 4 weeks)

| # | Item | Exit check |
|---|---|---|
| E1 | **Per-lever business case:** one-off cost (from the delivery library's effort × the client's or LTM's rate, as in Sovereign IQ's cost to fix), run-rate saving, payback month and three-year net. | Traced; tests |
| E2 | **Re-assessment:** compare with the previous assessment (scores, findings closed, baseline movement). | A delta report for a repeated sample client |
| E3 | **Realisation tracker:** planned against realised savings per lever, entered quarterly. | Saved per engagement; shown in the next report |

### Phase F: credibility and go-live (runs alongside, from week 1)

| # | Item | Owner |
|---|---|---|
| F1 | **Practice-lead calibration** of the planning ranges (A1), the goldens and the CQ12 judgement calls; written sign-off. | LTM practice lead |
| F2 | **Two or three pilots** across at least two regions; timed runs; client feedback; ranges recalibrated against what the pilots find. | Owner |
| F3 | **Method paper** (8 to 10 pages, LTM brand): how Cost IQ works, its sources and limits. Handed to clients and procurement. | Owner, with a draft from Claude |
| F4 | **Go-live gates** (portfolio review Phase 1): LTM AWS account, counsel review, privacy notice and transfer instrument, procurement pack, consultants in the Cognito Consultant group. | Owner and counsel |
| F5 | **Demo and training:** a polished demo client (no "Example Bank" inconsistencies), a consultant playbook and a 20-minute walkthrough. | Owner, with a draft from Claude |
| F6 | **Repository visibility:** make the repository private again before any LTM or client exposure (made public on 12 Nov 2026 for Actions minutes). | Owner |

## 5. Order and the critical path

```
Week   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20
A      ████████
B              ████████████████
C                      ████████████████████████
D                                      ████████████████████████████████
E                                                              ████████████████
F      ██████████████████████████████████████████████████████████████████████████████  (pilots from week 6)
```

- **After A**, the report states an indicative value. That is the fix for "the outcome is very weak".
- **After B**, it looks like a top-tier deliverable.
- **After C and D**, it is a real diagnostic.
- **F decides** whether it can be put in front of a paying client.

## 6. Decisions for the owner

1. **Planning-range values (A1):** Claude proposes them as LTM heuristics; the practice lead calibrates them before external use. *Recommended:* proceed on that basis.
2. **Client report length (A5):** move the delivery detail to the consultant edition. *Recommended:* yes.
3. **Slides (B3):** PPTX in the LTM template. Is a master template available, or should Claude build one from the brand assets?
4. **LTM benchmark dataset (C4):** pursue it. It is the only way to get industry peers without a paid source, but it needs a consent clause and counsel.
5. **Data uploads (D1, D2):** in scope for the first release, or after the pilots?
6. **Repository visibility (F6):** when to make it private again.

### Decided (12 Nov 2026)

| # | Decision |
|---|---|
| 1 | Planning ranges: the owner chose "LTM planning ranges", labelled as such, with the practice lead's calibration before external use. |
| 2 | Yes: the delivery detail and the technical execution move to the consultant edition (A5). |
| 3 | Claude builds an LTM slide master from the brand assets (B3). |
| 4 | Yes: build LTM's own benchmark dataset (C4). Consent clause and counsel review before the first contribution. |
| 5 | Left to Claude: **uploads after the pilots start.** Pilots run on the Phase A and B version. Each pilot client is asked for a ledger and contract-register extract, and those extracts shape the D1 mapping rules, so D is built on real data, not on guesses about its shape. D1 starts once two pilot extracts are in hand. |
