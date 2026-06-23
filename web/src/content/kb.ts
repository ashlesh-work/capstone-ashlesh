import { loadDocs, type KBDoc } from '@access508/core';

/**
 * Load the shared ADA/508 knowledge base at build time. The SAME markdown files
 * power the site pages AND the bot's retrieval — one source of truth, no drift.
 */
const modules = import.meta.glob('../../../kb/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const esModules = import.meta.glob('../../../kb/es/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const { docs } = loadDocs(Object.values(modules));
const { docs: esDocs } = loadDocs(Object.values(esModules));

/** All KB docs, ordered for navigation (default English). */
export const kbDocs: KBDoc[] = [...docs].sort((a, b) => a.order - b.order);

/** All Spanish KB docs, ordered for navigation. */
export const esKbDocs: KBDoc[] = [...esDocs].sort((a, b) => a.order - b.order);

/** Get docs for a given language. */
export function getKbDocs(lang: 'en' | 'es'): KBDoc[] {
  return lang === 'es' ? esKbDocs : kbDocs;
}

/** Look up a single doc by id and language (used by the topic page route). */
export function getDoc(id: string, lang: 'en' | 'es' = 'en'): KBDoc | undefined {
  return getKbDocs(lang).find((d) => d.id === id);
}

