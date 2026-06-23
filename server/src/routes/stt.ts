import type { FastifyInstance } from 'fastify';
import type { STTAdapter } from '../adapters/index.js';
import { allow } from '../lib/rateLimit.js';
import { log } from '../lib/logger.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — matches typical STT upload limits

/**
 * POST /api/stt
 * Body: raw audio bytes (Content-Type: audio/webm | audio/wav | audio/mpeg)
 * Returns: { text }
 *
 * The recognized text is returned to the client so it can be shown in the
 * transcript for the user to confirm BEFORE any irreversible action.
 */
export function registerSttRoute(app: FastifyInstance, stt: STTAdapter): void {
  // Accept binary audio bodies up to the configured limit.
  app.addContentTypeParser(
    ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'application/octet-stream'],
    { parseAs: 'buffer', bodyLimit: MAX_AUDIO_BYTES },
    (_req, body, done) => done(null, body)
  );

  app.post('/api/stt', async (req, reply) => {
    const ip = req.ip || 'unknown';
    if (!allow(ip)) {
      return reply.code(429).send({ error: 'Too many requests. Please wait a moment.' });
    }

    const audio = req.body as Buffer;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      return reply.code(400).send({ error: 'Audio body is required.' });
    }
    const mime = (req.headers['content-type'] ?? 'audio/webm').split(';')[0];

    try {
      const text = await stt.transcribe(audio, mime);
      return reply.send({ text });
    } catch (err) {
      log.error('stt.error', { message: (err as Error).message });
      return reply
        .code(502)
        .send({ error: 'Could not transcribe audio. Try again or type your message.' });
    }
  });
}
