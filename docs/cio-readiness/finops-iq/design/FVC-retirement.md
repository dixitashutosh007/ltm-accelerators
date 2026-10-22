# FinOps Value Case: retirement and feature parity

Owner instruction (22 Oct 2026): retire FinOps Value Case entirely, with its home-screen tile and every other reference, only once FinOps IQ has taken over every feature it had. FinOps IQ's executive mode replaces it (PLAN D1, option C; M8).

## Owner decisions (22 Oct 2026)

- Carry over: client logo on the report, archive to Reports, teaser mode. Not carried: export results as JSON.
- Drop the placeholder features that never worked (below).
- FinOps Value Case permission grants full FinOps IQ access (both modes), in the page guard, the portal and the reports service.

## Parity, feature by feature

| FinOps Value Case feature | FinOps IQ | Evidence |
|---|---|---|
| 29 questions (estate, visibility, predictability, ownership, control, levers, context) | Every one mapped to a v3 question or retired with a recorded reason | DESIGN.md section 8.2; `finops-iq-v3.test.ts` "keeps every legacy question" |
| Executive questionnaire, about 15 minutes | Executive mode: 18 questions, 15–20 minutes | `question-bank.json` executiveSet |
| Yes / No / "We don't know" answers | Every question has "Don't know"; unanswered and "Don't know" never raise a value | engine audit invariants |
| Organisation name, sector, scope notes | Start screen (client, sector); estate questions; consultant notes | journey test |
| Client logo on the report | Logo upload beside the client name; on the PDF cover | e2e "carried over from FinOps Value Case"; report test |
| Server scoring | Server scoring (v3 engine) | handler specs |
| Need index, urgency, confidence, verdict | Need verdict: need index 0–100, band, basis, confidence | "Do you need to act now?" panel; RS5 report |
| Blind spots ("We don't know" list) | Blind spots on the need verdict panel; unconfirmed findings; "Don't know" list in the report | results page; methodology |
| Value at stake, 3-year exposure with growth | Indicative value range (conservative, expected, upper), net of effort, by year, with spend growth | value section; Appendix A |
| Diagnostic signal breakdown | Capability profile against targets | results page; report section 2 |
| Optimisation streams and stream backlog | Levers, findings, workstreams; backlog CSV | report sections 3–5; CSV |
| 90-day execution roadmap | Roadmap by workstream with per-level milestones from month 0 | report section 5 |
| Recommended services, engagement model | How LTM can help (typed offerings); consultant SOW draft | report; M5 |
| Basis and sources | Methodology and sources, claims register, assumption register | report appendices |
| Teaser mode (consultant unlock) | Teaser toggle in client view; held-back sections are not rendered | e2e "carried over…" |
| Report generation animation and intro splash | LTM working screen while scoring and building the report | e2e journey |
| Download PDF | Server-rendered PDF, client and consultant editions | e2e journey |
| Archive report to the portal's Reports | Archive to Reports (server-built PDF, either edition) | e2e "carried over…"; reports-service test |
| Respondent notes | Consultant notes (never in the client view or edition) | e2e client view test |
| Question bank view (admin) | The question set is published as `questions.json` with each question's basis; the methodology names its sources | `npm run build:finops-iq-questions` |

## Not carried, with reasons

| Feature | Why |
|---|---|
| "Book Advisory Readout Session" | Did nothing: its contact widget was not loaded on the page. "How LTM can help" and the SOW draft cover the next step |
| Case studies (3) | Placeholders with no files; titles made unsourced claims ("saved 30%"). Owner: drop |
| Brochure download | Placeholder with no file. Owner: drop |
| Export results (JSON) | Owner: not needed; the backlog CSV and the PDF carry the result |
| Import instrument (JSON) and Studio editing | Scoring now runs on the server from the reviewed knowledge base, so a question bank edited in the browser changed nothing that counted |
| Respondent name, role, email and date on the report | FinOps IQ keeps no personal details about client staff (M6 data notice: "The assessment needs no personal details about individuals"). The report shows the client organisation, the consultant and the assessment date. Can be added if the owner wants it, with the notice updated |
| LTM logo upload | The LTM logo is fixed in the report and the page |

## What was removed

- The page (`/finops-value-case` now redirects to FinOps IQ in executive mode), the home-screen tile, its Reports filter and its Access Control rows.
- The engine (`finops-value-case/`), its API route and Lambda (`evaluate-finops`), its tests and golden file, the legacy standalone `packages/web-app`, its Studio entry and the family links on other accelerator pages.
- No archived reports existed under `reports/finops-value-case/` in the reports bucket (checked 22 Oct 2026), so none were lost.
- Existing FinOps Value Case permissions keep working: they now open FinOps IQ.
