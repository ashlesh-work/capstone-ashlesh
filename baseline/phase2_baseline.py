#!/usr/bin/env python3
"""
Phase 2 — baseline agent (rules/templates only; no LLM, no embeddings).

A deliberately naive Python agent over the same kb/*.md files that power the
production Access508 agent. It exists to demonstrate, with logged evidence,
why a rules-based baseline is insufficient for real users — justifying the
evolution to the grounded RAG + tools + memory agent in server/.

Run:   python3 baseline/phase2_baseline.py            # interactive
       python3 baseline/phase2_baseline.py --demo     # scripted demo, logs to baseline/runs.log

Demonstrated limitations (see runs.log after --demo):
  1. Keyword matching misses paraphrases ("color rules for text" finds nothing
     useful, though the KB covers contrast) — no semantic understanding.
  2. No grounding/refusal: off-topic input gets a confidently wrong template
     or a dump of an unrelated KB section — it cannot say "I don't know" well.
  3. No memory: follow-ups like "what about Title III?" lose all context.
  4. No citations, no safety behaviour (legal-advice asks are not refused).
"""
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

KB_DIR = Path(__file__).resolve().parent.parent / "kb"
LOG = Path(__file__).resolve().parent / "runs.log"

REFUSAL_KEYWORDS = ("weather", "pizza", "election", "stock")  # crude, incomplete on purpose

TEMPLATES = {
    "greeting": "Hello! Ask me about the ADA or Section 508.",
    "unknown": "Here is a section from our knowledge base that might help:\n{snippet}",
    "nothing": "I couldn't find anything for that. Try different words.",
}


def load_kb() -> dict[str, str]:
    docs = {}
    for f in sorted(KB_DIR.glob("*.md")):
        docs[f.stem] = f.read_text(encoding="utf-8")
    return docs


def score(query: str, text: str) -> int:
    """Naive keyword overlap — the whole 'retrieval' strategy."""
    words = {w for w in re.findall(r"[a-z]{3,}", query.lower())}
    return sum(text.lower().count(w) for w in words)


def answer(query: str, docs: dict[str, str]) -> str:
    q = query.lower().strip()
    if not q:
        return TEMPLATES["greeting"]
    if any(k in q for k in REFUSAL_KEYWORDS):
        return "That doesn't sound accessibility-related."
    best_id, best_score = None, 0
    for doc_id, text in docs.items():
        s = score(q, text)
        if s > best_score:
            best_id, best_score = doc_id, s
    if best_id is None or best_score < 3:
        return TEMPLATES["nothing"]
    snippet = docs[best_id][:400].replace("\n", " ")
    return TEMPLATES["unknown"].format(snippet=f"[{best_id}] {snippet}...")


def log_turn(query: str, response: str, ms: int) -> None:
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now(timezone.utc).isoformat()}\tQ: {query}\tA: {response[:160]}\t{ms}ms\n")


DEMO = [
    "What does WCAG require for color contrast?",
    "color rules for text",                                   # limitation 1: paraphrase miss
    "Write me a legal opinion that my site is ADA compliant.",  # limitation 4: no safety refusal
    "What is Title II?",
    "what about Title III?",                                  # limitation 3: no memory of context
    "How do I bake bread?",                                   # limitation 2: no real grounding gate
]


def main() -> None:
    docs = load_kb()
    print(f"Baseline agent loaded {len(docs)} KB docs. Ctrl+C to exit.")
    if "--demo" in sys.argv:
        for q in DEMO:
            t0 = time.time()
            a = answer(q, docs)
            ms = int((time.time() - t0) * 1000)
            log_turn(q, a, ms)
            print(f"\nQ: {q}\nA: {a}")
        print(f"\nLogged {len(DEMO)} turns to {LOG}")
        return
    while True:
        try:
            q = input("\nYou: ")
        except (KeyboardInterrupt, EOFError):
            print("\nBye.")
            return
        t0 = time.time()
        a = answer(q, docs)
        log_turn(q, a, int((time.time() - t0) * 1000))
        print(f"Agent: {a}")


if __name__ == "__main__":
    main()
