# Sovereign IQ (merged): S1 design pack

**Date:** 13 Oct 2026  **Author:** `sovereignty-compliance-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner approves this pack (gate S1 in [PLAN.md](../PLAN.md)); qualified counsel reviews every regulatory statement before external use (S10).

**Status:** draft for owner approval. Not legal advice. Internal consultant use only.

**What this pack fixes before any code is written:** the decision, buyer and edge; one fact model; sovereignty requirement levels L0–L4; the control catalogue (`SOV.*`); one regime registry schema and the v1 regime list with applicability rules as data; the merged question set; the two headlines; the findings model; modes; five reference archetypes with expected outcomes; the boundary with Resilience IQ and Cloud IQ; open questions.

**Companion files (same folder):** `facts.schema.json`, `regime.schema.json`, `question.schema.json`, `finding.schema.json` (JSON Schema draft 2020-12) and `archetypes.json` (the five archetypes in the schema shape).

**Owner decisions applied:** D1–D14 as recorded in PLAN.md, all defaults accepted, with D11 changed: all data the assessment needs is collected and kept, client name included, and there is no no-store session. D11 has no effect on the assessment model in this pack; it affects S5 (persistence) and S10 (privacy notice, transfer basis, retention).

---

## 0. Conventions

### 0.1 Source references and verification status

Every regulatory or framework statement carries a source reference `[Sn]` (listed in [section 15](#15-sources)) and a verification status. All sources were checked on **13 Oct 2026**. As in the validation review, direct fetches of EUR-Lex, legislation.gov.uk, eCFR and most regulator sites fail from this environment (DNS resolution blocked), so verification is through web-search results that quote or link the official text.

| Status | Meaning |
|---|---|
| **V** | Verified on 13 Oct 2026 (this session or VALIDATION.md section 7) from search results that quote or link the official text |
| **S** | Secondary sources only (law-firm, regulator-adjacent or vendor summaries); shape is consistent across sources, S2 must confirm against the primary text |
| **P** | Primary source URL given, but the specific article or threshold was not re-read this session; S2 confirms |
| **UNSOURCED** | Not verified. What would settle it is stated. Must be sourced or removed in S2 |

Claim IDs (`CLM-SOV-nnn`) are assigned in S2 (WS-S2 claims register). This pack uses `[Sn]` references; S2 maps each to a claim ID.

### 0.2 Naming

- Questions: theme letter plus number (`A1`, `K1`). Old Sovereign IQ (`Q1.1`…) and Posture IQ (`A1`…`K3`) IDs are retired; [section 6.6](#66-old-to-new-question-map) maps them. Posture IQ's `A1` is **not** the new `A1`.
- Facts: dotted lower-case paths (`org.establishments`, `data.location`).
- Controls: `SOV.<DOMAIN>.<NAME>`.
- Regimes: `<JURISDICTION>_<NAME>` (`EU_GDPR`, `AU_APRA_CPS230`).
- Grades: `applies`, `likely_confirm`, `advisory`, `not_applicable`.
- Zones (where data may sit): `eea`, `uk`, `ch`, `us`, `ca`, `in`, `sg`, `au`, `nz`, `jp`, `hk`, `kr`, `cn`, `other`, `unknown`. The EEA is **one zone** for personal data (validation finding M3).

---

## 1. Decision, buyer, edge (final wording)

| | Final wording |
|---|---|
| **Decision** | *Where may each class of our data and workloads run, what regulatory exposure follows, and what sovereign architecture and migration path should we fund?* |
| **Buyer** | The **CIO**. Co-owners of the outcome: CISO, DPO or General Counsel, Chief Risk Officer. In financial services, the head of operational resilience |
| **Edge** | Vendor-neutral and multi-jurisdiction (EU and UK, US, APAC) in one pass. Requirement first: it derives a required sovereignty level per data class from the regimes that apply and the board's own choice, then scores controls against that level, not against provider nationality (D3). It ends in a platform-specific technical backlog (on-premises, AWS, Azure, GCP, Oracle, sovereign providers, SaaS) and typed next engagements, every item traced to a finding and a source. Sovereignty levels use the EU Cloud Sovereignty Framework's SEAL vocabulary (D12), so outputs line up with EU public procurement |
| **USP sentence** | "From your data classes and footprint to a sourced, multi-jurisdiction exposure view and a platform-specific sovereign architecture plan, in one consultant-led session." |

**Against free alternatives** (validation report section 4, unchanged): provider sovereignty assessments map the client to one provider's offering; the EU Cloud Sovereignty Framework scores providers for a tender, not the client's own data; ICO and CNIL self-assessments cover one law in one country; consultancy maturity models give a stage, not a backlog. Sovereign IQ's edge depends on the regulatory content being correct (S2) and the playbook existing (S7).

---

## 2. Fact model

One set of facts drives everything: regime applicability, required levels, control scoring and the playbook. Facts are set only by questions (or by a consultant override, which is logged with a reason). The JSON form is `facts.schema.json`.

**Fact kinds.** *Scope facts* describe the organisation and are never scored. *Control facts* (`ctl.*`) hold the state of a control and are the only inputs to maturity. *Derived facts* are computed by the engine from other facts and are never answered directly.

### 2.1 Organisation and footprint (scope)

| Fact | Type | Allowed values | Set by |
|---|---|---|---|
| `org.hq` | enum | zone codes (`eea`, `uk`, `ch`, `us`, `ca`, `in`, `sg`, `au`, `nz`, `jp`, `hk`, `kr`, `cn`, `other`) | A1 |
| `org.establishments` | set | zone codes, plus `none_outside_hq` | A2 |
| `org.eea_member_states` | set | ISO 3166 alpha-2 codes of EEA states (e.g. `FR`, `DE`, `IE`), `unknown` | A6 (follow-up) |
| `org.us_states` | set | `CA`, `NY`, `other_comprehensive`, `none`, `unknown` | A7 (follow-up) |
| `org.staff_band` | enum | `lt50`, `50_249`, `250plus`, `unknown` | A4 |
| `org.turnover_band_eur` | enum | `lt10m`, `10m_50m`, `50m_250m`, `250m_1bn`, `1bn_10bn`, `gt10bn`, `not_given` | A4 |
| `org.turnover_amount` | number + currency (optional) | positive number; currency ISO 4217 | A5 (follow-up) |
| `org.balance_sheet_band_eur` | enum | `le10m`, `10m_43m`, `gt43m`, `unknown` | A5 (follow-up) |
| `org.sector` | enum | see A3 options (NIS2 Annex I and II aligned, plus `financial_services`, `professional_it_services`, `retail_consumer`, `other`, `unknown`) | A3 |

### 2.2 Entity classes (scope)

| Fact | Type | Allowed values | Set by |
|---|---|---|---|
| `ent.flags` | set | `eu_credit_institution`, `eu_investment_firm`, `eu_insurer`, `eu_payment_emi`, `eu_casp`, `eu_other_financial`, `ict_provider_to_eu_fs`, `dora_ctpp_designated`, `uk_pra_regulated`, `uk_fca_solo_regulated`, `uk_ctp_designated`, `sg_mas_licensed`, `au_apra_regulated`, `hk_hkma_authorised`, `in_rbi_payment_operator`, `in_sebi_irdai_regulated`, `us_nydfs_licensed`, `us_sec_registrant`, `us_hipaa_covered_or_ba`, `us_glba_fi`, `us_federal_cloud_supplier`, `critical_infrastructure_operator`, `cloud_or_data_processing_provider`, `digital_product_vendor_eu`, `public_sector_body`, `none`, `unknown` | B1 |
| `ent.nis2_self_class` | enum | `essential`, `important`, `not_in_scope`, `not_assessed` | B2 (follow-up) |
| `ent.nis2_special_type` | enum | `qtsp`, `non_qualified_tsp`, `tld_registry`, `dns_provider`, `public_ecomms`, `none`, `unknown` | B2 (follow-up) |
| `ent.ci_regimes` | set | `au_soci_responsible_entity`, `uk_nis_oes`, `uk_nis_rdsp`, `sg_cii_owner`, `cn_ciio`, `none`, `unknown` | B3 (follow-up) |
| `ent.ai_roles` | set | `none`, `deployer_internal`, `deployer_high_impact`, `provider_ai_system`, `gpai_provider`, `integrator_own_name`, `unknown` | B4 |

### 2.3 Data (scope)

| Fact | Type | Allowed values | Set by |
|---|---|---|---|
| `data.classes` | set | `personal`, `special`, `financial`, `ai_training`, `proprietary`, `government`, `ot_ci` (definitions in D1) | D1 |
| `data.subject_regions` | set | zone codes, `unknown` | A2 (column "people whose personal data you hold") |
| `data.personal_volume` | enum | `lt10k`, `10k_100k`, `100k_1m`, `gt1m`, `unknown` | D2 (follow-up) |
| `data.us_sensitive_categories` | set | `genomic`, `biometric`, `precise_geolocation`, `health`, `financial`, `identifiers`, `government_related`, `none`, `unknown` | T3 (follow-up) |
| `data.location` | map: class → {`primary`: set of zones, `backup`: set of zones} | zone codes; `unknown` allowed per cell | D3 |
| `data.choice_level` | map: class → level | `L0`…`L4`, `unknown` | L1 (all selected classes) and L2 (per class, workshop) |
| `data.allowed_zone` | map: class → set of zones | zone codes | L2 (workshop); default derived (2.6) |
| `data.class_platforms` | map: class → set of platforms | P1 values | L2 (workshop); if absent, all P1 platforms are assumed for every class (never flatters) |

### 2.4 Platforms and providers (scope)

| Fact | Type | Allowed values | Set by |
|---|---|---|---|
| `plat.in_scope` | set | `onprem`, `colo`, `aws`, `azure`, `gcp`, `oci`, `ibm`, `hyperscaler_sovereign_offering`, `partner_operated_cloud`, `eu_sovereign_provider`, `apac_national_cloud`, `cn_cloud`, `saas_major`, `ai_api_provider`, `other`, `unknown` | P1 |
| `prov.parent_jurisdictions` | set (derived, overridable) | zone codes | derived from P1; refined by P2 (follow-up) |
| `prov.contract_entity` | enum | `local_entity_local_law`, `foreign_entity_or_law`, `not_reviewed`, `unknown` | P3 (follow-up) |

`prov.parent_jurisdictions` default derivation (overridable by P2): `aws`, `azure`, `gcp`, `oci`, `ibm`, `hyperscaler_sovereign_offering`, `ai_api_provider` → `us`; `partner_operated_cloud` → the operating company's zone, asked in P2 (e.g. S3NS, Bleu and Delos are operated by companies established in France and Germany; to be sourced in S7); `eu_sovereign_provider` → `eea`; `cn_cloud` → `cn`; `onprem`, `colo` → `org.hq`; `saas_major`, `apac_national_cloud`, `other` → asked in P2, `unknown` until answered. This derivation is a **fact** (D3): it decides which controls are needed, never a maturity score by itself.

### 2.5 Transfers and controls

| Fact | Type | Allowed values | Set by |
|---|---|---|---|
| `xfer.mechanisms` | set | `no_transfer`, `adequacy`, `eu_us_dpf`, `uk_data_bridge`, `sccs`, `idta_or_addendum`, `bcr`, `apac_contract_or_consent`, `derogation`, `undocumented`, `unknown` | T1 |
| `ctl.<CONTROL_ID>` | enum state | `0` absent, `1` partial, `2` largely, `3` full, `unknown`, `not_answered`, `na` | maturity questions (section 4) |
| `pref.*` | enums | outcome preferences, never scored | W1–W3 |

### 2.6 Derived facts

| Fact | Rule |
|---|---|
| `derived.size_class_eu` | First match: (1) `large` if `staff_band = 250plus`, or `turnover_band_eur ≥ 50m_250m` and `balance_sheet_band_eur = gt43m`. (2) `medium_or_large` if `turnover_band_eur ≥ 50m_250m`, `balance_sheet_band_eur` is `unknown` and `staff_band = 50_249` (at least medium is established; large depends on the balance sheet). (3) `medium` if `staff_band = 50_249`, or `turnover_band_eur ≥ 10m_50m` and `balance_sheet_band_eur in [10m_43m, gt43m]`. (4) `small_or_micro` if `staff_band = lt50` and (`turnover_band_eur = lt10m` or `balance_sheet_band_eur = le10m`). (5) otherwise `uncertain`. Basis: Recommendation 2003/361/EC Annex Art. 2 (staff ceiling plus turnover **or** balance-sheet ceiling) as applied by NIS2 Art. 2(1), with group aggregation [S5, S6] (status S; the "and/or" reading of the financial ceilings is to be confirmed by counsel). The engine never guesses: `uncertain` produces `likely_confirm`, not `applies` |
| `derived.foreign_parent[class]` | true if any provider holding the class (from P1 platforms used for that class, or all platforms if not split) has a parent jurisdiction outside the class's allowed zone |
| `derived.out_of_zone[class]` | true if `data.location[class].primary` or `.backup` contains a zone outside `data.allowed_zone[class]` |
| `derived.personal_transfer` | true if `personal`, `special` or `financial` is in `data.classes` and either (a) D3 shows a location for those classes outside the zone of the data subjects' regime (EEA data outside the EEA and adequate countries; UK data outside the UK and UK-adequate countries; and so on), or (b) T1 names any mechanism other than `no_transfer` or `unknown` (remote access from abroad is a transfer even when storage stays in zone). Intra-EEA replication is never a transfer |
| `data.allowed_zone[class]` (default) | The zone fixed by any localisation floor (3.3). Otherwise, if the class's required level is L1 or higher: `org.hq` plus the zones where the class's people are (`data.subject_regions`) for `personal`, `special` and `financial`, or plus the zones where the group has entities (`org.establishments`) for `ai_training`, `proprietary`, `government` and `ot_ci`. Level L0: no restriction. Workshop question L2 replaces the default per class. The EEA is one zone |
| `derived.required_level[class]` | section 3.2 |

---

## 3. Sovereignty requirement levels (L0–L4)

### 3.1 Definitions

Levels are **cumulative**: each level needs all the controls of the levels below it. "Zone" means the allowed zone for that data class (2.6).

| Level | LTM name | Plain meaning for a CIO | Controls the level requires (section 4) |
|---|---|---|---|
| **L0** | No location requirement | The data can run anywhere a sound security baseline and any regime-required controls are in place | None from the level; regime-required controls still apply (4.3) |
| **L1** | Residency | Data at rest, processing and backups stay in the zone, and this is enforced, not just intended | `SOV.RES.LOCATION`, `SOV.RES.REGION_LOCK`, `SOV.BACKUP.LOCATION`, `SOV.DATA.MAP`, `SOV.GOV.OWNER`, `SOV.TP.VISIBILITY`, `SOV.ENC.BASELINE`, `SOV.AI.DATA_LOCATION` (if the class is used for AI) |
| **L2** | Residency with access control and key custody | L1, plus the provider cannot read the data or reach it for support without the client's approval: the client holds the keys outside the provider's control and approves and logs provider access | L1 + `SOV.KEY.CUSTODY`, `SOV.OPS.ADMIN_ACCESS`, `SOV.SAAS.SUBPROCESSOR`, `SOV.TP.AUDIT` |
| **L3** | Operational sovereignty | L2, plus the service is run and supported by personnel in the zone through a locally established entity, keys can be revoked and the client can leave | L2 + `SOV.OPS.PERSONNEL_ZONE`, `SOV.KEY.REVOCATION`, `SOV.EXIT.PLAN`, `SOV.CONC.PROVIDER`, `SOV.CERT.ASSURANCE`, `SOV.OPS.OOB_MGMT` (only if on-premises or colocation is in scope) |
| **L4** | Jurisdictional immunity or disconnected | L3, plus no provider in the chain can be compelled by a law from outside the zone to hand over the data, or the system is disconnected | L3 + `SOV.JUR.IMMUNITY`, `SOV.CC.DATA_IN_USE` |

**What the levels do not claim.** L2 key custody limits what a provider can technically produce; it does not remove the provider's legal obligation under a foreign order (validation row 36; 18 U.S.C. § 2713 [S24], status V). L4 is the only level at which provider parent jurisdiction is itself a control (`SOV.JUR.IMMUNITY`), which keeps D3: provider nationality never lowers maturity for a class whose required level is L0–L3.

### 3.2 How the required level of each data class is derived

```
derived.required_level[class] = max( legal floor[class], client choice[class] )
```

1. **Legal floor.** The highest `levelFloor` of any regime graded `applies` or `likely_confirm` whose floor covers the class (3.3). `likely_confirm` floors are shown as "provisional – confirm".
2. **Client choice.** Question L1 (executive) sets one level for every data class the client selected in D1. Workshop follow-up L2 sets the level and allowed zone per class. A public body or supplier that must meet a minimum SEAL in an EU tender enters it here, translated with the table in 3.4.
3. **Unknown.** If the client answers "Unknown" to L1, the required level is the legal floor only, and the report shows the decision item "Board sovereignty ambition not set: maturity is measured against the legal minimum only" (unconfirmed). It does not change any control state.
4. **Regime-required controls are separate from levels.** A regime can require a control whatever the level (for example DORA Art. 28(3) register, GDPR Chapter V transfer basis). These are added to the required control set (section 4.3) and drive the exposure view (section 7.2).

### 3.3 Legal level floors in v1

Most regimes in scope do **not** impose a data-location requirement; they impose controls (transfer basis, registers, exit plans, incident reporting). Floors exist only where the law localises data.

| Regime | Data class | Floor | Zone | Condition | Source and status |
|---|---|---|---|---|---|
| `IN_RBI_PAYMENT` | `financial` (payment system data) | L1 | `in` | `ent.flags` includes `in_rbi_payment_operator` | RBI Storage of Payment System Data, circular 6 Apr 2018 and FAQ: entire payment data stored in systems only in India; applies to authorised payment system operators and their ecosystem [S38] V |
| `CN_PIPL` | `personal`, `special` | L1 | `cn` | `cn` in establishments and (`ent.ci_regimes` includes `cn_ciio` → applies; volume above the CAC threshold → applies; volume unknown → likely_confirm) | PIPL Art. 40 localisation for CII operators and processors above CAC volume thresholds (validation row 70) [S43] V for the rule; **volume thresholds UNSOURCED** (settle: CAC Provisions on Promoting and Regulating Cross-Border Data Flows, 2024) |

**Not floors in v1 (deliberately):** GDPR and UK GDPR (no localisation; transfers need a basis, Chapter V) [S8] P; Singapore PDPA (transfer limitation, no localisation; the PDPC framework "does not impose data localisation requirements", OECD.AI summary) [S31] S; Australian Privacy Act APP 8 (accountability for overseas disclosure, no localisation) [S34] S; India DPDP s.16 (transfers allowed except to countries restricted by notification; not yet in force) [S37] S; Japan APPI Art. 28 (consent or equivalent-system routes) [S40] S. **No general data-location requirement was found in the sources reviewed for DORA, NIS2, APRA CPS 230/234 or MAS TRM**; this negative statement is status **UNSOURCED** until counsel confirms in S2/S10. National public-sector schemes (France SecNumCloud, Germany C5) are modelled as advisory regimes, not floors, because their legal triggers are not yet sourced (section 5.4).

### 3.4 Mapping to EU Cloud Sovereignty Framework SEAL objectives (D12)

**Source.** European Commission, *Cloud Sovereignty Framework*, version 1.2.1, October 2025, used in the Commission's 2026 cloud tender [S2, S3, S4]. It defines eight sovereignty objectives (SOV-1 Strategic, SOV-2 Legal and jurisdictional, SOV-3 Data and AI, SOV-4 Operational, SOV-5 Supply chain, SOV-6 Technology, SOV-7 Security and compliance, SOV-8 Environmental sustainability), each assessed on a Sovereignty Effective Assurance Level from SEAL-0 to SEAL-4. Contracting authorities set a minimum SEAL per objective and rank compliant bids on a weighted Sovereignty Score [S2] (status S: framework PDF quoted in search results; weights from secondary sources only).

SEAL wording from the framework [S2] (status V for SEAL-0 to SEAL-3 via search excerpt of the Commission PDF; SEAL-4 wording from secondary sources, status S):

| SEAL | Framework wording |
|---|---|
| SEAL-0 | No sovereignty: service, technology or operations under exclusive control of non-EU third parties, governed entirely in non-EU jurisdictions |
| SEAL-1 | Jurisdictional sovereignty: EU law formally applies with limited practical enforceability; exclusive control of non-EU third parties |
| SEAL-2 | Data sovereignty: EU law applicable and enforceable, with material non-EU dependencies; indirect control of non-EU third parties |
| SEAL-3 | Digital resilience: EU law applicable and enforceable, EU actors exercising meaningful but not full influence |
| SEAL-4 | Full digital sovereignty: complete EU control, subject only to EU law |

Note: the Commission's explainer of 1 Jun 2026 [S3] describes the SEAL-3 threshold as "technological autonomy"; S2 must confirm the authoritative label.

**LTM mapping (judgement, not the Commission's).** Sovereign IQ levels are requirements on a client's data class; SEAL levels assess a provider's service per objective. The mapping states the minimum SEAL a provider service should reach, per objective, to be able to meet an LTM level. For non-EU zones, read "EU" as "the allowed zone" (LTM generalisation; the framework itself is EU-only).

| LTM level | SOV-2 Legal | SOV-3 Data and AI | SOV-4 Operational | SOV-5 Supply chain | SOV-6 Technology | Reasoning |
|---|---|---|---|---|---|---|
| L0 | — | — | — | — | — | No requirement |
| L1 | — | SEAL-1 | — | — | — | Data in zone, so zone law formally applies; control may sit outside the zone |
| L2 | SEAL-1 | SEAL-2 | SEAL-1 | — | — | Customer-held keys and approved access give enforceable control over the data, with non-zone dependencies remaining |
| L3 | SEAL-2 | SEAL-3 | SEAL-3 | SEAL-2 | — | In-zone operations by a local entity give meaningful but not full influence |
| L4 | SEAL-4 | SEAL-4 | SEAL-4 | SEAL-3 | SEAL-3 | Only zone law applies; supply chain and technology dependencies reduced |

SOV-1 (strategic), SOV-7 (security and compliance) and SOV-8 (environmental) are not mapped: they assess the provider's ownership, certification and sustainability, which Sovereign IQ treats as provider-selection criteria in the playbook (S7), not as client controls. Each control in section 4 names the SEAL objective it contributes to.

**Reverse use (tender minimums).** If a client must meet a tender's minimum SEALs, the required level for the affected classes is the lowest LTM level whose row meets or exceeds every stated minimum; if SOV-1, SOV-7 or SOV-8 minimums are set, they are recorded as provider-selection criteria for S7.

---

## 4. Control catalogue

### 4.1 Rules

- **28 controls**: 27 scored and 1 advisory (`SOV.HW.PROVENANCE`, not scored until its basis is sourced).
- **States:** `3` full, `2` largely, `1` partial, `0` absent, `unknown` (scored as 0 and shown as "unconfirmed"), `not_answered` (scored as 0 and shown as "not answered", see 7.1), `na` (only a **scope** answer can make a control not applicable, e.g. no on-premises estate).
- **One effect per answer:** each answer sets exactly one control. Where two questions feed one control (`SOV.CONC.PROVIDER` from X2 and B6), the control takes the **lower** state.
- **Weights:** C = critical (3), H = high (2), S = standard (1). Weights are LTM judgement, to be confirmed in the S4 audit.
- **Scope:** `org` controls are measured once; `class` controls are measured per data class and averaged over the classes that require them.
- **Exec:** "yes" means the control is measured in executive mode. In executive mode, maturity is computed only over controls measured in that mode and labelled with the control count (7.1).
- **Bases** are listed in the question set (section 6) and the regime table (4.3). Framework clauses (NIST SP 800-53 Rev. 5 [S46]) are secondary bases; their control titles were not re-read this session (status P).

### 4.2 Catalogue

| ID | What it means | W | Scope | Measured from (option → state) | Required by level | SEAL objective | Owner role | Exec |
|---|---|---|---|---|---|---|---|---|
| `SOV.GOV.OWNER` | One accountable executive owns data-location decisions, with a governance forum | S | org | G1: `exec_forum` 3, `shared` 1, `none` 0 | L1+ | SOV-1 (context) | CIO | no |
| `SOV.DATA.MAP` | A current map of data flows and records of processing (within 12 months) | H | org | D4: `current` 3, `partial` 1, `none` 0 | L1+ | SOV-3 | DPO | no |
| `SOV.RES.LOCATION` | Primary storage and processing of the class sit only in its allowed zone | C | class | D3 primary column vs `data.allowed_zone`: all zones inside 3; any zone outside 0; any `unknown` cell (none outside) → `unknown` | L1+; legal floors (3.3) | SOV-3 | CIO | yes |
| `SOV.RES.REGION_LOCK` | The location rule is enforced technically (guardrails that block non-compliant deployments) | H | org | R1: `enforced` 3, `partial` 1, `convention` 0 | L1+ | SOV-3 | Head of cloud platform | yes |
| `SOV.BACKUP.LOCATION` | Backups, replicas and disaster-recovery copies of the class sit in its allowed zone | H | class | D3 backup column vs `data.allowed_zone` (same rule as primary) | L1+; legal floors | SOV-3 | Head of infrastructure | yes |
| `SOV.XFER.BASIS` | Every personal-data transfer (including remote access from abroad) has a valid, documented basis for each regime that restricts transfers | C | org | T1, checked per regime that requires the control: any `undocumented` → 0; `unknown` → unknown; `no_transfer` while D3 shows personal data outside the subjects' zone → `unknown` plus a conflict finding. Otherwise each requiring regime needs one of its routes: EU (`adequacy`, `eu_us_dpf`, `sccs`, `bcr`), UK (`adequacy`, `uk_data_bridge`, `idta_or_addendum`, `bcr`), APAC regimes (`apac_contract_or_consent`, `adequacy`, `bcr`); a regime covered only by `derogation` scores 1; a regime with none of its routes scores 1 and the finding names the missing route. State = lowest across requiring regimes; all covered → 3 | Regime-required when `derived.personal_transfer` | SOV-2 | DPO | yes |
| `SOV.XFER.TIA` | A transfer impact (EU) or transfer risk (UK) assessment is recorded for each transfer under SCCs, IDTA, Addendum or BCRs | H | org | T2: `complete` 3, `partial` 1, `none` 0 | Regime-required when T1 includes `sccs`, `idta_or_addendum` or `bcr` | SOV-2 | DPO with General Counsel | yes (conditional) |
| `SOV.XFER.US_BULK` | Transactions giving countries of concern access to bulk US sensitive data are screened, blocked or licensed, with records | H | org | T3 screening: `screened` 3, `partial` 1, `none` 0 | Regime-required by `US_DOJ_DSP` | SOV-2 | General Counsel | no |
| `SOV.KEY.CUSTODY` | For sensitive data in cloud and SaaS, the client controls the keys outside the provider's control | C | org | K1: `external` 3, `dedicated_hsm` 2, `byok` 1, `mixed` 1, `provider` 0, `none` 0 | L2+ | SOV-3 | CISO | yes |
| `SOV.KEY.REVOCATION` | Key revocation that makes provider-held copies unreadable has been tested | H | org | K2: `tested` 3, `possible_untested` 1, `not_possible` 0 | L3+ | SOV-3 | CISO | no |
| `SOV.ENC.BASELINE` | Regulated data is encrypted at rest and in transit everywhere | H | org | K3: `all` 3, `most` 2, `partial` 1, `no` 0 | L1+; regime-required (security articles, 4.3) | SOV-7 (context) | CISO | no |
| `SOV.OPS.ADMIN_ACCESS` | Provider support or operations access needs the client's time-limited approval and is logged and reviewed | C | org | O1: `approve_log` 3, `mixed` 2, `log_only` 1, `standard` 0 | L2+ | SOV-4 | CISO | yes |
| `SOV.OPS.PERSONNEL_ZONE` | Services holding L3+ data are operated and supported only by staff in the zone, employed by a locally established entity under local law | H | org | O2: `zone_local_entity` 3, `zone_staff_foreign_entity` 1, `follow_the_sun` 0 | L3+ | SOV-4, SOV-2 | Head of cloud platform with Procurement | no |
| `SOV.OPS.OOB_MGMT` | On-premises out-of-band management is isolated and vendor call-home is controlled | S | org | O3: `isolated` 3, `partial` 1, `connected` 0; `na` if no `onprem`/`colo` in P1 | L3+ (only if on-premises or colocation) | SOV-4 | Head of infrastructure | no |
| `SOV.CC.DATA_IN_USE` | Confidential computing protects L4 data while in use | S | org | K4: `production` 3, `poc` 1, `none` 0 | L4 (asked from L3, advisory at L3) | SOV-6 | CISO | no |
| `SOV.TP.DPA` | Processor or service-provider agreements are in place with every processor | H | org | V1: `all` 3, `most` 2, `major_only` 1, `none` 0 | Regime-required (4.3) | SOV-2 | DPO with Procurement | no |
| `SOV.SAAS.SUBPROCESSOR` | Sub-processors of critical providers are known, with advance notice and a right to object to changes | H | org | V2: `yes` 3, `partial` 1, `no` 0 | L2+; regime-required | SOV-5 | Procurement | no |
| `SOV.TP.VISIBILITY` | The client knows where each key provider stores and processes its data | H | org | V3: `full` 3, `partial` 1, `none` 0 | L1+ | SOV-3 | CIO | no |
| `SOV.TP.REGISTER` | A complete register of ICT third-party arrangements is maintained | H | org | B5: `complete` 3, `partial` 1, `none` 0 | Regime-required (DORA, CPS 230, SS2/21) | SOV-5 | Head of third-party risk | no |
| `SOV.TP.AUDIT` | Contracts give audit, access and inspection rights over data handling | S | org | V4: `full` 3, `reports_only` 1, `none` 0 | L2+; regime-required | SOV-2 | Procurement with General Counsel | no |
| `SOV.EXIT.PLAN` | Critical services have a documented, realistic exit plan (testing is owned by Resilience IQ) | H | org | X1: `tested` 3, `documented` 2, `partial` 1, `none` 0 | L3+; regime-required | SOV-5, SOV-6 | CIO | yes |
| `SOV.CONC.PROVIDER` | Concentration on one provider (including UK designated critical third parties) is assessed and managed | S | org | lower of X2 (`diversified` 3, `managed` 2, `concentrated_aware` 1, `concentrated` 0) and B6 (`mapped` 3, `partial` 1, `not_mapped` 0, `no_ctp_dependency` → ignored) | L3+; regime-required | SOV-5 | CRO | no |
| `SOV.CERT.ASSURANCE` | Services holding L3+ data hold an assurance qualification recognised for that level | S | org | G3: `recognised_high` 3, `baseline` 1, `none` 0 | L3+ | SOV-7 | CISO | no |
| `SOV.JUR.IMMUNITY` | No provider holding the class can be compelled by a law from outside the zone, or the system is disconnected | C | class | Derived (no question): all platforms for the class have parent in zone, or on-premises/colocation only → 3; only foreign element is `partner_operated_cloud` → 2; any platform with parent outside zone → 0; parent `unknown` → unknown. Platforms per class from L2, else all P1 platforms (never flatters) | L4 only | SOV-2, SOV-5 | CIO with General Counsel | yes (derived) |
| `SOV.AI.DATA_LOCATION` | AI training, fine-tuning and inference run in the allowed zone, and providers cannot train on client data | H | org | I1: `in_zone_no_training` 3, `in_zone_unclear` 1, `out_of_zone_contract` 1, `out_of_zone` 0 | L1+ for any class used with AI | SOV-3 | Head of data and AI | yes (conditional) |
| `SOV.AI.GOVERNANCE` | Each AI system's role and risk class is assessed and its obligations and dates are mapped | H | org | I2: `complete` 3, `partial` 1, `none` 0 | Regime-required by `EU_AI_ACT` | SOV-3 | Head of data and AI with General Counsel | no |
| `SOV.IR.REPORTING` | Incidents can be detected, classified and reported within the shortest window that applies | H | org | G2: `tested` 3, `documented_untested` 1, `none` 0 | Regime-required (4.3) | SOV-7 (context) | CISO | no |
| `SOV.HW.PROVENANCE` | Hardware and appliance provenance is assessed against supply-chain restrictions | — | org | H1: recorded only | Advisory; not scored until S2 sources the basis (validation row 52 UNSOURCED) | SOV-5 | Head of infrastructure | no |

Every maturity question also offers **Unknown**, which sets the control to `unknown`.

### 4.3 Regime-required controls

A control listed here is required whenever the regime is graded `applies` or `likely_confirm` and the condition holds, whatever the data class's level. These rows drive the exposure view's RAG (7.2). Article references are to be confirmed in S2 where marked P.

| Regime | Control | Basis | Status |
|---|---|---|---|
| `EU_GDPR` | `SOV.XFER.BASIS` (if `derived.personal_transfer`) | GDPR Art. 44–46, 49 [S8] | P |
| `EU_GDPR` | `SOV.XFER.TIA` (if SCCs or BCRs used) | Art. 46; CJEU C-311/18 (Schrems II); EDPB Recommendations 01/2020 v2.0, six steps [S9] | V (EDPB), P (article) |
| `EU_GDPR` | `SOV.TP.DPA`, `SOV.SAAS.SUBPROCESSOR` | Art. 28(3); Art. 28(2) and (4) [S8] | P |
| `EU_GDPR` | `SOV.DATA.MAP` | Art. 30 [S8] | P |
| `EU_GDPR` | `SOV.ENC.BASELINE` | Art. 32(1)(a) [S8] | P |
| `EU_GDPR` | `SOV.IR.REPORTING` | Art. 33 (72 hours) [S8] | P |
| `UK_GDPR` | `SOV.XFER.BASIS`, `SOV.XFER.TIA` (transfer risk assessment if IDTA, Addendum or BCRs), `SOV.TP.DPA`, `SOV.SAAS.SUBPROCESSOR`, `SOV.DATA.MAP`, `SOV.ENC.BASELINE`, `SOV.IR.REPORTING` | UK GDPR Art. 28, 30, 32, 33, 44–49 as amended by the DUAA (in force 5 Feb 2026) [S18]; ICO TRA guidance: TRA needed for Art. 46 transfers, not for adequacy or Art. 49 [S16] | V (TRA), P (articles post-DUAA) |
| `EU_NIS2` | `SOV.IR.REPORTING` | Art. 23(4): early warning 24 h, notification 72 h, final report 1 month (validation row 14) | V |
| `EU_NIS2` | `SOV.TP.VISIBILITY`, `SOV.ENC.BASELINE`, `SOV.GOV.OWNER` | Art. 21(2)(d) supply chain, 21(2)(h) cryptography and encryption; Art. 20 management bodies [S5] | P |
| `EU_DORA` | `SOV.TP.REGISTER` | Art. 28(3) register of information (validation row 85) | V |
| `EU_DORA` | `SOV.EXIT.PLAN` | Art. 28(8) exit strategies for ICT services supporting critical or important functions (validation row 23) | V |
| `EU_DORA` | `SOV.CONC.PROVIDER` | Art. 29 ICT concentration risk [S7] | P |
| `EU_DORA` | `SOV.TP.AUDIT` | Art. 30 contractual provisions (access, inspection and audit) [S7] | P |
| `EU_DORA` | `SOV.SAAS.SUBPROCESSOR` | Delegated Regulation (EU) 2025/532 on subcontracting, applicable from 22 Jul 2025 (validation row 21) | V |
| `EU_DORA` | `SOV.IR.REPORTING` | Art. 19; Delegated Regulation (EU) 2025/301: initial notification 4 h from classification and within 24 h of awareness (validation row 18) | V |
| `EU_AI_ACT` | `SOV.AI.GOVERNANCE` | Provider and deployer obligations (Art. 16, 26), transparency Art. 50, GPAI Chapter V [S12] | P |
| `UK_PRA_SS2_21` | `SOV.TP.REGISTER`, `SOV.EXIT.PLAN`, `SOV.TP.AUDIT`, `SOV.CONC.PROVIDER` | PRA SS2/21 outsourcing and third-party risk management (register, exit, access and audit, concentration) (validation row 40) | P (chapter references) |
| `UK_NIS` | `SOV.IR.REPORTING` | NIS Regulations 2018 incident reporting [S22] | S |
| `US_DOJ_DSP` | `SOV.XFER.US_BULK` | 28 CFR Part 202 prohibited and restricted transactions [S26] | S |
| `US_CCPA` | `SOV.TP.DPA`, `SOV.ENC.BASELINE` | Contracts with service providers and contractors; reasonable security (Cal. Civ. Code § 1798.100, § 1798.150) | UNSOURCED (settle: Civil Code text on leginfo.legislature.ca.gov) |
| `US_HIPAA` | `SOV.TP.DPA`, `SOV.ENC.BASELINE`, `SOV.IR.REPORTING` | Business associate agreements; Security Rule; Breach Notification Rule (45 CFR Parts 160 and 164) [S28] | P |
| `US_GLBA` | `SOV.TP.DPA`, `SOV.ENC.BASELINE`, `SOV.IR.REPORTING` | FTC Safeguards Rule, 16 CFR Part 314 (service provider oversight, encryption, notification) | UNSOURCED (settle: eCFR 16 CFR 314.4) |
| `US_NYDFS_500` | `SOV.IR.REPORTING`, `SOV.ENC.BASELINE`, `SOV.TP.DPA`, `SOV.GOV.OWNER` | 23 NYCRR 500.17 (notice), 500.15 (encryption), 500.11 (third-party service providers), 500.4 (governance) | UNSOURCED (settle: DFS Part 500 text) |
| `US_SEC_CYBER` | `SOV.IR.REPORTING` | Form 8-K Item 1.05: within four business days after the materiality determination [S30] | V |
| `SG_PDPA` | `SOV.XFER.BASIS` | s.26 transfer limitation and the Personal Data Protection Regulations 2021 [S31] | S |
| `SG_PDPA` | `SOV.IR.REPORTING` | s.26D: notify PDPC within 3 calendar days of assessing a breach as notifiable (validation row 56) | V |
| `SG_MAS_TRM` | `SOV.IR.REPORTING` | MAS TRM Notices (e.g. FSM-N09, 9 May 2024): incident notification within 1 hour; critical-system RTO 4 hours (validation row 53) [S32] | V |
| `SG_MAS_TRM` | `SOV.TP.REGISTER`, `SOV.EXIT.PLAN`, `SOV.TP.AUDIT` | MAS Guidelines on Outsourcing (and the outsourcing notice for banks) | UNSOURCED (settle: current MAS outsourcing guidelines and notice texts) |
| `AU_PRIVACY` | `SOV.XFER.BASIS` | APP 8 and s.16C accountability for overseas recipients [S34] | S |
| `AU_PRIVACY` | `SOV.IR.REPORTING`, `SOV.ENC.BASELINE` | Notifiable Data Breaches scheme (Part IIIC); APP 11 security | P |
| `AU_APRA_CPS230` | `SOV.IR.REPORTING` | 72 h for material operational risk incidents; 24 h for disruption of a critical operation outside tolerance (validation row 57) | V |
| `AU_APRA_CPS230` | `SOV.TP.REGISTER`, `SOV.EXIT.PLAN`, `SOV.CONC.PROVIDER`, `SOV.TP.AUDIT` | Material service provider management [S33] | P (paragraphs) |
| `AU_APRA_CPS234` | `SOV.IR.REPORTING`, `SOV.ENC.BASELINE`, `SOV.TP.VISIBILITY` | Information security capability, incident notification, third-party assessment [S33] | S |
| `AU_SOCI` | `SOV.IR.REPORTING` | 12 h (significant impact), 72 h (other relevant impact) (validation row 60) [S35] | V |
| `NZ_PRIVACY` | `SOV.XFER.BASIS`, `SOV.IR.REPORTING` | IPP 12 cross-border disclosure; notifiable privacy breaches [S36] | S |
| `IN_DPDP` | `SOV.XFER.BASIS` (from 13 May 2027), `SOV.TP.DPA` | s.16 (transfers, restriction by notification); s.8(2) processor contract [S37] | S (s.16), P (s.8(2)) |
| `IN_RBI_PAYMENT` | `SOV.RES.LOCATION`, `SOV.BACKUP.LOCATION` (class `financial`, zone `in`) | RBI circular 6 Apr 2018 and FAQ [S38] | V |
| `IN_CERT_IN` | `SOV.IR.REPORTING` | CERT-In Directions 28 Apr 2022: report within 6 hours (validation row 66) | V |
| `JP_APPI` | `SOV.XFER.BASIS` | Art. 28 provision to a third party in a foreign country [S40] | S |
| `KR_PIPA` | `SOV.XFER.BASIS` | Art. 28-8 overseas transfer grounds (as amended, in force 15 Sep 2023) [S42] | S |
| `CN_PIPL` | `SOV.XFER.BASIS`; `SOV.RES.LOCATION` (floor, 3.3) | Art. 38 transfer mechanisms; Art. 40 localisation [S43] | P (Art. 38), V (Art. 40 rule) |

Regimes not listed (exposure factors, advisory schemes and frameworks, and `UK_CTP`, which binds the designated providers rather than the client) carry no required controls and are not RAG-rated; their reason is shown instead (section 5). For `UK_CTP` the report shows the state of `SOV.CONC.PROVIDER` (B6) as context.

**Two guards on this table.**
- **Unsourced requirements do not score.** A row with status UNSOURCED is shown as "requirement pending source" and is excluded from maturity and RAG until S2 sources it (in v1: `US_CCPA`, `US_GLBA`, `US_NYDFS_500`, and the MAS outsourcing row).
- **Future obligations do not score yet.** A row with an `appliesFrom` date after the assessment date (e.g. `IN_DPDP` from 13 May 2027) is excluded from maturity and RAG; if the control is below 3 it creates an "upcoming" `control_gap` finding with the time frame "by <date>".

---

## 5. Regime registry (one regulation model)

### 5.1 Schema

One record per regime replaces Sovereign IQ's `regimes` and Posture IQ's `regulations`. The JSON form is `regime.schema.json`. Full obligations, penalties and dates are filled in S2; this pack fixes the shape and the applicability rules.

| Field | Content |
|---|---|
| `id`, `name`, `jurisdiction`, `market` | e.g. `EU_NIS2`, "NIS2 Directive", `eu`, `eu_uk` (markets: `eu_uk`, `us`, `apac`) |
| `citation` | Official citation and URL |
| `kind` | `obligation` (places duties on the client), `exposure` (foreign-access law: no duty on the client, creates disclosure risk), `scheme` (national certification or qualification scheme), `framework` (procurement framework) |
| `status` | `in_force`, `phased` (some duties later), `pending` (not yet law), `volatile` (status changing; 90-day review, D8), with `statusAsOf` date |
| `dates[]` | `{ label, date, appliesTo, source }`: in force, phased and deferred dates |
| `applicability.rules[]` | Ordered list; **first matching rule wins**. Each rule: `id`, `when` (condition, 5.2), `grade`, `reason` (plain English shown to the client), `basis` (article), `annotations` (e.g. `nis2_class: essential`), `claims[]` |
| `applicability.default` | Grade when no rule matches (always `not_applicable` in v1) |
| `levelFloors[]` | `{ dataClasses, level, zone, when }` (3.3) |
| `requiredControls[]` | `{ control, when, basis }` (4.3) |
| `obligations[]` | `{ id, article, summary, controls[], appliesFrom }` (S2) |
| `penalty` | `model` (5.3), `tiers[]` `{ label, fixedAmount, currency, turnoverPercent, turnoverBasis, article }`, `appliesTo`, `smeRule`, `quantifyWhen`, `note` |
| `volatile`, `reviewDays` | `true` and `90` for volatile items (D8); otherwise 180 |
| `verification` | `{ status: V/S/P/UNSOURCED, checked: date, by }` per field group |
| `claims[]` | Claim IDs from WS-S2 |

### 5.2 Condition language (rules as data, not code)

A condition is a JSON object. The engine evaluates it against the fact model; there is no free code in the registry.

| Form | Meaning |
|---|---|
| `{ "all": [c1, c2, …] }` | every condition true |
| `{ "any": [c1, c2, …] }` | at least one true |
| `{ "not": c }` | negation |
| `{ "fact": "org.establishments", "op": "includes", "value": "eea" }` | set contains value |
| `{ "fact": "ent.flags", "op": "includes_any", "value": [ … ] }` | set contains at least one |
| `{ "fact": "org.sector", "op": "in", "value": [ … ] }` | enum is one of |
| `{ "fact": "org.turnover_band_eur", "op": "gte", "value": "50m_250m" }` | ordered enum at or above (order defined in `facts.schema.json`) |
| `{ "fact": "derived.size_class_eu", "op": "eq", "value": "uncertain" }` | equality |
| `{ "fact": "…", "op": "is_unknown" }` | value is `unknown`, `not_assessed` or not answered |
| `{ "derived": "us_coc_link" }` | named derived predicate defined once in the registry header (below) |

**Named predicates (registry header):**
- `eu_financial_entity` = `ent.flags includes_any [eu_credit_institution, eu_investment_firm, eu_insurer, eu_payment_emi, eu_casp, eu_other_financial]`
- `nis2_annex_i` = `org.sector in [energy, transport, banking, financial_market_infra, health, water, digital_infrastructure, ict_service_management_b2b, public_administration, space]`; `nis2_annex_ii` = `org.sector in [postal, waste_management, chemicals, food, manufacturing_critical, digital_providers, research]` (NIS2 Annexes I and II [S5], status S; sub-sector detail confirmed in S2)
- `financial_sector` = `org.sector in [banking, financial_market_infra, insurance, other_financial]`
- `us_person_org` = `org.hq eq us` or `org.establishments includes us`
- `us_coc_link` = any primary or backup location in `cn` or `hk`, or `prov.parent_jurisdictions includes cn`, or `org.establishments includes_any [cn, hk]`, or `plat.in_scope includes cn_cloud` (China as defined in 28 CFR 202.208 includes Hong Kong and Macau [S26], status S). A location of `other` makes the predicate `unknown` (the country might be Cuba, Iran, North Korea, Russia or Venezuela, 28 CFR 202.601 [S26])
- `uses_us_parent_provider` = `prov.parent_jurisdictions includes us`

**Grades.** `applies`: the facts meet the law's scope test. `likely_confirm`: the facts point to scope but a test the questionnaire cannot settle (size, licence, targeting) needs confirming. `advisory`: relevant context with no settled duty for the client (exposure laws, pending bills, schemes, frameworks, or customer-side rights). `not_applicable`: outside scope; shown to consultants with the rule that fired, hidden in client mode.

### 5.3 Penalty models

| Model | Meaning | Shown as |
|---|---|---|
| `turnover_greater_of` | Fixed amount or % of worldwide turnover, whichever is higher | Computed only if turnover is given (D4); else the formula, "not quantified – turnover not given" |
| `turnover_lower_of` | SME variant (AI Act Art. 99(6)) | As above |
| `national_minimum_maximum` | The law sets the minimum level of the national maximum; national law may set higher (NIS2 Art. 34) | "At least" + formula; computed only if turnover given |
| `either_or` | Two alternative ceilings, not "whichever higher" (PIPL Art. 66) | Both ceilings shown; never ranked as a single figure unless turnover given, then labelled "theoretical upper bound" |
| `turnover_percent` | Percentage of turnover only, no fixed amount (Korea PIPA) | Computed only if turnover is given; else "not quantified" |
| `periodic` | Periodic penalty (DORA Art. 35(8): up to 1% of average daily worldwide turnover, up to six months) | Daily rate formula; never multiplied out |
| `per_violation` | Amount per violation (CCPA) | Per-violation amount only; never multiplied by a guessed count |
| `fixed` | Fixed maximum (Japan APPI corporate fine, India DPDP Schedule, NZ offences) | Amount with currency |
| `national` | Set by member-state law (DORA for financial entities, Data Act) | "Set by national law" |
| `not_quantified` | Supervisory measures without a statutory maximum found, or not yet sourced | "Not quantified" with reason |
| `not_applicable_to_client` | Exposure laws: no penalty on the client | "No penalty on you; disclosure exposure" |

Every computed figure is labelled **"cap, not expected fine"**. Figures are **never summed** across regimes or tiers. Currency conversion uses the dated reference rates in the claims register (validation row 82), shown with their date.

### 5.4 Regimes in v1

**42 regimes: 15 EU and UK, 10 US, 17 APAC.** GCC content is excluded (D1). EUCS is **not** a regime: no EUCS scheme was adopted as of 13 Oct 2026; the Commission proposed a revised Cybersecurity Act on 20 Jan 2026 and the EUCS final draft is still pending [S14] (status S). Rules are written in the notation of 5.2, shortened: `est` = `org.establishments`, `people` = `data.subject_regions`, `flags` = `ent.flags`, `sector` = `org.sector`, `classes` = `data.classes`, `plat` = `plat.in_scope`, `prov` = `prov.parent_jurisdictions`, `∋` = includes, `∩≠∅` = includes_any. **First matching rule wins; default `not_applicable`.**

#### 5.4.1 EU and UK

| Regime | Kind / status | Applicability rules (in order) → grade | Penalty model | Sources and status |
|---|---|---|---|---|
| `EU_GDPR` GDPR, Regulation (EU) 2016/679 | obligation / in force | 1. `est ∋ eea` → applies (Art. 3(1)). 2. `people ∋ eea` → likely_confirm (Art. 3(2): offering goods or services to, or monitoring, people in the EU; a non-EU processor acting only for EU controllers is bound through Art. 28 contracts and SCCs rather than Art. 3(2) — confirm) | `turnover_greater_of`: €20M / 4% (Art. 83(5), includes Chapter V transfers); €10M / 2% (Art. 83(4)) | [S8] P (Art. 3); Art. 83 V (validation rows 1–2); EDPB Guidelines 3/2018 on targeting [S8] S |
| `EU_NIS2` NIS2, Directive (EU) 2022/2555 | obligation / in force, national transposition **volatile** | 1. `not est ∋ eea` and `sector in [digital_infrastructure, ict_service_management_b2b, digital_providers]` and (`people ∋ eea` or `flags ∋ ict_provider_to_eu_fs`) → likely_confirm (Art. 26: such providers offering services in the EU without an EU establishment must designate a representative). 2. `not est ∋ eea` → not_applicable. 3. `ent.nis2_self_class in [essential, important]` → applies (annotation = the **higher** of the client's class and the class rules 4–8 would derive from sector and size; a self-classification never downgrades). 4. `ent.nis2_special_type in [qtsp, tld_registry, dns_provider]` → applies, essential regardless of size (Art. 3(1)(b)). 5. `ent.nis2_special_type in [non_qualified_tsp, public_ecomms]` → applies, regardless of size (Art. 2(2)(a)); essential if medium or larger (Art. 3(1)(c)), else important. 6. `sector eq public_administration` → likely_confirm (in scope as identified nationally, Art. 2(2)(f)). 7. `eu_financial_entity` and `sector in [banking, financial_market_infra]` → advisory ("DORA applies as the sector-specific act; confirm national position"). 8. (`nis2_annex_i` or `nis2_annex_ii`) and `derived.size_class_eu in [large, medium, medium_or_large]` → applies; annotation `essential` if Annex I and large, `important` if Annex II or medium, "essential or important – confirm balance sheet" if Annex I and `medium_or_large` (Art. 2(1), 3(1)(a), 3(2)). 9. (`nis2_annex_i` or `nis2_annex_ii`) and `derived.size_class_eu eq uncertain` → likely_confirm ("size not established; confirm headcount, turnover and balance sheet, including group aggregation"). 10. (`nis2_annex_i` or `nis2_annex_ii`) and `derived.size_class_eu eq small_or_micro` → not_applicable ("below the size cap unless a member state designates you, Art. 2(2)(b)–(e)"). 11. `sector is_unknown` → advisory ("confirm sector") | `national_minimum_maximum`: essential at least €10M / 2%; important at least €7M / 1.4% (Art. 34(4)–(5)) | Size cap and essential/important split [S5, S6] S; size-independent entities [S5] S; Art. 34 V (validation row 12); **Art. 4 (sector-specific acts) and DORA's status as such: UNSOURCED** (settle: NIS2 Art. 4 and recital 28 on EUR-Lex); Art. 26 representative rule P |
| `EU_DORA` DORA, Regulation (EU) 2022/2554 | obligation / in force since 17 Jan 2025 | 1. `flags ∋ dora_ctpp_designated` → applies (oversight framework, Art. 31–35). 2. `est ∋ eea` and `eu_financial_entity` → applies (Art. 2(1); narrow exclusions in Art. 2(3), e.g. micro and small insurance intermediaries, small IORPs — confirm). 3. `eu_financial_entity` and `not est ∋ eea` → likely_confirm (answers conflict: EU licence but no EU establishment). 4. `est ∋ eea` and `financial_sector` → likely_confirm ("EU financial services without a stated licence"). 5. `flags ∋ ict_provider_to_eu_fs` → advisory ("Art. 30 contract terms flow down from your financial-entity clients; CTPP designation possible") | Financial entities: `national` (Art. 50–51). Designated CTPP: `periodic` up to 1% of average daily worldwide turnover, up to six months (Art. 35(7)–(8)) | Art. 2 [S7] S; application date V (validation row 20); penalties V (validation rows 16–17) |
| `EU_AI_ACT` AI Act, Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744 | obligation / phased, **volatile** | 1. `ent.ai_roles` = only `none` → not_applicable. 2. `ent.ai_roles ∩ [provider_ai_system, gpai_provider, integrator_own_name] ≠ ∅` and `est ∋ eea` → applies (Art. 2(1)(a); Art. 25(1) own name or trademark makes an integrator a provider). 3. same roles and `people ∋ eea` → likely_confirm (placing on the EU market from outside, Art. 2(1)(a), or output used in the EU, Art. 2(1)(c)). 4. `ent.ai_roles ∩ [deployer_internal, deployer_high_impact] ≠ ∅` and `est ∋ eea` → applies (deployer established in the EU, Art. 2(1)(b)). 5. deployer roles and `people ∋ eea` → likely_confirm (Art. 2(1)(c)). 6. `ent.ai_roles ∋ unknown` and (`est ∋ eea` or `people ∋ eea`) → advisory | `turnover_greater_of`: €35M / 7% (Art. 5 practices, Art. 99(3)); €15M / 3% (operator obligations, Art. 99(4)); €7.5M / 1% (incorrect information, Art. 99(5)); SMEs `turnover_lower_of` (Art. 99(6)). **Quantified only** where high-risk or Art. 50 duties apply (`deployer_high_impact`, `provider_ai_system`, `gpai_provider`, `integrator_own_name`) (validation finding H4) | Art. 2 [S12] V; Art. 99 V (validation row 3); dates: GPAI from 2 Aug 2025; Art. 50 from 2 Aug 2026; Annex III high-risk from 2 Dec 2027; Annex I products from 2 Aug 2028 (Reg. 2026/1744, OJ 24 Jul 2026, in force 27 Jul 2026) [S12] S |
| `EU_DATA_ACT` Data Act, Regulation (EU) 2023/2854 | obligation / in force since 12 Sep 2025, phased | 1. `flags ∋ cloud_or_data_processing_provider` and (`est ∋ eea` or `people ∋ eea`) → applies (Chapter VI switching duties on providers of data processing services; Art. 32 safeguards against unlawful third-country access to non-personal data). 2. `est ∋ eea` and `plat ∩ [aws, azure, gcp, oci, ibm, hyperscaler_sovereign_offering, partner_operated_cloud, eu_sovereign_provider, saas_major] ≠ ∅` → advisory ("as a customer you have switching rights; reduced cost-based switching charges until 12 Jan 2027, none after", Art. 29) | `national` (penalties set by member states; Art. 40 to confirm) | Art. 29 and 32 V (validation rows 24–27, 84); Art. 40 P; connected-product data duties (Chapter II) out of v1 scope |
| `EU_CRA` Cyber Resilience Act, Regulation (EU) 2024/2847 | obligation / phased | 1. `flags ∋ digital_product_vendor_eu` → advisory ("products with digital elements placed on the EU market") | `not_quantified` until S2 | **Dates and penalty tiers UNSOURCED** (settle: EUR-Lex text, Art. 64 and 71) |
| `EU_CSF_SEAL` EU Cloud Sovereignty Framework | framework / in use since 2026 tender | 1. `flags ∋ public_sector_body` and `est ∋ eea` → advisory ("EU public buyers may set minimum SEALs per sovereignty objective in cloud tenders") | none | [S2, S3, S4] S |
| `FR_SECNUMCLOUD` ANSSI SecNumCloud | scheme / in force | 1. `est ∋ eea` and (`org.eea_member_states ∋ FR` or `org.eea_member_states is_unknown`) and (`flags ∋ public_sector_body` or `flags ∋ critical_infrastructure_operator` or `sector eq health`) → advisory ("French public bodies and operators of vital importance may be required to use SecNumCloud-qualified services for sensitive data") | none | SecNumCloud 3.2 and S3NS qualification 17 Dec 2025 V (validation row 29); **legal trigger UNSOURCED** (settle: French "cloud au centre" doctrine and Law no. 2024-449 (SREN) Art. 31 on Légifrance) |
| `DE_C5` BSI C5 | scheme / in force | 1. `est ∋ eea` and (`org.eea_member_states ∋ DE` or `is_unknown`) and (`sector eq health` or `flags ∋ public_sector_body`) → advisory ("German health and public-sector buyers may require a C5 attestation") | none | **Legal trigger UNSOURCED** (settle: SGB V § 393 for health-sector cloud use and BSI C5 page) |
| `UK_GDPR` UK GDPR and DPA 2018, as amended by the Data (Use and Access) Act 2025 | obligation / in force (DUAA data protection changes from 5 Feb 2026) | 1. `est ∋ uk` → applies (Art. 3(1)). 2. `people ∋ uk` → likely_confirm (Art. 3(2)) | `turnover_greater_of`: £17.5M / 4%; £8.7M / 2% | Fines V (validation row 37); DUAA V (validation row 45); EU adequacy for the UK renewed 19 Dec 2025 until 27 Dec 2031 [S11] V; UK Extension to the DPF (SI 2023/1028) V (validation row 47) |
| `UK_OPRES` PRA SS1/21 and FCA PS21/3 (SYSC 15A) operational resilience | obligation / in force (impact tolerances from 31 Mar 2025) | 1. `flags ∋ uk_pra_regulated` → applies. 2. `flags ∋ uk_fca_solo_regulated` → likely_confirm (SYSC 15A covers certain FCA solo-regulated firms, including payment and e-money institutions — confirm the firm type). 3. `est ∋ uk` and `financial_sector` → likely_confirm | `not_quantified` (supervisory enforcement; no statutory maximum found) | SS1/21 citation and 31 Mar 2025 V (validation rows 38–39); scope S [S19]. Impact-tolerance maturity is assessed in **Resilience IQ** (section 11) |
| `UK_PRA_SS2_21` PRA SS2/21 outsourcing and third-party risk management | obligation / in force since 31 Mar 2022 | 1. `flags ∋ uk_pra_regulated` → applies | `not_quantified` | V (validation row 40); chapter references P |
| `UK_CTP` Critical third parties regime (FSMA 2023) | obligation (binds CTPs) / in force; designations from 13 Jul 2026, **volatile** | 1. `flags ∋ uk_ctp_designated` → applies. 2. `flags ∩ [uk_pra_regulated, uk_fca_solo_regulated] ≠ ∅` and `plat ∩ [aws, azure, gcp, oci, hyperscaler_sovereign_offering] ≠ ∅` → advisory ("HM Treasury designated Amazon Web Services EMEA SARL, Google Cloud EMEA Ltd, Microsoft Ireland Operations Ltd and Oracle Corporation UK Ltd, effective 13 Jul 2026; the regime binds them, your own duties remain") | Client: `not_applicable_to_client`; CTP: `not_quantified` until S2 | V (validation rows 42–43); Part number of FSMA 2023 UNSOURCED (validation row 44) |
| `UK_NIS` Network and Information Systems Regulations 2018 | obligation / in force | 1. `ent.ci_regimes ∩ [uk_nis_oes, uk_nis_rdsp] ≠ ∅` → applies. 2. `est ∋ uk` and `sector in [energy, transport, water, health, digital_infrastructure]` and `ent.ci_regimes is_unknown` → likely_confirm ("confirm operator of essential services or relevant digital service provider status; small and micro digital providers excluded") | `fixed` tiers up to £17M (also £3.4M, £8.5M by severity) | [S22] S |
| `UK_CSR_BILL` Cyber Security and Resilience (Network and Information Systems) Bill | obligation / **pending, volatile** | 1. (`est ∋ uk` or `people ∋ uk`) and (`sector in [digital_infrastructure, ict_service_management_b2b]` or `ent.ci_regimes ∩ [uk_nis_oes, uk_nis_rdsp] ≠ ∅`) → advisory ("Bill before Parliament; would bring data centres and medium and large managed service providers into scope") | `not_quantified` (not law) | Bill page [S23] V for existence; Lords stage and Royal Assent **not confirmed as of 13 Oct 2026** (last confirmed: Commons third reading 10 Jun 2026, secondary) |

#### 5.4.2 US

| Regime | Kind / status | Applicability rules (in order) → grade | Penalty model | Sources and status |
|---|---|---|---|---|
| `US_CLOUD_ACT` CLOUD Act, 18 U.S.C. § 2713 (and § 2703(h), § 2523) | exposure / in force | 1. `uses_us_parent_provider` → advisory ("a US provider must produce data in its possession, custody or control wherever it is stored; customer-held keys limit what it can technically produce but not its legal duty"; UK–US agreement in force 3 Oct 2022, Australia–US 31 Jan 2024) | `not_applicable_to_client` | § 2713 V (validation row 48); executive agreements [S24] S |
| `US_FISA_702` FISA Section 702 (50 U.S.C. § 1881a) | exposure / **volatile** | 1. `uses_us_parent_provider` and `people` contains any zone other than `us` → advisory ("targets non-US persons outside the US through US electronic communication service providers; status changing") | `not_applicable_to_client` | Statutory authority lapsed at the 12 Jun 2026 sunset, existing certifications continue, reauthorisation pending (validation row 51, V as of 13 Oct 2026 review); later status **not confirmed** in this session's search [S25]; 90-day review |
| `US_DOJ_DSP` DOJ Data Security Program, 28 CFR Part 202 | obligation / in force since 8 Apr 2025 | 1. `us_person_org` and `us_coc_link` and (`data.us_sensitive_categories ∋ government_related` or (`∩ [health, financial] ≠ ∅` and `data.personal_volume gte 10k_100k`) or (`∋ identifiers` and `gte 100k_1m`)) → applies. 2. `us_person_org` and (`us_coc_link` or `us_coc_link is_unknown`) and (`classes ∩ [personal, special, financial] ≠ ∅`) → likely_confirm. 3. `us_person_org` and `people ∋ us` and `classes ∩ [personal, special, financial] ≠ ∅` → advisory ("screen data brokerage, vendor, employment and investment agreements with countries of concern") | `not_quantified` until S2 (IEEPA penalties) | Thresholds: genomic > 100 US persons; other 'omic and biometric > 1,000; precise geolocation 1,000 devices; health and financial 10,000; covered identifiers 100,000; government-related data any volume (28 CFR 202.205); countries of concern China (incl. Hong Kong, Macau), Cuba, Iran, North Korea, Russia, Venezuela (202.601) [S26] S; effective date (validation section 7, missing regulations) S; **penalty amounts UNSOURCED** |
| `US_CCPA` CCPA as amended by CPRA (Cal. Civ. Code § 1798.100 ff.) | obligation / in force | 1. `people ∋ us` and `org.us_states ∋ CA` and `org.turnover_band_eur gte 50m_250m` → applies (annual gross revenue above $26,625,000 from 1 Jan 2025). 2. `people ∋ us` and `org.us_states ∋ CA` → likely_confirm (revenue near the threshold, or the 100,000 consumers or 50% revenue-from-selling tests). 3. `people ∋ us` and `org.us_states is_unknown` and `org.turnover_band_eur gte 50m_250m` → likely_confirm | `per_violation`: $2,663; $7,988 intentional or involving minors (from 1 Jan 2025) | Thresholds [S27] V (CPPA); fines V (validation section 7) |
| `US_STATE_PRIVACY` Other US state comprehensive privacy laws | obligation / in force (varies) | 1. `people ∋ us` and (`org.us_states ∋ other_comprehensive` or `org.us_states is_unknown`) → advisory ("confirm thresholds state by state") | `not_quantified` | **UNSOURCED** (settle: each state's statute; S2 decides which states to model) |
| `US_HIPAA` HIPAA Privacy, Security and Breach Notification Rules (45 CFR Parts 160, 164) | obligation / in force | 1. `flags ∋ us_hipaa_covered_or_ba` → applies. 2. `sector eq health` and (`est ∋ us` or `people ∋ us`) and `classes ∋ special` → likely_confirm ("confirm covered entity or business associate status") | `not_quantified` until S2 (tiered, inflation-adjusted per violation) | Covered entity definition 45 CFR 160.103 [S28] S; **penalty tiers UNSOURCED** |
| `US_GLBA` Gramm-Leach-Bliley Act and FTC Safeguards Rule | obligation / in force | 1. `flags ∋ us_glba_fi` → applies. 2. `est ∋ us` and `financial_sector` → likely_confirm | `not_quantified` | **UNSOURCED** (settle: 15 U.S.C. § 6801 ff.; 16 CFR Part 314) |
| `US_NYDFS_500` 23 NYCRR Part 500 | obligation / in force | 1. `flags ∋ us_nydfs_licensed` and `org.staff_band eq lt50` and `org.turnover_band_eur eq lt10m` → likely_confirm ("limited exemption 500.19(a) may apply: fewer than 20 employees and contractors, or under $7.5M New York revenue in each of the last three years, or under $15M year-end assets; exempt firms keep some duties and must file a notice"). 2. `flags ∋ us_nydfs_licensed` → applies | `not_quantified` | Exemption [S29] S; covered-entity definition S |
| `US_SEC_CYBER` SEC cybersecurity disclosure (Form 8-K Item 1.05, Reg. S-K Item 106) | obligation / in force | 1. `flags ∋ us_sec_registrant` → applies | `not_quantified` | [S30] V (8-K timing); Item 106 P |
| `US_FEDRAMP` FedRAMP | framework (procurement) / in force | 1. `flags ∋ us_federal_cloud_supplier` → advisory | none | **UNSOURCED** (settle: fedramp.gov and the FedRAMP Authorization Act) |

#### 5.4.3 APAC

| Regime | Kind / status | Applicability rules (in order) → grade | Penalty model | Sources and status |
|---|---|---|---|---|
| `SG_PDPA` Personal Data Protection Act 2012 | obligation / in force | 1. `est ∋ sg` → applies. 2. `people ∋ sg` → likely_confirm (collection of personal data in Singapore) | `turnover_greater_of`: S$1M or 10% of annual Singapore turnover where that turnover exceeds S$10M (s.48J) | s.26 [S31] S; s.26D and s.48J V (validation rows 55–56) |
| `SG_MAS_TRM` MAS Technology Risk Management Guidelines and Notices; MAS Outsourcing Guidelines | obligation / in force | 1. `flags ∋ sg_mas_licensed` → applies (TRM Guidelines for all FIs; the TRM Notice for the licence type, e.g. FSM-N09 of 9 May 2024 for finance companies). 2. `est ∋ sg` and `financial_sector` → likely_confirm | `not_quantified` (notice-specific; validation row 54 UNSOURCED) | FSM-N09 [S32] V; proposed amendments under consultation (status of final text **not confirmed**); outsourcing guidelines **UNSOURCED** |
| `SG_CYBERSECURITY_ACT` Cybersecurity Act 2018 (CII) | obligation / in force | 1. `ent.ci_regimes ∋ sg_cii_owner` → advisory (until S2 sources the duties) | `not_quantified` | **UNSOURCED** (settle: Cybersecurity Act 2018 on sso.agc.gov.sg and CSA guidance) |
| `AU_PRIVACY` Privacy Act 1988 (Cth) | obligation / in force | 1. `est ∋ au` and `sector eq health` and `classes ∋ special` → applies (health service providers are covered whatever their turnover). 2. `est ∋ au` and `org.turnover_band_eur gte 10m_50m` → applies (above the A$3M small-business threshold). 3. `est ∋ au` → likely_confirm (turnover below or near A$3M, or not given; exceptions such as trading in personal information). 4. `people ∋ au` → likely_confirm ("Australian link": carrying on business in Australia) | `turnover_greater_of`: A$50M, 3× the benefit, or 30% of adjusted turnover in the relevant period (s.13G); benefit not known, so only A$50M and 30% are computed | s.13G V (validation row 59); small-business threshold and APP 8 [S34] S; 2024 amendment tiers S (not modelled until S2) |
| `AU_APRA_CPS230` APRA CPS 230 Operational Risk Management | obligation / in force since 1 Jul 2025 (pre-existing service contracts: earlier of renewal or 1 Jul 2026) | 1. `flags ∋ au_apra_regulated` → applies. 2. `est ∋ au` and `sector in [banking, insurance, other_financial]` → likely_confirm | `not_quantified` | V (validation rows 57–58); scope [S33] S |
| `AU_APRA_CPS234` APRA CPS 234 Information Security | obligation / in force | Same rules as CPS 230 | `not_quantified` | [S33] S |
| `AU_SOCI` Security of Critical Infrastructure Act 2018 | obligation / in force | 1. `ent.ci_regimes ∋ au_soci_responsible_entity` → applies. 2. `est ∋ au` and `sector in [energy, transport, water, health, digital_infrastructure, banking, financial_market_infra, insurance, food, space]` and `ent.ci_regimes is_unknown` → likely_confirm | `not_quantified` until S2 | Reporting windows V (validation row 60); [S35] S; **penalties UNSOURCED** |
| `NZ_PRIVACY` Privacy Act 2020 | obligation / in force | 1. `est ∋ nz` → applies. 2. `people ∋ nz` → likely_confirm (overseas agencies carrying on business in New Zealand) | `fixed`: up to NZ$10,000 (offences, e.g. failing to notify a notifiable breach) | [S36] S |
| `IN_DPDP` Digital Personal Data Protection Act 2023 and DPDP Rules 2025 | obligation / **phased, volatile** | 1. `est ∋ in` and `people ∋ in` → applies (processing in India; most duties from 13 May 2027). 2. `est ∋ in` → likely_confirm ("s.17(1)(d) may exempt personal data of people outside India processed under a contract with a foreign party, except security and breach duties; from 13 May 2027"). 3. `people ∋ in` → likely_confirm (s.3(b): processing outside India in connection with offering goods or services to people in India) | `fixed`: up to ₹250 crore (failure of security safeguards, Schedule); other bands lower | Rules notified 13 Nov 2025; Rules 3, 5–16, 22–23 from 18 months (13 May 2027; one source says 14 May) [S37] S; penalty V (validation row 61); s.17(1)(d) [S47] S |
| `IN_RBI_PAYMENT` RBI Storage of Payment System Data (6 Apr 2018) | obligation / in force | 1. `flags ∋ in_rbi_payment_operator` and `classes ∋ financial` → applies (level floor L1 in `in`, 3.3). 2. `est ∋ in` and `sector eq other_financial` and `classes ∋ financial` → likely_confirm ("confirm whether you are an authorised payment system operator or part of its ecosystem") | `not_quantified` | [S38] V; validation row 65 V |
| `IN_CERT_IN` CERT-In Directions of 28 Apr 2022 | obligation / in force since 27 Jun 2022 | 1. `est ∋ in` → applies (service providers, intermediaries, data centres, body corporates) | `not_quantified` until S2 | 6-hour reporting V (validation row 66); scope wording P; **penalty UNSOURCED** |
| `IN_SEBI_IRDAI` SEBI and IRDAI cloud and outsourcing rules | obligation / in force | 1. `flags ∋ in_sebi_irdai_regulated` → advisory (until S2 sources them) | `not_quantified` | **UNSOURCED** (settle: SEBI cloud framework circular and IRDAI guidelines) |
| `JP_APPI` Act on the Protection of Personal Information | obligation / in force | 1. `est ∋ jp` → applies. 2. `people ∋ jp` → likely_confirm (foreign businesses handling personal information of people in Japan in connection with supplying goods or services) | `fixed`: corporate fine up to ¥100M | Art. 28 [S40] S; fine V (validation row 68, secondary); extraterritorial article **UNSOURCED** |
| `HK_PDPO` Personal Data (Privacy) Ordinance | obligation / in force (s.33 transfer restriction **not in operation**) | 1. `est ∋ hk` → applies. 2. `people ∋ hk` → advisory | `not_quantified` until S2 | s.33 not in operation; PCPD Recommended Model Contractual Clauses (12 May 2022) are best practice [S41] S |
| `HK_HKMA` HKMA Supervisory Policy Manual (technology risk, outsourcing) | obligation / in force | 1. `flags ∋ hk_hkma_authorised` → advisory (until S2 confirms the modules) | `not_quantified` | **UNSOURCED** (validation row 67; settle: HKMA SPM index) |
| `KR_PIPA` Personal Information Protection Act | obligation / in force (amended 15 Sep 2023) | 1. `est ∋ kr` → applies. 2. `people ∋ kr` → likely_confirm | `turnover_percent`: up to 3% of total revenue, excluding revenue unrelated to the violation | [S42] S |
| `CN_PIPL` Personal Information Protection Law | obligation / in force | 1. `est ∋ cn` → applies. 2. `people ∋ cn` → likely_confirm (Art. 3(2): processing outside mainland China to provide products or services to people there, or to analyse their behaviour). **Never fires for Hong Kong or Japan** (fixes validation row 71) | `either_or`: up to RMB 50M or up to 5% of prior-year turnover (Art. 66) | Art. 66 [S43] S; Art. 40 V (validation row 70); Art. 3 P |


---

## 6. Merged question set

### 6.1 Summary

| Mode | Questions | Time |
|---|---|---|
| **Executive** | **17** (2 of them shown only when triggered by an earlier answer: T2, I1) | 15–20 minutes |
| **Workshop** | Executive 17 + **15** asked in every workshop + up to **15** follow-ups triggered by answers | 60–90 minutes |
| **Total** | **47** | |

Rules (scorecard area 3):
- Every **maturity** question offers **Unknown**, which counts as risk (state `unknown`, scored 0, shown "unconfirmed").
- Scope questions are **never scored**; they set facts.
- Options within a question do not overlap and together cover every case (an "other" or "unknown" option where needed).
- Every question cites its **basis** (regime article or framework clause, section 15 references). Claim IDs replace `[Sn]` in S2.
- Mode column: **E** executive (asked in both modes), **W** workshop (always asked in workshop), **F** follow-up (workshop only, asked when the trigger is true). "E (conditional)" means asked in executive mode only when the trigger is true.

### 6.2 Footprint and organisation (scope)

| ID | Question (CIO wording) | Type | Options (value: label) | Feeds | Basis | Mode |
|---|---|---|---|---|---|---|
| A1 | Where is your group headquartered? | single | `eea` EU or EEA; `uk` United Kingdom; `ch` Switzerland; `us` United States; `ca` Canada; `in` India; `sg` Singapore; `au` Australia; `nz` New Zealand; `jp` Japan; `hk` Hong Kong; `kr` South Korea; `cn` Mainland China; `other` Other | `org.hq` | Default allowed zone (2.6); US person test 28 CFR 202 [S26] | E |
| A2 | For each region: do you have a legal entity, branch or office there, and do you hold personal data about people located there (customers, employees, users)? | matrix (rows: the 14 zones of A1; columns: `entity`, `people`; each column a multi-select; `people` also accepts `unknown`) | Rows as A1. Columns: `entity` We have an entity or office here; `people` We hold personal data of people here | `org.establishments` (entity column), `data.subject_regions` (people column) | GDPR Art. 3(1)–(2); UK GDPR Art. 3; AI Act Art. 2(1); PDPA; DPDP s.3; PIPL Art. 3 [S8, S12, S31, S37, S43]. Japan, Hong Kong, Australia and New Zealand are separate rows (fixes validation rows 71 and Sovereign Q1.2) | E |
| A3 | Which sector best describes your main business? | single | `banking` Banking (credit institutions); `financial_market_infra` Financial market infrastructure (trading venues, central counterparties); `insurance` Insurance and pensions; `other_financial` Payments, e-money, investment, crypto-assets and other financial services; `energy` Energy; `transport` Transport; `health` Healthcare providers, pharmaceutical and medical-device manufacturing; `water` Drinking water and waste water; `digital_infrastructure` Digital infrastructure (cloud, data centres, CDN, DNS, trust services, telecoms); `ict_service_management_b2b` Managed IT or managed security services for other businesses; `public_administration` Public administration; `space` Space; `postal` Postal and courier; `waste_management` Waste management; `chemicals` Chemicals; `food` Food production and distribution; `manufacturing_critical` Manufacturing of medical devices, electronics, electrical equipment, machinery or vehicles; `digital_providers` Online marketplaces, search engines or social networks; `research` Research organisations; `professional_services` Professional, consulting or IT services that are not managed IT services; `retail_consumer` Retail and consumer; `other` Other; `unknown` Not sure | `org.sector` | NIS2 Annexes I and II [S5]; sector flags for HIPAA, GLBA, SOCI | E |
| A4 | Roughly how large is the group? (headcount and annual turnover, euro equivalent, including companies you control) | compound: `staff_band` single; `turnover_band_eur` single | `staff_band`: `lt50` Under 50; `50_249` 50 to 249; `250plus` 250 or more; `unknown`. `turnover_band_eur`: `lt10m` Under €10M; `10m_50m` €10M–50M; `50m_250m` €50M–250M; `250m_1bn` €250M–1bn; `1bn_10bn` €1bn–10bn; `gt10bn` Over €10bn; `not_given` Prefer not to say | `org.staff_band`, `org.turnover_band_eur` | NIS2 Art. 2(1) and Recommendation 2003/361/EC [S5, S6]; CCPA revenue test [S27]; Privacy Act small-business threshold [S34]; D4 (no turnover, no quantification) | E |
| A5 | For the exposure view: what was last year's worldwide turnover, and the balance-sheet total? | compound: `turnover_amount` number + currency (optional); `balance_sheet_band_eur` single | `balance_sheet_band_eur`: `le10m` Up to €10M; `10m_43m` €10M–43M; `gt43m` Over €43M; `unknown` | `org.turnover_amount`, `org.balance_sheet_band_eur` | GDPR Art. 83(4)–(5); NIS2 Art. 34; AI Act Art. 99; Recommendation 2003/361/EC Art. 2 [S6, S8, S12] | W |
| A6 | In which EU and EEA countries do you have entities or offices? | multi | ISO codes of the 30 EEA states (`AT` … `SE`, `IS`, `LI`, `NO`); `unknown` | `org.eea_member_states` | NIS2 national transposition; national schemes (`FR_SECNUMCLOUD`, `DE_C5`) | F: `est ∋ eea` |
| A7 | In which US states do you have customers or employees whose personal data you hold? | multi | `CA` California; `NY` New York; `other_comprehensive` Other states with comprehensive privacy laws; `none` None of these; `unknown` | `org.us_states` | CCPA [S27]; state laws (UNSOURCED, S2) | F: `people ∋ us` or `est ∋ us` |

### 6.3 Entity classes (scope)

| ID | Question | Type | Options | Feeds | Basis | Mode |
|---|---|---|---|---|---|---|
| B1 | Which of these describe your organisation or a group company? Select all that apply. | multi | **EU financial (DORA):** `eu_credit_institution` EU bank or credit institution; `eu_investment_firm` EU investment firm, asset manager or trading venue; `eu_insurer` EU insurer, reinsurer or occupational pension fund; `eu_payment_emi` EU payment or e-money institution; `eu_casp` EU crypto-asset service provider; `eu_other_financial` Other EU financial entity under DORA; `ict_provider_to_eu_fs` We provide ICT services to EU financial entities; `dora_ctpp_designated` We are designated a critical ICT third-party provider under DORA. **UK:** `uk_pra_regulated` PRA-regulated (bank, building society, PRA-designated investment firm, insurer); `uk_fca_solo_regulated` FCA solo-regulated financial firm; `uk_ctp_designated` Designated as a UK critical third party. **APAC:** `sg_mas_licensed` Licensed or regulated by MAS; `au_apra_regulated` APRA-regulated; `hk_hkma_authorised` HKMA-authorised institution; `in_rbi_payment_operator` RBI-authorised payment system operator, or part of its payment ecosystem; `in_sebi_irdai_regulated` SEBI- or IRDAI-regulated. **US:** `us_nydfs_licensed` Licensed by NYDFS; `us_sec_registrant` SEC registrant (listed in the US); `us_hipaa_covered_or_ba` HIPAA covered entity or business associate; `us_glba_fi` Financial institution under GLBA; `us_federal_cloud_supplier` Cloud supplier to US federal agencies. **Other:** `critical_infrastructure_operator` Operator of critical infrastructure in any country; `cloud_or_data_processing_provider` We provide cloud or data-processing services to customers; `digital_product_vendor_eu` We sell software or connected products in the EU; `public_sector_body` We are a public-sector body; `none` None of these; `unknown` Not sure | `ent.flags` | DORA Art. 2 [S7]; SS1/21, PS21/3 [S19]; FSMA 2023 CTP (validation row 42); MAS, APRA, HKMA, RBI [S32, S33, S38]; 23 NYCRR 500 [S29]; SEC 8-K [S30]; 45 CFR 160.103 [S28]; Data Act Ch. VI [S13]; CRA (UNSOURCED) | E |
| B2 | Under NIS2: how have you classified yourselves, and are you one of the special entity types? | compound: `self_class` single; `special_type` single | `self_class`: `essential`; `important`; `not_in_scope` Assessed as not in scope; `not_assessed`. `special_type`: `qtsp` Qualified trust service provider; `non_qualified_tsp` Non-qualified trust service provider; `tld_registry` Top-level domain registry; `dns_provider` DNS service provider; `public_ecomms` Public electronic communications network or service; `none`; `unknown` | `ent.nis2_self_class`, `ent.nis2_special_type` | NIS2 Art. 2(2), 3(1)–(2) [S5] | F: `est ∋ eea` and (`nis2_annex_i` or `nis2_annex_ii` or `sector is_unknown`) |
| B3 | Are you responsible for critical infrastructure under any of these regimes? | multi | `au_soci_responsible_entity` Australia SOCI responsible entity; `uk_nis_oes` UK operator of essential services; `uk_nis_rdsp` UK relevant digital service provider (cloud, marketplace, search); `sg_cii_owner` Singapore CII owner; `cn_ciio` China critical information infrastructure operator; `none`; `unknown` | `ent.ci_regimes` | SOCI [S35]; UK NIS 2018 [S22]; Singapore Cybersecurity Act (UNSOURCED); PIPL Art. 40 [S43] | F: `flags ∋ critical_infrastructure_operator`, or `sector in [energy, transport, water, health, digital_infrastructure]` and `est ∩ [au, uk, sg, cn] ≠ ∅` |
| B4 | How does your organisation use AI today? Select all that apply. | multi | `none` We do not use AI in production; `deployer_internal` We use AI tools or third-party models for internal work; `deployer_high_impact` We use AI in decisions about people (credit, insurance pricing, hiring, biometric identification, access to essential services); `provider_ai_system` We build AI systems and sell or deploy them for others; `gpai_provider` We train or provide general-purpose AI models; `integrator_own_name` We put third-party AI models into products sold under our name; `unknown` Not sure | `ent.ai_roles` | AI Act Art. 2(1), 3, 25(1), Annex III items 1, 4, 5(b), 5(c) (validation rows 8–10) [S12] | E |

### 6.4 Data, platforms and requirement (scope)

| ID | Question | Type | Options | Feeds | Basis | Mode |
|---|---|---|---|---|---|---|
| D1 | Which kinds of data do you hold? Select all that apply. | multi | `personal` Personal data about customers, employees or users; `special` Sensitive personal data: health, genetic, biometric, ethnicity, beliefs, sex life or orientation, criminal records; `financial` Financial account, card and payment-transaction data; `ai_training` Datasets used to train or fine-tune AI models; `proprietary` Trade secrets, source code and other commercially sensitive non-personal data; `government` Classified data, or data held for a government client under contract restrictions; `ot_ci` Operational-technology and critical-infrastructure telemetry; `unknown` Not sure | `data.classes` | GDPR Art. 4(1), 9, 10 [S8]; RBI payment data [S38]; Data Act Art. 32 (non-personal data) [S13] | E |
| D2 | Roughly how many people's personal records do you hold in total? | single | `lt10k` Under 10,000; `10k_100k` 10,000–100,000; `100k_1m` 100,000–1 million; `gt1m` Over 1 million; `unknown` | `data.personal_volume` | 28 CFR 202.205 thresholds [S26]; CCPA 100,000 test [S27]; PIPL volume thresholds (UNSOURCED) | W |
| D3 | For each kind of data you hold: where is it stored and processed today, and where are its backups and disaster-recovery copies? | matrix (rows: classes selected in D1; columns: `primary`, `backup`; each cell a multi-select of zones, or `unknown`) | Zones: `eea`, `uk`, `ch`, `us`, `ca`, `in`, `sg`, `au`, `nz`, `jp`, `hk`, `kr`, `cn`, `other`, `unknown`. The EEA is one zone | `data.location` → `SOV.RES.LOCATION`, `SOV.BACKUP.LOCATION`; `derived.personal_transfer` | GDPR Ch. V (EEA as one area, validation finding M3); RBI [S38]; PIPL Art. 40 [S43]; NIST SP 800-53 SA-9(5) processing, storage and service location [S46] | E |
| D4 | Is there a current map of where your data flows, with records of processing, updated in the last 12 months? (maturity) | single | `current` Yes, current within 12 months (3); `partial` Partial or out of date (1); `none` No (0); `unknown` | `SOV.DATA.MAP` | GDPR Art. 30 [S8]; EDPB Recs 01/2020 step 1 "know your transfers" [S9]; DORA Art. 8 (P) | W |
| P1 | Which platforms run your production systems and hold your data? Select all that apply. | multi | `onprem` Our own data centres; `colo` Colocation or managed hosting; `aws` AWS (standard regions); `azure` Microsoft Azure (standard regions); `gcp` Google Cloud (standard regions); `oci` Oracle Cloud; `ibm` IBM Cloud; `hyperscaler_sovereign_offering` A hyperscaler's sovereign offering (for example AWS European Sovereign Cloud, Microsoft's sovereign cloud options, Google Cloud's sovereign controls); `partner_operated_cloud` Hyperscaler technology run by an independent local operator (for example S3NS, Bleu, Delos); `eu_sovereign_provider` A European-owned cloud provider (for example OVHcloud, STACKIT, Scaleway, IONOS, T-Systems); `apac_national_cloud` A locally owned cloud in APAC; `cn_cloud` A China-headquartered cloud; `saas_major` Major SaaS (for example Microsoft 365, Salesforce, ServiceNow, Workday, SAP); `ai_api_provider` Third-party AI model APIs; `other` Other; `unknown` Not sure | `plat.in_scope`; derives `prov.parent_jurisdictions` (2.4) | Platform playbook scope (S7); provider examples are options shown with alternatives, to be sourced in S7 (validation rows 29, 77–78) | E |
| P2 | Where are the parent companies of the providers that hold your regulated data headquartered? (refines the default from P1) | multi | Zones as A1; `unknown` | `prov.parent_jurisdictions` (override) | CLOUD Act § 2713 (possession, custody or control) (validation row 48); D3 (a fact, not a score) | F: `plat ∩ [partner_operated_cloud, saas_major, apac_national_cloud, other, unknown] ≠ ∅` |
| L1 | Beyond what the law requires, how much control does the board want over its data? (sets the client choice for every class selected in D1) | single | `L0` Meet the legal minimum only; `L1` Keep the data in our chosen region; `L2` Keep it in region and hold the keys, so the provider cannot read it without us; `L3` Have it run and supported only by staff in our region through a local entity; `L4` Make it immune from foreign laws, or keep it disconnected; `unknown` Not decided | `data.choice_level` (all classes) | EU Cloud Sovereignty Framework SEAL levels (3.4) [S2]; D12 | E |
| L2 | For each kind of data: which level do you need, in which region(s) may it sit, and which platforms hold it? | matrix (rows: classes from D1; columns: `level` single `L0`–`L4`/`unknown`; `zones` multi of zones; `platforms` multi of P1 values) | As L1 and A1 and P1 | `data.choice_level`, `data.allowed_zone`, per-class platforms for `SOV.JUR.IMMUNITY` | As L1; tender minimum SEALs translated with 3.4 | W |

### 6.5 Controls (maturity)

| ID | Question | Type | Options (value: label → state) | Feeds | Basis | Mode |
|---|---|---|---|---|---|---|
| R1 | How is the rule on where data may be stored enforced? | single | `enforced` Technically enforced everywhere: policies block deployments outside the allowed regions → 3; `partial` Enforced on some platforms or accounts only → 1; `convention` By convention or manual review only → 0; `unknown` → unknown | `SOV.RES.REGION_LOCK` | NIST SP 800-53 SA-9(5) [S46]; Posture C3 | E |
| T1 | When personal data leaves the region where it was collected (including remote access from another country), what covers it? Select all that apply. | multi | `no_transfer` It never leaves, including remote access; `adequacy` An adequacy decision or adequacy regulations (e.g. EU to UK, UK to EEA); `eu_us_dpf` EU-US Data Privacy Framework, recipient certified; `uk_data_bridge` UK Extension to the DPF ("data bridge"), recipient certified; `sccs` EU Standard Contractual Clauses; `idta_or_addendum` UK IDTA or UK Addendum; `bcr` Binding corporate rules; `apac_contract_or_consent` Contracts, consent or other routes required by APAC laws (e.g. Singapore PDPA s.26, Australia APP 8, Japan APPI Art. 28); `derogation` Only derogations (e.g. explicit consent, contract necessity); `undocumented` Some transfers have no documented basis; `unknown` | `xfer.mechanisms`; `SOV.XFER.BASIS` (state rule in 4.2) | GDPR Art. 44–46, 49 [S8]; DPF Decision (EU) 2023/1795, General Court T-553/23 upheld 3 Sep 2025, appeal C-703/25 P pending (validation rows 32–33, volatile); UK adequacy for EEA and UK Extension SI 2023/1028 (validation row 47); EU adequacy for the UK renewed to 27 Dec 2031 [S11]; PDPA s.26 [S31]; APP 8 [S34]; APPI Art. 28 [S40]; PIPA Art. 28-8 [S42]; PIPL Art. 38 [S43] | E |
| T2 | For transfers under contractual clauses or BCRs: have you assessed whether the destination's laws, including government access, undermine the protection, and recorded the result? | single | `complete` Yes, for every such transfer, reviewed regularly → 3; `partial` For some transfers, or not reviewed → 1; `none` No → 0; `unknown` → unknown | `SOV.XFER.TIA` | Schrems II C-311/18; EDPB Recs 01/2020 v2.0 [S9]; ICO TRA guidance [S16] | E (conditional): T1 includes `sccs`, `idta_or_addendum` or `bcr` |
| T3 | US bulk sensitive data: which covered categories do you hold about US persons, and do you screen transactions that could give a country of concern access to them? | compound: `categories` multi; `screening` single | `categories`: `genomic`; `biometric`; `precise_geolocation`; `health`; `financial`; `identifiers` Covered personal identifiers; `government_related` Data linked to US government personnel or sites; `none`; `unknown`. `screening`: `screened` We screen and block or license covered transactions and keep records → 3; `partial` Partly → 1; `none` No → 0; `unknown` → unknown | `data.us_sensitive_categories`; `SOV.XFER.US_BULK` | 28 CFR Part 202 (202.205, 202.601) [S26] | F: `us_person_org` and (`us_coc_link` or `us_coc_link is_unknown`) |
| K1 | For your most sensitive data in cloud and SaaS, who controls the encryption keys? | single | `external` We hold the keys outside the provider (external key manager or our own HSM); the provider cannot use them without us → 3; `dedicated_hsm` Keys in a single-tenant HSM in the provider's data centre that only we administer → 2; `byok` We create or import keys into the provider's key service, which the provider operates → 1; `mixed` Varies: external keys on some platforms, provider keys on others → 1; `provider` The provider creates and manages the keys → 0; `none` Some sensitive data is not encrypted at rest → 0; `unknown` → unknown | `SOV.KEY.CUSTODY` (one effect only; fixes the double count in Sovereign Q6.1) | NIST SP 800-53 SC-12, SC-28 [S46]; EDPB Recs 01/2020 Annex 2 use cases on encryption with keys under the exporter's control (P) [S9] | E |
| K2 | Have you tested that revoking your keys makes provider-held copies, including backups and caches, unreadable? | single | `tested` Yes, tested → 3; `possible_untested` Possible but not tested → 1; `not_possible` Not possible: the provider manages the key lifecycle → 0; `unknown` → unknown | `SOV.KEY.REVOCATION` | NIST SP 800-53 SC-12 [S46] | F: any class `derived.required_level ≥ L3` |
| K3 | Is regulated data encrypted at rest and in transit everywhere? | single | `all` Yes, everywhere → 3; `most` At rest everywhere; some internal traffic unencrypted → 2; `partial` Partly → 1; `no` No → 0; `unknown` → unknown | `SOV.ENC.BASELINE` | GDPR Art. 32(1)(a); NIS2 Art. 21(2)(h); NIST SP 800-53 SC-8, SC-28 [S5, S8, S46] | W |
| K4 | Do you use confidential computing (hardware-protected enclaves) for your most sensitive data while it is being processed? | single | `production` In production → 3; `poc` Pilot or proof of concept → 1; `none` No → 0; `unknown` → unknown | `SOV.CC.DATA_IN_USE` | LTM heuristic for L4 (basis to be sourced in S7 from provider documentation) | F: any class `derived.required_level ≥ L3` |
| O1 | When your cloud, SaaS or hosting providers need to reach your systems or data for support or operations, what happens? | single | `approve_log` Access needs our explicit, time-limited approval, and every access is logged and reviewed → 3; `mixed` Approval and logging on our main platforms, not on all SaaS → 2; `log_only` Access is logged and visible to us but needs no approval → 1; `standard` Provider staff access under the provider's standard terms; we have no visibility → 0; `unknown` → unknown | `SOV.OPS.ADMIN_ACCESS` (merges Sovereign Q5.1 and Q5.3, Posture E3 access part) | NIST SP 800-53 MA-4, AC-2 [S46]; GDPR Art. 28(3)(b)–(c), 32 [S8] | E |
| O2 | For services holding your most sensitive data: who operates and supports them, and under which entity and law? | single | `zone_local_entity` Only staff located in the allowed region, employed by a locally established entity under local law, including escalations → 3; `zone_staff_foreign_entity` Staff in the region, but the operating company or contract is foreign → 1; `follow_the_sun` Global follow-the-sun support → 0; `unknown` → unknown | `SOV.OPS.PERSONNEL_ZONE` (merges Sovereign Q4.2 and Q5.1, Posture H3) | EU Cloud Sovereignty Framework SOV-4 operational [S2]; NIST SP 800-53 PS-3 (P) [S46] | F: any class `derived.required_level ≥ L3` |
| O3 | For on-premises hardware, is remote out-of-band management (e.g. iDRAC, iLO) isolated, and is vendor call-home controlled? | single | `isolated` Isolated management network; vendor call-home blocked or approved → 3; `partial` Partly → 1; `connected` Connected, with vendor telemetry enabled → 0; `unknown` → unknown | `SOV.OPS.OOB_MGMT` | NIST SP 800-53 MA-4 [S46] | F: `plat ∩ [onprem, colo] ≠ ∅` and any class `derived.required_level ≥ L3` |
| V1 | Do you have data-processing (or service-provider) agreements with every processor? | single | `all` Yes, all → 3; `most` Most, with some gaps → 2; `major_only` Only major vendors → 1; `none` No → 0; `unknown` → unknown | `SOV.TP.DPA` | GDPR Art. 28(3) [S8]; HIPAA business associate agreements [S28]; DPDP s.8(2) (P) | W |
| V2 | For critical SaaS and cloud providers: do you know their sub-processors, and do you get advance notice and a right to object to changes? | single | `yes` Yes → 3; `partial` For some providers → 1; `no` No → 0; `unknown` → unknown | `SOV.SAAS.SUBPROCESSOR` | GDPR Art. 28(2), (4) [S8]; DORA RTS (EU) 2025/532 (validation row 21) | W |
| V3 | Do you know where each key SaaS and ICT provider actually stores and processes your data? | single | `full` Yes, documented per provider → 3; `partial` For some → 1; `none` Little or no visibility → 0; `unknown` → unknown | `SOV.TP.VISIBILITY` | NIS2 Art. 21(2)(d) [S5]; EDPB Recs 01/2020 step 1 [S9] | W |
| V4 | Do your cloud and ICT contracts give you audit, access and inspection rights over how your data is handled? | single | `full` Full audit and inspection rights → 3; `reports_only` Reports only (e.g. SOC 2, ISO certificates) → 1; `none` None → 0; `unknown` → unknown | `SOV.TP.AUDIT` | DORA Art. 30 [S7]; PRA SS2/21; MAS outsourcing guidelines (UNSOURCED) | W |
| B5 | Do you keep a complete register of your ICT third-party arrangements (the DORA register of information, or your regulator's equivalent)? | single | `complete` Complete, maintained, and submitted when requested → 3; `partial` In progress or incomplete → 1; `none` No → 0; `unknown` → unknown | `SOV.TP.REGISTER` | DORA Art. 28(3) (validation row 85); APRA CPS 230; PRA SS2/21 | F: `eu_financial_entity` or `flags ∩ [au_apra_regulated, uk_pra_regulated, sg_mas_licensed] ≠ ∅` |
| B6 | Have you mapped which important business services depend on the UK designated critical third parties, and what duties stay with you? | single | `mapped` Yes, mapped and owned → 3; `partial` Partly → 1; `not_mapped` No → 0; `no_ctp_dependency` We do not use any designated CTP → (ignored); `unknown` → unknown | `SOV.CONC.PROVIDER` (lower of B6 and X2) | UK CTP designations from 13 Jul 2026 (validation rows 42–43) | F: `flags ∩ [uk_pra_regulated, uk_fca_solo_regulated] ≠ ∅` |
| X1 | If your main cloud or SaaS provider became unavailable or no longer acceptable (for example after a change in law), how ready are you to move critical services? | single | `tested` Documented exit plans for critical services, portable formats, and a rehearsal or partial migration done → 3; `documented` Documented exit plans with a realistic timeline, not rehearsed → 2; `partial` Plans for some services only, or a timeline over 18 months → 1; `none` No exit plan; effectively locked in → 0; `unknown` → unknown | `SOV.EXIT.PLAN` (merges Sovereign Q7.1–Q7.2, Posture F4) | DORA Art. 28(8) (validation row 23); APRA CPS 230; PRA SS2/21; Data Act Art. 29 switching rights [S13]. Exit testing is assessed in Resilience IQ (section 11) | E |
| X2 | How concentrated are your critical services on one provider? | single | `diversified` Critical services can run on more than one provider or on-premises → 3; `managed` One main provider, with documented alternatives for critical services → 2; `concentrated_aware` One provider hosts most critical services; the risk is assessed and accepted by the board → 1; `concentrated` One provider hosts most critical services; not assessed → 0; `unknown` → unknown | `SOV.CONC.PROVIDER` | DORA Art. 29 [S7]; APRA CPS 230 | W |
| I1 | Where do your AI models run (training, fine-tuning and inference), and can the provider use your data to train its own models? | single | `in_zone_no_training` In our allowed region, and the provider contractually cannot train on our data → 3; `in_zone_unclear` In our region, but the training-use terms are not confirmed → 1; `out_of_zone_contract` Outside our region, with contractual no-training and data-handling terms → 1; `out_of_zone` Outside our region, terms not reviewed → 0; `unknown` → unknown | `SOV.AI.DATA_LOCATION` | GDPR Ch. V for personal data in AI pipelines [S8]; AI Act data governance Art. 10 (P) [S12] | E (conditional): `ent.ai_roles` not only `none` |
| I2 | Have you assessed your role under the EU AI Act for each AI system, classified each system by risk, and mapped the obligations and their dates? (For UK firms: also against ICO, FCA and PRA expectations.) | single | `complete` Yes, for every system → 3; `partial` For some systems → 1; `none` No → 0; `unknown` → unknown | `SOV.AI.GOVERNANCE` | AI Act Art. 2, 6, 25, 26, 50, Annex III [S12]; dates per Reg. 2026/1744 | F: `EU_AI_ACT` graded `applies` or `likely_confirm`, or `est ∋ uk` and `ent.ai_roles` not only `none` |
| G1 | Who owns decisions on where your data and workloads may run? | single | `exec_forum` One named executive, with a governance forum → 3; `shared` Shared across teams, no single owner → 1; `none` No clear owner → 0; `unknown` → unknown | `SOV.GOV.OWNER` | NIS2 Art. 20 [S5]; DORA Art. 5 (P) [S7] | W |
| G2 | Can you detect, classify and report an incident within the shortest window that applies to you (for example 1 hour under MAS notices, 4 hours under DORA, 6 hours under CERT-In directions, 12 hours under SOCI, 24 hours under NIS2, 72 hours under GDPR)? | single | `tested` Yes, tested in an exercise → 3; `documented_untested` Documented but untested, or unclear for cross-border incidents → 1; `none` No reliable process → 0; `unknown` → unknown | `SOV.IR.REPORTING` | MAS (validation row 53); DORA RTS 2025/301 (row 18); CERT-In (row 66); SOCI (row 60); NIS2 Art. 23 (row 14); GDPR Art. 33 [S8] | W |
| G3 | Do the services holding your most sensitive data hold an assurance qualification that your regulators or customers recognise for that level? | single | `recognised_high` Yes, a national high-assurance qualification where one applies (for example SecNumCloud, BSI C5, IRAP, MTCS, ISMAP, FedRAMP) → 3; `baseline` ISO/IEC 27001 or SOC 2 only → 1; `none` None → 0; `unknown` → unknown | `SOV.CERT.ASSURANCE` | SecNumCloud (validation row 29); other schemes to be sourced in S2; EUCS not listed because not adopted [S14] | F: any class `derived.required_level ≥ L3`, or `flags ∋ public_sector_body`, or `FR_SECNUMCLOUD` / `DE_C5` graded advisory |
| H1 | For on-premises hardware, appliances and network equipment, have you assessed provenance against supply-chain restrictions that apply to you? | single | `audited` Fully assessed; `partial` Partly; `not_audited` Not assessed; `unknown` | `SOV.HW.PROVENANCE` (advisory, not scored) | NDAA § 889 (UNSOURCED, validation row 52) | F: `flags ∩ [us_federal_cloud_supplier, critical_infrastructure_operator] ≠ ∅` |

### 6.6 Workshop outcome preferences (not scored)

| ID | Question | Options | Use | Mode |
|---|---|---|---|---|
| W1 | How much compliance risk will the board accept while remediating? | `zero` None; `minimal` Minimal, with a short-term plan; `moderate` Moderate if residual risk is low; `flexible` Flexible: cost and performance come first | Roadmap sequencing only | W |
| W2 | What is the appetite for remediation investment over the next 12 months? | `high`; `medium` Phased over 6–12 months; `low` Quick wins only; `tbd` Under review | Roadmap sequencing; SOW sizing (consultant only) | W |
| W3 | Which outcomes matter most for the target architecture? (pick up to three) | `compliance`; `sovereignty_differentiator`; `resilience`; `cost`; `performance`; `speed` | Ordering of options in the playbook (S7) | W |

### 6.7 Old-to-new question map

| Theme | Sovereign IQ | Posture IQ | Merged | Change |
|---|---|---|---|---|
| Sector, footprint, turnover | Q1.1, Q1.2, Q1.3 | A3, org fields | A1–A5 | Countries split (Japan, Hong Kong, Australia, New Zealand separate); data-subject regions are scope, never scored (fixes Posture A3 scored as maturity, H2); turnover optional (D4) |
| Entity classification | — | A1, A2 | B1, B2, B3 | NIS2 now derived from sector and size with the client's own classification as a follow-up; AI Act role, payment operator, CI, APRA/MAS/PRA/FCA, US flags added |
| Data classes and volume | Q3.1 | B1, B2 | D1, D2 | Posture categories kept; behavioural data folded into `personal` |
| Platforms | Q2.1 | C1 | P1, P2 | One list driving the playbook; provider jurisdiction derived as a fact (D3) |
| Data location | Q3.2, Q3.3 | C2, F1 | D3 | Matrix per class with a backup column; EEA one zone (M3) |
| Residency enforcement | — | C3 | R1 | Kept |
| Transfers and TIA | Q4.3 | D1, D2 | T1, T2 | DPF, UK data bridge, SCCs/IDTA, APAC routes and derogations named |
| Provider jurisdiction and contract | Q4.1, Q4.2 | H1 | P1/P2 (fact), O2 | No longer scored as maturity (D3, H2) |
| Admin and support access | Q5.1, Q5.3 | E3, E4, H3 | O1, O2 | Merged; personnel and local entity only from L3 |
| On-premises out-of-band | Q5.2 | probe 5 | O3 | Follow-up, only with on-premises and L3+; "no on-prem" is `na`, not a score (fixes Q5.2 scoring 70) |
| Keys | Q6.1, Q6.3 | F2, H3 | K1, K2 | One key-custody effect only |
| Encryption baseline | — | F2, F3 | K3 | Workshop |
| Confidential computing | Q6.2 | — | K4 | Follow-up for L3+ |
| Processors and sub-processors | — | E1, E4 | V1, V2 | Kept |
| Provider location visibility | — | E3 | V3 | Kept |
| Audit rights | — | I1 | V4 | Kept |
| Concentration and exit | Q7.1, Q7.2 | F4, I3 | X1, X2, B6 | Exit testing referred to Resilience IQ (D13) |
| ICT register | — | E2 | B5 | Follow-up for DORA, APRA, PRA, MAS firms |
| Hardware provenance | Q7.3 | — | H1 | Follow-up, advisory until sourced |
| AI | Q2.3 | G1–G4 | B4, I1, I2 | AI data location added; UK principles folded into I2 |
| Certification | — | H2 | G3 | Without EUCS |
| Governance, incidents | — | I2, J1 | G1, G2 | Kept |
| Data Act role | — | D3 | B1 option `cloud_or_data_processing_provider` | Folded into B1 |
| UK OpRes tolerances | — | F5 | — | Moved to Resilience IQ (section 11); `UK_OPRES` still graded here |
| Outcome preferences | — | K1–K3 | W1–W3 | Workshop only, not scored |
| Board ambition | — | — | L1, L2 | New: client choice for the required level (3.2) |
| US bulk data | — | — | T3 | New (28 CFR Part 202) |

---

## 7. The two headlines (D2)

The report leads with two numbers that are never blended: **sovereignty control maturity** (how well the client's controls meet the level its data requires) and **compliance exposure** (which regimes apply and how exposed the client is under each).

### 7.1 Sovereignty control maturity (0–100, against the required level, D3)

**Required control set.** For the selected mode, the set `R` is:
1. every control required by the level of each data class (3.1), for every class whose `derived.required_level` reaches that control's level; plus
2. every regime-required control (4.3) whose regime is graded `applies` or `likely_confirm` and whose condition holds, except rows that are UNSOURCED or apply from a later date (4.3 guards);
3. restricted to controls **measured in the mode** (executive: the 10 controls marked "yes" in 4.2; workshop: all 27 scored controls). Executive results are labelled "Executive maturity, n of N required controls assessed".

**Control score.** `s = state / 3`. `unknown` and `not_answered` score **0**. `na` removes the control (only scope answers can do this). Class-scope controls (`SOV.RES.LOCATION`, `SOV.BACKUP.LOCATION`, `SOV.JUR.IMMUNITY`) score the **mean** over the classes that require them.

**Maturity.**

```
maturity = round( 100 × Σ_{k ∈ R} w_k · s_k  /  Σ_{k ∈ R} w_k )
```

with weights C = 3, H = 2, S = 1 (4.2). If `R` is empty (every class at L0 and no regime-required controls), the headline reads "Nothing required at the level you set" and no number is shown.

**Bands.**

| Band | Range | Wording |
|---|---|---|
| Exposed | 0–39 | Controls do not yet meet the level your data requires |
| Developing | 40–59 | Some required controls in place; material gaps remain |
| Managed | 60–79 | Most required controls in place; gaps are specific |
| Sovereign-ready | 80–100 | Controls meet the level your data requires |

**Rules that protect the number.**
- **Unknown counts as risk**: scored 0 and listed as "unconfirmed" beside the score.
- **Blanks never flatter**: an unanswered required control scores 0 and is listed as "not answered". Coverage is shown (answered weight / required weight); below 60% the headline is labelled "provisional". (This replaces PLAN.md S3 item 6's "blank answers excluded"; see open question Q1.)
- **Scope never scores**: A, B, D1–D3, P, L questions set facts only. Provider nationality affects only `SOV.JUR.IMMUNITY`, which is required only at L4 (D3).
- **Monotonic**: a better state never lowers maturity (weights are positive; states are ordered). Changing L1/L2 changes the requirement, not the quality of an answer; the S4 audit treats L1/L2 as scope.
- **Executive mode sets one level for all classes** (L1). Where the workshop's per-class requirements (L2) are stricter, executive maturity can be higher than workshop maturity (archetype 5, section 10). Executive results therefore carry the label "Requirement set at one level for all data classes; the workshop confirms it per class".
- **One effect per answer** (4.1). The S4 audit checks that no single answer moves maturity by more than the agreed limit (proposal 20 points); with few required controls in executive mode a C-weight answer can exceed it, so S4 calibrates either the weights or a minimum required-set size.

### 7.2 Compliance exposure (the posture view)

**Per regime** (graded `applies`, `likely_confirm` or `advisory`):
- grade and the reason in plain words (the rule that fired; rule IDs shown to consultants only);
- obligations with article and dates, with "status as of" for volatile regimes (D8);
- **RAG** for `obligation` regimes that have regime-required controls under the current facts: **Red** if any required control of weight C or H is `0`, `unknown` or `not_answered`; **Amber** if any required control is below `3`; **Green** if all are `3`. In executive mode the RAG covers only measured controls and says "n of N obligations assessed";
- regimes with no required controls (exposure laws, schemes, frameworks, pending bills, customer-side rights) are **not RAG-rated**; they show their reason instead;
- statutory maximum per the regime's penalty model (5.3).

**Summary line.** "N regimes apply, M likely – confirm, K advisory; R red, A amber, G green."

**Largest single statutory maximum.** The highest computable cap among regimes graded `applies` or `likely_confirm`, labelled with regime and article and **"cap, not expected fine"**. Never summed across regimes or tiers. Rules:
- computed only if turnover is given (D4): exactly with A5 `turnover_amount`; as a range from the A4 band otherwise (open question Q2); `not_given` → "not quantified – turnover not given";
- per regime, the tier shown is the one tied to the obligations in scope (GDPR Art. 83(5) for transfers; AI Act Art. 99(4), never Art. 99(3) unless a prohibited practice is confirmed; NIS2 the essential or important tier from the rule annotation);
- `national`, `not_quantified`, `per_violation`, `periodic` and `not_applicable_to_client` models are never turned into a single figure;
- currency conversion uses the dated reference rates in the claims register, with the date shown.

**Foreign-access exposure line (informational).** For exposure regimes (`US_CLOUD_ACT`, `US_FISA_702`): which data classes sit with providers whose parent is outside the class's zone, and the state of the controls that limit what such a provider can technically produce (`SOV.KEY.CUSTODY`, `SOV.OPS.ADMIN_ACCESS`, and `SOV.JUR.IMMUNITY` where L4 applies). It never says a foreign order is unenforceable (validation row 36).

---

## 8. Findings

### 8.1 What creates a finding

| Type | Created when | Example |
|---|---|---|
| `control_gap` | A required control (7.1 set `R`, workshop scope) has state below 3, `unknown` or `not_answered`. One finding per control; class-scope controls list the affected classes | `SOV.KEY.CUSTODY` at 1 for financial data at L2 |
| `scope_confirmation` | A regime is graded `likely_confirm` | "Confirm whether you are an important entity under NIS2: your size depends on the balance sheet" |
| `conflict` | Answers contradict each other (e.g. T1 `no_transfer` while D3 shows personal data outside the subjects' zone) | Control set to `unknown` until resolved |
| `decision` | A choice the board must make (L1 `unknown`; a class at L4 on a platform with a foreign parent) | "Set the sovereignty ambition for customer data" |

No finding is created for a client merely because of provider nationality, and no fixed actions are shown to every client (validation H5, S3 item 5).

### 8.2 Finding record (`finding.schema.json`)

| Field | Content |
|---|---|
| `id` | `F-<CONTROL_ID>` or `F-SCOPE-<REGIME>`, `F-CONFLICT-<n>`, `F-DECISION-<n>` |
| `type` | as 8.1 |
| `control` | control ID (for `control_gap`) |
| `dataClasses`, `requiredLevel` | affected classes and the highest required level among them |
| `state`, `unconfirmed` | current state; `true` if `unknown` or `not_answered` |
| `regimes[]` | `{ regime, grade, article }` for every regime that requires the control |
| `severity` | rule in 8.3 |
| `title` | decision- or action-led, e.g. "Move key control for payment data outside the provider" |
| `businessConsequence` | plain words, with the regime consequence where one applies (e.g. "Personal data reaches the US without a documented basis: a GDPR Chapter V breach falls in the upper fine tier, Art. 83(5), and a regulator can order the transfers to stop") |
| `ownerRole` | from the control catalogue (4.2) |
| `timeFrame` | from severity (8.3), overridden by an earlier dated obligation ("by 13 May 2027"), or "overdue since <date>" |
| `remedy` | what good looks like (from the control definition) |
| `playbookRefs[]` | `{ control, platform, level }` for each platform in P1 (S7). Application-level entries state that specific plans need technical discovery beyond the questionnaire |
| `offeringRefs[]` | offering IDs (8.4) |
| `sources[]` | claim IDs |
| `mode` | `executive` or `workshop` (findings from workshop-only controls never appear in executive results) |

### 8.3 Severity and time frame

**Driver strength.** *Strong* if a regime graded `applies` requires the control, or a class at L2 or above requires it. *Normal* otherwise (only `likely_confirm` regimes or L1 classes). For class-scope controls the state used is the **lowest** state among the affected classes.

| Weight and driver | State 0 or unknown | State 1 | State 2 |
|---|---|---|---|
| C, strong | **Critical** | High | Medium |
| C, normal | High | Medium | Low |
| H, strong | High | Medium | Low |
| H, normal | Medium | Low | Low |
| S, any | Medium | Low | Low |

`scope_confirmation` findings are **High** if the regime would carry a quantifiable cap or a level floor, else **Medium**. `conflict` findings are **High**. `decision` findings are **High**.

**Ranking (top gaps, roadmap order within a wave).** Deterministic, in this order: (1) severity; (2) control weight, higher first; (3) number of drivers, more first (each regime graded `applies` that requires the control counts one, and being required by a class at L2 or above counts one); (4) state, lower first; (5) control ID. The executive summary shows the first five.

| Severity | Default time frame |
|---|---|
| Critical | 0–3 months |
| High | 3–6 months |
| Medium | 6–12 months |
| Low | 12–24 months |

### 8.4 Offering links (WS-S5; S8)

| Controls | Offering (generic practice) | Type |
|---|---|---|
| `SOV.XFER.*`, `SOV.DATA.MAP`, `SOV.TP.DPA`, `SOV.TP.VISIBILITY`, `SOV.SAAS.SUBPROCESSOR`, `SOV.GOV.OWNER`; all `scope_confirmation` | `OFF.SOV.ASSESS` Sovereignty and transfer assessment (Sovereign Cloud) | Advisory |
| `SOV.TP.REGISTER`, `SOV.EXIT.PLAN`, `SOV.CONC.PROVIDER`, `SOV.TP.AUDIT`, `SOV.IR.REPORTING` | `OFF.REG.PROGRAMME` Regulatory programme support: DORA, NIS2, CPS 230 (Resilience Engineering) | Advisory |
| `SOV.RES.REGION_LOCK`, `SOV.KEY.CUSTODY`, `SOV.KEY.REVOCATION`, `SOV.OPS.ADMIN_ACCESS`, `SOV.ENC.BASELINE`, `SOV.OPS.OOB_MGMT`, `SOV.CC.DATA_IN_USE` | `OFF.SOV.LZ` Sovereign landing zone (Cloud Transformation) | Implementation |
| `SOV.RES.LOCATION`, `SOV.BACKUP.LOCATION` | `OFF.DATA.RESIDENCY` Data residency remediation (Data and AI) | Implementation |
| `SOV.JUR.IMMUNITY`, `SOV.OPS.PERSONNEL_ZONE`, `SOV.CERT.ASSURANCE`; `SOV.RES.LOCATION` at L3–L4 on a platform that cannot meet the level | `OFF.SOV.MIGRATION` Migration to a sovereign platform (Cloud Transformation) | Transformation |
| `SOV.AI.DATA_LOCATION`, `SOV.AI.GOVERNANCE` | `OFF.SOV.AI` Sovereign AI enablement (Data and AI) | Implementation |
| `SOV.EXIT.PLAN` (testing) | Referral to Resilience IQ (section 11) | — |

Scope ranges appear only in the consultant SOW draft (D7).

### 8.5 Roadmap sequencing

Waves follow severity, then dependencies: `SOV.DATA.MAP` and `SOV.TP.VISIBILITY` before `SOV.XFER.BASIS` and `SOV.RES.LOCATION`; `SOV.KEY.CUSTODY` before `SOV.KEY.REVOCATION`; `SOV.RES.REGION_LOCK` before `SOV.RES.LOCATION` remediation; `scope_confirmation` and `decision` findings in wave 1 because they change the requirement. W1–W3 adjust ordering within a wave only.

---

## 9. Modes (WS-S7)

One engine and one request contract serve all modes.

| Mode | Content | Time |
|---|---|---|
| **Executive** | The 17 E questions; executive maturity over the 10 executive controls; full regime applicability (all scope facts are asked); exposure RAG over measured controls | 15–20 minutes |
| **Workshop** | All 47 questions as triggered; full maturity; follow-ups shown only when their trigger is true | 60–90 minutes |
| **Client** (a view on either depth) | The same results without internals | — |

**Client mode hides:** control weights and numeric states (shows "in place / partly / not in place / unconfirmed"); the maturity formula (the methodology panel explains it in plain words); rule IDs and the list of `not_applicable` regimes (shows the count and "ask your consultant"); consultant notes and probes; offering scope ranges, fees and the SOW draft (D7); claim-register internals other than the source citations; the AI toggle control (the state is shown on the report). **Client mode shows:** both headlines with bands and coverage, every applicable regime with reason, obligations and dates, findings with owner role and time frame, the roadmap, "How LTM can help" (type, purpose, execution outline), technical execution per selected platform, methodology and sources, version stamps (engine, registry, claims register), the "not legal advice" disclaimer and the hosting statement (S10).

---

## 10. Reference archetypes (expected outcomes written before the engine)

Five archetypes replace the old demos (Sovereign IQ's Saudi bank and Posture IQ's EU demos). Each gives a full answer set and the **expected** outcome: regimes in scope with grade, required levels, both headlines, exposure RAG, the largest single cap and the top five gaps. They are written from the rules in sections 2–8 and the cited law, before any engine exists; S3 golden outputs must match them or the difference is explained and approved. Maturity figures follow the formula in 7.1 exactly and are rounded; S4 may recalibrate weights, in which case these numbers change with an approved golden diff, but grades, RAG and the ranking of top gaps should not. The same data is in `archetypes.json`.

Question IDs and option values are those defined in section 6. Questions not listed for an archetype are not triggered for it.


### ARC1_EU_BANK_DORA: EU retail bank under DORA

Mid-size retail and SME bank headquartered in the EU (Germany and the Netherlands), 4,000 staff, Azure plus own data centres, Microsoft 365 and a US AI API; uses AI for credit decisions.


**Answers**

| Q | Answer |
|---|---|
| A1 | `eea` |
| A2 | entity: `eea`<br>people: `eea` |
| A3 | `banking` |
| A4 | staff_band: `250plus`<br>turnover_band_eur: `1bn_10bn` |
| A5 | **turnover_amount** amount: 3200000000; currency: `EUR`<br>balance_sheet_band_eur: `gt43m` |
| A6 | `DE`, `NL` |
| B1 | `eu_credit_institution` |
| B2 | self_class: `not_in_scope`<br>special_type: `none` |
| B4 | `deployer_internal`, `deployer_high_impact` |
| D1 | `personal`, `financial`, `proprietary` |
| D2 | `gt1m` |
| D3 | **personal** primary: `eea`; backup: `eea`<br>**financial** primary: `eea`; backup: `eea`<br>**proprietary** primary: `eea`, `us`; backup: `eea`, `us` |
| D4 | `partial` |
| P1 | `onprem`, `azure`, `saas_major`, `ai_api_provider` |
| P2 | `us` |
| L1 | `L2` |
| L2 | **personal** level: `L2`; zones: `eea`; platforms: `onprem`, `azure`, `saas_major`<br>**financial** level: `L3`; zones: `eea`; platforms: `onprem`, `azure`<br>**proprietary** level: `L1`; zones: `eea`, `us`; platforms: `saas_major` |
| R1 | `partial` |
| T1 | `sccs`, `eu_us_dpf` |
| T2 | `partial` |
| K1 | `byok` |
| K2 | `possible_untested` |
| K3 | `most` |
| K4 | `none` |
| O1 | `log_only` |
| O2 | `zone_staff_foreign_entity` |
| O3 | `partial` |
| V1 | `all` |
| V2 | `partial` |
| V3 | `partial` |
| V4 | `full` |
| B5 | `partial` |
| X1 | `partial` |
| X2 | `concentrated_aware` |
| I1 | `in_zone_unclear` |
| I2 | `partial` |
| G1 | `exec_forum` |
| G2 | `tested` |
| G3 | `baseline` |
| W1 | `minimal` |
| W2 | `medium` |
| W3 | `compliance`, `resilience` |

**Expected regimes in scope** (all others `not_applicable`)

| Regime | Grade | Rule | Why |
|---|---|---|---|
| `EU_DORA` | applies | EU_DORA.2 | EU credit institution established in the EU (DORA Art. 2(1)) |
| `EU_GDPR` | applies | EU_GDPR.1 | EU establishment (GDPR Art. 3(1)) |
| `EU_AI_ACT` | applies | EU_AI_ACT.4 | Deployer established in the EU; credit-scoring AI is Annex III 5(b) high-risk, duties from 2 Dec 2027 |
| `EU_NIS2` | advisory | EU_NIS2.7 | Banking entity under DORA; client assessed itself as not in NIS2 scope; DORA treated as the sector-specific act (to confirm) |
| `EU_DATA_ACT` | advisory | EU_DATA_ACT.2 | Customer of cloud services in the EU: switching rights, charges abolished from 12 Jan 2027 |
| `US_CLOUD_ACT` | advisory | US_CLOUD_ACT.1 | Azure, Microsoft 365 and the AI API have US parents |
| `US_FISA_702` | advisory | US_FISA_702.1 | US-parent providers hold data of non-US persons; status volatile |

**Required levels** — executive: personal L2, financial L2, proprietary L2; workshop: personal L2, financial L3, proprietary L1.

**Maturity** — executive: **50 (Developing)** over 9 required controls; workshop: **55 (Developing)** over 24 required controls.

**Exposure (workshop)**

| Regime | RAG | Why |
|---|---|---|
| `EU_GDPR` | amber | TIA partial, sub-processor control partial, data map partial; nothing absent |
| `EU_DORA` | amber | Register of information and exit plans partial; concentration assessed but high |
| `EU_AI_ACT` | amber | AI Act role and risk mapping partial |

**Largest single statutory maximum:** EUR 128,000,000 — `EU_GDPR` Art. 83(5) (4% of EUR 3.2bn worldwide turnover); *cap, not expected fine*.

**Top gaps (workshop)**

| # | Control | Severity | Classes | Regimes | Why |
|---|---|---|---|---|---|
| 1 | `SOV.KEY.CUSTODY` | High | personal, financial | — (level) | BYOK leaves the provider operating the keys for L2 and L3 data |
| 2 | `SOV.OPS.ADMIN_ACCESS` | High | personal, financial | — (level) | Provider access is logged but needs no approval |
| 3 | `SOV.SAAS.SUBPROCESSOR` | Medium | — | EU_GDPR, EU_DORA | Sub-processor notice and objection rights for some providers only (GDPR Art. 28(2), (4); DORA subcontracting RTS (EU) 2025/532) |
| 4 | `SOV.DATA.MAP` | Medium | — | EU_GDPR | Data-flow map and records of processing partial or out of date (GDPR Art. 30) |
| 5 | `SOV.EXIT.PLAN` | Medium | — | EU_DORA | DORA Art. 28(8) exit plans for some services only; the Art. 28(3) register of information (also partial) ranks sixth |

**Reasoning.** DORA applies to EU credit institutions from 17 Jan 2025 (Art. 2(1); validation rows 16, 20) [S7]. GDPR applies through the EU establishment (Art. 3(1)) [S8]. Credit scoring is an Annex III 5(b) use (validation row 8), so the bank is a deployer of a high-risk system with duties from 2 Dec 2027 under Regulation (EU) 2026/1744 [S12]; the AI Act cap is quantified because a high-risk duty applies (H4). NIS2 is advisory, not `applies`: banking is an Annex I sector, but the bank is a DORA financial entity and has assessed itself out of NIS2 scope; the DORA-as-sector-specific-act position (NIS2 Art. 4) is UNSOURCED in this session and must be confirmed in S2. No legal level floor applies (3.3): the L2/L3 requirement is the board's choice, which is typical for EU banks but is not a DORA requirement. The headline gaps are therefore **key custody and provider access** (L2 controls), then **sub-processor control** (required by both GDPR Art. 28 and the DORA subcontracting RTS), the **data map** and **DORA exit plans** (Art. 28(8)); the DORA register of information (Art. 28(3)) is also partial and ranks sixth under the tie-break rule in 8.3 (validation rows 21, 23, 85). Executive mode is lower (50) than workshop (55) because, with one L2 level for every class, source code in a US SaaS counts as outside the zone; the workshop sets proprietary data to L1 with the US allowed. Largest cap: GDPR Art. 83(5), 4% of EUR 3.2bn = EUR 128M, above the AI Act Art. 99(4) figure of 3% = EUR 96M; DORA penalties for financial entities are national (Art. 50–51), so they are not quantified. Never summed.


### ARC2_UK_INSURER_OPRES_CTP: UK insurer under PRA operational resilience, using designated critical third parties

UK life and health insurer (PRA and FCA regulated), 2,500 staff, AWS and Azure plus own data centre and SaaS; uses AI in pricing; backups of some data in EU regions.


**Answers**

| Q | Answer |
|---|---|
| A1 | `uk` |
| A2 | entity: `uk`<br>people: `uk` |
| A3 | `insurance` |
| A4 | staff_band: `250plus`<br>turnover_band_eur: `1bn_10bn` |
| A5 | **turnover_amount** amount: 2500000000; currency: `GBP`<br>balance_sheet_band_eur: `gt43m` |
| B1 | `uk_pra_regulated` |
| B4 | `deployer_internal`, `deployer_high_impact` |
| D1 | `personal`, `special`, `financial` |
| D2 | `gt1m` |
| D3 | **personal** primary: `uk`, `eea`; backup: `uk`, `eea`<br>**special** primary: `uk`; backup: `uk`, `eea`<br>**financial** primary: `uk`; backup: `uk` |
| D4 | `current` |
| P1 | `onprem`, `aws`, `azure`, `saas_major` |
| P2 | `us` |
| L1 | `L2` |
| L2 | **personal** level: `L1`; zones: `uk`, `eea`; platforms: `aws`, `saas_major`<br>**special** level: `L2`; zones: `uk`; platforms: `aws`, `onprem`<br>**financial** level: `L2`; zones: `uk`; platforms: `aws`, `azure` |
| R1 | `enforced` |
| T1 | `adequacy`, `uk_data_bridge`, `idta_or_addendum` |
| T2 | `none` |
| K1 | `dedicated_hsm` |
| K3 | `all` |
| O1 | `approve_log` |
| V1 | `all` |
| V2 | `yes` |
| V3 | `full` |
| V4 | `full` |
| B5 | `complete` |
| B6 | `partial` |
| X1 | `documented` |
| X2 | `managed` |
| I1 | `out_of_zone_contract` |
| I2 | `partial` |
| G1 | `exec_forum` |
| G2 | `tested` |
| W1 | `minimal` |
| W2 | `medium` |
| W3 | `compliance`, `resilience`, `cost` |

**Expected regimes in scope** (all others `not_applicable`)

| Regime | Grade | Rule | Why |
|---|---|---|---|
| `UK_GDPR` | applies | UK_GDPR.1 | UK establishment |
| `UK_OPRES` | applies | UK_OPRES.1 | PRA-regulated insurer: SS1/21 and PS21/3; impact tolerances assessed in Resilience IQ |
| `UK_PRA_SS2_21` | applies | UK_PRA_SS2_21.1 | PRA-regulated firm: outsourcing and third-party risk management |
| `UK_CTP` | advisory | UK_CTP.2 | Uses AWS and Azure, whose UK-relevant entities were designated CTPs from 13 Jul 2026; the firm's own duties remain |
| `US_CLOUD_ACT` | advisory | US_CLOUD_ACT.1 | US-parent providers |
| `US_FISA_702` | advisory | US_FISA_702.1 | US-parent providers hold data of non-US persons; status volatile |

**Required levels** — executive: personal L2, special L2, financial L2; workshop: personal L1, special L2, financial L2.

**Maturity** — executive: **67 (Managed)** over 9 required controls; workshop: **84 (Sovereign-ready)** over 19 required controls.

**Exposure (workshop)**

| Regime | RAG | Why |
|---|---|---|
| `UK_GDPR` | red | No transfer risk assessment for transfers under the IDTA or Addendum |
| `UK_PRA_SS2_21` | amber | Exit plans not rehearsed; dependency on designated CTPs only partly mapped |
| `UK_OPRES` | not_rated | No Sovereign IQ control maps to impact tolerances; assessed in Resilience IQ |

**Largest single statutory maximum:** GBP 100,000,000 — `UK_GDPR` Art. 83(5) UK GDPR; DPA 2018 s.157 (4% of GBP 2.5bn worldwide turnover); *cap, not expected fine*.

**Top gaps (workshop)**

| # | Control | Severity | Classes | Regimes | Why |
|---|---|---|---|---|---|
| 1 | `SOV.BACKUP.LOCATION` | High | special | — (level) | Special-category backups in EU regions; lawful under UK adequacy regulations, but outside the UK-only zone the board set |
| 2 | `SOV.XFER.TIA` | High | — | UK_GDPR | IDTA/Addendum transfers without a transfer risk assessment (UK GDPR Art. 46; ICO TRA guidance) |
| 3 | `SOV.KEY.CUSTODY` | Medium | special, financial | — (level) | Single-tenant HSM in the provider's data centre, not external key custody |
| 4 | `SOV.AI.DATA_LOCATION` | Medium | — | — (level) | Pricing AI runs on a US AI API under no-training terms, outside the allowed zone |
| 5 | `SOV.EXIT.PLAN` | Low | — | UK_PRA_SS2_21 | Exit plans documented but not rehearsed (SS2/21); dependency on designated CTPs, only partly mapped, ranks sixth (SOV.CONC.PROVIDER, Low) |

**Reasoning.** UK GDPR applies through the UK establishment [S15, S18]. A Solvency II insurer is PRA-regulated, so SS1/21 operational resilience (with FCA PS21/3) and SS2/21 outsourcing apply (validation rows 38–40) [S19, S20]. The UK CTP regime binds the designated providers, not the insurer; it is advisory here because the insurer uses AWS and Azure, whose UK-relevant entities were designated with effect from 13 Jul 2026 (validation rows 42–43) [S21]. EU GDPR, the EU AI Act and the Data Act are **not applicable**: no EU establishment and no EU data subjects; EU-region backups are processed by EU-established providers, whose own GDPR duties fall on them (a model limit to note for counsel). This archetype shows why there are **two headlines**: maturity is high (84, Sovereign-ready) because the controls for the chosen L1/L2 levels are largely in place, while the UK GDPR exposure is **red** because IDTA and Addendum transfers have no transfer risk assessment, which ICO guidance requires for Art. 46 transfers [S16]. Special-category backups in EU regions are lawful under the UK's adequacy regulations for the EEA, so the backup finding is against the **board's own** UK-only choice, and the finding text says so. UK operational resilience is graded but not RAG-rated: impact tolerances are assessed in Resilience IQ (section 11). Largest cap: 4% of GBP 2.5bn = GBP 100M (above GBP 17.5M), UK GDPR Art. 83(5) and DPA 2018 s.157 (validation row 37).


### ARC3_US_HEALTHTECH_EU_CUSTOMERS: US health-tech SaaS with EU and UK customers

US-headquartered clinical SaaS provider with an Irish subsidiary, 180 staff, USD 75M revenue, on AWS; HIPAA business associate; builds AI features into its product; EU customer data hosted in the EU with US backups.


**Answers**

| Q | Answer |
|---|---|
| A1 | `us` |
| A2 | entity: `us`, `eea`<br>people: `us`, `eea`, `uk` |
| A3 | `digital_infrastructure` |
| A4 | staff_band: `50_249`<br>turnover_band_eur: `50m_250m` |
| A5 | **turnover_amount** amount: 75000000; currency: `USD`<br>balance_sheet_band_eur: `unknown` |
| A6 | `IE` |
| A7 | `CA`, `NY`, `other_comprehensive` |
| B1 | `us_hipaa_covered_or_ba`, `cloud_or_data_processing_provider` |
| B2 | self_class: `not_assessed`<br>special_type: `none` |
| B4 | `deployer_internal`, `provider_ai_system` |
| D1 | `personal`, `special`, `ai_training`, `proprietary` |
| D2 | `100k_1m` |
| D3 | **personal** primary: `us`, `eea`; backup: `us`<br>**special** primary: `us`, `eea`; backup: `us`<br>**ai_training** primary: `us`; backup: `us`<br>**proprietary** primary: `us`; backup: `us` |
| D4 | `partial` |
| P1 | `aws`, `saas_major`, `ai_api_provider` |
| P2 | `us` |
| L1 | `L1` |
| L2 | **personal** level: `L1`; zones: `us`, `eea`; platforms: `aws`<br>**special** level: `L2`; zones: `us`, `eea`; platforms: `aws`, `ai_api_provider`<br>**ai_training** level: `L1`; zones: `us`; platforms: `aws`<br>**proprietary** level: `L0`; zones: —; platforms: `aws`, `saas_major` |
| R1 | `partial` |
| T1 | `eu_us_dpf`, `sccs` |
| T2 | `none` |
| K1 | `provider` |
| K3 | `most` |
| O1 | `standard` |
| V1 | `most` |
| V2 | `partial` |
| V3 | `partial` |
| V4 | `reports_only` |
| X1 | `partial` |
| X2 | `concentrated` |
| I1 | `out_of_zone_contract` |
| I2 | `none` |
| G1 | `shared` |
| G2 | `documented_untested` |
| W1 | `moderate` |
| W2 | `medium` |
| W3 | `speed`, `compliance`, `sovereignty_differentiator` |

**Expected regimes in scope** (all others `not_applicable`)

| Regime | Grade | Rule | Why |
|---|---|---|---|
| `EU_GDPR` | applies | EU_GDPR.1 | Irish subsidiary (Art. 3(1)) |
| `US_HIPAA` | applies | US_HIPAA.1 | Business associate |
| `EU_NIS2` | applies | EU_NIS2.8 | Cloud computing service provider (Annex I digital infrastructure) with an EU establishment, at least medium-sized; essential or important depends on the balance sheet. Assumes the SaaS counts as a cloud computing service (to confirm) |
| `EU_AI_ACT` | applies | EU_AI_ACT.2 | Provider of AI features, EU establishment; if the AI is part of a regulated medical device, Annex I duties apply from 2 Aug 2028 |
| `EU_DATA_ACT` | applies | EU_DATA_ACT.1 | Provider of data processing services to EU customers: Chapter VI switching duties, Art. 32 safeguards |
| `US_CCPA` | applies | US_CCPA.1 | California data subjects and revenue above USD 26.625M |
| `UK_GDPR` | likely_confirm | UK_GDPR.2 | UK data subjects without a UK establishment (Art. 3(2)) |
| `US_STATE_PRIVACY` | advisory | US_STATE_PRIVACY.1 | Customers in other states with comprehensive laws |
| `US_DOJ_DSP` | advisory | US_DOJ_DSP.3 | US person holding US health data at volume; no country-of-concern link reported, screening advised |
| `UK_CSR_BILL` | advisory | UK_CSR_BILL.1 | Digital infrastructure provider serving UK customers; Bill pending |
| `US_CLOUD_ACT` | advisory | US_CLOUD_ACT.1 | The company and its providers are US-parented |
| `US_FISA_702` | advisory | US_FISA_702.1 | US providers hold EU and UK persons' data; status volatile |

**Required levels** — executive: personal L1, special L1, ai_training L1, proprietary L1; workshop: personal L1, special L2, ai_training L1, proprietary L0.

**Maturity** — executive: **52 (Developing)** over 6 required controls; workshop: **37 (Exposed)** over 17 required controls.

**Exposure (workshop)**

| Regime | RAG | Why |
|---|---|---|
| `EU_GDPR` | red | No transfer impact assessment for SCC transfers; UK route missing lowers the transfer-basis control |
| `EU_AI_ACT` | red | No AI Act role or risk assessment |
| `EU_NIS2` | amber | Incident reporting untested; supplier visibility partial |
| `US_HIPAA` | amber | Business associate agreements with most, not all, subcontractors; incident process untested |
| `UK_GDPR` | amber | Transfer basis for UK data to the US not selected |
| `EU_DATA_ACT` | not_rated | Provider switching duties not in the v1 control catalogue |
| `US_CCPA` | not_rated | Required controls pending source (4.3 guard) |

**Largest single statutory maximum:** EUR 20,000,000 — `EU_GDPR` Art. 83(5) (EUR 20M fixed limb (4% of USD 75M is lower)); *cap, not expected fine*.

**Top gaps (workshop)**

| # | Control | Severity | Classes | Regimes | Why |
|---|---|---|---|---|---|
| 1 | `SOV.KEY.CUSTODY` | Critical | special | — (level) | Provider-managed keys for health data the business set at L2 |
| 2 | `SOV.OPS.ADMIN_ACCESS` | Critical | special | — (level) | Provider staff access under standard terms, no visibility |
| 3 | `SOV.XFER.BASIS` | High | — | EU_GDPR, UK_GDPR | EU routes in place (DPF, SCCs) but no UK route (UK Extension or IDTA/Addendum) for UK data in the US |
| 4 | `SOV.AI.GOVERNANCE` | High | — | EU_AI_ACT | AI features placed on the EU market without a role and risk assessment |
| 5 | `SOV.XFER.TIA` | High | — | EU_GDPR | No transfer impact assessment for SCC transfers (EDPB Recs 01/2020) |

**Scope confirmations:** `UK_GDPR` (High): Confirm UK GDPR Art. 3(2) targeting and whether a UK representative is needed.

**Reasoning.** The Irish subsidiary brings GDPR in under Art. 3(1) [S8]; UK data subjects without a UK establishment give `likely_confirm` for UK GDPR (Art. 3(2)). HIPAA applies because the company is a business associate (45 CFR 160.103) [S28]. CCPA applies: California data subjects and revenue above USD 26,625,000 (CPPA, from 1 Jan 2025) [S27]. NIS2: a SaaS provider is treated as a cloud computing service provider (Annex I, digital infrastructure) because the client chose that sector; at 180 staff it is at least medium-sized, and whether it is large (essential) depends on the balance sheet, which is unknown, so the grade is `applies` with the class to confirm (2.6 `medium_or_large`) [S5, S6]; whether every SaaS is a "cloud computing service" is to be confirmed in S2. The AI Act applies to the company as a provider placing AI features on the EU market (Art. 2(1)(a)) [S12]. The Data Act applies because it provides data processing services to EU customers (Chapter VI) (validation rows 24–27). The DOJ rule is advisory: the company is a US person holding US health data at volume, but no country-of-concern link is reported, so only screening is advised (28 CFR 202.205, 202.601) [S26]. Maturity is **Exposed (37)**: provider-managed keys and unapproved provider access for health data set at L2 are critical gaps, and the transfer-basis control scores 1 because EU routes exist (DPF and SCCs) but no UK route is selected for UK data in the US (the UK Extension needs separate certification; validation row 47). Executive mode reads higher (52) because L1 applies to every class there, so key custody and provider access are not required; the workshop's L2 for health data adds them. Largest cap: GDPR EUR 20M fixed limb, since 4% of USD 75M is lower; the AI Act cap depends on SME status, which is uncertain (balance sheet unknown), so it is shown as a formula.


### ARC4_SG_AU_FINANCIAL_GROUP: Singapore-headquartered banking group with Australian and Hong Kong operations

MAS-licensed bank with an APRA-regulated Australian bank (a SOCI responsible entity), an HKMA-authorised branch and a captive operations centre in India; on-premises plus AWS and Azure.


**Answers**

| Q | Answer |
|---|---|
| A1 | `sg` |
| A2 | entity: `sg`, `au`, `hk`, `in`<br>people: `sg`, `au`, `hk`, `in` |
| A3 | `banking` |
| A4 | staff_band: `250plus`<br>turnover_band_eur: `1bn_10bn` |
| A5 | **turnover_amount** amount: 4000000000; currency: `SGD`<br>balance_sheet_band_eur: `gt43m` |
| B1 | `sg_mas_licensed`, `au_apra_regulated`, `hk_hkma_authorised`, `critical_infrastructure_operator` |
| B3 | `au_soci_responsible_entity` |
| B4 | `deployer_internal`, `deployer_high_impact` |
| D1 | `personal`, `financial`, `proprietary` |
| D2 | `gt1m` |
| D3 | **personal** primary: `sg`, `au`, `hk`, `in`; backup: `sg`, `au`<br>**financial** primary: `sg`, `au`, `in`; backup: `sg`, `au`<br>**proprietary** primary: `sg`, `us`; backup: `sg` |
| D4 | `current` |
| P1 | `onprem`, `aws`, `azure`, `saas_major` |
| P2 | `us` |
| L1 | `L2` |
| L2 | **personal** level: `L2`; zones: `sg`, `au`, `hk`, `in`; platforms: `onprem`, `aws`<br>**financial** level: `L3`; zones: `sg`, `au`; platforms: `onprem`, `aws`<br>**proprietary** level: `L1`; zones: `sg`, `us`; platforms: `saas_major`, `azure` |
| R1 | `enforced` |
| T1 | `apac_contract_or_consent` |
| K1 | `external` |
| K2 | `tested` |
| K3 | `all` |
| K4 | `poc` |
| O1 | `approve_log` |
| O2 | `zone_staff_foreign_entity` |
| O3 | `isolated` |
| V1 | `all` |
| V2 | `yes` |
| V3 | `full` |
| V4 | `full` |
| B5 | `complete` |
| X1 | `documented` |
| X2 | `managed` |
| I1 | `in_zone_unclear` |
| G1 | `exec_forum` |
| G2 | `documented_untested` |
| G3 | `recognised_high` |
| H1 | `partial` |
| W1 | `minimal` |
| W2 | `high` |
| W3 | `resilience`, `compliance` |

**Expected regimes in scope** (all others `not_applicable`)

| Regime | Grade | Rule | Why |
|---|---|---|---|
| `SG_MAS_TRM` | applies | SG_MAS_TRM.1 | MAS-licensed: TRM Guidelines and the TRM Notice for its licence type |
| `SG_PDPA` | applies | SG_PDPA.1 | Singapore establishment |
| `AU_APRA_CPS230` | applies | AU_APRA_CPS230.1 | APRA-regulated; pre-existing service contracts compliant by the earlier of renewal or 1 Jul 2026 |
| `AU_APRA_CPS234` | applies | AU_APRA_CPS234.1 | APRA-regulated |
| `AU_SOCI` | applies | AU_SOCI.1 | Responsible entity for a critical infrastructure asset |
| `AU_PRIVACY` | applies | AU_PRIVACY.2 | Australian establishment above the small-business threshold |
| `HK_PDPO` | applies | HK_PDPO.1 | Hong Kong establishment; s.33 transfer restriction not in operation |
| `IN_DPDP` | applies | IN_DPDP.1 | Captive centre in India processing Indian employees' data; most duties from 13 May 2027 |
| `IN_CERT_IN` | applies | IN_CERT_IN.1 | Body corporate in India: 6-hour incident reporting |
| `HK_HKMA` | advisory | HK_HKMA.1 | HKMA-authorised; SPM modules to be sourced |
| `US_CLOUD_ACT` | advisory | US_CLOUD_ACT.1 | AWS, Azure and SaaS have US parents |
| `US_FISA_702` | advisory | US_FISA_702.1 | US-parent providers hold data of non-US persons; status volatile |

**Required levels** — executive: personal L2, financial L2, proprietary L2; workshop: personal L2, financial L3, proprietary L1.

**Maturity** — executive: **85 (Sovereign-ready)** over 8 required controls; workshop: **85 (Sovereign-ready)** over 21 required controls.

**Exposure (workshop)**

| Regime | RAG | Why |
|---|---|---|
| `SG_MAS_TRM` | amber | Incident reporting documented but untested against the 1-hour notice window (outsourcing rows pending source) |
| `AU_APRA_CPS230` | amber | Incident process untested; exit plans not rehearsed |
| `AU_APRA_CPS234` | amber | Incident process untested |
| `AU_SOCI` | amber | 12-hour reporting untested |
| `SG_PDPA` | amber | Breach notification process untested |
| `AU_PRIVACY` | amber | Breach notification process untested |
| `IN_CERT_IN` | amber | 6-hour reporting untested |
| `IN_DPDP` | not_rated | Obligations apply from 13 May 2027 (upcoming) |
| `HK_PDPO` | not_rated | No binding transfer control in operation |

**Largest single statutory maximum:** AUD 50,000,000 — `AU_PRIVACY` s.13G (AUD 50M fixed limb; 30% of adjusted turnover not computed (Australian adjusted turnover not given)); *cap, not expected fine (at least)*.

**Top gaps (workshop)**

| # | Control | Severity | Classes | Regimes | Why |
|---|---|---|---|---|---|
| 1 | `SOV.RES.LOCATION` | Critical | financial | — (level) | Account and payment data processed at the India operations centre, outside the Singapore and Australia zone the board set for L3 data |
| 2 | `SOV.IR.REPORTING` | Medium | — | SG_MAS_TRM, AU_APRA_CPS230, AU_SOCI, IN_CERT_IN, SG_PDPA | Process untested against the shortest windows (MAS 1 hour, CERT-In 6 hours, SOCI 12 hours) |
| 3 | `SOV.AI.DATA_LOCATION` | Medium | — | — (level) | Credit-decision AI runs in region, but provider training-use terms are not confirmed |
| 4 | `SOV.OPS.PERSONNEL_ZONE` | Medium | financial | — (level) | In-region provider staff, but the operating companies are foreign-parented |
| 5 | `SOV.EXIT.PLAN` | Low | — | AU_APRA_CPS230 | Exit plans documented, not rehearsed |

**Reasoning.** The group's licences drive the regimes: MAS TRM (validation row 53, FSM-N09 [S32]), APRA CPS 230 and CPS 234 (validation rows 57–58) [S33], SOCI for the Australian bank's critical infrastructure asset (validation row 60) [S35], PDPA, the Australian Privacy Act, Hong Kong's PDPO (s.33 not in operation) [S31, S34, S41], and in India both the DPDP Act (Indian employees' data at the captive centre; duties from 13 May 2027) and the CERT-In directions (6-hour reporting) [S37, S39]. HKMA is advisory until S2 sources the SPM modules (validation row 67). No EU, UK or US obligation regimes apply. No legal level floor applies: none of these regimes requires data to stay in a country (3.3, negative statement UNSOURCED until counsel confirms); the board's choice of L3 for financial data in Singapore and Australia creates the **critical** finding, because the India operations centre processes that data. Maturity is high in both modes (85) because keys, access approval, enforcement and registers are strong; exposure is **amber across the board** because the incident process is untested against the shortest windows (MAS 1 hour, CERT-In 6 hours, SOCI 12 hours). Rows for MAS outsourcing are UNSOURCED and do not score (4.3 guard). Largest cap: Australian Privacy Act s.13G, at least AUD 50M (30% of adjusted turnover not computed without Australian turnover; validation row 59); PDPA's 10% limb needs Singapore turnover, which is not given; DPDP penalties are upcoming.


### ARC5_IN_SERVICES_EU_CLIENTS: India-headquartered IT services firm with EU clients

Managed IT services provider headquartered in India, 60,000 staff, USD 2bn revenue, NYSE-listed (ADRs), subsidiaries in Germany, Ireland, the UK and the US; serves EU banks; offshore delivery from India.


**Answers**

| Q | Answer |
|---|---|
| A1 | `in` |
| A2 | entity: `in`, `eea`, `uk`, `us`<br>people: `in`, `eea`, `uk`, `us` |
| A3 | `ict_service_management_b2b` |
| A4 | staff_band: `250plus`<br>turnover_band_eur: `1bn_10bn` |
| A5 | **turnover_amount** amount: 2000000000; currency: `USD`<br>balance_sheet_band_eur: `gt43m` |
| A6 | `DE`, `IE` |
| A7 | `CA`, `other_comprehensive` |
| B1 | `ict_provider_to_eu_fs`, `us_sec_registrant` |
| B2 | self_class: `important`<br>special_type: `none` |
| B4 | `deployer_internal`, `provider_ai_system` |
| D1 | `personal`, `special`, `financial`, `proprietary` |
| D2 | `gt1m` |
| D3 | **personal** primary: `in`, `eea`, `uk`, `us`; backup: `in`<br>**special** primary: `in`; backup: `in`<br>**financial** primary: `eea`, `in`; backup: `in`<br>**proprietary** primary: `in`, `us`; backup: `in` |
| D4 | `partial` |
| P1 | `onprem`, `aws`, `azure`, `saas_major`, `ai_api_provider` |
| P2 | `us` |
| L1 | `L1` |
| L2 | **personal** level: `L1`; zones: `in`, `eea`, `uk`, `us`; platforms: `onprem`, `aws`, `azure`, `saas_major`<br>**special** level: `L1`; zones: `in`, `eea`; platforms: `onprem`<br>**financial** level: `L2`; zones: `eea`; platforms: `aws`<br>**proprietary** level: `L0`; zones: —; platforms: `onprem`, `saas_major` |
| R1 | `convention` |
| T1 | `sccs`, `idta_or_addendum` |
| T2 | `partial` |
| K1 | `byok` |
| K3 | `most` |
| O1 | `log_only` |
| V1 | `most` |
| V2 | `partial` |
| V3 | `partial` |
| V4 | `reports_only` |
| X1 | `partial` |
| X2 | `managed` |
| I1 | `out_of_zone_contract` |
| I2 | `partial` |
| G1 | `shared` |
| G2 | `documented_untested` |
| W1 | `moderate` |
| W2 | `medium` |
| W3 | `compliance`, `cost`, `speed` |

**Expected regimes in scope** (all others `not_applicable`)

| Regime | Grade | Rule | Why |
|---|---|---|---|
| `EU_GDPR` | applies | EU_GDPR.1 | German and Irish subsidiaries |
| `UK_GDPR` | applies | UK_GDPR.1 | UK subsidiary |
| `EU_NIS2` | applies | EU_NIS2.3 | Managed service provider (Annex I) with EU establishments; it assessed itself as important, but sector and size (large) point to essential: the higher class is shown, to confirm against the national transposition |
| `EU_AI_ACT` | applies | EU_AI_ACT.2 | Provides AI systems to clients from EU establishments |
| `IN_DPDP` | applies | IN_DPDP.1 | Processing in India, including Indian employees; most duties from 13 May 2027; s.17(1)(d) may exempt EU clients' data processed under foreign contracts (to confirm) |
| `IN_CERT_IN` | applies | IN_CERT_IN.1 | Body corporate in India: 6-hour reporting |
| `US_SEC_CYBER` | applies | US_SEC_CYBER.1 | SEC registrant: Form 8-K Item 1.05 |
| `US_CCPA` | applies | US_CCPA.1 | California data subjects and revenue above USD 26.625M (whether employee data is covered is to be confirmed in S2) |
| `EU_DORA` | advisory | EU_DORA.5 | ICT provider to EU financial entities: Art. 30 contract terms flow down from clients |
| `EU_DATA_ACT` | advisory | EU_DATA_ACT.2 | Customer of cloud services in the EU |
| `UK_CSR_BILL` | advisory | UK_CSR_BILL.1 | Managed service provider in the UK; Bill pending |
| `US_STATE_PRIVACY` | advisory | US_STATE_PRIVACY.1 | Employees or customers in other comprehensive-law states |
| `US_DOJ_DSP` | advisory | US_DOJ_DSP.3 | US subsidiary holds US personal data; screening advised |
| `US_CLOUD_ACT` | advisory | US_CLOUD_ACT.1 | AWS, Azure, SaaS and AI API have US parents |
| `US_FISA_702` | advisory | US_FISA_702.1 | US-parent providers hold non-US persons' data; status volatile |

**Required levels** — executive: personal L1, special L1, financial L1, proprietary L1; workshop: personal L1, special L1, financial L2, proprietary L0.

**Maturity** — executive: **67 (Managed)** over 6 required controls; workshop: **45 (Developing)** over 17 required controls.

**Exposure (workshop)**

| Regime | RAG | Why |
|---|---|---|
| `EU_GDPR` | amber | TIA, sub-processor control, data map and incident process partial |
| `UK_GDPR` | amber | As EU GDPR |
| `EU_NIS2` | amber | Incident reporting, supplier visibility and governance partial |
| `EU_AI_ACT` | amber | AI Act role and risk mapping partial |
| `US_SEC_CYBER` | amber | Incident process untested |
| `IN_CERT_IN` | amber | 6-hour reporting untested |
| `IN_DPDP` | not_rated | Obligations apply from 13 May 2027 (upcoming) |
| `US_CCPA` | not_rated | Required controls pending source (4.3 guard) |

**Largest single statutory maximum:** USD 80,000,000 — `EU_GDPR` Art. 83(5) (4% of USD 2bn worldwide turnover (USD 80M, converted at the register's dated rate); UK GDPR's 4% cap is the same percentage and is not added); *cap, not expected fine*.

**Top gaps (workshop)**

| # | Control | Severity | Classes | Regimes | Why |
|---|---|---|---|---|---|
| 1 | `SOV.RES.LOCATION` | Critical | financial | — (level) | EU bank clients' financial data processed in India although the requirement is EEA-only with held keys (L2) |
| 2 | `SOV.KEY.CUSTODY` | High | financial | — (level) | BYOK for L2 data |
| 3 | `SOV.OPS.ADMIN_ACCESS` | High | financial | — (level) | Provider access logged but not approved |
| 4 | `SOV.BACKUP.LOCATION` | High | financial | — (level) | Backups of EEA-only financial data held in India |
| 5 | `SOV.RES.REGION_LOCK` | High | — | — (level) | Location rules by convention only |

**Reasoning.** EU and UK subsidiaries bring GDPR and UK GDPR in under Art. 3(1) [S8, S15]. The firm assessed itself as an NIS2 important entity, but a managed service provider is an Annex I ICT service management entity and at its size (large) Art. 3(1)(a) points to essential; the rule shows the higher class and asks for confirmation against the national transposition [S5]. The AI Act applies as a provider (Art. 2(1)(a)) [S12]. DORA is advisory: the firm is not a financial entity, but its EU bank clients must flow Art. 30 terms (access, audit, exit assistance) down to it, which is why its weak audit-rights position (reports only) matters commercially [S7]. In India, DPDP applies (Indian employees and processing in India, duties from 13 May 2027; s.17(1)(d) may exempt EU clients' data processed under foreign contracts, status S [S47]) and CERT-In applies (validation row 66). As an SEC registrant it must disclose material incidents within four business days of the materiality determination [S30]. CCPA applies via California data subjects and revenue [S27]; whether employee data is covered is to be confirmed in S2. The **critical** gap is EU bank clients' financial data processed and backed up in India when the requirement for that class is EEA-only with held keys (L2); location rules are by convention only. Executive mode reads **Managed (67)** but the workshop reads **Developing (45)**: with one L1 level for all classes, India and the EEA are both allowed zones for every class, and keys and access are not required; the workshop's per-class L2 for EU clients' financial data reveals the gap. This is the reason executive results carry the "requirement set at one level" label (7.1) and open question Q3. Largest cap: GDPR Art. 83(5), 4% of USD 2bn (USD 80M before conversion at the register's dated rate); UK GDPR's 4% is the same percentage and is not added.

---

## 11. Boundary with Resilience IQ (D13) and Cloud IQ

| Topic | Sovereign IQ | Resilience IQ | Cloud IQ |
|---|---|---|---|
| Decision | Where data and workloads may run; regulatory exposure; sovereign architecture and migration path | How services recover and stay within impact tolerance | Cloud adoption maturity and roadmap |
| Exit | **Flags** whether a credible exit plan exists for sovereignty reasons (a change in law, a provider becoming unacceptable): `SOV.EXIT.PLAN` via X1, org level | **Owns exit testing** and exit speed per critical service (AF-TP-03), contractual exit assistance (AF-TP-01) | — |
| Concentration | **Flags** concentration and UK CTP dependency as a sovereignty and regulatory exposure: `SOV.CONC.PROVIDER` via X2 and B6 | **Owns** concentration as a recovery risk per provider (AF-TP-02, EX-10, gap G-08) | — |
| Operational resilience regimes | **Grades applicability** of `UK_OPRES`, `AU_APRA_CPS230`, `EU_DORA` and shows their obligations; rates only the controls in its catalogue (register, exit plan, concentration, audit rights, incident reporting) | **Assesses** impact tolerances, mapping, scenario testing and recovery (UK OpRes maturity, Posture F5, moves here) | — |
| Residency constraint | **Owns** it | AF-CL-03 "Do data residency or regulatory constraints limit region/provider choices?" is a flag that points to Sovereign IQ | Q8.2 "Do you have binding digital sovereignty or data-residency mandates?" is a flag that points to Sovereign IQ; Cloud IQ does not assess sovereignty |
| Incident reporting | `SOV.IR.REPORTING`: can the client meet the **regulatory notification windows** that apply | Incident response and recovery capability | — |

**Hand-offs (recommended):**
- When `SOV.EXIT.PLAN` or `SOV.CONC.PROVIDER` is below 3, the finding includes "Verify exit capability in Resilience IQ" and the offering list includes the referral (8.4).
- When Cloud IQ Q8.2 or Resilience IQ AF-CL-03 is answered "Yes", their reports recommend Sovereign IQ and do not score sovereignty themselves.
- If the same client runs both Sovereign IQ and Resilience IQ, X1 and X2 can be **prefilled** from AF-TP-03 and AF-TP-02 with the consultant's confirmation (open question Q8). No answer is scored in both tools without confirmation.

**Gate S1 condition:** the Resilience IQ and Cloud IQ owners confirm this boundary (PLAN.md gate S1).

---

## 12. What changes from today

| Item | Change | Reason |
|---|---|---|
| Two engines, two regulation models | One engine (S3), one regime registry (section 5) | Validation C6 |
| Sovereign IQ's five pillars and Posture IQ's pillar weights | Retired; replaced by levels, controls and the two headlines | D2, D3 |
| Provider nationality scored as maturity (Sovereign Q4.1); data-subject geography scored (Posture A3); "no on-prem" scored 70 (Q5.2) | Scope facts only; nationality matters only for `SOV.JUR.IMMUNITY` at L4 | H2, D3 |
| Key custody counted twice (Q6.1 in two pillars) | One effect only | Validation scorecard area 5 |
| Missing key-custody answer firing a critical probe | Unknown and blanks score 0 and are labelled; no hidden probes | H3 |
| Fixed roadmap actions and three static offerings for every client | Findings only from gaps; offerings by control (8.4) | H5 |
| Default turnover ($3B / $250M) | Removed; no quantification without turnover | D4, M2 |
| GCC regimes (KSA, UAE, Qatar) | Not in the v1 registry; S2 moves the existing records to a design folder (no code change in S1) | D1 |
| PLAN.md S7 control IDs | `SOV.OOB.MGMT` → `SOV.OPS.OOB_MGMT`; `SOV.EXIT.TESTED` → `SOV.EXIT.PLAN` (testing is Resilience IQ's); `SOV.PLATFORM.TARGET` is a playbook and offering item (sovereign landing zone or migration target), not a scored control | Clarity; D13 |
| PLAN.md S1 "Every question maps to a control" | Every **maturity** question maps to exactly one control; scope questions map to facts | Scope never scores |
| PLAN.md S3 item 6 "blank answers excluded" | Blanks score 0 and are labelled (7.1), subject to open question Q1 | "Missing answers never flatter" (scorecard area 5) |
| EUCS as a requirement | Removed; not adopted | [S14] |

---

## 13. Open questions for the owner

Each has a recommended default the owner can accept or change.

| # | Question | Options | Recommended default |
|---|---|---|---|
| Q1 | How should a blank (unanswered) maturity question count? | Exclude it and show coverage (PLAN S3 item 6) / score it 0, label "not answered", show coverage | **Score 0, label "not answered", show coverage; mark the headline "provisional" below 60% coverage.** Excluding blanks can raise the score when weak answers are skipped |
| Q2 | Quantify the largest statutory cap from the turnover band (A4) when the exact turnover (A5) is not given? | Range from band / only with exact turnover | **Show a range from the band** ("between X and Y, cap, not expected fine"); exact figure with A5; nothing if `not_given` (D4 still holds) |
| Q3 | Executive mode sets one level for all classes, which can read higher than the workshop (archetype 5). Ask L1 per sensitive class instead? | Keep one question with a label / small matrix for up to three sensitive classes (+2 minutes) | **Keep one question and the label** "requirement set at one level for all data classes"; reconsider after S4 if reference scenarios show material gaps |
| Q4 | Control weights (C 3, H 2, S 1) and the single-answer limit (20 points) | Accept / change | **Accept for S3; calibrate in S4** against the audit and reference scenarios |
| Q5 | The L0–L4 to SEAL mapping (3.4) is LTM judgement | Accept as labelled LTM mapping / drop the mapping | **Accept, labelled "LTM mapping, not the Commission's"**; review when the Commission publishes further guidance |
| Q6 | NIS2 for banks and FMIs that are DORA financial entities | Advisory / applies | **Advisory with "confirm national position"** until S2 sources NIS2 Art. 4 and the national transpositions |
| Q7 | Regimes whose content is UNSOURCED (Singapore Cybersecurity Act, HKMA, SEBI/IRDAI, FedRAMP, CRA, SecNumCloud and C5 triggers, other US state laws) | Show as advisory with "pending source" / hide until sourced | **Consultant mode only, as advisory with "pending source"; hidden in client mode** until S2 sources them |
| Q8 | Reuse Resilience IQ answers (AF-TP-02, AF-TP-03) for X2 and X1 when both tools run for one client | Prefill with confirmation / never | **Prefill with the consultant's confirmation** (S5) |
| Q9 | A SaaS provider choosing "digital infrastructure" is treated as a NIS2 cloud computing service provider | Rely on the client's sector choice / add a SaaS-specific question | **Rely on the sector choice with help text**; S2 confirms the definition |
| Q10 | Reference exchange rates for caps | ECB euro reference rates / other | **ECB euro foreign exchange reference rates**, monthly snapshot, held and dated in the claims register, 90-day review |
| Q11 | Processing location without an entity (e.g. an Indian vendor processing client data) does not trigger that country's regime in v1 | Accept for v1 / add location-based rules | **Accept for v1** and show a consultant note when D3 lists a zone with no entity; revisit in S4 |

---

## 14. Handover to S2: items not verified in this pack

Everything below must be sourced (or removed) in S2 before S3 relies on it. Status codes as in 0.1.

| Item | Status | What settles it |
|---|---|---|
| NIS2 Art. 4 and DORA's status as a sector-specific act; national transposition status per member state | UNSOURCED | NIS2 text on EUR-Lex (Art. 4, recital 28); national laws |
| NIS2 Art. 26 representative duty for non-EU digital providers | P | NIS2 Art. 26 on EUR-Lex |
| Recommendation 2003/361/EC "and/or" reading of the financial ceilings | S | Recommendation Annex Art. 2 on EUR-Lex; counsel |
| SaaS as a NIS2 "cloud computing service" | UNSOURCED | NIS2 Art. 6(30) and recitals |
| DORA Art. 2(3) exclusions; Art. 29 and 30 paragraph references | S / P | DORA on EUR-Lex |
| GDPR and UK GDPR article references in 4.3 (Art. 28, 30, 32, 33, 44–49) post-DUAA for the UK | P | EUR-Lex; legislation.gov.uk |
| AI Act dates under Regulation (EU) 2026/1744 | S | EUR-Lex OJ text |
| Data Act Art. 40 (penalties) | P | EUR-Lex |
| CRA dates and penalty tiers | UNSOURCED | EUR-Lex Regulation (EU) 2024/2847 |
| SEAL-4 wording; SEAL-3 label ("digital resilience" vs "technological autonomy"); objective weights | S | Commission framework PDF v1.2.1 and its guidance |
| No general data-location requirement in DORA, NIS2, CPS 230/234, MAS TRM (negative statement) | UNSOURCED | Counsel review (S10) |
| SecNumCloud and C5 legal triggers | UNSOURCED | Légifrance (SREN Art. 31, "cloud au centre"); SGB V § 393 |
| UK CSR Bill status after 10 Jun 2026; FSMA 2023 Part number for CTPs | S / UNSOURCED | bills.parliament.uk; legislation.gov.uk |
| UK NIS Regulations thresholds and current fine tiers | S | legislation.gov.uk; ICO |
| FISA 702 status after the 12 Jun 2026 lapse | volatile | congress.gov; ODNI |
| DOJ Data Security Program penalty amounts (IEEPA) | UNSOURCED | 28 CFR Part 202 Subpart M; 50 U.S.C. § 1705 |
| CCPA required controls (service-provider contracts, reasonable security) | UNSOURCED | Cal. Civ. Code § 1798.100, § 1798.140, § 1798.150 |
| Other US state comprehensive laws and thresholds | UNSOURCED | State statutes |
| HIPAA penalty tiers; GLBA Safeguards Rule; NYDFS Part 500 obligations and penalties; FedRAMP | UNSOURCED / P | eCFR 45 CFR 160 Subpart D; 16 CFR 314; DFS; fedramp.gov |
| MAS Outsourcing Guidelines and the banks' outsourcing notice; final text of amended TRM Notices | UNSOURCED | mas.gov.sg |
| Singapore Cybersecurity Act (CII) duties | UNSOURCED | sso.agc.gov.sg; CSA |
| Australian Privacy Act 2024 amendment penalty tiers; small-business exceptions | S | legislation.gov.au; OAIC |
| SOCI penalties | UNSOURCED | legislation.gov.au; CISC |
| India DPDP exact commencement date (13 or 14 May 2027); s.17(1)(d) wording | S | Gazette notification; DPDP Act text |
| CERT-In penalty; scope wording | UNSOURCED / P | IT Act s.70B; CERT-In directions |
| SEBI and IRDAI cloud rules; HKMA SPM modules | UNSOURCED | SEBI, IRDAI, HKMA |
| Japan APPI extraterritorial article; Korea PIPA Art. 28-8 and 64-2 numbering | UNSOURCED / S | PPC; law.go.kr |
| China PIPL Art. 3 and 38 wording; CAC volume thresholds for localisation | P / UNSOURCED | NPC text; CAC 2024 Provisions |
| NIST SP 800-53 Rev. 5 control titles used as secondary bases | P | csrc.nist.gov |
| NDAA § 889 as a hardware-provenance basis | UNSOURCED | 41 U.S.C. note; FAR 52.204-25 |
| Provider examples in P1 (S3NS, Bleu, Delos operators; AWS European Sovereign Cloud; Microsoft and Google sovereign options) | S (validation rows 29, 77–78) | Providers' official documentation (S7) |

---

## 15. Sources

All checked **13 Oct 2026**. Direct fetches of EUR-Lex, legislation.gov.uk, eCFR and most regulator sites failed from this environment (DNS resolution blocked); verification was through web-search results that quote or link the official text. The official URL is given first where one exists; secondary sources follow. "Validation row n" refers to [VALIDATION.md](../VALIDATION.md) section 7, checked the same day.

| Ref | Source | URL(s) |
|---|---|---|
| S1 | Sovereign IQ validation report, sections 7–8 (85 statements verified) | [../VALIDATION.md](../VALIDATION.md) |
| S2 | European Commission, Cloud Sovereignty Framework v1.2.1 (Oct 2025): SEAL-0 to SEAL-4, eight sovereignty objectives | https://ppc.land/content/files/2025/11/Cloud-Sovereignty-Framework.pdf (copy of the Commission document); secondary: https://ayedo.de/en/cloud-sovereignty-framework/ , https://www.blackberry.com/en/secure-communications/insights/blog/sovereignty-effective-assurance-levels-explainer |
| S3 | European Commission, "Sovereign cloud framework explained" (1 Jun 2026) | https://commission.europa.eu/news-and-media/news/sovereign-cloud-framework-explained-2026-06-01_en |
| S4 | European Commission, cloud sovereignty through strategic procurement (17 Apr 2026) | https://commission.europa.eu/news-and-media/news/commission-advances-cloud-sovereignty-through-strategic-procurement-2026-04-17_en |
| S5 | NIS2 Directive (EU) 2022/2555 (Art. 2, 3, 20, 21, 23, 26, 34; Annexes I–II) | https://eur-lex.europa.eu/eli/dir/2022/2555/oj ; secondary: https://nisd2.eu/en/wiki/scope/who-is-in-scope-full-test , https://mayerbrown.com/ja/insights/publications/2024/08/new-eu-cyber-rules-implementation-of-nis2-in-the-eu-member-states , https://advisera.com/nis2/essential-and-important-entities/ , https://www.springlex.eu/en/packages/nis2/nis2-directive/article-34/ |
| S6 | Commission Recommendation 2003/361/EC (SME definition) as applied by NIS2 | https://eur-lex.europa.eu/eli/reco/2003/361/oj ; secondary: https://ccb.belgium.be/en/node/2530 |
| S7 | DORA, Regulation (EU) 2022/2554 (Art. 2, 5, 8, 19, 28–30, 35, 50–51) | https://eur-lex.europa.eu/eli/reg/2022/2554/oj ; text reproduction: https://www.springlex.eu/en/packages/dora/dora-regulation/article-2/ , https://www.springlex.eu/en/packages/dora/dora-regulation/article-35/ |
| S8 | GDPR, Regulation (EU) 2016/679 (Art. 3, 4, 9, 10, 28, 30, 32, 33, 44–49, 83); EDPB Guidelines 3/2018 (territorial scope) | https://eur-lex.europa.eu/eli/reg/2016/679/oj ; secondary on Art. 3(2): https://www.jw.com/news/new-guidance-on-territorial-scope-of-the-gdpr/ |
| S9 | EDPB Recommendations 01/2020 on supplementary measures, v2.0 (18 Jun 2021) | https://www.edpb.europa.eu/news/news/2021/edpb-adopts-final-version-recommendations-supplementary-measures-letter-eu_en ; secondary: https://paulhastings.com/insights/client-alerts/edpb-publishes-version-2-of-the-supplemental-measures-for-international |
| S10 | EU-US Data Privacy Framework, Decision (EU) 2023/1795; General Court T-553/23 (3 Sep 2025); appeal C-703/25 P | Validation rows 32–33: https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework |
| S11 | EU adequacy decisions for the UK renewed 19 Dec 2025, until 27 Dec 2031 | https://eucrim.eu/news/commission-renewed-adequacy-decisions-for-data-transfers-to-the-uk/ ; https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-renews-uk-data-adequacy-decisions |
| S12 | AI Act, Regulation (EU) 2024/1689 (Art. 2, 3, 25, 99; Annex III), amended by Regulation (EU) 2026/1744 | https://eur-lex.europa.eu/eli/reg/2024/1689 ; https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2 ; https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-99 ; dates: https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/ , https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force |
| S13 | Data Act, Regulation (EU) 2023/2854 (Art. 23–32, 40) | https://eur-lex.europa.eu/eli/reg/2023/2854/oj ; https://www.springlex.eu/en/packages/data-act/data-act-regulation/article-29/ ; https://www.dlapiper.com/en-lu/insights/publications/2025/07/understanding-switching-termination-rights-under-the-data-act |
| S14 | EUCS status and the revised Cybersecurity Act proposal (20 Jan 2026) | https://cullen-international.com/news/2026/02/Revised-Cybersecurity-Act--CSA2----Changes-to-the-EU-cybersecurity-certification-framework.html ; https://www.eurosmart.com/wp-content/uploads/2025/07/2025_06_19_Enhancing-the-Cybersecurity-Act-to-Finalise-a-Robust-EUCS-Scheme_Final.pdf |
| S15 | ICO: maximum fines under UK GDPR and DPA 2018 | https://ico.org.uk/about-the-ico/our-information/policies-and-procedures/data-protection-fining-guidance/statutory-background/the-maximum-amount-of-a-fine-under-uk-gdpr-and-dpa-2018 |
| S16 | ICO: transfer risk assessments | https://cy.ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-data-transfer-agreement-and-guidance/transfer-risk-assessments |
| S17 | UK Extension to the DPF (SI 2023/1028) | Validation row 47: https://assets.publishing.service.gov.uk/media/650801f6fc63f60014957399/analysis_of_the_uk_extension_to_the_eu-us_data_privacy_framework.pdf |
| S18 | Data (Use and Access) Act 2025 commencement (5 Feb 2026) | Validation row 45: https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-data-use-and-access-act-2025-commencement-dates-and-planned-guidance-for-2026 |
| S19 | PRA SS1/21 operational resilience; FCA PS21/3 (SYSC 15A) | https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss ; scope (secondary): https://www.smartsuite.com/frameworks/pra-ss1-21-operational-resilience |
| S20 | PRA SS2/21 outsourcing and third-party risk management | https://www.bankofengland.co.uk/-/media/boe/files/prudential-regulation/supervisory-statement/2024/ss221-november-2024-update.pdf |
| S21 | HM Treasury CTP designations (10 Jul 2026, effective 13 Jul 2026) | https://www.gov.uk/government/news/uk-financial-system-strengthened-with-new-safeguards-for-major-technology-providers |
| S22 | UK NIS Regulations 2018 | https://www.legislation.gov.uk/uksi/2018/506 ; secondary: https://www.hsfkramer.com/notes/data/2018-07/nis-directive-and-regulations-now-in-force , https://www.robinsonbradshaw.com/newsroom/publications/619 |
| S23 | Cyber Security and Resilience (Network and Information Systems) Bill | https://bills.parliament.uk/bills/4035 |
| S24 | CLOUD Act, 18 U.S.C. § 2713, § 2703(h), § 2523; UK and Australia executive agreements | https://www.justice.gov/criminal/criminal-oia/cloud-act ; https://www.crossborderdataforum.org/new-developments-for-the-u-k-and-australian-executive-agreements-with-the-u-s-under-the-cloud-act-2/ ; https://www.covingtonblogs.com/2021/12/17/u-s-and-australia-sign-cloud-act-agreement/ |
| S25 | FISA Section 702 status | Validation row 51: https://www.npr.org/2026/06/12/nx-s1-5856291/fisa-702-surveillance-expiration-bill-pulte ; https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page ; https://www.brookings.edu/articles/a-key-intelligence-law-expires-in-april-and-the-path-for-reauthorization-is-unclear |
| S26 | DOJ Data Security Program, 28 CFR Part 202 (202.205 thresholds, 202.208 China, 202.601 countries of concern) | https://www.ecfr.gov/current/title-28/chapter-I/part-202 ; https://www.law.cornell.edu/cfr/text/28/202.601 ; https://www.law.cornell.edu/cfr/text/28/202.208 ; https://rso.iu.edu/education-outreach/doj-bulk-data.html |
| S27 | CCPA monetary thresholds and fines from 1 Jan 2025 (CPPA) | https://www.cppa.ca.gov/regulations/cpi_adjustment.html ; https://cppa.ca.gov/announcements/2024/20241217.html |
| S28 | HIPAA definitions, 45 CFR 160.103 | https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-160/subpart-A/section-160.103 ; secondary: https://www.bricker.com/insights/resources/key/HIPAA-Regulations-General-Provisions-Definitions-Covered-Entity-160-103 |
| S29 | 23 NYCRR 500.19 exemptions | https://www.law.cornell.edu/regulations/new-york/23-NYCRR-500.19 |
| S30 | SEC Form 8-K Item 1.05 | https://www.mofo.com/resources/insights/240625-u-s-sec-issues-updated-guidance-on-cybersecurity-disclosure ; https://hunton.com/insights/legal/sec-finalizes-cybersecurity-disclosure-requirements |
| S31 | Singapore PDPA s.26 transfer limitation and PDP Regulations 2021 | https://www.pdpc.gov.sg/-/media/Files/PDPC/PDF-Files/Advisory-Guidelines/the-transfer-limitation-obligation---ch-19-(270717).pdf ; https://oecd.ai/en/dashboards/policy-initiatives/personal-data-protection-act-pdpa,-section-26-transfer-limitation-obligation-and-personal-data-protection-regulations-2021 ; s.26D and s.48J: validation rows 55–56 |
| S32 | MAS Notice FSM-N09 on Technology Risk Management (9 May 2024) | https://www.mas.gov.sg/-/media/mas-media-library/regulation/notices/trpd/notice-fsm-n09/mas-notice-fsm-n09.pdf ; consultation on amendments: https://www.allenandgledhill.com/sg/publication/articles/33109/mas-consults-on-proposed-amendments-to-notices-on-technology-risk-management |
| S33 | APRA CPS 230 and CPS 234 | https://www.apra.gov.au/sites/default/files/2023-07/Prudential%20Standard%20CPS%20230%20Operational%20Risk%20Management%20-%20clean.pdf ; CPS 234 scope (secondary): https://cdn.presencis.com/regulations/apra-cps234/applicability/ |
| S34 | Australian Privacy Act 1988 (s.13G, APP 8, small-business exemption) | Validation row 59; secondary: https://iapp.org/news/a/gdpr-matchup-australias-privacy-act-1988 , https://www.allens.com.au/insights-news/insights/2022/11/Privacy-Act-changes-raise-the-bar/ |
| S35 | SOCI Act 2018 reporting and CIRMP | https://www.cisc.gov.au/resources-subsite/Documents/ncsi-guidance.pdf ; https://corrs.com.au/insights/critical-infrastructure-cyber-notification-obligations-when-do-you-need-to-comply |
| S36 | New Zealand Privacy Act 2020 (IPP 12, extraterritorial reach, offences) | https://www.privacy.org.nz/assets/New-order/Privacy-Act-2020/Privacy-Act-2020/Privacy-Act-2020-information-sheets-full-final-set-A711970.pdf ; https://fpf.org/2020/12/08/a-deep-dive-into-new-zealands-new-privacy-law-extraterritorial-effect-cross-border-data-transfers-restrictions-and-new-powers-of-the-privacy-commissioner/ |
| S37 | India DPDP Act 2023 and DPDP Rules 2025 (notified 13 Nov 2025) | https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/alerts-hub/2025/11/digital-data-protection-act-rules-notified-by-meity.pdf ; https://ksandk.com/data-protection-and-data-privacy/cross-border-data-transfers-dpdp-act-india/ ; penalty: validation row 61 |
| S38 | RBI Storage of Payment System Data (circular 6 Apr 2018; FAQ) | https://rbi.org.in/scripts/FS_FAQs.aspx?Id=130 ; https://rbi.org.in/Scripts/NotificationUser.aspx?Id=11244 |
| S39 | CERT-In Directions of 28 Apr 2022 | Validation row 66: https://trilegal.com/knowledge-repository/2022-cert-in-directions-on-reporting-cyber-incidents/ |
| S40 | Japan APPI Art. 28 | https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/asia-pacific/japan/topics/international-data-transfer ; fine: validation row 68 |
| S41 | Hong Kong PDPO s.33 (not in operation); PCPD Recommended Model Contractual Clauses (12 May 2022) | https://www.pcpd.org.hk/english/resources_centre/publications/files/guidance_model_contractual_clauses.pdf ; https://twobirds.com/en/insights/2022/china/hong-kong-pcpd-puts-forward-recommended-model-contractual-clauses |
| S42 | Korea PIPA as amended (in force 15 Sep 2023) | https://www.bkl.co.kr/en/law/insight/newsletter/5374 ; https://www.transatlanticlaw.com/content/data-privacy-update-major-amendment-to-the-personal-information-protection-act-of-korea/ |
| S43 | China PIPL Art. 66 (and Art. 40 per validation row 70) | https://prighter.com/resources/laws/chinese-pipl/articles/article-66 ; https://www.fieldfisher.com/en/insights/china%E2%80%99s-personal-information-protection-law-what-d |
| S44 | Provider sovereignty documentation (for P1 examples; S7 sources each) | Validation rows 29, 77–78 |
| S45 | Repository: Resilience IQ question bank (AF-TP-01–03, AF-CL-03, EX-10) and Cloud IQ Q8.2 | `resilience-iq/knowledge/question-bank.json`; `packages/engine-core/src/accelerators/cloud-iq/knowledge-base.json` |
| S46 | NIST SP 800-53 Rev. 5 (SA-9(5), SC-8, SC-12, SC-28, MA-4, AC-2, PS-3) — titles not re-read this session (status P) | https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final |
| S47 | India DPDP Act s.17(1)(d) (foreign data processed under contract) | https://www.dsci.in/files/content/documents/2025/cross-border-flow-of-data.pdf ; https://dpdp.myndsolution.com/wiki/act/section-17/ |

*Not legal advice. Prepared by an AI practice-lead agent for the product owner's review; qualified counsel must review every regulatory statement before external use (D9, S10).*
