/**
 * The read-only summary FinOps IQ gives Cost IQ (CQ3b task 8 and 10, BOUNDARY.md section 3). One estate has one cloud
 * figure: it is computed here, once, and Cost IQ shows it as its cloud line without computing, restating or adding to it.
 * The summary is built from the client view, so nothing consultant-only can pass through, and it is versioned so Cost IQ
 * can refuse a version it does not know. Ranges only (conservative, expected, upper), never one number, and no figure
 * unless FinOps IQ itself shows money for the estate.
 */
import { clientView } from './client-view';
import type { FinOpsIqV3Result } from './evaluate';
import type { Figure } from './value-model';
import leverLibrary from '../registry/levers.json' with { type: 'json' };

export const COST_IQ_SUMMARY_SCHEMA = 'finops-iq-cost-summary/1';
const CASES = ['conservative', 'expected', 'upper'] as const;
type Case = typeof CASES[number];

export interface CostIqSummary {
  schema: typeof COST_IQ_SUMMARY_SCHEMA;
  versions: { engine: string; leverLibrary: string; valueModel: string; claimsRegister: string };
  assessmentDate: string | null;
  mode: string;
  currency: string;
  /** `quantified` only when FinOps IQ shows money for this estate; otherwise Cost IQ shows "not quantified". */
  status: 'quantified' | 'not_quantified';
  label: string;
  /** In-scope public cloud spend, as FinOps IQ states it (a band when the client gave a band). */
  cloudSpend: { low: Figure | null; high: Figure | null; banded: boolean } | null;
  /** Per case: the cloud line. Gross and net, run rate and years one to three. */
  cases: Record<Case, {
    grossRunRate: Figure; netRunRate: Figure; netYear1: Figure; netYear2: Figure; netYear3: Figure; net3Year: Figure; capBinding: boolean;
  }> | null;
  /** The levers this tool owns, quantified or not; Cost IQ must never compute any of them (one owner per lever ID). */
  levers: Array<{ id: string; name: string; status: 'quantified' | 'not_quantified'; reasonText: string | null; inHeadline: boolean }>;
  globalCap: { share: Figure; source: { claimId: string; citation: string; url: string; year: string; sample: string } };
  confidence: 'High' | 'Medium' | 'Low' | null;
  /** The capability profile, side by side with Cost IQ's scores and never merged with them. */
  capabilities: Array<{ capability: string; domain: string; rating: string }>;
  findingIds: string[];
  /** Wording for the report where both tools have run (a proposal for owner review). */
  boundaryStatement: string;
}

export const BOUNDARY_STATEMENT =
  'Cloud, AI and measured SaaS licence value in this report come from FinOps IQ. Cost IQ does not estimate them again, so the total is Cost IQ\'s non-cloud levers plus this cloud line.';

export function costIqSummary(result: FinOpsIqV3Result): CostIqSummary {
  const r = clientView(result) as unknown as FinOpsIqV3Result;
  const v = r.value;
  const quantified = v.status === 'quantified' && v.moneyShown && !!v.totals;
  return {
    schema: COST_IQ_SUMMARY_SCHEMA,
    versions: { engine: r.versions.engine, leverLibrary: r.versions.leverLibrary, valueModel: r.versions.valueModel, claimsRegister: r.versions.claimsRegister },
    assessmentDate: r.assessmentDate ?? null,
    mode: r.mode,
    currency: v.currency,
    status: quantified ? 'quantified' : 'not_quantified',
    label: v.label,
    cloudSpend: quantified && v.spend ? { low: v.spend.low, high: v.spend.high, banded: v.spend.banded } : null,
    cases: quantified
      ? (Object.fromEntries(CASES.map(c => {
          const t = v.totals![c];
          return [c, { grossRunRate: t.grossRunRate, netRunRate: t.netRunRate, netYear1: t.netYear1, netYear2: t.netYear2, netYear3: t.netYear3, net3Year: t.net3Year, capBinding: t.capBinding }];
        })) as CostIqSummary['cases'])
      : null,
    levers: v.levers.map(l => ({ id: l.id, name: l.name, status: l.status, reasonText: l.reasonText, inHeadline: l.inHeadline })),
    globalCap: { share: v.globalCap.share, source: { claimId: v.globalCap.source.claimId, citation: v.globalCap.source.citation, url: v.globalCap.source.url, year: v.globalCap.source.year, sample: v.globalCap.source.sample } },
    confidence: v.confidence.overall,
    capabilities: r.capabilities.map(c => ({ capability: c.capability, domain: c.domain, rating: c.rating })),
    findingIds: r.findings.map(f => f.id),
    boundaryStatement: BOUNDARY_STATEMENT
  };
}

/**
 * The lever IDs FinOps IQ owns: the whole library, whatever a given estate quantifies. A lever ID has one owner tool, so
 * Cost IQ's own non-cloud levers must use IDs outside this set, and the CI guard fails if it computes any of these.
 */
export const FINOPS_IQ_LEVER_IDS: readonly string[] = (leverLibrary as any).levers.map((l: any) => l.id);
