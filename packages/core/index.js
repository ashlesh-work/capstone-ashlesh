// @ts-check
/**
 * @access508/core — public surface.
 * Stack-agnostic, dependency-free, offline-capable correctness core.
 */
export { tokenize, STOPWORDS } from './src/text.js';
export { parseDoc, chunkDoc, loadDocs } from './src/kb.js';
export { createLexicalRetriever } from './src/retriever.js';
export { decideGrounding, isInScope, DOMAIN_TERMS } from './src/grounding.js';
export { buildCitations } from './src/citation.js';
export {
  buildGroundedMessages,
  buildFallbackMessages,
  REFUSAL_MESSAGE
} from './src/prompt.js';
export { planAnswer, planFromScored } from './src/pipeline.js';
