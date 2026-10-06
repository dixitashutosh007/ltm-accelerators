import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluatePostureIq } from '../../packages/engine-core/src/accelerators/posture-iq/evaluate';
import { parsePostureIqRequest } from '../../packages/engine-core/src/accelerators/posture-iq/contract';

const PATH = '/api/evaluate/posture-iq';

test.describe('Posture IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parsePostureIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluatePostureIq(parsed.value) } };
    });
    await page.goto('/posture-iq');
    await page.waitForLoadState('networkidle');
  });

  test('a demo client is scored by the server, and the SOW uses the same result', async ({ page, world }) => {
    await page.evaluate(`loadArchetype('bank', true)`);
    await expect.poll(() => requests.length, { timeout: 15_000 }).toBeGreaterThan(0);
    const parsed = parsePostureIqRequest(requests[requests.length - 1]);
    expect(parsed.ok).toBe(true);
    expect(Object.keys(requests[requests.length - 1].org).sort()).toEqual(['name', 'turnover']);
    const expected = evaluatePostureIq((parsed as any).value);

    const results = page.locator('#screen-results');
    await expect(results).toContainText(String(expected.overallScore), { timeout: 15_000 });
    const text = await results.innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);

    // A report view that used to run the browser engine (zero findings, default scores).
    await page.evaluate(`openSOWModal()`);
    const sow = await page.locator('#sowTextarea').inputValue();
    expect(sow).toContain(String(expected.overallScore));
    expect(world.pageErrors).toEqual([]);
  });

  test('if scoring fails, an error is shown and no results are computed locally', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.evaluate(`loadArchetype('bank', true)`);
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    expect(await page.evaluate('STATE.evaluation')).toBeNull();
    // Report views refuse to run without a server result.
    await page.evaluate(`openSOWModal()`);
    expect(await page.locator('#sowTextarea').inputValue().catch(() => '')).toBe('');
  });
});
