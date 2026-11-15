# QA Handover — CR-349
**Date:** 2026-08-26
**File:** `pages/reports-module/OrderReportBetaPage.jsx`

---

## 1. Verification Matrix Results

| Edit | Verified |
|---|---|
| +8 imports (paymentMutationService, MarkUnpaidConfirmDialog, PaymentMethodPicker, printOrder, orderFromAPI, api, API_ENDPOINTS, isMutationAllowedForSelectedDate) | ✅ Lines 13–20 |
| +printerAgents/paymentTypes destructure from useRestaurant() | ✅ Line 222 |
| +5 state vars (pendingChangeMethodIds/markUnpaidTarget/markUnpaidPending/optimisticUnpaidIds/printingIds) | ✅ Lines 226–231 |
| +handleChange — calls changeOrderPaymentMethod(row.order_id, newMethod) | ✅ Lines 264–277 |
| +handleUnpaidConfirm — calls makeOrderUnpaid(row.order_id) | ✅ Lines 278–294 |
| +handleReprint — POST SINGLE_ORDER_NEW → orderFromAPI.order → printOrder | ✅ Lines 295–320 |
| +isWithinMutation per day = isMutationAllowedForSelectedDate(day.date) | ✅ Lines 502–503 |
| +actions `<td>` — Change/Unpaid/Reprint/Refund inline | ✅ Lines 564–613 |
| +MarkUnpaidConfirmDialog at page level | ✅ Lines 685–692 |
| toast dep fix in handleRefundConfirm | ✅ Line 262 |
| Compile | ✅ webpack compiled successfully, 0 warnings |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Change button — settled non-PG, within window | Open Beta Report today, go to Settled tab, find Cash/UPI row | `PaymentMethodPicker` button visible with blue border |
| T2 | Change button — disabled outside window | Find settled row from 3+ days ago | Change button rendered but greyed out, tooltip "Only available for today and yesterday" |
| T3 | Change button — PG row | Find Razorpay PG settled row | No Change button |
| T4 | Change confirms | Click Change → pick new method → confirm | Network: `changeOrderPaymentMethod` endpoint called; row refreshes |
| T5 | Unpaid button — settled non-PG | Settled Cash/UPI row | Amber "Unpaid" button visible |
| T6 | Unpaid opens dialog | Click Unpaid | `MarkUnpaidConfirmDialog` appears with order # |
| T7 | Unpaid confirms | Confirm in dialog | `makeOrderUnpaid` called; row disappears from Settled tab |
| T8 | Unpaid optimistic hide | After click, before refresh | Unpaid button hidden immediately |
| T9 | Reprint — all settled rows | Any settled row (PG + non-PG) | Orange "Reprint" button visible |
| T10 | Reprint spinner | Click Reprint | Loader2 spinner shown during fetch |
| T11 | Reprint sends to printer | Click Reprint on valid order | `SINGLE_ORDER_NEW` POST, then `printOrder` fires |
| T12 | Refund unchanged — PG non-cancelled | Razorpay PG settled row | Refund button unchanged, opens CancelOrderModal |
| T13 | No buttons on non-settled | Cancelled / Running / Credit rows | Zero CR-349 buttons shown |
| T14 | Refund absent on non-PG | Cash/UPI settled row | No Refund button |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | CR-165 Refund flow end-to-end | Refund button and CancelOrderModal must be unchanged |
| R2 | All non-settled tabs (All, Aggregator, Cancelled, Credit, Hold, Merged, Running) | No action buttons should appear on non-f_order_status=6 rows |
| R3 | AllOrdersReportPage unchanged | No shared files modified |

---

## 4. Registry Sync

- registry.json: CR-349 → IMPLEMENTED ✅
- CR_REGISTRY.md: updated ✅
- FILE_OWNERSHIP.md: OrderReportBetaPage.jsx listed ✅
- Code markers: 16 × `// CR-349` ✅
- Compile: 0 warnings ✅
- EXIT GATE: 5/5 PASS ✅

## 5. Environment

- App URL: https://core-frontend-dev.preview.emergentagent.com
- Route: navigate to Orders (Beta) from sidebar
