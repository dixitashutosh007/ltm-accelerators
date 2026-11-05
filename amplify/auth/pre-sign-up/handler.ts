import type { PreSignUpTriggerHandler } from 'aws-lambda';
import { configFromEnv, refusalMessage } from '../../functions/_shared/domain-access.mjs';
import { createDomainRulesStore, type DomainRulesStore } from '../../functions/_shared/domain-rules-store.mjs';

// Who may have an account is decided by amplify/functions/_shared/domain-access.mjs from the baseline allow lists in
// amplify/config.ts and the rules an administrator keeps in the Access Control screen (config/domain-rules.json).
// Protected addresses (ltm.com and the super administrators) are always admitted.
const ACCESS_CONTACT = process.env.ACCESS_CONTACT_EMAIL || 'your LTM Vantage administrator';

export const createHandler = (store: Pick<DomainRulesStore, 'check'>): PreSignUpTriggerHandler => async (event) => {
  const email = (event.request.userAttributes.email || '').toLowerCase().trim();
  const decision = await store.check(email);

  if (!decision.allowed) {
    console.warn(`[PreSignUp] Refused registration (${decision.reason}) for ${email}`);
    throw new Error(refusalMessage(decision, ACCESS_CONTACT));
  }

  console.info(`[PreSignUp] Authorized registration for email: ${email} (${decision.reason})`);

  // Only accounts created by an administrator are confirmed automatically. Self-registered
  // accounts must prove they own the address via Cognito's emailed verification code;
  // otherwise anyone could register an unclaimed allow-listed address (e.g. any @ltm.com).
  if (event.triggerSource === 'PreSignUp_AdminCreateUser') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};

let store: DomainRulesStore | undefined;
export const handler: PreSignUpTriggerHandler = (event, context, callback) => {
  store ??= createDomainRulesStore({ bucket: process.env.REPORTS_BUCKET || '', cfg: configFromEnv(process.env) });
  return createHandler(store)(event, context, callback);
};
