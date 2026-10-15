# Phase 3: scoring model audit and recalibration

**Status:** automated audit and engine fixes are done. The expert review (3.2) and the decisions in the last section are with the practice and legal leads.

**Scope:** the six in-scope accelerators: FinOps Value Case, Strategy IQ, Cloud IQ, FinOps IQ, Posture IQ and Sovereign IQ. Cost IQ and Resilience IQ are out of scope.

## How the audit works

`npm run audit:engines` (`packages/engine-core/audit/`) puts 800 seeded random questionnaires through each engine. For each headline it measures:
- the range;
- which bands are reached;
- the most one answer can move it;
- questions that change nothing;
- which way it moves when answers are left blank.

It writes the full numbers to `AUTOMATED_AUDIT.md` and `audit-summary.json` in this folder.

Each fix has a regression test that fails on the old code. Golden outputs were regenerated, so each golden-file diff in this PR shows how a demo client's result changed.

**Checks after the fixes:**
- Engine tests: 243 passed.
- Typecheck passed.
- Browser tests: 53 passed.
- Backend synth checks passed.

## Before and after

| Engine | Before | After |
|---|---|---|
| **FinOps IQ** | 100% of random questionnaires were "Below Stage 1". A single "Not applicable" blocked a stage forever. Value at stake was a fixed $3.5M for every client | "Not applicable" is excluded from scores and passes its gate. Value at stake uses the client's own waste estimate ($0.4M–$3.5M). "Mostly in place" everywhere now reaches Informed/Walk; it was below Stage 1 before (see lead items) |
| **Strategy IQ** | "Advanced" band never reached. Blank answers counted as a flattering 3.0 (worst profile +1.0). Percentages started at 20%, not 0% | Blank answers excluded: the worst profile no longer gains (+1.0 → 0). Indices run 0–100%. Every band is now reachable: the best answers give "Leading", and random answers reach "Advanced" |
| **Cloud IQ** | Peer median was always 3.0. Q8.2 (sovereignty) was scored as maturity. Blank industry meant BFSI | Real sector benchmark. Q8.2 is a sovereignty flag only. Blank industry falls back to Other. Peer-delta missing-data bias fell from −0.13 to −0.04 |
| **Posture IQ** | The C2 matrix never produced a finding. Four of six dynamic probes could never fire. Scope answers (sector, entity type, AI use) were scored as maturity. Blank pillars defaulted to 55 | Matrix and all probes work. Scope answers set obligations, not the score. Blank pillars are excluded and coverage is shown. Score range widened from 42–81 to 35–82 |
| **Sovereign IQ** | The audit register used the wrong fact names. Answers were counted twice in pillars. Banking rules applied to every sector. Fines mixed currencies and turnover rules | One answer counts once. Regimes are filtered by sector, presence and provider. Fines use explicit exchange rates. The Australian figure is the AUD 50M amount only. A maturity stage needs at least 3 assessed pillars |
| **FinOps Value Case** | The report crashed on any "don't know" answer. Missing visibility data meant the worst (30–40%) waste band. The three-year projection was uncapped | Blind spots render. Waste is "Not assessed" without data. Growth is capped at −25% to +60% a year and the cap is stated |

Questions the audit lists as "dead" grew in Posture IQ (4 → 11), Cloud IQ (+Q8.2) and Sovereign IQ (+Q3.1). This is intended: those questions now set scope or obligations, which the audit's headline numbers do not capture.

## Fixes by engine

### FinOps IQ
- "Not applicable" counts as answered. It is excluded from every score and from the roadmap, and a critical N/A passes its gate.
- Value at stake uses the client's own waste range (T6) when given and shows its basis.
- Foundational gates (Chaos, Informed) need 65 ("mostly in place"). The missing checkpoint chk-o5 was added.
- Domains with no answers show "Not assessed", not 0. Coverage is shown.
- Gate blockers include unanswered critical gates, listed separately.
- The roadmap ranks known gaps first.
- Page labels:
  - "Normalized Benchmark" removed.
  - Checkpoints marked as self-reported.
  - Null checks replace `|| "—"`.

### Strategy IQ
- Unanswered questions are excluded from section averages. `completeness` and `sectionAnswered` were added.
- Multi-selects have "None of these are in place". Sliders and ratings count only when touched.
- Alignment and resilience are (score − 1) ÷ 4 × 100.
- Tech-debt drag:
  - The 8% floor is removed and the 45% cap kept.
  - It is labelled "Indicative tech-debt drag (LTM heuristic)".
  - The 38/28/20/14 split is labelled illustrative.
- The peer-benchmark claims are removed and the radar series is labelled an illustrative target. Brief sentences depend on the scores behind them.

### Cloud IQ
- The full sector benchmark drives peer bars and the radar.
- The D8 urgency rule now escalates (it did nothing before).
- Hybrid routing applies when the tracks are within 2 points.
- The commitment share of leakage scales with uncovered spend.
- Recommended moves need an assessed dimension. Blank answers match "Don't know".
- Memo sentences depend on the flags behind them. "Estimated annual cost leakage (indicative)". Unsourced multiples ("5x", "+40%") removed.

### Posture IQ
- C2 matrix findings are looked up by column.
- Probe triggers map to real options, through one condition table shared by the engine and the page.
- Scope answers (A1, A2, B1, B2, G1) produce info-level obligations.
- Outcome questions K1–K3 feed no pillar.
- Unassessed pillars are excluded and the weights renormalised. `coverage` and `lowConfidence` were added.
- Findings for regulations not in scope are dropped.
- GDPR wording:
  - It cites Art. 83(4)(a) and 83(5).
  - A UK-only organisation gets UK GDPR in GBP.
- AI Act:
  - The card appears only when the AI Act is in scope.
  - High-risk AI with no gap shows "High-Risk Obligations Apply".
- One severity-to-score table for every question type. Findings are de-duplicated.

### Sovereign IQ
- The audit register uses real fact names and in-scope regimes. It shows "Not assessed" when an answer is missing. DORA Art. 28(1) is always "Not assessed", because no question covers it.
- Each answer counts once in pillars. Holding national-security data no longer lowers P1.
- Unanswered pillars are excluded.
- Scope:
  - MAS TRM, APRA CPS 230, SAMA and CBUAE need BFSI. DESC also covers the public sector.
  - DORA needs EU presence.
  - CLOUD Act and FISA 702 apply only to a US-headquartered provider.
- Exposure:
  - EU and UK GDPR are separate.
  - Explicit EUR, GBP, AUD, INR and SAR rates.
  - India DPDP is INR 250 crore. DORA penalty text is corrected.
  - Assumed turnover is flagged on the page.
  - The Australian Privacy Act is quantified at AUD 50M only. Its 30%-of-Australian-turnover limb needs data we do not collect, so the label says it is not quantified.
- No maturity stage unless at least 3 of the 6 pillars are assessed. The page shows "Not assessed".

### FinOps Value Case
- The report reads blind spots as `{ questionId, text }` and no longer crashes.
- Waste is "Not assessed" when nothing feeds visibility or control.
- Three-year growth is capped at −25% to +60% a year and the page states the cap. Non-numeric growth uses the default rate.
- Stream value scales with each stream's gap.
- "dk" is a blind spot.
- Confidence counts only known answers: "Reasonable" needs 70% answered and fewer than 3 blind spots.
- O2 splits are scaled to 100.

### Shared
- The engine package exports both default-turnover constants explicitly (`POSTURE_DEFAULT_TURNOVER_USD` and `SOVEREIGN_DEFAULT_TURNOVER_USD`). Before, the two engines' constants clashed and TypeScript silently dropped them from the package export.

## Decisions for the practice and legal leads

Each item has a default already in the code. A lead can confirm the default or change it through the golden-file diff.

| # | Engine | Question | Default applied |
|---|---|---|---|
| 1 | All | Review this PR's golden-file diffs for each demo client | — |
| 2 | FinOps Value Case | **Urgency only adds the drivers the client reports.** Leaving the driver questions (E4–E6, P1, P2) blank lowers urgency: by 10 points on average, and by up to 48 for a weak, fast-growing client. Should a blank driver count at the sector median instead? | Unchanged. The confidence label reflects the unanswered questions |
| 3 | FinOps IQ | Should "partly in place" on every question still be below Crawl? Gate minimums are 65 for Chaos and Informed. Random answers still land below Stage 1 98% of the time, because almost every random set has a "not in place" on a critical gate. Optimized and Automated are reached only by mixed profiles | 65 (mostly in place) |
| 4 | FinOps IQ | Could clients overuse "Not applicable" to pass gates? | N/A passes its gate. Counts are shown |
| 5 | FinOps IQ | Value at stake from the client's own T6 waste range, otherwise the stage table | T6 first |
| 6 | FinOps Value Case | Growth cap of −25% to +60% a year. Confidence thresholds (70% answered, fewer than 3 blind spots) | As stated |
| 7 | Strategy IQ | Tech-debt drag formula (section score to % of IT spend, 45% cap) and the brief's cut-off at 3.0 | Kept, labelled as a heuristic |
| 8 | Strategy IQ | An empty section still shows 3.0 | Kept. Completeness is shown |
| 9 | Cloud IQ | Hybrid when the tracks are within 2 points. Waste and leakage rates need a source | As stated |
| 10 | Cloud IQ / Posture IQ | Option order assumptions in Q7.1, Q2.2 and L1. Scope question families | As implemented |
| 11 | Sovereign IQ | Sources and dates for the exchange rates | Fixed rates in code |
| 12 | Sovereign IQ | The combined Japan/Hong Kong option. The SME "whichever is lower" rule. DESC for the public sector | As implemented |
| 13 | Sovereign IQ | Australian Privacy Act: collect Australian turnover to quantify the 30% limb? | AUD 50M only, stated on the page |
| 14 | Posture IQ / Sovereign IQ | The default turnover differs: Posture IQ assumes $250M and Sovereign IQ $3B when none is given. Align them? | Unchanged. Both flag the assumption |
| 15 | Posture IQ | Severity-to-score table (100/75/50/25/0) and pillar weights | Unchanged |

### Resolutions through FinOps IQ v3 (plan phase F5, 15 Oct 2026)

FinOps IQ v3 closes these items: it is one engine, with FinOps Value Case as its executive mode (D1). Each note names the v3 behaviour and the test that proves it. The tests are in `packages/engine-core/test/`, and all run in `npm test`. The legacy engines and their goldens are unchanged until they are retired after F12.

| # | Engine | Resolution |
|---|---|---|
| 1 | FinOps IQ, FinOps Value Case | **Closed for FinOps IQ on approval of the F5 golden diff.** v3 has approved goldens for nine reference scenarios (RS1 to RS5 from F1, RS6 to RS9 from published provider case studies) and three edge cases (`test/golden/finops-iq-v3.json`). The F5 diff is summarised for the practice lead and owner in `docs/cio-readiness/finops-iq/design/F5-notes.md` section 6. Each scenario is compared with expectations written before the engine ran. Tests: `finops-iq-v3.test.ts` "golden outputs (approved)"; `finops-iq-v3-audit.test.ts` "F5 reference scenarios against the expectations written first" |
| 2 | FinOps Value Case | **Closed.** The urgency drivers are now scope facts, not answers: tier, AI scope and growth. The hypothesis drivers (P2 and L3, now HY-03 and HY-05) are retired from scoring (D4). A blank maturity answer counts at the maximum gap, so it never lowers need. A blank or Unknown OP-06 keeps the value modifier's points (F5 fix, ASM-FIN-086). A "don't know" on growth adds no points and is listed as a blind spot; there is no sector median, as DESIGN 9 states (owner-approved). Tests: `finops-iq-v3-audit.test.ts` "FVC item 2" and "a blank or Unknown never scores better than any answered option"; `npm run audit:engines` gates the missing-data shift at 0 or below |
| 3 | FinOps IQ | **Closed.** v3 has no stages, gates or gate minimums. Each capability is rated Crawl, Walk or Run (plus Not yet and Unknown) against a tier target, by the weakest core answer, lowered by at most one level by a depth answer. Every rating and every need band is reachable. Tests: `finops-iq-v3-audit.test.ts` "every rating is reachable", "every need verdict band is reachable" and "FinOps IQ items 3 to 5"; `finops-iq-v3.test.ts` "removed v2 behaviour stays removed" |
| 4 | FinOps IQ | **Closed.** No answer option means "not applicable". "Not in scope" comes only from scope facts and never from an answer (D5), so it cannot be used to pass anything. Tests: `finops-iq-v3-audit.test.ts` "N/A only from scope" and "no answer option anywhere means not applicable"; `finops-iq-v3.test.ts` "has no not applicable answer" |
| 5 | FinOps IQ | **Closed.** Value comes from the lever model (DESIGN 10): conservative, expected and upper ranges, net and phased, capped at 29% of P. The client's waste estimate (T6, now HY-01) is shown beside the range and is never an input (D4). Tests: `finops-iq-v3-audit.test.ts` "FinOps IQ items 3 to 5"; `finops-iq-v3-value.test.ts` "shows HY-01 beside the range ... and it changes no number" and the inflation guard |
| 6 | FinOps Value Case | **Closed.** The growth cap is gone with the growth projection: no growth is applied to value (ASM-FIN-051), and growth of 20% or more only adds urgency. Confidence is rule-based. The need verdict is Medium, or Low with any unanswered or Unknown question. Value confidence comes from the kind of input per lever (DESIGN 10.7, never above Medium in executive mode). Tests: `finops-iq-v3-audit.test.ts` "FVC item 6"; `finops-iq-v3-value.test.ts` model rules |

FinOps IQ v3 is also the first engine with **the audit as a CI gate** (see "Not done in this phase"). Its thresholds cover:
- range;
- every band reached;
- no dead question except the hypothesis questions;
- missing data never flatters;
- a single-answer limit.

They are enforced by `npm run audit:engines` and by `finops-iq-v3-audit.test.ts`, as set out in `docs/cio-readiness/finops-iq/design/F5-notes.md`.

## Not done in this phase

- **Expert review and back-testing (3.2).** These need the practice leads and 5–10 anonymised past engagements.
- **Report trace audit (3.3)** for the PDF, deck, SOW and AI briefing beyond the screens covered by the browser tests. Moves to Phase 4 together with the fact-check.
- **The audit as a CI gate.** The audit runs on demand. Thresholds for failing CI should be set once leads confirm the defaults above. *Update 15 Oct 2026:* FinOps IQ v3 is now gated (FinOps IQ plan F5). The other engines are still reported only.
- **`public-schema.json` files** still carry Cloud IQ Q8.2's old dimension and Sovereign IQ's old hints. No code reads them at runtime; they will be refreshed in Phase 4.
