/**
 * The FinOps IQ scoring route: /v3 scores the merged product (execution phase M2); the plain route keeps v2 for the
 * current page until cutover (M8).
 */
import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from './handler';

const facts = {
  org: { currency: 'USD', consumingUnits: '5-19' },
  footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] },
  spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 }
};
const post = async (rawPath: string, body: unknown) => {
  const res = (await handler({ rawPath, requestContext: { http: { method: 'POST' } }, headers: {}, body: JSON.stringify(body) } as any)) as APIGatewayProxyStructuredResultV2;
  return { status: res.statusCode, body: JSON.parse(String(res.body)) };
};

describe('POST /api/evaluate/finops-iq/v3', () => {
  it('scores an executive request with the v3 engine', async () => {
    const res = await post('/api/evaluate/finops-iq/v3', { mode: 'executive', facts, answers: { 'MP-01': 'walk', 'OP-06': 'crawl' } });
    expect(res.status).toBe(200);
    expect(res.body.data.versions.engine).toBe('3.3.0');
    expect(res.body.data.mode).toBe('executive');
    expect(res.body.data.needVerdict).not.toBeNull();
  });

  it('rejects a v2 payload, and a v3 payload sent to the v2 route', async () => {
    expect((await post('/api/evaluate/finops-iq/v3', { answers: { C1: 100 } })).status).toBe(400);
    expect((await post('/api/evaluate/finops-iq', { mode: 'executive', facts, answers: { 'MP-01': 'walk' } })).status).toBe(400);
  });
});
