# Document Audit Status
- Source File: memory/ARCHITECTURE_DECISIONS_FINAL.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High
- Code Areas Reviewed: `frontend/src/components/order-entry/*`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/api/socket/*`, `frontend/src/contexts/*`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/cards/*`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/src/api/services/*`, `frontend/src/api/constants.js`, `frontend/plugins/health-check/*`, `frontend/src/__tests__/api/socket/*`
- Notes: Reconciled against current branch `Piyush_QA` at commit `19fc8ff05506057b6fab89a6201162fa34baedf2`. Code was treated as the only source of truth. Items from `AD_UPDATES_PENDING.md` were absorbed only where verified in code.

# ARCHITECTURE_DECISIONS_FINAL — v2

## Audit Scope
This file finalizes only what can be supported by the current frontend codebase.

Status legend used below:
- **Verified** = directly supported by current code
- **Partially Implemented** = direction is visible, but implementation is incomplete or inconsistent
- **Superseded** = older decision text is no longer the best description of current code
- **Not Confirmed** = intent cannot be proven from frontend code alone

---

## Verified Decisions

### AD-001 — Final total rounding rule

**Previous Documented Understanding**
- Rounding rule was described as “difference to next integer `>= 0.10` rounds up”.

**What Code Actually Does**
- Current code rounds based on the **fractional part** of the raw total.
- If fractional part is **greater than `0.10`**, it rounds **up**.
- If fractional part is **`0.10` or less**, it rounds **down**.
- Implemented in both:
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `frontend/src/api/transforms/orderTransform.js`
- `OrderEntry.jsx` still contains an older local `applyRoundOff()` helper using the pre-fix logic for local pre-placement totals.

**Status**
- **Partially Implemented**

**Impact on Final Documentation**
- The canonical documented rule must match `CollectPaymentPanel` and `calcOrderTotals`.
- A code-level inconsistency remains because `OrderEntry.jsx` still uses the older helper for local display totals before placement.

**Required V2 Update**
- Replace the old wording with: fractional part `> 0.10` → ceil, otherwise floor.
- Explicitly note remaining duplication/inconsistency in `OrderEntry.jsx`.

---

### AD-002 — Remove vs update behavior for socket order events

**Previous Documented Understanding**
- Remove vs update is determined by event semantics, not terminal status alone.

**What Code Actually Does**
- `handleOrderDataEvent()` removes only when:
  - order status is `cancelled` or `paid`, and
  - event is `update-order-source` or `update-order-paid`.
- `update-order` and `update-order-target` update in-place.

**Status**
- **Verified**

**Impact on Final Documentation**
- Keep event-semantic-based branching as the code-backed behavior.

**Required V2 Update**
- Remove business-contract certainty language and keep the code-observed rule.

---

### AD-006 — `def_ord_status` / `defaultOrderStatus` usage

**Previous Documented Understanding**
- Default order status comes from profile data and is not scanner-only.

**What Code Actually Does**
- `profileTransform.js` maps `api.def_ord_status` to `restaurant.defaultOrderStatus` using `F_ORDER_STATUS_API`.
- `RestaurantContext` exposes `defaultOrderStatus`.
- `DashboardPage` uses it in `confirmOrder(orderId, roleName, defaultOrderStatus)`.

**Status**
- **Verified**

**Impact on Final Documentation**
- This is an active confirm-order dependency, not dead or scanner-only config.

**Required V2 Update**
- Keep as verified and reference the confirm-order path.

---

### AD-007 — Terminal order statuses in current frontend logic

**Previous Documented Understanding**
- Only `paid` and `cancelled` are terminal statuses.

**What Code Actually Does**
- Socket removal logic treats `paid` and `cancelled` as terminal in:
  - `handleOrderDataEvent()`
  - `handleUpdateOrderStatus()`
- No other statuses are treated as terminal by these handlers.

**Status**
- **Verified**

**Impact on Final Documentation**
- Safe to document as a frontend implementation fact.

**Required V2 Update**
- Keep as code-verified, but avoid claiming backend-global authority.

---

### AD-008 — Role values used for order API scoping

**Previous Documented Understanding**
- Frontend uses only `Waiter` and `Manager` for running-order scoping.

**What Code Actually Does**
- `getOrderRoleParam()` returns:
  - `Waiter` if user role lowercases to `waiter`
  - `Manager` for every other role
- `LoadingPage` and `useRefreshAllData` use this helper before calling running-orders API.

**Status**
- **Verified**

**Impact on Final Documentation**
- Frontend normalization is real and active.

**Required V2 Update**
- Keep the two-value mapping as frontend behavior; do not overstate backend semantics.

---

### AD-009 — Permissions authority and frontend usage model

**Previous Documented Understanding**
- Backend is authoritative; frontend consumes permission strings for UI gating.

**What Code Actually Does**
- `AuthContext` stores raw permission strings and exposes `hasPermission()`.
- UI directly checks permissions such as:
  - `order_cancel`
  - `food`
  - `transfer_table`
  - `merge_table`
  - `food_transfer`
  - `customer_management`
  - `bill`
  - `discount`
  - `print_icon`
- Gating is widespread in `DashboardPage` and `OrderEntry`.

**Status**
- **Verified**

**Impact on Final Documentation**
- The allowlist is implicit in code, not centrally cataloged.

**Required V2 Update**
- Keep backend authority wording, but document that frontend permission usage remains decentralized.

---

### AD-101 — Service charge application point in billing

**Previous Documented Understanding**
- Service charge should apply after discount, but earlier documentation marked this as not implemented.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` computes service charge from `subtotalAfterDiscount`.
- `orderTransform.js` `calcOrderTotals()` also computes service charge from post-discount subtotal.
- `placeOrderWithPayment()` threads `discountAmount`, `tipAmount`, and `deliveryCharge` into `calcOrderTotals()`.
- `buildBillPrintPayload()` also uses post-discount subtotal when it must compute service charge itself.
- Code also applies GST to post-discount item tax plus service charge, tip, and delivery charge using average GST rate.

**Status**
- **Verified**

**Impact on Final Documentation**
- `AD_UPDATES_PENDING.md` Entry #1 is supported by code and should be absorbed.

**Required V2 Update**
- Flip this AD to verified.
- Record that current code aligns UI, collect-bill payload math, prepaid place+pay math, and bill-print fallback math around post-discount service charge.

---

### AD-102 — Handling socket data events when `payload.orders` is missing

**Previous Documented Understanding**
- Frontend should not silently recover with GET fallback when payload is malformed.

**What Code Actually Does**
- `handleOrderDataEvent()` and `handleUpdateOrderStatus()` both log an error and return if `payload.orders` is missing or empty.
- No GET fallback is performed for those v2 payload-driven handlers.

**Status**
- **Verified**

**Impact on Final Documentation**
- This is a real fail-fast implementation decision.

**Required V2 Update**
- Keep the code-backed fail-fast statement, but mark long-term contract intent as not confirmable from frontend alone.

---

### AD-103 — `update-item-status` vs `update-food-status`

**Previous Documented Understanding**
- Both events are valid and should not be merged by assumption.

**What Code Actually Does**
- `update-item-status` is routed through `handleOrderDataEvent()` using socket payload.
- `update-food-status` is routed through `handleUpdateFoodStatus()` and still fetches via API with a table-engage workaround.
- The code paths are distinct and materially different.

**Status**
- **Verified**

**Impact on Final Documentation**
- These are not duplicate frontend contracts.

**Required V2 Update**
- Keep as verified.

---

### AD-105 — Tax consistency between collect-bill UI and printed bill

**Previous Documented Understanding**
- Earlier documentation said UI and print had separate tax paths and were only partially aligned.

**What Code Actually Does**
- `CollectPaymentPanel` computes `sgst` and `cgst` once.
- `handlePayment()` passes `printGstTax` / `printVatTax` from those UI values.
- `handlePrintBill()` passes `gstTax` override from the same UI values.
- `buildBillPrintPayload()` honors override tax values when supplied.
- There is still a fallback print-time recomputation path when no overrides are supplied, such as dashboard bill printing.

**Status**
- **Partially Implemented**

**Impact on Final Documentation**
- Collect-bill initiated print/payment paths are aligned.
- Global “single source of truth everywhere” is still too strong because dashboard/default print path can still compute fallback tax.

**Required V2 Update**
- Absorb the implementation learning, but keep status as partial rather than fully verified.

---

### AD-106 — `update-table` channel usage

**Previous Documented Understanding**
- The table channel is active and comments claiming removal are stale.

**What Code Actually Does**
- `useSocketEvents()` actively subscribes to `getTableChannel(restaurantId)`.
- `socketHandlers.js` and `useSocketEvents.js` still contain stale comments saying the update-table channel was removed.
- `handleUpdateTable()` is active and updates table engage/status state.

**Status**
- **Verified**

**Impact on Final Documentation**
- This is one of the clearest doc-vs-code contradictions.

**Required V2 Update**
- Keep as verified and explicitly call out stale comments as legacy drift.

---

### AD-108 — Engage-lock recovery after reload/reconnect

**Previous Documented Understanding**
- Engage locks are ephemeral and rebuilt from fresh data.

**What Code Actually Does**
- `OrderContext` and `TableContext` use in-memory Sets for engaged state.
- No persistence or replay layer exists in frontend code.
- `SocketContext` reconnects the socket but does not restore engage state from durable storage.

**Status**
- **Verified**

**Impact on Final Documentation**
- Ephemeral lock behavior is real.

**Required V2 Update**
- Keep as verified, but note reconnect leak/staleness risk separately in risk docs.

---

### AD-201 — Notification and toast system ownership

**Previous Documented Understanding**
- `NotificationContext` is the realtime notification system; shadcn toast is the action-toast system; Sonner is inactive.

**What Code Actually Does**
- `App.js` mounts `components/ui/toaster`.
- Action/result toasts use `useToast()` broadly across pages/components.
- `NotificationContext` manages notification list, unread count, and sound playback.
- Notification ingress is FCM/service-worker driven, not socket-driven.
- `components/ui/sonner.jsx` exists but is not mounted or used.

**Status**
- **Verified**

**Impact on Final Documentation**
- Keep split ownership, but describe inbound notification source correctly.

**Required V2 Update**
- State explicitly that realtime notification ingress is FCM-based in current code.

---

### AD-202 — `order_id` response-shape handling for place-order related flows

**Previous Documented Understanding**
- Frontend tolerates multiple `order_id` response shapes.

**What Code Actually Does**
- `OrderEntry.jsx` captures new order id from:
  - `res.data.order_id`
  - `res.data.data.order_id`
  - `res.data.new_order_ids[0]`
- This is used in the prepaid place+pay flow before auto-print.

**Status**
- **Verified**

**Impact on Final Documentation**
- Multi-shape tolerance is an explicit implementation fact.

**Required V2 Update**
- Keep as verified, but avoid assigning semantic certainty to each backend response shape.

---

### AD-204 — `mock*` data files

**Previous Documented Understanding**
- Mock files should be removed.

**What Code Actually Does**
- `TableCard.jsx` still imports `mockOrderItems` and assigns a dead local `orderData` variable that is never used.
- `notePresets` are exported from data and are live reference data, not dead test-only mock content.

**Status**
- **Partially Implemented**

**Impact on Final Documentation**
- Blanket “all mock files are removable” is too broad.

**Required V2 Update**
- Document the split:
  - some mock artifacts are dead / cleanup candidates,
  - some data exports are still active runtime reference data.

---

### AD-206 — Legacy `handleUpdateOrder` handler

**Previous Documented Understanding**
- `handleUpdateOrder` is a dead legacy wrapper.

**What Code Actually Does**
- `handleUpdateOrder()` still exists as a wrapper that immediately calls `handleOrderDataEvent()`.
- Registry still maps `SOCKET_EVENTS.UPDATE_ORDER` to `handleUpdateOrder`.

**Status**
- **Superseded**

**Impact on Final Documentation**
- The old wording “dead code” is too strong.

**Required V2 Update**
- Reframe as **legacy wrapper still wired in, behavior delegated to `handleOrderDataEvent()`**.

---

### AD-302 — Bill print consistency with collect-bill edits

**Previous Documented Understanding**
- Printed bill should reflect collect-bill edits, but prior docs marked this as only partial.

**What Code Actually Does**
- `CollectPaymentPanel.handlePrintBill()` builds live overrides from current collect-bill state.
- `OrderEntry.onPrintBill` forwards those overrides to `printOrder()`.
- Collect-bill payment success auto-print path also forwards live overrides.
- `buildBillPrintPayload()` consumes those overrides correctly.
- However, dashboard/table-card/order-card bill prints can still use fallback values without collect-bill overrides.

**Status**
- **Partially Implemented**

**Impact on Final Documentation**
- Collect-bill initiated print consistency is implemented.
- Global bill-print consistency across every entry path is not fully guaranteed.

**Required V2 Update**
- Keep as partial, not fully verified.

---

## Verified but Needs Clarification for Intent

### AD-003 — Walk-in order definition

**Previous Documented Understanding**
- Walk-in means dine-in with `table_id = 0`.

**What Code Actually Does**
- `fromAPI.order()` infers `isWalkIn` when `!api.table_id || api.table_id === 0`.
- `normalizeOrderType()` can still map several raw order types into `dineIn`.
- Dashboard represents walk-ins as virtual entries under dine-in handling.

**Status**
- **Verified in code / Not Confirmed as business definition**

**Impact on Final Documentation**
- Safe to document as current inference logic, not canonical business truth.

**Required V2 Update**
- Mark business definition as not confirmed from code.

---

### AD-107 — WebSocket authentication model

**Previous Documented Understanding**
- WebSocket is intentionally unauthenticated.

**What Code Actually Does**
- `socketService.connect()` passes no token, auth payload, query, or extra headers.
- Authentication intent is not provable from frontend alone.

**Status**
- **Verified as implementation / Not Confirmed as intentional architecture**

**Impact on Final Documentation**
- The implementation fact is solid; the security rationale is not.

**Required V2 Update**
- Rephrase to: “current frontend socket handshake is unauthenticated from the client side.”

---

### AD-203 / AD-203A / AD-203B / AD-203C — CRM config sourcing and session behavior

**Previous Documented Understanding**
- CRM key is env-driven today; future sourcing may change; restaurant binding is session-scoped.

**What Code Actually Does**
- `crmAxios.js` parses `REACT_APP_CRM_API_KEYS` from env.
- `setCrmRestaurantId()` stores current restaurant ID after profile load.
- Requests attach `X-API-Key` dynamically based on the active restaurant.
- No mid-session rotation logic exists.

**Status**
- **Verified for current env-based frontend behavior / Not Confirmed for future architecture**

**Impact on Final Documentation**
- Current env-based CRM binding is code-backed.
- Future DB/bootstrap provisioning remains speculative from code.

**Required V2 Update**
- Keep only present-state behavior as verified; move future-state comments into not-confirmed notes.

---

### AD-401 / AD-402 — Financial ownership across placement, print, and settlement phases

**Previous Documented Understanding**
- Backend is authoritative after placement; collect-bill edits from frontend become settlement values.

**What Code Actually Does**
- Frontend clearly computes and submits billing values during collect-bill and prepaid place+pay flows.
- Print paths also consume frontend-generated overrides.
- What backend persists or treats as authoritative cannot be proven from frontend alone.

**Status**
- **Partially Verified / Backend intent not confirmed**

**Impact on Final Documentation**
- Keep the frontend phase behavior, but remove authoritative backend statements not derivable from code.

**Required V2 Update**
- Reframe as frontend-side ownership boundaries observed in payload construction.

---

## Superseded or Corrected Decisions

### AD-111A — Notification source-of-truth

**Previous Documented Understanding**
- Notifications must originate only from socket-driven events; local/manual notification generation should not exist.

**What Code Actually Does**
- `NotificationContext` receives foreground notifications via Firebase messaging.
- Service worker forwards background notifications to the app.
- `NotificationTester` in `SettingsPanel` can manually simulate notifications through `simulateNotification()`.
- No socket-driven notification source is present in the notification pipeline.

**Status**
- **Superseded by implementation**

**Impact on Final Documentation**
- The old AD is materially wrong for the current frontend.

**Required V2 Update**
- Replace with: current notification ingress is FCM/service-worker based, and a manual simulation path exists in settings.

---

### AD-502 — Default state of `serviceChargeEnabled`

**Previous Documented Understanding**
- Toggle should reflect actual applicability and should not always default ON.

**What Code Actually Does**
- `CollectPaymentPanel` still initializes `serviceChargeEnabled` with `useState(true)`.
- Applicability gating is implemented separately through `scApplicable`, but the toggle default remains hardcoded ON when shown.

**Status**
- **Partially Implemented**

**Impact on Final Documentation**
- Order-type gating has improved this area, but the original default-state concern still stands.

**Required V2 Update**
- Keep the remaining gap explicit.

---

## New / Absorbed Decisions from `AD_UPDATES_PENDING.md`

### AD-013A — Service charge order-type gating

**Previous Documented Understanding**
- Older docs did not clearly capture service-charge applicability by order type.

**What Code Actually Does**
- `CollectPaymentPanel` defines:
  - `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom`
- Service charge row/toggle are hidden for takeaway and delivery.
- `OrderEntry` passes `serviceChargePercentage: 0` to transform calls for non-applicable order types.

**Status**
- **Verified**

**Impact on Final Documentation**
- This is a real architecture/behavior decision now present in code.

**Required V2 Update**
- Add as a new verified decision.

---

## Decisions Not Confirmed From Code

### AD-303 — Prepaid order bill-print availability on collect-bill page

**Previous Documented Understanding**
- Prepaid collect-bill should expose print bill button and earlier runtime reportedly lacked it.

**What Code Actually Does**
- `CollectPaymentPanel` shows `Print Bill` whenever `hasPlacedItems && onPrintBill`.
- No prepaid exclusion is present in this component.
- Runtime parity with all backend/order states was not validated here.

**Status**
- **Not Confirmed from code as a runtime bug**

**Impact on Final Documentation**
- The older “missing for prepaid” statement should not survive unchanged.

**Required V2 Update**
- Replace with: current component code does not exclude prepaid from print-bill visibility; any runtime gap would need runtime/backend validation.

---

### AD-503 — Mobile / touch / keyboard UX support

**Previous Documented Understanding**
- Desktop, touch, and keyboard support are required.

**What Code Actually Does**
- Static code shows many clickable controls and some accessible attributes, but does not prove full keyboard/touch compliance.

**Status**
- **Not Confirmed from code**

**Impact on Final Documentation**
- Treat this as product intent, not verified implementation.

**Required V2 Update**
- Move to non-confirmed section.

---

### AD-603 — Test coverage for v2 socket handlers

**Previous Documented Understanding**
- Coverage is partial.

**What Code Actually Does**
- Partial tests exist:
  - `updateOrderStatus.test.js`
  - `socketEvents.test.js`
  - `socketServiceGlobal.test.js`
- `updateOrderStatus.test.js` is stale against current implementation because it expects API-fetch fallback behavior no longer used by `handleUpdateOrderStatus()`.

**Status**
- **Verified as partial coverage, with stale tests**

**Impact on Final Documentation**
- The summary must mention stale coverage, not just partial presence.

**Required V2 Update**
- Keep as partial and explicitly call out stale expectations.

---

### AD-701 — `.env.example` contract

**Previous Documented Understanding**
- Repo should provide `.env.example`.

**What Code Actually Does**
- No `.env.example` was present in the audited repo.

**Status**
- **Not Implemented**

**Impact on Final Documentation**
- Keep as a documentation/setup gap, not an implemented decision.

**Required V2 Update**
- Retain as unresolved.

---

### AD-703 — `backend/server.py` presence in frontend-focused repo

**Previous Documented Understanding**
- Backend scaffold is temporary and should be removed later.

**What Code Actually Does**
- A backend scaffold exists in repo.
- “Should be removed later” is not confirmable from code.

**Status**
- **Partially Verified**

**Impact on Final Documentation**
- Keep only the fact that backend scaffold exists; future repo-boundary intent is external.

**Required V2 Update**
- Remove certainty about planned removal.

---

### AD-801 — History rewrite / force-push governance

**Previous Documented Understanding**
- Repo history rewrites should be avoided and documented.

**What Code Actually Does**
- Not answerable from static frontend code.

**Status**
- **Not Confirmed from code**

**Impact on Final Documentation**
- This is governance, not code-verifiable architecture.

**Required V2 Update**
- Keep only as non-code governance note if needed.

---

## Final Reconciled Summary

### Verified from code
- Service charge is now post-discount in collect-bill and transform math.
- `update-table` subscription is active; removal comments are stale.
- Socket v2 payload handlers fail fast when `payload.orders` is missing.
- Notification ingress is FCM-based, while action toasts use shadcn toaster.
- Sonner is present but inactive.
- Multi-shape `order_id` capture exists.
- Role scoping normalization is `Waiter` vs `Manager`.
- `defaultOrderStatus` is actively used in confirm-order flow.

### Partially implemented / still mixed
- Tax consistency is strong for collect-bill-driven print/payment, but fallback print-time recomputation still exists in non-override paths.
- Rounding rule is updated in major billing paths but still inconsistent in `OrderEntry` local total helper.
- `serviceChargeEnabled` still defaults ON.
- Mock-data cleanup direction is only partially true; some “mock” exports are active runtime data.

### Superseded by current implementation
- Socket-only notification source-of-truth.
- `handleUpdateOrder` as fully dead code.

### Not confirmed from frontend code alone
- WebSocket unauthenticated design intent.
- Backend-global business definitions for walk-in, terminal statuses, and future CRM sourcing.
- Governance and future repo-boundary statements.
