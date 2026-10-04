import { defineFunction } from '@aws-amplify/backend';

export const evaluateStrategyIqFunction = defineFunction({
  name: 'evaluate-strategy-iq',
  entry: './handler.ts'
});
