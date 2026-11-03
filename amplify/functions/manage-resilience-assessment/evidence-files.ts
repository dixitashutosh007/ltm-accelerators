/**
 * Removes evidence files when their assessment is deleted. Files live under resilience-iq/evidence/ in the reports
 * bucket (see manage-resilience-evidence/storage.ts); the key must be inside that prefix, whatever a record says.
 */
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { EVIDENCE_PREFIX } from '../manage-resilience-evidence/storage';

export interface EvidenceFiles {
  remove(key: string): Promise<void>;
}

let client: S3Client | undefined;

export const s3EvidenceFiles: EvidenceFiles = {
  async remove(key) {
    if (!key.startsWith(EVIDENCE_PREFIX)) throw new Error('Evidence file key is outside the evidence prefix.');
    const Bucket = process.env.REPORTS_BUCKET;
    if (!Bucket) throw new Error('REPORTS_BUCKET is not configured.');
    await (client ??= new S3Client({})).send(new DeleteObjectCommand({ Bucket, Key: key }));
  }
};
