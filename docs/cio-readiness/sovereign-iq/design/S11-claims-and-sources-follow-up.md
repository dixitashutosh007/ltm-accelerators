# Sovereign IQ: S11 claims follow-up (review dates, D7(c), D8)

**Date:** 6 Nov 2026  **Author:** sovereignty-compliance-lead (advises; the product owner approves; counsel reviews before external use)
**Scope:** text and register changes only. No constant, golden file or release label was changed.

## 1. Outcome per claim

| Claim | Outcome | URL read | Date read | What changed |
|---|---|---|---|---|
| CLM-SOV-161 DPDP Rules 2025 | **Renewed, no change to the dates.** nextReview 20 Nov 2026 (was 16 Nov) | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf (PIB, read in full); MeitY pages return only a script shell | 6 Nov 2026 | PIB says notified 14 Nov 2025 with "an eighteen-month period for phased compliance". Gazette text not opened. No notified shortening found (reports of talks only). Rule 4 (consent managers) falls 13 or 14 Nov 2026, after today, so it stays "future". Review set to 20 Nov to move it to in force |
| CLM-SOV-096 UK Cyber Security and Resilience Bill | **Changed.** Statement and regime dates corrected; nextReview 20 Nov | https://bills-api.parliament.uk/api/v1/Bills/4035 and /Stages and /NewsArticles (the data behind bills.parliament.uk, which returns 403 to scripts) | 6 Nov 2026 | Report stage is no longer "scheduled": Lords report stage 26 Oct, **third reading 2 Nov**, Commons carry-over motion 4 Nov (Bill now lapses 29 Apr 2027, not 11 Nov 2026). **Current stage: back in the Commons for consideration of Lords amendments, no sitting set; not an Act** (isAct false, record updated 5 Nov 2026) |
| CLM-SOV-097 same Bill, scope and penalty | **Narrowed.** Still accurate "as introduced"; now says the Lords amended it. nextReview 20 Nov | Bills API publications list (Bill 175 and notes, 3 Nov); the files are behind a bot challenge | 6 Nov 2026 | Amended text not read, so scope and the GBP 17m / 4% penalty may differ. A secondary report says the Government lost two Lords votes on scope (unconfirmed) |
| CLM-SOV-050 AI Act dates | **Still accurate; already renewed today (6 Nov), left at 4 Dec** | https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai (last update 19 Oct 2026). EUR-Lex returned an empty page for Regulation 2026/1744 in this session | 6 Nov 2026 | No change. Commission page agrees on 2 Aug 2026, 2 Dec 2027, 2 Aug 2028 and the December 2026 prohibitions; it does not mention the Art. 50(2) 2 Dec 2026 grace period, so that detail rests on the full EUR-Lex read recorded earlier today |
| CLM-SOV-053 AI Act new prohibitions | **Still accurate; as above** | same | 6 Nov 2026 | No change ("December 2026" confirmed by the Commission page; 2 Dec from the EUR-Lex read) |
| CLM-SOV-103 FISA 702 lapse | **Corrected and upgraded S to V; D7(c) closed.** nextReview 4 Dec | https://www.govinfo.gov/content/pkg/PLAW-119publ87/html/PLAW-119publ87.htm; CRS LSB11444 (https://www.congress.gov/crs-product/LSB11444, read through the everycrsreport.com mirror because congress.gov returns 403); api.congress.gov law list for the 119th Congress | 6 Nov 2026 | The register's "lapsed in June 2026" is **confirmed and now dated: repealed 12 Jun 2026** under FISA Amendments Act s.403(b) as amended by PL 119-87 (30 Apr 2026). Last law on 702 is PL 119-87; the law list runs to PL 119-138 (3 Nov 2026) with nothing later. Orders in force continue until they expire (CRS). **NPR removed**; source is now the statute |
| CLM-SOV-104 FISA 702 status | **Corrected, stays S.** nextReview 4 Dec | CRS LSB11444 (above); Brennan Center page (updated 27 Oct 2026); Roll Call 29 Apr 2026 | 6 Nov 2026 | Date set to 6 Nov. Removed "the intelligence community asked Congress to act by late November" (unconfirmed; a 22 Sep Brennan one-pager says November action is not needed). Added House vote 29 Apr (235-191, press) and failed Senate vote 5 Jun (reported). **Not found:** the House-passed bill's number and its last action date (api.congress.gov rate-limited; H.R. 8035 is only an introduced bill). The last congressional action I can cite is the 5 Jun vote, from a secondary source |
| CLM-SOV-274 (new) DORA Art. 9(4)(c)-(d) | **D8 closed, V** | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554 | 6 Nov 2026 | Quoted text read in full |
| CLM-SOV-275 (new) RTS 2024/1774 Art. 6, 7, 21 | **D8 closed, V** | https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj/eng | 6 Nov 2026 | Art. 6 encryption policy; Art. 7 key lifecycle; Art. 21 access control (six-monthly review for critical or important functions) |

## 2. What a CIO would notice

- UK Bill: "Lords report stage scheduled" becomes "passed the Lords on 2 Nov, awaiting Commons; not law", with a warning that the Lords changed scope.
- FISA 702: the dated repeal (12 Jun 2026), "certifications to about March 2027", and no NPR link.
- A DORA bank now sees a "related obligations" line (DORA Art. 9(4)(c)-(d); RTS Arts. 6, 7, 21) stating these do not require customer-held keys or per-access approval.

## 3. Where the text was changed

- `packages/engine-core/src/claims/claims-register.json`: claims 096, 097, 103, 104, 161 edited; 274 and 275 added (the register had 273 Sovereign IQ claims, now 275); `updated` 2026-11-06.
- `packages/engine-core/src/accelerators/sovereign-iq/registry/regimes.json`: `UK_CSR_BILL` (status date, dates list, reason, penalty note), `US_FISA_702` (status date, date label, reason, penalty and verification checked dates, applicability grade V to S noted), `IN_DPDP` (statusAsOf), `EU_DORA` (new obligation `EU_DORA.ICT_SECURITY_RELATED` with no control link, so no score or finding moves; claims 274, 275 added).
- Not changed: engine code, controls, goldens, release labels, `Accelerators/assets/sovereign-iq/questions.json`. No generated file changed.
- Tests: `node scripts/check-claims.cjs` and `npm run check:repo` pass; sovereign vitest files 7 of 7 files, 371 tests pass; `tests/e2e/sovereign-iq-v4.spec.ts` 9 of 9 pass. No test edited.

## 4. Still open

1. **Display of D8.** The registry now holds the related obligations, but the backlog Regulations column for key custody and provider access approval is still driven by controls, so it stays blank. Showing "Related obligations (do not require this specific control)" needs a small engine and renderer change (outside this task's scope).
2. UK Bill: read Bill 175 (amended text) for scope and penalty; check legislation.gov.uk for an Act.
3. FISA 702: the House-passed bill's number and last action, and the certification date from an official source (D15).
4. DPDP: open the Gazette G.S.R. text; move Rule 4 to in force after 13 or 14 Nov.
5. AI Act 050 and 053: re-read the EUR-Lex text of Regulation 2026/1744 when the page loads again.
6. Counsel review of all of the above before external use.

## 5. Proposed enduring rule (described, not built)

**Weekly "claims due soon" check.** A scheduled GitHub Actions workflow (Mondays) runs a small mode of `scripts/check-claims.cjs`, for example `node scripts/check-claims.cjs --due-within 30`, reusing the same date logic that fails CI. It lists every claim whose `nextReview` is within 30 days (volatile ones within 45), grouped by accelerator and owner, with id, jurisdiction and source URL. It opens or updates one tracking issue (and optionally messages the product owner), and exits non-zero only for claims already overdue, so CI itself is unchanged. Two supporting rules:
1. A review that cannot reach a primary source is renewed for at most 14 days or downgraded the same week, never left to expire.
2. Volatile claims whose event date sits inside the window (for example Rule 4 on 13 Nov, report stage, a sunset) get a `nextReview` set just after the event date, as done here.

## 6. Sources used (all read 6 Nov 2026)

- UK Parliament Bills API for Bill 4035: https://bills-api.parliament.uk/api/v1/Bills/4035 (also /Stages, /NewsArticles, /Publications)
- PIB, DPDP Rules 2025 explainer, 17 Nov 2025: https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf
- Public Law 119-87: https://www.govinfo.gov/content/pkg/PLAW-119publ87/html/PLAW-119publ87.htm
- Congress.gov API, laws of the 119th Congress: https://api.congress.gov/v3/law/119
- CRS LSB11444, 22 Jun 2026: https://www.congress.gov/crs-product/LSB11444 (mirror: https://www.everycrsreport.com/reports/LSB11444.html)
- Brennan Center Section 702 page (secondary, updated 27 Oct 2026): https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page
- DORA text: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554; RTS: https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj/eng
- Commission AI Act page: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
