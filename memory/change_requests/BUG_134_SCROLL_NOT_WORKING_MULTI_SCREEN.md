# BUG-134: Scroll Not Working on Multiple Screens (Place Order, QSR) — Windows-Specific, Intermittent

**ID:** BUG-134
**Type:** Bug
**Status:** INTAKE COMPLETE → INVESTIGATION
**Priority:** P1 (HIGH) — blocks order-taking workflow on Windows machines
**Area:** Order Entry / QSR (cross-screen)
**Sprint:** POS 5.0
**Created:** 2026-06-15
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (owner reproduced on Windows)

---

## Symptom

Scroll on the menu item grid / cart area is **intermittently non-functional** on Windows systems. The scrollbar is visible but does not respond to scroll wheel or drag. Affects:

1. **Place Order screen** — center menu item grid (product cards)
2. **QSR screen** — cart items list and/or menu area

**Platform behavior:**
- **Mac + Chrome:** Works correctly
- **Windows + Chrome (some systems):** Intermittent — sometimes scrolls, sometimes doesn't
- Pattern: not consistently reproducible; same user on same machine sees it work and fail at different times

## Evidence

- Screenshot 1: Place Order screen (QSR/Collect Payment view) — owner-provided 2026-06-15
- Screenshot 2-4: QSR screen on Windows device — owner-provided 2026-06-15
- Stored at: `/app/memory/evidence/BUG-134/`
- Steps to reproduce: Open Place Order or QSR screen on a Windows machine → try scrolling the item grid → scroll may not respond
- Source: OWNER-REPORTED
- Confidence: CONFIRMED

## Duplicate Check

- **DISTINCT** — no existing bug covers this symptom
- BUG-131 (sidebar scroll sticky) — CLOSED, different component and symptom
- CR-036 (BulkEditor scroll) — CLOSED, different screen entirely

## Blast Radius

- **Estimated scope:** MEDIUM (3-5 files)
- **Hotspot files touched:** YES — `OrderEntry.jsx` (R5 hotspot)
- **Key scroll/overflow points identified:**
  - `OrderEntry.jsx:1561` — `overflow-y-auto` on item container
  - `CategoryPanel.jsx:44` — `overflow-y-auto` on category list
  - `DashboardPage.jsx:1670` — `overflow-auto` on main content area
  - `DashboardPage.jsx:1675` — `overflow-auto` on inner wrapper
  - `CartPanel.jsx` — QSR billing section (no explicit overflow found — may be inherited)
- **Total scroll/overflow references in order-entry dir:** 55

## Hypotheses (for Investigation agent)

1. **CSS `overflow-y: auto` + flexbox interaction on Windows Chrome** — Windows Chrome renders scrollbars differently (overlay vs classic). When `overflow-y: auto` is used inside a flex container with `min-h-0` missing, scroll may silently fail on some viewport sizes.

2. **Custom scrollbar CSS hiding the native scrollbar** — if `index.css` or Tailwind config hides/overrides native scrollbar (`::-webkit-scrollbar` rules), Windows Chrome may lose scroll functionality while Mac keeps it via overlay scrollbar.

3. **Pointer-events or opacity overlay blocking scroll** — `OrderEntry.jsx:1561` has `pointerEvents: isPlacingOrder ? 'none' : 'auto'` — if `isPlacingOrder` state gets stuck, scroll is blocked. Intermittent state bug.

4. **Viewport/resolution dependent** — Windows machines at certain resolutions may cause flex containers to not overflow (content fits), so no scroll is triggered. But owner says scrollbar IS visible, so this is less likely.

## Routing

**→ INVESTIGATION agent** — platform-specific, intermittent, needs root cause analysis before any code fix. Not a straightforward code change.

## Open Questions

None — investigation will surface what's needed.
