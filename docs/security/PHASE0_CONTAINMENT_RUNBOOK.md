# Phase 0: Containment Runbook

The code changes on this branch close the live security holes. They only take effect once deployed, and some steps can only be done in the AWS console. Work through this list **in order, on the same day**.

Region: `ap-south-1` · User pool: `ap-south-1_91amN2bz4` · Reports API: `zvnmwxa9sf` · Bucket: `ltm-advisory-reports-223833501993`

---

## 1. Deploy the secured reports/users Lambda (closes the account-takeover hole)

The reports/users service is deployed manually, outside Amplify. Moving it into Amplify IaC is Phase 1.

> **Superseded by Phase 1.** Amplify now builds and deploys this service behind the new authenticated
> API. The preferred path is the Phase 1 cutover (`docs/security/PHASE1_PLATFORM_RUNBOOK.md`). Use the
> manual steps below only as an emergency patch for the old API.

1. Build the package:
   ```bash
   cd services/reports-service
   npm install && npm test        # 21 auth/authorization tests must pass
   zip -j reports-lambda.zip index.mjs
   ```
2. AWS Console → Lambda → open the function behind API `zvnmwxa9sf` (API Gateway → `zvnmwxa9sf` → Integrations shows its name).
3. **Runtime:** confirm Node.js **20.x or later**. The code uses the built-in `fetch` and `node:crypto` JWK support.
4. **Code → Upload from → .zip file** → `reports-lambda.zip` → Deploy.
5. **Configuration → Environment variables** (all optional; the defaults below are built in):

   | Key | Default | Notes |
   |---|---|---|
   | `SUPER_ADMIN_EMAILS` | *(none; required)* | Comma-separated admin addresses. The code no longer has a built-in admin |
   | `ADMIN_GROUP` | `Admin` | Members of this Cognito group are admins |
   | `ALLOWED_ORIGINS` | `https://main.d1xnevzszm0ehs.amplifyapp.com,https://*.d1xnevzszm0ehs.amplifyapp.com` | Browser origins allowed by CORS |
   | `USER_POOL_ID` / `COGNITO_CLIENT_ID` | current pool and client | Used to verify tokens |
   | `REPORTS_BUCKET` | current bucket | |

6. **Verify from any terminal.** Every line must print the code shown:
   ```bash
   API=https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com
   curl -s -o /dev/null -w '%{http_code}  users (expect 401)\n'        $API/api/users
   curl -s -o /dev/null -w '%{http_code}  reports list (expect 401)\n' $API/api/reports/list
   curl -s -o /dev/null -w '%{http_code}  reset-password (expect 410)\n' -X POST -H 'Content-Type: application/json' -d '{}' $API/api/auth/reset-password
   curl -s -o /dev/null -w '%{http_code}  report save (expect 401)\n'  -X POST -H 'Content-Type: application/json' -d '{}' $API/api/reports/save
   ```
   **Rollback:** Lambda → Versions → republish the previous version. That re-opens the hole, so use it only if sign-in is completely broken.

## 2. Deploy the frontend (merge this branch to `main`)

Amplify Hosting deploys `main` automatically. The new portal sends the Cognito token on every call, asks the API for the user's own permissions (`/api/me`), and uses Cognito "Forgot password" instead of the removed reset route.

> Between step 1 and step 2, report archiving and the admin screens return "session expired". This is expected; keep the gap short.

After the deploy, sign in, open **Access Control** (the user list loads) and **Reports** (the list loads).

## 3. Lock down Cognito

1. **Sign out every session.** Tokens issued before today stay valid for up to 1 hour, and refresh tokens for longer:
   ```bash
   for u in $(aws cognito-idp list-users --user-pool-id ap-south-1_91amN2bz4 --query 'Users[].Username' --output text); do
     aws cognito-idp admin-user-global-sign-out --user-pool-id ap-south-1_91amN2bz4 --username "$u"
   done
   ```
2. **Change the Super Admin password** (use "Forgot password" on the portal) and ask every user to do the same.
3. **Review the user list** (Cognito → Users) and delete or disable any account you don't recognise.
4. **Disable self-registration:** Cognito → Sign-up → *Self-service sign-up* → **Disable** (`AllowAdminCreateUserOnly = true`). Users are provisioned by admins from the portal, so nobody needs to self-register. Until this is done, anyone could register any unclaimed `@ltm.com` address.
5. **Enable MFA** (TOTP) for admin accounts: Cognito → Sign-in → Multi-factor authentication.
6. Optional now, required in Phase 1: create the `Admin` group and add the LTM corporate admin accounts.

> The pre-sign-up trigger change on this branch (no auto-verification for self-registered emails) applies to the **Amplify-managed** user pool. Check in the console whether that is the same pool as `ap-south-1_91amN2bz4`. If not, step 4 is the control that matters.

## 4. Lock down the S3 bucket

1. S3 → bucket → Permissions → **Block all public access = On**. Confirm the bucket policy grants nothing to `"Principal": "*"`.
2. Properties → **Bucket versioning = Enable**, so deleted or overwritten reports can be recovered.
3. Properties → **Server access logging = Enable** (target: a separate log bucket).

## 5. Check for past misuse

The old API accepted unauthenticated password resets, user creation, permission changes, report listing, upload and deletion. Look for evidence that anyone used them:

- [ ] **Cognito users:** any accounts you didn't create? Check the *Created* and *Last modified* dates, especially for the Super Admin.
- [ ] **`config/rbac-permissions.json`** in the bucket: any unexpected users or permissions?
- [ ] **`reports/` prefix:** any objects you don't recognise (planted files) or missing reports?
- [ ] **CloudWatch Logs** for the reports Lambda: `AdminSetUserPassword`, `/reset-password` and `/users/create` calls you didn't make.
- [ ] **CloudTrail** (Cognito data events): `AdminSetUserPassword`, `AdminCreateUser` and `AdminDeleteUser` from the Lambda role at unexpected times.
- [ ] **API Gateway:** enable access logging on `zvnmwxa9sf` now, for future visibility.

Record the findings (even "nothing found") and keep them with this runbook.

## 6. Confirm the engine fixes are live

This branch also corrects the Sovereign IQ and Posture IQ fine calculations (GDPR "whichever is higher"; AI Act Art. 99(4) tier). Amplify's backend pipeline deploys the `evaluate-*` functions when `main` is merged. Check that `zvnmwxa9sf` routes `/api/evaluate/sovereign-iq` to the Amplify-deployed function. If it points at a manually deployed copy, update that copy too.

Check: open Sovereign IQ → Advisory Menu → **Saudi National Bank**. The report should show **5 binding regimes** and a max penalty ceiling captioned **KSA PDPL**, not GDPR/DORA/AI Act.

---

## What this branch changes

| Area | Change |
|---|---|
| Reports/users API | Cognito ID-token verification on every route; identity and admin rights from the token, not the request body; unauthenticated reset-password removed (410); users and permissions routes admin-only; reports need permissions; delete/rename limited to `reports/**.pdf`; PDF-only uploads ≤ 5 MB; download links 15 min (was 7 days); CORS limited to Amplify origins; no internal error details returned; actions audited in metadata and logs |
| Portal | Token on all API calls; own permissions via `/api/me`; Cognito "Forgot password" with emailed code; expired sessions cleared; Cost IQ marked temporarily unavailable |
| Accelerator pages | Report archive sends the token; HTML escaping in archive dialogs; expired sessions sent back to sign in |
| Sign-up trigger | Self-registered emails are no longer auto-verified |
| Sovereign IQ | Page security policy now allows its scoring API (it was blocked, so every report came from the broken in-browser fallback); demo clients scored by the server; clear error state instead of a silent fallback; "undefinedth percentile" removed; penalty caption from in-scope laws; "100% eliminated" claims removed |
| Fine calculations | Sovereign IQ: GDPR and AI Act caps corrected and the placeholder $20M removed. Posture IQ: AI Act tier corrected to Art. 99(4) |
| Tests | `services/reports-service/test` (21 auth tests); the engine test runner now has real assertions for Posture IQ and Sovereign IQ |
