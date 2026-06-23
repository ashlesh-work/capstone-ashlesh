import type { FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';
import type { TTSAdapter } from '../adapters/index.js';
import { allow } from '../lib/rateLimit.js';
import { log } from '../lib/logger.js';

interface TtsBody {
  text?: string;
  lang?: 'en' | 'es';
}

/**
 * POST /api/tts
 * Body: { text: string, lang?: 'en' | 'es' }
 * Returns: streamed audio bytes (audio/mpeg).
 *
 * Audio is additive: the same text is always shown in the transcript, so a TTS
 * failure never blocks the conversation — the client still has the text.
 */
export function registerTtsRoute(app: FastifyInstance, tts: TTSAdapter): void {
  app.post<{ Body: TtsBody }>('/api/tts', async (req, reply) => {
    const ip = req.ip || 'unknown';
    if (!allow(ip)) {
      return reply.code(429).send({ error: 'Too many requests. Please wait a moment.' });
    }

    const text = (req.body?.text ?? '').toString().trim();
    const lang = req.body?.lang;
    if (!text) return reply.code(400).send({ error: 'Text is required.' });
    if (text.length > 5000) return reply.code(400).send({ error: 'Text is too long.' });

    try {
      const webStream = await tts.synthesizeStream(text, lang);
      reply.header('content-type', tts.contentType);
      reply.header('cache-control', 'no-store');
      // Bridge the web ReadableStream to a Node stream for Fastify.
      return reply.send(Readable.fromWeb(webStream as any));
    } catch (err) {
      log.error('tts.error', { message: (err as Error).message });
      return reply.code(502).send({ error: 'Voice playback is unavailable right now.' });
    }
  });
}
