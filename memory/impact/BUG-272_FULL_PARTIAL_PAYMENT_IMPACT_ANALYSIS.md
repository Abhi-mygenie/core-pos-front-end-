# BUG-272 — Full Impact Analysis: Partial Payment Across All Surfaces

**ID:** BUG-272 (expanded scope)
**Gate:** 2 (Impact Analysis — full surface audit)
**Date:** 2026-07-29
**Agent:** PLANNING

---

## Surface Audit — Every Place Partial Payment is Displayed or Processed

### ✅ FIXED (this session)

| # | Surface | File | How Partial Is Handled | Status |
|---|---------|------|----------------------|--------|
| 1 | **Order Ledger — table rows** | `OrderLedgerMockup.jsx` L409-424 | Colored stacked badges `[Cash ₹X][UPI ₹Y]` | ✅ FIXED |
| 2 | **Order Ledger — CASH/CARD/UPI columns** | `orderLedgerService.js` L88-92 (`toLedgerRow`) | `cashAmount`/`upiAmount` from `partialMap` legs | ✅ FIXED |
| 3 | **Order Ledger — Payment filter** | `FilterBar.jsx` L107 + `OrderLedgerMockup.jsx` L354 | "Partial" option + Cash filter includes partial-with-cash-leg | ✅ FIXED |
| 4 | **Order Ledger — TOTALS row** | `OrderLedgerMockup.jsx` (sumAll) | Auto-sums `cashAmount`/`upiAmount` from fixed rows | ✅ AUTO-FIXED |
| 5 | **Order Ledger — Audit table** | `OrderLedgerMockup.jsx` L980 | Uses same `paymentBadges()` renderer | ✅ FIXED |
| 6 | **Revenue/Collection pipeline** | `orderLedgerService.js` L239 (`getRevenueOrdersForRange`) | Same `toLedgerRow` — auto-inherits fix | ✅ AUTO-FIXED |
| 7 | **Transform layer** | `reportTransform.js` L842-848 | `partial_payments` → `partialMap` → `cashAmount`/`upiAmount` | ✅ FIXED |
| 8 | **Excel export** | `OrderLedgerMockup.jsx` export uses row data | Exports fixed `cashAmount`/`upiAmount` values | ✅ AUTO-FIXED |

### ⚠️ NEEDS FIX (partial payment data available but not displayed correctly)

| # | Surface | File | Current Behavior | What's Wrong | Fix Required |
|---|---------|------|-----------------|-------------|-------------|
| 9 | **Order Detail Panel (side drawer)** | `OrderDetailSheet.jsx` L620 | Shows "PARTIAL" text via `formatPaymentMethod()` | No breakdown of legs (Cash ₹1,000 + UPI ₹363). Just says "PARTIAL". | Add partial leg badges or breakdown text below "Mode of Payment: PARTIAL". Data available via `displayData.__source.cashAmount` / `displayData.__source.upiAmount` (since `__source` is the full row). ~10 lines. |
| 10 | **Daily Sales (Insights Dashboard)** | `insightsService.js` L348, `DailySalesMockup.jsx` | `payment_mix` from backend aggregates all partial into one "Partial" bucket | Cash from partial doesn't count in "Cash" bucket. Shows as separate "Partial" line in payment mix. | Two options: (A) FE splits partial orders into their legs before aggregating → Cash includes partial-cash-leg. (B) Backend adds partial legs to payment_mix endpoint. **Owner decision needed.** ~20-30 lines if FE. |
| 11 | **Cashier Settlement** | `CashierSettlementMockup.jsx` L6 | Has `🟡 BE-1 caveat: partial split approximate` warning | Per-cashier cash/card/upi collection totals lump partial into one bucket. Uses backend-side aggregation. | Same as #10 — needs backend to split partial legs per-cashier, or FE re-aggregation from `partial_payments`. **Owner decision needed.** |
| 12 | **Cashier Activity (Staff)** | `StaffCashiersMockup.jsx` L6 | Same `🟡 partial payment split approximate` warning | Same as #11. | Same dependency on backend or FE re-aggregation. |

### ✅ NO IMPACT (already correct or not applicable)

| # | Surface | File | Why No Impact |
|---|---------|------|--------------|
| 13 | **Collect Bill (placing order)** | `CollectPaymentPanel.jsx` | Sends `partial_payments` array correctly on settle. This is the WRITE side — already works. |
| 14 | **Order Transform (settle/print payload)** | `orderTransform.js` L1257-1295 | Builds `partial_payments` for backend on settle. Already correct. |
| 15 | **Payment Classifier** | `paymentClassifier.js` L28 | Returns `'Partial'` for `pm === 'partial'`. Display-bucket only. No split needed here. |
| 16 | **Payment Methods Config** | `config/paymentMethods.js` | Maps `partial` → `split` for UI button. Config only. |
| 17 | **Dashboard Page (order cards)** | `DashboardPage.jsx` | Shows order cards with payment method badge. "Partial" badge is fine — no breakdown needed on cards. |
| 18 | **Food Court / Room Orders** | `foodCourtService.js` / `roomOrdersService.js` | Use `orderLogsReport` transform but don't go through `toLedgerRow`. Their UIs don't show payment columns. |

---

## Priority Ranking

| Priority | Surface | Effort | Impact |
|---|---|---|---|
| **P0 — Done** | Order Ledger table + filter + columns + export | ✅ Shipped | Owner's primary report page |
| **P1** | Order Detail Panel (#9) | ~10 lines, LOW risk | User clicks order → sees "PARTIAL" but not the breakdown |
| **P2** | Daily Sales payment mix (#10) | ~25 lines, MEDIUM risk | Daily aggregated view lumps partial into own bucket vs splitting into Cash/UPI |
| **P3** | Cashier Settlement / Activity (#11, #12) | Backend dependency OR ~40 lines FE | Per-cashier split of partial legs |

---

## Owner Decisions Needed

1. **Order Detail Panel (#9):** Should the side drawer show stacked badges like the table, or a text list like "Cash: ₹1,000 · UPI: ₹363"?

2. **Daily Sales (#10):** For a ₹1,363 partial order (Cash ₹1,000 + UPI ₹363):
   - **Option A:** Split into existing buckets → Cash total increases by ₹1,000, UPI total increases by ₹363. "Partial" bucket disappears.
   - **Option B:** Keep "Partial" as its own bucket in payment mix (current behavior). Show legs on hover/drill.
   - **Option C:** Both — split into Cash/UPI AND show "Partial" as a cross-cut tag.

3. **Cashier Settlement (#11, #12):** Same question — should partial legs be split per cashier? This requires either:
   - Backend returns per-cashier partial_payments in the settlement API
   - OR FE does it from order-logs-report (but then needs to map cashier to each partial leg — the `partial_payments` array has `waiter_id` field, so FE CAN split)

---

*Impact Analysis by: PLANNING agent, 2026-07-29*
