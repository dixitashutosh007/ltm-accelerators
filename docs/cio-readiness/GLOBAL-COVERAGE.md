# Global coverage: markets, questions and engines

**Date:** 3 Nov 2026  **Status:** owner answers recorded; practice-lead sourcing not started. `sovereignty-compliance-lead`, `resilience-lead` and `finops-cost-lead` advise; the product owner approves; counsel reviews regulatory statements before external use (scorecard area 9).

## Owner decisions (3 Nov 2026)

| # | Decision |
|---|---|
| G1 | Add **Switzerland** as a covered market (UK/EU sovereignty is the focus). Add **India** to Resilience IQ (Sovereign IQ already holds four Indian regimes). |
| G2 | **Revisit D1** (GCC content). Analysis and a recommendation are below; the decision is open. |
| G3 | Every report carries a **coverage statement**: the jurisdictions it assesses and those it does not. **Built** (below). |
| G4 | **Currency (decided 3 Nov 2026, recommended option):** bands and figures in the client's own currency; any FX conversion is a dated, sourced rate recorded in the assumption register, never a silent default. |

## Coverage statement (G3): built

`packages/engine-core/src/report/coverage.ts` holds the market list and two blocks. The assessed set is read from each accelerator's own registry, so the statement cannot drift from the engine.

| Accelerator | Statement | Where |
|---|---|---|
| Sovereign IQ | Covers the markets present in `registry/regimes.json`; lists the rest as not covered, with a note that local legal advice is needed | Methodology section; required by the report checks |
| FinOps IQ | Does not assess legal, tax or regulatory obligations; value figures are the published averages named under Sources, not benchmarks for the client's country | Methodology section; required by the report checks |
| Resilience IQ | Does not assess any jurisdiction's obligations in this edition (the obligations registry exists but is not in the report yet) | Method panel in the page; moves to the shared report in RQ6 |
| Cost IQ | Same statement as FinOps IQ until CQ3b adds footprint and applicability | To add in CQ5 with the report |

Switzerland, Canada, India (outside Sovereign IQ), the Gulf states, Latin America and South Africa show as "not covered" until a registry holds them. Nothing is claimed that the engine does not do.

## What is to be added, and where

| Item | Accelerator | Kind of change | Engine or scoring impact | Phase |
|---|---|---|---|---|
| Switzerland: revised Federal Act on Data Protection, FINMA operational-resilience and outsourcing expectations, Swiss Cloud Act position | Sovereign IQ | Registry entries and a country option; applicability rules as data | None for scoring; golden files change for any archetype touching Swiss footprint | Sovereign follow-on, after S10 counsel gate plan is re-cut |
| Switzerland: FINMA operational resilience and BCM | Resilience IQ | Obligations registry entries | None | RQ2 (sourcing) and RQ6 |
| India: RBI, SEBI and IRDAI operational-resilience and IT-outsourcing expectations, CERT-In incident and log rules | Resilience IQ | Obligations registry entries | None | RQ2 and RQ6 |
| Provider list beyond AWS, Azure and Google (Oracle, IBM, Alibaba, sovereign and regional providers) | FinOps IQ, Resilience IQ | Answer options on a context question | None for maturity scores; levers already quantify OCI, IBM and Alibaba | FinOps F3; RQ2 |
| Reporting currency, foreign-currency share of spend, countries of operation, onshore/offshore delivery mix | Cost IQ | New context block (not scored) | Applicability routing only; no dimension weight changes | CQ3b and CQ4 |
| Industry list: education, media and entertainment, natural resources | Cost IQ | Answer options on CORE-02 | None | CQ3b |
| Billing currency versus reporting currency | FinOps IQ | One context question | None | F3 |

## Rule for engines and scoring

- **Context facts** (jurisdiction, currency, providers, sector, footprint) decide which regulations, benchmarks and wording apply. They are never scored and never re-weight a maturity score by region.
- **A scored change** (a new scored question or a new option on a scored one) needs an approved score mapping, a rerun of the monotonic, reachability and missing-answer audit, approved golden outputs and a claims-register entry. Avoid these unless a real new risk is being measured.
- **Benchmarks and value caps** carry the region of their published source. Where the source is global or from another region, the report says so and the assumption register records it.

## D1 revisited: GCC (Saudi Arabia, UAE, Qatar)

What D1 did (Sovereign IQ PLAN, decision D1): removed GCC content from the client view and the registry for v1 because it was outside the four markets; the Saudi bank demo was replaced by five archetypes. The registry now holds 42 regimes and none from the Gulf. The earlier records are not kept as a ready-to-use design folder, so reinstating means sourcing again.

| Option | What it takes | Effect |
|---|---|---|
| **A. Keep out, state it** (current, now visible) | Nothing further. The coverage statement lists the Gulf states as not covered | A Gulf client sees the edge of the report and is told to take local advice |
| **B. Reinstate for Sovereign IQ and Resilience IQ** | Source and counsel-review each regime (data protection and cloud rules in Saudi Arabia, the UAE and Qatar; central-bank and cyber-authority requirements), add applicability rules and archetypes, update goldens | Full coverage; needs local counsel, and the sources and dates change often |
| **C. Reinstate for a named engagement only** | Build B when a Gulf client or opportunity exists | Spends sourcing effort where it earns work |

**Recommendation: A now, C when a named opportunity exists.** The statement keeps reports honest today. Switzerland and India come first because they are in the owner's stated focus, and counsel capacity is the scarce resource. This is a recommendation; the decision is the owner's.

## What follows

1. Owner answers G2 (D1). G4 (currency) is decided.
2. `sovereignty-compliance-lead` sources the Swiss regimes; `resilience-lead` sources the Swiss and Indian obligations; `finops-cost-lead` covers the Cost IQ footprint block (CQ3b) in its re-cut.
3. Counsel gate before any of it reaches a customer.
