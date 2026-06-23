// @ts-check
/**
 * The answer pipeline — pure orchestration with no I/O.
 *
 * Given a query and an indexed KB, it produces a *plan*: which mode to answer in,
 * the LLM messages to send (if any), the citations to render, and an audit trail.
 * The caller (server route) is responsible only for invoking the LLM adapter with
 * `plan.messages` and streaming the result. Keeping this pure makes the
 * correctness-critical logic fully unit-testable offline.
 */

import { decideGrounding } from './grounding.js';
import { buildCitations } from './citation.js';
import {
  buildGroundedMessages,
  buildFallbackMessages,
  REFUSAL_MESSAGE,
  REFUSAL_MESSAGE_ES
} from './prompt.js';

/**
 * @typedef {import('./retriever.js').Retriever} Retriever
 * @typedef {import('./kb.js').KBDoc} KBDoc
 * @typedef {import('./citation.js').Citation} Citation
 * @typedef {import('./prompt.js').ChatMessage} ChatMessage
 */

/**
 * @typedef {Object} AnswerPlan
 * @property {'grounded'|'fallback'|'refuse'} mode
 * @property {ChatMessage[] | null} messages   LLM messages, or null for a refusal (no LLM call).
 * @property {string | null} directMessage     Fixed text to return without the LLM (refusal), else null.
 * @property {Citation[]} citations
 * @property {{ topScore: number, reason: string }} audit
 */

/**
 * Plan an answer from already-retrieved scored chunks. Use this when retrieval
 * is async (e.g. an embedding retriever): retrieve first, then call this.
 * @param {string} query
 * @param {ScoredChunk[]} scored
 * @param {{ docsById: Map<string, KBDoc>, threshold: number }} ctx
 * @returns {AnswerPlan}
 */
export function planFromScored(query, scored, ctx) {
  const { docsById, threshold, lang = 'en' } = ctx;
  const decision = decideGrounding(query, scored, threshold);
  const audit = { topScore: decision.topScore, reason: decision.reason };

  if (decision.mode === 'refuse') {
    const directMessage = lang === 'es' ? REFUSAL_MESSAGE_ES : REFUSAL_MESSAGE;
    return { mode: 'refuse', messages: null, directMessage, citations: [], audit };
  }

  if (decision.mode === 'fallback') {
    return { mode: 'fallback', messages: buildFallbackMessages(query, lang), directMessage: null, citations: [], audit };
  }

  const citations = buildCitations(decision.scored, docsById);
  const messages = buildGroundedMessages(query, decision.scored, citations, lang);
  return { mode: 'grounded', messages, directMessage: null, citations, audit };
}

/**
 * Convenience wrapper for the synchronous (lexical) path: retrieve + plan.
 * @param {string} query
 * @param {{ retriever: Retriever, docsById: Map<string, KBDoc>, threshold: number }} ctx
 * @returns {AnswerPlan}
 */
export function planAnswer(query, ctx) {
  const scored = ctx.retriever.retrieve(query);
  return planFromScored(query, scored, { docsById: ctx.docsById, threshold: ctx.threshold, lang: ctx.lang });
}
