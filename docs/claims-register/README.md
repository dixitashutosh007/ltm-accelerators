# Claims Register

Every number, benchmark and regulatory statement an accelerator shows a client must be traceable
to a source and a named reviewer. This folder is that register.

## Files

| File | Purpose |
|---|---|
| `claims-inventory.csv` | Machine-generated inventory of candidate claims (`npm run claims:extract`). Phase 1 output; the Phase 3 starting point. |

## Columns

| Column | Meaning |
|---|---|
| `id` | Stable identifier, e.g. `SOVERE-0012`. Engines will reference claims by id in Phase 3. |
| `type` | `regulatory` (statute, penalty, obligation), `statistic` (%, money, multiplier), `benchmark` (peer median/percentile), `formula` (engine constant driving a score or money figure) |
| `claim_or_constant` | The text or code line as found |
| `location` / `source_file` | Where it lives (JSON path or line number) |
| `source_citation` | **To fill:** primary source (regulation article + URL, dataset + year + sample size), or `LTM practice heuristic` |
| `owner` | **To fill:** reviewing SME (legal / FinOps / cloud / strategy lead) |
| `status` | `unreviewed` → `verified` / `corrected` / `heuristic-labelled` / `removed` / `not-a-claim` |
| `last_reviewed` / `next_review` | Dates; regulatory claims are reviewed at least every 6 months |

## How Phase 3 uses it

1. Triage: mark answer-option labels and UI copy that make no factual claim as `not-a-claim`.
2. Regulatory rows go to the legal reviewer, benchmark and statistic rows to the practice leads, formula rows to the accelerator owner.
3. Each reviewed row gets a citation or is relabelled as a heuristic in the product ("LTM practice estimate").
4. CI will fail when a regulatory claim passes its `next_review` date.

The inventory is regenerated whenever knowledge bases or engines change; reviewed status is carried
over by `id` once Phase 3 introduces the reviewed register file.
