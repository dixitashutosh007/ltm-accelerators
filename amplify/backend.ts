import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod, CfnStage, CfnRoute } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction, type IFunction } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsIqFunction } from './functions/evaluate-finops-iq/resource';
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
import { retentionSweepFunction } from './functions/retention-sweep/resource';
import { manageCostAssessmentFunction } from './functions/manage-cost-assessment/resource';
import { manageSessionFunction } from './functions/manage-session/resource';
import { costIqReportFunction } from './functions/cost-iq-report/resource';
import { sovereignIqReportFunction } from './functions/sovereign-iq-report/resource';
import { sovereignIqNarrativeFunction } from './functions/sovereign-iq-narrative/resource';
import { finopsIqReportFunction } from './functions/finops-iq-report/resource';
import {
  ADMIN_GROUP, API_GATEWAY_CORS_ORIGINS, API_BURST_LIMIT, API_RATE_LIMIT, KEEP_LEGACY_API,
  REGION, REPORTS_BUCKET, SUPER_ADMIN_EMAILS, SIGNUP_ALLOWED_DOMAINS, SIGNUP_ALLOWED_EMAILS, PROTECTED_DOMAINS
} from './config';

export const backend = defineBackend({
  auth,
  data,
  evaluateFinOpsIqFunction,
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
  manageSessionFunction,
  manageCostAssessmentFunction,
  retentionSweepFunction,
  sovereignIqReportFunction,
  costIqReportFunction,
  sovereignIqNarrativeFunction,
  finopsIqReportFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');

/* ------------------------------------------------------------------
 * User activity (platform workstream P2): who signed in and when, and the status and times of each person's
 * assessments (no answers, no client names). A table of its own, in a stack of its own, so the sign-in trigger has no
 * dependency on the data stack. Every item expires 12 months after it was written (decision S4).
 * ------------------------------------------------------------------ */
const activityStack = backend.createStack('ActivityStack');
const activityTable = new Table(activityStack, 'UserActivity', {
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  sortKey: { name: 'sk', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'expiresAt',
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  deletionProtection: true,
  removalPolicy: RemovalPolicy.RETAIN
});

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
// The sign-up and sign-in triggers read the domain rules (P1). They live in the auth stack, so their role is found there.
for (const node of Stack.of(userPool).node.findAll()) {
  if (node instanceof LambdaFunction && /auth-pre-(sign-up|authentication)/i.test(node.node.path)) {
    node.addToRolePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`arn:aws:s3:::${REPORTS_BUCKET}/config/domain-rules.json`]
    }));
  }
  // The sign-in recorder (P2) may write a person's summary and sign-in items, and nothing else.
  if (node instanceof LambdaFunction && /auth-post-authentication/i.test(node.node.path)) {
    node.addEnvironment('ACTIVITY_TABLE', activityTable.tableName);
    node.addToRolePolicy(new PolicyStatement({ actions: ['dynamodb:UpdateItem', 'dynamodb:PutItem'], resources: [activityTable.tableArn] }));
  }
}
const USER_POOL_ID = userPool.userPoolId;
const USER_POOL_CLIENT_ID = userPoolClient.userPoolClientId;
const COGNITO_ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

/* ------------------------------------------------------------------
 * Retention (FinOps IQ M6): DynamoDB time to live deletes a saved
 * assessment once expiresAt passes, 24 months after its last change.
 * ------------------------------------------------------------------ */
backend.data.resources.cfnResources.amplifyDynamoDbTables['FinOpsIqAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };
backend.data.resources.cfnResources.amplifyDynamoDbTables['SovereignIqAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };
backend.data.resources.cfnResources.amplifyDynamoDbTables['ResilienceAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };
backend.data.resources.cfnResources.amplifyDynamoDbTables['CostIqAssessment'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };
backend.data.resources.cfnResources.amplifyDynamoDbTables['SavedSession'].timeToLiveAttribute = { attributeName: 'expiresAt', enabled: true };

/* ------------------------------------------------------------------
 * Accelerator access on the server (amplify/functions/_shared/access.ts):
 * every accelerator service reads the saved permissions (read-only, the
 * one object) and knows who the administrators are. Cost IQ's scoring service is
 * wrapped too (CQ1).
 * ------------------------------------------------------------------ */
for (const fn of [
  backend.evaluateFinOpsIqFunction, backend.manageFinOpsAssessmentFunction, backend.finopsIqReportFunction,
  backend.evaluateSovereignIqFunction, backend.evaluateCloudIqFunction,
  backend.evaluateStrategyIqFunction, backend.evaluateModernizationIqFunction, backend.evaluateResilienceIqFunction,
  backend.manageResilienceAssessmentFunction, backend.manageResilienceEvidenceFunction, backend.manageSovereignAssessmentFunction, backend.manageSessionFunction, backend.manageCostAssessmentFunction, backend.sovereignIqReportFunction, backend.costIqReportFunction,
  backend.sovereignIqNarrativeFunction, backend.evaluateCostIqFunction
]) {
  fn.addEnvironment('REPORTS_BUCKET', REPORTS_BUCKET);
  fn.addEnvironment('SUPER_ADMIN_EMAILS', SUPER_ADMIN_EMAILS);
  fn.addEnvironment('ADMIN_GROUP', ADMIN_GROUP);
  // The domain rules (P1): the baseline allow lists and the protected domains, and the one object that holds the rules.
  fn.addEnvironment('ALLOWED_DOMAINS', SIGNUP_ALLOWED_DOMAINS);
  fn.addEnvironment('ALLOWED_EMAILS', SIGNUP_ALLOWED_EMAILS);
  fn.addEnvironment('PROTECTED_DOMAINS', PROTECTED_DOMAINS);
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({
    actions: ['s3:GetObject'],
    resources: [`arn:aws:s3:::${REPORTS_BUCKET}/config/rbac-permissions.json`, `arn:aws:s3:::${REPORTS_BUCKET}/config/domain-rules.json`]
  }));
}

// The services that record assessment activity (P2) write one item per assessment; only those that can delete an
// assessment may delete its activity item.
for (const [fn, canDelete] of [[backend.manageFinOpsAssessmentFunction, true], [backend.manageSovereignAssessmentFunction, true], [backend.manageSessionFunction, true], [backend.manageCostAssessmentFunction, true], [backend.manageResilienceAssessmentFunction, false]] as const) {
  fn.addEnvironment('ACTIVITY_TABLE', activityTable.tableName);
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({
    actions: canDelete ? ['dynamodb:UpdateItem', 'dynamodb:DeleteItem'] : ['dynamodb:UpdateItem'],
    resources: [activityTable.tableArn]
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
// Domain rules (P1): read and write the rules, write and read the audit entries. Never delete: the audit trail is kept.
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}/config/domain-rules.json`, `arn:aws:s3:::${REPORTS_BUCKET}/config/domain-rules-audit/*`]
}));
// The Activity screen reads the activity table (P2); it never writes it.
backend.reportsServiceFunction.addEnvironment('ACTIVITY_TABLE', activityTable.tableName);
reportsLambda.addToRolePolicy(new PolicyStatement({ actions: ['dynamodb:Query', 'dynamodb:Scan'], resources: [activityTable.tableArn] }));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}`]
}));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
  resources: [userPool.userPoolArn]
}));

// Deleting a Resilience IQ assessment, or the daily retention sweep, also deletes evidence files, and only those.
for (const fn of [backend.manageResilienceAssessmentFunction, backend.retentionSweepFunction]) fn.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:DeleteObject'],
  resources: [`arn:aws:s3:::${REPORTS_BUCKET}/resilience-iq/evidence/*`]
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
  sessions: integrate('AdvisorySessions', backend.manageSessionFunction),
  costAssessment: integrate('AdvisoryCostIqAssessment', backend.manageCostAssessmentFunction),
  costReport: integrate('AdvisoryCostIqReport', backend.costIqReportFunction),
  sovereignReport: integrate('AdvisorySovereignIqReport', backend.sovereignIqReportFunction),
  sovereignNarrative: integrate('AdvisorySovereignIqNarrative', backend.sovereignIqNarrativeFunction),
  finopsReport: integrate('AdvisoryFinOpsIqReport', backend.finopsIqReportFunction),
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
// Sovereign IQ (engine v4; Posture IQ is part of it). The v1 engine, the Posture IQ engine and their routes were
// retired at the switch-over (PLAN S5, 26 Oct 2026).
route('/api/evaluate/sovereign-iq/v4', [HttpMethod.POST], integrations.sovereign);
route('/api/sovereign-iq/assessment', [HttpMethod.GET, HttpMethod.POST], integrations.sovereignAssessment);
route('/api/sessions', [HttpMethod.GET, HttpMethod.POST], integrations.sessions);
route('/api/cost-iq/assessment', [HttpMethod.GET, HttpMethod.POST], integrations.costAssessment);
route('/api/cost-iq/report', [HttpMethod.GET], integrations.costReport);
route('/api/sovereign-iq/report', [HttpMethod.GET], integrations.sovereignReport);
route('/api/sovereign-iq/narrative', [HttpMethod.POST], integrations.sovereignNarrative);

/* ------------------------------------------------------------------
 * AI narrative (Sovereign IQ PLAN S9, WS-S1): Claude in Amazon Bedrock
 * through the Messages API. The function only calls the model when
 * AI_ENABLED is 'true'. Inference stays in India (owner decision D29):
 * the role may invoke only the India inference profile from Mumbai, and
 * the model only in the two regions that profile routes to (Mumbai and
 * Hyderabad), and only through that profile.
 * ------------------------------------------------------------------ */
const narrativeLambda = backend.sovereignIqNarrativeFunction.resources.lambda;
const narrativeAccount = Stack.of(narrativeLambda).account;
const indiaProfileArn = `arn:aws:bedrock:ap-south-1:${narrativeAccount}:inference-profile/in.anthropic.claude-opus-5`;
narrativeLambda.addToRolePolicy(new PolicyStatement({
  actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
  resources: [indiaProfileArn]
}));
narrativeLambda.addToRolePolicy(new PolicyStatement({
  actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
  resources: ['ap-south-1', 'ap-south-2'].map(r => `arn:aws:bedrock:${r}::foundation-model/anthropic.claude-opus-5`),
  conditions: { StringEquals: { 'bedrock:InferenceProfileArn': indiaProfileArn } }
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
// Domain access (P1): which domains and addresses may use the platform. Administrators only (checked in the service).
route('/api/domain-rules', [HttpMethod.GET, HttpMethod.POST], integrations.reports);
route('/api/domain-rules/audit', [HttpMethod.GET], integrations.reports);
route('/api/domain-rules/check', [HttpMethod.POST], integrations.reports);
// Users and activity (P2): administrators only (checked in the service).
route('/api/activity/users', [HttpMethod.GET], integrations.reports);
route('/api/activity/user', [HttpMethod.GET], integrations.reports);
route('/api/activity/export', [HttpMethod.GET], integrations.reports);
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
  'POST /api/domain-rules': tight,
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
// Cost IQ scoring, questions and AI routes were open to anyone; they now need the platform Cognito token (CQ1) and the
// handler checks the caller's Cost IQ access. OPTIONS stays open for the preflight, which the Lambda answers.
for (const [path, methods] of [
  ['/api/evaluate/cost-iq', [HttpMethod.POST]],
  ['/api/evaluate/cost-iq/{proxy+}', [HttpMethod.GET, HttpMethod.POST]]
] as const) {
  acceleratorsApi.addRoutes({ path, methods: [...methods], integration: costIqIntegration, authorizer: resilienceAssessmentAuthorizer });
  legacyRoute(path, [HttpMethod.OPTIONS], costIqIntegration);
}

// Advisory-API accelerators: old unauthenticated routes, kept only during cutover. FinOps IQ, FinOps Value
// Case, Sovereign IQ and Posture IQ are already off (CIO-readiness F0, decision D11; Sovereign IQ PLAN S5): their pages
// use the Advisory API only.
if (KEEP_LEGACY_API) {
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
