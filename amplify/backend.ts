import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
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
import {
  ALLOWED_ORIGINS, API_BURST_LIMIT, API_RATE_LIMIT, COGNITO_ISSUER, KEEP_LEGACY_API,
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
  reportsServiceFunction
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
    allowOrigins: ALLOWED_ORIGINS,
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
  costIq: integrate('AdvisoryCostIq', backend.evaluateCostIqFunction),
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
route('/api/evaluate/cost-iq', [HttpMethod.POST], integrations.costIq);
route('/api/evaluate/cost-iq/metadata', [HttpMethod.GET], integrations.costIq);
route('/api/evaluate/cost-iq/questions', [HttpMethod.GET], integrations.costIq);
route('/api/evaluate/cost-iq/orchestrate', [HttpMethod.POST], integrations.costIq);
route('/api/evaluate/cost-iq/ai-review', [HttpMethod.POST], integrations.costIq);
route('/api/evaluate/cost-iq/ai-report', [HttpMethod.POST], integrations.costIq);

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
const tight = { throttlingRateLimit: 2, throttlingBurstLimit: 5 };
stage.defaultRouteSettings = { throttlingRateLimit: API_RATE_LIMIT, throttlingBurstLimit: API_BURST_LIMIT };
stage.routeSettings = {
  'POST /api/users/create': tight,
  'POST /api/users/set-password': tight,
  'POST /api/users/permissions': tight,
  'POST /api/reports/delete': tight,
  'POST /api/evaluate/cost-iq/ai-review': tight,
  'POST /api/evaluate/cost-iq/ai-report': tight
};
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
 * Legacy API (pre-Phase-1, no authorizer). Kept only during cutover so the
 * currently deployed frontend keeps working; remove by setting
 * LTM_KEEP_LEGACY_API=false in the Amplify console and redeploying.
 * ------------------------------------------------------------------ */
let legacyApiUrl: string | undefined;
if (KEEP_LEGACY_API) {
  const legacyApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', { apiName: 'ltm-accelerators-api' });
  const legacy = {
    finops: integrate('EvaluateFinOpsIntegration', backend.evaluateFinOpsFunction),
    finopsIq: integrate('EvaluateFinOpsIqIntegration', backend.evaluateFinOpsIqFunction),
    posture: integrate('EvaluatePostureIqIntegration', backend.evaluatePostureIqFunction),
    sovereign: integrate('EvaluateSovereignIqIntegration', backend.evaluateSovereignIqFunction),
    cloud: integrate('EvaluateCloudIqIntegration', backend.evaluateCloudIqFunction),
    costIq: integrate('EvaluateCostIqIntegration', backend.evaluateCostIqFunction),
    strategy: integrate('EvaluateStrategyIqIntegration', backend.evaluateStrategyIqFunction),
    modernization: integrate('EvaluateModernizationIqIntegration', backend.evaluateModernizationIqFunction)
  };
  const legacyRoute = (path: string, methods: HttpMethod[], integration: HttpLambdaIntegration) =>
    legacyApi.addRoutes({ path, methods, integration });
  legacyRoute('/api/evaluate/finops-value-case', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.finops);
  legacyRoute('/api/evaluate/finops-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.finopsIq);
  legacyRoute('/api/evaluate/posture-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.posture);
  legacyRoute('/api/evaluate/sovereign-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.sovereign);
  legacyRoute('/api/evaluate/cloud-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.cloud);
  legacyRoute('/api/evaluate/strategy-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.strategy);
  legacyRoute('/api/evaluate/modernization-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.modernization);
  legacyRoute('/api/evaluate/cost-iq', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.costIq);
  legacyRoute('/api/evaluate/cost-iq/{proxy+}', [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS], legacy.costIq);
  legacyRoute('/api/evaluate/cost-iq/ai-review', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.costIq);
  legacyRoute('/api/evaluate/cost-iq/ai-report', [HttpMethod.POST, HttpMethod.OPTIONS], legacy.costIq);
  legacyApiUrl = legacyApi.url;
}

backend.addOutput({
  custom: {
    apiUrl: advisoryApi.url,
    ...(legacyApiUrl ? { legacyApiUrl } : {}),
    cognito: { region: REGION, userPoolId: USER_POOL_ID, clientId: USER_POOL_CLIENT_ID }
  }
});
