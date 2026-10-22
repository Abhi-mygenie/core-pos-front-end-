# Batch Intake — Order Entry + Inventory FE Fixes
## BATCH-OE-INV-FE-001 — Items fixable now (FE only)

**Date:** 2026-10-17
**Sprint:** oct_cr_batch
**Stage:** GATE_1_INTAKE_COMPLETE — ready for Planning Gate 2

---

### 1. BUG-333 Part A — Add Button Defaults to Walk-In
**P1 / LOW / Fast Lane eligible**
`DashboardPage.jsx:1514` `handleAddOrder` hardcodes `setOrderEntryType("walkIn")`.
Fix: open an order-type picker (Dine-In / Walk-In / Takeaway / Delivery) when `+Add` is clicked, or default to Dine-In.
**File:** `DashboardPage.jsx` R5 hotspot. ~10 lines.

---

### 2. CR-434 — Delivery + Takeaway Quick-Launch Tiles
**P1 / MEDIUM / New Feature**
No persistent tile exists to start a new Delivery or Takeaway order. Customers want one-click access like table/room cards.
Fix: add Delivery and Takeaway quick-launch cards or split Add button on the dashboard.
**File:** `DashboardPage.jsx` R5. Medium scope. Gate 2 needed.

---

### 3. BUG-463 — Promotional Menu Shows Duplicate Pill (Typo Normalisation)
**P2 / LOW / Fast Lane eligible**
`availableMenuTypes` in `MenuContext.jsx` exposes backend typo `"promational"` as a separate pill from `"Promotional"`.
Fix: deduplicate by case-insensitive comparison in the memo. 1 line.
**File:** `MenuContext.jsx`. Non-hotspot.
**Backend action (separate):** data cleanup of product `food_for` field.

---

### 4. BUG-480 — Cancel After Serve Gate Broken
**P1 / MEDIUM**
`allowPostServeCancel2` (maps `api.allow_cancel_post_server`) is mapped but **never used** in the cancel gate in `OrderEntry.jsx:352`. Only `allowPostServeCancel` (maps the typo field `cancle_post_serve`) is checked.
Fix: add `|| cancellation?.allowPostServeCancel2` fallback in the gate so both API fields are honoured.
**Files:** `OrderEntry.jsx` (R5) + `profileTransform.js`. ~2 lines.
**Test:** `owner@thegoankitchen.com`

---

## Execution Order
```
BUG-463 (Fast Lane, 1 line) → first
BUG-480 (2 lines, R5) → fast follow
BUG-333 Part A (Add button, R5, ~10 lines) → with BUG-480 session
CR-434 (Delivery/Takeaway tiles, R5, Gate 2 needed) → after above
```
