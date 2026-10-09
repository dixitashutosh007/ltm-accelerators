# Brand: LTM Vantage — Responsible Advisory

**LTM Vantage** is the platform of advisory accelerators: the portal and every accelerator, such as Strategy IQ, Cloud IQ, FinOps IQ, FinOps Value Case, Posture IQ, Sovereign IQ, Modernize IQ, AI Readiness IQ, Cost IQ and Resilience IQ.

**Responsible Advisory** is its subtitle.

## Two names, two jobs

| Use | Name | Where |
|---|---|---|
| **Platform**: the site, tool, service or report engine | `LTM Vantage`, with the lockup `LTM Vantage · Responsible Advisory` | Page titles, headers, splash screens, footers, report banners, PDF headers and footers, email subjects, sign-in, error messages |
| **Practice**: the people who prepare, recommend, sign off or are contacted | `LTM Infrastructure Tech Advisory` | "Prepared by", "Lead Partner", "schedule a briefing with", "recommends", AI persona prompts |

Do not use the retired variants: "LTM Advisory" (for the platform), "LTM CIS", "LTM · CIS Tech Advisory", "LTM Advisory Practice", "Infrastructure Tech Advisory (CIS)" or "Advisory Accelerators Platform".

## Patterns

- **Page title:** `<Accelerator> — <descriptor> · LTM Vantage`. The home page is `LTM Vantage — Responsible Advisory`.
- **Accelerator header:** the LTM logo, then the accelerator name, with the sub-line `LTM Vantage · Responsible Advisory` beneath it.
- **Home header:** the LTM logo, then **Vantage**, with *Responsible Advisory* beneath it.
- **Splash badge:** `LTM VANTAGE · RESPONSIBLE ADVISORY`. The home splash is `LTM Vantage` / `Responsible Advisory`.
- **Report and PDF footer:** `LTM Vantage · Responsible Advisory · <Accelerator> · Confidential`.
- **Feature names:** `LTM Vantage Studio` (the AI drawer) and `LTM Vantage Accelerators` (the cross-accelerator menu).

## Enforcement

`npm run check:repo` (rule 9) fails if:
- a page title does not name LTM Vantage; or
- a retired variant such as "LTM CIS" appears on a page.

Cost IQ and Resilience IQ are maintained separately. They carry the brand in their title and header but are not checked by this rule.
