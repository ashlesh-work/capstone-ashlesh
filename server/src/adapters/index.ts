/**
 * Adapter factory — resolves the configured provider for each capability.
 * This is the single seam where providers are swapped. To add a provider:
 * implement the matching interface in ./<provider>.ts and add a case here.
 */
import type { LLMAdapter, STTAdapter, TTSAdapter, EmbeddingProvider } from './types.js';
import { openaiLLM, openaiSTT, openaiEmbeddings } from './openai.js';
import { elevenlabsTTS } from './elevenlabs.js';
import { config } from '../config.js';

export function getLLM(): LLMAdapter {
  switch (config.providers.llm) {
    case 'openai':
      return openaiLLM;
    default:
      throw new Error(`Unknown LLM provider: ${config.providers.llm}`);
  }
}

export function getSTT(): STTAdapter {
  switch (config.providers.stt) {
    case 'openai':
      return openaiSTT;
    // 'openai-realtime' would return a Realtime-based adapter here (same interface).
    default:
      throw new Error(`Unknown STT provider: ${config.providers.stt}`);
  }
}

export function getTTS(): TTSAdapter {
  switch (config.providers.tts) {
    case 'elevenlabs':
      return elevenlabsTTS;
    default:
      throw new Error(`Unknown TTS provider: ${config.providers.tts}`);
  }
}

export function getEmbeddings(): EmbeddingProvider {
  // Currently only OpenAI embeddings; swap here when adding providers.
  return openaiEmbeddings;
}

export type { LLMAdapter, STTAdapter, TTSAdapter, EmbeddingProvider };
