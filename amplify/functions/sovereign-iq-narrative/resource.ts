import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

/**
 * The Sovereign IQ AI narrative (PLAN S9). Off by default: AI_ENABLED stays 'false' until the owner approves where
 * inference runs (D14); the region and models are configuration. A model call with one retry can take a minute or two.
 * Logs (the prompt and output log) are kept one year, as the other services, until S10 sets the retention.
 */
export const sovereignIqNarrativeFunction = defineFunction({
  name: 'sovereign-iq-narrative',
  entry: './handler.ts',
  timeoutSeconds: 240,
  memoryMB: 512,
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    AI_ENABLED: 'false',
    AI_REGION: 'ap-south-1',
    AI_MODEL_ID: 'anthropic.claude-opus-5-5',
    AI_FALLBACK_MODEL_ID: 'anthropic.claude-opus-4-8'
  }
});
