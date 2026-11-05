/**
 * The coverage statement every report carries (platform workstream: global coverage): which jurisdictions the report
 * assesses and which it does not, so a client with operations elsewhere sees the edge of the report and is told to take
 * local advice. The assessed set is derived from each accelerator's own registry, so the statement cannot drift from what
 * the engine actually does. No digits appear in the text, as the report checks require.
 */
import type { Block } from './model';

/** The markets LTM names when it states coverage. A market is "not assessed" until an accelerator's registry holds it. */
export const MARKETS = [
  { id: 'eu', name: 'the European Union' },
  { id: 'uk', name: 'the United Kingdom' },
  { id: 'ch', name: 'Switzerland' },
  { id: 'us', name: 'the United States' },
  { id: 'ca', name: 'Canada' },
  { id: 'in', name: 'India' },
  { id: 'sg', name: 'Singapore' },
  { id: 'hk', name: 'Hong Kong' },
  { id: 'jp', name: 'Japan' },
  { id: 'kr', name: 'South Korea' },
  { id: 'cn', name: 'mainland China' },
  { id: 'au', name: 'Australia' },
  { id: 'nz', name: 'New Zealand' },
  { id: 'gcc', name: 'the Gulf Cooperation Council states' },
  { id: 'latam', name: 'Brazil and the rest of Latin America' },
  { id: 'za', name: 'South Africa' }
] as const;
export type MarketId = typeof MARKETS[number]['id'];

const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** A registry's jurisdiction code (Sovereign IQ uses codes such as us_ca, fr, de) to the market it belongs to. */
export function marketOf(code: string): MarketId | undefined {
  const c = code.toLowerCase();
  if (c === 'fr' || c === 'de' || c === 'eu') return 'eu';
  if (c.startsWith('us')) return 'us';
  return (MARKETS as readonly { id: string }[]).some(m => m.id === c) ? (c as MarketId) : undefined;
}

/** For an accelerator that applies regulation: what it assessed and what it did not. */
export function jurisdictionCoverage(assessed: Iterable<MarketId>, subject: string): Block {
  const have = new Set(assessed);
  const yes = MARKETS.filter(m => have.has(m.id)).map(m => m.name);
  const no = MARKETS.filter(m => !have.has(m.id)).map(m => m.name);
  return { kind: 'callout', tone: 'info', title: 'Jurisdictional coverage', segs: [
    yes.length ? `${subject} covers ${list(yes)}. ` : `${subject} does not cover any jurisdiction's obligations in this edition. `,
    no.length ? `It does not cover ${list(no)}. ` : '',
    'If the organisation operates in, or serves customers in, a jurisdiction that is not covered, the obligations there are outside this report and local legal advice is needed. Coverage is stated as in the version of the regulation registry named under Methodology.'
  ] };
}

/** For an accelerator with no jurisdiction-specific content (cost and value work). */
export function noRegulatoryCoverage(subject: string): Block {
  return { kind: 'callout', tone: 'info', title: 'Jurisdictional coverage', segs: [
    `${subject} does not assess legal, tax or regulatory obligations in any jurisdiction. `,
    'Published figures used for value ranges are the global or regional averages named under Sources, not benchmarks for the client\'s own country. Prices, discounts and commitment terms vary by provider, region and contract, and any difference for the client\'s markets is outside this report.'
  ] };
}
