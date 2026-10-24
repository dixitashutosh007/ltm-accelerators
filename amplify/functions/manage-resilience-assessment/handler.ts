import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { assertAssessmentStatusTransition, type ResilienceAssessmentStatus } from '../../../packages/engine-core/src/accelerators/resilience-iq/assessment-lifecycle';
import { corsHeaders } from '../_shared/http';
import { ASSESSMENT_FIELDS as fields, authorized, canAccess, getAssessment, graphql, isAdmin, listWhere, parseBody, userEmail } from '../_shared/resilience-data';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import { parseResilienceIqRequest } from '../../../packages/engine-core/src/accelerators/resilience-iq/contract';
import { RESILIENCE_IQ_VERSION } from '../../../packages/engine-core/src/accelerators/resilience-iq/version';
import { withAcceleratorAccess } from '../_shared/access';

// Lambdas run one request at a time per container, so the current request's headers are kept here for
// response() to echo an allowed origin (see _shared/http.ts). Origins not in ALLOWED_ORIGINS get no CORS header.
let requestHeaders: Record<string, string | undefined> | undefined;
const statuses = new Set<ResilienceAssessmentStatus>(['draft','in_progress','completed','archived']);

function response(statusCode:number, body:unknown, requestId:string):APIGatewayProxyResultV2 {
  return { statusCode, headers:{...corsHeaders({ headers: requestHeaders },'OPTIONS,GET,POST','X-Request-Id'),'X-Request-Id':requestId}, body:JSON.stringify(body) };
}
async function listAssessments(email:string){
  const items=await listWhere('ResilienceAssessment',fields,{respondentEmail:{eq:email}});
  return items.sort((a:any,b:any)=>String(b.updatedAt||b.startedAt||'').localeCompare(String(a.updatedAt||a.startedAt||'')));
}

const serve = async(event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2>=>{
  requestHeaders=event.headers;
  const requestId=event.requestContext?.requestId || randomUUID();
  const method=event.requestContext?.http?.method || 'POST';
  if(method==='OPTIONS') return response(200,{},requestId);
  if(!authorized(event)) return response(403,{ok:false,error:'forbidden',requestId},requestId);
  try {
    if(method==='GET'){
      const assessmentId=event.queryStringParameters?.assessmentId;
      if(!assessmentId){
        const items=await listAssessments(userEmail(event));
        return response(200,{ok:true,data:items,requestId},requestId);
      }
      const item=await getAssessment(assessmentId);
      if(!item) return response(404,{ok:false,error:'assessment_not_found',requestId},requestId);
      if(!canAccess(event,item.respondentEmail)) {
        return response(403,{ok:false,error:'assessment_access_denied',requestId},requestId);
      }
      return response(200,{ok:true,data:item,requestId},requestId);
    }
    if(method!=='POST') return response(405,{ok:false,error:'method_not_allowed',requestId},requestId);
    const body=parseBody(event);
    const action=String(body.action||'save');
    const snapshot=body.snapshot;
    if(!snapshot || typeof snapshot!=='object' || Array.isArray(snapshot)) return response(400,{ok:false,error:'snapshot is required.',requestId},requestId);
    const assessmentId=String(snapshot.assessmentId||'');
    if(!assessmentId || !snapshot.clientName || !snapshot.respondentEmail || !snapshot.startedAt) return response(400,{ok:false,error:'assessmentId, clientName, respondentEmail and startedAt are required.',requestId},requestId);
    if(!statuses.has(snapshot.status)) return response(400,{ok:false,error:'Invalid assessment status.',requestId},requestId);
    if(!isAdmin(event) && String(snapshot.respondentEmail).trim().toLowerCase()!==userEmail(event)) return response(403,{ok:false,error:'respondent_email_mismatch',requestId},requestId);

    const existing=await getAssessment(assessmentId);
    // An existing record belongs to its respondent: a non-admin may not overwrite (and so take over) someone else's.
    if(existing && !canAccess(event,existing.respondentEmail)) {
      return response(403,{ok:false,error:'assessment_access_denied',requestId},requestId);
    }
    if(existing && !canUpdate(existing.status as ResilienceAssessmentStatus, snapshot.status as ResilienceAssessmentStatus)) {
      return response(409,{ok:false,error:'invalid_assessment_status_transition',message:`${existing.status} -> ${snapshot.status}`,requestId},requestId);
    }
    if(existing?.status==='archived') return response(409,{ok:false,error:'assessment_immutable',requestId},requestId);
    if(existing?.status==='completed' && snapshot.status!=='archived') return response(409,{ok:false,error:'assessment_immutable',requestId},requestId);
    if(action==='complete' && snapshot.status!=='completed') return response(400,{ok:false,error:'complete action requires completed status.',requestId},requestId);
    if(action==='archive' && snapshot.status!=='archived') return response(400,{ok:false,error:'archive action requires archived status.',requestId},requestId);

    // Archiving a completed assessment changes only its status: answers and result stay as completed.
    if(action==='archive' && existing){
      const data=await graphql(`mutation UpdateResilienceAssessment($input: UpdateResilienceAssessmentInput!) { updateResilienceAssessment(input:$input) { ${fields} } }`,
        {input:{id:existing.id,status:'archived',finalizedAt:snapshot.finalizedAt?String(snapshot.finalizedAt):new Date().toISOString()}});
      return response(200,{ok:true,data:data.updateResilienceAssessment,requestId},requestId);
    }

    // Answers are checked with the same contract as the scoring API.
    const parsed=parseResilienceIqRequest({answers:snapshot.answers||{}});
    if(!parsed.ok) return response(400,{ok:false,error:parsed.errors[0],details:parsed.errors,requestId},requestId);

    // The stored result is computed here, never taken from the browser, and only on completion.
    let result:ReturnType<typeof evaluateResilienceIq>|undefined;
    if(snapshot.status==='completed'){
      result=evaluateResilienceIq(parsed.value.answers);
      if(result.status!=='ready') return response(409,{ok:false,error:'assessment_incomplete',message:'The assessment cannot be completed until the engine can issue a result.',nextQuestions:result.nextQuestions.map(q=>q.id),requestId},requestId);
    }

    const input={
      ...(existing?.id ? {id:existing.id} : {}),
      assessmentId,
      clientName:String(snapshot.clientName),
      clientSector:snapshot.clientSector ? String(snapshot.clientSector) : undefined,
      respondentEmail:String(snapshot.respondentEmail),
      status:String(snapshot.status),
      questionBankVersion:String(snapshot.version?.questionBank||'1.0'),
      scoringModelVersion:String(snapshot.version?.scoringModel||'1.0'),
      decisionTreeVersion:String(snapshot.version?.decisionTree||'1.0'),
      blueprintEngineVersion:String(snapshot.version?.blueprintEngine||'1.0'),
      executiveReportVersion:String(snapshot.version?.executiveReport||'1.0'),
      engineVersion:result ? String(result.version||RESILIENCE_IQ_VERSION) : String(snapshot.version?.engine||RESILIENCE_IQ_VERSION),
      answersJson:JSON.stringify(parsed.value.answers),
      resultJson:result ? JSON.stringify(result) : undefined,
      decisionLogJson:result ? JSON.stringify(result.decisionLog) : undefined,
      recommendationSensitivityJson:result ? JSON.stringify(result.executiveReport.recommendationSensitivity) : undefined,
      startedAt:String(snapshot.startedAt),
      completedAt:snapshot.status==='completed' ? String(snapshot.completedAt||new Date().toISOString()) : undefined,
      finalizedAt:snapshot.finalizedAt ? String(snapshot.finalizedAt) : undefined
    };
    const mutation=existing ? `mutation UpdateResilienceAssessment($input: UpdateResilienceAssessmentInput!) { updateResilienceAssessment(input:$input) { ${fields} } }` : `mutation CreateResilienceAssessment($input: CreateResilienceAssessmentInput!) { createResilienceAssessment(input:$input) { ${fields} } }`;
    const data=await graphql(mutation,{input});
    return response(200,{ok:true,data:existing?data.updateResilienceAssessment:data.createResilienceAssessment,requestId},requestId);
  } catch(error:any) {
    console.error('[ManageResilienceAssessment]',{requestId,error});
    // Details stay in the logs: database errors are not returned to the browser.
    return response(500,{ok:false,error:'internal_assessment_persistence_error',message:'The assessment could not be saved. Please try again.',requestId},requestId);
  }
};

function canUpdate(from:ResilienceAssessmentStatus,to:ResilienceAssessmentStatus){
  try { assertAssessmentStatusTransition(from,to); return true; } catch { return false; }
}

// Only callers with access to the accelerator reach the handler (amplify/functions/_shared/access.ts).
export const handler = withAcceleratorAccess('resilience-iq', serve);
