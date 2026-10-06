import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const evaluateSovereignIqFunction = defineFunction({
  name: 'evaluate-sovereign-iq',
  entry: './handler.ts',
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
