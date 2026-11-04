# Cost IQ delivery library: companion note (draft 0.1, 4 Nov 2026)

Prepared by finops-cost-lead for the product owner. Advisory only; the owner approves.
File: `delivery-library.json` (schema `cost-iq-delivery-library/1`), 10 packages, one per R-001 to R-010.

## What the draft contains
- Recommendations, findings and ltmService taken from `canon/config/master-v6.6.json`; evidence prerequisites generated verbatim from `findingGates[].evidenceRequired` in `opportunity-recommendation-gates-v7.1.0.json`.
- All findings F-001 to F-020 are reachable: F-017 via R-002 and R-001, F-019 via R-009 and R-010, F-020 via R-008 and R-007. Checked by script.
- R-003 is a short scoping step handing off to a FinOps IQ assessment. It has no cloud levers and no sizing.
- Offering types: advisory R-001, R-003, R-005, R-007, R-010; implementation R-002, R-004, R-009; transformation R-006, R-008. Owner may change these.

## Planning heuristics (not sourced)
- Every duration (weeks) and effort (FTE-weeks) range is an LTM planning heuristic. None comes from a published source or from LTM delivery history (none exists yet). They are ranges, to be replaced by delivery actuals.
- The JSON contains no prices, rates, savings or percentage figures.

## Sources checked
- FinOps Foundation, Framework page, https://www.finops.org/framework/ , checked 4 Nov 2026. Used only to confirm capability names that the packages align with: Allocation, Planning & Estimating, KPIs & Benchmarking, Unit Economics, Licensing & SaaS, Governance, Policy & Risk, Architecting & Workload Placement. The JSON does not quote the Framework text.
- Repo files named above. FRAMEWORK.md and PRACTICE_LEAD_METHOD.md for the rules.

## Not verified
- No claim is made about TBM, ITIL or COBIT; none was checked, so none is cited.
- Playbook steps are generic practice, not drawn from provider documentation. Tool classes are listed as options only. Where a vendor-specific step is needed (for example a particular licence metric or SaaS admin console), it must be sourced from that vendor's documentation first. UNSOURCED until then.
- The vendor-notice step in R-005 (end-of-support dates) relies on each vendor's public notice; none was looked up.
- The page https://www.finops.org/framework/capabilities/ did not render capability names to the fetch tool, so mapping to individual capability pages was not checked.
- Employment, contract, audit and data-sharing points (R-004, R-006, R-007) are flagged as client or counsel matters. No legal statement is made.

## Open questions for the owner
1. Offering types: accept the split above? R-004 and R-009 could be advisory if LTM does not run the work.
2. R-006 and R-008 are typed transformation; their first-wave delivery (WS4) has the widest effort ranges. Keep inside the Cost IQ library, or move delivery to separate practice scoping?
3. Reuse of FinOps IQ playbook and S5 catalogue (PLAN.md, CQ6 note): this draft was written standalone. Should entries be merged into the shared S3 and S5 structures, and should offering names align to existing catalogue names?
4. Should playbook entries be platform-specific (AWS, Azure, GCP, on-premises) where relevant? Cost IQ R-004, R-005 and R-009 playbooks are currently tool-class level. Platform detail for cloud sits in FinOps IQ via R-003.
5. Is the finding-to-package mapping (via recommendation) acceptable, or does the gate need finding-level playbook IDs?
6. Who confirms the heuristic ranges before external use: owner, or a delivery lead once one exists?
