# Impact Analysis — BUG-280 + BUG-281

**Produced by:** Planning Role (Gate 2)  
**Date:** 2026-07-31  
**Status:** COMPLETE — awaiting Gate 4 GO before implementation  
**Linked plan:** `/app/memory/plans/BUG-280_BUG-281_IMPLEMENTATION_PLAN.md`

---

## 1. Bugs in Scope

| ID | Summary | Severity | Gate at entry |
|----|---------|----------|---------------|
| BUG-280 | Customer details (name/mobile/membership_id) never written into `order-bill-payment` settlement payload | HIGH | Investigation Closed |
| BUG-281 | `custGST` / `custGSTName` forwarded to manual Print Bill (CR-116) but omitted from every auto-print / auto-bill-print override block | HIGH | Investigation Closed |

Both bugs share the `collectBillExisting` function in `orderTransform.js` as a fix location. They are planned and implemented together to avoid a second edit to the same function.

---

## 2. Source-of-Truth Documents

- `/app/memory/evidence/BUG-280/BUG-280_INVESTIGATION_REPORT.md`
- `/app/memory/evidence/BUG-281/BUG-281_INVESTIGATION_REPORT.md`
- Owner Decisions: OD-BUG280-1 (no email change), OD-BUG281-1 (backend keys are `custGST` / `custGSTName`)

---

## 3. Code Reality Check — Verification Against Investigation Reports

All investigation-report line numbers were manually confirmed against current source before this document was written.

### 3.1 `orderTransform.js` `collectBillExisting`

| Finding | Investigation claim | Reality-check result |
|---------|---------------------|----------------------|
| Function signature | L1408 | **CONFIRMED** — `collectBillExisting: (table, cartItems, customer, paymentData, options = {})` |
| `paymentData` destructuring block | L1410–1427 | **CONFIRMED** — ends with `roundOff = 0,` at L1426 |
| Payload body closes | ~L1641 | **CONFIRMED** — `mobile: tabContact?.phone \|\| '',` at L1640; `};` at L1641 |
| No `cust_name` / `cust_mobile` / `cust_membership_id` in payload | — | **CONFIRMED ABSENT** |
| No `custGST` / `custGSTName` in destructuring or payload | — | **CONFIRMED ABSENT** |
| `placeOrder` has all three customer fields | L1000–1005 | **CONFIRMED** — `cust_name: customer?.name \|\| ''`, `cust_mobile: customer?.phone \|\| ''`, `cust_membership_id: customer?.id \|\| ''` |
| `updateOrder` has all three customer fields | L1131–1133 | **CONFIRMED** |
| `buildBillPrintPayload` already reads `overrides.custGST` and `overrides.custGSTName` | — | **CONFIRMED** L2063–2064 |

### 3.2 `CollectPaymentPanel.jsx` — custGST wiring (upstream source)

| Finding | Reality-check result |
|---------|----------------------|
| `custGST` and `custGSTName` are local state in CPP (L380–381) | **CONFIRMED** |
| Both added to `paymentData` object passed to `onCollectBill` / `onPaymentComplete` (L1099–1100) | **CONFIRMED** |
| Both added to overrides object passed to `handlePrintBill` (L1166–1167) | **CONFIRMED** — manual Print Bill path is ALREADY CORRECT; no change needed |

**Conclusion:** `paymentData` arriving at all auto-print override blocks DOES contain `custGST` and `custGSTName`. The fix is simply to read `paymentData?.custGST` / `paymentData?.custGSTName` in each block.

### 3.3 Customer object schema

Confirmed from `OrderEntry.jsx` validation checks (L927, L931, L937, L941, L946, L951, etc.) and `placeOrder` / `updateOrder` payload builders:

| Field needed | Actual key on `customer` object | Evidence |
|-------------|--------------------------------|---------|
| Name | `customer.name` | L927, L1000 |
| Phone | `customer.phone` | L931, L1001 |
| Membership ID | `customer.id` | L262, L1005 |
| Email | `customer.email` | NOT touched (OD-BUG280-1) |

---

## 4. Call-Site Survey — ALL callers of `collectBillExisting`

A full codebase grep was run. Results:

| # | File | Line | Context | BUG-280 affected? | BUG-281 affected? |
|---|------|------|---------|-------------------|-------------------|
| C1 | `OrderEntry.jsx` | 1467 | `handleQsrCollectBill` — existing-order QSR collect | YES | YES (via M_NEW-A override at L1496) |
| C2 | `OrderEntry.jsx` | 2135 | Main `onPaymentComplete` — existing-order postpaid | YES | YES (via M3 override at L2172) |
| C3 | `CollectBillPanelDrawer.jsx` | 171 | Audit-report Hold-tab settle drawer | PARTIAL (see §5) | YES (settlement only via M4) |

No other callers found in `/app/frontend/src`.

---

## 5. BUG-280 Impact — Customer Fields in Settlement Payload

### Root cause
`collectBillExisting` receives `customer` as parameter but never reads it into the API payload. This means BILL_PAYMENT always sends `cust_name: ''`, `cust_mobile: ''`, `cust_membership_id: ''` (fields are absent — backend treats missing as blank).

### Affected flows (all use `collectBillExisting`)

| Flow | Caller | Order type | Impact |
|------|--------|-----------|--------|
| Postpaid dine-in collect bill | OrderEntry C2 | Dine-In | YES — customer cleared |
| Walk-in collect bill | OrderEntry C2 | Walk-In | YES — customer cleared |
| TakeAway collect bill | OrderEntry C2 | TakeAway | YES — customer cleared |
| Delivery collect bill | OrderEntry C2 | Delivery | YES — customer cleared |
| QSR existing-order collect | OrderEntry C1 | QSR | YES — customer cleared |
| Audit report Hold-tab settle | CollectBillPanelDrawer C3 | Any held order | PARTIAL — see below |

### CollectBillPanelDrawer (C3) — customer shape mismatch

`CollectBillPanelDrawer` constructs its own `customer` object (`buildCustomer`, L74–78) from the transformed order, not from the CRM customer-select flow:

```js
const buildCustomer = (transformed) => ({
  customerName: transformed?.customerName || transformed?.customer || '',
  phone:        transformed?.phone || '',
  email:        '',
});
```

The object uses `customerName` (not `name`) and has no `id` field.

After the fix `cust_name: customer?.name || ''`:
- `customer.name` is `undefined` → `cust_name: ''` (unchanged from current blank behavior)
- `cust_mobile: customer?.phone || ''` → sends phone from order record (new, correct)
- `cust_membership_id: customer?.id || ''` → `''` (unchanged)

**Verdict:** No regression. Drawer gains `cust_mobile` from order. `cust_name` and `cust_membership_id` remain blank, same as today. This is acceptable — drawer settle is not the primary CRM-customer path. Flagged as KNOWN LIMITATION, not in-scope for this fix.

### QSR prepaid new-order paths (`placeOrderWithPayment`)

`placeOrderWithPayment` (C3 analogue for new orders) already sends `cust_name`, `cust_mobile`, `cust_membership_id` from the `customer` param (L1000–1005 confirmed). **Not affected by BUG-280.** No change needed.

### Scope lock — BUG-280
Only `collectBillExisting` in `orderTransform.js`. No change to `CollectBillPanelDrawer`. No email field. No other functions.

---

## 6. BUG-281 Impact — custGST / custGSTName Missing from Auto-Print Overrides

### Root cause
CR-116 wired `custGST` and `custGSTName` into the manual `handlePrintBill` path inside `CollectPaymentPanel` (CPP L1166–1167). The four separate auto-print override objects built in `OrderEntry.jsx`, and the `collectBillExisting` settlement payload (which triggers backend auto-bill-print when `billing_auto_bill_print: 'Yes'`), were not updated.

### Full list of missing sites — CODE REALITY CHECK FOUND 2 ADDITIONAL SITES

Investigation report identified M1, M2, M3, M4. Code Reality Check identified M_NEW-A and M_NEW-B.

| Site | File | Approx line | Block name | `paymentData` in scope? |
|------|------|------------|-----------|------------------------|
| M1 | `OrderEntry.jsx` | ~1386 | QSR PlaceAndPay immediate auto-print | YES — outer `handleQsrCollectBill` param |
| M2 | `OrderEntry.jsx` | ~1424 | QSR PlaceAndPay background auto-print | YES — same |
| **M_NEW-A** | `OrderEntry.jsx` | ~1496 | **QSR existing-order auto-print** ← **investigation missed** | YES — outer `handleQsrCollectBill` param |
| **M_NEW-B** | `OrderEntry.jsx` | ~1891 | **`autoPrintOverrides` inside `autoPrintNewOrderIfEnabled`** ← **investigation missed** | YES — closure over outer `onPaymentComplete(paymentData)` |
| M3 | `OrderEntry.jsx` | ~2172 | Main CollectBill existing-order auto-print | YES — outer `onPaymentComplete` param |
| M4 | `orderTransform.js` | 1427/1640 | `collectBillExisting` settlement payload | YES — `paymentData` parameter |

All 6 sites have `paymentData?.custGST` and `paymentData?.custGSTName` available at the point of the override object construction.

### `buildBillPrintPayload` (consumer)
Already reads `overrides.custGST` at L2063 and `overrides.custGSTName` at L2064. **No change needed in `buildBillPrintPayload`.**

### Backend auto-bill path (M4)
When `billing_auto_bill_print: 'Yes'`, the backend triggers print using the settlement payload. Adding `custGST` / `custGSTName` to the `collectBillExisting` payload (M4) is the correct fix for the backend-triggered path. The backend key names `custGST` and `custGSTName` are confirmed by owner OD-BUG281-1 and by live `order-temp-store` screenshot evidence.

### Manual Print Bill path
CPP L1166–1167 already sends `custGST` and `custGSTName` in the print override. **No change needed for manual Print Bill.**

### CollectBillPanelDrawer auto-print
The drawer has no auto-print block. M4 settlement fix applies — the drawer's `collectBillExisting` call will now include `custGST` / `custGSTName` in the payload. Because `paymentData` from CPP contains these fields, they will be populated if the operator entered them in CPP. **No additional change needed in CollectBillPanelDrawer.jsx.**

### Scope lock — BUG-281
- `orderTransform.js`: add `custGST`/`custGSTName` to destructuring (L1426) and payload body (L1641)
- `OrderEntry.jsx`: 5 override blocks (M1 L1397, M2 L1435, M_NEW-A L1507, M_NEW-B L1904, M3 L2185)
- No changes to `CollectPaymentPanel.jsx`, `CollectBillPanelDrawer.jsx`, or `buildBillPrintPayload`

---

## 7. Affected vs Unaffected Flow Matrix

| Flow | BUG-280 fixed | BUG-281 fixed | Notes |
|------|--------------|--------------|-------|
| Postpaid dine-in — Collect Bill (new order settle) | YES | YES (M3 + M4) | Primary reporter scenario |
| Walk-in — Collect Bill | YES | YES (M3 + M4) | |
| TakeAway — Collect Bill | YES | YES (M3 + M4) | |
| Delivery — Collect Bill | YES | YES (M3 + M4) | |
| QSR PlaceAndPay new order | — (placeOrder already correct) | YES (M1 + M2) | |
| QSR existing-order collect | YES | YES (M_NEW-A + M4) | |
| New-order prepaid auto-print | — | YES (M_NEW-B) | |
| Manual Print Bill | NOT affected | NOT affected — already correct | |
| Room orders auto-print | SUPPRESSED by existing `!isRoom` guard | SUPPRESSED by existing `!isRoom` guard | Intentional per REQ3/AD-302A |
| Audit report Hold-tab settle | PARTIAL (cust_mobile from order) | YES (M4 via drawer) | Known limitation on cust_name |
| Split / partial payments | YES — `collectBillExisting` called same way | YES | splitPayments handled independently |
| Complimentary-item orders | YES | YES — no GST/comp interaction | |

---

## 8. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `customer?.name` is undefined for drawer, produces `''` | Certain | Intentional — blank is safe; same as current absent field |
| Settlement API rejects unknown `custGST` / `custGSTName` keys | LOW — backend uses these in auto-bill; confirmed by owner OD-BUG281-1 | Owner confirmed key names |
| Blank `custGST: ''` overwrites an existing GST number stored in backend | LOW — backend only records from payload when non-blank | GST fields default `\|\| ''`; backend will only update when non-blank |
| Changing settlement payload breaks TAB / partial-payment flows | LOW — edits are additive field additions only, no existing field modified | No existing field is changed |
| `cust_mobile: customer?.phone \|\| ''` sends phone for drawer settle (new behavior) | LOW risk | Correct and beneficial for drawer settle; no regression |
| Scope creep into `buildBillPrintPayload` or `CollectBillPanelDrawer` customer name | POSSIBLE if not locked | Scope lock: CollectBillPanelDrawer customer name is NOT in scope for this fix |

---

## 9. No-Email Invariant

Owner decision OD-BUG280-1 is absolute: **do not add `cust_email` or change `email: ''` behavior in any file touched by this fix.**

The existing `placeOrder` function has `cust_email: customer?.email || ''` at L1002. This is NOT added to `collectBillExisting` per owner direction.

---

## 10. Open Questions

| # | Question | Impact | Resolution needed before |
|---|----------|--------|--------------------------|
| OQ-1 | Does `order-bill-payment` backend accept and persist `cust_name`, `cust_mobile`, `cust_membership_id`? | Medium — fields may be silently ignored | Before Gate 5 (verify step); fix is still correct as additive |
| OQ-2 | CollectBillPanelDrawer `buildCustomer` uses `customerName` not `name`. Should `cust_name` use `customerName` for the drawer path? | Low — out of scope per owner; blank is same as current | Future CR if drawer customer name is needed |

OQ-1 is a VERIFY-ONLY question. The fix is still correct additive behavior even if the backend ignores the new fields. Adding them cannot regress the settlement.

---

## 11. Gate Status

| Gate | Status |
|------|--------|
| Gate 1 — Intake | CLOSED |
| Gate 2 — Impact Analysis | **COMPLETE** (this document) |
| Gate 3 — Implementation Plan | In progress — see linked plan |
| Gate 4 — Owner GO | PENDING |
| Gate 5 — Verify after code | Not started |
