import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const evaluateSovereignIqFunction = defineFunction({
  name: 'evaluate-sovereign-iq',
  entry: './handler.ts',
  // Logs kept one year, as the other Sovereign IQ services and the API access logs (PLAN S10).
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
