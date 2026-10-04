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

/** Cognito user pool and app client the portal signs users in with. */
export const USER_POOL_ID = env('LTM_USER_POOL_ID', 'ap-south-1_91amN2bz4');
export const USER_POOL_CLIENT_ID = env('LTM_USER_POOL_CLIENT_ID', '4iiqcsgvsm0b4ngpps94ho4c67');
export const COGNITO_ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

/** Browser origins allowed to call the API. `https://*.domain` covers Amplify branch previews. */
export const ALLOWED_ORIGINS = list(env(
  'LTM_ALLOWED_ORIGINS',
  'https://main.d1xnevzszm0ehs.amplifyapp.com,https://*.d1xnevzszm0ehs.amplifyapp.com'
));

/** Members of this Cognito group are platform administrators. */
export const ADMIN_GROUP = env('LTM_ADMIN_GROUP', 'Admin');

/**
 * Bootstrap administrators by email, for use until the Cognito `Admin` group is populated.
 * Set LTM_SUPER_ADMIN_EMAILS to LTM corporate addresses; set it to "none" to rely on the group only.
 */
export const SUPER_ADMIN_EMAILS = env('LTM_SUPER_ADMIN_EMAILS', 'dixitashutosh007@gmail.com');

/** Existing S3 bucket holding archived reports and the RBAC permissions file. */
export const REPORTS_BUCKET = env('LTM_REPORTS_BUCKET', 'ltm-advisory-reports-223833501993');

/** Public URL of the portal (used in links sent to users). */
export const APP_BASE_URL = env('LTM_APP_BASE_URL', 'https://main.d1xnevzszm0ehs.amplifyapp.com');

/**
 * Keep the pre-Phase-1 API (no authorizer) deployed during cutover.
 * Set LTM_KEEP_LEGACY_API=false once the new API is verified, then redeploy to remove it.
 */
export const KEEP_LEGACY_API = env('LTM_KEEP_LEGACY_API', 'true').toLowerCase() !== 'false';

/** Steady-state request rate per second and burst for the API stage. */
export const API_RATE_LIMIT = Number(env('LTM_API_RATE_LIMIT', '25'));
export const API_BURST_LIMIT = Number(env('LTM_API_BURST_LIMIT', '50'));
