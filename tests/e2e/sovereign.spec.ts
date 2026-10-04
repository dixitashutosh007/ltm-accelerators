import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateSovereignIq } from '../../packages/engine-core/src/accelerators/sovereign-iq/evaluate';

test.describe('Sovereign IQ demo clients', () => {
  test.beforeEach(async ({ context, world }) => {
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API runs the real scoring engine, as the Lambda does.
    world.on('POST', '/api/evaluate/sovereign-iq', ({ body }) => ({ body: { ok: true, data: evaluateSovereignIq(body) } }));
  });

  test('Saudi bank is scored by the server with Saudi regulations in scope', async ({ page, world }) => {
    await page.goto('/sovereign-iq');
    await page.evaluate(() => (window as any).loadDemoArchetype('saudi_bank', true));
    await expect(page.getByText('Binding Regimes', { exact: false })).toBeVisible({ timeout: 15_000 });
    const text = await page.locator('body').innerText();
    expect(world.calls).toContain('POST /api/evaluate/sovereign-iq auth=bearer');
    expect(text).toMatch(/\b5\s*\n?\s*\/ 30\+/);
    expect(text).toContain('KSA PDPL');
    expect(text).not.toMatch(/undefined|NaN/);
  });

  test('if scoring fails, an error is shown instead of a locally computed report', async ({ page, world }) => {
    world.on('POST', '/api/evaluate/sovereign-iq', () => ({ status: 503, body: { ok: false } }));
    await page.goto('/sovereign-iq');
    await page.evaluate(() => (window as any).loadDemoArchetype('saudi_bank', true));
    await expect(page.getByText('Sovereign IQ results are temporarily unavailable')).toBeVisible({ timeout: 15_000 });
  });
});
