import { test, expect } from '@playwright/test';

// A fresh context: no seeded acceptance, unlike the shared fixtures.
test.describe('development-preview notice', () => {
  test('blocks the page until it is accepted, then stays accepted for the visit and returns on a new visit', async ({ page, browser }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('personal development cloud account');
    await expect(dialog).toContainText('ashutosh.dixit@ltm.com');
    await expect(dialog).toContainText('authorised by LTM management');
    const accept = page.getByRole('button', { name: 'Accept and continue' });
    await expect(accept).toBeDisabled();

    // Escape does not dismiss it, and the page behind is inert.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => Array.from(document.body.children).filter(e => e.id !== 'dn-overlay' && e.id !== 'dn-bar' && !e.hasAttribute('inert') && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE').length)).toBe(0);

    await page.getByRole('checkbox').check();
    await expect(accept).toBeEnabled();
    await accept.click();
    await expect(dialog).toHaveCount(0);

    // Same visit, another page: not asked again; footer banner present.
    await page.goto('/cost-iq-v10.html');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#dn-bar')).toContainText('personal development account');

    // A new visit (new context) asks again.
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await p2.goto('/');
    await expect(p2.getByRole('dialog')).toBeVisible();
    await ctx.close();
  });

  test('declining keeps the user out and lets them read it again; the banner reopens the notice read-only', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'I do not accept' }).click();
    await expect(page.getByRole('dialog')).toContainText('cannot continue');
    await page.getByRole('button', { name: 'Read the notice again' }).click();
    await expect(page.getByRole('button', { name: 'Accept and continue' })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Accept and continue' }).click();
    await page.getByRole('button', { name: 'Read the notice' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('fits a 360 px screen with the actions reachable and no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'I do not accept' })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
