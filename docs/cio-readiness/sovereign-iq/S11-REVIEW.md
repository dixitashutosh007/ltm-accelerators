# Sovereign IQ S11: re-score against the 13-area scorecard

**Date:** 5 Nov 2026. **Reviewer:** sovereignty-compliance-lead (AI practice-lead agent). I advise; I do not sign off. The product owner decides. Counsel reviews regulatory and data-protection wording before external use, and that review has not happened.
**Build reviewed:** working tree on branch `cost-iq-release-1-0-0` at `f9f486e` (main plus platform P1 and P2 merges), Sovereign IQ engine 4.7.0, registry 1.1.0, claims register 0.1.0 (updated 5 Nov 2026), questions 4.2.0. The Sovereign IQ report cover prints "Sovereign IQ engine 4.7.0 · regulation registry 1.1.0" and no release label. I changed none.
**Baseline:** `VALIDATION.md` (13 Oct 2026): Sovereign IQ 0 Pass, 6 Partial, 6 Fail on 12 areas (Posture IQ 0, 7, 5). Area 13 was added on 14 Oct and not scored then. Scale and areas: `FRAMEWORK.md` lines 35-51.
**Gate (PLAN S11):** all 13 Pass, or each Partial accepted in writing by the owner.

## Result

**4 Pass, 9 Partial, 0 Fail.** Sovereign IQ is **not** CIO ready under the gate as written. Every area that was Fail is now Partial or Pass. No area got worse. Three Partials are at the ceiling the method allows until counsel or a real AWS account is involved (areas 9, 10, and part of 2).

## Evidence I ran myself (5 Nov 2026)

- `npx vitest run`: **51 files, 1,301 tests, all passed** (41.6 s).
- `npm run typecheck` (CI's `tsconfig.typecheck.json`): **0 errors** (exit 0). `npx tsc --noEmit -p .` (root config, as asked): **10 errors**, all in `amplify/functions/evaluate-cost-iq/persistence-handler.ts` and its test (the same 10 CQ11 reported). None in Sovereign IQ files.
- `npx playwright test tests/e2e/sovereign-iq-v4.spec.ts`: **9 passed** (1.2 min): every question in executive and workshop mode answered, follow-ups, complete, resume, client view, Posture IQ permission, start screen shows disclaimer and data handling, WCAG 2.2 AA on start, step, review and every result tab, 360 px, accessible names, PDF and CSV download. (PLAN S5 says 7; the file now has 9.)
- `node scripts/check-claims.cjs`: **"Claims checks passed."** It checks fields, unique IDs, source URL and checked date on every sourced claim, UNSOURCED never client-visible, no claim past its review date (volatile within 90 days), every referenced claim ID exists, banned phrases.
- **Sovereign IQ claims** (`packages/engine-core/src/claims/claims-register.json`, CLM-SOV-001 to 271): **271 claims**. By grade: **V 118, S 105, P 30, UNSOURCED 18**. 248 are client-visible; none of the 18 UNSOURCED are. Last reviewed between 14 and 27 Oct 2026 (183 on 14 Oct, 52 on 26 Oct). **69 are marked volatile.** Earliest next reviews: CLM-SOV-161 DPDP on **16 Nov 2026**; CLM-SOV-096 and 097 (UK CSR Bill) 27 Nov; CLM-SOV-050, 053, 103, 104 on **4 Dec**; most other volatile ones 12 Jan to 24 Jan 2027; the rest 14 Oct 2027. **None is overdue today, so CI passes.** The 18 UNSOURCED: CLM-SOV-046, 073, 075, 087, 124, 125, 129, 140, 142, 156, 171, 183, 189 (S2) plus 213, 237, 247, 250, 259 (S5 to S7).
- **`npm run audit:engines`: Sovereign IQ is not in it.** The run covers Strategy IQ, Cloud IQ, FinOps IQ v3 (both modes), Resilience IQ and Cost IQ (Cost IQ has since been added). `packages/engine-core/audit/adapters.ts` has no Sovereign IQ entry; the S5 switch-over removed the old adapters and none was added for v4. PLAN S4 item 1 and its gate ("audit passes in CI") name an adapter. The same invariants are tested in `sovereign-iq-v4.test.ts` instead (monotonicity, unknown and blank never flatter, every band reachable, no dead question, 300 random questionnaires), and golden outputs exist (`test/golden/sovereign-iq-v4.json`, approved by the owner 25-26 Oct per PLAN S4). The audit report format and the 800-run sensitivity method are not applied to v4.
- **PDFs re-rendered** with a throwaway script (scratchpad, not the repo) for assessment date 5 Nov 2026 and read through the text layer: **ARC1 EU bank, workshop, client (27 pp.) and consultant (29 pp.)**; **ARC5 India services firm, executive, client (25 pp.)** and **workshop, consultant (33 pp.)**. I also generated ARC1 workshop's backlog and ARC3 executive. **I did not look at page images** (layout, charts, colour, page breaks); owner approved the visual review at Gate S6.
- Read in code or tests, not names: `v4/question-bank.json` (49 questions: 17 executive, 15 workshop, 17 follow-up; every one has `basis`; the six without an "Unknown" option are scope or preference questions A1, L1, L3, W1-W3), the page shows each question's Basis (`app.js:509`), `amplify/functions/sovereign-iq-report/handler.ts` (no report is stored; matches the notice "Reports are generated when requested and are not stored"), `amplify/backend.ts` (`SovereignIqAssessment` TTL attribute `expiresAt`, API logs one year), narrative `AI_ENABLED: 'false'` (`sovereign-iq-narrative/resource.ts:19`).

## Scorecard

| # | Area | Baseline | Now | Evidence |
|---|---|---|---|---|
| 1 | Purpose and distinctness | Fail | **Pass** | Decision, buyer (CIO with CISO, DPO/GC, CRO) and edge over provider offerings, the EU SEAL tender, free self-assessments and maturity models are written (`VALIDATION.md` s.4, `PLAN.md` S1, approved 14 Oct). Posture IQ is retired: pages, engines, routes, playbook removed at the 26 Oct switch-over; `/posture-iq` forwards. Resilience IQ and Cloud IQ boundary confirmed by the owner. The provider facts in the edge table (AWS ESC GA Jan 2026, S3NS SecNumCloud) were checked on 13 Oct; I did not re-open them. |
| 2 | Functionality | Partial | **Partial** | 9 browser tests pass and 1,301 unit tests: sign-in, start, save and resume on the server, report, PDF, CSV, client view, no scoring data in the page. **Verified only by tests or synthesis:** DynamoDB TTL deletion, the new tables and routes in a deployed account, Cognito ownership checks under real tokens, load. I did not see CI for this commit. |
| 3 | Questions and answers | Fail | **Partial** | Unknown on every scored question, scored as risk (`ASM-SOV-002`); 49 questions each with a regulation or framework basis, shown on the page. Japan, Hong Kong, Australia and New Zealand separated. Short of Pass: basis statuses are not all V (counsel reads them, S10); wording has not been tried on a real CIO (pilots are booked later). |
| 4 | Depth | Partial | **Partial** | Executive 17 questions plus triggered follow-ups; workshop 32 plus follow-ups, same engine and contract. Nobody has timed the executive run, so "15-20 minutes" is a design target, not a measurement. Executive maturity shows only over at least 5 required controls (owner decision 26 Oct); below that it shows states, not a number. |
| 5 | Scoring engine | Partial | **Partial** | Tested: monotonic, unknown and blank never score above the lowest answer, provider nationality never lowers maturity below L4, every band reachable, no dead question, 218 tests in `sovereign-iq-v4.test.ts` at S4, ten public-material reference scenarios written before the engine ran, goldens approved by the owner. **Not met:** not in `audit:engines` (above), so no 800-run sensitivity report for v4. T2 can move maturity by about 28 points from one answer (owner decision 26 Oct, by design). Weights and bands are LTM heuristics (`ASM-SOV-003`, `-005`, Medium confidence). |
| 6 | CIO alignment | Partial | **Pass** | Summary leads with two headlines never blended, the largest cap labelled "cap, not expected fine", "Where to start" with severity, owner role, start month and duration (ARC1 p. 3; ARC5 p. 4), decisions and confirmations. Every finding has an owner and a time frame (heuristic, `ASM-SOV-012`, `-013`, Low confidence, said so in Appendix B). Static offerings and always-shown actions are gone. Jargon is mostly tied to a consequence. |
| 7 | Output | Fail | **Pass** | Server-rendered client and consultant PDFs with the scorecard's sections: summary, findings, roadmap, How LTM can help, technical execution (Sovereign cloud advisory), methodology, Appendix A "How we calculated this", B assumption register (ASM-SOV-001 to 014), sources with URL and grade; consultant adds SOW draft and consultant checks. Backlog CSV has 22 columns including effort, start, duration, dependencies, milestone, KPI, platform, rung, service families, verification. Every number is traced and re-read by tests (`sovereign-iq-v4-report.test.ts`). Notes: CSV is one row per finding, not per playbook action; its Source column was empty on the ARC1 row I read; I read the text layer, not images. |
| 8 | Sources | Fail | **Partial** | 271 claims with source, owner, last and next review, CI-enforced (above). Short of Pass: 105 S claims rest on secondary sources and 30 P claims cite a primary URL whose article was not re-read; 18 UNSOURCED (consultant-only, but a hostile reader of the consultant edition sees them); a news source (NPR, 12 Jun 2026) is still printed in the client sources list for FISA 702 (D7(c)); EUR-Lex, legislation.gov.uk and bills.parliament.uk refuse direct fetches from this environment (EUR-Lex returned empty, parliament 403), so primary texts were checked through search results that quote them. The claims checker gives the register's version as 0.1.0. |
| 9 | Legal validity | Fail | **Partial** | Disclaimer and data notice come from one source and are on the start screen and in both PDFs ("not a substitute for advice from a qualified lawyer; LTM is not a law firm", date stated, privilege sentence, Mumbai hosting and no EU adequacy, retention, logs, AI state). 85-statement validation table corrected in the registry (PLAN S2). The report cover itself says "Internal consultant use until the legal review". **Needs counsel:** A6 lawyer sign-off per market (EU with FR and DE, UK, US, SG, AU, IN; France and India on the practice-of-law point) has not happened; the TIA (`S10-TIA.md`) and both reviews were written by AI. **Not in place:** A1 transfer instrument (SCCs, IDTA or Addendum) is deferred to LTM go-live, so the notice names no mechanism; I did not find LTM's privacy notice that the report refers to. Hosting is a Mumbai development account per the Cost IQ review (PLAN CQ9); I did not check. |
| 10 | AI scope and toggle | Fail | **Partial** | Shared Bedrock service (`packages/engine-core/src/ai`, `amplify/functions/sovereign-iq-narrative`), India profile (D29), off at service (`AI_ENABLED: 'false'`) and per engagement, no browser AI (repo check), grounding check and fail-closed retry, redacted input, prompt and output log, 20 narrative tests. **Verified only by tests or synthesis:** the live eval `scripts/eval-sovereign-narrative.ts` (10 archetype runs and 8 adversarial notes) **has not been run**; model access for `in.anthropic.claude-opus-5` and the IAM scope are unconfirmed in a real account; **A4** (Bedrock retention mode `none` in ap-south-1 and ap-south-2) is open; the India profile has no structured output and no fallback model. The AI notice sentence needs re-approval before switch-on. |
| 11 | Technical execution | Fail | **Partial** | Placement matrix and ladder for AWS, Azure and Google Cloud (24 provider options, 4 alternatives); platform playbook 72 entries on 10 platforms, each with verification, owner role, source, review date; tests confirm no technical gap on any archetype platform. Provider claims CLM-SOV-228 to 269 are V on provider documentation, next review 24 Jan 2027; **I did not re-open any of them.** Open from S7: O1 (AWS per-request approval), O5 (Bleu, Delos status), O6 (UK and APAC local providers), O7 (approach-level examples), O8 (government cloud eligibility). Whether any hyperscaler-linked offering meets R4 is an LTM judgement for counsel. Application-level discovery is stated. |
| 12 | Commercial pull-through | Partial | **Pass** | Six typed offerings (advisory, implementation, transformation); every finding maps to one primary offering (D31, tested in `sovereign-iq-v4-help.test.ts`); each has an execution outline keyed to the finding; the draft SOW is consultant-only ("not an offer or a quotation"; "LTM's work does not include legal advice"); fees and named partner gone from the client view. No hype found: I searched all four extracts for "guarantee", "legally void", "unenforceable", "attorney" (none). Scope ranges (4-6 weeks and so on) are unsupported LTM planning ranges, labelled as such. |
| 13 | Report defensibility | not scored | **Partial** | (a) Appendix A traces maturity control by control and each cap's rule, input and rate; tests re-read every traced number. (b) 14 assumptions with value, basis, confidence, "if it is wrong". (c) Caps are shown as caps, never summed, "at least" where a limb is not collected; maturity is a score with a band, not money, so there is no savings-style ramp. (d) No peer benchmark or vendor score. (e) Roadmap has effort, start month, duration, dependencies, milestone, KPI, risk, heuristic. (f) Executive summary, versions, "Data provided by", disclaimer. (g) CIO challenge re-test 10 of 10 on 26 Oct. **Why not Pass:** see "Report defensibility audit" below: AI Act phase-in dates are not shown (D13), D7(c) and D8 are open, a ten-fold cap range when turnover is a band, inconsistent "status as of" dates, and the re-test was run by the practice-lead function, not a human consultant dry run (S11 item 3). |

**Totals:** Pass 4 (1, 6, 7, 12), Partial 9 (2, 3, 4, 5, 8, 9, 10, 11, 13), Fail 0.

## Report defensibility audit (area 13) and the hostile CIO questions

Samples read: ARC1 (EU retail bank, DORA, turnover EUR 3.2bn, workshop) and ARC5 (India-headquartered services firm, executive and workshop).

**Numbers I traced.** ARC1: maturity 55 / Developing; 17 findings, 0 critical, 2 high; largest cap EUR 128m = 4% of EUR 3.2bn (GDPR Art. 83(5)); AI Act EUR 96.0m = 3% of EUR 3.2bn (Art. 99(4)); DORA "set by national law" (no EU cap, matches Art. 50-51, row 16 of the 13 Oct table). ARC5 executive: maturity 52; 5 findings; largest cap **EUR 40.0m to EUR 400m** from a turnover band, labelled as the largest computable. Arithmetic is right. Each cap prints its article, input and rate in Appendix A.

**Where it could still be attacked.**
1. **AI Act dates are missing from the client report (D13, open).** ARC1 p. 9 rates the AI Act "applies on your answers", with a EUR 96.0m cap and "(status as of 2026-10-14)", and says nothing about which duties bind today (Art. 4 and 5 from 2 Feb 2025; Art. 50 and Art. 101 GPAI fines from 2 Aug 2026) and which wait (2 Dec 2026, 2 Dec 2027, 2 Aug 2028). The registry holds these dates (`regimes.json` EU_AI_ACT milestones) but the PDF does not print them. A General Counsel will ask first. A cap that reads as if exposure begins now, for a deployer whose high-risk duties are deferred to Dec 2027, is the most likely overstatement. Needs counsel and a fix.
2. **Cap range ten-fold** when turnover is a band (ARC5). Honest, but a CFO will say "so what is it?". The report says to enter turnover; the executive summary does not push that.
3. **Dates disagree inside one page.** ARC1 p. 9 stamps the FISA row "(status as of 2026-10-14)" and then writes "status as of 26 Oct 2026"; the notice says "as at 25 October 2026"; the assessment date is 5 Nov. A reader cannot tell what is current.
4. **Maturity and roadmap durations are LTM heuristics** (ASM-SOV-003, -005, -012, -013, Medium or Low confidence); the report says so, but no market data exists to test them. Not a defect, a thing the owner accepts.
5. **D7(c) news source and D8 "related obligations"** (DORA Art. 9(4)(d); RTS 2024/1774 Art. 6, 7, 21) open since the S6 re-test; a DORA bank reader will look for them.
6. **Consultant edition lists UNSOURCED items** only as a count ("1 item rests on a source still being verified"); acceptable.

**"Where is this number from?"** Answered from the report's own pages: Appendix A per number, Appendix B per constant, article and rate per cap. Partly: the weights, bands and durations rest on LTM reasoning, not data. **Answer: yes for statutory caps, partly for maturity and roadmap.**
**"Is this legal advice?"** Answered on pp. 4 and 18 and the cover ("Not legal advice", "LTM is not a law firm", "unlikely to be protected by legal professional privilege"). The report is honest that no lawyer has reviewed it: "Internal consultant use until the legal review". Partly: group labels "applies on your answers" are LTM's reading, stated as such; the France and India practice-of-law question (A6) is unresolved, so a consultant should not deliver this in those markets before counsel replies. **Answer: disclosed, not yet validated.**
**"Why should I trust a tool hosted in India?"** Answered in "How your data is handled" (p. 18): Mumbai, no EU or UK adequacy, what is held, who sees it, 2-year deletion and one-year logs, AI off by default and processed in India if on, no personal details wanted. **Not answered:** which legal mechanism covers the transfer (A1 deferred), the TIA conclusion in plain words, who the controller is, a link to a privacy notice I could not find. A GC will notice that the report tells the client to run a transfer register while its own transfer basis is not named. **Answer: partly; the transfer instrument is the gap.**

## Legal-validity points and open items

- **Disclaimer and data notice:** present in start screen and both PDFs from one source (`NOTICES`); consistent with code on TTL (24 months) and one-year logs; reports are not stored (checked); owner approved the wording 26 Oct. Counsel has not read it.
- **Counsel briefs:** `design/S10-counsel-briefs.md` has questions, prepared answers and wording per market (EU, UK, US, plus SG, AU, IN); estimates are rough hours. No reply from any lawyer exists.
- **Open (from PLAN S10):** **A6** lawyer sign-off per market; **A4** Bedrock retention mode before AI is switched on; **A1** transfer instrument, deferred by the owner to LTM go-live (per memory note "deferred to LTM go-live"); A9 optional (log the Cognito user ID rather than email).
- **Open sources (S6 re-test):** **D7(c)** primary source in place of NPR for FISA 702; **D8** related-obligations attribution; **D13** AI Act phase-in lines; **D14** SEC foreign-private-issuer branch; **D15** FISA 702 certification date; EKM GA (D24). All carried to counsel by agreement.
- **Not shown in the client report but known:** CLM-SOV-046 negative statement (no localisation duty in DORA, NIS2, CPS 230, MAS TRM) stays UNSOURCED and consultant-only until counsel confirms.

### What applies on 5 Nov 2026 and what applies later (as the registry states it, checked against sources below)

| Obligation | Applies today? | Dates |
|---|---|---|
| GDPR Chapter V, Art. 83 caps; UK GDPR with DUAA main provisions | Yes | UK DUAA provisions in force 5 Feb 2026 (VALIDATION row 45) |
| DORA, incl. RTS 2025/301 (incidents) and 2025/532 (sub-contracting) | Yes | From 17 Jan 2025; 2025/532 from 22 Jul 2025 |
| NIS2 | Only where the member state has transposed | Deadline 17 Oct 2024; Commission referred IE, ES, FR, NL to the CJEU 8 Jul 2026 |
| AI Act Art. 4, 5 | Yes | 2 Feb 2025 |
| AI Act GPAI duties | Yes | 2 Aug 2025; Art. 101 GPAI fines from 2 Aug 2026 |
| AI Act Art. 50 transparency; general application | Yes | 2 Aug 2026 |
| AI Act Art. 50(2) marking for generative systems already on the market; two new Art. 5 prohibitions | **Later: 27 days** | 2 Dec 2026 |
| AI Act high-risk, Annex III | **Later** (deferred by Regulation (EU) 2026/1744) | 2 Dec 2027 |
| AI Act high-risk, Annex I products | **Later** | 2 Aug 2028 |
| Data Act (applies); cloud switching charges | Applies; charges **reduced, cost-based until 12 Jan 2027**, none after | 12 Sep 2025; 12 Jan 2027 |
| EU Cyber Resilience Act reporting; full application | Reporting yes; rest later | 11 Sep 2026; 11 Dec 2027 |
| UK critical third parties regime | Yes: four providers designated | Effective 13 Jul 2026 |
| UK Cyber Security and Resilience Bill | **Not law** | Lords stages in progress (see below) |
| FISA Section 702 | Statutory authority **lapsed**; collection continues under certifications | Lapsed 12 Jun 2026; certifications to about Mar 2027 |
| EU-US DPF | Yes; appeal pending | General Court 3 Sep 2025; C-703/25 P lodged 31 Oct 2025 |
| APRA CPS 230 | Yes, including pre-existing contracts | 1 Jul 2025; 1 Jul 2026 |
| India DPDP | Board and definitions only | Rules 1, 2, 17-21 on notification (13 Nov 2025); consent managers one year later (about 13 Nov 2026); main duties 13 May 2027 (14 May on the later reading) |
| MAS TRM Notices amendments; TPRM Guidelines | **Not final** | Consulted 10 Jun 2026 and Mar 2026 |

**Stale on 5 Nov?** Nothing in the registry is wrong against what I could check. Three items need attention: CLM-SOV-096 says the CSR Bill's Lords report stage "was scheduled for 26 October 2026", a date now past (search says report stage was completed 26 Oct and third reading set for 2 Nov; I could not confirm either); the DPDP consent-manager start falls about 13 Nov 2026, eight days away, and one August 2026 source reports Supreme Court challenges to that framework, which the register does not mention; and the AI Act 2 Dec 2026 date is not on the client PDF.

## Volatile claims re-verified on 5 Nov 2026 (S2 90-day rule)

Primary sources EUR-Lex, bills.parliament.uk and legislation.gov.uk could not be fetched from this environment (EUR-Lex returned empty content; parliament returned 403). "Primary" below means a government or regulator page I opened. Everything else is search results quoting a law firm, tracker or news outlet and is labelled secondary.

| Claim | Result on 5 Nov | Source and kind |
|---|---|---|
| CLM-SOV-091 UK CTP: four designated, effective 13 Jul 2026 | **Re-verified, primary** | gov.uk announcement 10 Jul 2026 (opened) |
| CLM-SOV-103, 104 FISA 702 lapsed 12 Jun 2026; certifications to Mar 2027; no reauthorisation | **Re-verified, secondary** (nothing newer found than 27 Oct) | Brennan Center resource page updated 27 Oct 2026 (opened); Roll Call 5 Jun 2026 (47-52 vote); EFF 12 Jun. The "intelligence community asked for action by late November" part of 104 I could not confirm |
| CLM-SOV-013 DPF appeal C-703/25 P pending | **Re-verified, secondary** (no hearing date or ruling found) | OJ notice C/2025/6610 of 22 Dec 2025 found by search; trackers |
| CLM-SOV-019 NIS2 referrals 8 Jul 2026 | **Re-verified, secondary** | Press coverage and a Danish mirror of the Commission release; Commission page not opened |
| CLM-SOV-047, 050-053 AI Act Regulation (EU) 2026/1744 dates | **Re-verified, secondary** (several law-firm notes agree: OJ 24 Jul 2026, in force 27 Jul 2026; Annex III 2 Dec 2027; Annex I 2 Aug 2028; 2 Dec 2026 for the new prohibitions and marking). I could not read the OJ text; one tracker says not yet published and is out of date | Law-firm and research notes |
| CLM-SOV-161 DPDP Rules phase-in | **Partly re-verified, secondary**: sources differ by a day on notification (13 or 14 Nov 2025) and on 13 or 14 May 2027, as the register already says; new point: consent-manager challenges before the Supreme Court | Law-firm articles; Gazette not opened |
| CLM-SOV-096, 097 UK CSR Bill | **Could not verify** (status after 26 Oct unconfirmed; Royal Assent not found) | Search results only; official bill page 403 |
| CLM-SOV-113 US state laws; 136, 139 MAS consultations; 211 PIPC review of UK; 228-269 provider documentation; ECB rates (12 Oct 2026 set) | **Not re-verified** | These are due 12 Jan to 24 Jan 2027 and CI does not flag them; the ECB set is a dated reference |

So **about 9 of the 69 volatile claims** were re-checked, none contradicted, one could not be confirmed. That does not complete S11 item 2.

## AI status

Built; **off by default** at the service switch and per engagement; **live evaluation not run**; no browser AI. Region: India profile (D29), with data-retention mode (A4) and model access unconfirmed. Grounding check, fail-closed retry, redaction (client name and email) and prompt and output logging are tested with a stub model only. The report cover prints "AI narrative: off". My verdict: do not switch on until A4, the live eval and the AI notice sentence re-approval.

## Remaining open items, ranked

**Blockers for "all 13 Pass"** (each needs work or the owner's written acceptance):
1. **Areas 9 and 10: counsel and live AWS.** A6 sign-off per market (France and India practice-of-law question first); A1 transfer instrument and a findable privacy notice; A4 retention mode; the live narrative eval; hosting statement at the LTM move.
2. **Areas 9 and 13: the AI Act phase-in lines (D13) and D7(c), D8.** Print which AI Act duties apply now and which later; replace the NPR source; add the DORA related-obligation citations. These are content fixes the practice lead can specify; counsel then confirms.
3. **Area 5: add a Sovereign IQ v4 adapter to `audit:engines`** and re-run the 800-run audit, or the owner accepts the in-test invariants as the audit. Also area 4: time one executive run with a real or internal consultant.
4. **Area 8: raise the weak claims.** 105 S and 30 P need primary text read; 18 UNSOURCED need counsel or removal; reconcile "status as of" dates on one page.
5. **Area 13: a human consultant dry run (S11 item 3)** of the three hostile questions, and re-verification of the other 60 volatile claims on or before 16 Nov (DPDP) and 4 Dec (AI Act, FISA).
6. **Area 11: O1, O5-O8** open, and a human read of the provider playbook sources.

**Other:** root `tsc -p .` shows 10 legacy errors (Cost IQ handler); CI result for this commit not seen; page images not viewed by me.

## What the owner would have to accept in writing to move toward a release label

I do not change any label; this is what a decision rests on. The owner would be accepting:
1. **Areas 9 and 10 Partial:** no lawyer has read the registry, findings text, disclaimer or TIA; AI-written briefs and TIA only; the transfer instrument is not in place; AI narrative, its IAM, Bedrock retention mode, DynamoDB TTL deletion and the report and save routes are **verified only by tests or synthesis**, not in a real account; AI stays off until the live eval and A4.
2. **Area 5 Partial:** Sovereign IQ is outside `audit:engines`; maturity weights and bands are heuristics; T2 can move the score by about 28 points.
3. **Area 8 Partial:** 135 of 271 claims are not at V grade; 18 UNSOURCED are consultant-only; a news source is printed.
4. **Area 13 Partial:** AI Act dates absent from the client PDF until D13 is fixed; ten-fold cap range on a turnover band; D8 open; no human dry run.
5. **Areas 2, 3, 4, 11 Partial** as listed (not timed, unverified deploy, wording not tried on a CIO, playbook sources not re-opened, O1 and O5-O8).
6. **Use limits:** consultant-led internal use only until counsel signs off per market (D9); France and India not delivered before counsel replies.
7. That a release label is a separate decision from these acceptances.

## What I could not verify

- Anything in a real AWS account: Bedrock access, live eval, IAM, TTL timing, deploy, API behaviour, CI for this commit.
- Primary legal text: EUR-Lex, legislation.gov.uk and bills.parliament.uk were not readable, so the regulation checks above rest on the gov.uk page I opened and on search results quoting secondary sources.
- The final status of the UK CSR Bill, the exact DPDP consent-manager date, whether the AI Act OJ text matches the dates, and whether the FISA late-November request is accurate.
- Provider documentation claims (CLM-SOV-228 to 269) and the 30 P claims' article texts.
- Page images; whether the privacy notice exists; the identity of the hosting account; who is the controller.
- Whether a human CIO or consultant finds the executive run takes 15-20 minutes.
- Counsel's view on any "applies on your answers" label, the France and India practice-of-law risk, and the R4 wording.

## Sources and date checked (all 5 Nov 2026)

- gov.uk, UK financial system strengthened with new safeguards for major technology providers (CTP designations): https://www.gov.uk/government/news/uk-financial-system-strengthened-with-new-safeguards-for-major-technology-providers (opened)
- Brennan Center, Section 702 2026 resource page (updated 27 Oct 2026): https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page (opened); Roll Call, 5 Jun 2026: https://rollcall.com/2026/06/05/fisa-reauthorization-stalls-in-early-morning-senate-vote/ (search result); EFF, 12 Jun 2026: https://www.eff.org/deeplinks/2026/06/victory-702-has-expired (search result)
- Latombe appeal, OJ notice C/2025/6610: https://eur-lex.europa.eu/eli/C/2025/6610/oj (search result, not opened); WilmerHale note: https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework (search result)
- Regulation (EU) 2026/1744 dates: https://www.cuatrecasas.com/en/spain/intellectual-property/art/digital-omnibus-ai-has-been-published ; https://www.mayerbrown.com/de/insights/publications/2026/07/eu-ai-act-news-digital-omnibus-on-ai-new-guidance-on-risk-classification-gpai-and-transparency-obligations ; https://fpf.org/wp-content/uploads/2026/07/FPF-EU-AI-Act-Timeline-2026-R2.pdf (search results; EUR-Lex https://eur-lex.europa.eu/eli/reg/2026/1744/oj returned empty content)
- NIS2 referrals: https://therecord.media/eu-cyber-filing-ireland-spain-france-netherlands-nis2 ; https://dig.watch/updates/eu-commission-eu-court-nis2-delays (search results); Commission transposition page https://digital-strategy.ec.europa.eu/en/policies/nis-transposition (not opened)
- UK CSR Bill: https://bills.parliament.uk/bills/4035 (HTTP 403, not read)
- DPDP Rules phase-in: https://www.mondaq.com/india/data-protection/1775140/from-draft-to-reality-key-changes-in-indias-dpdp-rules-2025 ; https://bestmediainfo.com/mediainfo/mediainfo-digital/meity-notifies-digital-personal-data-protection-rules-2025-begins-phased-rollout-10685939 (search results)
- Repo evidence: `packages/engine-core/src/claims/claims-register.json`; `packages/engine-core/audit/adapters.ts`; `packages/engine-core/src/accelerators/sovereign-iq/v4/question-bank.json`; `amplify/backend.ts`; `amplify/functions/sovereign-iq-report/handler.ts`; `amplify/functions/sovereign-iq-narrative/resource.ts`; `docs/cio-readiness/sovereign-iq/design/S10-counsel-briefs.md`, `S10-data-protection.md`, `S6-cio-challenge-retest.md`; format copied from `docs/cio-readiness/cost-iq/CQ11-REVIEW.md`.
