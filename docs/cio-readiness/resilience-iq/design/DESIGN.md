# Resilience IQ: RQ1 design pack

**Date:** 27 Oct 2026  **Author:** `resilience-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves this pack (gate RQ1 in [PLAN.md](../PLAN.md)). Qualified counsel reviews every regulatory statement before external use (RQ11).

**Status:** built, for the owner's approval. Not legal advice. Internal consultant use only.

**What this pack fixes before any code is written:**
- the decision, buyer and edge;
- the unit of assessment (the critical business service) and the requirement model;
- the written strategy ladder with sourced bands;
- the modifiers, which add controls and never a higher rung;
- one headline;
- the obligation layer for DORA, UK operational resilience, CPS 230, MAS BCM, NYDFS 500.16 and FFIEC BCM;
- the impact model;
- the findings model, modes and results screen;
- the full question map;
- five reference scenarios with expected outcomes;
- overlaps, and open questions with recommended defaults.

**Companion files (same folder):**
- `decision-matrix.json` and `decision-matrix.schema.json`: the ladder as data the engine will read.
- `reference-scenarios.json` and `reference-scenario.schema.json`: the five scenarios, expected outcomes written first.
- `obligation.schema.json`: the obligation layer.
- `finding.schema.json`: finding, headline, service result and impact shapes.
- `question.schema.json`: the v2 question record.

All are JSON Schema draft 2020-12, in the style of the Sovereign IQ design pack. `obligation.schema.json` reuses Sovereign IQ's condition language (`urn:ltm:sovereign-iq:v4:regime#/$defs/condition`). Both data files validate against their schemas, and the ladder grid in `decision-matrix.json` was checked for monotonicity (27 Oct 2026, ajv 2020 and a throwaway script outside the repository).

**Owner decisions applied:** D1–D15 as recorded in PLAN.md, all recommended defaults accepted on 27 Oct 2026. D29 (AI on `in.anthropic.claude-opus-5` from ap-south-1, India only) applies if AI is ever added (D10: none in v1).

---

## 0. Conventions

### 0.1 Source references and verification status

Every regulatory, provider or framework statement carries a source reference (`SRC-…`, listed in [section 18](#18-sources)) and a status. All sources were checked on **27 Oct 2026**. EUR-Lex returned an empty page again, so the DORA text is from the Springlex reproduction of the Official Journal text. The FFIEC booklet site returned HTTP 403. The APRA, MAS and PRA PDFs were downloaded and read with pdfjs.

| Status | Meaning |
|---|---|
| **V** | Verified on 27 Oct 2026 from the primary text (regulator, provider or standards body) |
| **S** | Secondary only: a faithful reproduction (Springlex, Cornell LII) or a summary. RQ2 confirms against the primary text |
| **P** | Primary URL given; the specific passage was not re-read in this session |
| **UNSOURCED** | Not verified. What would settle it is stated in [section 17](#17-handover-to-rq2-items-not-verified-in-this-pack) |
| **LTM heuristic** | A judgement, with its reasoning written next to it. Never presented as a benchmark |

Claim IDs (`CLM-RES-nnn`) are assigned in RQ2. This pack uses `SRC-` references, and the JSON files carry `CLM-RES-TBD` where a claim will be created.

### 0.2 Naming

- **Questions:** existing IDs are kept (`EX-01` to `EX-20`, `AF-xx-nn`). New questions get short thematic IDs: `REG-01`, `REG-02`, `TOL-02`, `TOL-03`, `SAAS-01`, `DC-01`, `AUD-01`, `EXIT-01`, `REV-01`. There is no `TOL-01`: `EX-02` is the time tolerance.
- **Facts:** dotted lower-case paths, shared with Sovereign IQ where they exist: `ent.flags`, `org.establishments` and `org.sector`. One Resilience-only fact: `ent.res_flags`, set by `REG-02`.
- **Rungs:** `DR-01` to `DR-05`, the existing pattern IDs. On screen the pattern name is shown in words; codes are never headings.
- **Controls:** `RES.<DOMAIN>.<NAME>` ([section 9.3](#93-control-catalogue)).
- **Regimes:** Sovereign IQ's registry IDs (`EU_DORA`, `UK_OPRES`, `AU_APRA_CPS230`, `SG_MAS_TRM`, `US_NYDFS_500`), plus two Resilience-owned records, `SG_MAS_BCM` and `US_FFIEC_BCM`.
- **Obligations:** `<REGIME>.<NAME>`, for example `EU_DORA.SEGREGATED_RESTORE`.
- **Offerings:** `OFF.RES.*`. The referral to Sovereign IQ is `REF.SOVEREIGN_IQ`.
- **Services:** `S1` to `S5`. `S1` is the most critical service.

### 0.3 What the owner's decisions mean for this pack

| # | Decision (27 Oct 2026) | Where in this pack |
|---|---|---|
| D1 | Decision and buyer | [1](#1-decision-buyer-edge-final-wording) |
| D2 | R9 decisions 1, 2, 3, 5 and 6 accepted; 4 superseded by D3 | [5](#5-modifiers-controls-not-rungs), [6](#6-the-single-headline-d4), [9.4](#94-severity-and-time-frame) |
| D3 | Written ladder | [4](#4-recovery-strategy-ladder-d3), `decision-matrix.json` |
| D4 | One headline | [6](#6-the-single-headline-d4) |
| D5 | Impact from the client's cost input | [8](#8-impact-model-d5) |
| D6 | Regulatory scope v1; applicability shared with Sovereign IQ | [7](#7-obligation-layer-d6) |
| D7 | Executive, workshop and client view | [10](#10-modes-d7) |
| D8, D11 | Evidence validation by consultant or Admin; reference-only uploads for EU and UK | [9.2](#92-finding-record-findingschemajson), [11](#11-results-screen-mapped-to-the-tabs-built-in-pr-75) |
| D12 | Overlaps | [14](#14-overlaps-d12) |
| D13 | Reference scenarios | [13](#13-reference-scenarios-d13), `reference-scenarios.json` |
| D14 | Review cycles | [17](#17-handover-to-rq2-items-not-verified-in-this-pack) |

---

## 1. Decision, buyer, edge (final wording)

| | Final wording |
|---|---|
| **Decision** | *For each critical business service, which recovery strategy and cyber-recovery capability should we fund, and can we stay within impact tolerance (and show our regulator that we can) today?* |
| **Buyer** | The **CIO**. Co-owners: the Chief Risk Officer or head of operational resilience, the CISO and the BCM lead. In UK financial services, the SMF24 or equivalent |
| **Edge** | Starts from the business service and its tolerances, not from one provider's workload. It picks the cheapest recovery pattern that meets the requirement from a written ladder, with every band sourced. It adds cyber-recovery, identity and third-party controls where the client's answers expose them, without inflating the pattern. It maps the same answers to the operational-resilience obligations of six regimes in four markets. It ends in a platform backlog (on-premises, AWS, Azure, Google Cloud, OCI, IBM Cloud, sovereign providers, SaaS) and typed next engagements. Every item traces to a finding and a source |
| **USP sentence** | "From your critical services and their tolerances to a sourced recovery strategy, a cyber-recovery and third-party gap list, and your position against DORA, UK, Australian, Singapore and US resilience rules, in one consultant-led session." |

**Against free alternatives** (validation section 6, unchanged):

| Alternative | What it gives | Resilience IQ edge |
|---|---|---|
| AWS Resilience Hub; Azure reliability guidance and Site Recovery; Google Cloud DR planning guide | Workload-level RTO and RPO on one provider | Business-service first, across every platform; strategy before provider; cyber recovery and third parties in the same view |
| ISO 22301 gap checklists, BCI Good Practice Guidelines, FFIEC BCM booklet | Management-system conformity | A strategy per service, a platform backlog and typed next engagements, each traced to a finding and a source |
| Regulator self-assessments (SS1/21 self-assessment, CPS 230 readiness) | One regime's narrative | Six regimes on one capability model, with evidence and the technical route to close each gap |
| Backup-vendor ransomware readiness scans | One product's posture | Vendor-neutral; isolation, immutability and clean-room patterns per provider, with alternatives |

The edge is written into the report's methodology panel and the consultant guide (RQ6, RQ7). It holds only if the regulatory content is correct (RQ2, RQ11) and the playbook exists (RQ8).

---

## 2. Unit of assessment: the critical business service

| Element | Design |
|---|---|
| Unit | The **critical business service**: an external outcome delivered to customers or the market, as SS1/21 ch.2, CPS 230 para 35 and MAS 2.3 define it [SRC-PRA-SS121 V; SRC-APRA-CPS230 V; SRC-MAS-BCM V]. Not the enterprise, not an application |
| Executive mode | One service: `S1`, the most critical, named by the client in `EX-01` (short free text, no personal data) |
| Workshop mode | `S1` plus up to four more (`S2`–`S5`). Each service has its own requirement, ladder decision, proven recovery, impact range, findings and obligation statuses |
| Questions per service | Every question marked "service" in [section 12](#12-question-map): requirement, proven recovery, backups and cyber exposure of that service's data, dependencies, third parties, testing |
| Questions once | Every question marked "enterprise": crisis management, governance, workforce, identity recovery, environments, regime facts, audit cycle |
| Headline | Computed for `S1` plus the enterprise answers, so executive and workshop results compare like for like. Critical exposure, findings and obligations cover **all** services (open question [Q3](#16-open-questions-for-the-owner)) |
| Five-service limit | LTM heuristic: five keeps a workshop within a day. A client with more critical services runs a second assessment, or the BIA advisory offering covers the rest |

---

## 3. Requirement model

For each service the client states five things. The engine never infers any of them from technology [validation row 33].

| Requirement | Question | Regulatory term | Source (status) |
|---|---|---|---|
| Impact tolerance as time: how long the service can be disrupted before the harm is intolerable | `EX-02` | UK impact tolerance (time-based metric required); CPS 230 para 38(a) maximum period; MAS SRTO; ISO 22301 maximum tolerable period of disruption | SS1/21 3.10–3.12 [V]; SYSC 15A.2.5R [V]; CPS 230 38(a) [V]; MAS 3.1 [V]; ISO 22301 [P] |
| Maximum data loss the service can tolerate | `TOL-02` (new) | CPS 230 para 38(b); SS1/21 "other metrics" | CPS 230 38(b) [V]; SS1/21 3.11 [V] |
| Minimum service level while on alternative arrangements | `TOL-03` (new, workshop) | CPS 230 para 38(c); MAS glossary footnote 1 ("a minimum service level … pre-determined by the FI"); SS1/21 3.12 (percentage of normal capacity) | [V] all three |
| Required recovery time objective (RTO) | `EX-03` | DORA Art. 12(6); SS1/21 3.14; MAS 3.2 (RTOs of functions meet the SRTO) | DORA [S]; SS1/21 [V]; MAS [V] |
| Required recovery point objective (RPO) | `EX-04` | DORA Art. 12(6); SS1/21 3.14 | DORA [S]; SS1/21 [V] |

**Consistency rules** (`decision-matrix.json` `requirementConsistency`):
- The RTO must not be longer than the time tolerance.
- The RPO must not allow more data loss than the data-loss tolerance.

If either is breached, the ladder uses the stricter value and the report raises `RES.REQ.CONSISTENT` (High): "your recovery time objective allows a longer outage than this service can tolerate". Basis: SS1/21 3.14 says RTOs and RPOs are set "to enable the firm to deliver the important business service within its impact tolerance" [V]; MAS 3.2 says function RTOs must meet the SRTO [V]. This is open question [Q1](#16-open-questions-for-the-owner) (recommended default: apply).

**Regulatory floors.** One obligation in v1 caps a requirement directly: the MAS Technology Risk Management Notices require an RTO of no more than four hours for each critical system.
- Notice FSM-N09 para 6, finance companies, effective 10 May 2024 [SRC-MAS-N09 V].
- MAS restated the four-hour expectation on 19 Oct 2023 [SRC-MAS-MR-2023 V].
- Where it applies and the consultant confirms the service runs on such a system (`REG-02`), the effective RTO is at most "1–4 hours" and the decision log names the notice.
- The notices for other licence types are not yet sourced. Until RQ2 sources them, the floor is shown in consultant view only (open question [Q6](#16-open-questions-for-the-owner)).

**Unknown.** If the effective RTO or RPO of a service is Unknown, that service gets no rung. `RES.REQ.DEFINED` (Critical, legacy G-01) is raised, as today.

---

## 4. Recovery strategy ladder (D3)

### 4.1 The rungs

The five rungs are the existing recovery patterns DR-01 to DR-05, in AWS's "increasing order of cost and complexity, and decreasing order of RTO and RPO" [SRC-AWS-REL13 V].

| Rung | Name on screen | What it is | AWS (REL13-BP02) [V] | Azure (WAF design guide; RE:09) [V] | Google Cloud (DR planning guide) [V, qualitative] | On-premises [P] |
|---|---|---|---|---|---|---|
| DR-01 | Backup and restore | Back up to a separate location; redeploy and restore on disaster | RPO hours; RTO 24 hours or less; point-in-time recovery "can lower RPO to as low as 5 minutes in some cases" | Tier 3: RTO hours to days, RPO hours; backup and restore | Cold | Restore to a cold site |
| DR-02 | Pilot light | Data replicated, core infrastructure ready, compute started on failover | RPO minutes; RTO tens of minutes | Active-passive "cold standby" (replication and infrastructure as code ready, compute stopped): Tier 2, RTO and RPO in hours | Warm (lower end) | Warm site with replicated data |
| DR-03 | Warm standby | A smaller, fully working copy always running; scaled up on failover | RPO seconds; RTO minutes | Active-passive warm standby: Tier 1, RTO and RPO in minutes ("a mix of active-active or warm standby") | Warm | Warm or hot site at reduced capacity |
| DR-04 | Hot standby (active-passive at full capacity) | A full-size copy ready to take over; serves no traffic until failover | "When fully scaled this is known as hot standby": lower RTO than warm standby | No separately named pattern (see 4.7); warm standby at full capacity with automatic failover. **LTM mapping** | Hot | Hot site |
| DR-05 | Active-active | Two or more sites serving live traffic | RPO near zero; RTO potentially zero; "should only be selected when business requirements necessitate it" | Tier 0: RTO in seconds, RPO approaching zero; active-active "typically necessary" | Hot (HA across both environments) | Mirrored sites |

**Sovereign and other providers:** the same pattern definitions apply. Provider features (replication, retention lock, second region) are found in discovery and held in the playbook (RQ8), never assumed.

**Google Cloud gives no numeric RTO or RPO bands.** It says only that the pattern choice is "dictated by your budget and RTO and RPO values" [SRC-GCP-DRAPPS V] and gives examples (a cold pattern for historical compliance data, a hot pattern for an online service) [SRC-GCP-DRPLAN V]. Mapping cold, warm and hot onto the five rungs is therefore an LTM mapping.

**AWS Elastic Disaster Recovery** "take[s] the pilot light approach" with RPO in seconds and RTO in minutes [SRC-AWS-REL13 V]. It is a platform option under DR-02 and DR-03, never under DR-01 or DR-04 (validation rows 20–21, corrected in RQ0).

### 4.2 Bands

The ladder reads the answer bands of `EX-03` (RTO) and `EX-04` (RPO).

| Answer | Rung for RTO | Rung for RPO | Basis |
|---|---|---|---|
| Near-zero (RPO only) | — | DR-03 | Warm standby "RPO in seconds" [AWS V]; zero data loss needs synchronous replication [Azure RE:09 V]. Near-zero RPO alone does not need active-active (R9 decision 4) |
| < 15 minutes | DR-04 | DR-03 | RTO: a reduced standby cannot be relied on to scale in under 15 minutes; full capacity is the lowest pattern that meets it (**LTM heuristic** on AWS's "the more scaled-up the warm standby is, the lower RTO", V). RPO: pilot light's "minutes" overlaps the 15-minute edge, so warm standby (**LTM heuristic** on AWS V) |
| 15–60 minutes | DR-03 | DR-02 | RTO: warm standby "RTO in minutes"; pilot light's "tens of minutes" overlaps the 15-minute lower edge, so it is shown as the alternative one rung down, with that risk (**LTM heuristic** on AWS V). RPO: pilot light "RPO in minutes" [AWS V] |
| 1–4 hours | DR-02 | DR-01 | RTO: pilot light "tens of minutes" [AWS V]; Azure Tier 2 "hours" [V]. Backup and restore has no stated lower RTO bound, and restores at scale can take more than a day (scenario RS3), so it is not relied on below four hours (**LTM heuristic**). RPO: backup and restore "RPO in hours" [AWS V] |
| 4–24 hours | DR-01 | DR-01 | Backup and restore "RTO in 24 hours or less", "RPO in hours" [AWS V]; Azure Tier 3 [V] |
| > 24 hours | DR-01 | DR-01 | As above |
| Unknown | withheld | withheld | No rung; `RES.REQ.DEFINED` |

Why not rely on point-in-time recovery to put an RPO of 15–60 minutes on DR-01? AWS says it lowers RPO to five minutes only "in some cases" [V]. The ladder uses pilot light and shows backup and restore as the alternative.

### 4.3 The rule and the grid

**Recommended rung = the higher of the RTO rung and the RPO rung:** the lowest-cost pattern that meets both. AWS: "avoid implementing a strategy that is more stringent than it needs to be, as this incurs unnecessary costs" [SRC-AWS-REL13 V].

| RPO \ RTO | < 15 min | 15–60 min | 1–4 h | 4–24 h | > 24 h |
|---|---|---|---|---|---|
| Near-zero | DR-04 (DR-05 business choice) | DR-03 | DR-03 | DR-03 | DR-03 |
| < 15 min | DR-04 | DR-03 | DR-03 | DR-03 | DR-03 |
| 15–60 min | DR-04 | DR-03 | DR-02 | DR-02 | DR-02 |
| 1–4 h | DR-04 | DR-03 | DR-02 | DR-01 | DR-01 |
| 4–24 h | DR-04 | DR-03 | DR-02 | DR-01 | DR-01 |
| > 24 h | DR-04 | DR-03 | DR-02 | DR-01 | DR-01 |

**Against today's engine (validation section 4.2):**
- Near-zero RPO with RTO 4–24 hours or more than 24 hours: DR-05 becomes DR-03.
- RTO 4–24 hours: Pilot Light becomes Backup and restore, unless the RPO needs more.
- RTO 15–60 minutes: Hot Standby becomes Warm standby.
- A looser RPO never raises the rung.

The table is monotonic: moving to a stricter answer in either direction never lowers the rung (checked over the grid in `decision-matrix.json`). The RQ3 gate test runs the same check over the grid × criticality × cyber exposure, and asserts that only RTO and RPO move the rung.

### 4.4 Business choice: active-active

DR-05 is **never** the recommended rung. When RTO is under 15 minutes **and** RPO is near-zero, the report recommends DR-04 and offers DR-05 beside it as a business choice, with the trade-off in words:
- Hot standby meets the requirement with a failover step.
- Active-active removes the failover step and serves traffic from both sites, at the highest cost and operational complexity. AWS says it "should only be selected when business requirements necessitate it" [V]. Azure says active-active is "typically necessary" for mission-critical tiers with RTO in seconds [V].

The client's choice is recorded as a `decision` finding (`F-DECISION-n`). Open question [Q9](#16-open-questions-for-the-owner) asks whether to add an RTO answer "seconds (no noticeable interruption)" that would make DR-05 a rung (recommended default: not in v1).

### 4.5 What is always added

| Always | Controls | Basis |
|---|---|---|
| Point-in-time recovery, for every rung | `RES.BACKUP.PITR` (pattern DATA-04) | "Continuous data replication … may not protect you against data corruption or destruction unless your strategy also includes versioning of stored data or options for point-in-time recovery" [AWS V]; "Backup and restore strategies must be part of all recovery strategies" [Azure V] |
| Continuous replication, when the effective RPO is under 15 minutes or near-zero | `RES.DATA.REPLICATION` (DATA-03); synchronous where zero is required | AWS warm standby [V]; Azure synchronous replication [V] |

### 4.6 What the client sees

For each service, the Recovery strategy tab shows the following, in words, never codes:
- "Your recovery time objective (1–4 hours) needs at least **pilot light**."
- "Your recovery point objective (under 15 minutes) needs at least **warm standby**."
- "**Warm standby** is the lowest-cost pattern that meets both."
- The alternative one rung down, and what it would not meet.
- The business choice, where it applies.
- Any floor or consistency rule applied, with its article.
- The controls the modifiers added, and why.
- "What would change this": the nearest answer that moves the rung up or down.

The "fit /100" pattern scores are retired from every view (validation row 34). Consultant view keeps the decision log.

### 4.7 Terminology

"Hot standby" means different things:
- **AWS:** "hot standby" is warm standby at full capacity (active-passive).
- **Azure:** its glossary pairs "Active-active (hot standby)", and it calls the AWS pilot-light shape "active-passive cold standby" [Azure design guide V].
- **Google:** "hot" means HA across both environments [V].

The report always describes the pattern in words ("a full-size copy ready to take over") next to its name, and the playbook gives each provider's own term.

### 4.8 Tests that enforce the ladder (RQ3, RQ4)

- Grid monotonicity over RTO × RPO × criticality × cyber exposure × concentration: the rung depends on the effective RTO and RPO only.
- Every grid cell equals `decision-matrix.json` `grid`.
- An Unknown RTO or RPO withholds the rung and raises `RES.REQ.DEFINED`.
- DR-05 is never recommended; it is offered only in the one cell.
- A floor or consistency rule appears in the decision log whenever it changes the effective requirement.

---

## 5. Modifiers: controls, not rungs

Modifiers come from the client's exposure. Each adds controls and findings. **None changes the rung** (D3, R9 decision 4). A rung moves only through a requirement floor or consistency rule, which tightens the requirement and is recorded with its article (section 3).

| Modifier | When (v2 answers) | Controls added (patterns) | Finding and severity | Basis |
|---|---|---|---|---|
| Cyber exposure of recovery | `EX-08` Yes or Unknown; or isolated by design but not tested; `AF-CY-01` not "No"; `AF-CY-04` not "Yes, successfully" | `RES.CYBER.ISOLATION`, `RES.BACKUP.IMMUTABLE`, `RES.CYBER.CLEANROOM` (CYBER-01, DATA-01, DATA-02, CYBER-03) | G-05: Critical for Yes or Unknown; High for isolated but untested | DORA Art. 12(3) [S]; NYDFS 500.16(e) [S]; NYDFS ransomware guidance: "at least one set of backups should be segregated from the network and offline" [V] |
| Identity and control plane | `EX-19` No or Unknown (Critical); documented, not tested (High) | `RES.IDENTITY.RECOVERY` (CYBER-02) | G-06 | AWS anti-pattern "dependency on control plane operations during recovery" [V]; Azure "protect all DR assets, including … credentials" [V] |
| Concentration and correlated failure | `EX-11` High or Unknown, or `AF-DR-04` Yes or Unknown: correlation. `EX-11` Moderate: concentration only (R9 decision 6) | `RES.DR.SEPARATION`, `RES.TP.CONCENTRATION` (TP-05, TP-03, INF-03, INF-04) | G-04 Critical (high or unknown); G-08 High (moderate) | MAS BCM section 5 [V]; Azure "shared service dependencies can break your chain" [V] |
| Dependencies | `EX-05` not "current and validated"; `AF-DR-04` Partially | `RES.DEPENDENCY.MAP`, `RES.DR.ORCHESTRATION` (DR-07, DR-08, APP-04) | G-07 High | MAS 4.1 [V]; SS1/21 5.9 [V] |
| Critical third party | `EX-10` "no viable alternative" or Unknown; `EXIT-01` not rehearsed | `RES.TP.EXIT`, `RES.TP.CONTINUITY` (TP-02, TP-04, BCP-05) | High | CPS 230 para 56 [V]; DORA Art. 28(8) [S] |
| SaaS data | `EX-18` includes SaaS and `SAAS-01` is not "independent backup, restore tested" | `RES.SAAS.BACKUP` (APP-05) | High | "Regardless of the type of deployment, you always retain … Data" [SRC-MS-SHARED V] |

In executive mode a workshop-only question (for example `SAAS-01`) is not asked. The modifier then adds the control to the "to assess in the workshop" list, never a finding.

**R9 decisions applied (D2):**
- **Decision 1:** a blank advisory question that was asked counts as Unknown. The advisory gate requires only the gate-relevant DR and cyber questions.
- **Decision 3:** `EX-09` "Immutable, restore not tested" raises `RES.DR.PROVEN` (High, "Unproven recovery"). "No usable backups", "Unknown" and "Recoverable but not immutable" keep G-03 (Critical).
- **Decision 5:** D1–D6 of R3 confirmed. D2's 12-month test rule is now cited: DORA Art. 11(6) "at least yearly" [S]; CPS 230 para 43 "annual business continuity exercise" [V]; NYDFS 500.16(d) "at least annually" [S].
- **Decision 6:** moderate concentration gives G-08 only.

---

## 6. The single headline (D4)

**One number: Resilience posture, 0–100.** It is shown with its rating, the cap (if any) and the reason, and with critical exposure beside it. The risk-adjusted `score` and its flat penalties are retired; a contract version bump keeps stored results readable (RQ3 item 3).

| Element | Rule |
|---|---|
| Posture | Weighted domain scores, as today: BCP .18, DR .20, CYBER .18, OPS .16, TP .12, INFRA .16. Domain = mean option score × (0.7 + 0.3 × evidence confidence), with advisory domain adjustments. Every constant is an LTM heuristic registered in RQ2 (assumptions A1–A5) |
| One effect per answer (R9 decision 2 with D4) | Each answer moves the number once, through its domain. The flat penalties (`runtime.ts`, critical SPOF −10, backup −15 and others) disappear with the risk-adjusted score. An answer's severity is carried by the gap it raises and the exposure cap, which are labels, not a second deduction (open question [Q11](#16-open-questions-for-the-owner)) |
| Rating | Today's bands: Critical Exposure 0–39, Fragile 40–59, Managed 60–74, Resilient 75–89, Adaptive 90–100 (LTM heuristic, A6). Open question [Q15](#16-open-questions-for-the-owner) proposes renaming the lowest band "Exposed", so it is not confused with the critical-exposure measure |
| Exposure cap (R3 D1, confirmed in D2) | Severe exposure (3 or more Critical findings): rating at most Fragile. High exposure (1 or more Critical, or 4 or more High): rating at most Managed |
| Cap shown | `capReason` is required whenever the cap applies, for example: "86 is in the Resilient band; the rating is capped at Managed because 2 critical gaps are open: recovery may fail with production; ransomware could reach recovery copies." This fixes validation M3 and CIO challenge question 2 |
| Beside it | Critical exposure (Low / Moderate / High / Severe), the recovery strategy per service in words, the count of obligations not evidenced, and the impact range where the client gave a cost |
| Maturity | A secondary label (Reactive to Adaptive). "Tested" and above need a test within 12 months and scenario exercises (D2, cited above) |
| Provisional | If `S1`'s RTO or RPO is Unknown, the posture is shown marked "provisional" and the rung and impact are withheld. Open question [Q2](#16-open-questions-for-the-owner) (recommended default; today the whole result is withheld) |
| Calibration | RQ5 checks that every band is reachable, including Resilient and Adaptive (validation: never reached in 800 runs), and that no single answer moves posture by more than the agreed limit (proposal 12) |

---

## 7. Obligation layer (D6)

### 7.1 Applicability: reuse, not a second regulation model

- **Where Sovereign IQ has the regime:** Resilience IQ reads its applicability from the Sovereign IQ registry (`packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json`, registry 1.1.0, status 25 Oct 2026). It uses the same rule IDs, condition language (`v4/conditions.ts`) and fact IDs (`v4/facts.ts`: `ent.flags` from B1, `org.establishments` from A1/A2, `org.sector` from A3). These regimes are `EU_DORA`, `UK_OPRES`, `AU_APRA_CPS230`, `SG_MAS_TRM` and `US_NYDFS_500`.
- **Where the client has run Sovereign IQ:** `REG-01` is prefilled from Sovereign IQ's answers, with the consultant's confirmation. Otherwise `REG-01` asks the same facts here, with the same values.
- **Where Sovereign IQ has no record:** for the MAS BCM Guidelines and the FFIEC BCM booklet, a **Resilience-owned record** uses the same condition language and facts (`obligation.schema.json`, `source: resilience_record`).
  - `SG_MAS_BCM.1`: `ent.flags` includes `sg_mas_licensed` → applies. MAS 1.9: "applicable to all FIs as defined in Section 2 of the Financial Services and Markets Act 2022" [V].
  - `SG_MAS_BCM.2`: Singapore establishment and financial sector → likely_confirm.
  - `US_FFIEC_BCM.1`: `ent.flags` includes a **new** value `us_federal_banking_supervised` → applies. The flag is added to Sovereign IQ's B1 list (open question [Q5](#16-open-questions-for-the-owner)). Sovereign's existing `us_glba_fi` is broader than the FFIEC agencies' remit, so it is not reused.
- **Grades** are Sovereign IQ's: applies / likely_confirm / advisory / not_applicable. "Likely, confirm" obligations are shown, labelled "confirm whether this applies".
- **`REG-02`** (consultant-confirmed facts, `ent.res_flags`) covers four items:
  - DORA microenterprise (Art. 12(4) and Art. 24(6) do not apply) [S];
  - identified for DORA TLPT (Art. 26) [S];
  - NYDFS 500.19(a) limited exemption, which exempts 500.16 [S];
  - the service runs on a MAS critical system (the TRM floor).

### 7.2 Regimes in v1 and their dates

On the review date, 27 Oct 2026.

| Regime | Instrument | Kind | Date state | Source (status) |
|---|---|---|---|---|
| `EU_DORA` | Regulation (EU) 2022/2554 | Rule | Applies since 17 Jan 2025 | Sovereign registry CLM-SOV-033; Springlex OJ text [S] |
| `UK_OPRES` | PRA SS1/21 (March 2022 version) and FCA SYSC 15A | Rule (SYSC 15A, PRA Operational Resilience Parts), with PRA supervisory expectations | In force since 31 Mar 2022; firms to remain within tolerance no later than 31 Mar 2025 (SS1/21 4.14) | [V] |
| UK reporting | FCA PS26/2 and PRA PS7/26: operational incident and third-party reporting | Rule | **Applies later:** from 18 Mar 2027 (published 18 Mar 2026) | FCA PS26/2 page [V]; PRA PS7/26 [P] |
| `AU_APRA_CPS230` | APRA CPS 230 | Rule | Applies since 1 Jul 2025 (para 6) | [V] |
| `SG_MAS_BCM` | MAS Guidelines on BCM (June 2022) | Guideline ("sound BCM principles that FIs are encouraged to adopt"; MAS reviews against them, 1.4–1.6) | In force | [V] |
| `SG_MAS_TRM` (floor only) | MAS TRM Notices (e.g. FSM-N09) | Rule | FSM-N09 effective 10 May 2024 | [V] FSM-N09; other notices UNSOURCED |
| `US_NYDFS_500` | 23 NYCRR 500.16 | Rule | Amended 500.16 duties apply since 1 Nov 2024 (500.22(d)(2): one year after the second amendment, effective 1 Nov 2023) | Cornell LII [S] |
| `US_FFIEC_BCM` | FFIEC IT Examination Handbook, Business Continuity Management booklet (14 Nov 2019) | Examination expectation: "The changes do not impose new requirements on examined entities" | Since Nov 2019 | FDIC FIL-71-2019 [V]; OCC Bulletin 2019-57 [V]; booklet sections UNSOURCED (site returned 403) |

Out of v1 (open question [Q12](#16-open-questions-for-the-owner)):
- NIS2 Art. 21(2)(c) business continuity for non-financial essential and important entities;
- the DORA RTS on the ICT risk-management framework (Delegated Regulation (EU) 2024/1774, ICT business continuity articles) [P];
- HKMA OR-2;
- RBI and SEBI resilience rules;
- NZ RBNZ BS11.

### 7.3 Status of an obligation

Each obligation is a set of **capability checks** (`obligation.schema.json`, `check`). Each check is a question plus the answers that meet it and that partly meet it.
- Any other answer fails, and **Unknown fails** (Unknown counts as risk).
- A check whose question was not asked in the mode is "not asked".
- Comparison checks (proven recovery versus tolerance): a proven band lower than the tolerance band meets; the same band partly meets; a higher band or "Not proven" fails.

| Status | Rule |
|---|---|
| **Met** | Every check asked, and every check meets. Shown as "met (self-reported)" unless every meeting check is backed by consultant-validated evidence, then "met (evidenced)" (D8; R10.4) |
| **Partly** | At least one asked check meets or partly meets, but not all meet, or some checks were not asked |
| **Not evidenced** | No asked check meets or partly meets |
| **Not assessed** | No check asked in this mode, or the obligation has no capability check (for example the UK self-assessment document, which is an evidence item) |
| **Applies later** | The obligation applies from a future date; shown with the date |
| **Assessed in Sovereign IQ** | Reporting windows, registers and contract terms (section 7.5) |

**Wording on every screen and page:** "Indicative status from your answers; not a compliance opinion." The words "compliant", "non-compliant" and "certified" are banned (RQ2 language lint).

### 7.4 Obligations and their capability checks

Article references are given to the paragraph. Status is the verification status of the passage.

**EU: DORA** (`EU_DORA`; not microenterprises where stated)

| Obligation | Article | Plain summary | Checks (meets / partly) | Status |
|---|---|---|---|---|
| `EU_DORA.BIA` | Art. 11(5) | Business impact analysis of severe disruption | `EX-02` defined; `EX-05` validated / partially or stale | S |
| `EU_DORA.BC_TESTING` | Art. 11(6) | Test ICT business continuity and response and recovery plans at least yearly, including cyber-attack and switchover scenarios | `EX-07` within 12 months; `EX-16` regularly or occasionally / technical only; `AF-CY-04` successfully / partially or tabletop | S |
| `EU_DORA.AUDIT` | Art. 11(3) | Response and recovery plans reviewed by independent internal audit | `AUD-01` within 12 months or 1–3 years / more than 3 years | S; the 3-year threshold is an LTM heuristic (DORA states no interval) |
| `EU_DORA.BACKUP_RESTORE` | Art. 12(1)–(2) | Backup policy, backup systems, periodic testing of restore | `EX-09` immutable and restore tested / immutable not tested or recoverable not immutable | S |
| `EU_DORA.SEGREGATED_RESTORE` | Art. 12(3) | Restore on ICT systems "physically and logically segregated from the source ICT system" | `EX-08` isolated and tested / isolated by design; `AF-CY-01` No / Partly | S |
| `EU_DORA.REDUNDANCY` | Art. 12(4) (not microenterprises) | Redundant ICT capacities | `EX-12` none / non-critical only; `AF-DR-04` No / Partially | S |
| `EU_DORA.RECOVERY_OBJECTIVES` | Art. 12(6) | RTO and RPO for each function, considering whether it is critical or important | `EX-03`, `EX-04` defined | S |
| `EU_DORA.TEST_PROGRAMME` | Art. 24(6) (not microenterprises) | Appropriate tests at least yearly on all ICT systems supporting critical or important functions | `EX-07` within 12 months; `AF-TS-03` continuous, per change or quarterly to annually / ad hoc | S |
| `EU_DORA.TLPT` | Art. 26 | Threat-led penetration testing, only if identified by the authority | Not assessed here (security testing); shown when `REG-02` records identification | S |
| `EU_DORA.EXIT_TEST` | Art. 28(8) | Exit plans for ICT services supporting critical or important functions, "sufficiently tested and reviewed periodically" | `EXIT-01` rehearsed / tabletop or documented; `AF-TP-03` within tolerance / within days | S |
| `EU_DORA.INCIDENTS` | Art. 19 | Major ICT incident reporting | Assessed in Sovereign IQ | (Sovereign) |

**UK: PRA SS1/21 and FCA SYSC 15A** (`UK_OPRES`)

| Obligation | Article | Plain summary | Checks | Status |
|---|---|---|---|---|
| `UK_OPRES.IBS` | SYSC 15A.2.1R, 15A.2.2R; SS1/21 2.10 | Identify important business services; review at least annually | `EX-01` defined; `REV-01` within 12 months | V |
| `UK_OPRES.TOLERANCE` | SYSC 15A.2.5R; SS1/21 3.10–3.12 | An impact tolerance for each service, with a time-based metric | `EX-02` defined | V |
| `UK_OPRES.WITHIN_TOLERANCE` | SYSC 15A.2.9R; SS1/21 4.14, 4.16 | Able to remain within tolerance in a severe but plausible disruption; no later than 31 Mar 2025 | `EX-06` proven / likely; `AF-DR-01` within `EX-02` (comparison) | V |
| `UK_OPRES.MAPPING` | SYSC 15A.4.1R; SS1/21 ch.5, 5.9 | Map people, processes, technology, facilities and information; update at least annually | `EX-05` validated / partially or stale | V |
| `UK_OPRES.SCENARIO_TESTING` | SYSC 15A.5.3R; SS1/21 ch.6 | Scenario testing of the ability to remain within tolerance | `EX-16` regularly or occasionally / technical only; `AF-TS-02` Yes / Partially | V |
| `UK_OPRES.SELF_ASSESSMENT` | SYSC 15A.6.1R; SS1/21 ch.8 | Written self-assessment, kept up to date | Evidence item only: not assessed unless the consultant validates the document | V |
| `UK_OPRES.REPORTING` | FCA PS26/2; PRA PS7/26 | Operational incident and material third-party reporting | Applies later (18 Mar 2027); assessed in Sovereign IQ | V (FCA), P (PRA) |

**Australia: APRA CPS 230** (`AU_APRA_CPS230`)

| Obligation | Article | Plain summary | Checks | Status |
|---|---|---|---|---|
| `AU_APRA_CPS230.CRITICAL_OPS` | Paras 34(a), 35–36 | Register of critical operations | `EX-01` defined; `EX-05` validated / partially or stale | V |
| `AU_APRA_CPS230.TOLERANCE_LEVELS` | Para 38(a)–(c) | Tolerance levels for maximum disruption time, maximum data loss and minimum service levels | `EX-02`, `TOL-02` defined; `TOL-03` measurable / words only | V |
| `AU_APRA_CPS230.BCP_CAPABILITY` | Paras 34(c), 40–41 | A credible BCP to stay within tolerance, with capabilities to execute it | `EX-13` proven / documented or partially; `EX-14` exercised / documented or partially; `AF-DR-01` within `EX-02` | V |
| `AU_APRA_CPS230.NOTIFY_24H` | Para 42 | Notify APRA within 24 hours of disruption outside tolerance | Assessed in Sovereign IQ | V |
| `AU_APRA_CPS230.TESTING` | Paras 43–44 | Systematic testing, an annual business continuity exercise, severe but plausible scenarios including material service provider disruption | `EX-07` within 12 months; `EX-16` regularly or occasionally / technical; `EX-17` tested / documented | V |
| `AU_APRA_CPS230.ANNUAL_UPDATE` | Para 45 | Update the BCP annually as needed | `REV-01` within 12 months | V |
| `AU_APRA_CPS230.INTERNAL_AUDIT` | Para 46 | Internal audit periodically reviews the BCP and testing | `AUD-01` within 12 months or 1–3 years / more than 3 years | V; "periodically" has no interval, the 3-year line is an LTM heuristic |
| `AU_APRA_CPS230.ORDERLY_EXIT` | Para 56 | Able to execute the BCP and conduct an orderly exit from each material arrangement | `EXIT-01` rehearsed / tabletop or documented; `AF-TP-03` within tolerance / within days | V |

**Singapore: MAS Guidelines on BCM, June 2022** (`SG_MAS_BCM`), plus the TRM floor

| Obligation | Article | Plain summary | Checks | Status |
|---|---|---|---|---|
| `SG_MAS_BCM.CBS` | 2.3, 2.5 | Identify critical business services; appoint people accountable for their recovery | `EX-01` defined; `AF-GV-01` named business owner | V |
| `SG_MAS_BCM.SRTO` | 3.1–3.2; glossary footnote 1 | An SRTO for each critical business service; function RTOs meet it; a pre-determined minimum service level | `EX-02`, `EX-03` defined; `TOL-03` measurable / words only | V |
| `SG_MAS_BCM.DEPENDENCY_MAP` | 4.1–4.2 | End-to-end dependency map used to verify recovery can meet the SRTO | `EX-05` validated / partially or stale | V |
| `SG_MAS_BCM.THIRD_PARTIES` | 4.4 | Measures so third parties meet the SRTO; review and verify their BCPs are tested | `EX-17` tested / documented; `AF-TP-04` independent or customer test / provider evidence | V |
| `SG_MAS_BCM.CONCENTRATION` | Section 5 | Manage concentration risk | `EX-11` none / moderate | V |
| `SG_MAS_BCM.ANNUAL_REVIEW` | 6.7 | Review services, SRTOs and RTOs and dependencies at least annually | `REV-01` within 12 months | V |
| `SG_MAS_BCM.TESTING` | 7.2–7.3 | Test under severe but plausible scenarios; verify SRTOs can be met; frequency by criticality | `EX-16` regularly or occasionally / technical; `EX-06` proven / likely | V |
| `SG_MAS_BCM.AUDIT` | 8.2–8.3 | Audit the BCM framework and each critical service's BCM at least once every three years, by a qualified independent party | `AUD-01` within 12 months or 1–3 years | V |
| `SG_MAS_TRM.RTO_4H` | TRM Notice for the licence type (FSM-N09 para 6) | RTO of no more than 4 hours for each critical system | `EX-03` within 4 hours; `AF-DR-01` within 4 hours | V for FSM-N09; other notices UNSOURCED (consultant view only) |

**US: NYDFS 23 NYCRR 500.16** (`US_NYDFS_500`; not applicable when `REG-02` records the 500.19(a) limited exemption)

| Obligation | Article | Plain summary | Checks | Status |
|---|---|---|---|---|
| `US_NYDFS_500.BCDR_PLAN` | 500.16(a)(2) | BCDR plan: essential data, systems, people and third parties; recovery procedures; offsite backups | `EX-05` validated / partially; `EX-10` answered (not Unknown); `EX-09` tested / immutable not tested or recoverable | S |
| `US_NYDFS_500.PLAN_TESTING` | 500.16(d)(1) | Test incident response and BCDR plans at least annually with critical staff and management | `EX-07` within 12 months; `EX-14` exercised | S |
| `US_NYDFS_500.RESTORE_TESTING` | 500.16(d)(2) | Test the ability to restore critical data and systems from backups at least annually | `EX-09` restore tested; `AF-DR-03` includes data restore | S |
| `US_NYDFS_500.BACKUP_PROTECTION` | 500.16(e) | Backups "adequately protected from unauthorized alterations or destruction" | `EX-09` immutable (tested or not); `EX-08` isolated and tested / isolated by design; `AF-CY-01` No / Partly | S |
| `US_NYDFS_500.NOTICE` | 500.17 | 72-hour notice | Assessed in Sovereign IQ | (Sovereign) |

The NYDFS ransomware guidance of 30 Jun 2021 [V] is shown as context for `BACKUP_PROTECTION` and `RESTORE_TESTING`: "at least one set of backups should be segregated from the network and offline"; "periodically test backups by actually restoring critical systems from backups". It is guidance, not a rule.

**US: FFIEC BCM booklet** (`US_FFIEC_BCM`; shown as "examination expectation", no severity uplift)

| Obligation | Theme | Checks | Status |
|---|---|---|---|
| `US_FFIEC_BCM.BIA` | Business impact analysis | `EX-02` defined; `EX-05` validated / partially | Themes from FDIC FIL-71-2019 and OCC 2019-57 [V]; booklet section numbers UNSOURCED |
| `US_FFIEC_BCM.EXERCISES_TESTS` | Exercises and tests | `EX-07` within 12 months; `EX-16` regularly or occasionally | As above |
| `US_FFIEC_BCM.BOARD_REPORTING` | Reporting to the board | `EX-15` with metrics and actions / periodic | As above |
| `US_FFIEC_BCM.THIRD_PARTIES` | Third-party service providers | `EX-17` tested / documented | As above (OCC bulletin tags third-party providers; text UNSOURCED) |
| `US_FFIEC_BCM.CYBER_RESILIENCE` | Resilience to cyber events | `EX-09` immutable; `EX-08` isolated | As above (OCC: cyber events among disruptions) |

### 7.5 Boundary with Sovereign IQ

This confirms Sovereign IQ DESIGN.md section 11 from the Resilience side (PLAN gate RQ1, Sovereign gate S1).

| Topic | Sovereign IQ | Resilience IQ |
|---|---|---|
| Regime applicability | Owns the registry, grades and fact IDs | Reads them; adds `SG_MAS_BCM` and `US_FFIEC_BCM` records in the same language; asks `REG-01` only if Sovereign IQ has not run |
| Reporting windows (DORA Art. 19, CPS 230 paras 33 and 42, NYDFS 500.17, MAS TRM 1-hour notice, UK PS26/2 and PS7/26) | Assesses (`SOV.IR.REPORTING`) | Lists them as "assessed in Sovereign IQ"; assesses incident response and recovery capability |
| Third-party register, contract terms, audit rights | Assesses (`SOV.TP.REGISTER`, `SOV.TP.AUDIT`) | Not assessed |
| Exit | Flags whether an exit plan exists (`SOV.EXIT.PLAN`, X1) | Owns exit testing and exit speed (`EXIT-01`, `AF-TP-03`) |
| Concentration | Flags it as sovereignty and regulatory exposure (`SOV.CONC.PROVIDER`, X2) | Owns it as a recovery risk (`EX-11`, `AF-TP-02`, G-04, G-08) |
| Residency constraint | Owns it | `AF-CL-03` becomes a referral (`REF.SOVEREIGN_IQ`), not a score |
| Prefill | X1 and X2 from `AF-TP-03` and `AF-TP-02`, with the consultant's confirmation (Sovereign Q8) | `REG-01` from Sovereign IQ's B1, A1/A2 and A3, with the consultant's confirmation |

**Additions this pack asks the Sovereign IQ owner to agree** (open questions Q5 and Q14):
- the new B1 value `us_federal_banking_supervised`;
- the two Resilience-owned regime records living in `resilience-iq/knowledge/obligations.json`, read with Sovereign's `conditions.ts`.

---

## 8. Impact model (D5)

| Element | Design |
|---|---|
| Input | Optional, per service, workshop mode: **cost per hour of disruption as a low–high range** in the client's currency, with who estimated it. No default and no market figure is ever substituted ("no invented money", RQ4) |
| Hours gap | Between the **proven** recovery time (`AF-DR-01`) and the **required** RTO (effective `EX-03`). Bands in hours: < 15 min [0, 0.25]; 15–60 min [0.25, 1]; 1–4 h [1, 4]; 4–24 h [4, 24]; > 24 h [24, open]. Gap low = max(0, proven lower bound − RTO upper bound); gap high = proven upper bound − RTO lower bound |
| Impact | Range = cost low × gap low to cost high × gap high, shown with the formula and the input's name: "Based on your estimate of GBP 0.4–1.2m per hour and a recovery proven at 4–24 hours against a 1–4 hour objective: GBP 0–27.6m per event." The low end can be zero when the bands touch; it is shown as zero, not hidden |
| Open-ended proven time (`> 24 hours`) | Lower bound shown ("at least …"), plus the cost of each further day (cost × 24). No invented upper bound (open question [Q10](#16-open-questions-for-the-owner)) |
| Not shown | No cost input; proven within the RTO; RTO Unknown; proven time "Not proven" (then: "cost per hour of overrun: GBP x–y; recovery time not yet proven") |
| Totals | A sum across services only of shown ranges, with the services named; reconciled in RQ4 |
| Label | "Indicative range from your own cost estimate; not a forecast of loss." |
| Context, never multiplied | Published figures shown in the Method tab with source, year and sample, never combined with client values. IBM Cost of a Data Breach 2025: global average USD 4.44m, 600 organisations [S]; 2026: USD 4.99m [S]. Uptime Institute Annual Outage Analysis 2025: 54% of respondents put their last significant outage above USD 100,000, 20% above USD 1m [S]. ENISA Threat Landscape 2025: 4,875 incidents, Jul 2024–Jun 2025, ransomware the most impactful threat [P]. RQ2 reads each primary publication and records sample and method |
| Investment | Never on the client screen. Indicative scope ranges appear only in the consultant SOW (RQ9) |

---

## 9. Findings

### 9.1 What creates a finding

| Type | Created by |
|---|---|
| `requirement_gap` | `RES.REQ.DEFINED` (an Unknown requirement) or `RES.REQ.TOLERANCE` (data-loss or minimum-service tolerance missing) |
| `conflict` | A consistency rule applied (`RES.REQ.CONSISTENT`) or answers that contradict each other, for example `EX-06` "proven" with `EX-07` "Never" |
| `control_gap` | A control below its required state ([9.3](#93-control-catalogue)) |
| `decision` | The DR-05 business choice; a risk the client accepts (`AF-GV-02` formal approval) |
| `referral` | `AF-CL-03` constrained: refer to Sovereign IQ |

### 9.2 Finding record (`finding.schema.json`)

Every finding carries the following fields, which meet scorecard area 6:
- `id` and `control`, for example `F-RES.CYBER.ISOLATION@S1`;
- `legacyGap`, for golden-diff continuity;
- `service`;
- `severity` and `severityReason`;
- `evidenceStatus`: self-reported / evidenced / evidence rejected (D8: only a consultant or Admin validates);
- `title`, in plain words;
- `businessConsequence`;
- `decisionOrAction`, which always ends in a decision or an action;
- `ownerRole`;
- `timeFrame`;
- `obligations`, each with regime, article and status;
- `playbookRefs`: control × platform × level, with `needsDiscovery` at application level;
- `offerings`;
- `basisQuestions`;
- `claims`;
- `consultantNote`, which the server's client-view projection removes.

### 9.3 Control catalogue

Owner roles replace the RA-01 to RA-10 strings with roles a CIO recognises. Offerings are those of PLAN RQ9.

| Control | What good looks like | Legacy gap | Raised by | Owner role | Playbook level (RQ8) | Offering |
|---|---|---|---|---|---|---|
| `RES.REQ.DEFINED` | Tolerances, RTO and RPO approved for each service | G-01 | `EX-02`–`EX-04` Unknown | Business service owner | — | OFF.RES.DR_ASSESS |
| `RES.REQ.CONSISTENT` | RTO and RPO within tolerance | — | Consistency rule | Business service owner | — | OFF.RES.DR_ASSESS |
| `RES.REQ.TOLERANCE` | Data-loss and minimum-service tolerances set | — | `TOL-02` Unknown; `TOL-03` not measurable | Chief Risk Officer or head of operational resilience | — | OFF.RES.REG_READINESS |
| `RES.DR.STRATEGY` | Proven recovery meets the effective RTO and RPO at the recommended rung | — | `AF-DR-01`/`AF-DR-02` worse than required; `EX-06` No | Head of infrastructure and platform engineering | Stack (`RES.DR.STRATEGY.<rung>`) | OFF.RES.DR_BUILD |
| `RES.DR.PROVEN` | End-to-end recovery tested within 12 months | G-02 | `EX-06` likely; `EX-07` more than 12 months; `EX-09` immutable not tested | BCM lead | Stack | OFF.RES.MANAGED_TESTING |
| `RES.DR.SEPARATION` | Recovery does not share production's failure domain | G-04 | `EX-11` high or Unknown; `AF-DR-04` Yes or Unknown | Enterprise architecture lead | Platform | OFF.RES.DR_BUILD |
| `RES.DR.ORCHESTRATION` | Recovery runs as code, with approval steps only | G-09 | `AF-DR-05` manual, partial or Unknown | Head of infrastructure and platform engineering | Stack | OFF.RES.DR_BUILD |
| `RES.DATA.REPLICATION` | Continuous replication meeting the RPO | — | RPO < 15 min and `AF-DR-02` worse or not proven | Head of infrastructure and platform engineering | Stack | OFF.RES.DR_BUILD |
| `RES.BACKUP.RECOVERABLE` | Usable backups of critical data | G-03 | `EX-09` No or Unknown | Head of infrastructure and platform engineering | Platform | OFF.RES.CYBER_VAULT |
| `RES.BACKUP.IMMUTABLE` | Retention a compromised administrator cannot shorten | G-03 | `EX-09` recoverable not immutable | CISO | Platform | OFF.RES.CYBER_VAULT |
| `RES.BACKUP.PITR` | Restore to a point before corruption, tested | — | `DC-01` | Head of infrastructure and platform engineering | Stack | OFF.RES.DR_BUILD |
| `RES.SAAS.BACKUP` | Independent, restore-tested copy of SaaS data | — | `SAAS-01` | CIO | Platform | OFF.RES.CYBER_VAULT |
| `RES.CYBER.ISOLATION` | Backups and recovery tooling in a separate trust boundary with separate credentials and multi-party control | G-05 | Cyber modifier | CISO | Platform | OFF.RES.CYBER_VAULT |
| `RES.CYBER.CLEANROOM` | Restore into an isolated environment, scan and validate, then promote | — | `AF-CY-02`, `AF-CY-04` | CISO | Stack | OFF.RES.CYBER_VAULT |
| `RES.IDENTITY.RECOVERY` | Break-glass identities outside the primary identity provider; directory and key recovery tested | G-06 | `EX-19` | Identity and access lead | Platform | OFF.RES.CYBER_VAULT |
| `RES.DEPENDENCY.MAP` | Validated end-to-end map per service, reviewed annually | G-07 | `EX-05`, `AF-DR-04`, `AF-BIA-02`/`04` | Enterprise architecture lead | Application (needs discovery) | OFF.RES.DR_ASSESS |
| `RES.TP.CONCENTRATION` | Concentration known and treated | G-08 | `EX-11` moderate or higher; `AF-TP-02` | Procurement and third-party risk lead | Platform | OFF.RES.TP_EXIT |
| `RES.TP.EXIT` | Exit or substitution rehearsed within tolerance | — | `EX-10`, `EXIT-01`, `AF-TP-03` | Procurement and third-party risk lead | Application (needs discovery) | OFF.RES.TP_EXIT |
| `RES.TP.CONTINUITY` | Critical providers' continuity tested with the client | — | `EX-17`, `AF-TP-01`, `AF-TP-04` | Procurement and third-party risk lead | — | OFF.RES.TP_EXIT |
| `RES.TEST.SCENARIO` | Severe but plausible scenarios exercised across business and technology | G-10 | `EX-16`, `AF-TS-02` | BCM lead | — | OFF.RES.MANAGED_TESTING |
| `RES.TEST.CONTINUOUS` | Recovery revalidated after material change | — | `AF-TS-03` | Head of infrastructure and platform engineering | Stack | OFF.RES.MANAGED_TESTING |
| `RES.BCP.WORKFORCE` | Processes continue without key people or the main site | — | `EX-13` | BCM lead | — | OFF.RES.DR_ASSESS |
| `RES.BCP.CRISIS` | Crisis management exercised | — | `EX-14` | BCM lead | — | OFF.RES.REG_READINESS |
| `RES.GOV.OVERSIGHT` | Leadership review with metrics; named owners; exceptions with expiry | — | `EX-15`, `AF-GV-01`–`03` | CIO | — | OFF.RES.PROGRAMME |
| `RES.GOV.REVIEW` | Services, tolerances and maps reviewed at least annually | — | `REV-01` | Chief Risk Officer or head of operational resilience | — | OFF.RES.REG_READINESS |
| `RES.GOV.AUDIT` | Independent BCM audit on cycle | — | `AUD-01` | Head of internal audit | — | OFF.RES.REG_READINESS |
| `RES.INFRA.SPOF` | No critical single points of failure | — | `EX-12` | Head of infrastructure and platform engineering | Platform | OFF.RES.DR_BUILD |
| `RES.INFRA.REBUILD` | Recovery environment rebuildable from code or golden images | — | `AF-CL-04`, `AF-OP-03` | Head of infrastructure and platform engineering | Stack | OFF.RES.DR_BUILD |
| `RES.INFRA.NETWORK` | Diverse network paths to recovery | — | `AF-OP-02` | Head of infrastructure and platform engineering | Platform | OFF.RES.DR_BUILD |

**Provider statements the cyber-recovery playbook will rely on** (checked today, carried to RQ8):
- **AWS:** a logically air-gapped vault is "always locked with a vault lock in compliance mode". Backups are stored in an AWS Backup service-owned account. With multi-party approval they can be restored "even if the vault-owning account is inaccessible", and they can be shared with other accounts through AWS RAM for recovery or restore testing [SRC-AWS-LAG V]. The isolation is logical, not physical.
- **Azure:** multi-user authorisation for Recovery Services and Backup vaults uses a Resource Guard, which "can be in a different subscription or a different tenant". It protects critical operations such as disabling soft delete or immutability, reducing retention and, optionally, restore [SRC-AZ-MUA V, updated 27 Oct 2026]. Immutable vault: enabled and locked, generally available in all public and US government regions [SRC-AZ-IMMUT V, validation row 24].
- **Google Cloud:** a backup vault "provides isolated, immutable, and indelible storage for backups". Enforced retention runs from 1 day to 99 years and can be locked so it can only increase. From 1 Nov 2026 a project-level lien applies to projects holding enforced-retention backups [SRC-GCP-VAULT V, updated 26 Oct 2026].
- **On-premises, OCI, IBM Cloud and sovereign providers:** WORM-capable repositories or provider retention-lock features, found in discovery. Not assumed.
- **Replication is never a cyber-recovery control.** AWS: replication "will not protect you against data corruption or destruction" unless point-in-time recovery is included [V].

### 9.4 Severity and time frame

LTM heuristic, assumption `ASM-RES` to be registered in RQ2. It is built on the blueprint engine's existing definition: Critical is a "gap [that] can prevent a critical business service from operating within impact tolerance or can invalidate recovery".

| Severity | Rules (examples) | Default time frame |
|---|---|---|
| Critical | Requirement Unknown (G-01); no usable or non-immutable backups (G-03); recovery correlated with production (G-04); recovery reachable by ransomware, or Unknown (G-05); no identity recovery path, or Unknown (G-06); proven recovery beyond the impact tolerance; critical single points of failure | 0–3 months |
| High | Proven recovery beyond the RTO but within tolerance; unproven recovery (incl. R9 decision 3); isolation or identity documented but untested; dependency map incomplete; moderate concentration; exit untested; scenario testing missing; point-in-time restore or SaaS backup missing; consistency conflict; manual recovery at DR-03 or above | 3–6 months |
| Medium | Partial orchestration; workforce or crisis plans partial; governance informal; review or audit cycle late where no regime applies | 6–12 months |
| Low | Documented but not exercised where nothing else depends on it | 12–24 months |

**Obligation uplift:** a finding cited by an obligation that applies now (kind rule or guideline) with status "not evidenced" is at least High. No uplift for FFIEC examination expectations.

**Dated obligations:**
- An obligation that applies later sets the time frame "by date", for example UK reporting by 18 Mar 2027.
- An obligation whose compliance date has passed and is "not evidenced" shows "the date by which this was expected has passed", for example SS1/21 4.14, 31 Mar 2025, with the article in `drivenBy`.

### 9.5 How LTM can help (pull-through; detail in RQ9)

| Offering | Type | Typical controls |
|---|---|---|
| OFF.RES.DR_ASSESS: DR assessment and strategy validation (Resilience Engineering) | Advisory | REQ.*, DEPENDENCY.MAP, BCP.WORKFORCE, ladder decisions per service |
| OFF.RES.REG_READINESS: operational resilience regulatory readiness | Advisory | REQ.TOLERANCE, GOV.REVIEW, GOV.AUDIT, BCP.CRISIS, obligations not evidenced (counsel engaged by the client) |
| OFF.RES.CYBER_VAULT: cyber recovery vault and clean room (Resilience Engineering with Cloud Transformation) | Implementation | BACKUP.*, CYBER.*, IDENTITY.RECOVERY, SAAS.BACKUP |
| OFF.RES.DR_BUILD: DR build to the target rung | Implementation | DR.STRATEGY, DR.SEPARATION, DR.ORCHESTRATION, DATA.REPLICATION, BACKUP.PITR, INFRA.* |
| OFF.RES.TP_EXIT: third-party exit and concentration (with Sovereign Cloud where sovereignty drives it) | Advisory, then implementation | TP.* |
| OFF.RES.PROGRAMME: resilience engineering programme | Transformation | Several High findings; maturity Defined or below; GOV.OVERSIGHT |
| OFF.RES.MANAGED_TESTING: managed recovery testing | Transformation (run) | DR.PROVEN, TEST.* |
| REF.SOVEREIGN_IQ | Referral | `AF-CL-03` constrained; exit or concentration driven by sovereignty |

The roadmap workstreams in PLAN RQ7 item 3 are built from these controls. Every roadmap item traces to a finding.

---

## 10. Modes (D7)

| Mode | Who | Content | Engine |
|---|---|---|---|
| **Executive** | Consultant with the CIO; 15–20 minutes, timed in RQ6 with three internal users | 22 questions: `EX-01` to `EX-20`, `REG-01` (skipped if prefilled and confirmed) and `TOL-02`. One service (`S1`). Advisory questions are triggered only by the gate (R9 decision 1) | Same engine and contract, `mode: executive` |
| **Workshop** | Consultant with the resilience, BCM, security and architecture leads | Every advisory family on demand plus the triggered ones; `S1`–`S5`; `TOL-03`, `SAAS-01`, `DC-01`, `AUD-01`, `EXIT-01`, `REV-01`, `REG-02`; cost-per-hour input | `mode: workshop` |
| **Client view** | The client, read-only | A server projection, like Sovereign IQ's `client-view.ts`. It excludes: domain weights; option scores; the decision log's internal lines; consultant notes; UNSOURCED content (for example the MAS TRM floor for licence types not yet sourced); probes; SOW and fees | Server-side, RQ6 |

If RQ6 timing shows the executive set runs past 20 minutes, `TOL-02` moves into the `EX-04` screen as a second row, rather than being dropped (open question [Q7](#16-open-questions-for-the-owner)). Until RQ12, the tool is consultant-led only (D15).

---

## 11. Results screen mapped to the tabs built in PR #75

The tabs stay as built on 27 Oct 2026: Overview, Recovery strategy, Gaps and risks, Roadmap, Evidence, Method. This pack changes their content, not their structure (open question [Q8](#16-open-questions-for-the-owner)).

| Tab | Shows (v2) | Replaces or adds | Engine fields (RQ3) |
|---|---|---|---|
| **Header KPIs** | Resilience posture with rating and cap reason; critical exposure; recovery strategy for `S1` in words (no "fit /100"); obligations not evidenced (count); impact range where given | Drops "fit /100" and the pattern code under the strategy | `headline.*`, `services[0].ladder.rung`, `obligationsSummary`, `services[0].impact` |
| **Overview** | Executive summary in four parts: situation, issue, recommendation, impact with its basis. Requirement baseline per service (tolerances, RTO, RPO, effective values, floors). Top five findings with owner role and time frame. Domain bars (consultant view only) | Executive summary rewritten; domain bars move to consultant view | `executiveSummary{situation,issue,recommendation,impact}`, `services[].requirement`, `findings[]` |
| **Recovery strategy** | Per service: the ladder statement (4.6); the alternative one rung down; the DR-05 business choice where relevant; controls added by modifiers; technology options per selected platform from the playbook, with alternatives and a verification step; "what would change this" | "Strategy ranking /100" retired; "Technology options" read from the playbook (RQ8), not `implementation-mappings.json` | `services[].ladder`, `playbook[]` |
| **Gaps and risks** | Findings, most severe first, each with control (in words), service, severity, evidence status, owner role, time frame, decision or action, and obligation references. A **Regulatory obligations** card: regime, article, plain summary, status, questions behind it, and the "not a compliance opinion" label. A **Referrals** card (Sovereign IQ) | Gap register reshaped; obligation card and referral card added | `findings[]`, `obligations[]`, `referrals[]` |
| **Roadmap** | Workstreams (PLAN RQ7 item 3) with activities, owner role, duration, dependencies, effort band, milestones and KPIs; waves on the 0–18 month axis. **How LTM can help** card: each finding's offering, its type and execution outline (no fees). Decision points | Gantt kept; workstreams and the How LTM can help card added | `roadmap.workstreams[]`, `offerings[]` |
| **Evidence** | Evidence register; validation by consultant or Admin only (D8); validated evidence changes confidence and turns "met (self-reported)" into "met (evidenced)"; EU and UK clients record a location, not a file (D11) | "It does not change the score yet" is removed once RQ3 item 6 lands | `evidenceRegister[]`, `findings[].evidenceStatus` |
| **Method** | Methodology and edge; the ladder and its sources; "How we calculated this" (every number with inputs, formula and claim or assumption ID); assumption register; published context figures with source, year and sample; version, date, "data provided by"; disclaimer; hosting statement; AI state ("no AI used", D10) | Paragraph replaced by the full panel (RQ7) | `method.*`, `assumptions[]`, `version` |

---

## 12. Question map

### 12.1 Rules

- Every question cites its basis, with a status.
- "Unknown" is offered on every scored, requirement and comparison question, and is scored as risk (R9 decision 1). Scope and diagnostic questions are never scored.
- Overlapping options are removed (validation M1).
- Option wording is in plain English; IDs are never shown to the client.
- "Scope" says whether the question is asked per service or once for the enterprise.
- Option scores are registered in RQ2 (assumption A2), not here.

**Count:** 52 existing questions.
- **Kept:** 19 (6 executive, 13 advisory).
- **Reworded:** 29 (14 executive, 15 advisory). Of these, 11 only add an "Unknown" option or reorder options.
- **Retired:** 4 (3 duplicates and AF-CL-03, which becomes a referral).
- **New:** 9.
  - 8 cover the brief's six items; regime facts and tolerances are each split into two questions.
  - `REV-01` needs owner approval ([Q4](#16-open-questions-for-the-owner)).

### 12.2 Executive questions (EX-01 to EX-20)

| ID | Map | v2 wording (or change) | Unknown | Scope | Role | Basis (status) |
|---|---|---|---|---|---|---|
| EX-01 | Reword | "Which of your business services would cause the most harm if disrupted? Name the most critical one first." Same options plus "Not yet identified"; short service name | Added ("Not yet identified") | Service | Scope (unscored, R3 D4) | SS1/21 ch.2, 2.10 [V]; SYSC 15A.2.1R [V]; CPS 230 paras 34(a), 35–36 [V]; MAS 2.3 [V] |
| EX-02 | Reword | "For this service, how long can it be disrupted before the harm becomes intolerable (your impact tolerance)?" Options unchanged | Yes | Service | Requirement | SS1/21 3.10–3.12 [V]; SYSC 15A.2.5R [V]; CPS 230 38(a) [V]; MAS 3.1 [V] |
| EX-03 | Reword | "What recovery time objective (RTO) have you set for this service? It should be no longer than the impact tolerance." | Yes | Service | Requirement; ladder input | DORA Art. 12(6) [S]; SS1/21 3.14 [V]; MAS 3.2 [V]; AWS REL13-BP01 [P] |
| EX-04 | Reword | "What recovery point objective (RPO) have you set: how much recent data could you lose?" Options unchanged | Yes | Service | Requirement; ladder input | DORA Art. 12(6) [S]; SS1/21 3.14 [V] |
| EX-05 | Reword | "Is this service mapped end to end to its people, processes, technology, facilities, data and third parties?" Rendered as single select; the matrix gains Unknown (M1) | Yes (added to the matrix) | Service | Scored | SYSC 15A.4.1R [V]; SS1/21 ch.5 [V]; MAS 4.1 [V]; CPS 230 40(d) [V]; NYDFS 500.16(a)(2) [S] |
| EX-06 | Keep | "Can this service be recovered within its RTO today?" | Yes | Service | Scored | SYSC 15A.2.9R [V]; MAS 7.2 [V] |
| EX-07 | Keep | "When was the last successful end-to-end recovery test of this service?" | Yes | Service | Scored | DORA Art. 11(6), 24(6) [S]; CPS 230 43 [V]; NYDFS 500.16(d) [S] |
| EX-08 | Reword | "Could ransomware or a destructive attack reach both production and your recovery copies (backups, replicas, recovery tools)?" Options: No, recovery is isolated and this has been tested / No, isolated by design, not tested / Yes / Unknown. "Potentially" removed (it overlapped Unknown) | Yes | Service | Scored; cyber modifier | DORA Art. 12(3) [S]; NYDFS 500.16(e) [S]; NYDFS ransomware guidance [V]; NIST CSF 2.0 RC.RP-03 [S] |
| EX-09 | Reword | "Are this service's critical backups immutable, and has a restore been tested?" Options: Yes, immutable and restore tested in the last 12 months / Immutable, restore not tested / Recoverable but not immutable / No usable backups / Unknown (R9 decision 3) | Yes | Service | Scored | DORA Art. 12(1)–(2) [S]; NYDFS 500.16(d)(2), (e) [S] |
| EX-10 | Keep | "Does this service depend on a third party whose failure could breach its impact tolerance?" | Yes | Service | Scored; third-party modifier | DORA Art. 28(8) [S]; CPS 230 56 [V]; MAS 4.3–4.4 [V] |
| EX-11 | Keep | Concentration (same cloud, region, network, SaaS or other concentration point); R9 decision 6 | Yes | Service | Scored; concentration modifier | MAS section 5 [V]; DORA Art. 29 (Sovereign registry) [S] |
| EX-12 | Reword | "Are there known single points of failure (one component whose loss stops the service) in facilities, power, network, storage, identity or recovery?" Options spelt out, no "SPOF" | Yes | Enterprise | Scored | DORA Art. 11(5) redundancy, 12(4) [S]; AWS REL13 multi-AZ [V] |
| EX-13 | Keep | Processes continue without key people or the main workplace | Yes | Enterprise | Scored | CPS 230 40(c) [V]; MAS 5.3 [V]; ISO 22301 8.4 [P] |
| EX-14 | Reword | Add Unknown; "crisis management and executive decision process … exercised / documented / partially / no / unknown" | **Added** | Enterprise | Scored | CPS 230 40(b), (e) [V]; MAS 9.2 [V]; DORA Art. 11(7) [S] |
| EX-15 | Reword | Add Unknown; "reviewed by accountable business and technology leadership, with metrics and actions" | **Added** | Enterprise | Scored | SYSC 15A.7 [V]; SS1/21 ch.7 [P]; CPS 230 41 [V]; FFIEC board reporting [V theme] |
| EX-16 | Keep | Severe but plausible scenarios exercised across business and technology | Yes | Service | Scored | SYSC 15A.5.3R [V]; SS1/21 ch.6 [V]; CPS 230 43–44 [V]; MAS 7.2 [V]; DORA Art. 11(6) [S] |
| EX-17 | Reword | "Have this service's critical third parties tested their continuity or exit arrangements with you?" Options: Yes, tested with us in the last 12 months / Documented and reviewed, not tested / Contract terms only / No / Unknown ("Documented only" and "Contractual only" overlapped) | Yes | Service | Scored | CPS 230 44, 56 [V]; MAS 4.4 [V]; DORA Art. 28(8) [S] |
| EX-18 | Reword | Environments: On-premises / AWS / Azure / Google Cloud / Oracle Cloud / IBM Cloud / Sovereign or local cloud provider / Other public cloud / SaaS / Unknown | Added | Service | Scope (drives playbook and triggers) | FRAMEWORK area 11 |
| EX-19 | Reword | "If your main identity provider or cloud control plane were compromised, could you still sign in with privileged access to recover (break-glass)?" Options: Yes, separate path tested in the last 12 months / Yes, documented, not tested / No / Unknown ("Partially" removed) | Yes | Enterprise | Scored; identity modifier | AWS REL13 anti-pattern [V]; Azure RE:09 [V]; Microsoft Entra emergency access [P] |
| EX-20 | Reword | "How confident are you that your recovery procedures meet the business objectives?" Options: Independently validated / Tested by us / Documented, not fully tested / Low / Unknown | Yes | Enterprise | Evidence confidence | MAS 8.3 independent audit [V]; ISO 22301 clause 9 [P] |

### 12.3 Advisory questions (32)

| ID | Map | v2 wording (or change) | Unknown | Scope | Role | Basis (status) |
|---|---|---|---|---|---|---|
| AF-BIA-01 | **Retire** | Duplicate of `EX-02`, now asked per service | — | — | — | — |
| AF-BIA-02 | Reword | Add Unknown; "Which resources must be available for this service to operate?" | Added | Service | Scored | SYSC 15A.4.1R [V]; MAS 4.1 [V] |
| AF-BIA-03 | Reword | "Which harms does this service's tolerance consider?" Add Unknown | Added | Service | Diagnostic | SS1/21 2.3, 3.8 [V]; MAS 2.3 [V] |
| AF-BIA-04 | Reword | Add Unknown; "Which dependencies could on their own stop recovery?" | Added | Service | Scored | MAS 4.2 [V]; AWS REL11-BP04 [P] |
| AF-DR-01 | Keep | Proven recovery time; "Not proven" kept (it is the Unknown); impact model input | Yes ("Not proven") | Service | Scored; comparison; impact | SYSC 15A.2.9R [V]; MAS 7.2 [V] |
| AF-DR-02 | Keep | Proven recovery point | Yes ("Not proven") | Service | Scored | As AF-DR-01 |
| AF-DR-03 | Reword | Add "None" and Unknown | Added | Service | Scored | DORA Art. 11(6) switchover [S]; MAS 7.3 footnote 17 [V]; NYDFS 500.16(d)(2) [S] |
| AF-DR-04 | Reword | Options reordered: No / Partially / Yes / Unknown (M1) | Yes | Service | Scored; concentration modifier | AWS REL11-BP04 [P]; Azure design guide [V] |
| AF-DR-05 | Keep | Orchestration | Yes | Service | Scored | Azure RE:09 "automate … recovery procedures" [V]; AWS REL13 [V] |
| AF-DR-06 | Keep | Recovery constraints; "Data residency" is a flag to Sovereign IQ | "None known" | Service | Diagnostic | — (diagnostic) |
| AF-CY-01 | Reword | "Could someone with production administrator credentials change, encrypt or delete your backups?" Options: No, separate credentials and approval / Partly / Yes / Unknown | Yes | Service | Scored | DORA Art. 12(3) [S]; NYDFS 500.16(e) [S]; AWS logically air-gapped vault and multi-party approval [V]; Azure multi-user authorisation [V] |
| AF-CY-02 | Reword | "How are clean recovery points identified and validated?" Absorbs AF-CY-05's "known-good immutable points with validation" | Yes | Service | Scored | NIST CSF 2.0 RC.RP-03 [S] |
| AF-CY-03 | **Retire** | Duplicate of `EX-19` (now with tested / documented options) | — | — | — | — |
| AF-CY-04 | Keep | Destructive cyber recovery executed from compromise to clean recovery | Yes | Service | Scored; DORA Art. 11(6) check | DORA Art. 11(6) cyber-attack scenarios [S]; NYDFS ransomware guidance [V] |
| AF-CY-05 | **Retire** | Overlaps AF-CY-02; merged | — | — | — | — |
| AF-TP-01 | Reword | Add Unknown | Added | Service | Scored | DORA Art. 30 (Sovereign registry) [S]; CPS 230 54 [V]; MAS 4.4 [V] |
| AF-TP-02 | Keep | Concentration if this provider fails; prefill source for Sovereign X2 | Yes | Service | Scored | MAS section 5 [V]; DORA Art. 29 [S] |
| AF-TP-03 | Keep | Time to move to an alternative; prefill source for Sovereign X1 | Yes | Service | Scored; exit check | DORA Art. 28(8) [S]; CPS 230 56 [V] |
| AF-TP-04 | Reword | Add Unknown | Added | Service | Scored | MAS 4.4 [V]; CPS 230 44 [V] |
| AF-CL-01 | Reword | Add Unknown | Added | Service | Scored | AWS REL13 multi-AZ and multi-Region [V] |
| AF-CL-02 | Keep | Control-plane and managed-service dependencies | "None known" | Service | Scored | AWS REL11-BP04 [P] |
| AF-CL-03 | **Retire → referral** | Kept as an unscored flag: "Yes" refers to Sovereign IQ (`REF.SOVEREIGN_IQ`) | Yes | Enterprise | Referral | Sovereign DESIGN section 11 |
| AF-CL-04 | Keep | Rebuild recovery environment from automation | Yes | Service | Scored | Azure design guide (infrastructure as code) [V]; AWS REL13 [V] |
| AF-OP-01 | Keep | Geographically separate recovery site with capacity | Yes | Service | Scored | DORA Art. 12(4)–(5) [S]; MAS 7.3 footnote 17 [V] |
| AF-OP-02 | Keep | Diverse network paths | Yes | Service | Scored | DORA Art. 12(4) [S] |
| AF-OP-03 | Keep | Rebuild configurations without unavailable production systems | Yes | Service | Scored | Azure RE:09 "ensure accessibility during outages" [V] |
| AF-TS-01 | Reword | Add Unknown | Added | Service | Diagnostic | — (diagnostic) |
| AF-TS-02 | Keep | Tests measure recovery against tolerance | Yes | Service | Scored | SYSC 15A.5.3R [V]; CPS 230 43 [V]; MAS 7.2 [V] |
| AF-TS-03 | Reword | Add Unknown | Added | Service | Scored | DORA Art. 11(6) "after substantive changes" [S]; MAS 6.7 [V] |
| AF-GV-01 | Reword | Add Unknown | Added | Service | Scored | MAS 2.5 [V]; SS1/21 ch.7 [P] |
| AF-GV-02 | Reword | Add Unknown | Added | Enterprise | Scored | SS1/21 4.3 remediation plans [V]; otherwise LTM heuristic |
| AF-GV-03 | Reword | Add Unknown | Added | Enterprise | Scored | SS1/21 4.4 prioritisation [V] |

### 12.4 New questions

| ID | Mode | Text and options | Scope | Role | Basis (status) |
|---|---|---|---|---|---|
| REG-01 | Executive (skipped if prefilled and confirmed) | "Which of these describe your organisation or a group company?" A subset of Sovereign IQ B1 (EU financial entities, UK PRA-regulated, UK FCA solo-regulated, APRA-regulated, MAS-licensed, NYDFS-licensed, **US federally supervised bank (new)**, none, not sure) plus establishments and sector (Sovereign A1/A2, A3). Same fact IDs | Enterprise | Scope (facts) | Sovereign registry rules (section 7.1) |
| REG-02 | Workshop, consultant-confirmed | "Do any of these apply?" DORA microenterprise / identified for DORA TLPT / NYDFS 500.19(a) limited exemption / this service runs on a MAS "critical system" / none / not sure | Enterprise (critical system: service) | Scope (facts) | DORA Art. 12(4), 24(6), 26 [S]; NYDFS 500.19(a) [S]; MAS FSM-N09 [V] |
| TOL-02 | Executive | "What is the most data this service could lose in a disruption before the harm is intolerable?" Near-zero / < 15 min / 15–60 min / 1–4 h / 4–24 h / > 24 h / Unknown | Service | Requirement | CPS 230 38(b) [V]; SS1/21 3.11 [V] |
| TOL-03 | Workshop | "While running on alternative arrangements, what minimum service level must this service keep?" Defined and measurable (for example a % of normal volume) / Defined in words only / Not defined / Unknown | Service | Requirement | CPS 230 38(c) [V]; MAS glossary footnote 1 [V]; SS1/21 3.12 [V] |
| SAAS-01 | Workshop (triggered by SaaS in `EX-18`) | "For SaaS applications this service depends on, do you keep an independent copy of your data that you can restore?" Yes, independent backup, restore tested / Provider-native retention only / No / No SaaS supports this service / Unknown | Service | Scored | Microsoft shared responsibility: data always the customer's [V]; DORA Art. 12(1) [S]; NYDFS 500.16(e) [S] |
| DC-01 | Workshop | "Could you restore this service's data to a point before a corruption or malicious change, not only to the latest replica?" Yes, point-in-time restore tested / Configured, not tested / Replication only / No / Unknown | Service | Scored | AWS REL13-BP02 (replication does not protect against corruption without PITR) [V]; Azure RE:09 PITR [V]; SS1/21 3.15 data integrity [V] |
| AUD-01 | Workshop | "When did an independent party (internal audit or external) last audit business continuity management for this service?" Within 12 months / 1–3 years ago / More than 3 years ago / Never / Unknown | Enterprise | Scored | MAS 8.2–8.3 [V]; CPS 230 46 [V]; DORA Art. 11(3) [S] |
| EXIT-01 | Workshop (triggered by `EX-10` or AF-TP) | "For the critical third party this service depends on most, have you tested your exit or substitution plan?" Yes, partial migration or substitution rehearsed / Tabletop walkthrough only / Plan documented, not tested / No plan / No critical third party / Unknown. Owned here (Sovereign boundary) | Service | Scored | DORA Art. 28(8) [S]; CPS 230 56 [V]; MAS 4.4 [V] |
| REV-01 | Workshop (proposed, [Q4](#16-open-questions-for-the-owner)) | "When were this service's tolerances, recovery objectives and dependency map last reviewed and approved?" Within 12 months / 1–2 years ago / More than 2 years ago / Never / Unknown | Service | Scored | SYSC 15A.2.2R, 2.6R, 4.3R [V]; SS1/21 2.10, 5.9 [V]; MAS 6.7 [V]; CPS 230 45 [V] |

**Coverage against the reference frameworks** (scorecard area 3):

| Framework area | Questions |
|---|---|
| ISO 22301 clause 8 (BIA, strategy, plans, exercising) [P] | EX-01–05, EX-13–16, AF-BIA, AF-TS |
| NIST SP 800-34 Rev. 1 (BIA, preventive controls, recovery strategies, testing) [P] | Same, plus the DR family |
| NIST CSF 2.0 Recover (RC.RP, RC.CO) [S] | EX-07, EX-14, AF-CY-02, AF-CY-04 |
| NIST SP 800-209 (storage and backup protection) [P] | EX-08, EX-09, AF-CY-01, DC-01 |
| Provider DR guidance (AWS, Azure, Google) [V] | EX-03, EX-04, AF-DR, AF-CL |

RQ2 records a `framework_mappings` entry on every question, settling validation row 3.

---

## 13. Reference scenarios (D13)

The full inputs and expected outcomes are in `reference-scenarios.json`, written on 27 Oct 2026 before any engine run. Each takes its shape from public material. The answers are scenario assumptions and never describe the named firm. RQ5 runs them and explains or fixes every disagreement.

| ID | Scenario (mode) | Public basis | Rung (RTO rung / RPO rung) | Exposure → cap | Top findings | Obligations (examples) | Money |
|---|---|---|---|---|---|---|---|
| RS1 | UK retail bank under SS1/21 and SYSC 15A after a failed platform migration by a critical IT supplier (workshop) | FCA and PRA penalty against TSB, 20 Dec 2022 [V] | **DR-03** warm standby (DR-02 / DR-03) | High → Managed | Correlated recovery (Critical); strategy not proven at the target (High); exit untested; scenario testing technical only | WITHIN_TOLERANCE partly; MAPPING partly; SCENARIO_TESTING partly; REPORTING applies later (18 Mar 2027) | GBP 0–27.6m per event, from the scenario's GBP 0.4–1.2m per hour and a 0–23 hour gap |
| RS2 | EU insurer under DORA after a security vendor's update disabled endpoints, with ransomware exposure (executive) | Microsoft on the CrowdStrike update, 20 Jul 2024 [V]; ENISA ETL 2025 [P] | **DR-02** pilot light (DR-01 / DR-02); cyber exposure adds controls, not a rung | Severe → Fragile | Cyber recovery, non-immutable backups, no identity recovery (all Critical) | Art. 12(3) not evidenced; Art. 11(6) partly; Art. 28(8) not assessed (workshop question) | None (no input) |
| RS3 | Australian super fund under CPS 230 after its cloud provider deleted its private cloud (workshop) | Google Cloud incident report, 25 May 2024 [V] | **DR-01** backup and restore (DR-01 / DR-01) | High → Managed | Recovery beyond tolerance (Critical); correlated recovery (Critical); exit untested | Para 38 met; BCP capability partly; para 56 partly; para 42 assessed in Sovereign IQ | None (no input) |
| RS4 | NY state-chartered bank under NYDFS 500.16 and FFIEC BCM, ransomware exposure (executive) | NYDFS ransomware guidance, 30 Jun 2021 [V]; FDIC FIL-71-2019 [V] | **DR-03** warm standby (DR-03 / DR-03) | High → Managed | Cyber recovery (Critical); unproven restore; no scenario exercises | 500.16(d)(1) and (d)(2) not evidenced; (e) partly; FFIEC items as examination expectations | None |
| RS5 | Singapore payments firm under MAS BCM, on-premises with one hyperscaler and a sovereign provider, after a primary data-centre failure (workshop) | MAS statement on DBS and Citibank, 19 Oct 2023 [V]; FSM-N09 [V] | **DR-02** pilot light (DR-02 / DR-02); four-hour floor recorded, no change | High → Managed | Recovery beyond the SRTO (Critical); critical single points of failure (Critical); BCM audit older than 3 years (High, uplifted) | MAS 8.2 not evidenced; 7.2–7.3 partly; TRM four-hour partly (consultant view only) | SGD 0–9.2m per event |

Each scenario also lists the following, written in advance:
- **sensitivity probes:** single changes and their expected effect on the rung. These are monotonicity checks; for example, in RS2 relaxing the RTO to more than 24 hours leaves DR-02;
- **must-not outcomes:** for example, no DR-05; no money without input; no "compliant".

---

## 14. Overlaps (D12)

| Accelerator | Overlap | Action | Owner |
|---|---|---|---|
| Sovereign IQ | Exit, concentration, operational-resilience regimes | Boundary confirmed from this side ([7.5](#75-boundary-with-sovereign-iq)): applicability, fact IDs and condition language reused; `AF-CL-03` becomes a referral; X1/X2 and `REG-01` prefill with confirmation. Two additions for the Sovereign owner to agree (Q5, Q14) | Both owners (gate RQ1 and Sovereign gate S1) |
| Cloud IQ | Q "Disaster Recovery (DR) and business continuity posture?" ranks active-active above active-passive as maturity (`cloud-iq/knowledge-base.json:1126-1143`) | Cloud IQ keeps a DR signal but stops ranking patterns as maturity, and routes DR findings to Resilience IQ with a referral, the same way Sovereign IQ referrals work | Cloud IQ owner (`cloud-modernization-lead`) |
| Strategy IQ | Headline "Resilience (%)" built from sourcing and talent questions (S5.1–S5.4) | Rename it, for example "Sourcing resilience", so a client never sees two different "resilience" scores | Strategy IQ owner (`strategy-lead`) |

---

## 15. What changes from today

| Today (engine 1.0.0) | v2 | Reason |
|---|---|---|
| Pattern bonuses and eliminations pick the strategy (`runtime.ts:586-591`, `:739-741`); non-monotonic | Written ladder from `decision-matrix.json`; max of the RTO and RPO rungs | C2, D3 |
| "Fit /100" pattern scores on screen | Ladder statement in words; scores retired from every view | Validation row 34 |
| Two scores: posture shown, risk-adjusted `score` hidden; flat penalties double count | One posture with cap reason; flat penalties gone; severity carried by gaps and the exposure cap | D4, R9 decision 2 |
| The enterprise as the unit; one RTO and RPO | Up to five critical services, each with tolerances (time, data loss, minimum service), RTO, RPO and its own rung | CPS 230 38; MAS 3.1; SS1/21 |
| No regulatory content | Obligation table for six regimes, article-level, dated, never a verdict | D6, H2 |
| Gaps G-01–G-10 with action strings | `RES.*` findings with owner role, time frame, obligations, playbook and offering | Area 6, 11, 12 |
| "Immutable but restore not proven" = critical G-03 | High "Unproven recovery" | R9 decision 3 |
| Moderate concentration = critical G-04 | G-08 High only | R9 decision 6 |
| Blank advisory answers ignored | Blank asked = Unknown; the gate requires only gate-relevant questions | R9 decision 1 |
| No money | Optional client cost per hour → impact range; published figures as context only | D5 |
| One mode; the page embeds a fallback bank | Executive, workshop and server-side client view; bank only | D7, M2 |
| AF-BIA-01, AF-CY-03 and AF-CY-05 duplicate other questions; AF-CL-03 is a dead question | Retired; AF-CL-03 becomes a referral | Section 12 |
| `resilience-iq/design/decision-matrix.json` S1–S5 not read | Superseded by this folder's `decision-matrix.json`, which moves to `knowledge/` in RQ3 | D3 |

---

## 16. Open questions for the owner

**Decided 28 Oct 2026: the owner accepted every recommended default below (Q1–Q15).** Q5 and Q14 also touch Sovereign IQ (a new B1 fact and where the MAS BCM and FFIEC records live); they are built in RQ2 and RQ3 with Sovereign IQ's tests run alongside.

Each had a recommended default the owner could accept or change.

| # | Question | Options | Recommended default |
|---|---|---|---|
| Q1 | When the RTO is longer than the impact tolerance (or the RPO looser than the data-loss tolerance), what does the ladder use? | The stated objective / the stricter of the two, with a conflict finding | **The stricter, with `RES.REQ.CONSISTENT` (High).** Recovery beyond tolerance is by definition unacceptable (SS1/21 3.14; MAS 3.2) |
| Q2 | Show the posture when `S1`'s RTO or RPO is Unknown? | Withhold everything (today) / show posture "provisional", withhold rung and impact | **Show posture marked provisional; withhold rung and impact.** Unknown objectives already score as risk, so this cannot flatter; the CIO still gets a headline |
| Q3 | In workshop mode, what does the single headline cover? | `S1` only / worst service / average | **Posture for `S1` plus enterprise answers; exposure, findings and obligations across all services.** Keeps executive and workshop comparable, and lets any service's critical gap cap the rating |
| Q4 | Add `REV-01` (annual review of tolerances, objectives and maps), beyond the new questions in the brief? | Add / leave out | **Add, workshop only.** Four regimes require an annual review (SYSC 15A.2.2R; SS1/21 2.10, 5.9; MAS 6.7; CPS 230 45); without it those obligations stay "not assessed" |
| Q5 | FFIEC applicability: add `us_federal_banking_supervised` to Sovereign IQ's B1 list? | Add (needs the Sovereign owner) / reuse `us_glba_fi` / drop FFIEC from v1 | **Add the flag; show FFIEC items as "examination expectation", with no severity uplift.** `us_glba_fi` is broader than the FFIEC agencies' remit |
| Q6 | MAS four-hour RTO floor | Apply when MAS-licensed / apply only when the consultant confirms a critical system and the notice is sourced for the licence type | **Consultant-confirmed (`REG-02`); client view only once RQ2 sources the licence type's TRM Notice** (FSM-N09 verified; others UNSOURCED) |
| Q7 | Executive length: 22 questions | Accept and time in RQ6 / cut to 20 | **Accept; if RQ6 timing exceeds 20 minutes, put `TOL-02` on the `EX-04` screen** |
| Q8 | Where the obligation table sits | A card in Gaps and risks, plus a count in the header / a seventh tab | **A card in Gaps and risks and a header count.** Keeps PR #75's six tabs |
| Q9 | Add an RTO answer "seconds (no noticeable interruption)" that makes DR-05 a rung | Keep D3 / add the option | **Keep D3 for v1;** revisit in RQ5 with the scenarios |
| Q10 | Impact when the proven time is "> 24 hours" | Cap the high end at an assumed duration / show the lower bound plus cost per further day | **Lower bound plus cost per further day;** no invented upper bound |
| Q11 | R9 decision 2 ("keep the flat penalty, stop domain scoring") with D4 (no flat penalties) | Domain effect only / flat effect only | **Domain effect only;** the gap and the exposure cap carry severity as labels. This is the only reading consistent with D4 |
| Q12 | Regimes outside v1 (NIS2 Art. 21(2)(c), DORA RTS 2024/1774, HKMA OR-2, RBI, SEBI, NZ BS11) | Add now / list for v2 | **List for v2;** the D6 scope stands |
| Q13 | DORA microenterprise and NYDFS limited exemption | Ask in `REG-02` with the consultant's confirmation / ignore | **Ask in `REG-02`, consultant-confirmed** |
| Q14 | Where the `SG_MAS_BCM` and `US_FFIEC_BCM` records live | Sovereign registry / Resilience `knowledge/obligations.json` in the same language | **Resilience file, read with Sovereign's `conditions.ts`.** These are operational obligations; the Sovereign registry keeps applicability only. Needs the Sovereign owner's agreement |
| Q15 | The lowest rating band is called "Critical Exposure", the same words as the exposure measure | Keep / rename "Exposed" | **Rename "Exposed"** (label only; golden outputs change) |

---

## 17. Handover to RQ2: items not verified in this pack

| Item | Status | What settles it |
|---|---|---|
| DORA Art. 11, 12, 24, 25, 26 and 28(8) wording, including "sufficiently tested" in Art. 28(8) and the microenterprise carve-outs | S | EUR-Lex OJ text (the fetch returned an empty page again) |
| DORA RTS on the ICT risk-management framework, Delegated Regulation (EU) 2024/1774, business continuity articles | P | EUR-Lex |
| PRA PS7/26 content and dates (FCA PS26/2 verified) | P | Bank of England PS7/26 page |
| NYDFS 500.16, 500.19(a), 500.22(d)(2) text and dates | S | DFS official text of Part 500 |
| FFIEC BCM booklet section titles and passages (BIA, exercises and tests, board reporting, third parties, cyber resilience) | UNSOURCED (site returned 403) | ithandbook.ffiec.gov booklet PDF |
| MAS TRM Notices other than FSM-N09 (banks, payment institutions, other licence types): four-hour RTO and the critical-system definition | UNSOURCED | mas.gov.sg notices for each licence type |
| NIST CSF 2.0 RC.RP-03 wording | S | NIST CSWP 29 |
| NIST SP 800-34 Rev. 1 alternate-site definitions (cold, warm, hot, mirrored) | P | csrc.nist.gov |
| NIST SP 800-209 backup and storage-protection passages | P | nvlpubs.nist.gov |
| ISO 22301:2019 + Amd 1:2024 clause numbers (8.2.2, 8.4) | P | iso.org (paid text; cite clause titles only) |
| Microsoft Entra emergency-access accounts; AWS and Google break-glass guidance | P | Provider docs (RQ8) |
| AWS REL09, REL10 and REL11-BP04 cited as bases | P | AWS Well-Architected Reliability pillar |
| IBM Cost of a Data Breach 2025 and 2026; Uptime Annual Outage Analysis 2025 and 2026 | S | The publishers' own pages, with sample and method |
| ENISA Threat Landscape 2025 counts | P | enisa.europa.eu report |
| LTM band-edge judgements (section 4.2), severity rules (9.4), 3-year audit line for DORA and CPS 230, five-service limit | LTM heuristic | Register as assumptions with reasoning (RQ2); calibrate on scenarios (RQ5) |

**Review cycles (D14):**
- **90 days:** provider features and names (logically air-gapped vault Regions, Azure multi-user authorisation, the Google Cloud backup vault lien from 1 Nov 2026, Google Fault Injection Testing status) and the UK reporting dates.
- **12 months:** standards and the provider DR frameworks (AWS REL13, Azure RE:09 and the design guide, Google DR planning guide).

---

## 18. Sources

All checked **27 Oct 2026**. Status as in [0.1](#01-source-references-and-verification-status).

| Ref | Source | URL | Status |
|---|---|---|---|
| SRC-AWS-REL13 | AWS Well-Architected, REL13-BP02 Use defined recovery strategies to meet the recovery objectives | https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html | V |
| SRC-AWS-DRWP | AWS whitepaper, Disaster Recovery of Workloads on AWS: DR options in the cloud | https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html | V (validation rows 11–12, same day) |
| SRC-AWS-LAG | AWS Backup, logically air-gapped vault | https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html | V |
| SRC-AZ-RE09 | Azure Well-Architected, RE:09 Architecture strategies for disaster recovery (updated 20 Aug 2026) | https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery | V |
| SRC-AZ-DRGUIDE | Azure Well-Architected, Develop a disaster recovery plan for multi-region deployments (tiers 0–3; updated 30 Jul 2026) | https://learn.microsoft.com/en-us/azure/well-architected/design-guides/disaster-recovery | V |
| SRC-AZ-MUA | Azure Backup, multi-user authorisation using Resource Guard (updated 27 Oct 2026) | https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization-concept | V |
| SRC-AZ-IMMUT | Azure Backup, immutable vault | https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept | V (validation row 24) |
| SRC-AZ-ASR | Azure Site Recovery overview | https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview | V (validation row 23) |
| SRC-GCP-DRPLAN | Google Cloud, Disaster recovery planning guide (last updated 5 Jul 2024) | https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide | V |
| SRC-GCP-DRAPPS | Google Cloud, Disaster recovery scenarios for applications (last updated 5 Aug 2024) | https://docs.cloud.google.com/architecture/dr-scenarios-for-applications | V |
| SRC-GCP-VAULT | Google Cloud Backup and DR, backup vault (last updated 26 Oct 2026) | https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backup-vault | V |
| SRC-MS-SHARED | Microsoft Learn, Shared responsibility in the cloud (updated 24 Aug 2026) | https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility | V |
| SRC-NIST-80034 | NIST SP 800-34 Rev. 1 | https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final | P |
| SRC-NIST-CSF2 | NIST CSF 2.0 (RC.RP-03), via NIST SP 1339 and secondary summaries | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf ; https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1339.pdf | S |
| SRC-NIST-800209 | NIST SP 800-209 Security Guidelines for Storage Infrastructure | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-209.pdf | P |
| SRC-ISO-22301 | ISO 22301:2019 with Amd 1:2024 | https://www.iso.org/standard/88412.html | P |
| SRC-ISO-27031 | ISO/IEC 27031:2025 | https://www.iso.org/standard/27031 | P |
| SRC-DORA | DORA, Regulation (EU) 2022/2554, Art. 11, 12, 24, 25, 28 (Springlex OJ reproduction); official record | https://www.springlex.eu/en/packages/dora/dora-regulation/article-11/ ; …/article-12/ ; …/article-24/ ; …/article-25/ ; …/article-28/ ; https://eur-lex.europa.eu/eli/reg/2022/2554/oj | S |
| SRC-PRA-SS121 | PRA SS1/21 (March 2022 version) | https://www.bankofengland.co.uk/-/media/boe/files/prudential-regulation/supervisory-statement/2021/ss121-march-22.pdf ; page: https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss | V |
| SRC-FCA-SYSC15A | FCA Handbook SYSC 15A | https://www.handbook.fca.org.uk/handbook/SYSC/15A/ | V |
| SRC-FCA-PS262 | FCA PS26/2 Operational incident and third party reporting (18 Mar 2026; from 18 Mar 2027) | https://www.fca.org.uk/publications/policy-statements/ps26-2-operational-incident-third-party-reporting | V |
| SRC-PRA-PS726 | PRA PS7/26 | https://www.bankofengland.co.uk/prudential-regulation/publication/2026/march/operational-incident-and-third-party-reporting-policy-statement | P |
| SRC-APRA-CPS230 | APRA CPS 230 | https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf | V |
| SRC-MAS-BCM | MAS Guidelines on Business Continuity Management (June 2022) | https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulatory-and-supervisory-framework/risk-management/bcm-guidelines/guidelines-on-bcm-june-2022.pdf | V |
| SRC-MAS-N09 | MAS Notice FSM-N09 Technology Risk Management (effective 10 May 2024) | https://www.mas.gov.sg/-/media/mas-media-library/regulation/notices/trpd/notice-fsm-n09/mas-notice-fsm-n09.pdf | V |
| SRC-MAS-MR-2023 | MAS response to media queries on DBS Bank and Citibank (19 Oct 2023) | https://www.mas.gov.sg/news/media-releases/2023/mas-response-to-media-queries-on-dbs-bank-and-citibank | V |
| SRC-NYDFS-50016 | 23 NYCRR 500.16; 500.19; 500.22 (Cornell LII) | https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.16 ; https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.19 ; https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.22 | S |
| SRC-NYDFS-RANSOM | NYDFS Industry Letter, Ransomware Guidance (30 Jun 2021) | https://www.dfs.ny.gov/industry_guidance/industry_letters/il20210630_ransomware_guidance | V |
| SRC-FDIC-FIL71 | FDIC FIL-71-2019, FFIEC BCM booklet (14 Nov 2019) | https://www.fdic.gov/news/inactive-financial-institution-letters/2019/fil19071.pdf | V |
| SRC-OCC-2019-57 | OCC Bulletin 2019-57 | https://occ.gov/news-issuances/bulletins/2019/bulletin-2019-57.html | V |
| SRC-FFIEC-BCM | FFIEC IT Examination Handbook, Business Continuity Management booklet | https://ithandbook.ffiec.gov/it-booklets/business-continuity-management/ | UNSOURCED (HTTP 403) |
| SRC-FCA-TSB | FCA press release, TSB fined £48.65m (20 Dec 2022) | https://www.fca.org.uk/news/press-releases/tsb-fined-ps4865m-operational-resilience-failings | V |
| SRC-GCP-UNISUPER | Google Cloud, details of the GCVE incident (25 May 2024) | https://cloud.google.com/blog/products/infrastructure/details-of-google-cloud-gcve-incident | V |
| SRC-MS-CROWDSTRIKE | Microsoft, Helping our customers through the CrowdStrike outage (20 Jul 2024) | https://blogs.microsoft.com/blog/2024/07/20/helping-our-customers-through-the-crowdstrike-outage/ | V |
| SRC-ENISA-ETL25 | ENISA Threat Landscape 2025 | https://www.enisa.europa.eu/news/eu-consistently-targeted-by-diverse-yet-convergent-threat-groups | P |
| SRC-IBM-CODB | IBM Cost of a Data Breach 2025 and 2026 (secondary summaries) | https://www.bakerdonelson.com/ten-key-insights-from-ibms-cost-of-a-data-breach-report-2025 ; https://www.bakerdonelson.com/ten-takeaways-from-ibms-2026-cost-of-a-data-breach-report | S |
| SRC-UPTIME | Uptime Institute Annual Outage Analysis 2025 (secondary) and 2026 release | https://www.datacenterknowledge.com/outages/data-center-outages-decline-for-fourth-straight-year-but-issues-persist ; https://www.businesswire.com/news/home/20260513289344/en | S |
| SRC-SOV-REGISTRY | Sovereign IQ regime registry 1.1.0, conditions and facts (repository) | `packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json`, `v4/conditions.ts`, `v4/facts.ts` | Code review |
| SRC-VALIDATION | Resilience IQ validation report, 27 Oct 2026 (34 statements, sections 4–5) | [../VALIDATION.md](../VALIDATION.md) | — |
