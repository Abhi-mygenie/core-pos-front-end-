# BUG-563 — Category Panel Names Truncated with No Touch-Accessible Alternative

**ID:** BUG-563
**Date:** 2026-10-15
**Type:** BUG (UX gap created by BUG-555 WP-A)
**Severity:** P2 — MEDIUM
**Risk:** LOW
**Sprint:** oct_cr_batch
**Source:** OWNER-REPORTED — smoke test 2026-10-15 (Screenshot 3)
**Duplicate check:** DISTINCT (BUG-158/159 are expense category form bugs — unrelated)
**Related:** BUG-555 WP-A (A8 narrowed panel from 176px → 128px; A9 added `title` attr as mitigation — insufficient for touch)
**Code Reality:** PARTIAL — `title` attr (A9) exists but works only on desktop hover. Truncation via `<span className="truncate">` (L69) unchanged.
**Fast Lane eligible:** TBD — depends on chosen fix path (OD-563-01)

---

## Description

BUG-555 WP-A edit A8 narrowed the category panel from `w-44` (176px) to `w-32` (128px) at viewport <1280px to free space for the 3-panel layout. Edit A9 added `title={`${category.name} (${category.count})`}` to each category button as a mitigation — this renders a browser tooltip on **hover**.

**The gap:** On touch devices (phones, tablets — the primary BUG-555 target devices), there is NO hover interaction. Browser `title` tooltips do NOT appear on touch/tap. Category names like "Indo-Fusion Menu", "subject one (test)" are permanently truncated to "Indo-Fusion..." and "subject one (...)" with no way to see the full name.

**UX impact:**
- Users cannot identify which category to tap when names are similar and truncated
- At 128px panel with 12px padding each side = 104px for text. At 14px font, ~8 characters fit before truncation
- "Menu Management" → "Menu Mana..." | "Break..." | "Indo-Fusio..." — meaningless truncation

**Screenshot 3 shows:** "Indo-Fusion ..." and "subject one (..." both truncated on a touch device.

---

## Evidence

- **Screenshot:** Owner smoke test 2026-10-15 (Screenshot 3 — category panel in Order Entry)
- **Code:** `CategoryPanel.jsx:32` — `w-32 xl:w-44` (A8), `CategoryPanel.jsx:62` — `title={...}` (A9)
- **Code:** `CategoryPanel.jsx:69` — `<span className="truncate">` — truncation active
- **Confidence:** CONFIRMED — touch devices confirmed no title tooltip behavior
- **Steps to reproduce:**
  1. Open Order Entry on a phone/tablet (any viewport <1280px)
  2. Observe category panel — names are truncated at ~8 chars with no way to read full name

---

## Root Cause

`CategoryPanel.jsx:62` — `title` attr works only on desktop hover (browser native behavior). No touch equivalent. A9 was approved as the mitigation in BUG-555 planning but covers desktop users only.

**Fix options:**
- **(a) Increase panel width:** `w-32` → `w-36` (144px) at tablet. Wider panel = less truncation. Simple 1-line change. But still truncates very long names.
- **(b) Tooltip on long-press (custom):** Add `onTouchStart` + timer + floating label for touch devices. ~15-20 lines. More robust.
- **(c) Full name on active category in sub-header:** When a category is selected, show its full name in a sticky strip above the items grid. 1 file, ~5 lines. Best UX.
- **(d) `w-auto` with `max-w-[160px]`:** Let the category panel size to content up to a max width on tablet. Complex — may affect 3-panel layout budget.

---

## Blast Radius

- **Files:** 1 (`src/components/order-entry/CategoryPanel.jsx`) for options (a)/(b)/(c)
- **Lines:** 1 line for (a); ~5-20 lines for (b)/(c)
- **Hotspots:** NO (CategoryPanel not in R5 list)
- **Financial:** NO
- **Scope:** SMALL

---

## Owner Decisions Required

**OD-563-01:** Fix approach — which option?
- **(a)** Increase to w-36 (144px) — minimal change, still may truncate
- **(b)** Custom long-press tooltip — most robust for touch, more lines
- **(c)** Show full name in active-category sub-header — best UX, easy to implement
- **(d)** Wider auto panel — risky for 3-panel budget

Agent recommendation: **(c)** — best UX for touch, ~5 lines, non-breaking.

Fast Lane eligible once OD-563-01 is locked.
