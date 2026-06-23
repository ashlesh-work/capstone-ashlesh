import type { Chunk, ScoredChunk } from '@access508/core';
import type { EmbeddingProvider } from '../adapters/index.js';

/** Async retriever contract (superset of core's sync Retriever). */
export interface AsyncRetriever {
  retrieve(query: string, k?: number): Promise<ScoredChunk[]>;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Build an embedding-based retriever (production-quality grounding).
 * Embeds all chunks once at startup; embeds the query per request.
 * Conforms to the same scored-chunk contract as the lexical retriever, so
 * grounding, citation, and prompt building are identical downstream.
 */
export async function createEmbeddingRetriever(
  chunks: Chunk[],
  embedder: EmbeddingProvider
): Promise<AsyncRetriever> {
  const vectors = await embedder.embed(chunks.map((c) => c.text));

  return {
    async retrieve(query: string, k = 4): Promise<ScoredChunk[]> {
      const [qVec] = await embedder.embed([query]);
      const scored = chunks
        .map((chunk, i) => ({ chunk, score: cosine(qVec, vectors[i]) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      return scored;
    }
  };
}
