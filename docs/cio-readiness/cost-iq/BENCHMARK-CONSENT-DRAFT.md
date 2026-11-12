# LTM benchmark dataset: consent text, draft for counsel

Status: **draft for counsel, 12 Nov 2026.** This is a working draft written for counsel to review, not legal advice and not approved text. Until counsel approves a version and the owner switches the dataset on (`benchmark-config.json`), Cost IQ contributes nothing and shows no peer figure.

## What the client would be asked

> **Contribute to LTM's technology cost benchmark (optional)**
>
> With your agreement, LTM adds a small set of anonymised ratios from this assessment to its benchmark of technology cost and value. In return, once enough organisations like yours have taken part, your reports can show how your ratios compare with theirs.
>
> **What is shared:**
> - your industry and revenue band, as chosen in the assessment;
> - the year of the assessment and the methodology version;
> - your cost and value management scores;
> - if recorded, your split of technology spend by category, as percentages;
> - if recorded, ratios of technology users, applications and servers to employees.
>
> **What is never shared:** your organisation's name, any amount of money, your answers, notes or contacts, and anything that could identify you or anyone in your organisation.
>
> **How it is used:** a figure is shown only for a group of at least ten organisations, labelled with the number behind it, so no organisation's ratios can be read from it. Contributions are used only for this benchmark.
>
> **Your choice:** taking part is optional and does not change your assessment or report. You can withdraw at any time by asking your LTM consultant. Your contribution is then removed and no longer used in any figure produced after that.
>
> ☐ I agree, on behalf of [organisation], to contribute the anonymised ratios described above (consent text version [BMK-1]).

## Questions for counsel

1. **Authority.** Who at the client can give this agreement, and is a tick box in the assessment enough, or does it belong in the engagement letter?
2. **Personal data.** The contribution holds no personal data as drafted: industry, revenue band, year, scores and ratios. Please confirm it falls outside the GDPR, UK GDPR and India's DPDP Act. The consent record itself (who agreed, and when) is personal data and stays with the assessment.
3. **Confidential information.** Is an organisation's anonymised ratio its confidential information under typical LTM engagement terms, so that the engagement letter must permit this use?
4. **Hosting.** The platform is hosted in AWS Mumbai (India). Does storing contributions there need anything beyond the existing data notice?
5. **Withdrawal.** Is "removed and no longer used in figures produced after that" acceptable, given that figures already issued cannot be recalled?
6. **Group size.** Is a minimum of ten organisations per figure enough to prevent identification in small industries and bands, or should the threshold, or the coarseness of the groups, be higher?
7. **Competition law.** Do shared cost ratios among competitors in a narrow group raise information-exchange concerns, and does the threshold of ten, aggregation only, and no names address them?

## What the code already enforces (`benchmark.ts`)

- **Switched off by default.** Nothing is contributed or shown until `enabled` is true and `consentVersion` is set.
- **Consent.** A contribution is built only with recorded consent to the current consent version.
- **Fields.** The contribution carries only the fields listed under "What is shared". A test checks that no name, money, answer, currency or exact date leaks into it.
- **Group size.** Peer figures are quartiles of a group of at least ten contributions per metric. The floor of ten cannot be lowered by configuration.

## Not built yet (a separate, approved change)

- **Storage:** where contributions are stored, who can read them, and how a withdrawal deletes one.
- **Consent screen:** the consent tick box on the assessment screen, and the consent record.
- **Report section:** the section that shows peer figures.
