import { defineFunction } from '@aws-amplify/backend';

export const manageResilienceAssessmentFunction = defineFunction({
  name: 'manage-resilience-assessment',
  entry: './handler.ts'
});
