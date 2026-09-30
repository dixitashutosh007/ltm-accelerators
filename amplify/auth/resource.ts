import { defineAuth } from '@aws-amplify/backend';
import { preSignUp } from './pre-sign-up/resource';

/**
 * Defines AWS Cognito Authentication with:
 * 1. Email-based login
 * 2. RBAC User Groups: 'Admin' (Ashutosh) and 'Consultant'
 * 3. Pre-Sign-up trigger that verifies against the allowlist
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: false
    }
  },
  groups: ['Admin', 'Consultant'],
  triggers: {
    preSignUp
  }
});
