# CR-026: Report Data & Rounding Sweep (Retro-Registration)
## Session-3 (2026-06-11) fixes, registered retroactively per owner ruling R4

**Registered:** 2026-06-11 (retroactive — work shipped 2026-06-11, registration approved in baseline consolidation R4)
**Sprint:** pos_4_0
**Priority:** P1
**Status:** IMPLEMENTED — in owner smoke batch (`control/POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` item S-9)
**Owner:** Abhi
**Source:** `memory/HANDOVER.md` + `memory/REPORT_ROUNDING_HANDOVER.md` (Session 3)

---

## 1. SCOPE — 6 fixes shipped in one session

| # | Fix | Files | Code evidence |
|---|-----|-------|---------------|
| 1 | **Display rounding** — `formatCurrency`/`fmtCur` rounded all currency to integers (₹14.50 → ₹15). Now: show 2 decimals when present, hide `.00` for whole numbers | 12 report files: OrderDetailSheet, OrderTable, SummaryBar, RoomRowCard, OrderLedgerMockup, FoodCourtMockup, RoomOrdersMockup, SettlementReportMockup, DashboardMockup, ItemSalesMockup, PrepServeTimeMockup, EdgeStatesMockup | `hasDecimals` pattern, e.g. OrderDetailSheet:18-19 |
| 2 | **orderLogsReportRow missing fields** — customerPhone/Email/Contact, transactionRef, deliveryAddress, roomTotal/Advance/Balance/Checkout | `reportTransform.js`, wired in `orderLedgerService.js` `toLedgerRow()` | reportTransform:1012, orderLedgerService:92/101 |
| 3 | **singleOrderNew 12 financial fields** — itemTotal, gst/vat, serviceCharge, tip, roundOff, discount, coupon, deliveryChargeGst, orderNote; subtotal read from backend | `reportTransform.js` | Credit Panel drill-down (FETCH MODE) bill summary now correct |
| 4 | **Credit totals from API** — `total_tap_credit_amount`/`total_tap_debit_amount`/`tap_balance_amount` extracted instead of recomputing | `creditService.js`, `CreditManagementPanel.jsx` | creditService:40-42 |
| 5 | **customerDetails crash** — undeclared variable in `orderLogsReportRow` | `reportTransform.js` | reportTransform:323 |
| 6 | **OrderDetailSheet bill-summary sequence** — Item Total → Discount/Coupon → SC → Delivery → Tip → Subtotal → GST → VAT → Round-off → Grand Total; GST/VAT hidden when zero | `OrderDetailSheet.jsx` L797-852 | per REPORT_ROUNDING_HANDOVER Issue 1 |

## 2. RELATED (same session, tracked under CR-021)
- Prepaid partial-payment parity (`payment_method: "partial"` + conditional `partial_payments`) — covered by CR-021 (CLOSED — owner ruling R1, smoke covered both flows).

## 3. BACKEND ASKS RAISED (carried in OPEN_GAPS / Backend Action Items)
- **Gap 4:** `order-logs-report` must return cash/card/upi breakup for `payment_method: "partial"` orders.
- **Credit Panel totals:** `tap-waiter-list` must return `total_tap_credit_amount` + `total_tap_debit_amount` at top level (TOTAL CREDIT / TOTAL PAID cards show `—` today).

## 4. ARTIFACT TRACKER
| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake (retro) | DONE — this file |
| 2 | Discovery/Impact | DONE — `REPORT_ROUNDING_HANDOVER.md` |
| 3 | Implementation | DONE — code-verified in baseline consolidation 2026-06-11 |
| 4 | QA Report | Code-level verification done (consolidation audit) |
| 5 | Owner Smoke / Signoff | **PENDING — smoke batch item S-9** |
