import { test, expect, makeIdToken, signedIn } from './fixtures';
import { createHandler } from '../../amplify/functions/manage-session/handler';
import { memoryStore } from '../../amplify/functions/manage-session/store';
import { setPermissionSource, setDomainStore } from '../../amplify/functions/_shared/access';

// Platform P3: Cloud IQ and Modernize IQ keep their progress on the server through the shared sessions component, run here
// against the real sessions service with an in-memory store.
const SESSIONS = '/api/sessions';

test.describe('saved sessions (P3)', () => {
  let store: ReturnType<typeof memoryStore>;
  let consoleErrors: string[];

  test.beforeEach(async ({ page, context, world }) => {
    setPermissionSource(async () => ({ take: ['cloud-iq', 'modernization-iq', 'strategy-iq'] }));
    setDomainStore({ check: async () => ({ allowed: true, reason: 'baseline_domain' }) });
    store = memoryStore();
    consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${m.text()} ${m.location().url}`); });
    const handler = createHandler(store);
    const run = async (method: string, claims: any, body: unknown, query: Record<string, string>) => {
      const r: any = await handler({ rawPath: SESSIONS, headers: {}, queryStringParameters: query, body: method === 'POST' ? JSON.stringify(body) : undefined, isBase64Encoded: false, requestContext: { requestId: 'e2e', http: { method }, authorizer: { jwt: { claims } } } } as any);
      return { status: r.statusCode, body: JSON.parse(r.body) };
    };
    world.on('GET', SESSIONS, ({ claims, query }) => run('GET', claims, undefined, query));
    world.on('POST', SESSIONS, ({ claims, body }) => run('POST', claims, body, {}));
    await signedIn(context, { email: 'consultant@ltm.com', token: makeIdToken('consultant@ltm.com'), role: 'advisor_viewer', permissions: { take: ['cloud-iq', 'modernization-iq', 'strategy-iq'], view: ['cloud-iq', 'modernization-iq', 'strategy-iq'] } } as any);
  });

  test('Cloud IQ: progress is saved to the account, offered on return, listed under My sessions, and deleted in two steps', async ({ page, world }) => {
    await page.goto('/cloud-iq');
    await expect(page.getByRole('button', { name: 'My sessions' })).toBeVisible();
    await page.evaluate("begin()");
    await page.evaluate("A['G1.Q1'] = 1; gIdx = 1; saveState()");
    await expect.poll(async () => (await store.listByOwner('consultant@ltm.com', 'cloud-iq')).length, { timeout: 10_000 }).toBe(1);
    const saved = (await store.listByOwner('consultant@ltm.com', 'cloud-iq'))[0];
    expect(saved.status).toBe('in_progress');
    expect(saved.expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(await page.evaluate('localStorage.getItem(STORE_KEY)')).toBeNull();

    // Back on the page: the saved session is offered, and resuming restores the answers and the section.
    await page.goto('/cloud-iq');
    await expect(page.getByText(/partway through an engagement assessment/)).toBeVisible();
    await page.getByRole('button', { name: 'Resume Assessment' }).click();
    expect(await page.evaluate("gIdx")).toBe(1);
    expect(await page.evaluate("A['G1.Q1']")).toBe(1);

    // My sessions lists it with its stage, and deleting asks twice.
    await page.getByRole('button', { name: 'My sessions' }).click();
    const dialog = page.getByRole('dialog', { name: 'My sessions' });
    await expect(dialog).toContainText('In progress');
    await expect(dialog).toContainText('deleted automatically two years after its last save');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog.getByText('Delete permanently?')).toBeVisible();
    expect(await store.listByOwner('consultant@ltm.com', 'cloud-iq')).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(dialog.getByText('No saved sessions yet.')).toBeVisible();
    expect(await store.listByOwner('consultant@ltm.com', 'cloud-iq')).toEqual([]);
    expect(world.pageErrors).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('Cloud IQ: progress an earlier build kept in this browser is cleared, and the page says it is not carried over', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('cloudiq.v2.state', JSON.stringify({ A: { x: 1 }, gIdx: 2 })));
    await page.goto('/cloud-iq');
    await expect(page.getByRole('status').filter({ hasText: 'not carried over' })).toBeVisible();
    expect(await page.evaluate("localStorage.getItem('cloudiq.v2.state')")).toBeNull();
  });

  test('Modernize IQ: the unfinished session is restored when the page opens, and "clear" deletes it from the account', async ({ page }) => {
    await page.goto('/modernization-iq');
    await expect(page.getByRole('button', { name: 'My sessions' })).toBeVisible();
    await page.evaluate("STATE.org.clientName = 'Saved Bank'; STATE.groupIndex = 1; saveState()");
    await expect.poll(async () => (await store.listByOwner('consultant@ltm.com', 'modernization-iq')).length, { timeout: 10_000 }).toBe(1);
    expect((await store.listByOwner('consultant@ltm.com', 'modernization-iq'))[0].title).toBe('Modernize IQ · Saved Bank');

    await page.goto('/modernization-iq');
    await expect.poll(() => page.evaluate("STATE.org.clientName")).toBe('Saved Bank');
    expect(await page.evaluate("STATE.groupIndex")).toBe(1);

    await page.evaluate("clearAllState()");
    await expect.poll(async () => (await store.listByOwner('consultant@ltm.com', 'modernization-iq')).length).toBe(0);
  });

  test('Strategy IQ: an unfinished assessment is offered on return and resuming restores the organisation, the answers and the section', async ({ page }) => {
    await page.goto('/strategy-iq');
    await expect(page.getByRole('button', { name: 'My sessions' })).toBeVisible();
    await page.evaluate("STATE.intake.orgName = 'Strategy Saved Ltd'; STATE.answers['SA-1'] = 'x'; STATE.currentSectionIdx = 2; SavedSessions.touch()");
    await expect.poll(async () => (await store.listByOwner('consultant@ltm.com', 'strategy-iq')).length, { timeout: 10_000 }).toBe(1);
    expect((await store.listByOwner('consultant@ltm.com', 'strategy-iq'))[0].title).toBe('Strategy IQ · Strategy Saved Ltd');
    await page.goto('/strategy-iq');
    await expect(page.getByText('You have an unfinished assessment')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    expect(await page.evaluate('STATE.intake.orgName')).toBe('Strategy Saved Ltd');
    expect(await page.evaluate("STATE.answers['SA-1']")).toBe('x');
    expect(await page.evaluate('STATE.currentSectionIdx')).toBe(2);
    await expect(page.locator('#screen-assess')).toHaveClass(/active/);
  });

  test("another user's sessions are neither listed nor opened", async ({ page, context }) => {
    await store.create({ sessionId: 'S-someoneelse0001', accelerator: 'cloud-iq', ownerEmail: 'other@ltm.com', title: 'Other', status: 'in_progress', stage: null, percent: null, payloadJson: '{"A":{},"gIdx":1}', expiresAt: Math.floor(Date.now() / 1000) + 86400 } as any);
    await page.goto('/cloud-iq');
    await page.getByRole('button', { name: 'My sessions' }).click();
    await expect(page.getByRole('dialog', { name: 'My sessions' })).toContainText('No saved sessions yet.');
    await expect(page.getByText(/partway through/)).toHaveCount(0);
  });
});
