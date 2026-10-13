import { defineFunction } from '@aws-amplify/backend';
import { ALLOWED_ORIGINS, REPORTS_BUCKET } from '../../config';

export const manageResilienceEvidenceFunction = defineFunction({
  name: 'manage-resilience-evidence',
  entry: './handler.ts',
  // Uploads arrive base64-encoded in the request body (up to 4 MB per file).
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
    REPORTS_BUCKET
  }
});
