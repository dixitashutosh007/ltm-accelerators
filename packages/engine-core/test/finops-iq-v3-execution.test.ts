/**
 * FinOps IQ technical execution and How LTM can help (execution phase M5; PLAN F8 and F9 gates; WS-S3 and WS-S5):
 *   - both catalogues pass their schema and rule checks, citing claims that exist;
 *   - F9: every finding maps to at least one offering in the catalogue; indicative scope (the SOW draft) never
 *     reaches the client: not in the result, not in the client edition of the report;
 *   - F8: no action without a finding; no platform the finding names without options for a technical control;
 *   - the selection rules, on a small fixture catalogue, so they are tested before the entries are sourced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinOpsIqV3, type AnswerLevel, type FinOpsIqV3Input, type FinOpsIqV3Result } from '../src/accelerators/finops-iq/v3/evaluate';
import { clientView } from '../src/accelerators/finops-iq/v3/client-view';
import { controlsOf, howLtmCanHelp, OFFERINGS, PLAYBOOK, platformsOf, technicalPlan } from '../src/accelerators/finops-iq/v3/execution';
import { BACKLOG_HEADER, finopsIqBacklog, finopsIqReport } from '../src/accelerators/finops-iq/v3/report';
import { platformsInScope, selectActions, validateCatalogue, type PlaybookCatalogue, type PlaybookEntry } from '../src/playbook/catalogue';
import { sowDraft, validateOfferings } from '../src/offerings/catalogue';
import { walkSegments } from '../src/report/model';
import register from '../src/claims/claims-register.json' with { type: 'json' };
import capabilities from '../src/accelerators/finops-iq/registry/capabilities.json' with { type: 'json' };
import levers from '../src/accelerators/finops-iq/registry/levers.json' with { type: 'json' };
import engineRules from '../src/accelerators/finops-iq/v3/engine-rules.json' with { type: 'json' };

const CLAIMS = new Set<string>((register as any).claims.map((c: any) => c.id));
const SCENARIOS: any[] = JSON.parse(readFileSync(join(__dirname, '../../../docs/cio-readiness/finops-iq/design/reference-scenarios.json'), 'utf8')).scenarios;
const CODE: Record<string, AnswerLevel> = { R: 'run', W: 'walk', C: 'crawl', N: 'not_yet', U: 'unknown' };
const REPORTS = ['cost_by_owner', 'forecast', 'anomaly_alerts', 'unit_cost_trend', 'commitment_coverage'];
const UN08: Record<string, string[] | string> = { run: REPORTS, walk: REPORTS.slice(0, 3), crawl: REPORTS.slice(0, 1), not_yet: [], unknown: 'unknown' };
const scenarioInput = (s: any): FinOpsIqV3Input => ({
  mode: s.mode, facts: s.inputs.facts, assessmentDate: '2026-10-14',
  answers: Object.fromEntries(Object.entries<string>(s.inputs.answers).map(([q, c]) => [q, q === 'UN-08' ? UN08[CODE[c]] : CODE[c]]))
});
const runs = SCENARIOS.map(s => ({ id: s.id, input: scenarioInput(s), r: evaluateFinOpsIqV3(scenarioInput(s)) }));

/** Every offering ID a registry or rule can put on a finding. */
function referencedOfferings(): string[] {
  const ids = new Set<string>();
  const walk = (o: any) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) k === 'offeringIds' ? (v as string[]).forEach(x => ids.add(x)) : walk(v);
  };
  [capabilities, levers, engineRules].forEach(walk);
  return [...ids].sort();
}

describe('Catalogues (WS-S3, WS-S5)', () => {
  it('the FinOps playbook passes its schema and rule checks', () => {
    expect(validateCatalogue(PLAYBOOK, CLAIMS)).toEqual([]);
  });
  it('the FinOps offering catalogue passes its checks', () => {
    expect(validateOfferings(OFFERINGS, CLAIMS)).toEqual([]);
  });
  it('every offering a registry or rule can name is in the catalogue', () => {
    const known = new Set(OFFERINGS.offerings.map(o => o.id));
    expect(referencedOfferings().filter(id => !known.has(id))).toEqual([]);
  });
});

describe('How LTM can help (F9 gate)', () => {
  it.each(runs.map(x => [x.id, x]))('%s: every finding maps to at least one offering in the catalogue, and help lists each offering once', (_, x) => {
    const known = new Set(OFFERINGS.offerings.map(o => o.id));
    for (const f of x.r.findings) expect(f.offeringIds.filter(id => known.has(id)).length, f.id).toBeGreaterThan(0);
    const helped = new Set(x.r.help.flatMap(h => h.findingIds));
    for (const f of x.r.findings) expect(helped.has(f.id), f.id).toBe(true);
    expect(new Set(x.r.help.map(h => h.offering.id)).size).toBe(x.r.help.length);
    expect(x.r.help).toEqual(howLtmCanHelp(x.r.findings));
  });

  it('indicative scope is consultant-only: not in the result, the client view or the client edition; in the consultant SOW draft', () => {
    const scopes = OFFERINGS.offerings.map(o => o.indicativeScope).filter(Boolean) as string[];
    for (const x of runs) {
      expect(JSON.stringify(x.r)).not.toMatch(/indicativeScope/);
      expect(JSON.stringify(clientView(x.r))).not.toMatch(/indicativeScope/);
      const client = finopsIqReport(x.r, { client: 'C', preparedBy: 'P', dataProvidedBy: 'C', view: 'client', input: x.input });
      const text: string[] = [];
      walkSegments(client, s => text.push(typeof s === 'string' ? s : s.text));
      for (const scope of scopes) expect(text.join(' '), `${x.id}: ${scope}`).not.toContain(scope);
      expect(client.sections.map(s => s.id)).not.toContain('sow');
      const consultant = finopsIqReport(x.r, { client: 'C', preparedBy: 'P', dataProvidedBy: 'C', view: 'consultant', input: x.input });
      expect(consultant.sections.map(s => s.id)).toContain('sow');
    }
  });

  it('the SOW draft lists each offering the findings call for once, with its findings; routes separately', () => {
    const { lines, routes } = sowDraft(OFFERINGS, runs[3].r.findings);
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.offering.indicativeScope).toBeTruthy();
    for (const r of routes) expect(r.offering.type).toBe('Route');
    expect(new Set(lines.map(l => l.offering.id)).size).toBe(lines.length);
  });

  it('the report has How LTM can help and Technical execution sections in both editions', () => {
    for (const view of ['client', 'consultant'] as const) {
      const doc = finopsIqReport(runs[3].r, { client: 'C', preparedBy: 'P', dataProvidedBy: 'C', view, input: runs[3].input });
      expect(doc.sections.map(s => s.id)).toEqual(expect.arrayContaining(['help', 'technical']));
    }
  });
});

describe('Technical execution (F8 gate)', () => {
  it.each(runs.map(x => [x.id, x]))('%s: no action without its finding, control and platform; no gap for a technical control', (_, x) => {
    for (const a of x.r.technicalPlan.actions) {
      const f = x.r.findings.find(y => y.id === a.findingId)!;
      expect(f, a.entryId).toBeDefined();
      expect(controlsOf(f)).toContain(a.control);
      if (a.platform !== 'any') expect(platformsOf(f)).toContain(a.platform);
    }
    expect(x.r.technicalPlan.gaps).toEqual([]);
  });

  // The controls PLAN F8 lists; they must be technical controls once the entries are sourced (M5 content).
  const F8_CONTROLS = ['FIN.DATA_INGESTION', 'FIN.ALLOCATION', 'FIN.UNIT_ECONOMICS', 'FIN.LEV-01', 'FIN.LEV-02', 'FIN.LEV-03', 'FIN.LEV-04', 'FIN.LEV-05', 'FIN.LEV-06', 'FIN.LEV-08', 'FIN.LEV-10'];
  it.skipIf(PLAYBOOK.entries.length === 0)('every control PLAN F8 lists is a technical control of the playbook', () => {
    expect(F8_CONTROLS.filter(c => !PLAYBOOK.technicalControls.includes(c))).toEqual([]);
  });
});

describe('Playbook selection rules (fixture catalogue)', () => {
  const entry = (over: Partial<PlaybookEntry>): PlaybookEntry => ({
    id: 'PB.FIN.ALLOCATION.aws.platform', control: 'FIN.ALLOCATION', platform: 'aws', level: 'platform',
    action: 'Enforce a tag policy for cost allocation', approach: 'Mandatory allocation tags by policy',
    options: [{ name: 'AWS Organizations tag policies', kind: 'native' }], verification: 'Share of spend allocated, by cost, monthly',
    effort: 'M', ownerRole: 'Cloud platform team', confirmRegionalAvailability: false, confidence: 'Medium',
    claimIds: ['CLM-FIN-180'], owner: 'finops-cost-lead', lastReviewed: '2026-10-22', nextReview: '2027-01-22', ...over
  });
  const fixture: PlaybookCatalogue = {
    catalogueVersion: 'test', accelerator: 'finops-iq', statusAsOf: '2026-10-22', rule: 'fixture', technicalControls: ['FIN.ALLOCATION'],
    entries: [entry({}), entry({ id: 'PB.FIN.ALLOCATION.azure.platform', platform: 'azure', options: [{ name: 'Azure Policy', kind: 'native' }] })]
  };

  it('maps estate scopes to platforms', () => {
    expect(platformsInScope(['aws', 'gcp'], ['public_cloud', 'kubernetes', 'data_centre', 'licensing', 'data_cloud_platform']))
      .toEqual(['aws', 'gcp', 'kubernetes', 'on_prem', 'saas', 'data_platform']);
  });

  it('selects entries for the platforms in scope and reports the platforms without one', () => {
    const [sel] = selectActions(fixture, ['FIN.ALLOCATION', 'FIN.FORECASTING'], ['aws', 'gcp']);
    expect(sel.entries.map(e => e.platform)).toEqual(['aws']);
    expect(sel.missingPlatforms).toEqual(['gcp']);
    expect(selectActions(fixture, ['FIN.FORECASTING'], ['aws'])).toEqual([]);
  });

  it('a technical control missing a platform is a gap in the plan; actions keep their finding', () => {
    const finding = { id: 'F-1', type: 'capability_gap', capability: 'ALLOCATION', scopes: ['public_cloud:aws', 'public_cloud:gcp'], leverIds: [], offeringIds: [], leverActions: [] };
    const plan = technicalPlan([finding], fixture);
    expect(plan.actions.map(a => [a.findingId, a.platform])).toEqual([['F-1', 'aws']]);
    expect(plan.gaps).toEqual([{ findingId: 'F-1', control: 'FIN.ALLOCATION', platforms: ['gcp'] }]);
    expect(plan.claimIds).toContain('CLM-FIN-180');
  });

  it('validation catches bad entries', () => {
    const bad: PlaybookCatalogue = { ...fixture, entries: [
      entry({ id: 'PB.FIN.ALLOCATION.aws.application', level: 'application' }),
      entry({ id: 'PB.FIN.ALLOCATION.gcp.platform', platform: 'gcp', options: [], claimIds: ['CLM-NOPE'] }),
      entry({ id: 'PB.FIN.ALLOCATION.azure.platform', platform: 'azure', nextReview: '2026-01-01' }),
      entry({ id: 'PB.FIN.WRONG.oci.platform', platform: 'oci' })
    ] };
    const errors = validateCatalogue(bad, CLAIMS, '2026-10-22').join('\n');
    expect(errors).toMatch(/application-level entries state the discovery/);
    expect(errors).toMatch(/needs at least one option/);
    expect(errors).toMatch(/unknown claim CLM-NOPE/);
    expect(errors).toMatch(/past its review date/);
    expect(errors).toMatch(/does not match control/);
  });

  it('the backlog has one row per platform action, with level, options and effort band', () => {
    const r: FinOpsIqV3Result = JSON.parse(JSON.stringify(runs[3].r));
    const alloc = r.findings.find(f => f.capability === 'ALLOCATION')!;
    r.technicalPlan = technicalPlan(r.findings, { ...fixture, technicalControls: [] });
    const rows = finopsIqBacklog(r).rows.filter(row => row[0] === alloc.id && row[BACKLOG_HEADER.indexOf('Platform level')] === 'platform');
    expect(rows.map(row => row[BACKLOG_HEADER.indexOf('Platform')]).sort()).toEqual(['AWS', 'Azure']); // names, never raw keys (M7 D6)
    expect(rows[0][BACKLOG_HEADER.indexOf('Effort band')]).toBe('M');
  });
});
