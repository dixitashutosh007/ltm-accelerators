import { defineFunction, secret } from '@aws-amplify/backend';

export const evaluateCostIqFunction = defineFunction({
  name: 'evaluate-cost-iq',
  entry: './handler.ts',
  environment: {
    OPENAI_API_KEY: secret('OPENAI_API_KEY')
  }
});
