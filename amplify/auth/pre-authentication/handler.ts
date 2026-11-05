import type { PreAuthenticationTriggerHandler } from 'aws-lambda';
import { configFromEnv, refusalMessage } from '../../functions/_shared/domain-access.mjs';
import { createDomainRulesStore, type DomainRulesStore } from '../../functions/_shared/domain-rules-store.mjs';

// Sign-in check (platform workstream P1): an address that is blocked, or no longer allowed, cannot sign in, even if its
// account already exists. Cognito does not run this on a token refresh, so the services also check on every request
// (amplify/functions/_shared/access.ts, services/reports-service). Protected addresses always pass.
const ACCESS_CONTACT = process.env.ACCESS_CONTACT_EMAIL || 'your LTM Vantage administrator';

export const createHandler = (store: Pick<DomainRulesStore, 'check'>): PreAuthenticationTriggerHandler => async (event) => {
  const email = (event.request.userAttributes?.email || '').toLowerCase().trim();
  const decision = await store.check(email);
  if (!decision.allowed) {
    console.warn(`[PreAuthentication] Refused sign-in (${decision.reason}) for ${email}`);
    throw new Error(refusalMessage(decision, ACCESS_CONTACT));
  }
  return event;
};

let store: DomainRulesStore | undefined;
export const handler: PreAuthenticationTriggerHandler = (event, context, callback) => {
  store ??= createDomainRulesStore({ bucket: process.env.REPORTS_BUCKET || '', cfg: configFromEnv(process.env) });
  return createHandler(store)(event, context, callback);
};
