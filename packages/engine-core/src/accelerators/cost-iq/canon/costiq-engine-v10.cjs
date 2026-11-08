'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
const find=(a,id)=>(a||[]).find(x=>x.id===id);
const hasAnswer=(answers,id)=>answers[id]!==undefined&&answers[id]!==null&&answers[id]!=='';
// A question or finding test with applicableWhen counts only when the footprint answer names the estate; an unanswered footprint means not applicable, so nothing is scored low for an estate the client may not have.
const applies=(x,answers)=>!x?.applicableWhen||arr(answers[x.applicableWhen.questionId]).some(v=>arr(x.applicableWhen.anyOf).includes(String(v)));
// Which questions a client is asked (settings.selection, shared with the page): the baseline sections, the sections of the chosen focus
// areas, and every question gated on the footprint, when the footprint names its estate. Null when no areas are given (all questions).
const gatedOnFootprint=q=>q.applicableWhen?.questionId==='CORE-01';
function shownQuestionIds(config,selectedAreas,answers){
 const sel=config.settings?.selection;if(!sel||!Array.isArray(selectedAreas))return null;
 const secs=new Set(sel.baselineSections);for(const a of selectedAreas)for(const s of sel.areas?.[a]||[])secs.add(s);
 return new Set((config.questions||[]).filter(q=>(secs.has(q.section)||gatedOnFootprint(q))&&applies(q,answers)).map(q=>q.id));
}
const signalOnly=q=>q.signalOnly||['signal-only','hypothesis-signal','tradeoff-signal','constraint-signal'].includes(q.scoring?.method);
// The lowest score a scored question can give, which is what "Don't know" and a shown question left blank count as (scorecard area 3:
// Unknown is offered and counts as risk; area 5: missing answers never flatter). Null for a question that is not scored.
function lowestScore(q){
 if(signalOnly(q))return null;const s=q.scoring||{};
 if(s.defaultMap&&Object.keys(s.defaultMap).length)return clamp(Math.min(...Object.values(s.defaultMap).map(Number)));
 if(s.method==='scale'||s.scaleMax!=null||['direct-0-100','invert-0-100','range-band'].includes(s.normalize))return 0;
 return null;
}
function scoreQuestion(q,a,overrides={}){
 if(!hasAnswer({x:a},'x'))return null;
 if(signalOnly(q))return null;
 const o=overrides[q.id],s=q.scoring||{};
 if(a==='UNKNOWN'&&!(s.defaultMap&&Object.prototype.hasOwnProperty.call(s.defaultMap,'UNKNOWN')))return lowestScore(q);
 if(o?.method==='scale'||s.method==='scale'||s.scaleMax!=null){const n=Number(a),max=Number(o?.scaleMax||s.scaleMax||5),direction=o?.direction||s.direction;if(!Number.isFinite(n)||max<=1)return null;const p=(n-1)/(max-1)*100;return clamp(direction==='invert'?100-p:p);}
 if(s.normalize==='direct-0-100')return clamp(Number(a));
 if(s.normalize==='invert-0-100')return clamp(100-Number(a));
 if(s.normalize==='range-band')return typeof a==='number'?clamp(a):null;
 if(s.defaultMap&&Object.prototype.hasOwnProperty.call(s.defaultMap,String(a)))return clamp(Number(s.defaultMap[String(a)]));
 return null;
}
// `answered` counts real answers ("Don't know" included); `unanswered` counts shown questions left blank, scored as "Don't know".
// Without `shown` (no focus areas given) blanks are skipped, as before: the engine cannot tell which questions were asked.
function dimensions(config,answers,overrides={},shown=null){
 const ds=(config.dimensions||[]).map(d=>({...d,score:null,answered:0,unanswered:0})),m=new Map(ds.map(d=>[d.id,d]));
 for(const q of config.questions||[]){if(!applies(q,answers))continue;let s=scoreQuestion(q,answers[q.id],overrides),blank=false;if(s===null&&shown&&shown.has(q.id)&&!hasAnswer(answers,q.id)){s=lowestScore(q);blank=true;}if(s===null)continue;for(const id of q.scoring?.dimensionIds||[]){const d=m.get(id);if(d){d._sum=(d._sum||0)+s;d._n=(d._n||0)+1;if(blank)d.unanswered++;else d.answered++;}}}
 return ds.map(({_sum,_n,...d})=>({...d,score:_n?Math.round(_sum/_n):null}));
}
function headline(ds,type){const x=ds.filter(d=>d.type===type&&d.score!==null),w=x.reduce((n,d)=>n+(+d.weight||1),0);return w?Math.round(x.reduce((n,d)=>n+d.score*(+d.weight||1),0)/w):null;}
function evidenceState(config,answers,findings,gates={},shown=null){
 const required=(config.questions||[]).filter(q=>q.required!==false&&q.active!==false&&applies(q,answers)&&(!shown||shown.has(q.id)));const answered=required.filter(q=>hasAnswer(answers,q.id));
 const completeness=Math.round(answered.length/Math.max(1,required.length)*100),findingEvidence={};
 for(const f of findings){const gate=gates.findingGates?.[f.id];const req=arr(gate?.evidenceRequired);const present=req.filter(e=>hasAnswer(answers,e)||answers._evidence?.[f.id]?.includes(e));const missing=req.filter(e=>!present.includes(e));findingEvidence[f.id]={required:req,present,missing,sufficient:missing.length===0};}
 return {assessmentCompleteness:completeness,confidence:completeness>=90?'high':completeness>=70?'medium':'low',findingEvidence};
}
function opportunity(findings,gates,evidence,feasibility={}){return findings.map(f=>{const g=gates.findingGates?.[f.id];if(!g)return{findingId:f.id,economic:{status:'not-configured'},practical:{status:'not-configured'}};const ev=evidence.findingEvidence[f.id]||{sufficient:false,missing:g.evidenceRequired||[]};const economic=ev.sufficient?{status:'evidence-validated',quantificationAllowed:true,label:'Illustrative opportunity range — requires evidence validation'}:{status:'evidence-required',quantificationAllowed:false,missingEvidence:ev.missing};const factors=g.feasibilityFactors||[],supplied=feasibility[f.id]||{},missing=factors.filter(x=>supplied[x]===undefined||supplied[x]===null||supplied[x]==='');const practical=ev.sufficient&&missing.length===0?{status:'feasibility-validated',quantificationAllowed:true,feasibility:supplied}:{status:'feasibility-required',quantificationAllowed:false,missingFactors:missing};return{findingId:f.id,economic,practical,recommendationIds:g.recommendationIds||f.recommendationIds||[],doubleCountingProtected:true};});}
function evaluate(config,{calibration=null,opportunityGates=null,answers={},selectedAreas=null,options={},feasibility={}}={}){
 const shown=shownQuestionIds(config,selectedAreas,answers),ds=dimensions(config,answers,{},shown),findings=[];
 for(const [fid,tests] of Object.entries(calibration?.findingActivation||{})){const hits=tests.filter(t=>{if(!applies(t,answers))return false;const a=answers[t.questionId];if(!hasAnswer(answers,t.questionId))return false;return t.type==='option'?arr(a).some(x=>arr(t.triggerOptions).includes(String(x))):t.operator==='lt'?Number(a)<Number(t.value):t.operator==='gt'?Number(a)>Number(t.value):arr(t.triggerAnswers).includes(Number(a));});const f=find(config.findings,fid);if(f&&hits.length)findings.push({...f,activation:{type:'calibrated',evidenceSignals:hits}});}
 const rec=[...new Set(findings.flatMap(f=>f.recommendationIds||[]))].map(id=>find(config.recommendations,id)).filter(Boolean);
 const suppliedEvidence=options.evidence||answers._evidence||{};const evidenceAnswers={...answers,_evidence:suppliedEvidence};const evidence=evidenceState(config,evidenceAnswers,findings,opportunityGates||{},shown);const ops=opportunity(findings,opportunityGates||{},evidence,options.feasibilityEvidence||feasibility);
 return{methodology:{baseline:config.manifest?.masterVersion||null,engine:'Cost IQ v10 Phase A Unified Engine'},dimensions:ds,headlines:{costIQ:headline(ds,'cost'),valueIQ:headline(ds,'value')},evidence,findings,recommendations:rec,opportunities:ops,safeguards:{signalOnlyExcluded:true,hypothesisExcluded:true,genericThresholdFindingActivation:false,economicPracticalSeparated:true}};
}
module.exports={shownQuestionIds,scoreQuestion,lowestScore,dimensions,evidenceState,opportunity,evaluate};
