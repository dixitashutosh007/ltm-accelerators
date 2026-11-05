import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS } from '../../config';

/** The Cost IQ report PDF and backlog CSV (CQ5). Rendering the PDF needs more memory and time than a save. */
export const costIqReportFunction = defineFunction({
  name: 'cost-iq-report',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
  logging: { retention: '1 year' },
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(',')
  }
});
