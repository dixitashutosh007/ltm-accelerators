import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { corsHeaders } from '../_shared/http';
import { evaluateCostIq, metadata, questions, orchestrate } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';

// Per-request CORS headers (origin allowlist). Lambda handles one request at a time,
// so this module-level value is safe.
let CORS_HEADERS: Record<string, string> = corsHeaders();

function response(statusCode: number, body: unknown, id: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: JSON.stringify(body) };
}
function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  CORS_HEADERS = corsHeaders(event, 'OPTIONS,GET,POST', 'X-Request-Id');
  const id = makeRequestId(event);
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'GET';
  const path = event.requestContext?.http?.path || (event as any).path || '';

  if (method === 'OPTIONS') return { statusCode: 200, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: '' };

  try {
    if (method === 'GET' && path.endsWith('/metadata')) return response(200, metadata(), id);
    if (method === 'GET' && path.endsWith('/questions')) return response(200, questions(), id);

    if (method !== 'POST') return response(405, { error: 'method_not_allowed', requestId: id }, id);

    let body: any = {};
    if (event.body) {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : JSON.parse(event.body);
    }
    if (method === 'POST' && path.endsWith('/ai-review')) {
      return response(200, await aiReview(body), id);
    }
    if (method === 'POST' && path.endsWith('/ai-report')) {
      return response(200, await aiReport(body), id);
    }

    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return response(400, { error: 'answers_object_required', requestId: id }, id);
    }
    if (path.endsWith('/orchestrate')) {
      return response(200, orchestrate({ answers: body.answers, options: body.options || {} }), id);
    }

    const result = await evaluateCostIq({
      answers: body.answers,
      scope: body.scope || null,
      capabilityScores: body.capabilityScores || {},
      evidence: body.evidence || body.options?.evidence || {},
      feasibilityEvidence: body.feasibilityEvidence || body.options?.feasibilityEvidence || {},
      options: body.options || {}
    });
    return response(200, result, id);
  } catch (error) {
    console.error('[EvaluateCostIq] Request failed', { requestId: id });
    return response(500, {
      error: 'internal_evaluation_error',
      message: 'An internal error occurred while processing the Cost IQ request.',
      requestId: id
    }, id);
  }
};


async function callOpenAI(instruction: string, input: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('AI service is not configured. Add the OPENAI_API_KEY Amplify secret.');
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-6-sol',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: instruction }] },
        { role: 'user', content: [{ type: 'input_text', text: input }] }
      ],
      max_output_tokens: 5000
    })
  });
  const data:any = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${resp.status}`);
  const extracted = data?.output_text ||
    (Array.isArray(data?.output)
      ? data.output
          .flatMap((item:any) => Array.isArray(item?.content) ? item.content : [])
          .filter((item:any) => item?.type === 'output_text' && typeof item?.text === 'string')
          .map((item:any) => item.text)
          .join('\n')
      : '');
  if (!extracted) throw new Error('OpenAI returned no output text.');
  return extracted;
}

function safeJsonText(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned an invalid structured response.');
  return JSON.parse(match[0]);
}

async function aiReview(body:any) {
  const payload = JSON.stringify({
    selectedAreas: body.selectedAreas || [],
    answers: body.answers || {},
    context: body.context || {}
  });
  const instruction = `You are the Cost IQ diagnostic quality reviewer for LTM Infrastructure Technology Advisory.
Review answers for contradictions, ambiguity, missing critical context and suspiciously strong claims.
Do NOT change deterministic scores. Return ONLY JSON:
{"needsClarification":true|false,"questions":[{"id":"AI-1","reason":"...","question":"...","options":["...","...","..."]}],"observations":["..."]}
Ask at most 3 high-value questions. Do not ask for information already provided. Prefer questions that materially affect interpretation.`;
  return safeJsonText(await callOpenAI(instruction, payload));
}

async function aiReport(body:any) {
  const payload = JSON.stringify({
    assessment: body.assessment || {},
    answers: body.answers || {},
    subjective: body.subjective || {},
    aiReview: body.aiReview || {},
    selectedAreas: body.selectedAreas || []
  });
  const instruction = `You are a senior LTM technology economics advisor. Produce an executive Cost IQ report using the supplied deterministic assessment as the source of truth.
Do not invent scores, savings, facts or findings. Clearly distinguish evidence-backed observations from hypotheses.
Return ONLY JSON:
{"executiveSummary":"...","keyMessages":["..."],"priorityAreas":[{"name":"...","score":0,"why":"...","action":"..."}],"opportunities":[{"title":"...","description":"...","evidence":"...","confidence":"High|Medium|Low","nextStep":"..."}],"roadmap":[{"horizon":"0-30 days","actions":["..."]},{"horizon":"30-90 days","actions":["..."]},{"horizon":"90-180+ days","actions":["..."]}],"consultingRecommendations":["..."],"limitations":"..."}.`;
  return safeJsonText(await callOpenAI(instruction, payload));
}
