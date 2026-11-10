# FinOps IQ, Sovereign IQ and Cost IQ as specialist CIO advisory tools

**Date:** 8 Nov 2026. **Build:** `main` at `c1a016a`. **Reviewer:** Claude (AI). I advise; the product owner decides; counsel reviews regulatory and data-protection wording.
**Question asked:** can each product be used as a specialist CIO advisory tool to diagnose and assess its area for global customers? Are the questions adequate, is the engine strong enough, and does the report give a CIO what they need? Where not, what is the plan?

This review builds on the 13-area scorecard re-scores of 5 Nov 2026 (`finops-iq/F12-REVIEW.md` 5 Pass / 8 Partial, `sovereign-iq/S11-REVIEW.md` 4 / 9, `cost-iq/CQ11-REVIEW.md` 1 / 12) and adds what that scorecard does not test: global coverage, diagnostic depth against real data, and what a CIO needs beyond one domain report.

## Verdict

| | FinOps IQ | Sovereign IQ | Cost IQ |
|---|---|---|---|
| **Use today, consultant-led, internal** | Yes | Yes, inside its 16 jurisdictions | Yes, as a conversation opener |
| **Specialist diagnostic for a global client** | **Ready with conditions** | **Not yet**: coverage gaps and a silent "no regulations apply" outside them | **Not yet**: engine too thin for a specialist claim |
| Questions | Strong (69; 22 FinOps Framework capabilities) | Strong for covered markets (49; 28 controls; 42 regimes) | Broad but partly unused (106; 11 collected and never used) |
| Engine | Strong (audit clean; capped, ranged value model) | Strong logic, harsh calibration | Weakest (20 findings, 28 questions can raise one; blanks can flatter) |
| Report | CIO-grade summary; appendix reads like code | CIO-grade; no cost to fix | Scores lead; little money; no benchmarks |
| Blocks external use for all three | Hosting on a personal development account, counsel review not done, transfer instrument not named, nothing verified in a real AWS account, no client pilot |

**In one line:** FinOps IQ is a credible specialist tool once the go-live gates close; Sovereign IQ is credible for the EU, UK, US and its APAC markets but must not be run for a client outside them until it says so; Cost IQ is a useful structured conversation, not yet a specialist diagnostic.

## What I checked (today)

- `npm run audit:engines` on `c1a016a` (all three now included).
- Question banks, scoring configuration and finding-activation rules read in code.
- Sovereign IQ engine probed with a Swiss, a Canadian and an "Other" bank holding personal data.
- The FinOps IQ client-edition PDF produced by the real report service (Northwind Bank sample, 32 pages) read through its text layer.
- Claims register counts by product and grade.
- Not checked: Sovereign IQ and Cost IQ PDFs (the 5 Nov reviews read them in full), anything in a real AWS account, page images.

## FinOps IQ

**Strengths.**
- **Questions.** 69 in total (7 scope, 9 value base, 46 maturity, 7 hypothesis), with 20 in executive mode. They cover the FinOps Framework's 22 capabilities, and every question cites a basis.
- **Value model.** Three cases, net of effort and phased by year. Each lever is capped and the total is capped at 29%, and every number is traced. The audit is clean: no out-of-scale results, and missing answers never flatter the score.
- **Playbook.** 145 entries across 11 platforms (AWS, Azure, Google Cloud, OCI, IBM, Alibaba, Kubernetes, on-premises, SaaS and data platforms).
- **Claims.** 235 of 237 are graded V.
- **Report.** The executive summary is what a CIO expects: situation, issue, recommendation and value. The sample reads "USD 9.72m expected net per year; USD 3.59m in year one; USD 23.0m over three years", with conservative and upper cases beside it and the label "not a savings commitment".

**Gaps.**
1. **Inputs are self-reported only.** The `focus` field records which billing format the client holds, but nothing imports it. Spend, coverage and idle shares are bands the client estimates, so value confidence is Low by design. A specialist FinOps diagnostic would read the FOCUS or provider billing export.
2. **The expected case is a heuristic.** It is half of the published maximum (ASM-FIN-040/041, Low confidence). The three-year range in the sample is USD 4.39m to 41.2m, about nine-fold. It's honest, but wide for a CFO.
3. **The need index is driven mostly by scale.** In the audit, the spend and business-unit facts each swing it by 41.5 points, while a maturity answer swings it by at most 12.5. The report labels it "not a maturity score", but a CIO may still read it as one.
4. **The client appendix reads like code.** Appendix A, pages 16 to 22 of 32, prints engine paths such as `findings[F-FIN-ALLOCATION].levelMilestones.run`. Sovereign IQ already turns these into words (`v4/report.ts:508`).
5. **Open owner decision:** the Google default for an unstated instrument (55% or 46%).

## Sovereign IQ

**Strengths.**
- **Coverage.** 42 regimes: EU 7, France 1, Germany 1, UK 6, US 10 (federal, California, New York), Singapore 3, Australia 4, New Zealand 1, India 4, Japan 1, Hong Kong 2, Korea 1, China 1.
- **Structure.** 28 controls, a per-class requirement set, and a placement ladder for AWS, Azure and Google Cloud. AI Act phase-in dates are now in the result. The playbook has 72 entries on 10 platforms.
- **Audit.** Sovereign IQ is now in `audit:engines` and is clean: missing answers lower maturity (by 17 points in the worst profile), never raise it.
- **Report.** Two headlines that are never blended. Caps are shown as caps, never summed.

**Gaps.**
1. **Silent zero outside coverage. This is the most serious gap.** The headquarters question offers Switzerland, Canada and "Other". A Swiss or Canadian bank holding personal data gets **0 regulations in scope**, and the result carries no note that its country isn't assessed (probe, 8 Nov). A client reads that as "no obligations".
2. **Missing markets for a global claim.**
   - Middle East: the UAE (federal law, DIFC and ADGM) and Saudi Arabia (PDPL, NCA controls).
   - Canada (federal and Québec privacy law, OSFI guidance) and Switzerland (revFADP, FINMA).
   - Latin America (Brazil's LGPD) and Africa (South Africa's POPIA).
   - South-East Asia beyond Singapore: Indonesia, Malaysia, Thailand, Vietnam and the Philippines.

   Which ones matter is a market decision. Each needs counsel-verified content, and **I have not verified the regimes named here**.
3. **No cost to fix.** Findings carry effort and duration, which are heuristics, but no money. A CIO's second question after "what is our exposure" is "what will it cost to close it", and Cost IQ and FinOps IQ don't price sovereignty either. An EU sovereign-cloud move can change run cost materially, and none of the three products models that.
4. **Harsh calibration.** 81.6% of random questionnaires land in "Exposed". One answer about which kinds of data the client holds (D1) swings maturity by 35 points. Both may be right by design, but they need a practice lead's calibration against real clients.
5. **Source standing for legal content.** Of 275 claims, 129 are V, 98 S, 30 P and 18 UNSOURCED. For regulatory content a client relies on, the 98 secondary and 30 unopened-primary claims need primary-source reading and counsel. The France and India practice-of-law question (A6) is open.

## Cost IQ

**Strengths.**
- **Breadth.** 106 questions over 16 dimensions, footprint-gated: the default run is 33 to 46 questions.
- **Money.** Non-cloud levers are quantified only from the client's measured figures, with year-by-year tables. The cloud line is taken unchanged from FinOps IQ, so there's never a second cloud figure.
- **Commercial pull-through** passes. The release label is `COSTIQ-1.0.0`, with the Partials the owner accepted.

**Gaps.**
1. **11 questions are asked and never used.** They include the CIO's own priorities (CORE-07 and CORE-09), the funding-change question (CORE-10) and every "where is the waste" hotspot question (CORE-14, 19, 32, 39 and 42; ADP-10, 12, 21 and 28). They are configured `signalOnly`, but no engine code reads their signals. None of them can raise a finding: only 28 of 106 questions activate any of the 20 findings. They reach the report only as raw rows in the consultant-only answer table (`report.ts:618`). The CIO spends time answering questions that never shape the advice.
2. **The engine is thin for a specialist claim.** 20 findings cover 16 dimensions. 4 to 5 dimensions are scored from a single answer (decision S5, deferred to the next release). One question (CORE-34, manual operations effort) can swing Value IQ by 25 points, 42% of its range. All dimensions are weighted equally.
3. **Missing answers can flatter.** The audit's worst profile is +1 on Cost IQ and +2 on Value IQ, which breaks the scorecard's engine rule.
4. **Industry is collected but not used to tailor anything.** CORE-02 is unused, and there's no sector or size routing beyond the footprint.
5. **No benchmarks.** A CIO's first cost question is "how do we compare?", for example IT spend as a share of revenue for their industry and size. The report offers no published reference. Plan item T2, "show the closest published reference per dimension", is still open.
6. **The goldens are not approved by the practice lead.** 65 of 99 question bases are LTM heuristics. Of 25 claims, 11 are UNSOURCED.
7. **The headline is two scores.** "Cost IQ 53, Value IQ 58" doesn't answer what to do. The money and the first steps follow, but the report leads with scores.

## Does the report give a CIO what they need?

| A CIO needs | FinOps IQ | Sovereign IQ | Cost IQ |
|---|---|---|---|
| One-page answer: situation, issue, recommendation, value | Yes | Yes | Partly: leads with scores |
| Money: range, net, phased | Yes | **No**: exposure caps, no cost to fix | Partly: only where figures were measured |
| Prioritised actions with owner and timing | Yes (heuristic durations) | Yes (heuristic) | Yes (heuristic) |
| Comparison with peers or market | Partly: published market data section | Not applicable (regulatory status) | **No** |
| Confidence stated honestly | Yes | Yes | Partly |
| Board-ready format: two-page brief or slides | **No**: 32 to 55-page PDF and CSV | **No**: 25 to 33 pages | **No** |
| One picture across cost, cloud, sovereignty and resilience | **No** (only the shared cloud figure with Cost IQ) | **No** | **No** |
| Progress over time: baseline against the next assessment | **No** | **No** | **No** |
| Based on the client's real data | **No**: self-reported | **No**: self-reported | **No**: self-reported |
| Client edition free of engine internals | **No** (Appendix A) | Yes | To check |
| Language and spelling to the client's market | English, UK spelling only | Same | Same |

## Gaps that cut across all three

1. **Go-live gates.** The platform runs on a personal development account in Mumbai, every page carries a development-preview notice, and FinOps IQ and Sovereign IQ add "internal consultant use". Counsel hasn't read the notices. The transfer instrument (A1) isn't named, and there's no privacy notice page. Nothing has been verified in a real AWS account.
2. **Enterprise procurement.** A global client's security team will ask for the platform's security posture, an independent penetration test, data-residency options (EU or US hosting for clients who need them), SSO and roles. Cost IQ has no consultant-only role today (M8).
3. **No evidence from systems.** All three diagnose from answers. The step from questionnaire to specialist diagnostic is reading the client's data: billing exports (FOCUS), cloud resource inventory (regions, key ownership) and a cost ledger.
4. **No real-world calibration.** There's no delivery history and no pilot. The heuristics (FinOps IQ's expected factor, roadmap durations, Sovereign IQ's bands) are untested against real engagements, and no human practice lead has signed off.
5. **No integrated CIO view.** Each report stands alone. A CIO buys "Infra Tech Advisory", not three PDFs. Cross-domain trade-offs, such as sovereignty requirements raising cloud cost, aren't modelled anywhere.

## Phase-wise plan

Durations are indicative and assume the current pace (one owner plus AI agents); counsel and the LTM account set the critical path.

### Phase 0 (about 2 weeks): make today's use safe

| # | Item | Product | Exit check |
|---|---|---|---|
| 0.1 | Coverage guard: for a footprint outside the registry (Switzerland, Canada, Other), show "not assessed" with the list of covered markets, on screen and in both editions; never a bare zero | Sovereign | Probe: Swiss and Canadian bank results show the warning; test added **Done 10 Nov 2026** (engine 4.8.0; `sovereign-iq/PLAN.md`) |
| 0.2 | Use the 11 unused questions or drop them: priorities order the recommendations; hotspots raise or qualify findings; else remove them from the default run | Cost | Audit: no unused non-context questions; new activation tests **Done in CQ12** (PR #105) |
| 0.3 | Missing answers never flatter (+1/+2 today) | Cost | Audit worst profile +0 **Done in CQ12** (PR #105) |
| 0.4 | Client-edition Appendix A in words (reuse Sovereign IQ's field labels); engine paths consultant-only | FinOps (check Cost) | Text-layer check: no `findings[` in a client edition **Done 10 Nov 2026** (`finops-iq/PLAN.md`; Cost IQ checked: no engine paths) |
| 0.5 | Owner decision: Google default 55% or 46% | FinOps | Recorded; claims updated |

### Phase 1 (about 4 to 8 weeks, in parallel; critical path): go-live gates

| # | Item | Exit check |
|---|---|---|
| 1.1 | Move to the LTM AWS account; choose the hosting region(s) for EU and US clients; update every data notice | Real-account checks: TTL deletion, IAM, report service, narrative worker |
| 1.2 | Counsel review per priority market: notices, disclaimers, Sovereign IQ regulatory statements; settle A6 (France, India) | Written counsel sign-off per market |
| 1.3 | Transfer instrument (SCCs, IDTA or Addendum) and a published privacy notice | Notice names the mechanism and links the page |
| 1.4 | Roles: consultant-only content and editions by role (M8) | Test: a non-consultant cannot download the consultant edition |
| 1.5 | Procurement pack: security overview, penetration test, data-flow diagram | Pack reviewed by LTM security |

### Phase 2 (about 6 weeks): engine and question depth

| # | Item | Product | Exit check |
|---|---|---|---|
| 2.1 | Second scored question for each single-answer dimension (S5); findings for every dimension (20 to about 40); sector and size routing using CORE-02 and CORE-03; weighting decision | Cost | Audit; practice-lead-approved goldens |
| 2.2 | Published reference per dimension (T2): IT spend ratios by industry from public sources, with source, year and sample | Cost | Claims registered; shown in the report |
| 2.3 | Band calibration review (81.6% Exposed today); cost-to-fix ranges from effort and a rate card, labelled as estimates | Sovereign | Owner-approved bands; money traced |
| 2.4 | Primary-source reading of 98 S and 30 P claims; resolve the 18 UNSOURCED | Sovereign | Register: no S or P on client-visible regulatory text |
| 2.5 | Re-read the FinOps IQ V claims that were read through search results; a named human owner for review dates | FinOps, all | Register notes updated |

### Phase 3 (about 6 weeks): what the CIO takes into the boardroom

| # | Item | Exit check |
|---|---|---|
| 3.1 | Two-page board brief and a slide export (PPTX) from the same traced figures | Both pass the report checks |
| 3.2 | Integrated CIO view across FinOps, Cost, Sovereign (and Resilience): one page, shared figures, cross-domain dependencies (for example, a sovereignty requirement and its cloud-cost effect) | One client, three assessments, one consistent page |
| 3.3 | Re-assessment: compare with the previous assessment; KPI progress against the roadmap | Delta report for a repeated sample client |
| 3.4 | Report spelling per client market (US or UK), set at engagement | Lint per variant |

### Phase 4 (about 12 weeks): global depth and evidence from systems

| # | Item | Product | Exit check |
|---|---|---|---|
| 4.1 | Market expansion in the order the business needs, for example Canada, Switzerland, UAE, Saudi Arabia, Brazil, South Africa, Indonesia, Malaysia | Sovereign | Each regime counsel-verified before it is client-visible |
| 4.2 | Billing import: FOCUS and provider exports replace spend bands, coverage and idle estimates | FinOps | Value confidence rises to Medium or High where the data is loaded |
| 4.3 | Read-only cloud inventory: resource regions, key ownership, provider access settings | Sovereign | Location and key controls marked "evidenced" |
| 4.4 | Cost ledger or TBM import for spend transparency | Cost | Spend dimensions scored from data |
| 4.5 | Report languages beyond English, if the markets need them | All | Translated templates under the same checks |

### Phase 5 (from week 6, running alongside): prove it with real clients

| # | Item | Exit check |
|---|---|---|
| 5.1 | Pilots: two or three clients per product across at least two regions; time the executive runs | Timed runs; client feedback recorded |
| 5.2 | Human hostile-CIO, CFO and General Counsel sessions on real reports | Ten hardest questions answered from the report |
| 5.3 | Calibrate heuristics from pilot outcomes: FinOps IQ expected factor, durations, Sovereign IQ bands | Assumption register updated with observed data |
| 5.4 | Human practice-lead sign-off per product | Recorded approval |

## Decisions for the owner

1. **Target markets for "global":** which regions first (sets Phase 4.1 and the counsel list in 1.2).
2. **Hosting:** one region, or EU and US hosting for clients that require it.
3. **Cost IQ positioning:** fix as a specialist diagnostic (Phases 0.2, 2.1 and 2.2), or position it as the CIO's opening conversation that routes into FinOps IQ, Sovereign IQ and Resilience IQ.
4. **Board outputs:** whether the integrated CIO view (3.2) is part of LTM Infra Tech Advisory's offer.
5. **Pilots:** which clients, and when.
