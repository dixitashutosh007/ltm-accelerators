import type { PreSignUpTriggerHandler } from 'aws-lambda';

// Pre-configured allowlist (Master admin + default corporate domain)
const DEFAULT_ALLOWED_EMAILS = [
  'dixitashutosh007@gmail.com',
  'ashutosh.dixit@ltm.com'
];

const DEFAULT_ALLOWED_DOMAINS = [
  'ltm.com'
];

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
      `Access denied: The email '${email}' is not authorized to access this platform. Please contact ashutosh.dixit@ltm.com for access.`
    );
  }

  console.info(`[PreSignUp] Authorized registration for email: ${email}`);
  
  // Auto-confirm verified allowed users
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
