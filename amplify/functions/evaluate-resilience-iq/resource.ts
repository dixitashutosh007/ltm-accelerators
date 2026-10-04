import { defineFunction } from '@aws-amplify/backend';

export const evaluateResilienceIqFunction = defineFunction({
  name: 'evaluate-resilience-iq',
  entry: './handler.ts'
});
