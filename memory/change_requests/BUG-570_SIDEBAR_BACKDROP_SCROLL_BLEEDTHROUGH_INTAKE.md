# BUG-570 — Intake (Gate 1)
## Sidebar drawer backdrop: main content background bleeds through when scrolling nav on Android tablet

**ID:** BUG-570
**Type:** BUG (Gate 6 Owner Smoke Test — new observation)
**Date:** 2026-10-16
**Severity:** P2 — MEDIUM
**Risk:** LOW
**Sprint:** oct_cr_batch
**Area:** Other (cross-cutting — sidebar drawer, tablet only)
**Related:** BUG-568 (same drawer), BUG-555 WP-B (introduced drawer)
**Duplicate check:** DISTINCT — not previously registered
**Source:** OWNER-REPORTED (Gate 6 smoke 2026-10-16)

---

## 1. Description

**Owner report:** *"When scrolling the scroll [sidebar nav], the background of the other screen I see sometimes."*

On Android tablet with the sidebar drawer open, scrolling the nav items causes the main dashboard content to become partially visible behind/through the drawer. The backdrop (`bg-black/50 backdrop-blur-sm`, z-[90]) should fully cover the main content, but during scroll the owner occasionally sees the background.

**Possible causes:**
- A: `backdrop-blur-sm` (`backdrop-filter: blur(4px)`) creates paint layer issues on Android Chrome — during fast scroll repaints, the blur effect briefly fails, showing content behind
- B: The nav scroll triggers GPU layer promotion that makes the backdrop temporarily transparent
- C: The drawer's `overflow-y-auto` on the nav causes scroll-linked repaint that races with the backdrop render

**Backdrop code:** `Sidebar.jsx:521`
```jsx
<div data-testid="sidebar-drawer-backdrop"
     className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
     onClick={() => setDrawerOpen(false)} />
```

---

## 2. Affected Files

| File | Line | Element |
|---|---|---|
| `src/components/layout/Sidebar.jsx` | 521 | Backdrop div — `backdrop-blur-sm` possible Android repaint issue |
| `src/components/layout/Sidebar.jsx` | 634 | Nav — `overflow-y-auto` scroll container |

---

## 3. Evidence
- **Source:** OWNER-REPORTED Gate 6 smoke 2026-10-16
- **Device:** Android tablet
- **Confidence:** REPORTED (owner saw it, not yet agent-reproduced)

---

## 4. Proposed Fix Options (for Planning)
- **Option A (LOW risk):** Remove `backdrop-blur-sm`, keep `bg-black/50` — solid semi-transparent backdrop without blur avoids GPU compositing issues
- **Option B:** Add `will-change: transform` to the drawer `aside` to promote it to its own layer, preventing repaint bleed
- **Option C:** Add `isolation: isolate` to the drawer container

---

## 5. Open Decisions
**OD-570-01:** Which fix option? (a) Remove blur · (b) will-change · (c) isolation
