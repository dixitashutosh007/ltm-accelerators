# Cost IQ: the decision, the buyer and the edge (area 1)

**Date:** 5 Nov 2026. **Author:** finops-cost-lead (AI practice-lead agent). I advise; the product owner decides. External claims carry a URL and the date I opened the page (5 Nov 2026 for all).

## 1. The decision Cost IQ informs

**Where, in the technology estate, should the CIO and CFO look first to find avoidable cost or unrealised value, and what must be shown before any saving is counted?** Cost IQ answers with scores for 16 cost and value dimensions, findings raised only by named answers, and for each finding the evidence needed before it is sized (client report p. 3-8). It also feeds the next decision: which advisory, implementation or transformation step to commission, and in what order (roadmap and "Recommended first steps").

## 2. Buyer and user

Confirmed from the repo and plan:
- The report is addressed to "the CIO, or the head of technology finance" (`report.ts` summary, "Decision requested"; PLAN CQ5).
- The user who runs it today is an LTM consultant, signed in, saving and completing the assessment and downloading the client edition (the report cover reads "Prepared by LTM consultant"; `amplify/functions/cost-iq-report/handler.ts`). FRAMEWORK.md also lists a short CIO self-serve mode as the door-opener; the page does not yet separate the two roles (no role check on the consultant edition).

**To confirm (product owner):** the named buyer (CIO, CFO or head of technology finance, per client), whether a CIO may run it unaided, and the engagement it opens (the plan implies a paid assessment or an optimisation step; no price or commercial model is written down). I have not invented one.

## 3. Fair comparison with what a CIO could use instead

| Alternative | What it does (source) | Where it is better | What Cost IQ adds |
|---|---|---|---|
| **FinOps Foundation Framework and Assessment** | Maturity as Crawl, Walk, Run per capability, qualitative, with no scoring in the model ([maturity model](https://www.finops.org/framework/maturity-model/), 5 Nov 2026). A separate assessment scores each capability through five lenses (Knowledge, Process, Metrics, Adoption, Automation) on a 0 to 4 scale, is not limited to cloud (it names SaaS, PaaS, data centres), is licensed CC BY 4.0 and is meant as a high-level overview, not precise grading ([FinOps Assessment guide](https://www.finops.org/wg/finops-assessment/), 5 Nov 2026) | Free, a published industry standard, independent of any adviser, and deep on cloud and FinOps practice | A fixed-ladder questionnaire across cost and value (investment, benefits, vendors, workforce, applications), findings raised by named answers, an evidence list per finding, a delivery plan and platform playbook, and one cloud figure taken from FinOps IQ rather than a second estimate. It does not replace the Framework; it uses it as its closest reference ([framework page](https://www.finops.org/framework/), 5 Nov 2026) |
| **AWS, Azure and Google Cloud cost-optimisation guidance and review tools** | AWS's Cost Optimization pillar is guidance for AWS workloads and is aimed at CTOs, CFOs and architects ([AWS](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html), 5 Nov 2026). Azure's pillar offers a checklist, a maturity model, an Azure Well-Architected Review assessment and points to Azure Advisor cost recommendations and Microsoft Cost Management ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/), 5 Nov 2026). Google's pillar covers cost of workloads in Google Cloud under four principles ([Google Cloud](https://docs.cloud.google.com/architecture/framework/cost-optimization), 5 Nov 2026) | Free, written by the platform owner, tied to the client's real billing data and resources, and more precise on that provider's own services | Provider-neutral, whole-estate view (on-premises, SaaS, software licences, vendors, workforce, applications), and answers the questions that do not sit in any billing console, such as who owns spend, whether benefits are tracked and whether renewals are challenged |
| **TBM Council Taxonomy** | A standard set of cost pools and technology towers (version 5.0.1, 18 Jul 2025) ([TBM Council](https://www.tbmcouncil.org/taxonomy/), 5 Nov 2026; reuse terms not read) | The established common language for technology financial management, and the right reference for building a cost model | A short diagnostic that tells a client whether a TBM-style baseline and allocation are the gap, and the evidence to start one. Cost IQ cites the taxonomy as a reference only |
| **Analyst benchmarks (Gartner and similar)** | UNVERIFIED by me: I did not open any Gartner or similar benchmark source, so I make no claim about what they contain or cost | Probably peer comparison, which Cost IQ deliberately does not offer (the report states no peer data exists for its dimensions) | UNSOURCED; the owner or a procurement colleague should check before this row is used externally |

**Honest reading.** Cost IQ's edge is not breadth alone, since the FinOps Assessment already extends beyond cloud. It is the combination: cost and value in one diagnostic; no saving counted from self-reported answers; each finding tied to the evidence needed and to a delivery package; one shared cloud number. Where a client only needs a cloud maturity score or a provider's own recommendations, the free options above are the better tool and Cost IQ should say so.

## 4. What Cost IQ deliberately does not do

It does not estimate cloud, AI or SaaS savings: that value is worked out once, by FinOps IQ, and Cost IQ shows that figure unchanged to avoid two numbers for one estate (`BOUNDARY.md`). It sizes no non-cloud saving from questionnaire answers; the one lever (non-SaaS licence true-down) is sized only from a figure the client measured. It makes no peer comparison, gives no legal, tax or regulatory advice, and does not audit the answers it is given.
