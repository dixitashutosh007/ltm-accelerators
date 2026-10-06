import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateFinOpsIq } from '../../packages/engine-core/src/accelerators/finops-iq/evaluate';
import { parseFinOpsIqRequest } from '../../packages/engine-core/src/accelerators/finops-iq/contract';

const PATH = '/api/evaluate/finops-iq';

test.describe('FinOps IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseFinOpsIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateFinOpsIq(parsed.value) } };
    });
    await page.goto('/finops-iq');
    await page.evaluate(`localStorage.clear()`);
    await page.evaluate(`loadArchetype('banking')`);
  });

  test('the report is scored by the server; blockers are the server\'s failing critical gates', async ({ page, world }) => {
    await page.evaluate(`switchTab('report')`);
    await expect(page.getByText('Gate Blockers Outstanding')).toBeVisible({ timeout: 15_000 });

    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
    const last = requests[requests.length - 1];
    const parsed = parseFinOpsIqRequest(last);
    expect(parsed.ok).toBe(true);
    expect(Object.keys(last.org).sort()).toEqual(['name', 'sector']);

    const r = evaluateFinOpsIq((parsed as any).value);
    const expectedBlockers = Object.values(r.stageCriticals).flatMap(c => c.failing.filter((f: any) => f.score !== null)).length;
    const kpi = page.locator('.kpi-card', { hasText: 'Gate Blockers Outstanding' }).locator('.kpi-value');
    await expect(kpi).toHaveText(String(expectedBlockers));

    const text = await page.locator('#main-app').innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(world.pageErrors).toEqual([]);
  });

  test('answer options show no point values', async ({ page }) => {
    await page.evaluate(`switchTab('assess')`);
    await expect(page.locator('.opt-btn').first()).toBeVisible();
    await expect(page.locator('#main-app')).not.toContainText(' pts');
  });

  test('if scoring fails, an error is shown and the report is not rendered', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.evaluate(`switchTab('report')`);
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByText('Results are not available yet')).toBeVisible();
    await expect(page.getByText('Gate Blockers Outstanding')).toHaveCount(0);
  });
});
