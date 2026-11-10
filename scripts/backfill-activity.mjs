#!/usr/bin/env node
/**
 * One-off backfill of the user activity log (platform workstream P2) from the assessments saved before it existed, so
 * the administrators' "All assessments" view covers every assessment. Reads each tool's assessment table and writes one
 * activity record per assessment with its client, owner, status and times. A record that already exists (a save since
 * the log went live) is never overwritten. Safe to run more than once.
 *
 *   node scripts/backfill-activity.mjs --api <AppSync API id> --activity-table <UserActivity table> [--user-pool <id>] [--region ap-south-1] [--write]
 *
 * Without --write it only reports what it would write. The API id is the middle part of the data tables' names
 * (CostIqAssessment-<id>-NONE). --user-pool lets a record that names its owner only by Cognito ID be matched to an address.
 */
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createActivityStore } from '../amplify/functions/_shared/activity-store.mjs';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const api = arg('api'), table = arg('activity-table'), pool = arg('user-pool'), region = arg('region') || 'ap-south-1', write = process.argv.includes('--write');
if (!api || !table) { console.error('Usage: node scripts/backfill-activity.mjs --api <id> --activity-table <name> [--region r] [--write]'); process.exit(2); }

/** Top-level strings, numbers and booleans of a DynamoDB item; nested values are not needed here. */
const unmarshall = item => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v.S ?? (v.N !== undefined ? Number(v.N) : v.BOOL ?? null)]));
/** A Cost IQ record saved before respondentEmail existed names its owner as "<sub>::<username>" or by the sub alone. */
const subs = new Map();
async function ownerEmail(owner) {
  const parts = String(owner || '').split('::');
  if (parts.at(-1).includes('@')) return parts.at(-1);
  if (!pool || !parts[0]) return null;
  if (!subs.has(parts[0])) {
    const res = await new CognitoIdentityProviderClient({ region }).send(new ListUsersCommand({ UserPoolId: pool, Filter: `sub = "${parts[0].replace(/"/g, '')}"`, Limit: 1 }));
    subs.set(parts[0], res.Users?.[0]?.Attributes?.find(a => a.Name === 'email')?.Value?.toLowerCase() ?? null);
  }
  return subs.get(parts[0]);
}
/** Saved sessions carry their client in the title, "Cloud IQ · <client>". */
const clientOfTitle = t => { const c = String(t || '').split(' · ').slice(1).join(' · ').trim(); return c && c !== 'assessment' ? c : null; };

export const SOURCES = [
  { model: 'FinOpsIqAssessment', map: r => ({ email: r.respondentEmail, accelerator: 'finops-iq', assessmentId: r.assessmentId, clientName: r.clientName }) },
  { model: 'SovereignIqAssessment', map: r => ({ email: r.respondentEmail, accelerator: 'sovereign-iq', assessmentId: r.assessmentId, clientName: r.clientName }) },
  { model: 'CostIqAssessment', map: async r => ({ email: r.respondentEmail || await ownerEmail(r.owner), accelerator: 'cost-iq', assessmentId: r.assessmentId, clientName: r.clientName }) },
  { model: 'ResilienceAssessment', map: r => ({ email: r.respondentEmail, accelerator: 'resilience-iq', assessmentId: r.assessmentId, clientName: r.clientName }) },
  { model: 'SavedSession', map: r => ({ email: r.ownerEmail, accelerator: r.accelerator, assessmentId: r.sessionId, clientName: clientOfTitle(r.title), stage: r.stage, percent: r.percent }) }
];

async function scan(ddb, TableName) {
  const out = [];
  let key;
  do {
    const page = await ddb.send(new ScanCommand({ TableName, ExclusiveStartKey: key }));
    out.push(...(page.Items ?? []).map(i => unmarshall(i)));
    key = page.LastEvaluatedKey;
  } while (key);
  return out;
}

const ddb = new DynamoDBClient({ region });
const store = createActivityStore({ table, ddb });
const totals = { written: 0, existing: 0, skipped: 0 };
for (const src of SOURCES) {
  const rows = await scan(ddb, `${src.model}-${api}-NONE`);
  for (const r of rows) {
    const a = { ...(await src.map(r)), status: r.status, startedAt: r.startedAt || r.createdAt, completedAt: r.completedAt || null, lastSavedAt: r.updatedAt || r.createdAt };
    if (!a.email || !a.assessmentId) { totals.skipped++; console.log(`skip ${src.model} ${r.assessmentId ?? r.sessionId ?? '?'}: no owner email`); continue; }
    if (!write) { console.log(`would write ${a.accelerator} ${a.assessmentId} (${a.status}) client=${a.clientName ? 'yes' : 'no'}`); continue; }
    (await store.backfillAssessment(a.email, a)) ? totals.written++ : totals.existing++;
  }
  console.log(`${src.model}: ${rows.length} read`);
}
console.log(write ? `Done: ${totals.written} written, ${totals.existing} already recorded, ${totals.skipped} skipped.` : `Dry run: nothing written (${totals.skipped} would be skipped). Add --write to write.`);
