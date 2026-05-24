# Post-Action Navigation OrderEntry Scope Plan

> **Type:** Scope correction + implementation planning only. No code changes. No commits. No backend / payload / dashboard-card changes.
> **Date:** 2026-01-16
> **Supersedes (scope only, not findings):** §8 and §12 of `POST_ACTION_NAVIGATION_AND_ROOM_TRANSFER_INVESTIGATION.md`. The investigation's findings stand; this plan re-bounds the implementation surface to OrderEntry-screen actions only, per owner clarification.

---

## 1. Summary

The "Stay on Order Entry After Collect Bill" toggle (`mygenie_stay_on_order_after_bill`, default OFF) currently controls only **two** OrderEntry success paths — Place+Pay (Scenario 2) and Collect Bill on existing order (Scenario 1). Eight other OrderEntry success paths use hardcoded `onClose()` → Dashboard, and one (Transfer-to-Room) is hardcoded stay-on-OrderEntry with an inline manual reset block.

Owner has approved a single shared post-action navigation rule, but the rule **applies only to actions initiated from inside `OrderEntry.jsx`**. Card-level / dashboard-card / table-card / channel-column / popup quick actions are explicitly out of scope. The proposed helper closes over OrderEntry component props (`onClose`, `onCollectBillStayOnOrder`) and is therefore structurally incapable of affecting card-level handlers that live in `DashboardPage.jsx` and never render OrderEntry.

Implementation footprint: **single file** — `/app/frontend/src/components/order-entry/OrderEntry.jsx`. **No changes** to `DashboardPage.jsx`, no changes to any card component, no changes to any payload builder, no backend touch.

---

## 2. Baseline Docs Read

| Doc | Relevance |
|---|---|
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Frontend architecture baseline. |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | CR lifecycle gates. |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` / `FINAL_DOCS_SUMMARY.md` | Sprint doc index. |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Implementation guardrails. |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Module-level locked decisions. |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Resolved open questions. |
| `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Sprint-level reconciliation. |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | Closure record for CR-008 D1. |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | Pending work index — no Transfer-to-Room nav item. |
| `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | Next-action buckets. |
| `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Backend `default_landing_screen` remains parked. |
| `/app/memory/change_requests/post_action_navigation_investigation/POST_ACTION_NAVIGATION_AND_ROOM_TRANSFER_INVESTIGATION.md` | Prior investigation — root cause + owner Q&A locked in §11-§12. |
| `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` | Authoritative record of toggle's storage contract, parent handler, remount-via-`key` pattern. |
| `/app/memory/change_requests/qa_reports/CR_008_D1_QA_REPORT.md` | QA matrix that the new CR must extend. |

---

## 3. Owner Clarification Applied

> **The post-action navigation toggle applies ONLY to actions performed from the Order Entry screen.**

| Source | In-scope? |
|---|---|
| Action initiated inside `OrderEntry.jsx` (Place / Update / Cancel Item / Cancel Order / Merge / Shift / Transfer Food / Transfer-to-Room / Place+Pay / Collect Bill) | ✅ **YES** |
| Action initiated from a dashboard order card / table card / channel column / popup quick action | ❌ **NO — out of scope** |

Example carry-over from the owner brief:
- "Cancel item from a dashboard/order card/card-level action" → **untouched**. Today the cashier never leaves the Dashboard for this action; that behaviour is preserved.
- "Cancel item via the in-row Cancel button inside OrderEntry" → **in scope**. Today the cashier is redirected to Dashboard; under the toggle this becomes config-driven.

This CR does **not** introduce any post-action navigation behaviour to actions that today have no navigation step at all (card-level cancel / mark-ready / mark-served — these never `onClose()` or push a route because there's no modal to close; the cashier is already on Dashboard).

---

## 4. In-Scope OrderEntry Callsites

All inside `/app/frontend/src/components/order-entry/OrderEntry.jsx`.

| # | Action | Function / Line | Current behavior | Proposed behavior | Success-only? |
|---|---|---|---|---|---|
| 1 | Place Order (no pay) | `handlePlaceOrder` → L886-887 | Awaits engage socket, then `onClose()` → Dashboard | `navigateAfterOrderAction()` (single line) | ✅ Yes — sits after `if (apiFailed) return;` and after engage await |
| 2 | Update Order | `handlePlaceOrder` (update branch) → L891 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — gated by `if (apiFailed) return;` at L809 |
| 3 | Transfer Food (item) | `handleTransfer` → L927 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — runs in `.then` success path; failure toast in `.catch` does not navigate |
| 4 | Merge Tables | `handleMerge` → L953 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — same shape as #3 |
| 5 | Shift Table | `handleShift` → L976 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — same shape |
| 6 | Cancel Item | `handleCancelFood` → L1006 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — failure path sets `isPlacingOrder=false` and returns before the nav step |
| 7 | Cancel Order | `handleCancelOrder` → L1034 | Awaits engage, then `onClose()` | `navigateAfterOrderAction()` | ✅ Yes — failure path inside `.catch` short-circuits |
| 8 | **Transfer to Room** | Scenario 3 inside `onPaymentComplete` → **L1428-1443** | **Hardcoded stay** with 9-line manual reset block | **Delete manual reset, call `navigateAfterOrderAction()`** | ✅ Yes — branch runs only after successful `await api.post` |
| 9 | Place + Pay | Scenario 2 → L1536-1542 | Already toggle-wired | **No change** | ✅ Yes (already correct) |
| 10 | Collect Bill (existing) | Scenario 1 → L1657-1663 | Already toggle-wired | **No change** | ✅ Yes (already correct) |

### 4.1 Verification: each callsite is reachable ONLY from inside OrderEntry

Every handler above is a closure inside the `OrderEntry` functional component (declared between L780-L1045 and L1427-L1664). They are invoked exclusively by:
- buttons rendered inside the OrderEntry JSX tree (the cart action bar, the CollectPaymentPanel passed as a child, the TransferModal / MergeModal / ShiftModal / CancelItemModal / CancelOrderModal also rendered as children of OrderEntry), and
- the `onPaymentComplete` callback that CollectPaymentPanel fires up to OrderEntry.

None of them is exported. None of them is passed up to `DashboardPage.jsx` as a prop. Card-level handlers in `DashboardPage.jsx` (rows in §5 below) cannot reach them.

---

## 5. Out-of-Scope Card / Dashboard Actions Inspected

All confirmed live in `/app/frontend/src/pages/DashboardPage.jsx` or under `/app/frontend/src/components/cards/` and `/app/frontend/src/components/dashboard/`.

| # | Action | File / Function | Current behavior | Confirmation untouched |
|---|---|---|---|---|
| C-1 | Cancel Order from order card / table card / channel column | `DashboardPage.jsx:handleCancelOrder` (L1206-1208) + `handleCancelOrderConfirm` (L1211-1229) | Opens `CancelOrderModal`; on confirm fires `PUT /order-status-update`, awaits `waitForOrderRemoval`. **No navigation step.** Cashier remains on Dashboard. | ✅ Not in scope. Separate code path. No `onClose()` involved. Helper has no access to it. |
| C-2 | Cancel Order from Scan/Web popup (Reject) | `DashboardPage.jsx:handleCancelOrderFromCard` (L1403) → wires into same modal as C-1 → C-1's path | Same as C-1. **No navigation step.** | ✅ Not in scope. |
| C-3 | Mark Ready from card | `DashboardPage.jsx:handleMarkReady` (L1349-1359) | Fires `updateOrderStatus(...'ready')`. **No navigation step.** | ✅ Not in scope. No `onClose()`. |
| C-4 | Mark Served from card | `DashboardPage.jsx:handleMarkServed` (L1362-1382) | Fires `updateOrderStatus(...'serve')` or `completePrepaidOrder(...)`; calls `handlePrepaidSettleSuccess` for stale OE-selection cleanup. **No navigation step.** | ✅ Not in scope. |
| C-5 | Item-level Ready/Serve change from OrderCard | `DashboardPage.jsx:handleItemStatusChange` (L1385+) | Fires per-item PUT. **No navigation step.** | ✅ Not in scope. |
| C-6 | Print Bill / Bill Click from card | `DashboardPage.jsx:handleBillClick` (L1335-1338) | `handleTableClick(...)` + `setInitialShowPayment(true)` → **opens** OrderEntry in Collect-Bill mode. The actual Collect Bill action then runs inside OrderEntry (row #10). | ✅ Card-level **entry** is untouched. Once inside OrderEntry, row #10 already handles nav via existing toggle. |
| C-7 | Food Transfer initiation from card | `DashboardPage.jsx:handleFoodTransfer` (L1341-1346) | `handleTableClick(...)` + `setInitialTransferItem(...)` → opens OrderEntry with transfer modal pre-armed. | ✅ Card-level entry untouched. Once inside OrderEntry, row #3 governs exit nav. |
| C-8 | Scan Order Accept (Confirm) | `DashboardPage.jsx:handleConfirmOrder` (L1190) | Either confirms-and-stays or opens OrderEntry depending on cashier choice; downstream actions follow rows #1 / #3 / #9 / #10 in §4. | ✅ Card-level handler untouched. |
| C-9 | Scan Order Reject | `DashboardPage.jsx:handleCancelOrderFromCard` (L1403) → C-1's modal | Same as C-1. **No navigation step.** | ✅ Not in scope. |
| C-10 | Scan Order View | Opens OrderEntry without modal arming | Pure entry — no terminal action. | ✅ Not in scope. |
| C-11 | Snooze / Unsnooze quick action on cards | Various card handlers (e.g. `onToggleSnooze`) | Local state flip only. No API call. No navigation. | ✅ Not in scope. |
| C-12 | Quick "Confirm Order" YTC button on OrderCard / TableCard | Inside the popup queue under `ScanOrderPopOut` → flows through C-8 | Same as C-8. | ✅ Not in scope. |
| C-13 | "Mark item ready/serve" inside OrderCard expansion | `handleItemStatusChange` (C-5) | Per-item PUT. No navigation. | ✅ Not in scope. |
| C-14 | Card-level Transfer-to-Room | **Does not exist.** `ORDER_SHIFTED_ROOM` is only invoked inside `OrderEntry.jsx:1431`. | n/a | ✅ Not in scope by construction. |
| C-15 | Card-level Merge / Shift | **Does not exist.** `MERGE_ORDER` / `ORDER_TABLE_SWITCH` only invoked inside OrderEntry (L937, L961). | n/a | ✅ Not in scope by construction. |
| C-16 | Card-level Cancel Item (per-item) | **Does not exist.** `CANCEL_ITEM` only invoked inside `OrderEntry.jsx:989`. | n/a | ✅ Not in scope by construction. |

### 5.1 Files inspected for card-level handlers

- `/app/frontend/src/pages/DashboardPage.jsx`
- `/app/frontend/src/components/cards/OrderCard.jsx`
- `/app/frontend/src/components/cards/TableCard.jsx`
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx`
- `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx`

Grep result for terminal-endpoint constants:
- `MERGE_ORDER` → 1 hit in `OrderEntry.jsx:937`. No card-level hits.
- `ORDER_TABLE_SWITCH` → 1 hit in `OrderEntry.jsx:961`. No card-level hits.
- `ORDER_SHIFTED_ROOM` → 1 hit in `OrderEntry.jsx:1431`. No card-level hits.
- `TRANSFER_FOOD` → 1 hit in `OrderEntry.jsx:911`. No card-level hits.
- `CANCEL_ITEM` → 1 hit in `OrderEntry.jsx:989`. No card-level hits.
- `ORDER_STATUS_UPDATE` for **cancel** → 2 hits: `OrderEntry.jsx:1021` (in-OE Cancel Order — row #7) and `DashboardPage.jsx:1220` (card-level Cancel Order — row C-1, no navigation step). Disjoint code paths.
- `PLACE_ORDER` → 2 hits inside `OrderEntry.jsx` (L860 Scenario 0, L1494 Scenario 2). No card-level hits.
- `UPDATE_ORDER` → 1 hit inside `OrderEntry.jsx:797`. No card-level hits.

→ All terminal payload-builders / endpoints for the 8 in-scope actions are exclusively invoked from inside OrderEntry. There is **no parallel code path** from a card that this CR could accidentally touch.

---

## 6. Shared Helper Plan

### 6.1 Helper location

Internal to `/app/frontend/src/components/order-entry/OrderEntry.jsx`. **Not** moved to `utils/orderEntryPrefs.js`, because the helper needs closure access to two OrderEntry component props (`onClose`, `onCollectBillStayOnOrder`). Co-locating in `utils/` would force passing both props through, which adds surface without benefit.

### 6.2 Helper shape (specification — no code yet)

A `useCallback` (or plain inner function — owner can decide based on prop-identity stability of the parent callback; existing CR-008 D1 design says the parent callback intentionally is *not* memoised because remount is driven by `key` nonce, not by prop identity):

```js
// Pseudocode for the plan — final shape decided at implementation time.
const navigateAfterOrderAction = () => {
  if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
    onCollectBillStayOnOrder();
  } else {
    onClose();
  }
};
```

### 6.3 Why this affects only OrderEntry actions

- The helper is a local closure inside the `OrderEntry` component. It is not exported, not passed up to parent, not exposed on a context.
- It reads `getStayOnOrderAfterBill()` (browser-local, fine to call from anywhere — but the **effect** is the conditional call of `onClose()` / `onCollectBillStayOnOrder()`, both of which are OrderEntry's own props).
- Card-level handlers in `DashboardPage.jsx` do not import or invoke this helper. They do not have access to OrderEntry's local scope.
- Card-level handlers also do not have an equivalent `onClose()` / "stay" concept — cashier is already on Dashboard; there is no modal to close.

### 6.4 Parent handler reuse

`DashboardPage.jsx:handleCollectBillStayOnOrder` (L1313-1319) is **reused verbatim**:

```jsx
const handleCollectBillStayOnOrder = () => {
  setOrderEntryTable(null);
  setOrderEntryType('walkIn');
  setInitialShowPayment(false);
  setInitialTransferItem(null);
  setOrderEntryResetNonce(n => n + 1);
};
```

It already does the right thing for every order-ending action — clears table/type/payment-panel flag/transfer-item flag, then bumps the remount nonce. Bumping `orderEntryResetNonce` forces React to unmount + remount `<OrderEntry/>` via its `key` prop (`DashboardPage.jsx:1664`), which resets **every** internal `useState` to constructor defaults. This is the same battle-tested pattern shipped under CR-008 D1.

**No DashboardPage edits required.**

### 6.5 Verification that the helper cannot leak to card actions

Concrete proof:

| Question | Answer |
|---|---|
| Does `navigateAfterOrderAction` exist outside OrderEntry's component body? | No. It is a local closure. |
| Is `navigateAfterOrderAction` passed up via callback prop? | No (this plan forbids it). |
| Does any card-level handler (`handleCancelOrder`, `handleMarkReady`, `handleMarkServed`, `handleItemStatusChange`, `handleBillClick`, `handleFoodTransfer`, `handleConfirmOrder`, `handleCancelOrderFromCard`) call `navigateAfterOrderAction`? | No. They live in `DashboardPage.jsx` and don't have a reference to it. |
| Does the helper's effect (`onClose()` or `onCollectBillStayOnOrder()`) reach card-level state? | Only via the parent handler `handleCollectBillStayOnOrder`, which is the **same** handler the toggle uses today for Place+Pay / Collect Bill. The parent handler's surface is bounded: it touches only `orderEntryTable`, `orderEntryType`, `initialShowPayment`, `initialTransferItem`, `orderEntryResetNonce`. None of these are read by card-level handlers (verified via grep). |

---

## 7. Transfer-to-Room Reset Block Decision

### 7.1 Current block (L1433-1443)

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

### 7.2 Plan

**Delete the entire block.** Replace with a single call to `navigateAfterOrderAction()`.

### 7.3 Why this is safe

Two independent code paths achieve the same reset, depending on the toggle:

**Toggle OFF → `onClose()` path (Dashboard):**
- `onClose()` (defined in `DashboardPage.jsx:1293` as `handleOrderEntryClose`) calls `setOrderEntryTable(null)` and `setOrderEntryType(null)`. The conditional rendering at `DashboardPage.jsx:1664` (`{orderEntryTable && orderEntryType && ( <OrderEntry/> )}`) then unmounts the entire OrderEntry component tree. All `useState` is GC'd: `cartItems`, `showPaymentPanel`, `placedOrderId`, `orderFinancials`, `deliveryCharge`, `orderNotes`, `customer` — every state the manual block was clearing — are recreated at constructor defaults when the user next opens OrderEntry. Same outcome as the manual reset.

**Toggle ON → `onCollectBillStayOnOrder()` path (remount via `key`):**
- The handler bumps `orderEntryResetNonce`, which is the `key` prop on `<OrderEntry/>`. React treats this as a new component and unmounts + remounts. All internal `useState` resets to constructor defaults. The handler also calls `setOrderEntryTable(null)` / `setOrderEntryType('walkIn')` / clears `initialShowPayment` and `initialTransferItem`. Same outcome as the manual reset, except the destination state is walk-in fresh cart instead of nothing.

Both paths cover every field the manual block was clearing, plus several the manual block was not clearing (e.g. `tip`, `discounts`, `walkInTableName`, `addresses`, `selectedAddress`, `splitBill modal state`). Therefore deleting the manual reset is strictly safer than keeping it — it picks up future state additions automatically.

### 7.4 Out-of-scope guarantees for Transfer-to-Room block deletion

- **No payload change.** The `orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId)` call and the `api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` HTTP fire are **untouched**. The deletion is strictly post-success cleanup + navigation.
- **No room-billing logic change.** Room-billing fields are computed in `CollectPaymentPanel.jsx` and `orderToAPI.transferToRoom`; both are outside this CR's edit set.
- **No card-level room action impact.** There is no card-level Transfer-to-Room handler (confirmed in §5, row C-14). The deletion affects only the in-OrderEntry Scenario 3 success branch.
- **Bucket D1-Cap delivery-charge reset semantics preserved.** Constructor default for `deliveryCharge` state is `0` (verified in OrderEntry initialisation). Both navigation paths reset to `0`. No regression.

### 7.5 Optional engage-await parity (deferred)

Today's Transfer-to-Room branch does not `await engagePromise` before navigating, unlike the other seven in-scope actions. Adding `await waitForOrderEngaged(orderId)` (or `waitForTableEngaged`) before the nav step would bring it to parity. **This plan defers that timing tweak** — see §10 risk row #4. Owner can approve the engage-await addition as a v1 follow-up after smoke.

---

## 8. Dashboard / Parent Impact

| Change | Required? |
|---|---|
| Edit `DashboardPage.jsx`? | **No.** The existing `handleCollectBillStayOnOrder` handler already does everything needed. |
| Edit any card component (`OrderCard.jsx`, `TableCard.jsx`, `ChannelColumn.jsx`, `ChannelColumnsLayout.jsx`)? | **No.** |
| Edit `ScanOrderPopOut.jsx`? | **No.** |
| Edit `CollectPaymentPanel.jsx`? | **No.** |
| Edit `utils/orderEntryPrefs.js`? | **No.** Helpers already in place. |
| Edit `StatusConfigPage.jsx` (toggle UI)? | **No.** Toggle UI and persistence already shipped under CR-008 D1. |
| Rename `handleCollectBillStayOnOrder` to something more general? | **No** (per owner OQ-5 = keep-as-is). Cosmetic rename deferred. |
| Add backend `default_landing_screen` setting? | **No** (Phase B remains parked). |

**Only `OrderEntry.jsx` is edited.**

---

## 9. Corrected Implementation Scope

### 9.1 Files proposed to change

| File | Edit type | Estimated diff |
|---|---|---|
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | 1 helper definition + 8 callsite replacements | +6 / −18 (delete manual reset block of ~9 lines; replace 8 `onClose()` invocations with the helper call) |

That's it. **One file. One CR.**

### 9.2 Files explicitly NOT changed (locked)

- `/app/frontend/src/pages/DashboardPage.jsx`
- `/app/frontend/src/components/cards/OrderCard.jsx`
- `/app/frontend/src/components/cards/TableCard.jsx`
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx`
- `/app/frontend/src/components/dashboard/ScanOrderPopOut.jsx`
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `/app/frontend/src/utils/orderEntryPrefs.js`
- `/app/frontend/src/api/transforms/orderTransform.js`
- `/app/frontend/src/api/transforms/tableTransform.js`
- `/app/frontend/src/api/socket/*`
- `/app/frontend/src/contexts/*`
- `/app/frontend/src/hooks/useOrderPollingReconciliation.js`
- `/app/frontend/src/pages/StatusConfigPage.jsx`
- Any backend file
- Any payload builder
- Any KOT / printer transform
- Any CRM module

---

## 10. Regression Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Accidentally affecting card-level Cancel Order / Mark Ready / Mark Served behaviour | 🟢 LOW (structurally impossible) | Helper is internal to OrderEntry's component body. Card-level handlers live in DashboardPage and don't reference it. Grep proof in §5.1. |
| 2 | Cashiers with toggle ON suddenly see Cancel / Merge / Shift / Transfer Food stay on OE instead of returning to Dashboard | 🟡 MEDIUM | Toggle is OFF by default; only opt-in cashiers experience the change. Release-note one-liner mandatory. |
| 3 | Manual reset deletion in Transfer-to-Room could leak state if remount/unmount were skipped | 🟢 LOW | Both paths (`onClose()` / `onCollectBillStayOnOrder()`) are battle-tested in CR-008 D1. Constructor defaults match the manual reset's targets. |
| 4 | Transfer-to-Room currently lacks `await engagePromise` parity | 🟡 MEDIUM | Out of scope for v0. Defer to v1 follow-up if owner approves after smoke. |
| 5 | `handleCollectBillStayOnOrder` name becomes a misnomer when invoked for Cancel / Merge / Shift / Transfer Food | 🟢 LOW (cosmetic) | Owner OQ-5 = keep-as-is. Rename deferred. |
| 6 | Engage-await reordering — placing the nav helper inside the existing `await engagePromise` callsites must preserve order: API → engage → (apiFailed-check) → nav. | 🟢 LOW | Replacement is mechanical: every existing `onClose();` becomes `navigateAfterOrderAction();` at the same line. Engage timing and apiFailed guard remain verbatim above the call. |
| 7 | Backend Phase B (`default_landing_screen`) still parked → toggle remains browser-local. | 🟢 LOW | Pre-existing constraint per CR-008 D1 §10. Out of scope of this CR. |
| 8 | Payment-failure short-circuit paths must not trigger the helper. | 🟢 LOW | All 8 callsites are downstream of explicit `if (apiFailed) return;` / `.catch` early-exit / engage-await-error short-circuits. Mechanical replacement preserves all of those. QA-27 covers this. |
| 9 | Hot-reload / StrictMode double-effect on remount | 🟢 LOW | Already handled by CR-008 D1 remount-via-`key`. No new exposure. |

---

## 11. QA Matrix

### 11.A In-scope OrderEntry actions (toggle ON / OFF)

| # | Scenario | Toggle | Expected behaviour |
|---|---|---|---|
| QA-A1 | Place Order (no pay) success | ON | Stay on OE, walk-in fresh cart, cart empty, payment panel closed, no table |
| QA-A2 | Place Order (no pay) success | OFF | Redirect to Dashboard via `onClose()` |
| QA-A3 | Update Order success | ON | Stay on OE, walk-in fresh cart |
| QA-A4 | Update Order success | OFF | Redirect to Dashboard |
| QA-A5 | Transfer Food (item) success | ON | Stay on OE, walk-in fresh cart |
| QA-A6 | Transfer Food (item) success | OFF | Redirect to Dashboard |
| QA-A7 | Merge Tables success | ON / OFF | Same pattern |
| QA-A8 | Shift Table success | ON / OFF | Same pattern |
| QA-A9 | Cancel Item success | ON / OFF | Same pattern |
| QA-A10 | Cancel Order success | ON / OFF | Same pattern |
| QA-A11 | **Transfer to Room success** | ON | **Stay on OE, walk-in fresh cart via remount** (replaces today's manual reset) |
| QA-A12 | **Transfer to Room success** | OFF | **Redirect to Dashboard** (new behaviour replacing today's hardcoded stay) |
| QA-A13 | Place + Pay success | ON / OFF | **Unchanged** — already shipped under CR-008 D1 |
| QA-A14 | Collect Bill on existing success | ON / OFF | **Unchanged** — already shipped under CR-008 D1 |
| QA-A15 | Any of the 8 actions — payment / API failure | ON / OFF | Toast shows; no navigation (helper not reached) |
| QA-A16 | Auto-print bill timing (Scenario 2, ON) | ON | Auto-print fires before helper; timing preserved verbatim |
| QA-A17 | Cross-tab localStorage freshness | any | Toggle change in Tab 2 affects Tab 1's NEXT order action |
| QA-A18 | Rapid-fire multi-action cycle (Place → Update → Cancel → Transfer-to-Room) | ON | Cashier stays on OE throughout; remount cleans state between every action |
| QA-A19 | Auto-print bill on Transfer-to-Room | any | Confirmed NOT triggered (Scenario 3 does not call `printOrder()`) |
| QA-A20 | `transferToRoom` / `cancelOrder` / `cancelItem` / `mergeTable` / `shiftTable` / `transferFood` / `placeOrder` / `updateOrder` payload byte-diff | any | **Empty diff** — no payload field added / removed / reordered |

### 11.B Out-of-scope card / dashboard actions (must remain unchanged)

| # | Scenario | Toggle | Expected behaviour |
|---|---|---|---|
| QA-B1 | Card-level Cancel Order (order card / table card / channel column) | ON | **No change** — opens CancelOrderModal, fires API, no nav step. Cashier stays on Dashboard. |
| QA-B2 | Card-level Cancel Order | OFF | **No change** — same as today. |
| QA-B3 | Card-level Mark Ready | ON / OFF | **No change** — fires `updateOrderStatus('ready')`; no nav step. |
| QA-B4 | Card-level Mark Served (regular) | ON / OFF | **No change** — fires `updateOrderStatus('serve')`; no nav step. |
| QA-B5 | Card-level Mark Served (prepaid) | ON / OFF | **No change** — fires `completePrepaidOrder` + `handlePrepaidSettleSuccess`; no nav step. |
| QA-B6 | Item-level Ready/Serve change from OrderCard expansion | ON / OFF | **No change** — per-item PUT; no nav step. |
| QA-B7 | Card-level Bill Click | ON / OFF | **Opens OrderEntry in Collect-Bill mode** — entry behaviour unchanged. (Exit behaviour governed by QA-A14, which is already shipped.) |
| QA-B8 | Card-level Food Transfer initiation | ON / OFF | **Opens OrderEntry with transfer modal armed** — entry behaviour unchanged. |
| QA-B9 | Scan/Web popup Accept | ON / OFF | **Opens OrderEntry** — entry unchanged. (Subsequent OE actions governed by QA-A series.) |
| QA-B10 | Scan/Web popup Reject | ON / OFF | **No change** — flows through `handleCancelOrderFromCard` → CancelOrderModal → same as QA-B1. |
| QA-B11 | Scan/Web popup View | ON / OFF | **No change** — pure entry, no terminal action. |
| QA-B12 | Snooze / Unsnooze on cards | ON / OFF | **No change** — local state flip; no API; no nav. |
| QA-B13 | Dashboard route / channel-status view mode | ON / OFF | **No change** — view-mode toggles untouched. |
| QA-B14 | Cashier on Dashboard, no OrderEntry mounted, toggle flipped to ON | ON | **No effect on current Dashboard view** — toggle is consulted only at OrderEntry success branches. |

---

## 12. Open Questions

True blockers only — implementation can proceed once these are confirmed.

| # | Question | Why it blocks |
|---|---|---|
| **OQ-S1** | **Confirm scope** — only the 8 callsites in §4 (rows #1-#8) plus the two already-wired Pay branches (#9-#10) are in scope. No other callsite (card-level, popup-level, header chrome, table-grid, channel column) is touched. | Locks the file-level diff. |
| **OQ-S2** | **Engage-await for Transfer-to-Room** — v0 (no engage-await) or v1 (add `await waitForOrderEngaged(orderId)` before the helper)? | v0 keeps the diff minimal (8 mechanical replacements + 1 helper + 1 manual-reset deletion). v1 adds one additional `await` line in Scenario 3 to mirror Scenarios 1/2. Defer unless owner asks. |
| **OQ-S3** | **Release-note phrasing** for the behaviour delta (toggle ON now governs all 8 actions; Transfer-to-Room OFF now redirects to Dashboard). | Communications, not code. Suggested wording in §12.7 of the prior investigation. |
| **OQ-S4** | **QA owner** — who runs the QA-A and QA-B matrix on preprod once the backend wake-up is available? Same owner as CR-008 D1 smoke? | Schedule + smoke channel. |

— End of OrderEntry-Scope Plan —
