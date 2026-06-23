// @ts-check
/**
 * Lexical (TF-IDF + cosine) retriever — the offline-capable default.
 *
 * Why lexical for local/POC: deterministic, zero network, genuinely useful
 * keyword grounding, and fully unit-testable. Production can swap in an
 * embedding-based retriever behind the SAME `retrieve()` contract (see
 * server/src/rag/embeddingRetriever.ts) without touching grounding or citation.
 */

import { tokenize } from './text.js';

/**
 * @typedef {import('./kb.js').Chunk} Chunk
 */

/**
 * @typedef {Object} ScoredChunk
 * @property {Chunk} chunk
 * @property {number} score   Cosine similarity in [0, 1].
 */

/**
 * @typedef {Object} Retriever
 * @property {(query: string, k?: number) => ScoredChunk[]} retrieve
 */

/**
 * Build an in-memory TF-IDF index over chunks and return a Retriever.
 * @param {Chunk[]} chunks
 * @returns {Retriever}
 */
export function createLexicalRetriever(chunks) {
  const N = chunks.length;

  // Per-chunk term frequencies + document frequency across the corpus.
  /** @type {Map<string, number>[]} */
  const tfMaps = [];
  /** @type {Map<string, number>} */
  const df = new Map();

  for (const chunk of chunks) {
    /** @type {Map<string, number>} */
    const tf = new Map();
    for (const tok of tokenize(chunk.text)) {
      tf.set(tok, (tf.get(tok) ?? 0) + 1);
    }
    tfMaps.push(tf);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }

  /** @param {string} term */
  const idf = (term) => Math.log(1 + N / (df.get(term) ?? N + 1));

  // Pre-compute weighted vectors + norms for each chunk.
  /** @type {{ vec: Map<string, number>, norm: number }[]} */
  const docVectors = tfMaps.map((tf) => {
    /** @type {Map<string, number>} */
    const vec = new Map();
    let sumSq = 0;
    for (const [term, count] of tf) {
      const w = count * idf(term);
      vec.set(term, w);
      sumSq += w * w;
    }
    return { vec, norm: Math.sqrt(sumSq) || 1 };
  });

  /**
   * @param {string} query
   * @param {number} [k]
   * @returns {ScoredChunk[]}
   */
  function retrieve(query, k = 4) {
    const qTokens = tokenize(query);
    if (qTokens.length === 0 || N === 0) return [];

    /** @type {Map<string, number>} */
    const qTf = new Map();
    for (const t of qTokens) qTf.set(t, (qTf.get(t) ?? 0) + 1);

    /** @type {Map<string, number>} */
    const qVec = new Map();
    let qSumSq = 0;
    for (const [term, count] of qTf) {
      const w = count * idf(term);
      qVec.set(term, w);
      qSumSq += w * w;
    }
    const qNorm = Math.sqrt(qSumSq) || 1;

    /** @type {ScoredChunk[]} */
    const scored = [];
    for (let i = 0; i < N; i++) {
      const { vec, norm } = docVectors[i];
      let dot = 0;
      // Iterate the smaller vector for efficiency.
      const [small, big] = qVec.size < vec.size ? [qVec, vec] : [vec, qVec];
      for (const [term, w] of small) {
        const other = big.get(term);
        if (other) dot += w * other;
      }
      const score = dot / (qNorm * norm);
      if (score > 0) scored.push({ chunk: chunks[i], score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  return { retrieve };
}
