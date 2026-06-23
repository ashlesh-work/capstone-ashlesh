// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDocs, createLexicalRetriever, planAnswer } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const kbDir = join(here, '../../../kb');

const rawDocs = readdirSync(kbDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(join(kbDir, f), 'utf8'));

const { docs, chunks } = loadDocs(rawDocs);
const docsById = new Map(docs.map((d) => [d.id, d]));
const retriever = createLexicalRetriever(chunks);
const ctx = { retriever, docsById, threshold: 0.12 };

test('the real KB has at least 10 documents (broad-site requirement)', () => {
  assert.ok(docs.length >= 10, `expected >= 10 docs, got ${docs.length}`);
});

test('every KB doc parses with required fields and a resolvable source', () => {
  for (const d of docs) {
    assert.ok(d.id && d.title, `doc missing id/title`);
    assert.match(d.sourceUrl, /^https?:\/\//, `doc ${d.id} has no valid source url`);
    assert.ok(['primary', 'secondary'].includes(d.sourceTier));
  }
});

test('legal-interpretation docs are flagged for sign-off', () => {
  // These four make legal-interpretation claims and must require sign-off.
  for (const id of ['ada-title-ii', 'ada-title-iii', 'section-508', 'obligations']) {
    assert.equal(docsById.get(id)?.signoffRequired, true, `${id} must require sign-off`);
  }
});

test('real-world questions retrieve and cite the correct source doc', () => {
  /** @type {Array<[string, string]>} */
  const cases = [
    ['What contrast ratio does body text need?', 'wcag-2-2-aa'],
    ['When must state and local governments comply with the ADA web rule?', 'ada-title-ii'],
    ['Who does Section 508 apply to?', 'section-508'],
    ['How do I make a voice bot accessible?', 'voice-accessibility'],
    ['What is a VPAT?', 'vpat-acr']
  ];
  for (const [q, expectedDoc] of cases) {
    const plan = planAnswer(q, ctx);
    assert.equal(plan.mode, 'grounded', `"${q}" should be grounded (was ${plan.mode})`);
    const citedDocs = plan.citations.map((c) => c.docId);
    assert.ok(
      citedDocs.includes(expectedDoc),
      `"${q}" should cite ${expectedDoc}; cited ${citedDocs.join(', ') || 'nothing'}`
    );
  }
});

test('off-topic questions are refused, not answered', () => {
  for (const q of ['What is the capital of France?', 'Recommend a good laptop']) {
    const plan = planAnswer(q, ctx);
    assert.equal(plan.mode, 'refuse', `"${q}" should be refused (was ${plan.mode})`);
  }
});
