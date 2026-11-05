import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const manageSessionFunction = defineFunction({
  name: 'manage-session',
  entry: './handler.ts',
  // Logs kept one year, as for the other save and resume services.
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
