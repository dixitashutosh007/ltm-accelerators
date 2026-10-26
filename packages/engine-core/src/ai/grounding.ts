/**
 * Grounding check for AI narrative (shared workstream WS-S1; FRAMEWORK.md area 10). AI may only re-word what the engine
 * produced: every number, date, regulation and provider in the text must appear in the input the model was given, and
 * no legal conclusion, provider recommendation or sales phrase is allowed. Text that fails is rejected, never shown.
 * Pure and deterministic, so the same check runs in the service, in CI and in the eval.
 */

export interface GroundingAllow {
  /** Every numeric value that appears in the input (as numbers, inside strings, in labels such as "SEAL-2"). */
  numbers: Set<number>;
  /** Regulation names and aliases the input contains (in scope for this client). */
  regimes: Set<string>;
  /** Provider and product names the input contains. */
  providers: Set<string>;
}

export interface Lexicon {
  /** Every regulation name and alias the accelerator knows, so a mention of one not in the input is caught. */
  regimes: string[];
  /** Every provider or product name the check knows. */
  providers: string[];
}

export interface Violation { kind: 'number' | 'regime' | 'provider' | 'phrase'; text: string; where: string }

/** Provider and product names (a mention outside the input is a violation; the list grows with the playbook). */
export const PROVIDER_NAMES = [
  'AWS', 'Amazon', 'Azure', 'Microsoft', 'Google', 'Oracle', 'IBM', 'Alibaba', 'Huawei', 'Tencent', 'OVHcloud', 'OVH', 'STACKIT',
  'Scaleway', 'S3NS', 'PREMI3NS', 'Bleu', 'Delos', 'Thales', 'T-Systems', 'Telekom', 'IONOS', 'Open Telekom Cloud', 'Orange',
  'Capgemini', 'SAP', 'Proximus', 'Post Telecom', 'CleverCloud', 'Salesforce', 'Workday', 'ServiceNow', 'Snowflake', 'Databricks',
  'OpenAI', 'Anthropic', 'Mistral', 'GovCloud'
];

/** Phrases AI text may never contain: legal conclusions, ratings of the client or providers, and sales language. */
export const FORBIDDEN_PHRASES: RegExp[] = [
  /\b(you are|you're|the (client|organisation|organization|company) is|is|are) (now |fully |not )?(compliant|non-compliant|in breach|in violation|lawful|unlawful)\b/i,
  /\b(fully|100%|completely) compliant\b/i, /\bwill be fined\b/i, /\blegally (obliged|required|bound|compliant)\b/i, /\bthis is legal advice\b/i,
  /\bguarantee[sd]?\b/i, /\bbest\b/i, /\bleading\b/i, /\bpremier\b/i, /\bunmatched\b/i, /\bworld[- ]class\b/i, /partner of choice/i,
  /\bcheapest\b/i, /\bdiscount/i, /\b(we|LTM) (recommend|suggest|advise) (using |choosing |moving to )?(AWS|Azure|Google|Microsoft|Oracle|IBM|OVHcloud|STACKIT|Scaleway|S3NS|Bleu|Delos)\b/i,
  /\byou are SEAL\b/i, /\bSEAL-certified\b/i, /\bcertified at SEAL\b/i, /\byour SEAL (level )?is\b/i
];

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const toNumber = (s: string) => Number(s.replace(/,/g, ''));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text: string, name: string) => new RegExp(`(^|[^A-Za-z0-9])${escape(name)}([^A-Za-z0-9]|$)`).test(text);

/** Every string and number in a value, depth first. */
export function leaves(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'number' && Number.isFinite(v)) out.push(String(v));
  else if (Array.isArray(v)) v.forEach(x => leaves(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => leaves(x, out));
  return out;
}

/** What the input allows: its numbers, and the regulations and providers of the lexicon it mentions. */
export function allowFrom(input: unknown, lexicon: Lexicon): GroundingAllow {
  const text = leaves(input).join('\n');
  const numbers = new Set<number>((text.match(NUMBER) ?? []).map(toNumber));
  return {
    numbers,
    regimes: new Set(lexicon.regimes.filter(r => mentions(text, r))),
    providers: new Set(lexicon.providers.filter(p => mentions(text, p)))
  };
}

/** The violations in one piece of AI text; `where` names the field for the report. */
export function checkText(text: string, allow: GroundingAllow, lexicon: Lexicon, where: string): Violation[] {
  const out: Violation[] = [];
  for (const m of text.match(NUMBER) ?? []) if (!allow.numbers.has(toNumber(m))) out.push({ kind: 'number', text: m, where });
  for (const r of lexicon.regimes) if (!allow.regimes.has(r) && mentions(text, r)) out.push({ kind: 'regime', text: r, where });
  for (const p of lexicon.providers) if (!allow.providers.has(p) && mentions(text, p)) out.push({ kind: 'provider', text: p, where });
  for (const re of FORBIDDEN_PHRASES) { const m = text.match(re); if (m) out.push({ kind: 'phrase', text: m[0], where }); }
  return out;
}

/** The violations across every string field of a structured AI output. */
export function checkOutput(output: Record<string, string | string[]>, allow: GroundingAllow, lexicon: Lexicon): Violation[] {
  return Object.entries(output).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((s, i) => checkText(s, allow, lexicon, `${k}[${i}]`)) : checkText(v, allow, lexicon, k)));
}

/** Removes the client's name and e-mail addresses from free text before it reaches a model (S9 item 3). */
export function redact(text: string, names: string[]): string {
  let out = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
  for (const n of names.map(x => x.trim()).filter(x => x.length >= 2)) out = out.replace(new RegExp(escape(n), 'gi'), '[client]');
  return out;
}
