# FinOps IQ M6: client-data protection and counsel review

Execution phase M6 (PLAN F11, shared workstream WS-S6). Status at 22 Oct 2026. Prepared by the build; the owner approves. LTM has no counsel engaged for this phase, so at the owner's request the review in section 6 was done by Claude (AI) acting in a counsel role. It is a structured legal review against primary sources, not advice from a qualified lawyer, and it does not create a lawyer-client relationship.

**Gate F11:** notice published; retention job tested; counsel comments recorded in the register (section 6). Review comments are now recorded; the owner decides whether the AI review satisfies the gate for internal use, and whether a qualified lawyer signs off before the first external client (recommended, section 6.3).

| Item | Status |
|---|---|
| 1 Data inventory | Done (section 1) |
| 2 Transfer basis | Analysed; LTM's privacy office to confirm the instrument it has signed (section 3, request drafted) |
| 3 Notice | Revised after the review (section 4); on the start screen and in the report; approved by the owner on 22 Oct 2026 (A3) |
| 4 Retention | Built and tested: 24 months after the last change, deletion at the client's request (section 2) |
| 5 Counsel review | Done as an AI review (section 6); seven items, changes applied; three actions for LTM (section 6.2) |

---

## 1. Data inventory (FinOps IQ v3)

| Data | Who it is about | Where it is held | How long |
|---|---|---|---|
| Client organisation name, sector, and logo if the consultant adds one (a small PNG or JPEG) | The client organisation | `FinOpsIqAssessment` (Amplify Data, DynamoDB, AWS ap-south-1 Mumbai) | 24 months after the last change, or until deleted |
| Answers and estate facts: providers, scopes, spend by scope and currency, value-base inputs (shares, utilisation, internal cost rate) | The client organisation (commercially confidential, not personal data) | `requestJson` in the same record | As above |
| Server-computed result (ratings, findings, value range, roadmap, platform actions) | The client organisation | `resultJson` in the same record | As above |
| Consultant notes (consultant-only; never in the client view or client edition) | The client organisation; may name people if a consultant writes names | `consultantNotes` in the same record | As above |
| Respondent email: the consultant who runs the assessment | The consultant (personal data) | `respondentEmail` in the same record; the Cognito user pool (platform sign-in) | Record: as above. User pool: platform account lifecycle, outside FinOps IQ |
| Report PDF and backlog CSV | The client organisation | Generated on request from the stored record; not stored by LTM (`Cache-Control: no-store`); the downloaded file is held by whoever downloads it | Not retained by LTM |
| Archived report PDFs ("Archive to Reports", carried over from FinOps Value Case, 22 Oct 2026) | The client organisation; the archiving consultant's email in the file metadata | The shared reports bucket (`ltm-advisory-reports-223833501993`, `reports/finops-iq/`), listed in the portal's Reports section | 24 months: lifecycle rule `infra/s3/reports-bucket-lifecycle.json` (delete `reports/finops-iq/` objects 730 days after creation), approved by the owner on 22 Oct 2026; applied with `aws s3api put-bucket-lifecycle-configuration --bucket ltm-advisory-reports-223833501993 --lifecycle-configuration file://infra/s3/reports-bucket-lifecycle.json` |
| Scoring requests (`POST /api/evaluate/finops-iq/v3`) | The client organisation | Processed in memory; not stored | Not retained |
| API access logs: request ID, time, source IP, method, route, status, latency, caller email, authorizer error | The consultant (IP address and email are personal data) | CloudWatch Logs, ap-south-1 | One year (`RetentionDays.ONE_YEAR`) |
| Lambda logs for the three FinOps IQ functions: errors with the request ID and the error object; deletions with the assessment ID. Request and response bodies are not logged | Mainly operational | CloudWatch Logs, ap-south-1 | One year (set in M6; previously kept forever) |
| Browser | — | No assessment data in browser storage (the page saves and resumes on the server); the platform session token only | Session |

**Not in FinOps IQ v3:** AI features and document upload. (The S3 report archive and a logo image were added on 22 Oct 2026, when FinOps Value Case was retired; see the rows above.) The current FinOps IQ and FinOps Value Case pages stay live with the F0 review banner until M8 (D18). They keep their own flows: the old FinOps IQ page holds its state in browser `localStorage`, and FinOps Value Case can archive a PDF to the shared S3 reports bucket. They are retired at M8; the shared reports bucket's retention is a platform question for WS-S6, outside this phase.

## 2. Retention (built)

- **Rule (owner decision 22 Oct 2026):** each assessment is kept for 24 months after its last change, then deleted automatically; sooner at the client's request. One constant (`RETENTION_MONTHS`, `v3/retention.ts`) drives both the deletion date and the notice wording.
- **Mechanism:** every write (save, complete, archive) sets `expiresAt` to 24 months later; DynamoDB time to live on `expiresAt` deletes the record (`amplify/backend.ts`). Time to live removes an item within days of expiry, not at once, so the stores treat a record past `expiresAt` as already deleted: it is not listed, not opened and gives no report.
- **Deletion at the client's request:** `POST /api/finops-iq/assessment { action: "delete", assessmentId }`, by the respondent or an Admin, in any status; permanent. The page offers Delete on each saved assessment, with a second click to confirm.
- **Logs:** the three FinOps IQ Lambda log groups now keep one year, as the API access logs.
- **Tests:** handler specs (every write sets `expiresAt` 24 months on; expired records are not listed, not found and give no report; delete by respondent or Admin only, in any status); the backend synth check asserts time to live on `expiresAt` and one-year log retention on the three functions; the journey test deletes an assessment and checks the notice.
- **Existing records:** none. On 22 Oct 2026 no `FinOpsIqAssessment` table exists in any deployed environment (account 223833501993, ap-south-1: DynamoDB list-tables shows none), so every record will be written with `expiresAt` from the start and no backfill is needed. If a table is deployed from a pre-M6 commit before M7, records written by it would need a one-off update.

## 3. Transfer basis

LTM hosts FinOps IQ in AWS ap-south-1 (FRAMEWORK.md, Hosting). India has no EU adequacy decision and is not approved for transfers under UK law, so personal data from EU and UK users entered in FinOps IQ is transferred to India (GDPR and UK GDPR Chapter V).

- **What is transferred:** mainly commercially confidential organisation data (spend, answers, results), which is not personal data and is protected by confidentiality terms, not by Chapter V. Personal data is limited to the consultant's email, the source IP in access logs, and any names a consultant writes in notes (now discouraged on screen and in the notice).
- **Who exports:** usually LTM's own consultant, an LTM employee working under an LTM entity in the EU or UK, using a system run by the LTM entity that holds the AWS account. That makes it an intra-group transfer from LTM's EU or UK entity to the Indian operating entity.
- **The usual instrument:** an intra-group data transfer agreement incorporating the EU Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914, module one or two), with the UK International Data Transfer Addendum for UK data, each backed by a transfer risk assessment. A group of LTM's size normally has one. Since 5 Feb 2026 (Data (Use and Access) Act 2025, Commencement No. 6 Regulations), UK transfers by appropriate safeguards must meet the "data protection test" (protection not materially lower than in the UK); existing IDTAs and Addenda remain valid, and the transfer risk assessment should be read against that test.
- **Residual risk is low** because the personal data is limited to business contact details and network addresses of LTM staff. It is not nil, and the notice must not name a mechanism LTM does not have.
- **Alternative if no instrument exists:** host the FinOps IQ data for EU and UK clients in an EU or UK AWS region. That is an architecture change for WS-S6, not for this phase.

**Request to LTM's privacy office (ready to send):**

> Subject: FinOps IQ hosting in AWS Mumbai: transfer mechanism for EU/UK users
>
> FinOps IQ, an LTM consulting assessment tool, stores client assessment data in AWS ap-south-1 (Mumbai), in AWS account 223833501993. Personal data held: the LTM consultant's email address; source IP addresses in access logs (kept one year); occasionally names in consultant notes. EU and UK consultants will use it with EU and UK clients. Please confirm: (1) which LTM entity holds this AWS account; (2) the intra-group data transfer agreement (EU SCCs module, UK Addendum or IDTA) that covers transfers from LTM's EU and UK entities to that entity, with its reference; (3) whether a transfer risk assessment covers India and has been reviewed against the UK data protection test since February 2026; (4) the contact details to give for LTM's data protection team in the notice.

## 4. Notice

The data notice is on the start screen and in the report's methodology appendix, from one source (`NOTICES.data`, `v3/public-schema.ts`). Revised after the review (C1, C8):

> LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your answers, your spend figures and your organisation's name, used only to produce this assessment and its report, and the consultant's email address. The assessment needs no personal details about individuals, so please do not enter any. We keep each assessment for two years after its last change and then delete it automatically; ask your consultant to delete it sooner. Access logs, which record the consultant's email and network address, are kept for one year. This version uses no AI features. LTM's privacy notice explains your data protection rights and how to contact LTM's data protection team.

Once LTM confirms the transfer mechanism (section 3), add: "LTM protects this transfer with [the EU Standard Contractual Clauses and the UK Addendum]; ask your consultant for a copy." The report marks the notice and the disclaimer as draft wording until the owner approves. A platform privacy notice page does not exist yet; this text is its FinOps IQ section.

## 5. Counsel review pack

| # | Text | Where it appears | Question for counsel |
|---|---|---|---|
| C1 | Data notice (section 4) | Start screen; report methodology appendix | Is it accurate and sufficient as a transparency notice for EU and UK users? Which transfer mechanism wording to add? |
| C2 | Disclaimer (as reviewed; revised wording in 6.1): "FinOps IQ gives an indicative assessment from the answers and figures you provide. Value figures are an indicative range, not a savings commitment, and need validating against your billing data before any decision. Scoring constants are LTM heuristics unless a source is cited. This is not financial, accounting or legal advice." | Report methodology appendix; page methodology panel | Does it adequately disclaim reliance on value figures ("not a savings commitment")? |
| C3 | Framework attribution (CLM-FIN-033): adapted from the FinOps Framework by the FinOps Foundation, CC BY 4.0, with the changes listed | Page methodology panel; report methodology | Does it meet the CC BY 4.0 attribution terms (D10)? |
| C4 | Trademark wording: no "FinOps IQ™" and no "'FinOps' is a trademark of the FinOps Foundation" sentence (dropped under D10) | Product name everywhere | Is "FinOps IQ" usable as a product name without a trademark statement, or is a statement needed? |
| C5 | Value labels: "Indicative value", "conservative, expected and upper", never "recoverable" or "guaranteed" (F0) | Page and report value sections | Any further wording needed to avoid the range being read as a commitment? |
| C6 | Statement of work draft (consultant-only appendix): indicative scope, no fees | Consultant edition only | Any wording needed before a consultant shares parts of it? |
| C7 | Retention and deletion terms (section 2) | Notice | Is 24 months after the last change appropriate for the data held? |

## 6. Counsel comments register

Reviewer: Claude (AI, acting in a counsel role at the owner's request, 22 Oct 2026). Not a qualified lawyer; see 6.3. Jurisdictions considered: EU (GDPR), UK (UK GDPR as amended by the Data (Use and Access) Act 2025; contract and misrepresentation law of England and Wales), India (DPDP Act 2023 and Rules 2025, as LTM's home law).

### 6.1 Comments

| # | Date | Comment | Response | Status |
|---|---|---|---|---|
| C1 | 22 Oct 2026 | Notice accurate on hosting, retention and no AI, but short of a transparency notice: it did not say who is responsible (GDPR Art. 13(1)(a)), what the data is used for (13(1)(c)), the log retention (13(2)(a)), or where to find rights and contacts (13(2)(b), (d)). The full Art. 13 notice for consultants is LTM's employee privacy notice, so this notice can point to LTM's privacy notice rather than repeat it. "UK data bridge" is informal and out of date after 5 Feb 2026. | Notice revised (section 4): LTM named as responsible, purpose stated, log retention added, pointer to LTM's privacy notice and data protection team, adequacy wording made accurate for both regimes. Mechanism sentence waits for LTM (section 3). | Applied; mechanism open (A1) |
| C2 | 22 Oct 2026 | "Not a savings commitment" works, but the disclaimer did not say the inputs are unverified, did not limit who may rely on the report, and did not point to the contract. In England and Wales a report can found a negligent-misstatement claim by any party known to rely on it (Hedley Byrne; Caparo); a notice-only exclusion is tested for reasonableness (UCTA 1977 s. 2(2), s. 11(3)) and cannot exclude fraud. Tax should be in the "not advice" list, since commitment and pricing choices have tax effects. | Disclaimer revised: inputs "not audited or verified"; "for your organisation's internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it"; "tax" added. No blanket liability exclusion: that belongs in the engagement contract. | Applied |
| C3 | 22 Oct 2026 | Attribution text meets CC BY 4.0 s. 3(a)(1) on creator, licence and changes, and s. 2(a)(6) on non-endorsement, but gave no link to the Framework or to the licence (s. 3(a)(1)(A)(v), (C)). The FinOps Foundation asks for "FinOps Framework by FinOps Foundation", each linked, plus a link to the licence. | Links added on the page's methodology panel and in the report: FinOps Framework (finops.org/framework), FinOps Foundation (finops.org), Creative Commons Attribution licence (creativecommons.org/licenses/by/4.0). End-to-end test checks all three. | Applied |
| C4 | 22 Oct 2026 | No registered "FINOPS" word mark was found in public searches; the term is widely used as the name of a discipline. The FinOps Foundation is a Linux Foundation project, and the LF Projects trademark policy says a project mark "should not be used as part of your product name" and that use must not imply endorsement. Dropping the ™ symbol and the unverified "'FinOps' is a trademark of the FinOps Foundation" sentence is correct, since that sentence asserts a fact not shown. "FinOps IQ" is defensible as descriptive use of a generic discipline name, with the non-endorsement sentence kept and no FinOps Foundation logo, but the risk is not zero. | No change to the product name. Kept: non-endorsement sentence, no logo, "FinOps Foundation" used only to refer to it. Action A2: before the first external client, search the UKIPO, EUIPO, USPTO and Indian registers for FINOPS (an hour's work), or ask trademarks@lfprojects.org. If a registered mark covers consulting or software, rename (for example "LTM Cloud Cost IQ"). | Open (A2) |
| C5 | 22 Oct 2026 | Value labels are sound: every figure carries "Indicative value range (conservative / expected / upper), net of estimated implementation cost: not a savings commitment; evidence validation required"; the banned-words lint stops "recoverable" and "guaranteed". This is a business-to-business assessment, so consumer-protection law does not apply; the main risk is misrepresentation (Misrepresentation Act 1967 s. 2(1)), which the label and the C2 disclaimer address. | No change. Keep the label next to every figure, including in any slide or email that quotes a figure (consultant playbook). | Closed |
| C6 | 22 Oct 2026 | SOW draft is consultant-only, but if parts are shared they could be read as an offer. It needs "subject to contract" wording. | Callout now reads "Draft for discussion, subject to contract: not an offer or a quotation." | Applied |
| C7 | 22 Oct 2026 | Twenty-four months after the last change meets storage limitation (GDPR Art. 5(1)(e)) for an advisory assessment that clients revisit at their next review cycle. The reason is recorded (section 2). Logs at one year are proportionate. Deletion on request covers Art. 17. LTM does not need the stored record to defend a claim, since the report itself is issued to the client. | No change. | Closed |
| C8 | 22 Oct 2026 | Additional: consultant notes are free text and could hold names or opinions about client staff, which would bring in GDPR Art. 14 for those people. Data minimisation (Art. 5(1)(c)) favours telling users not to. | Notes label now says "Do not record personal details about individuals"; the notice says the assessment needs none. | Applied |
| C9 | 22 Oct 2026 | Additional: India's DPDP Act 2023 applies to LTM's processing in India. Its notice, security, breach and retention duties under the DPDP Rules 2025 apply from about 13 May 2027 (18 months after notification). FinOps IQ's limited personal data and retention rule fit those duties. The platform needs a DPDP-compliant notice and breach process by then. | Routed to WS-S6 (platform), not this phase. | Routed |

### 6.2 Actions for LTM

| # | Action | Who | Blocks |
|---|---|---|---|
| A1 | Send the section 3 request to LTM's privacy office; add the confirmed mechanism and data protection contact to the notice | Owner | External EU/UK use |
| A2 | Trademark register search for FINOPS (UKIPO, EUIPO, USPTO, India), or ask trademarks@lfprojects.org | Owner | First external client |
| A3 | Approve the revised notice and disclaimer (sections 4, 6.1 C2) | Owner | Done 22 Oct 2026; draft markers removed |

### 6.3 Limits of this review

This review checks the wording against the texts cited and flags risks. It cannot confirm facts about LTM's contracts (A1), cannot search the trademark registers' live databases (A2), and is not insured advice. Internal consultant use can proceed on it. Before the first external client, a qualified lawyer, ideally from LTM's legal team, should read sections 3, 4 and 6 (about an hour's review).

Sources: [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj); [Commission Decision 2021/914](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj); [ICO international transfers guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/); [DUAA commencement, Burges Salmon](https://www.burges-salmon.com/articles/102mh1d/the-data-use-and-access-act-2025-key-implications-for-businesses-as-the-new-in/); [CC BY 4.0 legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en); [FinOps Foundation attribution guidance](https://www.finops.org/introduction/how-to-use/); [LF Projects trademark policy](https://lfprojects.org/policies/trademark-policy/); [DPDP Rules 2025 timeline, JSA](https://www.jsalaw.com/?p=55573).
