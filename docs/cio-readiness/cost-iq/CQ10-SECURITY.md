# Cost IQ security review (CQ10)

Scope: the Cost IQ routes (assessment, report, narrative, scoring) and the persistence path. Reviewed 5 Nov 2026 by reading the handlers and exercising them with `amplify/functions/cost-iq-security.spec.ts`. Deployment settings (IAM, API Gateway, DynamoDB) were read from `amplify/backend.ts` and are not verified on a live stack.

## Result: no Critical or High finding in the code. One High finding on deployment (F1), fixed in code and awaiting a live check.

| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | The narrative route is on an HTTP API, whose integration timeout is 30 seconds. A Bedrock call with one retry can take a minute or two (the function allows 240 s). The call would fail with a gateway timeout while the function carries on. Sovereign IQ's narrative route has the same shape. | High (deployment) | **Fixed in code, not yet confirmed live** (5 Nov 2026). `generate` now records a pending state, starts a separate worker function asynchronously and answers 202 at once; the worker (240 s) runs the model call and stores the outcome; the page reads the stored state until it is ok, rejected or error. A second request while one is pending does not start another; a stale one (over five minutes) is replaced; the worker re-checks the switches. The API function may invoke only that worker. Needs confirming on the first live run. The Sovereign IQ narrative has the same limit and is not changed. |
| F2 | The Cost IQ page asks for FinOps IQ sessions even when the signed-in user lacks FinOps IQ access. The service correctly refuses (403) and the page copes, but the browser console shows an error. | Low | Open, cosmetic. Fix: skip the call when the saved permissions lack finops-iq. |
| F3 | Saving with another user's existing assessment ID returns 403, not 404, so a caller can tell that an ID exists. IDs are 8 to 80 characters chosen by the browser from random parts. | Low | Accepted: nothing but existence is revealed. |
| F4 | An ownerless record (saved before CQ1) could have had its AI switch turned on by an Admin. | Medium | **Fixed**: the narrative route now returns 409 for it, as the assessment route does. Tested. |

## What was checked and holds

- **Identity:** every route needs a verified Cognito token (API Gateway authorizer) and the Cost IQ permission (`withAcceleratorAccess`). Owner comes from the token, never from the request.
- **Another user:** refused (403) on read, save, complete, lever evidence, unlink, delete, report PDF, report CSV, AI switch and AI generate, with no data in the reply and no change to the record. Tested across all ten.
- **Admin:** may read and download; ownerless records stay read-only for everyone.
- **Immutability:** a completed assessment cannot be overwritten by save or complete (409).
- **Mass assignment:** the client cannot set the AI switch, the stored narrative, the lever evidence, the stored result, the owner or the retention date through a save; the record is built from named fields. Tested.
- **Input:** bad JSON and oversize answer bodies are refused (400); keys named `__proto__` and `constructor` do not pollute objects; the scoring endpoint refuses bodies over 256 KB and more than 500 answers.
- **Errors:** an unexpected failure returns a generic message and request ID; no stack, table name or ARN reaches the client. Tested.
- **CORS:** only the listed origins are echoed; a foreign origin gets no allow header. Tested.
- **AI:** off at the service and the engagement; sees no answers, names or figures; output is checked before it is stored or shown; the model role may call only the India profile (`amplify/backend.ts`).
- **Data:** each write moves the 24-month expiry; delete removes the record and its activity pointer.
- **Secrets:** no key or secret in the Cost IQ code or page. The Gemini secret and its calls are gone.

## Not covered

Penetration testing of a deployed stack, load testing through API Gateway and Lambda (the in-process figures are in `CQ10-LOAD.md`), and the Cognito and domain-rule configuration (platform P1, reviewed separately).
