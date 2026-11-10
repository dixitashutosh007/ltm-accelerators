import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

/**
 * Activity tab, "All assessments" (owner request, 10 Nov 2026): every assessment by everyone on one admin screen, with
 * the client, the person, the accelerator, status, stage and times, and filters by client or person, accelerator and status.
 */
const ASSESSMENTS = [
  { email: 'priya@ltm.com', name: 'Priya', clientName: 'Acme Bank', accelerator: 'finops-iq', assessmentId: 'FIQ-1', status: 'in_progress', stage: 'Cost allocation', percent: 60, startedAt: '2026-11-08T09:00:00.000Z', lastSavedAt: '2026-11-10T10:00:00.000Z', completedAt: null, inDirectory: true },
  { email: 'priya@ltm.com', name: 'Priya', clientName: 'Acme Bank', accelerator: 'sovereign-iq', assessmentId: 'SIQ-1', status: 'completed', stage: null, percent: 100, startedAt: '2026-11-01T09:00:00.000Z', lastSavedAt: '2026-11-02T10:00:00.000Z', completedAt: '2026-11-02T10:00:00.000Z', inDirectory: true },
  { email: 'sam@ltm.com', name: '', clientName: 'Globex <b>Ltd</b>', accelerator: 'cloud-iq', assessmentId: 'sess-1', status: 'in_progress', stage: 'Workloads', percent: 30, startedAt: '2026-11-09T09:00:00.000Z', lastSavedAt: '2026-11-09T11:00:00.000Z', completedAt: null, inDirectory: true },
  { email: 'gone@ltm.com', name: '', clientName: null, accelerator: 'cost-iq', assessmentId: 'CIQ-1', status: 'archived', stage: null, percent: null, startedAt: '2026-10-01T09:00:00.000Z', lastSavedAt: '2026-10-02T10:00:00.000Z', completedAt: null, inDirectory: false }
];

test('an administrator sees every assessment by everyone, with the client, and can filter it', async ({ page, world }) => {
  world.on('GET', '/api/activity/assessments', () => ({ body: { ok: true, assessments: ASSESSMENTS, retentionDays: 365 } }));
  world.on('GET', '/api/activity/users', () => ({ body: { ok: true, users: [], retentionDays: 365 } }));
  await page.goto('/');
  await page.evaluate(() => (window as any).openLoginModal());
  await page.fill('#loginEmail', 'admin@ltm.com');
  await page.fill('#loginPassword', 'Passw0rd!');
  await page.click('#btnSubmitLogin');
  await expect.poll(() => page.evaluate(() => (window as any).isSuperAdmin())).toBe(true);
  await page.evaluate(() => { (window as any).openAccessControlModal(); (window as any).switchACTab('activity'); });

  await page.getByRole('tab', { name: 'All assessments' }).click();
  await expect(page.getByRole('tab', { name: 'All assessments' })).toHaveAttribute('aria-selected', 'true');
  const rows = page.locator('#assessmentList tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText('Acme Bank');
  await expect(rows.first()).toContainText('FinOps IQ');
  await expect(rows.first()).toContainText('Cost allocation (60%)');
  await expect(rows.first()).toContainText('In progress');
  // Client names are text, never markup.
  await expect(rows.nth(2)).toContainText('Globex <b>Ltd</b>');
  await expect(rows.nth(3)).toContainText('not recorded');
  await expect(rows.nth(3)).toContainText('account removed');
  await expect(page.locator('#assessmentSummary')).toHaveText('4 assessments: 2 not finished, 1 completed, 1 archived · 2 client(s), 3 person(s).');
  expect(world.calls).toContain('GET /api/activity/assessments auth=bearer');

  await page.fill('#assessmentSearch', 'acme');
  await expect(rows).toHaveCount(2);
  await page.selectOption('#assessmentState', 'open');
  await expect(rows).toHaveCount(1);
  await page.fill('#assessmentSearch', '');
  await page.selectOption('#assessmentState', '');
  await page.selectOption('#assessmentTool', { label: 'Cloud IQ' });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('sam@ltm.com');

  const { violations } = await new AxeBuilder({ page }).include('#acViewActivity').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations.map(v => v.id)).toEqual([]);

  // Back to People.
  await page.getByRole('tab', { name: 'People' }).click();
  await expect(page.locator('#activityAllView')).toBeHidden();
  await expect(page.locator('#activityPeopleView')).toBeVisible();
});
