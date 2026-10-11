import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler as rawHandler } from './handler';

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
let mode:'create'|'existing-completed'|'existing-other-owner'='create';
globalThis.fetch=async (_input:any, init:any)=>{
  const request=JSON.parse(init.body);
  if(request.query.includes('listResilienceAssessments')){
    return new Response(JSON.stringify({
      data:{listResilienceAssessments:{items:mode==='existing-completed'?[{id:'db-1',assessmentId:'RIQ-001',status:'completed',respondentEmail:'consultant@example.com'}]
        :mode==='existing-other-owner'?[{id:'db-2',assessmentId:'RIQ-001',status:'draft',respondentEmail:'someone.else@example.com'}]:[]}}
    }),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response(JSON.stringify({
    data:{createResilienceAssessment:{id:'db-new',assessmentId:'RIQ-001',status:'draft'}},
  }),{status:200,headers:{'content-type':'application/json'}});
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

globalThis.fetch=originalFetch;
console.log('Resilience IQ assessment persistence handler tests passed');
