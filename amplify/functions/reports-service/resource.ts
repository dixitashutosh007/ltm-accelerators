import { defineFunction } from '@aws-amplify/backend';
import {
  REGION, ADMIN_GROUP, SUPER_ADMIN_EMAILS,
  ALLOWED_ORIGINS, REPORTS_BUCKET, APP_BASE_URL, SIGNUP_ALLOWED_DOMAINS, SIGNUP_ALLOWED_EMAILS, PROTECTED_DOMAINS
} from '../../config';

/** Reports archive and user administration API (verifies the Cognito ID token itself as well). */
export const reportsServiceFunction = defineFunction({
  name: 'reports-service',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    // USER_POOL_ID and COGNITO_CLIENT_ID are added in backend.ts from the backend's own user pool.
    COGNITO_REGION: REGION,
    ADMIN_GROUP,
    SUPER_ADMIN_EMAILS,
    // The baseline allow lists and the protected domains; the rules themselves are in config/domain-rules.json.
    ALLOWED_DOMAINS: SIGNUP_ALLOWED_DOMAINS,
    ALLOWED_EMAILS: SIGNUP_ALLOWED_EMAILS,
    PROTECTED_DOMAINS,
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    REPORTS_BUCKET,
    APP_BASE_URL
  }
});
