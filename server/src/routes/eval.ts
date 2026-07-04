/**
 * Trainer/evaluator API: traces, LLM-as-judge runs, feedback, session reset.
 * Optionally protected by EVAL_TOKEN (header: x-eval-token). With no token
 * set (local demo), endpoints are open on localhost.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { RagEngine } from '../rag/index.js';
import type { LLMAdapter } from '../adapters/index.js';
import { config } from '../config.js';
import { traceOverview, listTraces, getTrace, attachFeedback } from '../lib/tracing.js';
import { applyFeedback, resetSession } from '../lib/session.js';
import { runEval, listEvalRuns } from '../eval/judge.js';
import { VARIANTS, type VariantId } from '../eval/promptVariants.js';
import { TOOL_SCHEMAS } from '../agent/tools.js';
import { log } from '../lib/logger.js';

function guard(req: FastifyRequest, reply: FastifyReply): boolean {
  if (config.evalToken && req.headers['x-eval-token'] !== config.evalToken) {
    reply.code(401).send({ error: 'Missing or invalid x-eval-token.' });
    return false;
  }
  return true;
}

export function registerEvalRoutes(app: FastifyInstance, rag: RagEngine, llm: LLMAdapter): void {
  // ── Tracing (user → session → trace drilldown) ──────────────────────
  app.get('/api/traces/overview', async (req, reply) => {
    if (!guard(req, reply)) return;
    return reply.send(traceOverview());
  });

  app.get<{ Querystring: { userId?: string; sessionId?: string } }>('/api/traces', async (req, reply) => {
    if (!guard(req, reply)) return;
    const { userId, sessionId } = req.query;
    return reply.send({ traces: listTraces(userId, sessionId) });
  });

  app.get<{ Params: { id: string } }>('/api/traces/:id', async (req, reply) => {
    if (!guard(req, reply)) return;
    const t = getTrace(req.params.id);
    if (!t) return reply.code(404).send({ error: 'Trace not found' });
    return reply.send(t);
  });

  // ── LLM-as-a-judge evaluation ───────────────────────────────────────
  app.get('/api/eval/meta', async (req, reply) => {
    if (!guard(req, reply)) return;
    return reply.send({
      variants: Object.entries(VARIANTS).map(([id, v]) => ({ id, ...v })),
      defaultVariant: config.promptVariant,
      judgeModel: config.judgeModel,
      tools: TOOL_SCHEMAS
    });
  });

  app.post<{ Body: { variant?: VariantId } }>('/api/eval/run', async (req, reply) => {
    if (!guard(req, reply)) return;
    const variant = (req.body?.variant ?? 'v2') as VariantId;
    if (!VARIANTS[variant]) return reply.code(400).send({ error: 'variant must be v1, v2, or v3' });
    try {
      const run = await runEval(variant, rag, (m) => llm.complete(m));
      return reply.send(run);
    } catch (e) {
      log.error('eval.run_failed', { message: (e as Error).message });
      return reply.code(502).send({ error: (e as Error).message });
    }
  });

  app.get('/api/eval/results', async (req, reply) => {
    if (!guard(req, reply)) return;
    return reply.send({ runs: listEvalRuns() });
  });

  // ── Feedback → adaptation (Phase 7) ─────────────────────────────────
  app.post<{ Body: { traceId?: string; rating?: 'up' | 'down'; tag?: string } }>(
    '/api/feedback',
    async (req, reply) => {
      const { traceId, rating, tag } = req.body ?? {};
      if (!traceId || (rating !== 'up' && rating !== 'down')) {
        return reply.code(400).send({ error: 'traceId and rating ("up"|"down") are required.' });
      }
      const t = attachFeedback(traceId, { rating, tag, ts: new Date().toISOString() });
      if (!t) return reply.code(404).send({ error: 'Trace not found' });
      const flags = applyFeedback(t.userId, t.sessionId, rating, tag);
      log.info('feedback.applied', { traceId, rating, tag, flags });
      return reply.send({ ok: true, flags });
    }
  );

  // ── Session reset (documented memory retention rule) ────────────────
  app.post<{ Body: { userId?: string; sessionId?: string } }>('/api/session/reset', async (req, reply) => {
    const { userId, sessionId } = req.body ?? {};
    if (!userId || !sessionId) return reply.code(400).send({ error: 'userId and sessionId are required.' });
    resetSession(userId, sessionId);
    return reply.send({ ok: true });
  });
}
