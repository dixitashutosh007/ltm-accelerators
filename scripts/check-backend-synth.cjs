'use strict';
/**
 * Synthesizes the Amplify backend (the CloudFormation templates Amplify would deploy) without
 * AWS credentials, then asserts the platform's security properties:
 *   - every Advisory API route requires the Cognito JWT authorizer
 *   - CORS never allows "*"
 *   - the stage is throttled and access-logged
 *   - no Lambda IAM policy grants "*" resources
 *   - every function bundles successfully (synthesis fails otherwise)
 *
 * Run: npm run check:backend   (takes a few minutes: it bundles every Lambda)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ltm-synth-'));
const legacy = process.env.LTM_KEEP_LEGACY_API;

console.log(`Synthesizing backend into ${outDir} (LTM_KEEP_LEGACY_API=${legacy ?? 'true'}) ...`);
execFileSync(process.execPath, [require.resolve('tsx/cli'), 'amplify/backend.ts'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: {
    ...process.env,
    CDK_OUTDIR: outDir,
    CDK_CONTEXT_JSON: JSON.stringify({
      'amplify-backend-namespace': 'ci',
      'amplify-backend-name': 'main',
      'amplify-backend-type': 'branch'
    }),
    CDK_DEFAULT_ACCOUNT: '000000000000',
    CDK_DEFAULT_REGION: 'ap-south-1'
  }
});

const templates = fs.readdirSync(outDir)
  .filter(f => f.endsWith('.template.json'))
  .map(f => ({ file: f, json: JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8')) }));
const resources = templates.flatMap(t => Object.entries(t.json.Resources || {}).map(([id, r]) => ({ id, ...r, file: t.file })));
const ofType = type => resources.filter(r => r.Type === type);

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const apis = ofType('AWS::ApiGatewayV2::Api');
const advisory = apis.find(a => a.Properties.Name === 'ltm-advisory-api');
check(!!advisory, 'Advisory API (ltm-advisory-api) is missing');

if (advisory) {
  const routes = ofType('AWS::ApiGatewayV2::Route').filter(r => r.Properties.ApiId?.Ref === advisory.id);
  // 3 scoring routes; FinOps IQ v3 and Sovereign IQ v4 scoring, save/resume and report (and Sovereign IQ's narrative);
  // identity, user administration and reports archive routes.
  const required = ['POST /api/evaluate/cloud-iq', 'POST /api/evaluate/strategy-iq',
    'POST /api/evaluate/sovereign-iq/v4', 'GET /api/sovereign-iq/assessment', 'POST /api/sovereign-iq/assessment',
    'GET /api/sovereign-iq/report', 'POST /api/sovereign-iq/narrative',
    'POST /api/evaluate/modernization-iq', 'POST /api/evaluate/finops-iq/v3', 'GET /api/finops-iq/assessment',
    'POST /api/finops-iq/assessment', 'GET /api/finops-iq/report', 'GET /api/me', 'GET /api/users', 'POST /api/users/create',
    'POST /api/users/set-password', 'POST /api/users/permissions', 'GET /api/reports/list',
    'POST /api/reports/save', 'POST /api/reports/delete', 'POST /api/reports/rename'];
  const keys = routes.map(r => r.Properties.RouteKey);
  for (const k of required) check(keys.includes(k), `Advisory API is missing route ${k}`);
  for (const r of routes) {
    check(r.Properties.AuthorizationType === 'JWT', `route ${r.Properties.RouteKey} does not require the JWT authorizer`);
    check(!/^OPTIONS /.test(r.Properties.RouteKey), `explicit OPTIONS route ${r.Properties.RouteKey} would bypass API Gateway CORS handling`);
  }
  const cors = advisory.Properties.CorsConfiguration || {};
  check(Array.isArray(cors.AllowOrigins) && cors.AllowOrigins.length > 0, 'Advisory API has no CORS origin allowlist');
  check(!(cors.AllowOrigins || []).includes('*'), 'Advisory API CORS allows "*"');
  // API Gateway HTTP APIs reject partial wildcards such as https://*.example.com at deploy time.
  for (const origin of cors.AllowOrigins || []) {
    check(/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin), `Advisory API CORS origin "${origin}" is not an exact origin (API Gateway rejects it)`);
  }

  const authorizers = ofType('AWS::ApiGatewayV2::Authorizer').filter(a => a.Properties.ApiId?.Ref === advisory.id);
  check(authorizers.length === 1 && authorizers[0].Properties.AuthorizerType === 'JWT', 'Advisory API must have exactly one JWT authorizer');
  const jwt = authorizers[0]?.Properties.JwtConfiguration || {};
  // The issuer is the backend's own user pool: in the API stack it is "https://cognito-idp.<region>.amazonaws.com/"
  // joined with a reference to the auth stack's user pool (a fixed pool ID is accepted too).
  const join = jwt.Issuer?.['Fn::Join']?.[1] || [];
  const poolRef = JSON.stringify(join[1] || '');
  check(/^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9-]+_[A-Za-z0-9]+$/.test(typeof jwt.Issuer === 'string' ? jwt.Issuer : '') ||
    (/^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/$/.test(join[0] || '') && /UserPool/.test(poolRef) && !/AppClient/.test(poolRef)),
    `JWT issuer is not a Cognito user pool: ${JSON.stringify(jwt.Issuer)}`);
  check(Array.isArray(jwt.Audience) && jwt.Audience.length > 0, 'JWT authorizer has no audience (app client)');

  // Sign-in (23 Oct 2026): administrator-created accounts only, deletion protection, password sign-in for the portal,
  // and the allowlist on the pre-sign-up trigger.
  const pools = ofType('AWS::Cognito::UserPool');
  check(pools.length === 1, `expected one user pool, found ${pools.length}`);
  for (const p of pools) {
    check(p.Properties.AdminCreateUserConfig?.AllowAdminCreateUserOnly === true, 'user pool allows self-registration');
    check(p.Properties.DeletionProtection === 'ACTIVE', 'user pool has no deletion protection');
  }
  for (const c of ofType('AWS::Cognito::UserPoolClient')) {
    check((c.Properties.ExplicitAuthFlows || []).includes('ALLOW_USER_PASSWORD_AUTH'), `app client ${c.id} does not allow the portal's password sign-in`);
  }
  const preSignUp = ofType('AWS::Lambda::Function').find(f => /presignup/i.test(f.id));
  const allowed = String(preSignUp?.Properties.Environment?.Variables?.ALLOWED_DOMAINS || '').split(',');
  check(['ltm.com', 'ey.com'].every(d => allowed.includes(d)), `pre-sign-up allowlist is ${allowed.join(',') || 'missing'}`);

  const stage = ofType('AWS::ApiGatewayV2::Stage').find(s => s.Properties.ApiId?.Ref === advisory.id);
  check(!!stage?.Properties.DefaultRouteSettings?.ThrottlingRateLimit, 'Advisory API stage is not throttled');
  check(!!stage?.Properties.AccessLogSettings?.DestinationArn, 'Advisory API stage has no access logging');
  // Per-route settings fail at deploy time unless the stage is created after those routes.
  const routeIdByKey = Object.fromEntries(routes.map(r => [r.Properties.RouteKey, r.id]));
  const dependsOn = [].concat(stage?.DependsOn || []);
  // CloudFormation rejects camelCase keys here ("Unrecognized field throttlingBurstLimit").
  const allowedRouteSettingKeys = ['ThrottlingBurstLimit', 'ThrottlingRateLimit', 'LoggingLevel', 'DetailedMetricsEnabled', 'DataTraceEnabled'];
  for (const settings of [stage?.Properties.DefaultRouteSettings || {}, ...Object.values(stage?.Properties.RouteSettings || {})]) {
    for (const k of Object.keys(settings)) check(allowedRouteSettingKeys.includes(k), `stage route setting key "${k}" is not a CloudFormation property name`);
  }
  for (const key of Object.keys(stage?.Properties.RouteSettings || {})) {
    check(dependsOn.includes(routeIdByKey[key]), `stage RouteSettings names "${key}" but the stage does not DependsOn that route (deploy-time race)`);
  }
}

// The Accelerators API stays (it serves Cost IQ and Resilience IQ). After cutover it must no
// longer expose unauthenticated routes for the seven Advisory-API accelerators.
const legacyApi = apis.find(a => a.Properties.Name === 'ltm-accelerators-api');
// Off by default since 24 Oct 2026 (amplify/config.ts); checked unless LTM_KEEP_LEGACY_API=true restores them.
if (legacyApi && String(legacy).toLowerCase() !== 'true') {
  const moved = /^(POST|OPTIONS) \/api\/evaluate\/(finops-value-case|finops-iq|posture-iq|sovereign-iq|cloud-iq|strategy-iq|modernization-iq)$/;
  const leftovers = ofType('AWS::ApiGatewayV2::Route')
    .filter(r => r.Properties.ApiId?.Ref === legacyApi.id && moved.test(r.Properties.RouteKey))
    .map(r => r.Properties.RouteKey);
  check(leftovers.length === 0, `unauthenticated legacy routes remain after cutover: ${leftovers.join(', ')}`);
}

// Accelerator access on the server (24 Oct 2026): every accelerator service can read the saved permissions.
{
  const services = /(evaluate(finops|sovereign|cloud|strategy|modernization|resilience)iq|manage(finops|sovereign)assessment|(finops|sovereign)iqreport|manageresilience(assessment|evidence))lambda/i;
  const fns = ofType('AWS::Lambda::Function').filter(f => services.test(f.id));
  check(fns.length === 12, `expected 12 accelerator services, found ${fns.length}`);
  for (const f of fns) {
    const env = f.Properties.Environment?.Variables || {};
    check(!!env.REPORTS_BUCKET && 'SUPER_ADMIN_EMAILS' in env && !!env.ADMIN_GROUP, `${f.id} cannot check accelerator access (REPORTS_BUCKET, SUPER_ADMIN_EMAILS, ADMIN_GROUP)`);
  }
}

// FinOps Value Case and the FinOps IQ v2 engine are retired (22 Oct 2026): no route for either on any API.
{
  const retired = ofType('AWS::ApiGatewayV2::Route').filter(r => /finops-value-case|\/api\/evaluate\/finops-iq$/.test(r.Properties.RouteKey)).map(r => r.Properties.RouteKey);
  check(retired.length === 0, `retired FinOps routes remain: ${retired.join(', ')}`);
}

// Posture IQ and the Sovereign IQ v1 engine are retired (Sovereign IQ PLAN S5, 26 Oct 2026): no route for either on any API.
{
  const retired = ofType('AWS::ApiGatewayV2::Route').filter(r => /\/api\/evaluate\/(posture-iq|sovereign-iq)$/.test(r.Properties.RouteKey)).map(r => r.Properties.RouteKey);
  check(retired.length === 0, `retired Sovereign IQ and Posture IQ routes remain: ${retired.join(', ')}`);
}

// FinOps IQ and FinOps Value Case never have an unauthenticated route (F0, D11), whatever LTM_KEEP_LEGACY_API says.
if (legacyApi) {
  const finops = ofType('AWS::ApiGatewayV2::Route')
    .filter(r => r.Properties.ApiId?.Ref === legacyApi.id && /\/api\/(evaluate\/finops-(iq|value-case)|finops-iq)\b/.test(r.Properties.RouteKey))
    .map(r => r.Properties.RouteKey);
  check(finops.length === 0, `FinOps routes on the unauthenticated Accelerators API: ${finops.join(', ')}`);
}

// Resilience IQ: scoring, evidence and assessment persistence need the platform Cognito token on every
// method except the CORS preflight.
if (legacyApi) {
  const resilienceRoutes = ofType('AWS::ApiGatewayV2::Route')
    .filter(r => r.Properties.ApiId?.Ref === legacyApi.id && /\/api\/(evaluate\/resilience-iq|resilience-iq\/)/.test(r.Properties.RouteKey));
  check(resilienceRoutes.length > 0, 'no Resilience IQ routes found on the Accelerators API');
  for (const r of resilienceRoutes) {
    const key = r.Properties.RouteKey;
    if (key.startsWith('OPTIONS ')) {
      check(!r.Properties.AuthorizationType || r.Properties.AuthorizationType === 'NONE', `${key} must stay open for the CORS preflight`);
    } else {
      check(r.Properties.AuthorizationType === 'JWT' && !!r.Properties.AuthorizerId, `${key} must require the Cognito JWT`);
    }
  }
}

// FinOps IQ retention (M6): saved assessments expire by DynamoDB time to live on expiresAt; FinOps IQ Lambda logs
// are kept for one year, not forever.
const finopsTable = resources.find(r => r.Type === 'Custom::AmplifyDynamoDBTable' && /^FinOpsIqAssessment/.test(r.Properties?.tableName?.['Fn::Join']?.[1]?.[0] ?? r.Properties?.tableName ?? ''));
check(!!finopsTable, 'FinOpsIqAssessment table not found');
const ttl = finopsTable?.Properties.timeToLiveSpecification || finopsTable?.Properties.TimeToLiveSpecification;
check(ttl?.attributeName === 'expiresAt' && ttl?.enabled === true || ttl?.AttributeName === 'expiresAt' && ttl?.Enabled === true, `FinOpsIqAssessment time to live is not enabled on expiresAt: ${JSON.stringify(ttl)}`);
// Sovereign IQ retention (PLAN S10): the same rules.
const sovereignTable = resources.find(r => r.Type === 'Custom::AmplifyDynamoDBTable' && /^SovereignIqAssessment/.test(r.Properties?.tableName?.['Fn::Join']?.[1]?.[0] ?? r.Properties?.tableName ?? ''));
check(!!sovereignTable, 'SovereignIqAssessment table not found');
const sttl = sovereignTable?.Properties.timeToLiveSpecification || sovereignTable?.Properties.TimeToLiveSpecification;
check(sttl?.attributeName === 'expiresAt' && sttl?.enabled === true || sttl?.AttributeName === 'expiresAt' && sttl?.Enabled === true, `SovereignIqAssessment time to live is not enabled on expiresAt: ${JSON.stringify(sttl)}`);
for (const fn of ['evaluate-finops-iq', 'manage-finops-assessment', 'finops-iq-report', 'evaluate-sovereign-iq', 'manage-sovereign-assessment', 'sovereign-iq-report', 'sovereign-iq-narrative']) {
  const groups = ofType('AWS::Logs::LogGroup').filter(g => JSON.stringify(g.Properties.LogGroupName ?? '').includes(fn) || g.id.toLowerCase().includes(fn.replace(/-/g, '')));
  check(groups.length > 0 && groups.every(g => g.Properties.RetentionInDays === 365), `${fn} log group must keep logs for one year (found ${groups.map(g => g.Properties.RetentionInDays).join(', ') || 'none'})`);
}

for (const policy of ofType('AWS::IAM::Policy')) {
  for (const st of policy.Properties.PolicyDocument?.Statement || []) {
    const res = [].concat(st.Resource || []);
    const actions = [].concat(st.Action || []).join(',');
    // Amplify's own SSM/env plumbing is scoped by the framework; check S3 and Cognito grants.
    if (/s3:|cognito-idp:/.test(actions)) {
      check(!res.includes('*'), `IAM policy ${policy.id} grants ${actions} on "*"`);
    }
  }
}

// Every bundled Lambda starts outside the repository, as it does on AWS: a dependency that reads a data file from
// beside its own source (pdfmake's Node entry did, 22 Oct 2026) passes the unit tests but fails at cold start.
// Each bundle is copied alone into an empty directory and imported there, with no node_modules to fall back on.
const bundles = ofType('AWS::Lambda::Function')
  .map(f => ({ id: f.id, asset: f.Metadata?.['aws:asset:path'] || 'asset.' + String(f.Properties.Code?.S3Key || '').replace(/\.zip$/, '') }))
  .filter(b => b.asset && fs.existsSync(path.join(outDir, b.asset, 'index.mjs')));
for (const b of bundles) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ltm-cold-'));
  fs.cpSync(path.join(outDir, b.asset), dir, { recursive: true });
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e', "await import('./index.mjs'); process.exit(0)"], {
      cwd: dir, stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000,
      env: { PATH: process.env.PATH, AWS_REGION: 'ap-south-1', AMPLIFY_SSM_ENV_CONFIG: '{}' }
    });
  } catch (e) {
    check(false, `Lambda ${b.id} fails at cold start outside the repository: ${String(e.stderr || e.message).split('\n').find(l => /Error/.test(l)) || e.message}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
check(bundles.length > 0, 'no Lambda bundles found to start');

const functions = ofType('AWS::Lambda::Function').map(f => f.Properties.FunctionName || f.id);
console.log(`Synthesized ${templates.length} templates, ${functions.length} Lambda functions (${bundles.length} bundles started cold), ${apis.length} HTTP APIs.`);
fs.rmSync(outDir, { recursive: true, force: true });

if (failures.length) {
  console.error('Backend checks failed:\n' + failures.map(f => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('Backend checks passed.');
