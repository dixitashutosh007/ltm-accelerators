/**
 * How long FinOps IQ keeps an assessment (execution phase M6, PLAN F11 item 4; owner decision 22 Oct 2026): 24 months
 * after its last change, then deleted automatically; sooner at the client's request. The store sets expiresAt on every
 * write and DynamoDB time to live deletes the record once it passes (amplify/backend.ts). The data notice states the
 * same period from this constant.
 */
export const RETENTION_MONTHS = 24;

/** Epoch seconds RETENTION_MONTHS after `from` (the DynamoDB time-to-live attribute), on the same day of the month. */
export function expiresAt(from: Date): number {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + RETENTION_MONTHS);
  return Math.floor(d.getTime() / 1000);
}
