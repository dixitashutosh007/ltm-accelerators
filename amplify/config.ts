/**
 * Platform configuration, resolved at deploy time.
 *
 * Every value can be overridden with an environment variable in the Amplify console
 * (App settings → Environment variables), so deployments never need code changes.
 * This is the only place in the backend where these values are defined.
 */
const env = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const list = (value: string): string[] =>
  value.split(',').map(v => v.trim()).filter(Boolean);

export const REGION = env('LTM_REGION', 'ap-south-1');

/* The Cognito user pool and app client are the ones this backend defines (amplify/auth/resource.ts); backend.ts
 * passes their IDs to the API authorizers, the reports service and the page. Until 23 Oct 2026 the portal used a
 * pool owned by a developer sandbox stack (ap-south-1_91amN2bz4). */

/**
 * Browser origins allowed to call the API (the Amplify app d199dq940iqyj2 by default).
 * `https://*.domain` entries (branch previews) are honoured by the Lambdas' own CORS checks only:
 * API Gateway HTTP APIs accept exact origins or "*", so wildcard entries are not sent to it.
 */
export const ALLOWED_ORIGINS = list(env(
  'LTM_ALLOWED_ORIGINS',
  'https://main.d199dq940iqyj2.amplifyapp.com,https://*.d199dq940iqyj2.amplifyapp.com'
));

/** Exact origins only, for API Gateway's CORS configuration. */
export const API_GATEWAY_CORS_ORIGINS = ALLOWED_ORIGINS.filter(origin => !origin.includes('*'));

/** Members of this Cognito group are platform administrators. */
export const ADMIN_GROUP = env('LTM_ADMIN_GROUP', 'Admin');

/**
 * Bootstrap administrators by email, for use until the Cognito `Admin` group is populated.
 * Set LTM_SUPER_ADMIN_EMAILS to LTM corporate addresses; set it to "none" to rely on the group only.
 */
export const SUPER_ADMIN_EMAILS = env('LTM_SUPER_ADMIN_EMAILS', 'dixitashutosh007@gmail.com,ashutosh.dixit@ltm.com');

/** Existing S3 bucket holding archived reports and the RBAC permissions file. */
export const REPORTS_BUCKET = env('LTM_REPORTS_BUCKET', 'ltm-advisory-reports-223833501993');

/** Public URL of the portal (used in links sent to users). */
export const APP_BASE_URL = env('LTM_APP_BASE_URL', 'https://main.d199dq940iqyj2.amplifyapp.com');

/**
 * The pre-Phase-1 scoring routes (no authorizer) for Posture, Sovereign, Cloud, Strategy and Modernization IQ.
 * Off since 24 Oct 2026: every page calls the Advisory API. Set LTM_KEEP_LEGACY_API=true only to restore them.
 * Cost IQ and Resilience IQ keep their routes on the Accelerators API.
 */
export const KEEP_LEGACY_API = env('LTM_KEEP_LEGACY_API', 'false').toLowerCase() === 'true';

/** Steady-state request rate per second and burst for the API stage. */
export const API_RATE_LIMIT = Number(env('LTM_API_RATE_LIMIT', '25'));
export const API_BURST_LIMIT = Number(env('LTM_API_BURST_LIMIT', '50'));

/**
 * Who may have an account (comma-separated; ltm.com is always allowed). Domains match exactly: ey.com admits
 * name@ey.com, not name@in.ey.com. Owner decision, 23 Oct 2026: LTM and EY addresses, plus the owner's personal
 * address as a named exception. Accounts are created by an administrator only (backend.ts).
 */
export const SIGNUP_ALLOWED_EMAILS = env('LTM_SIGNUP_ALLOWED_EMAILS', 'dixitashutosh007@gmail.com');
export const SIGNUP_ALLOWED_DOMAINS = env('LTM_SIGNUP_ALLOWED_DOMAINS', 'ltm.com,ey.com');
export const ACCESS_CONTACT_EMAIL = env('LTM_ACCESS_CONTACT_EMAIL', 'ashutosh.dixit@ltm.com');
