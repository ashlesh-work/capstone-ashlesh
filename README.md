# Access508

A production-grade, **WCAG 2.2 AA** educational web app on the **ADA & Section 508**, with an
embedded **transcript-first voice assistant** that answers only from a curated, **cited**
knowledge base. Built to demonstrate that *accessible* and *premium* are not opposites.

> Informational only — not legal advice. Legal-interpretation pages are marked for
> counsel/agency sign-off.

---

## Architecture at a glance

```
Browser (React + Vite + TS)          Server (Node + Fastify, TS)         External
─────────────────────────────        ──────────────────────────         ────────
Accessible UI · theme toggle         /api/chat  → RAG + grounding        OpenAI  (STT, LLM)
Visible transcript + citations  ──▶   /api/stt   → speech-to-text   ──▶   ElevenLabs (TTS)
Keyboard + focus manager             /api/tts   → streaming voice
Text fallback (voice is additive)    key custody · rate-limit · audit    KB (markdown + index)
        ▲  NO API KEYS EVER  ────────────────  the keys live only here
```

- **Keys never reach the browser.** The front end talks only to this server; the server holds the keys.
- **Voice is additive.** Every task is completable with keyboard + text alone.
- **Grounded + cited.** Retrieval-first; a labeled model fallback only when nothing matches; off-topic is refused. Every grounded answer carries a source citation.
- **Provider-swappable.** STT / LLM / TTS sit behind interfaces — swap via `.env`, no code change.
- **One content source.** The same `/kb/*.md` files power the site pages *and* the bot's retrieval.

Full reference diagram: `access508_reference_architecture_v0.1_2026-06-17.md` (repo delivered alongside).

---

## Repository layout

```
access508/
├── packages/core/   Stack-agnostic correctness core (ESM + JSDoc): KB parsing, lexical
│                     retrieval, grounding decision, citations, prompt building. Unit-tested,
│                     runs under plain Node with no build step and no network.
├── server/          Fastify proxy: adapters (OpenAI, ElevenLabs), routes, key custody, audit.
├── web/             React + Vite front end: accessible UI, theme system, voice assistant.
├── kb/              The ADA/508 knowledge base (markdown + frontmatter, version-controlled).
└── Dockerfile       Portable container (serves web + API from one origin).
```

---

## Run it locally (Demo / POC / POV)

Prerequisites: **Node 20+**.

```bash
# 1. Install
npm install

# 2. Configure keys (server-side only; .env is git-ignored)
cp .env.example .env
#   set OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

# 3. Run the API and the web app together
npm run dev
#   web → http://localhost:5173   (proxies /api to the server)
#   api → http://localhost:8787
```

Open http://localhost:5173. Type or speak to the assistant. With no keys set, the **site and
keyboard/text journeys still work**; only live STT/LLM/TTS need keys.

### Retrieval modes
- `RETRIEVER=lexical` (default) — offline TF-IDF, zero network, great for local/CI.
- `RETRIEVER=embedding` — OpenAI embeddings for higher-quality grounding (needs `OPENAI_API_KEY`).
  Re-tune `RETRIEVAL_THRESHOLD` (~0.30–0.40 for embeddings vs 0.12 for lexical).

---

## The build → test → validate → fix loop

```bash
npm run test:core      # grounding, citation, refusal logic  (offline, fast)
npm run typecheck      # TypeScript across server + web
npm run test --workspace web      # jest-axe component a11y + unit
npm run test:a11y --workspace web # Playwright keyboard + axe end-to-end (chat stubbed)
```

CI runs all four as a gate (`.github/workflows/ci.yml`). The accessibility checks must be green
to merge.

**What's verified automatically vs. manually:**
- ✅ Automated: grounding/citation/refusal logic, axe (0 violations), keyboard journey, focus return, typecheck.
- 👤 Manual (recommended before production, per the research report): NVDA/JAWS + browser, VoiceOver + Safari, TalkBack + Chrome, 200% zoom / low-vision pass, and assistive-technology user testing.

---

## Container (portable, later)

```bash
docker build -t access508 .
docker run -p 8787:8787 --env-file .env access508
# open http://localhost:8787   (server serves the built front end)
```

The browser↔server security boundary, adapter interfaces, and KB contract are identical in local
and container modes — only configuration changes.

---

## Accessibility commitments (WCAG 2.2 AA)

- Semantic landmarks, skip link, visible focus, logical focus order, focus not obscured.
- Transcript-first: every spoken turn is shown as text; voice is never required.
- Real `<button>` mic toggle with matching visible + accessible name and `aria-pressed`.
- Polite live region for state; `role="log"` transcript; citations as real links.
- APG modal dialog: focus moves in, is trapped, Esc closes, focus returns to the launcher.
- Dark / Light / **System** theme (System default, no flash-of-wrong-theme); `prefers-reduced-motion` honored.
- Contrast verified: text ≥ 4.5:1, UI/non-text ≥ 3:1, on both light and dark.

---

## Provider / content notes

- **STT path (Phase 1):** Whisper STT + LLM + ElevenLabs TTS, for a clean transcript/citation seam.
  OpenAI Realtime can be added as a swappable STT adapter.
- **KB content** is authored from the attached research and primary official sources (ADA.gov,
  U.S. Access Board, W3C). Pages with `signoffRequired: true` make legal-interpretation claims and
  must be reviewed by counsel/agency before production.

## Production hardening (documented next steps)
- Multi-stage Docker build with `npm prune --omit=dev` for a smaller runtime image.
- Shared-store rate limiter (e.g. Redis) for multi-instance deployments.
- Managed vector store behind the existing retriever interface.
- Streaming LLM responses (SSE) for lower perceived latency.
- Live human-handoff integration and full prerecorded-media caption library.
