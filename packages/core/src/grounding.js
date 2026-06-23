// @ts-check
/**
 * Grounding decision — the hallucination-control gate.
 *
 * Given retrieved chunks and a query, decide how the bot is allowed to answer:
 *   - 'grounded' : confident retrieval match → answer FROM context, with citations.
 *   - 'fallback' : in-scope question but weak retrieval → answer as clearly-LABELED
 *                  general guidance, pointing to official sources. Never presented
 *                  as if it were sourced from the KB.
 *   - 'refuse'   : out-of-scope question → decline and redirect to official resources.
 *
 * This separation is what keeps a legal-adjacent government bot defensible.
 */

import { tokenize } from './text.js';

/**
 * @typedef {import('./retriever.js').ScoredChunk} ScoredChunk
 */

/**
 * Strong domain terms that mark a question as in-scope for ADA/508 even when
 * retrieval is weak. Curated (not auto-derived) so off-topic noise can't sneak in.
 */
export const DOMAIN_TERMS = new Set([
  'ada', '508', 'wcag', 'accessibility', 'accessible', 'accommodation',
  'accommodations', 'disability', 'disabilities', 'screen-reader', 'screenreader',
  'keyboard', 'contrast', 'caption', 'captions', 'aria', 'compliance', 'compliant',
  'title', 'section', 'conformance', 'vpat', 'acr', 'remediation', 'assistive',
  'impairment', 'blind', 'deaf', 'voiceover', 'nvda', 'jaws', 'talkback',
  'focus', 'alt', 'transcript', 'doj', 'rehabilitation', 'icd', 'ict',
  'perceivable', 'operable', 'understandable', 'robust', 'a11y'
]);

/**
 * @param {string} query
 * @returns {boolean}
 */
export function isInScope(query) {
  const tokens = tokenize(query);
  return tokens.some((t) => DOMAIN_TERMS.has(t));
}

/**
 * @typedef {Object} GroundingDecision
 * @property {'grounded'|'fallback'|'refuse'} mode
 * @property {ScoredChunk[]} scored       Chunks to use (empty for refuse).
 * @property {number} topScore
 * @property {string} reason              Human-readable rationale (for audit logs).
 */

/**
 * Decide the answer mode.
 * @param {string} query
 * @param {ScoredChunk[]} scored          Retriever output (already sorted desc).
 * @param {number} threshold              Min cosine to count as a confident match.
 * @returns {GroundingDecision}
 */
export function decideGrounding(query, scored, threshold) {
  const topScore = scored.length ? scored[0].score : 0;

  if (topScore >= threshold) {
    // Keep only chunks within a reasonable band of the top so citations stay relevant.
    const cutoff = Math.max(threshold, topScore * 0.4);
    const kept = scored.filter((s) => s.score >= cutoff);
    return {
      mode: 'grounded',
      scored: kept.length ? kept : [scored[0]],
      topScore,
      reason: `Confident retrieval (top=${topScore.toFixed(3)} >= ${threshold}).`
    };
  }

  if (isInScope(query)) {
    return {
      mode: 'fallback',
      scored: [],
      topScore,
      reason: `In-scope but weak retrieval (top=${topScore.toFixed(3)} < ${threshold}); labeled general guidance.`
    };
  }

  return {
    mode: 'refuse',
    scored: [],
    topScore,
    reason: `Out of scope (no domain terms; top=${topScore.toFixed(3)}).`
  };
}
