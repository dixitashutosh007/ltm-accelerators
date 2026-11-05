# Cloud IQ: validation report (CL0)

**Date:** 5 Nov 2026  **Reviewer:** `cloud-modernization-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves, and qualified counsel reviews regulatory statements before external use.

**Scope:** Cloud IQ scored on all 13 scorecard areas, in the same form as the Cost IQ CQ0 report. The overlap with FinOps IQ, Cost IQ, Modernization IQ, Resilience IQ and Sovereign IQ is section 5. Section numbers are in reading order.

**State reviewed.** Commit `99e6d90` (branch `platform-p3a-session-progress`), which includes the 5 Nov 2026 change that moved progress to the account through `Accelerators/assets/saved-sessions.js`. Nothing was changed to produce this review other than this file and `PLAN.md`.

**Method**
- Read the page (`Accelerators/cloud-iq.html`, 3,377 lines), the engine (`packages/engine-core/src/accelerators/cloud-iq/evaluate.ts`, `contract.ts`, `knowledge-base.json`), the service (`amplify/functions/evaluate-cloud-iq/handler.ts`), the tests and the static sample report (`Accelerators/cloud-iq-sample-report.html`, 1,097 lines).
- Ran `npx vitest run`: **51 test files, 1,301 tests, all pass** (Cloud IQ: `cloud-iq.test.ts`, 26 tests). Ran `npm run audit:engines` (Cloud IQ is already an adapter; section 8). Ran `npx playwright test tests/e2e/cloud-iq.spec.ts`: 2 tests, both pass (they check one scored result and the error path; no test renders every question).
- Ran the real engine (`evaluateCloudIq`) on four illustrative reference clients and several edge answer sets, and on 2,000 random questionnaires (scripts in the session scratchpad, not committed).
- Read the question text and the knowledge base as a sceptical CIO and as a cloud practice lead.
- Checked provider and framework statements against primary pages (section 11). Where a primary page would not load I say so.
- **Not done:** I did not render the page in a browser beyond the two existing e2e tests, so I have no accessibility (axe), keyboard, console or layout evidence for Cloud IQ. The browser PDF (jsPDF) was judged from its code (`cloud-iq.html:3145-3325`), not from a generated file. The cross-site scripting finding (H6) is from reading the code and was not exploited.

---

## 1. Verdict

**Cloud IQ is not CIO ready. It is an attractive, fast diagnostic whose scoring is plausible but whose money figure, sector benchmarks, browser AI and sample report would not survive a CIO or CFO challenge, and it is not yet bounded against the four other LTM accelerators it overlaps.**

What works: the scorecard is computed on the server behind sign-in (`handler.ts:65`, `withAcceleratorAccess('cloud-iq', ...)`); the page no longer scores locally (test `cloud-iq.test.ts:96`); 1,301 tests pass; Cloud IQ is in the scoring audit with no out-of-scale value and no flattering effect from blank answers (mean shift -0.04); the engine carries no impact percentages in its roadmap text (test `:296`); progress now saves to the account.

Six problems stop it passing:

1. **A second, self-reported cloud waste figure.** "Annual cost leakage" is a spend-band midpoint times the client's own waste guess (Q4.3) times a commitment discount, split 40/28/18/14 by fixed weights. An empty questionnaire returns $3,438,000 (spend defaults to $12M, waste to 30%). A client who tells us D3 maturity is 5 of 5 but "don't know" waste gets $6.2M. The upper case reaches 47.8% of spend, against a published average of 29%. This is the figure that FinOps IQ owns by owner decision (one-figure rule), and it is not capped, ranged on evidence, netted for cost or phased (C1).
2. **Invented sector peer benchmarks.** 8 sectors x 9 numbers (72 constants) plus a sentence per sector, shown as "Sector Peer Median", "Lagging Peer" and in the PDF. No source, year or sample exists anywhere (C2).
3. **Browser AI with three vendors and a stored key.** The page keeps an OpenAI key in `localStorage`, and also calls Gemini and Anthropic directly from the browser with the client's name, role, sector, spend, figures and free-text probe notes in the prompt. Two of the three hard-coded models are retired or scheduled for retirement. The framework decision removes all browser AI (C3).
4. **A sample report that contradicts the product and the rules.** Static HTML, not engine output: "Guaranteed 3x ROI", "zero operational risk", "100% compliant with ANSSI and DORA mandates", "REF GRADE: AAA", "DORA enforcement imminent" (DORA has applied since 17 Jan 2025), dimension names and a "Developing" band that the engine does not produce, and a $3.85M figure whose parts do not match the top tile (C4).
5. **No sourced basis for any question, constant or claim.** The 32 Cloud IQ rows in the claims register are all `unreviewed`. The migration framework is stated as "6 R's"; AWS now lists seven (H1, H8).
6. **No execution content, no server report, no data notice.** The deliverable is a browser jsPDF file and an on-screen memo with a hard-coded author. There are no playbook entries, no verification steps, no methodology or sources, no Cloud IQ data notice and no specific retention statement (H4, H5, H7).

Recommendation (judgement): keep Cloud IQ, but refocus it as the **vendor-neutral workload placement and cloud-readiness diagnostic** (where each class of workload should run across public cloud, sovereign or private cloud and on-premises, and in what sequence), delete the money figure and the peer benchmarks, hand cloud cost to FinOps IQ, and make its pull-through the chain Cloud Strategy, then Landing Zone and Platform Engineering, then Migration Factory and Application Modernisation. Detail in sections 5 and 9 and in `PLAN.md`.

---

## 2. Scorecard

**Totals: 0 Pass, 5 Partial (areas 1, 2, 4, 5, 12), 8 Fail (areas 3, 6, 7, 8, 9, 10, 11, 13).** Nothing is marked Pass; areas I could not check fully are marked Partial or Fail with the gap stated.

| # | Area | Result | Evidence |
|---|---|---|---|
| 1 | Purpose and distinctness | **Partial** | The card says "Eight capability dimensions, financial leakage and a four-phase modernisation roadmap" (`Accelerators/index.html:654`), which is a feature list, not a CIO decision. The splash says "Enterprise Hybrid Cloud and Infrastructure Diagnostic Platform". No named buyer, no written edge over free tools (section 9). A real candidate edge exists (vendor-neutral placement across public, sovereign and on-premises, DC exit and VMware renewal in one view; the free provider tools each assess migration to their own cloud). Overlap with FinOps IQ is live in the money figure (D3, leakage) and unresolved with Modernization IQ (D6, 6 R's, DC exit), Resilience IQ (Q5.3, Q7.3) and Sovereign IQ (Q0.3, Q8.2, D7) (section 5) |
| 2 | Functionality | **Partial** | Works with the server: sign-in guard, server scoring, error path (e2e 2 of 2 pass), saved sessions with My sessions and resume (`cloud-iq.html:3366-3374`). Gaps: no server PDF, no backlog export; PDF is browser jsPDF (`:3145`); results are behind a client-side "unlock" (`:2167`, `:2322`); `alert()` and `prompt()` for setup and messages (`:3086-3090`); a splash intro; no test renders every question; I did not check console errors, keyboard use or contrast for this page (NOT CHECKED) |
| 3 | Questions and answers | **Fail** | No question cites a basis. "6 R's" where AWS lists seven (`Q3.1`; section 5 row 1). Option ranges overlap (Q0.9 "20-40%" and "40-60%"; Q4.3 "10-20%" and "20-35%"; Q6.3 "1-4 weeks" and "2-5 business days"). Only 2 of 40 questions offer "Don't know" (Q0.9, Q4.3); no "not applicable" anywhere, so an all-cloud client must answer on-premises storage (Q7.3) and a no-cloud client must answer cost allocation (Q4.1). Maturity ladders reward one architecture: multi-cloud abstraction ranks above a single provider (Q2.2), "committed to owned DCs long-term" is the lowest level (Q7.1), active-active ranks above active-passive regardless of the requirement (Q5.3). Q0.3 mixes statutes, standards and a provider qualification (SecNumCloud) in one list. Q0.7 mixes private cloud and "None" into a list of public providers |
| 4 | Depth | **Partial** | Two modes on one engine and one contract: Executive Flash (32 questions) and Workshop (40) (`evaluate.ts:229-234`). Flash is labelled "~10 mins" for 32 questions (about 19 seconds each) against the framework's 15 to 20 minutes. In flash, D7 and D8 each rest on one question (counted from the KB). Follow-ups: 8 dynamic probes with free-text notes, consultant-led, unscored (`evaluate.ts:71-221`), so depth does not change any score |
| 5 | Scoring engine | **Partial** | In `audit:engines`: no value off its scale; blank answers do not flatter (mean shift -0.04, worst profile +0.04); best answers reach "Leading" and worst "Nascent". Fails: the audit lists 13 questions with no effect on any headline (Q0.1, 0.3, 0.4, 0.5, 0.7, 0.10, 0.11, 0.12, 0.13, 1.1, 1.2, 8.2, 9.2; several of them do drive track, flags, probes or roadmap moves, so "dead" is partly a headline-only artefact, but Q0.1, Q0.5, Q0.10, Q0.13 and Q1.2 change nothing at all); "Leading" is reached by 0.0% of 800 random questionnaires; unanswered dimensions sit at a 2.5 placeholder (two dimensions answered worst and six blank score 2.15 "Emerging"); the money headline is unrelated to maturity; goldens exist (`packages/engine-core/test/golden/cloud-iq.json`) but no practice-lead approval is recorded; every constant is unsourced |
| 6 | CIO alignment | **Fail** | Leads with a maturity score, peer variance and a leakage figure, not a decision. Findings are roadmap moves with a size (S/M/L/XL) but no owner role, time frame or decision. Jargon with no consequence: "TokenOps", "Binding Constraint", "Kavach" classes. The leakage claim and peer delta are the first things shown |
| 7 | Output | **Fail** | Browser jsPDF, 3 or 4 pages (`:3145-3325`); no methodology panel, no sources, no assumptions, no version of the method, no "data provided by", no backlog CSV, no How-LTM-can-help typing. The memo and PDF hard-code "Ashutosh Dixit" and an e-mail address as author (`:2874`, `:2595`, `:3168`). Sample report is static HTML |
| 8 | Sources | **Fail** | 32 Cloud IQ rows in `docs/claims-register/claims-inventory.csv` (CLOUDI-0001 to 0032), all `unreviewed`, none with a source, owner or review date. KB `meta.updated` is 2026-10-01 with no review cycle |
| 9 | Legal validity | **Fail** | No Cloud IQ data notice, retention, hosting or transfer statement on the page (only the shared development-preview notice, `legal-notice.js`). The disclaimer text sits in `knowledge-base.json` `meta.disclaimer` but the page does not show it (grep for "disclaimer" and "not legal" finds none). Sector pre-selection of regulations ignores geography (H2). Saved sessions expire after 90 days (`manage-session/handler.ts:23`), the .ciq export holds the whole assessment on the user's disk, and AI calls send client data to three US vendors with no notice. No counsel review |
| 10 | AI scope and toggle | **Fail** | Browser BYOK for OpenAI, Gemini and Anthropic (`:792-801`, `:846-865`, `:2112-2152`, `:2739-2800`); key in `localStorage` key `cloud_iq_openai_key` (`:2085`); site CSP allows `connect-src` to all three vendors for this reason (`customHttp.yml:14`). No Bedrock, no toggle, no grounding check, no log |
| 11 | Technical execution | **Fail** | 0 playbook entries. Roadmap text names tools (Device42, Dynatrace, Terraform, Bicep, DirectConnect, ExpressRoute, EBS) but is AWS-leaning, has no per-platform or per-level steps and no verification step. No sovereign or private cloud platform steps beyond one "SecNumCloud enclave" move |
| 12 | Commercial pull-through | **Partial** | Six offerings with an "Advise to Execute" door in the KB (`knowledge-base.json` `offerings`), routed by dimension rules (`evaluate.ts:524-533`). The chain strategy, platform, migration factory is present in outline. Missing: advisory/implementation/transformation typing per finding, indicative scope, execution outline, consultant SOW draft. The sample reads as sales ("Guaranteed 3x ROI", "Partner with LTM to deploy") |
| 13 | Report defensibility | **Fail** | Section 6. 0 of 10 CIO challenge questions answered fully |

---

## 3. Findings

### Critical

| # | Finding | Evidence | Consequence for a CIO | Fix | Source |
|---|---|---|---|---|---|
| C1 | **A second cloud waste figure, built from the client's own guess.** `totalLeakage = round(spendMid x wasteRate x (1 - commitMid x 0.45))`, low x0.8, high x1.25, split 40/28/18/14. Defaults fill missing answers: spend $12M, waste 30%, commitment 10% (`evaluate.ts:339-358`). Empty questionnaire: $3,438,000 (28.6% of the assumed spend). Waste "Don't know" is 30%. Upper case up to 47.8% of spend (Q4.3 ">35%" = 40%, x1.25). No cap at the addressable spend or at a published range, no net of delivery cost, no ramp, no confidence. Roadmap converts shares into promises: "Locks in ~$1356k annual recurring savings", "Immediate reclamation of ~$678k" (`evaluate.ts:396, 425`). The AI memo says "reduce cloud cost leakage by an estimated, up to $X" | Engine runs in sections 6.1 and 8; `cloud-iq.test.ts:245` asserts the defaults on purpose | A CFO asks "on what basis?" and the only answer is "you told us 10-20%". A client with strong FinOps maturity and "don't know" waste is told $6.2M. FinOps IQ shows a different number for the same estate (one-figure rule broken) | Remove the figure from Cloud IQ. Show FinOps IQ's cloud line (read-only import, as Cost IQ does) or "Not quantified. Run FinOps IQ". Keep only qualitative cost findings. Remove "Locks in $", "Immediate reclamation" lines | Flexera 2026: 29% estimated waste, more than 750 respondents (section 11, S3); `docs/cio-readiness/cost-iq/BOUNDARY.md` section 3 (one figure); FinOps IQ cap in `finops-iq/registry/levers.json` (carried, not re-read) |
| C2 | **Invented sector peer benchmarks shown as peers.** `knowledge-base.json` `benchmarks`: 8 sectors, overall plus D1 to D8, plus notes such as "Strict regulation (DORA/RBI) drives D7". Shown as "Sector Peer Median", "Lagging Peer", "vs Peer Median", on the radar and in the PDF and memo (`cloud-iq.html:1902-1912, 2211-2213, 2400, 2648`). No source, year, sample or method. The page also keeps an unused second copy (`:1050`) | CLOUDI-0001 in the claims register is `unreviewed`; no source exists in the repo | Method rule 7 and framework: nothing is presented as an LTM peer benchmark. A CIO asking "who is in this peer set?" has no answer. Public Sector at 2.6 and BFSI at 3.2 read as facts | Remove all benchmark values and the "Lagging Peer" labels. Show the client's level against the framework's own level descriptions. Re-introduce a comparison only from a published source with year and sample | Method rule 7; FRAMEWORK.md "Data"; Flexera is the only dataset I verified and it has no maturity-by-sector scores |
| C3 | **Browser AI sends client data to three third parties and stores a key in the browser.** OpenAI key saved to `localStorage` (`:2085`); OpenAI, Gemini (key in the URL query, `:2759`) and Anthropic (with header `anthropic-dangerous-direct-browser-access`, `:2793`) called from the page. Prompt contains client name (unless "anonymise"), role, sector, spend, track, scores, flags, the leakage figure and the free-text probe responses and notes (`buildGroundedPromptPayload`, `:2690-2730`). Hard-coded models: `gemini-1.5-flash` (scheduled for shutdown in 2025 per a Google staff post; primary page not retrievable) and `claude-3-5-sonnet-20241022` (retired 28 Oct 2025, primary). The AI prompt tells the model to explain how "up to $Xk" can be reduced. The CSP allows all three hosts for this page | Section 7 | EU/UK client data and a consultant's personal key leave the platform with no notice, no log and no grounding check; the AI can restate a figure that does not exist. Two of three vendors' models are no longer usable | Remove every browser AI path, the key UI, the "Prompt pack" copy button and the three CSP hosts once Strategy IQ and Modernization IQ are done (they carry the same code, grep). Replace with the shared Bedrock narrative (S1) in CL8. Do not wait for S1 to remove the browser code | FRAMEWORK.md decision on AI; Anthropic deprecations page (section 11, S12); OpenAI key-safety guidance (S10) |
| C4 | **The sample report is not engine output and breaks the report rules.** Static HTML for "Meridian Financial Group", "unmasked" (`:319`). Contains "Guaranteed 3x ROI" (`:858`), "zero operational risk" (`:963`), "100% compliant with ANSSI and DORA mandates" (`:804`), "Accelerates time-to-market ... by 4x" (`:841`), "Reduces application onboarding time by 60%" (`:758`), "40% reduction in underlying compute infrastructure" (`:795`), "REF GRADE: AAA" (`:344`), "Imminent" DORA (`:470`, `:550`), "Posture IQ" referral (`:878`; merged into Sovereign IQ). Band "Developing" does not exist in the engine (2.6 is "Emerging"). Dimension names differ from the product (sample D2 "Architecture and Landing Zone", D4 "Security, Risk and Compliance", D7 "Sovereignty"; engine D4 "Hybrid and Multi-Cloud Ops", D7 "Governance, Security and Zero Trust"). Top tile: Compute $1.85M, Commitments $1.20M; breakdown: $1.15M, $0.98M (parts sum to $3.85M; the tile does not). It includes "Trapped DC Capacity $1.12M", a line the engine cannot compute | Section 6.1 | The first document a CIO sees promises returns the method cannot support and shows numbers the live product will never produce. A CIO who runs the real tool and compares them loses trust | Withdraw from `Accelerators/` now (or label "illustrative, not a forecast" and remove every promise), regenerate from the engine on a reference client in CL5 | Method: report defensibility, inflation check; DORA application date (S6) |

### High

| # | Finding | Evidence | Fix |
|---|---|---|---|
| H1 | **Questions have no basis and several are wrong or unbalanced.** "6 R's" (Q3.1 hint and the "6-R" roadmap titles) where AWS Prescriptive Guidance lists seven strategies (retire, retain, rehost, relocate, repurchase, replatform, refactor). Overlapping ranges (Q0.8-Q0.9, Q4.3, Q6.3). "Unknown" on 2 of 40 questions and not rated as risk anywhere; no "not applicable". Ladders prefer one answer: Q2.2 (multi-cloud abstraction above a single provider), Q5.3 (active-active above active-passive), Q7.1 (owned data centres = lowest), Q0.4 (100% on-premises routes to the "Estate Modernization and DC Exit" track). Q6.2 option "used by ~50% of teams" is a numeric threshold with no basis | Rewrite each question requirement-first with a stated basis (AWS/Azure/Google framework or LTM heuristic with reasoning), add Unknown and Not applicable, remove ranking by architecture, use seven Rs |
| H2 | **Regulation is pre-selected by sector with no geography, and any selection sets the sovereignty flag.** `SECTOR_DEFAULT_REG_INDICES` (page, copied in the KB as `sectorDefaults`) pre-selects for BFSI: Data residency, DORA, RBI/SEBI, PCI-DSS, SOX; Public Sector: FedRAMP, NIS2, SecNumCloud. Any selection other than "None significant" sets `sovFlag` (`evaluate.ts:322-326`), which adds the Phase 3 move "Sovereign Cloud and SecNumCloud Compliance Boundary", raises D7 urgency, and adds the "SecNumCloud and DORA Key Governance" probe. A US bank would see DORA and RBI ticked; a UK public body would be steered to SecNumCloud (a French provider qualification, not a client posture) | Context-only regulation question by market (EU, UK, US, APAC, plus Switzerland and India per GLOBAL-COVERAGE), no pre-selection, no flag from a pre-ticked box; hand sovereignty depth to Sovereign IQ. Counsel review of every regulatory statement (area 9) |
| H3 | **Scoring weaknesses.** (a) Unanswered dimensions score 2.5 (`evaluate.ts:297-299`): D1 and D2 answered worst and six blank gives 2.15 "Emerging"; one dimension best and seven blank gives 2.79. The page checks 25% answered, the API checks nothing. (b) Leakage is independent of maturity (D3 = 5 and "don't know" waste gives $6.2M). (c) Track routing: 62% of 2,000 random questionnaires land on "Hybrid / Dual-Horizon" (1,249 hybrid, 476 A, 275 B), so the track often does not discriminate. (d) Executive weighting of the "top objective" dimension at 1.5 is unsourced. (e) Maturity ladders score option index +1 (1 to 5), so level gaps are equal by construction | Minimum answers per dimension, "not assessed" instead of 2.5, track rule reviewed against the placement decision, weights registered as assumptions, sensitivity shown |
| H4 | **The report is a browser file with an AI memo, hard-coded author and no method.** jsPDF (CDN), chart image, memo text truncated to 56 lines (`:3326`); author "Ashutosh Dixit" and his e-mail in the memo (`:2874`), the report header (`:2595`) and every PDF footer (`:3168`); "Anonymise" replaces only the client name, not role, spend or probe text | Shared server-rendered PDF (S4) with client and consultant editions, sources, assumptions, "How we calculated this", version, date, disclaimers; author from the signed-in user |
| H5 | **Data handling is undisclosed and inconsistent.** No Cloud IQ data notice; saved sessions expire after 90 days (`RETENTION_DAYS = 90`) while Cost IQ states 24 months; .ciq export writes the whole assessment (client name, answers, probe notes, any AI memo) to the user's disk; "archive" uploads the PDF to S3 after a consent prompt (`:3333-3360`); hosting is ap-south-1 per FRAMEWORK, with transfer basis in S6 | One data notice from the shared source (as Cost IQ `notices.ts`), one retention rule agreed with the owner, remove or label .ciq export, S6 transfer basis |
| H6 | **Client-supplied text is inserted into the page as HTML.** `${client}` (the client name, from a prompt box, a restored session or an imported .ciq file) is placed in `app.innerHTML` templates at `:2429` and `:2954` with no escaping; the same applies to probe notes if echoed. A session that an Admin opens could run script in the Admin's browser (read from code, not exploited) | Escape on output (the shared `esc()` pattern in `saved-sessions.js`), restrict characters, add a test with `<img onerror>` as client name |
| H7 | **No technical execution content.** Roadmap steps are generic and AWS-leaning ("unattached EBS/managed disks", "DirectConnect/ExpressRoute", "Device42/Dynatrace"), without platform, tech-stack or application level, discovery needs or verification. Unsourced practice statements: "execute 1-yr/3-yr discount coverage up to 60-70%" (the FinOps Foundation page sets no coverage percentage; section 11 S9), "Typically raises migration throughput", "Typically enables more frequent, independent releases", "Reduces provisioning time from weeks to hours" | Playbook entries per platform and level with verification (S3), sourced to provider documentation; remove or source qualitative claims |
| H8 | **No claims in the register with a source.** All 32 `CLOUDI-` rows are `unreviewed`; the benchmark constants, waste rates, midpoints, weights, thresholds, band cut-offs and 6 R's are unregistered | S2: reference by ID from the engine, CI on review dates |
| H9 | **Boundaries with the other accelerators are not drawn.** Section 5: D3 and leakage duplicate FinOps IQ; D6, Q3.1 and the "Full Data Centre Decommissioning" move duplicate Modernization IQ; Q5.3 and Q7.3 duplicate Resilience IQ (Resilience IQ validation M5 already asks Cloud IQ to route DR and stop ranking patterns as maturity); Q0.3, Q8.2 and D7 duplicate Sovereign IQ | `BOUNDARY.md` in CL2, as for Cost IQ, with owner decisions |
| H10 | **Tests do not protect the content.** The page-versus-engine test compares only `id:type:option count` (`cloud-iq.test.ts:96`), so changed wording or a drifting page copy of the 40 questions, the probes (page `generateConsultingProbes`, `:1523`, duplicates the engine's) and the benchmarks (`:1050`) is not detected. e2e: 2 tests; no all-questions render; no full flow (save, resume, report); no AI-absence test | One source for questions (page reads the engine's metadata), full-flow and render-every-question browser tests, a guard that fails if a browser AI vendor host appears |

### Medium

| # | Finding | Fix |
|---|---|---|
| M1 | **The "unlock" is a cosmetic lead-gen gate.** The content is in the page and hidden by a CSS blur (`gated-content-blur`, `:266`); any non-free-provider e-mail unlocks it, nothing is verified or sent; "LTM Consultant Bypass" toggles it (`:2322`); the name typed becomes the consultant lead (`:2183`). It contradicts the "both modes" decision for a signed-in tool | Remove (decision D6) |
| M2 | Chart.js, jsPDF and jspdf-autotable load from jsDelivr and cdnjs with no integrity attribute (`:8-10`). Cost IQ now serves Chart.js locally | Self-host pinned copies |
| M3 | Version and dates: engine KB v2.2 (updated 2026-10-01), sample "Version 2.1", `generator` v2.2, no release label in the report | One version, shown in the report |
| M4 | Spend band midpoints are assumptions ($0.5M, $3M, $12M, $35M, $75M, $150M); the top band is open-ended and valued at $150M; US dollars only | Register as assumptions; currency question (GLOBAL-COVERAGE G4) |
| M5 | Global coverage: sector list of 8 (no education, media separate from telecom, natural resources split), regulation list limited to DORA, NIS2, RBI/SEBI, HIPAA, PCI-DSS, SOX, FedRAMP, SecNumCloud, GDPR; no UK-specific, Swiss, APAC (for example Singapore, Australia), India data protection or US state items; no coverage statement as required by G3 | Coverage statement; context questions by market; counsel |
| M6 | Splash intro, emoji-style badges and "Kavach" class names; `alert()` confirmations (`:2093`, `:2735`) | Shared shell and inline messages |
| M7 | Untracked backups in the working tree (`cloud-iq.html.v2.2.bak`, 2,463 lines, with an older CSP meta and the same AI code). Not in git, so not deployed from the repository, but they confuse reviews | Delete locally |
| M8 | "Posture IQ" is named in the sample and a `posture-iq.html` page remains in `Accelerators/`, although the owner merged it into Sovereign IQ | Follow the Sovereign IQ plan |

---

## 4. Content verification (statements, constants, benchmarks)

Verdicts: Correct / Incorrect / Outdated / Unsourced. Checked 5 Nov 2026. "KB" is `knowledge-base.json`.

| # | Statement | Where | Verdict | What settles it | Source |
|---|---|---|---|---|---|
| 1 | "6 R's: Rehost, Replatform, Refactor, Repurchase, Retain, Retire" | Q3.1 hint; roadmap titles "6-R"; offering door "6-R Migration Factory" | **Outdated against current provider guidance** | AWS Prescriptive Guidance lists seven strategies: Retire, Retain, Rehost, Relocate, Repurchase, Replatform, Refactor or re-architect. Relocate is missing, and it matters for VMware estates | S1 |
| 2 | "Don't know / Untracked (~30%+ industry avg)" | Q4.3 option 0 | **Incorrect as stated** | Flexera 2026 reports 29% estimated wasted cloud spend, a survey average of more than 750 respondents (fielding date not stated). "30%+" overstates it, and an average is not a per-client rate | S3 |
| 3 | "10-20% (typical hygiene leak)"; "20-35% (substantial waste)" | Q4.3 | **Unsourced** | A published distribution by client, if one exists | none found |
| 4 | Waste rates 0.30 / 0.08 / 0.16 / 0.28 / 0.40; commitment midpoints 0.1 / 0.1 / 0.3 / 0.5 / 0.7 / 0.9; discount factor 0.45; range x0.8 and x1.25; split 40/28/18/14; "compute x 0.35" | `evaluate.ts:339-396`, KB | **Unsourced** (LTM heuristics with no stated reasoning) | Register each as an LTM heuristic with reasoning, or remove with C1 | none |
| 5 | Eight sector peer medians (overall and D1 to D8) and their notes | KB `benchmarks` | **Unsourced; invented** | Published source with year and sample, else remove | none |
| 6 | "execute 1-yr/3-yr discount coverage up to 60-70%" | Phase 2 move `evaluate.ts:424`; sample "70% coverage" | **Unsourced** | The FinOps Foundation Rate Optimization page gives utilisation and return thresholds (about 80% utilisation for steady-state resource-based commitments; at least 90% savings per dollar for spend-based commitments; ROI above 10%; break-even within 9 months) but sets no coverage target | S9 |
| 7 | "VMware Broadcom subscription pricing changes are sharply increasing on-premise run-rates for many clients" | Probe P_VMWARE | **Partly sourced** | The EU cloud-provider association CISPE alleges steep price increases and contract terminations (one report says ten times previous prices); Broadcom "strongly disagrees". "Many clients" is not shown. State it as an allegation by a named party, or remove | S8 |
| 8 | "SecNumCloud" as a regulatory posture a client has (Q0.3 option 9) and "SecNumCloud 3.2" | Q0.3, probe, Phase 3 move, sample | **Incorrect framing; version Correct** | SecNumCloud is ANSSI's security referential and qualification for cloud service providers; v3.2 is dated 8 March 2022. A client uses a qualified provider; it does not "have" SecNumCloud. The ANSSI PDF title and date came from a search result; I did not open the PDF | S5 |
| 9 | "300-point ANSSI SecNumCloud 3.2 certification audit" | Sample report | **Unsourced** | Secondary sources disagree on the number of requirements (about 360 to 400); use the ANSSI PDF | S5 |
| 10 | "DORA enforcement imminent"; "Imminent" | Sample `:470, :550` | **Outdated** | DORA, Regulation (EU) 2022/2554, applies from 17 Jan 2025 (Article 64). The EUR-Lex text did not load in the fetch tool; the date is from secondary sources (blog copy of Article 64, law-firm and regulator pages). Counsel to confirm against EUR-Lex | S6 |
| 11 | "Typically raises migration throughput", "Typically enables more frequent, independent releases", "Reduces provisioning time from weeks to hours" | Roadmap impact lines | **Unsourced** | Qualitative claims with no study; the existing test only forbids multiples and percentages | none |
| 12 | `gemini-1.5-flash` and `claude-3-5-sonnet-20241022` as live models; `gpt-4o` | `cloud-iq.html:2759, 2793, 2772` | **Outdated** (Anthropic, primary); **likely outdated** (Gemini, forum only); **not checked** (OpenAI) | Anthropic lists `claude-3-5-sonnet-20241022` as retired 28 Oct 2025. A Google staff reply on the developer forum gives 24 Sep 2025 for Gemini 1.5 Flash 002 and its alias | S12, S13 |
| 13 | The eight dimensions D1 to D8 as a model of cloud capability | KB `dimensions` | **LTM construct, not labelled** | They are not the AWS CAF (six perspectives: Business, People, Governance, Platform, Security, Operations), the Microsoft CAF (Strategy, Plan, Ready, Adopt, Govern, Secure, Manage) or the Well-Architected pillars (six each at AWS and Google Cloud). Label as LTM's and add a mapping. Note the gap: no People, skills or change dimension, and no Business value dimension, which both adoption frameworks include | S2, S4, S7, S11 |
| 14 | Regulation names in Q0.3: DORA, NIS2, HIPAA/HITECH, GDPR/UK GDPR, PCI-DSS Level 1, SOX, FedRAMP, RBI/SEBI | Q0.3 | **Not checked in this review** | Primary text per regime, by market, with counsel | not fetched |
| 15 | "Pre-selected based on sector" | Q0.3 hint | **Incorrect basis** | Sector does not determine jurisdiction (H2) | n/a |

Count: 15 statements. Incorrect or outdated 6 (rows 1, 2, 8, 10, 12, 15); unsourced 6 (3, 4, 5, 6, 9, 11); partly sourced 1 (7); LTM construct to label 1 (13); not checked 2 (14, and the OpenAI part of 12). Nothing is marked correct without qualification: the only fully confirmed items are that SecNumCloud v3.2 exists (row 8) and that DORA applies from 17 Jan 2025 (row 10, secondary sources).

---

## 5. Overlap and boundary summary

Detail and the line-by-line table are for CL2. The owner decisions already taken that bear on Cloud IQ:

- **One cloud figure per estate, owned by FinOps IQ** (`cost-iq/BOUNDARY.md` section 3). Cloud IQ currently computes a second one (C1).
- **FinOps IQ plan:** capability C8 (billing console and payer-account security) "moves to Cloud IQ or security"; FinOps IQ's playbook lists Cloud IQ as the route for billing-console security.
- **Resilience IQ decision D12 (accepted 27 Oct 2026):** Cloud IQ routes DR to Resilience IQ and stops ranking patterns as maturity. Not yet done in Cloud IQ (Q5.3, Q7.3).
- **Sovereign IQ gate S1:** the Q8.2 flag boundary must be confirmed by the Cloud IQ owner. Not yet done.
- **Cost IQ plan:** the Cloud IQ browser Gemini call is "left to the Cloud IQ plan" (accepted 5 Nov 2026). It is in `PLAN.md` CL1 and CL8.

| Cloud IQ content | Other accelerator | Overlap | Recommended owner |
|---|---|---|---|
| D3 (Q4.1 to Q4.4), leakage, commitment probe, Phase 1 and 2 cost moves, offer 03.3 | FinOps IQ (69 questions, 22 capabilities, lever model) | Direct. Cloud IQ asks four FinOps questions and invents a value | FinOps IQ. Cloud IQ keeps one screening question and the hand-off |
| D6 (Q7.1 to Q7.3), Q0.10 to Q0.12, VMware and lease probes, DC decommissioning move, offer 03.5, Q3.1 (6 R's) | Modernization IQ ("Data centre and compute capacity: power ceilings, AI and GPU siting, 6R dispositions and exit velocity", 18 questions, 6 dimensions; `Accelerators/index.html:662-672`) | Direct on DC exit, 6 R's, exit velocity. I have not reviewed Modernization IQ; its own review decides the split | Decide jointly: either merge DC exit and disposition into Modernization IQ and keep a placement view here, or merge the two. Recommended default in section 10, D2 |
| Q5.3, Q7.3 (DR, backup immutability) | Resilience IQ | Direct; already decided (D12) | Resilience IQ |
| Q0.3, Q8.2, D7 (landing zone guardrails remain here), SecNumCloud probe and move | Sovereign IQ | Sovereignty depth and regime applicability | Sovereign IQ for obligations; Cloud IQ keeps the landing-zone control maturity and a placement constraint (a residency requirement as an input, not a verdict) |
| D8 (Q9.1 to Q9.3, AI readiness) | AI Readiness IQ; Strategy IQ | Not reviewed; AI cost governance overlaps FinOps IQ OP-12 | Decide in the AI Readiness review |
| Q0.8, Q0.1, Q0.2 context | Cost IQ (spend band, sector) | Context facts repeated; Cost IQ is whole-estate | Share the context facts across accelerators (no duplicate typing) |

---

## 6. Report defensibility (area 13)

**Method.** The page produces (a) an on-screen result with scorecard, heatmap, radar, leakage, 4-phase roadmap and offers, (b) a rule-based memo (or an AI memo with a key), (c) a boardroom slide mode, and (d) a browser PDF of 3 to 4 pages. The engine result is the single data source for the numbers. I generated the engine result for four illustrative reference clients (no LTM client data; invented before running; not benchmarks) and read the code that turns the result into the memo and PDF. I did not generate the PDF file. The shipped sample (Meridian) is audited separately because it is the document a CIO is most likely to see first.

### 6.1 Reference clients and the shipped sample

| Client (illustrative) | Answers (key) | Overall / band | Spend assumed | Leakage (low - high) | Share of spend | Notes |
|---|---|---|---|---|---|---|
| RC1 EU bank, hybrid, VMware cliff, DORA, SecNumCloud ticked | Q0.2 BFSI; Q0.8 $20-50M; Q0.9 20-40%; Q4.3 "10-20%"; Q0.11 VMware cliff; Q0.12 lease <12 months; maturity answers all worst | 1.02 Nascent; peer 3.2; delta -2.18 | $35M | $3.88M - $6.06M (point $4.84M) | 13.8% | Dual-Horizon track; all 6 offers; 7 probes; Phase 2 text "Locks in ~$1356k annual recurring savings" |
| RC2 US cloud-native software, AWS only | maturity best; Q0.9 60-80%; Q4.3 "<10%" | 4.98 Leading; peer 3.3 ("Telecom and Media" because no software option exists) | $35M | $1.53M - $2.40M (point $1.92M) | 5.5% | Zero offers; still told $1.92M "leakage"; no software industry in Q0.2 |
| RC3 small estate, "don't know" everywhere | Q0.8 under $1M; Q0.9 and Q4.3 don't know; maturity worst | 1.02 Nascent; sector Other | $0.5M | $115k - $179k (point $143k) | 28.6% | Told to run commitment arbitrage and 6-R scoring on a $0.5M estate |
| RC4 on-premises manufacturer, no public cloud | Q0.4 100% on-premises; Q0.8 under $1M; Q4.3 20-35% | 1.02 Nascent; peer 2.8 | $0.5M | $107k - $167k (point $134k) | 26.7% | "Zombie asset cleanup" and "Commitment Discount Arbitrage" for a client with no cloud; Q4.1 to Q4.4 still asked |
| Empty questionnaire | no answers | 2.5 Emerging; peer 2.9 | $12M assumed | $2.75M - $4.30M (point $3.44M) | 28.6% | A number from no input |
| Shipped sample "Meridian" (static HTML) | not engine output | 2.6 "Developing", peer 3.2 | $14.2M run-rate stated | $3.85M | 27.1% of $14.2M | Does not reproduce from any answer set; see C4 |

Observations:
- **Findings do not follow the estate.** RC3 and RC4 receive the same cloud-cost moves as RC1. There is no applicability routing from Q0.7 or Q0.8.
- **A strong client still gets a loss.** RC2 (Leading) is told it leaks $1.9M.
- **The headline is not a function of the evidence.** Three clients with different estates all score 1.02 because I answered the lowest option in every maturity question; the same applies in reverse. The point is that the money figure does not change with those answers, only with Q0.8, Q0.9 and Q4.3.
- **Track routing:** 62% of 2,000 random questionnaires (uniform answers, seeded) fall on the Hybrid track; A 24%, B 14%.

### 6.2 Number trace (RC1)

| Number or label | Engine field | Inputs and formula | Basis | Traceable? |
|---|---|---|---|---|
| Overall 1.02, band Nascent | `overall`, `band` | Weighted mean of dimension scores, top-objective dimension x1.5; bands <2.0, <2.8, <3.8, <4.5 | Option index +1; LTM weights and cut-offs | Formula yes; constants unsourced |
| Dimension scores (1.0 to 1.17) | `dimScores` | Mean of (answer index + 1); multi-select = share of options x5; True/False = 4.5 or 1.5 | LTM scale | Formula yes; basis no; the number of answers per dimension is not shown |
| Peer 3.2, delta -2.18 | `peer`, `peerDelta` | Lookup of `benchmarks[sector].overall` | None | **No** |
| Spend $35M | `totalCloudSpend` | Midpoint of Q0.8 band "$20M-$50M" | Band midpoint assumption | Formula yes; assumption unstated |
| Leakage $4.844M; $3.875M - $6.055M | `totalLeakage`, `leakLow`, `leakHigh` | 35M x 0.16 x (1 - 0.3 x 0.45); x0.8 and x1.25 | Client's waste band; LTM constants | Formula yes; **inputs are the client's guess; constants unsourced** |
| Compute $1.938M, Commitments $1.356M, Storage $0.872M, Licensing $0.678M | `decomp.*` | Fixed weights 0.40 / 0.28(1-c)/0.7 / 0.18 / 0.14, renormalised | LTM weights, no source | Formula yes; **a fixed split of a guess** |
| "Immediate reclamation of ~$678k" | `movesPhase1[].impact` | `decomp.compute x 0.35` | None for 0.35 | **No** (the $678k happens to equal licensing in this case) |
| "Locks in ~$1356k annual recurring savings" | `movesPhase2[].impact` | `decomp.commit` | Treats leakage as savings | **No** (a promise from an estimate) |
| Urgency High / Medium | `urgencyMap` | Rules (waste >= 25%, lease or VMware, sovereignty, track B, AI with weak D8) | LTM rules | Formula yes; thresholds unsourced |
| Roadmap moves and sizes S/M/L/XL | `movesPhase1-4` | Thresholds on dimension scores (3.0 to 4.2) | LTM thresholds | Formula yes; sizes have no effort, duration or cost |
| Offers 03.1 to 03.6 | `offers` | Dimension at or below 3.2 or track | LTM | Formula yes |
| Any AI sentence or number | none | Third-party model output | None | **No** |

Of 12 number or label types, 4 have no trace and 6 have a formula over unsourced constants.

### 6.3 Assumption register (stated or hidden)

| # | Assumption | Value | Basis today | Confidence | If wrong |
|---|---|---|---|---|---|
| A1 | Client's waste band is an unbiased estimate | 8% to 40% | Client input | Low | The money headline scales linearly with it |
| A2 | "Don't know" waste = industry average | 30% | Option text "~30%+ industry avg" | Low (Flexera says 29% average) | Adds ~$3M on a $35M estate |
| A3 | Spend band midpoint | $0.5M to $150M | None | Low | Linear in the figure; the top band is unbounded |
| A4 | Missing spend | $12M | None | None | An unanswered question yields $3.4M |
| A5 | Commitment midpoints and discount factor | 0.1 to 0.9; 0.45 | None | Low | Moves the figure by up to 40% |
| A6 | Range around the point estimate | x0.8 / x1.25 | None | None | A fixed band, not an uncertainty |
| A7 | Split into compute, commitments, storage, licensing | 40 / 28 / 18 / 14 | None | None | Allocates a guess |
| A8 | Reclaimable compute share | 35% | None | None | The "immediate" figure |
| A9 | Dimension scale and weights | index +1; top-objective x1.5 | None | Low | Headline and bands |
| A10 | Unanswered dimension | 2.5 | None | Low | Flatters weak, penalises strong |
| A11 | Band cut-offs | 2.0 / 2.8 / 3.8 / 4.5 | None | Low | Label only |
| A12 | Sector peer medians | 72 values | None | None | Peer variance wrong |
| A13 | Track rule (hybrid if routing gap <= 2) | 2 | Test comment only | Low | 62% of clients on one track |
| A14 | Roadmap thresholds and phase windows | 3.0 to 4.2; 0-30 / 30-90 / 90-270 / 270-540+ days | None | Low | Which moves appear |
| A15 | Quality gate | 25% of maturity questions (page only) | None | Low | Sparse inputs produce a report |
| A16 | All amounts in US dollars | US$ | None | Low | Global clients |

**16 assumptions; 16 have no stated ground. None rests on a published source with year and sample; none appears on any report page.**

### 6.4 Inflation check

| Test | Result |
|---|---|
| Is the value a range with confidence? | A range, but fixed x0.8 / x1.25 with no confidence label |
| Is the expected case conservative? | No: the point estimate is 13.8% to 38.2% of the assumed spend; the upper case reaches **47.8%**. The only published average I verified is 29% (Flexera 2026) |
| Net of implementation cost and phased over a ramp? | No: no cost, no ramp. "Reclaiming $2.13M ... in the first 90 days" (sample) is a year-one claim |
| Is each lever within the addressable spend and the published range? | No cap exists. Leakage is not limited to the in-scope public cloud spend or to a published lever range |
| Do levers double count? | The four parts are a fixed split of one total, so they reconcile to the total. The roadmap then restates two parts as "savings" ("Locks in $1,356k", "reclamation ~$678k"), and the sample adds "Trapped DC capacity $1.12M" which the engine does not produce. The same cloud waste is also computed by FinOps IQ (double figure) |
| Do totals reconcile? | Engine: yes (`cloud-iq.test.ts:132`). Sample: no (tile $1.85M + $1.20M versus breakdown $1.15M + $0.98M) |
| Is there a guard in CI? | No inflation cap guard. The existing test checks leakage ordered, below spend and decomposed |

Verdict: **inflated and unsupported.** The expected case is a self-reported guess multiplied by an unsourced factor, and the sample wraps it in guarantees.

### 6.5 Roadmap and action plan

Four fixed windows (0-30 days, 30-90 days, 3-9 months, 9-18+ months) with up to three or four moves each, each with a code, size S/M/L/XL, a description and an "impact" line. No workstream grouping, owner role, duration, dependencies, effort, milestone, KPI, prerequisite or risk. Moves are triggered by dimension thresholds, not traced to a stated finding. A delivery team could not start from it; a consultant would have to author the plan. The shipped sample adds sprints and named activities, but they are hand-written and not reproducible.

### 6.6 Presentation

Missing: situation, issue, recommendation and value summary; methodology; sources; assumptions; version and date of the method; "data provided by"; disclaimer (the text sits in the KB but is not shown); consistent structure. Language that reads as hype or salesmanship in the sample: "Guaranteed 3x ROI", "zero operational risk", "100% compliant", "Stop the Bleeding", "Three Irreversible Executive Bets", "REF GRADE: AAA", "Book with Our Advisory Team", "Partner with LTM to deploy". In the product: "Restricted Advisory Deliverable", "Unlock Complete Executive Transformation Pack", "elite Senior Partner" in the AI prompt, a "Boardroom" slide mode. Not a consulting deliverable yet.

### 6.7 CIO challenge test (the ten hardest questions)

| # | Question a CIO or CFO would ask | Answered from the report's pages? |
|---|---|---|
| 1 | "On what basis do you commit this $X of annual leakage?" | **No**: it is my own waste guess times a band midpoint; the page says "indicative" only |
| 2 | "Who is in the sector peer median you compare us with, and when was it measured?" | **No**: no source, year or sample |
| 3 | "Why is this not already done by AWS Migration Evaluator, Azure Migrate or Google Migration Center, and the Well-Architected reviews?" | **No**: no comparison or edge on any page |
| 4 | "Why is my estate with no public cloud being told to buy Savings Plans?" | **No**: no applicability routing |
| 5 | "What happens to your numbers if my waste estimate is 10 points off?" | **No**: no sensitivity; the figure moves linearly |
| 6 | "Who owns each move, by when, at what effort and cost?" | **No** |
| 7 | "What did our data touch? Did an AI see our name, spend and notes, and where is it kept?" | **No**: browser AI sends it to third parties; no notice |
| 8 | "Is your roadmap consistent with our regulator's requirements (DORA, our local rules)?" | **No**: the sovereign move follows a pre-ticked box; no jurisdiction logic; nothing sourced |
| 9 | "Which of these findings is the one decision I must take this quarter?" | **Partly**: the "binding constraint" tile names one cliff (VMware, lease or sovereignty) from three answers; it is a flag, not a decision with an owner and a date |
| 10 | "How confident are you and what would raise it?" | **No**: no confidence label; the quality gate counts answers, not evidence |

**Result: 0 answered, 1 partly, 9 not answered. Area 13: Fail.**

---

## 7. Data protection, AI and hosting

**What the page sends where (read from code; not observed on the network).**

| Flow | Destination | Data | Notes |
|---|---|---|---|
| Scoring | `POST /api/evaluate/cloud-iq` on the platform API (API Gateway in ap-south-1 per `customHttp.yml` and FRAMEWORK hosting decision; the handler is a Lambda behind `withAcceleratorAccess`) | Answers, `session.mode`. The page sends `{ answers, session: { mode } }` only (`:1778-1781`); client name is not sent | Good: minimal. The handler logs only the error object; I did not review log retention |
| Saved sessions | `/api/sessions?accelerator=cloud-iq` | The page snapshot: `SESSION` (client name, consultant lead, horizon, probe responses and notes, question notes, AI memo text, unlock flag) and all answers | Owner or Admin only; expires 90 days after the last save (`manage-session/handler.ts:23`). Cost IQ states 24 months |
| .ciq export | User's disk | Same snapshot as JSON, unencrypted, named after the client | Portable sensitive file |
| PDF archive | `/api/reports` (S3) | The PDF and metadata (track, score, spend, consultant) after a consent prompt | Consent exists; retention not stated |
| AI memo (OpenAI) | `https://api.openai.com/v1/chat/completions` from the browser | Client name or "Confidential Client", role, sector, track, horizon, estate size, spend, scores, flags, leakage, **probe responses and free-text notes** | Key from `localStorage` (`cloud_iq_openai_key`) or the key box |
| AI memo (Gemini) | `https://generativelanguage.googleapis.com/...:generateContent?key=<key>` | Same prompt | The key is in the URL, so it can appear in proxy and browser history logs |
| AI memo (Anthropic) | `https://api.anthropic.com/v1/messages` with `anthropic-dangerous-direct-browser-access: true` | Same prompt | Header is the vendor's explicit browser opt-in |
| Libraries | jsDelivr, cdnjs (Chart.js, jsPDF, jspdf-autotable); Google Fonts (fonts, platform-wide) | No assessment data; page URL and IP to those hosts | No integrity attribute |

**Judgement.** A consultant's personal AI key entering client text into three US vendors from a browser is outside the platform's hosting, retention and transfer controls (S6). The vendors' guidance is that keys must not sit in client-side code: OpenAI tells developers to route requests through their own backend (S10). EU or UK personal or confidential data going to those vendors would also need a transfer basis, which counsel should settle (GDPR Chapter V; I did not fetch the regulation text in this review, so I make no article-level statement).

**Hosting.** The framework decision keeps hosting in AWS Mumbai (ap-south-1), so EU and UK client data is transferred to India with no adequacy decision; S6 covers the basis. Cloud IQ has no data notice of its own, and it is on a development preview in a personal AWS account per the other plans (carried, not re-verified).

**Retention.** Saved sessions: 90 days. Reports archive: not stated. Cost IQ: 24 months. Needs one owner decision (D7).

**Recommendation.** Remove all browser AI (CL1), then add the shared Bedrock narrative off by default, fed only by engine outputs, with the grounding check (CL8). Reuse Cost IQ's built pattern (`cost-iq-narrative`, `ai/grounding.ts`).

---

## 8. Tests and engine probes

| Check | Result |
|---|---|
| `npx vitest run` | 51 files, **1,301 tests pass** |
| `packages/engine-core/test/cloud-iq.test.ts` | 26 tests pass: contract, golden master (`golden/cloud-iq.json`), 500 random invariants, regressions |
| `npm run audit:engines` (Cloud IQ section) | Overall maturity 1.75 to 3.99 over 800 random questionnaires (scale 1 to 5, none out of range); leakage $24k to $57.3M (unbounded scale); peer delta -1.55 to 1.29. Bands: Nascent 0.5%, Emerging 37.8%, Established 60.8%, Advanced 1.0%, Leading 0.0%. Sensitivity: Q4.1 and Q9.1 move overall by 0.71 (share of range 0.32); leakage: Q0.8 moves it by $57.1M (share 1.00), Q4.3 by $45.8M. Dead (headline-only): 13 questions (list in the scorecard, area 5). Missing data: -0.04 mean shift, +0.04 worst profile |
| `npx playwright test tests/e2e/cloud-iq.spec.ts` | 2 passed: scored result without gaps; scoring failure shows an error and computes nothing locally |
| My probes | (a) empty questionnaire returns 2.5 and $3,438,000 leakage; (b) D1 and D2 worst, six dimensions blank: 2.15 "Emerging"; (c) D3 maturity 5 with "don't know" waste at $20-50M and 80%+ commitment: $6.25M leakage, upper 22.3% of spend; (d) Q4.3 ">35%" with commitment unknown: 38.2% point, 47.8% upper; (e) 2,000 random questionnaires: Hybrid 62%, A 24%, B 14%; leakage 4.8% to 38.2% of spend |
| Not run | Accessibility, keyboard, layout at 360/768/1280/1920, console, jsPDF output, network capture. Marked NOT CHECKED, not Pass |

---

## 9. Distinctness

**Decision it informs (proposed, for the owner to accept):** "Where should each class of our workloads run (public cloud, sovereign or private cloud, on-premises) over the next 24 to 36 months, what must be true first (landing zone, platform, skills, data centre and licence deadlines), and in what order do we move?" Buyer: CIO, with the CTO and CFO. It is a decision that no provider tool makes neutrally.

| Alternative | What it gives | Cloud IQ edge (to be built; not true today) |
|---|---|---|
| AWS Well-Architected Framework and Tool | Six pillars (operational excellence, security, reliability, performance efficiency, cost optimization, sustainability) for a workload review in AWS | A multi-cloud and on-premises placement view before any one provider's workload review; not a review of one workload |
| AWS Cloud Adoption Framework | Six perspectives (Business, People, Governance, Platform, Security, Operations) to assess cloud readiness | A short, consultant-led readiness read mapped to those perspectives, with the placement decision on top |
| Microsoft Cloud Adoption Framework (updated 27 Oct 2026) | Seven adoption phases (Strategy, Plan, Ready, Adopt, Govern, Secure, Manage) plus scenarios including Sovereignty and Azure VMware Solution | Neutral between clouds; covers hybrid and exit paths that favour no one |
| Google Cloud Well-Architected Framework | Six pillars (adds privacy and compliance to security; "performance optimization") | As above |
| Azure Migrate (free service per Microsoft) | Discovery, assessment, business case (TCO on-premises versus Azure), dependency analysis, execution | It assesses and plans a move to Azure only. Cloud IQ decides whether and where to move before a provider tool is chosen, and routes to the tools as evidence |
| AWS Migration Evaluator; Google Cloud Migration Center | Business case and cost estimates for a move to that provider (Google's documentation lists TCO reports and a five-year cost view; AWS lists a business case with projected costs). Whether each is free: not stated on the AWS page; Google's page not retrievable (search summary only) | Same: provider-specific; used as evidence |
| FinOps Foundation Framework | Cloud cost management capabilities and maturity | Cost depth belongs to FinOps IQ; Cloud IQ must not duplicate it |
| Analyst maturity models | Peer maturity comparisons | Not offered. Cloud IQ must not present peer data it does not have (C2) |

**The edge is not written on the page today, and it is only true once** (i) the placement question is explicit, (ii) cost and sovereignty depth are handed off, (iii) the execution content per platform exists, and (iv) the report has a basis for every number.

**Unverified:** analyst offerings (for example Gartner or Forrester cloud placement or readiness assessments) were not searched; I make no statement about them.

---

## 10. Decisions for the owner

Each with options and my recommended default. They are advice; the owner decides.

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | Purpose, buyer and edge | (a) Placement and cloud-readiness diagnostic, with D3 and D6 reduced to screens that hand off; (b) keep today's broad scope and import other results; (c) merge with Modernization IQ | (a). It is the only reading that is not already free elsewhere and removes the FinOps IQ duplication. Buyer: CIO with CTO and CFO. Decision wording in section 9 |
| D2 | Boundary with Modernization IQ (DC exit, 6 R's) | (a) Cloud IQ keeps the placement view and a 4-question footprint screen; Modernization IQ owns exit velocity, capacity and dispositions; (b) merge the two; (c) leave | (a) now, to be confirmed in the Modernization IQ review. Do not resolve by deleting questions until that review has read its own bank |
| D3 | The leakage figure | (a) Remove; import FinOps IQ's line or "Not quantified. Run FinOps IQ"; (b) keep with caps and ranges; (c) keep as is | (a). (b) would be a second figure, which the one-figure rule forbids. (c) fails area 13 |
| D4 | Sector peer benchmarks | (a) Remove; (b) keep but label "LTM illustration, not data"; (c) source a published dataset | (a) now; (c) only if a published source with method and sample is found |
| D5 | Browser AI | (a) Remove all of it now, narrative later on Bedrock (S1); (b) wait for S1 | (a). The framework already decided this; waiting leaves client data going to third parties |
| D6 | Sample report | (a) Withdraw now, regenerate from the engine on a reference client in CL5; (b) keep with promises removed; (c) keep | (a) |
| D7 | Unlock / lead-gen gate | (a) Remove (the tool is signed in); (b) keep for an external self-serve mode only, verified server-side | (a) |
| D8 | Retention | (a) 90 days as set by P3 for these accelerators; (b) 24 months as Cost IQ; (c) per engagement | Ask for the owner's rule; I recommend one rule for all accelerators, and the same notice |
| D9 | Question ladders | (a) Requirement-first (a level is higher when the control meets the client's stated requirement, not when it is more distributed); (b) keep | (a). A single-cloud or retained on-premises estate can be the right answer for a regulated or OT client |
| D10 | Migration framework | (a) Seven Rs as AWS Prescriptive Guidance, with attribution; (b) keep six | (a). Relocate matters for VMware estates; keep wording provider-neutral |
| D11 | Regulatory content | (a) Context question by market, no pre-selection, sovereignty depth to Sovereign IQ; (b) keep regimes in Cloud IQ | (a); counsel reviews any statement |
| D12 | Dimensions | (a) Keep D1 to D8 as LTM constructs, labelled, with a mapping to the AWS and Microsoft frameworks, and add People/skills and Business value coverage; (b) adopt a framework wholesale | (a) |
| D13 | Platform scope for the playbook | AWS, Azure, Google Cloud, on-premises (VMware, Nutanix, OpenShift) and sovereign or regional providers as options chosen from the client's requirements | All five groups, in this order of effort: on-premises and AWS first |

---

## 11. Sources (checked 5 Nov 2026 unless stated)

Primary or official unless marked.

- S1. AWS Prescriptive Guidance, "About the migration strategies" (seven Rs; page also says refactor is not recommended for large migrations): https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html
- S2. AWS Cloud Adoption Framework (six perspectives: Business, People, Governance, Platform, Security, Operations): https://aws.amazon.com/cloud-adoption-framework/
- S3. Flexera, 2026 State of the Cloud press release, 18 Mar 2026: 29% estimated wasted cloud spend, "more than 750 cloud decision-makers and users"; fielding date not stated on the page: https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows
- S4. AWS Well-Architected Framework, pillars (six): https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html
- S5. ANSSI SecNumCloud requirements, version 3.2 dated 8 March 2022 (title and date from a search result; the PDF itself was not opened): https://cyber.gouv.fr/uploads/2014/12/secnumcloud-referentiel-exigences-v3.2.pdf . Requirement counts differ between secondary sources (about 360 to 400): not used.
- S6. DORA, Regulation (EU) 2022/2554, Article 64: applies from 17 January 2025. The EUR-Lex pages (https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng and the CELEX URL) returned no content in the fetch tool, so the date rests on secondary pages found by search (for example https://iso-docs.com/blogs/dora-articles/article-64-entry-into-force-and-application-digital-operational-resilience-act-dora , https://www.cnb.cz/en/cnb-news/news/DORA-regulation-comes-into-effect). **Counsel to confirm against EUR-Lex.**
- S7. Microsoft Cloud Adoption Framework overview (phases and scenarios; page updated 27 Oct 2026): https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/overview
- S8. CISPE, action against the Commission's approval of Broadcom's VMware acquisition (allegations; Broadcom disputes them): https://www.cispe.cloud/?p=24784 (read through a search summary; page not opened)
- S9. FinOps Foundation, Rate Optimization capability (utilisation and return thresholds; no coverage target): https://www.finops.org/framework/capabilities/rate-optimization/
- S10. OpenAI, best practices for API key safety (keys must not be deployed in browser or mobile code; route through your own backend): https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety . The page returned 403 on direct fetch; wording is from a search summary of the help-centre article.
- S11. Google Cloud Well-Architected Framework (six pillars: operational excellence; security, privacy, and compliance; reliability; cost optimization; performance optimization; sustainability): https://docs.cloud.google.com/architecture/framework
- S12. Anthropic, model deprecations (`claude-3-5-sonnet-20241022` retired 28 Oct 2025): https://platform.claude.com/docs/en/about-claude/model-deprecations
- S13. Google AI developer forum, "Gemini 1.5 flash retirement date" (staff reply: Flash 001 on 27 May 2025, 002 and the alias on 24 Sep 2025). Not a primary documentation page; the Gemini API deprecations page returned 403: https://discuss.ai.google.dev/t/gemini-1-5-flash-retirement-date/83258
- S14. Microsoft Learn, "About Azure Migrate" ("Free service"; discovery, assessment, business case, dependency analysis; page dated 18 May 2026): https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview
- S15. AWS Migration Evaluator (business case, cost comparison; the page does not state whether it is free): https://aws.amazon.com/migration-evaluator/
- S16. Google Cloud Migration Center (TCO reports and a five-year cost estimate per its documentation; cost to use not verified; read through a search summary): https://docs.cloud.google.com/migration-center/docs/estimate/overview
- Repository (read 5 Nov 2026, commit `99e6d90`): `docs/cio-readiness/FRAMEWORK.md`, `PRACTICE_LEAD_METHOD.md`, `cost-iq/VALIDATION.md`, `cost-iq/PLAN.md`, `cost-iq/BOUNDARY.md`, `GLOBAL-COVERAGE.md`, `resilience-iq/VALIDATION.md` (M5, D12), `sovereign-iq/PLAN.md` (gate S1), `finops-iq/PLAN.md`; `customHttp.yml`; `amplify/functions/manage-session/handler.ts`; `docs/claims-register/claims-inventory.csv`.

**Not verified (open):** EUR-Lex text of DORA; the ANSSI PDF content; whether Google Migration Center and AWS Migration Evaluator are free of charge; the current status of `gpt-4o`; NIS2, HIPAA, PCI-DSS, SOX, FedRAMP and RBI/SEBI names and scope; NIST SP 800-145 (not fetched, so no statement on the page's private-cloud grouping is made beyond observing the list mixes categories); analyst alternatives; Amplify console rewrites; any behaviour that needs a real AWS account (Bedrock, Cognito, retention sweep, S3 archive).
