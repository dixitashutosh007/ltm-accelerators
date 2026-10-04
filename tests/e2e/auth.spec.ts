import { test, expect, TEST_API } from './fixtures';

// AUTH_USER is a script-level `let` in the portal, so it is read by name rather than via window.

test.describe('Portal sign-in and access control', () => {
  test('admin signs in; permissions come from /api/me with a bearer token', async ({ page, world }) => {
    await page.goto('/');
    await page.evaluate(() => (window as any).openLoginModal());
    await page.fill('#loginEmail', 'admin@ltm.com');
    await page.fill('#loginPassword', 'Passw0rd!');
    await page.click('#btnSubmitLogin');

    await expect.poll(() => page.evaluate(() => (window as any).isSuperAdmin())).toBe(true);
    const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ltm_auth_user') || '{}'));
    expect(session.email).toBe('admin@ltm.com');
    expect(session.role).toBe('super_admin');
    expect(session.refreshToken).toBe('refresh-admin@ltm.com');
    expect(world.calls).toContain('GET /api/me auth=bearer');

    // Access Control loads the user list through the authenticated API.
    await page.evaluate(() => (window as any).fetchAndRenderUsers());
    await expect(page.locator('#userListContainer')).toContainText('consultant@ltm.com');
    expect(world.calls).toContain('GET /api/users auth=bearer');
    expect(world.calls.every(c => !c.includes('auth=none'))).toBe(true);
  });

  test('wrong password shows an error and stores no session', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => (window as any).openLoginModal());
    await page.fill('#loginEmail', 'admin@ltm.com');
    await page.fill('#loginPassword', 'wrong');
    await page.click('#btnSubmitLogin');
    await expect(page.locator('#loginError')).toContainText('Incorrect username or password');
    expect(await page.evaluate(() => sessionStorage.getItem('ltm_auth_user'))).toBeNull();
  });

  test('consultant is not an admin; the login form has no pre-filled address', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => (window as any).openLoginModal());
    await expect(page.locator('#loginEmail')).toHaveValue('');
    await page.fill('#loginEmail', 'consultant@ltm.com');
    await page.fill('#loginPassword', 'Passw0rd!');
    await page.click('#btnSubmitLogin');
    await expect.poll(() => page.evaluate('AUTH_USER && AUTH_USER.email')).toBe('consultant@ltm.com');
    expect(await page.evaluate(() => (window as any).isSuperAdmin())).toBe(false);
  });

  test('Cost IQ stays disabled while its feature flag is off', async ({ page }) => {
    await page.goto('/');
    const costIq = page.locator('#btnLaunchCostIq');
    await expect(costIq).toBeDisabled();
    await expect(costIq).toHaveText(/Temporarily Unavailable/);
  });

  test('forgot password uses Cognito codes, not a direct reset', async ({ page, world }) => {
    await page.goto('/');
    await page.evaluate(() => { (window as any).openLoginModal(); (window as any).showPasswordResetView(true); });
    await page.fill('#resetEmail', 'consultant@ltm.com');
    await page.click('#btnSendResetCode');
    await expect(page.locator('#resetSuccess')).toContainText('If this email is registered');
    await page.fill('#resetCode', '123456');
    await page.fill('#resetNewPass', 'N3wPassw0rd!');
    await page.fill('#resetConfirmPass', 'N3wPassw0rd!');
    await page.click('#btnSubmitReset');
    await expect(page.locator('#resetSuccess')).toContainText('Password reset');
    expect(world.calls).toEqual(expect.arrayContaining(['COGNITO ForgotPassword', 'COGNITO ConfirmForgotPassword']));
    expect(world.calls.some(c => c.includes('reset-password'))).toBe(false);
  });

  test('sign-out revokes the refresh token and clears the session', async ({ page, world }) => {
    await page.goto('/');
    await page.evaluate(() => (window as any).openLoginModal());
    await page.fill('#loginEmail', 'consultant@ltm.com');
    await page.fill('#loginPassword', 'Passw0rd!');
    await page.click('#btnSubmitLogin');
    await expect.poll(() => page.evaluate('!!AUTH_USER')).toBe(true);
    await page.evaluate(() => (window as any).logout());
    await expect.poll(() => world.calls.includes('COGNITO RevokeToken')).toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem('ltm_auth_user'))).toBeNull();
  });

  test('post-login redirect only follows same-site paths', async ({ page }) => {
    await page.goto('/?redirect=' + encodeURIComponent('//evil.example/steal'));
    await page.evaluate(() => (window as any).openLoginModal());
    await page.fill('#loginEmail', 'consultant@ltm.com');
    await page.fill('#loginPassword', 'Passw0rd!');
    await page.click('#btnSubmitLogin');
    await expect.poll(() => page.evaluate('!!AUTH_USER')).toBe(true);
    expect(new URL(page.url()).host).toBe('localhost:4173');
  });

  test('the frontend calls the API address from runtime config', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => (window as any).LTM_API.apiBase())).toBe(TEST_API);
  });
});
