/**
 * Records user activity from the services (platform workstream P2). Best effort: the table being unreachable, or not
 * configured (local development, tests), never stops a sign-in or a save. See activity-store.mjs for what is stored.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createActivityStore } from './activity-store.mjs';

let store = null;
let override = null;
/** Tests supply their own store; null restores the table named in ACTIVITY_TABLE. */
export function setActivityStore(s) { override = s; }
const current = () => override ?? (process.env.ACTIVITY_TABLE ? (store ??= createActivityStore({ table: process.env.ACTIVITY_TABLE, ddb: new DynamoDBClient({}) })) : null);

async function attempt(what, fn) {
  try { const s = current(); if (s) await fn(s); }
  catch (err) { console.error(`[activity] ${what} not recorded`, { error: err?.message }); }
}

export const recordLogin = email => attempt('sign-in', s => s.recordLogin(email));
export const recordAssessment = (email, activity) => attempt(`assessment ${activity?.assessmentId}`, s => s.recordAssessment(email, activity));
export const removeAssessmentActivity = (email, accelerator, assessmentId) => attempt(`removal of ${assessmentId}`, s => s.removeAssessment(email, accelerator, assessmentId));
