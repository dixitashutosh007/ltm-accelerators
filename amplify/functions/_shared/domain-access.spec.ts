/**
 * Domain access rules (platform workstream P1): precedence, validation and, above all, that no change and no
 * state of the rule list can lock out a protected address or the administrator making a change.
 */
import { describe, it, expect } from 'vitest';
import { applyChange, assertNoLockout, configFromEnv, decide, DomainRuleError, emptyRules, MAX_RULES, refusalMessage, type DomainRulesDocument } from './domain-access.mjs';

const cfg = configFromEnv({
  PROTECTED_DOMAINS: 'ltm.com', SUPER_ADMIN_EMAILS: 'owner@home.example,boss@ltm.com',
  ALLOWED_DOMAINS: 'ltm.com,ey.com', ALLOWED_EMAILS: 'owner@home.example,friend@home.example'
});
let n = 0;
const ctx = (by: string) => ({ by, now: '2026-11-03T10:00:00.000Z', id: () => `r${++n}` });
const set = (doc: DomainRulesDocument, kind: 'domain' | 'email', value: string, action: 'allow' | 'block', by = 'boss@ltm.com') =>
  applyChange(doc, { op: 'set', kind, value, action }, cfg, ctx(by)).doc;
const code = (fn: () => unknown) => { try { fn(); return null; } catch (e: any) { return e instanceof DomainRuleError ? e.code : `other:${e.message}`; } };

describe('configuration', () => {
  it('reads protected and baseline entries from the environment; "none" is empty; ltm.com is protected by default', () => {
    expect(cfg.protectedEmails).toEqual(['owner@home.example', 'boss@ltm.com']);
    expect(configFromEnv({ SUPER_ADMIN_EMAILS: 'none' }).protectedEmails).toEqual([]);
    expect(configFromEnv({}).protectedDomains).toEqual(['ltm.com']);
  });
});

describe('decisions', () => {
  const none = emptyRules();
  it('baseline entries are allowed; everyone else is refused', () => {
    expect(decide('a@ey.com', none, cfg)).toMatchObject({ allowed: true, reason: 'baseline_domain' });
    expect(decide('friend@home.example', none, cfg)).toMatchObject({ allowed: true, reason: 'baseline_email' });
    expect(decide('x@other.com', none, cfg)).toMatchObject({ allowed: false, reason: 'not_listed' });
    expect(decide('x@in.ey.com', none, cfg).allowed).toBe(false); // exact domains only
  });
  it('a rule can allow a new domain or block a baseline one', () => {
    expect(decide('a@partner.com', set(none, 'domain', 'partner.com', 'allow'), cfg)).toMatchObject({ allowed: true, reason: 'domain_allowed' });
    expect(decide('a@ey.com', set(none, 'domain', 'ey.com', 'block'), cfg)).toMatchObject({ allowed: false, reason: 'domain_blocked' });
  });
  it('an email rule overrides its domain, in both directions', () => {
    const blockedDomain = set(set(none, 'domain', 'ey.com', 'block'), 'email', 'vip@ey.com', 'allow');
    expect(decide('vip@ey.com', blockedDomain, cfg)).toMatchObject({ allowed: true, reason: 'email_allowed' });
    expect(decide('other@ey.com', blockedDomain, cfg).allowed).toBe(false);
    const allowedDomain = set(none, 'email', 'bad@ey.com', 'block');
    expect(decide('bad@ey.com', allowedDomain, cfg)).toMatchObject({ allowed: false, reason: 'email_blocked' });
    expect(decide('good@ey.com', allowedDomain, cfg).allowed).toBe(true);
  });
  it('a block beats an allow at the same level, even if the document holds both', () => {
    const both: DomainRulesDocument = { version: 1, rules: [
      { id: 'a', kind: 'domain', value: 'x.com', action: 'allow', addedBy: 'b', addedAt: 't' },
      { id: 'b', kind: 'domain', value: 'x.com', action: 'block', addedBy: 'b', addedAt: 't' }
    ] };
    expect(decide('u@x.com', both, cfg).allowed).toBe(false);
  });
  it('matching ignores case and surrounding spaces; an address that is not an address is refused', () => {
    expect(decide('  A@EY.COM ', none, cfg).allowed).toBe(true);
    for (const bad of ['', 'nobody', '@ltm.com', 'a@b', undefined, null, 12]) expect(decide(bad, none, cfg), String(bad)).toMatchObject({ allowed: false, reason: 'invalid_email' });
  });
  it('the refusal message differs for an unreadable list', () => {
    expect(refusalMessage({ reason: 'rules_unavailable' })).toContain('try again');
    expect(refusalMessage({ reason: 'not_listed' }, 'the owner')).toContain('the owner');
  });
});

describe('protected addresses can never be locked out', () => {
  it('are allowed whatever the rules say, including malformed documents', () => {
    const hostile: any[] = [
      emptyRules(), null, undefined, {}, { rules: 'x' }, { rules: [null, 1, 'a', {}] },
      { rules: [{ kind: 'domain', value: 'ltm.com', action: 'block' }, { kind: 'email', value: 'boss@ltm.com', action: 'block' }, { kind: 'email', value: 'owner@home.example', action: 'block' }, { kind: 'domain', value: 'home.example', action: 'block' }] }
    ];
    for (const doc of hostile) {
      expect(decide('boss@ltm.com', doc, cfg).allowed).toBe(true);
      expect(decide('owner@home.example', doc, cfg).allowed).toBe(true);
      expect(decide('anyone@ltm.com', doc, cfg).allowed).toBe(true);
    }
  });
  it('a change cannot block a protected domain or address', () => {
    expect(code(() => set(emptyRules(), 'domain', 'ltm.com', 'block'))).toBe('protected_domain');
    expect(code(() => set(emptyRules(), 'domain', ' @LTM.com ', 'block'))).toBe('protected_domain');
    expect(code(() => set(emptyRules(), 'email', 'owner@home.example', 'block'))).toBe('protected_email');
    expect(code(() => set(emptyRules(), 'email', 'someone@ltm.com', 'block'))).toBe('protected_email');
  });
  it('blocking a whole domain that holds a protected address is allowed, because the address stays protected', () => {
    const doc = set(emptyRules(), 'domain', 'home.example', 'block');
    expect(decide('owner@home.example', doc, cfg).allowed).toBe(true);
    expect(decide('friend@home.example', doc, cfg).allowed).toBe(true); // an email baseline entry overrides its blocked domain
    expect(decide('stranger@home.example', doc, cfg).allowed).toBe(false);
  });
  it('the assertion is a second line of defence for the acting administrator', () => {
    const blocksAdmin: DomainRulesDocument = { version: 1, rules: [{ id: 'z', kind: 'domain', value: 'ey.com', action: 'block', addedBy: 'b', addedAt: 't' }] };
    expect(() => assertNoLockout(blocksAdmin, cfg, 'boss@ltm.com')).not.toThrow();
    expect(() => assertNoLockout(blocksAdmin, cfg, 'admin@ey.com')).toThrow(DomainRuleError);
    expect(() => assertNoLockout(blocksAdmin, cfg, undefined)).not.toThrow();
  });
});

describe('the administrator making a change', () => {
  const admin = 'admin@ey.com'; // an administrator who is not protected
  it('cannot block their own account or their own domain', () => {
    expect(code(() => set(emptyRules(), 'domain', 'ey.com', 'block', admin))).toBe('would_lock_out_self');
    expect(code(() => set(emptyRules(), 'email', admin, 'block', admin))).toBe('would_lock_out_self');
  });
  it('cannot remove the only rule that lets them in', () => {
    const doc = set(emptyRules(), 'domain', 'partner.com', 'allow', 'boss@ltm.com');
    const id = doc.rules[0].id;
    expect(code(() => applyChange(doc, { op: 'remove', id }, cfg, ctx('me@partner.com')))).toBe('would_lock_out_self');
    expect(applyChange(doc, { op: 'remove', id }, cfg, ctx('boss@ltm.com')).doc.rules).toEqual([]);
  });
  it('can block someone else', () => {
    expect(decide('x@bad.com', set(set(emptyRules(), 'domain', 'bad.com', 'allow', admin), 'domain', 'bad.com', 'block', admin), cfg).allowed).toBe(false);
  });
});

describe('validation', () => {
  it.each([
    ['', 'invalid_value'], ['*.ey.com', 'invalid_value'], ['ey', 'invalid_value'], ['a b.com', 'invalid_value'], ['-x.com', 'invalid_value'],
    ['x.com/', 'invalid_value'], ['ey.com,ltm.org', 'invalid_value'], ['a'.repeat(300) + '.com', 'invalid_value'], ['10.0.0.1', 'invalid_value']
  ])('refuses the domain %j', (value, expected) => expect(code(() => set(emptyRules(), 'domain', value, 'allow'))).toBe(expected));
  it.each(['', 'x', 'x@y', '@y.com', 'a b@y.com'])('refuses the email %j', value => expect(code(() => set(emptyRules(), 'email', value, 'allow'))).toBe('invalid_value'));
  it('refuses an unknown kind, action or operation, and a change by nobody', () => {
    expect(code(() => applyChange(emptyRules(), { op: 'set', kind: 'ip', value: 'x', action: 'allow' } as any, cfg, ctx('boss@ltm.com')))).toBe('invalid_kind');
    expect(code(() => applyChange(emptyRules(), { op: 'set', kind: 'domain', value: 'x.com', action: 'maybe' } as any, cfg, ctx('boss@ltm.com')))).toBe('invalid_action');
    expect(code(() => applyChange(emptyRules(), { op: 'delete' } as any, cfg, ctx('boss@ltm.com')))).toBe('invalid_op');
    expect(code(() => applyChange(emptyRules(), null as any, cfg, ctx('boss@ltm.com')))).toBe('invalid_op');
    expect(code(() => applyChange(emptyRules(), { op: 'set', kind: 'domain', value: 'x.com', action: 'allow' }, cfg, ctx('')))).toBe('actor_required');
    expect(code(() => applyChange(emptyRules(), { op: 'remove', id: 'nope' }, cfg, ctx('boss@ltm.com')))).toBe('not_found');
  });
  it('normalises the value, trims and caps the note, and records who and when', () => {
    const { doc, record } = applyChange(emptyRules(), { op: 'set', kind: 'domain', value: ' @Partner.COM ', action: 'allow', note: `  ${'x'.repeat(400)} ` }, cfg, ctx('Boss@LTM.com'));
    expect(doc.rules[0]).toMatchObject({ kind: 'domain', value: 'partner.com', action: 'allow', addedBy: 'boss@ltm.com', addedAt: '2026-11-03T10:00:00.000Z' });
    expect(doc.rules[0].note!.length).toBe(300);
    expect(record).toMatchObject({ op: 'add', by: 'boss@ltm.com', previous: null });
  });
  it('one rule per target: setting a rule replaces the earlier one and keeps its id', () => {
    const first = set(emptyRules(), 'domain', 'partner.com', 'allow');
    const second = applyChange(first, { op: 'set', kind: 'domain', value: 'partner.com', action: 'block' }, cfg, ctx('boss@ltm.com'));
    expect(second.doc.rules).toHaveLength(1);
    expect(second.doc.rules[0]).toMatchObject({ id: first.rules[0].id, action: 'block' });
    expect(second.record).toMatchObject({ op: 'replace', previous: { action: 'allow' } });
  });
  it('limits the number of rules', () => {
    let doc = emptyRules();
    for (let i = 0; i < MAX_RULES; i++) doc = set(doc, 'domain', `d${i}.example.com`, 'allow');
    expect(code(() => set(doc, 'domain', 'one-more.example.com', 'allow'))).toBe('too_many_rules');
    expect(set(doc, 'domain', 'd0.example.com', 'block').rules).toHaveLength(MAX_RULES); // replacing is not adding
  });
  it('does not change the document it was given', () => {
    const doc = set(emptyRules(), 'domain', 'partner.com', 'allow');
    const before = JSON.stringify(doc);
    set(doc, 'domain', 'partner.com', 'block');
    applyChange(doc, { op: 'remove', id: doc.rules[0].id }, cfg, ctx('boss@ltm.com'));
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe('property: no sequence of accepted changes locks anyone out', () => {
  const rng = (seed: number) => { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const domains = ['ltm.com', 'ey.com', 'home.example', 'partner.com', 'a.org', 'b.org'];
  const emails = ['owner@home.example', 'boss@ltm.com', 'x@ltm.com', 'friend@home.example', 'admin@ey.com', 'me@partner.com', 'u@a.org', 'v@b.org'];
  it('over 300 random histories of 80 changes by random administrators', () => {
    let accepted = 0, refused = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed);
      let doc = emptyRules();
      for (let step = 0; step < 80; step++) {
        const by = emails[Math.floor(r() * emails.length)];
        const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
        const change: any = r() < 0.2 && doc.rules.length
          ? { op: 'remove', id: pick(doc.rules).id }
          : r() < 0.5
            ? { op: 'set', kind: 'domain', value: pick(domains), action: pick(['allow', 'block']) }
            : { op: 'set', kind: 'email', value: pick(emails), action: pick(['allow', 'block']) };
        try {
          const out = applyChange(doc, change, cfg, ctx(by));
          doc = out.doc; accepted++;
          // The invariants after every accepted change.
          for (const p of cfg.protectedEmails) expect(decide(p, doc, cfg).allowed, `seed ${seed} step ${step}`).toBe(true);
          expect(decide('anyone@ltm.com', doc, cfg).allowed).toBe(true);
          expect(decide(by, doc, cfg).allowed, `seed ${seed} step ${step}: ${by} locked themselves out`).toBe(true);
        } catch (e) {
          expect(e).toBeInstanceOf(DomainRuleError);
          refused++;
        }
      }
    }
    expect(accepted).toBeGreaterThan(1000);
    expect(refused).toBeGreaterThan(300);
  });
});
