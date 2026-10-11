import { generateKeyPairSync, sign } from 'node:crypto';
import assert from 'node:assert/strict';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

process.env.AWS_REGION='ap-south-1'; process.env.SUPER_ADMIN_EMAILS='owner@ltm.com'; process.env.AWS_ACCESS_KEY_ID='x'; process.env.AWS_SECRET_ACCESS_KEY='y';
const ISS='https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_91amN2bz4', AUD='4iiqcsgvsm0b4ngpps94ho4c67';
const { publicKey, privateKey } = generateKeyPairSync('rsa',{modulusLength:2048});
const other = generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'k1',alg:'RS256',use:'sig'};
globalThis.fetch=async(u)=>{assert.equal(u,ISS+'/.well-known/jwks.json');return {ok:true,json:async()=>({keys:[jwk]})}};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function tok(claims,{key=privateKey,kid='k1'}={}){const h=b64({alg:'RS256',kid});const p=b64({iss:ISS,aud:AUD,token_use:'id',exp:Math.floor(Date.now()/1000)+600,...claims});return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),key).toString('base64url');}

// S3 + Cognito mocks
const s3calls=[]; let perms={users:{'consultant@ltm.com':{role:'advisor_viewer',permissions:{view:['cloud-iq'],edit:[]}},'reporter@ltm.com':{permissions:{view:['reports'],edit:['reports']}}}};
S3Client.prototype.send=async function(cmd){const n=cmd.constructor.name;s3calls.push([n,cmd.input.Key]);
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
await t('/api/me returns own permissions',async()=>{r=await call('GET','/api/me',{token:consultant});assert.equal(r.statusCode,200);assert.deepEqual(r.json.permissions.view,['cloud-iq']);r=await call('GET','/api/me',{token:admin});assert.equal(r.json.role,'super_admin');});
await t('consultant cannot list reports',async()=>{r=await call('GET','/api/reports/list',{token:consultant});assert.equal(r.statusCode,403);});
await t('reporter lists reports with 15-min URLs, no bucket name leak',async()=>{r=await call('GET','/api/reports/list',{token:reporter});assert.equal(r.statusCode,200);assert.equal(r.json.count,1);assert.match(r.json.reports[0].downloadUrl,/X-Amz-Expires=900/);assert.ok(!('bucket' in r.json));});
await t('consultant saves report for permitted accelerator only',async()=>{r=await call('POST','/api/reports/save',{token:consultant,body:{acceleratorId:'cloud-iq',clientName:'Acme',pdfBase64:pdf}});assert.equal(r.statusCode,200);assert.match(r.json.downloadUrl,/X-Amz-Expires=900/);r=await call('POST','/api/reports/save',{token:consultant,body:{acceleratorId:'posture-iq',pdfBase64:pdf}});assert.equal(r.statusCode,403);});
await t('non-PDF upload rejected',async()=>{r=await call('POST','/api/reports/save',{token:admin,body:{acceleratorId:'cloud-iq',pdfBase64:Buffer.from('<html>'.repeat(30)).toString('base64')}});assert.equal(r.statusCode,400);});
await t('delete restricted to report keys (cannot delete RBAC config)',async()=>{r=await call('POST','/api/reports/delete',{token:admin,body:{key:'config/rbac-permissions.json'}});assert.equal(r.statusCode,400);r=await call('POST','/api/reports/delete',{token:admin,body:{key:'reports/../config/x.pdf'}});assert.equal(r.statusCode,400);r=await call('POST','/api/reports/delete',{token:reporter,body:{key:'reports/cloud-iq/A_1.pdf'}});assert.equal(r.statusCode,200);r=await call('POST','/api/reports/delete',{token:consultant,body:{key:'reports/cloud-iq/A_1.pdf'}});assert.equal(r.statusCode,403);});
await t('CORS: allowed origin echoed, preview branch allowed, foreign origin not',async()=>{r=await call('GET','/api/me',{token:consultant});assert.equal(r.headers['Access-Control-Allow-Origin'],ORIGIN);r=await call('OPTIONS','/api/me',{origin:'https://feature-x.d199dq940iqyj2.amplifyapp.com'});assert.equal(r.statusCode,204);assert.ok(r.headers['Access-Control-Allow-Origin']);r=await call('OPTIONS','/api/me',{origin:'https://evil.example'});assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);r=await call('OPTIONS','/api/me',{origin:'https://evil.d199dq940iqyj2.amplifyapp.com.evil.com'});assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);});
await t('500 does not leak internals',async()=>{const orig=S3Client.prototype.send;S3Client.prototype.send=async function(cmd){if(cmd.constructor.name==='ListObjectsV2Command')throw new Error('AccessDenied arn:aws:s3:::secret-bucket');return orig.call(this,cmd)};r=await call('GET','/api/reports/list',{token:admin});S3Client.prototype.send=orig;assert.equal(r.statusCode,500);assert.ok(!r.body.includes('arn:aws'),'internal error detail leaked');});
