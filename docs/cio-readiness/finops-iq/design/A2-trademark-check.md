# FinOps IQ: A2 preliminary trademark check

Owner action A2 (`M6-data-protection.md`): before the first external client, check whether "FINOPS" is a registered mark that would stop LTM using "FinOps IQ" as a product name. This is a preliminary desk check from public web sources on 23 Oct 2026, prepared by the build. It is not a register search and not legal advice; the trademark registers' search tools (USPTO, EUIPO, UKIPO, IP India) are interactive applications that could not be queried from this environment.

## Findings

| # | Finding | Source | Weight |
|---|---|---|---|
| 1 | The LF Projects trademark policy lists the FinOps Foundation's marks: FinOps Certified®, FinOps Connect® and FinOps X® (registered); FinOps Foundation™ and FinOps Framework™ (claimed). It lists no standalone "FinOps" mark | [LF Projects trademark policy](https://lfprojects.org/policies/trademark-policy/) (read 23 Oct 2026) | Supports M6 C4: the Foundation itself does not claim the bare word |
| 2 | The same policy: "A trademark should not be used as part of your product name"; fair use allows "true factual statements" but not implying endorsement | Same | "FinOps IQ" does not use any listed mark; keep the non-endorsement sentence and no Foundation logo |
| 3 | No registration for the bare word FINOPS was found in public web results (USPTO aggregators, news, the Foundation's own pages) | Web searches, 23 Oct 2026 | Absence in search results is weak evidence; a register search is still needed |
| 4 | **Perficient markets "Cloud FinOps IQ"**, a four-week cloud cost assessment engagement run with CloudBolt (discovery workshops, billing connectors, cost analysis and recommendations) | [Perficient: Cloud FinOps IQ](https://www.perficient.com/what-we-do/jumpstart/cloud-finops-iq) (from search results; the page could not be fetched) | **The main risk.** Near-identical name for the same kind of service (a FinOps assessment sold by a consulting firm). No ® or ™ marking was seen, and no registration was found, but unregistered use can still support a passing-off or likelihood-of-confusion claim, and prospects may confuse the two |
| 5 | A US application "FINOPS PERFORMANCE INDEX" (with logo, 2024) covers cloud spend analytics software | [Justia trademark record](https://trademarks.justia.com/983/46/finops-performance-98346893.html) | Shows others file FINOPS-prefixed marks; not a conflict with "FinOps IQ" on its face |

## Recommendation

1. Treat the bare word "FinOps" as descriptive (the name of a discipline), consistent with M6 C4. Nothing found changes that.
2. Raise finding 4 with LTM's legal or brand team before external use. The options, from least to most change:
   - keep "FinOps IQ" after a register search for "FINOPS IQ" and "CLOUD FINOPS IQ" in the US, EU, UK and India (classes 9, 35, 36 and 42) comes back clear, and accept the residual confusion risk;
   - always present it as "LTM FinOps IQ" so the source is clear;
   - rename (for example "LTM Cloud Cost IQ", as M6 suggested).
3. Search the registers directly (about an hour): [USPTO trademark search](https://tmsearch.uspto.gov/), [EUIPO eSearch](https://euipo.europa.eu/eSearch/), [UKIPO search](https://trademarks.ipo.gov.uk/ipo-tmtext), [IP India public search](https://tmrsearch.ipindia.gov.in/eregister/). Terms: FINOPS, FINOPS IQ, CLOUD FINOPS IQ.

A2 stays open until the register search is done and LTM's legal team has decided on finding 4.

## Part 2: register searches (27 Oct 2026)

Prepared by `finops-cost-lead` on 27 Oct 2026. Not legal advice and not a clearance search: it covers exact and near-exact word marks only, not phonetic or design variants, unregistered rights, company names or domain names.

### What could and could not be searched

| Register | Searched? | How, or why not |
|---|---|---|
| **USPTO** (trademark search) | **Yes** | The search service behind [tmsearch.uspto.gov](https://tmsearch.uspto.gov/), word mark field, live and dead records, all classes. Terms: `finops*`, `*finops*`, `finops AND iq`, `cloud AND finops`, `fin AND ops AND iq` |
| **USPTO TSDR** (case status) | **Partly** | TSDR answered "429 Too Many Requests". Status, register type, disclaimer and goods and services were read from the same USPTO search records instead |
| **EUIPO** eSearch | **No** | The connection was reset from this environment (page and API) |
| **TMview** (EUIPO's network search, which covers EU national offices, UKIPO and others) | **No** | The search API did not respond from this environment |
| **UKIPO** | **No** | The search returns a CAPTCHA ("security check") page |
| **WIPO Global Brand Database** | **No** | The search page runs a CAPTCHA before showing results |
| **IP India** | **No** | The e-register at tmrsearch.ipindia.gov.in looks up an application number only; the public word search is an interactive form, and the site's certificate was rejected by the fetch tool (the check was not bypassed) |

### USPTO results (17 records containing FINOPS; none for FINOPS IQ or CLOUD FINOPS IQ)

| Mark | Serial (registration) | Status | Register, disclaimer | Owner | Class |
|---|---|---|---|---|---|
| FINOPS | 88548594 | Dead: abandoned 26 May 2020, failure to respond | Principal (application) | Joseph M Matthew (individual, Australia) | 42 |
| FINOPS X | 97353912 (7538172) | Registered | Principal | LF Projects, LLC | 41 |
| FINOPS CERTIFIED | 97449054 (7302424) | Registered | Principal | LF Projects, LLC | 41 |
| FINOPS CONNECT | 98849347 (7952515) | Registered | Principal | LF Projects, LLC | 38, 42 |
| FINOPS CO-OP | 97491339 (7272484) | Registered | **Supplemental** | Charesse J Hagan, LLC | 42 |
| FINOPS FABRIC | 99061331 (8247059) | Registered | **Supplemental** | DoiT International Ltd. | 42 (includes cloud advisory and consulting) |
| FINOPS FABRIC | 79448492 | Live application (international) | — | DoiT International Ltd | 9, 42 |
| HYBRID FINOPS | 99726401 (8428154) | Registered | **Supplemental** | Clear Technologies, Inc | 42 |
| FINOPSLY | 97862878 (8368669) | Registered | Principal | Finopsly Inc. | 42 |
| FINOPS PERFORMANCE INDEX | 98346893 (7812828) | Registered | Principal | CloudBolt Software, Inc. | 42 |
| FINOPS READY | 99225669 | Live application, suspended | Principal, **"FINOPS" disclaimed** | Invero Digital Inc. | 35 (business evaluations and reports for cloud financial operations) |
| AI FINOPS | 99885547 | Live application | — | Trimio, Inc | 42 |
| FINOPS AI, FINOPS CENTER, FINOPS FOR HIRE, HEALTHCARE FINOPS, FINOPSY | various | Dead | — | various | 9, 35, 36, 42 |

### What this shows

1. **No US record for FINOPS IQ or CLOUD FINOPS IQ**, live or dead. Perficient's "Cloud FinOps IQ" (finding 4) is not registered in the US as a word mark. Its page could not be re-read (429), so its marking is still unchecked.
2. **The bare word FINOPS is not registered in the US.** The only application was abandoned in 2020.
3. **The USPTO treats FINOPS as descriptive in this field.** One applicant disclaimed it (FINOPS READY, for cloud financial-operations reports, close to LTM's service), and three marks built on it sit on the Supplemental Register, which is for marks not yet distinctive. This supports M6 C4 and recommendation 1: "FinOps" names the discipline.
4. **The FinOps Foundation's registered marks are FINOPS X, FINOPS CERTIFIED and FINOPS CONNECT** (LF Projects), as its trademark policy says (finding 1). "FinOps IQ" uses none of them.
5. **Others file FINOPS-plus-word marks for the same kind of service** (FINOPS FABRIC also covers cloud advisory and consulting in class 42; FINOPS READY covers assessment-style reports in class 35). With FINOPS descriptive, the distinctive part of LTM's name is "IQ", and the risk sits mainly with names ending in IQ in classes 35 and 42, Perficient's first.

### Still needed (professional register search)

A trademark professional should run a clearance search before external use:
- **Registers:** EUIPO and EU national offices (through TMview), UKIPO, IP India, WIPO (Madrid designations), and a re-run of USPTO with TSDR prosecution history (office actions on the FINOPS marks).
- **Terms:** FINOPS IQ, CLOUD FINOPS IQ, LTM FINOPS IQ, FINOPS, and "IQ" marks for cloud cost and IT advisory services (the similar-mark question this desk check cannot answer).
- **Classes:** 9, 35, 36, 41 and 42.
- **Unregistered use:** Perficient's "Cloud FinOps IQ" (date of first use, marking, markets), for passing off in the UK and India and common-law rights in the US.

**A2 status:** still open. Part 2 changes no recommendation above; it adds US evidence that "FinOps" alone is descriptive and that "FinOps IQ" is not registered in the US. LTM's legal or brand team decides on finding 4 after the professional search.
