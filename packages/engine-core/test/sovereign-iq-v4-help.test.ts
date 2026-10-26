/**
 * Sovereign IQ How LTM can help (PLAN S8, Gate S8): the offering catalogue against its rules, every finding mapped to at
 * least one offering, the placement link (R1-R2 gaps to the landing zone, sovereign-offering rows to migration), the
 * SOW draft consultant-only, and the language lint (advice, never a sales pitch).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import {
  evaluateSovereignIqV4, clientView, sovereignIqReport, howLtmCanHelp, sovereignSow, offeringIdsOf, SOVEREIGN_OFFERINGS, CONTROLS
} from '../src/accelerators/sovereign-iq/v4';
import { validateOfferings } from '../src/offerings/catalogue';
import { walkSegments } from '../src/report/model';
import register from '../src/claims/claims-register.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const { BANNED } = require('../../../scripts/check-claims.cjs') as { BANNED: RegExp[] };
/** Sales language on top of the shared banned list (S8: advice, not a pitch). */
const SALES = [/\bbest\b/i, /\bleading\b/i, /\bpremier\b/i, /\bunmatched\b/i, /partner of choice/i, /\bcheapest\b/i, /\bdiscount/i, /\bexclusive offer/i, /€\s?\d|\$\s?\d|EUR\s?\d/];
const DESIGN = join(__dirname, '../../../docs/cio-readiness/sovereign-iq/design');
const ARCHETYPES: any[] = JSON.parse(readFileSync(join(DESIGN, 'archetypes.json'), 'utf8')).archetypes;
const CLAIMS = new Set<string>((register as any).claims.map((c: any) => c.id));
const run = (answers: any, mode: 'executive' | 'workshop' = 'workshop') => evaluateSovereignIqV4({ mode, answers, assessmentDate: '2026-10-26' });
const runs = ARCHETYPES.flatMap(a => (['executive', 'workshop'] as const).map(mode => ({ label: `${a.id} ${mode}`, r: run(a.answers, mode) })));
const IDS = new Set(SOVEREIGN_OFFERINGS.offerings.map(o => o.id));

describe('Sovereign IQ offering catalogue', () => {
  it('passes the shared catalogue checks', () => expect(validateOfferings(SOVEREIGN_OFFERINGS, CLAIMS)).toEqual([]));

  it('has every offering a control or the engine names, and a route for each referral', () => {
    for (const c of CONTROLS.filter(c => c.offering)) expect(IDS.has(c.offering), c.id).toBe(true);
    const src = readFileSync(join(__dirname, '../src/accelerators/sovereign-iq/v4/evaluate.ts'), 'utf8');
    for (const id of src.match(/OFF\.[A-Z]+\.[A-Z_]+/g) ?? []) expect(IDS.has(id), id).toBe(true);
    for (const c of CONTROLS.filter(c => c.referral)) expect(IDS.has(`REF.${c.referral.toUpperCase().replace(/\s+/g, '_')}`), c.id).toBe(true);
  });

  it('reads as advice: no banned or sales phrase in any offering text', () => {
    const text = JSON.stringify(SOVEREIGN_OFFERINGS.offerings.map(({ indicativeScope, ...o }) => o));
    for (const re of [...BANNED, ...SALES]) expect(text, String(re)).not.toMatch(re);
  });
});

describe('Sovereign IQ Gate S8 over the archetypes', () => {
  for (const x of runs) {
    it(`${x.label}: every finding maps to at least one offering, and the result's help matches the selection`, () => {
      for (const f of x.r.findings) expect(offeringIdsOf(f, x.r.advisory.placement).length, f.id).toBeGreaterThan(0);
      expect(x.r.help).toEqual(howLtmCanHelp(x.r.findings, x.r.advisory.placement));
      const listed = new Set(x.r.help.flatMap(h => h.findingIds));
      const { routes } = sovereignSow(x.r.findings, x.r.advisory.placement);
      const routed = new Set(routes.flatMap(l => l.findingIds));
      for (const f of x.r.findings) expect(listed.has(f.id) || routed.has(f.id), f.id).toBe(true);
    });

    it(`${x.label}: placement rows call for the landing zone (R1-R2 gaps) or migration (sovereign offering needed), one offering per finding`, () => {
      const ids = (id: string) => offeringIdsOf(x.r.findings.find(y => y.id === id)!, x.r.advisory.placement);
      for (const p of x.r.advisory.placement) {
        // S6 challenge Q10: a row that needs a sovereign offering calls for migration through the control a move closes;
        // its other gaps keep their own offering. An R1-R2 gap with no offering of its own calls for the landing zone.
        if (p.status === 'move' && p.findingIds.length) expect(p.findingIds.some(id => ids(id).includes('OFF.SOV.MIGRATION')), `${p.dataClass} ${p.platform}`).toBe(true);
        if (p.status === 'gap' && ['R1', 'R2'].includes(p.minimumRung)) for (const id of p.findingIds) {
          const f = x.r.findings.find(y => y.id === id)!;
          if (!f.offeringRefs.length) expect(ids(id), `${p.dataClass} ${p.platform} ${id}`).toContain('OFF.SOV.LZ');
        }
      }
      for (const f of x.r.findings) expect(offeringIdsOf(f, x.r.advisory.placement).filter(o => o.startsWith('OFF.')).length, f.id).toBeLessThanOrEqual(1);
    });

    it(`${x.label}: no scope, price or route reaches the client; the SOW draft is in the consultant edition only`, () => {
      const cv = clientView(x.r);
      const text = JSON.stringify(cv.help);
      expect(text).not.toMatch(/indicativeScope|weeks|months/);
      expect(cv.help.some(h => h.offering.type === 'Route')).toBe(false);
      for (const re of [...BANNED, ...SALES]) expect(text, String(re)).not.toMatch(re);
      const opts = { client: 'X', preparedBy: 'LTM', dataProvidedBy: 'Client' };
      const client = sovereignIqReport(x.r, { ...opts, view: 'client' });
      const consultant = sovereignIqReport(x.r, { ...opts, view: 'consultant' });
      expect(client.sections.some(s => s.id === 'sow')).toBe(false);
      expect(consultant.sections.some(s => s.id === 'sow')).toBe(x.r.findings.length > 0);
      const shown: string[] = [];
      walkSegments(client, (seg: any) => shown.push(typeof seg === 'string' ? seg : seg.text));
      expect(shown.join(' ')).not.toMatch(/Indicative scope|Statement of work/);
    });
  }
});
