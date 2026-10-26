/**
 * What the Sovereign IQ page needs to render the questionnaire and the result (PLAN S5 item 1: the page reads the
 * public schema only, no copied knowledge base). No scoring data: option states, control weights and applicability
 * rules stay on the server. Which follow-up questions to show comes from the engine's `asked` list.
 * Written to Accelerators/assets/sovereign-iq/questions.json by `npm run build:sovereign-iq-questions`.
 */
import { CONTROLS, QUESTIONS, REGIMES, ENGINE_VERSION, MIN_SCORED_CONTROLS } from './evaluate';
import { DATA_CLASSES } from './facts';
import { LADDER } from './advisory';

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
/** Short names for the kinds of data, for tables, charts and the report (D1 carries the full wording). */
export const DATA_CLASS_LABELS: Record<string, string> = {
  personal: 'Personal', special: 'Sensitive personal', financial: 'Financial and payment', ai_training: 'AI training',
  proprietary: 'Proprietary', government: 'Government', ot_ci: 'OT and critical infrastructure'
};
for (const c of DATA_CLASSES) if (!DATA_CLASS_LABELS[c]) throw new Error(`public-schema: no short name for data class ${c}`);
/** Names for the platforms of the playbook and the placement matrix (page and report share them). */
export const PLATFORM_LABELS: Record<string, string> = {
  aws: 'AWS', azure: 'Microsoft Azure', gcp: 'Google Cloud', oci: 'Oracle Cloud', ibm: 'IBM Cloud', alibaba: 'Alibaba Cloud', other_public: 'Other public cloud',
  sovereign_cloud: 'Sovereign and partner-operated clouds', kubernetes: 'Kubernetes', on_prem: 'Data centres and colocation', saas: 'SaaS', ai_api: 'AI model APIs',
  data_platform: 'Data platform', any: 'Any platform'
};
export const LEVEL_LABELS: Record<string, string> = { L0: 'L0 No location requirement', L1: 'L1 Residency', L2: 'L2 Residency with access control and key custody', L3: 'L3 Operational sovereignty', L4: 'L4 Jurisdictional immunity or disconnected' };

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
    notices: {
      disclaimer: 'Indicative assessment from self-reported answers. Not legal advice: confirm applicability and obligations with counsel before acting.',
      caps: 'Statutory maximums are caps, not expected fines, and are never added together.',
      review: 'Internal consultant use only until the legal review (PLAN S10).'
    }
  };
}
