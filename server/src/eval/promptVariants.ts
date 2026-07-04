/**
 * Versioned prompt strategies (Phase 3 + the Prompt Comparison Rule):
 * the same test set is run against 2–3 variants and compared in the eval UI.
 *
 * v1-minimal   — naive baseline: no grounding contract, no citation rule.
 * v2-grounded  — the production strategy (grounded + cited + refusal), built
 *                by @access508/core. This is the selected default (see README).
 * v3-strict    — persona + hard refusal: grounded-or-refuse, no fallback.
 */
import type { ChatMessage } from '@access508/core';
import type { AnswerPlan } from '@access508/core';

export type VariantId = 'v1' | 'v2' | 'v3';

export const VARIANTS: Record<VariantId, { label: string; description: string }> = {
  v1: { label: 'v1-minimal', description: 'Plain assistant prompt; no grounding or citation contract.' },
  v2: { label: 'v2-grounded-cited', description: 'Production: answer only from context, cite [n], labeled fallback, refusal gate.' },
  v3: { label: 'v3-strict-persona', description: 'Compliance-officer persona; grounded-or-refuse; no general fallback.' }
};

/**
 * Build the messages a variant would send for a question, given the
 * production RAG plan (used for its retrieved context).
 * Returns null when the variant answers without the LLM (refusals).
 */
export function buildVariantMessages(
  variant: VariantId,
  question: string,
  plan: AnswerPlan
): { messages: ChatMessage[] | null; direct?: string } {
  if (variant === 'v2') {
    // Production behaviour exactly as shipped.
    if (plan.mode === 'refuse') return { messages: null, direct: plan.directMessage ?? '' };
    return { messages: plan.messages };
  }

  const context =
    plan.messages?.find((m) => m.role === 'user')?.content.match(/CONTEXT:\n([\s\S]*)\n\nQUESTION:/)?.[1] ?? '';

  if (variant === 'v1') {
    return {
      messages: [
        { role: 'system', content: 'You are a helpful assistant answering questions about the ADA and Section 508.' },
        { role: 'user', content: question }
      ]
    };
  }

  // v3: strict persona, grounded-or-refuse.
  if (!context) {
    return { messages: null, direct: "I don't have a cited source for that, so I won't answer. Please consult ada.gov or section508.gov." };
  }
  return {
    messages: [
      {
        role: 'system',
        content:
          'You are a meticulous digital-accessibility compliance officer. Answer ONLY from the numbered CONTEXT, ' +
          'citing [n] for every claim. If the context does not fully answer the question, reply exactly: ' +
          '"I don\'t have a cited source for that, so I won\'t answer." Never speculate, never give legal advice.'
      },
      { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` }
    ]
  };
}
