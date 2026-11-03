export interface DomainAccessConfig { protectedDomains: string[]; protectedEmails: string[]; baselineDomains: string[]; baselineEmails: string[] }
export interface DomainRule { id: string; kind: 'domain' | 'email'; value: string; action: 'allow' | 'block'; note?: string; addedBy: string; addedAt: string }
export interface DomainRulesDocument { version: 1; rules: DomainRule[] }
export interface DomainDecision { allowed: boolean; reason: string; rule?: DomainRule }
export type DomainRuleChange = { op: 'set'; kind: 'domain' | 'email'; value: string; action: 'allow' | 'block'; note?: string } | { op: 'remove'; id: string };
export interface DomainAuditRecord { at: string; by: string; op: 'add' | 'replace' | 'remove'; rule: DomainRule; previous: DomainRule | null }
export const MAX_RULES: number;
export class DomainRuleError extends Error { code: string }
export function normalizeEmail(v: unknown): string;
export function normalizeDomain(v: unknown): string;
export function domainOf(email: unknown): string;
export function configFromEnv(env?: Record<string, string | undefined>): DomainAccessConfig;
export function emptyRules(): DomainRulesDocument;
export function decide(email: unknown, doc: DomainRulesDocument | null | undefined, cfg: DomainAccessConfig): DomainDecision;
export function refusalMessage(decision: { reason: string }, contact?: string): string;
export function applyChange(doc: DomainRulesDocument | null | undefined, change: DomainRuleChange, cfg: DomainAccessConfig, ctx: { by: string; now: string; id: () => string }): { doc: DomainRulesDocument; record: DomainAuditRecord };
export function assertNoLockout(doc: DomainRulesDocument, cfg: DomainAccessConfig, actor?: string): void;
