# Cost IQ scoring proposal, batch 3, and global-coverage context questions (CQ3b)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Machine-readable:** [scoring-batch-3.json](scoring-batch-3.json) (17 objects, array, same shape as batch 2) and [global-questions.json](global-questions.json) (an object: `questions` holds the five new questions; the other keys hold the CORE-02 options, the CORE-03 and CORE-04 rewrite, the band tables and the assumptions). Every map key, trigger option and gate option was checked against the master (and CTX-05 for the Geography gate); maps were checked as monotonic in option order. No code or master file was changed. Conventions as in [batch 1](scoring-batch-1.md) and [batch 2](scoring-batch-2.md).

## Job A: verdicts for ADP-44 to ADP-60

| ID | Verdict | Dim | Map or label | Gate | Basis |
|---|---|---|---|---|---|
| ADP-44 | Score | COST-07 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic; FinOps Intersecting Disciplines (order only) |
| ADP-45 | Score | COST-09 | 100/80/60/40/20 (no Unknown option) | none | LTM heuristic |
| ADP-46 | Score | COST-09 | slider, `invert-0-100` | none | LTM heuristic; overlaps CORE-40 |
| ADP-47 | Score | COST-07 | 100/80/60/40/20 (no Unknown option) | none | FinOps Intersecting Disciplines (order); map LTM heuristic |
| ADP-48 | Score | COST-07 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic |
| ADP-49 | Score | VALUE-02 | 100/80/60/40/20; F-020 (existing) | optional N/A option | LTM heuristic |
| ADP-50 | Score | COST-10 | slider, `invert-0-100`; F-020 (existing, gt 20) | optional, on ADP-49 | LTM heuristic; 20 percent UNSOURCED |
| ADP-51 | Score | COST-01 | 100/80/40/20, UNKNOWN 20 | CTX-05 (new) | LTM heuristic |
| ADP-52 | Score | COST-08 | 100/80/60/40/20 (no Unknown option) | CTX-05 (new) | LTM heuristic |
| ADP-53 | Context | none | hypothesis-signal: value-measurement gaps | none | LTM heuristic |
| ADP-54 | Score | VALUE-06 | 100/80/60/40/20 (no Unknown option) | none | LTM heuristic |
| ADP-55 | Context | none | hypothesis-signal: cost-opportunity hypothesis | none | LTM heuristic |
| ADP-56 | Context | none | constraint-signal: savings barriers | none | LTM heuristic |
| ADP-57 | Context | none | constraint-signal: protected capabilities; label fixes | none | LTM heuristic |
| ADP-58 | Drop | none | duplicates CORE-45 and ADP-55 | n/a | LTM judgement |
| ADP-59 | Score | COST-08 | 100/80/60/40/20 (no Unknown option) | none | LTM heuristic |
| ADP-60 | Score | COST-08 | 100/80/60/40/20, UNKNOWN 20 | none | LTM heuristic |

Counts: **12 score, 4 context, 0 rewrite, 1 drop.** All 17 leave the inert list once applied (ADP-58 is removed from the bank). State if all is applied: 94 questions, 63 score, 31 context, none inert; with the five CTX questions, 99 questions and 36 context.

Dimension effect: COST-07 8 scored questions, COST-01 6, VALUE-02 6, COST-08 5, COST-10 5, COST-09 4, VALUE-06 2 (CORE-43 and ADP-54). **VALUE-01 still has none and COST-03 has one (ADP-42).** ADP-51 and ADP-52 count only for a multi-country client.

**Map conventions kept:** 100/80/60/40/20 in option order, UNKNOWN or the worst option at 20, sliders inverted with floor 0, `MIXED` mid-scale by position. ADP-51 has four options, so 100/80/40/20 (explained in the JSON). Nothing in this batch uses country, sector or currency to adjust a score.

## Needs the owner

| ID | Why |
|---|---|
| ADP-49, ADP-50 | A client with no acquisition or divestiture who selects the M&A area can only answer NONE (20) and raises F-020, or leaves the slider at 0 and scores 100. Proposed: a NOT_APPLICABLE option on ADP-49 (unscored), a gate on ADP-50, and the same gate on the two F-020 triggers. Also confirm the 20 percent threshold (LTM heuristic, UNSOURCED) |
| ADP-51, ADP-52 | They need a gate. Master rule TR-30 says they apply to a multi-country operation, but no question sets that trigger. Proposed gate: the new CTX-05 (below). Without it, a single-country client answers LOW and scores 100 |
| ADP-47 | LATE is rated above RENEWAL by option order; a tie at 50 is as defensible |
| ADP-55 | Overlaps CORE-09; `hypothesisComparison` reads CORE-09 only, so ADP-55 has no consumer unless pointed at it. Default: keep and add it |
| ADP-57 | Option labels are title-cased identifiers ('Data Ai', 'Business Critical Apps'); proposed wording in the JSON, IDs unchanged |
| ADP-58 | Drop removes a question a client sees; the alternative (keep as context with fixed labels) is in the JSON |

Optional, none blocking: add an Unknown option to ADP-45, 47, 49, 52, 54 and 59 (they have none; their worst option is the lowest level meanwhile).

## Finding reachability (F-001 to F-020)

I checked every trigger in `finding-activation-calibration-v7.1.1.json` against the master: the question exists, every trigger option is a real option ID, the question is in the baseline or in a focus area a client can select, and any `applicableWhen` can be satisfied. **All 20 findings have at least one reachable trigger; none is unreachable.** The check is structural (I ran no answer sets).

Fed by this batch: ADP-49 and ADP-50 feed F-020 (both already in the calibration file). No other question here feeds a finding. Two triggers are possible and **not proposed**, because both findings are already reachable and any single hit fires a high-severity finding: F-012 from ADP-46, F-011 from ADP-48 LOCAL.

Findings that need an opt-in focus area (the default run is Cloud Economics plus Cost Governance), not the default run:

| Finding | Needs area |
|---|---|
| F-008 | SaaS and Licensing |
| F-009, F-016 | Infrastructure |
| F-010 | Workforce or Vendors and Commercials |
| F-012 | Applications or Architecture and Technical Debt |
| F-014, F-018 (CORE-44 trigger; CORE-20 is baseline) | Technology Value |
| F-017 | Business-led IT (ADP-33, 34); SaaS and Licensing (ADP-08) |
| F-019 | AI and Emerging Technology, and AI in the CORE-01 footprint |
| F-020 | M&A |

F-001 to F-004, F-015 are baseline. F-005, F-006, F-007, F-011, F-013 are reachable in the default run (F-005 and F-006 need PUBLIC_CLOUD in the footprint).

## Job B: new context questions (all signal-only, scoring effect none)

All sit in Enterprise Context (shown to every client). Suggested order: CORE-01, CORE-02, CTX-01, CORE-03, CORE-04, CTX-02, CTX-03, CTX-05, CTX-04, CORE-05, CORE-06. That section grows from 6 to 11 questions, but only CTX-01 and CTX-03 are required.

| ID | Question | Options | Req. | Feeds | Replaces or complements | Basis |
|---|---|---|---|---|---|---|
| CTX-01 | In which currency does the organisation report its technology spend? | USD, EUR, GBP, CHF, CAD, AUD, JPY, CNY, INR, SGD, AED, SAR, BRL, ZAR, OTHER (IDs are ISO 4217 codes); no preselected default | yes | Currency on the CORE-03 and CORE-04 labels and every report figure; the `clientCurrency` field (exists, set by nothing); the FinOps IQ hand-off | Complements CORE-03, CORE-04 | LTM heuristic for the list; ISO 4217; BIS 2025 (partial); IAS 21 vocabulary |
| CTX-02 | Roughly what share of annual technology spend is invoiced or priced in a currency other than your reporting currency? | LT5, 5_15, 15_30, 30_50, GT50, UNKNOWN | no | A currency-exposure caveat on figures and ranges (15 percent or more); a visibility note when Unknown | Complements CORE-04 and the FinOps IQ billing-currency question | LTM heuristic; FOCUS 1.2 PricingCurrency and BillingCurrency (secondary sources) |
| CTX-03 | In which regions does the organisation run technology operations or incur material technology spend? | EU, UK, CH, NORTH_AMERICA, INDIA, APAC_OTHER, MIDDLE_EAST, LATAM, AFRICA (multi-select) | yes | The Cost IQ coverage statement (regions named, none assessed); the published-figure region caveat; a Sovereign IQ routing suggestion. Gates no question by itself | Complements ADP-51, ADP-52 | LTM heuristic over the `coverage.ts` markets and G1, G4 |
| CTX-04 | Roughly what share of technology operations effort, in-house and contracted, is delivered onshore? | GT90, 60_90, 30_60, LT30, UNKNOWN | no | Workforce and vendor narrative; reading of CORE-36, ADP-17, 18, 35, 36; Sovereign IQ routing suggestion | Complements CORE-36, ADP-18 (who versus where) | LTM heuristic; definitions are LTM's working ones |
| CTX-05 | In how many countries does the organisation run technology operations or incur material technology spend? | ONE, 2_5, 6_20, GT20 | no | Gate for ADP-51 and ADP-52 | Sets the unset 'Global=Yes' trigger of rule TR-30 | LTM heuristic; master rule TR-30 |

CTX-05 is a sixth question I added to the five requested, as the smallest way to give the Geography questions a gate with no engine change (`applicableWhen` cannot count selections on a multi-select). The alternative is a minimum-selections extension to `applicableWhen`, gated on CTX-03; both are owner choices. EU and UK are separate options because `coverage.ts` lists them as separate markets.

**Engine, scoring and report effect:** none on scoring (each question has method `signal-only` and no dimension). The page needs CTX-01 before CORE-03 and CORE-04, and must save the answer to `clientCurrency`. The report needs the coverage statement (CQ5) and a currency code on figures. The engine scores no money and stays currency-agnostic.

**CORE-02:** add EDUCATION ('Education'), MEDIA_ENTERTAINMENT ('Media / Entertainment') and NATURAL_RESOURCES ('Natural Resources / Mining and Metals') before OTHER. Scoring effect none. Owner to confirm where upstream oil and gas sits (Energy / Utilities or Natural Resources).

**Should CORE-03 and CORE-04 be rewritten? Yes; this needs the owner.** Today the bands are US dollars only, and neither question feeds a score, finding or the report. Recommended: keep the option IDs and size classes and show labels in the client's currency from a table. Each table converts the USD edges at one ECB euro reference rate (dated 2 Nov 2026), rounded to two significant figures, and is a registered, dated assumption (A1 to A3 in the JSON; no silent default). Proposed wording: 'What is the organisation's approximate annual revenue, in your reporting currency?' and 'What is the approximate annual technology spend currently in scope for this assessment, in your reporting currency?', each with the note that the bands are size classes at the stated rate. Example (EUR spend): Below EUR 4.5M, EUR 4.5M to 22M, EUR 22M to 45M, EUR 45M to 89M, EUR 89M to 450M, EUR 450M to 890M, Above EUR 890M. Tables for nine non-USD currencies are in the JSON. AED, SAR and Other fall back to visibly labelled US dollar bands. Decisions for the owner: the rewrite itself, whether to keep the IDs (they read as dollars) or rename them to neutral IDs, the rate date, and Indian crore as a display unit. Alternative (a numeric entry) is not recommended now because the page has no numeric input.

## What I could not verify

- **ECB rates:** read through a summarising fetch tool (rates dated 2 Nov 2026). Regenerate the tables from the XML before use. The ECB says the rates are for information only and discourages use for transactions; band labels are not transactions, but say so in the register.
- **BIS 2025 currency shares:** also through a summarising fetch; INR, BRL, ZAR, AED and SAR were not on the page read.
- **FOCUS 1.2 BillingCurrency and PricingCurrency:** the focus.finops.org column page returned 404; the definitions come from the FinOps Foundation FOCUS 1.2 article and Microsoft documentation via search summaries.
- **IAS 21 and ISO 4217:** official text not read; IAS 21 seen in secondary summaries only, ISO 4217 page not opened.
- **ISIC Rev. 5 section titles:** the UNSD page gives 22 sections and the 2024 adoption but not the titles, so the mapping of the three new industries is unverified.
- **AED and SAR pegs:** only secondary press sources; no central-bank page found.
- **Onshore, nearshore, offshore definitions:** no published definition sourced.
- **FinOps Intersecting Disciplines page:** read (3 Nov 2026), but it is written for cloud and licensing; it supports the order of ADP-44 and ADP-47 only.
- **No source found** for any of the 100/80/60/40/20 steps, the 20 percent threshold of F-020, a published share of technical debt in run cost, post-merger duplication, or regional cost variation. The `practicalConstraintSignals` setting is read by no code I could find.

## Sources (checked 3 Nov 2026)

- FinOps Framework, Intersecting Disciplines (read): https://www.finops.org/framework/capabilities/intersecting-disciplines/
- FinOps Framework, Licensing and SaaS (carried from batch 1): https://www.finops.org/framework/capabilities/licensing-saas/
- ECB euro foreign exchange reference rates (read): https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html ; daily XML https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
- BIS Triennial Survey 2025, FX turnover (read, partial): https://www.bis.org/statistics/rpfx25_fx.htm
- FOCUS 1.2 announcement (search summary): https://www.finops.org/insights/focus-1-2-available/
- IAS 21 (secondary summaries): https://www.ifrs.org/issued-standards/list-of-standards/ias-21-the-effects-of-changes-in-foreign-exchange-rates/
- ISO 4217 (not opened): https://www.iso.org/iso-4217-currency-codes.html
- UNSD ISIC Rev. 5 (read, titles absent): https://unstats.un.org/unsd/classifications/Family/Detail/2095
- Repository: `GLOBAL-COVERAGE.md`, `BOUNDARY.md` section 6, `VALIDATION.md` section 12, `coverage.ts`, `master-v6.6.json`, `finding-activation-calibration-v7.1.1.json`, `cost-iq-v10.html` (focus areas), `cost-iq-bank.test.ts`.
