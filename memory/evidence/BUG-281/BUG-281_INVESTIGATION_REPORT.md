# BUG-281 Investigation Report — CLOSED

**ID:** BUG-281  
**Title:** custGST & custGSTName Not Forwarded in Auto-Bill Print (4 Missing Sites)  
**Type:** FE_BUG  
**Risk:** HIGH — B2B GST fields blank on all auto-generated bills; compliance issue  
**Role:** INVESTIGATION  
**Date:** 2026-07-30  
**Steps Used:** 9/10  
**Confidence:** HIGH — all 4 missing call sites confirmed; backend key names confirmed from live payload screenshot  
**Status:** INVESTIGATION CLOSED — owner decisions received — READY FOR PLANNING

---

## Owner Decisions (Received 2026-07-30)

| Decision | Answer |
|----------|--------|
| OD-1: Backend key names for B2B GST fields | **`custGST` and `custGSTName`** (camelCase — confirmed from live `order-temp-store` payload screenshot) |

**Evidence:** Screenshot shows live `order-temp-store` payload with fields:
```
custGST: ""
custGSTName: ""
```
These already reach the backend (from `buildBillPrintPayload` L2063-2064). The bug is that they are always `""` on auto-print paths because the overrides never supply them.

---

## Root Cause — CONFIRMED

CR-116 added UI inputs and wired `custGST`/`custGSTName` into `CollectPaymentPanel.handlePrintBill` only. Four other code paths that trigger prints or include print-related fields were **not updated**. This is an incomplete implementation by the previous agent.

---

## What Works

| Path | custGST/custGSTName passed? |
|------|:---:|
| `CollectPaymentPanel.handlePrintBill` → `onPrintBill(overrides)` | ✅ (CPP L1166-1167) |
| `orderTransform.buildBillPrintPayload` reads `overrides.custGST` | ✅ (L2063-2064) |

---

## 4 Missing Sites — FULLY CONFIRMED

### M1: OrderEntry.jsx QSR PlaceAndPay — immediate auto-print (L1386)
```javascript
// CURRENT — missing custGST/custGSTName
const overrides = {
  orderItemTotal:      paymentData?.itemTotal,
  orderSubtotal:       paymentData?.subtotal,
  paymentAmount:       paymentData?.finalTotal,
  ...
  tip:                 paymentData?.tip || 0,
  // ← NO custGST, NO custGSTName
};
```

### M2: OrderEntry.jsx QSR PlaceAndPay — background auto-print (L1424)
Same structure as M1 — identical missing fields.

### M3: OrderEntry.jsx main CollectBill auto-print — collectBillOverrides (L2172)
```javascript
// CURRENT — missing custGST/custGSTName
const collectBillOverrides = {
  orderItemTotal:      paymentData?.itemTotal,
  ...
  tip:                 paymentData?.tip || 0,
  runtimeComplimentaryFoodIds: [...],
  // ← NO custGST, NO custGSTName
};
```

### M4: orderTransform.js collectBillExisting payload (L1549-1641)
Backend auto-bill (`billing_auto_bill_print: 'Yes'`) uses this payload.  
`custGST` and `custGSTName` are **not in the destructuring** (L1410-1427) and **not in the payload body**.

---

## Data Flow Trace

```
Operator fills custGST + custGSTName → CollectPaymentPanel state (L380-381)
  ↓
paymentData.custGST, paymentData.custGSTName set (CPP L1099-1100)
  ↓
OrderEntry.jsx receives paymentData

PATH A — Manual "Print Bill" button (WORKS ✓):
  CPP.handlePrintBill → overrides.custGST = custGST (L1166)
                     → overrides.custGSTName = custGSTName (L1167)
  → buildBillPrintPayload reads overrides.custGST (L2064) ✓
  → order-temp-store payload: custGST = "GST123...", custGSTName = "Acme Ltd"

PATH B — Auto-print after main CollectBill (BROKEN ✗):
  OrderEntry.jsx L2172: collectBillOverrides = { gstTax, vatTax, ... }
  ← paymentData.custGST available but NOT forwarded
  → buildBillPrintPayload: custGST: overrides.custGST || '' → ''

PATH C — Auto-print QSR PlaceAndPay immediate (BROKEN ✗):
  OrderEntry.jsx L1386: overrides = { gstTax, vatTax, ... }
  ← NOT forwarded

PATH D — Auto-print QSR PlaceAndPay background (BROKEN ✗):
  OrderEntry.jsx L1424: overrides = { gstTax, vatTax, ... }
  ← NOT forwarded

PATH E — Backend auto-bill via billing_auto_bill_print: 'Yes' (BROKEN ✗):
  collectBillExisting payload (L1549-1641)
  ← paymentData NOT destructured for custGST/custGSTName
  ← backend-triggered print has no access to these fields
```

---

## Exact Fixes (FINAL — all confirmed)

### Fix 1: OrderEntry.jsx — 3 auto-print blocks (+2 lines each = +6 lines total)

**Add to M1 (L1386 overrides block), M2 (L1424 overrides block), M3 (L2172 collectBillOverrides block):**
```javascript
custGST:             paymentData?.custGST     || '',   // BUG-281
custGSTName:         paymentData?.custGSTName || '',   // BUG-281
```

### Fix 2: orderTransform.js — collectBillExisting (+2 lines)

**In the destructuring** (L1410-1427 or L1420):
```javascript
custGST = '',
custGSTName = '',
```

**In the payload body** (L1549+ area, before closing `}`):
```javascript
custGST,       // BUG-281: B2B GST number for backend auto-bill print
custGSTName,   // BUG-281: B2B GST registered name for backend auto-bill print
```

*(Or read directly as `paymentData.custGST` without destructuring — either approach works)*

---

## Blast Radius

| File | Block | Lines | Change |
|------|-------|-------|--------|
| `src/components/order-entry/OrderEntry.jsx` | M1 (L1386) | +2 | `custGST`, `custGSTName` |
| `src/components/order-entry/OrderEntry.jsx` | M2 (L1424) | +2 | `custGST`, `custGSTName` |
| `src/components/order-entry/OrderEntry.jsx` | M3 (L2172) | +2 | `custGST`, `custGSTName` |
| `src/api/transforms/orderTransform.js` | `collectBillExisting` payload | +2 | `custGST`, `custGSTName` |

**Total: 2 files, 8 lines**  
**Hotspot R5: YES (`orderTransform.js`)** → full gate cycle, no planning skip

---

## Acceptance Criteria

```
AC-1: Auto-print after collect bill → order-temp-store payload → custGST = operator-entered value
AC-2: Auto-print after collect bill → order-temp-store payload → custGSTName = operator-entered value
AC-3: QSR PlaceAndPay auto-print → same fields forwarded
AC-4: collectBillExisting payload → custGST and custGSTName present for backend auto-bill
AC-5: Manual "Print Bill" button (already working) — no regression
AC-6: No regression to other overrides fields (gstTax, vatTax, tip, discountAmount, etc.)
```

---

## Related

- CR-116: Original B2B GST feature intake. This bug is a miss in CR-116 implementation.
- BUG-280: Shares `collectBillExisting` edit location — **combine in one Planning session**
