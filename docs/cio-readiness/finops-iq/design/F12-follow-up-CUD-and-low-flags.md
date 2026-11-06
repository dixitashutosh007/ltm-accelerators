# F12 follow-up: Google CUD figures (CLM-FIN-066, D2) and Low-confidence flags

**Date:** 6 Nov 2026. **Author:** finops-cost-lead (agent). **Status:** advice for the product owner; nothing committed, no release label changed. The owner decides D2 and the numeric constants below.

## A. Google commitment discounts

### A1. Evidence (all read directly from Google's pages on 6 Nov 2026, HTML fetched and read as text, not through a summary)

| Source | URL | Page "last updated" | What it says |
|---|---|---|---|
| Committed use discounts overview (Compute Engine) | https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview | 2026-11-03 UTC | Resource-based hardware CUDs: "up to 70% for memory-optimized machine series and ... up to 55% for all other machine series" (no per-term split). Compute flexible CUDs (the page calls them "spend-based CUDs"), table "Applicable discounts", 1-year / 3-year: M1, M2, M3, M4: no discount / 63%. H3, H4D: 17% / 38%. C2, C2D, C3, C3D, C4, C4A, C4D, E2, N1, N2, N2D, N4, N4D, N4A: 28% / 46%. C4N, M4N: 28% / 54%. G2 (L4): 21% / 43%. G4: 16% / 42%. Local SSD and sole-tenancy premium: 28% / 46%. GKE Standard and Autopilot: 28% / 46%. Cloud Run request-based billing and functions: 17% / 17%. Cloud Run instance-based, jobs, worker pools: 28% / 46%. Caveat: discounts "may differ for Cloud Billing accounts that have other on-demand compute instance savings in effect" |
| Compute Engine VM pricing | https://cloud.google.com/compute/vm-instance-pricing | no date on page | Resource-based: 1-year "up to 37%"; 3-year 70% memory-optimized and 55% all other machine types |
| Cloud SQL committed use discounts | https://docs.cloud.google.com/sql/docs/mysql/cud | 2026-11-03 | Spend-based: 25% for 1 year, 52% for 3 years |
| Spanner committed use discounts | https://docs.cloud.google.com/spanner/docs/cuds | 2026-10-29 | Spend-based: 20% for 1 year, 40% for 3 years |
| Spend-based CUDs, get started; and "Spend-based committed use discounts" hub | https://docs.cloud.google.com/docs/cuds-spend-based ; https://docs.cloud.google.com/docs/cuds-multiprice | 2026-10-26 ; 2026-11-04 | Explain the model and the migration to a discount-based consumption model; they carry no percentages. Rates are on each product's page |

Not established: current Memorystore, Bigtable and AlloyDB rates. Search results gave 20%/40% (Memorystore, Bigtable, from older Google blog posts) and "up to 52%" (AlloyDB, a Jan 2024 round-up); I did not read the current product pages, so these are **UNSOURCED for today** and must not enter the register until read.

### A2. What is correct and what is wrong

My F12 review row ("Differs") was too blunt, and I correct it here. Read at source:

- **Correct:** 28% (1 year) and 46% (3 years) for the series CLM-FIN-066 listed. The series list is now longer (C4A, C4D, N4D, N4A added).
- **Wrong or misleading in CLM-FIN-066 as written:**
  1. It said "other series have different rates" without giving them. They range from no discount (M-series, 1 year) to 63% (M-series, 3 years), 54% (C4N, M4N, 3 years), 38% (H3, H4D), 43% (G2), 42% (G4), and 17% flat for Cloud Run request-based billing.
  2. "Some require opting in to the spend-based model" is not on the page. Removed (UNSOURCED).
  3. The page caveat on accounts with other on-demand savings was missing.
- **Wrong in text that used the figure:**
  - Report Appendix A (report.ts `notStated`) and ASM-FIN-062 said 55% is "higher than the flexible CUD maximum". True against 46% for most series, false against M-series (63%); 54% for C4N and M4N is just under 55%. Reworded to "higher than the 46% three-year compute flexible CUD rate for most series".
  - CLM-FIN-128 basisNote and ASM-FIN-040 compared half of a **3-year** maximum (27.5%) with a **1-year** rate (28%). That is not like for like. Like for like: 1-year resource-based up to 37% against 1-year flexible 28% (ratio 0.76), so "expected = half of upper" is conservative against published commitment rates. Reworded as a loose illustration with the like-for-like figures.
  - CLM-FIN-065 gave 55% and 70% without saying they are 3-year maxima (1-year is up to 37%). Clarified.
- Spend-based CUDs for databases are not 28/46: Cloud SQL 25/52, Spanner 20/40. The register has no claim for them; the FinOps IQ engine does not quantify them today.

### A3. D2: the default when the instrument is not stated

Facts: resource-based 3-year, non-memory-optimised: 55% (a maximum, "up to"). Compute flexible 3-year, most series: 46% (an exact table rate for those series; 54% for C4N/M4N, 63% for M-series). AWS default is 66% (Compute Savings Plans, 3-year) and Azure 65%: the report's rule is to default to the flexible instrument.

Arithmetic (per 1,000,000 of covered Google commitment-eligible spend, LEV-01 cases are 1/4, 1/2, 1 of upper):

| Default | Upper | Expected | Conservative |
|---|---|---|---|
| 55% (today) | 550,000 | 275,000 | 137,500 |
| 46% | 460,000 | 230,000 | 115,000 |
| Change | -90,000 (-16.4%) | -45,000 | -22,500 |

**Recommended default (judgement, owner decides): 46%**, labelled "3-year compute flexible CUD, most series". Reasons: it follows the rule used for AWS and Azure; it is an exact published rate rather than a ceiling; it does not depend on the client having purchased resource-specific commitments; a CIO who is told "up to 55%" for an unstated instrument can fairly ask for the basis. Cost: Google-heavy figures fall by about 16% on LEV-01. Keeping 55% is defensible only if labelled "resource-based 3-year ceiling"; the owner kept it on 22 Oct 2026 and that decision stands until the owner changes it. When the client states resource-based CUDs the 55% (or 70% for memory-optimised) applies as now.

### A4. Text corrected (text only; no numeric constant changed)

- `packages/engine-core/src/claims/claims-register.json`: CLM-FIN-066 statement and notes (checkedOn set to 2026-11-06; lastReviewed and nextReview left for the owner); CLM-FIN-065 statement and notes (1-year 37%, checkedOn 2026-11-06); CLM-FIN-128 basisNote.
- `registry/assumptions.json`: ASM-FIN-040 reasoning; ASM-FIN-062 value text.
- `registry/market-data.json`: the two `instrument` labels for CLM-FIN-066.
- `registry/levers.json`: the LEV-01 Google `source.citation` text.
- `v3/report.ts`: the Appendix A sentence `notStated('gcp')` and its comment. `v3/*.json`: no change needed (the question-bank citation of CLM-FIN-065 is still correct as a maximum).
- Not touched: `docs/.../DESIGN.md` S13 and `M7-*.md` (historical decision records); the owner may want a pointer added.

### A5. Numeric constants for the owner (not changed)

| File | Key | Current | Evidence-based value if D2 moves to 46% |
|---|---|---|---|
| `registry/levers.json` | LEV-01 `maxRate.byProvider.gcp.value` | 0.55 | 0.46 (and update `instrument` text) |
| `registry/levers.json` | LEV-01 `...gcp.defaultInstrument` | `resource_cud` | new instrument, e.g. `flexible_cud` = 0.46, claim CLM-FIN-066; keep `resource_cud` 0.55 and `memory_optimised_cud` 0.70 as selectable |
| `registry/assumptions.json` | ASM-FIN-060 constants refs `gcp.value` and `gcp.instruments` (0.55) and its `value` text | 0.55 | follow the lever file; these mirror it |
| `registry/assumptions.json` | ASM-FIN-062 `value` text and constants | 55% default | 46% default |
| `registry/market-data.json` | `maxDiscount` 0.28 and 0.46 (CLM-FIN-066, "cross-check") | 0.28, 0.46 | unchanged and correct for the listed series; owner may add rows for M-series 0.63, C4N/M4N 0.54, and Cloud SQL 0.25/0.52 once claims exist |
| `design/reference-scenarios.json` | `usedFor` text near line 2797 ("55%, CLM-FIN-065") | 55% | 46% (CLM-FIN-066) |
| `test/golden`, `docs/cio-readiness/finops-iq/design` sample outputs | any Google-commitment LEV-01 value | computed from 0.55 | regenerate after the owner decides |

## B. Low-confidence playbook entries

- **Storage:** each playbook entry has `confidence` (High, Medium, Low) in `packages/engine-core/src/playbook/finops-iq.json` (145 entries: 60 High, 56 Medium, 29 Low). The type is in `src/playbook/catalogue.ts`, and the field flows through `TechnicalAction` in `v3/execution.ts` to the report. Before this change the report never printed it.
- **Change (smallest):** `v3/report.ts` exports `LOW_CONFIDENCE_FLAG` ("Low confidence: confirm against the provider's current documentation before use.") and appends it, in italics, to the Action cell of any technical-execution row whose entry is Low. Same code path for the consultant and client editions. All 29 Low entries have a platform action, so none sits in a "Not applicable" line.
- **Tests:** new describe block in `test/finops-iq-v3-report.test.ts`. For each of the 9 reference scenarios in both editions it rebuilds the row order from the plan and asserts the flag is present on a row if and only if the entry is Low, that the flag appears nowhere else in the report, and that the scenarios exercise at least one Low and one non-Low row.
- **Test adjusted:** the existing D11 test (shared sentences stated once) now strips the flag before comparing, because a table whose rows are all Low would otherwise show the same sentence in every row. The flag is a per-row status, not shared approach text.
- **Goldens and PDF tests:** no golden file changed (goldens hold engine values, not report text; the CUD edits are text only). The PDF tests (same-bytes render, D7 no page ends on a heading) passed unchanged. The PDF text of Appendix A (Google not-stated sentence) and Low rows has changed, so any stored sample PDFs will differ and need regenerating at the next release.
- The on-screen results view in `Accelerators/assets/finops-iq/app.js` was not changed; it was outside the request. Owner to say if the screen should carry the flag too.

## Checks run (6 Nov 2026)

`node scripts/check-claims.cjs`: passed. `npx vitest run packages/engine-core/test`: 32 files, 1071 tests passed. `npx playwright test tests/e2e/finops-iq.spec.ts`: 15 passed. `git status` also shows Sovereign IQ files modified; those are not mine.

## Release label

Not changed. CLM-FIN-066 and CLM-FIN-065 have `lastReviewed` and `nextReview` untouched, for the owner to set on approval.
