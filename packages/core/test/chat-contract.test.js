// @ts-check
/**
 * Verifies the chat orchestration contract the server route relies on:
 *   - refusal  -> the LLM is NEVER called (no spend, no hallucination surface)
 *   - fallback -> the LLM IS called, but with NO citations
 *   - grounded -> the LLM IS called, WITH citations
 * Pure logic, runnable offline with a spy LLM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDocs, createLexicalRetriever, planAnswer } from '../index.js';

const { docs, chunks } = loadDocs([
  `---
id: wcag-aa
title: WCAG 2.2 AA
sourceTitle: W3C
sourceUrl: https://www.w3.org/TR/WCAG22/
sourceTier: primary
signoffRequired: false
topics: [wcag]
summary: target
---
# Contrast
Text must meet a contrast ratio of at least 4.5 to 1.`
]);
const ctx = {
  retriever: createLexicalRetriever(chunks),
  docsById: new Map(docs.map((d) => [d.id, d])),
  threshold: 0.12
};

/** Simulate the server route's decision to call the model or not. */
function handle(question) {
  const plan = planAnswer(question, ctx);
  let llmCalls = 0;
  let answer;
  if (plan.mode === 'refuse') {
    answer = plan.directMessage;
  } else {
    llmCalls += 1; // <-- the model is only ever invoked here
    answer = `LLM(${plan.messages.length} messages)`;
  }
  return { mode: plan.mode, llmCalls, citations: plan.citations, answer };
}

test('refusal does not call the model', () => {
  const r = handle('what time is the football game');
  assert.equal(r.mode, 'refuse');
  assert.equal(r.llmCalls, 0);
  assert.equal(r.citations.length, 0);
});

test('grounded calls the model and returns citations', () => {
  const r = handle('what contrast ratio is required');
  assert.equal(r.mode, 'grounded');
  assert.equal(r.llmCalls, 1);
  assert.ok(r.citations.length >= 1);
});

test('fallback calls the model but returns no citations', () => {
  const r = handle('what does the ADA say about parking lots');
  assert.equal(r.mode, 'fallback');
  assert.equal(r.llmCalls, 1);
  assert.equal(r.citations.length, 0);
});
