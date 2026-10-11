/**
 * Request contract for POST /api/evaluate/posture-iq, shared by the Lambda and the tests.
 * Answers use option values (not indexes). Rules come from the knowledge base.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { PostureIqInput } from './evaluate';

export type PostureIqParseResult =
  | { ok: true; value: PostureIqInput }
  | { ok: false; errors: string[] };

const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

function answerError(q: any, a: unknown): string | null {
  const values = new Set((q.options || []).map((o: any) => o.value));
  switch (q.type) {
    case 'single':
    case 'boolean':
      return values.has(a) ? null : `expected one of ${[...values].join(', ')}`;
    case 'multi':
      return Array.isArray(a) && a.every(v => values.has(v)) ? null : 'expected a list of option values';
    case 'scale': {
      const vs = new Set((q.scale || []).map((s: any) => s.v));
      return vs.has(a) ? null : `expected one of ${[...vs].join(', ')}`;
    }
    case 'matrix': {
      if (!a || typeof a !== 'object' || Array.isArray(a)) return 'expected an object of row -> column';
      const rows = new Set((q.rows || []).map((r: any) => r.id));
      const cols = new Set((q.cols || []).map((c: any) => c.id));
      for (const [r, c] of Object.entries(a as Record<string, unknown>)) {
        if (!rows.has(r)) return `unknown row ${r}`;
        if (!cols.has(c)) return `unknown column for ${r}`;
      }
      return null;
    }
    default:
      return `unsupported question type ${q.type}`;
  }
}

export function parsePostureIqRequest(body: unknown, kb: any = defaultKb): PostureIqParseResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  const answers = b.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, errors: ['"answers" must be an object keyed by question id'] };
  }
  const errors: string[] = [];
  const questions = new Map<string, any>(kb.questions.map((q: any) => [q.id, q]));
  for (const [id, a] of Object.entries(answers)) {
    const q = questions.get(id);
    if (!q) { errors.push(`answers.${id}: unknown question`); continue; }
    if (a === null) continue;
    const err = answerError(q, a);
    if (err) errors.push(`answers.${id}: ${err}`);
  }

  const listOf = (key: 'regulations' | 'sectors', known: Set<string>) => {
    if (b[key] === undefined) return undefined;
    if (!Array.isArray(b[key]) || !b[key].every((x: unknown) => typeof x === 'string' && known.has(x))) {
      errors.push(`${key}: expected a list of ${[...known].join(', ')}`);
      return undefined;
    }
    return b[key] as string[];
  };
  const regulations = listOf('regulations', new Set(kb.regulations.map((r: any) => r.id)));
  const sectors = listOf('sectors', new Set(kb.sectors.map((s: any) => s.id)));

  let mode: PostureIqInput['mode'];
  if (b.mode !== undefined) {
    if (b.mode === 'workshop' || b.mode === 'flash') mode = b.mode;
    else errors.push('mode: expected "workshop" or "flash"');
  }

  const raw = b.org && typeof b.org === 'object' ? b.org : {};
  const org: NonNullable<PostureIqInput['org']> = {};
  if (raw.name !== undefined) { if (shortText(raw.name, 200)) org.name = raw.name; else errors.push('org.name: expected text up to 200 characters'); }
  if (raw.turnover !== undefined && raw.turnover !== null) {
    if (typeof raw.turnover === 'number' && Number.isFinite(raw.turnover) && raw.turnover > 0 && raw.turnover <= 1e13) org.turnover = raw.turnover;
    else errors.push('org.turnover: expected a positive amount');
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, org, regulations, sectors, mode } };
}
