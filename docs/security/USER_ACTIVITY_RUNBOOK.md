# User activity runbook (platform workstream P2)

**Date:** 3 Nov 2026. The Activity tab of the Access Control screen shows who has signed in and when, and the status and times of each person's assessments.

## What is recorded
| Fact | Source | Kept |
|---|---|---|
| The person's address, first and last sign-in, and the number of sign-ins | The Cognito post-authentication trigger, on every sign-in | 12 months after the last sign-in |
| Each sign-in time | Same | 12 months after that sign-in |
| For each assessment: accelerator, the client's name (from 10 Nov 2026), assessment ID, status, stage and percent (when given), started, last saved, completed | The FinOps IQ, Sovereign IQ and Resilience IQ assessment services, on save, complete and archive | 12 months after the last save |

**Not recorded:** answers, results, notes, IP addresses, devices, or anything a person typed. Deleting an assessment (FinOps IQ, Sovereign IQ) removes its activity record too.

Storage is a DynamoDB table of its own (`UserActivity`, stack `ActivityStack`): deletion protection on, point-in-time recovery on, kept if the stack is removed. Items carry `expiresAt` and DynamoDB removes them within about two days of that time.

## Who can see it
Administrators only: the Admin group and the super administrators. The services behind the screen are read-only. The sign-in recorder and the assessment services can write one person's items and nothing else; none of them can read the table.

## The screen
- A list of everyone in the user pool with first and last sign-in, number of sign-ins, assessments (done and in progress) and the last time one was saved. Search by name or address, or show only people who have never signed in.
- **Details** shows the latest sign-ins and every assessment record of one person.
- Two CSV downloads: people, and assessments. Cells that begin with `=`, `+`, `-` or `@` are prefixed with a quote so a spreadsheet cannot run them.
- A person whose account was removed is shown as "account removed" until their records expire.

## All assessments (10 Nov 2026)
The Activity tab has two views: **People** (as above) and **All assessments**: every assessment by everyone, newest save first, with the client, accelerator, person, status, stage and percent, and started, last-saved and completed times. Filter by client or person, accelerator, and status (not finished, completed, archived); a line above the table counts them. Served by `GET /api/activity/assessments` (administrators only). The assessments CSV now starts with the client column.

**Assessments saved before the log existed** are added once with `scripts/backfill-activity.mjs` (dry run by default; `--write` to write). It reads each tool's table, keeps each assessment's own times, never overwrites a record a live save wrote, and can be re-run safely:
```
node scripts/backfill-activity.mjs --api <AppSync API id> --activity-table <UserActivity table> --user-pool <pool id> --write
```

## Notice to staff
Draft wording for counsel, the legal questions to settle, and where to show it are in `USER_ACTIVITY_NOTICE.md`. The Activity tab carries the short notice. The link to the full notice is not in the tab yet: after counsel approves the text, publish it as a page that needs no sign-in and add the link to the tab and the sign-in screen. Administrators should not use the tab before the full notice is live.

## Known limits
- **A sign-in is a password sign-in.** A person who stays signed in on a refresh token is not shown signing in again. "Last sign-in" can therefore be older than their last activity; "last assessment saved" is the better sign of use.
- **Covered tools:** FinOps IQ, Sovereign IQ, Resilience IQ and Cost IQ (their own assessment services), and Cloud IQ, Strategy IQ and Modernize IQ (saved sessions, P3). AI Readiness IQ is not: it has no access control yet.
- **Stage and percent** are recorded when the tool sends them (P3); a record without them shows "not recorded".
- Statuses are those the tools use: draft, in progress, completed, archived.
- The list reads the whole table, which suits a few hundred people. Beyond about 2,000 accounts it needs an index.
- Access Control is shown to super administrators on the page; the services accept any administrator.

## Tests
`activity-store.spec.ts` (what is stored, expiry, counts, CSV safety), `activity-recorder.spec.ts` (best effort), `amplify/auth/triggers.spec.ts`, the assessment service specs (a save records, a refused save does not, a failing table never stops a save), `services/reports-service/test/handler.test.mjs`, and `npm run check:backend` (the table keeps and expires its items, and who may write or read it).
