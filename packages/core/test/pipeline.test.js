// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDocs,
  createLexicalRetriever,
  planAnswer,
  isInScope
} from '../index.js';

// --- Minimal in-memory KB used to exercise the engine deterministically. ---
const RAW_DOCS = [
  `---
id: section-508
title: Section 508
sourceTitle: Section508.gov
sourceUrl: https://www.section508.gov/
sourceTier: primary
signoffRequired: true
topics: [508, federal]
summary: Federal ICT accessibility law.
---
# Scope
Section 508 applies to federal agencies and the information and communication
technology they develop, procure, maintain, or use.

# Standard
The Revised 508 Standards incorporate WCAG 2.0 Level A and AA for electronic content.`,

  `---
id: wcag-aa
title: WCAG 2.2 AA
sourceTitle: W3C WCAG
sourceUrl: https://www.w3.org/TR/WCAG22/
sourceTier: primary
signoffRequired: false
topics: [wcag, contrast]
summary: The engineering conformance target.
---
# Contrast
Text must meet a contrast ratio of at least 4.5 to 1. User interface components
and focus indicators must meet at least 3 to 1.

# Keyboard
All functionality must be operable through a keyboard without requiring a mouse.`
];

const { docs, chunks } = loadDocs(RAW_DOCS);
const docsById = new Map(docs.map((d) => [d.id, d]));
const retriever = createLexicalRetriever(chunks);
const ctx = { retriever, docsById, threshold: 0.12 };

test('parses frontmatter including booleans and arrays', () => {
  const d = docsById.get('section-508');
  assert.equal(d?.signoffRequired, true);
  assert.deepEqual(d?.topics, ['508', 'federal']);
  assert.equal(d?.sourceTier, 'primary');
});

test('grounded: a clear in-KB question retrieves and cites the right doc', () => {
  const plan = planAnswer('What contrast ratio does text need for WCAG?', ctx);
  assert.equal(plan.mode, 'grounded');
  assert.ok(plan.citations.length >= 1);
  assert.equal(plan.citations[0].docId, 'wcag-aa');
  // Messages must carry numbered context and the question.
  assert.ok(plan.messages);
  const userMsg = plan.messages.find((m) => m.role === 'user');
  assert.match(userMsg.content, /\[1\]/);
  assert.match(userMsg.content, /4\.5/);
});

test('grounded: citation carries the authoritative source url + signoff flag', () => {
  const plan = planAnswer('Who must comply with Section 508?', ctx);
  assert.equal(plan.mode, 'grounded');
  const cite = plan.citations[0];
  assert.equal(cite.docId, 'section-508');
  assert.equal(cite.sourceUrl, 'https://www.section508.gov/');
  assert.equal(cite.signoffRequired, true);
});

test('refuse: an out-of-scope question is declined without an LLM call', () => {
  const plan = planAnswer('What is the best pizza topping?', ctx);
  assert.equal(plan.mode, 'refuse');
  assert.equal(plan.messages, null);
  assert.ok(plan.directMessage && plan.directMessage.length > 0);
  assert.equal(plan.citations.length, 0);
});

test('fallback: in-scope but unmatched question is labeled, not fabricated', () => {
  // "ada" marks scope, but this KB has no ADA Title III content → weak retrieval.
  const plan = planAnswer('What are the ADA rules for service animals in restaurants?', ctx);
  assert.equal(plan.mode, 'fallback');
  assert.equal(plan.citations.length, 0);
  assert.ok(plan.messages);
  const sys = plan.messages.find((m) => m.role === 'system');
  assert.match(sys.content, /General guidance/);
});

test('isInScope detects domain terms', () => {
  assert.equal(isInScope('how do I make my site accessible'), true);
  assert.equal(isInScope('tell me a joke'), false);
});

test('citations never reference a doc that was not retrieved', () => {
  const plan = planAnswer('keyboard operable functionality', ctx);
  for (const c of plan.citations) {
    assert.ok(docsById.has(c.docId));
  }
});

test('spanish: routes correctly to Spanish prompts and refusal messages', () => {
  const spanishCtx = { ...ctx, lang: 'es' };
  
  // Refusal
  const refusalPlan = planAnswer('What is the best pizza topping?', spanishCtx);
  assert.equal(refusalPlan.mode, 'refuse');
  assert.match(refusalPlan.directMessage, /Solo puedo ayudarte con preguntas sobre la ADA/);

  // Fallback
  const fallbackPlan = planAnswer('What are the ADA rules for service animals in restaurants?', spanishCtx);
  assert.equal(fallbackPlan.mode, 'fallback');
  const fallbackSys = fallbackPlan.messages.find((m) => m.role === 'system');
  assert.match(fallbackSys.content, /Orientación general/);
  assert.match(fallbackSys.content, /español mexicano/);

  // Grounded
  const groundedPlan = planAnswer('What contrast ratio does text need for WCAG?', spanishCtx);
  assert.equal(groundedPlan.mode, 'grounded');
  const groundedSys = groundedPlan.messages.find((m) => m.role === 'system');
  assert.match(groundedSys.content, /Responde ÚNICAMENTE utilizando los pasajes/);
  assert.match(groundedSys.content, /español mexicano/);
});
