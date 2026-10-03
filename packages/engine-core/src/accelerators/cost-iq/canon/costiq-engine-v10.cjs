'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
const find=(a,id)=>(a||[]).find(x=>x.id===id);
const hasAnswer=(answers,id)=>answers[id]!==undefined&&answers[id]!==null&&answers[id]!=='';
function scoreQuestion(q,a,overrides={}){
 if(!hasAnswer({x:a},'x'))return null;
 if(q.signalOnly||['signal-only','hypothesis-signal','tradeoff-signal','constraint-signal'].includes(q.scoring?.method))return null;
 const o=overrides[q.id],s=q.scoring||{};
 if(o?.method==='scale'){const n=Number(a),max=Number(o.scaleMax||5);if(!Number.isFinite(n)||max<=1)return null;const p=(n-1)/(max-1)*100;return clamp(o.direction==='invert'?100-p:p);}
 if(s.normalize==='direct-0-100')return clamp(Number(a));
 if(s.normalize==='invert-0-100')return clamp(100-Number(a));
 if(s.normalize==='range-band')return typeof a==='number'?clamp(a):null;
 if(s.defaultMap&&Object.prototype.hasOwnProperty.call(s.defaultMap,String(a)))return clamp(Number(s.defaultMap[String(a)]));
 return null;
}
function dimensions(config,answers,overrides={}){
 const ds=(config.dimensions||[]).map(d=>({...d,score:null,answered:0})),m=new Map(ds.map(d=>[d.id,d]));
 for(const q of config.questions||[]){const s=scoreQuestion(q,answers[q.id],overrides);if(s===null)continue;for(const id of q.scoring?.dimensionIds||[]){const d=m.get(id);if(d){d._sum=(d._sum||0)+s;d.answered++;}}}
 return ds.map(({_sum,...d})=>({...d,score:d.answered?Math.round(_sum/d.answered):null}));
}
function headline(ds,type){const x=ds.filter(d=>d.type===type&&d.score!==null),w=x.reduce((n,d)=>n+(+d.weight||1),0);return w?Math.round(x.reduce((n,d)=>n+d.score*(+d.weight||1),0)/w):null;}
function evidenceState(config,answers,findings,gates={}){
 const required=(config.questions||[]).filter(q=>q.required!==false&&q.active!==false);const answered=required.filter(q=>hasAnswer(answers,q.id));
 const completeness=Math.round(answered.length/Math.max(1,required.length)*100),findingEvidence={};
 for(const f of findings){const gate=gates.findingGates?.[f.id];const req=arr(gate?.evidenceRequired);const present=req.filter(e=>hasAnswer(answers,e)||answers._evidence?.[f.id]?.includes(e));const missing=req.filter(e=>!present.includes(e));findingEvidence[f.id]={required:req,present,missing,sufficient:missing.length===0};}
 return {assessmentCompleteness:completeness,confidence:completeness>=90?'high':completeness>=70?'medium':'low',findingEvidence};
}
function opportunity(findings,gates,evidence,feasibility={}){return findings.map(f=>{const g=gates.findingGates?.[f.id];if(!g)return{findingId:f.id,economic:{status:'not-configured'},practical:{status:'not-configured'}};const ev=evidence.findingEvidence[f.id]||{sufficient:false,missing:g.evidenceRequired||[]};const economic=ev.sufficient?{status:'evidence-validated',quantificationAllowed:true,label:'Illustrative opportunity range — requires evidence validation'}:{status:'evidence-required',quantificationAllowed:false,missingEvidence:ev.missing};const factors=g.feasibilityFactors||[],supplied=feasibility[f.id]||{},missing=factors.filter(x=>supplied[x]===undefined||supplied[x]===null||supplied[x]==='');const practical=ev.sufficient&&missing.length===0?{status:'feasibility-validated',quantificationAllowed:true,feasibility:supplied}:{status:'feasibility-required',quantificationAllowed:false,missingFactors:missing};return{findingId:f.id,economic,practical,recommendationIds:g.recommendationIds||f.recommendationIds||[],doubleCountingProtected:true};});}
function adaptiveSelection(coverage,scores,answers,threshold=70){const selected=[];for(const [cap,meta] of Object.entries(coverage||{})){const score=scores?.[cap];if(score!=null&&Number(score)>=threshold)continue;for(const qid of arr(meta.questionIds||meta))if(!hasAnswer(answers,qid))selected.push(qid);}return[...new Set(selected)];}
function finopsHeatmap(overlay,scope,answers){if(!scope?.enabled)return{enabled:false,rows:[]};const domainMap={};for(const d of (overlay.frameworkDomains||[]))for(const c of d.capabilities||[])domainMap[c]=d.name;return{enabled:true,rows:Object.keys(overlay.capabilityMappings||{}).map(cap=>{const score=scope.capabilityScores?.[cap];return{capability:cap,domain:domainMap[cap]||null,score:score??null,maturity:score>=85?'RUN':score>=60?'WALK':score!=null?'CRAWL':'NOT_ASSESSED',questionIds:arr(overlay.capabilityMappings[cap]),assessed:arr(overlay.capabilityMappings[cap]).some(q=>hasAnswer(answers,q))};})};}
function evaluate(config,{overlay=null,calibration=null,opportunityGates=null,answers={},scope=null,capabilityScores={},options={},feasibility={}}={}){
 const merged={...config,questions:[...(config.questions||[]),...(overlay?.supplementalQuestions||[])]};
 const ds=dimensions(merged,answers,overlay?.questionScoringOverrides||{}),findings=[];
 for(const [fid,tests] of Object.entries(calibration?.findingActivation||{})){const hits=tests.filter(t=>{const a=answers[t.questionId];if(!hasAnswer(answers,t.questionId))return false;return t.type==='option'?arr(a).some(x=>arr(t.triggerOptions).includes(String(x))):t.operator==='lt'?Number(a)<Number(t.value):t.operator==='gt'?Number(a)>Number(t.value):arr(t.triggerAnswers).includes(Number(a));});const f=find(config.findings,fid);if(f&&hits.length)findings.push({...f,activation:{type:'calibrated',evidenceSignals:hits}});}
 for(const q of overlay?.supplementalQuestions||[]){if(!hasAnswer(answers,q.id))continue;for(const fid of arr(q.findingActivationRules?.[String(answers[q.id])]||[])){const f=find(config.findings,fid);if(f&&!findings.some(y=>y.id===f.id))findings.push({...f,activation:{type:'supplemental',evidenceSignals:[{questionId:q.id,answer:answers[q.id]}]}});}}
 const rec=[...new Set(findings.flatMap(f=>f.recommendationIds||[]))].map(id=>find(config.recommendations,id)).filter(Boolean);
 const suppliedEvidence=options.evidence||answers._evidence||{};const evidenceAnswers={...answers,_evidence:suppliedEvidence};const evidence=evidenceState(config,evidenceAnswers,findings,opportunityGates||{});const finops=finopsHeatmap(overlay,scope,answers);const ops=opportunity(findings,opportunityGates||{},evidence,options.feasibilityEvidence||feasibility);
 return{methodology:{baseline:config.manifest?.masterVersion||null,engine:'Cost IQ v10 Phase A Unified Engine',overlay:overlay?.version||null},dimensions:ds,headlines:{costIQ:headline(ds,'cost'),valueIQ:headline(ds,'value')},evidence,finops,findings,recommendations:rec,opportunities:ops,safeguards:{signalOnlyExcluded:true,hypothesisExcluded:true,genericThresholdFindingActivation:false,economicPracticalSeparated:true},adaptiveStopping:{capabilityThreshold:70,nextQuestionIds:adaptiveSelection(scope?.coverage||{},capabilityScores,answers)}};
}
module.exports={scoreQuestion,dimensions,evidenceState,opportunity,adaptiveSelection,finopsHeatmap,evaluate};