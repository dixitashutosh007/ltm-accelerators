/**
 * Request contract for FinOps IQ v3 (both modes), shared by the future Lambda route (F6) and the tests.
 * Scope and value-base questions are answered through `facts` (shape: design/facts.schema.json); `answers` holds
 * maturity and hypothesis answers as option values. Blank = key absent. There is no "not applicable" answer:
 * N/A comes only from scope facts (D5).
 */
import bank from './question-bank.json' with { type: 'json' };
import capabilityModel from '../registry/capabilities.json' with { type: 'json' };
import { LEVELS, type FinOpsIqV3Input, type Mode } from './evaluate';

export type FinOpsIqV3ParseResult = { ok: true; value: FinOpsIqV3Input } | { ok: false; errors: string[] };

const BANK: any = bank;
const QUESTION = new Map<string, any>(BANK.questions.map((q: any) => [q.id, q]));
const CAPABILITY_IDS = new Set<string>((capabilityModel as any).capabilities.map((c: any) => c.id));

export const PROVIDERS = ['aws', 'azure', 'gcp', 'oci', 'ibm', 'alibaba', 'other_public'];
export const SCOPES = ['public_cloud', 'private_cloud', 'data_centre', 'colocation', 'kubernetes', 'ai_api', 'ai_platform_gpu', 'saas', 'licensing', 'data_cloud_platform'];
const SECTORS = ['banking', 'insurance', 'capital_markets', 'public_sector', 'healthcare', 'retail', 'manufacturing', 'telecom_media', 'technology_saas', 'energy_utilities', 'professional_services', 'other'];
const MARKETS = ['eu', 'uk', 'us', 'apac', 'other'];
const UNITS = ['1', '2-4', '5-19', '20+', 'unknown'];
const MIXES = ['on_premises_only', 'mostly_dc', 'balanced_hybrid', 'mostly_cloud', 'cloud_native', 'unknown'];
const MIGRATION_STAGES = ['planning', 'early', 'in_flight', 'largely', 'complete', 'unknown'];
const SHARE_FACTS = ['computeShare', 'steadyStateShare', 'eligibleCoverage', 'nonProdShare', 'nonProdScheduledShare', 'interruptionTolerantShare', 'spotShare', 'storageShare', 'coldDataShare', 'dataTransferShare', 'kubernetesRequestUtilisation'];
const RECOMMENDATION_TYPES = ['rightsizing', 'modernisation', 'idle', 'storage', 'commitments', 'other'];
/** Main commitment instrument per provider (VB-02, F4 review M6). */
const INSTRUMENTS: Record<string, string[]> = { aws: ['ec2_instance_sp_or_ri', 'compute_sp'], azure: ['reservations', 'savings_plan'], gcp: ['resource_cud', 'memory_optimised_cud'] };

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const list = (a: readonly string[]) => a.join(', ');

type Errors = string[];

function checkKeys(o: Record<string, any>, allowed: string[], path: string, errors: Errors) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push(`${path}.${k}: unknown field`);
}

function checkEnumList(v: unknown, allowed: string[], path: string, errors: Errors) {
  if (!Array.isArray(v) || v.some(x => !allowed.includes(x)) || new Set(v).size !== v.length) {
    errors.push(`${path}: expected a list without repeats from ${list(allowed)}`);
  }
}

/** An amount (max undefined) or a share (max 1): { exact }, { band: [low, high] } or { unknown: true }. */
function checkAmount(v: unknown, path: string, errors: Errors, max?: number) {
  const what = max === undefined ? 'an amount of 0 or more' : 'a share from 0 to 1';
  const ok = (n: unknown) => isNumber(n) && n >= 0 && (max === undefined || n <= max);
  if (!isObject(v)) { errors.push(`${path}: expected { exact }, { band: [low, high] } or { unknown: true }`); return; }
  const keys = Object.keys(v);
  if (keys.length !== 1) errors.push(`${path}: expected exactly one of exact, band or unknown`);
  else if ('exact' in v) { if (!ok(v.exact)) errors.push(`${path}.exact: expected ${what}`); }
  else if ('band' in v) {
    if (!Array.isArray(v.band) || v.band.length !== 2 || !ok(v.band[0]) || !ok(v.band[1]) || v.band[0] > v.band[1]) {
      errors.push(`${path}.band: expected [low, high] with low <= high, each ${what}`);
    }
  } else if ('unknown' in v) { if (v.unknown !== true) errors.push(`${path}.unknown: expected true`); }
  else errors.push(`${path}: expected exactly one of exact, band or unknown`);
}

function checkFacts(f: unknown, errors: Errors) {
  if (!isObject(f)) { errors.push('facts: expected an object with org, footprint and spend'); return; }
  checkKeys(f, ['org', 'footprint', 'spend', 'base', 'evidence', 'cost', 'consultant'], 'facts', errors);

  const org = f.org;
  if (!isObject(org)) errors.push('facts.org: expected an object with currency');
  else {
    checkKeys(org, ['sector', 'markets', 'consumingUnits', 'currency', 'tierFxRate'], 'facts.org', errors);
    if (typeof org.currency !== 'string' || !/^[A-Z]{3}$/.test(org.currency)) errors.push('facts.org.currency: expected an ISO 4217 code such as USD');
    if (org.sector !== undefined && !SECTORS.includes(org.sector)) errors.push(`facts.org.sector: expected one of ${list(SECTORS)}`);
    if (org.markets !== undefined) checkEnumList(org.markets, MARKETS, 'facts.org.markets', errors);
    if (org.consumingUnits !== undefined && !UNITS.includes(org.consumingUnits)) errors.push(`facts.org.consumingUnits: expected one of ${list(UNITS)}`);
    if (org.tierFxRate !== undefined && !(isNumber(org.tierFxRate) && org.tierFxRate > 0)) errors.push('facts.org.tierFxRate: expected a number above 0 (USD per unit of currency)');
  }

  const fp = f.footprint;
  if (!isObject(fp)) errors.push('facts.footprint: expected an object with publicCloudProviders and scopes');
  else {
    checkKeys(fp, ['infrastructureMix', 'publicCloudProviders', 'scopes', 'gpuInsideKubernetes', 'migration'], 'facts.footprint', errors);
    checkEnumList(fp.publicCloudProviders, PROVIDERS, 'facts.footprint.publicCloudProviders', errors);
    checkEnumList(fp.scopes, SCOPES, 'facts.footprint.scopes', errors);
    if (fp.infrastructureMix !== undefined && !MIXES.includes(fp.infrastructureMix)) errors.push(`facts.footprint.infrastructureMix: expected one of ${list(MIXES)}`);
    if (fp.gpuInsideKubernetes !== undefined && typeof fp.gpuInsideKubernetes !== 'boolean') errors.push('facts.footprint.gpuInsideKubernetes: expected true or false');
    if (fp.migration !== undefined) {
      if (!isObject(fp.migration)) errors.push('facts.footprint.migration: expected an object');
      else {
        checkKeys(fp.migration, ['stage', 'remainingShare24m'], 'facts.footprint.migration', errors);
        if (fp.migration.stage !== undefined && !MIGRATION_STAGES.includes(fp.migration.stage)) errors.push(`facts.footprint.migration.stage: expected one of ${list(MIGRATION_STAGES)}`);
        if (fp.migration.remainingShare24m !== undefined) checkAmount(fp.migration.remainingShare24m, 'facts.footprint.migration.remainingShare24m', errors, 1);
      }
    }
  }

  const spend = f.spend;
  if (!isObject(spend) || !isObject(spend.byScope)) errors.push('facts.spend: expected an object with byScope');
  else {
    checkKeys(spend, ['byScope', 'growth12m'], 'facts.spend', errors);
    for (const [k, v] of Object.entries(spend.byScope)) {
      if (!PROVIDERS.includes(k) && !SCOPES.includes(k)) errors.push(`facts.spend.byScope.${k}: expected a provider (${list(PROVIDERS)}) or a scope`);
      else checkAmount(v, `facts.spend.byScope.${k}`, errors);
    }
    const g = spend.growth12m;
    if (g !== undefined && g !== 'unknown' && !(isNumber(g) && g >= -25 && g <= 200)) errors.push('facts.spend.growth12m: expected a percent from -25 to 200, or "unknown"');
  }

  if (f.base !== undefined) {
    if (!isObject(f.base)) errors.push('facts.base: expected an object');
    else {
      checkKeys(f.base, [...SHARE_FACTS, 'kubernetesSpend', 'nonProdScheduledShareSource', 'commitmentInstrument'], 'facts.base', errors);
      const ci = f.base.commitmentInstrument;
      if (ci !== undefined) {
        if (!isObject(ci)) errors.push('facts.base.commitmentInstrument: expected an object by provider');
        else for (const [k, v] of Object.entries(ci)) {
          const allowed = INSTRUMENTS[k];
          if (!allowed) errors.push(`facts.base.commitmentInstrument.${k}: expected one of ${list(Object.keys(INSTRUMENTS))}`);
          else if (!allowed.includes(v as string)) errors.push(`facts.base.commitmentInstrument.${k}: expected one of ${list(allowed)}`);
        }
      }
      for (const k of SHARE_FACTS) if (f.base[k] !== undefined) checkAmount(f.base[k], `facts.base.${k}`, errors, 1);
      if (f.base.kubernetesSpend !== undefined) checkAmount(f.base.kubernetesSpend, 'facts.base.kubernetesSpend', errors);
      const src = f.base.nonProdScheduledShareSource;
      if (src !== undefined && src !== 'answer' && src !== 'derived_from_OP-06') errors.push('facts.base.nonProdScheduledShareSource: expected "answer" or "derived_from_OP-06"');
    }
  }

  if (f.evidence !== undefined) checkEvidence(f.evidence, errors);

  if (f.cost !== undefined) {
    if (!isObject(f.cost)) errors.push('facts.cost: expected an object');
    else {
      checkKeys(f.cost, ['internalRate', 'tooling'], 'facts.cost', errors);
      for (const k of ['internalRate', 'tooling']) if (f.cost[k] !== undefined) checkAmount(f.cost[k], `facts.cost.${k}`, errors);
    }
  }

  if (f.consultant !== undefined) {
    if (!isObject(f.consultant)) errors.push('facts.consultant: expected an object');
    else {
      checkKeys(f.consultant, ['complexityTierOverride', 'overrideReason'], 'facts.consultant', errors);
      const t = f.consultant.complexityTierOverride;
      if (t !== undefined && ![1, 2, 3].includes(t)) errors.push('facts.consultant.complexityTierOverride: expected 1, 2 or 3');
      if (f.consultant.overrideReason !== undefined && !shortText(f.consultant.overrideReason, 500)) errors.push('facts.consultant.overrideReason: expected text up to 500 characters');
    }
  }

  // The complexity tier converts spend to USD only with a consultant-confirmed rate (D9: never in value figures).
  if (isObject(org) && org.currency !== 'USD' && org.tierFxRate === undefined && isObject(spend) && isObject(spend.byScope) &&
      Object.values(spend.byScope).some((a: any) => isObject(a) && !('unknown' in a))) {
    errors.push('facts.org.tierFxRate: required when spend is given in a currency other than USD (used only for the complexity tier)');
  }
}

function checkEvidence(e: unknown, errors: Errors) {
  if (!isObject(e)) { errors.push('facts.evidence: expected an object'); return; }
  checkKeys(e, ['providerRecommendations', 'saasLicence', 'aiGpu', 'billingData'], 'facts.evidence', errors);
  if (e.providerRecommendations !== undefined) {
    if (!Array.isArray(e.providerRecommendations)) errors.push('facts.evidence.providerRecommendations: expected a list');
    else e.providerRecommendations.forEach((r: any, i: number) => {
      const p = `facts.evidence.providerRecommendations[${i}]`;
      if (!isObject(r)) { errors.push(`${p}: expected an object`); return; }
      checkKeys(r, ['type', 'provider', 'tool', 'deduplicated', 'annualEstimate', 'exportDate'], p, errors);
      if (!RECOMMENDATION_TYPES.includes(r.type)) errors.push(`${p}.type: expected one of ${list(RECOMMENDATION_TYPES)}`);
      if (r.provider !== undefined && !PROVIDERS.includes(r.provider)) errors.push(`${p}.provider: expected one of ${list(PROVIDERS)}`);
      if (!shortText(r.tool, 200) || !r.tool) errors.push(`${p}.tool: expected the tool name`);
      if (r.deduplicated !== undefined && typeof r.deduplicated !== 'boolean') errors.push(`${p}.deduplicated: expected true or false`);
      if (!(isNumber(r.annualEstimate) && r.annualEstimate >= 0)) errors.push(`${p}.annualEstimate: expected an amount of 0 or more`);
      if (!isDate(r.exportDate)) errors.push(`${p}.exportDate: expected a date YYYY-MM-DD`);
    });
  }
  if (e.saasLicence !== undefined) {
    const s = e.saasLicence, p = 'facts.evidence.saasLicence';
    if (!isObject(s)) errors.push(`${p}: expected an object`);
    else {
      checkKeys(s, ['unusedAnnualCost', 'source', 'measuredOn', 'renewingYear1Share'], p, errors);
      if (!(isNumber(s.unusedAnnualCost) && s.unusedAnnualCost >= 0)) errors.push(`${p}.unusedAnnualCost: expected an amount of 0 or more`);
      if (!shortText(s.source, 500) || !s.source) errors.push(`${p}.source: expected where the figure comes from`);
      if (!isDate(s.measuredOn)) errors.push(`${p}.measuredOn: expected a date YYYY-MM-DD`);
      if (s.renewingYear1Share !== undefined) checkAmount(s.renewingYear1Share, `${p}.renewingYear1Share`, errors, 1);
    }
  }
  if (e.aiGpu !== undefined) {
    const a = e.aiGpu, p = 'facts.evidence.aiGpu';
    if (!isObject(a)) errors.push(`${p}: expected an object`);
    else {
      checkKeys(a, ['gpuSpend', 'gpuUtilisation', 'idleEndpointSpend', 'aiApiSpend'], p, errors);
      for (const k of ['gpuSpend', 'idleEndpointSpend', 'aiApiSpend']) if (a[k] !== undefined) checkAmount(a[k], `${p}.${k}`, errors);
      if (a.gpuUtilisation !== undefined) checkAmount(a.gpuUtilisation, `${p}.gpuUtilisation`, errors, 1);
    }
  }
  if (e.billingData !== undefined) {
    const b = e.billingData, p = 'facts.evidence.billingData';
    if (!isObject(b)) errors.push(`${p}: expected an object`);
    else {
      checkKeys(b, ['format', 'focusVersion', 'periodFrom', 'periodTo'], p, errors);
      if (b.format !== undefined && b.format !== 'focus' && b.format !== 'provider_native') errors.push(`${p}.format: expected "focus" or "provider_native"`);
      for (const k of ['periodFrom', 'periodTo']) if (b[k] !== undefined && !isDate(b[k])) errors.push(`${p}.${k}: expected a date YYYY-MM-DD`);
      if (b.focusVersion !== undefined && !shortText(b.focusVersion, 20)) errors.push(`${p}.focusVersion: expected a short version string`);
    }
  }
}

/** Returns why an answer is invalid for the question, or null if it is valid. */
function answerError(q: any, a: unknown): string | null {
  const values = (q.options ?? []).map((o: any) => o.value);
  switch (q.answerType) {
    case 'single_select':
      return typeof a === 'string' && values.includes(a) ? null : `expected one of ${list(values)}`;
    case 'multi_select': {
      const items = (q.options ?? []).filter((o: any) => !o.level).map((o: any) => o.value);
      if (q.kind === 'maturity' && a === 'unknown') return null;
      const ok = Array.isArray(a) && a.every(v => items.includes(v)) && new Set(a).size === a.length;
      return ok ? null : `expected a list without repeats from ${list(items)}${q.kind === 'maturity' ? ', or "unknown"' : ''}`;
    }
    case 'rank': {
      const ok = Array.isArray(a) && a.length > 0 && a.every(v => values.includes(v)) && new Set(a).size === a.length;
      return ok ? null : `expected an ordered list without repeats from ${list(values)}`;
    }
    case 'allocation_100': {
      if (!isObject(a)) return `expected an object of points by ${list(values)}`;
      const ok = Object.entries(a).every(([k, v]) => values.includes(k) && isNumber(v) && v >= 0 && v <= 100);
      return ok ? null : `expected points from 0 to 100 for ${list(values)}`;
    }
    case 'open_text':
      return shortText(a, 5000) ? null : 'expected text up to 5000 characters';
    default:
      return `unsupported answer type ${q.answerType}`;
  }
}

function checkQuestionList(v: unknown, path: string, errors: Errors) {
  if (v === undefined) return;
  if (!Array.isArray(v) || v.some(id => !QUESTION.has(id))) errors.push(`${path}: expected a list of question ids`);
}

export function parseFinOpsIqV3Request(body: unknown): FinOpsIqV3ParseResult {
  const b = (isObject(body) ? body : {}) as Record<string, any>;
  const errors: Errors = [];
  const mode = b.mode as Mode;
  if (mode !== 'executive' && mode !== 'workshop') errors.push('mode: expected "executive" or "workshop"');
  checkFacts(b.facts, errors);

  const answers = b.answers;
  if (!isObject(answers)) errors.push('"answers" must be an object keyed by question id');
  else {
    for (const [id, a] of Object.entries(answers)) {
      const q = QUESTION.get(id);
      if (!q) { errors.push(`answers.${id}: unknown question`); continue; }
      if (q.kind === 'scope' || q.kind === 'value_base') { errors.push(`answers.${id}: answered through facts (${(q.sets ?? []).join(', ')}), not answers`); continue; }
      if ((mode === 'executive' || mode === 'workshop') && !q.modes.includes(mode)) { errors.push(`answers.${id}: not part of the ${mode} question set`); continue; }
      if (a === undefined || a === null) continue;
      const err = answerError(q, a);
      if (err) errors.push(`answers.${id}: ${err}`);
    }
  }

  if (b.assessmentDate !== undefined && !isDate(b.assessmentDate)) errors.push('assessmentDate: expected a date YYYY-MM-DD');
  if (b.targetOverrides !== undefined) {
    if (!Array.isArray(b.targetOverrides)) errors.push('targetOverrides: expected a list');
    else b.targetOverrides.forEach((o: any, i: number) => {
      const p = `targetOverrides[${i}]`;
      if (!isObject(o)) { errors.push(`${p}: expected an object`); return; }
      if (!CAPABILITY_IDS.has(o.capability)) errors.push(`${p}.capability: unknown capability`);
      if (!(LEVELS as string[]).includes(o.level)) errors.push(`${p}.level: expected one of ${list(LEVELS)}`);
      if (typeof o.reason !== 'string' || o.reason.trim().length < 10 || o.reason.length > 500) errors.push(`${p}.reason: expected a recorded reason of 10 to 500 characters`);
      if (isObject(o) && b.targetOverrides.slice(0, i).some((x: any) => isObject(x) && x.capability === o.capability)) errors.push(`${p}.capability: ${o.capability} already has a target override`);
    });
  }
  checkQuestionList(b.prefilled, 'prefilled', errors);
  checkQuestionList(b.prefillConfirmed, 'prefillConfirmed', errors);

  if (errors.length) return { ok: false, errors };
  const value: FinOpsIqV3Input = { mode, facts: b.facts, answers };
  if (b.assessmentDate !== undefined) value.assessmentDate = b.assessmentDate;
  if (b.targetOverrides !== undefined) value.targetOverrides = b.targetOverrides;
  if (b.prefilled !== undefined) value.prefilled = b.prefilled;
  if (b.prefillConfirmed !== undefined) value.prefillConfirmed = b.prefillConfirmed;
  return { ok: true, value };
}
