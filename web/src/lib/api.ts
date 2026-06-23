import type { Citation } from '@access508/core';

export interface ChatResponse {
  mode: 'grounded' | 'fallback' | 'refuse';
  answer: string;
  citations: Citation[];
}

/** Ask the assistant a question. The server runs RAG + grounding + citations. */
export async function postChat(question: string, lang?: 'en' | 'es'): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question, lang })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'The assistant is unavailable.');
  }
  return res.json();
}

/** Transcribe recorded audio to text (shown to the user to confirm). */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const res = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'content-type': audio.type || 'audio/webm' },
    body: audio
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not transcribe audio.');
  }
  const data = await res.json();
  return (data.text ?? '').trim();
}

/** Synthesize speech for the given text; returns an object URL for playback. */
export async function synthesizeSpeech(text: string, lang?: 'en' | 'es'): Promise<string> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, lang })
  });
  if (!res.ok) throw new Error('Voice playback is unavailable.');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
