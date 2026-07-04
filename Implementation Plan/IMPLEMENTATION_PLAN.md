# Access508 — Capstone Gap Validation & Implementation Plan

**Date:** 2026-07-04 · **Track:** B (Framework-free, justified; no Flowise) · **Scenario mapping:** Scenario 3 — Support/Resolution agent (informational, non-legal-advice), safety requirements adopted as-is.

---

## 1. Requirement Validation (current state vs Requirement.md)

| Phase | Requirement | Status | Gap |
|---|---|---|---|
| 1 | Problem framing, persona, success criteria, edge cases | ✗ Missing | Write 1–2 page framing doc |
| 2 | Baseline agent (rules/templates) + ≥2 logged limitations | ✗ Missing | Add small Python baseline + logged runs |
| 3 | LLM integration + 2–3 prompt variants, comparison table | ◐ Partial | Prompts exist (`packages/core/src/prompt.js`); no versioned variants or comparison table |
| 4 | Embeddings/RAG, with/without comparison, missing-info handling | ✓ Done | Lexical + embedding retrievers, refusal path exist; capture evidence only |
| 5 | ≥2 tools, tool-calling, 1 incorrect call, loop safeguards | ✗ Missing | Agent is a single RAG pipeline today |
| 6 | Planning + memory, retention/reset rules, multi-turn | ✗ Missing | `/api/chat` is stateless |
| 7 | Feedback storage + behaviour adaptation, before/after | ✗ Missing | No feedback loop |
| 8 | Deployment + **logging/tracing**, latency/error capture, graceful failure | ◐ Partial | Docker + audit log + latency exist; no trace IDs, spans, or per-user/session tracing |
| 9 | Evaluation harness, metrics, **LLM-as-a-judge**, root cause + fix | ✗ Missing | Instructor-mandated |
| Safety | Refuse unsafe, no fabrication, escalation, **no PII in logs** | ◐ Partial | Refusal/grounding ✓; no escalation tool; `auditAnswer` logs `queryPreview` → PII risk, must redact |
| Deliverables | Framing doc, demo script, eval report, justification | ✗ Missing | Produce as docs |

**Framework-free justification (Track B):** custom Node/TS pipeline gives equivalent capabilities — retrieval (`packages/core/retriever.js`), grounding gate (`grounding.js`), prompt building (`prompt.js`), adapters behind interfaces. Document this mapping explicitly.

---

## 2. Implementation Plan (priority order)

### WS1 — Tracing (instructor-mandated)
New `server/src/lib/tracing.ts` + SQLite store (`better-sqlite3`, file: `data/traces.db`, git-ignored).

- **Identity:** client generates anonymous `userId` (persisted in localStorage) and `sessionId` (per browser session — new tab/reload after close = new session). Sent as headers on every `/api/*` call. **Memory and traces are scoped to one session per user** — session end resets context.
- **Trace model:** `trace(traceId, userId, sessionId, ts, question_redacted, mode, latencyMs, error?)` with child **spans**: `retrieval` (topScore, docIds), `grounding` (decision), `tool_call` (name, args, ok/fail), `llm` (model, tokens, latency), `judge` (scores).
- **PII-safe:** redact emails/phones/numbers from stored question text; never store raw transcripts of STT audio. Fixes the existing `queryPreview` risk.
- Wire into `routes/chat.ts` (wrap existing `auditAnswer`), `stt.ts`, `tts.ts`.

### WS2 — LLM-as-a-Judge (instructor-mandated)
New `server/src/eval/judge.ts` + `eval/testset.json` (15–20 questions: grounded, off-topic, ambiguous, unsafe, Spanish).

- Judge prompt scores each answer 1–5 on: **groundedness** (vs retrieved context), **citation correctness**, **safety compliance** (refusal/escalation behaviour), **helpfulness**; returns JSON + rationale.
- Uses existing OpenAI adapter; judge model configurable via `.env` (`JUDGE_MODEL`).
- `POST /api/eval/run` executes the test set through the live pipeline, judges each response, stores results as spans; supports running per prompt-variant for the **prompt comparison table** (P3 rule: same test set, 2–3 variants, Prompt → Output → Improved/Worsened).

### WS3 — Trainer Evaluation UI (clickable)
New route `web /eval` (link in footer; optional `EVAL_TOKEN` gate).

- **Traces tab:** table of sessions grouped **by user → session**; click a session → its traces; click a trace → span waterfall (retrieval → grounding → tools → LLM) with latency, mode, citations.
- **Evaluation tab:** button "Run LLM-as-judge on test set"; results table with per-criterion scores, averages, failures highlighted; prompt-variant comparison table.
- **Safety tab:** canned unsafe/off-topic prompts trainer can fire one click each, showing refusal/escalation live.
- Server endpoints: `GET /api/traces?userId&sessionId`, `GET /api/traces/:id`, `GET /api/eval/results`.

### WS4 — Tools (Phase 5)
Lightweight tool router in `server/src/agent/tools.ts` (framework-free: schema + dispatch + max-2-iterations loop guard).

- Tools: `kb_search(query)`, `escalate_to_human(reason)` (satisfies safety escalation), `wcag_checklist(topic)`.
- Evidence: log one deliberate incorrect tool selection + the guardrail that catches it (traced as failed `tool_call` span).

### WS5 — Memory & Planning (Phase 6)
`server/src/agent/memory.ts`: short-term conversation history keyed by `userId+sessionId` (in-memory Map + trace store), last N turns injected into prompt.

- **Retention rule:** memory lives for one session only; reset on new session or `POST /api/session/reset`. Documented explicitly.
- Simple planner: classify intent → retrieve → (optional tool) → answer; plan steps recorded as spans.

### WS6 — Feedback & Adaptation (Phase 7)
`POST /api/feedback` (👍/👎 + optional tag: "too long / not cited / wrong"), stored per session.

- Adaptation: negative "too long" → concise style flag in session prompt; "not cited" → force grounded-only mode. Before/after demonstrated in traces and eval UI.

### WS7 — Baseline + Docs (Phases 1–3, deliverables)
- `baseline/phase2_baseline.py`: rules/template Python baseline over the same KB; log runs showing ≥2 limitations (no semantics, no citations, no memory) → justifies the evolution to the full agent.
- `prompts/` : v1 (minimal), v2 (grounded+cited, current), v3 (persona+refusal-strict) — versioned, run through WS2.
- Docs folder: `docs/problem-framing.md`, `docs/demo-script.md` (3–5 forced interactions incl. one failure + fix), `docs/evaluation-report.md` (metrics, root cause, fix, before/after), `docs/design-justification.md` (Track B mapping, safety-as-feature).

---

## 3. Sequence & Effort

| Order | Workstream | Est. effort |
|---|---|---|
| 1 | WS1 Tracing | 0.5–1 day |
| 2 | WS4 Tools + WS5 Memory | 1 day |
| 3 | WS2 Judge + prompt variants | 0.5–1 day |
| 4 | WS3 Trainer UI | 1 day |
| 5 | WS6 Feedback | 0.5 day |
| 6 | WS7 Baseline + docs + evidence capture | 1 day |

**Definition of done:** every Requirement.md checklist item maps to a file/screenshot/trace; trainer can open `/eval`, click a user → session → trace, and run the judge without touching code.

---

## 4. Risks / Decisions

1. **Python requirement (Phases 2–9 say "coding: required" with Python skills):** plan keeps production agent in TS (Track B justified) and adds the Python baseline for Phase 2. *Confirm with trainer this satisfies the rubric.*
2. **Submission format** is pdf/zip/ipynb/docx — plan a zip of repo + docs + evidence PDF.
3. Existing `queryPreview` logging is a PII-in-logs violation risk → fixed in WS1; call it out in the eval report as a found-and-fixed safety issue (good evidence).
