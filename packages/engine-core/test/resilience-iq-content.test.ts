/**
 * Resilience IQ RQ2 content (docs/cio-readiness/resilience-iq/PLAN.md, RQ2): the obligation records against the RQ1
 * schema and Sovereign IQ's condition language, the question basis, the assumption register and the shared language
 * lint additions. The v2 engine reads these files from RQ3; until then these tests keep them consistent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { evaluateCondition, type Condition } from '../src/accelerators/sovereign-iq/v4';
import sovRegistry from '../src/accelerators/sovereign-iq/registry/regimes.json' with { type: 'json' };
import register from '../src/claims/claims-register.json' with { type: 'json' };
import banned from '../src/report-checks/banned-phrases.json' with { type: 'json' };
import obligations from '../src/accelerators/resilience-iq/registry/obligations.json' with { type: 'json' };
import basis from '../src/accelerators/resilience-iq/registry/question-basis.json' with { type: 'json' };
import assumptions from '../src/accelerators/resilience-iq/registry/assumptions.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const DOCS = join(__dirname, '../../../docs/cio-readiness');
const CLAIMS = new Map((register as any).claims.map((c: any) => [c.id, c]));
const PREDICATES = (sovRegistry as any).predicates as Record<string, Condition>;
const regimes = (obligations as any).regimes as any[];

describe('Resilience IQ obligations (DESIGN.md section 7, Q14)', () => {
  it('validate against the RQ1 obligation schema with Sovereign IQ condition language', () => {
    const Ajv2020 = require('ajv/dist/2020').default;
    const ajv = new Ajv2020({ allErrors: true, strict: false, logger: false });
    for (const f of ['facts.schema.json', 'regime.schema.json']) ajv.addSchema(JSON.parse(readFileSync(join(DOCS, 'sovereign-iq/design', f), 'utf8')));
    const validate = ajv.compile(JSON.parse(readFileSync(join(DOCS, 'resilience-iq/design/obligation.schema.json'), 'utf8')));
    const { $comment, ...data } = obligations as any;
    expect(validate(data) ? [] : validate.errors).toEqual([]);
  });

  it('cover the six v1 regimes plus the MAS TRM floor, reusing Sovereign IQ records where they exist', () => {
    expect(regimes.map(r => r.regime).sort()).toEqual(['AU_APRA_CPS230', 'EU_DORA', 'SG_MAS_BCM', 'SG_MAS_TRM', 'UK_OPRES', 'US_FFIEC_BCM', 'US_NYDFS_500']);
    const sovIds = new Set((sovRegistry as any).regimes.map((r: any) => r.id));
    for (const r of regimes) {
      if (r.applicability.source === 'sovereign_registry') expect(sovIds.has(r.applicability.regime)).toBe(true);
      else expect(['SG_MAS_BCM', 'US_FFIEC_BCM']).toContain(r.regime);
    }
  });

  it('Resilience-owned applicability rules fire on their facts and not otherwise', () => {
    const rule = (reg: string, id: string) => regimes.find(r => r.regime === reg).applicability.rules.find((x: any) => x.id === id).when;
    const ev = (c: Condition, facts: Record<string, unknown>) => evaluateCondition(c, { facts, predicates: PREDICATES });
    expect(ev(rule('SG_MAS_BCM', 'SG_MAS_BCM.1'), { 'ent.flags': ['sg_mas_licensed'] })).toBe(true);
    expect(ev(rule('SG_MAS_BCM', 'SG_MAS_BCM.1'), { 'ent.flags': ['au_apra_regulated'] })).toBe(false);
    expect(ev(rule('SG_MAS_BCM', 'SG_MAS_BCM.2'), { 'org.establishments': ['sg'], 'org.sector': 'banking' })).toBe(true);
    expect(ev(rule('US_FFIEC_BCM', 'US_FFIEC_BCM.1'), { 'ent.flags': ['us_federal_banking_supervised'] })).toBe(true);
    expect(ev(rule('US_FFIEC_BCM', 'US_FFIEC_BCM.1'), { 'ent.flags': ['us_glba_fi'] })).toBe(false);
    expect(ev(rule('US_FFIEC_BCM', 'US_FFIEC_BCM.2'), { 'org.establishments': ['us'], 'org.sector': 'banking', 'ent.flags': ['us_federal_banking_supervised'] })).toBe(false);
  });

  it('every obligation cites claims; only UNSOURCED obligations rely on UNSOURCED claims; dates are stated', () => {
    for (const r of regimes) for (const o of r.obligations) {
      expect(o.claims?.length, o.id).toBeGreaterThan(0);
      for (const id of o.claims) {
        const c: any = CLAIMS.get(id);
        expect(c, `${o.id} -> ${id}`).toBeTruthy();
        if (c.verification === 'UNSOURCED') expect(o.verification.status, o.id).toBe('UNSOURCED');
      }
      if (o.dateState === 'applies_later') expect(o.appliesFrom > (obligations as any).statusAsOf).toBe(true);
      if (o.kind !== 'guideline') expect(o.appliesFrom, o.id).toBeTruthy();
    }
  });

  it('never call a status compliant', () => {
    expect(JSON.stringify(obligations)).not.toMatch(/\b(non-)?compliant\b/i);
  });
});

describe('Resilience IQ question basis (DESIGN.md section 12)', () => {
  const qs = (basis as any).questions as any[];
  it('lists every v2 question once: 20 executive, 29 advisory kept or reworded, 9 new; 3 retired', () => {
    const ids = qs.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(i => i.startsWith('EX-'))).toHaveLength(20);
    expect(ids.filter(i => i.startsWith('AF-'))).toHaveLength(29);
    expect(qs.filter(q => q.map === 'new')).toHaveLength(9);
    expect((basis as any).retired).toEqual(['AF-BIA-01', 'AF-CY-03', 'AF-CY-05']);
    for (const r of (basis as any).retired) expect(ids).not.toContain(r);
  });
  it('every scored or requirement question cites at least one client-visible, sourced claim', () => {
    for (const q of qs) {
      for (const id of q.claimIds) expect(CLAIMS.has(id), `${q.id} -> ${id}`).toBe(true);
      if (['scored', 'requirement'].includes(q.role)) {
        const visible = q.claimIds.map((id: string) => CLAIMS.get(id) as any).filter((c: any) => c.clientVisible !== false && c.verification !== 'UNSOURCED');
        expect(visible.length, q.id).toBeGreaterThan(0);
      }
      if (!q.claimIds.length) expect(q.note, q.id).toBeTruthy();
    }
  });
});

describe('Resilience IQ assumption register (FRAMEWORK area 13(b))', () => {
  const list = (assumptions as any).assumptions as any[];
  it('holds validation 4.4 A1-A24 and the design heuristics, each with value, basis, confidence, sensitivity and claims', () => {
    expect(list.filter(a => a.legacyId).map(a => a.legacyId)).toEqual(Array.from({ length: 24 }, (_, i) => `A${i + 1}`));
    expect(new Set(list.map(a => a.id)).size).toBe(list.length);
    for (const a of list) {
      for (const k of ['title', 'value', 'reasoning', 'sensitivity']) expect(a[k], `${a.id}.${k}`).toBeTruthy();
      expect(Object.keys((assumptions as any).basisValues)).toContain(a.basis);
      expect(Object.keys((assumptions as any).statusValues)).toContain(a.status);
      expect(['Low', 'Medium', 'High']).toContain(a.confidence);
      expect(a.claimIds.length, a.id).toBeGreaterThan(0);
      for (const id of a.claimIds) expect(CLAIMS.has(id), `${a.id} -> ${id}`).toBe(true);
    }
  });
  it('A9 is grounded in DORA Art. 11(6), CPS 230 para 43 and NYDFS 500.16(d)', () => {
    const a9 = list.find(a => a.legacyId === 'A9');
    const articles = a9.claimIds.map((id: string) => (CLAIMS.get(id) as any).source?.article ?? '').join(' | ');
    expect(a9.basis).toBe('published_source');
    expect(articles).toMatch(/Art\. 11\(6\)/);
    expect(articles).toMatch(/paras 43-44/);
    expect(articles).toMatch(/500\.16\(d\)/);
  });
  it('the design decision matrix has no unassigned claim IDs left', () => {
    expect(readFileSync(join(DOCS, 'resilience-iq/design/decision-matrix.json'), 'utf8')).not.toMatch(/CLM-RES-TBD/);
  });
});

describe('shared language lint additions (RQ2 item 5)', () => {
  const phrases = (banned as any).phrases.map((p: any) => new RegExp(p.pattern, p.flags));
  const hit = (t: string) => phrases.some((re: RegExp) => re.test(t));
  it.each([
    'Your recovery is guaranteed.', 'The bank is compliant with DORA.', 'An LTM-certified recovery design.', 'Zero downtime failover.',
    'An unbreakable recovery chain.', 'Ransomware-proof backups.', 'Your backups are immutable.', 'Recoverable savings.'
  ])('fires on "%s"', t => expect(hit(t)).toBe(true));
  it.each([
    'Backups are immutable (retention-locked so no administrator can shorten them).', 'Retention-locked (immutable), restore not tested',
    'An immutable or offline backup of crucial data.', 'Control RES.BACKUP.IMMUTABLE', 'Control RES.BACKUP.RECOVERABLE',
    'The DPF covers certified US recipients.', 'Indicative status from your answers; not a compliance opinion.'
  ])('passes "%s"', t => expect(hit(t)).toBe(false));
  it('codes are never headings', () => {
    const headings = ((banned as any).headingPatterns as any[]).map(p => new RegExp(p.pattern, p.flags));
    const bad = (h: string) => headings.some(re => re.test(h));
    expect(['DR-03', 'G-05 Cyber recovery gap', 'RES.CYBER.ISOLATION', 'EX-09']).toEqual(['DR-03', 'G-05 Cyber recovery gap', 'RES.CYBER.ISOLATION', 'EX-09'].filter(bad));
    expect(['Warm standby (a smaller copy always running)', 'Cyber recovery', 'Regulatory obligations'].filter(bad)).toEqual([]);
  });
});
