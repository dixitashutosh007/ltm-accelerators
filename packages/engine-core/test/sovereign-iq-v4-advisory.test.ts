/**
 * Sovereign IQ Sovereign Cloud Advisory (PLAN S7): the placement ladder and the platform playbook against their
 * rules, the placement logic on fixtures, and the Gate S7 tests over the five archetypes: no action without a
 * finding, C1 never scored, and (once the sourced content is in) no selected platform without options.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSovereignIqV4, CONTROLS, advisory, LADDER, SOVEREIGN_PLAYBOOK, HYPERSCALERS, type Ladder } from '../src/accelerators/sovereign-iq/v4';
import { validateCatalogue, type PlaybookCatalogue } from '../src/playbook/catalogue';
import { ZONES } from '../src/accelerators/sovereign-iq/v4/facts';
import register from '../src/claims/claims-register.json' with { type: 'json' };

const DESIGN = join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design');
const ARCHETYPES: any[] = JSON.parse(readFileSync(join(DESIGN, 'archetypes.json'), 'utf8')).archetypes;
const CLAIMS = new Set<string>((register as any).claims.map((c: any) => c.id));
const CONTROL_IDS = new Set(CONTROLS.map(c => c.id));
const DATE = '2026-10-26';
const run = (answers: any, mode: 'executive' | 'workshop' = 'workshop') => evaluateSovereignIqV4({ mode, answers, assessmentDate: DATE });

describe('Sovereign IQ placement ladder and playbook data', () => {
  it('has rungs R0 to R4 for levels L0 to L4, with catalogued controls', () => {
    expect(LADDER.rungs.map(r => [r.id, r.level])).toEqual([['R0', 'L0'], ['R1', 'L1'], ['R2', 'L2'], ['R3', 'L3'], ['R4', 'L4']]);
    for (const r of LADDER.rungs) for (const c of r.controls) expect(CONTROL_IDS.has(c), c).toBe(true);
    expect(Object.keys(LADDER.providers).sort()).toEqual([...HYPERSCALERS].sort());
  });

  it('every option and alternative names a known provider, rung and zone, and cites claims in the register', () => {
    const rungs = new Set(LADDER.rungs.map(r => r.id));
    const zones = new Set<string>([...ZONES, 'any']);
    const ids = new Set<string>();
    for (const o of [...LADDER.options, ...LADDER.alternatives]) {
      expect(ids.has(o.id), `duplicate ${o.id}`).toBe(false);
      ids.add(o.id);
      expect(rungs.has(o.rung), o.id).toBe(true);
      for (const z of o.zones) expect(zones.has(z), `${o.id}: zone ${z}`).toBe(true);
      expect(o.claimIds.length, `${o.id}: no claim`).toBeGreaterThan(0);
      for (const c of o.claimIds) expect(CLAIMS.has(c), `${o.id}: unknown claim ${c}`).toBe(true);
    }
    for (const o of LADDER.options) expect(HYPERSCALERS.includes(o.provider), o.id).toBe(true);
  });

  it('the playbook passes the shared catalogue checks and names catalogued controls', () => {
    expect(validateCatalogue(SOVEREIGN_PLAYBOOK, CLAIMS, DATE)).toEqual([]);
    for (const c of SOVEREIGN_PLAYBOOK.technicalControls) expect(CONTROL_IDS.has(c), c).toBe(true);
    for (const e of SOVEREIGN_PLAYBOOK.entries) expect(CONTROL_IDS.has(e.control), e.id).toBe(true);
  });
});

/* ------------------------------ Placement logic ------------------------------ */

const LADDER_FIXTURE: Ladder = {
  ...LADDER,
  options: [
    { id: 'OPT.aws.R2', provider: 'aws', rung: 'R2', name: 'External key store', kind: 'native', zones: ['any'], availability: 'ga', detail: '', claimIds: ['X'], confirmRegionalAvailability: true },
    { id: 'OPT.aws.R3', provider: 'aws', rung: 'R3', name: 'Sovereign region', kind: 'native', zones: ['eea'], availability: 'ga', detail: '', claimIds: ['X'], confirmRegionalAvailability: true },
    { id: 'OPT.gcp.R3', provider: 'gcp', rung: 'R3', name: 'Partner-operated cloud', kind: 'partner', zones: ['eea', 'au'], availability: 'ga', detail: '', claimIds: ['X'], confirmRegionalAvailability: true }
  ],
  alternatives: [{ id: 'ALT.R3.private', rung: 'R3', name: 'Private cloud in the zone', kind: 'private_cloud', zones: ['any'], detail: '', claimIds: ['X'] }]
};
const entry = (control: string, platform: string, extra: any = {}) => ({
  id: `PB.SOV.${control.slice(4)}.${platform}.platform`, control, platform, level: 'platform', action: 'Do it', approach: 'Approach',
  options: [{ name: 'Option', kind: 'native' }], verification: 'Check', effort: 'M', ownerRole: 'CISO', confirmRegionalAvailability: true,
  confidence: 'Medium', claimIds: ['X'], owner: 'sovereignty-compliance-lead', lastReviewed: '2026-10-26', nextReview: '2027-01-24', ...extra
});
const PLAYBOOK_FIXTURE: PlaybookCatalogue = {
  catalogueVersion: 'test', accelerator: 'sovereign-iq', statusAsOf: DATE, rule: '', technicalControls: ['SOV.KEY.CUSTODY'],
  entries: [
    entry('SOV.KEY.CUSTODY', 'aws', { serviceFamilies: ['storage_backup'] }),
    entry('SOV.KEY.CUSTODY', 'aws', { id: 'PB.SOV.KEY.CUSTODY.aws.stack', level: 'stack', serviceFamilies: ['databases'] }),
    entry('SOV.OPS.PERSONNEL_ZONE', 'aws')
  ] as any
};

/** One class on AWS with the given level, zone and control states. */
function input(level: string, zone: string[], states: Record<string, any>, extra: { services?: string[]; platforms?: string[] } = {}) {
  const controls = Object.entries(states).map(([control, state]) => ({ control, state }));
  return {
    facts: { 'plat.in_scope': extra.platforms ?? ['aws'], 'data.class_platforms': {}, 'data.class_services': extra.services ? { personal: { aws: extra.services } } : {} },
    requirements: [{ dataClass: 'personal' as const, required: level as any, allowedZone: zone }],
    controls,
    findings: controls.filter(c => c.state !== 3).map(c => ({ id: `F-${c.control}`, type: 'control_gap', control: c.control, dataClasses: [] }))
  };
}
const R1_OK = { 'SOV.RES.LOCATION': 3, 'SOV.BACKUP.LOCATION': 3, 'SOV.RES.REGION_LOCK': 3 };
const R2_OK = { ...R1_OK, 'SOV.KEY.CUSTODY': 3, 'SOV.OPS.ADMIN_ACCESS': 3 };

describe('Sovereign IQ placement matrix', () => {
  const place = (i: any) => advisory(i, LADDER_FIXTURE, PLAYBOOK_FIXTURE).placement;

  it('has no row for L0 data and none for platforms that do not hold the data', () => {
    expect(place(input('L0', ['eea'], {}))).toEqual([]);
    expect(place(input('L2', ['eea'], R2_OK, { platforms: ['onprem'] }))).toEqual([]);
  });

  it('meets when every control up to the rung is in place; gap when one is below full; unconfirmed when unknown', () => {
    expect(place(input('L2', ['eea'], R2_OK))[0].status).toBe('meets');
    expect(place(input('L2', ['eea'], { ...R2_OK, 'SOV.KEY.CUSTODY': 1 }))[0].status).toBe('gap');
    expect(place(input('L2', ['eea'], { ...R2_OK, 'SOV.OPS.ADMIN_ACCESS': 'unknown' }))[0].status).toBe('unconfirmed');
    // A control the rung needs that was not measured is unconfirmed, never met.
    const { 'SOV.OPS.ADMIN_ACCESS': _, ...noAccess } = R2_OK;
    expect(place(input('L2', ['eea'], noAccess))[0].status).toBe('unconfirmed');
  });

  it('L3 outside the provider parent zone moves the data; inside it, the controls decide', () => {
    const row = place(input('L3', ['eea'], { ...R2_OK, 'SOV.OPS.PERSONNEL_ZONE': 0 }))[0];
    expect([row.minimumRung, row.status]).toEqual(['R3', 'move']);
    expect(row.options.map(o => o.id)).toEqual(['OPT.aws.R3']);
    expect(row.actions.map(a => a.control)).toEqual(['SOV.OPS.PERSONNEL_ZONE']);
    expect(place(input('L3', ['us'], { ...R2_OK, 'SOV.OPS.PERSONNEL_ZONE': 3 }))[0].status).toBe('meets');
  });

  it('asks the consultant to confirm when O2 says in-zone operations on standard regions run from outside the zone', () => {
    const row = place(input('L3', ['eea'], { ...R2_OK, 'SOV.OPS.PERSONNEL_ZONE': 3 }))[0];
    expect([row.status, row.confirmOperatingModel, row.actions]).toEqual(['unconfirmed', true, []]);
  });

  it('shows alternatives only for zones the provider has no option in, without ranking providers', () => {
    const row = place(input('L3', ['eea', 'au'], { ...R2_OK, 'SOV.OPS.PERSONNEL_ZONE': 0 }))[0];
    expect(row.noOfferingZones).toEqual(['au']);
    expect(row.alternatives.map(a => a.id)).toEqual(['OPT.gcp.R3', 'ALT.R3.private']);
    expect(place(input('L3', ['eea'], { ...R2_OK, 'SOV.OPS.PERSONNEL_ZONE': 0 }))[0].alternatives).toEqual([]);
  });

  it('acts only on findings, and narrows actions to the kinds of service from C1', () => {
    const gap = { ...R2_OK, 'SOV.KEY.CUSTODY': 0 };
    expect(place(input('L2', ['eea'], gap))[0].actions.map(a => a.entryId)).toEqual(['PB.SOV.KEY.CUSTODY.aws.platform', 'PB.SOV.KEY.CUSTODY.aws.stack']);
    expect(place(input('L2', ['eea'], gap, { services: ['databases'] }))[0].actions.map(a => a.entryId)).toEqual(['PB.SOV.KEY.CUSTODY.aws.stack']);
    const noFinding = { ...input('L2', ['eea'], gap), findings: [] };
    expect(place(noFinding)[0].actions).toEqual([]);
  });

  it('reports a technical control with no entry for a platform in scope', () => {
    const a = advisory(input('L2', ['eea'], { ...R2_OK, 'SOV.KEY.CUSTODY': 0 }, { platforms: ['aws', 'azure'] }), LADDER_FIXTURE, PLAYBOOK_FIXTURE);
    expect(a.gaps).toEqual([{ findingId: 'F-SOV.KEY.CUSTODY', control: 'SOV.KEY.CUSTODY', platforms: ['azure'] }]);
  });
});

/* ------------------------------- Gate S7 tests ------------------------------- */

describe('Sovereign IQ Gate S7 over the archetypes', () => {
  for (const a of ARCHETYPES) for (const mode of ['executive', 'workshop'] as const) {
    const r = run(a.answers, mode);
    const findingIds = new Set(r.findings.map(f => f.id));

    it(`${a.id} ${mode}: no action without a finding`, () => {
      for (const p of r.advisory.placement) for (const x of p.actions) expect(findingIds.has(x.findingId), x.entryId).toBe(true);
      for (const x of r.advisory.technical) expect(findingIds.has(x.findingId), x.entryId).toBe(true);
    });
  }

  it('C1 is never scored and executive mode ignores it', () => {
    const a = ARCHETYPES.find(x => (x.answers.P1 ?? []).includes('aws'))!;
    const services = Object.fromEntries((a.answers.D1 as string[]).filter(c => c !== 'unknown').map(c => [c, { aws: ['databases'] }]));
    const strip = (r: any) => ({ maturity: r.maturity, controls: r.controls, findings: r.findings, exposure: r.exposure });
    expect(strip(run({ ...a.answers, C1: services }))).toEqual(strip(run(a.answers)));
    const rows = run({ ...a.answers, C1: services }).advisory.placement;
    expect(rows.filter(p => p.platform === 'aws').map(p => p.services)).toEqual(rows.filter(p => p.platform === 'aws').map(() => ['databases']));
    expect(rows.filter(p => p.platform !== 'aws').every(p => !p.services.length)).toBe(true);
    expect(run({ ...a.answers, C1: services }, 'executive').ignoredAnswers).toContain('C1');
  });

  // Content gate: runs once the sourced entries are in (sovereignty-compliance-lead, S7-SOURCES.md).
  const sourced = SOVEREIGN_PLAYBOOK.entries.length > 0 && LADDER.options.length > 0;
  it.skipIf(!sourced)('every technical control gap has an entry on every platform that holds its data', () => {
    for (const a of ARCHETYPES) for (const mode of ['executive', 'workshop'] as const) expect(run(a.answers, mode).advisory.gaps, `${a.id} ${mode}`).toEqual([]);
  });
  it.skipIf(!sourced)('every hyperscaler has options at R2 for every zone, and R3 options or alternatives wherever R3 is needed', () => {
    for (const a of ARCHETYPES) for (const p of run(a.answers, 'workshop').advisory.placement) {
      if (p.minimumRung === 'R2') expect(p.noOfferingZones, `${a.id} ${p.dataClass} ${p.platform}`).toEqual([]);
      if (p.noOfferingZones.length) expect(p.alternatives.length, `${a.id} ${p.dataClass} ${p.platform}`).toBeGreaterThan(0);
    }
  });
});
