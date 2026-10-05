'use strict';
const fs=require('fs');
const path=require('path');

const root=process.cwd();
const html=fs.readFileSync(path.join(root,'Accelerators/resilience-iq.html'),'utf8');
const generator=fs.readFileSync(path.join(root,'scripts/generate-cost-iq-runtime-config.cjs'),'utf8');
const backend=fs.readFileSync(path.join(root,'amplify/backend.ts'),'utf8');

const checks=[
  ['Resilience IQ page loads shared runtime config', html.includes('cost-iq-runtime-config.js')],
  ['Resilience IQ page reads RESILIENCE_IQ_API', html.includes('RESILIENCE_IQ_API')],
  ['Amplify backend exposes Resilience IQ route', backend.includes("/api/evaluate/resilience-iq")],
  ['Resilience IQ assessment persistence route is Cognito protected', backend.includes("/api/resilience-iq/assessment") && backend.includes('ResilienceAssessmentAuthorizer')],
  ['Resilience IQ page includes Amplify authentication bootstrap', html.includes('resilienceAuthReady') && html.includes('signIn')],
  ['Runtime config generator declares RESILIENCE_IQ_API', generator.includes("window.RESILIENCE_IQ_API='")]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log((ok?'PASS':'FAIL')+' '+name);
if(failed.length) throw new Error('Resilience IQ deployment contract validation failed.');
console.log('Resilience IQ deployment contract validated.');
