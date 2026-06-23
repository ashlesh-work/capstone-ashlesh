// @ts-check
/**
 * Knowledge-base parsing and chunking.
 *
 * A KB document is a markdown file with YAML-ish frontmatter. We intentionally
 * parse only the small subset of frontmatter our docs use (strings, inline
 * arrays, booleans) so there is no YAML dependency and behavior is reproducible.
 */

/**
 * @typedef {Object} KBDoc
 * @property {string} id                Stable document id (also used in citations).
 * @property {string} title             Human-facing document title.
 * @property {string} sourceTitle       Name of the authoritative source.
 * @property {string} sourceUrl         URL of the authoritative source.
 * @property {'primary'|'secondary'} sourceTier
 * @property {boolean} signoffRequired  True if a legal-interpretation claim needs counsel/agency sign-off.
 * @property {string[]} topics          Topic tags (also drive the site nav).
 * @property {string} summary           One-line summary used on cards / nav.
 * @property {number} order             Sort order for site navigation.
 * @property {string} body              Markdown body (no frontmatter).
 */

/**
 * @typedef {Object} Chunk
 * @property {string} id        `${docId}#${index}`
 * @property {string} docId
 * @property {string} anchor    Heading slug the chunk lives under (for deep links).
 * @property {string} heading   Nearest heading text ('' if none).
 * @property {string} text      The chunk text.
 */

/**
 * Parse a single key:value frontmatter line value into string | boolean | string[].
 * @param {string} raw
 * @returns {string | boolean | string[]}
 */
function parseValue(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return v.replace(/^["']|["']$/g, '');
}

/**
 * Parse a markdown string with `---` frontmatter into a KBDoc.
 * Throws if required fields are missing — a malformed KB doc is a build error,
 * not something to silently paper over.
 * @param {string} raw
 * @returns {KBDoc}
 */
export function parseDoc(raw) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('KB doc is missing frontmatter');
  const [, fm, body] = match;

  /** @type {Record<string, any>} */
  const meta = {};
  for (const line of fm.split('\n')) {
    const m = /^([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = parseValue(m[2]);
  }

  const required = ['id', 'title', 'sourceTitle', 'sourceUrl', 'sourceTier'];
  for (const key of required) {
    if (!meta[key]) throw new Error(`KB doc "${meta.id ?? '?'}" missing required field: ${key}`);
  }

  return {
    id: String(meta.id),
    title: String(meta.title),
    sourceTitle: String(meta.sourceTitle),
    sourceUrl: String(meta.sourceUrl),
    sourceTier: meta.sourceTier === 'secondary' ? 'secondary' : 'primary',
    signoffRequired: meta.signoffRequired === true,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    summary: meta.summary ? String(meta.summary) : '',
    order: meta.order !== undefined ? Number(meta.order) : 999,
    body: body.trim()
  };
}

/** @param {string} s */
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Split a doc body into retrieval chunks at markdown headings and paragraphs.
 * Each chunk carries its nearest heading so citations can deep-link.
 * @param {KBDoc} doc
 * @returns {Chunk[]}
 */
export function chunkDoc(doc) {
  /** @type {Chunk[]} */
  const chunks = [];
  let heading = '';
  let anchor = '';
  let index = 0;

  // Split on blank lines into blocks; promote heading blocks to context.
  const blocks = doc.body.split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const h = /^#{1,6}\s+(.*)$/.exec(trimmed);
    if (h) {
      heading = h[1].trim();
      anchor = slugify(heading);
      continue; // headings provide context but are not standalone chunks
    }
    chunks.push({
      id: `${doc.id}#${index}`,
      docId: doc.id,
      anchor,
      heading,
      // Prepend the heading so retrieval can match section topic words too.
      text: heading ? `${heading}. ${trimmed}` : trimmed
    });
    index += 1;
  }
  return chunks;
}

/**
 * Load many raw markdown strings into docs + a flat chunk list.
 * @param {string[]} rawDocs
 * @returns {{ docs: KBDoc[], chunks: Chunk[] }}
 */
export function loadDocs(rawDocs) {
  const docs = rawDocs.map(parseDoc);
  const chunks = docs.flatMap(chunkDoc);
  return { docs, chunks };
}
