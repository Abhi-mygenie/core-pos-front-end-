# BUG-651 — CR-482 P10: Cart-Row Orange Highlight Partly Hidden (Sides Clipped)

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P3 — LOW  
**Risk:** LOW (cosmetic, no data/money impact)  
**Process required:** Standard gate flow. FAST LANE eligible? **YES** (1-2 files, ≤10 lines, CSS only, no financial logic)  
**Sprint:** TBD  
**Source:** QA-FOUND (CR-482 QA Report P6–P10, test F3)

---

## Description

When navigating cart rows with ↑/↓ (P10), the orange focus ring (`kbd-focus` class) is clipped on left and right sides — only top and bottom border lines are visible. On the first row, only the bottom line shows, making it ambiguous whether row 1 or row 2 is selected.

**Root cause:** `outline` with `outline-offset: 2px` on an element inside a scroll container with `overflow: hidden` clips the outline sides.

---

## Code Reality Check

**FULL** — 
- `index.css:2`: `.kbd-focus:focus-visible, .kbd-highlight { outline: 3px solid #F97316; outline-offset: 2px; }`
- `CartPanel.jsx:231`: `className: 'kbd-focus'` on cart rows
- Cart container has `overflow-y: auto` which clips horizontal outline

---

## Duplicate Check

**DISTINCT.** No existing bug about cart row highlight clipping.

---

## Evidence

- **Screenshots:** QA report p10_1, p10_2, pl_a
- **Steps:** Add items → Ctrl+↓ → ↑/↓ between rows → observe clipped orange ring
- **Source:** QA-FOUND
- **Confidence:** CONFIRMED

---

## Blast Radius

- `index.css` (1 line: outline → inset box-shadow or ring utility) + possibly `CartPanel.jsx` (className tweak)
- Estimated scope: **SMALL (1-2 files, ≤5 lines, CSS only)**

---

## Next: PLANNING (Fast Lane candidate — owner approval needed)
