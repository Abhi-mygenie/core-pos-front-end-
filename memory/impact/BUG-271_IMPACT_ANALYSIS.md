# BUG-271 Impact Analysis — Gate 2

**ID:** BUG-271  
**Title:** GST/VAT Wrong on Print from Dashboard/Order Page  
**Type:** BUG  
**Risk:** CRITICAL (financial field: gst_tax / vat_tax sent to printer/backend)  
**Sprint:** pos_5_0  
**Date:** 2026-07-30  
**Planning agent:** PLANNING role  
**Precondition:** Investigation complete at `/app/memory/BUG-271_INVESTIGATION_REPORT.md`

---

## Code Reality: PARTIAL

BUG-271 was partially implemented on 2026-07-29. The proportional split was replaced with per-item accumulation (lines 1879-1893 of `orderTransform.js`). However, the implementation is **broken**: the new code reads `item.gst_tax_amount` which the backend returns as `null` for all order items. The Collect Bill path in the same function has a `food_details.tax` fallback that correctly handles this case; that fallback was not carried to the manual print path.

**Evidence (real API response):** `/app/memory/evidence/BUG-271/api_evidence.json`
```json
{ "gst_tax_amount": null, "vat_tax_amount": null, "tax_amount": null, "food_details_tax": 4 }
```

---

## Conflict Pre-Check

Files that will change: `orderTransform.js` only.

Open items also touching `orderTransform.js`:
| Item | Status | Affected Lines | Conflict? |
|------|--------|----------------|-----------|
| BUG-138 | QA PASS / Smoke | ~L304 (discount payload) | **NO** — different area |
| BUG-144 | QA PASS / Smoke | L197, L2038 (daily_token) | **NO** — different area |
| CR-058 | INTAKE | CollectPaymentPanel + orderTransform | **NO** — different feature |
| CR-098 | QA PASS / Smoke | L118 (item_code) | **NO** — different area |
| BUG-270 | IMPLEMENTED | L1132-1133 (cust_mobile/id) | **NO** — different area |
| CR-116 | IMPLEMENTED | L2067-2068 (custGST) | **NO** — different area |

**CONCLUSION: No conflicts. Change is parallel-safe at L1882-1893.**

---

## Data Flow Trace

```
User taps "Print Bill"
  ↓
[A] From dashboard (TableCard / OrderCard / RePrintButton)  ← BROKEN PATH
    handlePrintBill() → calls printOrder(orderId, 'bill', null, order, scPct,
                         { serviceChargeTaxPct, deliveryChargeGstPct })
                         ← NO orderItemTotal in overrides
                         
[B] From Collect Bill panel (CollectPaymentPanel.handlePrintBill)  ← WORKING PATH
    → calls onPrintBill({ ..., orderItemTotal: totalLineItems, gstTax, vatTax, ... })
    ← HAS orderItemTotal in overrides

Both reach: orderTransform.buildBillPrintPayload(order, scPct, overrides)

  hasFinancialOverrides = (overrides.orderItemTotal !== undefined)
  
  [A] hasFinancialOverrides = FALSE  →  MANUAL PRINT PATH  (lines 1872-1893)
  [B] hasFinancialOverrides = TRUE   →  COLLECT BILL PATH  (lines 1807-1869) ← correct

MANUAL PRINT PATH (current, broken):
  forEach item → taxAmt = parseFloat(item.gst_tax_amount || 0)
  Backend returns gst_tax_amount: null → taxAmt = 0
  Result: gst_tax = 0, vat_tax = 0  ✗

COLLECT BILL PATH (correct, has fallback):
  forEach item → taxAmt = parseFloat(item.gst_tax_amount || 0)  [also 0]
  → if (!taxAmt && item.food_details):
       taxPct = food_details.tax  [e.g., 4]
       taxAmt = lineTotal * taxPct / 100  [e.g., 8.76 for ₹219 item]
  Result: gst_tax / vat_tax correctly computed  ✓
```

---

## Affected Components

### Directly changed (1 file)

| File | Affected Lines | Scope |
|------|---------------|-------|
| `src/api/transforms/orderTransform.js` | 1882-1893 | Replace 12 lines with ~21 lines |

### Callers of the broken path — affected by this bug, fixed by this plan

| Caller | Where | How it calls |
|--------|-------|-------------|
| `DashboardPage.jsx` ~L1649 | Reprint from dashboard | `printOrder(..., {})` — no orderItemTotal |
| `components/cards/TableCard.jsx` ~L226 | Print from table card | `printOrder(..., { serviceChargeTaxPct, deliveryChargeGstPct })` |
| `components/cards/OrderCard.jsx` ~L242 | Print from order card | `printOrder(..., { serviceChargeTaxPct, deliveryChargeGstPct })` |
| `pages/AllOrdersReportPage.jsx` ~L850 | Reprint from report | `printOrder(..., {})` |
| `components/order-entry/RePrintButton.jsx` ~L115 | Dedicated reprint button | `printOrder(..., { ... })` |

No code changes in these callers — they are fixed automatically when `orderTransform.js` is corrected.

### NOT affected / WILL NOT touch

- `CollectPaymentPanel.jsx` — Collect Bill path is already correct, no change
- `OrderEntry.jsx` — print callers use the transform; no change needed
- `orderService.js` — passes through to transform; no change needed
- Any report page, dashboard page, or other files
- Registry schema, localStorage, providers, sockets

---

## Risk Classification

**CRITICAL** — This is a financial field (`gst_tax` and `vat_tax`) sent to the `order-temp-store` endpoint which is the printer payload. Incorrect values print on customer receipts. While this does NOT affect the actual settlement amount (that's `payment_amount`), it affects the tax displayed on the bill — which has GST compliance implications.

**R5 trigger:** `orderTransform.js` is a named hotspot file. Explicit file-level plan and regression checklist required.

**R6 trigger:** `gst_tax` and `vat_tax` are financial fields. Owner approval required before implementation (Gate 4 GO).

---

## Downstream Impact Assessment

| System | Field | Impact if left broken | Impact after fix |
|--------|-------|----------------------|-----------------|
| Printer agent / thermal bill | `gst_tax`, `vat_tax` | GST/VAT shows ₹0 on printed receipt | Shows correct computed amount |
| `order-temp-store` backend store | Same fields | Stores 0 for historical records | Stores correct values |
| Settlement amount | `payment_amount` | **NOT affected** (uses different field) | No change |
| Collect Bill print | Same fields | Already working correctly | No change (untouched path) |
| Auto-print after placeOrder | Same fields | Uses Collect Bill path with overrides | No change |
| Reports (AllOrders, etc.) | Separate fields | Not affected by this bug | No change |

---

## Owner Decisions Needed

**None.** Root cause is confirmed, fix scope is unambiguous. No business rule decisions required — the fallback logic is identical to the already-approved Collect Bill path.

---

## Summary

- **1 file changes:** `orderTransform.js` lines 1882-1893
- **Net change:** +9 lines (replace 12 with ~21)
- **Risk:** CRITICAL (financial field, hotspot file)
- **Fast Lane eligible:** NO
- **Conflicts:** NONE
- **Owner decisions:** NONE
- **Gate 4 GO required:** YES (financial + hotspot)
