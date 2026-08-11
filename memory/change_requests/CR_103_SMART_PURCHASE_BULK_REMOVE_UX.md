# CR-103 — Smart Purchase: Bulk Remove UX (Select All + Prominent Cross Button)

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED (screenshot)
**Classification:** CR
**Priority:** P1
**Risk:** MEDIUM
**Duplicate Check:** RELATED to CR-078 (Smart Purchase), CR-081 (Polish). DISTINCT — those cover the core workflow + design alignment; CR-103 addresses specific UX blockers for bulk item management.

---

## Summary

On the Smart Purchase screen (`/inventory-smart-purchase`), when the auto shopping list suggests 50 items, the user cannot efficiently trim the list. Three issues compound into a **workflow blocker:**

### Sub-A: Cannot proceed without filling ALL rows
- `validate()` in `SmartPurchasePanel.jsx:118-131` requires `rate > 0` for **every** row
- If user only wants to buy 5 of 50 suggested items, they must fill rate for all 50 OR remove 45 items one-by-one
- **Impact:** Blocks "Review & Submit" button even though user has filled the items they care about

### Sub-B: Cross (×) button too subtle
- `AutoShoppingList.jsx:143-146`: `<X className="w-4 h-4" />` with `className="text-slate-400"`
- 16px icon in light gray on white background — barely visible
- With 50 rows to manage, users miss it entirely
- **Impact:** Users can't discover the remove-item mechanism

### Sub-C: No Select All / Bulk Remove
- No checkbox column exists in the shopping list table
- No "Select All" / "Deselect All" header action
- User must click × one-by-one for each unwanted item (45 clicks to trim 50→5)
- **Impact:** Unacceptable UX for large suggestion lists

---

## Evidence

- **Screenshot:** User-provided (Smart Purchase page with 50 suggested items)
- **Code:** `SmartPurchasePanel.jsx:118-131` (validate), `AutoShoppingList.jsx:143-146` (× button)
- **Source:** OWNER-REPORTED, Confidence: CONFIRMED

## Code Reality

- Sub-A: validate logic EXISTS — by-design but UX-hostile for large lists
- Sub-B: × button EXISTS — functionality works, visibility is the issue
- Sub-C: NONE — no checkbox/selection mechanism in codebase

## Blast Radius

- **2 files:** `AutoShoppingList.jsx` (× styling + checkbox column + select all), `SmartPurchasePanel.jsx` (bulk remove handler, possibly validate tweak)
- **~30-50 lines** estimated
- **Hotspot:** NO
- **Scope:** MEDIUM

## Fast Lane

NOT ELIGIBLE:
- ❌ Touches 2 files (condition #2)
- ❌ >10 lines (condition #3)
- ❌ State management change — selection state (condition #4)

## Open Questions

None — owner intent is clear from the screenshot + description.
