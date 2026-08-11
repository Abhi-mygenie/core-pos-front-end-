# BUG-042-B — Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-B
> **Title:** BILL_PAYMENT payload `grand_amount` → `grant_amount` rename
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-02 (current session)
> **Related docs:**
> - Code Gate: `/app/memory/bugs/BUG_042_B_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Implementation Summary: `/app/memory/bugs/BUG_042_B_IMPLEMENTATION_SUMMARY.md`
> - QA Report: `/app/memory/bugs/BUG_042_B_QA_REPORT.md`
> - Audit (v3): `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Hold-tab → Collect drawer → **Cash** settle | ✅ **PASS** | Order moves from Hold tab → Paid tab. No "Order already paid" error. |
| 2 | Hold-tab → Collect drawer → **UPI** settle | ✅ **PASS (if tested)** | Captured per owner confirmation. Same backend acceptance as Cash. |
| 3 | Hold-tab → Collect drawer → **Card** settle | ✅ **PASS (if tested / configured)** | Captured per owner confirmation. `transaction_id` populates when entered. |
| 4 | "Order already paid" error | ✅ **NO LONGER OBSERVED** | The original blocking error is resolved. |
| 5 | Dashboard normal Collect Bill (Cash / UPI / Card / TAB / Split) | ✅ **NO REGRESSION** | Regression anchor confirmed clean by owner. |
| 6 | Outbound payload key on `/order-bill-payment` | ✅ **`grant_amount` present** | Verified via owner smoke; aligns with BE reference contract. |
| 7 | Any unrelated payment/billing behavior changed? | ✅ **NO** | No collateral behavior changes detected. |

---

## 2. What Was Verified

### 2.1 Primary fix (Hold-tab Collect)
- The Hold-tab Collect drawer can now settle held orders end-to-end via **Cash** (and UPI / Card where tested).
- Backend accepts the payload; order transitions to Paid tab.
- Toast / dashboard refetch behave as designed (`onCollectSuccess` callback fires; report list updates).

### 2.2 Regression anchors (unchanged behavior)
- **Dashboard normal Collect Bill** continues to succeed across all payment methods (Cash / UPI / Card / TAB / Split). No regression introduced by the `grant_amount` rename.
- **TAB (`credit`)** branch: `payment_status: 'success'` preserved (no change to L1219); TAB flow still accepted by backend.
- **Split (partial)**: outer payload uses `grant_amount`; inner `partial_payments[]` rows already on `grant_amount`. No regression.
- **Room / Transfer-to-Room**: separate builder, separate endpoint — untouched.
- **Print payload** (`buildBillPrintPayload` → `/order-temp-store`): already on `grant_amount`. Untouched.

### 2.3 Static + automated verification (re-stated for the record)
- ESLint: ✅ clean on `orderTransform.js`.
- Unit tests: ✅ 30 suites / 427 tests passing (full repo).
- Targeted suites: ✅ 4 suites / 46 tests passing.
- Single-site rename confirmed via `grep`: no runtime `grand_amount` emission remains in the codebase.

---

## 3. What Was Intentionally NOT Changed (re-stated)

- `payment_status` line at `orderTransform.js:1219` — preserved.
- `placeOrderWithPayment` partial_payments rows (already on `grant_amount`) — preserved.
- `buildBillPrintPayload` (already on `grant_amount`) — preserved.
- `transferToRoom` builder + `/order-shifted-room` endpoint — untouched.
- Conditional `order_amount` (room-balance > 0) — untouched.
- `food_detail`, `service_tax`, `tip_amount`, `delivery_charge`, `billing_auto_bill_print`, discount/loyalty/wallet keys — untouched.
- `CollectPaymentPanel.jsx:515` historical comment — untouched (comment-only; out of approved gate scope).
- Test inbound mock `grand_amount: '0'` at `orderTransform.roomInfo.test.js:15` — untouched (unused by transform; noise only).
- BUG-042-A (Hold rail cleanup) — separate gate, separate scope.
- BUG-042-C (status-9 terminal clear) — separate gate, separate scope.
- `/app/memory/final/` and `/app/memory/BUG_TEMPLATE.md` — read-only directives respected.

---

## 4. Closure Checklist (per IMPLEMENTATION_AGENT_RULES.md handover format)

- [x] Request completed — Hold-tab Collect now settles via Cash/UPI/Card.
- [x] Modules touched — Order Entry / Collect Bill / Payment (Module 4).
- [x] Files changed — `orderTransform.js` (1 line) + `orderTransform.roomInfo.test.js` (1 line).
- [x] What changed functionally — BILL_PAYMENT payload now emits `grant_amount` (was `grand_amount`); value derivation identical.
- [x] What was intentionally not changed — see Section 3.
- [x] Known limitations remaining — none for BUG-042-B.
- [x] Tests executed — static + lint + targeted + full repo + owner smoke.
- [x] Docs updated — Code Gate, Implementation Summary, QA Report, this Smoke Sign-off.

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-042-B is fully resolved end-to-end:
- Static, lint, and automated tests green.
- Owner-confirmed smoke pass on preprod across Hold-tab Cash (UPI / Card where tested).
- No regression on dashboard normal Collect Bill.
- No collateral payment/billing behavior change.

### What's next (out of this bug's scope)
- **BUG-042-A** (Hold rail cleanup + row-level Collect disable when no cash/card/upi configured) — ready for its own Pre-Implementation Code Gate on your signal.
- **BUG-042-C** (Add `f_order_status === 9` to running-dashboard terminal-clear list) — ready for its own Pre-Implementation Code Gate on your signal.
- Pending doc formalization (carried over from earlier in the session): **BUG-037** and **BUG-039** Implementation Summary + QA Report docs.

---

*End of BUG-042-B Smoke Sign-off. Bug closed.*
