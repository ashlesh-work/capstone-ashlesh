import type { FastifyInstance } from 'fastify';
import type { RagEngine } from '../rag/index.js';
import type { LLMAdapter } from '../adapters/index.js';
import { allow } from '../lib/rateLimit.js';
import { auditAnswer, log } from '../lib/logger.js';

interface ChatBody {
  question?: string;
  lang?: 'en' | 'es';
}

/**
 * POST /api/chat
 * Body: { question: string, lang?: 'en' | 'es' }
 * Returns: { mode, answer, citations }
 *
 * Flow: grounding gate (in core) decides refuse | fallback | grounded.
 * - refuse  -> fixed message, no LLM call.
 * - fallback-> LLM answers as labeled general guidance, no citations.
 * - grounded-> LLM answers from context, with citations.
 */
export function registerChatRoute(app: FastifyInstance, rag: RagEngine, llm: LLMAdapter): void {
  app.post<{ Body: ChatBody }>('/api/chat', async (req, reply) => {
    const ip = req.ip || 'unknown';
    if (!allow(ip)) {
      return reply.code(429).send({ error: 'Too many requests. Please wait a moment.' });
    }

    const question = (req.body?.question ?? '').toString().trim();
    const lang = req.body?.lang;
    if (!question) {
      return reply.code(400).send({ error: 'A non-empty "question" is required.' });
    }
    if (question.length > 1000) {
      return reply.code(400).send({ error: 'Question is too long (max 1000 characters).' });
    }

    const started = Date.now();
    try {
      const plan = await rag.plan(question, lang);

      let answer: string;
      if (plan.mode === 'refuse') {
        answer = plan.directMessage ?? '';
      } else {
        // plan.messages is non-null for grounded and fallback.
        answer = await llm.complete(plan.messages!);
      }

      auditAnswer({
        mode: plan.mode,
        topScore: plan.audit.topScore,
        citationDocIds: plan.citations.map((c) => c.docId),
        queryPreview: question,
        latencyMs: Date.now() - started
      });

      return reply.send({
        mode: plan.mode,
        answer,
        citations: plan.citations
      });
    } catch (err) {
      log.error('chat.error', { message: (err as Error).message });
      return reply
        .code(502)
        .send({ error: 'The assistant is temporarily unavailable. Please try again.' });
    }
  });
}
