/**
 * The Bedrock narrative model's configuration and reply parsing (owner decision D29): inference on the India profile
 * from Mumbai with no fallback outside India, and the JSON reply read from text because the India profile has no
 * structured outputs. The model call itself is exercised by the live eval.
 */
import { describe, it, expect } from 'vitest';
import { aiConfig, parseNarrativeJson, JSON_REPLY_INSTRUCTION } from './bedrock-narrative';
import { NARRATIVE_SCHEMA } from '../../../packages/engine-core/src/ai/narrative';

describe('Bedrock narrative model (D29)', () => {
  it('defaults to the India profile from Mumbai, off, with no fallback model', () => {
    expect(aiConfig({})).toEqual({ enabled: false, region: 'ap-south-1', modelId: 'in.anthropic.claude-opus-5', fallbackModelId: '' });
  });

  it('asks for JSON matching the narrative schema', () => {
    expect(JSON_REPLY_INSTRUCTION).toContain(JSON.stringify(NARRATIVE_SCHEMA));
  });

  it('reads the JSON object from the reply, tolerating text or a code fence around it', () => {
    const out = { summary: 'S', priorities: ['P'], nextSteps: ['N'] };
    expect(parseNarrativeJson(JSON.stringify(out))).toEqual(out);
    expect(parseNarrativeJson('Here it is:\n```json\n' + JSON.stringify(out) + '\n```')).toEqual(out);
  });

  it('returns null when there is no JSON object to read, so the flow retries or fails closed', () => {
    expect(parseNarrativeJson('')).toBeNull();
    expect(parseNarrativeJson('No result.')).toBeNull();
    expect(parseNarrativeJson('{"summary": "cut off')).toBeNull();
  });
});
