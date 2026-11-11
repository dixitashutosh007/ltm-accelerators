/**
 * User activity store (platform workstream P2): what is recorded, what is not, and that it expires after 12 months.
 * DynamoDB is replaced by an in-memory table that understands the few expressions the store uses.
 */
import { describe, it, expect } from 'vitest';
import { UpdateItemCommand, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { createActivityStore, toCsv, RETENTION_DAYS, USER_COLUMNS } from './activity-store.mjs';

type Item = Record<string, any>;
class FakeTable {
  items = new Map<string, Item>();
  fail = false;
  commands: any[] = [];
  private key(k: Item) { return `${k.pk.S}|${k.sk.S}`; }
  async send(cmd: any): Promise<any> {
    this.commands.push(cmd);
    if (this.fail) throw new Error('dynamodb down');
    const i = cmd.input;
    if (cmd instanceof PutItemCommand) {
      if (i.ConditionExpression === 'attribute_not_exists(pk)' && this.items.has(this.key(i.Item))) throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' });
      this.items.set(this.key(i.Item), { ...i.Item });
      return {};
    }
    if (cmd instanceof UpdateItemCommand) {
      const item = this.items.get(this.key(i.Key)) ?? { ...i.Key };
      const [setPart, addPart] = i.UpdateExpression.replace(/^SET /, '').split(' ADD ');
      for (const clause of setPart.split(/,\s*(?![^()]*\))/)) {
        const [lhs, rhs] = clause.split(' = ').map((x: string) => x.trim());
        const name = i.ExpressionAttributeNames?.[lhs] ?? lhs;
        const m = /^if_not_exists\((\w+), (:\w+)\)$/.exec(rhs);
        if (m) { if (!item[name]) item[name] = i.ExpressionAttributeValues[m[2]]; } else item[name] = i.ExpressionAttributeValues[rhs];
      }
      if (addPart) { const [field, ref] = addPart.trim().split(' '); item[field] = { N: String(Number(item[field]?.N ?? 0) + Number(i.ExpressionAttributeValues[ref].N)) }; }
      this.items.set(this.key(i.Key), item);
      return {};
    }
    if (cmd instanceof QueryCommand) return { Items: [...this.items.values()].filter(x => x.pk.S === i.ExpressionAttributeValues[':p'].S) };
    if (cmd instanceof ScanCommand) {
      const v = i.ExpressionAttributeValues;
      const keep = i.FilterExpression === 'sk = :s' ? (x: Item) => x.sk.S === v[':s'].S : (x: Item) => x.sk.S.startsWith(v[':p'].S);
      return { Items: [...this.items.values()].filter(keep) };
    }
    throw new Error('unexpected command');
  }
}
const setup = () => {
  const table = new FakeTable();
  let t = Date.UTC(2026, 10, 3, 9, 0, 0);
  return { table, store: createActivityStore({ table: 'activity', ddb: table, now: () => t }), tick: (ms: number) => { t += ms; } };
};
const YEAR = RETENTION_DAYS * 86400;

describe('sign-ins', () => {
  it('first sign-in sets the first and last time and a count of one; later ones move the last time and the count', async () => {
    const { store, tick } = setup();
    await store.recordLogin(' Pat@Partner.com ');
    tick(3_600_000);
    await store.recordLogin('pat@partner.com');
    const d = await store.userDetail('PAT@partner.com');
    expect(d).toMatchObject({ email: 'pat@partner.com', loginCount: 2, firstLoginAt: '2026-11-03T09:00:00.000Z', lastLoginAt: '2026-11-03T10:00:00.000Z' });
    expect(d.logins).toEqual(['2026-11-03T10:00:00.000Z', '2026-11-03T09:00:00.000Z']);
  });
  it('every item expires 12 months after it was written, and the summary expiry moves with the last sign-in', async () => {
    const { store, table, tick } = setup();
    await store.recordLogin('a@x.com');
    const first = Math.floor(Date.UTC(2026, 10, 3, 9) / 1000) + YEAR;
    expect([...table.items.values()].every(i => Number(i.expiresAt.N) === first)).toBe(true);
    tick(86_400_000);
    await store.recordLogin('a@x.com');
    expect(Number(table.items.get('USER#a@x.com|SUMMARY')!.expiresAt.N)).toBe(first + 86400);
  });
  it('stores the address, the times and nothing else about the person', async () => {
    const { store, table } = setup();
    await store.recordLogin('a@x.com');
    for (const item of table.items.values()) expect(Object.keys(item).sort().every(k => ['pk', 'sk', 'email', 'at', 'firstLoginAt', 'lastLoginAt', 'loginCount', 'expiresAt'].includes(k))).toBe(true);
  });
  it('ignores an empty address', async () => {
    const { store, table } = setup();
    await store.recordLogin('  ');
    expect(table.commands).toEqual([]);
  });
});

describe('assessments', () => {
  const base = { accelerator: 'resilience-iq', assessmentId: 'RIQ-1', status: 'in_progress', startedAt: '2026-11-03T08:00:00.000Z' };
  it('records the accelerator, id, status and times, and keeps the first start', async () => {
    const { store, tick } = setup();
    await store.recordAssessment('a@x.com', base);
    tick(60_000);
    await store.recordAssessment('a@x.com', { ...base, status: 'completed', startedAt: '2026-11-03T09:30:00.000Z', completedAt: '2026-11-03T09:01:00.000Z' });
    const d = await store.userDetail('a@x.com');
    expect(d.assessments).toEqual([{ accelerator: 'resilience-iq', assessmentId: 'RIQ-1', clientName: null, status: 'completed', stage: null, percent: null, startedAt: '2026-11-03T08:00:00.000Z', lastSavedAt: '2026-11-03T09:01:00.000Z', completedAt: '2026-11-03T09:01:00.000Z' }]);
  });
  it('keeps the stage and percent from an earlier save when a later save gives none', async () => {
    const { store } = setup();
    await store.recordAssessment('a@x.com', { ...base, stage: 'Cyber recovery', percent: 62.4 });
    await store.recordAssessment('a@x.com', base);
    expect((await store.userDetail('a@x.com')).assessments[0]).toMatchObject({ stage: 'Cyber recovery', percent: 62 });
  });
  it('limits the percent to 0-100 and the text to a short length', async () => {
    const { store } = setup();
    await store.recordAssessment('a@x.com', { ...base, percent: 250, stage: 'x'.repeat(500) });
    const a = (await store.userDetail('a@x.com')).assessments[0];
    expect(a.percent).toBe(100);
    expect(a.stage!.length).toBe(80);
  });
  it('refuses a record that could collide with another or is not about an assessment', async () => {
    const { store } = setup();
    for (const bad of [{ ...base, accelerator: 'Bad Name!' }, { ...base, accelerator: '' }, { ...base, assessmentId: '' }, { ...base, assessmentId: 'a#b' }]) {
      await expect(store.recordAssessment('a@x.com', bad)).rejects.toThrow();
    }
    await expect(store.recordAssessment('', base)).rejects.toThrow();
  });
  it('stores the client name but no answers or results: only the fields it knows (owner decision, 10 Nov 2026)', async () => {
    const { store, table } = setup();
    await store.recordAssessment('a@x.com', { ...base, clientName: '  Acme\n Bank  ', answers: { 'EX-01': 'x' }, result: { a: 1 } } as any);
    const item = table.items.get('USER#a@x.com|ASSESSMENT#resilience-iq#RIQ-1')!;
    expect(Object.keys(item).sort()).toEqual(['accelerator', 'assessmentId', 'clientName', 'expiresAt', 'lastSavedAt', 'pk', 'sk', 'startedAt', 'status']);
    expect(item.clientName.S).toBe('Acme Bank');
  });
  it('keeps the client name when a later save (an archive) does not give it, and cuts it to 120 characters', async () => {
    const { store } = setup();
    await store.recordAssessment('a@x.com', { ...base, clientName: 'Acme Bank' });
    await store.recordAssessment('a@x.com', { ...base, status: 'archived' });
    expect((await store.userDetail('a@x.com')).assessments[0]).toMatchObject({ clientName: 'Acme Bank', status: 'archived' });
    await store.recordAssessment('a@x.com', { ...base, clientName: 'x'.repeat(300) });
    expect((await store.listAssessments())[0].clientName).toHaveLength(120);
  });
});

describe('listing', () => {
  it('lists each person once with their sign-ins and assessment counts', async () => {
    const { store, tick } = setup();
    await store.recordLogin('b@x.com'); tick(1000);
    await store.recordLogin('a@x.com'); tick(1000);
    await store.recordAssessment('a@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'completed' });
    await store.recordAssessment('a@x.com', { accelerator: 'finops-iq', assessmentId: 'F2', status: 'draft' });
    await store.recordAssessment('a@x.com', { accelerator: 'resilience-iq', assessmentId: 'R1', status: 'archived' });
    await store.recordAssessment('c@x.com', { accelerator: 'sovereign-iq', assessmentId: 'S1', status: 'in_progress' });
    const users = await store.listUsers();
    expect(users.map(u => u.email)).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(users[0]).toMatchObject({ loginCount: 1, assessments: { total: 3, completed: 1, inProgress: 1, archived: 1 } });
    expect(users[1]).toMatchObject({ loginCount: 1, assessments: { total: 0 }, lastAssessmentAt: null });
    expect(users[2]).toMatchObject({ loginCount: 0, firstLoginAt: null, assessments: { total: 1, inProgress: 1 } });
  });
  it('one person\'s detail shows only that person', async () => {
    const { store } = setup();
    await store.recordLogin('a@x.com'); await store.recordLogin('b@x.com');
    await store.recordAssessment('b@x.com', { accelerator: 'finops-iq', assessmentId: 'F1', status: 'draft' });
    const a = await store.userDetail('a@x.com');
    expect(a.assessments).toEqual([]);
    expect(a.loginCount).toBe(1);
  });
  it('shows at most the 50 most recent sign-ins, newest first', async () => {
    const { store, tick } = setup();
    for (let i = 0; i < 60; i++) { await store.recordLogin('a@x.com'); tick(1000); }
    const d = await store.userDetail('a@x.com');
    expect(d.logins).toHaveLength(50);
    expect([...d.logins].sort().reverse()).toEqual(d.logins);
    expect(d.loginCount).toBe(60);
  });
});

describe('CSV export', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv(['a', 'b'], [{ a: 'x,y', b: 'say "hi"\nthere' }])).toBe('a,b\r\n"x,y","say ""hi""\nthere"\r\n');
  });
  it('stops a spreadsheet running a cell as a formula', () => {
    const csv = toCsv(['a'], [{ a: '=HYPERLINK("http://x")' }, { a: '+1' }, { a: '-1' }, { a: '@SUM(A1)' }, { a: 'plain' }, { a: null }]);
    const lines = csv.split('\r\n').slice(1, -1); // without the header and the empty piece after the last line break
    expect(lines.slice(0, 4).every(l => l.startsWith("'") || l.startsWith('"\''))).toBe(true);
    expect(lines[4]).toBe('plain');
    expect(lines[5]).toBe('');
  });
  it('has a header row of the columns given', () => {
    expect(toCsv(USER_COLUMNS, []).split('\r\n')[0]).toBe(USER_COLUMNS.join(','));
  });
});

describe('failure', () => {
  it('a failing table rejects, so the callers decide to log it (they never let it stop a sign-in or a save)', async () => {
    const { store, table } = setup();
    table.fail = true;
    await expect(store.recordLogin('a@x.com')).rejects.toThrow('dynamodb down');
  });
});

describe('backfill of assessments saved before the log existed', () => {
  const old = { accelerator: 'finops-iq', assessmentId: 'FIQ-old', status: 'completed', clientName: 'Acme', startedAt: '2026-10-20T08:00:00.000Z', completedAt: '2026-10-21T09:00:00.000Z', lastSavedAt: '2026-10-21T09:00:00.000Z' };
  it('writes the record with its own times, and expires 12 months after its last save', async () => {
    const { store, table } = setup();
    expect(await store.backfillAssessment('A@x.com', old)).toBe(true);
    expect((await store.listAssessments())[0]).toMatchObject({ email: 'a@x.com', clientName: 'Acme', status: 'completed', lastSavedAt: '2026-10-21T09:00:00.000Z', startedAt: '2026-10-20T08:00:00.000Z' });
    expect(Number(table.items.get('USER#a@x.com|ASSESSMENT#finops-iq#FIQ-old')!.expiresAt.N)).toBe(Date.parse(old.lastSavedAt) / 1000 + YEAR);
  });
  it('never overwrites a record a live save has written, and can be run again', async () => {
    const { store } = setup();
    await store.recordAssessment('a@x.com', { ...old, status: 'in_progress', clientName: 'Acme (live)' });
    expect(await store.backfillAssessment('a@x.com', old)).toBe(false);
    expect((await store.listAssessments())[0]).toMatchObject({ status: 'in_progress', clientName: 'Acme (live)' });
  });
});
