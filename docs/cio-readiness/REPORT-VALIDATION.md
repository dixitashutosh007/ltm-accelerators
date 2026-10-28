# Report validation: plan

**Date:** 27 Oct 2026. **Owner decisions:** recorded below (owner: "go with recommendations", 27 Oct 2026). **Applies to:** every LTM Vantage accelerator that issues a client report (FinOps IQ and Sovereign IQ now; Resilience IQ at RQ7; the others after their readiness reviews).

## Why

Each accelerator's report is computed on the server from a deterministic engine, and design-time controls already exist: numbers trace to engine fields, claims are sourced with review dates, banned phrases are linted, and practice leads run CIO challenge tests. Those controls run in CI against reference scenarios. What nothing checks today is **each real report**, built from one client's answers:

| Risk | Covered today | Gap |
|---|---|---|
| A number that does not match the engine | Trace tests in CI (FinOps IQ, Sovereign IQ) | Not re-run on the live report |
| A content statement that is wrong or stale | Claims register, review dates, practice-lead reviews | Not checked at report time (an overdue claim can still be printed) |
| Inputs that do not make sense together | Some engine conflict rules | Not systematic |
| A report that is correct but weak or self-contradictory for this client | Consultant judgement only | No second reader |
| Wording that reads as legal advice or a guarantee | Banned-phrase lint in CI | Not run on the live report |

## Decisions (owner, 27 Oct 2026)

| # | Decision | Outcome |
|---|---|---|
| V1 | Gate or advise | **Layer 1 (automated checks) blocks** issue of a report that fails. **Layer 2 (AI review) advises only**; it never approves, edits or blocks a report |
| V2 | Acknowledgement | The consultant **must acknowledge the AI review memo** (read, and accepted or actioned) before the report can be issued to the client |
| V3 | Who sees the AI memo | **Consultants only.** No client ever sees it; it is not part of the client or consultant edition PDF |
| V4 | When it runs | **On every report, for internal review.** The memo stays inside LTM's environment. Inference follows D29: Claude on the Bedrock India profile from ap-south-1, Mumbai and Hyderabad only |
| V5 | Order | **Layer 1 first, for all accelerators; then a Layer 2 pilot on FinOps IQ**, then Sovereign IQ, then the rest as they pass their readiness reviews |
| V6 | Agent shape | **One reviewer agent for all accelerators**, with one **review pack per accelerator** (content, not code), written and maintained by that accelerator's practice-lead agent |
| V7 | Hosting | **Start on the shared Bedrock service (WS-S1)**: a Lambda in ap-south-1 calling `in.anthropic.claude-opus-5` with tool use. Move to Amazon Bedrock AgentCore Runtime (available in Mumbai) only if the reviewer needs long multi-step sessions or memory. AgentCore Evaluations and Policy are not available in Mumbai, so evaluation stays in our own harness |

## Layer 1: automated report checks (blocking)

One shared module, `packages/engine-core/src/report-checks/`, run **when a report is built** (the report Lambdas `finops-iq-report`, `sovereign-iq-report`, later Resilience IQ) and in CI. Each accelerator registers its checks; the framework runs them and returns `{ status: pass | fail, failures[] }`. A failure stops the PDF and CSV and shows the consultant what failed; nothing is issued.

| Check | What it asserts | Source today |
|---|---|---|
| R1 Completeness | Every required section is present and non-empty for the edition (client or consultant) | New, from each report's section list |
| R2 Trace | Every number in the document traces to an engine field or a stated derivation | FinOps IQ and Sovereign IQ trace tests, moved to runtime |
| R3 Reconciliation | Totals agree across screen, PDF and backlog (e.g. lever values sum to the headline, roadmap phasing sums to the 3-year total) | FinOps IQ value tests |
| R4 Claims freshness | No claim cited in the document is past its `nextReview` date or UNSOURCED in a client edition | Claims register; CI check exists for the register, not per report |
| R5 Language | No banned phrase; no question, finding or design IDs, internal file paths or "null" in the client edition | FinOps IQ report tests (D3, D6, D8) |
| R6 Input consistency | Per-accelerator rules for answers that contradict each other (e.g. Resilience IQ: RTO under 15 minutes with no secondary site; FinOps IQ: provider spend that does not sum to the stated total) | New; listed in each review pack |
| R7 Notices | The disclaimer, data notice and attribution required for that accelerator are present in the right edition | Partly in tests |

Each check result is stored with the report record (`validation.layer1`), so a reader can see that the issued report passed.

## Layer 2: AI review (advisory)

### What it reads

The engine result, the client's answers (with the client name and personal data redacted, as the Sovereign IQ AI flow does), the rendered report text, the Layer 1 result, and the accelerator's review pack.

### What it writes (consultant-only memo, structured)

1. **Contradictions:** findings that disagree with each other or with the inputs.
2. **Sceptical-CIO questions:** the five questions a hostile CIO is most likely to ask of this report, and for each whether the report answers it and where.
3. **Weak or generic findings:** findings whose "why" or action is not specific to this client's answers.
4. **Wording:** sentences that read as legal advice, a guarantee or a benchmark claim.
5. **Inputs to confirm:** answers the consultant should verify with the client before issue.

Each item cites the report section and the engine field or answer it is based on. A grounding check (as WS-S1) rejects any memo item that names a number, regulation or fact not in the inputs; one retry, then the memo is marked "review unavailable" rather than shown unchecked.

### Tools the reviewer can call

Read-only: the claims register (by ID), the accelerator's question bank, and an engine re-run on a changed answer (to test "would this finding change if…"). No web access in v1.

### Acknowledgement (V2)

The report screen shows the memo beside the report. Issue (PDF for the client, archive to Reports) is enabled only after the consultant marks the memo acknowledged, optionally with a note. The acknowledgement, the memo, its model ID and input hash are stored with the report record (`validation.layer2`).

### Review packs (V6)

One per accelerator, in `packages/engine-core/src/report-checks/packs/<accelerator>.md` plus a JSON rubric: what a good report for that accelerator must contain, its typical failure modes, its sceptical-CIO question bank, its Layer 1 input-consistency rules (R6), and pointers to its claims. Written and kept current by the practice-lead agent for that accelerator; changes land by PR like any other content.

### Data and cost

- Inference in India only (D29). Bedrock data-retention mode `none` in ap-south-1 and ap-south-2 (as Sovereign IQ A4).
- Prompts and memos logged in CloudWatch ap-south-1 with the same retention as the AI narrative.
- Estimated cost: a few tens of US cents per review at current Opus 5 rates (one report plus inputs is tens of thousands of tokens). Measured in the pilot.
- The AI review is not a legal review and is never described as one.

## Evaluation before trust

For the pilot accelerator, build a **planted-defect set**: reports from the reference scenarios with known defects inserted (a contradiction, a wrong number, an overclaiming sentence, a generic finding, an inconsistent input pair, a stale claim). Measure:

| Metric | Target to pass the pilot |
|---|---|
| Planted defects caught by Layer 1 | 100% of those Layer 1 is designed to catch (R1–R7) |
| Planted judgement defects caught by Layer 2 | At least 80% |
| Layer 2 false flags on clean reports | No more than 2 per report on average |
| Layer 2 grounding failures shown to the consultant | 0 (fail closed) |

The set is kept in the repository and re-run whenever the reviewer prompt, model or a review pack changes.

## Status

**RV1 built (28 Oct 2026).** `packages/engine-core/src/report-checks/` runs R1, R2, R3 (FinOps IQ), R4, R5 and R7 on every FinOps IQ and Sovereign IQ report as it is built; a failing report returns 422 with the reason (`report_checks_failed`) and the details go to the log; a passing PDF carries the header `X-Report-Checks: pass ...`. The banned-phrase list moved to `report-checks/banned-phrases.json`, read by both the CI claims check and the report checks. Tests: all reference-scenario reports pass in both editions; one planted defect per check is caught; the report service returns 422 for a report that fails. Not in RV1: R6 (input consistency) and Sovereign IQ's R3, which come with the review packs (RV2); storing the check result on the assessment record, which comes with the acknowledgement flow (RV3). Found on the way: a live FinOps IQ journey (executive, Kubernetes spend unconfirmed) puts a question ID ("the SC-04 row") into the consultant edition's help and technical sections; allowed there, and the client edition's body is checked for IDs, as the D8 test does.

## Phases

| # | Phase | Output | Gate |
|---|---|---|---|
| RV1 | Layer 1 framework and checks for FinOps IQ and Sovereign IQ | `report-checks` module; R1–R7 wired into both report Lambdas; results stored with the report | Every existing report test passes at runtime; a report failing any check is not issued |
| RV2 | Review packs for FinOps IQ and Sovereign IQ | Two packs (rubric, CIO question bank, R6 rules) by `finops-cost-lead` and `sovereignty-compliance-lead` | Owner approves the packs |
| RV3 | Layer 2 reviewer service and planted-defect set (pilot: FinOps IQ) | Lambda on WS-S1, memo schema, grounding, acknowledgement flow on the FinOps IQ report screen | Evaluation targets met on the planted-defect set; owner reviews three real memos |
| RV4 | Roll out to Sovereign IQ | Pack live, acknowledgement on the Sovereign IQ screen | Same evaluation targets |
| RV5 | Resilience IQ and later accelerators | Layer 1 and pack as each reaches its outputs phase (Resilience IQ RQ7) | Per accelerator |

## Open questions (with recommended defaults)

1. **Can a consultant override a Layer 1 failure?** Default: no; an Admin can, with a recorded reason, for a named report only.
2. **Should the client edition say a review took place?** Default: one line in the methodology, "Reviewed by an LTM consultant before issue", with no mention of AI.
3. **Re-review on edit:** default, any change to answers after review re-runs both layers and clears the acknowledgement.
