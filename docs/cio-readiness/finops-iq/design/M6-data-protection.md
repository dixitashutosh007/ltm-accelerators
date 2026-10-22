# FinOps IQ M6: client-data protection and counsel review

Execution phase M6 (PLAN F11, shared workstream WS-S6). Status at 22 Oct 2026. Prepared by the build; the owner approves, counsel reviews. Not legal advice.

**Gate F11:** notice published; retention job tested; counsel comments recorded in the register (section 6).

| Item | Status |
|---|---|
| 1 Data inventory | Done (section 1) |
| 2 Transfer basis | Drafted; LTM to confirm the mechanism it has signed (section 3) |
| 3 Notice | Updated with retention; on the start screen and in the report; wording awaits owner and counsel approval (section 4) |
| 4 Retention | Built and tested: 24 months after the last change, deletion at the client's request (section 2) |
| 5 Counsel review | Pack ready (section 5); comments register empty until counsel replies (section 6) |

---

## 1. Data inventory (FinOps IQ v3)

| Data | Who it is about | Where it is held | How long |
|---|---|---|---|
| Client organisation name, sector | The client organisation | `FinOpsIqAssessment` (Amplify Data, DynamoDB, AWS ap-south-1 Mumbai) | 24 months after the last change, or until deleted |
| Answers and estate facts: providers, scopes, spend by scope and currency, value-base inputs (shares, utilisation, internal cost rate) | The client organisation (commercially confidential, not personal data) | `requestJson` in the same record | As above |
| Server-computed result (ratings, findings, value range, roadmap, platform actions) | The client organisation | `resultJson` in the same record | As above |
| Consultant notes (consultant-only; never in the client view or client edition) | The client organisation; may name people if a consultant writes names | `consultantNotes` in the same record | As above |
| Respondent email: the consultant who runs the assessment | The consultant (personal data) | `respondentEmail` in the same record; the Cognito user pool (platform sign-in) | Record: as above. User pool: platform account lifecycle, outside FinOps IQ |
| Report PDF and backlog CSV | The client organisation | Generated on request from the stored record; not stored by LTM (`Cache-Control: no-store`); the downloaded file is held by whoever downloads it | Not retained by LTM |
| Scoring requests (`POST /api/evaluate/finops-iq/v3`) | The client organisation | Processed in memory; not stored | Not retained |
| API access logs: request ID, time, source IP, method, route, status, latency, caller email, authorizer error | The consultant (IP address and email are personal data) | CloudWatch Logs, ap-south-1 | One year (`RetentionDays.ONE_YEAR`) |
| Lambda logs for the three FinOps IQ functions: errors with the request ID and the error object; deletions with the assessment ID. Request and response bodies are not logged | Mainly operational | CloudWatch Logs, ap-south-1 | One year (set in M6; previously kept forever) |
| Browser | — | No assessment data in browser storage (the page saves and resumes on the server); the platform session token only | Session |

**Not in FinOps IQ v3:** AI features, file upload, the S3 report archive. The current FinOps IQ and FinOps Value Case pages stay live with the F0 review banner until M8 (D18). They keep their own flows: the old FinOps IQ page holds its state in browser `localStorage`, and FinOps Value Case can archive a PDF to the shared S3 reports bucket. They are retired at M8; the shared reports bucket's retention is a platform question for WS-S6, outside this phase.

## 2. Retention (built)

- **Rule (owner decision 22 Oct 2026):** each assessment is kept for 24 months after its last change, then deleted automatically; sooner at the client's request. One constant (`RETENTION_MONTHS`, `v3/retention.ts`) drives both the deletion date and the notice wording.
- **Mechanism:** every write (save, complete, archive) sets `expiresAt` to 24 months later; DynamoDB time to live on `expiresAt` deletes the record (`amplify/backend.ts`). Time to live removes an item within days of expiry, not at once, so the stores treat a record past `expiresAt` as already deleted: it is not listed, not opened and gives no report.
- **Deletion at the client's request:** `POST /api/finops-iq/assessment { action: "delete", assessmentId }`, by the respondent or an Admin, in any status; permanent. The page offers Delete on each saved assessment, with a second click to confirm.
- **Logs:** the three FinOps IQ Lambda log groups now keep one year, as the API access logs.
- **Tests:** handler specs (every write sets `expiresAt` 24 months on; expired records are not listed, not found and give no report; delete by respondent or Admin only, in any status); the backend synth check asserts time to live on `expiresAt` and one-year log retention on the three functions; the journey test deletes an assessment and checks the notice.
- **Existing records:** records saved before M6 have no `expiresAt`, and time to live never deletes them. Each gains it on its next write. Before go-live (M7), any record without it is to be given one, 24 months from its last change, by a one-off update.

## 3. Transfer basis (draft, for LTM to confirm)

LTM hosts FinOps IQ in AWS ap-south-1 (FRAMEWORK.md, Hosting). India has no EU adequacy decision and is not covered by a UK data bridge, so EU and UK client data entered in FinOps IQ is transferred to India.

- **What is transferred:** mainly commercially confidential organisation data (spend, answers, results). Personal data is limited to the consultant's email, the source IP in access logs, and any names a consultant writes in notes.
- **Basis to rely on (as for Sovereign IQ, S10):** EU Standard Contractual Clauses (Commission Decision 2021/914), and for the UK the IDTA or the UK Addendum to the SCCs, each with a transfer risk assessment. Since the Data (Use and Access) Act 2025, UK transfers rest on the "data protection test" (UK GDPR Art. 44A); counsel to confirm the UK wording.
- **For LTM to confirm:** which instrument is in place between the LTM entity that contracts with the client and the entity operating the AWS account; whether a transfer risk assessment exists. Until then the notice states the transfer but names no mechanism.

## 4. Notice

The data notice is on the start screen and in the report's methodology appendix, from one source (`NOTICES.data`, `v3/public-schema.ts`):

> LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which does not have an EU adequacy decision or a UK data bridge. We collect your answers, your spend figures, your organisation's name and the consultant's email address to produce the report. We keep each assessment for two years after its last change and then delete it automatically; ask your consultant to delete it sooner. This version uses no AI features.

Once LTM confirms the transfer mechanism, add: "LTM relies on [EU Standard Contractual Clauses / the UK IDTA or Addendum] and a transfer risk assessment." The report marks the notice and the disclaimer as draft wording until approved. A privacy notice page for the platform does not exist yet; this text is its FinOps IQ section.

## 5. Counsel review pack

| # | Text | Where it appears | Question for counsel |
|---|---|---|---|
| C1 | Data notice (section 4) | Start screen; report methodology appendix | Is it accurate and sufficient as a transparency notice for EU and UK users? Which transfer mechanism wording to add? |
| C2 | Disclaimer: "FinOps IQ gives an indicative assessment from the answers and figures you provide. Value figures are an indicative range, not a savings commitment, and need validating against your billing data before any decision. Scoring constants are LTM heuristics unless a source is cited. This is not financial, accounting or legal advice." | Report methodology appendix; page methodology panel | Does it adequately disclaim reliance on value figures ("not a savings commitment")? |
| C3 | Framework attribution (CLM-FIN-033): adapted from the FinOps Framework by the FinOps Foundation, CC BY 4.0, with the changes listed | Page methodology panel; report methodology | Does it meet the CC BY 4.0 attribution terms (D10)? |
| C4 | Trademark wording: no "FinOps IQ™" and no "'FinOps' is a trademark of the FinOps Foundation" sentence (dropped under D10) | Product name everywhere | Is "FinOps IQ" usable as a product name without a trademark statement, or is a statement needed? |
| C5 | Value labels: "Indicative value", "conservative, expected and upper", never "recoverable" or "guaranteed" (F0) | Page and report value sections | Any further wording needed to avoid the range being read as a commitment? |
| C6 | Statement of work draft (consultant-only appendix): indicative scope, no fees | Consultant edition only | Any wording needed before a consultant shares parts of it? |
| C7 | Retention and deletion terms (section 2) | Notice | Is 24 months after the last change appropriate for the data held? |

## 6. Counsel comments register

| # | Date | Comment | Response | Status |
|---|---|---|---|---|
| — | — | No comments received yet. The pack (section 5) is ready to send. | — | Open |
