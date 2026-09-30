import http from "node:http";
import crypto from "node:crypto";

const port = Number(process.env.PORT || 8787);
const assessments = new Map();
const evidence = new Map();

function id(prefix) { return prefix + "_" + crypto.randomUUID(); }
function json(res, status, body, etag) {
  const raw = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  if (etag) res.setHeader("ETag", etag);
  res.end(raw);
}
function etagFor(value) {
  return '"' + crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,16) + '"';
}
async function body(req) {
  let s=""; for await (const c of req) s += c;
  return s ? JSON.parse(s) : {};
}
function principal(req) {
  return {
    subject: req.headers["x-demo-subject"] || "pilot-user",
    roles: (req.headers["x-demo-roles"] || "CIO,CONSULTANT").split(",").map(x=>x.trim()).filter(Boolean)
  };
}
function allowed(p, role) { return p.roles.includes(role) || p.roles.includes("ADMIN"); }

const server=http.createServer(async (req,res)=>{
  try {
    const p=principal(req);
    const url=new URL(req.url, "http://localhost");
    if (req.method==="GET" && url.pathname==="/health") return json(res,200,{status:"ok",release:"9.1.0",mode:"reference"});
    if (req.method==="GET" && url.pathname==="/me") return json(res,200,{principal:p});

    if (url.pathname==="/api/assessments" && req.method==="POST") {
      if (!allowed(p,"CIO") && !allowed(p,"CONSULTANT")) return json(res,403,{error:"forbidden"});
      const b=await body(req);
      const a={id:id("asmt"),version:1,status:"DRAFT",createdBy:p.subject,updatedBy:p.subject,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),client:b.client||{},answers:b.answers||{},metadata:b.metadata||{}};
      assessments.set(a.id,a); return json(res,201,a,etagFor(a));
    }
    const am=url.pathname.match(/^\/api\/assessments\/([^/]+)$/);
    if (am) {
      const a=assessments.get(am[1]);
      if (!a) return json(res,404,{error:"not_found"});
      if (req.method==="GET") return json(res,200,a,etagFor(a));
      if (req.method==="PUT") {
        if (!allowed(p,"CIO") && !allowed(p,"CONSULTANT")) return json(res,403,{error:"forbidden"});
        const incoming=await body(req);
        const ifMatch=req.headers["if-match"];
        const current=etagFor(a);
        if (ifMatch && ifMatch!==current) return json(res,412,{error:"etag_mismatch",currentEtag:current});
        const next={...a,...incoming,id:a.id,version:a.version+1,updatedBy:p.subject,updatedAt:new Date().toISOString()};
        assessments.set(a.id,next); return json(res,200,next,etagFor(next));
      }
    }

    if (url.pathname==="/api/evidence" && req.method==="POST") {
      if (!allowed(p,"CIO") && !allowed(p,"CONSULTANT")) return json(res,403,{error:"forbidden"});
      const b=await body(req);
      const e={id:id("ev"),assessmentId:b.assessmentId,type:b.type||"DOCUMENT",name:b.name||"unnamed",classification:b.classification||"INTERNAL",storageKey:b.storageKey||null,sha256:b.sha256||null,createdBy:p.subject,createdAt:new Date().toISOString()};
      evidence.set(e.id,e); return json(res,201,e);
    }
    const em=url.pathname.match(/^\/api\/evidence\?assessmentId=(.+)$/);
    if (em && req.method==="GET") {
      return json(res,200,[...evidence.values()].filter(x=>x.assessmentId===em[1]));
    }
    if (url.pathname==="/api/pilot/summary" && req.method==="GET") {
      return json(res,200,{release:"9.1.0",assessments:assessments.size,evidenceItems:evidence.size,environment:"REFERENCE_ONLY",ltmIntegration:"OPEN"});
    }
    return json(res,404,{error:"route_not_found"});
  } catch (e) { return json(res,500,{error:"server_error",message:e.message}); }
});
server.listen(port,()=>console.log("Cost IQ v9.1 reference API listening on :"+port));
