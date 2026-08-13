# QA Handover — BUG-280 + BUG-281

**Date:** 2026-07-31  
**From:** Implementation Agent  
**To:** QA Agent  
**Plan reference:** `/app/memory/plans/BUG-280_BUG-281_IMPLEMENTATION_PLAN.md`

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Change Description | Self-Test Result |
|------|------|--------------------|:---:|
| E1a | `orderTransform.js` L1427–1430 | `custGST = ''` + `custGSTName = ''` added to `collectBillExisting` paymentData destructuring | ✅ Confirmed — grep L1428 |
| E1b | `orderTransform.js` L1641–1651 | `cust_name`/`cust_mobile`/`cust_membership_id` (BUG-280) + `custGST`/`custGSTName` (BUG-281) added to payload body | ✅ Confirmed — grep L1641–1651 |
| E2 | `OrderEntry.jsx` L1398–1399 | M1: `custGST`/`custGSTName` in QSR PlaceAndPay immediate auto-print override | ✅ Confirmed — grep L1398 |
| E3 | `OrderEntry.jsx` L1438–1439 | M2: `custGST`/`custGSTName` in QSR PlaceAndPay background auto-print override | ✅ Confirmed — grep L1438 |
| E4 | `OrderEntry.jsx` L1512–1513 | M_NEW-A: `custGST`/`custGSTName` in QSR existing-order auto-print override (missed by investigation) | ✅ Confirmed — grep L1512 |
| E5 | `OrderEntry.jsx` L1911–1912 | M_NEW-B: `custGST`/`custGSTName` in `autoPrintOverrides` (`autoPrintNewOrderIfEnabled`) (missed by investigation) | ✅ Confirmed — grep L1911 |
| E6 | `OrderEntry.jsx` L2194–2195 | M3: `custGST`/`custGSTName` in main CollectBill `collectBillOverrides` | ✅ Confirmed — grep L2194 |

**All 7 edits self-verified.**

---

## 2. Test Cases

### BUG-280 — Customer identity in settlement payload

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| T1 | Collect Bill with CRM customer selected | 1. Open dine-in table with placed order. 2. Select a CRM customer (name + phone + membership_id). 3. Open CollectPaymentPanel → click Collect. 4. Check browser console for `[CollectBill] payload:` log. | `cust_name`, `cust_mobile`, `cust_membership_id` non-blank and match selected customer | MANDATORY |
| T2 | Collect Bill with no customer | Same flow, no customer selected. Check `[CollectBill] payload:` log. | `cust_name: ''`, `cust_mobile: ''`, `cust_membership_id: ''` — no crash | MANDATORY |
| T3 | No email invariant | Check `[CollectBill] payload:` log for any test with customer. | `cust_email` key ABSENT from payload | MANDATORY |
| T4 | QSR existing-order collect with customer | QSR existing order → collect bill → check `[QSR Pay] collect-bill payload:` log | Same customer fields present | HIGH |

### BUG-281 — custGST/custGSTName in all auto-print paths

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| T5 | Manual Print Bill (unchanged — regression) | Collect Bill panel → enter GST number "TESTGST123" and GST name "TestCo" → click Print Bill | `custGST: 'TESTGST123'` and `custGSTName: 'TestCo'` in `order-temp-store` payload. Should be unchanged from pre-fix behavior. | MANDATORY |
| T6 | M3 auto-print with GST entered (main CollectBill) | Existing dine-in order, autoBill ON, enter GST in CPP → click Collect | Console log `[AutoPrintCollectBill] overrides:` shows `custGST`/`custGSTName` non-blank | MANDATORY |
| T7 | M3 auto-print with no GST | Same flow, no GST entered | `custGST: ''`, `custGSTName: ''` in overrides — no crash | MANDATORY |
| T8 | M4 settlement payload with GST | Same as T6 — check `[CollectBill] payload:` log | `custGST`/`custGSTName` in BILL_PAYMENT payload | MANDATORY |
| T9 | M1 QSR PlaceAndPay immediate with GST | QSR mode, autoBill ON, new order via PlaceAndPay, GST entered | Console log `[QSR PlaceAndPay] auto-print` shows `custGST`/`custGSTName` in overrides | HIGH |
| T10 | M_NEW-A QSR existing-order with GST | QSR mode, existing order collect, GST entered | Console log `[QSR Pay AutoPrint]` shows `custGST`/`custGSTName` | HIGH |
| T11 | M_NEW-B autoPrintNewOrderIfEnabled | Non-QSR new prepaid order, autoBill ON, GST entered | Console log `[AutoPrintBill] overrides:` shows `custGST`/`custGSTName` | HIGH |

### Regression tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Collect Bill settlement succeeds with customer selected | Ensure additive payload fields don't break BILL_PAYMENT API call |
| R2 | Collect Bill settlement succeeds WITHOUT customer | Ensure blank fields don't break API |
| R3 | Billing totals unchanged (gstTax, vatTax, serviceCharge, tip, discount) | Ensure no financial field was modified |
| R4 | Split payment payload intact (`partial_payments` array) | Added fields are before `partial_payments` block — no interaction |
| R5 | Room order auto-print still suppressed | `!isRoom` guard unchanged at all 5 override sites |
| R6 | Pre-existing test suite: `orderTransform.roomInfo`, `orderTransformAddonQty`, `cr029.roundUp` | All should pass (pre-existing `qa_subtotal_delivery_validation` 2 failures are pre-existing, not regression) |

---

## 3. Known Pre-Existing Failures (Do NOT flag as regression)

`qa_subtotal_delivery_validation.test.js` — 2 tests fail with `order_subtotal 120 ≠ 126`. These failures existed before this implementation was applied (confirmed via `git stash` + retest). They are NOT caused by BUG-280/281 changes.

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-280, BUG-281
Gate: 5 (IMPLEMENTED — PENDING QA)
EXIT GATE checks:
  1. Registry sync:         PASS — both items at gate=5, status=IMPLEMENTED — PENDING QA
  2. BUG_TRACKER.md:        PASS — rows updated
  3. FILE_OWNERSHIP.md:     PASS — entry added under 2026-07-31
  4. Code markers:          PASS — // BUG-280 and // BUG-281 comments in both files
  5. Compile check:         PASS — webpack compiled with 1 warning (pre-existing, not introduced by these edits)
EXIT GATE: 5/5 PASS
```

---

## 5. Credentials + Environment

- Application URL: use `REACT_APP_API_BASE_URL` from `/app/frontend/.env`
- Test credentials: `/app/memory/test_credentials.md`
- Browser console verification is the primary method (network tab optional for BILL_PAYMENT payload confirmation)
- autoBill (settings.autoBill) must be ON in restaurant settings to trigger auto-print paths (M1–M3, M_NEW-A, M_NEW-B)
- QSR mode must be active to trigger M1/M2/M_NEW-A paths

---

## 6. Files Changed

| File | Edit | BUG |
|------|------|-----|
| `src/api/transforms/orderTransform.js` | E1a, E1b | BUG-280 + BUG-281 |
| `src/components/order-entry/OrderEntry.jsx` | E2, E3, E4, E5, E6 | BUG-281 |
