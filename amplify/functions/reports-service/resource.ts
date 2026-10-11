import { defineFunction } from '@aws-amplify/backend';
import {
  REGION, USER_POOL_ID, USER_POOL_CLIENT_ID, ADMIN_GROUP, SUPER_ADMIN_EMAILS,
  ALLOWED_ORIGINS, REPORTS_BUCKET, APP_BASE_URL
} from '../../config';

/** Reports archive and user administration API (verifies the Cognito ID token itself as well). */
export const reportsServiceFunction = defineFunction({
  name: 'reports-service',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    COGNITO_REGION: REGION,
    USER_POOL_ID,
    COGNITO_CLIENT_ID: USER_POOL_CLIENT_ID,
    ADMIN_GROUP,
    SUPER_ADMIN_EMAILS,
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    REPORTS_BUCKET,
    APP_BASE_URL
  }
});
