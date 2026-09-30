import { defineFunction } from '@aws-amplify/backend';

export const evaluateFinOpsIqFunction = defineFunction({
  name: 'evaluate-finops-iq',
  entry: './handler.ts'
});
