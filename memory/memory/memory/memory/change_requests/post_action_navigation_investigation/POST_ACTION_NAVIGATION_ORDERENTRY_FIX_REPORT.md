# Post-Action Navigation OrderEntry — Fix Report

> **CR:** POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026)
> **Date:** 2026-01-16
> **Status:** ✅ **IMPLEMENTED** (pending owner runtime smoke)
> **No commits. No backend change. No payload change. No card-level / dashboard change. No `localStorage` key change.**

---

## 1. Summary

Wired the existing `mygenie_stay_on_order_after_bill` toggle into the eight previously-hardcoded order-ending success paths inside `OrderEntry.jsx`. Added a single local helper `navigateAfterOrderAction()` that branches on the toggle and routes through the **same** parent surfaces already used by Place+Pay (Scenario 2) and Collect Bill (Scenario 1):

- **OFF (default):** `onClose()` → Dashboard (preserves today's behaviour for 7 of 8 callsites).
- **ON:** `onCollectBillStayOnOrder()` → parent bumps `orderEntryResetNonce` → React remounts `<OrderEntry/>` via its `key` prop → all internal `useState` resets to constructor defaults.

For Transfer-to-Room (Scenario 3) the prior hardcoded manual reset block (9 setter calls including the Bucket D1-Cap `setDeliveryCharge(0)` line) is deleted; both navigation paths reset every one of those fields as a strict superset.

Net envelope: **1 file edited, +43 / −18 LoC** (1 helper definition + 8 mechanical callsite replacements + deletion of 1 manual reset block).

---

## 2. Files Changed

| Path | Op | LoC | Surface |
|---|---|---|---|
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | **EDIT** | +43 / −18 | 1 helper (`navigateAfterOrderAction`) + 8 callsite replacements + Transfer-to-Room manual reset deletion |

### 2.1 Explicitly verified untouched

| Path | `git diff` |
|---|---|
| `frontend/src/pages/DashboardPage.jsx` | **empty** ✅ |
| `frontend/src/components/cards/OrderCard.jsx` | empty ✅ |
| `frontend/src/components/cards/TableCard.jsx` | empty ✅ |
| `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | empty ✅ |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | empty ✅ |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | empty ✅ |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | empty ✅ |
| `frontend/src/utils/orderEntryPrefs.js` | empty ✅ |
| `frontend/src/api/transforms/orderTransform.js` | empty ✅ |
| `frontend/src/api/transforms/tableTransform.js` | empty ✅ |
| `frontend/src/api/socket/*` | empty ✅ |
| `frontend/src/contexts/*` | empty ✅ |
| `frontend/src/hooks/useOrderPollingReconciliation.js` | empty ✅ |
| `frontend/src/pages/StatusConfigPage.jsx` | empty ✅ |
| Backend / API services / payload builders | empty ✅ |

`git status --porcelain frontend/src/` returns exactly **one** entry: `M frontend/src/components/order-entry/OrderEntry.jsx`.

---

## 3. Helper Implemented

Inserted at `OrderEntry.jsx:737-755` (immediately before `handlePlaceOrder`):

```js
// CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): single internal helper
// that routes every OrderEntry-scoped success-path callsite through the
// existing `mygenie_stay_on_order_after_bill` toggle.
//   - ON  → call `onCollectBillStayOnOrder()` (parent bumps reset-nonce,
//           OrderEntry remounts via `key`, internal state resets to
//           constructor defaults — same pattern shipped under CR-008 D1).
//   - OFF → call `onClose()` (today's redirect-to-dashboard via parent's
//           `handleOrderEntryClose`).
// Helper is a local closure: it closes over the `onClose` and
// `onCollectBillStayOnOrder` props, so card-level handlers in
// DashboardPage.jsx (Cancel Order from card, Mark Ready/Served, etc.) are
// structurally incapable of invoking it. Owner scope clarification
// 2026-01-16: this CR applies ONLY to actions initiated inside OrderEntry.
const navigateAfterOrderAction = () => {
  if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
    onCollectBillStayOnOrder();
  } else {
    onClose();
  }
};
```

Properties:

- **Local closure** inside the `OrderEntry` functional component — closes over `onClose` and `onCollectBillStayOnOrder` props. Not exported. Not passed up.
- **Reuses existing imports**: `getStayOnOrderAfterBill` was already imported at the top of the file (line 16) under CR-008 D1.
- **Reuses existing parent handler**: `onCollectBillStayOnOrder` is already wired by `DashboardPage.jsx:1664` and was already used at L1538 and L1659 under CR-008 D1. No DashboardPage change.
- **Same defensive pattern** as L1536-1542 and L1657-1663: `typeof === 'function'` guard before calling the optional prop; falls back to `onClose()` if the parent ever stops wiring the callback.

---

## 4. Exact OrderEntry Callsites Changed

All in `/app/frontend/src/components/order-entry/OrderEntry.jsx`. Line numbers below are **post-edit**.

| # | Action | Function | Pre-edit line | Post-edit line | Pre-edit code | Post-edit code | Success-only? |
|---|---|---|---|---|---|---|---|
| 1 | Place Order (no pay) | `handlePlaceOrder` | 886 | **907** | `onClose();` | `navigateAfterOrderAction();` | ✅ Inside post-engage success branch; `apiFailed` already caught above |
| 2 | Update Order | `handlePlaceOrder` (update branch) | 891 | **912** | `onClose();` | `navigateAfterOrderAction();` | ✅ Inside `if (apiFailed) return;` guard at L809 |
| 3 | Transfer Food (item) | `handleTransfer` | 927 | **948** | `onClose();` | `navigateAfterOrderAction();` | ✅ Inside post-engage success path; `.catch` shows toast and does not navigate |
| 4 | Merge Tables | `handleMerge` | 953 | **974** | `onClose();` | `navigateAfterOrderAction();` | ✅ Same pattern as #3 |
| 5 | Shift Table | `handleShift` | 976 | **997** | `onClose();` | `navigateAfterOrderAction();` | ✅ Same pattern |
| 6 | Cancel Item | `handleCancelFood` | 1006 | **1027** | `onClose();` | `navigateAfterOrderAction();` | ✅ `.catch` sets `setIsPlacingOrder(false)` and short-circuits |
| 7 | Cancel Order | `handleCancelOrder` | 1034 | **1055** | `onClose();` | `navigateAfterOrderAction();` | ✅ `.catch` shows toast and `setIsPlacingOrder(false)` |
| 8 | **Transfer to Room** | Scenario 3 in `onPaymentComplete` | 1428-1443 | **1450-1471** | 9-line hardcoded manual reset block | `navigateAfterOrderAction();` | ✅ Branch runs only after successful `await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` |

### 4.1 Pre-existing toggle-wired branches — left unchanged

| # | Action | Line | Status |
|---|---|---|---|
| 9 | Place + Pay (Scenario 2) | 1556-1563 (was L1536-1542) | **Untouched** — already uses the same inline conditional |
| 10 | Collect Bill on existing order (Scenario 1) | 1677-1684 (was L1657-1663) | **Untouched** — already uses the same inline conditional |

The two pre-existing toggle-wired branches were intentionally left in their inline-conditional form. They could be mechanically routed through the helper (semantically identical), but the strict-scope rule "preserve exact behavior for already-wired branches" and the no-refactor guardrail keep them verbatim. Cosmetic unification deferred.

### 4.2 grep verification

```
$ grep -n "navigateAfterOrderAction\|onClose();" OrderEntry.jsx
750:  const navigateAfterOrderAction = () => {
754:      onClose();                    ← inside helper (OFF branch)
907:        navigateAfterOrderAction(); ← Place Order
912:      navigateAfterOrderAction();   ← Update Order
948:    navigateAfterOrderAction();     ← Transfer Food
974:    navigateAfterOrderAction();     ← Merge Tables
997:    navigateAfterOrderAction();     ← Shift Table
1027:    navigateAfterOrderAction();    ← Cancel Item
1055:    navigateAfterOrderAction();    ← Cancel Order
1468:                    navigateAfterOrderAction();  ← Transfer to Room (Scenario 3)
1566:                      onClose();  ← Place + Pay OFF branch (UNCHANGED, already toggle-wired)
1687:                      onClose();  ← Collect Bill OFF branch (UNCHANGED, already toggle-wired)
```

Exactly 8 helper invocations for the 8 in-scope actions. Two remaining `onClose();` calls are the OFF branches of the pre-existing toggle-wired Scenarios 1 and 2, preserved verbatim per strict scope.

---

## 5. Card / Dashboard Actions — Confirmed Untouched

Verified via `git diff` and grep:

| Surface | File | Change |
|---|---|---|
| Card-level Cancel Order (CancelOrderModal flow) | `DashboardPage.jsx:handleCancelOrder` L1206-1208, `handleCancelOrderConfirm` L1211-1229 | **None** — opens modal, fires API, no nav step. Cashier stays on Dashboard regardless of toggle. |
| Card-level Cancel Order via Scan/Web popup Reject | `DashboardPage.jsx:handleCancelOrderFromCard` L1403 | **None** — routes into same modal as above. |
| Card-level Mark Ready | `DashboardPage.jsx:handleMarkReady` L1349-1359 | **None** — fires `updateOrderStatus('ready')`, no nav step. |
| Card-level Mark Served (regular + prepaid) | `DashboardPage.jsx:handleMarkServed` L1362-1382 | **None** — fires API + prepaid-settle cleanup, no nav step. |
| Item-level Ready/Serve from OrderCard | `DashboardPage.jsx:handleItemStatusChange` L1385+ | **None** — per-item PUT, no nav step. |
| Card-level Bill Click (entry into OrderEntry) | `DashboardPage.jsx:handleBillClick` L1335-1338 | **None** — entry behaviour unchanged; OE-exit governed by the now-wired Collect Bill branch. |
| Card-level Food Transfer initiation | `DashboardPage.jsx:handleFoodTransfer` L1341-1346 | **None** — entry behaviour unchanged. |
| Scan/Web popup Accept | `DashboardPage.jsx:handleConfirmOrder` L1190 | **None** — opens OE in YTC flow. |
| Scan/Web popup Reject / View | `ScanOrderPopOut.jsx` + L1403 | **None**. |
| Snooze / Unsnooze quick actions | Card components | **None** — local state flip only. |
| Card-level Transfer-to-Room / Merge / Shift / per-item Cancel | n/a | **Do not exist** — `ORDER_SHIFTED_ROOM`, `MERGE_ORDER`, `ORDER_TABLE_SWITCH`, `CANCEL_ITEM` are each invoked **only** from inside `OrderEntry.jsx` (1 hit each, verified via grep). |

The helper's closure-only design makes it structurally impossible for card-level handlers to reach it (they don't render OrderEntry and don't have access to `onClose` / `onCollectBillStayOnOrder` props inside its scope).

---

## 6. Transfer-to-Room Reset Block — Result

### 6.1 Before (deleted block at old L1433-1443, 11 lines)

```js
// Prepaid cleanup — stay on order screen
setCartItems([]);
setShowPaymentPanel(false);
setPlacedOrderId(null);
setOrderFinancials({ amount: 0, subtotalAmount: 0, subtotalBeforeTax: 0, deliveryCharge: 0 });
// CR-008 / Bucket D1-Cap (May-2026): reset local delivery charge on clear.
setDeliveryCharge(0);
setOrderNotes([]);
setCustomer({ name: '', phone: '' });
if (onSelectTable) onSelectTable(null);
if (onOrderTypeChange) onOrderTypeChange('walkIn');
```

### 6.2 After (new L1450-1471)

```js
// CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): replaced the prior
// hardcoded manual reset block ("Prepaid cleanup — stay on order screen"
// with 9 setter calls including setCartItems / setShowPaymentPanel /
// setPlacedOrderId / setOrderFinancials / setDeliveryCharge / setOrderNotes
// / setCustomer / onSelectTable(null) / onOrderTypeChange). Both navigation
// paths (onClose unmount, or onCollectBillStayOnOrder remount-via-key) reset
// every one of those fields to constructor defaults — strictly a superset
// of the manual list. Behaviour now follows the same toggle as Place+Pay /
// Collect Bill. Toggle OFF → Dashboard via onClose(). Toggle ON → stay on
// OE with fresh walk-in cart via parent remount. No transferToRoom payload
// change, no room billing change.
navigateAfterOrderAction();
```

### 6.3 Why the deletion is safe

| Path | Mechanism | Coverage vs. deleted block |
|---|---|---|
| Toggle OFF → `onClose()` | Parent's `handleOrderEntryClose` sets `orderEntryTable=null` + `orderEntryType=null`; conditional render at `DashboardPage.jsx:1664` unmounts the entire `<OrderEntry/>` subtree. All `useState` is GC'd. | Strict superset — every field the manual block was resetting (cart, payment panel, placed-order-id, financials, delivery charge, notes, customer, table, order type) plus several it wasn't (tip, discounts, walkInTableName, addresses, selectedAddress, splitBill modal state). |
| Toggle ON → `onCollectBillStayOnOrder()` | Parent bumps `orderEntryResetNonce` (state at `DashboardPage.jsx:1312`) which is the `key` prop on `<OrderEntry/>` (L1664). React unmounts + remounts. Internal state recreates at constructor defaults. Parent also resets `orderEntryTable=null`, `orderEntryType='walkIn'`, `initialShowPayment=false`, `initialTransferItem=null`. | Strict superset — same as above. |

The constructor default for `deliveryCharge` state was already `0` (verified — the Bucket D1-Cap reset was therefore a no-op when reached via unmount/remount). Behaviour parity preserved.

### 6.4 Out-of-scope guarantees

- **`orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId)`** — unchanged. Payload byte-identical.
- **`api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)`** — unchanged.
- **Room-billing fields** (VAT, service charge, tip, delivery charge, room split) computed in `CollectPaymentPanel.jsx` — untouched.
- **Card-level Transfer-to-Room** — does not exist; no risk of secondary touch.

---

## 7. Strict-Rules Compliance

| Rule | Status |
|---|---|
| No commits | ✅ Working tree only — `git status` shows only `M OrderEntry.jsx` |
| No backend changes | ✅ |
| No payload builder changes (`orderToAPI.*`, `tableToAPI.*`) | ✅ |
| No `CollectPaymentPanel.jsx` change | ✅ `git diff` empty |
| No socket handler / order polling change | ✅ |
| No dashboard channel/status logic change | ✅ |
| No card-level quick-action change | ✅ |
| No VAT / service charge / tip / delivery calculation change | ✅ |
| No room-billing payload change | ✅ |
| No printer / KOT change | ✅ |
| No CRM change | ✅ |
| `localStorage` key unchanged (`mygenie_stay_on_order_after_bill`) | ✅ |
| `DashboardPage.jsx` untouched | ✅ `git diff` empty |
| Already-toggle-wired Pay branches behaviorally unchanged | ✅ L1566 / L1687 onClose() preserved verbatim |
| Failure paths still stay on current screen | ✅ All `apiFailed` short-circuits + `.catch` branches preserved verbatim; helper is downstream of the success gate |

---

## 8. QA / Check Results

### 8.1 Static checks in this session

| Check | Tool | Result |
|---|---|---|
| ESLint on `OrderEntry.jsx` | `mcp_lint_javascript` | ✅ **No issues found** |
| Webpack hot-reload compile | supervisor frontend logs | ✅ `Compiled successfully` after every save |
| `git status --short frontend/src/` | git | ✅ Exactly 1 entry: `M OrderEntry.jsx` |
| `git diff --stat` | git | ✅ 1 file, +43/−18 |
| Helper call count | grep | ✅ 8 in-scope invocations + 1 helper definition + 2 untouched onClose() (Scenarios 1 & 2 OFF branches) |
| Untouched callsites verification | grep | ✅ `onClose();` retained ONLY at L1566 (Place+Pay OFF) and L1687 (Collect Bill OFF) — the two pre-existing toggle-wired branches |

### 8.2 Manual / runtime QA pending owner

Run on awake backend.

**A. In-scope OrderEntry actions (toggle ON / OFF):**

| # | Scenario | Toggle | Expected |
|---|---|---|---|
| QA-A1 | Place Order (no pay) success | ON | Stay on OE, walk-in fresh cart |
| QA-A2 | Place Order (no pay) success | OFF | Redirect to Dashboard |
| QA-A3 | Update Order success | ON / OFF | Stay-on-OE / Dashboard |
| QA-A4 | Transfer Food (item) success | ON / OFF | Same pattern |
| QA-A5 | Merge Tables success | ON / OFF | Same pattern |
| QA-A6 | Shift Table success | ON / OFF | Same pattern |
| QA-A7 | Cancel Item success | ON / OFF | Same pattern |
| QA-A8 | Cancel Order success | ON / OFF | Same pattern |
| QA-A9 | **Transfer to Room success** | ON | **Stay on OE via remount** (replaces today's manual reset) |
| QA-A10 | **Transfer to Room success** | OFF | **Redirect to Dashboard** (new — was hardcoded stay) |
| QA-A11 | Place + Pay success | ON / OFF | **Unchanged** vs. CR-008 D1 |
| QA-A12 | Collect Bill on existing success | ON / OFF | **Unchanged** vs. CR-008 D1 |
| QA-A13 | Any of the 8 actions — API / payment failure | ON / OFF | Toast shown, no navigation, helper not reached |
| QA-A14 | Auto-print bill on Place+Pay success | ON | Print fires before helper (timing preserved) |
| QA-A15 | Cross-tab localStorage freshness | any | Tab 2 toggle change affects Tab 1's NEXT order action |
| QA-A16 | Rapid-fire multi-action cycle (Place → Update → Cancel → Transfer-to-Room) | ON | Cashier stays on OE through every step; remount cleans state |
| QA-A17 | Transfer-to-Room payload byte-diff | any | **Empty** — `orderToAPI.transferToRoom` body unchanged |

**B. Out-of-scope card / dashboard actions (must remain unchanged):**

| # | Scenario | Toggle | Expected |
|---|---|---|---|
| QA-B1 | Card-level Cancel Order | ON / OFF | **Unchanged** — modal flow, no nav step. Cashier stays on Dashboard. |
| QA-B2 | Card-level Mark Ready | ON / OFF | **Unchanged** — no nav step. |
| QA-B3 | Card-level Mark Served (regular + prepaid) | ON / OFF | **Unchanged** — no nav step. |
| QA-B4 | Item-level Ready/Serve from OrderCard | ON / OFF | **Unchanged**. |
| QA-B5 | Card-level Bill Click | ON / OFF | **Opens OE** — entry unchanged. |
| QA-B6 | Card-level Food Transfer initiation | ON / OFF | **Opens OE** — entry unchanged. |
| QA-B7 | Scan/Web popup Accept | ON / OFF | **Opens OE** — entry unchanged. |
| QA-B8 | Scan/Web popup Reject | ON / OFF | **Unchanged** — same as QA-B1. |
| QA-B9 | Scan/Web popup View | ON / OFF | **Unchanged**. |
| QA-B10 | Snooze / Unsnooze on cards | ON / OFF | **Unchanged**. |

---

## 9. Behaviour Deltas to Flag with Owner

The following two deltas are **deliberate** and answer owner OQ-1 / OQ-3 / OQ-4 (2026-01-16):

1. **Transfer-to-Room with toggle OFF (default):** today stays on OE → **now redirects to Dashboard**. Cashiers who keep the toggle at default will see this change.
2. **Place / Update / Cancel-Item / Cancel-Order / Merge / Shift / Transfer-Food with toggle ON:** today always redirect to Dashboard → **now stay on OE in walk-in fresh-cart mode**. Cashiers who currently have the toggle ON (to keep Pay flows on OE) will see this extended to all order actions — the explicit intent of OQ-4 = Yes.

Suggested release-note one-liner:

> *"The 'Stay on Order Entry After Collect Bill' setting now governs every order-ending action performed inside Order Entry — Place Order, Update Order, Cancel Item, Cancel Order, Merge, Shift, Transfer Food, Transfer-to-Room, Collect Bill, and Place + Pay. With the setting OFF (default), every action returns the cashier to the Dashboard. With ON, the cashier stays on Order Entry in a fresh walk-in state after every action. This setting does **not** affect actions performed from dashboard / order / table cards — those behave exactly as before."*

---

## 10. Risks / Notes

| # | Risk | Severity | Status |
|---|---|---|---|
| 1 | Card-level handlers accidentally affected | 🟢 LOW (structurally impossible) | Helper is a local closure; verified via `git diff` empty on `DashboardPage.jsx` + card components. |
| 2 | Cashiers with toggle ON see Cancel / Merge / Shift / Transfer Food stay on OE | 🟡 MEDIUM (deliberate) | Release-note in §9 covers expectation. |
| 3 | Transfer-to-Room state leaks after remount/unmount | 🟢 LOW | Both nav paths reset a strict superset of the manual block. |
| 4 | Transfer-to-Room currently lacks `await engagePromise` parity with other 7 actions | 🟡 MEDIUM (pre-existing, not introduced) | Deferred per scope plan §10 row #4. Owner can approve a v1 follow-up if needed. |
| 5 | `handleCollectBillStayOnOrder` name now serves all action types — slight misnomer | 🟢 LOW (cosmetic) | Owner OQ-5 = keep-as-is. Rename deferred. |
| 6 | Backend Phase B (`default_landing_screen`) still parked | 🟢 LOW | Pre-existing constraint. Toggle remains browser-local. |

---

## 11. Sign-off

- **Files changed:** 1 (`OrderEntry.jsx`)
- **Lines changed:** +43 / −18
- **Lint:** ✅ Clean
- **Webpack compile:** ✅ Successful on every hot-reload tick
- **Strict scope:** ✅ Confirmed — only OrderEntry-internal callsites converted; card-level / DashboardPage / payload / backend untouched
- **Owner runtime smoke:** ⏳ Pending awake backend (preprod `mygenie.online` was dormant at QA time per the prior automated QA report)
- **Closes:** CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026)
- **Supersedes:** §8 (recommended fix plan) of `POST_ACTION_NAVIGATION_AND_ROOM_TRANSFER_INVESTIGATION.md` and §9 (corrected implementation scope) of `POST_ACTION_NAVIGATION_ORDERENTRY_SCOPE_PLAN.md`

— End of Fix Report —
