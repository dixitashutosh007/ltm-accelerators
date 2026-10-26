import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const manageSovereignAssessmentFunction = defineFunction({
  name: 'manage-sovereign-assessment',
  entry: './handler.ts',
  // Logs kept one year, as for FinOps IQ and the API access logs.
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
