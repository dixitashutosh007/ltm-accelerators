/**
 * How far an assessment has got (platform workstream P3), kept as metadata for "My sessions" and the activity screen.
 * The page sends `progress: { stage, percent }` beside the snapshot; it is advisory, so it is cut to size and range here
 * and never decides access. A completed assessment is always "Completed" at 100, whatever the page sent.
 */
export interface Progress { stage?: string; percent?: number }

const MAX_STAGE = 80;

export function progressFor(status: string, raw: unknown): Progress {
  if (status === 'completed') return { stage: 'Completed', percent: 100 };
  if (status === 'archived') return {};
  const p = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const out: Progress = {};
  // Control characters are dropped: the stage is shown in tables and written to CSV.
  const stage = typeof p.stage === 'string' ? p.stage.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_STAGE) : '';
  if (stage) out.stage = stage;
  if (typeof p.percent === 'number' && Number.isFinite(p.percent)) out.percent = Math.max(0, Math.min(100, Math.round(p.percent)));
  return out;
}
