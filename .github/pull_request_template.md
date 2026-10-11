## What changed

<!-- One or two sentences. Which accelerator(s) or platform area? -->

## Why

## How it was tested

- [ ] `npm test` (typecheck, engine tests, reports-service tests, repository checks)
- [ ] `npm run test:e2e` (browser tests) if pages, `assets/` or `customHttp.yml` changed
- [ ] `npm run check:backend` if anything under `amplify/` changed

## Accuracy and claims

- [ ] No new numbers, benchmarks or regulatory statements, **or** each one is sourced in the PR description (Phase 3 claims register)
- [ ] No overclaiming language ("guaranteed", "100%", "evidence-based" for heuristics)

## Security

- [ ] No secrets, personal emails or hard-coded API addresses
- [ ] Any new API route requires the Cognito authorizer (enforced by `check:backend`)
