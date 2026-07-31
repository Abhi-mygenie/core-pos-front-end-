# BUG-136 — Sidebar Scroll Jumps to Top on Navigation

**ID:** BUG-136
**Priority:** P2 — UX annoyance, no data loss, workaround exists (scroll manually)
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (reproduced via investigation)
**Duplicate check:** DISTINCT (BUG-131 was sticky bottom — different issue)
**Blast radius:** LARGE — 43 files import Sidebar (every page renders its own instance)

---

## Description

When clicking any navigation item in the Insights sidebar, the sidebar scroll position resets to the top. User must scroll down again to find the next item they want to click.

## Steps to Reproduce

1. Login → navigate to any Insights report (e.g. Sales)
2. Scroll down in sidebar to see Tax/Discounts/Staff/etc. categories
3. Click any item below the fold (e.g. "Discount Report")
4. **Observed:** Sidebar jumps to top, showing Dashboard/Settlement at top
5. **Expected:** Sidebar stays scrolled to the same position

## Root Cause (from Investigation)

Every report screen renders its own `<Sidebar />` instance inside its JSX. There is no shared layout wrapper. When React Router navigates:

```
Route A unmounts (including its Sidebar instance)
  → Route B mounts (with a NEW Sidebar instance)
  → New Sidebar scroll position = 0 (top)
```

The Sidebar component is destroyed and recreated on every navigation, losing scroll state.

## Evidence

- 43 files import Sidebar
- 0 shared layout wrappers exist
- App.js has no Sidebar — each page owns its own
- Investigation report: hypothesis 1 confirmed

## Blast Radius

- LARGE: 43 files affected (all pages that render Sidebar)
- Fix touches Sidebar architecture, not individual screens

---

*Intake: 2026-06-16. Investigation complete. Ready for Planning (Gate 2-3).*
