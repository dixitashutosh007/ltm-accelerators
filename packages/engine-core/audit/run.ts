/**
 * Phase 3 automated scoring audit.
 *   npx tsx packages/engine-core/audit/run.ts            -> writes docs/phase3/AUTOMATED_AUDIT.md and audit-summary.json
 * For each engine it measures:
 *   range        - headline values over random questionnaires vs their declared scale
 *   bands        - how often each band occurs, and whether the best/worst possible answers reach the extremes
 *   sensitivity  - the largest change one answer can make to each headline; "dead" questions that change nothing
 *   missing data - whether leaving questions unanswered moves the result up (flattering) or down
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ADAPTERS, rng, type Adapter } from './adapters';

const N_RANDOM = 800;
const N_BASES = 30;

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${Math.round(v * 100) / 100}`;

interface EngineAudit {
  id: string; name: string;
  ranges: Array<{ headline: string; scale: [number, number]; min: number; max: number; outOfScale: number; nulls: number }>;
  bands?: { counts: Record<string, number>; best: string; worst: string; unreachable: string[] };
  sensitivity: Array<{ headline: string; top: Array<{ qid: string; swing: number }>; share: number }>;
  dead: string[];
  missing: Array<{ headline: string; meanShift: number; worstProfileShift: number }>;
}

function audit(a: Adapter): EngineAudit {
  const r = rng(12345);
  const inputs = Array.from({ length: N_RANDOM }, () => a.random(r));
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
  for (const base of inputs.slice(0, N_BASES)) {
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
    const span = Math.max(1e-9, (ranges.find(r => r.headline === h.name)!.max - ranges.find(r => r.headline === h.name)!.min));
    return { headline: h.name, top: entries.slice(0, 5).map(([qid, swing]) => ({ qid, swing })), share: (entries[0]?.[1] || 0) / span };
  });
  const dead = a.questions.map(q => q.id).filter(id => !touched.has(id));

  // Missing data: drop ~30% of answers and see which way the headline moves.
  const missing = a.headlines.filter(h => h.higherIsBetter !== null).map(h => {
    const rr = rng(777); let sum = 0, n = 0;
    for (const base of inputs.slice(0, 200)) {
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

const audits = ADAPTERS.map(audit);
let md = `# Phase 3 automated scoring audit\n\nGenerated by \`npx tsx packages/engine-core/audit/run.ts\` (${N_RANDOM} random questionnaires per engine; sensitivity from ${N_BASES} base questionnaires, varying one question at a time over all its answers and "unanswered").\n\n`;
md += `How to read it:\n- **Range**: values outside the declared scale are bugs.\n- **Bands**: a band that random answers almost never reach, or that the best or worst possible answers cannot reach, needs recalibration.\n- **Sensitivity**: "largest single-answer swing" is the most one answer can move the headline. "Share" is that swing as a share of the headline's observed range; above about 0.5 means one answer dominates.\n- **Dead questions** change nothing the client sees.\n- **Missing data**: a positive shift means leaving answers blank makes the result look *better* (flattering).\n\n`;
for (const e of audits) {
  md += `## ${e.name}\n\n| Headline | Scale | Observed min | Observed max | Out of scale | Null |\n|---|---|---|---|---|---|\n`;
  for (const r of e.ranges) md += `| ${r.headline} | ${r.scale.map(fmt).join('–')} | ${fmt(r.min)} | ${fmt(r.max)} | ${r.outOfScale} | ${r.nulls} |\n`;
  if (e.bands) {
    md += `\n**Bands** (share of random questionnaires; best answers → **${e.bands.best}**, worst answers → **${e.bands.worst}**${e.bands.unreachable.length ? `; never reached: ${e.bands.unreachable.join(', ')}` : ''}):\n\n| Band | Share |\n|---|---|\n`;
    for (const [b, c] of Object.entries(e.bands.counts)) md += `| ${b} | ${(100 * c / N_RANDOM).toFixed(1)}% |\n`;
  }
  md += `\n**Sensitivity**\n\n| Headline | Largest single-answer swing (question: swing) | Share of range |\n|---|---|---|\n`;
  for (const s of e.sensitivity) md += `| ${s.headline} | ${s.top.map(t => `${t.qid}: ${fmt(t.swing)}`).join(', ')} | ${s.share.toFixed(2)} |\n`;
  md += `\n**Dead questions** (no effect on any headline): ${e.dead.length ? e.dead.join(', ') : 'none'}\n\n`;
  if (e.missing.length) {
    md += `**Missing data** (positive = leaving answers blank flatters the result)\n\n| Headline | Mean shift, 30% unanswered | Worst profile, half unanswered |\n|---|---|---|\n`;
    for (const m of e.missing) md += `| ${m.headline} | ${m.meanShift >= 0 ? '+' : ''}${fmt(m.meanShift)} | ${m.worstProfileShift >= 0 ? '+' : ''}${fmt(m.worstProfileShift)} |\n`;
  }
  md += '\n';
}
const outDir = join(process.cwd(), 'docs/phase3');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'AUTOMATED_AUDIT.md'), md);
writeFileSync(join(outDir, 'audit-summary.json'), JSON.stringify(audits, null, 2) + '\n');
console.log(md);
