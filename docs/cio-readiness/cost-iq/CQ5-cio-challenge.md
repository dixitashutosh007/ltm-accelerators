# Cost IQ CQ5: CIO challenge test (FRAMEWORK area 13(g))

**Date:** 4 Nov 2026. **Reviewer:** finops-cost-lead (AI practice-lead agent). This is advice; the product owner decides.
**Build reviewed:** branch `platform-p3a-session-progress`, commit cc20812 (CQ5 slice 1), Cost IQ 6.6.0, release COSTIQ-0.7.8-DRAFT, builder `packages/engine-core/src/accelerators/cost-iq/report.ts`.
**Evidence read:** client edition PDF (12 pages) and consultant edition PDF (16 pages), both via the PDF text layer (pdfjs); page images read for pp 2, 7 and 10 only. Layout comments for pp 3 to 6, 8, 9 and 11 to 12 rest on the text layer and are **not visually verified**. Config `canon/config/master-v6.6.json` (selection settings, CORE-01, CORE-05, CORE-09), `finops-iq/v3/cost-iq-summary.ts` (line 44), FRAMEWORK.md, PRACTICE_LEAD_METHOD.md and the first 60 lines of `finops-iq/design/M7-cio-challenge.md` (format precedent). I did not read `sovereign-iq/design/S6-cio-challenge.md`.
**Sources:** no external source was needed or fetched. Anything about Flexera (n = 753), GAO-04-394G and the TBM Taxonomy is **UNVERIFIED by me**: I only read how the report cites them. The M7 precedent records that Flexera 2026 figures were checked against Flexera's 18 March 2026 release, but I did not re-check the n = 753 figure. The config itself notes TBM tower alignment is UNVERIFIED.
**Gate used (precedent):** 9 of 10 answered from the report's own pages.

## Verdict

**Fails the gate: 0 of 10 answered fully, 10 of 10 partly.** On the precedent's scoring (Pass = answered from its own pages), the report would score about 3 Pass, 6 Partial, 1 Fail if the blockers below were fixed in place; as it stands it is **not ready for a CIO**. The report is honest about the big thing (no non-cloud saving is sized, scores are not savings), and the number reconciliation for the headline is correct (I recomputed 55.1 and 47.8 from the page 4 dimension scores). But five defects would be found within minutes by a sceptical reader, and three of them are self-contradictions in the report's own text:

1. Page 4 says the Cost Governance, SaaS and Licensing, Vendors, Workforce and Cloud Economics areas are "not assessed ... Nothing in this report describes them", while pp 4 to 6 score those dimensions and raise High findings on them.
2. Page 7 says "the total is Cost IQ's non-cloud levers plus this cloud line"; page 3 says Cost IQ sizes no non-cloud saving.
3. Page 11 says the report "sizes no saving from self-reported answers"; the cloud line on p3 is a sized saving built on FinOps IQ's self-reported answers (confidence Low).
4. The cloud line cites Flexera as its cap, but Flexera is not in Appendix D, and no spend base, formula, implementation cost or ramp is shown.
5. The client cover says "release COSTIQ-0.7.8-DRAFT".

The numbers I could trace do reconcile. The question count does not reconcile for a reader (56 asked, 56 answered, but the dimension table counts 38 scored answers).

## The ten questions

Severity: **blocker** (fix before any client sees it), **should fix** (fix before CIO pilot), **later** (planned work). "Own pages" cites the client edition (CE) page and section.

| # | Question a CIO or CFO would ask | Answered from own pages? | Verdict | Severity |
|---|---|---|---|---|
| 1 | What are the 55 and the 48 actually based on? | **Partly** | CE p3 (tiles), p4 s3 intro, p9 App A (formula, per-dimension scores, Unknown rule, "each counting equally"), p10 App B A-01/A-02. Missing: the value given to each answer (ladder) is not shown, the questions that feed each dimension are not listed, and the sensitivity of A-02 is not quantified. A reader cannot reproduce 59 for Spend Transparency | should fix |
| 2 | Is 55 good? Compared with whom? | **Partly** | CE p12 says sources are not peer benchmarks, p4 says higher is stronger. The colour bands on p4 (tone at 80, 60, 40 in `tone()`) have no legend, and the report never says there is no peer comparison in the context of the score itself | should fix |
| 3 | Why was this finding raised, and why is it High? | **Partly** | CE pp 5 to 6 "Raised by" quotes the question and answer; App B A-05 says "activation rules ... LTM calibration". Missing: the rule (which answers trip it), what High, Medium and Low mean, and any counter-evidence (CORE-26 answer "utilization is reviewed before major renewals and meaningful reductions are made" is a strong answer and is not shown beside the High SaaS finding; consultant appendix p15) | should fix |
| 4 | Where does the cloud figure come from and why should I rely on it? | **Partly** | CE p3, p6 to 7, p10 A-06: dated FinOps IQ assessment, engine, confidence Low, Flexera cap, "net, phased over a realistic ramp". Missing: cloud spend used, savings percentage, implementation cost, ramp, formula, a pointer to the FinOps IQ report, the date the figure was linked, currency (the line is USD, report currency is GBP), Flexera in Appendix D, and why Low confidence still gets three headline tiles | **blocker** |
| 5 | What is the total and what is the saving across my estate? What are you not telling me about money? | **Partly** | CE p3 "What this report sizes" says only the cloud line is sized and no non-cloud saving is sized. But the sentence "so the total is the cloud line excluding anything else" is unclear, and p7 says the opposite ("non-cloud levers plus this cloud line"). No order of magnitude for non-cloud is given, which a CFO will want | **blocker** (contradiction, now); the sizing itself is CQ4 |
| 6 | Does this cover my whole estate? What is out of scope? | **Partly, with a contradiction** | CE p4 s2 states 2 of 18 areas, lists 16 not assessed, and says "Nothing in this report describes them". But those areas include Cost Governance, SaaS & Licensing, Vendors & Commercials, Workforce and Cloud Economics, which p4 scores and pp 5 to 6 raise findings on. Cause: `settings.selection.baselineSections` always asks Cost Governance & Investment, and footprint-gated questions ask SaaS, vendor and workforce questions. The page conflates "focus areas chosen" with "what was asked" | **blocker** |
| 7 | Can I trust self-reported answers? What if they are wrong, and did you check them? | **Partly** | CE p10 A-03, p11 Limits, p3 "Evidence completeness 100%" with note. Weak points: a tile that says 100% sits beside 2 of 18 areas and a Low-confidence baseline; the respondent's own low-confidence answers (CORE-06 baseline completeness 3; CORE-16 "cannot confidently determine" spend outside central technology; consultant p14) are not surfaced in the client edition; no answer-consistency check is mentioned (test data has revenue US$100M to 500M against technology spend above US$1B and industry Manufacturing for "Example Bank", consultant p14, which the report would not flag) | should fix |
| 8 | What do you want me to do, who owns it, by when, in what order? Where do I look first? | **Partly** | CE p7 s6 gives a three-step route and a table of next steps; p3 "Where to look first". Missing: any decision requested, owner role, time frame or sequence (area 6 requires an owner and time frame on every finding); the roadmap table has no order logic stated. "Where to look first" names Business Alignment (20), which has no finding and no roadmap step, and the CIO's own hypothesis (CORE-09) is not compared with the findings (config says the comparison is "not built in the report") | exec-summary decision line: should fix now; delivery-grade roadmap: later (CQ6) |
| 9 | Why LTM, and why not do this free or in-house? Is this advice or a sales pitch? | **Partly** | CE p8 s7 is neutrally worded ("Scope, effort and price are agreed after the evidence is in; none is assumed here"). Missing: offering type (advisory, implementation, transformation), indicative scope, an execution outline; the "What it does" text repeats the roadmap's "What it covers" word for word (p7 to p8); nothing says what this gives that the FinOps Foundation framework or a self-assessment does not (area 1 edge) | later (CQ6) for type, scope and outline; purpose paragraph should fix |
| 10 | Is this final? How current is it, who stands behind it, and can I reproduce it? | **Partly** | CE p1 gives client, date, version, status "Indicative ... Not a savings commitment". But the version line contains "DRAFT", "Prepared by LTM consultant" is a role not a name, the cloud line is dated 2026-10-14 against an assessment dated 2026-11-03 with no stated link date (`finopsLinkedAt` is on the input but never printed), and no report reference identifies the stored result | **blocker** (DRAFT); rest should fix |

### Notes on individual answers

**Q1, recomputed.** Cost headline = (59+65+80+55+47+60+42+53+50+40)/10 = 55.1; value = (20+41+20+77+81)/5 = 47.8. The report's own page 4 table reconciles to the headline. A-02 says a different weighting "would change headline scores", with no size. Weighting each dimension by its question count (the counts on p4) gives about 54 for cost and 56 for value, against 48 shown. That is an 8-point move on value, so A-02's "If wrong" column understates the exposure. (My arithmetic from the report's published numbers; the engine was not re-run.)

**Q4, what is on the page.** The six figures (USD 539k, 1.23m, 2.00m, 4.71m, 6.35m, 15.0m) resolve to `finops.*` fields in `resolveCostIqField`, so they are traced to the linked summary, but a CIO sees no formula. The Upper case is about 12 times the Conservative case on a Low-confidence assessment, so the range itself invites the challenge "what makes it 12 times". The line is labelled "Cloud, AI and measured SaaS licence", while the FinOps IQ capability table on p7 shows LICENSING_SAAS as "not_in_scope". A reader cannot tell whether SaaS is in the cloud line, and Cost IQ's own SaaS finding (High) sits two pages away. This is a double-counting question the report must answer before CQ4 adds a non-cloud lever. Whether the FinOps IQ estate is the same estate as this client's is not stated (UNVERIFIED from the report).

**Q6, what is actually true.** Baseline sections (Enterprise Context, CIO Priorities, Spend & Financial Visibility, Cost Governance & Investment, Regulated Industry) are always asked; footprint-gated questions are asked for the estate described (CORE-01). So "focus areas assessed: 2" is the count of deep-dive areas, not the extent of the report. Source: `settings.selection` in master-v6.6.json.

## Wording that overclaims or contradicts

| # | Where | Text | Problem | Fix |
|---|---|---|---|---|
| W1 | CE p4 s2 | "Nothing in this report describes them." | False for five areas that are scored and have findings | Q6 fix |
| W2 | CE p7 (boundary statement) | "...so the total is Cost IQ's non-cloud levers plus this cloud line." | Contradicts p3 and the report's own purpose; text comes from `BOUNDARY_STATEMENT` at `finops-iq/v3/cost-iq-summary.ts:44`, not report.ts | In `cloudSection`, do not print `c.i.finops.boundaryStatement`; print a Cost IQ sentence instead. Or change the constant (shared with FinOps IQ; owner decision) |
| W3 | CE p3 | "so the total is the cloud line excluding anything else" | Unclear and reads as if a total exists | Reword in `summary`: "No total is stated. The only amount is the cloud line." |
| W4 | CE p11 s Methodology | "It sizes no saving from self-reported answers." | The cloud line is a sized saving built on self-reported FinOps IQ answers | In `methodology`: "Cost IQ itself sizes no saving from its answers. The cloud line is FinOps IQ's own figure; see Appendix A." |
| W5 | CE p6 | "so the same saving cannot be counted twice" | An absolute guarantee, not true if SaaS sits in both places | "so this report does not count the same saving twice" and state what the cloud line covers (SaaS included or not) |
| W6 | CE p3, p6 | "phased over a realistic ramp" | The ramp and the cost to implement are not shown; "realistic" is a claim | Show the ramp and cost or point to the FinOps IQ appendix; drop "realistic" |
| W7 | CE p3 tile | "Evidence completeness 100%" | Reads as data quality, while it is only answered over asked | Rename "Questions answered" in `summary` (the traced field can stay) |
| W8 | CE p3 | "technology cost management scores 55" | The score is of self-reported answers | "scores 55 out of 100 on the answers given" (already "On the answers given"; keep it in the tile note too) |
| W9 | CE p5 to 6 | Severity "High" | Used for "5 high" in the summary with no definition | Define in `findingsSection` intro |

## Numbers a reader cannot trace

| # | Number | Page | Gap |
|---|---|---|---|
| N1 | Six cloud figures | 3, 6 | No spend base, percentage, cost, ramp or formula in the report; Flexera n = 753 cited but not in Appendix D; link date missing |
| N2 | 56 asked, 56 answered | 3, 4 | The dimension table shows 38 scored answers (4+5+1+4+5+2+1+1+1+4+1+3+1+2+3). The other 18 are context questions (App A says context questions are never scored) but the report never states 56 = 38 scored + 18 context |
| N3 | Dimension scores (59, 65 ...) | 4, 9 | The per-answer values and the questions feeding each dimension are not listed; the consultant appendix lists answers but not values (p14 to 16) |
| N4 | 5 High and 3 Medium findings | 3, 5, 6 | No definition of the severity bands |
| N5 | Colour bands on score bars | 4 | Thresholds 80/60/40 in `tone()` are not stated |
| N6 | "2 of 18" focus areas | 4 | The 18 are named only in the not-assessed list; "assessed" is misleading (see Q6) |
| N7 | "Cloud Economics 80" | 4 | One question; shown as a "good" bar and the third-best score, while a Cloud Economics finding is raised; the single question is not named, so a reader cannot reconcile the two |
| N8 | USD 15.0m vs USD 6.35m | 3, 6 | Different significant figures in the same column (three, then four digits shown differently); cosmetic but untidy |
| N9 | Band conversion (A-07) | 10 | The rate is cited with a date; fine. But "No score, finding or lever uses the band" mentions a "lever" the reader has never seen |

## Layout and professionalism

- **Cover (p1):** "release COSTIQ-0.7.8-DRAFT" and "Prepared by LTM consultant" on a client document. (Visible in the text layer; page 1 image not re-read by me beyond the text.)
- **p7 (image read):** the Cloud practice table prints raw engine keys (`DATA_INGESTION`, `not_assessed`, `not_yet`, `not_in_scope`, lowercase `walk`, `crawl`, `run`). 15 of 21 rows read "not_assessed". This looks like unfinished output and invites "has anyone assessed my cloud?". The p7 source note for the cloud table sits on a different page from its table (table on p6, note at the top of p7).
- **p7 to p8 (image read for p7):** the roadmap table starts with a single row at the foot of p7 and continues on p8 under a repeated heading. The same table text then recurs in section 7 as "What it does".
- **pp 5 to 6 (text layer):** the "Vendor economics may contain commercial leakage" finding splits across the page: the heading, Why it matters and Rating on p5, "Raised by" on p6 under a repeated heading.
- **p10 (image read):** assumption IDs (A-01 to A-07) exist in the builder but are not printed, so nothing can refer to them; A-07's heading "Reporting currency band conversion for the organisation size and spend questions" is a sentence, not a label; its Basis and Confidence start lower-case ("published source:", "medium (the rate is real; ..."); the ECB URL breaks mid-path. Page is half empty (fine).
- **p2:** contents alone on a page; acceptable.
- **Findings have no numbers** in the client edition, so the roadmap and backlog refer to them by long titles. Add F-1 to F-8.
- **Finding 4 (p5)** quotes a SaaS question as evidence for an Application finding; correct under the rule, but a reader will take it as a mistake unless the rule is shown (Q3).

## Fixes

Names refer to functions in `packages/engine-core/src/accelerators/cost-iq/report.ts` unless stated. "Owner" means it needs the product owner's decision.

### Now (text and structure, no new engine work)

| ID | Fix | Function | Closes | Notes |
|---|---|---|---|---|
| FX1 | Replace the "focus areas not assessed" paragraph. Say: "Always asked: spend visibility, cost governance and investment, and the estate you described. You also chose: Infrastructure; Applications for deeper questions. Not chosen for deeper questions: ... They may still appear above where baseline questions touch them." Drop "Nothing in this report describes them" | `profile` | Q6, W1 | Need the actual question-to-area map from `settings.selection` to name them exactly |
| FX2 | Stop printing the shared boundary statement; print a Cost IQ sentence that matches p3 | `cloudSection` | Q5, W2 | Alternative: edit `BOUNDARY_STATEMENT` in cost-iq-summary.ts (shared with FinOps IQ). Owner decision |
| FX3 | Reword the p3 callout and p11 sentence (W3, W4, W5) | `summary`, `methodology`, `cloudSection` | Q5, W3 to W5 | |
| FX4 | Remove DRAFT from the client version line: print the engine version and date only; keep the release ID in the consultant edition | `costIqReport` (`meta.version`) | Q10 | Check `manifest.releaseId` becomes non-DRAFT at release (owner) |
| FX5 | Add the Flexera 2026 State of the Cloud Report to the sources table, with URL and year, and the reading date. Add the FinOps IQ assessment as a source line | `sources` | Q4, N1 | The URL must come from the claim record used in FinOps IQ; I have not verified it |
| FX6 | Extend A-06 to say what the line contains (cloud, AI, measured SaaS licence), what it does not, the cap and its sample, "linked on <finopsLinkedAt>", currency, and name the FinOps IQ report it comes from | `assumptions` (A-06), `cloudLine` | Q4, N1 | Print `finopsLinkedAt`, already on the input |
| FX7 | Say plainly where the cloud line's currency differs from the report currency and that no conversion is applied | `cloudLine` | Q4 | Needs `s.currency` vs `i.currency` comparison |
| FX8 | Add a one-line explanation of 56 = scored + context, and print the scored count | `profile`, `calculation` | N2 | Needs a scored count in the input (not in `CostIqReportInput` today; UNVERIFIED whether the engine result has it) |
| FX9 | Add severity definitions and the activation rule in plain words: "raised when ... (question) is answered with X or lower"; show the strongest counter-answer where one exists | `findingsSection` | Q3, N4 | The rule text comes from `Finding.activation`; counter-evidence needs a lookup of positive answers. Start with the definition and rule only |
| FX10 | Add a score-band legend and "no peer comparison is made" beside the bars | `scores` | Q2, N5 | Thresholds are an LTM heuristic: state that |
| FX11 | Rename the "Evidence completeness" tile to "Questions answered" | `summary` | Q7, W7 | |
| FX12 | Name the single question in each 1-question dimension, and say headline means weight dimensions equally, giving the question-weighted alternative | `scores`, `assumptions` (A-02) | Q1, N7 | The alternative-weighting figure needs an engine run, not hand arithmetic, before it is printed |
| FX13 | Add a short "Purpose and decision" paragraph and a "Decision requested" line to the summary: which CIO decision this informs, and the next step with owner role and a time frame ("agree which evidence to supply, within 30 days") | `summary` | Q8, Q9 | **Owner** approves the wording and any default time frame; I recommend 30 days as a default (LTM judgement, no source) |
| FX14 | Print finding IDs (F-1 to F-8) in headings and in the roadmap "Findings addressed" column | `findingsSection`, `roadmap`, `costIqBacklog` | layout | |
| FX15 | Replace raw FinOps IQ keys with display names and drop or collapse `not_assessed` rows ("14 of 21 capabilities not assessed in FinOps IQ") | `cloudSection` | layout, Q4 | Needs a label map; check FinOps IQ already has one (UNVERIFIED) |
| FX16 | Print assumption IDs, use consistent capitalisation, shorten the A-07 label | `assumptions` | layout | |
| FX17 | Where a score leads the "Where to look first" table but has no finding or step, say so ("no finding was raised because ...") | `summary` | Q8 | Business Alignment, here. Needs a check that ADP-61 is the only source (UNVERIFIED) |
| FX18 | Surface the respondent's own low-confidence answers (CORE-06, CORE-16) in the client edition, in the Limits list | `methodology` | Q7 | Show only when present |

### Shared renderer (owner decision: touches FinOps IQ and Sovereign IQ)

| ID | Fix | Where |
|---|---|---|
| FX19 | Keep a table with its source note, keep a finding's heading and first rows together, and avoid a single orphan row at a page foot | shared PDF renderer (`packages/engine-core/src/report/` model and renderer; not read by me) |

### Later

| ID | Fix | Phase |
|---|---|---|
| L1 | Size a non-cloud saving as ranges, with a total that reconciles to the cloud line, an inflation guard and a double-count check for SaaS | **CQ4** |
| L2 | Delivery-grade roadmap: owner role, duration, dependencies, effort, milestones, KPIs, prerequisites, risks, sequence logic | **CQ6** |
| L3 | How LTM can help: type (advisory / implementation / transformation), indicative scope, execution outline, no repeated text | **CQ6** |
| L4 | Compare the CIO's own hypothesis (CORE-09) with the findings | **CQ6** (the config marks it "not built") |
| L5 | Answer-consistency checks (revenue vs spend, industry vs client type), shown as questions to confirm | **CQ7** (assumed: CQ7 is the checks and tests phase; I have not read PLAN.md for this) |
| L6 | Per-answer score values in the consultant appendix | **CQ7** or with FX12, if the result carries them |
| L7 | A trace test: every printed number maps to an engine field; a reconciliation test for the question counts | **CQ7** |

## Decisions for the owner

1. **Contradictory boundary text (FX2):** edit the shared constant (changes FinOps IQ's own text) or override in Cost IQ only. Recommended default: override in Cost IQ only, then reconcile when CQ4 lands.
2. **Cloud line prominence (Q4):** keep the three tiles on the summary, or show them only on section 5 until FX5 to FX7 are done. Recommended default: keep them, once the source, link date, currency and coverage lines are in; a Low-confidence line should carry the word "Low" next to the tiles.
3. **Decision and time frame (FX13).** Recommended default: 30 days to supply evidence.
4. **Version line (FX4):** whether the client edition may carry the release ID at all. Recommended default: no.
5. **Renderer change (FX19)** across all three accelerators, or a Cost IQ-only workaround of page breaks.

## Sources used

Local files only, read 4 Nov 2026: the two PDFs in the session scratchpad, `report.ts`, `master-v6.6.json`, `cost-iq-summary.ts`, FRAMEWORK.md, PRACTICE_LEAD_METHOD.md, `M7-cio-challenge.md` (first 60 lines). No external URL was fetched. Flexera n = 753, GAO-04-394G (2004) and TBM Taxonomy (2025) as cited in the report: UNVERIFIED by this review.

## Resolution, 4 Nov 2026 (main session)

Fixed in `report.ts` and covered by `cost-iq-report.test.ts`: FX1 (areas wording, baseline questions explained), FX2 (the shared boundary statement is no longer printed; the contradiction with the summary is gone), FX3 (overclaiming sentences reworded), FX4 (no DRAFT or release ID in the client edition), FX5 (Flexera and the FinOps IQ assessment in the sources when the cloud line is shown), FX6 and FX7 (link date, in-scope spend, cap, and a currency note when the cloud line and the report currency differ), FX8 (scored versus asked explained), FX9 (activation rule and rating explained), FX10 (score-band legend, no peer comparison stated), FX11 (tile renamed "Questions answered"), FX12 (single-question dimensions name their question; the weighting sensitivity is stated in words, not as a number), FX14 (findings numbered, used in the roadmap and the backlog), FX15 (display names; capabilities not rated are summarised in a sentence), FX16 (assumption IDs printed), FX17 (a low score is not a finding), FX18 (self-estimated and unsure answers in the limits).

Not done, by decision or phase: FX13 (a decision line with an owner role and a 30-day default: needs the owner's approval); FX19 (keep tables with their source notes, keep a finding together, avoid orphan rows: shared renderer, also affects FinOps IQ and Sovereign IQ, owner decision); L1 to L7 as listed above. The weighting sensitivity is not quantified in the report because a computed number outside the trace would break the number-trace rule; it can go in the consultant appendix as a derived, traced figure.

The gate (nine of ten answered) is not yet met: questions 5, 8 and 9 stay partly answered until CQ4 (total), the decision line (FX13) and CQ6 (roadmap, offerings).
