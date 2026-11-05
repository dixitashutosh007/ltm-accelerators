# Cost IQ: new questions Q1 to Q5 (CQ3b draft)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Machine-readable:** [new-questions-q1-q5.json](new-questions-q1-q5.json) (full master question objects, plus `questionBasis` for question-bases.json, `needsOwner` and `needsOwnerReason`). No bank, page or test file was changed. Q6 and Q7 wait for the first client runs.

## The seven questions

All score 100/80/60/40/20 from best to worst with UNKNOWN last at 20 (an LTM convention, not a benchmark). All are single-select, `required: false`. No finding trigger is proposed for any: no source gives a threshold, so one would be invented.

| ID | Brief | Section | Dimension | Gate (CORE-01) | Basis type | Owner? |
|---|---|---|---|---|---|---|
| ADP-61 | Q1 trace spend to named strategy objectives | Value Management | VALUE-01 | none | published-framework (FinOps Executive Strategy Alignment; GAO-04-394G) | Yes: placement |
| ADP-62 | Q2a fully loaded internal and contractor cost known and used | People | COST-06 | WORKFORCE or EXTERNAL | LTM heuristic (TBM Staffing; FinOps Unit Economics support the construct) | No |
| ADP-63 | Q2b contractor demand: approval, rate card, conversion | People | COST-06 | WORKFORCE or EXTERNAL | LTM heuristic (TBM Staffing for the cost category only) | Yes: no "no contractors" option |
| ADP-64 | Q3a end-user cost per user | Infrastructure & Operations | COST-05 | END_USER | LTM heuristic (TBM End User tower; FinOps Unit Economics) | Yes: dimension and section |
| ADP-65 | Q3b end-user lifecycle and refresh governance | Infrastructure & Operations | COST-05 | END_USER | LTM heuristic (TBM End User tower for scope only) | No (follows ADP-64) |
| ADP-66 | Q4 internal infrastructure unit cost, shown back, compared | On-Prem | COST-05 | ON_PREM, PRIVATE_CLOUD, VMWARE or COLO | published-framework (FinOps Unit Economics, Architecting & Workload Placement, Invoicing & Chargeback) | No |
| ADP-67 | Q5 technology cost per unit of business output | Technology Value | VALUE-04 | none | published-framework (FinOps Unit Economics, Executive Strategy Alignment) | No |

**IDs.** ADP-61 to ADP-67 are unused (the highest ADP is ADP-60). CORE-46 onward was not needed: these are scored deep dives.

**Reachability.** Re-checked against commit e82aefb: the focus-area list now sits in master `settings.selection`, every section above is already in it, and a question gated on CORE-01 is shown whenever the footprint names the estate, whatever the area. ADP-61 and ADP-67 are ungated and are reached only through the opt-in Technology Value area (default areas are now Infrastructure and Applications).

**Effect if all seven are applied.** Bank 99 to 106 questions (63 to 70 scored). COST-05 7 to 10, COST-06 2 to 4, VALUE-01 0 to 1, VALUE-04 2 to 3. The count tests, metadata, release manifest and golden outputs need updating by the main session.

## Overlaps and what each complements

| New | Existing | Relationship |
|---|---|---|
| ADP-61 | CORE-19, CORE-44, CORE-07 | CORE-19 asks which evidence is required before funding; CORE-44 asks whether outcomes are measured; this asks whether the whole spend, run included, traces to named objectives |
| ADP-62, 63 | ADP-18, CORE-35, CORE-36 | ADP-18 asks how the internal and contractor mix is decided; these ask about the cost basis and the day-to-day demand control. Not independent evidence with ADP-18 |
| ADP-64 | ADP-06, CORE-26 | Overlap only where workplace software is SaaS: those ask about overlap and reclamation, this asks about cost per user |
| ADP-65 | CORE-33, ADP-12 | CORE-33 and ADP-12 are data-centre framed; this is devices and workplace software. Not independent evidence with CORE-33 |
| ADP-66 | CORE-13, ADP-09, ADP-11, ADP-13, ADP-37 | General cost level, platform renewal analysis, utilisation and colocation contracts; this asks for unit cost, showback and comparison. Not independent evidence with ADP-09 |
| ADP-67 | CORE-13, ADP-66 | CORE-13 is allocation level; ADP-66 is the same idea for internal infrastructure only |

## For the owner

1. **ADP-61 placement.** In Value Management (opt-in) a default run never shows it and VALUE-01 stays unscored for most clients. Recommended default: keep it there now (no page change). Alternative: the baseline section "Cost Governance & Investment" so every client answers it, one more baseline question against the 15 to 20 minute target. COVERAGE-MATRIX says two questions would give a firmer VALUE-01 score.
2. **ADP-63, clients with no contractors.** No not-applicable option exists (same gap as ADP-18); the question tells such clients to leave it unanswered, which is not scored. A cleaner gate on CORE-36 needs an engine change.
3. **ADP-64 and 65 dimension.** Scored on COST-05 (recommended); the TBM End User tower is not one of the towers the taxonomy maps to COST-05, so this is a judgement. A new workplace dimension would break the 16-dimension count.
4. **ADP-66 and chargeback.** FinOps says chargeback is optional and neither showback nor chargeback is more mature, so the ladder credits showback and chargeback equally. The owner's brief said "charged back"; this wording is deliberately wider.
5. **ADP-61 as VALUE-01 only.** valueDimensionIds is ignored by the engine, so each question scores only the dimension named. ADP-66 is not credited to COST-01 for the same reason.

## Sources opened on 3 Nov 2026 (all `verified: true`)

| Source | Used for | How read |
|---|---|---|
| FinOps Framework, Executive Strategy Alignment (finops.org/framework/capabilities/executive-strategy-alignment/) | ADP-61, 67 | Summarising fetch tool |
| FinOps Framework, Unit Economics (.../unit-economics/) | ADP-62, 64, 66, 67 | Summarising fetch tool |
| FinOps Framework, Architecting & Workload Placement (.../architecting-workload-placement/) | ADP-66 | Summarising fetch tool |
| FinOps Framework, Invoicing & Chargeback (.../invoicing-chargeback/) | ADP-66 | Summarising fetch tool |
| TBM Taxonomy 5.0.1 (tbmcouncil.org/taxonomy/) | ADP-62 to 66 | Summarising fetch tool, first 100,000 of 204,029 characters |
| GAO-04-394G (gao.gov/products/gao-04-394g) | ADP-61 | Text extracted from the PDF (PDF pp. 45, 51, 67); the product page itself says nothing on stages or alignment |

## What I could not verify

- **No published ladder, scale or benchmark** exists in anything I read for any of the seven. The ladders and the 100/80/60/40/20 steps are LTM's in every case. Sources support constructs only.
- **TBM:** the page text I read states no cost-per-user, per-VM or per-terabyte metric. The KPI section and the second half of the page were not read, so absence is not established. TBM reuse terms are UNVERIFIED (as in dimension-taxonomy.md T3); name TBM to a client only after the Council's terms are checked.
- **Published cost-per-user, device-lifetime, contractor-premium or unit-cost figures:** none found with method and sample; none are used.
- **ISO/IEC 19770-1** (IT asset management) is relevant to ADP-65 but its clauses were not opened (iso.org HTTP 403), so it is not cited.
- **Colocation** is not mentioned on the FinOps placement page; including COLO in the ADP-66 gate is LTM judgement.
- **Not run:** the bank test and `audit:engines` against the new objects (no file changes allowed). A script check confirmed no ID clash, every map key is an option, map values fall in option order with UNKNOWN lowest, dimensions and gate options exist, and every section is in `settings.selection`.
- `adaptiveTrigger` strings are descriptive labels in the bank's style; nothing in the engine reads them.
