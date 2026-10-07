import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { assertAssessmentStatusTransition, type ResilienceAssessmentStatus } from '../../../packages/engine-core/src/accelerators/resilience-iq/assessment-lifecycle';

const ALLOWED_ORIGIN = process.env.RESILIENCE_IQ_ALLOWED_ORIGIN || '*';
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Amz-Security-Token,X-Request-Id',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};
const statuses = new Set<ResilienceAssessmentStatus>(['draft','in_progress','completed','archived']);

function response(statusCode:number, body:unknown, requestId:string):APIGatewayProxyResultV2 {
  return { statusCode, headers:{...HEADERS,'X-Request-Id':requestId}, body:JSON.stringify(body) };
}
function sha256(value:string){ return createHash('sha256').update(value).digest('hex'); }
function hmac(key:Buffer|string, value:string){ return createHmac('sha256', key).update(value).digest(); }

function credentials(){
  const accessKeyId=process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey=process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken=process.env.AWS_SESSION_TOKEN;
  const region=process.env.AWS_REGION;
  if(!accessKeyId||!secretAccessKey||!sessionToken||!region) throw new Error('AWS runtime credentials are unavailable.');
  return {accessKeyId,secretAccessKey,sessionToken,region};
}

async function graphql(query:string, variables:Record<string,unknown>){
  const endpoint=process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  if(!endpoint) throw new Error('Amplify Data GraphQL endpoint is unavailable.');
  const {accessKeyId,secretAccessKey,sessionToken,region}=credentials();
  const url=new URL(endpoint);
  const body=JSON.stringify({query,variables});
  const payloadHash=sha256(body);
  const now=new Date();
  const amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,'');
  const dateStamp=amzDate.slice(0,8);
  const service='appsync';
  const credentialScope=`${dateStamp}/${region}/${service}/aws4_request`;
  const headers:{[key:string]:string}={
    'content-type':'application/json',
    host:url.host,
    'x-amz-date':amzDate,
    'x-amz-security-token':sessionToken
  };
  const canonicalHeaders=Object.keys(headers).sort().map(k=>`${k}:${headers[k].trim()}\n`).join('');
  const signedHeaders=Object.keys(headers).sort().join(';');
  const canonicalRequest=['POST','/graphql','',canonicalHeaders,signedHeaders,payloadHash].join('\n');
  const stringToSign=['AWS4-HMAC-SHA256',amzDate,credentialScope,sha256(canonicalRequest)].join('\n');
  const kDate=hmac('AWS4'+secretAccessKey,dateStamp);
  const kRegion=hmac(kDate,region);
  const kService=hmac(kRegion,service);
  const kSigning=hmac(kService,'aws4_request');
  const signature=createHmac('sha256',kSigning).update(stringToSign).digest('hex');
  headers.authorization=`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res=await fetch(endpoint,{method:'POST',headers,body});
  const json=await res.json() as any;
  if(!res.ok || json.errors?.length) throw new Error(json.errors?.map((e:any)=>e.message).join('; ') || `GraphQL request failed with ${res.status}`);
  return json.data;
}

function claims(event:APIGatewayProxyEventV2){
  return event.requestContext?.authorizer?.jwt?.claims || {};
}
function groups(event:APIGatewayProxyEventV2){
  const groupsRaw=claims(event)['cognito:groups'];
  return Array.isArray(groupsRaw)?groupsRaw.map(String):String(groupsRaw||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function authorized(event:APIGatewayProxyEventV2){
  // API Gateway has already validated the platform Cognito JWT.
  // The platform RBAC role is stored in the application session, not as a
  // Cognito group claim, so do not require Admin/Consultant groups here.
  const c=claims(event);
  return Boolean(c.sub || c.email || c.username);
}
function isAdmin(event:APIGatewayProxyEventV2){ return groups(event).includes('Admin'); }
function userEmail(event:APIGatewayProxyEventV2){
  return String(claims(event).email || claims(event).username || '').trim().toLowerCase();
}
function parseBody(event:APIGatewayProxyEventV2){
  if(!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body,'base64').toString('utf8') : event.body);
}

const fields=`id assessmentId clientName clientSector respondentEmail status questionBankVersion scoringModelVersion decisionTreeVersion blueprintEngineVersion executiveReportVersion engineVersion answersJson resultJson decisionLogJson recommendationSensitivityJson startedAt completedAt finalizedAt createdAt updatedAt`;

async function getAssessment(assessmentId:string){
  const data=await graphql(`query GetResilienceAssessment($filter: ModelResilienceAssessmentFilterInput) {
    listResilienceAssessments(filter:$filter) { items { ${fields} } }
  }`,{filter:{assessmentId:{eq:assessmentId}}});
  return data.listResilienceAssessments.items?.[0] || null;
}

export const handler=async(event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2>=>{
  const requestId=event.requestContext?.requestId || randomUUID();
  const method=event.requestContext?.http?.method || 'POST';
  if(method==='OPTIONS') return response(200,{},requestId);
  if(!authorized(event)) return response(403,{ok:false,error:'forbidden',requestId},requestId);
  try {
    if(method==='GET'){
      const assessmentId=event.queryStringParameters?.assessmentId;
      if(!assessmentId) return response(400,{ok:false,error:'assessmentId is required.',requestId},requestId);
      const item=await getAssessment(assessmentId);
      if(!item) return response(404,{ok:false,error:'assessment_not_found',requestId},requestId);
      if(!isAdmin(event) && String(item.respondentEmail||'').trim().toLowerCase()!==userEmail(event)) {
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
    if(existing && !canUpdate(existing.status as ResilienceAssessmentStatus, snapshot.status as ResilienceAssessmentStatus)) {
      return response(409,{ok:false,error:'invalid_assessment_status_transition',message:`${existing.status} -> ${snapshot.status}`,requestId},requestId);
    }
    if(existing?.status==='archived') return response(409,{ok:false,error:'assessment_immutable',requestId},requestId);
    if(existing?.status==='completed' && snapshot.status!=='archived') return response(409,{ok:false,error:'assessment_immutable',requestId},requestId);
    if(action==='complete' && snapshot.status!=='completed') return response(400,{ok:false,error:'complete action requires completed status.',requestId},requestId);
    if(action==='archive' && snapshot.status!=='archived') return response(400,{ok:false,error:'archive action requires archived status.',requestId},requestId);

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
      engineVersion:String(snapshot.version?.engine||'1.0.0'),
      answersJson:JSON.stringify(snapshot.answers||{}),
      resultJson:snapshot.result ? JSON.stringify(snapshot.result) : undefined,
      decisionLogJson:snapshot.result?.decisionLog ? JSON.stringify(snapshot.result.decisionLog) : undefined,
      recommendationSensitivityJson:snapshot.result?.recommendationSensitivity ? JSON.stringify(snapshot.result.recommendationSensitivity) : undefined,
      startedAt:String(snapshot.startedAt),
      completedAt:snapshot.completedAt ? String(snapshot.completedAt) : undefined,
      finalizedAt:snapshot.finalizedAt ? String(snapshot.finalizedAt) : undefined
    };
    const mutation=existing ? `mutation UpdateResilienceAssessment($input: UpdateResilienceAssessmentInput!) { updateResilienceAssessment(input:$input) { ${fields} } }` : `mutation CreateResilienceAssessment($input: CreateResilienceAssessmentInput!) { createResilienceAssessment(input:$input) { ${fields} } }`;
    const data=await graphql(mutation,{input});
    return response(200,{ok:true,data:existing?data.updateResilienceAssessment:data.createResilienceAssessment,requestId},requestId);
  } catch(error:any) {
    console.error('[ManageResilienceAssessment]',{requestId,error});
    return response(500,{ok:false,error:'internal_assessment_persistence_error',message:error?.message||'Persistence failed.',requestId},requestId);
  }
};

function canUpdate(from:ResilienceAssessmentStatus,to:ResilienceAssessmentStatus){
  try { assertAssessmentStatusTransition(from,to); return true; } catch { return false; }
}
