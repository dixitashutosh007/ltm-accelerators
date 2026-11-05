import type { DomainAccessConfig, DomainAuditRecord, DomainDecision, DomainRuleChange, DomainRulesDocument } from './domain-access.mjs';
export const RULES_KEY: string;
export const AUDIT_PREFIX: string;
export const STALE_MS: number;
export const FRESH_MS: number;
export interface DomainRulesStore {
  read(opts?: { force?: boolean }): Promise<{ doc: DomainRulesDocument; etag: string | null; source: 'live' | 'cache' | 'stale' }>;
  check(email: unknown): Promise<DomainDecision>;
  seedIfMissing(): Promise<'created' | 'exists'>;
  change(change: DomainRuleChange, by: string): Promise<{ doc: DomainRulesDocument; record: DomainAuditRecord }>;
  audit(limit?: number): Promise<DomainAuditRecord[]>;
}
export function createDomainRulesStore(deps: { bucket: string; cfg: DomainAccessConfig; s3?: { send(cmd: unknown): Promise<any> }; now?: () => number; id?: () => string }): DomainRulesStore;
