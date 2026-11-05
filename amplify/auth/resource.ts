import { defineAuth } from '@aws-amplify/backend';
import { preSignUp } from './pre-sign-up/resource';
import { preAuthentication } from './pre-authentication/resource';
import { postAuthentication } from './post-authentication/resource';

/**
 * Defines AWS Cognito Authentication with:
 * 1. Email-based login
 * 2. RBAC User Groups: 'Admin' (Ashutosh) and 'Consultant'
 * 3. Pre-sign-up and pre-authentication triggers that check the address against the domain rules (P1), and a
 *    post-authentication trigger that records each sign-in for the Activity screen (P2)
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
    preSignUp,
    preAuthentication,
    postAuthentication
  }
});
