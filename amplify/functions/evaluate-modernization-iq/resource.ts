import { defineFunction } from '@aws-amplify/backend';

export const evaluateModernizationIqFunction = defineFunction({
  name: 'evaluate-modernization-iq',
  entry: './handler.ts'
});
