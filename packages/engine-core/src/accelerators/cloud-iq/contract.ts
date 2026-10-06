/**
 * Request contract for POST /api/evaluate/cloud-iq, shared by the Lambda and the tests.
 * Rules come from the knowledge base.
 */
import defaultKb from './knowledge-base.json' with { type: 'json' };
import type { CloudIqInput } from './evaluate';

export type CloudIqParseResult =
  | { ok: true; value: CloudIqInput }
  | { ok: false; errors: string[] };

const isIndex = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const optionLabel = (o: any) => (Array.isArray(o) ? o[0] : typeof o === 'string' ? o : o?.t ?? o?.label);

function answerError(q: any, a: unknown): string | null {
  const n = (q.opts || []).length;
  switch (q.type) {
    case 'single':
      return isIndex(a, n) ? null : `expected an option index 0-${n - 1}`;
    case 'multi':
      if (!Array.isArray(a) || !a.every(i => isIndex(i, n))) return 'expected a list of option indexes';
      return q.max && a.length > q.max ? `expected at most ${q.max} options` : null;
    case 'cards':
      if (q.multi) {
        return Array.isArray(a) && a.every(i => isIndex(i, n)) && a.length <= (q.max ?? n) ? null : `expected up to ${q.max ?? n} option indexes`;
      }
      return isIndex(a, n) ? null : `expected an option index 0-${n - 1}`;
    case 'slider':
      return isIndex(a, (q.scale || []).length) ? null : `expected a scale position 0-${(q.scale || []).length - 1}`;
    case 'rank': {
      const labels = new Set((q.opts || []).map(optionLabel));
      return Array.isArray(a) && a.every(v => labels.has(v)) && new Set(a).size === a.length ? null : 'expected a ranking of option labels';
    }
    case 'tf':
      return typeof a === 'boolean' ? null : 'expected true or false';
    default:
      return `unsupported question type ${q.type}`;
  }
}

export function parseCloudIqRequest(body: unknown, kb: any = defaultKb): CloudIqParseResult {
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

  const raw = b.session && typeof b.session === 'object' ? b.session : {};
  const session: NonNullable<CloudIqInput['session']> = {};
  if (raw.mode !== undefined) {
    if (raw.mode === 'workshop' || raw.mode === 'flash') session.mode = raw.mode;
    else errors.push('session.mode: expected "workshop" or "flash"');
  }
  for (const key of ['clientName', 'consultantLead', 'engagementDate', 'targetHorizon'] as const) {
    if (raw[key] === undefined) continue;
    if (shortText(raw[key], 200)) session[key] = raw[key];
    else errors.push(`session.${key}: expected text up to 200 characters`);
  }
  if (raw.anonymize !== undefined) session.anonymize = Boolean(raw.anonymize);

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, session } };
}
