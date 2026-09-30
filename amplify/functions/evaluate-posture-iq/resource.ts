import { defineFunction } from '@aws-amplify/backend';

export const evaluatePostureIqFunction = defineFunction({
  name: 'evaluate-posture-iq',
  entry: './handler.ts'
});
