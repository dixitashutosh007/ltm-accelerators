# Sovereign IQ S10: second review (independent re-check before counsel)

Prepared 27 Oct 2026 by Claude (AI) at the owner's request, after the first S10 review ([S10-data-protection.md](S10-data-protection.md), 26 Oct 2026). Registry 1.1.0, engine 4.6.0.

**What this is.** A second, independent pass over the statements the first review ranked as most needing sign-off (its section 6.2), re-checked against current sources, plus a check that the fixes the first review asked for are in the code. **What it is not.** It is not a qualified lawyer's review and does not meet gate S10, which needs written sign-off from counsel in each market (PLAN D9). It reduces what counsel has to check; it does not replace them. The briefs for counsel are in [S10-counsel-briefs.md](S10-counsel-briefs.md).

Source status as in the registry: V (primary text read), S (secondary source quoting or linking the primary), P (primary cited, not re-read), UNSOURCED. As in the first review, direct fetches of most official sites fail from this environment, so most checks below are S.

## Result in one paragraph

Of the 21 time-sensitive or high-reliance statements re-checked, 19 are confirmed as stated, one was wrong and is corrected in this change (E1, the CCPA statutory damages ceiling), and one is a figure counsel should choose (the DOJ Data Security Program penalty, N1). Three earlier findings are now closed in the code (W1 to W3 and W13 wording; A5 retention test). Two new points go to counsel (N2 Singapore penalty commencement, N3 UK CTP enforcement powers), and one first-review item is only half done (C20, the turnover question). Nothing found changes the internal-use approval of 26 Oct 2026.

## 1. Corrected in this change

| # | Statement | Was | Now | Source |
|---|---|---|---|---|
| E1 | CCPA § 1798.150(a) statutory damages per consumer per incident (registry `US_CCPA` penalty tier; CLM-SOV-112) | USD 100 to 750 (the statute's text) | USD 107 to 799, as CPI-adjusted by the CPPA from 1 Jan 2025; next adjustment January 2027 | [CPPA: updated monetary thresholds](https://www.cppa.ca.gov/regulations/cpi_adjustment.html) (S) |

The change moves the per-consumer figure shown in the exposure view from USD 750 to USD 799. No golden output changed (906 engine tests pass).

## 2. Confirmed as stated

| # | Statement (registry) | Re-check, 27 Oct 2026 | Status |
|---|---|---|---|
| 1 | FISA 702 lapsed at the June 2026 sunset; collection continues under certifications to March 2027 (`US_FISA_702.1`) | Lapsed mid-June 2026 after a failed House vote; FISC certifications of 17 Mar 2026 run to March 2027; no reauthorisation found in coverage to mid-September 2026. Still volatile: re-check on the day before quoting ([CRS R48592](https://www.congress.gov/crs-product/R48592); [The Hill](https://thehill.com/national-security/6096900-fisa-section-702-congress-fisc-national-intelligence/); [Wiley](https://www.wileyconnect.com/congress-again-approaches-deadline-for-extending-fisa-702-authorities-creating-uncertainty-for-communications-providers)) | S (was UNSOURCED for today's status) |
| 2 | AI Act dates under Regulation (EU) 2026/1744: Annex III high-risk 2 Dec 2027; Annex I 2 Aug 2028; Art. 50 from 2 Aug 2026 with marking for existing generative systems by 2 Dec 2026 (`EU_AI_ACT`) | Confirmed by several sources; publication in the OJ reported as July 2026 ([Orrick](https://www.orrick.com/en/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes); [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/)) | S |
| 3 | DPF valid; appeal C-703/25 P pending (`EU_GDPR.TRANSFERS`) | Pending; Microsoft admitted as intervener in support of the Commission on 4 Jun 2026; no hearing or judgment found ([DataGuidance](https://www.dataguidance.com/news/eu-cjeu-admits-microsoft-intervener-appeal-concerning)) | S |
| 4 | UK CTP designations: AWS EMEA SARL, Google Cloud EMEA Ltd, Microsoft Ireland Operations Ltd, Oracle Corporation UK Ltd, effective 13 Jul 2026 (`UK_CTP.2`) | Confirmed, the four legal entities and the date ([GOV.UK](https://www.gov.uk/government/news/uk-financial-system-strengthened-with-new-safeguards-for-major-technology-providers)) | S |
| 5 | DUAA data protection changes, including transfers, commenced 5 Feb 2026 (`UK_GDPR`) | Commencement No. 6 Regulations, SI 2026/82 ([legislation.gov.uk](https://legislation.gov.uk/uksi/2026/82); [Burges Salmon](https://www.burges-salmon.com/articles/102mh1d/the-data-use-and-access-act-2025-key-implications-for-businesses-as-the-new-in/)) | S |
| 6 | EU adequacy for the UK runs to 27 Dec 2031 (`UK_GDPR.TRANSFERS`) | Renewed 19 Dec 2025 to 27 Dec 2031 ([Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-renews-uk-data-adequacy-decisions); [eucrim](https://eucrim.eu/news/commission-renewed-adequacy-decisions-for-data-transfers-to-the-uk/)) | S |
| 7 | Commission referred IE, ES, FR and NL to the Court over NIS2 transposition on 8 Jul 2026 (`EU_NIS2` dates) | Confirmed (one source says 9 Jul) ([Law Society Gazette](https://www.lawsociety.ie/gazette/top-stories/2026/july/ireland-referred-to-cjeu-over-cyber-bill/)) | S |
| 8 | UK Cyber Security and Resilience Bill: not law; Lords report stage 26 Oct 2026 (`UK_CSR_BILL`) | Report stage began 26 Oct 2026; outcome not yet reported ([UK Parliament](https://www.parliament.uk/business/news/2026/october-2026/cyber-security-and-resilience-network-and-information-systems-bill-undergoes-further-scrutiny-in-the-lords/)) | S |
| 9 | DPDP: Rules notified 13 Nov 2025; consent managers 13 Nov 2026; main duties 13 May 2027 (`IN_DPDP`) | Confirmed by several law-firm summaries; the Gazette text was not opened ([SS Rana](https://ssrana.in/articles/meity-notifies-final-digital-personal-data-protection-rules-2025/)) | S |
| 10 | CCPA business threshold USD 26,625,000; fines USD 2,663 and 7,988 from 1 Jan 2025 (`US_CCPA`) | Confirmed ([CPPA](https://www.cppa.ca.gov/regulations/cpi_adjustment.html)) | V (unchanged) |
| 11 | MAS TRM: notify within 1 hour; amendments consulted in June 2026, not final (`SG_MAS_TRM`) | The consultation closed 31 Jul 2026 and proposes the revised Notices take effect 12 months after they are published; not final at the date of this review ([Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/06/singapore-mas-proposes-to-amend-notices-on-technology-risk-management)). The 1-hour figure is in the current Notices, which were not re-read | P (unchanged) |
| 12 | Singapore Cybersecurity (Amendment) Act provisions in force 31 Oct 2025 (`SG_CYBERSECURITY_ACT`) | Commencement of most sections on 31 Oct 2025 confirmed; Part 3D (major foundational digital infrastructure providers) is to commence later ([Allen & Gledhill](https://www.allenandgledhill.com/sg/perspectives/articles/31414/sgkh-amendments-to-cybersecurity-act-2018-to-update-provisions-related-to-critical-information-infrastructure-and-systems-of-temporary-cybersecurity-concern-in-force-on-31-october-2025)). See N2 | S |
| 13–21 | Statutory caps and incident windows not expected to have moved: GDPR Art. 83(4)–(5); UK GDPR GBP 17.5m / 8.7m; UK NIS reg. 18(6) tiers; NIS2 Art. 34 minimums; DORA CTPP 1% daily; AI Act Art. 99; CRA Art. 64 and Art. 14 dates; Australian s.13G greatest-of; PDPC 3 calendar days; CPS 230 72 h and 24 h; CPS 234 72 h and 10 business days; SOCI 12 h and 72 h; CERT-In 6 h; SEC Item 1.05 four business days | Consistent with the sources the registry cites; no amendment found. Not re-read at primary source in this pass | As registry |

## 3. Earlier findings now closed

| First-review item | Check | Result |
|---|---|---|
| W1 "Required by" lists only regimes that apply; "If X applies to you" for those to confirm | `v4/evaluate.ts` lines 841–842 | Done |
| W2 CLOUD Act reason | `US_CLOUD_ACT.1` text | Done (the replacement text, word for word) |
| W3 DPDP s.3(a) and s.17(1)(d) | `IN_DPDP.1` text | Done |
| W5 FISA 702 status | `US_FISA_702.1` now dated 26 Oct 2026; re-checked above | Done; keep re-checking |
| W13 "You said ... confirm" template | `UK_OPRES.1`, `UK_PRA_SS2_21.1`, `US_SEC_CYBER.1`, `IN_RBI_PAYMENT.1` | Done |
| A5 retention test | `manage-sovereign-assessment/handler.spec.ts` lines 120–135: every write sets `expiresAt` 24 months on; an expired record is not listed, opened or reported | Done. The first review still lists A5 and C19 as open; update it |

## 4. New or still-open points for counsel

| # | Point | Why it matters | For |
|---|---|---|---|
| N1 | **DOJ Data Security Program civil penalty.** 28 CFR 202.1301(a)(2) states USD 368,136 or twice the transaction; (b) makes it subject to inflation adjustment, and NSD says it will adjust annually. OFAC's adjusted IEEPA figure is USD 377,700 from 15 Jan 2025 (90 FR, 2025-00786), and OMB cancelled the 2026 adjustments (M-26-11, reported by other agencies). No DOJ adjustment of the 202.1301 figure was found. The registry shows USD 368,136 with a note (CLM-SOV-108) | A board reads the per-violation figure | US counsel: which figure to show |
| N2 | **Singapore Cybersecurity Act penalties.** The registry says the updated penalty provisions are not yet in force. The 31 Oct 2025 commencement covered most sections of the Amendment Act; whether it included the new civil penalty provisions (reported as up to 10% of Singapore turnover or a fixed sum, whichever is higher) is not confirmed | Changes the exposure view for designated CII owners | Singapore counsel |
| N3 | **UK CTP enforcement.** The registry cites the regulators' disciplinary powers over CTPs (FSMA ss.312Q–312R). One commentator says the regime gives no power to fine the designated providers | Affects how the B6 concentration context describes oversight of the four providers | UK counsel |
| N4 | **C20, half done.** Question A4 asks for the size of the group "including companies you control"; question A5, which feeds the statutory caps, asks for "last year's worldwide turnover" without saying whose. Under CJEU C-383/23 *ILVA* the GDPR cap uses the undertaking (group) turnover | A single-entity figure understates the GDPR, NIS2, AI Act and DORA caps | Reworded 27 Oct 2026: A5 now asks for the group's worldwide turnover (all companies you control). EU counsel to confirm (brief EU-3) |
| N5 | **Volatile items to re-check on the day before an external session:** FISA 702; UK CSR Bill (report stage outcome); C-703/25 P; MAS TRM amendments; CCPA adjustment (January 2027) | All can move within weeks | Practice lead (A7) |

## 5. Limits

The same limits as the first review (its section 9): official sites mostly could not be fetched, so most statuses are S; this review cannot confirm facts about LTM's entities and contracts; it is not insured advice. It covered the ranked statements in the first review's section 6.2 and the volatile claims; it did not re-read all 42 regimes at primary source.
