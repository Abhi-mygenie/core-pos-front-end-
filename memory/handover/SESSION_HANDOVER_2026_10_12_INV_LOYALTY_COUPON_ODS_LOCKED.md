# SESSION HANDOVER — 2026-10-12 — INV-LOYALTY-COUPON-SCAN ODs LOCKED

## 1. Summary

**Role:** INVESTIGATION (staying at gate — no code)
**Item:** INV-LOYALTY-COUPON-SCAN-OCT12
**Outcome:** ODs locked. GAP-3 (socket validation) pending before implementation.

---

## 2. Locked Decisions

| Decision | Value | Impact |
|---|---|---|
| OD-INV-01 | A — remove CR-409 `initialCoupon` pre-load entirely | CPP E-2/E-3 to be rolled back; E-1 (fromAPI.order coupon fields) kept for other consumers |
| OD-INV-02 | B — pre-tick loyalty when `redeemed = true` regardless of `redeemed_amount` | Mount effect fires on any `redeemed=true`, even when ₹0 |

---

## 3. Pending — GAP-3 Socket Validation

**Question:** When a scan & order is edited, POS receives a socket `update-order` or `update-order-status` event. Does the socket payload carry `loyalty_info`?

**Why critical:** If socket update DOES NOT carry `loyalty_info`, then:
1. Order arrives via list API → `orderData.loyaltyRedeemed = true` ✓
2. Cashier edits order → socket fires → `fromAPI.order(socketPayload)` runs → `loyaltyRedeemed = false` (overwritten) ✗
3. CPP opens → loyalty NOT pre-ticked despite customer having redeemed

**Investigation needed:** Probe `employee-orders-list` vs socket payload shape for an edited web order.

---

## 4. CRs to Register (when GAP-3 validated)

| CR | Title | Scope |
|---|---|---|
| New | Loyalty Pre-tick from Scan & Order (GAP-1) | `orderTransform.js` + CPP + OrderEntry |
| New | Remove CR-409 initialCoupon Pre-load (OD-INV-01=A) | CPP L333-342 + OrderEntry `initialCoupon` prop |

Both touch same 3 R5 files — joint gate cycle recommended.

---

## 5. CR-409 Impact of OD-INV-01=A

CR-409 has 3 edits:
- **E-1** (`orderTransform.js` coupon fields) → KEEP (feeds AggregatorOrderPopOut, OrderDetailSheet, orderLedgerService)
- **E-2** (CPP `initialCoupon` prop + mount effect) → REMOVE
- **E-3** (OrderEntry prop pass) → REMOVE
- Test (`orderTransform.cr409.test.jsx`) → KEEP (tests E-1 only)
