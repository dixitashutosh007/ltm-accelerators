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
import { configFromEnv } from './domain-access.mjs';
import { createDomainRulesStore, type DomainRulesStore } from './domain-rules-store.mjs';

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

/**
 * The domain rules (platform workstream P1), checked on every request: Cognito does not run its sign-in trigger on a
 * token refresh, so a blocked or removed address must also be refused here. Protected addresses always pass, and an
 * unreadable rule list refuses everyone else (fail closed).
 */
let domains: Pick<DomainRulesStore, 'check'> | null = null;
export function setDomainStore(store: Pick<DomainRulesStore, 'check'> | null) { domains = store; }
const domainStore = () => (domains ??= createDomainRulesStore({ bucket: process.env.REPORTS_BUCKET || '', cfg: configFromEnv(process.env) }));

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

/**
 * Whether the caller is an LTM consultant: in the Cognito Admin or Consultant group, or a bootstrap super admin. Consultant-only
 * material (a report's consultant edition, its statement-of-work draft and internal notes) is served on this alone (Cost IQ M8).
 */
export function isConsultant(event: APIGatewayProxyEventV2): boolean {
  const who = caller(event);
  if (!who) return false;
  if (who.admin) return true;
  const c = (event as APIGatewayProxyEventV2WithJWTAuthorizer).requestContext?.authorizer?.jwt?.claims;
  const raw = c?.['cognito:groups'];
  const groups = Array.isArray(raw) ? raw.map(String) : String(raw || '').replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
  return groups.includes(process.env.CONSULTANT_GROUP || 'Consultant');
}

/**
 * Whether the caller may use another accelerator as well, for a service that reads one accelerator's saved data on behalf of
 * another (Cost IQ importing a FinOps IQ result). Permission only: the domain rules were already checked for this request by
 * withAcceleratorAccess. Fails closed: an unreadable permission list means no.
 */
export async function holdsPermission(event: APIGatewayProxyEventV2, tool: string): Promise<boolean> {
  const who = caller(event);
  if (!who) return false;
  if (who.admin) return true;
  try { return grants(await source(who.email), tool); }
  catch (err: any) { console.error(`[access] permissions unavailable for ${tool}:`, err?.message); return false; }
}

export function withAcceleratorAccess(tool: string, inner: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if ((event.requestContext?.http?.method || '') === 'OPTIONS') return inner(event);
    const deny = (statusCode: number, error: string, message: string): APIGatewayProxyResultV2 => ({
      statusCode, headers: corsHeaders(event, 'OPTIONS,GET,POST'), body: JSON.stringify({ ok: false, error, message })
    });
    const who = caller(event);
    if (!who) return deny(401, 'authentication_required', 'Sign in to use this accelerator.');
    const domain = await domainStore().check(who.email);
    if (!domain.allowed) {
      if (domain.reason === 'rules_unavailable') {
        console.error(`[access] domain rules unavailable for ${tool}`);
        return deny(503, 'access_check_unavailable', 'Access could not be checked. Please try again.');
      }
      console.warn(`[access] ${who.email} refused (${domain.reason})`);
      return deny(403, 'account_blocked', 'Access for this account has been withdrawn. Contact your administrator.');
    }
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
