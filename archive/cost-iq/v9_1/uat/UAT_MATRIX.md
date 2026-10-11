# Cost IQ v9.1 UAT Matrix

| ID | Scenario | Expected | Reference status |
|---|---|---|---|
| UAT-01 | Open host without API | Host renders and identifies API unavailable | PASS by inspection |
| UAT-02 | API health | 200, release 9.1.0 | PASS locally |
| UAT-03 | Resolve principal | subject + roles returned | PASS locally |
| UAT-04 | Create assessment | 201 + assessment ID + ETag | PASS locally |
| UAT-05 | Load assessment | 200 + same ID | PASS locally |
| UAT-06 | Save assessment with matching ETag | 200 + version increment | PASS locally |
| UAT-07 | Save with stale ETag | 412 + current ETag | PASS locally |
| UAT-08 | Evidence metadata | 201 + storage key/hash metadata | PASS locally |
| UAT-09 | Audit trail persistence | event captured by target backend | LTM GATE |
| UAT-10 | Real SSO | host identity claims reach runtime | LTM GATE |
| UAT-11 | Real evidence store | object stored outside DB; metadata persisted | LTM GATE |
| UAT-12 | Browser UAT | CIO can complete assessment and report flow | LTM GATE |
| UAT-13 | Security review | controls approved by LTM security | LTM GATE |
| UAT-14 | Retention/deletion | host policy enforced | LTM GATE |

## Pilot acceptance criteria
A pilot is accepted only when UAT-09 through UAT-14 are executed in the target LTM environment and any Sev-1/Sev-2 defects are closed or explicitly waived by the single approver.
