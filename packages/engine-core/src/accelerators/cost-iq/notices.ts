/**
 * Cost IQ data notice and disclaimer, from one source: the report, the metadata endpoint and the page all read it.
 * Wording follows the FinOps IQ and Sovereign IQ notices (same hosting, retention and rights sentences). Draft until the
 * owner approves it (CQ9 gate); a qualified lawyer reads it before the first external client.
 */
import { RETENTION_MONTHS } from '../finops-iq/v3/retention';

const RETENTION_WORDS = ({ 12: 'one year', 24: 'two years', 36: 'three years' } as Record<number, string>)[RETENTION_MONTHS];
if (!RETENTION_WORDS) throw new Error(`No wording for a retention period of ${RETENTION_MONTHS} months`);

const DATA_NOTICE = `LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your organisation's name, your answers, any spend figures, internal cost rates and measured figures the consultant records, the computed result, and the consultant's email address, and use them only to produce this assessment and its report. The assessment needs no personal details about individuals, so please do not enter any, including in notes. We keep each assessment for ${RETENTION_WORDS} after its last change and then delete it automatically; ask your consultant to delete it sooner. Access logs, which record the consultant's email and network address, are kept for one year.`;
const AI_OFF = 'This version uses no AI features.';
const RIGHTS = "LTM's privacy notice explains your data protection rights and how to contact LTM's data protection team.";

export const NOTICES = {
  disclaimer: 'Cost IQ gives an indicative assessment based on the answers and figures you provide, which LTM has not audited or verified. It is not financial, accounting, tax, legal or regulatory advice, and is not a substitute for advice from a qualified professional. Value figures are an indicative range, not a savings commitment, and need validating against your own data before any decision. The assessment is for your organisation\'s internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it.',
  data: `${DATA_NOTICE} ${AI_OFF} ${RIGHTS}`,
  /** Short form for the start screen. */
  retentionWords: RETENTION_WORDS
};
