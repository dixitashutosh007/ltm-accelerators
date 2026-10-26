# Sovereign IQ Gate S6: CIO challenge test (PLAN S6 item 3a, scorecard area 13)

**Date:** 26 Oct 2026. **Reviewer:** sovereignty-compliance-lead (AI practice-lead agent). This is advice; the product owner decides.
**Build:** `main`, commit ce24acd, engine 4.5.0, questions 4.2.0, controls 4.0.0, regulation registry 1.1.0 (status as of 2026-10-25), claims register 0.1.0.
**Gate:** "the practice-lead agent's CIO challenge test (ten hardest questions) answered from the report for the five archetypes" (PLAN S6 item 3a). As for FinOps IQ, the bar is at least 9 of 10 answered from the report's own pages.
**Evidence:** only the rendered PDFs and backlog CSVs from the five archetypes in `design/archetypes.json`, rendered in workshop mode with assessment date 26 Oct 2026. Pass, Partial and Fail are judged only from what the **client edition** says.
- ARC1 (EU bank, DORA; 18 pages) and ARC5 (India services firm with EU clients; 20 pages): read in full.
- ARC2 (UK insurer, 15 pages), ARC3 (US health-tech, 18 pages) and ARC4 (SG/AU banking group, 16 pages): spot-checked. I read the executive summary, compliance exposure, findings, roadmap, cloud advisory, SEAL view, How LTM can help, methodology and sources.
- I read the text page by page, extracted with pdfjs. Pages where the layout mattered were rendered to PNG in Playwright (ARC1 p1, p3, p10, p11; ARC4 p12 to p14).
- I compared the consultant editions with the client editions. I checked all five backlogs for row counts, empty columns and raw values.

This is the first CIO challenge test for Sovereign IQ. No list of questions had been designed, so I wrote the ten below.

## Verdict

**Score: 3 of 10 Pass, 5 Partial, 2 Fail. The gate (9 of 10) is not met.**

**What works:**
- The report is careful where it matters most legally:
  - it says "not legal advice" in three places;
  - it never adds statutory maxima together, and labels each one "cap, not expected fine";
  - it is explicit that SEAL rates a provider's service, not the client;
  - it says provider options are examples, not recommendations.
- The consultant-only material stays out of the client edition: the statement of work draft, consultant checks, claim IDs and the Commission tender results.

**What fails:**
- **Q4 (Fail).** The client edition never says where the tool is hosted, what client data was collected, or how it is protected. PLAN S6 item 1 requires a hosting statement, and the FinOps IQ report already has one.
- **Q7 (Fail).** The roadmap has an owner and a time frame per action, nothing more. There is no effort, no per-item dependency, no milestones, KPIs or risks. Wave numbering is broken, and in ARC5 a prerequisite finishes after the action that depends on it.

**What is partial:**
- **Q1.** There is no "How we calculated this" appendix and no assumption register (PLAN S6 item 3a), so a figure like "EUR 128m" cannot be rebuilt from the pages.
- **Q5, Q6, Q8 and Q10** each need one or two sentences, or a filter on what the engine already holds.

**Defects that matter before any client sees the report.** Some statutory maxima are wrong for their jurisdiction:
- ARC4 understates PDPA and Privacy Act exposure.
- NIS2 caps are shown as fixed maxima, but the Directive sets them as floors for Member States.
- The client edition offers sovereign options the client cannot use (Azure Government for EU-only data, AWS GovCloud for Singapore and Australian data).
- It also drops the "SecNumCloud qualification pending" caveat for Bleu, which only the consultant sees.

**Recommendation (advice):** do not approve S6 as it is. Approve it after the fixes in "Recommended changes" items 1 to 7, then re-run this test. Wording alone (items 1, 7, 8 and 9) lifts the score to about 7 of 10. Reaching 9 also needs the engine work on the roadmap (item 4) and on provider options (item 5).

## Results by question

| # | Question | Result | Where it is answered (archetype, page) |
|---|---|---|---|
| 1 | Where does this number come from (the EUR 128m cap, the 55 out of 100)? | **Partial** | Executive summary tile; regulations table; methodology (ARC1 p3, p8, p16; ARC5 p3, p8, p17) |
| 2 | Is this legal advice? Who has checked it? | **Pass** | Cover status line; "Not legal advice" callout; methodology (ARC1 p1, p3; ARC5 p1, p3) |
| 3 | Are you adding fines together? Are these what we would actually pay? | **Pass** (accuracy defects D3) | Tile "cap, not expected fine"; callout; methodology (ARC1 p3, p16; ARC5 p3, p17) |
| 4 | Your tool runs in India. What happened to our data? | **Fail** | Nowhere. Only "AI narrative: off" on the cover (all archetypes, p1) |
| 5 | Why does this kind of data need L3 and not L2? | **Partial** | Section 2 "Required sovereignty level", "Set by: Board choice"; methodology (ARC1 p4, p16; ARC4 p4) |
| 6 | Does the provider offering you name really meet that rung? | **Partial** | Section 7 option notes and caveats (ARC1 p11 to p14; ARC4 p11; ARC5 p13) |
| 7 | Can my team deliver this roadmap: owner, duration, dependencies, effort? | **Fail** | Section 8 roadmap (ARC1 p14 to p15; ARC5 p15 to p16; ARC4 p12) |
| 8 | What did you leave out, and what is not yet verified? | **Partial** | "35 other regulations were checked…"; application-level discovery caveat; "status as of" dates (ARC1 p9, p14; ARC5 p9) |
| 9 | Is SEAL rating us, or telling us a provider is SEAL-3? | **Pass** | Section 3 SEAL text and callouts (ARC1 p4 to p5; ARC5 p4 to p5) |
| 10 | Is "How LTM can help" just a sales pitch? | **Partial** | Section 9 (ARC1 p15 to p16; ARC5 p16 to p17; ARC4 p12 to p13) |

### Q1. Where does this number come from? Partial

**What answers it.**
- ARC1 p3 tile: "LARGEST STATUTORY CAP EUR 128m · General Data Protection Regulation Art. 83(5); cap, not expected fine".
- The p8 table repeats "EUR 128m (Art. 83(5))" and "EUR 96.0m (Art. 99(4))".
- Methodology (p16): "Statutory maximums come from the cited articles: computed from the worldwide turnover given, as a range from the turnover band otherwise, or not quantified without it. Currency conversions use the dated ECB reference rates in the claims register."
- The maturity figure is explained as "the weighted share of those controls in place" (p16).

**Why not Pass.**
- The pages never show the inputs or the arithmetic. A General Counsel has to know that Art. 83(5) is "EUR 20m or 4% of worldwide annual turnover, whichever is higher", then guess the turnover. The archetype input is EUR 3.2bn, and 4% × EUR 3.2bn = EUR 128m. The report states neither the turnover nor the rule.
- ARC5 shows caps in USD (for example "USD 80.0m (Art. 83(5))") with no rate or date.
- The control weights behind "55 out of 100", and the area scores ("Residency 81", "Keys and encryption 43"), have no visible derivation.
- PLAN S6 item 3a requires a "How we calculated this" appendix and an assumption register in the PDF. Neither exists in either edition of any archetype. A text search for "How we calculated" and "assumption" across all ten PDFs found nothing.

**Minimal change.** Add an appendix "How we calculated this" with:
- for each statutory maximum: the article rule in words, the turnover input as given, the arithmetic, which limb applied, and the ECB rate and its date where converted;
- for maturity: the control weights, the state values (in place 1, largely 0.67 and so on, whatever the engine uses) and the arithmetic for the headline and each area.

Then add an assumption register covering:
- the turnover band used when no amount is given;
- the rule that "Unknown" counts as not in place;
- the severity-to-time-frame rule;
- the level-to-controls mapping.

### Q2. Is this legal advice? Who has checked it? Pass

- Cover (all archetypes, p1): "Status: Internal consultant use until the legal review. Not legal advice."
- p3 callout: "Not legal advice. An indicative assessment from self-reported answers. Confirm applicability and obligations with counsel before acting."
- Findings are worded "Required by … (GDPR Art. 30)", which reports the regulation rather than concluding on the client's compliance.
- Applicability is graded "applies / likely – confirm / advisory", and ARC3 p4 asks for confirmation: "Confirm whether UK GDPR … applies".

### Q3. Are you adding fines together? Are these what we would pay? Pass, with accuracy defects

- ARC1 p3 tile: "cap, not expected fine". The callout says: "Statutory maximums are caps, not expected fines, and are never added together." Methodology p16 repeats: "Caps are never added together."
- The report shows only the largest cap in the headline, never a total.
- Regimes with no duty on the client say "No penalty on you" (CLOUD Act, FISA 702).
- Penalties set nationally say "Set by national law" (ARC1 DORA).

The question is answered. Several of the caps shown are wrong or mislabelled, though; see D3. A General Counsel who checks one of them will doubt the rest.

### Q4. Your tool runs in India. What happened to our data? Fail

- No client edition says where Sovereign IQ is hosted, what was collected (answers, organisation name, turnover, respondent and consultant emails), the transfer basis, retention, or who can see it.
- A search for "Mumbai", "ap-south", "retention" and "hosted" (outside ARC3's AI-API playbook text) finds nothing in any PDF.
- The only related statement is "AI narrative: off" on the cover.
- For a sovereignty report this is the first question a General Counsel will ask, and silence looks like avoidance.
- FRAMEWORK.md records the owner's decision that hosting stays in Mumbai, and that EU and UK client data is therefore transferred to India. PLAN S6 item 1 lists a "hosting statement" in the methodology. PLAN S9 records that AI inference, when on, runs in eu-west-1 (D28).

**Minimal change (methodology, new paragraph "How your data is handled"):** reuse the FinOps IQ wording (M4 Q9), adapted:

> "LTM hosts Sovereign IQ in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which has no EU adequacy decision or UK data bridge. We collect your answers, your organisation's name, the turnover you give and the consultant's email address to produce this report. [AI narrative: off. / When AI narrative is on, the engine result, with names and personal data removed, is processed by Claude in Amazon Bedrock in the EU (Ireland) region.] Transfer safeguards, retention and deletion: [S10 wording, pending counsel approval]."

Mark it "Draft wording pending owner and counsel approval (S10)" until the S10 gate, as FinOps did.

### Q5. Why does this kind of data need L3 and not L2? Partial

**What answers it.** ARC1 p4:
- "Each kind of data gets a required sovereignty level: the higher of what the law requires and what the board chose. The level decides which controls are needed."
- Every row says "Set by: Board choice".
- The control heatmap groups controls by the level that brings them in: "Residency (L1)", "Access and keys (L2)", "Operational (L3)" (p5 to p6).
- Findings say "The L3 level set for this data requires it."

**Why not Pass.**
- The report never states the legal minimum for each kind of data. So a General Counsel cannot see that the law would allow L0 or L1, and that L3 is purely the board's choice.
- It also never says what changes if the board picks a lower level. In ARC1, dropping financial data from L3 to L2 would remove in-zone operations, key revocation, out-of-band management, exit plan (level-driven part), concentration, assurance qualification and the "needs a sovereign offering" placement.
- That trade-off is the decision the report exists to inform (PLAN S1, decision buyer and edge).

**Minimal change.**
- Add a "Legal minimum" column to the section 2 table, for example "L0 (no localisation law found for this data in your markets)".
- Add one line under the table: "At L2 instead of L3 for Financial and payment data, these findings would not arise: …".
- The first is a field the engine already uses to take the higher of the two levels. The second is a re-run of the control set at the lower level.

### Q6. Does the provider offering you name really meet that rung? Partial

**What answers it.**
- The rung ladder is defined on every report (ARC1 p11).
- Options carry caveats:
  - "Microsoft Sovereign Public Cloud (Data Guardian, Production Touch Ledger): … Supervised access, so R2, not R3" (ARC1 p11);
  - "AWS Nitro System and zero-operator-access services: No per-request customer approval of operator access found; record the gap" (ARC5 p13);
  - "AWS Dedicated Local Zones (per engagement): Counts as R3 only when AWS confirms local personnel and a local entity in writing. No option at R3 listed for Singapore, Australia" (ARC4 p11).
- The closing note says "Provider options are examples, not recommendations … Confirm availability in your regions."

**Why not Pass.** The client edition contradicts or weakens its own rung tests:
- **Options the client cannot use.**
  - ARC1 (financial data limited to "EU or EEA") lists "Options: Bleu or Delos Cloud (National Partner Clouds); Sovereign Private Cloud (Azure Local); Azure Government" (p12, p13). Azure Government is a US-only cloud.
  - ARC4 (financial data limited to "Singapore, Australia") lists "Options: AWS European Sovereign Cloud; AWS GovCloud (US); AWS Dedicated Local Zones" (p11).
- **The caveat is stripped for the client.**
  - The consultant edition says "Microsoft National Partner Clouds: Bleu (France), Delos Cloud (Germany): Scope and status per partner to confirm; Bleu SecNumCloud qualification pending" (ARC1 consultant p12).
  - The client edition drops that note, because it rests on CLM-SOV-246 (graded S, a news site) and CLM-SOV-247 (UNSOURCED). It still lists "Bleu or Delos Cloud" as an R3 option.
  - The client therefore sees the option without the caveat that matters most.
- **Managed HSM alone listed for "keys held outside the provider".**
  - R2 is defined as "keys held outside the provider" (p11). The Azure action offers "Options: Azure Key Vault Managed HSM; External Key Management with Managed HSM" (ARC1 p11 to p12; ARC2 p10 to p11).
  - Managed HSM keys sit in Microsoft-operated HSMs. Only External Key Management keeps the key-encryption key outside Microsoft. Microsoft's own announcement describes wrap and unwrap through a customer-operated proxy (source 9).
  - EKM was a public preview. A Microsoft 365 Message Center entry (AZ574296, as mirrored by a third party) reports general availability on 16 Oct 2026. Under D24 that status needs re-checking at the primary source before EKM counts for R2.
- **No per-option source in the client edition.** Appendix A lists titles without URLs, so the client cannot check any option (D7).

**Minimal change.**
- Filter options by the class's allowed zone (engine).
- In the client edition, show a short status note for any option whose status claim is not V, for example "status to confirm with the provider". Do not drop the note.
- List Managed HSM under "keys you control in the provider's HSM (does not meet R2 on its own)".

### Q7. Can my team deliver this roadmap? Fail

**What is there.**
- Each action has a severity, owner role and time frame, grouped into waves (ARC1 p14 to p15).
- One sentence states the dependency rule: "a data map before transfers and location, key custody before key revocation, region enforcement before moving data".

**Why Fail.** PLAN S6 item 3a requires "roadmap with activities, owner role, duration, dependencies, effort, milestones, KPIs and risks". Against that:
- **Missing:** effort, per-item dependencies, milestones, KPIs, prerequisites and risks are absent in every archetype. The backlog has no effort column either (D12).
- **Wave numbering is broken:**
  - ARC1 and ARC2 start at "Wave 2: high-severity gaps" with no Wave 1;
  - ARC4 goes from "Wave 1" to "Wave 3".
  A delivery lead will ask where the missing wave went.
- **The schedule contradicts its own rule.** ARC5 p15, Wave 1:
  - "Keep a data-flow map … 6–12 months";
  - "Enforce allowed regions … 3–6 months";
  - "Move primary storage and processing … 0–3 months".
  The prerequisites finish after the action that depends on them.
- **Durations are not credible:**
  - "Move primary storage and processing of the class into its allowed region · Critical · 0–3 months" (ARC4 p12, ARC5 p15). In ARC4 the target is an R3 offering that the report itself says has "No option at R3 listed for Singapore, Australia" (p11).
  - ARC1: "Have services holding this data run and supported only by staff in the region" (in practice a migration to a partner cloud or sovereign private cloud) in "6–12 months" (p14). PLAN S8 scopes that migration at 6 to 18 months.
  - As in FinOps D4, severity shortens duration instead of changing the start order.
- **"Time frame" is undefined.** It is not clear whether it is a duration or a deadline from today.

**Change needed (engine).**
- Workstreams with activities, owner role, start and duration (duration driven by the work, not by severity), effort band, dependencies by name, a milestone and KPI per workstream, prerequisites and risks.
- Number the waves consecutively, or name them ("Decide and confirm", "High", "Medium", "Lower") without numbers.
- Schedule dependents after their predecessor's milestone.

### Q8. What did you leave out, and what is not yet verified? Partial

**What answers it.**
- "35 other regulations were checked and do not apply on your answers; your consultant holds the list." (ARC1 p9)
- "Application-level plans need technical discovery beyond this assessment." (p14)
- Volatile regulations show "(status as of 2026-10-14)".
- "Regulations that place no duty on you … are not rated" (p8).

**Why not Pass.**
- The list of regulations that do not apply is withheld from the client. Withholding it invites the question "why not?", and the list is not confidential.
- Items that are not verified are dropped silently, not labelled:
  - the Bleu and Delos caveat (Q6);
  - Microsoft 365 Customer Key and Google Workspace client-side encryption actions, graded P, which appear only in the consultant edition (ARC1 consultant p13).
- The one place a pending item shows, it is an internal working note: "Control mapping pending confirmation of the module texts" (ARC4 p9, HKMA).
- There is no "Scope and limitations" box covering:
  - self-reported answers, not tested;
  - no technical discovery;
  - counsel review pending (S10);
  - phase-in dates not yet in force, for example the AI Act and DPDP.
- PLAN S6 says the consultant checks include "items pending a source". No archetype's consultant edition has that list, even though CLM-SOV-247 is UNSOURCED in ARC1's consultant sources.

**Minimal change.**
- Add a "Scope and limitations" box to the methodology.
- Move "Regulations checked that do not apply" (name and one-line reason) into a client appendix.
- In place of anything withheld for lack of a verified source, add "N items are pending verification and are not shown".

### Q9. Is SEAL rating us, or telling us a provider is SEAL-3? Pass

ARC1 p4 to p5 (same in every archetype):
- "SEAL rates a provider's service, not your organisation."
- "This view uses an LTM mapping from the required level, not the Commission's, and is not a SEAL assessment or certification."
- Objective support is labelled "a count of your controls, not a SEAL rating".
- The closing callout reads: "It is not a SEAL assessment or certification of you or of any provider."
- The Commission's 17 Apr 2026 tender results appear only in the consultant edition (ARC1 consultant p5), as D20 requires.

Minor: ARC2 (UK only) and ARC4 (Singapore, Australia, Hong Kong, India; no EU footprint) also get the full "EU sovereignty levels" section, with no sentence saying why an EU procurement scale is relevant to them (D10).

### Q10. Is "How LTM can help" just a sales pitch? Partial

**What answers it.**
- No prices or durations appear in the client edition. Scope ranges are in the consultant SOW only (D7 decision).
- Generic practice names are used ("Delivered by: Cloud Transformation").
- Every finding is listed under at least one offering.
- The opening line reads "Providers are chosen from your requirements, with alternatives (see the sovereign cloud advisory)" (ARC1 p15).

**Why not Pass.**
- Nothing tells the reader that the work can be done by their own teams or another firm, or that the findings and roadmap stand without LTM.
- Boilerplate outline items do not fit the client:
  - "Confirm with your counsel the regulations marked 'likely – confirm'" appears where none are marked (ARC1, ARC2, ARC5: "0 to confirm");
  - "Agree the board's sovereignty level for each kind of data" appears where every level is already "Board choice";
  - "exit plans for critical providers" appears for ARC5, which has no exit finding.
- The same finding is offered under two or three offerings:
  - ARC1 key custody and provider access approval sit under both "Sovereign landing zone" and "Migration to a sovereign platform";
  - ARC5's "Move primary storage" sits under both "Sovereign landing zone" and "Data residency remediation";
  - ARC4's sits under "Data residency remediation" and "Migration".
  That reads as selling more than one thing for one gap.

**Minimal change.**
- Add one opening sentence: "Each item below can be delivered by your own teams or another firm; the findings and roadmap do not depend on it. Where LTM could help, this is the kind of work and how it would be done."
- Filter outline items by the client's result.
- Map each finding to one primary offering, with a second only when it is an explicit decision ("either harden in place, or migrate").

## Defects found on the pages

Ranked by how much a CIO or General Counsel would hold them against the report.

| # | Severity | Defect (archetype, page) | Recommended change |
|---|---|---|---|
| D1 | High | **No hosting or data-handling statement** in any client edition (Q4). | Q4 paragraph in the methodology, marked draft until S10 counsel approval. *Wording only.* |
| D2 | High | **No "How we calculated this" appendix and no assumption register** in either edition (PLAN S6 item 3a; scorecard area 13a and 13b). Turnover input, cap rule and limb, FX rate and date, control weights and area-score arithmetic are all invisible (Q1). | New appendix and register built from the engine result. *Engine and report work* (the values exist in the engine; the renderer needs the section, and the trace test should cover it). |
| D3 | High | **Statutory maxima wrong or mislabelled.**<br>(a) **ARC4 p8:** PDPA "SGD 1.00m (s.48J(1))". Under s.48J(1) the maximum is 10% of annual turnover in Singapore where that exceeds SGD 10m, otherwise SGD 1m (source 4). The group's turnover input is SGD 4bn, so SGD 1m understates it by orders of magnitude. Privacy Act "AUD 50.0m (s.13G)": the body-corporate maximum is the greatest of AUD 50m, three times the benefit, or 30% of adjusted turnover in the breach turnover period (source 5). The headline "LARGEST STATUTORY CAP AUD 50.0m" (p3) is therefore wrong.<br>(b) **NIS2 (ARC3 p8 "EUR 10.0m (Art. 34(4))"; ARC5 p8 "USD 40.0m (Art. 34(4))"):** Art. 34(4) and (5) oblige Member States to set a maximum *of at least* EUR 10m or 2% (essential) and EUR 7m or 1.4% (important). National law sets the actual maximum. ARC5's "Why" says "essential or important" while the client self-classified as important. A large Annex I managed service provider is essential under Art. 3(1)(a), but the report does not say so. ARC3's size is undetermined (turnover above EUR 50m, balance sheet unknown), yet the essential figure is used.<br>(c) **AI Act Art. 99(6):** for SMEs, each fine is capped at the *lower* of the percentage and the amount (source 6). ARC3 (50 to 249 staff) may be an SME, and "EUR 15.0m (Art. 99(4))" is shown without that caveat.<br>(d) **ARC3 p3 headline** picks UK GDPR "GBP 17.5m … (likely – confirm)" over GDPR "EUR 20.0m" (applies, red), because GBP 17.5m converts slightly higher. A regime still to be confirmed should not be the headline over one that applies.<br>(e) **ARC5 p9 DORA "Set by national law"** for an ICT third-party provider. DORA's national penalties (Art. 50) bind financial entities. A provider faces Lead Overseer periodic penalty payments only if designated critical (Art. 35). *To verify against EUR-Lex; see Sources note.* | (a) Use the local-turnover limb, or show "up to 10% of Singapore turnover (turnover not given)" and "greatest of AUD 50m, 3× benefit or 30% of adjusted turnover".<br>(b) "At least EUR 10m or 2% (essential); national law sets the maximum", and state the classification rule applied.<br>(c) Add the SME rule and show a range when SME status is unknown.<br>(d) Prefer "applies" regimes for the headline, or show the next one.<br>(e) "No direct penalty unless designated critical; contractual duties flow down (Art. 30)". *Engine (registry rules and cap logic).* |
| D4 | High | **Roadmap not delivery-grade, and its timing contradicts itself** (Q7): no effort, per-item dependencies, milestones, KPIs or risks; waves start at 2 (ARC1 p14, ARC2 p12) or skip 2 (ARC4 p12); ARC5 Wave 1 prerequisites end after their dependent (p15); "Move primary storage … 0–3 months" (ARC4, ARC5); migration-scale work in "6–12 months" (ARC1). | Delivery-grade workstreams as in Q7. Duration set by the type of work, start set by severity. *Engine.* |
| D5 | High | **Client edition shows sovereign options the client cannot use, and drops caveats** (Q6): Azure Government for EU-only data (ARC1 p12 to p13); AWS European Sovereign Cloud and GovCloud for SG/AU data (ARC4 p11); Bleu and Delos without "status to confirm; SecNumCloud qualification pending" (client vs consultant ARC1 p12); Managed HSM alone listed as meeting "keys held outside the provider". | Filter options by allowed zone. Show a status note instead of dropping it. Separate Managed HSM from EKM. Re-check EKM GA at the primary source (D24). *Engine filter plus content.* |
| D6 | High | **Contradiction on encryption.** ARC1 heatmap p6, control table p7 and SEAL p5: "Encryption baseline: Largely in place". Finding p10 and backlog: "Encryption baseline is partly in place". ARC5 is the same (p7 vs p11). | The finding sentence must use the control's actual state word. *Small engine wording fix.* |
| D7 | Medium | **Sources appendix cannot be traced:**<br>(a) no URLs, no article, no link from a statement to its source;<br>(b) duplicate rows ("GDPR" four times, "DORA" six times in ARC1 p17);<br>(c) secondary or news sources where primary exist: "NPR: FISA 702 has lapsed", "Commission renews UK adequacy decisions (eucrim report)", "IAPP US State Privacy Legislation Tracker" (ARC5 p18 to p19). In the consultant edition, NPR is graded V;<br>(d) internal LTM documents listed as client sources: "Sovereign IQ S7 sources pack: placement ladder rule (Task B)…", "Sovereign IQ plan, S8" (every archetype);<br>(e) the consultant edition links a personal GitHub repository (`github.com/dixitashutosh007/ltm-accelerators/…`) for CLM-SOV-270 and 271. | Show title, article or section, and URL. Merge duplicate rows and list the articles cited. Replace news with primary or CRS sources and re-grade. Show internal documents as "LTM method note, version, date (available on request)" with no URL. *Wording, plus a small renderer change.* |
| D8 | Medium | **ARC1 backlog: Regulations column empty for key custody and provider access approval** (and 7 other rows). See the answer below the table. | *Registry content and wording.* |
| D9 | Medium | **"Sovereign-ready" next to red or critical results.** ARC2 p3: "84 / 100 Sovereign-ready" with UK GDPR rated red and backups of sensitive data outside the allowed zone. ARC4 p3: "85 / 100 Sovereign-ready" with a Critical data-location finding and a placement that "needs a sovereign offering" with none in the zone. The label reads as hype. | Do not award the top band while any finding is critical or any regulation is red. Or rename the band ("controls largely meet the level") and add "except: …". *Engine rule or wording.* |
| D10 | Medium | **Boilerplate not tailored to the client:**<br>- "including dependence on UK designated critical third parties" in an EU bank (ARC1 p10) and a SG/AU group (ARC4 p12);<br>- "Data Act switching rights" for a UK-only insurer (ARC2 p11) and ARC4;<br>- "The APAC data zone spans several countries" for EU and UK clients (ARC1 p12, ARC2 p11);<br>- the Q10 outline items;<br>- the EU SEAL section with no relevance sentence for ARC2 and ARC4. | Filter phrases by markets in scope. Add a SEAL relevance line, or hide the section when there is no EU footprint, EU customer or EU tender. *Engine filters and wording.* |
| D11 | Medium | **Engine terms and internal notes in the client edition:**<br>- "of the class" (ARC5 p3, ARC4 p3);<br>- inconsistent class names ("special data" ARC2 p3 vs "Sensitive personal" p4; "financial data" vs "Financial and payment");<br>- backlog Type values "control_gap" and "scope_confirmation";<br>- service-family slugs "identity keys", "ai ml", "collaboration saas";<br>- internal note "Control mapping pending confirmation of the module texts" (ARC4 p9). | Use display names everywhere. Map the enums to "Control gap" and "Confirm scope". Replace the HKMA note with a client caveat. *Wording.* |
| D12 | Medium | **Backlog lacks PLAN S6 item 2 columns:** no effort and no source column. Verification is empty on 9 of 17 ARC1 rows (data map, TIA, ICT register, key revocation and others), and on 9 of 17 in ARC5. | Add effort and source. Give every row a verification step (the catalogue has one per control). *Engine.* |
| D13 | Medium | **AI Act phase-in not shown.** "AI Act · Applies" with a 6 to 12 month action citing "Art. 16, 26 … Art. 50 … Art. 53-55" (ARC1 p10, ARC5 p11). The report lists Regulation (EU) 2026/1744 (the Digital Omnibus on AI) as a source. Secondary commentary says it defers high-risk obligations to 2 Dec 2027 and 2 Aug 2028 (source 8, secondary; to verify on EUR-Lex). Nothing on the page says which duties apply now and which later (PRACTICE_LEAD_METHOD rule 6). The same applies to DPDP ("most duties apply from 13 May 2027" is shown; good). | One line per phased regime: "In force now: …; from {date}: …". *Registry wording.* |
| D14 | Low | **ARC5 SEC rule assumes a domestic filer:** "Form 8-K Item 1.05", "within four business days" (p8, p10). An India-headquartered registrant is often a foreign private issuer, which reports on Form 6-K and Form 20-F Item 16K instead (source 7). | Add the foreign-private-issuer branch, or "confirm your filer status". *Registry.* |
| D15 | Low | **FISA 702 status** rests on NPR in the client sources and omits the date that matters to the client: the current certification runs to about 17 Mar 2027 (source 10, advocacy secondary; to verify against an official or CRS source). | Cite CRS or ODNI, and add "existing certifications run to {date}". *Registry.* |
| D16 | Low | **Layout and number format:**<br>- ARC4 p14 is a blank page (rendered and checked);<br>- the ARC4 "9. How LTM can help" heading is stranded at the foot of p12;<br>- precision varies ("EUR 128m" vs "EUR 96.0m", "USD 80.0m");<br>- ARC5 and ARC4 say "8 apply" (9 in ARC4) but the exposure tile adds up to one fewer, because DPDP is "applies · not rated", and this is not reconciled on p3. | Fix the page-break logic. Use one precision rule. Add "(1 applies from a later date and is not yet rated)". *Renderer and wording.* |
| D17 | Low | **Consultant edition only:**<br>- "Data is processed in us without an entity there … in v1 (Q11)" (raw country code and design reference);<br>- "UNSOURC ED" split across lines;<br>- no "items pending a source" list despite an UNSOURCED claim (CLM-SOV-247). | Display names; drop "(Q11)"; add the pending list PLAN S6 promises. *Small engine wording fix.* |

**Checked and correct:** the statement of work draft (Appendix B) and consultant checks (Appendix C) appear only in the consultant editions, 2 hits each and 0 in every client edition. Claim IDs, finding IDs and rule codes do not appear in any client PDF; they do appear in the client backlog (D11). The Commission tender results are consultant-only.

### The ARC1 backlog question: empty Regulations column for key custody and admin access

**Expected under the current model, but misleading for a DORA bank.**
- Both rows are driven by the L3 level the board set for financial data ("The L3 level set for this data requires it").
- No EU regulation requires a financial entity to hold keys outside its cloud provider, or to approve each provider access request. So leaving DORA out of "Required by" is legally right.
- However, DORA does regulate both subjects:
  - Art. 9(4)(d) requires "protection measures of cryptographic keys";
  - Commission Delegated Regulation (EU) 2024/1774 Art. 7 requires a cryptographic key management policy covering the whole key lifecycle, with controls against unauthorised access, disclosure and modification;
  - Art. 21 of the same Delegated Regulation covers access control (sources 1 and 2).
- A DORA bank's General Counsel who sees an empty column will read it as "DORA is silent on key management and privileged access", which is wrong.

**Recommendation:**
- Add a second attribution, "Related obligations (do not require this specific control)", for these controls: DORA Art. 9(4)(d) and RTS 2024/1774 Art. 6 to 7 for key custody and revocation; RTS Art. 21 for provider access approval.
- Make the backlog say "Board-set level L3; no regulation requires this control" instead of leaving the column blank.
- **Worth checking (UNSOURCED, my recollection):** whether the DORA register-of-information templates (Implementing Regulation (EU) 2024/2956, Annex I) include data-location fields. If they do, the ARC1 "Provider location visibility" row, also blank, should cite DORA Art. 28(3). Settle it by reading Annex I of 2024/2956 on EUR-Lex.

## Recommended changes, ranked

| # | Change | Fixes | Kind |
|---|---|---|---|
| 1 | Hosting and data-handling paragraph in the methodology, marked draft until S10 | Q4, D1 | **Wording only** |
| 2 | "How we calculated this" appendix and assumption register | Q1, D2 | **Engine and report work** |
| 3 | Correct the statutory-maximum rules: PDPA and Privacy Act turnover limbs, NIS2 "at least" wording and classification, AI Act SME rule, headline choice, DORA for ICT providers | D3 | **Engine (registry and cap logic)** |
| 4 | Delivery-grade roadmap: workstreams, effort, dependencies, milestones, KPIs, risks; consecutive waves; credible durations | Q7, D4 | **Engine** |
| 5 | Filter provider options by allowed zone; keep status notes in the client edition; separate Managed HSM from EKM | Q6, D5 | **Engine filter plus content** |
| 6 | Use the control's real state in finding text | D6 | **Engine (small)** |
| 7 | "Legal minimum" column and "what changes at a lower level" line in section 2 | Q5 | **Engine (light): fields exist** |
| 8 | "Scope and limitations" box; client appendix of regulations that do not apply; "N items pending verification" | Q8, D17 | **Mostly wording**; the appendix is a renderer change |
| 9 | Independence sentence in How LTM can help; filter outline items; one primary offering per finding | Q10, D10 | **Wording**, plus a small engine filter |
| 10 | Traceable sources: URLs, articles, deduplication, primary sources, no internal or personal links | D7 | **Wording and renderer** |
| 11 | Related-obligation attribution for level-driven controls | D8 | **Registry content** |
| 12 | Band label rule ("sovereign-ready") | D9 | **Engine rule or wording** |
| 13 | Display names, backlog enums, effort and source columns, verification on every row | D11, D12 | **Wording and engine** |
| 14 | Phase-in lines (AI Act), SEC foreign-private-issuer branch, FISA certification date | D13 to D15 | **Registry wording** |
| 15 | Blank page, heading placement, number precision, applies-but-not-rated reconciliation | D16 | **Renderer and wording** |

**Expected effect on the score (advice):**
- Items 1, 7, 8 and 9 (wording and light engine work) move Q4, Q5, Q8 and Q10 to Pass: about 7 of 10.
- Item 2 moves Q1 to Pass: 8 of 10.
- Item 4 or item 5 is then needed to reach the gate; both give 10 of 10.
- Item 3 does not change a question's grade, but I would not let any client see ARC4-type output before it is fixed: an understated PDPA cap is exactly the error a Singapore General Counsel checks first.

**Recommendation for the owner (advice):** approve Gate S6 **after** items 1 to 7, with a re-test on the five archetypes. Items 8 to 10 should land before S10 counsel review. Items 11 to 15 can follow.

## Sources

Checked 26 Oct 2026. EUR-Lex pages returned an automated-access challenge from this environment (curl HTTP 202 with an empty body; fetch tool returned no content), so EU texts below were read from the Commission's AI Act Service Desk or from reproductions of the Official Journal text. Each is marked; confirm against EUR-Lex before these statements go into the registry.

1. Regulation (EU) 2022/2554 (DORA), Art. 9(4)(d), https://eur-lex.europa.eu/eli/reg/2022/2554/oj (EUR-Lex not reachable). Wording "protection measures of cryptographic keys" read from reproductions found through search, e.g. https://myctrl.tools/frameworks/eu-dora/article-9-4-d. **Status: S, to confirm on EUR-Lex.** Art. 35 and Art. 50 (D3e) are cited from my knowledge of the text and are **UNSOURCED in this note** until read on EUR-Lex.
2. Commission Delegated Regulation (EU) 2024/1774, Art. 6 to 7 (cryptographic key management) and Art. 21 (access control, title only), https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj (EUR-Lex not reachable). Art. 7 text read from https://www.springlex.eu/en/packages/dora/rts-rmf-regulation/article-7/ (reproduction of OJ L 2024/1774). **Status: S.**
3. HM Treasury designation of critical third parties (Amazon Web Services EMEA SARL, Google Cloud EMEA Ltd, Microsoft Ireland Operations Ltd, Oracle Corporation UK Ltd; effective 13 Jul 2026), as reported at https://www.techmarketview.com/news/archive/2026/07/15/ukhotviewsextra-treasury-activates-fsma-power-to-bring-hyperscalers-under-regulatory-oversight and https://www.mondaq.com/uk/financial-services/1818026/uk-designates-first-technology-providers-under-the-critical-third-parties-regime. Consistent with ARC2 p8. **Status: S**; the registry should cite the HM Treasury designation order.
4. Singapore Personal Data Protection Act 2012, s.48J(1) (10% of annual turnover in Singapore where it exceeds SGD 10m, otherwise SGD 1m; from 1 Oct 2022), read at https://lawplayer.com/sg/act/PDPA2012/48J and https://cms.law/en/sgp/legal-updates/organizations-face-risk-of-higher-financial-penalties-for-breaches-of-the-pdpa-from-1-october-2022. **Status: S**; primary is Singapore Statutes Online, https://sso.agc.gov.sg/Act/PDPA2012.
5. Privacy Act 1988 (Cth) s.13G (body corporate: greatest of AUD 50m, three times the benefit, or 30% of adjusted turnover in the breach turnover period), as described by the OAIC, https://www.oaic.gov.au/news/media-centre/australian-clinical-labs-ordered-to-pay-penalties-in-relation-to-medlab-pathology-data-breach-in-first-for-privacy-act. **Status: V (regulator).**
6. Regulation (EU) 2024/1689 (AI Act), Art. 99(6), European Commission AI Act Service Desk, https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-99 ("whichever thereof is lower" for SMEs, including start-ups). **Status: V.**
7. SEC cybersecurity disclosure rules for foreign private issuers (Form 6-K; Form 20-F Item 16K), as summarised at https://www.hsfkramer.com/notes/cybersecurity/2023-08/the-secs-new-cybersecurity-disclosure-rules-new-requirements-for-foreign-private-issuers. **Status: S**; primary is SEC Release 33-11216, already in the claims register.
8. Regulation (EU) 2026/1744 (Digital Omnibus on AI; dated 8 Jul 2026), EUR-Lex record https://eur-lex.europa.eu/eli/reg/2026/1744/oj (not reachable); content summary at https://www.nicfab.eu/en/posts/ai-act-2-august-2026/. **Status: S; dates to confirm on EUR-Lex.**
9. Microsoft, "External key management for Azure Managed HSM is now in public preview", https://azure.microsoft.com/en-us/blog/external-key-management-for-azure-managed-hsm-is-now-in-public-preview/ (key-encryption key held outside Microsoft through a customer-operated proxy); general availability reported in Message Center AZ574296 as mirrored at https://mc.merill.net/message/AZ574296 (16 Oct 2026). **Status: V for the mechanism, S for the GA date.**
10. FISA Section 702: lapse on 12 Jun 2026 and certification valid to 17 Mar 2027, Brennan Center one-pager (22 Sep 2026), https://www.brennancenter.org/media/16217/download/bcj-702-march-2027-deadline-one-pager-9.22.26.pdf. **Status: S (advocacy source)**; consistent with ARC1 p9; the registry should cite CRS or ODNI.
11. Internal, read 26 Oct 2026: PLAN.md S6 to S8, S11 and decisions D7, D11, D16, D20, D24 to D28; FRAMEWORK.md (scorecard area 13, hosting decision); PRACTICE_LEAD_METHOD.md; `finops-iq/design/M4-cio-challenge.md` (format and the FinOps hosting wording); `design/archetypes.json` (turnover and classification inputs quoted in D3).
12. Evidence: the ten PDFs and five backlogs in the session scratchpad `s6-pdfs/`, rendered from commit ce24acd; text extractions in `s6-text/` and page images in `png/` (same scratchpad).

No other external facts are asserted in this note. Regulatory statements quoted from the report that I did not re-verify are reported as the report states them.
