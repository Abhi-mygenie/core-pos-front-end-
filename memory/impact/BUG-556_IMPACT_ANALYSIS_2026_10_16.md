# Impact Analysis — BUG-556
## Auto Bill: payment_status prints "Unpaid" — stale order context at print time

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Date:** 2026-10-16
**Code Reality:** PARTIAL — auto-bill infrastructure exists; the specific gap is at `orderTransform.js:2225–2226`
**Conflict Pre-Check:** BUG-536 touched `orderTransform.js` (L2011-2012, manual SC-GST path). Different lines — CLEAN. No other open items on `orderTransform.js`.

---

## 1. Root Cause (HIGH confidence)

**File:** `src/api/transforms/orderTransform.js` · **Lines:** 2225–2226

```js
// PRINT-MINI-CR Addendum: Sourced straight from order context — no override-branch handling.
// Collect Bill panel preview prints 'unpaid' / '' (truthful state at preview time);
// dashboard / order-entry / audit reprint of a paid order prints the real stored values.
payment_status: order.paymentStatus || '',   // ← L2225: reads stale React context
payment_method: order.paymentMethod || '',   // ← L2226: reads stale React context
```

The comment says it explicitly: when Collect Bill (auto-bill) fires, `payment_status` is **'unpaid' / ''** because the order object in React context has not yet been updated — the backend hasn't processed the payment and pushed the socket update back.

**Data flow:**
```
User pays in CollectBillPanelDrawer / OrderEntry
  → printOrder(orderId, 'bill', ..., order, ..., { autoBill: true, ... })
  → buildBillPrintPayload(order, sc%, overrides)
      → payment_status: order.paymentStatus || ''   ← 'unpaid' (stale)
      → payment_method: order.paymentMethod || ''   ← '' (empty)
  → POST /order-temp-store with payment_status='unpaid'
  → Bill prints: "Unpaid"
```

Meanwhile, payment API call resolves → socket fires → order context updates to 'paid'. But this happens AFTER the print.

---

## 2. Break Point

`orderTransform.js:2225` — `payment_status` and `payment_method` are read from `order` (React context snapshot). The `buildBillPrintPayload` function has **two paths** (L1883: `hasFinancialOverrides`):
- **Collect Bill path** (hasFinancialOverrides=true): overrides contain GST, totals, discounts — but **NOT payment_status or payment_method**
- **Manual print path** (hasFinancialOverrides=false): uses backend-stored values (already resolved) — correct

The gap: the Collect Bill / auto-bill path doesn't pass `payment_status` and `payment_method` in overrides, so L2225-2226 falls through to the stale context value.

---

## 3. Affected Files

| File | Lines | Change needed |
|---|---|---|
| `src/api/transforms/orderTransform.js` | 2225–2226 | Accept `overrides.paymentStatus` + `overrides.paymentMethod`; use override if present |
| `src/components/reports/CollectBillPanelDrawer.jsx` | L177 area | Pass `paymentStatus: 'paid'`, `paymentMethod: method` in overrides to printOrder |
| `src/components/order-entry/OrderEntry.jsx` | near autoBill call | Same — pass resolved payment method when auto-bill fires |

**OD-556-01 (aggregator):** `aggregatorAutoBill` in profileTransform + aggregatorConfigService. Aggregator auto-bill fires at Acknowledged/Ready stage via a different path. Needs separate trace in implementation to confirm same gap applies.

---

## 4. Risk Classification

**Risk: MEDIUM**
- Touches print payload construction — bill format, not financial calculation
- No order total, GST, discount, or settlement logic change
- Not R5 hotspot (orderTransform.js IS NOT in R5 list)
- Affects: bill print display only — no money moves differently

**Fast Lane:** NOT eligible — 3 files, MEDIUM risk

---

## 5. Conflict Pre-Check

| Item | Lines | Status | Interaction |
|---|---|---|---|
| BUG-536 | orderTransform.js L2011-2012 | GATE_5B_QA_CONDITIONAL_PASS | Different lines — **CLEAN** |
| BUG-168 v3 | orderTransform.js L1879–1883 | GATE_5B_QA_PASSED | Defines hasFinancialOverrides path — our fix is ADDITIVE within that path. CLEAN. |

---

## 6. Verification Matrix

| # | Check | Method | Expected |
|---|---|---|---|
| V1 | Auto-bill fires → `payment_status = 'paid'` in payload | Network tab POST /order-temp-store after paying | `payment_status: 'paid'` |
| V2 | Auto-bill `payment_method` = actual method (cash/card/UPI) | Same network tab | `payment_method: 'cash'` (or chosen method) |
| V3 | Manual reprint still uses backend values | OrderCard print → network tab | `payment_status` from stored order |
| V4 | Aggregator auto-bill (if gap confirmed in OD-556-01) | Aggregator order at stage trigger | Same fix applies |
| V5 | Compile clean | webpack | 1 pre-existing warning, 0 new |

---

## 7. Owner Decisions

**OD-556-01 — LOCKED 2026-10-16**
Aggregator auto-bill scope: **DEFERRED** — owner will confirm separately.
Current scope: **in-house auto-bill only.**

**Fix approach LOCKED:**
Pass `payment_status: 'paid'` and `payment_method: paymentData.method` as overrides directly from the caller (CollectBillPanelDrawer `handlePaymentComplete`) at payment submission time. Zero socket dependency. No timing issue.

---

## Gate 2 Status: CLOSED — 2026-10-16
All ODs resolved. No open questions block implementation. Gate 3 plan can proceed.

---

## Artifacts
- IA: `/app/memory/impact/BUG-556_IMPACT_ANALYSIS_2026_10_16.md`
- Intake: `change_requests/BUG-556_AUTO_BILL_PAYMENT_MODE_UNPAID_INTAKE.md`
