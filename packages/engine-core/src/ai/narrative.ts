/**
 * AI narrative (shared workstream WS-S1): one structured call that re-words an engine result for a reader, behind a
 * model port so the service, the tests and the eval share the flow. The model sees only the redacted input; its
 * output passes the grounding check or is retried once with the violations listed, and is otherwise rejected (fail
 * closed: no AI text is shown). The engine result is never changed.
 */
import { createHash } from 'node:crypto';
import { checkOutput, type GroundingAllow, type Lexicon, type Violation } from './grounding';

export interface NarrativeOutput { summary: string; priorities: string[]; nextSteps: string[] }

/** JSON schema of the output, for structured outputs. */
export const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two or three short paragraphs for the board, separated by blank lines.' },
    priorities: { type: 'array', items: { type: 'string' }, description: 'Three to five priorities, one sentence each.' },
    nextSteps: { type: 'array', items: { type: 'string' }, description: 'Three to five next steps, one sentence each, each with its owner role.' }
  },
  required: ['summary', 'priorities', 'nextSteps'],
  additionalProperties: false
} as const;

export interface ModelReply { output: NarrativeOutput | null; stopReason: string | null; modelId: string }

/** A model behind the flow: Bedrock in the service, a stub in tests and CI. */
export interface NarrativeModel {
  readonly id: string;
  generate(request: { system: string; user: string }): Promise<ModelReply>;
}

export interface NarrativeResult {
  status: 'ok' | 'rejected' | 'error';
  /** Present only when the output passed the grounding check. */
  narrative: NarrativeOutput | null;
  violations: Violation[];
  attempts: number;
  modelId: string;
  generatedAt: string;
  /** SHA-256 of the input given to the model, so a narrative can be matched to the result it describes. */
  inputHash: string;
  error?: string;
}

const shape = (o: any): o is NarrativeOutput =>
  !!o && typeof o.summary === 'string' && Array.isArray(o.priorities) && Array.isArray(o.nextSteps) &&
  o.priorities.every((x: unknown) => typeof x === 'string') && o.nextSteps.every((x: unknown) => typeof x === 'string');

export async function runNarrative(args: {
  system: string; input: unknown; focus?: string; allow: GroundingAllow; lexicon: Lexicon; model: NarrativeModel; now?: () => Date;
}): Promise<NarrativeResult> {
  const { system, input, focus, allow, lexicon, model } = args;
  const json = JSON.stringify(input);
  const inputHash = createHash('sha256').update(json).digest('hex');
  const base = `<result>\n${json}\n</result>${focus ? `\n<consultant_focus>\n${focus}\n</consultant_focus>` : ''}`;
  const done = (r: Omit<NarrativeResult, 'modelId' | 'generatedAt' | 'inputHash'>): NarrativeResult =>
    ({ ...r, modelId: model.id, generatedAt: (args.now ?? (() => new Date()))().toISOString(), inputHash });

  let violations: Violation[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const user = attempt === 1 ? base : `${base}\n<rejected_statements>\nYour previous draft was rejected because these items are not in the result or are not allowed: ${violations.map(v => `"${v.text}" (${v.where})`).join('; ')}. Rewrite it using only what the result contains.\n</rejected_statements>`;
    let reply: ModelReply;
    try { reply = await model.generate({ system, user }); }
    catch (e: any) { return done({ status: 'error', narrative: null, violations: [], attempts: attempt, error: String(e?.name ?? 'model_error') }); }
    if (reply.stopReason === 'refusal') return done({ status: 'error', narrative: null, violations: [], attempts: attempt, error: 'refusal' });
    if (!shape(reply.output)) { violations = [{ kind: 'phrase', text: 'output did not match the schema', where: 'output' }]; continue; }
    violations = checkOutput(reply.output as unknown as Record<string, string | string[]>, allow, lexicon);
    if (!violations.length) return done({ status: 'ok', narrative: reply.output, violations: [], attempts: attempt });
  }
  return done({ status: 'rejected', narrative: null, violations, attempts: 2 });
}
