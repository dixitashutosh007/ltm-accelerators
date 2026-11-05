import AxeBuilder from '@axe-core/playwright';
import { test, expect, makeIdToken, signedIn, TEST_API } from './fixtures';
import { NOTICES } from '../../packages/engine-core/src/accelerators/cost-iq/notices';
import { createHandler as manageHandler } from '../../amplify/functions/manage-cost-assessment/handler';
import { createHandler as reportHandler } from '../../amplify/functions/cost-iq-report/handler';
import { memoryStore } from '../../amplify/functions/manage-cost-assessment/store';
import { memoryStore as finopsMemoryStore } from '../../amplify/functions/manage-finops-assessment/store';
import { setPermissionSource, setDomainStore } from '../../amplify/functions/_shared/access';
import { evaluateCostIq, metadata, questions } from '../../packages/engine-core/src/accelerators/cost-iq/evaluate.cjs';

// Cost IQ reads its API address from cost-iq-runtime-config.js, which the Amplify build generates; the tests serve it.
const QUESTIONS = '/api/evaluate/cost-iq/questions';
const METADATA = '/api/evaluate/cost-iq/metadata';
const ASSESSMENT = '/api/cost-iq/assessment';

const permitted = (token: string) => ({
  email: 'consultant@ltm.com', token, refreshToken: 'refresh', role: 'advisor_viewer',
  permissions: { take: ['cost-iq'], view: ['cost-iq'] }
});
const stored = {
  assessmentId: 'CIQ-stored-0001', acceleratorId: 'cost-iq', releaseId: 'COSTIQ-0.7.8', methodologyVersion: '6.6.0', status: 'in_progress',
  clientName: 'Acme Bank', respondentEmail: 'consultant@ltm.com', startedAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z'
};

test.describe('Cost IQ', () => {
  test.beforeEach(async ({ context, world }) => {
    await context.route(/\/cost-iq-runtime-config\.js$/, route => route.fulfill({
      contentType: 'application/javascript', body: `window.COST_IQ_API='${TEST_API}';window.COST_IQ_DATA_URL='';`
    }));
    world.on('GET', QUESTIONS, () => ({ body: questions() }));
    world.on('GET', METADATA, () => ({ body: { ...metadata(), notices: NOTICES } }));
  });

  test('sends the signed-in token with every call and lists the caller\'s saved assessments', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [stored] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByText('Acme Bank')).toBeVisible();
    const cost = world.calls.filter(c => c.includes('/api/') && c.includes('cost-iq'));
    expect(cost.length).toBeGreaterThanOrEqual(3);
    expect(cost.every(c => c.endsWith('auth=bearer')), cost.join('\n')).toBe(true);
    expect(world.pageErrors).toEqual([]);
  });

  test('the start page shows the disclaimer and the data notice before the assessment begins', async ({ page, context }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    await page.goto('/cost-iq-v10');
    const card = page.locator('#dataNotice');
    await expect(card).toContainText('not financial, accounting, tax, legal or regulatory advice');
    await expect(card).toContainText('Mumbai region');
    await expect(card).toContainText('two years after its last change');
    await expect(card).toContainText('ask your consultant to delete it sooner');
  });

  test('without a session it goes to sign-in and calls nothing', async ({ page, world }) => {
    await page.goto('/cost-iq-v10');
    await expect(page).toHaveURL(/require_login=1/);
    expect(world.calls.filter(c => c.includes('cost-iq'))).toEqual([]);
  });

  test('delete asks twice, then removes the assessment through the API and refreshes the list', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const sent: any[] = [];
    let items = [stored];
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: items } }));
    world.on('POST', ASSESSMENT, ({ body }) => { sent.push(body); items = []; return { body: { ok: true, data: { deleted: true } } }; });
    await page.goto('/cost-iq-v10');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Delete permanently?')).toBeVisible();
    expect(sent).toEqual([]);
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible();
    expect(sent).toEqual([{ action: 'delete', assessmentId: 'CIQ-stored-0001' }]);
    expect(world.pageErrors).toEqual([]);
  });

  test('a new assessment is created through the API with its stage and share answered', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const sent: any[] = [];
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', ASSESSMENT, ({ body }) => { sent.push(body); return { body: { ok: true, data: { ...body.snapshot, respondentEmail: 'consultant@ltm.com' } } }; });
    await page.goto('/cost-iq-v10');
    // The organisation name is asked for first: without it nothing is created.
    await page.getByRole('button', { name: /Start the assessment/ }).click();
    await expect(page.getByText('Enter the organisation name')).toBeVisible();
    await expect(page.getByLabel('Organisation this assessment is for')).toBeFocused();
    expect(sent).toEqual([]);
    await page.getByLabel('Organisation this assessment is for').fill('Example Bank plc');
    await page.getByRole('button', { name: /Start the assessment/ }).click();
    await expect.poll(() => sent.length, { message: world.calls.join('\n') }).toBeGreaterThan(0);
    expect(sent[0]).toMatchObject({ action: 'save', snapshot: { acceleratorId: 'cost-iq', status: 'draft', clientName: 'Example Bank plc' } });
    expect(sent[0].progress).toMatchObject({ percent: 0 });
    expect(typeof sent[0].progress.stage).toBe('string');
    expect(world.pageErrors).toEqual([]);
  });

  test('the production page offers no developer test data, and a question can be answered from the keyboard', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', ASSESSMENT, ({ body }) => ({ body: { ok: true, data: { ...body.snapshot, respondentEmail: 'consultant@ltm.com' } } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByText(/developer test data|regression scenarios/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Load Healthy' })).toHaveCount(0);
    await page.getByLabel('Organisation this assessment is for').fill('Example Bank plc');
    await page.getByRole('button', { name: /Start the assessment/ }).click();
    await expect(page.locator('.q-card').first()).toBeVisible();
    // No internal question ID is shown to the respondent.
    await expect(page.locator('.q-no').first()).toHaveText(/^QUESTION \d+ OF \d+$/);
    const first = page.locator('.q-card').first().locator('.option').first();
    await expect(first).toHaveAttribute('role', /radio|checkbox/);
    await first.focus();
    await page.keyboard.press('Enter');
    const again = page.locator('.q-card').first().locator('.option').first();
    await expect(again).toHaveAttribute('aria-checked', 'true');
    await expect(again).toBeFocused();
    expect(world.pageErrors).toEqual([]);
  });

  test('one even column and no sideways scroll at 360, 768, 1280 and 1920 px: start, question and result screens', async ({ page, context, world }) => {
    test.setTimeout(120_000);
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', ASSESSMENT, ({ body }) => ({ body: { ok: true, data: { ...body.snapshot, respondentEmail: 'consultant@ltm.com' } } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const column = () => page.evaluate(() => Math.round(document.querySelector('main.wrap')!.getBoundingClientRect().width));
    const columns: number[] = [];
    for (const width of [360, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/cost-iq-v10');
      await expect(page.getByRole('button', { name: /Start the assessment/ })).toBeVisible();
      expect(await overflow(), `start screen at ${width}`).toBeLessThanOrEqual(0);
      await page.getByLabel('Organisation this assessment is for').fill('Example Bank plc');
      await page.getByRole('button', { name: /Start the assessment/ }).click();
      await expect(page.locator('.q-card').first()).toBeVisible();
      expect(await overflow(), `question screen at ${width}`).toBeLessThanOrEqual(0);
      await page.goto('/cost-iq-v10?scenarios=1');
      await page.getByRole('button', { name: 'Load Healthy' }).click();
      await expect(page.getByText('Your technology cost & value snapshot')).toBeVisible({ timeout: 15000 });
      expect(await overflow(), `result screen at ${width}`).toBeLessThanOrEqual(0);
      columns.push(await column());
    }
    // The content column is capped: the same width on a 1280 and a 1920 px screen, and never wider than the screen.
    expect(columns[2]).toBe(columns[3]);
    expect(columns[0]).toBeLessThanOrEqual(360);
    expect(world.pageErrors).toEqual([]);
  });

  test('the saved-assessments list fits at four widths, and the start, question and result screens have no WCAG 2.2 AA violations', async ({ page, context, world }) => {
    test.setTimeout(120_000);
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const long = 'A very long organisation name that would push a row sideways if it were not allowed to wrap onto the next line Ltd';
    const rows = [
      { ...stored, assessmentId: 'CIQ-w-1', clientName: long, status: 'completed', updatedAt: '2026-11-04T10:00:00Z' },
      { ...stored, assessmentId: 'CIQ-w-2', clientName: 'Example Bank plc', status: 'draft', updatedAt: '2026-11-03T10:00:00Z' }
    ];
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: rows } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = async (where: string) => {
      await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
      const { violations } = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.slice(0, 4).map(n => `${n.html.slice(0, 100)} [${(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160)}]`).join(' | ')}`), where).toEqual([]);
    };
    for (const width of [360, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/cost-iq-v10');
      await expect(page.getByText('SAVED ASSESSMENTS')).toBeVisible();
      const button = page.getByRole('button', { name: 'View result' }).first();
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      expect(await overflow(), `saved list at ${width}`).toBeLessThanOrEqual(0);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/cost-iq-v10');
    await expect(page.getByText('SAVED ASSESSMENTS')).toBeVisible();
    await axe('start');
    await page.getByLabel('Organisation this assessment is for').fill('Example Bank plc');
    await page.getByRole('button', { name: /Start the assessment/ }).click();
    await expect(page.locator('.q-card').first()).toBeVisible();
    await axe('questions');
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    await expect(page.getByText('Your technology cost & value snapshot')).toBeVisible({ timeout: 15000 });
    await axe('result');
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity).length)).toBe(0);
    expect(world.pageErrors).toEqual([]);
  });

  test('the page holds no AI review of its own and never calls an AI route unless the consultant switches the narrative on', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    // The engine runs, the page goes straight to the preliminary result with no AI check, and a detailed report needs no AI call.
    await expect.poll(() => world.calls.some(c => c.startsWith('POST /api/evaluate/cost-iq ')), { timeout: 15000 }).toBe(true);
    await page.waitForTimeout(1500);
    expect(await page.evaluate("typeof aiEnabled")).toBe('undefined');
    expect(world.calls.filter(c => c.includes('/ai-'))).toEqual([]);
    expect(world.pageErrors).toEqual([]);
  });

  test('the AI narrative panel is off by default; switching on, then writing, goes through the narrative service and shows the grounded text', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const sent: any[] = [];
    let rec: any = { assessmentId: 'CIQ-ai-1', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: 'm', status: 'completed', respondentEmail: 'consultant@ltm.com', selectedAreasJson: '[]', answersJson: '{}', startedAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z', aiEnabled: false, narrativeJson: null };
    world.on('GET', ASSESSMENT, ({ query }) => (query.assessmentId ? { body: { ok: true, data: rec } } : { body: { ok: true, data: [] } }));
    world.on('POST', ASSESSMENT, ({ body }) => ({ body: { ok: true, data: { ...body.snapshot, status: 'completed', respondentEmail: 'consultant@ltm.com' } } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    world.on('POST', '/api/cost-iq/narrative', ({ body }) => {
      sent.push(body);
      if (body.action === 'enable') { rec = { ...rec, aiEnabled: true }; return { body: { ok: true, data: { assessmentId: 'CIQ-ai-1', aiEnabled: true } } }; }
      if (body.action === 'disable') { rec = { ...rec, aiEnabled: false }; return { body: { ok: true, data: { assessmentId: 'CIQ-ai-1', aiEnabled: false } } }; }
      return { body: { ok: true, data: { narrative: { summary: 'Governance is the weakest area.\n\nSecond paragraph.', priorities: ['One.'], nextSteps: ['Two.'] }, modelId: 'stub-model', generatedAt: '2026-11-05T10:00:00Z', status: 'ok' } } };
    });
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    await expect(page.getByText('Your technology cost & value snapshot')).toBeVisible({ timeout: 15000 });
    await page.evaluate("testScenario = false; savedAssessment = { assessmentId: 'CIQ-ai-1', status: 'completed' }; document.getElementById('narrativeCard')?.remove(); document.getElementById('app').insertAdjacentHTML('beforeend', narrativePanelHtml()); loadNarrative()");
    await expect(page.getByText('Off. The report is written without AI.')).toBeVisible();
    expect(sent).toEqual([]);
    await page.getByRole('button', { name: 'Switch on for this engagement' }).click();
    await expect(page.getByText('AI is on for this engagement.')).toBeVisible();
    expect(sent).toEqual([{ action: 'enable', assessmentId: 'CIQ-ai-1' }]);
    await page.getByLabel(/Optional focus note/).fill('Stress governance');
    await page.getByRole('button', { name: 'Write narrative' }).click();
    await expect(page.getByText('Governance is the weakest area.')).toBeVisible();
    expect(sent[1]).toEqual({ action: 'generate', assessmentId: 'CIQ-ai-1', focus: 'Stress governance' });
    await page.getByRole('button', { name: 'Switch off' }).click();
    await expect(page.getByText('Off. The report is written without AI.')).toBeVisible();
    expect(world.pageErrors).toEqual([]);
  });

  test('full flow against the real services: start, save, leave, resume, complete, reopen, download the report, delete; no console errors', async ({ page, context, world }) => {
    test.setTimeout(120_000);
    setPermissionSource(async () => ({ take: ['cost-iq', 'finops-iq'] }));
    setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const consoleErrors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${m.text()} ${m.location().url}`); });
    const store = memoryStore();
    const manage = manageHandler(store, () => new Date(), evaluateCostIq, finopsMemoryStore()), report = reportHandler(store);
    const ev = (method: string, path: string, claims: any, body: unknown, query: Record<string, string>): any => ({
      rawPath: path, headers: {}, queryStringParameters: query, body: method === 'POST' ? JSON.stringify(body) : undefined, isBase64Encoded: false,
      requestContext: { requestId: 'e2e', http: { method }, authorizer: { jwt: { claims } } }
    });
    world.on('GET', ASSESSMENT, async ({ claims, query }) => { const r: any = await manage(ev('GET', ASSESSMENT, claims, undefined, query)); return { status: r.statusCode, body: JSON.parse(r.body) }; });
    world.on('POST', ASSESSMENT, async ({ claims, body }) => { const r: any = await manage(ev('POST', ASSESSMENT, claims, body, {})); return { status: r.statusCode, body: JSON.parse(r.body) }; });
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    world.on('GET', '/api/cost-iq/report', async ({ claims, query }) => {
      const r: any = await report(ev('GET', '/api/cost-iq/report', claims, undefined, query));
      return { status: r.statusCode, body: null, raw: { body: Buffer.from(r.body, r.isBase64Encoded ? 'base64' : 'utf8'), headers: { 'content-type': r.headers['Content-Type'], 'content-disposition': r.headers['Content-Disposition'] } } };
    });

    // Start: the organisation name, then the first section's answers.
    await page.goto('/cost-iq-v10');
    await page.getByLabel('Organisation this assessment is for').fill('Flow Test Bank plc');
    await page.getByRole('button', { name: /Start the assessment/ }).click();
    await expect(page.locator('.q-card').first()).toBeVisible();
    await page.locator('.q-card').first().locator('.option').first().click();
    // The answer is saved (a short while after the click), not only the empty draft made at Start.
    await expect.poll(async () => { const id = (await store.listByRespondent('consultant@ltm.com'))[0]?.assessmentId; return id ? Object.keys(JSON.parse((await store.get(id))!.answersJson)).length : 0; }).toBeGreaterThan(0);

    // Leave and come back: the draft is listed and resumes with its answer kept.
    await page.goto('/cost-iq-v10');
    await expect(page.getByText('Flow Test Bank plc')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.locator('.q-card').first().locator('.option[aria-checked="true"]')).toHaveCount(1);

    // Answer the rest and complete: the server computes and stores the result.
    await page.evaluate(`(function(){ vq().forEach(function(q){ if(answers[q.id]!==undefined)return; if(q.options&&q.options.length)answers[q.id]=q.interaction==='multi-select'?[q.options[0].id]:q.options[0].id; else if(q.interaction==='stars')answers[q.id]=3; else if(q.interaction==='slider'||q.interaction==='range')answers[q.id]=50; }); sectionIndex=sections().length; runEngine(); })()`);
    await expect(page.getByText('Your technology cost & value snapshot')).toBeVisible({ timeout: 20000 });
    await expect.poll(async () => (await store.listByRespondent('consultant@ltm.com'))[0]?.status).toBe('completed');
    const done = (await store.listByRespondent('consultant@ltm.com'))[0];
    expect(done.resultJson).toBeTruthy();

    // Reopen from the list, download the report (the real report service: checks run before it is issued), then delete.
    await page.goto('/cost-iq-v10');
    await page.getByRole('button', { name: 'View result' }).click();
    await expect(page.getByText('Your technology cost & value snapshot')).toBeVisible();
    // The saved result carries the measured-figures and AI-narrative panels: no WCAG 2.2 AA violations there either.
    await expect(page.locator('#narrativeCard')).toBeVisible();
    await expect(page.locator('#leverBody')).not.toContainText('Loading…');
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    const { violations } = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    // (axe itself fetches the page's font stylesheet to measure contrast, which the page's CSP refuses: not a page error.)
    consoleErrors.length = 0;
    expect(violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.html.slice(0, 100)).join(' | ')}`)).toEqual([]);
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Report (PDF)', exact: true }).click()]);
    expect(d.suggestedFilename()).toMatch(/^cost-iq-flow-test-bank-plc-\d{4}-\d{2}-\d{2}-consultant\.pdf$|^cost-iq-flow-test-bank-plc-\d{4}-\d{2}-\d{2}\.pdf$/);
    await page.goto('/cost-iq-v10');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible();
    expect(await store.listByRespondent('consultant@ltm.com')).toEqual([]);
    expect(world.pageErrors).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('an estate question is shown only when the footprint names that estate', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByRole('button', { name: /Start the assessment/ })).toBeVisible();
    const visible = (footprint?: string[]) => page.evaluate(`(function(f){
      answers = f ? { 'CORE-01': f } : {};
      questions = allQuestions.filter(q => ['CORE-01', 'ADP-13', 'ADP-14', 'ADP-09'].includes(q.id));
      return vq().map(q => q.id);
    })(${JSON.stringify(footprint ?? null)})`);
    expect(await visible()).toEqual(['CORE-01']);
    expect(await visible(['PUBLIC_CLOUD'])).toEqual(['CORE-01']);
    expect(await visible(['COLO'])).toEqual(['CORE-01', 'ADP-13']);
    expect(await visible(['VMWARE', 'EXTERNAL'])).toEqual(['CORE-01', 'ADP-09', 'ADP-14']);
    expect(world.pageErrors).toEqual([]);
  });

  test('the preliminary result prints each finding with its description, and says evidence completeness, not confidence', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Cost Challenge' }).click();
    await expect(page.getByText('Evidence completeness').first()).toBeVisible({ timeout: 15000 });
    const result: any = await page.evaluate('assessment');
    expect(result.findings.length).toBeGreaterThan(0);
    const first = result.findings[0];
    expect(first.description).toBeTruthy();
    await expect(page.getByText(first.description, { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Confidence', { exact: true })).toHaveCount(0);
    expect(world.pageErrors).toEqual([]);
  });

  test('revenue and spend bands follow the reporting currency, and fall back to US dollars', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByRole('button', { name: /Start the assessment/ })).toBeVisible();
    const labels = (currency?: string) => page.evaluate(`(function(c){
      answers = c ? { 'CTX-01': c } : {};
      const q = allQuestions.find(x => x.id === 'CORE-03');
      return q.options.map(o => optionLabel(q, o)).slice(0, 2);
    })(${JSON.stringify(currency ?? null)})`);
    expect(await labels()).toEqual(['Below US$100M', 'US$100M–500M']);
    expect(await labels('EUR')).toEqual(['Below EUR 89M', 'EUR 89M to 450M']);
    expect(await labels('AED')).toEqual(['Below US$100M', 'US$100M–500M']);
    expect(await labels('OTHER')).toEqual(['Below US$100M', 'US$100M–500M']);
    expect(world.pageErrors).toEqual([]);
  });

  test('the result screen says the cloud line is not quantified, offers a completed FinOps IQ assessment, and shows its summary once linked', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const linked: any[] = [];
    let summary: string | null = null;
    const stored = { assessmentId: 'CIQ-cloudtest-1', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: 'm', status: 'draft', respondentEmail: 'consultant@ltm.com', selectedAreasJson: '[]', answersJson: '{}', startedAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z' };
    const summaryJson = JSON.stringify({
      schema: 'finops-iq-cost-summary/1', status: 'quantified', currency: 'EUR', label: 'Indicative range', assessmentDate: '2026-10-14',
      boundaryStatement: 'Cloud, AI and measured SaaS licence value in this report come from FinOps IQ.',
      cases: Object.fromEntries(['conservative', 'expected', 'upper'].map((c, i) => [c, Object.fromEntries(['netRunRate', 'netYear1', 'net3Year'].map(k => [k, { value: (i + 1) * 100000 }]))])),
      globalCap: { share: { value: 0.29 }, source: { citation: 'Flexera State of the Cloud', year: '2026', sample: 'n = 753' } }
    });
    world.on('GET', ASSESSMENT, ({ query }) => {
      if (query.finopsSessions) return { body: { ok: true, data: [{ assessmentId: 'FIQ-1', clientName: 'Example Bank', completedAt: '2026-10-14T01:00:00Z' }] } };
      if (query.assessmentId) return { body: { ok: true, data: { ...stored, finopsSummaryJson: summary } } };
      return { body: { ok: true, data: [] } };
    });
    world.on('POST', ASSESSMENT, ({ body }) => {
      if (body.action === 'link_finops') { linked.push(body); summary = summaryJson; return { body: { ok: true, data: stored } }; }
      return { body: { ok: true, data: { ...body.snapshot, respondentEmail: 'consultant@ltm.com' } } };
    });
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    await expect(page.getByText('Not quantified.')).toBeVisible({ timeout: 15000 });
    await page.evaluate("savedAssessment = { assessmentId: 'CIQ-cloudtest-1' }; loadCloudLine()");
    await expect(page.getByRole('button', { name: 'Use this result' })).toBeVisible();
    await page.getByRole('button', { name: 'Use this result' }).click();
    await expect(page.getByText('Cloud, AI and measured SaaS licence value in this report come from FinOps IQ.')).toBeVisible();
    expect(linked).toEqual([{ action: 'link_finops', assessmentId: 'CIQ-cloudtest-1', finopsAssessmentId: 'FIQ-1' }]);
    await expect(page.getByRole('cell', { name: /300,?000/ }).first()).toBeVisible();
    expect(world.pageErrors).toEqual([]);
  });

  test('the measured-figures panel records the non-cloud lever evidence in the reporting currency, validates it, and clears it', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const sent: any[] = [];
    const stored = { assessmentId: 'CIQ-lever-1', acceleratorId: 'cost-iq', releaseId: 'r', methodologyVersion: 'm', status: 'completed', respondentEmail: 'consultant@ltm.com', selectedAreasJson: '[]', answersJson: '{}', startedAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z' };
    world.on('GET', ASSESSMENT, ({ query }) => (query.assessmentId ? { body: { ok: true, data: { ...stored, leverEvidenceJson: null } } } : { body: { ok: true, data: [] } }));
    world.on('POST', ASSESSMENT, ({ body }) => {
      if (body.action === 'set_lever_evidence') { sent.push(body); return { body: { ok: true, data: stored } }; }
      return { body: { ok: true, data: { ...body.snapshot, respondentEmail: 'consultant@ltm.com' } } };
    });
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    await expect(page.getByText('Not quantified.')).toBeVisible({ timeout: 15000 });
    // Without a reporting currency the panel asks for it first.
    await page.evaluate("delete answers['CTX-01']; document.getElementById('leverCard').outerHTML = leverPanelHtml()");
    await expect(page.getByText('Choose the reporting currency in the context questions first')).toBeVisible();
    await page.evaluate("answers['CTX-01'] = 'GBP'; savedAssessment = { assessmentId: 'CIQ-lever-1' }; document.getElementById('leverCard').outerHTML = leverPanelHtml(); loadLeverEvidence()");
    await page.getByRole('button', { name: 'Save measured figures' }).click();
    await expect(page.getByText('Enter the unused licence cost')).toBeVisible();
    await page.getByLabel('Unused or over-entitled licence cost, a year').fill('800000');
    await page.getByLabel('Share of those contracts renewing in year one, %').fill('150');
    await page.getByRole('button', { name: 'Save measured figures' }).click();
    await expect(page.getByText('The renewal share is between 0 and 100.')).toBeVisible();
    await page.getByLabel('Share of those contracts renewing in year one, %').fill('40');
    await page.getByLabel("Client's own cost of one FTE-month").fill('9000');
    await page.getByRole('button', { name: 'Save measured figures' }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();
    expect(sent).toEqual([{ action: 'set_lever_evidence', assessmentId: 'CIQ-lever-1', evidence: { currency: 'GBP', internalRatePerFteMonth: 9000, levers: { 'LEV-11': { unusedAnnualCost: 800000, renewingYear1Share: 0.4 } } } }]);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1].evidence).toBeNull();
    expect(world.pageErrors).toEqual([]);
  });

  test('the page takes which questions it asks from the engine: default areas, footprint-gated estate questions, no copy of its own', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByRole('button', { name: /Start the assessment/ })).toBeVisible();
    expect(await page.evaluate('DEFAULT_AREAS')).toEqual(['Infrastructure', 'Applications']);
    expect(await page.evaluate('selectedAreas')).toEqual(['Infrastructure', 'Applications']);
    const ids = (footprint: string[]) => page.evaluate(`(function(f){
      selectedAreas = DEFAULT_AREAS.slice(); answers = { 'CORE-01': f }; questions = selectQuestions(selectedAreas);
      return vq().map(q => q.id);
    })(${JSON.stringify(footprint)})`);
    const saas = await ids(['SAAS']) as string[];
    const onprem = await ids(['ON_PREM']) as string[];
    expect(saas).toContain('ADP-06');
    expect(onprem).not.toContain('ADP-06');
    expect(onprem).toContain('ADP-11');
    expect(saas).not.toContain('ADP-11');
    expect(world.pageErrors).toEqual([]);
  });

  test('a completed assessment downloads the server-built report: PDF, client edition and backlog, each through the API', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    const answers = { 'CORE-01': ['PUBLIC_CLOUD'], 'CORE-16': 'TRUE', 'ADP-42': 'UNKNOWN' };
    const areas = ['Infrastructure', 'Applications'];
    const done = { ...stored, status: 'completed', selectedAreasJson: JSON.stringify(areas), answersJson: JSON.stringify(answers), subjectiveJson: '{}', resultJson: JSON.stringify(evaluateCostIq({ answers, scope: { selectedAreas: areas } })), completedAt: '2026-11-02T00:00:00.000Z' };
    world.on('GET', ASSESSMENT, ({ query }) => ({ body: { ok: true, data: query.assessmentId ? done : [done] } }));
    const asked: string[] = [];
    world.on('GET', '/api/cost-iq/report', ({ query }) => {
      asked.push(`?assessmentId=${query.assessmentId}&format=${query.format}&view=${query.view}`);
      const csv = query.format === 'csv';
      return { body: null, raw: { body: csv ? 'a,b' : '%PDF-1.4', headers: { 'content-type': csv ? 'text/csv' : 'application/pdf', 'content-disposition': `attachment; filename="cost-iq-acme-bank.${csv ? 'csv' : 'pdf'}"` } } };
    });
    await page.goto('/cost-iq-v10');
    await page.getByRole('button', { name: 'View result' }).click();
    const download = async (name: string) => { const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name, exact: true }).click()]); return d.suggestedFilename(); };
    expect(await download('Report (PDF)')).toBe('cost-iq-acme-bank.pdf');
    expect(await download('Client edition (PDF)')).toBe('cost-iq-acme-bank.pdf');
    expect(await download('Backlog (CSV)')).toBe('cost-iq-acme-bank.csv');
    expect(asked).toEqual(['?assessmentId=CIQ-stored-0001&format=pdf&view=consultant', '?assessmentId=CIQ-stored-0001&format=pdf&view=client', '?assessmentId=CIQ-stored-0001&format=csv&view=client']);
    expect(await page.evaluate('typeof window.jspdf')).toBe('undefined');
    expect(world.pageErrors).toEqual([]);
  });

  test('a trial scenario offers no report download, and says why', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10?scenarios=1');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    await expect(page.getByText('Evidence completeness').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Report (PDF)' })).toHaveCount(0);
    await expect(page.getByText('produced from a saved, completed assessment')).toBeVisible();
    expect(world.pageErrors).toEqual([]);
  });
});

