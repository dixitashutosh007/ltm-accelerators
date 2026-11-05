import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const manageCostAssessmentFunction = defineFunction({
  name: 'manage-cost-assessment',
  entry: './handler.ts',
  // Scoring on completion runs the Cost IQ engine, as the evaluate service does.
  timeoutSeconds: 30,
  memoryMB: 512,
  logging: { retention: '1 year' },
  environment: { ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',') }
});
