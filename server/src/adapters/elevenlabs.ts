import type { TTSAdapter } from './types.js';
import { config } from '../config.js';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

/**
 * ElevenLabs streaming text-to-speech adapter. Streams audio bytes back so the
 * front end can begin playback before the full clip is synthesized (low latency).
 */
export const elevenlabsTTS: TTSAdapter = {
  contentType: 'audio/mpeg',

  async synthesizeStream(text: string, lang?: 'en' | 'es'): Promise<ReadableStream<Uint8Array>> {
    const voiceId = (lang === 'es' ? config.elevenlabs.voiceIdEs : null) || config.elevenlabs.voiceId;
    if (!voiceId) {
      throw new Error(`ELEVENLABS_VOICE_ID${lang === 'es' ? '_ES' : ''} is not set`);
    }
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'content-type': 'application/json',
          accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: config.elevenlabs.ttsModel,
          voice_settings: { stability: 0.4, similarity_boost: 0.7 },
          ...(lang ? { language_code: lang } : {})
        })
      }
    );
    if (!res.ok || !res.body) {
      throw new Error(`ElevenLabs TTS error ${res.status}: ${await res.text()}`);
    }
    return res.body;
  }
};
