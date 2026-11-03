/**
 * Where the domain rules live and how they are read and changed (platform workstream P1): config/domain-rules.json in
 * the reports bucket, beside the permissions file. Every change is written with the version it was based on, so two
 * administrators cannot overwrite each other, and leaves an audit entry under config/domain-rules-audit/.
 *
 * Reading fails closed: if the rules cannot be read and no copy read in the last STALE_MS is held, every address
 * except a protected one is refused. A protected address is allowed without reading the rules at all.
 */
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { applyChange, decide, emptyRules, DomainRuleError, normalizeEmail } from './domain-access.mjs';

export const RULES_KEY = 'config/domain-rules.json';
export const AUDIT_PREFIX = 'config/domain-rules-audit/';
/** How long a copy already read may stand in when the bucket cannot be reached. */
export const STALE_MS = 15 * 60 * 1000;
/** A copy this fresh is used without asking the bucket again. */
export const FRESH_MS = 30 * 1000;

const isMissing = err => err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404;
const isConflict = err => err?.name === 'PreconditionFailed' || err?.name === 'ConditionalRequestConflict' || err?.$metadata?.httpStatusCode === 412 || err?.$metadata?.httpStatusCode === 409;

/** deps: { bucket, cfg, s3?, now?, id? }. The cache belongs to the store, so tests and Lambdas each have their own. */
export function createDomainRulesStore(deps) {
  const s3 = deps.s3 ?? new S3Client({});
  const now = deps.now ?? (() => Date.now());
  const newId = deps.id ?? (() => randomUUID());
  let cache = null; // { at, doc, etag }

  async function read({ force = false } = {}) {
    if (!force && cache && now() - cache.at < FRESH_MS) return { ...cache, source: 'cache' };
    try {
      const resp = await s3.send(new GetObjectCommand({ Bucket: deps.bucket, Key: RULES_KEY }));
      cache = { at: now(), doc: JSON.parse(await resp.Body.transformToString()), etag: resp.ETag };
      return { ...cache, source: 'live' };
    } catch (err) {
      if (isMissing(err)) { cache = { at: now(), doc: emptyRules(), etag: null }; return { ...cache, source: 'live' }; }
      if (cache && now() - cache.at < STALE_MS) return { ...cache, source: 'stale' };
      throw new DomainRuleError('rules_unavailable', 'The domain rules could not be read.');
    }
  }

  return {
    read,
    /** The decision for one address. A protected address never depends on the rules; an unreadable list refuses the rest. */
    async check(email) {
      const addr = normalizeEmail(email);
      const first = decide(addr, null, deps.cfg);
      if (first.allowed && first.reason.startsWith('protected_')) return first;
      try {
        const { doc } = await read();
        return decide(addr, doc, deps.cfg);
      } catch (err) {
        if (err instanceof DomainRuleError) return { allowed: false, reason: 'rules_unavailable' };
        throw err;
      }
    },
    /** Applies a change on top of the current rules; a concurrent change makes it fail with code "conflict" (retry). */
    async change(change, by) {
      const { doc, etag } = await read({ force: true });
      const at = new Date(now()).toISOString();
      const { doc: next, record } = applyChange(doc, change, deps.cfg, { by, now: at, id: newId });
      try {
        await s3.send(new PutObjectCommand({
          Bucket: deps.bucket, Key: RULES_KEY, Body: Buffer.from(JSON.stringify(next, null, 2)), ContentType: 'application/json',
          ...(etag ? { IfMatch: etag } : { IfNoneMatch: '*' })
        }));
      } catch (err) {
        if (isConflict(err)) throw new DomainRuleError('conflict', 'The rules changed while you were editing. Reload and try again.');
        throw err;
      }
      cache = null;
      // The audit entry is written after the change; if it fails the change stands and the failure is logged.
      try {
        await s3.send(new PutObjectCommand({
          Bucket: deps.bucket, Key: `${AUDIT_PREFIX}${at.replace(/[:.]/g, '-')}-${newId()}.json`,
          Body: Buffer.from(JSON.stringify(record)), ContentType: 'application/json'
        }));
      } catch (err) {
        console.error('[domain-rules] audit entry not written', { by, op: record.op, value: record.rule.value, error: err?.message });
      }
      return { doc: next, record };
    },
    /** The most recent audit entries, newest first. */
    async audit(limit = 50) {
      const keys = [];
      let token;
      do {
        const page = await s3.send(new ListObjectsV2Command({ Bucket: deps.bucket, Prefix: AUDIT_PREFIX, ContinuationToken: token }));
        for (const o of page.Contents ?? []) keys.push(o.Key);
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token && keys.length < 1000);
      keys.sort().reverse();
      const out = [];
      for (const Key of keys.slice(0, limit)) {
        try { out.push(JSON.parse(await (await s3.send(new GetObjectCommand({ Bucket: deps.bucket, Key }))).Body.transformToString())); } catch { /* an unreadable entry is skipped */ }
      }
      return out;
    }
  };
}
