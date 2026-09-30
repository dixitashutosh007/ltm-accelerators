# Cost IQ v9.1 Deployment & Pilot Runbook

## 1. Prepare
- Confirm target LTM portal host, SSO, API gateway, PostgreSQL and object storage owners.
- Confirm environment: DEV first, then controlled PILOT.
- Confirm single approver and methodology owner.

## 2. Configure
- Load `contracts/environment.json` into the host integration mapping.
- Set runtime API base URL through environment configuration.
- Configure SSO claims mapping.
- Configure database connection using platform secret management.
- Configure evidence object-store bucket/container and server-side encryption.
- Apply database/schema.sql.

## 3. Deploy
1. Deploy backend behind the enterprise API gateway.
2. Deploy runtime/host assets into the portal shell.
3. Verify TLS, CSP, authentication and authorization.
4. Run smoke tests.
5. Run UAT-01 through UAT-08.
6. Obtain LTM platform/security sign-offs.
7. Run UAT-09 through UAT-14 with pilot users.

## 4. Pilot
- Use 3–5 controlled assessments.
- Capture completion time, confusion points, technical defects, finding usefulness, opportunity usefulness, report usefulness and benchmark usefulness.
- Do not use pilot observations as production savings factors until methodology governance approves them.

## 5. Exit
Pilot exit requires:
- No open Sev-1/Sev-2 defects.
- All LTM gates in UAT matrix completed or explicitly waived.
- Security checklist approved.
- Feedback reviewed.
- Release decision recorded.

## Rollback
Disable the Cost IQ portal route and API route, preserve audit records, and retain assessment/evidence data according to host policy. Do not delete pilot evidence as part of a rollback.
