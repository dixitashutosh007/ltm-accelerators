import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';
import { COST_IQ_AI_ENABLED } from './ai-switch';

/**
 * The Cost IQ AI narrative's API (CQ8; the shared service of WS-S1): the per-engagement switch, and starting the model
 * call, which the worker function (cost-iq-narrative-worker) runs outside the API's 30-second limit (CQ10 finding F1).
 * Off by default: see ai-switch.ts.
 */
export const costIqNarrativeFunction = defineFunction({
  name: 'cost-iq-narrative',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 512,
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    AI_ENABLED: COST_IQ_AI_ENABLED
  }
});
