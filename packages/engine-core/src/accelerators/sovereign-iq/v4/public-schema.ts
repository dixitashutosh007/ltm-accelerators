/**
 * What the Sovereign IQ page needs to render the questionnaire and the result (PLAN S5 item 1: the page reads the
 * public schema only, no copied knowledge base). No scoring data: option states, control weights and applicability
 * rules stay on the server. Which follow-up questions to show comes from the engine's `asked` list.
 * Written to Accelerators/assets/sovereign-iq/questions.json by `npm run build:sovereign-iq-questions`.
 */
import { CONTROLS, QUESTIONS, REGIMES, ENGINE_VERSION, MIN_SCORED_CONTROLS } from './evaluate';
import { DATA_CLASSES, DATA_CLASS_LABELS } from './facts';
import { LADDER } from './advisory';
import { SEAL } from './seal';
import { RETENTION_MONTHS } from '../../finops-iq/v3/retention';
import registryData from '../registry/regimes.json' with { type: 'json' };

const RETENTION_WORDS = ({ 12: 'one year', 24: 'two years', 36: 'three years' } as Record<number, string>)[RETENTION_MONTHS];
if (!RETENTION_WORDS) throw new Error(`No wording for a retention period of ${RETENTION_MONTHS} months`);
const DATA_NOTICE = `LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your organisation's name and sector, your answers (including any turnover figure), the computed result, the consultant's notes and the consultant's email address, and use them only to produce this assessment and its report. The assessment needs no personal details about individuals, so please do not enter any, including in notes. We keep each assessment for ${RETENTION_WORDS} after its last change and then delete it automatically; ask your consultant to delete it sooner. Reports are generated when requested and are not stored by LTM. Access and service logs, which record the consultant's email and network address, are kept in India for one year.`;
const AI_OFF = 'The AI narrative is off unless your consultant switches it on for this engagement.';
const AI_ON = 'The AI narrative is switched on for this engagement: the computed result, without your organisation\'s name, your answers or the consultant\'s notes, together with any short focus note from the consultant, is processed by Claude in Amazon Bedrock in India (the Mumbai and Hyderabad regions). Amazon Web Services runs the model and does not share the content with the model\'s developer. The text sent and returned is logged in India for one year.';
const RIGHTS = 'LTM\'s privacy notice explains your data protection rights and how to contact LTM\'s data protection team.';
/** The registry's "status as of" date, in words, for the disclaimer (S10 W14). */
const STATED_AT = new Date(`${(registryData as any).statusAsOf}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * Notices on the start screen and in the report, from one source (PLAN S10, as FinOps IQ M6). Wording from the S10
 * review (design/S10-data-protection.md 4.2, 4.3), approved by the owner on 26 Oct 2026; a qualified lawyer reads it
 * before the first external client.
 */
export const NOTICES = {
  disclaimer: `Sovereign IQ gives an indicative assessment based on the answers you provide, which LTM has not audited or verified. It is not legal advice and is not a substitute for advice from a qualified lawyer; LTM is not a law firm. Confirm with your counsel which laws apply to you and what they require before acting. The regulatory content is stated as at ${STATED_AT}. Statutory maximums are caps, not expected fines, and are never added together. The assessment is for your organisation's internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it.`,
  caps: 'Statutory maximums are caps, not expected fines, and are never added together.',
  review: 'Internal consultant use until a qualified lawyer has reviewed it (PLAN S10).',
  privilege: 'This report is not legal advice and is unlikely to be protected by legal professional privilege unless LTM is engaged through your lawyers.',
  data: `${DATA_NOTICE} ${AI_OFF} ${RIGHTS}`,
  /** The report's own sentence on AI, by the engagement's switch (W4: never claims that no model has seen the data). */
  dataWith: (aiOn: boolean) => `${DATA_NOTICE} ${aiOn ? AI_ON : AI_OFF} ${RIGHTS}`,
  statedAt: STATED_AT
};

/** The page's steps, in order, and the question themes each holds. */
export const STEPS = [
  { id: 'footprint', label: 'Footprint and entities', themes: ['footprint', 'entity'], intro: 'Where the group operates, whose personal data it holds, and the regulated roles that decide which laws apply. These answers set scope; they are never scored.' },
  { id: 'data', label: 'Data and platforms', themes: ['data', 'platform'], intro: 'The kinds of data you hold, where each sits today, and the platforms that hold it.' },
  { id: 'requirement', label: 'Sovereignty requirement', themes: ['requirement'], intro: 'How much control the board wants over its data, on top of what the law requires. The required level of each kind of data is the higher of the two.' },
  { id: 'controls', label: 'Location, transfers and keys', themes: ['residency', 'transfer', 'keys'], intro: 'How data location is enforced, what covers transfers, and who holds the keys.' },
  { id: 'operations', label: 'Operations and third parties', themes: ['operations', 'third_party', 'exit'], intro: 'Who can reach your data, what your contracts give you, and how ready you are to leave a provider.' },
  { id: 'governance', label: 'AI and governance', themes: ['ai', 'governance'], intro: 'AI data location and governance, ownership, incident reporting and assurance.' },
  { id: 'preferences', label: 'Outcome preferences', themes: ['preference'], intro: 'How the board wants remediation sequenced. Not scored.' }
] as const;

export const ZONE_LABELS: Record<string, string> = Object.fromEntries((QUESTIONS.find(q => q.id === 'A1')!.options as any[]).map(o => [o.value, o.label]));
export { DATA_CLASS_LABELS };
for (const c of DATA_CLASSES) if (!DATA_CLASS_LABELS[c]) throw new Error(`public-schema: no short name for data class ${c}`);
/** Names for the platforms of the playbook and the placement matrix (page and report share them). */
export const PLATFORM_LABELS: Record<string, string> = {
  aws: 'AWS', azure: 'Microsoft Azure', gcp: 'Google Cloud', oci: 'Oracle Cloud', ibm: 'IBM Cloud', alibaba: 'Alibaba Cloud', other_public: 'Other public cloud',
  sovereign_cloud: 'Sovereign and partner-operated clouds', kubernetes: 'Kubernetes', on_prem: 'Data centres and colocation', saas: 'SaaS', ai_api: 'AI model APIs',
  data_platform: 'Data platform', any: 'Any platform'
};
export const LEVEL_LABELS: Record<string, string> = { L0: 'L0 No location requirement', L1: 'L1 Residency', L2: 'L2 Residency with access control and key custody', L3: 'L3 Operational sovereignty', L4: 'L4 Jurisdictional separation or disconnected' };

const stripOption = ({ state, ...o }: any) => o;
const stripField = (f: any) => ({ ...f, ...(f.options ? { options: f.options.map(stripOption) } : {}) });

export function publicQuestionSchema() {
  return {
    engineVersion: ENGINE_VERSION,
    minScoredControls: MIN_SCORED_CONTROLS,
    steps: STEPS.map(s => ({ ...s, questions: QUESTIONS.filter(q => (s.themes as readonly string[]).includes(q.theme)).map(q => q.id) })),
    questions: QUESTIONS.map(q => ({
      id: q.id, theme: q.theme, kind: q.kind, mode: q.mode, type: q.type, text: q.text, ...(q.help ? { help: q.help } : {}),
      ...(q.options ? { options: q.options.map(stripOption) } : {}), ...(q.optionsFrom ? { optionsFrom: q.optionsFrom } : {}),
      ...(q.fields ? { fields: q.fields.map(stripField) } : {}),
      ...(q.matrix ? { matrix: { rowsFrom: q.matrix.rowsFrom, columns: q.matrix.columns.map(stripField) } } : {}),
      basis: q.basis.map((b: any) => b.citation),
      ...(q.feeds?.controls?.length ? { control: q.feeds.controls[0] } : {})
    })),
    controls: CONTROLS.map(c => ({ id: c.id, name: c.name, means: c.means, ownerRole: c.ownerRole, remedy: c.remedy, level: c.level, scored: c.scored !== false })),
    regimes: REGIMES.map(r => ({ id: r.id, name: r.name, kind: r.kind, market: r.market, citation: String(r.citation?.text ?? '').replace(/\s*\[CLM-[^\]]+\]/g, ''), url: r.citation?.url })),
    zones: ZONE_LABELS, dataClasses: DATA_CLASS_LABELS, levels: LEVEL_LABELS, platforms: PLATFORM_LABELS,
    rungs: LADDER.rungs.map(r => ({ id: r.id, level: r.level, label: r.label, means: r.means })),
    seal: { intro: SEAL.intro, framework: SEAL.framework, statusAsOf: SEAL.statusAsOf, levels: SEAL.levels.map(({ id, name, plain, note }) => ({ id, name, plain, ...(note ? { note } : {}) })), objectives: SEAL.objectives, mapping: SEAL.mapping },
    notices: { disclaimer: NOTICES.disclaimer, caps: NOTICES.caps, review: NOTICES.review, data: NOTICES.data }
  };
}
