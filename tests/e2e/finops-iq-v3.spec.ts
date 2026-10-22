/**
 * FinOps IQ, merged page (execution phase M3 gate):
 *   - every question in both modes renders and can be answered;
 *   - sign-in → answer → save → resume → report journey, with the result computed on the server;
 *   - M4: the report PDF and backlog CSV of the completed assessment download from the server;
 *   - client mode: no consultant-only field in the DOM, and the server is asked for the client view;
 *   - no console errors or CSP violations; usable at 360px without horizontal scroll; every control labelled.
 * The fake API runs the real Lambda handlers (scoring and save/resume) with an in-memory store.
 */
import { test, expect, makeIdToken, signedIn } from './fixtures';
import type { Page } from '@playwright/test';
import { handler as evaluateHandler } from '../../amplify/functions/evaluate-finops-iq/handler';
import { createHandler } from '../../amplify/functions/manage-finops-assessment/handler';
import { memoryStore } from '../../amplify/functions/manage-finops-assessment/store';
import { createHandler as createReportHandler } from '../../amplify/functions/finops-iq-report/handler';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { QUESTIONS } from '../../packages/engine-core/src/accelerators/finops-iq/v3';

const EMAIL = 'consultant@ltm.com';
const MATURITY = QUESTIONS.filter(q => q.kind === 'maturity' || q.kind === 'hypothesis');

async function lambda(fn: (e: any) => Promise<any>, req: { method: string; path: string; body: any; query: Record<string, string>; claims: Record<string, any> }) {
  const out = await fn({
    rawPath: req.path, headers: {}, queryStringParameters: Object.keys(req.query).length ? req.query : undefined,
    requestContext: { requestId: 'e2e', http: { method: req.method }, authorizer: { jwt: { claims: req.claims } } },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body), isBase64Encoded: false
  });
  return { status: out.statusCode, body: JSON.parse(out.body || '{}') };
}

let evaluated: Array<{ query: Record<string, string>; data: any }>;
let archived: any[];

test.beforeEach(async ({ context, world }) => {
  evaluated = [];
  archived = [];
  const store = memoryStore();
  const persistence = createHandler(store);
  const report = createReportHandler(store);
  world.on('POST', '/api/evaluate/finops-iq/v3', async req => {
    const out = await lambda(evaluateHandler, req);
    evaluated.push({ query: req.query, data: out.body.data });
    return out;
  });
  world.on('GET', '/api/finops-iq/assessment', req => lambda(persistence, req));
  world.on('POST', '/api/finops-iq/assessment', req => lambda(persistence, req));
  // The portal's reports service (Archive to Reports): records what the page sends.
  world.on('POST', '/api/reports/save', req => { archived.push(req.body); return { body: { ok: true, pdfKey: 'reports/finops-iq/x.pdf' } }; });
  world.on('GET', '/api/finops-iq/report', async req => {
    const out: any = await report({ headers: {}, queryStringParameters: req.query, requestContext: { requestId: 'e2e', http: { method: 'GET' }, authorizer: { jwt: { claims: req.claims } } } } as any);
    if (out.statusCode !== 200) return { status: out.statusCode, body: JSON.parse(out.body) };
    const { 'Content-Type': type, 'Content-Disposition': disposition } = out.headers;
    return { body: null, raw: { body: out.isBase64Encoded ? Buffer.from(out.body, 'base64') : out.body, headers: { 'content-type': type, 'content-disposition': disposition } } };
  });
  await signedIn(context, { email: EMAIL, token: makeIdToken(EMAIL), role: 'super_admin', permissions: {} });
});

async function start(page: Page, mode: 'executive' | 'workshop', client = 'Example Bank') {
  await page.goto('/finops-iq-v3');
  await page.getByLabel('Client organisation').fill(client);
  await page.getByRole('radio', { name: new RegExp(mode === 'executive' ? '^Executive' : '^Workshop') }).check();
  await page.getByRole('button', { name: 'Start assessment' }).click();
  await expect(page.getByRole('heading', { level: 1, name: client })).toBeVisible();
}

/** Enough estate facts for the server to score: AWS and Azure, spend, Kubernetes, AI and SaaS in scope. */
async function fillEstate(page: Page, mode: 'executive' | 'workshop') {
  await page.getByLabel('AWS', { exact: true }).check();
  await page.getByLabel('Azure', { exact: true }).check();
  for (const s of ['Kubernetes / containers', 'AI APIs (tokens)', 'SaaS']) await page.getByLabel(s, { exact: true }).check();
  for (const [row, amount] of [['AWS', '40000000'], ['Azure', '20000000']]) {
    await page.getByLabel(`Annual spend: ${row}: how to answer`).selectOption('exact');
    await page.getByLabel(`Annual spend: ${row}`, { exact: true }).fill(amount);
  }
  await page.getByLabel('Percent change, -25 to +200').fill('15');
  await page.getByLabel('Business units or products that consume cloud').selectOption('u20_plus');
  if (mode === 'workshop') await page.getByRole('radio', { name: 'Mostly cloud' }).check();
  else {
    await page.getByLabel('Loaded internal cost per FTE-month: how to answer').selectOption('exact');
    await page.getByLabel('Loaded internal cost per FTE-month', { exact: true }).fill('12000');
  }
  await expect(page.getByRole('button', { name: /Understand Usage & Cost/ }).first()).toBeEnabled({ timeout: 10_000 });
}

/** Answers every question shown on the current step: the second option of each choice, or a valid value. */
async function answerStep(page: Page) {
  const ids = await page.locator('fieldset.question').evaluateAll(els => els.map(e => e.id.slice(2)));
  for (const id of ids) {
    const q = page.locator(`#q-${id}`);
    const radios = q.locator('input[type=radio]');
    const shares = q.locator('select');
    if (id === 'HY-02') { const use = q.getByRole('button', { name: 'Use this order' }); if (await use.count()) await use.click(); }
    else if (id === 'HY-04') { for (const [i, v] of ['40', '30', '20', '10'].entries()) await q.locator('input[type=number]').nth(i).fill(v); }
    else if (id === 'HY-06') await q.locator('input[type=checkbox]').first().check();
    else if (id === 'HY-07') await q.locator('textarea').fill('Board review next quarter');
    else if (id === 'UN-08') await q.locator('input[type=checkbox]').first().check();
    else if (await radios.count()) await radios.nth(Math.min(1, (await radios.count()) - 1)).check();
    else if (await shares.count()) {
      for (let i = 0; i < await shares.count(); i++) {
        const sel = shares.nth(i);
        const values = await sel.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
        const pick = values.find(v => v.startsWith('band:')) ?? values.find(v => v === 'unknown');
        if (pick) await sel.selectOption(pick);
      }
    }
  }
  return ids;
}

async function stepButtons(page: Page) {
  return page.locator('nav.steps button').evaluateAll(els => els.map(e => (e.querySelector('span') as HTMLElement).textContent!));
}

const settled = (page: Page) => expect.poll(() => page.evaluate(() => (window as any).FINOPS_IQ.busy()), { timeout: 10_000 }).toBe(false);

async function answerAll(page: Page) {
  const seen = new Set<string>();
  // Answers trigger follow-up questions, so walk the steps again until a pass shows nothing new.
  for (let pass = 0; pass < 5; pass++) {
    const before = seen.size;
    for (const label of (await stepButtons(page)).filter(l => l !== 'Results' && l !== 'Your estate')) {
      await page.locator('nav.steps button', { hasText: label }).first().click();
      for (const id of await answerStep(page)) seen.add(id);
      await settled(page);
    }
    if (pass > 0 && seen.size === before) break;
  }
  return seen;
}

test('executive: every question renders and can be answered; complete, then resume the stored result', async ({ page, world }) => {
  await start(page, 'executive');
  await fillEstate(page, 'executive');
  const seen = await answerAll(page);
  const executive = MATURITY.filter(q => q.modes.includes('executive')).map(q => q.id);
  expect(executive.filter(id => !seen.has(id))).toEqual([]);

  await page.locator('nav.steps button', { hasText: 'Results' }).click();
  await expect(page.getByRole('heading', { name: 'Do you need to act now?' })).toBeVisible();
  await expect(page.getByText('Preview. The result is recorded')).toBeVisible();
  // The consultant set the internal rate at setup, so executive mode shows the value range (DESIGN.md Q4).
  await expect(page.getByText(/Expected \(net, per year at full run-rate\)/i)).toBeVisible();
  await page.getByRole('button', { name: 'Complete assessment' }).click();
  // The LTM working screen shows the server's steps while it scores, then gives way to the result.
  const screen = page.locator('.working');
  await expect(screen).toHaveAttribute('role', 'status');
  await expect(screen).toContainText(/Scoring your answers on the server|Rating each capability|Sizing the indicative value range|Building the roadmap/);
  await expect(screen).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/Completed/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue in workshop mode' })).toBeVisible();

  // M4: the report and the backlog of the completed assessment, built on the server from the stored result.
  for (const [label, ext, magic] of [['Download report (PDF)', 'pdf', '%PDF-'], ['Download backlog (CSV)', 'csv', '\uFEFFFinding ID']] as const) {
    const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label }).click()]);
    expect(file.suggestedFilename()).toMatch(new RegExp(`^finops-iq-example-bank-\\d{4}-\\d{2}-\\d{2}\\.${ext}$`));
    expect(readFileSync((await file.path())!, 'utf8').startsWith(magic)).toBe(true);
  }
  await expect(page.getByRole('status').filter({ hasText: 'Downloaded.' })).toBeVisible();

  // Resume from the server in a fresh load: the stored result is shown and the inputs are read-only.
  const id = new URL(page.url()).searchParams.get('assessment')!;
  await page.goto('/finops-iq-v3?assessment=' + encodeURIComponent(id));
  await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
  // M5: offerings and the technical execution section come from the stored result; no scope ranges on the page.
  await expect(page.getByRole('heading', { name: 'How LTM can help' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Technical execution' })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/\d+\s*(?:–|-)\s*\d+ weeks|12 months or more/);
  await page.locator('nav.steps button', { hasText: 'Your estate' }).click();
  await expect(page.locator('fieldset.question input').first()).toBeDisabled();

  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
  expect(world.pageErrors).toEqual([]);
  expect(world.cspViolations).toEqual([]);
  expect(world.calls.filter(c => c.startsWith('BLOCKED-AI'))).toEqual([]);
});

test('workshop: every question asked for the estate renders and can be answered', async ({ page, world }) => {
  await start(page, 'workshop', 'Example Retail');
  await fillEstate(page, 'workshop');
  const seen = await answerAll(page);
  // Every answer reaches the server: once scoring settles, nothing asked is left blank.
  await expect.poll(() => evaluated[evaluated.length - 1].data.coverage.blankQuestions, { timeout: 10_000 }).toEqual([]);
  const last = evaluated[evaluated.length - 1].data;
  const asked = last.questions.asked.filter((id: string) => MATURITY.some(q => q.id === id));
  expect(asked.length).toBeGreaterThan(35);
  expect(asked.filter((id: string) => !seen.has(id))).toEqual([]);
  expect(world.pageErrors).toEqual([]);
});

test('client view: the server is asked for the client view and no consultant-only content reaches the page', async ({ page }) => {
  await start(page, 'executive', 'Client View Ltd');
  await fillEstate(page, 'executive');
  await page.locator('nav.steps button', { hasText: 'Your view' }).click();
  await page.getByLabel(/Saved with the assessment/).fill('Consultant-only note: CFO sceptical');
  await page.locator('nav.steps button', { hasText: 'Results' }).click();
  await expect(page.getByRole('heading', { name: 'Checks before issuing' })).toBeVisible();

  await page.getByRole('button', { name: 'Client view: off' }).click();
  await expect(page.getByRole('button', { name: 'Client view: on' })).toBeVisible();
  await expect.poll(() => evaluated.some(e => e.query.view === 'client')).toBe(true);
  const clientResult = evaluated.filter(e => e.query.view === 'client').pop()!.data;
  expect(clientResult.view).toBe('client');
  expect(clientResult.tier.trace).toBeUndefined();

  await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
  const html = await page.content();
  expect(html).not.toMatch(/data-consultant-only|Checks before issuing|CFO sceptical|Complete assessment/);
  await page.locator('nav.steps button', { hasText: 'Your view' }).click();
  await expect(page.getByLabel(/Saved with the assessment/)).toHaveCount(0);
  await page.locator('nav.steps button', { hasText: 'Your estate' }).click();
  await expect(page.getByText('Engagement setup')).toHaveCount(0);
});

test('usable at 360px: no horizontal scroll on the start screen, a question step or the results', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const noScroll = async (where: string) => {
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, where).toBeLessThanOrEqual(cw);
  };
  await page.goto('/finops-iq-v3');
  await expect(page.getByRole('button', { name: 'Start assessment' })).toBeVisible();
  await noScroll('start');
  await start(page, 'workshop', 'Narrow Screen plc');
  await noScroll('estate');
  await fillEstate(page, 'workshop');
  await page.locator('nav.steps button', { hasText: 'Optimize Usage & Cost' }).click();
  await noScroll('question step');
  await page.locator('nav.steps button', { hasText: 'Results' }).click();
  await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
  await noScroll('results');
});

test('portal tiles (M8 preview): ?mode=executive or ?mode=workshop preselects the mode on the start screen', async ({ page }) => {
  for (const mode of ['executive', 'workshop']) {
    await page.goto('/finops-iq-v3?mode=' + mode);
    await expect(page.getByRole('radio', { name: new RegExp(mode === 'executive' ? '^Executive' : '^Workshop') })).toBeChecked();
  }
});

test('methodology (M6): the framework attribution links the framework, the FinOps Foundation and the CC BY licence', async ({ page }) => {
  await start(page, 'executive', 'Attribution Ltd');
  await fillEstate(page, 'executive');
  await page.locator('nav.steps button', { hasText: 'Results' }).click();
  const m = page.locator('section.methodology');
  await expect(m.getByRole('link', { name: 'FinOps Framework' })).toHaveAttribute('href', 'https://www.finops.org/framework/');
  await expect(m.getByRole('link', { name: 'FinOps Foundation' })).toHaveAttribute('href', 'https://www.finops.org/');
  await expect(m.getByRole('link', { name: 'Creative Commons Attribution licence' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  await expect(m).toContainText('LTM has not audited or verified');
});

test('every form control has an accessible name', async ({ page }) => {
  await start(page, 'workshop', 'Labels Inc');
  await fillEstate(page, 'workshop');
  for (const label of (await stepButtons(page)).filter(l => l !== 'Results')) {
    await page.locator('nav.steps button', { hasText: label }).first().click();
    const unnamed = await page.locator('main input, main select, main textarea').evaluateAll(els => els.filter(el => {
      const e = el as HTMLInputElement;
      return !e.getAttribute('aria-label') && !(e.labels && e.labels.length) && !e.closest('label');
    }).map(e => e.id || e.outerHTML.slice(0, 80)));
    expect(unnamed, label).toEqual([]);
  }
});

test('workshop: OP-06 suggests the scheduled share, set only when the consultant confirms it (F5 D-C)', async ({ page }) => {
  await start(page, 'workshop', 'Prefill Co');
  await fillEstate(page, 'workshop');
  await page.locator('nav.steps button', { hasText: 'Optimize Usage & Cost' }).click();
  await page.locator('#q-OP-06 input[value=walk]').check();
  await settled(page);
  await page.locator('nav.steps button', { hasText: 'Value inputs' }).click();
  const q = page.locator('#q-VB-03');
  await expect(q.getByText(/Suggested from OP-06/)).toContainText('about 50%');
  // Nothing is set until confirmed: an unconfirmed pre-fill counts as blank.
  expect(await page.evaluate(() => (window as any).FINOPS_IQ.state().facts.base?.nonProdScheduledShare)).toBeUndefined();
  await q.getByRole('button', { name: /Use this/ }).click();
  await settled(page);
  expect(await page.evaluate(() => (window as any).FINOPS_IQ.state().facts.base)).toMatchObject({ nonProdScheduledShare: { exact: 0.5 }, nonProdScheduledShareSource: 'derived_from_OP-06' });
  await expect(q.getByText(/Derived from OP-06/)).toBeVisible();
});

test('retention (M6): the data notice states the retention period, and an assessment can be deleted after a second click', async ({ page }) => {
  await start(page, 'executive', 'Delete Me Ltd');
  await fillEstate(page, 'executive');
  await expect(page.locator('#save-status')).toHaveText(/^Saved/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'All assessments' }).click();
  await expect(page.getByRole('note').filter({ hasText: 'How your data is handled' })).toContainText('We keep each assessment for two years after its last change and then delete it automatically');
  await expect(page.getByRole('note').filter({ hasText: 'How your data is handled' })).toContainText('LTM is responsible for the information held in this assessment');
  const row = page.getByRole('row', { name: /Delete Me Ltd/ });
  await row.getByRole('button', { name: 'Delete Delete Me Ltd' }).click();
  await row.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByRole('button', { name: 'Delete Delete Me Ltd' })).toBeFocused();
  await row.getByRole('button', { name: 'Delete Delete Me Ltd' }).click();
  await row.getByRole('button', { name: 'Confirm delete Delete Me Ltd' }).click();
  await expect(page.getByText('No saved assessments yet.')).toBeVisible();
});

/** WCAG 2.2 AA scan (execution phase M7): every screen, consultant and client view, with no exceptions. */
async function axe(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 5).map(n => `${n.html.slice(0, 120)} [${(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 200)}]`).join(' | ')}`), where).toEqual([]);
}

test('accessibility (M7): no WCAG 2.2 AA violations on any screen, in consultant or client view', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/finops-iq-v3');
  await expect(page.getByRole('button', { name: 'Start assessment' })).toBeVisible();
  await axe(page, 'start');
  await start(page, 'workshop', 'Axe Ltd');
  await axe(page, 'estate (empty)');
  await fillEstate(page, 'workshop');
  await axe(page, 'estate (filled)');
  for (const label of await stepButtons(page)) {
    await page.locator('nav.steps button', { hasText: label }).first().click();
    if (label === 'Results') {
      await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
      expect(await page.locator('main').innerText(), 'platforms by name (M7 D6)').not.toMatch(/\b(aws|azure|on_prem|data_platform|kubernetes|saas)\b/);
    }
    await axe(page, label);
  }
  await page.getByRole('button', { name: 'Client view: off' }).click();
  await expect(page.getByRole('button', { name: 'Client view: on' })).toBeVisible();
  await axe(page, 'results, client view');
  await page.getByRole('button', { name: 'Client view: on' }).click();
  await page.getByRole('button', { name: 'All assessments' }).click();
  await axe(page, 'assessment list');
  await page.getByRole('row', { name: /Axe Ltd/ }).getByRole('button', { name: 'Delete Axe Ltd' }).click();
  await axe(page, 'delete confirmation');
});

/** Tab forward until the focused element is the one wanted; fails if it is not reached, so tab order is tested too. */
async function tabTo(page: Page, target: ReturnType<Page['locator']>, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(el => el === document.activeElement)) {
      expect(await target.evaluate(el => getComputedStyle(el).outlineStyle), 'visible focus').toBe('solid');
      return;
    }
  }
  throw new Error(`not reached by Tab: ${target}`);
}

test('keyboard (M7): start, answer, complete and delete an assessment with the keyboard alone, with focus always visible', async ({ page }) => {
  await page.goto('/finops-iq-v3');
  await tabTo(page, page.getByLabel('Client organisation'));
  await page.keyboard.type('Keys Ltd');
  await tabTo(page, page.getByRole('radio', { name: /^Executive/ }));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('button', { name: 'Start assessment' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Keys Ltd' })).toBeVisible();
  await tabTo(page, page.getByLabel('AWS', { exact: true }));
  await page.keyboard.press('Space');
  await expect(page.getByLabel('AWS', { exact: true })).toBeChecked();
  // The rest of the estate by the usual helper; then a capability question by keyboard.
  await fillEstate(page, 'executive');
  const step = page.locator('nav.steps button', { hasText: 'Optimize Usage & Cost' }).first();
  await step.focus();
  await page.keyboard.press('Enter');
  const first = page.locator('fieldset.question:not(.consultant) input[type=radio]').first();
  await tabTo(page, first);
  await page.keyboard.press('Space');
  await expect(first).toBeChecked();
  await settled(page);
  await page.getByRole('button', { name: 'All assessments' }).focus();
  await page.keyboard.press('Enter');
  const row = page.getByRole('row', { name: /Keys Ltd/ });
  await tabTo(page, row.getByRole('button', { name: 'Delete Keys Ltd' }));
  await page.keyboard.press('Enter');
  await expect(row.getByRole('button', { name: 'Confirm delete Keys Ltd' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Keys Ltd deleted.' })).toBeFocused();
  await expect(page.getByText('No saved assessments yet.')).toBeVisible();
});

test('carried over from FinOps Value Case: client logo on the page and report, teaser mode, archive to Reports', async ({ page }) => {
  test.setTimeout(90_000);
  // A 2x2 red PNG.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8DwnwEJMOJiAABOZQX/x5MoMwAAAABJRU5ErkJggg==', 'base64');
  await start(page, 'executive', 'Logo Bank');
  await page.locator('#client-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Logo Bank logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove logo' })).toBeVisible();
  await fillEstate(page, 'executive');
  await page.locator('nav.steps button', { hasText: 'Results' }).click();
  await page.getByRole('button', { name: 'Complete assessment' }).click();
  await expect(page.locator('.working')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/Completed/).first()).toBeVisible();

  // The report cover carries the logo (an image object in the PDF).
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download report (PDF)' }).click()]);
  expect(readFileSync((await file.path())!).includes(Buffer.from('/Subtype /Image'))).toBe(true);

  // Archive to Reports: a second click confirms; the server-built PDF goes to the reports service as FinOps IQ.
  await page.getByRole('button', { name: 'Archive to Reports' }).click();
  await page.getByRole('button', { name: 'Save to Reports' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Archived to Reports.' })).toBeVisible({ timeout: 10_000 });
  expect(archived).toHaveLength(1);
  expect(archived[0]).toMatchObject({ acceleratorId: 'finops-iq', clientName: 'Logo Bank', metadata: { mode: 'executive', edition: 'consultant' } });
  expect(Buffer.from(archived[0].pdfBase64, 'base64').subarray(0, 5).toString()).toBe('%PDF-');

  // Teaser mode in client view: the profile stays, the value, findings, roadmap and platform actions are not in the page.
  await page.getByRole('button', { name: 'Client view: off' }).click();
  await page.getByRole('button', { name: 'Teaser: off' }).click();
  await expect(page.getByRole('button', { name: 'Teaser: on' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
  await expect(page.getByText('presented in your LTM readout')).toBeVisible();
  for (const name of ['Top findings', 'Technical execution', 'How LTM can help']) await expect(page.getByRole('heading', { name })).toHaveCount(0);
  await expect(page.getByText(/Expected \(net, per year at full run-rate\)/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Teaser: on' }).click();
  await expect(page.getByRole('heading', { name: 'Top findings' })).toBeVisible();
});
