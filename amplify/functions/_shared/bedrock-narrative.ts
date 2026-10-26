/**
 * The Bedrock model behind the AI narrative (shared workstream WS-S1; Sovereign IQ PLAN S9). Claude in Amazon Bedrock
 * through the Messages API (AnthropicBedrockMantle, SigV4 with the Lambda role), structured output against the
 * narrative schema. Region and model come from configuration: in-region eu-west-1 (owner decision D28, 26 Oct 2026).
 * Nothing here runs unless the service's AI switch is on. A refusal falls back once to the configured fallback
 * model (client-side middleware: Bedrock has no server-side fallback); a refusal from both returns no text.
 */
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import { betaRefusalFallbackMiddleware } from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { NARRATIVE_SCHEMA, type NarrativeModel, type NarrativeOutput } from '../../../packages/engine-core/src/ai/narrative';

export interface BedrockNarrativeConfig {
  /** AWS region of the Bedrock endpoint (D14). */
  region: string;
  /** e.g. anthropic.claude-opus-5-5 */
  modelId: string;
  /** Used only when the main model refuses; empty for none. */
  fallbackModelId?: string;
}

export function aiConfig(env: NodeJS.ProcessEnv = process.env): (BedrockNarrativeConfig & { enabled: boolean }) {
  return {
    enabled: env.AI_ENABLED === 'true',
    region: env.AI_REGION || 'eu-west-1',
    modelId: env.AI_MODEL_ID || 'anthropic.claude-opus-5-5',
    fallbackModelId: env.AI_FALLBACK_MODEL_ID ?? 'anthropic.claude-opus-4-8'
  };
}

export function bedrockNarrativeModel(cfg: BedrockNarrativeConfig): NarrativeModel {
  const client = new AnthropicBedrockMantle({
    awsRegion: cfg.region,
    maxRetries: 2,
    timeout: 120_000,
    ...(cfg.fallbackModelId ? { middleware: [betaRefusalFallbackMiddleware([{ model: cfg.fallbackModelId }])] } : {})
  });
  return {
    id: cfg.modelId,
    async generate({ system, user }) {
      const res = await client.beta.messages.parse({
        model: cfg.modelId,
        max_tokens: 16000,
        // The instructions are stable across calls: cache them.
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
        output_config: { effort: 'medium', format: jsonSchemaOutputFormat(NARRATIVE_SCHEMA) }
      });
      return { output: (res.parsed_output as NarrativeOutput | null) ?? null, stopReason: res.stop_reason ?? null, modelId: res.model };
    }
  };
}
