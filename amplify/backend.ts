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
import { manageFinOpsAssessmentFunction } from './functions/manage-finops-assessment/resource';
import { manageSovereignAssessmentFunction } from './functions/manage-sovereign-assessment/resource';
import { sovereignIqReportFunction } from './functions/sovereign-iq-report/resource';
import { sovereignIqNarrativeFunction } from './functions/sovereign-iq-narrative/resource';
import { finopsIqReportFunction } from './functions/finops-iq-report/resource';
import {
  ADMIN_GROUP, API_GATEWAY_CORS_ORIGINS, API_BURST_LIMIT, API_RATE_LIMIT, KEEP_LEGACY_API,
  REGION, REPORTS_BUCKET, SUPER_ADMIN_EMAILS
} from './config';

export const backend = defineBackend({
  auth,
  data,
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
  manageResilienceAssessmentFunction,
  manageFinOpsAssessmentFunction,
  manageSovereignAssessmentFunction,
  sovereignIqReportFunction,
  sovereignIqNarrativeFunction,
  finopsIqReportFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');

/* ------------------------------------------------------------------
 * Sign-in: the user pool this backend defines. Accounts are created by
 * an administrator only (Access Control); the pre-sign-up trigger limits
 * them to the allowlist in config.ts. The portal signs in with
 * USER_PASSWORD_AUTH (assets/ltm-api.js), so the app client allows it.
 * Deletion protection: the pool holds every account.
 * ------------------------------------------------------------------ */
const { userPool, userPoolClient } = backend.auth.resources;
const { cfnUserPool, cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = { ...(cfnUserPool.adminCreateUserConfig as object), allowAdminCreateUserOnly: true };
cfnUserPool.deletionProtection = 'ACTIVE';
cfnUserPoolClient.explicitAuthFlows = ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'];
const USER_POOL_ID = userPool.userPoolId;
const USER_POOL_CLIENT_ID = userPoolClient.userPoolClientId;
const COGNITO_ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

/* ------------------------------------------------------------------
 * Retention (FinOps IQ M6): DynamoDB time to live deletes a saved
 * assessment once expiresAt passes, 24 months after its last change.
 * ------------------------------------------------------------------ */
backend.data.resources.cfnResources.amplifyDynamoDbTables['FinOpsIqAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };
backend.data.resources.cfnResources.amplifyDynamoDbTables['SovereignIqAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };

/* ------------------------------------------------------------------
 * Accelerator access on the server (amplify/functions/_shared/access.ts):
 * every accelerator service reads the saved permissions (read-only, the
 * one object) and knows who the administrators are. Cost IQ is maintained
 * separately and is not wrapped yet.
 * ------------------------------------------------------------------ */
for (const fn of [
  backend.evaluateFinOpsIqFunction, backend.manageFinOpsAssessmentFunction, backend.finopsIqReportFunction,
  backend.evaluatePostureIqFunction, backend.evaluateSovereignIqFunction, backend.evaluateCloudIqFunction,
  backend.evaluateStrategyIqFunction, backend.evaluateModernizationIqFunction, backend.evaluateResilienceIqFunction,
  backend.manageResilienceAssessmentFunction, backend.manageResilienceEvidenceFunction, backend.manageSovereignAssessmentFunction, backend.sovereignIqReportFunction,
  backend.sovereignIqNarrativeFunction
]) {
  fn.addEnvironment('REPORTS_BUCKET', REPORTS_BUCKET);
  fn.addEnvironment('SUPER_ADMIN_EMAILS', SUPER_ADMIN_EMAILS);
  fn.addEnvironment('ADMIN_GROUP', ADMIN_GROUP);
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({
    actions: ['s3:GetObject'],
    resources: [`arn:aws:s3:::${REPORTS_BUCKET}/config/rbac-permissions.json`]
  }));
}

/* ------------------------------------------------------------------
 * Reports service permissions: the existing reports bucket and the
 * Cognito admin calls used by the Access Control screen.
 * ------------------------------------------------------------------ */
const reportsLambda = backend.reportsServiceFunction.resources.lambda;
backend.reportsServiceFunction.addEnvironment('USER_POOL_ID', USER_POOL_ID);
backend.reportsServiceFunction.addEnvironment('COGNITO_CLIENT_ID', USER_POOL_CLIENT_ID);
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
  resources: [userPool.userPoolArn]
}));

// Resilience IQ evidence files: read and write only under resilience-iq/evidence/ in the same bucket.
backend.manageResilienceEvidenceFunction.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}/resilience-iq/evidence/*`]
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
    // Content-Disposition carries the report's file name to the page (FinOps IQ report route).
    exposeHeaders: ['X-Request-Id', 'Content-Disposition'],
    maxAge: Duration.hours(1)
  }
});

const integrate = (id: string, fn: { resources: { lambda: IFunction } }) =>
  new HttpLambdaIntegration(id, fn.resources.lambda);

const integrations = {
  finopsIq: integrate('AdvisoryFinOpsIq', backend.evaluateFinOpsIqFunction),
  finopsAssessment: integrate('AdvisoryFinOpsIqAssessment', backend.manageFinOpsAssessmentFunction),
  sovereignAssessment: integrate('AdvisorySovereignIqAssessment', backend.manageSovereignAssessmentFunction),
  sovereignReport: integrate('AdvisorySovereignIqReport', backend.sovereignIqReportFunction),
  sovereignNarrative: integrate('AdvisorySovereignIqNarrative', backend.sovereignIqNarrativeFunction),
  finopsReport: integrate('AdvisoryFinOpsIqReport', backend.finopsIqReportFunction),
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
// FinOps IQ (engine v3; FinOps Value Case is its executive mode). The v2 engine and route were retired at cutover
// (execution phase M8, 22 Oct 2026).
route('/api/evaluate/finops-iq/v3', [HttpMethod.POST], integrations.finopsIq);
route('/api/finops-iq/assessment', [HttpMethod.GET, HttpMethod.POST], integrations.finopsAssessment);
// Report PDF and backlog CSV of a completed assessment (execution phase M4).
route('/api/finops-iq/report', [HttpMethod.GET], integrations.finopsReport);
route('/api/evaluate/posture-iq', [HttpMethod.POST], integrations.posture);
route('/api/evaluate/sovereign-iq', [HttpMethod.POST], integrations.sovereign);
// Merged Sovereign IQ (engine v4, PLAN S5): scoring and save/resume for the new page, beside the current one until
// the switch-over.
route('/api/evaluate/sovereign-iq/v4', [HttpMethod.POST], integrations.sovereign);
route('/api/sovereign-iq/assessment', [HttpMethod.GET, HttpMethod.POST], integrations.sovereignAssessment);
route('/api/sovereign-iq/report', [HttpMethod.GET], integrations.sovereignReport);
route('/api/sovereign-iq/narrative', [HttpMethod.POST], integrations.sovereignNarrative);

/* ------------------------------------------------------------------
 * AI narrative (Sovereign IQ PLAN S9, WS-S1): Claude in Amazon Bedrock
 * through the Messages API. The function only calls the model when
 * AI_ENABLED is 'true'. Inference stays in eu-west-1 (owner decision
 * D28): the permission is limited to requests made in that region.
 * ------------------------------------------------------------------ */
backend.sovereignIqNarrativeFunction.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['bedrock-mantle:CreateInference'],
  resources: ['*'],
  conditions: { StringEquals: { 'aws:RequestedRegion': 'eu-west-1' } }
}));
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

// Advisory-API accelerators: old unauthenticated routes, kept only during cutover. FinOps IQ and FinOps Value
// Case are already off (CIO-readiness F0, decision D11): their pages use the Advisory API only.
if (KEEP_LEGACY_API) {
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
