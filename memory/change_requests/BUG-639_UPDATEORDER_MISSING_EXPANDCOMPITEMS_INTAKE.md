# BUG-639 — updateOrder Missing expandCompItems — Complimentary Passes "No" in Printer Payload

**ID:** BUG-639  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (live observation — dish marked comp sends is_complementary: "No", 2026-11-02)
**Related:** BUG-298, BUG-299 (parent — qty-aware comp implementation)

## Description
When a cashier marks a dish as complimentary (partial or full) and then triggers an update-order (e.g., adding more items to an active table), the printer payload carries `is_complementary: "No"` instead of `"Yes"`.

**Root cause:** `orderTransform.js` `updateOrder()` at L1184 and L1191 calls `newItems.map(buildCartItem)` and `allActiveItems.map(buildCartItem)` directly — without calling `expandCompItems()` first. This function was correctly added to:
- `placeOrder` (L1054, L1062) ✅
- `placeOrderWithPayment` (L1293) ✅
- `collectBillExisting` (L1547) ✅

But was **missed** in `updateOrder` (L1184, L1191) ❌

Without `expandCompItems`, partial-comp items (compQty > 0 but < qty) are NOT split into two lines. `buildCartItem` sees `isComplementaryRuntime: false` (set by `handleMarkComp` when `compQty < qty`) and outputs `is_complementary: "No"`.

For full comp (compQty === qty), `isComplementaryRuntime` is `true` so the flag is correct — but the totals at L1191 also miss the split, causing incorrect financial aggregation.

## Evidence
- Owner-reported: dish marked comp shows `is_complementary: "No"` in printer payload
- Code trace: `orderTransform.js` L1184 — `newItems.map(buildCartItem)` without `expandCompItems`
- Code trace: `orderTransform.js` L1191 — `allActiveItems.map(buildCartItem)` without `expandCompItems`
- All 3 other transform paths use `expandCompItems` — this is the only one missing it
- Investigation report: `investigations/INVESTIGATION_COMP_NO_PRINTER_PAYLOAD_2026_11_02.md`
- Confidence: CONFIRMED (code traced, pattern mismatch proven)

## Duplicate Check
**DISTINCT.** BUG-298/BUG-299 implemented `expandCompItems` but missed the `updateOrder` path. No existing bug covers this gap.

## Code Reality
**NONE** — `expandCompItems` is not called in `updateOrder`.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `orderTransform.js` | L1184 | `newItems.map(buildCartItem)` — missing `expandCompItems` wrapper |
| 2 | `orderTransform.js` | L1191 | `allActiveItems.map(buildCartItem)` — missing `expandCompItems` wrapper |

## Blast Radius
**SMALL** — 1 file (`orderTransform.js` R5), 2 lines changed. Exact same pattern as the other 3 paths.

## Fix Scope
```
L1184: expandCompItems(newItems).map(buildCartItem)
L1191: expandCompItems(allActiveItems).map(buildCartItem)
```

## Risk Classification
- **Risk:** MEDIUM (orderTransform.js is R5, touches financial totals calculation)
- **Fast Lane eligible:** NO (R5 file, financial aggregation path)
- **Planning skip eligible:** YES per investigation (≤10 lines, 1 file, follows existing pattern exactly)

## Open Decisions
- **OD-639-01:** Direct bug fix (skip planning, follows exact existing pattern in 3 other paths) or full gate flow?
  - **Recommended:** Direct bug fix — the fix is identical to the pattern at L1054, L1293, L1547.
