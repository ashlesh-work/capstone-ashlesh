// @ts-check
/**
 * Citation assembly. Every grounded answer carries traceable citations built
 * ONLY from the chunks that were actually retrieved — never invented.
 */

/**
 * @typedef {import('./retriever.js').ScoredChunk} ScoredChunk
 * @typedef {import('./kb.js').KBDoc} KBDoc
 */

/**
 * @typedef {Object} Citation
 * @property {number} n            1-based index referenced as [n] in the answer.
 * @property {string} docId
 * @property {string} title        Document title.
 * @property {string} sourceTitle  Authoritative source name.
 * @property {string} sourceUrl    Authoritative source URL.
 * @property {string} anchor       Section anchor for a deep link.
 * @property {boolean} signoffRequired
 */

/**
 * Build a de-duplicated, ordered citation list from retrieved chunks.
 * One citation per source document, ordered by best matching chunk.
 * @param {ScoredChunk[]} scored
 * @param {Map<string, KBDoc>} docsById
 * @returns {Citation[]}
 */
export function buildCitations(scored, docsById) {
  /** @type {Citation[]} */
  const citations = [];
  const seen = new Set();

  for (const { chunk } of scored) {
    if (seen.has(chunk.docId)) continue;
    const doc = docsById.get(chunk.docId);
    if (!doc) continue; // never cite a doc we cannot resolve
    seen.add(chunk.docId);
    citations.push({
      n: citations.length + 1,
      docId: doc.id,
      title: doc.title,
      sourceTitle: doc.sourceTitle,
      sourceUrl: doc.sourceUrl,
      anchor: chunk.anchor,
      signoffRequired: doc.signoffRequired
    });
  }
  return citations;
}
