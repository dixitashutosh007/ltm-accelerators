import { defineFunction } from '@aws-amplify/backend';
import { SIGNUP_ALLOWED_EMAILS, SIGNUP_ALLOWED_DOMAINS, ACCESS_CONTACT_EMAIL } from '../../config';

export const preSignUp = defineFunction({
  name: 'auth-pre-sign-up',
  // In the auth stack: the reports service and the API read the user pool, so a trigger in the function stack
  // would make the auth and function stacks depend on each other.
  resourceGroupName: 'auth',
  entry: './handler.ts',
  environment: {
    ALLOWED_EMAILS: SIGNUP_ALLOWED_EMAILS,
    ALLOWED_DOMAINS: SIGNUP_ALLOWED_DOMAINS,
    ACCESS_CONTACT_EMAIL
  }
});
