# FinOps IQ v3: practice-lead review of the F3 engine

**Date:** 14 Oct 2026. **Reviewer:** `finops-cost-lead` (AI practice-lead agent). I advise; I do not sign off. The product owner decides.
**Scope:** `git diff 388ffd4..HEAD`, excluding `docs/phase3`, at commit `b7eb6a8`. Files: `packages/engine-core/src/accelerators/finops-iq/v3/*`, `packages/engine-core/test/finops-iq-v3.test.ts`, `test/golden/finops-iq-v3.json`, `audit/adapters.ts`, `design/F3-scenario-diffs.md`, CLM-FIN-162 to 164, and the PLAN.md F3 status.
**Checked against:** [DESIGN.md](DESIGN.md) (my F1 pack, approved on 14 Oct 2026) and [reference-scenarios.json](reference-scenarios.json).
**What I ran:** `vitest` on `finops-iq-v3.test.ts` (88 of 88 pass); `npm run audit:engines` (the v3 sections are quoted below); and two probe scripts in the session scratchpad that call `evaluateFinOpsIqV3` directly. Their outputs are quoted under "Evidence". I did not edit code and did not commit.

---

## 1. Verdict

**Changes required. They are small and bounded.**

The engine does what DESIGN asks on every point I checked:
- the rating rule;
- tier and targets;
- severity steps 1, 2, 4 and 5;
- waves by dependency;
- the need verdict;
- the contract;
- Unknown handled as risk.

All five reference scenarios match on tier, every rating, target and gap, the headline, and owner role and wave per finding. The four recorded differences (D1 to D4) are honest and correctly attributed to F4. The question bank is a faithful build of DESIGN section 7: 46 maturity questions, each with "Don't know", and each cites the correct capability claim.

Three issues produce client-visible output that is wrong or self-contradictory, and the goldens would freeze it:
- **H1: blanks remove findings.** This is the F5 flag. Fix it now.
- **H2: finding text describes answers the client did not give.**
- **H3: wave and time frame contradict each other** in four of the eight goldens. This defect is in my own DESIGN 5.3 and 5.4, not in the build.

Fix H1 to H3, regenerate the goldens and close the gate. The Medium items can be fixed now or assigned to the named phase. I endorse four of the five departures; the fifth (a follow-up that lowers a second capability) I do not endorse as built (M2).

---

## 2. Findings, ranked

### High

**H1. Blanks reduce the number and severity of findings, so skipping questions produces a cleaner report (the F5 flag).** This needs a fix now, not in F5.
- **Where:**
  - `evaluate.ts:325`: with no answered core question the result is `not_assessed`;
  - `evaluate.ts:406`: the gap is `null`;
  - `evaluate.ts:452`: no finding is created;
  - with a partial blank, the gap is taken from the answered questions only (`evaluate.ts:405-406`).
- **Evidence:**
  - `npm run audit:engines` under "Missing data (positive = blank flatters)":
    - executive mode: Critical + high findings +1.01 mean, **+3 worst**; Capability-gap findings +1.38 mean, **+3 worst**;
    - workshop mode: Critical + high findings +3.02 mean, **+5 worst**; Capability-gap findings +3.63 mean, **+5 worst**.
  - Golden `unanswered-executive`: the verdict says "Targeted improvements needed now", with **zero findings**.
  - Probe at Tier 2, executive mode:
    - all answers Not yet: need 72.5, "Material exposure: act this year", 8 findings (2 Critical, 5 High);
    - all answers blank: need 72.5, the same band, **0 findings**.
  - Probe with UN-10 at Walk and UN-11 blank: Anomaly Management reads Walk, at target, so no finding.
- **Why it matters:** Scorecard area 5 requires that "missing answers never flatter the result", and the engine's own audit shows they do on two of its four headlines. Executive self-serve, the door-opener, is where people skip questions most. A verdict that says "act this year" with no actions under it is the first thing a CIO will challenge. The headline and need index are already protected. The finding list, which is what the CIO acts on, is not.
- **Why now and not in F5:**
  - F4 adds lever and decision findings and their ordering on top of this list, so fixing it later means regenerating every golden twice;
  - the fix is about 20 lines and needs no value model.
- **Recommended fix (one rule, already accepted in principle as D5):**
  - A blank on an asked maturity question is rated like "Don't know" for the rating, the gap and the findings.
  - It is labelled differently: "Not answered" rather than "Unknown", and it is listed in coverage as a blank, not as an Unknown.
  - The finding is `unconfirmed`. Its first action reads "Answer and evidence: <questions>".
  - The audit's missing-data rows should then be ≤ 0 on every headline. Add that as a test.
- **Effects:**
  - `not_assessed` remains only for capabilities outside the executive set ("assessed in the workshop"), and those never create findings.
  - The need index and headline do not change (both already treat a blank as the maximum gap or as not at target).
  - Sorting: at equal severity, findings from real answers come before "not answered" ones, so the executive top five favours real answers.
  - None of the five scenarios has a blank, so their expectations do not change; only the two `unanswered-*` goldens change.
  - DESIGN 3.2 (`not_assessed` "creates no finding"), CLM-FIN-141 and CLM-FIN-163 need amending. As the DESIGN author, I recommend the amendment.

**H2. The "business consequence" states things about the client that the client did not say.**
- **Where:** `evaluate.ts:457` fills `currentGuidance` from the capability-level guidance for the overall rating, and `engine-rules.json:55` uses the template `"Today: {currentGuidance}"`.
- **Evidence:** Probe, workshop mode, with UN-10 at Crawl and UN-11 at **Run** (bill increases explained the same day). The Anomaly Management finding reads: *"Today: Static budget or threshold alerts only; explaining an increase takes weeks."* With UN-11 left blank, the same sentence appears.
- **Why it matters:** This is a factual misstatement about the client in a client-visible field (area 13(a) traceability, area 6). Any CIO who answered the question will spot it immediately. The field also does not do what DESIGN 5.2 asks: "one or two sentences on money, risk or decision speed". It describes a maturity level instead of a business consequence.
- **Recommended fix:**
  - Now: build "Today" from the option label(s) of the answered question(s) that set the rating (the weakest core answer, plus the depth answer if it lowered the rating), and name the question.
  - F7 at the latest: add a per-capability `businessConsequence` (money, risk or decision speed, with claim IDs) to `registry/capabilities.json` and use it here.

**H3. The roadmap wave and the time frame contradict each other.** The engine follows DESIGN faithfully; the fault is mine.
- **Where:**
  - `engine-rules.json:49`: the time frame comes from severity (Critical 0–3, High 3–6, Medium 6–12 months);
  - `evaluate.ts:469-484`: the wave comes from the registry and its dependencies;
  - DESIGN 5.4 gives the wave windows: wave 1 0–6 months, wave 2 3–12, wave 3 9–24.
- **Evidence (goldens):**
  - RS2 `ANOMALY_MANAGEMENT`: wave 1 (0–6 months) but 6–12 months;
  - RS4 `UNIT_ECONOMICS`, `EXECUTIVE_STRATEGY_ALIGNMENT`, `FINOPS_EDUCATION_ENABLEMENT` and `FINOPS_ASSESSMENT`: wave 3 (from month 9) but **3–6 months**;
  - RS4 `USAGE_OPTIMIZATION`: "after F-FIN-ALLOCATION" yet 0–3 months, the same window as Allocation;
  - RS5 `ALLOCATION`: wave 1, 6–12 months.
  - The probe at Tier 3 with everything at Not yet shows the pairs w2 with 0–3 months and w3 with 3–6 months.
  - RS4 also has seven Critical findings, all due in 0–3 months.
- **Why it matters:** A CIO or delivery lead reads "Wave 3 (months 9–24), due in 3–6 months" as an error. Seven Critical programmes in 90 days fails area 13(e) ("delivery-grade").
- **Recommended fix (owner decision; my recommended default):**
  - Split the field into `start` (the wave window, never before the end of the finding's dependencies) and `targetDuration` (from severity, as today).
  - Add an invariant test: no finding starts before a finding it depends on ends.
  - Leave the capacity smoothing of Critical items to F7, but record it there.
  - I will amend DESIGN 5.3 and 5.4 to match.

### Medium

**M1. A "Don't know" on a depth question escalates the whole capability, far beyond the worst real answer.**
- **Where:** `evaluate.ts:328-333`. Any Unknown makes the capability Unknown, which is gap = target index. This follows DESIGN 3.3 step 4, but it conflicts with DESIGN 3.3 "limit on single-answer influence" (a non-core answer moves a capability by at most one level).
- **Evidence:** Probe at Tier 2 with OP-01 at Run:
  - OP-08 (Spot) at Not yet: Rate Optimization reads Walk, no finding;
  - OP-08 at **Don't know**: Rate Optimization reads Unknown, gap 2, a **High** finding due in 3–6 months.
- **Why it matters:** "Our commitments are at Run; the Spot owner wasn't in the room, and you rate Rate Optimization High?" Unknown should count as risk, but no more than the worst answer to the same question.
- **Recommended fix:** a depth-question Unknown acts as Not yet for the one-level rule and sets `unconfirmed: true`. A core Unknown keeps step 4. The rule stays monotone. The scenarios do not change: the RS4 and RS5 Unknowns are on core questions (UN-10 and UN-11, QV-01).

**M2. Departure 5 (a follow-up lowers a second capability) breaks cross-capability monotonicity, and the test exempts it.**
- **Where:**
  - `question-bank.json:2561`: QV-06 is asked when UN-04 is at Walk or better;
  - test `finops-iq-v3.test.ts:588` and `:630`: the headline check skips `TRIGGER_SOURCES`.
- **Evidence:** Probe in workshop mode: UN-04 at Crawl gives Unit Economics Walk; UN-04 at Walk plus QV-06 at Not yet gives Unit Economics **Crawl**. Better allocation lowers Unit Economics. At Tier 3 (target Walk) this creates a new finding.
- **Why it matters:** Area 5 says "better answers never score worse". The dependency of Unit Economics on Allocation is already expressed by the wave dependency.
- **Recommended fix:** trigger QV-06 on its own capability, QV-05 at Crawl or better ("Do unit costs inform decisions?" presupposes that unit costs exist). Within one capability the rule stays monotone: if the core answer rises one level, a one-level depth lowering can never fall below the old rating. Then remove the `TRIGGER_SOURCES` exemption from the test. I will amend DESIGN 4.4 and 7.5.

**M3. Findings are owned by a "FinOps lead" the report says does not exist.**
- **Where:** `engine-rules.json:15-40`, `evaluate.ts:467`.
- **Evidence:**
  - Probe at Tier 3 with MP-01 at Not yet: 8 of 20 findings are owned by "FinOps lead".
  - In RS4, Practice Operations is at Not yet, yet Allocation, Rate Optimization, Reporting, KPIs, Education, Assessment and Tools are all assigned to the FinOps lead.
- **Recommended fix:** when MP-01 is Crawl, Not yet or blank, or Practice Operations is below target, the owner reads "FinOps lead (to be appointed; interim: Head of Cloud / CCoE)". Each such finding gets `dependsOn` set to the Practice Operations finding, or to DECISION-01 once built (M4).

**M4. The decision finding DECISION-01 ("Appoint an accountable FinOps owner") is deferred for lack of a severity rule. I can supply the rule now.**
- **Where:** F3-scenario-diffs D1. RS5 (no FinOps function, Tier 1) loses its expected top finding, and the F3 RS5 report has no ownership action at all.
- **Proposed rule:** trigger when MP-01 is Not yet or Crawl (or Unknown, flagged unconfirmed). Severity High, plus one level at Tier 2 or 3 (the same logic as the foundation uplift). Owner CIO. Wave 1. Offering `OFF.FIN.OPMODEL`.
- **Fit with the scenarios:** this reproduces both written expectations, RS4 Critical (Tier 3) and RS5 High (Tier 1), and needs no value model.
- **Recommendation:** build it now, or at the latest in F4, as a recorded owner decision.

**M5. Answer-option wording.**

| # | Question | Location | Problem | Fix |
|---|---|---|---|---|
| a | QV-01 | `question-bank.json:2231-2241` | "Within plus or minus 5%" / "5-10%" / "10-20%" overlap at 5% and 10%, and the middle options drop "plus or minus" | "Within ±5%" / "More than ±5%, up to ±10%" / "More than ±10%, up to ±20%" / "More than ±20%, or no forecast" |
| b | UN-11 | `:2168` | Crawl, "Weeks, and the answer is contested", leaves "weeks, not contested" uncovered | "A week or more, or the explanation is disputed" |
| c | MP-01 | `:3946` | A named **full-time** owner without a written mandate fits no option (Run needs a mandate and a sponsor; Walk says part-time). This is an executive question and the DECISION-01 trigger | Walk: "A named owner (full- or part-time) without a written mandate or sponsor" |
| d | UN-04 | `:1692-1702` | "85-90%" / "70-84%" leave 84.1–84.9% unassigned | "85% to 90%" / "70% to under 85%" |
| e | All compound options (UN-01, UN-10, OP-01, QV-02 and others) | | | One instruction on every maturity screen: "Choose the highest option that fully describes you today." This keeps the options exclusive without rewording each one |

**M6. "Not yet" at under 70% allocation clashes with the meaning of "Not yet".**
- **Where:** `question-bank.json:1702` (F2 band, CLM-FIN-124, status S).
- **Problem:** DESIGN 3.2 defines Not yet as "not performed in any deliberate way". A client that allocates 65% of spend by rule is clearly doing Allocation deliberately. The Foundation's figures are labelled **sample goals**, not floors (CLM-FIN-035).
- **CIO challenge:** "We allocate 65% and you say we have not started?"
- **Recommendation (owner decision):** keep the F2 floors for Walk and Run, but set Not yet = "not measured, or under 40%" and Crawl = "40% to under 85%". Otherwise relabel the bottom option "Below the Crawl sample goal". This changes no scenario: RS levels are recorded, not percentages.

**M7. `evidenceToConfirm` shows question IDs, not evidence.**
- **Where:** `engine-rules.json:59` produces "Evidence behind the answers to UN-10, UN-11".
- **Problem:** DESIGN 5.2 wants named evidence (for example "FOCUS export for all accounts, last 3 months"). The finding titles ("Allocation: Crawl, target Walk") are also framework shorthand that the executive view should translate.
- **Fix:** add a per-capability evidence line to the registry now. Plain-language executive titles can wait for F7.

**M8. Claims register entries describe rules the engine does not apply, or assert approval that has not happened yet.**
- **CLM-FIN-127** (`claims-register.json:6901`): still describes the "+10 value" and "+5 HY-03 / HY-05" modifiers as part of the verdict. The engine cites this claim on every verdict, so the appendix would explain points that never apply.
- **CLM-FIN-141** (`:7240`): says "no answered question = not assessed"; the engine uses "no answered **core** question".
- **CLM-FIN-162** (`:7648`, owner roles) and **CLM-FIN-163** (`:7672`, depth-only means not assessed): both are marked `verification: V` because they "match the owner-approved design pack". DESIGN does not contain the owner-role table or that blank rule; both are F3 departures awaiting the owner.
- **Fix:**
  - mark the departure parts "pending owner decision" until approved;
  - amend 127 to match departure 4 (below) and to say the value modifier arrives in F4;
  - align 141 and 163 with H1 and M1.

**M9. The audit does not show every verdict band as reachable.**
- **Where:** `audit/adapters.ts:154-158`. The executive fixture is a single Tier 2 estate with growth at 10% and no AI.
- **Evidence:** the audit reports "never reached: Act now". By arithmetic the band is reachable: Tier 3 with all answers Not yet gives 91.7 + 20, capped at 100. But area 5 asks the audit to show it.
- **Fix:** add a Tier 3 executive fixture, or let the random generator vary the tier and growth facts.

### Low (housekeeping)

| # | Issue | Where | Fix |
|---|---|---|---|
| L1 | A "don't know" on growth (SC-05) gives 10 fewer need points than an answer of 20% or more, and is not listed as a blind spot | `evaluate.ts:509-510`, `:525` | List it in `blindSpots`. Do not presume growth |
| L2 | The basis line says "Based on your answers to 18 questions" even when none were answered | `evaluate.ts:532`, `unanswered-executive` golden | "N of 18 questions answered" |
| L3 | The headline says "LTM's default target" even when the consultant overrode a target | `engine-rules.json:63` | "LTM's targets (N set by the consultant)" |
| L4 | Duplicate target overrides for one capability are accepted silently; the first wins | `contract.ts:248-256` | Reject duplicates |
| L5 | UN-08 `[]` is scored Not yet. Correct, but the F6 page must not send `[]` for an untouched question | F6 | Browser test |
| L6 | The migration half of the `migration_or_ai` modifier reads `footprint.migration` in executive mode, although SC-06 is workshop-only | `evaluate.ts:511-513` | Use AI scope only in executive mode, or add SC-06 to the basis line |
| L7 | Basis citations | UN-01 omits OCI (CLM-FIN-107); MP-12 cites OpenCost (CLM-FIN-110), a Kubernetes tool, for a general tooling question; MP-01 cites Flexera's 63% (CLM-FIN-042), which is context, not a basis | Tidy the citations |
| L8 | PLAN.md says "Not committed", but the work is committed in `b7eb6a8` | `PLAN.md:205` | Correct the status line |

---

## 3. The checks you asked for

### (1) Question bank

| Check | Result |
|---|---|
| CIO-recognisable wording | Yes overall. Business words come first, and tool names appear only as examples with alternatives (DESIGN 7.1 rule 4). The two exceptions are finding titles and evidence lines (M7) |
| Options do not overlap | Mostly. Four specific defects (M5 a–d) and one general fix for compound options (M5 e) |
| Every maturity question has Unknown | Yes, all 46, including the UN-08 multi-select |
| Claim IDs are right | Yes. Each maturity question cites its own capability claim (CLM-FIN-011 to 032). Threshold questions cite their threshold claims: UN-04 cites 124 and 035; QV-01 cites 126 and 037; UN-10 and UN-11 cite 123 and 038; UN-08 cites 125. Minor tidying is in L7 |

### (2) Rating rule, targets, findings and need verdict against DESIGN

| Element | Matches DESIGN? | Note |
|---|---|---|
| Rating rule (3.3) | Yes | Steps 1–6 as written. The conflict between step 4 and the single-answer limit is M1 |
| Targets (3.4) | Yes | From the registry; Tier 1 has no target where DESIGN shows "—"; override with a reason of 10 to 500 characters |
| Severity (5.3) | Steps 1, 2, 4 and 5 yes | Step 3 (value uplift) is F4, recorded as D2 |
| Owner role and wave (5.2, 5.4) | Yes for all 10 scenario-covered capabilities | The remaining 12 are LTM defaults (departure 3). Dependency propagation is single-pass, which is correct because the registry's dependencies are one level deep |
| Need verdict (9) | Yes | Base index, Unknown as the target index, blank as the maximum gap (stricter than DESIGN: any blank in a capability means the maximum gap, which I endorse), tier, growth and AI modifiers, cap, Q14 bands, executive confidence never above Medium. The value modifier is pending F4 (D3). HY modifiers are departure 4 |

### (3) The builder's departures

| # | Departure | My position |
|---|---|---|
| 1 | Blank capabilities are never counted at target and count as the maximum gap in the need index | **Endorse.** Conservative and consistent with D5 |
| 2 | Follow-up-only answers leave a capability "not assessed" | **Endorse the principle** (never rate a capability from depth answers alone). **Change the outcome** under H1: the capability reads "Not answered" with an unconfirmed finding, not a silent "not assessed" |
| 3 | Default owner roles (CLM-FIN-162) | **Endorse the 12 defaults** as planning defaults the consultant can change. They agree with the role list in DESIGN 5.2 and with the FinOps Framework's personas (FinOps Practitioner, Engineering, Finance, Procurement, Product, Leadership; status P, see Sources). **Add** the interim-owner rule (M3). In F7, consider procurement as co-owner of negotiated agreements (OP-03) |
| 4 | Verdict executive-only, so HY-03 and HY-05 urgency points never apply | **Endorse, and go further:** retire those two modifiers formally. Scoring hypothesis answers sits badly with D4 ("never scored"). HY-03 stays in conflict probe CP-3 and in the narrative. Amend DESIGN 9 and CLM-FIN-127 (M8) |
| 5 | A follow-up can lower a second capability (UN-04 → QV-06) | **Do not endorse as built** (M2). Re-trigger QV-06 on QV-05 |
| PLAN item 5 | Cost IQ pre-fill table deferred to F6 | **Endorse.** The contract already scores an unconfirmed pre-fill as blank, and it is tested |

### (4) F5 flag: blanks reduce the number of findings

This is not acceptable to leave until F5. It needs a fix now (H1). The audit already measures it as flattering: up to 3 fewer Critical and High findings in executive mode and up to 5 fewer in workshop mode. The fix is small, uses a rule the owner has already accepted (Unknown counts as risk), leaves the headline and need index unchanged, and avoids regenerating the goldens again after F4.

### (5) Questions a sceptical CIO would ask of the F3 output

| # | Question | Does the F3 output answer it? |
|---|---|---|
| 1 | "You say we take weeks to explain a bill increase. We told you same day." | **No.** The text is wrong (H2) |
| 2 | "We skipped five questions and the report got shorter. Is that how it works?" | **No** (H1) |
| 3 | "Wave 3 starts at month 9, but this is due in 3–6 months?" | **No** (H3) |
| 4 | "Eight actions are owned by a FinOps lead we don't have." | **No** (M3, M4) |
| 5 | "Nobody knew our Spot practice, and Rate Optimization became High?" | **No** (M1) |
| 6 | "We allocate 65% by rule. Why does that make us 'Not yet'?" | **Partly.** The band is cited to the Foundation's sample goals, but the label contradicts the definition (M6) |
| 7 | "Why is Walk the right target for us?" | **Yes.** The target is labelled an LTM heuristic by tier (CLM-FIN-121), with the tier trace and the override path |
| 8 | "Is this a FinOps Foundation assessment?" | **Yes.** The basis line and CLM-FIN-033 say it is not |
| 9 | "How much is this worth?" | **Yes, for F3.** The value model is stamped "not-built (F4)" and no money appears |
| 10 | "What evidence would change your view?" | **Partly.** It lists question IDs, not named evidence (M7) |

### Distinctness (area 1)

The diff does not change the boundary with Cost IQ or FinOps Value Case:
- v2 and the FinOps Value Case engine are untouched until F6 and F12;
- the capability model and lever library are shared from the F2 registry, as DESIGN 2.2 requires;
- no new overlap is introduced.

---

## 4. Evidence (probe outputs, 14 Oct 2026)

```
UN-04=walk,  QV-06 blank    | UE walk  complete false
UN-04=crawl, QV-06 blank    | UE walk  complete true
UN-04=walk,  QV-06 not_yet  | UE crawl                          (M2)
exec all not_yet | need 72.5 Material exposure: act this year Medium | findings 8 Critical,Critical,High,High,High,High,High,Medium
exec all blank   | need 72.5 Material exposure: act this year Low    | findings 0       (H1)
anomaly UN-10 walk + UN-11 blank: walk gap 0 finding? false          (H1)
tier 3 FinOps lead-owned findings with MP-01=not_yet: 8 of 20        (M3)
wave/timeframe pairs: w1:0-3 months; w2:0-3 months; w2:3-6 months; w3:3-6 months   (H3)
tier 2 OP-01 run, OP-08 not_yet -> walk gap 0 no finding
tier 2 OP-01 run, OP-08 unknown -> unknown gap 2 High 3-6 months     (M1)
UN-10 crawl + UN-11 run: "Today: Static budget or threshold alerts only; explaining an increase takes weeks."   (H2)
```

---

## 5. Summary

**Verdict: changes required, all small.**

**Sound and matching DESIGN:**
- the engine architecture, contract and rating rule;
- tier and targets;
- severity, apart from the F4 uplift;
- waves by dependency;
- the need verdict;
- parity with the reference scenarios.

**Must fix before the F3 gate:**
- H1: treat a blank like Unknown for findings, labelled "Not answered", so blanks never shorten the finding list;
- H2: "Today" text must quote the client's own weakest answers;
- H3: separate the start window from the duration so wave and time frame agree. The defect is in my DESIGN 5.3 and 5.4; I will amend it.

**Medium items:**
- M1: a depth Unknown lowers by one level only;
- M2: re-trigger QV-06 on QV-05;
- M3: interim owner when there is no FinOps lead;
- M4: build DECISION-01 with the rule above;
- M5 and M6: option wording and the "Not yet" label;
- M7: named evidence;
- M8: align the claims register;
- M9: show Act now as reachable in the audit.

**Departures:**
- endorsed: 1, 3 (with M3), 4 (with the HY modifiers retired) and the deferred Cost IQ pre-fill table;
- endorsed with changed outcome: 2 (under H1);
- not endorsed as built: 5 (M2).

---

## 6. Sources

| Source | URL | Checked | Used for |
|---|---|---|---|
| FinOps Framework Poster 2025 (FinOps Foundation): personas Engineering, FinOps Practitioner, Finance, Leadership, Procurement, Product | https://finops.org/wp-content/uploads/2025/03/FinOps-Framework-Poster-2025.pdf | 14 Oct 2026, through web search results only; not fetched. **Status P**: the core / allied grouping was not read | Departure 3 (owner roles) |
| FinOps Foundation maturity model, sample goals (via register entries CLM-FIN-035 and 037, status S) | https://www.finops.org/framework/maturity-model/ | Not re-read in this review; relied on the register entry | M6 (the figures are labelled sample goals, not floors) |
| LTM claims register | `packages/engine-core/src/claims/claims-register.json` | Read 14 Oct 2026 | CLM-FIN-035, 037, 121–127, 141, 162–164 |
| DESIGN.md and reference-scenarios.json (LTM, owner-approved 14 Oct 2026) | `docs/cio-readiness/finops-iq/design/` | Read 14 Oct 2026 | Specification checked against |

Everything else in this review is a reading of the code, the tests, the audit output or the probe output, cited by file and line above. The recommendations are my judgement as practice lead and are labelled as such. The owner decides.

---

## 7. Re-review (14 Oct 2026, commit `dae4457`)

**What I checked:**
- the diff `380ccd6..dae4457`: engine 3.1.0, question bank 3.1.0, engine rules 1.1.0, claims, audit adapter, `finding.schema.json`, the goldens, F3-scenario-diffs.md and the PLAN F3 status;
- the v3 test file: 95 of 95 pass;
- `npm run audit:engines`;
- probe `probe3.ts` in the session scratchpad.

I did not edit code and did not commit. I amended DESIGN.md 3.2, 3.3, 4.4, 5.3, 5.4, 7.5 and 9, each change marked "F3 review, pending owner confirmation". I also amended the QV-06 row in 7.3 so that it matches 7.5.

### Verdict

**Approve, with one change (R1) to make before the owner merges.**

Every High and Medium item I asked to be fixed is fixed and verified. One new Medium (R1) comes from the H3 schedule rule and shows in a reference scenario (RS5), so it should be corrected before the goldens are approved. The rest are Low or need an owner decision.

### Item-by-item

| Item | Status | Evidence |
|---|---|---|
| H1 Blanks reduce findings | **Fixed** | `evaluate.ts` passes a blank to `rateCapability` as `unknown` and labels it "Not answered"; the action reads "Answer and evidence: …". Audit missing-data shift is **+0 worst** on all five headlines in both modes (it was +3 executive and +5 workshop). Golden `unanswered-executive` now has 8 unconfirmed findings, including DECISION-01; it had 0. Basis line: "Based on 4 of 18 questions answered" |
| H2 "Today" text | **Fixed** | Probe with UN-10 Crawl and UN-11 Run: *"Today: 'Static budget or threshold alerts only' (UN-10). Unexpected increases keep running until someone notices them…"*. It quotes only the answer that set the rating. Per-capability consequence text is in CLM-FIN-165, money/risk/decision-speed wording, no figures |
| H3 Wave vs time frame | **Fixed, with a new issue R1** | `start` and `targetDuration` replace `timeFrame` (schema updated). No finding now starts before its wave window or before a dependency is due to complete. RS4: wave 3 items start from month 9 |
| M1 Depth "Don't know" | **Fixed** | Probe at Tier 2 with OP-01 Run and OP-08 Not yet / Don't know / blank: all read Walk with no finding; Don't know and blank are also not at target (unconfirmed). It was a High finding before |
| M2 QV-06 trigger | **Fixed** | `question-bank.json`: QV-06 now asked when QV-05 ≥ Crawl. The `TRIGGER_SOURCES` exemption is gone; invariants hold with no exemptions. RS3 now asks QV-06 (blank), and its rating is unchanged (recorded in the scenario diffs) |
| M3 Interim owner | **Fixed; I accept the builder's choice** | Builder's choice: findings owned by the FinOps lead show "FinOps lead (to be appointed; interim: Head of Cloud / CCoE)" with **no** dependency on DECISION-01. I had suggested the dependency. The builder's version is better delivery advice: the work starts under the interim owner while the appointment runs in parallel at month 0, instead of every FinOps-lead item waiting for a hire. Recorded in DESIGN 5.4 |
| M4 DECISION-01 | **Fixed** | CLM-FIN-166: High, one level higher at Tier 2 or 3. RS4 Critical and RS5 High, as written in the scenarios |
| M5 Option wording | **Fixed** | QV-01 is now "Within ±5%" / "More than ±5%, up to ±10%" / "More than ±10%, up to ±20%" / "More than ±20%, or no forecast". UN-11 Crawl: "A week or more, or the explanation is disputed". MP-01 Walk now covers a full- or part-time owner without a mandate. UN-04 bands are now "85% to 90%" and "70% to under 85%". The "Choose the highest option that fully describes you today" help text is on every maturity question |
| M6 "Not yet" below 70% | Open, owner decision | Unchanged, as agreed |
| M7 Named evidence | **Fixed** | Per-capability evidence lines, for example Anomaly Management: "The anomaly alert set-up and the last three alerts, with the time to triage and the cause found" |
| M8 Claims | **Fixed** | CLM-FIN-122, 127, 141, 162, 163, 165 and 166 match the engine and are set to P, with a note that they await the owner. CLM-FIN-127 drops the HY points and marks the value modifier "from F4" |
| M9 "Act now" reachable | **Fixed** | The audit adds a Tier 3 executive estate; every band is now reached. The random mix is now 49% "Act now", which reflects the mix of test estates, not a calibration result |
| L1–L4, L6, L7 | Fixed | Growth blind spot; "N of 18 answered"; override suffix; duplicate overrides rejected; migration share dropped in executive mode; citations tidied (OCI added to UN-01, Flexera removed from MP-01) |
| L5 (UN-08 `[]` on the page) | F6 | Correctly deferred |

### Remaining items

**R1. Medium; fix before the goldens are approved. The schedule waits for dependencies to *complete*, so Usage Optimization can start at month 12.**
- **Evidence:** golden RS5 and `unanswered-executive` show `F-FIN-USAGE_OPTIMIZATION` in wave 2 "from month 12, within 12 months", because Allocation (Medium, 12 months) must finish first.
- **Why it matters:** DESIGN 5.4 puts the idle (LEV-03) and scheduling (LEV-04) quick wins in wave 1, and makes only LEV-02 and LEV-07 depend on Allocation. Telling a Tier 1 retailer's CIO to wait a year before cleaning up idle resources is poor advice. The CIO would also see a wave 2 item (months 3–12) starting at month 12.
- **Recommended fix:** a dependent finding starts no earlier than its dependency's start **plus its first milestone**: 3 months, or the dependency's `targetDuration` if shorter. It still never starts before its own wave window. Add a test that no start exceeds the end of its wave window unless a dependency is Critical or High and still in progress.
- RS2 and RS4 do not change (their dependencies are Critical, 3 months). RS5 Usage Optimization would start at month 3.
- F4 then links the quick-win levers to wave 1 directly. DESIGN 5.4 records R1 as open.

**R2. Low. Two findings on the same issue.** In RS4 and in the unanswered goldens, `F-FIN-FINOPS_PRACTICE_OPERATIONS` and `F-FIN-DECISION-01` both appear, which uses two of the executive top-five slots on accountability. The scenarios expect both, so this is not a defect. Recommendation for F7: present them together (the decision first, with the capability gap as its detail), or let the executive top five show only the decision.

**R3. Low. DECISION-01 overstates its consequence.** "No finding in this report has an owner who can see it through" is not true: other findings are owned by the CIO, FP&A and others. Suggested wording: "Until someone is accountable for cloud and technology spend, no one is responsible for seeing this programme through."

**R4. Low, owner awareness. Workshop audit lists the Usage Optimization depth questions OP-05 to OP-12 as "dead".** This follows from the owner-approved one-level rule (Q9) combined with M1. With seven depth questions and random answers, one is almost always already below the core level, so changing another rarely moves the rating. The questions are not truly dead: each lowers the rating when the others sit at the core level, and they feed the lever bases (F4) and the playbook (F8). Recommendation: add an audit or test check from an all-at-core baseline, so that liveness is demonstrated rather than explained, and record the owner's acceptance under area 5.

**R5. Low, robustness.** Two internal checks are fragile:
- the "not answered last" sort detects blank-driven findings by the text prefix "Answer and evidence" (`evaluate.ts`, `blankDriven`); use `p.notAnswered.length` carried on the finding instead;
- a blank or "Don't know" depth answer on a capability above target leaves it "not at target" with no finding. This is correct and conservative, and it is listed in coverage. The F7 report should show the open questions next to the headline so the count can be explained.

### Departures (final position)

| Departure | Position |
|---|---|
| H1 rule (blank = "Don't know", "Not answered") | Endorse |
| H3 schedule (`start` + `targetDuration`) | Endorse, with R1 |
| M1 (depth Unknown lowers one level) | Endorse |
| M2 (QV-06 follows QV-05) | Endorse |
| Twelve default owner roles + interim owner without a DECISION-01 dependency | Endorse |
| DECISION-01 severity rule | Endorse |
| Retire the HY-03 and HY-05 urgency points; verdict executive-only | Endorse |
| Per-capability consequence and evidence wording (CLM-FIN-165) | Endorse. It is LTM wording with no figures; re-read it in the F7 presentation review |

All of these are recorded in DESIGN.md as "F3 review, pending owner confirmation". The owner decides.
