# AGENT.md — LTM Accelerators / Resilience IQ

## Mission

This repository contains the LTM Accelerators suite. The active workstream is **Resilience IQ**, a vendor-neutral Business Continuity / Disaster Recovery advisory accelerator for CIO/CTO buyers.

The immediate priority is to make the Resilience IQ branch deploy reliably on AWS Amplify Gen 2 **without disturbing `main`**, then complete assessment persistence/authentication/workspace integration.

## Critical operating rules

1. **Never modify `main`** while working on Resilience IQ unless the user explicitly asks.
2. Active development branch: **`resilience-iq-dev`**.
3. Amplify environment/URL used for this work:
   - `https://resilience-iq-dev.d199dq940iqyj2.amplifyapp.com/`
4. The user has explicitly stated that their Amplify Console setup does **not expose usable build-error logs** and they do **not** see actionable `CREATE_FAILED` / `UPDATE_FAILED` information in CloudFormation. Do not repeatedly ask the user to retrieve those logs.
5. GitHub Actions is not the deployment mechanism for this branch. Previous API checks showed zero GitHub Actions runs for the relevant commits. Deployment failures are occurring in the Amplify pipeline.
6. Do not claim an Amplify deployment succeeded unless the user explicitly confirms it or there is direct reliable evidence.
7. Prefer Git history, controlled commits, static inspection, and binary Amplify deployment results when diagnosing failures.
8. Preserve working functionality. Avoid broad refactors during deployment diagnosis.
9. Do not introduce a second authentication system for the browser. The user's intended model is **App-level authentication with Amplify/Cognito**; the assessment API should use the authenticated identity rather than forcing a separate login.
10. When a change is speculative, say so clearly and isolate it in a small commit.

## Current deployment diagnosis

The last known-good Amplify deployment in the original persistence investigation was:

- Deployment 6
- Commit: `34dd1e1f31b8ebc092a8e67044fe20ba7c34ea7c`
- Message: `Validate hosted Resilience IQ advisory asset packaging`

The persistence/authentication work introduced after that point repeatedly failed Amplify deployment.

The current `resilience-iq-dev` HEAD is:

- `7b2a57294e65e54a35ff2f62bccffcfdf447eafe`
- `Add harmless Amplify build diagnostic step`

That latest commit only adds this backend build command to `amplify.yml`:

`echo "Resilience IQ diagnostic: Amplify build reached backend phase"`

Its parent is `ee1e19e79e232a84bd1c2d69fcf6e74658968f49`.

The user has now reported that **another deployment failed**. Treat the current branch as **not deployment-verified**.

## Preservation branch

All persistence work was preserved in:

- `resilience-iq-persistence-wip`

Earlier this branch was created from:

- `729f4bbc805c383598d77da9080eb10ae328f463`
- `Fix Resilience IQ question-bank build validation`

Do not delete this preservation branch.

## Amplify deployment history relevant to diagnosis

From the user's Amplify deployment history:

- Deployment 10 — Failed — `Harden assessment handler request...`
- Deployment 9 — Failed — `Grant assessment Lambda access...`
- Deployment 8 — Failed — `Add authenticated Resilience I...`
- Deployment 7 — Failed — `Enforce Resilience IQ validati...`
- Deployment 6 — Deployed — `Validate hosted Resilience IQ ...`
- Deployment 5 — Deployed — `Load Resilience IQ advisory ba...`
- Deployment 4 — Deployed — `Package Resilience IQ question...`

The exact Amplify failure reason is not available in the user's Console setup.

## Important commit sequence

Key commits around the regression:

- `34dd1e1f31b8ebc092a8e67044fe20ba7c34ea7c` — last known-good Deployment 6
- `aecdf5d7f0e457300849bb321d5d03dc74095dfd` — enforce Resilience IQ validation
- `552b73bc25c93f797fcb5011c240596cc90b1678` — add authenticated persistence handler
- `f3baba60606945344a38400b6442057e7d462948` — add persistence function
- `621e4d022a6556f4e92170be1080d91fa0d7045b` — grant persistence function protected data access
- `f78afa18be659791dbe0d797554786bb30d0e570` — add authenticated assessment API
- `b3c8830ffb957beb56dbd4942b60e57876894723` — harden ownership/archive lifecycle
- `250458740db8cb5af444aac4854077d98e52d100` — keep Cognito authorizer import
- `3354d9945fb024507f4df72abc29567bef278941` — validate persistence contract
- `38e96c4131cf871b627f90d5d3f87a434bd0f9f4` — use Amplify model filter type
- `836ccdd2160cad1f76999cba91d1aa70feb43e5a` — validate authenticated persistence during builds
- `0c0312dcfdca48bfc4603360f508399c64383283` — persistence authorization regression tests
- `bbd91be4e02da0151e71c9698a616b0df7073121` — persistence API test command
- `cbe0fbee9d5e7fa422d8feff5942ba7d7e645f03` — run persistence API tests in Amplify builds
- `bdc9423e280c7fddd87d23d566dd2fb667096f76` — grant assessment Lambda access at schema level
- `1959143dc0a04e5b7d27332b391ae839dcb32a3e` — harden request ID generation
- `729f4bbc805c383598d77da9080eb10ae328f463` — fix question-bank build validation
- `7b2a57294e65e54a35ff2f62bccffcfdf447eafe` — add harmless Amplify backend-phase diagnostic

## Question-bank validation fix

At `aecdf5...`, Resilience IQ question-bank validation exposed 13 interactive questions missing `ui.instruction`:

EX-06, EX-07, EX-09, EX-10, EX-11, EX-12, EX-13, EX-14, EX-15, EX-16, EX-17, EX-19, EX-20.

These were fixed in `729f4bbc...`.

## Persistence architecture

### Auth

`amplify/auth/resource.ts` uses Amplify Auth with email login and Cognito groups:

- `Admin`
- `Consultant`

### Data

`amplify/data/resource.ts` contains:

- Accelerator
- QuestionBank
- ScoringModel
- ResilienceAssessment
- AssessmentSubmission
- ResilienceEvidence
- UserAllowlist

ResilienceAssessment stores:

- assessmentId
- clientName
- clientSector
- respondentEmail
- status
- questionBankVersion
- scoringModelVersion
- decisionTreeVersion
- blueprintEngineVersion
- executiveReportVersion
- engineVersion
- answersJson
- resultJson
- decisionLogJson
- recommendationSensitivityJson
- startedAt
- completedAt
- finalizedAt

Lifecycle:

- draft
- in_progress
- completed
- archived

Intended access is protected; public persistence must remain false.

### Assessment API

`amplify/functions/manage-resilience-assessment/` contains the persistence Lambda.

The handler supports GET/POST assessment operations, Cognito group authorization, respondent ownership checks, lifecycle transitions, immutable completed/archived behavior, and AppSync/Amplify Data GraphQL persistence.

`amplify/backend.ts` also contains the HTTP API integration and Cognito User Pool authorizer for:

`/api/resilience-iq/assessment`

The CDK `HttpUserPoolAuthorizer` constructor and Amplify schema-level `allow.resource(...).to(['query','mutate'])` pattern were checked against current AWS/Amplify documentation and are valid patterns. Do not assume either is the failure without evidence.

## Amplify build

The build uses Amplify Gen 2:

`npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --outputs-out-dir . --outputs-version 1`

and:

`npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID --out-dir . --outputs-version 1`

Frontend artifact base directory:

`Accelerators`

Validation/test scripts include:

- `npm run validate:costiq`
- `npm run validate:resilience-bank`
- `npm run validate:resilience-deployment`
- `npm run validate:resilience-persistence`
- `npm run test:resilience-persistence-api`
- `npm run test:resilience`
- `npm run test:resilience-api`

## Recommended diagnostic strategy

Because Amplify does not expose a useful failure reason to the user:

1. Inspect the exact current Git tree and current `amplify.yml`.
2. Compare the current HEAD to `34dd1e1...`.
3. Separate backend synth/deploy changes from frontend validation/test changes.
4. Use very small, controlled commits.
5. Let Amplify be the binary deployment signal.
6. If the Deployment-6 baseline itself fails, stop blaming persistence and investigate Amplify configuration/environment.
7. If the baseline succeeds, reintroduce persistence in controlled layers:
   - function/resource registration
   - data authorization
   - HTTP API route/authorizer
   - handler hardening
   - build validation/tests
8. Never sacrifice a known-good hosted state just to make a speculative multi-file change.
9. Do not repeatedly ask the user for unavailable Amplify/CloudFormation logs.

## Resilience IQ product architecture

Knowledge foundation under `resilience-iq/knowledge/` includes:

- frameworks.json
- patterns.json
- blueprints.json
- assessment-model.json
- scoring-model.json
- decision-matrix.json
- implementation-mappings.json
- question-bank.json
- decision-tree.json
- recommendation-model.json
- blueprint-engine.json
- executive-report.json
- assessment-persistence.json

The accelerator is vendor-neutral and maps to AWS/Azure/GCP.

Assessment:

- 20 executive questions
- dynamic 100–150 question advisory deep dive
- weighted scoring
- evidence confidence
- critical-gap penalties
- decision tree
- recommendation sensitivity
- evidence register
- blueprint
- roadmap
- executive report

Ratings:

- 0–39 Critical Exposure
- 40–59 Fragile
- 60–74 Managed
- 75–89 Resilient
- 90–100 Adaptive

## Frontend/runtime

Primary UI:

`Accelerators/resilience-iq.html`

It:

- uses LTM dark/coral styling
- embeds the 20 executive questions
- loads the advisory question bank from hosted `./resilience-iq/knowledge/question-bank.json`
- calls the evaluation API using `RESILIENCE_IQ_API`
- renders scoring, recommendation, blueprint, evidence, and executive report

Engine:

`packages/engine-core/src/accelerators/resilience-iq/runtime.ts`

Exports the evaluation engine and rich result/report structures.

The browser currently does not have a separate `aws-amplify` dependency. Do not introduce a second browser login/authentication flow.

## Current product maturity

Completed/fundamentally implemented:

- product definition
- knowledge foundation
- executive scan
- scoring
- recommendation
- blueprint
- executive report

Still incomplete / under validation:

- advisory deployment verification
- assessment persistence
- authentication/RBAC end-to-end browser integration
- workspace/resume
- evidence upload
- production hardening
- production launch

## What Claude should do next

Do not start by rewriting the product.

First establish the exact current Git state and identify the first commit after the last known-good hosted deployment that changes deployability. The latest failed deployment means the current branch is not proven healthy.

Use Git history and controlled isolation. Preserve `main` and `resilience-iq-persistence-wip`.

The objective is:

**known-good hosted Resilience IQ → reliable deployment baseline → smallest safe persistence increment → deployment verification → next increment.**

