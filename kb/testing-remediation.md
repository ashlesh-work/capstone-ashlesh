---
id: testing-remediation
title: Testing & Remediation
sourceTitle: Section508.gov — Test for Accessibility + W3C WAI Evaluation
sourceUrl: https://www.section508.gov/test/
sourceTier: primary
signoffRequired: false
topics: [testing, remediation, qa, assistive-technology]
summary: How to evaluate accessibility and prioritize fixes.
order: 11
---

# Accessibility testing is broader than tools

A serious program combines automated rule scanning, manual expert evaluation, and
usability testing with people who use assistive technology. Automated tools catch only
a portion of issues; keyboard, focus, and screen-reader behavior need human review.

# A practical assistive-technology matrix

A useful baseline for manual coverage is NVDA or JAWS with a current browser on
Windows, VoiceOver with Safari on macOS and iOS, TalkBack with Chrome on Android, a
keyboard-only pass with no pointer, and a low-vision pass at 200% zoom with high
contrast and a narrow viewport.

# Fix the cheap, high-impact issues first

The fastest risk reduction usually comes from fixing focus and keyboard behavior,
accessible names and labels, live-region status messaging, transcript visibility, and
contrast. These are inexpensive compared with re-architecting a voice-only journey
after release.

# Highest-severity failures

The most serious failures for a voice-enabled app are: requiring voice to complete a
task with no alternative, trapping keyboard focus in the assistant, and presenting
audio-only conversation with no equivalent text. Treat these as release blockers.
