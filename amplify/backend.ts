import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod, CfnStage, CfnRoute } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsFunction } from './functions/evaluate-finops/resource';
import { evaluateFinOpsIqFunction } from './functions/evaluate-finops-iq/resource';
import { evaluatePostureIqFunction } from './functions/evaluate-posture-iq/resource';
import { evaluateSovereignIqFunction } from './functions/evaluate-sovereign-iq/resource';
import { evaluateCloudIqFunction } from './functions/evaluate-cloud-iq/resource';
import { evaluateCostIqFunction } from './functions/evaluate-cost-iq/resource';
import { evaluateStrategyIqFunction } from './functions/evaluate-strategy-iq/resource';
import { evaluateModernizationIqFunction } from './functions/evaluate-modernization-iq/resource';
import { reportsServiceFunction } from './functions/reports-service/resource';
import { evaluateResilienceIqFunction } from './functions/evaluate-resilience-iq/resource';
import { manageResilienceEvidenceFunction } from './functions/manage-resilience-evidence/resource';
import { manageResilienceAssessmentFunction } from './functions/manage-resilience-assessment/resource';
import {
  API_GATEWAY_CORS_ORIGINS, API_BURST_LIMIT, API_RATE_LIMIT, COGNITO_ISSUER, KEEP_LEGACY_API,
  REGION, REPORTS_BUCKET, USER_POOL_CLIENT_ID, USER_POOL_ID
} from './config';

export const backend = defineBackend({
  auth,
  data,
  evaluateFinOpsFunction,
  evaluateFinOpsIqFunction,
  evaluatePostureIqFunction,
  evaluateSovereignIqFunction,
  evaluateCloudIqFunction,
  evaluateCostIqFunction,
  evaluateStrategyIqFunction,
  evaluateModernizationIqFunction,
  reportsServiceFunction,
  evaluateResilienceIqFunction,
  manageResilienceEvidenceFunction,
  manageResilienceAssessmentFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');

/* ------------------------------------------------------------------
 * Reports service permissions: the existing reports bucket and the
 * Cognito admin calls used by the Access Control screen.
 * ------------------------------------------------------------------ */
const reportsLambda = backend.reportsServiceFunction.resources.lambda;
const account = Stack.of(reportsLambda).account;
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}/reports/*`, `arn:aws:s3:::${REPORTS_BUCKET}/config/rbac-permissions.json`]
}));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}`]
}));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
  resources: [`arn:aws:cognito-idp:${REGION}:${account}:userpool/${USER_POOL_ID}`]
}));

/* ------------------------------------------------------------------
 * Advisory API: every route requires a valid Cognito ID token, checked by
 * API Gateway before any Lambda runs. CORS is answered by API Gateway
 * (preflight never reaches the authorizer) and limited to the portal origins.
 * ------------------------------------------------------------------ */
const jwtAuthorizer = new HttpJwtAuthorizer('CognitoJwtAuthorizer', COGNITO_ISSUER, {
  jwtAudience: [USER_POOL_CLIENT_ID],
  identitySource: ['$request.header.Authorization']
});

const advisoryApi = new HttpApi(apiStack, 'AdvisoryHttpApi', {
  apiName: 'ltm-advisory-api',
  defaultAuthorizer: jwtAuthorizer,
  corsPreflight: {
    allowOrigins: API_GATEWAY_CORS_ORIGINS,
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: Duration.hours(1)
  }
});

const integrate = (id: string, fn: { resources: { lambda: IFunction } }) =>
  new HttpLambdaIntegration(id, fn.resources.lambda);

const integrations = {
  finops: integrate('AdvisoryFinOpsValueCase', backend.evaluateFinOpsFunction),
  finopsIq: integrate('AdvisoryFinOpsIq', backend.evaluateFinOpsIqFunction),
  posture: integrate('AdvisoryPostureIq', backend.evaluatePostureIqFunction),
  sovereign: integrate('AdvisorySovereignIq', backend.evaluateSovereignIqFunction),
  cloud: integrate('AdvisoryCloudIq', backend.evaluateCloudIqFunction),
  strategy: integrate('AdvisoryStrategyIq', backend.evaluateStrategyIqFunction),
  modernization: integrate('AdvisoryModernizationIq', backend.evaluateModernizationIqFunction),
  reports: integrate('AdvisoryReportsService', backend.reportsServiceFunction)
};

const route = (path: string, methods: HttpMethod[], integration: HttpLambdaIntegration) =>
  advisoryApi.addRoutes({ path, methods, integration });

// Scoring engines
route('/api/evaluate/finops-value-case', [HttpMethod.POST], integrations.finops);
route('/api/evaluate/finops-iq', [HttpMethod.POST], integrations.finopsIq);
route('/api/evaluate/posture-iq', [HttpMethod.POST], integrations.posture);
route('/api/evaluate/sovereign-iq', [HttpMethod.POST], integrations.sovereign);
route('/api/evaluate/cloud-iq', [HttpMethod.POST], integrations.cloud);
route('/api/evaluate/strategy-iq', [HttpMethod.POST], integrations.strategy);
route('/api/evaluate/modernization-iq', [HttpMethod.POST], integrations.modernization);

// Identity, user administration and the reports archive
route('/api/me', [HttpMethod.GET], integrations.reports);
route('/api/users', [HttpMethod.GET], integrations.reports);
route('/api/users/create', [HttpMethod.POST], integrations.reports);
route('/api/users/set-password', [HttpMethod.POST], integrations.reports);
route('/api/users/permissions', [HttpMethod.POST], integrations.reports);
route('/api/reports/list', [HttpMethod.GET], integrations.reports);
route('/api/reports/save', [HttpMethod.POST], integrations.reports);
route('/api/reports/delete', [HttpMethod.POST], integrations.reports);
route('/api/reports/rename', [HttpMethod.POST], integrations.reports);

// Stage: throttling (tighter on admin and paid-AI routes) and JSON access logs.
const accessLogs = new LogGroup(apiStack, 'AdvisoryApiAccessLogs', {
  retention: RetentionDays.ONE_YEAR,
  removalPolicy: RemovalPolicy.RETAIN
});
const stage = advisoryApi.defaultStage!.node.defaultChild as CfnStage;
// `routeSettings` is untyped JSON passed to CloudFormation verbatim, so its keys must be PascalCase
// (unlike the typed `defaultRouteSettings`, which CDK converts).
const tight = { ThrottlingRateLimit: 2, ThrottlingBurstLimit: 5 };
stage.defaultRouteSettings = { throttlingRateLimit: API_RATE_LIMIT, throttlingBurstLimit: API_BURST_LIMIT };
stage.routeSettings = {
  'POST /api/users/create': tight,
  'POST /api/users/set-password': tight,
  'POST /api/users/permissions': tight,
  'POST /api/reports/delete': tight
};
// API Gateway rejects RouteSettings that name a route which does not exist yet, and CloudFormation
// has no implicit ordering between the stage and the routes: make the stage wait for every route.
advisoryApi.node.findAll()
  .filter((c): c is CfnRoute => c instanceof CfnRoute)
  .forEach(cfnRoute => stage.addDependency(cfnRoute));
stage.accessLogSettings = {
  destinationArn: accessLogs.logGroupArn,
  format: JSON.stringify({
    requestId: '$context.requestId',
    time: '$context.requestTime',
    ip: '$context.identity.sourceIp',
    method: '$context.httpMethod',
    route: '$context.routeKey',
    status: '$context.status',
    latencyMs: '$context.responseLatency',
    user: '$context.authorizer.claims.email',
    authError: '$context.authorizer.error'
  })
};

/* ------------------------------------------------------------------
 * Accelerators API (pre-Phase-1, no authorizer).
 * - Cost IQ and Resilience IQ are served here, unchanged, and are maintained
 *   separately; their pages read this API's URL from custom.apiUrl.
 * - The seven accelerators that moved to the Advisory API keep their old routes
 *   here only during cutover: set LTM_KEEP_LEGACY_API=false to remove those routes.
 * ------------------------------------------------------------------ */
const acceleratorsApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', { apiName: 'ltm-accelerators-api' });
const legacyRoute = (path: string, methods: HttpMethod[], integration: HttpLambdaIntegration) =>
  acceleratorsApi.addRoutes({ path, methods, integration });

// Resilience IQ assessment persistence. Same platform Cognito identity as the Advisory API (no separate
// login); API Gateway validates the ID token before the Lambda runs. OPTIONS stays open so the browser's
// CORS preflight reaches the Lambda, which answers it. Construct IDs match the earlier dev deployment.
const resilienceAssessmentAuthorizer = new HttpJwtAuthorizer('ResilienceAssessmentJwtAuthorizer', COGNITO_ISSUER, {
  jwtAudience: [USER_POOL_CLIENT_ID],
  identitySource: ['$request.header.Authorization']
});
const resilienceAssessmentIntegration = integrate('ManageResilienceAssessmentIntegration', backend.manageResilienceAssessmentFunction);
acceleratorsApi.addRoutes({
  path: '/api/resilience-iq/assessment',
  methods: [HttpMethod.GET, HttpMethod.POST],
  integration: resilienceAssessmentIntegration,
  authorizer: resilienceAssessmentAuthorizer
});
legacyRoute('/api/resilience-iq/assessment', [HttpMethod.OPTIONS], resilienceAssessmentIntegration);

// Cost IQ and Resilience IQ (as on main)
const costIqIntegration = integrate('EvaluateCostIqIntegration', backend.evaluateCostIqFunction);
const resilienceIntegration = integrate('EvaluateResilienceIqIntegration', backend.evaluateResilienceIqFunction);
const resilienceEvidenceIntegration = integrate('ManageResilienceEvidenceIntegration', backend.manageResilienceEvidenceFunction);
// Resilience IQ scoring (POST) and evidence (GET lists an assessment's evidence, POST changes its status) need
// the platform Cognito token (the page already sends it); OPTIONS stays open for the preflight, which the Lambdas answer.
for (const [path, integration, methods] of [
  ['/api/evaluate/resilience-iq', resilienceIntegration, [HttpMethod.POST]],
  ['/api/resilience-iq/evidence', resilienceEvidenceIntegration, [HttpMethod.GET, HttpMethod.POST]]
] as const) {
  acceleratorsApi.addRoutes({ path, methods: [...methods], integration, authorizer: resilienceAssessmentAuthorizer });
  legacyRoute(path, [HttpMethod.OPTIONS], integration);
}
legacyRoute('/api/evaluate/cost-iq', [HttpMethod.POST, HttpMethod.OPTIONS], costIqIntegration);
legacyRoute('/api/evaluate/cost-iq/{proxy+}', [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS], costIqIntegration);
legacyRoute('/api/evaluate/cost-iq/ai-review', [HttpMethod.POST, HttpMethod.OPTIONS], costIqIntegration);
legacyRoute('/api/evaluate/cost-iq/ai-report', [HttpMethod.POST, HttpMethod.OPTIONS], costIqIntegration);

// Seven Advisory-API accelerators: old unauthenticated routes, kept only during cutover.
if (KEEP_LEGACY_API) {
  legacyRoute('/api/evaluate/finops-value-case', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateFinOpsIntegration', backend.evaluateFinOpsFunction));
  legacyRoute('/api/evaluate/finops-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateFinOpsIqIntegration', backend.evaluateFinOpsIqFunction));
  legacyRoute('/api/evaluate/posture-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluatePostureIqIntegration', backend.evaluatePostureIqFunction));
  legacyRoute('/api/evaluate/sovereign-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateSovereignIqIntegration', backend.evaluateSovereignIqFunction));
  legacyRoute('/api/evaluate/cloud-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateCloudIqIntegration', backend.evaluateCloudIqFunction));
  legacyRoute('/api/evaluate/strategy-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateStrategyIqIntegration', backend.evaluateStrategyIqFunction));
  legacyRoute('/api/evaluate/modernization-iq', [HttpMethod.POST, HttpMethod.OPTIONS], integrate('EvaluateModernizationIqIntegration', backend.evaluateModernizationIqFunction));
}

backend.addOutput({
  custom: {
    // Read by scripts/generate-cost-iq-runtime-config.cjs (Cost IQ and Resilience IQ pages).
    apiUrl: acceleratorsApi.url,
    // Read by scripts/generate-runtime-config.cjs (portal and the seven Advisory-API accelerators).
    advisoryApiUrl: advisoryApi.url,
    cognito: { region: REGION, userPoolId: USER_POOL_ID, clientId: USER_POOL_CLIENT_ID }
  }
});
