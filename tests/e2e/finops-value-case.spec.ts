import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateFinOpsValueCase } from '../../packages/engine-core/src/accelerators/finops-value-case/evaluate';
import { parseFinOpsValueCaseRequest } from '../../packages/engine-core/src/accelerators/finops-value-case/contract';

const PATH = '/api/evaluate/finops-value-case';

test.describe('FinOps Value Case', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseFinOpsValueCaseRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateFinOpsValueCase(parsed.value.answers, parsed.value.org) } };
    });
    await page.goto('/finops-value-case');
    await page.evaluate('dismissValueSplash()');
    // A US bank with weak cost controls, on the last question section.
    await page.evaluate(`(() => {
      Object.assign(S.org, { name: 'Acme Bank', sector: 'Banking / Financial Services', sector_class: 'bfsi', currency: 'usd' });
      S.respondent.name = 'Test Respondent';
      S.kb.questions.forEach(q => {
        if (q.answer_type === 'single_select' || q.answer_type === 'card_select') S.answers[q.id] = q.options.length - 1;
      });
      S.answers.E3 = 5000000; S.answers.E5 = 40;
      S.screen = 'assess'; S.secIdx = S.kb.sections.length - 1; render();
    })()`);
  });

  test('a completed assessment is scored by the server and the report has no gaps', async ({ page, world }) => {
    await page.getByRole('button', { name: /Complete Assessment/ }).click();
    await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
    await page.locator('[data-a="generateEngineReport"]').click();
    await expect(page.locator('[data-a="saveS3Report"]')).toBeVisible({ timeout: 15_000 });

    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
    // The page sends exactly what the engine reads.
    const last = requests[requests.length - 1];
    expect(parseFinOpsValueCaseRequest(last).ok).toBe(true);
    expect(last.org).toEqual({ name: 'Acme Bank', sector: 'Banking / Financial Services', sector_class: 'bfsi', currency: 'usd' });

    const text = await page.locator('#app').innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]/);
    expect(text).toContain('$');
    expect(text).not.toContain('£');
    expect(world.pageErrors).toEqual([]);
    expect(world.missingFiles).toEqual([]);
  });

  test('a "we don\'t know" answer is listed as a blind spot and the report renders (was a TypeError on b.q.text)', async ({ page, world }) => {
    const questionText = await page.evaluate(`(() => {
      S.answers.V1 = '__DK__';
      return S.kb.questions.find(x => x.id === 'V1').text;
    })()`) as string;
    // The explanation lives only in the server's knowledge base.
    const blindText = evaluateFinOpsValueCase({ V1: '__DK__' }).blindSpots[0].text;
    await page.getByRole('button', { name: /Complete Assessment/ }).click();
    await page.locator('[data-a="generateEngineReport"]').click();
    await expect(page.locator('[data-a="saveS3Report"]')).toBeVisible({ timeout: 15_000 });

    const last = requests[requests.length - 1];
    expect(last.answers.V1).toBe('__DK__');
    await expect(page.getByRole('heading', { name: 'Your blind spots' })).toBeVisible();
    const blind = page.locator('.blind').first();
    await expect(blind.locator('.blindq')).toHaveText(questionText);
    await expect(blind.locator('.blindt')).toHaveText(blindText);
    const text = await page.locator('#app').innerText();
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]/);
    expect(world.pageErrors).toEqual([]);
  });

  test('if scoring fails, the user stays on their answers and sees an error, not a placeholder report', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.getByRole('button', { name: /Complete Assessment/ }).click();
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByRole('button', { name: /Complete Assessment/ })).toBeVisible();
    expect(await page.evaluate('S.screen')).toBe('assess');
    expect(await page.evaluate('Object.keys(S.answers).length')).toBeGreaterThan(10);
  });

  test('if scoring fails while the report is generated, no report is shown', async ({ page, world }) => {
    await page.getByRole('button', { name: /Complete Assessment/ }).click();
    await expect(page.locator('[data-a="generateEngineReport"]')).toBeVisible();
    world.on('POST', PATH, () => ({ status: 500, body: { ok: false } }));
    await page.locator('[data-a="generateEngineReport"]').click();
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results", { timeout: 15_000 });
    await expect(page.locator('[data-a="saveS3Report"]')).toHaveCount(0);
    expect(await page.evaluate('S.screen')).not.toBe('report');
  });
});
