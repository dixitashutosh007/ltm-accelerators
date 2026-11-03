import { defineFunction } from '@aws-amplify/backend';
import { SIGNUP_ALLOWED_EMAILS, SIGNUP_ALLOWED_DOMAINS, PROTECTED_DOMAINS, SUPER_ADMIN_EMAILS, REPORTS_BUCKET, ACCESS_CONTACT_EMAIL } from '../../config';

export const preSignUp = defineFunction({
  name: 'auth-pre-sign-up',
  // In the auth stack: the reports service and the API read the user pool, so a trigger in the function stack
  // would make the auth and function stacks depend on each other.
  resourceGroupName: 'auth',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    // The baseline allow lists; administrators add and block domains in the Access Control screen (domain-rules.json).
    ALLOWED_EMAILS: SIGNUP_ALLOWED_EMAILS,
    ALLOWED_DOMAINS: SIGNUP_ALLOWED_DOMAINS,
    PROTECTED_DOMAINS,
    PROTECTED_EMAILS: SUPER_ADMIN_EMAILS,
    REPORTS_BUCKET,
    ACCESS_CONTACT_EMAIL
  }
});
