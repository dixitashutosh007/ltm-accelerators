# Sovereign IQ S10: briefs for counsel, by market

Prepared 27 Oct 2026 by Claude (AI) for the owner, to send to qualified lawyers for gate S10 (PLAN D9: written sign-off per market before the first external client). Each brief is self-contained: what the tool is, what to read, the questions as yes/no or choose-one, the exact wording to approve, and what LTM needs back. The analysis behind them is in [S10-data-protection.md](S10-data-protection.md) (first review) and [S10-second-review.md](S10-second-review.md).

The hours are rough estimates for a lawyer familiar with the area, so the owner can scope and compare quotes. They assume counsel confirms or corrects the prepared analysis rather than researching from scratch.

## What every brief shares

**The tool.** Sovereign IQ is an LTM consultant-led assessment. A consultant enters a client organisation's answers (markets, sectors, kinds of data, where it runs, controls in place). A rules engine places each of 42 regulations in one of four groups (applies on your answers / may apply, confirm / for awareness / does not apply on your answers), shows statutory maximum penalties as caps, rates control gaps, and produces a report with a roadmap and an LTM offering per finding. It is not marketed or described as legal advice. Client data is hosted by AWS in Mumbai and kept 24 months after the last change.

**What we ask for in every market.** A short signed memo that (1) answers the questions below, (2) approves or amends the wording, and (3) lists any statement that must be removed or changed before LTM shows the tool to an external client in that market. LTM records the answers in the claims register against each statement.

**Send with every brief:** the market's section of this file; the first review sections 4 (notice and disclaimer), 5 (legal-advice risk and wording W1–W14) and 6.2 (ranked statements); the registry extract for the market (generated from `registry/regimes.json`); one sample client report PDF (workshop mode, archetype for that market).

---

## Brief 1: EU (with France and Germany)

**Counsel:** an EU data protection and financial regulation practice, with a French avocat for question EU-7 and a German Rechtsanwalt for EU-8. **Estimate:** 8 to 12 hours, plus 2 to 3 hours each for France and Germany.

**Regimes in scope (9):** GDPR, NIS2, DORA, AI Act, Data Act, CRA, EU Cloud Sovereignty Framework (SEAL), SecNumCloud (FR) and C5 (DE), with the EU parts of the transfer analysis.

| # | Question | Prepared answer (for you to confirm or correct) |
|---|---|---|
| EU-1 | Are the four group labels, with the methodology sentence (W6, W7), acceptable as not stating legal conclusions? | Yes, with the sentence "LTM's reading of each law's scope test against your answers, not a legal opinion" |
| EU-2 | Negative statements: may the report say a regulation "does not apply on your answers" and list them in the appendix (ranked statement 1)? Specifically `EU_NIS2.7` (DORA as lex specialis, so the NIS2 equivalents do not apply) and CLM-SOV-046 (no data-localisation requirement in DORA or NIS2) | Yes for the grouping, if the appendix keeps "on your answers"; CLM-SOV-046 stays consultant-only until you confirm it |
| EU-3 | Statutory caps: is it right to compute GDPR, NIS2, AI Act and DORA caps on the group's worldwide turnover (C-383/23 *ILVA*), and to show them only as caps, never added together? | Yes; LTM will reword question A5 to ask for the group's turnover (second review N4) |
| EU-4 | Incident windows shown: GDPR 72 h; NIS2 24 h / 72 h / one month; DORA initial 4 h after classification and no later than 24 h after awareness, intermediate 72 h, final one month; CRA 24 h / 72 h / 14 days or one month. Correct as summaries? | Yes |
| EU-5 | AI Act dates as amended by Regulation (EU) 2026/1744 (Annex III 2 Dec 2027; Annex I 2 Aug 2028; Art. 50(2) marking by 2 Dec 2026). Correct? | Yes |
| EU-6 | Transfers: is "SCCs remain valid; the DPF covers certified US recipients while appeal C-703/25 P is pending" a fair summary for a client? | Yes, with the as-at date |
| EU-7 | **France:** can LTM's consultants deliver this workshop to a French client without breaching loi n° 71-1130 art. 54 (legal consultation), given art. 60 (accessory to the main activity)? What wording or restriction is needed? | Unknown: the main open legal risk (first review 5.1) |
| EU-8 | **Germany:** is the workshop an ancillary legal service under RDG § 5, consistent with BGH *Smartlaw* (I ZR 113/20)? | Yes, low risk, with the wording |
| EU-9 | SecNumCloud and C5 triggers: `FR_SECNUMCLOUD.1`–`.2` and `DE_C5.1` as written; and should the two UNSOURCED rules (French OIV, German public sector) stay hidden from clients? | As written; keep the two hidden |
| EU-10 | Disclaimer and privilege sentence (first review 4.3, W14): adequate for EU clients? | Yes |

**Wording to approve:** W1, W6–W12, W14; the SEAL heading change ("Provider SEAL that matches the level you set, by objective (LTM mapping)"); the SOW note ("LTM's work does not include legal advice").

---

## Brief 2: United Kingdom

**Counsel:** a UK data protection and financial services regulatory practice. **Estimate:** 5 to 8 hours.

**Regimes in scope (6):** UK GDPR and DPA 2018 (as amended by DUAA), PRA SS1/21 and FCA SYSC 15A, PRA SS2/21, the critical third parties regime, NIS Regulations 2018, the Cyber Security and Resilience Bill (shown as not law).

| # | Question | Prepared answer |
|---|---|---|
| UK-1 | Is giving this assessment a reserved legal activity under the Legal Services Act 2007 s.12? | No; the risk is liability and privilege, not legality |
| UK-2 | Is the disclaimer (first review 4.3) a reasonable exclusion of reliance under UCTA, for a B2B consultant-led session? | Yes, with "not a substitute for advice from a qualified lawyer; LTM is not a law firm" |
| UK-3 | Privilege: is it right to tell clients the report is not privileged (*R (Prudential) v Special Commissioner* [2013] UKSC 1)? | Yes |
| UK-4 | Scope wording for PRA-regulated firms (`UK_OPRES.1`, `UK_PRA_SS2_21.1`, the "You said ... confirm" template): accurate? | Yes |
| UK-5 | Transfers after DUAA Sch. 7 (in force 5 Feb 2026): is the summary in `UK_GDPR.TRANSFERS` right, including "EEA-to-UK transfers are covered by EU adequacy until 27 Dec 2031"? | Yes |
| UK-6 | CTP regime: the designations (four providers, effective 13 Jul 2026) and "the designation creates no duties for firms; their own outsourcing and resilience duties remain". Accurate? And what enforcement powers do the regulators have over a CTP (second review N3)? | Accurate; enforcement to confirm |
| UK-7 | UK NIS penalty tiers (GBP 1m / 8.5m / 17m, reg. 18(6)) and the CSR Bill shown as "not law" with its proposed maximum. Accurate as at the report date? | Yes; the Bill's status to be re-checked at Royal Assent |

**Wording to approve:** as Brief 1, applied to UK text; W13 for the PRA reasons.

---

## Brief 3: United States

**Counsel:** a US privacy and national-security regulatory practice. **Estimate:** 5 to 8 hours.

**Regimes in scope (10):** CLOUD Act, FISA 702, DOJ Data Security Program (28 CFR Part 202), CCPA as amended, other state privacy laws (flag only), HIPAA, GLBA and the FTC Safeguards Rule, NYDFS Part 500, SEC cybersecurity disclosure, FedRAMP.

| # | Question | Prepared answer |
|---|---|---|
| US-1 | Unauthorised practice of law: for a B2B consultant-led tool about the client's own compliance, with the disclaimer "not a substitute for the advice of an attorney", is UPL risk acceptably low across the states where LTM US operates? | Yes (Texas Gov't Code § 81.101(c) as an example) |
| US-2 | CLOUD Act reason (`US_CLOUD_ACT.1`, W2), including "keys you hold outside the provider's control limit what it can technically produce, not its legal duty". Accurate? | Yes |
| US-3 | FISA 702 status line (`US_FISA_702.1`: lapsed June 2026, certifications to March 2027): acceptable to show with "re-check before quoting"? | Yes, re-checked on the day |
| US-4 | DOJ DSP penalty: show USD 368,136 (28 CFR 202.1301(a)(2)) or an inflation-adjusted figure (second review N1)? | USD 368,136, "subject to inflation adjustment" |
| US-5 | DOJ DSP scope (`US_DOJ_DSP.1`–`.3`): is the summary of countries of concern, bulk thresholds and screening right? | Yes |
| US-6 | CCPA: thresholds and amounts from 1 Jan 2025 (USD 26,625,000; USD 2,663 / 7,988; USD 107–799 per consumer per incident, corrected in the second review, E1). Correct? | Yes |
| US-7 | SEC: "domestic registrants file Form 8-K Item 1.05 within four business days of determining materiality; foreign private issuers use Forms 6-K and 20-F". Correct? | Yes |
| US-8 | NYDFS 500.19(a) exemption thresholds and the 72-hour / 24-hour notices. Correct? | Yes |

**Wording to approve:** W2, W6–W9, W11, W13 (SEC), W14.

---

## Brief 4: Asia-Pacific (Singapore, Australia, India; others optional)

**Counsel:** one firm per country, or a regional firm. **Estimate:** 3 to 5 hours each for Singapore, Australia and India. Japan, Hong Kong, Korea, mainland China and New Zealand only if LTM will use the tool with clients there (2 to 3 hours each).

### Singapore (PDPA, MAS TRM and outsourcing, Cybersecurity Act)

| # | Question | Prepared answer |
|---|---|---|
| SG-1 | Is delivering the workshop acting as an advocate or solicitor under Legal Profession Act s.33? | No, if LTM does not hold itself out as giving legal advice |
| SG-2 | PDPA: penalty "SGD 1 million or 10% of Singapore turnover above SGD 10 million"; breach notice within 3 calendar days of assessing it notifiable. Correct? | Yes |
| SG-3 | MAS: "notify MAS within 1 hour of discovering a relevant incident; critical systems RTO of 4 hours", with the June 2026 amendments shown as not final. Correct? | Yes |
| SG-4 | Cybersecurity Act: are the updated penalty provisions in force (second review N2)? | Not confirmed |
| SG-5 | Negative statement: no general data-location requirement in MAS TRM or outsourcing rules (CLM-SOV-046). Correct? | Yes; stays consultant-only until confirmed |

### Australia (Privacy Act, CPS 230, CPS 234, SOCI)

| # | Question | Prepared answer |
|---|---|---|
| AU-1 | Is it engaging in, or representing entitlement to engage in, legal practice under the Legal Profession Uniform Law ss.10–11? | No, with the wording |
| AU-2 | s.13G: show AUD 50m and 30% of adjusted turnover, with "three times the benefit" stated but not computed. Acceptable? | Yes |
| AU-3 | Windows: CPS 230 72 h and 24 h; CPS 234 72 h and 10 business days; SOCI 12 h and 72 h. Correct? | Yes |
| AU-4 | The small-business threshold (AUD 3m) and the Australian-link rule (s.5B) as worded in `AU_PRIVACY.2`–`.4`. Correct? | Yes |
| AU-5 | First review C16: APP 8 and the employee-records exemption for consultants' data sent to the Indian hosting entity | Open |

### India (DPDP Act and Rules, RBI payment data, CERT-In, SEBI and IRDAI)

| # | Question | Prepared answer |
|---|---|---|
| IN-1 | Under the Advocates Act s.29 and *Bar Council of India v A.K. Balaji* (2018), can LTM consultants deliver this workshop to Indian clients, and with what wording? | Medium-low risk; the main open point for India |
| IN-2 | DPDP dates (13 Nov 2025; 13 Nov 2026; 13 May 2027) and the s.3(a) and s.17(1)(d) wording (`IN_DPDP.1`–`.2`). Correct? | Yes |
| IN-3 | RBI: "the entire payment system data stored only in India; RBI's FAQs describe limited exceptions" with the "the law requires it" finding title replaced by W12. Acceptable? | Yes |
| IN-4 | CERT-In: 6 hours to report; 180 days of logs within India. Correct? | Yes |
| IN-5 | SEBI cloud framework and CSCRF: keep the localisation as advisory (no legal floor) while the CSCRF localisation standard is in abeyance? | Yes, until you confirm otherwise |
| IN-6 | Retention: is deletion on request within the first year consistent with DPDP Rule 8(3) (first review C13)? | Open |

**Wording to approve (all APAC):** W6–W14 as they apply; the disclaimer.

---

## After the answers come back

1. LTM records each answer in the claims register (status V where counsel confirms) and in the first review's comments register.
2. Any statement counsel rejects is changed or hidden before the first external client in that market.
3. Gate S10 can be closed per market. LTM can use the tool externally in markets that have signed off while others are pending, provided the report hides regimes from unsigned markets or marks them consultant-only.
4. Then S11: the re-score against all 13 areas.
