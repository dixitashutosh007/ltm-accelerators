import { test, expect, makeIdToken, signedIn, TEST_API } from './fixtures';
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
    world.on('GET', METADATA, () => ({ body: metadata() }));
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
    await page.getByRole('button', { name: /Configure diagnostic/ }).click();
    await expect.poll(() => sent.length, { message: world.calls.join('\n') }).toBeGreaterThan(0);
    expect(sent[0]).toMatchObject({ action: 'save', snapshot: { acceleratorId: 'cost-iq', status: 'draft' } });
    expect(sent[0].progress).toMatchObject({ percent: 0 });
    expect(typeof sent[0].progress.stage).toBe('string');
    expect(world.pageErrors).toEqual([]);
  });

  test('with AI switched off the page never calls the AI routes', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    world.on('POST', '/api/evaluate/cost-iq', ({ body }) => ({ body: evaluateCostIq({ answers: body.answers, scope: body.scope }) }));
    await page.goto('/cost-iq-v10');
    await page.getByRole('button', { name: 'Load Healthy' }).click();
    // The engine runs, the page goes straight to the preliminary result with no AI check, and a detailed report needs no AI call.
    await expect.poll(() => world.calls.some(c => c.startsWith('POST /api/evaluate/cost-iq ')), { timeout: 15000 }).toBe(true);
    await page.waitForTimeout(1500);
    expect(await page.evaluate('aiEnabled')).toBe(false);
    expect(world.calls.filter(c => c.includes('/ai-'))).toEqual([]);
    expect(world.pageErrors).toEqual([]);
  });

  test('an estate question is shown only when the footprint names that estate', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByRole('button', { name: /Configure diagnostic/ })).toBeVisible();
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
    await page.goto('/cost-iq-v10');
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
    await expect(page.getByRole('button', { name: /Configure diagnostic/ })).toBeVisible();
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
    await page.goto('/cost-iq-v10');
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

  test('the page takes which questions it asks from the engine: default areas, footprint-gated estate questions, no copy of its own', async ({ page, context, world }) => {
    await signedIn(context, permitted(makeIdToken('consultant@ltm.com')));
    world.on('GET', ASSESSMENT, () => ({ body: { ok: true, data: [] } }));
    await page.goto('/cost-iq-v10');
    await expect(page.getByRole('button', { name: /Configure diagnostic/ })).toBeVisible();
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
});

