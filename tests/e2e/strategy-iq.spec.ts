import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateStrategyIq } from '../../packages/engine-core/src/accelerators/strategy-iq/evaluate';
import { parseStrategyIqRequest } from '../../packages/engine-core/src/accelerators/strategy-iq/contract';

const PATH = '/api/evaluate/strategy-iq';

test.describe('Strategy IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseStrategyIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateStrategyIq(parsed.value) } };
    });
  });

  for (const key of ['bank', 'tech']) {
    test(`demo client "${key}" is scored by the server and the readout has no gaps`, async ({ page, world }) => {
      await page.goto('/strategy-iq');
      await page.evaluate(k => (window as any).loadArchetype(k, true), key);
      await expect(page.getByText('Strategic Anchor Maturity Breakdown')).toBeVisible({ timeout: 15_000 });

      expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
      expect(requests).toHaveLength(1);
      expect(parseStrategyIqRequest(requests[0]).ok).toBe(true);

      // The readout shows the server's overall score.
      const expected = evaluateStrategyIq(parseStrategyIqRequest(requests[0]).ok ? (parseStrategyIqRequest(requests[0]) as any).value : {});
      await page.waitForTimeout(2000); // count-up animations
      const text = (await page.locator('#results-mount').textContent()) || '';
      expect(text).toContain(expected.overall.toFixed(1));
      expect(text).toContain(expected.band);
      expect(text).toContain('Operating Model Maturity');
      expect(text).not.toMatch(/Velocity Multiple|\bundefined\b|\bNaN\b/);
      expect(world.pageErrors).toEqual([]);
    });
  }

  test('a selected option is stored as its index and shown as selected', async ({ page }) => {
    await page.goto('/strategy-iq');
    await page.evaluate(() => (window as any).loadArchetype('bank', false));
    const qid: string = await page.evaluate(`STRATEGY_QUESTIONS.find(q => q.type === 'single_select').id`);
    const option = page.locator(`.opt-row[onclick*="selectSingleChoice('${qid}', 3)"]`);
    await option.click();
    expect(await page.evaluate(`STATE.answers['${qid}']`)).toBe(3);
    await expect(page.locator(`.opt-row[onclick*="selectSingleChoice('${qid}', 3)"]`)).toHaveClass(/selected/);
    await expect(page.locator(`.opt-row.selected[onclick*="selectSingleChoice('${qid}',"]`)).toHaveCount(1);
  });

  test('if scoring fails, an error is shown and no readout is computed locally', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.goto('/strategy-iq');
    await page.evaluate(() => (window as any).loadArchetype('bank', true));
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByText('Strategic Anchor Maturity Breakdown')).toBeHidden();
    expect(await page.evaluate('STATE.computedResults')).toBeNull();
  });
});
