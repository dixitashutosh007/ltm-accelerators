import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsFunction } from './functions/evaluate-finops/resource';
import { evaluateFinOpsIqFunction } from './functions/evaluate-finops-iq/resource';
import { evaluatePostureIqFunction } from './functions/evaluate-posture-iq/resource';
import { evaluateSovereignIqFunction } from './functions/evaluate-sovereign-iq/resource';
import { evaluateCloudIqFunction } from './functions/evaluate-cloud-iq/resource';
import { evaluateCostIqFunction } from './functions/evaluate-cost-iq/resource';
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
  evaluateCostIqFunction
});

const apiStack = backend.createStack('AcceleratorsApiStack');
const httpApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', { apiName: 'ltm-accelerators-api' });

const integrations = {
  finops: new HttpLambdaIntegration('EvaluateFinOpsIntegration', backend.evaluateFinOpsFunction.resources.lambda),
  finopsIq: new HttpLambdaIntegration('EvaluateFinOpsIqIntegration', backend.evaluateFinOpsIqFunction.resources.lambda),
  posture: new HttpLambdaIntegration('EvaluatePostureIqIntegration', backend.evaluatePostureIqFunction.resources.lambda),
  sovereign: new HttpLambdaIntegration('EvaluateSovereignIqIntegration', backend.evaluateSovereignIqFunction.resources.lambda),
  cloud: new HttpLambdaIntegration('EvaluateCloudIqIntegration', backend.evaluateCloudIqFunction.resources.lambda),
  costIq: new HttpLambdaIntegration('EvaluateCostIqIntegration', backend.evaluateCostIqFunction.resources.lambda)
};

httpApi.addRoutes({ path: '/api/evaluate/finops-value-case', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finops });
httpApi.addRoutes({ path: '/api/evaluate/finops-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.finopsIq });
httpApi.addRoutes({ path: '/api/evaluate/posture-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.posture });
httpApi.addRoutes({ path: '/api/evaluate/sovereign-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.sovereign });
httpApi.addRoutes({ path: '/api/evaluate/cloud-iq', methods: [HttpMethod.POST, HttpMethod.OPTIONS], integration: integrations.cloud });

httpApi.addRoutes({
  path: '/api/evaluate/cost-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: integrations.costIq
});
httpApi.addRoutes({
  path: '/api/evaluate/cost-iq/{proxy+}',
  methods: [HttpMethod.GET, HttpMethod.OPTIONS],
  integration: integrations.costIq
});

backend.addOutput({ custom: { apiUrl: httpApi.url } });
