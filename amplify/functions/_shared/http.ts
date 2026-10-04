/**
 * Response headers shared by the evaluate Lambdas.
 *
 * Browsers reach these functions through the Advisory API, where API Gateway enforces CORS
 * and Cognito authentication. These headers keep CORS correct when a function is invoked
 * through any other integration: the request origin is echoed back only if it is allowed.
 * ALLOWED_ORIGINS is set on every function by amplify/backend.ts.
 */
type HeaderBag = Record<string, string | undefined> | undefined;

const allowedOrigins = (): string[] =>
  (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

export function originAllowed(origin: string, allowed: string[] = allowedOrigins()): boolean {
  if (!origin) return false;
  return allowed.some(entry => {
    if (entry === origin) return true;
    if (entry.startsWith('https://*.')) {
      const suffix = entry.slice('https://*'.length); // ".domain"
      return origin.startsWith('https://') && origin.endsWith(suffix);
    }
    return false;
  });
}

export function corsHeaders(
  event?: { headers?: HeaderBag },
  methods = 'OPTIONS,POST',
  extraAllowHeaders = ''
): Record<string, string> {
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization' + (extraAllowHeaders ? ',' + extraAllowHeaders : ''),
    'Access-Control-Allow-Methods': methods,
    'Vary': 'Origin'
  };
  if (originAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
