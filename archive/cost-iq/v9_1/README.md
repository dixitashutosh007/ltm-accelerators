# Cost IQ v9.1 — LTM Environment Implementation & Pilot Acceptance Kit

Status: **Implementation kit / local reference environment**

v9.1 moves Cost IQ from a consultant/runtime package toward an environment-ready pilot. This release provides the contracts, reference host, mock identity boundary, backend adapter, evidence-storage abstraction, PostgreSQL schema, UAT pack, security checklist and deployment runbook.

## What is validated here
- Reference portal host and runtime hand-off contract
- Mock SSO/ACL boundary
- Assessment create/load/save lifecycle
- ETag-style optimistic concurrency
- Evidence metadata and protected-storage abstraction
- PostgreSQL-compatible data model
- Pilot/UAT acceptance workflow
- Local smoke/regression harness

## What remains an LTM environment gate
- Actual LTM portal integration
- Actual LTM SSO/identity provider
- Actual LTM API gateway/backend
- Actual LTM database/object storage
- Enterprise security review and penetration testing
- Real browser/UAT with LTM users
- Production operational monitoring and retention controls

No LTM environment access was available during this build; the kit does not claim those gates are complete.

## Directory
- `reference-host/` — standalone portal host
- `reference-api/` — Node.js reference API with no external runtime dependency
- `database/` — PostgreSQL schema and seed
- `contracts/` — environment/config contracts
- `uat/` — acceptance scenarios and test matrix
- `security/` — security/control checklist
- `runbook/` — deployment and pilot runbook
- `scripts/` — local smoke test
- `docker-compose.yml` — optional local API + PostgreSQL stack

## Run locally
1. Open `reference-host/index.html` directly for the host contract demo.
2. Or run `docker compose up --build` for API + PostgreSQL.
3. Run `node scripts/smoke-test.mjs`.
4. Execute `uat/UAT_MATRIX.md`.

The reference API stores data in memory by default so it can run without infrastructure. PostgreSQL is included as the target persistence contract, not as proof of an LTM deployment.

## Versioning
- Product: Cost IQ
- Release: v9.1
- Branch: chatGPT-branch
- Baseline: v8.8 runtime/pilot simulation
- Methodology owner: LTM central methodology team / Infrastructure Technology Advisory
