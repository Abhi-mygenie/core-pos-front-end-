# BUG-561 — Ready / Serve Button Overflows OrderCard (Clipped by overflow-hidden)

**ID:** BUG-561
**Date:** 2026-10-15
**Type:** BUG
**Severity:** P1 — HIGH
**Risk:** MEDIUM
**Sprint:** oct_cr_batch
**Source:** OWNER-REPORTED — smoke test 2026-10-15
**Duplicate check:** DISTINCT from BUG-537 (BUG-537 fixed the grid layout; button padding inside cards untouched)
**Related:** BUG-537 (TABLE_CARD_WIDTH domain), BUG-555 (WP-B sidebar context — same sprint)
**Code Reality:** NONE (no fix present — `px-6` action buttons unchanged)
**Fast Lane eligible:** YES — 1 file, ≤10 lines, not R5 hotspot, not financial

---

## Description

On the Dashboard "By Status" / Channel view, each OrderCard has a footer action row:
`[Print KOT button] [flex-1 spacer] [Ready / Serve / Dispatch / Assign Rider / Reassign button]`

The action buttons all use `px-6` (24px padding each side), requiring a minimum of ~91px.
The print button requires `min-w-[44px]` = 44px.
The total minimum = 44 + 12 (gap-3) + 91 = **147px**.

The card inner width = `TABLE_CARD_WIDTH (160px) − px-3×2 (24px) = **136px**`.

**Overflow = 147 − 136 = 11px.** The card root has `overflow-hidden` (L454) → the right edge of the action button is **clipped by 11px** — button text and right border are cut off.

At tablet minmax (cards ~140px, e.g. viewport ≈ 800px CSS):
Inner width = 116px. Overflow = 147 − 116 = **31px** — button severely clipped.

**Affected buttons (all use `px-6 font-bold`):**
- `ready-btn-{id}` (L1135) — fOS=1
- `serve-btn-{id}` (L1200) — fOS=2 non-delivery
- `assign-rider-btn` (L1152) — fOS=2 delivery, no rider
- `dispatch-btn` (L1162) — fOS=2 delivery, no assign
- `waiting-rider-btn` / `reassign-rider-btn` (L1177, L1187) — fOS=2 rider variants
- `agg-ready-btn` (L1101) — aggregator fOS=1
- `agg-dispatch-label` (L1112) — aggregator fOS=2

---

## Evidence

- **Screenshot:** Owner smoke test 2026-10-15 (Dashboard "Preparing" column, 5-card row)
- **Investigation:** `memory/investigations/BUG-555 Smoke Issue investigation 2026-10-15` (width budget math)
- **Confidence:** CONFIRMED — measured in code (TABLE_CARD_WIDTH=160, px-6=48, print=44)
- **Steps to reproduce:**
  1. Open dashboard on a device/viewport ~800-1250px CSS
  2. Navigate to any status column (Preparing / Ready)
  3. Observe the footer action row — Ready / Serve button right edge is clipped

---

## Root Cause

`OrderCard.jsx:1044` — button row `<div className="flex items-center w-full">`:
- No `flex-wrap`
- The `<div className="flex-1"/>` spacer (L1093-L1094) absorbs 0px at minimum
- Action buttons have `px-6` (48px padding) — rigid, non-shrinkable
- `overflow-hidden` on card root (L454) clips the overflow silently

Fix: Replace `<div className="flex-1"/>` spacer + `px-6` on action buttons with `flex-1` on the action button itself. Button absorbs remaining space, always fits.

---

## Blast Radius

- **Files:** 1 (`src/components/cards/OrderCard.jsx`)
- **Lines:** ~8 (remove spacer div L1093-L1094, change `px-6` → `flex-1 min-w-0 px-2` on 7 action buttons at L1101,1112,1135,1152,1162,1177,1187,1200)
- **Hotspots:** NO (OrderCard.jsx not in R5 list)
- **Financial:** NO
- **Scope:** SMALL (1 file, no API, no state, layout only)

---

## Owner Decisions Required

None — fix path is clear (Fast Lane eligible, owner GO required).

---

## Fast Lane Summary (pending owner GO)
```
FAST LANE SUMMARY
ID: BUG-561
Risk: MEDIUM
Owner approval: PENDING
File: src/components/cards/OrderCard.jsx
Lines: ~8
Self-test: pending
Registry/file ownership/code marker: to be synced on fix
Next: Gate 4 GO → Bug Fix → QA
```
