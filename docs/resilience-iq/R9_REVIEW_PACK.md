# Resilience IQ: R9 review pack for the BCP/DR practice lead

**Date:** 13 Oct 2026  **Engine:** `main` after R8 (PR #35).  **What we need from you:** a decision on each item below. Mark **Accept** (apply the recommended default), **Change** (say what instead) or **Keep as is**. Engineering then implements each decision with a regression test and sends you the golden-file diff to sign off ([ROADMAP.md](ROADMAP.md), Gate R9).

**How to read the examples.** Every number comes from the engine on `main`. The base case is the `regulated-bank-tested` sample client (strong, tested estate; RTO under 15 minutes, near-zero RPO), with one answer changed at a time:

| Base case | Score | Posture | Rating | Maturity | Critical exposure | Strategy |
|---|---|---|---|---|---|---|
| `regulated-bank-tested` | 80 | 86 | Managed | Defined | High | DR-05 Active-Active |

*Score* is the risk-adjusted headline (posture minus flat penalties). *Posture* is the weighted domain score. The rating and maturity are capped by critical exposure (R3 decision D1).

---

## Decision 1: blank advisory answers

**Today.** An advisory question left blank has no effect; only a weak *answer* is penalised. Five weak advisory answers take the base case from **80 to 50**. Leaving the same five questions blank keeps it at **80**. Across 800 random assessments, leaving 30% of advisory answers blank raises the mean posture by **+6** and the score by **+7**.

| Base case plus five advisory answers (AF-DR-01, AF-DR-05, AF-OP-01, AF-TS-02, AF-CL-04) | Score | Posture |
|---|---|---|
| Answered weakly ("Not proven", "Manual runbook", "No", "No", "No") | 50 | 79 |
| Left blank | 80 | 86 |

A client is rewarded by up to 30 points for not answering. The advisory gate only stops this when it is triggered, and it then requires every question the branch added, including ones that do not bear on the gate.

**Recommended default.**
- A blank answer to an advisory question that has been asked counts as "Unknown", which the engine already scores as risk.
- The advisory gate requires only the gate-relevant DR and cyber questions, not every question the branch added.

**Decision:** ☐ Accept ☐ Change ☐ Keep as is

---

## Decision 2: double counting

**Today.** Three executive answers count twice: once in their domain score and again as a flat penalty on the headline.

| Base case with one answer changed | Score | Posture | Through posture | Flat penalty | Rating |
|---|---|---|---|---|---|
| EX-12 = "Critical SPOFs exist" | 59 (−21) | 75 (−11) | −11 | −10 (critical SPOF) | Managed |
| EX-09 = "No" (backups) | 60 (−20) | 81 (−5) | −5 | −15 (backup gap) | Fragile |
| EX-19 = "No" (identity recovery) | 67 (−13) | 81 (−5) | −5 | −8 (identity gap) | Fragile |

EX-12 alone moves the headline 21 points, about half of it counted twice.

**Recommended default.** One effect per answer. Keep the flat penalty, which is named in the gap register and so explainable, and stop scoring these three questions in their domain. The critical-exposure cap on the rating stays.

**Decision:** ☐ Accept ☐ Change ☐ Keep as is

---

## Decision 3: "Immutable but restore not proven"

**Today.** This answer to EX-09 raises G-03 "Unrecoverable Data" (critical), the same gap as having no usable backups.

| Base case, EX-09 = | Score | Rating | Maturity | Critical exposure | Gap |
|---|---|---|---|---|---|
| "Yes, tested" | 80 | Managed | Defined | High | — |
| "Immutable but restore not proven" | 63 | Fragile | Documented | Severe | G-03 critical |
| "No" | 60 | Fragile | Documented | Severe | G-03 critical |

A client with immutable backups that have not been restore-tested gets nearly the same result as a client with no backups.

**Recommended default.** Report a high-severity "Unproven Recovery" gap with a restore-test action, not critical "Unrecoverable Data". "No", "Unknown" and "Recoverable but not immutable" keep G-03.

**Decision:** ☐ Accept ☐ Change ☐ Keep as is

---

## Decision 4: near-zero RPO with a relaxed RTO

**Today.** The recommended strategy jumps back to the most expensive pattern as the recovery time objective gets *more* relaxed:

| Base case, RPO = near-zero, RTO = | Recommended strategy |
|---|---|
| Under 15 minutes | DR-05 Active-Active |
| 1–4 hours | DR-03 Warm Standby |
| 4–24 hours | **DR-05 Active-Active** |
| Over 24 hours | **DR-05 Active-Active** |

The cause: near-zero RPO adds +16 to DR-05 on its own. Above a 4-hour RTO, DR-03 loses its RTO bonus and drops from 79 to 64, while DR-05 stays at 70. DR-01 and DR-02 are ruled out by the near-zero RPO, so DR-05 wins. A client that can be down for a day but must not lose data needs continuous data replication, not a second live site.

**Recommended default.**
- Select the strategy by recovery time first. Near-zero RPO adds a continuous replication requirement (and the DATA controls), not Active-Active.
- Active-Active only when the RTO is near-zero or under 15 minutes.
- Adopt the strategy ladder in `resilience-iq/design/decision-matrix.json` (S1 Backup and Restore to S5 Active-Active, each with RTO and RPO bands) as the rule, so the logic is written down rather than spread across scoring constants.

**Decision:** ☐ Accept ☐ Change ☐ Keep as is

---

## Decision 5: confirm the R3 defaults

These were applied in R3 as defaults, pending your confirmation ([PLAN.md](PLAN.md), R3):

| # | Default applied | Confirm? |
|---|---|---|
| D1 | Critical exposure caps the rating and maturity (High: at most Managed / Defined; Severe: at most Fragile / Documented) | ☐ |
| D2 | Maturity "Tested" or "Adaptive" needs a recovery test within 12 months and scenario-based testing | ☐ |
| D3 | Recovery objectives (EX-02 to EX-04) are requirements, not capability: any defined value scores 85, Unknown scores 20 | ☐ |
| D4 | Scope inputs (EX-01 critical services, EX-18 environments) are not scored | ☐ |
| D5 | Governance (EX-15) is scored in BCP | ☐ |
| D6 | Correlated recovery (G-04): flat −8, plus DR −12 and INFRA −5 | ☐ |

---

## Decision 6: moderate concentration as a critical gap

**Today.** EX-11 "Moderate concentration" sets the same concentration flag as "High concentration". That raises G-04 (recovery correlated with production, **critical**) and G-08 (third-party concentration, high). The base case answers "Moderate concentration", and this one answer is what keeps it at "Managed":

| Base case with | Score | Rating | Maturity | Critical exposure | Gaps |
|---|---|---|---|---|---|
| As is (moderate concentration; EX-08 "Yes", ransomware could reach recovery) | 80 | Managed | Defined | High | G-04 critical, G-05 critical, G-07, G-08 |
| EX-11 = "No material concentration" | 87 | Managed | Defined | High | G-05 critical, G-07 |
| EX-08 = "No, recovery is isolated" | 84 | Managed | Defined | High | G-04 critical, G-07, G-08 |
| Both changed | 91 | Adaptive | Adaptive | Moderate | G-07 |

The G-05 cyber gap follows from the client's own answer that ransomware could reach its recovery copies. The question is whether *moderate* concentration should be critical. Across 800 random assessments, none reaches "Resilient" or "Adaptive", partly because of this rule.

**Recommended default.** "Moderate concentration" raises G-08 (high) and a concentration action, but not critical G-04. "High concentration" and "Unknown" keep G-04.

**Decision:** ☐ Accept ☐ Change ☐ Keep as is

---

## Not for decision here

- **BR-01 (business impact questions)** is implemented in R10.
- **Strategy ties** were made deterministic in R8 (lower cost, then lower complexity). Tell us if you want a different rule.
- **AF-CL-04 and AF-TS-02** were confirmed to work in R8; nothing to decide.
