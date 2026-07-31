# Bug Fix Report — BUG-163 + BUG-VQTY + BUG-ROOM-PAIDROOM
**Date:** 2026-07-11
**Agent:** BUG FIX (IMPLEMENTATION role)
**Testing:** Code inspection PASS (6/6). UI smoke skipped — preprod unreachable from preview env.
**EXIT GATE:** 5/5 PASS

---

## Summary

| Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|--------|----------|--------------------|------------|-----|---------------|----------|
| T1-T3 (BUG-163) | MAJOR | PLAN_GAP | `exportStockMaster()` in `expenseService.js` sent no POST body; backend requires `{ type: 'all' }`. Discovered during CR-059 but not carried through to service function. | Added `{ type: 'all' }` as POST body (1 line) | `expenseService.js` L65 | Code ✅ (UI smoke manual) |
| T4-T8 (BUG-VQTY) | MAJOR | CODE_ERROR | `buildCartItem` L703 and `collectBillExisting` L1492 computed `variation_amount` as raw unit-level `variationAmount` without multiplying by quantity. `food_amount` on the same lines already multiplied correctly. | L703: `* (item.qty \|\| 1)`. L1492: `* qty` (consistent with existing `food_amount: unitPrice * qty` on same line) | `orderTransform.js` L703 + L1492 | Code ✅ |
| T9-T10 (BUG-ROOM-PAIDROOM) | MAJOR | CODE_ERROR | `collectBillExisting` L1632 hardcoded `paid_room: ''`. Boolean `table.isRoom` was set correctly by `fromAPI.order()` L210 but never used in the billing payload builder. | L1632: `paid_room: table?.isRoom ? 'yes' : ''` | `orderTransform.js` L1632 | Code ✅ |

**3/3 fixed. Root cause pattern: 2 CODE_ERROR, 1 PLAN_GAP.**

---

## Scope Expansion
NONE — all fixes within the originally planned files.

## Escalated Items
NONE

## Registry Sync
All 3 items added to registry.json → IMPLEMENTED, sprint: pos_5_0
BUG_TRACKER.md rows updated.
FILE_OWNERSHIP.md updated.

## Recommended Next Step
Owner manual smoke on preprod for BUG-163 Export button on /expense-setup.
Then → QA Gate 6 Owner Smoke for all 3 bugs.
