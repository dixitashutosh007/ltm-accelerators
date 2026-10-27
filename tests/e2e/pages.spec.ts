import { test, expect, makeIdToken, signedIn } from './fixtures';

// Every hosted page, opened as an administrator under the production security headers.
// (Cost IQ and Resilience IQ are maintained separately and have their own test suites.)
const PAGES = [
  '/', '/strategy-iq', '/modernization-iq', '/finops-iq',
  '/cloud-iq', '/sovereign-iq', '/ai-readiness-iq', '/studio',
  '/cloud-iq-sample-report', '/sovereign-iq-sample-report', '/portal'
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
    expect(world.missingFiles, 'missing same-site files').toEqual([]);
    expect(page.url()).not.toContain('require_login');
  });
}

test('no page sends data to third-party AI services on load', async ({ page, context, world }) => {
  await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
  for (const path of ['/strategy-iq', '/cloud-iq', '/sovereign-iq', '/finops-iq']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(world.calls.filter(c => c.startsWith('BLOCKED-AI'))).toEqual([]);
});

test('FinOps Value Case is retired: its old address forwards to FinOps IQ executive mode, and the portal no longer lists it', async ({ page, context }) => {
  await signedIn(context, { email: 'fvc@ltm.com', token: makeIdToken('fvc@ltm.com'), role: 'advisor_viewer', permissions: { take: ['finops-value-case'] } });
  await page.goto('/finops-value-case');
  await page.waitForURL(/\/finops-iq\?mode=executive$/);
  // A Value Case permission opens FinOps IQ (owner decision, 22 Oct 2026), with executive mode preselected.
  await expect(page.getByRole('radio', { name: /^Executive/ })).toBeChecked();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'FinOps IQ', exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/FinOps Value Case/);
});

test('FinOps IQ cutover (M8): /finops-iq-v3 links forward to /finops-iq with their query kept', async ({ page, context }) => {
  await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
  await page.goto('/finops-iq-v3?mode=workshop');
  await page.waitForURL(/\/finops-iq\?mode=workshop$/);
  await expect(page.getByRole('radio', { name: /^Workshop/ })).toBeChecked();
});

test('Sovereign IQ switch-over (S5): /sovereign-iq-v4 links forward with their query kept; Posture IQ forwards to Sovereign IQ and the portal no longer lists it', async ({ page, context }) => {
  await signedIn(context, { email: 'posture@ltm.com', token: makeIdToken('posture@ltm.com'), role: 'custom', permissions: { take: ['posture-iq'] } });
  await page.goto('/sovereign-iq-v4?assessment=SIQ-0001');
  await page.waitForURL(/\/sovereign-iq\?assessment=SIQ-0001$/);
  await page.goto('/posture-iq');
  await page.waitForURL(/\/sovereign-iq$/);
  // A Posture IQ permission opens Sovereign IQ (PLAN S5).
  await expect(page.getByRole('heading', { level: 1, name: 'Sovereign IQ' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sovereign IQ', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Posture IQ' })).toHaveCount(0);
});
