# Cost IQ Amplify Function

Production evaluation endpoint for Cost IQ v10.

The function is intentionally thin: it accepts the public assessment contract and delegates evaluation to the Cost IQ engine package. Methodology, scoring, finding activation, opportunity gates, and FinOps mapping remain outside the browser.

Endpoint: `POST /api/evaluate/cost-iq`

Request:
- `answers` required
- `scope` optional
- `capabilityScores` optional
- `evidence` optional
- `feasibilityEvidence` optional
- `options` optional

Responses include an `X-Request-Id` correlation header.
