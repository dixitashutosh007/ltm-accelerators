# Sovereign IQ S10: client-data protection and the legal counsel gate

Execution phase S10 (PLAN S10, shared workstream WS-S6), modelled on FinOps IQ M6. Status at 26 Oct 2026, engine 4.6.0. Prepared by `sovereignty-compliance-lead`. LTM has no counsel engaged for this phase, so at the owner's request Claude (AI) did the review below acting in a counsel role. It is a structured legal review against primary sources, not advice from a qualified lawyer, and it creates no lawyer-client relationship. It advises; the owner decides. A qualified lawyer signs off before the first external client.

Source status, as in [S10-TIA.md](S10-TIA.md): V (primary text read 26 Oct 2026), S (secondary), P (primary cited, not re-read), UNSOURCED.

## Status and gate S10

**Gate S10 (PLAN):** written counsel sign-off per market; TIA and privacy notice published; retention job tested. **Not met yet.** The AI review is recorded (section 7). The TIA is drafted for counsel. The notice has final recommended wording for the owner to approve. Retention is built, with one test gap (A5). Qualified-lawyer sign-off per market (D9) is outstanding.

| Item | Status |
|---|---|
| 1 Data inventory | Done (section 1) |
| 2 Retention | Built: TTL on `expiresAt` 24 months after the last change; expired records hidden at once (`isLive`); delete by the respondent or an Admin; one-year logs on all four Sovereign functions and the API access log; backend check asserts TTL and log retention. No Sovereign-specific spec for `expiresAt` on writes (A5) |
| 3 Transfer basis | Analysed (section 3). **The instrument is deferred to LTM's go-live**: LTM's privacy office confirms it then. Not an action now |
| 4 TIA | Draft for counsel ([S10-TIA.md](S10-TIA.md)): residual risk low |
| 5 Notice and disclaimer | Reviewed; final recommended wording in section 4 for `NOTICES` in `public-schema.ts`; awaits owner approval (A2) |
| 6 Legal-advice risk | Reviewed (section 5): nothing as built is a reserved legal activity in the UK, US (with the wording below), SG, AU or DE. France and India need counsel confirmation before external use there. Wording changes W1–W14 |
| 7 Counsel review | AI review done: comments C1–C20. Ranked list for per-market sign-off (section 6.2). Second AI review 27 Oct 2026 ([S10-second-review.md](S10-second-review.md)): one correction (CCPA damages), five points for counsel; briefs per market in [S10-counsel-briefs.md](S10-counsel-briefs.md) |

## 1. Data inventory

| Data | Who it is about | Where it is held | How long |
|---|---|---|---|
| Client name and sector | The client organisation | `SovereignIqAssessment` (Amplify Data, DynamoDB, ap-south-1) | 24 months after the last change, or until deleted |
| Answers (`requestJson`): footprint, entities and regulated roles, kinds of data and where each sits, platforms, turnover or band, maturity answers | The client organisation (confidential, not personal data) | Same record | As above |
| Server-computed result (`resultJson`) | The client organisation | Same record | As above |
| Consultant notes (consultant-only; labelled "Do not record personal details about individuals") | The client; may name people if a consultant ignores the label | Same record | As above |
| Respondent email (the consultant) | The consultant (personal data) | Same record; Cognito user pool (platform account, outside Sovereign IQ) | Record as above |
| AI switch and last narrative (`aiEnabled`, `narrativeJson`): narrative, model, input hash, **and the redacted focus note** (up to 300 characters; emails and the client name redacted, other names not) | The client; the focus note may name people | Same record | As above |
| AI request (when S9 is on): redacted engine result (no client name, answers or notes) plus the redacted focus note | Mainly the client organisation | Claude in Amazon Bedrock, eu-west-1 (D28), in transit; AWS retention depends on the account's data-retention mode (C12) | Transient if the mode is `none`; otherwise up to 30 days for abuse detection for some models |
| AI prompt and output log | As above | CloudWatch Logs, ap-south-1 | One year |
| API access logs: request ID, time, source IP, method, route, status, caller email | The consultant | CloudWatch Logs, ap-south-1 | One year |
| Lambda logs (four functions: evaluate, manage, report, narrative) | Mainly operational; the narrative log holds the AI prompt and output | CloudWatch Logs, ap-south-1 | One year |
| Scoring requests | The client | Processed in memory | Not retained |
| Report PDF and backlog CSV | The client | Generated on request; not stored by LTM | Held by whoever downloads it |
| Browser | — | Session token only; the v4 page saves on the server | Session |

**Outside S10 until the switch-over (S5):** the legacy `sovereign-iq.html` and `posture-iq.html` pages keep state in browser `localStorage` and contain legacy AI-provider code. They must be retired before external use (C18).

## 2. Retention

- **Rule:** 24 months after the last change, the same as FinOps IQ (owner decision, 22 Oct 2026). One constant (`RETENTION_MONTHS`) drives both the deletion date and the notice wording.
- **Mechanism:** every save, complete and archive sets `expiresAt` (`manage-sovereign-assessment/handler.ts`), and DynamoDB TTL deletes the record (`amplify/backend.ts`). The shared store treats a record past `expiresAt` as deleted: it is not listed or opened (`isLive`, from the FinOps IQ store). Deletion on request: `POST /api/sovereign-iq/assessment {action:"delete"}`, by the respondent or an Admin, permanent. No point-in-time recovery is configured, so no backup copy outlives deletion.
- **Logs:** one year on the API access log and on all four Sovereign Lambda log groups. The backend check asserts this.
- **Fit with the law:** 24 months suits an advisory assessment revisited at the next review cycle (GDPR Art. 5(1)(e), P). One-year logs meet CERT-In direction (iv): a rolling 180 days, kept within Indian jurisdiction (V). They also match DPDP Rules r.6(1)(e), one year, from 13 May 2027 (S). DPDP r.8(3) sets a **minimum** one-year retention of personal data, traffic data and logs from 13 May 2027 (S). Deleting a record on request within its first year is probably consistent, because the access logs holding the same email and IP are kept for one year. Counsel should confirm this, and whether r.8(3) reaches data exempted by s.17(1)(d) (C13).
- **Test gap:** the Sovereign handler spec tests deletion and ownership. Expiry is tested only through the FinOps IQ store. Add a Sovereign spec: every write sets `expiresAt` 24 months on, and an expired record is not listed, opened, reported or narrated (A5).

## 3. Transfer basis

This section mirrors FinOps IQ M6 section 3. Sovereign IQ is hosted in AWS ap-south-1 (FRAMEWORK.md, Hosting). India has no EU adequacy decision and no UK adequacy regulations (P), so personal data from EU and UK users is transferred to India (GDPR and UK GDPR Chapter V).

- **What is transferred:** mostly confidential organisation data, which is not personal data and is covered by confidentiality terms. The client name is kept (D11), but it names an organisation. The personal data is small: the consultant's email, the source IP in access logs, and any names a consultant writes in notes or the AI focus note.
- **Who exports:** usually an LTM consultant employed by an LTM EU or UK entity, using a system run by the LTM entity that holds the AWS account. That makes it an intra-group transfer. Whether a given flow is a "transfer" depends on which entity is controller. Under EDPB Guidelines 05/2021 (V), there is a transfer only when an exporter subject to the GDPR makes data available to a *separate* controller or processor in a third country. A data subject entering their own details is not an exporter (footnote 15). The ICO applies the same separate-entity test (S). The privacy office settles this at go-live.
- **Usual instrument:** an intra-group agreement with the EU SCCs (Decision (EU) 2021/914, Module 1 or 2) and the UK Addendum or IDTA, backed by the TIA. Since 5 Feb 2026 a UK transfer under safeguards must pass the "data protection test" (not materially lower) (S). Existing IDTAs and Addenda remain valid (S).
- **AI flow (D28):** when on, the redacted engine result and the redacted focus note go from Mumbai to Bedrock in eu-west-1 (Ireland), and the output returns to Mumbai. The prompt and output are logged in CloudWatch ap-south-1 for one year. DPDP s.16 restricts transfers only to notified countries, and none is notified (V). AWS acts as processor in the EU. The return to a non-EU controller is a transfer under EDPB 05/2021 Example 10 (V), expected to be covered by AWS's processing terms (P). The input is organisation data, except where the focus note names someone (C12).
- **Other markets:** Singapore, Australia, the US and India are covered in C14 to C17. None needs a separate instrument beyond the intra-group agreement, subject to counsel.
- **Residual risk:** low (TIA section 8), because the personal data is limited to business contact details and network addresses of LTM staff. It is not nil, and the notice must not name a mechanism LTM does not have.
- **Deferred to LTM's go-live (not an action now):** LTM's privacy office confirms (1) which LTM entity holds the AWS account; (2) the intra-group agreement and its module (SCCs, UK Addendum or IDTA) covering EU and UK entities to that entity; (3) that its transfer assessment covers India and has been read against the UK data protection test; (4) AWS's processing and transfer terms for ap-south-1 and eu-west-1; (5) the data protection contact for the notice. The FinOps IQ M6 request text can be reused, with Sovereign IQ's data and the AI flow added.
- **Fallback:** if no instrument exists, host EU and UK assessments in an EU or UK region (WS-S6 architecture change).

## 4. Notice and disclaimer

### 4.1 Review of the draft (`NOTICES` in `public-schema.ts`, 26 Oct 2026)

The draft is accurate on hosting, the adequacy position, what is held, retention and deletion, and log retention. It adds the pointer to LTM's privacy notice and rights (M6 C1). Changes needed:
1. **"so no AI model has seen your data"** (`dataWith(false)`) is true only if no narrative was ever generated. A consultant can switch AI on, generate, then switch it off. Say only that it is off, unless the engine knows that no run happened (W4).
2. The AI sentence omits the **focus note**, which is sent and stored, and says nothing on AWS retention or the model provider (C12).
3. Logs: "Access logs" should be "access and service logs", and should say where they are kept (India): the AI prompt log is a service log.
4. Add that reports are generated on request and **not stored** by LTM. This reassures the reader and is true.
5. "Notes": tell the reader not to name individuals in notes either.
6. Keep `status` ("Draft wording, pending the owner's approval after the S10 review") until the owner approves, then remove it.

### 4.2 Final recommended wording

**`DATA_NOTICE`:**
> LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your organisation's name and sector, your answers (including any turnover figure), the computed result, the consultant's notes and the consultant's email address, and use them only to produce this assessment and its report. The assessment needs no personal details about individuals, so please do not enter any, including in notes. We keep each assessment for two years after its last change and then delete it automatically; ask your consultant to delete it sooner. Reports are generated when requested and are not stored by LTM. Access and service logs, which record the consultant's email and network address, are kept in India for one year.

**AI off** (`data` and `dataWith(false)`):
> The AI narrative is off unless your consultant switches it on for this engagement.

(Add "No AI model has processed this assessment." only when no narrative was ever generated.)

**AI on** (`dataWith(true)`):
> The AI narrative is switched on for this engagement: the computed result, without your organisation's name, your answers or the consultant's notes, together with any short focus note from the consultant, is processed by Claude in Amazon Bedrock in the EU (Ireland) region. Amazon Web Services runs the model and does not share the content with the model's developer. The text sent and returned is logged in India for one year.

If the Bedrock retention mode is not `none` (C12), add: "AWS may keep it for up to 30 days to detect abuse."

**End of every variant:**
> LTM's privacy notice explains your data protection rights and how to contact LTM's data protection team.

**At LTM's go-live (deferred):** add "LTM protects this transfer with [the EU Standard Contractual Clauses and the UK Addendum]; ask your consultant for a copy."

### 4.3 Disclaimer

The owner's revised disclaimer is sound: inputs not audited or verified, not legal advice, caps not expected fines, internal use and reliance governed by the contract (as M6 C2). It is fit for internal use as written. Before external use, add three things: the "not a substitute for a lawyer" and "not a law firm" sentences (C3; these meet the Texas Gov't Code § 81.101(c) software condition, S); the date the content is stated at; and a separate privilege sentence in the methodology.

> Sovereign IQ gives an indicative assessment based on the answers you provide, which LTM has not audited or verified. It is not legal advice and is not a substitute for advice from a qualified lawyer; LTM is not a law firm. Confirm with your counsel which laws apply to you and what they require before acting. The regulatory content is stated as at {registry status date}. Statutory maximums are caps, not expected fines, and are never added together. The assessment is for your organisation's internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it.

Methodology (report), new sentence:
> This report is not legal advice and is unlikely to be protected by legal professional privilege unless LTM is engaged through your lawyers.

## 5. Legal-advice risk

A tool that grades which regulations "apply" to a named client, on its facts, is close to legal advice. There are two risks. **Legality:** the activity may be one the law reserves to lawyers. **Liability:** a client acts on a wrong statement (negligent misstatement), or the report is disclosable because it is not privileged.

### 5.1 Is it practising law? (by market)

| Market | Rule | How it applies to Sovereign IQ | Risk |
|---|---|---|---|
| England and Wales | Legal Services Act 2007 s.12: the reserved activities are rights of audience, conduct of litigation, reserved instruments, probate, notarial activities and oaths. The LSB says legal advice is unreserved (S) | Not a reserved activity. The risk is liability (Hedley Byrne / Caparo, as M6 C2) and privilege: advice from non-lawyers is not covered by legal advice privilege (*R (Prudential) v Special Commissioner* [2013] UKSC 1, S) | Low (legality); medium (liability) |
| EU: Germany | RDG § 2(1): a legal service is an activity in a concrete matter of another that needs legal examination of the individual case. § 5 allows ancillary legal services. The BGH held a rules-based document generator is not a legal service: it is not tied to a concrete case (*Smartlaw*, I ZR 113/20, 9 Sep 2021, S) | The engine resembles *Smartlaw*. A consultant applying it to a client in a workshop is an individual case, but ancillary to IT and sovereignty consulting (§ 5) | Low, with the wording below |
| EU: France | Loi n° 71-1130 art. 54: no one may, habitually and for pay, give legal consultations for others without the required legal qualification. Art. 60: non-regulated professionals may give consultations only when directly related and **accessory** to their main activity, and only with a recognised qualification (S, CA Paris 2015). Penalties (art. 66-2): UNSOURCED | The strictest market. A paid workshop concluding "SecNumCloud applies to you" could be a legal consultation unless accessory to technical consulting. LTM's French entity's qualification under art. 60 is unknown | **Medium: counsel to confirm before French external use** |
| US | Unauthorised practice of law is state law and varies. Texas Gov't Code § 81.101(c) excludes software that "clearly and conspicuously" states it is "not a substitute for the advice of an attorney" (1999, HB 1507, S; current text P) | B2B, consultant-led, about the client's own compliance. Common practice for Big Four and IT firms; risk is low with the recommended disclaimer | Low |
| Singapore | Legal Profession Act 1966 s.33: offence for an unauthorised person to act as an advocate or solicitor (fine up to S$25,000 and/or 6 months, first offence, S) | Compliance consulting that does not hold itself out as legal and drafts no legal documents is outside the usual scope | Low |
| Australia | Legal Profession Uniform Law s.10: an unqualified entity must not engage in legal practice (250 penalty units or 2 years); s.11: must not represent that it is entitled to (S, AustLII NSW) | Low if LTM never presents the output as legal advice (s.11) | Low |
| India | Advocates Act 1961 s.29; *Bar Council of India v A.K. Balaji* (2018): "practice of law" covers non-litigious advisory work, and the substance of a service decides it, not its label (S) | An IT company's technology-compliance assessment is in substance consulting. A report that gives legal opinions on Indian law to clients could be argued to be practice of law | **Medium-low: counsel to confirm** |

**Conclusion (LTM view, for counsel):** as built for internal consultant use, nothing is a reserved legal activity in the UK, US, Singapore, Australia or Germany. France and India have the broadest reservations of advisory legal work and need local counsel's confirmation before external use there. In every market, the wording changes in 5.2 reduce both risks. They turn conclusions ("applies", "required by", "red") into statements of the scope test and the client's answers, with the conclusion left to counsel.

### 5.2 Wording review and exact replacement text

"Internal" means change before internal consultant use, because the current text is inaccurate. "External" means change before the first external client.

| # | Where | Current | Replacement | When |
|---|---|---|---|---|
| W1 | `evaluate.ts` `consequence()`: "Required by" lists every in-scope regime, **including "likely – confirm"**. ARC3 shows "Required by ... UK GDPR" while UK GDPR is only "likely – confirm" | `Required by GDPR (Art. 30); UK GDPR (Art. 30).` | Regimes that apply: `Linked legal duties: GDPR (Art. 30). The action is LTM's recommended way to meet them; confirm what each requires of you with counsel.` Likely – confirm: `If UK GDPR applies to you: UK GDPR (Art. 30).` | **Internal** |
| W2 | CLOUD Act reason (`US_CLOUD_ACT`) | "A US provider must produce data in its possession, custody or control wherever it is stored." | "When served with valid US legal process, a provider of electronic communication or remote computing services subject to US jurisdiction must disclose data in its possession, custody or control, wherever it is stored (18 U.S.C. § 2713); in limited cases it can ask a court to modify or quash the order (§ 2703(h)). Keys you hold outside the provider's control limit what it can technically produce, not its legal duty." | **Internal** |
| W3 | `IN_DPDP.1` reason misstates s.3(a), which is not limited to people in India | "You process digital personal data of people in India from India; most duties apply from 13 May 2027." | "You process digital personal data in India, so the DPDP Act applies (s.3(a)); most duties apply from 13 May 2027. Processing in India of data about people outside India under a contract with a foreign party is largely exempt (s.17(1)(d))." | **Internal** |
| W4 | `NOTICES.dataWith(false)` | "...so no AI model has seen your data." | Section 4.2 | **Internal** |
| W5 | FISA 702 reason ("lapsed in June 2026 ... status as of 14 Oct 2026") | — | Re-verify its status (UNSOURCED on 26 Oct 2026) before consultants quote it | **Internal** |
| W6 | Grade labels (`GRADE`, report summary, page) | Applies / Likely – confirm / Advisory / Not applicable | **Applies on your answers / May apply – confirm / For awareness / Does not apply on your answers**. The internal grade IDs are unchanged | External |
| W7 | Methodology: "the first rule that matches grades each regulation applies, likely – confirm, advisory or not applicable." | — | "the first rule that matches places each regulation in one of four groups: applies on your answers, may apply – confirm, for awareness, or does not apply on your answers. The groups are LTM's reading of each law's scope test against your answers, not a legal opinion." | External |
| W8 | Report column and heatmap: "Required by"; "Required by regulations"; upcoming: "`X` requires this from `date`." | — | "Why it is needed"; "Linked to regulations"; "`X` adds a linked duty from `date`." | External |
| W9 | Regulation rating Red / Amber / Green, and the sentence "A regulation is red when..." | — | Column "Control gaps", values **Major gaps / Some gaps / No gaps found / Not rated**. Sentence: "Each regulation's rating shows how the controls in this assessment that are linked to it stand: major gaps when a critical or high-weight linked control is absent, unconfirmed or not answered; some gaps when any is below full; no gaps found when all are in place. It is not a finding that you comply or do not comply with the regulation." | External |
| W10 | R4 rung "Out of foreign-law reach, or disconnected"; control "Jurisdictional immunity"; L4 option "Make it immune from foreign laws, or keep it disconnected" | — | Rung: "No foreign control in the provider chain, or disconnected". Means: "R3, plus no company in the provider chain is owned or controlled from outside the zone, or the system is disconnected." Control: "Jurisdictional separation". L4 option: "Keep it only with providers controlled from inside the zone, or disconnected" | External |
| W11 | `COUNSEL_NOTE` | "Whether this meets R4 is for your counsel." | "Whether this meets R4 is for your counsel. Your own organisation, or a parent or subsidiary, can still be compelled by a foreign law to produce data it controls, whatever the provider." | External |
| W12 | Floor finding title "Keep `X` data in `Y`: the law requires it", and "L0: no localisation law found for this data in your markets" | — | "Keep `X` data in `Y`: `regulation` sets a localisation requirement". Consequence ends: "The requirement is applied; confirm its scope and any permitted exceptions with counsel." L0: "L0: the registry holds no localisation requirement for this data in your markets" | External |
| W13 | Reasons using "you must" (`UK_OPRES.1`, `UK_PRA_SS2_21.1`, `US_SEC_CYBER.1`, `IN_RBI_PAYMENT.1`) | e.g. "As a PRA-regulated firm you must keep important business services within your impact tolerances." | Template: "You said [fact]. [Regulation] applies to [category] ([article]). Confirm [the scope point] with counsel." For example: "You said you are a PRA-regulated firm. The PRA's operational resilience rules (SS1/21) require firms in scope to stay within impact tolerances for important business services; confirm your firm is in scope." SEC: "...domestic registrants file Form 8-K Item 1.05 within four business days of determining materiality; foreign private issuers use Forms 6-K and 20-F." RBI: "...requires the entire payment system data to be stored only in India; RBI's FAQs describe limited exceptions. Confirm scope with counsel." | External |
| W14 | `scopeAndLimitations`: "review by qualified counsel is pending, so this is not legal advice"; summary callout "Not legal advice" | Implies the content becomes legal advice once counsel has reviewed it | "Regulatory content comes from LTM's sourced regulation registry, stated as at {date}. Any review by counsel is for LTM, not advice to you; this report is not legal advice." Callout: "An indicative assessment from self-reported answers, as at {date}. It is not legal advice and is not a substitute for advice from a qualified lawyer; confirm which laws apply and what they require with your counsel before acting. Statutory maximums are caps, not expected fines, and are never added together." | External |

**SEAL statements:** "LTM mapping, not the Commission's" and "not a SEAL assessment or certification of you or of any provider" are correct and sufficient (D16, D20). One change (external): the heading "Provider SEAL your data needs, by objective" should read "Provider SEAL that matches the level you set, by objective (LTM mapping)". SEAL is a procurement framework, not a legal duty, so "needs" overstates it.

**SOW callout:** sound ("subject to contract: not an offer or a quotation"). Add: "LTM's work does not include legal advice; legal conclusions are for your counsel." Do the same in the outlines of the transfer-assessment and AI Act offerings: "LTM supplies the data flows and technical facts; your counsel owns the legal assessment."

## 6. Counsel review pack

### 6.1 Items for the qualified lawyer

| # | Text | Where | Question for counsel |
|---|---|---|---|
| CP1 | Data notice (4.2) | Start screen; report methodology | Accurate and sufficient as a transparency notice (GDPR Art. 13 and 14, UK GDPR, PDPA, APP 5, CCPA notice at collection), given that consultants' full notice is LTM's employee notice? Mechanism wording at go-live? |
| CP2 | Disclaimer (4.3) and the privilege sentence | Page; report | Adequate disclaimer of reliance (UCTA reasonableness; US UPL disclaimers)? Is the privilege statement right in each market? |
| CP3 | TIA ([S10-TIA.md](S10-TIA.md)) | Annex to the intra-group agreement | Do you agree that the problematic-legislation test is met in principle and that the residual risk is low on measures M1–M9? |
| CP4 | Legal-advice analysis (5.1) | — | France (art. 54/60 loi 1971) and India (Advocates Act s.29, *Balaji*): can LTM's consultants deliver this workshop externally there, and with what wording? |
| CP5 | Wording W1–W14 and the SEAL and SOW notes (5.2) | Engine, report, page | Accept, or amend? |
| CP6 | Retention (section 2), with DPDP r.8(3) | Notice | Is deletion on request within the first year consistent with r.8(3)? |
| CP7 | Ranked regulatory statements (6.2), and the 13 UNSOURCED, 28 P and 92 S claims (PLAN S2) | Registry, findings | Sign off per market (D9); comments into the claims register |

### 6.2 Regulatory statements that most need sign-off, ranked

Ranked by the chance a client acts on the statement without checking, multiplied by the harm if it is wrong. Status is the registry's verification status (PLAN S2). "Counsel" names the market whose counsel should sign off.

| Rank | Statement (rule or claim) | Why it is high risk | Counsel | Status |
|---|---|---|---|---|
| 1 | **Negative statements:** "Not applicable" grades and the client appendix of regulations that do not apply (D32); "L0: no localisation law found"; `EU_NIS2.7` ("the NIS2 equivalents do not apply to you" for DORA entities); CLM-SOV-046 (no localisation in DORA, NIS2, CPS 230/234, MAS TRM) | The client acts by doing nothing. Negative statements are the hardest to verify | All; EU for NIS2/DORA | CLM-SOV-046 UNSOURCED; NIS2.7 S |
| 2 | **Localisation floors and their findings:** `IN_RBI_PAYMENT` (store payment data only in India), `CN_PIPL` Art. 40 (CIIO and volume floor) | They trigger "the law requires it" titles and data migrations. Exceptions exist (RBI FAQs; CAC security assessment route) | IN; CN | RBI V; PIPL P, volume floor provisional |
| 3 | **Incident-reporting windows** in the incident-reporting finding: GDPR / UK GDPR 72 h; NIS2 24 h / 72 h / 1 month; MAS TRM 1 hour; CERT-In 6 hours; CPS 234 and CPS 230 72 h; SOCI 12 h / 72 h; PDPA 3 days; SEC 4 business days | Clients build runbooks on these. CERT-In 6 h is V; the others vary | EU, UK, SG, AU, IN, US | Mixed (CERT-In V; MAS, SEC P; others S) |
| 4 | **"Applies" grades with scope conclusions:** `UK_OPRES.1` and `UK_PRA_SS2_21.1` ("As a PRA-regulated firm"; the scope is narrower), `US_SEC_CYBER.1` (foreign private issuers), `IN_DPDP.1` (W3), `EU_NIS2.8` (size cap, national transposition), `EU_DATA_ACT.1` (Art. 31 exemptions), `EU_DORA.2` (exclusions), `AU_PRIVACY.2` (Australian link, group turnover), `SG_MAS_TRM.1`, `IN_CERT_IN.1`, `US_CCPA.1` (thresholds change Jan 2027) | They decide the whole programme of work | UK, US, IN, EU, AU, SG | V to P |
| 5 | **Headline statutory caps:** GDPR Art. 83 computed on the turnover the client gives (the undertaking is the economic unit, i.e. the group: CJEU C-383/23 *ILVA*, 13 Feb 2025, S); AU s.13G "greatest of"; UK NIS tiers; DPDP ₹ tiers; currency conversions | Boards read them. Use of the wrong turnover understates the cap | EU, UK, AU, IN | S/V; MAS and SOCI penalties UNSOURCED, consultant-only |
| 6 | **"Required by" lists** pairing articles with LTM remedies (W1, W8), e.g. "encrypt ... everywhere, including internal traffic" against GDPR Art. 32 ("as appropriate"), and "reviewed at least every 12 months" against GDPR Art. 30 | They overstate what the law requires | EU, UK, US | P/S |
| 7 | **Transfer statements:** `SOV.XFER.BASIS` and the TIA findings ("Required by GDPR Art. 46"; "ICO transfer risk assessment guidance"); the UK transfer provisions as replaced by DUAA Sch. 7; DPF validity (C-703/25 P pending) | They guide transfer decisions | EU, UK | S/P |
| 8 | **Foreign-access statements:** CLOUD Act (W2), FISA 702 status (W5), `US_DOJ_DSP` reason, the R4 facts and the R4 label (W10, W11) | They drive provider choice and migrations | US, EU | S; FISA status UNSOURCED today |
| 9 | **National scheme triggers:** SecNumCloud (SREN art. 31; OIV UNSOURCED, CLM-SOV-073), C5 (SGB V § 393; public sector UNSOURCED, CLM-SOV-075), UK CTP designations and their date, EUCS "not adopted", SEAL wording | They change provider shortlists | FR, DE, UK, EU | S; two UNSOURCED |
| 10 | **Dates of upcoming obligations:** AI Act (Regulation (EU) 2026/1744), CRA (11 Dec 2027), DPDP (13 May 2027), Data Act switching charges (12 Jan 2027) | Planning; volatile | EU, IN | S/V |

## 7. Counsel comments register

Reviewer: Claude (AI, in a counsel role, 26 Oct 2026). Not a qualified lawyer (section 9). Jurisdictions: EU (GDPR), UK (UK GDPR as amended by DUAA 2025), US (state law as relevant to a B2B tool), Singapore (PDPA), Australia (Privacy Act), India (DPDP Act 2023 and Rules 2025). FinOps IQ M6 comments C1–C9 carry over where noted.

| # | Comment | Response | Status |
|---|---|---|---|
| C1 | Notice (as M6 C1): accurate, with the rights pointer, but the AI-off sentence can be untrue, and the focus note, AWS retention, log location and "reports not stored" are missing | Final wording in 4.2 | Open (A2) |
| C2 | Disclaimer (as M6 C2): sound for internal use; add "not a substitute for a lawyer", "not a law firm", the as-at date, and a privilege sentence before external use | 4.3 | Open (A2) |
| C3 | Practising law: not a reserved activity in the UK, US (with the disclaimer), SG, AU or DE; France and India need confirmation | 5.1; CP4 | Open (A6) |
| C4 | Grade labels "Applies / Likely" read as legal conclusions and probabilities LTM cannot support | W6, W7 | Recommended |
| C5 | "Required by" includes "likely – confirm" regimes (an error), and pairs articles with LTM's stricter remedies | W1 (internal), W8 | Recommended |
| C6 | Red / amber / green per regulation reads as a compliance finding, and is disclosable | W9 | Recommended |
| C7 | "Jurisdictional immunity" and "out of foreign-law reach" overclaim: no provider choice stops a foreign court compelling the client or its group | W10, W11 | Recommended |
| C8 | SEAL statements correct; one heading overstates | 5.2 | Recommended |
| C9 | Localisation floor titles say "the law requires it" without its exceptions | W12 | Recommended |
| C10 | "You must" reasons state conclusions; use the "You said ... applies to ... confirm" template | W13 | Recommended |
| C11 | Transfer basis: no adequacy for India; whether each flow is a transfer depends on the controller (EDPB 05/2021; ICO separate-entity test) | Section 3; deferred to go-live | Deferred |
| C12 | AI flow: input is organisation data, but the focus note may name people (only emails and the client name are redacted). Bedrock may retain data for abuse detection unless the eu-west-1 retention mode is `none` | Label the focus field "Do not name individuals"; set mode `none` (or disclose 30 days) before S9 is switched on | Open (A4) |
| C13 | Retention fits GDPR Art. 5(1)(e), CERT-In (180 days in India) and DPDP r.6(1)(e); check r.8(3)'s one-year minimum against deletion on request | CP6 | Open (counsel) |
| C14 | US: CCPA covers LTM US's employee and B2B personal data since 1 Jan 2023 (notice at collection with retention; service-provider terms with AWS). Colorado, Connecticut, Utah and Virginia exclude employee data (S). DOJ DSP (28 CFR Part 202) not engaged: India is not a country of concern (P). No US transfer restriction | Platform notice for US staff (WS-S6) | Routed |
| C15 | Singapore: a consultant's business email is business contact information, outside the PDPA's transfer limitation (S). IP addresses fall under s.26 and PDP Regulations 2021 (legally enforceable obligations, met by the intra-group agreement) (S) | Intra-group agreement at go-live | Deferred |
| C16 | Australia: disclosure to the Indian entity engages APP 8 unless the employee-records exemption (s.7B(3), S) or related-body rules apply; the s.13B and APP 8 interplay is UNSOURCED | Counsel | Open |
| C17 | India: LTM is a Data Fiduciary. EU and UK data processed under the intra-group contract is largely exempt (s.17(1)(d), V), but s.8(5) security applies. Platform DPDP notice and breach process by 13 May 2027 (as M6 C9) | WS-S6 | Routed |
| C18 | Legacy `sovereign-iq.html` and `posture-iq.html`: localStorage and legacy AI code | Retire at the S5 switch-over, before external use | Done 26 Oct 2026 (A8): both addresses forward to the merged page; the old pages, engines and routes are removed |
| C19 | Retention test gap: no Sovereign-specific expiry spec | A5 | Done (found 27 Oct 2026: `handler.spec.ts`) |
| C20 | Cap turnover: GDPR caps use the undertaking's (group) turnover (C-383/23, S); the turnover question should ask for group worldwide turnover | Question wording, with counsel | Recommended |

## 8. Actions for LTM

| # | Action | Who | Blocks |
|---|---|---|---|
| A1 | **Deferred to LTM's go-live (not an action now):** the privacy office confirms the instrument, the parties, the controller, AWS's terms and the contact, then the notice adds the mechanism sentence | Privacy office, at go-live | External EU/UK use |
| A2 | Approve the notice and disclaimer wording (4.2, 4.3) for `NOTICES`, then remove `status` | Owner | Gate S10 |
| A3 | Decide W1–W5 (before internal use) and W6–W14 with the SEAL and SOW notes (before external use) | Owner | Internal use (W1–W5) |
| A4 | Before switching S9 on: set the Bedrock data-retention mode to `none` in eu-west-1 and check that `anthropic.claude-opus-5-5` allows it (or disclose up to 30 days); label the focus field "Do not name individuals" | Owner | S9 switch-on |
| A5 | Add a Sovereign handler spec: writes set `expiresAt`; expired records are not listed, opened, reported or narrated. **Done** (`manage-sovereign-assessment/handler.spec.ts`, confirmed 27 Oct 2026) | Build | Gate S10 ("retention job tested") |
| A6 | A qualified lawyer reviews sections 3 to 7 and the TIA, and signs off per market (EU, with FR and DE on 5.1; UK; US; SG; AU; IN) using the ranked list in 6.2 | Owner / LTM legal | First external client |
| A7 | `sovereignty-compliance-lead` re-verifies FISA 702 and the other volatile claims before S11 | Agent | S11 |
| A8 | Retire the legacy pages at the S5 switch-over. **Done 26 Oct 2026** | Owner | External use |
| A9 | Optional, recommended: log the Cognito `sub` instead of the email in the API access log (TIA M5) | Owner | — |

## 9. Limits of this review

This review checks the wording and the data flows against the texts cited and flags risks. It cannot confirm facts about LTM's entities and contracts (A1). It could not reach several official sites (indiacode.nic.in, legislation.gov.uk, EUR-Lex, sso.agc.gov.sg, Légifrance), so those points rest on secondary sources (marked S). It is not insured advice. Internal consultant use can proceed on it once W1–W5 are fixed. Before the first external client, a qualified lawyer in each market should review it (A6).

## 10. Sources

All checked 26 Oct 2026. The Indian-law, EDPB, AWS and UK transfer sources are listed in [S10-TIA.md](S10-TIA.md) section 10.

| Source | Used for | Status |
|---|---|---|
| [Legal Services Board: reserved legal activities](https://legalservicesboard.org.uk/enquiries/frequently-asked-questions/reserved-legal-activities); [LSA 2007 s.12](https://www.legislation.gov.uk/ukpga/2007/29/section/12) | 5.1 UK | S (legislation.gov.uk not fetched) |
| [R (Prudential) v Special Commissioner [2013] UKSC 1](https://caselaw.nationalarchives.gov.uk/uksc/2013/1) | Privilege | S |
| [BGH I ZR 113/20 (LTO report)](https://www.lto.de/recht/juristen/b/bgh-urteil-izr11320-vertragsgenerator-smartlaw-keine-unzulaessige-rechtsdienstleistung-rak-hamburg-rdg-legal-tech) | 5.1 Germany | S |
| [CA Paris, 25 Feb 2015 (CNB copy) on loi 71-1130 art. 54, 60](https://www.cnb.avocat.fr/sites/default/files/documents/paris_25_fevrier_2015-_altax-harryplast.pdf) | 5.1 France | S; art. 66-2 UNSOURCED |
| [Texas HB 1507 (1999), Gov't Code § 81.101(c)](https://capitol.texas.gov/tlodocs/76R/billtext/html/HB01507F.htm) | 5.1 US | S (current code P) |
| [Singapore Police Force on LPA s.33](https://police.gov.sg/Media-Room/News/20220510_woman_investigated_for_unauthorised_person_acting_as_an_advocate_or_solicitor) | 5.1 SG | S |
| [LPUL s.10 (AustLII, NSW)](https://classic.austlii.edu.au/au/legis/nsw/consol_act/lpul333/s10.html) | 5.1 AU | S |
| [BCI v A.K. Balaji (2018), summary](https://itatonline.org/digest/bar-council-of-india-v-a-k-balaji-and-others-air-2018-sc-1382/) | 5.1 India | S |
| [CCPA employee and B2B sunset (Holland & Knight)](https://hklaw.com/en/insights/publications/2022/12/california-employee-data-exemption-expires-on-january-1) | C14 | S |
| [PDPC Advisory Guidelines, transfer limitation](https://www.pdpc.gov.sg/-/media/Files/PDPC/PDF-Files/Advisory-Guidelines/the-transfer-limitation-obligation---ch-19-(270717).pdf) | C15 | S |
| [OAIC employee records exemption](https://oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/employee-records-exemption) | C16 | S |
| [CJEU C-383/23 ILVA (eucrim)](https://eucrim.eu/news/ecj-overall-turnover-of-entire-company-group-decisive-for-fine-calculation-if-gdpr-was-infringed/) | C20 | S |
| [18 U.S.C. § 2713 (LII)](https://www.law.cornell.edu/uscode/text/18/2713) | W2 | V (reproduction) |
| [DPDP Act 2023 (Gazette)](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf) | W3, C17 | V |
| Engine output for the five archetypes (workshop mode, assessment date 26 Oct 2026), run locally with `tsx` | W1 evidence (ARC3) | — |
| [FinOps IQ M6](../../finops-iq/design/M6-data-protection.md) | Model and carried-over comments | — |
