# Evaluation Report — Access508 (Phase 9)

## Method
- **Test set:** 16 cases (`server/src/eval/testset.json`) spanning grounded, missing-info, off-topic, unsafe, ambiguous, escalation, tool, tool-failure, PII, and Spanish categories. The **same set** is used for every run (Prompt Comparison Rule).
- **LLM-as-a-judge:** a separate judge model (`JUDGE_MODEL`, default gpt-4o-mini, temperature 0, JSON-only output) scores each answer 1–5 on **groundedness, citation correctness, safety, helpfulness**, with a one-sentence rationale. Runs persist to `data/eval-runs.jsonl` and render at **/eval → LLM-as-a-judge**.
- **Prompt variants compared:** v1-minimal (no grounding contract) · v2-grounded-cited (production) · v3-strict-persona (grounded-or-refuse).

> Run the evaluation live: /eval → select variant → Run evaluation. Record the comparison table (Prompt → Output → What Improved/Worsened) from the UI for the submission PDF. Expected pattern: v1 scores high on helpfulness but fails groundedness/citations on missing/off-topic cases (it fabricates); v2 balances all four; v3 maximizes groundedness/safety but loses helpfulness on fallback-worthy questions.

## Consistency & quality metrics
- Per-run averages per dimension + average latency (UI table).
- Cross-run consistency: re-run the same variant; averages should vary < ±0.3.
- Latency per span (retrieval vs LLM) visible in every trace waterfall.

## Root cause analysis (found → fixed, with before/after)
1. **PII in audit logs (found in review).** The original `auditAnswer` stored a raw `queryPreview`. *Root cause:* logging predated the tracing design. *Fix:* central redaction (`redact()`) applied to every stored question/answer preview in traces; verified by the PII probe (stored trace shows `[email]`/`[phone]`). 
2. **Baseline paraphrase misses (Phase 2 evidence, `baseline/runs.log`).** *Root cause:* keyword overlap has no semantics. *Fix:* TF-IDF retrieval + optional embeddings + grounding gate in the production pipeline; judged grounded cases confirm.
3. **Incorrect tool selection ("checklist for underwater basket weaving").** *Root cause:* keyword router over-triggers on "checklist". *Fix (safeguard, not prevention):* failed tool call is traced and falls back to kb_search, capped by `TOOL_MAX_ITERATIONS` — demonstrating detect-and-recover rather than silent failure.

## Safety & ethics review
- Refusals: off-topic and policy-violating asks refuse without LLM calls (no fabrication surface).
- No legal advice; `signoffRequired` KB pages flagged for counsel; escalation tool routes to humans (ADA Information Line, section508.gov).
- PII: redaction before storage; conversation memory is in-process only and dies with the session (TTL 60 min).
- Uncertainty: fallback answers are explicitly labeled "General guidance (not from a cited source)"; ambiguous compliance questions are answered with method-not-verdict.

## Next-step improvements
Managed vector store behind the retriever interface; streaming responses; judge-in-CI regression gate on every KB/prompt change; human-review queue for escalations; multi-session (long-term) memory with explicit user consent.
