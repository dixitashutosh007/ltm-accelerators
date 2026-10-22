/**
 * The question set as the FinOps IQ page reads it (execution phase M3): wording, options, fact fields and each
 * question's basis, with no scoring internals (no option levels, no ask conditions, no legacy map). Which questions
 * are asked comes from the server's result (`questions.asked`), so the page holds no scoring or trigger logic.
 * Written to Accelerators/assets/finops-iq/questions.json by `npm run build:finops-iq-questions`; a test fails CI
 * when the file is out of date.
 */
import bank from './question-bank.json' with { type: 'json' };
import capabilityModel from '../registry/capabilities.json' with { type: 'json' };
import register from '../../../claims/claims-register.json' with { type: 'json' };
import { INSTRUMENTS, MARKETS, MIGRATION_STAGES, PROVIDERS, SCOPES, SECTORS } from './contract';
import valueRules from './value-rules.json' with { type: 'json' };
import { RETENTION_MONTHS } from './retention';
import { PLATFORMS } from '../../../playbook/catalogue';

const B: any = bank;
const CLAIM = new Map<string, any>((register as any).claims.map((c: any) => [c.id, c]));

const SECTOR_LABELS: Record<string, string> = {
  banking: 'Banking', insurance: 'Insurance', capital_markets: 'Capital markets', public_sector: 'Public sector',
  healthcare: 'Healthcare', retail: 'Retail', manufacturing: 'Manufacturing', telecom_media: 'Telecoms and media',
  technology_saas: 'Technology and SaaS', energy_utilities: 'Energy and utilities', professional_services: 'Professional services', other: 'Other'
};
const MARKET_LABELS: Record<string, string> = { eu: 'European Union', uk: 'United Kingdom', us: 'United States', apac: 'Asia-Pacific', other: 'Other' };
/** Currencies offered first; any ISO 4217 code is accepted. */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'SGD', 'JPY', 'CAD', 'CHF', 'AED', 'SEK', 'NOK', 'DKK', 'NZD', 'HKD'];

/** The retention period in words: notices are plain text, which carries no digits in the report (area 13(a)). */
const RETENTION_WORDS = ({ 12: 'one year', 24: 'two years', 36: 'three years' } as Record<number, string>)[RETENTION_MONTHS];
if (!RETENTION_WORDS) throw new Error(`No wording for a retention period of ${RETENTION_MONTHS} months`);

/**
 * Notices on the start screen and in the methodology panel. The attribution is the register's own statement, with the
 * links CC BY 4.0 section 3(a)(1) and the FinOps Foundation's attribution guidance ask for. The data notice and the
 * disclaimer follow the M6 legal review (design/M6-data-protection.md section 6); the owner approved them on 22 Oct 2026 (A3).
 */
export const NOTICES = {
  attribution: CLAIM.get('CLM-FIN-033').statement as string,
  attributionLinks: [
    { label: 'FinOps Framework', url: 'https://www.finops.org/framework/' },
    { label: 'FinOps Foundation', url: 'https://www.finops.org/' },
    { label: 'Creative Commons Attribution licence', url: 'https://creativecommons.org/licenses/by/4.0/' }
  ],
  disclaimer: 'FinOps IQ gives an indicative assessment based on the answers and figures you provide, which LTM has not audited or verified. Value figures are an indicative range, not a savings commitment, and need validating against your billing data before any decision. Scoring constants are LTM heuristics unless a source is cited. The assessment is for your organisation\'s internal use: any reliance on it is governed by your agreement with LTM, if there is one, and LTM accepts no responsibility to anyone else who relies on it. This is not financial, accounting, tax or legal advice.',
  data: `LTM is responsible for the information held in this assessment. It is hosted in Amazon Web Services, Mumbai region (India); if you are in the EU or UK, what you enter is transferred to India, which the EU and the UK have not recognised as giving adequate data protection. We hold your answers, your spend figures and your organisation's name, used only to produce this assessment and its report, and the consultant's email address. The assessment needs no personal details about individuals, so please do not enter any. We keep each assessment for ${RETENTION_WORDS} after its last change and then delete it automatically; ask your consultant to delete it sooner. Access logs, which record the consultant's email and network address, are kept for one year. This version uses no AI features. LTM's privacy notice explains your data protection rights and how to contact LTM's data protection team.`,
  status: 'Data notice and disclaimer approved by the product owner on 22 Oct 2026 (M6, A3), after an AI-assisted legal review; the transfer mechanism is added once LTM names it (A1).'
};

/** Playbook platforms that are not providers, by name; page and report share them, so no raw key is shown (M7 D6). */
export const PLATFORM_LABELS: Record<string, string> = {
  any: 'Any', on_prem: 'Data centre and private cloud', saas: 'SaaS and licensing', kubernetes: 'Kubernetes',
  data_platform: 'Data platform', other_public: 'Other public cloud'
};

const labelsFrom = (questionId: string) => Object.fromEntries((B.questions.find((q: any) => q.id === questionId).options as any[]).map(o => [o.value, o.label]));

function basis(q: any) {
  // Only client-visible claims; each shown with its citation and status (V verified, S secondary, LTM heuristic).
  return (q.basis ?? []).filter((b: any) => CLAIM.get(b.claimId)?.clientVisible !== false).map((b: any) => ({ citation: b.citation, status: b.status }));
}

/**
 * The questions whose answers can bring this one in (a follow-up), by id only: the page shows a follow-up beside the
 * question that triggered it. The condition itself stays on the server.
 */
function followUpOf(q: any): string[] {
  const ids = new Set<string>();
  const walk = (c: any) => {
    if (!c || typeof c !== 'object') return;
    if (typeof c.answer === 'string') ids.add(c.answer);
    for (const k of ['all', 'any']) if (Array.isArray(c[k])) c[k].forEach(walk);
  };
  walk(q.askWhen);
  return [...ids];
}

export function publicQuestionSchema() {
  const providerLabels = labelsFrom('SC-02');
  const scopeLabels = { public_cloud: 'Public cloud', ...labelsFrom('SC-03') };
  return {
    note: 'Generated from the FinOps IQ v3 question bank by npm run build:finops-iq-questions. Do not edit.',
    questionSetVersion: B.questionSetVersion as string,
    notices: NOTICES,
    /**
     * Pre-fill suggestions the consultant must confirm (F5 D-C): in the workshop, OP-06's answer suggests VB-03's
     * scheduled share through ASM-FIN-052. Nothing is set until confirmed; a confirmed value is marked as derived.
     */
    prefills: [(() => {
      const d: any = (valueRules as any).derivations.nonProdScheduledShareFromOp06;
      return { fact: d.fact, fromQuestion: d.question, byAnswer: d.byLevel, sourceFact: 'base.nonProdScheduledShareSource', sourceValue: 'derived_from_OP-06', assumptionId: d.assumptionId };
    })()],
    executiveSet: [...B.executiveSet] as string[],
    enums: {
      providers: PROVIDERS.map(v => ({ value: v, label: providerLabels[v] ?? v })),
      scopes: SCOPES.map(v => ({ value: v, label: scopeLabels[v] ?? v })),
      platforms: PLATFORMS.map(v => ({ value: v, label: PLATFORM_LABELS[v] ?? providerLabels[v] ?? v })),
      sectors: SECTORS.map(v => ({ value: v, label: SECTOR_LABELS[v] ?? v })),
      markets: MARKETS.map(v => ({ value: v, label: MARKET_LABELS[v] ?? v })),
      migrationStages: MIGRATION_STAGES,
      currencies: CURRENCIES,
      instruments: INSTRUMENTS
    },
    domains: (capabilityModel as any).domains.map((d: any) => ({ id: d.id, name: d.name })),
    capabilities: (capabilityModel as any).capabilities.map((c: any) => ({ id: c.id, displayName: c.displayName, domain: c.domain })),
    questions: (B.questions as any[]).map(q => ({
      id: q.id,
      kind: q.kind,
      modes: q.modes,
      ...(q.capability ? { capability: q.capability } : {}),
      text: q.text,
      ...(q.help ? { help: q.help } : {}),
      ...(followUpOf(q).length ? { followUpOf: followUpOf(q) } : {}),
      answerType: q.answerType,
      ...(q.options ? { options: q.options.map((o: any) => ({ value: o.value, label: o.label, ...(o.sets ? { sets: o.sets } : {}) })) } : {}),
      ...(q.fields ? { fields: q.fields.map((f: any) => ({ ...f, ...(f.options ? { options: f.options.map((o: any) => ({ value: o.value, label: o.label, ...(o.sets ? { sets: o.sets } : {}) })) } : {}) })) } : {}),
      basis: basis(q)
    }))
  };
}
