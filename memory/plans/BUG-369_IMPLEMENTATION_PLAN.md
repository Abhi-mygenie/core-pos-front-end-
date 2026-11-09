# BUG-369 IMPLEMENTATION PLAN — Print Customer Copy: Pass Flag to Printer Agent
**Date:** 2026-09-01 | **Gate:** 3 | **Risk:** MEDIUM
**Execution order:** #2

---

## Step 0 — Entry Verification ✅
| Claim | Verified |
|---|---|
| `profileTransform.js` last field: `restaurantFor` at line 399 | ✅ |
| `CollectPaymentPanel.jsx handlePrintBill` builds `overrides` object at line 1206 | ✅ |
| `buildBillPrintPayload` return object ends at line 2224 (last field: delivery_charge_gst_amount) | ✅ |
| No `print_bill_customer_copy` anywhere in orderTransform.js | ✅ |

---

## Edit 1 — profileTransform.js: add `printBillCustomerCopy` mapping
**File:** `src/api/transforms/profileTransform.js`
**After line 399** (`restaurantFor: ...`):
```js
// BUG-369: print_bill_customer_copy missing — Printer Agent never received customer copy flag
// Dual-path mirrors BUG-366/BUG-373 pattern.
printBillCustomerCopy: toBoolean(apiSettings.settings?.print_bill_customer_copy ?? apiSettings.print_bill_customer_copy),
```

---

## Edit 2 — CollectPaymentPanel.jsx: pass flag in overrides at `handlePrintBill`
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Location:** `handlePrintBill` overrides object (line ~1206)

Add to the overrides object (after `serviceChargeAmount` at line 1228):
```js
// BUG-369: pass customer copy flag so Printer Agent device prints extra copy
printBillCustomerCopy: restaurant?.settings?.printBillCustomerCopy || false,
```

---

## Edit 3 — orderTransform.js `buildBillPrintPayload`: add flag to output
**File:** `src/api/transforms/orderTransform.js`
**Location:** End of return object (after line 2223, before closing `}`):
```js
// BUG-369: tell Printer Agent to print customer copy when enabled
...(overrides.printBillCustomerCopy ? { print_bill_customer_copy: 'Yes' } : {}),
```

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| E1 | profileTransform adds field | `restaurant.settings.printBillCustomerCopy` is truthy for accounts with setting enabled |
| E2 | overrides carries flag | `console.log(overrides)` in handlePrintBill shows `printBillCustomerCopy: true` |
| E3 | Payload includes flag | Network tab: POST to print endpoint includes `print_bill_customer_copy: "Yes"` |
| V1 | Setting enabled → flag in payload | Enable Print Customer Copy in Settings → print bill → `print_bill_customer_copy: "Yes"` in print POST |
| V2 | Setting disabled → flag absent | Disable setting → print bill → `print_bill_customer_copy` absent from payload |
| V3 | Existing overrides unaffected | Normal bill print (no customer copy) works as before — no regression |

---

## Scope Lock
**Files WILL change:** `profileTransform.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`
**Files will NOT touch:** `restaurantSettingsTransform.js`, any UI component, any other print path

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-369 → IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: all 3 files listed
- [ ] Code markers: `// BUG-369` in each modified file
- [ ] Compile: webpack 0 new warnings
