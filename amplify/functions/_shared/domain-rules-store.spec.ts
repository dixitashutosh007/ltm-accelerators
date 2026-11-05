/**
 * The domain rules store (platform workstream P1): reads that fail closed, writes that cannot overwrite each other,
 * and an audit entry for every change. S3 is replaced by an in-memory bucket that enforces conditional writes.
 */
import { describe, it, expect } from 'vitest';
import { GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createDomainRulesStore, RULES_KEY, AUDIT_PREFIX, FRESH_MS, STALE_MS } from './domain-rules-store.mjs';
import { configFromEnv, DomainRuleError } from './domain-access.mjs';

const cfg = configFromEnv({ SUPER_ADMIN_EMAILS: 'boss@ltm.com', ALLOWED_DOMAINS: 'ey.com' });

class FakeBucket {
  objects = new Map<string, { body: string; etag: string }>();
  seq = 0;
  down = false;
  /** S3 answers AccessDenied, not NoSuchKey, for a missing object when the caller cannot list the bucket. */
  denyMissing = false;
  /** A 404 that is not a missing object: the bucket itself is gone or misnamed. */
  noBucket = false;
  failAudit = false;
  sent: string[] = [];
  async send(cmd: any): Promise<any> {
    const name = cmd.constructor.name, i = cmd.input;
    this.sent.push(`${name} ${i.Key ?? i.Prefix}`);
    if (this.down) throw Object.assign(new Error('network'), { name: 'TimeoutError' });
    if (cmd instanceof GetObjectCommand) {
      const o = this.objects.get(i.Key);
      if (this.noBucket) throw Object.assign(new Error('no bucket'), { name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 } });
      if (!o && this.denyMissing) throw Object.assign(new Error('denied'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
      if (!o) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
      return { Body: { transformToString: async () => o.body }, ETag: o.etag };
    }
    if (cmd instanceof PutObjectCommand) {
      if (this.failAudit && String(i.Key).startsWith(AUDIT_PREFIX)) throw new Error('audit write failed');
      const o = this.objects.get(i.Key);
      if (i.IfMatch && (!o || o.etag !== i.IfMatch)) throw Object.assign(new Error('precondition'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      if (i.IfNoneMatch === '*' && o) throw Object.assign(new Error('exists'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      this.objects.set(i.Key, { body: Buffer.from(i.Body).toString(), etag: `"e${++this.seq}"` });
      return {};
    }
    if (cmd instanceof ListObjectsV2Command) return { Contents: [...this.objects.keys()].filter(k => k.startsWith(i.Prefix)).map(Key => ({ Key })), IsTruncated: false };
    throw new Error(`unexpected ${name}`);
  }
}
function setup() {
  const bucket = new FakeBucket();
  let t = Date.UTC(2026, 10, 3, 10);
  let n = 0;
  const make = () => createDomainRulesStore({ bucket: 'b', cfg, s3: bucket, now: () => t, id: () => `id${++n}` });
  return { bucket, store: make(), make, tick: (ms: number) => { t += ms; } };
}
const set = (value: string, action: 'allow' | 'block' = 'allow') => ({ op: 'set' as const, kind: 'domain' as const, value, action });

describe('reading', () => {
  it('an empty bucket means no rules, not an error', async () => {
    const { store } = setup();
    expect(await store.check('a@ey.com')).toMatchObject({ allowed: true, reason: 'baseline_domain' });
    expect(await store.check('a@other.com')).toMatchObject({ allowed: false, reason: 'not_listed' });
  });
  it('uses a fresh copy without asking the bucket again, then asks again after FRESH_MS', async () => {
    const { store, bucket, tick } = setup();
    await store.check('a@x.com'); await store.check('b@x.com');
    expect(bucket.sent.filter(s => s.startsWith('GetObject')).length).toBe(1);
    tick(FRESH_MS + 1);
    await store.check('c@x.com');
    expect(bucket.sent.filter(s => s.startsWith('GetObject')).length).toBe(2);
  });
  it('an unreachable bucket refuses everyone but protected addresses', async () => {
    const { store, bucket } = setup();
    bucket.down = true;
    expect(await store.check('a@ey.com')).toEqual({ allowed: false, reason: 'rules_unavailable' });
    expect(await store.check('boss@ltm.com')).toMatchObject({ allowed: true, reason: 'protected_email' });
    expect(await store.check('anyone@ltm.com')).toMatchObject({ allowed: true, reason: 'protected_domain' });
    expect(bucket.sent.some(s => s.includes(RULES_KEY))).toBe(true);
  });
  it('a protected address is decided without reading the bucket at all', async () => {
    const { store, bucket } = setup();
    await store.check('boss@ltm.com');
    expect(bucket.sent).toEqual([]);
  });
  it('a copy already read stands in for a short outage, then the store fails closed', async () => {
    const { store, bucket, tick } = setup();
    await store.change(set('partner.com'), 'boss@ltm.com');
    expect((await store.check('a@partner.com')).allowed).toBe(true);
    bucket.down = true;
    tick(FRESH_MS + 1);
    expect(await store.check('a@partner.com')).toMatchObject({ allowed: true, reason: 'domain_allowed' }); // stale copy
    tick(STALE_MS);
    expect(await store.check('a@partner.com')).toEqual({ allowed: false, reason: 'rules_unavailable' });
  });
  it('a block takes effect at once after the cache is refreshed, and a stale copy never outlives its limit', async () => {
    const { store, tick } = setup();
    await store.change(set('ey.com', 'block'), 'boss@ltm.com');
    tick(FRESH_MS + 1);
    expect(await store.check('a@ey.com')).toMatchObject({ allowed: false, reason: 'domain_blocked' });
  });
});

describe('changing', () => {
  it('writes the rules and one audit entry that says who changed what and when', async () => {
    const { store, bucket } = setup();
    const { doc, record } = await store.change({ ...set('partner.com'), note: 'Pilot' }, 'Boss@LTM.com');
    expect(doc.rules[0]).toMatchObject({ id: 'id1', value: 'partner.com', action: 'allow', addedBy: 'boss@ltm.com' });
    expect(record).toMatchObject({ op: 'add', by: 'boss@ltm.com' });
    const audit = await store.audit();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ at: '2026-11-03T10:00:00.000Z', by: 'boss@ltm.com', op: 'add', rule: { value: 'partner.com' } });
    expect([...bucket.objects.keys()].filter(k => k.startsWith(AUDIT_PREFIX))).toHaveLength(1);
  });
  it('lists the audit newest first and honours the limit', async () => {
    const { store, tick } = setup();
    for (const d of ['a.com', 'b.com', 'c.com']) { await store.change(set(d), 'boss@ltm.com'); tick(1000); }
    const audit = await store.audit(2);
    expect(audit.map(a => a.rule.value)).toEqual(['c.com', 'b.com']);
  });
  it('refuses a change that would lock someone out, and writes nothing', async () => {
    const { store, bucket } = setup();
    await expect(store.change(set('ltm.com', 'block'), 'boss@ltm.com')).rejects.toMatchObject({ code: 'protected_domain' });
    await expect(store.change(set('ey.com', 'block'), 'me@ey.com')).rejects.toMatchObject({ code: 'would_lock_out_self' });
    expect(bucket.objects.size).toBe(0);
  });
  it('two administrators cannot overwrite each other: the second write fails with "conflict" and nothing is lost', async () => {
    const { bucket, make } = setup();
    const a = make(), b = make();
    await a.change(set('first.com'), 'boss@ltm.com');
    await b.read({ force: true });
    await a.change(set('second.com'), 'boss@ltm.com'); // changes the stored version after b read it
    // b writes on top of the version it read: simulate by making b skip its refresh.
    const raced = createDomainRulesStore({ bucket: 'b', cfg, s3: { send: async (cmd: any) => {
      if (cmd instanceof GetObjectCommand) { const r = await bucket.send(cmd); return { ...r, ETag: '"stale"' }; }
      return bucket.send(cmd);
    } }, now: () => 0, id: () => 'x' });
    await expect(raced.change(set('third.com'), 'boss@ltm.com')).rejects.toMatchObject({ code: 'conflict' });
    const stored = JSON.parse(bucket.objects.get(RULES_KEY)!.body);
    expect(stored.rules.map((r: any) => r.value)).toEqual(['first.com', 'second.com']);
  });
  it('creating the first rules file does not overwrite one made at the same moment', async () => {
    const { bucket, make } = setup();
    const s = make();
    const racing = createDomainRulesStore({ bucket: 'b', cfg, s3: { send: async (cmd: any) => {
      if (cmd instanceof GetObjectCommand) { const err: any = new Error('missing'); err.name = 'NoSuchKey'; bucket.objects.set(RULES_KEY, { body: JSON.stringify({ version: 1, rules: [] }), etag: '"other"' }); throw err; }
      return bucket.send(cmd);
    } }, now: () => 0, id: () => 'x' });
    await expect(racing.change(set('x.com'), 'boss@ltm.com')).rejects.toMatchObject({ code: 'conflict' });
    void s;
  });
  it('a failed audit write does not undo the change', async () => {
    const { store, bucket } = setup();
    bucket.failAudit = true;
    await store.change(set('partner.com'), 'boss@ltm.com');
    expect(JSON.parse(bucket.objects.get(RULES_KEY)!.body).rules).toHaveLength(1);
  });
  it('an unreadable bucket stops a change with "rules_unavailable"', async () => {
    const { store, bucket } = setup();
    bucket.down = true;
    await expect(store.change(set('x.com'), 'boss@ltm.com')).rejects.toBeInstanceOf(DomainRuleError);
  });
  it('removing a rule takes effect', async () => {
    const { store, tick } = setup();
    const { doc } = await store.change(set('ey.com', 'block'), 'boss@ltm.com');
    expect((await store.check('a@ey.com')).allowed).toBe(false);
    await store.change({ op: 'remove', id: doc.rules[0].id }, 'boss@ltm.com');
    tick(FRESH_MS + 1);
    expect((await store.check('a@ey.com')).allowed).toBe(true);
  });
});

describe('a missing rules file (the first deploy)', () => {
  it('a reader that cannot list the bucket gets AccessDenied for a missing file and refuses everyone but the protected addresses', async () => {
    const { store, bucket } = setup();
    bucket.denyMissing = true;
    expect(await store.check('a@ey.com')).toEqual({ allowed: false, reason: 'rules_unavailable' });
    expect(await store.check('boss@ltm.com')).toMatchObject({ allowed: true });
  });
  it('seeding creates the file once, empty, and never overwrites an existing one', async () => {
    const { store, bucket, make } = setup();
    expect(await store.seedIfMissing()).toBe('created');
    expect(JSON.parse(bucket.objects.get(RULES_KEY)!.body)).toEqual({ version: 1, rules: [] });
    await store.change(set('partner.com'), 'boss@ltm.com');
    const before = bucket.objects.get(RULES_KEY)!.body;
    expect(await make().seedIfMissing()).toBe('exists');
    expect(bucket.objects.get(RULES_KEY)!.body).toBe(before);
  });
  it('after seeding, a reader that cannot list the bucket reads the (empty) file and applies the setup lists', async () => {
    const { store, bucket, make } = setup();
    await store.seedIfMissing();
    bucket.denyMissing = true; // the file exists now, so this no longer matters
    const reader = make();
    expect(await reader.check('a@ey.com')).toMatchObject({ allowed: true, reason: 'baseline_domain' });
    expect(await reader.check('a@other.com')).toMatchObject({ allowed: false, reason: 'not_listed' });
  });
  it('two containers seeding at once leave one file: the second finds it', async () => {
    const { bucket, make } = setup();
    const results = await Promise.all([make().seedIfMissing(), make().seedIfMissing()]);
    expect(results.sort()).toEqual(['created', 'exists']);
    expect(bucket.objects.size).toBe(1);
  });
  it('a 404 that is not a missing file (a wrong or deleted bucket) is an outage, not an empty list: blocks are not dropped', async () => {
    const { store, bucket, tick } = setup();
    await store.change(set('ey.com', 'block'), 'boss@ltm.com');
    tick(FRESH_MS + STALE_MS + 1);
    bucket.noBucket = true;
    expect(await store.check('a@ey.com')).toEqual({ allowed: false, reason: 'rules_unavailable' });
    expect(await store.check('a@partner.com')).toEqual({ allowed: false, reason: 'rules_unavailable' });
    await expect(store.seedIfMissing()).rejects.toThrow();
  });
});
