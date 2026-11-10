/**
 * Coverage guard (portfolio review 2026-11-08, Phase 0.1): a client headquartered, operating or holding personal data
 * outside the regulation registry is told so in the result, both editions of the report and the client view. "No
 * regulation applies" never stands alone for a place the assessment does not cover.
 */
import { describe, it, expect } from 'vitest';
import { evaluateSovereignIqV4, sovereignIqReport, clientView } from '../src/accelerators/sovereign-iq/v4';
import { checkSovereignIqReport } from '../src/report-checks/accelerators';
import { walkSegments, type ReportDocument } from '../src/report/model';

const DATE = '2026-11-10';
const OPTS = { client: 'Example Client', preparedBy: 'LTM consultant', dataProvidedBy: 'Example Client' };
const run = (answers: any, mode: 'executive' | 'workshop' = 'executive') => evaluateSovereignIqV4({ mode, answers, assessmentDate: DATE });
const bank = (zone: string) => ({ A1: zone, A2: { entity: [zone], people: [zone] }, A3: 'banking', D1: ['personal', 'financial'] });
const summaryText = (doc: ReportDocument) => {
  const out: string[] = [];
  walkSegments(doc, (s, sec) => { if (sec.id === 'summary') out.push(typeof s === 'string' ? s : s.text); });
  return out.join('');
};

describe('Sovereign IQ coverage guard', () => {
  it.each(['ch', 'ca', 'other'])('a footprint only in %s is "not assessed", never a bare zero', zone => {
    const r = run(bank(zone));
    expect(r.jurisdictions.none).toBe(true);
    expect(r.jurisdictions.notAssessed.map(x => x.zone)).toEqual([zone]);
    expect(r.exposure.summary).toMatch(/^Not assessed: /);
    expect(r.exposure.summary).not.toMatch(/0 regimes apply/);
    const f = r.findings.find(x => x.id === 'F-SCOPE-COVERAGE')!;
    expect(f.severity).toBe('Critical');
    expect(f.consultantOnly).toBe(false);
    expect(r.findings[0].id).toBe('F-SCOPE-COVERAGE');
  });

  it('a partly covered footprint grades the covered places and names the rest', () => {
    const r = run({ A1: 'uk', A2: { entity: ['uk', 'ch'], people: ['uk', 'ca'] }, A3: 'banking', D1: ['personal'] });
    expect(r.jurisdictions.none).toBe(false);
    expect(r.jurisdictions.notAssessed.map(x => x.name)).toEqual(['Switzerland', 'Canada']);
    expect(r.regimes.some(g => g.regime === 'UK_GDPR' && g.grade === 'applies')).toBe(true);
    expect(r.exposure.summary).toMatch(/^Not assessed for Switzerland and Canada \(outside this assessment\)\. /);
    expect(r.findings.find(x => x.id === 'F-SCOPE-COVERAGE')!.severity).toBe('High');
  });

  it('a covered footprint is unchanged', () => {
    const r = run(bank('eea'));
    expect(r.jurisdictions).toMatchObject({ notAssessed: [], none: false });
    expect(r.findings.some(x => x.id === 'F-SCOPE-COVERAGE')).toBe(false);
    expect(r.exposure.summary).not.toMatch(/Not assessed/);
  });

  it('the covered list comes from the registry', () => {
    const { covered } = run(bank('eea')).jurisdictions;
    expect(covered).toEqual(expect.arrayContaining(['EU or EEA', 'United Kingdom', 'United States', 'India', 'Singapore']));
    expect(covered).not.toContain('Switzerland');
    expect(covered).not.toContain('Canada');
  });

  it.each(['client', 'consultant'] as const)('the %s edition leads with the warning and passes the report checks', view => {
    for (const answers of [bank('ch'), { A1: 'uk', A2: { entity: ['uk', 'ch'], people: ['uk'] }, A3: 'banking', D1: ['personal'] }]) {
      for (const mode of ['executive', 'workshop'] as const) {
        const r = run(answers, mode);
        const doc = sovereignIqReport(r, { ...OPTS, view });
        const first = doc.sections.find(s => s.id === 'summary')!.blocks[0] as any;
        expect(first.kind).toBe('callout');
        expect(first.title).toBe('Outside this assessment');
        const t = summaryText(doc);
        expect(t).toContain('Switzerland');
        if (r.jurisdictions.none) {
          expect(t).toContain('not because none applies');
          expect(t).not.toMatch(/On your answers, /);
        }
        expect(checkSovereignIqReport(doc, r, view, DATE).failures).toEqual([]);
      }
    }
  });

  it('the client view carries the guard', () => {
    const v = clientView(run(bank('ca')));
    expect(v.jurisdictions).toMatchObject({ none: true, notAssessed: [{ zone: 'ca', name: 'Canada' }] });
    expect(v.findings.some(f => f.id === 'F-SCOPE-COVERAGE')).toBe(true);
  });
});
