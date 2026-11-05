import { defineFunction } from '@aws-amplify/backend';
import { COST_IQ_AI_ENABLED } from '../cost-iq-narrative/ai-switch';

/**
 * The model call of the Cost IQ AI narrative, run asynchronously by cost-iq-narrative (CQ10 finding F1: the API's
 * 30-second limit is shorter than a Bedrock call with one retry). Off by default: AI_ENABLED stays 'false' until model
 * access is enabled and the live eval passes. Claude Opus 5 on the India inference profile from ap-south-1; no fallback.
 */
export const costIqNarrativeWorkerFunction = defineFunction({
  name: 'cost-iq-narrative-worker',
  entry: './handler.ts',
  timeoutSeconds: 240,
  memoryMB: 512,
  logging: { retention: '1 year' },
  environment: {
    AI_ENABLED: COST_IQ_AI_ENABLED,
    AI_REGION: 'ap-south-1',
    AI_MODEL_ID: 'in.anthropic.claude-opus-5',
    AI_FALLBACK_MODEL_ID: ''
  }
});
