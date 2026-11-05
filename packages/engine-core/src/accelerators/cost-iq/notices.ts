/**
 * Cost IQ data notice and disclaimer, from one source: the report, the metadata endpoint and the page all read it.
 * Wording follows the FinOps IQ and Sovereign IQ notices (same hosting, retention and rights sentences). Draft until the
 * owner approves it (CQ9 gate); a qualified lawyer reads it before the first external client.
 */
import { RETENTION_MONTHS } from '../finops-iq/v3/retention';

const RETENTION_WORDS = ({ 12: 'one year', 24: 'two years', 36: 'three years' } as Record<number, string>)[RETENTION_MONTHS];
if (!RETENTION_WORDS) throw new Error(`No wording for a retention period of ${RETENTION_MONTHS} months`);

const DATA_NOTICE = `LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your organisation's name, your answers, any spend figures, internal cost rates and measured figures the consultant records, the computed result, and the consultant's email address, and use them only to produce this assessment and its report. The assessment needs no personal details about individuals, so please do not enter any, including in notes. We keep each assessment for ${RETENTION_WORDS} after its last change and then delete it automatically; ask your consultant to delete it sooner. Access logs, which record the consultant's email and network address, are kept for one year. The page's typefaces are loaded from Google Fonts, which therefore receives the visitor's network address and browser details; no assessment data is sent to it.`;
const AI_OFF = 'The AI narrative is off unless your consultant switches it on for this engagement.';
const AI_ON = 'The AI narrative is switched on for this engagement: the scores, findings and recommendations, without your organisation\'s name, your answers, your figures or the consultant\'s notes, together with any short focus note from the consultant, are processed by Claude in Amazon Bedrock in India (the Mumbai and Hyderabad regions). Amazon Web Services runs the model and does not share the content with the model\'s developer. The text sent and returned is logged in India for one year.';
const RIGHTS = "LTM's privacy notice explains your data protection rights and how to contact LTM's data protection team.";

export const NOTICES = {
  disclaimer: 'Cost IQ gives an indicative assessment based on the answers and figures you provide, which LTM has not audited or verified. It is not financial, accounting, tax, legal or regulatory advice, and is not a substitute for advice from a qualified professional. Value figures are an indicative range, not a savings commitment, and need validating against your own data before any decision. The assessment is for your organisation\'s internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it.',
  data: `${DATA_NOTICE} ${AI_OFF} ${RIGHTS}`,
  /** The report's own sentence on AI, by the engagement's switch: it never claims that no model has seen the data when one has. */
  dataWith: (aiOn: boolean) => `${DATA_NOTICE} ${aiOn ? AI_ON : AI_OFF} ${RIGHTS}`,
  /** Short form for the start screen. */
  retentionWords: RETENTION_WORDS
};
