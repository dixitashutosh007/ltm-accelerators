# CIO-readiness phase: framework

**Date:** 13 Oct 2026  **Owner:** product owner, with one AI practice-lead agent per domain ([agents](#practice-lead-agents)).

## Goal

Each accelerator must:
- **win LTM a trusted-advisor seat** with the CIO;
- be **clearly distinct**: an LTM USP, not a questionnaire a CIO could get free elsewhere;
- **lead to the next engagement**, whether follow-on advisory work, implementation or transformation.

The phase reviews each accelerator against one scorecard, then fixes it to a CIO-ready, presentable standard.

## Decisions taken (product owner, 13 Oct 2026)

| Topic | Decision |
|---|---|
| Audience | **Both modes.** A consultant-led workshop gives the full depth; a short CIO self-serve mode is the door-opener. One engine; client mode hides scoring internals |
| Commercial link | **Advisory roadmap.** Findings become a sequenced roadmap. A separate **"How LTM can help"** section covers every finding, typed as *advisory* (a follow-on assignment), *implementation* or *transformation*, each with a brief technical execution outline. Example: "LTM's Cloud Transformation practice builds a sovereign landing zone", "LTM migrates applications to a sovereign cloud platform such as OVHcloud". The SOW draft is a consultant-only export |
| Practice names and partners | **Generic practice names** (Cloud Transformation, Sovereign Cloud, FinOps, Resilience Engineering, Data and AI). Providers are named only as options chosen from the client's requirements and shown with alternatives. No partner claims |
| AI | **Server-side on Amazon Bedrock, off by default**, switched on per engagement by the consultant. AI writes narrative from engine outputs only; a grounding check rejects any number or claim not in the engine output. Browser BYOK AI (OpenAI, Anthropic and Gemini keys in the page) is removed |
| Outputs | **Executive PDF report** (branded, server-rendered, with a methodology and sources panel) and **technical backlog** (platform-specific actions as CSV, Jira later) |
| Markets | **EU and UK, US and APAC** first. Regulatory content must be valid for these |
| Hosting | **Stays in AWS Mumbai (ap-south-1).** EU and UK client data is therefore transferred to India, which has no adequacy decision. Workstream S6 covers the transfer basis |
| Sovereign IQ and Posture IQ | **Merged into one accelerator named Sovereign IQ.** "Posture" becomes its compliance-exposure view |
| Order | 1 Sovereign IQ (merged), 2 Cost IQ, 3 Cloud IQ, 4 Strategy IQ, 5 Resilience IQ, then FinOps IQ, FinOps Value Case, Modernization IQ, AI Readiness IQ |
| Reprioritisation (14 Oct 2026) | **FinOps IQ moves to the front.** Sovereign IQ finishes S2 (regulatory sourcing) and then pauses at S3. The FinOps IQ review also maps its overlap with Cost IQ and FinOps Value Case and recommends whether to consolidate them |
| Cost IQ | Fully in scope; no longer maintained separately |
| Practice lead | No human practice leads yet. **One AI practice-lead agent per domain** reviews and advises; the product owner approves. Most review work is automated |
| Data | No LTM engagement history yet. Use **published market data** with source, year and sample size, never presented as LTM peer benchmarks. Back-testing uses **reference scenarios** built from public case studies and regulatory examples |
| CIO pilots | Booked **after** all accelerators are improved |

## Scorecard (13 areas)

Each accelerator is rated **Pass / Partial / Fail** in every area, with evidence. "CIO ready" means Pass in all thirteen, or a Partial the owner has accepted in writing.

| # | Area | Pass criteria |
|---|---|---|
| 1 | **Purpose and distinctness** | It informs one named CIO decision and has a named buyer. It doesn't overlap another LTM accelerator. Its edge over free alternatives is written down (for example AWS Well-Architected, Microsoft and Google assessments, FinOps Foundation maturity, analyst maturity models) |
| 2 | **Functionality** | Works end to end: sign-in, start, save and resume, report, PDF, backlog export. No dead ends, no console errors. Every question renders and can be answered (browser test) |
| 3 | **Questions and answers** | Covers the domain against its reference frameworks. Questions use wording a CIO recognises. Answer options don't overlap and cover every case. "Unknown" is offered and counts as risk. Each question cites what it is based on |
| 4 | **Depth** | Executive mode in 15–20 minutes and a workshop mode with follow-up questions triggered by answers. Both use the same engine and request contract |
| 5 | **Scoring engine** | Passes the automated audit (`npm run audit:engines`): better answers never score worse, no dead questions, every band reachable, missing answers never flatter the result, and labels match what is computed. Golden outputs approved. Practice-lead review recorded |
| 6 | **CIO alignment** | Leads with business outcome, risk exposure and money. Every finding ends in a decision or an action with an owner and a time frame. No tool jargon without a business consequence |
| 7 | **Output** | The PDF and the backlog are produced. Structure: executive summary, findings, roadmap, How LTM can help, technical execution, methodology and sources. Every number traces to an engine field. On-brand |
| 8 | **Sources** | Every claim, constant, benchmark and regulatory statement is in the claims register with source, owner and review date. Published market data shows source, year and sample. CI fails on an overdue review |
| 9 | **Legal validity** | Regulatory statements are correct for EU and UK and for US and APAC as of the review date, citing article or section. "Not legal advice" disclaimer. Client-data handling is documented (S6). Statements are reviewed by qualified counsel before external use |
| 10 | **AI scope and toggle** | Uses the shared Bedrock service only. Off by default, with a per-engagement toggle. Grounding check passes on the eval set. Prompts and outputs are logged. No browser AI and no API keys in the page |
| 11 | **Technical execution** | Findings map to platform playbook entries for each platform the client selected (on-premises, AWS, Azure, GCP, sovereign and other providers) at platform, tech-stack and application level, each with a verification step. Application level states the extra discovery it needs |
| 12 | **Commercial pull-through** | Every finding appears in "How LTM can help", typed advisory, implementation or transformation, with indicative scope and a technical execution outline. A consultant-only SOW draft can be exported. Reads as advice, not sales |
| 13 | **Report defensibility** (added 14 Oct 2026) | A CIO can challenge any number and get a written answer. In detail: (a) **every number traces** to its inputs, formula and source in a "How we calculated this" appendix; (b) **every assumption is in an assumption register** with value, basis (client input / published source with year and sample / LTM heuristic with reasoning), confidence and what changes if it is wrong; (c) **savings and value are ranges** (conservative / expected / upper) with confidence, the expected case is conservative, net of implementation cost, phased over a realistic ramp (not all in year 1) and never called guaranteed; (d) **no inflation**: each lever is capped at the addressable spend and at the published range for that lever, levers don't double count, totals reconcile, and an automated inflation guard in CI fails any output above those caps; (e) **the roadmap is delivery-grade**: workstreams with activities, owner role, duration, dependencies, effort, milestones, KPIs, prerequisites and risks; (f) **consulting-grade presentation**: an executive summary that states situation, issue, recommendation and value with its basis, consistent structure, citations, methodology, version, date, "data provided by" and disclaimers, and no hype language; (g) **CIO challenge test passed**: the practice-lead agent writes the ten hardest questions a CIO would ask of the report (for example "on what basis is this $X saving?") and the report answers each one from its own pages |

## How each accelerator is reviewed

1. **Review.** The domain practice-lead agent reviews the accelerator against the scorecard using trusted sources only. Output: a validation report with Pass / Partial / Fail per area, evidence and cited sources. For area 13 it generates sample reports from the reference clients and audits them as a sceptical CIO would.
2. **Plan.** A phased plan per accelerator (`docs/cio-readiness/<accelerator>/PLAN.md`), in the same form as the Resilience IQ roadmap.
3. **Build.** Each phase lands as a PR with full CI, golden-file diffs and the practice-lead agent's review of the diff.
4. **Approve.** The product owner approves each phase. Regulatory content waits for the counsel gate (area 9) before external use.
5. **Re-review.** The accelerator is re-scored. It is CIO ready when all thirteen areas pass.

## Shared workstreams

Built once and used by every accelerator. Each is planned in detail when the first accelerator needs it.

| # | Workstream | Content |
|---|---|---|
| S1 | **Bedrock AI service** | One server-side service: in-region Bedrock, model set by config, off by default, per-engagement toggle, PII and client-name redaction, grounding check, prompt and output log, LLM eval suite in CI. Removes every browser BYOK AI integration |
| S2 | **Claims register and market data** | Extends `docs/claims-register/` into a versioned register referenced by ID from the engines. Published market data is held with source, year and sample. CI checks review dates. A language lint covers banned phrases |
| S3 | **Platform playbook** | `docs/IMPROVEMENT_PLAN.md` §5.1: control × platform × level catalogue with actions, options, verification and source. Sovereign providers are included as options |
| S4 | **Outputs** | Server-rendered PDF template (LTM Vantage brand) and backlog CSV from the engine result and playbook. Shared by every accelerator |
| S5 | **How LTM can help** | A catalogue of generic offerings, each typed advisory, implementation or transformation, with indicative scope ranges and an execution outline. Findings map to offerings by control ID. A consultant-only SOW draft is built from the selected offerings |
| S6 | **Client-data protection** | Mumbai hosting with EU and UK clients: minimise personal data (today mainly the respondent's email), EU SCCs and UK IDTA or Addendum, a transfer impact assessment and a privacy notice. Retention and deletion of assessments and evidence |
| S7 | **Modes** | Executive and workshop depth on one engine. Client mode hides scoring internals, probes and consultant notes |
| S8 | **Practice-lead agents** | One per domain ([below](#practice-lead-agents)), each with a trusted-source list, the scorecard checklist and a review-pack format |

## Practice-lead agents

Defined in `.claude/agents/`. Each acts as the domain's practice lead and knowledge champion. It reviews against the scorecard, researches only trusted primary sources, cites every claim, never assumes, and labels anything it cannot source. It prepares review packs the product owner approves. It **advises; it does not sign off**: the product owner approves, and qualified counsel reviews regulatory statements before external use.

| Agent | Accelerators |
|---|---|
| `sovereignty-compliance-lead` | Sovereign IQ (merged with Posture IQ) |
| `finops-cost-lead` | Cost IQ, FinOps IQ, FinOps Value Case |
| `cloud-modernization-lead` | Cloud IQ, Modernization IQ |
| `strategy-lead` | Strategy IQ, AI Readiness IQ |
| `resilience-lead` | Resilience IQ |

## Trusted sources policy

In order of preference:
1. **Primary law and regulator material:** EUR-Lex, legislation.gov.uk, eCFR and US federal and state statutes, regulators' guidance and enforcement decisions (EDPB, ICO, EBA/ESMA/EIOPA, ENISA, MAS, APRA, OAIC, NIST and others).
2. **Standards and frameworks:** ISO/IEC, NIST, CSA, FinOps Foundation, TOGAF, ITIL, COBIT.
3. **Official provider documentation and architecture guidance:** AWS, Microsoft, Google, Oracle, IBM, sovereign providers.
4. **Recognised published research with stated method and sample:** for example FinOps Foundation State of FinOps, Flexera State of the Cloud, Uptime Institute, ENISA Threat Landscape, Eurostat, IBM Cost of a Data Breach.
5. **Analyst figures only where publicly quoted, with the citation.**

Blogs, vendor marketing and unsourced statistics are not used. A claim without a source is removed, or labelled "LTM heuristic" with its basis.
