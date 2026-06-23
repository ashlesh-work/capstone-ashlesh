---
id: voice-accessibility
title: Accessible Voice Interfaces
sourceTitle: ADA.gov web guidance + W3C WCAG 2.2 (synthesized)
sourceUrl: https://www.ada.gov/resources/web-guidance/
sourceTier: primary
signoffRequired: false
topics: [voice, transcript, aria, multimodal]
summary: How to make an embedded voice bot accessible — voice as an addition, never the only path.
order: 7
---

# The core principle

A voice interface must never be the only way to complete a task. Every key action —
start a conversation, ask a question, review prior messages, correct a recognition
error, or reach a human — must also be possible with a keyboard, a screen reader, and
plain text.

# Transcript-first design

Every spoken prompt from the assistant must also appear as visible text, and every
recognized user utterance should be shown as text before any irreversible action.
A persistent, real-time transcript is the most reliable accessibility equivalent for
conversational audio and serves users who are deaf or hard of hearing, are in noisy
environments, or simply prefer to read.

# The microphone control

The microphone button must have a stable accessible name and state, such as "Start
voice input" and "Stop voice input." Its visible label should match its accessible
name. Do not rely on a press-and-hold gesture alone; provide a keyboard-operable
toggle or click-to-start / click-to-stop interaction.

# Announcing state without stealing focus

Use a polite live region (role="status") to announce connection, listening, and
completion states, and reserve assertive alerts (role="alert") for urgent failures so
the screen reader is not overwhelmed by every token of streamed text.

# The dialog pattern

If the assistant opens in a dialog, use the modal dialog pattern: move focus into the
dialog on open, trap focus within it, close on Escape, and return focus to the control
that launched it.

# Error recovery

When recognition fails, show and say what happened, preserve the user's prior text
where possible, and offer immediate recovery: retry the microphone, switch to typing,
or contact support.
