/**
 * Cost IQ AI narrative worker (CQ8, CQ10 finding F1): runs the model call that the API function started, outside the API's
 * 30-second limit, and stores the outcome on the assessment. Invoked only by the narrative API function (asynchronous
 * invocation); it has no HTTP route and no caller identity, so the API function has already checked who asked.
 */
import { aiConfig, bedrockNarrativeModel } from '../_shared/bedrock-narrative';
import { appSyncStore } from '../manage-cost-assessment/store';
import { runGeneration, type NarrativeJob } from '../cost-iq-narrative/handler';

export const handler = async (job: NarrativeJob) => {
  const cfg = aiConfig();
  if (!cfg.enabled) { console.warn('[CostIqNarrative] worker started while the service is off', { requestId: job?.requestId }); return; }
  if (!job || typeof job.assessmentId !== 'string') { console.error('[CostIqNarrative] worker started without a job'); return; }
  await runGeneration(appSyncStore, { model: () => bedrockNarrativeModel(cfg) }, job);
};
