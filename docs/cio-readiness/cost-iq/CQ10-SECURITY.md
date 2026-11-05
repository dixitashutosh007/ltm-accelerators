# Cost IQ security review (CQ10)

Scope: the Cost IQ routes (assessment, report, narrative, scoring) and the persistence path. Reviewed 5 Nov 2026 by reading the handlers and exercising them with `amplify/functions/cost-iq-security.spec.ts`. Deployment settings (IAM, API Gateway, DynamoDB) were read from `amplify/backend.ts` and are not verified on a live stack.

## Result: no Critical or High finding in the code. One High finding on deployment (F1).

| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | The narrative route is on an HTTP API, whose integration timeout is 30 seconds. A Bedrock call with one retry can take a minute or two (the function allows 240 s). The call would fail with a gateway timeout while the function carries on. Sovereign IQ's narrative route has the same shape. | High (deployment) | **Open.** Needs a decision: make generation asynchronous (the call returns at once, the page asks again until the narrative is ready), or cut the model call to fit 30 s. To confirm on the first live run of the narrative eval. |
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
