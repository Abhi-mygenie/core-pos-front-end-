# Session Handover — 2026-11-17 Investigation Session #2

**Date:** 2026-11-17
**Role:** INVESTIGATION AGENT
**Items Investigated:** 2

---

## Session Summary

| # | Item | Root Cause | Confidence | Classification |
|---|------|-----------|------------|----------------|
| 1 | Discount not on Dashboard/OrderEntry | `order_amount` is pre-discount; discount is checkout-time config in `order_discount_json`, not an amount mutation | HIGH | FE_ARCHITECTURE_GAP |
| 2 | No edit for add-ons/variations after placing | `PlacedItemRow` has no customize capability — only NewItemRow does | HIGH | FE_FEATURE_GAP |

---

## Item 1: Discount Display Gap

**Problem:** 50% discount applied in CollectPaymentPanel (correctly saved via `order-discount-manage` API), but Dashboard shows ₹116.24 and Order Entry shows "Collect Bill ₹116.24" — both show pre-discount total.

**Root Cause:** `order_amount` in backend running orders response is NEVER reduced by the discount. Discount is stored as config (`order_discount_json`). Dashboard reads `order.amount` directly, OrderEntry uses `orderFinancials.amount` — both are pre-discount.

**Key Files:**
- `OrderCard.jsx:524` — `₹{order.amount}` (dashboard)
- `OrderEntry.jsx:1223-1227` — `total = orderFinancials.amount` (placed orders)
- `CartPanel.jsx:512` — `authoritativeTotal = total` (placed orders)
- `CollectPaymentPanel.jsx:420-450` — `applyOrderDiscount()` (saves config, not amount)

**Fix Options:** FE-side deduction from `orderDiscountJson` OR backend `order_amount` mutation.

---

## Item 2: Variation/Add-on Edit After Placing

**Problem:** Order #002397 ("Your Wok") has complex variations. No edit button for placed items.

**Root Cause:** Architecture — `PlacedItemRow` has: Cancel, Transfer, Qty Edit. `NewItemRow` has: Customize, Delete, Note, Qty Edit. The "Customize" button and `ItemCustomizationModal` are ONLY wired for pre-placed items.

**Key Files:**
- `CartPanel.jsx:65-227` (PlacedItemRow — no customize)
- `CartPanel.jsx:262-310` (NewItemRow — has customize at line 294)
- `CartPanel.jsx:1308-1360` (render decision: placed → PlacedItemRow, else → NewItemRow)

**Current Workaround:** Cancel item + re-add with new customizations.

---

## Test Credentials Used

| Account | Purpose |
|---------|---------|
| owner@mantri.com / Qplazm@10 | Discount investigation (T2, Order #001447) |
| owner@woko.com / Qplazm@10 | Variations edit investigation (Order #002397) |

---

## Artifacts Created

| Artifact | Path |
|----------|------|
| Investigation: Discount | `memory/investigations/INV-BUG-DISCOUNT_DASHBOARD_NOT_REFLECTING_2026_11_17.md` |
| Investigation: Variations Edit | `memory/investigations/INV-CR-EDIT-VARIATIONS_AFTER_PLACE_2026_11_17.md` |
| Session Handover | `memory/handover/SESSION_HANDOVER_2026_11_17_INVESTIGATION_2.md` |
