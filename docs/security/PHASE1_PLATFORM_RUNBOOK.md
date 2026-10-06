# Phase 1: Platform Foundation — Deployment & Cutover Runbook

Phase 1 moves the whole platform onto one API defined in code. **Every route requires a Cognito
login**, checked by API Gateway before any Lambda runs. The frontend finds that API automatically
at build time. Follow these steps in order.

> **Phase 0 is still not live.** On 4 Oct 2026 the old API still returned the user list without
> sign-in, and the open password-reset route was still reachable. Step 2 below closes this as part
> of the cutover. If the merge can't happen today, do the emergency step in §0 first.

---

## 0. Emergency containment (only if you cannot merge today)

Patch the hand-deployed reports Lambda behind `zvnmwxa9sf` directly:

```bash
cd services/reports-service
zip -j reports-lambda.zip index.mjs
```

AWS Console → Lambda → the function behind `zvnmwxa9sf` → **Upload .zip** → then
**Configuration → Environment variables**:

| Key | Value |
|---|---|
| `SUPER_ADMIN_EMAILS` | your admin address(es), comma-separated. **Required**: the code no longer has a built-in admin |
| `ALLOWED_ORIGINS` | `https://main.d1xnevzszm0ehs.amplifyapp.com,https://*.d1xnevzszm0ehs.amplifyapp.com` |

Check: `curl -s -o /dev/null -w '%{http_code}\n' https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com/api/users` → `401`.

## 1. Before merging: Amplify environment variables (optional)

Amplify console → App settings → **Environment variables**. All have safe defaults (see `amplify/config.ts`):

| Variable | Default | When to set |
|---|---|---|
| `LTM_SUPER_ADMIN_EMAILS` | current bootstrap admin | Set to LTM corporate admin addresses. Set `none` once the Cognito `Admin` group is populated (step 6) |
| `LTM_USER_POOL_ID` / `LTM_USER_POOL_CLIENT_ID` | `ap-south-1_91amN2bz4` / current client | Only if the portal should use a different pool |
| `LTM_ALLOWED_ORIGINS` | Amplify main + branch previews | When adding a custom domain |
| `LTM_KEEP_LEGACY_API` | `true` | Set to `false` in step 5 |
| `LTM_API_RATE_LIMIT` / `LTM_API_BURST_LIMIT` | 25 / 50 per second | If workshops hit throttling |

## 2. Merge to `main` and watch the Amplify build

1. Merge the pull request. Amplify runs the **backend** phase (deploys the API and Lambdas), then the
   **frontend** phase (writes `assets/runtime-config.js` with the new API address and publishes the site).
2. **Watch the backend phase log.** Four routes defined in code before Phase 1 (Strategy IQ, Cloud IQ,
   Cost IQ, Modernize IQ) never appeared on the live API, so earlier backend deploys were probably
   failing. Likely causes, all fixed on this branch:
   - TypeScript errors in the backend: 33 → 0
   - an out-of-sync `package-lock.json`
   
   If the backend phase still fails, copy the first error from the log and send it over.
3. The frontend phase now **fails the build** if it can't read the API address. It won't silently
   ship a site pointing at the wrong API.

## 3. Verify the new API

Find the new API address: Amplify console → the branch → **Deployed backend resources**, or open
`https://main.d1xnevzszm0ehs.amplifyapp.com/assets/runtime-config.js` and read `apiBase`.

```bash
API=<apiBase from runtime-config.js>
curl -s -o /dev/null -w '%{http_code}  /api/users without token (expect 401)\n' $API/api/users
curl -s -o /dev/null -w '%{http_code}  scoring without token (expect 401)\n' -X POST -H 'Content-Type: application/json' -d '{}' $API/api/evaluate/sovereign-iq
curl -s -o /dev/null -w '%{http_code}  removed reset route (expect 404)\n' -X POST $API/api/auth/reset-password
curl -s -I -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' $API/api/me | grep -i access-control-allow-origin || echo "no CORS for foreign origin (expected)"
```

Then in the browser, signed in:

- [ ] The portal loads, and **Access Control** lists users
- [ ] **Sovereign IQ** → Advisory Menu → **Saudi National Bank** shows **5 binding regimes** and a ceiling captioned **KSA PDPL**
- [ ] **Posture IQ**, **FinOps IQ** and **FinOps Value Case** produce reports
- [ ] **Archive Report** on any accelerator saves, and the report appears under **Reports**
- [ ] After more than an hour signed in, scoring still works (silent token renewal)

## 4. Turn on GitHub protections

GitHub → Settings → Branches → add a rule for `main`:
- Require a pull request before merging, with review from Code Owners
- Require status checks: **Typecheck, unit tests, repository guards**, **Backend synthesis and security assertions**, **Browser tests (Playwright)**, **Secret scan**
- Do not allow force pushes

## 5. Retire the old unauthenticated routes

The old Accelerators API (`ltm-accelerators-api`) **stays**: Cost IQ and Resilience IQ, maintained
separately, are served from it unchanged. Only the seven accelerators that moved to the Advisory API
lose their old, unauthenticated routes there.

1. Set `LTM_KEEP_LEGACY_API=false` and redeploy. This removes only the old FinOps Value Case, FinOps IQ,
   Posture IQ, Sovereign IQ, Cloud IQ, Strategy IQ and Modernize IQ routes from the Accelerators API.
2. The hand-made routes on `zvnmwxa9sf` (`/api/users`, `/api/reports/*`, `/api/auth/reset-password`)
   are not managed by Amplify. Delete them in API Gateway, together with the hand-deployed reports Lambda
   behind them. (Check first whether `zvnmwxa9sf` is the Accelerators API itself; if it is, delete only those routes.)
3. Check: `curl -s -o /dev/null -w '%{http_code}' https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com/api/users` returns 404.

## 6. Move admin rights to a Cognito group

1. Cognito → user pool `ap-south-1_91amN2bz4` → Groups → create `Admin`, and add the LTM corporate admin accounts.
2. Sign out and back in. Admins keep the Super Admin badge, because the role comes from the token's group.
3. Set `LTM_SUPER_ADMIN_EMAILS=none` and redeploy. The personal bootstrap address no longer grants anything.
4. Enable MFA for the `Admin` group's users (if not already done in Phase 0).

## Rollback

- **Frontend:** Amplify console → redeploy the previous build.
- **Backend:** revert the merge commit. The old routes keep serving until step 5 has been done.

---

## What Phase 1 delivered

| Area | Change |
|---|---|
| API | One Advisory API in code (`amplify/backend.ts`): 16 routes (7 scoring engines + identity, users, reports), all behind a Cognito JWT authorizer; CORS limited to portal origins; throttling (tighter on admin and paid-AI routes); JSON access logs kept 1 year |
| Reports & users service | Built and deployed by Amplify (no more hand-uploaded zip); IAM limited to the reports bucket's `reports/` folder and permissions file, plus three Cognito admin actions |
| Configuration | `amplify/config.ts` is the only place for pool IDs, origins, admins, bucket and feature flags, and every value can be overridden in the Amplify console. The frontend reads `assets/runtime-config.js`, generated at build time |
| Frontend | Shared client `assets/ltm-api.js`: token on every call, silent renewal with the refresh token, sign-out revokes the token. Portal, Studio and every accelerator use it, with no hard-coded API URLs, client IDs or admin emails |
| Security headers | `customHttp.yml`: one CSP for the whole site (per-page `<meta>` policies removed), HSTS, nosniff, frame and referrer policies, permissions policy. This also fixed Sovereign IQ and Modernize IQ blocking token renewal |
| Studio | Now requires sign-in. Its sign-in no longer strips the user's role and permissions |
| Repository | 0 TypeScript errors (was 33). Old Cost IQ versions and the duplicate Studio moved to `archive/` (no longer publicly served). `portal.html` redirects to `/`. Lambda zip removed. CODEOWNERS, PR template, Dependabot |
| Tests & CI | Vitest engine suite (46 tests: no NaN/Infinity, score ranges, determinism, legal caps); reports-service auth suite (21); Playwright browser suite (32: sign-in, renewal, expiry, permissions, every page under the real CSP, Sovereign IQ scored by the real engine); backend synthesis with security assertions; repository guards; secret scan; dependency audit |
| Bugs found by the new tests | Cloud IQ server engine computed `peerDelta` as NaN, which would have appeared once scoring moved server-side. Fixed |
| Claims register | `docs/claims-register/claims-inventory.csv`: 323 candidate claims (122 regulatory) extracted for Phase 3 review |

**Deferred from the original Phase 1 list:**
- Moving permissions from the S3 JSON file to DynamoDB: Phase 2, alongside server-side scoring.
- The engagement data model: Phase 4, with the engagement workspace.
- AWS WAF: it can't attach to HTTP APIs. Throttling covers rate limiting for now; WAF needs CloudFront in front of the API, which is a Phase 6 decision.

## Scope note: Cost IQ and Resilience IQ

Cost IQ and Resilience IQ are developed separately (another tool pushes them to `main`) and are out of
scope for this programme. The Phase 1 merge keeps every live Cost IQ and Resilience IQ file byte-identical to
`main` (the only Cost IQ change: four superseded, unreferenced old versions under `Accelerators/cost-iq/v*`
were moved to `archive/` so they are no longer publicly served) and keeps their routes on the Accelerators API (Amplify output `custom.apiUrl`, read by
`scripts/generate-cost-iq-runtime-config.cjs`). The portal and the seven accelerators read the new
`custom.advisoryApiUrl`. Shared scripts (`rbac-guard.js`, `s3-reports.js`) also work on pages that do
not load the new API client. CI type checks, repository guards and browser tests exclude the two
separately maintained accelerators; their own `test:costiq*` / `test:resilience*` scripts are unaffected.
