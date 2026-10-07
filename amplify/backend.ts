import { defineBackend } from '@aws-amplify/backend';
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
import { evaluateResilienceIqFunction } from './functions/evaluate-resilience-iq/resource';
import { manageResilienceEvidenceFunction } from './functions/manage-resilience-evidence/resource';
import { manageResilienceAssessmentFunction } from './functions/manage-resilience-assessment/resource';
import { reportsServiceFunction } from './functions/reports-service/resource';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

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
  evaluateResilienceIqFunction,
  manageResilienceEvidenceFunction,
  manageResilienceAssessmentFunction,
  reportsServiceFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');
const httpApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', {
  apiName: 'ltm-accelerators-api',
  corsPreflight: {
    allowOrigins: ['*'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    allowMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS]
  }
});

const integrations = {
  finops: new HttpLambdaIntegration('EvaluateFinOpsIntegration', backend.evaluateFinOpsFunction.resources.lambda),
  finopsIq: new HttpLambdaIntegration('EvaluateFinOpsIqIntegration', backend.evaluateFinOpsIqFunction.resources.lambda),
  posture: new HttpLambdaIntegration('EvaluatePostureIqIntegration', backend.evaluatePostureIqFunction.resources.lambda),
  sovereign: new HttpLambdaIntegration('EvaluateSovereignIqIntegration', backend.evaluateSovereignIqFunction.resources.lambda),
  cloud: new HttpLambdaIntegration('EvaluateCloudIqIntegration', backend.evaluateCloudIqFunction.resources.lambda),
  costIq: new HttpLambdaIntegration('EvaluateCostIqIntegration', backend.evaluateCostIqFunction.resources.lambda),
  strategy: new HttpLambdaIntegration('EvaluateStrategyIqIntegration', backend.evaluateStrategyIqFunction.resources.lambda),
  modernization: new HttpLambdaIntegration('EvaluateModernizationIqIntegration', backend.evaluateModernizationIqFunction.resources.lambda),
  resilience: new HttpLambdaIntegration('EvaluateResilienceIqIntegration', backend.evaluateResilienceIqFunction.resources.lambda),
  resilienceEvidence: new HttpLambdaIntegration('ManageResilienceEvidenceIntegration', backend.manageResilienceEvidenceFunction.resources.lambda),
  resilienceAssessment: new HttpLambdaIntegration('ManageResilienceAssessmentIntegration', backend.manageResilienceAssessmentFunction.resources.lambda),
  reports: new HttpLambdaIntegration('ReportsServiceIntegration', backend.reportsServiceFunction.resources.lambda)
};

// The reports service uses the existing platform Cognito pool and reports bucket.
// Keep its IAM scope limited to the RBAC config/reports objects and user-admin calls.
const reportsLambda = backend.reportsServiceFunction.resources.lambda;
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [
    'arn:aws:s3:::ltm-advisory-reports-223833501993/reports/*',
    'arn:aws:s3:::ltm-advisory-reports-223833501993/config/rbac-permissions.json'
  ]
}));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: ['arn:aws:s3:::ltm-advisory-reports-223833501993']
}));
reportsLambda.addToRolePolicy(new PolicyStatement({
  actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
  resources: ['arn:aws:cognito-idp:ap-south-1:*:userpool/ap-south-1_91amN2bz4']
}));

httpApi.addRoutes({ path: '/api/evaluate/finops-value-case', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finops });
httpApi.addRoutes({ path: '/api/evaluate/finops-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finopsIq });
httpApi.addRoutes({ path: '/api/evaluate/posture-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.posture });
httpApi.addRoutes({ path: '/api/evaluate/sovereign-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.sovereign });
httpApi.addRoutes({ path: '/api/evaluate/cloud-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.cloud });
httpApi.addRoutes({ path: '/api/evaluate/strategy-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.strategy });
httpApi.addRoutes({ path: '/api/evaluate/modernization-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.modernization });
httpApi.addRoutes({ path: '/api/evaluate/resilience-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.resilience });
httpApi.addRoutes({ path: '/api/resilience-iq/evidence', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.resilienceEvidence });

// Reuse the platform's existing Cognito identity. Resilience IQ has no separate login.
// Use an explicit JWT issuer/audience so API Gateway validates the same token
// issued by the platform login, independent of Amplify-managed auth resources.
const resilienceAssessmentAuthorizer = new HttpJwtAuthorizer(
  'ResilienceAssessmentJwtAuthorizer',
  'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_91amN2bz4',
  {
    jwtAudience: ['4iiqcsgvsm0b4ngpps94ho4c67']
  }
);

httpApi.addRoutes({
  path: '/api/resilience-iq/assessment',
  methods: [HttpMethod.GET, HttpMethod.POST],
  integration: integrations.resilienceAssessment,
  authorizer: resilienceAssessmentAuthorizer
});

// User administration uses the same platform Cognito JWT and the same API/CORS boundary.
httpApi.addRoutes({
  path: '/api/users',
  methods: [HttpMethod.GET],
  integration: integrations.reports,
  authorizer: resilienceAssessmentAuthorizer
});
httpApi.addRoutes({
  path: '/api/users/create',
  methods: [HttpMethod.POST],
  integration: integrations.reports,
  authorizer: resilienceAssessmentAuthorizer
});
httpApi.addRoutes({
  path: '/api/users/set-password',
  methods: [HttpMethod.POST],
  integration: integrations.reports,
  authorizer: resilienceAssessmentAuthorizer
});
httpApi.addRoutes({
  path: '/api/users/permissions',
  methods: [HttpMethod.POST],
  integration: integrations.reports,
  authorizer: resilienceAssessmentAuthorizer
});

httpApi.addRoutes({
  path: '/api/evaluate/cost-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: integrations.costIq
});
httpApi.addRoutes({
  path: '/api/evaluate/cost-iq/{proxy+}',
  methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS],
  integration: integrations.costIq
});
httpApi.addRoutes({
  path: '/api/evaluate/cost-iq/ai-review',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: integrations.costIq
});
httpApi.addRoutes({
  path: '/api/evaluate/cost-iq/ai-report',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: integrations.costIq
});

backend.addOutput({ custom: { apiUrl: httpApi.url } });
