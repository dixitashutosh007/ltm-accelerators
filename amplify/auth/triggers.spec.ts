/**
 * The sign-up and sign-in triggers (platform workstream P1): both decide through the domain rules, and both refuse
 * with the same wording. The rules themselves are tested in amplify/functions/_shared/domain-access.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { createHandler as signUp } from './pre-sign-up/handler';
import { createHandler as signIn } from './pre-authentication/handler';

const allow = { check: async () => ({ allowed: true, reason: 'domain_allowed' }) };
const refuse = (reason: string) => ({ check: async () => ({ allowed: false, reason }) });
const signUpEvent = (email: string, triggerSource = 'PreSignUp_AdminCreateUser') => ({ triggerSource, request: { userAttributes: { email } }, response: {} }) as any;
const signInEvent = (email: string) => ({ triggerSource: 'PreAuthentication_Authentication', request: { userAttributes: { email } }, response: {} }) as any;
const run = (h: any, e: any) => h(e, {} as any, () => undefined);

describe('pre-sign-up', () => {
  it('admits an allowed address and confirms accounts an administrator created', async () => {
    const out: any = await run(signUp(allow), signUpEvent('A@Partner.com'));
    expect(out.response.autoConfirmUser).toBe(true);
    expect(out.response.autoVerifyEmail).toBe(true);
  });
  it('does not confirm a self-registered account: the address must be verified by its owner', async () => {
    const out: any = await run(signUp(allow), signUpEvent('a@partner.com', 'PreSignUp_SignUp'));
    expect(out.response.autoConfirmUser).toBeUndefined();
  });
  it('refuses a blocked or unlisted address with a message that names whom to contact', async () => {
    await expect(run(signUp(refuse('domain_blocked')), signUpEvent('a@x.com'))).rejects.toThrow(/not authorized.*contact/i);
  });
  it('says so when the rules cannot be read', async () => {
    await expect(run(signUp(refuse('rules_unavailable')), signUpEvent('a@x.com'))).rejects.toThrow(/try again/i);
  });
  it('passes the address to the rules in lower case, trimmed', async () => {
    let seen = '';
    await run(signUp({ check: async (e: string) => { seen = e; return { allowed: true, reason: 'x' }; } }), signUpEvent('  Mixed@Case.COM '));
    expect(seen).toBe('mixed@case.com');
  });
});

describe('pre-authentication', () => {
  it('lets an allowed address sign in', async () => {
    const e = signInEvent('a@partner.com');
    expect(await run(signIn(allow), e)).toBe(e);
  });
  it('stops a blocked address from signing in, with the same wording as sign-up', async () => {
    await expect(run(signIn(refuse('domain_blocked')), signInEvent('a@x.com'))).rejects.toThrow(/not authorized.*contact/i);
  });
  it('stops everyone when the rules cannot be read (the rules store lets protected addresses through before this point)', async () => {
    await expect(run(signIn(refuse('rules_unavailable')), signInEvent('a@x.com'))).rejects.toThrow(/try again/i);
  });
  it('refuses an event with no address', async () => {
    await expect(run(signIn(refuse('invalid_email')), { request: { userAttributes: {} } })).rejects.toThrow();
  });
});
