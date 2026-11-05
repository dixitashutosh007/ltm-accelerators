import { defineFunction } from '@aws-amplify/backend';
import { REPORTS_BUCKET } from '../../config';

export const retentionSweepFunction = defineFunction({
  name: 'retention-sweep',
  entry: './handler.ts',
  // Once a day; DynamoDB time to live deletes the expired records, this removes what they leave behind.
  schedule: 'every day',
  timeoutSeconds: 300,
  logging: { retention: '1 year' },
  environment: { REPORTS_BUCKET }
});
