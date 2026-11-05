# User activity: notice wording and legal notes (draft for counsel)

**Date:** 3 Nov 2026. **Status:** draft. This is drafting help from an AI assistant, not legal advice. LTM's counsel (and, for EU, UK and other regions, local counsel) must review it before use. Text in [square brackets] is for LTM to fill in.

## What the notice has to describe (facts from the build)
| Fact | Value |
|---|---|
| Recorded | Work email address; time of each sign-in, first and last sign-in, number of sign-ins; for each assessment started, saved, completed or archived: tool, assessment reference, status, started, last saved and completed times, and the stage reached where the tool gives one |
| Not recorded | Answers, results, client names, notes, IP address, device, location, anything typed |
| Who sees it | Platform administrators (Admin group and named super administrators) in the Access Control screen; CSV downloads |
| Where | AWS, Mumbai region (ap-south-1), in LTM's account |
| How long | Deleted automatically 12 months after the record was last updated; an assessment's record goes with the assessment when it is deleted |
| Who is covered | LTM staff, EY staff and other people given an account (domain rules, P1) |

## 1. Short notice (shown on the Activity tab and linked from the sign-in screen)
> LTM Vantage records when you sign in and the status and dates of the assessments you start or save (which tool, the assessment reference and the times). It does not record your answers or your clients' names in this log. Administrators use it to manage access and support users. Records are deleted 12 months after they were last updated. Read the full notice: [link]

## 2. Full notice (for all account holders)
**LTM Vantage: how we record sign-ins and assessment activity**
Version 1.0, effective [date]

**Who we are.** [LTM legal entity, registered address] ("LTM") provides LTM Vantage. For questions about this notice, contact [privacy contact / data protection officer, email]. [Grievance officer, if required: name, email.]

**What we record.**
- Your work email address and the date and time of each time you sign in. We keep your first sign-in, your latest sign-in and how many times you have signed in.
- For each assessment you start, save, complete or archive: which tool it is in, the assessment reference, its status (for example draft, in progress, completed), when you started, last saved and completed it, and, where the tool shows one, the stage you reached.

**What we do not record in this log.** Your answers, the results of an assessment, your clients' names, notes you write, your location or IP address, your device, or what else you do on your computer.

**Why we record it.**
1. To keep the platform secure and to control who has access, including removing access.
2. To help you when something goes wrong, for example to find an assessment you cannot locate.
3. To manage licences and to understand how much each tool is used, in totals.
4. To answer audit and client-assurance questions about who used the platform and when.

We do not use this record to assess your performance or to make decisions about your pay, promotion or continued employment. [Counsel: if LTM wants to use it for anything else, name it here.]

**Our legal basis.** [LTM staff: this processing is part of providing and securing the systems you use for your work, and is in LTM's legitimate interests; counsel to confirm the basis for each country. / Other account holders: it is necessary for us to provide you access and secure the platform, and is in our legitimate interests.]

**Who can see it.** A small number of LTM platform administrators, using a screen that only they can open. We host the records with Amazon Web Services in India (Mumbai). We do not sell them. We share them only with the providers that host or support the platform for us, and when the law requires it. [If you use LTM Vantage through EY or another organisation, that organisation may be responsible for you as well; its own notice applies to how it uses what it receives. Counsel to confirm the roles.]

**How long we keep it.** Records are deleted automatically 12 months after they were last updated. If you delete one of your assessments, its record here is deleted with it. If your account is removed, the records stay until they expire unless we delete them sooner.

**Your rights.** You may ask us what we hold about you, to correct it, to delete it where the law allows, and to object to it. Write to [privacy contact]. If you are not satisfied, you may complain to [the Data Protection Board of India / the data protection authority where you live].

**Changes.** If we change this notice we will update the version and date above and tell administrators and account holders where the change is significant.

## 3. Statement for administrators (shown above the CSV downloads, and in the administrator guide)
> You can see this record only to manage access, support users, and answer audit questions. Do not use it to judge anyone's performance or to look into a person without a reason that is recorded. Downloads contain personal data: keep them in [approved location], share them only with people who need them, and delete them when you are done.

## 4. Sign-in screen line
> By signing in you can see how we record sign-ins and assessment activity: [link to the full notice].

## 5. Questions for counsel
1. **India.** The Digital Personal Data Protection Rules 2025 were notified on 13 Nov 2025; the notice rule (Rule 3) is reported to apply from 13 May 2027, 18 months after notification. Confirm the dates against the gazette notifications (G.S.R. 843(E), G.S.R. 846(E)), and whether the employment "legitimate use" in section 7 removes the duty to give notice for staff. It is not settled in the commentary we found, so give notice to everyone either way.
2. **EU and UK staff or account holders.** GDPR or UK GDPR Articles 13 and 14 content; the legal basis (legitimate interests would need a recorded balancing test); a data protection impact assessment screening; the record of processing; transfers of EU or UK people's data to India. Some countries (for example Germany) require works council involvement for technical systems that can monitor staff.
3. **Other regions.** Singapore PDPA notification; US state notice rules on electronic monitoring of employees (for example New York's written notice and acknowledgment duty); any country-specific rules for the places LTM and EY staff sit.
4. **EY and other organisations' staff.** Who is the controller (LTM alone, or jointly with the person's own organisation) and whether a data-sharing clause is needed in the agreement that gives them access.
5. **The personal address.** One named individual with a personal email address is a permitted account. Confirm the basis and the notice wording for a person who is not staff.
6. **Purposes.** Whether usage totals (purpose 3) and client assurance (purpose 4) are acceptable as stated, and whether the "no performance use" promise is one LTM wants to make.
7. **Retention.** Whether 12 months is justified for each purpose, or whether some purposes need less.
8. **Administrator access.** Reading this record is itself access to personal data. We recommend logging which administrator opened the Activity tab or downloaded a file (not built yet).

## 6. Where to put it
- Short notice: the Activity tab (in place, see `Accelerators/index.html`), and a link on the sign-in screen.
- Full notice: a page on the platform that does not need a sign-in, and in the onboarding email an administrator sends with a new account.
- Keep the version number and date; when the notice changes, record the date it changed.
