import { defineFunction } from '@aws-amplify/backend';

export const reportsServiceFunction = defineFunction({
  name: 'reports-service',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    COGNITO_REGION: 'ap-south-1',
    USER_POOL_ID: 'ap-south-1_91amN2bz4',
    COGNITO_CLIENT_ID: '4iiqcsgvsm0b4ngpps94ho4c67',
    ADMIN_GROUP: 'Admin',
    SUPER_ADMIN_EMAILS: 'dixitashutosh007@gmail.com',
    REPORTS_BUCKET: 'ltm-advisory-reports-223833501993',
    APP_BASE_URL: 'https://main.d199dq940iqyj2.amplifyapp.com'
  }
});
