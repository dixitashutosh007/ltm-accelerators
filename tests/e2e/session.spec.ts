import { test, expect, makeIdToken, signedIn } from './fixtures';

const consultant = (token: string, refreshToken?: string) => ({
  email: 'consultant@ltm.com',
  token,
  refreshToken,
  role: 'advisor_viewer',
  permissions: { take: ['sovereign-iq', 'cloud-iq'], view: ['sovereign-iq', 'cloud-iq'] }
});

test.describe('Session handling', () => {
  test('no session: accelerator pages send the user to sign in', async ({ page }) => {
    await page.goto('/cloud-iq');
    await expect(page).toHaveURL(/\/\?require_login=1&redirect=%2Fcloud-iq/);
  });

  test('expired token without a refresh token: back to sign in', async ({ page, context }) => {
    await signedIn(context, consultant(makeIdToken('consultant@ltm.com', -60)));
    await page.goto('/cloud-iq');
    await expect(page).toHaveURL(/require_login=1/);
  });

  test('expired token with a refresh token: page stays open and API calls renew silently', async ({ page, context, world }) => {
    await signedIn(context, consultant(makeIdToken('consultant@ltm.com', -60), 'refresh-consultant@ltm.com'));
    world.on('POST', '/api/evaluate/cloud-iq', () => ({ body: { ok: true, data: {} } }));
    await page.goto('/cloud-iq');
    await expect(page).toHaveURL(/\/cloud-iq$/);

    const status = await page.evaluate(async () => {
      const res = await (window as any).LTM_API.fetch('/api/evaluate/cloud-iq', { method: 'POST', body: '{"answers":{}}' });
      return res.status;
    });
    expect(status).toBe(200);
    expect(world.refreshCount).toBe(1);
    expect(world.calls).toContain('POST /api/evaluate/cloud-iq auth=bearer');
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ltm_auth_user') || '{}'));
    const exp = JSON.parse(Buffer.from(stored.token.split('.')[1], 'base64url').toString()).exp;
    expect(exp * 1000).toBeGreaterThan(Date.now());
  });

  test('a 401 from the API triggers one renewal and a retry', async ({ page, context, world }) => {
    await signedIn(context, consultant(makeIdToken('consultant@ltm.com', 3600), 'refresh-consultant@ltm.com'));
    let first = true;
    world.on('POST', '/api/evaluate/cloud-iq', () => {
      if (first) { first = false; return { status: 401, body: { message: 'Unauthorized' } }; }
      return { body: { ok: true } };
    });
    await page.goto('/cloud-iq');
    const status = await page.evaluate(async () =>
      (await (window as any).LTM_API.fetch('/api/evaluate/cloud-iq', { method: 'POST', body: '{}' })).status);
    expect(status).toBe(200);
    expect(world.refreshCount).toBe(1);
  });

  test('renewal failure ends the session and redirects to sign in', async ({ page, context, world }) => {
    world.refreshShouldFail = true;
    await signedIn(context, consultant(makeIdToken('consultant@ltm.com', -60), 'refresh-consultant@ltm.com'));
    await page.goto('/cloud-iq');
    await page.evaluate(() => (window as any).LTM_API.fetch('/api/me').catch(() => {}));
    await expect(page).toHaveURL(/require_login=1/);
  });

  test('a user without access to an accelerator is sent back to the portal', async ({ page, context }) => {
    await signedIn(context, consultant(makeIdToken('consultant@ltm.com', 3600), 'refresh-consultant@ltm.com'));
    await page.goto('/strategy-iq');
    await expect(page).toHaveURL(/\/$/);
  });
});
