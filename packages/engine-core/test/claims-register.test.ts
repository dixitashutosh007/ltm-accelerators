/**
 * The claims-register checks (scripts/check-claims.cjs, run in npm run check:repo).
 * Each rule is shown to fire on a register that breaks it.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkClaims, REFERENCING_FILES, LANGUAGE_CHECKED } = require('../../../scripts/check-claims.cjs');

const good = {
  id: 'CLM-SOV-001', accelerators: ['sovereign-iq'], kind: 'date', jurisdiction: 'EU',
  statement: 'Annex III high-risk obligations apply from 2 Dec 2027.',
  source: { url: 'https://eur-lex.europa.eu/eli/reg/2024/1689', title: 'Regulation (EU) 2024/1689', article: 'Art. 113' },
  verification: 'V', checkedOn: '2026-10-14', volatile: true, clientVisible: true,
  owner: 'sovereignty-compliance-lead', lastReviewed: '2026-10-14', nextReview: '2027-01-12'
};
// Test registers are checked in isolation: the live registry files are replaced by empty ones unless a test supplies them.
const isolated = Object.fromEntries([...REFERENCING_FILES, ...LANGUAGE_CHECKED].map((f: string) => [f, '{}']));
const run = (claims: any[], extra: any = {}) => checkClaims({ today: '2026-10-14', register: { claims }, files: { ...isolated, ...extra } });
const regimes = REFERENCING_FILES[0];

describe('claims register checks', () => {
  it('the committed register passes', () => expect(checkClaims()).toEqual([]));
  it('a complete, sourced claim passes', () => expect(run([good])).toEqual([]));
  it('missing fields, unknown fields and a bad id are reported', () => {
    const { owner, ...noOwner } = good;
    expect(run([{ ...noOwner, id: 'SOV-1', colour: 'red' }]).join('\n')).toMatch(/missing owner[\s\S]*unknown field colour[\s\S]*id must match/);
  });
  it('duplicate ids are reported', () => expect(run([good, good]).join()).toMatch(/claims-duplicate/));
  it('a sourced claim needs a source URL and a checked date', () => {
    const { source, checkedOn, ...bare } = good;
    expect(run([bare]).join()).toMatch(/claims-source.*source.url[\s\S]*checkedOn/);
  });
  it('an UNSOURCED claim must be consultant-only and say what would settle it', () => {
    const { source, ...s } = good;
    expect(run([{ ...s, verification: 'UNSOURCED' }]).join()).toMatch(/clientVisible: false[\s\S]*basisNote/);
    expect(run([{ ...s, verification: 'UNSOURCED', clientVisible: false, basisNote: 'Confirm against Art. 113 on EUR-Lex.' }])).toEqual([]);
  });
  it('an overdue review fails, and volatile claims are reviewed at least every 90 days', () => {
    expect(run([{ ...good, nextReview: '2026-10-01' }]).join()).toMatch(/claims-overdue/);
    expect(run([{ ...good, nextReview: '2027-06-01' }]).join()).toMatch(/claims-volatile/);
  });
  it('a knowledge file may only refer to claims in the register', () => {
    expect(run([good], { [regimes]: '{"claims":["CLM-SOV-001","CLM-SOV-999"]}' }).join()).toMatch(/refers to CLM-SOV-999/);
  });
  it('banned overclaiming phrases fail in client-facing files', () => {
    expect(run([good], { [LANGUAGE_CHECKED[0]]: '"SCCs are legally void"' }).join()).toMatch(/banned phrase "legally void"/);
  });
});
