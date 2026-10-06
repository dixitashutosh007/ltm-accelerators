import { defineFunction, secret } from '@aws-amplify/backend';

export const evaluateCostIqFunction = defineFunction({
  name: 'evaluate-cost-iq',
  entry: './handler.ts',
  environment: {
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
    GEMINI_MODEL: 'gemini-3.8-flash'
  }
});
