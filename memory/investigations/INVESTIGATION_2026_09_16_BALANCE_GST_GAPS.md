# Investigation Report — Folio / In-House / Checkout Balance Gaps
**Date:** 2026-09-16
**Role:** INVESTIGATION
**Status:** COMPLETE — Owner decisions locked, ready for INTAKE + Planning

---

## Guest used for validation: "test gst" (r1, order #000069)

| Component | Amount | Source |
|-----------|--------|--------|
| Room Price | ₹1,000 | room_info.room_price |
| Lodging GST | ₹50 | room_info.gst_tax |
| Advance Paid | ₹100 | room_info.advance_payment |
| Amount Received | ₹0 | room_info.receive_balance |
| **Room Balance** | **₹950** | 1000 + 50 − 100 − 0 |
| Transferred F&B | ₹418 | associated_order_list (GST-inclusive) |
| Room Orders (base) | ₹228 | orderDetails unit_price × qty |
| Room Orders item GST | ₹28 | food_details.tax per item |
| **Room Orders post-GST** | **₹256** | confirmed by checkout ss3/ss4 |
| **GRAND TOTAL** | **₹1,624** | ✅ confirmed by both checkout drawers |

---

## How checkout handles mixed GST items (confirmed from CollectPaymentPanel.jsx L264-304)

Per item independently:
- `tax.percentage === 0` → skip (no contribution)
- `tax.isInclusive = true` → GST extracted: `taxAmt = price − price/(1 + rate/100)`
- `tax.isInclusive = false` → GST added: `taxAmt = price × rate/100`
- Split evenly: SGST = taxAmt/2, CGST = taxAmt/2

Two restaurant-level flags can suppress food GST entirely:
- `restaurant.tax.gstStatus = false` → skip ALL item GST
- `restaurant.settings.roomGstApplicable = false` → skip room food item GST only

---

## GAP 1 — In-House Balance (ss1)

**Problem:** Balance column = room-only (₹950). Should show final payable amount.

**Root cause:** `pmsService.js` Step 3 reads only `room_info` from SINGLE_ORDER_NEW. `associated_order_list` and `orderDetails` exist in the same response but are not summed.

**Correct formula:**
```
balance = roomBalance + sum(associated_order_list.order_amount) + sum(orderDetails item GST-inclusive totals)
        = 950 + 418 + 256 = ₹1,624
```

**Fix file:** `pmsService.js` Step 3 (same already-fetched raw response — no new API call)

**⚠ Config caveat (known limitation):**
`pmsService.js` has no access to React context. Two settings affect food item GST:
- `restaurant.tax.gstStatus` — not accessible (low risk: items typically configured with 0% if GST off)
- `restaurant.settings.roomGstApplicable` — not accessible (real edge case: pmsService may over-count food GST when this is false)
Document in code as known limitation. Owner approved proceeding.

---

## GAP 2 — Folio Total Balance Due (ss2)

**Problem:** `fnbTotal = associatedOrders only (₹418)`. Room Orders (₹228/₹256) shown in BUG-424 section but not in `fnbTotal` or Total Balance Due.

**Root cause:**
- `GuestFolioPage.jsx` L133: `fnbTotal` only sums `associatedOrders`
- `GuestFolioPage.jsx` L390: `Total Balance Due = roomBalance + fnbTotal` (roomOrders absent)
- `folioTransform.js` L122: `amount = unit_price × qty` (pre-tax only; gstAmount stored separately but not used in total)

**Fix files:**
1. `folioTransform.js` — add `totalAmount = amt + gstAmt` per roomOrder item
2. `GuestFolioPage.jsx` — Room Orders section total uses `totalAmount`; Total Balance Due adds roomOrdersTotal

---

## GAP 3 — Checkout ROOM Breakdown Missing Lodging GST Line (ss3 + ss4)

**Problem:** ROOM section breakdown in CollectPaymentPanel shows:
- Room Charge ₹1,000
- Advance Paid −₹100
- Balance ₹950
→ ₹1,000 − ₹100 = ₹900 ≠ ₹950. Lodging GST ₹50 is invisible. Math is opaque.

**Root cause:** `CollectPaymentPanel.jsx` L1831–1845 — no JSX line for `roomInfo.gstTax`.
`roomInfo.gstTax` is already present and mapped. Zero data change needed.

**Fix file:** `CollectPaymentPanel.jsx` (R5 hotspot — one JSX line addition between Room Charge and Advance Paid)

---

## Sub-gap — Room Orders Section Total Pre-tax vs Post-tax

Folio shows ₹228 (pre-tax); checkout shows ₹256 (post-tax) for same items. ₹28 difference = food item GST.

**Fix:** Resolved by GAP 2 fix — once `totalAmount = amt + gstAmt` is used, Room Orders section total shows ₹256. Row-level display stays pre-tax with GST visible on expand (current BUG-424 behaviour preserved).

---

## Owner Decisions Locked

| ID | Decision |
|----|----------|
| OD-G1-01 | In-House balance should include room balance + transferred F&B + room orders with item GST ✅ |
| OD-G1-02 | Config caveat (roomGstApplicable not accessible in service) accepted — document as known limitation ✅ |
| OD-G2-01 | Folio Total Balance Due = room + transferred F&B + room orders (post-GST) ✅ |
| OD-G2-02 | Room Orders section total to use post-GST totalAmount; row display stays pre-tax with expand ✅ |
| OD-G3-01 | Add Lodging GST line to checkout ROOM breakdown ✅ |
| OD-G3-02 | Show Lodging GST line only when `roomInfo.gstTax > 0` (hide for 0% GST rooms) ✅ — confirmed 2026-09-16 |
| OD-Sub-01 | Sub-gap resolved by GAP 2 fix (totalAmount) — no separate fix needed ✅ |

---

## All Fixes Summary

| Gap | Fix file(s) | Risk | New API call? |
|-----|------------|------|--------------|
| G1 | `pmsService.js` Step 3 | HIGH (financial display) | ❌ None |
| G2 | `folioTransform.js` + `GuestFolioPage.jsx` | CRITICAL (Total Balance Due) | ❌ None |
| G3 | `CollectPaymentPanel.jsx` (R5 hotspot) | MEDIUM (display only, no formula change) | ❌ None |
| Sub | Resolved by G2 | — | — |

---

## Pending: Intake Registration

These gaps need BUG IDs before planning can begin:
- G1 → new BUG (In-House balance missing F&B)
- G2 → update/extend BUG-423 scope OR new BUG (folio Total Balance Due missing room orders)
- G3 → new BUG (checkout ROOM breakdown missing GST line)
