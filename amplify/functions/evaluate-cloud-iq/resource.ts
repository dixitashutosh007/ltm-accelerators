import { defineFunction } from '@aws-amplify/backend';

export const evaluateCloudIqFunction = defineFunction({
  name: 'evaluate-cloud-iq',
  entry: './handler.ts'
});
