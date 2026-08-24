# POS2-003-REOPEN — Cancel/Update `printer_agent` Gap + v1 ↔ v2 Endpoint Revert Review

> **Sprint:** pos2.0
> **CR ID:** POS2-003-REOPEN
> **Title:** `printer_agent` missing in cancel/update flows + place-order endpoint revert review
> **Date:** 2026-05-09
> **Type:** Investigation only — **DO NOT IMPLEMENT in this pass**
> **Branch:** `9-may`
> **Predecessor:** POS2-003 (place-order printer_agent + endpoint v2 → v1) — already shipped
> **Predecessor follow-up:** POS2-003-FU-02 (printer_agent empty on `order-temp-store` Bill print) — already shipped

> **Baseline read order (per playbook):**
> 1. `/app/memory/final/MODULE_DECISIONS_FINAL.md`, `IMPLEMENTATION_AGENT_RULES.md`, `CHANGE_REQUEST_PLAYBOOK.md` ✅
> 2. POS2-003 impact analysis (`POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md`) ✅
> 3. POS2-003 implementation handover (`POS2_003_IMPLEMENTATION_AGENT_HANDOVER_2026_05_08.md`) ✅
> 4. POS2-003 implementation summary (`POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_SUMMARY_2026_05_08.md`) ✅
> 5. POS2-003 QA report + FU-02 gap analysis ✅
> 6. Code: `api/constants.js`, `api/transforms/orderTransform.js`, `api/transforms/printerAgentSelector.js`, `components/order-entry/OrderEntry.jsx`, `api/services/orderService.js`, `contexts/RestaurantContext.jsx` ✅

---

## A — Endpoint review (`place-order`)

### A.1 Current `place-order` endpoint

| File | Line | Value |
|---|---|---|
| `frontend/src/api/constants.js` | **41** | `PLACE_ORDER: '/api/v1/vendoremployee/order/place-order'` |

Comment on the line:
```js
// CR-POS2-003 (May-2026): switched v2 → v1; multipart shape unchanged.
// New order (unpaid + prepaid via payment_status=paid)
```

### A.2 Original / pre-POS2-003 endpoint

`POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_SUMMARY_2026_05_08.md` §5.3 — **Before:** `'/api/v2/vendoremployee/order/place-order'` (v2). Pre-POS2-003 historical truth confirmed by:
- `IMPLEMENTATION_SUMMARY` line 31 — diff cell shows `PLACE_ORDER swapped from /api/v2/.../place-order → /api/v1/.../place-order`.
- `IMPACT_ANALYSIS` §7.1 (R-OWNER-14) — owner-locked: "Endpoint change applies only to `place-order` v2 → v1".
- `IMPLEMENTATION_SUMMARY` §"What changed at the wire" — only difference between v2 and v1 endpoints is the path (multipart shape and field set are identical). v1 added the `printer_agent` field as a new key.

### A.3 What POS2-003 changed re: this endpoint

Two atomic changes wrapped together:
1. **Path swap** — `/api/v2/.../place-order` → `/api/v1/.../place-order`.
2. **Additive field** — `printer_agent: [...]` injected into the payload (postpaid `placeOrder` + prepaid `placeOrderWithPayment`). Empty `[]` when `print_kot:'No'` or no station match.

The body shape (cart, partial_payments, totals, room/address, etc.) was preserved verbatim. No other endpoint constant was modified — confirmed by `IMPLEMENTATION_SUMMARY` test V-9 ("place-order endpoint changed to v1 only").

### A.4 Evidence v2 now accepts `printer_agent`

Owner statement (2026-05-09): "Backend has now added `printer_agent` support to original v2 place-order endpoint."

Pre-existing FE record corroborates this:
- `IMPLEMENTATION_SUMMARY.md` §"Rollback options" — risk row reads:
  > "v1 `place-order` rejects multipart body | `constants.js:41` 1-line revert reverts to v2. v2 still accepts the additive `printer_agent` (BE-PA3). ETA ≤ 5 min hotfix."
- That clause was written assuming **v2 had already been retro-fitted to accept the new field** as part of the BE-PA3 backend question closure. Today's owner statement confirms that closure is now production-real.

No additional evidence is on file in this repo; backend deploy confirmation is owner / backend team's to provide. **Recommend a one-line backend deploy timestamp + log diff in the next iteration.**

### A.5 v1 vs v2 — risk comparison

| Dimension | v1 (`/api/v1/.../place-order`) — current | v2 (`/api/v2/.../place-order`) — proposed revert target |
|---|---|---|
| Multipart body shape | Accepted, unchanged | Accepted, unchanged (same shape per BE-PA3) |
| `printer_agent` field | Accepted (POS2-003 BE deploy already in prod) | Accepted (per owner — BE-PA3 closure) |
| Auth / restaurant scoping | Same vendor-employee bearer | Same |
| Socket emissions (new-order / table-engage) | Confirmed working in QA + production runtime | Confirmed working pre-POS2-003 (this was the production state before the CR) |
| Audit / logging surface | Newer v1 surface — owner rationale for the swap was not stated in the impact analysis (no R-OWNER decision recorded justifying the v1 preference beyond the CR brief) | Long-running surface; unchanged behaviour over the 9-may baseline |
| Rollback time if regressed | 1-line in `constants.js:41` | 1-line in `constants.js:41` |
| Test coverage | `placeOrderPayload.test.js` (10 cases) — endpoint-agnostic, runs against builders only. **No test pins the URL** — so revert is test-safe at the unit-test layer | Same builder-level coverage |

**Risk delta:** very low in either direction. Both endpoints accept the same multipart body and the same `printer_agent` additive field. The main residual uncertainty is **why v1 was chosen** in POS2-003 — the impact analysis records `R-OWNER-14` as the owner directive but does not record the *reason*. If the v1 choice was driven by a backend behaviour difference (audit log, KOT route, kitchen socket channel) rather than just symmetry-of-approach, blindly reverting to v2 could regress that behaviour.

### A.6 Recommendation on v1 → v2 revert

| Question | Answer |
|---|---|
| Mechanically safe to revert today? | **Yes** — single-line change at `constants.js:41`; no builder code touches the path. |
| Should we revert today without owner+backend sign-off? | **No.** Two unknowns block a safe revert: (1) the original *reason* the owner chose v1 in POS2-003 is undocumented; (2) although owner says BE-PA3 is now live for v2, there's no on-file proof that v2's emission of `new-order` socket + table-engage / FCM YTC tone matches v1's behaviour 1:1 today. |
| What to do | **Park the revert** behind two confirmations: (a) owner re-confirms there is no business reason behind the v1 preference (R-OWNER-14 stays valid only if v1≠v2 functionally; if v1==v2 functionally then R-OWNER-14 is mechanical and revert is fine); (b) backend team confirms, ideally with a wire diff between v1 and v2 responses for the same input, that the two endpoints emit identical socket events + FCM payloads. |

**Verdict on this sub-question (A):** `needs_backend_confirmation` + `needs_owner_payload`. Mechanical revert is trivial; behavioural parity between v1 and v2 is unverified.

---

## B — Update / Edit Order gap (`update-place-order`)

### B.1 All update / edit-order APIs and payload builders

| Endpoint constant | Path | HTTP | Body | Builder |
|---|---|---|---|---|
| `API_ENDPOINTS.UPDATE_ORDER` | `/api/v2/vendoremployee/order/update-place-order` | PUT | application/json | `orderToAPI.updateOrder(table, newItems, customer, orderType, options)` — `orderTransform.js:835-908` |
| `API_ENDPOINTS.EDIT_ORDER_ITEM` | `'TBD'` | — | — | not implemented (CHG-040 future) |
| `API_ENDPOINTS.EDIT_ORDER_ITEM_QTY` | `'TBD'` | — | — | not implemented (CHG-040 future) |

Call site (the only one): `OrderEntry.jsx:758`
```js
api.put(API_ENDPOINTS.UPDATE_ORDER, payload)
```
Driver: `handlePlaceOrder()` Scenario 1 — "Update Order" branch when `hasPlaced && placedOrderId` (`OrderEntry.jsx:729-771`).

### B.2 Is `printer_agent` currently included on `update-place-order`?

**No.** `orderTransform.js:868-907` — the returned object has 22 keys; `printer_agent` is not among them. Verified by full grep:
```
grep -n "printer_agent" orderTransform.js → only matches in placeOrder (804-806) and placeOrderWithPayment (1013-1015)
```
This is consistent with the original CR closure **OQ-PA-16: "Should `update-place-order` also receive `printer_agent`? — No, out of scope per CR brief"** (impact analysis line 383). The owner is now reopening that question.

### B.3 Exact missing insertion point

| File | Line | Where to insert |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | After line **906** (`'cart-update': cartUpdate,`) and before the closing `};` at **907** | Add `printer_agent: printerAgentForUpdate,` (or named per owner preference). |
| `frontend/src/api/transforms/orderTransform.js` | Around line **836-846** (the `options` destructure) | Add `printerAgents = []` to the destructure list (parity with `placeOrder` at line 732). |
| `frontend/src/api/transforms/orderTransform.js` | Between cart construction (line 850) and the `return` (line 868) | Add the `printerAgentForUpdate` selection (see §B.4 below). |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Line **732-751** (the `orderToAPI.updateOrder(... options ...)` call site) | Append `printerAgents: printerAgents || []` to the option object. The `printerAgents` constant is already destructured from `useRestaurant()` at `OrderEntry.jsx:49`. |

### B.4 Which stations should be selected for the update/edit payload?

The owner brief lists four candidate sources. Map them to the data the builder already has:

| Candidate | Data available at builder? | Recommendation |
|---|---|---|
| **(a) Changed/edited item stations** | Yes — `newItems` arg holds the unplaced delta (used to build `cart-update`). `cartStationsToSet(newItems)` returns the de-duplicated station set for those items. | **Default pick.** This mirrors the place-order rule "select for KOT only the cart's stations, exclude BILL". On Update Order, the new KOTs printed are precisely for the newly-added items, so the agent set should match those items' stations. |
| **(b) Full cart stations** (placed + unplaced) | Yes — `allCartItems` arg already passed for combined-totals computation. | **Reject by default.** Re-printing for stations that haven't received any new line is wasteful and would re-emit KOTs to settled stations. Use only if owner explicitly says "re-fire all stations on every update". |
| **(c) `station_kot` field if available** | Not used on `update-place-order` today (`station_kot` is a print-temp-store-only field; `update-place-order` does not carry it). | **Not applicable** to update payload. (For the *subsequent* `order-temp-store` print fired after Update Order, the path already routes through `printOrder()` which selects from `printerAgents` correctly per FU-02.) |
| **(d) Existing order detail stations** | Not directly available in builder; would require an extra fetch. | **Reject** — adds a fetch round-trip; same outcome as (b) for the sub-set of stations the kitchen has already received KOTs for. |

**Locked recommendation pending owner confirmation:**
```js
const printerAgentForUpdate = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(newItems))
  : [];
```
- `print_kot:'Yes'` (the existing `printAllKOT` flag) → station set from `newItems` only.
- `print_kot:'No'` → `[]`.
- BILL exclusion is enforced by `selectAgentsForKot` itself (`printerAgentSelector.js:90`).

**Open decision for owner:** if the kitchen workflow requires re-firing every station regardless of whether new items are routed there, switch the source from `cartStationsToSet(newItems)` to `cartStationsToSet(allActiveItems)` — same helper, different argument; no helper extension needed.

### B.5 BILL exclusion rule

`selectAgentsForKot` already excludes any agent whose `station ≈ "BILL"` (`printerAgentSelector.js:90`, R-OWNER-7 / R-OWNER-8). **Confirmed:** Update/Edit Order is a KOT-style operation; BILL must NOT be sent on this payload. The helper already enforces it; no extra guard is needed.

If owner provides a payload sample showing a BILL agent on `update-place-order`, that overrides this default.

### B.6 Empty fallback rule

Owner brief: empty fallback should be `printer_agent: []`. The helper returns `[]` when:
- `printerAgents` is missing or empty (no profile configuration), or
- `stationSet` is empty (no stations on the new items), or
- no station matches.

The builder will still emit the `printer_agent` key with value `[]` — never omit. Mirrors `placeOrder` rule (OQ-PA-9).

---

## C — Cancel Order / Cancel Item gap

### C.1 All cancel APIs and payload builders

| Flow | Endpoint constant | Path | HTTP | Body | Builder | Call site |
|---|---|---|---|---|---|---|
| Cancel single item (full or partial qty) | `API_ENDPOINTS.CANCEL_ITEM` | `/api/v2/vendoremployee/order/cancel-food-item` | PUT | JSON | `toAPI.cancelItem(table, item, reason, qty)` — `orderTransform.js:684-693` | `OrderEntry.jsx:946` (`handleCancelFood`) |
| Cancel entire order | `API_ENDPOINTS.ORDER_STATUS_UPDATE` | `/api/v2/vendoremployee/order/order-status-update` | PUT | JSON | `toAPI.cancelOrder(orderId, roleName, reason)` — `orderTransform.js:702-708` | `OrderEntry.jsx:974` (`handleCancelOrder`) |

`partial-cancel-food-item` referenced in transform comments (line 678) is the *legacy alias* — the active constant is `cancel-food-item`.

### C.2 Is `printer_agent` currently on either cancel payload?

**No** for both. `cancelItem` returns 8 keys (`order_id`, `order_food_id`, `item_id`, `cancel_qty`, `order_status`, `reason_type`, `reason`, `cancel_type`); `cancelOrder` returns 5 keys (`order_id`, `role_name`, `order_status`, `cancellation_reason`, `cancellation_note`). Neither builder imports the `printerAgentSelector` helpers.

### C.3 Exact missing insertion points

| File | Line | Insertion |
|---|---|---|
| `orderTransform.js` | After `cancel_type` at line **692** in `cancelItem`; before the closing `}` at **693** | Add `printer_agent: printerAgentForCancelItem,` (named per owner). |
| `orderTransform.js` | `cancelItem` signature at line **684** | Extend signature: `cancelItem: (currentTable, item, reason, cancelQty, options = {})` — destructure `printerAgents = []` from options. (Or, prefer keeping a positional 5th arg for parity; owner choice.) |
| `orderTransform.js` | After `cancellation_note` at line **707** in `cancelOrder`; before the closing `}` at **708** | Add `printer_agent: printerAgentForCancelOrder,`. |
| `orderTransform.js` | `cancelOrder` signature at line **702** | Extend signature: `cancelOrder: (orderId, roleName, reason, options = {})` — destructure `printerAgents = []`, plus the **station set source** (see §C.4). |
| `OrderEntry.jsx` | Line **945** (the `orderToAPI.cancelItem(...)` call) | Append `{ printerAgents: printerAgents || [] }` as the new 5th arg / options. Note the `item` arg already carries `item.station` so the builder can derive a station set internally. |
| `OrderEntry.jsx` | Line **973** (the `orderToAPI.cancelOrder(...)` call) | Append `{ printerAgents: printerAgents || [], allCartItems: cartItems }` (or equivalent — see §C.4 station rules). |

### C.4 Station selection rules — Cancel

| Flow | Source of stations | Helper call |
|---|---|---|
| **Cancel Item** (single item) | The cancelled item's own `station` only. The kitchen station that fired the KOT for this item is the only station that needs to know about the cancellation. | `selectAgentsForKot(printerAgents, [item.station].filter(Boolean))` — single-element station set. |
| **Cancel Order** (whole order) | All stations represented in the order's items. The cancelled-order notification needs to reach every kitchen station that received any KOT line. | `selectAgentsForKot(printerAgents, cartStationsToSet(allActiveItems))` where `allActiveItems = cartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker)` — same predicate as Update Order. |
| **`station_kot` if available** | Not present on either cancel payload today. The same `station_kot` argument used by `printOrder()` (`order-temp-store`) is *not* a cancel-payload field. | N/A — do not add. |
| **Affected station list (alternate)** | Same as the per-flow source above. The owner brief lists "affected station list" as a candidate; for these two flows it reduces to the same set described in row 1 / row 2. | — |

**Edge cases the builder must handle:**

1. **Cancel Item where `item.station` is null/empty** (custom item or station unset on catalog) → station set is empty → `selectAgentsForKot` returns `[]` → wire `"printer_agent": []`. Helper already null-safe (`printerAgentSelector.js:83-84`).
2. **Cancel Order where every item has been already cancelled** (degenerate) → `allActiveItems = []` → station set empty → `printer_agent: []`. Acceptable.
3. **Pre-Serve cancel** vs **Post-Serve cancel** (`cancel_type` distinction) — kitchen still needs the agent regardless of pre- vs post-serve, since the agent maps station → printer hardware. No conditional gating required.

### C.5 BILL exclusion rule (Cancel)

Same as Update Order. `selectAgentsForKot` enforces R-OWNER-7 / R-OWNER-8: BILL-station agents are excluded. Cancel notifications are KOT-style operations; BILL agents must not be on the wire here. **Confirmed unless owner payload says otherwise.**

### C.6 Empty fallback (Cancel)

Both cancel builders must always emit the `printer_agent` key, value `[]` when no agents resolve. Same rule as place-order (OQ-PA-9). Helper already returns `[]` consistently.

---

## D — Existing helper reuse

### D.1 Can `printerAgentSelector.js` be reused as-is?

**Yes — fully.** The two exports (`selectAgentsForKot`, `cartStationsToSet`) plus the BILL sentinel cover every case in §B and §C without modification:

| Need | Existing helper | Notes |
|---|---|---|
| KOT agent selection by station set | `selectAgentsForKot(printerAgents, stationSet)` | Excludes BILL automatically (R-OWNER-7). Case-insensitive. Preserves API order. Returns `[]` when no match — never `null`. |
| Cart-derived station set | `cartStationsToSet(items)` | Items array → de-duplicated station array with original casing preserved. Filters null/blank. |
| Single-item station set (cancel item) | `[item.station].filter(Boolean)` (no helper needed) or trivially: `cartStationsToSet([item])` | The latter actually works with no helper change — `cartStationsToSet` accepts any array of `{station}`-shaped items. |
| Profile parsing (printer_agent normalisation) | `normalizePrinterAgent` already used by `profileTransform.js` | No new normalisation needed; agents arrive at the builders already normalised. |

### D.2 Is any helper extension required?

**No.** Three reasons:

1. **`cartStationsToSet([item])`** — calling the existing helper with a single-element array is already shape-correct. No new "single-station selector" helper needed.
2. **BILL exclusion** is built into `selectAgentsForKot`; no reverse selector needed for cancel/update flows.
3. **Update Order's "all-items vs new-items" choice** is a *call-site decision*, not a helper change — both source arrays are already plain JS arrays accepted by `cartStationsToSet`.

If owner later requests an "ALL stations regardless of cart" mode (to fire every configured agent on cancel-order, like a kitchen broadcast), the helper would need a new `selectAllNonBillAgents(printerAgents)` export. Not requested today; not in scope.

### D.3 No duplication risk

Place-order, place-order-with-payment, and `printOrder()` (`orderService.js:152`) all already use the same helpers. Update-order and cancel-* builders will reuse the same imports. The pattern is identical:
```js
const printerAgentForX = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(stationSourceItems))
  : [];
```

---

## 9 — Backend confirmation status

> **Update 2026-05-09 (post-investigation):** Owner provided wire-confirmed sample payloads for all three target endpoints. BC-1, BC-2, BC-3 are now CLOSED. Two items remain open: BC-4 (cancel-item station rule) and BC-5/BC-6 (place-order v1→v2 scheduling). 

| # | Question | Why it matters | Status (2026-05-09) |
|---|---|---|---|
| **BC-1** | Does `/api/v2/.../update-place-order` accept an additive `printer_agent` array field today? | Required before we add the field to the update payload. | ✅ **CLOSED** — owner sample 2026-05-09 confirms field is accepted; sit AFTER `cart-update`, sibling key. Endpoint stays on **v2** — no revert needed for this builder. |
| **BC-2** | Does `/api/v2/.../cancel-food-item` accept an additive `printer_agent` array field? | Required before we add the field to the cancel-item payload. | ✅ **CLOSED** — owner sample 2026-05-09 confirms field is accepted; sits AFTER `cancel_type`. Endpoint stays on **v2**. |
| **BC-3** | Does `/api/v2/.../order-status-update` (cancel-order) accept an additive `printer_agent` array field? | Required before we add the field to the cancel-order payload. | ✅ **CLOSED** — owner sample 2026-05-09 confirms field is accepted; sits AFTER `cancellation_note`. Endpoint stays on **v2**. |
| **BC-4** | For `cancel-food-item`, should FE send only the cancelled item's station OR every distinct station in the active cart (same set as cancel-order)? | The owner's wire sample for cancel-item shows BOTH `KDS` and `bar` agent entries even though the cancel targets a single line — consistent with "send all stations" (option ii) rather than "send the item's station only" (option i). My §C.4 recommendation was option (i); the sample suggests option (ii). | 🟡 **PENDING OWNER CLARIFICATION** — re-confirm whether (i) or (ii). Default-implementation pick if no further word: option (ii) (all-stations) to match the wire sample shape and stay symmetric with cancel-order. |
| **BC-5** | Was the v2 → v1 swap on `place-order` driven by a *behavioural* difference (audit/log/socket/FCM) or purely by owner-internal symmetry? Is reverting v1 → v2 today functionally identical from the kitchen + dashboard POV? | Required before §A.6 v1→v2 revert. Wire shape is identical and v2 is now confirmed to accept the additive field. | 🟡 **PENDING OWNER + BACKEND** — owner's 2026-05-09 reply confirmed v2 accepts the field but did not explicitly direct revert. Mechanically a 1-line change at `constants.js:41`. |
| **BC-6** | If we revert place-order v1 → v2, do we also need to keep v1 alive as a fallback during the rolling deploy window, or is v2 the single source of truth from now on? | Affects rollback strategy at `constants.js:41`. | 🟡 **PENDING BACKEND** |

**Wire shape confirmed by owner sample (2026-05-09).** All three sample payloads:
- `update-place-order` — `printer_agent` is a sibling of `cart-update`, located after it.
- `cancel-food-item` — `printer_agent` is a sibling of `cancel_type`, located after it. Sample shows multi-station entries.
- `order-status-update` — `printer_agent` is a sibling of `cancellation_note`, located after it.

Casing observation: the owner sample includes `station: "bar"` (lowercase). FE selector is case-insensitive (R-OWNER-2). Wire casing follows the **profile** entry's casing, not the sample's — if the profile holds `"BAR"`, that's what's emitted. **No FE change needed.**

---

## 10 — Minimal implementation plan (for the next CR; not actioned here)

> Single atomic PR. Touches **3 files**. No socket / billing / GST / SC / DC / cart / print-UI logic changes. Mirrors the structure of the original POS2-003 PR.

| Phase | File | Change | Lines |
|---|---|---|---|
| **1.** Update Order builder | `frontend/src/api/transforms/orderTransform.js` | Extend `updateOrder(table, newItems, customer, orderType, options)` to destructure `printerAgents = []`; compute `printerAgentForUpdate = printAllKOT ? selectAgentsForKot(printerAgents, cartStationsToSet(newItems)) : []`; inject `printer_agent: printerAgentForUpdate` into returned payload between `'cart-update'` and the closing `}`. Add same `console.warn` parity guard as place-order. | ~10 lines net |
| **2.** Cancel Item builder | `frontend/src/api/transforms/orderTransform.js` | Extend `cancelItem(currentTable, item, reason, cancelQty, options = {})` to destructure `printerAgents = []`; compute `printerAgentForCancelItem = selectAgentsForKot(printerAgents, item?.station ? [item.station] : [])`; inject `printer_agent` after `cancel_type`. | ~5 lines net |
| **3.** Cancel Order builder | `frontend/src/api/transforms/orderTransform.js` | Extend `cancelOrder(orderId, roleName, reason, options = {})` to destructure `printerAgents = []` and `allCartItems = []`; compute `printerAgentForCancelOrder = selectAgentsForKot(printerAgents, cartStationsToSet(allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker)))`; inject `printer_agent` after `cancellation_note`. | ~6 lines net |
| **4.** Update Order call site | `frontend/src/components/order-entry/OrderEntry.jsx` | Append `printerAgents: printerAgents || []` to the options object at L732-751 (the `orderToAPI.updateOrder(...)` call). `printerAgents` is already destructured at L49. | ~1 line |
| **5.** Cancel Item call site | `frontend/src/components/order-entry/OrderEntry.jsx` | Append `{ printerAgents: printerAgents || [] }` as 5th arg to `orderToAPI.cancelItem(...)` at L945. | ~1 line |
| **6.** Cancel Order call site | `frontend/src/components/order-entry/OrderEntry.jsx` | Append `{ printerAgents: printerAgents || [], allCartItems: cartItems }` as 4th arg to `orderToAPI.cancelOrder(...)` at L973. | ~1 line |
| **7.** (Optional, A.6) Endpoint revert | `frontend/src/api/constants.js:41` | Change `'/api/v1/vendoremployee/order/place-order'` back to `'/api/v2/vendoremployee/order/place-order'`. **Gated on BC-5 confirmation.** | 1 line |
| **8.** Tests | `frontend/src/__tests__/api/transforms/cancelAndUpdatePayload.test.js` (new file) | Mirror `placeOrderPayload.test.js` style — assert `printer_agent` is present on each of the 3 builders, BILL is excluded, empty fallback is `[]`, station set is correct, pre-existing keys preserved. ~12 cases. | new file, ~200 lines |

**Net code:** 3 source files edited + 1 test file added. Zero existing-helper changes. Zero `/app/memory/final/*` changes. No print UI changes. No socket changes.

---

## 11 — Validation checklist (for the next CR; not run here)

### Builder-level (unit tests)
- [ ] `updateOrder` payload includes `printer_agent` key (always, even when `[]`).
- [ ] `updateOrder` with `printAllKOT:'Yes'` and KDS/BAR new items → `printer_agent` contains KDS + BAR agents (in API order, BILL excluded).
- [ ] `updateOrder` with `printAllKOT:'No'` → `printer_agent: []`.
- [ ] `updateOrder` with no `printerAgents` configured → `printer_agent: []`. Console-warn fires only when `printAllKOT && printerAgents.length>0 && match==[]`.
- [ ] `updateOrder` does not break existing keys (`'cart-update'`, totals, room/address, delivery_charge, discount, loyalty/wallet) — diff-clean against the pre-change snapshot.
- [ ] `cancelItem` payload includes `printer_agent` key (always).
- [ ] `cancelItem` with KDS station item → `printer_agent: [KDS_entry]`.
- [ ] `cancelItem` with BILL-only printerAgents → `printer_agent: []` (BILL excluded).
- [ ] `cancelItem` with item.station == null → `printer_agent: []`.
- [ ] `cancelItem` does not break existing keys (`order_id`, `order_food_id`, `item_id`, `cancel_qty`, `order_status`, `reason_type`, `reason`, `cancel_type`).
- [ ] `cancelOrder` payload includes `printer_agent` key (always).
- [ ] `cancelOrder` with KDS+BAR items in cart → `printer_agent: [KDS, BAR]` (BILL excluded).
- [ ] `cancelOrder` with empty cart → `printer_agent: []`.
- [ ] `cancelOrder` does not break existing keys (`role_name`, `cancellation_reason`, `cancellation_note`).

### Runtime / integration (live tenant)
- [ ] Live Update Order on a tenant with configured `print_agent` → DevTools shows `printer_agent` array on `PUT /update-place-order` body, BILL excluded, agents match new-item stations.
- [ ] Live Cancel Item (Pre-Serve) → DevTools shows `printer_agent` containing the item's station agent.
- [ ] Live Cancel Item (Post-Serve) → same; `cancel_type` switches but `printer_agent` content is identical.
- [ ] Live Cancel Order → DevTools shows agents for every distinct station in the order's items.
- [ ] Tenant with empty `print_agent` config → all three flows send `printer_agent: []`. No console errors.
- [ ] Update + Cancel flows do not regress: socket new-order / engage / order-status remain unchanged; dashboard refresh + redirect timing unchanged; toast wording unchanged.
- [ ] Backend acceptance: HTTP 200 on all three endpoints with `printer_agent` present (BC-1, BC-2, BC-3).
- [ ] (If A.6 revert applied) place-order regression: `placeOrderPayload.test.js` still green with v2 URL; live place-order still emits `new-order` socket and creates dashboard card identically.

### Out-of-scope safety (regression)
- [ ] No changes to `placeOrder` / `placeOrderWithPayment` / `buildBillPrintPayload` / `printOrder()` — diff-clean.
- [ ] No changes to `printerAgentSelector.js` — file untouched.
- [ ] No changes to `profileTransform.js` (already shipped). 
- [ ] No changes to socket handlers / `useSocketEvents.js`.
- [ ] No changes to cart logic / GST / service charge / delivery charge / room billing / discount / split bill.

---

## 12 — Final verdict (updated 2026-05-09 after owner reply)

> ### **B + C → `ready_for_implementation`** (cancel-item station-set rule pending only the BC-4 default decision)
> ### **A (place-order v1→v2 revert) → `needs_owner_payload`** (BC-5 + BC-6 still open)

**Rationale.**
- **B (Update Order):** Backend acceptance confirmed via owner curl 2026-05-09. Builder + call-site edits = ~10 lines net. **Ready to implement.**
- **C (Cancel flows):** Backend acceptance confirmed for both cancel-item and cancel-order. **Ready to implement** — with the understanding that BC-4 (cancel-item station rule: item-only vs all-stations) defaults to **all-stations** based on the owner sample shape, unless the owner clarifies otherwise.
- **A (place-order v1→v2 revert):** Endpoint move is a 1-line, fully reversible change at `constants.js:41`. Owner has not explicitly directed the revert; BC-5 (behavioural parity) and BC-6 (rolling-deploy fallback) remain open. **Not safe to bundle into the same CR until owner+backend confirm.** Best path: ship **B+C as a single atomic CR (POS2-003-REOPEN-A)** and keep the **place-order revert as a separate, gated follow-up (POS2-003-REOPEN-B)** to avoid mixing two unrelated risk profiles in one PR.

**Once BC-4 is answered**, B+C is a clean atomic ship: 3 builder edits + 3 call-site edits + 1 new test file. Zero helper changes. Zero `/app/memory/final/*` edits. Zero socket / billing / GST / SC / DC / cart / print-UI changes.

---

## Appendix — Cross-impact summary

| CR | Surface touched here | Risk |
|---|---|---|
| **POS2-003** (place-order printer_agent + v1 swap) | None (this is the same field on different endpoints) | None — additive only on each endpoint. |
| **POS2-003-FU-02** (printer_agent empty on Bill print) | None — `printOrder()` is `order-temp-store`-only | None |
| **POS2-005** (status-8 reroute) | None — pure dashboard / report routing | None |
| **POS2-007 Phase 1** (confirm-order tone override) | None — pure notification layer | None |
| **CR-001 / CR-003** (audit-report rules / collect-bill on hold) | None — financial-mutation endpoints (`change-order-payment-method`, `make-order-unpaid`, `order-bill-payment`) are out of scope; they don't carry `printer_agent` and shouldn't | None |
| **CR-007 / CR-013 / BUG-274** (prepaid merge/shift/settle/GST) | None — prepaid settle calls `paid-prepaid-order` (no KOT), out of scope | None |
| **CR-POS2-002** (web YTC pop-out) | None — web pipeline, FE doesn't write to update/cancel from there | None |

— End of POS2-003-REOPEN Investigation 2026-05-09 —
