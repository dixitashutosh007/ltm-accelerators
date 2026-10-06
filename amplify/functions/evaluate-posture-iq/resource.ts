import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

export const evaluatePostureIqFunction = defineFunction({
  name: 'evaluate-posture-iq',
  entry: './handler.ts',
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
