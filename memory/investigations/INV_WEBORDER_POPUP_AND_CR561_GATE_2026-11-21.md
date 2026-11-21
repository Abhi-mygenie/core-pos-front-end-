# INVESTIGATION + GATE REVIEW — 2026-11-21

**Role:** INVESTIGATION (Role 6) — no code edits, stay in gate.
**Scope:** (1) Web-order Accept pop-out not opening live (opens only after refresh). (2) Gate review of CR-561 (APS ₹1 price entry) on branch `20261121-051150`.
**Session base:** main @ `fa5b2ffac4`. Branch reviewed: `origin/20261121-051150` @ `80394ac`.

---

## PART 1 — Web order pop-up does not open on arrival, opens after refresh

### 1. Summary
Root cause (HIGH→MEDIUM confidence, code-traced, not live-reproduced): the **live socket path and the refresh path disagree on how `isWebOrder` is derived.** The pop-up gate is `isUnconfirmedScanOrder = fOrderStatus===7 && !scheduled && isWebOrder` (ScanOrderPopOut.jsx:60-61). On a live `scan-new-order`, `isWebOrder` is set with a **raw, case-sensitive** `orderFrom === 'web'`; on refresh it is set via the **normalised** `normaliseOrderFrom(api.order_from) === 'web'`. Any `order_from` casing/whitespace variant other than exactly `web` → live `isWebOrder=false` → pop-up suppressed, but after refresh it normalises to `web` → pop-up opens.
Classification: **FE_BUG** (normalisation divergence).

### 2. Evidence (code trace)
- Pop-up gate: `ScanOrderPopOut.jsx:60-61` `isUnconfirmedScanOrder` requires `order.isWebOrder === true`. Queue (`:203-212`) renders only orders passing this (or `hasUnconfirmedWebEditItems`, which also requires `isWebOrder`). Component re-renders on OrderContext change, so no manual trigger is needed — the gate is purely the predicate.
- **Refresh path** (`getRunningOrders` → `orderTransform.fromAPI.order`): `orderTransform.js:265-266` → `isWebOrder: normaliseOrderFrom(api.order_from) === 'web'`. `normaliseOrderFrom` (`:53-57`) does `raw.trim().toLowerCase()`. So `'Web'`, `'WEB'`, `' web '` all become `'web'` → **isWebOrder=true** → pop-up opens after refresh.
- **Live socket path** (`handleScanNewOrder`, `socketHandlers.js:545-598`):
  - Full-payload branch `:571-576` transforms via `orderFromAPI.order(...)` (which already set the *correct normalised* `isWebOrder`) and then **overrides** it at `:574-575`:
    `transformedOrder.isWebOrder = (orderFrom === 'web')` — a raw, case-sensitive compare, where `orderFrom` = `message[5]` string or `rawPayload.orders[0].order_from` (`:558-560`).
  - Minimal fallback branch `:585-596`: `isWebOrder: orderFrom === 'web'` — same raw compare.
- Unit test confirms the brittle contract: `handleScanNewOrder.enrichment.test.js` — `'web'`→true, but `'kiosk'`→false and **missing index-4→false**. A capitalised `'Web'` would therefore yield `false` live.
- `OrderContext.addOrder` (`:107-127`) simply adds/updates by orderId — it does not re-derive origin, so the wrong `isWebOrder` from the socket persists until a refresh re-transforms it.

### 3. Data-flow break point
`scan-new-order` (or `new-order`) socket → `handleScanNewOrder` sets `isWebOrder` via **raw `=== 'web'`** → OrderContext → `ScanOrderPopOut` queue filter → **predicate false → no pop-up**. On manual refresh: `getRunningOrders` → `orderTransform.order` sets `isWebOrder` via **normalised** compare → predicate true → **pop-up opens**. BREAK POINT = `socketHandlers.js:575` (and `:589`).

### 4. Hypotheses
| # | Hypothesis | Result |
|---|---|---|
| H1 | Live path uses raw `=== 'web'`, refresh uses `normaliseOrderFrom` → casing/whitespace variant hides pop-up live | **CONFIRMED by trace** (primary) |
| H2 | `scan-new-order` not delivered live (room not joined) so order only appears on refresh | Possible but less likely — order channel + `joinRestaurant` are wired (`useSocketEvents.js:232-247`); would also hide POS orders. NEEDS a live socket capture to eliminate |
| H3 | Pop-up `suppressed` by open OrderEntry/cancel modal (`DashboardPage.jsx:1946`) | ELIMINATED as primary — not tied to "refresh fixes it" |

### 5. Recommendation
- **FE fix (small):** in `handleScanNewOrder`, derive `orderFrom` through `normaliseOrderFrom(...)` and set `isWebOrder` off the normalised token — OR drop the `:574-575` override and trust the transform's value in the full-payload branch. 1 file (`socketHandlers.js`), ~2–6 lines.
- **Confidence MEDIUM → do NOT skip planning blindly.** Cheapest confirming test (owner/QA): capture one live `scan-new-order`/`new-order` frame on preprod and log the exact `order_from` string casing. If it is anything but lowercase `web`, H1 is proven.
- Risk: web-order path (not financial) → MEDIUM. Route via PLANNING Gate 2-3 (include the live-frame validation step), or owner-approved direct bug-fix if the live frame confirms H1.
- Not yet a registered item — recommend INTAKE to assign a BUG id before fixing.

---

## PART 2 — CR-561 (APS ₹1 price entry) gate review — branch `20261121-051150`

### Delivered (diff vs main, source files only)
- `api/constants.js` — `UPDATE_FOOD_ITEM_PRICE = '/api/v2/vendoremployee/order/update-food-item-price'`.
- `api/services/orderService.js` — new `updateFoodItemPrice(orderId, items)` (PUT, maps `{item_id, unit_price}`; returns `data.order_amount` + `data.items`).
- `PopoutItemRow.jsx` — for `isAps` (`unit===1 && !isComp`) non-readonly rows, replaces the read-only "Price TBD" badge with a numeric input wired to new `onPriceChange(it.id, value)` prop. testid `popout-item-price-input-<id>` preserved.
- `ScanOrderPopOut.jsx` — `pendingPrices` map fed by `onPriceChange`; on **Accept** batches a single `updateFoodItemPrice` call before `onAccept`; cleared on order switch; wired to BOTH Mode B (new) and Mode A (full) rows.

### Matches plan? (`plans/CR-561_IMPLEMENTATION_PLAN.md`)
- Edits 1-3 (service/constant, PopoutItemRow input, ScanOrderPopOut batch-on-Accept): **DONE**, consistent with the locked contract (`item_id = orderDetails[].id = it.id`; batched, not per-keystroke; all-or-nothing on backend).
- **Edit 4 (Gap B — OrderEntry edit reprice for `placed:true` APS lines): NOT IMPLEMENTED.** CR is partially delivered vs its own plan.

### QA / test status (`test_reports/iteration_14.json`)
- Live run **FAILED**: `update-food-item-price` was **never sent**; order #1579043 accepted with the line still at ₹1 (price dropped silently). RCA: `handleAcceptClick` `useCallback` deps were `[onAccept, isAccepting]` → stale `pendingPrices` ({}).
- testing_agent applied a **one-line fix** (deps now `[onAccept, isAccepting, pendingPrices]`) — present in the branch. **This fix is UNVERIFIED** (test order consumed; no other order had an APS input). `retest_needed: true`.

### Gate findings / blockers (money = CRITICAL)
1. **Unverified fix** — the batched price-save path has never passed a live retest after the deps fix. Must be re-tested on a fresh web order with an APS ₹1 line before any QA PASS.
2. **Owner-decision contradiction (highest concern):** registry `open_decisions` still shows **OD-561-B LOCKED = "real price required before final bill prints (pre-bill guard)"**, but the plan says **"pre-bill guard DROPPED."** As built, an order can be accepted AND billed with the ₹1 placeholder and nothing forces a real price → direct money-leak risk. Needs owner reconciliation before release.
3. **Silent failure UX** — `updateFoodItemPrice` failure only `console.error`s; Accept button resets with no toast → staff may believe the price saved. Flag (financial surface).
4. **Scope** — Gap B (OrderEntry edit) deferred; confirm with owner whether this ship requires it.
5. **Registry drift (minor)** — `gate: GATE_3 / current_gate: 3` but `status` string says `GATE_5A_IMPLEMENTED`. Reconcile label at closure.

### Gate verdict
**CR-561 is NOT release-ready. Hold at Gate 3 / QA-blocked.** Do not advance to smoke until: (a) live retest of the batched save post deps-fix passes; (b) owner reconciles OD-561-B (drop guard vs require-price-before-bill) — a CRITICAL/money decision; (c) Gap B in/out of scope is decided. Risk remains **HIGH (financial)** → full gate + owner approval + E2E money test required (plan §Risk).

---

---

## PART 1 — LIVE INVESTIGATION RESULT (2026-11-21, with owner; restaurant 69 / The Goan Kitchen)

**Method:** pod-side `socket.io-client@4.8.4` listener (the app's own client) connected to `https://presocket.mygenie.online`, joined room `rest_69` (ACK `{"room":"rest_69"}`), `onAny` capture → `memory/evidence/INV-WEBORDER-POPUP/socket_capture.log`. Owner placed a live web order on table **t2 (order 1579043)**. Simultaneous REST probe of `employee-orders-list`.

### What the socket actually delivered
- Event on channel `new_order_69` = **`update-order`** (NOT `scan-new-order`/`new-order`), `f_order_status = 1`. Two frames captured (06:39:22, 06:40:20). **No `scan-new-order` fired.**
- Both `update-order` payloads carry **`order_from: "pos"`** for order 1579043, while the payload's `orderDetails` contain **6 unconfirmed web-edit lines (`food_status: 7`, not cancelled)**.
- REST `employee-orders-list` for the **same** order 1579043 returns **`order_from: "web"`**.

### Confirmed root cause (classification: BACKEND_BUG / CONTRACT_MISMATCH — confidence HIGH, reproduced live)
`orderTransform` sets `isWebOrder = normaliseOrderFrom(order_from) === 'web'` (orderTransform.js:266). Therefore:
- **Live socket `update-order`** → `order_from='pos'` → `isWebOrder = FALSE` → `hasUnconfirmedWebEditItems = FALSE` → **pop-up suppressed.**
- **Refresh (REST)** → `order_from='web'` → `isWebOrder = TRUE` → `hasUnconfirmedWebEditItems = TRUE` → **pop-up opens.**

Predicate evaluated against the real captured payload: Mode A (`isUnconfirmedScanOrder`, needs fOS==7) = **False**; Mode B (`hasUnconfirmedWebEditItems`) = **False** — purely because `isWebOrder` is false from the socket's `order_from:'pos'`. This matches the symptom exactly.

### Why the existing BUG-701 guard does not save it
`OrderContext.updateOrder` (lines 154-158) only preserves web-origin when the **already-stored** order was web (`existing.isWebOrder && !updatedOrder.isWebOrder`) and explicitly **"never upgrades non-web → web."** Order 1579043 was stored as a POS order, so when the web-edit `update-order` arrives with `order_from:'pos'`, the guard's condition is `false && true` → does not fire → the order stays `isWebOrder=false` live. The socket gives no `order_from='web'` signal to flip it. Only a full REST refresh (which reports `'web'`) corrects it. **H1 (casing mismatch) from the initial report is DISPROVEN** — `order_from` is lowercase in both places; the divergence is the *value itself* (`pos` on socket vs `web` on REST).

### Recommendations
1. **Primary (backend) — BACKEND_BRIEF:** the `new_order_*` socket `update-order` (and sibling order-data events) must emit the **same `order_from` as the running-orders REST** — `'web'` for web / web-edited orders. Endpoint/contract owner: backend. This is the clean fix; no FE change needed once corrected.
2. **FE workaround (optional, unblocks without backend; risk MEDIUM — OrderContext/order pipeline hotspot → full Planning gate):** treat an order as web-edit-eligible when it has any non-cancelled `isNotConfirmed` (`food_status===7`) line **regardless of `order_from`** — e.g. extend the BUG-701 guard in `updateOrder` to set `isWebOrder=true` when the incoming order has unconfirmed web-edit lines, OR relax `hasUnconfirmedWebEditItems` to not require `isWebOrder` when such lines exist. Must not regress the Web/POS pulse counter (orderOrigin.js) or Mode A.
3. **Still unverified:** the fresh-web-order path (new orderId, `f_order_status=7` via `scan-new-order`) was NOT exercised this session (owner tested a web-edit on an existing table). Capture one brand-new web order to confirm whether Mode A is affected too.

### Evidence artifacts (persistent)
- `memory/evidence/INV-WEBORDER-POPUP/socket_capture.log` — raw live frames (join ACK + two `update-order` frames).
- `memory/evidence/INV-WEBORDER-POPUP/socket_listener.js` — the listener used.

### Next
INTAKE a BUG (classification BACKEND_BUG + FE-workaround available, P1). If owner wants it fixed FE-side now, PLANNING Gate 2-3 for recommendation #2 (financial-adjacent? No — display/trigger only, MEDIUM risk).

---

**No application code was modified in this session (investigation + gate review only).**
