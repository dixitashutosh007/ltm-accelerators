import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { evaluateFinOpsFunction } from './functions/evaluate-finops/resource';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * AWS Amplify Gen 2 Backend Definition
 * 
 * Packages:
 * - Cognito User Pool with RBAC (Admin, Consultant) and Pre-Sign-up Allowlist
 * - DynamoDB Tables (Accelerator registry, QuestionBanks, ScoringModels, Submissions)
 * - Headless Scoring Lambda Function running evaluateFinOpsValueCase()
 * - HTTP API Gateway exposing POST /api/evaluate/finops-value-case
 */
export const backend = defineBackend({
  auth,
  data,
  evaluateFinOpsFunction
});

// Create custom API Gateway Stack on top of Amplify resources
const apiStack = backend.createStack('AcceleratorsApiStack');

const httpApi = new HttpApi(apiStack, 'AcceleratorsHttpApi', {
  apiName: 'ltm-accelerators-api',
  corsPreflight: {
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowOrigins: ['*'],
    allowHeaders: ['*']
  }
});

const evaluateIntegration = new HttpLambdaIntegration(
  'EvaluateFinOpsIntegration',
  backend.evaluateFinOpsFunction.resources.lambda
);

httpApi.addRoutes({
  path: '/api/evaluate/finops-value-case',
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: evaluateIntegration
});

// Expose API URL in outputs
backend.addOutput({
  custom: {
    apiUrl: httpApi.url
  }
});
