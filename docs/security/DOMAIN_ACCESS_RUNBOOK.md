# Domain access runbook (platform workstream P1)

**Date:** 3 Nov 2026. Who may sign in is decided by one module (`amplify/functions/_shared/domain-access.mjs`) from three sources.

## How a decision is made
From strongest to weakest:
1. **Protected.** Addresses in `LTM_SUPER_ADMIN_EMAILS` and domains in `LTM_PROTECTED_DOMAINS` (default `ltm.com`) are always allowed. This does not read the rules, so a broken, empty or unreachable rule list cannot lock them out.
2. **An address rule** (allow or block). It overrides the rule on its domain.
3. **A domain rule** (allow or block). Domains match exactly: `ey.com` admits `name@ey.com`, not `name@in.ey.com`.
4. **The setup lists** `LTM_SIGNUP_ALLOWED_DOMAINS` and `LTM_SIGNUP_ALLOWED_EMAILS`. A rule can block one of these, except a protected one.
5. Anything else is refused.

A block beats an allow at the same level. Each target has one rule; setting it again replaces the earlier one.

## Where it is enforced
| Place | When | Notes |
|---|---|---|
| Pre-sign-up trigger | An administrator creates an account | Refuses an address that is not allowed |
| Pre-authentication trigger | Every sign-in | Refuses a blocked address even if its account exists |
| `withAcceleratorAccess` (every accelerator service) | Every request | Cognito does not run the sign-in trigger on a token refresh, so this is what ends a blocked person's session |
| Reports service | Every request | Same check; it also serves the screen |

The page ends the session when a service answers `account_blocked`.

## Managing the rules
Index page, **Access Control**, tab **Domain Access** (administrators; the Access Control button is shown to super administrators). The tab lists the rules, adds, blocks and removes them, checks what the rules say about an address, and shows recent changes. Every change is written to `config/domain-rules-audit/` with who, what and when. Nothing deletes the audit entries.

A change that would block a protected address, or the administrator making it, is refused. Two administrators cannot overwrite each other: the second save is refused with "someone else changed the rules" and nothing is lost.

## When the rules cannot be read
The services keep the last copy they read for 15 minutes. After that every address except the protected ones is refused until the bucket is reachable again (fail closed). Protected addresses keep working, so an administrator can always sign in.

## Break-glass
- **Locked out by a rule:** a protected address cannot be blocked, so sign in with one and remove the rule in the screen.
- **No protected address works:** set `LTM_SUPER_ADMIN_EMAILS` (or `LTM_PROTECTED_DOMAINS`) in the Amplify console and redeploy.
- **Rules are wrong and the screen is unusable:** delete `config/domain-rules.json` in the reports bucket. The platform then follows the setup lists only. Keep the audit entries.

## Known limits
- Cost IQ's service is not wrapped by `withAcceleratorAccess` yet, so a blocked person can call it until their ID token expires (about an hour) and cannot sign in again.
- A cached copy lasts up to 30 seconds, so a new block takes effect within that time (up to 15 minutes in an outage, when the copy is stale).
- Accounts of a blocked domain are kept, not disabled; saved assessments stay but cannot be reached until the domain is unblocked.
- The sign-in trigger needs a deploy to take effect; check the Cognito user pool for the pre-authentication trigger after the first deploy.

## Tests
`amplify/functions/_shared/domain-access.spec.ts` (precedence, validation, and a lock-out property test over 300 random histories), `domain-rules-store.spec.ts` (fail-closed reads, conditional writes, audit), `amplify/auth/triggers.spec.ts`, `access.spec.ts`, `services/reports-service/test/handler.test.mjs`, and `npm run check:backend` (the triggers, the routes and the read and write permissions).
