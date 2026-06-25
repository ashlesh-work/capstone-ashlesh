import type { FastifyInstance } from 'fastify';
import type { LLMAdapter } from '../adapters/index.js';
import { allow } from '../lib/rateLimit.js';
import { log } from '../lib/logger.js';

/**
 * Structured intents the voice-first experience can act on.
 * The LLM returns one of these as a JSON object.
 */
export type VoiceIntent =
  | { type: 'navigate'; topicId: string; topicTitle: string }
  | { type: 'list_topics' }
  | { type: 'read_page' }
  | { type: 'read_summary' }
  | { type: 'where_am_i' }
  | { type: 'go_back' }
  | { type: 'go_home' }
  | { type: 'question'; text: string }
  | { type: 'stop' }
  | { type: 'help' };

interface IntentBody {
  text?: string;
  currentPage?: string;
  availableTopics?: { id: string; title: string }[];
}

/**
 * Build the classification system prompt. Includes the full topic list so the
 * LLM can fuzzy-match spoken topic names to exact IDs.
 */
function buildClassificationPrompt(
  topics: { id: string; title: string }[],
  currentPage?: string
): string {
  const topicList = topics
    .map((t) => `  - id: "${t.id}", title: "${t.title}"`)
    .join('\n');

  return `You are an intent classifier for a voice-navigated accessibility knowledge base.

Given the user's spoken input, classify it into exactly ONE intent and respond with a single JSON object.

Available topics:
${topicList}

Current page: ${currentPage ?? 'home (landing page)'}

Intent types:
1. "navigate" — user wants to go to a specific topic. Fuzzy-match their words to the closest topic.
   Return: { "type": "navigate", "topicId": "<id>", "topicTitle": "<title>" }
2. "list_topics" — user wants to know what topics are available.
   Return: { "type": "list_topics" }
3. "read_page" — user wants the current page content read aloud.
   Return: { "type": "read_page" }
4. "read_summary" — user wants a summary of the current page.
   Return: { "type": "read_summary" }
5. "where_am_i" — user asks what page they are on.
   Return: { "type": "where_am_i" }
6. "go_back" — user wants to go back to the topics list.
   Return: { "type": "go_back" }
7. "go_home" — user wants to go to the home/landing page.
   Return: { "type": "go_home" }
8. "stop" — user wants to stop audio playback or pause.
   Return: { "type": "stop" }
9. "help" — user asks what they can do or needs guidance.
   Return: { "type": "help" }
10. "question" — user is asking a knowledge question (about ADA, 508, WCAG, accessibility, etc.).
   Return: { "type": "question", "text": "<the user's question>" }

Rules:
- Respond with ONLY the JSON object. No explanation, no markdown.
- If the user says something like "go to", "take me to", "open", "show me" + a topic name, classify as "navigate".
- If the user says "read", "read aloud", "read the page", classify as "read_page".
- If the user says "summary", "summarize", "overview", classify as "read_summary".
- If the input is a knowledge question about accessibility, ADA, WCAG, Section 508, etc., classify as "question".
- When matching topics, be generous with fuzzy matching (e.g., "WCAG" matches "WCAG 2.2 AA", "508" matches "Section 508").
- Default to "question" if the input doesn't clearly match a navigation/command intent.`;
}

/**
 * POST /api/intent
 * Body: { text: string, currentPage?: string, availableTopics?: { id, title }[] }
 * Returns: a VoiceIntent JSON object.
 *
 * Uses a lightweight LLM call (same model as chat) with a tight classification
 * prompt. The topic list is passed in so the LLM can fuzzy-match spoken names.
 */
export function registerIntentRoute(app: FastifyInstance, llm: LLMAdapter): void {
  app.post<{ Body: IntentBody }>('/api/intent', async (req, reply) => {
    const ip = req.ip || 'unknown';
    if (!allow(ip)) {
      return reply.code(429).send({ error: 'Too many requests. Please wait a moment.' });
    }

    const text = (req.body?.text ?? '').toString().trim();
    if (!text) {
      return reply.code(400).send({ error: 'A non-empty "text" is required.' });
    }
    if (text.length > 500) {
      return reply.code(400).send({ error: 'Text is too long (max 500 characters).' });
    }

    const topics = req.body?.availableTopics ?? [];
    const currentPage = req.body?.currentPage;

    const started = Date.now();
    try {
      const systemPrompt = buildClassificationPrompt(topics, currentPage);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: text }
      ];

      const raw = await llm.complete(messages);

      // Parse the JSON response from the LLM.
      let intent: VoiceIntent;
      try {
        // Strip any markdown code fences the LLM might add.
        const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        intent = JSON.parse(cleaned);
      } catch {
        // If JSON parsing fails, treat as a question fallback.
        log.warn('intent.parse_failed', { raw, text });
        intent = { type: 'question', text };
      }

      log.info('intent.classified', {
        type: intent.type,
        input: text,
        latencyMs: Date.now() - started
      });

      return reply.send(intent);
    } catch (err) {
      log.error('intent.error', { message: (err as Error).message });
      // On failure, default to treating the input as a question so the user
      // isn't blocked — graceful degradation.
      return reply.send({ type: 'question', text });
    }
  });
}
