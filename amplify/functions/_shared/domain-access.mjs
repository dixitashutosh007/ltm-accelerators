/**
 * Who may have an account and sign in (platform workstream P1). Pure rules, no I/O: the sign-up check, the sign-in
 * check, the request-time check and the admin API all decide through this module, so they cannot disagree.
 *
 * A rule allows or blocks one exact domain or one exact email address (no wildcards: ey.com admits name@ey.com, not
 * name@in.ey.com). Precedence, strongest first:
 *   1. Protected: a protected email (the super administrators) or a protected domain (ltm.com) is always allowed.
 *      This does not read the rules, so an empty, broken or unreachable rule list can never lock them out.
 *   2. An email rule: block, then allow. An email rule overrides its domain's rule.
 *   3. A domain rule: block, then allow.
 *   4. The baseline: the allow lists in amplify/config.ts. A rule can block a baseline entry (except a protected one).
 *   5. Anything else is refused.
 * One rule per target (kind and value): setting a rule replaces the earlier one.
 *
 * Changes are checked before they are saved. A change that would block a protected entry, or that would lock the
 * administrator making it out of their own account, is refused. The same check runs on the result of every change.
 */

export const MAX_RULES = 500;

/** Raised for a refused change; `code` is stable for the API and the tests. */
export class DomainRuleError extends Error {
  constructor(code, message) { super(message); this.name = 'DomainRuleError'; this.code = code; }
}

const DOMAIN = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const EMAIL = /^(?=.{3,254}$)[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = v => String(v ?? '').trim().toLowerCase();
export const normalizeDomain = v => String(v ?? '').trim().toLowerCase().replace(/^@/, '');
export const domainOf = email => normalizeEmail(email).split('@')[1] || '';

const list = v => (Array.isArray(v) ? v : String(v ?? '').split(',')).map(x => String(x).trim().toLowerCase()).filter(x => x && x !== 'none');

/**
 * Configuration from the environment (set in amplify/config.ts): the protected entries, and the baseline allow lists
 * the platform started with. ltm.com is protected unless PROTECTED_DOMAINS says otherwise.
 */
export function configFromEnv(env = {}) {
  return {
    protectedDomains: list(env.PROTECTED_DOMAINS ?? 'ltm.com'),
    protectedEmails: list(env.PROTECTED_EMAILS ?? env.SUPER_ADMIN_EMAILS ?? ''),
    baselineDomains: list(env.BASELINE_ALLOWED_DOMAINS ?? env.ALLOWED_DOMAINS ?? ''),
    baselineEmails: list(env.BASELINE_ALLOWED_EMAILS ?? env.ALLOWED_EMAILS ?? '')
  };
}

export const emptyRules = () => ({ version: 1, rules: [] });

function readRules(doc) {
  const rules = Array.isArray(doc?.rules) ? doc.rules : [];
  // A malformed entry is ignored rather than trusted: only exact, well-formed allow and block rules count.
  return rules.filter(r => r && (r.kind === 'domain' || r.kind === 'email') && (r.action === 'allow' || r.action === 'block') && typeof r.value === 'string');
}

/**
 * The decision for one address: { allowed, reason, rule? }. `reason` is one of protected_email, protected_domain,
 * email_blocked, email_allowed, domain_blocked, domain_allowed, baseline_email, baseline_domain, not_listed, invalid_email.
 */
export function decide(email, doc, cfg) {
  const addr = normalizeEmail(email);
  if (!EMAIL.test(addr)) return { allowed: false, reason: 'invalid_email' };
  const domain = domainOf(addr);
  if (cfg.protectedEmails.includes(addr)) return { allowed: true, reason: 'protected_email' };
  if (cfg.protectedDomains.includes(domain)) return { allowed: true, reason: 'protected_domain' };

  const rules = readRules(doc);
  const find = (kind, value, action) => rules.find(r => r.kind === kind && r.value === value && r.action === action);
  const emailBlock = find('email', addr, 'block');
  if (emailBlock) return { allowed: false, reason: 'email_blocked', rule: emailBlock };
  const emailAllow = find('email', addr, 'allow');
  if (emailAllow) return { allowed: true, reason: 'email_allowed', rule: emailAllow };
  if (cfg.baselineEmails.includes(addr)) return { allowed: true, reason: 'baseline_email' };
  const domainBlock = find('domain', domain, 'block');
  if (domainBlock) return { allowed: false, reason: 'domain_blocked', rule: domainBlock };
  const domainAllow = find('domain', domain, 'allow');
  if (domainAllow) return { allowed: true, reason: 'domain_allowed', rule: domainAllow };
  if (cfg.baselineDomains.includes(domain)) return { allowed: true, reason: 'baseline_domain' };
  return { allowed: false, reason: 'not_listed' };
}

/** Why an address was refused, in words for the person who has to act on it. */
export function refusalMessage(decision, contact = 'your LTM Vantage administrator') {
  if (decision.reason === 'rules_unavailable') return `Access could not be checked right now. Please try again in a few minutes, or contact ${contact}.`;
  return `Access denied: this address is not authorized to use the platform. Please contact ${contact} for access.`;
}

/**
 * Applies one change to the rules and returns the new document and an audit record, or throws DomainRuleError.
 *   { op: 'set', kind, value, action, note? }   add a rule, or replace the rule for that target
 *   { op: 'remove', id }                        remove a rule
 * `ctx.by` is the administrator making the change, `ctx.now` an ISO time, `ctx.id` a function that makes a rule id.
 */
export function applyChange(doc, change, cfg, ctx) {
  const rules = readRules(doc).map(r => ({ ...r }));
  const by = normalizeEmail(ctx.by);
  if (!EMAIL.test(by)) throw new DomainRuleError('actor_required', 'The administrator making the change must be identified.');
  let next;
  let record;

  if (change?.op === 'set') {
    const kind = change.kind;
    if (kind !== 'domain' && kind !== 'email') throw new DomainRuleError('invalid_kind', 'A rule applies to a domain or an email address.');
    if (change.action !== 'allow' && change.action !== 'block') throw new DomainRuleError('invalid_action', 'A rule allows or blocks.');
    const value = kind === 'domain' ? normalizeDomain(change.value) : normalizeEmail(change.value);
    // The last label must contain a letter, so an IP address such as 10.0.0.1 is not taken for a domain.
    if (kind === 'domain' && (value.includes('*') || !DOMAIN.test(value) || !/[a-z]/.test(value.split('.').pop()))) throw new DomainRuleError('invalid_value', 'Enter an exact domain such as example.com. Wildcards are not supported.');
    if (kind === 'email' && !EMAIL.test(value)) throw new DomainRuleError('invalid_value', 'Enter a full email address.');
    const note = typeof change.note === 'string' ? change.note.trim().slice(0, 300) : '';

    if (change.action === 'block') {
      if (kind === 'domain' && cfg.protectedDomains.includes(value)) throw new DomainRuleError('protected_domain', `${value} is protected and cannot be blocked.`);
      if (kind === 'email' && (cfg.protectedEmails.includes(value) || cfg.protectedDomains.includes(domainOf(value)))) throw new DomainRuleError('protected_email', `${value} is protected and cannot be blocked.`);
    }
    const existing = rules.find(r => r.kind === kind && r.value === value);
    const rule = { id: existing?.id ?? ctx.id(), kind, value, action: change.action, ...(note ? { note } : {}), addedBy: by, addedAt: ctx.now };
    if (!existing && rules.length >= MAX_RULES) throw new DomainRuleError('too_many_rules', `At most ${MAX_RULES} rules are supported.`);
    next = existing ? rules.map(r => (r.id === existing.id ? rule : r)) : [...rules, rule];
    record = { at: ctx.now, by, op: existing ? 'replace' : 'add', rule, previous: existing ?? null };
  } else if (change?.op === 'remove') {
    const existing = rules.find(r => r.id === change.id);
    if (!existing) throw new DomainRuleError('not_found', 'That rule does not exist.');
    next = rules.filter(r => r.id !== existing.id);
    record = { at: ctx.now, by, op: 'remove', rule: existing, previous: existing };
  } else {
    throw new DomainRuleError('invalid_op', 'Use "set" or "remove".');
  }

  const result = { version: 1, rules: next };
  assertNoLockout(result, cfg, by);
  return { doc: result, record };
}

/**
 * The invariant every saved list must hold: each protected email stays allowed, and so does the administrator
 * who made the change. A failure here means the change is refused, whatever the rule says.
 */
export function assertNoLockout(doc, cfg, actor) {
  for (const email of cfg.protectedEmails) {
    if (!decide(email, doc, cfg).allowed) throw new DomainRuleError('would_lock_out_protected', `This change would block the protected address ${email}.`);
  }
  if (actor && !decide(actor, doc, cfg).allowed) throw new DomainRuleError('would_lock_out_self', 'This change would block your own account.');
}
