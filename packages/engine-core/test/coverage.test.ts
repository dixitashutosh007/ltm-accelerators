import { describe, it, expect } from 'vitest';
import { MARKETS, jurisdictionCoverage, marketOf, noRegulatoryCoverage } from '../src/report/coverage';
import { text } from '../src/report/model';
import registry from '../src/accelerators/sovereign-iq/registry/regimes.json' with { type: 'json' };

const segs = (b: any) => text(b.segs);

describe('coverage statement', () => {
  it('names what is covered and what is not, and always tells the reader to take local advice', () => {
    const t = segs(jurisdictionCoverage(['eu', 'uk'], 'Example IQ'));
    expect(t).toContain('Example IQ covers the European Union and the United Kingdom.');
    expect(t).toContain('It does not cover Switzerland');
    expect(t).toContain('local legal advice is needed');
  });

  it('has no digits, as the report checks require', () => {
    expect(segs(jurisdictionCoverage(['eu'], 'X'))).not.toMatch(/\d/);
    expect(segs(noRegulatoryCoverage('X'))).not.toMatch(/\d/);
  });

  it('says so plainly when nothing is covered', () => {
    expect(segs(jurisdictionCoverage([], 'X'))).toContain('does not cover any jurisdiction');
  });

  it('maps every Sovereign IQ registry jurisdiction to a named market, so none is silently dropped', () => {
    const codes = new Set((registry as any).regimes.map((r: any) => String(r.jurisdiction)));
    for (const code of codes) expect(marketOf(code as string), `jurisdiction ${code}`).toBeDefined();
  });

  it('lists Switzerland, Canada, India and the Gulf states as markets a report can say it does not cover', () => {
    const ids = MARKETS.map(m => m.id);
    for (const id of ['ch', 'ca', 'in', 'gcc']) expect(ids).toContain(id);
  });
});
