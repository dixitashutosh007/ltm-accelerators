import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsFunction } from './functions/evaluate-finops/resource';
import { evaluateFinOpsIqFunction } from './functions/evaluate-finops-iq/resource';
import { evaluatePostureIqFunction } from './functions/evaluate-posture-iq/resource';
import { evaluateSovereignIqFunction } from './functions/evaluate-sovereign-iq/resource';
import { evaluateCloudIqFunction } from './functions/evaluate-cloud-iq/resource';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * AWS Amplify Gen 2 Backend Definition (Region: ap-south-1)
 */
export const backend = defineBackend({
  auth,
  data,
  evaluateFinOpsFunction,
  evaluateFinOpsIqFunction,
  evaluatePostureIqFunction,
  evaluateSovereignIqFunction,
  evaluateCloudIqFunction
});

// Create custom API Gateway Stack on top of Amplify resources
const apiStack = backend.createStack('AcceleratorsApiStack');

const httpApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', {
  apiName: 'ltm-accelerators-api'
});

const evaluateIntegration = new HttpLambdaIntegration(
  'EvaluateFinOpsIntegration',
  backend.evaluateFinOpsFunction.resources.lambda
);

const evaluateIqIntegration = new HttpLambdaIntegration(
  'EvaluateFinOpsIqIntegration',
  backend.evaluateFinOpsIqFunction.resources.lambda
);

const evaluatePostureIntegration = new HttpLambdaIntegration(
  'EvaluatePostureIqIntegration',
  backend.evaluatePostureIqFunction.resources.lambda
);

const evaluateSovereignIntegration = new HttpLambdaIntegration(
  'EvaluateSovereignIqIntegration',
  backend.evaluateSovereignIqFunction.resources.lambda
);

const evaluateCloudIntegration = new HttpLambdaIntegration(
  'EvaluateCloudIqIntegration',
  backend.evaluateCloudIqFunction.resources.lambda
);

httpApi.addRoutes({
  path: '/api/evaluate/finops-value-case',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluateIntegration
});

httpApi.addRoutes({
  path: '/api/evaluate/finops-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluateIqIntegration
});

httpApi.addRoutes({
  path: '/api/evaluate/posture-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluatePostureIntegration
});

httpApi.addRoutes({
  path: '/api/evaluate/sovereign-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluateSovereignIntegration
});

httpApi.addRoutes({
  path: '/api/evaluate/cloud-iq',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluateCloudIntegration
});

// Expose API URL in outputs
backend.addOutput({
  custom: {
    apiUrl: httpApi.url
  }
});
