# BUG-248 — Bulk Editor: 9 Columns Missing from Dirty Detection (Save Never Triggers)

**ID:** BUG-248
**Type:** BUG
**Created:** 2026-07-25
**Severity:** P1 (user edits silently lost — no save button appears)
**Risk:** LOW
**Module:** Menu Management — Bulk Editor (`BulkEditor.jsx`)
**Duplicate Check:** DISTINCT. No prior bug on isDirty coverage.
**Code Reality:** Bug confirmed at `BulkEditor.jsx:258-290` — `isDirty()` checks object has 29 entries but 9 columns are missing.
**Source:** OWNER-REPORTED (session 2026-07-25, screenshot: Packaged Item toggled to "Yes" but "No Changes" shown)
**Confidence:** CONFIRMED (code trace: `packedFood` and 8 other keys absent from `checks` object)

---

## Description

In Menu Management Bulk Editor, toggling certain columns (Packaged Item, Inventory, Out of Stock, Hidden from POS, Tax Calc, Sold By Unit, Avail. Start/End, Portion Size) does NOT trigger the "Save X Changes" button. The edits appear in the UI but `isDirty()` returns `false` for these fields — so the save button stays as "No Changes" and edits are silently lost.

### Evidence

Screenshot: "Allfredo Pasta" → Packaged Item toggled to "Yes" → toolbar shows "No Changes".

### Root Cause

`BulkEditor.jsx:258-290` — the `isDirty` function's `checks` object maps field keys to comparison functions. **9 column keys have no entry:**

| # | Column Key | Label | In `checks`? | In `toAPI`? |
|---|-----------|-------|:---:|:---:|
| 1 | `packedFood` | Packaged Item | ❌ MISSING | ✅ L161 |
| 2 | `isInventory` | Inventory | ❌ MISSING | Needs verify |
| 3 | `stockOut` | Out of Stock | ❌ MISSING | Needs verify |
| 4 | `isDisabled` | Hidden from POS | ❌ MISSING | Needs verify |
| 5 | `taxCalc` | Tax Calc | ❌ MISSING | Needs verify |
| 6 | `itemUnit` | Sold By (Unit) | ❌ MISSING | Needs verify |
| 7 | `availableTimeStart` | Avail. Start | ❌ MISSING | Needs verify |
| 8 | `availableTimeEnd` | Avail. End | ❌ MISSING | Needs verify |
| 9 | `portionSize` | Portion Size | ❌ MISSING | Needs verify |

---

## Blast Radius

- 1 file: `BulkEditor.jsx` (~9 lines added to `checks` object)
- Scope: SMALL
- Hotspot: NO (not R5)
- Financial: NO

---

## Next

Planning Gate 2 → Gate 3 → Implementation
