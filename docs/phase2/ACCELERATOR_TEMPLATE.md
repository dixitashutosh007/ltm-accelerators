# Phase 2 accelerator template

FinOps Value Case is the reference implementation. Every other accelerator follows the same pattern in its
wave: Cloud IQ and Strategy IQ next, then FinOps IQ, then Posture IQ and Sovereign IQ. Cost IQ and Resilience IQ are
maintained separately.

## The pattern

| Layer | Rule | FinOps Value Case files |
|---|---|---|
| Engine | All scoring lives in `packages/engine-core` and runs only on the server. The page ships questions without scoring weights. | `packages/engine-core/src/accelerators/finops-value-case/evaluate.ts` |
| Contract | One request validator, driven by the knowledge base, used by the Lambda and the tests. Bad input gets a 400 with readable reasons, never a 500. | `.../finops-value-case/contract.ts` |
| Lambda | Parse JSON (400 if invalid), validate with the contract, evaluate, return `{ ok, data }`. No internal details in errors. | `amplify/functions/evaluate-finops/handler.ts` |
| Page | Sends exactly the fields the engine reads. Results screens render only from a fresh server result. On failure, an error banner (`role="alert"`) appears and the user's answers are kept. No local or stale fallback. | `Accelerators/finops-value-case.html` (`fetchCloudEvaluation`, `render`) |
| Assets | Every font, image and script resolves. Fonts come from Google Fonts, which the CSP allows. | the browser tests' `missingFiles` check |

## Required tests

| Test | What it proves | Where |
|---|---|---|
| Contract | Any questionnaire the page can produce is accepted; malformed input is rejected with reasons; the page's question bank matches the engine's and carries no weights | `packages/engine-core/test/<tool>.test.ts` |
| Golden master | Approved outputs for each client archetype. A change to an output must be deliberate and reviewed | `packages/engine-core/test/golden/<tool>.json` |
| Invariants | Over 500 seeded random questionnaires: no NaN, Infinity or undefined; scores within 0–100; bands ordered and under published caps; money in the chosen currency; a more mature answer never makes the result look worse | same test file |
| Regressions | One test per bug fixed, failing on the old code | same test file |
| Browser | The full flow against the real engine: the request passes the contract, and the report contains no `undefined`, `NaN` or `null`. Scoring failure shows an error and no report | `tests/e2e/<tool>.spec.ts` |

Changing an approved output on purpose: `UPDATE_GOLDEN=1 npx vitest run <tool>`. The golden file diff then goes
to the subject-matter lead for review in the pull request.

## Checklist for the next accelerator

- [ ] Find what the page sends and what the engine reads; fix any mismatch, and add the contract.
- [ ] Remove any browser-side scoring and any silent fallback; add the error banner.
- [ ] Write the archetypes and generate the golden file; have the lead review it.
- [ ] Add the invariant suite. Look for `||` used on numeric scores, where a genuine 0 becomes a default.
- [ ] Add the browser spec. `pages.spec.ts` already fails on any missing same-site file.

## FinOps Value Case: what Phase 2 changed

| Bug | Effect on a report | Fix |
|---|---|---|
| The page sent `org.industry` and a top-level `currency`, but the engine reads `org.sector`, `org.sector_class` and `org.currency` | The BFSI waste uplift was never applied: a bank's waste band showed 30–40% instead of up to 45%. Roadmap savings were always in £ | The page sends the engine's fields; the contract maps the old payload; currency matching ignores case |
| `signals.x \|\| 50` | A client scoring a genuine 0 was treated as 50 in the roadmap | `?? 50`: only a missing signal is neutral |
| `[100,80,55,20,0][answer] \|\| 30` (also C5, V1) | The worst answer scored 25–30, better than the second-worst | Scores are read from the knowledge base, so the copy and the bug are gone |
| On scoring failure, the page still opened the checkpoint and report with placeholders, or with the previous result | A plausible-looking report could appear with made-up figures (a 20–30% "Evaluating" band) | No results screen without a fresh server result; error banner |
| 30 inlined `@font-face` rules pointed at placeholder file names | A 404 on every load; the headings fell back to a system font | Replaced with the Google Fonts stylesheet |

## Open questions for the FinOps lead (Phase 3)

- Approve the four golden outputs in `packages/engine-core/test/golden/finops-value-case.json`.
- Unanswered C3, C5 and V1 are assumed to be 30/100, and an unanswered signal counts as 50. Are these the right
  defaults, or should unanswered questions count as unknown (0)?
- "Don't know" on commitment coverage (C2) or forecast variance (P1) currently uses the default (20% and 15%), while
  "don't know" elsewhere scores 0. Should these be pessimistic as well?
- Waste bands, the BFSI factors and the 45% cap need a cited source (Phase 3 claims register).

## Strategy IQ (Wave 2): what Phase 2 changed

Before Phase 2 the page scored everything in the browser and never called the API. The server engine existed but
disagreed with the page in several places.

| Issue | Effect | Fix |
|---|---|---|
| Browser-only scoring | Scores could not be audited or protected, and the server engine had drifted | The page calls `/api/evaluate/strategy-iq`, renders only the server result, and shows an error otherwise. The browser engine and the in-page option scores are removed |
| The page stored a single-select answer as its score; the server read it as an option index | Switching to the server as it stood would have mis-scored every answer | Answers are option indexes (the contract); the demo archetypes are converted |
| The server scored multi-select questions as a flat 3.0 | Good practices in place counted for nothing | 1 + 0.8 per practice, capped at 5 (the rule the page used) |
| The server scored an unanswered slider with its raw default (e.g. 65 on a 1–5 scale) | One unanswered question could swamp a section | Defaults are normalised to the 1–5 scale |
| Ranking questions were scored as a fixed 3.2 | Extreme clients were pulled toward the middle: the demo tech company read 3.95 ("Established") and now reads 4.1 ("Advanced") | Rankings are left out of the score and still feed the narrative |
| "Operating Velocity Multiple" (section 2 score × 0.85, shown as "1.7x"), and "will unlock an estimated 1.7x acceleration in cycle times" | An invented multiple, presented as a forecast | Shown as what it is: operating-model maturity out of 5. The forecast sentence is rewritten to state only what was measured |

### Open questions for the strategy lead (Phase 3)

- Approve the golden outputs in `packages/engine-core/test/golden/strategy-iq.json`.
- S6.1 (what drives funding) could be scored by how high "quantified economic value" ranks. Should it be?
- Tech-debt drag = (5.2 − S4) × 8.5%, clamped to 8–45% of IT spend; alignment and resilience = section score ÷ 5. These
  formulas need a cited basis or a "heuristic" label.

## Cloud IQ (Wave 2): what Phase 2 changed

Before Phase 2 the page scored in the browser with `compute()` and never called the API.

- **Verified before switching.** The server engine was run against the page's browser engine on 300 random
  questionnaires covering every question type. Scores, track, dimensions, flags, leakage, urgency and roadmap phases
  1–2 were identical. Roadmap phases 3–4 and the recommended offerings differed: the server had a rewritten version
  that no client had seen. The server now uses the page's rules, so the switch changes no client's result.
- **One wording change.** The sovereign-cloud move's impact line "Fulfills ANSSI/DORA regulatory compliance" became
  "Supports SecNumCloud / DORA data-boundary requirements": one infrastructure move cannot make a client compliant.
- **The page now** posts to `/api/evaluate/cloud-iq`, caches the result for the report, boardroom and PDF views, and
  shows an error (no local fallback) if scoring fails.
- **Test data fix.** The shared sample answers gave two multi-select questions single values, which the page never
  sends. The contract caught it, including the per-question pick limit.

### Open questions for the cloud lead (Phase 3)

- Approve the golden outputs in `packages/engine-core/test/golden/cloud-iq.json`.
- Roadmap impact lines such as "Accelerates migration velocity by 40%", "Improves release cycle frequency by 5x" and
  "Averts 2.5x–3.5x licensing cost escalation" need a source or softer wording (Phase 3 claims register).
- The leakage model (waste rate × spend × (1 − 0.45 × commitment coverage), split 40/28/18/14) needs a cited basis.

## FinOps IQ (Wave 3): what Phase 2 changed

FinOps IQ already scored through the API. The fixes are in how the page used the result.

| Issue | Effect | Fix |
|---|---|---|
| Every option showed "undefined pts" | The page ships no scores (correctly), so the label was always broken | Label removed |
| The "Gate Blockers Outstanding" KPI and the AI briefing's blocker list used a local `qScore` that read the option position (0–4) as the score, then tested it against 70 | **Every answered critical question counted as a blocker**, however well answered | Blockers are the server's failing critical gates; the local scorer is removed |
| A stage that failed showed "2/3 critical minimums" but not which gate | Consultants had to hunt for the blocking question | The stage banner names each blocking gate and its score against the minimum |
| With no stage passed (maturity −1), the export and the AI prompt said "Stage 0 · Chaos / Crawl Baseline" | Contradicted the report's "Below Stage 1" | One label everywhere: "Below Stage 1 (no stage passed yet)" |
| On scoring failure, a previous result stayed on screen and no error appeared | Stale or placeholder results | The result is cleared before each call; an error banner appears; the report and checkpoint screens say results are unavailable |
| The page sent the whole `org` object, including consultant names, to the scoring API | Data the engine never uses left the browser | Only the client name and sector are sent |
| Checkpoint coverage judged critical questions against a flat 70, while stage gates use each stage's minimum (70–80) | Latent: no option scores between 70 and 80 today, but a Studio edit would have shown a checkpoint as "met" while its stage failed | Uses the stage's minimum |

### Open questions for the FinOps lead (Phase 3)

- Approve the golden outputs in `packages/engine-core/test/golden/finops-iq.json`.
- Value at stake: 25–35% of spend at stages 0–1, falling to 2–4% at stage 5. Cite the source (FinOps Foundation State of FinOps?).
- A domain with no answers shows 0 on the domain chart. Should it show "not assessed" instead?
