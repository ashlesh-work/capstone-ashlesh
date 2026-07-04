/**
 * Tool layer (Phase 5): schemas, selection (routing) logic, execution,
 * and misuse safeguards.
 *
 * Tools:
 * - kb_search         → the RAG pipeline (retrieval + grounding + citations).
 * - wcag_checklist    → curated, deterministic checklists (no LLM).
 * - escalate_to_human → safety requirement: hands off to a human specialist.
 *
 * Safeguards:
 * - TOOL_MAX_ITERATIONS caps routing retries (loop prevention).
 * - A failed tool call (e.g. checklist topic not found) is recorded as a
 *   failed span and safely falls back to kb_search — this is the required
 *   "incorrect tool call + safeguard" evidence.
 */

export type ToolName = 'kb_search' | 'wcag_checklist' | 'escalate_to_human';

export interface ToolResult {
  ok: boolean;
  name: ToolName;
  output: string;
  error?: string;
}

/** Declared schemas — evidence of explicit tool contracts (framework-free). */
export const TOOL_SCHEMAS = [
  {
    name: 'kb_search',
    description: 'Retrieve and answer from the curated ADA/Section 508 knowledge base with citations.',
    parameters: { query: 'string — the user question' }
  },
  {
    name: 'wcag_checklist',
    description: 'Return a deterministic WCAG 2.2 AA quick checklist for a known topic.',
    parameters: { topic: 'string — keyboard | images | captions | forms | contrast' }
  },
  {
    name: 'escalate_to_human',
    description: 'Escalate ambiguous, legal-advice, or unresolved cases to a human specialist.',
    parameters: { reason: 'string — why escalation is needed' }
  }
] as const;

const CHECKLISTS: Record<string, string[]> = {
  keyboard: [
    'Every interactive element reachable with Tab / Shift+Tab',
    'Visible focus indicator with ≥ 3:1 contrast',
    'No keyboard traps; modals return focus to the launcher',
    'Logical focus order matching the visual order'
  ],
  images: [
    'Meaningful images have descriptive alt text',
    'Decorative images use empty alt=""',
    'Complex charts have a text alternative nearby',
    'No text baked into images for essential content'
  ],
  captions: [
    'Prerecorded video has accurate synchronized captions',
    'Live video has real-time captions',
    'Audio-only content has a transcript',
    'Auto-captions are human-reviewed before publishing'
  ],
  forms: [
    'Every input has a programmatic label',
    'Errors are described in text and linked to the field',
    'Required fields indicated beyond color alone',
    'No time limits without warning and extension'
  ],
  contrast: [
    'Body text contrast ≥ 4.5:1',
    'Large text (≥ 24px / 19px bold) ≥ 3:1',
    'UI components and focus indicators ≥ 3:1',
    'Color is never the only way information is conveyed'
  ]
};

/**
 * Routing/selection logic. Deliberately simple and inspectable (recorded in
 * the trace) — the point is to demonstrate correct AND incorrect selection.
 */
export function selectTool(question: string): { tool: ToolName; reason: string } {
  const q = question.toLowerCase();
  if (/\b(human|person|agent|specialist|lawyer|attorney|complaint|escalate|sue|file a)\b/.test(q)) {
    return { tool: 'escalate_to_human', reason: 'matched escalation/legal keywords' };
  }
  if (/\bchecklist\b/.test(q)) {
    return { tool: 'wcag_checklist', reason: 'matched "checklist" keyword' };
  }
  return { tool: 'kb_search', reason: 'default: knowledge-base retrieval' };
}

/** Execute a non-RAG tool. kb_search is executed by the agent via the RAG engine. */
export function runTool(name: ToolName, args: { topic?: string; reason?: string }): ToolResult {
  if (name === 'escalate_to_human') {
    return {
      ok: true,
      name,
      output:
        'I want to make sure you get authoritative help, so I am flagging this for a human accessibility ' +
        'specialist. I cannot provide legal advice. Meanwhile: for ADA questions call the ADA Information Line ' +
        '(ada.gov/infoline) and for Section 508 see section508.gov. Your question has been logged for follow-up.' +
        (args.reason ? ` (Reason: ${args.reason})` : '')
    };
  }
  if (name === 'wcag_checklist') {
    const topic = (args.topic ?? '').toLowerCase();
    const match = Object.keys(CHECKLISTS).find((k) => topic.includes(k));
    if (!match) {
      // Incorrect/failed tool call — caller must apply the safeguard (fallback to kb_search).
      return { ok: false, name, output: '', error: `no curated checklist for topic "${args.topic}"` };
    }
    return {
      ok: true,
      name,
      output:
        `WCAG 2.2 AA quick checklist — ${match}:\n` + CHECKLISTS[match].map((i) => `• ${i}`).join('\n') +
        '\n(Source: curated from WCAG 2.2; see the WCAG 2.2 AA topic page for citations.)'
    };
  }
  return { ok: false, name, output: '', error: 'kb_search must be executed via the RAG engine' };
}
