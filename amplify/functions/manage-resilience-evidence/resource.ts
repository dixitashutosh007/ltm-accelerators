import { defineFunction } from '@aws-amplify/backend';

export const manageResilienceEvidenceFunction = defineFunction({
  name: 'manage-resilience-evidence',
  entry: './handler.ts'
});
