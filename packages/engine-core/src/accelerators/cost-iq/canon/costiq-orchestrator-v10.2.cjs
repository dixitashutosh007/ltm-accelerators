'use strict';
const { overlay } = require('./costiq-engine-v10.cjs');

const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
const unique=a=>[...new Set(a)];
const DEFAULT_CATEGORY_MAP={
 PUBLIC_CLOUD:'PUBLIC_CLOUD',SAAS:'SAAS',SOFTWARE:'LICENSES',ON_PREM:'DATA_CENTER',
 PRIVATE_CLOUD:'PRIVATE_CLOUD',VMWARE:'PRIVATE_CLOUD',EXTERNAL:'MANAGED_SERVICES',
 MANAGED_SERVICES:'MANAGED_SERVICES',COLO:'COLOCATION',NETWORK:'NETWORK',SECURITY:'SECURITY',
 AI:'AI',DATA:'DATA_CLOUD_PLATFORM'
};

function deriveTechnologyCategories(coreAnswers={},explicitScope={}){
 const selected=arr(coreAnswers['CORE-01']).map(String);
 const categories=unique(selected.map(x=>DEFAULT_CATEGORY_MAP[x]).filter(Boolean));
 const candidates=[];
 if(selected.includes('DATA'))candidates.push('DATA_CLOUD_PLATFORM');
 if(selected.includes('PUBLIC_CLOUD')&&!selected.includes('AI'))candidates.push('AI');
 return {categories,categoryCandidates:unique(candidates),source:'CORE-01',explicit:explicitScope.technologyCategories||null};
}
function resolveScope(options={}){
 const fs=options.finopsScope||null;
 if(!fs)return{enabled:false,reason:'No explicit FinOps scope selected',scope:null};
 return{enabled:true,scope:{id:fs.id||'FINOPS-SCOPE-01',name:fs.name||'Technology-wide FinOps Scope',technologyCategories:unique(arr(fs.technologyCategories).map(String)),constructs:unique(arr(fs.constructs||[]).map(String))},source:'explicit'};
}
function relevantCapabilities(scope,tech){
 if(!scope.enabled)return[];
 const out=[];
 for(const [cap,relevance] of Object.entries(overlay.capabilityRelevance||{})){
  if(relevance==='always'){out.push(cap);continue;}
  const hit=Object.entries(overlay.technologyCategoryCapabilityTriggers||{}).some(([cat,caps])=>caps.includes(cap)&&tech.categories.includes(cat));
  if(hit)out.push(cap);
 }
 return unique(out);
}
function activeSupplementals(caps,tech){
 const capSet=new Set(caps),catSet=new Set(tech.categories);
 return(overlay.supplementalQuestions||[]).filter(q=>{
  if(q.id==='FIN-01')return true;
  const acts=arr(q.activationCapabilities),cats=arr(q.activationTechnologyCategories);
  return(acts.length&&acts.some(x=>capSet.has(x)))||(cats.length&&cats.some(x=>catSet.has(x)))||(!acts.length&&!cats.length);
 }).map(q=>q.id);
}
function orchestrate({answers={},options={}}={}){
 const scope=resolveScope(options),tech=deriveTechnologyCategories(answers,scope.scope||{});
 if(scope.enabled&&scope.scope.technologyCategories.length)tech.categories=scope.scope.technologyCategories;
 const caps=relevantCapabilities(scope,tech),active=scope.enabled?activeSupplementals(caps,tech):[];
 return{enabled:scope.enabled,scope:scope.scope,technology:tech,relevantCapabilities:caps,activeSupplementalQuestionIds:active,supplementalQuestionCount:active.length,routingPolicy:'CORE baseline + relevant FinOps adaptive questions',safeguards:{noFinOpsScopeNoFinOpsQuestions:true,signalOnlyQuestionsRemainSignalOnly:true,candidateCategoriesDoNotActivateCapabilities:true}};
}
module.exports={orchestrate,deriveTechnologyCategories,resolveScope};
