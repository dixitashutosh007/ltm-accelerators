# FinOps IQ: screen-reader pass (VoiceOver, about 15 minutes)

> **Not required (owner decision, 27 Oct 2026).** The person-run pass is no longer part of the FinOps IQ plan. This checklist is kept for reference only; the automated accessibility checks (axe WCAG 2.2 AA scan, keyboard test and the screen-reader structure test in CI) remain.

The automated WCAG 2.2 AA scan and keyboard test pass (M7 section 4). This is the person-run check that automation cannot do: what a screen reader actually says. Run it once before the first external client, on the production page, and note anything that sounds wrong.

## Before you start

- Mac with Safari (VoiceOver works best with Safari). Turn VoiceOver on and off with **Cmd + F5**.
- VO keys = **Control + Option**. Useful commands:
  - **VO + U**: rotor (lists headings, links, form controls, landmarks); arrows to choose, Enter to jump.
  - **VO + Right / Left**: next / previous item. **Tab**: next control.
  - **VO + Space**: press the item under the cursor.
- Open `/finops-iq`, signed in.

## Checks

| # | Do this | You should hear | Pass? |
|---|---|---|---|
| 1 | Load the page; press Tab once | "Skip to content, link" | |
| 2 | VO + U, choose Landmarks | banner, main, content information (footer) | |
| 3 | Fill "Client organisation", choose Workshop, press Start assessment | Focus lands on the heading "Your estate, heading level 2" | |
| 4 | Tab through the estate questions | Each control says its question and option, e.g. "AWS, checkbox, not checked"; spend boxes say "Annual spend: AWS" | |
| 5 | Choose an exact spend and type digits | Typing is not interrupted, and nothing else is read out while you type | |
| 6 | Open a step from the step list (e.g. "Optimize Usage & Cost") | Focus lands on that step's heading; the step's button says "current step" | |
| 7 | Answer several questions | Each answer is confirmed ("selected"); the save status is **not** read out after each answer | |
| 8 | Workshop: answer QV-05 so that QV-06 appears | "A follow-up question was added: QV-06." | |
| 9 | On HY-04 (shares), type values | "Total 40 of 100 …" as the total changes | |
| 10 | Open "Review & complete"; VO + U, Headings | "Review and complete" (level 2), then "By step" and "Complete the assessment" (level 3) | |
| 11 | Press Complete assessment | One short line per step ("Scoring your answers on the server", "Rating each capability against its target" … "Result ready"), **not** the whole screen each time | |
| 12 | After completion | Focus lands on the client name, "heading level 1" | |
| 13 | Tab to the result tabs; use Left / Right arrows | "Overview, tab, selected, 1 of 6", then the next tab | |
| 14 | On Overview, move to the charts with VO + Right | Each chart is read as an image whose name carries the data, e.g. "Capability profile: Data Ingestion Walk, target Run; …" and "Capability heatmap by domain: Understand Usage & Cost: …" | |
| 15 | VO + U, Headings, on the dashboard | Client name (level 1), each card (level 2), items inside a card (level 3); no level skipped | |
| 16 | Findings tab: move to a cell of the priority matrix and press it | The cell's count, severity and wave (e.g. "2 findings: High, Wave 1"), then "selected" or "pressed" | |
| 17 | Press "Download report (PDF)" | "Preparing the report…", then "Downloaded." (or the error) | |
| 18 | All assessments: Delete an assessment, then Confirm | Focus moves to "Confirm delete …", then "… deleted." is read | |

Record any failure with the row number, what you heard and what you expected. A failure in rows 3, 6, 7, 11 or 12 would be a regression of the fixes below.

## Fixed before this pass (23 Oct 2026)

From an automated read of the page's accessibility tree and live announcements on every screen (workshop journey, start to every result tab):
- The working screen announced the whole card (logo, client, every step) at each step change; now only the step line is live.
- The save status was a live region and said "Unsaved changes" after every answer; it is now visible only. Save failures are still announced as alerts.
- Focus fell to the page body after starting and after completing an assessment; it now moves to the new view's heading, as it does after choosing a step.
- Result cards were level-3 headings directly under the level-1 client name; the result view now nests h1, h2, h3.
- The capability heatmap's image name was a generic sentence; it now lists each capability's rating and gap, like the capability profile chart.

Covered by the end-to-end test "screen readers: focus follows the view, the working screen reads one line, answers are not announced, headings nest".

## Automated pre-check after the shared top bar (27 Oct 2026)

PR #53 replaced the page header with the shared LTM Vantage top bar, after the checks above. Before the person-run pass, the page's accessibility tree was read again in Chromium (Playwright `ariaSnapshot`) on the start screen and after starting a workshop assessment:

| Row | Result | What the tree shows |
|---|---|---|
| 1 | Holds | The first Tab lands on "Skip to content", a link to `#main` |
| 2 | **Changed: expect one more landmark** | banner (the top bar), **navigation "Main"** (Accelerators, FinOps IQ), main, and contentinfo (footer). Inside main, the step list is a second navigation, "Assessment steps". When VO + U lists landmarks, "Main" navigation is new and expected |
| 3 | Holds | After Start assessment, focus is on "Your estate", heading level 2 |
| 4 | Holds (structure) | Every control in the estate step has an accessible name (30 checkboxes, text boxes, combo boxes and number fields named), also asserted by the browser test "every form control has an accessible name" |

The browser test "screen readers: focus follows the view, the working screen reads one line, answers are not announced, headings nest" still passes, covering rows 3, 6, 7, 11, 12 and 15.

What automation cannot settle, and the person-run pass is for: what VoiceOver actually says (wording, order, pronunciation of "FinOps"), that typing in a spend box is not interrupted (row 5), the live announcements as heard (rows 8, 9, 11, 17, 18), and the charts' image names read in context (row 14).
