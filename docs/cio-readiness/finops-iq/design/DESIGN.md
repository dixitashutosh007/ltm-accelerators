# FinOps IQ (merged with FinOps Value Case): F1 design pack

**Date:** 14 Oct 2026  **Author:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves this pack (gate F1 in [PLAN.md](../PLAN.md)).

**Status:** approved by the product owner on 14 Oct 2026 with every recommended default (Q1–Q14 in section 13, and the departures from PLAN.md flagged in this pack). Internal consultant use only. Nothing in this pack is a savings commitment, and no figure in it may go to a client before the F4 gate.

**What this pack fixes before any code is written:**
- the decision, buyer and edge;
- the boundary and hand-off with Cost IQ, and the shared capability model and lever library;
- the capability model on the FinOps Framework domains and capabilities, with Crawl / Walk / Run / Not yet / Unknown ratings and targets by scope;
- the scope model (facts);
- the findings model;
- the two modes (executive and workshop) on one engine;
- the merged question set, with every existing FinOps IQ and FinOps Value Case question accounted for;
- the value-model specification that F4 builds, designed to pass area 13 (a) to (g);
- the "How LTM can help" mapping;
- open questions for the owner, each with a recommended default.

**Companion files (same folder), JSON Schema draft 2020-12:** `facts.schema.json`, `capability.schema.json`, `question.schema.json`, `lever.schema.json`, `finding.schema.json`, and `reference-scenarios.json` (five reference scenarios with expected outcomes written before any engine exists, D12).

**Owner decisions applied:** D1 to D15 as recorded in PLAN.md, all recommended defaults accepted on 14 Oct 2026. In particular D1 = option C (FinOps Value Case becomes FinOps IQ's executive mode; Cost IQ stays the whole-estate diagnostic), D2 (per-capability Crawl / Walk / Run, no gated organisation stages), D3 (lever-based conservative / expected / upper, net, phased, capped), D4 (the client's waste estimate is a hypothesis only), D5 (Unknown everywhere, N/A only from scope), D6 (scope by footprint), D9 (client currency), D12 (five reference scenarios), D15 (expected total capped at Flexera 2026's 29% average without client evidence).

**F0 state assumed:** F0 has merged. Value at stake today is only the client's T6 estimate (`basis: client-estimate`) or `not-quantified`. This pack replaces that with the lever model in F4; T6 survives only as the hypothesis question `HY-01`.

---

## 0. Conventions

### 0.1 Source references and verification status

Every framework, provider or market-data statement carries a source reference `[Sn]` (listed in [section 15](#15-sources)) and a verification status. All sources were checked on **14 Oct 2026**.

**Access limits in this session (stated so the owner can weigh the evidence):** direct fetches of finops.org, focus.finops.org, learn.microsoft.com, aws.amazon.com, azure.microsoft.com, cloud.google.com docs and flexera.com failed (DNS resolution blocked or proxy refusal). I did not try to work around this. Verification is therefore through web-search results that quote or link the official page, as in the validation report. F2 re-reads every primary page and assigns claim IDs.

| Status | Meaning |
|---|---|
| **V** | Verified on 14 Oct 2026 from search results that quote or link the official page, consistent with VALIDATION.md section 5 |
| **P** | Primary URL known; the exact wording or figure was not re-read in this session. F2 confirms |
| **S** | Secondary sources only; F2 must confirm against the primary source or remove |
| **LTM heuristic** | A design rule or parameter chosen by LTM, with its reasoning stated. Not a market fact. Shown as such in the report's assumption register |
| **UNSOURCED** | A factual statement not verified. What would settle it is stated. Must be sourced or removed in F2 |

Claim IDs (`CLM-FIN-nnn`) are assigned in F2 (WS-S2 register). This pack uses `[Sn]`; F2 maps each to a claim ID. Assumption IDs (`ASM-FIN-nnn`) are assigned here for value-model and targeting parameters (section 10.10) so F4 can wire them directly.

### 0.2 Naming

| Object | Convention | Example |
|---|---|---|
| Capability | The Cost IQ overlay v7.1.0 ID, unchanged, so both accelerators share one key | `ALLOCATION`, `RATE_OPTIMIZATION` |
| Domain | Overlay IDs `D1` to `D4` | `D3` = Optimize Usage & Cost |
| Question (merged set) | Theme prefix, hyphen, two digits. `SC` scope, `VB` value base (not scored), `UN` Understand Usage & Cost, `QV` Quantify Business Value, `OP` Optimize Usage & Cost, `MP` Manage the FinOps Practice, `HY` hypotheses and outcomes (not scored) | `UN-03`, `OP-07` |
| Legacy question | Prefixed by instrument to avoid the clash between the two banks (both have `C1`, `O1` …) | `FIQ.C1` (FinOps IQ), `FVC.C1` (FinOps Value Case), `CIQ.FIN-07` (Cost IQ) |
| Lever | `LEV-01` to `LEV-10`. PLAN.md's `L1`–`L10` are renamed because FinOps Value Case already uses `L1`–`L4` as question IDs | `LEV-01` commitments |
| Finding | `F-FIN-<CAPABILITY>` for capability gaps; `F-FIN-LEV-nn` for lever opportunities; `F-FIN-SCOPE-<KEY>`, `F-FIN-CONFLICT-nn`, `F-FIN-DECISION-nn` | `F-FIN-ALLOCATION` |
| Offering | `OFF.FIN.*` for the FinOps practice; `OFF.CT.*` Cloud Transformation; `OFF.DAI.*` Data and AI; `REF.*` for routing to another accelerator | `OFF.FIN.TOOLING`, `REF.COST_IQ` |
| Assumption | `ASM-FIN-nnn` | `ASM-FIN-010` |
| Maturity rating | `crawl`, `walk`, `run`, `not_yet`, `unknown`; plus system values `not_in_scope` and `not_assessed` | |

---

## 1. Decision, buyer, edge (final wording)

| | |
|---|---|
| **Decision** | "What FinOps operating model and optimisation programme should we fund for our cloud, AI and SaaS spend, in what order, and what value can it credibly return?" The **executive mode** answers the first half: "Do we need to act now, and roughly how much is at stake?" The **workshop mode** answers the second: "What exactly, by when, owned by whom, and what is it worth, net and phased?" |
| **Buyer** | CIO, with the CFO as co-owner of the value case. Delivery owners: Head of Cloud or CCoE lead, and the FinOps lead (or the person who will become one). Contributors: engineering leads, FP&A, procurement |
| **Edge** (over the free alternatives in VALIDATION.md section 6.3) | 1. **Uses the FinOps Foundation's own model** (domains, capabilities, Crawl / Walk / Run per capability) rather than an invented ladder, adapted under CC BY 4.0 with attribution [S1][S2][S3]. 2. **Scope-aware**: public cloud, AI, SaaS, licensing, private cloud and data centre switch capabilities, levers and follow-ups on, in line with the Framework's Scopes and technology categories [S4]. 3. **Targets that depend on the client's complexity**, following the Foundation's guidance that the goal is the appropriate level per capability, not Run everywhere [S3]. 4. **A sourced, conservative value range by lever**, net of cost and phased, capped at the addressable base and at the provider's published maximum, with an inflation guard in CI (section 10). 5. **Provider tools become evidence**: AWS Cost Optimization Hub, Azure Advisor and Google Cloud Recommender outputs feed lever bases instead of competing with the assessment [S12]. 6. **A platform-specific programme with owners**, typed in "How LTM can help" (section 11), not a generic maturity score |
| **One-line USP (internal)** | "In one consultant-led session, FinOps IQ turns the FinOps Foundation's capability model into a scope-aware maturity profile, a sourced and conservative value range by lever, and a platform-specific programme with owners, using your provider tools' own recommendations as evidence." True only after F3–F9 land |
| **What it is not** | Not a FinOps Foundation assessment, certification or endorsement. Not a billing-data audit (an optional evidence step may come later, D13). Not a whole-estate technology cost review (that is Cost IQ) |

---

## 2. Boundary and hand-off with Cost IQ

### 2.1 Who owns which decision

| | **Cost IQ** | **FinOps IQ (merged)** |
|---|---|---|
| Decision | "Where should we cut, redirect or protect technology spend across the whole estate over the next 12–24 months?" | "What FinOps operating model and optimisation programme should we fund for cloud, AI and SaaS spend, in what order, and what is it worth?" |
| Buyer | CIO with CFO | CIO with CFO; delivered by Head of Cloud/CCoE and FinOps lead |
| Breadth | 16 dimensions: cloud, SaaS, software, infrastructure, workforce, vendors, applications, AI, M&A and others | The FinOps scopes only: public cloud, AI, SaaS and licensing (as FinOps practice, scope-triggered), private cloud and data centre (scope-triggered) |
| Depth on FinOps | 12 supplemental questions (`CIQ.FIN-01` to `FIN-12`), one per capability group; capability overlay v7.1.0 | 22 capabilities, rated per scope, follow-ups, lever bases, platform playbook |
| Value | Addressable spend × opportunity factor × confidence, with evidence gates (`opportunity-recommendation-gates-v7.1.0.json`) | Lever library (section 10), conservative / expected / upper, net and phased |

### 2.2 Shared assets (one source of truth)

1. **Capability model.** The Cost IQ overlay `finops-overlay-v7.1.0.json` (`frameworkDomains`, 4 domains and 22 capabilities; `frameworkMaturity` Crawl / Walk / Run; `technologyCategories`) becomes a shared module, for example `packages/engine-core/src/shared/finops-capabilities.json`. Both engines import it. Display names are corrected in F2 where the overlay differs from the current Framework (section 3.1, note on `AUTOMATION_TOOLS_SERVICES`).
2. **Lever and value library.** The ten levers in section 10, their addressable-base definitions, published caps, ramp and interaction order live in one shared module, for example `packages/engine-core/src/shared/finops-levers.json`. Cost IQ's cloud opportunity for findings `F-005` (cloud consumption leakage) and `F-006` (cloud commitments) is computed from this library when Cost IQ quantifies at all, so **one estate gets one cloud number**.
3. **Published market data** (Flexera, State of FinOps, provider maxima): one WS-S2 register entry each, referenced by both.

### 2.3 Hand-off rules

| From Cost IQ | Goes to FinOps IQ as | Rule |
|---|---|---|
| Recommendation `R-003` "Run a Cloud Economics Diagnostic" | The recommended next step, typed advisory, pointing to a FinOps IQ workshop | Cost IQ's "How LTM can help" names FinOps IQ as the instrument; it does not describe FinOps IQ's offerings itself |
| Findings `F-005`, `F-006` (and `F-019` AI economics when AI is in FinOps scope) | Context on the FinOps IQ start screen ("Cost IQ indicated …") | Not scored in FinOps IQ; the FinOps IQ answers decide |
| `CIQ.FIN-01` … `FIN-12` answers | **Pre-fill suggestions** for the mapped FinOps IQ questions (table in section 7.4), marked "from Cost IQ, confirm" | A pre-fill is never scored until the respondent confirms or changes it. Unconfirmed pre-fills count as blank (coverage), never as answered |
| Scope facts (technology categories, spend bands, providers) | `facts` (section 4) | Spend bands carry over; exact figures override |

| From FinOps IQ | Goes to Cost IQ as | Rule |
|---|---|---|
| Capability profile | Replaces Cost IQ's FinOps capability maturity for the same client and date, when newer | Cost IQ shows "per FinOps IQ of <date>" |
| Lever value (expected, net) | Cost IQ shows it as the cloud line, **not added again** to its own opportunity | Reconciliation test: Cost IQ total = Cost IQ non-cloud + FinOps IQ cloud (section 10.9) |
| SaaS portfolio and licence-contract questions beyond FinOps practice (shelfware across the estate, vendor strategy) | Routed back to Cost IQ (`R-004`, `R-007`) via `REF.COST_IQ` | FinOps IQ assesses the Licensing & SaaS **capability** and quantifies `LEV-09` only from client evidence; it does not run a portfolio rationalisation |

**Dependency (from PLAN F1):** the Cost IQ owner confirms the shared capability and lever library. Open question Q1 (section 13).

---

## 3. Capability model (D2)

### 3.1 Domains and capabilities

Adapted from the FinOps Framework by the FinOps Foundation, licensed CC BY 4.0 [S1]. Changes made by LTM: capabilities are rated per scope with LTM question sets; target levels by complexity tier are LTM heuristics; no organisation-level stage is computed. Not endorsed by the FinOps Foundation.

The 2026 Framework (published 19 Mar 2026) keeps four domains and adds **Executive Strategy Alignment** as a new capability in Manage the FinOps Practice; it also deepens **Scopes** and **technology categories** [S5][S4]. The capability list below is the Cost IQ overlay v7.1.0 set [S16], which matches the 2026 capability list recorded in VALIDATION.md row 6 [S2], with one naming caveat.

| Domain | Capability ID (shared with Cost IQ) | Display name | Relevance | Status |
|---|---|---|---|---|
| D1 Understand Usage & Cost | `DATA_INGESTION` | Data Ingestion | always | V |
| | `ALLOCATION` | Allocation | always | V |
| | `REPORTING_ANALYTICS` | Reporting & Analytics | always | V |
| | `ANOMALY_MANAGEMENT` | Anomaly Management | always (overlay: scope; FinOps IQ always has a cloud or AI scope) | V |
| D2 Quantify Business Value | `PLANNING_ESTIMATING` | Planning & Estimating | always | V |
| | `FORECASTING` | Forecasting | always | V |
| | `BUDGETING` | Budgeting | always | V |
| | `KPIS_BENCHMARKING` | KPIs & Benchmarking | always | V |
| | `UNIT_ECONOMICS` | Unit Economics | always (target depends on tier) | V |
| D3 Optimize Usage & Cost | `ARCHITECTING_WORKLOAD_PLACEMENT` | Architecting & Workload Placement | always | V (name confirmed via search of the Foundation's capability text [S2]) |
| | `USAGE_OPTIMIZATION` | Usage Optimization | always | V |
| | `RATE_OPTIMIZATION` | Rate Optimization | always | V |
| | `LICENSING_SAAS` | Licensing & SaaS | scope: SaaS or licensing | V |
| | `SUSTAINABILITY` | Sustainability | scope: client has a sustainability objective, or data centre in scope | V |
| D4 Manage the FinOps Practice | `EXECUTIVE_STRATEGY_ALIGNMENT` | Executive Strategy Alignment (new in 2026) | always | V [S5] |
| | `FINOPS_PRACTICE_OPERATIONS` | FinOps Practice Operations | always | V |
| | `GOVERNANCE_POLICY_RISK` | Governance, Policy & Risk | always | V |
| | `FINOPS_EDUCATION_ENABLEMENT` | FinOps Education & Enablement | always | V |
| | `INVOICING_CHARGEBACK` | Invoicing & Chargeback | always (target depends on tier) | V |
| | `FINOPS_ASSESSMENT` | FinOps Assessment | always | V |
| | `AUTOMATION_TOOLS_SERVICES` | **Display name to confirm in F2.** The 2025 Framework poster shows "FinOps Tools & Services"; I could not confirm whether 2026 renamed it to include "Automation" | always | **P** (what settles it: the 2026 capabilities page on finops.org) |
| | `INTERSECTING_DISCIPLINES` | Intersecting Disciplines | always | V |

**Phases** (Inform, Optimize, Operate) are shown as context, not scored [S1]. **Principles** (overlay `P1`–`P6`) are cited in question bases, not scored.

### 3.2 Rating scale

| Rating | Index | Meaning (paraphrase of the Foundation's Crawl / Walk / Run characteristics [S3], status P: F2 quotes the current wording) |
|---|---|---|
| `not_yet` | 0 | The capability is not performed in any deliberate way. LTM addition: the Foundation's model starts at Crawl, so "Not yet" is labelled LTM |
| `crawl` | 1 | Little reporting and tooling; basic processes and KPIs; understood but not followed by all major teams; focus on easy wins |
| `walk` | 2 | Understood and followed within the organisation; automation and processes cover most requirements; hard edge cases identified, some deliberately not addressed; medium-to-high KPIs |
| `run` | 3 | Understood and followed by all teams; hard edge cases addressed; very high KPIs; automation preferred |
| `unknown` | (0 for gap and risk) | The respondent does not know. **Counts as risk (D5)**: gap computed as if `not_yet`, and the finding is flagged *unconfirmed* with "confirm" as its first action. Displayed as Unknown, never as Not yet |
| `not_answered` (display label for a blank) | (0 for gap and risk) | **Amended (F3 review H1, pending owner confirmation).** An asked maturity question left blank is rated exactly like "Don't know" (rating, gap, findings) and listed in coverage as a blank. Where only blanks cause an Unknown rating, the capability is labelled "Not answered". Its finding is *unconfirmed* and the first action is "Answer and evidence: <questions>". A blank never yields fewer or less severe findings than any answer |
| `not_in_scope` | none | Set only by scope facts (section 4), never by an answer (D5) |
| `not_assessed` | none | **Amended (F3 review H1, pending owner confirmation).** Only for a capability outside the executive question set ("assessed in the workshop"). Excluded from the executive headline count and the need index, and it creates no finding. A blank inside an asked question set is `not_answered`, not `not_assessed` |

**The Foundation's guidance applied** [S3]: maturity describes the complexity of a capability, not how well a team performs; the goal is the appropriate level per capability for the environment, not Run everywhere; maturity can move backwards. So FinOps IQ has **no organisation-level stage and no gating**. An optional "LTM summary" sentence may describe the profile (for example "foundations in place, optimisation at Crawl"); it is derived from the profile and never caps or overrides it.

### 3.3 How a capability is rated

1. Each maturity question maps to **exactly one capability** (section 7). Each option sets a level: `not_yet`, `crawl`, `walk`, `run`, or `unknown`.
2. Questions are **core** (asked whenever the capability is in scope and the mode includes it) or **follow-up** (asked only when its trigger fires).
3. **Capability rating = the lowest level among its answered core questions** (weakest link), **then lowered by at most one level** if any answered non-core question (scope-conditional or follow-up) is below that level. If a capability has no core question for the client (for example `LICENSING_SAAS`), all its asked questions count as core. LTM heuristic, reasoning: a capability is only as mature as its weakest required practice, but a depth question (for example Spot handling inside Rate Optimization) should not pull a mature core practice down several levels; the rule is monotone (a better answer never lowers a rating) and easy to explain ("Rate Optimization: commitments at Run, Spot practice at Crawl, so Walk").
4. **Amended (F3 review M1, pending owner confirmation).** If a **core** question is `unknown` (or blank, step 5), the capability is `unknown`, unless the known answers already rate it `not_yet` (then it is `not_yet`, flagged "partly unconfirmed"). If a **depth** (non-core) question is `unknown` or blank, it counts as `not_yet` for the one-level rule in step 3 and flags the rating *unconfirmed*. So it lowers the capability by one level at most, never more than the worst real answer to the same question. An unconfirmed rating is never counted at or above target.
5. **Amended (F3 review H1, pending owner confirmation).** A blank on an asked question is rated as `unknown` (section 3.2, `not_answered`). If no core question is answered, the capability is therefore `unknown`, shown as "Not answered"; it is never rated from depth answers alone. `not_assessed` applies only to capabilities outside the executive set.
6. Unknown, and so a blank, never scores better than the lowest answered option (audit check F5 item 3). The F3 tests and audit enforce this for every capability, the headline, the need index and the findings, with no exemptions.

**Limit on single-answer influence** (F5 item 2): one answer moves only its own capability. This includes answer-triggered follow-ups: a follow-up is triggered only by an answer in its own capability (section 7.5, amended). A non-core answer moves the capability by at most one level and can only lower it (it adds requirements), never raise it above the core rating. LTM heuristic: depth questions probe whether a claimed level holds.

### 3.4 Targets by complexity tier (LTM heuristic, labelled in every output)

The Foundation says the right level depends on the environment [S3]; it publishes no target table. LTM sets a **default target per capability** from a complexity tier, and the consultant can change any target with a recorded reason (shown in the appendix).

**Complexity tier** (`ASM-FIN-001` to `ASM-FIN-003`, LTM heuristic):

| Points | Rule |
|---|---|
| Spend | In-scope annual spend, USD-equivalent at a consultant-confirmed rate used **only** for tiering (D9: no FX in value figures): < 1M = 0; 1–10M = 1; 10–50M = 2; > 50M = 3 |
| Providers | 2 public cloud providers = +1; 3 or more = +2 |
| Platforms | Kubernetes material (≥ 10% of compute or "most new workloads") = +1; AI scope material (any GPU or model-serving spend, or AI API spend ≥ 5% of in-scope spend) = +1 |
| Scopes | SaaS or licensing in FinOps scope = +1; private cloud or data centre in FinOps scope = +1 |
| Organisation | 5 or more business units or products that consume cloud = +1 |

Tier 1 "Focused" = 0–2 points; Tier 2 "Scaling" = 3–5; Tier 3 "Complex" = 6 or more.

**Reasoning:** each factor multiplies the coordination and data work a capability must do (more providers means more data to normalise and more commitment portfolios; Kubernetes and AI need specific allocation; more business units need allocation and chargeback). The spend points reflect that the absolute value of a capability gap grows with spend. **Sensitivity:** moving one tier changes most targets by one level and therefore the gap count, not the value model (value is lever-based, section 10).

**Default targets** (`ASM-FIN-004`, LTM heuristic; `—` = no default target, capability shown for information unless the consultant sets one):

| Capability | Tier 1 | Tier 2 | Tier 3 | Why Run at Tier 3 (where set) |
|---|---|---|---|---|
| DATA_INGESTION | walk | walk | run | Everything else depends on complete, timely data |
| ALLOCATION | crawl | walk | run | Unallocated spend cannot be owned, charged back or unit-costed |
| REPORTING_ANALYTICS | crawl | walk | run | Many consumers of cost data at this scale |
| ANOMALY_MANAGEMENT | crawl | walk | run | Absolute cost of an undetected spike scales with spend |
| PLANNING_ESTIMATING | crawl | walk | walk | |
| FORECASTING | crawl | walk | run | Board-level budget exposure |
| BUDGETING | crawl | walk | walk | |
| KPIS_BENCHMARKING | crawl | crawl | walk | |
| UNIT_ECONOMICS | — | crawl | walk | |
| ARCHITECTING_WORKLOAD_PLACEMENT | crawl | walk | walk | |
| USAGE_OPTIMIZATION | crawl | walk | run | Largest usage-lever base |
| RATE_OPTIMIZATION | crawl | walk | run | Several commitment portfolios to manage |
| LICENSING_SAAS (scope) | crawl | crawl | walk | |
| SUSTAINABILITY (scope) | — | crawl | crawl | |
| EXECUTIVE_STRATEGY_ALIGNMENT | crawl | walk | walk | |
| FINOPS_PRACTICE_OPERATIONS | crawl | walk | run | A standing practice is needed at this scale |
| GOVERNANCE_POLICY_RISK | crawl | walk | run | Guardrails must be automated across many teams |
| FINOPS_EDUCATION_ENABLEMENT | crawl | crawl | walk | |
| INVOICING_CHARGEBACK | — | crawl | walk | |
| FINOPS_ASSESSMENT | crawl | crawl | walk | |
| AUTOMATION_TOOLS_SERVICES | crawl | walk | walk | |
| INTERSECTING_DISCIPLINES | crawl | crawl | walk | |

**Gap** = target index − current index (Unknown counts as 0). Gap ≤ 0: at or above target, no finding. **Headline:** "N of M in-scope capabilities at or above target (LTM targets for a Tier X estate)", where M counts every in-scope capability including `not_assessed` ones, so a blank never flatters the headline.

### 3.5 KPI thresholds inside answer options

Answer options that use percentages (allocation coverage, commitment coverage of eligible spend, forecast variance, anomaly detection time) are **LTM heuristics** unless F2 finds a Foundation source. VALIDATION.md rows 24, 25, 27 and 28 found none and found internal inconsistencies (70 vs 75, 80 vs 85). This pack fixes one value per threshold (section 7) with the reasoning in the question's basis; F2 records them as `ASM-FIN` entries. **UNSOURCED as Foundation figures**: if F2 finds the Foundation's published example KPIs per maturity stage, those replace these with attribution.

---

## 4. Scope model (facts, D6)

Facts are the client's footprint. They are never scored. They switch capabilities, follow-up questions, levers and playbook entries on or off, and they provide the addressable bases for the value model. Schema: `facts.schema.json`.

### 4.1 Organisation

| Fact | Values | From |
|---|---|---|
| `org.sector` | banking, insurance, capital_markets, public_sector, healthcare, retail, manufacturing, telecom_media, technology_saas, energy_utilities, professional_services, other | `SC-07` (was FinOps IQ client metadata) |
| `org.markets` | eu, uk, us, apac, other (multi) | `SC-07` |
| `org.consumingUnits` | band: 1, 2–4, 5–19, 20+ business units or products consuming cloud | `SC-07` |
| `org.currency` | ISO 4217 code; all amounts in this currency (D9) | `SC-04` |
| `org.tierFxRate` | number, consultant-confirmed, used only for the complexity tier | consultant |

### 4.2 Footprint and spend by scope

| Fact | Values | From |
|---|---|---|
| `footprint.infrastructureMix` | on_premises_only, mostly_dc, balanced_hybrid, mostly_cloud, cloud_native | `SC-01` (was `FVC.E1`) |
| `footprint.publicCloudProviders` | aws, azure, gcp, oci, ibm, alibaba, other_public (multi) | `SC-02` |
| `footprint.scopes` | public_cloud, private_cloud, data_centre, colocation, kubernetes, ai_api, ai_platform_gpu, saas, licensing, data_cloud_platform (multi) | `SC-03`; maps to overlay `technologyCategories` (section 4.4) |
| `spend.byScope.<scope>` | `{ exact }` or `{ band: [low, high] }` or `{ unknown: true }`, annual, client currency | `SC-04` |
| `spend.growth12m` | percent, −25 to +200 | `SC-05` (was `FVC.E5`) |
| `footprint.migration` | stage (planning, early, in_flight, largely, complete) and share still to move in 24 months | `SC-06` (was `FVC.E4`, `FVC.E6`) |

### 4.3 Value bases (workshop; a subset in executive mode)

Each base is an input for one or more levers (section 10). Each accepts exact, a band, or "don't know". **"Don't know" means the lever that needs it is not quantified**; there is no default share without a published source (PLAN F4).

| Fact | Meaning | Used by |
|---|---|---|
| `base.computeShare` | Share of public cloud spend that is compute (VMs, containers' nodes, serverless) | LEV-01, 02, 04, 06 |
| `base.steadyStateShare` | Share of compute that runs most hours of the month at a predictable level | LEV-01 |
| `base.eligibleCoverage` | Share of commitment-eligible usage covered by commitments today (cost-weighted) | LEV-01 |
| `base.nonProdShare` | Share of compute that is non-production | LEV-04 |
| `base.nonProdScheduledShare` | Share of non-production compute already scheduled off outside working hours | LEV-04 |
| `base.interruptionTolerantShare` | Share of compute that could tolerate interruption (batch, CI, stateless) | LEV-06 |
| `base.spotShare` | Share of that tolerant compute already on Spot / preemptible | LEV-06 |
| `base.storageShare`, `base.coldDataShare` | Storage share of spend; share of stored data in a hot tier that is rarely accessed (from provider storage analytics) | LEV-05 |
| `base.dataTransferShare` | Data transfer share of public cloud spend | LEV-08 |
| `base.kubernetesSpend`, `base.kubernetesRequestUtilisation` | Cluster spend; measured average used / requested CPU and memory | LEV-07 |
| `evidence.providerRecommendations[]` | Provider-tool estimated savings, **by recommendation type** (rightsizing, idle, commitments, storage, Graviton/arm and others), source tool, export date | LEV-02, 03, 05, 01 (cross-check) |
| `evidence.saasLicence` | Client-measured unused licences or seats and their annual cost | LEV-09 |
| `evidence.aiGpu` | GPU spend and measured average utilisation; idle model endpoint spend | LEV-10 |
| `cost.internalRate`, `cost.tooling` | Loaded internal cost per FTE-month; annual tooling cost (client inputs) | Net value (section 10.6) |

### 4.4 Scope triggers

The overlay's `technologyCategoryCapabilityTriggers` [S16] are reused. FinOps IQ adds triggers for follow-up questions and levers:

| Scope or fact | Switches on |
|---|---|
| public_cloud (any provider) | LEV-01 to LEV-06, LEV-08; scope-conditional questions `OP-03`, `OP-05` to `OP-09` |
| 2+ public cloud providers, or public cloud plus private cloud / data centre | `UN-03` (normalisation, FOCUS) becomes core |
| kubernetes | LEV-07; `UN-09` (container allocation), `OP-11` (autoscaling and requests) |
| ai_api or ai_platform_gpu | LEV-10; `OP-12` (AI and GPU cost management), `QV-07` (AI unit cost) |
| saas or licensing | LEV-09; `LICENSING_SAAS` in scope; `OP-13`, `OP-14` |
| private_cloud, data_centre, colocation | `SUSTAINABILITY` in scope (as overlay); `UN-02` asks for chargeback data from virtualisation and CMDB; playbook entries for on-premises |
| `base.eligibleCoverage` unknown or < 50%, or `OP-01` answered `crawl` or worse | `OP-02` (commitment portfolio lifecycle), answer-triggered follow-up |
| `QV-05` (unit costs known) answered `crawl` or better. **Amended (F3 review M2, pending owner confirmation):** was `UN-04` ≥ `walk`, which let a better Allocation answer lower Unit Economics. The dependency on Allocation stays in the roadmap (5.4) | `QV-06` (unit economics in decisions), answer-triggered follow-up |
| T6 (`HY-01`) answered | Hypothesis panel beside the model's range (section 10.8) |

**N/A only from scope (D5):** a question whose scope is not in `footprint.scopes` is not asked and its capability is `not_in_scope` (if all its questions are out of scope). No answer option says "not applicable".

---

## 5. Findings model

Schema: `finding.schema.json`.

### 5.1 What creates a finding

| Type | Created when | Example |
|---|---|---|
| `capability_gap` | An in-scope capability's gap (target − current) is ≥ 1 | `F-FIN-ALLOCATION`: Allocation at Crawl, target Walk |
| `lever_opportunity` | A lever is in scope and either quantified (section 10) or identified but not quantifiable for lack of a base ("evidence needed") | `F-FIN-LEV-01`: commitments, expected net value range |
| `scope_confirmation` | A scope fact or value base is Unknown and blocks a capability or lever | `F-FIN-SCOPE-COMPUTE_SHARE`: compute share unknown, LEV-01 not quantified |
| `conflict` (consultant-only) | Two answers contradict (section 7.6) | Allocation "≥ 90% of spend" but "we cannot reliably explain last month's increase" |
| `decision` | An executive decision the report asks for | `F-FIN-DECISION-01`: "Appoint an accountable FinOps owner with a mandate" when `MP-01` is `not_yet` or `crawl` |

A lever opportunity is always linked to the capability gap that blocks it (for example LEV-01 to `RATE_OPTIMIZATION`); the roadmap shows them together, and value sits on the lever only, never on the capability, so it is counted once.

### 5.2 Finding record (fields, per PLAN F1)

| Field | Content |
|---|---|
| `id`, `type` | As section 0.2 and 5.1 |
| `capability` | Capability ID (required for `capability_gap`; the blocking capability for `lever_opportunity`) |
| `scopes` | The scopes it concerns (for example `public_cloud:aws`, `kubernetes`) |
| `current`, `target`, `gap` | Ratings and the integer gap; `target.source` = `tier_default` or `consultant_override` (with reason) |
| `unconfirmed` | true if any contributing answer is Unknown or the rating rests on an unconfirmed Cost IQ pre-fill |
| `severity` | Critical / High / Medium / Low (5.3) |
| `title` | Plain-language, CIO wording, no tool jargon |
| `businessConsequence` | One or two sentences on money, risk or decision speed, written per capability in F2 with claim IDs where they state facts |
| `decisionOrAction` | The decision or action asked for, starting with a verb |
| `ownerRole` | One of: CIO, CFO, FP&A lead, Head of Cloud / CCoE, FinOps lead, engineering leads, platform / SRE lead, procurement / vendor management, product owners, ITAM lead, sustainability lead |
| `timeFrame` | 0–3, 3–6, 6–12 or 12–24 months (5.3) |
| `wave` and `dependsOn` | Roadmap wave (5.4) and the finding IDs it depends on |
| `leverIds` | Linked levers (value lives on the lever) |
| `evidenceToConfirm` | What would confirm or refute the finding (for example "FOCUS export for all accounts, last 3 months") |
| `kpis` | The measures that show it is fixed (for example "% of spend allocated, by cost, monthly"), with the target value labelled LTM heuristic |
| `playbookRefs` | WS-S3 entries per selected platform and level (platform, tech stack, application), each with a verification step (F8) |
| `offeringIds` | WS-S5 offerings (section 11), typed advisory / implementation / transformation |
| `basis` | Claim and assumption IDs behind every statement in the finding |
| `mode` | `executive`, `workshop` or both; executive findings show only the top five by severity |

### 5.3 Severity and time frame (LTM heuristic, `ASM-FIN-005`)

| Step | Rule |
|---|---|
| 1. Start | Gap 1 = Medium; gap 2 = High; gap 3 = Critical |
| 2. Foundation uplift | +1 level (max Critical) for `DATA_INGESTION`, `ALLOCATION` and `FINOPS_PRACTICE_OPERATIONS` at Tier 2 or 3: other capabilities depend on them (5.4) |
| 3. Value uplift | At least High if a linked lever's expected net run-rate value is ≥ 2% of in-scope spend |
| 4. Unknown | Severity unchanged; `unconfirmed: true`; first action is "confirm" with the evidence named |
| 5. Low | Used only for `scope_confirmation` findings that block nothing material, and for capabilities whose default target is `—` but where the consultant set one |
| 6. Decision finding DECISION-01 | **Added (F3 review M4, pending owner confirmation; CLM-FIN-166).** Raised when `MP-01` is Not yet, Crawl, Don't know or blank (unconfirmed for the last two). Severity High, one level higher at Tier 2 or 3, which reproduces RS4 (Critical) and RS5 (High). Owner CIO, wave 1, offering `OFF.FIN.OPMODEL` |

**Amended (F3 review H3, pending owner confirmation).** The F1 "time frame by severity" (Critical 0–3 months … Low 12–24) contradicted the wave windows: for example, a wave 3 finding starting from month 9 was due in 3–6 months. Each finding now carries two fields:
- **`targetDuration`**, the time to complete once started, from severity: Critical 3 months, High 6, Medium 12, Low 24.
- **`start`**, the earliest start month, from the wave and its dependencies (5.4).

`timeFrame` is no longer emitted. **Reasoning:** foundations and high-value levers first. Both fields are planning defaults, shown as such, and the consultant can change them with a reason. Spreading several Critical items by delivery capacity is F7.

### 5.4 Roadmap waves and dependencies (LTM heuristic, drawn from the Framework's Inform → Optimize → Operate flow [S1])

| Wave | Content | Hard dependencies |
|---|---|---|
| 1. Foundations (0–6 months) | Accountable owner and cadence (`FINOPS_PRACTICE_OPERATIONS`); complete data (`DATA_INGESTION`); allocation policy and coverage (`ALLOCATION`); basic anomaly alerts (`ANOMALY_MANAGEMENT`); quick-win levers LEV-03 idle, LEV-04 scheduling and a first commitment tranche of LEV-01 | none |
| 2. Optimise (3–12 months) | `USAGE_OPTIMIZATION` and `RATE_OPTIMIZATION` programmes (LEV-01 full portfolio, LEV-02, 05, 06, 07, 08); `REPORTING_ANALYTICS`; `FORECASTING`; `BUDGETING`; automated guardrails (`GOVERNANCE_POLICY_RISK`) | `ANOMALY_MANAGEMENT` after `DATA_INGESTION`; LEV-02/07 after `ALLOCATION` (owners must accept changes); LEV-01 purchases sized on the base after usage levers (10.4) |
| 3. Value and scale (9–24 months) | `UNIT_ECONOMICS`, `INVOICING_CHARGEBACK`, `KPIS_BENCHMARKING`, `EXECUTIVE_STRATEGY_ALIGNMENT`, `LICENSING_SAAS`, `SUSTAINABILITY`, `INTERSECTING_DISCIPLINES`, `FINOPS_EDUCATION_ENABLEMENT` at scale | `UNIT_ECONOMICS` and `INVOICING_CHARGEBACK` after `ALLOCATION` ≥ Walk |

**Amended (F3 review H3 and M3, pending owner confirmation):**
- **Start.** A finding starts at its wave's window: wave 1 from month 0, wave 2 from month 3, wave 3 from month 9. It never starts before every finding in its `dependsOn` is due to complete (dependency start + `targetDuration`). The registry's dependencies are those of CLM-FIN-162: Anomaly Management, Reporting & Analytics and Forecasting after Data Ingestion; Usage Optimization, Unit Economics, KPIs & Benchmarking and Invoicing & Chargeback after Allocation.
  - **Open item R1 (F3 re-review).** "Due to complete" is too strict for Usage Optimization: in RS5 it starts at month 12, behind a Medium Allocation finding, although 5.4 puts the idle and scheduling quick wins in wave 1 and makes only LEV-02 and LEV-07 depend on Allocation. The re-review recommends gating on the dependency's first milestone, not its completion.
- **Interim owner.** When `MP-01` shows no accountable owner (Not yet, Crawl, Don't know or blank), findings owned by the FinOps lead read "FinOps lead (to be appointed; interim: Head of Cloud / CCoE)". They do **not** depend on DECISION-01: the interim owner starts the work while the appointment, itself a wave 1, month 0 decision, proceeds in parallel.
- The twelve owner roles that the reference scenarios do not cover are LTM defaults (CLM-FIN-162).

The F7 roadmap turns waves into workstreams with activities, owner role, duration, dependencies, effort band, milestones, KPIs, prerequisites and risks (area 13(e)); every item traces to a finding ID.

---

## 6. Modes (WS-S7)

One engine and one request contract. The mode selects the question set and the output depth; it never changes how an answer is scored.

| | **Executive mode** (from FinOps Value Case) | **Workshop mode** (from FinOps IQ, rebuilt) |
|---|---|---|
| Purpose | "Do we need to act now, and roughly how much is at stake?" Door-opener for the CIO or CFO, self-serve or 20 minutes with a consultant | "What exactly, by when, owned by whom, and what is it worth?" Consultant-led with the Head of Cloud, FinOps lead, FP&A and engineering leads |
| Duration | 15–20 minutes | 60–90 minutes per session; may run as two sessions |
| Questions | **18** (section 7.7) plus one optional hypothesis (`HY-01`) | All scope, value-base and maturity questions for the client's scopes, plus answer-triggered follow-ups (7.5); about 45–60 asked for a typical Tier 2 estate (count fixed in F3 tests) |
| Capabilities rated | 8 of 22 (`ALLOCATION`, `ANOMALY_MANAGEMENT`, `FORECASTING`, `UNIT_ECONOMICS`, `RATE_OPTIMIZATION`, `USAGE_OPTIMIZATION`, `FINOPS_PRACTICE_OPERATIONS`, `EXECUTIVE_STRATEGY_ALIGNMENT`); the rest shown as "assessed in the workshop" | All in-scope capabilities |
| Value | LEV-01 and LEV-04 only, when their bases are given (VB-01, VB-02); every other lever "identified, not quantified in executive mode". Confidence at most Medium | All levers with a base or evidence; confidence up to High with provider-tool evidence |
| Outputs | Need verdict (section 9), top five findings, indicative value range with confidence and basis, the client's hypothesis beside it, recommended next step | Full profile, findings, value by lever, delivery-grade roadmap, "How LTM can help", technical execution per platform, "How we calculated this" appendix, backlog CSV |
| Moving between modes | An executive answer set is a valid partial workshop answer set: the workshop starts with those answers filled and confirmed | — |

**Client mode** (D7, WS-S7): server-side omission of scoring internals, consultant probes, conflict findings, consultant notes and fees. No blur, no teaser wall.

---

## 7. Merged question set

### 7.1 Rules

1. **Scope (`SC`) and value-base (`VB`) questions set facts and are never scored.** Hypothesis questions (`HY`) are never scored and never feed value (D4).
2. **Each maturity question rates exactly one capability.** Options are ordered, do not overlap, and cover every case; every maturity question offers **"Don't know"** (= `unknown`, counted as risk, D5). There is no "not applicable" option: N/A comes only from scope.
3. Every question carries its **basis**: the Framework capability it adapts [S1][S2], and the `ASM-FIN` ID for any threshold in its options (3.5). F2 replaces `[Sn]` with claim IDs.
4. Wording a CIO recognises: business words first, tool names only as examples, with alternatives ("for example AWS Data Exports, Azure Cost Management exports, Google Cloud Billing export").
5. Columns below: **M** = mode (E executive and workshop, W workshop only); **K** = kind (core; scope = asked when the scope is present; FU = answer-triggered follow-up). Option wording is indicative; F2 finalises wording and claim IDs.

### 7.2 Scope and value-base questions (not scored)

| ID | M | Question | Answer form | Feeds | Legacy |
|---|---|---|---|---|---|
| SC-01 | W | Which best describes your infrastructure today? | on-premises only / mostly data centre / balanced hybrid / mostly cloud / cloud-native | `footprint.infrastructureMix` | FVC.E1 |
| SC-02 | E | Which public cloud providers do you use or plan to use? | multi: AWS, Azure, Google Cloud, Oracle Cloud (OCI), IBM Cloud, Alibaba Cloud, other public cloud, none yet | `footprint.publicCloudProviders` | FVC.E2 |
| SC-03 | E | Which of these are part of the spend you want FinOps to cover? | multi: private cloud, own data centre, colocation, Kubernetes / containers, AI APIs (tokens), AI platforms or GPUs, SaaS, software licensing, data cloud platforms | `footprint.scopes` | new (FinOps IQ collected clouds and stack but never used them) |
| SC-04 | E | Roughly what is your annual spend in each of these areas, and in which currency? | matrix: one row per selected scope; exact or band; "don't know" per row; currency once | `spend.byScope`, `org.currency` | FVC.E3 |
| SC-05 | E | How do you expect this spend to change over the next 12 months? | percent, −25 to +200, "don't know" | `spend.growth12m` | FVC.E5 |
| SC-06 | W | Where are you in moving workloads to cloud, and how much is still to move in the next 24 months? | stage (5 options) + percent | `footprint.migration` | FVC.E4 + FVC.E6 |
| SC-07 | E | About your organisation: sector, markets, and how many business units or products consume cloud | sector list; markets multi; units band | `org.*` | FinOps IQ client metadata (sector); new |
| VB-01 | E | Of your public cloud spend, roughly what share is compute; of that, how much runs steadily most of the month; and how much is non-production? | three bands each: < 25%, 25–49%, 50–74%, ≥ 75%, don't know (exact allowed in workshop) | `base.computeShare`, `base.steadyStateShare`, `base.nonProdShare` | new |
| VB-02 | E | What share of commitment-eligible usage is covered by commitments today (Savings Plans, reservations, committed use discounts), measured by cost? | percent or band (< 25, 25–49, 50–74, ≥ 75), don't know | `base.eligibleCoverage` | FIQ.O1 (number part) + FVC.C2 |
| VB-03 | W | Of non-production compute, what share is already switched off outside working hours? What share of compute could tolerate interruption, and how much of that already runs on Spot / preemptible capacity? | three percents or bands, don't know | `base.nonProdScheduledShare`, `base.interruptionTolerantShare`, `base.spotShare` | FIQ.O4 (share part) + new |
| VB-04 | W | What share of public cloud spend is storage, and data transfer? What share of hot-tier data is rarely accessed (from your storage analytics)? | percents or bands, don't know | `base.storageShare`, `base.dataTransferShare`, `base.coldDataShare` | new |
| VB-05 | W (FU) | Do you have current savings estimates from your provider tools, by type? (for example AWS Cost Optimization Hub or Compute Optimizer, Azure Advisor, Google Cloud Recommender, OCI Cloud Advisor) | rows: recommendation type, tool, annual estimate, export date; optional | `evidence.providerRecommendations` | new |
| VB-06 | W (scope: kubernetes) | Annual cluster spend, and measured average used-versus-requested CPU and memory | amount; two percents, don't know | `base.kubernetesSpend`, `base.kubernetesRequestUtilisation` | new |
| VB-07 | W (scope: AI) | GPU and model-serving spend, measured average GPU utilisation, and spend on idle endpoints | amounts, percent, don't know | `evidence.aiGpu` | new |
| VB-08 | W (scope: SaaS or licensing) | Measured unused or under-used licences and seats, with annual cost | amount, source, date, don't know | `evidence.saasLicence` | new |
| VB-09 | W | Loaded internal cost per FTE-month, and annual FinOps tooling cost (current and planned) | amounts, don't know | `cost.internalRate`, `cost.tooling` | new |

### 7.3 Maturity questions

Level codes in the option column: **R** run, **W** walk, **C** crawl, **N** not yet; every question also has **"Don't know"** (unknown).

#### D1 Understand Usage & Cost

| ID | Capability | M | K | Question | Options (R / W / C / N) | Basis | Legacy |
|---|---|---|---|---|---|---|---|
| UN-01 | DATA_INGESTION | W | core | Is detailed billing and usage data for **all** accounts and subscriptions exported automatically to one central store you control? | R: all accounts, at least daily, in a common schema, with completeness checks / W: all major accounts, automated, gaps known / C: some accounts, or manual downloads / N: console views only | [S2]; provider exports [S15] | FIQ.C2 |
| UN-02 | DATA_INGESTION | W | scope: private cloud, data centre | Do private cloud and data centre costs reach the same cost model as cloud (from virtualisation, CMDB and finance data)? | R: same model, refreshed monthly or better / W: same model, quarterly / C: separate spreadsheet / N: not costed | [S2][S4] | new |
| UN-03 | DATA_INGESTION | W | core when 2+ providers or hybrid; otherwise not asked | Is cost data from different providers normalised into one model, for example the FOCUS specification? | R: FOCUS (current ratified version) or equivalent model for all sources / W: most sources normalised / C: per-provider data reconciled by hand / N: not comparable | FOCUS 1.4 ratified 4 Jun 2026 [S6]; version is a volatile item (D14) | FIQ.I3 |
| UN-04 | ALLOCATION | E | core | What share of spend, **measured by cost**, is allocated to an accountable owner (team, product or cost centre) by agreed rules: tags or labels, account structure, shared-cost rules? | R: ≥ 90% / W: 70–89% / C: 40–69% / N: < 40% or not measured | `ASM-FIN-020` (LTM heuristic; resolves the 80/85 inconsistency, VALIDATION row 25) | FIQ.I2 + FVC.V1 + FVC.V2 |
| UN-05 | ALLOCATION | W | core | Is there a documented allocation policy (mandatory tags or labels, account and subscription hierarchy with named owners, rules for shared costs) and is it kept current? | R: documented, owners for every account, shared-cost rules applied automatically, reviewed / W: documented and mostly applied / C: informal conventions / N: none | [S2] | FIQ.I1 + FIQ.C5 + FIQ.C1 (owner part) |
| UN-09 | ALLOCATION | W | scope: kubernetes | Are container platform costs allocated to teams or products (by namespace, label or workload), including idle and shared cluster cost? | R: allocated including idle and shared, reconciled to the bill / W: allocated by namespace, idle unallocated / C: rough splits / N: one shared pool | [S2] | FIQ.O3 |
| UN-07 | REPORTING_ANALYTICS | W | core | Can engineering, product and finance teams see their own cost data themselves, without raising a request? | R: self-service, filtered to their scope, all three groups / W: self-service for some groups / C: periodic reports on request / N: no visibility | [S2]; principle P4 [S16] | FIQ.I4 + FIQ.C4 + FVC.O3 |
| UN-08 | REPORTING_ANALYTICS | W | core | Which of these do the relevant owners receive on a regular schedule? (cost by team or product; forecast; anomaly alerts; unit cost trend; commitment coverage and utilisation) | multi-select. R: all five / W: three or four / C: one or two / N: none | `ASM-FIN-021` (count rule, LTM heuristic) | FVC.V5 + FIQ.I5 |
| UN-10 | ANOMALY_MANAGEMENT | E | core | How are unexpected cost increases detected and acted on? | R: automated detection on all accounts, routed to the owner, triaged within one business day / W: automated detection on major accounts, reviewed at least weekly / C: static budget or threshold alerts only / N: found on the invoice | `ASM-FIN-022` (time to triage, LTM heuristic; VALIDATION row 27) | FIQ.I6 + FIQ.C3 |
| UN-11 | ANOMALY_MANAGEMENT | E | core | When the bill goes up, how long does it take to explain why, with the business or technical cause? | R: same day / W: a few days / C: weeks, and the answer is contested / N: we cannot reliably explain it | [S2] | FVC.V3 + FIQ.I8 |

#### D2 Quantify Business Value

| ID | Capability | M | K | Question | Options (R / W / C / N) | Basis | Legacy |
|---|---|---|---|---|---|---|---|
| QV-01 | FORECASTING | E | core | Over the last 12 months, how far did actual spend differ from forecast or budget, on average per quarter? | R: within ±5% / W: ±5–15% / C: ±15–30% / N: more than ±30%, or no forecast | `ASM-FIN-023` (LTM heuristic; VALIDATION row 28 found no Foundation ladder) | FIQ.A8 + FVC.P1 |
| QV-02 | FORECASTING | W | core | How is the forecast built? | R: driver-based (business volumes, migrations, launches), reviewed monthly with finance / W: trend plus known changes, quarterly / C: last year plus a percentage / N: none | [S2] | FVC.P3 (confidence rating replaced by method) |
| QV-03 | BUDGETING | W | core | Do teams have budgets for their cloud spend, with alerts and a review when they are exceeded? | R: budgets per owner, alerts, variance reviewed monthly, linked to forecasts / W: budgets for major owners with alerts / C: one central budget / N: none | [S2] | FVC.C1 (budgets option) + FIQ.C3 (budget part) |
| QV-04 | PLANNING_ESTIMATING | W | core | Before a new workload or major change goes ahead, is its running cost estimated and approved? | R: estimate required and automated in the delivery pipeline, compared with actuals after launch / W: required for major changes / C: occasional / N: not done | [S2] | FIQ.A9 (as the Run option) + new |
| QV-05 | UNIT_ECONOMICS | E | core | Do you know what it costs to serve one customer, transaction or unit of output, and is it trended? | R: defined unit costs for key products, trended monthly, used in decisions / W: defined and reported quarterly / C: calculated once or ad hoc / N: not known | [S2] | FIQ.T2 + FVC.V4 |
| QV-06 | UNIT_ECONOMICS | W | FU (QV-05 ≥ C; amended, F3 review M2, pending owner confirmation) | Do unit costs inform pricing, product roadmap or architecture decisions? | R: routinely, with cost-to-serve per customer or tenant / W: in major decisions / C: occasionally / N: never | [S2] | FIQ.T4 + FIQ.T8 |
| QV-07 | UNIT_ECONOMICS | W | scope: AI | Do you know the cost per inference, per 1,000 tokens or per AI use case? | R: per use case, trended, compared with value / W: per use case, occasionally / C: total AI spend only / N: not known | [S4] (AI technology category) | new (FIQ.A4 token part) |
| QV-08 | KPIS_BENCHMARKING | W | core | Is there an agreed set of FinOps KPIs (for example allocation %, eligible commitment coverage and utilisation, forecast variance, unit cost) reviewed by leaders, and compared with published benchmarks? | R: KPI set with targets, reviewed monthly by executives, benchmarked against published data / W: KPI set reviewed quarterly / C: a few metrics, ad hoc / N: none | [S2] | FIQ.T5 (peer leaderboards replaced by published benchmarks) |

#### D3 Optimize Usage & Cost

| ID | Capability | M | K | Question | Options (R / W / C / N) | Basis | Legacy |
|---|---|---|---|---|---|---|---|
| OP-01 | RATE_OPTIMIZATION | E | core | How are commitment discounts (Savings Plans, reservations, committed use discounts) managed? | R: one central portfolio, purchases sized from forecasts, utilisation and expiry managed continuously / W: central, reviewed at least quarterly / C: ad hoc purchases by individual teams / N: none bought | [S2]; [S9][S11][S13] | FIQ.O1 (practice part) |
| OP-02 | RATE_OPTIMIZATION | W | FU (VB-02 unknown or < 50%, or OP-01 ≤ C) | How is the commitment portfolio's lifecycle handled: expiry dates, utilisation drift, renewals? | R: staggered terms, alerts on utilisation and expiry, renewal decisions planned / W: tracked in a register, reviewed quarterly / C: renewed reactively; some lapse unnoticed / N: not tracked | [S2] | FIQ.O6 |
| OP-03 | RATE_OPTIMIZATION | W | scope: public cloud | Are enterprise agreements and negotiated pricing with providers managed against usage forecasts? | R: negotiated with forecasts, commitments tracked, renewal planned 6+ months ahead / W: negotiated at renewal with usage data / C: renewed as offered / N: list prices only | [S2] | new |
| OP-08 | RATE_OPTIMIZATION | W | scope: public cloud | Is Spot or preemptible capacity used for workloads that tolerate interruption, with automated handling of interruptions? | R: default for tolerant workloads, automated draining and diversified capacity / W: used for selected batch or CI with handling / C: occasional, manual / N: not used | [S10]; status P for Azure and Google equivalents | FIQ.A7 + FIQ.O4 (practice part) |
| OP-04 | USAGE_OPTIMIZATION | E | core | How often are rightsizing and modernisation recommendations (for example newer instance generations) reviewed and acted on? | R: at least monthly, tracked to verified savings, part of normal engineering work / W: quarterly, some actioned / C: ad hoc / N: rarely or never | [S2]; [S12] | FIQ.O2 + FIQ.O10 + FVC.C1 (rightsizing option) |
| OP-05 | USAGE_OPTIMIZATION | E | scope: public cloud | When did you last systematically remove idle or orphaned resources (unattached disks, old snapshots, idle load balancers, unused IPs)? | R: continuously, automated / W: within the last quarter, by routine / C: over a quarter ago, or only during clean-ups / N: never, or not known to have happened | [S2] | FIQ.I7 + FVC.C3 |
| OP-06 | USAGE_OPTIMIZATION | E | scope: public cloud | Are non-production environments switched off outside working hours by default? | R: default schedule on all non-production, exceptions approved / W: for some teams / C: manual requests to engineers / N: run 24/7 | [S2] | FIQ.A2 + FVC.C1 (shutdown option) |
| OP-07 | USAGE_OPTIMIZATION | W | scope: public cloud | Do automated lifecycle policies move data to cheaper storage tiers and expire old snapshots and backups? | R: on all storage, reviewed / W: on primary stores / C: occasional manual clean-up / N: none | [S2] | FIQ.A3 |
| OP-09 | USAGE_OPTIMIZATION | W | scope: public cloud | Is data transfer (between zones and regions, to the internet and on-premises) monitored and designed for cost? | R: monitored per service, private endpoints and local routing by design / W: top flows optimised / C: known to be high, not reviewed / N: not monitored | [S2] | FIQ.O7 + FVC.C5 |
| OP-11 | USAGE_OPTIMIZATION | W | scope: kubernetes | Are container resource requests and cluster capacity tuned to actual use (autoscaling, request rightsizing)? | R: automated request tuning and node autoscaling, utilisation reviewed / W: autoscaling, requests tuned occasionally / C: static, generous requests / N: no requests or limits set | [S2] | FIQ.A5 |
| OP-12 | USAGE_OPTIMIZATION | W | scope: AI | Are AI and GPU costs managed: GPU utilisation tracked, idle endpoints shut down, model choice reviewed for cost? | R: all three, with owners / W: tracked, some action / C: AI spend visible as a total only / N: not managed | [S4] | FIQ.A4 (rewritten: "no AI" is now a scope fact) |
| OP-10 | ARCHITECTING_WORKLOAD_PLACEMENT | W | core | Is expected cost (and unit cost) a required criterion in architecture reviews and workload placement decisions (cloud, private cloud, data centre)? | R: required, with a cost model, compared after go-live / W: required for major designs / C: discussed informally / N: not considered | [S2] | FIQ.O5 |
| OP-13 | LICENSING_SAAS | W | scope: SaaS or licensing | Is there a current inventory of SaaS subscriptions and licences with owners, usage and renewal dates? | R: complete, usage-based, renewals planned / W: major vendors covered / C: partial list / N: none | [S2]; State of FinOps 2026 scope shares [S7] | new |
| OP-14 | LICENSING_SAAS | W | scope: licensing | Are licence entitlements in cloud tracked and used (bring-your-own-licence, hybrid benefits, licence-included versus BYOL choices)? | R: tracked and optimised per workload / W: tracked for major products / C: known, not tracked / N: not considered | [S2] | new |
| OP-15 | SUSTAINABILITY | W | scope | Is carbon or energy data reviewed alongside cost in optimisation and placement decisions? | R: routinely, with targets / W: for major decisions / C: reported, not used / N: not considered | [S2] | new (Cost IQ FIN-03 pre-fill) |

#### D4 Manage the FinOps Practice

| ID | Capability | M | K | Question | Options (R / W / C / N) | Basis | Legacy |
|---|---|---|---|---|---|---|---|
| MP-01 | FINOPS_PRACTICE_OPERATIONS | E | core | Who is formally accountable for cloud and technology spend governance? | R: a named FinOps lead or team with a written mandate and executive sponsor / W: a named owner, part-time / C: shared and unclear, or the CIO by default / N: no one | [S2] | FIQ.C7 + FVC.O1 |
| MP-02 | FINOPS_PRACTICE_OPERATIONS | W | core | Is there a regular cost review with engineering and finance, and who explains the bill to the CFO? | R: monthly review at team and executive level; a cost owner explains with data / W: quarterly; central IT explains on request / C: ad hoc, when budgets are exceeded / N: none; finance interprets the bill alone | [S2] | FIQ.I9 + FVC.P4 |
| MP-03 | FINOPS_PRACTICE_OPERATIONS | W | core | Is cost optimisation work planned in engineering backlogs with estimated value? | R: dedicated items with value, prioritised alongside features, tracked to verified savings / W: items created, often deprioritised / C: only when finance escalates / N: none | [S2] | FIQ.O9 |
| MP-04 | EXECUTIVE_STRATEGY_ALIGNMENT | E | core | Can leadership show the board that cloud spend is delivering the value in its business case, and are cost, speed and value trade-offs made explicitly? | R: quantified, trended evidence; trade-offs decided at an executive forum / W: partly, by project / C: anecdotal / N: not currently, or never asked | [S5] | FVC.L1 + FVC.L2 |
| MP-05 | EXECUTIVE_STRATEGY_ALIGNMENT | W | core | Is cost efficiency written into objectives for engineering teams and senior leaders? | R: in team objectives and leadership performance measures / W: in leadership objectives only / C: informally / N: not at all | [S5] | FIQ.A6 + FIQ.T7 + FVC.O4 |
| MP-06 | GOVERNANCE_POLICY_RISK | W | core | Are cost policies enforced automatically (for example mandatory tags, allowed regions and sizes, budget guardrails) through policy as code? | R: preventive controls on all accounts / W: detective (audit mode) with follow-up / C: some repositories or accounts / N: none | [S2] | FIQ.A1 + FVC.C1 (enforced tagging option) |
| MP-07 | GOVERNANCE_POLICY_RISK | W | core | Are production and non-production separated into distinct accounts or subscriptions with clear billing boundaries? | R: strictly separated / W: separated by resource group or network within shared accounts / C: partly mixed / N: shared | [S2] | FIQ.C6 |
| MP-08 | FINOPS_EDUCATION_ENABLEMENT | W | core | Do engineers, product owners and finance staff get FinOps training and recognition for cost improvements? | R: role-based training for all three groups, recognition built into team rituals / W: training for some groups / C: occasional sessions / N: none | [S2] | FIQ.O8 (gamification wording removed) |
| MP-09 | INVOICING_CHARGEBACK | W | core | Is cloud cost shown back or charged back to business units' P&L? | R: automated chargeback with monthly journal entries / W: showback with budget accountability / C: rough percentage splits / N: absorbed centrally | [S2] | FIQ.T1 + FVC.C1 (showback option) |
| MP-10 | INVOICING_CHARGEBACK | W | core | Are provider invoices reconciled to the cost data, and does cost data flow into finance systems (ERP, BI, planning)? | R: automated reconciliation and integration / W: reconciled monthly, BI integrated / C: manual, partial / N: separate | [S2]; FOCUS 1.4 Invoice Detail dataset [S6] | FIQ.T3 |
| MP-11 | FINOPS_ASSESSMENT | W | core | Does the organisation periodically assess its FinOps practice against a framework and act on the results? | R: at least annually, with a tracked improvement plan / W: assessed once, partly acted on / C: informal / N: never | [S2] | new (Cost IQ FIN-06 pre-fill) |
| MP-12 | AUTOMATION_TOOLS_SERVICES | W | core | Are FinOps tools selected against requirements and integrated (data, allocation, anomaly, commitment management, automation of routine actions)? | R: integrated tool set, routine actions automated / W: tools for most needs, some integration / C: native consoles and spreadsheets / N: none | [S2] | new (Cost IQ FIN-08, FIN-11 pre-fill) |
| MP-13 | INTERSECTING_DISCIPLINES | W | core | Does FinOps work with ITAM, ITFM, procurement, security, sustainability and architecture on shared data and decisions? | R: joint processes and shared data with most / W: with some / C: informal contact / N: none | [S2] | new (Cost IQ FIN-10 pre-fill) |

### 7.4 Hypothesis and outcome questions (not scored, never value inputs)

| ID | M | Question | Use | Legacy |
|---|---|---|---|---|
| HY-01 | E (optional) | What share of your cloud spend do you believe is wasted (idle, oversized or unused)? Unallocated spend is **not** counted as waste | bands: < 5%, 5–9%, 10–19%, 20–29%, ≥ 30%, don't know. Shown beside the model's range with the difference explained (10.8). Never an input (D4) | FIQ.T6 (rewritten: unallocated separated from waste; "world-class" wording removed) |
| HY-02 | W | Rank these cost concerns, most concerning first | concerns ranked; orders the executive summary's emphasis | FVC.C4 |
| HY-03 | W | How often has an unexpected cloud bill needed explaining to finance or the board in the last year? | urgency signal (section 9) | FVC.P2 |
| HY-04 | W | Distribute 100 points across where responsibility for cloud cost actually sits today (engineering, finance, central IT, nobody) | shown in the report; "nobody" share is an urgency signal | FVC.O2 |
| HY-05 | W | If finance asked today whether cloud spend is under control, how comfortable would you be answering? | urgency signal | FVC.L3 |
| HY-06 | W | What would a good outcome look like in 12 months? | ambition: the consultant may raise targets by one level for the related capabilities, recorded as an override | FVC.L4 |
| HY-07 | E (optional) | Anything else about your cost position we should understand? | free text, consultant view only; never sent to AI (F10) | FVC.X1 |

### 7.5 Answer-triggered follow-ups (workshop)

| Trigger | Follow-up | Why |
|---|---|---|
| VB-02 unknown or < 50%, or OP-01 ≤ Crawl | OP-02 commitment lifecycle | Low or unknown coverage usually means lifecycle gaps; also checks lapses |
| QV-05 ≥ Crawl. **Amended (F3 review M2, pending owner confirmation)**; was UN-04 ≥ Walk | QV-06 unit economics in decisions | Unit costs must exist before they can inform decisions. A trigger inside the same capability keeps the rating monotone. The dependency on Allocation is a roadmap dependency (5.4), not a trigger |
| OP-04 or OP-05 ≤ Walk | VB-05 provider-tool evidence | Needed to quantify LEV-02 and LEV-03 |
| OP-06 or OP-08 answered | VB-03 shares | Bases for LEV-04 and LEV-06 |
| Scope kubernetes | UN-09, OP-11, VB-06 | Kubernetes allocation and efficiency (PLAN F1) |
| Scope AI | OP-12, QV-07, VB-07 | GPU idle and token attribution (PLAN F1) |
| Scope SaaS or licensing | OP-13, OP-14, VB-08 | Licensing & SaaS capability (PLAN F1) |
| 2+ providers or hybrid | UN-03 becomes core | Normalisation matters only with several sources |
| Scope private cloud or data centre | UN-02, OP-15 | Hybrid cost model; sustainability scope |

### 7.6 Conflict probes (consultant-only)

| ID | Condition | Probe shown to the consultant |
|---|---|---|
| CP-1 | UN-04 = Run and UN-11 ∈ {Crawl, Not yet} | "Allocation is ≥ 90% but increases cannot be explained: check how allocation is measured (by cost, not resource count)" |
| CP-2 | OP-01 = Run and VB-02 unknown | "Central portfolio claimed but coverage unknown: ask for the coverage and utilisation report" |
| CP-3 | UN-10 ≥ Walk and HY-03 = recurring | "Detection claimed, yet unexpected bills recur: check routing and response" |
| CP-4 | QV-01 = Run and QV-02 ∈ {Crawl, Not yet} | "±5% variance with a last-year-plus-percentage method: check the comparison period" |
| CP-5 | MP-06 = Run and UN-04 ≤ Crawl | "Preventive tag policies but low allocation: check coverage of shared and untaggable costs" |

A probe never changes a rating. It creates a `conflict` finding for the consultant to resolve before the report is issued.

### 7.7 Executive question set (18, plus one optional)

SC-02, SC-03, SC-04, SC-05, SC-07, VB-01, VB-02, UN-04, UN-10, UN-11, QV-01, QV-05, OP-01, OP-04, OP-05, OP-06, MP-01, MP-04; optional HY-01 (and the free-text HY-07).

**Timing basis:** about 45–60 seconds per question (FinOps Value Case's existing pacing; to be measured in F6 browser tests) gives 14–18 minutes for 18 questions. LTM heuristic until measured.

### 7.8 Cost IQ pre-fill map

| Cost IQ question | Pre-fills (suggestion only, must be confirmed) | Capability |
|---|---|---|
| CIQ.FIN-01 | UN-03 | DATA_INGESTION, REPORTING_ANALYTICS |
| CIQ.FIN-02, FIN-04 | QV-05, QV-08 | UNIT_ECONOMICS, KPIS_BENCHMARKING |
| CIQ.FIN-03 | OP-15 | SUSTAINABILITY |
| CIQ.FIN-05 | QV-02, QV-03, QV-04 | FORECASTING, BUDGETING, PLANNING_ESTIMATING |
| CIQ.FIN-06 | MP-01, MP-08, MP-11 | PRACTICE_OPERATIONS, EDUCATION, ASSESSMENT |
| CIQ.FIN-07 | MP-09, MP-10, UN-05 | INVOICING_CHARGEBACK, ALLOCATION |
| CIQ.FIN-08 | MP-06, MP-12 | GOVERNANCE, AUTOMATION_TOOLS_SERVICES |
| CIQ.FIN-09 | MP-04 | EXECUTIVE_STRATEGY_ALIGNMENT |
| CIQ.FIN-10 | MP-13 | INTERSECTING_DISCIPLINES |
| CIQ.FIN-11 | OP-04 | USAGE_OPTIMIZATION |
| CIQ.FIN-12 | OP-01, OP-03 | RATE_OPTIMIZATION |

Cost IQ options are five-point semantic scales; F3 defines the option-to-level suggestion table, and the pre-fill is shown as "Cost IQ suggests: Walk. Confirm or change."

---

## 8. Old-to-new question map

**Dispositions:** **Kept** (same intent, wording tidied); **Rewritten** (same capability, materially new wording or options); **Merged** (combined with other questions into one); **Split** (parts go to different questions); **Moved** (to a non-scored role or another accelerator); **Dropped** (with reason). Counts: FinOps IQ 44 of 44 accounted for; FinOps Value Case 29 of 29.

### 8.1 FinOps IQ (KB schema 2.2.0, 44 questions)

| Old | Old capability label (not a Framework name) | Disposition | New | Reason |
|---|---|---|---|---|
| FIQ.C1 | Account & Identity Governance | Merged / part moved | UN-05 (owner part) | Duplicate of C5 for ownership (PLAN F1). The least-privilege billing-access part is security hygiene and moves to Cloud IQ's security baseline (Q6) |
| FIQ.C2 | Cost Data Ingestion | Kept | UN-01 | Provider-neutral wording; adds "all accounts" and completeness |
| FIQ.C3 | Budgeting & Anomaly Alerting | Split | UN-10 (static alerts = Crawl), QV-03 (budgets) | Two capabilities in one question |
| FIQ.C4 | Cross-Functional Collaboration | Merged | UN-07 | Finance self-service is part of self-service visibility |
| FIQ.C5 | Account & Subscription Governance | Merged | UN-05 | Ownership registry is part of the allocation policy |
| FIQ.C6 | Cloud Architecture & Boundaries | Kept | MP-07 | Governance boundary (PLAN F1) |
| FIQ.C7 | FinOps Enablement & Team Structure | Merged | MP-01 | Same intent as FVC.O1 |
| FIQ.C8 | Multi-Cloud Account Isolation | Moved | Cloud IQ (security baseline) | Root MFA and payer-account security is a security control, not a FinOps capability (PLAN F1). Needs the Cloud IQ owner's acceptance (Q6) |
| FIQ.I1 | Cost Allocation & Metadata | Merged | UN-05 | Policy part of allocation |
| FIQ.I2 | Cost Allocation Coverage | Merged | UN-04 | Coverage now measured **by cost**; thresholds fixed at 40/70/90 (`ASM-FIN-020`) |
| FIQ.I3 | Data Normalization & FOCUS | Rewritten | UN-03 | "FOCUS 1.0" outdated; current ratified version is 1.4 [S6]; core only for multi-source estates |
| FIQ.I4 | Data Analysis & Showback | Merged | UN-07 | Self-service visibility |
| FIQ.I5 | Showback Cadence | Merged | UN-08 | Scheduled report set |
| FIQ.I6 | Anomaly Management | Merged | UN-10 | With C3's alert part |
| FIQ.I7 | Waste Management & Orphan Discovery | Merged | OP-05 | Same intent as FVC.C3 |
| FIQ.I8 | Variance Analysis & Accountability | Merged | UN-11 | Same intent as FVC.V3 (time to explain) |
| FIQ.I9 | Review Cadence & Culture | Merged | MP-02 | With FVC.P4 |
| FIQ.O1 | Rate Optimization & Commitments | Split | OP-01 (practice), VB-02 (coverage %) | The right coverage depends on workload stability, so the percentage is a value base, not a maturity score; the "≥ 75% / > 95% utilisation" option was unsourced (VALIDATION rows 23–24) |
| FIQ.O2 | Workload Optimization & Rightsizing | Merged | OP-04 | AWS-specific example (Graviton) generalised |
| FIQ.O3 | Container & K8s Allocation | Kept | UN-09 | Now scope-conditional (Kubernetes) |
| FIQ.O4 | Spot & Preemptible Compute | Split | OP-08 (practice), VB-03 (share) | Share of eligible usage is a value base |
| FIQ.O5 | Architecture & Engineering Review | Kept | OP-10 | Maps to Architecting & Workload Placement; adds placement across cloud, private cloud and data centre |
| FIQ.O6 | Commitment Lifecycle Management | Kept | OP-02 | Now an answer-triggered follow-up |
| FIQ.O7 | Data Transfer & Egress Optimization | Merged | OP-09 | Same intent as FVC.C5 |
| FIQ.O8 | FinOps Culture & Gamification | Rewritten | MP-08 | Maps to Education & Enablement; "gamification" wording removed |
| FIQ.O9 | Continuous Optimization Backlog | Kept | MP-03 | |
| FIQ.O10 | Optimization Lever Prioritization | Merged / dropped as a separate question | OP-04 | Question text ("rank by ROI") did not match its options (which lever groups are harvested); each lever is now asked once in its own question |
| FIQ.A1 | Policy-as-Code & Guardrails | Merged | MP-06 | With FVC.C1's enforced tagging |
| FIQ.A2 | Automated Workload Scheduling | Kept | OP-06 | |
| FIQ.A3 | Storage Auto-Lifecycle | Kept | OP-07 | |
| FIQ.A4 | AI & GenAI Cloud Spend Governance | Rewritten | OP-12, QV-07 | Its last option mixed "no AI" with "unmanaged" (PLAN F1); "no AI" is now a scope fact |
| FIQ.A5 | Container Autoscaling & Rightsizing | Kept | OP-11 | Scope-conditional |
| FIQ.A6 | Engineering OKRs & KPIs | Merged | MP-05 | With T7 and FVC.O4 |
| FIQ.A7 | Automated Spot Interruption Handling | Merged | OP-08 | Practice part of Spot |
| FIQ.A8 | Forecasting & Predictive Analytics | Merged | QV-01 | With FVC.P1; ladder labelled LTM heuristic |
| FIQ.A9 | CI/CD Cost Shift-Left | Merged | QV-04 (Run option) | Pull-request cost feedback is one way to meet Planning & Estimating at Run |
| FIQ.T1 | Automated Multi-Tenant Chargeback | Kept | MP-09 | |
| FIQ.T2 | Unit Economics & Margin Modeling | Merged | QV-05 | With FVC.V4 |
| FIQ.T3 | BI & Financial Integration | Kept | MP-10 | Adds invoice reconciliation (FOCUS 1.4 Invoice Detail [S6]) |
| FIQ.T4 | Tenant Cost Attribution & Pricing | Merged | QV-06 | With T8 |
| FIQ.T5 | Executive Scorecards & Benchmarking | Rewritten | QV-08 | "Peer leaderboards" replaced by published benchmarks (no LTM peer data exists) |
| FIQ.T6 | Waste Threshold & Posture Defense | Moved | HY-01 | Hypothesis only (D4); "unallocated" separated from waste (VALIDATION row 20) |
| FIQ.T7 | Executive Compensation & Performance | Merged | MP-05 | |
| FIQ.T8 | Strategic Product Roadmap Steering | Merged | QV-06 | |

### 8.2 FinOps Value Case (KB schema 1.0.3, 29 questions)

| Old | Section | Disposition | New | Reason |
|---|---|---|---|---|
| FVC.E1 | estate | Kept | SC-01 | Workshop only; the executive mode infers mix from SC-03 |
| FVC.E2 | estate | Rewritten | SC-02 (+ SC-03) | "Private / hosted cloud" moves to SC-03 scopes; IBM and other providers added |
| FVC.E3 | estate | Rewritten | SC-04 | One slider becomes spend by scope (exact or band, don't know) so levers have bases |
| FVC.E4 | estate | Merged | SC-06 | With E6 |
| FVC.E5 | estate | Kept | SC-05 | |
| FVC.E6 | estate | Merged | SC-06 | |
| FVC.V1 | visibility | Merged | UN-04 | Attribution is allocation |
| FVC.V2 | visibility | Merged | UN-04 | Measured by cost, not resource count |
| FVC.V3 | visibility | Merged | UN-11 | |
| FVC.V4 | visibility | Merged | QV-05 | |
| FVC.V5 | visibility | Merged | UN-08 | |
| FVC.P1 | predictability | Merged | QV-01 | |
| FVC.P2 | predictability | Moved | HY-03 | Outcome signal for urgency, not a capability rating |
| FVC.P3 | predictability | Merged | QV-02 | Self-rated confidence replaced by forecasting method |
| FVC.P4 | predictability | Merged | MP-02 | |
| FVC.O1 | ownership | Merged | MP-01 | |
| FVC.O2 | ownership | Moved | HY-04 | Diagnostic shown in the report; "nobody" share is an urgency signal |
| FVC.O3 | ownership | Merged | UN-07 | |
| FVC.O4 | ownership | Merged | MP-05 | |
| FVC.C1 | controls | Split | QV-03, UN-10, MP-06, OP-01, OP-04, OP-06, MP-09 | The eight-option "controls operating" list scored seven capabilities at once; each control is now asked once in its own capability |
| FVC.C2 | controls | Merged | VB-02 | Coverage % is a value base |
| FVC.C3 | controls | Merged | OP-05 | |
| FVC.C4 | controls | Kept (moved to hypothesis group) | HY-02 | |
| FVC.C5 | controls | Merged | OP-09 | |
| FVC.L1 | value | Merged | MP-04 | Executive Strategy Alignment (new in 2026 [S5]) |
| FVC.L2 | value | Merged | MP-04 | |
| FVC.L3 | value | Moved | HY-05 | Urgency signal |
| FVC.L4 | value | Moved | HY-06 | Ambition; may raise targets by override |
| FVC.X1 | value | Kept | HY-07 | |

### 8.3 Behaviour carried over or removed

| From | Behaviour | In the merged design |
|---|---|---|
| FinOps Value Case | "Don't know" as a blind spot, confidence, need and urgency, verdict bands | Kept: Unknown on every maturity question; confidence (10.7); need verdict (section 9) |
| FinOps Value Case | Waste band from a capability index (30–40% … 8–14%) with BFSI modifiers, 3-year projection with growth | **Removed.** Replaced by the lever model; Flexera's 29% becomes the global cap only (D15) |
| FinOps Value Case | Value streams with "benchmark share of recoverable waste" (25–35%, 20–30%, 15–20%) | **Removed** (unsourced; "recoverable" banned) |
| FinOps IQ | Five gated stages, stage value bands, checkpoints, archetypes | **Removed** (VALIDATION rows 2, 3, 13–17, 47) |
| FinOps IQ | Consultant probes | Kept as conflict probes (7.6) and consultant notes |

---

## 9. Need verdict (executive mode, carried over from FinOps Value Case)

| Element | Rule (thresholds are `ASM-FIN-030` to `ASM-FIN-033`, LTM heuristic, registered in F2) |
|---|---|
| Scope | **Amended (F3 review, departure 4, pending owner confirmation):** executive mode only. A workshop result carries no verdict |
| Need index (0–100) | Mean over the executive capabilities that have a target of (gap ÷ 3) × 100, with Unknown counted as gap = target index and **blank counted as the maximum gap** (so a blank never lowers need) but lowering confidence. **Amended (F3 review, pending owner confirmation):** a capability with *any* asked question left blank counts as the maximum gap |
| Urgency modifiers | +10 at Tier 2 and +20 at Tier 3 (gaps cost more at scale); +10 if the expected gross run-rate value is ≥ 5% of `P` (no money shown in the verdict; applied from F4); +10 if `spend.growth12m` ≥ 20%; +10 if SC-03 shows AI scope; capped at 100. **Amended (F3 review, pending owner confirmation):** (a) the "≥ 25% of the estate still to move" alternative is not used, because the verdict is executive-only and SC-06 is a workshop question; (b) the +5 points for HY-03 "recurring" and HY-05 "uncomfortable" are **retired**: hypothesis answers are never scored (D4). HY-03 stays in conflict probe CP-3 and in the narrative. A "don't know" on growth adds no points but is listed as a blind spot |
| Verdict bands | 0–25 "Lightweight practices sufficient at current scale"; 26–50 "Establish foundations now"; 51–75 "Material exposure: act this year"; 76–100 "Act now". Wording as FinOps Value Case today, minus any "recoverable" or savings language |
| Confidence | High / Medium / Low from answer coverage and Unknowns (10.7) |
| Basis line | "Based on N of 18 questions answered; LTM's targets for a Tier X estate; not a FinOps Foundation assessment". **Amended (F3 review L2, pending owner confirmation):** it states how many questions were answered |

The verdict never contains a money figure. The value range sits beside it with its own basis (section 10).

---

## 10. Value model specification (built in F4; designed for area 13)

### 10.1 Principles

1. **Lever-based, never stage-based or waste-band-based.** The headline is the sum of lever values; there is no top-down "waste %" applied to spend.
2. **No base, no number.** A lever is quantified only when every input it needs is given (exact or band) or evidenced. "Don't know" makes that lever "identified, not quantified" and creates a `scope_confirmation` finding. **There is no default share without a published source** (PLAN F4).
3. **One uniform range rule** (`ASM-FIN-040`, `ASM-FIN-041`, LTM heuristic): **upper** = addressable base × the lever's maximum rate (a provider's published maximum, an arithmetic maximum, or the client's provider-tool estimate); **expected = ½ × upper**; **conservative = ¼ × upper**. Reasoning: PLAN F4 requires expected ≤ ½ of upper unless a sourced capture rate exists, and none was found; one rule for every lever is easier to explain and to test than ten. Cross-check: for Google Cloud, ½ × 55% = 27.5%, close to Google's published 1-year flexible CUD rate of 28% [S13], which suggests the rule is not optimistic for commitments.
4. **Bands widen the range, they never inflate it** (`ASM-FIN-042`): where inputs are bands, the expected case uses every band's midpoint; the conservative case is the **lowest** total over all band corners (each banded input at its low or high end, the same value in every lever) with the ¼ factor; the upper case is the **highest** total over the corners with factor 1. Using one value per input across all levers in a case means the upper case is always a consistent scenario, so an input that raises one lever and lowers another (for example non-production share, which raises LEV-04 and lowers LEV-01) is never counted both ways. At most eight banded inputs, so at most 256 corners.
5. **Per-lever range rule is checked before interactions**: expected ≤ ½ and conservative ≤ ¼ of the lever's own upper on its pre-interaction base. After interactions the totals keep conservative ≤ expected ≤ upper, but the total expected can sit slightly above half the total upper, because the upper case removes more base before the rate levers apply.
6. **Usage before rate**: rate levers apply to the base left after usage levers (10.4), so no spend is counted twice.
7. **Capped** at the addressable base, at the published maximum per lever, and globally at Flexera 2026's 29% average estimated waste for public cloud without client evidence (D15).
8. **Net and phased**: implementation and run costs deducted; a ramp per lever; year-1, run-rate and 3-year figures.
9. **The client's waste estimate (HY-01) is never an input** (D4).

### 10.2 Lever library

`P` = in-scope public cloud spend (sum of SC-04 provider rows), annual, client currency. Shares are of `P` unless stated. All amounts annual run-rate, gross, before 10.6.

| Lever | Type | Addressable base | Maximum rate (upper) | Source of maximum | Quantified in |
|---|---|---|---|---|---|
| **LEV-01 Commitment discounts** | rate | `P_c × max(0, S − C − n_u − t_u)` where `P_c` = provider compute spend (`P × computeShare`, per provider), `S` = steady-state share, `C` = eligible coverage, `n_u` = unscheduled non-production share of compute removed by LEV-04 (10.4), `t_u` = Spot-moved share (only when LEV-06 is quantified for that provider) | AWS 72% (EC2 Instance Savings Plans and Standard RIs; Compute Savings Plans 66%) [S9]; Azure 72% (reservations, example configuration; range 36–72%) [S11]; Google Cloud 55% resource-based CUD (70% memory-optimised, used only if the client states memory-optimised series dominate) [S13]; OCI, IBM, others: **not quantified** until F2 sources a maximum | V (AWS, Google), V (Azure, example-based) | Executive and workshop |
| **LEV-02 Rightsizing and modernisation** | usage | Client's provider-tool estimate of annual rightsizing savings (VB-05, type "rightsizing" or "modernisation"), export ≤ 90 days old (`ASM-FIN-048`) | 100% of the tool estimate; capped at `P_c` | Evidence; tools as [S12] | Workshop |
| **LEV-03 Idle and orphaned resources** | usage | Provider-tool estimate, type "idle/unused" (VB-05), ≤ 90 days | 100% of the tool estimate; capped at `P` | Evidence | Workshop |
| **LEV-04 Non-production scheduling** | usage | `(P_c − kubernetesSpend − gpuSpend) × nonProdShare × (1 − scheduledShare)`; hourly-billed resources only. Cluster and GPU spend are excluded because LEV-07 and LEV-10 cover them | 70.2% = 1 − 50/168 (a 10-hour, 5-day on-schedule against 168 hours) | Arithmetic; the 50-hour schedule is `ASM-FIN-043` (LTM heuristic; VALIDATION row 31) | Executive and workshop |
| **LEV-05 Storage tiering and lifecycle** | usage | Either the provider-tool estimate (type "storage") or `P × storageShare × coldDataShare` | Tool estimate; or 1 − (infrequent-access tier price ÷ standard tier price) for the client's provider and main region | Evidence; **price ratio UNSOURCED** until F2 reads the provider price pages with region and date. Until then evidence-only | Workshop |
| **LEV-06 Spot / preemptible** | rate | `P_c × max(0, tolerantShare − spotShare)` | AWS 90% [S10]. Azure Spot VMs and Google Spot VMs: secondary sources only (up to 90%; 60–91%) [S17]: **not quantified** until F2 confirms on provider pages | V (AWS); S (Azure, Google) | Workshop |
| **LEV-07 Kubernetes efficiency** | usage | `base.kubernetesSpend` | `max(0, 1 − r ÷ 0.65)` where `r` = measured used ÷ requested CPU and memory (lower of the two) and 0.65 = target utilisation leaving headroom (`ASM-FIN-044`, LTM heuristic) | LTM heuristic with formula | Workshop |
| **LEV-08 Data transfer** | usage | Not quantified in v1 (needs architecture discovery, F8) | — | — | Identified only |
| **LEV-09 SaaS and licensing** | usage | Measured unused or under-used licence cost (VB-08) | 100% of the measured amount; realisable only at renewal (10.6) | Evidence | Workshop |
| **LEV-10 AI and GPU** | usage | Idle endpoint spend (VB-07) plus GPU spend excluding that idle endpoint spend (so it is not counted twice) | Idle endpoints: 100% of measured idle spend; remaining GPU: `max(0, 1 − u ÷ 0.65)` with `u` = measured average GPU utilisation (`ASM-FIN-044`). GPU instances are assumed outside Kubernetes clusters unless the client says otherwise; if inside, LEV-07 covers them and LEV-10 applies to idle endpoints only | Evidence; LTM heuristic | Workshop |

**Executive mode** quantifies LEV-01 and LEV-04 only. Mapping used there (`ASM-FIN-052`, LTM heuristic): scheduled share from OP-06: Run = 1.0 (LEV-04 base 0), Walk = 0.5, Crawl or Not yet = 0; OP-06 Unknown → LEV-04 not quantified and, for LEV-01, `n_u = nonProdShare` (the most conservative overlap).

**Approximation noted** (`ASM-FIN-049`): coverage reports are usually on an on-demand-equivalent basis while shares of spend are billed cost. The base formula treats them as the same; the effect is to slightly overstate the uncovered base when coverage is already high. Sensitivity: low when `C` < 50%, medium above. F4 shows it in the sensitivity table.

### 10.3 Worked example (illustrative, not a client)

`P` = 10.0M (AWS only); computeShare 60% → `P_c` = 6.0M; steady 60%; coverage 30%; non-production 25% with OP-06 = Crawl (scheduled 0). Exact inputs, so no band widening.

| Step | Conservative | Expected | Upper |
|---|---|---|---|
| LEV-04 base = 6.0M × 25% × 1 = 1.50M; × 70.2% = 1.053M upper | 0.263M | 0.527M | 1.053M |
| `n_u` = 25% (unscheduled non-production treated as part of steady usage and removed); LEV-01 raw base = 6.0M × max(0, 60% − 30% − 25%) = 0.30M | | | |
| Reduce LEV-01 base by compute removed by LEV-02, 03, 07 (none quantified here; LEV-04 is already removed through `n_u`, 10.4) | 0.300M | 0.300M | 0.300M |
| LEV-01 = base × 72% × (¼, ½, 1) | 0.054M | 0.108M | 0.216M |
| **Total gross run-rate** | **0.317M (3.2%)** | **0.635M (6.4%)** | **1.269M (12.7%)** |
| Global cap check: expected ≤ 29% × 10.0M = 2.9M | pass | pass | n/a |

The example shows the intended behaviour: with only two levers quantifiable from executive answers, the expected figure is small and conservative, and the report says which further levers are "identified, not quantified" and what evidence would quantify them.

### 10.4 Interaction order (no double counting)

Levers are computed **in this order, each case (conservative, expected, upper) separately**, each on the base left by the levers before it:

1. LEV-03 idle (removes spend entirely; treated as compute for the reduction, the conservative choice for LEV-01)
2. LEV-04 non-production scheduling
3. LEV-02 rightsizing (its base reduced pro rata by 1–2 when the tool estimate pre-dates the clean-up)
4. LEV-07 Kubernetes (node spend excluded from LEV-02 tool estimates to avoid overlap)
5. LEV-05 storage
6. LEV-10 AI and GPU
7. LEV-09 SaaS and licensing (separate base; marketplace SaaS billed through a cloud provider is excluded from `P` when the client identifies it)
8. LEV-06 Spot, on tolerant compute not removed by 1–4
9. LEV-01 commitments, on steady uncovered compute: raw base `P_c × max(0, S − C − n_u − t_u)`, then `× (1 − compute removed by LEV-02, 03, 07 and 10 ÷ P_c)`. LEV-06's base is likewise reduced by the compute removed by LEV-02, 03, 07 and 10. Compute removed is spread across providers pro rata to `P_c`. LEV-04 and LEV-06 are not deducted again: they are already removed through `n_u` and `t_u`. `n_u` removes **all** unscheduled non-production from the steady pool in every case, which is the conservative choice for LEV-01

Rules: LEV-06 and LEV-01 never apply to the same usage (`t_u` removes Spot-moved usage from LEV-01's base, only when LEV-06 is quantified so that answering never lowers the total). When a provider tool's estimate is deduplicated across types and net of existing discounts (AWS Cost Optimization Hub states this [S12]), its per-type figures are used as given; otherwise steps 1–3 apply.

### 10.5 Caps

| Cap | Rule |
|---|---|
| Per lever, base | Each lever ≤ its addressable base × its maximum rate |
| Per lever, published | LEV-01 and LEV-06 maximum rates never exceed the provider's published maximum on the date checked; volatile, 90-day review (D14) |
| Global (D15, `ASM-FIN-050`) | Σ expected for public cloud levers ≤ 29% × `P` (Flexera 2026 State of the Cloud, n = 753, published 18 Mar 2026: respondents' average **self-estimate** of wasted IaaS/PaaS spend [S8]). The figure is a self-estimate across all maturities, not a measured or realisable saving; it is used as a ceiling, never as a target. If the cap binds, every expected lever value is scaled pro rata and the report says "capped". The cap lifts only when provider-tool or billing evidence supports every capped lever. LEV-09 (SaaS, licensing) is outside the Flexera base and is capped at its measured amount |
| Upper case (recommended, Q11) | The same 29% cap also applies to the **upper** case for public cloud levers unless every capped lever is evidenced. Reason: band corners and technical maxima can push the upper case above 40% of spend (reference scenarios RS3 and RS5), which a CFO would read as inflation even when it is labelled. D15 as approved covers the expected case only, so this needs the owner's decision |
| Evidence freshness | Provider-tool estimates older than 90 days are not used for quantification (`ASM-FIN-048`) |

### 10.6 Net of cost and ramp

| Element | Rule |
|---|---|
| One-off implementation cost | Σ over quantified levers of effort (FTE-months, `ASM-FIN-046`, by tier) × `cost.internalRate`, plus external support as an indicative range from WS-S5 (shown to the client as one range without LTM fees; fees only in the consultant SOW, D7) |
| Effort bands (`ASM-FIN-046`, LTM heuristic, Tier 1 / 2 / 3, FTE-months) | LEV-01 1/2/4; LEV-02 2/6/12; LEV-03 1/2/4; LEV-04 1/3/6; LEV-05 1/2/4; LEV-06 2/4/8; LEV-07 2/4/8; LEV-09 1/3/6; LEV-10 1/3/6. Reasoning: proportional to the number of teams and platforms that must change; reviewed against the first engagements |
| Run cost | Ongoing lever effort = 20% of the lever's one-off effort per year (`ASM-FIN-047`, LTM heuristic: monitoring, renewals, re-tuning) × rate, plus `cost.tooling` (client input; "not provided" is stated, never assumed zero silently) |
| Operating-model investment | The cost of a FinOps lead or team (`F-FIN-DECISION-01`) is shown **beside** the lever value as its own decision with its own cost, not netted against quantified levers, because it also enables levers not yet quantified. Q12 asks the owner to confirm |
| Ramp: year-1 share of run-rate (`ASM-FIN-045`, LTM heuristic) | LEV-01 0.5 (purchases staged quarterly); LEV-03 0.5; LEV-04 0.5; LEV-02 0.33; LEV-05 0.33; LEV-10 0.33; LEV-06 0.25; LEV-07 0.25; LEV-09 the share of contracts renewing in year 1 (client input), else 0.25. Years 2 and 3 = 1.0 |
| Spend growth | **Not applied** (`ASM-FIN-051`): values are on today's spend. Conservative if spend grows; shown in the sensitivity table if the client expects a fall |
| Outputs | Year-1 net; run-rate net (annual, from year 2); 3-year net = Σ gross years 1–3 − one-off cost − 3 × run cost. Each in conservative / expected / upper |
| Without `cost.internalRate` | Net cannot be computed, so **no money figure is shown**; the report lists the levers and says what is needed (Q4). Executive mode gets the rate from the consultant at setup |

### 10.7 Confidence

| Level | Per lever |
|---|---|
| High | Every input from evidence (provider-tool export ≤ 90 days, billing data) |
| Medium | Every input an exact client figure |
| Low | Any input a band, or derived from an answer mapping (`ASM-FIN-052`) |

Overall confidence = the level of the levers carrying more than half the expected value; it can never be higher than Medium in executive mode. Shown beside every figure.

### 10.8 Hypothesis panel (D4)

The client's HY-01 band × `P` is shown beside the model's expected range, with the difference explained by template: (a) "levers identified but not quantified" (with the evidence that would quantify them); (b) "your estimate may include unallocated spend, which is not waste" (VALIDATION row 20); (c) "the model's expected case is deliberately half its technical maximum". The hypothesis never changes a number.

### 10.9 Tests that enforce it (F4, CI)

| Test | Asserts |
|---|---|
| Trace | Every rendered number (screen, PDF, backlog) has a `data-field` engine path and a claim or `ASM-FIN` ID, and equals the engine value |
| Reconciliation | Σ levers = headline in each case; Σ roadmap item values = headline; year 1 + 2 + 3 = 3-year gross; gross − cost = net; screen = PDF = backlog = engine; **Cost IQ total = Cost IQ non-cloud + FinOps IQ cloud** for a client with both |
| Inflation guard | Over the five reference scenarios and 1,000 random questionnaires: each lever ≤ base × maximum rate; LEV-01/06 rates ≤ published maxima in the register; Σ expected ≤ 29% × `P` unless evidence flag set; conservative ≤ expected ≤ upper; year-1 ≤ run-rate; net ≤ gross; no lever quantified without its base; **a blank never yields a higher total than any answered option**; replacing a band with an exact value inside it never moves the expected value outside the band-based range |
| Monotonicity (value) | A more mature answer (higher coverage, more scheduling, more Spot) never raises the opportunity for that lever |
| Language lint | No "guaranteed", "recoverable", "savings at stake", "world-class", "elite", "Big 4", "empirical benchmark" in any rendered output (F2 item 6) |
| Assumption register | Every constant used in 10.2–10.7 appears in the register with value, basis, confidence and sensitivity, and in the "How we calculated this" appendix |

### 10.10 Assumption register seed (F2 completes)

| ID | Assumption | Value | Basis | Confidence | If wrong |
|---|---|---|---|---|---|
| ASM-FIN-001–003 | Complexity tier points and bands | 3.4 | LTM heuristic | Low | Targets shift one level; gap count changes; value unchanged |
| ASM-FIN-004 | Default target per capability and tier | 3.4 | LTM heuristic after the Foundation's "appropriate level" guidance [S3] | Low–medium | As above |
| ASM-FIN-005 | Severity and time-frame rules | 5.3 | LTM heuristic | Medium | Ordering of roadmap |
| ASM-FIN-020–023 | Option thresholds (allocation 40/70/90; report count; triage one business day; forecast ±5/15/30) | 7.3 | LTM heuristic; no Foundation ladder found | Low | One capability moves one level |
| ASM-FIN-030–033 | Need index, urgency modifiers, verdict bands | 9 | LTM heuristic (FinOps Value Case carry-over) | Low | Verdict band |
| ASM-FIN-040 | Expected = ½ × upper | 0.5 | PLAN F4 rule; Google 1-year flexible CUD cross-check [S13] | Medium | Expected moves proportionally |
| ASM-FIN-041 | Conservative = ¼ × upper | 0.25 | LTM heuristic | Medium | Conservative moves proportionally |
| ASM-FIN-042 | Band handling | 10.1 item 4 | LTM rule | High | Range width |
| ASM-FIN-043 | Non-production on-schedule hours | 50 of 168 | LTM heuristic (10 hours × 5 days) | Medium | LEV-04 ±10% per ±10 hours |
| ASM-FIN-044 | Target utilisation for Kubernetes and GPU | 0.65 | LTM heuristic (headroom for peaks) | Low | LEV-07, LEV-10 |
| ASM-FIN-045 | Ramp | 10.6 | LTM heuristic | Low–medium | Year-1 and 3-year figures |
| ASM-FIN-046 | Effort bands | 10.6 | LTM heuristic | Low | Net |
| ASM-FIN-047 | Ongoing lever effort | 20% of one-off per year | LTM heuristic | Low | Net |
| ASM-FIN-048 | Evidence freshness | 90 days | LTM heuristic | Medium | Lever availability |
| ASM-FIN-049 | Coverage basis approximation | 10.2 | LTM simplification | Medium | LEV-01 slightly high at high coverage |
| ASM-FIN-050 | Global cap | 29% of `P` | Flexera 2026, n = 753 [S8] | Medium (self-estimate) | Binding only for extreme inputs |
| ASM-FIN-051 | No growth applied | 0% | LTM rule | High (direction known) | Conservative when spend grows |
| ASM-FIN-052 | OP-06 to scheduled-share mapping (executive mode) | 1.0 / 0.5 / 0 | LTM heuristic | Low | LEV-04 executive figure |

### 10.11 How the design meets area 13

| Criterion | How |
|---|---|
| (a) Every number traces | Engine fields per lever and case; trace test; "How we calculated this" appendix lists inputs, formula (10.2), source and assumption IDs |
| (b) Assumption register | 10.10, completed in F2, tested in CI |
| (c) Ranges, conservative expected, net, ramp, never guaranteed | 10.1 items 3, 7; 10.6; labels in 10.12 |
| (d) No inflation | Caps 10.5; interaction order 10.4; inflation guard 10.9 including the blank-answer rule and the Cost IQ reconciliation |
| (e) Delivery-grade roadmap | Waves and dependencies 5.4; F7 builds workstreams with owner role, duration, effort, KPIs, milestones, prerequisites, risks |
| (f) Consulting-grade presentation | F7 executive summary: situation (profile and spend), issue (top gaps), recommendation (wave 1), value (expected net with range, confidence and basis); methodology, version, date, "data provided by", attribution, disclaimer |
| (g) CIO challenge | 10.13 |

### 10.12 Labels

- Headline: "Indicative value range (conservative / expected / upper), net of estimated implementation cost: not a savings commitment; evidence validation required."
- Every lever: its basis in one line, for example "Uncovered steady compute × up to 72% (AWS published maximum, checked 14 Oct 2026); expected case is half of the maximum."
- Never: "recoverable", "guaranteed", "savings at stake", "waste recovery".

### 10.13 CIO challenge test (designed answers; F7 verifies from the rendered report)

| # | Question (VALIDATION 4.7) | Where the new report answers it |
|---|---|---|
| 1 | "On what basis is this figure in front of my board?" | Lever table with base, maximum rate and source; "How we calculated this" |
| 2 | "Is that net, and in which year do I see it?" | Year-1 net, run-rate net, 3-year net (10.6) |
| 3 | "Which levers, and how much each?" | Lever table; levers identified but not quantified listed with the evidence needed |
| 4 | "Why is a peer's score higher but their stage lower?" | No score or stage; capability profile against stated targets (3.4) |
| 5 | "Are these the FinOps Foundation's domains and capabilities?" | Yes, adapted under CC BY 4.0 with the changes stated; targets and question sets are LTM's (3.1) |
| 6 | "What if our waste guess is wrong, or I leave a question blank?" | The guess is not an input (10.8); blanks are not quantified and never raise value (10.9) |
| 7 | "Why isn't this already done by our provider's tools?" | Edge (section 1): tools give resource recommendations for one provider; they are used here as evidence; the operating model, allocation, forecasting and unit economics they do not assess |
| 8 | "Who owns each action, how much effort, what depends on what?" | Findings (5.2) and roadmap (5.4, F7) |
| 9 | "What data did you take, where is it stored, did AI see it?" | Methodology panel and hosting notice (F11, WS-S6); AI off by default (F10) |
| 10 | "How do we compare with published data?" | Published market data panel: Flexera 2026 (n = 753) and State of FinOps 2026 (n = 1,192) with year and sample, never as peer benchmarks |

### 10.14 Reference scenarios (summary of `reference-scenarios.json`, D12)

Five illustrative scenarios with expected outcomes written **before** any engine exists, by applying sections 3, 5, 9 and 10 by hand. RS1 and RS2 take their shape from a government case study and a provider-published customer story (read through search results only, status S); RS3 to RS5 are composites consistent with published survey shares (State of FinOps 2026, Flexera 2026). Every other input is a labelled scenario assumption, and no outcome figure from a source is used as an input or benchmark. Values are gross annual run-rate (conservative / expected / upper) unless marked net; upper values reflect the Q11 recommendation.

| ID | Scenario | Mode | Tier | At or above target | Need verdict | Top findings | Gross run-rate C / E / U | Expected 3-year net | Value confidence |
|---|---|---|---|---|---|---|---|---|---|
| RS1 | US federal civilian agency on Azure with an established FinOps programme (executive mode) | executive | Tier 2 | 4 of 8 | 36.7 (Establish foundations now) | LEV-04 (High); USAGE_OPTIMIZATION (High); FORECASTING (Medium) | USD 0.55M / 2.01M (8.1% of P) / 6.37M | USD 4.96M | Low (band inputs; scheduled share derived from OP-06) |
| RS2 | European universal bank, Azure-first, with a mature reservations practice (workshop mode) | workshop | Tier 3 | 8 of 22 | n/a (workshop) | DATA_INGESTION (Critical); ALLOCATION (Critical); FINOPS_PRACTICE_OPERATIONS (High) | EUR 3.45M / 6.86M (6.2% of P) / 13.53M | EUR 14.96M | Medium |
| RS3 | AI-intensive digital-native SaaS company on AWS with Kubernetes and GPUs (workshop mode) | workshop | Tier 2 | 7 of 21 | n/a (workshop) | ALLOCATION (Critical); FINOPS_PRACTICE_OPERATIONS (High); USAGE_OPTIMIZATION (High) | USD 1.97M / 3.81M (21.1% of P) / 5.22M (capped; 7.08M before cap) | USD 7.80M | Medium |
| RS4 | Hybrid European manufacturer, AWS and Azure, with data centre, SaaS and licensing in FinOps scope (workshop mode) | workshop | Tier 3 | 4 of 22 | n/a (workshop) | DATA_INGESTION (Critical); ANOMALY_MANAGEMENT (Critical); FINOPS_PRACTICE_OPERATIONS (Critical) | EUR 2.04M / 4.01M (17.4% of P) / 7.71M | EUR 8.57M | Medium |
| RS5 | Mid-market UK retailer on Google Cloud without a FinOps function (executive mode) | executive | Tier 1 | 3 of 7 | 39.0 (Establish foundations now) | DECISION-01 (High); USAGE_OPTIMIZATION (High); ALLOCATION (Medium) | GBP 0.03M / 0.38M (12.7% of P) / 1.45M (capped; 2.23M before cap) | GBP 0.93M | Low (all inputs banded; scheduled share derived from OP-06) |

**What the scenarios are designed to test:** LEV-01 at zero when coverage already meets the steady share (RS1, RS2, RS3), so the advice becomes "schedule and move to Spot first, then re-baseline commitments"; LEV-01 positive when coverage is low (RS4, RS5); Unknown as risk (RS4 Anomaly Management, RS5 Forecasting); the one-level depth rule (RS2 Rate Optimization reads Walk, not Crawl); band corners and the upper cap (RS3, RS5); provider maxima not yet sourced (Azure and Google Spot); evidence-based levers with and without deduplication (RS3 Cost Optimization Hub; RS2 and RS4 Advisor and Compute Optimizer); renewal-driven ramp for SaaS (RS4); a negative conservative year-1 net in a small estate (RS5). F3 turns these into golden outputs; F4 and F5 compare the engine with them, with the tolerance stated in each record.

---

## 11. How LTM can help (WS-S5 mapping)

Generic practice names only; providers and tools appear only as options chosen from the client's requirements, with alternatives. No partner claims. Indicative scope (weeks) appears in the consultant SOW draft only (D7); the client sees type, purpose and execution outline. Effort figures are LTM heuristics until WS-S5 sets the catalogue.

### 11.1 Offerings

| ID | Offering (practice) | Type | Purpose and execution outline | Indicative scope (consultant SOW only) |
|---|---|---|---|---|
| OFF.FIN.ASSESS | FinOps assessment and value validation (FinOps) | Advisory | Validate the capability profile with billing data (FOCUS exports where available) and provider-tool recommendations; confirm Unknowns; turn "identified, not quantified" levers into evidenced ranges; agree targets with the client | 3–6 weeks |
| OFF.FIN.OPMODEL | FinOps operating model and governance (FinOps) | Advisory | Charter, executive sponsor, RACI across engineering, finance and procurement; review cadence; KPI set; policy set; education plan; links to ITAM, ITFM, security and sustainability | 4–8 weeks |
| OFF.FIN.TOOLING | FinOps data, allocation and tooling implementation (FinOps with Cloud Transformation) | Implementation | Central cost data pipeline in FOCUS format; allocation rules and account hierarchy; tag and label policy as code; dashboards per persona; anomaly alerts routed to owners; tool selection from requirements with alternatives | 6–12 weeks |
| OFF.FIN.SPRINT | Optimisation sprints (FinOps with engineering teams) | Implementation | A backlog per lever and platform (idle clean-up, scheduling, rightsizing, storage lifecycle, Kubernetes requests, Spot adoption, commitment portfolio); changes with performance guardrails; savings verified against billing data before and after | 4–8 weeks per wave |
| OFF.FIN.UNITECON | Unit economics, forecasting and chargeback (FinOps with Data and AI) | Implementation | Unit metric design with product owners; telemetry joined to allocation data in BI; driver-based forecast; showback then chargeback into ERP | 8–12 weeks |
| OFF.FIN.MANAGED | Managed FinOps service (FinOps) | Transformation (run) | Ongoing allocation hygiene, commitment portfolio management, anomaly response, monthly reviews and KPI reporting, with hand-back of capability to the client over time | 12 months or more |
| OFF.CT.PLACEMENT | Workload placement and cost-aware architecture (Cloud Transformation) | Advisory, then transformation | Placement decisions across public cloud, private cloud and data centre with a cost model; architecture reviews for data transfer and modernisation; migration or re-platforming where the business case supports it | 4–8 weeks advisory |
| OFF.DAI.AICOST | AI cost and value management (Data and AI with FinOps) | Implementation | GPU utilisation and idle-endpoint controls; token and inference cost attribution per use case; model-choice reviews for cost and quality | 6–10 weeks |
| REF.COST_IQ | Route to Cost IQ | — | SaaS portfolio rationalisation and vendor strategy beyond the FinOps practice (Cost IQ `R-004`, `R-007`) | — |
| REF.CLOUD_IQ | Route to Cloud IQ | — | Billing-console and payer-account security (moved from FIQ.C8 and part of FIQ.C1) | — |

### 11.2 Mapping from capabilities and levers

| Capability or lever | Primary offering | Also |
|---|---|---|
| DATA_INGESTION, REPORTING_ANALYTICS, ANOMALY_MANAGEMENT, AUTOMATION_TOOLS_SERVICES | OFF.FIN.TOOLING | OFF.FIN.ASSESS (when unconfirmed) |
| ALLOCATION | OFF.FIN.TOOLING | OFF.FIN.OPMODEL (policy and owners) |
| PLANNING_ESTIMATING, FORECASTING, BUDGETING, UNIT_ECONOMICS, INVOICING_CHARGEBACK | OFF.FIN.UNITECON | OFF.FIN.OPMODEL |
| KPIS_BENCHMARKING, EXECUTIVE_STRATEGY_ALIGNMENT, FINOPS_PRACTICE_OPERATIONS, GOVERNANCE_POLICY_RISK, FINOPS_EDUCATION_ENABLEMENT, FINOPS_ASSESSMENT, INTERSECTING_DISCIPLINES | OFF.FIN.OPMODEL | OFF.FIN.MANAGED (when internal capacity is limited) |
| ARCHITECTING_WORKLOAD_PLACEMENT, LEV-08 | OFF.CT.PLACEMENT | OFF.FIN.SPRINT |
| USAGE_OPTIMIZATION, RATE_OPTIMIZATION, LEV-01 to LEV-07 | OFF.FIN.SPRINT | OFF.FIN.MANAGED (commitment portfolio), OFF.FIN.ASSESS (to evidence unquantified levers) |
| LICENSING_SAAS, LEV-09 | OFF.FIN.SPRINT (licence and SaaS clean-up) | REF.COST_IQ (portfolio and vendor) |
| SUSTAINABILITY | OFF.FIN.OPMODEL | OFF.CT.PLACEMENT |
| AI scope, LEV-10, QV-07 | OFF.DAI.AICOST | OFF.FIN.TOOLING (attribution data) |
| `scope_confirmation` findings | OFF.FIN.ASSESS | — |
| `F-FIN-DECISION-01` (accountable owner) | OFF.FIN.OPMODEL | OFF.FIN.MANAGED |

**Rule (F9 gate):** every finding maps to at least one offering; the text reads as advice ("A FinOps assessment with your billing data would confirm …"), never as a sales pitch; the language lint applies.

---

## 12. What changes from today

| Today | After F3–F9 |
|---|---|
| Three instruments, three waste figures for one estate (VALIDATION 6.2) | Two instruments: Cost IQ (whole estate) and FinOps IQ (two modes); one capability model and one lever library; one cloud number |
| Five gated LTM stages presented as the Foundation's | Per-capability Crawl / Walk / Run / Not yet / Unknown on the Foundation's capabilities, attributed CC BY 4.0, with LTM targets labelled |
| 44 + 29 questions, overlapping | One merged set (section 7); executive 18; workshop by scope |
| Value = spend × T6 (or "not quantified" after F0); FinOps Value Case waste band × spend | Lever model: base × published or arithmetic maximum, ½ and ¼ rule, interaction order, caps, net, ramp, confidence |
| Unknown missing or rewarded; N/A as an answer | Unknown everywhere as risk; N/A only from scope; blanks never flatter |
| Roadmap = horizon lists of remediation sentences | Findings with owner role, time frame, wave, dependencies, KPIs, playbook entries and typed offerings |

---

## 13. Open questions for the owner

Each has a recommended default (labelled as my recommendation; the owner decides).

| # | Question | Recommended default | Why | Needed by |
|---|---|---|---|---|
| Q1 | Does the Cost IQ owner accept one shared capability module (overlay v7.1.0 IDs) and one lever library, with Cost IQ showing FinOps IQ's cloud figure instead of its own? | **Yes** | One number per estate; required by the reconciliation test (10.9) | F3 |
| Q2 | Display name for `AUTOMATION_TOOLS_SERVICES` | Use the name on the current Framework capabilities page, confirmed in F2; until then "Tools & Services (name under review)" | Could not verify the 2026 name (section 3.1) | F2 |
| Q3 | Complexity tiers and default targets (3.4) | **Accept as LTM heuristics**, labelled; the consultant may override any target with a reason | The Foundation publishes no target table; targets must still exist to compute gaps | F3 |
| Q4 | No money figure without an internal cost rate (10.6) | **Accept.** In executive mode the consultant sets the rate at engagement setup; a self-serve executive run shows the verdict and levers but no money | Area 13(c) requires net; an assumed salary rate would be unsourced | F4 |
| Q5 | One uniform range rule: expected = ½ upper, conservative = ¼ upper | **Accept** | Simple, testable, conservative; matches PLAN F4; the Google 1-year flexible CUD rate cross-checks it | F4 |
| Q6 | Move FIQ.C8 (and the billing-access part of FIQ.C1) to Cloud IQ's security baseline | **Accept**, subject to the Cloud IQ owner; if declined, drop them from FinOps IQ | Security hygiene, not a FinOps capability | F3 |
| Q7 | Executive mode quantifies LEV-01 and LEV-04 only | **Accept** | Only these have bases obtainable in 18 questions without inventing shares | F4 |
| Q8 | LEV-06 for Azure and Google Cloud, LEV-01 for OCI and others, and LEV-05 by price ratio stay unquantified until F2 sources the maxima on provider pages | **Accept** | Only secondary sources found; the trusted-source policy forbids using them | F2 |
| Q9 | Capability rating rule: weakest core answer, lowered by at most one level by depth answers (3.3) | **Accept** | Monotone and explainable; avoids one depth answer collapsing a mature capability | F3 |
| Q10 | Show the client one indicative range for external support cost (without LTM fees) so that net figures include it | **Yes**, once WS-S5 sets ranges; until then net covers internal effort and tooling only and says so | Net must include all material costs; fees stay in the SOW (D7) | F4 / F9 |
| Q11 | Apply the 29% global cap to the **upper** case too, without evidence | **Yes** (extends D15) | Upper cases above 40% of spend appear in RS3 and RS5 before the cap | F4 |
| Q12 | Show the FinOps lead or team cost beside the lever value as its own decision, not netted against quantified levers | **Yes** | It enables levers that are not yet quantified; netting it against two executive-mode levers would understate their value, and hiding it would overstate the programme's value. Shown in the same table so the CFO sees both | F4 |
| Q13 | Reference scenarios RS1 and RS2 draw their shape from a government case study and a provider-published customer story, read through search results only; RS3–RS5 are composites consistent with published survey shares | **Accept for F1**, re-read RS1 and RS2 sources in F2; outcomes in those sources are never used as benchmarks | No trusted, fetchable case study with full inputs was found (section 14) | F2 |
| Q14 | Verdict band wording "Establish foundations now" for 26–50 reads oddly for clients with foundations in place (RS1) | Reword to "Targeted improvements needed now" in F2 | Accuracy of the executive message | F2 |

---

## 14. Handover to F2: items not verified in this pack

| Item | Status | What settles it |
|---|---|---|
| Exact Crawl / Walk / Run characteristics wording | P | Re-read https://www.finops.org/framework/maturity-model/ and quote with attribution |
| 2026 display name of the tools capability (`AUTOMATION_TOOLS_SERVICES`) | P | finops.org capabilities page |
| Whether Spot / preemptible sits under Rate Optimization in the Framework text (OP-08 mapping) | P | finops.org Rate Optimization capability page |
| Azure savings plan for compute maximum (65%) | S | Microsoft Learn or Azure pricing page |
| Azure Spot VMs and Google Spot VMs maximum discounts | S (vendor blogs only) | Provider pricing pages with date |
| OCI, IBM Cloud, Alibaba commitment maxima | UNSOURCED | Provider pricing pages |
| Storage tier price ratios (LEV-05) | UNSOURCED | Provider price pages per region and date |
| Executive-mode timing (45–60 s per question) | LTM heuristic | F6 browser timing |
| Foundation example KPIs per maturity stage (allocation %, forecast variance, coverage) | Not found (VALIDATION rows 25, 28) | finops.org maturity page; if found, they replace `ASM-FIN-020` to `023` |
| OPM case details (RS1) and ABN AMRO story (RS2) | S (search results; direct fetch failed or returned 404) | Re-read the PDF and story; correct the scenario sources if needed |
| A "35% savings or cost avoidance from commitment discounts" figure attributed to the OPM case by one search result | **UNSOURCED** (a second search did not confirm it) | Read the PDF; not used anywhere in this pack |
| Every `ASM-FIN` value | LTM heuristic | Register entries with reasoning, owner and review date (F2) |

---

## 15. Sources

All checked on **14 Oct 2026**. Direct fetches of finops.org, focus.finops.org, learn.microsoft.com, aws.amazon.com, azure.microsoft.com, cloud.google.com documentation, flexera.com and itvmo.gsa.gov failed from this environment (DNS resolution or proxy refusal); verification was through web-search results quoting or linking the page, consistent with VALIDATION.md section 9.

| Ref | Source | URL | Status |
|---|---|---|---|
| S1 | FinOps Foundation, FinOps Framework (domains, phases, principles; CC BY 4.0 notice) | https://www.finops.org/framework/ | V |
| S2 | FinOps Framework capabilities; capability list as recorded in VALIDATION.md row 6; Architecting & Workload Placement description | https://www.finops.org/framework/capabilities/ ; https://www.finops.org/certification-for-organizations/finops-certified-platform/ | V (names), P (tools capability name) |
| S3 | FinOps maturity model: Crawl / Walk / Run per capability; "appropriate level of maturity for your environment"; maturity is complexity, not quality; can move backwards | https://www.finops.org/framework/maturity-model/ ; https://www.finops.org/insights/finops-maturity-model/ ; https://www.finops.org/insights/no-runners | V (principles), P (exact wording) |
| S4 | FinOps Scopes: "a segment of technology spending" that frames personas, capabilities and domains in scope | https://finops.org/framework/scopes | V |
| S5 | FinOps Framework 2026 update (19 Mar 2026): Executive Strategy Alignment new in Manage the FinOps Practice; Scopes and technology categories deepened | https://www.finops.org/insights/2026-finops-framework/ | V |
| S6 | FOCUS specification: version 1.4 ratified 4 Jun 2026 (Invoice Detail dataset, Contract Commitment expansion, Billing Period dataset) | https://focus.finops.org/focus-specification/ ; https://focus.finops.org/docs/specification/v1-4/sections/introduction/ | V |
| S7 | State of FinOps 2026 (released Feb 2026; n = 1,192 respondents, over $83bn annual cloud spend; 98% manage AI spend, 90% SaaS, 64% licensing, 48% data centre; waste reduction / workload optimisation the top current priority with diminishing returns; FinOps for AI the top forward priority) | https://www.linuxfoundation.org/press/state-of-finops-survey-ai-value-and-skills-top-priorities-as-finops-matures-across-technology-value-98-manage-ai-90-saas-64-licensing-48-data-center-1 ; https://data.finops.org/ | V (n, scope shares); S (priority wording via secondary summaries) |
| S8 | Flexera 2026 State of the Cloud (18 Mar 2026; n = 753; respondents' estimate of wasted IaaS/PaaS spend 29%, up from 27%; 63% have an established FinOps team; 85% name managing cloud spend as top challenge) | https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows ; https://info.flexera.com/CM-REPORT-State-of-the-Cloud | V |
| S9 | AWS Savings Plans user guide: EC2 Instance Savings Plans up to 72% off On-Demand (similar to Standard RIs); Compute Savings Plans up to 66% (similar to Convertible RIs) | https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html | V |
| S10 | Amazon EC2 Spot pricing: up to 90% off On-Demand | https://aws.amazon.com/ec2/spot/pricing/ | V |
| S11 | Azure reservations: savings of 36% to 72% versus pay-as-you-go; 72% from a stated example configuration (3-year reserved M64ls, SUSE, East US) | https://azure.microsoft.com/en-us/reservations/ ; https://azure.microsoft.com/en-us/pricing/offers/reservations/ | V |
| S12 | AWS Cost Optimization Hub: consolidates recommendation types (rightsizing, idle, Savings Plans/RIs and others), deduplicated and net of existing discounts | https://aws.amazon.com/aws-cost-management/cost-optimization-hub/ | V (via VALIDATION.md section 6.3) |
| S13 | Google Cloud committed use discounts: resource-based up to 55% (up to 70% memory-optimised); flexible CUDs 28% (1-year) and 46% (3-year) for listed series; memory-optimised flexible rates differ | https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview | V |
| S14 | Azure savings plan for compute "up to 65%" | secondary only (for example https://holori.com/azure-reservations-vs-savings-plans/) | S (not usable until F2 confirms on Microsoft pages) |
| S15 | AWS Data Exports for FOCUS 1.2 generally available (Nov 2025) | https://aws.amazon.com/blogs/aws-cloud-financial-management/data-exports-for-focus-1-2-is-now-generally-available | V (via VALIDATION.md) |
| S16 | Cost IQ FinOps overlay v7.1.0 (domains, capabilities, technology categories, triggers, supplemental questions FIN-01 to FIN-12) | `packages/engine-core/src/accelerators/cost-iq/canon/config/finops-overlay-v7.1.0.json` | Repository |
| S17 | Azure Spot VMs "up to 90%"; Google Spot VMs "60–91%" | secondary only: https://www.prosperops.com/blog/spot-instances/ ; https://www.66degrees.com/insights/spot-vms-overview-the-affordable-google-discount | S (vendor blogs; not usable under the trusted-source policy) |
| S18 | US Office of Personnel Management FinOps case study (GSA IT Vendor Management Office): FinOps programme established 2021 on an existing Cloud Center of Excellence; tagging policy; large growth in Azure spend since 2021 | https://itvmo.gsa.gov/assets/files/OPM-FinOps-Case-Study.pdf | S (search results quoting the PDF; fetch blocked) |
| S19 | Microsoft customer story, ABN AMRO: reservations optimise Azure spend by over €1 million a month; Azure Hybrid Benefit, reservations and utilisation recommendations used in its FinOps work | https://www.microsoft.com/en/customers/story/1703199481775899857-abn-amro-banking-capital-markets-azure | S (search result; direct fetch returned 404) |
| R1 | VALIDATION.md (14 Oct 2026) and PLAN.md (14 Oct 2026) | `docs/cio-readiness/finops-iq/` | Repository |
| R2 | FinOps IQ KB 2.2.0 and FinOps Value Case KB 1.0.3 | `packages/engine-core/src/accelerators/finops-iq/knowledge-base.json` ; `packages/engine-core/src/accelerators/finops-value-case/knowledge-base.json` | Repository |
