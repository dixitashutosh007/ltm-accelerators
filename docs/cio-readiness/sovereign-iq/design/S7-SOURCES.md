# Sovereign IQ S7 and S7b: sources pack

**Date checked:** 26 Oct 2026. **Prepared by:** `sovereignty-compliance-lead` (AI practice-lead agent) for the product owner. **Covers:** PLAN.md S7 (Sovereign Cloud Advisory and platform playbook) and S7b (SEAL view), decisions D15–D19.

**Method.** This time, direct fetches of the Commission's and the providers' own pages worked (curl), so most statements come straight from the primary text. Status codes follow DESIGN.md §0.1:

- **V**: read in the official source on 26 Oct 2026.
- **S**: secondary sources only.
- **P**: primary URL reached, but the exact wording was not re-read.
- **UNSOURCED**: not verified; each one says what would settle it.

Every row cites a claim ID in `packages/engine-core/src/claims/claims-register.json` (new range **CLM-SOV-220 to CLM-SOV-269**; earlier IDs are existing claims). Rows marked **Judgement** are LTM's approach or classification, not a provider or Commission fact. They carry no claim ID and need the owner's acceptance.

Provider offerings are volatile (D8). Each is reviewed every 90 days; the next review is **24 Jan 2027**.

*Not legal advice. Qualified counsel must review the regulatory and jurisdictional statements before external use (D9, S10).*

---

## Task A: S7b SEAL verification

### A.1 What the Commission's documents say

Sources:
- **v1.2.1**: European Commission, *Cloud Sovereignty Framework*, Version 1.2.1, Oct. 2025. The Commission document page dates it 20 Oct 2025.
- **Guidance**: *Cloud Sovereignty Framework – Implementation guidance*, 1 Jun 2026.
- **Calculator**: *Annex – Sovereignty assessment calculator* (xlsx), 1 Jun 2026.
- **[S3]**: the 1 Jun 2026 news item.
- **[S4]**: the 17 Apr 2026 news item.

All five are listed in section 7.

| # | Item | Verified finding | Claim | Status |
|---|---|---|---|---|
| A1 | Objectives and names | SOV-1 Strategic Sovereignty; SOV-2 Legal & Jurisdictional Sovereignty; SOV-3 Data & AI Sovereignty; SOV-4 Operational Sovereignty; SOV-5 Supply Chain Sovereignty; SOV-6 Technology Sovereignty; SOV-7 Security & Compliance Sovereignty; SOV-8 Environmental Sustainability (v1.2.1 §2; the same in the Guidance) | CLM-SOV-220 | V |
| A2 | SEAL-0 | "No Sovereignty: Service, technology or operations under exclusive control of non-EU third parties, governed entirely in non-EU jurisdictions" (v1.2.1 §3) | CLM-SOV-221 | V |
| A3 | SEAL-1 | "Jurisdictional Sovereignty: EU law formally applies with limited practical enforceability; service, technology or operations under exclusive control of non-EU third parties" | CLM-SOV-221 | V |
| A4 | SEAL-2 | "Data Sovereignty: EU law applicable and enforceable, with material non-EU dependencies remaining; service, technology or operations under indirect control of non-EU third parties" | CLM-SOV-221 | V |
| A5 | SEAL-3 label and wording | v1.2.1: "**Digital Resilience**: EU law applicable and enforceable, EU actors exercising meaningful but not full influence; service, technology or operations under marginal control of non-EU third parties". The Guidance labels it "**Technological Sovereignty**" and says "EU jurisdictions apply". [S3] says "technological autonomy". [S4] says "Digital Resilience" | CLM-SOV-221, CLM-SOV-222 | V (all three labels exist; v1.2.1 is the framework text) |
| A6 | SEAL-4 wording | v1.2.1: "Full Digital Sovereignty: Technology and operations under complete EU control, subject only to EU law, with no critical non-EU dependencies". The Guidance says "subject only to EU jurisdiction". [S4] says SEAL-4 "requires a full EU supply chain, from chips to software" | CLM-SOV-221, CLM-SOV-222 | V |
| A7 | Weights, v1.2.1 | SOV-1 15%, SOV-2 10%, SOV-3 10%, SOV-4 15%, SOV-5 20%, SOV-6 15%, SOV-7 10%, SOV-8 5% (v1.2.1 §5) | CLM-SOV-223 | V |
| A8 | Weights, calculator | SOV-1 20%, SOV-2 10%, SOV-3 10%, SOV-4 15%, SOV-5 10%, SOV-6 15%, SOV-7 15%, SOV-8 5%. Answer scores "can be adapted by contracting authorities" (Guidance p. 11) | CLM-SOV-224 | V |
| A9 | How minimums work | The tender sets a minimum SEAL per objective. A tender that misses the minimum in any objective is rejected, and the Sovereignty Score ranks the compliant offers (v1.2.1 §1, §4). The overall SEAL is the lowest SEAL in any objective, and SEAL prevails over the score (Guidance pp. 9–10) | CLM-SOV-225 | V |
| A10 | Provider or tender SEALs published since | **Yes, for the Commission's own tender.** The minimum was SEAL-2. [S4] reports that the Post Telecom-led partnership (with OVHcloud and CleverCloud), STACKIT and Scaleway "reached SEAL-3", and that Proximus/S3NS "reached SEAL-2". No per-objective SEALs or Sovereignty Scores were published. These results describe the offers as bid, not general ratings of the providers | CLM-SOV-226 | V (consultant-only under D16) |
| A11 | Later version | The Commission says it "will publish an updated version". On 26 Oct 2026 the tender page listed only v1.2.1, the Guidance and the Calculator. The Guidance's lessons learnt say SEAL-4 "is not today relevant" given the dependence on chips and hardware, and that relaxing it, at least temporarily, would better separate providers | CLM-SOV-227 | V |
| A12 | Other minimum SEALs in tenders | No other published tender minimums were found. Only the Commission's own SEAL-2 minimum is sourced | — | UNSOURCED (settle: a TED notice or national tender citing the framework) |
| A13 | Criteria count | [S3] says the score uses "48 specific criteria". The Guidance says the first tender used "43 questions". These may count different things | CLM-SOV-222 (notes) | V for each statement; the difference is unexplained |

### A.2 Plain-language SEAL ladder (explainer beside question L1; also for the report's methodology)

Client-facing text. It paraphrases v1.2.1 and is not legal advice.

> **What SEAL levels are.** When the European Commission buys cloud services, it rates each provider's service from SEAL-0 to SEAL-4 on eight sovereignty objectives, such as legal, data, operational and supply chain. SEAL rates a provider's service, not your organisation. Sovereign IQ uses SEAL to show what level of provider service each kind of your data needs. *This is an LTM mapping, not the Commission's, and it is not a SEAL assessment or certification.*
>
> - **SEAL-0, no sovereignty.** The service, its technology and its operations are controlled entirely from outside the EU, under non-EU law.
> - **SEAL-1, jurisdictional sovereignty.** EU law applies on paper, but would be hard to enforce in practice, because control sits wholly outside the EU.
> - **SEAL-2, data sovereignty.** EU law applies and can be enforced, but the service still depends materially on non-EU parties, which control it indirectly.
> - **SEAL-3, digital resilience.** EU law applies and can be enforced, and EU organisations have a strong but not complete say; non-EU parties have only marginal control.
> - **SEAL-4, full digital sovereignty.** The technology and operations are wholly under EU control, subject only to EU law, with no critical dependency outside the EU.
>
> *Source: European Commission, Cloud Sovereignty Framework v1.2.1 (October 2025). Later Commission guidance calls SEAL-3 "technological sovereignty". Status as of 26 Oct 2026.*

The ladder avoids the phrases the S7b gate lint will reject ("you are SEAL", "SEAL-certified", any provider SEAL rating).

### A.3 Effect on DESIGN.md 3.4 (for the S7b build)

- Replace the SEAL table text with the v1.2.1 wording in A2–A6, and cite the Commission URL instead of the ppc.land copy [S2].
- Mark SEAL-3 and SEAL-4 as V and add the label footnote.
- Objective names: use the full v1.2.1 names in the explainer. The short names in DESIGN.md are fine in table headers.
- The mapping table (LTM judgement) is unchanged. Two notes for the owner:
  - The Commission now says SEAL-4 is not relevant today. That bears on the L4 row, which asks for SEAL-4 on SOV-2, SOV-3 and SOV-4 (decision O4).
  - Because the overall SEAL is the minimum across objectives (A9), the S7b per-objective view must never be summed into one "overall" figure for a client class without saying so.

---

## Task B: S7 placement ladder

The rung definitions are as in PLAN.md S7.

**Judgement (classification rule):** an offering counts as **R3** only if day-to-day operations and support are carried out by personnel in the zone, through an entity established in the zone. Controls that *supervise* or *approve* access from outside the zone are **R2**, even when they are labelled "sovereign".

### B.1 AWS

| Rung | Offering (official name) | What it gives | Generally available | Announced or preview | Claim | Status |
|---|---|---|---|---|---|---|
| R0 | Standard AWS Regions | Region choice only | EU (e.g. eu-central-1), UK (eu-west-2), US, SG (ap-southeast-1), AU (ap-southeast-2), IN (ap-south-1), JP (ap-northeast-1) | — | CLM-SOV-267 | V |
| R1 | AWS Control Tower Region deny controls (AWS-GR_REGION_DENY; CT.MULTISERVICE.PV.1); policies using `aws:RequestedRegion` | Blocks deployment outside the allowed Regions | All zones above | — | CLM-SOV-228 | V |
| R2 | AWS KMS external key store (XKS) | Keys held in the customer's own key manager outside AWS. KMS cannot view or manage them | Global feature; **confirm per Region and per service** | — | CLM-SOV-229 | V |
| R2 | AWS Nitro System and zero-operator-access services (KMS, EC2, Lambda, EKS, Wickr) | Operator access restricted by design and backed in the Service Terms. **No per-request customer approval workflow found** (open item O1) | Global | — | CLM-SOV-230 | V |
| R2 | Provider data boundary for standard Regions | None found under that name. AWS points to Region choice and Control Tower controls | — | — | CLM-SOV-237 (related) | UNSOURCED |
| R3 | **AWS European Sovereign Cloud** | Separate partition (aws-eusc); Region eusc-de-east-1 in Brandenburg; new account needed. Operated by EU residents in the EU, moving to EU citizens. German GmbH entities; EU-citizen managing directors and advisory board; dedicated SOC. Contracting party AWS EMEA SARL (Luxembourg); ESC Addendum (Service Terms s.1.29) | **EU** (Germany Region since 14/15 Jan 2026) | Sovereign Local Zones in Belgium, the Netherlands and Portugal: **announced, no GA date** | CLM-SOV-231, -232, -233 | V |
| R3 | AWS GovCloud (US) | Two isolated US Regions operated by US citizens on US soil | **US** | — | CLM-SOV-235 | V (eligibility rules not re-read) |
| R3 candidate | AWS Dedicated Local Zones | AWS-managed, exclusive-use infrastructure in a location the customer chooses. "Can be operated by local AWS personnel", with a clearance option. First named customer: Singapore SNDGG | Per engagement (SG reference) | — | CLM-SOV-236 | V. **Judgement**: R3 only if AWS confirms local personnel and a local entity in writing |
| R3 | None found | — | **UK, AU, IN, JP: no R3 offering** | — | CLM-SOV-237 | UNSOURCED |
| R4 | Facts only | ESC entities sit in the Amazon group. AWS says only EU operators can access customer content and metadata, and that it has made zero CLOUD Act disclosures of enterprise content stored outside the US since 2020. 18 U.S.C. § 2713 reaches providers within US jurisdiction. **Whether any AWS offering meets R4 is the owner's and counsel's call** | — | — | CLM-SOV-234, CLM-SOV-098, CLM-SOV-101 | V (provider statements); legal effect for counsel |

### B.2 Microsoft Azure (and Microsoft 365 where relevant)

| Rung | Offering (official name) | What it gives | Generally available | Announced or preview | Claim | Status |
|---|---|---|---|---|---|---|
| R0 | Azure regions | Region choice | EU (e.g. Germany West Central), UK (UK South), US, SG (Southeast Asia), AU (Australia East), IN (Central India), JP (Japan East) | — | CLM-SOV-268 | V |
| R1 | Azure Policy built-in "Allowed locations" | Blocks resources outside the allowed locations | All zones | — | CLM-SOV-238 | V |
| R2 | Azure Key Vault Managed HSM; **External Key Management with Managed HSM** | Single-tenant HSM keys. EKM keeps the root key in a customer-owned HSM outside Microsoft | Managed HSM: global. **EKM: GA announced 20 Oct 2026** (the Learn page still says preview) | — | CLM-SOV-243 | V; **supported services not listed: confirm per service** |
| R2 | Customer Lockbox for Microsoft Azure | Customer approves or rejects Microsoft engineer access to customer data | Global, for the listed services | — | CLM-SOV-240 | V |
| R2 | EU Data Boundary | Storage and processing of Customer Data and personal data in the EU, with documented exceptions | **EU** (completed 26 Feb 2025) | — | CLM-SOV-239 | V |
| R2 (upper) | **Sovereign Public Cloud** with Data Guardian, Production Touch Ledger and Sovereign Control Panel | European regions. Data Guardian adds European-resident oversight of qualifying remote access by Microsoft engineers; Touch Ledger keeps tamper-evident records | Sovereign Public Cloud: European regions | **Data Guardian and Touch Ledger: rolling out for EU and EFTA. Sovereign Control Panel: public preview at Ignite (Nov 2026)** | CLM-SOV-241, -242 | V. **Judgement**: R2, because engineers outside Europe can still access under supervision (decision O3) |
| R2 | Microsoft 365 Advanced Data Residency | Microsoft 365 data at rest in the local geography | **UK, AU, IN, JP** (not SG, not US; the EU is not one ADR geography) | — | CLM-SOV-249 | V |
| R3 | **National Partner Clouds: Bleu (France), Delos Cloud (Germany)** | Operated independently by local entities under national law; Microsoft supplies the technology | EU (FR and DE public-sector focus); **availability scope and status per partner to confirm** | Bleu SecNumCloud qualification **pending, target end 2026** | CLM-SOV-245, -246, -247 | V (model); S (Bleu status); UNSOURCED (Delos status) |
| R3 or R4 (by operator) | **Sovereign Private Cloud** (Azure Local; Microsoft 365 Local; Foundry Local) | Customer- or partner-operated, connected or disconnected | Azure Local and SQL Server on Azure Local: GA; confidential VMs on Azure Local: GA | Microsoft 365 Local: preview for approved customers. Disconnected transition: public preview. Foundry Local and GitHub Enterprise Local: GA announced for Ignite | CLM-SOV-244 | V. **Judgement**: the rung depends on who operates it, not on Microsoft |
| R3 | Azure Government | Isolated US datacentres; access limited to screened US persons | **US** | — | CLM-SOV-248 | V (eligibility not re-read) |
| R3 | None found | — | **UK, SG, AU, IN, JP: no R3 offering** (Data Guardian covers the EU and EFTA only) | — | CLM-SOV-250 | UNSOURCED |
| R4 | Facts only | Bleu is a joint venture of Orange and Capgemini (French). Delos Cloud is an SAP subsidiary (German). Microsoft is the technology supplier. A disconnected Sovereign Private Cloud is run by the customer, with Microsoft as software supplier. **R4 is the owner's and counsel's call** | — | — | CLM-SOV-245, -244 | V (facts) |

### B.3 Google Cloud (and Google Workspace where relevant)

| Rung | Offering (official name) | What it gives | Generally available | Announced or preview | Claim | Status |
|---|---|---|---|---|---|---|
| R0 | Google Cloud regions | Region choice | EU (e.g. europe-west3), UK (europe-west2), US, SG (asia-southeast1), AU (australia-southeast1), IN (asia-south1), JP (asia-northeast1) | — | CLM-SOV-269 | V |
| R1 | Organisation policy `gcp.resourceLocations`; Assured Workloads location-only data boundaries (EU, UK, US, Japan, India, Singapore, Australia and others) | Blocks resources outside the allowed locations | All zones | — | CLM-SOV-251, -253 | V |
| R2 | Cloud External Key Manager, Access Approval, Access Transparency, Key Access Justifications | External keys; customer approval and logging of Google personnel access; key-access justifications | Global; **coverage varies by service** | — | CLM-SOV-252 | V |
| R2 | Assured Workloads "EU Data Boundary and Support" / "with Access Justifications"; "Australia Data Boundary and Support"; "US Data Boundary and Support" | Location plus support-personnel controls. EU: personnel based in the EU. **AU: personnel in the US, Canada, Australia, New Zealand or the UK (not AU-only)** | EU, AU, US | — | CLM-SOV-253 | V |
| R2 (upper) | **Sovereign Controls by Partners**: France Data Boundary by S3NS, Germany Data Boundary by T-Systems, Italy Data Boundary by PSN | Residency, personnel controls, regional support, partner-supervised EKM, HSM and KAJ. Google operates the infrastructure | **EU (FR, DE, IT)** | — | CLM-SOV-255 | V. **Judgement**: R2, not R3 |
| R3 | **Google Cloud Dedicated: PREMI3NS by S3NS** | Dedicated infrastructure run by S3NS, a French-law company with three datacentres in France. SecNumCloud 3.2 | **EU (France)** | — | CLM-SOV-254, -256, CLM-SOV-069 | V |
| R3 | **Thales sovereign cloud in Germany** on Google Cloud technology | Dedicated infrastructure run by a new German entity fully owned by Thales and staffed by German personnel. Targets C5 and C3A | — | **Preview since 20 May 2026; GA aimed for the end of 2026** | CLM-SOV-258 | V (does not meet a minimum rung until GA) |
| R3 candidate | Assured Workloads US regulatory packages (FedRAMP High, IL4, IL5, ITAR, CJIS) | Personnel controls, e.g. ITAR support restricted to US persons in the US. Google-operated | **US** | — | CLM-SOV-253 | V. **Judgement**: R3 for the US zone |
| R3 or R4 (by operator) | Google Distributed Cloud (connected; air-gapped) | On-premises. Google says the air-gapped mode runs independently and cannot be remotely shut down by Google | Per engagement; **confirm per country** | — | CLM-SOV-254 | V |
| R3 | None found | — | **UK, SG, AU, IN, JP: no R3 offering** | — | CLM-SOV-259 | UNSOURCED |
| R4 | Facts only | S3NS is majority-owned and controlled by Thales, with an undisclosed Google minority stake; the Commission calls it a Thales–Google joint venture. The German entity is fully owned by Thales. The technology supplier is Google. The Commission's tender rated the Proximus/S3NS-based bid SEAL-2 overall. **R4 is the owner's and counsel's call** | — | — | CLM-SOV-257, -258, -226 | S (ownership); V (the rest) |

### B.4 Zone coverage summary (highest GA rung sourced, per provider)

| Zone | AWS | Azure | Google Cloud | Where no R3 is available: alternatives to show (fixed order, no ranking) |
|---|---|---|---|---|
| EU | R3 (European Sovereign Cloud, Germany Region) | R3 via National Partner Clouds (FR, DE; status caveats) or customer-operated Sovereign Private Cloud; Sovereign Public Cloud R2 | R3 in France (S3NS); Germany in preview; partner data boundaries R2 | — |
| UK | R2 | R2 | R2 | Another provider operated in the UK (none sourced in this pack); private cloud or on-premises; provider-delivered on-premises (Azure Local, Google Distributed Cloud) |
| US | R3 (GovCloud) | R3 (Azure Government) | R3 candidate (US regulatory packages) | — (confirm eligibility) |
| SG | R2; R3 candidate via Dedicated Local Zones | R2 | R2 | As UK; Dedicated Local Zones per engagement |
| AU | R2 | R2 | R2 (support personnel in five countries) | As UK |
| IN | R2 | R2 | R2 | As UK |
| JP | R2 | R2 | R2 | As UK |

UK, SG, AU, IN and JP alternatives naming local sovereign providers: **UNSOURCED**. Settle by sourcing each candidate provider's own documentation before naming it (open item O6).

---

## Task C: S7 playbook entries

Common to every entry:
- **Owner role** comes from the catalogue (`controls.json` `ownerRole`).
- **Service families** (D19): storage and backup (SB), databases (DB), analytics (AN), AI/ML (AI), compute and containers (CC), identity and keys (IK), collaboration SaaS (CS).
- **Approach**: every approach cell is **Judgement**.
- **Example features**: each cites its claim and status.
- **Confirm availability**: "Yes" means the feature or offering must be checked for the client's Region and services before it is recommended.
- **Application level**: specific designs need technical discovery data (Layer 3) beyond the questionnaire.

Platform keys:
- **Service level**: aws, azure, gcp.
- **Approach level**: onprem, colo, oci, ibm, eu_sovereign_provider, partner_operated_cloud, saas_major.

### C.1 `SOV.RES.REGION_LOCK`: Region enforcement (platform; owner: Head of cloud platform)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws | Deny all Regions outside the zone at organisation level; exempt global services explicitly | All | Control Tower Region deny; `aws:RequestedRegion` (CLM-SOV-228, V) | Control Tower compliance and a failed deploy test in a blocked Region | No |
| azure | Assign "Allowed locations" at management-group root; for EU classes, add the EU Data Boundary scope | All; CS via EU Data Boundary | Allowed locations (CLM-SOV-238, V); EU Data Boundary (CLM-SOV-239, V) | Azure Policy compliance report | No |
| gcp | Set `gcp.resourceLocations` at organisation or folder level; use an Assured Workloads folder for regulated classes | All | Resource locations constraint (CLM-SOV-251, V); data boundary packages (CLM-SOV-253, V) | Org policy report; Assured Workloads violations view | Yes (package per zone) |
| onprem / colo | Data-centre location register; contracts fix the site | All | — | Register matches the CMDB | No |
| oci | Tenancy Region subscription limited to in-zone Regions; for EU, consider EU Sovereign Cloud Regions | All | Oracle EU Sovereign Cloud (CLM-SOV-266, V) | Subscribed-Regions list | Yes |
| ibm | Restrict account Regions and resource-group locations | All | — (no IBM feature sourced) | Account Region report | Yes |
| eu_sovereign_provider / partner_operated_cloud | Region choice fixed in the contract and the service description | All | S3NS PREMI3NS (CLM-SOV-256, V); Bleu or Delos per contract (CLM-SOV-245, V) | Contract schedule; provider location report | Yes |
| saas_major | Tenant data-residency setting at its strictest available level | CS | M365 Advanced Data Residency (CLM-SOV-249, V); Workspace data regions, US or EU only (CLM-SOV-263, V) | Tenant residency report | Yes |

### C.2 `SOV.RES.LOCATION`: data location (stack; owner: CIO)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws / azure / gcp | Inventory the class's resources by Region. Move primary stores and processing into the zone, on the rung its level needs (B.4) | SB, DB, AN, CC, AI | Region lists (CLM-SOV-267/268/269, V); R3 options per zone (B.1–B.3) | Location report per class shows only allowed Regions | Yes (service availability differs by Region) |
| onprem / colo | Confirm site location; replicate only to in-zone sites | SB, DB, CC | — | Site register | No |
| oci / ibm | As for hyperscalers, at approach level | SB, DB, CC | — | Provider location report | Yes |
| eu_sovereign_provider / partner_operated_cloud | Migrate the class to the provider's in-zone Regions; check that the needed managed services exist there | SB, DB, AN, CC, AI | CLM-SOV-256, -258 (V) | Location report; service catalogue check | Yes |
| saas_major | Set the tenant geography; move existing data with the vendor's migration route | CS | CLM-SOV-249, -263 (V) | Tenant data-location page | Yes |

### C.3 `SOV.KEY.CUSTODY`: key custody (platform, stack; owner: CISO)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws | L2+: KMS keys in an external key store backed by the client's HSM; CMKs for every service holding the class | IK, then SB, DB, AN | KMS XKS (CLM-SOV-229, V) | Key ownership attestation; revocation test makes test data unreadable | Yes (XKS support per service) |
| azure | L2+: Managed HSM keys; External Key Management where key hardware must sit outside Microsoft | IK, then SB, DB, AN | Managed HSM and EKM, GA 20 Oct 2026 (CLM-SOV-243, V) | As above | **Yes: supported services not published** |
| gcp | L2+: Cloud EKM keys; Key Access Justifications policies | IK, then SB, DB, AN | Cloud EKM, KAJ (CLM-SOV-252, V) | As above, plus a KAJ deny test | Yes |
| onprem / colo | Customer-owned HSMs; key ceremony and split knowledge | IK | — | HSM audit log; revocation test | No |
| oci / ibm | Customer-managed or customer-held key options per provider | IK | — (no OCI or IBM key feature sourced; O7) | Provider key attestation | Yes |
| eu_sovereign_provider / partner_operated_cloud | Provider or third-party HSM with keys under client control; partner-supervised key management where offered | IK | Sovereign Controls by Partners EKM and HSM (CLM-SOV-255, V) | Attestation; revocation test | Yes |
| saas_major | Customer-controlled root keys or client-side encryption for the class | CS | M365 Customer Key (CLM-SOV-265, P); Workspace client-side encryption (CLM-SOV-264, P) | Revocation or decryption-denial test on test content | Yes |

Context for every row: key custody limits what a provider can technically produce; it does not remove a foreign legal order (CLM-SOV-101, S; CLM-SOV-098, V).

### C.4 `SOV.XFER.BASIS`: transfer basis (application; owner: DPO)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| All platforms | One transfer register per flow, including remote support access from abroad. Records the basis: adequacy (CLM-SOV-201, -205), EU–US DPF or UK bridge (CLM-SOV-013, -082), SCCs or the IDTA/Addendum with a TIA (CLM-SOV-011, -080, -081), APAC routes (CLM-SOV-131, -145, -175) | All | Provider DPAs and sub-processor lists as inputs | Every flow in the register has a basis and a review date | No |
| aws / azure / gcp / saas_major | Include provider support-access locations: support personnel controls (CLM-SOV-253) and access supervision (CLM-SOV-242) change the flows, not the need for a basis | IK, CS | As cited | Register reconciles with the provider's support-location terms | Yes |

### C.5 `SOV.OPS.ADMIN_ACCESS`: provider access approval (platform, SaaS; owner: CISO)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws | Rely on zero-operator-access services for the class and log all access paths. No per-request approval workflow was found, so record the gap (O1) | CC, IK, SB | Nitro and zero operator access (CLM-SOV-230, V) | Monthly access log review; services used are on AWS's zero-operator-access list | Yes |
| azure | Customer Lockbox on all supported services; for EU and EFTA, Data Guardian when available | All | Customer Lockbox (CLM-SOV-240, V); Data Guardian rolling out (CLM-SOV-242, V) | Lockbox request log reviewed monthly; zero unapproved access | Yes (Lockbox service list; Data Guardian rollout) |
| gcp | Access Approval and Access Transparency on all supported services; KAJ for key use | All | CLM-SOV-252 (V) | Approval and transparency logs reviewed monthly | Yes |
| onprem / colo | Vendor remote access by ticket, time-boxed and recorded | CC | — | Privileged-access logs | No |
| oci / ibm / eu_sovereign_provider / partner_operated_cloud | Contractual approval of provider access, with logs available to the client; partner-operated sovereign clouds for L3 | All | CLM-SOV-245, -255, -256 (V) | Access log review; contract clause | Yes |
| saas_major | Vendor customer-lockbox-type controls where offered | CS | — (Microsoft 365 Customer Lockbox not re-read; O7) | Request log review | Yes |

### C.6 `SOV.OPS.PERSONNEL_ZONE`: in-zone operations (platform; owner: Head of cloud platform with Procurement)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws | Move the class to R3: the European Sovereign Cloud (EU) or GovCloud (US). Elsewhere, Dedicated Local Zones with written confirmation of local personnel, or an alternative from B.4 | All | CLM-SOV-231, -232, -235, -236 (V) | Provider attestation of in-zone personnel and local entity (ESC: ESC-SRF assurance reports via AWS Artifact, per the FAQ) | Yes |
| azure | R3 in the EU through a National Partner Cloud, or a customer-operated Sovereign Private Cloud; Azure Government (US). Sovereign Public Cloud alone is R2 (O3) | All | CLM-SOV-244, -245, -248 (V) | Partner attestation; operating contract | Yes (partner scope and status) |
| gcp | R3 through Google Cloud Dedicated (S3NS in France; Thales Germany after GA); US regulatory packages (US). Partner data boundaries alone are R2 | All | CLM-SOV-253, -256, -258 (V) | Partner attestation; qualification certificate | Yes |
| onprem / colo | Own staff or in-zone contractors; vendor support from inside the zone | CC | — | HR and contract records | No |
| oci | EU Sovereign Cloud for EU classes | All | CLM-SOV-266 (V) | Provider attestation | Yes |
| ibm / eu_sovereign_provider / partner_operated_cloud | Confirm the operating entity, the personnel location and the support chain in the contract | All | — | Attestation; contract | Yes |
| saas_major | Usually not available for in-zone-only operations. Consider an on-premises or partner-operated equivalent for L3 classes | CS | Microsoft 365 Local, preview (CLM-SOV-244, V) | Vendor attestation | Yes |

### C.7 `SOV.BACKUP.LOCATION`: backup location (stack; owner: Head of infrastructure)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws / azure / gcp | Backup vaults, replicas and DR Regions inside the zone; cross-Region copy only to in-zone Regions; independent keys | SB, DB | Region guardrails (CLM-SOV-228, -238, -251, V) | Restore test from the in-zone copy; location report of backup vaults | Yes (paired or DR Region inside the zone) |
| onprem / colo | Second in-zone site or in-zone backup provider | SB | — | Restore test | No |
| oci / ibm / eu_sovereign_provider / partner_operated_cloud | DR Region within the zone. Example: the planned S3NS and Thales Germany cross-border DR, both EU | SB, DB | CLM-SOV-258 (V; preview) | Restore test | Yes |
| saas_major | Third-party backup stored in the zone | CS | — | Restore test; backup location report | Yes |

### C.8 `SOV.SAAS.SUBPROCESSOR`: sub-processor control (application; owner: Procurement)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| All platforms | Sub-processor register for critical providers: advance notice and right to object, per GDPR Art. 28 (CLM-SOV-004, P) and the UK equivalent (CLM-SOV-083, P); DORA register (CLM-SOV-038, V) where it applies | All | Provider sub-processor lists and notification subscriptions | Register complete for critical SaaS and cloud; notifications subscribed | No |

### C.9 `SOV.EXIT.PLAN`: exit plan (platform, application; owner: CIO)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws / azure / gcp | Containers and open data formats; an exit plan per critical service; use the Data Act switching rights (CLM-SOV-060, -061, V). Hand off exit testing to Resilience IQ (D13) | CC, DB, SB, AN | — | Exit plan reviewed; partial migration rehearsal (Resilience IQ) | No |
| onprem / colo / oci / ibm / eu_sovereign_provider / partner_operated_cloud | As above. Note that partner-operated clouds on hyperscaler technology keep a technology dependency on that hyperscaler | All | CLM-SOV-245, -256 (V) | As above | No |
| saas_major | Export formats and the export procedure documented and tested | CS | — | Export test | No |
| DORA entities | Exit strategies for ICT services supporting critical or important functions (CLM-SOV-039, V) | — | — | As above | No |

### C.10 `SOV.AI.DATA_LOCATION`: AI data location (stack; owner: Head of data and AI)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws | In-Region model invocation or geographic inference profiles inside the zone; no global profiles for zoned classes | AI | Bedrock cross-Region inference (CLM-SOV-260, V) | Inference endpoint and log locations are in the zone; profile list reviewed | Yes (model availability per Region) |
| azure | Regional or Data Zone deployments matching the zone; no Global deployment types for zoned classes. The APAC data zone is multi-country | AI | Foundry deployment types (CLM-SOV-261, V) | Deployment-type inventory | Yes |
| gcp | Regional endpoints only; no global endpoint for zoned classes; check the training restriction in the terms | AI | Data residency and training restriction (CLM-SOV-262, V) | Endpoint inventory; log location | Yes |
| onprem / colo / partner_operated_cloud | Local or disconnected model hosting | AI | Foundry Local and Google Distributed Cloud (CLM-SOV-244, -254, V) | Endpoint inventory | Yes |
| oci / ibm / eu_sovereign_provider | In-zone model hosting; contract bars training on client data | AI | — | Contract clause; endpoint location | Yes |
| saas_major | Vendor AI features: confirm the processing geography and training terms per feature | CS, AI | — (Microsoft 365 Copilot in-country processing not sourced; O7) | Vendor documentation per feature | Yes |

### C.11 `SOV.OPS.OOB_MGMT`: out-of-band management (on-premises and colocation only; owner: Head of infrastructure)

| Platform | Approach (Judgement) | Families | Example features | Verification | Confirm availability |
|---|---|---|---|---|---|
| onprem / colo | Isolated management network; vendor call-home disabled or proxied and approved; BMC firmware inventory | CC | — | Network scan shows no unmanaged outbound management traffic | No |
| All other platforms | Not applicable (catalogue `onlyIfPlatforms`). The provider-operated equivalent is covered by `SOV.OPS.ADMIN_ACCESS` | — | — | — | — |

### C.12 `SOV.JUR.IMMUNITY`: jurisdictional immunity (platform; owner: CIO with General Counsel)

| Platform | Approach (Judgement) | Families | Example features (facts only) | Verification | Confirm availability |
|---|---|---|---|---|---|
| aws / azure / gcp | Sovereign landing zone on R4. **The ladder states facts only; whether any hyperscaler-linked offering meets R4 is the owner's and counsel's call (S10)** | All | CLM-SOV-234, -245, -257, -258, CLM-SOV-098 | Landing zone conformance report; counsel's written view on jurisdiction | Yes |
| onprem / colo | Customer-operated, optionally disconnected, with in-zone suppliers | All | — | Conformance report; supplier jurisdiction review | No |
| eu_sovereign_provider | A provider with no parent outside the zone: confirm ownership from registry filings | All | Commission tender results for STACKIT, Scaleway and the OVHcloud consortium are tender-specific (CLM-SOV-226, V; consultant-only under D16) | Ownership and control evidence; counsel view | Yes |
| partner_operated_cloud | Partner with no foreign-parent control. Record the technology supplier separately | All | CLM-SOV-245, -257, -258 | As above | Yes |
| oci / ibm / saas_major | Facts per provider; counsel view | All | CLM-SOV-266 (V) | As above | Yes |

---

## 5. Contradictions with PLAN.md and DESIGN.md

| # | Where | What the plan or design says | What the sources show | Claim |
|---|---|---|---|---|
| X1 | PLAN S7b "Not in scope (D16)"; D16 | "The Commission has not published provider scores" | The Commission published the SEAL levels reached by the four awarded bids (three at SEAL-3; Proximus/S3NS at SEAL-2), 17 Apr 2026. These are tender-specific and not per objective; no Sovereignty Scores were published | CLM-SOV-226 |
| X2 | DESIGN 3.4; CLM-SOV-067 notes | SEAL-3 label unsettled; SEAL-4 wording status S | v1.2.1 says "Digital Resilience"; the Guidance says "Technological Sovereignty"; the full SEAL-4 text is now V. The DESIGN SEAL-3 and SEAL-4 rows are abbreviated | CLM-SOV-221, -222 |
| X3 | DESIGN 3.4 [S2] | Source is a ppc.land copy | The Commission hosts the PDF itself; replace the reference | CLM-SOV-220 |
| X4 | CLM-SOV-067 notes | Weights "per most secondary sources … (one source differs)" | v1.2.1 weights confirmed. The Commission's own calculator uses different weights, which is the "differing" source | CLM-SOV-223, -224 |
| X5 | PLAN S7 R3 examples | "Microsoft's sovereign cloud offerings" listed as R3 | Sovereign Public Cloud supervises access from outside Europe (Data Guardian, still rolling out); by the R3 definition it is R2. National Partner Clouds and customer-operated Sovereign Private Cloud are the R3 options | CLM-SOV-242, -245 |
| X6 | PLAN S7 R3 examples | Google "partner-operated clouds (for example S3NS)" | Two different S3NS products: "France Data Boundary by S3NS" (Sovereign Controls by Partners, Google-operated, R2) and PREMI3NS (Google Cloud Dedicated, S3NS-operated, R3). The matrix must name the product, not just the partner | CLM-SOV-255, -256 |
| X7 | PLAN S7 R2 example for Azure | "options per service, confirm with Microsoft documentation" | External Key Management with Managed HSM went GA on 20 Oct 2026; per-service coverage is still unpublished | CLM-SOV-243 |
| X8 | PLAN S7 item 3; zones | Ladder defined for each zone | No hyperscaler R3 was found for UK, AU, IN or JP, nor for SG outside AWS Dedicated Local Zones. The matrix will show alternatives for most non-EU, non-US zones | CLM-SOV-237, -250, -259 |
| X9 | VALIDATION.md row 77 | "operated by German-law entities" | Correct, but the contracting party for EU customers is AWS EMEA SARL (Luxembourg) | CLM-SOV-232 |
| X10 | DESIGN 3.4 mapping, L4 row | SEAL-4 on SOV-2, SOV-3 and SOV-4 | The Commission's guidance says SEAL-4 is not relevant today and may be relaxed. The mapping is not wrong, but L4 can rarely be shown as achievable on that basis | CLM-SOV-227 |

## 6. Open items

| # | Item | What would settle it |
|---|---|---|
| O1 | AWS per-request customer approval of operator access (an equivalent of Lockbox or Access Approval) | AWS documentation or written confirmation; until then, `SOV.OPS.ADMIN_ACCESS` on AWS relies on zero-operator-access design |
| O2 | GA dates for AWS sovereign Local Zones (BE, NL, PT) | AWS announcement (90-day review) |
| O3 | Rung for Microsoft Sovereign Public Cloud with Data Guardian, and for Google partner data boundaries | Owner decision D-S7-2 below |
| O4 | L4 row of the SEAL mapping, given the Commission's SEAL-4 lessons learnt | Owner decision D-S7b-3 below |
| O5 | Bleu SecNumCloud status; Delos Cloud GA and assurance status | ANSSI qualified-provider list (cyber.gouv.fr was not reachable); Delos or BSI documentation |
| O6 | Local sovereign providers for UK, SG, AU, IN and JP alternatives | Source each provider's own documentation before naming it |
| O7 | Approach-level product examples not sourced: OCI and IBM key options, IBM sovereign offerings, Microsoft 365 Customer Lockbox, Microsoft 365 Copilot in-country processing | Fetch each provider page; add claims |
| O8 | Eligibility for AWS GovCloud, Azure Government and the Google US regulatory packages (who may buy them) | Provider eligibility pages |
| O9 | Data Guardian wording conflict: Learn (12 Aug 2026) says Microsoft region-resident personnel approve; the 20 Oct 2026 post says a trusted EU partner oversees | Updated Learn page or Microsoft confirmation |
| O10 | Other public tenders setting minimum SEALs (input for question L3) | TED or national tender notices citing the framework |
| O11 | S3NS ownership split (secondary only) | Thales or S3NS registry filing |

## 6a. Decisions for the owner

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D-S7b-1 | D16 after X1 (the Commission published tender SEALs) | (a) keep them out entirely; (b) show the Commission's published tender results as dated facts, consultant-only, with scope stated; (c) show them to clients after counsel | **(b)**. Keep D16's "LTM never rates providers". The lint still blocks any LTM-authored provider SEAL |
| D-S7b-2 | SEAL-3 label on screen | v1.2.1 "Digital Resilience"; Guidance "Technological Sovereignty" | **v1.2.1 wording, with a footnote** giving the later label |
| D-S7b-3 | L4 mapping row (X10) | Keep SEAL-4; or align L4 to SEAL-3 plus SOV-2 SEAL-4 | **Keep for now and add a note**; revisit when the updated framework is published |
| D-S7b-4 | Show objective weights | Show v1.2.1 weights; show both; show none | **None in the client view.** Sovereign IQ does not compute Sovereignty Scores |
| D-S7-1 | Announced or preview offerings in the matrix | Hide; or show as "announced, not GA" | **Show, labelled.** They never satisfy a minimum rung until GA |
| D-S7-2 | R3 test (X5, X6) | Count supervised-access offerings as R3; or R3 only for in-zone operation by a local entity | **R3 only for in-zone operation** (rule in Task B) |
| D-S7-3 | R4 wording | As PLAN.md | **Facts-only columns** (ownership, operator, operator's law, technology supplier), with the fixed line "Whether this meets R4 is for your counsel" |
| D-S7-4 | US-zone R3 | Treat government clouds as R3 for US classes | **Yes, with an eligibility caveat** (O8) |

## 7. Sources (all checked 26 Oct 2026)

| Source | URL |
|---|---|
| European Commission, Cloud Sovereignty Framework v1.2.1 (document page and PDF) | https://commission.europa.eu/document/09579818-64a6-4dd5-9577-446ab6219113_en ; https://commission.europa.eu/document/download/09579818-64a6-4dd5-9577-446ab6219113_en?filename=Cloud-Sovereignty-Framework.pdf |
| European Commission, Implementation guidance (1 Jun 2026) | https://commission.europa.eu/document/download/2ad80a48-166f-4c77-a513-80c53ca2a128_en?filename=Cloud%20Sovereignty%20Framework%20-%20Implementation%20guidance.pdf |
| European Commission, Sovereignty assessment calculator (1 Jun 2026) | https://commission.europa.eu/document/download/3acb8fe8-8a4a-4339-ae74-f56138d913d1_en?filename=Annex%20-%20Sovereignty%20assessment%20calculator.xlsx |
| European Commission, tender opportunities (DG DIGIT) | https://commission.europa.eu/funding-and-tenders/find-calls-tender/tender-opportunities-department/tender-opportunities-digital-services_en |
| [S4] Commission news, 17 Apr 2026 | https://commission.europa.eu/news-and-media/news/commission-advances-cloud-sovereignty-through-strategic-procurement-2026-04-17_en |
| [S3] Commission news, 1 Jun 2026 | https://commission.europa.eu/news-and-media/news/sovereign-cloud-framework-explained-2026-06-01_en |
| AWS: European Sovereign Cloud launch blog; ESC FAQ; digital sovereignty; GovCloud; Dedicated Local Zones; KMS XKS; Control Tower Region deny; IAM deny-Region example; Regions; Bedrock cross-Region inference | https://aws.amazon.com/blogs/aws/opening-the-aws-european-sovereign-cloud/ ; https://aws.eu/faq/ ; https://aws.amazon.com/compliance/digital-sovereignty/ ; https://aws.amazon.com/govcloud-us/ ; https://aws.amazon.com/blogs/security/aws-digital-sovereignty-pledge-announcing-new-dedicated-infrastructure-options/ ; https://aws.amazon.com/dedicatedlocalzones/ ; https://docs.aws.amazon.com/kms/latest/developerguide/keystore-external.html ; https://docs.aws.amazon.com/controltower/latest/userguide/region-deny.html ; https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html ; https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html |
| Microsoft: blog 20 Oct 2026; blog 16 Jun 2025; Learn pages (Microsoft Sovereign Cloud, Sovereign Public Cloud capabilities, Data Guardian, External Key Management, National Partner Clouds, Sovereign Private Cloud, EU Data Boundary, Customer Lockbox, built-in policies, Azure Government, M365 ADR, regions list, Foundry deployment types, Customer Key); EU Data Boundary completion | https://blogs.microsoft.com/blog/2026/10/20/advancing-digital-sovereignty-with-greater-control-and-choice/ ; https://blogs.microsoft.com/blog/2025/06/16/announcing-comprehensive-sovereign-solutions-empowering-european-organizations/ ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/microsoft-sovereign-cloud ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/public/sovereign-public-cloud-capabilities ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/public/data-guardian ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/public/external-key-management ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/partner/overview-national-partner-clouds ; https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/private/overview-sovereign-private-cloud ; https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-learn ; https://blogs.microsoft.com/on-the-issues/2025/02/26/microsoft-completes-landmark-eu-data-boundary-offering-enhanced-data-residency-and-transparency/ ; https://learn.microsoft.com/en-us/azure/security/fundamentals/customer-lockbox-overview ; https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies ; https://learn.microsoft.com/en-us/azure/azure-government/documentation-government-welcome ; https://learn.microsoft.com/en-us/microsoft-365/enterprise/advanced-data-residency ; https://learn.microsoft.com/en-us/azure/reliability/regions-list ; https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/deployment-types ; https://learn.microsoft.com/en-us/purview/customer-key-overview |
| Google: sovereign cloud; Assured Workloads control packages; Sovereign Controls by Partners; resource locations; Cloud EKM; Access Approval; Access Transparency; KAJ; regions; Distributed Cloud air-gapped; data residency; data governance; Workspace data regions; Workspace CSE | https://cloud.google.com/sovereign-cloud ; https://cloud.google.com/assured-workloads/docs/control-packages ; https://cloud.google.com/sovereign-controls-by-partners/docs/overview ; https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations ; https://cloud.google.com/kms/docs/ekm ; https://cloud.google.com/assured-workloads/access-approval/docs/overview ; https://cloud.google.com/assured-workloads/access-transparency/docs/overview ; https://cloud.google.com/assured-workloads/key-access-justifications/docs/overview ; https://cloud.google.com/compute/docs/regions-zones ; https://cloud.google.com/distributed-cloud-air-gapped ; https://cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency ; https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance ; https://support.google.com/a/answer/7630496?hl=en ; https://support.google.com/a/answer/10741897?hl=en |
| Thales / S3NS: Germany press release (20 May 2026); S3NS site; Thales 2022 release (via search) | https://www.googlecloudpresscorner.com/2026-05-20-Thales-Announces-Strategic-Partnership-with-Google-Cloud-to-Launch-a-New-Sovereign-Cloud-in-Germany ; https://www.s3ns.io/en ; https://www.thalesgroup.com/en/news-centre/press-releases/thales-introduces-s3ns-partnership-google-cloud-and-unveils-its-0 |
| Oracle EU Sovereign Cloud | https://www.oracle.com/cloud/eu-sovereign-cloud/ |
| Secondary: Bleu qualification status | https://next.ink/260765/secnumcloud-bleu-vise-desormais-une-qualification-pour-la-fin-dannee/ ; https://www.leto.legal/news/bleu-secnumcloud-qualification-reportee-fin-2026 |

*Not legal advice. Prepared by an AI practice-lead agent for the product owner's review. Qualified counsel must review the regulatory and jurisdictional statements before external use (D9, S10).*
