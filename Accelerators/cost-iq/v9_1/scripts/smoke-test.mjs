const base=process.env.CIQ_API||"http://localhost:8787";
const assert=(c,m)=>{if(!c)throw new Error(m)};
async function req(path,opt){const r=await fetch(base+path,opt);const j=await r.json();return {r,j};}
const h=await req("/health"); assert(h.r.status===200,"health");
const m=await req("/me"); assert(m.j.principal==="undefined" || m.j.subject,"principal");
const c=await req("/api/assessments",{method:"POST",headers:{"content-type":"application/json","x-demo-subject":"smoke","x-demo-roles":"CONSULTANT"},body:JSON.stringify({client:{name:"Smoke"}})});
assert(c.r.status===201 && c.r.headers.get("etag"),"create");
const a=c.j; const e=c.r.headers.get("etag");
const u=await req("/api/assessments/"+a.id,{method:"PUT",headers:{"content-type":"application/json","if-match":e,"x-demo-subject":"smoke","x-demo-roles":"CONSULTANT"},body:JSON.stringify({answers:{"CORE-06":4}})});
assert(u.r.status===200 && u.j.version===2,"update");
const stale=await req("/api/assessments/"+a.id,{method:"PUT",headers:{"content-type":"application/json","if-match":e,"x-demo-subject":"smoke","x-demo-roles":"CONSULTANT"},body:JSON.stringify({answers:{"CORE-07":["value"]}})});
assert(stale.r.status===412,"etag");
const ev=await req("/api/evidence",{method:"POST",headers:{"content-type":"application/json","x-demo-subject":"smoke","x-demo-roles":"CONSULTANT"},body:JSON.stringify({assessmentId:a.id,name:"sample.pdf",sha256:"synthetic"}}); assert(ev.r.status===201,"evidence");
console.log("Cost IQ v9.1 smoke test: PASS");
