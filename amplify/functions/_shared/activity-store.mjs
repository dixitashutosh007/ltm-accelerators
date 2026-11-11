/**
 * User activity (platform workstream P2): who signed in and when, and which assessments each person has taken, with
 * their client, status and times. No answers or results are stored here. The client's name is kept so administrators can
 * follow every engagement from one screen (owner decision, 10 Nov 2026; it reverses the earlier "no client names" choice
 * and is covered by the staff notice). Every item
 * expires 12 months after it was last written (decision S4); DynamoDB removes expired items within about two days.
 *
 * One table, keyed by user:
 *   pk USER#<email>   sk SUMMARY                          first login, last login, login count
 *   pk USER#<email>   sk LOGIN#<iso time>                 one per sign-in
 *   pk USER#<email>   sk ASSESSMENT#<accelerator>#<id>    accelerator, status, stage, times
 *
 * Recording is best effort: a failure is logged and never stops a sign-in or a save.
 */
import { UpdateItemCommand, PutItemCommand, DeleteItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

export const RETENTION_DAYS = 365;
const MAX_LOGINS_SHOWN = 50;
const ACCELERATOR = /^[a-z0-9-]{2,40}$/;

const S = v => ({ S: String(v) });
const N = v => ({ N: String(v) });
const normalizeEmail = v => String(v ?? '').trim().toLowerCase();
/** A client's name as shown: one line, at most 120 characters. */
const cleanName = v => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

/** A plain object from a DynamoDB item of strings and numbers. */
function plain(item) {
  const out = {};
  for (const [k, v] of Object.entries(item ?? {})) out[k] = v.S !== undefined ? v.S : v.N !== undefined ? Number(v.N) : null;
  return out;
}

/** Spreadsheet programs run a cell that starts with one of these as a formula; a leading quote stops that. */
const csvCell = v => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (columns, rows) => [columns.join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';

/** deps: { table, ddb: { send(command) }, now?: () => number (milliseconds) } */
export function createActivityStore(deps) {
  const now = deps.now ?? (() => Date.now());
  const expiry = () => Math.floor(now() / 1000) + RETENTION_DAYS * 86400;
  const iso = () => new Date(now()).toISOString();
  const send = cmd => deps.ddb.send(cmd);

  async function scanAll(input) {
    const items = [];
    let key;
    do {
      const page = await send(new ScanCommand({ TableName: deps.table, ExclusiveStartKey: key, ...input }));
      items.push(...(page.Items ?? []).map(plain));
      key = page.LastEvaluatedKey;
    } while (key && items.length < 20000);
    return items;
  }

  return {
    /** One sign-in: bumps the summary and adds a login item. */
    async recordLogin(email) {
      const addr = normalizeEmail(email);
      if (!addr) return;
      const at = iso();
      await send(new UpdateItemCommand({
        TableName: deps.table,
        Key: { pk: S(`USER#${addr}`), sk: S('SUMMARY') },
        UpdateExpression: 'SET email = :e, lastLoginAt = :t, expiresAt = :x, firstLoginAt = if_not_exists(firstLoginAt, :t) ADD loginCount :one',
        ExpressionAttributeValues: { ':e': S(addr), ':t': S(at), ':x': N(expiry()), ':one': N(1) }
      }));
      await send(new PutItemCommand({
        TableName: deps.table,
        Item: { pk: S(`USER#${addr}`), sk: S(`LOGIN#${at}`), at: S(at), expiresAt: N(expiry()) }
      }));
    },

    /**
     * An assessment saved, completed or archived. `a` = { accelerator, assessmentId, status, clientName?, stage?, percent?, startedAt?, completedAt? }.
     * Writes only these fields; client, stage and percent are kept when a later save does not give them.
     */
    async recordAssessment(email, a) {
      const addr = normalizeEmail(email);
      const accelerator = String(a?.accelerator ?? '');
      const id = String(a?.assessmentId ?? '').slice(0, 120);
      if (!addr || !ACCELERATOR.test(accelerator) || !id || id.includes('#')) throw new Error('activity: an assessment needs an owner, an accelerator and an id');
      const names = ['accelerator = :a', 'assessmentId = :i', '#st = :s', 'lastSavedAt = :t', 'expiresAt = :x', 'startedAt = if_not_exists(startedAt, :b)'];
      const values = { ':a': S(accelerator), ':i': S(id), ':s': S(String(a.status ?? 'unknown').slice(0, 30)), ':t': S(iso()), ':x': N(expiry()), ':b': S(String(a.startedAt ?? iso()).slice(0, 40)) };
      const client = cleanName(a.clientName);
      if (client) { names.push('clientName = :n'); values[':n'] = S(client); }
      if (a.stage) { names.push('stage = :g'); values[':g'] = S(String(a.stage).slice(0, 80)); }
      if (Number.isFinite(a.percent)) { names.push('percent = :p'); values[':p'] = N(Math.max(0, Math.min(100, Math.round(a.percent)))); }
      if (a.completedAt) { names.push('completedAt = :c'); values[':c'] = S(String(a.completedAt).slice(0, 40)); }
      await send(new UpdateItemCommand({
        TableName: deps.table,
        Key: { pk: S(`USER#${addr}`), sk: S(`ASSESSMENT#${accelerator}#${id}`) },
        UpdateExpression: `SET ${names.join(', ')}`,
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: values
      }));
    },

    /**
     * One assessment saved before this log existed (scripts/backfill-activity.mjs). Written with its own times and only
     * when there is no record yet, so a live save is never overwritten; it expires 12 months after its last save.
     */
    async backfillAssessment(email, a) {
      const addr = normalizeEmail(email);
      const accelerator = String(a?.accelerator ?? '');
      const id = String(a?.assessmentId ?? '').slice(0, 120);
      if (!addr || !ACCELERATOR.test(accelerator) || !id || id.includes('#')) throw new Error('activity: an assessment needs an owner, an accelerator and an id');
      const saved = Date.parse(a.lastSavedAt) || now();
      const item = { pk: S(`USER#${addr}`), sk: S(`ASSESSMENT#${accelerator}#${id}`), accelerator: S(accelerator), assessmentId: S(id),
        status: S(String(a.status ?? 'unknown').slice(0, 30)), startedAt: S(String(a.startedAt ?? a.lastSavedAt ?? iso()).slice(0, 40)),
        lastSavedAt: S(new Date(saved).toISOString()), expiresAt: N(Math.floor(saved / 1000) + RETENTION_DAYS * 86400) };
      const client = cleanName(a.clientName);
      if (client) item.clientName = S(client);
      if (a.completedAt) item.completedAt = S(String(a.completedAt).slice(0, 40));
      try {
        await send(new PutItemCommand({ TableName: deps.table, Item: item, ConditionExpression: 'attribute_not_exists(pk)' }));
        return true;
      } catch (err) {
        if (err?.name === 'ConditionalCheckFailedException') return false;
        throw err;
      }
    },

    /** A deleted assessment leaves no trace here: its activity record goes with it. */
    async removeAssessment(email, accelerator, assessmentId) {
      const addr = normalizeEmail(email);
      if (!addr || !ACCELERATOR.test(String(accelerator)) || !assessmentId) return;
      await send(new DeleteItemCommand({ TableName: deps.table, Key: { pk: S(`USER#${addr}`), sk: S(`ASSESSMENT#${accelerator}#${String(assessmentId).slice(0, 120)}`) } }));
    },

    /** Every user with a sign-in or an assessment: summary and assessment counts. Small user base: scans the table. */
    async listUsers() {
      const [summaries, assessments] = await Promise.all([
        scanAll({ FilterExpression: 'sk = :s', ExpressionAttributeValues: { ':s': S('SUMMARY') } }),
        scanAll({ FilterExpression: 'begins_with(sk, :p)', ExpressionAttributeValues: { ':p': S('ASSESSMENT#') } })
      ]);
      const users = new Map();
      const entry = email => {
        if (!users.has(email)) users.set(email, { email, firstLoginAt: null, lastLoginAt: null, loginCount: 0, assessments: { total: 0, completed: 0, inProgress: 0, archived: 0 }, lastAssessmentAt: null });
        return users.get(email);
      };
      for (const s of summaries) Object.assign(entry(s.email), { firstLoginAt: s.firstLoginAt, lastLoginAt: s.lastLoginAt, loginCount: s.loginCount ?? 0 });
      for (const a of assessments) {
        const email = String(a.pk).replace(/^USER#/, '');
        const u = entry(email);
        u.assessments.total++;
        if (a.status === 'completed') u.assessments.completed++;
        else if (a.status === 'archived') u.assessments.archived++;
        else u.assessments.inProgress++;
        if (!u.lastAssessmentAt || a.lastSavedAt > u.lastAssessmentAt) u.lastAssessmentAt = a.lastSavedAt;
      }
      return [...users.values()].sort((x, y) => x.email.localeCompare(y.email));
    },

    /** Every assessment record with its owner, newest save first (for the export). */
    async listAssessments() {
      const items = await scanAll({ FilterExpression: 'begins_with(sk, :p)', ExpressionAttributeValues: { ':p': S('ASSESSMENT#') } });
      return items.map(a => ({ email: String(a.pk).replace(/^USER#/, ''), clientName: a.clientName ?? null, accelerator: a.accelerator, assessmentId: a.assessmentId, status: a.status, stage: a.stage ?? null, percent: a.percent ?? null, startedAt: a.startedAt, lastSavedAt: a.lastSavedAt, completedAt: a.completedAt ?? null }))
        .sort((x, y) => String(y.lastSavedAt).localeCompare(String(x.lastSavedAt)));
    },

    /** One person: their summary, latest sign-ins and every assessment record. */
    async userDetail(email) {
      const addr = normalizeEmail(email);
      const items = [];
      let key;
      do {
        const page = await send(new QueryCommand({
          TableName: deps.table, KeyConditionExpression: 'pk = :p', ExpressionAttributeValues: { ':p': S(`USER#${addr}`) }, ExclusiveStartKey: key
        }));
        items.push(...(page.Items ?? []).map(plain));
        key = page.LastEvaluatedKey;
      } while (key && items.length < 5000);
      const summary = items.find(i => i.sk === 'SUMMARY') ?? null;
      return {
        email: addr,
        firstLoginAt: summary?.firstLoginAt ?? null, lastLoginAt: summary?.lastLoginAt ?? null, loginCount: summary?.loginCount ?? 0,
        logins: items.filter(i => i.sk.startsWith('LOGIN#')).map(i => i.at).sort().reverse().slice(0, MAX_LOGINS_SHOWN),
        assessments: items.filter(i => i.sk.startsWith('ASSESSMENT#')).map(({ accelerator, assessmentId, clientName, status, stage, percent, startedAt, lastSavedAt, completedAt }) =>
          ({ accelerator, assessmentId, clientName: clientName ?? null, status, stage: stage ?? null, percent: percent ?? null, startedAt, lastSavedAt, completedAt: completedAt ?? null }))
          .sort((x, y) => String(y.lastSavedAt).localeCompare(String(x.lastSavedAt)))
      };
    }
  };
}

export const USER_COLUMNS = ['email', 'status', 'role', 'createdAt', 'firstLoginAt', 'lastLoginAt', 'loginCount', 'assessments', 'completed', 'inProgress', 'lastAssessmentAt'];
export const ASSESSMENT_COLUMNS = ['clientName', 'email', 'accelerator', 'assessmentId', 'status', 'stage', 'percent', 'startedAt', 'lastSavedAt', 'completedAt'];
