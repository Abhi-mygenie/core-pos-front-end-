# QA Handover — CR-165 Razorpay Cancel & Refund
**Date:** 2026-08-24
**EXIT GATE:** 5/5 PASS
**Code Reality:** PARTIAL — `razorpayRefundService.js` pre-existed in cloned repo (correct, kept as-is)

---

## 1. Verification Matrix (self-test results)

| Edit | File | Change | Result |
|---|---|---|---|
| 1 | `constants.js:88` | `RAZORPAY_CANCEL_REFUND` | ✅ |
| 2 | `razorpayRefundService.js` | Pre-existing, correct | ✅ SKIP |
| 3 | `orderTransform.js:239-240` | `razorpayOrderId` + `razorpayPaymentStatus` | ✅ |
| 4 | `CancelOrderModal.jsx` | `mode` prop, note textarea, title/button changes | ✅ |
| 5a | `OrderEntry.jsx:7` | import `cancelAndRefund` | ✅ |
| 5b | `OrderEntry.jsx:1282` | `handleCancelOrder(reason, note)` + Trigger A | ✅ |
| 5c | `OrderEntry.jsx:2771` | modal `mode` prop | ✅ |
| 6a | `DashboardPage.jsx:35` | import `cancelAndRefund` | ✅ |
| 6b | `DashboardPage.jsx:1333` | `handleCancelOrderConfirm(reason, note)` + Trigger A | ✅ |
| 6c | `DashboardPage.jsx:2069` | modal `mode` prop | ✅ |
| 7 | `OrderReportBetaPage.jsx` | Refund button + modal + handler | ✅ |
| — | Compile | `webpack compiled with 1 warning` (pre-existing, 0 new) | ✅ |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | **Cash order cancel unchanged** | Cancel any cash/UPI order from Dashboard | Single cancel call, no refund toast, modal shows "Cancel Order" |
| T2 | **Razorpay order — modal shows refund mode** | Open a Razorpay-paid order in OrderEntry | Cancel modal title = "Cancel & Refund", note textarea visible, button = "Confirm & Refund via Razorpay" |
| T3 | **Razorpay cancel from OrderEntry** | Cancel a Razorpay order via OrderEntry | Network: 2 API calls (ORDER_STATUS_UPDATE + RAZORPAY_CANCEL_REFUND). Toast "Refund Initiated" |
| T4 | **Razorpay cancel from Dashboard card** | Cancel a Razorpay order via Dashboard card | Same as T3 via card flow |
| T5 | **Refund fail — cancel still completes** | Backend refund fails (mock or bad order) | Order cancelled toast shown. Then "Refund Failed — contact support" toast. No rollback. |
| T6 | **Order Report — Refund button visible for PG rows** | Open Daily Report → Order Report, filter PG orders | Rows with `razorpay_order_id` show red "Refund" button. `data-testid="refund-order-btn-{id}"` |
| T7 | **Order Report — no button for cash rows** | View cash order rows | No "Refund" button |
| T8 | **Order Report refund flow** | Click Refund on PG row → confirm | Modal opens in `mode="refund"`. On confirm: RAZORPAY_CANCEL_REFUND POST fired. Toast "Refund Initiated" |
| T9 | **Backward compat — onCancel signature** | Cancel any existing non-PG order | `onCancel(reason, '')` — note is empty string, no error |
| T10 | **razorpayOrderId + razorpayPaymentStatus mapped** | Check order object in running orders | Transform correctly maps both fields; null for non-PG orders |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Full cancel flow: cash dine-in order from OrderEntry | R5 hotspot: OrderEntry handleCancelOrder changed |
| R2 | Full cancel flow: cash order from Dashboard card | R5 hotspot: DashboardPage handleCancelOrderConfirm changed |
| R3 | CancelOrderModal default mode renders correctly | Mode defaults to 'cancel' — all existing callers unaffected |

---

## 4. Registry Sync Confirmation

- registry.json: CR-165 → IMPLEMENTED, pos_6_0 ✅
- EXIT GATE: 5/5 PASS ✅

---

## 5. Credentials + Environment

- Test with Razorpay orders: `owner@18march.com / ***` (restaurant 478, preprod)
- Active Razorpay order needed for T2–T5 (check preprod for recent PG transactions)
- Preview: `https://core-pos-deploy-12.preview.emergentagent.com`
