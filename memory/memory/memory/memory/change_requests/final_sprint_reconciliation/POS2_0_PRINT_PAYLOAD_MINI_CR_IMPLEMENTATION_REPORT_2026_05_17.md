# Print Payload Mini-CR — Implementation Report — 2026-05-17

## 1. Summary

Print-payload mini-CR raised by owner during Wave 4 implemented and verified.

- 3 files changed, +46 / -19 lines net.
- ESLint clean, full Jest suite **34/34 suites — 496/496 tests pass**, webpack compiled successfully, dev server HTTP 200.
- Wave 4 BUG-059 is now unblocked and will inherit the corrected room print behavior.

## 2. What Was Fixed

### Fix A — `grant_amount` / `payment_amount` unification for room orders
- **Before:** Print payload computed `roomFinalPaymentAmount = finalPaymentAmount + associatedTotal + roomBalance` inside `buildBillPrintPayload`. CollectPaymentPanel passed food-only `finalTotal` as `paymentAmount`. When `order.associatedOrders` or `order.roomInfo.balancePayment` were stale/late, the recompute collapsed to food-only (e.g. 2,676 instead of 11,510 for the owner's order #102).
- **After:** Single source of truth — CollectPaymentPanel passes `effectiveTotal` (= food + associated + room balance) as `paymentAmount`. Transform writes it through unchanged. Default branch (dashboard re-print, no override) still trusts `order.amount` which is already room-inclusive per Task 4 `computeRoomCardAmount`. The in-transform recompute is removed.

### Fix B — `rtype` key on the print payload
- New backend-requested field added to the `buildBillPrintPayload` return:
  ```js
  rtype: order.isRoom ? 'RM' : 'TB',
  ```
- Binary as confirmed: room → `"RM"`, everything else (dine-in / walk-in / takeaway / delivery / etc.) → `"TB"`.
- Emitted ONLY on the temp-store print payload (`order-temp-store`). Other endpoints (`order-bill-payment`, place-order, update-order, cancel) untouched.

## 3. Files Changed

| File | +Lines | -Lines | Summary |
|---|---:|---:|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 9 | 1 | `handlePrintBill` now sends `effectiveTotal` (was `finalTotal`). Comment block added documenting the unification. |
| `frontend/src/api/transforms/orderTransform.js` | 36 | 18 | Updated REQ3 comment to describe the new contract. Deleted the room-add-back recompute (`roomFinalPaymentAmount` const). `payment_amount` / `grant_amount` now use `finalPaymentAmount` directly. Added `rtype: order.isRoom ? 'RM' : 'TB'` to the print payload. |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | 20 | 6 | Updated file-level docstring. Re-baselined the "override branch" test to the new contract (caller passes full amount). Added `rtype` assertions to all 4 print-payload tests (non-room + 3 room cases). |

`git diff --stat`:
```
 .../__tests__/req3-room-bill-print.test.js         | 20 +++++++++---
 frontend/src/api/transforms/orderTransform.js      | 36 ++++++++++++++--------
 .../components/order-entry/CollectPaymentPanel.jsx |  9 +++++-
 3 files changed, 46 insertions(+), 19 deletions(-)
```

## 4. Validation Results

| Check | Result |
|---|---|
| ESLint `orderTransform.js` | ✅ No issues |
| ESLint `CollectPaymentPanel.jsx` | ✅ No issues |
| Full Jest suite | ✅ 34/34 suites, 496/496 tests pass (incl. re-baselined REQ3 test + 4 new `rtype` assertions) |
| Webpack compile | ✅ Compiled successfully |
| Dev server (supervisor) | ✅ HTTP 200 local |
| BUG-050 cascade preserved | ✅ Discount injection at L1505-1520 + L1690 untouched |
| BUG-057 permission gate preserved | ✅ OrderEntry L1833 untouched |

## 5. Expected On-The-Wire Behavior

| Scenario | Before | After |
|---|---|---|
| Room order #102 — Print Bill from Collect Bill panel | `grant_amount: 2676` (buggy collapse) or `11510` (when state was fresh) | **`grant_amount: 11510`** (deterministic single source) |
| Room order #102 — Print Bill via dashboard OrderCard | `grant_amount: order.amount` (room-inclusive) | **same — `grant_amount: order.amount`** (unchanged) |
| Dine-in T1 (food only ₹200) — Print Bill | `grant_amount: 200` | **`grant_amount: 200`** (bit-identical) |
| Any order — `rtype` key | absent | **emitted: `"RM"` for room, `"TB"` otherwise** |
| `order-bill-payment` payload `grant_amount` | already correct (11,510 for #102) | **unchanged** |

## 6. Owner Smoke Plan

1. Login → open **Room #102** (owner@18march.com).
2. Open Collect Bill panel → click **Print Bill** → DevTools → Network → inspect `POST /order-temp-store` request body.
   - Expect: `grant_amount: 11510`, `payment_amount: 11510`, `rtype: "RM"`.
3. Open any **dine-in / walk-in** order → Print Bill → inspect payload.
   - Expect: `grant_amount` = bill total, `rtype: "TB"`. All other numbers identical to today.
4. Open Collect Bill on the same Room #102 → click **Checkout** → inspect `POST /order-bill-payment` body.
   - Expect: `grant_amount: 11510` (unchanged from today).

## 7. Repo State

| Item | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Base commit | `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a` |
| Wave 4 BUG-050 | ✅ landed |
| Wave 4 BUG-057 | ✅ landed |
| Print Payload Mini-CR | ✅ landed (this report) |
| Wave 4 BUG-059 | ⏸ paused, diff preview ready (will resume now) |
| Commit allowed | No |

## 8. Next Action

Resume Wave 4 BUG-059 (Audit Report Print Bill on Paid tab). The diff preview at `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_2026_05_17.md` is still valid — the `handlePrintBillFromAudit` handler calls `printOrder(orderId, 'bill', null, order, ...)` (default branch, no overrides), which now writes through `finalPaymentAmount = order.amount` (room-inclusive) and the new `rtype` automatically.

Awaiting owner go-ahead on the BUG-059 diff approval (Gate 7).

---

*— End of Print Payload Mini-CR Implementation Report —*
