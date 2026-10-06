import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createHash } from 'node:crypto';
import { evaluateCostIq, metadata, questions, orchestrate } from '../../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Request-Id',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};

function response(statusCode: number, body: unknown, id: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: { ...CORS_HEADERS, 'X-Request-Id': id }, body: JSON.stringify(body) };
}
function makeRequestId(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.requestId || crypto.randomUUID();
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
      if (rawBody.length > 256 * 1024) {
        return response(413, { error: 'payload_too_large', requestId: id }, id);
      }
      try {
        body = JSON.parse(rawBody);
      } catch {
        return response(400, { error: 'invalid_json', requestId: id }, id);
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response(400, { error: 'json_object_required', requestId: id }, id);
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
    if (Object.keys(body.answers).length > 500) {
      return response(400, { error: 'too_many_answers', requestId: id }, id);
    }
    for (const [key, value] of Object.entries(body.answers)) {
      if (key.length > 128) {
        return response(400, { error: 'invalid_answer_key', requestId: id }, id);
      }
      if (Array.isArray(value)) {
        if (value.length > 100 || value.some(v => typeof v === 'object' && v !== null)) {
          return response(400, { error: 'invalid_answer_value', requestId: id }, id);
        }
      } else if (value !== null && typeof value === 'object') {
        return response(400, { error: 'invalid_answer_value', requestId: id }, id);
      }
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
    console.error('[EvaluateCostIq] Request failed', {
      requestId: id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return response(500, {
      error: 'internal_evaluation_error',
      message: 'An internal error occurred while processing the Cost IQ request.',
      requestId: id
    }, id);
  }
};

async function callGemini(instruction: string, input: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('AI service is not configured. Add the GEMINI_API_KEY Amplify secret.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fingerprint = createHash('sha256').update(key).digest('hex').slice(0, 12);
  console.log('[CostIQ Gemini] key diagnostic', { present: true, length: key.length, fingerprint, model });
  const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: instruction + '\n\nINPUT:\n' + input }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });
  const data:any = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || ('Gemini HTTP ' + resp.status));
  const extracted = data?.candidates?.[0]?.content?.parts?.map((part:any) => typeof part?.text === 'string' ? part.text : '').join('') || '';
  if (!extracted) throw new Error('Gemini returned no output text.');
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
  return safeJsonText(await callGemini(instruction, payload));
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
{"executiveSummary":"...","keyMessages":["..."],"priorityAreas":[{"name":"...","score":0,"why":"...","action":"..."}],"opportunities":[{"title":"...","description":"...","evidence":"...","confidence":"High|Medium|Low","nextStep":"..."}],"roadmap":[{"horizon":"0-30 days","actions":["..."]},{"horizon":"30-90 days","actions":["..."]},{"horizon":"90-180+ days","actions":["..."]}],"consultingRecommendations":["..."],"limitations":"..." }.`;
  return safeJsonText(await callGemini(instruction, payload));
}
