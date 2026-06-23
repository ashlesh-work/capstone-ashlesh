// @ts-check
/**
 * Prompt construction for the LLM. The system prompt is the second line of
 * hallucination defense (the first is the grounding gate): it forbids inventing
 * facts and requires citing the numbered context.
 */

/**
 * @typedef {import('./retriever.js').ScoredChunk} ScoredChunk
 * @typedef {import('./citation.js').Citation} Citation
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

const SYSTEM_GROUNDED = [
  'You are the Access508 assistant, a helpful guide to U.S. ADA and Section 508 digital-accessibility requirements.',
  'Answer ONLY using the numbered CONTEXT passages provided. Do not use outside knowledge.',
  'Cite the passages you use inline with bracketed numbers like [1] or [2].',
  'If the context does not contain the answer, say so plainly and suggest the user consult the official source — do NOT guess.',
  'Be concise, plain-language, and accurate. Never fabricate legal facts, numbers, dates, or citations.'
].join(' ');

const SYSTEM_GROUNDED_ES = [
  'Eres el asistente de AccessibleU, una guía útil para los requisitos de accesibilidad digital de la ADA y la Sección 508 de EE. UU.',
  'Responde ÚNICAMENTE utilizando los pasajes de CONTEXTO numerados proporcionados. No utilices conocimientos externos.',
  'Cita los pasajes que utilices en línea con números entre corchetes como [1] o [2].',
  'Si el contexto no contiene la respuesta, dilo claramente y sugiere al usuario consultar la fuente oficial; NO adivines.',
  'Sé conciso, utiliza un lenguaje sencillo y sé preciso. Nunca inventes hechos legales, números, fechas o citas.',
  'Debes responder en español mexicano de manera natural, como un hablante nativo.'
].join(' ');

const SYSTEM_FALLBACK = [
  'You are the Access508 assistant for U.S. ADA and Section 508 topics.',
  'No specific source passage was found for this question, so answer with brief, GENERAL guidance only.',
  'Begin your answer with the exact sentence: "General guidance (not from a cited source):".',
  'Keep it short, avoid specific legal claims, dates, or numbers you cannot verify, and direct the user to ada.gov, section508.gov, or the W3C WCAG guidelines for authoritative detail.'
].join(' ');

const SYSTEM_FALLBACK_ES = [
  'Eres el asistente de AccessibleU para temas de la ADA y la Sección 508 de EE. UU.',
  'No se encontró ningún pasaje de origen específico para esta pregunta, así que responde solo con una breve guía GENERAL.',
  'Comienza tu respuesta con la frase exacta: "Orientación general (no de una fuente citada):".',
  'Mantenlo corto, evita afirmaciones legales específicas, fechas o números que no puedas verificar, y dirige al usuario a ada.gov, section508.gov o las pautas WCAG del W3C para obtener detalles autorizados.',
  'Debes responder en español mexicano de manera natural, como un hablante nativo.'
].join(' ');

/** The fixed, non-LLM refusal message for out-of-scope questions. */
export const REFUSAL_MESSAGE =
  "I can only help with U.S. ADA and Section 508 digital-accessibility questions. " +
  "For other topics, please use the appropriate resource. You can ask me about the ADA, " +
  "Section 508, WCAG conformance, or how to make digital content accessible.";

export const REFUSAL_MESSAGE_ES =
  "Solo puedo ayudarte con preguntas sobre la ADA de EE. UU. y la accesibilidad digital de la Sección 508. " +
  "Para otros temas, utiliza el recurso adecuado. Puedes preguntarme sobre la ADA, " +
  "la Sección 508, la conformidad con las WCAG o cómo hacer accesible el contenido digital.";

/**
 * Build the chat messages for a grounded answer.
 * @param {string} query
 * @param {ScoredChunk[]} scored
 * @param {Citation[]} citations
 * @param {string} [lang]
 * @returns {ChatMessage[]}
 */
export function buildGroundedMessages(query, scored, citations, lang = 'en') {
  // Map each citation's docId to its number so context passages are numbered consistently.
  const numByDoc = new Map(citations.map((c) => [c.docId, c.n]));
  const context = scored
    .map((s) => {
      const n = numByDoc.get(s.chunk.docId);
      return n ? `[${n}] ${s.chunk.text}` : null;
    })
    .filter(Boolean)
    .join('\n\n');

  const systemPrompt = lang === 'es' ? SYSTEM_GROUNDED_ES : SYSTEM_GROUNDED;
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${query}` }
  ];
}

/**
 * Build the chat messages for a labeled fallback answer.
 * @param {string} query
 * @param {string} [lang]
 * @returns {ChatMessage[]}
 */
export function buildFallbackMessages(query, lang = 'en') {
  const systemPrompt = lang === 'es' ? SYSTEM_FALLBACK_ES : SYSTEM_FALLBACK;
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ];
}
