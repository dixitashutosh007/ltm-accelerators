/**
 * Sovereign IQ SEAL view (PLAN S7b): the SEAL data against the claims register, the DESIGN 3.4 mapping and its reverse
 * use for tender minimums, and the view over the archetypes (never a rating of the client or a provider).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSovereignIqV4, tenderLevel, SEAL, CONTROLS } from '../src/accelerators/sovereign-iq/v4';
import register from '../src/claims/claims-register.json' with { type: 'json' };

const DESIGN = join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design');
const ARCHETYPES: any[] = JSON.parse(readFileSync(join(DESIGN, 'archetypes.json'), 'utf8')).archetypes;
const CLAIMS = new Set<string>((register as any).claims.map((c: any) => c.id));
const run = (answers: any, mode: 'executive' | 'workshop' = 'workshop') => evaluateSovereignIqV4({ mode, answers, assessmentDate: '2026-10-26' });

describe('Sovereign IQ SEAL data', () => {
  it('has SEAL-0 to SEAL-4, eight objectives, and claims in the register', () => {
    expect(SEAL.levels.map(l => l.id)).toEqual([0, 1, 2, 3, 4]);
    expect(SEAL.objectives.map(o => o.id)).toEqual(['SOV-1', 'SOV-2', 'SOV-3', 'SOV-4', 'SOV-5', 'SOV-6', 'SOV-7', 'SOV-8']);
    for (const id of SEAL.claimIds) expect(CLAIMS.has(id), id).toBe(true);
  });

  it('maps only SOV-2 to SOV-6, and each level row is at least the one below (levels are cumulative)', () => {
    const levels = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;
    for (const l of levels) for (const o of Object.keys(SEAL.mapping[l])) expect(SEAL.objectives.find(x => x.id === o)?.mapped, `${l} ${o}`).toBe(true);
    for (let i = 1; i < levels.length; i++) for (const o of ['SOV-2', 'SOV-3', 'SOV-4', 'SOV-5', 'SOV-6']) {
      expect(SEAL.mapping[levels[i]][o] ?? 0, `${levels[i]} ${o}`).toBeGreaterThanOrEqual(SEAL.mapping[levels[i - 1]][o] ?? 0);
    }
  });

  it('every SEAL tag on a control names an objective', () => {
    const ids = new Set(SEAL.objectives.map(o => o.id));
    for (const c of CONTROLS) for (const s of c.seal ?? []) expect(ids.has(s), `${c.id} ${s}`).toBe(true);
  });
});

describe('Sovereign IQ tender minimums (DESIGN 3.4 reverse use)', () => {
  it('takes the lowest level whose row meets every mapped minimum', () => {
    expect(tenderLevel({ 'SOV-3': 1 }).level).toBe('L1');
    expect(tenderLevel({ 'SOV-3': 2 }).level).toBe('L2');
    expect(tenderLevel({ 'SOV-2': 2, 'SOV-4': 2 }).level).toBe('L3');
    expect(tenderLevel({ 'SOV-6': 1 }).level).toBe('L4');
  });

  it('records unmapped objectives as provider-selection criteria and minimums no level reaches', () => {
    const t = tenderLevel({ 'SOV-1': 3, 'SOV-3': 2, 'SOV-6': 4, 'SOV-8': 1 });
    expect(t.level).toBe('L4');
    expect(t.beyondMapping).toEqual(['SOV-6']);
    expect(t.selectionCriteria).toEqual([{ objective: 'SOV-1', minimum: 3 }, { objective: 'SOV-8', minimum: 1 }]);
    expect(tenderLevel({ 'SOV-7': 2 }).level).toBe('L0');
  });

  it('raises the required level of the classes the tender covers, and only those', () => {
    const a = ARCHETYPES.find(x => x.id === 'ARC3_US_HEALTHTECH_EU_CUSTOMERS')!;
    const base = run(a.answers);
    const covered = base.requirements[0].dataClass;
    const r = run({ ...a.answers, L3: { sov_2: 'seal_2', sov_4: 'seal_3', sov_7: 'seal_2', classes: [covered] } });
    expect(r.asked).toContain('L3');
    for (const q of r.requirements) {
      const before = base.requirements.find(x => x.dataClass === q.dataClass)!;
      expect(q.tender, q.dataClass).toBe(q.dataClass === covered ? 'L3' : null);
      expect(q.required, q.dataClass).toBe(q.dataClass === covered ? 'L3' : before.required);
    }
    expect(r.seal.tender?.selectionCriteria).toEqual([{ objective: 'SOV-7', minimum: 2 }]);
    expect(r.seal.tender?.raised.map(x => x.dataClass)).toEqual(base.requirements[0].required === 'L3' ? [] : [covered]);
  });

  it('is not asked, and changes nothing, without the EU framework or an EU cloud provider', () => {
    const a = ARCHETYPES.find(x => x.id === 'ARC4_SG_AU_FINANCIAL_GROUP')!;
    const r = run({ ...a.answers, L3: { sov_3: 'seal_4' } });
    expect(r.asked).not.toContain('L3');
    expect(r.requirements).toEqual(run(a.answers).requirements);
    expect(r.seal.tender).toBeNull();
  });
});

describe('Sovereign IQ SEAL view over the archetypes', () => {
  for (const a of ARCHETYPES) for (const mode of ['executive', 'workshop'] as const) {
    it(`${a.id} ${mode}: a row per kind of data at L1+, the organisation row is the highest, and the wording never rates anyone`, () => {
      const r = run(a.answers, mode);
      expect(r.seal.byClass.map(x => x.dataClass)).toEqual(r.requirements.filter(q => q.required !== 'L0').map(q => q.dataClass));
      for (const [o, n] of Object.entries(r.seal.organisation)) {
        const ns = r.seal.byClass.map(x => x.minimums[o]).filter((v): v is number => v != null);
        expect(n, o).toBe(ns.length ? Math.max(...ns) : null);
      }
      for (const ob of r.seal.objectives) expect(ob.inPlace).toBe(ob.controls.filter(c => c.state === 3).length);
      expect(r.seal.statement).not.toMatch(/you are SEAL|SEAL-certified|certified at SEAL/i);
    });
  }
});
