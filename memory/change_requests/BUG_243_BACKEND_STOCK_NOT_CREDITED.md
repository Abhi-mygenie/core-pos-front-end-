# BUG-243 — Backend: Stock Not Credited After add-purchase (BACKEND-BLOCKED)

**Registered:** 2026-07-24
**Source:** INVESTIGATION (INVESTIGATION_SMART_PURCHASE_STOCK_DISCREPANCY_2026_07_24.md — Bug 1+4)
**Classification:** BUG — BACKEND
**Priority:** P0 — CRITICAL
**Risk:** CRITICAL
**Duplicate Check:** DISTINCT
**Owner Decision:** Q2 — backend brief filed at BACKEND_BLOCKERS_BRIEF_2026_07_22.html

---

## Summary
`POST /add-purchase` records the purchase in vendor-item-list but does NOT update stock quantities (`quantity`, `cal_quantity`, `display_qty`) on the ingredient record. Smart Purchase and Current Stock show stale on-hand after every purchase.

## Evidence
- Account: owner@cafe103.com
- Ingredient: Tandoori Chicken Indian (ID: 16948)
- Purchase: 332 pieces @ ₹40 = ₹13,280 — recorded as vendor-item-list ID=13857 ✅
- Stock after purchase: quantity=0.000, cal_quantity=0.00, display_qty=0.00 ❌

## Status
**BACKEND-BLOCKED.** Backend brief filed at `BACKEND_BLOCKERS_BRIEF_2026_07_22.html`. No FE workaround possible — FE re-fetches correctly, backend returns stale data.

## FE Impact
- Smart Purchase: item reappears after every purchase (on_hand stays 0)
- Current Stock: shows "Out of Stock" after purchase
- Inventory accuracy: all stock levels unreliable
