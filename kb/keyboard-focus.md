---
id: keyboard-focus
title: Keyboard & Focus Management
sourceTitle: W3C WAI-ARIA Authoring Practices + WCAG 2.2
sourceUrl: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
sourceTier: primary
signoffRequired: false
topics: [keyboard, focus, aria, dialog]
summary: Keyboard operability, focus order, and the modal dialog contract.
order: 8
---

# Everything works from the keyboard

A keyboard-only user must be able to reach and operate every interactive element by
Tab and Shift+Tab, activate it with Enter or Space, and never become stuck. This is
WCAG Success Criteria 2.1.1 (Keyboard) and 2.1.2 (No Keyboard Trap).

# Native HTML first

Use real buttons, links, inputs, and textareas before reaching for ARIA. The W3C
authoring practices warn that "No ARIA is better than Bad ARIA," because incorrect
roles and states can make the experience actively misleading to assistive-technology
users.

# The modal dialog contract

When a dialog opens, move focus to the dialog (its heading or first control), keep
focus trapped inside while it is open, close it on the Escape key, and return focus to
the element that opened it. The dialog should expose role="dialog" and
aria-modal="true" with an accessible name.

# Visible focus, never obscured

The focus indicator must be clearly visible (SC 2.4.7) and must not be completely
hidden behind sticky headers or floating chrome (SC 2.4.11). Do not remove focus
outlines without providing an equally visible replacement.

# A keyboard-only journey

A complete keyboard flow looks like: Tab to the assistant launcher, press Enter to
open it, land on the heading or first control, Tab through the transcript, text box,
microphone toggle, send, and close, activate with Enter, press Escape to close, and
return to the launcher.
