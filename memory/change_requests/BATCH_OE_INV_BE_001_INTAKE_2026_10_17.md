# Batch Intake — Order Entry + Inventory Backend Blocked
## BATCH-OE-INV-BE-001 — Items blocked on backend + needs more info

**Date:** 2026-10-17
**Sprint:** oct_cr_batch

---

### 1. BUG-243 — Stock Not Credited After add-purchase (P0)
**BACKEND-BLOCKED**
Purchase is recorded in `vendor-item-list` but `quantity / cal_quantity / display_qty` never update.
BUG-244 (wrong payload keys) was fixed — FE now sends correct payload to `ADD_PURCHASE` endpoint.
Backend SQL/trigger for stock credit is not executing.
**Backend brief:** filed 2026-07-22 (`BACKEND_BLOCKERS_BRIEF_2026_07_22.html`). Needs re-escalation.
**Endpoint:** `POST /api/v2/vendoremployee/inventory/add-purchase`

---

### 2. BUG-473 — Stock In / Stock Out Incorrect Behaviour (P1)
**NEEDS MORE INFO — owner to provide repro steps**
From code: three relevant flows:
- Stock-in = `PurchaseEntryPanel` → `addPurchase` (`ADD_PURCHASE` endpoint)
- Stock audit/count = `StockAuditPanel` → `addStock` (`STOCK_INVENTORY` endpoint)
- Stock-out toggle = `isOutOfStock` flag on menu items (not a transaction)
Owner has not specified which screen is broken or what the wrong behaviour is.
**Action:** Owner provides: (1) which screen, (2) exact wrong behaviour, (3) expected behaviour.
**Test account:** `owner@thegoankitchen.com`

---

### 3. BUG-463 — Backend Data Cleanup (separate from FE fix)
**BACKEND DATA TASK**
One product has `food_for = "promational"` (typo). Backend team to correct to `"Promotional"`.
FE fix (normalisation) is in FE batch. Backend fix removes the root cause.
**Action:** Backend to run: `UPDATE foods SET food_for = 'Promotional' WHERE food_for = 'promational'`

---

## Summary

| ID | Blocker | Action needed |
|---|---|---|
| BUG-243 | Backend SQL | Re-escalate backend brief |
| BUG-473 | Need repro steps | Owner to describe exact flow |
| BUG-463 BE | Backend data | One-time DB cleanup |
