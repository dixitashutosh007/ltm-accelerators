# Resilience IQ — Handover to Claude

**Date:** 11 Oct 2026  
**Repository:** `dixitashutosh007/ltm-accelerators`  
**Active branch:** `resilience-iq-dev`  
**Do not modify:** `main`

## 1. Situation in one paragraph

Resilience IQ is a vendor-neutral CIO/CTO Business Continuity and Disaster Recovery advisory accelerator. The product itself is substantially implemented, but Amplify Gen 2 deployment became unstable when assessment persistence/authentication/backend changes were introduced. Multiple deployments failed after a last-known-good Deployment 6. The user has now confirmed **another deployment failed**. Amplify Console in this environment does not expose useful build error details, and there are no actionable CloudFormation failure details either. Therefore the debugging method must be **Git-based isolation + small controlled commits + Amplify pass/fail**, not repeated requests for logs.

## 2. Current Git state

Current `resilience-iq-dev` HEAD:

`89c49163dd1f1ba9e04f02c7f0156380f776427c`

This is the newly added `AGENT.md` commit.

Its parent was:

`7b2a57294e65e54a35ff2f62bccffcfdf447eafe`

`7b2a572...` added only:

`echo "Resilience IQ diagnostic: Amplify build reached backend phase"`

to `amplify.yml`.

**Important:** the branch currently contains the persistence work and is **not deployment-verified**. The user just reported that the latest deployment failed.

### Preservation branch

`resilience-iq-persistence-wip`

This preserves the persistence work including commit:

`729f4bbc805c383598d77da9080eb10ae328f463`

Do not delete it.

## 3. Last known-good deployment

The key baseline is:

**Deployment 6**
- Commit: `34dd1e1f31b8ebc092a8e67044fe20ba7c34ea7c`
- Message: `Validate hosted Resilience IQ advisory asset packaging`
- This was the last known-good hosted deployment in the persistence investigation.

Earlier successful deployments:
- Deployment 5 — Load Resilience IQ advisory bank from hosted accelerator assets
- Deployment 4 — Package Resilience IQ question bank for hosted advisory flow

Failed deployments after that:
- Deployment 7 — Enforce Resilience IQ validation
- Deployment 8 — Add authenticated Resilience IQ assessment API
- Deployment 9 — Grant assessment Lambda access
- Deployment 10 — Harden assessment handler request ID

A later question-bank fix and diagnostic commit did not establish a successful deployment.

## 4. Key regression timeline

Important commits after Deployment 6:

- `aecdf5d7f0e457300849bb321d5d03dc74095dfd`
  - Enforce Resilience IQ validation in Amplify builds.
  - Exposed missing `ui.instruction` on 13 interactive questions.

- `729f4bbc805c383598d77da9080eb10ae328f463`
  - Fix Resilience IQ question-bank build validation.
  - Added `ui.instruction` to EX-06, EX-07, EX-09, EX-10, EX-11, EX-12, EX-13, EX-14, EX-15, EX-16, EX-17, EX-19, EX-20.

Persistence/authentication sequence includes:

- `552b73bc25c93f797fcb5011c240596cc90b1678` — authenticated persistence handler
- `f3baba60606945344a38400b6442057e7d462948` — persistence function
- `621e4d022a6556f4e92170be1080d91fa0d7045b` — function protected data access
- `f78afa18be659791dbe0d797554786bb30d0e570` — authenticated assessment API
- `b3c8830ffb957beb56dbd4942b60e57876894723` — ownership/archive lifecycle
- `250458740db8cb5af444aac4854077d98e52d100` — Cognito authorizer import
- `3354d9945fb024507f4df72abc29567bef278941` — persistence contract validation
- `38e96c4131cf871b627f90d5d3f87a434bd0f9f4` — Amplify model filter
- `836ccdd2160cad1f76999cba91d1aa70feb43e5a` — authenticated persistence build validation
- `0c0312dcfdca48bfc4603360f508399c64383283` — authorization regression tests
- `bbd91be4e02da0151e71c9698a616b0df7073121` — persistence API test command
- `cbe0fbee9d5e7fa422d8feff5942ba7d7e645f03` — run persistence API tests in Amplify builds
- `bdc9423e280c7fddd87d23d566dd2fb667096f76` — schema-level function access
- `1959143dc0a04e5b7d27332b391ae839dcb32a3e` — request ID hardening
- `7b2a57294e65e54a35ff2f62bccffcfdf447eafe` — harmless backend-phase diagnostic

## 5. Amplify constraint

Do **not** ask the user to find build logs again.

The user has explicitly established:

- Amplify Console does not show a usable build-error reason in their setup.
- They do not see useful `CREATE_FAILED` / `UPDATE_FAILED` details in CloudFormation.
- GitHub Actions is not responsible; previous checks showed zero GitHub Actions runs for the relevant branch.

Use the deployment itself as a binary signal.

Amplify backend commands:

```
npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --outputs-out-dir . --outputs-version 1
npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID --out-dir . --outputs-version 1
```

## 6. Current architecture

### Auth

`amplify/auth/resource.ts`

- email login
- Cognito groups: `Admin`, `Consultant`
- App-level authentication is the intended browser model.

**Do not create a second independent Cognito/browser login flow.**

### Data

`amplify/data/resource.ts`

Models include:

- Accelerator
- QuestionBank
- ScoringModel
- ResilienceAssessment
- AssessmentSubmission
- ResilienceEvidence
- UserAllowlist

ResilienceAssessment stores assessment identity, client/respondent information, lifecycle status, version metadata, answers, result, decision log, recommendation sensitivity, and timestamps.

Lifecycle:

`draft → in_progress → completed → archived`

Completed and archived assessments are intended to be immutable except for archive lifecycle behavior.

### Persistence Lambda

`amplify/functions/manage-resilience-assessment/`

The handler:

- validates Cognito authorization
- checks Admin/Consultant group membership
- applies respondent ownership
- supports GET/POST
- persists via Amplify Data/AppSync GraphQL
- uses lifecycle validation
- uses immutable completed/archived semantics
- now uses `randomUUID()` for request IDs

### HTTP API

`amplify/backend.ts` adds:

`/api/resilience-iq/assessment`

with Lambda integration and Cognito User Pool authorizer.

The patterns used for `HttpUserPoolAuthorizer` and schema-level `allow.resource(function).to(['query','mutate'])` were checked against AWS/Amplify documentation and are valid patterns. They should still be isolated during diagnosis rather than assumed correct.

## 7. Frontend/runtime

Main UI:

`Accelerators/resilience-iq.html`

Features:

- LTM dark/coral UI
- 20 executive questions
- hosted dynamic advisory question bank
- evaluation API
- scoring
- recommendation
- blueprint
- evidence
- executive report

Question bank:

`resilience-iq/knowledge/question-bank.json`

Engine:

`packages/engine-core/src/accelerators/resilience-iq/runtime.ts`

The engine includes:

- weighted domain scoring
- evidence confidence
- critical exposure
- maturity
- recommendation confidence/sensitivity
- pattern ranking
- eliminated patterns
- mandatory controls
- gap register
- evidence requests/register
- technology options
- blueprint
- roadmap
- decision log
- executive report

Ratings:

- 0–39 Critical Exposure
- 40–59 Fragile
- 60–74 Managed
- 75–89 Resilient
- 90–100 Adaptive

## 8. Knowledge foundation

`resilience-iq/knowledge/` includes:

- `frameworks.json`
- `patterns.json`
- `blueprints.json`
- `assessment-model.json`
- `scoring-model.json`
- `decision-matrix.json`
- `implementation-mappings.json`
- `question-bank.json`
- `decision-tree.json`
- `recommendation-model.json`
- `blueprint-engine.json`
- `executive-report.json`
- `assessment-persistence.json`

The design is vendor-neutral and maps to AWS/Azure/GCP.

## 9. Current product maturity

Implemented:

- product definition
- knowledge foundation
- Executive Scan
- scoring
- recommendation
- blueprint
- executive report

Incomplete / under validation:

- reliable advisory deployment
- assessment persistence
- browser end-to-end authentication/RBAC integration
- workspace/resume
- evidence upload
- production hardening
- production launch

## 10. What to do next

Do **not** rewrite the product.

First inspect the exact current tree and `amplify.yml`.

Then isolate deployment failure using Git:

### Preferred diagnostic ladder

1. Compare current HEAD against `34dd1e1...`.
2. Establish whether the Deployment-6 tree itself still deploys.
3. If baseline deploys, reintroduce changes in small layers:
   - persistence function/resource
   - data authorization
   - HTTP API route/authorizer
   - handler hardening
   - validation/test commands
4. Deploy after each meaningful layer.
5. The first failing layer is the investigation target.
6. Preserve every successful checkpoint in Git.
7. Never touch `main`.

A particularly important point: the current branch has already accumulated a lot of persistence changes. Do not make another large combined fix.

## 11. User expectations

The user wants practical execution, not repeated clarification loops.

When a step is obvious and does not require user input, execute it.

Do not stop at every small milestone with “shall I continue?”

When a real blocker exists, state exactly what is blocked and why.

## 12. Useful URLs

GitHub repository:

https://github.com/dixitashutosh007/ltm-accelerators

Resilience IQ Amplify environment:

https://resilience-iq-dev.d199dq940iqyj2.amplifyapp.com/

