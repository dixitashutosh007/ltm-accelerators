import { generateKeyPairSync, sign } from 'node:crypto';
import assert from 'node:assert/strict';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

process.env.AWS_REGION='ap-south-1'; process.env.USER_POOL_ID='ap-south-1_91amN2bz4'; process.env.COGNITO_CLIENT_ID='4iiqcsgvsm0b4ngpps94ho4c67'; process.env.SUPER_ADMIN_EMAILS='owner@ltm.com'; process.env.AWS_ACCESS_KEY_ID='x'; process.env.AWS_SECRET_ACCESS_KEY='y';
const ISS='https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_91amN2bz4', AUD='4iiqcsgvsm0b4ngpps94ho4c67';
const { publicKey, privateKey } = generateKeyPairSync('rsa',{modulusLength:2048});
const other = generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'k1',alg:'RS256',use:'sig'};
globalThis.fetch=async(u)=>{assert.equal(u,ISS+'/.well-known/jwks.json');return {ok:true,json:async()=>({keys:[jwk]})}};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function tok(claims,{key=privateKey,kid='k1'}={}){const h=b64({alg:'RS256',kid});const p=b64({iss:ISS,aud:AUD,token_use:'id',exp:Math.floor(Date.now()/1000)+600,...claims});return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),key).toString('base64url');}

// S3 + Cognito mocks
const s3calls=[]; let perms={users:{'consultant@ltm.com':{role:'advisor_viewer',permissions:{view:['cloud-iq'],edit:[]}},'reporter@ltm.com':{permissions:{view:['reports'],edit:['reports']}},'fvc@ltm.com':{permissions:{take:['finops-value-case']}}}};
// Domain rules (P1): one object with ETag-checked writes, plus the audit entries.
const dom={obj:null,seq:0,audit:new Map(),down:false};
S3Client.prototype.send=async function(cmd){const n=cmd.constructor.name;s3calls.push([n,cmd.input.Key]);
  const K=cmd.input.Key||'', P=cmd.input.Prefix||'';
  if(K==='config/domain-rules.json'||K.startsWith('config/domain-rules-audit/')||P.startsWith('config/domain-rules-audit/')){
    if(dom.down)throw Object.assign(new Error('network'),{name:'TimeoutError'});
    const pre=()=>Object.assign(new Error('precondition'),{name:'PreconditionFailed',$metadata:{httpStatusCode:412}});
    if(K==='config/domain-rules.json'){
      if(n==='GetObjectCommand'){if(!dom.obj)throw Object.assign(new Error('missing'),{name:'NoSuchKey'});return{Body:{transformToString:async()=>dom.obj.body},ETag:dom.obj.etag};}
      if(n==='PutObjectCommand'){const i=cmd.input;if((i.IfMatch&&(!dom.obj||dom.obj.etag!==i.IfMatch))||(i.IfNoneMatch==='*'&&dom.obj))throw pre();dom.obj={body:Buffer.from(i.Body).toString(),etag:'"e'+(++dom.seq)+'"'};return{};}
    }
    if(n==='PutObjectCommand'){dom.audit.set(K,Buffer.from(cmd.input.Body).toString());return{};}
    if(n==='ListObjectsV2Command')return{Contents:[...dom.audit.keys()].map(Key=>({Key})),IsTruncated:false};
    if(n==='GetObjectCommand')return{Body:{transformToString:async()=>dom.audit.get(K)}};
  }
  if(n==='GetObjectCommand'&&cmd.input.Key==='config/rbac-permissions.json')return{Body:{transformToString:async()=>JSON.stringify(perms)}};
  if(n==='ListObjectsV2Command')return{Contents:[{Key:'reports/cloud-iq/A_1.pdf',Size:10,LastModified:new Date()}]};
  if(n==='GetObjectCommand')return{Body:{transformToString:async()=>JSON.stringify({clientName:'Acme'})}};
  return {};};
const cog=[]; CognitoIdentityProviderClient.prototype.send=async function(cmd){cog.push(cmd.constructor.name); if(cmd.constructor.name==='ListUsersCommand')return{Users:[]};return{};};

const { handler } = await import('../index.mjs');
const ORIGIN='https://main.d199dq940iqyj2.amplifyapp.com';
const call=(method,path,{token,body,origin=ORIGIN}={})=>handler({rawPath:path,requestContext:{http:{method}},headers:{origin,...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined}).then(r=>({...r,json:r.body?JSON.parse(r.body):null}));

const admin=tok({email:'owner@ltm.com',sub:'a'}), groupAdmin=tok({email:'boss@ltm.com','cognito:groups':['Admin']});
const consultant=tok({email:'consultant@ltm.com'}), reporter=tok({email:'reporter@ltm.com'});
let r; const t=async(name,fn)=>{try{await fn();console.log('PASS',name)}catch(e){console.log('FAIL',name,e.message);process.exitCode=1}};
const pdf=Buffer.concat([Buffer.from('%PDF-1.4\n'),Buffer.alloc(100,65)]).toString('base64');

await t('no token -> 401 on every route',async()=>{for(const [m,p] of [['GET','/api/users'],['GET','/api/me'],['GET','/api/reports/list'],['POST','/api/reports/save'],['POST','/api/reports/delete'],['POST','/api/users/create'],['POST','/api/users/set-password'],['POST','/api/users/permissions'],['POST','/api/reports/rename']]){r=await call(m,p,{body:{requesterEmail:'owner@ltm.com'}});assert.equal(r.statusCode,401,p);}});
await t('reset-password removed -> 410, no Cognito call',async()=>{const n=cog.length;r=await call('POST','/api/auth/reset-password',{body:{email:'owner@ltm.com',newPassword:'Hacked123!'}});assert.equal(r.statusCode,410);assert.equal(cog.length,n);});
await t('forged token (wrong key) -> 401',async()=>{r=await call('GET','/api/users',{token:tok({email:'owner@ltm.com'},{key:other.privateKey})});assert.equal(r.statusCode,401);});
await t('expired token -> 401',async()=>{r=await call('GET','/api/me',{token:tok({email:'consultant@ltm.com',exp:1000})});assert.equal(r.statusCode,401);});
await t('wrong audience -> 401',async()=>{r=await call('GET','/api/me',{token:tok({email:'consultant@ltm.com',aud:'other'})});assert.equal(r.statusCode,401);});
await t('access token (token_use=access) -> 401',async()=>{r=await call('GET','/api/me',{token:tok({email:'consultant@ltm.com',token_use:'access'})});assert.equal(r.statusCode,401);});
await t('alg none -> 401',async()=>{const h=b64({alg:'none',kid:'k1'}),p=b64({iss:ISS,aud:AUD,token_use:'id',exp:9999999999,email:'owner@ltm.com'});r=await call('GET','/api/users',{token:h+'.'+p+'.'});assert.equal(r.statusCode,401);});
await t('admin lists users',async()=>{r=await call('GET','/api/users',{token:admin});assert.equal(r.statusCode,200);});
await t('Admin group member lists users',async()=>{r=await call('GET','/api/users',{token:groupAdmin});assert.equal(r.statusCode,200);});
await t('consultant cannot list users even with requesterEmail spoof',async()=>{r=await call('GET','/api/users',{token:consultant});assert.equal(r.statusCode,403);});
await t('consultant cannot set admin password (spoofed requesterEmail ignored)',async()=>{const n=cog.length;r=await call('POST','/api/users/set-password',{token:consultant,body:{email:'owner@ltm.com',newPassword:'Hacked123!',requesterEmail:'owner@ltm.com'}});assert.equal(r.statusCode,403);assert.equal(cog.length,n);});
await t('consultant cannot create users / change permissions',async()=>{r=await call('POST','/api/users/create',{token:consultant,body:{email:'x@y.com',password:'Abcdefgh1!',requesterEmail:'owner@ltm.com'}});assert.equal(r.statusCode,403);r=await call('POST','/api/users/permissions',{token:consultant,body:{email:'consultant@ltm.com',permissions:{view:['reports']}}});assert.equal(r.statusCode,403);});
await t('admin sets password',async()=>{r=await call('POST','/api/users/set-password',{token:admin,body:{email:'consultant@ltm.com',newPassword:'Abcdefgh1!'}});assert.equal(r.statusCode,200);});
// ---- Domain access (P1) ----
const partner=tok({email:'pat@partner.com'}), ally=tok({email:'ann@partner.com'});
await t('domain rules: non-admins cannot read, change or check them',async()=>{for(const [m,p] of [['GET','/api/domain-rules'],['POST','/api/domain-rules'],['GET','/api/domain-rules/audit'],['POST','/api/domain-rules/check']]){r=await call(m,p,{token:consultant,body:{op:'set',kind:'domain',value:'x.com',action:'allow'}});assert.equal(r.statusCode,403,m+' '+p);}assert.deepEqual(JSON.parse(dom.obj.body).rules,[]);});
await t('domain rules: the first request creates the empty rules file, so services that can only read it do not see a missing object',async()=>{assert.ok(dom.obj,'file created');assert.deepEqual(JSON.parse(dom.obj.body),{version:1,rules:[]});assert.ok(s3calls.some(c=>c[0]==='PutObjectCommand'&&c[1]==='config/domain-rules.json'));});
await t('domain rules: admin lists the baseline and protected entries',async()=>{r=await call('GET','/api/domain-rules',{token:admin});assert.equal(r.statusCode,200);assert.deepEqual(r.json.rules,[]);assert.ok(r.json.protected.domains.includes('ltm.com'));assert.ok(r.json.protected.emails.includes('owner@ltm.com'));});
await t('domain rules: an address that is not listed is refused on every request',async()=>{r=await call('GET','/api/me',{token:partner});assert.equal(r.statusCode,403);assert.equal(r.json.error,'account_blocked');});
await t('domain rules: admin allows a domain, and its users get in',async()=>{r=await call('POST','/api/domain-rules',{token:admin,body:{op:'set',kind:'domain',value:'Partner.com',action:'allow',note:'Pilot'}});assert.equal(r.statusCode,200,JSON.stringify(r.json));assert.equal(r.json.rules[0].value,'partner.com');r=await call('GET','/api/me',{token:partner});assert.equal(r.statusCode,200);});
await t('domain rules: blocking the domain stops them on their next request, even with a valid token',async()=>{r=await call('POST','/api/domain-rules',{token:admin,body:{op:'set',kind:'domain',value:'partner.com',action:'block'}});assert.equal(r.statusCode,200);r=await call('GET','/api/me',{token:partner});assert.equal(r.statusCode,403);assert.equal(r.json.error,'account_blocked');});
await t('domain rules: one address can be allowed through a blocked domain',async()=>{r=await call('POST','/api/domain-rules',{token:admin,body:{op:'set',kind:'email',value:'ann@partner.com',action:'allow'}});assert.equal(r.statusCode,200);r=await call('GET','/api/me',{token:ally});assert.equal(r.statusCode,200);r=await call('GET','/api/me',{token:partner});assert.equal(r.statusCode,403);});
await t('domain rules: a protected domain or address cannot be blocked',async()=>{for(const body of [{op:'set',kind:'domain',value:'ltm.com',action:'block'},{op:'set',kind:'email',value:'owner@ltm.com',action:'block'},{op:'set',kind:'email',value:'anyone@ltm.com',action:'block'}]){r=await call('POST','/api/domain-rules',{token:admin,body});assert.equal(r.statusCode,400,JSON.stringify(body));assert.match(r.json.error,/^protected_/);}});
await t('domain rules: invalid values and unknown operations are refused with a reason',async()=>{for(const body of [{op:'set',kind:'domain',value:'*.x.com',action:'allow'},{op:'set',kind:'email',value:'nope',action:'allow'},{op:'set',kind:'domain',value:'x.com',action:'maybe'},{op:'nuke'},{op:'remove',id:'missing'}]){r=await call('POST','/api/domain-rules',{token:admin,body});assert.ok(r.statusCode===400||r.statusCode===404,JSON.stringify(body)+' '+r.statusCode);assert.ok(r.json.error);}});
await t('domain rules: the check endpoint says what the rules decide, and the audit trail names who changed what',async()=>{r=await call('POST','/api/domain-rules/check',{token:admin,body:{email:'x@partner.com'}});assert.equal(r.json.decision.reason,'domain_blocked');r=await call('GET','/api/domain-rules/audit',{token:admin});assert.equal(r.statusCode,200);assert.ok(r.json.entries.length>=3);assert.ok(r.json.entries.every(e=>e.by==='owner@ltm.com'&&e.rule&&e.at));});
await t('domain rules: removing the block lets the domain back in (after the short cache)',async()=>{const id=(await call('GET','/api/domain-rules',{token:admin})).json.rules.find(x=>x.kind==='domain').id;r=await call('POST','/api/domain-rules',{token:admin,body:{op:'remove',id}});assert.equal(r.statusCode,200);r=await call('POST','/api/domain-rules/check',{token:admin,body:{email:'x@partner.com'}});assert.equal(r.json.decision.allowed,false);assert.equal(r.json.decision.reason,'not_listed');});
await t('domain rules: a stale write is refused with 409 and loses nothing',async()=>{const before=dom.obj.body;const realSend=S3Client.prototype.send;let first=true;S3Client.prototype.send=async function(cmd){if(first&&cmd.constructor.name==='PutObjectCommand'&&cmd.input.Key==='config/domain-rules.json'){first=false;dom.obj={body:dom.obj.body,etag:'"changed-elsewhere"'};}return realSend.call(this,cmd);};try{r=await call('POST','/api/domain-rules',{token:admin,body:{op:'set',kind:'domain',value:'late.com',action:'allow'}});}finally{S3Client.prototype.send=realSend;}assert.equal(r.statusCode,409);assert.equal(r.json.error,'conflict');assert.equal(dom.obj.body,before);});
await t('domain rules: an unreadable rule list refuses ordinary users but never protected ones, who can still repair it',async()=>{
  // A copy read within the last 15 minutes stands in for a short outage, so the clock is moved past that window.
  const realNow=Date.now; Date.now=()=>realNow()+16*60*1000; dom.down=true;
  try{
    const a=tok({email:'ann@partner.com'}), c=tok({email:'consultant@ltm.com'}), ad=tok({email:'owner@ltm.com'});
    r=await call('GET','/api/me',{token:a});assert.equal(r.statusCode,503);assert.equal(r.json.error,'access_check_unavailable');
    r=await call('GET','/api/me',{token:c});assert.equal(r.statusCode,200);
    r=await call('GET','/api/domain-rules',{token:ad});assert.equal(r.statusCode,503);
  }finally{Date.now=realNow;dom.down=false;}
  r=await call('GET','/api/domain-rules',{token:admin});assert.equal(r.statusCode,200);
});
await t('/api/me returns own permissions',async()=>{r=await call('GET','/api/me',{token:consultant});assert.equal(r.statusCode,200);assert.deepEqual(r.json.permissions.view,['cloud-iq']);r=await call('GET','/api/me',{token:admin});assert.equal(r.json.role,'super_admin');});
await t('consultant cannot list reports',async()=>{r=await call('GET','/api/reports/list',{token:consultant});assert.equal(r.statusCode,403);});
await t('reporter lists reports with 15-min URLs, no bucket name leak',async()=>{r=await call('GET','/api/reports/list',{token:reporter});assert.equal(r.statusCode,200);assert.equal(r.json.count,1);assert.match(r.json.reports[0].downloadUrl,/X-Amz-Expires=900/);assert.ok(!('bucket' in r.json));});
await t('consultant saves report for permitted accelerator only',async()=>{r=await call('POST','/api/reports/save',{token:consultant,body:{acceleratorId:'cloud-iq',clientName:'Acme',pdfBase64:pdf}});assert.equal(r.statusCode,200);assert.match(r.json.downloadUrl,/X-Amz-Expires=900/);r=await call('POST','/api/reports/save',{token:consultant,body:{acceleratorId:'posture-iq',pdfBase64:pdf}});assert.equal(r.statusCode,403);});
await t('non-PDF upload rejected',async()=>{r=await call('POST','/api/reports/save',{token:admin,body:{acceleratorId:'cloud-iq',pdfBase64:Buffer.from('<html>'.repeat(30)).toString('base64')}});assert.equal(r.statusCode,400);});
await t('FinOps Value Case permission archives FinOps IQ reports (retired tool, 22 Oct 2026)',async()=>{const fvc=tok({email:'fvc@ltm.com'});r=await call('POST','/api/reports/save',{token:fvc,body:{acceleratorId:'finops-iq',clientName:'Acme',pdfBase64:pdf}});assert.equal(r.statusCode,200);r=await call('POST','/api/reports/save',{token:fvc,body:{acceleratorId:'cloud-iq',pdfBase64:pdf}});assert.equal(r.statusCode,403);});
await t('delete restricted to report keys (cannot delete RBAC config)',async()=>{r=await call('POST','/api/reports/delete',{token:admin,body:{key:'config/rbac-permissions.json'}});assert.equal(r.statusCode,400);r=await call('POST','/api/reports/delete',{token:admin,body:{key:'reports/../config/x.pdf'}});assert.equal(r.statusCode,400);r=await call('POST','/api/reports/delete',{token:reporter,body:{key:'reports/cloud-iq/A_1.pdf'}});assert.equal(r.statusCode,200);r=await call('POST','/api/reports/delete',{token:consultant,body:{key:'reports/cloud-iq/A_1.pdf'}});assert.equal(r.statusCode,403);});
await t('CORS: allowed origin echoed, preview branch allowed, foreign origin not',async()=>{r=await call('GET','/api/me',{token:consultant});assert.equal(r.headers['Access-Control-Allow-Origin'],ORIGIN);r=await call('OPTIONS','/api/me',{origin:'https://feature-x.d199dq940iqyj2.amplifyapp.com'});assert.equal(r.statusCode,204);assert.ok(r.headers['Access-Control-Allow-Origin']);r=await call('OPTIONS','/api/me',{origin:'https://evil.example'});assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);r=await call('OPTIONS','/api/me',{origin:'https://evil.d199dq940iqyj2.amplifyapp.com.evil.com'});assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);});
await t('500 does not leak internals',async()=>{const orig=S3Client.prototype.send;S3Client.prototype.send=async function(cmd){if(cmd.constructor.name==='ListObjectsV2Command')throw new Error('AccessDenied arn:aws:s3:::secret-bucket');return orig.call(this,cmd)};r=await call('GET','/api/reports/list',{token:admin});S3Client.prototype.send=orig;assert.equal(r.statusCode,500);assert.ok(!r.body.includes('arn:aws'),'internal error detail leaked');});
