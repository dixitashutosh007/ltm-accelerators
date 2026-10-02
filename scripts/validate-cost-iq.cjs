'use strict';
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../packages/engine-core/src/accelerators/cost-iq');
const files=['canon/costiq-engine-v10.cjs','canon/config/master-v6.6.json','canon/config/finops-overlay-v7.1.0.json','canon/config/finding-activation-calibration-v7.1.1.json','canon/config/opportunity-recommendation-gates-v7.1.0.json','canon/RELEASE_MANIFEST.json','evaluate.cjs'];
for(const f of files){if(!fs.existsSync(path.join(root,f)))throw new Error('Missing Cost IQ release artifact: '+f);}
const adapter=require(path.join(root,'evaluate.cjs'));
const m=adapter.metadata();
const q=adapter.questions();
const checks=[
 ['questions',q.questions.length===105],
 ['dimensions',q.dimensions.length===16],
 ['findings',m.baseline.findings===20],
 ['recommendations',m.baseline.recommendations===10],
 ['finops-capabilities',m.finops.capabilities===22],
 ['finops-domains',m.finops.domains===4]
];
for(const [name,ok] of checks){if(!ok)throw new Error('Cost IQ validation failed: '+name);}
const empty=adapter.evaluateCostIq({answers:{}});
if(!empty || !empty.headlines || empty.headlines.costIQ!==null || empty.headlines.valueIQ!==null)throw new Error('Empty-assessment contract failed');
const neutral={};
for(const x of q.questions){if(x.required!==false && x.active!==false && x.interaction==='true-false')neutral[x.id]=false;}
console.log(JSON.stringify({status:'PASS',checks:checks.length,metadata:m.baseline,finops:m.finops,emptyHeadlines:empty.headlines},null,2));
