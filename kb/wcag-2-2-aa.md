---
id: wcag-2-2-aa
title: WCAG 2.2 AA — High-Value Success Criteria
sourceTitle: W3C — How to Meet WCAG (Quick Reference)
sourceUrl: https://www.w3.org/WAI/WCAG22/quickref/
sourceTier: primary
signoffRequired: false
topics: [wcag, contrast, keyboard, focus, forms]
summary: The success criteria that matter most for a web app with a voice assistant.
order: 6
---

# Text alternatives

Success Criterion 1.1.1 (Non-text Content) requires text alternatives for non-text
content. Icons such as a microphone, send, close, or status indicator need an
equivalent accessible name.

# Color and contrast

Text and images of text must have a contrast ratio of at least 4.5 to 1 (SC 1.4.3).
User interface components and graphical objects, including focus indicators, must have
a contrast ratio of at least 3 to 1 (SC 1.4.11). Color must not be the only way
information is conveyed (SC 1.4.1).

# Keyboard operability

All functionality must be operable through a keyboard (SC 2.1.1) and keyboard focus
must never become trapped (SC 2.1.2). Every control, including a microphone toggle,
must work without a mouse.

# Focus visibility and order

Focus order must preserve meaning (SC 2.4.3) and the keyboard focus indicator must be
visible (SC 2.4.7). Under WCAG 2.2, the focused control must not be entirely hidden by
other content such as a sticky header or floating panel (SC 2.4.11, Focus Not
Obscured).

# Labels, errors, and status messages

Labels and instructions must be provided for inputs (SC 3.3.2), input errors must be
identified in text (SC 3.3.1), and status messages must be programmatically announced
without moving focus (SC 4.1.3). The accessible name of a control should include its
visible label text (SC 2.5.3, Label in Name).

# Reflow and zoom

Content must reflow without loss of function and remain usable when zoomed to 200%
(SC 1.4.4) and at narrow viewport widths (SC 1.4.10).

# Name, role, value

For all user-interface components, the name, role, state, and value must be
programmatically determinable (SC 4.1.2) so assistive technology can present and
operate them.
