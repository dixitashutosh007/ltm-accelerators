# Platform workstream: access control, user activity and saved sessions

**Date:** 3 Nov 2026  **Status:** decisions recorded by the owner; P1 is in PR #84 (runbook: `docs/security/DOMAIN_ACCESS_RUNBOOK.md`); P2 is built on branch `platform-p2-user-activity` (runbook: `docs/security/USER_ACTIVITY_RUNBOOK.md`); P3 not started.
Independent of the Resilience IQ phases (RQ3 onward); the engine work continues in parallel.

## Requests
1. Save and load sessions securely so an assessment can be continued later; later, delete a saved session. Local-only saving is not acceptable.
2. Track who has logged in and when, which assessments they took and when, and for saved sessions the stage reached. Needs a rebuilt user management screen.
3. A front-end screen to allow and block email domains, replacing the backend-only list.

## Where the code is today
| Area | State |
|---|---|
| Sessions | Server-side save, resume and archive exist for FinOps IQ (also delete and expiry), Sovereign IQ and Resilience IQ (Cognito JWT, Lambda, DynamoDB). Strategy, Cloud, Modernize and AI Readiness IQ use `localStorage`. No shared "My sessions" view. No stage is stored. Whether Resilience IQ has a delete action is to be checked in P3. |
| Users | An "Access Control & User Management" modal exists on the index page (reports service: list, create, set password, permissions); it was found after the first draft of this plan. No login history. `UserAllowlist` model exists (`amplify/data/resource.ts`) but nothing reads or writes it. Cognito keeps no login history. |
| Domains | `amplify/auth/pre-sign-up/handler.ts`: hard-coded `ltm.com` plus `ALLOWED_DOMAINS` / `ALLOWED_EMAILS` environment variables (`amplify/config.ts`); a change needs a redeploy. No block list. Checked at sign-up only. |

## Owner decisions (3 Nov 2026)
| # | Decision |
|---|---|
| S1 | Scope: **all accelerators** get the shared save, load and delete experience, including the four on `localStorage`. |
| S2 | Visibility: a saved session is visible and resumable by **its owner and Admins**. |
| S3 | Blocking a domain **also blocks sign-in** for users already registered from it. Their sessions are kept, unreachable until unblocked. |
| S4 | Login and activity history is kept **12 months**, then deleted automatically. |

Defaults applied unless the owner changes them:
- Delete is permanent, by the owner or an Admin. Saved sessions expire after 24 months of inactivity (owner decision, 5 Nov 2026: one retention period for every accelerator, replacing the 90 days first proposed), with a warning first.
- Stage is each accelerator's own step name plus a percent complete, written on every save.
- Domain rules are managed by the Admin group only, every change logged. A single email can be allowed or blocked, overriding its domain. Block beats allow. `ltm.com` and the super-admin emails can never be locked out.
- The activity screen is Admin only, with CSV export.

## Phases
| # | Phase | Depends on | Exit gate |
|---|---|---|---|
| P1 | Domain access | — | Rules (domain or email, allow or block, added by, when) kept in `config/domain-rules.json` in the reports bucket, not a table, so the auth triggers have no dependency on the data stack. Pre-sign-up and a new sign-in check read it. Admin screen to list, add, block, unblock, remove. Lock-out protection and audit log. Tests: block beats allow; protected domain and super admins cannot be blocked; a blocked user is refused at sign-in; a rule change takes effect without a deploy |
| P2 | Users and activity | P1 | Post-authentication trigger writes login events (user, time) with 12-month expiry. Per-user record: first and last login, assessments taken (accelerator, started, last saved, status, stage). Rebuilt Admin screen "Users and activity" with filters and CSV export. Privacy notice wording agreed; no answer content shown, only metadata |
| P3 | Saved sessions | P2 (stage and activity fields) | One shared component: save, "My sessions", load, delete. Server-side only, owner and Admin access, JWT-authorised. `stage` and `percent` stored on every save. Strategy, Cloud, Modernize and AI Readiness IQ moved off `localStorage`. Expiry job with warning. Tests: another user cannot read or delete a session; delete removes the record and the activity pointer; resume restores the stage. Resilience IQ's own stage names are plugged in by RQ6 |

## Risks
- Blocking a domain also blocks Admins from it, so the lock-out protection and a break-glass path (a super-admin email list outside the table) are required before P1 ships.
- Login tracking of employees needs a notice and a retention statement before P2 goes live (12 months, S4).
- Moving four accelerators off `localStorage` changes their save format; stored local data is not migrated and the page says so once.
- The Question Bank Studio admin login is separate from this screen; P2 does not replace it unless the owner asks.


## P3 progress (5 Nov 2026): front end
- **Shared component** `Accelerators/assets/saved-sessions.js`: saves the current assessment through `/api/sessions` (owner or Admin only; 24 months after the last save), restores the latest unfinished one when the page opens, "My sessions" panel (open, delete in two steps, stage, percent, and a warning in the last 14 days before automatic deletion), a one-time notice that progress an earlier build kept in the browser is not carried over, and `discard()` for a page's "clear everything".
- **Wired in:** Cloud IQ (offers resume on return), Modernize IQ (restores silently, as before; "clear" now deletes the saved session), Strategy IQ (had no save at all: now saves, and offers resume on return). None of them writes progress to `localStorage` any more. AI keys that Strategy, Cloud and Modernize IQ keep in the browser are a separate readiness item, not P3.
- **Not wired, and why: AI Readiness IQ.** The page is not linked from the home page, loads neither `ltm-api.js` nor the access guard, and `ai-readiness-iq` is not an accelerator the permissions screen grants. Adding saved sessions would put it behind a sign-in and a permission nobody holds. Decision for the owner: retire the page, or bring it under access control first (then wire the component, which needs about ten lines).
- Tests: `tests/e2e/saved-sessions.spec.ts` against the real sessions service with an in-memory store (save, resume, list, two-step delete, another user's session invisible, legacy notice, no console errors).
- Not verified in a real account: the SavedSession data model deploy, TTL deletion and the activity pointer (P3b backend, unit-tested only).
