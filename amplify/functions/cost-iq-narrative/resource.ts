import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

/**
 * The Cost IQ AI narrative (CQ8; the shared service of WS-S1). Off by default: AI_ENABLED stays 'false' until model access is enabled and
 * the live eval passes. Claude Opus 5 on the India geographic inference profile from ap-south-1, so inference stays in
 * Mumbai and Hyderabad (owner decision D29, replacing D28's eu-west-1); no fallback model, as none is served in India. A model
 * call with one retry can take a minute or two.
 * Logs (the prompt and output log) are kept one year, as the other services, until S10 sets the retention.
 */
export const costIqNarrativeFunction = defineFunction({
  name: 'cost-iq-narrative',
  entry: './handler.ts',
  timeoutSeconds: 240,
  memoryMB: 512,
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    AI_ENABLED: 'false',
    AI_REGION: 'ap-south-1',
    AI_MODEL_ID: 'in.anthropic.claude-opus-5',
    AI_FALLBACK_MODEL_ID: ''
  }
});
