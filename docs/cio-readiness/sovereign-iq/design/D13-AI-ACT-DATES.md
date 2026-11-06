# D13: AI Act dates in the Sovereign IQ report

**Date:** 6 Nov 2026. **Author:** sovereignty-compliance-lead (agent). Advice only: the product owner approves, and counsel reviews before external use (not legal advice).

## What I found

The task assumed the Digital Omnibus was a proposal. **It is adopted law.** Regulation (EU) 2026/1744 was proposed by the Commission on 19 Nov 2025, agreed in trilogue on 7 May 2026, voted by Parliament on 16 Jun 2026 (423 for, 57 against, 174 abstentions), adopted by the Council on 29 Jun 2026, signed on 8 Jul 2026, published in the Official Journal on 24 Jul 2026 and in force on 27 Jul 2026 (Art. 4 of the amending Regulation: the third day after publication). So no date below is proposed; all are law.

| Applies from | Duty | Article (as amended) | On 6 Nov 2026 |
|---|---|---|---|
| 2 Feb 2025 | Prohibited practices (Art. 5) and AI literacy (Art. 4) | Art. 113, third para., point (a) | Applies |
| 2 Aug 2025 | Governance, GPAI model duties (Chapter V), penalty chapter except Art. 101 | Art. 113, third para., point (b) (unchanged) | Applies |
| 2 Aug 2026 | General application, incl. Art. 50 transparency; Art. 101 GPAI fines | Art. 113, second para. (unchanged) | Applies |
| 2 Dec 2026 | Art. 50(2) marking for generative systems on the market before 2 Aug 2026; new Art. 5(1)(ba), (bb), 5(1a), (1b) | Art. 111(4); Art. 113, third para., point (a) | **Later** |
| 2 Dec 2027 | High-risk, Annex III (Chapter III Sections 1-3) | Art. 113, third para., point (c)(i) | **Later** |
| 2 Aug 2028 | High-risk, Annex I products | Art. 113, third para., point (c)(ii) | **Later** |

Also found: Art. 4 was **replaced** (duty is now to "take measures to support" literacy, with no required level for any individual); legacy high-risk systems used by public authorities have until 2 Aug 2030 (Art. 111(2)); Art. 99(4)(da) was added and Art. 99(6a) caps fines for small mid-caps. Caps in Art. 99(3)-(5) are unchanged (EUR 35m/7%, EUR 15m/3%, EUR 7.5m/1%); Art. 101: EUR 15m/3%.

**Consequence for the report.** The EUR 96m figure in ARC1 (3% of EUR 3.2bn) is the Art. 99(4) ceiling. For a deployer of high-risk systems the duties behind that ceiling (Art. 16, Art. 26) cannot be enforced before 2 Dec 2027 or 2 Aug 2028. Only Art. 50 duties under that tier bind today. The report now says so.

## Sources (all read 6 Nov 2026)

- Regulation (EU) 2026/1744, OJ L, 24.7.2026, full text: https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng (Art. 1 points 20, 38, 39, 40; Art. 4).
- Regulation (EU) 2024/1689, original text, Art. 99, 101, 113: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng
- Commission AI Act policy page (last update 19 Oct 2026; states the Omnibus "entered into force on 27 July 2026"): https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- Parliament Legislative Train (procedure 2025/0359(COD), vote and Council dates): https://www.europarl.europa.eu/legislative-train/package-digital-package/file-digital-omnibus-on-ai
- Note: EUR-Lex did not render for earlier checks in this environment; it did on 6 Nov through direct download, so CLM-SOV-047 to 053 are now verified (V) against the primary text instead of S.

## What changed

- `registry/regimes.json`, EU_AI_ACT: `statusAsOf` 2026-11-06; new `phaseIn` (six dated lines with article and claim IDs) and `phaseInNote` (adopted law, not a proposal; the cap is a ceiling reaching only duties that already apply).
- `claims-register.json`: CLM-SOV-047 to 053 re-read and raised S to V (checkedOn 6 Nov 2026; wording corrected: 048 now carries the Art. 5 exception, 051 cites the replaced point (c)); new CLM-SOV-272 (Omnibus status and dates) and CLM-SOV-273 (Art. 4 as replaced). Volatile reviews within 90 days (latest 12 Jan 2027; 050 and 053 on 4 Dec 2026, after the 2 Dec date).
- `v4/evaluate.ts`: a regime's `phaseIn` is passed to the result, each line marked `applies` or `later` against the assessment date.
- `v4/report.ts` (exposure section, after "Regulations in scope", both editions): heading "AI Act: what applies on <date> and what applies later", the note, and a table with "Applies today (law)" / "Applies later (law, not yet in force)".
- Test: `sovereign-iq-v4-report.test.ts`, "D13" (both editions show the six dates, both labels, the law-not-proposal sentence, the ceiling sentence, and the engine's split).
- `scripts/check-claims.cjs` passes. Sovereign vitest files (458 tests) and `sovereign-iq-v4.spec.ts` (9) pass. No Sovereign IQ golden file exists in the repository; none changed.

## Still uncertain

- Counsel has not reviewed any of this (area 9). Whether Art. 5(1)(ba)/(bb) reach the client's systems is a legal question.
- The Parliament vote and Council adoption dates come from the Legislative Train, not the Official Journal (the Regulation's preamble cites them only indirectly). Treat as V on the dates in the Journal (signing, publication, entry into force) and secondary on the vote counts, which are not printed in the report.
- No further amendment of these dates was found as of 6 Nov 2026; absence of a proposal is not proven. Re-check by 12 Jan 2027, and move the 2 Dec 2026 lines to "applies" after that date (CLM-SOV-050, 053).
- The Commission has issued, and may still issue, guidelines (Art. 50, Art. 6) and a code of practice on marking; these are not read here.
- Other regimes' `dates` (Data Act, CRA, DPDP) are not yet printed; the same `phaseIn` field can carry them.
