import type { ChatMessage } from '@access508/core';

/**
 * Provider-swappable adapter contracts. Swapping a provider means implementing
 * one of these interfaces and selecting it in config — no route changes.
 */

export interface LLMAdapter {
  /** Generate a complete answer for the given chat messages. */
  complete(messages: ChatMessage[]): Promise<string>;
  /** Optional streaming variant; routes use it when present for lower latency. */
  stream?(messages: ChatMessage[]): AsyncIterable<string>;
}

export interface STTAdapter {
  /** Transcribe an audio buffer to text. */
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
}

export interface TTSAdapter {
  /** Synthesize text to a streaming audio response (web ReadableStream of bytes). */
  synthesizeStream(text: string, lang?: 'en' | 'es'): Promise<ReadableStream<Uint8Array>>;
  /** MIME type of the produced audio (e.g. "audio/mpeg"). */
  readonly contentType: string;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}
