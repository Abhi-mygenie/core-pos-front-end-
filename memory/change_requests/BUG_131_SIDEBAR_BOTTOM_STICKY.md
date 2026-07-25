# BUG-131 — Sidebar Bottom Section (Ringer/Refresh/User/Logout) Scrolls Up — Should Be Sticky

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** Bug
**Area:** Sidebar Navigation
**Priority:** P2 (UX — bottom actions disappear when sidebar content is long)
**Sprint:** POS 4.0

---

## 1. Symptom

The bottom section of the left-hand sidebar — containing **Ringer On**, **Refresh**, **Owner (Owner) #644**, and **Logout** — scrolls up with the rest of the sidebar content when the nav list is long. These items should be **sticky/pinned to the bottom** of the sidebar so they're always accessible regardless of scroll position.

---

## 2. Screenshot Evidence

Owner-provided screenshot shows the sidebar scrolled to bottom of nav items (Visibility Settings expanded). The Ringer On / Refresh / Owner / Logout block is visible at the very bottom but only because the user scrolled all the way down. On shorter viewports or with more nav items expanded, these controls would be off-screen.

---

## 3. Expected Behaviour

- Sidebar nav items: scrollable within the available space
- Bottom block (Ringer / Refresh / User / Logout): **fixed/sticky at the bottom** of the sidebar, always visible regardless of nav scroll position

---

## 4. Scope (preliminary)

- **Sidebar.jsx** — CSS/layout change: split into scrollable nav area + sticky bottom section
- Likely a `flex-col` with `overflow-y-auto` on the nav portion and `mt-auto` / `sticky bottom-0` on the footer block

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*BUG-131 Intake — 2026-06-12*
