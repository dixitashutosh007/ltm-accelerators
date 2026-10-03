'use strict';

const DEFAULT_CATEGORY_MAP={
 PUBLIC_CLOUD:'PUBLIC_CLOUD', SAAS:'SAAS', SOFTWARE:'LICENSES', ON_PREM:'DATA_CENTER', PRIVATE_CLOUD:'PRIVATE_CLOUD',
 VMWARE:'PRIVATE_CLOUD', EXTERNAL:'MANAGED_SERVICES', MANAGED_SERVICES:'MANAGED_SERVICES', COLO:'COLOCATION', NETWORK:'NETWORK', SECURITY:'SECURITY', AI:'AI', DATA:'DATA_CLOUD_PLATFORM'
};

function arr(v){return Array.isArray(v)?v:(v==null||v===''?[]:[v]);}
function unique(a){return [...new Set(a)];}

function deriveTechnologyCategories(coreAnswers={}, explicitScope={}){
 const selected=arr(coreAnswers['CORE-01']).map(String);
 const categories=unique(selected.map(x=>DEFAULT_CATEGORY_MAP[x]).filter(Boolean));
 const candidates=[];
 if(selected.includes('DATA')) candidates.push('DATA_CLOUD_PLATFORM');
 if(selected.includes('PUBLIC_CLOUD') && !selected.includes('AI')) candidates.push('AI');
 return {categories,categoryCandidates:unique(candidates),source:'CORE-01',explicit:explicitScope.technologyCategories||null};
}

function resolveScope(options={}, coreAnswers={}){
 const fs=options.finopsScope||null;
 if(!fs) return {enabled:false,reason:'No explicit FinOps scope selected',scope:null};
 const cats=unique(arr(fs.technologyCategories).map(String));
 const constructs=unique(arr(fs.constructs||[]).map(String));
 return {enabled:true,scope:{id:fs.id||'FINOPS-SCOPE-01',name:fs.name||'Technology-wide FinOps Scope',technologyCategories:cats,constructs},source:'explicit'};
}

function relevantCapabilities(overlay, scope, tech){
 if(!scope.enabled) return [];
 const out=[];
 for(const [cap,relevance] of Object.entries(overlay.capabilityRelevance||{})){
   if(relevance==='always'){out.push(cap);continue;}
   const triggerCats=Object.entries(overlay.technologyCategoryCapabilityTriggers||{})
     .filter(([cat,caps])=>caps.includes(cap)&&tech.categories.includes(cat)).map(([cat])=>cat);
   if(triggerCats.length) out.push(cap);
 }
 return unique(out);
}

function activeSupplementals(overlay, caps, tech){
 const capSet=new Set(caps), catSet=new Set(tech.categories);
 return (overlay.supplementalQuestions||[]).filter(q=>{
   if(q.id==='FIN-01') return true;
   const acts=arr(q.activationCapabilities);
   if(acts.length && acts.some(x=>capSet.has(x))) return true;
   const cats=arr(q.activationTechnologyCategories);
   if(cats.length && cats.some(x=>catSet.has(x))) return true;
   return !acts.length && !cats.length;
 }).map(q=>q.id);
}

function capabilityQuestionCoverage(overlay,caps){
 const mappings=overlay.capabilityMappings||{};
 return Object.fromEntries(caps.map(c=>[c,unique(arr(mappings[c]))]));
}

function orchestrate({overlay,answers={},options={}}){
 const scope=resolveScope(options,answers);
 const tech=deriveTechnologyCategories(answers,scope.scope||{});
 if(scope.enabled && scope.scope.technologyCategories.length) tech.categories=scope.scope.technologyCategories;
 const caps=relevantCapabilities(overlay,scope,tech);
 const active=scope.enabled?activeSupplementals(overlay,caps,tech):[];
 return {
  enabled:scope.enabled, scope:scope.scope, technology:tech, relevantCapabilities:caps,
  activeSupplementalQuestionIds:active,
  supplementalQuestionCount:active.length,
  capabilityQuestionCoverage:capabilityQuestionCoverage(overlay,caps),
  routingPolicy:'CORE baseline + relevant FinOps adaptive questions',
  safeguards:{noFinOpsScopeNoFinOpsQuestions:true,signalOnlyQuestionsRemainSignalOnly:true,candidateCategoriesDoNotActivateCapabilities:true}
 };
}

module.exports={DEFAULT_CATEGORY_MAP,deriveTechnologyCategories,resolveScope,relevantCapabilities,activeSupplementals,capabilityQuestionCoverage,orchestrate};