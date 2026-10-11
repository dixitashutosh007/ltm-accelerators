import type { PreSignUpTriggerHandler } from 'aws-lambda';

// Corporate domain allowed by default. Individual addresses and extra domains come from the
// ALLOWED_EMAILS / ALLOWED_DOMAINS environment variables (set in amplify/config.ts), never code.
const DEFAULT_ALLOWED_EMAILS: string[] = [];

const DEFAULT_ALLOWED_DOMAINS = [
  'ltm.com'
];

const ACCESS_CONTACT = process.env.ACCESS_CONTACT_EMAIL || 'your LTM Vantage administrator';

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = (event.request.userAttributes.email || '').toLowerCase().trim();
  const domain = email.split('@')[1] || '';

  const envAllowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.toLowerCase().trim())
    .filter(Boolean);

  const envAllowedDomains = (process.env.ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.toLowerCase().trim())
    .filter(Boolean);

  const isEmailAllowed =
    DEFAULT_ALLOWED_EMAILS.includes(email) ||
    envAllowedEmails.includes(email);

  const isDomainAllowed =
    DEFAULT_ALLOWED_DOMAINS.includes(domain) ||
    envAllowedDomains.includes(domain);

  if (!isEmailAllowed && !isDomainAllowed) {
    console.warn(`[PreSignUp] Blocked registration attempt from unauthorized email: ${email}`);
    throw new Error(
      `Access denied: The email '${email}' is not authorized to access this platform. Please contact ${ACCESS_CONTACT} for access.`
    );
  }

  console.info(`[PreSignUp] Authorized registration for email: ${email}`);
  
  // Only accounts created by an administrator are confirmed automatically. Self-registered
  // accounts must prove they own the address via Cognito's emailed verification code;
  // otherwise anyone could register an unclaimed allow-listed address (e.g. any @ltm.com).
  if (event.triggerSource === 'PreSignUp_AdminCreateUser') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};
