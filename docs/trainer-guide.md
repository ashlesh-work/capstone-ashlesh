# Trainer Guide — Navigating AccessibleU & the Evaluation Console

**Live app:** [https://capstone.ashlesh.work/](https://capstone.ashlesh.work/) (hosted via Cloudflare; no install needed).
**Source code:** [https://github.com/ashlesh-work/capstone-ashlesh](https://github.com/ashlesh-work/capstone-ashlesh) — to run locally: clone, then `npm install && npm run dev` → http://localhost:5173.

This guide walks you through the app as an end user, then through the built-in evaluation console where every capstone capability — tracing, LLM-as-a-judge, prompt comparison, tools, memory, adaptation, and safety — is observable with a click.

## 1. The app in two minutes (end-user view)

- **Home & Topics:** plain-language ADA / Section 508 / WCAG content in English and Spanish. The same markdown knowledge base powers both the site pages and the assistant's retrieval.
- **The assistant:** open it from the launcher button. Ask by text, or by voice (mic works on the HTTPS URL). Every spoken turn is also shown as text, and grounded answers carry numbered citations that link to sources.
- **Try one question now:** *"What does WCAG 2.2 AA require for color contrast?"* — expect a cited, grounded answer.

## 2. Enable Evaluation mode

1. Scroll to the **page footer**.
2. Click **"Evaluation mode: Off"** — it flips to **On** and an **"Open evaluation console"** link appears next to it.
3. Click the link (or go directly to `/eval`). If the deployment has an access token configured, paste it into the **Access token** field at the top right — it is remembered for your browser session.

The toggle is per-browser and hidden from normal users by default. Your identity in the console is anonymous (a generated `user-…` / `sess-…` pair shown in the header) — no personal data is collected.

## 3. Traces tab — per-user, per-session tracing

- The **left sidebar** lists every user, expandable into their sessions (memory and tracing are scoped to one session; a new browser session starts fresh).
- Click a **session** → its turns appear as a table (time, redacted input, mode badge, latency, feedback).
- Click a **row** → the trace detail opens with a **span waterfall**: `plan → tool → retrieval → llm`, each bar proportional to its duration. Expand **attributes** under a span to see the routing decision, retrieval score and citations, or the model used. Failed spans are flagged in red — that is expected evidence for the tool-failure safeguard, not a bug.
- **PII proof:** ask the assistant a question containing an email or phone number, then open that trace — the stored input shows `[email]` / `[phone]`.

### Feedback → live adaptation

In any trace detail, click **"Too long"** — the confirmation shows the session's flags (`concise: true`). Ask that user's next question in the app: the answer is now capped at 3 sentences. **"Not cited"** similarly disables the uncited-fallback path for the session. This is the before/after adaptation evidence.

## 4. LLM-as-a-Judge tab — evaluation & prompt comparison

1. Pick a **prompt variant**: v1-minimal (naive baseline), v2-grounded-cited (production default), v3-strict-persona (grounded-or-refuse).
2. Click **"Run evaluation"** — the shared 16-case test set (grounded, off-topic, unsafe, ambiguous, tools, PII, Spanish) runs through the live pipeline and a separate judge model scores every answer 1–5 on **groundedness, citation correctness, safety, helpfulness**, with a rationale.
3. The **comparison table** accumulates one row per run — run v1, v2, and v3 to compare the same test set across prompts (the required Prompt → Output → Improved/Worsened evidence). Click **Details** for per-case scores; low scores are the interesting rows — read the judge's rationale and the raw answer.

> Note: on the hosted URL a run can outlive the proxy's ~100 s limit and show a timeout message. The run still completes server-side — revisit the tab after ~2 minutes and the results appear.

## 5. Safety probes tab — one-click safety evidence

Each card fires a real request through the agent (and is itself traced):

| Probe | Expected behaviour |
|---|---|
| Unsafe: fake compliance | Refusal — no help gaming auditors |
| Unsafe: legal advice | Refusal — no legal opinions |
| Off-topic refusal | Refusal without any LLM call |
| Escalation to human | `escalated` — hand-off with official contacts |
| PII redaction | Answer normally; trace stores `[email]`/`[phone]` |
| Tool: keyboard checklist | `tool` — deterministic curated checklist |
| Tool failure + safeguard | Failed tool span, safe fallback to retrieval |

## 6. Suggested 10-minute walkthrough

1. Ask the contrast question in the app → see citations. *(grounded RAG)*
2. Ask *"Who does ADA Title II apply to?"*, then *"and Title III?"* *(memory)*
3. Footer → Evaluation mode On → open the console.
4. Traces: open your session, inspect both traces' waterfalls. *(tracing)*
5. Fire all seven Safety probes. *(safety, tools, escalation)*
6. Back in Traces, mark one answer "Too long", re-ask in the app. *(adaptation)*
7. Judge tab: run v2, then v1; compare the averages. *(LLM-as-judge, prompt rule)*

## Where each requirement lives

| Capstone requirement | Where to see it |
|---|---|
| Retrieval + citations | Any grounded answer; retrieval span attributes |
| Tool usage + safeguard | Checklist/escalation probes; failed tool span |
| Memory & reset rules | Follow-up questions; new session = clean slate |
| Adaptation from feedback | Feedback buttons → next answers change |
| Tracing / latency / errors | Traces tab waterfall |
| LLM-as-a-judge + prompt comparison | Judge tab runs & comparison table |
| Safety-first behaviour | Safety probes tab |
| PII-safe logging | Redacted inputs in every stored trace |
