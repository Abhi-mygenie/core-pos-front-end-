# Three Requirements — V3 Validation & Gap Analysis (v2)

- **Validation Type:** Read-only product + technical validation against V3 documentation set and current frontend code.
- **Repo branch:** `roomv2`; cross-referenced V3 baseline commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`.
- **Source of truth:** `/app/v3/*` and selected `/app/memory/*` docs.
- **Status:** STOP — Owner approval required before implementation handover. Each gap below has explicit lettered questions; answer each.
- **v2 update vs v1 of this doc:**
  - Req 1 understanding **corrected**: `employee-menu` is confirmed by Abhishek as a **real, separate** endpoint, **NOT** the same as `station-order-list` (which powers `StationPanel` / the KDS/BAR station view). `employee-menu` is currently NOT being recalled on socket order activity. New gaps added accordingly.
  - Req 2 + 3 elaborated with sub-questions Q-#a/b/c/d so answers can be given inline.

---

## Updated Learning About Employee-Menu Panel (Req 1)

| Item | Current state in code | Per Abhishek |
|---|---|---|
| `GET /api/v1/vendoremployee/employee-menu` | Not present anywhere in frontend (`grep` confirmed: zero hits in `/app/frontend/src/`, `/app/v3/*`, `/app/memory/*` except this validation doc) | Real endpoint. Not for station view. Powers the left-side Kitchen/BAR preparing-count panel. |
| `POST /api/v1/vendoremployee/station-order-list` | In use by `StationPanel` (`stationService.fetchStationData` → `LoadingPage.jsx:143`) — drives the KDS/BAR aggregated category view | Different concern. Out of scope for this requirement. |
| Socket-driven refresh of `employee-menu` | Does not exist | Required behavior — fire on new/edited/made/ready/served events. |

**Implication:** `employee-menu` is either:
- (a) a brand-new endpoint to be wired into a brand-new or existing UI element, OR
- (b) wired in another sibling repo/branch and the consumer needs to be brought into `roomv2`, OR
- (c) intended to populate a panel that hasn't been built yet.

We need Abhishek's answer in **Q-1G** below before we can pick a concrete consumer.

---

## Requirement 1 — Employee Menu Refresh on Socket Order Activity

### 1.1 Requirement
> The left-side Kitchen/BAR preparing count panel comes from `GET /api/v1/vendoremployee/employee-menu`. Whenever order activity happens through sockets, this API should be re-called and the panel refreshed. Events: new order taken, order edited/updated, item/order marked ready, item/order marked served.

### 1.2 V3 Coverage
- **None.** No AD/OQ/RISK/GAP entry exists in `/app/v3/*` for this surface. Adding this behavior will need a new AD (e.g., `AD-Employee-Menu-Refresh`) post-approval.

### 1.3 Current Code Behavior
- Endpoint `employee-menu`: not referenced anywhere in `/app/frontend/src/`.
- Socket events fully wired (`useSocketEvents.js`):
  - `NEW_ORDER` → `handleNewOrder`
  - `UPDATE_ORDER` / `UPDATE_ORDER_TARGET` / `UPDATE_ORDER_SOURCE` / `UPDATE_ORDER_PAID` → `handleOrderDataEvent`
  - `UPDATE_ITEM_STATUS` → `handleOrderDataEvent`
  - `UPDATE_FOOD_STATUS` → `handleUpdateFoodStatus`
  - `UPDATE_ORDER_STATUS` → `handleUpdateOrderStatus`
  - `SCAN_NEW_ORDER` → `handleScanNewOrder`
  - `DELIVERY_ASSIGN_ORDER` → `handleDeliveryAssignOrder`
  - `SPLIT_ORDER` → `handleSplitOrder`
- Each handler updates `OrderContext` / `TableContext`. None touch `employee-menu`.

### 1.4 Existing Patterns Available to Reuse
- `useRefreshAllData` hook — used by Sidebar Refresh button.
- `axios` via `frontend/src/api/axios.js` — for the HTTP call.
- Service file pattern — e.g., `frontend/src/api/services/stationService.js` is a good template; we'd add `employeeMenuService.js`.
- A debounce util — none ready-made; small `setTimeout`/`clearTimeout` ref is fine.

### 1.5 Gaps & Questions (Answer Each)

#### Q-1A — Endpoint contract
- (a) HTTP method: `GET` confirmed?
- (b) Authentication: standard Bearer (same as other vendoremployee APIs, via `frontend/src/api/axios.js`)?
- (c) Query params or path params: any? (e.g., `restaurant_id`, `role_name`, `def_order_status`?) — please paste a sample successful request URL.
- (d) Response shape: please share an example response body so we know the field names to render.

> **Your answer:** _______________________________________

#### Q-1B — Consumer (which UI panel renders this data)
The "left-side Kitchen/BAR preparing count panel" is ambiguous in current code:
- (a) Is the consumer the **existing `StationPanel`** at `frontend/src/components/station-view/StationPanel.jsx` (currently fed by `station-order-list`)? If yes, do we **replace** `station-order-list` with `employee-menu`, or do **both** coexist?
- (b) Is the consumer a **different existing component** I have not located? If yes, file path?
- (c) Is the consumer a **new component to be created**? If yes, please describe its visual layout (Kitchen count + BAR count side-by-side? Stacked? Inside Sidebar? Inside Header? On dashboard left rail?).

> **Your answer:** _______________________________________

#### Q-1C — Initial fetch
- (a) Should `employee-menu` be fetched once on app load (e.g., from `LoadingPage.jsx`, similar to how `station-order-list` is fetched today)?
- (b) Or only on socket activity (lazy)?
- (c) Or both — initial load + socket refresh?

> **Your answer:** _______________________________________

#### Q-1D — Set of socket events that must trigger refresh
For each event, mark **YES** (refresh) or **NO** (skip):

| Socket event | Triggered when | Default suggestion | Your call |
|---|---|---|---|
| `NEW_ORDER` (`new-order`) | new order taken | YES | ___ |
| `UPDATE_ORDER` (`update-order`) | items added / order edited | YES | ___ |
| `UPDATE_ORDER_TARGET` | merge/transfer destination updated | YES | ___ |
| `UPDATE_ORDER_SOURCE` | merge/transfer source updated | YES | ___ |
| `UPDATE_ORDER_PAID` (`update-order-paid`) | order moves to paid (off preparing) | YES | ___ |
| `UPDATE_ITEM_STATUS` | item-level status flip (preparing→ready→served) | YES | ___ |
| `UPDATE_FOOD_STATUS` (legacy) | item status flip via legacy event | YES | ___ |
| `UPDATE_ORDER_STATUS` | order-level status flip | YES | ___ |
| `SCAN_NEW_ORDER` | aggregator (Swiggy/Zomato) scan new order | YES | ___ |
| `DELIVERY_ASSIGN_ORDER` | delivery-only assignment change | NO (no impact on KDS/BAR prep count) | ___ |
| `SPLIT_ORDER` | order split into two | YES (item distribution changed) | ___ |
| `UPDATE_TABLE` (`update-table`) | table engage/release only | NO | ___ |
| `ORDER_ENGAGE` (`order-engage`) | UI lock event only | NO | ___ |

> **Your answer:** _______________________________________

#### Q-1E — Refresh granularity & debounce
- (a) Should the refresh fire on **every** matching socket event (simple, chatty), or **debounced** to coalesce bursts? If debounced, suggested window: 300–500 ms trailing. Confirm or override.
- (b) Should the refresh run in **parallel** with regular order/table updates (independent fire-and-forget), or be **sequenced** (await debounce, then call)?
- (c) Should the panel show a "loading" / "refreshing" indicator during the fetch, or stay on stale-data with no visible indicator?

> **Your answer:** _______________________________________

#### Q-1F — Failure handling
- (a) On HTTP failure (5xx, network), should the panel: (i) keep stale data silently, (ii) show an error indicator, (iii) toast the user, (iv) retry once?
- (b) On 401, do we log the user out (consistent with the existing `axios.js` 401 redirect), or quietly fail this background call?

> **Your answer:** _______________________________________

#### Q-1G — Initial load + visibility gating
- (a) Should the panel always be rendered, or gated behind a feature flag / restaurant flag / permission?
- (b) Should refreshing be skipped while the panel is hidden (e.g., visibility-settings disabled), to avoid wasted HTTP?

> **Your answer:** _______________________________________

#### Q-1H — Cross-tab / multi-window behavior
- If two tabs/windows are open for the same operator, both will receive the same socket events. Both will refresh. Acceptable? Or should we suppress duplicate fetches (e.g., via `BroadcastChannel`)?

> **Your answer:** _______________________________________

### 1.6 Files Likely Involved (no edits in this validation cycle)
- New: `frontend/src/api/services/employeeMenuService.js` (helper).
- New or extended: `frontend/src/contexts/EmployeeMenuContext.jsx` (or extend `StationContext`).
- `frontend/src/api/socket/socketHandlers.js` (call refresh after order updates).
- `frontend/src/api/socket/useSocketEvents.js` (only if a top-level subscriber is needed).
- `frontend/src/pages/LoadingPage.jsx` (initial fetch, if Q-1C answer is initial load).
- The consumer component (per Q-1B answer).

### 1.7 Risk / Impact
- LOW once endpoint contract (Q-1A) and consumer (Q-1B) are confirmed.
- HIGH if the consumer is misidentified — silent data staleness, blank panel.
- MEDIUM if no debounce — call rate could spike during burst events.

---

## Requirement 2 — Add Button Visibility Setting

### 2.1 Requirement
> The top-right Add button used for taking/adding orders should be controlled from Visibility Settings — add a configuration to show/hide this Add button.

### 2.2 V3 Coverage
- **None.** No AD/OQ/RISK/GAP entry exists. The PRD lists a P3 future task: "Migrate localStorage-based visibility settings to user-role permissions."

### 2.3 Current Code Behavior
- Add button: `frontend/src/components/layout/Header.jsx:592-600`. Rendered unconditionally (no visibility flag).
- Wired: `Header.jsx onAddOrder` → `DashboardPage.jsx handleAddOrder` (line 1053).
- Existing visibility-settings infrastructure (all in `frontend/src/pages/StatusConfigPage.jsx`):
  - `STORAGE_KEY = 'mygenie_enabled_statuses'` (which statuses appear in Header filters).
  - `STATION_VIEW_STORAGE_KEY = 'mygenie_station_view_config'` (StationPanel on/off + which stations).
  - `CHANNEL_VISIBILITY_STORAGE_KEY = 'mygenie_channel_visibility'` (which channels appear).
  - `LAYOUT_TABLE_VIEW_KEY` / `LAYOUT_ORDER_VIEW_KEY` (column counts per channel).
  - `VIEW_MODE_TABLE_ORDER_KEY` / `VIEW_MODE_CHANNEL_STATUS_KEY` (admin-locks Sidebar view-mode toggles).
- Sidebar already has a "Visibility Settings" group (`Sidebar.jsx:74-80`) → opens `/visibility/status-config`.

### 2.4 Gaps & Questions (Answer Each)

#### Q-2A — Authority model
Pick ONE that matches the desired behavior:
- (a) **Admin-locked single value** — owner sets `visible | hidden` in Settings; cashier cannot toggle live. Mirrors `VIEW_MODE_TABLE_ORDER_KEY` Task-1 lock.
- (b) **Cashier-toggleable** — show a quick toggle in Header (or Sidebar) so any logged-in user can flip it live. Mirrors Channel filter chip.
- (c) **Hybrid** — admin can either set a hard lock (`visible` / `hidden`) or leave it `cashier-toggle`. Cashier toggle visible only when admin chose `cashier-toggle`.
- (d) **Permission-backed** — gate by an existing permission key (e.g., `pos.add` or `order.create`) and skip the visibility-settings UI altogether.

> **Your answer:** _______________________________________

#### Q-2B — Granularity
Pick ONE:
- (a) **Global toggle** — one switch for the entire Add button regardless of channel.
- (b) **Per-channel toggle** — separate switches for Add button when channel = dineIn, takeAway, delivery, room. (Note: channels are themselves visibility-controlled — this would compound.)
- (c) **Per-order-type** — separate switches for the 4 ORDER_TYPES inside the Add button's order-type dropdown.
- (d) **Per-role** — different visibility per `userRole` (Waiter / Manager / Owner).

> **Your answer:** _______________________________________

#### Q-2C — Default value
- (a) Default `visible` (preserves current behavior for tenants who don't open Settings)? Recommended.
- (b) Default `hidden`?

> **Your answer:** _______________________________________

#### Q-2D — Storage key & shape
- (a) Localstorage key name — propose: `mygenie_add_button_visibility`. Acceptable, or prefer something else?
- (b) Shape — propose for Q-2A=(a) and Q-2B=(a):
  ```json
  { "enabled": true }
  ```
  For Q-2A=(c) + Q-2B=(b):
  ```json
  {
    "lockMode": "cashier-toggle",
    "channels": { "dineIn": true, "takeAway": true, "delivery": true, "room": true }
  }
  ```
  Confirm or revise.

> **Your answer:** _______________________________________

#### Q-2E — Cross-tab sync
- The Task-1 view-mode lock uses `storage` event listening so changes in one tab propagate to others. Should the Add button visibility also use `storage` event sync? (Recommended: YES.)

> **Your answer:** _______________________________________

#### Q-2F — Sidebar Visibility Settings UI placement
- The new toggle should appear inside `StatusConfigPage.jsx`. Where exactly?
  - (a) New row at top, above "Status Configuration".
  - (b) New section "UI Elements" with sub-rows (Add button, others later).
  - (c) Inside the existing "Channel Visibility" card.

> **Your answer:** _______________________________________

#### Q-2G — Edge case: Add Order entry alternatives
- If the Add button is hidden, are there OTHER ways to start a new order today (e.g., clicking an empty table card)? Should those alternates also be hidden, or remain available as escape hatches?

> **Your answer:** _______________________________________

#### Q-2H — Permissions interaction
- Today there's no permission gate on this button. If we add a visibility flag, should it be ANDed with a permission (e.g., `hasPermission('order')`)? Pure visibility flag wins, even if user has permission?

> **Your answer:** _______________________________________

### 2.5 Files Likely Involved
- `frontend/src/components/layout/Header.jsx` (gate render at lines 591–600).
- `frontend/src/pages/StatusConfigPage.jsx` (add toggle row + persist).
- `frontend/src/pages/DashboardPage.jsx` (only if we choose to thread a flag prop down; not required if `Header.jsx` reads localStorage directly).

### 2.6 Risk / Impact
- LOW. Pure UI gating, no payload/socket impact.
- One pitfall: if `Header.jsx` doesn't subscribe to `storage` events, change-in-Settings won't propagate to other open tabs.

---

## Requirement 3 — Room Order Bill Print Payload

### 3.1 Requirement
> For room orders:
> - Auto bill print should NOT be applicable, even if auto bill flag is passed.
> - Room bill print payload must be compared against Collect Bill data; payload must include: room details, advance payment, balance payment, total room amount, associated orders, room service orders, total associated order amount, and final payable amount.

### 3.2 V3 Coverage
- `AD-013A` SC gating room caveat — partial.
- `AD-105` tax/print parity — silent on rooms.
- `AD-302` collect-bill ↔ print parity — assumes auto-print fires when `settings.autoBill=true`; **direct conflict** with Req 3 auto-bill suppression.
- `RISK-018` tax/SC consistency — related but not room-specific.
- `OWNER_REVIEW_PACKET.md B-02` (settlement authority) — related but doesn't decide print contract.

### 3.3 Current Code Behavior

**Auto-bill suppression for rooms — DOES NOT EXIST today.**
- `OrderEntry.jsx:1310` (Scenario 1, postpaid): `if (settings?.autoBill && collectOrderId) { ... await printOrder(...); }` — no `isRoom` guard.
- `OrderEntry.jsx:1262` (Scenario 2, prepaid): `await autoPrintNewOrderIfEnabled(newOrderId);` — no `isRoom` guard.
- `OrderEntry.jsx:1093` (`autoPrintNewOrderIfEnabled`): only checks `settings?.autoBill` — no `isRoom` guard.

**Room print payload — current `buildBillPrintPayload()` shape** (`orderTransform.js:1017-1245`):

| Field | Current value | Source |
|---|---|---|
| `order_id`, `restaurant_order_id` | from order | order |
| `print_type` | `'bill'` | constant |
| `payment_amount`, `grant_amount` | overrides ?? `order.amount` | overrides |
| `order_item_total`, `order_subtotal` | overrides ?? computed | overrides |
| `discount_amount`, `coupon_code`, `loyalty_dicount_amount`, `wallet_used_amount` | overrides ?? 0/'' | overrides |
| `serviceChargeAmount` | overrides ?? computed (gated `dineIn||isRoom`) | overrides |
| `gst_tax`, `vat_tax`, `delivery_charge`, `Tip` | overrides ?? computed | overrides |
| `billFoodList` | rawDetails minus 'check in' marker | derived |
| `tablename` | `'WC'` / `'TA'` / `'Del'` / tableNumber | derived |
| **`roomRemainingPay`** | **`0` HARDCODED** | constant |
| **`roomAdvancePay`** | **`0` HARDCODED** | constant |
| **`roomGst`** | **`0` HARDCODED** | constant |
| **NOT EMITTED** | `associatedOrders[]`, `roomPrice`, `associatedOrdersTotal`, `finalPayable` | n/a |

**CollectPaymentPanel actually computes the values that should be on the print** (`CollectPaymentPanel.jsx`):
- `roomBalance` (line 110-113): from `roomInfo.balancePayment`.
- `roomInfo.roomPrice / advancePayment / balancePayment` rendered (lines 854-866).
- `associatedOrders[]` rendered with count + `associatedTotal` (lines 874-915).
- Grand total formula (line 543): `(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance`.
- Architectural rule (`orderTransform.js:269-271`): "room balance has NO SC, NO GST, NO discount applied — pass-through ₹ amount added to grand_total via `grand_total` field."

**Source of room data** (`fromAPI.order` lines 248-277): `associatedOrders[]` from `api.associated_order_list[]`; `roomInfo` from `api.room_info`. Both available in the `order` arg passed to `buildBillPrintPayload`.

### 3.4 Gaps & Questions (Answer Each)

#### Q-3A — Auto-bill suppression scope
Pick ONE:
- (a) **Strict** — block auto-bill for ANY order where `isRoom===true`, both Scenario 1 (postpaid collect-bill) and Scenario 2 (prepaid place+pay).
- (b) **Postpaid-only** — block only Scenario 1; allow Scenario 2 to print (rare path for fresh prepaid against a room).
- (c) **Balance-conditional** — block only when `roomInfo.balancePayment > 0` (real room booking); allow auto-print when room order has no booking (food-only).
- (d) **Other** — describe.

> **Your answer:** _______________________________________

#### Q-3B — Manual Print Bill button for rooms
- The `Print Bill` button in `CollectPaymentPanel` calls the same `buildBillPrintPayload`. Should it:
  - (a) Stay enabled for rooms (recommended, gives cashier a print path), and emit the enriched payload (per Q-3D-Q-3F).
  - (b) Be disabled for rooms.
  - (c) Stay enabled but emit a different payload than auto-bill (advanced; not recommended).

> **Your answer:** _______________________________________

#### Q-3C — Backend printer template knowledge
- Does the backend printer template / `order-temp-store` already understand any of the proposed new keys (e.g., `roomPrice`, `associatedOrders`, `finalPayable`)? Please confirm — this drives whether we (i) populate existing keys (`roomRemainingPay` / `roomAdvancePay` already in payload as `0`) or (ii) add new keys.

> **Your answer:** _______________________________________

#### Q-3D — Exact print-payload key contract
For each requirement field, confirm key name + type. Defaults are my proposals; override if backend expects different names.

| Requirement field | Proposed key | Type | Source field | Confirm? |
|---|---|---|---|---|
| Room details (label/number) | `tablename` (existing) — room number string | string | `order.tableNumber` | (Y / change to `roomLabel`?) ___ |
| Advance payment | `roomAdvancePay` (existing key, currently `0`) | number | `order.roomInfo.advancePayment` | ___ |
| Balance payment | `roomRemainingPay` (existing key, currently `0`) | number | `order.roomInfo.balancePayment` | ___ |
| Total room amount | NEW key `roomPrice` (or `roomTotalAmount`?) | number | `order.roomInfo.roomPrice` | ___ |
| Associated orders | NEW key `associatedOrders[]`: `[{ order_id, restaurant_order_id, amount, transferred_at }]` | array | `order.associatedOrders` | ___ |
| Room service orders | reuse existing `billFoodList` (food items in this room order) | array | `order.rawOrderDetails` | (Y / different?) ___ |
| Total associated order amount | NEW key `associatedOrdersTotal` | number | sum of `associatedOrders[].amount` | ___ |
| Final payable amount | reuse `payment_amount` and `grant_amount` (already populated)? OR new key `finalPayable`? | number | `(finalTotal + associatedTotal) + roomBalance` | ___ |

> **Your answer:** _______________________________________

#### Q-3E — `roomGst` semantics
- Currently `roomGst: 0` is hardcoded. Should it:
  - (a) Stay `0` always (room balance has no GST, per architectural rule at `orderTransform.js:269-271`).
  - (b) Carry GST on the room balance when `room_gst_applicable === 'Yes'` (per `room_module_implementation_requirements.md` A6).

> **Your answer:** _______________________________________

#### Q-3F — Tax/SC/Tip applicability
- `CollectPaymentPanel` applies SC, discount, tip ONLY on the room-service food subtotal — NOT on `roomBalance` or `associatedTotal`.
- The print payload must encode this clearly. Confirm:
  - (a) `serviceChargeAmount` = SC on `billFoodList` only (current behavior). YES/NO.
  - (b) `discount_amount` = applies to food subtotal only, not to room balance or associated orders. YES/NO.
  - (c) `Tip` = applies once at the bill level (not duplicated across associated orders). YES/NO.
  - (d) `gst_tax` / `vat_tax` = on food subtotal + SC + tip (current); does NOT include tax on room balance unless Q-3E=(b). Confirm.

> **Your answer:** _______________________________________

#### Q-3G — `paid_room` / `room_id` in print payload
- `orderToAPI.collectBillExisting` already sends `paid_room`, `room_id` on the **collect-bill** payload (lines 780-781). The **print** payload does NOT carry these today. Should print payload also include them?
- (a) YES — add `paid_room` and `room_id` to print payload.
- (b) NO — keep print payload focused on display fields only.

> **Your answer:** _______________________________________

#### Q-3H — Source-of-truth race condition
- `OrderEntry.jsx` Scenario 1 (postpaid collect-bill) prints right after `order-bill-payment` returns, before socket re-engage. The `order` snapshot in context may not yet reflect the just-collected bill.
- Today this is mitigated by passing live overrides from `paymentData`.
- For room print:
  - (a) Trust live `CollectPaymentPanel` values (passed via `overrides`) — same model as today. Recommended.
  - (b) Force a fresh `GET /api/v2/vendoremployee/get-single-order-new` BEFORE printing to refresh `associated_order_list` and `room_info`.

> **Your answer:** _______________________________________

#### Q-3I — Scenario 3 (Transfer to Room) print
- When dine-in cashier picks "To Room" in `CollectPaymentPanel`, the order gets transferred to the room. No bill printed today. Should this flow:
  - (a) Continue without printing (current behavior).
  - (b) Print a transfer-receipt for the source order.
  - (c) Print the room's updated bill including the new associated order.

> **Your answer:** _______________________________________

#### Q-3J — Empty-room (₹0 marker-only) print
- For a checked-in room with only the "Check In" marker and no food/transfers/balance, today auto-print fires (per `ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md:285`) but is "inert" (empty `billFoodList`).
- After Q-3A=strict suppression, this case is automatically suppressed. Confirm acceptable, or do you want a special "checkout receipt" with ₹0 balance?

> **Your answer:** _______________________________________

#### Q-3K — V3 documentation update
- Should V3 docs be amended as part of this change?
  - (a) YES — add new AD `AD-302A` (room auto-print suppression) + new AD `AD-Room-Print-Payload`. Update `RISK-018`. Mark relevant `OWNER_REVIEW_PACKET` items resolved.
  - (b) NO — implementation only, no V3 doc changes (treat as undocumented current behavior).

> **Your answer:** _______________________________________

#### Q-3L — Feature flag / rollback
- Should auto-bill suppression be behind a feature flag (e.g., `restaurant.features.roomAutoBillEnabled` defaulting to `false`) so a tenant can opt back in?
- (a) YES — flag-controlled.
- (b) NO — hard-coded behavior.

> **Your answer:** _______________________________________

### 3.5 Files Likely Involved
- `frontend/src/components/order-entry/OrderEntry.jsx`:
  - Scenario 1 auto-print block at ~line 1310.
  - Scenario 2 `autoPrintNewOrderIfEnabled` at ~line 1093.
- `frontend/src/api/transforms/orderTransform.js`:
  - `buildBillPrintPayload` at line 1017 — populate room fields.
  - `fromAPI.order` lines 248-277 — already provides `associatedOrders` + `roomInfo` (no change needed unless Q-3H=(b)).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`:
  - `handlePrintBill` overrides (lines 875-915, ~1290-1462) — forward room values for manual print parity.
- `frontend/src/api/services/orderService.js`:
  - `printOrder` helper, only if signature changes.
- V3 doc updates per Q-3K.

### 3.6 Risk / Impact
- HIGH if print payload keys don't match backend printer template (Q-3C, Q-3D) → blank/garbled receipts.
- HIGH if auto-bill suppression is partial (Q-3A=(b) by mistake) → inconsistent UX between prepaid and postpaid rooms.
- MEDIUM if discount/SC/tax rules aren't pinned (Q-3F) → mis-billing on rooms with discounts applied.
- LOW for V3 doc churn (Q-3K).

---

## Cross-Cutting

### V3 Docs To Be Amended Post-Approval
- `ARCHITECTURE_DECISIONS_FINAL.md`:
  - `AD-Employee-Menu-Refresh` (new, Req 1).
  - `AD-Visibility-Add-Button` (new, Req 2).
  - `AD-302A — Room auto-print suppression` (new, Req 3).
  - `AD-Room-Print-Payload` (new, Req 3).
- `DOC_VS_CODE_GAP.md` — close after implementation.
- `RISK_REGISTER.md` — re-classify `RISK-018` if Q-3A lands.
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` — mark `OQ-302A` superseded for rooms.

### Test Credentials
- `/app/memory/test_credentials.md` is empty (per fork handoff). End-to-end QA on these requirements will require credentials. Please provide owner/cashier credentials for tenant 478 (`18march`) or equivalent test tenant before the implementation handover is executed.

### Out of Scope For This Validation
- No code changes were made.
- No file under `/app/frontend` or `/app/v3` was edited.

---

## How To Respond

For the fastest implementation handover, please paste your answers under each `> **Your answer:**` line above. Even short answers (e.g., `(a)` or `Q-3A: a, Q-3B: a, Q-3D: confirm all defaults`) are sufficient for any question whose recommended default is acceptable. For Q-1A (endpoint contract) and Q-1B (consumer panel), please share full details — those are the highest-blocking unknowns.

Once received, I will produce `/app/memory/THREE_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md` with:
- exact file ranges to edit (per requirement),
- AD/risk-register update plan,
- sequenced manual + automated test cases,
- rollback strategy,
- and an explicit acceptance checklist tied to your answers above.

---

_End of validation document. No code or production docs modified during this audit._
