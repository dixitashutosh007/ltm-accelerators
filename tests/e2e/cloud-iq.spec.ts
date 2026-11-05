import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, makeIdToken, signedIn } from './fixtures';
import { evaluateCloudIq } from '../../packages/engine-core/src/accelerators/cloud-iq/evaluate';
import { parseCloudIqRequest } from '../../packages/engine-core/src/accelerators/cloud-iq/contract';
import { cloudIqAnswers } from '../../packages/engine-core/test/sample-inputs';

const PATH = '/api/evaluate/cloud-iq';

test.describe('Cloud IQ', () => {
  let requests: any[];

  test.beforeEach(async ({ page, context, world }) => {
    requests = [];
    await signedIn(context, { email: 'admin@ltm.com', token: makeIdToken('admin@ltm.com'), role: 'super_admin', permissions: {} });
    // The fake API validates with the real contract and scores with the real engine, as the Lambda does.
    world.on('POST', PATH, ({ body }) => {
      requests.push(body);
      const parsed = parseCloudIqRequest(body);
      if (!parsed.ok) return { status: 400, body: { ok: false, details: parsed.errors } };
      return { body: { ok: true, data: evaluateCloudIq(parsed.value) } };
    });
    await page.goto('/cloud-iq');
    await page.evaluate(a => { (window as any).A = a; }, cloudIqAnswers);
  });

  test('the scorecard is scored by the server and shows its results without gaps', async ({ page, world }) => {
    await page.evaluate('computeAndShow()');
    await expect(page.getByText('Estate Maturity Preliminary Scorecard')).toBeVisible({ timeout: 15_000 });

    expect(world.calls).toContain(`POST ${PATH} auth=bearer`);
    const parsed = parseCloudIqRequest(requests[0]);
    expect(parsed.ok).toBe(true);
    const expected = evaluateCloudIq((parsed as any).value);
    const text = await page.locator('#app').innerText();
    expect(text).toContain(expected.overall.toFixed(1));
    // CL1 (decisions D3, D4): no cost-leakage amount and no sector peer comparison on the result screen; the one cloud figure is FinOps IQ's.
    expect(text).not.toMatch(/cost leakage|peer median|vs Peer|Sector Benchmark/i);
    expect(text).toMatch(/not quantified here/i);
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    expect(world.pageErrors).toEqual([]);
  });

  test('CL1: the page holds no browser AI, no lead-generation gate, no hard-coded contact, and every text the client typed is escaped', async ({ page }) => {
    // (The page's own source: the development-preview banner, added by a shared script, shows its own contact address.)
    const html = readFileSync(join(process.cwd(), 'Accelerators/cloud-iq.html'), 'utf8');
    expect(html).not.toMatch(/api\.openai\.com|generativelanguage\.googleapis|api\.anthropic\.com|anthropic-dangerous|aiApiKey|cfgOpenAiKey|Prompt Pack/i);
    expect(html).not.toMatch(/Consultant Unlock|Consultant Bypass|leadEmail|ashutosh\.dixit@/i);
    expect(await page.evaluate("localStorage.getItem('cloud_iq_openai_key')")).toBeNull();
    // A hostile organisation name and lead name must come out as text, never as markup or script.
    await page.evaluate(`SESSION.clientName = '<img src=x onerror="window.__xss=1">Evil Ltd'; SESSION.consultantLead = '<script>window.__xss=2<\\/script>'; updateSessionUI();`);
    await page.evaluate('computeAndShow()');
    await expect(page.getByText('Estate Maturity Preliminary Scorecard')).toBeVisible({ timeout: 15_000 });
    await page.evaluate('showResults(RESULT)');
    expect(await page.evaluate('window.__xss')).toBeUndefined();
    expect(await page.locator('#app img[src="x"], #app script').count()).toBe(0);
    expect(await page.locator('#lblLead').innerText()).toContain('<script>');
    // The same for a note inside an imported session file, shown in the question screen's text box.
    await page.evaluate(`hydrate({ SESSION: { questionNotes: { 'Q0.1': '</textarea><img src=x onerror="window.__xss=3">' } }, A: {}, gIdx: 0 }); renderGroup();`);
    expect(await page.evaluate('window.__xss')).toBeUndefined();
    expect(await page.locator('#app img[src="x"]').count()).toBe(0);
  });

  test('if scoring fails, an error is shown and no scorecard is computed locally', async ({ page, world }) => {
    world.on('POST', PATH, () => ({ status: 503, body: { ok: false } }));
    await page.evaluate('computeAndShow()');
    await expect(page.getByRole('alert')).toContainText("We couldn't calculate your results");
    await expect(page.getByText('Estate Maturity Preliminary Scorecard')).toHaveCount(0);
    expect(await page.evaluate('RESULT')).toBeNull();
  });
});
