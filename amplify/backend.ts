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
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
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
  manageResilienceAssessmentFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');
const httpApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', { apiName: 'ltm-accelerators-api' });

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
  resilienceAssessment: new HttpLambdaIntegration('ManageResilienceAssessmentIntegration', backend.manageResilienceAssessmentFunction.resources.lambda)
};

httpApi.addRoutes({ path: '/api/evaluate/finops-value-case', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finops });
httpApi.addRoutes({ path: '/api/evaluate/finops-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finopsIq });
httpApi.addRoutes({ path: '/api/evaluate/posture-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.posture });
httpApi.addRoutes({ path: '/api/evaluate/sovereign-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.sovereign });
httpApi.addRoutes({ path: '/api/evaluate/cloud-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.cloud });
httpApi.addRoutes({ path: '/api/evaluate/strategy-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.strategy });
httpApi.addRoutes({ path: '/api/evaluate/modernization-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.modernization });
httpApi.addRoutes({ path: '/api/evaluate/resilience-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.resilience });
httpApi.addRoutes({ path: '/api/resilience-iq/evidence', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.resilienceEvidence });

import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
const resilienceAssessmentAuthorizer = new HttpUserPoolAuthorizer(
  'ResilienceAssessmentUserPoolAuthorizer',
  backend.auth.resources.userPool,
  { userPoolClients: [backend.auth.resources.userPoolClient] }
);
httpApi.addRoutes({ path: '/api/resilience-iq/assessment', methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.resilienceAssessment, authorizer: resilienceAssessmentAuthorizer });

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
