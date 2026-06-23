import { request } from 'undici';
import type { ChatMessage } from '@access508/core';
import type { LLMAdapter, STTAdapter, EmbeddingProvider } from './types.js';
import { config } from '../config.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

function authHeaders() {
  return {
    authorization: `Bearer ${config.openai.apiKey}`,
    'content-type': 'application/json'
  };
}

/** OpenAI Chat Completions LLM adapter. */
export const openaiLLM: LLMAdapter = {
  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await request(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: config.openai.llmModel,
        messages,
        temperature: 0.2 // low temperature: factual, grounded answers
      })
    });
    if (res.statusCode >= 400) {
      throw new Error(`OpenAI LLM error ${res.statusCode}: ${await res.body.text()}`);
    }
    const data = (await res.body.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
};

/** OpenAI Whisper speech-to-text adapter. */
export const openaiSTT: STTAdapter = {
  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    // multipart/form-data via the global FormData/Blob (Node >= 18).
    const form = new FormData();
    form.append('model', config.openai.sttModel);
    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('webm') ? 'webm' : 'mp3';
    form.append('file', new Blob([audio], { type: mimeType }), `audio.${ext}`);

    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.openai.apiKey}` },
      body: form
    });
    if (!res.ok) throw new Error(`OpenAI STT error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    return (data.text ?? '').trim();
  }
};

/** OpenAI embeddings — used only when RETRIEVER=embedding. */
export const openaiEmbeddings: EmbeddingProvider = {
  async embed(texts: string[]): Promise<number[][]> {
    const res = await request(`${OPENAI_BASE}/embeddings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ model: config.openai.embedModel, input: texts })
    });
    if (res.statusCode >= 400) {
      throw new Error(`OpenAI embeddings error ${res.statusCode}: ${await res.body.text()}`);
    }
    const data = (await res.body.json()) as any;
    return data.data.map((d: any) => d.embedding as number[]);
  }
};
