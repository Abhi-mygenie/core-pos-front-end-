# BUG-240 — Smart Purchase: On-Hand Shows Small Unit (gm) Instead of Display Unit (kg)

**Registered:** 2026-07-24
**Source:** INVESTIGATION (INVESTIGATION_SMART_PURCHASE_STOCK_DISCREPANCY_2026_07_24.md — Bug 2)
**Classification:** BUG
**Priority:** P1
**Risk:** LOW
**Duplicate Check:** DISTINCT
**Owner Decision:** Q1 APPROVED — convert to display units in SP UI

---

## Summary
Smart Purchase shows on-hand as `4604 gm` (calQuantity in small unit) while Current Stock shows `4.60 kg` (displayQty). Same stock, different field/unit. Confusing for users comparing the two screens.

## Root Cause
`purchasePlanner.js:127` uses `onHand = Number(item.calQuantity)` + `unit = item.smallUnit`, while `CurrentStockPanel.jsx:322` uses `item.displayQty || item.quantity` + `item.displayUnit || item.unit`.

## Fix (owner-approved)
Add `display_on_hand` + `display_unit` fields in planner output. AutoShoppingList renders display values. Math stays in small units internally.

## Scope
- **1-2 files, ~5 lines:** `purchasePlanner.js` (add display fields), `AutoShoppingList.jsx` (render display values)
- **Risk:** LOW — UI-only, math unchanged
