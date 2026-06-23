import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDocs,
  createLexicalRetriever,
  planFromScored,
  type KBDoc,
  type ScoredChunk,
  type AnswerPlan
} from '@access508/core';
import { config } from '../config.js';
import { getEmbeddings } from '../adapters/index.js';
import { createEmbeddingRetriever, type AsyncRetriever } from './embeddingRetriever.js';

const here = dirname(fileURLToPath(import.meta.url));
// kb/ lives at the repo root: server/src/rag -> ../../../kb
const KB_DIR = join(here, '../../../kb');

export interface RagEngine {
  docs: KBDoc[];
  docsById: Map<string, KBDoc>;
  /** Plan an answer (retrieval + grounding + citation) for a user query. */
  plan(query: string, lang?: 'en' | 'es'): Promise<AnswerPlan>;
}

/** Load the KB from disk and build the configured retriever. Call once at boot. */
export async function initRag(): Promise<RagEngine> {
  const raw = readdirSync(KB_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(join(KB_DIR, f), 'utf8'));

  const { docs, chunks } = loadDocs(raw);
  const docsById = new Map(docs.map((d) => [d.id, d]));

  const rawEs = readdirSync(join(KB_DIR, 'es'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(join(KB_DIR, 'es', f), 'utf8'));

  const { docs: docsEs, chunks: chunksEs } = loadDocs(rawEs);
  const docsByIdEs = new Map(docsEs.map((d) => [d.id, d]));

  // Both retrievers return ScoredChunk[]; we normalize to an async retrieve().
  let retrieve: (q: string) => Promise<ScoredChunk[]>;
  let retrieveEs: (q: string) => Promise<ScoredChunk[]>;
  if (config.retriever === 'embedding') {
    const r: AsyncRetriever = await createEmbeddingRetriever(chunks, getEmbeddings());
    retrieve = (q) => r.retrieve(q);
    const rEs: AsyncRetriever = await createEmbeddingRetriever(chunksEs, getEmbeddings());
    retrieveEs = (q) => rEs.retrieve(q);
  } else {
    const r = createLexicalRetriever(chunks);
    retrieve = async (q) => r.retrieve(q);
    const rEs = createLexicalRetriever(chunksEs);
    retrieveEs = async (q) => rEs.retrieve(q);
  }

  // NOTE: the confidence threshold is retriever-specific. The default 0.12 suits
  // lexical TF-IDF; embedding cosine matches typically warrant ~0.30-0.40.
  const threshold = config.retrievalThreshold;

  return {
    docs,
    docsById,
    async plan(query: string, lang?: 'en' | 'es'): Promise<AnswerPlan> {
      const activeRetrieve = lang === 'es' ? retrieveEs : retrieve;
      const activeDocsById = lang === 'es' ? docsByIdEs : docsById;
      const scored = await activeRetrieve(query);
      return planFromScored(query, scored, { docsById: activeDocsById, threshold, lang });
    }
  };
}
