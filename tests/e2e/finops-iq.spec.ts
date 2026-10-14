import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateFinOpsIq } from '../../packages/engine-core/src/accelerators/finops-iq/evaluate';
import { parseFinOpsIqRequest } from '../../packages/engine-core/src/accelerators/finops-iq/contract';

const PATH = '/api/evaluate/finops-iq';

test.describe('FinOps IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseFinOpsIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateFinOpsIq(parsed.value) } };
    });
    await page.goto('/finops-iq');
    await page.evaluate(`localStorage.clear()`);
    await page.evaluate(`loadArchetype('banking')`);
  });

  test('the report is scored by the server; blockers are the server\'s failing critical gates', async ({ page, world }) => {
    await page.evaluate(`switchTab('report')`);
    await expect(page.getByText('Gate Blockers Outstanding')).toBeVisible({ timeout: 15_000 });

    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
    const last = requests[requests.length - 1];
    const parsed = parseFinOpsIqRequest(last);
    expect(parsed.ok).toBe(true);
    expect(Object.keys(last.org).sort()).toEqual(['name', 'sector']);

    const r = evaluateFinOpsIq((parsed as any).value);
    // Every failing critical gate counts, answered below its minimum or not yet answered.
    const failing = Object.values(r.stageCriticals).flatMap(c => c.failing);
    const unanswered = failing.filter((f: any) => f.score === null).length;
    const card = page.locator('.kpi-card', { hasText: 'Gate Blockers Outstanding' });
    await expect(card.locator('.kpi-value')).toHaveText(String(failing.length));
    await expect(card).toContainText(`${failing.length - unanswered} below minimum · ${unanswered} not yet answered`);
    await expect(page.getByTestId('coverage')).toHaveText(`Based on ${r.coverage.answered} of ${r.coverage.total} questions`);
    await expect(page.getByTestId('vas-basis')).toContainText("Client's own estimate of waste (question T6)");
    await expect(page.getByTestId('vas-range')).toContainText('$');
    await expect(page.getByText('Indicative waste range (client estimate), not a savings commitment')).toBeVisible();

    const text = await page.locator('#main-app').innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(world.pageErrors).toEqual([]);
  });

  test('with no answers, unanswered critical gates are blockers and domains read "Not assessed"', async ({ page }) => {
    await page.evaluate(`STATE.answers = {}; saveState(); switchTab('report')`);
    const card = page.locator('.kpi-card', { hasText: 'Gate Blockers Outstanding' });
    await expect(card.locator('.kpi-value')).toHaveText('17', { timeout: 15_000 });
    await expect(card).toContainText('0 below minimum · 17 not yet answered');
    await expect(card).not.toContainText('All critical gates cleared');
    await expect(page.getByTestId('coverage')).toHaveText('Based on 0 of 44 questions');
    await expect(page.getByText('Not assessed')).toHaveCount(5);
    await expect(page.getByTestId('vas-range')).toHaveText('Not quantified');
    await expect(page.getByTestId('vas-basis')).toContainText('Not quantified');
    const text = await page.locator('#main-app').innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b|Stage 0/);
  });

  test('without the waste estimate (T6) there is no dollar figure, on screen or in the briefing', async ({ page }) => {
    await page.evaluate(`delete STATE.answers.T6; saveState(); switchTab('report')`);
    await expect(page.getByTestId('vas-range')).toHaveText('Not quantified', { timeout: 15_000 });
    await expect(page.locator('#main-app')).toContainText('Waste has not been quantified because no estimate was given.');
  });

  test('F0 containment: no browser AI, no sales wall, review banner and disclaimer shown, user text escaped', async ({ page, world }) => {
    await page.evaluate(`localStorage.setItem('finops_iq_ai_config', '{"apiKey":"test-key-not-real"}')`);
    await page.reload();
    expect(await page.evaluate(`localStorage.getItem('finops_iq_ai_config')`)).toBeNull();
    await expect(page.locator('#review-banner')).toContainText('Internal consultant use only');
    await expect(page.locator('#ai-status-pill, #aiConfigModal')).toHaveCount(0);

    await page.evaluate(`loadArchetype('banking'); STATE.org.name = '<img src=x onerror="window.__xss=1">Acme'; STATE.org.consultantName = 'Jordan Lee'; saveState(); switchTab('report')`);
    await expect(page.getByText('Gate Blockers Outstanding')).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(`window.__xss`)).toBeUndefined();
    await expect(page.locator('.mask-overlay-shield, .masked-content-blur')).toHaveCount(0);
    await expect(page.getByTestId('disclaimer')).toContainText('CC BY 4.0');
    const text = await page.locator('#main-app').innerText();
    expect(text).not.toMatch(/Synthesize with AI|Interpret with AI|Passkey|recoverable|Ashutosh/i);

    await page.getByRole('button', { name: 'Discuss with LTM' }).click();
    await expect(page.locator('#advisory-contact-text')).toHaveText('Please contact your LTM engagement lead, Jordan Lee, to discuss these results.');
    await page.evaluate(`closeAdvisoryModal()`);

    // The PDF builds with every roadmap row and the disclaimer on each page.
    await page.waitForFunction(`!!(window.jspdf && window.jspdf.jsPDF)`, null, { timeout: 15_000 });
    const pdf: any = await page.evaluate(`(() => {
      const Orig = window.jspdf.jsPDF; let doc = null; let stamped = 0;
      window.jspdf.jsPDF = function (opts) {
        doc = new Orig(opts);
        const text = doc.text.bind(doc);
        doc.text = function (t, ...rest) { if ([].concat(t).join(' ').includes('Internal consultant use only')) stamped++; return text(t, ...rest); };
        doc.save = function () {};
        return doc;
      };
      try { exportBoardroomPDF(false); } finally { window.jspdf.jsPDF = Orig; }
      return { pages: doc ? doc.getNumberOfPages() : 0, stamped };
    })()`);
    expect(pdf.pages).toBeGreaterThanOrEqual(2);
    expect(pdf.stamped).toBeGreaterThanOrEqual(pdf.pages);
    expect(world.pageErrors).toEqual([]);
  });

  test('consultant probes show only in consultant view', async ({ page }) => {
    await page.evaluate(`switchTab('assess')`);
    await expect(page.locator('.opt-btn').first()).toBeVisible();
    await expect(page.locator('.consultant-probe-box')).toHaveCount(0);
    await page.evaluate(`toggleConsultantMode(); renderApp()`);
    await expect(page.locator('.consultant-probe-box').first()).toBeVisible();
  });

  test('answer options show no point values', async ({ page }) => {
    await page.evaluate(`switchTab('assess')`);
    await expect(page.locator('.opt-btn').first()).toBeVisible();
    await expect(page.locator('#main-app')).not.toContainText(' pts');
  });

  test('if scoring fails, an error is shown and the report is not rendered', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.evaluate(`switchTab('report')`);
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByText('Results are not available yet')).toBeVisible();
    await expect(page.getByText('Gate Blockers Outstanding')).toHaveCount(0);
  });
});
