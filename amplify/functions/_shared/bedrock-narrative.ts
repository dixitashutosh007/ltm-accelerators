/**
 * The Bedrock model behind the AI narrative (shared workstream WS-S1; Sovereign IQ PLAN S9). Claude in Amazon Bedrock
 * through the Messages API on the bedrock-runtime endpoint (AnthropicBedrock, SigV4 with the Lambda role). Region and
 * model come from configuration: Claude Opus 5 on the India geographic inference profile from ap-south-1, so inference
 * stays in Mumbai and Hyderabad (owner decision D29, 27 Oct 2026, replacing D28's eu-west-1).
 * The India profile does not support structured outputs, so the model is asked for a JSON object matching the narrative
 * schema and the text is parsed here; runNarrative checks the shape and the grounding and fails closed either way.
 * Nothing here runs unless the service's AI switch is on. There is no fallback model by default: no other current
 * Claude model is served in-geography from Mumbai, and a fallback outside India would move the data. A refusal returns
 * no text.
 */
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { betaRefusalFallbackMiddleware } from '@anthropic-ai/sdk';
import { NARRATIVE_SCHEMA, type NarrativeModel, type NarrativeOutput } from '../../../packages/engine-core/src/ai/narrative';

export interface BedrockNarrativeConfig {
  /** AWS region the request is made from (D29: ap-south-1). */
  region: string;
  /** Model or inference profile ID, e.g. in.anthropic.claude-opus-5 */
  modelId: string;
  /** Used only when the main model refuses; empty for none (D29: none). */
  fallbackModelId?: string;
}

export function aiConfig(env: NodeJS.ProcessEnv = process.env): (BedrockNarrativeConfig & { enabled: boolean }) {
  return {
    enabled: env.AI_ENABLED === 'true',
    region: env.AI_REGION || 'ap-south-1',
    modelId: env.AI_MODEL_ID || 'in.anthropic.claude-opus-5',
    fallbackModelId: env.AI_FALLBACK_MODEL_ID ?? ''
  };
}

/** Appended to the instructions in place of structured outputs, which the India profile does not support. */
export const JSON_REPLY_INSTRUCTION =
  `Reply with one JSON object and nothing else: no prose before or after it and no code fence. It must match this JSON schema:\n${JSON.stringify(NARRATIVE_SCHEMA)}`;

/** The JSON object in a text reply, or null when there is none to parse. */
export function parseNarrativeJson(text: string): NarrativeOutput | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as NarrativeOutput; }
  catch { return null; }
}

export function bedrockNarrativeModel(cfg: BedrockNarrativeConfig): NarrativeModel {
  const client = new AnthropicBedrock({
    awsRegion: cfg.region,
    maxRetries: 2,
    timeout: 120_000,
    ...(cfg.fallbackModelId ? { middleware: [betaRefusalFallbackMiddleware([{ model: cfg.fallbackModelId }])] } : {})
  });
  return {
    id: cfg.modelId,
    async generate({ system, user }) {
      const res = await client.messages.create({
        model: cfg.modelId,
        max_tokens: 16000,
        // The instructions are stable across calls: cache them.
        system: [
          { type: 'text', text: system },
          { type: 'text', text: JSON_REPLY_INSTRUCTION, cache_control: { type: 'ephemeral' } }
        ],
        messages: [{ role: 'user', content: user }],
        output_config: { effort: 'medium' }
      });
      const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
      return { output: res.stop_reason === 'refusal' ? null : parseNarrativeJson(text), stopReason: res.stop_reason ?? null, modelId: res.model };
    }
  };
}
