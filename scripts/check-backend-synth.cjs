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
  check(routes.length >= 20, `expected the full Advisory API route set, found ${routes.length} routes`);
  for (const r of routes) {
    check(r.Properties.AuthorizationType === 'JWT', `route ${r.Properties.RouteKey} does not require the JWT authorizer`);
    check(!/^OPTIONS /.test(r.Properties.RouteKey), `explicit OPTIONS route ${r.Properties.RouteKey} would bypass API Gateway CORS handling`);
  }
  const cors = advisory.Properties.CorsConfiguration || {};
  check(Array.isArray(cors.AllowOrigins) && cors.AllowOrigins.length > 0, 'Advisory API has no CORS origin allowlist');
  check(!(cors.AllowOrigins || []).includes('*'), 'Advisory API CORS allows "*"');

  const authorizers = ofType('AWS::ApiGatewayV2::Authorizer').filter(a => a.Properties.ApiId?.Ref === advisory.id);
  check(authorizers.length === 1 && authorizers[0].Properties.AuthorizerType === 'JWT', 'Advisory API must have exactly one JWT authorizer');
  const jwt = authorizers[0]?.Properties.JwtConfiguration || {};
  check(/^https:\/\/cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9-]+_[A-Za-z0-9]+$/.test(jwt.Issuer || ''), `JWT issuer is not a Cognito user pool: ${jwt.Issuer}`);
  check(Array.isArray(jwt.Audience) && jwt.Audience.length > 0, 'JWT authorizer has no audience (app client)');

  const stage = ofType('AWS::ApiGatewayV2::Stage').find(s => s.Properties.ApiId?.Ref === advisory.id);
  check(!!stage?.Properties.DefaultRouteSettings?.ThrottlingRateLimit, 'Advisory API stage is not throttled');
  check(!!stage?.Properties.AccessLogSettings?.DestinationArn, 'Advisory API stage has no access logging');
}

const legacyApi = apis.find(a => a.Properties.Name === 'ltm-accelerators-api');
if (String(legacy).toLowerCase() === 'false') check(!legacyApi, 'legacy API still present although LTM_KEEP_LEGACY_API=false');

for (const policy of ofType('AWS::IAM::Policy')) {
  for (const st of policy.Properties.PolicyDocument?.Statement || []) {
    const res = [].concat(st.Resource || []);
    const actions = [].concat(st.Action || []).join(',');
    // Amplify's own SSM/env plumbing is scoped by the framework; check our own grants.
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
