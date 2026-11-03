# User activity runbook (platform workstream P2)

**Date:** 3 Nov 2026. The Activity tab of the Access Control screen shows who has signed in and when, and the status and times of each person's assessments.

## What is recorded
| Fact | Source | Kept |
|---|---|---|
| The person's address, first and last sign-in, and the number of sign-ins | The Cognito post-authentication trigger, on every sign-in | 12 months after the last sign-in |
| Each sign-in time | Same | 12 months after that sign-in |
| For each assessment: accelerator, assessment ID, status, stage and percent (when given), started, last saved, completed | The FinOps IQ, Sovereign IQ and Resilience IQ assessment services, on save, complete and archive | 12 months after the last save |

**Not recorded:** answers, results, client names, notes, IP addresses, devices, or anything a person typed. Deleting an assessment (FinOps IQ, Sovereign IQ) removes its activity record too.

Storage is a DynamoDB table of its own (`UserActivity`, stack `ActivityStack`): deletion protection on, point-in-time recovery on, kept if the stack is removed. Items carry `expiresAt` and DynamoDB removes them within about two days of that time.

## Who can see it
Administrators only: the Admin group and the super administrators. The services behind the screen are read-only. The sign-in recorder and the assessment services can write one person's items and nothing else; none of them can read the table.

## The screen
- A list of everyone in the user pool with first and last sign-in, number of sign-ins, assessments (done and in progress) and the last time one was saved. Search by name or address, or show only people who have never signed in.
- **Details** shows the latest sign-ins and every assessment record of one person.
- Two CSV downloads: people, and assessments. Cells that begin with `=`, `+`, `-` or `@` are prefixed with a quote so a spreadsheet cannot run them.
- A person whose account was removed is shown as "account removed" until their records expire.

## Notice to staff (wording to agree before the screen is used)
> LTM Vantage records when you sign in and the status and dates of the assessments you start, save or complete (which tool, the assessment reference, and the times). It does not record your answers or your clients' names in this log. Administrators can see this log to manage access and support users. Records are deleted 12 months after they were last updated.

Owner decision needed on the wording, and on whether privacy and legal review it before the tab is switched on for all administrators.

## Known limits
- **A sign-in is a password sign-in.** A person who stays signed in on a refresh token is not shown signing in again. "Last sign-in" can therefore be older than their last activity; "last assessment saved" is the better sign of use.
- **Assessments from five tools are not recorded yet:** Cloud IQ, Strategy IQ, Modernize IQ, Cost IQ and AI Readiness IQ keep their data in the browser or elsewhere. They arrive with the shared saved-sessions work (P3).
- **Stage is not recorded yet.** The field and the screen are ready; each tool's stage names and percent complete come with P3 (Resilience IQ's with its page rebuild, RQ6).
- Statuses are those the tools use: draft, in progress, completed, archived.
- The list reads the whole table, which suits a few hundred people. Beyond about 2,000 accounts it needs an index.
- Access Control is shown to super administrators on the page; the services accept any administrator.

## Tests
`activity-store.spec.ts` (what is stored, expiry, counts, CSV safety), `activity-recorder.spec.ts` (best effort), `amplify/auth/triggers.spec.ts`, the assessment service specs (a save records, a refused save does not, a failing table never stops a save), `services/reports-service/test/handler.test.mjs`, and `npm run check:backend` (the table keeps and expires its items, and who may write or read it).
