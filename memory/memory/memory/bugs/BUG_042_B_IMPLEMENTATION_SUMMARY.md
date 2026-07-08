# BUG-042-B — Implementation Summary

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-B
> **Title:** BILL_PAYMENT payload `grand_amount` → `grant_amount` rename
> **Implementation date:** 2026-02 (current session)
> **Gate:** `/app/memory/bugs/BUG_042_B_PRE_IMPLEMENTATION_CODE_GATE.md` (owner-approved)

---

## 1. What Changed

### 1.1 Runtime code change (1 line)
**File:** `/app/frontend/src/api/transforms/orderTransform.js`
**Line:** 1234 — inside `toAPI.collectBillExisting`

```diff
       gst_tax:                      gstTax,
       vat_tax:                      vatAmount || 0,
-      grand_amount:                 finalTotal || 0,
+      grant_amount:                 finalTotal || 0,
       // ROOM_CHECKIN_GAP3 (Stage 2, revised 2026-04-25): `order_amount` carries
```

**Effect:** The JSON body sent to `POST /api/v2/vendoremployee/order/order-bill-payment` (`API_ENDPOINTS.BILL_PAYMENT`) now contains the BE-confirmed key `grant_amount` instead of the typo `grand_amount`. Key value (`finalTotal || 0`) and all surrounding fields are unchanged.

### 1.2 Test alignment change (1 line)
**File:** `/app/frontend/src/api/transforms/__tests__/orderTransform.roomInfo.test.js`
**Line:** 59 — inside `Stage 2 — collectBillExisting order_amount emission > order_amount ABSENT when roomBalance = 0 (non-room)`

```diff
     expect('order_amount' in payload).toBe(false);
     expect(payload.payment_amount).toBe(500);
-    expect(payload.grand_amount).toBe(500);
+    expect(payload.grant_amount).toBe(500);
```

**Effect:** Existing unit test that asserted the (now-renamed) outbound payload key now matches the new key. The inbound mock object at line 15 (`grand_amount: '0'`) is **untouched** — it's stale unused noise on the API mock side and was never consumed by the transform.

---

## 2. What Was Intentionally NOT Changed

| Item | Reason |
|---|---|
| `payment_status` line at `orderTransform.js:1219` | Owner directive — no change for Cash/Card/UPI/Credit settlement. TAB branch (`'success'`) preserved. |
| `placeOrderWithPayment` `partial_payments[]` rows (L1023, L1029, L1037) | Already use `grant_amount`. Unchanged. |
| `buildBillPrintPayload` `grant_amount` (L1616) | Already correct. Unchanged. |
| `transferToRoom` builder (L1293) | Different builder, different endpoint. Out of scope. |
| Conditional `order_amount` emission (L1241) | Room-balance-only field. Unchanged. |
| Other payload fields (`food_detail`, `service_tax`, `tip_amount`, etc.) | Owner directive — no other payload changes. |
| `CollectPaymentPanel.jsx:515` historical comment ("grand_amount = food-grand only…") | Comment-only; documents 2026-04-25 historical convention. Out of approved gate scope. |
| `orderTransform.roomInfo.test.js:15` inbound mock `grand_amount: '0'` | Inbound API mock field; not read by transform. Unused noise. Out of approved gate scope. |
| BUG-042-A (Hold rail cleanup) | Separate sub-bucket, separate gate. |
| BUG-042-C (status-9 terminal clear) | Separate sub-bucket, separate gate. |
| Room / To Room / Print / Socket / LocalStorage / Bootstrap | Untouched. |
| `/app/memory/final/`, `/app/memory/BUG_TEMPLATE.md` | Read-only directives respected. |

---

## 3. Verification Performed

### 3.1 Static checks
- **`grep -n "grand_amount" orderTransform.js`** → **0 runtime emissions** remain in the file (test mock and comments excluded).
- **`grep -n "grant_amount" orderTransform.js`** → **5 runtime emissions** (was 4 pre-change; the renamed line at L1234 joins the established convention).
- **ESLint** → ✅ No new issues on `orderTransform.js`.

### 3.2 Unit tests
- **Targeted suites** (`orderTransform*`, `req3-room-bill-print*`): **4 suites, 46 tests — all passing.**
- **Full repo suite:** **30 suites, 427 tests — all passing.**
- Explicitly confirmed test `req3-room-bill-print.test.js:112` (asserts `payload.grant_amount === 676` on room bill print) still passes — proves the adjacent `grant_amount` paths were never disturbed.
- Updated test `orderTransform.roomInfo.test.js:59` (the only place that asserted the OLD outbound key) now asserts on `grant_amount` → passes.

### 3.3 Service health
- Frontend server returning `HTTP/1.1 200 OK` from `http://localhost:3000` post-edit (hot reload picked up the change cleanly).
- No backend changes required — endpoint name `BILL_PAYMENT` (`/api/v2/vendoremployee/order/order-bill-payment`) unchanged.

---

## 4. Risk Posture Post-Change

| Path | Risk | Status |
|---|---|---|
| Hold-tab Collect (Audit drawer) Cash/UPI/Card | Cannot regress — previously broken with `"Order already paid"`. Change is the targeted fix. | ✅ Expected to succeed after change. |
| Dashboard normal Collect Bill Cash/UPI/Card | LOW — `grant_amount` is the BE-confirmed key already in use on adjacent endpoints. | ✅ Expected to remain working. |
| Dashboard Collect Bill TAB (credit) | LOW — `payment_status: 'success'` branch preserved. | ✅ Untouched. |
| Dashboard Collect Bill Split (partial) | LOW — outer key renamed; inner `partial_payments[]` rows already used `grant_amount`. | ✅ Consistent. |
| Room order Collect Bill (roomBalance > 0) | LOW — both `grant_amount` and conditional `order_amount` present. | ✅ Aligned. |
| Transfer to Room | ZERO risk — different builder, different endpoint. | ✅ Untouched. |
| Auto-print bill (`/order-temp-store`) | ZERO risk — `buildBillPrintPayload` already on `grant_amount`. | ✅ Untouched. |

---

## 5. Rollback Procedure

Single-line revert at `orderTransform.js:1234`:
```diff
-      grant_amount:                 finalTotal || 0,
+      grand_amount:                 finalTotal || 0,
```
And revert test assertion at `orderTransform.roomInfo.test.js:59`:
```diff
-    expect(payload.grant_amount).toBe(500);
+    expect(payload.grand_amount).toBe(500);
```
No other rollback steps required. No DB / cache / config dependency. No supervisor restart needed (hot reload).

---

## 6. Modules Touched (per IMPLEMENTATION_AGENT_RULES.md handover format)

- **Modules touched:** Order Entry / Collect Bill / Payment (Module 4) — bill-payment payload builder.
- **Files changed:** 2
  - `/app/frontend/src/api/transforms/orderTransform.js` (1 line; runtime)
  - `/app/frontend/src/api/transforms/__tests__/orderTransform.roomInfo.test.js` (1 line; test assertion alignment)
- **What changed functionally:** The BILL_PAYMENT JSON body now sends `grant_amount` (was `grand_amount`); value derivation identical (`finalTotal || 0`). Aligns one outlier with the established convention used by split partial_payments and room bill print payloads.
- **What was intentionally not changed:** See Section 2.
- **Known limitations remaining:** None for BUG-042-B. BUG-042-A and BUG-042-C remain pending separate gate approvals.
- **Tests executed:** Targeted transform suites + full repo suite (30/30, 427/427 passing).
- **Docs updated:** This implementation summary + the QA report (`BUG_042_B_QA_REPORT.md`).

---

## 7. Next Steps

1. **User-side QA on preprod:**
   - Hold-tab Collect via Cash → assert success + order moves to Paid tab.
   - Hold-tab Collect via UPI → assert success.
   - Hold-tab Collect via Card → assert success with `transaction_id` populated.
   - Dashboard normal Collect Bill via Cash → assert no regression.
   - Dashboard normal Collect Bill via Split → assert no regression.
2. **If QA passes:** Move to BUG-042-A code gate (Hold rail cleanup + row-level Collect disable).
3. **If QA reveals a regression on dashboard normal Collect Bill:** One-line revert per Section 5 — and escalate to BE team for clarification on whether `/order-bill-payment` reads `grant_amount` on every path or only on PayLater-stored orders.

---

*End of BUG-042-B Implementation Summary.*
