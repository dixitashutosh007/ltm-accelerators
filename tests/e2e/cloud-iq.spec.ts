import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateCloudIq } from '../../packages/engine-core/src/accelerators/cloud-iq/evaluate';
import { parseCloudIqRequest } from '../../packages/engine-core/src/accelerators/cloud-iq/contract';
import { cloudIqAnswers } from '../../packages/engine-core/test/sample-inputs';

const PATH = '/api/evaluate/cloud-iq';

test.describe('Cloud IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseCloudIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateCloudIq(parsed.value) } };
    });
    await page.goto('/cloud-iq');
    await page.evaluate(a => { (window as any).A = a; }, cloudIqAnswers);
  });

  test('the scorecard is scored by the server and shows its results without gaps', async ({ page, world }) => {
    await page.evaluate('computeAndShow()');
    await expect(page.getByText('Estate Maturity Preliminary Scorecard')).toBeVisible({ timeout: 15_000 });

    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
    const parsed = parseCloudIqRequest(requests[0]);
    expect(parsed.ok).toBe(true);
    const expected = evaluateCloudIq((parsed as any).value);
    const text = await page.locator('#app').innerText();
    expect(text).toContain(expected.overall.toFixed(1));
    // The peer baseline comes from the server's full sector benchmark (it used to fall back to 3.0).
    expect(text).toContain(`${expected.peerBenchmark.overall.toFixed(1)} baseline`);
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(world.pageErrors).toEqual([]);
  });

  test('if scoring fails, an error is shown and no scorecard is computed locally', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.evaluate('computeAndShow()');
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByText('Estate Maturity Preliminary Scorecard')).toHaveCount(0);
    expect(await page.evaluate('RESULT')).toBeNull();
  });
});
