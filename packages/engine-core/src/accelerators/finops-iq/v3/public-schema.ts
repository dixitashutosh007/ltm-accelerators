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
 * Notices on the start screen and in the methodology panel. The attribution is the register's own statement; the
 * data notice is the validation report's recommended wording (section 7), adapted to v1 (no AI, no file upload).
 * Both the data notice and the disclaimer wait for owner and counsel approval in M6.
 */
export const NOTICES = {
  attribution: CLAIM.get('CLM-FIN-033').statement as string,
  disclaimer: 'FinOps IQ gives an indicative assessment from the answers and figures you provide. Value figures are an indicative range, not a savings commitment, and need validating against your billing data before any decision. Scoring constants are LTM heuristics unless a source is cited. This is not financial, accounting or legal advice.',
  data: `LTM hosts this assessment in Amazon Web Services, Mumbai region (India). If you are in the EU or UK, the information you enter is transferred to India, which does not have an EU adequacy decision or a UK data bridge. We collect your answers, your spend figures, your organisation's name and the consultant's email address to produce the report. We keep each assessment for ${RETENTION_WORDS} after its last change and then delete it automatically; ask your consultant to delete it sooner. This version uses no AI features.`,
  status: 'Draft wording pending owner and counsel approval (execution phase M6).'
};

const labelsFrom = (questionId: string) => Object.fromEntries((B.questions.find((q: any) => q.id === questionId).options as any[]).map(o => [o.value, o.label]));

function basis(q: any) {
  // Only client-visible claims; each shown with its citation and status (V verified, S secondary, LTM heuristic).
  return (q.basis ?? []).filter((b: any) => CLAIM.get(b.claimId)?.clientVisible !== false).map((b: any) => ({ citation: b.citation, status: b.status }));
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
      answerType: q.answerType,
      ...(q.options ? { options: q.options.map((o: any) => ({ value: o.value, label: o.label, ...(o.sets ? { sets: o.sets } : {}) })) } : {}),
      ...(q.fields ? { fields: q.fields.map((f: any) => ({ ...f, ...(f.options ? { options: f.options.map((o: any) => ({ value: o.value, label: o.label, ...(o.sets ? { sets: o.sets } : {}) })) } : {}) })) } : {}),
      basis: basis(q)
    }))
  };
}
