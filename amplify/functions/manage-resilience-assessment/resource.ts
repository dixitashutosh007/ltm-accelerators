import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const manageResilienceAssessmentFunction = defineFunction({
  name: 'manage-resilience-assessment',
  entry: './handler.ts',
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
