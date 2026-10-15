/**
 * Phase 3 scoring audit: the measurements, shared by the report (run.ts) and the CI test
 * (test/finops-iq-v3-audit.test.ts, FinOps IQ plan phase F5). For each engine it measures:
 *   range        - headline values over random questionnaires vs their declared scale
 *   bands        - how often each band occurs, and whether the best/worst possible answers reach the extremes
 *   sensitivity  - the largest change one answer can make to each headline; "dead" questions that change nothing
 *   missing data - whether leaving questions unanswered moves the result up (flattering) or down
 * F5 adds: liveness bases (an adapter's all-at-one-level questionnaires, F3 re-review R4), so a depth question that
 * only bites when every other answer sits at the core level is not reported dead, and CI thresholds per adapter.
 */
import { rng, type Adapter } from './adapters';

export interface AuditOptions { random: number; bases: number; missingBases: number; seed?: number }
export const REPORT_OPTIONS: AuditOptions = { random: 800, bases: 30, missingBases: 200 };

export interface EngineAudit {
  id: string; name: string;
  ranges: Array<{ headline: string; scale: [number, number]; min: number; max: number; outOfScale: number; nulls: number }>;
  bands?: { counts: Record<string, number>; best: string; worst: string; unreachable: string[] };
  sensitivity: Array<{ headline: string; top: Array<{ qid: string; swing: number }>; share: number | null; max: number; byQuestion?: Record<string, number> }>;
  dead: string[];
  missing: Array<{ headline: string; meanShift: number; worstProfileShift: number }>;
}

export function auditEngine(a: Adapter, o: AuditOptions = REPORT_OPTIONS): EngineAudit {
  const r = rng(o.seed ?? 12345);
  const inputs = Array.from({ length: o.random }, () => a.random(r));
  const results = inputs.map(i => a.evaluate(i));

  const ranges = a.headlines.map(h => {
    const vals = results.map((res, k) => h.get(res, inputs[k]));
    const nums = vals.filter((v): v is number => typeof v === 'number');
    return {
      headline: h.name, scale: h.scale,
      min: Math.min(...nums), max: Math.max(...nums),
      outOfScale: nums.filter(v => !Number.isFinite(v) || v < h.scale[0] || v > h.scale[1]).length,
      nulls: vals.length - nums.length
    };
  });

  let bands: EngineAudit['bands'];
  if (a.band) {
    const counts: Record<string, number> = Object.fromEntries(a.band.all.map(b => [b, 0]));
    for (const res of results) { const b = a.band.get(res); counts[b] = (counts[b] || 0) + 1; }
    const best = a.band.get(a.evaluate(a.extremes.best()));
    const worst = a.band.get(a.evaluate(a.extremes.worst()));
    const unreachable = a.band.all.filter(b => !counts[b] && b !== best && b !== worst);
    bands = { counts, best, worst, unreachable };
  }

  // Sensitivity: from each base questionnaire, set one question to each of its possible answers.
  const swings: Record<string, Record<string, number>> = Object.fromEntries(a.headlines.map(h => [h.name, {}]));
  const touched = new Set<string>();
  const bases = [...inputs.slice(0, o.bases), ...(a.livenessBases?.() ?? [])];
  for (const base of bases) {
    const baseRes = a.evaluate(base);
    for (const q of a.questions) {
      const vals: Record<string, number[]> = Object.fromEntries(a.headlines.map(h => [h.name, []]));
      for (const v of a.variants(q.id)) {
        const inp = a.withAnswer(base, q.id, v);
        const res = a.evaluate(inp);
        for (const h of a.headlines) { const x = h.get(res, inp); if (typeof x === 'number' && Number.isFinite(x)) vals[h.name].push(x); }
      }
      const unanswered = a.withoutAnswer(base, q.id);
      const ures = a.evaluate(unanswered);
      for (const h of a.headlines) {
        const x = h.get(ures, unanswered); if (typeof x === 'number' && Number.isFinite(x)) vals[h.name].push(x);
        const b = h.get(baseRes, base); if (typeof b === 'number') vals[h.name].push(b);
        if (!vals[h.name].length) continue;
        const swing = Math.max(...vals[h.name]) - Math.min(...vals[h.name]);
        swings[h.name][q.id] = Math.max(swings[h.name][q.id] || 0, swing);
        if (swing > 1e-9) touched.add(q.id);
      }
    }
  }
  const sensitivity = a.headlines.map(h => {
    const entries = Object.entries(swings[h.name]).sort((x, y) => y[1] - x[1]);
    const range = ranges.find(x => x.headline === h.name)!;
    const span = Math.max(1e-9, range.max - range.min);
    return { headline: h.name, top: entries.slice(0, 5).map(([qid, swing]) => ({ qid, swing })), share: range.max - range.min > 1e-9 ? (entries[0]?.[1] || 0) / span : null, max: entries[0]?.[1] || 0, byQuestion: swings[h.name] };
  });
  const dead = a.questions.map(q => q.id).filter(id => !touched.has(id));

  // Missing data: drop ~30% of answers and see which way the headline moves.
  const missing = a.headlines.filter(h => h.higherIsBetter !== null).map(h => {
    const rr = rng(777); let sum = 0, n = 0;
    for (const base of inputs.slice(0, o.missingBases)) {
      let thinned = base;
      for (const qid of Object.keys(base.answers || {})) if (rr() < 0.3) thinned = a.withoutAnswer(thinned, qid);
      const x0 = h.get(a.evaluate(base), base), x1 = h.get(a.evaluate(thinned), thinned);
      if (typeof x0 === 'number' && typeof x1 === 'number') { sum += x1 - x0; n++; }
    }
    // Worst profile: answer only half of the questions, all at the worst option.
    const worst = a.extremes.worst();
    let half = worst; Object.keys(worst.answers).forEach((qid, i) => { if (i % 2) half = a.withoutAnswer(half, qid); });
    const w0 = h.get(a.evaluate(worst), worst), w1 = h.get(a.evaluate(half), half);
    const sign = h.higherIsBetter ? 1 : -1;
    return { headline: h.name, meanShift: sign * (n ? sum / n : 0), worstProfileShift: sign * ((w1 ?? 0) - (w0 ?? 0)) };
  });

  return { id: a.id, name: a.name, ranges, bands, sensitivity, dead, missing };
}

/**
 * CI thresholds (FinOps IQ plan F5 item 2). Only adapters that declare `thresholds` are gated; the others are
 * reported as before. Returns one line per breach; an empty list passes.
 */
export function thresholdBreaches(a: Adapter, e: EngineAudit): string[] {
  const t = a.thresholds;
  if (!t) return [];
  const out: string[] = [];
  for (const r of e.ranges) if (r.outOfScale) out.push(`${e.id}: ${r.headline} out of scale ${r.outOfScale} times`);
  const allowedDead = new Set(t.allowedDead);
  for (const q of e.dead) if (!allowedDead.has(q)) out.push(`${e.id}: dead question ${q}`);
  if (e.bands?.unreachable.length) out.push(`${e.id}: bands never reached: ${e.bands.unreachable.join(', ')}`);
  for (const m of e.missing) {
    if (m.meanShift > 1e-9) out.push(`${e.id}: missing data flatters ${m.headline} (mean shift ${m.meanShift})`);
    if (m.worstProfileShift > 1e-9) out.push(`${e.id}: missing data flatters ${m.headline} (worst profile ${m.worstProfileShift})`);
  }
  for (const [headline, limit] of Object.entries(t.maxSingleAnswerSwing)) {
    const s = e.sensitivity.find(x => x.headline === headline);
    if (!s) { out.push(`${e.id}: no headline ${headline}`); continue; }
    for (const [qid, swing] of Object.entries(s.byQuestion ?? {})) {
      const max = typeof limit === 'function' ? limit(qid) : limit;
      if (swing > max + 1e-9) out.push(`${e.id}: one answer (${qid}) moves ${headline} by ${swing} (limit ${max})`);
    }
  }
  return out;
}
