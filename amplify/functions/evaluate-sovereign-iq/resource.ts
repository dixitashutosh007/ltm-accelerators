import { defineFunction } from '@aws-amplify/backend';

export const evaluateSovereignIqFunction = defineFunction({
  name: 'evaluate-sovereign-iq',
  entry: './handler.ts'
});
