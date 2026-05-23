# Post-Action Navigation and Room Transfer Investigation

> **Type:** Investigation only. No code changes. No commits. No backend / payload changes.
> **Date:** 2026-01-16
> **Scope:** Diagnose why **Transfer-to-Room** stays on Order Entry instead of honoring the post-action navigation configuration that already exists for Place+Pay and Collect Bill (CR-008 #4 Phase A / Bucket D1).

---

## 1. Summary

A browser-local toggle named **"Stay on Order Entry After Collect Bill"** (localStorage key `mygenie_stay_on_order_after_bill`) was shipped under CR-008 #4 Phase A on 2026-05-03. It currently controls only two success paths inside `OrderEntry.jsx`:

1. **Place + Pay** (Scenario 2, fresh order + pay in one shot) — `OrderEntry.jsx:1536-1542`.
2. **Collect Bill on existing order** (Scenario 1) — `OrderEntry.jsx:1657-1663`.

A third Pay-success path — **Transfer to Room** (Scenario 3, `paymentMethod === 'transferToRoom'`) — was *not* wired through the same branch. Instead it sits at `OrderEntry.jsx:1428-1443` with the inline comment **`// Prepaid cleanup — stay on order screen`** and performs a manual in-place reset of cart / payment-panel / customer / table state. There is no `onClose()` call, no `onCollectBillStayOnOrder()` call, and no read of the toggle.

Net effect:

| Toggle state | Place+Pay | Collect Bill (existing) | **Transfer to Room** |
|---|---|---|---|
| OFF (default) | ✅ Redirect to Dashboard (via `onClose()`) | ✅ Redirect to Dashboard | ❌ **Stays on Order Entry** (in violation of CR-008 D1 §6 spec) |
| ON | ✅ Stay on Order Entry (proper remount via `key` nonce) | ✅ Stay on Order Entry | ❌ Stays on Order Entry (manual reset, not via remount) |

In short: Transfer-to-Room is **hardcoded stay-on-Order-Entry**, ignores the existing toggle, and uses an inline reset that is structurally different from the documented Bucket D1 remount-via-`key` pattern.

This contradicts the locked Bucket D1 design (CR-008 D1 Summary §6, Behavior matrix row: *"any | Cancel / Transfer / Merge / Shift / Update | Redirect to Dashboard (UNCHANGED — out of scope)"*) and contradicts the QA-validated **OFF-06** row in `/app/memory/change_requests/qa_reports/CR_008_D1_QA_REPORT.md`.

---

## 2. Related CR / Bug Docs Found

| Doc | Relevance |
|---|---|
| `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` | Parent CR-008 #4 — "default landing screen" originally meant to cover both **post-login routing** AND **post-action redirects for Place / Update / Cancel / Merge / Transfer / Collect-Bill**. |
| `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` | Authoritative shipped record for Bucket D1. §1 explicitly **dropped** the post-action redirect for "Place / Update / Cancel / Merge / **Transfer** / Shift". §6 behaviour matrix locks Transfer = "Redirect to Dashboard (UNCHANGED — out of scope)". §3 confirms only two surgical insertion points in `OrderEntry.jsx` at L1390 (Place+Pay) and L1509 (Collect-Bill). |
| `/app/memory/change_requests/qa_reports/CR_008_D1_QA_REPORT.md` | Confirms QA rows OFF-06 / RB-11 expect Transfer → Dashboard regardless of toggle. Verified via grep that `getStayOnOrderAfterBill` appears only at L1426 + L1546 in the build at QA time. |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md` | A separate sub-bucket ("D1-Cap") wired per-order **delivery-charge state reset** into the Transfer-to-Room cleanup block (`setDeliveryCharge(0)` at L1439). This is why the Transfer-to-Room block carries a `CR-008 / Bucket D1-Cap` comment **but only for delivery-charge reset, not for navigation**. The navigation hardcoding pre-dates Bucket D1-Cap. |
| `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Sprint-level reconciliation. Bucket D1 listed as shipped; no follow-up bucket for Transfer-to-Room navigation parity. |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` / `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` / `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | None of these mention Transfer-to-Room navigation. Phase B (backend persistence of the toggle as `default_landing_screen`) remains **PARKED**. |
| `/app/memory/bugs/` | Scanned. No bug filed against Transfer-to-Room navigation. BUG-029 is about prepaid-settle dashboard cleanup, not Transfer-to-Room. |

**No prior CR or bug doc reports or acknowledges the current Transfer-to-Room hardcoded stay-on-OE behaviour.** This investigation is the first to flag it.

---

## 3. Current Configuration / Business Rule

### 3.1 Toggle metadata (shipped under CR-008 #4 Phase A / Bucket D1)

| Property | Value |
|---|---|
| **UI label** | "Stay on Order Entry After Collect Bill" |
| **localStorage key** | `mygenie_stay_on_order_after_bill` |
| **Type** | `string` (`'true'` / `'false'`) |
| **Default** | `'false'` (preserves redirect-to-dashboard) |
| **Storage scope** | Browser-global. Not per-user, not per-restaurant, not per-role. |
| **Read helper** | `getStayOnOrderAfterBill()` in `/app/frontend/src/utils/orderEntryPrefs.js` (line 24). Strict `=== 'true'` comparison. |
| **Write helper** | `setStayOnOrderAfterBill(value)` in same file (line 39). |
| **Write site (UI)** | `frontend/src/pages/StatusConfigPage.jsx` — UI Elements card next to Order Taking (per CR-008 D1 Summary §3). |
| **Backend source** | None. Phase B (backend `default_landing_screen` setting key) is **PARKED** per `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` / `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`. |
| **Profile API source** | None. |
| **CR decision** | CR-008 #4 Phase A (narrowed by owner from original wide scope) — see CR_008_D1 Summary §1. |
| **Supported values** | Two: `'true'` and `'false'`. Anything else / missing → `false` (silent fallback in helper). |
| **Cross-tab sync** | Implicit. Value is read fresh from `localStorage` at each Pay action. |

### 3.2 Flows currently wired

Confirmed via `grep -n getStayOnOrderAfterBill /app/frontend/src/`:

| Call site | Line | Action | Branch |
|---|---|---|---|
| `OrderEntry.jsx` | 1536 | **Scenario 2 — Place + Pay (fresh prepaid order)** | ON → `onCollectBillStayOnOrder()` ; OFF → `onClose()` |
| `OrderEntry.jsx` | 1657 | **Scenario 1 — Collect Bill on existing order** | Same branch |

There are **no other consumers** of `getStayOnOrderAfterBill` anywhere in the codebase.

### 3.3 Parent-side wiring

In `DashboardPage.jsx`:

- `handleCollectBillStayOnOrder` (line 1313-1319) resets `orderEntryTable = null`, `orderEntryType = 'walkIn'`, `initialShowPayment = false`, `initialTransferItem = null`, and bumps `orderEntryResetNonce`.
- `<OrderEntry key={orderEntryResetNonce} … onCollectBillStayOnOrder={handleCollectBillStayOnOrder} />` — bumping the nonce forces React to unmount + remount the component, naturally resetting **all** internal `useState` (showPaymentPanel, splitBill, tip, notes, customer, etc.). This was the fix for the issue discovered during D1 owner verification when CollectPaymentPanel remained visible after a prop-only update.

---

## 4. Transfer-to-Room Current Flow

### 4.1 Entry point

The action is triggered from `CollectPaymentPanel.jsx`:

| Step | File:Line | What happens |
|---|---|---|
| Tab selection | `CollectPaymentPanel.jsx:1955` | Cashier clicks the **"To Room"** payment tile → `setPaymentMethod("transferToRoom")`. |
| Room picker | `CollectPaymentPanel.jsx:2341-…` | Renders an occupied-room list (fetched fresh on tab open, per ROOM_TRANSFER_FRESH_FETCH Task 2). |
| Confirm button | `CollectPaymentPanel.jsx:2426-2429` | Label `Transfer ₹X to <RoomName>`. |
| Payload builder | `CollectPaymentPanel.jsx:719-728` | Attaches `paymentData.isTransferToRoom = true` and `paymentData.roomId = selectedRoom.tableId` (and `selectedRoom.tableNumber`). |
| Callback fire | (handler in `OrderEntry.jsx`) | The shared `onPaymentComplete` callback dispatches into the branch below. |

### 4.2 Success branch (the bug surface)

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
**Lines:** 1428-1443

```jsx
// Scenario 3 — Transfer to Room (Phase 2B)
if (paymentData.isTransferToRoom && paymentData.roomId) {
  const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
  const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
  toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
  // Prepaid cleanup — stay on order screen           ← HARDCODED stay-on-OE comment
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
}
```

### 4.3 Observations

| Observation | Detail |
|---|---|
| **No `onClose()` call** | Branch ends without redirecting. Cashier remains on OrderEntry. |
| **No `onCollectBillStayOnOrder()` call** | The proper "stay-on-OE-and-remount" handler is not invoked. |
| **No `getStayOnOrderAfterBill()` read** | The toggle is never consulted. |
| **Manual in-place state reset** | Cart, payment panel, financials, delivery charge, notes, customer, table, order type are cleared by individual `set*` calls. |
| **No `key`-nonce remount** | Unlike the D1 remount-via-`key` pattern documented in Summary §7, this path mutates internal state directly. **Any internal state added in the future that is not in this manual list will silently leak** across one Transfer-to-Room → next order. |
| **No engage await** | Unlike Place+Pay (`await engagePromise` at L1517) and Collect-Bill (`await engagePromise` at L1648), this branch fires `await api.post(...)` only and immediately resets. No socket-engage / order-engage wait → table-card state and dashboard mirrors may briefly desync in either direction (separate concern, not the navigation bug). |
| **Comment authorship** | The inline `// Prepaid cleanup — stay on order screen` comment predates Bucket D1 (was added under the original Phase 2B Transfer-to-Room work). Bucket D1-Cap later added the `setDeliveryCharge(0)` line but did not retrofit the branch to the toggle pattern. |

---

## 5. Comparison With Other Order Actions

Confirmed via static read of `OrderEntry.jsx` and `DashboardPage.jsx`.

| # | Action | File / Function | Current navigation behavior | Config-driven? | Hardcoded? |
|---|---|---|---|---|---|
| 1 | **Place Order** (no pay) | `OrderEntry.jsx:handlePlaceOrder` → L886-887 | Awaits engage socket → `onClose()` → Dashboard | No | Yes (always `onClose()`) |
| 2 | **Update Order** | `OrderEntry.jsx:handlePlaceOrder` (update branch) → L891 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 3 | **Place + Pay** (Scenario 2) | `OrderEntry.jsx` L1536-1542 | Toggle ON → `onCollectBillStayOnOrder()` (remount); OFF → `onClose()` | **Yes** | No |
| 4 | **Collect Bill (existing)** (Scenario 1) | `OrderEntry.jsx` L1657-1663 | Toggle ON → `onCollectBillStayOnOrder()`; OFF → `onClose()` | **Yes** | No |
| 5 | **Transfer to Room** (Scenario 3) | `OrderEntry.jsx` L1428-1443 | **Always stays on OE** (manual state reset, no `onClose()`, no `onCollectBillStayOnOrder()`) | **No** | **Yes (hardcoded stay-on-OE)** |
| 6 | **Transfer Food** (item-to-order) | `OrderEntry.jsx:handleTransfer` L927 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 7 | **Merge Tables** | `OrderEntry.jsx:handleMerge` L953 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 8 | **Shift Table** | `OrderEntry.jsx:handleShift` L976 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 9 | **Cancel Item** | `OrderEntry.jsx:handleCancelFood` L1006 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 10 | **Cancel Order** | `OrderEntry.jsx:handleCancelOrder` L1034 | Awaits engage → `onClose()` → Dashboard | No | Yes |
| 11 | **Hold / PayLater** | (via `CollectPaymentPanel` payment methods) | Routes through the same `onPaymentComplete` callback; the Scenario-2 / Scenario-1 branches catch them. Same navigation as #3 / #4. | Yes (inherits) | No |
| 12 | **Split Bill** | `CollectPaymentPanel.jsx` (`showSplitBillModal`) → completes via `onPaymentComplete` | Falls through Scenario-2 / Scenario-1 final branch → toggle-driven | Yes (inherits) | No |
| 13 | **Scan Order — Accept** | `DashboardPage.jsx:handleConfirmOrder` (L1190) → opens OrderEntry with `initialShowPayment` etc. (no automatic post-action redirect from this handler itself) | N/A — opens OE; downstream actions follow rows above | — | — |
| 14 | **Scan Order — Reject** | `DashboardPage.jsx:handleCancelOrderFromCard` (L1403) → opens cancel modal → eventually `handleCancelOrder` → row #10 | Same as #10 | No | Yes |
| 15 | **Scan Order — View** | Opens OE via `handleTableClick`; no terminal action implied | — | — | — |
| 16 | **Delivery order actions (Place / Collect Bill / etc.)** | Same `handlePlaceOrder` / Scenario-1 / Scenario-2 branches; orderType `delivery` is just a payload flag | Same as rows #1, #3, #4 | Partially (Place+Pay + Collect Bill yes; Place-only no) | — |
| 17 | **Room order actions (Place / Update / Collect Bill on room order)** | Same code paths as dine-in (rows #1, #2, #3, #4) — `table.isRoom` is only a payload flag | Same as dine-in rows | Same as dine-in rows | Same as dine-in rows |

### 5.1 Pay-success branch family (the relevant subset)

Inside `OrderEntry.jsx`'s `onPaymentComplete` flow at L1427 onwards there are exactly three sub-scenarios:

```
if (paymentData.isTransferToRoom && paymentData.roomId)   → Scenario 3 (L1428)  ← hardcoded stay
else if (!placedOrderId)                                  → Scenario 2 (L1444)  ← toggle-driven
else                                                      → Scenario 1 (L1544)  ← toggle-driven
```

Of these three Pay-success branches, **only Scenario 3 ignores the toggle**.

---

## 6. Hardcoding Audit

All non-toggle navigation decisions in `OrderEntry.jsx`:

| Site | Line | Hardcoded behaviour | Notes |
|---|---|---|---|
| `handlePlaceOrder` — UpdateOrder branch | 891 | `onClose()` → Dashboard | By CR-008 D1 design (out of scope) |
| `handlePlaceOrder` — PlaceOrder (no-pay) | 886 | `onClose()` → Dashboard | By design |
| `handleTransfer` (food item) | 927 | `onClose()` → Dashboard | By design |
| `handleMerge` | 953 | `onClose()` → Dashboard | By design |
| `handleShift` | 976 | `onClose()` → Dashboard | By design |
| `handleCancelFood` | 1006 | `onClose()` → Dashboard | By design |
| `handleCancelOrder` | 1034 | `onClose()` → Dashboard | By design |
| **Scenario 3 — Transfer to Room** | **1428-1443** | **Stays on OE; no `onClose()`** | **DEVIATES from CR-008 D1 §6 spec (which said Transfer → Dashboard) AND from the toggle contract** |
| **Auto-print bill (Scenario 2 + 3)** | 1412-1421 | Fires regardless of toggle | By design — print is independent of nav |
| `onPaymentComplete` (failure) | 1670-… | Toast + stay on payment panel | By design |

The **only** anomaly is row #1428-1443 (Transfer to Room). Every other terminal action either:
- redirects to Dashboard via `onClose()` (rows #1, #2, #6-10 in §5), OR
- branches on the toggle (rows #3, #4 in §5).

---

## 7. Root Cause

Multi-classification (most specific first):

### Primary: **E — Transfer-to-Room hardcodes stay-on-order-entry**

Evidence: explicit comment `// Prepaid cleanup — stay on order screen` at `OrderEntry.jsx:1433`, followed by manual in-place state resets and **no** `onClose()` / `onCollectBillStayOnOrder()` call.

### Secondary: **C — Config exists but only wired for Place+Pay and Collect Bill, not Transfer-to-Room**

Evidence: `grep -n getStayOnOrderAfterBill /app/frontend/src/` returns exactly 2 hits (L1536, L1657 of `OrderEntry.jsx`), both inside Scenarios 1 and 2. Scenario 3 does not consult the helper. The CR-008 D1 Implementation Summary §1 explicitly **dropped** Transfer from the toggle scope at owner direction.

### Contributing: **F — Current behavior matches a sub-CR (Bucket D1-Cap) cleanup intent but conflicts with the new owner expectation**

Evidence: the Transfer-to-Room cleanup block was extended under "Bucket D1-Cap" to also reset `setDeliveryCharge(0)` (L1439). The author preserved the surrounding `// Prepaid cleanup — stay on order screen` semantic because at that time the Place+Pay / Collect-Bill toggle was still considered the only "stay" surface and Transfer-to-Room was treated as a separate semantic ("prepaid clear-and-stay so cashier can start the next walk-in"). This pre-dates the current owner expectation that **all** order-ending actions follow one rule.

**Net root cause statement:** Scenario 3 in `OrderEntry.jsx:1428-1443` performs a manual stay-on-OE cleanup and is the only terminal action that neither redirects to Dashboard nor consults the post-action toggle. The shared toggle helper (`getStayOnOrderAfterBill`) and parent callback (`onCollectBillStayOnOrder`) are already available; they were simply not threaded into this branch when it was authored.

---

## 8. Recommended Fix Plan

### 8.1 Owner decision needed first (see §11)

Two equally-valid product directions are open. The implementation footprint differs only in which branch the toggle reads.

### 8.2 Option A — Transfer-to-Room follows the existing toggle (smallest, safest)

**Intent:** Make Scenario 3 behave identically to Scenarios 1 and 2.

**Change shape (no code yet, just the contract):**
- After the `await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` and toast, **delete** the manual state-reset block (cart / payment panel / financials / delivery charge / notes / customer / table / orderType).
- Replace with the same conditional already used at L1536-1542 and L1657-1663:
  - `if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') { onCollectBillStayOnOrder(); } else { onClose(); }`
- This re-uses the parent's `handleCollectBillStayOnOrder` callback in DashboardPage which already bumps `orderEntryResetNonce` → forces remount → resets all internal state for free.
- Optional engage-await parity: add `await waitForOrderEngaged(orderId)` (or analogous) before the branch, matching Scenarios 1 and 2. Defer this if owner wants the minimum surgical change.

**Diff footprint estimate:** −12 lines (manual reset) / +6 lines (branch) inside the single `if (paymentData.isTransferToRoom …)` block in `OrderEntry.jsx`. No new imports. No new helpers. No payload change. No backend change. No `CollectPaymentPanel.jsx` change. No `transferToRoom` payload-builder change. No room-billing change.

### 8.3 Option B — Transfer-to-Room **always** redirects to Dashboard (Bucket-D1-spec parity)

**Intent:** Honour the original CR-008 D1 §6 spec row that listed Transfer under "Cancel / Transfer / Merge / Shift / Update | Redirect to Dashboard (UNCHANGED — out of scope)". Treat Transfer-to-Room as a terminal action that should NEVER stay on OE, regardless of toggle.

**Change shape:**
- Same as Option A but the branch is collapsed to an unconditional `onClose()` after the toast.
- Manual reset block deleted (handled by `onClose()` unmount).

**Diff footprint estimate:** −12 lines / +1 line.

### 8.4 Option C — Introduce a single shared `navigateAfterOrderAction(actionType)` helper

**Intent:** Move all post-action navigation decisions for OrderEntry into one helper that reads the toggle once and returns `'stay' | 'dashboard'` per action type. This is the cleanest long-term shape but is also the most invasive — every existing `onClose()` callsite (rows #1, #2, #6-10 in §5) would route through it.

**Recommendation:** **Not for this CR**. Defer to a future refactor only if/when the owner wants multiple actions to follow the toggle. For the immediate Transfer-to-Room defect, Option A or B is sufficient and avoids touching the seven other terminal callsites.

### 8.5 What the fix must NOT touch (locked by strict scope)

- `orderToAPI.transferToRoom(...)` payload builder.
- `API_ENDPOINTS.ORDER_SHIFTED_ROOM` HTTP call shape.
- `CollectPaymentPanel.jsx` (room picker, payload assembly, button label).
- `OrderContext` / socket handlers / `useOrderPollingReconciliation` hook.
- Auto-print bill block (unrelated, runs above the branch).
- VAT / service charge / tip / delivery charge **calculation** (only the local `setDeliveryCharge(0)` *reset* is touched if the manual block is removed — `onClose()`-unmount or remount-via-key both achieve the same reset implicitly).
- Room-billing payload, Phase 2B room transfer payload.
- Dashboard channel/status logic, table-card state, header chrome.
- Profile API / backend `default_landing_screen` (Phase B remains parked).

---

## 9. Regression Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Existing cashiers who rely on the current hardcoded "stay on OE after Transfer-to-Room" workflow lose that UX flow when toggle is OFF (Option A) or for everyone (Option B). | 🟡 MEDIUM | Owner sign-off required before implementation. With Option A + toggle ON, the existing flow is preserved verbatim. With Option B, a one-line release note is needed. |
| 2 | Manual state reset deleted but the new branch uses `onClose()` (Option A toggle OFF / Option B) — verify cart / payment panel / customer cleared by unmount. | 🟢 LOW | `onClose()` unmounts OrderEntry; all internal `useState` is GC'd. This is the same pattern used by Place+Pay-OFF and Collect-Bill-OFF (L1541, L1662). Already battle-tested. |
| 3 | Manual state reset deleted but the new branch uses `onCollectBillStayOnOrder()` (Option A toggle ON) — verify `orderEntryResetNonce` remount path resets the same fields the manual block was resetting. | 🟢 LOW | The remount via `key` resets **all** internal state to constructor defaults, including the delivery charge and the financials block. This is strictly *more* exhaustive than the manual list — no regression risk. |
| 4 | Engage timing change if engage-await is added (Option A optional). | 🟡 MEDIUM | If added, mirror exactly what Scenarios 1/2 do (`await engagePromise` before the branch, branch is the very last step). If not added, behavior is identical to today for the network/socket layer. Recommend skipping engage-await in the first iteration to keep the diff minimal. |
| 5 | Transfer-to-Room payload change | 🟢 LOW | Out of scope by strict rule; fix does not touch payload. |
| 6 | Room billing logic change | 🟢 LOW | Out of scope; only navigation step is touched. |
| 7 | Place Order / Collect Bill / Cancel / Merge / Shift / Update behaviour change | 🟢 LOW | None of those callsites are touched in Option A or B. |
| 8 | Multi-tab toggle freshness | 🟢 LOW | Helper reads `localStorage` per call; cross-tab semantics already battle-tested per CR-008 D1 QA RB-14. |
| 9 | Auto-print bill timing | 🟢 LOW | No auto-print is fired in the Transfer-to-Room branch today; not affected. |
| 10 | Dashboard table-card state for the source dine-in table | 🟢 LOW | Drives off socket events from `ORDER_SHIFTED_ROOM` response; navigation step does not touch socket plumbing. |
| 11 | CR-008 D1 contract regression on the two existing wired branches | 🟢 LOW | Neither L1536-1542 nor L1657-1663 is modified. |
| 12 | Bucket D1-Cap delivery-charge reset semantics | 🟢 LOW | Either preserved verbatim (if manual reset is kept as a transition step) or replaced by the remount/unmount which resets `deliveryCharge` to constructor default. Constructor default is `0`, identical to the explicit reset today. |

---

## 10. QA Checklist

To be exercised after the implementation lands. Owner-approved environment + live POS.

| # | Scenario | Toggle | Expected |
|---|---|---|---|
| QA-1 | Transfer-to-Room success | ON | OrderEntry remounts cleanly (cart empty, walk-in, no table, no payment panel, no notes, no customer). Toast "Transferred to Room" shows. Dashboard not opened. |
| QA-2 | Transfer-to-Room success | OFF | OrderEntry closes via `onClose()` → user lands on Dashboard. Toast "Transferred to Room" shows. Source dine-in table card frees per existing socket flow. |
| QA-3 | Transfer-to-Room failure | any | Existing failure toast shown. OrderEntry remains on payment panel with state intact. (No regression — the new branch only runs after a successful `await api.post`.) |
| QA-4 | Place + Pay (Scenario 2) | ON / OFF | **Unchanged** behaviour per CR-008 D1 §6. |
| QA-5 | Collect Bill on existing order (Scenario 1) | ON / OFF | **Unchanged** behaviour per CR-008 D1 §6. |
| QA-6 | Place Order without Pay | any | **Unchanged** — redirects to Dashboard. |
| QA-7 | Cancel / Merge / Shift / Update / Cancel Item / Cancel Order | any | **Unchanged** — redirects to Dashboard. |
| QA-8 | Source dine-in table card after Transfer-to-Room | any | Frees / engages exactly as today (driven by socket from `ORDER_SHIFTED_ROOM`, not by client navigation step). |
| QA-9 | Destination room card after Transfer-to-Room | any | Reflects new occupancy exactly as today. |
| QA-10 | Order Entry cart cleared after Transfer-to-Room | ON | Verified via remount; OFF | Verified via unmount. |
| QA-11 | No `transferToRoom` payload change | any | `orderToAPI.transferToRoom(...)` body unchanged (grep diff). |
| QA-12 | No `ORDER_SHIFTED_ROOM` HTTP call shape change | any | Same endpoint, same method, same payload. |
| QA-13 | No VAT / service charge / tip / delivery charge calculation change | any | Numeric fields in payload unchanged. |
| QA-14 | Dashboard remains responsive after a fast OrderEntry-Transfer-OrderEntry cycle | ON / OFF | No stale modal, no stale `placedOrderId`, no stale customer. |
| QA-15 | localStorage toggle change in another tab takes effect on next Transfer-to-Room | any | Read-fresh semantics confirmed (same pattern as RB-14 in CR-008 D1 QA). |
| QA-16 | Print-Bill / auto-print not triggered by Transfer-to-Room | any | Confirmed — Scenario 3 does not call `printOrder()`. |
| QA-17 | Engage timing (if engage-await is added) | any | Confirm engage event arrival before navigation. Skip this row if Option A v0 / Option B without engage-await is chosen. |

---

## 11. Owner Questions

True blockers — answers received from owner on 2026-01-16 and locked below.

| # | Question | Owner answer (locked 2026-01-16) |
|---|---|---|
| **OQ-1** | What should Transfer-to-Room do after a successful transfer? (a) stay on OE always, (b) redirect to Dashboard always, (c) follow the existing toggle "Stay on Order Entry After Collect Bill". | **(c) Follow the existing toggle** — identical to Place+Pay / Collect Bill. |
| **OQ-2** | Should Transfer-to-Room follow the **same** toggle as Place+Pay / Collect Bill, or a **separate** setting? | **Same toggle.** Re-use `mygenie_stay_on_order_after_bill`. No new key, no new Status Config UI element. |
| **OQ-3** | Should Transfer-to-Room **always** return to Dashboard regardless of toggle, matching the CR-008 D1 §6 row that put Transfer under "out-of-scope = redirect"? | **No.** Follow the config. The original D1 §6 row is **superseded** by this owner direction. |
| **OQ-4** | Should one shared post-action navigation rule cover **all** order-ending actions (Place / Update / Cancel / Merge / Shift / Transfer-Food / Transfer-to-Room / Collect Bill / Place+Pay)? | **Yes.** The same toggle now governs **every** terminal order action. Scope expands from one branch to all seven currently-hardcoded callsites. |
| **OQ-5** | If the toggle is renamed to a more general label, should the existing localStorage key be migrated? | **No.** Keep `mygenie_stay_on_order_after_bill` as-is for now. Label rename and key migration deferred. |

---

## 12. Locked Implementation Direction (post-owner decisions)

> **No code in this investigation.** Owner explicitly requested investigation re-share only. This section locks the shape that a future implementation CR must follow.

### 12.1 Direction summary

Single shared post-action navigation rule across **every** order-ending action in `OrderEntry.jsx`. Driven by the existing `mygenie_stay_on_order_after_bill` localStorage toggle (key kept verbatim per OQ-5). ON → stay on OrderEntry with a clean remount. OFF → redirect to Dashboard (today's behaviour).

This is **Option C** from §8.4, now elevated from "not recommended" to **the chosen direction** by owner OQ-4 = Yes.

### 12.2 Surface that the future CR must wire

All eight `OrderEntry.jsx` callsites listed in §6 / §5 must converge on the same conditional shape that already exists at L1536-1542 and L1657-1663:

```jsx
if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
  onCollectBillStayOnOrder();
} else {
  onClose();
}
```

| Callsite | File:Line | Today | After CR |
|---|---|---|---|
| Place Order (no pay) | `OrderEntry.jsx:886-887` | `onClose()` | Shared branch |
| Update Order | `OrderEntry.jsx:891` | `onClose()` | Shared branch |
| Transfer Food (item) | `OrderEntry.jsx:927` | `onClose()` | Shared branch |
| Merge Tables | `OrderEntry.jsx:953` | `onClose()` | Shared branch |
| Shift Table | `OrderEntry.jsx:976` | `onClose()` | Shared branch |
| Cancel Item | `OrderEntry.jsx:1006` | `onClose()` | Shared branch |
| Cancel Order | `OrderEntry.jsx:1034` | `onClose()` | Shared branch |
| **Transfer to Room** | **`OrderEntry.jsx:1428-1443`** | **Hardcoded stay + manual reset** | **Shared branch (delete manual reset)** |
| Place+Pay (Scenario 2) | `OrderEntry.jsx:1536-1542` | Already wired | Already wired (no change) |
| Collect Bill (Scenario 1) | `OrderEntry.jsx:1657-1663` | Already wired | Already wired (no change) |

Net: **8 callsites** to retrofit (7 currently-hardcoded `onClose()` sites + 1 hardcoded stay-on-OE site).

### 12.3 Recommended micro-shape

Introduce a thin local helper inside `OrderEntry.jsx` (or in `utils/orderEntryPrefs.js` alongside the existing helpers) — e.g.:

```js
// Shared post-action navigation. Returns nothing. Caller does not branch.
// One-liner usage at every terminal callsite — replaces the inline conditional.
const navigateAfterOrderAction = () => {
  if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
    onCollectBillStayOnOrder();
  } else {
    onClose();
  }
};
```

Then every callsite becomes a single line:

```js
navigateAfterOrderAction();
```

For the Transfer-to-Room branch specifically, the 9-line manual reset block (cart / payment panel / financials / delivery charge / notes / customer / table / orderType) is **deleted** — `onClose()`-unmount handles it in OFF mode, and the parent's `handleCollectBillStayOnOrder` remount-via-`key` handles it in ON mode.

### 12.4 Shape of `handleCollectBillStayOnOrder` in DashboardPage

**Unchanged.** The existing handler at `DashboardPage.jsx:1313-1319` already does the right thing for every action type (clears table, sets walk-in, clears initialShowPayment, clears initialTransferItem, bumps `orderEntryResetNonce` for full remount). No parent-side change required.

The handler's name (`handleCollectBillStayOnOrder`) is semantically narrow but cosmetic-only — owner deferred the rename via OQ-5. A future cosmetic CR could rename it to `handleStayOnOrderEntry` or `handlePostOrderActionStay` without behaviour change.

### 12.5 Behaviour matrix under locked direction

| Toggle | Action | Result |
|---|---|---|
| ON | Place Order (no pay) | Stay on OE, walk-in fresh cart |
| ON | Update Order | Stay on OE, walk-in fresh cart |
| ON | Transfer Food (item) | Stay on OE, walk-in fresh cart |
| ON | Merge / Shift | Stay on OE, walk-in fresh cart |
| ON | Cancel Item / Cancel Order | Stay on OE, walk-in fresh cart |
| ON | **Transfer to Room** | **Stay on OE, walk-in fresh cart** (via parent remount, NOT the current manual reset) |
| ON | Place+Pay | Stay on OE (unchanged) |
| ON | Collect Bill | Stay on OE (unchanged) |
| OFF | every action above | Redirect to Dashboard via `onClose()` (today's behaviour for all 7 hardcoded `onClose()` sites; **new** for Transfer-to-Room which today stays on OE) |

### 12.6 Strict-scope reaffirmation for the future CR

The implementation CR that picks this up must observe the rules from §8.5:

- No touch to backend.
- No touch to any payload builder (`orderToAPI.placeOrder`, `orderToAPI.updateOrder`, `orderToAPI.transferToRoom`, `tableToAPI.transferFood`, `tableToAPI.mergeTable`, `tableToAPI.shiftTable`, `orderToAPI.cancelItem`, `orderToAPI.cancelOrder`).
- No touch to `CollectPaymentPanel.jsx`.
- No touch to socket handlers / `useOrderPollingReconciliation` / `OrderContext`.
- No touch to VAT / service charge / tip / delivery charge **calculation** logic.
- No touch to printer / KOT payloads.
- No touch to CRM logic.
- No touch to room-billing logic.
- No touch to dashboard channel/status logic.
- Bucket D1-Cap's `setDeliveryCharge(0)` line at L1439 is deleted along with the rest of the manual reset block — the constructor default for `deliveryCharge` is `0`, so remount-via-key (ON path) or unmount-via-`onClose()` (OFF path) preserves the same outcome.

### 12.7 Behaviour regression to flag with owner

Today, **Transfer-to-Room with toggle OFF stays on OE** (the bug being fixed). After this CR ships, **Transfer-to-Room with toggle OFF will redirect to Dashboard** — same as every other terminal action. This is a deliberate behaviour change directly answering OQ-1/OQ-3. A release-note one-liner is recommended:

> *"Transfer-to-Room now follows the same 'Stay on Order Entry After Collect Bill' setting as Place + Pay and Collect Bill. With the setting OFF (default), the cashier returns to the Dashboard after a successful transfer. With ON, the cashier stays on Order Entry in fresh walk-in mode."*

Also: 7 other actions (Place / Update / Cancel / Merge / Shift / Cancel Item / Cancel Order / Transfer Food) **today** always redirect to Dashboard. After this CR, with the toggle ON, they will **stay on OE**. Cashiers who never toggled the setting on will see zero change. Cashiers who already turned it on (to keep Pay flows on OE) will see the same behaviour now extend to all other actions — which is the explicit intent of OQ-4 = Yes.

### 12.8 QA checklist update (extends §10)

In addition to QA-1 … QA-17, the future CR must add:

| # | Scenario | Toggle | Expected |
|---|---|---|---|
| QA-18 | Place Order (no pay) | ON | Stay on OE, remount fresh |
| QA-19 | Place Order (no pay) | OFF | Redirect to Dashboard |
| QA-20 | Update Order | ON / OFF | Same pattern |
| QA-21 | Cancel Item | ON / OFF | Same pattern |
| QA-22 | Cancel Order | ON / OFF | Same pattern |
| QA-23 | Merge | ON / OFF | Same pattern |
| QA-24 | Shift | ON / OFF | Same pattern |
| QA-25 | Transfer Food | ON / OFF | Same pattern |
| QA-26 | Cross-action rapid fire (Place → Update → Cancel → Transfer to Room) with toggle ON | ON | Cashier stays on OE through every step; remount cleans state between actions; no stale modal, no stale `placedOrderId`, no stale customer. |
| QA-27 | Mixed payment-failure path | any | Failure toast + stays on payment panel; navigation branch not entered. |
| QA-28 | Transfer-to-Room engage-await parity (if added) | any | Confirm engage event arrival before navigation; deferred from v0 unless owner asks. |

### 12.9 Risk register update (extends §9)

| # | New risk introduced by Option-C broadening | Severity | Mitigation |
|---|---|---|---|
| 13 | Cashiers who today rely on "Cancel takes me back to Dashboard" suddenly see "Cancel keeps me on OE" when their toggle is ON. | 🟡 MEDIUM | Toggle is OFF by default — only opt-in cashiers see the change. Release-note line in §12.7 covers expectation. |
| 14 | 8 callsites × 2 branches × manual smoke — large QA surface. | 🟡 MEDIUM | Single shared helper means one code path under test; smoke matrix expands but each cell is trivial to exercise. |
| 15 | `handleCollectBillStayOnOrder` name becomes a misnomer when used for Cancel / Merge / Shift / Transfer Food. | 🟢 LOW (cosmetic) | Owner OQ-5 = "keep as is for now". Rename deferred. |
| 16 | Engage-await timing parity across 8 callsites — Place/Update/Transfer-Food/Merge/Shift/Cancel-Item/Cancel-Order already `await engagePromise` before `onClose()`; Transfer-to-Room currently does **not**. | 🟡 MEDIUM | Add `await engagePromise` (or `waitForOrderEngaged(orderId)`) to Transfer-to-Room **only if owner approves the timing-parity tweak**. v0 can land without it for minimum diff; v1 may add it after smoke. |
| 17 | Backend Phase B (BE-F `default_landing_screen`) still parked → toggle remains browser-local. | 🟢 LOW | Pre-existing constraint per CR-008 D1 §10 and BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md. Out of scope of this CR. |

— End of Investigation Report (updated 2026-01-16 with owner-locked answers) —
