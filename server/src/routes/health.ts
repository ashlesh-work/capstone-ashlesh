import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

/** GET /api/health — liveness + non-sensitive config echo (never returns keys). */
export function registerHealthRoute(app: FastifyInstance): void {
  app.get('/api/health', async () => ({
    status: 'ok',
    providers: config.providers,
    retriever: config.retriever
  }));
}
