import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler as rawHandler } from './handler';
import { evaluateResilienceIq } from '../../../packages/engine-core/src/accelerators/resilience-iq/evaluate';
import { ARCHETYPES } from '../../../packages/engine-core/test/resilience-iq-samples';

const handler = async (e: any) => (await rawHandler(e)) as APIGatewayProxyStructuredResultV2;

process.env.AWS_ACCESS_KEY_ID='test';
process.env.AWS_SECRET_ACCESS_KEY='test-secret';
process.env.AWS_SESSION_TOKEN='test-session';
process.env.AWS_REGION='ap-south-1';
process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT='https://example.appsync-api.ap-south-1.amazonaws.com/graphql';

function event(method:'GET'|'POST', body?:unknown, claims:Record<string,unknown>={email:'consultant@example.com','cognito:groups':['Consultant']}):any {
  return {
    requestContext:{requestId:'test-request',http:{method},authorizer:{jwt:{claims}}},
    body:body===undefined?undefined:JSON.stringify(body),
    isBase64Encoded:false,
    queryStringParameters:method==='GET'?{assessmentId:'RIQ-001'}:undefined
  };
}

const originalFetch=globalThis.fetch;
let mode:'create'|'existing-completed'|'existing-other-owner'|'second-page'|'graphql-error'='create';
const mutations:any[]=[];
globalThis.fetch=async (_input:any, init:any)=>{
  const request=JSON.parse(init.body);
  const ok=(data:unknown)=>new Response(JSON.stringify({data}),{status:200,headers:{'content-type':'application/json'}});
  if(mode==='graphql-error') return new Response(JSON.stringify({errors:[{message:'DynamoDB:ConditionalCheckFailed table=ResilienceAssessment-internal'}]}),{status:200,headers:{'content-type':'application/json'}});
  if(request.query.includes('listResilienceAssessments')){
    if(mode==='second-page'){
      // Page one matches nothing (AppSync filters after reading the page); the record is on page two.
      return ok({listResilienceAssessments:request.variables.nextToken
        ? {items:[{id:'db-9',assessmentId:'RIQ-001',status:'draft',respondentEmail:'consultant@example.com'}],nextToken:null}
        : {items:[],nextToken:'page-2'}});
    }
    return ok({listResilienceAssessments:{items:mode==='existing-completed'?[{id:'db-1',assessmentId:'RIQ-001',status:'completed',respondentEmail:'consultant@example.com'}]
      :mode==='existing-other-owner'?[{id:'db-2',assessmentId:'RIQ-001',status:'draft',respondentEmail:'someone.else@example.com'}]:[],nextToken:null}});
  }
  mutations.push(request.variables.input);
  return ok({createResilienceAssessment:{id:'db-new',...request.variables.input},updateResilienceAssessment:{id:'db-up',...request.variables.input}});
};

// API Gateway validates the platform Cognito JWT; platform roles live in the application, not in Cognito
// groups, so any verified identity may call the API, but a request with no identity claims is rejected.
const forbidden=await handler(event('POST',{snapshot:{assessmentId:'RIQ-001'}} ,{}));
if(forbidden.statusCode!==403) throw new Error('Requests without an authenticated identity must be rejected');

const mismatch=await handler(event('POST',{action:'save',snapshot:{assessmentId:'RIQ-001',status:'draft',clientName:'Test Client',respondentEmail:'someone.else@example.com',answers:{},startedAt:'2026-10-06T00:00:00.000Z'}},{email:'user@example.com'}));
if(mismatch.statusCode!==403) throw new Error('A non-admin must not save an assessment for another respondent');

const created=await handler(event('POST',{
  action:'save',
  snapshot:{
    assessmentId:'RIQ-001',
    status:'draft',
    clientName:'Test Client',
    respondentEmail:'consultant@example.com',
    version:{engine:'1.0.0',questionBank:'1.0',scoringModel:'1.0',decisionTree:'1.0',blueprintEngine:'1.0',executiveReport:'1.0'},
    answers:{},
    startedAt:'2026-10-06T00:00:00.000Z'
  }
}));
if(created.statusCode!==200) throw new Error('Authorized draft assessment should persist');

mode='existing-completed';
const immutable=await handler(event('POST',{
  action:'save',
  snapshot:{
    assessmentId:'RIQ-001',
    status:'in_progress',
    clientName:'Test Client',
    respondentEmail:'consultant@example.com',
    version:{engine:'1.0.0'},
    answers:{},
    startedAt:'2026-10-06T00:00:00.000Z'
  }
}));
if(immutable.statusCode!==409) throw new Error('Completed assessment must be immutable');

mode='existing-other-owner';
const otherOwner=await handler(event('GET',undefined,{email:'consultant@example.com'}));
if(otherOwner.statusCode!==403) throw new Error("A non-admin must not read another respondent's assessment");
const adminRead=await handler(event('GET',undefined,{email:'admin@example.com','cognito:groups':['Admin']}));
if(adminRead.statusCode!==200) throw new Error('An admin may read any assessment');

// Taking over: a non-admin posts a snapshot naming themselves for an ID another respondent owns.
const takeover=await handler(event('POST',{action:'save',snapshot:{assessmentId:'RIQ-001',status:'in_progress',clientName:'Hijack',respondentEmail:'consultant@example.com',answers:{},startedAt:'2026-10-06T00:00:00.000Z'}},{email:'consultant@example.com'}));
if(takeover.statusCode!==403) throw new Error("A non-admin must not overwrite another respondent's assessment");


// ---- R4: the server owns the result, validates answers, pages through records, keeps archives immutable ----
const ready=ARCHETYPES['regulated-bank-tested'];
const snapshotFor=(extra:Record<string,unknown>)=>({assessmentId:'RIQ-001',clientName:'Test Client',respondentEmail:'consultant@example.com',startedAt:'2026-10-06T00:00:00.000Z',...extra});

mode='create'; mutations.length=0;
const forged=await handler(event('POST',{action:'complete',snapshot:snapshotFor({status:'completed',answers:ready,result:{score:100,rating:'Adaptive',status:'ready'}})}));
if(forged.statusCode!==200) throw new Error('A complete, valid assessment should be accepted');
const stored=JSON.parse(mutations[0].resultJson);
if(stored.score===100 || stored.rating!==evaluateResilienceIq(ready as any).rating) throw new Error('The stored result must be computed by the server, never taken from the browser');

mutations.length=0;
const incomplete=await handler(event('POST',{action:'complete',snapshot:snapshotFor({status:'completed',answers:ARCHETYPES['retailer-untested-gated']})}));
if(incomplete.statusCode!==409 || JSON.parse(String(incomplete.body)).error!=='assessment_incomplete' || mutations.length) throw new Error('An assessment the engine cannot score must not be completed');

const invalid=await handler(event('POST',{action:'save',snapshot:snapshotFor({status:'in_progress',answers:{'EX-06':2,'EX-99':'x'}})}));
if(invalid.statusCode!==400 || JSON.parse(String(invalid.body)).details?.length!==2) throw new Error('Invalid answers must be rejected with every problem listed');

mutations.length=0;
await handler(event('POST',{action:'save',snapshot:snapshotFor({status:'in_progress',answers:{},result:{score:99}})}));
if(mutations[0].resultJson!==undefined) throw new Error('A draft must not store a browser-supplied result');

mode='second-page'; mutations.length=0;
const paged=await handler(event('GET',undefined,{email:'consultant@example.com'}));
if(paged.statusCode!==200 || JSON.parse(String(paged.body)).data.id!=='db-9') throw new Error('Lookups must follow nextToken (records beyond the first page)');

mode='existing-completed'; mutations.length=0;
const archived=await handler(event('POST',{action:'archive',snapshot:snapshotFor({status:'archived',answers:{'EX-06':'No'}})}));
if(archived.statusCode!==200 || Object.keys(mutations[0]).sort().join()!=='finalizedAt,id,status') throw new Error('Archiving must change only status and finalizedAt, never answers or result');

mode='graphql-error';
const failed=await handler(event('GET',undefined,{email:'consultant@example.com'}));
const failedBody=String(failed.body);
if(failed.statusCode!==500 || /DynamoDB|table=/.test(failedBody)) throw new Error('Database errors must not be returned to the browser');

globalThis.fetch=originalFetch;
console.log('Resilience IQ assessment persistence handler tests passed');
