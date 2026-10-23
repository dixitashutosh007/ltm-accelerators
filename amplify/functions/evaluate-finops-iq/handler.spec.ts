/**
 * The FinOps IQ scoring route (/v3) scores the merged product (execution phase M2). The v2 engine was retired at
 * cutover (M8).
 */
import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from './handler';

const facts = {
  org: { currency: 'USD', consumingUnits: '5-19' },
  footprint: { publicCloudProviders: ['aws'], scopes: ['public_cloud'] },
  spend: { byScope: { aws: { exact: 20_000_000 } }, growth12m: 10 }
};
const post = async (rawPath: string, body: unknown, query?: Record<string, string>) => {
  const res = (await handler({ rawPath, queryStringParameters: query, requestContext: { http: { method: 'POST' } }, headers: {}, body: JSON.stringify(body) } as any)) as APIGatewayProxyStructuredResultV2;
  return { status: res.statusCode, body: JSON.parse(String(res.body)) };
};

describe('POST /api/evaluate/finops-iq/v3', () => {
  it('scores an executive request with the v3 engine', async () => {
    const res = await post('/api/evaluate/finops-iq/v3', { mode: 'executive', facts, answers: { 'MP-01': 'walk', 'OP-06': 'crawl' } });
    expect(res.status).toBe(200);
    expect(res.body.data.versions.engine).toBe('3.6.3');
    expect(res.body.data.mode).toBe('executive');
    expect(res.body.data.needVerdict).not.toBeNull();
  });

  it('?view=client removes consultant-only fields on the server', async () => {
    const body = { mode: 'executive', facts, answers: { 'MP-01': 'walk', 'UN-04': 'run', 'UN-11': 'crawl' } };
    const full = await post('/api/evaluate/finops-iq/v3', body);
    const client = await post('/api/evaluate/finops-iq/v3', body, { view: 'client' });
    expect(full.body.data.tier.trace).toBeDefined();
    expect(client.body.data.view).toBe('client');
    expect(client.body.data.tier.trace).toBeUndefined();
    expect(client.body.data.needVerdict.baseIndex).toBeUndefined();
    expect(client.body.data.conflicts).toEqual([]);
  });

  it('rejects a payload for the retired v2 engine', async () => {
    expect((await post('/api/evaluate/finops-iq/v3', { answers: { C1: 100 } })).status).toBe(400);
  });
});
