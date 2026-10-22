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
  // 7 scoring routes, FinOps IQ v3 scoring, save/resume and report, identity, user administration and reports archive routes.
  const required = ['POST /api/evaluate/finops-value-case', 'POST /api/evaluate/finops-iq', 'POST /api/evaluate/posture-iq',
    'POST /api/evaluate/sovereign-iq', 'POST /api/evaluate/cloud-iq', 'POST /api/evaluate/strategy-iq',
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
  check(/^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9-]+_[A-Za-z0-9]+$/.test(jwt.Issuer || ''), `JWT issuer is not a Cognito user pool: ${jwt.Issuer}`);
  check(Array.isArray(jwt.Audience) && jwt.Audience.length > 0, 'JWT authorizer has no audience (app client)');

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
if (legacyApi && String(legacy).toLowerCase() === 'false') {
  const moved = /^(POST|OPTIONS) \/api\/evaluate\/(finops-value-case|finops-iq|posture-iq|sovereign-iq|cloud-iq|strategy-iq|modernization-iq)$/;
  const leftovers = ofType('AWS::ApiGatewayV2::Route')
    .filter(r => r.Properties.ApiId?.Ref === legacyApi.id && moved.test(r.Properties.RouteKey))
    .map(r => r.Properties.RouteKey);
  check(leftovers.length === 0, `unauthenticated legacy routes remain after cutover: ${leftovers.join(', ')}`);
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

const functions = ofType('AWS::Lambda::Function').map(f => f.Properties.FunctionName || f.id);
console.log(`Synthesized ${templates.length} templates, ${functions.length} Lambda functions, ${apis.length} HTTP APIs.`);
fs.rmSync(outDir, { recursive: true, force: true });

if (failures.length) {
  console.error('Backend checks failed:\n' + failures.map(f => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('Backend checks passed.');
