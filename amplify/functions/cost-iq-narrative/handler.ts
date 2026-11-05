/**
 * Cost IQ AI narrative (CQ8; shared workstream WS-S1), on the Advisory API behind the Cognito JWT authorizer
 * and the accelerator access check:
 *   POST /api/cost-iq/narrative  { action: 'enable' | 'disable', assessmentId }       the per-engagement switch
 *   POST /api/cost-iq/narrative  { action: 'generate', assessmentId, focus? }          write the narrative
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
import { aiConfig, bedrockNarrativeModel } from '../_shared/bedrock-narrative';
import { redact } from '../../../packages/engine-core/src/ai/grounding';
import { runNarrative, type NarrativeModel } from '../../../packages/engine-core/src/ai/narrative';
import { allowForCostBrief, costBrief, COST_LEXICON, COST_SYSTEM } from '../../../packages/engine-core/src/accelerators/cost-iq/narrative';
import type { CostIqResult } from '../../../packages/engine-core/src/accelerators/cost-iq/report';
import { appSyncStore, type CostIqAssessmentStore } from '../manage-cost-assessment/store';

const ACTIONS = new Set(['enable', 'disable', 'generate']);
const GENERATABLE = new Set(['completed']);
const MAX_FOCUS = 300;

export function createHandler(store: CostIqAssessmentStore, deps: { enabled: () => boolean; model: () => NarrativeModel; now?: () => Date }) {
  // Every change moves the 24-month retention, as in the assessment service.
  const stamp = () => { const at = (deps.now ?? (() => new Date()))(); return { updatedAt: at.toISOString(), expiresAt: expiresAt(at) }; };
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

      const brief = costBrief(JSON.parse(item.resultJson) as CostIqResult);
      const focus = body.focus?.trim() ? redact(body.focus.trim(), [item.clientName ?? '']) : undefined;
      const result = await runNarrative({ system: COST_SYSTEM, input: brief, focus, allow: allowForCostBrief(brief), lexicon: COST_LEXICON, model: deps.model(), now: deps.now });
      // Prompt and output log (S9 item 5): input, focus and output, matched to the result by its hash.
      console.info('[CostIqNarrative] generate', JSON.stringify({ requestId, assessmentId: item.assessmentId, modelId: result.modelId, inputHash: result.inputHash, status: result.status, attempts: result.attempts, violations: result.violations, error: result.error, input: brief, focus, output: result.narrative }));
      const stored = { ...result, focus: focus ?? null };
      await store.update({ assessmentId: item.assessmentId, narrativeJson: JSON.stringify(stored), ...stamp() });
      if (result.status !== 'ok') {
        return respond(result.status === 'rejected' ? 422 : 502, { ok: false, error: result.status === 'rejected' ? 'narrative_rejected' : 'narrative_failed', message: result.status === 'rejected' ? 'The AI draft added facts that are not in the result, so it was not used. Try again, or use the report without it.' : 'The narrative could not be written. Try again later.', data: { status: result.status, violations: result.violations.length } });
      }
      return respond(200, { ok: true, data: { narrative: result.narrative, modelId: result.modelId, generatedAt: result.generatedAt, status: result.status } });
    } catch (error: any) {
      console.error('[CostIqNarrative]', { requestId, error });
      return respond(500, { ok: false, error: 'internal_narrative_error', message: 'The narrative could not be written. Please try again.' });
    }
  };
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('cost-iq', createHandler(appSyncStore, {
  enabled: () => aiConfig().enabled,
  model: () => bedrockNarrativeModel(aiConfig())
}));
