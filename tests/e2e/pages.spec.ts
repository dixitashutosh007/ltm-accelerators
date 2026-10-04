import { test, expect, makeIdToken, signedIn } from './fixtures';

// Every hosted page, opened as an administrator under the production security headers.
const PAGES = [
  '/', '/strategy-iq', '/modernization-iq', '/finops-value-case', '/finops-iq', '/cost-iq-v10',
  '/cloud-iq', '/sovereign-iq', '/posture-iq', '/ai-readiness-iq', '/studio',
  '/cloud-iq-sample-report', '/sovereign-iq-sample-report', '/finops-iq-sample-report', '/portal'
];

for (const path of PAGES) {
  test(`${path} loads without CSP violations or script errors`, async ({ page, context, world }) => {
    await signedIn(context, {
      email: 'admin@ltm.com',
      token: makeIdToken('admin@ltm.com'),
      refreshToken: 'refresh-admin@ltm.com',
      role: 'super_admin',
      permissions: {}
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(world.cspViolations, 'CSP violations').toEqual([]);
    expect(world.pageErrors, 'uncaught page errors').toEqual([]);
    expect(page.url()).not.toContain('require_login');
  });
}

test('no page sends data to third-party AI services on load', async ({ page, context, world }) => {
  await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
  for (const path of ['/strategy-iq', '/cloud-iq', '/sovereign-iq', '/posture-iq', '/finops-iq']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(world.calls.filter(c => c.startsWith('BLOCKED-AI'))).toEqual([]);
});
