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
    // Four binding regimes: PDPL, NCA, SAMA, Qatar. The CLOUD Act no longer counts: the bank uses a sovereign
    // partner cloud, not a US-headquartered provider (Phase 3 fix).
    expect(text).toMatch(/\b4\s*\n?\s*\/ 30\+/);
    expect(text).toContain('KSA PDPL');
    expect(text).toContain('Illustrative cost of a 24-hour outage (turnover-based)');
    expect(text).not.toMatch(/undefined|NaN|\bnull\b/);
  });

  test('an almost empty questionnaire shows unassessed pillars instead of default scores', async ({ page }) => {
    await page.goto('/sovereign-iq');
    await page.evaluate(async () => {
      const w = window as any;
      w.STATE.answers = { 'Q1.1': 0, 'Q1.2': [2] };
      await w.fetchSovereignIqEvaluation();
      w.SESSION.isUnlocked = true;
      w.STATE.screen = 'report';
      w.renderScreen();
    });
    await expect(page.getByText('Binding Regimes', { exact: false })).toBeVisible({ timeout: 15_000 });
    const text = await page.locator('body').innerText();
    expect(text).toContain('Not assessed');
    expect(text).toContain('Low confidence');
    expect(text).toContain('(assumes $3B turnover)');
    expect(text).not.toMatch(/undefined|NaN|\bnull\b/);
  });

  test('report documents use the server result (the browser engine found no regulations)', async ({ page }) => {
    await page.goto('/sovereign-iq');
    await page.evaluate(() => (window as any).loadDemoArchetype('saudi_bank', true));
    await expect(page.getByText('Binding Regimes', { exact: false })).toBeVisible({ timeout: 15_000 });
    await page.evaluate('openTIAModal()');
    const tia = await page.locator('#tiaTextarea').inputValue();
    expect(tia).toMatch(/PDPL/);
    expect(tia).not.toMatch(/\bundefined\b|\bNaN\b/);
  });

  test('without a server result, report documents show an error instead of empty content', async ({ page }) => {
    await page.goto('/sovereign-iq');
    await page.evaluate('openTIAModal()');
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
  });

  test('if scoring fails, an error is shown instead of a locally computed report', async ({ page, world }) => {
    world.on('POST', '/api/evaluate/sovereign-iq', () => ({ status: 503, body: { ok: false } }));
    await page.goto('/sovereign-iq');
    await page.evaluate(() => (window as any).loadDemoArchetype('saudi_bank', true));
    await expect(page.getByText('Sovereign IQ results are temporarily unavailable')).toBeVisible({ timeout: 15_000 });
  });
});
