/**
 * Evidence files live in the existing reports bucket under resilience-iq/evidence/<assessmentId>/<evidenceId>/.
 * The Lambda's role may read and write only that prefix (amplify/backend.ts). Files are uploaded through the
 * Lambda, so the bucket needs no browser CORS rule, and downloaded with a short-lived presigned link.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface EvidenceStorage {
  put(key: string, body: Buffer, contentType: string, metadata: Record<string, string>): Promise<void>;
  downloadUrl(key: string, fileName: string): Promise<string>;
}

export const EVIDENCE_PREFIX = 'resilience-iq/evidence/';
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const DOWNLOAD_URL_SECONDS = 300;

/** File types accepted as evidence: documents, spreadsheets, presentations, images and plain text. */
export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
};

let client: S3Client | undefined;
const s3 = () => (client ??= new S3Client({}));
const bucket = () => {
  const name = process.env.REPORTS_BUCKET;
  if (!name) throw new Error('REPORTS_BUCKET is not configured.');
  return name;
};

export const s3EvidenceStorage: EvidenceStorage = {
  async put(key, body, contentType, metadata) {
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType, Metadata: metadata, ServerSideEncryption: 'AES256' }));
  },
  async downloadUrl(key, fileName) {
    const disposition = `attachment; filename="${fileName.replace(/["\\\r\n]/g, '_')}"`;
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition }), { expiresIn: DOWNLOAD_URL_SECONDS });
  }
};
