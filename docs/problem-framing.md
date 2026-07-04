# Problem Framing — Access508 (Capstone, Phase 1)

**Scenario:** Customer Support — AI Support Resolution Agent (Scenario 3 safety requirements adopted). Specific domain validated by trainer: digital-accessibility (ADA / Section 508) support.

## User persona & workflow
**Priya, Digital Compliance Coordinator** at a mid-size public university. Daily she fields questions from web editors, procurement, and leadership: "Do our videos need captions?", "What is a VPAT?", "Are we covered by Title II?". Today she digs through ADA.gov, section508.gov, and W3C docs manually — slow, error-prone, and risky if she paraphrases legal requirements incorrectly.

**Workflow supported:** first-line answering of ADA/508/WCAG questions from a curated, cited knowledge base — by text or voice (the product itself must be WCAG 2.2 AA, so the assistant is accessible to users with disabilities, its own end users).

## Exact problem
Staff need fast, trustworthy, **cited** answers to accessibility-compliance questions, with safe behaviour when the question is out of scope, ambiguous, or legal advice — without exposing PII or fabricating policy.

## Inputs / outputs / constraints / assumptions
- **Inputs:** typed or spoken questions (EN/ES), ≤1000 chars.
- **Outputs:** grounded answers with numbered citations to KB sources; labeled general guidance when no source matches; refusals; escalation hand-offs; curated checklists.
- **Constraints:** answers only from the curated KB; no legal advice; keys server-side only; PII-redacted logs; WCAG 2.2 AA UI.
- **Assumptions:** KB is authored from primary sources (ADA.gov, Access Board, W3C); counsel signs off on legal-interpretation pages; single-org deployment.

## Example user questions
1. "What does WCAG 2.2 AA require for color contrast?"
2. "Do videos on our website need captions?"
3. "What is a VPAT and who has to provide one?"
4. "Is my website compliant?" (ambiguous — must not guess)
5. "I want to talk to a human about filing an ADA complaint." (escalation)

## Success criteria
- ≥ 90% of grounded test-set answers judged ≥ 4/5 on groundedness and citation correctness (LLM-as-judge).
- 100% of unsafe/off-topic test cases refused or escalated (safety = 5/5).
- 0 axe violations; full keyboard journey passes (CI-gated).
- p50 answer latency < 5 s locally.
- Every turn traceable end-to-end (plan → retrieval → tool → LLM) per user & session.

## Known failure cases & edge scenarios
- Paraphrased questions that miss lexical retrieval (mitigated by embedding retriever option).
- Questions with no KB coverage → must fall back with a label or refuse, never fabricate.
- Legal-advice or "make me look compliant" requests → refuse + escalate.
- PII in questions → redaction before any storage.
- Short follow-ups ("what about Title III?") → session memory augments retrieval.
- Provider outage → graceful failure message, error trace recorded.
