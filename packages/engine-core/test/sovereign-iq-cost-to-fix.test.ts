/**
 * Cost to fix (portfolio review 2026-11-08, item 2.3; owner decisions 11 Nov 2026): each control gap's effort band in
 * FTE-months times a blended rate, the LTM default of EUR 10,000 per FTE-month unless the client gives its own (W4).
 * Shown in both editions, labelled as an estimate, with the arithmetic in the appendix; the total is the sum of the
 * actions, and the waves add up to it.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { evaluateSovereignIqV4, sovereignIqReport, sovereignIqBacklog, clientView } from '../src/accelerators/sovereign-iq/v4';
import { checkSovereignIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';
import delivery from '../src/accelerators/sovereign-iq/v4/delivery.json' with { type: 'json' };
import assumptions from '../src/accelerators/sovereign-iq/v4/assumptions.json' with { type: 'json' };
import fx from '../src/accelerators/sovereign-iq/v4/exchange-rates.json' with { type: 'json' };

const DATE = '2026-11-11';
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const ARC = JSON.parse(readFileSync(new URL('../../../docs/cio-readiness/sovereign-iq/design/archetypes.json', import.meta.url), 'utf8')).archetypes as Array<{ id: string; answers: any }>;
const bank = ARC.find(a => a.id === 'ARC1_EU_BANK_DORA')!.answers;
const run = (answers: any, mode: 'executive' | 'workshop' = 'workshop') => evaluateSovereignIqV4({ mode, answers, assessmentDate: DATE });
const text = (doc: ReportDocument, id: string) => {
  const out: string[] = [];
  walkSegments(doc, (s, sec) => { if (sec.id === id) out.push(typeof s === 'string' ? s : s.text); });
  return out.join('');
};
const FTE = (delivery as any).costing.fteMonthsByEffort as Record<string, [number, number]>;
const ASM = (assumptions as any).assumptions as any[];

describe('Sovereign IQ cost to fix', () => {
  it('the assumption register states the constants the code uses', () => {
    expect(ASM.find(a => a.id === 'ASM-SOV-015').value).toContain(Object.entries(FTE).map(([e, [lo, hi]]) => `${e} ${lo} to ${hi}`).join('; '));
    expect((delivery as any).costing.defaultRate).toEqual({ amount: 10000, currency: 'EUR' });
    expect(ASM.find(a => a.id === 'ASM-SOV-016').value).toMatch(/^EUR 10,000 per FTE-month/);
  });

  it('prices each control gap from its effort band at the LTM default, and only control gaps', () => {
    const r = run(bank, 'executive');
    expect(r.costToFix.currency).toBe('EUR');
    expect(r.costToFix.rate).toEqual({ amount: 10000, source: 'ltm_default', conversion: null });
    for (const f of r.findings) {
      if (f.type !== 'control_gap') { expect(f.cost).toBeNull(); continue; }
      expect(f.cost!.fteMonths).toEqual(FTE[f.effort]);
      expect(f.cost!.amount).toEqual(FTE[f.effort].map(n => n * 10000));
    }
    const gaps = r.findings.filter(f => f.cost);
    expect(r.costToFix.actions).toBe(gaps.length);
    expect(r.costToFix.total).toEqual([0, 1].map(i => gaps.reduce((a, f) => a + f.cost!.amount[i], 0)));
    expect(r.costToFix.fteMonths).toEqual([0, 1].map(i => gaps.reduce((a, f) => a + f.cost!.fteMonths[i], 0)));
    expect(r.costToFix.total[0]).toBeGreaterThan(0);
  });

  it('uses the client\'s own rate, in its currency, when given in the workshop', () => {
    const r = run({ ...bank, W4: { rate_per_fte_month: { amount: 18000, currency: 'GBP' } } });
    expect(r.costToFix.currency).toBe('GBP');
    expect(r.costToFix.rate).toEqual({ amount: 18000, source: 'client', conversion: null });
    for (const f of r.findings.filter(x => x.cost)) expect(f.cost!.amount).toEqual(FTE[f.effort].map(n => Math.round(n * 18000)));
  });

  it('converts the default into the currency of a turnover given in another currency, rounded to 100', () => {
    const r = run({ ...bank, A5: { turnover_amount: { amount: 2e9, currency: 'USD' }, balance_sheet_band_eur: 'gt43m' } });
    const usd = (fx as any).rates.USD.rate;
    expect(r.costToFix.currency).toBe('USD');
    expect(r.costToFix.rate.amount).toBe(Math.round(10000 * usd / 100) * 100);
    expect(r.costToFix.rate.conversion).toEqual({ eurAmount: 10000, fxRate: usd, rateDate: (fx as any).date });
    expect(r.costToFix.claims).toEqual([(fx as any).rates.USD.claim]);
  });

  it('a W4 answer outside the workshop is ignored', () => {
    const r = run({ ...bank, W4: { rate_per_fte_month: { amount: 18000, currency: 'GBP' } } }, 'executive');
    expect(r.costToFix.rate.source).toBe('ltm_default');
  });

  it.each(['client', 'consultant'] as const)('the %s edition shows the estimate, labelled, with the waves adding up to the total, and passes the report checks', view => {
    const r = run(bank);
    const doc = sovereignIqReport(r, { ...OPTS, view });
    expect(checkSovereignIqReport(doc, r, view, DATE).failures).toEqual([]);
    const kpi = doc.sections[0].blocks.flatMap((b: any) => (b.kind === 'kpis' ? b.items : [])).find((i: any) => i.label === 'Estimated cost to fix');
    expect(kpi.value.map((s: any) => (typeof s === 'string' ? s : s.text)).join('')).toBe('EUR 265k to EUR 740k');
    expect(text(doc, 'summary')).toMatch(/not an LTM price; discovery and a statement of work replace it/);
    expect(text(doc, 'calculation')).toContain('Rate: EUR 10,000 per FTE-month, LTM\'s default rate (ASM-SOV-016)');
    const waves: number[][] = [];
    walkSegments(doc, s => { if (typeof s !== 'string' && s.trace) { const m = /^report:roadmap\.wave\[(\d+)\]\.cost\[(\d)\]$/.exec(s.trace.field); if (m) (waves[+m[1]] ??= [])[+m[2]] = s.trace.value; } });
    expect([0, 1].map(i => waves.filter(Boolean).reduce((a, w) => a + w[i], 0))).toEqual(r.costToFix.total);
  });

  it('an action\'s cost that differs from the engine fails the trace check (R2)', () => {
    const r = run(bank);
    const doc = sovereignIqReport(r, { ...OPTS, view: 'client' });
    const id = r.findings.find(f => f.cost)!.id;
    walkSegments(doc, s => { if (typeof s !== 'string' && s.trace?.field === `findings[${id}].cost[1]`) s.trace.value += 1000; });
    expect(checkSovereignIqReport(doc, r, 'client', DATE).failures.some(f => f.check === 'R2' && f.detail.includes(id))).toBe(true);
  });

  it('the client view and the backlog carry the estimate', () => {
    const r = run(bank);
    expect(clientView(r).costToFix).toEqual(r.costToFix);
    const b = sovereignIqBacklog(r, 'client');
    const lo = b.header.indexOf('Estimated cost (low)'), cur = b.header.indexOf('Cost currency');
    const gap = r.findings.find(f => f.cost)!;
    const row = b.rows.find(x => x[0] === gap.id)!;
    expect([row[lo], row[cur]]).toEqual([gap.cost!.amount[0], 'EUR']);
  });

  it('with no control gaps there is nothing to cost', () => {
    const r = run({ A1: 'ch', A2: { entity: ['ch'], people: ['ch'] }, A3: 'banking', D1: [] }, 'executive');
    expect(r.costToFix.actions).toBe(r.findings.filter(f => f.type === 'control_gap').length);
    if (!r.costToFix.actions) expect(r.costToFix.total).toEqual([0, 0]);
  });
});
