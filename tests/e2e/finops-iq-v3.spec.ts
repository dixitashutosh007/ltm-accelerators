/**
 * FinOps IQ, merged page (execution phase M3 gate):
 *   - every question in both modes renders and can be answered;
 *   - sign-in → answer → save → resume → report journey, with the result computed on the server;
 *   - client mode: no consultant-only field in the DOM, and the server is asked for the client view;
 *   - no console errors or CSP violations; usable at 360px without horizontal scroll; every control labelled.
 * The fake API runs the real Lambda handlers (scoring and save/resume) with an in-memory store.
 */
import { test, expect, makeIdToken, signedIn } from './fixtures';
import type { Page } from '@playwright/test';
import { handler as evaluateHandler } from '../../amplify/functions/evaluate-finops-iq/handler';
import { createHandler } from '../../amplify/functions/manage-finops-assessment/handler';
import { memoryStore } from '../../amplify/functions/manage-finops-assessment/store';
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

test.beforeEach(async ({ context, world }) => {
  evaluated = [];
  const persistence = createHandler(memoryStore());
  world.on('POST', '/api/evaluate/finops-iq/v3', async req => {
    const out = await lambda(evaluateHandler, req);
    evaluated.push({ query: req.query, data: out.body.data });
    return out;
  });
  world.on('GET', '/api/finops-iq/assessment', req => lambda(persistence, req));
  world.on('POST', '/api/finops-iq/assessment', req => lambda(persistence, req));
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
  await expect(page.getByText(/Completed/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue in workshop mode' })).toBeVisible();

  // Resume from the server in a fresh load: the stored result is shown and the inputs are read-only.
  const id = new URL(page.url()).searchParams.get('assessment')!;
  await page.goto('/finops-iq-v3?assessment=' + encodeURIComponent(id));
  await expect(page.getByRole('heading', { name: 'Capability profile' })).toBeVisible();
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
