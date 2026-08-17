# Handover Note — Next Agent

## Session Summary (June 11, 2026)
Continued from June 10 deployment. This session focused on report data gaps, display rounding, prepaid partial payment parity, and credit panel fixes. All changes are code-level verified (webpack compiled clean). No backend changes made.

## What Was Done This Session

### Gap 6 — Display Rounding Fix (12 files)
`formatCurrency`/`fmtCur` functions across all report files were rounding decimals to integers (₹14.50 → ₹15). Fixed to show decimals when present, hide `.00` for whole numbers.
- **Files:** OrderDetailSheet, OrderTable, SummaryBar, RoomRowCard, OrderLedgerMockup, FoodCourtMockup, RoomOrdersMockup, SettlementReportMockup, DashboardMockup, ItemSalesMockup, PrepServeTimeMockup, EdgeStatesMockup

### Gaps 1,2,3,5 — orderLogsReportRow Missing Fields
Added fields the API sends but the transform wasn't reading:
- **Gap 1:** `customerPhone`, `customerEmail`, `customerContact` (from `cust_mobile`, `cust_email`)
- **Gap 2:** `transactionRef` (from `transection_id`)
- **Gap 3:** `deliveryAddress` (from `orderWrapper.customer_details`)
- **Gap 5:** `roomTotal`, `roomAdvance`, `roomBalance`, `roomCheckout` (from `room_info`)
- **Wire-up:** `orderLedgerService.js` `toLedgerRow()` updated to use new fields
- **Files:** `reportTransform.js`, `orderLedgerService.js`

### Prepaid Partial Payment Parity (CR-021 extension)
`placeOrderWithPayment` had two bugs vs `collectBillExisting`:
1. `payment_method` never set to `"partial"` when split payments exist — fixed
2. `partial_payments` always sent (even single payments, padded with zeros) — made conditional
- **File:** `orderTransform.js`
- **Verified:** Order 939700 (cafe103) — payload now sends `payment_method: "partial"` + correct `partial_payments` array

### Fix A — singleOrderNew Missing Financial Fields
Added 12 fields to `singleOrderNew` transform: `itemTotal`, `gstAmount`, `vatAmount`, `serviceChargeAmount`, `tipAmount`, `roundOff`, `discountAmount`, `couponCode`, `couponAmount`, `deliveryChargeGst`, `orderNote`. Fixed `subtotal` to read from backend instead of re-computing.
- **File:** `reportTransform.js`
- **Impact:** OrderDetailSheet FETCH MODE (Credit Panel) now shows correct bill summary

### Fix B — Credit Service Totals from API
`tap-customer-record-list` API returns `total_tap_credit_amount`, `total_tap_debit_amount`, `tap_balance_amount` but code ignored them. Now extracted and used.
- **Files:** `creditService.js`, `CreditManagementPanel.jsx` (3 locations)

### Bug Fix — customerDetails Crash
`orderLogsReportRow` referenced `customerDetails` variable without declaring it. Added `const customerDetails = orderWrapper.customer_details || {};`
- **File:** `reportTransform.js`

## What's Awaiting Owner Smoke Test

| CR | What to test |
|----|-------------|
| **CR-021** | Split payment: Cash ₹50 + UPI ₹100 on ₹150 bill → network has `payment_mode: "partial"` + `partial_payments[]`. **Also test prepaid split** — same verification on Place+Pay flow |
| **CR-025** | Apply 20% discount on ₹1000 order → payload: `order_discount: 200` (₹ amount, not 20), `self_discount: 0` |
| **CR-018** | Schedule Order — all 10 gaps verified in code, needs live QA |
| **CR-020 Phase 4** | B12-B15 (GST Mode labels, Short Code toggle). B11 parked (needs live profile API) |

## Backend Asks (cannot be fixed on frontend)

| # | Ask | Detail |
|---|-----|--------|
| **Gap 4** | `order-logs-report` should return cash/card/upi breakup for `payment_method: "partial"` orders | Backend stores partial_payments (verified via place-order payload) but report API doesn't return the breakdown. Frontend has no way to populate per-method columns. |
| **Credit Panel Totals** | `tap-waiter-list` should return `total_tap_credit_amount` + `total_tap_debit_amount` at top level | Currently only per-customer `balance` is returned. TOTAL CREDIT and TOTAL PAID cards show `—` because the data isn't available without N+1 API calls. |

## What's Parked

| Item | Why |
|------|-----|
| **CR-020 B11** | Channel dropdown filter — needs live profile API response |
| **CR-023** | Bulk Editor typing lag — Gate 3, awaiting owner go-ahead |
| **CR-027 (Toast, renumbered from CR-025 on 2026-06-11)** | Unified toast error surfacing — Ready for Gate 6, not started |
| **Gap 4** | Partial payment report breakup — backend ask |
| **singleOrderNew transform gaps** | FIXED this session |
| **Menu Management FE Gaps Triage** | 7 of 10 testable, 4 high-priority — pending preprod validation |

## Environment
- **Preview URL:** `https://core-pos-deploy-6.preview.emergentagent.com`
- **Frontend:** Port 3000, craco + React 19
- **Backend:** Port 8001, FastAPI (placeholder — app uses external APIs)
- **External APIs:** `preprod.mygenie.online`, `presocket.mygenie.online`, `crm.mygenie.online`

## Test Credentials
- **Cafe 103:** `owner@cafe103.com` / `Qplazm@10`
- **Kunafa Mahal:** `owner@kunafamahal.com` / `Qplazm@10`

## Key Docs
| Doc | Purpose |
|-----|---------|
| `/app/memory/PRD.md` | Full PRD with implementation history |
| `/app/memory/REPORT_ROUNDING_HANDOVER.md` | Report rounding investigation — Issue 1 FIXED, Issue 2 FIXED |
| `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md` | Split payment — now covers both postpaid + prepaid |
| `/app/memory/change_requests/CR_025_DISCOUNT_PAYLOAD_FIX.md` | Discount payload alignment |
| `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` | Schedule order — all 10 gaps |
| `/app/memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md` | 15 settings bugs |
| `/app/memory/triage/MENU_MANAGEMENT_FE_GAPS_TRIAGE_2026_06_10.md` | Menu management FE gaps |
