import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

// Scoring only. The AI narrative is the shared Bedrock service (cost-iq-narrative), not this function (CQ8).
export const evaluateCostIqFunction = defineFunction({
  name: 'evaluate-cost-iq',
  entry: './handler.ts',
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
