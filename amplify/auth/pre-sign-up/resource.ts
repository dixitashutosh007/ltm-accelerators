import { defineFunction } from '@aws-amplify/backend';
import { SIGNUP_ALLOWED_EMAILS, SIGNUP_ALLOWED_DOMAINS, ACCESS_CONTACT_EMAIL } from '../../config';

export const preSignUp = defineFunction({
  name: 'auth-pre-sign-up',
  entry: './handler.ts',
  environment: {
    ALLOWED_EMAILS: SIGNUP_ALLOWED_EMAILS,
    ALLOWED_DOMAINS: SIGNUP_ALLOWED_DOMAINS,
    ACCESS_CONTACT_EMAIL
  }
});
