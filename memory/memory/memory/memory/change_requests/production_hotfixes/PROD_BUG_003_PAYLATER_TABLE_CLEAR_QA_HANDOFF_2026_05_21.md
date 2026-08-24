# PROD-BUG-003 — PayLater Table Clear — QA Handoff — 2026-05-21

## 1. Bug Summary

| Field | Value |
|---|---|
| Bug ID | PROD-BUG-003 |
| Title | PayLater prepaid order served/settled but table/order not cleared |
| Severity | HIGH |
| Fix file | `api/socket/socketHandlers.js` |
| Fix size | ~7 lines added inside existing `isHoldClear` branch |
| Owner verified | YES — live test on preprod, 2026-05-21 |

---

## 2. What Was Broken

After a prepaid PayLater order was settled via `completePrepaidOrder()`, the order was removed from the dashboard but the **table stayed occupied** showing "NA". Staff could not reuse the table without a page refresh.

---

## 3. What Was Fixed

Inside `handleOrderDataEvent` in `socketHandlers.js`, the `isHoldClear` branch (fOS=9 on `update-order` channel) now checks if the order is actually a PayLater settle by inspecting:
- `paymentType === 'prepaid'`
- `paymentMethod === 'paylater'`
- `paymentStatus === 'sucess' || 'success'`

If all three match → table freed to `'available'`.
If they don't match → normal Hold/Park behavior, table stays `'occupied'`.

---

## 4. Test Scenarios

### Must pass (fix verification)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| T1 | PayLater dine-in settle | Place prepaid PayLater dine-in order → Ready → Serve | Order removed from dashboard, table freed to available |
| T2 | PayLater with `payment_status: "success"` | Same as T1 — backend sends correct spelling | Table freed (Bucket B + new fix) |
| T3 | PayLater with `payment_status: "sucess"` | Same as T1 — backend sends typo spelling | Table freed (original match + new fix) |
| T4 | PayLater takeaway (tableId=0) | Place prepaid PayLater takeaway → Ready → Serve | Order removed, no table action (tableId=0 skip) |

### Must not regress

| # | Scenario | Steps | Expected |
|---|---|---|---|
| R1 | Hold/Park order (fOS=9, not PayLater) | Place postpaid dine-in order → Hold/Park | Order removed from running dashboard, table stays `'occupied'` — appears on Hold tab |
| R2 | Regular prepaid settle (non-PayLater) | Place prepaid cash dine-in order → Ready → Serve → Settle | Order removed, table freed (existing `isTerminal` path, `status: 'paid'`) |
| R3 | Normal postpaid serve | Place postpaid dine-in order → Ready → Serve | Order moves to fOS=5, stays on dashboard with Bill button |
| R4 | PayLater on `update-order-paid` channel | If backend ever sends on correct channel | `isPayLaterSettle` or `isPayLaterComplete` fires (existing paths), table freed — fix is additive, doesn't interfere |

---

## 5. What Is NOT Covered by This Fix

| Item | Status | Notes |
|---|---|---|
| Polling fOS=9 skip | NOT FIXED | `useOrderPollingReconciliation.js` L194 still skips all fOS=9. If socket fix misses, PayLater order stays trapped. P2 follow-up. |
| Backend socket channel | NOT FIXED | Backend still emits on `update-order`. P1 backend follow-up. |
| PROD-BUG-001 (Auto Settle) | OUT OF SCOPE | Already closed separately. |
| PROD-BUG-002 (Settle Print Guard) | OUT OF SCOPE | Separate bug, not addressed here. |

---

## 6. Files Changed

| File | Change |
|---|---|
| `api/socket/socketHandlers.js` | Added `isPayLaterViaHold` check (~7 lines) inside `isHoldClear` branch of `handleOrderDataEvent` |

No other files changed.

---

## 7. Compilation

Clean. Only pre-existing `OrderEntry.jsx` lint warning (react-hooks/exhaustive-deps L1259).

---

## 8. Open Backend Follow-ups

| Priority | Item | Doc |
|---|---|---|
| P1 | Backend emit PayLater settle on `update-order-paid` channel | `PROD_BUG_003_BACKEND_ACTION_ITEMS_2026_05_21.md` |
| P2 | Polling fOS=9 PayLater distinction (frontend) | Same doc, noted for awareness |

---

## 9. Final Status

**`prod_bug_003_frontend_hotfix_owner_verified_backend_followup_open`**
