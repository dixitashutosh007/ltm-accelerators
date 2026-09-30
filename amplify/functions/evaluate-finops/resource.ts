import { defineFunction } from '@aws-amplify/backend';

export const evaluateFinOpsFunction = defineFunction({
  name: 'evaluate-finops-value-case',
  entry: './handler.ts'
});
