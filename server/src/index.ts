import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { config, assertProviderKeys } from './config.js';
import { initRag } from './rag/index.js';
import { getLLM, getSTT, getTTS } from './adapters/index.js';
import { registerChatRoute } from './routes/chat.js';
import { registerSttRoute } from './routes/stt.js';
import { registerTtsRoute } from './routes/tts.js';
import { registerIntentRoute } from './routes/intent.js';
import { registerHealthRoute } from './routes/health.js';
import { log } from './lib/logger.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  assertProviderKeys();

  const app = Fastify({ bodyLimit: 1 * 1024 * 1024 }); // JSON bodies kept small; STT raises its own limit

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST']
  });

  const rag = await initRag();
  log.info('rag.ready', { docs: rag.docs.length, retriever: config.retriever });

  registerHealthRoute(app);
  registerChatRoute(app, rag, getLLM());
  registerSttRoute(app, getSTT());
  registerTtsRoute(app, getTTS());
  registerIntentRoute(app, getLLM());

  // In production (container), serve the built front end from the same origin.
  const webDist = join(here, '../../web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
    // SPA fallback: serve index.html for any non-API GET.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
    log.info('static.enabled', { root: webDist });
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
  log.info('server.listening', { port: config.port });
}

main().catch((err) => {
  log.error('server.fatal', { message: (err as Error).message });
  process.exit(1);
});
