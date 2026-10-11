import { test, expect, makeIdToken, signedIn, TEST_API } from './fixtures';

// Some pages (maintained separately, e.g. Cost IQ) load rbac-guard.js and s3-reports.js without
// runtime-config.js / ltm-api.js. The shared scripts must still work there.
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<script src="/assets/s3-reports.js"></script>
<script src="/assets/rbac-guard.js" data-tool="cloud-iq"></script>
</head><body>compat page</body></html>`;

test.beforeEach(async ({ context }) => {
  await context.route('**/__compat.html', route => route.fulfill({ contentType: 'text/html', body: PAGE }));
});

test('guard admits a signed-in user without ltm-api.js on the page', async ({ page, context }) => {
  await signedIn(context, { email: 'consultant@ltm.com', token: makeIdToken('consultant@ltm.com'), role: 'advisor_viewer', permissions: { take: ['cloud-iq'] } });
  await page.goto('/__compat.html');
  await expect(page.locator('body')).toHaveText('compat page');
});

test('guard sends a signed-out user to sign in without ltm-api.js on the page', async ({ page }) => {
  await page.goto('/__compat.html');
  await expect(page).toHaveURL(/require_login=1/);
});

test('report archive loads the API client on demand and sends the token', async ({ page, context, world }) => {
  await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
  await page.goto('/__compat.html');
  const result = await page.evaluate(() => (window as any).LTM_S3.listReportsFromS3());
  expect(result.ok).toBe(true);
  expect(world.calls).toContain('GET /api/reports/list auth=bearer');
  expect(await page.evaluate(() => (window as any).LTM_API.apiBase())).toBe(TEST_API);
});
