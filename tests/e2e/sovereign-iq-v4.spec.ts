/**
 * Sovereign IQ, merged page (PLAN S5 gate):
 *   - every question in both modes renders and can be answered; follow-up questions appear when an answer calls for them;
 *   - sign-in → answer → save → resume → complete → dashboard, with the result computed on the server;
 *   - client mode shows no internals (no notes, rule IDs, numeric states or the list of regimes that do not apply);
 *   - a Posture IQ permission opens the merged page; no console errors; WCAG 2.2 AA; usable at 360px.
 * The fake API runs the real Lambda handlers (scoring and save/resume) with an in-memory store.
 */
import { test, expect, makeIdToken, signedIn } from './fixtures';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { handler as scoreHandler } from '../../amplify/functions/evaluate-sovereign-iq/handler';
import { createHandler } from '../../amplify/functions/manage-sovereign-assessment/handler';
import { memoryStore } from '../../amplify/functions/manage-sovereign-assessment/store';
import { createHandler as createReportHandler } from '../../amplify/functions/sovereign-iq-report/handler';
import { readFileSync } from 'node:fs';
import { setPermissionSource } from '../../amplify/functions/_shared/access';
import { QUESTIONS, ENGINE_VERSION } from '../../packages/engine-core/src/accelerators/sovereign-iq/v4';

const EMAIL = 'consultant@ltm.com';

async function lambda(fn: (e: any) => Promise<any>, req: { method: string; path: string; body: any; query: Record<string, string>; claims: Record<string, any> }) {
  const out = await fn({
    rawPath: req.path, headers: {}, queryStringParameters: Object.keys(req.query).length ? req.query : undefined,
    requestContext: { requestId: 'e2e', http: { method: req.method }, authorizer: { jwt: { claims: req.claims } } },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body), isBase64Encoded: false
  });
  return { status: out.statusCode, body: JSON.parse(out.body || '{}') };
}

let scored: Array<{ query: Record<string, string>; data: any }>;

test.beforeEach(async ({ context, world }) => {
  setPermissionSource(async () => ({ take: ['sovereign-iq'] }));
  scored = [];
  const store = memoryStore();
  const persistence = createHandler(store);
  const report = createReportHandler(store);
  world.on('POST', '/api/evaluate/sovereign-iq/v4', async req => { const out = await lambda(scoreHandler, req); scored.push({ query: req.query, data: out.body.data }); return out; });
  world.on('GET', '/api/sovereign-iq/assessment', req => lambda(persistence, req));
  world.on('POST', '/api/sovereign-iq/assessment', req => lambda(persistence, req));
  world.on('GET', '/api/sovereign-iq/report', async req => {
    const out: any = await report({ headers: {}, queryStringParameters: req.query, requestContext: { requestId: 'e2e', http: { method: 'GET' }, authorizer: { jwt: { claims: req.claims } } } } as any);
    if (out.statusCode !== 200) return { status: out.statusCode, body: JSON.parse(out.body) };
    const { 'Content-Type': type, 'Content-Disposition': disposition } = out.headers;
    return { body: null, raw: { body: out.isBase64Encoded ? Buffer.from(out.body, 'base64') : out.body, headers: { 'content-type': type, 'content-disposition': disposition } } };
  });
  await signedIn(context, { email: EMAIL, token: makeIdToken(EMAIL), role: 'super_admin', permissions: {} });
});

const settled = (page: Page) => expect.poll(() => page.evaluate(() => (window as any).SOVEREIGN_IQ.busy()), { timeout: 10_000 }).toBe(false);

async function start(page: Page, mode: 'executive' | 'workshop', client = 'Example Bank') {
  await page.goto('/sovereign-iq-v4');
  await page.getByLabel('Client organisation').fill(client);
  await page.getByRole('radio', { name: new RegExp(mode === 'executive' ? '^Executive' : '^Workshop') }).check();
  await page.getByRole('button', { name: 'Start assessment' }).click();
  await expect(page.getByRole('heading', { level: 1, name: client })).toBeVisible();
  await settled(page);
}

async function stepLabels(page: Page) {
  return page.locator('nav.steps button').evaluateAll(els => els.map(e => (e.querySelector('.step-label') as HTMLElement).textContent!));
}

/**
 * Answers every question on the current step: an EU bank with personal and financial data in the EEA on Azure, with
 * standard contractual clauses and internal AI tools, so the transfer-assessment (T2) and AI data-location (I1)
 * questions are asked. Other questions take their
 * first option.
 */
async function answerStep(page: Page) {
  const ids = await page.locator('fieldset.question').evaluateAll(els => els.map(e => e.id.slice(2)));
  for (const id of ids) {
    const q = page.locator(`#q-${id}`);
    if (id === 'A1') await q.getByRole('radio', { name: 'EU or EEA' }).check();
    else if (id === 'A2') { await q.getByLabel('Entity or office in EU or EEA').check(); await q.getByLabel('Personal data of people in EU or EEA').check(); }
    else if (id === 'A3') await q.getByRole('radio', { name: 'Banking (credit institutions)' }).check();
    else if (id === 'B1') await q.getByRole('checkbox', { name: 'EU bank or credit institution' }).check();
    else if (id === 'B4') await q.getByRole('checkbox', { name: 'We use AI tools or third-party models for internal work' }).check();
    else if (id === 'D1') { await q.getByRole('checkbox', { name: /^Personal data about/ }).check(); await settled(page); }
    else if (id === 'D3') {
      for (const col of ['primary', 'backup']) await q.locator(`[id^="a-D3-personal-${col}-"]`).first().check();
    }
    else if (id === 'P1') await q.getByRole('checkbox', { name: 'Microsoft Azure (standard regions)' }).check();
    else if (id === 'T1') await q.getByRole('checkbox', { name: 'EU Standard Contractual Clauses' }).check();
    else if (id === 'L2') await q.locator('select').first().selectOption('L2');
    else if (await q.locator('input[type=radio]').count()) {
      // Compound questions have one radio group per field; answer each.
      const names = await q.locator('input[type=radio]').evaluateAll(els => [...new Set(els.map(e => (e as HTMLInputElement).name))]);
      for (const n of names) await q.locator(`input[type=radio][name="${n}"]`).first().check();
    }
    else if (await q.locator('input[type=checkbox]').count()) await q.locator('input[type=checkbox]').first().check();
    await settled(page);
  }
  return ids;
}

async function answerAll(page: Page) {
  const seen = new Set<string>();
  for (let pass = 0; pass < 4; pass++) {
    const before = seen.size;
    for (const label of (await stepLabels(page)).filter(l => !['Review & complete', 'Results'].includes(l))) {
      await page.locator('nav.steps button', { hasText: label }).first().click();
      for (const id of await answerStep(page)) seen.add(id);
    }
    if (pass > 0 && seen.size === before) break;
  }
  return seen;
}

async function complete(page: Page) {
  await page.locator('nav.steps button', { hasText: 'Review & complete' }).click();
  await expect(page.getByRole('heading', { name: 'Review and complete' })).toBeVisible();
  await page.getByRole('button', { name: /^Complete (assessment|anyway)$/ }).click();
  await expect(page.locator('.working')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('#hero-h')).toBeFocused();
}

async function axe(page: Page, where: string) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 4).map(n => n.html.slice(0, 120)).join(' | ')}`), where).toEqual([]);
}

test('executive: every question asked renders and can be answered; complete; both headlines; resume the stored result', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, 'executive');
  const seen = await answerAll(page);
  const executive = QUESTIONS.filter(q => q.mode === 'executive').map(q => q.id);
  expect(executive.filter(id => !seen.has(id))).toEqual([]);
  await complete(page);
  // The dashboard: maturity (or why there is no number), regulations, exposure, largest cap, findings.
  for (const label of ['Sovereignty control maturity', 'Regulations in scope', 'Compliance exposure', 'Largest single statutory cap', 'Findings']) await expect(page.locator('.kpi-label', { hasText: label })).toBeVisible();
  await page.getByRole('tab', { name: 'Regulations' }).click();
  await expect(page.locator('.regime h3', { hasText: 'General Data Protection Regulation' })).toBeVisible();
  await expect(page.locator('.regime h3', { hasText: /DORA|Digital Operational Resilience/ })).toBeVisible();
  // Claim IDs belong to the register, not the reader.
  await expect(page.locator('main')).not.toContainText('[CLM-');
  // Resume: the stored result, not a new score.
  const url = page.url();
  await page.goto(url);
  await expect(page.locator('#hero-h')).toHaveText('Example Bank');
  expect(scored.every(s => s.data?.versions?.engine === ENGINE_VERSION)).toBe(true);
});

test('workshop: the per-class requirement rows follow the data chosen, and the follow-ups appear', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, 'workshop');
  const seen = await answerAll(page);
  for (const id of QUESTIONS.filter(q => q.mode !== 'follow_up').map(q => q.id)) expect(seen.has(id), id).toBe(true);
  await page.locator('nav.steps button', { hasText: 'Sovereignty requirement' }).click();
  await expect(page.locator('#q-L2 .class-row h4')).toHaveText(['Personal']);
  expect(seen.has('B5'), 'an EU bank is asked about its ICT register').toBe(true);
  await complete(page);
  await page.getByRole('tab', { name: 'Controls' }).click();
  await expect(page.getByRole('heading', { name: /Required controls \(\d+\)/ })).toBeVisible();
  await page.getByRole('tab', { name: 'SEAL view' }).click();
  await expect(page.getByRole('heading', { name: 'Your controls by sovereignty objective' })).toBeVisible();
  await page.getByRole('tab', { name: 'Cloud advisory' }).click();
  await expect(page.getByRole('heading', { name: 'Placement matrix' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actions by platform' })).toBeVisible();
  await page.getByRole('tab', { name: 'Roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
});

test('client view: no notes, rule IDs, numeric states or list of regimes that do not apply; the server sends the client result', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, 'executive', 'Client View Bank');
  await answerAll(page);
  await complete(page);
  await page.getByRole('button', { name: 'Client view: off' }).click();
  await expect(page.getByRole('button', { name: 'Client view: on' })).toBeVisible();
  await expect(page.locator('.hero-meta')).toContainText('Client edition');
  await page.getByRole('tab', { name: 'Regulations' }).click();
  await expect(page.getByText(/Not applicable \(\d+\), consultant only/)).toHaveCount(0);
  await expect(page.getByText(/other regulations were checked and do not apply/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/rule [A-Z]{2}_[A-Z0-9_]+\.\d/);
  const data = await page.evaluate(() => (window as any).SOVEREIGN_IQ.state().result);
  expect(data.view).toBe('client');
  expect(JSON.stringify(data)).not.toMatch(/"rule":|"weight":|"consultantNotes"/);
});

test('a Posture IQ permission opens the merged page; a user without either is sent back', async ({ page, context }) => {
  await signedIn(context, { email: 'posture@ltm.com', token: makeIdToken('posture@ltm.com'), role: 'custom', permissions: { take: ['posture-iq'] } });
  await page.goto('/sovereign-iq-v4');
  await expect(page.getByRole('heading', { level: 1, name: 'Sovereign IQ' })).toBeVisible();
  await signedIn(context, { email: 'cloud@ltm.com', token: makeIdToken('cloud@ltm.com'), role: 'custom', permissions: { take: ['cloud-iq'] } });
  await page.goto('/sovereign-iq-v4');
  await expect(page).not.toHaveURL(/sovereign-iq-v4/);
});

test('accessibility: no WCAG 2.2 AA violations on the start screen, a question step, review and every result tab', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/sovereign-iq-v4');
  await expect(page.getByRole('heading', { level: 1, name: 'Sovereign IQ' })).toBeVisible();
  await axe(page, 'start');
  await start(page, 'workshop', 'Axe Bank');
  await axe(page, 'footprint step');
  await answerAll(page);
  await page.locator('nav.steps button', { hasText: 'Data and platforms' }).click();
  await axe(page, 'data step with matrices');
  await page.locator('nav.steps button', { hasText: 'Review & complete' }).click();
  await axe(page, 'review');
  await complete(page);
  for (const t of ['Overview', 'Regulations', 'Controls', 'Findings', 'SEAL view', 'Cloud advisory', 'Roadmap', 'Method']) {
    await page.getByRole('tab', { name: t }).click();
    await axe(page, `results: ${t}`);
  }
});

test('usable at 360px: no horizontal scroll on the start screen, the data step or the results', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  const noScroll = async (where: string) => {
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, where).toBeLessThanOrEqual(cw + 1);
  };
  await page.goto('/sovereign-iq-v4');
  await expect(page.getByRole('heading', { level: 1, name: 'Sovereign IQ' })).toBeVisible();
  await noScroll('start');
  await start(page, 'executive', 'Narrow Bank');
  await answerAll(page);
  await page.locator('nav.steps button', { hasText: 'Data and platforms' }).click();
  await noScroll('data step');
  await complete(page);
  await noScroll('results');
});

test('every form control has an accessible name', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page, 'workshop', 'Names Bank');
  await answerAll(page);
  for (const label of (await stepLabels(page)).filter(l => l !== 'Review & complete')) {
    await page.locator('nav.steps button', { hasText: label }).first().click();
    const unnamed = await page.locator('input, select, textarea, button').evaluateAll(els => els.filter(e => {
      const el = e as HTMLInputElement;
      if (el.type === 'hidden' || el.closest('[aria-hidden="true"]')) return false;
      const labelled = el.labels && el.labels.length > 0;
      return !(labelled || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.tagName === 'BUTTON' && el.textContent!.trim()));
    }).map(e => e.outerHTML.slice(0, 100)));
    expect(unnamed, label).toEqual([]);
  }
});

test('the completed assessment downloads its report PDF and backlog CSV; the overview shows the radar and the heatmaps', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, 'workshop', 'Report Bank');
  await answerAll(page);
  await complete(page);
  for (const title of ['Maturity by area', 'Findings by severity', 'Regulation heatmap', 'Control heatmap']) await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download report (PDF)' }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^sovereign-iq-report-bank-\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(readFileSync((await pdf.path())!).subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.locator('#report-status')).toHaveText('Downloaded.');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backlog (CSV)' }).click()]);
  expect(readFileSync((await csv.path())!, 'utf8')).toMatch(/ID,Wave,Severity/);
});
