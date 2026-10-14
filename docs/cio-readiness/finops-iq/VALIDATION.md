# FinOps IQ: validation report

**Date:** 14 Oct 2026  **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves.

**Scope:** FinOps IQ in depth, scored on all 13 areas of the scorecard (area 13, report defensibility, added 14 Oct 2026). Cost IQ and FinOps Value Case are mapped for overlap (section 6), not scored.

| | FinOps IQ (today) |
|---|---|
| Page | `Accelerators/finops-iq.html` (5,069 lines; embeds a score-free copy of the KB at line 1762) |
| Public sample | `Accelerators/finops-iq-sample-report.html` (647 lines, no `rbac-guard`, so reachable without sign-in) |
| Playbook | `Accelerators/FINOPS_IQ_CONSULTANT_PLAYBOOK.md` (v2.2, 214 lines) |
| Engine | `packages/engine-core/src/accelerators/finops-iq/` (KB schema 2.2.0, 44 questions, 5 stages, 5 domains, 23 checkpoints, 4 archetypes) |
| API | `amplify/functions/evaluate-finops-iq/` (stateless; JWT route `POST /api/evaluate/finops-iq`, plus an unauthenticated legacy route while `LTM_KEEP_LEGACY_API` defaults to `true`, `amplify/backend.ts:213-215`, `amplify/config.ts:55`) |
| Tests | `packages/engine-core/test/finops-iq.test.ts` (24), golden `test/golden/finops-iq.json` (6 cases), `tests/e2e/finops-iq.spec.ts` (4) |

**Method:**
- Read the page, engine, contract, handler, KB, public schema, playbook, sample report, the Phase 3 audit and the claims inventory.
- Ran `npm run audit:engines`: FinOps IQ results are unchanged from `docs/phase3/AUTOMATED_AUDIT.md`.
- Ran the unit tests: 104 passed (`finops-iq` 24, `finops-value-case` 34, `engines` 46).
- Ran the browser spec: 4 passed.
- Ran my own engine probes, a throwaway script outside the repo:
  - monotonicity over 13,314 single-answer improvements;
  - "not applicable" gaming;
  - the effect of leaving T6 blank;
  - the gating cliff.
- Generated the report (screen in client and consultant mode, checkpoints tab, PDF) for all four archetypes with the browser test harness. Throwaway spec outside the repo; no repo file changed.
- Web verification of every figure and claim.

**Source access note:** direct fetches of finops.org failed from this environment (DNS resolution blocked), as they did for the Sovereign IQ review. Every verdict below rests on web-search results that quote or link the primary source. The URL given is the primary source where one was returned; I say where only secondary sources were available. All sources were checked on 14 Oct 2026.

---

## 1. Verdict

**FinOps IQ is not CIO ready. Its headline dollar figure should not be shown to a client until the Critical findings are closed.**

The question bank is a reasonable practitioner checklist. The engine is technically sound: it never scores a better answer worse, it has no dead questions, and missing answers do not flatter the maturity stage. But four things undermine it.

1. **The maturity model is LTM's, presented as the FinOps Foundation's.** The five stages run "Chaos / Crawl" to "Automated / Run" to "Transparent", with strict org-level gating. The FinOps Foundation instead rates each capability Crawl, Walk or Run, and says reaching Run everywhere is not the goal.
   - One weak answer can drop an estate scoring 98/100 to "Below Stage 1".
2. **The headline "Estimated Waste Savings at Stake" is not defensible.** It is either the client's own one-click guess at waste (T6) or an unsourced stage band of 25–35% of spend. It is shown as "recoverable" and as "annual cloud bill recovery". It has no lever breakdown, no implementation cost and no ramp.
   - Leaving T6 blank raises the figure up to 4.5 times (retail archetype: $0.88M–$1.98M with T6, $3.96M–$6.16M without).
   - The public sample report's "$6.3M–$9.8M" is this stage band, presented as recoverable waste. Next to it are invented findings, a "~28x First-Year ROI" and "guaranteed-savings FinOps sprints".
3. **Client data goes out in ways the tool denies.**
   - Live browser AI sends the client name, spend, maturity, blockers and the consultant's free-text interview notes to Gemini, Anthropic or OpenAI, using a key stored in `localStorage`.
   - The playbook tells consultants to say that "no organizational financial data … [is] ever transmitted to external servers".
4. **FinOps IQ overlaps FinOps Value Case almost question for question, and Cost IQ's cloud and FinOps sections.** It fails the distinctness test.

**Totals:** of 52 claims checked, 23 are incorrect, 3 are outdated and 21 are unsourced (section 5). The playbook, page and sample report describe features that do not exist: a 10-minute flash mode, six triggered "contradiction probes", a passkey-protected client mode, a synthesised SOW and a unit-economics model.

My recommendation is to fold FinOps Value Case into FinOps IQ as its executive mode. FinOps IQ would then be rebuilt on the FinOps Foundation's per-capability Crawl/Walk/Run model, which Cost IQ already encodes, with a lever-based value model. Cost IQ stays as the enterprise technology-cost diagnostic that routes cloud findings to FinOps IQ (section 6).

---

## 2. Scorecard

Pass / Partial / Fail per area, with the target for the rebuilt accelerator. Evidence is file and line, test or source.

| # | Area | FinOps IQ | Target | Evidence |
|---|---|---|---|---|
| 1 | Purpose and distinctness | **Fail** | Pass | No named CIO decision or buyer anywhere in the page, KB or playbook. FinOps Value Case asks the same questions: tagging % (FVC V2 vs FIQ I2), commitment coverage (C2 vs O1), forecast variance (P1 vs A8), anomaly/bill variance (V3 vs I6/I8), accountable owner (O1 vs C7), engineer cost visibility (O3 vs I4), unit cost (V4 vs T2), decommissioning (C3 vs I7), egress (C5 vs O7), cost in objectives (O4 vs A6). Cost IQ has its own cloud and FinOps sections (ADP-01–05, ADP-42/43, FIN-01–12) on the FinOps Foundation's four domains. The edge over free tools is written only as playbook objection-handling (`FINOPS_IQ_CONSULTANT_PLAYBOOK.md:203-204`), which claims a "FinOps Foundation framework" the tool does not implement |
| 2 | Functionality | Partial | Pass | Server scoring works: 4/4 browser tests pass; no page errors or CSP violations when generating all four archetype reports. Gaps:<br>• Save and resume is `localStorage` plus JSON file import/export only (`finops-iq.html:3460-3545, 4702-4725`), not server-side.<br>• No backlog export.<br>• The PDF is client-side jsPDF from a CDN (`finops-iq.html:16-17`). It silently truncates the roadmap to 18 rows (`body: rows.slice(0, 18)`, line 4905): the saas archetype has 28 gaps. It prints "≥" as `"e` ("rightsizing compliance "e90%" in every PDF).<br>• No test that every question renders and can be answered.<br>• The archived PDF goes to S3 via `LTM_S3.saveReportToS3` with the client name and spend |
| 3 | Questions and answers | **Fail** | Pass | • **No "Unknown" option** on any of the 44 questions.<br>• **"Not Applicable / Out of Scope" is offered on every question, critical ones included, and a critical N/A passes its gate** (`evaluate.ts:99`). Marking all 17 critical questions N/A and answering "mostly" elsewhere gives Stage 2, the same as answering them.<br>• Overlapping or mixed options: A4 option 3 "No AI workloads in cloud, or AI spend completely unmanaged" scores 0 for both cases; I3 option 1 "Single-cloud estate, or partial normalization" mixes scope with maturity.<br>• O10 asks the client to "Rank these optimization levers" but offers four maturity statements.<br>• C1 and C5 ask the same thing (account owners), both critical, both mapped to chk-c1, so it counts twice.<br>• C8 (root MFA) is a security control filed under "Understanding usage".<br>• No question cites its basis.<br>• Coverage is public cloud only: no SaaS, licensing, private cloud or data-centre scope, although the FinOps Framework has had Scopes since 2025 and 90% of State of FinOps 2026 respondents manage SaaS spend |
| 4 | Depth | **Fail** | Pass | There is one mode: all 44 questions across 5 stages. There is no executive mode and no follow-up triggered by an answer: `grep` finds no flash or probe logic in the page or engine. The playbook sells a "10-minute C-suite flash readout" and "6 contradiction probes" with trigger conditions (`PLAYBOOK.md:25-32, 76-138`) that do not exist |
| 5 | Scoring engine | Partial | Pass | **Good:**<br>• Audit: no dead questions.<br>• Missing-data shift −0.02 (stage) and −0.35 (overall), so blanks do not flatter.<br>• My probe: 0 monotonicity violations in 13,314 single-answer improvements.<br>**Faults:**<br>• 97.9% of random questionnaires land "Below Stage 1"; Optimized, Automated and Transparent are never reached at random (`AUTOMATED_AUDIT.md`, FinOps IQ).<br>• Critical minimums of 75/80 on stages 3–5 against option scores of 100/65/30/0 mean only the top option ever passes them.<br>• **Gating cliff:** best answer everywhere except C4 = "finance sees the top-level invoice only" gives an overall 98/100 and "Below Stage 1".<br>• **Label truth:** "Waste Savings at Stake" is a waste estimate, not a saving.<br>• **Missing data inflates value:** leaving T6 blank lifts the low end from 20% to 25% for a weak client, and up to 4.5× for a strong one.<br>• Golden archetypes disagree with their own `baseline_stage`: saas is declared Stage 2 and the engine gives Stage 1; retail is declared Stage 3 and the engine gives Stage 2 (`knowledge-base.json` archetypes, `test/golden/finops-iq.json`).<br>• Golden outputs are not lead-approved (`SCORING_AUDIT.md` decisions 1, 3–5 open) |
| 6 | CIO alignment | Partial | Pass | It leads with money and a maturity stage, but the money is unsupported (area 13). Roadmap items carry a horizon (0–3, 3–9, 9–24 months) but no owner role, no decision and no effort (`evaluate.ts:282-308`). Jargon without business consequence: "FinOps Defensibility Score", "Chaos", "posture defense", "Maturity Elevation Blueprint" |
| 7 | Output | **Fail** | Pass | The PDF is two pages: cover with KPIs and an 18-row roadmap table (`finops-iq.html:4780-4950`).<br>• No disclaimer: the KB disclaimer at `knowledge-base.json:8` is never rendered.<br>• No methodology or sources panel and no version.<br>• No "How LTM can help".<br>• No technical execution and no backlog.<br>• Client mode does not change the PDF |
| 8 | Sources | **Fail** | Pass | The claims inventory has 61 `finops-iq` rows, all `unreviewed`, 0 with a citation, 0 with an owner (`docs/claims-register/claims-inventory.csv`). The structured register (`packages/engine-core/src/claims/claims-register.json`) holds Sovereign IQ claims only. The page, playbook and sample-report figures (section 5) are not extracted at all |
| 9 | Legal validity | **Fail** | Pass | Few regulatory statements, but:<br>• The disclaimer is not shown on screen or in the PDF.<br>• Client-data handling is undocumented and misdescribed. The playbook says data never leaves the browser (`PLAYBOOK.md:210`); in fact answers, spend and client name go to the LTM API in ap-south-1, BYOK AI sends notes and spend to US AI vendors, and archived PDFs go to S3.<br>• No hosting statement.<br>• The trademark sentence "'FinOps' is a trademark of the FinOps Foundation" is unverified (section 5, row 9).<br>• "FinOps IQ™" is claimed in the sample report with no evidence of registration |
| 10 | AI scope and toggle | **Fail** | Pass | Live BYOK:<br>• Provider and key modal, key kept in `localStorage` (`finops-iq.html:1592, 1694-1703, 3556-3627`).<br>• Direct `fetch` to Gemini (key in the URL query string), Anthropic (`anthropic-dangerous-direct-browser-access`) and OpenAI (`3650-3726`).<br>• The executive briefing prompt sends the client name, sector, spend, stage, score and blockers, "in McKinsey/Deloitte advisory style" (`3763-3799`).<br>• "Interpret with AI" sends the consultant's free-text notes and lets the AI suggest an answer that one click applies (`3728-3761, 4314`).<br>• AI output goes into the PDF unchecked (`4877-4882`).<br>• No grounding check, no log. The CSP allows all three vendor hosts (`customHttp.yml:14`) |
| 11 | Technical execution | **Fail** | Pass | The page captures clouds (AWS, Azure, GCP, OCI, Private Hybrid) and stack (`finops-iq.html:4019-4020`) but never sends them to the engine. Remediations are one string per question, AWS-first (Compute Optimizer, CUR, Graviton, NAT Gateway, SageMaker, Karpenter), with no Azure, GCP, OCI, on-premises or private-cloud variant and no verification step. The bank archetype (Azure + AWS) is told to use AWS Compute Optimizer |
| 12 | Commercial pull-through | **Fail** | Pass | • No typed offerings.<br>• Client mode is a frosted-glass "teaser" whose CTA is "Schedule Advisory Session with Ashutosh Dixit"; a mailto pre-filled with spend and "recover an estimated $X – $Y in cloud waste" (`finops-iq.html:4554-4562, 4732-4777`).<br>• The playbook carries fees ($120k–$380k) and a "Free Teaser to Paid Advisory SOW" conversion script (`PLAYBOOK.md:15, 142-197`).<br>• The sample report shows "Target SOW $250k" and "~28x First-Year ROI".<br>• Reads as sales |
| 13 | Report defensibility | **Fail** | Pass | Section 4:<br>• 20 of 23 assumptions have no stated ground.<br>• The headline is a self-estimate or an unsourced band, called "recoverable".<br>• No lever split, cost or ramp.<br>• Roadmap items are one-line remediations without owner, effort, KPI or dependency.<br>• CIO challenge: 0 answered, 2 partly, 8 not |

**Totals:** 0 Pass, 3 Partial (2, 5, 6), 10 Fail.

---
