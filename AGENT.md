# AGENT.md — LTM Accelerators

LTM Vantage advisory accelerators: CIO-facing diagnostics (Strategy IQ, Cloud IQ, FinOps IQ, FinOps Value Case, Posture IQ, Sovereign IQ, Resilience IQ, Cost IQ), served from `Accelerators/` on AWS Amplify Gen 2 with an authenticated API in `amplify/`.

## Where things stand

| Area | Status and plan |
|---|---|
| Platform and six in-scope accelerators | [docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md): Phases 0–3 done; Phase 4 (fact-check, claims register) next; Phase 5.1 adds the shared platform playbook |
| Resilience IQ | Released to production (R0–R6, [PLAN.md](docs/resilience-iq/PLAN.md)); conditionally approved for consultant-led use ([VALIDATION.md](docs/resilience-iq/VALIDATION.md)); next phases R7–R12 in [ROADMAP.md](docs/resilience-iq/ROADMAP.md) |
| Scoring audit | `npm run audit:engines`; findings and lead decisions in `docs/phase3/` |

The October 2026 Resilience IQ deployment failures are resolved: the cause was invalid YAML in `amplify.yml` (R0), and dev and production have deployed cleanly since.

## Working rules

1. Work on a branch and merge to `main` through a PR with green CI. Amplify deploys `main` to production.
2. Engines score on the server only, through each accelerator's request contract (`packages/engine-core/src/accelerators/<name>/contract.ts`). Pages send answers and render the result; they never compute scores.
3. Any change to scoring updates the golden outputs (`UPDATE_GOLDEN=1`) and the diff is explained in the PR for the practice lead.
4. Every API route except the CORS preflight uses the Cognito JWT authorizer (`check:backend` enforces it). The browser uses the shared app session; do not add a second login flow.
5. No unsourced numbers, benchmarks or regulatory statements; scoring constants are labelled as LTM heuristics. Technology options are vendor-neutral and indicative.

## Run it locally

```
npm ci
npm run dev               # http://localhost:4300, nothing deployed
```

The merged FinOps IQ is at http://localhost:4300/finops-iq-v3. Sign in as `consultant@ltm.local` or `admin@ltm.local`, password `local-dev`. The dev server (`scripts/dev-server.ts`) serves the pages, runs the Advisory API handlers in-process behind a local token check, and stands in for Cognito. FinOps IQ assessments are saved in `.local-data/`; the reports archive keeps metadata in memory only.

## Checks before pushing

```
npm test                  # typecheck, engine tests, reports-service tests, repository checks
npm run test:e2e          # browser tests (pages, assets, customHttp.yml)
npm run check:backend     # anything under amplify/
npm run test:resilience-all
```
