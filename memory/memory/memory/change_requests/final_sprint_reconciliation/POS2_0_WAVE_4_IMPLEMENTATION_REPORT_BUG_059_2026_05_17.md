# POS2.0 Wave 4 — BUG-059 Implementation Report — 2026-05-17

## 1. Status
**APPLIED** — exactly per `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_REVISED_2026_05_17.md`
(Owner approval: "A" on revised plan with no-permission-gate + audit-only payload).

---

## 2. Files modified

| File | Change | Insertions | Deletions |
|------|--------|-----------:|----------:|
| `frontend/src/components/reports/OrderTable.jsx` | `Printer` import; column `w-44`→`w-56`; `onPrintBill` destructure; Paid branch early-return dropped; unconditional Print pill added | +30 | -3 |
| `frontend/src/pages/AllOrdersReportPage.jsx` | imports (raw `api` + `API_ENDPOINTS` + `orderFromAPI`); `printerAgents` from `useRestaurant()`; new `handlePrintBillFromAudit` callback hitting raw `SINGLE_ORDER_NEW` endpoint + `orderFromAPI.order` transform; wire `onPrintBill` into `actionsConfig` | +52 | -2 |

### 2.1 Mid-implementation corrective (post-smoke)

First implementation used `getSingleOrderNew` service → returned `reportFromAPI.singleOrderNew` shape (report drill-down transform) which **strips `rawOrderDetails`**. Print payload builder then bailed with "details unavailable" toast and `order-temp-store` never fired.

**Fix** (mirrors `CollectBillPanelDrawer.jsx` L110-114 documented pattern):
- Hit `API_ENDPOINTS.SINGLE_ORDER_NEW` raw endpoint directly via `api.post(...)`
- Unwrap nested response (`response.data.orders.order_details_order || ... || response.data`)
- Transform via `orderFromAPI.order` (which produces `rawOrderDetails`)
- Then call `printOrder(...)` as before

Verified post-fix with owner payload sample (Order #000059, takeaway, ₹268):
- `payment_amount: 268`, `grant_amount: 268` (PRINT-002 non-room parity)
- `rtype: "TB"`, `payment_status: "paid"`, `payment_method: "cash"` (Mini-CR Addendum)
- All room fields zero, all delivery fields null, GST math reconciles (5% × ₹150 = ₹7.5)

---

## 3. Owner directives honored

| Directive (2026-05-17) | Where enforced |
|---|---|
| Add a 3rd "Print" pill alongside Change + Unpaid | `OrderTable.jsx` Paid branch §3.4 of diff preview |
| NO permission gate | No `canPrintBill` flag anywhere; pill renders unconditionally on eligible Paid rows |
| Payload values come ONLY from fetched single-order API record | `handlePrintBillFromAudit` passes `serviceChargePercentage=0` and empty `overrides={}`; default branch of `buildBillPrintPayload` reads from `order` directly |
| No print on Cancelled tab | Tab-level branching (Cancelled tab never matches `tabId === 'paid'`) |
| Paid-only | Hold/Cancelled/Running/All branches unchanged |

`printerAgents` is passed because it's the WebSocket routing list, NOT a payload money value.

---

## 4. Validation

| Gate | Result |
|------|--------|
| ESLint `OrderTable.jsx` | ✅ No issues |
| ESLint `AllOrdersReportPage.jsx` | ✅ No issues |
| `yarn test --watchAll=false` | ✅ **498/498 passed**, 34 suites, 6.174 s |
| Webpack hot-reload | ✅ Dev server compiles green |

No new Jest tests added (per revised plan); existing `OrderTable.holdDisable.test.jsx` continues to pass (Hold branch unchanged).

---

## 5. Existing row-eligibility filter (no new logic added)

Owner exclusions enforced by `isOrderEligibleForRowActions` at `OrderTable.jsx` L245-262:

| Owner Spec | Filter | ✓ |
|---|---|---|
| No cancelled rows | Cancelled tab does not match Paid branch | ✅ |
| No Room / SRM rows | `orderIn === 'RM' \|\| 'SRM'` → false | ✅ |
| No aggregator rows | `['zomato','swiggy'].includes(...)` → false | ✅ |
| No `transferToRoom` / TAB / online | `PAID_ACTIONS_ALLOWED_METHODS = cash/card/upi only` | ✅ |
| Missing/placeholder rows | `if (order._isMissing) return false` | ✅ |

---

## 6. Integration with already-landed work

- **BUG-050** (manual reprint parity): default-branch fallbacks for `discount`/`loyalty`/`wallet`/`coupon` apply automatically — audit print uses default branch.
- **PRINT-002 Corrective** (`payment_amount` vs `grant_amount` split): audit print enters default branch with food-only `order.amount`. Room orders excluded by row eligibility, so `payment_amount === grant_amount` always for audit prints.
- **Mini-CR Addendum** (`rtype`, `payment_status`, `payment_method`): emitted automatically by the default branch.

---

## 7. Owner smoke checklist (post-deploy)

1. Audit Report → **Paid tab** → Cash/Card/UPI row → orange "Print" pill visible on every row → click → bill prints → totals match the persisted single-order record.
2. Audit Report → **Cancelled tab** → no Print pill anywhere.
3. Audit Report → **Hold tab** → no Print pill (Collect remains).
4. **Aggregator** (Zomato/Swiggy) row on Paid tab → no Print pill.
5. **Room/SRM** row on Paid tab → no Print pill (filtered).
6. **`transferToRoom`/TAB/online** row on Paid tab → no Print pill (filtered).
7. **Date outside 2-day window** → Print pill **enabled**; Change/Unpaid pills remain disabled with their existing tooltip.
8. **Operator with no `update_payment` / `order_unpaid` perms** → sees just the Print pill on Paid rows (Q1 default — print-only operator path).

---

## 8. Risks / Notes

- Column width `w-56` fits 3 pills comfortably at desktop widths (≥1280 px). If tablet/portrait usage surfaces wrap issues, easy 1-char swap to `w-52` or drop the `<span>Print</span>` label for icon-only.
- `getSingleOrderNew` adds one API roundtrip per Print click — same pattern OrderDetailSheet uses; no new caching layer added.

---

## 9. Wave 4 status

| Item | Status |
|------|--------|
| BUG-050 (manual reprint parity) | ✅ APPLIED |
| BUG-057 (Prepaid Print Bill gate) | ✅ APPLIED |
| Print Payload Mini-CR Addendum | ✅ APPLIED |
| Print Path Unification Corrective (PRINT-002) | ✅ APPLIED |
| BUG-059 (Audit Report Print Bill on Paid tab) | ✅ APPLIED (this report) |

**Wave 4 — COMPLETE pending owner smoke.**

---

*— End of Wave 4 BUG-059 Implementation Report —*
