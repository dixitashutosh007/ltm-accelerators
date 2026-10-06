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
