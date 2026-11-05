# Cost IQ scoring proposal, batch 1 (CQ3b)

**Date:** 3 Nov 2026. **Author:** `finops-cost-lead` (advises; the product owner approves). **Machine-readable maps:** [scoring-batch-1.json](scoring-batch-1.json) (19 objects, option IDs checked against the master, maps checked as monotonic). Nothing in the code has been changed.

## Verdicts

| ID | Verdict | Dimension | Map or label | Basis |
|---|---|---|---|---|
| CORE-01 | Context | none | footprint, routes applicability; keep required | LTM heuristic (TBM tower alignment unverified) |
| CORE-05 | Context | COST-01 | spend-baseline scope; UNKNOWN sets a confidence flag; CORE-01 minus CORE-05 shown in the report | LTM heuristic |
| CORE-07 | Context | VALUE-01 | CIO priorities; orders recommendations | LTM heuristic |
| CORE-09 | Context | VALUE-02 | CIO hypothesis; already declared no score impact | LTM heuristic |
| ADP-06 | Score | COST-04 | 100/80/60/40/20, UNKNOWN 20 | FinOps Licensing and SaaS capability; bands LTM heuristic |
| ADP-07 | Score | COST-04 | 100/80/60/40/20 | FinOps Licensing and SaaS (Crawl, Walk, Run anchors) |
| ADP-08 | Score | COST-01 | slider, `normalize: invert-0-100`; F-017 if above 30 | FinOps Licensing and SaaS; 30 is LTM heuristic, UNSOURCED |
| ADP-09 | Score | COST-05 | 100/80/60/40/20 | LTM heuristic over FinOps maturity model |
| ADP-10 | Context | COST-05 | candidate exposure, opportunity sizing | LTM heuristic |
| ADP-11 | Score | COST-05 | stars via keyed map 1..5 = 20..100 | LTM heuristic |
| ADP-12 | Context | COST-05 | refresh timing exposure; UNKNOWN = visibility flag | LTM heuristic |
| ADP-13 | Score | COST-05 | 100/80/60/40/20 (needs COLO gating) | LTM heuristic over FinOps maturity model |
| ADP-14 | Score | COST-07 | 100/80/60/40/20 | LTM heuristic |
| ADP-15 | Drop | n/a | duplicates CORE-29 and CORE-31 | n/a |
| ADP-16 | Score | COST-04 | 100/80/60/40/20 | FinOps Licensing and SaaS; ISO/IEC 19770-1 (clauses not read) |
| ADP-17 | Context | COST-08 | manual-work hotspots | LTM heuristic |
| ADP-18 | Rewrite | COST-06 | replacement wording and map in the JSON | LTM heuristic |
| ADP-19 | Context | COST-07 | renewal pipeline volume | LTM heuristic |
| ADP-20 | Context | COST-07 | negotiation leverage, constraint signal | LTM heuristic |

Counts: 8 score, 9 context, 1 rewrite, 1 drop. After applying, 18 IDs leave the inert list (8 scored, 9 context, and ADP-15 removed once the owner agrees); ADP-18 stays on it until the owner approves the rewording.

## F-017 (business-led spend not governed)

- **ADP-08 triggers it** when more than 30% of SaaS spend is outside central governance (numeric `gt 30`). The threshold is an LTM heuristic and UNSOURCED; the owner should confirm or change it. The calibration engine supports `numeric` triggers with `gt`, so no engine change is needed.
- **No other question in this batch should trigger it.** ADP-06 (SaaS overlap) is corroborating evidence, not a governance measure.
- Outside this batch, to complete the F-017 set: ADP-33 (LIMITED, NONE) and ADP-34 (CASE, NONE). CORE-16 is context and cannot trigger on its own under the calibration rule.

## Needs the owner

| ID | Why |
|---|---|
| ADP-15 | Drop removes a question a client sees |
| ADP-18 | Replacement wording changes what a client sees; no monotonic map is possible on the current options (two scales mixed) |

Also for the owner: the 30% threshold for F-017 (a number, not wording).

## Checks

- **Same scale shape per dimension.** All option maps in this batch use 100/80/60/40/20, with UNKNOWN or the worst option at 20, matching CORE-12, CORE-20 and ADP-42. ADP-11 (stars) is mapped 20 to 100 through a keyed map rather than the linear star method (0 to 100) so it matches the other COST-05 maps. ADP-08 is the one exception (inverted slider, floor 0): it is a continuous quantity, as CORE-17 and CORE-34 are. Existing COST-04 and COST-01 maps elsewhere differ by a few points (CORE-26: 100/78/56/38/20; CORE-13: 100 to 25); they are not changed here.
- **Unknown never flatters.** Every scored option question rates Unknown at the lowest level. Sliders and stars have no Unknown option (see problems).
- **Global-coverage rule.** No context label here re-weights a score; each says so. No question uses country, sector or currency.
- **Inert-list test.** Context labels use the `method` values the test recognises (`signal-only`, `hypothesis-signal`, `constraint-signal`); score fixes need a `defaultMap` or `normalize`.

## Problems found with the questions

1. **`valueDimensionIds` is ignored by the engine** (`dimensions()` reads only `scoring.dimensionIds`). ADP-09 to 12, 18, 19, 20 carry a value dimension that never receives a score. I score the Cost dimension only; adding the value dimension to `dimensionIds` would count one answer in both headlines.
2. **Sliders cannot record Unknown** (ADP-08, ADP-10; VALIDATION section 6). A skipped slider is unscored, not scored low, so it does not flatter but also leaves a gap in COST-01. Fix in the page, or move ADP-08 to bands with an Unknown option (a client-visible change, owner approval).
3. **Applicability gating is a dependency.** ADP-09 to ADP-13 and ADP-14 have no not-applicable option. A client with no virtualised estate, no data centre or no colocation would be scored low. They must be shown only when CORE-01/CORE-23 says so. CORE-23 has COLO, VMWARE and MANAGED options that CORE-01 lacks, so the CORE-23 into CORE-01 merge must keep them.
4. **VALUE-01 still has no scored question** (CORE-07 is context). A VALUE-01 score cannot be shown until one is added.
5. **ADP-09 and ADP-10 are never shown today** (VALIDATION section 6; ADP-28 is the third, outside this batch; BOUNDARY task 6): they need an area before the ADP-09 map or the ADP-10 label has any effect.
6. **ADP-15 duplicates CORE-29 and CORE-31.** CORE-23 duplicates CORE-01 (already planned).
7. **CORE-05 UNKNOWN** is a multi-select option; check it is exclusive of the others.
8. **ADP-06 counts are not normalised by estate size**, so the score is a screen, not a benchmark.
9. **ADP-11 prompt** says "How confident are you" but the anchors describe practice; minor, owner optional.

## What I could not verify

- **ISO/IEC 19770-1:2017:** the iso.org page returned HTTP 403. I confirmed the standard exists and is current from search results only, and read no clause. No clause is cited.
- **TBM Taxonomy 4.1:** the public page does not list the towers or cost pools (members-only). Alignment of the CORE-01 options to named TBM towers is UNVERIFIED.
- **FinOps Data Center scope and capability:** the scopes page mentions data centre only in passing; the capability page returned 404. ADP-09, 11, 13 therefore rest on LTM heuristic, not a FinOps source.
- **A shadow-IT percentage with method and sample:** none found; the 30% F-017 threshold is UNSOURCED.
- **Numeric steps (100/80/60/40/20)** are an LTM convention everywhere; the FinOps Framework gives three stages, not scores.

## Sources (checked 3 Nov 2026)

- FinOps Framework, maturity model (Crawl, Walk, Run): https://www.finops.org/framework/maturity-model/ . It says Crawl has basic processes and quick wins, Walk is followed across the organisation, Run has automation as the preferred approach, and that Run everywhere should never be the goal.
- FinOps Framework, Licensing and SaaS capability: https://www.finops.org/framework/capabilities/licensing-saas/ . Crawl: terms reviewed at renewal after commitment; Walk: a pre-signature checklist against validated demand; Run: reclamation triggers automated against usage; aim to minimise over-deployment and under-deployment; a review process so teams do not buy what already exists.
- FinOps Framework, Scopes: https://www.finops.org/framework/scopes/ (scopes follow decision context).
- TBM Council, TBM Taxonomy 4.1: https://www.tbmcouncil.org/learn-tbm/tbm-taxonomy/
- ISO/IEC 19770-1:2017: https://www.iso.org/standard/68531.html (catalogue only).
