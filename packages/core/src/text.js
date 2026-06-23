// @ts-check
/**
 * Minimal, deterministic text utilities for lexical retrieval.
 * No external dependencies on purpose: this must run offline and be reproducible.
 */

/** Common English stopwords removed before scoring so they don't dominate TF-IDF. */
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does',
  'for', 'from', 'has', 'have', 'how', 'i', 'in', 'is', 'it', 'its', 'of', 'on',
  'or', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'was', 'were',
  'what', 'when', 'where', 'which', 'who', 'will', 'with', 'you', 'your', 'about',
  'if', 'my', 'me', 'we', 'our', 'us', 'so', 'than', 'then', 'there', 'these',
  'would', 'should', 'could', 'may', 'might', 'must', 'into', 'over', 'under'
]);

/**
 * Tokenize text into lowercase word tokens, stripping punctuation and stopwords.
 * Keeps alphanumerics and intra-word hyphens (e.g. "508", "title-ii", "wcag").
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, '')) // trim stray hyphens
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
