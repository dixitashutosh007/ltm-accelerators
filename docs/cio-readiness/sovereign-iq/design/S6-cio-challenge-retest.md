# Sovereign IQ Gate S6: CIO challenge re-test

**Date:** 26 Oct 2026. **Reviewer:** sovereignty-compliance-lead (AI practice-lead agent). This is advice; the product owner decides.
**Build:** branch `sovereign-iq-s6-fixes`, uncommitted working tree on top of ce24acd. Engine 4.6.0, questions 4.2.0, controls 4.0.0, regulation registry 1.1.0 (status as of 2026-10-25), claims register 0.1.0, `delivery.json` 1.0.0, `assumptions.json` 1.0.0.
**First test:** [S6-cio-challenge.md](S6-cio-challenge.md). It scored 3 Pass, 5 Partial and 2 Fail. The same ten questions and rules apply here: each question is judged only from what the client-edition PDF says.
**Evidence:** the five archetypes rendered in workshop mode, dated 26 Oct 2026, in the session scratchpad `s6-pdfs-v2/`. I re-extracted the text with pdfjs so that page numbers match the PDFs.
- **Read in full:** ARC1 (EU bank, DORA; 28 pages) and ARC5 (India services firm with EU clients; 28 pages).
- **Spot-checked:** ARC2 (UK insurer; 23 pages), ARC3 (US health-tech; 27 pages) and ARC4 (SG/AU banking group; 24 pages). I covered the executive summary, required level, exposure table, the "How we calculated this" cap tables, cloud advisory options, roadmap, How LTM can help and methodology.
- **Checked across all ten PDFs and five backlogs:**
  - which content appears only in the consultant edition;
  - internal references in the client edition;
  - blank pages: none found, since no page has only its header and footer;
  - backlog columns.
- **Read:** `v4/delivery.json` and `v4/assumptions.json`.

## Verdict

**Score: 10 of 10 Pass, 0 Partial, 0 Fail. The gate (9 of 10) is met.**

The changes do what the coordinator's list says. Every question can now be answered from the client edition's own pages:
- **Q1:** the calculation appendix rebuilds 55 out of 100 control by control. I re-added the ARC1 weights: they total 47, the weighted scores 25.7, giving 55. It also rebuilds each cap from the rule, the turnover and the ECB rate.
- **Q4:** the hosting statement answers the question.
- **Q7:** the roadmap now has start, duration, effort, "After", milestone, KPI and risks.
- **Q6:** sovereign options are filtered by zone and carry their caveats.

The fixes introduced or exposed some defects. None of them turns a question back to Partial, but **two should be fixed before any client sees the report**:
- **N1:** "What a lower level would change" says findings "would not arise" when another kind of data still needs the same control. A General Counsel who tests that line will find it wrong in ARC1 and ARC5.
- **N2:** ARC2 and ARC4 show "84 / 100 Managed" and "85 / 100 Managed". The report's own band table says 80 and above is "Sovereign-ready". The executive summary does not say the band was capped.

**Recommendation (advice):** approve Gate S6. Two conditions apply:
- N1 and N2 are fixed before the report is used with a client. Both are wording or small rule changes.
- The items the coordinator listed as open are carried, with owners, to the S10 counsel gate. Those are D13 to D15, D7(c), the D8 "related obligations" attribution and the EKM GA check. I agree they do not count against this gate. D8 and D7(c) should still land before a DORA bank or any General Counsel sees the report.

## Results by question

| # | Question | First test | Re-test | Where it is answered now (archetype, page) |
|---|---|---|---|---|
| 1 | Where does this number come from? | Partial | **Pass** | Appendix A "How we calculated this": maturity table, area arithmetic, statutory maximums with rule, turnover and rate; "Every number" (ARC1 p20 to p22; ARC3 p18 to p19; ARC4 p15 to p16). Appendix B register (ARC1 p23 to p24) |
| 2 | Is this legal advice? Who has checked it? | Pass | **Pass** | Cover status; p3 callout; "Scope and limitations" (ARC1 p1, p3, p18) |
| 3 | Are you adding fines together? Are these what we would pay? | Pass | **Pass** | Tile and callout (p3); "at least" wording, entity class and SME range (ARC3 p8, p18; ARC4 p8; ARC5 p8); ASM-SOV-009 |
| 4 | Your tool runs in India. What happened to our data? | Fail | **Pass** | Methodology "How your data is handled" (ARC1 p18 to p19; ARC5 p18 to p19) |
| 5 | Why does this data need L3 and not L2? | Partial | **Pass** (defect N1) | Section 2 "Legal minimum" column and "What a lower level would change" (ARC1 p4; ARC5 p4; ARC4 p4) |
| 6 | Does the provider offering you name really meet the rung? | Partial | **Pass** | Section 7 options with notes (ARC1 p12 to p14; ARC4 p11) |
| 7 | Can my team deliver this roadmap? | Fail | **Pass** (defects N4, N5) | Section 8 roadmap (ARC1 p15 to p17; ARC5 p15 to p17; ARC3 p14 to p15); backlog columns |
| 8 | What did you leave out, and what is not yet verified? | Partial | **Pass** (defect N8) | "Scope and limitations" with pending count (ARC1 p18); Appendix C "Regulations checked that do not apply" (ARC1 p25 to p26) |
| 9 | Is SEAL rating us, or telling us a provider is SEAL-3? | Pass | **Pass** | Section 3 (ARC1 p4 to p5). Relevance line for clients with no EU footprint (ARC2 p4, ARC4 p4) |
| 10 | Is "How LTM can help" just a sales pitch? | Partial | **Pass** | Section 9 opening sentence; one primary offering per finding (ARC1 p17 to p18; ARC5 p17 to p18) |

### Q1. Where does this number come from? Partial → Pass

**Maturity.** ARC1 p20 says: "Maturity is the sum of weighted scores over the sum of weights: 25.67 ÷ 47 × 100 = 55."
- The table lists all 24 controls with weight, state value and weighted score.
- I re-added it: the weights total 47 and the weighted scores 25.7.
- The areas reconcile, for example "Keys and encryption 3 ÷ 7 = 43" (key custody 1 + revocation 0.67 + encryption 1.33, over weights 3 + 2 + 2).

**Caps.** ARC1 p21 says: "Turnover used: EUR 3,200,000,000 worldwide, as you gave it. Exchange rates: ECB reference rates of 2026-10-12 (ASM-SOV-010)." It then shows "4% of EUR 3.2bn worldwide turnover = EUR 128m".
- ARC3 p18 names the limb that applies: "EUR 20M fixed limb (4% of USD 75M is lower)".
- ARC4 p15 explains why only the fixed limb is computed.

**Every number.** The "Every number" table maps each figure on the page to what it is read from (p21 to p22).

**Assumptions.** Appendix B gives value, basis, confidence and "if it is wrong" for ASM-SOV-001 to 014.

**Residual weaknesses, not enough to fail the question:**
- The ARC4 headline compares two "at least" figures (N6).
- Heuristic entries do not give their reasoning (see the heuristics review below).

### Q2. Is this legal advice? Pass (unchanged)

The cover and p3 are unchanged. The new "Scope and limitations" box adds: "review by qualified counsel is pending, so this is not legal advice" (ARC1 p18).

### Q3. Are you adding fines together? Pass (unchanged; D3 largely fixed)

The figures now match the statutes as I sourced them in the first test:
- ARC4 p8 shows "at least SGD 1.00m (s.48J(1))" and "at least AUD 50.0m (s.13G)". p15 to p16 name every limb: "The higher of SGD 1M or 10% of annual turnover in that country; only the fixed amount is computed, because the assessment does not collect that turnover".
- ARC3 p8 shows "at least EUR 10.0m (Art. 34(4); essential or important entity: size not settled, essential figure shown)" and "EUR 2.01m to EUR 15.0m (Art. 99(4))", with the SME rule explained on p18.
- The ARC3 headline is back to GDPR "EUR 20.0m".
- ARC5 p9 shows DORA for an ICT provider as "No direct penalty on you (advisory)".

**Residual issues:**
- ARC5 shows "at least USD 40.0m (Art. 34(4); essential entity)", but the "Why" text still says "You have classified yourself as an essential or important entity", and the client classified itself as important. A large Annex I managed service provider is essential under NIS2 Art. 3(1)(a), but the page does not say so (R3).
- Showing the essential figure as the floor for ARC3, when its size is not settled, overstates the important-entity floor (EUR 7m). It is labelled, so I accept it.

### Q4. Your tool runs in India. What happened to our data? Fail → Pass

ARC1 p18 to p19 (the same in every archetype):

> "LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your answers, your organisation's name and sector, any turnover figure you give, the consultant's notes and the consultant's email address … We keep each assessment for two years after its last change and then delete it automatically … Access logs … are kept for one year. The AI narrative is off for this assessment, so no AI model has seen your data. Draft wording, pending legal review."

This covers what is collected, where it is held, retention, access logs and AI. The transfer safeguard (SCCs and IDTA) is not yet stated; that is S10 work, correctly left as draft.

### Q5. Why does this data need L3 and not L2? Partial → Pass, with defect N1

**What answers it.**
- ARC1 p4 now shows "Legal minimum: L0: no localisation law found for this data in your markets" against "Required level L3 … Set by: Board choice".
- It adds "What a lower level would change". For example: "Financial and payment at L2 instead of L3: these findings would not arise: test that revoking your keys …; have services holding this data run … by staff in the region …; use services holding a high-assurance qualification …; isolate out-of-band management networks …". That line is correct: each of those controls is required only by Financial and payment at L3 (p7 to p8).

**Defect N1.** Other lines on the same page are wrong:
- ARC1 p4 says "Personal at L1 instead of L2: these findings would not arise: hold the keys …; require your explicit … approval …". But key custody and provider access approval are also required by Financial and payment at L3 ("Level: Personal (L2), Financial and payment (L3)", p7). Lowering Personal alone removes neither finding.
- ARC1 also says "Proprietary at L0 instead of L1 … enforce allowed regions …", but region enforcement is also required by Personal and Financial.
- ARC5 p4 says "Personal at L0 instead of L1 … enforce allowed regions …". Region enforcement is also required by Financial and payment at L2.

I keep Pass because the question "why this level" is answered by the legal minimum and the board's choice. The trade-off line, though, is a statement a General Counsel will test, so it must be fixed before client use.

### Q6. Does the named offering really meet the rung? Partial → Pass

**Filtered by zone.**
- ARC1 (financial data limited to the EU or EEA) offers "Bleu or Delos Cloud (National Partner Clouds) (scope and status per partner to confirm; Bleu's SecNumCloud qualification is pending); Sovereign Private Cloud (Azure Local)" (p13). Azure Government is no longer an option.
- ARC4 lists no AWS European Sovereign Cloud or GovCloud options for Singapore or Australia data. The p11 card says "No option at R3 listed for Singapore, Australia" and gives alternatives.

**Managed HSM separated from EKM.**
- "Azure Key Vault Managed HSM (keys you control in a Microsoft-operated HSM; on its own this does not hold keys outside the provider)"
- "External Key Management with Managed HSM (keeps the key-encryption key outside Microsoft; confirm general availability with Microsoft)" (ARC1 p12)

**Residual (low).** The approach prose still names offerings outside the zone, though not as options:
- ARC1 p13: "a Sovereign Private Cloud you or a partner operate; Azure Government for the US";
- ARC4 p11: "European Sovereign Cloud for the EU, GovCloud for the US; elsewhere Dedicated Local Zones".

Sources for those offerings also appear in ARC4's appendix. Trim the prose to the zones in scope (R4).

### Q7. Can my team deliver this roadmap? Fail → Pass, with defects N4 and N5

**What answers it.** ARC1 p15 states the rule: "Severity sets when each action starts; the type of work sets its effort and how long it takes. An action that depends on another starts once that one reaches its milestone."
- It defines effort bands S, M, L and XL, and marks them as "LTM planning estimates (assumptions ASM-SOV-012 and 013) that discovery and a statement of work replace".
- Each row has owner, start, duration, effort, milestone and KPI, and "After:" where a dependency exists. Each wave ends with "Key risks".
- Waves are numbered consecutively in every archetype: ARC1, ARC2 and ARC4 have 1 to 3; ARC3 and ARC5 have 1 to 4.
- The first test's contradictions are gone:
  - ARC5 p15 schedules "Move primary storage … Start in month 4; 6–12 months … After: Keep a data-flow map …; Document where each key SaaS and ICT provider …; Enforce allowed regions …";
  - ARC1 gives the migration-type in-zone operations "Start in month 7; 9–18 months · XL".
- Every backlog row now has a verification, effort, start month, duration, milestone and KPI.

**Defects to fix (not gate-blocking):**
- N4: dependents start at the shortest duration of their prerequisite.
- N5: the month numbering is ambiguous, and scope confirmations do not start first.

Both are covered in the heuristics review.

### Q8. What did you leave out? Partial → Pass, with defect N8

**What answers it.**
- ARC1 p18 "Scope and limitations" says: "The answers are self-reported and have not been tested or audited. No technical discovery was done … review by qualified counsel is pending … Obligations that apply from a later date are listed as upcoming and not yet scored. 1 item rests on a source still being verified and is not shown or scored."
- Appendix C lists all 35 regulations that do not apply (p25 to p26).
- The consultant edition's new "Pending a source" list names the two items and their claims (ARC1 consultant p30). The client's "1 item … not shown" matches: one is hidden, and the other is shown as "status to confirm".

**N8.** Every Appendix C reason reads "No applicability rule matched your answers." That is not a reason a General Counsel can check. For example, for UK GDPR it should say "no UK establishment, and no people in the UK in your answers".

### Q9. Is SEAL rating us? Pass (unchanged)

Wording is unchanged. ARC2 p4 and ARC4 p4 now add: "You have no EU establishment or EU customers on your answers. The scale is shown as a common vocabulary for comparing sovereign cloud offerings; it does not apply to you directly."

### Q10. Is "How LTM can help" a sales pitch? Partial → Pass

**What answers it.** ARC1 p17 opens: "Each item below can be delivered by your own teams or by another firm; the findings and the roadmap do not depend on it."
- Each finding now sits under one primary offering. In ARC1, key custody and provider access approval appear only under the sovereign landing zone (p18); migration covers in-zone operations and assurance only.
- The "likely – confirm" and "Agree the board's level" lines are gone where they do not apply.

**Residual (low).** In ARC5 (no exit finding), the regulatory-programme description still reads "starting with third-party registers, audit rights and exit plans", with the outline item "Audit and access rights, and exit plans for critical providers" (p16). Key the description to the findings it covers (R5).

## Status of first-test defects

| # | First severity | Status | Evidence (re-test) |
|---|---|---|---|
| D1 Hosting statement | High | **Fixed** (draft pending legal review) | ARC1 p18 to p19 |
| D2 Calculation appendix and register | High | **Fixed** | Appendices A and B in all five |
| D3 Statutory maxima | High | **Largely fixed.** Residual R3 (ARC5 NIS2 class not explained); new N6 (ARC4 headline compares floors) | ARC3 p8, p18; ARC4 p8, p15 to p16; ARC5 p8 to p9 |
| D4 Roadmap | High | **Fixed.** Heuristic refinements N4 and N5 | Section 8 in all five; backlog |
| D5 Options and caveats | High | **Fixed.** Residual R4 (prose names offerings outside the zone) | ARC1 p12 to p13; ARC4 p11 |
| D6 Encryption contradiction | High | **Fixed** | ARC1 p10: "Encryption baseline is largely in place" |
| D7 Sources | Medium | **Fixed except (c)** (NPR remains in all five, as declared). Residual N3 ("(Tasks B and C; S8)") | ARC1 p27 to p28 |
| D8 Empty Regulations column | Medium | **Partly fixed**: backlog says "Level L3 set by the board; no regulation in scope requires this control". "Related obligations" open, as declared. Residual N7 | ARC1 backlog |
| D9 Sovereign-ready next to red or critical | Medium | **Fixed, with new N2** (band label contradicts the band table) | ARC2 p3; ARC4 p3 |
| D10 Boilerplate | Medium | **Fixed.** Residual R5 (ARC5 "exit plans") | 0 hits for "Data Act switching", "Agree the board"; "UK designated" only in ARC2 |
| D11 Engine terms | Medium | **Fixed in body and backlog** ("Control gap", "Identity and keys"). New N3 in the register | 0 hits for "of the class" and "special data" |
| D12 Backlog columns | Medium | **Fixed.** Source empty only on level-driven rows (N7) | All five backlogs |
| D13 AI Act phase-in | Medium | **Open** (declared) | ARC1 p10 unchanged |
| D14 SEC foreign private issuer | Low | **Open** (declared) | ARC5 p9 unchanged |
| D15 FISA certification date | Low | **Open** (declared) | ARC1 p9 unchanged |
| D16 Layout and format | Low | **Blank page fixed**; precision accepted (shared three-significant-figure rule). Residual: "8 apply" vs "7 amber · 0 red · 0 green" still not reconciled on p3 (ARC5; ARC4: 9 vs 7) | ARC5 p3; ARC4 p3 |
| D17 Consultant edition | Low | **Fixed**: pending list, display names ("processed in United States") | ARC1 consultant p30 |

**Consultant-only separation (re-checked).** "Statement of work" and "Consultant checks" appear 0 times in every client edition and twice in each consultant edition. Claim IDs, finding IDs and control IDs appear 0 times in client PDFs. The GitHub links appear only in consultant editions.

## Open items the coordinator listed

These need sourcing. I confirm all of them remain open. My judgement on each:

| Item | Counts against S6? | Must land before |
|---|---|---|
| D13 AI Act phase-in lines (Regulation (EU) 2026/1744) | No | S10 counsel review. A General Counsel will ask which AI Act duties apply now |
| D14 SEC foreign-private-issuer branch | No | S10 |
| D15 FISA certification date | No | S10 (volatile item, 90-day review) |
| D7(c) NPR and other secondary sources | No | Any external use. A news source in a sovereignty report's appendix undermines the rest |
| D8 "related obligations" (DORA Art. 9(4)(d); RTS 2024/1774 Art. 6, 7 and 21) | No | Any use with a DORA financial entity. The backlog wording now reads correctly, but a DORA General Counsel will still look for these articles |
| EKM general availability | No | Next 90-day review. The client text already says "confirm general availability with Microsoft", which is the right hedge (D24) |

## New defects introduced by the changes

| # | Severity | Defect (archetype, page) | Recommended change | Kind |
|---|---|---|---|---|
| N1 | **High** (fix before client use) | **"What a lower level would change" overstates for shared controls.** "Personal at L1 instead of L2: these findings would not arise: hold the keys …; require … approval" (ARC1 p4), although both controls are also required by Financial and payment at L3 (p7). The same happens for Proprietary at L0 (region enforcement; ARC1 p4) and for Personal and Sensitive personal at L0 (region enforcement, also required at L2 for financial data; ARC5 p4). | Split the line: "would no longer be needed for this data: …; still needed for other data: …". Say "would not arise" only for controls no other kind of data requires. | Engine (small) |
| N2 | **Medium** (fix before client use) | **Band label contradicts the band table.** ARC2 p3 "84 / 100 · Managed" and ARC4 p3 "85 / 100 · Managed", while ASM-SOV-005 (p23) says "80 and above Sovereign-ready … Sovereign-ready is not shown while a finding is critical or a regulation is red". The reader only learns why in an appendix. | Tile and lead sentence: "84 / 100 · Managed (Sovereign-ready withheld: UK GDPR is rated red)". | Wording |
| N3 | Low | **Internal references in the client edition:**<br>- "Per control in delivery.json" (ASM-SOV-013);<br>- "(DESIGN 8.3)" (ASM-SOV-011);<br>- "Calibrated in S4 against ten public reference scenarios" (ASM-SOV-003, in the "If it is wrong" column);<br>- "LTM method note (available on request) (Tasks B and C; S8)" (Sources).<br>All five archetypes. | "LTM delivery estimates", "LTM method note", "calibrated against ten public reference scenarios" (moved to Basis). Drop "(Tasks B and C; S8)". | Wording |
| N4 | Medium | **Dependents start at the prerequisite's shortest duration** (`delivery.json` rule: "the low end of the prerequisite's duration"). Examples:<br>- ARC1 key revocation starts in month 5, but key custody (from month 2, 3 to 6 months) may run to month 8;<br>- ARC5 "Move primary storage" starts in month 4, but the data map (from now, 3 to 6 months) may run to month 7.<br>"Starts once that one reaches its milestone" is then true only on the optimistic path. | Label the start "earliest month 5", or show "month 5 to 8". Alternatively, gate on the upper bound. | Engine (small) |
| N5 | Low | **Month numbering and decision order.** Critical starts "now", and High starts "in month 2", which is index 1 in `startMonthBySeverity`. The roadmap note "Months count from the start of the programme" does not say whether month 2 means "after one month". ARC3's "Confirm whether UK GDPR … applies" (scope confirmation, S, in Wave 1 "decide, confirm and close critical gaps") starts in month 2, after the critical work it may change. | Say "month 1 is the first month", or show "after 1 month". Start scope confirmations, conflicts and board decisions now, whatever their severity. | Engine (small) and wording |
| N6 | Medium | **ARC4 headline compares floors.** "LARGEST STATUTORY CAP at least AUD 50.0m Privacy Act 1988 (Cth) s.13G" (p3). PDPA reads "at least SGD 1.00m", and its 10%-of-Singapore-turnover limb is not computed. For a group with SGD 4bn worldwide turnover, that limb could exceed AUD 50m, so "largest" is not established. | When any compared cap is "at least", label the tile "Largest computed minimum", or add "PDPA and Privacy Act turnover limbs not computed". | Wording (rule in engine) |
| N7 | Low | **Backlog level attribution.** ARC1 key custody reads "Level L3 set by the board", but the control is also required by Personal at L2. The Source column is empty on the 9 level-driven rows. | "Levels set by the board: Personal L2, Financial and payment L3". Cite the LTM method note as the source. | Engine (small) |
| N8 | Low | **Appendix C reasons are not reasons.** "No applicability rule matched your answers" is repeated 35 times (ARC1 p25 to p26). | Show the main rule's condition in words, for example "No UK establishment and no people in the UK". | Engine (registry text) |

**Residuals (carried, low or medium):**
- R3 (medium): ARC5 NIS2 says "essential or important" in "Why" against "essential entity" in the cap, and the client classified itself as important. Add: "Your size and sector (Annex I, managed services, large enterprise) make you essential under NIS2 Art. 3(1)(a), whatever your own classification; confirm the national position."
- R4 (low): approach prose names offerings outside the zone in scope.
- R5 (low): ARC5 "exit plans" in the regulatory-programme description.
- D16 residual (low): the "applies but not rated" count is not reconciled on p3.

## Review of the delivery heuristics (`delivery.json`, `assumptions.json`)

**Overall: defensible as labelled LTM heuristics, and much better than severity-driven durations.**

**What works:**
- Duration is set by the type of work, not severity.
- Severity sets the start.
- Moves to a sovereign offering are XL, 9 to 18 months. That matches the S8 migration scope of 6 to 18 months and the published scale of sovereign-cloud programmes.
- Everything is marked Low confidence, to be replaced by discovery and a statement of work.

**Changes I would make (advice):**

1. **Give each heuristic its reasoning.** FRAMEWORK.md area 13(b) asks for "LTM heuristic with reasoning".
   - ASM-SOV-012 and 013 state values only. They should also say, for example, "High starts after a one-month mobilisation (funding, owner, access)" and "durations assume one organisation, a few critical services and existing platform teams".
   - Add a `reasoning` field per control in `delivery.json`. The current `risk` field is not a basis.
   - ASM-SOV-003's calibration note belongs in Basis, not in "If it is wrong".
2. **Define "team-month".** S, M, L and XL are in team-months, but a team is undefined, so a CFO cannot reconcile effort with a statement of work. Either state "a team of 3 to 5 people", or use FTE-months, as FinOps IQ does.
3. **Gate dependents on the prerequisite's milestone range, not its low end (N4).**
4. **Add a target-selection step before XL moves.**
   - `SOV.OPS.PERSONNEL_ZONE`, `SOV.RES.LOCATION` (moved) and `SOV.JUR.IMMUNITY` depend only on the data map. In practice they also need a target decision: an advisory step of 1 to 3 months comparing the options, plus counsel's view at R4.
   - That step should be a prerequisite of each of them.
5. **Tie `SOV.CERT.ASSURANCE` to the move.**
   - Assurance is L, 6 to 12 months, but in ARC1 it sits under "Migration to a sovereign platform" beside the XL in-zone operations move.
   - If the qualification needs a platform change, it is part of that move. Give it the same `moved` variant as data location, or make it depend on the move.
6. **Contract-bound controls run to renewal.**
   - `SOV.TP.AUDIT` (3 to 6 months) and `SOV.SAAS.SUBPROCESSOR` (1 to 3 months) can often change only at contract renewal, as their own risks say ("Rights can often be added only at renewal"; "Objection rights only come at renewal").
   - Show "1 to 3 months for new and renewing contracts; existing contracts at renewal", so the KPI is not read as 100% in 3 months.
7. **Start decisions first (N5).** Scope confirmations, conflicts and board decisions should start in month 0 whatever their severity, because later work depends on their outcome.
8. **Review cadence.** Add a review owner and date to `delivery.json` and `assumptions.json`, as the claims register has, so CI can flag them like any other LTM heuristic.

None of these changes the gate result. Items 1, 2 and 3 are what a delivery-minded CIO or CFO would raise first.

## Recommendation for the owner (advice)

- **Approve Gate S6.** The challenge test now passes 10 of 10 from the client edition's own pages in all five archetypes.
- **Before any client use:** fix N1 (lower-level trade-off wording) and N2 (band label). Fix N6 (ARC4 headline) at the same time; it is a one-line label rule.
- **Before S10 counsel review:** close the declared open items (D7(c), D8 related obligations, D13 to D15, EKM GA) and R3. Adopt heuristic changes 1 to 3.
- **Can follow:** N3, N4, N5, N7, N8, R4, R5 and heuristic changes 4 to 8.

## Sources

1. First-test sources 1 to 10, in [S6-cio-challenge.md](S6-cio-challenge.md), checked 26 Oct 2026. These cover DORA Art. 9(4)(d), RTS 2024/1774, the UK critical third parties designations, PDPA s.48J, Privacy Act s.13G, AI Act Art. 99(6), SEC rules for foreign private issuers, Regulation (EU) 2026/1744, Azure Managed HSM EKM and FISA 702. The re-test pages were judged against them; no new external fact is asserted here.
2. NIS2 Art. 3(1)(a) (entities of a type in Annex I that exceed the ceilings for medium-sized enterprises are essential) and Annex I (managed service providers), https://eur-lex.europa.eu/eli/dir/2022/2555/oj. EUR-Lex was not reachable from this environment on 26 Oct 2026, as in the first test. **This is the basis of R3 and is UNSOURCED in this note until read on EUR-Lex.**
3. Internal, read 26 Oct 2026: `packages/engine-core/src/accelerators/sovereign-iq/v4/delivery.json` (1.0.0) and `assumptions.json` (1.0.0); FRAMEWORK.md area 13; PLAN.md S6 and S8; the coordinator's change list.
4. Evidence: the ten PDFs and five backlogs in the session scratchpad `s6-pdfs-v2/`, with my text extractions in `s6-text-v2/` (same scratchpad).
