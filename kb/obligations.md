---
id: obligations
title: Your Obligations — A Practical Checklist
sourceTitle: ADA.gov web guidance + Section508.gov (synthesized)
sourceUrl: https://www.section508.gov/manage/laws-and-policies/
sourceTier: primary
signoffRequired: true
topics: [obligations, checklist, compliance]
summary: What an organization should actually do to meet ADA/508 expectations for a web app.
order: 10
---

# Pick a conformance target

Decide your target up front: WCAG 2.1 AA is the minimum defensible bar, and WCAG 2.2
AA is the better engineering target for a new build.

# Build accessibility in, not on

Provide semantic structure and headings, skip navigation, visible focus, sufficient
text and non-text contrast, keyboard operability, reflow and zoom support, and clear
labels, instructions, and error messages for every control.

# Keep voice additive

If you add a voice assistant, keep a full text and keyboard path for every task,
render a visible transcript, and make the microphone keyboard-operable with a clear
listening state.

# Test in three ways

Combine automated scanning in your pipeline, manual expert review of keyboard and
screen-reader behavior, and usability testing with people who use assistive
technology. Automated tools alone are not sufficient.

# Document conformance

For procurement and accountability, maintain a VPAT or Accessibility Conformance
Report and request one for every major third-party component you embed.

# Note on legal interpretation

This checklist reflects common practice and DOJ-identified features; it is not legal
advice. Counsel should confirm the specific obligations and deadlines that apply.
