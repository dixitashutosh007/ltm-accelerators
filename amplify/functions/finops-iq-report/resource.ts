import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

// PDF rendering (pdfmake, fonts bundled) needs more memory and time than the scoring Lambdas.
export const finopsIqReportFunction = defineFunction({
  name: 'finops-iq-report',
  entry: './handler.ts',
  // Retention (M6): FinOps IQ logs are kept for one year, as the API access logs.
  logging: { retention: '1 year' },
  timeoutSeconds: 30,
  memoryMB: 1024,
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
