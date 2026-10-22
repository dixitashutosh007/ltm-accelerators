import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const evaluateFinOpsIqFunction = defineFunction({
  name: 'evaluate-finops-iq',
  entry: './handler.ts',
  // Retention (M6): FinOps IQ logs are kept for one year, as the API access logs.
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
