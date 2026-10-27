# Sovereign IQ S10: transfer impact assessment (EU and UK personal data held in India)

**Status: DRAFT FOR COUNSEL, 26 Oct 2026.** Prepared by `sovereignty-compliance-lead` (Claude, AI) acting in a counsel role at the owner's request. It is a structured legal review against primary sources, not advice from a qualified lawyer, and it creates no lawyer-client relationship. Under EDPB Recommendations 01/2020 (footnote 54), the exporter's legal representative should endorse the final report. The transfer instrument is **deferred to LTM's go-live**: LTM's privacy office confirms it then. Until then this is a working draft. Companion document: [S10-data-protection.md](S10-data-protection.md).

Source status: **V** means the primary text was read on 26 Oct 2026. **S** means a secondary source or an unofficial reproduction was read on that date. **P** means a primary source is cited but its text was not re-read in this review. **UNSOURCED** means no source was found.

## 1. The transfer (EDPB step 1)

| Item | Detail |
|---|---|
| System | Sovereign IQ v4 (engine 4.6.0), AWS account 223833501993, region ap-south-1 (Mumbai). `SovereignIqAssessment` (DynamoDB), CloudWatch Logs |
| Personal data transferred | (a) The respondent's email: the consultant who runs the assessment, usually an LTM employee. It is in the record (`respondentEmail`) and in the API access log (`user`). (b) The source IP address in the API access log (`ip`). (c) Possibly names or opinions about client staff, if a consultant writes them in the notes (labelled "Do not record personal details about individuals") or in the AI focus note (up to 300 characters; emails and the client name are redacted, other names are not) |
| Not personal data | Client organisation name and sector, the answers (footprint, entities, data kinds and locations, platforms, turnover), the computed result. This is commercially confidential organisation data, protected by confidentiality terms, not by GDPR Chapter V |
| Data subjects | LTM consultants in the EU and UK. Exceptionally, client staff named in free text |
| Volume | Small: one email per assessment, and one IP and email per API request. No special-category data is needed |
| Purpose | Producing the assessment and its report; security and operation of the service (logs) |
| Format in India | Readable by the application (in the clear to LTM). DynamoDB and CloudWatch encrypt at rest by default with AWS-managed keys; `amplify/backend.ts` configures no customer-managed key (checked 26 Oct 2026). TLS in transit |
| Retention | Record: 24 months after the last change, then DynamoDB TTL deletes it. Expired records are hidden at once (`isLive`). Deleted on request by the respondent or an Admin. API access logs and the four Sovereign Lambda log groups: one year. No point-in-time recovery is configured, so there are no backups to purge |
| Onward flow | When the AI narrative is on (S9, not yet switched on): the redacted engine result and the redacted focus note go to Claude in Amazon Bedrock on the India geographic profile from ap-south-1, processed in Mumbai or Hyderabad (D29, 27 Oct 2026; D28 had eu-west-1). The prompt and output are logged in CloudWatch ap-south-1 for one year and kept in the record (`narrativeJson`) |
| Who exports and who imports | **Open, for LTM's privacy office at go-live.** The likely shape: the LTM EU or UK employing entity (exporter, controller) makes data available to the LTM entity that holds the AWS account (importer), with AWS as processor. If the Indian entity is itself the controller and the consultant enters only their own email, that part may not be a "transfer" (EDPB Guidelines 05/2021, para. 9 and footnote 15: a data subject is not an exporter). GDPR would still apply directly (V). The ICO likewise treats a flow as restricted only when the recipient is a separate legal entity (S). Either way, the access risk assessed below is the same |

## 2. Transfer tool (step 2)

- India has no EU adequacy decision and is not covered by UK adequacy regulations (P). An Article 46 tool is needed.
- **Expected instrument:** an intra-group data transfer agreement incorporating the EU SCCs (Commission Implementing Decision (EU) 2021/914, Module 1 or 2), with the UK Addendum or the IDTA for UK data (P). This TIA supports Clause 14 (local laws and practices, with a documented assessment) and Clause 15 (the importer's duties when a government seeks access: notify, challenge, minimise, document) (P).
- **Deferred:** LTM's privacy office confirms the signed instrument, the module and the parties at LTM's go-live. This is not an action for now.
- No derogation (Art. 49) is relied on. The transfers are repeated and systematic, so Art. 49 would not fit.

## 3. Indian law and practice on public-authority access (step 3)

| # | Law | Who can access, and on what grounds | Authorisation, oversight, notice | Reaches this data? | Status |
|---|---|---|---|---|---|
| L1 | **IT Act 2000 s.69**, with the IT (Procedure and Safeguards for Interception, Monitoring and Decryption of Information) Rules 2009 | The Central or a State Government, or a specially authorised officer, may direct an agency to intercept, monitor or decrypt any information in any computer resource. Grounds: sovereignty, integrity, defence, security of the State, friendly relations, public order, preventing incitement to a cognisable offence, or investigating any offence. Subscribers, intermediaries and persons in charge of the resource must assist and decrypt (s.69(3)), on pain of up to 7 years' imprisonment (s.69(4)) | Written order with reasons, from the Union or State Home Secretary; emergency orders must be confirmed within days. Review is by an executive committee (Cabinet Secretary level), with no prior judicial authorisation. The person concerned is not notified and the intermediary must keep the order confidential. Ten central agencies were authorised in December 2018 | Yes: LTM India is "in charge of" the computer resource, and AWS India hosts it | S (UNODC SHERLOC, SFLC, CIS India; indiacode.nic.in refused the fetch) |
| L2 | **IT Act s.69B**, with the 2009 Traffic Data Rules | A government agency authorised by notification may monitor and collect *traffic data* (data identifying a person, computer or location) "to enhance cyber security". Intermediaries must assist; refusal carries up to 3 years | Order under the Rules; executive only | Yes: IPs and access-log metadata are traffic data | S |
| L3 | **CERT-In Directions of 28 Apr 2022** (IT Act s.70B(6)) | Every body corporate, service provider and data centre must report listed incidents within 6 hours (direction ii). It must "take action or provide information or any such assistance" when CERT-In orders it, in the format and time CERT-In sets, "up to and including near real-time" (iii). It must keep ICT logs securely for a rolling 180 days within Indian jurisdiction and provide them with an incident report or on order (iv). Cloud and data-centre providers must keep validated subscriber records for 5 years (v) | Direction by CERT-In; no judicial step; no notice to data subjects | **Yes, and the most likely route in practice:** after an incident, the access logs (emails, IPs) would be given to CERT-In | **V** (cert-in.org.in PDF) |
| L4 | **DPDP Act 2023 s.36**, with DPDP Rules 2025 r.23 and the Seventh Schedule | The Central Government may require any Data Fiduciary or intermediary to furnish "such information as it may call for", for listed purposes. These include State use in the interest of sovereignty, integrity or security of the State, and the performance of any function under any law. Under r.23(2) the request may be kept from the Data Principal where disclosure would harm sovereignty, integrity or State security | An authorised person named in the Schedule; executive; possible secrecy. Applies from 13 May 2027 | Yes, from 13 May 2027 | s.36 **V** (Gazette); r.23 and Schedule **S** (dpdpa.com; Gazette G.S.R. 846(E) not reached) |
| L5 | **DPDP Act s.17(2)(a)** | The Act does not apply at all to processing by State instrumentalities notified on security and public-order grounds, or to the Central Government's processing of data they furnish | Notification by the Central Government | Removes DPDP protection once data is in the hands of such an agency | **V** |
| L6 | **DPDP Act s.17(1)(c)** | Chapter II (except s.8(1) and (5)), Chapter III and s.16 do not apply to processing "in the interest of prevention, detection, investigation or prosecution of any offence" | None in the Act | Allows LTM to disclose to law enforcement without DPDP notice or rights | **V** |
| L7 | **DPDP Act s.17(1)(d)** | The same provisions do not apply to personal data of Data Principals outside India processed under a contract with a person outside India | — | Probably covers EU and UK consultants' data under an intra-group agreement: their DPDP rights do not apply, and only s.8(1) and s.8(5) (security) remain. Their protection in India is contractual (the SCCs) | **V** |
| L8 | **DPDP Rules 2025 r.6(1)(e) and r.8(3)** | Logs and personal data must be kept for one year to detect and investigate unauthorised access (r.6(1)(e)). Personal data, traffic data and processing logs must be kept for at least one year from processing for the Seventh Schedule purposes, then erased (r.8(3)). From 13 May 2027 | — | A retention floor that keeps data available for L4 requests. Whether r.8(3) reaches data exempted by s.17(1)(d) is for counsel | S |
| L9 | **Telecommunications Act 2023 s.20(2)**, with the Telecommunications (Procedures and Safeguards for Lawful Interception of Messages) Rules 2024 | Interception of messages on a public emergency or in the interest of public safety, on security and public-order grounds. The Rules replace Telegraph Rules 419 and 419A | Union or State Home Secretary; executive review committee; no judicial step | Only to data in transit over telecom networks in India. TLS limits what can be read | S (s.20 in force 26 Jun 2024; Rules notified Dec 2024) |
| L10 | **Bharatiya Nagarik Suraksha Sanhita 2023 s.94** (replacing CrPC s.91) | A court, or the officer in charge of a police station, may order production of any document, electronic communication or device needed for an investigation, inquiry, trial or other proceeding | Written or electronic order; ordinary criminal procedure; challengeable in court | Yes, for a specific investigation | S |

**Practice.** No source found in this review shows Indian authorities seeking business-contact or access-log data of foreign employees of an IT services company. That absence of evidence cannot, by itself, justify proceeding (EDPB Recs 01/2020 para. 47, V). Civil-society sources (SFLC, CIS India) criticise L1, L2 and L9 for lacking judicial oversight (S). The Supreme Court's privacy and proportionality case law (*K.S. Puttaswamy v Union of India*, 2017) was not re-checked in this review: UNSOURCED here.

## 4. Is the "problematic legislation" test met?

EDPB Recs 01/2020, footnote 50 (V), treats legislation as "problematic" when (1) it imposes obligations on the recipient, or affects the transferred data, in a way that may impinge on the transfer tool's guarantees, **and** (2) it does not respect the essence of the Charter rights, or exceeds what is necessary and proportionate in a democratic society. The test for (2) is the four European Essential Guarantees (EDPB Recs 02/2020; S, official PDF not reached).

| Guarantee | Indian framework (L1, L2, L4, L9) | Assessment |
|---|---|---|
| A. Clear, precise and accessible rules | The statutes are public. The grounds are broad: "investigation of any offence" (s.69), "public order", "performance of any function under any law" (Seventh Schedule), and are undefined | Partly met |
| B. Necessity and proportionality | The statutory standard is "necessary or expedient" (s.69). There is no statutory limit on the categories of person or data, and no proportionality test in s.36 / r.23 | Not shown to be met |
| C. Independent oversight | Executive authorisation and executive review committees. No prior judicial or independent approval | Not met |
| D. Effective remedies | No notice to the person; confidentiality or secrecy duties (2009 Rules; r.23(2)); DPDP rights disapplied (s.17(1)(c), (2)(a)) | Not met |

**Finding (LTM view, for counsel):** limb (1) is met. L1, L3 and L4 can compel LTM India, the importer, to disclose or decrypt, and the secrecy duties may stop it from notifying the exporter under SCC Clause 15.1. Limb (2) is met for L1, L2, L4 and L9, because guarantees C and D are absent. **The test is therefore met in principle.** L3 (CERT-In) is a cyber-security power with a narrower purpose. It is still problematic on C and D, and it is the most likely to be used in practice. L10 is ordinary criminal procedure with court involvement, and is the least problematic.

That puts the transfer in EDPB para. 43.3 (V). The exporter may proceed **either** with supplementary measures **or** without them, if it documents, with a detailed report, that it has no reason to believe the problematic legislation will be applied in practice to this data and importer. This TIA follows the **first** path (section 6), and uses the second only as supporting evidence. For a group as large as LTM, the second path alone is hard to document to EDPB para. 46 standard: the information must be relevant, objective, reliable, verifiable and public.

## 5. Other access routes (US provider, AI flow)

- **US law through AWS.** AWS is a provider of remote computing services subject to US jurisdiction. Under 18 U.S.C. § 2713 (V, LII reproduction), it must comply with Stored Communications Act process for data in its "possession, custody, or control, regardless of whether [it] is located within or outside of the United States". This applies in any AWS region, India or the EU, so it does not count against India in particular. AWS's own transfer terms and data processing addendum cover it. LTM's privacy office should confirm those at go-live, with the instrument. FISA s.702 status on 26 Oct 2026: **UNSOURCED** (the registry says it lapsed in June 2026 with reauthorisation pending; re-verify before S11).
- **AI flow (when S9 is switched on).** The input is the redacted, client-visible engine result: no client name, no answers, no notes. It is organisation data, not personal data. The exception is the consultant's focus note, which may contain names, because only emails and the client name are redacted. Since D29 (27 Oct 2026) the flow stays in India: Mumbai to the India inference profile, which processes in Mumbai or Hyderabad, and back. It adds no transfer beyond the hosting itself; AWS acts as processor in India. (Under D28 the flow went from India to Ireland and back, which needed the EDPB 05/2021 Example 10 analysis.) Bedrock: model providers have no access to prompts or completions (model deployment accounts, V). Retention depends on the account's data-retention mode in ap-south-1 and ap-south-2. `none` means no durable storage. Under `default`, AWS may keep data for abuse detection, for up to 30 days for some models (V, AWS docs, 26 Oct 2026). Set `none` before switching on, if the model allows it.
- **Log of the AI flow** in CloudWatch ap-south-1 (one year). It falls under the same Indian-law analysis as section 3.

## 6. Supplementary measures (step 4)

**Encryption is not the answer here, and the TIA should say so.** The importer (LTM India) processes the data in the clear. EDPB Recs 01/2020 Use Cases 6 and 7 (paras 94 to 97, V) say that where the importer needs the data in the clear and problematic legislation applies, the EDPB "is incapable of envisioning an effective technical measure". Transport and at-rest encryption "do not constitute a supplementary measure ... if the data importer is in possession of the cryptographic keys". Keys held by LTM, the importer, therefore do not protect against an order served on LTM India (s.69(3) also compels decryption). A customer-managed KMS key would add some protection against an order served on AWS alone, and gives a revocation lever. None is configured today.

The effective measures are minimisation, retention and organisational and contractual measures:

| # | Measure | Status | Effect |
|---|---|---|---|
| M1 | No personal data needed: notice and notes label say "do not enter personal details about individuals" | In place | Keeps third-party data subjects out |
| M2 | Redact emails and the client name from the AI focus note | In place | Partial: names pass. **Recommended:** label the focus field "Do not name individuals" |
| M3 | Record retention 24 months (TTL), expired records hidden at once, deletion on request | In place | Limits the period of exposure |
| M4 | Logs one year (API access logs and four Lambda log groups) | In place | Meets CERT-In (180 days, in India) and DPDP r.6(1)(e) (one year) without keeping longer |
| M5 | **Recommended:** log the Cognito user ID (`sub`) instead of the email in the API access log, and keep the email only in the record | Not in place | Removes the email from the most exposed store (CERT-In route) |
| M6 | Access to records: respondent and Admin only | In place | Limits internal access |
| M7 | Contractual (in the intra-group agreement, at go-live): SCC Clause 15 duties; review each request for legality and challenge where there are grounds; disclose the minimum; keep a register of requests and report it to the exporter yearly where the law allows | Deferred to go-live | Organisational counterweight to guarantees C and D |
| M8 | Organisational: a government-request procedure naming the LTM legal owner, and a CERT-In incident procedure that limits the logs provided to those the order needs | To confirm with LTM | Narrows the CERT-In route |
| M9 | Bedrock data-retention mode `none` in ap-south-1 and ap-south-2 (or disclose up to 30 days) | Before S9 is switched on | Keeps the AI flow transient |

## 7. UK: the data protection test

Since 5 Feb 2026, the Data (Use and Access) Act 2025 (Sch. 7) has replaced the UK "essentially equivalent" standard with the **data protection test**. For a transfer under appropriate safeguards, the exporter, acting reasonably and proportionately, must consider that the protection for data subjects is **not materially lower** than under UK law (S: commencement and threshold from Burges Salmon, Kennedys and Freeths; the ICO's TRA page, updated 15 Jan 2026, confirms the TRA "is now referred to in UK legislation as a 'data protection test'", V). Existing IDTAs and Addenda remain valid (S). The ICO's revised approach allows an assessment proportionate to the risk (S).

**Assessment:** the data is business contact details and IP addresses of professionals, kept for a limited time, with the measures in section 6. The test is likely met (LTM view). This rests on proportionality to the small risk, not on India's surveillance framework meeting UK standards.

## 8. Residual risk and conclusion

| Route | Likelihood it reaches this data | Impact on data subjects | Residual |
|---|---|---|---|
| CERT-In order or incident report (L3) | Moderate, if there is an incident on LTM's systems | Low: email and IP of professionals | Low |
| s.69 / s.69B interception or decryption (L1, L2) | Low: no intelligence value expected in this data | Low | Low |
| DPDP s.36 call for information (L4), from 13 May 2027 | Low | Low | Low |
| Police production order (L10) | Low, and specific to a case | Low | Low |
| Telecom interception (L9) | Low; TLS | Low | Low |
| Free text naming client staff (notes, focus) under any route | Low (M1, M2) | Medium: opinions about named people | Low to medium |
| US access through AWS (§ 2713) | Low; applies in any region | Low | Low |

**Conclusion (draft, for counsel):** India's public-authority access laws meet the EDPB "problematic legislation" test in principle, because there is no independent oversight and no effective remedy. Technical measures cannot neutralise access by the importer. The transfer can still proceed under the SCCs (Module 1 or 2) and the UK Addendum or IDTA, with measures M1 to M9. The **residual risk is low**. That rests on the nature and small volume of the data (business emails and IPs of LTM staff), its short retention, and the minimisation controls. It does not rest on encryption or on Indian law meeting the EU standard. The risk rises if consultants enter names or opinions about individuals. This is the condition the notice, the notes label and the focus-field label protect.

**If the instrument cannot be confirmed at go-live**, or counsel disagrees with the residual risk, the fallback is to host EU and UK assessments in an EU or UK AWS region. That is an architecture change under WS-S6.

## 9. Procedure and re-evaluation (steps 5 and 6)

- **Step 5:** no change to the SCC text. Annex I and II of the intra-group agreement list this processing and measures M1 to M9. Deferred to LTM's go-live, with the instrument.
- **Step 6, re-evaluate:** every 12 months, and on any of these events: the DPDP Rules main commencement (13 May 2027: r.6, r.8(3), r.23); a notification under DPDP s.16 or s.17(2)(a); an EU or UK adequacy decision for India; a change to CERT-In Directions; a change to the AI flow (region, model, retention mode); and any government request actually received.
- **Endorsement:** the exporter's legal representative signs off (EDPB footnote 54) after a qualified lawyer's review.

## 10. Sources

All checked 26 Oct 2026.

| Source | Used for | Status |
|---|---|---|
| [CERT-In Directions, 28 Apr 2022](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf) | L3 | V |
| [DPDP Act 2023, Gazette text (MeitY)](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf) | s.3, 16, 17, 36 | V |
| [EDPB Recommendations 01/2020 v2.0](https://www.edpb.europa.eu/system/files/documents/2021-06/edpb_recommendations_202001vo.2.0_supplementarymeasurestransferstools_en.pdf) | Step 3, fn 50, paras 43–47, 94–97 | V |
| [EDPB Guidelines 05/2021 v2.0](https://edpb.europa.eu/system/files/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf) | What a transfer is; Examples 8–10 | V |
| [Amazon Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html), [data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html), [abuse detection](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html) | AI flow, M9 | V |
| [18 U.S.C. § 2713 (LII)](https://www.law.cornell.edu/uscode/text/18/2713) | US access | V (reproduction) |
| [ICO: completing a TRA](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/completing-a-transfer-risk-assessment) | UK test name, date | V (contents page only) |
| [Kennedys](https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-ico-s-2026-updated-international-transfer-guidance-decoding-the-new-uk-regime), [Freeths](https://www.freeths.co.uk/insights-events/legal-articles/2026/ico-s-updated-2026-guidance-on-international-data-transfers/), [Burges Salmon](https://www.burges-salmon.com/articles/102mh1d/the-data-use-and-access-act-2025-key-implications-for-businesses-as-the-new-in/) | DUAA test, commencement | S |
| [IT Act s.69 (UNODC SHERLOC)](https://sherloc.unodc.org/cld/zh/legislation/ind/the_information_technology_act_2000/chapter_xi/section_69/section_69.html), [SFLC](https://sflc.in/s-69-information-technology-act-and-decryption-rules-absence-adequate-procedural-safeguards/), [CIS India: 2009 Interception Rules](https://cis-india.org/internet-governance/resources/it-procedure-and-safeguards-for-interception-monitoring-and-decryption-of-information-rules-2009), [CIS India: 2009 Traffic Data Rules](https://cis-india.org/internet-governance/resources/it-procedure-and-safeguard-for-monitoring-and-collecting-traffic-data-or-information-rules-2009) | L1, L2 | S |
| [DPDP Rules r.6](https://dpdpa.com/dpdparules/rule6.html), [r.8](https://dpdpa.com/dpdparules/rule8.html), [r.23](https://www.dpdpa.com/dpdparules/rule23.html), [Seventh Schedule](https://dpdpa.com/schedule/schedule7.html) | L4, L8 | S |
| [PRS India: telecom interception rules](https://prsindia.org/billtrack/prs-products/rules-and-regulations-review-1732267200), [SFLC comments](https://sflc.in/comments-on-the-draft-telecommunications-procedures-and-safeguards-for-lawful-interception-of-messages-rules-2024/) | L9 | S |
| [BNSS s.94 (writinglaw)](https://www.writinglaw.com/section-94-bnss/) | L10 | S |
| [EEG summary (eucrim)](https://eucrim.eu/news/edpb-update-european-essential-guarantees-surveillance-measures/) | Four guarantees | S |
| Commission Decision (EU) 2021/914 ([EUR-Lex](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj)); [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj) Ch. V | Instrument, Clauses 14–15 | P |
| FISA s.702 status on 26 Oct 2026 | Section 5 | UNSOURCED |
| *Puttaswamy* (2017) | Practice | UNSOURCED here |
