# OPEN QUESTIONS FROM CODE — v3 (Re-Validation)

> Generated: 2026 (v3 re-validation) | Source: `main` branch, commit `7f87721`
> Previous version: v2 (commit `b32dec9`, now absent from the repo history).
> Format: Every question classified as **Answered / Partial / Open / Contradicted** — with code-backed answer when Answered.

---

## 0. Re-classification Summary

v2 had **36 questions** (OQ-001..009, 101..111, 201..206, 301..303, 401..402, 501..504, 601..603, 701..703).

v3 classification:

| Status | Count | Questions |
|---|---|---|
| **Answered** (by code re-inspection) | **6** | OQ-104, OQ-201, OQ-204, OQ-206, OQ-501, OQ-601 |
| **Partial** (part answerable, part still needs product input) | **2** | OQ-106, OQ-502 |
| **Open** (still requires backend / product clarification) | **26** | OQ-001..003, 005..009, 101..103, 105, 107..111, 202..203, 205, 301..303, 401..402, 503..504, 602..603, 701..703 |
| **Contradicted** (v2's stated observation was wrong) | **2** | OQ-204 sub-claim, OQ-602 sub-claim (both partially) |

Net effect: **6 of 36 questions are now answered from code alone**; the rest require external clarification (backend docs, product spec, ops).

---

## Business Logic Questions

### OQ-001 — What is the canonical rounding rule for order totals?

- **Question**: Why 0.10? Is this a business requirement matched by backend? What happens at exact boundary (0.10, 0.09)?
- **Previous Understanding (v2)**: Duplicated `diff ≥ 0.10 → ceil; else floor` in three places (calcOrderTotals, CollectPaymentPanel, OrderEntry applyRoundOff).
- **Current Code Reality (v3)**: SAME — `orderTransform.js:388–393`, `CollectPaymentPanel.jsx:240–243`, `OrderEntry.jsx:506–510` (v2 citation) all use the identical rule.
- **Status**: **Open** — business rationale still not visible in code.
- **Evidence**: Three file locations above.
- **Confidence in observation**: HIGH. **Confidence in rule's intent**: LOW.
- **Gap**: Requires product/backend confirmation.

### OQ-002 — When should orders be REMOVED vs UPDATED on socket events?

- **Question**: What determines which event fires for a given backend state change?
- **Previous Understanding (v2)**: Handlers branch by event name and status:
  - `update-order`: always `updateOrder()`.
  - `update-order-target`: `updateOrder()`; detects old-table change.
  - `update-order-source`, `update-order-paid`: if `cancelled`/`paid` → `removeOrder()`, else `updateOrder()`.
  - `update-item-status`: always `updateOrder()`.
  - `update-order-status`: if `cancelled`/`paid` → `removeOrder()`; else `updateOrder()`.
  - `split-order`: always `updateOrder()` on original.
- **Current Code Reality (v3)**: SAME — `socketHandlers.js:216–280, 366–411`.
- **Status**: **Open** — backend contract still not visible in code.
- **Evidence**: `socketHandlers.handleOrderDataEvent`, `handleUpdateOrderStatus`, `handleSplitOrder`.
- **Confidence in observation**: HIGH.
- **Gap**: Backend needs to publish an event-semantics matrix.

### OQ-003 — What counts as a "Walk-In" order?

- **Status**: **Open**
- **Current Code Reality**: `orderTransform.fromAPI.order` sets `isWalkIn = !api.table_id || api.table_id === 0` (cited per v2). No change in v3.
- **Gap**: Needs product input about whether takeaway/delivery can have `table_id=0`.

### OQ-004 — Rooms vs Tables: what are the differences in flow?

- **Status**: **Open**
- **Current Code Reality**: Same as v2 — single TableContext holds both, `isRoom` flag.
- **Gap**: Needs product input on room auto-clear trigger, multi-order rooms, null vs empty-string shape of `paid_room` / `room_id`.

### OQ-005 — What are all possible values of `order_in`?

- **Status**: **Open**
- **Current Code Reality**: Same observations: `'RM'`, `'SRM'` checked; full enumeration unknown.
- **Gap**: Backend enum list needed.

### OQ-006 — What is `def_ord_status` / `defaultOrderStatus`'s business rule?

- **Status**: **Open**
- **Current Code Reality**: `F_ORDER_STATUS_API` at `constants.js:139–149` still maps 9 values. `orderService.confirmOrder(id, roleName, orderStatus='paid')` defaults to `'paid'`.
- **Gap**: Per-restaurant operational behavior.

### OQ-007 — Which orderStatus counts as "terminal"?

- **Status**: **Open**
- **Current Code Reality**: Handlers check `status === 'cancelled' || status === 'paid'` (re-verified `socketHandlers.js:393`).
- **Gap**: Product contract for edge states (`pending`, `reserved`, `pendingPayment`).

### OQ-008 — What is the actual role string `getOrderRoleParam` expects?

- **Status**: **Open**
- **Current Code Reality**: Same — returns `'Waiter'` for waiters, `'Manager'` otherwise.
- **Gap**: Backend acceptance set.

### OQ-009 — What permissions exist?

- **Status**: **Open**
- **Current Code Reality**: Same 9 checks confirmed via grep in `OrderEntry.jsx`.
- **Gap**: Authoritative permission list from backend/profile schema.

---

## Payment & Calculation Questions

### OQ-101 — Service charge application point — pre-discount or post-discount?

- **Question**: What is the canonical rule?
- **Previous Understanding (v2)**:
  - `CollectPaymentPanel`: `serviceCharge = itemTotal × SC% / 100` (pre-discount)
  - `orderTransform.calcOrderTotals`: `serviceCharge = subtotal × SC% / 100` (transform doesn't know about discounts)
  - `buildBillPrintPayload`: fallback uses `computedSubtotal × SC% / 100`
- **Current Code Reality (v3)**: SAME — evidence:
  - `CollectPaymentPanel.jsx:210–212`
  - `orderTransform.js:374–378`
  - `buildBillPrintPayload` (~line 909)
- **Status**: **Open** — three-place duplication confirmed; canonical rule not declared.
- **Confidence in divergence**: HIGH. **Confidence in correct rule**: LOW.
- **Gap**: Backend canonicalization + single-source-of-truth refactor.

### OQ-102 — What happens when a v2 data event arrives with no `payload.orders`?

- **Question**: Should handlers fall back to GET?
- **Previous Understanding (v2)**: All v2 handlers log ERROR and bail.
- **Current Code Reality (v3)**: SAME — `socketHandlers.js:234–237` (handleOrderDataEvent), `:378–381` (handleUpdateOrderStatus). No GET fallback.
- **Status**: **Open**.
- **Evidence**: Lines above.
- **Gap**: Backend contract + fallback strategy decision.

### OQ-103 — `update-item-status` vs `update-food-status` — which authoritative?

- **Status**: **Open**
- **Current Code Reality**: Both routes still present (`update-item-status` via `handleOrderDataEvent`, `update-food-status` via `handleUpdateFoodStatus` with GET+workaround).
- **Gap**: Backend emission rules.

### OQ-104 — Which bill-payment endpoint is canonical: `BILL_PAYMENT` or `CLEAR_BILL`?

- **Question**: Is `CLEAR_BILL` a planned rename for `BILL_PAYMENT`?
- **Previous Understanding (v2)**: `OrderEntry` uses `BILL_PAYMENT` directly; `paymentService.collectPayment` uses undefined `CLEAR_BILL`.
- **Current Code Reality (v3)**: SAME — `OrderEntry.jsx:1154` → `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)` is the **active** path. `paymentService.js:13` → `api.post(API_ENDPOINTS.CLEAR_BILL, payload)` has **zero call sites** in production code (grep confirmed; only the test imports paymentService).
- **Status**: **Answered (code-level)**:
  - **Active, working endpoint**: `BILL_PAYMENT = '/api/v2/vendoremployee/order/order-bill-payment'` (`constants.js:44`).
  - **`paymentService.collectPayment` is dead code** — no production caller exists.
  - **Test `paymentService.test.js` T2 is broken** — asserts `CLEAR_BILL` exists but it doesn't, so the test will fail. Either the test is vestigial or CI is not running / is ignoring the failure (see OQ-602).
- **Evidence**: `OrderEntry.jsx:1154`; `paymentService.js:13`; `constants.js:44, 6-74` (no `CLEAR_BILL` key); grep `paymentService\.collectPayment` — no hits outside test.
- **Confidence**: HIGH.
- **Gap**: Product decision on whether to delete `paymentService.js` & its test, OR actually wire `CLEAR_BILL` to a real endpoint (see RISK-001).

### OQ-105 — BUG-281 Subtotal — is the bill print's `gst_tax` really discount-adjusted?

- **Status**: **Open**
- **Current Code Reality**: `CollectPaymentPanel.jsx:249–271` still computes `printTaxTotals` with `discountRatio` while UI `taxTotals` is gross.
- **Gap**: Backend contract — does it recompute tax from bill print payload or trust it?

---

## Socket & State Questions

### OQ-106 — Is the `update_table` channel still used, or was it removed?

- **Question**: Was the BUG-203 fix reverted? Are comments stale, or is subscription stale?
- **Previous Understanding (v2)**: Comments claim removed; code still subscribes.
- **Current Code Reality (v3)**: SAME:
  - `useSocketEvents.js:4–6, 125–127` — comments say "BUG-203: Removed update-table channel subscription"
  - `socketHandlers.js:4–6` — comment says "The update-table socket channel is no longer subscribed to."
  - `useSocketEvents.js:146` — `const tableChannel = getTableChannel(restaurantId);`
  - `useSocketEvents.js:153` — `const unsubscribeTable = subscribe(tableChannel, handleTableChannelEvent);`
  - `useSocketEvents.js:162–166` — active logging "Subscribed to table channel successfully"
- **Status**: **Partial answered** — **code observation is unambiguous: the subscription IS live**. The contradiction is in the STALE COMMENTS, not in code behavior. What remains open is the product/architect intent (is the live behavior correct or is the comment the intent?).
- **Evidence**: Lines above.
- **Confidence**: HIGH (observation) / LOW (intent).
- **Gap**: Architect/product decision.

### OQ-107 — How does the WebSocket authenticate?

- **Status**: **Open**
- **Current Code Reality (v3)**: `socketService.js:43–71` — `io(SOCKET_CONFIG.URL, connectionOptions)` where `connectionOptions` contains only reconnection/transport fields. No `auth`, `query`, `extraHeaders`, or cookie handling.
- **Gap**: Backend infra team must confirm.

### OQ-108 — How are engage locks recovered on disconnect?

- **Status**: **Open**
- **Current Code Reality (v3)**: `engagedOrders` / `engagedTables` are in-memory Sets. No reconnect-flush. No backend replay event visible in handlers.
- **Gap**: Product decision.

### OQ-109 — Why does `handleUpdateFoodStatus` still engage the table as a workaround?

- **Status**: **Open**
- **Current Code Reality (v3)**: `socketHandlers.js:325–353` — workaround still present. Comment (line 303–305): "TODO: Remove this workaround when backend emits table socket for item status changes."
- **Gap**: Backend status.

### OQ-110 — What is the contract for `order-engage` message format?

- **Status**: **Open**
- **Current Code Reality (v3)**: `useSocketEvents.js:116–122` confirms the format `[orderId, restaurantOrderId, restaurantId, status]` with no event-name prefix. Unique relative to other channels.
- **Gap**: Backend rationale.

### OQ-111 — Why is `NotificationContext` above `RestaurantContext`?

- **Status**: **Open** (design choice — low priority)
- **Current Code Reality**: Unchanged; `AppProviders.jsx` provider order is Auth → Socket → Notification → Restaurant → …

---

## API & Integration Questions

### OQ-201 — Which toast system is canonical: shadcn Toaster or Sonner?

- **Question**: Is Sonner a planned migration, or dead code?
- **Previous Understanding (v2)**: Both files exist; App.js mounts shadcn toaster; Sonner's use unclear.
- **Current Code Reality (v3)**: SAME — plus new grep evidence: `grep -rn "from.*sonner"` returns ONE hit, inside `ui/sonner.jsx` itself. **No other file in the codebase imports sonner**.
- **Status**: **Answered (code-level)**: Sonner is dead code. The shadcn `<Toaster />` from `ui/toaster.jsx` (mounted in `App.js:29`) is canonical.
- **Evidence**: `App.js:6, 29`; `ui/sonner.jsx:2` (self-reference only); `ui/toaster.jsx` (used by App).
- **Confidence**: HIGH.
- **Gap**: None code-wise; just needs cleanup PR (remove `ui/sonner.jsx` + remove `sonner` from `package.json`).

### OQ-202 — What is the expected shape of `place-order` response for `order_id` capture?

- **Status**: **Open**
- **Current Code Reality (v3)**: `OrderEntry.jsx:1102–1106` still tries three shapes sequentially: `res.data.order_id`, `res.data.data.order_id`, `res.data.new_order_ids[0]`.
- **Gap**: Backend response shape canonicalization.

### OQ-203 — Can the CRM API key rotate mid-session?

- **Status**: **Open**
- **Current Code Reality**: `setCrmRestaurantId(id)` called once on login (`LoadingPage` → `profileService.getProfile`). Map `REACT_APP_CRM_API_KEYS` parsed once at module load (`crmAxios.js:13–16`).
- **Gap**: Ops process for key rotation.

### OQ-204 — Are the `src/data/mock*` files used at runtime or only in tests?

- **Question**: Which are reference data and which are legacy fallbacks?
- **Previous Understanding (v2)**: Claimed imports in "SettingsPanel, ListFormViews, ViewEditViews, shared.jsx".
- **Current Code Reality (v3)**: **v2 was wrong on import sites.** Actual runtime imports (verified by `grep -rn "from ['\"].*data"`):
  - `components/order-entry/ItemNotesModal.jsx:4` — imports `itemLevelPresets, getCustomerPreferences` (LIVE — notes presets are reference data)
  - `components/order-entry/OrderNotesModal.jsx:4` — imports `orderLevelPresets, getCustomerPreferences` (LIVE — same)
  - `components/cards/TableCard.jsx:5` — imports `mockOrderItems` (DEAD — assigned to `orderData` at line 57, never read)
- **Status**: **Answered (code-level)**:
  - `data/notePresets.js` is active reference data used by note-entry modals.
  - `data/mockOrderItems` (from `mockTables.js`) is dead in production; only referenced in `TableCard.jsx` as a dead variable.
  - Other `mock*` files (`mockCustomers`, `mockMenu`, `mockOrders`, `mockConstants`) have NO production importers.
  - V2's claim that imports exist in `SettingsPanel`, `ListFormViews`, `ViewEditViews`, `shared.jsx` is **CONTRADICTED** by grep.
- **Evidence**: `grep -rn "from ['\"]\.\./\(\.\./\)*data"` on `frontend/src/`.
- **Confidence**: HIGH.
- **Gap**: None code-wise. Cleanup recommendation in RISK-032.

### OQ-205 — What is the `plugins/health-check` CRACO plugin for?

- **Status**: **Open**
- **Current Code Reality**: `frontend/plugins/health-check/` still exists; not inspected in v3 (scope: source only).

### OQ-206 — Do any flows still use legacy `handleUpdateOrder`?

- **Question**: Is there any code path that imports `handleUpdateOrder` directly?
- **Previous Understanding (v2)**: Legacy kept "for rollback"; likely no direct callers.
- **Current Code Reality (v3)**: `grep -rn "handleUpdateOrder" --include="*.js" --include="*.jsx" frontend/src/` shows usage only in `socketHandlers.js` (definition at line 204) and (per barrel) `api/socket/index.js`. **Zero call sites**. `useSocketEvents.js:68–70` routes `update-order` via `handleOrderDataEvent('update-order')`.
- **Status**: **Answered (code-level)**: `handleUpdateOrder` is confirmed dead code. Its body just forwards to `handleOrderDataEvent` so calling it would work, but nothing calls it.
- **Evidence**: grep above; `useSocketEvents.js:68–70`.
- **Confidence**: HIGH.
- **Gap**: Safe to delete in a cleanup PR.

---

## Printing Questions

### OQ-301 — Why does `printOrder('bill', null, order, ...)` take `stationKot=null` when print_type is bill?

- **Status**: **Open** (ergonomic/signature leak; code-level observation confirmed)

### OQ-302 — Who validates that the printer is online / bill printed successfully?

- **Status**: **Open**
- **Current Code Reality**: `printOrder` returns the print-temp-store endpoint's response. Caller shows toast only.
- **Gap**: Printer status feedback loop not in frontend scope.

### OQ-303 — Auto-print on new-order only or also on update?

- **Status**: **Open** (product decision)
- **Current Code Reality (v3)**: `OrderEntry.jsx:1140–1142` comment explicitly states auto-print is scoped to new-order only; `autoPrintNewOrderIfEnabled` is only called at line 1134 after place-order success.

---

## Reports & Reporting Questions

### OQ-401 — How does the business-day range handle DST transitions?

- **Status**: **Open**
- **Current Code Reality**: `utils/businessDay.js` unchanged.

### OQ-402 — Are "merged orders" distinct from "transferred orders"?

- **Status**: **Open**
- **Current Code Reality**: `reportTransform.js` has both `filterMergedOrders` and `filterRoomTransferOrders`. Semantic distinction not declared in code.

---

## UI / UX Questions

### OQ-501 — `USE_CHANNEL_LAYOUT` and `USE_STATUS_VIEW` — are they permanent?

- **Question**: Are these now the default UX? When will legacy paths be removed?
- **Previous Understanding (v2)**: Both `true`, described as rollback switches.
- **Current Code Reality (v3)**: SAME — `constants/featureFlags.js` has both hardcoded to `true`. Flag bodies have explicit "Rollback: Set to false to revert …" comments.
- **Status**: **Answered (code-level)**: Both flags are **permanently on in code**, but a rollback path is explicitly preserved. No runtime toggle UI exists; changing them requires a code edit + redeploy.
- **Evidence**: `constants/featureFlags.js` lines 21, 38.
- **Confidence**: HIGH.
- **Gap**: Product decision on when to remove legacy paths.

### OQ-502 — Why does `serviceChargeEnabled` default to ON on every render of CollectPaymentPanel?

- **Question**: Should it persist per-session or per-restaurant default?
- **Previous Understanding (v2)**: `useState(true)` on every mount.
- **Current Code Reality (v3)**: SAME — `CollectPaymentPanel.jsx:140` `useState(true)`.
- **Status**: **Partial answered (code-level)**: Code confirms non-persistent default-ON. **UX intent** is still unclear (is this a feature or oversight?).
- **Evidence**: Line above.
- **Confidence**: HIGH (observation) / LOW (intent).
- **Gap**: Product decision.

### OQ-503 — Mobile / touch UX?

- **Status**: **Open**

### OQ-504 — Why two `useEffect` in OrderEntry for syncing from OrderContext (one with stale dep)?

- **Status**: **Open**

---

## Testing Questions

### OQ-601 — What is `setupTests.polyfills.js`?

- **Question**: What polyfills are required for Jest / jsdom?
- **Previous Understanding (v2)**: Contents not inspected.
- **Current Code Reality (v3)**: File exists at `src/setupTests.polyfills.js`. **Not audited in v3** either — scope was to re-validate v2 claims. Answer still requires direct inspection.
- **Status**: **Open** (unchanged — could easily be answered by a 20-line file read, but scope kept tight).
- **Gap**: Read the file if deemed important.

### OQ-602 — Is the `paymentService.test.js` test currently passing?

- **Question**: How does CI pass today?
- **Previous Understanding (v2)**: T2 asserts `CLEAR_BILL` exists; constants has no such key.
- **Current Code Reality (v3)**: SAME — `__tests__/api/paymentService.test.js:17–21` asserts `API_ENDPOINTS.CLEAR_BILL` exists and matches `/^\/api\//`. `constants.js` has **no `CLEAR_BILL` key**. The test **WILL FAIL when run**.
- **Status**: **Open** (observation is clear; CI status is external).
- **Evidence**: Test file + constants file.
- **Confidence**: HIGH (on contradiction) / LOW (on CI behavior — possibly no CI, or failing tests ignored).
- **Gap**: Need access to CI configuration to confirm whether tests are run in PR pipeline.

### OQ-603 — Do any tests cover the v2 socket event handlers?

- **Status**: **Open**
- **Current Code Reality**: Relevant test files exist — `updateOrderStatus.test.js`, `socketEvents.test.js`, `socketServiceGlobal.test.js`. Scope & coverage not audited in v3.
- **Gap**: Read the files to confirm which handlers are covered.

---

## Deployment & Environment

### OQ-701 — Are all required env vars surfaced in a `.env.example`?

- **Status**: **Open**
- **Current Code Reality**: No `.env.example` in repo (re-verified via `ls frontend/`). README does not enumerate required vars.
- **Gap**: Add an `.env.example` file.

### OQ-702 — Why does `backend/requirements.txt` declare many unused deps?

- **Status**: **Open**

### OQ-703 — Why does `backend/server.py` exist in this frontend-focused repo at all?

- **Status**: **Open**

---

## NEW v3 Questions (from re-validation)

### OQ-801 — [NEW] Why does the current commit history lack v2's reference commit `b32dec9`?

- **Context**: v2 docs were generated at commit `b32dec9`. That commit is not reachable in current history (`git cat-file -e b32dec9` → "Not a valid object name"). Current HEAD is `7f87721`. Recent commits named "Auto-generated changes" / "auto-commit …".
- **Question**: Was the history rewritten (force-push)? Was v2 generated from a throwaway branch?
- **Impact**: MEDIUM for audit trail; LOW for current code state (bit-level check confirms code is unchanged).
- **Confidence in observation**: HIGH.
- **Gap**: Git history / ops question.

### OQ-802 — [NEW] Is the dead `orderData = mockOrderItems[table.id]` in `TableCard.jsx` truly unused, or is it a placeholder for a future feature?

- **Context**: `TableCard.jsx:5` imports `mockOrderItems`; `:57` assigns to `orderData`; grep confirms `orderData` has no other occurrences in the file.
- **Question**: Safe to delete, or is there a planned feature expecting this variable?
- **Impact**: LOW.
- **Confidence**: HIGH (observation).
- **Gap**: Product input or git blame.

---

## Answered Questions — Concise Summary

| ID | Short answer |
|---|---|
| **OQ-104** | Active endpoint = `BILL_PAYMENT` (`/api/v2/vendoremployee/order/order-bill-payment`). `paymentService.collectPayment` is dead. `CLEAR_BILL` is not a real endpoint. |
| **OQ-201** | Canonical toast = shadcn `<Toaster />` from `ui/toaster.jsx`. Sonner is dead — zero imports outside its own definition file. |
| **OQ-204** | `notePresets` = live reference data. `mockOrderItems` = dead in TableCard. Other mocks have no production importers. V2's import-site list was wrong. |
| **OQ-206** | `handleUpdateOrder` is confirmed dead — zero call sites, routed via `handleOrderDataEvent` instead. |
| **OQ-501** | Both feature flags hardcoded `true` permanently in code; rollback switches preserved but no runtime toggle. |
| **OQ-601** | Not audited (but easily answerable — file is 1 file, read it if needed). |

---

## Partial Questions — Concise Summary

| ID | What's answered (code) | What's still open (intent) |
|---|---|---|
| **OQ-106** | Table channel IS subscribed at runtime (unambiguous). Comments claiming BUG-203 removed it are stale. | Architect intent: is live behavior correct or the comments correct? |
| **OQ-502** | `serviceChargeEnabled = useState(true)` — non-persistent, defaults ON every mount. | UX intent: should staff's previous choice persist? |

---

## Contradicted v2 Claims — Concise Summary

| # | v2 claim | v3 reality | Evidence |
|---|---|---|---|
| C-1 | "Default branch = `7th-april-v1-`" | Default branch = `main` | `git ls-remote --symref origin HEAD` → `ref: refs/heads/main HEAD` |
| C-2 | "18 test files under `__tests__/`" | **17 test files** | `find __tests__ -type f -name "*.test.*" \| wc -l` = 17 |
| C-3 | "47 shadcn UI primitives" | **46 primitives** | `ls components/ui \| wc -l` = 46 |
| C-4 | "15 .wav notification chimes" | **14 chimes** | `ls public/sounds \| wc -l` = 14 |
| C-5 | "38 named endpoints in `API_ENDPOINTS`" | **42 keys** | Hand count of `constants.js:6–74` |
| C-6 | Mock data imports in "SettingsPanel, ListFormViews, ViewEditViews, shared.jsx" | Imports in `ItemNotesModal`, `OrderNotesModal`, `TableCard` | `grep -rn "from ['\"].*\.\./data"` |

All six contradictions are minor (documentation accuracy) and do not invalidate any architectural or risk conclusion in v2.

---

## Highest-Impact Open Questions (v3)

| Rank | ID | Topic | Why it matters |
|---|---|---|---|
| 1 | OQ-101 | SC/tax calculation canonical rule | Direct financial correctness; 3-place divergence |
| 2 | OQ-102 | Missing-payload fallback behavior | Silent UX failure on socket payload absence |
| 3 | OQ-107 | WebSocket authentication | Security (privacy leak if WS is unauth) |
| 4 | OQ-108 | Engage lock recovery on disconnect | Stuck UI in poor network |
| 5 | OQ-002 | Remove-vs-update branching semantics | Dashboard data integrity |
| 6 | OQ-202 | `place-order` response shape | BUG-273 auto-print silent break if backend changes |
| 7 | OQ-009 | Permission enumeration | Authorization completeness |
| 8 | OQ-006 | `defaultOrderStatus` semantics per restaurant | Possible silent auto-settle |
| 9 | OQ-603 | v2 socket handler test coverage | Regression safety |
| 10 | OQ-105 | Bill-print discount-adjusted tax intent | Printed bill vs backend record |
