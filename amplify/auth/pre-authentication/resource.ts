import { defineFunction } from '@aws-amplify/backend';
import { SIGNUP_ALLOWED_EMAILS, SIGNUP_ALLOWED_DOMAINS, PROTECTED_DOMAINS, SUPER_ADMIN_EMAILS, REPORTS_BUCKET, ACCESS_CONTACT_EMAIL } from '../../config';

export const preAuthentication = defineFunction({
  name: 'auth-pre-authentication',
  resourceGroupName: 'auth',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    ALLOWED_EMAILS: SIGNUP_ALLOWED_EMAILS,
    ALLOWED_DOMAINS: SIGNUP_ALLOWED_DOMAINS,
    PROTECTED_DOMAINS,
    PROTECTED_EMAILS: SUPER_ADMIN_EMAILS,
    REPORTS_BUCKET,
    ACCESS_CONTACT_EMAIL
  }
});
