# Engineering & Product Justification — Access508

## Track B: framework-free, justified (no Flowise)
No LangChain/CrewAI/Flowise. Equivalent capabilities are implemented explicitly, which keeps the correctness-critical logic unit-testable offline and auditable:

| Framework capability | Access508 equivalent |
|---|---|
| Chains/pipelines | `packages/core/pipeline.js` (pure, unit-tested plan: retrieve → ground → cite → prompt) |
| Retrievers/vector stores | `packages/core/retriever.js` (TF-IDF) + `server/src/rag/embeddingRetriever.ts` (OpenAI embeddings) behind one interface |
| Tool calling | `server/src/agent/tools.ts` — declared schemas, routing logic, loop guard (`TOOL_MAX_ITERATIONS`) |
| Agent executor | `server/src/agent/agent.ts` — plan → tool → retrieval → LLM, every step traced |
| Memory | `server/src/lib/session.ts` — session-scoped, TTL + reset rules |
| Callbacks/tracing | `server/src/lib/tracing.ts` — per-turn traces with spans, JSONL persistence |
| Evaluation | `server/src/eval/` — LLM-as-judge harness + versioned prompt variants |
| Prompt templates | `packages/core/prompt.js` + `server/src/eval/promptVariants.ts` (v1/v2/v3) |

**Why not a framework?** The product's differentiator is verifiable safety (grounding gate, citation contract, refusal path) and WCAG-grade explainability. A ~800-line explicit core is fully covered by offline unit tests (`npm run test:core`) — smaller than the framework glue it would replace, with no black-box behaviour to explain to auditors.

## Key design decisions
- **Grounding gate before the LLM** — refusals never touch the model, eliminating the fabrication surface for out-of-scope input.
- **Keys server-side only** — browser never sees provider keys; adapters are swappable via `.env`.
- **Default prompt = v2-grounded-cited** — chosen from judged comparison: v1 fabricates on missing-info cases; v3 over-refuses (helpfulness cost). v2 keeps groundedness/citations ≈ v3 while preserving usefulness.
- **Deterministic tools where determinism wins** — checklists and escalation are curated text, not generations: zero hallucination risk in the highest-stakes outputs.
- **Anonymous identity (userId + sessionId)** — user-wise tracing without collecting PII; one session at a time, memory dies with the session.
- **JSONL persistence** — traces/eval runs are append-only files: portable, diffable, zero extra infrastructure for a POC; swap for a DB behind the same functions in production.
- **Safety as a feature** — refusal, labeled uncertainty, human escalation, PII redaction: all demonstrable one-click at /eval → Safety probes, each producing a trace.

## Deployment assumptions & limitations
Single-instance Node 20 (local or Docker); in-memory session store and rate limiter (documented: Redis for multi-instance); LLM/STT/TTS require provider keys; KB legal-interpretation pages need counsel sign-off before production.
