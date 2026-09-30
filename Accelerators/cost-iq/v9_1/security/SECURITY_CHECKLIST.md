# Cost IQ v9.1 Security Checklist

## Identity & authorization
- [ ] LTM SSO is host-owned; runtime never implements password authentication.
- [ ] Roles/claims are mapped to CIO, Consultant, Reviewer and Admin-equivalent host roles.
- [ ] Authorization is enforced server-side.
- [ ] Tenant/client isolation is tested.

## Data
- [ ] Assessment data classification approved.
- [ ] Evidence is stored in approved object storage.
- [ ] Database contains metadata, not raw evidence binaries.
- [ ] Encryption at rest and in transit enabled by platform.
- [ ] Secrets are injected by platform secret management.
- [ ] Logs exclude assessment answers, evidence contents and credentials.

## Application
- [ ] CSP and secure headers enabled at target host.
- [ ] Input validation and payload size limits enabled.
- [ ] Rate limiting enabled at API gateway.
- [ ] ETag/concurrency protection tested.
- [ ] Dependency/SCA scan completed.
- [ ] SAST/DAST completed.
- [ ] Penetration test completed for pilot boundary.

## Governance
- [ ] Retention/deletion policy is host-owned.
- [ ] Audit events include actor, action, object, timestamp and correlation ID.
- [ ] Release ID is persisted with each assessment.
- [ ] Public benchmark data is clearly labeled external reference.
- [ ] Synthetic scenarios are marked calibration-ineligible.
