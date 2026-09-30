import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsFunction } from './functions/evaluate-finops/resource';
import { evaluateFinOpsIqFunction } from './functions/evaluate-finops-iq/resource';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * AWS Amplify Gen 2 Backend Definition (Region: ap-south-1)
 */
export const backend = defineBackend({
  auth,
  data,
  evaluateFinOpsFunction,
  evaluateFinOpsIqFunction
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

// Expose API URL in outputs
backend.addOutput({
  custom: {
    apiUrl: httpApi.url
  }
});
