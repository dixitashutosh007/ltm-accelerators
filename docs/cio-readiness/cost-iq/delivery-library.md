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

## Platform playbook sources (draft 0.2, 4 Nov 2026)

Ten platform-specific playbook entries were added with optional fields `platform` and `sources` (title, publisher, url, checked). Existing entries are unchanged. Cloud-provider cost steps are excluded because R-003 hands cloud to FinOps IQ. Every page below was opened on 4 Nov 2026. Entries contain no licence-metric, contract-term, price, saving or legal statement.

| Package | Entry | Platform | Source opened |
|---|---|---|---|
| R-004 | Microsoft 365 licence assignment against activity | Microsoft 365 and Entra ID | https://learn.microsoft.com/en-us/microsoft-365/admin/activity-reports/activity-reports (page dated 28 Aug 2026) |
| R-004 | Microsoft 365 usage-report access and privacy setting | Microsoft 365 and Entra ID | same page |
| R-004 | Entra sign-in evidence of application use | Microsoft 365 and Entra ID | https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins |
| R-004 | Okta application sign-in evidence | Okta | https://developer.okta.com/docs/reference/api/event-types/ and https://developer.okta.com/docs/reference/api/system-log/ |
| R-004 | Oracle Database feature usage evidence | Oracle Database | https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/DBA_FEATURE_USAGE_STATISTICS.html (19c) |
| R-004 | SAP system measurement evidence | none (generic entry) | No source: no current-release SAP page was verified on 5 Nov 2026; the consultant confirms against the client's release |
| R-004 | IBM core-based software inventory evidence | IBM software | https://www.ibm.com/software/passportadvantage/ibmlicensemetrictool |
| R-005 | vSphere host utilisation data | VMware vSphere | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-monitoring-and-performance/monitoring-inventory-objects/overview-performance-charts/hosts.html (vSphere 8.0) |
| R-005 | CMDB data quality before the footprint review | ServiceNow CMDB | https://www.servicenow.com/docs/r/zurich/servicenow-platform/configuration-management-database-cmdb/overview-cmdb-health.html and https://www.servicenow.com/docs/r/zS6yb8e~gR8BPjeviYdV9g/mnIlomGC8p4vjiVA9tJpxA (Zurich release, checked 5 Nov 2026) |
| R-008 | CMDB record completeness for the application inventory | ServiceNow CMDB | same two pages |

Caveats on the sources:
- The ServiceNow sources are product documentation for the Zurich release (replacing a Community article on 5 Nov 2026); the entry still says to confirm against the client's release.
- The SAP entry carries no source and is no longer a platform-specific entry: the only page found was an old NetWeaver 7.3 EhP1 help set, and no current-release page could be verified. The entry tells the consultant to confirm every step against the client's release.
- Okta event names come from the event-type catalogue; the System Log page itself names no sign-in event.

### UNSOURCED (steps left generic or not added)
- **VMware/Broadcom licensing change:** no entry. No Broadcom page was opened on licensing changes, and licence terms are out of scope here.
- **ServiceNow ITSM ticket data for R-006 (demand and task effort):** stays generic. No product documentation page was opened that names the report or table. R-006 has no platform entry.
- **SaaS management platforms as a class:** stays generic in R-004 options. No neutral vendor documentation covers the class.
- **Okta log retention, Entra sign-in log retention:** neither page states a period; the entries tell the consultant to record the client's retention. What would settle it: the retention page for the client's licence tier.
- **IBM License Metric Tool report names and SAP USMM on current releases:** the IBM landing page names no specific report, and the IBM docs pages (www.ibm.com/docs) and help.sap.com/docs pages returned only titles to the fetch tool. Entries say "inventory report" and "measurement statistics" generically.
- **Oracle products other than the database feature-usage view, Microsoft contract programmes, other vendors:** no entries.
- **R-001, R-006, R-007, R-009:** no platform-specific entries added; no verified platform page supports a step for them.
- Whether `app.oauth2.signon` and `user.authentication.sso` together cover all of a client's Okta applications was not verified.
