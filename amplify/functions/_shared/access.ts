/**
 * Accelerator access on the server (24 Oct 2026). The page guard (Accelerators/assets/rbac-guard.js) only hides a
 * tool; this check refuses the request. A caller may use an accelerator when they are an administrator (Cognito
 * Admin group or a bootstrap address in SUPER_ADMIN_EMAILS) or their saved permissions grant it under the same rule
 * as the page guard: the accelerator's take or full flag, or the accelerator (or '*') in their take or view list.
 * Posture IQ's permission opens the merged Sovereign IQ (PLAN S5). Permissions live in the reports bucket (config/rbac-permissions.json), written by the Access Control screen.
 *
 * A request with no verified identity (a route without the Cognito authorizer, such as the old Accelerators API
 * routes) is refused, and so is any request when the permissions cannot be read: the check fails closed.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { corsHeaders } from './http';

export interface Permissions {
  accelerators?: Record<string, { take?: boolean; full?: boolean } | undefined>;
  take?: string[];
  view?: string[];
}

/** Returns the caller's saved permissions, or null when they have none. Throws when they cannot be read. */
export type PermissionSource = (email: string) => Promise<Permissions | null>;

/** A retired accelerator's permission opens its replacement (FinOps Value Case → FinOps IQ, 22 Oct 2026). */
const ALIASES: Record<string, string[]> = { 'finops-iq': ['finops-value-case'], 'sovereign-iq': ['posture-iq'] };
const CACHE_MS = 60_000;
const KEY = 'config/rbac-permissions.json';

let cache: { at: number; users: Record<string, { permissions?: Permissions }> } | null = null;
let s3: S3Client | null = null;

const s3Source: PermissionSource = async email => {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const bucket = process.env.REPORTS_BUCKET;
    if (!bucket) throw new Error('REPORTS_BUCKET is not set');
    s3 ??= new S3Client({});
    try {
      const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: KEY }));
      cache = { at: Date.now(), users: JSON.parse(await resp.Body!.transformToString()).users || {} };
    } catch (err: any) {
      // No file yet means nobody has saved permissions; anything else is an outage.
      if (err?.name !== 'NoSuchKey') throw err;
      cache = { at: Date.now(), users: {} };
    }
  }
  return cache.users[email]?.permissions ?? null;
};

let source: PermissionSource = s3Source;
/** Tests and the local dev server supply their own permissions. */
export function setPermissionSource(fn: PermissionSource | null) { source = fn ?? s3Source; cache = null; }

/** The page guard's rule, plus the '*' wildcard the Access Control screen may write. */
export function grants(p: Permissions | null, tool: string): boolean {
  if (!p) return false;
  return [tool, ...(ALIASES[tool] ?? [])].some(id => {
    const acc = p.accelerators?.[id];
    return !!(acc && (acc.take || acc.full)) ||
      [p.take, p.view].some(list => Array.isArray(list) && (list.includes(id) || list.includes('*')));
  });
}

/** Claims from the route's JWT authorizer; HTTP APIs pass a group list as "[Admin Consultant]". */
export function caller(event: APIGatewayProxyEventV2): { email: string; admin: boolean } | null {
  const c = (event as APIGatewayProxyEventV2WithJWTAuthorizer).requestContext?.authorizer?.jwt?.claims;
  const email = String(c?.email || '').trim().toLowerCase();
  if (!email) return null;
  const raw = c?.['cognito:groups'];
  const groups = Array.isArray(raw) ? raw.map(String) : String(raw || '').replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
  const supers = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e && e !== 'none');
  return { email, admin: groups.includes(process.env.ADMIN_GROUP || 'Admin') || supers.includes(email) };
}

export function withAcceleratorAccess(tool: string, inner: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if ((event.requestContext?.http?.method || '') === 'OPTIONS') return inner(event);
    const deny = (statusCode: number, error: string, message: string): APIGatewayProxyResultV2 => ({
      statusCode, headers: corsHeaders(event, 'OPTIONS,GET,POST'), body: JSON.stringify({ ok: false, error, message })
    });
    const who = caller(event);
    if (!who) return deny(401, 'authentication_required', 'Sign in to use this accelerator.');
    if (!who.admin) {
      let perms: Permissions | null;
      try { perms = await source(who.email); }
      catch (err: any) {
        console.error(`[access] permissions unavailable for ${tool}:`, err?.message);
        return deny(503, 'access_check_unavailable', 'Access could not be checked. Please try again.');
      }
      if (!grants(perms, tool)) {
        console.warn(`[access] ${who.email} denied ${tool}`);
        return deny(403, 'accelerator_access_denied', 'Your account does not have access to this accelerator. Contact your administrator.');
      }
    }
    return inner(event);
  };
}
