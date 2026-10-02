import { defineFunction } from '@aws-amplify/backend';

export const evaluateCostIqFunction = defineFunction({
  name: 'evaluate-cost-iq',
  entry: './handler.ts'
});
