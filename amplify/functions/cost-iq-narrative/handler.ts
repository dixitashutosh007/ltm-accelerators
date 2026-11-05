/**
 * Cost IQ AI narrative (CQ8; shared workstream WS-S1), on the Advisory API behind the Cognito JWT authorizer
 * and the accelerator access check:
 *   POST /api/cost-iq/narrative  { action: 'enable' | 'disable', assessmentId }       the per-engagement switch
 *   POST /api/cost-iq/narrative  { action: 'generate', assessmentId, focus? }          start writing the narrative (202)
 * The model call can outlast the API's 30-second limit, so 'generate' only records a pending state and starts the worker
 * function (cost-iq-narrative-worker) asynchronously; the page asks the assessment service until the stored state is
 * ok, rejected or error. A second 'generate' while one is pending (and under five minutes old) does not start another.
 * Off by default twice over: the service switch (AI_ENABLED) and the engagement switch, set by the consultant. The
 * model sees the redacted, client-visible result only (narrative.ts); the client name is removed from the optional
 * focus. Output that fails the grounding check is retried once and otherwise rejected: no AI text is stored or shown.
 * Every call logs its input, focus and output with the model and the input hash (CloudWatch, retention per S10). The
 * engine result is never changed, so a completed assessment stays immutable.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { expiresAt } from '../../../packages/engine-core/src/accelerators/finops-iq/v3/retention';
import { corsHeaders } from '../_shared/http';
import { authorized, canAccess, parseBody } from '../_shared/resilience-data';
import { withAcceleratorAccess } from '../_shared/access';
import { redact } from '../../../packages/engine-core/src/ai/grounding';
import { runNarrative, type NarrativeModel } from '../../../packages/engine-core/src/ai/narrative';
import { allowForCostBrief, costBrief, COST_LEXICON, COST_SYSTEM } from '../../../packages/engine-core/src/accelerators/cost-iq/narrative';
import type { CostIqResult } from '../../../packages/engine-core/src/accelerators/cost-iq/report';
import { appSyncStore, type CostIqAssessmentStore } from '../manage-cost-assessment/store';

const ACTIONS = new Set(['enable', 'disable', 'generate']);
const GENERATABLE = new Set(['completed']);
const MAX_FOCUS = 300;

const PENDING_FRESH_MS = 5 * 60 * 1000;

/** What the worker is given: the redacted focus, never the client name. */
export interface NarrativeJob { assessmentId: string; focus?: string; requestId: string }

const stampAt = (now: () => Date) => { const at = now(); return { updatedAt: at.toISOString(), expiresAt: expiresAt(at) }; };

/**
 * The model call and its checks, run by the worker. Stores the outcome on the record (ok, rejected or error; never an
 * ungrounded draft as text) and logs the prompt and output with the model and the input hash.
 */
export async function runGeneration(store: CostIqAssessmentStore, deps: { model: () => NarrativeModel; now?: () => Date }, job: NarrativeJob) {
  const now = deps.now ?? (() => new Date());
  const item = await store.get(job.assessmentId);
  const finish = async (stored: Record<string, unknown>) => { await store.update({ assessmentId: job.assessmentId, narrativeJson: JSON.stringify(stored), ...stampAt(now) }); return stored; };
  // The switches and the state are checked again here: the worker runs some time after the request.
  if (!item || !item.aiEnabled || !GENERATABLE.has(item.status) || !item.resultJson) return finish({ status: 'error', error: 'not_generatable', generatedAt: now().toISOString(), narrative: null });
  try {
    const brief = costBrief(JSON.parse(item.resultJson) as CostIqResult);
    const result = await runNarrative({ system: COST_SYSTEM, input: brief, focus: job.focus, allow: allowForCostBrief(brief), lexicon: COST_LEXICON, model: deps.model(), now: deps.now });
    // Prompt and output log (S9 item 5): input, focus and output, matched to the result by its hash.
    console.info('[CostIqNarrative] generate', JSON.stringify({ requestId: job.requestId, assessmentId: job.assessmentId, modelId: result.modelId, inputHash: result.inputHash, status: result.status, attempts: result.attempts, violations: result.violations, error: result.error, input: brief, focus: job.focus, output: result.narrative }));
    return finish({ ...result, focus: job.focus ?? null });
  } catch (error: any) {
    console.error('[CostIqNarrative] worker failed', { requestId: job.requestId, assessmentId: job.assessmentId, error });
    return finish({ status: 'error', error: String(error?.name ?? 'worker_error'), generatedAt: now().toISOString(), narrative: null });
  }
}

export function createHandler(store: CostIqAssessmentStore, deps: { enabled: () => boolean; start: (job: NarrativeJob) => Promise<void>; now?: () => Date }) {
  // Every change moves the 24-month retention, as in the assessment service.
  const stamp = () => stampAt(deps.now ?? (() => new Date()));
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const requestId = event.requestContext?.requestId || randomUUID();
    const respond = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 => ({
      statusCode,
      headers: { ...corsHeaders(event, 'OPTIONS,POST', 'X-Request-Id'), 'X-Request-Id': requestId },
      body: JSON.stringify({ ...body, requestId })
    });
    const method = event.requestContext?.http?.method || 'POST';
    if (method === 'OPTIONS') return respond(200, {});
    if (!authorized(event)) return respond(403, { ok: false, error: 'forbidden' });
    if (method !== 'POST') return respond(405, { ok: false, error: 'method_not_allowed' });

    let body: any;
    try { body = parseBody(event); } catch { return respond(400, { ok: false, error: 'Request body is not valid JSON.' }); }
    const action = String(body?.action ?? '');
    if (!ACTIONS.has(action)) return respond(400, { ok: false, error: `action: expected one of ${[...ACTIONS].join(', ')}` });
    if (typeof body?.assessmentId !== 'string' || !body.assessmentId) return respond(400, { ok: false, error: 'assessmentId is required' });
    if (body.focus !== undefined && (typeof body.focus !== 'string' || body.focus.length > MAX_FOCUS)) return respond(400, { ok: false, error: `focus: text of at most ${MAX_FOCUS} characters` });
    try {
      const item = await store.get(body.assessmentId);
      if (!item) return respond(404, { ok: false, error: 'assessment_not_found' });
      if (!canAccess(event, item.respondentEmail)) return respond(403, { ok: false, error: 'assessment_access_denied' });

      // Saved before owners were recorded: read-only, so no AI switch or narrative on it (as in the assessment service).
      if (!item.respondentEmail) return respond(409, { ok: false, error: 'legacy_assessment_read_only' });
      if (action !== 'generate') {
        const data = await store.update({ assessmentId: item.assessmentId, aiEnabled: action === 'enable', ...stamp() });
        console.info('[CostIqNarrative] switch', { requestId, assessmentId: item.assessmentId, aiEnabled: data.aiEnabled });
        return respond(200, { ok: true, data: { assessmentId: item.assessmentId, aiEnabled: !!data.aiEnabled } });
      }
      if (!deps.enabled()) return respond(503, { ok: false, error: 'ai_service_off', message: 'AI narrative is switched off for this service.' });
      if (!item.aiEnabled) return respond(409, { ok: false, error: 'ai_off_for_engagement', message: 'Switch AI narrative on for this engagement first.' });
      if (!GENERATABLE.has(item.status) || !item.resultJson) return respond(409, { ok: false, error: 'assessment_not_completed', message: 'Complete the assessment first.' });

      const now = (deps.now ?? (() => new Date()))();
      const last = item.narrativeJson ? (() => { try { return JSON.parse(item.narrativeJson!); } catch { return null; } })() : null;
      if (last?.status === 'pending' && now.getTime() - Date.parse(last.startedAt) < PENDING_FRESH_MS) return respond(202, { ok: true, data: { status: 'pending', startedAt: last.startedAt } });

      const focus = body.focus?.trim() ? redact(body.focus.trim(), [item.clientName ?? '']) : undefined;
      await store.update({ assessmentId: item.assessmentId, narrativeJson: JSON.stringify({ status: 'pending', startedAt: now.toISOString(), narrative: null }), ...stamp() });
      try { await deps.start({ assessmentId: item.assessmentId, focus, requestId }); }
      catch (error: any) {
        console.error('[CostIqNarrative] could not start the worker', { requestId, error });
        await store.update({ assessmentId: item.assessmentId, narrativeJson: JSON.stringify({ status: 'error', error: 'start_failed', generatedAt: now.toISOString(), narrative: null }), ...stamp() });
        return respond(502, { ok: false, error: 'narrative_failed', message: 'The narrative could not be started. Please try again.' });
      }
      return respond(202, { ok: true, data: { status: 'pending', startedAt: now.toISOString() } });
    } catch (error: any) {
      console.error('[CostIqNarrative]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_narrative_error', message: 'The narrative could not be written. Please try again.' });
    }
  };
}

// Starts the worker without waiting for it (an asynchronous invocation), so the API answers at once.
async function startWorker(job: NarrativeJob) {
  const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
  const name = process.env.NARRATIVE_WORKER_FUNCTION;
  if (!name) throw new Error('NARRATIVE_WORKER_FUNCTION is not set');
  await new LambdaClient({}).send(new InvokeCommand({ FunctionName: name, InvocationType: 'Event', Payload: Buffer.from(JSON.stringify(job)) }));
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('cost-iq', createHandler(appSyncStore, {
  enabled: () => process.env.AI_ENABLED === 'true',
  start: startWorker
}));
