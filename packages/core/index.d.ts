// Type declarations for @access508/core (implementation is ESM JS + JSDoc).

export interface KBDoc {
  id: string;
  title: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceTier: 'primary' | 'secondary';
  signoffRequired: boolean;
  topics: string[];
  summary: string;
  order: number;
  body: string;
}

export interface Chunk {
  id: string;
  docId: string;
  anchor: string;
  heading: string;
  text: string;
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

export interface Retriever {
  retrieve(query: string, k?: number): ScoredChunk[];
}

export interface Citation {
  n: number;
  docId: string;
  title: string;
  sourceTitle: string;
  sourceUrl: string;
  anchor: string;
  signoffRequired: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroundingDecision {
  mode: 'grounded' | 'fallback' | 'refuse';
  scored: ScoredChunk[];
  topScore: number;
  reason: string;
}

export interface AnswerPlan {
  mode: 'grounded' | 'fallback' | 'refuse';
  messages: ChatMessage[] | null;
  directMessage: string | null;
  citations: Citation[];
  audit: { topScore: number; reason: string };
}

export function tokenize(text: string): string[];
export const STOPWORDS: Set<string>;

export function parseDoc(raw: string): KBDoc;
export function chunkDoc(doc: KBDoc): Chunk[];
export function loadDocs(rawDocs: string[]): { docs: KBDoc[]; chunks: Chunk[] };

export function createLexicalRetriever(chunks: Chunk[]): Retriever;

export function decideGrounding(query: string, scored: ScoredChunk[], threshold: number): GroundingDecision;
export function isInScope(query: string): boolean;
export const DOMAIN_TERMS: Set<string>;

export function buildCitations(scored: ScoredChunk[], docsById: Map<string, KBDoc>): Citation[];

export function buildGroundedMessages(query: string, scored: ScoredChunk[], citations: Citation[], lang?: 'en' | 'es'): ChatMessage[];
export function buildFallbackMessages(query: string, lang?: 'en' | 'es'): ChatMessage[];
export const REFUSAL_MESSAGE: string;

export function planAnswer(
  query: string,
  ctx: { retriever: Retriever; docsById: Map<string, KBDoc>; threshold: number; lang?: 'en' | 'es' }
): AnswerPlan;

export function planFromScored(
  query: string,
  scored: ScoredChunk[],
  ctx: { docsById: Map<string, KBDoc>; threshold: number; lang?: 'en' | 'es' }
): AnswerPlan;
