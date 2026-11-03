import { defineFunction, secret } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const evaluateCostIqFunction = defineFunction({
  name: 'evaluate-cost-iq',
  entry: './handler.ts',
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
    GEMINI_MODEL: 'gemini-3.8-flash'
  }
});
