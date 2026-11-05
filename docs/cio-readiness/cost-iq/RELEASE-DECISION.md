# Cost IQ release decision

**Release label:** `COSTIQ-1.0.0`, status `APPROVED_WITH_ACCEPTED_PARTIALS` (was `COSTIQ-0.7.8-DRAFT`, `ENGINEERING_INTEGRATION_BASELINE`).
**Decided:** 5 Nov 2026, by the product owner, on the instruction "Conclude release label" given after the CQ11 re-score (`CQ11-REVIEW.md`: 1 Pass, 12 Partial, 0 Fail; baseline 3 Partial, 10 Fail). The label records the owner's decision to release with the Partials below accepted; it is not a claim that all 13 areas Pass.

## What the owner accepted
The six acceptances listed in `CQ11-REVIEW.md` ("What the owner would have to accept in writing"):
1. **Area 5, scoring engine:** the headline keeps single-answer dimensions (S5 decision of 5 Nov 2026: a second scored question for each is question-bank work for the next release). Golden outputs are proposed, with the owner's acceptance; the practice lead's approval is still to come.
2. **Area 8, sources:** constants and sources are cited in the report and `question-bases.json` and registered as CLM-COST-001 to 025; the ten LTM heuristics are UNSOURCED and not client-visible.
3. **Areas 9 and 10, legal and AI:** the data notice and disclaimer are approved by the owner but not yet read by counsel; the AI narrative, its asynchronous worker and permissions, the 24-month deletion and the new data fields are verified only by tests and synthesis, not in a real account; AI stays off at the service until the live eval is run.
4. **Areas 1, 2, 3, 4, 6, 7, 11 and 13 Partials** as listed in the review, including M8 (no role model: anyone with Cost IQ access can download the consultant edition; accepted 5 Nov 2026) and the open Medium and Low items.
5. **Duration and effort ranges** are LTM heuristics with no delivery history (A-11); the upper licence case equals 100% of the client's measured figure (A-08).
6. **The release label is a separate decision from the acceptances;** this document is that decision.

## Conditions of use that go with the label
- **Internal use by LTM consultants** on the development-preview deployment (a personal development AWS account, stated in the on-screen notice). No external client is given a client edition until counsel has read the data notice and disclaimer and the hosting statement has been updated for the LTM account.
- **AI narrative off** (`AI_ENABLED` is `false` in `amplify/functions/cost-iq-narrative/ai-switch.ts`) until the live eval (`scripts/eval-cost-narrative.ts`) passes in the LTM account and the owner switches an engagement on.
- **On the move to the LTM account,** verify in the real account: the Amplify data deploy for `leverEvidenceJson`, `aiEnabled` and `narrativeJson`; DynamoDB deletion at 24 months; IAM for the narrative worker; the API's 30-second limit against the asynchronous narrative; then run the live eval.

## Still open (not blockers by this decision)
- Owner's own answers: the named buyer, unaided CIO use and the engagement it opens (`EDGE.md`, "To confirm"); the font-host sentence in the data notice.
- Practice-lead approval of the golden outputs (`goldens.json`).
- The remaining Medium and Low items in `CQ10-CIO-CHALLENGE.md`, and the question-bank work for single-answer dimensions.
- Counsel review before the first external client.

## What changed in the code
`releaseId`, `releaseStatus` and `lastUpdated` in `canon/config/master-v6.6.json`, and `releaseId`, `status` and an `approval` block in `canon/RELEASE_MANIFEST.json`. The consultant edition's cover and every new saved assessment carry the new label. Assessments saved before today keep the release they were made under (`COSTIQ-0.7.8-DRAFT`); their results are not recomputed.
